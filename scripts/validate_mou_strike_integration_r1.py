#!/usr/bin/env python3
"""Validate public MOU logic, cutoff semantics, and canonical reconciliation strike integration."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECON = ROOT / "data" / "wiki-map-reconciliation-20260826"


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate_reconciliation_data_contract() -> None:
    strikes = load("data/wiki-map-reconciliation-20260826/strikes.json").get("strikes", [])
    events = load("data/wiki-map-reconciliation-20260826/events.json").get("events", [])
    audit = load("data/wiki-map-reconciliation-20260826/coverage-audit.json")
    losses = load("data/wiki-map-reconciliation-20260826/material-losses.json").get("records", [])

    require(len(strikes) == 81, f"expected 81 reconciliation strikes, found {len(strikes)}")
    require(len(events) == 81, f"expected 81 reconciliation events, found {len(events)}")
    require(len(audit.get("accepted_or_corrected") or []) == 81, "accepted/corrected accounting must remain 81")
    require(len(audit.get("deduped_rejected_or_unresolved") or []) == 18, "rejected/unresolved accounting must remain 18")
    require(len(losses) == 40, "maritime material-loss layer must remain 40 records")

    strike_ids = {row.get("id") for row in strikes}
    require(None not in strike_ids and len(strike_ids) == 81, "reconciliation strike IDs missing or duplicated")
    for row in strikes:
        lat, lon = row.get("lat"), row.get("lon")
        require(isinstance(lat, (int, float)) and -90 <= lat <= 90, f"{row.get('id')}: invalid latitude")
        require(isinstance(lon, (int, float)) and -180 <= lon <= 180, f"{row.get('id')}: invalid longitude")

    linked = 0
    for event in events:
        refs = list(event.get("map_refs") or []) + list(event.get("facility_refs") or [])
        require(any(ref in strike_ids for ref in refs), f"{event.get('event_id')}: no reconciliation strike/map ref")
        linked += 1
    require(linked == 81, "all 81 reconciliation timeline records must have a resolvable strike/map ref")


def validate_canonical_runtime_wiring() -> None:
    app = text("js/app.js")
    recon = text("js/wiki-map-reconciliation-20260826.js")
    temporal = text("js/temporal.js")
    navigation = text("js/navigation.js")

    for token in (
        "window.registerAtlasMapMarker",
        "window.getAtlasMapMarker",
        "window.registerAtlasStrikeRecords",
        "window.refreshAtlasStrikeEffects",
        "function installStrikeMarker",
        "allMarkers[id]",
        "m.openPopup()",
        "groups[STRIKE_LAYER_KEY]?.addTo(map)",
    ):
        require(token in app, f"canonical map/strike API contract missing: {token}")

    require("renderStrikeEffects(document.getElementById('strikeSearch')?.value||'')" in app,
            "Campaigns & Strikes must refresh without requiring a search-input event")
    require("['Strike effects','Attacks / strikes']" in app,
            "public layer label must be Attacks / strikes")
    require("strikes:['Strike effects']" in app,
            "Campaigns & Strikes view must default the attack/strike layer on")
    require("timelineContext==='strike'" in app and "groups[STRIKE_LAYER_KEY]?.addTo(map)" in app,
            "Timeline STRIKES context must activate the attack/strike layer")
    require("A mapped attack is not by itself verified damage." in app,
            "attack marker must explicitly preserve attack != verified damage")
    require("Tracked separately in the material-loss ledger" in app,
            "attack marker must keep durable material loss separate")

    for token in (
        "window.registerAtlasStrikeRecords",
        "result.eligible!==EXPECTED.strikes",
        "result.registered!==EXPECTED.strikes",
        "validateTimelineMapLinks",
        "window.getAtlasMapMarker",
        "map_linked_timeline_records",
        "registered_strike_markers",
        "temporal_contexts:[...new Set([...(row.temporal_contexts||[]),'strike'])]",
        "window.renderAtlasTimeline",
        "window.refreshAtlasTimelineMap",
    ):
        require(token in recon, f"reconciliation canonical-integration contract missing: {token}")
    require("new Map" not in recon, "reconciliation loader must not maintain a private marker Map")
    require("findStrikeLayer" not in recon and "installPan" not in recon,
            "legacy private strike-layer/pan shims must be removed")
    require("event?.temporal_contexts" in temporal or "event.temporal_contexts" in temporal,
            "temporal context matcher must honor explicit reconciliation strike context")
    require("Open Campaigns & strikes" in navigation,
            "Overview must expose a discoverable route into Campaigns & Strikes")


def validate_cutoffs() -> None:
    state = text("js/state.js")
    app = text("js/app.js")
    recon = text("js/wiki-map-reconciliation-20260826.js")
    manifest = load("data/integration-v1.2/manifest.json")

    require("timeCutoff: '2026-08-26'" in state, "default timeline cutoff must be 2026-08-26")
    require("CURRENT OSINT CUTOFF" in app, "current OSINT cutoff label missing")
    require("HISTORICAL RECORD CUTOFF" in app, "historical record cutoff label missing")
    require("ASSESSMENT LAST RE-ADJUDICATED" in app, "assessment re-adjudication cutoff label missing")
    require("2026-08-20 15:59 ET" in app,
            "Aug. 20 outcome-synthesis re-adjudication cutoff must remain explicit")
    require("2026-08-22 10:54 ET" in app or "2026-08-22 10:54 ET" in text("js/endgame-public-view-r1.js"),
            "MOU/Hormuz assessment cutoff must remain explicit")
    require("2026-08-26 16:30 ET" in recon,
            "current reconciliation cutoff must resolve to Aug. 26 16:30 ET")
    note = manifest.get("aug22_update_note", "")
    require("Outcome synthesis remains reviewed through Aug. 20 15:59 ET" in note,
            "immutable manifest no longer supports the displayed outcome-assessment cutoff")
    require("MOU/Hormuz analytical prose remains reviewed through Aug. 22 10:54 ET" in note,
            "immutable manifest no longer supports the displayed MOU/Hormuz cutoff")


def validate_mou_presentation_logic() -> None:
    public = text("js/endgame-public-view-r1.js")
    plain = text("js/endgame-ux-plain-language-r1.js")
    angles = text("js/endgame-three-angles-20260825-r3.js")
    current = text("js/endgame-current-20260825-r2.js")
    hormuz = load("data/hormuz-strategic-v3.json")
    corrections = load("data/endgame-objective-score-corrections-20260825-r4.json")

    for token in (
        "OBTAINED IN THE INTERIM DEAL",
        "DEFERRED TO FINAL NEGOTIATIONS — NOT YET WON OR LOST",
        "EXPLICITLY NOT INCLUDED / REJECTED",
        "IMPLEMENTATION AFTER SIGNATURE",
        "PROMISED BUT NEVER IMPLEMENTED",
        "LATER REVERSED",
        "Nuclear sequence · before → interim → deferred → movement → current",
        "Where the signed deal landed · analyst pole comparison",
        "Iran preferred endpoint",
        "U.S. preferred endpoint",
        "No numeric movement score is assigned here",
    ):
        require(token in public, f"MOU public sequence/pole distinction missing: {token}")

    require("Deferred final-deal questions are not relabeled as “did not get.”" in public,
            "deferred matters must not be presented as simple failure")
    require("Washington’s agreement to keep negotiating an issue it was already asking to negotiate is not a Washington walkback." in public,
            "agreeing to Washington's prior request must not be presented as a U.S. retreat")
    require("U.S. nuclear objective remains UNSCORED / NOT YET ADJUDICABLE" in public,
            "final nuclear end state must remain unresolved/unscored")
    require("starting position" not in plain.lower(),
            "plain-language bargaining bar still implies analyst poles are actual starting positions")
    require("capitulation from the prior position" not in angles.lower(),
            "Endgame still exposes overclaimed capitulation wording")
    require("substantive capitulation" not in angles.lower(),
            "Endgame still labels negotiation participation as substantive capitulation")
    require("moved off" in angles.lower() or "relaxed" in angles.lower(),
            "Endgame must describe the supported finding as movement from/relaxation of a prior precondition")
    require("substantive acceptance" in angles.lower() or "substantive" in current.lower(),
            "presentation must distinguish negotiation participation from substantive acceptance")

    basis = str(hormuz.get("method") or hormuz.get("method_note") or hormuz)
    require("pole" in basis.lower(), "Hormuz source model must still identify analyst negotiating poles")

    nuclear = next((row for row in corrections.get("us_overrides", []) if row.get("match") == "Deny Iran a nuclear weapon"), None)
    require(nuclear is not None, "U.S. nuclear objective override missing")
    require(nuclear.get("score") is None, "U.S. nuclear objective must remain unscored")
    require("UNSCORED" in str(nuclear.get("status", "")).upper(), "U.S. nuclear objective status must remain UNSCORED")


def validate_scoreboard_and_messaging() -> None:
    scoreboard = text("js/endgame-objective-scoreboard-20260825-r2.js")
    messaging = text("js/iran-messaging-r1.js")
    navigation = text("js/navigation.js")

    require("Secondary 0–4 convenience score" in scoreboard,
            "numeric objective score must be visually/semantically secondary")
    require("unweighted" in scoreboard.lower() and "victory" in scoreboard.lower(),
            "overall objective tally must remain labeled unweighted and not a victory percentage")

    for token in (
        "IRAN MESSAGING",
        "ASSERTIVE / LEGITIMIZING MESSAGE",
        "OPTIONALITY-PRESERVING / NEGOTIATING MESSAGE",
        "OBSERVED REALITY",
        "PRACTICAL RECONCILIATION",
        "WHAT CHANGED LATER",
        "audience segmentation",
        "deliberate ambiguity",
        "bureaucratic",
        "deception",
        "genuine policy evolution",
    ):
        require(token.lower() in messaging.lower(), f"Iran Messaging public structure missing: {token}")
    require("propaganda blacklist" in messaging.lower(), "Iran Messaging must explicitly remain separate from a propaganda blacklist")
    require("iran-messaging-r1.js" in navigation and "iran-messaging-r1.css" in navigation,
            "Iran Messaging module is not wired into public navigation")


def main() -> int:
    validate_reconciliation_data_contract()
    validate_canonical_runtime_wiring()
    validate_cutoffs()
    validate_mou_presentation_logic()
    validate_scoreboard_and_messaging()
    print(
        "MOU / strike integration R1: PASS — 81/81 reconciliation attack markers are eligible for canonical registration; "
        "81/81 reconciliation timeline records have map refs; deferred/interim/final MOU states, pole-vs-movement semantics, "
        "cutoff separation, score hierarchy and Iran Messaging contracts are enforced"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
