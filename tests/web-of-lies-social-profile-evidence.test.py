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
assert {row["role_code"] for row in ethan["claimed_roles"]} == {"ANALYST", "JOURNALIST"}
assert {row["appellation_code"] for row in ethan["role_failure_appellations"]} == {
    "FAKE_ANALYST", "YELLOW_JOURNALISM"
}
assert {row["public_label"] for row in ethan["role_failure_appellations"]} == {
    "Fake analyst", "Yellow journalism"
}
assert set(ethan["revenue_model"]) == {"PATREON", "DONATIONS", "SPONSORED_CONTENT"}
assert ethan["classification_basis_receipts"]
assert {x for r in ethan["revenue_basis_receipts"] for x in r["revenue_classes"]} == {
    "PATREON", "DONATIONS", "SPONSORED_CONTENT"
}
assert [a["award_code"] for a in ethan["source_awards"]] == ["BULLSHITTER"]
assert ethan["source_awards"][0]["documented_incident_count"] == 34
assert len(ethan["source_awards"][0]["documented_incident_ids"]) == 34
role_failures = {row["appellation_code"]: row for row in ethan["role_failure_appellations"]}
assert role_failures["FAKE_ANALYST"]["incident_count"] == 15
assert len(role_failures["FAKE_ANALYST"]["claimed_role_receipts"]) >= 1
assert role_failures["YELLOW_JOURNALISM"]["incident_count"] == 34
assert len(role_failures["YELLOW_JOURNALISM"]["claimed_role_receipts"]) >= 1

valenti = profiles["WOL-SRC-VALENTI-VIDEOS"]
assert set(valenti["behavior_classes"]) == {"MONETIZED_INFLUENCER", "NEWS_GRIFT"}
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

# Expertise is bounded to what the receipts establish. Descriptive expertise
# neither creates nor erases independently derived source-behavior awards.
lim = profiles["WOL-SRC-LIM-TEAN"]
assert lim["behavior_classes"] == ["SUBJECT_MATTER_ANALYST"]
assert "shipping/admiralty" in lim["expertise_scope"]
assert lim["classification_basis_receipts"]
assert [a["award_code"] for a in lim["source_awards"]] == ["BULLSHITTER"]
lim_incidents = [row for row in incidents.values() if row["source_id"] == "WOL-SRC-LIM-TEAN"]
assert len(lim_incidents) == 6
assert any(row["event_type"] == "UNSUPPORTED_INFERENTIAL_ASSERTION" for row in lim_incidents)
assert any(row["event_type"] == "UNSUPPORTED_FACTUAL_ASSERTION" for row in lim_incidents)

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


# Role-failure appellations fail closed without the source's own role claim.
no_roles = copy.deepcopy(assembled)
no_roles_ethan = next(
    row for row in no_roles["source_profiles"]
    if row["source_id"] == "WOL-SRC-ETHAN-LEVINS"
)
no_roles_ethan["claimed_roles"] = []
no_roles_derived = wol.build_registry(canonical, no_roles, governance)
no_roles_profile = next(
    row for row in no_roles_derived["source_profiles"]
    if row["source_id"] == "WOL-SRC-ETHAN-LEVINS"
)
assert no_roles_profile["role_failure_appellations"] == []
assert [a["award_code"] for a in no_roles_profile["source_awards"]] == ["BULLSHITTER"]

# Role claim alone cannot create an adverse label. Remove incident tags but keep
# the self-description and the independently earned Bullshitter award.
no_failures = copy.deepcopy(assembled)
for row in no_failures["source_behavior_incidents"]:
    if row["source_id"] == "WOL-SRC-ETHAN-LEVINS":
        row["role_failure_tags"] = []
no_failures_derived = wol.build_registry(canonical, no_failures, governance)
no_failures_profile = next(
    row for row in no_failures_derived["source_profiles"]
    if row["source_id"] == "WOL-SRC-ETHAN-LEVINS"
)
assert no_failures_profile["role_failure_appellations"] == []
assert [a["award_code"] for a in no_failures_profile["source_awards"]] == ["BULLSHITTER"]

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
    "descriptive_receipts=1 adverse_isolation=1 role_failure_gates=1 award_orthogonality=1"
)
