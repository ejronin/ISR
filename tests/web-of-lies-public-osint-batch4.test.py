#!/usr/bin/env python3
"""Regression coverage for false-flag, target-tally and BDA Web of Lies batch 4."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_web_of_lies as wol  # noqa: E402
import build_web_of_lies_forensic_input as aggregator  # noqa: E402

canonical = json.loads((ROOT / wol.CANONICAL).read_text(encoding="utf-8"))
governance = json.loads((ROOT / wol.GOVERNANCE).read_text(encoding="utf-8"))
assembled = aggregator.build_forensic_input(ROOT)
derived = wol.build_registry(canonical, assembled, governance)

BATCH_FAMILIES = {
    "CH-ARAMCO-FALSE-FLAG-20260302",
    "CH-ERBIL-KUWAIT-FALSE-FLAG-20260315",
    "CH-SHAHED-CLONE-FALSE-FLAG-20260315",
    "CHAIN-CL-18TARGETS",
    "CHAIN-CL-ERBIL-ALL",
    "CHAIN-CL-IRGC-ASSET-LIST",
}

coverage = {
    row["claim_family_id"]: row
    for row in derived["corpus_coverage"]["family_coverage"]
}
for family_id in BATCH_FAMILIES:
    row = coverage[family_id]
    assert row["coverage_status"] == "LINEAGE_TRACED", family_id
    assert row["non_anchor_lineage_events"] >= 2, family_id
    assert row["documented_relationships"] >= 1, family_id
    assert row["public_receipt_count"] >= 1, family_id

events = {row["event_id"]: row for row in derived["information_events"]}
profiles = {row["source_id"]: row for row in derived["source_profiles"]}
flags = {row["flag_id"]: row for row in derived["promotion_flags"]}

# False-flag families remain three incident-specific chains under one narrative
# family; unsubstantiated does not become FALSE_OR_MISLEADING or Lie.
overlay = json.loads(
    (ROOT / "data/claims-forensics/lie-ledger-semantic-overlay-20260919.json").read_text(
        encoding="utf-8"
    )
)
chain_overrides = overlay["chain_overrides"]
false_flag_families = {
    "CH-ARAMCO-FALSE-FLAG-20260302",
    "CH-ERBIL-KUWAIT-FALSE-FLAG-20260315",
    "CH-SHAHED-CLONE-FALSE-FLAG-20260315",
}
assert {
    chain_overrides[family_id]["narrative_family_id"]
    for family_id in false_flag_families
} == {"NF-FALSE-FLAG-REGIONAL"}

aramco_origin = events["WOL-EVT-PUB-ARAMCO-FALSE-FLAG-ORIGIN"]
erbil_ff_origin = events["WOL-EVT-PUB-ERBIL-KUWAIT-FALSE-FLAG-ORIGIN"]
shahed_origin = events["WOL-EVT-PUB-SHAHED-CLONE-FALSE-FLAG-ORIGIN"]
for row in (aramco_origin, erbil_ff_origin, shahed_origin):
    assert row["event_type"] == "REPORTS"
    assert row["behavior_findings"] == []
    assert "UNSUBSTANTIATED" in row["canonical_combined_assessment"]

# The two anonymous Tasnim sources are not merged into each other or into the
# official Khatam al-Anbiya source.
assert aramco_origin["source_id"] == "WOL-SRC-UNNAMED-MILITARY-ARAMCO-20260302"
assert erbil_ff_origin["source_id"] == "WOL-SRC-UNNAMED-MILITARY-ERBIL-KUWAIT-20260315"
assert aramco_origin["source_id"] != erbil_ff_origin["source_id"]
assert profiles[aramco_origin["source_id"]]["identity_confidence"] == "UNRESOLVED"
assert profiles[erbil_ff_origin["source_id"]]["identity_confidence"] == "UNRESOLVED"
assert shahed_origin["source_id"] == "WOL-SRC-KHATAM-AL-ANBIYA"

for event_id in (
    "WOL-EVT-PUB-ARAMCO-FALSE-FLAG-TASNIM",
    "WOL-EVT-PUB-ERBIL-KUWAIT-FALSE-FLAG-TASNIM",
    "WOL-EVT-PUB-SHAHED-CLONE-FALSE-FLAG-PRESSTV",
    "WOL-EVT-PUB-SHAHED-CLONE-FALSE-FLAG-TASNIM",
):
    carrier = events[event_id]
    assert carrier["event_type"] == "REPORTS"
    assert carrier["behavior_findings"] == []
    assert carrier["independence_status"] == "DERIVATIVE"

# Direct 18-target origin is Web-of-Lies-native public provenance, not silently
# promoted Evidence Integration. The exact success tally remains unverified.
target_origin = events["WOL-EVT-PUB-18TARGETS-IRGC"]
target_tasnim = events["WOL-EVT-PUB-18TARGETS-TASNIM"]
target_national = events["WOL-EVT-PUB-18TARGETS-NATIONAL"]
assert target_origin["event_type"] == "REPORTS"
assert target_origin["evidence_source_ids"] == []
assert target_origin["public_receipts"]
assert target_tasnim["independence_status"] == "DERIVATIVE"
assert target_national["independence_status"] == "DERIVATIVE"
assert "EXACT 18-TARGET SUCCESS TALLY UNVERIFIED" in target_origin["canonical_combined_assessment"]
promotion = flags["WOL-FLAG-18TARGETS-TASNIM-ORIGIN-PROMOTION"]
assert promotion["flag_type"] == "EVIDENCE_PROMOTION_CANDIDATE"
assert promotion["subject_id"] == target_origin["event_id"]

# Erbil compound claim: attack/damage context stays neutral; only the
# functional-effect and near-total scale atoms carry the existing misleading
# finding, and the IRNA carrier remains neutral.
erbil_context = events["WOL-EVT-PUB-ERBIL-ALL-AKRAMINIA-CONTEXT"]
erbil_scale = events["WOL-EVT-PUB-ERBIL-ALL-AKRAMINIA-SCALE"]
erbil_carrier = events["WOL-EVT-PUB-ERBIL-ALL-IRNA"]
assert erbil_context["event_type"] == "REPORTS"
assert erbil_context["behavior_findings"] == []
assert erbil_scale["event_type"] == "FALSE_OR_MISLEADING_CONNECTION"
assert "NO LIE FINDING" in erbil_scale["canonical_combined_assessment"]
assert "PROP-ERBIL-FUNCTIONAL-EFFECT" in erbil_scale["canonical_claim_refs"]
assert "PROP-ERBIL-NEARLY-ALL-INFRASTRUCTURE" in erbil_scale["canonical_claim_refs"]
assert "PROP-ERBIL-ATTACK-OCCURRENCE" not in erbil_scale["canonical_claim_refs"]
assert erbil_carrier["event_type"] == "REPORTS"
assert erbil_carrier["behavior_findings"] == []
assert erbil_carrier["independence_status"] == "DERIVATIVE"

akraminia_batch_events = [erbil_context, erbil_scale]
assert wol.metrics_for_events(akraminia_batch_events)["false_misleading_findings_connected"] == 1

# The detailed IRGC asset scorecard remains an unresolved exact-tally claim;
# neither the origin nor IRNA publication creates verified losses or Hall
# behavior by itself.
asset_origin = events["WOL-EVT-PUB-IRGC-ASSET-LIST-MOHEBBI"]
asset_carrier = events["WOL-EVT-PUB-IRGC-ASSET-LIST-IRNA"]
assert asset_origin["event_type"] == "REPORTS"
assert asset_origin["behavior_findings"] == []
assert "UNRESOLVED" in asset_origin["canonical_combined_assessment"]
assert asset_carrier["event_type"] == "REPORTS"
assert asset_carrier["behavior_findings"] == []
assert asset_carrier["independence_status"] == "DERIVATIVE"
assert len(asset_origin["canonical_claim_refs"]) >= 27

# Batch 4 does not claim corpus completion.
assert derived["corpus_coverage"]["completion_claim"] == "NONE"

print(
    "web-of-lies public OSINT batch4: PASS "
    f"families={len(BATCH_FAMILIES)}"
)
