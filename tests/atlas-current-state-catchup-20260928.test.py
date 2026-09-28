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
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20260928-ATLAS-CURRENT-CATCHUP.json").read_text(encoding="utf-8"))
    intake = json.loads((ROOT / "data/evidence-integration/atlas-current-sweep-20260928T1315ET.json").read_text(encoding="utf-8"))

    entry = next(item for item in manifest["accepted_updates"] if item["packet_id"] == packet["packet_id"])
    assert entry["sequence"] == 24
    assert entry["sha256"] == "e7acc3a128ffca8d88399687916f60722896aa4d8b68efb1007088878843036b"
    assert entry["lineage_sha256"] == "a8fee405ad86e34fe57b5969d891934310e89f2a4e998a82d1a288d120732318"
    assert entry["previous_lineage_sha256"] == "3f80fe46b6a9e5be5916a986141c915ba495ee9512a7cf377a47403d437c2962"
    assert manifest["current_evidence_cutoff"] == "2026-09-28T13:15:00-04:00"
    assert state["release"]["current_osint_cutoff"] == "2026-09-28T13:15:00-04:00"

    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/atlas-current-sweep-20260928T1315ET.json"
    ]
    assert intake["scope"]["prior_canonical_cutoff"] == "2026-09-27T00:00:00-04:00"

    events = {row["event_id"]: row for row in state["chronology"]}
    for event_id in (
        "G3-IRAN-POST-REJECTION-HORMUZ-POSITION-20260927",
        "G3-PEZESHKIAN-NUCLEAR-TALKS-POSITION-20260927",
        "G3-YEMEN-TAIZ-MAWIYA-STRIKE-20260927",
        "G3-QATAR-US-IRAN-AMENDED-SEVEN-DAY-TALKS-20260928",
    ):
        assert event_id in events

    assert events["G3-YEMEN-TAIZ-MAWIYA-STRIKE-20260927"]["strike_countable"] is False
    assert "remain attributed" in events["G3-YEMEN-TAIZ-MAWIYA-STRIKE-20260927"]["summary"]
    assert "not independently treated" in events["G3-PEZESHKIAN-NUCLEAR-TALKS-POSITION-20260927"]["summary"]

    diplomacy = rows_by_id(state["entities"]["diplomacy"])["DIP-US-IRAN-UNGA-CONTACTS-20260922"]["record"]
    assert "IRAN_POST_REJECTION_HORMUZ_CONDITIONS_REAFFIRMED_SEP27" in diplomacy["status"]
    assert "IRAN_OPEN_TO_NUCLEAR_AND_OTHER_TALKS_SEP27" in diplomacy["status"]
    assert "AMENDED_SEVEN_DAY_PROPOSAL_IN_SHUTTLE_DISCUSSION_SEP28" in diplomacy["status"]
    assert "NO_AGREEMENT" in diplomacy["status"]
    assert "continuing mediated diplomacy" in diplomacy["observed_state"]

    assert packet["narrative_claims"] == []
    assert packet["upstream_provenance"]["web_of_lies"] == "OUT_OF_SCOPE_NO_HANDOFF_OR_SEMANTIC_MUTATION"

    print("atlas-current-state-catchup-20260928: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
