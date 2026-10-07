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
    accepted = {entry["packet_id"]: entry for entry in manifest["accepted_updates"]}
    entry = accepted["UPD-20261006-ROOK-CURRENT"]
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20261006-ROOK-CURRENT.json").read_text(encoding="utf-8"))
    assert entry["packet_id"] == packet["packet_id"]
    assert entry["sequence"] == 30
    assert entry["evidence_cutoff"] == packet["evidence_cutoff"]
    assert manifest["current_evidence_cutoff"] >= entry["evidence_cutoff"]
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]
    assert packet["status"] == "ACCEPTED"
    assert packet["narrative_claims"] == []
    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20261006T0000ET.json",
        "data/evidence-integration/rook-evidence-locker-sweep-20261006T1200ET.json",
    ]

    events = {row["event_id"]: row for row in state["chronology"]}
    for event_id in (
        "LOCKER-GULF-OIL-FLOWS-SEPTEMBER-RECOVERY-20261006",
        "LOCKER-SA-EASTWEST-PIPELINE-THROUGHPUT-20261006",
        "LOCKER-CHINA-IRAN-OIL-SUBSTITUTION-20261006",
        "LOCKER-RAF-FAIRFORD-LATER-EVIDENCE-20261006",
        "LOCKER-SAUDI-JAZAN-NAJRAN-AIRPORT-ATTACKS-20261005",
        "LOCKER-OIL-PRICE-EASING-20261006",
    ):
        assert event_id in events

    packet_entities = {entity["entity_id"]: entity["record"] for entity in packet["entities"]}

    hormuz = packet_entities["SHIP-HORMUZ-KPLER-RECOVERY-20260929"]
    assert "recovery is strong" in hormuz["status"].lower()
    assert "normal unrestricted passage is not established" in hormuz["observed_state"].lower()

    gulf = packet_entities["ECON-GULF-ENERGY-RECOVERY-20260930"]
    assert "largely recovered" in gulf["status"].lower()
    iran = packet_entities["ECON-IRAN-OIL-EXPORT-ISOLATION-20261006"]
    assert "zero" in iran["observed_state"].lower()
    assert "does_not_by_itself_establish_chinese_state_policy" in iran["adjudication"].lower()

    pipeline = packet_entities["MAT-SA-EASTWEST-PIPELINE-20260911"]
    assert "CARRYING_MATERIAL_BYPASS_VOLUME" in pipeline["status"]
    assert "FULL_7M_BPD_CAPACITY_NOT_ESTABLISHED" in pipeline["status"]

    pipeline_gap = packet_entities["GAP-E2-SAUDI-EASTWEST-EXACT-BDA"]
    assert "MATERIALLY_NARROWED" in pipeline_gap["status"]
    assert "FULL_RATED_CAPACITY" in pipeline_gap["status"]

    coast = packet_entities["MOV-HOUTHI-REDSEA-COAST-OFFENSIVE-20260910"]
    assert "MATERIALLY_REVERSED" in coast["status"]
    assert "EXTENT_CONTESTED" in coast["status"]
    assert "TAIZ_FRONT_REMAINS_ACTIVE" in coast["status"]

    yemen = packet_entities["CAS-YEMEN-DISPLACEMENT-20260913"]
    assert yemen["reported_displaced_approx"] == 184000
    assert yemen["period_end"] == "2026-10-05"

    # Later accepted packets may advance these mutable current entities; the Oct. 6
    # regression locks the accepted packet itself, not a forever-current value.
    assert "SHIP-HORMUZ-KPLER-RECOVERY-20260929" in rows_by_id(state["entities"]["shipping"])
    assert "MOV-HOUTHI-REDSEA-COAST-OFFENSIVE-20260910" in rows_by_id(state["entities"]["movements"])
    assert "CAS-YEMEN-DISPLACEMENT-20260913" in rows_by_id(state["entities"]["casualties"])

    print("atlas-current-state-catchup-20261006: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
