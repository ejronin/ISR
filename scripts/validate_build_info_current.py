#!/usr/bin/env python3
"""Validate deployment identity against generated canonical current state."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CANONICAL_PATH = ROOT / "data/canonical-current-state.json"
HISTORICAL_MANIFEST = json.loads((ROOT / "data/integration-v1.2/manifest.json").read_text(encoding="utf-8"))

assert CANONICAL_PATH.is_file(), "canonical current state must be built before build-info validation"
canonical = json.loads(CANONICAL_PATH.read_text(encoding="utf-8"))

with tempfile.TemporaryDirectory() as temporary:
    output = Path(temporary) / "build-info.json"
    subprocess.run([
        sys.executable,
        str(ROOT / "scripts/write_build_info.py"),
        "--output", str(output),
        "--commit", "TEST-COMMIT",
    ], cwd=ROOT, check=True)
    payload = json.loads(output.read_text(encoding="utf-8"))

assert payload["commit_sha"] == "TEST-COMMIT"
assert payload["collection_cutoff"] == canonical["release"]["current_osint_cutoff"]
assert payload["current_review_cutoff"] == canonical["release"]["current_osint_cutoff"]
assert payload["current_chronology_records"] == canonical["counts"]["chronology_records"]
assert payload["current_layer"] == "data/canonical-current-state.json"
assert "\\" not in payload["current_layer"], "build-info repository paths must be platform-independent POSIX text"
assert payload["canonical_state_identity"] == canonical["release"]["canonical_state_identity"]
assert payload["canonical_input_set_sha256"] == canonical["release"]["input_set_sha256"]
assert payload["canonical_migration_head"] == canonical["migration_boundary"]["accepted_phase3_head"]
assert payload["accepted_update_packets"] == len(canonical.get("accepted_updates") or [])
assert payload["accepted_update_packet_sha256"] == {item["path"]: item["sha256"] for item in canonical.get("accepted_updates") or []}
assert payload["historical_reconciliation_layer"] == "data/wiki-map-reconciliation-20260826"
assert payload["historical_reconciliation_records"] == 81
assert payload["historical_reconciliation_included_in_current_count"] is True
assert payload["historical_ledger_cutoff"] == HISTORICAL_MANIFEST["collection_cutoff"]
assert payload["historical_ledger_cutoff"] <= payload["current_review_cutoff"]
assert len(payload["current_overlay_manifest_sha256"]) >= 5
assert "data/current-update-20260825-late/manifest.json" in payload["current_overlay_manifest_sha256"]
assert "data/current-update-20260826/manifest.json" in payload["current_overlay_manifest_sha256"]
assert "data/current-update-20260827/manifest.json" in payload["current_overlay_manifest_sha256"]
assert "data/wiki-map-reconciliation-20260826/manifest.json" in payload["historical_reconciliation_sha256"]
assert "data/wiki-map-reconciliation-20260826/events.json" in payload["historical_reconciliation_sha256"]
assert payload["authoritative_json_sha256"], "historical ledger hashes missing"

print(
    "build-info-current: PASS — deployment identity derives "
    f"{payload['current_chronology_records']} records through {payload['current_review_cutoff']} "
    "from canonical current state using platform-independent paths"
)
