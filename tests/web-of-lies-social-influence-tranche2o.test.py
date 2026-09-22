#!/usr/bin/env python3
"""Regression coverage for claim-first discovery of Ironclad / @NavCom24."""
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

source_id = "WOL-SRC-IRONCLAD-NAVCOM24"
assert source_id in profiles
assert "LEAD-IRONCLAD-NAVCOM24" not in leads

profile = profiles[source_id]
assert profile["display_name"] == "Ironclad / @NavCom24"
assert profile["primary_platform"] == "X"
assert profile["identity_confidence"] == "HIGH"
assert profile["country_region"] is None
assert profile["behavior_classes"] == ["UNKNOWN"]
assert {"Ironclad", "@NavCom24", "NavCom24"} <= set(profile["aliases"])
assert "does not infer" in profile["identity_context"]
assert "nationality" in profile["identity_context"]
assert "state direction" in profile["identity_context"]
assert "remain unknown" in profile["identity_context"]

claim_ids = {
    "WOL-BS-IRONCLAD-UDHAMPUR-NINE-COMMANDOS-20240428",
    "WOL-BS-IRONCLAD-UDHAMPUR-COLONEL-KIDNAPPED-20240429",
    "WOL-BS-IRONCLAD-KULGAM-SIX-SOG-20240507",
    "WOL-BS-IRONCLAD-KASHMIR-FLAG-OLD-VIDEO-20240512",
    "WOL-BS-IRONCLAD-BRIGADIER-MANSION-CORRUPTION-20240522",
    "WOL-BS-IRONCLAD-PLA-CAPTURES-THREE-20240526",
}
assert claim_ids <= set(incidents)
source_rows = [row for row in incidents.values() if row["source_id"] == source_id]
assert len(source_rows) == 6

for incident_id in claim_ids:
    row = incidents[incident_id]
    review = row["evidentiary_support_review"]
    assert review["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert review["supporting_evidence_found"] is False
    assert any(
        receipt["surface"] == "X"
        and receipt["provenance_status"] == "ORIGINAL_URL"
        for receipt in row["public_receipts"]
    )
    assert any(
        receipt["provenance_status"] == "SECONDARY_PRESERVATION"
        for receipt in row["public_receipts"]
    )

# Six publications = six incidents. Multiple factual clauses inside one post
# never inflate the award count.
assert len({
    incidents[incident_id]["source_information_event_id"]
    for incident_id in claim_ids
}) == 6

udhampur = incidents["WOL-BS-IRONCLAD-UDHAMPUR-NINE-COMMANDOS-20240428"]
assert "Village Defence Guard" in udhampur["evidentiary_support_review"]["claimant_basis_note"]
assert "casualty/unit conversion" in udhampur["evidentiary_support_review"]["search_notes"]

colonel = incidents["WOL-BS-IRONCLAD-UDHAMPUR-COLONEL-KIDNAPPED-20240429"]
assert colonel["evidentiary_support_review"]["claimant_basis_status"] == "ASSERTION_ONLY"
assert "search operation was real" in colonel["evidentiary_support_review"]["claimant_basis_note"]
assert "positive officer-kidnapping assertion" in colonel["evidentiary_support_review"]["search_notes"]

kulgam = incidents["WOL-BS-IRONCLAD-KULGAM-SIX-SOG-20240507"]
assert "two militants killed" in kulgam["evidentiary_support_review"]["claimant_basis_note"]
assert "counts once" in kulgam["evidentiary_support_review"]["search_notes"]

old_video = incidents["WOL-BS-IRONCLAD-KASHMIR-FLAG-OLD-VIDEO-20240512"]
assert old_video["assertion_kind"] == "MEDIA_PRESENTATION"
assert "September 2017" in old_video["evidentiary_support_review"]["claimant_basis_note"]
assert any(
    receipt["surface"] == "YOUTUBE"
    and receipt["url"] == "https://www.youtube.com/watch?v=T9BXhYVqj8U"
    for receipt in old_video["public_receipts"]
)

brigadier = incidents["WOL-BS-IRONCLAD-BRIGADIER-MANSION-CORRUPTION-20240522"]
assert brigadier["assertion_kind"] == "MEDIA_PRESENTATION"
assert "2023 Army Chief visit" in brigadier["evidentiary_support_review"]["claimant_basis_note"]
assert any(
    "hindustantimes.com" in receipt["url"]
    for receipt in brigadier["public_receipts"]
)

pla = incidents["WOL-BS-IRONCLAD-PLA-CAPTURES-THREE-20240526"]
assert pla["evidentiary_support_review"]["claimant_basis_status"] == "ASSERTION_ONLY"
assert "no evidentiary support" in pla["evidentiary_support_review"]["claimant_basis_note"]
assert "absence of disproof" in pla["evidentiary_support_review"]["search_notes"]

expected_x_urls = {
    "https://x.com/NavCom24/status/1784589654907363745",
    "https://x.com/NavCom24/status/1784862867268776178",
    "https://x.com/NavCom24/status/1787743197268988329",
    "https://x.com/NavCom24/status/1789569284663914804",
    "https://x.com/NavCom24/status/1793188180562207054",
    "https://x.com/NavCom24/status/1794718577045704978",
}
actual_x_urls = {
    receipt["url"]
    for incident_id in claim_ids
    for receipt in incidents[incident_id]["public_receipts"]
    if receipt["surface"] == "X"
}
assert actual_x_urls == expected_x_urls

# Source publication dates are the X-post dates, not the later fact-check dates.
assert sorted(incidents[row]["published_at"] for row in claim_ids) == [
    "2024-04-28",
    "2024-04-29",
    "2024-05-07",
    "2024-05-12",
    "2024-05-22",
    "2024-05-26",
]

award_rows = profile["source_awards"]
assert len(award_rows) == 1
award = award_rows[0]
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualifying_window_start"] == "2024-04-28T00:00:00"
assert award["qualifying_window_end"] == "2024-05-26T00:00:00"
assert award["qualifying_incident_count"] == 6
assert set(award["qualifying_incident_ids"]) == claim_ids
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
    "web-of-lies social influence tranche2o: PASS "
    "ironclad_incidents=6 ironclad_bullshitter=1 "
    "window=2024-04-28..2024-05-26 claim_first_discovery=1"
)
