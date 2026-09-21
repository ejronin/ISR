#!/usr/bin/env python3
"""Regression coverage for maritime/Kharg Web of Lies public-OSINT batch 2."""
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
    "CHAIN-LL-IRAN-US-WARSHIP-DAMAGE-20260905",
    "CHAIN-LL-IRAN-SIX-VESSEL-SUCCESS-20260905",
    "CHAIN-LL-IRAN-US-UNMANNED-VESSEL-20260906",
    "CHAIN-LL-IRAN-US-WARSHIP-HITS-20260909",
    "CHAIN-LL-IRAN-TEN-VESSEL-SUCCESS-20260909",
    "CHAIN-LL-PAKNEJAD-KHARG-550-HITS-20260906",
    "CHAIN-LL-PAKNEJAD-KHARG-CONTINUED-OPS-20260906",
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

# Canonically contradicted U.S.-warship effect claims remain adverse at the
# IRGC origin, while Tasnim carrier events stay derivative and neutral.
for origin_id, carrier_id in (
    (
        "WOL-EVT-PUB-WARSHIP-DAMAGE-0905-IRGC",
        "WOL-EVT-PUB-WARSHIP-DAMAGE-0905-TASNIM",
    ),
    (
        "WOL-EVT-PUB-WARSHIP-HITS-0909-IRGC",
        "WOL-EVT-PUB-WARSHIP-HITS-0909-TASNIM",
    ),
):
    origin = events[origin_id]
    carrier = events[carrier_id]
    assert origin["event_type"] == "FALSE_OR_MISLEADING_CONNECTION"
    assert carrier["event_type"] == "REPORTS"
    assert carrier["behavior_findings"] == []
    assert carrier["independence_status"] == "DERIVATIVE"

# The six-vessel tally remains unresolved. A first-party/official claim receipt
# and a Tasnim carrier receipt do not become six verified losses.
six_origin = events["WOL-EVT-PUB-SIX-VESSEL-0905-IRGC"]
six_carrier = events["WOL-EVT-PUB-SIX-VESSEL-0905-TASNIM"]
assert six_origin["event_type"] == "REPORTS"
assert six_origin["canonical_combined_assessment"] == "UNRESOLVED — DO NOT CREATE SIX LOSS RECORDS"
assert six_origin["behavior_findings"] == []
assert six_carrier["independence_status"] == "DERIVATIVE"
assert "not independent confirmation" in six_carrier["plain_english_verdict"].lower()

# Opposed U.S./Iranian claims about the unmanned vessel remain unresolved.
unmanned_origin = events["WOL-EVT-PUB-US-UNMANNED-0906-IRGC"]
unmanned_denial = events["WOL-EVT-PUB-US-UNMANNED-0906-US-DENIAL"]
assert unmanned_origin["canonical_combined_assessment"] == "UNRESOLVED"
assert unmanned_origin["event_type"] == "REPORTS"
assert unmanned_denial["event_type"] == "REPORTS"
assert unmanned_denial["lineage_roles"] == ["CONTRADICTS"]
assert unmanned_origin["behavior_findings"] == []
assert unmanned_denial["behavior_findings"] == []

# Exact ten-vessel success remains partially corroborated / unresolved. Real
# merchant incidents do not silently corroborate the exact tally.
ten_origin = events["WOL-EVT-PUB-TEN-VESSEL-0909-IRGC"]
ten_context = events["WOL-EVT-PUB-TEN-VESSEL-0909-REUTERS-CONTEXT"]
assert ten_origin["event_type"] == "REPORTS"
assert (
    ten_origin["canonical_combined_assessment"]
    == "PARTIALLY CORROBORATED / EXACT TEN UNRESOLVED — NO LIE FINDING"
)
assert ten_origin["behavior_findings"] == []
assert ten_context["independence_status"] == "NOT_APPLICABLE"
network_ten = next(
    row for row in derived["network_analysis"]["family_analysis"]
    if row["claim_family_id"] == "CHAIN-LL-IRAN-TEN-VESSEL-SUCCESS-20260909"
)
assert network_ten["independent_corroboration_events"] == 0

# Paknejad control pair: same person, same interview lineage, two different
# canonical dispositions. The unresolved number cannot contaminate the
# supported continued-operation proposition.
kharg_550 = events["WOL-EVT-PUB-KHARG-550-PAKNEJAD"]
kharg_ops = events["WOL-EVT-PUB-KHARG-OPS-PAKNEJAD"]
assert kharg_550["source_id"] == kharg_ops["source_id"] == "WOL-SRC-MOHSEN-PAKNEJAD"
assert kharg_550["canonical_combined_assessment"] == "UNRESOLVED EXACT COUNT"
assert kharg_ops["canonical_combined_assessment"] == "SUPPORTED"
assert kharg_550["event_type"] == "REPORTS"
assert kharg_ops["event_type"] == "REPORTS"
assert kharg_550["behavior_findings"] == []
assert kharg_ops["behavior_findings"] == []

paknejad = profiles["WOL-SRC-MOHSEN-PAKNEJAD"]
assert paknejad["behavior_classes"] == ["UNKNOWN"]
assert paknejad["direct_verdict"] is None
assert paknejad["metrics"]["false_misleading_findings_connected"] == 0
assert paknejad["metrics"]["narrative_mutations_introduced"] == 0

# Reuters and Press TV are two carriers of the same Paknejad interview; cross-
# outlet publication does not become independent corroboration.
for family_id in (
    "CHAIN-LL-PAKNEJAD-KHARG-550-HITS-20260906",
    "CHAIN-LL-PAKNEJAD-KHARG-CONTINUED-OPS-20260906",
):
    net = next(
        row for row in derived["network_analysis"]["family_analysis"]
        if row["claim_family_id"] == family_id
    )
    assert net["independent_corroboration_events"] == 0
    assert net["derivative_repetition_events"] >= 2

assert derived["corpus_coverage"]["completion_claim"] == "NONE"

print(
    "web-of-lies public OSINT batch2: PASS "
    f"families={len(BATCH_FAMILIES)}"
)
