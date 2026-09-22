#!/usr/bin/env python3
"""Regression coverage for remaining social-source behavior closure."""
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

lim_id = "WOL-BS-LIM-TEAN-HORMUZ-CAUSALITY-20260720"
lim_toll_id = "WOL-BS-LIM-TEAN-TOLLS-WAR-CAUSE-20260714"
imu_id = "WOL-BS-IRAN-MILITARY-UPDATE-IRANIANS-HATE-TRUMP-20260706"

assert lim_id in incidents
lim = incidents[lim_id]
assert lim["source_id"] == "WOL-SRC-LIM-TEAN"
assert lim["event_type"] == "UNSUPPORTED_INFERENTIAL_ASSERTION"
assert lim["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
assert lim["evidentiary_support_review"]["supporting_evidence_found"] is False
assert "traffic collapse is supported" in lim["evidentiary_support_review"]["claimant_basis_note"]
assert "does not isolate U.S. strike waves" in lim["evidentiary_support_review"]["claimant_basis_note"]
assert lim["public_receipts"]

assert lim_toll_id in incidents
lim_toll = incidents[lim_toll_id]
assert lim_toll["source_id"] == "WOL-SRC-LIM-TEAN"
assert lim_toll["event_type"] == "UNSUPPORTED_INFERENTIAL_ASSERTION"
assert lim_toll["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
assert lim_toll["evidentiary_support_review"]["supporting_evidence_found"] is False
assert "war began on February 28" in lim_toll["evidentiary_support_review"]["claimant_basis_note"]
assert "March 19" in lim_toll["evidentiary_support_review"]["claimant_basis_note"]
assert "later U.S.-Iran dispute over Hormuz fees is real" in lim_toll["evidentiary_support_review"]["claimant_basis_note"]
assert len(lim_toll["public_receipts"]) >= 4

lim_incident_ids = {
    row["incident_id"]
    for row in incidents.values()
    if row["source_id"] == "WOL-SRC-LIM-TEAN"
}
assert {lim_id, lim_toll_id} <= lim_incident_ids
assert len(lim_incident_ids) == 2

assert leads["LEAD-LIM-TEAN"]["current_disposition"] == "ACTIVE_PATTERN_REVIEW"
assert "broader pattern review" in profiles["WOL-SRC-LIM-TEAN"]["identity_context"]
assert profiles["WOL-SRC-LIM-TEAN"]["source_awards"] == []

assert imu_id in incidents
imu = incidents[imu_id]
assert imu["source_id"] == "WOL-SRC-IRAN-MILITARY-UPDATE"
assert imu["event_type"] == "UNSUPPORTED_INFERENTIAL_ASSERTION"
assert imu["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
assert imu["evidentiary_support_review"]["supporting_evidence_found"] is False
assert "crowd clearly demonstrated intense anti-Trump sentiment" in imu["evidentiary_support_review"]["claimant_basis_note"]
assert "does not establish the attitude" in imu["evidentiary_support_review"]["claimant_basis_note"]
assert "operator" in imu["downstream_note"]
assert imu["public_receipts"]
assert leads["LEAD-IRAN-MILITARY-UPDATE"]["current_disposition"] == "MATERIAL_WOL_HISTORY_FOUND"
assert profiles["WOL-SRC-IRAN-MILITARY-UPDATE"]["source_awards"] == []

# Known relevant Jolly Good Ginger Iran-war content is paywalled. Inaccessible
# material is not converted into a clean/no-adverse finding.
assert leads["LEAD-JOLLY-GOOD-GINGER"]["current_disposition"] == "UNABLE_TO_ADJUDICATE_PAYWALLED_RELEVANT_CONTENT"
assert "Unable to adjudicate" in leads["LEAD-JOLLY-GOOD-GINGER"]["notes"]
assert "paywalled" in leads["LEAD-JOLLY-GOOD-GINGER"]["notes"]
assert profiles["WOL-SRC-JOLLY-GOOD-GINGER"]["adjudication_scope_status"] == "UNABLE_TO_ADJUDICATE_PAYWALLED_RELEVANT_CONTENT"
assert not any(
    row["source_id"] == "WOL-SRC-JOLLY-GOOD-GINGER"
    for row in incidents.values()
)
assert profiles["WOL-SRC-JOLLY-GOOD-GINGER"]["source_awards"] == []

scope = governance["source_discovery_scope"]
assert scope["named_seed_accounts_are_examples_not_boundary"] is True
assert scope["actively_discover_new_publishers"] is True
assert scope["parody_accounts_excluded_from_adjudication"] is True
assert scope["inaccessible_disposition"] == "UNABLE_TO_ADJUDICATE_PAYWALLED_RELEVANT_CONTENT"
assert scope["inference_rule"].startswith("Repeated analytical overfitting")
for source_id in (
    "WOL-SRC-KIM-JONG-UN-PARODY",
    "WOL-SRC-MOJTABA-KHAMENEI-PARODY",
):
    assert profiles[source_id]["adjudication_scope_status"] == "EXCLUDED_PARODY_ACCOUNT"
    assert profiles[source_id]["source_awards"] == []

# Native WOL incidents do not silently create legacy direct-verdict/Hall
# findings, and two incidents still cannot satisfy the six-in-30-days award rule.
for source_id in (
    "WOL-SRC-LIM-TEAN",
    "WOL-SRC-IRAN-MILITARY-UPDATE",
    "WOL-SRC-JOLLY-GOOD-GINGER",
):
    assert profiles[source_id]["direct_verdict"] is None

hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert not {
    "WOL-SRC-LIM-TEAN",
    "WOL-SRC-IRAN-MILITARY-UPDATE",
    "WOL-SRC-JOLLY-GOOD-GINGER",
}.intersection(hall_ids)

print(
    "web-of-lies social influence tranche2e: PASS "
    "lim_incidents=2 lim_pattern_review=active iran_military_update_incidents=1 jgg=paywall_unable parody=excluded awards=0"
)
