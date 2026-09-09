#!/usr/bin/env python3
"""Transactional authority tests for production Gate 3 v2 registration."""
from __future__ import annotations

import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import gate3_v2_registration as registrar  # noqa: E402

COPY_DIRS = ("data", "schemas", "scripts", "snapshots")


def copy_repo(target: Path) -> None:
    for name in COPY_DIRS:
        shutil.copytree(ROOT / name, target / name)


def manifest(root: Path) -> dict:
    return json.loads((root / registrar.MANIFEST_PATH).read_text(encoding="utf-8"))


def future_clock(root: Path, seconds: int = 1):
    tip = registrar.parse_datetime(manifest(root)["accepted_updates"][-1]["known_at"], "tip")
    return tip + timedelta(seconds=seconds)


def packet_for(root: Path, suffix: str, *, status: str = "ACCEPTED", known_at=None) -> dict:
    when = known_at or future_clock(root)
    stamp = when.isoformat()
    day = stamp[:10]
    packet_id = f"UPD-{when:%Y%m%d}-REGTEST-{suffix}"
    source_id = "SRC-" + hashlib.sha1(f"gate3-v2-{suffix}".encode()).hexdigest()[:12].upper()
    event_id = f"TEST-G3-V2-{suffix}-EVENT"
    loss_id = f"TEST-G3-V2-{suffix}-LOSS"
    return {
        "schema_version": "2.0",
        "status": status,
        "packet_id": packet_id,
        "known_at": stamp,
        "evidence_cutoff": stamp,
        "summary": f"Synthetic Gate 3 v2 registrar transaction fixture {suffix}.",
        "sources": [{
            "source_id": source_id,
            "outlet": "Gate 3 v2 registrar fixture",
            "title": suffix,
            "url": f"https://example.test/gate3-v2/{suffix.lower()}",
            "source_role": "TEST_FIXTURE",
        }],
        "events": [{
            "event_id": event_id,
            "event_date": day,
            "event_time_precision": "DATE_ONLY",
            "summary": f"Synthetic registrar event {suffix}.",
            "event_type": "TEST_REGISTRATION_EVENT",
            "event_class": "STATE_SNAPSHOT",
            "strike_countable": False,
            "public_available_time": stamp,
            "game_knowledge_time": stamp,
            "source_ids": [source_id],
        }],
        "entities": [{
            "entity_type": "material_loss",
            "entity_id": loss_id,
            "record": {
                "loss_id": loss_id,
                "event_date": day,
                "event_ref": event_id,
                "actor": "Synthetic registrar fixture",
                "side": "TEST",
                "status": "DAMAGED",
                "quantity": 1,
                "source_ids": [source_id],
            },
        }],
        "narrative_claims": [],
    }


def write_packet(root: Path, packet: dict, filename: str | None = None) -> str:
    name = filename or f"{packet['packet_id']}.json"
    relative = f"data/canonical-updates/{name}"
    (root / relative).write_bytes(registrar.canonical_json_bytes(packet))
    return relative


class Gate3V2RegistrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        copy_repo(self.root)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def assert_manifest_unchanged(self, before: bytes) -> None:
        self.assertEqual((self.root / registrar.MANIFEST_PATH).read_bytes(), before)

    def test_success_appends_one_entry_and_preserves_prior_packets(self) -> None:
        before_manifest = manifest(self.root)
        before_packet_bytes = {row["path"]: (self.root / row["path"]).read_bytes() for row in before_manifest["accepted_updates"]}
        packet = packet_for(self.root, "SUCCESS")
        relative = write_packet(self.root, packet)
        entry = registrar.register_v2_packet(self.root, relative)
        after = manifest(self.root)
        self.assertEqual(after["accepted_updates"][:-1], before_manifest["accepted_updates"])
        self.assertEqual(len(after["accepted_updates"]), len(before_manifest["accepted_updates"]) + 1)
        self.assertEqual(after["accepted_updates"][-1], entry)
        self.assertEqual(after["current_evidence_cutoff"], packet["evidence_cutoff"])
        self.assertEqual(entry["acceptance_basis"], registrar.REGISTERED_ACCEPTANCE_BASIS)
        self.assertEqual(entry["previous_lineage_sha256"], before_manifest["accepted_updates"][-1]["lineage_sha256"])
        self.assertEqual(registrar.verify_manifest(self.root), entry["lineage_sha256"])
        for path, content in before_packet_bytes.items():
            self.assertEqual((self.root / path).read_bytes(), content)

    def test_invalid_schema_does_not_mutate_manifest(self) -> None:
        packet = packet_for(self.root, "BADSCHEMA")
        del packet["summary"]
        relative = write_packet(self.root, packet)
        before = (self.root / registrar.MANIFEST_PATH).read_bytes()
        with self.assertRaisesRegex(ValueError, "schema validation failed"):
            registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(before)

    def test_nonaccepted_status_does_not_mutate_manifest(self) -> None:
        packet = packet_for(self.root, "REVIEWED", status="REVIEWED")
        relative = write_packet(self.root, packet)
        before = (self.root / registrar.MANIFEST_PATH).read_bytes()
        with self.assertRaisesRegex(ValueError, "status ACCEPTED"):
            registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(before)

    def test_duplicate_packet_id_does_not_mutate_manifest(self) -> None:
        packet = packet_for(self.root, "DUPID")
        packet["packet_id"] = manifest(self.root)["accepted_updates"][0]["packet_id"]
        relative = write_packet(self.root, packet, "UPD-20990101-DUPLICATE-ID.json")
        before = (self.root / registrar.MANIFEST_PATH).read_bytes()
        with self.assertRaisesRegex(ValueError, "packet_id is already registered"):
            registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(before)

    def test_duplicate_path_does_not_mutate_manifest(self) -> None:
        packet = packet_for(self.root, "DUPPATHA")
        relative = write_packet(self.root, packet)
        registrar.register_v2_packet(self.root, relative)
        already_registered = (self.root / registrar.MANIFEST_PATH).read_bytes()
        replacement = packet_for(self.root, "DUPPATHB")
        (self.root / relative).write_bytes(registrar.canonical_json_bytes(replacement))
        with self.assertRaisesRegex(ValueError, "path is already registered"):
            registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(already_registered)

    def test_accepted_packet_hash_mismatch_blocks_new_registration(self) -> None:
        accepted_path = self.root / manifest(self.root)["accepted_updates"][-1]["path"]
        accepted_path.write_bytes(accepted_path.read_bytes() + b" ")
        packet = packet_for(self.root, "HASHFAIL")
        relative = write_packet(self.root, packet)
        before = (self.root / registrar.MANIFEST_PATH).read_bytes()
        with self.assertRaisesRegex(ValueError, "packet hash mismatch"):
            registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(before)

    def test_nonincreasing_known_at_does_not_mutate_manifest(self) -> None:
        tip = registrar.parse_datetime(manifest(self.root)["accepted_updates"][-1]["known_at"], "tip")
        packet = packet_for(self.root, "EQUALTIP", known_at=tip)
        relative = write_packet(self.root, packet)
        before = (self.root / registrar.MANIFEST_PATH).read_bytes()
        with self.assertRaisesRegex(ValueError, "strictly later"):
            registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(before)

    def test_attempted_historical_insertion_does_not_mutate_manifest(self) -> None:
        tip = registrar.parse_datetime(manifest(self.root)["accepted_updates"][-1]["known_at"], "tip")
        packet = packet_for(self.root, "HISTORICAL", known_at=tip - timedelta(hours=1))
        relative = write_packet(self.root, packet)
        before = (self.root / registrar.MANIFEST_PATH).read_bytes()
        with self.assertRaisesRegex(ValueError, "strictly later"):
            registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(before)

    def test_prior_lineage_mismatch_does_not_mutate_manifest(self) -> None:
        value = manifest(self.root)
        value["accepted_updates"][-1]["previous_lineage_sha256"] = "0" * 64
        (self.root / registrar.MANIFEST_PATH).write_bytes(registrar.canonical_json_bytes(value))
        before = (self.root / registrar.MANIFEST_PATH).read_bytes()
        packet = packet_for(self.root, "BADPRIOR")
        relative = write_packet(self.root, packet)
        with self.assertRaisesRegex(ValueError, "prior-lineage chain"):
            registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(before)

    def test_prior_entry_mutation_cannot_be_hidden_by_rehashing_lineage(self) -> None:
        value = manifest(self.root)
        value["accepted_updates"][0]["packet_id"] = "UPD-20260905-GATE3-CORRECTX"
        previous = registrar.ACCEPTED_LEDGER_GENESIS_SHA256
        for row in value["accepted_updates"]:
            row["previous_lineage_sha256"] = previous
            row["lineage_sha256"] = registrar.sha256_bytes(registrar.lineage_material(row))
            previous = row["lineage_sha256"]
        (self.root / registrar.MANIFEST_PATH).write_bytes(registrar.canonical_json_bytes(value))
        before = (self.root / registrar.MANIFEST_PATH).read_bytes()
        packet = packet_for(self.root, "PREFIXMUT")
        relative = write_packet(self.root, packet)
        with self.assertRaisesRegex(ValueError, "pre-registrar accepted prefix"):
            registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(before)

    def test_malformed_packet_does_not_mutate_manifest(self) -> None:
        relative = "data/canonical-updates/UPD-20990101-REGTEST-MALFORMED.json"
        (self.root / relative).write_text("{not-json", encoding="utf-8")
        before = (self.root / registrar.MANIFEST_PATH).read_bytes()
        with self.assertRaisesRegex(ValueError, "malformed JSON"):
            registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(before)

    def test_midway_atomic_replace_failure_rolls_back_manifest(self) -> None:
        packet = packet_for(self.root, "ATOMICFAIL")
        relative = write_packet(self.root, packet)
        manifest_path = self.root / registrar.MANIFEST_PATH
        before = manifest_path.read_bytes()
        with mock.patch.object(registrar, "_atomic_replace", side_effect=OSError("synthetic replace failure")):
            with self.assertRaisesRegex(OSError, "synthetic replace failure"):
                registrar.register_v2_packet(self.root, relative)
        self.assert_manifest_unchanged(before)
        self.assertFalse(manifest_path.with_name(manifest_path.name + ".tmp").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
