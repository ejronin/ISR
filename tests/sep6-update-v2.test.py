#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_canonical_current_state_v2_final as builder


def main() -> int:
    state = builder.build_state(ROOT)
    assert state["release"]["gate2_evidence_cutoff"] == "2026-09-05T00:37:00-04:00"
    assert state["release"]["current_osint_cutoff"] == "2026-09-06T14:10:43-04:00"
    events = {item["event_id"]: item for item in state["chronology"]}
    for event_id in (
        "G3-IRGC-US-WARSHIPS-20260905",
        "G3-US-IRAN-TANKER-STRIKES-20260905",
        "G3-IRGC-SIX-VESSEL-CLAIM-20260905",
        "G3-IRGC-US-UNMANNED-VESSEL-CLAIM-20260906",
        "G3-HORMUZ-BARGAINING-FORMULA-20260906",
        "G3-LEBANON-HEZBOLLAH-ISRAEL-20260906",
        "G3-YEMEN-HAYS-20260906",
    ):
        assert event_id in events
    assert events["G3-IRGC-SIX-VESSEL-CLAIM-20260905"]["event"]["strike_countable"] is False

    def loss_key(item):
        record = item.get("record") or {}
        return item.get("entity_id") or item.get("loss_id") or record.get("loss_id")

    losses = {loss_key(item): item for item in state["entities"]["material_losses"] if loss_key(item)}
    expected_losses = {
        "MAT-IRN-DOWNY-20260905",
        "MAT-IRN-STARK1-20260905",
        "MAT-COM-KYLO-NOXEN-20260905",
        "MAT-IRN-SINOPA-20260901-04",
        "MAT-IRN-HAWK-20260901-04",
    }
    assert expected_losses <= set(losses)
    for loss_id in expected_losses:
        record = losses[loss_id]["record"]
        assert record.get("military_platform") is False
        assert losses[loss_id].get("semantic_disposition")
    for loss_id in ("MAT-IRN-DOWNY-20260905", "MAT-IRN-STARK1-20260905", "MAT-COM-KYLO-NOXEN-20260905"):
        assert losses[loss_id]["semantic_disposition"]["disposition"] == "EVENT_LINK"
    for loss_id in ("MAT-IRN-SINOPA-20260901-04", "MAT-IRN-HAWK-20260901-04"):
        assert losses[loss_id]["semantic_disposition"]["disposition"] == "NON_EVENT_UNRESOLVED_DATE"

    claims = [item for item in state["entities"]["narrative_claims"] if item["entity_id"] == "LL-US-NOT-WAR-SMALL-POTATOES-20260904"]
    assert len(claims) == 1
    assert claims[0]["record"]["deception_score"] == 0
    assert "SRC-6A02B13B992D" in claims[0]["record"]["source_ids"]
    assert any("Sep. 5" in step for step in claims[0]["record"]["event_tree"])

    new_claim_ids = {
        "LL-IRAN-US-WARSHIP-DAMAGE-20260905",
        "LL-IRAN-US-UNMANNED-VESSEL-20260906",
        "LL-IRAN-SIX-VESSEL-SUCCESS-20260905",
        "LL-PAKNEJAD-KHARG-550-HITS-20260906",
        "LL-PAKNEJAD-KHARG-CONTINUED-OPS-20260906",
        "LL-IRAN-QALIBAF-ESCALATION-DOCTRINE-20260906",
    }
    claim_map = {item["entity_id"]: item["record"] for item in state["entities"]["narrative_claims"]}
    assert new_claim_ids <= set(claim_map)
    for claim_id in new_claim_ids:
        assert claim_map[claim_id]["deception_score"] == 0
    assert claim_map["LL-IRAN-US-UNMANNED-VESSEL-20260906"]["truth_adjudication"] == "UNRESOLVED"

    relationships = {item["entity_id"]: item["record"] for item in state["entities"].get("relationships", [])}
    assert relationships["REL-MINAB-ATTRIBUTION-20260906"]["subject_event_id"] == "G3-MINAB-SCHOOL-20260228"
    assert sum(1 for item in state["chronology"] if item["event_id"] == "G3-MINAB-SCHOOL-20260228") == 1
    assert len([key for key in relationships if key.startswith("REL-STRAT-") and key.endswith("-20260906")]) == 6

    shipping = {item["entity_id"]: item["record"] for item in state["entities"]["shipping"]}
    assert shipping["SHIP-G3-HORMUZ-20260904"]["date"] == "2026-09-06"
    assert "scope" in shipping["SHIP-G3-HORMUZ-20260904"]["ais_scope"].lower()
    economics = {item["entity_id"]: item["record"] for item in state["entities"]["economics"]}
    assert economics["ECON-G3-OIL-EXPORTS-20260903"]["date"] == "2026-09-06"
    assert "REGIME_COLLAPSE_NOT_ESTABLISHED" in economics["ECON-G3-OIL-EXPORTS-20260903"]["adjudication"]

    assert state["daily_coverage"][-1]["date"] == "2026-09-06"
    print("sep6-update-v2: PASS - stable IDs, material-loss semantics, claim discipline, strategic state and cutoff verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
