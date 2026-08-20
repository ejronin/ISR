#!/usr/bin/env python3
"""Write the machine-readable deployment identity for the static atlas."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="build-info.json")
    parser.add_argument("--commit", required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    ledger = root / "data" / "integration-v1.2"
    manifest = json.loads((ledger / "manifest.json").read_text(encoding="utf-8"))
    hashes = {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(ledger.glob("*.json"))
    }
    payload = {
        "canonical_url": "https://ejronin.github.io/ISR/",
        "commit_sha": args.commit,
        "ledger_version": f"integration-v{manifest['schema_version']}",
        "collection_cutoff": manifest["collection_cutoff"],
        "authoritative_json_sha256": hashes,
    }
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
