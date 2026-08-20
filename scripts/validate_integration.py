#!/usr/bin/env python3
"""Repository-level checks for the historical-ledger v1.2 integration."""
from __future__ import annotations

from pathlib import Path
import json
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "data" / "integration-v1.2"


def load(name: str):
    return json.loads((PACKAGE / name).read_text(encoding="utf-8"))


def check(condition: bool, message: str, failures: list[str]) -> None:
    if not condition:
        failures.append(message)


def main() -> int:
    failures: list[str] = []

    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    package_check = subprocess.run(
        [sys.executable, str(PACKAGE / "validate-package.py")],
        cwd=PACKAGE,
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if package_check.returncode:
        failures.append(
            "authoritative package validator failed:\n"
            + (package_check.stdout + package_check.stderr).strip()
        )

    events = load("events.json")["events"]
    timeline = load("timeline.json")["records"]
    facilities = load("facilities.json")
    map_links = load("map-links.json")["links"]
    movements = load("movements.json")["movements"]
    agreements = load("agreements.json")["records"]
    casualties = load("casualties.json")
    losses = load("material-losses.json")["records"]
    munitions = load("munitions-expenditure.json")["records"]
    cost = load("cost-model.json")
    sources = load("sources.json")["sources"]
    revisions = load("revision-history.json")["revisions"]
    unresolved = load("unresolved.json")["items"]

    check(len(events) == 83, "canonical event count must be 83", failures)
    check(len(timeline) == 83, "timeline index count must be 83", failures)
    check(sum(x["record_class"] == "PRE-WAR CONTEXT" for x in events) == 15,
          "pre-war event count must be 15", failures)
    check(sum(x["record_class"] == "WARTIME_EVENT" for x in events) == 68,
          "wartime event count must be 68", failures)
    opening = next(x for x in events if x["event_id"] == "EV-20260228-001")
    check(opening["event_time"] is None and opening["event_time_precision"] == "DATE_ONLY",
          "opening event must remain date-only", failures)

    check(len({x["event_id"] for x in events}) == len(events), "duplicate event IDs", failures)
    check(len({x["source_id"] for x in sources}) == len(sources), "duplicate source IDs", failures)
    check(sum(x["facility_id"] == "US-ALUDEID" for x in facilities["facilities"]) == 1,
          "Al Udeid must have one canonical facility identity", failures)
    check(sum(x["map_ref"] == "MAP-US-ALUDEID" for x in map_links) == 1,
          "Al Udeid must have one stable map identity", failures)
    check(any(x.get("display_label") == "PRE-COORDINATED DRAWDOWN — NOT A RETREAT" for x in movements),
          "required Ain al-Asad drawdown display label missing", failures)
    check(all("RETREAT" not in x.get("classification", "") or "NOT_RETREAT" in x.get("classification", "")
              for x in movements), "movement classification promotes an unsupported retreat", failures)
    check(len(agreements) == 8, "agreement count must be 8", failures)
    check(casualties["leadership_records"] == [], "leadership gap must remain unitemized", failures)
    check(all(x.get("compare_only_with_same_category") is True for x in casualties["records"]),
          "casualty records must require like-for-like comparison", failures)
    check(len(losses) == 12 and len(munitions) == 9,
          "material-loss / munitions record counts changed", failures)
    check(cost["iran_aligned"]["current_total_status"] == "UNPRICED",
          "Iran military material cost must remain UNPRICED", failures)
    check(len(revisions) == 23 and len(unresolved) == 19,
          "revision or unresolved inventory changed", failures)

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "js" / "app.js").read_text(encoding="utf-8")
    check('id="historical"' in html and 'data-tab="historical"' in html,
          "historical model panel/tab is not wired", failures)
    check("timelineMode" in app and "known-by" in app and "LEDGER.events.events" in app,
          "AS OF / KNOWN BY canonical timeline is not wired", failures)
    check("Historical ledger entities" in app and "allMarkers[link.map_ref]" in app,
          "stable map/timeline reverse linkage is not wired", failures)
    check("coalitionComposite" not in app and "+3.0" not in html and "-1.25" not in html,
          "deprecated composite war score remains in primary display", failures)
    check("senior leaders individually identified killed" not in html.lower(),
          "legacy leadership total remains presented as canonical", failures)
    check("≥$170B" not in html, "wider economic estimate remains in military-cost arithmetic", failures)

    if failures:
        for failure in failures:
            print("FAIL:", failure)
        print(f"Historical integration validation failed: {len(failures)} issue(s)")
        return 1

    print(package_check.stdout.strip())
    print(
        "Historical integration validation passed: canonical counts, precision, identity, "
        "force posture, agreements, like-for-like accounting, source lineage, UI wiring, "
        "revisions and unresolved gaps."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
