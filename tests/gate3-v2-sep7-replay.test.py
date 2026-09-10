#!/usr/bin/env python3
"""Prove the exact PR #62 Sep. 7 payload before and after production registration."""
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
PACKET_ID = "UPD-20260907-CATCHUP"
PACKET_PATH = "data/canonical-updates/UPD-20260907-CATCHUP.json"
EXPECTED_KNOWN_AT = "2026-09-09T09:29:59-04:00"
EXPECTED_EVIDENCE_CUTOFF = "2026-09-07T23:59:59-04:00"
COPY_DIRS = ("data", "schemas", "scripts", "snapshots")


def main() -> int:
    # Fetch only the immutable proving commit/object. Nothing is written to the
    # historical PR payload. The current repository may be either before or
    # after the Sep. 7 packet's production registration.
    subprocess.run(["git", "fetch", "--no-tags", "origin", PR62_HEAD], cwd=ROOT, check=True)
    raw = subprocess.check_output(["git", "show", f"{PR62_HEAD}:{PACKET_PATH}"], cwd=ROOT)
    source_packet = json.loads(raw.decode("utf-8"))
    if source_packet["known_at"] != EXPECTED_KNOWN_AT or source_packet["evidence_cutoff"] != EXPECTED_EVIDENCE_CUTOFF:
        raise AssertionError("PR #62 Sep. 7 proving packet clocks differ from the locked case")

    # The original draft predates the registrar. The only permitted envelope
    # change is the registrar-required acceptance status; evidence content must
    # remain semantically identical.
    candidate = json.loads(json.dumps(source_packet))
    candidate["status"] = "ACCEPTED"

    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        for name in COPY_DIRS:
            shutil.copytree(ROOT / name, root / name)

        manifest_path = root / registrar.MANIFEST_PATH
        baseline_manifest = manifest_path.read_bytes()
        baseline = json.loads(baseline_manifest.decode("utf-8"))
        matching = [row for row in baseline["accepted_updates"] if row.get("packet_id") == PACKET_ID]

        if matching:
            # Post-registration mode: prove that the accepted packet is exactly
            # the locked payload plus status, that lineage verification passes,
            # and that duplicate registration remains transactional/rejected.
            if len(matching) != 1:
                raise AssertionError("Sep. 7 packet appears more than once in accepted lineage")
            entry = matching[0]
            if entry.get("path") != PACKET_PATH:
                raise AssertionError("Sep. 7 accepted path differs from the locked proving path")
            if entry.get("acceptance_basis") != registrar.REGISTERED_ACCEPTANCE_BASIS:
                raise AssertionError("Sep. 7 packet is not registered through production acceptance authority")
            if entry.get("known_at") != EXPECTED_KNOWN_AT:
                raise AssertionError("Sep. 7 accepted known_at differs from the locked case")
            if entry.get("evidence_cutoff") != EXPECTED_EVIDENCE_CUTOFF:
                raise AssertionError("Sep. 7 accepted evidence_cutoff differs from the locked case")

            actual_packet = json.loads((root / PACKET_PATH).read_text(encoding="utf-8"))
            if actual_packet != candidate:
                raise AssertionError("Registered Sep. 7 packet differs semantically from locked PR #62 payload plus acceptance status")

            registrar.verify_manifest(root)
            try:
                registrar.register_v2_packet(root, PACKET_PATH)
            except ValueError as exc:
                if "already registered" not in str(exc):
                    raise
            else:
                raise AssertionError("Duplicate Sep. 7 registration unexpectedly succeeded")
            if manifest_path.read_bytes() != baseline_manifest:
                raise AssertionError("Rejected duplicate Sep. 7 registration mutated the manifest")

            state = consumer.build_state(root)
            accepted = [row for row in state["accepted_updates_v2"] if row.get("packet_id") == PACKET_ID]
            if len(accepted) != 1:
                raise AssertionError("Sep. 7 accepted packet did not survive the production consumer exactly once")
            current = registrar.parse_datetime(state["release"]["current_osint_cutoff"], "current evidence horizon")
            sep7 = registrar.parse_datetime(EXPECTED_EVIDENCE_CUTOFF, "Sep. 7 evidence horizon")
            if current < sep7:
                raise AssertionError("Current evidence horizon regressed behind accepted Sep. 7 evidence")

            print(
                "gate3-v2-sep7-replay: PASS - post-registration proof; "
                f"known_at={EXPECTED_KNOWN_AT}; evidence_cutoff={EXPECTED_EVIDENCE_CUTOFF}; "
                f"current_evidence_horizon={state['release']['current_osint_cutoff']}"
            )
            return 0

        # Pre-registration proving mode retained for branches where Sep. 7 has
        # not yet entered authority. Register in the isolated workspace only.
        baseline_entries = json.loads(json.dumps(baseline["accepted_updates"]))
        target = root / PACKET_PATH
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(registrar.canonical_json_bytes(candidate))

        entry = registrar.register_v2_packet(root, PACKET_PATH)
        after = json.loads(manifest_path.read_text(encoding="utf-8"))
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
        if not any(row["packet_id"] == PACKET_ID for row in state["accepted_updates_v2"]):
            raise AssertionError("Sep. 7 packet did not survive the real production consumer")

        print(
            "gate3-v2-sep7-replay: PASS - pre-registration replay; "
            f"known_at={EXPECTED_KNOWN_AT}; evidence_cutoff={EXPECTED_EVIDENCE_CUTOFF}; "
            f"derived_current_evidence_horizon={after['current_evidence_cutoff']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
