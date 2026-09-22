#!/usr/bin/env python3
"""Regression coverage for named-lead social/influence tranche 2A."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_web_of_lies as wol  # noqa: E402
import build_web_of_lies_discovery_queue as discovery_builder  # noqa: E402
import build_web_of_lies_forensic_input as aggregator  # noqa: E402

canonical = json.loads((ROOT / wol.CANONICAL).read_text(encoding="utf-8"))
governance = json.loads((ROOT / wol.GOVERNANCE).read_text(encoding="utf-8"))
assembled = aggregator.build_forensic_input(ROOT)
derived = wol.build_registry(canonical, assembled, governance)
queue = discovery_builder.build_queue(ROOT)
discovery_builder.validate(ROOT, queue)

profiles = {row["source_id"]: row for row in derived["source_profiles"]}
events = {row["event_id"]: row for row in derived["information_events"]}
relationships = {
    row["relationship_id"]: row for row in derived["relationships"]
}
leads = {row["lead_id"]: row for row in derived["research_leads"]}
queue_items = {row["discovery_id"]: row for row in queue["items"]}

expected_profiles = {
    "WOL-SRC-VALENTI-VIDEOS",
    "WOL-SRC-ETHAN-LEVINS",
    "WOL-SRC-OSINTDEFENDER",
    "WOL-SRC-MEIDASTOUCH",
    "WOL-SRC-MIDDLE-EAST-MONITOR",
    "WOL-SRC-JOLLY-GOOD-GINGER",
    "WOL-SRC-IRAN-MILITARY-UPDATE",
    "WOL-SRC-LIM-TEAN",
    "WOL-SRC-ZACH-FOR-THE-PEOPLE-FB",
    "WOL-SRC-EL-MARQUES-XD-FB",
}
assert expected_profiles <= set(profiles)

# Identity resolution stays bounded. Later public evidence may mature a lead
# identity, but cross-platform account resolution never invents a hidden
# operator and unresolved accounts remain unresolved until evidence appears.
assert profiles["WOL-SRC-VALENTI-VIDEOS"]["identity_confidence"] == "HIGH"
assert profiles["WOL-SRC-ETHAN-LEVINS"]["identity_confidence"] == "HIGH"
assert profiles["WOL-SRC-OSINTDEFENDER"]["identity_confidence"] == "HIGH"
assert profiles["WOL-SRC-IRAN-MILITARY-UPDATE"]["identity_confidence"] == "HIGH"
assert profiles["WOL-SRC-ZACH-FOR-THE-PEOPLE-FB"]["identity_confidence"] in {
    "UNRESOLVED", "HIGH"
}
assert profiles["WOL-SRC-EL-MARQUES-XD-FB"]["identity_confidence"] == "UNRESOLVED"
assert profiles["WOL-SRC-IRAN-MILITARY-UPDATE"]["country_region"] is None

# Press TV's public use of Ethan Levins is stored at the relationship actually
# evidenced: a quotation/hosted-commentary relationship, not control or agency.
ethan_rel = relationships["WOL-REL-PRESSTV-QUOTES-ETHAN-LEVINS-202609"]
assert ethan_rel["from_id"] == "WOL-SRC-PRESS-TV"
assert ethan_rel["to_id"] == "WOL-SRC-ETHAN-LEVINS"
assert ethan_rel["relationship_type"] == "QUOTES"
assert ethan_rel["public_receipts"]
assert "does not establish control" in ethan_rel["relationship_scope"]
assert not any(
    row["from_id"] == "WOL-SRC-PRESS-TV"
    and row["to_id"] == "WOL-SRC-ETHAN-LEVINS"
    and row["relationship_type"] in {"CONTROLLED_BY", "AFFILIATED_WITH", "MEMBER_OF"}
    for row in relationships.values()
)

# OSINTdefender is a control/carrier example in the F-15E/CSAR family. It
# attributed Mehr, preserved "allegedly", and did not assert capture as fact.
osint_event = events["WOL-EVT-NAMED-OSINTDEFENDER-F15E-APR3"]
assert osint_event["claim_family_id"] == "CH-F15E-CSAR-URANIUM"
assert osint_event["event_type"] == "REPORTS"
assert osint_event["assertion_kind"] == "ATTRIBUTED_REPORT"
assert osint_event["independence_status"] == "DERIVATIVE"
assert osint_event["behavior_findings"] == []
assert osint_event["public_receipts"][0]["url"].startswith(
    "https://x.com/sentdefender/status/"
)
osint_profile = profiles["WOL-SRC-OSINTDEFENDER"]
assert osint_profile["metrics"]["false_misleading_findings_connected"] == 0
assert osint_profile["metrics"]["narrative_mutations_introduced"] == 0
assert osint_profile["direct_verdict"] is None

# Middle East Monitor is also a control/carrier in the Lincoln sample: the
# article preserves both the Iranian allegation and CENTCOM denial.
mem_event = events["WOL-EVT-NAMED-MEM-LINCOLN-MAR1"]
assert mem_event["claim_family_id"] == "CHAIN-CL-LINCOLN"
assert mem_event["event_type"] == "REPORTS"
assert mem_event["assertion_kind"] == "ATTRIBUTED_REPORT"
assert mem_event["independence_status"] == "DERIVATIVE"
assert mem_event["behavior_findings"] == []
assert "denial" in mem_event["exact_statement"].lower()
mem_profile = profiles["WOL-SRC-MIDDLE-EAST-MONITOR"]
assert mem_profile["metrics"]["false_misleading_findings_connected"] == 0
assert mem_profile["direct_verdict"] is None

# Broader/new named-lead propositions remain upstream review candidates. They
# are not silently inserted into a nearby canonical family or Hall scoring.
new_discoveries = {
    "WOL-DISC-MEIDASTOUCH-MULTIPLE-US-BASES-DESTROYED-20260712",
    "WOL-DISC-VALENTI-31M-SOLDIERS-20260917",
    "WOL-DISC-VALENTI-US-BASES-COMPLETELY-DESTROYED-20260917",
}
assert new_discoveries <= set(queue_items)
for discovery_id in new_discoveries:
    row = queue_items[discovery_id]
    assert row["discovery_type"] == "ADJUDICATION_REVIEW_CANDIDATE"
    assert row["claim_family_ref"] is None
    assert row["status"] == "AWAITING_CANONICAL_CLAIM_FAMILY"
    assert row["review_target"] == "INFORMATION_CLAIMS_AND_FORENSIC_ADJUDICATION"

event_source_ids = {row["source_id"] for row in events.values()}
assert "WOL-SRC-MEIDASTOUCH" not in event_source_ids
assert "WOL-SRC-VALENTI-VIDEOS" not in event_source_ids
assert profiles["WOL-SRC-MEIDASTOUCH"]["direct_verdict"] is None
assert profiles["WOL-SRC-VALENTI-VIDEOS"]["direct_verdict"] is None

# Lead dispositions describe research workflow state, not guilt. Later tranches
# may legitimately mature a disposition as more receipts are found; this older
# tranche regression must not freeze an earlier research state.
assert leads["LEAD-VALENTI-VIDEOS"]["current_disposition"] in {
    "MATERIAL_WOL_HISTORY_FOUND", "UPSTREAM_REVIEW_REQUIRED"
}
assert leads["LEAD-ETHAN-LEVINS"]["current_disposition"] in {
    "MATERIAL_WOL_HISTORY_FOUND", "UPSTREAM_REVIEW_REQUIRED"
}
assert leads["LEAD-OSINTDEFENDER"]["current_disposition"] == "CARRIER_ONLY"
assert leads["LEAD-MIDDLE-EAST-MONITOR"]["current_disposition"] == "CARRIER_ONLY"
assert leads["LEAD-MEIDASTOUCH"]["current_disposition"] in {
    "MATERIAL_WOL_HISTORY_FOUND", "UPSTREAM_REVIEW_REQUIRED"
}
assert leads["LEAD-JOLLY-GOOD-GINGER"]["current_disposition"] in {
    "LIMITED_RELEVANT_ACTIVITY", "NO_MATERIAL_ATLAS_CLAIM_ACTIVITY_FOUND",
    "UPSTREAM_REVIEW_REQUIRED", "UNABLE_TO_ADJUDICATE_PAYWALLED_RELEVANT_CONTENT"
}
assert leads["LEAD-IRAN-MILITARY-UPDATE"]["current_disposition"] in {
    "MATERIAL_WOL_HISTORY_FOUND", "LIMITED_RELEVANT_ACTIVITY",
    "NO_MATERIAL_ATLAS_CLAIM_ACTIVITY_FOUND", "UPSTREAM_REVIEW_REQUIRED"
}
assert leads["LEAD-LIM-TEAN"]["current_disposition"] in {
    "MATERIAL_WOL_HISTORY_FOUND", "LIMITED_RELEVANT_ACTIVITY",
    "UPSTREAM_REVIEW_REQUIRED", "ACTIVE_PATTERN_REVIEW"
}
assert leads["LEAD-ZACH-FOR-THE-PEOPLE"]["current_disposition"] in {
    "IDENTITY_UNRESOLVED", "NO_MATERIAL_ATLAS_CLAIM_ACTIVITY_FOUND",
    "UPSTREAM_REVIEW_REQUIRED"
}
assert leads["LEAD-EL-MARQUES-XD"]["current_disposition"] == "IDENTITY_UNRESOLVED"

hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert not (expected_profiles & hall_ids)
assert derived["corpus_coverage"]["completion_claim"] == "NONE"

print(
    "web-of-lies social influence tranche2a: PASS "
    f"profiles={len(expected_profiles)} controls=2 review_candidates={len(new_discoveries)}"
)
