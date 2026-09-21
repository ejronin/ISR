#!/usr/bin/env python3
"""Regression coverage for MeidasTouch repeated absolute-claim behavior."""
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

meidas_ids = {
    "WOL-BS-MEIDAS-SEVEN-TANKERS-DESTROYED-20260717",
    "WOL-BS-MEIDAS-OUT-PATRIOT-THAAD-OBLITERATED-BASES-20260802",
    "WOL-BS-MEIDAS-OUT-PATRIOT-THAAD-DESTROYERS-20260804",
    "WOL-BS-MEIDAS-RAN-OUT-ALL-WEAPONS-20260807",
    "WOL-BS-MEIDAS-RAN-OUT-WEAPONS-ABANDONED-BASES-20260811",
    "WOL-BS-MEIDAS-US-BASES-ARE-DESTROYED-20260815",
}
assert meidas_ids <= set(incidents)

for incident_id in meidas_ids:
    row = incidents[incident_id]
    assert row["source_id"] == "WOL-SRC-MEIDASTOUCH"
    assert row["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert row["evidentiary_support_review"]["supporting_evidence_found"] is False
    assert row["public_receipts"]

# Preserve the substrate/conclusion distinction. WOL is not denying the war
# produced severe U.S. losses, depletion or base damage.
assert "seven-vessel attack count" in incidents[
    "WOL-BS-MEIDAS-SEVEN-TANKERS-DESTROYED-20260717"
]["evidentiary_support_review"]["search_notes"]
assert "severe depletion" in incidents[
    "WOL-BS-MEIDAS-OUT-PATRIOT-THAAD-OBLITERATED-BASES-20260802"
]["evidentiary_support_review"]["claimant_basis_note"]
meidas_all_weapons_basis = incidents[
    "WOL-BS-MEIDAS-RAN-OUT-ALL-WEAPONS-20260807"
]["evidentiary_support_review"]["claimant_basis_note"]
assert "serious shortages in specified systems" in meidas_all_weapons_basis
assert "not exhaustion of all U.S. weapons" in meidas_all_weapons_basis
assert "Bahrain logistics hub" in incidents[
    "WOL-BS-MEIDAS-US-BASES-ARE-DESTROYED-20260815"
]["evidentiary_support_review"]["claimant_basis_note"]

# Six distinct publications in a 29-day span earn the persistent award.
award_list = profiles["WOL-SRC-MEIDASTOUCH"]["source_awards"]
assert len(award_list) == 1
award = award_list[0]
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualifying_window_start"] == "2026-07-17T00:00:00"
assert award["qualifying_window_end"] == "2026-08-15T00:00:00"
assert award["qualifying_incident_count"] == 6
assert set(award["qualifying_incident_ids"]) == meidas_ids
assert award["current_window_status"] == "EARNED_HISTORICAL"
assert award["currently_active"] is False
assert award["current_window_incident_count"] == 0
assert award["current_window_incident_ids"] == []

# The older Jul. 12 broad-destruction discovery is deliberately not needed to
# reach the threshold and therefore cannot be silently counted as a seventh
# native incident without its own promotion.
assert "WOL-BS-MEIDAS-MULTIPLE-US-BASES-DESTROYED-20260712" not in incidents
assert leads["LEAD-MEIDASTOUCH"]["current_disposition"] == "MATERIAL_WOL_HISTORY_FOUND"

# Award remains independent of legacy direct-verdict/Hall scoring.
meidas = profiles["WOL-SRC-MEIDASTOUCH"]
assert meidas["direct_verdict"] is None
hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert "WOL-SRC-MEIDASTOUCH" not in hall_ids

print(
    "web-of-lies social influence tranche2d: PASS "
    "meidas_bullshitter=1 earning_incidents=6 window_days=29"
)
