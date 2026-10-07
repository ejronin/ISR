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
    latest = manifest["accepted_updates"][-1]
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20261007-ROOK-MIDNIGHT.json").read_text(encoding="utf-8"))

    assert latest["sequence"] == 31
    assert latest["packet_id"] == "UPD-20261007-ROOK-MIDNIGHT"
    assert latest["packet_id"] == packet["packet_id"]
    assert latest["evidence_cutoff"] == "2026-10-07T00:00:00-04:00"
    assert manifest["current_evidence_cutoff"] == latest["evidence_cutoff"]
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]
    assert packet["status"] == "ACCEPTED"
    assert packet["narrative_claims"] == []
    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20261007T0000ET.json"
    ]

    events = {row["event_id"]: row for row in state["chronology"]}
    for event_id in (
        "LOCKER-YEMEN-GIANTS-ABUSE-VIDEO-20261006",
        "LOCKER-US-IRAN-VANCE-NUCLEAR-CONDITION-20261006",
        "LOCKER-HOUTHI-ADEN-AIRPORT-ATTACK-20261007",
    ):
        assert event_id in events

    diplomacy = rows_by_id(state["entities"]["diplomacy"])
    talks = diplomacy["DIP-US-IRAN-UNGA-CONTACTS-20260922"]["record"]
    assert "enrichment-reduction" in talks["status"].lower()
    assert "no agreement" in talks["status"].lower()
    assert "pezeshkian" in talks["observed_state"].lower()
    assert "araqchi" in talks["observed_state"].lower()
    assert "decision" in talks["observed_state"].lower()

    movements = rows_by_id(state["entities"]["movements"])
    coast = movements["MOV-HOUTHI-REDSEA-COAST-OFFENSIVE-20260910"]["record"]
    assert "LONG_RANGE_STRIKE_CAPABILITY_REMAINS_ACTIVE" in coast["status"]
    assert "Aden International Airport" in coast["observed_state"]
    assert "Riyadh" in coast["observed_state"]

    economics = rows_by_id(state["entities"]["economics"])
    gulf = economics["ECON-GULF-ENERGY-RECOVERY-20260930"]["record"]
    assert "$100.58" in gulf["observed_state"]
    assert "$89.44" in gulf["observed_state"]
    assert "war-risk premium" in gulf["observed_state"].lower()

    print("atlas-current-state-catchup-20261007: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
