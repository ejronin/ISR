#!/usr/bin/env python3
"""Write machine-readable deployment identity from canonical current state."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="build-info.json")
    parser.add_argument("--commit", required=True)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    ledger = root / "data/integration-v1.2"
    historical_manifest = json.loads((ledger / "manifest.json").read_text(encoding="utf-8"))
    canonical_path = root / "data/canonical-current-state.json"
    if not canonical_path.is_file():
        raise SystemExit("canonical current state is missing; run build_canonical_current_state.py first")
    canonical = json.loads(canonical_path.read_text(encoding="utf-8"))
    if canonical.get("artifact_role") != "DERIVED_CANONICAL_CURRENT_ENTITY_STATE":
        raise SystemExit("canonical current-state artifact role is invalid")

    authoritative_hashes = {path.name: file_hash(path) for path in sorted(ledger.glob("*.json"))}
    overlay_hashes = {
        path.relative_to(root).as_posix(): file_hash(path)
        for path in sorted((root / "data").glob("current-update-*/manifest.json"))
    }
    reconciliation_dir = root / "data/wiki-map-reconciliation-20260826"
    reconciliation_manifest = json.loads((reconciliation_dir / "manifest.json").read_text(encoding="utf-8"))
    reconciliation_hashes = {
        path.relative_to(root).as_posix(): file_hash(path)
        for path in sorted(reconciliation_dir.glob("*.json"))
    }
    accepted_update_hashes = {
        item["path"]: item["sha256"]
        for item in canonical.get("accepted_updates") or []
    }

    current_cutoff = canonical["release"]["current_osint_cutoff"]
    current_count = canonical["counts"]["chronology_records"]
    payload = {
        "canonical_url": "https://ejronin.github.io/ISR/",
        "commit_sha": args.commit,
        "ledger_version": f"integration-v{historical_manifest['schema_version']}",
        "collection_cutoff": current_cutoff,
        "current_review_cutoff": current_cutoff,
        "current_chronology_records": current_count,
        "current_layer": canonical_path.relative_to(root).as_posix(),
        "canonical_state_identity": canonical["release"]["canonical_state_identity"],
        "canonical_state_sha256": file_hash(canonical_path),
        "canonical_input_set_sha256": canonical["release"]["input_set_sha256"],
        "canonical_migration_head": canonical["migration_boundary"]["accepted_phase3_head"],
        "accepted_update_packets": len(canonical.get("accepted_updates") or []),
        "accepted_update_packet_sha256": accepted_update_hashes,
        "historical_ledger_cutoff": historical_manifest["collection_cutoff"],
        "historical_reconciliation_layer": reconciliation_dir.relative_to(root).as_posix(),
        "historical_reconciliation_records": int(reconciliation_manifest.get("counts", {}).get("accepted_or_corrected_events") or 0),
        "historical_reconciliation_included_in_current_count": True,
        "authoritative_json_sha256": authoritative_hashes,
        "current_overlay_manifest_sha256": overlay_hashes,
        "historical_reconciliation_sha256": reconciliation_hashes,
    }

    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
