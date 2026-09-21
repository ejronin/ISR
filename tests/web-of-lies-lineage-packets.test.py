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
import build_web_of_lies_sep20_reconciliation_packets as sep20  # noqa: E402
import build_web_of_lies_source_promotion_control_packets as controls  # noqa: E402


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
    path.relative_to(ROOT).as_posix()
    for path in sep20.expected_packets(ROOT)
)
expected_packet_paths.update(
    path.relative_to(ROOT).as_posix()
    for path in controls.expected_packets(ROOT)
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

# The three Sep. 20 canonical placements each have one rich reconciliation
# packet; the existing negotiating family is extended rather than duplicated
# as a new Claims Forensics chain.
sep20_packets = [
    row for row in assembled["lineage_packets"]
    if row["packet_id"] in {
        "WOL-PKT-SEP20-TREND-TANKER",
        "WOL-PKT-SEP20-RIYADH-YANBU",
        "WOL-PKT-SEP20-IRAN-SEVEN-CONDITIONS",
    }
]
assert len(sep20_packets) == 3
assert {row["claim_family_id"] for row in sep20_packets} == {
    "CH-HORMUZ-TREND-TANKER-20260917",
    "CH-HOUTHI-RIYADH-YANBU-20260919",
    "CH-HORMUZ-NEGOTIATING-CLAIMS-20260912",
}

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

# PR #165 source-promotion controls receive rich lineage without semantic or Hall escalation.
control_expected = controls.expected_packets(ROOT)
assert len(control_expected) == 3
control_packet_ids = {
    "WOL-PKT-SOURCE-PROMOTION-MILITARY-TRAINING-20260918",
    "WOL-PKT-SOURCE-PROMOTION-ANTISHIP-MULTIWARHEAD-20260919",
    "WOL-PKT-SOURCE-PROMOTION-CENTCOM-ZERO-OIL-EXPORTS-20260919",
}
control_families = {
    "CH-IRAN-MILITARY-TRAINING-20260918",
    "CH-IRAN-ANTISHIP-MULTIWARHEAD-TEST-20260919",
    "CH-CENTCOM-ZERO-IRAN-OIL-EXPORTS-20260919",
}
control_packet_rows = [
    row for row in assembled["lineage_packets"]
    if row["packet_id"] in control_packet_ids
]
assert len(control_packet_rows) == 3
assert {row["claim_family_id"] for row in control_packet_rows} == control_families

for path, rich in control_expected.items():
    assert path.is_file(), f"missing source-promotion rich lineage packet {path.relative_to(ROOT)}"
    assert json.loads(path.read_text(encoding="utf-8")) == rich
    assert rich["generation_mode"] == "CLAIMS_FORENSICS_SOURCE_PROMOTION_CONTROL_LINEAGE"
    assert len(rich["information_events"]) == 2
    assert len(rich["relationships"]) == 1
    assert all(event["event_type"] == "REPORTS" for event in rich["information_events"])
    assert all(event["behavior_findings"] == [] for event in rich["information_events"])
    assert all(event["correction_state"] is None for event in rich["information_events"])
    assert all(event["event_type"] not in wol.ADVERSE_FAMILY_EVENT_TYPES for event in rich["information_events"])

# Each target keeps its neutral current-ledger anchor and gains exactly one rich packet.
for family_id in control_families:
    family_packets = [
        row for row in assembled["lineage_packets"]
        if row["claim_family_id"] == family_id
    ]
    assert len(family_packets) == 2
    assert any(row["packet_id"].startswith("WOL-PKT-ANCHOR-") for row in family_packets)
    assert any(row["packet_id"] in control_packet_ids for row in family_packets)

events = {row["event_id"]: row for row in derived["information_events"]}
relationships = {row["relationship_id"]: row for row in derived["relationships"]}

training_origin = events["WOL-EVT-SOURCE-PROMOTION-MILITARY-TRAINING-HASSANZADEH"]
training_carrier = events["WOL-EVT-SOURCE-PROMOTION-MILITARY-TRAINING-AP-CARRIER"]
assert training_origin["source_id"] == "WOL-SRC-CLAIMANT-GEN_HASSAN_HASSANZADEH"
assert training_carrier["source_id"] == "WOL-SRC-AP"
assert training_origin["carrier_profile_ids"] == ["WOL-SRC-AP"]
assert training_origin["lineage_roles"] == ["ORIGINATES"]
assert training_carrier["lineage_roles"] == ["REPORTS", "CARRIER"]
assert "CLM-IRAN-MILITARY-TRAINING-600K-1M-20260918" in training_origin["canonical_claim_refs"]
assert "PROP-IRAN-MILITARY-TRAINING-REGISTRATIONS-20260918" in training_origin["canonical_claim_refs"]
assert "PROP-IRAN-MILITARY-TRAINING-PROJECTION-20260918" in training_origin["canonical_claim_refs"]
assert {
    "CI-CLM-IRAN-MILITARY-TRAINING-600K-1M-20260918-P01",
    "CI-CLM-IRAN-MILITARY-TRAINING-600K-1M-20260918-P02",
} <= set(training_origin["canonical_claim_refs"])
training_origins = [
    event for event in derived["information_events"]
    if event["claim_family_id"] == "CH-IRAN-MILITARY-TRAINING-20260918"
    and event["event_id"].startswith("WOL-EVT-SOURCE-PROMOTION-")
    and event["lineage_roles"] == ["ORIGINATES"]
]
assert len(training_origins) == 1, "two atomic propositions must not become two originating claims"

rezaei_origin = events["WOL-EVT-SOURCE-PROMOTION-ANTISHIP-MULTIWARHEAD-REZAEI"]
rezaei_carrier = events["WOL-EVT-SOURCE-PROMOTION-ANTISHIP-MULTIWARHEAD-NIE-CARRIER"]
assert rezaei_origin["source_id"] == "WOL-SRC-CLAIMANT-MOHSEN_REZAEI"
assert rezaei_carrier["source_id"] == "WOL-SRC-NEW-INDIAN-EXPRESS"
assert rezaei_origin["exact_statement"] == (
    "He claimed Iran had also recently test-fired a multi-warhead anti-ship missile near a US vessel or aircraft carrier."
)
assert rezaei_origin["event_type"] == "REPORTS"
assert rezaei_origin["behavior_findings"] == []
assert "no Lie" in rezaei_origin["plain_english_verdict"]

zero_origin = events["WOL-EVT-SOURCE-PROMOTION-CENTCOM-ZERO-OIL-EXPORTS-ORIGIN"]
zero_carrier = events["WOL-EVT-SOURCE-PROMOTION-CENTCOM-ZERO-OIL-EXPORTS-ANADOLU-CARRIER"]
assert zero_origin["source_id"] == "WOL-SRC-USCENTCOM"
assert zero_carrier["source_id"] == "WOL-SRC-ANADOLU"
assert zero_origin["exact_statement"] == "Iran has exported zero barrels thanks to our ironclad blockade."
assert "precise start/end measurement window" in zero_origin["plain_english_verdict"]
assert "narrowed to loadings" in zero_origin["context_scope"]

# Carrier-to-origin relationships remain explicit and claimant/carrier identities stay distinct.
for relationship_id, carrier_id, origin_id in (
    (
        "WOL-REL-SOURCE-PROMOTION-MILITARY-TRAINING-AP-CARRIES-HASSANZADEH",
        training_carrier["event_id"],
        training_origin["event_id"],
    ),
    (
        "WOL-REL-SOURCE-PROMOTION-ANTISHIP-MULTIWARHEAD-NIE-CARRIES-REZAEI",
        rezaei_carrier["event_id"],
        rezaei_origin["event_id"],
    ),
    (
        "WOL-REL-SOURCE-PROMOTION-CENTCOM-ZERO-OIL-EXPORTS-ANADOLU-CARRIES-CENTCOM",
        zero_carrier["event_id"],
        zero_origin["event_id"],
    ),
):
    relation = relationships[relationship_id]
    assert relation["from_id"] == carrier_id
    assert relation["to_id"] == origin_id
    assert relation["relationship_type"] == "DERIVES_FROM"

# These are controls, not accusation families, and rich traceability has zero Hall-vector impact.
overlay = json.loads((ROOT / "data/claims-forensics/lie-ledger-semantic-overlay-20260919.json").read_text(encoding="utf-8"))
for family_id in control_families:
    chain = overlay["chain_overrides"][family_id]
    assert chain["classification"] == "STRATEGIC_CLAIM_CONTROL"
    assert chain["lie_ledger_accusation"] is False
    assert chain["public_include_in_accusation_count"] is False

control_event_ids = {
    event["event_id"]
    for rich in control_expected.values()
    for event in rich["information_events"]
}
involved_sources = {
    event["source_id"]
    for event in derived["information_events"]
    if event["event_id"] in control_event_ids
}
for source_id in involved_sources:
    all_events = [
        event for event in derived["information_events"]
        if event["source_id"] == source_id
    ]
    prior_events = [
        event for event in all_events
        if event["claim_family_id"] not in control_families
    ]
    assert wol.metrics_for_events(all_events) == wol.metrics_for_events(prior_events), (
        f"neutral control lineage changed Hall metric vector for {source_id}"
    )

family_ids = [row["claim_family_id"] for row in derived["claim_families"]]
assert len(family_ids) == len(set(family_ids)), "duplicate claim family created"
for family_id in control_families:
    family = next(row for row in derived["claim_families"] if row["claim_family_id"] == family_id)
    assert family["trace_status"] == "TRACED"

# Existing rich model families remain present; this follow-through is additive only.
assert "WOL-EVT-F15E-013" in events
assert "WOL-EVT-SEP20-TREND-IRGC-ORIGIN" in events
assert "WOL-EVT-SEP20-RIYADH-HOUTHI-ORIGIN" in events
assert "WOL-EVT-SEP20-CONDITIONS-REZAEI-SEP19" in events

print(
    "web-of-lies lineage packets: PASS - "
    "F-15E/Sep20 rich traces preserved; three PR #165 controls gain neutral rich lineage "
    "with claimant/carrier separation and zero Hall escalation"
)
