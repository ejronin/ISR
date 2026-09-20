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
assert len(active_chain_ids) == 47, f"expected 47 active Claims Forensics chains, found {len(active_chain_ids)}"
assert len(current_records) == 133, f"expected 133 current claim instances, found {len(current_records)}"
assert "CH-FALSE-FLAG-REGIONAL" not in active_chain_ids
for split_chain in (
    "CH-ARAMCO-FALSE-FLAG-20260302",
    "CH-ERBIL-KUWAIT-FALSE-FLAG-20260315",
    "CH-SHAHED-CLONE-FALSE-FLAG-20260315",
):
    assert split_chain in active_chain_ids

# One neutral anchor packet exists for every active current chain.
anchor_expected = anchors.expected_packets(ROOT)
assert len(anchor_expected) == 47
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
assert len(anchor_events) == len(public_records) == 114
for record in public_records:
    assert record["claim_instance_id"] in anchor_refs, (
        f"PUBLIC_READY current claim missing neutral anchor: {record['claim_instance_id']}"
    )
for record in blocked_records:
    assert record["claim_instance_id"] not in anchor_refs, (
        f"blocked current claim leaked into neutral anchor output: {record['claim_instance_id']}"
    )

# The Sep. 20 Evidence Integration handoff keeps only genuinely unassigned
# sequences in discovery. F-15SA is continuity to an existing current claim.
discovery = discovery_builder.build_queue(ROOT)
tracked_discovery = load(discovery_builder.OUTPUT)
assert discovery == tracked_discovery
assert {row["discovery_id"] for row in discovery["items"]} == {
    "WOL-IN-ROOK-TREND-20260920",
    "WOL-IN-ROOK-IRAN-CONDITIONS-20260920",
    "WOL-IN-ROOK-RIYADH-20260920",
}
assert discovery["resolved_existing_claim_sequences"] == [{
    "sequence_id": "WOL-IN-ROOK-F15SA-20260920",
    "status": "EXISTING_CANONICAL_CLAIM_CONTINUITY",
    "claim_id": "CLM-HOUTHI-F15SA-CAUSATION-20260916",
    "chain_id": "CH-RSAF-F15SA-MARIB-20260916",
    "routing_path": "data/evidence-integration/rook-catchup-claims-routing-20260920.json",
}]
assert "WOL-IN-ROOK-MQ9-52-53-20260920" not in {
    row["discovery_id"] for row in discovery["items"]
}

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
assert len(forensic["lineage_packets"]) >= len(active_chain_ids)

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
