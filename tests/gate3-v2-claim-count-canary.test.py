#!/usr/bin/env python3
"""Forward-append regression for canonical claim_records derivation."""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_canonical_current_state_v2_final as canonical_v2  # noqa: E402
import gate3_v2_registration as registrar  # noqa: E402


def load_forward_canary():
    path = ROOT / "tests/gate3-v2-forward-update-canary.test.py"
    spec = importlib.util.spec_from_file_location("atlas_forward_canary", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load forward-update canary support")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    support = load_forward_canary()
    with tempfile.TemporaryDirectory(prefix="atlas-claim-count-canary-") as directory:
        root = Path(directory)
        support.copy_repo(root)

        v1_state, _ = support.canonical_v1.build_state(root)
        support.write_generated(
            root / "data/canonical-current-state.json",
            support.canonical_v1.canonical_json_bytes(v1_state),
        )

        baseline_manifest = support.load(root / registrar.MANIFEST_PATH)
        baseline_canonical = canonical_v2.build_state(root)
        baseline_claims = list(baseline_canonical["entities"].get("claims") or [])
        baseline_count = baseline_canonical["counts"]["claim_records"]
        if baseline_count != len(baseline_claims):
            raise AssertionError("baseline claim_records metadata is already stale")

        tip_clock = registrar.parse_datetime(
            baseline_manifest["accepted_updates"][-1]["known_at"],
            "baseline v2 tip",
        )
        future_clock = tip_clock + timedelta(days=1, seconds=2)
        timestamp = future_clock.isoformat()
        packet_id = f"UPD-{future_clock:%Y%m%d}-CLAIM-COUNT-CANARY"
        relative = f"data/canonical-updates/{packet_id}.json"
        source_id = "SRC-CA11A7E0C1A1"
        claim_id = "TEST-CANARY-CLAIM-COUNT-FORWARD"
        packet = {
            "schema_version": "2.0",
            "status": "ACCEPTED",
            "packet_id": packet_id,
            "known_at": timestamp,
            "evidence_cutoff": timestamp,
            "summary": "Synthetic accepted claim append for derived-count regression only.",
            "sources": [{
                "source_id": source_id,
                "outlet": "Atlas claim-count canary",
                "title": "Synthetic accepted claim-count evidence",
                "url": "https://example.test/atlas/claim-count-canary",
                "source_role": "TEST_FIXTURE",
            }],
            "events": [],
            "entities": [{
                "entity_type": "claim",
                "entity_id": claim_id,
                "record": {
                    "case_id": claim_id,
                    "claim": "Synthetic claim used only to verify mutable derived-count refresh.",
                    "status": "UNRESOLVED",
                    "source_ids": [source_id],
                },
            }],
            "narrative_claims": [],
        }
        (root / relative).write_bytes(registrar.canonical_json_bytes(packet))
        registrar.register_v2_packet(root, relative)

        advanced = canonical_v2.build_state(root)
        claims = advanced["entities"].get("claims") or []
        claim_ids = {item.get("entity_id") for item in claims}
        if claim_id not in claim_ids:
            raise AssertionError("accepted synthetic claim did not survive canonical build")
        if len(claims) != len(baseline_claims) + 1:
            raise AssertionError("accepted claim append did not advance canonical claim collection by one")
        if advanced["counts"]["claim_records"] != len(claims):
            raise AssertionError("claim_records metadata did not refresh from accepted canonical claims")
        if advanced["counts"]["claim_records"] != baseline_count + 1:
            raise AssertionError("claim_records metadata did not advance with the accepted claim append")

        second = canonical_v2.build_state(root)
        if canonical_v2.canonical_bytes(second) != canonical_v2.canonical_bytes(advanced):
            raise AssertionError("claim-count forward regeneration is nondeterministic")

    print("gate3-v2-claim-count-canary: PASS - accepted claim append advances canonical collection and derived claim_records metadata")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
