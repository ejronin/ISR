#!/usr/bin/env python3
"""Build the deterministic public read model from canonical current state.

This builder intentionally has no dated package list, expected chronology
total, or cutoff constant. The canonical compiler owns update discovery; the
browser receives only this already-assembled result.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = "data/public-current-state.json"
CANONICAL_STATE_PATH = "data/canonical-current-state.json"
REGISTRY_PATH = "data/public-read-model-registry.json"
REGISTRY_SCHEMA_PATH = "schemas/public-read-model-registry-v1.json"
SCHEMA_VERSION = "1.0"
GENERATOR_VERSION = "1.2"
APPROVED_BASELINE_SHA = "9a93eea6afb1ba2f3899e96dc72e2e66071d41b1"
SOURCE_ID_RE = re.compile(r"SRC-[A-F0-9]{12}")
SHARED_PUBLIC_DATASETS = ("current.sources", "current.actors", "current.locations")
PUBLIC_PAGE_DATASET_ADDITIONS = {
    # Nuclear Talks compares approved Iran messaging with the agreement record.
    "diplomacy_mou": ("analysis.iran_messaging",),
}


def canonical_input_bytes(value: bytes) -> bytes:
    try:
        text = value.decode("utf-8")
    except UnicodeDecodeError:
        return value
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def canonical_json_bytes(payload: Any) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def source_id_from(value: Any) -> tuple[str, bool]:
    if isinstance(value, str):
        return value, False
    if not isinstance(value, dict):
        raise ValueError(f"Unsupported source reference type: {type(value).__name__}")
    source_id = value.get("source_id")
    if isinstance(source_id, str):
        return source_id, False
    if isinstance(source_id, dict) and isinstance(source_id.get("source_id"), str):
        return source_id["source_id"], True
    raise ValueError(f"Source reference has no canonical source_id: {value!r}")


def extract_source_ids(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, str):
        found.update(SOURCE_ID_RE.findall(value))
    elif isinstance(value, list):
        for item in value:
            found.update(extract_source_ids(item))
    elif isinstance(value, dict):
        for key, item in value.items():
            found.update(extract_source_ids(key))
            found.update(extract_source_ids(item))
    return found


class InputReader:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.files: dict[str, dict[str, Any]] = {}

    def _read(self, relative_path: str, role: str) -> bytes:
        relative = Path(relative_path).as_posix()
        path = self.root / relative
        if not path.is_file():
            raise ValueError(f"Required public read-model input is missing: {relative}")
        raw = canonical_input_bytes(path.read_bytes())
        digest = sha256_bytes(raw)
        existing = self.files.get(relative)
        if existing and existing["sha256"] != digest:
            raise ValueError(f"Input changed while assembling public read model: {relative}")
        if existing:
            existing["roles"] = sorted(set([*existing["roles"], role]))
        else:
            self.files[relative] = {
                "path": relative,
                "sha256": digest,
                "bytes": len(raw),
                "hash_basis": "UTF8_LF_NORMALIZED",
                "roles": [role],
            }
        return raw

    def json(self, relative_path: str, role: str) -> Any:
        raw = self._read(relative_path, role)
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError(f"Invalid JSON input {relative_path}: {exc}") from exc

    def text(self, relative_path: str, role: str) -> str:
        raw = self._read(relative_path, role)
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError(f"Invalid UTF-8 input {relative_path}: {exc}") from exc

    def digest(self, relative_path: str) -> str:
        return self.files[Path(relative_path).as_posix()]["sha256"]

    def verify_unchanged(self) -> None:
        for relative, expected in self.files.items():
            raw = canonical_input_bytes((self.root / relative).read_bytes())
            if sha256_bytes(raw) != expected["sha256"]:
                raise ValueError(f"Public generation modified input: {relative}")


def authorize_shared_public_datasets(pages: dict[str, list[str]]) -> dict[str, list[str]]:
    """Add the evidence services every public page may use.

    The registry remains the owner of page-specific analytical data. The public
    read-model builder owns this small, deterministic cross-page authorization
    for source, actor, and location resolution.
    """
    return {
        page: list(dict.fromkeys([
            *values,
            *PUBLIC_PAGE_DATASET_ADDITIONS.get(page, ()),
            *SHARED_PUBLIC_DATASETS,
        ]))
        for page, values in pages.items()
    }


def read_registry(root: Path = ROOT) -> tuple[list[tuple[str, str, str]], dict[str, list[str]]]:
    payload = json.loads(canonical_input_bytes((root / REGISTRY_PATH).read_bytes()).decode("utf-8"))
    if payload.get("schema_version") != "1.0" or payload.get("artifact_role") != "PUBLIC_READ_MODEL_DATASET_REGISTRY":
        raise ValueError("Public read-model dataset registry identity is invalid")
    specs = [(item["key"], item["path"], item["role"]) for item in payload.get("datasets") or []]
    pages = authorize_shared_public_datasets(
        {key: list(values) for key, values in (payload.get("page_data") or {}).items()}
    )
    if not specs or not pages:
        raise ValueError("Public read-model dataset registry is incomplete")
    return specs, pages


DATASET_SPECS, PAGE_DATASETS = read_registry()


def build_state(root: Path = ROOT) -> dict[str, Any]:
    root = root.resolve()
    reader = InputReader(root)
    generator_path = "scripts/build_public_current_state.py"
    schema_path = "schemas/public-current-state-v1.json"
    reader.text(generator_path, "READ_MODEL_GENERATOR")
    reader.json(schema_path, "READ_MODEL_SCHEMA")
    reader.json(REGISTRY_SCHEMA_PATH, "PUBLIC_READ_MODEL_DATASET_REGISTRY_SCHEMA")
    registry = reader.json(REGISTRY_PATH, "PUBLIC_READ_MODEL_DATASET_REGISTRY")
    dataset_specs = [(item["key"], item["path"], item["role"]) for item in registry.get("datasets") or []]
    page_datasets = authorize_shared_public_datasets(
        {key: list(values) for key, values in (registry.get("page_data") or {}).items()}
    )
    canonical = reader.json(CANONICAL_STATE_PATH, "DERIVED_CANONICAL_CURRENT_ENTITY_STATE")
    if canonical.get("artifact_role") != "DERIVED_CANONICAL_CURRENT_ENTITY_STATE":
        raise ValueError("Canonical current-state artifact role is invalid")

    from build_canonical_current_state import build_state as build_canonical_state
    rebuilt_canonical, _ = build_canonical_state(root)
    if canonical_json_bytes(rebuilt_canonical) != canonical_json_bytes(canonical):
        raise ValueError("Generated canonical current state is stale; rebuild it before the public model")

    chronology = copy.deepcopy(canonical.get("chronology") or [])
    source_catalog = copy.deepcopy((canonical.get("sources") or {}).get("records") or [])
    source_ids = {source["source_id"] for source in source_catalog}
    if len(source_ids) != len(source_catalog):
        raise ValueError("Canonical current state contains duplicate source IDs")
    chronology_ids = [item.get("event_id") for item in chronology]
    if None in chronology_ids or len(set(chronology_ids)) != len(chronology_ids):
        raise ValueError("Canonical current state contains missing or duplicate event IDs")
    unresolved_chronology_sources = sorted({source_id for item in chronology for source_id in item.get("source_ids") or []} - source_ids)
    if unresolved_chronology_sources:
        raise ValueError(f"Canonical chronology source references do not resolve: {unresolved_chronology_sources}")

    source_variant_keys = {
        source["source_id"]: [variant["variant_key"] for variant in source.get("variants") or []]
        for source in source_catalog
    }
    datasets: dict[str, dict[str, Any]] = {}

    def dataset_record(key: str, path: str, role: str, payload: Any, media_type: str) -> dict[str, Any]:
        return {
            "path": path,
            "sha256": reader.digest(path),
            "media_type": media_type,
            "role": role,
            "payload": payload,
            "source_references": [
                {
                    "source_id": source_id,
                    "variant_keys": source_variant_keys[source_id],
                    "resolution": "UNAMBIGUOUS" if len(source_variant_keys[source_id]) == 1 else "PROVENANCE_CONTEXT_REQUIRED",
                }
                for source_id in sorted(extract_source_ids(payload))
                if source_id in source_variant_keys
            ],
        }

    for key, path, role in dataset_specs:
        if key in datasets:
            raise ValueError(f"Duplicate dataset key: {key}")
        if path.endswith(".json"):
            payload = reader.json(path, role)
            media_type = "application/json"
        else:
            payload = reader.text(path, role)
            media_type = "text/plain"
        datasets[key] = dataset_record(key, Path(path).as_posix(), role, payload, media_type)

    entity_payloads = {
        "current.actors": (canonical.get("entities") or {}).get("actors") or [],
        "current.locations": (canonical.get("entities") or {}).get("locations") or [],
        "current.claims": {"schema_version": "1.0", "claims": [item["record"] for item in (canonical.get("entities") or {}).get("claims") or []]},
        "current.material_losses": {"schema_version": "1.0", "records": [item["record"] for item in (canonical.get("entities") or {}).get("material_losses") or []]},
        "current.relationships": (canonical.get("entities") or {}).get("relationships") or [],
    }
    canonical_sha = reader.digest(CANONICAL_STATE_PATH)
    for key, payload in entity_payloads.items():
        datasets[key] = dataset_record(key, CANONICAL_STATE_PATH, "DERIVED_CANONICAL_CURRENT_ENTITY_STATE", copy.deepcopy(payload), "application/json")

    available_dataset_keys = set(datasets) | {"current.chronology", "current.sources"}
    for page, keys in page_datasets.items():
        missing = sorted(set(keys) - available_dataset_keys)
        if missing:
            raise ValueError(f"Page {page} references missing dataset keys: {missing}")
        historical_roles = sorted(key for key in keys if (datasets.get(key) or {}).get("role") == "HISTORICAL_REFERENCE_DATA")
        if historical_roles:
            raise ValueError(f"Page {page} maps historical-reference datasets as current: {historical_roles}")
    dataset_source_ids = extract_source_ids(datasets)
    unresolved_dataset_sources = sorted(dataset_source_ids - source_ids)
    if unresolved_dataset_sources:
        raise ValueError(f"Page dataset source references do not resolve: {unresolved_dataset_sources}")

    reader.verify_unchanged()
    input_files = [reader.files[path] for path in sorted(reader.files)]
    input_set_material = "".join(f"{item['path']}\0{item['sha256']}\n" for item in input_files).encode("utf-8")
    input_set_sha256 = sha256_bytes(input_set_material)
    counts = copy.deepcopy(canonical.get("counts") or {})
    input_packages = copy.deepcopy(canonical.get("input_packages") or [])
    counts["current_overlay_total"] = sum(item.get("contribution", 0) for item in input_packages if "OVERLAY" in str(item.get("role") or ""))
    counts.update({
        "canonical_source_records": len(source_catalog),
        "registered_source_records": sum(1 for source in source_catalog if source.get("registry_status") == "REGISTERED"),
        "chronology_referenced_sources": len({source_id for item in chronology for source_id in item.get("source_ids") or []}),
        "page_dataset_referenced_sources": len(dataset_source_ids),
        "source_metadata_field_conflicts": sum(len(source.get("field_conflicts") or []) for source in source_catalog),
        "source_ids_requiring_provenance_scope": sum(1 for source in source_catalog if source.get("resolution") == "PROVENANCE_SCOPED_VARIANTS_REQUIRED"),
    })
    release = canonical["release"]
    scoped_source_ids = sorted(source["source_id"] for source in source_catalog if source.get("resolution") == "PROVENANCE_SCOPED_VARIANTS_REQUIRED")
    return {
        "schema_version": SCHEMA_VERSION,
        "artifact_role": "DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL",
        "authority_notice": "Generated public view only. The sealed migration inputs and append-only accepted update packets remain authoritative.",
        "generator": {
            "version": GENERATOR_VERSION,
            "script_path": generator_path,
            "script_sha256": reader.digest(generator_path),
            "schema_path": schema_path,
            "schema_sha256": reader.digest(schema_path),
        },
        "release": {
            "repository": "ejronin/ISR",
            "approved_baseline_sha": APPROVED_BASELINE_SHA,
            "canonical_migration_head": canonical["migration_boundary"]["accepted_phase3_head"],
            "canonical_state_identity": release["canonical_state_identity"],
            "current_osint_cutoff": release["current_osint_cutoff"],
            "current_osint_cutoff_display": release["current_osint_cutoff_display"],
            "input_set_sha256": input_set_sha256,
            "release_identity": f"public-current-v1-{input_set_sha256[:16]}",
        },
        "counts": counts,
        "input_packages": input_packages,
        "accepted_updates": copy.deepcopy(canonical.get("accepted_updates") or []),
        "canonical_lineage": {
            "path": CANONICAL_STATE_PATH,
            "sha256": canonical_sha,
            "input_set_sha256": release["input_set_sha256"],
            "migration_boundary": copy.deepcopy(canonical["migration_boundary"]),
        },
        "input_files": input_files,
        "chronology": chronology,
        "sources": copy.deepcopy(canonical["sources"]),
        "entities": copy.deepcopy(canonical.get("entities") or {}),
        "revision_history": copy.deepcopy(canonical.get("revision_history") or []),
        "datasets": datasets,
        "page_data": {page: {"dataset_keys": keys} for page, keys in page_datasets.items()},
        "normalizations": [],
        "integrity": {
            "serialization": "UTF-8 JSON; sorted object keys; two-space indentation; LF newline",
            "generated_timestamp_included": False,
            "duplicate_event_ids": 0,
            "unresolved_chronology_source_ids": [],
            "unresolved_page_dataset_source_ids": [],
            "source_ids_requiring_provenance_scope": scoped_source_ids,
            "canonical_inputs_modified": False,
            "canonical_state_stale": False,
            "browser_replays_update_packets": False,
        },
    }


def generate(root: Path, output: Path) -> bytes:
    serialized = canonical_json_bytes(build_state(root))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    return serialized


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT), help="Repository root")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Generated artifact path")
    parser.add_argument("--check", action="store_true", help="Fail if the checked-in/generated artifact is stale")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    serialized = canonical_json_bytes(build_state(root))
    count = len(json.loads(serialized)["chronology"])
    if args.check:
        if not output.is_file() or output.read_bytes() != serialized:
            raise SystemExit(f"FAIL: generated read model is missing or stale: {output}")
        print(f"public-current-state: PASS - {count} records; artifact is current")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(f"public-current-state: wrote {output.relative_to(root).as_posix()} with {count} records")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
