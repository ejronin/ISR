#!/usr/bin/env python3
"""Finalize Gate 3 by expanding the forensic claim corpus and repairing v2 metadata.

This layer intentionally wraps the already-validated Gate 3 compiler. It does not
modify sealed v1 inputs or the four accepted Gate 3 evidence packets.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_canonical_current_state_v2 as gate3_core

OUT = "data/canonical-current-state-v2.json"
FORENSIC = "data/forensic-v1.3.2/iranian-claim-evolution.json"
FORENSIC_MANIFEST = "data/forensic-v1.3.2/manifest.json"
METHODOLOGY = (
    "Descriptive reliability history only. Counts summarize adjudicated propositions "
    "and corrections in this corpus; they are not a probability that future claims are "
    "true and do not establish deceptive intent."
)


def load(root: Path, path: str) -> Any:
    return json.loads((root / path).read_text(encoding="utf-8"))


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def stable(prefix: str, *values: Any) -> str:
    material = "\0".join(str(value or "").strip().casefold() for value in values).encode("utf-8")
    return f"{prefix}-{digest(material)[:12].upper()}"


def truth_status(value: Any) -> str:
    raw = str(value or "").strip().upper()
    if "FALSE" in raw or "DISPRO" in raw:
        return "DISPROVEN"
    if "CORRECT" in raw or "RETRACT" in raw:
        return "RETRACTED_CORRECTED"
    if "CONTRADICT" in raw:
        return "CONTRADICTED_BY_OBSERVED_BEHAVIOR"
    if "MISLEAD" in raw:
        return "MISLEADING"
    if "EXAGGER" in raw or "OVERSTAT" in raw:
        return "EXAGGERATED_OVERSTATED"
    if "CONFIRM" in raw or raw in {"TRUE", "VERIFIED"}:
        return "VERIFIED_TRUE"
    if "SUPPORT" in raw:
        return "SUPPORTED"
    return "UNRESOLVED"


def claim_test_status(status: str) -> str:
    return {
        "DISPROVEN": "CLAIM_DISPROVEN",
        "RETRACTED_CORRECTED": "CORRECTION_RECORDED",
        "VERIFIED_TRUE": "CLAIM_SUPPORTED",
        "SUPPORTED": "CLAIM_SUPPORTED",
        "MISLEADING": "CLAIM_PARTIALLY_FAILED",
        "EXAGGERATED_OVERSTATED": "CLAIM_PARTIALLY_FAILED",
        "CONTRADICTED_BY_OBSERVED_BEHAVIOR": "CLAIM_CONTRADICTED_BY_BEHAVIOR",
    }.get(status, "TEST_IN_MOTION")


def ensure_forensic_source(state: dict[str, Any], claim: dict[str, Any]) -> str:
    source_id = str(claim.get("source_id") or "").strip()
    if not source_id:
        raise ValueError(f"Forensic claim lacks source_id: {claim.get('claim_id')}")
    existing = {item["source_id"] for item in state["sources"]["records"]}
    if source_id not in existing:
        url = str(claim.get("original_source_url") or "").strip()
        if not url:
            raise ValueError(f"Forensic source is absent from catalog and lacks URL: {source_id}")
        record = {
            "source_id": source_id,
            "outlet": str(claim.get("claimant") or "Forensic claim source"),
            "title": str(claim.get("exact_translated_claim") or claim.get("claim_id")),
            "url": url,
            "published_date": claim.get("claim_date"),
            "source_role": "FORENSIC_CLAIM_ORIGIN",
        }
        gate3_core.ensure_source(
            state,
            record,
            {"kind": "GATE3_FORENSIC_CLAIM_SOURCE", "claim_id": claim.get("claim_id")},
            f"forensic:{claim.get('claim_id')}:{source_id}",
        )
    return source_id


def normalize_forensic_claims(state: dict[str, Any], root: Path) -> dict[str, Any]:
    forensic = load(root, FORENSIC)
    manifest = load(root, FORENSIC_MANIFEST)
    claims = forensic.get("claims") or []
    expected = int((manifest.get("counts") or {}).get("canonical_claims") or 0)
    if not expected or len(claims) != expected:
        raise ValueError(f"Forensic claim count differs from manifest: {len(claims)} != {expected}")
    known_at = manifest.get("created_at")
    if not known_at:
        raise ValueError("Forensic manifest lacks created_at knowledge clock")

    proposition_records: list[dict[str, Any]] = []
    chain_members: dict[str, list[dict[str, Any]]] = defaultdict(list)
    claimant_stats: dict[str, dict[str, Any]] = {}
    source_stats: dict[str, dict[str, Any]] = {}

    def stats_bucket(bucket: dict[str, dict[str, Any]], key: str, subject_type: str) -> dict[str, Any]:
        if key not in bucket:
            bucket[key] = {
                "subject": key,
                "subject_type": subject_type,
                "claim_ids": set(),
                "source_ids": set(),
                "outcomes": defaultdict(int),
                "corrections": 0,
                "propositions": 0,
            }
        return bucket[key]

    for claim in claims:
        claim_id = str(claim["claim_id"])
        chain_id = str(claim.get("chain_id") or f"CHAIN-{claim_id}")
        source_id = ensure_forensic_source(state, claim)
        claimant = str(claim.get("claimant") or "Unresolved claimant")
        claimant_bucket = stats_bucket(claimant_stats, claimant, "CLAIMANT")
        source_bucket = stats_bucket(source_stats, source_id, "SOURCE")
        for bucket in (claimant_bucket, source_bucket):
            bucket["claim_ids"].add(claim_id)
            bucket["source_ids"].add(source_id)
            if str(claim.get("contradiction_type") or "").upper() == "SELF_CORRECTION" or "CORRECTED" in {str(x).upper() for x in (claim.get("final_disposition") or [])}:
                bucket["corrections"] += 1

        propositions = claim.get("factual_propositions") or []
        if not propositions:
            propositions = [{
                "axis": "CLAIM",
                "proposition": claim.get("exact_translated_claim"),
                "disposition": (claim.get("final_disposition") or ["UNRESOLVED"])[0],
                "confidence": claim.get("confidence"),
                "basis": claim.get("analyst_note"),
            }]

        member_ids: list[str] = []
        for index, proposition in enumerate(propositions, 1):
            status = truth_status(proposition.get("disposition"))
            record_id = f"LL-EVO-{claim_id}-P{index:02d}"
            member_ids.append(record_id)
            later_evidence = list(dict.fromkeys(claim.get("later_evidence") or []))
            source_ids = list(dict.fromkeys([source_id, *later_evidence]))
            available_sources = {item["source_id"] for item in state["sources"]["records"]}
            source_ids = [item for item in source_ids if item in available_sources]
            record = {
                "claim_id": record_id,
                "original_claim_id": claim_id,
                "chain_id": chain_id,
                "actor": claimant,
                "claimant_type": claim.get("claimant_type"),
                "claim": claim.get("exact_translated_claim"),
                "proposition_axis": proposition.get("axis"),
                "proposition": proposition.get("proposition") or claim.get("exact_translated_claim"),
                "claim_category": "forensic_claim_evolution",
                "source_ids": source_ids,
                "truth_adjudication": status,
                "claim_test_status": claim_test_status(status),
                "deception_score": 0,
                "deception_basis": "No automatic deception finding. Proposition truth, correction history and claimant knowledge remain separate dimensions.",
                "knowledge_access": "NOT_ASSESSED_FOR_DECEPTION",
                "knowledge_access_note": "Claimant role may affect access to facts, but this migration does not infer knowing falsehood from role alone.",
                "event_tree": ["CLAIM", "ACTION_BEHAVIOR", "EXTERNAL_RESPONSE", "OBSERVED_YIELD", "CURRENT_ADJUDICATION"],
                "confidence": proposition.get("confidence") or claim.get("confidence"),
                "adjudication_basis": proposition.get("basis"),
                "event_time": claim.get("claim_date"),
                "knowledge_time": known_at,
                "original_source_url": claim.get("original_source_url"),
                "previous_claim_id": claim.get("previous_claim_id"),
                "next_replacement_claim_id": claim.get("next_replacement_claim_id"),
                "contradiction_type": claim.get("contradiction_type"),
                "subsequent_revision": claim.get("subsequent_iranian_revision"),
                "inherited_final_disposition": copy.deepcopy(claim.get("final_disposition") or []),
                "later_evidence": later_evidence,
                "taxonomy_tags": copy.deepcopy(claim.get("taxonomy_tags") or []),
                "what_would_change_rating": copy.deepcopy(proposition.get("evidence_that_would_change_assessment") or claim.get("evidence_that_would_change_assessment") or []),
            }
            proposition_records.append(gate3_core.wrap(
                record_id,
                record,
                {"kind": "FORENSIC_PROPOSITION_MIGRATION", "path": FORENSIC, "original_claim_id": claim_id, "proposition_index": index - 1},
            ))
            for bucket in (claimant_bucket, source_bucket):
                bucket["outcomes"][status] += 1
                bucket["propositions"] += 1

        chain_members[chain_id].append({
            "claim_id": claim_id,
            "claim_date": claim.get("claim_date"),
            "proposition_record_ids": member_ids,
            "previous_claim_id": claim.get("previous_claim_id"),
            "next_replacement_claim_id": claim.get("next_replacement_claim_id"),
            "contradiction_type": claim.get("contradiction_type"),
        })

    existing_ids = {item.get("entity_id") for item in state["entities"].get("narrative_claims", [])}
    for item in proposition_records:
        if item["entity_id"] in existing_ids:
            raise ValueError(f"Duplicate proposition-level Lie Ledger ID: {item['entity_id']}")
    state["entities"]["narrative_claims"].extend(proposition_records)

    granular_chains = []
    for chain_id, members in sorted(chain_members.items()):
        members = sorted(members, key=lambda item: (str(item.get("claim_date") or ""), item["claim_id"]))
        entity_id = stable("INFOCHAIN-EVO", chain_id)
        record = {
            "information_chain_id": entity_id,
            "source_chain_id": chain_id,
            "claim_ids": [item["claim_id"] for item in members],
            "members": members,
            "rule": "Preserve original claim, amplification, contradiction, correction and later adjudication without rewriting earlier knowledge.",
            "knowledge_time": known_at,
        }
        granular_chains.append(gate3_core.wrap(entity_id, record, {"kind": "FORENSIC_CHAIN_MIGRATION", "path": FORENSIC}))
    state["entities"]["information_chains"].extend(granular_chains)

    reliability = []
    source_lookup = {item["source_id"]: (item.get("record") or {}) for item in state["sources"]["records"]}
    for buckets in (claimant_stats, source_stats):
        for key, item in sorted(buckets.items()):
            entity_id = stable("REL", item["subject_type"], key)
            display = key
            if item["subject_type"] == "SOURCE":
                source_record = source_lookup.get(key) or {}
                display = source_record.get("outlet") or source_record.get("title") or key
            record = {
                "reliability_id": entity_id,
                "subject_type": item["subject_type"],
                "subject_id_or_name": key,
                "display_name": display,
                "claim_count": len(item["claim_ids"]),
                "proposition_count": item["propositions"],
                "proposition_outcomes": dict(sorted(item["outcomes"].items())),
                "correction_count": item["corrections"],
                "claim_ids": sorted(item["claim_ids"]),
                "source_ids": sorted(item["source_ids"]),
                "methodology": METHODOLOGY,
                "knowledge_time": known_at,
            }
            reliability.append(gate3_core.wrap(entity_id, record, {"kind": "FORENSIC_RELIABILITY_HISTORY", "path": FORENSIC}))
    state["entities"]["source_reliability"] = reliability

    return {
        "forensic_claims": len(claims),
        "forensic_propositions": len(proposition_records),
        "forensic_chains": len(chain_members),
        "reliability_records": len(reliability),
    }


def build_state(root: Path = ROOT) -> dict[str, Any]:
    root = Path(root).resolve()
    state = gate3_core.build_state(root)
    previous_source_count = state.get("counts", {}).get("source_records")
    hardening = normalize_forensic_claims(state, root)
    current_source_count = len(state["sources"]["records"])
    state.setdefault("counts", {})["v1_source_records"] = previous_source_count
    state["counts"].update({
        "source_records": current_source_count,
        "gate3_source_records": current_source_count,
        "gate3_forensic_claim_records": hardening["forensic_claims"],
        "gate3_forensic_proposition_records": hardening["forensic_propositions"],
        "gate3_forensic_information_chains": hardening["forensic_chains"],
        "gate3_source_reliability_records": hardening["reliability_records"],
        "gate3_narrative_claims": len(state["entities"]["narrative_claims"]),
    })
    identity_material = {
        "core_identity": state["release"]["canonical_state_identity_v2"],
        "source_count": current_source_count,
        "forensic_propositions": hardening["forensic_propositions"],
        "forensic_chains": hardening["forensic_chains"],
        "reliability_records": hardening["reliability_records"],
    }
    state["release"]["canonical_state_identity_v2_core"] = state["release"]["canonical_state_identity_v2"]
    state["release"]["canonical_state_identity_v2"] = "canonical-current-v2-" + digest(canonical_bytes(identity_material))[:16]
    state.setdefault("integrity", {}).update({
        "gate3_lie_ledger_hardening_complete": True,
        "source_reliability_populated": bool(hardening["reliability_records"]),
        "source_count_metadata_current": state["counts"]["source_records"] == current_source_count,
        "forensic_claim_evolution_proposition_migration_complete": hardening["forensic_claims"] == 37,
    })
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
        print("gate3 hardened canonical: PASS")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(f"gate3 hardened canonical: wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
