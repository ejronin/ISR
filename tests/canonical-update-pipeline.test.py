#!/usr/bin/env python3
"""Scenario tests for the append-only canonical update compiler."""
from __future__ import annotations

import copy
import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_canonical_current_state as compiler  # noqa: E402


KNOWN_AT = "2026-08-28T09:30:00-04:00"
SUPPORT = "SRC-704574F8CB02"


def revision(revision_type: str, reason: str, sources: list[str] | None = None, effective_at: str | None = None, meaning: bool = False) -> dict:
    return {
        "revision_type": revision_type,
        "reason": reason,
        "effective_at": effective_at,
        "supporting_source_ids": [SUPPORT] if sources is None else sources,
        "analytical_meaning_changed": meaning,
    }


def packet(packet_id: str, operations: list[dict], status: str = "DRAFT") -> dict:
    return {
        "schema_version": "1.0",
        "packet_id": packet_id,
        "status": status,
        "known_at": KNOWN_AT,
        "summary": "Phase 3.5 deterministic test fixture; not canonical project evidence.",
        "operations": operations,
    }


def build_with(value: dict) -> tuple[dict, dict]:
    return compiler.build_state(ROOT, [(f"tests/fixtures/{value['packet_id']}.json", value)])


class CanonicalUpdatePipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.baseline, cls.baseline_report = compiler.build_state(ROOT)

    def test_a_new_event_derives_count_without_builder_edit(self) -> None:
        source_id = "SRC-ABCDEF123456"
        actor_id = "ACT-TEST-FIXTURE"
        location_id = "LOC-TEST-FIXTURE"
        event_id = "EV-TEST-20260828-001"
        value = packet("UPD-20260828-NEW-EVENT", [
            {
                "operation_id": "ADD_SOURCE",
                "op": "add_source",
                "entity_id": source_id,
                "record": {
                    "source_id": source_id,
                    "outlet": "Test fixture publisher",
                    "title": "Test fixture source",
                    "url": "https://example.test/new-event",
                    "publication_timestamp": "2026-08-28T08:00:00-04:00",
                    "retrieval_timestamp": KNOWN_AT,
                    "source_type": "TEST_FIXTURE"
                },
                "revision": revision("new_information", "Register the fixture source.", sources=[]),
            },
            {
                "operation_id": "ADD_ACTOR",
                "op": "add_actor",
                "entity_id": actor_id,
                "record": {
                    "actor_id": actor_id,
                    "canonical_name": "Test fixture organization",
                    "aliases": ["test fixture organization"],
                    "entity_type": "entity",
                    "role": None,
                    "affiliation_id": None,
                    "affiliation_type": "organization",
                    "parent_state": None,
                    "flag": "",
                    "subtitle": "Test fixture organization"
                },
                "revision": revision("new_information", "Register the explicitly recorded fixture actor.", sources=[source_id]),
            },
            {
                "operation_id": "ADD_LOCATION",
                "op": "add_location",
                "entity_id": location_id,
                "record": {
                    "location_id": location_id,
                    "canonical_name": "Test fixture location",
                    "alternate_names": [],
                    "location_type": "test-fixture",
                    "parent_geographic_entity": "Test fixture",
                    "latitude": 10.25,
                    "longitude": 20.5,
                    "coordinate_precision": "TEST_FIXTURE",
                    "facility_relationships": [],
                    "location_source_ids": [source_id]
                },
                "revision": revision("new_information", "Register source-supported fixture coordinates.", sources=[source_id]),
            },
            {
                "operation_id": "ADD_EVENT",
                "op": "add_event",
                "entity_id": event_id,
                "record": {
                    "event_id": event_id,
                    "event_date": "2026-08-28",
                    "event_time": "08:15",
                    "event_time_precision": "EXACT",
                    "event_type": "TEST_FIXTURE",
                    "record_class": "TEST FIXTURE",
                    "summary": "A fixture event exercises canonical packet discovery.",
                    "observed_fact": "Fixture only.",
                    "source_ids": [source_id],
                    "actor_ids": [actor_id],
                    "location_ids": [location_id],
                    "claim_ids": []
                },
                "revision": revision("new_information", "Add a source-supported fixture event.", sources=[source_id], effective_at="2026-08-28T08:15:00-04:00"),
            },
        ])
        state, report = build_with(value)
        self.assertEqual(state["counts"]["chronology_records"], self.baseline["counts"]["chronology_records"] + 1)
        event = next(item for item in state["chronology"] if item["event_id"] == event_id)
        self.assertEqual(event["actor_ids"], [actor_id])
        self.assertEqual(event["location_ids"], [location_id])
        self.assertEqual(event["source_ids"], [source_id])
        self.assertEqual(report["derived_chronology_count"], len(state["chronology"]))
        self.assertGreater(report["derived_current_cutoff"], self.baseline["release"]["current_osint_cutoff"])

    def test_b_time_clarification_retains_unknown_and_learned_time(self) -> None:
        event_id = "PRE-20201118-001"
        value = packet("UPD-20260828-TIME", [{
            "operation_id": "TIME_CLARIFICATION",
            "op": "update_event",
            "entity_id": event_id,
            "changes": {
                "event_time": {"previous": None, "new": "03:42"},
                "event_time_precision": {"previous": "DATE_ONLY", "new": "EXACT"}
            },
            "revision": revision("temporal_clarification", "A later source establishes the occurrence time.", effective_at="2020-11-18T03:42:00-05:00"),
        }])
        state, _ = build_with(value)
        event = next(item for item in state["chronology"] if item["event_id"] == event_id)
        self.assertEqual(event["timeline"]["time"], "03:42")
        time_revision = next(item for item in event["revisions"] if item["field"] == "event_time")
        self.assertIsNone(time_revision["previous_value"])
        self.assertEqual(time_revision["new_value"], "03:42")
        self.assertEqual(time_revision["known_at"], KNOWN_AT)
        self.assertEqual(time_revision["effective_at"], "2020-11-18T03:42:00-05:00")

    def test_c_attribution_clarification_preserves_event_id(self) -> None:
        event_id = "WIKI-20260228-BHR5FLEET"
        value = packet("UPD-20260828-ATTRIBUTION", [{
            "operation_id": "ATTRIBUTION_CLARIFICATION",
            "op": "update_event",
            "entity_id": event_id,
            "changes": {"actor_ids": {"previous": ["ACT-IRAN"], "new": ["ACT-IRGC-NAVY"]}},
            "revision": revision("attribution_clarification", "Fixture evidence clarifies the responsible institution.", sources=["SRC-351DB33C9E1C"], effective_at="2026-02-28"),
        }])
        state, _ = build_with(value)
        matches = [item for item in state["chronology"] if item["event_id"] == event_id]
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["actor_ids"], ["ACT-IRGC-NAVY"])
        self.assertEqual(matches[0]["revisions"][0]["previous_value"], ["ACT-IRAN"])

    def test_d_location_refinement_updates_all_consumers(self) -> None:
        location_id = "LOC-8A2C1B4C2FF6"
        affected_before = [item["event_id"] for item in self.baseline["chronology"] if location_id in item["location_ids"]]
        self.assertGreater(len(affected_before), 1)
        value = packet("UPD-20260828-LOCATION", [{
            "operation_id": "LOCATION_REFINEMENT",
            "op": "update_location",
            "entity_id": location_id,
            "changes": {
                "latitude": {"previous": None, "new": 25.0},
                "longitude": {"previous": None, "new": 51.0},
                "coordinate_precision": {"previous": "base", "new": "TEST_FIXTURE_REFINED"}
            },
            "revision": revision("geolocation_refinement", "Fixture source refines shared coordinates."),
        }])
        state, _ = build_with(value)
        affected = [item for item in state["chronology"] if location_id in item["location_ids"]]
        self.assertEqual([item["event_id"] for item in affected], affected_before)
        self.assertTrue(all(item["event"]["location"]["lat"] == 25.0 and item["event"]["location"]["lon"] == 51.0 for item in affected))

    def test_e_source_correction_resolves_once_for_all_references(self) -> None:
        source_id = SUPPORT
        baseline_source = next(item for item in self.baseline["sources"]["records"] if item["source_id"] == source_id)
        previous_url = baseline_source["record"]["url"]
        value = packet("UPD-20260828-SOURCE", [{
            "operation_id": "SOURCE_CORRECTION",
            "op": "update_source",
            "entity_id": source_id,
            "changes": {"url": {"previous": previous_url, "new": "https://example.test/corrected-source"}},
            "revision": revision("source_correction", "Correct the reusable fixture URL.", sources=[source_id]),
        }])
        state, _ = build_with(value)
        source = next(item for item in state["sources"]["records"] if item["source_id"] == source_id)
        self.assertEqual(source["resolution"], "CANONICAL_UPDATE_CURRENT")
        self.assertEqual(source["record"]["url"], "https://example.test/corrected-source")
        reference_keys = [reference["variant_key"] for item in state["chronology"] for reference in item["source_references"] if reference["source_id"] == source_id]
        self.assertTrue(reference_keys)
        self.assertTrue(all(key.startswith("UPD-20260828-SOURCE:") for key in reference_keys))
        self.assertEqual(source["revisions"][0]["previous_value"], previous_url)

    def test_f_historical_correction_preserves_occurrence_vs_known_by(self) -> None:
        event_id = "PRE-20201118-001"
        value = packet("UPD-20260828-HISTORICAL", [{
            "operation_id": "HISTORICAL_CORRECTION",
            "op": "update_event",
            "entity_id": event_id,
            "changes": {"event_time": {"previous": None, "new": "04:10"}},
            "revision": revision("temporal_clarification", "Newly discovered fixture evidence clarifies an older occurrence.", effective_at="2020-11-18T04:10:00-05:00"),
        }])
        state, _ = build_with(value)
        event = next(item for item in state["chronology"] if item["event_id"] == event_id)
        self.assertEqual(event["event"]["event_date"], "2020-11-18")
        self.assertEqual(event["revisions"][0]["known_at"], KNOWN_AT)

    def test_g_invalid_update_fails_without_modifying_current_state(self) -> None:
        artifact = ROOT / compiler.DEFAULT_OUTPUT
        before = hashlib.sha256(artifact.read_bytes()).hexdigest()
        duplicate = packet("UPD-20260828-INVALID", [{
            "operation_id": "DUPLICATE_EVENT",
            "op": "add_event",
            "entity_id": "PRE-20201118-001",
            "record": {"event_id": "PRE-20201118-001"},
            "revision": revision("new_information", "Invalid duplicate fixture."),
        }])
        with self.assertRaisesRegex(ValueError, "Duplicate event ID"):
            build_with(duplicate)
        self.assertEqual(hashlib.sha256(artifact.read_bytes()).hexdigest(), before)

        unresolved = packet("UPD-20260828-UNRESOLVED", [{
            "operation_id": "UNRESOLVED_ACTOR",
            "op": "update_event",
            "entity_id": "PRE-20201118-001",
            "changes": {"actor_ids": {"previous": ["ACT-USAFCENT"], "new": ["ACT-DOES-NOT-EXIST"]}},
            "revision": revision("attribution_clarification", "Invalid unresolved fixture."),
        }])
        with self.assertRaisesRegex(ValueError, "Unresolved canonical references"):
            build_with(unresolved)
        self.assertEqual(hashlib.sha256(artifact.read_bytes()).hexdigest(), before)

        invalid_time = packet("UPD-20260828-BAD-TIME", [{
            "operation_id": "BAD_TIME",
            "op": "update_event",
            "entity_id": "PRE-20201118-001",
            "changes": {
                "event_time": {"previous": None, "new": "not-a-time"},
                "event_time_precision": {"previous": "DATE_ONLY", "new": "EXACT"}
            },
            "revision": revision("temporal_clarification", "Invalid timestamp fixture.", effective_at="2020-11-18"),
        }])
        with self.assertRaisesRegex(ValueError, "invalid precise event_time"):
            build_with(invalid_time)

        bad_location = packet("UPD-20260828-BAD-LOCATION", [{
            "operation_id": "BAD_LOCATION",
            "op": "add_location",
            "entity_id": "LOC-BAD-FIXTURE",
            "record": {
                "location_id": "LOC-BAD-FIXTURE",
                "canonical_name": "Invalid fixture",
                "latitude": 91,
                "longitude": 0,
                "location_source_ids": [SUPPORT]
            },
            "revision": revision("geolocation_refinement", "Invalid coordinate fixture."),
        }])
        with self.assertRaisesRegex(ValueError, "impossible latitude"):
            build_with(bad_location)
        self.assertEqual(hashlib.sha256(artifact.read_bytes()).hexdigest(), before)

    def test_h_determinism_and_manifest_registration(self) -> None:
        value = packet("UPD-20260828-DETERMINISM", [{
            "operation_id": "TIME_CLARIFICATION",
            "op": "update_event",
            "entity_id": "PRE-20201118-001",
            "changes": {"event_time": {"previous": None, "new": "05:00"}},
            "revision": revision("temporal_clarification", "Determinism fixture.", effective_at="2020-11-18T05:00:00-05:00"),
        }])
        first, first_report = build_with(value)
        second, second_report = build_with(copy.deepcopy(value))
        self.assertEqual(compiler.canonical_json_bytes(first), compiler.canonical_json_bytes(second))
        self.assertEqual(first_report, second_report)

        with tempfile.TemporaryDirectory() as temporary:
            temp_root = Path(temporary)
            for directory in ("data", "schemas", "scripts", "snapshots"):
                shutil.copytree(ROOT / directory, temp_root / directory)
            accepted = copy.deepcopy(value)
            accepted["status"] = "ACCEPTED"
            packet_path = "data/canonical-updates/UPD-20260828-DETERMINISM.json"
            (temp_root / packet_path).write_bytes(compiler.canonical_json_bytes(accepted))
            entry = compiler.register_packet(temp_root, packet_path)
            registered = json.loads((temp_root / compiler.MANIFEST_PATH).read_text(encoding="utf-8"))["accepted_updates"]
            self.assertEqual(registered, [entry])
            self.assertEqual(entry["sha256"], hashlib.sha256(compiler.canonical_json_bytes(accepted)).hexdigest())

    def test_i_actor_revision_and_source_link_keep_affiliation_identity(self) -> None:
        source_id = "SRC-FEEDFACE1234"
        actor_id = "ACT-PER-HOSSEIN-MOHEBI"
        value = packet("UPD-20260828-ACTOR-LINK", [
            {
                "operation_id": "ADD_ACTOR_SOURCE",
                "op": "add_source",
                "entity_id": source_id,
                "record": {
                    "source_id": source_id,
                    "outlet": "Test fixture publisher",
                    "title": "Actor role fixture",
                    "url": "https://example.test/actor-role",
                    "publication_timestamp": "2026-08-28T08:00:00-04:00",
                    "retrieval_timestamp": KNOWN_AT,
                    "source_type": "TEST_FIXTURE"
                },
                "revision": revision("new_information", "Register actor-role fixture source.", sources=[]),
            },
            {
                "operation_id": "UPDATE_ACTOR_ROLE",
                "op": "update_actor",
                "entity_id": actor_id,
                "changes": {"role": {"previous": "Spokesperson", "new": "Test fixture clarified spokesperson role"}},
                "revision": revision("attribution_clarification", "Fixture source clarifies the recorded role.", sources=[source_id]),
            },
            {
                "operation_id": "LINK_ACTOR_SOURCE",
                "op": "link_source",
                "entity_type": "actor",
                "entity_id": actor_id,
                "source_id": source_id,
                "revision": revision("relationship_update", "Link the supporting fixture source to the person record.", sources=[source_id]),
            },
        ])
        state, report = build_with(value)
        actor = next(item for item in state["entities"]["actors"] if item["actor_id"] == actor_id)
        self.assertEqual(actor["record"]["affiliation_id"], "ACT-IRGC")
        self.assertEqual(actor["record"]["affiliation_type"], "state-institution")
        self.assertEqual(actor["record"]["flag"], "🇮🇷")
        self.assertIn(source_id, actor["source_ids"])
        self.assertEqual(report["source_links_added"], [{"entity_type": "actor", "entity_id": actor_id, "source_id": source_id}])

    def test_j_exact_duplicate_candidate_is_flagged_not_merged(self) -> None:
        original = next(item for item in self.baseline["chronology"] if item["event_id"] == "PRE-20201118-001")
        record = copy.deepcopy(original["event"])
        record["event_id"] = "EV-TEST-DUPLICATE-CANDIDATE"
        record["actor_ids"] = copy.deepcopy(original["actor_ids"])
        record["location_ids"] = copy.deepcopy(original["location_ids"])
        record["claim_ids"] = copy.deepcopy(original["claim_ids"])
        value = packet("UPD-20260828-DUPLICATE-WARNING", [{
            "operation_id": "ADD_DUPLICATE_CANDIDATE",
            "op": "add_event",
            "entity_id": record["event_id"],
            "record": record,
            "revision": revision("new_information", "Exact duplicate-warning fixture; human review is required.", effective_at=record["event_date"]),
        }])
        state, report = build_with(value)
        self.assertEqual(state["counts"]["chronology_records"], self.baseline["counts"]["chronology_records"] + 1)
        warning = next(item for item in report["duplicate_collision_warnings"] if item["kind"] == "EXACT_EVENT_FINGERPRINT")
        self.assertEqual(warning["entity_ids"], ["PRE-20201118-001", "EV-TEST-DUPLICATE-CANDIDATE"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
