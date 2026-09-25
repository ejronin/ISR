#!/usr/bin/env python3
"""Regression coverage for traditional-media Bullshitter qualification."""
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
events = {row["event_id"]: row for row in derived["information_events"]}

publisher_rule = governance["source_discovery_scope"]["publisher_review_sufficiency"]
assert publisher_rule["applies_to_source_entity_types"] == ["OUTLET"]
assert publisher_rule["qualifying_incident_threshold"] == 6
assert publisher_rule["window_days"] == 30
assert publisher_rule["purpose"] == "MEDIA_PUBLISHER_REVIEW_STOP_CONDITION"
assert publisher_rule["non_exhaustive_corpus"] is True
assert publisher_rule["more_incidents_may_exist"] is True
assert publisher_rule["continue_amplifier_mapping_after_threshold"] is True
assert publisher_rule["continue_cross_web_mapping_after_threshold"] is True
assert publisher_rule["does_not_replace_global_bullshitter_award_semantics"] is True

tasnim = profiles["WOL-SRC-TASNIM"]
award_list = tasnim["source_awards"]
assert len(award_list) == 1
award = award_list[0]
assert award["award_code"] == "BULLSHITTER"
assert award["qualification_route"] == "STANDARD_INCIDENT_COUNT"
assert award["qualification_scope"] == "CUMULATIVE"
assert award["qualifying_incident_count"] == 6
assert award["documented_incident_count"] == 8

expected = {
    "WOL-EVT-F15E-005",
    "WOL-EVT-KUWAIT_F15_FRIENDLY_FIRE-0101-O",
    "WOL-EVT-KUWAIT_F15_FRIENDLY_FIRE-0102-C",
    "WOL-EVT-TURKEY_MISSILE_DENIAL-0202-C",
    "WOL-EVT-TURKEY_MISSILE_DENIAL-0205-C",
    "WOL-EVT-PUB-TASNIM-RESCUE-FAILURE-20260405",
}
assert set(award["qualifying_incident_ids"]) == expected
assert expected <= set(award["documented_incident_ids"])
assert {
    "WOL-EVT-PUB-TASNIM-C130-DOWNED-20260405",
    "WOL-EVT-PUB-TASNIM-IMAGES-DOWNED-AIRCRAFT-20260405",
} <= set(award["documented_incident_ids"])

publisher_sample = {
    "WOL-EVT-TURKEY_MISSILE_DENIAL-0202-C",
    "WOL-EVT-TURKEY_MISSILE_DENIAL-0205-C",
    "WOL-EVT-F15E-005",
    "WOL-EVT-PUB-TASNIM-RESCUE-FAILURE-20260405",
    "WOL-EVT-PUB-TASNIM-C130-DOWNED-20260405",
    "WOL-EVT-PUB-TASNIM-IMAGES-DOWNED-AIRCRAFT-20260405",
}
sample_dates = sorted(
    wol.bullshit_incident_moment(events[event_id])
    for event_id in publisher_sample
)
assert all(sample_dates)
assert (sample_dates[-1] - sample_dates[0]).days <= 30
assert len(publisher_sample) == publisher_rule["qualifying_incident_threshold"]

sixth = events["WOL-EVT-PUB-TASNIM-RESCUE-FAILURE-20260405"]
assert sixth["source_id"] == "WOL-SRC-TASNIM"
assert sixth["event_type"] == "FALSE_OR_MISLEADING_CONNECTION"
assert sixth["canonical_claim_refs"] == ["IR-CLM-0007"]
assert sixth["assertion_kind"] == "FACTUAL_ASSERTION"
assert "AMPLIFIES" in sixth["lineage_roles"]
assert sixth["public_receipts"]
assert any(
    receipt["url"].endswith(
        "/3557293/iran-thwarts-us-rescue-mission-downs-multiple-aircraft-near-isfahan"
    )
    for receipt in sixth["public_receipts"]
)

# Neutral attributed carriage remains outside the threshold. The outlet has many
# REPORTS events, but only the six adverse publication events above earn the award.
neutral_ids = {
    "WOL-EVT-PUB-200-US-DEAD-TASNIM",
    "WOL-EVT-PUB-ARAMCO-FALSE-FLAG-TASNIM",
    "WOL-EVT-PUB-ERBIL-KUWAIT-FALSE-FLAG-TASNIM",
    "WOL-EVT-PUB-SHAHED-CLONE-FALSE-FLAG-TASNIM",
    "WOL-EVT-PUB-SIX-VESSEL-0905-TASNIM",
    "WOL-EVT-PUB-TEN-VESSEL-0909-TASNIM",
    "WOL-EVT-PUB-US-UNMANNED-0906-TASNIM",
    "WOL-EVT-PUB-WARSHIP-DAMAGE-0905-TASNIM",
    "WOL-EVT-PUB-WARSHIP-HITS-0909-TASNIM",
}
for event_id in neutral_ids:
    assert events[event_id]["event_type"] == "REPORTS"
    assert event_id not in award["documented_incident_ids"]

print(
    "web-of-lies media outlet awards: PASS "
    "tasnim_bullshitter=1 documented_incidents=8 publisher_examples=6 neutral_carriage_excluded=1 "
    "publisher_review_stop=6_in_30 non_exhaustive=1"
)
