#!/usr/bin/env python3
"""Assemble reviewable Web of Lies lineage packets into one forensic input.

Each claim family lives in a small source-controlled packet. This builder merges
stable source profiles across packets, rejects conflicting identity metadata,
deduplicates list fields, and emits the single forensic input consumed by the
Web of Lies registry builder.

Hall of Shame rank/score fields are never accepted here.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any

import jsonschema

ROOT = Path(__file__).resolve().parents[1]
PACKET_DIR = "data/web-of-lies/lineage-packets"
PACKET_SCHEMA = "schemas/web-of-lies-lineage-packet-v1.json"
SOURCE_DOSSIER = "data/web-of-lies/source-dossiers.json"
SOURCE_DOSSIER_SCHEMA = "schemas/web-of-lies-source-dossier-v1.json"
OUTPUT = "data/web-of-lies/forensic-records.json"
CONTRACT = "docs/WEB_OF_LIES_INFORMATION_FORENSICS_CONTRACT.md"

MERGEABLE_LIST_FIELDS = {
    "behavior_classes",
    "revenue_model",
    "classification_basis_event_ids",
    "revenue_basis_event_ids",
    "canonical_source_ids",
    "canonical_actor_ids",
    "aliases",
}
MANUAL_RANK_FIELDS = {
    "hall_of_shame_rank",
    "hall_of_shame_score",
    "manual_rank",
    "manual_score",
    "featured_rank",
    "source_awards",
}


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_time(value: str) -> datetime:
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        raise ValueError(f"lineage packet as_of must include a timezone offset: {value}")
    return parsed


def normalize_list(field: str, values: list[Any]) -> list[Any]:
    normalized = sorted({str(value).strip() for value in values if str(value).strip()})
    if field == "behavior_classes" and len(normalized) > 1 and "UNKNOWN" in normalized:
        normalized.remove("UNKNOWN")
    if field == "revenue_model" and len(normalized) > 1 and "UNKNOWN_REVENUE_MODEL" in normalized:
        normalized.remove("UNKNOWN_REVENUE_MODEL")
    return normalized


def merge_scalar(source_id: str, field: str, left: Any, right: Any) -> Any:
    if left in (None, "", []):
        return copy.deepcopy(right)
    if right in (None, "", []):
        return copy.deepcopy(left)
    if field == "authenticity_class":
        if left == "UNKNOWN":
            return copy.deepcopy(right)
        if right == "UNKNOWN":
            return copy.deepcopy(left)
    if left != right:
        raise ValueError(
            f"source profile {source_id} conflicts on {field}: {left!r} != {right!r}"
        )
    return copy.deepcopy(left)


def merge_profile(existing: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    source_id = str(existing["source_id"])
    forbidden = MANUAL_RANK_FIELDS.intersection(incoming)
    if forbidden:
        raise ValueError(
            f"source profile {source_id} contains forbidden manual Hall fields: {sorted(forbidden)}"
        )

    result = copy.deepcopy(existing)
    for field, value in incoming.items():
        if field == "source_id":
            continue
        if field in MERGEABLE_LIST_FIELDS:
            result[field] = normalize_list(
                field,
                list(result.get(field) or []) + list(value or []),
            )
            continue
        result[field] = merge_scalar(source_id, field, result.get(field), value)
    return result


def validate_packet_refs(packet: dict[str, Any], path: str) -> None:
    family_id = str(packet["claim_family_id"])
    local_source_ids = {str(row["source_id"]) for row in packet.get("source_profiles") or []}
    event_ids: set[str] = set()

    for event in packet.get("information_events") or []:
        event_id = str(event["event_id"])
        if event_id in event_ids:
            raise ValueError(f"{path}: duplicate information event id {event_id}")
        event_ids.add(event_id)
        if str(event["claim_family_id"]) != family_id:
            raise ValueError(
                f"{path}: event {event_id} belongs to {event['claim_family_id']} not packet family {family_id}"
            )
        if str(event["source_id"]) not in local_source_ids:
            raise ValueError(
                f"{path}: event {event_id} source {event['source_id']} is not declared in the packet"
            )
        for carrier in event.get("carrier_profile_ids") or []:
            if str(carrier) not in local_source_ids:
                raise ValueError(
                    f"{path}: event {event_id} carrier {carrier} is not declared in the packet"
                )

    graph_ids = event_ids | local_source_ids
    relationship_ids: set[str] = set()
    for relation in packet.get("relationships") or []:
        rid = str(relation["relationship_id"])
        if rid in relationship_ids:
            raise ValueError(f"{path}: duplicate relationship id {rid}")
        relationship_ids.add(rid)
        for endpoint in ("from_id", "to_id"):
            value = str(relation[endpoint])
            if value not in graph_ids:
                raise ValueError(
                    f"{path}: relationship {rid} references undeclared endpoint {value}"
                )


def validate_source_dossier(
    dossier: dict[str, Any],
    path: str,
    existing_source_ids: set[str] | None = None,
) -> None:
    local_source_ids = {
        str(row["source_id"]) for row in dossier.get("source_profiles") or []
    }
    allowed_source_ids = local_source_ids | set(existing_source_ids or set())

    seen_relationships: set[str] = set()
    for relation in dossier.get("source_relationships") or []:
        rid = str(relation["relationship_id"])
        if rid in seen_relationships:
            raise ValueError(f"{path}: duplicate source relationship id {rid}")
        seen_relationships.add(rid)
        for endpoint in ("from_id", "to_id"):
            value = str(relation[endpoint])
            if value not in allowed_source_ids:
                raise ValueError(
                    f"{path}: source relationship {rid} references undeclared profile {value}"
                )

    for collection_name, id_field in (
        ("external_assessments", "assessment_id"),
        ("infrastructure_observations", "observation_id"),
        ("research_leads", "lead_id"),
        ("source_behavior_incidents", "incident_id"),
    ):
        seen_ids: set[str] = set()
        for row in dossier.get(collection_name) or []:
            row_id = str(row[id_field])
            if row_id in seen_ids:
                raise ValueError(f"{path}: duplicate {collection_name} id {row_id}")
            seen_ids.add(row_id)
            source_id = row.get("source_id")
            if source_id and str(source_id) not in allowed_source_ids:
                raise ValueError(
                    f"{path}: {collection_name} {row_id} references undeclared source {source_id}"
                )


def build_forensic_input(root: Path) -> dict[str, Any]:
    packet_root = root / PACKET_DIR
    schema = load_json(root / PACKET_SCHEMA)
    validator = jsonschema.Draft202012Validator(schema)

    packet_paths = sorted(packet_root.glob("*.json"))
    if not packet_paths:
        packet_rows: list[dict[str, Any]] = []
    else:
        packet_rows = []

    seen_packet_ids: set[str] = set()
    profiles: dict[str, dict[str, Any]] = {}
    events: dict[str, dict[str, Any]] = {}
    relationships: dict[str, dict[str, Any]] = {}
    promotion_flags: dict[str, dict[str, Any]] = {}
    external_assessments: dict[str, dict[str, Any]] = {}
    infrastructure_observations: dict[str, dict[str, Any]] = {}
    research_leads: dict[str, dict[str, Any]] = {}
    source_behavior_incidents: dict[str, dict[str, Any]] = {}
    source_dossier_meta: dict[str, Any] | None = None
    latest_as_of: tuple[datetime, str] | None = None
    fingerprint_material: list[str] = []

    for path in packet_paths:
        relative = path.relative_to(root).as_posix()
        raw = path.read_bytes()
        packet = json.loads(raw.decode("utf-8"))
        validator.validate(packet)
        validate_packet_refs(packet, relative)

        packet_id = str(packet["packet_id"])
        if packet_id in seen_packet_ids:
            raise ValueError(f"duplicate lineage packet id {packet_id}")
        seen_packet_ids.add(packet_id)

        packet_hash = sha256_bytes(canonical_bytes(packet))
        fingerprint_material.append(f"{relative}\0{packet_hash}\n")

        as_of = str(packet["as_of"])
        parsed_as_of = parse_time(as_of)
        if latest_as_of is None or parsed_as_of > latest_as_of[0]:
            latest_as_of = (parsed_as_of, as_of)

        packet_rows.append({
            "packet_id": packet_id,
            "claim_family_id": str(packet["claim_family_id"]),
            "as_of": as_of,
            "path": relative,
            "sha256": packet_hash,
            "basis_paths": sorted({str(value) for value in packet.get("basis_paths") or []}),
        })

        for profile in packet.get("source_profiles") or []:
            source_id = str(profile["source_id"])
            forbidden = MANUAL_RANK_FIELDS.intersection(profile)
            if forbidden:
                raise ValueError(
                    f"{relative}: source profile {source_id} contains forbidden manual Hall fields: {sorted(forbidden)}"
                )
            if source_id in profiles:
                profiles[source_id] = merge_profile(profiles[source_id], profile)
            else:
                profiles[source_id] = copy.deepcopy(profile)
                for field in MERGEABLE_LIST_FIELDS:
                    if field in profiles[source_id]:
                        profiles[source_id][field] = normalize_list(
                            field, list(profiles[source_id].get(field) or [])
                        )

        for collection_name, target, id_field in (
            ("information_events", events, "event_id"),
            ("relationships", relationships, "relationship_id"),
            ("promotion_flags", promotion_flags, "flag_id"),
        ):
            for row in packet.get(collection_name) or []:
                row_id = str(row[id_field])
                if row_id in target:
                    raise ValueError(
                        f"{relative}: duplicate {collection_name} id across lineage packets: {row_id}"
                    )
                target[row_id] = copy.deepcopy(row)

    dossier_path = root / SOURCE_DOSSIER
    dossier_hash = None
    if dossier_path.is_file():
        dossier_relative = dossier_path.relative_to(root).as_posix()
        dossier_raw = dossier_path.read_bytes()
        dossier = json.loads(dossier_raw.decode("utf-8"))
        dossier_schema = load_json(root / SOURCE_DOSSIER_SCHEMA)
        jsonschema.Draft202012Validator(dossier_schema).validate(dossier)
        validate_source_dossier(dossier, dossier_relative, set(profiles))

        dossier_hash = sha256_bytes(canonical_bytes(dossier))
        dossier_as_of = str(dossier["as_of"])
        parsed_dossier_as_of = parse_time(dossier_as_of)
        if latest_as_of is None or parsed_dossier_as_of > latest_as_of[0]:
            latest_as_of = (parsed_dossier_as_of, dossier_as_of)

        source_dossier_meta = {
            "path": dossier_relative,
            "as_of": dossier_as_of,
            "sha256": dossier_hash,
            "basis_paths": sorted(
                {str(value) for value in dossier.get("basis_paths") or []}
            ),
        }

        for profile in dossier.get("source_profiles") or []:
            source_id = str(profile["source_id"])
            forbidden = MANUAL_RANK_FIELDS.intersection(profile)
            if forbidden:
                raise ValueError(
                    f"{dossier_relative}: source profile {source_id} contains "
                    f"forbidden manual Hall fields: {sorted(forbidden)}"
                )
            if source_id in profiles:
                profiles[source_id] = merge_profile(profiles[source_id], profile)
            else:
                profiles[source_id] = copy.deepcopy(profile)
                for field in MERGEABLE_LIST_FIELDS:
                    if field in profiles[source_id]:
                        profiles[source_id][field] = normalize_list(
                            field, list(profiles[source_id].get(field) or [])
                        )

        for relation in dossier.get("source_relationships") or []:
            row_id = str(relation["relationship_id"])
            if row_id in relationships:
                raise ValueError(
                    f"{dossier_relative}: duplicate relationship id across "
                    f"lineage/source-dossier inputs: {row_id}"
                )
            relationships[row_id] = copy.deepcopy(relation)

        for collection_name, target, id_field in (
            ("external_assessments", external_assessments, "assessment_id"),
            (
                "infrastructure_observations",
                infrastructure_observations,
                "observation_id",
            ),
            ("research_leads", research_leads, "lead_id"),
            ("source_behavior_incidents", source_behavior_incidents, "incident_id"),
        ):
            for row in dossier.get(collection_name) or []:
                row_id = str(row[id_field])
                if row_id in target:
                    raise ValueError(
                        f"{dossier_relative}: duplicate {collection_name} id {row_id}"
                    )
                target[row_id] = copy.deepcopy(row)

    all_source_ids = set(profiles)
    for incident in source_behavior_incidents.values():
        source_id = str(incident.get("source_id") or "")
        if source_id not in all_source_ids:
            raise ValueError(
                f"source behavior incident {incident.get('incident_id')} references "
                f"missing merged source profile {source_id}"
            )

    all_event_ids = set(events)
    graph_ids = all_source_ids | all_event_ids
    for event in events.values():
        if str(event["source_id"]) not in all_source_ids:
            raise ValueError(
                f"event {event['event_id']} references missing merged source profile {event['source_id']}"
            )
        for carrier in event.get("carrier_profile_ids") or []:
            if str(carrier) not in all_source_ids:
                raise ValueError(
                    f"event {event['event_id']} references missing merged carrier profile {carrier}"
                )

    for relation in relationships.values():
        for endpoint in ("from_id", "to_id"):
            if str(relation[endpoint]) not in graph_ids:
                raise ValueError(
                    f"relationship {relation['relationship_id']} references missing merged endpoint {relation[endpoint]}"
                )

    packet_set_sha = sha256_bytes("".join(fingerprint_material).encode("utf-8"))
    input_identity_material = packet_set_sha
    if dossier_hash:
        input_identity_material += f"\n{dossier_hash}"
    input_set_sha = sha256_bytes(input_identity_material.encode("utf-8"))
    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_FORENSIC_INPUT",
        "authority": "WEB_OF_LIES_INFORMATION_FORENSICS",
        "version": f"WOL-FORENSIC-INPUT-{input_set_sha[:16]}",
        "contract_path": CONTRACT,
        "evidence_cutoff": latest_as_of[1] if latest_as_of else None,
        "lineage_packet_set_sha256": packet_set_sha,
        "forensic_input_set_sha256": input_set_sha,
        "source_dossier": source_dossier_meta,
        "lineage_packets": sorted(packet_rows, key=lambda row: row["packet_id"]),
        "source_profiles": sorted(profiles.values(), key=lambda row: row["source_id"]),
        "information_events": sorted(events.values(), key=lambda row: row["event_id"]),
        "relationships": sorted(relationships.values(), key=lambda row: row["relationship_id"]),
        "promotion_flags": sorted(promotion_flags.values(), key=lambda row: row["flag_id"]),
        "external_assessments": sorted(
            external_assessments.values(), key=lambda row: row["assessment_id"]
        ),
        "infrastructure_observations": sorted(
            infrastructure_observations.values(), key=lambda row: row["observation_id"]
        ),
        "research_leads": sorted(
            research_leads.values(), key=lambda row: row["lead_id"]
        ),
        "source_behavior_incidents": sorted(
            source_behavior_incidents.values(), key=lambda row: row["incident_id"]
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default=OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output

    result = build_forensic_input(root)
    serialized = canonical_bytes(result)

    if args.check:
        if not output.is_file() or output.read_bytes() != serialized:
            raise SystemExit(f"FAIL stale {output}")
        print(
            "web-of-lies forensic input: PASS "
            f"packets={len(result['lineage_packets'])} "
            f"sources={len(result['source_profiles'])} "
            f"events={len(result['information_events'])}"
        )
        return 0

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(
        "web-of-lies forensic input: wrote "
        f"{output} packets={len(result['lineage_packets'])} "
        f"sources={len(result['source_profiles'])} "
        f"events={len(result['information_events'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
