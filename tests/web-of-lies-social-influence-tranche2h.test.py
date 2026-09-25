#!/usr/bin/env python3
"""Regression coverage for claim-first discovery of RKM / @rkmtimes."""
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

source_id = "WOL-SRC-RKM-RKMTIMES"
assert source_id in profiles

# RKM is discovered claim-first outside the original named-seed work queue.
assert "LEAD-RKM-RKMTIMES" not in leads
profile = profiles[source_id]
assert profile["display_name"] == "RKM / @rkmtimes"
assert profile["primary_platform"] == "X"
assert profile["identity_confidence"] == "HIGH"
assert profile["country_region"] is None
assert profile["behavior_classes"] == ["UNKNOWN"]
assert "real-world operator" in profile["identity_context"]
assert "not inferred" in profile["identity_context"]

rkm_ids = {
    "WOL-BS-RKM-LINCOLN-SUNK-20260301",
    "WOL-BS-RKM-IRGC-NUCLEAR-TEST-20260303",
    "WOL-BS-RKM-ISRAELIS-FLEEING-20260303",
    "WOL-BS-RKM-USS-FITZGERALD-IRAN-MISSILES-20260304",
    "WOL-BS-RKM-NETANYAHU-INJURED-AI-20260312",
    "WOL-BS-RKM-TEL-AVIV-UKRAINE-VIDEO-20260318",
}
assert rkm_ids <= set(incidents)
source_incidents = [
    row for row in incidents.values()
    if row["source_id"] == source_id
]
assert len(source_incidents) == 6

for incident_id in rkm_ids:
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
        for receipt in row["public_receipts"]
    )
    assert any(
        receipt["provenance_status"] == "SECONDARY_PRESERVATION"
        for receipt in row["public_receipts"]
    )

# Protect the six distinct source-information-event identities; multiple
# fact-check reproductions cannot inflate the award count.
assert len({
    incidents[incident_id]["source_information_event_id"]
    for incident_id in rkm_ids
}) == 6

lincoln = incidents["WOL-BS-RKM-LINCOLN-SUNK-20260301"]
assert "carrier was not hit" in lincoln["evidentiary_support_review"]["claimant_basis_note"]

nuclear = incidents["WOL-BS-RKM-IRGC-NUCLEAR-TEST-20260303"]
assert "1957 U.S. nuclear test in Nevada" in nuclear["evidentiary_support_review"]["claimant_basis_note"]
assert "earthquake" in nuclear["downstream_note"]

fleeing = incidents["WOL-BS-RKM-ISRAELIS-FLEEING-20260303"]
assert "predated the claimed event" in fleeing["evidentiary_support_review"]["claimant_basis_note"]

fitzgerald = incidents["WOL-BS-RKM-USS-FITZGERALD-IRAN-MISSILES-20260304"]
assert "2017 collision off Japan" in fitzgerald["evidentiary_support_review"]["claimant_basis_note"]

injured = incidents["WOL-BS-RKM-NETANYAHU-INJURED-AI-20260312"]
assert "AI-generated" in injured["evidentiary_support_review"]["claimant_basis_note"]
assert "does not infer who generated" in injured["downstream_note"]

tel_aviv = incidents["WOL-BS-RKM-TEL-AVIV-UKRAINE-VIDEO-20260318"]
assert "Russian strikes on Ukraine" in tel_aviv["evidentiary_support_review"]["claimant_basis_note"]
assert "not a blanket claim" in tel_aviv["downstream_note"]

awards = profile["source_awards"]
assert len(awards) == 1
award = awards[0]
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualification_start"] == "2026-03-01T00:00:00"
assert award["qualification_end"] == "2026-03-18T00:00:00"
assert award["qualifying_incident_count"] == 6
assert set(award["qualifying_incident_ids"]) == rkm_ids


# Bullshitter is independently derived behavior. Discovery does not invent an
# operator identity, legacy direct verdict, or Hall-of-Shame placement.
assert profile["direct_verdict"] is None
hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert source_id not in hall_ids

print(
    "web-of-lies social influence tranche2h: PASS "
    "rkm_incidents=6 rkm_bullshitter=1 cumulative=6 "
    "claim_first_discovery=1"
)
