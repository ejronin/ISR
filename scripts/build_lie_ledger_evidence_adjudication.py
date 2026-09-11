#!/usr/bin/env python3
"""Build the active Lie Ledger from tracked neutral evidence-adjudication records.

Production generation consumes a neutral adjudication set directly. Historical
Sep. 9 assessment/evidence handoffs remain repository provenance and migration-
audit inputs only; they are not replayed by this builder.
"""
from __future__ import annotations

import copy
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import canonical_temporal_contract as temporal

ROOT = Path(__file__).resolve().parents[1]
ADJUDICATION_PATH = "data/lie-ledger-v2-evidence-adjudications.json"
ADJUDICATION_VERSION = "ATLAS-EVIDENCE-ADJUDICATION-20260911-v1"
SOURCE_REGISTRY = "data/lie-ledger-v2-evidence-sources-20260909.json"
GOVERNANCE_VERSION = "ATLAS-EVIDENCE-20260910-1"
CONTRACT_VERSION = "2026-09-10"
CONTRACT_PATH = "docs/LIE_LEDGER_EVIDENCE_ADJUDICATION_CONTRACT.md"
ADJUDICATED = "EVIDENCE_ADJUDICATED"
FALSY = {"FALSE", "MISLEADING"}


def load(root: Path, relative: str) -> dict[str, Any]:
    return json.loads((root / relative).read_text(encoding="utf-8"))


def compact_digest(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def _source_wrapper(source: dict[str, Any], historical_completion_version: str | None) -> dict[str, Any]:
    source = copy.deepcopy(source)
    source_id = str(source["source_id"])
    provenance = {
        "kind": "LIE_LEDGER_EVIDENCE_COMPLETION_SOURCE",
        "path": SOURCE_REGISTRY,
        "completion_version": historical_completion_version,
        "historical_handoff": "ROOK",
    }
    return {
        "source_id": source_id,
        "record": source,
        "resolution": "EVIDENCE_COMPLETION_CURRENT",
        "registry": None,
        "outlet_profile": None,
        "registry_status": "HISTORICAL_EVIDENCE_COMPLETION_SOURCE",
        "provenance": [copy.deepcopy(provenance)],
        "variants": [{
            "variant_key": f"rook-evidence-completion:{source_id}",
            "record": copy.deepcopy(source),
            "provenance": copy.deepcopy(provenance),
        }],
        "field_conflicts": [],
        "revisions": [],
    }


def inject_sources(state: dict[str, Any], root: Path, payload: dict[str, Any]) -> None:
    registry_path = str(payload.get("source_registry") or SOURCE_REGISTRY)
    if registry_path != SOURCE_REGISTRY:
        raise ValueError(f"unexpected Lie Ledger evidence-source registry: {registry_path}")
    registry = load(root, registry_path)
    if registry.get("artifact_role") != "LIE_LEDGER_V2_EVIDENCE_SOURCE_REGISTRY":
        raise ValueError("unexpected Lie Ledger evidence-source registry role")
    historical = ((payload.get("migration_provenance") or {}).get("historical_inputs") or {})
    completion_version = historical.get("evidence_completion_version")
    records = state.setdefault("sources", {}).setdefault("records", [])
    by_id = {str(item.get("source_id") or ""): item for item in records}
    for source in registry.get("sources") or []:
        source_id = str(source.get("source_id") or "")
        if not source_id:
            raise ValueError("Lie Ledger evidence source lacks source_id")
        existing = by_id.get(source_id)
        if existing:
            prior = unwrap(existing)
            prior_url = str(prior.get("url") or "")
            if prior_url and prior_url != str(source.get("url") or ""):
                raise ValueError(f"source collision for {source_id}")
            continue
        wrapped = _source_wrapper(source, str(completion_version) if completion_version else None)
        records.append(wrapped)
        by_id[source_id] = wrapped


def evidence_refs(record: dict[str, Any]) -> set[str]:
    refs = {
        ref
        for values in (record.get("evidence_support") or {}).values()
        for ref in values or []
        if isinstance(ref, str)
    }
    for indicator in record.get("knowledge_indicators") or []:
        refs.update(ref for ref in indicator.get("evidence_refs") or [] if isinstance(ref, str))
    for alternative in record.get("credible_alternatives") or []:
        refs.update(ref for ref in alternative.get("source_refs") or [] if isinstance(ref, str))
    return refs


def claim_instance_key(record: dict[str, Any]) -> str:
    return str(
        record.get("original_claim_id")
        or record.get("claim_id")
        or record.get("claim_instance_id")
    )


def build_chains(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[str(record["chain_id"])].append(record)
    chains: list[dict[str, Any]] = []
    for chain_id, rows in sorted(grouped.items()):
        rows = sorted(rows, key=lambda row: (
            str((row.get("statement_time") or {}).get("date") or ""),
            str((row.get("statement_time") or {}).get("display_time") or ""),
            str(row.get("claim_instance_id") or ""),
        ))
        chains.append({
            "semantic_version": "2.0",
            "doctrine_version": rows[0]["doctrine_version"],
            "chain_id": chain_id,
            "narrative_family_id": rows[0].get("narrative_family_id"),
            "primary_object": "NARRATIVE_PROPOSITION_CHAIN",
            "claimants": sorted({row.get("actor") for row in rows if row.get("actor")}),
            "claim_instance_ids": [row["claim_instance_id"] for row in rows],
            "proposition_ids": sorted({row["proposition_id"] for row in rows}),
            "chronology": [{
                "claim_instance_id": row["claim_instance_id"],
                "statement_time": copy.deepcopy(row.get("statement_time")),
                "relation_type": row.get("relation_type"),
                "actor_role": row.get("actor_role"),
                "truth_adjudication": row.get("truth_adjudication"),
                "knowledge_judgment": row.get("knowledge_judgment"),
                "combined_assessment": row.get("combined_assessment"),
                "publication_status": row.get("publication_status"),
            } for row in rows],
            "proposition_records": copy.deepcopy(rows),
            "publication_blockers": [
                {"claim_instance_id": row["claim_instance_id"], **copy.deepcopy(blocker)}
                for row in rows
                for blocker in row.get("publication_blockers") or []
            ],
        })
    return chains


def metrics(records: list[dict[str, Any]], chain_count: int) -> dict[str, Any]:
    factual = Counter()
    knowledge = Counter()
    unique_ids: set[str] = set()
    claim_instance_keys: set[str] = set()
    originations = amplifications = corrections = retractions = substitutions = media = 0
    for record in records:
        if record.get("adjudication_status") != ADJUDICATED:
            continue
        claim_instance_keys.add(claim_instance_key(record))
        factual[record["truth_adjudication"]] += 1
        knowledge[record["knowledge_judgment"]] += 1
        relation = record.get("relation_type")
        if relation in {"ORIGINATION", "STANDALONE"}:
            originations += 1
        elif relation in {"REPETITION", "AMPLIFICATION"}:
            amplifications += 1
        elif relation == "CORRECTION":
            corrections += 1
        elif relation == "RETRACTION":
            retractions += 1
        elif relation == "NARRATIVE_SUBSTITUTION":
            substitutions += 1
        if record.get("denominator_class") == "MEDIA_ARTIFACT":
            media += 1
        if record.get("counts_as_unique_proposition"):
            unique_ids.add(str(record["proposition_id"]))
    falsy_unique = {
        str(record["proposition_id"])
        for record in records
        if record.get("adjudication_status") == ADJUDICATED
        and record.get("counts_as_unique_proposition")
        and record.get("truth_adjudication") in FALSY
    }
    resolved_unique = {
        str(record["proposition_id"])
        for record in records
        if record.get("adjudication_status") == ADJUDICATED
        and record.get("counts_as_unique_proposition")
        and record.get("truth_adjudication") != "UNRESOLVED"
    }
    percentage = round(100.0 * len(falsy_unique) / len(resolved_unique), 2) if resolved_unique else None
    return {
        "unique_propositions": len(unique_ids),
        "claim_instances": len(claim_instance_keys),
        "originations": originations,
        "amplifications": amplifications,
        "corrections": corrections,
        "retractions": retractions,
        "narrative_substitutions": substitutions,
        "media_artifacts": media,
        "narrative_chains": chain_count,
        "factual_status_totals": dict(sorted(factual.items())),
        "knowledge_assessment_totals": dict(sorted(knowledge.items())),
        "percentages": {
            "falsy_share_of_resolved_unique_propositions": {
                "numerator": len(falsy_unique),
                "denominator": len(resolved_unique),
                "percentage": percentage,
                "numerator_definition": "Unique evidence-adjudicated propositions classified FALSE or MISLEADING.",
                "denominator_definition": "Unique evidence-adjudicated propositions with a resolved factual status; UNRESOLVED excluded.",
            }
        },
    }


def wrap(entity_id: str, record: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    historical = ((payload.get("migration_provenance") or {}).get("historical_inputs") or {})
    return {
        "entity_id": entity_id,
        "record": record,
        "source_ids": sorted(set(record.get("source_ids") or [])),
        "provenance": [{
            "kind": "LIE_LEDGER_V2_EVIDENCE_ADJUDICATION",
            "adjudication_path": ADJUDICATION_PATH,
            "adjudication_version": payload.get("adjudication_version"),
            "contract_path": CONTRACT_PATH,
            "historical_assessment_path": historical.get("assessment_path"),
            "role": "ACTIVE_EVIDENCE_ADJUDICATION",
        }],
    }


def validate_payload(state: dict[str, Any], payload: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if payload.get("artifact_role") != "LIE_LEDGER_V2_EVIDENCE_ADJUDICATION_SET":
        raise ValueError("unexpected Lie Ledger evidence-adjudication artifact role")
    if payload.get("adjudication_version") != ADJUDICATION_VERSION:
        raise ValueError("unexpected Lie Ledger adjudication version")
    if payload.get("governance_version") != GOVERNANCE_VERSION:
        raise ValueError("Lie Ledger adjudication governance version mismatch")
    if payload.get("contract_version") != CONTRACT_VERSION or payload.get("contract_path") != CONTRACT_PATH:
        raise ValueError("Lie Ledger adjudication contract mismatch")
    if payload.get("adjudication_basis") != "EVIDENCE_AND_ACCEPTED_ASSESSMENT":
        raise ValueError("Lie Ledger adjudication basis is not evidence-backed")

    provenance = payload.get("migration_provenance") or {}
    records = copy.deepcopy(payload.get("records") or [])
    blockers = copy.deepcopy(payload.get("publication_blockers") or [])
    if compact_digest(records) != provenance.get("neutral_record_set_sha256"):
        raise ValueError("Lie Ledger neutral record-set fingerprint mismatch")
    if compact_digest(blockers) != provenance.get("neutral_blocker_set_sha256"):
        raise ValueError("Lie Ledger neutral blocker-set fingerprint mismatch")
    if len(records) != int(payload.get("record_count") or 0):
        raise ValueError("Lie Ledger neutral record count mismatch")

    artifact_cutoff_raw = payload.get("evidence_cutoff")
    current_cutoff_raw = (state.get("release") or {}).get("current_osint_cutoff")
    artifact_cutoff = temporal.parse_datetime(artifact_cutoff_raw, "Lie Ledger adjudication evidence cutoff")
    current_cutoff = temporal.parse_datetime(current_cutoff_raw, "canonical current evidence cutoff")
    if artifact_cutoff > current_cutoff:
        raise ValueError("Lie Ledger adjudication cutoff is later than canonical current cutoff")
    anchor = [
        row for row in state.get("accepted_updates_v2") or []
        if row.get("packet_id") == "UPD-20260909-CATCHUP"
    ]
    if len(anchor) != 1 or anchor[0].get("evidence_cutoff") != artifact_cutoff_raw:
        raise ValueError("Lie Ledger adjudication set lacks its accepted Sep. 9 evidence anchor")

    known_sources = {
        str(item.get("source_id") or "")
        for item in (state.get("sources") or {}).get("records") or []
        if item.get("source_id")
    }
    seen_instances: set[str] = set()
    for record in records:
        instance = str(record.get("claim_instance_id") or "")
        if not instance or instance in seen_instances:
            raise ValueError(f"Lie Ledger adjudication claim-instance identity invalid or duplicated: {instance!r}")
        seen_instances.add(instance)
        if "authority_status" in record:
            raise ValueError(f"neutral adjudication record retained authority_status: {instance}")
        if record.get("adjudication_status") not in {ADJUDICATED, "LEGACY_NORMALIZED_NOT_REASSESSED"}:
            raise ValueError(f"neutral adjudication status invalid: {instance}")
        if record.get("doctrine_version") != GOVERNANCE_VERSION:
            raise ValueError(f"neutral adjudication governance mismatch: {instance}")
        if record.get("contract_version") != CONTRACT_VERSION or record.get("contract_path") != CONTRACT_PATH:
            raise ValueError(f"neutral adjudication contract mismatch: {instance}")
        unresolved = sorted(evidence_refs(record) - known_sources)
        if unresolved:
            raise ValueError(f"unresolved Lie Ledger evidence refs for {instance}: {unresolved}")
        for blocker in record.get("publication_blockers") or []:
            if "authority" in blocker or "historical_owner" in blocker:
                raise ValueError(f"neutral adjudication blocker retained persona ownership: {instance}")
    if any("authority" in blocker or "historical_owner" in blocker for blocker in blockers):
        raise ValueError("neutral global blocker retained persona ownership")
    return records, blockers


def apply(state: dict[str, Any], root: Path = ROOT) -> dict[str, Any]:
    root = Path(root).resolve()
    payload = load(root, ADJUDICATION_PATH)
    inject_sources(state, root, payload)
    records, blockers = validate_payload(state, payload)
    chains = build_chains(records)
    derived_metrics = metrics(records, len(chains))
    if derived_metrics != payload.get("expected_metrics"):
        raise ValueError("Lie Ledger derived metrics differ from the neutral adjudication set")
    if compact_digest(derived_metrics) != (payload.get("migration_provenance") or {}).get("neutral_metric_sha256"):
        raise ValueError("Lie Ledger metric fingerprint mismatch")

    entities = state.setdefault("entities", {})
    entities["lie_ledger_v2"] = [
        wrap(record["claim_instance_id"], copy.deepcopy(record), payload)
        for record in records
    ]
    entities["lie_ledger_chains_v2"] = [
        wrap(
            chain["chain_id"],
            {
                **chain,
                "source_ids": sorted({
                    source_id
                    for proposition in chain["proposition_records"]
                    for source_id in proposition.get("source_ids") or []
                }),
            },
            payload,
        )
        for chain in chains
    ]
    state["lie_ledger_v2_metrics"] = derived_metrics
    state["lie_ledger_v2_publication_blockers"] = blockers

    historical = copy.deepcopy((payload.get("migration_provenance") or {}).get("historical_inputs") or {})
    state["lie_ledger_v2_governance"] = {
        "semantic_version": "2.0",
        "governance_version": GOVERNANCE_VERSION,
        "contract_version": CONTRACT_VERSION,
        "contract_path": CONTRACT_PATH,
        "adjudication_basis": "EVIDENCE_AND_ACCEPTED_ASSESSMENT",
        "implementation_model": "DETERMINISTIC_BUILDER",
        "blocked_assessment_policy": "WITHHOLD_UNQUALIFIED_KNOWLEDGE_NOT_FACTUAL_STATUS",
        "active_adjudication_path": ADJUDICATION_PATH,
        "adjudication_version": ADJUDICATION_VERSION,
        "historical_inputs": historical,
    }

    release = state.setdefault("release", {})
    release["lie_ledger_governance_version"] = GOVERNANCE_VERSION
    release["lie_ledger_contract_version"] = CONTRACT_VERSION
    release["lie_ledger_contract_path"] = CONTRACT_PATH
    release["lie_ledger_adjudication_version"] = ADJUDICATION_VERSION
    release["lie_ledger_evidence_completion_version"] = historical.get("evidence_completion_version")
    release["lie_ledger_current_claim_update_version"] = historical.get("current_claim_update_version")
    release["lie_ledger_historical_assessment"] = {
        "doctrine_version": historical.get("assessment_version"),
        "contract_version": historical.get("assessment_contract_version"),
        "contract_path": historical.get("assessment_contract_path"),
        "evidence_completion_version": historical.get("evidence_completion_version"),
        "current_claim_update_version": historical.get("current_claim_update_version"),
    }

    counts = state.setdefault("counts", {})
    counts["lie_ledger_v2_records"] = len(records)
    counts["lie_ledger_v2_chains"] = len(chains)
    counts["lie_ledger_v2_unique_propositions"] = derived_metrics["unique_propositions"]
    counts["lie_ledger_v2_claim_instances"] = derived_metrics["claim_instances"]
    counts["lie_ledger_v2_publication_blockers"] = len(blockers)

    state.setdefault("integrity", {}).update({
        "lie_ledger_v1_preserved_as_provenance": True,
        "lie_ledger_v2_forward_migration_active": True,
        "lie_ledger_truth_knowledge_axes_separate": True,
        "lie_ledger_component_evidence_refs_active": True,
        "lie_ledger_publication_blockers_open": bool(blockers),
        "lie_ledger_evidence_completion_applied": True,
        "lie_ledger_evidence_sources_resolve": True,
        "lie_ledger_tanf_atomic_decomposition_complete": True,
        "lie_ledger_tanf_one_claim_three_propositions": True,
        "lie_ledger_remains_source_hedge_preserved": True,
        "lie_ledger_current_claim_update_applied": True,
        "lie_ledger_current_claim_update_public_ready": True,
        "lie_ledger_current_claim_update_uses_existing_v2_contract": True,
        "lie_ledger_active_persona_authority_removed": True,
        "lie_ledger_historical_assessment_provenance_preserved": True,
        "lie_ledger_builder_preserves_accepted_adjudications": True,
        "lie_ledger_active_adjudication_input_neutral": True,
        "lie_ledger_historical_replay_not_required_for_production": True,
    })
    return state
