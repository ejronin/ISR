#!/usr/bin/env python3
"""Regression coverage for social/influence source-dossier tranche 1."""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_web_of_lies as wol  # noqa: E402
import build_web_of_lies_forensic_input as aggregator  # noqa: E402
import web_of_lies_network as network  # noqa: E402

canonical = json.loads((ROOT / wol.CANONICAL).read_text(encoding="utf-8"))
governance = json.loads((ROOT / wol.GOVERNANCE).read_text(encoding="utf-8"))
assembled = aggregator.build_forensic_input(ROOT)
derived = wol.build_registry(canonical, assembled, governance)

assert assembled["source_dossier"]
assert assembled["source_dossier"]["path"] == "data/web-of-lies/source-dossiers.json"
assert assembled["forensic_input_set_sha256"]
assert assembled["forensic_input_set_sha256"] != assembled["lineage_packet_set_sha256"]

profiles = {row["source_id"]: row for row in derived["source_profiles"]}
relationships = {row["relationship_id"]: row for row in derived["relationships"]}
assessments = {row["assessment_id"]: row for row in derived["external_assessments"]}
infra = {row["observation_id"]: row for row in derived["infrastructure_observations"]}
leads = {row["lead_id"]: row for row in derived["research_leads"]}

legacy_profiles = {
    "WOL-SRC-BRICS4CLICKS-NETWORK",
    "WOL-SRC-VERIFIED4WAR-NETWORK",
    "WOL-SRC-TIMES-OF-IRAN-NEWS",
    "WOL-SRC-INN-IRAN-NATIONAL-NEWS",
    "WOL-SRC-USA-ARMY-NEWS",
    "WOL-SRC-US-DEFENCE-ARMY",
    "WOL-SRC-MOJTABA-KHAMENEI-PARODY",
    "WOL-SRC-KIM-JONG-UN-PARODY",
    "WOL-SRC-VLADIMIR-PUTIN-COMMENTARY",
    "WOL-SRC-NEWS-NOW-BRICS4CLICKS",
    "WOL-SRC-CHINA-NEWS-BRICS4CLICKS",
}
assert legacy_profiles <= set(profiles)

# Third-party coordination research is preserved as assessment context, not
# silently turned into Atlas behavior classes or Hall points.
for source_id in legacy_profiles:
    profile = profiles[source_id]
    assert profile["behavior_classes"] == ["UNKNOWN"], source_id
    assert profile["direct_verdict"] is None, source_id
    assert profile["metrics"]["claim_families_traced"] == 0, source_id
    assert profile["metrics"]["false_misleading_findings_connected"] == 0, source_id
    assert profile["metrics"]["unique_propagation_events"] == 0, source_id

hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert not (legacy_profiles & hall_ids)

brics = assessments["WOL-EXT-ISD-BRICS4CLICKS-20260415"]
verified = assessments["WOL-EXT-ISD-VERIFIED4WAR-20260415"]
assert brics["rating_classification"] == "COORDINATION_ESTABLISHED_BY_ASSESSOR"
assert verified["rating_classification"] == "COORDINATION_ESTABLISHED_BY_ASSESSOR"
assert "does not itself create an Atlas behavior class or Hall score" in brics["caveat"]
assert "no further evidence that the network was state-backed" in brics["caveat"]
assert "no further evidence that the network was state-backed" in verified["caveat"]

# Public platform/location metadata remains bounded: possible VPN use does not
# become a personal geolocation or a confirmed VPN finding.
for observation in infra.values():
    assert observation["operator_location_class"] == "OPERATOR_LOCATION_UNKNOWN"
    assert observation["vpn_proxy_status"] == "VPN_OR_PROXY_POSSIBLE_NOT_ESTABLISHED"
    assert "does not establish operator location" in observation["inference_limit"]

# Source-only network membership is documented but is not a claim-family
# propagation edge until a claim event exists.
expected_membership = {
    "WOL-REL-TIMES-MEMBER-VERIFIED4WAR",
    "WOL-REL-INN-MEMBER-VERIFIED4WAR",
    "WOL-REL-USAARMY-MEMBER-VERIFIED4WAR",
    "WOL-REL-USDEFENCE-MEMBER-VERIFIED4WAR",
    "WOL-REL-MOJTABA-MEMBER-VERIFIED4WAR",
    "WOL-REL-KIM-MEMBER-VERIFIED4WAR",
    "WOL-REL-VLADIMIR-MEMBER-VERIFIED4WAR",
    "WOL-REL-NEWSNOW-MEMBER-BRICS4CLICKS",
    "WOL-REL-CHINANEWS-MEMBER-BRICS4CLICKS",
}
assert expected_membership <= set(relationships)
for rid in expected_membership:
    assert relationships[rid]["relationship_type"] == "MEMBER_OF"
    assert relationships[rid]["public_receipts"]

family_propagation_ids = {
    rid
    for row in derived["network_analysis"]["family_analysis"]
    for rid in row.get("propagation_relationship_ids", [])
}
assert not (expected_membership & family_propagation_ids)

# Named leads are explicitly a neutral work queue.
expected_leads = {
    "LEAD-IRAN-MILITARY-UPDATE",
    "LEAD-JOLLY-GOOD-GINGER",
    "LEAD-OSINTDEFENDER",
    "LEAD-VALENTI-VIDEOS",
    "LEAD-ETHAN-LEVINS",
    "LEAD-MEIDASTOUCH",
    "LEAD-MIDDLE-EAST-MONITOR",
    "LEAD-LIM-TEAN",
    "LEAD-BRIAN-KRASSENSTEIN",
    "LEAD-ED-KRASSENSTEIN",
}
assert expected_leads == set(leads)
allowed_lead_dispositions = {
    "PENDING_CLAIM_FIRST_RESEARCH",
    "MATERIAL_WOL_HISTORY_FOUND",
    "LIMITED_RELEVANT_ACTIVITY",
    "CARRIER_ONLY",
    "NO_MATERIAL_ATLAS_CLAIM_ACTIVITY_FOUND",
    "IDENTITY_UNRESOLVED",
    "UPSTREAM_REVIEW_REQUIRED",
    "ACTIVE_PATTERN_REVIEW",
    "UNABLE_TO_ADJUDICATE_PAYWALLED_RELEVANT_CONTENT",
}
assert all(
    row["current_disposition"] in allowed_lead_dispositions
    for row in leads.values()
)
# Research-lead disposition is workflow state/context, not a behavior incident.
assert all((row.get("notes") or "").strip() for row in leads.values())
lead_source_ids = {
    "WOL-SRC-VALENTI-VIDEOS",
    "WOL-SRC-ETHAN-LEVINS",
    "WOL-SRC-OSINTDEFENDER",
    "WOL-SRC-MEIDASTOUCH",
    "WOL-SRC-MIDDLE-EAST-MONITOR",
    "WOL-SRC-JOLLY-GOOD-GINGER",
    "WOL-SRC-IRAN-MILITARY-UPDATE",
    "WOL-SRC-LIM-TEAN",
    "WOL-SRC-BRIAN-KRASSENSTEIN",
    "WOL-SRC-ED-KRASSENSTEIN",
    "WOL-SRC-ZACH-FOR-THE-PEOPLE-FB",
    "WOL-SRC-EL-MARQUES-XD-FB",
}
for source_id in lead_source_ids.intersection(profiles):
    assert source_id not in hall_ids

# Guardrail probes: external context cannot smuggle manual Hall scoring or turn
# possible VPN use into an established operator-location claim.
bad = copy.deepcopy(assembled)
bad["external_assessments"][0]["hall_of_shame_score"] = 999
try:
    network.validate_extended_forensic_input(bad, governance)
except ValueError as exc:
    assert "forbidden Hall fields" in str(exc)
else:
    raise AssertionError("manual Hall score hidden in external assessment was accepted")

bad = copy.deepcopy(assembled)
bad["infrastructure_observations"][0]["operator_location_class"] = "PERSON_HOME_ADDRESS"
try:
    network.validate_extended_forensic_input(bad, governance)
except ValueError as exc:
    assert "unsupported operator_location_class" in str(exc)
else:
    raise AssertionError("unsupported personal location inference was accepted")

assert derived["corpus_coverage"]["completion_claim"] == "NONE"

print(
    "web-of-lies social influence tranche1: PASS "
    f"legacy_profiles={len(legacy_profiles)} leads={len(leads)} "
    f"assessments={len(assessments)} infrastructure={len(infra)}"
)
