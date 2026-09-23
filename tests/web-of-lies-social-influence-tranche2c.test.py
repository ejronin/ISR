#!/usr/bin/env python3
"""Regression coverage for source-agnostic claim-construction review."""
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
import web_of_lies_network as network  # noqa: E402

canonical = json.loads((ROOT / wol.CANONICAL).read_text(encoding="utf-8"))
governance = json.loads((ROOT / wol.GOVERNANCE).read_text(encoding="utf-8"))
assembled = aggregator.build_forensic_input(ROOT)
derived = wol.build_registry(canonical, assembled, governance)
queue = discovery_builder.build_queue(ROOT)
discovery_builder.validate(ROOT, queue)

items = {row["discovery_id"]: row for row in queue["items"]}
leads = {row["lead_id"]: row for row in derived["research_leads"]}
profiles = {row["source_id"]: row for row in derived["source_profiles"]}
behavior_incidents = {
    row["incident_id"]: row for row in derived["source_behavior_incidents"]
}

media_rule = governance["osint_collection"]["media_analysis_review"]
assert media_rule["factual_substrate_is_not_inferential_validation"] is True
assert media_rule["accurate_number_does_not_validate_causal_bridge"] is True
assert media_rule["accurate_quote_does_not_validate_motive_or_control_inference"] is True
assert media_rule["wol_evidence_gate_required_before_adverse_scoring"] is True
assert media_rule["upstream_promotion_is_separate_from_wol_scoring"] is True
assert "upstream_adjudication_required_before_adverse_scoring" not in media_rule
assert "cannot grant, deny, delay, or override" in media_rule["rule"]

# Lim: supported shipping substrate does not automatically validate his causal
# bridge from "more bombs, fewer ships" to U.S. strikes producing the shutdown.
lim = items["WOL-DISC-LIM-TEAN-HORMUZ-MORE-BOMBS-FEWER-SHIPS-20260720"]
assert lim["content_body_evidence"]["medium"] == "TEXT_PUBLICATION"
assert lim["content_body_evidence"]["capture_status"] == "FULL_TEXT_CAPTURED"
assert lim["analysis_decomposition"]["factual_substrate"][0]["evidence_status"] == "PUBLICLY_SUPPORTED"
lim_bridge = lim["analysis_decomposition"]["inferential_bridges"][0]
assert lim_bridge["bridge_type"] == "CAUSAL_ATTRIBUTION"
assert lim_bridge["review_status"] == "UPSTREAM_REVIEW_REQUIRED"
assert "Iranian attacks" in " ".join(lim_bridge["competing_explanations"])
assert leads["LEAD-LIM-TEAN"]["current_disposition"] in {
    "MATERIAL_WOL_HISTORY_FOUND", "UPSTREAM_REVIEW_REQUIRED", "ACTIVE_PATTERN_REVIEW"
}
if leads["LEAD-LIM-TEAN"]["current_disposition"] in {
    "MATERIAL_WOL_HISTORY_FOUND", "ACTIVE_PATTERN_REVIEW"
}:
    lim_native = behavior_incidents["WOL-BS-LIM-TEAN-HORMUZ-CAUSALITY-20260720"]
    assert lim_native["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert lim_bridge["review_status"] == "UPSTREAM_REVIEW_REQUIRED"

# Ethan: the quoted visible-damage premise is separate from the exact two-
# missile attribution and the extrapolation to remaining strike capacity.
ethan = items["WOL-DISC-ETHAN-LEVINS-TWO-MISSILES-ALL-DAMAGE-20260322"]
assert ethan["content_body_evidence"]["capture_status"] == "FULL_TEXT_CAPTURED"
bridge_types = {
    row["bridge_type"] for row in ethan["analysis_decomposition"]["inferential_bridges"]
}
assert {"CAUSAL_ATTRIBUTION", "GENERALIZATION"} <= bridge_types
assert all(
    row["review_status"] == "UPSTREAM_REVIEW_REQUIRED"
    for row in ethan["analysis_decomposition"]["inferential_bridges"]
)

# Video title/description is sufficient to seed a proposition but not to infer
# the spoken narrative. All current Valenti video discoveries remain body-gated.
valenti_ids = {
    "WOL-DISC-VALENTI-31M-SOLDIERS-20260917",
    "WOL-DISC-VALENTI-US-BASES-COMPLETELY-DESTROYED-20260917",
    "WOL-DISC-VALENTI-US-CASUALTY-COVERUP-20260721",
    "WOL-DISC-VALENTI-US-MILITARY-ALLOWED-IRAN-MISSILES-20260727",
}
for discovery_id in valenti_ids:
    row = items[discovery_id]
    assert row["content_body_evidence"]["medium"] == "AUDIO_VIDEO"
    assert row["content_body_evidence"]["capture_status"] == "TITLE_DESCRIPTION_ONLY"
    assert row["content_body_evidence"]["transcript_receipts"] == []
    assert row["content_body_evidence"]["body_claims"] == []
    assert "analysis_decomposition" not in row

# Fail closed: nobody can later attach a narrative inference to title-only video
# evidence without adding transcript/timestamp body evidence.
bad = copy.deepcopy(items["WOL-DISC-VALENTI-US-CASUALTY-COVERUP-20260721"])
bad["analysis_decomposition"] = {
    "factual_substrate": [],
    "inferential_bridges": [{
        "statement": "invented bridge",
        "bridge_type": "OTHER",
        "review_status": "UPSTREAM_REVIEW_REQUIRED",
        "evidentiary_issue": "test",
        "competing_explanations": [],
    }],
    "conclusions": [],
    "decomposition_note": "test",
}
try:
    discovery_builder.validate_native_discovery_content(bad)
except ValueError as exc:
    assert "title/description only" in str(exc)
else:
    raise AssertionError("title-only video narrative decomposition was accepted")

# Conversely, a video can become body-reviewable only after transcript/timestamp
# evidence and at least one body-level claim are present.
good = copy.deepcopy(bad)
good["content_body_evidence"] = {
    "medium": "AUDIO_VIDEO",
    "capture_status": "PARTIAL_TRANSCRIPT_CAPTURED",
    "capture_scope": "test transcript segment",
    "transcript_receipts": [{
        "receipt_id": "TEST-TRANSCRIPT",
        "url": "https://example.test/transcript",
        "provenance_status": "SECONDARY_PRESERVATION",
        "transcript_type": "THIRD_PARTY_TRANSCRIPT",
        "language": "en",
        "timestamp_start": "00:10:00",
        "timestamp_end": "00:12:00",
        "scope_note": "test only",
    }],
    "body_claims": [{
        "body_claim_id": "TEST-BODY-CLAIM",
        "statement_identity": "test",
        "speaker": "test",
        "timestamp_start": "00:10:00",
        "timestamp_end": "00:12:00",
        "evidence_scope": "test",
    }],
}
discovery_builder.validate_native_discovery_content(good)

# Canonical lineage uses the same rule after family assignment. An unresolved
# bridge may be preserved, but it cannot become an adverse behavior finding.
canonical_probe = {
    "event_id": "TEST-CANONICAL-INFERENCE",
    "canonical_claim_refs": ["TEST-CLAIM"],
    "behavior_findings": [],
    "content_body_evidence": {
        "medium": "TEXT_PUBLICATION",
        "capture_status": "FULL_TEXT_CAPTURED",
        "capture_scope": "test",
        "transcript_receipts": [],
        "body_claims": [{
            "body_claim_id": "TEST-BODY",
            "statement_identity": "test",
            "speaker": "test",
            "timestamp_start": None,
            "timestamp_end": None,
            "evidence_scope": "test",
        }],
    },
    "analysis_decomposition": {
        "factual_substrate": [{
            "statement": "supported premise",
            "evidence_status": "PUBLICLY_SUPPORTED",
            "evidence_note": "test",
            "evidence_receipt_ids": [],
        }],
        "inferential_bridges": [{
            "statement": "unresolved causal bridge",
            "bridge_type": "CAUSAL_ATTRIBUTION",
            "review_status": "UPSTREAM_REVIEW_REQUIRED",
            "evidentiary_issue": "test",
            "competing_explanations": [],
        }],
        "conclusions": [],
        "presentation": [],
        "decomposition_note": "test",
    },
}
network._validate_claim_construction(canonical_probe, governance)

bad_canonical = copy.deepcopy(canonical_probe)
bad_canonical["behavior_findings"] = ["NARRATIVE_MUTATION"]
try:
    network._validate_claim_construction(bad_canonical, governance)
except ValueError as exc:
    assert "cannot score adverse behavior" in str(exc)
else:
    raise AssertionError("unresolved inference was allowed to create adverse behavior")

bad_video_lineage = copy.deepcopy(canonical_probe)
bad_video_lineage["content_body_evidence"] = {
    "medium": "AUDIO_VIDEO",
    "capture_status": "TITLE_DESCRIPTION_ONLY",
    "capture_scope": "title only",
    "transcript_receipts": [],
    "body_claims": [],
}
try:
    network._validate_claim_construction(bad_video_lineage, governance)
except ValueError as exc:
    assert "title/description only" in str(exc)
else:
    raise AssertionError("canonical video inference from title-only evidence was accepted")

# Valenti's long-form review queue tracks videos that need body capture rather
# than treating nuclear/ground-invasion titles as complete narrative evidence.
valenti_lead = leads["LEAD-VALENTI-VIDEOS"]
body_queue = valenti_lead["body_capture_queue"]
assert len(body_queue) >= 5
assert all(row["capture_status"] == "TITLE_DESCRIPTION_ONLY" for row in body_queue)
assert all("TRANSCRIPT" in row["required_next_evidence"] for row in body_queue)
assert any(row["url"].endswith("ESojA5kxiFY") for row in body_queue)
assert any(row["url"].endswith("0ZArFpj6zyA") for row in body_queue)

nuke_jets = next(row for row in body_queue if row["research_item_id"] == "VALENTI-BODY-NUCLEAR-ARMED-JETS-2026")
assert nuke_jets["url"].endswith("b44N3cLIDrA")
assert nuke_jets["publication_date"] == "2026-07-23"
assert "nuclear warheads" in nuke_jets["project_owner_direct_review"]["observation"]
assert nuke_jets["project_owner_direct_review"]["review_status"] == "BODY_REVIEW_REPORTED_TRANSCRIPT_NOT_MACHINE_RECOVERED"

nuke_cancel = next(row for row in body_queue if row["research_item_id"] == "VALENTI-BODY-NUKE-CANCEL-20260803")
assert "nuclear-warhead use" in nuke_cancel["project_owner_direct_review"]["observation"]

allow_body = next(row for row in body_queue if row["research_item_id"] == "VALENTI-BODY-ALLOWS-MISSILES-20260727")
assert allow_body["url"].endswith("H0BfiwKhoVs")
assert "interceptor-triage" in allow_body["research_reason"]
assert "provoke anger" in allow_body["research_reason"]
assert "not care" in allow_body["project_owner_direct_review"]["observation"]
assert "Exact transcript wording/timestamps remain required" in allow_body["project_owner_direct_review"]["evidentiary_limit"]

# Project-owner body review resolves intended meaning for the nuclear items but
# does not masquerade as a machine-recovered transcript.
assert behavior_incidents["WOL-BS-VALENTI-NUCLEAR-ARMED-JETS-20260723"]["body_review_context"]["provenance"] == "PROJECT_OWNER_DIRECT_REVIEW"
assert behavior_incidents["WOL-BS-VALENTI-NUCLEAR-ARMED-JETS-20260723"]["body_review_context"]["transcript_status"] == "NOT_MACHINE_RECOVERED"
assert "nuclear-warhead use" in behavior_incidents["WOL-BS-VALENTI-CANCELS-NUCLEAR-STRIKE-20260803"]["body_review_context"]["observation"]

# Valenti now has a separate WOL-native source-behavior record. These findings
# score the publisher-authored presentation itself; they do not bypass the
# transcript gate for claims about what was said inside a video.
valenti_incident_ids = {
    "WOL-BS-VALENTI-SAUDI-NUCLEAR-WEAPONS-20260722",
    "WOL-BS-VALENTI-NUCLEAR-ARMED-JETS-20260723",
    "WOL-BS-VALENTI-RUSSIA-BOMBS-POLAND-20260730",
    "WOL-BS-VALENTI-CANCELS-NUCLEAR-STRIKE-20260803",
    "WOL-BS-VALENTI-US-MILITARY-OUT-OF-AMMO-20260804",
    "WOL-BS-VALENTI-TRUMP-ADMITS-OUT-OF-AMMO-20260806",
    "WOL-BS-VALENTI-31M-SOLDIERS-20260917",
}
assert valenti_incident_ids <= set(behavior_incidents)
for incident_id in valenti_incident_ids:
    incident = behavior_incidents[incident_id]
    assert incident["source_id"] == "WOL-SRC-VALENTI-VIDEOS"
    assert incident["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert incident["evidentiary_support_review"]["supporting_evidence_found"] is False
    assert incident["public_receipts"]

valenti_awards = profiles["WOL-SRC-VALENTI-VIDEOS"]["source_awards"]
assert len(valenti_awards) == 1
valenti_award = valenti_awards[0]
assert valenti_award["award_code"] == "BULLSHITTER"
assert valenti_award["public_label"] == "Bullshitter"
assert valenti_award["qualifying_window_start"] == "2026-07-22T00:00:00"
assert valenti_award["qualifying_window_end"] == "2026-08-06T00:00:00"
assert valenti_award["qualifying_incident_count"] == 6
assert set(valenti_award["qualifying_incident_ids"]) == {
    "WOL-BS-VALENTI-SAUDI-NUCLEAR-WEAPONS-20260722",
    "WOL-BS-VALENTI-NUCLEAR-ARMED-JETS-20260723",
    "WOL-BS-VALENTI-RUSSIA-BOMBS-POLAND-20260730",
    "WOL-BS-VALENTI-CANCELS-NUCLEAR-STRIKE-20260803",
    "WOL-BS-VALENTI-US-MILITARY-OUT-OF-AMMO-20260804",
    "WOL-BS-VALENTI-TRUMP-ADMITS-OUT-OF-AMMO-20260806",
}
assert valenti_award["current_window_status"] == "EARNED_HISTORICAL"
assert valenti_award["currently_active"] is False
assert valenti_award["current_window_incident_count"] == 1
assert valenti_award["current_window_incident_ids"] == [
    "WOL-BS-VALENTI-31M-SOLDIERS-20260917"
]

# The Bullshitter award is independent from legacy direct_verdict / Hall class
# scoring. Valenti earns the award from WOL-native incidents while his
# direct_verdict remains unset and the other research leads remain unscored.
for source_id in (
    "WOL-SRC-VALENTI-VIDEOS",
    "WOL-SRC-ETHAN-LEVINS",
    "WOL-SRC-LIM-TEAN",
):
    assert profiles[source_id]["direct_verdict"] is None
ethan_legacy_incident_ids = {
    "WOL-BS-ETHAN-NETANYAHU-DEAD-20260318",
    "WOL-BS-ETHAN-19-TANKS-2006-PHOTO-20260327",
    "WOL-BS-ETHAN-SARA-RECYCLED-VIDEO-20260321",
    "WOL-BS-ETHAN-TWO-MISSILES-20260322",
    "WOL-BS-ETHAN-CIVILIAN-INFRASTRUCTURE-CEASEFIRE-20260327",
    "WOL-BS-ETHAN-ISRAEL-LOST-PUBLIC-SUPPORT-20260328",
}
assert ethan_legacy_incident_ids <= set(behavior_incidents)
for incident_id in ethan_legacy_incident_ids:
    incident = behavior_incidents[incident_id]
    assert incident["source_id"] == "WOL-SRC-ETHAN-LEVINS"
    assert incident["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    assert incident["evidentiary_support_review"]["supporting_evidence_found"] is False
    assert incident["public_receipts"]

ethan_all_incident_ids = {
    incident_id
    for incident_id, incident in behavior_incidents.items()
    if incident["source_id"] == "WOL-SRC-ETHAN-LEVINS"
}
assert len(ethan_all_incident_ids) == 34
assert all(behavior_incidents[incident_id]["public_receipts"] for incident_id in ethan_all_incident_ids)

ethan_award_incident_ids = {
    "WOL-BS-ETHAN-HOLY-SEPULCHRE-EASTER-CANCELED-20260318",
    "WOL-BS-ETHAN-NETANYAHU-DEAD-20260318",
    "WOL-BS-ETHAN-UKRAINE-OPERATORS-DEFEND-ISRAEL-20260318",
    "WOL-BS-ETHAN-WITKOFF-KUSHNER-ISRAELI-ASSETS-CONFIRMED-20260318",
    "WOL-BS-ETHAN-BENGVIR-17-MEETINGS-DEAD-20260319",
    "WOL-BS-ETHAN-ONLY-US-TROOPS-MISSILE-PROGRAMS-20260320",
}

ethan_awards = profiles["WOL-SRC-ETHAN-LEVINS"]["source_awards"]
assert len(ethan_awards) == 1
ethan_award = ethan_awards[0]
assert ethan_award["award_code"] == "BULLSHITTER"
assert ethan_award["public_label"] == "Bullshitter"
assert ethan_award["qualifying_window_start"] == "2026-03-18T00:00:00"
assert ethan_award["qualifying_window_end"] == "2026-03-20T00:00:00"
assert ethan_award["qualifying_incident_count"] == 6
assert set(ethan_award["qualifying_incident_ids"]) == ethan_award_incident_ids
assert ethan_award["documented_incident_count"] == 34
assert set(ethan_award["documented_incident_ids"]) == ethan_all_incident_ids
assert ethan_award["current_window_status"] == "EARNED_HISTORICAL"
assert ethan_award["currently_active"] is False
assert ethan_award["current_window_incident_count"] == 0
assert ethan_award["current_window_incident_ids"] == []

# One publication event is one award incident even when it contains multiple
# atomic propositions (e.g. March 22 causation + stockpile extrapolation).
assert behavior_incidents["WOL-BS-ETHAN-TWO-MISSILES-20260322"]["source_information_event_id"] == "ETHAN-MARCH22-TWO-MISSILES"
assert "count once" in behavior_incidents["WOL-BS-ETHAN-TWO-MISSILES-20260322"]["downstream_note"]
assert "counts once" in behavior_incidents["WOL-BS-ETHAN-CIVILIAN-INFRASTRUCTURE-CEASEFIRE-20260327"]["evidentiary_support_review"]["search_notes"]

# Tranche 2C established Lim's substrate/bridge decomposition before the
# later full pattern review. Do not freeze his award state here; tranche 2G owns
# the completed six-event award invariant.
assert profiles["WOL-SRC-LIM-TEAN"]["direct_verdict"] is None

hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert not {
    "WOL-SRC-VALENTI-VIDEOS",
    "WOL-SRC-ETHAN-LEVINS",
    "WOL-SRC-LIM-TEAN",
    "WOL-SRC-ZACH-FOR-THE-PEOPLE-FB",
}.intersection(hall_ids)

assert derived["corpus_coverage"]["completion_claim"] == "NONE"

print(
    "web-of-lies social influence tranche2c: PASS "
    "substrate_bridge_decomposition=2 video_body_gate=4 valenti_bullshitter=1 ethan_bullshitter=1 lim_award_state_deferred=1"
)
