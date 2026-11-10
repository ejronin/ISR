#!/usr/bin/env python3
"""Reconcile scheduled ROOK collection windows against recoverable artifacts.

A selective canonical cutoff never certifies a missing full 12-hour collection.
"""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import rook_intake_status as intake

ET = ZoneInfo("America/New_York")
START = date(2026, 9, 27)
REVIEW_END = date(2026, 11, 9)
TOLERANCE = timedelta(minutes=20)


def build(report: dict, through: date = REVIEW_END, as_of: datetime | None = None) -> dict:
    clock = (as_of or datetime.now(timezone.utc)).astimezone(ET)
    completed = report.get("completed_sweeps") or []
    partial = report.get("partial_collections") or []
    rows = []
    day = START
    while day <= through:
        for hour in (0, 12):
            endpoint = datetime.combine(day, time(hour), tzinfo=ET)
            if endpoint > clock:
                continue
            complete = [r for r in completed if abs(datetime.fromisoformat(r["window_end"]) - endpoint) <= TOLERANCE]
            incomplete = [r for r in partial if abs(datetime.fromisoformat(r["window_end"]) - endpoint) <= TOLERANCE]
            if len(complete) > 1:
                raise ValueError(f"multiple completed sweeps for {endpoint.isoformat()}")
            if complete:
                row = complete[0]
                status = "COMPLETED_CONSUMED" if row["consumed"] else "COMPLETED_UNCONSUMED"
                paths = [row["path"]]
            elif incomplete:
                status, paths = "INCOMPLETE_COLLECTION", [r["path"] for r in incomplete]
            else:
                status, paths = "NO_RECOVERABLE_FULL_SWEEP", []
            rows.append({"scheduled_end": endpoint.isoformat(), "status": status, "artifact_paths": paths,
                         "source_status": "RECORDED_FULL_SWEEP" if complete else
                                          "PARTIAL_RECOVERY" if incomplete else "NO_COMPLETED_ARTIFACT"})
        day += timedelta(days=1)
    totals = {name: sum(row["status"] == name for row in rows) for name in (
        "COMPLETED_CONSUMED", "COMPLETED_UNCONSUMED", "INCOMPLETE_COLLECTION", "NO_RECOVERABLE_FULL_SWEEP"
    )}
    return {
        "schema_version": "1.0",
        "artifact_role": "ROOK_SCHEDULED_COLLECTION_COVERAGE_MATRIX",
        "as_of": clock.isoformat(),
        "window_start": START.isoformat(),
        "window_end": through.isoformat(),
        "canonical_evidence_cutoff": report["latest_accepted_canonical_evidence_cutoff"],
        "window_count": len(rows),
        "totals": totals,
        "scope": "Full midnight/noon collection coverage. Selective source-accepted evidence cannot close absent 12-hour runs.",
        "windows": rows
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--as-of", default="2026-11-09T23:59:00-05:00")
    parser.add_argument("--output", default="")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    clock = intake.parse_timestamp(args.as_of, "--as-of")
    report = intake.validate_repository(as_of=clock)
    if not report["valid"]:
        raise SystemExit("intake validation failed: " + "; ".join(report["errors"]))
    matrix = build(report, as_of=clock)
    assert sum(matrix["totals"].values()) == matrix["window_count"]
    text = json.dumps(matrix, sort_keys=True, indent=2) + "\n"
    if args.output:
        path = Path(args.output)
        if args.check:
            if not path.is_file() or path.read_text(encoding="utf-8") != text:
                raise SystemExit(f"collection matrix differs: {path}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
    print(json.dumps({"as_of": matrix["as_of"], "window_count": matrix["window_count"],
                      "totals": matrix["totals"]}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
