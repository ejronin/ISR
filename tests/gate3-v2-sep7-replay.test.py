#!/usr/bin/env python3
"""Replay the exact PR #62 Sep. 7 evidence payload through repaired production registration."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_canonical_current_state_v2 as consumer  # noqa: E402
import gate3_v2_registration as registrar  # noqa: E402

PR62_HEAD = "1b4e3fb51ccef9faa73c596e5253e6de64887a47"
PACKET_PATH = "data/canonical-updates/UPD-20260907-CATCHUP.json"
EXPECTED_KNOWN_AT = "2026-09-09T09:29:59-04:00"
EXPECTED_EVIDENCE_CUTOFF = "2026-09-07T23:59:59-04:00"
COPY_DIRS = ("data", "schemas", "scripts", "snapshots")


def main() -> int:
    # Fetch only the immutable proving commit/object. Nothing is written to PR #62.
    subprocess.run(["git", "fetch", "--no-tags", "origin", PR62_HEAD], cwd=ROOT, check=True)
    raw = subprocess.check_output(["git", "show", f"{PR62_HEAD}:{PACKET_PATH}"], cwd=ROOT)
    source_packet = json.loads(raw.decode("utf-8"))
    if source_packet["known_at"] != EXPECTED_KNOWN_AT or source_packet["evidence_cutoff"] != EXPECTED_EVIDENCE_CUTOFF:
        raise AssertionError("PR #62 Sep. 7 proving packet clocks differ from the locked case")

    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        for name in COPY_DIRS:
            shutil.copytree(ROOT / name, root / name)
        baseline_manifest = (root / registrar.MANIFEST_PATH).read_bytes()
        baseline = json.loads(baseline_manifest.decode("utf-8"))
        baseline_entries = json.loads(json.dumps(baseline["accepted_updates"]))

        # PR #62 predates the merged registrar and therefore has no persisted
        # status field. In the isolated proving workspace only, supply the
        # registrar's required acceptance envelope without changing evidence.
        candidate = json.loads(json.dumps(source_packet))
        candidate["status"] = "ACCEPTED"
        target = root / PACKET_PATH
        target.write_bytes(registrar.canonical_json_bytes(candidate))

        entry = registrar.register_v2_packet(root, PACKET_PATH)
        after = json.loads((root / registrar.MANIFEST_PATH).read_text(encoding="utf-8"))
        if after["accepted_updates"][:-1] != baseline_entries:
            raise AssertionError("Sep. 7 proving replay rewrote prior accepted history")
        if entry["known_at"] != EXPECTED_KNOWN_AT:
            raise AssertionError("Sep. 7 known_at changed during registration")
        if entry["evidence_cutoff"] != EXPECTED_EVIDENCE_CUTOFF:
            raise AssertionError("Sep. 7 evidence_cutoff changed during registration")
        if after["current_evidence_cutoff"] != EXPECTED_EVIDENCE_CUTOFF:
            raise AssertionError("Sep. 7 replay derived the wrong evidence horizon")

        state = consumer.build_state(root)
        if state["release"]["current_osint_cutoff"] != EXPECTED_EVIDENCE_CUTOFF:
            raise AssertionError("Sep. 7 production consumer derived the wrong evidence horizon")
        if not any(row["packet_id"] == "UPD-20260907-CATCHUP" for row in state["accepted_updates_v2"]):
            raise AssertionError("Sep. 7 packet did not survive the real production consumer")

        print(
            "gate3-v2-sep7-replay: PASS - "
            f"known_at={EXPECTED_KNOWN_AT}; evidence_cutoff={EXPECTED_EVIDENCE_CUTOFF}; "
            f"derived_current_evidence_horizon={after['current_evidence_cutoff']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
