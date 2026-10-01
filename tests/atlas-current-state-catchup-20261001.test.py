#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_canonical_current_state_v2_final as canonical_builder
import build_public_current_state_v2_hardened as public_builder


def rows_by_id(rows):
    return {row.get("entity_id"): row for row in rows if row.get("entity_id")}


def main() -> int:
    canonical = canonical_builder.build_state(ROOT)
    public = public_builder.build_state(ROOT)
    manifest = json.loads((ROOT / "data/canonical-ledger/manifest-v2.json").read_text(encoding="utf-8"))
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20261001-ROOK-CATCHUP.json").read_text(encoding="utf-8"))

    last = manifest["accepted_updates"][-1]
    assert last["sequence"] == 27
    assert last["packet_id"] == packet["packet_id"] == "UPD-20261001-ROOK-CATCHUP"
    assert last["sha256"] == "30c5a1b558898c1f8056cc6deffd3c36ed044d4317e6eefa9b5890ed1c1da1a1"
    assert last["lineage_sha256"] == "e25f2a2024b1df1f089cd1e8403d0eae2ac7c3eef0d53e35af7e275ab32f507b"
    assert manifest["current_evidence_cutoff"] == "2026-10-01T00:00:00-04:00"
    assert canonical["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]

    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20260930T0000ET.json",
        "data/evidence-integration/rook-evidence-locker-sweep-20260930T1200ET.json",
        "data/evidence-integration/rook-evidence-locker-sweep-20261001T0000ET.json",
    ]

    events = {row["event_id"]: row["event"] for row in public["chronology"]}
    expected = {
        "G3-US-IRAQ-WITHDRAWAL-COMPLETE-20260929",
        "G3-US-SPR-LOAN-OFFER-20260929",
        "G3-EASA-SAUDI-JORDAN-AIRSPACE-20260930",
        "G3-US-IRAN-QATAR-SEQUENCING-20260930",
        "G3-SAUDI-MBS-REGIONAL-SECURITY-20260930",
        "G3-FLYDUBAI-FZ1073-COCKPIT-INCIDENT-20260930",
        "G3-RAF-FAIRFORD-IRAN-ASSESSMENT-20260930",
        "G3-GULF-ENERGY-RECOVERY-20260930",
    }
    assert expected <= set(events)
    for event_id in expected:
        assert events[event_id]["source_ids"]
        assert events[event_id]["strike_countable"] is False

    fz = events["G3-FLYDUBAI-FZ1073-COCKPIT-INCIDENT-20260930"]["summary"]
    assert "landed safely" in fz
    assert "had not established a motive or any state or group connection" in fz
    assert "Iran" not in fz and "proxy" not in fz.lower()

    fairford = events["G3-RAF-FAIRFORD-IRAN-ASSESSMENT-20260930"]["summary"]
    assert "strong indications" in fairford
    assert "Iran denied involvement" in fairford
    assert "had not been independently established" in fairford

    energy = events["G3-GULF-ENERGY-RECOVERY-20260930"]["summary"]
    assert "$103.50" in energy
    assert "$70.75" in energy
    assert "46%" in energy
    assert "falling from wartime peaks" in energy
    assert "had not returned to pre-war conditions" in energy

    entities = public["entities"]
    diplomacy = rows_by_id(entities["diplomacy"])
    shipping = rows_by_id(entities["shipping"])
    economics = rows_by_id(entities["economics"])

    assert diplomacy["DIP-US-IRAN-UNGA-CONTACTS-20260922"]["record"]["status"] == "Mediated talks continue; no agreement"
    assert diplomacy["DIP-SAUDI-REGIONAL-SECURITY-20260930"]["record"]["status"] == "Saudi Arabia continues diplomacy while emphasizing collective Gulf security"
    assert shipping["SHIP-HORMUZ-KPLER-RECOVERY-20260929"]["record"]["status"] == "Traffic and exports are recovering, but Hormuz is not back to normal"
    assert economics["ECON-GULF-ENERGY-RECOVERY-20260930"]["record"]["status"] == "Oil prices have fallen from wartime peaks but remain well above pre-war levels"

    public_text = []
    for event_id in expected:
        public_text.append(events[event_id]["summary"])
    for entity_id in ("DIP-US-IRAN-UNGA-CONTACTS-20260922", "DIP-SAUDI-REGIONAL-SECURITY-20260930"):
        rec = diplomacy[entity_id]["record"]
        public_text.extend([str(rec.get("status") or ""), str(rec.get("observed_state") or "")])
    rec = shipping["SHIP-HORMUZ-KPLER-RECOVERY-20260929"]["record"]
    public_text.extend([str(rec.get("status") or ""), str(rec.get("observed_state") or "")])
    rec = economics["ECON-GULF-ENERGY-RECOVERY-20260930"]["record"]
    public_text.extend([str(rec.get("status") or ""), str(rec.get("observed_state") or "")])

    rendered = "\n".join(public_text).lower()
    for banned in (
        "drawer",
        "substrate",
        "assessment strengthened",
        "operational order",
        "denominator-compatible",
        "adjudication",
        "canonical",
        "relationship",
    ):
        assert banned not in rendered, banned

    print("atlas-current-state-catchup-20261001: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
