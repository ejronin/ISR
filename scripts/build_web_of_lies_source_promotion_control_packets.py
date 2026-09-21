#!/usr/bin/env python3
"""Generate rich Web of Lies lineage for three public-ready control chains from PR #165.

Claims Forensics remains the read-only authority for chain/proposition identity,
truth, knowledge, public-ready state, and control/accusation classification.
Evidence Integration remains the authority for canonical source provenance.
This compiler adds only neutral origin/carrier lineage continuity.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PACKET_DIR = "data/web-of-lies/lineage-packets"
AS_OF = "2026-09-20T20:22:00-04:00"
HANDOFF = "data/claims-forensics/web-of-lies-source-promotion-handoff-20260920.json"
CLAIMS_CONSUMPTION = "data/claims-forensics/claims-source-promotion-consumption-20260920.json"
EVIDENCE_HANDOFF = "data/evidence-integration/claims-source-promotions-handoff-20260920.json"
HANDOFF_ID = "CF-WOL-SOURCE-PROMOTION-CONSUMPTION-20260920"

sys.path.insert(0, str(ROOT / "scripts"))
import build_web_of_lies_current_anchor_packets as current_anchors  # noqa: E402

PACKET_SPECS = {
    "CH-IRAN-MILITARY-TRAINING-20260918": (
        "source-promotion-military-training-20260918.json",
        "WOL-PKT-SOURCE-PROMOTION-MILITARY-TRAINING-20260918",
    ),
    "CH-IRAN-ANTISHIP-MULTIWARHEAD-TEST-20260919": (
        "source-promotion-antiship-multiwarhead-20260919.json",
        "WOL-PKT-SOURCE-PROMOTION-ANTISHIP-MULTIWARHEAD-20260919",
    ),
    "CH-CENTCOM-ZERO-IRAN-OIL-EXPORTS-20260919": (
        "source-promotion-centcom-zero-oil-exports-20260919.json",
        "WOL-PKT-SOURCE-PROMOTION-CENTCOM-ZERO-OIL-EXPORTS-20260919",
    ),
}


def load(root: Path, path: str) -> dict[str, Any]:
    return json.loads((root / path).read_text(encoding="utf-8"))


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def profile(
    source_id: str,
    display_name: str,
    entity_type: str,
    *,
    country_region: str | None = None,
    primary_platform: str | None = None,
    canonical_outlet_profile_id: str | None = None,
    canonical_actor_id: str | None = None,
    canonical_source_ids: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "source_id": source_id,
        "display_name": display_name,
        "source_entity_type": entity_type,
        "country_region": country_region,
        "primary_platform": primary_platform,
        "canonical_outlet_profile_id": canonical_outlet_profile_id,
        "canonical_actor_id": canonical_actor_id,
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
    claimant: str | None = None,
    verdict: str,
    provenance_limit: str | None = None,
    context_scope: str | None = None,
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
        "originating_claimant": claimant,
        "lineage_roles": roles,
        "carrier_profile_ids": carriers or [],
        "canonical_claim_refs": sorted(set(claim_refs)),
        "evidence_source_ids": sorted(set(evidence_source_ids)),
        "contrary_evidence_source_ids": [],
        "correction_state": None,
        "behavior_findings": [],
        "revenue_findings": [],
        "independently_sourced": False,
        "plain_english_verdict": verdict,
        "provenance_limit": provenance_limit,
        "context_scope": context_scope,
    }


def relation(
    relationship_id: str,
    from_id: str,
    to_id: str,
    evidence_source_ids: list[str],
) -> dict[str, Any]:
    return {
        "relationship_id": relationship_id,
        "from_id": from_id,
        "to_id": to_id,
        "relationship_type": "DERIVES_FROM",
        "evidence_source_ids": sorted(set(evidence_source_ids)),
    }


def validated_inputs(root: Path) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]], dict[str, list[str]]]:
    handoff = load(root, HANDOFF)
    claims = load(root, CLAIMS_CONSUMPTION)
    evidence = load(root, EVIDENCE_HANDOFF)

    if handoff.get("handoff_id") != HANDOFF_ID:
        raise ValueError(f"unexpected Claims Forensics handoff id: {handoff.get('handoff_id')!r}")

    handoff_items = {row["chain_id"]: row for row in handoff.get("items") or []}
    claims_items = {row["chain_id"]: row for row in claims.get("targets") or []}
    evidence_items = {row["chain_id"]: row for row in evidence.get("targets") or []}
    expected = set(PACKET_SPECS)
    for label, rows in (
        ("handoff", handoff_items),
        ("Claims consumption", claims_items),
        ("Evidence handoff", evidence_items),
    ):
        if set(rows) != expected:
            raise ValueError(
                f"{label} target set drifted: missing={sorted(expected - set(rows))} "
                f"extra={sorted(set(rows) - expected)}"
            )

    records, overlay = current_anchors.current_records(root)
    refs_by_chain: dict[str, list[str]] = {}
    for chain_id in sorted(expected):
        item = handoff_items[chain_id]
        if item.get("final_truth_state") != "UNRESOLVED":
            raise ValueError(f"{chain_id}: truth state changed from UNRESOLVED")
        if item.get("final_knowledge_state") != "NOT_ASSESSABLE":
            raise ValueError(f"{chain_id}: knowledge state changed from NOT_ASSESSABLE")
        if item.get("classification") != "STRATEGIC_CLAIM_CONTROL":
            raise ValueError(f"{chain_id}: control classification changed")
        if item.get("public_ready") is not True:
            raise ValueError(f"{chain_id}: no longer public-ready")

        chain = (overlay.get("chain_overrides") or {}).get(chain_id) or {}
        if chain.get("classification") != "STRATEGIC_CLAIM_CONTROL":
            raise ValueError(f"{chain_id}: overlay classification is not STRATEGIC_CLAIM_CONTROL")
        if chain.get("lie_ledger_accusation") is not False:
            raise ValueError(f"{chain_id}: overlay promoted control into accusation")
        if chain.get("public_include_in_accusation_count") is not False:
            raise ValueError(f"{chain_id}: control leaked into accusation denominator")

        rows = [
            row for row in records
            if row.get("chain_id") == chain_id and row.get("publication_status") == "PUBLIC_READY"
        ]
        actual_claims = {str(row.get("claim_id") or "") for row in rows}
        actual_props = {str(row.get("proposition_id") or "") for row in rows}
        actual_instances = {str(row.get("claim_instance_id") or "") for row in rows}
        if actual_claims != set(item.get("claim_ids") or []):
            raise ValueError(f"{chain_id}: canonical claim receipts drifted")
        if actual_props != set(item.get("proposition_ids") or []):
            raise ValueError(f"{chain_id}: canonical proposition receipts drifted")
        if actual_instances != set(item.get("claim_instance_ids") or []):
            raise ValueError(f"{chain_id}: canonical claim-instance receipts drifted")

        refs_by_chain[chain_id] = sorted(actual_claims | actual_props | actual_instances)

        claim_item = claims_items[chain_id]
        evidence_item = evidence_items[chain_id]
        if claim_item.get("promoted_canonical_source_id") != item.get("canonical_source_id"):
            raise ValueError(f"{chain_id}: Claims/Evidence canonical source mismatch")
        if evidence_item.get("canonical_source_id") != item.get("canonical_source_id"):
            raise ValueError(f"{chain_id}: handoff/Evidence canonical source mismatch")
        if claim_item.get("truth_impact") != "NONE" or claim_item.get("knowledge_impact") != "NONE":
            raise ValueError(f"{chain_id}: upstream semantic mutation detected")
        if claim_item.get("public_eligibility") != "PUBLIC_READY":
            raise ValueError(f"{chain_id}: upstream public eligibility drifted")

    return handoff_items, evidence_items, refs_by_chain


def military_training_packet(
    evidence_item: dict[str, Any],
    refs: list[str],
) -> dict[str, Any]:
    family = "CH-IRAN-MILITARY-TRAINING-20260918"
    source = "SRC-61A4DB945FF2"
    origin_id = "WOL-EVT-SOURCE-PROMOTION-MILITARY-TRAINING-HASSANZADEH"
    carrier_id = "WOL-EVT-SOURCE-PROMOTION-MILITARY-TRAINING-AP-CARRIER"
    statement = (
        "Gen. Hassan Hassanzadeh said over 600,000 people had registered to participate, "
        "with over 1 million expected to take part in the training."
    )
    verdict = (
        "Claims Forensics keeps two atomic propositions inside one underlying claim: the "
        "current >600,000 registration count remains unresolved, while the >1 million figure "
        "is a prospective projection rather than a present-tense factual result. Neither is "
        "upgraded into a Lie finding here."
    )
    provenance = (
        "Associated Press reports Hassanzadeh through the Iranian state broadcaster; the "
        "accepted Evidence record contains no primary broadcaster transcript URL and no "
        "defensible AP origin publication time."
    )
    events = [
        event(
            origin_id,
            family,
            "WOL-SRC-CLAIMANT-GEN_HASSAN_HASSANZADEH",
            "2026-09-18",
            statement,
            refs,
            [source],
            ["ORIGINATES"],
            carriers=["WOL-SRC-AP"],
            claimant="Gen. Hassan Hassanzadeh",
            verdict=verdict,
            provenance_limit=provenance,
            context_scope="One originating claim instance contains separate registration-count and future-projection propositions.",
        ),
        event(
            carrier_id,
            family,
            "WOL-SRC-AP",
            "2026-09-18",
            "Associated Press carried Hassanzadeh's registration-count and training-participation projection.",
            refs,
            [source],
            ["REPORTS", "CARRIER"],
            claimant="Gen. Hassan Hassanzadeh",
            verdict=(
                "AP is the carrier, not the claimant. Its report preserves both proposition "
                "axes without independently auditing the registration count or converting the "
                "future projection into a present fact."
            ),
            provenance_limit=provenance,
        ),
    ]
    relationships = [
        relation(
            "WOL-REL-SOURCE-PROMOTION-MILITARY-TRAINING-AP-CARRIES-HASSANZADEH",
            carrier_id,
            origin_id,
            [source],
        )
    ]
    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_LINEAGE_PACKET",
        "packet_id": PACKET_SPECS[family][1],
        "claim_family_id": family,
        "as_of": AS_OF,
        "basis_paths": [HANDOFF, CLAIMS_CONSUMPTION, EVIDENCE_HANDOFF],
        "generation_mode": "CLAIMS_FORENSICS_SOURCE_PROMOTION_CONTROL_LINEAGE",
        "notes": (
            "Read-only lineage consumption of the PR #165 control chain. One origin event "
            "preserves one underlying claim while retaining two distinct atomic proposition receipts. "
            "Unresolved status and lack of independent audit create no adverse source behavior finding."
        ),
        "source_profiles": [
            profile(
                "WOL-SRC-CLAIMANT-GEN_HASSAN_HASSANZADEH",
                "Gen. Hassan Hassanzadeh",
                "UNKNOWN",
            ),
            profile(
                "WOL-SRC-AP",
                "Associated Press",
                "OUTLET",
                canonical_source_ids=[source],
            ),
        ],
        "information_events": events,
        "relationships": relationships,
        "promotion_flags": [],
    }


def antiship_packet(
    evidence_item: dict[str, Any],
    refs: list[str],
) -> dict[str, Any]:
    family = "CH-IRAN-ANTISHIP-MULTIWARHEAD-TEST-20260919"
    source = "SRC-C5D731879E3B"
    origin_id = "WOL-EVT-SOURCE-PROMOTION-ANTISHIP-MULTIWARHEAD-REZAEI"
    carrier_id = "WOL-EVT-SOURCE-PROMOTION-ANTISHIP-MULTIWARHEAD-NIE-CARRIER"
    statement = "He claimed Iran had also recently test-fired a multi-warhead anti-ship missile near a US vessel or aircraft carrier."
    provenance = (
        "The New Indian Express situates Rezaei's remarks in Al Jazeera interview coverage "
        "but supplies no direct primary-source URL for this missile-test assertion. The carrier "
        "supplies no telemetry, imagery, U.S. acknowledgement, NAVWARN/NOTAM, or weapon identification."
    )
    events = [
        event(
            origin_id,
            family,
            "WOL-SRC-CLAIMANT-MOHSEN_REZAEI",
            "2026-09-20",
            statement,
            refs,
            [source],
            ["ORIGINATES"],
            carriers=["WOL-SRC-NEW-INDIAN-EXPRESS"],
            claimant="Mohsen Rezaei",
            verdict=(
                "Rezaei is the claimant. The asserted recent multi-warhead anti-ship missile "
                "test near a U.S. vessel or aircraft carrier remains unresolved and no Lie, "
                "propaganda, or deception finding is created from the absence of independent corroboration."
            ),
            provenance_limit=provenance,
        ),
        event(
            carrier_id,
            family,
            "WOL-SRC-NEW-INDIAN-EXPRESS",
            "2026-09-20",
            statement,
            refs,
            [source],
            ["REPORTS", "CARRIER"],
            claimant="Mohsen Rezaei",
            verdict=(
                "The New Indian Express is a carrier of Rezaei's assertion, not independent "
                "confirmation that the described missile test occurred."
            ),
            provenance_limit=provenance,
        ),
    ]
    relationships = [
        relation(
            "WOL-REL-SOURCE-PROMOTION-ANTISHIP-MULTIWARHEAD-NIE-CARRIES-REZAEI",
            carrier_id,
            origin_id,
            [source],
        )
    ]
    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_LINEAGE_PACKET",
        "packet_id": PACKET_SPECS[family][1],
        "claim_family_id": family,
        "as_of": AS_OF,
        "basis_paths": [HANDOFF, CLAIMS_CONSUMPTION, EVIDENCE_HANDOFF],
        "generation_mode": "CLAIMS_FORENSICS_SOURCE_PROMOTION_CONTROL_LINEAGE",
        "notes": (
            "Read-only lineage consumption of the PR #165 control chain. Claimant and carrier "
            "remain distinct; lack of telemetry, imagery, U.S. acknowledgement, or other corroboration "
            "does not become a falsity or misconduct finding."
        ),
        "source_profiles": [
            profile(
                "WOL-SRC-CLAIMANT-MOHSEN_REZAEI",
                "Mohsen Rezaei",
                "UNKNOWN",
            ),
            profile(
                "WOL-SRC-NEW-INDIAN-EXPRESS",
                "The New Indian Express",
                "OUTLET",
                country_region="India",
                primary_platform="Web",
                canonical_source_ids=[source],
            ),
        ],
        "information_events": events,
        "relationships": relationships,
        "promotion_flags": [],
    }


def zero_exports_packet(
    evidence_item: dict[str, Any],
    refs: list[str],
) -> dict[str, Any]:
    family = "CH-CENTCOM-ZERO-IRAN-OIL-EXPORTS-20260919"
    source = "SRC-229640C43A50"
    origin_id = "WOL-EVT-SOURCE-PROMOTION-CENTCOM-ZERO-OIL-EXPORTS-ORIGIN"
    carrier_id = "WOL-EVT-SOURCE-PROMOTION-CENTCOM-ZERO-OIL-EXPORTS-ANADOLU-CARRIER"
    statement = "Iran has exported zero barrels thanks to our ironclad blockade."
    provenance = (
        "Anadolu attributes the statement to Adm. Brad Cooper/CENTCOM remarks released on X. "
        "The accepted locker does not retain the underlying CENTCOM/X URL. The quoted clause "
        "does not define a precise measurement start/end window or a narrower export denominator."
    )
    scope = (
        "The proposition is exactly Iranian oil exports of zero barrels. It is not silently "
        "narrowed to loadings, tanker departures, Strait passages, sanctioned exports, "
        "customs-recorded trade, or any other substitute metric."
    )
    events = [
        event(
            origin_id,
            family,
            "WOL-SRC-USCENTCOM",
            "2026-09-19",
            statement,
            refs,
            [source],
            ["ORIGINATES"],
            carriers=["WOL-SRC-ANADOLU"],
            claimant="Adm. Brad Cooper / U.S. Central Command",
            verdict=(
                "Claims Forensics preserves the exact zero-barrels export assertion as unresolved. "
                "The accepted wording does not establish a precise start/end measurement window or "
                "a narrower denominator, so Web of Lies does not manufacture one."
            ),
            provenance_limit=provenance,
            context_scope=scope,
        ),
        event(
            carrier_id,
            family,
            "WOL-SRC-ANADOLU",
            "2026-09-19",
            statement,
            refs,
            [source],
            ["REPORTS", "CARRIER"],
            claimant="Adm. Brad Cooper / U.S. Central Command",
            verdict=(
                "Anadolu is the carrier. It preserves the zero-barrels wording but does not "
                "supply the missing exact timebox or measurement denominator."
            ),
            provenance_limit=provenance,
            context_scope=scope,
        ),
    ]
    relationships = [
        relation(
            "WOL-REL-SOURCE-PROMOTION-CENTCOM-ZERO-OIL-EXPORTS-ANADOLU-CARRIES-CENTCOM",
            carrier_id,
            origin_id,
            [source],
        )
    ]
    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_LINEAGE_PACKET",
        "packet_id": PACKET_SPECS[family][1],
        "claim_family_id": family,
        "as_of": AS_OF,
        "basis_paths": [HANDOFF, CLAIMS_CONSUMPTION, EVIDENCE_HANDOFF],
        "generation_mode": "CLAIMS_FORENSICS_SOURCE_PROMOTION_CONTROL_LINEAGE",
        "notes": (
            "Read-only lineage consumption of the PR #165 control chain. The exact zero-export "
            "wording and its unresolved scope ambiguity are preserved without substituting a narrower metric."
        ),
        "source_profiles": [
            profile(
                "WOL-SRC-USCENTCOM",
                "U.S. Central Command",
                "INSTITUTION",
                country_region="United States",
                canonical_outlet_profile_id="OUTLET-939785E7D945",
            ),
            profile(
                "WOL-SRC-ANADOLU",
                "Anadolu Agency",
                "OUTLET",
                country_region="Turkey",
                primary_platform="Web",
                canonical_source_ids=[source],
            ),
        ],
        "information_events": events,
        "relationships": relationships,
        "promotion_flags": [],
    }


def expected_packets(root: Path) -> dict[Path, dict[str, Any]]:
    _handoff_items, evidence_items, refs = validated_inputs(root)
    builders = {
        "CH-IRAN-MILITARY-TRAINING-20260918": military_training_packet,
        "CH-IRAN-ANTISHIP-MULTIWARHEAD-TEST-20260919": antiship_packet,
        "CH-CENTCOM-ZERO-IRAN-OIL-EXPORTS-20260919": zero_exports_packet,
    }

    output: dict[Path, dict[str, Any]] = {}
    for chain_id in sorted(PACKET_SPECS):
        filename, packet_id = PACKET_SPECS[chain_id]
        packet = builders[chain_id](evidence_items[chain_id], refs[chain_id])
        if packet["packet_id"] != packet_id or packet["claim_family_id"] != chain_id:
            raise AssertionError(f"internal source-promotion packet spec mismatch for {chain_id}")
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
        errors: list[str] = []
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
            f"web-of-lies source-promotion controls: PASS packets={len(packets)} "
            f"events={events} relationships={relationships}"
        )
        return 0

    for path, packet in packets.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(canonical_bytes(packet))
        print(f"wrote {path.relative_to(root)}")
    events = sum(len(packet["information_events"]) for packet in packets.values())
    relationships = sum(len(packet["relationships"]) for packet in packets.values())
    print(
        f"web-of-lies source-promotion controls: wrote packets={len(packets)} "
        f"events={events} relationships={relationships}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
