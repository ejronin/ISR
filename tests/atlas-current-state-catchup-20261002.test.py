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
    packet = json.loads((ROOT / "data/canonical-updates/UPD-20261002-ROOK-CATCHUP.json").read_text(encoding="utf-8"))

    entry28 = next(item for item in manifest["accepted_updates"] if item["packet_id"] == packet["packet_id"])
    assert entry28["sequence"] == 28
    assert entry28["packet_id"] == packet["packet_id"] == "UPD-20261002-ROOK-CATCHUP"
    assert entry28["sha256"] == "ff1fc48fb071966f5c462a202f2a778f4e496034c19fe5596c8e0139a72dab1b"
    assert entry28["lineage_sha256"] == "01b1587c5f48953ff912141d8010363dc3a9752920c1ebed7ecd15d1847e9f3f"
    assert entry28["evidence_cutoff"] == packet["evidence_cutoff"]
    assert packet["evidence_cutoff"] <= manifest["current_evidence_cutoff"]
    assert canonical["release"]["current_osint_cutoff"] == manifest["current_evidence_cutoff"]

    assert packet["upstream_provenance"]["locker_artifacts"] == [
        "data/evidence-integration/rook-evidence-locker-sweep-20261001T1200ET.json",
        "data/evidence-integration/rook-evidence-locker-sweep-20261002T0000ET.json",
    ]

    events = {row["event_id"]: row["event"] for row in public["chronology"]}
    expected = {
        "G3-IRAN-CONDITIONAL-RETALIATION-PLANNING-20261001",
        "G3-SYRIA-HEZBOLLAH-TURKEY-CONTACT-20261001",
        "G3-HORMUZ-THREE-TANKERS-PROJECTILES-20260930",
        "G3-FLYDUBAI-FZ1073-INVESTIGATION-20261001",
        "G3-FUJAIRAH-FUEL-RECOVERY-20261001",
        "G3-CHINA-FUEL-EXPORT-SUSPENSION-20261001",
        "G3-US-IRAN-INDUSTRIAL-SANCTIONS-20261001",
        "G3-US-A7-FINANCIAL-ACTION-20261001",
        "G3-SAUDI-MEDINA-POWER-INCIDENT-20260929",
    }
    assert expected <= set(events)
    for event_id in expected:
        assert events[event_id]["source_ids"]
        assert events[event_id]["strike_countable"] is False

    iran_plan = events["G3-IRAN-CONDITIONAL-RETALIATION-PLANNING-20261001"]["summary"]
    assert "contingency planning" in iran_plan
    assert "did not establish a final decision" in iran_plan

    hormuz = events["G3-HORMUZ-THREE-TANKERS-PROJECTILES-20260930"]["summary"]
    assert "three Liberian-flagged tankers" in hormuz
    assert "attacker remained unresolved" in hormuz

    fz = events["G3-FLYDUBAI-FZ1073-INVESTIGATION-20261001"]["summary"]
    assert "appeared to have acted alone" in fz
    assert "No Iran or Houthi organizational connection had been established" in fz

    medina = events["G3-SAUDI-MEDINA-POWER-INCIDENT-20260929"]["summary"]
    assert "Houthi sources denied responsibility" in medina
    assert "attribution remained contested" in medina

    entities = public["entities"]
    shipping = rows_by_id(entities["shipping"])
    economics = rows_by_id(entities["economics"])
    diplomacy = rows_by_id(entities["diplomacy"])

    packet_entities = {row["entity_id"]: row["record"] for row in packet["entities"]}
    prior_shipping = packet_entities["SHIP-HORMUZ-KPLER-RECOVERY-20260929"]
    prior_energy = packet_entities["ECON-GULF-ENERGY-RECOVERY-20260930"]
    prior_sanctions = packet_entities["ECON-US-IRAN-INDUSTRIAL-SANCTIONS-20261001"]
    prior_diplomacy = packet_entities["DIP-SYRIA-HEZBOLLAH-TURKEY-CONTACT-20261001"]

    assert prior_shipping["status"] == "Traffic has recovered somewhat, but attacks and disruption continue"
    assert prior_energy["status"] == "Fuel flows are improving, but the market is still far from pre-war conditions"
    assert prior_sanctions["status"] == "U.S. pressure expanded into additional Iranian industrial and financial networks"
    assert prior_diplomacy["status"] == "Reported Syria-Hezbollah talks in Turkey remain disputed"

    assert shipping["SHIP-HORMUZ-KPLER-RECOVERY-20260929"]["record"]["knowledge_time"] >= prior_shipping["knowledge_time"]
    assert economics["ECON-GULF-ENERGY-RECOVERY-20260930"]["record"]["knowledge_time"] >= prior_energy["knowledge_time"]
    assert economics["ECON-US-IRAN-INDUSTRIAL-SANCTIONS-20261001"]["record"]["knowledge_time"] >= prior_sanctions["knowledge_time"]
    assert diplomacy["DIP-SYRIA-HEZBOLLAH-TURKEY-CONTACT-20261001"]["record"]["knowledge_time"] >= prior_diplomacy["knowledge_time"]

    public_text = [events[event_id]["summary"] for event_id in expected]
    for rec in (
        prior_shipping,
        prior_energy,
        prior_sanctions,
        prior_diplomacy,
    ):
        public_text.extend([str(rec.get("status") or ""), str(rec.get("observed_state") or "")])

    rendered = "\n".join(public_text).lower()
    for banned in (
        "drawer",
        "substrate",
        "adjudication",
        "canonical",
        "operational order",
        "denominator-compatible",
        "assessment strengthened",
        "relationship",
    ):
        assert banned not in rendered, banned

    print("atlas-current-state-catchup-20261002: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
