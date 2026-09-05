#!/usr/bin/env python3
"""Build the Gate 3 public read model after validating the v1 public contract."""
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
import build_public_current_state as public_v1

CANONICAL_V1 = "data/canonical-current-state.json"
CANONICAL_V2 = "data/canonical-current-state-v2.json"
DEFAULT_OUTPUT = "data/public-current-state-v2.json"

PHASE9_PAGE_DATASET_ADDITIONS = {
    "start_here": ("gate3.gaps",),
    "timeline": ("gate3.daily_coverage",),
    "military_record": ("gate3.casualties", "gate3.facilities", "gate3.movements"),
    "hormuz_economy": ("gate3.shipping", "gate3.economics"),
    "diplomacy_mou": ("gate3.agreements", "gate3.diplomacy"),
    "claims_sources": (
        "gate3.lie_ledger",
        "gate3.narrative_families",
        "gate3.information_chains",
        "gate3.source_reliability",
    ),
}

AUDIT_ONLY_GATE3_DATASETS = {
    "gate3.legacy_dispositions": "Migration dispositions remain available for audit but are not reader-facing evidence.",
    "gate3.side_ledger_dispositions": "Side-ledger migration dispositions remain available for audit but are not reader-facing evidence.",
}


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def entity_payload(canonical: dict[str, Any], key: str) -> dict[str, Any]:
    return {
        "schema_version": "2.0",
        "records": [copy.deepcopy(item.get("record") or item) for item in canonical["entities"].get(key, [])],
    }


def source_reference_index(canonical: dict[str, Any]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for item in (canonical.get("sources") or {}).get("records") or []:
        source_id = item["source_id"]
        variants = [variant["variant_key"] for variant in item.get("variants") or [] if variant.get("variant_key")]
        index[source_id] = {
            "source_id": source_id,
            "variant_keys": variants,
            "resolution": "UNAMBIGUOUS" if len(variants) == 1 else "PROVENANCE_CONTEXT_REQUIRED",
        }
    return index


def public_chronology(canonical: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Resolve generated chronology source pointers without choosing conflicts.

    Gate 3 preserves some derived side/legacy reference keys that do not name a
    catalog variant.  The public projection may select the sole variant when
    there is only one.  Where multiple versions exist it deliberately removes
    the invalid key so the shared resolver displays every preserved variant.
    Canonical evidence and source records remain unchanged.
    """
    variants = {
        item["source_id"]: [variant["variant_key"] for variant in item.get("variants") or []]
        for item in (canonical.get("sources") or {}).get("records") or []
    }
    chronology = copy.deepcopy(canonical.get("chronology") or [])
    repaired = 0
    conflict_unscoped = 0
    for item in chronology:
        references = []
        for reference in item.get("source_references") or []:
            source_id = reference["source_id"]
            available = variants.get(source_id) or []
            if reference.get("variant_key") in available:
                references.append(reference)
            elif len(available) == 1:
                references.append({"source_id": source_id, "variant_key": available[0]})
                repaired += 1
            else:
                references.append({"source_id": source_id})
                repaired += 1
                conflict_unscoped += 1
        item["source_references"] = references
    return chronology, {"repaired": repaired, "conflict_unscoped": conflict_unscoped}


def dataset(
    key: str,
    path: str,
    payload: Any,
    source_index: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    referenced = sorted(public_v1.extract_source_ids(payload))
    unresolved = [source_id for source_id in referenced if source_id not in source_index]
    if unresolved:
        raise ValueError(f"Gate 3 dataset {key} has unresolved sources: {unresolved}")
    return {
        "key": key,
        "path": path,
        "role": "DERIVED_GATE3_CANONICAL_DATASET",
        "payload": copy.deepcopy(payload),
        "media_type": "application/json",
        "sha256": sha256(canonical_bytes(payload)),
        "hash_basis": "CANONICAL_DATASET_PAYLOAD_JSON",
        "source_references": [copy.deepcopy(source_index[source_id]) for source_id in referenced],
    }


def add_phase9_page_data(state: dict[str, Any]) -> None:
    for page, additions in PHASE9_PAGE_DATASET_ADDITIONS.items():
        mapping = state["page_data"].get(page)
        if not mapping:
            raise ValueError(f"Phase 9 page-data owner is missing: {page}")
        mapping["dataset_keys"] = list(dict.fromkeys([*mapping["dataset_keys"], *additions]))


def add_gate3_waivers(state: dict[str, Any]) -> None:
    waivers = state["consumer_coverage"]["dataset_waivers"]
    present = {item["dataset_key"] for item in waivers}
    for key, reason in AUDIT_ONLY_GATE3_DATASETS.items():
        if key in present:
            continue
        waivers.append({
            "dataset_key": key,
            "reason": reason,
            "authority_role": "DERIVED_GATE3_CANONICAL_DATASET",
            "owner": "Gate 3 migration authority audit",
        })
    for waiver in waivers:
        dataset_item = state["datasets"].get(waiver["dataset_key"])
        if dataset_item:
            waiver["authority_role"] = dataset_item["role"]


def build_state(root: Path = ROOT) -> dict[str, Any]:
    root = Path(root).resolve()
    if not (root / CANONICAL_V1).is_file():
        raise ValueError("Build data/canonical-current-state.json before Gate 3 public state")
    canonical_path = root / CANONICAL_V2
    canonical = json.loads(canonical_path.read_text(encoding="utf-8"))
    if canonical.get("schema_version") != "2.0":
        raise ValueError("Gate 3 public builder requires canonical-current-state-v2")

    # This validates the sealed v1 authority and materializes its accepted
    # public-only identity additions before Gate 3 overlays the current state.
    state = public_v1.build_state(root)
    v1_public_input_set = state["release"]["input_set_sha256"]
    v1_public_source_records = state["counts"].get("source_records")
    v1_public_canonical_source_records = state["counts"].get("canonical_source_records")
    public_actor_directory = copy.deepcopy(state["datasets"]["current.actors"]["payload"])
    source_index = source_reference_index(canonical)

    state["schema_version"] = "2.0"
    state["artifact_role"] = "DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL"
    state["authority_notice"] = (
        "Generated public view of the validated Gate 3 current state. The sealed v1 state and append-only "
        "Gate 3 evidence packets remain authoritative; the browser does not replay update history."
    )
    chronology, chronology_reference_repairs = public_chronology(canonical)
    state["chronology"] = chronology
    state["sources"] = copy.deepcopy(canonical["sources"])
    state["entities"] = copy.deepcopy(canonical["entities"])
    state["revision_history"] = copy.deepcopy(canonical.get("revision_history") or [])
    state["accepted_updates_v2"] = copy.deepcopy(canonical.get("accepted_updates_v2") or [])

    release = canonical["release"]
    canonical_digest = sha256(public_v1.canonical_input_bytes(canonical_path.read_bytes()))
    phase9_input_set = sha256(f"{v1_public_input_set}\0{canonical_digest}\n".encode("utf-8"))
    state["release"].update({
        "gate2_evidence_cutoff": release["gate2_evidence_cutoff"],
        "canonical_state_identity_v2": release["canonical_state_identity_v2"],
        "current_osint_cutoff": release["current_osint_cutoff"],
        "current_osint_cutoff_display": release["current_osint_cutoff_display"],
        "input_set_sha256": phase9_input_set,
        "release_identity": f"public-current-v2-{phase9_input_set[:16]}",
    })
    state["canonical_lineage"].update({
        "path": CANONICAL_V2,
        "sha256": canonical_digest,
        "input_set_sha256": release["input_set_sha256"],
        "canonical_state_identity_v2": release["canonical_state_identity_v2"],
        "v1_path": CANONICAL_V1,
        "v1_sha256": sha256(public_v1.canonical_input_bytes((root / CANONICAL_V1).read_bytes())),
    })

    replacements = {
        # Retain the 115-record approved public directory. Gate 3's 96 canonical
        # actors are an unchanged subset; replacing the directory would discard
        # accepted participant and named-person identity links.
        "current.actors": public_actor_directory,
        "current.locations": copy.deepcopy(canonical["entities"].get("locations", [])),
        "current.claims": {
            "schema_version": "2.0",
            "claims": [copy.deepcopy(item["record"]) for item in canonical["entities"].get("claims", [])],
        },
        "current.material_losses": {
            "schema_version": "2.0",
            "records": [copy.deepcopy(item["record"]) for item in canonical["entities"].get("material_losses", [])],
        },
        "current.relationships": copy.deepcopy(canonical["entities"].get("relationships", [])),
    }
    for key, payload in replacements.items():
        state["datasets"][key] = dataset(key, CANONICAL_V2, payload, source_index)

    additions = {
        "gate3.casualties": entity_payload(canonical, "casualties"),
        "gate3.agreements": entity_payload(canonical, "agreements"),
        "gate3.diplomacy": entity_payload(canonical, "diplomacy"),
        "gate3.facilities": entity_payload(canonical, "facilities"),
        "gate3.movements": entity_payload(canonical, "movements"),
        "gate3.shipping": entity_payload(canonical, "shipping"),
        "gate3.economics": entity_payload(canonical, "economics"),
        "gate3.gaps": entity_payload(canonical, "gaps"),
        "gate3.lie_ledger": entity_payload(canonical, "narrative_claims"),
        "gate3.narrative_families": entity_payload(canonical, "narrative_families"),
        "gate3.information_chains": entity_payload(canonical, "information_chains"),
        "gate3.daily_coverage": {"schema_version": "2.0", "records": copy.deepcopy(canonical["daily_coverage"])},
        "gate3.legacy_dispositions": entity_payload(canonical, "legacy_dispositions"),
        "gate3.side_ledger_dispositions": entity_payload(canonical, "side_ledger_dispositions"),
        "gate3.source_reliability": entity_payload(canonical, "source_reliability"),
    }
    for key, payload in additions.items():
        state["datasets"][key] = dataset(key, CANONICAL_V2, payload, source_index)

    add_phase9_page_data(state)
    add_gate3_waivers(state)

    state["counts"].update({
        "chronology_records": len(canonical["chronology"]),
        "canonical_source_records": len(canonical["sources"].get("records") or []),
        "source_records": len(canonical["sources"].get("records") or []),
        "v1_public_source_records": v1_public_source_records,
        "v1_public_canonical_source_records": v1_public_canonical_source_records,
        "public_actor_records": len(public_actor_directory),
        "gate3_dataset_records": sum(
            len(payload.get("records") or []) for payload in additions.values() if isinstance(payload, dict)
        ),
        "gate3_chronology_records": len(canonical["chronology"]),
        "gate3_lie_ledger_records": len(canonical["entities"].get("narrative_claims") or []),
        "gate3_source_records": len(canonical["sources"].get("records") or []),
        "gate3_update_packets": len(canonical.get("accepted_updates_v2") or []),
        "chronology_source_reference_repairs": chronology_reference_repairs["repaired"],
        "chronology_source_conflicts_exposed": chronology_reference_repairs["conflict_unscoped"],
    })
    state["integrity"].update({
        "gate3_semantic_validation_ready": canonical["integrity"]["gate3_semantic_validation_ready"],
        "false_is_not_automatically_lie": True,
        "daily_coverage_derived_from_chronology": True,
        "war_daily_coverage_bounded_to_conflict": True,
        "browser_replays_update_packets": False,
        "v1_public_contract_validated_before_v2_overlay": True,
        "phase9_routes_consume_gate3_state": True,
    })
    return state


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    serialized = canonical_bytes(build_state(root))
    if args.check:
        if not output.is_file() or output.read_bytes() != serialized:
            raise SystemExit(f"FAIL: generated Gate 3 public state is missing or stale: {output}")
        print("gate3-public-current-state: PASS")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(f"gate3-public-current-state: wrote {output.relative_to(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
