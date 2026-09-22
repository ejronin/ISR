#!/usr/bin/env python3
"""Regression coverage for receipt-backed social profile evidence on current WOL state."""
from __future__ import annotations

import copy
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

profiles = {row["source_id"]: row for row in derived["source_profiles"]}
relationships = {row["relationship_id"]: row for row in derived["relationships"]}
incidents = {row["incident_id"]: row for row in derived["source_behavior_incidents"]}

profile_rule = governance["profile_evidence"]
assert profile_rule["adverse_classes_still_require_incident_events"] is True
assert profile_rule["profile_receipt_does_not_create_hall_score"] is True
assert profile_rule["collaboration_receipt_does_not_establish_control"] is True

# Descriptive role/revenue evidence coexists with independently derived adverse
# history. It neither creates nor erases the Bullshitter award.
ethan = profiles["WOL-SRC-ETHAN-LEVINS"]
assert ethan["behavior_classes"] == ["MONETIZED_INFLUENCER"]
assert set(ethan["revenue_model"]) == {"PATREON", "DONATIONS", "SPONSORED_CONTENT"}
assert ethan["classification_basis_receipts"]
assert {x for r in ethan["revenue_basis_receipts"] for x in r["revenue_classes"]} == {
    "PATREON", "DONATIONS", "SPONSORED_CONTENT"
}
assert [a["award_code"] for a in ethan["source_awards"]] == ["BULLSHITTER"]

valenti = profiles["WOL-SRC-VALENTI-VIDEOS"]
assert valenti["behavior_classes"] == ["MONETIZED_INFLUENCER"]
assert valenti["revenue_model"] == ["PATREON"]
assert valenti["classification_basis_receipts"]
assert valenti["revenue_basis_receipts"]
assert [a["award_code"] for a in valenti["source_awards"]] == ["BULLSHITTER"]

meidas = profiles["WOL-SRC-MEIDASTOUCH"]
assert meidas["behavior_classes"] == ["JOURNALISTIC_SOURCE"]
assert set(meidas["revenue_model"]) == {"PATREON", "MEMBERSHIP"}
assert meidas["classification_basis_receipts"]
assert meidas["revenue_basis_receipts"]
assert [a["award_code"] for a in meidas["source_awards"]] == ["BULLSHITTER"]
assert "pro-democracy" in meidas["editorial_position_context"]

# A descriptive activist/monetized profile is not an adverse finding.
jgg = profiles["WOL-SRC-JOLLY-GOOD-GINGER"]
assert set(jgg["behavior_classes"]) == {"ACTIVIST_COMMENTATOR", "MONETIZED_INFLUENCER"}
assert set(jgg["revenue_model"]) == {"PAID_SUBSTACK", "MEMBERSHIP"}
assert jgg["classification_basis_receipts"]
assert jgg["revenue_basis_receipts"]
assert jgg["source_awards"] == []

# Expertise is bounded to what the receipts establish. Lim's one WOL-native
# unsupported causal incident remains separate and does not become an award.
lim = profiles["WOL-SRC-LIM-TEAN"]
assert lim["behavior_classes"] == ["SUBJECT_MATTER_ANALYST"]
assert "shipping/admiralty" in lim["expertise_scope"]
assert lim["classification_basis_receipts"]
assert lim["source_awards"] == []
lim_incidents = [row for row in incidents.values() if row["source_id"] == "WOL-SRC-LIM-TEAN"]
assert len(lim_incidents) == 1
assert lim_incidents[0]["event_type"] == "UNSUPPORTED_INFERENTIAL_ASSERTION"

# Collaboration/quotation evidence preserves only the relationship actually
# proved. It cannot silently mutate into affiliation, employment or control.
assert relationships["WOL-REL-ETHAN-HOSTED-BY-RACHEL-BLEVINS-2026"]["relationship_type"] == "HOSTED_BY"
for rid in (
    "WOL-REL-JGG-HOSTED-BY-DEFIANCE-IRAN-20260302",
    "WOL-REL-JGG-HOSTED-BY-DON-LEMON-2026",
    "WOL-REL-JGG-HOSTED-BY-MICHAEL-COHEN-2026",
):
    assert relationships[rid]["relationship_type"] == "HOSTED_BY"
press_tv = relationships["WOL-REL-PRESSTV-QUOTES-ETHAN-LEVINS-202609"]
assert press_tv["relationship_type"] == "QUOTES"
assert any(r["receipt_id"] == "WOL-RCPT-PRESSTV-ETHAN-MAY8-20260921" for r in press_tv["public_receipts"])

for row in relationships.values():
    if row["from_id"] in {"WOL-SRC-ETHAN-LEVINS", "WOL-SRC-JOLLY-GOOD-GINGER"}:
        assert row["relationship_type"] not in {"CONTROLLED_BY", "AFFILIATED_WITH", "MEMBER_OF"}

# Receipt-backed descriptive classes are not Hall inputs.
hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
for source_id in {
    "WOL-SRC-ETHAN-LEVINS",
    "WOL-SRC-VALENTI-VIDEOS",
    "WOL-SRC-MEIDASTOUCH",
    "WOL-SRC-JOLLY-GOOD-GINGER",
    "WOL-SRC-LIM-TEAN",
}:
    assert source_id not in hall_ids

# Fail closed: an adverse class cannot be smuggled in via a profile receipt.
bad = copy.deepcopy(assembled)
bad_ethan = next(row for row in bad["source_profiles"] if row["source_id"] == "WOL-SRC-ETHAN-LEVINS")
bad_ethan["behavior_classes"] = ["PSEUDO_ANALYST"]
bad_ethan["classification_basis_receipts"][0]["behavior_classes"] = ["PSEUDO_ANALYST"]
try:
    wol.build_registry(canonical, bad, governance)
except ValueError as exc:
    assert "incident-gated classes" in str(exc)
else:
    raise AssertionError("adverse PSEUDO_ANALYST class was accepted from a profile receipt")

# Fail closed: observed monetization requires a public receipt or incident basis.
bad = copy.deepcopy(assembled)
bad_valenti = next(row for row in bad["source_profiles"] if row["source_id"] == "WOL-SRC-VALENTI-VIDEOS")
bad_valenti["revenue_basis_receipts"] = []
try:
    wol.build_registry(canonical, bad, governance)
except ValueError as exc:
    assert "revenue-basis events or public profile receipts" in str(exc)
else:
    raise AssertionError("Patreon revenue survived after its supporting receipt was removed")

print(
    "web-of-lies social profile evidence: PASS "
    "descriptive_receipts=1 adverse_isolation=1 award_orthogonality=1"
)
