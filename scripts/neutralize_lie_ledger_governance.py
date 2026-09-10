#!/usr/bin/env python3
"""Neutralize active Lie Ledger persona authority without changing evidence semantics.

This module is a bounded migration adapter. Historical ROOK/PR-CI artifacts remain
untouched as provenance inputs. The transformation applies only to generated state
and must not change factual adjudication, knowledge judgment, combined assessment,
claim/proposition/chain identity, evidence references, source identity, temporal
fields, denominator membership, or metric counts.
"""
from __future__ import annotations

import copy
from typing import Any

GOVERNANCE_VERSION = "ATLAS-EVIDENCE-20260910-1"
CONTRACT_VERSION = "2026-09-10"
CONTRACT_PATH = "docs/LIE_LEDGER_EVIDENCE_ADJUDICATION_CONTRACT.md"

STATUS_MAP = {
    "ROOK_ADJUDICATED": "EVIDENCE_ADJUDICATED",
    "LEGACY_NORMALIZED_NOT_ROOK_REASSESSED": "LEGACY_NORMALIZED_NOT_REASSESSED",
}
PUBLICATION_STATUS_MAP = {
    "NOT_ROOK_REASSESSED": "NOT_REASSESSED",
}
INDICATOR_MAP = {
    "ROOK_KNOWLEDGE_BASIS": "ASSESSMENT_KNOWLEDGE_BASIS",
}

_EXACT_TEXT_REPLACEMENTS = {
    "ROOK credible alternative.": "Credible alternative retained from the accepted assessment record.",
    "No separate ROOK comparative knowledge inference supplied.": "No separate comparative knowledge inference supplied.",
    "No separate ROOK comparative inference supplied.": "No separate comparative inference supplied.",
    "No separate ROOK knowledge inference has been supplied for this normalized legacy proposition.": "No separate knowledge inference has been supplied for this normalized legacy proposition.",
}


def _unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def _neutralize_text(value: Any) -> Any:
    if isinstance(value, str):
        return _EXACT_TEXT_REPLACEMENTS.get(value, value)
    if isinstance(value, list):
        return [_neutralize_text(item) for item in value]
    if isinstance(value, dict):
        return {key: _neutralize_text(item) for key, item in value.items()}
    return value


def _neutralize_blocker(blocker: dict[str, Any]) -> None:
    if blocker.get("code") == "ROOK_EVIDENCE_COMPLETION_REQUIRED":
        blocker["code"] = "EVIDENCE_COMPLETION_REQUIRED"
    authority = blocker.pop("authority", None)
    if authority:
        blocker.setdefault("qualification_scope", "EVIDENCE_INTEGRITY")
        blocker.setdefault("historical_owner", authority)


def _neutralize_record(record: dict[str, Any]) -> None:
    historical_doctrine = record.get("doctrine_version")
    historical_contract = record.get("contract_version")
    historical_contract_path = record.get("contract_path")

    record["doctrine_version"] = GOVERNANCE_VERSION
    record["contract_version"] = CONTRACT_VERSION
    record["contract_path"] = CONTRACT_PATH

    authority_status = record.pop("authority_status", None)
    if authority_status is not None:
        record["adjudication_status"] = STATUS_MAP.get(
            str(authority_status), str(authority_status)
        )
    if record.get("publication_status") in PUBLICATION_STATUS_MAP:
        record["publication_status"] = PUBLICATION_STATUS_MAP[record["publication_status"]]

    for indicator in record.get("knowledge_indicators") or []:
        if indicator.get("indicator") in INDICATOR_MAP:
            indicator["indicator"] = INDICATOR_MAP[indicator["indicator"]]
        if indicator.get("summary") == (
            "ROOK identified the linked evidence as part of the claimant/institution knowledge-access basis."
        ):
            indicator["summary"] = (
                "The linked evidence forms part of the claimant/institution knowledge-access basis."
            )

    for blocker in record.get("publication_blockers") or []:
        _neutralize_blocker(blocker)

    record.update(_neutralize_text({
        "analytic_inference": record.get("analytic_inference"),
        "comparative_assessment": record.get("comparative_assessment"),
        "credible_alternatives": record.get("credible_alternatives") or [],
    }))

    legacy = record.setdefault("legacy_semantics", {})
    if historical_doctrine:
        legacy.setdefault("historical_doctrine_version", historical_doctrine)
    if historical_contract:
        legacy.setdefault("historical_contract_version", historical_contract)
    if historical_contract_path:
        legacy.setdefault("historical_contract_path", historical_contract_path)


def _neutralize_chain(chain: dict[str, Any]) -> None:
    historical_doctrine = chain.get("doctrine_version")
    if historical_doctrine:
        chain["doctrine_version"] = GOVERNANCE_VERSION
        chain.setdefault("historical_assessment", {}).setdefault(
            "doctrine_version", historical_doctrine
        )
    for record in chain.get("proposition_records") or []:
        _neutralize_record(record)
    for row in chain.get("chronology") or []:
        if row.get("publication_status") in PUBLICATION_STATUS_MAP:
            row["publication_status"] = PUBLICATION_STATUS_MAP[row["publication_status"]]
    for blocker in chain.get("publication_blockers") or []:
        _neutralize_blocker(blocker)


def _neutralize_metrics(metrics: dict[str, Any]) -> None:
    pct = (metrics.get("percentages") or {}).get(
        "falsy_share_of_resolved_unique_propositions"
    ) or {}
    numerator = pct.get("numerator_definition")
    denominator = pct.get("denominator_definition")
    if isinstance(numerator, str):
        pct["numerator_definition"] = numerator.replace(
            "ROOK-adjudicated", "evidence-adjudicated"
        )
    if isinstance(denominator, str):
        pct["denominator_definition"] = denominator.replace(
            "ROOK-adjudicated", "evidence-adjudicated"
        )


def _neutralize_source_wrappers(state: dict[str, Any]) -> None:
    for wrapper in (state.get("sources") or {}).get("records") or []:
        if wrapper.get("resolution") == "ROOK_EVIDENCE_COMPLETION_CURRENT":
            wrapper["resolution"] = "EVIDENCE_COMPLETION_CURRENT"
        if wrapper.get("registry_status") == "ROOK_EVIDENCE_COMPLETION_SOURCE":
            wrapper["registry_status"] = "HISTORICAL_EVIDENCE_COMPLETION_SOURCE"
        for provenance in wrapper.get("provenance") or []:
            if provenance.get("kind") == "ROOK_LIE_LEDGER_EVIDENCE_COMPLETION_SOURCE":
                provenance["kind"] = "LIE_LEDGER_EVIDENCE_COMPLETION_SOURCE"
                provenance.setdefault("historical_handoff", "ROOK")
        for variant in wrapper.get("variants") or []:
            provenance = variant.get("provenance") or {}
            if provenance.get("kind") == "ROOK_LIE_LEDGER_EVIDENCE_COMPLETION_SOURCE":
                provenance["kind"] = "LIE_LEDGER_EVIDENCE_COMPLETION_SOURCE"
                provenance.setdefault("historical_handoff", "ROOK")


def neutralize(state: dict[str, Any]) -> dict[str, Any]:
    """Mutate and return generated canonical state using neutral governance semantics."""
    existing = state.get("lie_ledger_v2_governance") or {}
    if (
        "lie_ledger_v2_authority" not in state
        and existing.get("governance_version") == GOVERNANCE_VERSION
    ):
        return state

    entities = state.setdefault("entities", {})
    for wrapped in entities.get("lie_ledger_v2") or []:
        _neutralize_record(_unwrap(wrapped))
        for provenance in wrapped.get("provenance") or []:
            if "authority_path" in provenance:
                provenance["historical_assessment_path"] = provenance.pop("authority_path")
                provenance["role"] = "HISTORICAL_ASSESSMENT_INPUT"

    for wrapped in entities.get("lie_ledger_chains_v2") or []:
        _neutralize_chain(_unwrap(wrapped))
        for provenance in wrapped.get("provenance") or []:
            if "authority_path" in provenance:
                provenance["historical_assessment_path"] = provenance.pop("authority_path")
                provenance["role"] = "HISTORICAL_ASSESSMENT_INPUT"

    for blocker in state.get("lie_ledger_v2_publication_blockers") or []:
        _neutralize_blocker(blocker)

    _neutralize_metrics(state.get("lie_ledger_v2_metrics") or {})
    _neutralize_source_wrappers(state)

    old = state.pop("lie_ledger_v2_authority", {}) or {}
    state["lie_ledger_v2_governance"] = {
        "semantic_version": old.get("semantic_version", "2.0"),
        "governance_version": GOVERNANCE_VERSION,
        "contract_version": CONTRACT_VERSION,
        "contract_path": CONTRACT_PATH,
        "adjudication_basis": "EVIDENCE_AND_ACCEPTED_ASSESSMENT",
        "implementation_model": "DETERMINISTIC_BUILDER",
        "blocked_assessment_policy": "WITHHOLD_UNQUALIFIED_KNOWLEDGE_NOT_FACTUAL_STATUS",
        "historical_inputs": {
            "assessment_path": old.get("authority_path"),
            "assessment_version": old.get("doctrine_version"),
            "assessment_contract_version": old.get("contract_version"),
            "assessment_contract_path": old.get("contract_path"),
            "evidence_completion_version": old.get("evidence_completion_version"),
            "evidence_completion_path": old.get("evidence_completion_path"),
            "evidence_source_registry": old.get("evidence_source_registry"),
            "current_claim_update_version": old.get("current_claim_update_version"),
            "current_claim_update_path": old.get("current_claim_update_path"),
            "current_claim_update_ids": copy.deepcopy(old.get("current_claim_update_ids") or []),
            "resolved_publication_blockers": copy.deepcopy(
                old.get("resolved_publication_blockers") or []
            ),
        },
    }

    release = state.setdefault("release", {})
    historical_release = {
        "doctrine_version": release.pop("lie_ledger_doctrine_version", None),
        "contract_version": release.get("lie_ledger_contract_version"),
        "contract_path": release.pop("lie_ledger_contract_path", None),
        "evidence_completion_version": release.get("lie_ledger_evidence_completion_version"),
        "current_claim_update_version": release.get("lie_ledger_current_claim_update_version"),
    }
    release["lie_ledger_governance_version"] = GOVERNANCE_VERSION
    release["lie_ledger_contract_version"] = CONTRACT_VERSION
    release["lie_ledger_contract_path"] = CONTRACT_PATH
    release["lie_ledger_historical_assessment"] = historical_release

    integrity = state.setdefault("integrity", {})
    integrity.pop("lie_ledger_builder_manufactures_rook_judgments", None)
    integrity.update({
        "lie_ledger_active_persona_authority_removed": True,
        "lie_ledger_historical_assessment_provenance_preserved": True,
        "lie_ledger_builder_preserves_accepted_adjudications": True,
    })
    return state
