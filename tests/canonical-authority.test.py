#!/usr/bin/env python3
"""Authority regressions for the Phase 3.5 canonical update pipeline."""
from __future__ import annotations

import copy
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_canonical_current_state as compiler  # noqa: E402
import build_public_current_state as public_builder  # noqa: E402
import canonical_authority as authority  # noqa: E402


SUPPORT = "SRC-704574F8CB02"
AMBIGUOUS_SOURCE = "SRC-6843BB957E02"


def revision(reason: str, sources: list[str] | None = None) -> dict:
    return {
        "revision_type": "new_information",
        "reason": reason,
        "supporting_source_ids": [] if sources is None else sources,
        "analytical_meaning_changed": False,
    }


def source_packet(packet_id: str, known_at: str, source_id: str) -> dict:
    return {
        "schema_version": "1.0",
        "packet_id": packet_id,
        "status": "ACCEPTED",
        "known_at": known_at,
        "summary": "Authority regression fixture; not canonical evidence.",
        "operations": [{
            "operation_id": "ADD_SOURCE",
            "op": "add_source",
            "entity_id": source_id,
            "record": {
                "source_id": source_id,
                "outlet": "Authority test fixture",
                "title": packet_id,
                "url": f"https://example.test/{packet_id.lower()}",
                "publication_timestamp": known_at,
                "retrieval_timestamp": known_at,
                "source_type": "TEST_FIXTURE",
            },
            "revision": revision("Register a non-canonical authority fixture source."),
        }],
    }


def write_packet(root: Path, value: dict) -> str:
    relative = f"data/canonical-updates/{value['packet_id']}.json"
    (root / relative).write_bytes(compiler.canonical_json_bytes(value))
    return relative


def copy_repo(target: Path) -> None:
    for directory in ("data", "schemas", "scripts", "snapshots"):
        shutil.copytree(ROOT / directory, target / directory)


class CanonicalAuthorityTests(unittest.TestCase):
    def temp_repo(self):
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name)
        copy_repo(root)
        return temporary, root

    def test_a_sealed_input_change_fails_with_original_seal(self) -> None:
        temporary, root = self.temp_repo()
        with temporary:
            target = root / "data/current-update-20260824/events.json"
            target.write_bytes(target.read_bytes() + b"\n")
            with self.assertRaisesRegex(ValueError, "sealed migration input"):
                compiler.build_state(root)

    def test_b_sealed_input_and_matching_seal_rewrite_still_fails(self) -> None:
        temporary, root = self.temp_repo()
        with temporary:
            relative = "data/current-update-20260824/events.json"
            target = root / relative
            target.write_bytes(target.read_bytes() + b"\n")
            boundary_path = root / authority.MIGRATION_BOUNDARY_PATH
            boundary = json.loads(boundary_path.read_text(encoding="utf-8"))
            item = next(value for value in boundary["protected_files"] if value["path"] == relative)
            normalized = compiler.canonical_input_bytes(target.read_bytes())
            item["sha256"] = compiler.sha256_bytes(normalized)
            item["bytes"] = len(normalized)
            boundary_path.write_bytes(compiler.canonical_json_bytes(boundary))
            with self.assertRaisesRegex(ValueError, "independently pinned"):
                compiler.build_state(root)

    def test_c_boundary_delete_and_reseal_is_disabled(self) -> None:
        temporary, root = self.temp_repo()
        with temporary:
            (root / authority.MIGRATION_BOUNDARY_PATH).unlink()
            with self.assertRaisesRegex(ValueError, "resealing is disabled"):
                compiler.seal_migration_boundary(root)

    def test_d_accepted_phase3_head_cannot_be_redefined(self) -> None:
        temporary, root = self.temp_repo()
        with temporary:
            manifest_path = root / compiler.MANIFEST_PATH
            boundary_path = root / authority.MIGRATION_BOUNDARY_PATH
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            boundary = json.loads(boundary_path.read_text(encoding="utf-8"))
            manifest["migration_boundary"]["accepted_phase3_head"] = "0" * 40
            boundary["accepted_phase3_head"] = "0" * 40
            manifest_path.write_bytes(compiler.canonical_json_bytes(manifest))
            boundary_path.write_bytes(compiler.canonical_json_bytes(boundary))
            with self.assertRaisesRegex(ValueError, "accepted Phase 3 HEAD|authority"):
                compiler.build_state(root)

    def test_e_legitimate_registration_preserves_boundary(self) -> None:
        temporary, root = self.temp_repo()
        with temporary:
            boundary_path = root / authority.MIGRATION_BOUNDARY_PATH
            before = boundary_path.read_bytes()
            value = source_packet("UPD-20260828-AUTH-A", "2026-08-28T10:00:00-04:00", "SRC-AAAAAAAAAAAA")
            compiler.register_packet(root, write_packet(root, value))
            self.assertEqual(boundary_path.read_bytes(), before)
            state, _ = compiler.build_state(root)
            self.assertEqual(state["counts"]["accepted_update_packets"], 1)

    def test_f_append_only_ordering_and_transactional_registration(self) -> None:
        temporary, root = self.temp_repo()
        with temporary:
            artifact = root / compiler.DEFAULT_OUTPUT
            artifact_before = artifact.read_bytes()
            packet_a = source_packet("UPD-20260828-LINEAGE-A", "2026-08-28T10:00:00-04:00", "SRC-AAAAAAAAAAA1")
            compiler.register_packet(root, write_packet(root, packet_a))
            manifest_path = root / compiler.MANIFEST_PATH
            manifest_after_a = manifest_path.read_bytes()
            earlier_b = source_packet("UPD-20260828-LINEAGE-EARLY", "2026-08-28T09:00:00-04:00", "SRC-BBBBBBBBBBB1")
            with self.assertRaisesRegex(ValueError, "strictly later"):
                compiler.register_packet(root, write_packet(root, earlier_b))
            self.assertEqual(manifest_path.read_bytes(), manifest_after_a)
            self.assertEqual(artifact.read_bytes(), artifact_before)
            packet_b = source_packet("UPD-20260828-LINEAGE-B", "2026-08-28T11:00:00-04:00", "SRC-BBBBBBBBBBB2")
            compiler.register_packet(root, write_packet(root, packet_b))
            state, _ = compiler.build_state(root)
            self.assertEqual(state["counts"]["accepted_update_packets"], 2)
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(manifest["accepted_updates"][1]["previous_lineage_sha256"], manifest["accepted_updates"][0]["lineage_sha256"])

    def test_g_prior_accepted_sequence_is_an_exact_prefix(self) -> None:
        temporary, root = self.temp_repo()
        with temporary:
            packet_a = source_packet("UPD-20260828-PREFIX-A", "2026-08-28T10:00:00-04:00", "SRC-AAAAAAAAAAA2")
            packet_b = source_packet("UPD-20260828-PREFIX-B", "2026-08-28T11:00:00-04:00", "SRC-BBBBBBBBBBB3")
            compiler.register_packet(root, write_packet(root, packet_a))
            prior_a = json.loads((root / compiler.MANIFEST_PATH).read_text(encoding="utf-8"))
            compiler.register_packet(root, write_packet(root, packet_b))
            prior_ab = json.loads((root / compiler.MANIFEST_PATH).read_text(encoding="utf-8"))
            authority.require_exact_prefix(prior_a, prior_ab)

            mutations = []
            removed = copy.deepcopy(prior_ab)
            removed["accepted_updates"] = removed["accepted_updates"][1:]
            mutations.append(removed)
            reordered = copy.deepcopy(prior_ab)
            reordered["accepted_updates"].reverse()
            mutations.append(reordered)
            for field, value in (("sha256", "0" * 64), ("packet_id", "UPD-20260828-ALTERED"), ("path", "data/canonical-updates/UPD-20260828-ALTERED.json"), ("known_at", "2026-08-28T12:00:00-04:00")):
                changed = copy.deepcopy(prior_ab)
                changed["accepted_updates"][0][field] = value
                mutations.append(changed)
            for mutated in mutations:
                with self.assertRaises(ValueError):
                    authority.require_exact_prefix(prior_ab, mutated)

            replaced_packet = copy.deepcopy(packet_a)
            replaced_packet["summary"] = "Rewritten accepted packet fixture."
            replaced_sha = hashlib.sha256(compiler.canonical_json_bytes(replaced_packet)).hexdigest()
            rewritten = copy.deepcopy(prior_ab)
            rewritten["accepted_updates"][0] = authority.make_accepted_entry(
                packet_a["packet_id"],
                rewritten["accepted_updates"][0]["path"],
                replaced_sha,
                packet_a["known_at"],
                authority.ACCEPTED_LEDGER_GENESIS_SHA256,
            )
            second = rewritten["accepted_updates"][1]
            rewritten["accepted_updates"][1] = authority.make_accepted_entry(
                second["packet_id"], second["path"], second["sha256"], second["known_at"], rewritten["accepted_updates"][0]["lineage_sha256"]
            )
            authority.verify_accepted_lineage(rewritten)
            with self.assertRaisesRegex(ValueError, "exact prefix"):
                authority.require_exact_prefix(prior_ab, rewritten)

    def test_h_conflicted_source_correction_is_variant_scoped(self) -> None:
        baseline, _ = compiler.build_state(ROOT)
        baseline_source = next(item for item in baseline["sources"]["records"] if item["source_id"] == AMBIGUOUS_SOURCE)
        self.assertEqual(baseline_source["resolution"], "PROVENANCE_SCOPED_VARIANTS_REQUIRED")
        self.assertGreaterEqual(len(baseline_source["variants"]), 2)
        variant_a_key = f"historical_reconciliation:{AMBIGUOUS_SOURCE}"
        variant_b_key = f"forensic_v1_3_2:{AMBIGUOUS_SOURCE}"
        variant_a = next(item for item in baseline_source["variants"] if item["variant_key"] == variant_a_key)
        variant_b = next(item for item in baseline_source["variants"] if item["variant_key"] == variant_b_key)
        global_update = {
            "schema_version": "1.0",
            "packet_id": "UPD-20260828-SOURCE-GLOBAL",
            "status": "DRAFT",
            "known_at": "2026-08-28T12:00:00-04:00",
            "summary": "Rejected global source correction fixture.",
            "operations": [{
                "operation_id": "GLOBAL_SOURCE_CORRECTION",
                "op": "update_source",
                "entity_id": AMBIGUOUS_SOURCE,
                "changes": {"url": {"previous": variant_a["record"]["url"], "new": "https://example.test/global-forbidden"}},
                "revision": {**revision("Global correction must fail.", [AMBIGUOUS_SOURCE]), "revision_type": "source_correction"},
            }],
        }
        with self.assertRaisesRegex(ValueError, "provenance-scoped variant"):
            compiler.build_state(ROOT, [("tests/fixtures/global-source.json", global_update)])

        targeted = copy.deepcopy(global_update)
        targeted["packet_id"] = "UPD-20260828-SOURCE-SCOPED"
        targeted["operations"][0]["operation_id"] = "SCOPED_SOURCE_CORRECTION"
        targeted["operations"][0]["variant_key"] = variant_a_key
        targeted["operations"][0]["changes"]["url"]["new"] = "https://example.test/scoped-correction"
        state, _ = compiler.build_state(ROOT, [("tests/fixtures/scoped-source.json", targeted)])
        source = next(item for item in state["sources"]["records"] if item["source_id"] == AMBIGUOUS_SOURCE)
        corrected_a = next(item for item in source["variants"] if item["variant_key"] == variant_a_key)
        unchanged_b = next(item for item in source["variants"] if item["variant_key"] == variant_b_key)
        self.assertEqual(source["resolution"], "PROVENANCE_SCOPED_VARIANTS_REQUIRED")
        self.assertIsNone(source["record"])
        self.assertEqual(corrected_a["record"]["url"], "https://example.test/scoped-correction")
        self.assertEqual(compiler.canonical_json_bytes(unchanged_b), compiler.canonical_json_bytes(variant_b))
        historical_references = [
            reference["variant_key"]
            for event in state["chronology"]
            for reference in event["source_references"]
            if reference["source_id"] == AMBIGUOUS_SOURCE
        ]
        self.assertTrue(historical_references)
        self.assertTrue(all(key == variant_a_key for key in historical_references))

    def test_i_historical_reference_role_cannot_bypass_key_prefix(self) -> None:
        temporary, root = self.temp_repo()
        with temporary:
            registry_path = root / public_builder.REGISTRY_PATH
            registry = json.loads(registry_path.read_text(encoding="utf-8"))
            dataset = next(item for item in registry["datasets"] if item["key"] == "legacy.core")
            dataset["key"] = "renamed.historical"
            registry["page_data"]["start_here"].append("renamed.historical")
            registry_path.write_bytes(public_builder.canonical_json_bytes(registry))
            compiler_state, _ = compiler.build_state(root)
            (root / compiler.DEFAULT_OUTPUT).write_bytes(compiler.canonical_json_bytes(compiler_state))
            with self.assertRaisesRegex(ValueError, "historical-reference"):
                public_builder.build_state(root)

    def test_j_failed_preview_reports_structured_unresolved_references(self) -> None:
        temporary, root = self.temp_repo()
        with temporary:
            value = {
                "schema_version": "1.0",
                "packet_id": "UPD-20260828-PREVIEW-ERROR",
                "status": "DRAFT",
                "known_at": "2026-08-28T12:00:00-04:00",
                "summary": "Structured preview failure fixture.",
                "operations": [{
                    "operation_id": "UNRESOLVED_ACTOR",
                    "op": "update_event",
                    "entity_id": "PRE-20201118-001",
                    "changes": {"actor_ids": {"previous": ["ACT-USAFCENT"], "new": ["ACT-NOT-REGISTERED"]}},
                    "revision": {
                        "revision_type": "attribution_clarification",
                        "reason": "Exercise structured unresolved-reference reporting.",
                        "supporting_source_ids": [SUPPORT],
                        "analytical_meaning_changed": False,
                    },
                }],
            }
            relative = write_packet(root, value)
            result = subprocess.run(
                [sys.executable, str(root / "scripts/build_canonical_current_state.py"), "--root", str(root), "--preview", relative],
                cwd=root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            report = json.loads(result.stdout.split("\ncanonical-update:", 1)[0])
            self.assertEqual(report["status"], "FAIL")
            self.assertTrue(report["errors"])
            self.assertEqual(report["unresolved_references"], ["event:PRE-20201118-001->actor:ACT-NOT-REGISTERED"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
