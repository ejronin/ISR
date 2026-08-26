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

    if overlay_manifests:
        _, latest_path, latest_manifest = max(overlay_manifests, key=lambda row: row[0])
        current_cutoff = latest_manifest.get("collection_cutoff") or latest_manifest.get("created_at")
        current_count = latest_manifest.get("counts", {}).get("current_chronology_records")
        current_layer = str(latest_path.parent.relative_to(root))
    else:
        current_cutoff = historical_cutoff
        current_count = historical_manifest.get("counts", {}).get("timeline_records")
        current_layer = "data/integration-v1.2"

    payload = {
        "canonical_url": "https://ejronin.github.io/ISR/",
        "commit_sha": args.commit,
        "ledger_version": f"integration-v{historical_manifest['schema_version']}",
        "collection_cutoff": current_cutoff,
        "current_review_cutoff": current_cutoff,
        "current_chronology_records": current_count,
        "current_layer": current_layer,
        "historical_ledger_cutoff": historical_cutoff,
        "authoritative_json_sha256": hashes,
        "current_overlay_manifest_sha256": overlay_hashes,
    }

    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
