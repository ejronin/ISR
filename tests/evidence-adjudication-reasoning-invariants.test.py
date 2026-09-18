#!/usr/bin/env python3
"""Fail release qualification if active Evidence reasoning drifts from protected semantics.

This is intentionally semantic/config based rather than an exact-prose test.
Human-readable doctrine may be edited, but the active authority files must remain
bound to the same machine-readable invariant set and decision rules.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = "config/evidence-adjudication-reasoning.json"
AUTHORITY_PATHS = (
    "docs/ENGINEERING_DOCTRINE.md",
    "docs/LIE_LEDGER_EVIDENCE_ADJUDICATION_CONTRACT.md",
    "prompts/ATLAS Evidence Integration Engineer Prompt.md",
)

REQUIRED = {
    "ORDINARY_MEANING",
    "SPECIFICITY_BURDEN",
    "EXACT_ACCOUNTING_IS_TESTABLE",
    "CLAIMANT_NO_PRESUMPTION",
    "ABSENCE_NOT_AUTOMATIC_FALSE",
    "UNRESOLVED_NARROW",
    "REASONABLE_INFERENCE",
    "POSSIBILITY_IS_NOT_EVIDENCE",
    "NO_INVENTED_INNOCENT_PATHWAY",
    "LATER_SELF_ADMISSION_CAN_FALSIFY_PRIOR_DENIAL",
    "LATER_PURPOSE_CAN_FALSIFY_ACCIDENT_EXPLANATION",
    "CORRECTION_PATH_MUST_BE_EVIDENCED",
    "FALSE_NOT_LIE",
    "KNOWLEDGE_BY_CONVERGENCE",
    "ACTOR_NEUTRAL",
}

marker = json.loads((ROOT / CONTRACT_PATH).read_text(encoding="utf-8"))
assert marker.get("status") == "ACTIVE"
assert marker.get("contract_id") == "ATLAS-EVIDENCE-REASONING-20260918-2"
assert set(marker.get("required_invariants") or []) == REQUIRED

rules = marker.get("decision_rules") or {}
assert rules.get("unsupported_hypothetical_alternative_weight") == "ZERO_UNLESS_EVIDENCED"
assert rules.get("unresolved_requires_live_evidenced_alternatives") is True
assert rules.get("later_self_admission_effect") == "AFFIRMATIVE_FALSIFYING_EVIDENCE_WHEN_SAME_ACT_OR_PROPOSITION"
assert rules.get("later_purpose_effect") == "AFFIRMATIVE_FALSIFYING_EVIDENCE_AGAINST_ACCIDENT_OR_NO_INTENT_WHEN_SAME_ACT"
assert "MUST BE SUPPORTED BY EVIDENCE" in rules.get("correction_path_requirement", "")
assert "DO NOT INVENT" in rules.get("correction_path_requirement", "")
assert "WITHOUT CONFESSION" in rules.get("knowledge_rule", "")
assert "NARRATIVE_EVOLUTION IS NOT A SUBSTITUTE" in rules.get("chain_rule", "")

decl_re = re.compile(r"<!-- evidence-reasoning-invariants: (?P<ids>[^>]+) -->")
for relative in AUTHORITY_PATHS:
    text = (ROOT / relative).read_text(encoding="utf-8")
    assert f"evidence-reasoning-contract: {CONTRACT_PATH}" in text, (
        f"{relative} is not bound to {CONTRACT_PATH}"
    )
    match = decl_re.search(text)
    assert match, f"{relative} does not declare protected evidence reasoning invariants"
    declared = {item.strip() for item in match.group("ids").split(",") if item.strip()}
    assert declared == REQUIRED, (
        f"{relative} invariant set drifted: missing={sorted(REQUIRED - declared)} "
        f"extra={sorted(declared - REQUIRED)}"
    )

prompt = (ROOT / "prompts/ATLAS Evidence Integration Engineer Prompt.md").read_text(encoding="utf-8")
assert "## Anti-drift and temporal self-falsification" in prompt
assert "POSSIBILITY_IS_NOT_EVIDENCE" in prompt
assert "NO_INVENTED_INNOCENT_PATHWAY" in prompt
assert "LATER_SELF_ADMISSION_CAN_FALSIFY_PRIOR_DENIAL" in prompt
assert "LATER_PURPOSE_CAN_FALSIFY_ACCIDENT_EXPLANATION" in prompt

workflow = (ROOT / ".github/workflows/release-qualification.yml").read_text(encoding="utf-8")
assert "python tests/evidence-adjudication-reasoning-invariants.test.py" in workflow, (
    "release qualification no longer executes the evidence reasoning anti-drift gate"
)

print(
    "evidence adjudication reasoning invariants: PASS - "
    "possibility!=evidence; no invented innocent path; later self-admission/purpose "
    "can falsify prior denial/accident; False!=Lie; actor neutral"
)
