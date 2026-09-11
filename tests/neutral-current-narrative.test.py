#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

source = (ROOT / "js" / "public-app.js").read_text(encoding="utf-8")
assert "ROOK_NARRATIVE_CURRENT" not in source
assert "FINAL_NARRATIVE_GATES" not in source
assert "narrativeContract: FINAL_NARRATIVE_GATES" not in source
assert "narrativeContract: null" in source
assert "ATLAS_PRIVILEGED_NARRATIVE_RETIRED" in source
assert "reader_runtime" in source
assert "reader_stylesheet" in source
assert "runtime.length === 3" in source
assert "stylesheets.length === 3" in source

builder = (ROOT / "scripts" / "build_public_release.py").read_text(encoding="utf-8")
core_builder = (ROOT / "scripts" / "build_public_release_core.py").read_text(encoding="utf-8")
assert "from build_public_release_core import *" in builder
assert "2.3-single-pass-reader-assets" in core_builder
assert core_builder.count('(\"reader_runtime\", \"public-reader-layer\", \"src/public-reader-layer.js\", \"js\")') == 1
assert core_builder.count('(\"reader_stylesheet\", \"public-reader-layer\", \"src/public-reader-layer.css\", \"css\")') == 1
assert 'assets_by_role[\"reader_runtime\"][\"path\"]' in core_builder
assert 'assets_by_role[\"reader_stylesheet\"][\"path\"]' in core_builder

# The stable wrapper must not perform a second manifest pass or source mutation.
for retired in (
    "_promote_reader_assets",
    "_rebind_release_identity",
    "_asset_set_sha256",
    "READER_RUNTIME_SPEC",
    "READER_STYLESHEET_SPEC",
    "materialize_asset(",
    "retire_privileged_narrative_runtime",
    "entrypoint_preparation",
    "compose_reader_sources",
    "ATLAS_PUBLIC_READER_LAYER_COMPOSED",
    "ATLAS_PUBLIC_READER_STYLES_COMPOSED",
    "PAGE_REGISTRY",
    "PUBLIC_STYLESHEET",
):
    assert retired not in builder, retired

# Retired publication side channels and release-time source transforms must not
# remain active inputs. The tracked public entrypoint is the deployable source.
assert not (ROOT / "config" / "rook-narrative-current.json").exists()
assert not (ROOT / "scripts" / "sync_rook_narrative.py").exists()
assert not (ROOT / "scripts" / "retire_privileged_narrative_runtime.py").exists()

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

source_ids = {source_record["source_id"] for packet in (sep8, sep9) for source_record in packet.get("sources", [])}
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
assert "c75725d4c3164a014222fb996abd18aabe52e1564b092a0ca5b6ee407c8af638" in retirement_note

print("neutral current narrative: PASS - tracked entrypoint is directly neutral; single-pass core owns the reader asset graph; accepted Sep. 8-9 evidence parity preserved")
