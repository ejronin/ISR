#!/usr/bin/env python3
"""Regression coverage for receipt-backed social profile evidence and transcript inference splits."""
from __future__ import annotations

import copy
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
relationships = {row["relationship_id"]: row for row in derived["relationships"]}
leads = {row["lead_id"]: row for row in derived["research_leads"]}
queue_items = {row["discovery_id"]: row for row in queue["items"]}

# Receipt-backed descriptive roles / incentive channels are first-class profile
# evidence. They do not need fake claim-family events and do not imply misconduct.
ethan = profiles["WOL-SRC-ETHAN-LEVINS"]
assert ethan["behavior_classes"] == ["MONETIZED_INFLUENCER"]
assert set(ethan["revenue_model"]) == {"PATREON", "DONATIONS", "SPONSORED_CONTENT"}
assert ethan["classification_basis_event_ids"] == []
assert ethan["classification_basis_receipts"]
assert {x for r in ethan["revenue_basis_receipts"] for x in r["revenue_classes"]} == {
    "PATREON", "DONATIONS", "SPONSORED_CONTENT"
}

valenti = profiles["WOL-SRC-VALENTI-VIDEOS"]
assert valenti["behavior_classes"] == ["MONETIZED_INFLUENCER"]
assert valenti["revenue_model"] == ["PATREON"]
assert valenti["classification_basis_receipts"]
assert valenti["revenue_basis_receipts"]

jgg = profiles["WOL-SRC-JOLLY-GOOD-GINGER"]
assert set(jgg["behavior_classes"]) == {"ACTIVIST_COMMENTATOR", "MONETIZED_INFLUENCER"}
assert set(jgg["revenue_model"]) == {"PAID_SUBSTACK", "MEMBERSHIP"}
assert jgg["classification_basis_receipts"]
assert jgg["revenue_basis_receipts"]

lim = profiles["WOL-SRC-LIM-TEAN"]
assert lim["behavior_classes"] == ["SUBJECT_MATTER_ANALYST"]
assert lim["revenue_model"] == ["UNKNOWN_REVENUE_MODEL"]
assert "shipping/admiralty" in lim["expertise_scope"]
assert lim["metrics"]["false_misleading_findings_connected"] == 0
assert lim["direct_verdict"] is None

meidas = profiles["WOL-SRC-MEIDASTOUCH"]
assert meidas["behavior_classes"] == ["JOURNALISTIC_SOURCE"]
assert set(meidas["revenue_model"]) == {"PATREON", "MEMBERSHIP"}
assert meidas["classification_basis_receipts"]
assert meidas["revenue_basis_receipts"]

# Public collaboration/hosting edges preserve the relationship actually proved
# and cannot mutate into control, employment, membership or state direction.
assert relationships["WOL-REL-PRESSTV-QUOTES-ETHAN-LEVINS-202609"]["relationship_type"] == "QUOTES"
assert relationships["WOL-REL-ETHAN-HOSTED-BY-RACHEL-BLEVINS-2026"]["relationship_type"] == "HOSTED_BY"
for rid in (
    "WOL-REL-JGG-HOSTED-BY-MICHAEL-COHEN-2026",
    "WOL-REL-JGG-HOSTED-BY-DON-LEMON-2026",
    "WOL-REL-JGG-HOSTED-BY-DEFIANCE-IRAN-20260302",
):
    assert relationships[rid]["relationship_type"] == "HOSTED_BY"
assert not any(
    row["from_id"] in {"WOL-SRC-ETHAN-LEVINS", "WOL-SRC-JOLLY-GOOD-GINGER"}
    and row["relationship_type"] in {"CONTROLLED_BY", "AFFILIATED_WITH", "MEMBER_OF"}
    for row in relationships.values()
)

# Ethan and Meidas each adopt one absolute Hormuz-control formulation already
# covered by the canonical MISLEADING BINARY FRAMING family. This creates a
# factual direct-verdict count but no stronger source behavior class.
ethan_hormuz = events["WOL-EVT-NAMED-ETHAN-HORMUZ-CONTROL-MAY8"]
meidas_hormuz = events["WOL-EVT-NAMED-MEIDAS-HORMUZ-CONTROL-MAY7"]
for row in (ethan_hormuz, meidas_hormuz):
    assert row["claim_family_id"] == "CHAIN-CL-HORMUZ-CONTROL"
    assert row["event_type"] == "FALSE_OR_MISLEADING_CONNECTION"
    assert row["canonical_combined_assessment"] == "MISLEADING BINARY FRAMING"
    assert row["behavior_findings"] == []
    assert row["assertion_kind"] == "FACTUAL_ASSERTION"

assert ethan["metrics"]["false_misleading_findings_connected"] == 1
assert meidas["metrics"]["false_misleading_findings_connected"] == 1
assert "1 documented false/misleading finding" in ethan["direct_verdict"]
assert "1 documented false/misleading finding" in meidas["direct_verdict"]

# The transcript-level Meidas propositions are deliberately split into separate
# upstream review candidates: BDA scale, concealment, and zero-traffic.
meidas_review_ids = {
    "WOL-DISC-MEIDAS-MULTIPLE-US-BASES-DESTROYED-20260712",
    "WOL-DISC-MEIDAS-MOST-US-BASES-SERIOUSLY-DESTROYED-20260507",
    "WOL-DISC-MEIDAS-US-BASE-DAMAGE-COVERUP-20260507",
    "WOL-DISC-MEIDAS-HORMUZ-TRAFFIC-COMPLETELY-SHUT-20260717",
}
assert meidas_review_ids <= set(queue_items)
for discovery_id in meidas_review_ids:
    row = queue_items[discovery_id]
    assert row["discovery_type"] == "ADJUDICATION_REVIEW_CANDIDATE"
    assert row["claim_family_ref"] is None
    assert row["status"] == "AWAITING_CANONICAL_CLAIM_FAMILY"
    assert row["review_target"] == "INFORMATION_CLAIMS_AND_FORENSIC_ADJUDICATION"

assert "quantifier 'most'" in queue_items[
    "WOL-DISC-MEIDAS-MOST-US-BASES-SERIOUSLY-DESTROYED-20260507"
]["downstream_note"]
assert "separate proposition from physical damage" in queue_items[
    "WOL-DISC-MEIDAS-US-BASE-DAMAGE-COVERUP-20260507"
]["downstream_note"]
assert "sharply reduced but nonzero traffic" in queue_items[
    "WOL-DISC-MEIDAS-HORMUZ-TRAFFIC-COMPLETELY-SHUT-20260717"
]["downstream_note"]

# Lead dispositions describe research state, not guilt.
assert leads["LEAD-ETHAN-LEVINS"]["current_disposition"] == "MATERIAL_WOL_HISTORY_FOUND"
assert leads["LEAD-VALENTI-VIDEOS"]["current_disposition"] == "MATERIAL_WOL_HISTORY_FOUND"
assert leads["LEAD-JOLLY-GOOD-GINGER"]["current_disposition"] == "LIMITED_RELEVANT_ACTIVITY"
assert leads["LEAD-LIM-TEAN"]["current_disposition"] == "LIMITED_RELEVANT_ACTIVITY"
assert leads["LEAD-MEIDASTOUCH"]["current_disposition"] == "UPSTREAM_REVIEW_REQUIRED"

# Monetized/descriptive roles are not Hall inputs. Ethan/Meidas now have factual
# direct-verdict summaries from the Hormuz incidents, but still no Hall class.
hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
for source_id in {
    "WOL-SRC-ETHAN-LEVINS",
    "WOL-SRC-VALENTI-VIDEOS",
    "WOL-SRC-JOLLY-GOOD-GINGER",
    "WOL-SRC-LIM-TEAN",
    "WOL-SRC-MEIDASTOUCH",
}:
    assert source_id not in hall_ids

# Fail closed: an adverse class cannot be smuggled in via a profile/bio receipt.
bad = copy.deepcopy(assembled)
bad_ethan = next(row for row in bad["source_profiles"] if row["source_id"] == "WOL-SRC-ETHAN-LEVINS")
bad_ethan["behavior_classes"] = ["PSEUDO_ANALYST"]
bad_ethan["classification_basis_receipts"][0]["behavior_classes"] = ["PSEUDO_ANALYST"]
try:
    wol.build_registry(canonical, bad, governance)
except ValueError as exc:
    assert "incident-gated classes" in str(exc)
else:
    raise AssertionError("adverse PSEUDO_ANALYST class was accepted from a profile receipt")

# Fail closed: monetization needs a supporting public receipt or an incident.
bad = copy.deepcopy(assembled)
bad_valenti = next(row for row in bad["source_profiles"] if row["source_id"] == "WOL-SRC-VALENTI-VIDEOS")
bad_valenti["revenue_basis_receipts"] = []
try:
    wol.build_registry(canonical, bad, governance)
except ValueError as exc:
    assert "without revenue-basis events or public profile receipts" in str(exc)
else:
    raise AssertionError("unsupported Patreon revenue class was accepted")

assert derived["corpus_coverage"]["completion_claim"] == "NONE"

print(
    "web-of-lies social profile evidence: PASS "
    f"profiles=5 hormuz_incidents=2 meidas_review_candidates={len(meidas_review_ids)}"
)
