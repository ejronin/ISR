#!/usr/bin/env python3
"""Regression coverage for claim-first discovery of Iran Press / News Now / @GP_Presss."""
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

source_id = "WOL-SRC-GP-PRESSS"
assert source_id in profiles
assert "LEAD-GP-PRESSS" not in leads

profile = profiles[source_id]
assert profile["display_name"] == "Iran Press / News Now / @GP_Presss"
assert profile["primary_platform"] == "X"
assert profile["identity_confidence"] == "HIGH"
assert profile["country_region"] is None
assert profile["behavior_classes"] == ["UNKNOWN"]
assert {"Iran Press", "News Now", "@GP_Presss"} <= set(profile["aliases"])
assert "does not establish Iranian state ownership" in profile["identity_context"]
assert "remain unknown" in profile["identity_context"]

gp_ids = {
    "WOL-BS-GP-SUPER-MISSILE-AI-20260309",
    "WOL-BS-GP-NETANYAHU-INJURED-AI-20260312",
    "WOL-BS-GP-DELHI-DRONE-FACILITY-20260312",
    "WOL-BS-GP-INDIAN-SPY-AI-20260312",
    "WOL-BS-GP-INDIAN-TANKER-AI-20260313",
    "WOL-BS-GP-LINCOLN-AI-20260317",
}
assert gp_ids <= set(incidents)

source_rows = [row for row in incidents.values() if row["source_id"] == source_id]
assert len(source_rows) == 6

for incident_id in gp_ids:
    row = incidents[incident_id]
    assert row["source_id"] == source_id
    assert row["event_type"] == "UNSUPPORTED_FACTUAL_ASSERTION"
    assert row["assertion_kind"] == "MEDIA_PRESENTATION"
    review = row["evidentiary_support_review"]
    assert review["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert review["supporting_evidence_found"] is False
    assert review["claimant_basis_status"] == "DOES_NOT_SUPPORT_ASSERTION"
    assert any(receipt["surface"] == "X" for receipt in row["public_receipts"])
    assert any(
        receipt["provenance_status"] == "SECONDARY_PRESERVATION"
        for receipt in row["public_receipts"]
    )

# When the exact X URL is unavailable, provenance stays explicit rather than
# inventing an original link.
for incident_id in gp_ids:
    x_receipts = [
        receipt for receipt in incidents[incident_id]["public_receipts"]
        if receipt["surface"] == "X"
    ]
    assert x_receipts
    assert all(
        receipt["provenance_status"] == "SECONDARY_EMBED_PRESERVATION"
        for receipt in x_receipts
    )
    assert all(receipt.get("url") is None for receipt in x_receipts)

# Six publications = six incidents, despite three occurring on March 12.
assert len({
    incidents[incident_id]["source_information_event_id"]
    for incident_id in gp_ids
}) == 6

super_missile = incidents["WOL-BS-GP-SUPER-MISSILE-AI-20260309"]
assert "AI-generated" in super_missile["evidentiary_support_review"]["claimant_basis_note"]
assert "designation is not itself scored" in super_missile["evidentiary_support_review"]["search_notes"]

netanyahu = incidents["WOL-BS-GP-NETANYAHU-INJURED-AI-20260312"]
assert "AI-generated" in netanyahu["evidentiary_support_review"]["claimant_basis_note"]

delhi = incidents["WOL-BS-GP-DELHI-DRONE-FACILITY-20260312"]
assert "fish-market/slum" in delhi["evidentiary_support_review"]["claimant_basis_note"]
assert "defense-facility attack" in delhi["evidentiary_support_review"]["search_notes"]

spy = incidents["WOL-BS-GP-INDIAN-SPY-AI-20260312"]
assert "AI-generated" in spy["evidentiary_support_review"]["claimant_basis_note"]
assert "do not infer" in spy["downstream_note"]

tanker = incidents["WOL-BS-GP-INDIAN-TANKER-AI-20260313"]
assert "synthetic" in tanker["evidentiary_support_review"]["claimant_basis_note"]
assert "Carrier-style wording does not itself qualify" in tanker["downstream_note"]

lincoln = incidents["WOL-BS-GP-LINCOLN-AI-20260317"]
assert "AI-created" in lincoln["evidentiary_support_review"]["claimant_basis_note"]
assert "carrier speech is not scored" in lincoln["evidentiary_support_review"]["search_notes"]
assert "Do not score the mere existence/reporting of a rumor" in lincoln["downstream_note"]
assert "false media presentation only" in lincoln["downstream_note"]

awards = profile["source_awards"]
assert len(awards) == 1
award = awards[0]
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualifying_window_start"] == "2026-03-09T00:00:00"
assert award["qualifying_window_end"] == "2026-03-17T00:00:00"
assert award["qualifying_incident_count"] == 6
assert set(award["qualifying_incident_ids"]) == gp_ids
assert award["current_window_status"] == "EARNED_HISTORICAL"
assert award["currently_active"] is False
assert award["current_window_incident_count"] == 0
assert award["current_window_incident_ids"] == []

assert profile["direct_verdict"] is None
hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert source_id not in hall_ids

print(
    "web-of-lies social influence tranche2j: PASS "
    "gp_presss_incidents=6 gp_presss_bullshitter=1 "
    "window=2026-03-09..2026-03-17 claim_first_discovery=1"
)
