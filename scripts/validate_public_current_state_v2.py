#!/usr/bin/env python3
"""Validate the Phase 9 public projection of the accepted Gate 3 state."""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_current_state as public_v1  # noqa: E402
import build_public_current_state_v2 as core  # noqa: E402
import build_public_current_state_v2_hardened as builder  # noqa: E402


ARTIFACT = ROOT / "data/public-current-state.json"
CANONICAL = ROOT / "data/canonical-current-state-v2.json"
SCHEMA = ROOT / builder.SCHEMA
CONFLICT_START = date.fromisoformat("2026-02-28")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def payload_records(state: dict, key: str) -> list:
    payload = state["datasets"][key]["payload"]
    return payload.get("records", []) if isinstance(payload, dict) else payload


def main() -> int:
    require(ARTIFACT.is_file(), "production public current-state artifact is missing")
    require(CANONICAL.is_file(), "Gate 3 canonical current state is missing")
    state = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    canonical = json.loads(CANONICAL.read_text(encoding="utf-8"))
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))

    require(schema.get("$id") == "https://ejronin.github.io/ISR/schemas/public-current-state-v2.json", "schema identity mismatch")
    require(state.get("schema_version") == "2.0", "public schema version mismatch")
    require(state.get("artifact_role") == "DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL", "public artifact role mismatch")
    require(state.get("generator", {}).get("version") == builder.GENERATOR_VERSION, "generator version mismatch")
    require(state["generator"]["script_sha256"] == digest(public_v1.canonical_input_bytes((ROOT / builder.GENERATOR).read_bytes())), "generator identity mismatch")
    require(state["generator"]["schema_sha256"] == digest(public_v1.canonical_input_bytes(SCHEMA.read_bytes())), "schema hash mismatch")

    release = state["release"]
    canonical_release = canonical["release"]
    require(release["current_osint_cutoff"] == canonical_release["current_osint_cutoff"], "public cutoff is not derived from Gate 3")
    require(release["current_osint_cutoff_display"] == canonical_release["current_osint_cutoff_display"], "public cutoff display mismatch")
    require(release["canonical_state_identity_v2"] == canonical_release["canonical_state_identity_v2"], "Gate 3 lineage identity mismatch")
    require("generated_at" not in state and "generated_at" not in release, "nondeterministic generated timestamp present")

    chronology = state["chronology"]
    event_ids = [item["event_id"] for item in chronology]
    expected_chronology, reference_repairs = core.public_chronology(canonical)
    require(chronology == expected_chronology, "public chronology differs from the deterministic Gate 3 projection")
    require(state["counts"]["chronology_source_reference_repairs"] == reference_repairs["repaired"], "source-reference repair count mismatch")
    require(state["counts"]["chronology_source_conflicts_exposed"] == reference_repairs["conflict_unscoped"], "unscoped source-conflict count mismatch")
    require(state["counts"]["chronology_records"] == len(chronology), "chronology count is not derived")
    require(len(event_ids) == len(set(event_ids)), "duplicate public chronology event IDs")
    require(chronology == sorted(chronology, key=lambda item: (str(item["timeline"].get("date") or ""), str(item["timeline"].get("time") or ""), item["event_id"])), "chronology ordering is not deterministic")

    coverage = payload_records(state, "gate3.daily_coverage")
    cutoff_date = date.fromisoformat(release["current_osint_cutoff"][:10])
    expected_dates = []
    cursor = CONFLICT_START
    while cursor <= cutoff_date:
        expected_dates.append(cursor.isoformat())
        cursor += timedelta(days=1)
    require([item.get("date") for item in coverage] == expected_dates, "wartime daily coverage is incomplete or includes prewar duration")
    public_wartime = [item for item in chronology if CONFLICT_START.isoformat() <= item["timeline"]["date"] <= cutoff_date.isoformat()]
    require({item["event_id"] for item in public_wartime} == {event_id for day in coverage for event_id in day.get("canonical_event_ids", [])}, "daily coverage and public wartime chronology diverge")
    require(any(item["timeline"]["date"] < CONFLICT_START.isoformat() for item in chronology), "prewar context was lost")

    sources = state["sources"]["records"]
    source_ids = {item["source_id"] for item in sources}
    require(sources == canonical["sources"]["records"], "public source catalog differs from Gate 3")
    require(len(source_ids) == len(sources) == state["counts"]["canonical_source_records"], "source identity/count mismatch")
    require(all(set(item.get("source_ids") or []) <= source_ids for item in chronology), "chronology contains unresolved source IDs")
    source_by_id = {item["source_id"]: item for item in sources}
    for item in chronology:
        for reference in item.get("source_references") or []:
            source = source_by_id[reference["source_id"]]
            available = {variant["variant_key"] for variant in source.get("variants") or []}
            if reference.get("variant_key"):
                require(reference["variant_key"] in available, f"chronology source variant does not resolve: {item['event_id']}")
            else:
                require(source.get("resolution") == "PROVENANCE_SCOPED_VARIANTS_REQUIRED", f"unscoped chronology source is not a preserved conflict: {item['event_id']}")

    gate3_mapping = {
        "gate3.gaps": "start_here",
        "gate3.daily_coverage": "timeline",
        "gate3.casualties": "military_record",
        "gate3.facilities": "military_record",
        "gate3.movements": "military_record",
        "gate3.shipping": "hormuz_economy",
        "gate3.economics": "hormuz_economy",
        "gate3.agreements": "diplomacy_mou",
        "gate3.diplomacy": "diplomacy_mou",
        "gate3.lie_ledger": "claims_sources",
        "gate3.narrative_families": "claims_sources",
        "gate3.information_chains": "claims_sources",
        "gate3.source_reliability": "claims_sources",
    }
    for key, owner in gate3_mapping.items():
        require(key in state["datasets"], f"Gate 3 public dataset missing: {key}")
        require(key in state["page_data"][owner]["dataset_keys"], f"Gate 3 dataset has no public page owner: {key}")
        dataset = state["datasets"][key]
        require(dataset["sha256"] == digest(core.canonical_bytes(dataset["payload"])), f"dataset payload identity mismatch: {key}")
        require({item["source_id"] for item in dataset.get("source_references") or []} <= source_ids, f"dataset source index does not resolve: {key}")

    audit_waivers = {item["dataset_key"] for item in state["consumer_coverage"]["dataset_waivers"]}
    require(set(core.AUDIT_ONLY_GATE3_DATASETS) <= audit_waivers, "Gate 3 audit-only datasets lack explicit waivers")
    require(state["integrity"].get("browser_replays_update_packets") is False, "browser update replay was enabled")
    require(state["integrity"].get("phase9_routes_consume_gate3_state") is True, "Phase 9 route-consumer declaration missing")

    ledger = payload_records(state, "gate3.lie_ledger")
    require(len(ledger) == state["counts"]["gate3_lie_ledger_records"], "Lie Ledger count mismatch")
    require(all(record.get("truth_adjudication") and isinstance(record.get("deception_score"), int) for record in ledger), "Lie Ledger truth/intent axes incomplete")
    require(all(0 <= record["deception_score"] <= 4 for record in ledger), "Lie Ledger deception score outside 0-4")
    require(any(record.get("truth_adjudication") == "DISPROVEN" and record.get("deception_score") == 0 for record in ledger), "falsehood was collapsed into deceptive intent")
    for record in ledger:
        if record["deception_score"] >= 3:
            require(record.get("knowledge_access") and record.get("deception_basis"), f"high deception score lacks knowledge evidence: {record.get('claim_id')}")

    actors = payload_records(state, "current.actors")
    require(len(actors) == state["counts"]["public_actor_records"], "public actor-directory count mismatch")

    input_paths = [ROOT / item["path"] for item in state["input_files"]]
    before = {path: digest(path.read_bytes()) for path in input_paths}
    first = builder.canonical_bytes(builder.build_state(ROOT))
    second = builder.canonical_bytes(builder.build_state(ROOT))
    require(first == second == ARTIFACT.read_bytes(), "Phase 9 public generation is stale or nondeterministic")
    require(before == {path: digest(path.read_bytes()) for path in input_paths}, "public generation modified an input")

    print(
        "Phase 9 public current-state validation: PASS - "
        f"{len(chronology)} chronology records; {len(coverage)} conflict days; "
        f"{len(sources)} sources; {len(ledger)} Lie Ledger propositions; deterministic bytes verified"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
