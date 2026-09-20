#!/usr/bin/env python3
"""Release-owned anti-drift validation for Claims Forensics authority.

This validator does not adjudicate claims. It proves that accepted Claims
Forensics semantics remain the authoritative input to canonical/public Lie
Ledger state and that downstream lanes preserve, rather than reinterpret, them.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = "data/canonical-current-state-v2.json"
PUBLIC = "data/public-current-state.json"
GOVERNANCE_CONFIG = "config/lie-ledger-governance.json"
SEALED_HISTORICAL = "data/lie-ledger-v2-evidence-adjudications.json"

EXPECTED_AUTHORITY = "INFORMATION_CLAIMS_AND_FORENSIC_ADJUDICATION"
EXPECTED_CONTRACT = "docs/LIE_LEDGER_LOGIC_AUTHORITY_CONTRACT.md"
F15_CHAIN_ID = "CH-F15E-CSAR-URANIUM"
STRONG_KNOWLEDGE = {
    "LIKELY_KNEW_FALSE",
    "VERY_LIKELY_KNEW_FALSE",
    "KNOWING_FALSEHOOD_ESTABLISHED",
}

# Current accepted state must reconcile exactly. The validator independently
# derives each denominator below before checking the accepted baseline.
ACCEPTED = {
    "chains": 47,
    "accusation_chains": 33,
    "control_chains": 14,
    "proposition_rows": 133,
    "unique_propositions": 64,
    "claim_instances": 82,
    "publication_blockers": 2,
}

CLAIMS_SEMANTIC_OWNERSHIP = {
    "event_chain_membership",
    "narrative_family_membership",
    "atomic_proposition_decomposition",
    "source_fidelity",
    "truth_adjudication",
    "knowledge_adjudication",
    "claim_relationships",
    "event_level_claim_summary",
    "lie_ledger_wording",
    "lie_ledger_denominators",
    "lie_ledger_metrics",
    "case_logic_graph",
}

PROTECTED_CHAIN_FIELDS = (
    "classification",
    "narrative_family_id",
    "public_title",
    "public_finding",
    "plain_english_summary",
    "how_we_know",
    "event_title",
    "event_baseline",
    "terminal_event_state",
    "open_evidence_gaps",
    "branches",
    "claim_nodes",
    "public_include_in_accusation_count",
    "logic_graph",
)

PROTECTED_RECORD_FIELDS = (
    "chain_id",
    "claim_id",
    "claim_instance_id",
    "original_claim_id",
    "proposition_id",
    "claim",
    "source_proposition",
    "proposition",
    "proposition_axis",
    "proposition_fidelity",
    "truth_adjudication",
    "truth_qualifier",
    "denominator_class",
    "counts_as_unique_proposition",
    "relation_type",
    "parent_claim_instance_id",
    "parent_claim_id",
    "next_claim_id",
    "publication_status",
)


def require(condition: Any, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load(root: Path, relative: str) -> Any:
    return json.loads((root / relative).read_text(encoding="utf-8"))


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def canonical_records(canonical: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        unwrap(item)
        for item in (canonical.get("entities") or {}).get("lie_ledger_v2") or []
    ]


def canonical_chains(canonical: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        unwrap(item)
        for item in (canonical.get("entities") or {}).get("lie_ledger_chains_v2") or []
    ]


def public_chains(public: dict[str, Any]) -> list[dict[str, Any]]:
    return list((((public.get("gate3") or {}).get("lie_ledger") or {}).get("records") or []))


def chain_map(chains: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result = {}
    for chain in chains:
        chain_id = str(chain.get("chain_id") or "")
        require(chain_id, "Lie Ledger chain lacks chain_id")
        require(chain_id not in result, f"duplicate Lie Ledger chain: {chain_id}")
        result[chain_id] = chain
    return result


def record_map(records: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result = {}
    for record in records:
        instance = str(record.get("claim_instance_id") or "")
        require(instance, "Lie Ledger proposition lacks claim_instance_id")
        require(instance not in result, f"duplicate claim instance: {instance}")
        result[instance] = record
    return result


def chain_record_map(chain: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return record_map(list(chain.get("proposition_records") or []))


def claim_instance_key(record: dict[str, Any]) -> str:
    return str(
        record.get("original_claim_id")
        or record.get("claim_id")
        or record.get("claim_instance_id")
    )


def evidence_refs(record: dict[str, Any], key: str) -> list[str]:
    return [
        str(value)
        for value in (record.get("evidence_support") or {}).get(key) or []
        if value
    ]


def validate_authority_config(config: dict[str, Any]) -> None:
    require(
        config.get("lane_id") == "information_claims_forensic_adjudication",
        "Claims Forensics permanent lane identifier drifted",
    )
    require(
        config.get("domain") == "lie_ledger_claim_forensics",
        "Claims Forensics lane is no longer bound to the Lie Ledger claim domain",
    )
    require(
        config.get("controlling_contract") == EXPECTED_CONTRACT,
        "Claims Forensics controlling contract drifted",
    )
    require(
        bool(config.get("active_prompt")),
        "Claims Forensics permanent lane lacks an active engineering prompt",
    )

    authority = config.get("authority") or {}
    claims_owned = set(authority.get("owns") or [])
    require(
        CLAIMS_SEMANTIC_OWNERSHIP <= claims_owned,
        "Claims Forensics no longer owns the complete protected adjudication surface",
    )

    for lane_key in (
        "evidence_integration_owns",
        "public_product_owns",
        "release_integrity_owns",
    ):
        overlap = CLAIMS_SEMANTIC_OWNERSHIP & set(authority.get(lane_key) or [])
        require(
            not overlap,
            f"{lane_key} silently acquired Claims Forensics semantics: {sorted(overlap)}",
        )

    require(
        authority.get("systems_lead") == "scope_priority_integration_only",
        "Atlas Systems Lead authority expanded into adjudication semantics",
    )

    inference = set(config.get("inference_invariants") or [])
    require("FALSE_NOT_LIE" in inference, "FALSE != LIE invariant missing")
    require(
        "REASONABLE_INFERENCE_ALLOWED" in inference
        and "DIRECT_CONFESSION_NOT_REQUIRED" in inference,
        "evidence-based knowledge inference contract was weakened",
    )
    require(
        "POSSIBILITY_IS_NOT_EVIDENCE" in inference
        and "UNRESOLVED_NOT_DEFAULT" in inference,
        "possibility/unresolved inference boundary was weakened",
    )
    require(
        "CHAIN_CONTEXT_NO_VERDICT_PROPAGATION" in inference,
        "chain-membership no-verdict-propagation invariant missing",
    )

    routine = list(config.get("routine") or [])
    required_order = [
        "evidence_integration_updates_event_baseline",
        "claims_forensics_updates_lie_ledger",
        "public_product_renders_semantics",
        "release_integrity_verifies",
    ]
    positions = [routine.index(item) if item in routine else -1 for item in required_order]
    require(
        all(index >= 0 for index in positions) and positions == sorted(positions),
        "ROOK/Evidence/Claims/Public/Release authority handoff order drifted",
    )

    view = config.get("required_public_secondary_view") or {}
    require(view.get("required") is True, "optional logic-flow capability is no longer required")
    require(
        view.get("source") == "canonical_logic_graph",
        "public logic flow is no longer sourced from the canonical Claims Forensics graph",
    )
    require(
        view.get("must_not_be_hand_authored") is True,
        "frontend hand-authored adjudication logic is no longer prohibited",
    )


def validate_logic_graph(chain: dict[str, Any]) -> None:
    chain_id = str(chain.get("chain_id") or "")
    records = list(chain.get("proposition_records") or [])
    graph = chain.get("logic_graph") or {}
    require(
        graph.get("graph_type") == "CLAIM_EVIDENCE_ADJUDICATION",
        f"canonical logic graph missing for {chain_id}",
    )
    require(graph.get("chain_id") == chain_id, f"logic graph chain identity drifted for {chain_id}")
    require(
        graph.get("generation_rule")
        == "DETERMINISTIC_FROM_CANONICAL_CLAIM_AND_EVIDENCE_RELATIONSHIPS",
        f"logic graph is no longer canonical-relationship-derived for {chain_id}",
    )

    nodes = list(graph.get("nodes") or [])
    claim_nodes = [node for node in nodes if node.get("type") == "ATOMIC_PROPOSITION"]
    require(
        int(graph.get("claim_node_count") or 0) == len(records) == len(claim_nodes),
        f"logic graph proposition cardinality mismatch for {chain_id}",
    )
    by_instance = chain_record_map(chain)
    node_by_instance = {
        str(node.get("claim_instance_id") or ""): node
        for node in claim_nodes
        if node.get("claim_instance_id")
    }
    require(
        set(node_by_instance) == set(by_instance),
        f"logic graph proposition membership drifted for {chain_id}",
    )
    for instance, record in by_instance.items():
        node = node_by_instance[instance]
        require(
            node.get("truth_finding") == record.get("truth_adjudication"),
            f"logic graph independently rewrote factual finding {instance}",
        )
        if record.get("publication_status") == "BLOCKED_EVIDENCE_COMPLETION":
            require(
                node.get("knowledge_finding") == "WITHHELD_PENDING_EVIDENCE",
                f"logic graph leaked publication-blocked knowledge {instance}",
            )


def validate_f15_reference(chain: dict[str, Any]) -> None:
    require(chain.get("classification") == "ACCUSATION_CHAIN", "F-15E reference chain lost accusation classification")
    require(chain.get("public_include_in_accusation_count") is True, "F-15E reference chain dropped from accusation denominator")
    require(
        (chain.get("public_finding") or {}).get("key") == "lie",
        "F-15E chain-level Lie finding drifted",
    )
    require(
        "F-15E was lost" in str(chain.get("event_baseline") or ""),
        "F-15E reference chain lost the real aircraft-loss baseline",
    )
    baseline = str(chain.get("event_baseline") or "").casefold()
    require(
        "missing/evading" in baseline and "personnel-recovery" in baseline,
        "F-15E reference chain lost the real missing-airman/CSAR baseline",
    )
    terminal = str(chain.get("terminal_event_state") or "").casefold()
    require(
        "both crew were recovered" in terminal,
        "F-15E reference chain lost the successful terminal rescue state",
    )
    require(
        "enriched uranium" in terminal and "isfahan" in terminal,
        "F-15E reference chain lost real Isfahan enriched-uranium context",
    )

    rows = chain_record_map(chain)
    require(
        rows.get("CI-IR-CLM-0004-P01", {}).get("truth_adjudication") == "SUPPORTED",
        "real missing/evading airman period was flattened into the chain accusation",
    )
    capture = rows.get("CI-IR-CLM-0004-P02") or {}
    require(
        capture.get("truth_adjudication") == "FALSE",
        "terminal capture proposition no longer resolves false",
    )
    require(
        capture.get("knowledge_judgment") not in STRONG_KNOWLEDGE,
        "capture falsity was mechanically promoted into a Lie finding",
    )

    correction = rows.get("CI-IR-CLM-0006-P01") or {}
    require(
        correction.get("relation_type") == "CORRECTION"
        and "had not been captured or detained" in str(correction.get("proposition") or ""),
        "provincial IRGC correction/denial was lost or polarity-flipped",
    )
    require(
        rows.get("CI-IR-CLM-0007-P01", {}).get("truth_adjudication") == "SUPPORTED",
        "real rescue-equipment losses inherited a false causal verdict",
    )
    require(
        rows.get("CI-IR-CLM-0008-P02", {}).get("truth_adjudication") == "FALSE",
        "ultimate rescue-failure proposition no longer resolves false",
    )
    require(
        rows.get("CI-IR-CLM-0009-P02", {}).get("truth_adjudication") == "SUPPORTED",
        "real Isfahan enriched-uranium presence was collapsed into the false mission theory",
    )
    require(
        rows.get("CI-IR-CLM-0010-P01", {}).get("relation_type") == "NARRATIVE_SUBSTITUTION",
        "uranium-mission substitution narrative lost its distinct relationship",
    )

    all_text = lambda row: " ".join(
        str(row.get(key) or "")
        for key in ("claim", "source_proposition", "proposition", "truth_qualifier")
    ).casefold()
    require(
        any(
            row.get("truth_adjudication") == "FALSE" and "f-35" in all_text(row)
            for row in rows.values()
        ),
        "false F-35 identification is absent from the F-15E reference chain",
    )

    causal = rows.get("CI-IR-CLM-0007-P02") or {}
    require(
        causal.get("proposition_axis") in {"CAUSE", "CAUSAL_ATTRIBUTION"}
        and causal.get("truth_adjudication") == "FALSE",
        "F-15E rescue-equipment causal-attribution proposition is missing or no longer separately false",
    )
    require(
        causal.get("proposition_id")
        != rows.get("CI-IR-CLM-0007-P01", {}).get("proposition_id"),
        "real equipment-loss fact and causal-attribution proposition were collapsed",
    )

    media = [
        row for row in rows.values()
        if row.get("denominator_class") == "MEDIA_ARTIFACT"
    ]
    require(media, "F-15E provenance-bounded false/remixed media nodes are missing")
    require(
        any(
            row.get("truth_adjudication") == "FALSE"
            and row.get("knowledge_judgment") == "NOT_ASSESSABLE"
            and row.get("counts_as_unique_proposition") is False
            and "OFFICIAL_ORIGIN_NOT_ESTABLISHED" in str(row.get("truth_qualifier") or "")
            for row in media
        ),
        "F-15E false media lost its official-origin/knowledge boundary",
    )

    blocked = [
        rows.get("CI-IR-CLM-0011-P01") or {},
        rows.get("CI-IR-CLM-0011-P02") or {},
    ]
    require(
        all(
            row.get("truth_adjudication") == "FALSE"
            and row.get("publication_status") == "BLOCKED_EVIDENCE_COMPLETION"
            and row.get("counts_as_unique_proposition") is False
            for row in blocked
        ),
        "F-15E uranium amplification blockers no longer preserve false fact/non-unique/withheld-knowledge separation",
    )

    truth_states = {row.get("truth_adjudication") for row in rows.values()}
    require(
        {"SUPPORTED", "FALSE"} <= truth_states,
        "F-15E parent Lie finding propagated one verdict across all proposition nodes",
    )


def validate_state(
    canonical: dict[str, Any],
    public: dict[str, Any],
    config: dict[str, Any],
) -> None:
    validate_authority_config(config)

    governance = canonical.get("lie_ledger_v2_governance") or {}
    release = canonical.get("release") or {}
    integrity = canonical.get("integrity") or {}
    require(
        governance.get("semantic_authority") == EXPECTED_AUTHORITY,
        "active canonical Lie Ledger semantic authority is not Claims Forensics",
    )
    require(
        governance.get("claims_forensics_contract_path") == EXPECTED_CONTRACT,
        "canonical Claims Forensics contract path drifted",
    )
    require(
        bool(governance.get("claims_forensics_overlay_version"))
        and bool(governance.get("claims_forensics_full_sweep_version")),
        "canonical state is not pinned to active Claims Forensics overlay/full-sweep versions",
    )
    require(
        governance.get("atomic_proposition_verdict_propagation") is False,
        "canonical state permits chain-level verdict propagation",
    )
    require(
        integrity.get("lie_ledger_claims_forensics_overlay_active") is True
        and integrity.get("lie_ledger_machine_logic_graph_active") is True
        and integrity.get("lie_ledger_historical_adjudication_input_preserved") is True,
        "Claims Forensics/current-history integrity markers are incomplete",
    )
    require(
        release.get("lie_ledger_claims_forensics_contract_path") == EXPECTED_CONTRACT
        and release.get("lie_ledger_claims_forensics_overlay_version")
        == governance.get("claims_forensics_overlay_version")
        and release.get("lie_ledger_claims_forensics_full_sweep_version")
        == governance.get("claims_forensics_full_sweep_version"),
        "release identity is not pinned to the accepted Claims Forensics semantics",
    )

    records = canonical_records(canonical)
    chains = canonical_chains(canonical)
    cchains = chain_map(chains)
    pchains = chain_map(public_chains(public))
    require(set(cchains) == set(pchains), "Public Product altered Lie Ledger chain membership")

    # Canonical proposition membership itself must reconcile with the chain graph.
    top_records = record_map(records)
    chain_rows = [
        row for chain in chains for row in (chain.get("proposition_records") or [])
    ]
    chain_by_instance = record_map(chain_rows)
    require(
        set(top_records) == set(chain_by_instance),
        "canonical chain proposition membership differs from canonical proposition set",
    )

    accusation = [
        chain for chain in chains
        if chain.get("classification") == "ACCUSATION_CHAIN"
        and chain.get("public_include_in_accusation_count") is True
    ]
    controls = [
        chain for chain in chains
        if chain.get("classification") != "ACCUSATION_CHAIN"
        and chain.get("public_include_in_accusation_count") is False
    ]
    require(
        len(accusation) + len(controls) == len(chains),
        "chain classification leaves an ambiguous accusation/control state",
    )

    adjudicated = [
        record for record in records
        if record.get("adjudication_status") == "EVIDENCE_ADJUDICATED"
    ]
    unique_ids = {
        str(record.get("proposition_id"))
        for record in adjudicated
        if record.get("counts_as_unique_proposition") and record.get("proposition_id")
    }
    claim_keys = {claim_instance_key(record) for record in adjudicated}
    derived = {
        "chains": len(chains),
        "accusation_chains": len(accusation),
        "control_chains": len(controls),
        "proposition_rows": len(records),
        "unique_propositions": len(unique_ids),
        "claim_instances": len(claim_keys),
        "publication_blockers": len(canonical.get("lie_ledger_v2_publication_blockers") or []),
    }
    require(
        derived == ACCEPTED,
        f"current accepted Claims Forensics denominator state does not reconcile: {derived}",
    )
    metrics = canonical.get("lie_ledger_v2_metrics") or {}
    require(
        metrics.get("unique_propositions") == derived["unique_propositions"]
        and metrics.get("claim_instances") == derived["claim_instances"]
        and metrics.get("narrative_chains") == derived["chains"],
        "canonical Claims Forensics metrics do not match behaviorally recomputed denominators",
    )
    require(
        len([
            chain for chain in pchains.values()
            if chain.get("public_include_in_accusation_count") is not False
        ]) == ACCEPTED["accusation_chains"],
        "Public Product accusation-card denominator differs from canonical Claims Forensics classification",
    )

    # Repetition/amplification of an existing proposition cannot inflate the
    # denominator. An amplification that introduces a genuinely distinct atomic
    # proposition may count once; proposition identity, not the relationship
    # label by itself, controls the denominator.
    for record in records:
        if record.get("denominator_class") in {"REPETITION_AMPLIFICATION", "CORRECTION_RETRACTION"}:
            require(
                record.get("counts_as_unique_proposition") is False,
                f"non-unique relationship node inflated denominator: {record.get('claim_instance_id')}",
            )
    by_prop: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        if record.get("proposition_id"):
            by_prop.setdefault(str(record["proposition_id"]), []).append(record)
    for proposition_id, group in by_prop.items():
        require(
            sum(bool(row.get("counts_as_unique_proposition")) for row in group) <= 1,
            f"one proposition is counted uniquely more than once: {proposition_id}",
        )

    # Knowledge may be inferred from evidence, but falsity alone may never manufacture it.
    false_not_lie = [
        record for record in records
        if record.get("truth_adjudication") == "FALSE"
        and record.get("knowledge_judgment") not in STRONG_KNOWLEDGE
    ]
    require(false_not_lie, "FALSE != LIE control corpus disappeared")
    inferred = []
    for record in records:
        if (
            record.get("publication_status") == "PUBLIC_READY"
            and record.get("knowledge_judgment") in STRONG_KNOWLEDGE
        ):
            require(
                evidence_refs(record, "what_was_said")
                and evidence_refs(record, "factual_baseline")
                and evidence_refs(record, "knowledge_access")
                and record.get("knowledge_indicators"),
                f"strong knowledge finding was manufactured without access evidence: {record.get('claim_instance_id')}",
            )
            inferred.append(record)
    require(inferred, "no evidence-based estimative/strong knowledge finding remains in the corpus")

    # Cross-lane semantic parity: Public Product can transform withholding only;
    # it cannot own or rewrite canonical case meaning.
    for chain_id, source_chain in cchains.items():
        rendered_chain = pchains[chain_id]
        for field in PROTECTED_CHAIN_FIELDS:
            require(
                rendered_chain.get(field) == source_chain.get(field),
                f"Public Product altered Claims Forensics chain field {chain_id}.{field}",
            )
        validate_logic_graph(source_chain)
        require(
            rendered_chain.get("logic_graph") == source_chain.get("logic_graph"),
            f"public logic for {chain_id} was independently authored instead of projected from canonical relationships",
        )

        source_rows = chain_record_map(source_chain)
        rendered_rows = chain_record_map(rendered_chain)
        require(
            set(source_rows) == set(rendered_rows),
            f"Public Product altered proposition membership for {chain_id}",
        )
        for instance, source_record in source_rows.items():
            rendered = rendered_rows[instance]
            for field in PROTECTED_RECORD_FIELDS:
                require(
                    rendered.get(field) == source_record.get(field),
                    f"Public Product altered Claims Forensics proposition field {instance}.{field}",
                )
            publication = source_record.get("publication_status")
            if publication == "PUBLIC_READY":
                require(
                    rendered.get("public_knowledge_judgment") == source_record.get("knowledge_judgment")
                    and rendered.get("public_combined_assessment") == source_record.get("combined_assessment")
                    and rendered.get("canonical_assessment_withheld") is False,
                    f"Public Product altered public-ready knowledge semantics {instance}",
                )
            elif publication == "BLOCKED_EVIDENCE_COMPLETION":
                require(
                    rendered.get("truth_adjudication") == source_record.get("truth_adjudication"),
                    f"knowledge withholding suppressed factual finding {instance}",
                )
                require(
                    rendered.get("canonical_assessment_withheld") is True
                    and "knowledge_judgment" not in rendered
                    and "combined_assessment" not in rendered
                    and rendered.get("public_knowledge_judgment")
                    == "WITHHELD_PENDING_EVIDENCE_QUALIFICATION",
                    f"publication-blocked knowledge finding leaked or was rewritten {instance}",
                )

    # A narrative family links distinct incidents; it never becomes a substitute top-level event.
    require(
        "CH-FALSE-FLAG-REGIONAL" not in cchains,
        "regional false-flag narrative family masquerades as one event chain",
    )
    false_flag_incidents = {
        "CH-ARAMCO-FALSE-FLAG-20260302",
        "CH-ERBIL-KUWAIT-FALSE-FLAG-20260315",
        "CH-SHAHED-CLONE-FALSE-FLAG-20260315",
    }
    require(false_flag_incidents <= set(cchains), "incident-specific false-flag chains were collapsed")
    require(
        all(
            cchains[chain_id].get("narrative_family_id") == "NF-FALSE-FLAG-REGIONAL"
            for chain_id in false_flag_incidents
        ),
        "false-flag cross-event narrative-family linkage drifted",
    )

    f15 = cchains.get(F15_CHAIN_ID)
    require(f15 is not None, "F-15E reference chain is missing")
    validate_f15_reference(f15)

    blockers = {
        str(item.get("claim_instance_id") or "")
        for item in canonical.get("lie_ledger_v2_publication_blockers") or []
    }
    require(
        blockers == {"CI-IR-CLM-0011-P01", "CI-IR-CLM-0011-P02"},
        "active publication-blocker identity drifted",
    )


def validate(root: Path = ROOT) -> None:
    root = Path(root).resolve()
    canonical = load(root, CANONICAL)
    public = load(root, PUBLIC)
    config = load(root, GOVERNANCE_CONFIG)
    sealed = load(root, SEALED_HISTORICAL)

    # The sealed historical artifact remains the Sep. 9 input. Current semantics
    # are downstream Claims Forensics state, not a rewrite of this artifact.
    require(
        sealed.get("artifact_role") == "LIE_LEDGER_V2_EVIDENCE_ADJUDICATION_SET",
        "sealed historical Lie Ledger artifact role changed",
    )
    require(
        (sealed.get("migration_provenance") or {}).get("historical_substantive_sha256")
        == "52767b85fa54264bfbd94bbea5ee62c55d0f9831f10bb5e71c86573e4a0c420d",
        "sealed Sep. 9 historical replay substantive fingerprint changed",
    )

    validate_state(canonical, public, config)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    args = parser.parse_args()
    validate(Path(args.root))
    print(
        "claims-forensics-authority: PASS - permanent Claims Forensics authority, "
        "canonical/public semantic parity, logic-graph derivation, denominators, "
        "F-15E mixed-node reference chain, and blocked-knowledge withholding verified"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
