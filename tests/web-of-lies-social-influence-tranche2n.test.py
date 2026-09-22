#!/usr/bin/env python3
"""Regression coverage for claim-first discovery of Kashmir English / @KashmirEng."""
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

source_id = "WOL-SRC-KASHMIR-ENGLISH"
assert source_id in profiles
assert "LEAD-KASHMIR-ENGLISH" not in leads

profile = profiles[source_id]
assert profile["display_name"] == "Kashmir English / @KashmirEng"
assert profile["primary_platform"] == "X"
assert profile["identity_confidence"] == "HIGH"
assert profile["country_region"] is None
assert profile["behavior_classes"] == ["UNKNOWN"]
assert {"Kashmir English", "@KashmirEng", "KashmirEng"} <= set(profile["aliases"])
assert "does not infer" in profile["identity_context"]
assert "nationality" in profile["identity_context"]
assert "state direction" in profile["identity_context"]
assert "remain unknown" in profile["identity_context"]

claim_ids = {
    "WOL-BS-KASHMIRENG-BANGLADESH-VISAS-20250107",
    "WOL-BS-KASHMIRENG-25000-DEPORTED-20250113",
    "WOL-BS-KASHMIRENG-RUSSIA-TRADE-HALT-20250115",
    "WOL-BS-KASHMIRENG-PANNUN-SPECIAL-GUEST-20250122",
    "WOL-BS-KASHMIRENG-ABVP-STALE-MANDATE-20250127",
    "WOL-BS-KASHMIRENG-POONCH-FALSE-FLAG-YOUTHS-20250131",
}
assert claim_ids <= set(incidents)
source_rows = [row for row in incidents.values() if row["source_id"] == source_id]
assert len(source_rows) == 6

for incident_id in claim_ids:
    row = incidents[incident_id]
    review = row["evidentiary_support_review"]
    assert review["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert review["supporting_evidence_found"] is False
    assert review["claimant_basis_status"] == "DOES_NOT_SUPPORT_ASSERTION"
    assert any(
        receipt["surface"] == "X"
        and receipt["provenance_status"] == "ORIGINAL_URL"
        for receipt in row["public_receipts"]
    )
    assert any(
        receipt["provenance_status"] == "SECONDARY_PRESERVATION"
        for receipt in row["public_receipts"]
    )

# Six publications = six incidents, even where one publication contains
# multiple unsupported clauses.
assert len({
    incidents[incident_id]["source_information_event_id"]
    for incident_id in claim_ids
}) == 6

visas = incidents["WOL-BS-KASHMIRENG-BANGLADESH-VISAS-20250107"]
assert "medical and emergency visas continued" in visas["evidentiary_support_review"]["claimant_basis_note"]
assert "political/human-rights opinion" in visas["evidentiary_support_review"]["search_notes"]

deport = incidents["WOL-BS-KASHMIRENG-25000-DEPORTED-20250113"]
assert "had already deported 25,000" in deport["evidentiary_support_review"]["claimant_basis_note"]
assert "mass-deportation claim" in deport["evidentiary_support_review"]["search_notes"]

trade = incidents["WOL-BS-KASHMIRENG-RUSSIA-TRADE-HALT-20250115"]
assert "wind-down period" in trade["evidentiary_support_review"]["claimant_basis_note"]
assert "qualifier-stripping" in trade["evidentiary_support_review"]["search_notes"]

pannun = incidents["WOL-BS-KASHMIRENG-PANNUN-SPECIAL-GUEST-20250122"]
assert pannun["assertion_kind"] == "MEDIA_PRESENTATION"
assert "not an invited special guest" in pannun["evidentiary_support_review"]["claimant_basis_note"]
assert "does not establish official invitation" in pannun["evidentiary_support_review"]["search_notes"]

abvp = incidents["WOL-BS-KASHMIRENG-ABVP-STALE-MANDATE-20250127"]
assert abvp["assertion_kind"] == "MEDIA_PRESENTATION"
assert "earlier Poonch directive was real" in abvp["evidentiary_support_review"]["claimant_basis_note"]
assert "January 25" in abvp["evidentiary_support_review"]["claimant_basis_note"]
assert "does not claim the original directive was fabricated" in abvp["evidentiary_support_review"]["search_notes"]
assert "stale/current-status presentation" in abvp["evidentiary_support_review"]["search_notes"]
assert any(
    "newindianexpress.com" in receipt["url"]
    for receipt in abvp["public_receipts"]
)

poonch = incidents["WOL-BS-KASHMIRENG-POONCH-FALSE-FLAG-YOUTHS-20250131"]
assert "armed firefight" in poonch["evidentiary_support_review"]["claimant_basis_note"]
assert "false-flag" in poonch["evidentiary_support_review"]["search_notes"]

expected_x_urls = {
    "https://x.com/KashmirEng/status/1876734371559800980",
    "https://x.com/KashmirEng/status/1878916304532570123",
    "https://x.com/KashmirEng/status/1879537830864863294",
    "https://x.com/KashmirEng/status/1881985368880492686",
    "https://x.com/KashmirEng/status/1884008458728661307",
    "https://x.com/KashmirEng/status/1885261329055048021",
}
actual_x_urls = {
    receipt["url"]
    for incident_id in claim_ids
    for receipt in incidents[incident_id]["public_receipts"]
    if receipt["surface"] == "X"
}
assert actual_x_urls == expected_x_urls

award_rows = profile["source_awards"]
assert len(award_rows) == 1
award = award_rows[0]
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualifying_window_start"] == "2025-01-07T00:00:00"
assert award["qualifying_window_end"] == "2025-01-31T00:00:00"
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
    "web-of-lies social influence tranche2n: PASS "
    "kashmir_english_incidents=6 kashmir_english_bullshitter=1 "
    "window=2025-01-07..2025-01-31 claim_first_discovery=1"
)
