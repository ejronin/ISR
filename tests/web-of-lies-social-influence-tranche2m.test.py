#!/usr/bin/env python3
"""Regression coverage for claim-first discovery of PSYWAR Bureau / @PSYWAROPS."""
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

source_id = "WOL-SRC-PSYWAR-BUREAU"
assert source_id in profiles
assert "LEAD-PSYWAR-BUREAU" not in leads

profile = profiles[source_id]
assert profile["display_name"] == "PSYWAR Bureau / @PSYWAROPS"
assert profile["primary_platform"] == "X"
assert profile["identity_confidence"] == "HIGH"
assert profile["country_region"] is None
assert profile["behavior_classes"] == ["UNKNOWN"]
assert {"PSYWAR Bureau", "@PSYWAROPS", "PSYWAROPS"} <= set(profile["aliases"])
assert "does not infer" in profile["identity_context"]
assert "nationality" in profile["identity_context"]
assert "state direction" in profile["identity_context"]
assert "remain unknown" in profile["identity_context"]

psywar_ids = {
    "WOL-BS-PSYWAR-CRPF-ASI-MILITANT-KILL-20250206",
    "WOL-BS-PSYWAR-IAF-SIKH-PUSH-20250209",
    "WOL-BS-PSYWAR-NAGPUR-SBL-SIKH-MISSING-20250216",
    "WOL-BS-PSYWAR-F35-AMCA-TRAP-20250220",
    "WOL-BS-PSYWAR-CANADA-TOP-THREAT-20250301",
    "WOL-BS-PSYWAR-GWALIOR-RAW-DEPUTY-DIRECTOR-20250305",
}
assert psywar_ids <= set(incidents)

source_rows = [row for row in incidents.values() if row["source_id"] == source_id]
assert len(source_rows) == 6

for incident_id in psywar_ids:
    row = incidents[incident_id]
    review = row["evidentiary_support_review"]
    assert review["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert review["supporting_evidence_found"] is False
    assert review["claimant_basis_status"] == "DOES_NOT_SUPPORT_ASSERTION"
    assert row["public_receipts"]
    assert any(
        receipt["provenance_status"] == "ORIGINAL_URL"
        and receipt["surface"] == "X"
        for receipt in row["public_receipts"]
    )
    assert any(
        receipt["provenance_status"] == "SECONDARY_PRESERVATION"
        for receipt in row["public_receipts"]
    )

# Six publications = six award incidents. Multiple false clauses inside a post
# remain one information event.
assert len({
    incidents[incident_id]["source_information_event_id"]
    for incident_id in psywar_ids
}) == 6

crpf = incidents["WOL-BS-PSYWAR-CRPF-ASI-MILITANT-KILL-20250206"]
assert "heart attack" in crpf["evidentiary_support_review"]["claimant_basis_note"]
assert "real CRPF death" in crpf["evidentiary_support_review"]["search_notes"]

iaf = incidents["WOL-BS-PSYWAR-IAF-SIKH-PUSH-20250209"]
assert "parachute failed" in iaf["evidentiary_support_review"]["claimant_basis_note"]
assert "communal motive" in iaf["evidentiary_support_review"]["search_notes"]

nagpur = incidents["WOL-BS-PSYWAR-NAGPUR-SBL-SIKH-MISSING-20250216"]
assert nagpur["assertion_kind"] == "MEDIA_PRESENTATION"
assert "Asian Fireworks" in nagpur["evidentiary_support_review"]["claimant_basis_note"]
assert "false facility identity" in nagpur["evidentiary_support_review"]["search_notes"]

f35 = incidents["WOL-BS-PSYWAR-F35-AMCA-TRAP-20250220"]
assert f35["assertion_kind"] == "MEDIA_PRESENTATION"
assert "no identified Indian Air Force officer statement" in f35["evidentiary_support_review"]["claimant_basis_note"]
assert "does not authenticate" in f35["evidentiary_support_review"]["search_notes"]

canada = incidents["WOL-BS-PSYWAR-CANADA-TOP-THREAT-20250301"]
assert "PRC" in canada["evidentiary_support_review"]["claimant_basis_note"]
assert "serious Canadian concerns" in canada["evidentiary_support_review"]["search_notes"]

gwalior = incidents["WOL-BS-PSYWAR-GWALIOR-RAW-DEPUTY-DIRECTOR-20250305"]
assert "two injured" in gwalior["evidentiary_support_review"]["claimant_basis_note"]
assert "intelligence-official identity claim" in gwalior["evidentiary_support_review"]["search_notes"]

expected_x_urls = {
    "https://x.com/PSYWAROPS/status/1887579201211154689",
    "https://x.com/PSYWAROPS/status/1888597878006026579",
    "https://x.com/PSYWAROPS/status/1891173875083333986",
    "https://x.com/PSYWAROPS/status/1892629076948418628",
    "https://x.com/PSYWAROPS/status/1895827230770807101",
    "https://x.com/PSYWAROPS/status/1897219692475113505",
}
actual_x_urls = {
    receipt["url"]
    for incident_id in psywar_ids
    for receipt in incidents[incident_id]["public_receipts"]
    if receipt["surface"] == "X"
}
assert actual_x_urls == expected_x_urls

award_rows = profile["source_awards"]
assert len(award_rows) == 1
award = award_rows[0]
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualifying_window_start"] == "2025-02-06T00:00:00"
assert award["qualifying_window_end"] == "2025-03-05T00:00:00"
assert award["qualifying_incident_count"] == 6
assert set(award["qualifying_incident_ids"]) == psywar_ids
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
    "web-of-lies social influence tranche2m: PASS "
    "psywar_incidents=6 psywar_bullshitter=1 "
    "window=2025-02-06..2025-03-05 claim_first_discovery=1"
)
