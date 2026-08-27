#!/usr/bin/env python3
"""Write the machine-readable deployment identity for the static atlas."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime
from pathlib import Path


def parse_cutoff(value: str) -> datetime:
    return datetime.fromisoformat(value)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="build-info.json")
    parser.add_argument("--commit", required=True)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    ledger = root / "data" / "integration-v1.2"
    historical_manifest = json.loads((ledger / "manifest.json").read_text(encoding="utf-8"))
    historical_cutoff = historical_manifest["collection_cutoff"]

    hashes = {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(ledger.glob("*.json"))
    }

    overlay_manifests = []
    overlay_hashes = {}
    for path in sorted((root / "data").glob("current-update-*/manifest.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        cutoff = payload.get("collection_cutoff") or payload.get("created_at")
        if not cutoff:
            continue
        overlay_manifests.append((parse_cutoff(cutoff), path, payload))
        overlay_hashes[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()

    latest_manifest = None
    if overlay_manifests:
        latest_dt, latest_path, latest_manifest = max(overlay_manifests, key=lambda row: row[0])
        current_cutoff = latest_manifest.get("collection_cutoff") or latest_manifest.get("created_at")
        current_count = latest_manifest.get("counts", {}).get("current_chronology_records")
        current_layer = str(latest_path.parent.relative_to(root))
    else:
        latest_dt = parse_cutoff(historical_cutoff)
        current_cutoff = historical_cutoff
        current_count = historical_manifest.get("counts", {}).get("timeline_records")
        current_layer = "data/integration-v1.2"

    reconciliation_dir = root / "data" / "wiki-map-reconciliation-20260826"
    reconciliation_manifest_path = reconciliation_dir / "manifest.json"
    reconciliation_layer = None
    reconciliation_records = 0
    reconciliation_hashes = {}
    reconciliation_already_included = False
    if reconciliation_manifest_path.exists():
        reconciliation_manifest = json.loads(reconciliation_manifest_path.read_text(encoding="utf-8"))
        reconciliation_records = int(reconciliation_manifest.get("counts", {}).get("accepted_or_corrected_events") or 0)
        reconciliation_layer = str(reconciliation_dir.relative_to(root))
        recon_cutoff = reconciliation_manifest.get("collection_cutoff") or reconciliation_manifest.get("created_at")
        if recon_cutoff and parse_cutoff(recon_cutoff) > latest_dt:
            current_cutoff = recon_cutoff
        depends_on = (latest_manifest or {}).get("depends_on") or {}
        reconciliation_already_included = depends_on.get("package") == "ISR-WIKI-MAP-RECONCILIATION-20260826"
        if current_count is not None and not reconciliation_already_included:
            current_count = int(current_count) + reconciliation_records
        for path in sorted(reconciliation_dir.glob("*.json")):
            reconciliation_hashes[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()

    payload = {
        "canonical_url": "https://ejronin.github.io/ISR/",
        "commit_sha": args.commit,
        "ledger_version": f"integration-v{historical_manifest['schema_version']}",
        "collection_cutoff": current_cutoff,
        "current_review_cutoff": current_cutoff,
        "current_chronology_records": current_count,
        "current_layer": current_layer,
        "historical_ledger_cutoff": historical_cutoff,
        "historical_reconciliation_layer": reconciliation_layer,
        "historical_reconciliation_records": reconciliation_records,
        "historical_reconciliation_included_in_current_count": reconciliation_already_included,
        "authoritative_json_sha256": hashes,
        "current_overlay_manifest_sha256": overlay_hashes,
        "historical_reconciliation_sha256": reconciliation_hashes,
    }

    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
