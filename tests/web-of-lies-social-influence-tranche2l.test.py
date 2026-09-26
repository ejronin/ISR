#!/usr/bin/env python3
"""Regression coverage for Krassenstein discovery plus Meidas/Lim follow-up boundaries."""
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

profiles = {row["source_id"]: row for row in derived["source_profiles"]}
incidents = {row["incident_id"]: row for row in derived["source_behavior_incidents"]}
leads = {row["lead_id"]: row for row in derived["research_leads"]}
amplification = derived["amplification_observations"]

brian_id = "WOL-SRC-BRIAN-KRASSENSTEIN"
ed_id = "WOL-SRC-ED-KRASSENSTEIN"

assert brian_id in profiles
assert ed_id in profiles
assert profiles[brian_id]["display_name"] == "Brian Krassenstein"
assert profiles[ed_id]["display_name"] == "Ed Krassenstein"
assert profiles[brian_id]["primary_platform"] == "X"
assert profiles[ed_id]["primary_platform"] == "X"
assert profiles[brian_id]["behavior_classes"] == ["UNKNOWN"]
assert profiles[ed_id]["behavior_classes"] == ["UNKNOWN"]
assert profiles[brian_id]["source_awards"] == []
assert profiles[ed_id]["source_awards"] == []

# The twins are separate WOL sources. Their joint Krassencast self-description
# is identity/role context, not a mechanism for transferring one brother's
# individual-X conduct to the other or to the joint outlet.
assert profiles[brian_id]["stable_identity_id"] != profiles[ed_id]["stable_identity_id"]
assert "@krassenstein" in profiles[brian_id]["aliases"]
assert "@EdKrassen" in profiles[ed_id]["aliases"]
assert "jointly operate the Krassencast" in profiles[brian_id]["identity_context"]
assert "jointly operate the Krassencast" in profiles[ed_id]["identity_context"]

brian_incident_ids = {
    "WOL-BS-BRIAN-KRASSENSTEIN-SKYLIGHT-IGNORED-ORDER-20260301",
    "WOL-BS-BRIAN-KRASSENSTEIN-KURDS-KEPT-GUNS-20260405",
}
ed_incident_ids = {
    "WOL-BS-ED-KRASSENSTEIN-AMERICAN-TANKER-MISSILE-20260302",
}

assert brian_incident_ids <= set(incidents)
assert ed_incident_ids <= set(incidents)
assert len([row for row in incidents.values() if row["source_id"] == brian_id]) == 2
assert len([row for row in incidents.values() if row["source_id"] == ed_id]) == 1

for incident_id in brian_incident_ids | ed_incident_ids:
    row = incidents[incident_id]
    assert row["event_type"] == "UNSUPPORTED_FACTUAL_ASSERTION"
    assert row["assertion_kind"] == "FACTUAL_ASSERTION"
    assert row["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert row["evidentiary_support_review"]["supporting_evidence_found"] is False
    assert len(row["public_receipts"]) >= 3
    assert any(receipt["surface"] == "X" for receipt in row["public_receipts"])

skylight = incidents["WOL-BS-BRIAN-KRASSENSTEIN-SKYLIGHT-IGNORED-ORDER-20260301"]
assert "anchored in the Musandam region since February 22" in skylight["evidentiary_support_review"]["claimant_basis_note"]
assert "no intent finding" in skylight["downstream_note"]

kurds = incidents["WOL-BS-BRIAN-KRASSENSTEIN-KURDS-KEPT-GUNS-20260405"]
assert "hedged" in kurds["evidentiary_support_review"]["claimant_basis_note"]
assert "Kurdish groups denied receiving" in kurds["evidentiary_support_review"]["claimant_basis_note"]

ed_tanker = incidents["WOL-BS-ED-KRASSENSTEIN-AMERICAN-TANKER-MISSILE-20260302"]
assert "Skylight was Palau-flagged" in ed_tanker["evidentiary_support_review"]["claimant_basis_note"]
assert "MKD VYOM was Marshall Islands-flagged" in ed_tanker["evidentiary_support_review"]["claimant_basis_note"]
assert "Ed used 'reportedly'" in ed_tanker["evidentiary_support_review"]["search_notes"]

assert leads["LEAD-BRIAN-KRASSENSTEIN"]["current_disposition"] == "MATERIAL_WOL_HISTORY_FOUND"
assert leads["LEAD-ED-KRASSENSTEIN"]["current_disposition"] == "MATERIAL_WOL_HISTORY_FOUND"
assert "Two incidents do not earn a Bullshitter award" in leads["LEAD-BRIAN-KRASSENSTEIN"]["notes"]
assert "One incident does not earn a Bullshitter award" in leads["LEAD-ED-KRASSENSTEIN"]["notes"]

# Meidas propagation review must not turn neutral podcast/RSS/index services into
# apparent independent endorsement of already-scored propositions.
meidas_amp = [
    row for row in amplification
    if row.get("bullshitter_source_id") == "WOL-SRC-MEIDASTOUCH"
]
assert meidas_amp == []
assert "no clean independent downstream account adoption" in leads["LEAD-MEIDASTOUCH"]["notes"]
assert "Neutral/automated podcast distribution" in leads["LEAD-MEIDASTOUCH"]["notes"]

# Lim remains at the six already-scored events. The follow-up documents the
# internal contradiction but must not invent correction awareness or intent.
lim_rows = [
    row for row in incidents.values()
    if row["source_id"] == "WOL-SRC-LIM-TEAN"
]
assert len(lim_rows) == 6
assert not any(row["event_type"] == "REPEAT_AFTER_CORRECTION" for row in lim_rows)
assert "did not establish a public repeat-after-correction or intent finding" in leads["LEAD-LIM-TEAN"]["notes"]
assert "No recoverable public receipt" in leads["LEAD-LIM-TEAN"]["notes"]

print(
    "web-of-lies social influence tranche2l: PASS "
    "brian_incidents=2 ed_incidents=1 awards=0 "
    "meidas_external_amp=0 lim_intent_promotion=0"
)
