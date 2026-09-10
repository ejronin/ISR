#!/usr/bin/env python3
"""Delayed-knowledge production canary for the Gate 3 v2 update path."""
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
SOURCE_ID = "SRC-DA1A9EDC0A11"
EVENT_ID = "TEST-CANARY-DELAYED-KNOWLEDGE-EVENT"


def copy_repo(target: Path) -> None:
    for name in COPY_DIRS:
        shutil.copytree(ROOT / name, target / name)
    for name in COPY_FILES:
        shutil.copy2(ROOT / name, target / name)


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, raw: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)


def main() -> int:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        copy_repo(root)
        manifest_path = root / registrar.MANIFEST_PATH
        baseline_manifest = load(manifest_path)
        baseline_entries = json.loads(json.dumps(baseline_manifest["accepted_updates"]))
        baseline_manifest_bytes = manifest_path.read_bytes()
        accepted_bytes = {row["path"]: (root / row["path"]).read_bytes() for row in baseline_entries}

        v1_state, _ = canonical_v1.build_state(root)
        write(root / "data/canonical-current-state.json", canonical_v1.canonical_json_bytes(v1_state))
        baseline_canonical = canonical_v2.build_state(root)

        tip_known = registrar.parse_datetime(baseline_entries[-1]["known_at"], "tip known")
        tip_cutoff = registrar.parse_datetime(baseline_manifest["current_evidence_cutoff"], "tip cutoff")
        evidence_cutoff = tip_cutoff + timedelta(days=1)
        known_at = evidence_cutoff + timedelta(days=1, hours=9)
        if known_at - evidence_cutoff < timedelta(days=1):
            raise AssertionError("delayed canary gap is less than one calendar day")
        cutoff_text = evidence_cutoff.isoformat()
        known_text = known_at.isoformat()
        event_day = evidence_cutoff.date().isoformat()
        packet_id = f"UPD-{known_at:%Y%m%d}-DELAYED-CANARY"
        relative = f"data/canonical-updates/{packet_id}.json"
        packet = {
            "schema_version": "2.0",
            "status": "ACCEPTED",
            "packet_id": packet_id,
            "known_at": known_text,
            "evidence_cutoff": cutoff_text,
            "summary": "Synthetic delayed-knowledge canary in a temporary repository.",
            "sources": [{
                "source_id": SOURCE_ID,
                "outlet": "Atlas delayed-knowledge canary",
                "title": "Synthetic delayed evidence",
                "url": "https://example.test/atlas/delayed-knowledge-canary",
                "published_date": event_day,
                "source_role": "TEST_FIXTURE",
            }],
            "events": [{
                "event_id": EVENT_ID,
                "event_date": event_day,
                "event_time_precision": "DATE_ONLY",
                "summary": "Synthetic evidence becomes canonical more than one day after its evidence horizon.",
                "event_type": "TEST_DELAYED_KNOWLEDGE",
                "event_class": "STATE_SNAPSHOT",
                "strike_countable": False,
                "public_available_time": f"{event_day}T00:00:00-04:00",
                "game_knowledge_time": known_text,
                "source_ids": [SOURCE_ID],
            }],
            "entities": [],
            "narrative_claims": [],
        }
        (root / relative).write_bytes(registrar.canonical_json_bytes(packet))

        registered = registrar.register_v2_packet(root, relative)
        advanced_manifest = load(manifest_path)
        if advanced_manifest["accepted_updates"][:-1] != baseline_entries:
            raise AssertionError("delayed registration rewrote accepted history")
        if advanced_manifest["current_evidence_cutoff"] != cutoff_text:
            raise AssertionError("delayed registration derived the wrong evidence horizon")
        if registered["known_at"] != known_text or registered["evidence_cutoff"] != cutoff_text:
            raise AssertionError("registrar changed delayed packet clocks")
        if manifest_path.read_bytes() == baseline_manifest_bytes:
            raise AssertionError("successful delayed registration did not advance authority")
        for path, raw in accepted_bytes.items():
            if (root / path).read_bytes() != raw:
                raise AssertionError(f"accepted packet bytes changed: {path}")

        advanced_canonical = canonical_v2.build_state(root)
        canonical_bytes = canonical_v2.canonical_bytes(advanced_canonical)
        write(root / "data/canonical-current-state-v2.json", canonical_bytes)
        if advanced_canonical["release"]["current_osint_cutoff"] != cutoff_text:
            raise AssertionError("canonical v2 did not inherit delayed evidence horizon")
        if advanced_canonical["accepted_updates_v2"][-1]["known_at"] != known_text:
            raise AssertionError("canonical v2 lost delayed knowledge time")
        if EVENT_ID not in {row["event_id"] for row in advanced_canonical["chronology"]}:
            raise AssertionError("delayed event did not survive canonical v2")
        if len(advanced_canonical["accepted_updates_v2"]) != len(baseline_canonical["accepted_updates_v2"]) + 1:
            raise AssertionError("canonical accepted packet population did not advance")

        public_state = public_v2.build_state(root)
        public_bytes = public_v2.canonical_bytes(public_state)
        write(root / "data/public-current-state-v2.json", public_bytes)
        write(root / "data/public-current-state.json", public_bytes)
        if public_state["release"]["current_osint_cutoff"] != cutoff_text:
            raise AssertionError("public v2 did not inherit delayed evidence horizon")

        release = release_builder.build_manifest(root)
        release_bytes = release_builder.stable_json_bytes(release)
        write(root / "data/public-release.json", release_bytes)
        if release["current_state"]["current_osint_cutoff"] != cutoff_text:
            raise AssertionError("release did not inherit delayed evidence horizon")
        if release["current_state"]["sha256"] != hashlib.sha256(public_bytes).hexdigest():
            raise AssertionError("release does not bind delayed public state")

        for command in (
            [sys.executable, "scripts/gate3_v2_registration.py", "--root", str(root), "--verify"],
            [sys.executable, "scripts/validate_public_current_state_v2.py"],
            [sys.executable, "scripts/validate_lie_ledger_v2.py"],
        ):
            subprocess.run(command, cwd=root, check=True)

        second_canonical = canonical_v2.canonical_bytes(canonical_v2.build_state(root))
        if second_canonical != canonical_bytes:
            raise AssertionError("delayed canonical regeneration is nondeterministic")
        write(root / "data/canonical-current-state-v2.json", second_canonical)
        second_public = public_v2.canonical_bytes(public_v2.build_state(root))
        if second_public != public_bytes:
            raise AssertionError("delayed public regeneration is nondeterministic")
        write(root / "data/public-current-state-v2.json", second_public)
        write(root / "data/public-current-state.json", second_public)
        if release_builder.stable_json_bytes(release_builder.build_manifest(root)) != release_bytes:
            raise AssertionError("delayed release regeneration is nondeterministic")

        print(
            "gate3-v2-delayed-knowledge-canary: PASS - "
            f"evidence_cutoff={cutoff_text}; known_at={known_text}; "
            "real registrar -> canonical v2 -> public v2 -> Lie Ledger -> release -> deterministic regeneration"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
