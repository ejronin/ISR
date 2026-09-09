#!/usr/bin/env python3
"""Forward-update canary for the production Gate 3 v2 registration path."""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_canonical_current_state as canonical_v1  # noqa: E402
import build_canonical_current_state_v2_final as canonical_v2  # noqa: E402
import build_public_current_state_v2_hardened as public_v2  # noqa: E402
import build_public_release as release_builder  # noqa: E402
import gate3_v2_registration as registrar  # noqa: E402

COPY_DIRS = ("data", "schemas", "scripts", "snapshots", "assets", "templates", "js", "css", "vendor", "config")
COPY_FILES = ("index.html", ".nojekyll")
GATE2_FROZEN = "2026-09-05T00:37:00-04:00"
SEP6_PACKET_ID = "UPD-20260906-CURRENT"
SYNTHETIC_SOURCE_ID = "SRC-CA11A7E0F0A1"
SYNTHETIC_EVENT_ID = "TEST-CANARY-G3-FORWARD-EVENT"
SYNTHETIC_LOSS_ID = "TEST-CANARY-MAT-FORWARD"
SYNTHETIC_ACTOR_ID = "TEST-CANARY-ACTOR-FORWARD"


def copy_repo(target: Path) -> None:
    for name in COPY_DIRS:
        shutil.copytree(ROOT / name, target / name)
    for name in COPY_FILES:
        shutil.copy2(ROOT / name, target / name)


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_generated(path: Path, raw: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)


def canonical_id_set(state: dict, collection: str) -> set[str]:
    out = set()
    for item in state["entities"].get(collection, []):
        record = item.get("record") or {}
        candidate = item.get("entity_id") or record.get("actor_id") or record.get("loss_id") or record.get("case_id")
        if candidate:
            out.add(candidate)
    return out


def main() -> int:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        copy_repo(root)

        v1_state, _ = canonical_v1.build_state(root)
        write_generated(root / "data/canonical-current-state.json", canonical_v1.canonical_json_bytes(v1_state))

        baseline_manifest = load(root / registrar.MANIFEST_PATH)
        baseline_gate2 = baseline_manifest["gate2_evidence_cutoff"]
        if baseline_gate2 != GATE2_FROZEN:
            raise AssertionError("forward canary started from an unexpected frozen Gate 2 boundary")
        baseline_entries = json.loads(json.dumps(baseline_manifest["accepted_updates"]))
        sep6_before = next(item for item in baseline_entries if item["packet_id"] == SEP6_PACKET_ID)
        accepted_packet_bytes = {item["path"]: (root / item["path"]).read_bytes() for item in baseline_entries}
        accepted_packet_hashes = {item["path"]: item["sha256"] for item in baseline_entries}

        baseline_canonical = canonical_v2.build_state(root)
        baseline_public_path = root / "data/public-current-state.json"
        write_generated(root / "data/canonical-current-state-v2.json", canonical_v2.canonical_bytes(baseline_canonical))
        baseline_public = public_v2.build_state(root)
        write_generated(baseline_public_path, public_v2.canonical_bytes(baseline_public))

        baseline_source_ids = {item["source_id"] for item in baseline_canonical["sources"]["records"]}
        baseline_event_ids = {item["event_id"] for item in baseline_canonical["chronology"]}
        baseline_loss_ids = canonical_id_set(baseline_canonical, "material_losses")
        baseline_actor_ids = canonical_id_set(baseline_canonical, "actors")

        tip_clock = registrar.parse_datetime(baseline_entries[-1]["known_at"], "baseline v2 tip")
        future_clock = tip_clock + timedelta(days=1, seconds=1)
        future_timestamp = future_clock.isoformat()
        future_day = future_timestamp[:10]
        packet_id = f"UPD-{future_clock:%Y%m%d}-FORWARD-CANARY"
        relative = f"data/canonical-updates/{packet_id}.json"
        packet = {
            "schema_version": "2.0",
            "status": "ACCEPTED",
            "packet_id": packet_id,
            "known_at": future_timestamp,
            "evidence_cutoff": future_timestamp,
            "summary": "Synthetic forward-update canary. Test-only authority exercise in a temporary repository.",
            "sources": [{
                "source_id": SYNTHETIC_SOURCE_ID,
                "outlet": "Atlas forward-update canary",
                "title": "Synthetic accepted future evidence",
                "url": "https://example.test/atlas/gate3-forward-canary",
                "source_role": "TEST_FIXTURE",
            }],
            "events": [{
                "event_id": SYNTHETIC_EVENT_ID,
                "event_date": future_day,
                "event_time_precision": "DATE_ONLY",
                "summary": "Synthetic future state event for append-only registration validation.",
                "event_type": "TEST_FORWARD_UPDATE",
                "event_class": "STATE_SNAPSHOT",
                "strike_countable": False,
                "public_available_time": future_timestamp,
                "game_knowledge_time": future_timestamp,
                "source_ids": [SYNTHETIC_SOURCE_ID],
            }],
            "entities": [
                {
                    "entity_type": "material_loss",
                    "entity_id": SYNTHETIC_LOSS_ID,
                    "record": {
                        "loss_id": SYNTHETIC_LOSS_ID,
                        "event_date": future_day,
                        "event_ref": SYNTHETIC_EVENT_ID,
                        "actor": "Synthetic forward canary actor",
                        "side": "TEST",
                        "status": "DAMAGED",
                        "quantity": 1,
                        "source_ids": [SYNTHETIC_SOURCE_ID],
                    },
                },
                {
                    "entity_type": "actor",
                    "entity_id": SYNTHETIC_ACTOR_ID,
                    "record": {
                        "actor_id": SYNTHETIC_ACTOR_ID,
                        "canonical_name": "Synthetic forward canary actor",
                        "actor_type": "TEST_FIXTURE",
                        "source_ids": [SYNTHETIC_SOURCE_ID],
                    },
                },
            ],
            "narrative_claims": [],
        }
        (root / relative).write_bytes(registrar.canonical_json_bytes(packet))

        registered = registrar.register_v2_packet(root, relative)
        advanced_manifest = load(root / registrar.MANIFEST_PATH)
        if advanced_manifest["accepted_updates"][:-1] != baseline_entries:
            raise AssertionError("forward registration rewrote the prior accepted prefix")
        if len(advanced_manifest["accepted_updates"]) != len(baseline_entries) + 1:
            raise AssertionError("forward registration did not advance accepted packet population by exactly one")
        if advanced_manifest["current_evidence_cutoff"] != future_timestamp:
            raise AssertionError("current cutoff did not derive from the newly accepted packet")
        if registered != advanced_manifest["accepted_updates"][-1]:
            raise AssertionError("registrar result and accepted manifest tip diverge")
        if advanced_manifest["gate2_evidence_cutoff"] != baseline_gate2:
            raise AssertionError("forward registration changed frozen Gate 2")
        if next(item for item in advanced_manifest["accepted_updates"] if item["packet_id"] == SEP6_PACKET_ID) != sep6_before:
            raise AssertionError("Sep. 6 historical accepted entry changed")

        for path, content in accepted_packet_bytes.items():
            if (root / path).read_bytes() != content:
                raise AssertionError(f"previously accepted packet bytes changed: {path}")
            if next(item for item in advanced_manifest["accepted_updates"] if item["path"] == path)["sha256"] != accepted_packet_hashes[path]:
                raise AssertionError(f"previously accepted packet hash changed: {path}")

        advanced_canonical = canonical_v2.build_state(root)
        if advanced_canonical["release"]["gate2_evidence_cutoff"] != GATE2_FROZEN:
            raise AssertionError("canonical forward build changed frozen Gate 2")
        if advanced_canonical["release"]["current_osint_cutoff"] != future_timestamp:
            raise AssertionError("canonical forward build did not inherit the accepted cutoff")
        if len(advanced_canonical["accepted_updates_v2"]) != len(baseline_canonical["accepted_updates_v2"]) + 1:
            raise AssertionError("canonical accepted packet count did not advance")
        if len(advanced_canonical["sources"]["records"]) != len(baseline_canonical["sources"]["records"]) + 1:
            raise AssertionError("canonical source population did not advance")
        if len(advanced_canonical["chronology"]) != len(baseline_canonical["chronology"]) + 1:
            raise AssertionError("canonical chronology population did not advance")
        if len(advanced_canonical["entities"]["material_losses"]) != len(baseline_canonical["entities"]["material_losses"]) + 1:
            raise AssertionError("canonical material-loss population did not advance")
        if len(advanced_canonical["entities"]["actors"]) != len(baseline_canonical["entities"]["actors"]) + 1:
            raise AssertionError("canonical actor population did not advance")
        if SYNTHETIC_SOURCE_ID not in {item["source_id"] for item in advanced_canonical["sources"]["records"]}:
            raise AssertionError("synthetic source did not survive the canonical build")
        if SYNTHETIC_EVENT_ID not in {item["event_id"] for item in advanced_canonical["chronology"]}:
            raise AssertionError("synthetic chronology event did not survive the canonical build")
        if SYNTHETIC_LOSS_ID not in canonical_id_set(advanced_canonical, "material_losses"):
            raise AssertionError("synthetic material loss did not survive the canonical build")
        if SYNTHETIC_ACTOR_ID not in canonical_id_set(advanced_canonical, "actors"):
            raise AssertionError("synthetic actor did not survive the canonical build")
        if not baseline_source_ids <= {item["source_id"] for item in advanced_canonical["sources"]["records"]}:
            raise AssertionError("existing source IDs changed during forward update")
        if not baseline_event_ids <= {item["event_id"] for item in advanced_canonical["chronology"]}:
            raise AssertionError("existing event IDs changed during forward update")
        if not baseline_loss_ids <= canonical_id_set(advanced_canonical, "material_losses"):
            raise AssertionError("existing material-loss IDs changed during forward update")
        if not baseline_actor_ids <= canonical_id_set(advanced_canonical, "actors"):
            raise AssertionError("existing actor IDs changed during forward update")

        canonical_bytes = canonical_v2.canonical_bytes(advanced_canonical)
        write_generated(root / "data/canonical-current-state-v2.json", canonical_bytes)
        advanced_public = public_v2.build_state(root)
        public_bytes = public_v2.canonical_bytes(advanced_public)
        write_generated(baseline_public_path, public_bytes)
        public_losses = advanced_public["datasets"]["current.material_losses"]["payload"]["records"]
        if advanced_public["release"]["current_osint_cutoff"] != future_timestamp:
            raise AssertionError("public model did not inherit the advanced current cutoff")
        if len(advanced_public["chronology"]) != len(advanced_canonical["chronology"]):
            raise AssertionError("public/canonical chronology counts do not reconcile")
        if len(advanced_public["sources"]["records"]) != len(advanced_canonical["sources"]["records"]):
            raise AssertionError("public/canonical source counts do not reconcile")
        if len(public_losses) != len(advanced_canonical["entities"]["material_losses"]):
            raise AssertionError("public/canonical material-loss counts do not reconcile")
        if advanced_public["counts"]["chronology_records"] != len(advanced_public["chronology"]):
            raise AssertionError("public chronology metadata does not derive from the collection")
        if advanced_public["counts"]["material_loss_records"] != len(public_losses):
            raise AssertionError("public material-loss metadata does not derive from the collection")

        release = release_builder.build_manifest(root)
        release_bytes = release_builder.stable_json_bytes(release)
        write_generated(root / "data/public-release.json", release_bytes)
        if release["current_state"]["current_osint_cutoff"] != future_timestamp:
            raise AssertionError("release model did not inherit the advanced current cutoff")
        if release["current_state"]["sha256"] != hashlib.sha256(public_bytes).hexdigest():
            raise AssertionError("release model does not bind the advanced public state bytes")

        for command in (
            [sys.executable, "scripts/gate3_v2_registration.py", "--root", str(root), "--verify"],
            [sys.executable, "scripts/validate_public_current_state_v2.py"],
            [sys.executable, "scripts/validate_lie_ledger_v2.py"],
        ):
            subprocess.run(command, cwd=root, check=True)

        second_canonical = canonical_v2.canonical_bytes(canonical_v2.build_state(root))
        if second_canonical != canonical_bytes:
            raise AssertionError("canonical forward regeneration is nondeterministic")
        write_generated(root / "data/canonical-current-state-v2.json", second_canonical)
        second_public = public_v2.canonical_bytes(public_v2.build_state(root))
        if second_public != public_bytes:
            raise AssertionError("public forward regeneration is nondeterministic")
        write_generated(baseline_public_path, second_public)
        second_release = release_builder.stable_json_bytes(release_builder.build_manifest(root))
        if second_release != release_bytes:
            raise AssertionError("release forward regeneration is nondeterministic")

        print(
            "gate3-v2-forward-update-canary: PASS - real registrar advanced "
            f"cutoff={future_timestamp}; packets/sources/chronology/losses advanced; "
            "Gate 2, Sep. 6 history, accepted packet bytes/hashes, stable IDs and deterministic outputs preserved"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
