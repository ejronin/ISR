#!/usr/bin/env python3
"""Parity contract for neutral Lie Ledger governance migration.

The test constructs the pre-neutral Lie Ledger directly from the historical
migration inputs, then proves that neutral governance changes only governance
vocabulary/provenance placement. It also verifies that the production final
builder, once wired to the neutralizer, preserves the same substantive record.
"""
from __future__ import annotations

import copy
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import apply_lie_ledger_current_claims_20260909 as current_claims
import apply_lie_ledger_evidence_completion_20260909 as evidence_completion
import build_canonical_current_state_v2_final as final_builder
import build_canonical_current_state_v2_hardened as hardened
import build_lie_ledger_v2 as lie_ledger_v2
import neutralize_lie_ledger_governance as neutral


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def records(state: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        unwrap(item)
        for item in (state.get("entities") or {}).get("lie_ledger_v2") or []
    ]


def build_pre_neutral_state() -> dict[str, Any]:
    """Reproduce the accepted historical-assessment projection before neutralization."""
    state = hardened.build_state(ROOT)
    evidence_completion.inject_sources(state, ROOT)
    lie_ledger_v2.apply(state, ROOT)
    evidence_completion.apply(state, ROOT, lie_ledger_v2)
    current_claims.apply(state, ROOT, lie_ledger_v2, evidence_completion)
    final_builder.refresh_derived_counts(state)
    return state


def publication_semantic(value: Any) -> str:
    if value in {"NOT_ROOK_REASSESSED", "NOT_REASSESSED"}:
        return "NOT_REASSESSED"
    return str(value)


def substantive_record(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "claim_id": record.get("claim_id"),
        "claim_instance_id": record.get("claim_instance_id"),
        "original_claim_id": record.get("original_claim_id"),
        "proposition_id": record.get("proposition_id"),
        "chain_id": record.get("chain_id"),
        "actor": record.get("actor"),
        "claim": record.get("claim"),
        "source_proposition": record.get("source_proposition"),
        "proposition": record.get("proposition"),
        "proposition_fidelity": record.get("proposition_fidelity"),
        "truth_adjudication": record.get("truth_adjudication"),
        "truth_qualifier": record.get("truth_qualifier"),
        "lifecycle_status": record.get("lifecycle_status"),
        "knowledge_judgment": record.get("knowledge_judgment"),
        "combined_assessment": record.get("combined_assessment"),
        "denominator_class": record.get("denominator_class"),
        "counts_as_unique_proposition": record.get("counts_as_unique_proposition"),
        "observed_facts": record.get("observed_facts"),
        "falsifier": record.get("falsifier"),
        "evidence_support": record.get("evidence_support"),
        "source_ids": record.get("source_ids"),
        "statement_time": record.get("statement_time"),
        "event_time": record.get("event_time"),
        "knowledge_time": record.get("knowledge_time"),
        "assessment_time": record.get("assessment_time"),
        "relation_type": record.get("relation_type"),
        "parent_claim_instance_id": record.get("parent_claim_instance_id"),
        "parent_claim_id": record.get("parent_claim_id"),
        "next_claim_id": record.get("next_claim_id"),
        "publication_status": publication_semantic(record.get("publication_status")),
        "publication_blocker_semantics": [
            {
                "code": (
                    "EVIDENCE_COMPLETION_REQUIRED"
                    if item.get("code") == "ROOK_EVIDENCE_COMPLETION_REQUIRED"
                    else item.get("code")
                ),
                "deficiency": item.get("deficiency"),
            }
            for item in record.get("publication_blockers") or []
        ],
    }


def substantive_fingerprint(state: dict[str, Any]) -> list[dict[str, Any]]:
    return sorted(
        (substantive_record(record) for record in records(state)),
        key=lambda row: str(row["claim_instance_id"]),
    )


def numeric_metrics(metrics: dict[str, Any]) -> dict[str, Any]:
    pct = (metrics.get("percentages") or {}).get(
        "falsy_share_of_resolved_unique_propositions"
    ) or {}
    return {
        "unique_propositions": metrics.get("unique_propositions"),
        "claim_instances": metrics.get("claim_instances"),
        "originations": metrics.get("originations"),
        "amplifications": metrics.get("amplifications"),
        "corrections": metrics.get("corrections"),
        "retractions": metrics.get("retractions"),
        "narrative_substitutions": metrics.get("narrative_substitutions"),
        "media_artifacts": metrics.get("media_artifacts"),
        "narrative_chains": metrics.get("narrative_chains"),
        "factual_status_totals": metrics.get("factual_status_totals"),
        "knowledge_assessment_totals": metrics.get("knowledge_assessment_totals"),
        "falsy_numerator": pct.get("numerator"),
        "falsy_denominator": pct.get("denominator"),
        "falsy_percentage": pct.get("percentage"),
    }


def ledger_counts(state: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in (state.get("counts") or {}).items()
        if key.startswith("lie_ledger_v2_")
    }


def assert_neutral_structure(state: dict[str, Any]) -> None:
    assert "lie_ledger_v2_authority" not in state
    governance = state.get("lie_ledger_v2_governance") or {}
    assert governance.get("governance_version") == neutral.GOVERNANCE_VERSION
    assert governance.get("adjudication_basis") == "EVIDENCE_AND_ACCEPTED_ASSESSMENT"
    assert governance.get("implementation_model") == "DETERMINISTIC_BUILDER"
    assert governance.get("historical_inputs", {}).get("assessment_path")

    for record in records(state):
        assert "authority_status" not in record
        assert record.get("adjudication_status") in {
            "EVIDENCE_ADJUDICATED",
            "LEGACY_NORMALIZED_NOT_REASSESSED",
        }
        assert record.get("doctrine_version") == neutral.GOVERNANCE_VERSION
        assert record.get("contract_version") == neutral.CONTRACT_VERSION
        assert record.get("contract_path") == neutral.CONTRACT_PATH
        assert record.get("publication_status") != "NOT_ROOK_REASSESSED"
        for blocker in record.get("publication_blockers") or []:
            assert "authority" not in blocker
            assert blocker.get("code") != "ROOK_EVIDENCE_COMPLETION_REQUIRED"
        for indicator in record.get("knowledge_indicators") or []:
            assert indicator.get("indicator") != "ROOK_KNOWLEDGE_BASIS"

    for blocker in state.get("lie_ledger_v2_publication_blockers") or []:
        assert "authority" not in blocker
        assert blocker.get("code") != "ROOK_EVIDENCE_COMPLETION_REQUIRED"

    release = state.get("release") or {}
    assert "lie_ledger_doctrine_version" not in release
    assert release.get("lie_ledger_governance_version") == neutral.GOVERNANCE_VERSION
    assert release.get("lie_ledger_contract_version") == neutral.CONTRACT_VERSION


def main() -> None:
    original = build_pre_neutral_state()
    migrated = copy.deepcopy(original)

    before_records = substantive_fingerprint(original)
    before_metrics = numeric_metrics(original.get("lie_ledger_v2_metrics") or {})
    before_counts = ledger_counts(original)

    neutral.neutralize(migrated)

    assert substantive_fingerprint(migrated) == before_records
    assert numeric_metrics(migrated.get("lie_ledger_v2_metrics") or {}) == before_metrics
    assert ledger_counts(migrated) == before_counts
    assert_neutral_structure(migrated)

    once = copy.deepcopy(migrated)
    neutral.neutralize(migrated)
    assert migrated == once, "neutral governance transformation must be idempotent"

    assert any(
        row.get("truth_adjudication") == "FALSE"
        and row.get("knowledge_judgment") not in {
            "LIKELY_KNEW_FALSE",
            "VERY_LIKELY_KNEW_FALSE",
            "KNOWING_FALSEHOOD_ESTABLISHED",
        }
        for row in records(migrated)
    ), "migration corpus must preserve at least one False != Lie case"

    production = final_builder.build_state(ROOT)
    if "lie_ledger_v2_governance" in production:
        assert_neutral_structure(production)
        assert substantive_fingerprint(production) == before_records
        assert numeric_metrics(production.get("lie_ledger_v2_metrics") or {}) == before_metrics
        assert ledger_counts(production) == before_counts

    print(
        "neutral Lie Ledger governance parity: PASS "
        f"({len(before_records)} propositions; adjudications/evidence/metrics unchanged)"
    )


if __name__ == "__main__":
    main()
