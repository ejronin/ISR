#!/usr/bin/env python3
"""Production Gate 3 v2 accepted-packet registration and lineage authority."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    import jsonschema
except ImportError as exc:  # pragma: no cover - CI installs requirements-build.txt
    jsonschema = None
    _JSONSCHEMA_IMPORT_ERROR = exc
else:
    _JSONSCHEMA_IMPORT_ERROR = None

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = "data/canonical-ledger/manifest-v2.json"
MANIFEST_SCHEMA_PATH = "schemas/canonical-ledger-manifest-v2.json"
PACKET_SCHEMA_PATH = "schemas/canonical-update-packet-v2.json"

LINEAGE_VERSION = "1.0"
MANIFEST_AUTHORITY_SHA256 = "85d8dee3d6465e3cd7bf31a6d8df3c6b871ab3dddde3522083a1b8d8f3a80ae4"
ACCEPTED_LEDGER_GENESIS_SHA256 = "25952a5181f9f355c347e7c5b8b76d3b2fea0e4a1c04211b4121cbb72deebb07"
MIGRATED_ACCEPTED_PREFIX_LENGTH = 5
MIGRATED_ACCEPTED_PREFIX_TIP_SHA256 = "604bd8e4922325e751b7d7fd460883ec9b7b5d6ffd4f131bfae0631834d3d1e3"

LEGACY_ACCEPTANCE_BASIS = "LEGACY_MANIFEST_ACCEPTED_PRE_REGISTRAR"
REGISTERED_ACCEPTANCE_BASIS = "PACKET_STATUS_ACCEPTED"

STATIC_AUTHORITY_FIELDS = (
    "schema_version",
    "artifact_role",
    "base_manifest",
    "gate2_evidence_cutoff",
    "lineage_version",
)


def canonical_input_bytes(value: bytes) -> bytes:
    """Normalize packet bytes exactly as the Gate 3 v2 consumer does."""
    text = value.decode("utf-8")
    return text.replace("\r\n", "\n").encode("utf-8")


def canonical_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def parse_datetime(value: str, label: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} must be an ISO-8601 timestamp with offset") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"{label} must include an explicit UTC offset")
    return parsed


def _load_json(path: Path, label: str) -> dict[str, Any]:
    try:
        return json.loads(canonical_input_bytes(path.read_bytes()).decode("utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"{label} does not exist: {path}") from exc
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"{label} is malformed JSON: {path}") from exc


def _schema_validate(root: Path, value: dict[str, Any], schema_path: str, label: str) -> None:
    if jsonschema is None:
        raise RuntimeError("jsonschema is required for Gate 3 v2 authority validation") from _JSONSCHEMA_IMPORT_ERROR
    schema = _load_json(root / schema_path, f"{label} schema")
    validator = jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker())
    errors = sorted(validator.iter_errors(value), key=lambda err: list(err.absolute_path))
    if errors:
        first = errors[0]
        location = ".".join(str(part) for part in first.absolute_path) or "<root>"
        raise ValueError(f"{label} schema validation failed at {location}: {first.message}")


def validate_packet_schema(root: Path, packet: dict[str, Any], *, require_accepted_status: bool) -> None:
    _schema_validate(root, packet, PACKET_SCHEMA_PATH, "Gate 3 v2 packet")
    known_at = parse_datetime(packet["known_at"], "packet known_at")
    evidence_cutoff = parse_datetime(packet["evidence_cutoff"], "packet evidence_cutoff")
    if evidence_cutoff > known_at:
        raise ValueError("packet evidence_cutoff may not be later than packet known_at")
    if require_accepted_status and packet.get("status") != "ACCEPTED":
        raise ValueError("Gate 3 v2 registration requires packet status ACCEPTED")


def static_authority_payload(manifest: dict[str, Any]) -> dict[str, Any]:
    return {field: manifest.get(field) for field in STATIC_AUTHORITY_FIELDS}


def lineage_material(entry: dict[str, Any]) -> bytes:
    return canonical_json_bytes({
        "sequence": entry["sequence"],
        "packet_id": entry["packet_id"],
        "path": entry["path"],
        "sha256": entry["sha256"],
        "known_at": entry["known_at"],
        "evidence_cutoff": entry["evidence_cutoff"],
        "acceptance_basis": entry["acceptance_basis"],
        "previous_lineage_sha256": entry["previous_lineage_sha256"],
    })


def make_accepted_entry(
    sequence: int,
    packet_id: str,
    path: str,
    packet_sha256: str,
    known_at: str,
    evidence_cutoff: str,
    previous_lineage_sha256: str,
    acceptance_basis: str = REGISTERED_ACCEPTANCE_BASIS,
) -> dict[str, Any]:
    entry = {
        "sequence": sequence,
        "packet_id": packet_id,
        "path": path,
        "sha256": packet_sha256,
        "known_at": known_at,
        "evidence_cutoff": evidence_cutoff,
        "acceptance_basis": acceptance_basis,
        "previous_lineage_sha256": previous_lineage_sha256,
    }
    entry["lineage_sha256"] = sha256_bytes(lineage_material(entry))
    return entry


def verify_static_authority(manifest: dict[str, Any]) -> None:
    digest = sha256_bytes(canonical_json_bytes(static_authority_payload(manifest)))
    if digest != MANIFEST_AUTHORITY_SHA256:
        raise ValueError("Gate 3 v2 manifest static authority fields differ from the pinned authority anchor")
    if manifest.get("manifest_authority_sha256") != MANIFEST_AUTHORITY_SHA256:
        raise ValueError("Gate 3 v2 manifest authority digest is missing or incorrect")
    if manifest.get("lineage_genesis_sha256") != ACCEPTED_LEDGER_GENESIS_SHA256:
        raise ValueError("Gate 3 v2 manifest lineage genesis is missing or incorrect")


def verify_lineage(manifest: dict[str, Any]) -> str:
    entries = manifest.get("accepted_updates")
    if not isinstance(entries, list):
        raise ValueError("Gate 3 v2 accepted_updates must be an array")
    if len(entries) < MIGRATED_ACCEPTED_PREFIX_LENGTH:
        raise ValueError("Gate 3 v2 manifest removed part of the pinned pre-registrar accepted prefix")

    previous = ACCEPTED_LEDGER_GENESIS_SHA256
    packet_ids: set[str] = set()
    paths: set[str] = set()
    prior_known_at: datetime | None = None
    prior_cutoff: datetime | None = None
    for sequence, entry in enumerate(entries, start=1):
        if entry.get("sequence") != sequence:
            raise ValueError("Gate 3 v2 accepted packet sequence is not contiguous")
        packet_id = entry.get("packet_id")
        path = entry.get("path")
        if packet_id in packet_ids:
            raise ValueError(f"Gate 3 v2 manifest repeats packet_id {packet_id}")
        if path in paths:
            raise ValueError(f"Gate 3 v2 manifest repeats packet path {path}")
        packet_ids.add(packet_id)
        paths.add(path)
        expected_basis = LEGACY_ACCEPTANCE_BASIS if sequence <= MIGRATED_ACCEPTED_PREFIX_LENGTH else REGISTERED_ACCEPTANCE_BASIS
        if entry.get("acceptance_basis") != expected_basis:
            raise ValueError(f"Gate 3 v2 accepted entry {sequence} has an invalid acceptance basis")
        if entry.get("previous_lineage_sha256") != previous:
            raise ValueError(f"Gate 3 v2 accepted entry {sequence} breaks the prior-lineage chain")
        expected = sha256_bytes(lineage_material(entry))
        if entry.get("lineage_sha256") != expected:
            raise ValueError(f"Gate 3 v2 accepted entry {sequence} has an invalid resulting-lineage digest")
        known_at = parse_datetime(entry["known_at"], f"accepted entry {sequence} known_at")
        cutoff = parse_datetime(entry["evidence_cutoff"], f"accepted entry {sequence} evidence_cutoff")
        if prior_known_at is not None and known_at <= prior_known_at:
            raise ValueError("Gate 3 v2 accepted known_at values must increase strictly")
        if prior_cutoff is not None and cutoff < prior_cutoff:
            raise ValueError("Gate 3 v2 evidence cutoff may not move backward")
        if cutoff > known_at:
            raise ValueError("Gate 3 v2 accepted evidence cutoff may not be later than known_at")
        prior_known_at = known_at
        prior_cutoff = cutoff
        previous = expected
        if sequence == MIGRATED_ACCEPTED_PREFIX_LENGTH and previous != MIGRATED_ACCEPTED_PREFIX_TIP_SHA256:
            raise ValueError("Gate 3 v2 pre-registrar accepted prefix differs from the independently pinned migration tip")

    expected_current = entries[-1]["evidence_cutoff"]
    if manifest.get("current_evidence_cutoff") != expected_current:
        raise ValueError("Gate 3 v2 current_evidence_cutoff must derive from the accepted lineage tip")
    if parse_datetime(manifest["current_evidence_cutoff"], "current evidence cutoff") < parse_datetime(manifest["gate2_evidence_cutoff"], "Gate 2 evidence cutoff"):
        raise ValueError("Gate 3 v2 current evidence cutoff may not precede the frozen Gate 2 boundary")
    return previous


def verify_manifest(root: Path, manifest: dict[str, Any] | None = None, *, verify_packet_bytes: bool = True) -> str:
    root = Path(root).resolve()
    if manifest is None:
        manifest = _load_json(root / MANIFEST_PATH, "Gate 3 v2 manifest")
    _schema_validate(root, manifest, MANIFEST_SCHEMA_PATH, "Gate 3 v2 manifest")
    verify_static_authority(manifest)
    tip = verify_lineage(manifest)
    if not verify_packet_bytes:
        return tip
    for entry in manifest["accepted_updates"]:
        path = root / entry["path"]
        try:
            raw = canonical_input_bytes(path.read_bytes())
        except FileNotFoundError as exc:
            raise ValueError(f"Accepted Gate 3 v2 packet is missing: {entry['path']}") from exc
        if sha256_bytes(raw) != entry["sha256"]:
            raise ValueError(f"Accepted Gate 3 v2 packet hash mismatch: {entry['path']}")
        try:
            packet = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Accepted Gate 3 v2 packet is malformed JSON: {entry['path']}") from exc
        validate_packet_schema(root, packet, require_accepted_status=entry["acceptance_basis"] == REGISTERED_ACCEPTANCE_BASIS)
        if packet["packet_id"] != entry["packet_id"]:
            raise ValueError(f"Accepted Gate 3 v2 packet ID/path mismatch: {entry['path']}")
        if packet["known_at"] != entry["known_at"]:
            raise ValueError(f"Accepted Gate 3 v2 packet known_at differs from manifest: {entry['packet_id']}")
        if packet["evidence_cutoff"] != entry["evidence_cutoff"]:
            raise ValueError(f"Accepted Gate 3 v2 packet evidence_cutoff differs from manifest: {entry['packet_id']}")
    return tip


def require_exact_prefix(previous: dict[str, Any], current: dict[str, Any]) -> None:
    verify_static_authority(previous)
    verify_static_authority(current)
    verify_lineage(previous)
    verify_lineage(current)
    prior = previous["accepted_updates"]
    candidate = current["accepted_updates"]
    if len(candidate) != len(prior) + 1:
        raise ValueError("Gate 3 v2 registration must append exactly one accepted entry")
    if candidate[: len(prior)] != prior:
        raise ValueError("Gate 3 v2 prior accepted history must remain an exact prefix")


def _normalize_packet_path(packet_path: str) -> str:
    relative = Path(packet_path).as_posix()
    parts = Path(relative).parts
    if not relative.startswith("data/canonical-updates/") or not relative.endswith(".json") or ".." in parts:
        raise ValueError("Gate 3 v2 packets must be JSON files inside data/canonical-updates")
    return relative


def _atomic_replace(source: Path, destination: Path) -> None:
    os.replace(source, destination)


def register_v2_packet(root: Path, packet_path: str) -> dict[str, Any]:
    """Append one reviewed/accepted v2 packet after validating the full candidate state."""
    root = Path(root).resolve()
    relative = _normalize_packet_path(packet_path)
    packet_file = root / relative
    if not packet_file.is_file():
        raise ValueError(f"Gate 3 v2 packet file does not exist: {relative}")
    try:
        raw = canonical_input_bytes(packet_file.read_bytes())
        packet = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"Gate 3 v2 packet is malformed JSON: {relative}") from exc
    validate_packet_schema(root, packet, require_accepted_status=True)

    manifest_file = root / MANIFEST_PATH
    manifest_bytes_before = manifest_file.read_bytes()
    manifest = _load_json(manifest_file, "Gate 3 v2 manifest")
    accepted = manifest.get("accepted_updates") or []
    if any(entry.get("packet_id") == packet["packet_id"] for entry in accepted):
        raise ValueError(f"Gate 3 v2 packet_id is already registered: {packet['packet_id']}")
    if any(entry.get("path") == relative for entry in accepted):
        raise ValueError(f"Gate 3 v2 packet path is already registered: {relative}")

    current_tip = verify_manifest(root, manifest)
    candidate_known_at = parse_datetime(packet["known_at"], "candidate packet known_at")
    candidate_cutoff = parse_datetime(packet["evidence_cutoff"], "candidate packet evidence_cutoff")
    last_known_at = parse_datetime(accepted[-1]["known_at"], "accepted tip known_at")
    current_cutoff = parse_datetime(manifest["current_evidence_cutoff"], "current evidence cutoff")
    if candidate_known_at <= last_known_at:
        raise ValueError("Gate 3 v2 packet known_at must be strictly later than the accepted tip")
    if candidate_cutoff < current_cutoff:
        raise ValueError("Gate 3 v2 packet evidence_cutoff may not move backward")

    entry = make_accepted_entry(
        len(accepted) + 1,
        packet["packet_id"],
        relative,
        sha256_bytes(raw),
        packet["known_at"],
        packet["evidence_cutoff"],
        current_tip,
    )
    candidate_manifest = copy.deepcopy(manifest)
    candidate_manifest["accepted_updates"].append(entry)
    candidate_manifest["current_evidence_cutoff"] = packet["evidence_cutoff"]
    require_exact_prefix(manifest, candidate_manifest)
    verify_manifest(root, candidate_manifest)

    # Exercise the real Gate 3 v2 consumer against the candidate manifest before
    # granting authority. This is production code; tests call this same function.
    import build_canonical_current_state_v2 as gate3_core

    candidate_manifest_file = manifest_file.with_name(".manifest-v2.registration-candidate.json")
    previous_manifest_path = gate3_core.MANIFEST
    try:
        candidate_manifest_file.write_bytes(canonical_json_bytes(candidate_manifest))
        gate3_core.MANIFEST = candidate_manifest_file.relative_to(root).as_posix()
        gate3_core.build_state(root)
    finally:
        gate3_core.MANIFEST = previous_manifest_path
        if candidate_manifest_file.exists():
            candidate_manifest_file.unlink()

    temporary = manifest_file.with_name(manifest_file.name + ".tmp")
    try:
        temporary.write_bytes(canonical_json_bytes(candidate_manifest))
        _atomic_replace(temporary, manifest_file)
    except Exception:
        if temporary.exists():
            temporary.unlink()
        if manifest_file.read_bytes() != manifest_bytes_before:
            manifest_file.write_bytes(manifest_bytes_before)
        raise
    return entry


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--register", metavar="PACKET", help="Register one reviewed ACCEPTED Gate 3 v2 packet")
    parser.add_argument("--verify", action="store_true", help="Verify manifest lineage and every accepted packet")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    if args.register:
        entry = register_v2_packet(root, args.register)
        print(f"gate3-v2-registration: registered {entry['packet_id']} sequence={entry['sequence']} lineage={entry['lineage_sha256']}")
        return 0
    if args.verify:
        tip = verify_manifest(root)
        print(f"gate3-v2-registration: PASS tip={tip}")
        return 0
    parser.error("choose --register PACKET or --verify")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
