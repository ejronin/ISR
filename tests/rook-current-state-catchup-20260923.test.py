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
    tip = manifest["accepted_updates"][-1]
    assert tip["packet_id"] == "UPD-20260923-ROOK-EVIDENCE-CATCHUP"
    assert tip["sequence"] == max(item["sequence"] for item in manifest["accepted_updates"])
    assert manifest["current_evidence_cutoff"] == tip["evidence_cutoff"]
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]

    events = {row["event_id"]: row for row in state["chronology"]}
    for event_id in (
        "G3-HORMUZ-LR-STEPHANIE-INCIDENT-20260921",
        "G3-HORMUZ-AL-MARYAH-INCIDENT-20260921",
        "G3-UK-SAUDI-VOYAGER-SUPPORT-20260921",
        "G3-US-SAUDI-YEMEN-HOUTHI-SUPPORT-POSTURE-20260921",
        "G3-IRAN-HORMUZ-REOPENING-OFFER-20260922",
        "G3-SA-EASTWEST-PARTIAL-RESTART-20260922",
        "G3-US-IRAN-UNGA-MEDIATED-CONTACT-20260922",
        "G3-US-IRAN-COERCIVE-SIGNALING-20260922",
        "G3-QATAR-GULF-SECURITY-FRAMEWORK-PROPOSAL-20260922",
        "G3-TUR-EGY-PAK-KSA-JOINT-STATEMENT-20260922",
        "G3-MOKHA-STRIKE-CASUALTY-CLAIM-20260922",
        "G3-IRAN-AVIATION-SANCTIONS-IMPLEMENTATION-20260922",
        "G3-HORMUZ-VESSEL-STRIKE-20260923",
        "G3-IRGC-HOUTHI-FIELD-SUPPORT-REPORTING-20260923",
    ):
        assert event_id in events
    assert sum(1 for row in state["chronology"] if row["event_id"] == "G3-HOUTHI-MOCHA-HANISH-ADVANCE-20260910") == 1
    assert sum(1 for row in state["chronology"] if row["event_id"] == "G3-HOUTHI-DHUBAB-PERIM-ADVANCE-20260911") == 1

    shipping = rows_by_id(state["entities"]["shipping"])
    hormuz = shipping["SHIP-HORMUZ-TRAFFIC-20260914"]["record"]
    assert hormuz["latest_observable_metric"]["day"] == "2026-09-22"
    assert hormuz["latest_observable_metric"]["commodity_vessel_transits"] == 3
    assert hormuz["latest_observable_metric"]["inbound"] == 0
    assert hormuz["latest_observable_metric"]["outbound"] == 3
    hist = hormuz["denominator_revision_history"]
    assert [(row["reported_on"], row["commodity_vessel_transits"]) for row in hist] == [
        ("2026-09-22", 2), ("2026-09-23", 4)
    ]
    babel = shipping["SHIP-BAB-EL-MANDEB-TRAFFIC-20260914"]["record"]["latest_observable_metric"]
    assert (babel["crossings"], babel["toward_red_sea"], babel["toward_gulf_of_aden"]) == (22, 14, 8)
    for sid in ("SHIP-HORMUZ-LR-STEPHANIE-20260921","SHIP-HORMUZ-AL-MARYAH-20260921","SHIP-HORMUZ-UNKNOWN-VESSEL-20260923"):
        assert shipping[sid]["record"]["attribution"] == "UNRESOLVED"

    losses = rows_by_id(state["entities"]["material_losses"])
    pipe = losses["MAT-SA-EASTWEST-PIPELINE-20260911"]["record"]
    assert "PARTIALLY_RESTARTED_AT_REDUCED_RATE" in pipe["status"]
    assert pipe["yanbu_status"].endswith("SPECIFIC_LOADING_NOT_OBSERVED_IN_REVIEWED_EVIDENCE")
    assert "6_TO_8_WEEKS" in pipe["full_capacity_restoration_estimate"]

    casualties = rows_by_id(state["entities"]["casualties"])
    yem = casualties["CAS-YEMEN-DISPLACEMENT-20260913"]["record"]
    assert yem["reported_displaced_operator"] == "MORE_THAN"
    assert yem["reported_displaced_approx"] == 130000
    assert yem["reported_deaths"] == 674
    assert yem["reported_injuries_approx"] == 3000
    assert any(row.get("reported_displaced") == 114498 for row in yem["parallel_denominators"])
    assert any(row.get("reported_displaced") == 129438 for row in yem["parallel_denominators"])

    dips = rows_by_id(state["entities"]["diplomacy"])
    positions = dips["DIP-IRAN-US-SETTLEMENT-CONDITIONS-20260920"]["record"]
    assert len(positions["position_lineage"]) == 4
    assert [row["speaker"] for row in positions["position_lineage"]] == [
        "Mohammad Bagher Zolghadr", "Mohsen Rezaei", "unnamed senior Iranian official", "Abbas Araqchi via Iranian state media reporting"
    ]
    assert "RELATION_UNRESOLVED" in positions["status"]
    contacts = dips["DIP-US-IRAN-UNGA-CONTACTS-20260922"]["record"]
    assert "INDIRECT_FORMAT_SUPPORTED" in contacts["status"]
    assert "COMPETING_PUBLIC_CHARACTERIZATION_PRESERVED" in contacts["status"]
    assert dips["DIP-FRANCE-US-UNSC-HORMUZ-MISSION-20260922"]["record"]["status"].startswith("DRAFTING_REPORTED")
    assert dips["DIP-QATAR-GULF-SECURITY-FRAMEWORK-20260922"]["record"]["status"].endswith("NO_AGREEMENT")
    assert "NO_NEW_COMBINED_MILITARY_COMMITMENT" in dips["DIP-TUR-EGY-PAK-KSA-JOINT-STATEMENT-20260922"]["record"]["status"]

    economics = rows_by_id(state["entities"]["economics"])
    aviation = economics["ECON-IRAN-AVIATION-SECONDARY-SANCTIONS-20260923"]["record"]
    assert "GLOBAL_GROUNDING_NOT_ESTABLISHED" in aviation["adjudication"]
    assert "RETALIATION_THREAT_NOT_EXECUTED" in aviation["adjudication"]

    movements = rows_by_id(state["entities"]["movements"])
    mov = movements["MOV-HOUTHI-REDSEA-COAST-OFFENSIVE-20260910"]["record"]
    assert "115_KM" in mov["status"]
    relationships = rows_by_id(state["entities"]["relationships"])
    rel = relationships["REL-IRAN-HOUTHI-OPERATIONAL-SUPPORT-20260923"]["record"]
    assert rel["support_taxonomy"]["operation_specific_direction"].startswith("MULTI_SOURCE_REPORTING")
    assert rel["support_taxonomy"]["organization_wide_command_control"] == "NOT_ESTABLISHED"
    gaps = rows_by_id(state["entities"]["gaps"])
    assert "ORGANIZATION_WIDE_COMMAND_CONTROL_UNRESOLVED" in gaps["GAP-E1-IRGC-HOUTHI-COMMAND"]["record"]["status"]

    facilities = rows_by_id(state["entities"]["facilities"])
    qatar = facilities["FAC-QAT-LNG-SYSTEM"]["record"]
    assert any("12.8 million tonnes/year" in text for text in qatar["verified_functional_effect"])
    assert any("3-5 year" in text for text in qatar["verified_functional_effect"])
    assert any("two of 14 LNG trains and a GTL facility" in text for text in qatar["verified_functional_effect"])
    assert "North Field" not in " ".join(qatar.get("verified_functional_effect") or [])

    routing = json.loads((ROOT / "data/evidence-integration/rook-catchup-claims-routing-20260923.json").read_text(encoding="utf-8"))
    routed = {row["proposition_id"] for row in routing["referrals"]}
    assert routed == {
        "SAUDI-IRAN-NEGOTIATION-INTENT-202609",
        "SAUDI-IRAN-REGIONAL-STABILITY-CONDUCT-202609",
        "IRAN-HOUTHI-DIRECT-OPERATIONAL-INVOLVEMENT-202609",
        "IRAN-HAMAS-SUPPORT-SEPARATE-202609",
    }
    assert routing["web_of_lies"] == "OUT_OF_SCOPE"

    packet = json.loads((ROOT / "data/canonical-updates/UPD-20260923-ROOK-EVIDENCE-CATCHUP.json").read_text(encoding="utf-8"))
    assert packet["narrative_claims"] == []
    assert packet["upstream_provenance"]["web_of_lies"] == "OUT_OF_SCOPE_NO_HANDOFF_OR_SEMANTIC_MUTATION"
    assert len(packet["upstream_provenance"]["locker_artifacts"]) == 6

    print("rook-current-state-catchup-20260923: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
