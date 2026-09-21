#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_web_of_lies as wol  # noqa: E402
import build_web_of_lies_baseline_packets as legacy  # noqa: E402
import build_web_of_lies_current_anchor_packets as anchors  # noqa: E402
import build_web_of_lies_discovery_queue as discovery_builder  # noqa: E402
import build_web_of_lies_forensic_input as aggregate  # noqa: E402
import build_web_of_lies_sep20_reconciliation_packets as sep20  # noqa: E402
import build_web_of_lies_source_promotion_control_packets as controls  # noqa: E402


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


# The old 13-chain forensic index remains historical input only. Its regional
# false-flag mega-chain is explicitly retired by Claims Forensics.
assert legacy.MANUAL_CHAIN_IDS == {"CH-F15E-CSAR-URANIUM"}
assert legacy.RETIRED_LEGACY_CHAIN_IDS == {"CH-FALSE-FLAG-REGIONAL"}
legacy_expected = legacy.expected_packets(ROOT)
assert len(legacy_expected) == 11, (
    f"expected 11 generated rich legacy packets after retiring false-flag mega-chain, "
    f"found {len(legacy_expected)}"
)
for path, packet in legacy_expected.items():
    assert path.is_file(), f"missing rich lineage packet {path.relative_to(ROOT)}"
    assert json.loads(path.read_text(encoding="utf-8")) == packet, (
        f"stale rich lineage packet {path.relative_to(ROOT)}"
    )

retired_path = ROOT / aggregate.PACKET_DIR / "false-flag-regional.json"
assert not retired_path.exists(), "retired CH-FALSE-FLAG-REGIONAL packet returned"

# Reconstruct the exact current Claims Forensics record set used by production.
current_records, overlay = anchors.current_records(ROOT)
active_chain_ids = set(overlay["chain_overrides"])
record_chain_ids = {str(row.get("chain_id") or "") for row in current_records}
assert active_chain_ids <= record_chain_ids, (
    "active Claims Forensics chain missing from reconstructed current records: "
    f"{sorted(active_chain_ids - record_chain_ids)}"
)
assert "CH-FALSE-FLAG-REGIONAL" not in active_chain_ids
for split_chain in (
    "CH-ARAMCO-FALSE-FLAG-20260302",
    "CH-ERBIL-KUWAIT-FALSE-FLAG-20260315",
    "CH-SHAHED-CLONE-FALSE-FLAG-20260315",
):
    assert split_chain in active_chain_ids

# One neutral anchor packet exists for every active current chain.
anchor_expected = anchors.expected_packets(ROOT)
anchor_family_ids = [packet["claim_family_id"] for packet in anchor_expected.values()]
assert set(anchor_family_ids) == active_chain_ids, (
    "current-anchor packet families differ from active Claims Forensics authority: "
    f"missing={sorted(active_chain_ids - set(anchor_family_ids))} "
    f"extra={sorted(set(anchor_family_ids) - active_chain_ids)}"
)
assert len(anchor_expected) == len(active_chain_ids)
assert len(anchor_family_ids) == len(set(anchor_family_ids))
for path, packet in anchor_expected.items():
    assert path.is_file(), f"missing current anchor packet {path.relative_to(ROOT)}"
    assert json.loads(path.read_text(encoding="utf-8")) == packet, (
        f"stale current anchor packet {path.relative_to(ROOT)}"
    )
    assert packet["generation_mode"] == "CURRENT_CLAIMS_FORENSICS_CANONICAL_ANCHOR"
    assert all(event["event_type"] == "CANONICAL_CLAIM_ANCHOR" for event in packet["information_events"])
    assert all(event["behavior_findings"] == [] for event in packet["information_events"])

anchor_packets = list(anchor_expected.values())
anchor_events = [
    event
    for packet in anchor_packets
    for event in packet["information_events"]
]
anchor_refs = {
    ref
    for event in anchor_events
    for ref in event.get("canonical_claim_refs") or []
}
public_records = [
    row for row in current_records
    if row.get("publication_status") == "PUBLIC_READY"
]
blocked_records = [
    row for row in current_records
    if row.get("publication_status") != "PUBLIC_READY"
]
assert len(anchor_events) == len(public_records)
current_instance_ids = {
    str(record["claim_instance_id"])
    for record in current_records
}
public_instance_ids = {
    str(record["claim_instance_id"])
    for record in public_records
}
blocked_instance_ids = {
    str(record["claim_instance_id"])
    for record in blocked_records
}
anchor_instance_refs = anchor_refs.intersection(current_instance_ids)
assert anchor_instance_refs == public_instance_ids, (
    "neutral anchor instance coverage differs from PUBLIC_READY Claims Forensics records: "
    f"missing={sorted(public_instance_ids - anchor_instance_refs)} "
    f"extra={sorted(anchor_instance_refs - public_instance_ids)}"
)
assert not blocked_instance_ids.intersection(anchor_refs), (
    "blocked current claim leaked into neutral anchor output: "
    f"{sorted(blocked_instance_ids.intersection(anchor_refs))}"
)

# The Sep. 20 Evidence Integration handoff keeps only genuinely unassigned
# sequences in discovery. PR #161's Claims Forensics maintenance placements
# deterministically resolve Trend, Riyadh/Yanbu and seven-condition chronology.
discovery = discovery_builder.build_queue(ROOT)
tracked_discovery = load(discovery_builder.OUTPUT)
assert discovery == tracked_discovery
native_input = load(discovery_builder.NATIVE_DISCOVERIES)
native_input_by_id = {
    row["discovery_id"]: row
    for row in native_input["items"]
}
native_discoveries = {
    row["discovery_id"]: row
    for row in discovery["items"]
    if row.get("source_handoff_path") == discovery_builder.NATIVE_DISCOVERIES
}
assert set(native_discoveries) == set(native_input_by_id), (
    "derived discovery queue differs from governed native-discovery input: "
    f"missing={sorted(set(native_input_by_id) - set(native_discoveries))} "
    f"extra={sorted(set(native_discoveries) - set(native_input_by_id))}"
)
for discovery_id, row in native_discoveries.items():
    assert row["status"] == "AWAITING_CANONICAL_CLAIM_FAMILY"
    assert row["claim_family_ref"] is None
    assert row["discovery_type"] in {
        "FORENSIC_DISCOVERY",
        "EVIDENCE_PROMOTION_CANDIDATE",
        "ADJUDICATION_REVIEW_CANDIDATE",
    }
    assert row["discovery_type"] == native_input_by_id[discovery_id]["discovery_type"]
    assert row["review_target"] == "INFORMATION_CLAIMS_AND_FORENSIC_ADJUDICATION"
    assert row["source_handoff_path"] == discovery_builder.NATIVE_DISCOVERIES
    assert row["public_receipts"]
    assert all(receipt["url"].startswith("https://") for receipt in row["public_receipts"])

handala = native_discoveries["WOL-DISC-HANDALA-MOIS-20260319"]
assert "does not independently verify every hack claim" in handala["attribution_scope"]
assert any(
    observation["observation_type"] == "CLAIMED_COMPROMISE"
    for observation in handala["observations"]
)

chosen_brick = native_discoveries["WOL-DISC-CHOSEN-BRICK-IRAN-STATE-20260915"]
assert "does not identify Handala" in chosen_brick["attribution_scope"]
assert "Do not merge this discovery with Handala" in chosen_brick["downstream_note"]
handoff = load(discovery_builder.HANDOFF)
assert discovery["as_of"] == max(
    str(handoff.get("as_of") or ""),
    str(native_input.get("as_of") or ""),
)

assert discovery["resolved_existing_claim_sequences"] == [{
    "sequence_id": "WOL-IN-ROOK-F15SA-20260920",
    "status": "EXISTING_CANONICAL_CLAIM_CONTINUITY",
    "claim_id": "CLM-HOUTHI-F15SA-CAUSATION-20260916",
    "chain_id": "CH-RSAF-F15SA-MARIB-20260916",
    "routing_path": "data/evidence-integration/rook-catchup-claims-routing-20260920.json",
}]
resolved = {
    row["sequence_id"]: row
    for row in discovery["resolved_canonical_claim_sequences"]
}
assert {
    key: (row["status"], row["claim_family_ref"], row["claims_forensics_disposition"])
    for key, row in resolved.items()
} == {
    "WOL-IN-ROOK-TREND-20260920": (
        "CANONICAL_CLAIM_FAMILY_ASSIGNED",
        "CH-HORMUZ-TREND-TANKER-20260917",
        "NEW_ACCUSATION_CHAIN_PUBLIC_READY",
    ),
    "WOL-IN-ROOK-RIYADH-20260920": (
        "CANONICAL_CLAIM_FAMILY_ASSIGNED",
        "CH-HOUTHI-RIYADH-YANBU-20260919",
        "NEW_ACCUSATION_CHAIN_PUBLIC_READY",
    ),
    "WOL-IN-ROOK-IRAN-CONDITIONS-20260920": (
        "EXISTING_CANONICAL_CLAIM_CHRONOLOGY_ADVANCE",
        "CH-HORMUZ-NEGOTIATING-CLAIMS-20260912",
        "EXISTING_CONTROL_CHAIN_CHRONOLOGY_ADVANCE",
    ),
}
maintenance = discovery_builder._maintenance_routes(load(discovery_builder.CLAIMS_MAINTENANCE))
assert discovery_builder.canonical_resolution(
    "WOL-IN-UNASSIGNED-CANARY", maintenance, active_chain_ids
) is None, "genuinely unassigned discovery must remain fail-closed"
assert "WOL-IN-ROOK-MQ9-52-53-20260920" not in resolved

# Aggregated packet family IDs must be a subset of and collectively cover the
# active current Lie Ledger universe. Multiple packets per family are expected:
# rich lineage + neutral current anchor.
forensic = aggregate.build_forensic_input(ROOT)
packet_families = {row["claim_family_id"] for row in forensic["lineage_packets"]}
assert packet_families == active_chain_ids, (
    f"Web of Lies packet family set differs from active Claims Forensics ledger: "
    f"missing={sorted(active_chain_ids - packet_families)} "
    f"extra={sorted(packet_families - active_chain_ids)}"
)
manual_packet_paths = {
    (Path(aggregate.PACKET_DIR) / f"{legacy.slug(chain_id)}.json").as_posix()
    for chain_id in legacy.MANUAL_CHAIN_IDS
}
sep20_expected = sep20.expected_packets(ROOT)
for path, packet in sep20_expected.items():
    assert path.is_file(), f"missing Sep. 20 lineage packet {path.relative_to(ROOT)}"
    assert json.loads(path.read_text(encoding="utf-8")) == packet
assert len(sep20_expected) == 3
assert len({packet["claim_family_id"] for packet in sep20_expected.values()}) == 3

control_expected = controls.expected_packets(ROOT)
for path, packet in control_expected.items():
    assert path.is_file(), f"missing source-promotion control packet {path.relative_to(ROOT)}"
    assert json.loads(path.read_text(encoding="utf-8")) == packet
    assert packet["generation_mode"] == "CLAIMS_FORENSICS_SOURCE_PROMOTION_CONTROL_LINEAGE"
    assert all(event["event_type"] == "REPORTS" for event in packet["information_events"])
    assert all(event["behavior_findings"] == [] for event in packet["information_events"])
assert len(control_expected) == 3
assert len({packet["claim_family_id"] for packet in control_expected.values()}) == 3
manual_osint_paths = set()
for path in sorted((ROOT / aggregate.PACKET_DIR).glob("*.json")):
    packet = json.loads(path.read_text(encoding="utf-8"))
    if packet.get("generation_mode") != "MANUAL_PUBLIC_OSINT_LINEAGE":
        continue
    relative = path.relative_to(ROOT).as_posix()
    assert packet["claim_family_id"] in active_chain_ids, (
        f"{relative}: manual public-OSINT packet targets non-canonical family"
    )
    events = packet.get("information_events") or []
    assert events and any(event.get("public_receipts") for event in events), (
        f"{relative}: manual public-OSINT packet lacks public receipt-backed events"
    )
    manual_osint_paths.add(relative)

expected_packet_paths = {
    path.relative_to(ROOT).as_posix()
    for path in legacy_expected
} | {
    path.relative_to(ROOT).as_posix()
    for path in anchor_expected
} | {
    path.relative_to(ROOT).as_posix()
    for path in sep20_expected
} | {
    path.relative_to(ROOT).as_posix()
    for path in control_expected
} | manual_packet_paths | manual_osint_paths
forensic_packet_paths = {row["path"] for row in forensic["lineage_packets"]}
assert forensic_packet_paths == expected_packet_paths, (
    "aggregated Web of Lies packet inventory does not reconcile generated, manual, "
    "and current-anchor populations: "
    f"missing={sorted(expected_packet_paths - forensic_packet_paths)} "
    f"extra={sorted(forensic_packet_paths - expected_packet_paths)}"
)
assert len(forensic["lineage_packets"]) == len(expected_packet_paths)

# Sep. 20 rich continuity is lineage-only and cannot inflate Hall metrics.
sep20_event_ids = {
    event["event_id"]
    for packet in sep20_expected.values()
    for event in packet["information_events"]
}
sep20_relationship_ids = {
    relation["relationship_id"]
    for packet in sep20_expected.values()
    for relation in packet["relationships"]
}
assert sep20_event_ids
for event in forensic["information_events"]:
    if event["event_id"] in sep20_event_ids:
        assert event["event_type"] == "REPORTS"
        assert event["behavior_findings"] == []
        assert event.get("correction_state") is None
        assert event["event_type"] not in wol.ADVERSE_FAMILY_EVENT_TYPES

sep20_relationships = {
    row["relationship_id"]: row
    for row in forensic["relationships"]
    if row["relationship_id"] in sep20_relationship_ids
}
assert any(row["relationship_type"] == "DETAIL_EXPANDS" for row in sep20_relationships.values())
condition_events = [
    event for event in forensic["information_events"]
    if event["event_id"] in sep20_event_ids
    and event["claim_family_id"] == "CH-HORMUZ-NEGOTIATING-CLAIMS-20260912"
]
assert condition_events and all(event["correction_state"] is None for event in condition_events)

trend_independent = next(
    event for event in forensic["information_events"]
    if event["event_id"] == "WOL-EVT-SEP20-TREND-UKMTO-INDEPENDENT"
)
assert "CI-CLM-IRGC-TREND-TANKER-20260917-P01" in trend_independent["canonical_claim_refs"]
assert "CI-CLM-TREND-US-DIRECTION-20260918-P01" not in trend_independent["canonical_claim_refs"]

riyadh_location = next(
    event for event in forensic["information_events"]
    if event["event_id"] == "WOL-EVT-SEP20-RIYADH-REUTERS-LOCATION"
)
assert "CI-CLM-HOUTHI-RIYADH-YANBU-20260919-P02" in riyadh_location["canonical_claim_refs"]
assert "CI-CLM-HOUTHI-RIYADH-YANBU-20260919-P03" not in riyadh_location["canonical_claim_refs"]

# Current no-lie/unresolved Qeshm branches remain neutral in the rich lineage.
qeshm_refs = {
    "CI-CLM-IRGC-QESHM-MQ9-LOSS-20260916-P01",
    "CI-CLM-IRGC-QESHM-MQ9-52-20260916-P01",
    "CI-CLM-IRGC-QESHM-MQ9-LOSS-20260917-P01",
    "CI-CLM-IRGC-QESHM-MQ9-53-20260917-P01",
}
rich_qeshm = [
    event
    for event in forensic["information_events"]
    if qeshm_refs.intersection(event.get("canonical_claim_refs") or [])
    and event["event_type"] != "CANONICAL_CLAIM_ANCHOR"
]
assert rich_qeshm
assert all(event["event_type"] == "REPORTS" for event in rich_qeshm)
assert not any(event["event_type"] in wol.ADVERSE_FAMILY_EVENT_TYPES for event in rich_qeshm)

# False media can be adjudicated false without inventing official provenance.
for ref in (
    "CI-MEDIA-MED-001",
    "CI-MEDIA-MED-002",
    "CI-MEDIA-MED-003",
    "CI-MEDIA-MED-004",
    "CI-MEDIA-MED-005",
    "CI-MEDIA-MED-007",
):
    rich_media = [
        event
        for event in forensic["information_events"]
        if ref in (event.get("canonical_claim_refs") or [])
        and event["event_type"] == "FALSE_MEDIA_ARTIFACT"
    ]
    assert len(rich_media) == 1, f"expected one rich false-media event for {ref}"
    event = rich_media[0]
    assert event["behavior_findings"] == []
    assert event.get("provenance_limit") == "OFFICIAL_ORIGIN_NOT_ESTABLISHED"
    assert event["source_id"].startswith("WOL-SRC-UNATTRIBUTED-MEDIA-")

# Admission-latency controls remain non-adverse even though they retain rich
# contextual packets.
for control_chain in ("CH-DENA-ADMISSION", "CH-TANGSIRI-ADMISSION"):
    adverse = [
        event["event_id"]
        for event in forensic["information_events"]
        if event["claim_family_id"] == control_chain
        and event["event_type"] in wol.ADVERSE_FAMILY_EVENT_TYPES
    ]
    assert not adverse, f"{control_chain} was converted into adverse Web of Lies incidents: {adverse}"

canonical = load(wol.CANONICAL)
governance = load(wol.GOVERNANCE)
registry = wol.build_registry(canonical, forensic, governance)
family_by_id = {row["claim_family_id"]: row for row in registry["claim_families"]}
assert set(family_by_id) == active_chain_ids

public_by_chain = {}
for record in public_records:
    public_by_chain.setdefault(record["chain_id"], 0)
    public_by_chain[record["chain_id"]] += 1
for chain_id in active_chain_ids:
    if public_by_chain.get(chain_id, 0):
        family = family_by_id[chain_id]
        assert family["information_event_ids"], (
            f"public-ready active chain has no Web of Lies event coverage: {chain_id}"
        )
        assert family["trace_status"] in {"PARTIAL", "TRACED"}, (
            f"public-ready active chain has invalid trace status: "
            f"{chain_id}={family['trace_status']}"
        )

# Neutral anchors never increase Hall qualification. Only documented adverse
# rich-lineage incidents may contribute.
hall = registry["hall_of_shame"]["all_time"]
neutral_classes = {"JOURNALISTIC_SOURCE", "OFFICIAL_SOURCE", "SUBJECT_MATTER_ANALYST", "UNKNOWN"}
assert not neutral_classes.intersection(hall), (
    f"neutral classes leaked into Hall of Shame: {sorted(neutral_classes.intersection(hall))}"
)
for event in registry["information_events"]:
    if event["event_type"] == "CANONICAL_CLAIM_ANCHOR":
        assert event["behavior_findings"] == []

# Removing all Sep. 20 lineage-only REPORTS events leaves every source's
# Hall metric vector unchanged.
all_events = registry["information_events"]
without_sep20 = [event for event in all_events if event["event_id"] not in sep20_event_ids]
affected_sources = {
    event["source_id"] for event in all_events if event["event_id"] in sep20_event_ids
}
for source_id in affected_sources:
    before = wol.metrics_for_events([event for event in without_sep20 if event["source_id"] == source_id])
    after = wol.metrics_for_events([event for event in all_events if event["source_id"] == source_id])
    assert before == after, f"Sep. 20 resolution changed Hall metrics for {source_id}: {before} != {after}"

profiles = {row["source_id"]: row for row in registry["source_profiles"]}
irgc = profiles.get("WOL-SRC-IRGC")
if irgc:
    adverse_irgc_families = {
        event["claim_family_id"]
        for event in registry["information_events"]
        if event["source_id"] == "WOL-SRC-IRGC"
        and event["event_type"] in wol.ADVERSE_FAMILY_EVENT_TYPES
    }
    assert irgc["metrics"]["claim_families_traced"] == len(adverse_irgc_families)

print(
    "web-of-lies ledger coverage: PASS "
    f"active_chains={len(active_chain_ids)} current_records={len(current_records)} "
    f"public_anchors={len(anchor_events)} packets={len(forensic['lineage_packets'])}"
)
