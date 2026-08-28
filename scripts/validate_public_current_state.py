#!/usr/bin/env python3
"""Validate the deterministic public current-state read model."""
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


def validate_payload(payload: dict[str, Any]) -> None:
    require(payload.get("schema_version") == builder.SCHEMA_VERSION, "read-model schema version mismatch")
    require(payload.get("artifact_role") == "DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL", "artifact role mismatch")
    generator = payload.get("generator") or {}
    require(generator.get("version") == builder.GENERATOR_VERSION, "generator version mismatch")
    require(generator.get("script_sha256") == canonical_sha256(ROOT / generator.get("script_path", "missing")), "generator script identity mismatch")
    require(generator.get("schema_sha256") == canonical_sha256(ROOT / generator.get("schema_path", "missing")), "generator schema identity mismatch")
    release = payload.get("release") or {}
    require(release.get("repository") == "ejronin/ISR", "repository identity mismatch")
    require(release.get("approved_baseline_sha") == builder.APPROVED_BASELINE_SHA, "approved baseline SHA mismatch")
    require(release.get("current_osint_cutoff") == builder.EXPECTED_CUTOFF, "current cutoff mismatch")
    require(release.get("current_osint_cutoff_display") == "2026-08-27 08:25 ET", "current cutoff display mismatch")
    require("generated_at" not in release, "release identity must not contain a generated timestamp")

    counts = payload.get("counts") or {}
    for key, expected in builder.EXPECTED_COUNTS.items():
        require(counts.get(key) == expected, f"{key} count must be {expected}")
    require(counts.get("current_overlay_total") == 26, "current overlay total must be 26")
    require(98 + 26 + 81 == counts["chronology_records"], "approved chronology equation mismatch")

    packages = payload.get("input_packages") or []
    require([item.get("key") for item in packages] == [item["key"] for item in builder.PACKAGE_SPECS], "package order or membership mismatch")
    require([item.get("contribution") for item in packages] == [98, 10, 8, 1, 4, 81, 3], "package contributions mismatch")
    require([item.get("cumulative_chronology_records") for item in packages] == [98, 108, 116, 117, 121, 202, 205], "package cumulative totals mismatch")

    inputs = payload.get("input_files") or []
    input_by_path = {item.get("path"): item for item in inputs}
    require(len(input_by_path) == len(inputs), "duplicate canonical input paths")
    require(builder.DEFAULT_OUTPUT not in input_by_path, "derived artifact must not be treated as canonical input")
    for relative_path, item in input_by_path.items():
        path = ROOT / relative_path
        require(path.is_file(), f"canonical input missing: {relative_path}")
        canonical_bytes = builder.canonical_input_bytes(path.read_bytes())
        require(hashlib.sha256(canonical_bytes).hexdigest() == item.get("sha256"), f"canonical input hash mismatch: {relative_path}")
        require(len(canonical_bytes) == item.get("bytes"), f"canonical input byte count mismatch: {relative_path}")
        require(item.get("hash_basis") == "UTF8_LF_NORMALIZED", f"canonical input hash basis mismatch: {relative_path}")
        require(bool(item.get("roles")), f"canonical input has no declared role: {relative_path}")

    input_set_material = "".join(
        f"{item['path']}\0{item['sha256']}\n" for item in sorted(inputs, key=lambda row: row["path"])
    ).encode("utf-8")
    require(hashlib.sha256(input_set_material).hexdigest() == release.get("input_set_sha256"), "input-set identity mismatch")
    require(release.get("release_identity") == f"public-current-v1-{release['input_set_sha256'][:16]}", "release identity is not derived from inputs")

    chronology = payload.get("chronology") or []
    event_ids = [item.get("event_id") for item in chronology]
    require(len(chronology) == 205, "derived chronology must contain 205 records")
    require(len(event_ids) == len(set(event_ids)), "derived chronology contains duplicate event IDs")
    chronology_sort = sorted(
        chronology,
        key=lambda item: (
            str(item["timeline"].get("date") or ""),
            str(item["timeline"].get("time") or ""),
            item["event_id"],
        ),
    )
    require(chronology == chronology_sort, "derived chronology ordering is not deterministic")

    source_records = (payload.get("sources") or {}).get("records") or []
    source_ids = [item.get("source_id") for item in source_records]
    source_id_set = set(source_ids)
    variant_index = {
        variant["variant_key"]: variant
        for source in source_records
        for variant in source.get("variants") or []
    }
    require(len(source_ids) == len(source_id_set), "source catalog contains duplicate IDs")
    require(len(source_records) == counts.get("canonical_source_records"), "source catalog count mismatch")
    require(len(source_records) == 362, "canonical source catalog must contain 362 records")
    require(counts.get("registered_source_records") == 359, "source registry baseline must contain 359 records")
    scoped_sources = [source for source in source_records if source.get("resolution") == "PROVENANCE_SCOPED_VARIANTS_REQUIRED"]
    require(len(scoped_sources) == counts.get("source_ids_requiring_provenance_scope"), "provenance-scoped source count mismatch")
    require(len(scoped_sources) == 5, "five baseline source IDs must retain provenance-scoped variants")
    for source in source_records:
        if source.get("resolution") == "UNAMBIGUOUS":
            require(isinstance(source.get("record"), dict), f"unambiguous source {source['source_id']} has no record")
            require(not source.get("field_conflicts"), f"unambiguous source {source['source_id']} reports conflicts")
        else:
            require(source.get("record") is None, f"ambiguous source {source['source_id']} must not select a global record")
            require(len(source.get("variants") or []) > 1, f"ambiguous source {source['source_id']} has no variants")
            require(bool(source.get("field_conflicts")), f"ambiguous source {source['source_id']} has no conflict audit")

    chronology_source_ids: set[str] = set()
    for item in chronology:
        event_id = item["event_id"]
        event = item.get("event") or {}
        timeline = item.get("timeline") or {}
        provenance = item.get("provenance") or {}
        require(event.get("event_id") == event_id, f"event wrapper mismatch for {event_id}")
        require(timeline.get("event_id") == event_id, f"timeline wrapper mismatch for {event_id}")
        event_sources = source_ids_from_event(event)
        timeline_sources = source_ids_from_timeline(timeline)
        require(event_sources == item.get("source_ids"), f"normalized event sources mismatch for {event_id}")
        require(set(event_sources) == set(timeline_sources), f"event/timeline source mismatch for {event_id}")
        require(set(event_sources) <= source_id_set, f"unresolved source for {event_id}")
        scoped_references = item.get("source_references") or []
        require([reference.get("source_id") for reference in scoped_references] == event_sources, f"scoped source order mismatch for {event_id}")
        require(all(reference.get("variant_key") in variant_index for reference in scoped_references), f"scoped source variant missing for {event_id}")
        chronology_source_ids.update(event_sources)

        package_key = provenance.get("package_key")
        require(package_key in {spec["key"] for spec in builder.PACKAGE_SPECS}, f"unknown package provenance for {event_id}")
        for kind, collection_name in (("event", "events"), ("timeline", "records")):
            pointer = provenance.get(kind) or {}
            relative_path = pointer.get("path")
            require(relative_path in input_by_path, f"{event_id} {kind} provenance path is not an input")
            require(pointer.get("sha256") == input_by_path[relative_path]["sha256"], f"{event_id} {kind} provenance hash mismatch")
            document = json.loads((ROOT / relative_path).read_text(encoding="utf-8"))
            index = pointer.get("index")
            require(isinstance(index, int) and 0 <= index < len(document[collection_name]), f"{event_id} {kind} provenance index invalid")
            require(document[collection_name][index].get("event_id") == event_id, f"{event_id} {kind} provenance does not resolve")

def validate_package_contributions(payload: dict[str, Any]) -> None:
    observed: dict[str, int] = {}
    for item in payload["chronology"]:
        key = item["provenance"]["package_key"]
        observed[key] = observed.get(key, 0) + 1
    expected = {spec["key"]: spec["expected_contribution"] for spec in builder.PACKAGE_SPECS}
    require(observed == expected, f"chronology package contributions mismatch: {observed}")


def validate_references_and_views(payload: dict[str, Any]) -> None:
    source_records = payload["sources"]["records"]
    source_ids = {item["source_id"] for item in source_records}
    variant_index = {
        variant["variant_key"]: variant
        for source in source_records
        for variant in source.get("variants") or []
    }
    datasets = payload.get("datasets") or {}
    available_keys = set(datasets) | {"current.chronology", "current.sources"}
    require(set(payload.get("page_data") or {}) == set(builder.PAGE_DATASETS), "page-data sections mismatch")
    for page, expected_keys in builder.PAGE_DATASETS.items():
        actual_keys = payload["page_data"][page].get("dataset_keys")
        require(actual_keys == expected_keys, f"{page} dataset mapping mismatch")
        require(set(actual_keys) <= available_keys, f"{page} maps to unavailable data")
        require(not any(key.startswith("legacy.") for key in actual_keys), f"{page} maps historical reference data as current")
    legacy_datasets = {key: value for key, value in datasets.items() if key.startswith("legacy.")}
    require(bool(legacy_datasets), "historical reference datasets are missing")
    require(
        all(dataset.get("role") == "HISTORICAL_REFERENCE_DATA" for dataset in legacy_datasets.values()),
        "a legacy dataset is not classified as historical/reference",
    )
    dataset_source_ids = builder.extract_source_ids(datasets)
    require(dataset_source_ids <= source_ids, "a page dataset contains an unresolved source reference")
    require(len(dataset_source_ids) == payload["counts"]["page_dataset_referenced_sources"], "page source-reference count mismatch")
    for key, dataset in datasets.items():
        relative_path = dataset.get("path")
        require(relative_path and (ROOT / relative_path).is_file(), f"dataset {key} input is missing")
        require(canonical_sha256(ROOT / relative_path) == dataset.get("sha256"), f"dataset {key} hash mismatch")
        require(dataset.get("media_type") in {"application/json", "text/plain"}, f"dataset {key} media type invalid")
        dataset_refs = dataset.get("source_references") or []
        require(
            {item.get("source_id") for item in dataset_refs} == builder.extract_source_ids(dataset.get("payload")),
            f"dataset {key} source-reference index mismatch",
        )
        require(
            all(variant_key in variant_index for item in dataset_refs for variant_key in item.get("variant_keys") or []),
            f"dataset {key} has an unresolved provenance-scoped source variant",
        )

    for source in source_records:
        require(bool(source.get("provenance")), f"source {source.get('source_id')} has no provenance")
        for pointer in source["provenance"]:
            require(pointer.get("path") and (ROOT / pointer["path"]).is_file(), f"source {source['source_id']} provenance missing")
            require(canonical_sha256(ROOT / pointer["path"]) == pointer.get("sha256"), f"source {source['source_id']} provenance hash mismatch")


def main() -> int:
    require(ARTIFACT.is_file(), f"generated artifact missing: {builder.DEFAULT_OUTPUT}")
    require(SCHEMA.is_file(), "public current-state schema is missing")
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    require(schema.get("$id") == "https://ejronin.github.io/ISR/schemas/public-current-state-v1.json", "schema identity mismatch")
    payload = json.loads(ARTIFACT.read_text(encoding="utf-8"))

    # Snapshot every declared input before exercising the generator twice.
    input_paths = [ROOT / item["path"] for item in payload.get("input_files") or []]
    before = {path: raw_sha256(path) for path in input_paths}
    with tempfile.TemporaryDirectory() as temp_directory:
        first_path = Path(temp_directory) / "first.json"
        second_path = Path(temp_directory) / "second.json"
        first = builder.generate(ROOT, first_path)
        second = builder.generate(ROOT, second_path)
        require(first == second, "repeated generation is not byte-for-byte deterministic")
        require(first == ARTIFACT.read_bytes(), "generated read model does not match current inputs")
    after = {path: raw_sha256(path) for path in input_paths}
    require(before == after, "generation modified a canonical input file")

    validate_payload(payload)
    validate_package_contributions(payload)
    validate_references_and_views(payload)
    require(payload.get("normalizations") is not None, "normalization audit is missing")
    require(all(item.get("meaning_changed") is False for item in payload["normalizations"]), "a structural normalization changes meaning")
    require(payload.get("integrity", {}).get("canonical_inputs_modified") is False, "artifact integrity flag reports input mutation")
    require(payload.get("integrity", {}).get("generated_timestamp_included") is False, "artifact contains a generated timestamp")
    require(
        payload.get("integrity", {}).get("source_ids_requiring_provenance_scope")
        == sorted(source["source_id"] for source in payload["sources"]["records"] if source["resolution"] == "PROVENANCE_SCOPED_VARIANTS_REQUIRED"),
        "provenance-scoped source audit mismatch",
    )

    print(
        "public-current-state validation: PASS - "
        f"{payload['counts']['chronology_records']} chronology records; "
        f"{payload['counts']['canonical_source_records']} sources; "
        f"{len(payload['input_files'])} hashed inputs; deterministic bytes verified"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
