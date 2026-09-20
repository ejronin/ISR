#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("rook_intake_status", REPO / "scripts" / "rook_intake_status.py")
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = mod
SPEC.loader.exec_module(mod)


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def sweep(start: str, end: str, event_id: str):
    return {
        "artifact_role": mod.SWEEP_ROLE,
        "authority": "ROOK_UPSTREAM_COLLECTION",
        "scope": {
            "window_start": start,
            "window_end": end,
            "timezone": "America/New_York",
        },
        "write_policy": "APPEND_ONLY_EVIDENCE_LOCKER_NO_CANONICAL_OR_PUBLIC_MUTATION",
        "new_events": [{
            "event_id": event_id,
            "event_type": "TEST",
            "occurrence_time": start,
            "public_available_time": start,
            "collection_time": end,
            "summary": "fixture",
            "sources": ["https://example.test/source"],
        }],
        "existing_event_updates": [{
            "update_id": f"{event_id}-LATER",
            "updates_existing_ref": event_id,
            "relationship": "LATER_BDA",
            "summary": "Later evidence updates status without creating a second physical occurrence.",
            "status": "UPDATED",
        }],
        "claims_and_corrections": [],
        "economic_energy_updates": [],
        "unresolved_questions": [],
        "coverage": {"material_results": [], "checked_no_material_new_event_in_window": [], "limitations": []},
        "completion": {
            "status": "COMPLETE_FOR_AVAILABLE_SOURCE_UNIVERSE",
            "material_delta": True,
            "canonical_or_public_artifacts_mutated": False,
            "accepted_packet_bytes_or_hashes_mutated": False,
        },
    }


def validate_packet_provenance_schema():
    schema = json.loads((REPO / "schemas" / "canonical-update-packet-v2.json").read_text(encoding="utf-8"))
    provenance = schema["properties"].get("upstream_provenance")
    assert provenance is not None
    assert provenance["required"] == ["locker_artifacts"]
    locker = provenance["properties"]["locker_artifacts"]
    assert locker["minItems"] == 1
    assert locker["uniqueItems"] is True


validate_packet_provenance_schema()


def configure(temp: Path):
    mod.ROOT = temp
    mod.EVIDENCE_DIR = temp / "data" / "evidence-integration"
    mod.MANIFEST_PATH = temp / "data" / "canonical-ledger" / "manifest-v2.json"


def accepted_packet(path: Path, packet_id: str, cutoff: str, locker_path: str):
    write_json(path, {
        "schema_version": "2.0",
        "status": "ACCEPTED",
        "packet_id": packet_id,
        "known_at": "2026-09-14T13:00:00-04:00",
        "evidence_cutoff": cutoff,
        "upstream_provenance": {"locker_artifacts": [locker_path]},
        "events": [],
        "entities": [],
        "sources": [],
        "narrative_claims": [],
        "summary": "fixture accepted adjudication",
    })


with tempfile.TemporaryDirectory() as name:
    temp = Path(name)
    configure(temp)
    first_path = "data/evidence-integration/rook-evidence-locker-sweep-a.json"
    second_path = "data/evidence-integration/rook-evidence-locker-sweep-b.json"
    write_json(temp / first_path, sweep(
        "2026-09-13T12:00:00-04:00",
        "2026-09-14T00:00:00-04:00",
        "LOCKER-A",
    ))
    write_json(temp / second_path, sweep(
        "2026-09-14T00:01:03-04:00",
        "2026-09-14T12:01:03-04:00",
        "LOCKER-B",
    ))
    packet_path = "data/canonical-updates/UPD-20260914-ROOK-A.json"
    accepted_packet(
        temp / packet_path,
        "UPD-20260914-ROOK-A",
        "2026-09-14T00:00:00-04:00",
        first_path,
    )
    write_json(temp / "data/canonical-ledger/manifest-v2.json", {
        "current_evidence_cutoff": "2026-09-14T00:00:00-04:00",
        "accepted_updates": [{"path": packet_path}],
    })
    write_json(temp / "data/evidence-integration/source-discovery-a.json", {
        "artifact_role": mod.SOURCE_DISCOVERY_ROLE,
        "authority": "ROOK_UPSTREAM_COLLECTION",
        "collection_cutoff": "2026-09-14T00:00:00-04:00",
        "sources": [{"source_name": "Standing source", "url": "https://example.test/standing"}],
        "discovery_count": 1,
        "preservation_rule": "Append discoveries; do not remove older standing sources.",
    })
    report = mod.validate_repository(as_of=datetime(2026, 9, 14, 20, 0, tzinfo=timezone.utc))
    assert report["valid"], report["errors"]
    assert report["completed_sweeps"][0]["consumed"] is True
    assert report["completed_sweeps"][1]["unconsumed"] is True
    assert len(report["unconsumed_sweeps"]) == 1
    assert report["boundary_notes"][0]["type"] == "BOUNDARY_VARIATION"
    assert first_path in report["source_discovery_deltas"][0]["associated_sweeps"]

    duplicate = sweep(
        "2026-09-13T12:00:00-04:00",
        "2026-09-14T00:00:00-04:00",
        "LOCKER-DUP",
    )
    write_json(temp / "data/evidence-integration/rook-evidence-locker-sweep-duplicate.json", duplicate)
    duplicate_report = mod.validate_repository(as_of=datetime(2026, 9, 14, 20, 0, tzinfo=timezone.utc))
    assert any("duplicate sweep window" in item for item in duplicate_report["errors"])

with tempfile.TemporaryDirectory() as name:
    temp = Path(name)
    configure(temp)
    bad = sweep(
        "2026-09-14T12:00:00-04:00",
        "2026-09-14T00:00:00-04:00",
        "LOCKER-BAD",
    )
    bad["existing_event_updates"][0].pop("updates_existing_ref")
    write_json(temp / "data/evidence-integration/rook-evidence-locker-sweep-bad.json", bad)
    write_json(temp / "data/canonical-ledger/manifest-v2.json", {
        "current_evidence_cutoff": "2026-09-13T00:00:00-04:00",
        "accepted_updates": [],
    })
    bad_report = mod.validate_repository(as_of=datetime(2026, 9, 15, 0, 0, tzinfo=timezone.utc))
    assert not bad_report["valid"]
    assert any("window_end must be later" in item for item in bad_report["errors"])
    assert any("updates_existing_ref" in item for item in bad_report["errors"])

print("ROOK intake pipeline: PASS")
