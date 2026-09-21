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

canonical = json.loads((ROOT / wol.CANONICAL).read_text(encoding="utf-8"))
governance = json.loads((ROOT / wol.GOVERNANCE).read_text(encoding="utf-8"))
assembled = aggregator.build_forensic_input(ROOT)
derived = wol.build_registry(canonical, assembled, governance)
queue = discovery_builder.build_queue(ROOT)
discovery_builder.validate(ROOT, queue)

items = {row["discovery_id"]: row for row in queue["items"]}
leads = {row["lead_id"]: row for row in derived["research_leads"]}
profiles = {row["source_id"]: row for row in derived["source_profiles"]}

media_rule = governance["osint_collection"]["media_analysis_review"]
assert media_rule["factual_substrate_is_not_inferential_validation"] is True
assert media_rule["accurate_number_does_not_validate_causal_bridge"] is True
assert media_rule["accurate_quote_does_not_validate_motive_or_control_inference"] is True
assert media_rule["upstream_adjudication_required_before_adverse_scoring"] is True

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
assert leads["LEAD-LIM-TEAN"]["current_disposition"] == "UPSTREAM_REVIEW_REQUIRED"

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

# Valenti's long-form review queue tracks videos that need body capture rather
# than treating nuclear/ground-invasion titles as complete narrative evidence.
valenti_lead = leads["LEAD-VALENTI-VIDEOS"]
body_queue = valenti_lead["body_capture_queue"]
assert len(body_queue) >= 5
assert all(row["capture_status"] == "TITLE_DESCRIPTION_ONLY" for row in body_queue)
assert all("TRANSCRIPT" in row["required_next_evidence"] for row in body_queue)
assert any(row["url"].endswith("ESojA5kxiFY") for row in body_queue)
assert any(row["url"].endswith("0ZArFpj6zyA") for row in body_queue)

# Identity/relevance closure remains evidence-bounded.
assert leads["LEAD-ZACH-FOR-THE-PEOPLE"]["identity_status"] == "PUBLIC_IDENTITY_RESOLVED"
assert leads["LEAD-ZACH-FOR-THE-PEOPLE"]["current_disposition"] == "NO_MATERIAL_ATLAS_CLAIM_ACTIVITY_FOUND"
assert profiles["WOL-SRC-ZACH-FOR-THE-PEOPLE-FB"]["identity_confidence"] == "HIGH"
assert leads["LEAD-EL-MARQUES-XD"]["current_disposition"] == "IDENTITY_UNRESOLVED"

# None of this workflow state itself creates behavior findings or Hall score.
for source_id in (
    "WOL-SRC-VALENTI-VIDEOS",
    "WOL-SRC-ETHAN-LEVINS",
    "WOL-SRC-LIM-TEAN",
    "WOL-SRC-ZACH-FOR-THE-PEOPLE-FB",
):
    assert profiles[source_id]["direct_verdict"] is None

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
    "substrate_bridge_decomposition=2 video_body_gate=4 remaining_leads_closed=2"
)
