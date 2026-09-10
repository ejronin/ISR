#!/usr/bin/env python3
"""Final Gate 3 canonical builder.

The underlying chronology may contain prewar context. Daily war coverage is a
separate derived series and is deliberately bounded to conflict Day 1 through
the accepted current evidence cutoff while preserving the frozen Gate 2 boundary.

Lie Ledger v2 is generated through the active neutral evidence-adjudication
pipeline. Historical assessment artifacts remain replayable provenance inputs,
but persona authority is not part of generated canonical governance.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_canonical_current_state_v2_hardened as hardened
import build_lie_ledger_evidence_adjudication as lie_ledger_pipeline

OUT = "data/canonical-current-state-v2.json"
CONFLICT_DAY_1 = date(2026, 2, 28)


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def war_daily_coverage(state: dict[str, Any]) -> list[dict[str, Any]]:
    by_date: dict[str, list[str]] = {}
    for item in state.get("chronology") or []:
        event_date = str((item.get("event") or {}).get("event_date") or "")
        if event_date:
            by_date.setdefault(event_date, []).append(item["event_id"])
    cutoff = datetime.fromisoformat(
        state["release"].get("current_osint_cutoff") or state["release"]["gate2_evidence_cutoff"]
    ).date()
    cursor = CONFLICT_DAY_1
    rows: list[dict[str, Any]] = []
    while cursor <= cutoff:
        day = cursor.isoformat()
        ids = sorted(by_date.get(day, []))
        rows.append({
            "date": day,
            "status": "EVENTS_RECORDED" if ids else "NO_CANONICAL_EVENT_RECORDED",
            "canonical_event_ids": ids,
            "canonical_event_count": len(ids),
            "derived": True,
            "coverage_scope": "CONFLICT_DAY_1_THROUGH_CURRENT_EVIDENCE_CUTOFF",
        })
        cursor += timedelta(days=1)
    return rows


def refresh_derived_counts(state: dict[str, Any]) -> None:
    """Refresh entity counts whose collections can grow through accepted v2 packets."""
    entities = state.get("entities") or {}
    counts = state.setdefault("counts", {})
    counts["material_loss_records"] = len(entities.get("material_losses") or [])
    counts["relationship_records"] = len(entities.get("relationships") or [])
    counts["gate3_narrative_claims"] = len(entities.get("narrative_claims") or [])
    counts["gate3_source_records"] = len((state.get("sources") or {}).get("records") or [])
    counts["source_records"] = counts["gate3_source_records"]
    counts["lie_ledger_v2_records"] = len(entities.get("lie_ledger_v2") or [])
    counts["lie_ledger_v2_chains"] = len(entities.get("lie_ledger_chains_v2") or [])


def build_state(root: Path = ROOT) -> dict[str, Any]:
    root = Path(root).resolve()
    state = hardened.build_state(root)

    # One production entrypoint owns the transition from historical assessment
    # handoffs to active neutral governance. The pipeline preserves adjudication,
    # evidence, identity, temporal and denominator semantics and rejects any
    # persona-authority residue before returning generated canonical state.
    lie_ledger_pipeline.apply(state, root)
    refresh_derived_counts(state)

    rows = war_daily_coverage(state)
    state["daily_coverage"] = rows
    state.setdefault("counts", {})["gate3_daily_coverage_days"] = len(rows)
    state.setdefault("integrity", {}).update({
        "war_daily_coverage_bounded_to_conflict": True,
        "war_daily_coverage_starts_day1": bool(rows and rows[0]["date"] == "2026-02-28"),
        "war_daily_coverage_reaches_gate2_cutoff": bool(
            rows and rows[-1]["date"] >= datetime.fromisoformat(
                state["release"]["gate2_evidence_cutoff"]
            ).date().isoformat()
        ),
        "war_daily_coverage_reaches_current_cutoff": bool(
            rows and rows[-1]["date"] == datetime.fromisoformat(
                state["release"]["current_osint_cutoff"]
            ).date().isoformat()
        ),
    })
    prior_identity = state["release"]["canonical_state_identity_v2"]
    historical = state["release"].get("lie_ledger_historical_assessment") or {}
    identity_material = {
        "prior_identity": prior_identity,
        "coverage_start": rows[0]["date"] if rows else None,
        "coverage_end": rows[-1]["date"] if rows else None,
        "coverage_days": len(rows),
        "lie_ledger_governance_version": state["release"]["lie_ledger_governance_version"],
        "lie_ledger_contract_version": state["release"]["lie_ledger_contract_version"],
        "lie_ledger_historical_doctrine_version": historical.get("doctrine_version"),
        "lie_ledger_evidence_completion_version": state["release"].get("lie_ledger_evidence_completion_version"),
        "lie_ledger_current_claim_update_version": state["release"].get("lie_ledger_current_claim_update_version"),
        "lie_ledger_v2_records": state["counts"]["lie_ledger_v2_records"],
        "lie_ledger_v2_chains": state["counts"]["lie_ledger_v2_chains"],
        "lie_ledger_v2_claim_instances": state.get("lie_ledger_v2_metrics", {}).get("claim_instances"),
        "lie_ledger_v2_unique_propositions": state.get("lie_ledger_v2_metrics", {}).get("unique_propositions"),
    }
    state["release"]["canonical_state_identity_v2_hardening"] = prior_identity
    state["release"]["canonical_state_identity_v2"] = (
        "canonical-current-v2-" + digest(canonical_bytes(identity_material))[:16]
    )
    return state


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default=OUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    serialized = canonical_bytes(build_state(root))
    if args.check:
        if not output.is_file() or output.read_bytes() != serialized:
            raise SystemExit(f"FAIL stale {output}")
        print("gate3 final canonical: PASS")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(f"gate3 final canonical: wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
