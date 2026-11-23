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


def is_qualified_completed_sweep(completion: object) -> bool:
    """A file with a scheduled name is not proof of completed ROOK collection."""
    if not isinstance(completion, dict):
        return False
    status = str(completion.get("status") or "").upper()
    if not status.startswith("COMPLETE"):
        return False
    for field in (
        "full_theater_coverage_complete",
        "prior_drawer_reconciliation_complete",
        "validator_recognized_completed_unconsumed_sweep",
    ):
        if completion.get(field) is False:
            return False
    return (
        completion.get("canonical_or_public_artifacts_mutated") is False
        and completion.get("accepted_packet_bytes_or_hashes_mutated") is False
    )


def expected_window_end(local: datetime) -> datetime:
    """Select the last fully elapsed 12-hour boundary, including for late cron."""
    result = local.replace(hour=12 if local.hour >= 12 else 0, minute=0, second=0, microsecond=0)
    # Cron normally runs at :20. At/near the boundary the current sweep has
    # not had time to finish, so inspect the previous 12-hour window.
    if local - result < timedelta(minutes=10):
        result -= timedelta(hours=12)
    return result


def main() -> int:
    now = datetime.now(timezone.utc)
    local = now.astimezone(LOCAL)
    # GitHub Actions schedule delivery can be hours late. It must not allow a
    # false green by skipping an audit simply because the job started late.
    # Compute the latest elapsed local 00:00 / 12:00 boundary instead.
    expected_end = expected_window_end(local)
    off_cadence = local.hour not in (0, 12)
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
                sweeps.append((parse(end), path.name, data.get("completion") or {}))
        except (json.JSONDecodeError, ValueError, TypeError) as exc:
            invalid.append(f"{path.name}: {exc}")

    # Observe upstream completion separately from the accepted canonical
    # cutoff. A selectively accepted packet cannot repair an absent ROOK sweep.
    latest = max(sweeps, default=None, key=lambda item: item[0])
    # A file with a matching time can be INCOMPLETE. Never equate existence
    # with a certified, fully reconciled collection window.
    expected_candidates = [
        (path, completion)
        for end, path, completion in sweeps
        if abs((end - expected_end.astimezone(timezone.utc)).total_seconds()) <= 120
    ]
    expected_covered = bool(expected_candidates)
    expected_qualified = any(is_qualified_completed_sweep(completion) for _, completion in expected_candidates)
    stale_canonical = age_hours > 36
    failed = not expected_covered or not expected_qualified or stale_canonical
    status = "FAILED" if failed else "OK"
    lines = [
        f"### ROOK / ISR 12-hour freshness audit: {local.strftime('%Y-%m-%d %H:%M %Z')}",
        "",
        f"- Audit status: **{status}**",
        f"- Expected scheduled sweep: `{window_start.isoformat()}` to `{expected_end.isoformat()}`",
        f"- Expected window file exists on main: **{'YES' if expected_covered else 'NO'}**",
        f"- Expected window collection is qualified complete: **{'YES' if expected_qualified else 'NO'}**",
        f"- Scheduled run started outside expected clock hour: **{'YES' if off_cadence else 'NO'}** (audited anyway)",
        f"- Latest ROOK locker (completion not implied): `{latest[1]}` ({latest[0].isoformat()})" if latest else "- Latest ROOK locker: **none**",
        f"- Current accepted canonical evidence cutoff: `{cutoff.isoformat()}` ({age_hours:.1f} hours old)",
        f"- Exact-head deployment status: not tested by this monitor; see Pages Actions",
        f"- Invalid sweep artifact count: {len(invalid)}",
        f"- Expected window file(s): {', '.join(path for path, _ in expected_candidates) or 'NONE'}",
        "",
        "Incomplete / unvalidated windows and late scheduled executions are FAILURES, not successful checks.",
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
