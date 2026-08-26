#!/usr/bin/env python3
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_CUTOFF = "2026-08-25T21:32:55-04:00"
EXPECTED_COUNT = 117
EXPECTED_LAYER = "data/current-update-20260825-late"

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
assert payload["historical_ledger_cutoff"] != payload["current_review_cutoff"]
assert payload["historical_ledger_cutoff"].startswith("2026-08-20")
assert len(payload["current_overlay_manifest_sha256"]) >= 3
assert "data/current-update-20260825-late/manifest.json" in payload["current_overlay_manifest_sha256"]
assert payload["authoritative_json_sha256"], "historical ledger hashes missing"

print("build-info-current: PASS — deployment identity reports 117 records through Aug. 25 21:32 ET while preserving historical-ledger cutoff")
