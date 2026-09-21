#!/usr/bin/env python3
"""Regression coverage for named-lead social/influence tranche 2B."""
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

queue_items = {row["discovery_id"]: row for row in queue["items"]}
profiles = {row["source_id"]: row for row in derived["source_profiles"]}
leads = {row["lead_id"]: row for row in derived["research_leads"]}

valenti_ids = {
    "WOL-DISC-VALENTI-31M-SOLDIERS-20260917",
    "WOL-DISC-VALENTI-US-BASES-COMPLETELY-DESTROYED-20260917",
    "WOL-DISC-VALENTI-US-CASUALTY-COVERUP-20260721",
    "WOL-DISC-VALENTI-US-MILITARY-ALLOWED-IRAN-MISSILES-20260727",
}
assert valenti_ids <= set(queue_items)

# Every Valenti discovery in this tranche is still upstream: WOL has receipts
# and proposition identity, but Claims Forensics has not assigned an atom/family.
for discovery_id in valenti_ids:
    row = queue_items[discovery_id]
    assert row["discovery_type"] == "ADJUDICATION_REVIEW_CANDIDATE"
    assert row["claim_family_ref"] is None
    assert row["status"] == "AWAITING_CANONICAL_CLAIM_FAMILY"
    assert row["review_target"] == "INFORMATION_CLAIMS_AND_FORENSIC_ADJUDICATION"
    assert row["public_receipts"]
    assert any(
        receipt["provenance_status"] == "ORIGINAL_URL"
        and receipt["url"].startswith("https://www.youtube.com/")
        for receipt in row["public_receipts"]
    )

# The two Sep. 17 discoveries are no longer channel-index-only; direct video
# identities are preserved alongside the earlier secondary index receipts.
assert any(
    receipt["url"] == "https://www.youtube.com/watch?v=QfDgemtUt04"
    for receipt in queue_items["WOL-DISC-VALENTI-31M-SOLDIERS-20260917"]["public_receipts"]
)
assert any(
    receipt["url"] == "https://www.youtube.com/watch?v=nqd977hHQfM"
    for receipt in queue_items[
        "WOL-DISC-VALENTI-US-BASES-COMPLETELY-DESTROYED-20260917"
    ]["public_receipts"]
)

coverup = queue_items["WOL-DISC-VALENTI-US-CASUALTY-COVERUP-20260721"]
assert any(
    receipt["url"] == "https://www.youtube.com/watch?v=dcPbU2XaSSo"
    and receipt["published_at"] == "2026-07-21"
    for receipt in coverup["public_receipts"]
)
assert "distinct from CHAIN-CL-200-US-DEAD" in coverup["downstream_note"]

allowance = queue_items[
    "WOL-DISC-VALENTI-US-MILITARY-ALLOWED-IRAN-MISSILES-20260727"
]
assert any(
    receipt["url"] == "https://www.youtube.com/watch?v=H0BfiwKhoVs"
    for receipt in allowance["public_receipts"]
)
assert "Do not score the title alone as bullshit" in allowance["downstream_note"]
assert "interceptor rationing" in allowance["downstream_note"]
assert allowance["project_owner_direct_review"]["transcript_status"] if "transcript_status" in allowance["project_owner_direct_review"] else True
assert "did not care" in allowance["project_owner_direct_review"]["observation"]
assert "not yet a scored WOL-native incident" in allowance["project_owner_direct_review"]["evidentiary_limit"]

# Nearby control: a dramatic July 20 casualty headline remains research context,
# not an adverse discovery solely because it came from the same publisher.
valenti_lead = leads["LEAD-VALENTI-VIDEOS"]
assert "https://www.youtube.com/watch?v=IrZ6HEpHoIE" in valenti_lead["seed_urls"]
comparator_url = "https://www.youtube.com/watch?v=IrZ6HEpHoIE"
assert comparator_url in valenti_lead["seed_urls"]
assert not any(
    receipt.get("url") == comparator_url
    for row in queue_items.values()
    for receipt in row.get("public_receipts", [])
)
assert not any(
    "17-US" in discovery_id or "17_US" in discovery_id
    for discovery_id in queue_items
)

# Discovery/research status still cannot create source behavior or Hall score.
valenti = profiles["WOL-SRC-VALENTI-VIDEOS"]
assert valenti["behavior_classes"] == ["UNKNOWN"]
assert valenti["direct_verdict"] is None
assert valenti["metrics"]["false_misleading_findings_connected"] == 0
hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert "WOL-SRC-VALENTI-VIDEOS" not in hall_ids
assert derived["corpus_coverage"]["completion_claim"] == "NONE"

print(
    "web-of-lies social influence tranche2b: PASS "
    f"valenti_review_candidates={len(valenti_ids)} comparator=1"
)
