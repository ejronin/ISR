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
    midnight = json.loads((ROOT / "data/canonical-updates/UPD-20260929-ROOK-MIDNIGHT-CATCHUP.json").read_text(encoding="utf-8"))
    noon = json.loads((ROOT / "data/canonical-updates/UPD-20260929-ROOK-NOON-CATCHUP.json").read_text(encoding="utf-8"))
    sweep0 = json.loads((ROOT / "data/evidence-integration/rook-evidence-locker-sweep-20260929T0000ET.json").read_text(encoding="utf-8"))
    sweep12 = json.loads((ROOT / "data/evidence-integration/rook-evidence-locker-sweep-20260929T1200ET.json").read_text(encoding="utf-8"))
    handoff = json.loads((ROOT / "data/evidence-integration/rook-catchup-claims-routing-20260929.json").read_text(encoding="utf-8"))

    e25 = manifest["accepted_updates"][-2]
    e26 = manifest["accepted_updates"][-1]
    assert e25["sequence"] == 25
    assert e25["packet_id"] == midnight["packet_id"]
    assert e25["sha256"] == "83624e77535498d880a09f847f0fe857697a9e237788673e2f61d4d2599ab9f6"
    assert e25["lineage_sha256"] == "d1c05e84ba65baa1d7a8d7a98793a0f9d3736e27ddefe8590a9a432ea39be1ba"
    assert e26["sequence"] == 26
    assert e26["packet_id"] == noon["packet_id"]
    assert e26["sha256"] == "3460fd08d21f07e79ec2ea3ddbd5af241083421ba74deccefbe2e11a5ba7f924"
    assert e26["lineage_sha256"] == "619172d77f0e8e469207da2d0f70687364ded940b9262c3e4bbb209e37b10383"
    assert e26["previous_lineage_sha256"] == e25["lineage_sha256"]
    assert manifest["current_evidence_cutoff"] == "2026-09-29T12:00:00-04:00"
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]

    assert sweep0["scope"]["window_start"] == "2026-09-28T13:15:00-04:00"
    assert sweep0["scope"]["window_end"] == "2026-09-29T00:00:00-04:00"
    assert sweep12["scope"]["window_start"] == sweep0["scope"]["window_end"]
    assert sweep12["scope"]["window_end"] == "2026-09-29T12:00:00-04:00"
    assert midnight["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20260929T0000ET.json"
    ]
    assert noon["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20260929T1200ET.json"
    ]

    events = {row["event_id"]: row["event"] for row in state["chronology"]}
    expected = {
        "G3-US-MEDIATOR-CONTACTS-CONFIRMED-20260928",
        "G3-UAE-ISRAEL-IRAN-MEETING-CONFIRMED-20260928",
        "G3-US-IRAN-OFFER-REPORT-DENIAL-20260929",
        "G3-IRGC-US-VOTER-OPEN-LETTER-20260929",
        "G3-HORMUZ-KPLER-OIL-EXPORT-RECOVERY-20260929",
        "G3-IRAN-CIVILIAN-ECONOMIC-STRAIN-20260929",
    }
    assert expected <= set(events)
    for event_id in expected:
        assert events[event_id]["source_ids"]
        assert events[event_id]["strike_countable"] is False

    assert "publicly disputed" in events["G3-US-IRAN-OFFER-REPORT-DENIAL-20260929"]["summary"]
    assert "about half the pre-war volume" in events["G3-HORMUZ-KPLER-OIL-EXPORT-RECOVERY-20260929"]["summary"]

    diplomacy = rows_by_id(state["entities"]["diplomacy"])["DIP-US-IRAN-UNGA-CONTACTS-20260922"]["record"]
    assert "US_MEDIATOR_CONTACTS_CONFIRMED_SEP28" in diplomacy["status"]
    assert "US_PUBLIC_DENIAL_OF_REPORTED_SANCTIONS_RELIEF_OFFER_SEP29" in diplomacy["status"]
    assert "NO_AGREEMENT" in diplomacy["status"]

    shipping = rows_by_id(state["entities"]["shipping"])["SHIP-HORMUZ-KPLER-RECOVERY-20260929"]["record"]
    assert shipping["status"] == "PARTIAL_RECOVERY_BELOW_PREWAR_VOLUME"
    economy = rows_by_id(state["entities"]["economic"])["ECON-IRAN-CIVILIAN-STRAIN-20260929"]["record"]
    assert economy["status"] == "SEVERE_WARTIME_HOUSEHOLD_AND_PRIVATE_SECTOR_STRAIN"

    assert midnight["narrative_claims"] == []
    assert noon["narrative_claims"] == []
    assert handoff["baseline"]["valenti"]["promoted_incident_count"] == 24
    assert handoff["baseline"]["levins"]["documented_incident_count"] == 36
    refs = {row["referral_id"]: row for row in handoff["referrals"]}
    assert refs["WOL-LEVINS-NYC-TALKS-NOTHING-20260928"]["status"] == "NEW_SOURCE_EVIDENCE_REOPEN_REVIEW"
    assert refs["WOL-VALENTI-DOOMSDAY-FALSE-FLAG-20260928"]["status"] == "NEW_CANDIDATE_BODY_REVIEW_REQUIRED"
    assert refs["WOL-VALENTI-PILOT-RIDGELINE-202609"]["status"] == "ALREADY_RESOLVED_NOT_PROMOTED_NO_REOPEN"\n    assert refs["WOL-VALENTI-PILOT-RIDGELINE-202609"]["existing_review_id"] == "VALENTI-NONINCIDENT-PILOT-7000FT-202609"\n    assert refs["WOL-VALENTI-HOUTHI-MECCA-RECEIPT-UPGRADE-202609"]["status"] == "ALREADY_RESOLVED_NOT_PROMOTED_NO_REOPEN"\n    assert refs["WOL-VALENTI-CHINA-NUCLEAR-WAR-DEDUPE-20260922"]["status"] == "EXISTING_INCIDENT_DIRECT_RECEIPT_UPGRADE_AVAILABLE"
    assert handoff["web_of_lies"].endswith("NO_COUNTS_CHANGED_BY_THIS_HANDOFF")

    print("atlas-current-state-catchup-20260929: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
