#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_canonical_current_state_v2_final as builder


def rows_by_id(rows):
    return {row.get("entity_id"): row for row in rows if row.get("entity_id")}


def main() -> int:
    state = builder.build_state(ROOT)
    manifest = json.loads((ROOT / "data/canonical-ledger/manifest-v2.json").read_text(encoding="utf-8"))
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20261007-ROOK-LATE-MORNING.json").read_text(encoding="utf-8"))
    entry = next(item for item in manifest["accepted_updates"] if item["packet_id"] == packet["packet_id"])

    assert entry["sequence"] == 33
    assert entry["packet_id"] == "UPD-20261007-ROOK-LATE-MORNING"
    assert entry["sha256"] == "419ccd74651f0344cc5b8a8a1a9cae0fe6851a3c0ad4ac0db8c8b943a011209c"
    assert entry["lineage_sha256"] == "77eaddd39d446c62a5ec08b9be8ba05d25c0236ec6ac6772bcb37d06d8d6d3ae"
    assert entry["evidence_cutoff"] == "2026-10-07T11:22:00-04:00"
    assert manifest["current_evidence_cutoff"] == "2026-10-07T11:22:00-04:00"
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]

    assert packet["status"] == "ACCEPTED"
    assert packet["narrative_claims"] == []
    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20261007T1122ET.json"
    ]

    events = {row["event_id"]: row for row in state["chronology"]}
    assert "LOCKER-HORMUZ-WEEKLY-TANKER-ATTACK-HIGH-20261007" in events
    assert "LOCKER-IRAN-HEZBOLLAH-200M-AID-20261007" in events

    shipping = rows_by_id(state["entities"]["shipping"])
    hormuz = shipping["SHIP-HORMUZ-KPLER-RECOVERY-20260929"]["record"]
    assert "highest weekly count" in hormuz["status"].lower()
    assert "at least 12 attacks" in hormuz["observed_state"].lower()
    assert "normal unrestricted passage remains unestablished" in hormuz["observed_state"].lower()

    economics = rows_by_id(state["entities"]["economics"])
    hezbollah = economics["ECON-IRAN-HEZBOLLAH-AID-TRANSFER-20261007"]["record"]
    assert "$200 million" in hezbollah["observed_state"]
    assert "20% fee" in hezbollah["observed_state"]
    assert "iran did not acknowledge" in hezbollah["observed_state"].lower()
    assert "DOES_NOT_ESTABLISH_TOTAL_CURRENT_IRAN_TO_HEZBOLLAH_FUNDING" in hezbollah["adjudication"]

    print("atlas-current-state-catchup-20261007-late-morning: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
