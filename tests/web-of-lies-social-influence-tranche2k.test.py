#!/usr/bin/env python3
"""Regression coverage for claim-first discovery of Zard si Gana / @ZardSi."""
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

source_id = "WOL-SRC-ZARDSI"
assert source_id in profiles
assert "LEAD-ZARDSI" not in leads

profile = profiles[source_id]
assert profile["display_name"] == "Zard si Gana / @ZardSi"
assert profile["primary_platform"] == "X"
assert profile["identity_confidence"] == "HIGH"
assert profile["country_region"] is None
assert profile["behavior_classes"] == ["UNKNOWN"]
assert {"Zard si Gana", "@ZardSi", "ZardSi"} <= set(profile["aliases"])
assert "does not infer" in profile["identity_context"]
assert "remain unknown" in profile["identity_context"]
assert "state direction" in profile["identity_context"]

zard_ids = {
    "WOL-BS-ZARDSI-NETANYAHU-TALIBAN-DEEPFAKE-20260226",
    "WOL-BS-ZARDSI-NETANYAHU-BERLIN-20260302",
    "WOL-BS-ZARDSI-TELAVIV-OLD-VIDEO-20260305",
    "WOL-BS-ZARDSI-KRAKOW-FLEEING-ISRAELIS-20260309",
    "WOL-BS-ZARDSI-DELHI-DEFENCE-FACILITY-20260312",
    "WOL-BS-ZARDSI-DIMONA-INDIAN-ARREST-20260322",
}
assert zard_ids <= set(incidents)

source_rows = [row for row in incidents.values() if row["source_id"] == source_id]
assert len(source_rows) == 6

for incident_id in zard_ids:
    row = incidents[incident_id]
    review = row["evidentiary_support_review"]
    assert review["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert review["supporting_evidence_found"] is False
    assert review["claimant_basis_status"] in {
        "DOES_NOT_SUPPORT_ASSERTION",
        "ASSERTION_ONLY",
    }
    assert row["public_receipts"]
    assert any(
        receipt["provenance_status"] == "SECONDARY_PRESERVATION"
        for receipt in row["public_receipts"]
    )

# Six publications = six award incidents. Multiple statements inside one post
# do not inflate the counter.
assert len({
    incidents[incident_id]["source_information_event_id"]
    for incident_id in zard_ids
}) == 6

taliban = incidents["WOL-BS-ZARDSI-NETANYAHU-TALIBAN-DEEPFAKE-20260226"]
assert taliban["assertion_kind"] == "MEDIA_PRESENTATION"
assert "synthetically altered" in taliban["evidentiary_support_review"]["claimant_basis_note"]
assert "does not infer that @ZardSi created" in taliban["evidentiary_support_review"]["search_notes"]

berlin = incidents["WOL-BS-ZARDSI-NETANYAHU-BERLIN-20260302"]
assert "Wing of Zion" in berlin["evidentiary_support_review"]["claimant_basis_note"]
assert "hacked-database" in berlin["evidentiary_support_review"]["search_notes"]

tel_aviv = incidents["WOL-BS-ZARDSI-TELAVIV-OLD-VIDEO-20260305"]
assert tel_aviv["assertion_kind"] == "MEDIA_PRESENTATION"
assert "outdated" in tel_aviv["evidentiary_support_review"]["claimant_basis_note"]
assert "not separately scored" in tel_aviv["evidentiary_support_review"]["search_notes"]

krakow = incidents["WOL-BS-ZARDSI-KRAKOW-FLEEING-ISRAELIS-20260309"]
assert krakow["published_at"] == "2026-03-09"
krakow_receipts = {row["receipt_id"]: row for row in krakow["public_receipts"]}
assert krakow_receipts["WOL-BS-RCPT-ZARDSI-KRAKOW-ISRAELHAYOM"]["published_at"] == "2026-01-27"
assert "return to Israel" in krakow["evidentiary_support_review"]["claimant_basis_note"]
assert "harassment incident was real" in krakow["evidentiary_support_review"]["search_notes"]

delhi = incidents["WOL-BS-ZARDSI-DELHI-DEFENCE-FACILITY-20260312"]
assert delhi["assertion_kind"] == "MEDIA_PRESENTATION"
assert "Machhli Mandi" in delhi["evidentiary_support_review"]["claimant_basis_note"]
assert "hedged casualty wording" in delhi["evidentiary_support_review"]["search_notes"]

dimona = incidents["WOL-BS-ZARDSI-DIMONA-INDIAN-ARREST-20260322"]
assert dimona["assertion_kind"] == "FACTUAL_ASSERTION"
assert "Real Iranian strike damage" in dimona["evidentiary_support_review"]["claimant_basis_note"]
assert "Absence of disproof alone would not be enough" in dimona["evidentiary_support_review"]["search_notes"]

# Exact original status URLs are preserved when they were recoverable; WOL does
# not invent missing IDs or infer operator identity from secondary labels.
for incident_id in zard_ids:
    x_receipts = [
        receipt for receipt in incidents[incident_id]["public_receipts"]
        if receipt["surface"] == "X"
    ]
    assert x_receipts
    assert all(receipt["url"] for receipt in x_receipts)
    assert all(
        receipt["provenance_status"] == "ORIGINAL_URL"
        for receipt in x_receipts
    )

award_rows = profile["source_awards"]
assert len(award_rows) == 1
award = award_rows[0]
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualifying_window_start"] == "2026-02-26T00:00:00"
assert award["qualifying_window_end"] == "2026-03-22T00:00:00"
assert award["qualifying_incident_count"] == 6
assert set(award["qualifying_incident_ids"]) == zard_ids
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
    "web-of-lies social influence tranche2k: PASS "
    "zardsi_incidents=6 zardsi_bullshitter=1 "
    "window=2026-02-26..2026-03-22 claim_first_discovery=1"
)
