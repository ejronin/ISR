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
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20261007-ROOK-AFTERNOON.json").read_text(encoding="utf-8"))
    entry = next(item for item in manifest["accepted_updates"] if item["packet_id"] == packet["packet_id"])

    assert entry["sequence"] == 34
    assert entry["sha256"] == "c75207c95957a34ba6e7dd4e934534b39a522c96072ee8459a4fc9cdbc5a911a"
    assert entry["lineage_sha256"] == "89f6f8a3e9905b6b5f3551df58df34ba01f39c31770c7c228d1e4546a9fa0a5a"
    assert manifest["current_evidence_cutoff"] >= entry["evidence_cutoff"]
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]

    assert packet["status"] == "ACCEPTED"
    assert packet["narrative_claims"] == []
    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20261007T1403ET.json"
    ]

    events = {row["event_id"]: row for row in state["chronology"]}
    assert "LOCKER-IRAN-ENRICHMENT-CURRENT-STATUS-20261007" in events
    assert "LOCKER-GREECE-HORMUZ-MARITIME-AID-OFFER-20261007" in events

    diplomacy = rows_by_id(state["entities"]["diplomacy"])
    nuclear = diplomacy["DIP-IRAN-NUCLEAR-TECHNICAL-STATUS-20261007"]["record"]
    assert "not currently known to be enriching" in nuclear["observed_state"].lower()
    assert "200 kg" in nuclear["observed_state"]
    assert "inspectors have not returned" in nuclear["observed_state"].lower()
    assert "isfahan tunnel enrichment plant remains unknown" in nuclear["observed_state"].lower()
    assert "DOES_NOT_ESTABLISH_INABILITY_TO_RESTART" in nuclear["adjudication"]

    greece = diplomacy["DIP-GREECE-HORMUZ-MARITIME-SUPPORT-20261007"]["record"]
    assert "conditional" in greece["status"].lower()
    assert "no greek hormuz deployment" in greece["observed_state"].lower()

    print("atlas-current-state-catchup-20261007-afternoon: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
