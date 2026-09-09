#!/usr/bin/env python3
"""Apply the Sep. 9 ROOK evidence-completion handoff to Lie Ledger v2.

This is a forward-only evidentiary qualification layer. It does not change
ROOK's substantive analytical authority. It adds governed source objects,
resolves the four named evidence-completion blockers, preserves source/temporal
fidelity, and rebuilds v2 chains/metrics after atomic proposition completion.
"""
from __future__ import annotations

import copy
import json
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCE_REGISTRY = "data/lie-ledger-v2-evidence-sources-20260909.json"
COMPLETION_OVERLAY = "data/lie-ledger-v2-rook-evidence-completion-20260909.json"
AUTHORITY_PATH = "data/lie-ledger-v2-rook-authority.json"
COMPLETION_VERSION = "ROOK-EVIDENCE-COMPLETION-20260909-v1"
FALSY = {"FALSE", "MISLEADING"}


def load(root: Path, relative: str) -> Any:
    return json.loads((root / relative).read_text(encoding="utf-8"))


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def _source_wrapper(source: dict[str, Any]) -> dict[str, Any]:
    source = copy.deepcopy(source)
    source_id = str(source["source_id"])
    provenance = {
        "kind": "ROOK_LIE_LEDGER_EVIDENCE_COMPLETION_SOURCE",
        "path": SOURCE_REGISTRY,
        "completion_version": COMPLETION_VERSION,
    }
    return {
        "source_id": source_id,
        "record": source,
        "resolution": "ROOK_EVIDENCE_COMPLETION_CURRENT",
        "registry": None,
        "outlet_profile": None,
        "registry_status": "ROOK_EVIDENCE_COMPLETION_SOURCE",
        "provenance": [copy.deepcopy(provenance)],
        "variants": [{
            "variant_key": f"rook-evidence-completion:{source_id}",
            "record": copy.deepcopy(source),
            "provenance": copy.deepcopy(provenance),
        }],
        "field_conflicts": [],
        "revisions": [],
    }


def inject_sources(state: dict[str, Any], root: Path = ROOT) -> None:
    root = Path(root).resolve()
    registry = load(root, SOURCE_REGISTRY)
    if registry.get("artifact_role") != "LIE_LEDGER_V2_EVIDENCE_SOURCE_REGISTRY":
        raise ValueError("unexpected Lie Ledger evidence-source registry role")
    records = state.setdefault("sources", {}).setdefault("records", [])
    by_id = {str(item.get("source_id") or ""): item for item in records}
    for source in registry.get("sources") or []:
        source_id = str(source.get("source_id") or "")
        if not source_id:
            raise ValueError("ROOK evidence-completion source lacks source_id")
        existing = by_id.get(source_id)
        if existing:
            prior = unwrap(existing)
            prior_url = str(prior.get("url") or "")
            if prior_url and prior_url != str(source.get("url") or ""):
                raise ValueError(f"source collision for {source_id}")
            continue
        wrapped = _source_wrapper(source)
        records.append(wrapped)
        by_id[source_id] = wrapped


def _all_evidence_refs(record: dict[str, Any]) -> set[str]:
    refs = {
        ref
        for values in (record.get("evidence_support") or {}).values()
        for ref in values or []
        if isinstance(ref, str)
    }
    for indicator in record.get("knowledge_indicators") or []:
        refs.update(
            ref for ref in indicator.get("evidence_refs") or []
            if isinstance(ref, str)
        )
    for alternative in record.get("credible_alternatives") or []:
        refs.update(
            ref for ref in alternative.get("source_refs") or []
            if isinstance(ref, str)
        )
    return refs


def _finalize_record(raw: dict[str, Any], known_sources: set[str]) -> dict[str, Any]:
    record = copy.deepcopy(raw)
    record.setdefault("semantic_version", "2.0")
    record.setdefault("doctrine_version", "ROOK-20260909-1")
    record.setdefault("contract_version", "2026-09-09")
    record.setdefault(
        "contract_path",
        "docs/LIE_LEDGER_ANALYTICAL_AUTHORITY_AND_EVIDENCE_CONTRACT_20260909.md",
    )
    record.setdefault("lifecycle_status", "ACTIVE")
    record.setdefault("assessment_time", "2026-09-09")
    record.setdefault("parent_claim_instance_id", None)
    record.setdefault("parent_claim_id", None)
    record.setdefault("next_claim_id", None)
    record.setdefault("authority_status", "ROOK_ADJUDICATED")
    record.setdefault("publication_status", "PUBLIC_READY")
    record.setdefault("publication_blockers", [])
    record.setdefault("analytic_inference", record.get("comparative_assessment") or "")
    record.setdefault("observed_facts", [])
    record.setdefault("knowledge_indicators", [])
    record.setdefault("credible_alternatives", [])
    record.setdefault("falsifier", [])
    groups = (
        "what_was_said", "factual_baseline", "contemporaneous_state",
        "knowledge_access", "knowledge_indicators", "contrary_evidence",
        "corrections", "repetitions", "credible_alternative",
        "comparative_inference", "falsifier",
    )
    evidence = copy.deepcopy(record.get("evidence_support") or {})
    record["evidence_support"] = {
        group: list(dict.fromkeys(evidence.get(group) or []))
        for group in groups
    }
    refs = _all_evidence_refs(record)
    unresolved = sorted(refs - known_sources)
    if unresolved:
        raise ValueError(
            f"unresolved completion evidence for {record.get('claim_instance_id')}: "
            + ", ".join(unresolved)
        )
    record["source_ids"] = sorted(
        set(record.get("source_ids") or []) | refs
    )
    return record


def _matches(record: dict[str, Any], match: dict[str, Any]) -> bool:
    for key, expected in match.items():
        if key == "proposition_contains":
            if str(expected).casefold() not in str(record.get("proposition") or "").casefold():
                return False
        elif str(record.get(key) or "") != str(expected):
            return False
    return True


def _distinct_claim_instance_key(record: dict[str, Any]) -> str:
    return str(
        record.get("original_claim_id")
        or record.get("claim_id")
        or record.get("claim_instance_id")
    )


def metrics(records: list[dict[str, Any]], chain_count: int) -> dict[str, Any]:
    factual = Counter()
    knowledge = Counter()
    originations = amplifications = corrections = retractions = substitutions = media = 0
    unique_ids: set[str] = set()
    claim_instance_keys: set[str] = set()

    for record in records:
        if record.get("authority_status") != "ROOK_ADJUDICATED":
            continue
        claim_instance_keys.add(_distinct_claim_instance_key(record))
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
        if record.get("authority_status") == "ROOK_ADJUDICATED"
        and record.get("counts_as_unique_proposition")
        and record.get("truth_adjudication") in FALSY
    }
    resolved_unique = {
        str(record["proposition_id"])
        for record in records
        if record.get("authority_status") == "ROOK_ADJUDICATED"
        and record.get("counts_as_unique_proposition")
        and record.get("truth_adjudication") != "UNRESOLVED"
    }
    percentage = (
        round(100.0 * len(falsy_unique) / len(resolved_unique), 2)
        if resolved_unique else None
    )
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
                "numerator_definition": "Unique ROOK-adjudicated propositions classified FALSE or MISLEADING.",
                "denominator_definition": "Unique ROOK-adjudicated propositions with a resolved factual status; UNRESOLVED excluded.",
            }
        },
    }


def _rebuild_global_blockers(
    records: list[dict[str, Any]],
    authority: dict[str, Any],
    resolved_ids: set[str],
    lie_module: Any,
) -> list[dict[str, Any]]:
    blockers: list[dict[str, Any]] = []
    for item in authority.get("publication_blockers") or []:
        blocker_id = str(item.get("id") or "")
        if blocker_id in resolved_ids:
            continue
        blockers.append({
            "blocker_id": blocker_id or lie_module.stable("BLOCK", item.get("ruling")),
            "code": str(item.get("code") or "EVIDENCE_COMPLETION_REQUIRED"),
            "ruling": str(item.get("ruling") or ""),
            "deficiency": str(item.get("deficiency") or ""),
            "authority": "ROOK",
            "status": "OPEN",
        })
    for record in records:
        for blocker in record.get("publication_blockers") or []:
            blockers.append({
                "blocker_id": lie_module.stable(
                    "BLOCK",
                    record["claim_instance_id"],
                    blocker.get("code"),
                    blocker.get("deficiency"),
                ),
                "code": blocker.get("code"),
                "ruling": record.get("combined_assessment"),
                "deficiency": blocker.get("deficiency"),
                "claim_instance_id": record["claim_instance_id"],
                "authority": "PR/CI",
                "status": "OPEN",
            })
    return blockers


def apply(state: dict[str, Any], root: Path, lie_module: Any) -> None:
    root = Path(root).resolve()
    completion = load(root, COMPLETION_OVERLAY)
    if completion.get("authority") != "ROOK":
        raise ValueError("evidence-completion overlay is not ROOK-owned")
    if completion.get("handoff_version") != COMPLETION_VERSION:
        raise ValueError("unexpected evidence-completion version")
    known_sources = {
        str(item.get("source_id") or "")
        for item in (state.get("sources") or {}).get("records") or []
        if item.get("source_id")
    }
    entities = state.setdefault("entities", {})
    records = [copy.deepcopy(unwrap(item)) for item in entities.get("lie_ledger_v2") or []]

    for directive in completion.get("remove_v2_records") or []:
        match = directive.get("match") or {}
        before = len(records)
        records = [record for record in records if not _matches(record, match)]
        if len(records) == before:
            raise ValueError(f"completion removal matched no v2 record: {match}")

    for directive in completion.get("record_updates") or []:
        match = directive.get("match") or {}
        matched = [record for record in records if _matches(record, match)]
        if len(matched) != 1:
            raise ValueError(
                f"completion update expected one record for {match}; found {len(matched)}"
            )
        target = matched[0]
        target.update(copy.deepcopy(directive.get("fields") or {}))
        target["publication_blockers"] = []
        target["publication_status"] = "PUBLIC_READY"
        target["authority_status"] = "ROOK_ADJUDICATED"
        finalized = _finalize_record(target, known_sources)
        target.clear()
        target.update(finalized)

    existing_instances = {str(record.get("claim_instance_id")) for record in records}
    existing_props = {str(record.get("proposition_id")) for record in records}
    for raw in completion.get("supplemental_records") or []:
        record = _finalize_record(raw, known_sources)
        if record["claim_instance_id"] in existing_instances:
            raise ValueError(f"duplicate completed claim instance {record['claim_instance_id']}")
        if record["proposition_id"] in existing_props:
            raise ValueError(f"duplicate completed proposition {record['proposition_id']}")
        records.append(record)
        existing_instances.add(record["claim_instance_id"])
        existing_props.add(record["proposition_id"])

    tanf = [record for record in records if record.get("chain_id") == "CH-TANF-JUL17"]
    if len(tanf) != 3:
        raise ValueError(f"al-Tanf completion must contain exactly three atomic propositions; found {len(tanf)}")
    if len({_distinct_claim_instance_key(record) for record in tanf}) != 1:
        raise ValueError("al-Tanf atomic propositions must resolve to one originating claim instance")
    if sum(bool(record.get("counts_as_unique_proposition")) for record in tanf) != 3:
        raise ValueError("al-Tanf completion must count three unique atomic propositions")

    remains = next(
        (
            record for record in records
            if record.get("proposition_id")
            == "PROP-CSAR-US-REMAINS-EVIDENTIARY-PRESENTATION"
        ),
        None,
    )
    if not remains or "believed" not in str(remains.get("proposition") or "").casefold():
        raise ValueError("American-remains proposition lost the source hedge")

    chains = lie_module.build_chains(records)
    ledger_metrics = metrics(records, len(chains))
    resolved_ids = set(completion.get("resolved_blockers") or [])
    authority = load(root, AUTHORITY_PATH)
    global_blockers = _rebuild_global_blockers(
        records, authority, resolved_ids, lie_module
    )

    entities["lie_ledger_v2"] = [
        lie_module.wrap(record["claim_instance_id"], record)
        for record in records
    ]
    entities["lie_ledger_chains_v2"] = [
        lie_module.wrap(
            chain["chain_id"],
            {
                **chain,
                "source_ids": sorted({
                    source_id
                    for proposition in chain["proposition_records"]
                    for source_id in proposition.get("source_ids") or []
                }),
            },
        )
        for chain in chains
    ]
    state["lie_ledger_v2_metrics"] = ledger_metrics
    state["lie_ledger_v2_publication_blockers"] = global_blockers
    state.setdefault("lie_ledger_v2_authority", {}).update({
        "evidence_completion_version": COMPLETION_VERSION,
        "evidence_completion_path": COMPLETION_OVERLAY,
        "evidence_source_registry": SOURCE_REGISTRY,
        "resolved_publication_blockers": sorted(resolved_ids),
    })
    state.setdefault("release", {})["lie_ledger_evidence_completion_version"] = COMPLETION_VERSION
    state.setdefault("integrity", {}).update({
        "lie_ledger_evidence_completion_applied": True,
        "lie_ledger_evidence_sources_resolve": True,
        "lie_ledger_tanf_atomic_decomposition_complete": True,
        "lie_ledger_tanf_one_claim_three_propositions": True,
        "lie_ledger_remains_source_hedge_preserved": True,
        "lie_ledger_publication_blockers_open": bool(global_blockers),
    })
