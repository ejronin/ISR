#!/usr/bin/env python3
"""Validate the Aug. 26 strike/map enrichment and append-only current overlay."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def require(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


def canonical_source_id(url: str) -> str:
    digest = hashlib.sha1(url.rstrip("/").encode("utf-8")).hexdigest()[:12].upper()
    return f"SRC-{digest}"


def validate_strikes():
    payload = load("data/strikes.json")
    strikes = payload.get("strikes", [])
    require(len(strikes) == 19, f"Expected 19 strike/effect records, found {len(strikes)}")

    expected_new = {
        "USSTRIKE-AHVAZ-AIRCRAFT-0306": "USA",
        "USSTRIKE-BANDARABBAS-KILO-0304": "USA",
        "USSTRIKE-BANDARABBAS-CORSAIR-0712": "USA",
        "COMBINED-DAMAGE-ASHURA-0317": "US_ISR_COMBINED_ATTRIBUTION_UNRESOLVED",
        "COMBINED-DAMAGE-FATH-0317": "US_ISR_COMBINED_ATTRIBUTION_UNRESOLVED",
        "COMBINED-DAMAGE-KHOJIR-0317": "US_ISR_COMBINED_ATTRIBUTION_UNRESOLVED",
    }
    by_id = {}
    for strike in strikes:
        sid = strike.get("id")
        require(sid, "Strike/effect record missing id")
        require(sid not in by_id, f"Duplicate strike/effect id: {sid}")
        by_id[sid] = strike

    for sid, expected_actor in expected_new.items():
        require(sid in by_id, f"Missing promoted strike/effect record: {sid}")
        row = by_id[sid]
        require(row.get("actor") == expected_actor, f"{sid}: unexpected actor {row.get('actor')!r}")
        lat, lon = row.get("lat"), row.get("lon")
        require(isinstance(lat, (int, float)) and -90 <= lat <= 90, f"{sid}: invalid latitude")
        require(isinstance(lon, (int, float)) and -180 <= lon <= 180, f"{sid}: invalid longitude")
        require(row.get("coordinate_precision"), f"{sid}: missing coordinate_precision")
        require(row.get("coordinate_lineage"), f"{sid}: missing coordinate_lineage")
        bda = row.get("bda") or {}
        for field in ("finding", "confidence", "limitations"):
            require(bda.get(field), f"{sid}: BDA missing {field}")
        urls = row.get("source_urls") or []
        require(urls, f"{sid}: missing source URLs")
        require(all(isinstance(url, str) and url.startswith("https://") for url in urls), f"{sid}: source URLs must be https")

    for sid in ("USSTRIKE-AHVAZ-AIRCRAFT-0306", "USSTRIKE-BANDARABBAS-KILO-0304", "USSTRIKE-BANDARABBAS-CORSAIR-0712"):
        require(len(by_id[sid].get("source_urls") or []) >= 2, f"{sid}: expected multiple-source support")

    for sid in ("COMBINED-DAMAGE-ASHURA-0317", "COMBINED-DAMAGE-FATH-0317", "COMBINED-DAMAGE-KHOJIR-0317"):
        row = by_id[sid]
        require("ATTRIBUTION_UNRESOLVED" in row.get("actor", ""), f"{sid}: attribution must remain unresolved")
        require("ATTRIBUTION_UNRESOLVED" in row.get("verification", ""), f"{sid}: verification must preserve unresolved strike attribution")


def validate_current_overlay():
    manifest = load("data/current-update-20260826/manifest.json")
    events_doc = load("data/current-update-20260826/events.json")
    timeline_doc = load("data/current-update-20260826/timeline.json")
    sources_doc = load("data/current-update-20260826/sources.json")
    map_links_doc = load("data/integration-v1.2/map-links.json")

    events = events_doc.get("events", [])
    timeline = timeline_doc.get("records", [])
    sources = sources_doc.get("sources", [])
    counts = manifest.get("counts", {})

    require(manifest.get("layer") == "APPEND_ONLY_CURRENT_OVERLAY", "Aug26 overlay must remain append-only")
    require(manifest.get("depends_on", {}).get("current_chronology_records") == 117, "Aug26 prior chronology must be 117")
    require(counts.get("overlay_events") == 4, "Aug26 manifest event count must be 4")
    require(counts.get("overlay_timeline_records") == 4, "Aug26 manifest timeline count must be 4")
    require(counts.get("overlay_sources") == 5, "Aug26 manifest source count must be 5")
    require(counts.get("current_chronology_records") == 121, "Aug26 current chronology must be 121")
    require(len(events) == 4, f"Aug26 events file contains {len(events)} records, expected 4")
    require(len(timeline) == 4, f"Aug26 timeline contains {len(timeline)} records, expected 4")
    require(len(sources) == 5, f"Aug26 sources file contains {len(sources)} records, expected 5")

    source_by_id = {}
    for source in sources:
        sid = source.get("source_id")
        url = source.get("url") or ""
        require(sid and sid not in source_by_id, f"Missing/duplicate Aug26 source id: {sid}")
        require(sid == canonical_source_id(url), f"{sid}: source id does not match canonical SHA-1 URL rule")
        source_by_id[sid] = source

    event_ids = [row.get("event_id") for row in events]
    require(len(event_ids) == len(set(event_ids)), "Duplicate Aug26 event id")
    timeline_ids = [row.get("event_id") for row in timeline]
    require(set(event_ids) == set(timeline_ids), "Aug26 event/timeline id sets differ")

    known_map_refs = {row.get("map_ref") for row in map_links_doc.get("links", [])}
    for event in events:
        for ref in event.get("source_refs") or []:
            sid = ref if isinstance(ref, str) else ref.get("source_id")
            require(sid in source_by_id, f"{event.get('event_id')}: unresolved local source ref {sid}")
        for map_ref in event.get("map_refs") or []:
            require(map_ref in known_map_refs, f"{event.get('event_id')}: unresolved map ref {map_ref}")

    by_id = {row["event_id"]: row for row in events}
    require(by_id["CUR-20260825-009"].get("event_date") == "2026-08-25", "Kpler traffic record must retain Aug25 occurrence date")
    require(by_id["CUR-20260825-009"].get("first_reported") == "2026-08-26", "Kpler traffic record must preserve Aug26 first-report date")
    require("final" not in (by_id["CUR-20260826-001"].get("verified_effect") or "").lower() or "does not" in (by_id["CUR-20260826-001"].get("verified_effect") or "").lower(), "Hormuz finality must not be silently verified")


def validate_loader_chain():
    aug26 = (ROOT / "js/current-update-20260826.js").read_text(encoding="utf-8")
    late25 = (ROOT / "js/current-update-20260825-late.js").read_text(encoding="utf-8")
    require("const EXPECTED_PRIOR = 117;" in aug26, "Aug26 loader prior count mismatch")
    require("const EXPECTED_OVERLAY = 4;" in aug26, "Aug26 loader overlay count mismatch")
    require("const EXPECTED_CURRENT = 121;" in aug26, "Aug26 loader current count mismatch")
    require("loadAug26Update" in late25 and "current-update-20260826.js" in late25, "Late Aug25 loader does not chain Aug26 overlay")


def main():
    validate_strikes()
    validate_current_overlay()
    validate_loader_chain()
    print("Aug. 26 strike/map enrichment validation: PASS")


if __name__ == "__main__":
    main()
