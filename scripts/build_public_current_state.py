#!/usr/bin/env python3
"""Build the deterministic public current-state read model.

The output is a generated view over canonical ISR packages. It is not an
authoritative evidence source and must never be edited by hand.
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
SCHEMA_VERSION = "1.0"
GENERATOR_VERSION = "1.0"
APPROVED_BASELINE_SHA = "9a93eea6afb1ba2f3899e96dc72e2e66071d41b1"
EXPECTED_CUTOFF = "2026-08-27T08:25:00-04:00"
EXPECTED_COUNTS = {
    "historical_base": 98,
    "aug_24_overlay": 10,
    "aug_25_overlay": 8,
    "aug_25_late_overlay": 1,
    "aug_26_overlay": 4,
    "historical_reconciliation": 81,
    "aug_27_overlay": 3,
    "chronology_records": 205,
}
SOURCE_ID_RE = re.compile(r"SRC-[A-F0-9]{12}")


PACKAGE_SPECS = [
    {
        "key": "historical_base",
        "path": "data/integration-v1.2",
        "role": "FROZEN_HISTORICAL_LEDGER",
        "expected_contribution": 98,
        "expected_total": 98,
    },
    {
        "key": "aug_24_overlay",
        "path": "data/current-update-20260824",
        "role": "APPEND_ONLY_CURRENT_OVERLAY",
        "expected_contribution": 10,
        "expected_total": 108,
    },
    {
        "key": "aug_25_overlay",
        "path": "data/current-update-20260825",
        "role": "APPEND_ONLY_CURRENT_OVERLAY",
        "expected_contribution": 8,
        "expected_total": 116,
    },
    {
        "key": "aug_25_late_overlay",
        "path": "data/current-update-20260825-late",
        "role": "APPEND_ONLY_CURRENT_OVERLAY",
        "expected_contribution": 1,
        "expected_total": 117,
    },
    {
        "key": "aug_26_overlay",
        "path": "data/current-update-20260826",
        "role": "APPEND_ONLY_CURRENT_OVERLAY",
        "expected_contribution": 4,
        "expected_total": 121,
    },
    {
        "key": "historical_reconciliation",
        "path": "data/wiki-map-reconciliation-20260826",
        "role": "ACCEPTED_HISTORICAL_RECONCILIATION",
        "expected_contribution": 81,
        "expected_total": 202,
    },
    {
        "key": "aug_27_overlay",
        "path": "data/current-update-20260827",
        "role": "APPEND_ONLY_CURRENT_OVERLAY",
        "expected_contribution": 3,
        "expected_total": 205,
    },
]


SOURCE_NAMESPACE_SPECS = [
    ("data/forensic-v1.3.2/sources.json", "FORENSIC_SOURCE_NAMESPACE", "forensic_v1_3_2"),
]


DATASET_SPECS = [
    # Retained for historical/reference access only. Superseding canonical and
    # approved datasets, below, are the only datasets mapped to current pages.
    ("legacy.core", "data/core.json", "HISTORICAL_REFERENCE_DATA"),
    ("legacy.events", "data/events.json", "HISTORICAL_REFERENCE_DATA"),
    ("legacy.facilities", "data/facilities.json", "HISTORICAL_REFERENCE_DATA"),
    ("legacy.strikes", "data/strikes.json", "HISTORICAL_REFERENCE_DATA"),
    ("legacy.losses", "data/losses.json", "HISTORICAL_REFERENCE_DATA"),
    ("legacy.claims", "data/claims.json", "HISTORICAL_REFERENCE_DATA"),
    ("legacy.sources", "data/sources.json", "HISTORICAL_REFERENCE_DATA"),
    ("legacy.economics", "data/economics.json", "HISTORICAL_REFERENCE_DATA"),
    ("legacy.routes", "data/routes.json", "HISTORICAL_REFERENCE_DATA"),
    ("legacy.missiles", "data/missiles.json", "HISTORICAL_REFERENCE_DATA"),
    ("legacy.influence_networks", "data/influence-networks.json", "HISTORICAL_REFERENCE_DATA"),
    # Canonical historical-ledger subjects. Events, timeline and sources are
    # represented by the normalized chronology and source catalog instead.
    ("ledger.daily_coverage", "data/integration-v1.2/daily-coverage.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.facilities", "data/integration-v1.2/facilities.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.map_links", "data/integration-v1.2/map-links.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.movements", "data/integration-v1.2/movements.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.agreements", "data/integration-v1.2/agreements.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.claims", "data/integration-v1.2/claims.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.casualties", "data/integration-v1.2/casualties.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.material_losses", "data/integration-v1.2/material-losses.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.munitions_expenditure", "data/integration-v1.2/munitions-expenditure.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.cost_model", "data/integration-v1.2/cost-model.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.economics", "data/integration-v1.2/economics.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.shipping", "data/integration-v1.2/shipping.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.diplomacy", "data/integration-v1.2/diplomacy.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.attrition_series", "data/integration-v1.2/attrition-series.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.bda_overlays", "data/integration-v1.2/bda-overlays.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.source_role_map", "data/integration-v1.2/source-role-map.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.revision_history", "data/integration-v1.2/revision-history.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.unresolved", "data/integration-v1.2/unresolved.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.collection_requests", "data/integration-v1.2/collection-requests.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.domain_assessments", "data/integration-v1.2/domain-assessments.json", "CANONICAL_LEDGER_DATA"),
    ("ledger.aug22_lineage", "data/integration-v1.2/aug22-update-lineage.json", "CANONICAL_LEDGER_DATA"),
    # Accepted reconciliation products not already represented in chronology.
    ("reconciliation.strikes", "data/wiki-map-reconciliation-20260826/strikes.json", "ACCEPTED_RECONCILIATION_DATA"),
    ("reconciliation.material_losses", "data/wiki-map-reconciliation-20260826/material-losses.json", "ACCEPTED_RECONCILIATION_DATA"),
    ("reconciliation.coverage_audit", "data/wiki-map-reconciliation-20260826/coverage-audit.json", "ACCEPTED_RECONCILIATION_DATA"),
    # Forensic evidence products used by current public surfaces.
    ("forensic.manifest", "data/forensic-v1.3.2/manifest.json", "APPROVED_FORENSIC_DATA"),
    ("forensic.loss_envelopes", "data/forensic-v1.3.2/iran-loss-envelopes.json", "APPROVED_FORENSIC_DATA"),
    ("forensic.leadership_casualties", "data/forensic-v1.3.2/iran-leadership-casualties.json", "APPROVED_FORENSIC_DATA"),
    ("forensic.claim_evolution", "data/forensic-v1.3.2/iranian-claim-evolution.json", "APPROVED_FORENSIC_DATA"),
    ("forensic.claim_chain_index", "data/forensic-v1.3.2/claim-chain-index.json", "APPROVED_FORENSIC_DATA"),
    ("forensic.public_assessments", "data/forensic-v1.3.2/public-assessments.json", "APPROVED_FORENSIC_DATA"),
    ("forensic.facility_claim_audits", "data/forensic-v1.3.2/facility-claim-audits.json", "APPROVED_FORENSIC_DATA"),
    ("forensic.pilot_rescue_timeline", "data/forensic-v1.3.2/pilot-rescue-timeline.json", "APPROVED_FORENSIC_DATA"),
    # Approved analytical/public datasets currently loaded by public modules.
    ("analysis.asset_display", "data/asset-display-v1.3.3.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.casualty_corrections", "data/casualty-corrections-v1.3.3.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.us_war_rationales", "data/us-war-rationales-v1.3.3.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.ui_corrections", "data/ui-corrections-v1.3.2.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.hormuz", "data/hormuz-strategic-v3.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.iran_messaging", "data/iran-messaging-shifts-20260827-r1.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.iran_outcomes", "data/iran-outcome-assessments-v1.0.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.endgame_adjudication", "data/endgame-adjudication-v1.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.endgame_public_view", "data/endgame-public-view-v1.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.endgame_so_far", "data/endgame-so-far.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.endgame_current_aug25", "data/endgame-current-20260825-r2.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.endgame_current_aug26", "data/endgame-current-20260826-r1.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.endgame_us_objectives", "data/endgame-us-objectives-20260825-r1.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.endgame_objective_corrections", "data/endgame-objective-score-corrections-20260825-r4.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.outcome_evidence_links", "data/outcome-evidence-links-20260823.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.china_oil_shift", "data/china-oil-sourcing-shift-r1.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.oil_routes", "data/oil-routes-r1.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.information_war_claims", "data/information_war_claims_v2_7.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.influence_networks", "data/influence_networks_v2_7.json", "APPROVED_ANALYTICAL_DATA"),
    ("analysis.source_context", "data/source-context-v1.json", "SOURCE_CONTEXT_DATA"),
    ("analysis.media_bias_provider", "data/media-bias-provider-metadata.json", "SOURCE_CONTEXT_DATA"),
    ("analysis.ground_news_outlets", "data/ground-news-outlet-metadata.json", "SOURCE_CONTEXT_DATA"),
    ("archive.snapshot_index", "data/snapshots.json", "ARCHIVE_INDEX_DATA"),
    ("analysis.endgame_causal_graph", "data/endgame-causal-map-r2.mmd", "APPROVED_ANALYTICAL_TEXT"),
]


PAGE_DATASETS = {
    "start_here": [
        "current.chronology",
        "ledger.domain_assessments",
        "ledger.unresolved",
        "analysis.endgame_public_view",
        "analysis.endgame_current_aug25",
        "analysis.endgame_current_aug26",
    ],
    "timeline": [
        "current.chronology",
        "ledger.daily_coverage",
        "ledger.map_links",
        "forensic.claim_evolution",
        "forensic.pilot_rescue_timeline",
    ],
    "military_record": [
        "current.chronology",
        "ledger.facilities",
        "ledger.map_links",
        "ledger.casualties",
        "ledger.material_losses",
        "ledger.munitions_expenditure",
        "ledger.cost_model",
        "ledger.attrition_series",
        "ledger.bda_overlays",
        "reconciliation.strikes",
        "reconciliation.material_losses",
        "forensic.loss_envelopes",
        "forensic.leadership_casualties",
        "forensic.facility_claim_audits",
        "analysis.asset_display",
        "analysis.casualty_corrections",
    ],
    "hormuz_economy": [
        "current.chronology",
        "ledger.economics",
        "ledger.shipping",
        "ledger.agreements",
        "analysis.hormuz",
        "analysis.china_oil_shift",
        "analysis.oil_routes",
        "analysis.endgame_current_aug25",
        "analysis.endgame_current_aug26",
    ],
    "diplomacy_mou": [
        "current.chronology",
        "ledger.agreements",
        "ledger.diplomacy",
        "analysis.hormuz",
        "analysis.endgame_public_view",
        "analysis.endgame_current_aug25",
        "analysis.endgame_current_aug26",
    ],
    "objectives_position_changes": [
        "current.chronology",
        "analysis.iran_messaging",
        "analysis.iran_outcomes",
        "analysis.endgame_adjudication",
        "analysis.endgame_public_view",
        "analysis.endgame_current_aug25",
        "analysis.endgame_current_aug26",
        "analysis.endgame_us_objectives",
        "analysis.endgame_objective_corrections",
        "analysis.outcome_evidence_links",
        "analysis.us_war_rationales",
    ],
    "claims_sources": [
        "current.chronology",
        "current.sources",
        "ledger.claims",
        "ledger.source_role_map",
        "ledger.revision_history",
        "ledger.collection_requests",
        "reconciliation.coverage_audit",
        "forensic.claim_evolution",
        "forensic.claim_chain_index",
        "forensic.public_assessments",
        "analysis.information_war_claims",
        "analysis.influence_networks",
        "analysis.source_context",
        "analysis.media_bias_provider",
        "archive.snapshot_index",
    ],
}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_input_bytes(value: bytes) -> bytes:
    """Normalize UTF-8 text line endings so Git checkouts hash identically."""
    try:
        text = value.decode("utf-8")
    except UnicodeDecodeError:
        return value
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def canonical_json_bytes(payload: Any) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


class InputReader:
    def __init__(self, root: Path):
        self.root = root
        self.files: dict[str, dict[str, Any]] = {}

    def _read(self, relative_path: str, role: str) -> bytes:
        relative_path = Path(relative_path).as_posix()
        path = self.root / relative_path
        if not path.is_file():
            raise ValueError(f"Required current-state input is missing: {relative_path}")
        raw = canonical_input_bytes(path.read_bytes())
        digest = sha256_bytes(raw)
        existing = self.files.get(relative_path)
        if existing and existing["sha256"] != digest:
            raise ValueError(f"Input changed while assembling current state: {relative_path}")
        if existing:
            existing["roles"] = sorted(set(existing["roles"] + [role]))
        else:
            self.files[relative_path] = {
                "path": relative_path,
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
        for relative_path, expected in self.files.items():
            current = canonical_input_bytes((self.root / relative_path).read_bytes())
            if sha256_bytes(current) != expected["sha256"]:
                raise ValueError(f"Generation modified canonical input: {relative_path}")


def manifest_counts(manifest: dict[str, Any], package_key: str) -> tuple[int, int, int, int]:
    counts = manifest.get("counts") or {}
    if package_key == "historical_base":
        return (
            int(counts.get("events", -1)),
            int(counts.get("timeline_records", -1)),
            int(counts.get("sources", -1)),
            int(counts.get("timeline_records", -1)),
        )
    if package_key == "historical_reconciliation":
        contribution = int(counts.get("accepted_or_corrected_events", -1))
        return (
            contribution,
            contribution,
            int(counts.get("sources", -1)),
            int(counts.get("reconciled_runtime_chronology", -1)),
        )
    return (
        int(counts.get("overlay_events", -1)),
        int(counts.get("overlay_timeline_records", -1)),
        int(counts.get("overlay_sources", -1)),
        int(counts.get("current_chronology_records", -1)),
    )


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


def ordered_unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def normalize_event_sources(
    event: dict[str, Any],
    package_key: str,
    event_path: str,
    event_index: int,
    normalizations: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[str]]:
    normalized = copy.deepcopy(event)
    output_refs = []
    source_ids = []
    for source_index, reference in enumerate(event.get("source_refs") or []):
        source_id, nested = source_id_from(reference)
        if not SOURCE_ID_RE.fullmatch(source_id):
            raise ValueError(f"Invalid source ID {source_id!r} in {event_path}")
        roles = []
        if isinstance(reference, dict):
            roles = reference.get("roles") or []
            if nested and not roles:
                roles = reference["source_id"].get("source_roles") or []
        normalized_reference = {"source_id": source_id}
        if roles:
            normalized_reference["roles"] = roles
        output_refs.append(normalized_reference)
        source_ids.append(source_id)
        if nested:
            normalizations.append(
                {
                    "kind": "NESTED_SOURCE_OBJECT_TO_CANONICAL_ID",
                    "package_key": package_key,
                    "event_id": event.get("event_id"),
                    "input_path": event_path,
                    "event_index": event_index,
                    "source_ref_index": source_index,
                    "canonical_source_id": source_id,
                    "meaning_changed": False,
                }
            )
    normalized["source_refs"] = output_refs
    return normalized, ordered_unique(source_ids)


def normalize_timeline_sources(record: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    normalized = copy.deepcopy(record)
    source_ids = []
    for reference in record.get("source_ids") or []:
        source_id, _ = source_id_from(reference)
        if not SOURCE_ID_RE.fullmatch(source_id):
            raise ValueError(f"Invalid timeline source ID {source_id!r} for {record.get('event_id')}")
        source_ids.append(source_id)
    normalized["source_ids"] = ordered_unique(source_ids)
    return normalized, normalized["source_ids"]


def is_empty(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def merge_source_records(
    existing: dict[str, Any], incoming: dict[str, Any], source_id: str
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    merged = copy.deepcopy(existing)
    conflicts = []
    for key, value in incoming.items():
        if key not in merged or is_empty(merged[key]):
            merged[key] = copy.deepcopy(value)
        elif is_empty(value) or merged[key] == value:
            continue
        elif isinstance(merged[key], list) and isinstance(value, list):
            merged[key] = list(dict.fromkeys([*merged[key], *value]))
        elif isinstance(merged[key], dict) and isinstance(value, dict):
            combined = copy.deepcopy(merged[key])
            for nested_key, nested_value in value.items():
                if nested_key in combined and not is_empty(combined[nested_key]) and not is_empty(nested_value) and combined[nested_key] != nested_value:
                    conflicts.append(
                        {
                            "source_id": source_id,
                            "field": f"{key}.{nested_key}",
                            "retained_value": copy.deepcopy(combined[nested_key]),
                            "alternate_value": copy.deepcopy(nested_value),
                        }
                    )
                    continue
                if nested_key not in combined or is_empty(combined[nested_key]):
                    combined[nested_key] = copy.deepcopy(nested_value)
            merged[key] = combined
        else:
            conflicts.append(
                {
                    "source_id": source_id,
                    "field": key,
                    "retained_value": copy.deepcopy(merged[key]),
                    "alternate_value": copy.deepcopy(value),
                }
            )
    return merged, conflicts


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


def build_state(root: Path = ROOT) -> dict[str, Any]:
    root = root.resolve()
    reader = InputReader(root)
    generator_path = "scripts/build_public_current_state.py"
    schema_path = "schemas/public-current-state-v1.json"
    reader.text(generator_path, "READ_MODEL_GENERATOR")
    reader.json(schema_path, "READ_MODEL_SCHEMA")
    chronology: list[dict[str, Any]] = []
    input_packages: list[dict[str, Any]] = []
    source_records: dict[str, dict[str, Any]] = {}
    source_provenance: dict[str, list[dict[str, Any]]] = {}
    source_variants: dict[str, list[dict[str, Any]]] = {}
    source_field_conflicts: list[dict[str, Any]] = []
    normalizations: list[dict[str, Any]] = []

    def add_sources(payload: dict[str, Any], path: str, package_key: str) -> None:
        for index, source in enumerate(payload.get("sources") or []):
            source_id = source.get("source_id")
            if not isinstance(source_id, str) or not SOURCE_ID_RE.fullmatch(source_id):
                raise ValueError(f"Invalid source record ID in {path} at index {index}")
            provenance = {
                "package_key": package_key,
                "path": Path(path).as_posix(),
                "index": index,
                "sha256": reader.digest(path),
            }
            if source_id in source_records:
                merged, conflicts = merge_source_records(source_records[source_id], source, source_id)
                source_records[source_id] = merged
                for conflict in conflicts:
                    conflict["retained_from"] = source_provenance[source_id][0]["path"]
                    conflict["alternate_from"] = provenance["path"]
                    source_field_conflicts.append(conflict)
            else:
                source_records[source_id] = copy.deepcopy(source)
            source_provenance.setdefault(source_id, []).append(provenance)
            source_variants.setdefault(source_id, []).append(
                {
                    "variant_key": f"{package_key}:{source_id}",
                    "record": copy.deepcopy(source),
                    "provenance": provenance,
                }
            )

    running_total = 0
    for spec in PACKAGE_SPECS:
        package_path = spec["path"]
        manifest_path = f"{package_path}/manifest.json"
        event_path = f"{package_path}/events.json"
        timeline_path = f"{package_path}/timeline.json"
        source_path = f"{package_path}/sources.json"
        manifest = reader.json(manifest_path, f"{spec['role']}_MANIFEST")
        event_document = reader.json(event_path, f"{spec['role']}_EVENTS")
        timeline_document = reader.json(timeline_path, f"{spec['role']}_TIMELINE")
        source_document = reader.json(source_path, f"{spec['role']}_SOURCES")
        events = event_document.get("events") or []
        timeline_records = timeline_document.get("records") or []
        sources = source_document.get("sources") or []
        manifest_event_count, manifest_timeline_count, manifest_source_count, manifest_total = manifest_counts(manifest, spec["key"])

        expected_contribution = spec["expected_contribution"]
        if len(events) != expected_contribution or len(timeline_records) != expected_contribution:
            raise ValueError(f"{spec['key']} contribution differs from approved count {expected_contribution}")
        if (manifest_event_count, manifest_timeline_count, manifest_source_count) != (len(events), len(timeline_records), len(sources)):
            raise ValueError(f"{spec['key']} manifest counts do not match package files")
        running_total += expected_contribution
        if running_total != spec["expected_total"] or manifest_total != spec["expected_total"]:
            raise ValueError(f"{spec['key']} cumulative count differs from approved total {spec['expected_total']}")

        event_index = {event.get("event_id"): (index, event) for index, event in enumerate(events)}
        timeline_index = {record.get("event_id"): (index, record) for index, record in enumerate(timeline_records)}
        if None in event_index or None in timeline_index or set(event_index) != set(timeline_index):
            raise ValueError(f"{spec['key']} event/timeline IDs are incomplete or mismatched")
        if len(event_index) != len(events) or len(timeline_index) != len(timeline_records):
            raise ValueError(f"{spec['key']} contains duplicate event IDs")

        for event_id, (event_position, event) in event_index.items():
            timeline_position, timeline = timeline_index[event_id]
            normalized_event, event_sources = normalize_event_sources(
                event, spec["key"], event_path, event_position, normalizations
            )
            normalized_timeline, timeline_sources = normalize_timeline_sources(timeline)
            if set(event_sources) != set(timeline_sources):
                raise ValueError(f"Event/timeline source mismatch for {event_id}")
            chronology.append(
                {
                    "event_id": event_id,
                    "event": normalized_event,
                    "timeline": normalized_timeline,
                    "source_ids": event_sources,
                    "provenance": {
                        "package_key": spec["key"],
                        "package_name": manifest.get("package_name"),
                        "package_role": spec["role"],
                        "event": {
                            "path": event_path,
                            "index": event_position,
                            "sha256": reader.digest(event_path),
                        },
                        "timeline": {
                            "path": timeline_path,
                            "index": timeline_position,
                            "sha256": reader.digest(timeline_path),
                        },
                    },
                }
            )

        add_sources(source_document, source_path, spec["key"])
        input_packages.append(
            {
                "key": spec["key"],
                "path": package_path,
                "role": spec["role"],
                "package_name": manifest.get("package_name"),
                "schema_version": manifest.get("schema_version"),
                "collection_cutoff": manifest.get("collection_cutoff") or manifest.get("created_at"),
                "contribution": expected_contribution,
                "cumulative_chronology_records": running_total,
                "event_count": len(events),
                "timeline_count": len(timeline_records),
                "source_count": len(sources),
                "manifest": manifest,
                "manifest_sha256": reader.digest(manifest_path),
            }
        )

    if len(chronology) != EXPECTED_COUNTS["chronology_records"]:
        raise ValueError("Assembled chronology does not contain 205 records")
    chronology_ids = [item["event_id"] for item in chronology]
    if len(set(chronology_ids)) != len(chronology_ids):
        raise ValueError("Assembled chronology contains duplicate event IDs")

    for path, role, namespace in SOURCE_NAMESPACE_SPECS:
        payload = reader.json(path, role)
        add_sources(payload, path, namespace)

    registry_path = "data/source-registry.json"
    registry = reader.json(registry_path, "GENERATED_SOURCE_REGISTRY")
    registry_sources = {source["source_id"]: source for source in registry.get("sources") or []}
    profiles = {profile["outlet_profile_id"]: profile for profile in registry.get("outlet_profiles") or []}
    unknown_registry_sources = sorted(set(registry_sources) - set(source_records))
    if unknown_registry_sources:
        raise ValueError(f"Source registry contains IDs with no authoritative namespace: {unknown_registry_sources}")

    chronology_source_ids = set().union(*(set(item["source_ids"]) for item in chronology))
    unresolved_chronology_sources = sorted(chronology_source_ids - set(source_records))
    if unresolved_chronology_sources:
        raise ValueError(f"Chronology source references do not resolve: {unresolved_chronology_sources}")

    source_variant_index = {
        variant["variant_key"]: variant
        for variants in source_variants.values()
        for variant in variants
    }
    if len(source_variant_index) != sum(len(variants) for variants in source_variants.values()):
        raise ValueError("Duplicate provenance-scoped source variant key")
    source_variant_keys = {
        source_id: [variant["variant_key"] for variant in variants]
        for source_id, variants in source_variants.items()
    }
    for item in chronology:
        package_key = item["provenance"]["package_key"]
        references = []
        for source_id in item["source_ids"]:
            variant_key = f"{package_key}:{source_id}"
            if variant_key not in source_variant_index:
                raise ValueError(f"Chronology source has no package-scoped variant: {item['event_id']} -> {variant_key}")
            references.append({"source_id": source_id, "variant_key": variant_key})
        item["source_references"] = references

    source_catalog = []
    for source_id in sorted(source_records):
        registry_record = registry_sources.get(source_id)
        profile = profiles.get(registry_record.get("outlet_profile_id")) if registry_record else None
        conflicts = [
            conflict
            for conflict in source_field_conflicts
            if conflict["source_id"] == source_id
        ]
        source_catalog.append(
            {
                "source_id": source_id,
                "record": source_records[source_id] if not conflicts else None,
                "resolution": "UNAMBIGUOUS" if not conflicts else "PROVENANCE_SCOPED_VARIANTS_REQUIRED",
                "registry": registry_record,
                "outlet_profile": profile,
                "registry_status": "REGISTERED" if registry_record else "CANONICAL_SOURCE_NOT_YET_IN_GENERATED_REGISTRY",
                "provenance": source_provenance[source_id],
                "variants": source_variants[source_id],
                "field_conflicts": conflicts,
            }
        )

    datasets: dict[str, dict[str, Any]] = {}
    for key, path, role in DATASET_SPECS:
        if key in datasets:
            raise ValueError(f"Duplicate dataset key: {key}")
        if path.endswith(".json"):
            payload = reader.json(path, role)
            media_type = "application/json"
        else:
            payload = reader.text(path, role)
            media_type = "text/plain"
        datasets[key] = {
            "path": Path(path).as_posix(),
            "sha256": reader.digest(path),
            "media_type": media_type,
            "role": role,
            "payload": payload,
            "source_references": [
                {
                    "source_id": source_id,
                    "variant_keys": source_variant_keys[source_id],
                    "resolution": (
                        "UNAMBIGUOUS"
                        if len(source_variant_keys[source_id]) == 1
                        else "PROVENANCE_CONTEXT_REQUIRED"
                    ),
                }
                for source_id in sorted(extract_source_ids(payload))
                if source_id in source_variant_keys
            ],
        }

    available_dataset_keys = set(datasets) | {"current.chronology", "current.sources"}
    for page, keys in PAGE_DATASETS.items():
        missing = sorted(set(keys) - available_dataset_keys)
        if missing:
            raise ValueError(f"Page {page} references missing dataset keys: {missing}")

    dataset_source_ids = extract_source_ids(datasets)
    unresolved_dataset_sources = sorted(dataset_source_ids - set(source_records))
    if unresolved_dataset_sources:
        raise ValueError(f"Page dataset source references do not resolve: {unresolved_dataset_sources}")

    chronology.sort(
        key=lambda item: (
            str(item["timeline"].get("date") or ""),
            str(item["timeline"].get("time") or ""),
            item["event_id"],
        )
    )
    normalizations.sort(
        key=lambda item: (
            item["input_path"],
            item["event_index"],
            item["source_ref_index"],
        )
    )

    input_files = [reader.files[path] for path in sorted(reader.files)]
    input_set_material = "".join(f"{item['path']}\0{item['sha256']}\n" for item in input_files).encode("utf-8")
    input_set_sha256 = sha256_bytes(input_set_material)
    reader.verify_unchanged()
    provenance_scoped_source_ids = sorted(
        source["source_id"]
        for source in source_catalog
        if source["resolution"] == "PROVENANCE_SCOPED_VARIANTS_REQUIRED"
    )

    return {
        "schema_version": SCHEMA_VERSION,
        "artifact_role": "DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL",
        "authority_notice": "Generated view only. Canonical packages and their source records remain authoritative.",
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
            "current_osint_cutoff": EXPECTED_CUTOFF,
            "current_osint_cutoff_display": "2026-08-27 08:25 ET",
            "input_set_sha256": input_set_sha256,
            "release_identity": f"public-current-v1-{input_set_sha256[:16]}",
        },
        "counts": {
            **EXPECTED_COUNTS,
            "current_overlay_total": sum(
                EXPECTED_COUNTS[key]
                for key in (
                    "aug_24_overlay",
                    "aug_25_overlay",
                    "aug_25_late_overlay",
                    "aug_26_overlay",
                    "aug_27_overlay",
                )
            ),
            "canonical_source_records": len(source_catalog),
            "registered_source_records": len(registry_sources),
            "chronology_referenced_sources": len(chronology_source_ids),
            "page_dataset_referenced_sources": len(dataset_source_ids),
            "structural_normalizations": len(normalizations),
            "source_metadata_field_conflicts": len(source_field_conflicts),
            "source_ids_requiring_provenance_scope": len(provenance_scoped_source_ids),
        },
        "input_packages": input_packages,
        "input_files": input_files,
        "chronology": chronology,
        "sources": {
            "registry_path": registry_path,
            "registry_sha256": reader.digest(registry_path),
            "outlet_profiles": registry.get("outlet_profiles") or [],
            "records": source_catalog,
        },
        "datasets": datasets,
        "page_data": {
            page: {"dataset_keys": keys}
            for page, keys in PAGE_DATASETS.items()
        },
        "normalizations": normalizations,
        "integrity": {
            "serialization": "UTF-8 JSON; sorted object keys; two-space indentation; LF newline",
            "generated_timestamp_included": False,
            "duplicate_event_ids": 0,
            "unresolved_chronology_source_ids": [],
            "unresolved_page_dataset_source_ids": [],
            "source_ids_requiring_provenance_scope": provenance_scoped_source_ids,
            "canonical_inputs_modified": False,
        },
    }


def generate(root: Path, output: Path) -> bytes:
    payload = build_state(root)
    serialized = canonical_json_bytes(payload)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    return serialized


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT), help="Repository root")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Generated artifact path")
    parser.add_argument("--check", action="store_true", help="Fail if the checked-in artifact is stale")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    serialized = canonical_json_bytes(build_state(root))
    if args.check:
        if not output.is_file():
            raise SystemExit(f"FAIL: generated read model is missing: {output}")
        if output.read_bytes() != serialized:
            raise SystemExit(f"FAIL: generated read model does not match current inputs: {output}")
        print(f"public-current-state: PASS - {EXPECTED_COUNTS['chronology_records']} records; artifact is current")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(
        "public-current-state: wrote "
        f"{output.relative_to(root).as_posix()} with {EXPECTED_COUNTS['chronology_records']} records"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
