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
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20260927-ROOK-EVIDENCE-CATCHUP.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "data/evidence-integration/rook-catchup-consumption-audit-20260927.json").read_text(encoding="utf-8"))
    routing = json.loads((ROOT / "data/evidence-integration/rook-catchup-claims-routing-20260927.json").read_text(encoding="utf-8"))

    entry = next(item for item in manifest["accepted_updates"] if item["packet_id"] == packet["packet_id"])
    assert entry["sequence"] == 23
    assert entry["sha256"] == "980ae1819e6b5947e4a360e84d4573abcffafaa843dc4f31de2a7869b5e5e01e"
    assert entry["lineage_sha256"] == "93b5f29bf5aa626ccce485e98db33173fc26cae77b0aa1dc747cd8a2cef6a418"
    assert entry["previous_lineage_sha256"] == "de03d86878d5c1cb76a229ebc3ec38efd32fc2854660923364b887ccb698468c"
    assert manifest["current_evidence_cutoff"] == entry["evidence_cutoff"]
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]

    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20260927T0000ET.json"
    ]

    events = {row["event_id"]: row for row in state["chronology"]}
    for event_id in (
        "G3-SAUDI-UNGA-NAVIGATION-NO-TOLLS-20260926",
        "G3-OMAN-IRAN-HORMUZ-MEETING-20260926",
        "G3-OMAN-US-DEESCALATION-NAVIGATION-20260926",
        "G3-RUSSIA-LAVROV-GULF-SECURITY-20260926",
    ):
        assert event_id in events
        assert events[event_id]["strike_countable"] is False

    diplomacy = rows_by_id(state["entities"]["diplomacy"])["DIP-US-IRAN-UNGA-CONTACTS-20260922"]["record"]
    assert "DIRECT_TRUMP_REJECTION_CONFIRMED_SEP26" in diplomacy["status"]
    assert "SAUDI_PREWAR_NO_FEE_BASELINE_STATED" in diplomacy["status"]
    assert "OMAN_MEDIATION_CONTINUES" in diplomacy["status"]
    assert "RUSSIA_OFFERS_GULF_SECURITY_ARCHITECTURE_SUPPORT" in diplomacy["status"]
    assert "NO_COMMON_REGIONAL_FRAMEWORK_ESTABLISHED" in diplomacy["status"]
    assert "replacement U.S.-Iran agreement" in diplomacy["observed_state"]

    assert packet["narrative_claims"] == []
    assert routing["referrals"] == []
    assert "rook-catchup-claims-routing-20260926.json" in routing["prior_referrals_retained_by_reference"]
    assert audit["claims_forensics"].startswith("NO_NEW_REFERRALS")
    assert audit["web_of_lies"] == "OUT_OF_SCOPE_NO_FILES_OR_SEMANTICS_TO_CHANGE"
    assert packet["upstream_provenance"]["web_of_lies"] == "OUT_OF_SCOPE_NO_HANDOFF_OR_SEMANTIC_MUTATION"

    print("rook-current-state-catchup-20260927: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
