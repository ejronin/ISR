#!/usr/bin/env python3
"""Generate rich Web of Lies lineage for the Sep. 20 resolved discovery items.

Claims Forensics is read-only authority for family/proposition/truth/knowledge
semantics. This compiler adds only source-lineage continuity for the three
discovery sequences reconciled by build_web_of_lies_discovery_queue.py.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PACKET_DIR = "data/web-of-lies/lineage-packets"
AS_OF = "2026-09-20T18:45:00-04:00"
HANDOFF = "data/evidence-integration/rook-catchup-web-of-lies-input-20260920.json"
MAINTENANCE = "data/claims-forensics/lie-ledger-maintenance-sweep-20260920.json"
CONVERGENCE = "data/canonical-updates/UPD-20260920-ROOK-CATCHUP-CONVERGENCE.json"

sys.path.insert(0, str(ROOT / "scripts"))
import build_web_of_lies_current_anchor_packets as current_anchors  # noqa: E402
import build_web_of_lies_discovery_queue as discovery  # noqa: E402

PACKET_SPECS = {
    "WOL-IN-ROOK-TREND-20260920": (
        "sep20-trend-tanker.json",
        "WOL-PKT-SEP20-TREND-TANKER",
        "CH-HORMUZ-TREND-TANKER-20260917",
    ),
    "WOL-IN-ROOK-RIYADH-20260920": (
        "sep20-riyadh-yanbu.json",
        "WOL-PKT-SEP20-RIYADH-YANBU",
        "CH-HOUTHI-RIYADH-YANBU-20260919",
    ),
    "WOL-IN-ROOK-IRAN-CONDITIONS-20260920": (
        "sep20-iran-seven-conditions.json",
        "WOL-PKT-SEP20-IRAN-SEVEN-CONDITIONS",
        "CH-HORMUZ-NEGOTIATING-CLAIMS-20260912",
    ),
}


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def profile(
    source_id: str,
    display_name: str,
    entity_type: str,
    canonical_source_ids: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "source_id": source_id,
        "display_name": display_name,
        "source_entity_type": entity_type,
        "country_region": None,
        "primary_platform": None,
        "canonical_outlet_profile_id": None,
        "canonical_actor_id": None,
        "canonical_source_ids": sorted(set(canonical_source_ids or [])),
        "behavior_classes": ["UNKNOWN"],
        "authenticity_class": "UNKNOWN",
        "revenue_model": ["UNKNOWN_REVENUE_MODEL"],
        "classification_basis_event_ids": [],
        "revenue_basis_event_ids": [],
    }


def event(
    event_id: str,
    family_id: str,
    source_id: str,
    date: str,
    statement: str,
    claim_refs: list[str],
    evidence_source_ids: list[str],
    roles: list[str],
    *,
    carriers: list[str] | None = None,
    independently_sourced: bool | None = None,
    verdict: str,
    provenance_limit: str | None = None,
) -> dict[str, Any]:
    return {
        "event_id": event_id,
        "claim_family_id": family_id,
        "source_id": source_id,
        "event_type": "REPORTS",
        "published_at": date,
        "first_observed_at": date,
        "time_precision": "DATE_ONLY",
        "epistemic_posture": "ATTRIBUTED_REPORT",
        "exact_statement": statement,
        "translated_statement": None,
        "lineage_roles": roles,
        "carrier_profile_ids": carriers or [],
        "canonical_claim_refs": claim_refs,
        "evidence_source_ids": sorted(set(evidence_source_ids)),
        "contrary_evidence_source_ids": [],
        "correction_state": None,
        "behavior_findings": [],
        "revenue_findings": [],
        "independently_sourced": independently_sourced,
        "plain_english_verdict": verdict,
        "provenance_limit": provenance_limit,
    }


def relation(
    relationship_id: str,
    from_id: str,
    to_id: str,
    relationship_type: str,
    evidence_source_ids: list[str],
) -> dict[str, Any]:
    return {
        "relationship_id": relationship_id,
        "from_id": from_id,
        "to_id": to_id,
        "relationship_type": relationship_type,
        "evidence_source_ids": sorted(set(evidence_source_ids)),
    }


def refs_by_instance(root: Path) -> dict[str, list[str]]:
    records, _overlay = current_anchors.current_records(root)
    result: dict[str, list[str]] = {}
    for row in records:
        instance_id = str(row.get("claim_instance_id") or "").strip()
        if not instance_id:
            continue
        refs = [
            str(row.get("claim_id") or "").strip(),
            instance_id,
            str(row.get("proposition_id") or "").strip(),
        ]
        result[instance_id] = [value for value in refs if value]
    return result


def require_refs(all_refs: dict[str, list[str]], *instance_ids: str) -> list[str]:
    missing = [value for value in instance_ids if value not in all_refs]
    if missing:
        raise ValueError(
            "ADJUDICATION_REVIEW_CANDIDATE: current Claims Forensics instance refs "
            f"missing for Sep. 20 lineage: {missing}"
        )
    merged = set()
    for instance_id in instance_ids:
        merged.update(all_refs[instance_id])
    return sorted(merged)


def trend_packet(root: Path, all_refs: dict[str, list[str]]) -> dict[str, Any]:
    family = "CH-HORMUZ-TREND-TANKER-20260917"
    incident_refs = require_refs(all_refs, "CI-CLM-IRGC-TREND-TANKER-20260917-P01")
    effect_refs = require_refs(all_refs, "CI-CLM-IRGC-TREND-TANKER-20260917-P02")
    direction_refs = require_refs(all_refs, "CI-CLM-TREND-US-DIRECTION-20260918-P01")
    claimant_refs = sorted(set(incident_refs + effect_refs))

    events = [
        event(
            "WOL-EVT-SEP20-TREND-IRGC-ORIGIN",
            family,
            "WOL-SRC-IRGC",
            "2026-09-17",
            "IRGC said a Togo-flagged tanker was hit, caught fire and stopped during an unauthorized Hormuz transit.",
            claimant_refs,
            ["SRC-6FED1D32FAAE"],
            ["ORIGINATES"],
            carriers=["WOL-SRC-REUTERS"],
            independently_sourced=False,
            verdict="The tanker incident is supported; the specific IRGC causation/effect account remains propositionally separate and unresolved.",
            provenance_limit="IRGC statement is preserved through the accepted Reuters carrier receipt.",
        ),
        event(
            "WOL-EVT-SEP20-TREND-REUTERS-CARRIER",
            family,
            "WOL-SRC-REUTERS",
            "2026-09-17",
            "Reuters carried the IRGC account of the Hormuz tanker incident.",
            claimant_refs,
            ["SRC-6FED1D32FAAE"],
            ["REPORTS", "CARRIER"],
            independently_sourced=False,
            verdict="Carrier reporting preserves the claimant account; it is not independent corroboration of every claimant attribution.",
        ),
        event(
            "WOL-EVT-SEP20-TREND-PRESSTV-AMPLIFICATION",
            family,
            "WOL-SRC-PRESS-TV",
            "2026-09-17",
            "Press TV amplified the identification of the tanker as Trend and the allegation that U.S. forces directed its unauthorized passage.",
            sorted(set(effect_refs + direction_refs)),
            ["SRC-D24B8F8BACB4"],
            ["AMPLIFIES"],
            carriers=["WOL-SRC-MARITIME-EXECUTIVE"],
            independently_sourced=False,
            verdict="Trend identity/effect details and U.S.-direction attribution remain unresolved even though a tanker incident is supported.",
            provenance_limit="Press TV wording is preserved through the accepted maritime-trade carrier receipt.",
        ),
        event(
            "WOL-EVT-SEP20-TREND-UKMTO-INDEPENDENT",
            family,
            "WOL-SRC-UKMTO",
            "2026-09-18",
            "UKMTO incident reporting described a tanker struck by an unknown projectile in the Hormuz incident window.",
            incident_refs,
            ["SRC-D24B8F8BACB4"],
            ["INDEPENDENT_EVENT_CONFIRMATION"],
            carriers=["WOL-SRC-MARITIME-EXECUTIVE"],
            independently_sourced=True,
            verdict="Independent maritime incident reporting corroborates the existence of an incident only; it does not validate claimant responsibility, motive, vessel identity, or U.S. direction.",
            provenance_limit="UKMTO reporting is represented through Maritime Executive's accepted summary; no separate canonical UKMTO receipt is promoted here.",
        ),
        event(
            "WOL-EVT-SEP20-TREND-MARITIME-CARRIER",
            family,
            "WOL-SRC-MARITIME-EXECUTIVE",
            "2026-09-18",
            "Maritime Executive carried the UKMTO incident report alongside Iranian/state-media claims about Trend.",
            incident_refs,
            ["SRC-D24B8F8BACB4"],
            ["REPORTS", "CARRIER"],
            independently_sourced=False,
            verdict="The carrier preserves both source families without collapsing independent incident reporting into corroboration of Iranian attribution.",
        ),
    ]
    relationships = [
        relation("WOL-REL-SEP20-TREND-REUTERS-CARRIES-IRGC", events[1]["event_id"], events[0]["event_id"], "DERIVES_FROM", ["SRC-6FED1D32FAAE"]),
        relation("WOL-REL-SEP20-TREND-PRESSTV-AMPLIFIES-IRGC", events[2]["event_id"], events[0]["event_id"], "AMPLIFIES", ["SRC-D24B8F8BACB4"]),
        relation("WOL-REL-SEP20-TREND-MARITIME-CARRIES-UKMTO", events[4]["event_id"], events[3]["event_id"], "DERIVES_FROM", ["SRC-D24B8F8BACB4"]),
    ]
    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_LINEAGE_PACKET",
        "packet_id": "WOL-PKT-SEP20-TREND-TANKER",
        "claim_family_id": family,
        "as_of": AS_OF,
        "basis_paths": [HANDOFF, MAINTENANCE, CONVERGENCE],
        "notes": "Claims Forensics semantics are consumed read-only. Independent incident reporting corroborates incident existence only and is not treated as corroboration of claimant attribution or motive.",
        "generation_mode": "SEP20_CANONICAL_DISCOVERY_RECONCILIATION",
        "source_profiles": [
            profile("WOL-SRC-IRGC", "Islamic Revolutionary Guard Corps", "INSTITUTION"),
            profile("WOL-SRC-PRESS-TV", "Press TV", "OUTLET"),
            profile("WOL-SRC-REUTERS", "Reuters", "OUTLET", ["SRC-6FED1D32FAAE"]),
            profile("WOL-SRC-UKMTO", "United Kingdom Maritime Trade Operations", "INSTITUTION"),
            profile("WOL-SRC-MARITIME-EXECUTIVE", "Maritime Executive", "OUTLET", ["SRC-D24B8F8BACB4"]),
        ],
        "information_events": events,
        "relationships": relationships,
        "promotion_flags": [],
    }


def riyadh_packet(root: Path, all_refs: dict[str, list[str]]) -> dict[str, Any]:
    family = "CH-HOUTHI-RIYADH-YANBU-20260919"
    attack_refs = require_refs(all_refs, "CI-CLM-HOUTHI-RIYADH-YANBU-20260919-P01")
    fire_refs = require_refs(all_refs, "CI-CLM-HOUTHI-RIYADH-YANBU-20260919-P02")
    yanbu_refs = require_refs(all_refs, "CI-CLM-HOUTHI-RIYADH-YANBU-20260919-P03")

    events = [
        event(
            "WOL-EVT-SEP20-RIYADH-HOUTHI-ORIGIN",
            family,
            "WOL-SRC-CLAIMANT-HOUTHI_MILITARY_MESSAGING",
            "2026-09-19",
            "Houthi military messaging claimed attacks on sensitive sites in Riyadh during the attack wave.",
            sorted(set(attack_refs + fire_refs)),
            ["SRC-455AE83B448A"],
            ["ORIGINATES"],
            carriers=["WOL-SRC-REUTERS"],
            independently_sourced=False,
            verdict="Attack activity is supported, but attribution of the observed Riyadh fuel-area fire to a specific Houthi weapon remains unresolved.",
        ),
        event(
            "WOL-EVT-SEP20-YANBU-HOUTHI-BDA-ORIGIN",
            family,
            "WOL-SRC-CLAIMANT-HOUTHI_MILITARY_MESSAGING",
            "2026-09-19",
            "Houthi military messaging claimed attacks on Aramco facilities in Yanbu.",
            yanbu_refs,
            ["SRC-455AE83B448A"],
            ["ORIGINATES"],
            carriers=["WOL-SRC-REUTERS"],
            independently_sourced=False,
            verdict="The claimed Yanbu Aramco damage remains unresolved; targeting claims do not establish successful impact or damage.",
        ),
        event(
            "WOL-EVT-SEP20-RIYADH-SAUDI-OFFICIAL",
            family,
            "WOL-SRC-SAUDI-AUTHORITIES-20260919",
            "2026-09-19",
            "Saudi authorities issued hostile-aerial-threat warnings, interception reporting and a later all-clear.",
            attack_refs,
            ["SRC-84780EE8C4F8"],
            ["OFFICIAL_EVENT_REPORT"],
            carriers=["WOL-SRC-REUTERS", "WOL-SRC-AP"],
            independently_sourced=True,
            verdict="Saudi official reporting supports attack/warning activity; it does not independently establish Houthi weapon-to-fire causation or Yanbu battle damage.",
        ),
        event(
            "WOL-EVT-SEP20-RIYADH-REUTERS-CARRIER",
            family,
            "WOL-SRC-REUTERS",
            "2026-09-19",
            "Reuters carried Saudi warning/interception reporting and observed a fire during the attack window.",
            attack_refs,
            ["SRC-84780EE8C4F8"],
            ["REPORTS", "CARRIER"],
            independently_sourced=True,
            verdict="Reuters reporting supports the physical-event baseline without converting the separate causal or BDA propositions into confirmed claims.",
        ),
        event(
            "WOL-EVT-SEP20-RIYADH-AP-CARRIER",
            family,
            "WOL-SRC-AP",
            "2026-09-19",
            "Associated Press reporting was preserved in the Evidence Integration intake as a carrier of Saudi attack/interception reporting.",
            attack_refs,
            [],
            ["REPORTS", "CARRIER"],
            independently_sourced=False,
            verdict="The AP carrier is provenance only here; no separate canonical AP receipt was promoted for this reconciliation.",
            provenance_limit="Preserved from Evidence Integration handoff without a separately promoted canonical AP source receipt.",
        ),
        event(
            "WOL-EVT-SEP20-RIYADH-REUTERS-LOCATION",
            family,
            "WOL-SRC-REUTERS",
            "2026-09-20",
            "Follow-on Reuters reporting localized the observed plume/fire to the King Khalid International Airport fuel-storage area.",
            sorted(set(attack_refs + fire_refs)),
            ["SRC-455AE83B448A"],
            ["REPORTS", "LOCATION_REFINEMENT"],
            independently_sourced=True,
            verdict="The airport fuel-storage-area fire is supported; the reporting does not independently link a specific Houthi weapon to that fire.",
        ),
    ]
    relationships = [
        relation("WOL-REL-SEP20-RIYADH-REUTERS-CARRIES-SAUDI", events[3]["event_id"], events[2]["event_id"], "DERIVES_FROM", ["SRC-84780EE8C4F8"]),
        relation("WOL-REL-SEP20-RIYADH-AP-CARRIES-SAUDI", events[4]["event_id"], events[2]["event_id"], "DERIVES_FROM", []),
        relation("WOL-REL-SEP20-RIYADH-REUTERS-CARRIES-HOUTHI", events[5]["event_id"], events[0]["event_id"], "CARRIES_CLAIM_ALONGSIDE_INDEPENDENT_LOCATION_REPORTING", ["SRC-455AE83B448A"]),
        relation("WOL-REL-SEP20-YANBU-REUTERS-CARRIES-HOUTHI", events[5]["event_id"], events[1]["event_id"], "CARRIES_CLAIM_WITHOUT_INDEPENDENT_BDA_CONFIRMATION", ["SRC-455AE83B448A"]),
    ]
    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_LINEAGE_PACKET",
        "packet_id": "WOL-PKT-SEP20-RIYADH-YANBU",
        "claim_family_id": family,
        "as_of": AS_OF,
        "basis_paths": [HANDOFF, MAINTENANCE, CONVERGENCE],
        "notes": "The supported Riyadh physical-event baseline is kept separate from unresolved weapon-to-fire causation and unresolved Yanbu BDA. Carrier reports do not inherit claimant attribution.",
        "generation_mode": "SEP20_CANONICAL_DISCOVERY_RECONCILIATION",
        "source_profiles": [
            profile("WOL-SRC-CLAIMANT-HOUTHI_MILITARY_MESSAGING", "Houthi military messaging", "UNKNOWN"),
            profile("WOL-SRC-SAUDI-AUTHORITIES-20260919", "Saudi authorities (Sep. 19 attack reporting)", "INSTITUTION"),
            profile("WOL-SRC-REUTERS", "Reuters", "OUTLET", ["SRC-84780EE8C4F8", "SRC-455AE83B448A"]),
            profile("WOL-SRC-AP", "Associated Press", "OUTLET"),
        ],
        "information_events": events,
        "relationships": relationships,
        "promotion_flags": [],
    }


def conditions_packet(root: Path, all_refs: dict[str, list[str]]) -> dict[str, Any]:
    family = "CH-HORMUZ-NEGOTIATING-CLAIMS-20260912"
    sep19_refs = require_refs(all_refs, "CI-CLM-IRAN-SEVEN-CONDITIONS-20260919-P01")
    sep20_refs = require_refs(all_refs, "CI-CLM-IRAN-SEVEN-CONDITIONS-20260920-P01")

    events = [
        event(
            "WOL-EVT-SEP20-CONDITIONS-REZAEI-SEP19",
            family,
            "WOL-SRC-CLAIMANT-MOHSEN_REZAEI",
            "2026-09-19",
            "Mohsen Rezaei said Iran had conveyed seven conditions for beginning negotiations through Qatar; the first public report enumerated only part of the package.",
            sep19_refs,
            ["SRC-255ED903C016"],
            ["ORIGINATES", "REPEATS_POSITION"],
            carriers=["WOL-SRC-AL-JAZEERA"],
            independently_sourced=False,
            verdict="This is a supported repetition of Iran's stated seven-condition position; the partial public list was incomplete, not a claim that only those disclosed conditions existed.",
        ),
        event(
            "WOL-EVT-SEP20-CONDITIONS-AJ-SEP19",
            family,
            "WOL-SRC-AL-JAZEERA",
            "2026-09-19",
            "Al Jazeera carried the Sep. 19 seven-condition statement and the then-partial public enumeration.",
            sep19_refs,
            ["SRC-255ED903C016"],
            ["REPORTS", "CARRIER"],
            independently_sourced=False,
            verdict="Carrier reporting preserves the Sep. 19 epistemic state: seven conditions were asserted while only part of the list was public.",
        ),
        event(
            "WOL-EVT-SEP20-CONDITIONS-REZAEI-SEP20",
            family,
            "WOL-SRC-CLAIMANT-MOHSEN_REZAEI",
            "2026-09-20",
            "Follow-on Iranian messaging still described seven conditions; six were publicly enumerated and one remained undisclosed.",
            sep20_refs,
            ["SRC-E1EBBF388878"],
            ["ORIGINATES", "DETAIL_EXPANSION"],
            carriers=["WOL-SRC-AL-JAZEERA"],
            independently_sourced=False,
            verdict="The Sep. 20 material expands public detail. It does not retroactively make the earlier partial disclosure false and is not represented as a correction.",
        ),
        event(
            "WOL-EVT-SEP20-CONDITIONS-AJ-SEP20",
            family,
            "WOL-SRC-AL-JAZEERA",
            "2026-09-20",
            "Al Jazeera's follow-on report enumerated six of the seven stated conditions while noting that one remained undisclosed.",
            sep20_refs,
            ["SRC-E1EBBF388878"],
            ["REPORTS", "CARRIER", "DETAIL_EXPANSION"],
            independently_sourced=False,
            verdict="This is chronology/detail expansion inside the existing negotiating-position control chain, not a new accusation or correction event.",
        ),
    ]
    relationships = [
        relation("WOL-REL-SEP20-CONDITIONS-AJ19-CARRIES-REZAEI", events[1]["event_id"], events[0]["event_id"], "DERIVES_FROM", ["SRC-255ED903C016"]),
        relation("WOL-REL-SEP20-CONDITIONS-AJ20-CARRIES-REZAEI", events[3]["event_id"], events[2]["event_id"], "DERIVES_FROM", ["SRC-E1EBBF388878"]),
        relation("WOL-REL-SEP20-CONDITIONS-DETAIL-EXPANDS-SEP19", events[2]["event_id"], events[0]["event_id"], "DETAIL_EXPANDS", ["SRC-255ED903C016", "SRC-E1EBBF388878"]),
    ]
    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_LINEAGE_PACKET",
        "packet_id": "WOL-PKT-SEP20-IRAN-SEVEN-CONDITIONS",
        "claim_family_id": family,
        "as_of": AS_OF,
        "basis_paths": [HANDOFF, MAINTENANCE, CONVERGENCE],
        "notes": "Sep. 19 to Sep. 20 is represented as progressive disclosure/detail expansion in the existing control chain. No correction, falsehood event, duplicate accusation chain, or new unique proposition is created.",
        "generation_mode": "SEP20_CANONICAL_DISCOVERY_RECONCILIATION",
        "source_profiles": [
            profile("WOL-SRC-CLAIMANT-MOHSEN_REZAEI", "Mohsen Rezaei", "UNKNOWN"),
            profile("WOL-SRC-AL-JAZEERA", "Al Jazeera", "OUTLET", ["SRC-255ED903C016", "SRC-E1EBBF388878"]),
        ],
        "information_events": events,
        "relationships": relationships,
        "promotion_flags": [],
    }


def expected_packets(root: Path) -> dict[Path, dict[str, Any]]:
    queue = discovery.build_queue(root)
    resolved = {
        row["sequence_id"]: row
        for row in queue.get("resolved_canonical_claim_sequences") or []
    }
    expected_ids = set(PACKET_SPECS)
    if set(resolved) != expected_ids:
        raise ValueError(
            "Sep. 20 canonical discovery resolution set drifted: "
            f"missing={sorted(expected_ids - set(resolved))} "
            f"extra={sorted(set(resolved) - expected_ids)}"
        )

    all_refs = refs_by_instance(root)
    builders = {
        "WOL-IN-ROOK-TREND-20260920": trend_packet,
        "WOL-IN-ROOK-RIYADH-20260920": riyadh_packet,
        "WOL-IN-ROOK-IRAN-CONDITIONS-20260920": conditions_packet,
    }
    output: dict[Path, dict[str, Any]] = {}
    for sequence_id, (filename, packet_id, family_id) in PACKET_SPECS.items():
        row = resolved[sequence_id]
        if row["claim_family_ref"] != family_id or row["chain_id"] != family_id:
            raise ValueError(
                f"ADJUDICATION_REVIEW_CANDIDATE {sequence_id}: discovery resolution "
                f"{row['claim_family_ref']} != expected canonical family {family_id}"
            )
        packet = builders[sequence_id](root, all_refs)
        if packet["packet_id"] != packet_id or packet["claim_family_id"] != family_id:
            raise AssertionError(f"internal Sep. 20 packet spec mismatch for {sequence_id}")
        output[root / PACKET_DIR / filename] = packet
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    packets = expected_packets(root)

    if args.check:
        errors = []
        for path, packet in packets.items():
            if not path.is_file():
                errors.append(f"missing {path.relative_to(root)}")
                continue
            if path.read_bytes() != canonical_bytes(packet):
                errors.append(f"stale {path.relative_to(root)}")
        if errors:
            raise SystemExit("FAIL " + "; ".join(errors))
        events = sum(len(packet["information_events"]) for packet in packets.values())
        relationships = sum(len(packet["relationships"]) for packet in packets.values())
        print(
            f"web-of-lies Sep20 reconciliation: PASS packets={len(packets)} "
            f"events={events} relationships={relationships}"
        )
        return 0

    for path, packet in packets.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(canonical_bytes(packet))
    events = sum(len(packet["information_events"]) for packet in packets.values())
    relationships = sum(len(packet["relationships"]) for packet in packets.values())
    print(
        f"web-of-lies Sep20 reconciliation: wrote packets={len(packets)} "
        f"events={events} relationships={relationships}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
