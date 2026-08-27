#!/usr/bin/env python3
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_CUTOFF = "2026-08-27T08:25:00-04:00"
EXPECTED_COUNT = 205
EXPECTED_LAYER = "data/current-update-20260827"
EXPECTED_RECON_LAYER = "data/wiki-map-reconciliation-20260826"
HISTORICAL_MANIFEST = json.loads((ROOT / "data/integration-v1.2/manifest.json").read_text(encoding="utf-8"))

with tempfile.TemporaryDirectory() as td:
    out = Path(td) / "build-info.json"
    subprocess.run([
        sys.executable,
        str(ROOT / "scripts/write_build_info.py"),
        "--output", str(out),
        "--commit", "TEST-COMMIT",
    ], cwd=ROOT, check=True)
    payload = json.loads(out.read_text(encoding="utf-8"))

assert payload["commit_sha"] == "TEST-COMMIT"
assert payload["collection_cutoff"] == EXPECTED_CUTOFF
assert payload["current_review_cutoff"] == EXPECTED_CUTOFF
assert payload["current_chronology_records"] == EXPECTED_COUNT
assert payload["current_layer"] == EXPECTED_LAYER
assert payload["historical_reconciliation_layer"] == EXPECTED_RECON_LAYER
assert payload["historical_reconciliation_records"] == 81
assert payload["historical_reconciliation_included_in_current_count"] is True
assert payload["historical_ledger_cutoff"] == HISTORICAL_MANIFEST["collection_cutoff"]
assert payload["historical_ledger_cutoff"] != payload["current_review_cutoff"]
assert len(payload["current_overlay_manifest_sha256"]) >= 5
assert "data/current-update-20260825-late/manifest.json" in payload["current_overlay_manifest_sha256"]
assert "data/current-update-20260826/manifest.json" in payload["current_overlay_manifest_sha256"]
assert "data/current-update-20260827/manifest.json" in payload["current_overlay_manifest_sha256"]
assert "data/wiki-map-reconciliation-20260826/manifest.json" in payload["historical_reconciliation_sha256"]
assert "data/wiki-map-reconciliation-20260826/events.json" in payload["historical_reconciliation_sha256"]
assert payload["authoritative_json_sha256"], "historical ledger hashes missing"

print("build-info-current: PASS — deployment identity reports 205 records through Aug. 27 08:25 ET, recognizes the post-reconciliation overlay, and preserves the exact frozen historical-ledger cutoff")
