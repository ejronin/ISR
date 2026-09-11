#!/usr/bin/env python3
"""Protect neutral evidence-adjudication boundaries in active production code.

Historical migration files may retain persona-era names as provenance. Current
canonical/public builders and validators may not reintroduce persona ownership
or replay historical adjudication machinery as production authority.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ACTIVE_TARGETS = (
    "docs/LIE_LEDGER_EVIDENCE_ADJUDICATION_CONTRACT.md",
    "schemas/lie-ledger-evidence-adjudication-v2.json",
    "scripts/build_lie_ledger_evidence_adjudication.py",
    "scripts/build_canonical_current_state_v2_final.py",
    "scripts/build_public_current_state_v2_hardened.py",
    "scripts/validate_lie_ledger_v2.py",
    "scripts/validate_public_current_state_v2.py",
)

FORBIDDEN_ACTIVE_AUTHORITY = (
    'verdict_authority": "ROOK',
    'implementation_authority": "PR/CI',
    'authority_status": "ROOK_ADJUDICATED',
    'authority": "PR/CI',
    'authority": "ROOK',
    "ROOK is the sole authority",
    "ROOK owns substantive adjudication",
)

for relative in ACTIVE_TARGETS:
    text = (ROOT / relative).read_text(encoding="utf-8")
    for token in FORBIDDEN_ACTIVE_AUTHORITY:
        assert token not in text, f"active persona-authority token in {relative}: {token}"

active_builder = (ROOT / "scripts/build_lie_ledger_evidence_adjudication.py").read_text(encoding="utf-8")
for legacy_import in (
    "import build_lie_ledger_v2",
    "import apply_lie_ledger_evidence_completion_20260909",
    "import apply_lie_ledger_current_claims_20260909",
    "import neutralize_lie_ledger_governance",
):
    assert legacy_import not in active_builder, (
        f"active adjudication builder still replays historical machinery: {legacy_import}"
    )
assert "data/lie-ledger-v2-evidence-adjudications.json" in active_builder, (
    "active adjudication builder is not bound to the tracked neutral adjudication set"
)

final_builder = (ROOT / "scripts/build_canonical_current_state_v2_final.py").read_text(encoding="utf-8")
assert "import build_lie_ledger_evidence_adjudication as lie_ledger_pipeline" in final_builder, (
    "production final builder is not bound to the neutral evidence-adjudication entrypoint"
)
for legacy_import in (
    "import build_lie_ledger_v2",
    "import apply_lie_ledger_evidence_completion_20260909",
    "import apply_lie_ledger_current_claims_20260909",
):
    assert legacy_import not in final_builder, (
        f"production final builder bypasses neutral entrypoint: {legacy_import}"
    )

public_builder = (ROOT / "scripts/build_public_current_state_v2_hardened.py").read_text(encoding="utf-8")
assert "ACTIVE_LIE_LEDGER_EVIDENCE_ADJUDICATION_SET" in public_builder, (
    "public release input graph does not bind the neutral adjudication set"
)
for retired_input in (
    "HISTORICAL_LIE_LEDGER_ASSESSMENT_INPUT",
    "HISTORICAL_EVIDENCE_COMPLETION_INPUT",
    "HISTORICAL_CURRENT_CLAIM_ASSESSMENT_INPUT",
    "HISTORICAL_ASSESSMENT_PROJECTION_GENERATOR",
    "HISTORICAL_EVIDENCE_COMPLETION_APPLICATOR",
    "HISTORICAL_CURRENT_CLAIM_APPLICATOR",
):
    assert retired_input not in public_builder, (
        f"historical replay remains in active public input graph: {retired_input}"
    )

print("evidence governance boundary: PASS - current production is neutral; historical persona-era material remains provenance only")
