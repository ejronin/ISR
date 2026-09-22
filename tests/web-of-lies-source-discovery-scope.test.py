#!/usr/bin/env python3
"""Regression guard for the active 2026 Iran-war source-discovery boundary."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOV = json.loads((ROOT / "config/web-of-lies-governance.json").read_text(encoding="utf-8"))
DOSSIER = json.loads((ROOT / "data/web-of-lies/source-dossiers.json").read_text(encoding="utf-8"))

scope = GOV["source_discovery_scope"]
assert scope["conflict_scope"] == "IRAN_WAR_2026"
assert scope["out_of_conflict_research_must_not_be_retained_in_active_corpus"] is True
assert scope["qualification_receipts_required"] is True
assert set(scope["materiality_qualification_bases"]) == {
    "LARGE_DIRECT_AUDIENCE",
    "DOCUMENTED_DOWNSTREAM_AMPLIFICATION",
}
assert scope["arbitrary_numeric_follower_threshold_forbidden"] is True
assert "lightweight propagation evidence" in scope["amplifier_behavior_rule"]
assert "Network membership alone proves nothing" in scope["no_guilt_by_network_rule"]
assert scope["megaphone_roster_is_not_award_inheritance"] is True
assert scope["megaphone_cross_awardee_overlap_is_graph_signal"] is True
assert scope["bot_and_country_markers_require_receipts"] is True

# Audience/reach can select a material source for review; it cannot improve or
# worsen truth, deception, Bullshitter qualification, or Hall rank.
prohibited = set(GOV["hall_of_shame"]["prohibited_ranking_inputs"])
assert "follower_count" in prohibited
assert "subscriber_count" in prohibited
assert "raw_impressions" in prohibited
assert "intake materiality evidence only" in scope["reach_is_intake_only"]

profiles = {row["source_id"]: row for row in DOSSIER["source_profiles"]}
incidents = DOSSIER.get("source_behavior_incidents") or []
leads = {row["lead_id"]: row for row in DOSSIER.get("research_leads") or []}

removed_source_ids = {
    "WOL-SRC-GP-PRESSS",
    "WOL-SRC-TACTICAL-TRIBUNE",
    "WOL-SRC-PSYWAR-BUREAU",
    "WOL-SRC-KASHMIR-ENGLISH",
    "WOL-SRC-IRONCLAD-NAVCOM24",
    "WOL-SRC-ZACH-FOR-THE-PEOPLE-FB",
    "WOL-SRC-EL-MARQUES-XD-FB",
}
removed_lead_ids = {
    "LEAD-GP-PRESSS",
    "LEAD-TACTICAL-TRIBUNE",
    "LEAD-PSYWAR-BUREAU",
    "LEAD-KASHMIR-ENGLISH",
    "LEAD-IRONCLAD-NAVCOM24",
    "LEAD-ZACH-FOR-THE-PEOPLE",
    "LEAD-EL-MARQUES-XD",
}
assert not (removed_source_ids & profiles.keys())
assert not (removed_lead_ids & leads.keys())
assert not any(row["source_id"] in removed_source_ids for row in incidents)

expected = {
    "WOL-SRC-RKM-RKMTIMES": "LARGE_DIRECT_AUDIENCE",
    "WOL-SRC-WMX-MEDIA": "LARGE_DIRECT_AUDIENCE",
    "WOL-SRC-ZARDSI": "DOCUMENTED_DOWNSTREAM_AMPLIFICATION",
}
for source_id, basis in expected.items():
    row = profiles[source_id]
    qualification = row["scope_qualification"]
    assert qualification["conflict_scope"] == "IRAN_WAR_2026"
    assert qualification["active_scope"] is True
    assert qualification["qualifying_basis"] == basis
    receipts = qualification["qualification_receipts"]
    assert receipts
    assert all(receipt["source_url"].startswith("https://") for receipt in receipts)
    assert all(receipt["evidence_type"] for receipt in receipts)
    assert all(receipt["evidence_value"] for receipt in receipts)

# The amplification path must be evidence-bearing, not a magic transfer of guilt.
zard = profiles["WOL-SRC-ZARDSI"]["scope_qualification"]
assert any(r["evidence_type"] in {"AMPLIFICATION_CHAIN", "AMPLIFICATION_NETWORK"} for r in zard["qualification_receipts"])
assert all("coordination" not in r.get("evidence_value", "").lower() for r in zard["qualification_receipts"])

print(
    "web-of-lies source discovery scope: PASS "
    "conflict=IRAN_WAR_2026 retained_material_discoveries=3 "
    "off_scope_sources_removed=7 amplifier_liability=own_events_only"
)
