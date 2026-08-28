#!/usr/bin/env python3
"""Immutable authority anchors and append-only lineage rules for Phase 3.5."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
from typing import Any


ACCEPTED_PHASE3_HEAD = "b6dabf7d9dc346a81afc9ba4a9074c481e70e02a"
PHASE35_AUTHORITY_GENESIS_COMMIT = "240f2b92639d28cb1f669526c5b4a3c3a00b6d47"
MIGRATION_BOUNDARY_PATH = "data/canonical-ledger/migration-boundary.json"
MIGRATION_ACTOR_REGISTRY_PATH = "data/canonical-ledger/migration-actors.json"
MIGRATION_BOUNDARY_SHA256 = "11dfdeb04f2116e244f2a32419f556fbf7a4d29f878878ff6f11f8fb3336f192"
MIGRATION_ACTOR_REGISTRY_SHA256 = "3b20c673812c5d972a0571c012caace1b061f065076946fa9303c892dbda6509"
MANIFEST_AUTHORITY_SHA256 = "acaccd63b1af7e673ff3aa02affd6bf7272ca7d12cc5a3ba560469919da2869d"
ACCEPTED_LEDGER_GENESIS_SHA256 = "dc525326b14354eb73cf9f48d7f269b39a55b9eb03c2f8b9690d347c2a80ec96"
ACCEPTED_ENTRY_FIELDS = {
    "packet_id",
    "path",
    "sha256",
    "known_at",
    "previous_lineage_sha256",
    "lineage_sha256",
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


def manifest_authority_payload(manifest: dict[str, Any]) -> dict[str, Any]:
    payload = copy.deepcopy(manifest)
    payload["accepted_updates"] = []
    return payload


def verify_manifest_authority(manifest: dict[str, Any]) -> None:
    if manifest.get("migration_boundary", {}).get("accepted_phase3_head") != ACCEPTED_PHASE3_HEAD:
        raise ValueError("Canonical manifest attempts to redefine the accepted Phase 3 HEAD")
    digest = sha256_bytes(canonical_json_bytes(manifest_authority_payload(manifest)))
    if digest != MANIFEST_AUTHORITY_SHA256:
        raise ValueError("Canonical manifest authority fields differ from the immutable Phase 3.5 authority anchor")


def lineage_material(entry: dict[str, Any]) -> bytes:
    return canonical_json_bytes({
        "known_at": entry["known_at"],
        "packet_id": entry["packet_id"],
        "path": entry["path"],
        "previous_lineage_sha256": entry["previous_lineage_sha256"],
        "sha256": entry["sha256"],
    })


def make_accepted_entry(packet_id: str, path: str, packet_sha256: str, known_at: str, previous_lineage_sha256: str) -> dict[str, Any]:
    entry = {
        "packet_id": packet_id,
        "path": path,
        "sha256": packet_sha256,
        "known_at": known_at,
        "previous_lineage_sha256": previous_lineage_sha256,
    }
    entry["lineage_sha256"] = sha256_bytes(lineage_material(entry))
    return entry


def verify_accepted_lineage(manifest: dict[str, Any]) -> str:
    entries = manifest.get("accepted_updates")
    if not isinstance(entries, list):
        raise ValueError("Canonical manifest accepted_updates must be an array")
    previous = ACCEPTED_LEDGER_GENESIS_SHA256
    for sequence, entry in enumerate(entries, start=1):
        if not isinstance(entry, dict) or set(entry) != ACCEPTED_ENTRY_FIELDS:
            raise ValueError(f"Accepted update entry {sequence} does not have the immutable lineage fields")
        if entry.get("previous_lineage_sha256") != previous:
            raise ValueError(f"Accepted update entry {sequence} breaks the append-only lineage chain")
        expected = sha256_bytes(lineage_material(entry))
        if entry.get("lineage_sha256") != expected:
            raise ValueError(f"Accepted update entry {sequence} has an invalid lineage digest")
        previous = expected
    return previous


def verify_static_authority(root: Path, manifest: dict[str, Any]) -> None:
    verify_manifest_authority(manifest)
    boundary_path = root / MIGRATION_BOUNDARY_PATH
    actor_path = root / MIGRATION_ACTOR_REGISTRY_PATH
    if sha256_bytes(canonical_input_bytes(boundary_path.read_bytes())) != MIGRATION_BOUNDARY_SHA256:
        raise ValueError("Migration boundary differs from the independently pinned Phase 3.5 authority digest")
    if sha256_bytes(canonical_input_bytes(actor_path.read_bytes())) != MIGRATION_ACTOR_REGISTRY_SHA256:
        raise ValueError("Migration actor authority differs from the independently pinned Phase 3.5 digest")
    verify_accepted_lineage(manifest)


def require_exact_prefix(previous: dict[str, Any], current: dict[str, Any]) -> None:
    verify_manifest_authority(previous)
    verify_manifest_authority(current)
    verify_accepted_lineage(previous)
    verify_accepted_lineage(current)
    prior_entries = previous.get("accepted_updates") or []
    current_entries = current.get("accepted_updates") or []
    if len(current_entries) < len(prior_entries) or current_entries[:len(prior_entries)] != prior_entries:
        raise ValueError("Accepted update history was rewritten; the prior sequence must remain an exact prefix")
