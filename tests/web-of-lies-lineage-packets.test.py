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
import build_web_of_lies_forensic_input as aggregator  # noqa: E402


canonical = json.loads((ROOT / wol.CANONICAL).read_text(encoding="utf-8"))
governance = json.loads((ROOT / wol.GOVERNANCE).read_text(encoding="utf-8"))
assembled = aggregator.build_forensic_input(ROOT)
tracked = json.loads((ROOT / aggregator.OUTPUT).read_text(encoding="utf-8"))

assert assembled == tracked, "tracked Web of Lies forensic input is stale relative to lineage packets"

# Packet topology is derived from authoritative packet compilers, not a frozen
# cardinality from a particular Claims Forensics snapshot.
expected_packet_paths = {
    path.relative_to(ROOT).as_posix()
    for path in legacy.expected_packets(ROOT)
}
expected_packet_paths.update(
    path.relative_to(ROOT).as_posix()
    for path in anchors.expected_packets(ROOT)
)
expected_packet_paths.update(
    (Path(aggregator.PACKET_DIR) / f"{legacy.slug(chain_id)}.json").as_posix()
    for chain_id in legacy.MANUAL_CHAIN_IDS
)
assembled_packet_paths = {row["path"] for row in assembled["lineage_packets"]}
assert assembled_packet_paths == expected_packet_paths, (
    "Web of Lies packet inventory differs from generated/manual/current-anchor authority: "
    f"missing={sorted(expected_packet_paths - assembled_packet_paths)} "
    f"extra={sorted(assembled_packet_paths - expected_packet_paths)}"
)
assert len(assembled["lineage_packets"]) == len(expected_packet_paths)

packet_docs = [
    json.loads((ROOT / path).read_text(encoding="utf-8"))
    for path in sorted(expected_packet_paths)
]
expected_source_ids = {
    row["source_id"]
    for packet_doc in packet_docs
    for row in packet_doc.get("source_profiles") or []
}
expected_event_ids = {
    row["event_id"]
    for packet_doc in packet_docs
    for row in packet_doc.get("information_events") or []
}
expected_relationship_ids = {
    row["relationship_id"]
    for packet_doc in packet_docs
    for row in packet_doc.get("relationships") or []
}
assembled_source_ids = {row["source_id"] for row in assembled["source_profiles"]}
assembled_event_ids = {row["event_id"] for row in assembled["information_events"]}
assembled_relationship_ids = {row["relationship_id"] for row in assembled["relationships"]}
assert assembled_source_ids == expected_source_ids
assert assembled_event_ids == expected_event_ids
assert assembled_relationship_ids == expected_relationship_ids
assert len(assembled["source_profiles"]) == len(expected_source_ids)
assert len(assembled["information_events"]) == len(expected_event_ids)
assert len(assembled["relationships"]) == len(expected_relationship_ids)

packet = next(
    row for row in assembled["lineage_packets"]
    if row["packet_id"] == "WOL-PKT-F15E-CSAR-URANIUM-20260920"
)
anchor_packet = next(
    row for row in assembled["lineage_packets"]
    if row["packet_id"] == "WOL-PKT-ANCHOR-CH_F15E_CSAR_URANIUM-20260920"
)
assert packet["claim_family_id"] == "CH-F15E-CSAR-URANIUM"
assert anchor_packet["claim_family_id"] == "CH-F15E-CSAR-URANIUM"
assert len(assembled["source_profiles"]) >= 11
assert len(assembled["information_events"]) > 14
assert len(assembled["relationships"]) > 18

derived = wol.build_registry(canonical, assembled, governance)
family = next(row for row in derived["claim_families"] if row["claim_family_id"] == "CH-F15E-CSAR-URANIUM")
assert family["trace_status"] == "TRACED"

# F-15E family topology follows the authoritative rich + current-anchor packets.
# This stays exact across Claims Forensics maintenance without freezing a
# pre-composition family cardinality.
family_packet_docs = [
    packet_doc
    for packet_doc in packet_docs
    if packet_doc["claim_family_id"] == "CH-F15E-CSAR-URANIUM"
]
expected_family_event_ids = {
    event["event_id"]
    for packet_doc in family_packet_docs
    for event in packet_doc.get("information_events") or []
}
expected_family_relationship_ids = {
    relationship["relationship_id"]
    for packet_doc in family_packet_docs
    for relationship in packet_doc.get("relationships") or []
}
assert set(family["information_event_ids"]) == expected_family_event_ids
assert set(family["relationship_ids"]) == expected_family_relationship_ids

# Rich F-15E lineage remains intact while neutral current Claims Forensics
# anchors provide complete current-ledger coverage.
hall_classes = set(derived["hall_of_shame"]["ranking_contract"]["hall_of_shame_classes"])
assert "OFFICIAL_SOURCE" not in hall_classes
assert "JOURNALISTIC_SOURCE" not in hall_classes
assert "UNKNOWN" not in hall_classes

profiles = {row["source_id"]: row for row in derived["source_profiles"]}
press = profiles["WOL-SRC-PRESS-TV"]
assert press["behavior_classes"] == [
    "NARRATIVE_MUTATION_OFFENDER",
    "STATE_OFFICIAL_MISINFORMATION_SOURCE",
]
assert press["metrics"]["claim_families_traced"] >= 2
assert press["metrics"]["false_misleading_findings_connected"] >= 2
assert press["metrics"]["narrative_mutations_introduced"] >= 1
assert press["metrics"]["corrections_issued"] >= 1

molaei = profiles["WOL-SRC-MOHAMMAD-MOLAEI"]
assert molaei["behavior_classes"] == ["UNKNOWN"]
assert molaei["metrics"]["continued_after_correction_incidents"] == 1

events = {row["event_id"]: row for row in derived["information_events"]}
capture = events["WOL-EVT-F15E-004"]
assert capture["event_type"] == "REPORTS"
assert capture.get("behavior_findings") == []
assert "does not turn it into a confirmed-capture claim or a knowing lie" in capture["plain_english_verdict"]

correction = events["WOL-EVT-F15E-006"]
assert correction["correction_state"] == "VISIBLE_CORRECTION"
assert correction["source_id"] == "WOL-SRC-PROVINCIAL-IRGC"

press_correction = events["WOL-EVT-F15E-011"]
assert press_correction["correction_state"] == "VISIBLE_CORRECTION"
assert press_correction["source_id"] == "WOL-SRC-PRESS-TV"

substitution = events["WOL-EVT-F15E-013"]
assert substitution["event_type"] == "NARRATIVE_MUTATION"
assert substitution["correction_state"] == "NARRATIVE_REPLACEMENT"
assert "narrative substitution" in substitution["plain_english_verdict"].lower()

continued = events["WOL-EVT-F15E-014"]
assert continued["source_id"] == "WOL-SRC-MOHAMMAD-MOLAEI"
assert continued["correction_state"] == "REPEAT_AFTER_CORRECTION"

for media_id in ("MED-001", "MED-002", "MED-003", "MED-004"):
    media = events[f"WOL-EVT-F15E-{media_id}"]
    assert media["event_type"] == "FALSE_MEDIA_ARTIFACT"
    assert media["behavior_findings"] == []
    assert media["provenance_limit"] == "OFFICIAL_ORIGIN_NOT_ESTABLISHED"
    assert media["source_id"] == f"WOL-SRC-UNATTRIBUTED-MEDIA-{media_id}"

relationships = {row["relationship_id"]: row for row in derived["relationships"]}
published = relationships["WOL-REL-F15E-018"]
assert published["relationship_type"] == "PUBLISHED_BY"
assert published["from_id"] == "WOL-EVT-F15E-014"
assert published["to_id"] == "WOL-SRC-PRESS-TV"

for profile in assembled["source_profiles"]:
    assert not {
        "hall_of_shame_rank",
        "hall_of_shame_score",
        "manual_rank",
        "manual_score",
        "featured_rank",
    }.intersection(profile)

print(
    "web-of-lies lineage packets: PASS - "
    "F-15E/CSAR/Isfahan trace preserved inside full-ledger coverage, "
    "corrections and signed-analysis attribution retained"
)
