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
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20260926-ROOK-EVIDENCE-CATCHUP.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "data/evidence-integration/rook-catchup-consumption-audit-20260926.json").read_text(encoding="utf-8"))
    routing = json.loads((ROOT / "data/evidence-integration/rook-catchup-claims-routing-20260926.json").read_text(encoding="utf-8"))

    accepted = manifest["accepted_updates"]
    entry = next(item for item in accepted if item["packet_id"] == packet["packet_id"])
    index = accepted.index(entry)
    assert entry["sequence"] == 22
    assert entry["evidence_cutoff"] == packet["evidence_cutoff"]
    assert entry["previous_lineage_sha256"] == accepted[index - 1]["lineage_sha256"]
    assert manifest["current_evidence_cutoff"] == accepted[-1]["evidence_cutoff"]
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]

    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20260921T0000ET-gap-recovery-v2.json",
        "data/evidence-integration/rook-evidence-locker-sweep-20260921T1200ET-gap-recovery-v2.json",
        "data/evidence-integration/rook-evidence-locker-sweep-20260925T0000ET-recovered-v2.json",
        "data/evidence-integration/rook-evidence-locker-sweep-20260925T1200ET-recovered-v2.json",
        "data/evidence-integration/rook-evidence-locker-sweep-20260926T0000ET-recovered-v2.json",
        "data/evidence-integration/rook-evidence-locker-sweep-20260926T1200ET-recovered-v2.json",
    ]

    events = {row["event_id"]: row for row in state["chronology"]}
    for event_id in (
        "G3-HOUTHI-US-OMAN-INDIRECT-CONTACT-20260920",
        "G3-US-IRAN-PHASED-HORMUZ-BLOCKADE-20260924",
        "G3-HOUTHI-RIYADH-YANBU-TARGET-CLAIMS-20260924",
        "G3-GULF-OMAN-STS-CAPACITY-20260925",
        "G3-YEMEN-UNICEF-HUMAN-IMPACT-20260925",
        "G3-TURKEY-MAKKAH-IRAN-EXPANSION-SIGNAL-20260925",
        "G3-TRUMP-XI-IRAN-SUPPORT-WARNING-20260925",
        "G3-IRAN-SEVEN-DAY-HORMUZ-PROPOSAL-20260925",
        "G3-IRAN-NUCLEAR-NO-CONCESSIONS-20260925",
        "G3-PEZESHKIAN-CBS-NUCLEAR-DECISION-POSITION-20260925",
        "G3-US-CHINA-NO-NUKE-NO-TOLLS-20260925",
        "G3-YEMEN-GENERAL-MOBILIZATION-20260925",
        "G3-MAKKAH-PACT-CHIEFS-MEETING-20260925",
        "G3-US-IRAN-REJECTION-REPORTED-20260925",
        "G3-TRUMP-REJECTS-IRAN-PROPOSAL-20260926",
        "G3-CHINA-UN-GULF-SOVEREIGNTY-20260926",
        "G3-ISRAEL-SEJOUD-STRIKE-20260926",
        "G3-IRAN-AVIATION-NONMILITARY-CLARIFICATION-20260926",
        "G3-IRAQ-AVIATION-WAIVER-REQUEST-20260926",
        "G3-SA-HOUTHI-RIYADH-KHAMIS-SALVO-20260926",
    ):
        assert event_id in events

    # Late recovery must not duplicate facts already accepted in sequence 20.
    for event_id in (
        "G3-IRGC-ESCALATION-WARNING-20260921",
        "G3-HORMUZ-LR-STEPHANIE-INCIDENT-20260921",
        "G3-UK-SAUDI-VOYAGER-SUPPORT-20260921",
    ):
        assert sum(1 for row in state["chronology"] if row["event_id"] == event_id) == 1
    assert sum(1 for row in state["chronology"] if row["event_id"] == "G3-HOUTHI-US-OMAN-INDIRECT-CONTACT-20260920") == 1

    shipping = rows_by_id(state["entities"]["shipping"])["SHIP-HORMUZ-TRAFFIC-20260914"]["record"]
    assert shipping["latest_observable_metric"]["day"] == "2026-09-24"
    assert shipping["latest_observable_metric"]["commodity_vessel_transits"] == 9
    assert shipping["latest_observable_metric"]["inbound"] == 1
    assert shipping["latest_observable_metric"]["outbound"] == 8
    assert shipping["retrospective_weekend_metric"]["trackable_commodity_vessel_transits"] == 17
    assert shipping["weekly_crude_flow"]["crude_barrels_exited_so_far"] == 33700000
    assert shipping["saudi_export_adaptation"]["september_hormuz_crude_bpd_on_track"] == 3600000
    assert "NOT_NORMALIZED" in shipping["adjudication"]

    casualties = rows_by_id(state["entities"]["casualties"])["CAS-YEMEN-DISPLACEMENT-20260913"]["record"]
    sep25 = casualties["sep25_unicef_iom_update"]
    assert sep25["displaced_approx"] == 130000
    assert sep25["children_displaced_approx"] == 71000
    assert sep25["children_killed_verified"] == 15
    assert sep25["children_injured_verified"] == 14
    assert sep25["schools_closed_or_suspended"] == 243
    # Earlier canonical WHO/IOM cumulative series survives the later record update.
    assert casualties["reported_deaths"] == 674
    assert casualties["reported_injuries_approx"] == 3000

    economics = rows_by_id(state["entities"]["economics"])
    aviation = economics["ECON-IRAN-AVIATION-SECONDARY-SANCTIONS-20260923"]["record"]
    assert "IRAQ_ALL_FOUR_ACTIVE_IRAN_SERVICE_AIRPORTS_SUSPENDED" in aviation["adjudication"]
    assert "IRAQI_WAIVER_REQUEST_PENDING" in aviation["adjudication"]
    assert "IRAN_MILITARY_RETALIATION_DISAVOWED_BY_REZAEI" in aviation["adjudication"]
    assert "GLOBAL_GROUNDING_NOT_ESTABLISHED" in aviation["adjudication"]
    assert economics["ECON-GULF-OMAN-STS-CAPACITY-20260925"]["record"]["adjudication"].startswith("LOGISTICS_CAPACITY_CONSTRAINT")

    diplomacy = rows_by_id(state["entities"]["diplomacy"])
    contacts = diplomacy["DIP-US-IRAN-UNGA-CONTACTS-20260922"]["record"]
    assert contacts["status"] == "Mediated talks continue; no agreement"
    assert "Qatar relayed U.S. feedback" in contacts["observed_state"]
    assert "no replacement agreement" in contacts["observed_state"]

    makkah = diplomacy["DIP-MAKKAH-PACT-IMPLEMENTATION-20260925"]["record"]
    assert "CHIEFS_MEETING_CONFIRMED" in makkah["status"]
    assert "SPECIFIC_DEPLOYMENT_OR_COMBAT_COMMITMENT_NOT_ESTABLISHED" in makkah["status"]

    nuclear = diplomacy["DIP-IRAN-NUCLEAR-POSITIONS-20260925"]["record"]
    assert "PEZESHKIAN_PUBLICLY_ACCEPTS_INSPECTOR_RETURN" in nuclear["status"]
    assert "ANONYMOUS_SENIOR_OFFICIAL_REPORTS_NO_FLEXIBILITY" in nuclear["status"]
    assert "speaker difference" in nuclear["observed_state"]

    china = diplomacy["DIP-US-CHINA-IRAN-HORMUZ-20260925"]["record"]
    assert "US_ACCOUNT_OF_TRUMP_XI_NO_IRAN_NUKE_NO_WATERWAY_TOLLS" in china["status"]
    assert "CHINA_SEPARATELY_STRESSES_GULF_SOVEREIGNTY_AT_UN" in china["status"]
    assert "preserved by speaker and source" in china["observed_state"]

    sejoud = events["G3-ISRAEL-SEJOUD-STRIKE-20260926"]["event"]["summary"]
    assert "remain Israeli military attribution" in sejoud

    assert packet["narrative_claims"] == []
    assert audit["web_of_lies"] == "OUT_OF_SCOPE_NO_FILES_OR_SEMANTICS_TO_CHANGE"
    assert packet["upstream_provenance"]["web_of_lies"] == "OUT_OF_SCOPE_NO_HANDOFF_OR_SEMANTIC_MUTATION"

    assert {row["proposition_id"] for row in routing["referrals"]} == {
        "US-TRUMP-HORMUZ-29-SHIPS-TOTAL-CONTROL-20260926"
    }
    retained = routing["prior_referrals_retained_by_reference"]
    assert "data/evidence-integration/rook-catchup-claims-routing-20260923.json" in retained
    assert "data/evidence-integration/rook-catchup-claims-routing-20260924.json" in retained
    assert routing["web_of_lies"] == "OUT_OF_SCOPE"

    print("rook-current-state-catchup-20260926: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
