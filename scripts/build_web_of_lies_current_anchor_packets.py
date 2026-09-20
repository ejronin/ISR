#!/usr/bin/env python3
"""Build neutral Web of Lies anchor packets for the active Claims Forensics ledger.

Rich lineage packets remain the source-accountability record where propagation
research already exists. This compiler fills only the current-ledger coverage
gap: it reconstructs the exact record set used by Claims Forensics, identifies
the active chain universe from the semantic overlay, and emits neutral anchor
events for PUBLIC_READY claim instances not already referenced by richer Web of
Lies packets.

Anchors do not infer carrier relationships, misconduct, knowledge, deception,
or Hall-of-Shame behavior. Blocked propositions are never copied into anchor
events.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import apply_claims_forensics_lie_ledger as claims_current  # noqa: E402
import build_lie_ledger_evidence_adjudication as lie_baseline  # noqa: E402

BASELINE_PATH = lie_baseline.ADJUDICATION_PATH
OVERLAY_PATH = claims_current.OVERLAY_PATH
PACKET_DIR = "data/web-of-lies/lineage-packets"
ANCHOR_PREFIX = "anchor-"
AS_OF = "2026-09-20T18:45:00-04:00"


def load(root: Path, path: str) -> Any:
    return json.loads((root / path).read_text(encoding="utf-8"))


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def safe_id(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_")


def unique(values: list[Any]) -> list[str]:
    return sorted({str(value).strip() for value in values if str(value).strip()})


def current_records(root: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    payload = load(root, BASELINE_PATH)
    overlay = claims_current._validated_overlay(root)
    records = [copy.deepcopy(row) for row in payload.get("records") or []]
    records = claims_current._apply_record_overrides(records, overlay)
    records = claims_current._append_claims_forensics_records(records, overlay)

    active = set(overlay.get("chain_overrides") or {})
    if not active:
        raise ValueError("Claims Forensics overlay exposes no active chain universe")

    record_chains = {str(row.get("chain_id") or "") for row in records}
    missing = sorted(active - record_chains)
    if missing:
        raise ValueError(f"active Claims Forensics chains have no records: {missing}")

    retired_family = set(overlay.get("narrative_family_overrides") or {})
    leaked = sorted(retired_family & active)
    if leaked:
        raise ValueError(f"retired narrative families leaked into active chain overrides: {leaked}")
    return records, overlay


def rich_packet_refs(root: Path) -> set[str]:
    refs: set[str] = set()
    packet_root = root / PACKET_DIR
    for path in sorted(packet_root.glob("*.json")):
        if path.name.startswith(ANCHOR_PREFIX):
            continue
        packet = json.loads(path.read_text(encoding="utf-8"))
        for event in packet.get("information_events") or []:
            refs.update(str(value) for value in event.get("canonical_claim_refs") or [] if str(value))
    return refs


def actor_source_id(actor: str) -> str:
    digest = hashlib.sha256(actor.encode("utf-8")).hexdigest()[:16].upper()
    return f"WOL-SRC-CLAIMANT-{digest}"


def receipt_ids(record: dict[str, Any]) -> list[str]:
    support = record.get("evidence_support") or {}
    what_was_said = [
        str(value)
        for value in support.get("what_was_said") or []
        if str(value)
    ]
    if what_was_said:
        return unique(what_was_said)
    return unique(list(record.get("source_ids") or []))


def statement_date(record: dict[str, Any]) -> str | None:
    stamp = record.get("statement_time") or {}
    value = str(stamp.get("date") or record.get("event_time") or "").strip()
    return value or None


def statement_precision(record: dict[str, Any]) -> str | None:
    stamp = record.get("statement_time") or {}
    value = str(stamp.get("precision") or "").strip()
    return value or None


def verdict(record: dict[str, Any]) -> str:
    combined = str(record.get("combined_assessment") or "").strip()
    truth = str(record.get("truth_adjudication") or "").strip()
    knowledge = str(record.get("knowledge_judgment") or "").strip()
    finding = combined or " / ".join(value for value in (truth, knowledge) if value) or "UNRESOLVED"
    return (
        f"Claims Forensics records: {finding}. Web of Lies preserves that adjudication "
        "as a canonical anchor and does not infer a stronger source-behavior, knowledge, "
        "or deception finding."
    )


def anchor_packet(
    chain_id: str,
    records: list[dict[str, Any]],
    existing_refs: set[str],
) -> dict[str, Any]:
    events: list[dict[str, Any]] = []
    profiles: dict[str, dict[str, Any]] = {}
    public_total = 0
    covered_by_rich = 0
    blocked_total = 0

    for record in sorted(records, key=lambda row: str(row.get("claim_instance_id") or "")):
        instance_id = str(record.get("claim_instance_id") or "")
        if not instance_id:
            raise ValueError(f"{chain_id}: claim record lacks claim_instance_id")

        if str(record.get("publication_status") or "") != "PUBLIC_READY":
            blocked_total += 1
            continue
        public_total += 1

        if instance_id in existing_refs:
            covered_by_rich += 1
            continue

        actor = str(record.get("actor") or "Unknown claimant").strip() or "Unknown claimant"
        source_id = actor_source_id(actor)
        receipts = receipt_ids(record)
        event_id = f"WOL-EVT-ANCHOR-{safe_id(instance_id)}"
        date = statement_date(record)

        profile = profiles.setdefault(source_id, {
            "source_id": source_id,
            "display_name": actor,
            "source_entity_type": "UNKNOWN",
            "country_region": None,
            "primary_platform": None,
            "canonical_outlet_profile_id": None,
            "canonical_actor_id": None,
            "canonical_source_ids": [],
            "behavior_classes": ["UNKNOWN"],
            "authenticity_class": "UNKNOWN",
            "revenue_model": ["UNKNOWN_REVENUE_MODEL"],
            "classification_basis_event_ids": [],
            "revenue_basis_event_ids": [],
        })
        profile["canonical_source_ids"] = unique(
            list(profile.get("canonical_source_ids") or []) + receipts
        )

        refs = unique([
            record.get("claim_id"),
            instance_id,
            record.get("proposition_id"),
        ])
        events.append({
            "event_id": event_id,
            "claim_family_id": chain_id,
            "source_id": source_id,
            "event_type": "CANONICAL_CLAIM_ANCHOR",
            "published_at": date,
            "first_observed_at": date,
            "time_precision": statement_precision(record),
            "epistemic_posture": "CANONICAL_ADJUDICATION",
            "exact_statement": record.get("claim") or record.get("source_proposition") or record.get("proposition"),
            "translated_statement": None,
            "originating_claimant": actor,
            "lineage_roles": ["ORIGINATES"],
            "carrier_profile_ids": [],
            "canonical_claim_refs": refs,
            "evidence_source_ids": receipts,
            "contrary_evidence_source_ids": [],
            "correction_state": None,
            "behavior_findings": [],
            "revenue_findings": [],
            "independently_sourced": None,
            "plain_english_verdict": verdict(record),
            "canonical_combined_assessment": record.get("combined_assessment"),
        })

    notes = (
        "Neutral current-ledger coverage anchor. "
        f"public_ready={public_total}; covered_by_rich_lineage={covered_by_rich}; "
        f"anchor_events={len(events)}; blocked_not_emitted={blocked_total}. "
        "Anchor events are read-only Claims Forensics projections and never count as Hall incidents."
    )
    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_LINEAGE_PACKET",
        "packet_id": f"WOL-PKT-ANCHOR-{safe_id(chain_id)}-20260920",
        "claim_family_id": chain_id,
        "as_of": AS_OF,
        "basis_paths": [BASELINE_PATH, OVERLAY_PATH],
        "generation_mode": "CURRENT_CLAIMS_FORENSICS_CANONICAL_ANCHOR",
        "notes": notes,
        "source_profiles": sorted(profiles.values(), key=lambda row: row["source_id"]),
        "information_events": sorted(events, key=lambda row: row["event_id"]),
        "relationships": [],
        "promotion_flags": [],
    }


def expected_packets(root: Path) -> dict[Path, dict[str, Any]]:
    records, overlay = current_records(root)
    existing_refs = rich_packet_refs(root)
    active_chain_ids = sorted(set(overlay.get("chain_overrides") or {}))
    by_chain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        chain_id = str(record.get("chain_id") or "")
        if chain_id in active_chain_ids:
            by_chain[chain_id].append(record)

    output: dict[Path, dict[str, Any]] = {}
    for chain_id in active_chain_ids:
        path = root / PACKET_DIR / f"{ANCHOR_PREFIX}{slug(chain_id)}.json"
        output[path] = anchor_packet(chain_id, by_chain[chain_id], existing_refs)
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    packets = expected_packets(root)
    packet_root = root / PACKET_DIR
    expected_paths = set(packets)

    stale_anchor_paths = sorted(
        path for path in packet_root.glob(f"{ANCHOR_PREFIX}*.json")
        if path not in expected_paths
    )
    if args.check:
        errors: list[str] = []
        for path, expected in packets.items():
            if not path.is_file():
                errors.append(f"missing {path.relative_to(root)}")
                continue
            actual = json.loads(path.read_text(encoding="utf-8"))
            if actual != expected:
                errors.append(f"stale {path.relative_to(root)}")
        errors.extend(f"obsolete {path.relative_to(root)}" for path in stale_anchor_paths)
        if errors:
            raise SystemExit("FAIL " + "; ".join(errors))
        emitted = sum(len(packet["information_events"]) for packet in packets.values())
        print(f"web-of-lies current anchors: PASS chains={len(packets)} events={emitted}")
        return 0

    for path in stale_anchor_paths:
        path.unlink()
        print(f"removed {path.relative_to(root)}")
    for path, packet in packets.items():
        path.write_bytes(canonical_bytes(packet))
        print(f"wrote {path.relative_to(root)}")
    emitted = sum(len(packet["information_events"]) for packet in packets.values())
    print(f"web-of-lies current anchors: wrote chains={len(packets)} events={emitted}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
