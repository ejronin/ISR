#!/usr/bin/env python3
"""Build the active Lie Ledger through the neutral evidence-adjudication contract.

Historical Sep. 9 assessment/evidence handoff modules are replay adapters only.
They may retain their original provenance vocabulary internally, but no generated
canonical state leaves this module with persona authority semantics. The active
contract is docs/LIE_LEDGER_EVIDENCE_ADJUDICATION_CONTRACT.md.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import apply_lie_ledger_current_claims_20260909 as historical_current_claims
import apply_lie_ledger_evidence_completion_20260909 as historical_evidence_completion
import build_lie_ledger_v2 as historical_assessment_projection
import neutralize_lie_ledger_governance as neutral

ROOT = Path(__file__).resolve().parents[1]


def _unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def _assert_neutral_active_state(state: dict[str, Any]) -> None:
    if "lie_ledger_v2_authority" in state:
        raise ValueError("active Lie Ledger state retained legacy persona authority")

    governance = state.get("lie_ledger_v2_governance") or {}
    if governance.get("governance_version") != neutral.GOVERNANCE_VERSION:
        raise ValueError("active Lie Ledger governance version mismatch")
    if governance.get("contract_path") != neutral.CONTRACT_PATH:
        raise ValueError("active Lie Ledger contract path mismatch")

    for wrapped in (state.get("entities") or {}).get("lie_ledger_v2") or []:
        record = _unwrap(wrapped)
        if "authority_status" in record:
            raise ValueError(
                f"active proposition retained authority_status: {record.get('claim_instance_id')}"
            )
        if record.get("adjudication_status") not in {
            "EVIDENCE_ADJUDICATED",
            "LEGACY_NORMALIZED_NOT_REASSESSED",
        }:
            raise ValueError(
                f"active proposition lacks neutral adjudication status: {record.get('claim_instance_id')}"
            )
        for blocker in record.get("publication_blockers") or []:
            if "authority" in blocker or "historical_owner" in blocker:
                raise ValueError(
                    f"active proposition blocker retained persona ownership: {record.get('claim_instance_id')}"
                )

    for blocker in state.get("lie_ledger_v2_publication_blockers") or []:
        if "authority" in blocker or "historical_owner" in blocker:
            raise ValueError("active global publication blocker retained persona ownership")


def apply(state: dict[str, Any], root: Path = ROOT) -> dict[str, Any]:
    """Replay historical handoffs, then expose only neutral active governance.

    The ordering is intentionally fixed because the accepted evidence-completion
    and current-claim handoffs amend the historical projection before governance
    vocabulary is neutralized. No adjudication or evidence relationship is
    recomputed here.
    """
    root = Path(root).resolve()
    historical_evidence_completion.inject_sources(state, root)
    historical_assessment_projection.apply(state, root)
    historical_evidence_completion.apply(state, root, historical_assessment_projection)
    historical_current_claims.apply(
        state,
        root,
        historical_assessment_projection,
        historical_evidence_completion,
    )
    neutral.neutralize(state)
    _assert_neutral_active_state(state)
    return state
