#!/usr/bin/env python3
"""Durable evidence regressions extracted from retired presentation-era validators.

These checks intentionally protect evidentiary meaning, not historical JS/CSS,
loader choreography, page composition, or exact reader wording.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    # Occurrence date and reporting date are different clocks. This was a
    # unique protection inside the Aug. 26 presentation-era validator.
    aug26 = {row["event_id"]: row for row in load("data/current-update-20260826/events.json").get("events", [])}
    kpler = aug26["CUR-20260825-009"]
    require(kpler.get("event_date") == "2026-08-25", "Kpler occurrence date changed")
    require(kpler.get("first_reported") == "2026-08-26", "Kpler first-report date changed")
    hormuz = aug26["CUR-20260826-001"]
    verified_effect = (hormuz.get("verified_effect") or "").lower()
    require("final" not in verified_effect or "does not" in verified_effect,
            "Hormuz negotiation record silently acquired unsupported finality")

    # Promoted strike/BDA records must retain attribution, coordinate lineage,
    # limitations and source support independent of any historical map loader.
    strikes = {row["id"]: row for row in load("data/strikes.json").get("strikes", [])}
    promoted = {
        "USSTRIKE-AHVAZ-AIRCRAFT-0306",
        "USSTRIKE-BANDARABBAS-KILO-0304",
        "USSTRIKE-BANDARABBAS-CORSAIR-0712",
        "COMBINED-DAMAGE-ASHURA-0317",
        "COMBINED-DAMAGE-FATH-0317",
        "COMBINED-DAMAGE-KHOJIR-0317",
    }
    require(promoted <= set(strikes), "one or more promoted strike/BDA records disappeared")
    for strike_id in promoted:
        row = strikes[strike_id]
        require(row.get("coordinate_precision"), f"{strike_id}: coordinate precision missing")
        require(row.get("coordinate_lineage"), f"{strike_id}: coordinate lineage missing")
        bda = row.get("bda") or {}
        for field in ("finding", "confidence", "limitations"):
            require(bda.get(field), f"{strike_id}: BDA {field} missing")
        urls = row.get("source_urls") or []
        require(urls and all(isinstance(url, str) and url.startswith("https://") for url in urls),
                f"{strike_id}: public source URLs missing or invalid")
    for strike_id in ("COMBINED-DAMAGE-ASHURA-0317", "COMBINED-DAMAGE-FATH-0317", "COMBINED-DAMAGE-KHOJIR-0317"):
        row = strikes[strike_id]
        require("ATTRIBUTION_UNRESOLVED" in row.get("actor", ""), f"{strike_id}: unresolved attribution lost")
        require("ATTRIBUTION_UNRESOLVED" in row.get("verification", ""), f"{strike_id}: unresolved verification lost")

    # Preserve several high-value chronology semantics formerly mixed into the
    # Aug. 22 workspace validator.
    events = {row["event_id"]: row for row in load("data/integration-v1.2/events.json").get("events", [])}
    seven = events["EV-20260820-006"]
    four = events["EV-20260820-007"]
    require(four["event_id"] in (seven.get("related_event_ids") or []) and seven["event_id"] in (four.get("related_event_ids") or []),
            "conflicting Hormuz observations are no longer linked")
    require("UNRESOLVED" in four.get("current_status", ""), "Hormuz count discrepancy was silently resolved")
    require("LEGAL_SOVEREIGNTY_NOT_ESTABLISHED" in events["EV-20260822-001"].get("current_status", ""),
            "selective passage was upgraded into legal sovereignty")
    oman_status = events["EV-20260821-004"].get("current_status", "")
    require("ACTIVE" in oman_status and "UNRESOLVED" in oman_status, "Oman-Iran channel status changed improperly")
    sanctions_status = events["EV-20260822-006"].get("current_status", "")
    require(all(token in sanctions_status for token in ("ANNOUNCED", "SCHEDULED", "NOT_ENACTED")),
            "scheduled sanctions were converted into enacted sanctions")
    for event_id in ("EV-20260821-005", "EV-20260822-004"):
        location = events[event_id].get("location") or {}
        require(location.get("lat") is None and location.get("lon") is None,
                f"{event_id}: unsupported precise current coordinates introduced")

    # Facility condition and operational effect are separate facts. Preserve the
    # distinction without freezing the old forensic sentence used to describe it.
    facilities = {row["id"]: row for row in load("data/facilities.json").get("facilities", [])}
    al_udeid = facilities["US-ALUDEID"]
    require(al_udeid.get("damage_evidence_status") == "VERIFIED_DAMAGE", "Al Udeid verified-damage status changed")
    require(al_udeid.get("operational_effect_status") == "SUBFACILITY_INOPERABLE",
            "Al Udeid CAOC/subfacility distinction changed")
    ain_asad = facilities["US-AINASAD"]
    require(ain_asad.get("operational_effect_status") == "WITHDRAWN_NOT_ACTIVE_US_BASE",
            "Ain al-Asad withdrawal was converted into damage/unknown status")

    # Accepted maritime-loss reconciliation must not promote claim-only/near-miss
    # vessels into durable losses. This is an evidentiary denominator protection,
    # not a requirement to retain the historical reconciliation UI.
    reconciled_losses = load("data/wiki-map-reconciliation-20260826/material-losses.json").get("records", [])
    loss_names = {str(row.get("item") or "").lower() for row in reconciled_losses}
    require(any("mkd vyom" in name for name in loss_names), "MKD Vyom disappeared from accepted loss reconciliation")
    require(any("hercules star" in name for name in loss_names), "Hercules Star disappeared from accepted loss reconciliation")
    for forbidden in ("ocean electra", "msc grace", "haiphong express"):
        require(not any(forbidden in name for name in loss_names),
                f"claim-only/non-durable vessel entered accepted loss denominator: {forbidden}")

    # The generated source registry must remain exhaustive for the historical
    # authoritative source namespace still consumed by current canonical build.
    registry = load("data/source-registry.json")
    registry_ids = {row["source_id"] for row in registry.get("sources", [])}
    integration_ids = {row["source_id"] for row in load("data/integration-v1.2/sources.json").get("sources", [])}
    require(integration_ids <= registry_ids,
            f"source registry missing {len(integration_ids - registry_ids)} integration source(s)")

    print("evidence-semantic-edge-regressions: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
