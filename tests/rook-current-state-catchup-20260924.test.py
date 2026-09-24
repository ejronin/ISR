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


def packet_entities(packet):
    return {row["entity_id"]: row for row in packet["entities"]}


def main() -> int:
    state = builder.build_state(ROOT)
    manifest = json.loads((ROOT / "data/canonical-ledger/manifest-v2.json").read_text(encoding="utf-8"))
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20260924-ROOK-EVIDENCE-CATCHUP.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "data/evidence-integration/rook-catchup-consumption-audit-20260924.json").read_text(encoding="utf-8"))

    accepted = manifest["accepted_updates"]
    entry = next(item for item in accepted if item["packet_id"] == packet["packet_id"])
    index = accepted.index(entry)
    assert index > 0
    assert entry["previous_lineage_sha256"] == accepted[index - 1]["lineage_sha256"]
    assert entry["evidence_cutoff"] == packet["evidence_cutoff"]
    assert manifest["current_evidence_cutoff"] == accepted[-1]["evidence_cutoff"]
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]
    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20260924T0000ET.json",
        "data/evidence-integration/rook-evidence-locker-sweep-20260924T1200ET.json",
    ]

    events = {row["event_id"]: row for row in state["chronology"]}
    for event_id in (
        "G3-IRAN-UNGA-PEZESHKIAN-SPEECH-20260923",
        "G3-GULF-GAS-MARKET-DURATION-20260923",
        "G3-GAZA-ISRAELI-STRIKE-HAMAS-FINANCE-CLAIM-20260923",
        "G3-UAE-IRAN-AIRLINE-SUSPENSION-20260924",
        "G3-SA-HOUTHI-MISSILE-INTERCEPTS-20260924",
        "G3-YEMEN-TAIZ-ADEN-FIGHTING-20260924",
        "G3-YEMEN-OHCHR-CIVILIAN-IMPACT-20260924",
        "G3-UK-IRAN-BANK-LICENSING-20260923",
        "G3-US-IRAN-DIPLOMACY-MARKET-20260924",
    ):
        assert event_id in events
    assert sum(1 for row in state["chronology"] if row["event_id"] == "G3-HORMUZ-VESSEL-STRIKE-20260923") == 1

    pe = packet_entities(packet)
    cape = pe["SHIP-HORMUZ-UNKNOWN-VESSEL-20260923"]["record"]
    assert cape["vessel"] == "MV Cape Dao"
    assert cape["fatalities_confirmed"] == 1
    assert cape["evacuation"]["crew_evacuated"] == 27
    assert cape["attribution"] == "UNRESOLVED"
    assert cape["weapon_identification"] == "UNRESOLVED_UNKNOWN_PROJECTILE"

    traffic = pe["SHIP-HORMUZ-TRAFFIC-20260914"]["record"]
    assert traffic["latest_observable_metric"]["day"] == "2026-09-23"
    assert traffic["latest_observable_metric"]["commodity_vessel_transits"] == 10
    assert any(
        row["day"] == "2026-09-22" and row["commodity_vessel_transits"] == 3
        for row in traffic["daily_transit_history"]
    )

    aviation = pe["ECON-IRAN-AVIATION-SECONDARY-SANCTIONS-20260923"]["record"]
    assert "UAE_STATE_LEVEL_SUSPENSION_CONFIRMED" in aviation["adjudication"]
    assert "GLOBAL_GROUNDING_NOT_ESTABLISHED" in aviation["adjudication"]
    assert "RETALIATION_THREAT_NOT_EXECUTED" in aviation["adjudication"]

    yem = pe["CAS-YEMEN-DISPLACEMENT-20260913"]["record"]
    scoped = yem["scoped_civilian_impact_series"][0]
    assert scoped["reported_casualties_at_least"] == 110
    assert scoped["reported_deaths"] == 28
    current_yem = rows_by_id(state["entities"]["casualties"])["CAS-YEMEN-DISPLACEMENT-20260913"]["record"]
    assert current_yem["reported_deaths"] == 674
    assert current_yem["reported_injuries_approx"] == 3000

    contacts = pe["DIP-US-IRAN-UNGA-CONTACTS-20260922"]["record"]
    assert "PARTIES_REPORTED_FAR_APART_AS_OF_SEP24" in contacts["status"]
    assert "COMPETING_PUBLIC_CHARACTERIZATION_PRESERVED" in contacts["status"]
    assert "NO_AGREEMENT" in contacts["status"]

    movement = pe["MOV-HOUTHI-REDSEA-COAST-OFFENSIVE-20260910"]["record"]
    assert "G3-YEMEN-TAIZ-ADEN-FIGHTING-20260924" in movement["event_refs"]
    assert "No evidence" in movement["observed_state"]

    banks = pe["ECON-UK-IRAN-BANK-LICENSING-20260923"]["record"]
    assert len(banks["banks"]) == 5
    assert banks["general_licence"] == "INT/2025/7628424"
    assert "NOT_ASSET_CONFISCATION_OR_DISSOLUTION" in banks["adjudication"]

    gas = pe["ECON-GULF-GAS-MARKET-TIGHTNESS-20260923"]["record"]
    assert "PHYSICAL_OUTAGE_DURATION_REMAINS_ASSET_SPECIFIC" in gas["adjudication"]
    gaza = pe["CAS-GAZA-STRIKES-20260923"]["record"]
    assert gaza["target_identity_status"] == "ATTRIBUTED_TO_ISRAEL_NOT_INDEPENDENTLY_ESTABLISHED"

    routing = json.loads((ROOT / "data/evidence-integration/rook-catchup-claims-routing-20260924.json").read_text(encoding="utf-8"))
    assert {row["proposition_id"] for row in routing["referrals"]} == {
        "IRAN-PEZESHKIAN-CIVILIAN-HARM-UNGA-20260923"
    }
    assert routing["web_of_lies"] == "OUT_OF_SCOPE"
    assert packet["narrative_claims"] == []
    assert packet["upstream_provenance"]["web_of_lies"] == "OUT_OF_SCOPE_NO_HANDOFF_OR_SEMANTIC_MUTATION"
    assert audit["web_of_lies"] == "OUT_OF_SCOPE_NO_FILES_OR_SEMANTICS_TO_CHANGE"

    withheld = " ".join(audit["deliberately_withheld"])
    assert "Worldwide grounding" in withheld
    assert "IRGC advisers specifically" in withheld
    assert "deception" in withheld

    print("rook-current-state-catchup-20260924: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
