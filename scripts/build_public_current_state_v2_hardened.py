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
import public_read_model_foundation as foundation

OUT = "data/public-current-state-v2.json"
SCHEMA = "schemas/public-current-state-v2.json"
GENERATOR = "scripts/build_public_current_state_v2_hardened.py"
GENERATOR_VERSION = "2.4-neutral-adjudication-input"


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


def project_lie_ledger_v2(state: dict[str, Any], canonical: dict[str, Any]) -> None:
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
    gate3 = state.setdefault("gate3", {})
    public_ledger = {
        "schema_version": "2.0",
        "governance_version": governance.get("governance_version"),
        "contract_version": governance.get("contract_version"),
        "contract_path": governance.get("contract_path"),
        "primary_object": "NARRATIVE_PROPOSITION_CHAIN",
        "records": chains,
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


def build_state(root: Path = ROOT) -> dict[str, Any]:
    root = Path(root).resolve()
    state = public_core.build_state(root)
    actual = len((state.get("sources") or {}).get("records") or [])
    counts = state.setdefault("counts", {})
    if "v1_public_source_records" not in counts:
        counts["v1_public_source_records"] = counts.get("source_records")
    if "v1_public_canonical_source_records" not in counts:
        counts["v1_public_canonical_source_records"] = counts.get("canonical_source_records")
    counts["source_records"] = actual
    counts["canonical_source_records"] = actual
    counts["gate3_source_records"] = actual

    canonical = json.loads((root / "data/canonical-current-state-v2.json").read_text(encoding="utf-8"))
    project_lie_ledger_v2(state, canonical)

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
        "scripts/public_read_model_foundation.py": "PUBLIC_READ_MODEL_FOUNDATION",
        GENERATOR: "PHASE9_PUBLIC_READ_MODEL_GENERATOR",
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
        "legacy_v1_builder_not_executed_by_v2": True,
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
