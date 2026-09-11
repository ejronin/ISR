#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "retire_privileged_narrative_runtime.py"

spec = importlib.util.spec_from_file_location("retire_privileged_narrative_runtime", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

source = (ROOT / "js" / "public-app.js").read_text(encoding="utf-8")
transformed = module.transform(source)
assert "ROOK_NARRATIVE_CURRENT" not in transformed
assert "FINAL_NARRATIVE_GATES" not in transformed
assert "narrativeContract: FINAL_NARRATIVE_GATES" not in transformed
assert "narrativeContract: null" in transformed
assert "ATLAS_PRIVILEGED_NARRATIVE_RETIRED" in transformed
assert "reader_runtime" in transformed
assert "reader_stylesheet" in transformed
assert "runtime.length === 3" in transformed
assert "stylesheets.length === 3" in transformed
assert module.transform(transformed) == transformed

with tempfile.TemporaryDirectory() as tmp:
    tmp_root = Path(tmp)
    (tmp_root / "js").mkdir()
    (tmp_root / "js" / "public-app.js").write_text(source, encoding="utf-8")
    module.apply(tmp_root)
    built = (tmp_root / "js" / "public-app.js").read_text(encoding="utf-8")
    assert built == transformed

builder = (ROOT / "scripts" / "build_public_release.py").read_text(encoding="utf-8")
assert "entrypoint_preparation.apply(root)" in builder
assert "2.1-reader-assets-neutral-narrative" in builder
assert "reader_runtime" in builder and "src/public-reader-layer.js" in builder
assert "reader_stylesheet" in builder and "src/public-reader-layer.css" in builder
assert "compose_reader_sources" not in builder
assert "ATLAS_PUBLIC_READER_LAYER_COMPOSED" not in builder
assert "ATLAS_PUBLIC_READER_STYLES_COMPOSED" not in builder

# The retired side-channel files must not remain active inputs.
assert not (ROOT / "config" / "rook-narrative-current.json").exists()
assert not (ROOT / "scripts" / "sync_rook_narrative.py").exists()

sep8 = json.loads((ROOT / "data" / "canonical-updates" / "UPD-20260908-CATCHUP.json").read_text(encoding="utf-8"))
sep9 = json.loads((ROOT / "data" / "canonical-updates" / "UPD-20260909-CATCHUP.json").read_text(encoding="utf-8"))
event_ids = {event["event_id"] for packet in (sep8, sep9) for event in packet.get("events", [])}
required = {
    "G3-US-IRAN-TANKERS-20260908",
    "G3-IRAN-JORDAN-BASE-ATTACK-20260908",
    "G3-HOUTHI-SAUDI-ENERGY-ATTACKS-20260908",
    "G3-NEW-ANDROS-DRONE-STRIKE-20260909",
    "G3-HORMUZ-MERCHANT-INCIDENTS-20260909",
    "G3-HORMUZ-TRAFFIC-20260909",
    "G3-BRENT-100-20260909",
}
missing = sorted(required - event_ids)
assert not missing, f"neutral evidence parity missing accepted events: {missing}"

source_ids = {source["source_id"] for packet in (sep8, sep9) for source in packet.get("sources", [])}
for required_source in {
    "SRC-D1BEDB6691C0",
    "SRC-ED2A30FC7E01",
    "SRC-C4F6A08D79B0",
    "SRC-381CCE77C378",
    "SRC-10E892578E15",
    "SRC-9DC172E5EDB3",
    "SRC-C7CC991B2C5F",
    "SRC-FF8B40E74983",
    "SRC-0F405D5BB777",
}:
    assert required_source in source_ids, f"neutral evidence parity missing source {required_source}"

retirement_note = (ROOT / "docs" / "PRIVILEGED_NARRATIVE_RETIREMENT_2026-09-10.md").read_text(encoding="utf-8")
for event_id in sorted(required):
    assert event_id in retirement_note

print("neutral current narrative: PASS - privileged publication path retired before signing; reader assets explicit; accepted Sep. 8-9 evidence parity preserved")
