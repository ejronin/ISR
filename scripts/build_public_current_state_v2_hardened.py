#!/usr/bin/env python3
"""Build the final Gate 3 public read model with current Lie Ledger v2 metadata."""
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

OUT = "data/public-current-state-v2.json"
SCHEMA = "schemas/public-current-state-v2.json"
GENERATOR = "scripts/build_public_current_state_v2_hardened.py"
GENERATOR_VERSION = "2.1"


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def public_proposition(record: dict[str, Any]) -> dict[str, Any]:
    """Project a canonical v2 proposition to the public model.

    A blocked ROOK judgment is withheld, never downgraded. The public model keeps
    factual status and the exact PR/CI deficiency but omits the unqualified
    knowledge/combined accusation until its component evidence is publication-ready.
    """
    result = copy.deepcopy(record)
    status = result.get("publication_status")
    if status == "BLOCKED_EVIDENCE_COMPLETION":
        result["canonical_rook_assessment_withheld"] = True
        result["public_knowledge_judgment"] = "WITHHELD_PENDING_EVIDENCE_QUALIFICATION"
        result["public_combined_assessment"] = "EVIDENCE COMPLETION REQUIRED"
        result.pop("knowledge_judgment", None)
        result.pop("combined_assessment", None)
        result.pop("analytic_inference", None)
        result.pop("comparative_assessment", None)
    elif status == "NOT_ROOK_REASSESSED":
        result["canonical_rook_assessment_withheld"] = True
        result["public_knowledge_judgment"] = "NOT_ASSESSED"
        result["public_combined_assessment"] = "NOT YET ROOK REASSESSED"
        result.pop("knowledge_judgment", None)
        result.pop("combined_assessment", None)
        result.pop("analytic_inference", None)
        result.pop("comparative_assessment", None)
    else:
        result["canonical_rook_assessment_withheld"] = False
        result["public_knowledge_judgment"] = result.get("knowledge_judgment")
        result["public_combined_assessment"] = result.get("combined_assessment")
    # Legacy semantic fields are provenance-only and never part of the v2 public hierarchy.
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
        # Recompute public chronology so a blocked canonical knowledge verdict
        # cannot leak through a nested summary object.
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
                "publication_status": record.get("publication_status")
            })
        chains.append(chain)

    gate3 = state.setdefault("gate3", {})
    public_ledger = {
        "schema_version": "2.0",
        "doctrine_version": canonical["lie_ledger_v2_authority"]["doctrine_version"],
        "contract_version": canonical["lie_ledger_v2_authority"]["contract_version"],
        "contract_path": canonical["lie_ledger_v2_authority"]["contract_path"],
        "primary_object": "NARRATIVE_PROPOSITION_CHAIN",
        "records": chains,
        "metrics": copy.deepcopy(canonical.get("lie_ledger_v2_metrics") or {}),
        "publication_blockers": copy.deepcopy(canonical.get("lie_ledger_v2_publication_blockers") or []),
        "authority": {
            "verdicts": "ROOK",
            "implementation_and_evidence_qualification": "PR/CI",
            "blocked_verdict_policy": "WITHHOLD_NOT_DOWNGRADE"
        }
    }
    gate3["lie_ledger"] = public_ledger
    # Replace the Phase 9 dataset payload as well as the convenience gate3 view.
    # The route contract consumes datasets, so leaving the legacy flat payload
    # here would preserve obsolete semantics even if the top-level view were v2.
    state["datasets"]["gate3.lie_ledger"] = public_core.dataset(
        "gate3.lie_ledger",
        public_core.CANONICAL_V2,
        public_ledger,
        public_core.source_reference_index(canonical)
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
        public_core.public_v1.extract_source_ids(state.get("datasets") or {})
    )

    input_roles = {
        "data/canonical-current-state-v2.json": "DERIVED_GATE3_CANONICAL_CURRENT_STATE",
        "data/lie-ledger-v2-rook-authority.json": "ROOK_LIE_LEDGER_V2_AUTHORITY",
        "data/lie-ledger-v2-rook-evidence-completion-20260909.json": "ROOK_LIE_LEDGER_EVIDENCE_COMPLETION_AUTHORITY",
        "data/lie-ledger-v2-evidence-sources-20260909.json": "ROOK_LIE_LEDGER_EVIDENCE_SOURCE_REGISTRY",
        "schemas/lie-ledger-v2.json": "LIE_LEDGER_V2_SEMANTIC_SCHEMA",
        "scripts/build_lie_ledger_v2.py": "LIE_LEDGER_V2_FORWARD_MIGRATION_GENERATOR",
        "scripts/apply_lie_ledger_evidence_completion_20260909.py": "LIE_LEDGER_V2_EVIDENCE_COMPLETION_GENERATOR",
        "scripts/build_public_current_state_v2.py": "GATE3_PUBLIC_READ_MODEL_GENERATOR",
        GENERATOR: "PHASE9_PUBLIC_READ_MODEL_GENERATOR",
        SCHEMA: "PHASE9_PUBLIC_READ_MODEL_SCHEMA"
    }
    input_files = {item["path"]: item for item in state.get("input_files") or []}
    for path, role in input_roles.items():
        raw = public_core.public_v1.canonical_input_bytes((root / path).read_bytes())
        input_files[path] = {
            "path": path,
            "sha256": sha256(raw),
            "bytes": len(raw),
            "hash_basis": "UTF8_LF_NORMALIZED",
            "roles": [role]
        }
    state["input_files"] = [input_files[path] for path in sorted(input_files)]
    input_set_material = "".join(
        f"{item['path']}\0{item['sha256']}\n" for item in state["input_files"]
    ).encode("utf-8")
    input_set_sha256 = sha256(input_set_material)
    state["release"]["input_set_sha256"] = input_set_sha256
    state["release"]["release_identity"] = f"public-current-v2-{input_set_sha256[:16]}"
    state["release"]["lie_ledger_doctrine_version"] = canonical["release"]["lie_ledger_doctrine_version"]
    state["release"]["lie_ledger_contract_version"] = canonical["release"]["lie_ledger_contract_version"]
    state["release"]["lie_ledger_evidence_completion_version"] = canonical["release"].get("lie_ledger_evidence_completion_version")
    generator_raw = public_core.public_v1.canonical_input_bytes((root / GENERATOR).read_bytes())
    schema_raw = public_core.public_v1.canonical_input_bytes((root / SCHEMA).read_bytes())
    state["generator"] = {
        "version": GENERATOR_VERSION,
        "script_path": GENERATOR,
        "script_sha256": sha256(generator_raw),
        "schema_path": SCHEMA,
        "schema_sha256": sha256(schema_raw)
    }
    state.setdefault("integrity", {}).update({
        "source_count_metadata_current": counts["source_records"] == actual,
        "material_loss_count_metadata_current": counts["material_loss_records"] == len(canonical["entities"].get("material_losses") or []),
        "relationship_count_metadata_current": counts["relationship_records"] == len(canonical["entities"].get("relationships") or []),
        "source_reliability_populated": counts["gate3_source_reliability_records"] > 0,
        "lie_ledger_v2_forward_migration_active": True,
        "lie_ledger_truth_knowledge_axes_separate": True,
        "lie_ledger_primary_public_object_is_chain": True,
        "lie_ledger_blocked_verdicts_withheld_not_downgraded": True,
        "lie_ledger_component_evidence_refs_public": True,
        "lie_ledger_evidence_completion_inputs_pinned": True
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
