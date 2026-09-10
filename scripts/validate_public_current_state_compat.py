#!/usr/bin/env python3
"""Validate a legacy public-v1 projection at an explicit compatibility path.

The current release artifact is schema v2 and lives at data/public-current-state.json.
This validator preserves the full legacy semantic/determinism checks without ever
requiring that release-facing path to contain schema v1.
"""
from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path

import build_public_current_state as builder
import validate_public_current_state as legacy

ROOT = Path(__file__).resolve().parents[1]


def resolve(root: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else root / path


def validate(artifact: Path, root: Path = ROOT) -> None:
    root = Path(root).resolve()
    artifact = artifact.resolve()
    canonical_path = root / builder.CANONICAL_STATE_PATH
    schema_path = root / "schemas/public-current-state-v1.json"

    # The imported legacy validator predates configurable roots. Point its helper
    # functions at the same explicit repository root before reusing them.
    legacy.ROOT = root

    legacy.require(artifact.is_file(), f"generated compatibility artifact missing: {artifact}")
    legacy.require(canonical_path.is_file(), f"generated canonical state missing: {builder.CANONICAL_STATE_PATH}")
    legacy.require(schema_path.is_file(), "public current-state v1 schema is missing")
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    legacy.require(
        schema.get("$id") == "https://ejronin.github.io/ISR/schemas/public-current-state-v1.json",
        "schema identity mismatch",
    )

    payload = json.loads(artifact.read_text(encoding="utf-8"))
    canonical = json.loads(canonical_path.read_text(encoding="utf-8"))
    input_paths = [root / item["path"] for item in payload.get("input_files") or []]
    before = {path: legacy.raw_sha256(path) for path in input_paths}

    with tempfile.TemporaryDirectory(prefix="atlas-public-v1-verify-") as temporary:
        first = builder.generate(root, Path(temporary) / "first.json")
        second = builder.generate(root, Path(temporary) / "second.json")
        legacy.require(
            first == second == artifact.read_bytes(),
            "legacy compatibility generation is not byte-for-byte deterministic/current",
        )

    legacy.require(
        before == {path: legacy.raw_sha256(path) for path in input_paths},
        "legacy compatibility generation modified an input",
    )
    legacy.validate_payload(payload, canonical)
    legacy.validate_references_and_views(payload)
    legacy.validate_facility_and_imagery_parity(payload)

    integrity = payload.get("integrity") or {}
    legacy.require(integrity.get("canonical_inputs_modified") is False, "artifact reports canonical input mutation")
    legacy.require(integrity.get("generated_timestamp_included") is False, "artifact contains a generated timestamp")
    legacy.require(integrity.get("canonical_state_stale") is False, "artifact reports stale canonical state")
    legacy.require(integrity.get("browser_replays_update_packets") is False, "artifact reports browser update replay")
    legacy.require(integrity.get("facility_preservation_contract_satisfied") is True, "artifact reports a broken facility preservation contract")
    legacy.require(integrity.get("unresolved_bda_facility_refs") == [], "artifact reports dangling BDA facility references")
    legacy.require(integrity.get("unresolved_facility_claim_audit_refs") == [], "artifact reports dangling facility claim-audit references")

    print(
        "public-v1-compat validation: PASS - "
        f"{payload['counts']['chronology_records']} chronology records; "
        f"{payload['counts']['canonical_source_records']} sources; "
        "isolated artifact deterministic and semantically qualified"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--artifact", required=True, help="Explicit legacy compatibility artifact; must not be the current public-state path")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    artifact = resolve(root, args.artifact).resolve()
    current = (root / builder.DEFAULT_OUTPUT).resolve()
    if artifact == current:
        raise SystemExit("FAIL: legacy compatibility validation may not target data/public-current-state.json")
    validate(artifact, root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
