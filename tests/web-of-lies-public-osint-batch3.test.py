#!/usr/bin/env python3
"""Regression coverage for contested-attribution/causation Web of Lies batch 3."""
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
    "CH-RSAF-F15SA-MARIB-20260916",
    "CH-SAUDI-PIPELINE-ATTRIBUTION-20260912",
    "CH-EL-GAIA-MINE-CAUSATION-20260914",
    "CH-OMAN-MEETING-DELAY-ATTRIBUTION-20260914",
    "CH-HOUTHI-NAVIGATION-CLAIM-20260912",
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

# Saudi F-15SA: physical loss is supported, missile causation is not.
f15_origin = events["WOL-EVT-PUB-F15SA-MARIB-HOUTHI"]
f15_janes = events["WOL-EVT-PUB-F15SA-MARIB-JANES"]
assert f15_origin["event_type"] == "REPORTS"
assert f15_origin["canonical_combined_assessment"] == (
    "UNRESOLVED — PHYSICAL LOSS DOES NOT ESTABLISH HOUTHI MISSILE CAUSATION"
)
assert f15_origin["behavior_findings"] == []
assert f15_janes["independence_status"] == "NOT_APPLICABLE"
assert "not the asserted missile causation" in f15_janes["plain_english_verdict"]

f15_network = next(
    row for row in derived["network_analysis"]["family_analysis"]
    if row["claim_family_id"] == "CH-RSAF-F15SA-MARIB-20260916"
)
assert f15_network["independent_corroboration_events"] == 0

# Trump's pipeline statement is explicitly hedged and remains unresolved.
pipeline_origin = events["WOL-EVT-PUB-PIPELINE-ATTRIBUTION-TRUMP"]
pipeline_carrier = events["WOL-EVT-PUB-PIPELINE-ATTRIBUTION-REUTERS"]
pipeline_context = events["WOL-EVT-PUB-PIPELINE-ATTRIBUTION-IRAQ-CONTEXT"]
assert pipeline_origin["epistemic_posture"] == "HEDGED"
assert pipeline_origin["event_type"] == "REPORTS"
assert pipeline_origin["behavior_findings"] == []
assert pipeline_carrier["independence_status"] == "DERIVATIVE"
assert pipeline_context["event_type"] == "REPORTS"
assert "does not prove the command attribution" in pipeline_context["plain_english_verdict"]

trump = profiles["WOL-SRC-DONALD-TRUMP"]
assert trump["metrics"]["false_misleading_findings_connected"] == 0
assert trump["direct_verdict"] is None

# El Gaia is a genuine contested-causation case: neither official account is
# silently selected by Web of Lies.
el_gaia_irgc = events["WOL-EVT-PUB-EL-GAIA-IRGC-MINES"]
el_gaia_reuters = events["WOL-EVT-PUB-EL-GAIA-REUTERS"]
el_gaia_centcom = events["WOL-EVT-PUB-EL-GAIA-CENTCOM"]
for row in (el_gaia_irgc, el_gaia_reuters, el_gaia_centcom):
    assert row["event_type"] == "REPORTS"
    assert row["behavior_findings"] == []
assert el_gaia_irgc["canonical_combined_assessment"] == "CONTESTED / UNRESOLVED CAUSATION"
assert "not a winner" in next(
    json.loads((ROOT / packet["path"]).read_text(encoding="utf-8"))["notes"]
    for packet in assembled["lineage_packets"]
    if packet["packet_id"] == "WOL-PKT-PUBLIC-OSINT-EL-GAIA-MINE-CAUSATION-20260914"
).lower()

# Oman meeting: postponement occurrence is distinct from who requested it.
oman_origin = events["WOL-EVT-PUB-OMAN-DELAY-BAQAEI"]
oman_carrier = events["WOL-EVT-PUB-OMAN-DELAY-REUTERS"]
oman_context = events["WOL-EVT-PUB-OMAN-DELAY-OMAN-CONTEXT"]
assert oman_origin["event_type"] == "REPORTS"
assert oman_origin["canonical_combined_assessment"] == (
    "UNRESOLVED IRANIAN ATTRIBUTION — NO INDEPENDENT SAUDI/OMANI CONFIRMATION"
)
assert oman_carrier["independence_status"] == "DERIVATIVE"
assert oman_context["event_type"] == "REPORTS"
assert "confirms postponement, not requester identity" in oman_context["plain_english_verdict"]

# Navigation safety is canonically misleading, but not an ordinary Lie case.
# Its Reuters carrier remains a neutral attributed carrier.
nav_origin = events["WOL-EVT-PUB-HOUTHI-NAV-SAREE"]
nav_carrier = events["WOL-EVT-PUB-HOUTHI-NAV-REUTERS"]
assert nav_origin["event_type"] == "FALSE_OR_MISLEADING_CONNECTION"
assert nav_origin["canonical_combined_assessment"] == (
    "MISLEADING SAFETY CHARACTERIZATION — NOT AN ORDINARY LIE-DENOMINATOR CASE"
)
assert nav_carrier["event_type"] == "REPORTS"
assert nav_carrier["behavior_findings"] == []
assert nav_carrier["independence_status"] == "DERIVATIVE"

# Same Saree identity: unresolved missile causation does not add an adverse
# finding; only the independently adjudicated misleading navigation family does.
saree_events = [
    row for row in derived["information_events"]
    if row["source_id"] == "WOL-SRC-YAHYA-SAREE"
]
saree_metrics = wol.metrics_for_events(saree_events)
assert saree_metrics["false_misleading_findings_connected"] == 1
assert saree_metrics["narrative_mutations_introduced"] == 0

assert derived["corpus_coverage"]["completion_claim"] == "NONE"

print(
    "web-of-lies public OSINT batch3: PASS "
    f"families={len(BATCH_FAMILIES)}"
)
