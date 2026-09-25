#!/usr/bin/env python3
"""Regression coverage for claim-first discovery of الأحداث الإيرانية / @WMX_MEDIA."""
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

source_id = "WOL-SRC-WMX-MEDIA"
assert source_id in profiles

# This account was found claim-first outside the original named seed queue.
assert "LEAD-WMX-MEDIA" not in leads
profile = profiles[source_id]
assert profile["display_name"] == "الأحداث الإيرانية / @WMX_MEDIA"
assert profile["primary_platform"] == "X"
assert profile["identity_confidence"] == "HIGH"
assert profile["country_region"] is None
assert profile["behavior_classes"] == ["UNKNOWN"]
assert "real-world operator" in profile["identity_context"]
assert "state-control status are unknown" in profile["identity_context"]
assert "not inferred" in profile["identity_context"]

wmx_ids = {
    "WOL-BS-WMX-US-TANKER-IRANIAN-SHIP-20260309",
    "WOL-BS-WMX-US-BASE-EVACUATION-OLD-VIDEO-20260310",
    "WOL-BS-WMX-UAE-SKYSCRAPER-AI-20260311",
    "WOL-BS-WMX-ISRAEL-INTEL-HQ-QUEENS-FIRE-20260312",
    "WOL-BS-WMX-WAR-THUNDER-MISSILE-20260314",
    "WOL-BS-WMX-EILAT-DAYTONA-20260315",
}
assert wmx_ids <= set(incidents)

for incident_id in wmx_ids:
    row = incidents[incident_id]
    assert row["source_id"] == source_id
    assert row["assertion_kind"] == "MEDIA_PRESENTATION"
    assert row["event_type"] == "UNSUPPORTED_FACTUAL_ASSERTION"
    review = row["evidentiary_support_review"]
    assert review["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert review["supporting_evidence_found"] is False
    assert review["claimant_basis_status"] == "DOES_NOT_SUPPORT_ASSERTION"
    assert len(row["public_receipts"]) >= 2
    assert any(
        receipt["surface"] == "X"
        and receipt["provenance_status"] == "ORIGINAL_URL"
        for receipt in row["public_receipts"]
    )
    assert any(
        receipt["provenance_status"] == "SECONDARY_PRESERVATION"
        for receipt in row["public_receipts"]
    )

# Six source publications, not multiple fact-check reproductions.
assert len({
    incidents[incident_id]["source_information_event_id"]
    for incident_id in wmx_ids
}) == 6

tanker = incidents["WOL-BS-WMX-US-TANKER-IRANIAN-SHIP-20260309"]
assert "Iranian military vessel" in tanker["evidentiary_support_review"]["claimant_basis_note"]
assert "American oil tanker" in tanker["evidentiary_support_review"]["claimant_basis_note"]

evacuation = incidents["WOL-BS-WMX-US-BASE-EVACUATION-OLD-VIDEO-20260310"]
assert "predates the March 2026" in evacuation["evidentiary_support_review"]["claimant_basis_note"]

uae_ai = incidents["WOL-BS-WMX-UAE-SKYSCRAPER-AI-20260311"]
assert "AI-generated" in uae_ai["evidentiary_support_review"]["claimant_basis_note"]
assert "do not infer" in uae_ai["downstream_note"]
assert "@WMX_MEDIA created the video" in uae_ai["downstream_note"]

queens = incidents["WOL-BS-WMX-ISRAEL-INTEL-HQ-QUEENS-FIRE-20260312"]
assert "Queens, New York" in queens["evidentiary_support_review"]["claimant_basis_note"]

war_thunder = incidents["WOL-BS-WMX-WAR-THUNDER-MISSILE-20260314"]
assert "game/simulation footage" in war_thunder["evidentiary_support_review"]["claimant_basis_note"]
assert "do not infer" in war_thunder["downstream_note"]
assert "low-observable or sea-skimming capability" in war_thunder["downstream_note"]

eilat = incidents["WOL-BS-WMX-EILAT-DAYTONA-20260315"]
assert "Daytona Beach, Florida" in eilat["evidentiary_support_review"]["claimant_basis_note"]

awards = profile["source_awards"]
assert len(awards) == 1
award = awards[0]
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualification_start"] == "2026-03-09T00:00:00"
assert award["qualification_end"] == "2026-03-15T00:00:00"
assert award["qualifying_incident_count"] == 6
assert set(award["qualifying_incident_ids"]) == wmx_ids


# Behavior award does not create an operator identity, legacy direct verdict,
# state-control finding, or Hall-of-Shame placement.
assert profile["direct_verdict"] is None
hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert source_id not in hall_ids

print(
    "web-of-lies social influence tranche2i: PASS "
    "wmx_incidents=6 wmx_bullshitter=1 cumulative=6 "
    "claim_first_discovery=1"
)
