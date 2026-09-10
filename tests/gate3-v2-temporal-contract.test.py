#!/usr/bin/env python3
"""Contract-level temporal regression matrix for Gate 3 v2."""
from __future__ import annotations

import copy
import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_canonical_current_state_v2 as consumer  # noqa: E402
import canonical_temporal_contract as temporal  # noqa: E402
import gate3_v2_registration as registrar  # noqa: E402

COPY_DIRS = ("data", "schemas", "scripts", "snapshots")


def copy_repo(target: Path) -> None:
    for name in COPY_DIRS:
        shutil.copytree(ROOT / name, target / name)


def load_manifest(root: Path) -> dict:
    return json.loads((root / registrar.MANIFEST_PATH).read_text(encoding="utf-8"))


def make_packet(root: Path, suffix: str, known_at, evidence_cutoff, *, event_day: str | None = None) -> dict:
    known = known_at.isoformat() if hasattr(known_at, "isoformat") else known_at
    cutoff = evidence_cutoff.isoformat() if hasattr(evidence_cutoff, "isoformat") else evidence_cutoff
    day = event_day or cutoff[:10]
    source_id = "SRC-" + hashlib.sha1(suffix.encode()).hexdigest()[:12].upper()
    event_id = f"TEST-TEMPORAL-{suffix}-EVENT"
    packet_id = f"UPD-{known[:10].replace('-', '')}-TEMPORAL-{suffix}"
    return {
        "schema_version": "2.0",
        "status": "ACCEPTED",
        "packet_id": packet_id,
        "known_at": known,
        "evidence_cutoff": cutoff,
        "summary": f"Synthetic temporal contract fixture {suffix}.",
        "sources": [{
            "source_id": source_id,
            "outlet": "Atlas temporal contract fixture",
            "title": suffix,
            "url": f"https://example.test/temporal/{suffix.lower()}",
            "source_role": "TEST_FIXTURE",
            "published_date": day,
        }],
        "events": [{
            "event_id": event_id,
            "event_date": day,
            "event_time_precision": "DATE_ONLY",
            "summary": f"Synthetic temporal event {suffix}.",
            "event_type": "TEST_TEMPORAL_EVENT",
            "event_class": "STATE_SNAPSHOT",
            "strike_countable": False,
            "public_available_time": f"{day}T00:00:00-04:00",
            "game_knowledge_time": known,
            "source_ids": [source_id],
        }],
        "entities": [],
        "narrative_claims": [],
    }


def write_packet(root: Path, packet: dict) -> str:
    relative = f"data/canonical-updates/{packet['packet_id']}.json"
    (root / relative).write_bytes(registrar.canonical_json_bytes(packet))
    return relative


class TemporalContractMatrix(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        copy_repo(self.root)
        self.manifest = load_manifest(self.root)
        self.tip_known = temporal.parse_datetime(self.manifest["accepted_updates"][-1]["known_at"], "tip known")
        self.tip_cutoff = temporal.parse_datetime(self.manifest["current_evidence_cutoff"], "tip cutoff")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_valid_packet_pairs_table(self) -> None:
        cases = {
            "ordinary_same_period": (self.tip_known + timedelta(days=1), self.tip_cutoff + timedelta(days=1)),
            "equal_cutoff_known": (self.tip_known + timedelta(days=2), self.tip_known + timedelta(days=2)),
            "delayed_knowledge": (self.tip_known + timedelta(days=2), self.tip_cutoff + timedelta(hours=1)),
            "multi_day_delayed": (self.tip_known + timedelta(days=5), self.tip_cutoff + timedelta(days=1)),
        }
        for name, (known, cutoff) in cases.items():
            with self.subTest(name=name):
                temporal.validate_packet_temporal_semantics({"known_at": known.isoformat(), "evidence_cutoff": cutoff.isoformat()})

    def test_valid_lineage_cases_table(self) -> None:
        baseline = copy.deepcopy(self.manifest)
        next_known = self.tip_known + timedelta(days=2)
        advancing_cutoff = self.tip_cutoff + timedelta(days=1)
        late_known = next_known + timedelta(days=2)
        rows = baseline["accepted_updates"]
        rows.append({"sequence": len(rows)+1, "known_at": next_known.isoformat(), "evidence_cutoff": advancing_cutoff.isoformat()})
        rows.append({"sequence": len(rows)+1, "known_at": late_known.isoformat(), "evidence_cutoff": advancing_cutoff.isoformat()})
        baseline["current_evidence_cutoff"] = advancing_cutoff.isoformat()
        projection = temporal.validate_manifest_temporal_contract(baseline)
        self.assertEqual(projection.current_evidence_cutoff, advancing_cutoff.isoformat())
        self.assertEqual(projection.tip_known_at, late_known.isoformat())

    def test_invalid_packet_pairs_table(self) -> None:
        cases = {
            "future_evidence": {"known_at": self.tip_known.isoformat(), "evidence_cutoff": (self.tip_known + timedelta(seconds=1)).isoformat()},
            "malformed_known": {"known_at": "not-a-time", "evidence_cutoff": self.tip_cutoff.isoformat()},
            "unzoned_known": {"known_at": "2026-09-10T12:00:00", "evidence_cutoff": self.tip_cutoff.isoformat()},
            "unzoned_cutoff": {"known_at": (self.tip_known + timedelta(days=1)).isoformat(), "evidence_cutoff": "2026-09-07T12:00:00"},
        }
        for name, packet in cases.items():
            with self.subTest(name=name):
                with self.assertRaises(ValueError):
                    temporal.validate_packet_temporal_semantics(packet)

    def test_nonincreasing_known_at_is_rejected_independently(self) -> None:
        prior_known = self.tip_known + timedelta(days=5)
        prior_cutoff = self.tip_cutoff + timedelta(days=1)
        for name, candidate_known in (
            ("equal_known", prior_known),
            ("decreasing_known", prior_known - timedelta(seconds=1)),
        ):
            with self.subTest(name=name):
                value = {
                    "gate2_evidence_cutoff": self.manifest["gate2_evidence_cutoff"],
                    "current_evidence_cutoff": prior_cutoff.isoformat(),
                    "accepted_updates": [
                        {"sequence": 1, "known_at": prior_known.isoformat(), "evidence_cutoff": prior_cutoff.isoformat()},
                        {"sequence": 2, "known_at": candidate_known.isoformat(), "evidence_cutoff": prior_cutoff.isoformat()},
                    ],
                }
                with self.assertRaisesRegex(ValueError, "increase strictly"):
                    temporal.validate_manifest_temporal_contract(value)

    def test_evidence_horizon_regression_is_rejected_independently(self) -> None:
        prior_known = self.tip_known + timedelta(days=3)
        prior_cutoff = self.tip_cutoff + timedelta(days=2)
        regressed = prior_cutoff - timedelta(seconds=1)
        value = {
            "gate2_evidence_cutoff": self.manifest["gate2_evidence_cutoff"],
            "current_evidence_cutoff": regressed.isoformat(),
            "accepted_updates": [
                {"sequence": 1, "known_at": prior_known.isoformat(), "evidence_cutoff": prior_cutoff.isoformat()},
                {"sequence": 2, "known_at": (prior_known + timedelta(days=1)).isoformat(), "evidence_cutoff": regressed.isoformat()},
            ],
        }
        with self.assertRaisesRegex(ValueError, "may not move backward"):
            temporal.validate_manifest_temporal_contract(value)

    def test_real_registrar_accepts_delayed_knowledge_and_consumer_agrees(self) -> None:
        known = self.tip_known + timedelta(days=3)
        cutoff = self.tip_cutoff + timedelta(days=1)
        packet = make_packet(self.root, "DELAYED", known, cutoff)
        relative = write_packet(self.root, packet)
        registrar.register_v2_packet(self.root, relative)
        state = consumer.build_state(self.root)
        self.assertEqual(state["release"]["current_osint_cutoff"], cutoff.isoformat())
        self.assertEqual(state["accepted_updates_v2"][-1]["known_at"], known.isoformat())

    def test_real_registrar_accepts_late_historical_evidence_without_horizon_regression(self) -> None:
        first_known = self.tip_known + timedelta(days=2)
        horizon = self.tip_cutoff + timedelta(days=2)
        first = make_packet(self.root, "ADVANCE", first_known, horizon)
        registrar.register_v2_packet(self.root, write_packet(self.root, first))
        late_known = first_known + timedelta(days=2)
        historical_day = (self.tip_cutoff - timedelta(days=1)).date().isoformat()
        late = make_packet(self.root, "LATEHIST", late_known, horizon, event_day=historical_day)
        registrar.register_v2_packet(self.root, write_packet(self.root, late))
        after = load_manifest(self.root)
        self.assertEqual(after["current_evidence_cutoff"], horizon.isoformat())
        self.assertEqual(after["accepted_updates"][-1]["known_at"], late_known.isoformat())
        state = consumer.build_state(self.root)
        self.assertIn(late["events"][0]["event_id"], {row["event_id"] for row in state["chronology"]})

    def test_invalid_appends_are_transactional(self) -> None:
        cases = [
            ("BACKDATED", self.tip_known, self.tip_cutoff, "strictly later"),
            ("REGRESS", self.tip_known + timedelta(days=1), self.tip_cutoff - timedelta(seconds=1), "may not move backward"),
            ("FUTURE", self.tip_known + timedelta(days=1), self.tip_known + timedelta(days=1, seconds=1), "may not be later"),
        ]
        for suffix, known, cutoff, message in cases:
            with self.subTest(suffix=suffix):
                before = (self.root / registrar.MANIFEST_PATH).read_bytes()
                packet = make_packet(self.root, suffix, known, cutoff)
                relative = write_packet(self.root, packet)
                with self.assertRaisesRegex(ValueError, message):
                    registrar.register_v2_packet(self.root, relative)
                self.assertEqual((self.root / registrar.MANIFEST_PATH).read_bytes(), before)

    def test_registrar_and_consumer_share_the_same_temporal_authority(self) -> None:
        self.assertIs(registrar.temporal, temporal)
        self.assertIs(consumer.temporal, temporal)
        projection = temporal.validate_manifest_temporal_contract(self.manifest)
        state = consumer.build_state(self.root)
        self.assertEqual(state["release"]["current_osint_cutoff"], projection.current_evidence_cutoff)


if __name__ == "__main__":
    unittest.main(verbosity=2)
