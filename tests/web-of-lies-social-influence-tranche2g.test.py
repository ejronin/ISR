#!/usr/bin/env python3
"""Regression coverage for parody-labelled real-world factual presentations."""
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

rule = governance["parody_satire_handling"]
assert rule["parody_label_alone_is_not_immunity"] is True
assert rule["clearly_fictional_or_satirical_content_counts"] is False
assert rule["real_world_factual_presentation_is_reviewable"] is True
assert rule["account_label_must_be_preserved"] is True
assert rule["intent_not_required_for_source_behavior_finding"] is True

source_id = "WOL-SRC-MOJTABA-KHAMENEI-PARODY"
incident_id = "WOL-BS-MOJTABA-PARODY-B2-CREW-20260309"

profile = profiles[source_id]
assert "@SupremeLeaderI" in profile["aliases"]
assert any(
    account.get("handle") == "@SupremeLeaderI"
    and account.get("url") == "https://x.com/SupremeLeaderI"
    for account in profile["platform_accounts"]
)
assert "parody label is preserved" in profile["identity_context"]
assert "does not imply official Iranian affiliation" in profile["identity_context"]

incident = incidents[incident_id]
assert incident["source_id"] == source_id
assert incident["event_type"] == "UNSUPPORTED_FACTUAL_ASSERTION"
assert incident["assertion_kind"] == "MEDIA_PRESENTATION"
assert incident["published_at"] == "2026-03-09"
assert "B-2 bomber" in incident["statement_identity"]
assert "captured its entire crew" in incident["statement_identity"]
assert incident["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
assert incident["evidentiary_support_review"]["claimant_basis_status"] == "DOES_NOT_SUPPORT_ASSERTION"
assert incident["evidentiary_support_review"]["supporting_evidence_found"] is False
assert "AI-generated" in incident["evidentiary_support_review"]["claimant_basis_note"]
assert "two-person standard crew" in incident["evidentiary_support_review"]["claimant_basis_note"]
assert "scores the publication, not the label" in incident["evidentiary_support_review"]["search_notes"]
assert "does not establish deceptive intent" in incident["evidentiary_support_review"]["search_notes"]

urls = {row.get("url") for row in incident["public_receipts"]}
assert "https://www.therealfacthunter.com/fact-check-image-claiming-iran-shot-down-a-u-s-b-2-bomber-and-captured-its-entire-crew-is-ai-generated/" in urls
assert "https://www.misbar.com/en/factcheck/2026/03/08/image-claiming-iran-shot-down-b-2-bomber-fabricated" in urls
assert "https://fullfact.org/conflict/fake-B-2-shot-down-image/" in urls
assert "https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104482/b-2-spirit/" in urls

# One account-specific incident is evidence, not an award. Network membership
# neither transfers other claims to this account nor creates a network award.
assert profile["source_awards"] == []
assert profile["direct_verdict"] is None
assert profiles["WOL-SRC-VERIFIED4WAR-NETWORK"]["source_awards"] == []

source_incidents = [
    row for row in incidents.values()
    if row["source_id"] == source_id
]
assert len(source_incidents) == 1

print(
    "web-of-lies social influence tranche2g: PASS "
    "parody_boundary=1 mojtaba_b2_ai_fabrication=1 awards=0"
)
