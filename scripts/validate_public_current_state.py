#!/usr/bin/env python3
"""Validate the deterministic public read model against canonical current state."""
from __future__ import annotations

import hashlib
import json
import sys
import tempfile
from pathlib import Path
from typing import Any

sys.dont_write_bytecode = True

import build_public_current_state as builder


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / builder.DEFAULT_OUTPUT
CANONICAL = ROOT / builder.CANONICAL_STATE_PATH
SCHEMA = ROOT / "schemas/public-current-state-v1.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def raw_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_sha256(path: Path) -> str:
    return hashlib.sha256(builder.canonical_input_bytes(path.read_bytes())).hexdigest()


def source_ids_from_event(event: dict[str, Any]) -> list[str]:
    return [builder.source_id_from(item)[0] for item in event.get("source_refs") or []]


def source_ids_from_timeline(timeline: dict[str, Any]) -> list[str]:
    return [builder.source_id_from(item)[0] for item in timeline.get("source_ids") or []]


def validate_payload(payload: dict[str, Any], canonical: dict[str, Any]) -> None:
    require(payload.get("schema_version") == builder.SCHEMA_VERSION, "read-model schema version mismatch")
    require(payload.get("artifact_role") == "DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL", "artifact role mismatch")
    generator = payload.get("generator") or {}
    require(generator.get("version") == builder.GENERATOR_VERSION, "generator version mismatch")
    require(generator.get("script_sha256") == canonical_sha256(ROOT / generator.get("script_path", "missing")), "generator script identity mismatch")
    require(generator.get("schema_sha256") == canonical_sha256(ROOT / generator.get("schema_path", "missing")), "generator schema identity mismatch")

    release = payload.get("release") or {}
    canonical_release = canonical.get("release") or {}
    require(release.get("repository") == "ejronin/ISR", "repository identity mismatch")
    require(release.get("approved_baseline_sha") == builder.APPROVED_BASELINE_SHA, "approved baseline SHA mismatch")
    require(release.get("canonical_migration_head") == canonical["migration_boundary"]["accepted_phase3_head"], "migration head mismatch")
    require(release.get("canonical_state_identity") == canonical_release.get("canonical_state_identity"), "canonical state identity mismatch")
    require(release.get("current_osint_cutoff") == canonical_release.get("current_osint_cutoff"), "current cutoff is not derived from canonical state")
    require(release.get("current_osint_cutoff_display") == canonical_release.get("current_osint_cutoff_display"), "current cutoff display mismatch")
    require("generated_at" not in release, "release identity must not contain a generated timestamp")

    counts = payload.get("counts") or {}
    chronology = payload.get("chronology") or []
    require(counts.get("chronology_records") == len(chronology) and len(chronology) > 0, "chronology count is not derived from records")
    require(counts.get("accepted_update_packets") == len(payload.get("accepted_updates") or []), "accepted packet count mismatch")
    packages = payload.get("input_packages") or []
    running = 0
    for package in packages:
        running += package.get("contribution", -1)
        require(package.get("cumulative_chronology_records") == running, f"package cumulative count mismatch: {package.get('key')}")
    require(running + sum(1 for item in chronology if (item.get("provenance") or [{}])[0].get("kind") == "ACCEPTED_UPDATE_PACKET") == len(chronology), "chronology is not explained by inherited packages and accepted additions")

    inputs = payload.get("input_files") or []
    input_by_path = {item.get("path"): item for item in inputs}
    require(len(input_by_path) == len(inputs), "duplicate public input paths")
    require(builder.DEFAULT_OUTPUT not in input_by_path, "derived artifact must not be its own input")
    require(builder.CANONICAL_STATE_PATH in input_by_path, "public read model does not depend on canonical current state")
    for relative_path, item in input_by_path.items():
        path = ROOT / relative_path
        require(path.is_file(), f"public input missing: {relative_path}")
        canonical_bytes = builder.canonical_input_bytes(path.read_bytes())
        require(hashlib.sha256(canonical_bytes).hexdigest() == item.get("sha256"), f"public input hash mismatch: {relative_path}")
        require(len(canonical_bytes) == item.get("bytes"), f"public input byte count mismatch: {relative_path}")
        require(item.get("hash_basis") == "UTF8_LF_NORMALIZED", f"public input hash basis mismatch: {relative_path}")
        require(bool(item.get("roles")), f"public input has no declared role: {relative_path}")
    input_set_material = "".join(f"{item['path']}\0{item['sha256']}\n" for item in sorted(inputs, key=lambda row: row["path"])).encode("utf-8")
    require(hashlib.sha256(input_set_material).hexdigest() == release.get("input_set_sha256"), "public input-set identity mismatch")
    require(release.get("release_identity") == f"public-current-v1-{release['input_set_sha256'][:16]}", "public release identity is not derived from inputs")

    event_ids = [item.get("event_id") for item in chronology]
    require(len(event_ids) == len(set(event_ids)), "derived chronology contains duplicate event IDs")
    require(chronology == sorted(chronology, key=lambda item: (str(item["timeline"].get("date") or ""), str(item["timeline"].get("time") or ""), item["event_id"])), "chronology ordering is not deterministic")
    require(chronology == canonical.get("chronology"), "public chronology differs from canonical current state")
    require(payload.get("entities") == canonical.get("entities"), "public entity state differs from canonical current state")
    require(payload.get("revision_history") == canonical.get("revision_history"), "public revision history differs from canonical current state")

    source_records = (payload.get("sources") or {}).get("records") or []
    source_ids = [item.get("source_id") for item in source_records]
    source_id_set = set(source_ids)
    require(len(source_ids) == len(source_id_set), "source catalog contains duplicate IDs")
    require(len(source_records) == counts.get("canonical_source_records"), "source catalog count mismatch")
    require(source_records == (canonical.get("sources") or {}).get("records"), "public source catalog differs from canonical current state")
    variant_index = {variant["variant_key"]: variant for source in source_records for variant in source.get("variants") or []}
    for source in source_records:
        resolution = source.get("resolution")
        if resolution in {"UNAMBIGUOUS", "CANONICAL_UPDATE_CURRENT"}:
            require(isinstance(source.get("record"), dict), f"current source {source['source_id']} has no record")
        else:
            require(resolution == "PROVENANCE_SCOPED_VARIANTS_REQUIRED", f"source {source['source_id']} has invalid resolution")
            require(source.get("record") is None and len(source.get("variants") or []) > 1 and bool(source.get("field_conflicts")), f"ambiguous source {source['source_id']} lacks variant audit")

    for item in chronology:
        event_id = item["event_id"]
        event = item.get("event") or {}
        timeline = item.get("timeline") or {}
        require(event.get("event_id") == event_id and timeline.get("event_id") == event_id, f"event/timeline wrapper mismatch for {event_id}")
        event_sources = source_ids_from_event(event)
        timeline_sources = source_ids_from_timeline(timeline)
        require(event_sources == item.get("source_ids"), f"event source mismatch for {event_id}")
        require(set(event_sources) == set(timeline_sources) and set(event_sources) <= source_id_set, f"unresolved event/timeline source for {event_id}")
        references = item.get("source_references") or []
        require([reference.get("source_id") for reference in references] == event_sources, f"source-reference order mismatch for {event_id}")
        require(all(reference.get("variant_key") in variant_index for reference in references), f"source variant missing for {event_id}")
        require(isinstance(item.get("provenance"), list) and item["provenance"], f"event provenance missing for {event_id}")


def validate_references_and_views(payload: dict[str, Any]) -> None:
    source_records = payload["sources"]["records"]
    source_ids = {item["source_id"] for item in source_records}
    variant_index = {variant["variant_key"]: variant for source in source_records for variant in source.get("variants") or []}
    datasets = payload.get("datasets") or {}
    available_keys = set(datasets) | {"current.chronology", "current.sources"}
    require(set(payload.get("page_data") or {}) == set(builder.PAGE_DATASETS), "page-data sections mismatch")
    for page, expected_keys in builder.PAGE_DATASETS.items():
        actual_keys = payload["page_data"][page].get("dataset_keys")
        require(actual_keys == expected_keys and set(actual_keys) <= available_keys, f"{page} dataset mapping mismatch")
        require(not any(key.startswith("legacy.") for key in actual_keys), f"{page} maps historical reference data as current")
        require(not any((datasets.get(key) or {}).get("role") == "HISTORICAL_REFERENCE_DATA" for key in actual_keys), f"{page} maps a historical-reference role as current")
    legacy_datasets = {key: value for key, value in datasets.items() if key.startswith("legacy.")}
    require(bool(legacy_datasets) and all(dataset.get("role") == "HISTORICAL_REFERENCE_DATA" for dataset in legacy_datasets.values()), "historical reference classification mismatch")
    dataset_source_ids = builder.extract_source_ids(datasets)
    require(dataset_source_ids <= source_ids, "a page dataset contains an unresolved source reference")
    require(len(dataset_source_ids) == payload["counts"]["page_dataset_referenced_sources"], "page source-reference count mismatch")
    for key, dataset in datasets.items():
        relative_path = dataset.get("path")
        require(relative_path and (ROOT / relative_path).is_file(), f"dataset {key} input is missing")
        require(canonical_sha256(ROOT / relative_path) == dataset.get("sha256"), f"dataset {key} hash mismatch")
        refs = dataset.get("source_references") or []
        require({item.get("source_id") for item in refs} == builder.extract_source_ids(dataset.get("payload")), f"dataset {key} source index mismatch")
        require(all(variant_key in variant_index for item in refs for variant_key in item.get("variant_keys") or []), f"dataset {key} has unresolved source variant")


def main() -> int:
    require(ARTIFACT.is_file(), f"generated artifact missing: {builder.DEFAULT_OUTPUT}")
    require(CANONICAL.is_file(), f"generated canonical state missing: {builder.CANONICAL_STATE_PATH}")
    require(SCHEMA.is_file(), "public current-state schema is missing")
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    require(schema.get("$id") == "https://ejronin.github.io/ISR/schemas/public-current-state-v1.json", "schema identity mismatch")
    payload = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    canonical = json.loads(CANONICAL.read_text(encoding="utf-8"))

    input_paths = [ROOT / item["path"] for item in payload.get("input_files") or []]
    before = {path: raw_sha256(path) for path in input_paths}
    with tempfile.TemporaryDirectory() as temporary:
        first = builder.generate(ROOT, Path(temporary) / "first.json")
        second = builder.generate(ROOT, Path(temporary) / "second.json")
        require(first == second == ARTIFACT.read_bytes(), "public generation is not byte-for-byte deterministic/current")
    require(before == {path: raw_sha256(path) for path in input_paths}, "public generation modified an input")

    validate_payload(payload, canonical)
    validate_references_and_views(payload)
    integrity = payload.get("integrity") or {}
    require(integrity.get("canonical_inputs_modified") is False, "artifact reports canonical input mutation")
    require(integrity.get("generated_timestamp_included") is False, "artifact contains a generated timestamp")
    require(integrity.get("canonical_state_stale") is False, "artifact reports stale canonical state")
    require(integrity.get("browser_replays_update_packets") is False, "artifact reports browser update replay")
    print(
        "public-current-state validation: PASS - "
        f"{payload['counts']['chronology_records']} chronology records; "
        f"{payload['counts']['canonical_source_records']} sources; "
        f"{len(payload['accepted_updates'])} accepted update packets; deterministic bytes verified"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
