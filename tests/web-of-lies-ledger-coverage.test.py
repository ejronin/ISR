#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_web_of_lies as wol
import build_web_of_lies_baseline_packets as baseline
import build_web_of_lies_forensic_input as aggregate


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


chain_index = load(baseline.CHAIN_INDEX_PATH)
indexed_chains = {row["chain_id"]: row for row in chain_index["chains"]}
assert len(indexed_chains) == 13, f"expected 13 indexed forensic chains, found {len(indexed_chains)}"
assert baseline.MANUAL_CHAIN_IDS == {"CH-F15E-CSAR-URANIUM"}

expected = baseline.expected_packets(ROOT)
assert len(expected) == 12, f"expected 12 generated packets plus one manual packet, found {len(expected)} generated"
for path, packet in expected.items():
    assert path.is_file(), f"missing generated lineage packet {path.relative_to(ROOT)}"
    actual = json.loads(path.read_text(encoding="utf-8"))
    assert actual == packet, f"stale generated lineage packet {path.relative_to(ROOT)}"

manual_path = ROOT / aggregate.PACKET_DIR / "f15e-csar-uranium.json"
assert manual_path.is_file(), "manual F-15E lineage packet missing"

packet_paths = sorted((ROOT / aggregate.PACKET_DIR).glob("*.json"))
packets = [json.loads(path.read_text(encoding="utf-8")) for path in packet_paths]
packet_families = {row["claim_family_id"] for row in packets}
assert set(indexed_chains) == packet_families, (
    f"packet family coverage differs from forensic chain index: "
    f"missing={sorted(set(indexed_chains) - packet_families)} "
    f"extra={sorted(packet_families - set(indexed_chains))}"
)

claim_refs: dict[str, set[str]] = {}
for packet in packets:
    refs = set()
    for event in packet.get("information_events") or []:
        refs.update(event.get("canonical_claim_refs") or [])
    claim_refs[packet["claim_family_id"]] = refs

for chain_id, chain in indexed_chains.items():
    missing_claims = set(chain.get("claim_ids") or []) - claim_refs.get(chain_id, set())
    assert not missing_claims, f"{chain_id} missing Web of Lies claim refs: {sorted(missing_claims)}"

# Current public-ready Claims Forensics propositions attached to these families
# must also appear in Web of Lies, even when they post-date the legacy corpus.
semantic_overlay = load(baseline.SEMANTIC_OVERLAY_PATH)
legacy_claim_ids = {
    str(row["claim_id"])
    for row in baseline.rows(load(baseline.CLAIMS_PATH), "claims", "records")
}
current_extras = baseline.current_overlay_extras(
    semantic_overlay,
    legacy_claim_ids,
    set(indexed_chains),
)
for chain_id, rows in current_extras.items():
    for row in rows:
        refs = claim_refs.get(chain_id, set())
        assert row["claim_id"] in refs, f"{chain_id} missing current claim {row['claim_id']}"
        assert row["claim_instance_id"] in refs, (
            f"{chain_id} missing current claim instance {row['claim_instance_id']}"
        )

event_by_ref = {}
for packet in packets:
    for event in packet["information_events"]:
        for ref in event.get("canonical_claim_refs") or []:
            event_by_ref.setdefault(ref, []).append(event)

for ref in (
    "CI-CLM-IRGC-QESHM-MQ9-LOSS-20260916-P01",
    "CI-CLM-IRGC-QESHM-MQ9-52-20260916-P01",
    "CI-CLM-IRGC-QESHM-MQ9-LOSS-20260917-P01",
    "CI-CLM-IRGC-QESHM-MQ9-53-20260917-P01",
):
    events = event_by_ref[ref]
    assert events, f"missing Qeshm current-overlay lineage for {ref}"
    assert all(event["event_type"] == "REPORTS" for event in events)
    assert not any(event["event_type"] in wol.ADVERSE_FAMILY_EVENT_TYPES for event in events)
    assert not any(
        set(event.get("behavior_findings") or []).intersection(
            set(load(wol.GOVERNANCE)["hall_of_shame"]["hall_of_shame_classes"])
        )
        for event in events
    ), f"unresolved/no-lie Qeshm claim leaked into Hall behavior: {ref}"

for ref in (
    "CI-MEDIA-MED-001",
    "CI-MEDIA-MED-002",
    "CI-MEDIA-MED-003",
    "CI-MEDIA-MED-004",
    "CI-MEDIA-MED-005",
    "CI-MEDIA-MED-007",
):
    events = event_by_ref[ref]
    assert len(events) == 1, f"false-media artifact {ref} should have one unattributed event"
    event = events[0]
    assert event["event_type"] == "FALSE_MEDIA_ARTIFACT"
    assert event["behavior_findings"] == []
    assert event.get("provenance_limit") == "OFFICIAL_ORIGIN_NOT_ESTABLISHED"
    assert event["source_id"].startswith("WOL-SRC-UNATTRIBUTED-MEDIA-")

aircraft_packet = next(row for row in packets if row["claim_family_id"] == "CH-AIRCRAFT-KILL-AGGREGATES")
cbs_context = next(
    event for event in aircraft_packet["information_events"]
    if event["event_id"] == "WOL-EVT-AIRCRAFT_KILL_AGGREGATES-MQ1-CONTEXT-20260917"
)
assert cbs_context["context_scope"] == "TYPE_SPECIFIC_EXTERNAL_CONTEXT_NOT_QESHM_IDENTIFICATION"
assert cbs_context["independently_sourced"] is True
assert not any(
    relation["from_id"] == cbs_context["event_id"] or relation["to_id"] == cbs_context["event_id"]
    for relation in aircraft_packet["relationships"]
), "CBS type-specific context was incorrectly wired as Qeshm corroboration/contradiction"

discovery = load("data/web-of-lies/discovery-queue.json")
assert discovery["artifact_role"] == "WEB_OF_LIES_DISCOVERY_QUEUE"
assert {row["discovery_id"] for row in discovery["items"]} == {
    "WOL-IN-ROOK-F15SA-20260920",
    "WOL-IN-ROOK-TREND-20260920",
    "WOL-IN-ROOK-IRAN-CONDITIONS-20260920",
    "WOL-IN-ROOK-RIYADH-20260920",
}
assert all(row["claim_family_ref"] is None for row in discovery["items"])
assert all(row["status"] == "AWAITING_CANONICAL_CLAIM_FAMILY" for row in discovery["items"])
assert "WOL-IN-ROOK-MQ9-52-53-20260920" not in {
    row["discovery_id"] for row in discovery["items"]
}, "assigned aircraft-kill handoff was incorrectly left in the unassigned discovery queue"

for control_chain in ("CH-DENA-ADMISSION", "CH-TANGSIRI-ADMISSION"):
    packet = next(row for row in packets if row["claim_family_id"] == control_chain)
    adverse = [
        event["event_id"]
        for event in packet["information_events"]
        if event["event_type"] in wol.ADVERSE_FAMILY_EVENT_TYPES
    ]
    assert not adverse, f"{control_chain} admission-latency control was converted into adverse incidents: {adverse}"
    negative_classes = set(load(wol.GOVERNANCE)["hall_of_shame"]["hall_of_shame_classes"])
    for profile in packet["source_profiles"]:
        assert not negative_classes.intersection(profile.get("behavior_classes") or []), (
            f"{control_chain} admission control assigned Hall class to {profile['source_id']}"
        )

forensic = aggregate.build_forensic_input(ROOT)
assert len(forensic["lineage_packets"]) == 13
assert len({row["claim_family_id"] for row in forensic["lineage_packets"]}) == 13

canonical = load(wol.CANONICAL)
governance = load(wol.GOVERNANCE)
registry = wol.build_registry(canonical, forensic, governance)
family_by_id = {row["claim_family_id"]: row for row in registry["claim_families"]}
for chain_id in indexed_chains:
    assert chain_id in family_by_id, f"canonical Lie Ledger no longer exposes indexed chain {chain_id}"
    assert family_by_id[chain_id]["trace_status"] == "TRACED", f"{chain_id} is not fully traced"

hall = registry["hall_of_shame"]["all_time"]
neutral_classes = {
    "JOURNALISTIC_SOURCE",
    "OFFICIAL_SOURCE",
    "SUBJECT_MATTER_ANALYST",
    "UNKNOWN",
}
assert not neutral_classes.intersection(hall), f"neutral classes leaked into Hall of Shame: {sorted(neutral_classes.intersection(hall))}"
assert hall, "full-ledger coverage produced no evidence-derived Hall of Shame categories"

state_entries = hall.get("STATE_OFFICIAL_MISINFORMATION_SOURCE") or []
assert state_entries, "documented state/official misinformation corpus produced no qualifying Hall entries"
state_ids = {row["source_id"] for row in state_entries}
assert "WOL-SRC-PRESS-TV" in state_ids or "WOL-SRC-TASNIM" in state_ids or "WOL-SRC-KHATAM-AL-ANBIYA" in state_ids

profiles = {row["source_id"]: row for row in registry["source_profiles"]}
irgc = profiles.get("WOL-SRC-IRGC")
if irgc:
    adverse_irgc_families = {
        event["claim_family_id"]
        for event in registry["information_events"]
        if event["source_id"] == "WOL-SRC-IRGC" and event["event_type"] in wol.ADVERSE_FAMILY_EVENT_TYPES
    }
    assert irgc["metrics"]["claim_families_traced"] == len(adverse_irgc_families)
    assert "CH-TANGSIRI-ADMISSION" not in adverse_irgc_families

print(
    "web-of-lies ledger coverage: PASS "
    f"packets={len(packets)} indexed_families={len(indexed_chains)} "
    f"events={len(forensic['information_events'])} hall_classes={len(hall)}"
)
