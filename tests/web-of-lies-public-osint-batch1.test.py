#!/usr/bin/env python3
"""Regression coverage for the first corpus-wide public-OSINT lineage batch."""
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

BATCH_PACKET_IDS = {
    "WOL-PKT-PUBLIC-OSINT-CHAIN-CL-200-US-DEAD-20260921",
    "WOL-PKT-PUBLIC-OSINT-CHAIN-CL-PSAB-JUN8-20260921",
    "WOL-PKT-PUBLIC-OSINT-CHAIN-CL-LINCOLN-20260921",
    "WOL-PKT-PUBLIC-OSINT-CHAIN-CL-KWI-PATRIOT-20260921",
    "WOL-PKT-PUBLIC-OSINT-CHAIN-LL-IRAN-JORDAN-HEAVY-DAMAGE-20260921",
}
BATCH_FAMILIES = {
    "CHAIN-CL-200-US-DEAD",
    "CHAIN-CL-PSAB-JUN8",
    "CHAIN-CL-LINCOLN",
    "CHAIN-CL-KWI-PATRIOT",
    "CHAIN-LL-IRAN-JORDAN-HEAVY-DAMAGE-20260908",
}

packet_ids = {row["packet_id"] for row in assembled["lineage_packets"]}
assert BATCH_PACKET_IDS <= packet_ids

coverage = {
    row["claim_family_id"]: row
    for row in derived["corpus_coverage"]["family_coverage"]
}
for family_id in BATCH_FAMILIES:
    row = coverage[family_id]
    assert row["coverage_status"] == "LINEAGE_TRACED", family_id
    assert row["non_anchor_lineage_events"] >= 2, family_id
    assert row["documented_relationships"] >= 1, family_id
    assert row["public_receipt_count"] >= 1, family_id
assert derived["corpus_coverage"]["completion_claim"] == "NONE"

events = {row["event_id"]: row for row in derived["information_events"]}
relationships = {row["relationship_id"]: row for row in derived["relationships"]}
profiles = {row["source_id"]: row for row in derived["source_profiles"]}

# The >200-dead proposition originates with Mohebbi. Tasnim and bdnews24 remain
# derivative attributed carriers rather than independent corroborators.
origin_200 = events["WOL-EVT-PUB-200-US-DEAD-ORIGIN"]
tasnim_200 = events["WOL-EVT-PUB-200-US-DEAD-TASNIM"]
bdnews_200 = events["WOL-EVT-PUB-200-US-DEAD-BDNEWS24"]
assert origin_200["event_type"] == "FALSE_OR_MISLEADING_CONNECTION"
assert tasnim_200["event_type"] == "REPORTS"
assert bdnews_200["event_type"] == "REPORTS"
assert tasnim_200["independence_status"] == "DERIVATIVE"
assert bdnews_200["independence_status"] == "DERIVATIVE"
assert tasnim_200["behavior_findings"] == []
assert bdnews_200["behavior_findings"] == []

family_200_events = [
    row for row in derived["information_events"]
    if row["claim_family_id"] == "CHAIN-CL-200-US-DEAD"
    and row["event_id"].startswith("WOL-EVT-PUB-")
]
assert wol.metrics_for_events([row for row in family_200_events if row["source_id"] == "WOL-SRC-HOSSEIN-MOHEBBI"])[
    "false_misleading_findings_connected"
] == 1
assert wol.metrics_for_events([row for row in family_200_events if row["source_id"] == "WOL-SRC-TASNIM"])[
    "false_misleading_findings_connected"
] == 0
assert wol.metrics_for_events([row for row in family_200_events if row["source_id"] == "WOL-SRC-BDNEWS24"])[
    "false_misleading_findings_connected"
] == 0

network_200 = next(
    row for row in derived["network_analysis"]["family_analysis"]
    if row["claim_family_id"] == "CHAIN-CL-200-US-DEAD"
)
assert network_200["derivative_repetition_events"] >= 2
assert network_200["independent_corroboration_events"] == 0

# Prince Sultan keeps the unknown social-media origin unresolved and records the
# explicit Saudi correction without inventing an account identity.
psab_origin = events["WOL-EVT-PUB-PSAB-JUN8-RUMOR"]
psab_correction = events["WOL-EVT-PUB-PSAB-JUN8-CORRECTION"]
assert profiles["WOL-SRC-UNIDENTIFIED-PSAB-RUMOR"]["identity_confidence"] == "UNRESOLVED"
assert psab_origin["independence_status"] == "UNKNOWN"
assert "originating account/post has not been established" in psab_origin["provenance_limit"]
assert psab_correction["event_type"] == "CORRECTION"
assert psab_correction["corrects_event_id"] == psab_origin["event_id"]
assert relationships["WOL-REL-PUB-PSAB-JUN8-001"]["relationship_type"] == "CORRECTS"

# Wikipedia is a reproducible propagation surface, not an automatic misconduct
# finding. Fixed revisions/talk receipts must remain neutral.
lincoln_wiki = events["WOL-EVT-PUB-LINCOLN-WIKIPEDIA"]
kuwait_wiki = events["WOL-EVT-PUB-KWI-PATRIOT-WIKIPEDIA"]
kuwait_talk = events["WOL-EVT-PUB-KWI-PATRIOT-WIKI-TALK"]
jordan_wiki = events["WOL-EVT-PUB-JORDAN-HEAVY-DAMAGE-WIKIPEDIA"]
for row in (lincoln_wiki, kuwait_wiki, kuwait_talk, jordan_wiki):
    assert row["behavior_findings"] == []
    assert row["event_type"] == "REPORTS"
    assert row["collection_surface"] == "WIKIPEDIA"
    assert row["public_receipts"]
    assert all(receipt["surface"] == "WIKIPEDIA" for receipt in row["public_receipts"])

assert lincoln_wiki["public_receipts"][0]["revision_id"] == "1375181497"
assert kuwait_wiki["public_receipts"][0]["revision_id"] == "1371192876"
assert jordan_wiki["public_receipts"][0]["revision_id"] == "1375826662"
assert kuwait_talk["osint_event_kind"] == "TALK_PAGE_EDIT_REQUEST"
assert kuwait_talk["public_receipts"][0]["talk_section_url"]
assert "not evidence of deceptive editing" in kuwait_talk["plain_english_verdict"]

# The Kuwait and Jordan carrier records preserve attributed/contrary context
# without promoting the carrier into an independent origin.
kuwait_origin = events["WOL-EVT-PUB-KWI-PATRIOT-MOHEBBI"]
assert kuwait_origin["event_type"] == "FALSE_OR_MISLEADING_CONNECTION"
assert kuwait_wiki["independence_status"] == "DERIVATIVE"

jordan_origin = events["WOL-EVT-PUB-JORDAN-HEAVY-DAMAGE-IRGC"]
jordan_carrier = events["WOL-EVT-PUB-JORDAN-HEAVY-DAMAGE-IRANWIRE"]
assert jordan_origin["event_type"] == "FALSE_OR_MISLEADING_CONNECTION"
assert jordan_carrier["event_type"] == "REPORTS"
assert jordan_carrier["behavior_findings"] == []
assert jordan_carrier["independence_status"] == "DERIVATIVE"

# None of the batch's manual packet construction may contain manual Hall rank
# or score fields.
for packet in BATCH_PACKET_IDS:
    packet_row = next(row for row in assembled["lineage_packets"] if row["packet_id"] == packet)
    doc = json.loads((ROOT / packet_row["path"]).read_text(encoding="utf-8"))
    for profile in doc["source_profiles"]:
        assert not {
            "hall_of_shame_rank",
            "hall_of_shame_score",
            "manual_rank",
            "manual_score",
            "featured_rank",
        }.intersection(profile)

print(
    "web-of-lies public OSINT batch1: PASS "
    f"families={len(BATCH_FAMILIES)} packets={len(BATCH_PACKET_IDS)}"
)
