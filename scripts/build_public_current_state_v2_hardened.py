#!/usr/bin/env python3
"""Build the final Gate 3 public read model with neutral Lie Ledger governance."""
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
import build_public_current_state_v2 as public_core
import public_read_model_current_foundation as foundation

OUT = "data/public-current-state-v2.json"
SCHEMA = "schemas/public-current-state-v2.json"
GENERATOR = "scripts/build_public_current_state_v2_hardened.py"
GENERATOR_VERSION = "2.5-current-foundation"
ISSUE140_HANDOFF = "data/evidence-integration/public-product-issue140-readjudication-handoff-20260918.json"


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def public_proposition(record: dict[str, Any]) -> dict[str, Any]:
    """Project a canonical v2 proposition to the public model.

    A publication blocker affecting knowledge/intent withholds the unqualified
    knowledge conclusion; it does not erase or downgrade an independently
    supported factual adjudication.
    """
    result = copy.deepcopy(record)
    status = result.get("publication_status")
    if status == "BLOCKED_EVIDENCE_COMPLETION":
        result["canonical_assessment_withheld"] = True
        result["public_knowledge_judgment"] = "WITHHELD_PENDING_EVIDENCE_QUALIFICATION"
        result["public_combined_assessment"] = "EVIDENCE COMPLETION REQUIRED"
        result.pop("knowledge_judgment", None)
        result.pop("combined_assessment", None)
        result.pop("analytic_inference", None)
        result.pop("comparative_assessment", None)
    elif status == "NOT_REASSESSED":
        result["canonical_assessment_withheld"] = True
        result["public_knowledge_judgment"] = "NOT_ASSESSED"
        result["public_combined_assessment"] = "NOT YET REASSESSED"
        result.pop("knowledge_judgment", None)
        result.pop("combined_assessment", None)
        result.pop("analytic_inference", None)
        result.pop("comparative_assessment", None)
    else:
        result["canonical_assessment_withheld"] = False
        result["public_knowledge_judgment"] = result.get("knowledge_judgment")
        result["public_combined_assessment"] = result.get("combined_assessment")
    result.pop("legacy_semantics", None)
    return result



def _entity_records(canonical: dict[str, Any], key: str) -> list[tuple[str, dict[str, Any]]]:
    rows: list[tuple[str, dict[str, Any]]] = []
    for item in (canonical.get("entities") or {}).get(key) or []:
        record = unwrap(item)
        entity_id = str(item.get("entity_id") or record.get("entity_id") or "")
        if entity_id and isinstance(record, dict):
            rows.append((entity_id, record))
    return rows


def _reader_record_sort(record: dict[str, Any]) -> tuple[str, str, str]:
    statement = record.get("statement_time") or {}
    return (
        str(statement.get("date") or record.get("event_time") or record.get("knowledge_time") or ""),
        str(statement.get("display_time") or ""),
        str(record.get("claim_instance_id") or record.get("reader_branch_id") or record.get("claim_id") or ""),
    )


def _reader_branch_key(record: dict[str, Any]) -> str:
    return str(
        record.get("proposition_id")
        or record.get("claim_id")
        or record.get("reader_branch_id")
        or record.get("claim_instance_id")
        or record.get("proposition")
        or ""
    )


def _reader_overlay_record(
    entity_id: str,
    overlay: dict[str, Any],
    claims_by_id: dict[str, dict[str, Any]],
    handoff_by_claim: dict[str, dict[str, Any]],
    handoff_by_overlay: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    claim_id = str(overlay.get("claim_id") or "")
    claim = claims_by_id.get(claim_id) or {}
    statement_date = str(
        claim.get("claim_time")
        or overlay.get("event_time")
        or overlay.get("knowledge_time")
        or ""
    )[:10]
    revision = claim.get("assessment_revision") or {}
    handoff = handoff_by_overlay.get(entity_id) or handoff_by_claim.get(claim_id) or {}
    reason = str(handoff.get("reason") or handoff.get("note") or revision.get("reason") or "").strip()
    return {
        "reader_branch_id": entity_id,
        "claim_id": claim_id or entity_id,
        "original_claim_id": claim_id or entity_id,
        "chain_id": overlay.get("chain_id"),
        "actor": claim.get("claimant") or overlay.get("actor") or "Claimant not identified",
        "actor_role": overlay.get("actor_role") or "ORIGINATOR",
        "claim": claim.get("claim") or overlay.get("proposition"),
        "proposition": overlay.get("proposition") or claim.get("claim"),
        "proposition_axis": overlay.get("proposition_axis") or claim.get("proposition_type"),
        "relation_type": overlay.get("relation_type") or "ORIGINATION",
        "statement_time": {
            "date": statement_date or None,
            "display_time": None,
            "precision": "DATE_ONLY" if statement_date else "UNRESOLVED",
        },
        "truth_adjudication": overlay.get("truth_adjudication") or claim.get("truth_adjudication") or "UNRESOLVED",
        "truth_qualifier": overlay.get("truth_qualifier") or claim.get("truth_qualifier"),
        "evidence_disposition": overlay.get("evidence_disposition") or claim.get("evidence_disposition"),
        "knowledge_judgment": overlay.get("knowledge_judgment") or claim.get("knowledge_judgment"),
        "public_knowledge_judgment": overlay.get("knowledge_judgment") or claim.get("knowledge_judgment"),
        "combined_assessment": overlay.get("combined_assessment") or claim.get("adjudication"),
        "public_combined_assessment": overlay.get("combined_assessment") or claim.get("adjudication"),
        "reader_reason": reason or None,
        "source_ids": sorted(set((overlay.get("source_ids") or []) + (claim.get("source_ids") or []))),
        "counts_as_unique_proposition": bool(overlay.get("counts_as_unique_proposition", True)),
        "denominator_class": overlay.get("denominator_class") or "UNIQUE_ATOMIC_PROPOSITION",
        "lifecycle_status": overlay.get("lifecycle_status") or "ACTIVE",
        "knowledge_time": overlay.get("knowledge_time") or claim.get("knowledge_time"),
        "canonical_assessment_withheld": False,
    }


def _issue140_reader_findings(root: Path, canonical: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    handoff = json.loads((root / ISSUE140_HANDOFF).read_text(encoding="utf-8"))
    if handoff.get("artifact_role") != "PUBLIC_PRODUCT_ISSUE140_READJUDICATION_HANDOFF":
        raise ValueError("Issue #140 Public Product handoff role mismatch")
    accepted = canonical.get("accepted_updates_v2") or []
    packet_id = str(handoff.get("packet_id") or "")
    if not any(str(row.get("packet_id") or "") == packet_id for row in accepted):
        raise ValueError("Issue #140 Public Product handoff is not anchored to accepted canonical state")
    if handoff.get("evidence_cutoff") != (canonical.get("release") or {}).get("current_osint_cutoff"):
        raise ValueError("Issue #140 Public Product handoff cutoff differs from canonical current cutoff")
    by_claim: dict[str, dict[str, Any]] = {}
    by_overlay: dict[str, dict[str, Any]] = {}
    for finding in (handoff.get("current_findings") or {}).values():
        if not isinstance(finding, dict):
            continue
        claim_id = str(finding.get("claim_id") or finding.get("legacy_claim_id") or "")
        overlay_id = str(finding.get("current_overlay_id") or "")
        if claim_id:
            by_claim[claim_id] = copy.deepcopy(finding)
        if overlay_id:
            by_overlay[overlay_id] = copy.deepcopy(finding)
    return by_claim, by_overlay


def _reader_cards(
    root: Path,
    canonical: dict[str, Any],
    chains: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, int]]:
    cards = {str(chain.get("chain_id")): copy.deepcopy(chain) for chain in chains if chain.get("chain_id")}
    claims_by_id = {entity_id: record for entity_id, record in _entity_records(canonical, "claims")}
    handoff_by_claim, handoff_by_overlay = _issue140_reader_findings(root, canonical)

    semantic_chains = {}
    for _, record in _entity_records(canonical, "information_chains"):
        chain_id = str(record.get("chain_id") or "")
        if chain_id and record.get("semantic_overlay") is True:
            semantic_chains[chain_id] = copy.deepcopy(record)

    families = []
    family_by_chain: dict[str, dict[str, Any]] = {}
    for entity_id, record in _entity_records(canonical, "narrative_families"):
        if record.get("family_type") != "CROSS_EVENT_RHETORICAL_NARRATIVE_FAMILY":
            continue
        family = {
            "narrative_family_id": record.get("narrative_family_id") or entity_id,
            "family_type": record.get("family_type"),
            "legacy_overgrouped_chain_id": record.get("legacy_overgrouped_chain_id"),
            "member_chain_ids": copy.deepcopy(record.get("member_chain_ids") or []),
            "rule": record.get("rule"),
        }
        families.append(family)
        for chain_id in family["member_chain_ids"]:
            family_by_chain[str(chain_id)] = family

    overlays: list[tuple[str, dict[str, Any]]] = []
    for entity_id, record in _entity_records(canonical, "narrative_claims"):
        if "atomic_proposition" in record or record.get("legacy_claim_instance_id"):
            overlays.append((entity_id, copy.deepcopy(record)))

    # Accepted corrective overlays replace the current projection of the same
    # proposition; they do not mutate the canonical historical adjudication row.
    for entity_id, overlay in overlays:
        legacy_instance = str(overlay.get("legacy_claim_instance_id") or "")
        if not legacy_instance:
            continue
        chain_id = str(overlay.get("chain_id") or "")
        card = cards.get(chain_id)
        if not card:
            raise ValueError(f"Public reader overlay references unknown chain: {entity_id} -> {chain_id}")
        target = next(
            (record for record in card.get("proposition_records") or []
             if str(record.get("claim_instance_id") or "") == legacy_instance),
            None,
        )
        if target is None:
            raise ValueError(f"Public reader overlay target is absent: {entity_id} -> {legacy_instance}")
        original_proposition = target.get("proposition")
        handoff = handoff_by_overlay.get(entity_id) or handoff_by_claim.get(str(overlay.get("claim_id") or "")) or {}
        target.update({
            "truth_adjudication": overlay.get("truth_adjudication") or target.get("truth_adjudication"),
            "truth_qualifier": overlay.get("truth_qualifier") or target.get("truth_qualifier"),
            "evidence_disposition": overlay.get("evidence_disposition") or target.get("evidence_disposition"),
            "knowledge_judgment": overlay.get("knowledge_judgment") or target.get("knowledge_judgment"),
            "public_knowledge_judgment": overlay.get("knowledge_judgment") or target.get("public_knowledge_judgment"),
            "combined_assessment": overlay.get("combined_assessment") or target.get("combined_assessment"),
            "public_combined_assessment": overlay.get("combined_assessment") or target.get("public_combined_assessment"),
            "knowledge_time": overlay.get("knowledge_time") or target.get("knowledge_time"),
            "reader_reason": handoff.get("reason") or handoff.get("note") or overlay.get("proposition"),
            "current_relation_type": overlay.get("relation_type"),
            "current_overlay_id": entity_id,
            "source_ids": sorted(set((target.get("source_ids") or []) + (overlay.get("source_ids") or []))),
        })
        target["proposition"] = original_proposition

    # New accepted propositions (for example the Sep. 16/17 Qeshm branches)
    # are projected directly from canonical current entities.
    for entity_id, overlay in overlays:
        if overlay.get("legacy_claim_instance_id"):
            continue
        chain_id = str(overlay.get("chain_id") or "")
        if not chain_id:
            continue
        card = cards.setdefault(chain_id, {
            "semantic_version": "2.0",
            "chain_id": chain_id,
            "primary_object": "NARRATIVE_PROPOSITION_CHAIN",
            "proposition_records": [],
            "chronology": [],
            "source_ids": [],
        })
        branch = _reader_overlay_record(entity_id, overlay, claims_by_id, handoff_by_claim, handoff_by_overlay)
        card.setdefault("proposition_records", []).append(branch)

    # The historical regional false-flag bucket is an accepted cross-event
    # narrative family, not one continuous incident. Split it only through the
    # explicit claim->incident relationships supplied by the semantic overlays.
    claim_to_incident_chain: dict[str, str] = {}
    for chain_id, semantic in semantic_chains.items():
        if semantic.get("case_classification") != "INCIDENT_SPECIFIC_NARRATIVE_CHAIN":
            continue
        for claim_id in semantic.get("claim_ids") or []:
            claim_to_incident_chain[str(claim_id)] = chain_id
    for family in families:
        legacy_chain_id = str(family.get("legacy_overgrouped_chain_id") or "")
        if not legacy_chain_id or legacy_chain_id not in cards:
            continue
        legacy = cards.pop(legacy_chain_id)
        for record in legacy.get("proposition_records") or []:
            claim_id = str(record.get("original_claim_id") or record.get("claim_id") or "")
            target_chain = claim_to_incident_chain.get(claim_id)
            if not target_chain:
                raise ValueError(f"False-flag family record lacks incident relationship: {claim_id}")
            target = cards.setdefault(target_chain, {
                "semantic_version": "2.0",
                "chain_id": target_chain,
                "primary_object": "NARRATIVE_PROPOSITION_CHAIN",
                "proposition_records": [],
                "chronology": [],
                "source_ids": [],
            })
            target.setdefault("proposition_records", []).append(copy.deepcopy(record))

    reader_cards: list[dict[str, Any]] = []
    for chain_id, card in sorted(cards.items()):
        semantic = semantic_chains.get(chain_id) or {}
        records = sorted(card.get("proposition_records") or [], key=_reader_record_sort)
        if not records:
            continue
        non_accusation_context = all(
            record.get("denominator_class") == "NON_ACCUSATION_CONTEXT"
            for record in records
        )
        classification = (
            semantic.get("case_classification")
            or ("ADMISSION_LATENCY_CONTROL" if non_accusation_context else "ACCUSATION_CHAIN")
        )
        accusation = semantic.get("lie_ledger_accusation")
        if accusation is None:
            accusation = classification != "ADMISSION_LATENCY_CONTROL"
        source_ids = sorted({
            source_id
            for record in records
            for source_id in record.get("source_ids") or []
        })
        result = {
            "chain_id": chain_id,
            "primary_object": "NARRATIVE_PROPOSITION_CHAIN",
            "classification": classification,
            "lie_ledger_accusation": bool(accusation),
            "branch_axes": copy.deepcopy(semantic.get("branch_axes") or []),
            "reader_contract": semantic.get("reader_contract"),
            "adjudication_rule": semantic.get("adjudication_rule"),
            "proposition_records": records,
            "source_ids": source_ids,
        }
        family = family_by_chain.get(chain_id)
        if family:
            result["narrative_family"] = copy.deepcopy(family)
        reader_cards.append(result)

    narrative_cards = [card for card in reader_cards if card["lie_ledger_accusation"]]
    context_cards = [card for card in reader_cards if not card["lie_ledger_accusation"]]
    branch_keys = {
        (card["chain_id"], _reader_branch_key(record))
        for card in reader_cards
        for record in card["proposition_records"]
        if _reader_branch_key(record)
    }
    metrics = {
        "narrative_cards": len(narrative_cards),
        "context_cards": len(context_cards),
        "branch_findings": len(branch_keys),
        "proposition_records": sum(len(card["proposition_records"]) for card in reader_cards),
        "narrative_families": len(families),
    }
    return reader_cards, families, metrics


def project_lie_ledger_v2(state: dict[str, Any], canonical: dict[str, Any], root: Path = ROOT) -> None:
    chains = []
    for wrapped in canonical["entities"].get("lie_ledger_chains_v2") or []:
        chain = copy.deepcopy(unwrap(wrapped))
        chain["proposition_records"] = [
            public_proposition(record)
            for record in chain.get("proposition_records") or []
        ]
        chain["chronology"] = []
        for record in chain["proposition_records"]:
            chain["chronology"].append({
                "claim_instance_id": record["claim_instance_id"],
                "statement_time": copy.deepcopy(record.get("statement_time")),
                "relation_type": record.get("relation_type"),
                "actor_role": record.get("actor_role"),
                "truth_adjudication": record.get("truth_adjudication"),
                "knowledge_judgment": record.get("public_knowledge_judgment"),
                "combined_assessment": record.get("public_combined_assessment"),
                "publication_status": record.get("publication_status"),
            })
        chain.pop("historical_assessment", None)
        chains.append(chain)

    governance = canonical.get("lie_ledger_v2_governance") or {}
    reader_cards, reader_families, reader_metrics = _reader_cards(root, canonical, chains)
    gate3 = state.setdefault("gate3", {})
    public_ledger = {
        "schema_version": "2.0",
        "governance_version": governance.get("governance_version"),
        "contract_version": governance.get("contract_version"),
        "contract_path": governance.get("contract_path"),
        "primary_object": "NARRATIVE_PROPOSITION_CHAIN",
        "records": chains,
        "reader_cards": reader_cards,
        "reader_families": reader_families,
        "reader_metrics": reader_metrics,
        "metrics": copy.deepcopy(canonical.get("lie_ledger_v2_metrics") or {}),
        "publication_blockers": copy.deepcopy(canonical.get("lie_ledger_v2_publication_blockers") or []),
        "blocked_assessment_policy": governance.get("blocked_assessment_policy"),
    }
    gate3["lie_ledger"] = public_ledger
    state["datasets"]["gate3.lie_ledger"] = public_core.dataset(
        "gate3.lie_ledger",
        public_core.CANONICAL_V2,
        public_ledger,
        public_core.source_reference_index(canonical),
    )
    counts = state.setdefault("counts", {})
    counts["gate3_lie_ledger_chains"] = len(chains)
    counts["gate3_lie_ledger_records"] = sum(
        len(chain.get("proposition_records") or [])
        for chain in chains
    )
    counts["gate3_lie_ledger_unique_propositions"] = int(
        (canonical.get("lie_ledger_v2_metrics") or {}).get("unique_propositions") or 0
    )
    counts["gate3_lie_ledger_claim_instances"] = int(
        (canonical.get("lie_ledger_v2_metrics") or {}).get("claim_instances") or 0
    )
    counts["gate3_lie_ledger_reader_narratives"] = reader_metrics["narrative_cards"]
    counts["gate3_lie_ledger_reader_contexts"] = reader_metrics["context_cards"]
    counts["gate3_lie_ledger_reader_branches"] = reader_metrics["branch_findings"]


def build_state(root: Path = ROOT) -> dict[str, Any]:
    root = Path(root).resolve()
    state = public_core.build_state(root)
    actual = len((state.get("sources") or {}).get("records") or [])
    counts = state.setdefault("counts", {})
    counts["source_records"] = actual
    counts["canonical_source_records"] = actual
    counts["gate3_source_records"] = actual

    canonical = json.loads((root / "data/canonical-current-state-v2.json").read_text(encoding="utf-8"))
    project_lie_ledger_v2(state, canonical, root)

    counts["material_loss_records"] = len(canonical["entities"].get("material_losses") or [])
    counts["relationship_records"] = len(canonical["entities"].get("relationships") or [])
    counts["gate3_source_reliability_records"] = len(canonical["entities"].get("source_reliability") or [])
    counts["gate3_forensic_proposition_records"] = canonical["counts"].get("gate3_forensic_proposition_records", 0)
    counts["gate3_daily_coverage_days"] = len(canonical.get("daily_coverage") or [])
    counts["chronology_referenced_sources"] = len({
        source_id for item in state.get("chronology") or [] for source_id in item.get("source_ids") or []
    })
    counts["page_dataset_referenced_sources"] = len(
        foundation.extract_source_ids(state.get("datasets") or {})
    )

    input_roles = {
        "data/canonical-current-state-v2.json": "DERIVED_GATE3_CANONICAL_CURRENT_STATE",
        "data/lie-ledger-v2-evidence-adjudications.json": "ACTIVE_LIE_LEDGER_EVIDENCE_ADJUDICATION_SET",
        "data/lie-ledger-v2-evidence-sources-20260909.json": "LIE_LEDGER_EVIDENCE_SOURCE_REGISTRY",
        "docs/LIE_LEDGER_EVIDENCE_ADJUDICATION_CONTRACT.md": "ACTIVE_LIE_LEDGER_EVIDENCE_CONTRACT",
        "scripts/build_lie_ledger_evidence_adjudication.py": "ACTIVE_LIE_LEDGER_EVIDENCE_BUILDER",
        "schemas/lie-ledger-evidence-adjudication-v2.json": "ACTIVE_LIE_LEDGER_EVIDENCE_SCHEMA",
        "scripts/build_public_current_state_v2.py": "GATE3_PUBLIC_READ_MODEL_GENERATOR",
        "scripts/public_read_model_current_foundation.py": "CURRENT_PUBLIC_READ_MODEL_FOUNDATION",
        GENERATOR: "PHASE9_PUBLIC_READ_MODEL_GENERATOR",
        ISSUE140_HANDOFF: "PUBLIC_PRODUCT_ACCEPTED_READJUDICATION_HANDOFF",
        SCHEMA: "PHASE9_PUBLIC_READ_MODEL_SCHEMA",
    }
    input_files = {item["path"]: item for item in state.get("input_files") or []}
    for path, role in input_roles.items():
        raw = foundation.canonical_input_bytes((root / path).read_bytes())
        input_files[path] = {
            "path": path,
            "sha256": sha256(raw),
            "bytes": len(raw),
            "hash_basis": "UTF8_LF_NORMALIZED",
            "roles": [role],
        }
    state["input_files"] = [input_files[path] for path in sorted(input_files)]
    input_set_material = "".join(
        f"{item['path']}\0{item['sha256']}\n" for item in state["input_files"]
    ).encode("utf-8")
    input_set_sha256 = sha256(input_set_material)
    state["release"]["input_set_sha256"] = input_set_sha256
    state["release"]["release_identity"] = f"public-current-v2-{input_set_sha256[:16]}"
    state["release"]["lie_ledger_governance_version"] = canonical["release"].get("lie_ledger_governance_version")
    state["release"]["lie_ledger_contract_version"] = canonical["release"]["lie_ledger_contract_version"]
    state["release"]["lie_ledger_contract_path"] = canonical["release"].get("lie_ledger_contract_path")
    state["release"]["lie_ledger_adjudication_version"] = canonical["release"].get("lie_ledger_adjudication_version")
    state["release"]["lie_ledger_adjudication_record_sha256"] = canonical["release"].get("lie_ledger_adjudication_record_sha256")
    state["release"]["lie_ledger_evidence_completion_version"] = canonical["release"].get("lie_ledger_evidence_completion_version")
    state["release"]["lie_ledger_current_claim_update_version"] = canonical["release"].get("lie_ledger_current_claim_update_version")
    generator_raw = foundation.canonical_input_bytes((root / GENERATOR).read_bytes())
    schema_raw = foundation.canonical_input_bytes((root / SCHEMA).read_bytes())
    state["generator"] = {
        "version": GENERATOR_VERSION,
        "script_path": GENERATOR,
        "script_sha256": sha256(generator_raw),
        "schema_path": SCHEMA,
        "schema_sha256": sha256(schema_raw),
    }
    state.setdefault("integrity", {}).update({
        "source_count_metadata_current": counts["source_records"] == actual,
        "material_loss_count_metadata_current": counts["material_loss_records"] == len(canonical["entities"].get("material_losses") or []),
        "relationship_count_metadata_current": counts["relationship_records"] == len(canonical["entities"].get("relationships") or []),
        "source_reliability_populated": counts["gate3_source_reliability_records"] > 0,
        "lie_ledger_v2_forward_migration_active": True,
        "lie_ledger_truth_knowledge_axes_separate": True,
        "lie_ledger_primary_public_object_is_chain": True,
        "lie_ledger_blocked_assessments_withheld_not_downgraded": True,
        "lie_ledger_component_evidence_refs_public": True,
        "lie_ledger_active_adjudication_input_neutral": True,
        "lie_ledger_historical_handoffs_are_migration_provenance_only": True,
        "lie_ledger_active_persona_authority_removed": True,
        "current_foundation_direct_from_canonical_v2": True,
        "historical_public_v1_compiler_in_active_input_graph": False,
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
        print("gate3 hardened public state: PASS")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(f"gate3 hardened public state: wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
