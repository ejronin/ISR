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
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20261007-ROOK-MORNING.json").read_text(encoding="utf-8"))
    locker = json.loads((ROOT / "data/evidence-integration/rook-evidence-locker-sweep-20261007T0915ET.json").read_text(encoding="utf-8"))
    latest = manifest["accepted_updates"][-1]

    assert latest["sequence"] == 32
    assert latest["packet_id"] == "UPD-20261007-ROOK-MORNING"
    assert latest["sha256"] == "a6aac7fef371fcf3d7e83024909b54dd025e0f896fea632ba1343d1e9f2fc654"
    assert latest["previous_lineage_sha256"] == "ad955ae44da69fb9281b2703d689f5dab29f6a9195a0bf1aa9c58cdf6eb55f52"
    assert latest["lineage_sha256"] == "b27465aba974042a3047ee3eb62d39e6a46c706d19ae0126065f357315ecf90f"
    assert latest["evidence_cutoff"] == packet["evidence_cutoff"]
    assert manifest["current_evidence_cutoff"] == latest["evidence_cutoff"]
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]
    assert packet["status"] == "ACCEPTED"
    assert packet["narrative_claims"] == []
    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20261007T0915ET.json"
    ]
    assert locker["scope"]["window_end"] == "2026-10-07T09:15:00-04:00"
    assert locker["completion"]["canonical_or_public_artifacts_mutated"] is False
    assert locker["completion"]["accepted_packet_bytes_or_hashes_mutated"] is False

    events = {row["event_id"]: row for row in state["chronology"]}
    for event_id in (
        "LOCKER-IRAQ-DINAR-DEVALUATION-20261007",
        "LOCKER-TURKEY-SAUDI-DEFENSIVE-SUPPORT-20261007",
        "LOCKER-YEMEN-DISPLACEMENT-OVER-200K-20261007",
        "LOCKER-IRAN-US-NUCLEAR-DEMANDS-AT-ODDS-20261007",
        "LOCKER-IRGC-ADVISER-HORMUZ-ROUTE-CLOSURE-THREAT-20261007",
    ):
        assert event_id in events

    diplomacy = rows_by_id(state["entities"]["diplomacy"])["DIP-US-IRAN-UNGA-CONTACTS-20260922"]["record"]
    assert "no agreement" in diplomacy["status"].lower()
    assert "iranian disagreement" in diplomacy["status"].lower()
    assert "at odds" in diplomacy["observed_state"].lower()

    shipping = rows_by_id(state["entities"]["shipping"])["SHIP-HORMUZ-KPLER-RECOVERY-20260929"]["record"]
    assert "threatening additional route restrictions" in shipping["status"].lower()
    assert "actor claims" in shipping["observed_state"].lower()
    assert "do not by themselves establish" in shipping["observed_state"].lower()

    movements = rows_by_id(state["entities"]["movements"])["MOV-HOUTHI-REDSEA-COAST-OFFENSIVE-20260910"]["record"]
    assert "MOCHA_ADVANCE_CLAIM_PREMATURE" in movements["status"]
    assert "Dhubab" in movements["observed_state"]
    assert "not established as having secured Mocha" in movements["observed_state"]

    casualties = rows_by_id(state["entities"]["casualties"])["CAS-YEMEN-DISPLACEMENT-20260913"]["record"]
    assert casualties["reported_displaced_approx"] == 200000
    assert casualties["reported_displaced_operator"] == "MORE_THAN"
    assert casualties["period_end"] == "2026-10-07"

    economics = rows_by_id(state["entities"]["economics"])
    gulf = economics["ECON-GULF-ENERGY-RECOVERY-20260930"]["record"]
    assert "$101.33" in gulf["observed_state"]
    assert "$89.83" in gulf["observed_state"]
    iraq = economics["ECON-IRAQ-DINAR-DEVALUATION-20261007"]["record"]
    assert "1,520" in iraq["observed_state"]
    assert "14.5%" in iraq["observed_state"]

    claim = next(item for item in locker["claims_and_corrections"] if item["claim_id"] == "CLAIM-IRGC-HORMUZ-FULL-CONTROL-20261007")
    assert claim["handling"] == "ATTRIBUTED_ACTOR_CLAIM_NOT_PROMOTED_TO_OBSERVED_PHYSICAL_CLOSURE"

    print("atlas-current-state-catchup-20261007-morning: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
