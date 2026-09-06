#!/usr/bin/env python3
"""Final Gate 3 canonical builder.

The underlying chronology may contain prewar context. Daily war coverage is a
separate derived series and is deliberately bounded to conflict Day 1 through
the frozen Gate 2 evidence cutoff.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_canonical_current_state_v2_hardened as hardened

OUT = "data/canonical-current-state-v2.json"
CONFLICT_DAY_1 = date(2026, 2, 28)


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def war_daily_coverage(state: dict[str, Any]) -> list[dict[str, Any]]:
    by_date: dict[str, list[str]] = {}
    for item in state.get("chronology") or []:
        event_date = str((item.get("event") or {}).get("event_date") or "")
        if event_date:
            by_date.setdefault(event_date, []).append(item["event_id"])
    cutoff = datetime.fromisoformat(state["release"]["gate2_evidence_cutoff"]).date()
    cursor = CONFLICT_DAY_1
    rows: list[dict[str, Any]] = []
    while cursor <= cutoff:
        day = cursor.isoformat()
        ids = sorted(by_date.get(day, []))
        rows.append({
            "date": day,
            "status": "EVENTS_RECORDED" if ids else "NO_CANONICAL_EVENT_RECORDED",
            "canonical_event_ids": ids,
            "canonical_event_count": len(ids),
            "derived": True,
            "coverage_scope": "CONFLICT_DAY_1_THROUGH_GATE2_CUTOFF",
        })
        cursor += timedelta(days=1)
    return rows


def build_state(root: Path = ROOT) -> dict[str, Any]:
    state = hardened.build_state(Path(root).resolve())
    rows = war_daily_coverage(state)
    state["daily_coverage"] = rows
    state.setdefault("counts", {})["gate3_daily_coverage_days"] = len(rows)
    state.setdefault("integrity", {}).update({
        "war_daily_coverage_bounded_to_conflict": True,
        "war_daily_coverage_starts_day1": bool(rows and rows[0]["date"] == "2026-02-28"),
        "war_daily_coverage_reaches_gate2_cutoff": bool(rows and rows[-1]["date"] == "2026-09-05"),
    })
    prior_identity = state["release"]["canonical_state_identity_v2"]
    identity_material = {
        "prior_identity": prior_identity,
        "coverage_start": rows[0]["date"] if rows else None,
        "coverage_end": rows[-1]["date"] if rows else None,
        "coverage_days": len(rows),
    }
    state["release"]["canonical_state_identity_v2_hardening"] = prior_identity
    state["release"]["canonical_state_identity_v2"] = "canonical-current-v2-" + digest(canonical_bytes(identity_material))[:16]
    return state


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default=OUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    serialized = canonical_bytes(build_state(root))
    if args.check:
        if not output.is_file() or output.read_bytes() != serialized:
            raise SystemExit(f"FAIL stale {output}")
        print("gate3 final canonical: PASS")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(f"gate3 final canonical: wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
