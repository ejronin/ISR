#!/usr/bin/env python3
"""Regression coverage for the deterministic rolling Bullshitter award."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_web_of_lies as wol  # noqa: E402

governance = json.loads((ROOT / wol.GOVERNANCE).read_text(encoding="utf-8"))
award_rule = governance["source_awards"]["BULLSHITTER"]

assert award_rule["public_label"] == "Bullshitter"
assert award_rule["window_days"] == 30
assert award_rule["minimum_qualifying_incidents"] == 6
assert award_rule["manual_assignment_allowed"] is False
assert "source_awards" in wol.DISALLOWED_MANUAL_RANK_FIELDS


def event(
    n: int,
    *,
    source_id: str = "SRC-A",
    event_type: str = "FALSE_OR_MISLEADING_CONNECTION",
    assertion_kind: str = "FACTUAL_ASSERTION",
    group_id: str | None = None,
) -> dict:
    row = {
        "event_id": f"E-{n}",
        "source_id": source_id,
        "event_type": event_type,
        "assertion_kind": assertion_kind,
        "behavior_findings": [],
    }
    if group_id is not None:
        row["information_event_group_id"] = group_id
    return row


# >5 means exactly six is the first qualifying state.
five = [event(i) for i in range(1, 6)]
assert wol.bullshit_award_for_events(
    five, governance, as_of="2026-09-21T15:30:00-04:00"
) is None

six = [event(i) for i in range(1, 7)]
award = wol.bullshit_award_for_events(
    six, governance, as_of="2026-09-21T15:30:00-04:00"
)
assert award is not None
assert award["award_code"] == "BULLSHITTER"
assert award["public_label"] == "Bullshitter"
assert award["qualifying_incident_count"] == 6
assert award["qualifying_event_ids"] == [f"E-{i}" for i in range(1, 7)]
assert "6 qualifying bullshit incidents" in award["public_verdict"]

# Mirrors/cross-platform captures of one information event count once.
mirrored = [event(i) for i in range(1, 6)]
mirrored += [
    event(6, group_id="PUB-6"),
    event(7, group_id="PUB-6"),
]
mirrored_award = wol.bullshit_award_for_events(
    mirrored, governance, as_of="2026-09-21T15:30:00-04:00"
)
assert mirrored_award is not None
assert mirrored_award["qualifying_incident_count"] == 6
assert set(mirrored_award["qualifying_event_ids"]) == {
    "E-1", "E-2", "E-3", "E-4", "E-5", "E-6"
}

# Accurate carrier reporting, opinion, and prediction failure alone are not
# qualifying bullshit incidents.
nonqualifying = [
    event(20, event_type="REPORTS", assertion_kind="ATTRIBUTED_REPORT"),
    event(21, assertion_kind="OPINION"),
    event(22, event_type="PREDICTION_FAILURE", assertion_kind="PREDICTION"),
]
assert not any(
    wol.bullshit_qualifying_event(row, governance)
    for row in nonqualifying
)

# A source can qualify through repeated adverse narrative mutation / repetition
# after correction, not only the base false/misleading event type.
mixed = [
    event(30, event_type="NARRATIVE_MUTATION"),
    event(31, event_type="NARRATIVE_MUTATION"),
    event(32, event_type="REPEAT_AFTER_CORRECTION"),
    event(33),
    event(34),
    event(35),
]
mixed_award = wol.bullshit_award_for_events(
    mixed, governance, as_of="2026-09-21T15:30:00-04:00"
)
assert mixed_award is not None
assert mixed_award["qualifying_incident_count"] == 6

profiles = [
    {"source_id": "SRC-A", "display_name": "A"},
    {"source_id": "SRC-B", "display_name": "B"},
]
attached = {
    row["source_id"]: row
    for row in wol.attach_source_awards(
        profiles,
        six + [event(99, source_id="SRC-B", event_type="REPORTS")],
        governance,
        as_of="2026-09-21T15:30:00-04:00",
    )
}
assert attached["SRC-A"]["source_awards"][0]["award_code"] == "BULLSHITTER"
assert attached["SRC-B"]["source_awards"] == []

print("web-of-lies Bullshitter award: PASS threshold=6 window=30d deterministic=1")
