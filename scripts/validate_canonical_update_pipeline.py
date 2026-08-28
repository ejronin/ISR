#!/usr/bin/env python3
"""Validate the Phase 3.5 canonical update ledger and derived entity state."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True

import build_canonical_current_state as compiler


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / compiler.DEFAULT_OUTPUT


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def raw_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    require(ARTIFACT.is_file(), f"generated canonical state is missing: {compiler.DEFAULT_OUTPUT}")
    artifact = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    inputs = [ROOT / item["path"] for item in artifact.get("input_files") or []]
    before = {path: raw_hash(path) for path in inputs}
    first, first_report = compiler.build_state(ROOT)
    second, second_report = compiler.build_state(ROOT)
    require(compiler.canonical_json_bytes(first) == compiler.canonical_json_bytes(second), "canonical current state is not deterministic")
    require(first_report == second_report, "canonical build report is not deterministic")
    require(compiler.canonical_json_bytes(first) == ARTIFACT.read_bytes(), "canonical current-state artifact is stale")
    require(before == {path: raw_hash(path) for path in inputs}, "canonical compilation modified an input")

    require(artifact.get("artifact_role") == "DERIVED_CANONICAL_CURRENT_ENTITY_STATE", "canonical artifact role mismatch")
    require(artifact["migration_boundary"]["accepted_phase3_head"] == "b6dabf7d9dc346a81afc9ba4a9074c481e70e02a", "migration boundary commit mismatch")
    require(artifact["migration_boundary"]["protected_file_count"] > 0, "sealed migration boundary is empty")
    require(artifact["release"]["generated_timestamp_included"] is False, "generated timestamp contaminates canonical identity")
    require(artifact["counts"]["chronology_records"] == len(artifact["chronology"]), "chronology count is not derived")
    require(artifact["counts"]["accepted_update_packets"] == len(artifact["accepted_updates"]), "accepted packet count mismatch")
    require(artifact["counts"]["revision_records"] == len(artifact["revision_history"]), "revision count mismatch")
    require(artifact["release"]["current_osint_cutoff"] == first_report["derived_current_cutoff"], "cutoff is not derived from accepted inputs")

    event_ids = [item["event_id"] for item in artifact["chronology"]]
    require(len(event_ids) == len(set(event_ids)), "duplicate event ID")
    source_ids = {item["source_id"] for item in artifact["sources"]["records"]}
    actors = {item["actor_id"]: item for item in artifact["entities"]["actors"]}
    locations = {item["location_id"]: item for item in artifact["entities"]["locations"]}
    claims = {item["case_id"]: item for item in artifact["entities"]["claims"]}
    losses = {item["loss_id"]: item for item in artifact["entities"]["material_losses"]}
    require(len(source_ids) == artifact["counts"]["source_records"], "duplicate source ID")
    require(len(actors) == artifact["counts"]["actor_records"], "duplicate actor ID")
    require(len(locations) == artifact["counts"]["location_records"], "duplicate location ID")
    require(len(claims) == artifact["counts"]["claim_records"], "duplicate claim ID")
    require(len(losses) == artifact["counts"]["material_loss_records"], "duplicate material-loss ID")

    for item in artifact["chronology"]:
        require(item["source_ids"] == item["event"]["source_ids"], f"event source IDs diverge: {item['event_id']}")
        require(set(item["source_ids"]) <= source_ids, f"event source unresolved: {item['event_id']}")
        require(set(item["actor_ids"]) <= set(actors), f"event actor unresolved: {item['event_id']}")
        require(set(item["location_ids"]) <= set(locations), f"event location unresolved: {item['event_id']}")
        require(set(item["claim_ids"]) <= set(claims), f"event claim unresolved: {item['event_id']}")
        require(item["provenance"], f"event provenance missing: {item['event_id']}")

    for revision in artifact["revision_history"]:
        require(revision["revision_type"] in compiler.REVISION_TYPES, f"invalid revision type: {revision['revision_id']}")
        require(revision["known_at"], f"revision learned time missing: {revision['revision_id']}")
        require(revision["reason"], f"revision reason missing: {revision['revision_id']}")
        require(isinstance(revision["analytical_meaning_changed"], bool), f"revision meaning flag missing: {revision['revision_id']}")
        require(set(revision["supporting_source_ids"]) <= source_ids, f"revision source unresolved: {revision['revision_id']}")

    qalibaf = actors["ACT-PER-MOHAMMAD-BAQER-QALIBAF"]["record"]
    require(qalibaf["entity_type"] == "person" and qalibaf["affiliation_id"] == "ACT-IRANIAN-PARLIAMENT", "Phase 3 actor affiliation was not preserved")
    require(qalibaf["flag"] == "🇮🇷" and qalibaf["role"] == "Parliament speaker", "Phase 3 actor role/flag was not preserved")
    require(actors["ACT-HEZBOLLAH"]["record"]["flag"] == "" and actors["ACT-HOUTHIS"]["record"]["flag"] == "", "non-state flag boundary changed")

    integrity = artifact["integrity"]
    require(integrity["duplicate_event_ids"] == 0 and not integrity["unresolved_references"], "canonical integrity reports unresolved/duplicate entities")
    require(integrity["sealed_migration_inputs_modified"] is False, "sealed migration input mutation reported")
    require(integrity["accepted_packets_modified"] is False, "accepted packet mutation reported")
    require(integrity["canonical_inputs_modified_by_generation"] is False, "generation input mutation reported")

    print(
        "canonical-update-pipeline validation: PASS - "
        f"{len(event_ids)} events; {len(source_ids)} sources; {len(actors)} actors; "
        f"{len(locations)} locations; {len(artifact['accepted_updates'])} accepted packets; deterministic bytes verified"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
