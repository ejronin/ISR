#!/usr/bin/env python3
"""Generate baseline Web of Lies lineage packets for the existing forensic claim corpus.

This compiler is intentionally conservative. It converts already-adjudicated claim
records into origin/carrier lineage events without inventing new truth or knowledge
findings. The F-15E/CSAR/uranium model case remains manually curated because it
contains richer source-by-source provenance than the legacy corpus.

Named claimant identities are resolved through a reviewed exact-string map.
Genuinely unnamed sources remain per-claim ephemeral nodes and are never merged
into a fictional common actor.
"""
from __future__ import annotations

import argparse
import copy
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CLAIMS_PATH = "data/forensic-v1.3.2/iranian-claim-evolution.json"
CHAIN_INDEX_PATH = "data/forensic-v1.3.2/claim-chain-index.json"
SOURCE_REGISTRY_PATH = "data/source-registry.json"
OUTLET_PROFILES_PATH = "data/outlet-profiles.json"
AUTHORITY_PATH = "data/lie-ledger-v2-rook-authority.json"
IDENTITY_MAP_PATH = "config/web-of-lies-source-identities.json"
SEMANTIC_OVERLAY_PATH = "data/claims-forensics/lie-ledger-semantic-overlay-20260919.json"
SEMANTIC_HANDOFF_PATH = "data/evidence-integration/public-product-lie-ledger-semantic-handoff-20260917.json"
ROOK_WOL_HANDOFF_PATH = "data/evidence-integration/rook-catchup-web-of-lies-input-20260920.json"
PACKET_DIR = "data/web-of-lies/lineage-packets"
MANUAL_CHAIN_IDS = {"CH-F15E-CSAR-URANIUM"}
RETIRED_LEGACY_CHAIN_IDS = {"CH-FALSE-FLAG-REGIONAL"}
AS_OF = "2026-09-20T17:55:00-04:00"

FALSE_OR_MISLEADING_DISPOSITIONS = {
    "CONTRADICTED",
    "FALSE",
    "FALSE_ATTRIBUTION",
    "MISLEADING",
}
MUTATION_TAGS = {
    "narrative_substitution",
    "false_flag_substitution",
    "late_narrative_mutation",
    "metric_shift",
    "claim_escalation",
}
OFFICIAL_TYPES = {
    "OFFICIAL_MILITARY",
    "FOREIGN_MINISTRY",
    "OFFICIAL_DIPLOMATIC",
    "SENIOR_POLITICAL_OFFICIAL",
    "IRANIAN_OFFICIAL",
    "OFFICIAL_OR_STATE_RESPONSE",
    "OFFICIAL_OR_SEMIOFFICIAL",
    "STATE_MEDIA_AND_LOCAL_OFFICIAL",
    "OFFICIAL_ACKNOWLEDGMENT",
}
STATE_MEDIA_OUTLETS = {"OUTLET-7B62913B395D", "OUTLET-AA437F617622"}


def load_json(root: Path, path: str) -> Any:
    return json.loads((root / path).read_text(encoding="utf-8"))


def rows(value: Any, *keys: str) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        for key in keys:
            candidate = value.get(key)
            if isinstance(candidate, list):
                return candidate
    raise ValueError(f"unable to locate row list using keys {keys}")


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def slug(chain_id: str) -> str:
    value = chain_id.removeprefix("CH-").lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def event_id(chain_id: str, claim_id: str, suffix: str) -> str:
    family = slug(chain_id).upper().replace("-", "_")
    claim = claim_id.removeprefix("IR-CLM-")
    return f"WOL-EVT-{family}-{claim}-{suffix}"


def relation_id(chain_id: str, index: int) -> str:
    family = slug(chain_id).upper().replace("-", "_")
    return f"WOL-REL-{family}-{index:03d}"


def unique(values: list[Any]) -> list[str]:
    return sorted({str(value).strip() for value in values if str(value).strip()})


def profile_template(identity: dict[str, Any], canonical_source_id: str | None = None) -> dict[str, Any]:
    profile = {
        "source_id": identity["source_id"],
        "display_name": identity["display_name"],
        "source_entity_type": identity.get("source_entity_type", "UNKNOWN"),
        "country_region": identity.get("country_region"),
        "primary_platform": identity.get("primary_platform"),
        "canonical_outlet_profile_id": identity.get("canonical_outlet_profile_id"),
        "canonical_actor_id": identity.get("canonical_actor_id"),
        "canonical_source_ids": [canonical_source_id] if canonical_source_id else [],
        "behavior_classes": ["UNKNOWN"],
        "authenticity_class": "UNKNOWN",
        "revenue_model": ["UNKNOWN_REVENUE_MODEL"],
        "classification_basis_event_ids": [],
        "revenue_basis_event_ids": [],
    }
    return profile


def merge_local_profile(target: dict[str, dict[str, Any]], incoming: dict[str, Any]) -> None:
    source_id = str(incoming["source_id"])
    if source_id not in target:
        target[source_id] = copy.deepcopy(incoming)
        return
    existing = target[source_id]
    for field in (
        "display_name",
        "source_entity_type",
        "country_region",
        "primary_platform",
        "canonical_outlet_profile_id",
        "canonical_actor_id",
    ):
        left, right = existing.get(field), incoming.get(field)
        if left in (None, ""):
            existing[field] = copy.deepcopy(right)
        elif right not in (None, "") and left != right:
            raise ValueError(f"profile {source_id} conflicts on {field}: {left!r} != {right!r}")
    for field in (
        "canonical_source_ids",
        "behavior_classes",
        "classification_basis_event_ids",
        "revenue_model",
        "revenue_basis_event_ids",
    ):
        existing[field] = unique(list(existing.get(field) or []) + list(incoming.get(field) or []))
    if len(existing["behavior_classes"]) > 1 and "UNKNOWN" in existing["behavior_classes"]:
        existing["behavior_classes"].remove("UNKNOWN")
    if len(existing["revenue_model"]) > 1 and "UNKNOWN_REVENUE_MODEL" in existing["revenue_model"]:
        existing["revenue_model"].remove("UNKNOWN_REVENUE_MODEL")


def claimant_identity(claim: dict[str, Any], identity_map: dict[str, Any]) -> dict[str, Any]:
    claimant = str(claim.get("claimant") or "")
    mapping = (identity_map.get("claimants") or {}).get(claimant)
    if mapping is None:
        raise ValueError(f"unmapped Web of Lies claimant identity: {claimant!r} ({claim.get('claim_id')})")
    mapping = copy.deepcopy(mapping)
    if mapping.pop("anonymous_per_claim", False):
        claim_id = str(claim["claim_id"])
        mapping["source_id"] = f"WOL-SRC-UNNAMED-{claim_id}"
        mapping["canonical_outlet_profile_id"] = None
        mapping["canonical_actor_id"] = None
    return mapping


def outlet_identity(source_record: dict[str, Any], identity_map: dict[str, Any]) -> dict[str, Any]:
    outlet_id = str(source_record.get("outlet_profile_id") or "")
    mapping = (identity_map.get("outlet_profiles") or {}).get(outlet_id)
    if mapping is None:
        raise ValueError(f"unmapped Web of Lies outlet identity: {outlet_id!r}")
    result = copy.deepcopy(mapping)
    result["canonical_outlet_profile_id"] = outlet_id
    return result


def proposition_dispositions(claim: dict[str, Any]) -> set[str]:
    return {
        str(row.get("disposition") or "")
        for row in (claim.get("factual_propositions") or [])
        if row.get("disposition")
    }


def override_rows(claim_id: str, authority: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        row
        for row in (authority.get("forensic_overrides") or [])
        if str(row.get("original_claim_id") or "") == claim_id
    ]


def is_mutation(claim: dict[str, Any]) -> bool:
    finals = set(claim.get("final_disposition") or [])
    tags = set(claim.get("taxonomy_tags") or [])
    return "NARRATIVE_SUBSTITUTION" in finals or bool(tags & MUTATION_TAGS)


def is_false_or_misleading(claim: dict[str, Any], authority: dict[str, Any]) -> bool:
    dispositions = proposition_dispositions(claim)
    if dispositions & FALSE_OR_MISLEADING_DISPOSITIONS:
        return True
    return any(str(row.get("truth") or "") == "FALSE" for row in override_rows(str(claim["claim_id"]), authority))


def event_type_for(claim: dict[str, Any], authority: dict[str, Any]) -> str:
    if is_mutation(claim):
        return "NARRATIVE_MUTATION"
    if is_false_or_misleading(claim, authority):
        return "FALSE_OR_MISLEADING_CONNECTION"
    return "REPORTS"


def epistemic_posture(claim: dict[str, Any]) -> str:
    statement = str(claim.get("exact_translated_claim") or "").lower()
    ctype = str(claim.get("claimant_type") or "")
    if "may " in statement or "possible" in statement or "could " in statement:
        return "POSSIBLE"
    if "unnamed" in ctype or "sources" in statement:
        return "SOURCES_SAY"
    if ctype in OFFICIAL_TYPES or "OFFICIAL" in ctype or "MILITARY" in ctype:
        return "OFFICIAL"
    if ctype in {"STATE_MEDIA", "SEMIOFFICIAL_MEDIA"}:
        return "DEFINITIVE"
    return "REPORTED"


def state_or_official(claim: dict[str, Any], carrier_outlet_id: str) -> bool:
    ctype = str(claim.get("claimant_type") or "")
    return (
        ctype in OFFICIAL_TYPES
        or "OFFICIAL" in ctype
        or "MILITARY" in ctype
        or ctype in {"STATE_MEDIA", "SEMIOFFICIAL_MEDIA"}
        or carrier_outlet_id in STATE_MEDIA_OUTLETS
    )


def behavior_findings(
    claim: dict[str, Any],
    authority: dict[str, Any],
    *,
    carrier_outlet_id: str,
    for_carrier: bool,
) -> list[str]:
    findings: list[str] = []
    event_type = event_type_for(claim, authority)
    negative = is_false_or_misleading(claim, authority)
    if event_type == "NARRATIVE_MUTATION":
        if not for_carrier or carrier_outlet_id in STATE_MEDIA_OUTLETS:
            findings.append("NARRATIVE_MUTATION_OFFENDER")
    if negative and state_or_official(claim, carrier_outlet_id):
        if not for_carrier or carrier_outlet_id in STATE_MEDIA_OUTLETS:
            findings.append("STATE_OFFICIAL_MISINFORMATION_SOURCE")
    if not findings and not for_carrier:
        ctype = str(claim.get("claimant_type") or "")
        if ctype in OFFICIAL_TYPES or "OFFICIAL" in ctype or "MILITARY" in ctype:
            findings.append("OFFICIAL_SOURCE")
    if not findings and for_carrier and carrier_outlet_id == "OUTLET-234330834C41":
        findings.append("JOURNALISTIC_SOURCE")
    return unique(findings)


def plain_verdict(claim: dict[str, Any], authority: dict[str, Any]) -> str:
    finals = set(claim.get("final_disposition") or [])
    overrides = override_rows(str(claim["claim_id"]), authority)
    strongest = next((row for row in overrides if row.get("combined")), None)
    if "admission_latency" in set(claim.get("taxonomy_tags") or []):
        return "This is an acknowledgment/admission event. The current record does not establish a prior denial, so Web of Lies does not score the delay itself as misinformation."
    if is_mutation(claim):
        if strongest:
            return f"This is a documented narrative mutation or substitution. Claims Forensics separately records: {strongest['combined']}."
        return "This is a documented narrative mutation or substitution. Web of Lies records the change without inventing a stronger truth or knowledge finding."
    if is_false_or_misleading(claim, authority):
        if strongest:
            return f"The underlying proposition is false or misleading in the canonical record. Claims Forensics separately records: {strongest['combined']}."
        return "The underlying proposition is false or misleading in the canonical record. Web of Lies records who originated and carried it."
    if "UNSUBSTANTIATED" in finals:
        return "The claim remains unsubstantiated. Web of Lies records its propagation without converting lack of proof into a lie finding."
    if "PARTLY_CONFIRMED" in finals or "MOSTLY_CONFIRMED" in finals:
        return "The underlying event is at least partly real, but the full claimed effect is not established. The lineage preserves that distinction."
    if "CONFIRMED" in finals:
        return "The underlying proposition is supported. This event is retained as context or acknowledgment, not as a misinformation incident."
    return "Web of Lies records this publication event without changing the canonical claim adjudication."


def observed_at(claim: dict[str, Any]) -> tuple[str | None, str | None]:
    date = str(claim.get("claim_date") or "").strip()
    display = str(claim.get("source_display_timestamp") or "").strip()
    precision = str(claim.get("timestamp_precision") or "").strip() or None
    if not date:
        return None, precision
    if display and re.fullmatch(r"\d{2}:\d{2}(?::\d{2})?", display):
        return f"{date}T{display}", precision
    return date, precision


def collect_public_ready_instances(value: Any) -> list[dict[str, Any]]:
    found: dict[str, dict[str, Any]] = {}

    def visit(node: Any) -> None:
        if isinstance(node, list):
            for child in node:
                visit(child)
            return
        if not isinstance(node, dict):
            return
        instance_id = node.get("claim_instance_id")
        if instance_id and node.get("publication_status") == "PUBLIC_READY":
            found[str(instance_id)] = node
        for child in node.values():
            visit(child)

    visit(value)
    return sorted(found.values(), key=lambda row: str(row["claim_instance_id"]))


def current_overlay_extras(
    overlay: dict[str, Any],
    legacy_claim_ids: set[str],
    indexed_chain_ids: set[str],
) -> dict[str, list[dict[str, Any]]]:
    extras: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in collect_public_ready_instances(overlay):
        chain_id = str(row.get("chain_id") or "")
        claim_id = str(row.get("claim_id") or "")
        if chain_id not in indexed_chain_ids or claim_id in legacy_claim_ids:
            continue
        extras[chain_id].append(row)
    return extras


def current_carrier_identity(source_id: str, identity_map: dict[str, Any]) -> dict[str, Any]:
    mapping = (identity_map.get("current_source_carriers") or {}).get(source_id)
    if mapping is None:
        raise ValueError(f"unmapped current Web of Lies carrier source: {source_id}")
    return copy.deepcopy(mapping)


def current_event_id(chain_id: str, claim_id: str, suffix: str) -> str:
    family = slug(chain_id).upper().replace("-", "_")
    claim = re.sub(r"[^A-Za-z0-9]+", "_", claim_id).strip("_")
    return f"WOL-EVT-{family}-{claim}-{suffix}"


def current_plain_verdict(instance: dict[str, Any]) -> str:
    combined = str(instance.get("combined_assessment") or "").strip()
    truth = str(instance.get("truth_adjudication") or "").strip()
    qualifier = str(instance.get("truth_qualifier") or "").strip()
    if "MEDIA_ARTIFACT" in qualifier:
        return (
            f"The media artifact is canonically {truth or 'adjudicated'}. "
            f"Claims Forensics records: {combined}. Web of Lies does not assign "
            "the artifact to an official Iranian origin when that provenance is not established."
        )
    if "NO LIE FINDING" in combined:
        return (
            f"Claims Forensics records: {combined}. Web of Lies preserves the exact "
            "ordinal as unresolved and does not score it as an adverse misinformation incident."
        )
    if truth == "UNRESOLVED":
        return (
            f"Claims Forensics records: {combined or 'UNRESOLVED'}. Web of Lies preserves "
            "the unresolved claim without converting insufficient confirmation into falsity."
        )
    return f"Claims Forensics records: {combined or truth}. Web of Lies does not alter that adjudication."


def merge_current_overlay_extras(
    packet: dict[str, Any],
    instances: list[dict[str, Any]],
    identity_map: dict[str, Any],
    semantic_handoff: dict[str, Any],
    rook_handoff: dict[str, Any],
) -> dict[str, Any]:
    if not instances:
        return packet

    chain_id = str(packet["claim_family_id"])
    profiles = {str(row["source_id"]): copy.deepcopy(row) for row in packet["source_profiles"]}
    events = [copy.deepcopy(row) for row in packet["information_events"]]
    relationships = [copy.deepcopy(row) for row in packet["relationships"]]
    existing_event_ids = {str(row["event_id"]) for row in events}

    relation_numbers = []
    for relation in relationships:
        match = re.search(r"-(\d+)$", str(relation["relationship_id"]))
        if match:
            relation_numbers.append(int(match.group(1)))
    rel_index = max(relation_numbers, default=0) + 1

    direct_sources = semantic_handoff.get("evidence_sources") or {}
    qeshm_origin_events: dict[str, str] = {}

    for instance in instances:
        claim_id = str(instance["claim_id"])
        instance_id = str(instance["claim_instance_id"])
        actor = str(instance.get("actor") or "")
        qualifier = str(instance.get("truth_qualifier") or "")
        statement_date = str(instance.get("statement_date") or "") or None

        if actor == "IRGC":
            irgc_identity = copy.deepcopy(
                (identity_map.get("claimants") or {})["IRGC as reported by Press TV"]
            )
            o_event_id = current_event_id(chain_id, claim_id, "O")
            if o_event_id in existing_event_ids:
                raise ValueError(f"{chain_id}: duplicate current-overlay event {o_event_id}")
            origin_profile = profile_template(irgc_identity)
            origin_profile["behavior_classes"] = ["OFFICIAL_SOURCE"]
            origin_profile["classification_basis_event_ids"] = [o_event_id]

            if statement_date == "2026-09-16":
                carrier_source_ids = list(direct_sources.get("mq9_sep16") or [])
            elif statement_date == "2026-09-17":
                carrier_source_ids = list(direct_sources.get("mq9_sep17") or [])
            else:
                raise ValueError(
                    f"{chain_id}: current IRGC extension lacks direct-source mapping for {instance_id}"
                )
            if not carrier_source_ids:
                raise ValueError(f"{chain_id}: no direct carrier receipts for {instance_id}")

            carrier_profile_ids: list[str] = []
            for receipt_id in carrier_source_ids:
                carrier_identity = current_carrier_identity(str(receipt_id), identity_map)
                carrier_profile = profile_template(carrier_identity, str(receipt_id))
                merge_local_profile(profiles, carrier_profile)
                carrier_profile_ids.append(str(carrier_profile["source_id"]))

            origin_profile["canonical_source_ids"] = unique(
                list(origin_profile.get("canonical_source_ids") or []) + carrier_source_ids
            )
            merge_local_profile(profiles, origin_profile)
            events.append({
                "event_id": o_event_id,
                "claim_family_id": chain_id,
                "source_id": "WOL-SRC-IRGC",
                "event_type": "REPORTS",
                "published_at": statement_date,
                "first_observed_at": statement_date,
                "time_precision": str(instance.get("statement_precision") or "DATE_ONLY"),
                "epistemic_posture": "OFFICIAL",
                "exact_statement": instance.get("claim"),
                "translated_statement": None,
                "originating_claimant": actor,
                "lineage_roles": ["ORIGINATES"],
                "carrier_profile_ids": unique(carrier_profile_ids),
                "canonical_claim_refs": [claim_id, instance_id],
                "evidence_source_ids": unique(carrier_source_ids),
                "contrary_evidence_source_ids": [],
                "correction_state": None,
                "behavior_findings": ["OFFICIAL_SOURCE"],
                "revenue_findings": [],
                "independently_sourced": False,
                "plain_english_verdict": current_plain_verdict(instance),
                "canonical_combined_assessment": instance.get("combined_assessment"),
            })
            existing_event_ids.add(o_event_id)
            qeshm_origin_events[claim_id] = o_event_id

            for receipt_id in carrier_source_ids:
                carrier_identity = current_carrier_identity(str(receipt_id), identity_map)
                c_event_id = current_event_id(chain_id, claim_id, f"C-{receipt_id[-6:]}")
                if c_event_id in existing_event_ids:
                    raise ValueError(f"{chain_id}: duplicate current carrier event {c_event_id}")
                events.append({
                    "event_id": c_event_id,
                    "claim_family_id": chain_id,
                    "source_id": carrier_identity["source_id"],
                    "event_type": "REPORTS",
                    "published_at": statement_date,
                    "first_observed_at": statement_date,
                    "time_precision": str(instance.get("statement_precision") or "DATE_ONLY"),
                    "epistemic_posture": "REPORTED",
                    "exact_statement": (
                        f"{carrier_identity['display_name']} carried the attributed IRGC claim: "
                        f"{instance.get('claim')}"
                    ),
                    "translated_statement": None,
                    "originating_claimant": actor,
                    "lineage_roles": ["REPORTS"],
                    "carrier_profile_ids": [],
                    "canonical_claim_refs": [claim_id, instance_id],
                    "evidence_source_ids": [str(receipt_id)],
                    "contrary_evidence_source_ids": [],
                    "correction_state": None,
                    "behavior_findings": [],
                    "revenue_findings": [],
                    "independently_sourced": False,
                    "plain_english_verdict": current_plain_verdict(instance),
                })
                existing_event_ids.add(c_event_id)
                relationships.append({
                    "relationship_id": relation_id(chain_id, rel_index),
                    "from_id": c_event_id,
                    "to_id": o_event_id,
                    "relationship_type": "DERIVES_FROM",
                    "evidence_source_ids": [str(receipt_id)],
                })
                rel_index += 1
                relationships.append({
                    "relationship_id": relation_id(chain_id, rel_index),
                    "from_id": c_event_id,
                    "to_id": "WOL-SRC-IRGC",
                    "relationship_type": "ATTRIBUTES_TO",
                    "evidence_source_ids": [str(receipt_id)],
                })
                rel_index += 1
            continue

        if "MEDIA_ARTIFACT" in qualifier:
            source_id = f"WOL-SRC-UNATTRIBUTED-MEDIA-{claim_id}"
            media_profile = profile_template({
                "source_id": source_id,
                "display_name": f"Unattributed media circulation — {claim_id}",
                "source_entity_type": "OTHER",
                "country_region": None,
                "primary_platform": None,
                "canonical_outlet_profile_id": None,
                "canonical_actor_id": None,
            })
            media_profile["canonical_source_ids"] = unique(list(instance.get("source_ids") or []))
            merge_local_profile(profiles, media_profile)
            o_event_id = current_event_id(chain_id, claim_id, "MEDIA")
            if o_event_id in existing_event_ids:
                raise ValueError(f"{chain_id}: duplicate media-artifact event {o_event_id}")
            events.append({
                "event_id": o_event_id,
                "claim_family_id": chain_id,
                "source_id": source_id,
                "event_type": "FALSE_MEDIA_ARTIFACT",
                "published_at": statement_date,
                "first_observed_at": statement_date,
                "time_precision": str(instance.get("statement_precision") or "DATE_ONLY"),
                "epistemic_posture": "REPORTED",
                "exact_statement": instance.get("claim"),
                "translated_statement": None,
                "originating_claimant": actor,
                "lineage_roles": ["REPORTS"],
                "carrier_profile_ids": [],
                "canonical_claim_refs": [claim_id, instance_id],
                "evidence_source_ids": unique(list(instance.get("source_ids") or [])),
                "contrary_evidence_source_ids": [],
                "correction_state": None,
                "behavior_findings": [],
                "revenue_findings": [],
                "independently_sourced": None,
                "plain_english_verdict": current_plain_verdict(instance),
                "provenance_limit": "OFFICIAL_ORIGIN_NOT_ESTABLISHED",
            })
            existing_event_ids.add(o_event_id)
            continue

        raise ValueError(
            f"{chain_id}: unsupported current-overlay extension {instance_id} "
            f"actor={actor!r} qualifier={qualifier!r}"
        )

    if chain_id == "CH-AIRCRAFT-KILL-AGGREGATES":
        # Preserve the 52 -> 53 cumulative sequence without converting either
        # unsupported exact ordinal into a lie or into independent corroboration.
        fifty_two = qeshm_origin_events.get("CLM-IRGC-QESHM-MQ9-52-20260916")
        fifty_three = qeshm_origin_events.get("CLM-IRGC-QESHM-MQ9-53-20260917")
        if fifty_two and fifty_three:
            relationships.append({
                "relationship_id": relation_id(chain_id, rel_index),
                "from_id": fifty_three,
                "to_id": fifty_two,
                "relationship_type": "REPEATS",
                "evidence_source_ids": unique(
                    list(direct_sources.get("mq9_sep16") or [])
                    + list(direct_sources.get("mq9_sep17") or [])
                ),
            })
            rel_index += 1

        # Evidence Integration supplied recent U.S.-official-source reporting as
        # type-specific context only. It does not identify either loss with Qeshm.
        for sequence in rook_handoff.get("statement_sequences") or []:
            if sequence.get("sequence_id") != "WOL-IN-ROOK-MQ9-52-53-20260920":
                continue
            cbs_receipt = "SRC-CBC350AF4215"
            cbs_identity = current_carrier_identity(cbs_receipt, identity_map)
            cbs_profile = profile_template(cbs_identity, cbs_receipt)
            cbs_event_id = "WOL-EVT-AIRCRAFT_KILL_AGGREGATES-MQ1-CONTEXT-20260917"
            cbs_profile["behavior_classes"] = ["JOURNALISTIC_SOURCE"]
            cbs_profile["classification_basis_event_ids"] = [cbs_event_id]
            merge_local_profile(profiles, cbs_profile)
            if cbs_event_id not in existing_event_ids:
                events.append({
                    "event_id": cbs_event_id,
                    "claim_family_id": chain_id,
                    "source_id": cbs_identity["source_id"],
                    "event_type": "REPORTS",
                    "published_at": "2026-09-17",
                    "first_observed_at": "2026-09-17",
                    "time_precision": "DATE_ONLY",
                    "epistemic_posture": "SOURCES_SAY",
                    "exact_statement": (
                        "CBS reported U.S. officials described at least two recent U.S. "
                        "drone losses as MQ-1, without locations."
                    ),
                    "translated_statement": None,
                    "originating_claimant": "U.S. officials reported by CBS News",
                    "lineage_roles": ["REPORTS"],
                    "carrier_profile_ids": [],
                    "canonical_claim_refs": [],
                    "evidence_source_ids": [cbs_receipt],
                    "contrary_evidence_source_ids": [],
                    "correction_state": None,
                    "behavior_findings": ["JOURNALISTIC_SOURCE"],
                    "revenue_findings": [],
                    "independently_sourced": True,
                    "plain_english_verdict": (
                        "This is type-specific external context only. The record does not "
                        "identify either reported MQ-1 loss with either Qeshm claim, so Web "
                        "of Lies treats it as neither corroboration nor contradiction."
                    ),
                    "context_scope": "TYPE_SPECIFIC_EXTERNAL_CONTEXT_NOT_QESHM_IDENTIFICATION",
                })
                existing_event_ids.add(cbs_event_id)
            break

    packet["source_profiles"] = sorted(profiles.values(), key=lambda row: row["source_id"])
    packet["information_events"] = sorted(events, key=lambda row: row["event_id"])
    packet["relationships"] = sorted(relationships, key=lambda row: row["relationship_id"])
    packet["basis_paths"] = unique(
        list(packet.get("basis_paths") or [])
        + [SEMANTIC_OVERLAY_PATH, SEMANTIC_HANDOFF_PATH, ROOK_WOL_HANDOFF_PATH]
    )
    packet["generation_mode"] = "BASELINE_PLUS_CURRENT_CLAIMS_FORENSICS_OVERLAY"
    packet["notes"] = (
        str(packet.get("notes") or "").rstrip()
        + " Current public-ready Claims Forensics extensions are merged read-only; "
          "unresolved Qeshm propositions remain no-lie/unresolved, and false media "
          "artifacts with unknown origin remain unattributed."
    )
    return packet


def packet_for_chain(
    chain: dict[str, Any],
    claims_by_id: dict[str, dict[str, Any]],
    source_by_id: dict[str, dict[str, Any]],
    identity_map: dict[str, Any],
    authority: dict[str, Any],
) -> dict[str, Any]:
    chain_id = str(chain["chain_id"])
    profiles: dict[str, dict[str, Any]] = {}
    events: list[dict[str, Any]] = []
    relationships: list[dict[str, Any]] = []
    origin_event_by_claim: dict[str, str] = {}
    rel_index = 1

    for claim_id in chain.get("claim_ids") or []:
        claim = claims_by_id.get(str(claim_id))
        if claim is None:
            raise ValueError(f"{chain_id}: missing claim record {claim_id}")
        canonical_source_id = str(claim.get("source_id") or "")
        source_record = source_by_id.get(canonical_source_id)
        if source_record is None:
            raise ValueError(f"{chain_id}: missing canonical source record {canonical_source_id}")

        origin_identity = claimant_identity(claim, identity_map)
        carrier_identity = outlet_identity(source_record, identity_map)
        origin_profile = profile_template(origin_identity, canonical_source_id)
        carrier_profile = profile_template(carrier_identity, canonical_source_id)
        origin_source_id = str(origin_profile["source_id"])
        carrier_source_id = str(carrier_profile["source_id"])

        o_event_id = event_id(chain_id, str(claim_id), "O")
        origin_event_by_claim[str(claim_id)] = o_event_id
        first_observed, precision = observed_at(claim)
        e_type = event_type_for(claim, authority)
        origin_findings = behavior_findings(
            claim, authority, carrier_outlet_id=str(source_record.get("outlet_profile_id") or ""), for_carrier=False
        )
        for finding in origin_findings:
            if finding != "UNKNOWN":
                origin_profile["behavior_classes"].append(finding)
                origin_profile["classification_basis_event_ids"].append(o_event_id)

        origin_event = {
            "event_id": o_event_id,
            "claim_family_id": chain_id,
            "source_id": origin_source_id,
            "event_type": e_type,
            "published_at": None,
            "first_observed_at": first_observed,
            "time_precision": precision,
            "epistemic_posture": epistemic_posture(claim),
            "exact_statement": claim.get("exact_translated_claim"),
            "translated_statement": None,
            "originating_claimant": claim.get("claimant"),
            "lineage_roles": ["ORIGINATES"] if origin_source_id != carrier_source_id else ["REPORTS"],
            "carrier_profile_ids": [] if origin_source_id == carrier_source_id else [carrier_source_id],
            "canonical_claim_refs": [str(claim_id)],
            "evidence_source_ids": [canonical_source_id],
            "contrary_evidence_source_ids": unique(
                list(claim.get("later_evidence") or [])
                + (list(claim.get("contemporaneous_independent_evidence") or []) if is_false_or_misleading(claim, authority) else [])
            ),
            "correction_state": "NARRATIVE_REPLACEMENT" if e_type == "NARRATIVE_MUTATION" else None,
            "behavior_findings": origin_findings,
            "revenue_findings": [],
            "independently_sourced": False if origin_source_id != carrier_source_id else None,
            "plain_english_verdict": plain_verdict(claim, authority),
        }
        events.append(origin_event)
        merge_local_profile(profiles, origin_profile)

        if origin_source_id != carrier_source_id:
            c_event_id = event_id(chain_id, str(claim_id), "C")
            carrier_findings = behavior_findings(
                claim, authority, carrier_outlet_id=str(source_record.get("outlet_profile_id") or ""), for_carrier=True
            )
            for finding in carrier_findings:
                if finding != "UNKNOWN":
                    carrier_profile["behavior_classes"].append(finding)
                    carrier_profile["classification_basis_event_ids"].append(c_event_id)
            carrier_event = {
                "event_id": c_event_id,
                "claim_family_id": chain_id,
                "source_id": carrier_source_id,
                "event_type": e_type,
                "published_at": source_record.get("publication_date"),
                "first_observed_at": first_observed,
                "time_precision": precision,
                "epistemic_posture": epistemic_posture(claim),
                "exact_statement": f"{carrier_identity['display_name']} carried the attributed claim: {claim.get('exact_translated_claim')}",
                "translated_statement": None,
                "originating_claimant": claim.get("claimant"),
                "lineage_roles": ["REPORTS", "AMPLIFIES"],
                "carrier_profile_ids": [],
                "canonical_claim_refs": [str(claim_id)],
                "evidence_source_ids": [canonical_source_id],
                "contrary_evidence_source_ids": origin_event["contrary_evidence_source_ids"],
                "correction_state": origin_event["correction_state"],
                "behavior_findings": carrier_findings,
                "revenue_findings": [],
                "independently_sourced": False,
                "plain_english_verdict": plain_verdict(claim, authority),
            }
            events.append(carrier_event)
            merge_local_profile(profiles, carrier_profile)
            relationships.append({
                "relationship_id": relation_id(chain_id, rel_index),
                "from_id": c_event_id,
                "to_id": o_event_id,
                "relationship_type": "DERIVES_FROM",
                "evidence_source_ids": [canonical_source_id],
            })
            rel_index += 1
            relationships.append({
                "relationship_id": relation_id(chain_id, rel_index),
                "from_id": c_event_id,
                "to_id": origin_source_id,
                "relationship_type": "ATTRIBUTES_TO",
                "evidence_source_ids": [canonical_source_id],
            })
            rel_index += 1
        else:
            merge_local_profile(profiles, carrier_profile)

        previous_claim_id = claim.get("previous_claim_id")
        if previous_claim_id and str(previous_claim_id) in origin_event_by_claim:
            previous_event_id = origin_event_by_claim[str(previous_claim_id)]
            if is_mutation(claim):
                from_id, to_id, relationship_type = previous_event_id, o_event_id, "MUTATES_INTO"
            else:
                from_id, to_id, relationship_type = o_event_id, previous_event_id, "REPEATS"
            relationships.append({
                "relationship_id": relation_id(chain_id, rel_index),
                "from_id": from_id,
                "to_id": to_id,
                "relationship_type": relationship_type,
                "evidence_source_ids": [canonical_source_id],
            })
            rel_index += 1

    for profile in profiles.values():
        profile["canonical_source_ids"] = unique(profile.get("canonical_source_ids") or [])
        profile["behavior_classes"] = unique(profile.get("behavior_classes") or ["UNKNOWN"])
        if len(profile["behavior_classes"]) > 1 and "UNKNOWN" in profile["behavior_classes"]:
            profile["behavior_classes"].remove("UNKNOWN")
        profile["classification_basis_event_ids"] = unique(profile.get("classification_basis_event_ids") or [])

    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_LINEAGE_PACKET",
        "packet_id": f"WOL-PKT-{chain_id.removeprefix('CH-')}-BASELINE-20260920",
        "claim_family_id": chain_id,
        "as_of": AS_OF,
        "basis_paths": [
            CLAIMS_PATH,
            CHAIN_INDEX_PATH,
            SOURCE_REGISTRY_PATH,
            OUTLET_PROFILES_PATH,
            AUTHORITY_PATH,
            IDENTITY_MAP_PATH,
        ],
        "generation_mode": "BASELINE_FROM_EXISTING_FORENSIC_CORPUS",
        "notes": "Generated baseline lineage from the existing adjudicated forensic claim corpus. It preserves origin/carrier separation and canonical dispositions; it does not create new truth or knowledge findings.",
        "source_profiles": sorted(profiles.values(), key=lambda row: row["source_id"]),
        "information_events": sorted(events, key=lambda row: row["event_id"]),
        "relationships": sorted(relationships, key=lambda row: row["relationship_id"]),
        "promotion_flags": [],
    }


def expected_packets(root: Path) -> dict[Path, dict[str, Any]]:
    evolution = load_json(root, CLAIMS_PATH)
    chain_index = load_json(root, CHAIN_INDEX_PATH)
    registry = load_json(root, SOURCE_REGISTRY_PATH)
    load_json(root, OUTLET_PROFILES_PATH)  # fingerprinted basis; outlet identities are reviewed in config.
    authority = load_json(root, AUTHORITY_PATH)
    identity_map = load_json(root, IDENTITY_MAP_PATH)
    semantic_overlay = load_json(root, SEMANTIC_OVERLAY_PATH)
    semantic_handoff = load_json(root, SEMANTIC_HANDOFF_PATH)
    rook_handoff = load_json(root, ROOK_WOL_HANDOFF_PATH)

    claims = rows(evolution, "claims", "records")
    chains = rows(chain_index, "chains", "records")
    sources = rows(registry, "sources", "records")
    claims_by_id = {str(row["claim_id"]): row for row in claims}
    source_by_id = {str(row["source_id"]): row for row in sources}
    legacy_claim_ids = set(claims_by_id)
    indexed_chain_ids = {str(row["chain_id"]) for row in chains}
    extras_by_chain = current_overlay_extras(
        semantic_overlay,
        legacy_claim_ids,
        indexed_chain_ids,
    )

    output: dict[Path, dict[str, Any]] = {}
    for chain in chains:
        chain_id = str(chain["chain_id"])
        if chain_id in MANUAL_CHAIN_IDS or chain_id in RETIRED_LEGACY_CHAIN_IDS:
            continue
        path = root / PACKET_DIR / f"{slug(chain_id)}.json"
        packet = packet_for_chain(chain, claims_by_id, source_by_id, identity_map, authority)
        packet = merge_current_overlay_extras(
            packet,
            extras_by_chain.get(chain_id, []),
            identity_map,
            semantic_handoff,
            rook_handoff,
        )
        output[path] = packet
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    packets = expected_packets(root)

    if args.check:
        stale = []
        for path, expected in packets.items():
            if not path.is_file():
                stale.append(f"missing {path.relative_to(root)}")
                continue
            actual = json.loads(path.read_text(encoding="utf-8"))
            if actual != expected:
                stale.append(f"stale {path.relative_to(root)}")
        if stale:
            raise SystemExit("FAIL " + "; ".join(stale))
        print(
            f"web-of-lies baseline packets: PASS generated={len(packets)} "
            f"manual={len(MANUAL_CHAIN_IDS)} retired={len(RETIRED_LEGACY_CHAIN_IDS)}"
        )
        return 0

    for path, packet in packets.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(canonical_bytes(packet))
        print(f"wrote {path.relative_to(root)}")
    print(
        f"web-of-lies baseline packets: wrote generated={len(packets)} "
        f"manual={len(MANUAL_CHAIN_IDS)} retired={len(RETIRED_LEGACY_CHAIN_IDS)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
