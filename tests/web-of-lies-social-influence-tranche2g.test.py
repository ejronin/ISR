#!/usr/bin/env python3
"""Regression coverage for Lim Tean's completed WOL pattern review."""
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

lim_ids = {
    "WOL-BS-LIM-TEAN-BINARY-CONTROL-20260708",
    "WOL-BS-LIM-TEAN-NEVER-REOPENED-20260710",
    "WOL-BS-LIM-TEAN-WAR-TO-STOP-TOLLS-20260713",
    "WOL-BS-LIM-TEAN-HORMUZ-CAUSALITY-20260720",
    "WOL-BS-LIM-TEAN-INSURANCE-4000X-20260723",
    "WOL-BS-LIM-TEAN-HORMUZ-NOT-OPEN-20260802",
}
assert lim_ids <= set(incidents)
assert len([
    row for row in incidents.values()
    if row["source_id"] == "WOL-SRC-LIM-TEAN"
]) == 6

for incident_id in lim_ids:
    row = incidents[incident_id]
    assert row["source_id"] == "WOL-SRC-LIM-TEAN"
    assert row["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert row["evidentiary_support_review"]["supporting_evidence_found"] is False
    assert row["public_receipts"]

# The pattern is not a claim that Lim's underlying shipping data are generally
# false. Each incident preserves the factual substrate and scores the unsupported
# absolute/causal/control bridge or, where applicable, a hard factual error.
july8 = incidents["WOL-BS-LIM-TEAN-BINARY-CONTROL-20260708"]
assert "Attacks on the southern corridor establish danger" in july8["evidentiary_support_review"]["claimant_basis_note"]
assert "exclusive control" in july8["downstream_note"]

july10 = incidents["WOL-BS-LIM-TEAN-NEVER-REOPENED-20260710"]
assert "briefly cracked the Strait open" in july10["evidentiary_support_review"]["claimant_basis_note"]
assert "absolute zero-day claim" in july10["downstream_note"]

july13 = incidents["WOL-BS-LIM-TEAN-WAR-TO-STOP-TOLLS-20260713"]
assert "war began February 28" in july13["evidentiary_support_review"]["claimant_basis_note"]
assert "20% announcement on July 13 was real" in july13["evidentiary_support_review"]["search_notes"]

july20 = incidents["WOL-BS-LIM-TEAN-HORMUZ-CAUSALITY-20260720"]
assert "traffic collapse is supported" in july20["evidentiary_support_review"]["claimant_basis_note"]
assert "does not isolate U.S. strike waves" in july20["evidentiary_support_review"]["claimant_basis_note"]

july23 = incidents["WOL-BS-LIM-TEAN-INSURANCE-4000X-20260723"]
assert "40-fold" in july23["evidentiary_support_review"]["claimant_basis_note"]
assert "26.7-fold" in july23["evidentiary_support_review"]["claimant_basis_note"]
assert "mathematical factual error" in july23["downstream_note"]

aug2 = incidents["WOL-BS-LIM-TEAN-HORMUZ-NOT-OPEN-20260802"]
assert "blocked most traffic" in aug2["evidentiary_support_review"]["claimant_basis_note"]
assert "MISLEADING BINARY FRAMING" in aug2["evidentiary_support_review"]["search_notes"]

assert leads["LEAD-LIM-TEAN"]["current_disposition"] == "MATERIAL_WOL_HISTORY_FOUND"
assert profiles["WOL-SRC-LIM-TEAN"]["behavior_classes"] == ["SUBJECT_MATTER_ANALYST"]
assert "shipping/admiralty" in profiles["WOL-SRC-LIM-TEAN"]["expertise_scope"]

awards = profiles["WOL-SRC-LIM-TEAN"]["source_awards"]
assert len(awards) == 1
award = awards[0]
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualifying_window_start"] == "2026-07-08T00:00:00"
assert award["qualifying_window_end"] == "2026-08-02T00:00:00"
assert award["qualifying_incident_count"] == 6
assert set(award["qualifying_incident_ids"]) == lim_ids
assert award["current_window_status"] == "EARNED_HISTORICAL"
assert award["currently_active"] is False
assert award["current_window_incident_count"] == 0
assert award["current_window_incident_ids"] == []

# Bullshitter remains an independent behavior award. It does not silently
# create a legacy direct verdict or Hall-of-Shame placement.
assert profiles["WOL-SRC-LIM-TEAN"]["direct_verdict"] is None
hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert "WOL-SRC-LIM-TEAN" not in hall_ids

print(
    "web-of-lies social influence tranche2g: PASS "
    "lim_incidents=6 lim_bullshitter=1 window=2026-07-08..2026-08-02"
)
