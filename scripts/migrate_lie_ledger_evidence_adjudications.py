#!/usr/bin/env python3
"""Materialize the neutral Lie Ledger adjudication set from the accepted historical handoff.

This script is migration/audit tooling, not a production dependency. It replays the
frozen Sep. 9 assessment, evidence-completion, and current-claim handoffs exactly
once, applies the already-qualified neutral governance transform, and writes the
result as a tracked evidence-adjudication input. Production builders consume that
neutral artifact directly and do not replay persona-owned historical modules.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import apply_lie_ledger_current_claims_20260909 as historical_current_claims
import apply_lie_ledger_evidence_completion_20260909 as historical_evidence_completion
import build_canonical_current_state_v2_hardened as hardened
import build_lie_ledger_v2 as historical_projection
import neutralize_lie_ledger_governance as neutral

OUT = "data/lie-ledger-v2-evidence-adjudications.json"
ADJUDICATION_VERSION = "ATLAS-EVIDENCE-ADJUDICATION-20260911-v1"
ARTIFACT_ROLE = "LIE_LEDGER_V2_EVIDENCE_ADJUDICATION_SET"
HISTORICAL_ASSESSMENT_PATH = "data/lie-ledger-v2-rook-authority.json"
HISTORICAL_COMPLETION_PATH = "data/lie-ledger-v2-rook-evidence-completion-20260909.json"
HISTORICAL_CURRENT_CLAIMS_PATH = "data/lie-ledger-v2-rook-current-claims-20260909.json"
SOURCE_REGISTRY_PATH = "data/lie-ledger-v2-evidence-sources-20260909.json"
HISTORICAL_ACCEPTED_PACKET_ID = "UPD-20260909-CATCHUP"
# Frozen by the previously qualified governance-parity test. This is the
# substantive truth/knowledge/evidence fingerprint of the accepted historical
# replay before governance vocabulary is neutralized.
HISTORICAL_SUBSTANTIVE_SHA256 = "52767b85fa54264bfbd94bbea5ee62c55d0f9831f10bb5e71c86573e4a0c420d"


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def compact_digest(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def load(root: Path, relative: str) -> dict[str, Any]:
    return json.loads((root / relative).read_text(encoding="utf-8"))


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def _historical_gate3_manifest(root: Path) -> dict[str, Any]:
    """Freeze migration/audit replay at the accepted Sep. 9 Gate 3 anchor.

    The neutral adjudication artifact is a sealed historical replay. Later
    canonical source admissions must not retroactively change which legacy
    curated URLs resolved during that replay.
    """
    manifest_path = str(hardened.gate3_core.MANIFEST)
    manifest = load(root, manifest_path)
    accepted = list(manifest.get("accepted_updates") or [])
    anchor_index = next(
        (index for index, entry in enumerate(accepted) if entry.get("packet_id") == HISTORICAL_ACCEPTED_PACKET_ID),
        None,
    )
    if anchor_index is None:
        raise ValueError(f"historical Gate 3 anchor is missing: {HISTORICAL_ACCEPTED_PACKET_ID}")
    frozen = copy.deepcopy(manifest)
    frozen["accepted_updates"] = accepted[: anchor_index + 1]
    frozen["current_evidence_cutoff"] = frozen["accepted_updates"][-1]["evidence_cutoff"]
    return frozen


def build_neutral_replay(root: Path) -> dict[str, Any]:
    frozen_manifest = _historical_gate3_manifest(root)
    manifest_path = root / "data/canonical-ledger/.manifest-v2.lie-ledger-historical-replay.json"
    previous_manifest = hardened.gate3_core.MANIFEST
    try:
        manifest_path.write_bytes(canonical_bytes(frozen_manifest))
        hardened.gate3_core.MANIFEST = manifest_path.relative_to(root).as_posix()
        state = hardened.build_state(root)
    finally:
        hardened.gate3_core.MANIFEST = previous_manifest
        if manifest_path.exists():
            manifest_path.unlink()

    historical_evidence_completion.inject_sources(state, root)
    historical_projection.apply(state, root)
    historical_evidence_completion.apply(state, root, historical_projection)
    historical_current_claims.apply(
        state,
        root,
        historical_projection,
        historical_evidence_completion,
    )
    neutral.neutralize(state)
    return state


def build_payload(root: Path = ROOT) -> dict[str, Any]:
    root = Path(root).resolve()
    state = build_neutral_replay(root)
    governance = copy.deepcopy(state.get("lie_ledger_v2_governance") or {})
    records = [
        copy.deepcopy(unwrap(item))
        for item in (state.get("entities") or {}).get("lie_ledger_v2") or []
    ]
    blockers = copy.deepcopy(state.get("lie_ledger_v2_publication_blockers") or [])
    metrics = copy.deepcopy(state.get("lie_ledger_v2_metrics") or {})
    current_update = load(root, HISTORICAL_CURRENT_CLAIMS_PATH)

    if not records:
        raise ValueError("historical replay produced no Lie Ledger adjudication records")
    if governance.get("governance_version") != neutral.GOVERNANCE_VERSION:
        raise ValueError("historical replay did not reach neutral governance")
    if any("authority_status" in record for record in records):
        raise ValueError("neutral migration payload retained active authority_status")
    if any("authority" in blocker for blocker in blockers):
        raise ValueError("neutral migration payload retained blocker authority")

    record_set_sha256 = compact_digest(records)
    blocker_set_sha256 = compact_digest(blockers)
    metric_sha256 = compact_digest(metrics)
    historical_inputs = copy.deepcopy(governance.get("historical_inputs") or {})

    return {
        "schema_version": "2.0",
        "artifact_role": ARTIFACT_ROLE,
        "adjudication_version": ADJUDICATION_VERSION,
        "governance_version": neutral.GOVERNANCE_VERSION,
        "contract_version": neutral.CONTRACT_VERSION,
        "contract_path": neutral.CONTRACT_PATH,
        "adjudication_basis": "EVIDENCE_AND_ACCEPTED_ASSESSMENT",
        "evidence_cutoff": current_update.get("evidence_cutoff"),
        "source_registry": SOURCE_REGISTRY_PATH,
        "migration_provenance": {
            "historical_substantive_sha256": HISTORICAL_SUBSTANTIVE_SHA256,
            "neutral_record_set_sha256": record_set_sha256,
            "neutral_blocker_set_sha256": blocker_set_sha256,
            "neutral_metric_sha256": metric_sha256,
            "historical_inputs": historical_inputs,
            "historical_paths": [
                HISTORICAL_ASSESSMENT_PATH,
                HISTORICAL_COMPLETION_PATH,
                HISTORICAL_CURRENT_CLAIMS_PATH,
            ],
            "migration_only": True,
        },
        "record_count": len(records),
        "expected_metrics": metrics,
        "publication_blockers": blockers,
        "records": records,
    }


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
    payload = canonical_bytes(build_payload(root))
    if args.check:
        if not output.is_file():
            raise SystemExit(f"FAIL: neutral Lie Ledger adjudication artifact is missing: {output}")
        if output.read_bytes() != payload:
            raise SystemExit(f"FAIL: neutral Lie Ledger adjudication artifact is stale: {output}")
        print(f"lie-ledger adjudication migration: PASS - {output.relative_to(root)} is current")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(payload)
    material = json.loads(payload.decode("utf-8"))
    print(
        "lie-ledger adjudication migration: wrote "
        f"{output.relative_to(root)} with {material['record_count']} records; "
        f"record_sha256={material['migration_provenance']['neutral_record_set_sha256']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
