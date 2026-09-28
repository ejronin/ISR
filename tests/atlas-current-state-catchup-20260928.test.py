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
    assert entry["sha256"] == "23a92427cc446887dff96cbb5e9a02bf18eaf2c33a13d4ee3c8eb0b76b48d357cbbb9d5d629a292a9159015a152fecd8673326678eb44a87db0c2e0d47b5481dae5f9156cf6c85d32f73477d6d1826ca8b43d457e360b5961c4560026f196331d94ebeb10cc4a611261dc1f25815a7be70b7ed67a1513c6944f93635720dcdfdb467369eca320b7534e0d42e49c7d9bd87abb9f2c463a2fcec3fc3f327277f6d610bebf27420b49ed1fd8a33e4773594092197f61b530c95869d6342eee52e4f1107668921fba37b43ab9fb675a9f91d86305019d7cd817307fe00ff379f513f66b651a8764ab842a4b06be1c3578c15d2962a531e039f40857b7beea29bf2de"
    assert entry["lineage_sha256"] == "c706684a38156e8f0a77c27c8ff853c8ba87faa209c8dd6ad6f2830892ad7327cbbb9d5d629a292a9159015a152fecd8673326678eb44a87db0c2e0d47b5481dae5f9156cf6c85d32f73477d6d1826ca8b43d457e360b5961c4560026f196331d94ebeb10cc4a611261dc1f25815a7be70b7ed67a1513c6944f93635720dcdfdb467369eca320b7534e0d42e49c7d9bd87abb9f2c463a2fcec3fc3f327277f6d610bebf27420b49ed1fd8a33e4773594092197f61b530c95869d6342eee52e4f1107668921fba37b43ab9fb675a9f91d86305019d7cd817307fe00ff379f513f66b651a8764ab842a4b06be1c3578c15d2962a531e039f40857b7beea29bf2de"
    assert entry["previous_lineage_sha256"] == "3f80fe46b6a9e5be5916a986141c915ba495ee9512a7cf377a47403d437c2962"
    assert manifest["current_evidence_cutoff"] == entry["evidence_cutoff"]
    assert state["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]

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
