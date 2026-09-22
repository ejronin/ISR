#!/usr/bin/env python3
"""Regression coverage for claim-first discovery of Tactical Tribune / @TacticalTribun."""
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

source_id = "WOL-SRC-TACTICAL-TRIBUNE"
assert source_id in profiles
assert "LEAD-TACTICAL-TRIBUNE" not in leads

profile = profiles[source_id]
assert profile["display_name"] == "Tactical Tribune / @TacticalTribun"
assert profile["primary_platform"] == "X"
assert profile["identity_confidence"] == "HIGH"
assert profile["country_region"] is None
assert profile["behavior_classes"] == ["UNKNOWN"]
assert {"Tactical Tribune", "@TacticalTribun", "TacticalTribun"} <= set(profile["aliases"])
assert "does not infer" in profile["identity_context"]
assert "nationality" in profile["identity_context"]
assert "state direction" in profile["identity_context"]
assert "remain unknown" in profile["identity_context"]

tactical_ids = {
    "WOL-BS-TACTICAL-UDHAMPUR-MILITANT-CASUALTIES-20250219",
    "WOL-BS-TACTICAL-FRANCE-METEOR-TURKEY-20250224",
    "WOL-BS-TACTICAL-RAJOURI-CONVOY-CASUALTIES-20250226",
    "WOL-BS-TACTICAL-JAFFAR-INDIAN-BACKED-BLA-20250312",
    "WOL-BS-TACTICAL-AMRITSAR-KHALISTANI-GRENADE-20250317",
    "WOL-BS-TACTICAL-KUPWARA-FOUR-SOLDIERS-20250317",
}
assert tactical_ids <= set(incidents)

source_rows = [row for row in incidents.values() if row["source_id"] == source_id]
assert len(source_rows) == 6

for incident_id in tactical_ids:
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

# Six publications = six award incidents. Multiple clauses or receipts inside a
# post do not inflate the counter.
assert len({
    incidents[incident_id]["source_information_event_id"]
    for incident_id in tactical_ids
}) == 6

udhampur = incidents["WOL-BS-TACTICAL-UDHAMPUR-MILITANT-CASUALTIES-20250219"]
assert "death by suicide" in udhampur["evidentiary_support_review"]["claimant_basis_note"]
assert "does not support" in udhampur["evidentiary_support_review"]["search_notes"]

meteor = incidents["WOL-BS-TACTICAL-FRANCE-METEOR-TURKEY-20250224"]
assert "France was not selling" in meteor["evidentiary_support_review"]["claimant_basis_note"]
assert "real Turkish interest" in meteor["evidentiary_support_review"]["search_notes"]

rajouri = incidents["WOL-BS-TACTICAL-RAJOURI-CONVOY-CASUALTIES-20250226"]
assert "underlying firing incident was real" in rajouri["evidentiary_support_review"]["claimant_basis_note"]
assert "invented casualty outcome" in rajouri["evidentiary_support_review"]["search_notes"]

jaffar = incidents["WOL-BS-TACTICAL-JAFFAR-INDIAN-BACKED-BLA-20250312"]
assert "BLA militants" in jaffar["evidentiary_support_review"]["claimant_basis_note"]
assert "unsupported actor-affiliation assertion" in jaffar["evidentiary_support_review"]["search_notes"]

amritsar = incidents["WOL-BS-TACTICAL-AMRITSAR-KHALISTANI-GRENADE-20250317"]
assert amritsar["assertion_kind"] == "MEDIA_PRESENTATION"
assert "grenade attack itself was real" in amritsar["evidentiary_support_review"]["claimant_basis_note"]
assert "unsupported perpetrator identity" in amritsar["evidentiary_support_review"]["search_notes"]

kupwara = incidents["WOL-BS-TACTICAL-KUPWARA-FOUR-SOLDIERS-20250317"]
assert kupwara["assertion_kind"] == "MEDIA_PRESENTATION"
assert "one militant killed" in kupwara["evidentiary_support_review"]["claimant_basis_note"]
assert "do not establish" in kupwara["evidentiary_support_review"]["search_notes"]

# DFRAC pages expose exact source-post links; preserve those identifiers rather
# than inventing or reducing them to fact-check-only provenance.
expected_x_urls = {
    "https://x.com/TacticalTribun/status/1891882515293491272",
    "https://x.com/TacticalTribun/status/1893667614590730434",
    "https://x.com/TacticalTribun/status/1894728864988832090",
    "https://x.com/TacticalTribun/status/1899495697059094730",
    "https://x.com/TacticalTribun/status/1900837716696219677",
    "https://x.com/TacticalTribun/status/1901498069616566435",
}
actual_x_urls = {
    receipt["url"]
    for incident_id in tactical_ids
    for receipt in incidents[incident_id]["public_receipts"]
    if receipt["surface"] == "X"
}
assert actual_x_urls == expected_x_urls

award_rows = profile["source_awards"]
assert len(award_rows) == 1
award = award_rows[0]
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualifying_window_start"] == "2025-02-19T00:00:00"
assert award["qualifying_window_end"] == "2025-03-17T00:00:00"
assert award["qualifying_incident_count"] == 6
assert set(award["qualifying_incident_ids"]) == tactical_ids
assert award["current_window_status"] == "EARNED_HISTORICAL"
assert award["currently_active"] is False
assert award["current_window_incident_count"] == 0
assert award["current_window_incident_ids"] == []

# The source-wide award does not silently create legacy direct-verdict/Hall
# classification or infer operator/control identity.
assert profile["direct_verdict"] is None
hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert source_id not in hall_ids

print(
    "web-of-lies social influence tranche2l: PASS "
    "tactical_incidents=6 tactical_bullshitter=1 "
    "window=2025-02-19..2025-03-17 claim_first_discovery=1"
)
