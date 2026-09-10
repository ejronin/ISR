#!/usr/bin/env python3
"""Apply the bounded Sep. 9 ROOK current-claim update to Lie Ledger v2.

This is not a new public taxonomy. It reuses the existing Lie Ledger v2
current-claim normalizer after accepted Sep. 7–9 evidence packets have been
applied, then rebuilds the existing proposition chains and metrics.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import canonical_temporal_contract as temporal

ROOT = Path(__file__).resolve().parents[1]
UPDATE_PATH = "data/lie-ledger-v2-rook-current-claims-20260909.json"
UPDATE_VERSION = "ROOK-CURRENT-CLAIMS-20260909-v1"


def load(root: Path) -> dict[str, Any]:
    return json.loads((root / UPDATE_PATH).read_text(encoding="utf-8"))


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def apply(state: dict[str, Any], root: Path, lie_module: Any, evidence_completion: Any) -> None:
    root = Path(root).resolve()
    update = load(root)
    if update.get("artifact_role") != "ROOK_LIE_LEDGER_V2_CURRENT_CLAIM_UPDATE":
        raise ValueError("unexpected ROOK current-claim update role")
    if update.get("authority") != "ROOK":
        raise ValueError("ROOK current-claim update is not ROOK-owned")
    if update.get("update_version") != UPDATE_VERSION:
        raise ValueError("unexpected ROOK current-claim update version")
    if update.get("contract_version") != state["lie_ledger_v2_authority"]["contract_version"]:
        raise ValueError("ROOK current-claim update contract mismatch")
    update_cutoff_raw = update.get("evidence_cutoff")
    current_cutoff_raw = state["release"].get("current_osint_cutoff")
    update_cutoff = temporal.parse_datetime(update_cutoff_raw, "ROOK current-claim update evidence cutoff")
    current_cutoff = temporal.parse_datetime(current_cutoff_raw, "canonical current evidence cutoff")
    if update_cutoff > current_cutoff:
        raise ValueError("ROOK current-claim update cutoff is later than canonical current cutoff")
    anchor = [
        row for row in state.get("accepted_updates_v2") or []
        if row.get("packet_id") == "UPD-20260909-CATCHUP"
    ]
    if len(anchor) != 1 or anchor[0].get("evidence_cutoff") != update_cutoff_raw:
        raise ValueError("ROOK current-claim update lacks its accepted Sep. 9 evidence anchor")

    current_claims = update.get("current_claims") or {}
    if not current_claims:
        raise ValueError("ROOK current-claim update is empty")

    known_source_ids, _ = lie_module.source_catalog(state)
    authority = {
        "doctrine_version": state["lie_ledger_v2_authority"]["doctrine_version"],
        "current_claims": current_claims,
    }
    generated = lie_module.current_claim_records(state, authority, known_source_ids)
    expected_ids = set(current_claims)
    generated_ids = {str(record.get("claim_id") or "") for record in generated}
    if generated_ids != expected_ids:
        missing = sorted(expected_ids - generated_ids)
        extra = sorted(generated_ids - expected_ids)
        raise ValueError(f"ROOK current-claim update did not resolve cleanly; missing={missing} extra={extra}")
    blocked = [
        record["claim_id"] for record in generated
        if record.get("publication_blockers")
        or record.get("publication_status") != "PUBLIC_READY"
    ]
    if blocked:
        raise ValueError("ROOK current-claim update created publication blockers: " + ", ".join(blocked))

    entities = state.setdefault("entities", {})
    records = [copy.deepcopy(unwrap(item)) for item in entities.get("lie_ledger_v2") or []]
    by_instance = {str(record.get("claim_instance_id") or ""): index for index, record in enumerate(records)}
    for record in generated:
        key = str(record["claim_instance_id"])
        if key in by_instance:
            records[by_instance[key]] = record
        else:
            by_instance[key] = len(records)
            records.append(record)

    chains = lie_module.build_chains(records)
    metrics = evidence_completion.metrics(records, len(chains))
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
    state["lie_ledger_v2_metrics"] = metrics

    counts = state.setdefault("counts", {})
    counts["lie_ledger_v2_records"] = len(records)
    counts["lie_ledger_v2_chains"] = len(chains)
    counts["lie_ledger_v2_unique_propositions"] = metrics["unique_propositions"]
    counts["lie_ledger_v2_claim_instances"] = metrics["claim_instances"]
    counts["lie_ledger_v2_publication_blockers"] = len(state.get("lie_ledger_v2_publication_blockers") or [])

    state.setdefault("lie_ledger_v2_authority", {}).update({
        "current_claim_update_version": UPDATE_VERSION,
        "current_claim_update_path": UPDATE_PATH,
        "current_claim_update_ids": sorted(expected_ids),
    })
    state.setdefault("release", {})["lie_ledger_current_claim_update_version"] = UPDATE_VERSION
    state.setdefault("integrity", {}).update({
        "lie_ledger_current_claim_update_applied": True,
        "lie_ledger_current_claim_update_public_ready": True,
        "lie_ledger_current_claim_update_uses_existing_v2_contract": True,
    })
