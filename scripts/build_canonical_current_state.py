#!/usr/bin/env python3
"""Compile the accepted Atlas evidence ledger into one canonical current state.

The compiler has two inputs: the sealed Phase 3 migration boundary and the
append-only packets registered in data/canonical-ledger/manifest.json. It never
rewrites either input. The generated artifact is deterministic and is not an
authority of its own.
"""
from __future__ import annotations

import argparse
import ast
import copy
import hashlib
import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

import canonical_authority as authority


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = "data/canonical-ledger/manifest.json"
DEFAULT_OUTPUT = "data/canonical-current-state.json"
SCHEMA_VERSION = "1.0"
GENERATOR_VERSION = "1.0"
SOURCE_ID_RE = re.compile(r"SRC-[A-F0-9]{12}")
PACKET_ID_RE = re.compile(r"UPD-[0-9]{8}-[A-Z0-9-]+")
ENTITY_ID_PATTERNS = {
    "event": re.compile(r"[A-Z][A-Z0-9._-]{2,}"),
    "source": SOURCE_ID_RE,
    "actor": re.compile(r"ACT-[A-Z0-9][A-Z0-9-]*"),
    "location": re.compile(r"LOC-[A-Z0-9][A-Z0-9-]*"),
    "claim": re.compile(r"(?:CASE|CL)-[A-Z0-9][A-Z0-9-]*"),
    "material_loss": re.compile(r"MAT-[A-Z0-9][A-Z0-9-]*"),
}
ENTITY_PLURALS = {
    "event": "events",
    "source": "sources",
    "actor": "actors",
    "location": "locations",
    "claim": "claims",
    "material_loss": "material_losses",
}
REVISION_TYPES = {
    "new_information",
    "attribution_clarification",
    "temporal_clarification",
    "geolocation_refinement",
    "source_correction",
    "duplicate_resolution",
    "casualty_loss_revision",
    "evidence_status_revision",
    "clerical_correction",
    "relationship_update",
}
OPERATIONS = {
    *(f"add_{kind}" for kind in ENTITY_PLURALS),
    *(f"update_{kind}" for kind in ENTITY_PLURALS),
    "link_source",
    "add_relationship",
}


def canonical_input_bytes(value: bytes) -> bytes:
    try:
        text = value.decode("utf-8")
    except UnicodeDecodeError:
        return value
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def canonical_json_bytes(payload: Any) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def stable_id(prefix: str, *values: Any) -> str:
    material = "\0".join(str(value or "").strip().casefold() for value in values).encode("utf-8")
    return f"{prefix}-{sha256_bytes(material)[:12].upper()}"


def json_equal(left: Any, right: Any) -> bool:
    return canonical_json_bytes(left) == canonical_json_bytes(right)


def parse_datetime(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be an ISO-8601 timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{label} is not a valid ISO-8601 timestamp: {value!r}") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"{label} must include a UTC offset")
    return parsed


def validate_effective_at(value: Any, label: str) -> None:
    if value is None:
        return
    if not isinstance(value, str) or not value:
        raise ValueError(f"{label} must be an ISO date/timestamp or null")
    try:
        if "T" in value:
            parse_datetime(value, label)
        else:
            date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{label} is not a valid ISO date/timestamp: {value!r}") from exc


def cutoff_display(value: str) -> str:
    parsed = parse_datetime(value, "current cutoff")
    return parsed.strftime("%Y-%m-%d %H:%M ET")


def normalize_source_ids(values: Any, label: str) -> list[str]:
    if values is None:
        return []
    if not isinstance(values, list):
        raise ValueError(f"{label} must be an array")
    result: list[str] = []
    for value in values:
        source_id = source_id_from(value)
        if not SOURCE_ID_RE.fullmatch(source_id):
            raise ValueError(f"Invalid source ID {source_id!r} in {label}")
        if source_id not in result:
            result.append(source_id)
    return result


def normalize_event_source_refs(values: Any, label: str) -> tuple[list[str], list[dict[str, Any]]]:
    if values is None:
        return [], []
    if not isinstance(values, list):
        raise ValueError(f"{label} must be an array")
    source_ids: list[str] = []
    references: list[dict[str, Any]] = []
    for value in values:
        source_id = source_id_from(value)
        if not SOURCE_ID_RE.fullmatch(source_id):
            raise ValueError(f"Invalid source ID {source_id!r} in {label}")
        if source_id in source_ids:
            continue
        reference = {"source_id": source_id}
        if isinstance(value, dict):
            roles = value.get("roles") or []
            if isinstance(value.get("source_id"), dict) and not roles:
                roles = value["source_id"].get("source_roles") or []
            if roles:
                reference["roles"] = copy.deepcopy(roles)
            variant_key = value.get("variant_key")
            if variant_key is not None:
                if not isinstance(variant_key, str) or not variant_key.endswith(f":{source_id}"):
                    raise ValueError(f"Invalid source variant key {variant_key!r} in {label}")
                reference["variant_key"] = variant_key
        source_ids.append(source_id)
        references.append(reference)
    return source_ids, references


def source_id_from(value: Any) -> str:
    if isinstance(value, str):
        return value
    if not isinstance(value, dict):
        raise ValueError(f"Unsupported source reference type: {type(value).__name__}")
    source_id = value.get("source_id")
    if isinstance(source_id, str):
        return source_id
    if isinstance(source_id, dict) and isinstance(source_id.get("source_id"), str):
        return source_id["source_id"]
    raise ValueError(f"Source reference has no canonical source_id: {value!r}")


class InputReader:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.files: dict[str, dict[str, Any]] = {}

    def _read(self, relative_path: str, role: str) -> bytes:
        relative = Path(relative_path).as_posix()
        path = self.root / relative
        if not path.is_file():
            raise ValueError(f"Required canonical input is missing: {relative}")
        raw = canonical_input_bytes(path.read_bytes())
        digest = sha256_bytes(raw)
        existing = self.files.get(relative)
        if existing and existing["sha256"] != digest:
            raise ValueError(f"Input changed while compiling canonical state: {relative}")
        if existing:
            existing["roles"] = sorted(set([*existing["roles"], role]))
        else:
            self.files[relative] = {
                "path": relative,
                "sha256": digest,
                "bytes": len(raw),
                "hash_basis": "UTF8_LF_NORMALIZED",
                "roles": [role],
            }
        return raw

    def json(self, relative_path: str, role: str) -> Any:
        raw = self._read(relative_path, role)
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError(f"Invalid JSON input {relative_path}: {exc}") from exc

    def virtual_json(self, relative_path: str, role: str, payload: Any) -> Any:
        relative = Path(relative_path).as_posix()
        raw = canonical_json_bytes(payload)
        self.files[relative] = {
            "path": relative,
            "sha256": sha256_bytes(raw),
            "bytes": len(raw),
            "hash_basis": "UTF8_LF_NORMALIZED",
            "roles": [role],
            "virtual": True,
        }
        return copy.deepcopy(payload)

    def text(self, relative_path: str, role: str) -> str:
        raw = self._read(relative_path, role)
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError(f"Invalid UTF-8 input {relative_path}: {exc}") from exc

    def digest(self, relative_path: str) -> str:
        return self.files[Path(relative_path).as_posix()]["sha256"]

    def verify_unchanged(self) -> None:
        for relative, expected in self.files.items():
            if expected.get("virtual"):
                continue
            raw = canonical_input_bytes((self.root / relative).read_bytes())
            if sha256_bytes(raw) != expected["sha256"]:
                raise ValueError(f"Compilation modified canonical input: {relative}")


def merge_source_records(existing: dict[str, Any], incoming: dict[str, Any], source_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    merged = copy.deepcopy(existing)
    conflicts: list[dict[str, Any]] = []
    for key, value in incoming.items():
        current = merged.get(key)
        if key not in merged or current in (None, "", [], {}):
            merged[key] = copy.deepcopy(value)
        elif value in (None, "", [], {}) or json_equal(current, value):
            continue
        elif isinstance(current, list) and isinstance(value, list):
            merged[key] = list(dict.fromkeys([*current, *value]))
        else:
            conflicts.append({
                "source_id": source_id,
                "field": key,
                "retained_value": copy.deepcopy(current),
                "alternate_value": copy.deepcopy(value),
            })
    return merged, conflicts


def package_manifest_count_matches(counts: dict[str, Any], candidates: Iterable[str], actual: int) -> bool:
    present = [counts[key] for key in candidates if key in counts]
    return bool(present) and any(isinstance(value, int) and value == actual for value in present)


def timeline_from_event(event: dict[str, Any], prior: dict[str, Any] | None = None) -> dict[str, Any]:
    timeline = copy.deepcopy(prior or {})
    event_id = event["event_id"]
    event_date = event.get("event_date")
    if not isinstance(event_date, str) or not event_date:
        raise ValueError(f"Event {event_id} has no occurrence date")
    try:
        parsed = date.fromisoformat(event_date)
    except ValueError as exc:
        raise ValueError(f"Event {event_id} has invalid occurrence date {event_date!r}") from exc
    timeline.update({
        "event_id": event_id,
        "date": event_date,
        "day": event_date,
        "year": parsed.year,
        "month": event_date[:7],
        "iso_week": f"{parsed.isocalendar().year}-W{parsed.isocalendar().week:02d}",
        "time": event.get("event_time"),
        "time_precision": event.get("event_time_precision") or "DATE_ONLY",
        "hour_bucket": (str(event.get("event_time"))[:2] if event.get("event_time") else None),
        "summary": event.get("summary"),
        "event_type": event.get("event_type"),
        "record_class": event.get("record_class"),
        "source_ids": normalize_source_ids(event.get("source_ids") or event.get("source_refs"), f"event {event_id}"),
        "first_reported": event.get("first_reported"),
        "first_verified": event.get("first_verified"),
        "claim_refs": copy.deepcopy(event.get("claim_refs") or []),
        "facility_refs": copy.deepcopy(event.get("facility_refs") or []),
        "map_refs": copy.deepcopy(event.get("map_refs") or []),
    })
    return timeline


def validate_coordinates(record: dict[str, Any], label: str) -> None:
    latitude = record.get("latitude", record.get("lat"))
    longitude = record.get("longitude", record.get("lon"))
    for name, value, low, high in (("latitude", latitude, -90, 90), ("longitude", longitude, -180, 180)):
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not low <= value <= high:
            raise ValueError(f"{label} has impossible {name}: {value!r}")
    if (latitude is None) != (longitude is None):
        raise ValueError(f"{label} must provide both latitude and longitude or neither")


def validate_record_timestamps(record: dict[str, Any], label: str) -> None:
    for field, value in record.items():
        if value is None:
            continue
        if "timestamp" in field.lower():
            parse_datetime(value, f"{label} {field}")
    if record.get("event_time") and str(record.get("event_time_precision") or "").upper() in {"EXACT", "MINUTE", "MINUTE_LEVEL"}:
        if not re.match(r"^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?(?:\s|$)", str(record["event_time"])):
            raise ValueError(f"{label} has invalid precise event_time: {record['event_time']!r}")


def validate_entity_id(entity_type: str, entity_id: Any) -> str:
    if not isinstance(entity_id, str) or not ENTITY_ID_PATTERNS[entity_type].fullmatch(entity_id):
        raise ValueError(f"Malformed {entity_type} ID: {entity_id!r}")
    return entity_id


def record_id_field(entity_type: str) -> str:
    return {
        "event": "event_id",
        "source": "source_id",
        "actor": "actor_id",
        "location": "location_id",
        "claim": "case_id",
        "material_loss": "loss_id",
    }[entity_type]


def make_wrapper(entity_type: str, entity_id: str, record: dict[str, Any], provenance: list[dict[str, Any]]) -> dict[str, Any]:
    source_values = record.get("source_ids") or record.get("source_refs")
    if entity_type == "location":
        source_values = source_values or record.get("location_source_ids")
    return {
        record_id_field(entity_type): entity_id,
        "record": copy.deepcopy(record),
        "source_ids": normalize_source_ids(source_values, f"{entity_type} {entity_id}"),
        "provenance": copy.deepcopy(provenance),
        "revisions": [],
    }


def load_actor_registry(reader: InputReader, path: str) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    payload = reader.json(path, "MIGRATION_ACTOR_REGISTRY")
    actors: dict[str, dict[str, Any]] = {}
    aliases: dict[str, str] = {}
    for index, raw in enumerate(payload.get("actors") or []):
        actor_id = validate_entity_id("actor", raw.get("actor_id"))
        if actor_id in actors:
            raise ValueError(f"Duplicate actor ID in migration registry: {actor_id}")
        record = copy.deepcopy(raw)
        for alias in record.get("aliases") or []:
            normalized = str(alias).strip().casefold()
            if not normalized:
                raise ValueError(f"Actor {actor_id} contains an empty alias")
            if normalized in aliases:
                raise ValueError(f"Actor alias collision: {alias!r}")
            aliases[normalized] = actor_id
        actors[actor_id] = make_wrapper("actor", actor_id, record, [{
            "kind": "MIGRATION_ACTOR_REGISTRY",
            "path": path,
            "index": index,
            "sha256": reader.digest(path),
        }])
    for actor_id, wrapper in actors.items():
        affiliation_id = wrapper["record"].get("affiliation_id")
        if affiliation_id and affiliation_id not in actors:
            raise ValueError(f"Actor {actor_id} has unresolved affiliation {affiliation_id}")
    return actors, aliases


def resolve_legacy_actor(name: str, actors: dict[str, dict[str, Any]], aliases: dict[str, str], provenance: dict[str, Any]) -> str:
    normalized = name.strip().casefold()
    exact = aliases.get(normalized)
    if exact:
        return exact
    qualified = next((actor_id for alias, actor_id in aliases.items() if normalized.startswith(f"{alias} (") ), None)
    if qualified:
        return qualified
    actor_id = stable_id("ACT-LEGACY", name)
    existing = actors.get(actor_id)
    if existing and existing["record"]["canonical_name"] != name:
        raise ValueError(f"Derived legacy actor collision for {name!r}")
    if not existing:
        record = {
            "actor_id": actor_id,
            "canonical_name": name,
            "aliases": [normalized],
            "entity_type": "unresolved",
            "role": None,
            "affiliation_id": None,
            "affiliation_type": "unknown",
            "parent_state": None,
            "flag": "",
            "subtitle": "Identity as recorded; affiliation unresolved",
        }
        actors[actor_id] = make_wrapper("actor", actor_id, record, [provenance])
        aliases[normalized] = actor_id
    elif provenance not in existing["provenance"]:
        existing["provenance"].append(copy.deepcopy(provenance))
    return actor_id


def location_record_from_event(location_id: str, location: dict[str, Any], provenance: dict[str, Any]) -> dict[str, Any]:
    validate_coordinates(location, f"location {location_id}")
    return {
        "location_id": location_id,
        "canonical_name": location.get("name"),
        "alternate_names": [],
        "location_type": location.get("type") or location.get("precision") or "unknown",
        "parent_geographic_entity": location.get("country"),
        "latitude": location.get("lat"),
        "longitude": location.get("lon"),
        "coordinate_precision": location.get("precision"),
        "facility_relationships": [],
        "location_source_ids": [],
        "migration_provenance": provenance,
    }


def hydrate_actor_records(actors: dict[str, dict[str, Any]]) -> None:
    aliases: dict[str, str] = {}
    for actor_id, wrapper in actors.items():
        record = wrapper["record"]
        if record.get("entity_type") not in {"person", "entity", "unresolved"}:
            raise ValueError(f"Actor {actor_id} has invalid entity_type")
        if not isinstance(record.get("canonical_name"), str) or not record["canonical_name"].strip():
            raise ValueError(f"Actor {actor_id} has no canonical name")
        for alias in record.get("aliases") or []:
            normalized = str(alias).strip().casefold()
            if normalized in aliases and aliases[normalized] != actor_id:
                raise ValueError(f"Actor alias collision after updates: {alias!r}")
            aliases[normalized] = actor_id
        affiliation_id = record.get("affiliation_id")
        if not affiliation_id:
            continue
        affiliation = actors.get(affiliation_id)
        if not affiliation:
            raise ValueError(f"Actor {actor_id} has unresolved affiliation {affiliation_id}")
        affiliated_record = affiliation["record"]
        record["affiliation"] = affiliated_record.get("canonical_name")
        record["affiliation_type"] = affiliated_record.get("affiliation_type")
        record["parent_state"] = affiliated_record.get("parent_state")
        record["flag"] = affiliated_record.get("flag") or ""
        record["subtitle"] = " · ".join(filter(None, [record.get("role"), record.get("affiliation")])) or "Affiliation unresolved"


def location_to_event_shape(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": record.get("canonical_name"),
        "country": record.get("parent_geographic_entity"),
        "lat": record.get("latitude"),
        "lon": record.get("longitude"),
        "precision": record.get("coordinate_precision") or record.get("location_type"),
    }


def validate_revision(revision: Any, packet: dict[str, Any], label: str, require_sources: bool) -> dict[str, Any]:
    if not isinstance(revision, dict):
        raise ValueError(f"{label} lacks revision provenance")
    revision_type = revision.get("revision_type")
    if revision_type not in REVISION_TYPES:
        raise ValueError(f"{label} has invalid revision type: {revision_type!r}")
    reason = revision.get("reason")
    if not isinstance(reason, str) or not reason.strip():
        raise ValueError(f"{label} has no revision reason")
    if not isinstance(revision.get("analytical_meaning_changed"), bool):
        raise ValueError(f"{label} must state whether analytical meaning changed")
    source_ids = normalize_source_ids(revision.get("supporting_source_ids"), f"{label} revision")
    if require_sources and not source_ids:
        raise ValueError(f"{label} requires at least one supporting source")
    known_at = revision.get("known_at") or packet["known_at"]
    parse_datetime(known_at, f"{label} known_at")
    validate_effective_at(revision.get("effective_at"), f"{label} effective_at")
    return {
        "revision_type": revision_type,
        "reason": reason.strip(),
        "effective_at": revision.get("effective_at"),
        "known_at": known_at,
        "supporting_source_ids": source_ids,
        "analytical_meaning_changed": revision["analytical_meaning_changed"],
    }


def validate_packet_shape(packet: Any, accepted: bool = False) -> dict[str, Any]:
    if not isinstance(packet, dict) or packet.get("schema_version") != "1.0":
        raise ValueError("Update packet schema_version must be 1.0")
    packet_id = packet.get("packet_id")
    if not isinstance(packet_id, str) or not PACKET_ID_RE.fullmatch(packet_id):
        raise ValueError(f"Malformed update packet ID: {packet_id!r}")
    allowed_status = {"ACCEPTED"} if accepted else {"DRAFT", "ACCEPTED"}
    if packet.get("status") not in allowed_status:
        raise ValueError(f"Packet {packet_id} status must be one of {sorted(allowed_status)}")
    parse_datetime(packet.get("known_at"), f"packet {packet_id} known_at")
    if not isinstance(packet.get("summary"), str) or not packet["summary"].strip():
        raise ValueError(f"Packet {packet_id} requires a summary")
    operations = packet.get("operations")
    if not isinstance(operations, list) or not operations:
        raise ValueError(f"Packet {packet_id} must contain operations")
    operation_ids: set[str] = set()
    for operation in operations:
        if not isinstance(operation, dict):
            raise ValueError(f"Packet {packet_id} contains a non-object operation")
        operation_id = operation.get("operation_id")
        if not isinstance(operation_id, str) or not re.fullmatch(r"[A-Z0-9][A-Z0-9_-]*", operation_id):
            raise ValueError(f"Packet {packet_id} has malformed operation ID {operation_id!r}")
        if operation_id in operation_ids:
            raise ValueError(f"Packet {packet_id} repeats operation ID {operation_id}")
        operation_ids.add(operation_id)
        if operation.get("op") not in OPERATIONS:
            raise ValueError(f"Packet {packet_id} has invalid operation {operation.get('op')!r}")
        variant_key = operation.get("variant_key")
        if variant_key is not None:
            if operation.get("op") != "update_source":
                raise ValueError(f"Packet {packet_id} may use variant_key only with update_source")
            if not isinstance(variant_key, str) or not re.fullmatch(r"[^:]+:SRC-[A-F0-9]{12}", variant_key):
                raise ValueError(f"Packet {packet_id} has malformed source variant_key {variant_key!r}")
    return packet


def revision_entry(packet: dict[str, Any], operation: dict[str, Any], revision: dict[str, Any], entity_type: str, entity_id: str, field: str, previous: Any, new: Any, index: int) -> dict[str, Any]:
    entry = {
        "revision_id": f"{packet['packet_id']}:{operation['operation_id']}:{index}",
        "entity_type": entity_type,
        "entity_id": entity_id,
        "field": field,
        "previous_value": copy.deepcopy(previous),
        "new_value": copy.deepcopy(new),
        "effective_at": revision["effective_at"],
        "known_at": revision["known_at"],
        "supporting_source_ids": revision["supporting_source_ids"],
        "update_packet": packet["packet_id"],
        "operation_id": operation["operation_id"],
        "revision_type": revision["revision_type"],
        "reason": revision["reason"],
        "analytical_meaning_changed": revision["analytical_meaning_changed"],
    }
    if operation.get("variant_key"):
        entry["variant_key"] = operation["variant_key"]
    return entry


def apply_packet(stores: dict[str, dict[str, dict[str, Any]]], relationships: dict[str, dict[str, Any]], revisions: list[dict[str, Any]], packet: dict[str, Any], packet_path: str, report: dict[str, Any]) -> None:
    packet = validate_packet_shape(packet, accepted=packet.get("status") == "ACCEPTED")
    provenance_kind = "ACCEPTED_UPDATE_PACKET" if packet.get("status") == "ACCEPTED" else "PROPOSED_UPDATE_PACKET"
    for operation in packet["operations"]:
        op = operation["op"]
        label = f"{packet['packet_id']}:{operation['operation_id']}"
        if op == "add_relationship":
            relationship = operation.get("relationship")
            if not isinstance(relationship, dict):
                raise ValueError(f"{label} requires a relationship record")
            relationship_id = operation.get("entity_id")
            if not isinstance(relationship_id, str) or not re.fullmatch(r"REL-[A-Z0-9][A-Z0-9-]*", relationship_id):
                raise ValueError(f"{label} has malformed relationship ID")
            if relationship_id in relationships:
                raise ValueError(f"Duplicate relationship ID: {relationship_id}")
            revision = validate_revision(operation.get("revision"), packet, label, require_sources=True)
            relationships[relationship_id] = {
                "relationship_id": relationship_id,
                "record": copy.deepcopy(relationship),
                "provenance": [{"kind": provenance_kind, "packet_id": packet["packet_id"], "path": packet_path}],
                "revisions": [],
            }
            entry = revision_entry(packet, operation, revision, "relationship", relationship_id, "__entity__", None, relationship, 0)
            relationships[relationship_id]["revisions"].append(entry)
            revisions.append(entry)
            report["records_added"].append({"entity_type": "relationship", "entity_id": relationship_id})
            continue

        if op == "link_source":
            entity_type = operation.get("entity_type")
            if entity_type not in ENTITY_PLURALS:
                raise ValueError(f"{label} requires a valid entity_type")
            entity_id = validate_entity_id(entity_type, operation.get("entity_id"))
            wrapper = stores[entity_type].get(entity_id)
            if not wrapper:
                raise ValueError(f"{label} references nonexistent {entity_type} {entity_id}")
            source_id = validate_entity_id("source", operation.get("source_id"))
            if source_id not in stores["source"]:
                raise ValueError(f"{label} references nonexistent source {source_id}")
            revision = validate_revision(operation.get("revision"), packet, label, require_sources=True)
            previous = copy.deepcopy(wrapper.get("source_ids") or [])
            if source_id in previous:
                raise ValueError(f"{label} would duplicate existing source link {source_id}")
            wrapper["source_ids"] = [*previous, source_id]
            wrapper["provenance"].append({
                "kind": provenance_kind,
                "packet_id": packet["packet_id"],
                "path": packet_path,
                "operation_id": operation["operation_id"],
            })
            entry = revision_entry(packet, operation, revision, entity_type, entity_id, "source_ids", previous, wrapper["source_ids"], 0)
            wrapper["revisions"].append(entry)
            revisions.append(entry)
            report["source_links_added"].append({"entity_type": entity_type, "entity_id": entity_id, "source_id": source_id})
            report["fields_revised"].append(entry)
            continue

        action, entity_type = op.split("_", 1)
        entity_id = validate_entity_id(entity_type, operation.get("entity_id"))
        store = stores[entity_type]
        if action == "add":
            if entity_id in store:
                raise ValueError(f"Duplicate {entity_type} ID: {entity_id}")
            record = operation.get("record")
            if not isinstance(record, dict):
                raise ValueError(f"{label} requires a record")
            id_field = record_id_field(entity_type)
            if record.get(id_field) not in (None, entity_id):
                raise ValueError(f"{label} record ID differs from entity_id")
            record = copy.deepcopy(record)
            record[id_field] = entity_id
            validate_record_timestamps(record, label)
            if entity_type == "location":
                validate_coordinates(record, label)
            revision = validate_revision(operation.get("revision"), packet, label, require_sources=entity_type != "source")
            wrapper = make_wrapper(entity_type, entity_id, record, [{
                "kind": provenance_kind,
                "packet_id": packet["packet_id"],
                "path": packet_path,
                "operation_id": operation["operation_id"],
            }])
            if entity_type == "event":
                wrapper["actor_ids"] = list(record.pop("actor_ids", []))
                wrapper["location_ids"] = list(record.pop("location_ids", []))
                wrapper["claim_ids"] = list(record.pop("claim_ids", []))
            if entity_type == "source":
                wrapper["variants"] = [{
                    "variant_key": f"{packet['packet_id']}:{entity_id}",
                    "record": copy.deepcopy(wrapper["record"]),
                    "provenance": copy.deepcopy(wrapper["provenance"][0]),
                }]
                wrapper["field_conflicts"] = []
            entry = revision_entry(packet, operation, revision, entity_type, entity_id, "__entity__", None, record, 0)
            wrapper["revisions"].append(entry)
            revisions.append(entry)
            store[entity_id] = wrapper
            report["records_added"].append({"entity_type": entity_type, "entity_id": entity_id})
            continue

        wrapper = store.get(entity_id)
        if not wrapper:
            raise ValueError(f"{label} references nonexistent {entity_type} {entity_id}")
        changes = operation.get("changes")
        if not isinstance(changes, dict) or not changes:
            raise ValueError(f"{label} requires explicit field changes")
        revision = validate_revision(operation.get("revision"), packet, label, require_sources=True)
        relationship_fields = {"source_ids", "actor_ids", "location_ids", "claim_ids"} if entity_type == "event" else {"source_ids"}
        source_variant = None
        variant_key = operation.get("variant_key")
        if entity_type == "source":
            variants = wrapper.get("variants") or []
            conflicts = wrapper.get("field_conflicts") or []
            if conflicts and not variant_key:
                raise ValueError(f"{label} must target a provenance-scoped variant; global correction of conflicted source {entity_id} is forbidden")
            if variant_key:
                source_variant = next((variant for variant in variants if variant.get("variant_key") == variant_key), None)
                if source_variant is None:
                    raise ValueError(f"{label} references unknown source variant {variant_key!r}")
        for index, (field, change) in enumerate(changes.items()):
            if not isinstance(change, dict) or set(change) != {"previous", "new"}:
                raise ValueError(f"{label} field {field} must state previous and new values")
            target = wrapper if field in relationship_fields else source_variant["record"] if source_variant is not None else wrapper["record"]
            actual = target.get(field)
            if not json_equal(actual, change["previous"]):
                raise ValueError(f"{label} stale previous value for {field}: expected {actual!r}, packet has {change['previous']!r}")
            if json_equal(change["previous"], change["new"]):
                raise ValueError(f"{label} field {field} does not change")
            target[field] = copy.deepcopy(change["new"])
            entry = revision_entry(packet, operation, revision, entity_type, entity_id, field, change["previous"], change["new"], index)
            wrapper["revisions"].append(entry)
            revisions.append(entry)
            report["fields_revised"].append(entry)
        if entity_type == "location":
            validate_coordinates(wrapper["record"], label)
        validate_record_timestamps(source_variant["record"] if source_variant is not None else wrapper["record"], label)
        update_provenance = {
            "kind": provenance_kind,
            "packet_id": packet["packet_id"],
            "path": packet_path,
            "operation_id": operation["operation_id"],
        }
        if variant_key:
            update_provenance["variant_key"] = variant_key
            source_variant.setdefault("correction_provenance", []).append(copy.deepcopy(update_provenance))
        wrapper["provenance"].append(update_provenance)
        changed_record = {"entity_type": entity_type, "entity_id": entity_id}
        if variant_key:
            changed_record["variant_key"] = variant_key
        report["records_changed"].append(changed_record)


def validate_references(stores: dict[str, dict[str, dict[str, Any]]], relationships: dict[str, dict[str, Any]], report: dict[str, Any]) -> None:
    sources = stores["source"]
    unresolved: list[str] = []
    for entity_type, store in stores.items():
        for entity_id, wrapper in store.items():
            for source_id in wrapper.get("source_ids") or []:
                if source_id not in sources:
                    unresolved.append(f"{entity_type}:{entity_id}->source:{source_id}")
            if entity_type == "event":
                for actor_id in wrapper.get("actor_ids") or []:
                    if actor_id not in stores["actor"]:
                        unresolved.append(f"event:{entity_id}->actor:{actor_id}")
                for location_id in wrapper.get("location_ids") or []:
                    if location_id not in stores["location"]:
                        unresolved.append(f"event:{entity_id}->location:{location_id}")
                for claim_id in wrapper.get("claim_ids") or []:
                    if claim_id not in stores["claim"]:
                        unresolved.append(f"event:{entity_id}->claim:{claim_id}")
            if entity_type == "actor":
                affiliation_id = wrapper["record"].get("affiliation_id")
                if affiliation_id and affiliation_id not in stores["actor"]:
                    unresolved.append(f"actor:{entity_id}->affiliation:{affiliation_id}")
    for relationship_id, wrapper in relationships.items():
        record = wrapper["record"]
        for side in ("from", "to"):
            reference = record.get(side)
            if not isinstance(reference, dict) or reference.get("entity_type") not in ENTITY_PLURALS:
                unresolved.append(f"relationship:{relationship_id}->{side}:malformed")
                continue
            entity_type = reference["entity_type"]
            entity_id = reference.get("entity_id")
            if entity_id not in stores[entity_type]:
                unresolved.append(f"relationship:{relationship_id}->{side}:{entity_type}:{entity_id}")
    report["unresolved_references"] = sorted(unresolved)
    if unresolved:
        raise ValueError(f"Unresolved canonical references: {sorted(unresolved)}")


def duplicate_warnings(stores: dict[str, dict[str, dict[str, Any]]]) -> list[dict[str, Any]]:
    warnings: list[dict[str, Any]] = []
    fingerprints: dict[tuple[Any, ...], str] = {}
    for event_id, wrapper in stores["event"].items():
        event = wrapper["record"]
        fingerprint = (
            event.get("event_date"),
            str(event.get("summary") or "").strip().casefold(),
            tuple(wrapper.get("actor_ids") or []),
            tuple(wrapper.get("location_ids") or []),
        )
        if fingerprint[1] and fingerprint in fingerprints:
            warnings.append({"kind": "EXACT_EVENT_FINGERPRINT", "entity_ids": [fingerprints[fingerprint], event_id]})
        else:
            fingerprints[fingerprint] = event_id
    source_fingerprints: dict[tuple[str, str], str] = {}
    for source_id, wrapper in stores["source"].items():
        record = wrapper["record"] or {}
        fingerprint = (str(record.get("url") or "").strip(), str(record.get("title") or "").strip().casefold())
        if any(fingerprint) and fingerprint in source_fingerprints:
            warnings.append({"kind": "EXACT_SOURCE_METADATA", "entity_ids": [source_fingerprints[fingerprint], source_id]})
        else:
            source_fingerprints[fingerprint] = source_id
    return warnings


def verify_migration_boundary(reader: InputReader, manifest: dict[str, Any]) -> dict[str, Any]:
    boundary_path = manifest["migration_boundary"]["sealed_inputs"]
    boundary = reader.json(boundary_path, "SEALED_MIGRATION_BOUNDARY")
    if reader.digest(boundary_path) != authority.MIGRATION_BOUNDARY_SHA256:
        raise ValueError("Migration boundary differs from the independently pinned authority digest")
    if boundary.get("accepted_phase3_head") != authority.ACCEPTED_PHASE3_HEAD:
        raise ValueError("Migration boundary attempts to redefine the accepted Phase 3 HEAD")
    if boundary.get("accepted_phase3_head") != manifest["migration_boundary"].get("accepted_phase3_head"):
        raise ValueError("Migration boundary commit does not match canonical manifest")
    for item in boundary.get("protected_files") or []:
        raw = reader._read(item["path"], "SEALED_MIGRATION_INPUT")
        if sha256_bytes(raw) != item["sha256"]:
            raise ValueError(f"Unauthorized modification of sealed migration input: {item['path']}")
    if reader.digest(manifest["migration_boundary"]["actor_registry"]) != authority.MIGRATION_ACTOR_REGISTRY_SHA256:
        raise ValueError("Migration actor authority differs from the independently pinned digest")
    return boundary


def build_state(root: Path = ROOT, proposed_packets: list[tuple[str, dict[str, Any]]] | None = None, manifest_override: dict[str, Any] | None = None) -> tuple[dict[str, Any], dict[str, Any]]:
    root = root.resolve()
    reader = InputReader(root)
    generator_path = "scripts/build_canonical_current_state.py"
    authority_path = "scripts/canonical_authority.py"
    schema_paths = [
        "schemas/canonical-ledger-manifest-v1.json",
        "schemas/canonical-update-packet-v1.json",
        "schemas/canonical-current-state-v1.json",
    ]
    reader.text(generator_path, "CANONICAL_COMPILER")
    reader.text(authority_path, "CANONICAL_AUTHORITY_POLICY")
    for schema_path in schema_paths:
        reader.json(schema_path, "CANONICAL_SCHEMA")
    manifest = reader.virtual_json(MANIFEST_PATH, "PROPOSED_CANONICAL_LEDGER_MANIFEST", manifest_override) if manifest_override is not None else reader.json(MANIFEST_PATH, "CANONICAL_LEDGER_MANIFEST")
    if manifest.get("schema_version") != "1.0" or manifest.get("artifact_role") != "APPEND_ONLY_CANONICAL_UPDATE_LEDGER_REGISTRY":
        raise ValueError("Canonical ledger manifest identity is invalid")
    authority.verify_static_authority(root, manifest)
    boundary = verify_migration_boundary(reader, manifest)

    stores: dict[str, dict[str, dict[str, Any]]] = {entity_type: {} for entity_type in ENTITY_PLURALS}
    relationships: dict[str, dict[str, Any]] = {}
    revisions: list[dict[str, Any]] = []
    report: dict[str, Any] = {
        "records_added": [],
        "records_changed": [],
        "fields_revised": [],
        "source_links_added": [],
        "unresolved_references": [],
        "duplicate_collision_warnings": [],
    }
    source_provenance: dict[str, list[dict[str, Any]]] = {}
    source_variants: dict[str, list[dict[str, Any]]] = {}
    source_conflicts: dict[str, list[dict[str, Any]]] = {}
    input_packages: list[dict[str, Any]] = []
    cutoff_candidates: list[tuple[datetime, str]] = []
    chronology_order: list[str] = []

    def add_source_record(source: dict[str, Any], path: str, package_key: str, index: int) -> None:
        source_id = validate_entity_id("source", source.get("source_id"))
        provenance = {"package_key": package_key, "path": path, "index": index, "sha256": reader.digest(path)}
        variant = {"variant_key": f"{package_key}:{source_id}", "record": copy.deepcopy(source), "provenance": provenance}
        if source_id in stores["source"]:
            existing = stores["source"][source_id]["record"]
            merged, conflicts = merge_source_records(existing, source, source_id)
            stores["source"][source_id]["record"] = merged
            source_conflicts.setdefault(source_id, []).extend(conflicts)
            stores["source"][source_id]["provenance"].append(provenance)
        else:
            stores["source"][source_id] = make_wrapper("source", source_id, source, [provenance])
        source_provenance.setdefault(source_id, []).append(provenance)
        source_variants.setdefault(source_id, []).append(variant)

    running_total = 0
    for spec in manifest.get("baseline_packages") or []:
        package_path = spec["path"]
        manifest_path = f"{package_path}/manifest.json"
        events_path = f"{package_path}/events.json"
        timeline_path = f"{package_path}/timeline.json"
        sources_path = f"{package_path}/sources.json"
        package_manifest = reader.json(manifest_path, f"{spec['role']}_MANIFEST")
        events = (reader.json(events_path, f"{spec['role']}_EVENTS").get("events") or [])
        timeline_records = (reader.json(timeline_path, f"{spec['role']}_TIMELINE").get("records") or [])
        sources = (reader.json(sources_path, f"{spec['role']}_SOURCES").get("sources") or [])
        counts = package_manifest.get("counts") or {}
        if not package_manifest_count_matches(counts, ("events", "overlay_events", "accepted_or_corrected_events"), len(events)):
            raise ValueError(f"{spec['key']} manifest event count does not match package")
        if not package_manifest_count_matches(counts, ("timeline_records", "overlay_timeline_records", "accepted_or_corrected_events"), len(timeline_records)):
            raise ValueError(f"{spec['key']} manifest timeline count does not match package")
        event_index = {event.get("event_id"): (index, event) for index, event in enumerate(events)}
        timeline_index = {item.get("event_id"): (index, item) for index, item in enumerate(timeline_records)}
        if None in event_index or set(event_index) != set(timeline_index) or len(event_index) != len(events):
            raise ValueError(f"{spec['key']} event/timeline IDs are incomplete, duplicated, or mismatched")
        for event_id, (event_position, event) in event_index.items():
            validate_entity_id("event", event_id)
            if event_id in stores["event"]:
                raise ValueError(f"Duplicate event ID across inherited packages: {event_id}")
            timeline_position, timeline = timeline_index[event_id]
            normalized_event = copy.deepcopy(event)
            source_ids, normalized_references = normalize_event_source_refs(event.get("source_refs"), f"event {event_id}")
            normalized_event["source_ids"] = source_ids
            normalized_event["source_refs"] = normalized_references
            normalized_timeline = copy.deepcopy(timeline)
            timeline_sources = normalize_source_ids(timeline.get("source_ids"), f"timeline {event_id}")
            if set(source_ids) != set(timeline_sources):
                raise ValueError(f"Event/timeline source mismatch for {event_id}")
            provenance = {
                "kind": "INHERITED_MIGRATION_BASELINE",
                "package_key": spec["key"],
                "package_name": package_manifest.get("package_name"),
                "package_role": spec["role"],
                "event": {"path": events_path, "index": event_position, "sha256": reader.digest(events_path)},
                "timeline": {"path": timeline_path, "index": timeline_position, "sha256": reader.digest(timeline_path)},
            }
            wrapper = make_wrapper("event", event_id, normalized_event, [provenance])
            wrapper["timeline"] = normalized_timeline
            wrapper["actor_ids"] = []
            wrapper["location_ids"] = []
            wrapper["claim_ids"] = list(normalized_event.get("claim_refs") or [])
            stores["event"][event_id] = wrapper
            chronology_order.append(event_id)
        for index, source in enumerate(sources):
            add_source_record(source, sources_path, spec["key"], index)
        running_total += len(events)
        cutoff = package_manifest.get("collection_cutoff") or package_manifest.get("created_at")
        cutoff_candidates.append((parse_datetime(cutoff, f"{spec['key']} cutoff"), cutoff))
        input_packages.append({
            "key": spec["key"],
            "path": package_path,
            "role": spec["role"],
            "package_name": package_manifest.get("package_name"),
            "schema_version": package_manifest.get("schema_version"),
            "collection_cutoff": cutoff,
            "contribution": len(events),
            "cumulative_chronology_records": running_total,
            "event_count": len(events),
            "timeline_count": len(timeline_records),
            "source_count": len(sources),
            "manifest": package_manifest,
            "manifest_sha256": reader.digest(manifest_path),
        })

    for namespace in manifest.get("source_namespaces") or []:
        payload = reader.json(namespace["path"], namespace["role"])
        for index, source in enumerate(payload.get("sources") or []):
            add_source_record(source, namespace["path"], namespace["key"], index)

    for source_id, wrapper in stores["source"].items():
        wrapper["variants"] = source_variants.get(source_id, [])
        wrapper["field_conflicts"] = source_conflicts.get(source_id, [])

    actor_path = manifest["migration_boundary"]["actor_registry"]
    actors, actor_aliases = load_actor_registry(reader, actor_path)
    stores["actor"] = actors
    locations_by_fingerprint: dict[tuple[str, str], str] = {}
    for event_id in chronology_order:
        wrapper = stores["event"][event_id]
        event = wrapper["record"]
        provenance = {"kind": "INHERITED_EVENT_REFERENCE", "event_id": event_id, "package_key": wrapper["provenance"][0]["package_key"]}
        raw_actors = event.get("actors")
        if isinstance(raw_actors, str):
            raw_actors = [raw_actors]
        wrapper["actor_ids"] = [resolve_legacy_actor(str(name), stores["actor"], actor_aliases, provenance) for name in (raw_actors or [])]
        location = event.get("location")
        if isinstance(location, dict) and location.get("name"):
            # Preserve distinct inherited coordinate/precision observations. A
            # future accepted update may reconcile them, but migration must not
            # silently choose one legacy value for all same-named places.
            fingerprint = (
                str(location.get("name")).strip().casefold(),
                str(location.get("country") or "").strip().casefold(),
                str(location.get("lat")),
                str(location.get("lon")),
                str(location.get("precision") or "").strip().casefold(),
            )
            location_id = locations_by_fingerprint.get(fingerprint) or stable_id("LOC", *fingerprint)
            locations_by_fingerprint[fingerprint] = location_id
            if location_id not in stores["location"]:
                record = location_record_from_event(location_id, location, provenance)
                stores["location"][location_id] = make_wrapper("location", location_id, record, [provenance])
            elif provenance not in stores["location"][location_id]["provenance"]:
                stores["location"][location_id]["provenance"].append(copy.deepcopy(provenance))
            wrapper["location_ids"] = [location_id]

    for collection in manifest.get("entity_collections") or []:
        entity_type = collection["entity_type"]
        payload = reader.json(collection["path"], collection["role"])
        records = payload.get(collection["array_key"]) or []
        for index, record in enumerate(records):
            entity_id = validate_entity_id(entity_type, record.get(collection["id_field"]))
            if entity_id in stores[entity_type]:
                raise ValueError(f"Duplicate {entity_type} ID across inherited collections: {entity_id}")
            provenance = [{
                "kind": "INHERITED_ENTITY_COLLECTION",
                "path": collection["path"],
                "index": index,
                "sha256": reader.digest(collection["path"]),
                "role": collection["role"],
            }]
            stores[entity_type][entity_id] = make_wrapper(entity_type, entity_id, record, provenance)

    accepted_updates: list[dict[str, Any]] = []
    packet_ids: set[str] = set()
    packet_paths: set[str] = set()
    prior_packet_known_at: datetime | None = max(cutoff_candidates, key=lambda item: item[0])[0] if cutoff_candidates else None
    for sequence, entry in enumerate(manifest.get("accepted_updates") or [], start=1):
        packet_id = entry.get("packet_id")
        path = entry.get("path")
        if packet_id in packet_ids or path in packet_paths:
            raise ValueError("Canonical manifest repeats an accepted packet ID or path")
        if not isinstance(path, str) or not path.startswith("data/canonical-updates/") or not path.endswith(".json") or ".." in Path(path).parts:
            raise ValueError(f"Accepted packet path is outside the canonical update ledger: {path!r}")
        packet_ids.add(packet_id)
        packet_paths.add(path)
        packet = reader.json(path, "ACCEPTED_CANONICAL_UPDATE_PACKET")
        if packet.get("packet_id") != packet_id:
            raise ValueError(f"Accepted packet ID/path mismatch for {path}")
        if reader.digest(path) != entry.get("sha256"):
            raise ValueError(f"Accepted packet was modified after registration: {path}")
        validate_packet_shape(packet, accepted=True)
        if entry.get("known_at") != packet.get("known_at"):
            raise ValueError(f"Accepted packet known_at differs from immutable manifest lineage: {packet_id}")
        packet_known_at = parse_datetime(packet["known_at"], f"packet {packet_id} known_at")
        if prior_packet_known_at and packet_known_at <= prior_packet_known_at:
            raise ValueError(f"Accepted packet known_at must be strictly later than the prior accepted state: {packet_id}")
        prior_packet_known_at = packet_known_at
        apply_packet(stores, relationships, revisions, packet, path, report)
        cutoff_candidates.append((packet_known_at, packet["known_at"]))
        accepted_updates.append({"sequence": sequence, **entry, "known_at": packet["known_at"], "summary": packet["summary"], "operation_count": len(packet["operations"])})

    for path, packet in proposed_packets or []:
        validate_packet_shape(packet, accepted=False)
        if packet["packet_id"] in packet_ids:
            raise ValueError(f"Proposed packet is already accepted: {packet['packet_id']}")
        proposed_known_at = parse_datetime(packet["known_at"], f"packet {packet['packet_id']} known_at")
        if prior_packet_known_at and proposed_known_at <= prior_packet_known_at:
            raise ValueError(f"Proposed packet known_at must be strictly later than the last accepted state: {packet['packet_id']}")
        prior_packet_known_at = proposed_known_at
        apply_packet(stores, relationships, revisions, packet, path, report)
        cutoff_candidates.append((proposed_known_at, packet["known_at"]))

    hydrate_actor_records(stores["actor"])
    for event_id, wrapper in stores["event"].items():
        event = wrapper["record"]
        event["actor_ids"] = copy.deepcopy(wrapper.get("actor_ids") or [])
        event["location_ids"] = copy.deepcopy(wrapper.get("location_ids") or [])
        event["claim_ids"] = copy.deepcopy(wrapper.get("claim_ids") or [])
        event["source_ids"] = copy.deepcopy(wrapper.get("source_ids") or [])
        existing_references = {
            source_id_from(reference): reference
            for reference in event.get("source_refs") or []
        }
        event["source_refs"] = [
            copy.deepcopy(existing_references.get(source_id) or {"source_id": source_id})
            for source_id in wrapper["source_ids"]
        ]
        if wrapper["location_ids"]:
            event["locations"] = [location_to_event_shape(stores["location"][location_id]["record"]) for location_id in wrapper["location_ids"]]
            event["location"] = copy.deepcopy(event["locations"][0])
        else:
            event["locations"] = []
        wrapper["timeline"] = timeline_from_event(event, wrapper.get("timeline"))

    validate_references(stores, relationships, report)
    report["duplicate_collision_warnings"] = duplicate_warnings(stores)

    registry_path = manifest["source_registry"]
    registry = reader.json(registry_path, "MIGRATION_SOURCE_REGISTRY")
    registry_sources = {source["source_id"]: source for source in registry.get("sources") or []}
    profiles = {profile["outlet_profile_id"]: profile for profile in registry.get("outlet_profiles") or []}
    source_catalog: list[dict[str, Any]] = []
    for source_id in sorted(stores["source"]):
        wrapper = stores["source"][source_id]
        conflicts = wrapper.get("field_conflicts") or []
        registry_record = registry_sources.get(source_id)
        profile = profiles.get(registry_record.get("outlet_profile_id")) if registry_record else None
        variants = copy.deepcopy(wrapper.get("variants") or [])
        for provenance in wrapper["provenance"]:
            if provenance.get("kind") in {"ACCEPTED_UPDATE_PACKET", "PROPOSED_UPDATE_PACKET"} and not provenance.get("variant_key") and wrapper["record"]:
                update_variant_key = f"{provenance['packet_id']}:{source_id}"
                if not any(variant.get("variant_key") == update_variant_key for variant in variants):
                    variants.append({
                        "variant_key": update_variant_key,
                        "record": copy.deepcopy(wrapper["record"]),
                        "provenance": provenance,
                    })
        resolution = "PROVENANCE_SCOPED_VARIANTS_REQUIRED" if conflicts else "CANONICAL_UPDATE_CURRENT" if wrapper["revisions"] else "UNAMBIGUOUS"
        source_catalog.append({
            "source_id": source_id,
            "record": copy.deepcopy(wrapper["record"]) if not conflicts else None,
            "resolution": resolution,
            "registry": registry_record,
            "outlet_profile": profile,
            "registry_status": "REGISTERED" if registry_record else ("CANONICAL_UPDATE_SOURCE" if wrapper["revisions"] else "CANONICAL_SOURCE_NOT_YET_IN_GENERATED_REGISTRY"),
            "provenance": copy.deepcopy(wrapper["provenance"]),
            "variants": variants,
            "field_conflicts": conflicts,
            "revisions": copy.deepcopy(wrapper["revisions"]),
        })

    chronology = []
    source_variant_keys = {source["source_id"]: [variant["variant_key"] for variant in source["variants"]] for source in source_catalog}
    source_by_id = {source["source_id"]: source for source in source_catalog}
    for event_id, wrapper in stores["event"].items():
        references = []
        package_key = wrapper["provenance"][0].get("package_key")
        recorded_references = {
            source_id_from(reference): reference
            for reference in wrapper["record"].get("source_refs") or []
        }
        for source_id in wrapper["source_ids"]:
            preferred = f"{package_key}:{source_id}" if package_key else None
            keys = source_variant_keys.get(source_id) or []
            current_source = source_by_id.get(source_id) or {}
            explicit_variant = (recorded_references.get(source_id) or {}).get("variant_key")
            if explicit_variant and explicit_variant not in keys:
                raise ValueError(f"Event {event_id} source {source_id} references unknown variant {explicit_variant}")
            if current_source.get("resolution") == "PROVENANCE_SCOPED_VARIANTS_REQUIRED" and not explicit_variant and preferred not in keys:
                raise ValueError(f"Event {event_id} must explicitly select a provenance variant for conflicted source {source_id}")
            variant_key = (
                explicit_variant
                if explicit_variant
                else keys[-1]
                if current_source.get("resolution") == "CANONICAL_UPDATE_CURRENT" and keys
                else preferred if preferred in keys
                else keys[-1] if keys
                else None
            )
            if not variant_key:
                raise ValueError(f"Event {event_id} source {source_id} has no provenance-scoped variant")
            references.append({"source_id": source_id, "variant_key": variant_key})
        chronology.append({
            "event_id": event_id,
            "event": copy.deepcopy(wrapper["record"]),
            "timeline": copy.deepcopy(wrapper["timeline"]),
            "source_ids": copy.deepcopy(wrapper["source_ids"]),
            "source_references": references,
            "actor_ids": copy.deepcopy(wrapper["actor_ids"]),
            "location_ids": copy.deepcopy(wrapper["location_ids"]),
            "claim_ids": copy.deepcopy(wrapper["claim_ids"]),
            "provenance": copy.deepcopy(wrapper["provenance"]),
            "revisions": copy.deepcopy(wrapper["revisions"]),
        })
    chronology.sort(key=lambda item: (str(item["timeline"].get("date") or ""), str(item["timeline"].get("time") or ""), item["event_id"]))

    current_cutoff = max(cutoff_candidates, key=lambda item: item[0])[1]
    input_files = [reader.files[path] for path in sorted(reader.files)]
    input_set_material = "".join(f"{item['path']}\0{item['sha256']}\n" for item in input_files).encode("utf-8")
    input_set_sha256 = sha256_bytes(input_set_material)
    protected_material = "".join(f"{item['path']}\0{item['sha256']}\n" for item in boundary["protected_files"]).encode("utf-8")
    protected_input_set_sha256 = sha256_bytes(protected_material)
    reader.verify_unchanged()

    report["derived_current_cutoff"] = current_cutoff
    report["derived_chronology_count"] = len(chronology)
    report["accepted_packet_count"] = len(accepted_updates)
    accepted_ledger_tip = authority.verify_accepted_lineage(manifest)
    state = {
        "schema_version": SCHEMA_VERSION,
        "artifact_role": "DERIVED_CANONICAL_CURRENT_ENTITY_STATE",
        "authority_notice": "Generated view only. The sealed migration inputs and accepted update packets remain authoritative.",
        "generator": {
            "version": GENERATOR_VERSION,
            "script_path": generator_path,
            "script_sha256": reader.digest(generator_path),
            "authority_path": authority_path,
            "authority_sha256": reader.digest(authority_path),
            "schema_paths": [{"path": path, "sha256": reader.digest(path)} for path in schema_paths],
        },
        "migration_boundary": {
            "accepted_phase3_head": manifest["migration_boundary"]["accepted_phase3_head"],
            "authority_genesis_commit": authority.PHASE35_AUTHORITY_GENESIS_COMMIT,
            "boundary_authority_sha256": authority.MIGRATION_BOUNDARY_SHA256,
            "actor_authority_sha256": authority.MIGRATION_ACTOR_REGISTRY_SHA256,
            "accepted_ledger_tip_sha256": accepted_ledger_tip,
            "manifest_path": MANIFEST_PATH,
            "manifest_sha256": reader.digest(MANIFEST_PATH),
            "sealed_inputs_path": manifest["migration_boundary"]["sealed_inputs"],
            "sealed_inputs_sha256": reader.digest(manifest["migration_boundary"]["sealed_inputs"]),
            "protected_input_set_sha256": protected_input_set_sha256,
            "protected_file_count": len(boundary["protected_files"]),
        },
        "release": {
            "current_osint_cutoff": current_cutoff,
            "current_osint_cutoff_display": cutoff_display(current_cutoff),
            "input_set_sha256": input_set_sha256,
            "canonical_state_identity": f"canonical-current-v1-{input_set_sha256[:16]}",
            "generated_timestamp_included": False,
        },
        "counts": {
            **{item["key"]: item["contribution"] for item in input_packages},
            "chronology_records": len(chronology),
            "accepted_update_packets": len(accepted_updates),
            "revision_records": len(revisions),
            "source_records": len(source_catalog),
            "actor_records": len(stores["actor"]),
            "location_records": len(stores["location"]),
            "claim_records": len(stores["claim"]),
            "material_loss_records": len(stores["material_loss"]),
            "relationship_records": len(relationships),
        },
        "input_packages": input_packages,
        "accepted_updates": accepted_updates,
        "input_files": input_files,
        "chronology": chronology,
        "sources": {
            "registry_path": registry_path,
            "registry_sha256": reader.digest(registry_path),
            "outlet_profiles": registry.get("outlet_profiles") or [],
            "records": source_catalog,
        },
        "entities": {
            "actors": [stores["actor"][key] for key in sorted(stores["actor"])],
            "locations": [stores["location"][key] for key in sorted(stores["location"])],
            "claims": [stores["claim"][key] for key in sorted(stores["claim"])],
            "material_losses": [stores["material_loss"][key] for key in sorted(stores["material_loss"])],
            "relationships": [relationships[key] for key in sorted(relationships)],
        },
        "revision_history": revisions,
        "integrity": {
            "serialization": "UTF-8 JSON; sorted object keys; two-space indentation; LF newline",
            "generated_timestamp_included": False,
            "duplicate_event_ids": len(chronology) - len({item["event_id"] for item in chronology}),
            "unresolved_references": [],
            "duplicate_collision_warnings": report["duplicate_collision_warnings"],
            "sealed_migration_inputs_modified": False,
            "accepted_packets_modified": False,
            "canonical_inputs_modified_by_generation": False,
        },
    }
    return state, report


def seal_migration_boundary(root: Path) -> bytes:
    raise ValueError("Migration boundary resealing is disabled after the Phase 3.5 authority anchor")


def register_packet(root: Path, packet_path: str) -> dict[str, Any]:
    relative = Path(packet_path).as_posix()
    relative_parts = Path(relative).parts
    if not relative.startswith("data/canonical-updates/") or not relative.endswith(".json") or ".." in relative_parts:
        raise ValueError("Accepted packets must be JSON files inside data/canonical-updates")
    path = root / relative
    if not path.is_file():
        raise ValueError(f"Packet file does not exist: {relative}")
    raw = canonical_input_bytes(path.read_bytes())
    packet = validate_packet_shape(json.loads(raw.decode("utf-8")), accepted=True)
    manifest_file = root / MANIFEST_PATH
    manifest = json.loads(canonical_input_bytes(manifest_file.read_bytes()).decode("utf-8"))
    authority.verify_static_authority(root, manifest)
    if any(item["packet_id"] == packet["packet_id"] or item["path"] == relative for item in manifest.get("accepted_updates") or []):
        raise ValueError(f"Packet is already registered: {packet['packet_id']}")
    # Validate the currently accepted state before considering an extension.
    build_state(root)
    accepted = manifest.setdefault("accepted_updates", [])
    if accepted:
        last_known_at = parse_datetime(accepted[-1]["known_at"], "last accepted packet known_at")
        candidate_known_at = parse_datetime(packet["known_at"], f"packet {packet['packet_id']} known_at")
        if candidate_known_at <= last_known_at:
            raise ValueError(f"Packet {packet['packet_id']} known_at must be strictly later than the last accepted packet")
        previous_lineage = accepted[-1]["lineage_sha256"]
    else:
        previous_lineage = authority.ACCEPTED_LEDGER_GENESIS_SHA256
    entry = authority.make_accepted_entry(packet["packet_id"], relative, sha256_bytes(raw), packet["known_at"], previous_lineage)
    candidate_manifest = copy.deepcopy(manifest)
    candidate_manifest["accepted_updates"].append(entry)
    authority.require_exact_prefix(manifest, candidate_manifest)
    # Compile the complete resulting manifest before any write. A duplicate,
    # stale value, bad reference, ordering defect, or altered lineage leaves
    # both the manifest and generated current-state artifact untouched.
    build_state(root, manifest_override=candidate_manifest)
    temporary_manifest = manifest_file.with_suffix(".json.tmp")
    temporary_manifest.write_bytes(canonical_json_bytes(candidate_manifest))
    temporary_manifest.replace(manifest_file)
    return entry


def format_report(report: dict[str, Any]) -> str:
    return json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT), help="Repository root")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Generated canonical current-state artifact")
    parser.add_argument("--check", action="store_true", help="Fail if the generated canonical state is stale")
    parser.add_argument("--preview", metavar="PACKET", help="Validate and dry-run one unregistered packet without writing state")
    parser.add_argument("--validate-packet", metavar="PACKET", help="Validate one packet against accepted state without writing")
    parser.add_argument("--register", metavar="PACKET", help="Append an already approved ACCEPTED packet to the manifest")
    parser.add_argument("--seal-migration-boundary", action="store_true", help="Retired command; always refuses because the Phase 3.5 authority seal is anchored")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    if args.seal_migration_boundary:
        serialized = seal_migration_boundary(root)
        print(f"canonical-boundary: sealed {len(json.loads(serialized)['protected_files'])} inherited files")
        return 0
    if args.register:
        entry = register_packet(root, args.register)
        print(f"canonical-update: registered {entry['packet_id']} ({entry['sha256']})")
        return 0
    proposed: list[tuple[str, dict[str, Any]]] = []
    packet_path = args.preview or args.validate_packet
    if packet_path:
        path = root / packet_path
        packet = json.loads(canonical_input_bytes(path.read_bytes()).decode("utf-8"))
        proposed.append((Path(packet_path).as_posix(), packet))
    try:
        state, report = build_state(root, proposed)
    except ValueError as exc:
        if args.preview:
            message = str(exc)
            unresolved_references: list[str] = []
            unresolved_prefix = "Unresolved canonical references: "
            if message.startswith(unresolved_prefix):
                try:
                    unresolved_references = list(ast.literal_eval(message[len(unresolved_prefix):]))
                except (SyntaxError, ValueError, TypeError):
                    unresolved_references = []
            print(format_report({
                "status": "FAIL",
                "errors": [{"type": type(exc).__name__, "message": message}],
                "unresolved_references": unresolved_references,
            }))
            print(f"canonical-update: FAIL - {packet_path} did not validate; no files written")
            return 1
        raise
    if packet_path:
        print(format_report(report))
        print(f"canonical-update: PASS - {packet_path} is valid against accepted state; no files written")
        return 0
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    serialized = canonical_json_bytes(state)
    if args.check:
        if not output.is_file() or output.read_bytes() != serialized:
            raise SystemExit(f"FAIL: generated canonical current state is missing or stale: {output}")
        print(f"canonical-current-state: PASS - {state['counts']['chronology_records']} events; artifact is current")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(f"canonical-current-state: wrote {output.relative_to(root).as_posix()} with {state['counts']['chronology_records']} events at {state['release']['current_osint_cutoff']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
