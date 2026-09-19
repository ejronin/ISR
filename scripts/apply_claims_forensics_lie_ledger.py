#!/usr/bin/env python3
"""Apply the active Claims Forensics semantic overlay to the Lie Ledger.

The historical evidence-adjudication artifact remains immutable and is validated
first by build_lie_ledger_evidence_adjudication.py. This pass applies later
Claims Forensics rulings, chain metadata, polarity corrections, and public
reasoning without rewriting the sealed historical input.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OVERLAY_PATH = "data/claims-forensics/lie-ledger-semantic-overlay-20260919.json"
EXPECTED_ROLE = "CLAIMS_FORENSICS_LIE_LEDGER_SEMANTIC_OVERLAY"
EXPECTED_AUTHORITY = "INFORMATION_CLAIMS_AND_FORENSIC_ADJUDICATION"
EXPECTED_CONTRACT = "docs/LIE_LEDGER_LOGIC_AUTHORITY_CONTRACT.md"


def load(root: Path, relative: str) -> dict[str, Any]:
    return json.loads((root / relative).read_text(encoding="utf-8"))


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def _validated_overlay(root: Path) -> dict[str, Any]:
    overlay = load(root, OVERLAY_PATH)
    if overlay.get("artifact_role") != EXPECTED_ROLE:
        raise ValueError("unexpected Claims Forensics Lie Ledger overlay role")
    if overlay.get("authority") != EXPECTED_AUTHORITY:
        raise ValueError("Claims Forensics overlay authority mismatch")
    if overlay.get("contract_path") != EXPECTED_CONTRACT:
        raise ValueError("Claims Forensics overlay contract mismatch")
    if not overlay.get("overlay_version"):
        raise ValueError("Claims Forensics overlay lacks overlay_version")

    sweep_path = str(overlay.get("full_sweep_path") or "")
    sweep_version = str(overlay.get("full_sweep_version") or "")
    if not sweep_path or not sweep_version:
        raise ValueError("Claims Forensics overlay lacks full-sweep provenance")
    sweep = load(root, sweep_path)
    if sweep.get("artifact_role") != "CLAIMS_FORENSICS_FULL_LEDGER_SWEEP":
        raise ValueError("Claims Forensics full-sweep artifact role mismatch")
    if sweep.get("authority") != EXPECTED_AUTHORITY:
        raise ValueError("Claims Forensics full-sweep authority mismatch")
    if sweep.get("contract_path") != EXPECTED_CONTRACT:
        raise ValueError("Claims Forensics full-sweep contract mismatch")
    if sweep.get("sweep_version") != sweep_version:
        raise ValueError("Claims Forensics full-sweep version pin mismatch")
    return overlay


def _apply_record_overrides(
    records: list[dict[str, Any]],
    overlay: dict[str, Any],
) -> list[dict[str, Any]]:
    by_instance = {
        str(record.get("claim_instance_id") or ""): record
        for record in records
        if record.get("claim_instance_id")
    }

    seen: set[str] = set()
    for patch in overlay.get("record_overrides") or []:
        instance = str(patch.get("claim_instance_id") or "")
        if not instance:
            raise ValueError("Claims Forensics record override lacks claim_instance_id")
        if instance in seen:
            raise ValueError(f"duplicate Claims Forensics override: {instance}")
        seen.add(instance)

        record = by_instance.get(instance)
        if record is None:
            raise ValueError(f"Claims Forensics override target not found: {instance}")

        for key, value in (patch.get("set") or {}).items():
            record[key] = copy.deepcopy(value)

        if "replace_observed_facts" in patch:
            facts = [
                str(value).strip()
                for value in patch.get("replace_observed_facts") or []
                if str(value).strip()
            ]
            if not facts:
                raise ValueError(f"empty replacement observed_facts for {instance}")
            record["observed_facts"] = facts

        if patch.get("rationale"):
            record["claims_forensics_rationale"] = str(patch["rationale"])
        record["claims_forensics_overlay_version"] = overlay["overlay_version"]

    return records


def _append_claims_forensics_records(
    records: list[dict[str, Any]],
    overlay: dict[str, Any],
) -> list[dict[str, Any]]:
    appends = overlay.get("append_records") or []
    if not appends:
        return records

    if not records:
        raise ValueError("cannot append Claims Forensics records without a baseline template")

    template = records[0]
    existing_instances = {
        str(record.get("claim_instance_id") or "")
        for record in records
        if record.get("claim_instance_id")
    }

    support_keys = (
        "what_was_said",
        "factual_baseline",
        "contemporaneous_state",
        "knowledge_access",
        "knowledge_indicators",
        "contrary_evidence",
        "corrections",
        "repetitions",
        "credible_alternative",
        "comparative_inference",
        "falsifier",
    )

    for raw in appends:
        instance = str(raw.get("claim_instance_id") or "")
        if not instance:
            raise ValueError("Claims Forensics appended record lacks claim_instance_id")
        if instance in existing_instances:
            raise ValueError(f"duplicate Claims Forensics appended record: {instance}")

        source_ids = [str(value) for value in raw.get("source_ids") or [] if str(value)]
        evidence_support = {
            key: [str(value) for value in (raw.get("evidence_support") or {}).get(key) or [] if str(value)]
            for key in support_keys
        }
        if not evidence_support["what_was_said"]:
            evidence_support["what_was_said"] = list(source_ids)

        claim_id = str(raw.get("claim_id") or instance)
        original_claim_id = str(raw.get("original_claim_id") or claim_id)
        statement_date = str(raw.get("statement_date") or raw.get("event_time") or "")
        if not statement_date:
            raise ValueError(f"appended record lacks statement_date/event_time: {instance}")

        record = {
            "semantic_version": template.get("semantic_version", "2.0"),
            "doctrine_version": template.get("doctrine_version"),
            "contract_version": template.get("contract_version"),
            "contract_path": template.get("contract_path"),
            "claim_id": claim_id,
            "claim_instance_id": instance,
            "original_claim_id": original_claim_id,
            "proposition_id": str(raw.get("proposition_id") or f"PROP-{instance}"),
            "chain_id": str(raw.get("chain_id") or ""),
            "narrative_family_id": raw.get("narrative_family_id"),
            "actor": str(raw.get("actor") or "Unknown claimant"),
            "claimant_type": str(raw.get("claimant_type") or "UNRESOLVED"),
            "actor_role": str(raw.get("actor_role") or "ORIGINATOR"),
            "claim": str(raw.get("claim") or raw.get("proposition") or ""),
            "source_proposition": str(raw.get("source_proposition") or raw.get("proposition") or ""),
            "proposition": str(raw.get("proposition") or ""),
            "proposition_axis": str(raw.get("proposition_axis") or "FACTUAL_ASSERTION"),
            "proposition_fidelity": str(raw.get("proposition_fidelity") or "SOURCE_EQUIVALENT"),
            "truth_adjudication": str(raw.get("truth_adjudication") or "UNRESOLVED"),
            "truth_qualifier": raw.get("truth_qualifier"),
            "lifecycle_status": str(raw.get("lifecycle_status") or "ACTIVE"),
            "knowledge_judgment": str(raw.get("knowledge_judgment") or "NOT_ASSESSABLE"),
            "combined_assessment": str(raw.get("combined_assessment") or "UNRESOLVED — KNOWLEDGE NOT ASSESSABLE"),
            "denominator_class": str(raw.get("denominator_class") or "UNIQUE_ATOMIC_PROPOSITION"),
            "counts_as_unique_proposition": bool(raw.get("counts_as_unique_proposition", True)),
            "observed_facts": [
                str(value).strip()
                for value in raw.get("observed_facts") or []
                if str(value).strip()
            ],
            "analytic_inference": str(raw.get("analytic_inference") or ""),
            "knowledge_indicators": copy.deepcopy(raw.get("knowledge_indicators") or []),
            "credible_alternatives": copy.deepcopy(raw.get("credible_alternatives") or []),
            "comparative_assessment": str(raw.get("comparative_assessment") or "No stronger knowledge inference is made on the accepted record."),
            "narrative_function": str(raw.get("narrative_function") or "Current claim-domain intake."),
            "confidence": str(raw.get("confidence") or "MODERATE"),
            "falsifier": [
                str(value).strip()
                for value in raw.get("falsifier") or []
                if str(value).strip()
            ],
            "evidence_support": evidence_support,
            "source_ids": source_ids,
            "statement_time": {
                "date": statement_date,
                "display_time": raw.get("display_time"),
                "precision": str(raw.get("statement_precision") or "DATE_ONLY"),
            },
            "event_time": str(raw.get("event_time") or statement_date),
            "knowledge_time": str(raw.get("knowledge_time") or overlay.get("effective_date") or statement_date),
            "assessment_time": str(raw.get("assessment_time") or overlay.get("effective_date") or statement_date),
            "relation_type": str(raw.get("relation_type") or "ORIGINATION"),
            "parent_claim_instance_id": raw.get("parent_claim_instance_id"),
            "parent_claim_id": raw.get("parent_claim_id"),
            "next_claim_id": raw.get("next_claim_id"),
            "adjudication_status": str(raw.get("adjudication_status") or "EVIDENCE_ADJUDICATED"),
            "publication_status": str(raw.get("publication_status") or "PUBLIC_READY"),
            "publication_blockers": copy.deepcopy(raw.get("publication_blockers") or []),
            "claims_forensics_overlay_version": overlay["overlay_version"],
            "claims_forensics_rationale": str(raw.get("rationale") or "Accepted post-cutoff claim-domain intake."),
        }

        required_text = (
            "chain_id",
            "claim",
            "source_proposition",
            "proposition",
            "analytic_inference",
        )
        for key in required_text:
            if not str(record.get(key) or "").strip():
                raise ValueError(f"appended record {instance} lacks {key}")
        if not record["observed_facts"]:
            raise ValueError(f"appended record {instance} lacks observed_facts")
        if not record["falsifier"]:
            raise ValueError(f"appended record {instance} lacks falsifier")

        records.append(record)
        existing_instances.add(instance)

    return records


def _build_chain_logic_graph(chain: dict[str, Any]) -> dict[str, Any]:
    """Build a deterministic, public-safe logic graph from canonical claim records.

    The graph never invents a causal relationship. It exposes only relationships
    already encoded in the records plus evidence-component membership. Detailed
    prose remains in the proposition records; this object makes the route from
    claim -> evidence -> factual/knowledge finding machine reconstructable.
    """
    records = chain.get("proposition_records") or []
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    node_ids: set[str] = set()
    edge_keys: set[tuple[str, str, str]] = set()

    def add_node(node: dict[str, Any]) -> None:
        node_id = str(node.get("id") or "")
        if node_id and node_id not in node_ids:
            node_ids.add(node_id)
            nodes.append(node)

    def add_edge(source: str, target: str, relation: str) -> None:
        if not source or not target or source == target:
            return
        key = (source, target, relation)
        if key in edge_keys:
            return
        edge_keys.add(key)
        edges.append({
            "id": f"EDGE-{len(edges) + 1:04d}",
            "source": source,
            "target": target,
            "relation": relation,
        })

    by_instance: dict[str, str] = {}
    by_claim: dict[str, str] = {}
    ordered_claim_nodes: list[str] = []

    for record in records:
        instance = str(record.get("claim_instance_id") or "")
        if not instance:
            continue
        node_id = f"CLAIM-{instance}"
        ordered_claim_nodes.append(node_id)
        by_instance[instance] = node_id
        for key in (
            record.get("claim_id"),
            record.get("original_claim_id"),
        ):
            if key and str(key) not in by_claim:
                by_claim[str(key)] = node_id

        publication = str(record.get("publication_status") or "")
        public_knowledge = (
            record.get("knowledge_judgment")
            if publication == "PUBLIC_READY"
            else "WITHHELD_PENDING_EVIDENCE"
        )
        add_node({
            "id": node_id,
            "type": "ATOMIC_PROPOSITION",
            "claim_instance_id": instance,
            "proposition_id": record.get("proposition_id"),
            "actor": record.get("actor"),
            "statement_time": copy.deepcopy(record.get("statement_time")),
            "relation_type": record.get("relation_type"),
            "truth_finding": record.get("truth_adjudication"),
            "knowledge_finding": public_knowledge,
            "publication_status": publication,
        })

        source_ids = sorted({
            str(source_id)
            for source_id in record.get("source_ids") or []
            if source_id
        })
        support = record.get("evidence_support") or {}
        buckets = {
            "what_was_said": "DOCUMENTS_CLAIM_TEXT",
            "factual_baseline": "SUPPORTS_FACTUAL_BASELINE",
            "contemporaneous_state": "SUPPORTS_CONTEMPORANEOUS_STATE",
            "contrary_evidence": "CONTRADICTS_OR_LIMITS_PROPOSITION",
            "corrections": "DOCUMENTS_CORRECTION",
            "repetitions": "DOCUMENTS_REPETITION",
            "knowledge_access": "SUPPORTS_KNOWLEDGE_ACCESS",
            "knowledge_indicators": "SUPPORTS_KNOWLEDGE_INFERENCE",
            "comparative_inference": "SUPPORTS_COMPARATIVE_INFERENCE",
            "credible_alternative": "SUPPORTS_CREDIBLE_ALTERNATIVE",
            "falsifier": "SUPPORTS_FALSIFIER",
        }
        for source_id in source_ids:
            add_node({"id": f"SOURCE-{source_id}", "type": "SOURCE", "source_id": source_id})
        for bucket, relation in buckets.items():
            for source_id in support.get(bucket) or []:
                source_node = f"SOURCE-{source_id}"
                add_node({"id": source_node, "type": "SOURCE", "source_id": source_id})
                add_edge(source_node, node_id, relation)

    # Only encode relationship edges already present in the record model.
    for index, record in enumerate(records):
        instance = str(record.get("claim_instance_id") or "")
        current = by_instance.get(instance)
        if not current:
            continue
        parent = None
        if record.get("parent_claim_instance_id"):
            parent = by_instance.get(str(record.get("parent_claim_instance_id")))
        if parent is None and record.get("parent_claim_id"):
            parent = by_claim.get(str(record.get("parent_claim_id")))
        relation = str(record.get("relation_type") or "")
        if parent and relation:
            add_edge(parent, current, relation)
        elif relation in {"REPETITION", "AMPLIFICATION", "CORRECTION", "RETRACTION", "NARRATIVE_SUBSTITUTION"} and index > 0:
            # Some legacy rows carry relation semantics but no explicit parent.
            # In that bounded case, link only to the immediately prior node in
            # the already-ordered chain and mark the provenance of that fallback.
            previous = ordered_claim_nodes[index - 1]
            add_edge(previous, current, f"{relation}_TO_PRIOR_CHAIN_NODE")

    return {
        "schema_version": "1.0",
        "graph_type": "CLAIM_EVIDENCE_ADJUDICATION",
        "chain_id": chain.get("chain_id"),
        "nodes": nodes,
        "edges": edges,
        "claim_node_count": len(ordered_claim_nodes),
        "source_node_count": len([node for node in nodes if node.get("type") == "SOURCE"]),
        "generation_rule": "DETERMINISTIC_FROM_CANONICAL_CLAIM_AND_EVIDENCE_RELATIONSHIPS",
    }


def _apply_chain_overrides(
    chains: list[dict[str, Any]],
    overlay: dict[str, Any],
) -> list[dict[str, Any]]:
    overrides = overlay.get("chain_overrides") or {}
    chain_ids = {str(chain.get("chain_id") or "") for chain in chains}
    missing = sorted(set(overrides) - chain_ids)
    if missing:
        raise ValueError(f"Claims Forensics chain override targets missing chains: {missing}")

    for chain in chains:
        chain_id = str(chain.get("chain_id") or "")
        patch = overrides.get(chain_id)
        if not patch:
            continue
        for key, value in patch.items():
            chain[key] = copy.deepcopy(value)
        chain["claims_forensics_overlay_version"] = overlay["overlay_version"]

        if chain.get("public_finding") and not (
            chain.get("plain_english_summary") and chain.get("how_we_know")
        ):
            raise ValueError(
                f"public chain finding lacks plain-English reasoning: {chain_id}"
            )

    family_overrides = overlay.get("narrative_family_overrides") or {}
    for legacy_chain_id, patch in family_overrides.items():
        for chain in chains:
            if str(chain.get("chain_id") or "") == legacy_chain_id:
                chain["narrative_family_correction"] = copy.deepcopy(patch)
                chain["claims_forensics_overlay_version"] = overlay["overlay_version"]
                break

    for chain in chains:
        records = chain.get("proposition_records") or []
        chain["claim_nodes"] = [
            record.get("claim_instance_id")
            for record in records
            if record.get("claim_instance_id")
        ]
        chain["participants"] = sorted({
            str(record.get("actor"))
            for record in records
            if record.get("actor")
        })
        chain.setdefault(
            "event_title",
            chain.get("public_title") or chain.get("title") or chain.get("chain_id"),
        )
        statement_dates = sorted({
            str((record.get("statement_time") or {}).get("date") or record.get("event_time") or "")
            for record in records
            if (record.get("statement_time") or {}).get("date") or record.get("event_time")
        })
        if statement_dates:
            chain.setdefault("event_time", {
                "start": statement_dates[0],
                "end": statement_dates[-1],
            })

        derived_gaps = [
            {
                "claim_instance_id": record.get("claim_instance_id"),
                "needed_evidence": copy.deepcopy(record.get("falsifier") or []),
            }
            for record in records
            if record.get("truth_adjudication") == "UNRESOLVED"
            or record.get("publication_status") == "BLOCKED_EVIDENCE_COMPLETION"
        ]
        if chain.get("open_evidence_gaps"):
            chain["derived_open_evidence_gaps"] = derived_gaps
        else:
            chain["open_evidence_gaps"] = derived_gaps

        chain["logic_graph"] = _build_chain_logic_graph(chain)

    return chains


def _active_publication_blockers(
    records: list[dict[str, Any]],
    historical_blockers: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Project the sealed historical blocker registry onto active adjudications.

    The sealed artifact is provenance and remains unchanged on disk. Once the
    Claims Forensics overlay changes a proposition's publication status or
    knowledge ruling, the generated current state must not continue advertising
    a historical blocker that no longer applies.
    """
    active_keys = {
        (
            str(record.get("claim_instance_id") or ""),
            str(blocker.get("code") or ""),
            str(blocker.get("deficiency") or ""),
        )
        for record in records
        if record.get("publication_status") == "BLOCKED_EVIDENCE_COMPLETION"
        for blocker in record.get("publication_blockers") or []
    }
    current = [
        copy.deepcopy(blocker)
        for blocker in historical_blockers
        if (
            str(blocker.get("claim_instance_id") or ""),
            str(blocker.get("code") or ""),
            str(blocker.get("deficiency") or ""),
        ) in active_keys
    ]
    represented = {
        (
            str(blocker.get("claim_instance_id") or ""),
            str(blocker.get("code") or ""),
            str(blocker.get("deficiency") or ""),
        )
        for blocker in current
    }
    missing = sorted(active_keys - represented)
    if missing:
        raise ValueError(
            "Claims Forensics active blocker lacks sealed blocker provenance: "
            f"{missing}"
        )
    return current


def apply(state: dict[str, Any], root: Path = ROOT) -> dict[str, Any]:
    # Import lazily so the sealed baseline pipeline remains independently usable.
    import build_lie_ledger_evidence_adjudication as baseline

    root = Path(root).resolve()
    overlay = _validated_overlay(root)

    entities = state.setdefault("entities", {})
    wrapped_records = entities.get("lie_ledger_v2") or []
    if not wrapped_records:
        raise ValueError("Claims Forensics overlay requires baseline Lie Ledger entities")

    records = [copy.deepcopy(unwrap(item)) for item in wrapped_records]
    records = _apply_record_overrides(records, overlay)
    records = _append_claims_forensics_records(records, overlay)

    historical_global_blockers = copy.deepcopy(
        state.get("lie_ledger_v2_publication_blockers") or []
    )
    active_global_blockers = _active_publication_blockers(
        records,
        historical_global_blockers,
    )

    # Preserve all existing evidence references and reject any overlay that breaks
    # source resolution after proposition correction.
    known_sources = {
        str(item.get("source_id") or "")
        for item in (state.get("sources") or {}).get("records") or []
        if item.get("source_id")
    }
    for record in records:
        unresolved = sorted(baseline.evidence_refs(record) - known_sources)
        if unresolved:
            raise ValueError(
                f"Claims Forensics override leaves unresolved evidence refs for "
                f"{record.get('claim_instance_id')}: {unresolved}"
            )

    chains = _apply_chain_overrides(baseline.build_chains(records), overlay)
    metrics = baseline.metrics(records, len(chains))
    baseline_payload = baseline.load(root, baseline.ADJUDICATION_PATH)

    def wrap_record(record: dict[str, Any]) -> dict[str, Any]:
        wrapped = baseline.wrap(
            str(record["claim_instance_id"]),
            copy.deepcopy(record),
            baseline_payload,
        )
        wrapped.setdefault("provenance", []).append({
            "kind": "CLAIMS_FORENSICS_SEMANTIC_OVERLAY",
            "overlay_path": OVERLAY_PATH,
            "overlay_version": overlay["overlay_version"],
            "contract_path": EXPECTED_CONTRACT,
            "authority": EXPECTED_AUTHORITY,
        })
        return wrapped

    def wrap_chain(chain: dict[str, Any]) -> dict[str, Any]:
        record = {
            **copy.deepcopy(chain),
            "source_ids": sorted({
                source_id
                for proposition in chain.get("proposition_records") or []
                for source_id in proposition.get("source_ids") or []
            }),
        }
        wrapped = baseline.wrap(
            str(chain["chain_id"]),
            record,
            baseline_payload,
        )
        wrapped.setdefault("provenance", []).append({
            "kind": "CLAIMS_FORENSICS_CHAIN_ADJUDICATION",
            "overlay_path": OVERLAY_PATH,
            "overlay_version": overlay["overlay_version"],
            "contract_path": EXPECTED_CONTRACT,
            "authority": EXPECTED_AUTHORITY,
        })
        return wrapped

    entities["lie_ledger_v2"] = [wrap_record(record) for record in records]
    entities["lie_ledger_chains_v2"] = [wrap_chain(chain) for chain in chains]
    state["lie_ledger_v2_metrics"] = metrics
    state["lie_ledger_v2_publication_blockers"] = active_global_blockers

    governance = state.setdefault("lie_ledger_v2_governance", {})
    governance.update({
        "semantic_authority": EXPECTED_AUTHORITY,
        "claims_forensics_contract_path": EXPECTED_CONTRACT,
        "claims_forensics_overlay_path": OVERLAY_PATH,
        "claims_forensics_overlay_version": overlay["overlay_version"],
        "claims_forensics_full_sweep_path": overlay.get("full_sweep_path"),
        "claims_forensics_full_sweep_version": overlay.get("full_sweep_version"),
        "post_cutoff_appended_record_count": len(overlay.get("append_records") or []),
        "top_level_public_unit": "NARRATIVE_CHAIN",
        "atomic_proposition_verdict_propagation": False,
    })

    release = state.setdefault("release", {})
    release["lie_ledger_claims_forensics_overlay_version"] = overlay["overlay_version"]
    release["lie_ledger_claims_forensics_contract_path"] = EXPECTED_CONTRACT
    release["lie_ledger_claims_forensics_full_sweep_version"] = overlay.get("full_sweep_version")

    counts = state.setdefault("counts", {})
    counts["lie_ledger_v2_records"] = len(records)
    counts["lie_ledger_v2_chains"] = len(chains)
    counts["lie_ledger_v2_unique_propositions"] = metrics["unique_propositions"]
    counts["lie_ledger_v2_claim_instances"] = metrics["claim_instances"]
    counts["lie_ledger_v2_publication_blockers"] = len(active_global_blockers)

    state.setdefault("integrity", {}).update({
        "lie_ledger_publication_blockers_open": bool(active_global_blockers),
        "lie_ledger_claims_forensics_overlay_active": True,
        "lie_ledger_one_chain_one_public_unit_required": True,
        "lie_ledger_atomic_truth_independence_preserved": True,
        "lie_ledger_chain_plain_english_reasoning_supported": True,
        "lie_ledger_machine_logic_graph_active": True,
        "lie_ledger_historical_adjudication_input_preserved": True,
        "lie_ledger_post_cutoff_claim_intake_active": bool(overlay.get("append_records")),
    })
    return state
