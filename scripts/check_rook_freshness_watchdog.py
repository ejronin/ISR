#!/usr/bin/env python3
"""Fail-visible 12-hour upstream evidence freshness check; does not collect or adjudicate."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/canonical-ledger/manifest-v2.json"
EVIDENCE = ROOT / "data/evidence-integration"
OUT = Path("rook-freshness-watchdog-report.md")
LOCAL = ZoneInfo("America/New_York")


def parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc)


def main() -> int:
    now = datetime.now(timezone.utc)
    local = now.astimezone(LOCAL)
    # The UTC schedule covers both EDT and EST; only select the actual local
    # midnight/noon check, never treat an off-hour trigger as a missed sweep.
    if local.hour not in (0, 12) and "--force" not in sys.argv:
        print(f"SKIP: off-cadence UTC cron, local={local.isoformat()}")
        return 0

    expected_end = local.replace(hour=0 if local.hour < 12 else 12, minute=0, second=0, microsecond=0)
    window_start = expected_end - timedelta(hours=12)
    report = json.loads(MANIFEST.read_text(encoding="utf-8"))
    cutoff = parse(report["current_evidence_cutoff"])
    age_hours = (now - cutoff).total_seconds() / 3600
    sweeps = []
    invalid = []
    for path in sorted(EVIDENCE.glob("rook-evidence-locker-sweep-*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if data.get("artifact_role") != "ROOK_FULL_EVIDENCE_LOCKER_SWEEP":
                continue
            if data.get("authority") != "ROOK_UPSTREAM_COLLECTION":
                continue
            scope = data.get("scope") or {}
            end = scope.get("window_end")
            if end:
                sweeps.append((parse(end), path.name))
        except (json.JSONDecodeError, ValueError, TypeError) as exc:
            invalid.append(f"{path.name}: {exc}")

    # Observe upstream completion separately from the accepted canonical
    # cutoff. A selectively accepted packet cannot repair an absent ROOK sweep.
    latest = max(sweeps, default=None)
    latest_age = (now - latest[0]).total_seconds() / 3600 if latest else None
    # Allow collection overrun: sweep end is normally the scheduled 00/12
    # cutoff and this watchdog runs only ~20 minutes after.
    expected_covered = any(abs((end - expected_end.astimezone(timezone.utc)).total_seconds()) <= 120 for end, _ in sweeps)
    stale_canonical = age_hours > 36
    failed = not expected_covered or stale_canonical
    status = "FAILED" if failed else "OK"
    lines = [
        f"### ROOK / ISR 12-hour freshness audit: {local.strftime('%Y-%m-%d %H:%M %Z')}",
        "",
        f"- Audit status: **{status}**",
        f"- Expected scheduled sweep: \`{window_start.isoformat()}\` to \`{expected_end.isoformat()}\`",
        f"- Expected window found in durable main artifacts: **{'YES' if expected_covered else 'NO'}**",
        f"- Most recent completed sweep: \`{latest[1]}\` ({latest[0].isoformat()})" if latest else "- Most recent completed sweep: **none**",
        f"- Current accepted canonical evidence cutoff: \`{cutoff.isoformat()}\` ({age_hours:.1f} hours old)",
        f"- Exact-head deployment status: not tested by this monitor; see Pages Actions",
        f"- Invalid sweep artifact count: {len(invalid)}",
        "",
        "This watchdog cannot research, backfill, produce a completed sweep, adjudicate evidence, edit WOL/Lie Ledger, or publish a map. It detects and reports broken ingestion. Retain Issue #296 until the real 12-hour collection chain is repaired.",
        "",
    ]
    if invalid:
        lines += ["Invalid sweep inputs:", *[f"- {x}" for x in invalid], ""]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))
    summary = __import__("os").environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as h:
            h.write("\n".join(lines))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
