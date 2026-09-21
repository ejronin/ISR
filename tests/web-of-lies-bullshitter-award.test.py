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
assert award["qualifying_incident_ids"] == [f"E-{i}" for i in range(1, 7)]
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
assert set(mirrored_award["qualifying_incident_ids"]) == {
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

assert award_rule["unsupported_assertion_after_documented_search_counts"] is True
assert award_rule["self_sealing_evasion_counts"] is True
assert award_rule["incomplete_or_inaccessible_evidence_counts"] is False

unsupported_without_review = event(
    23, event_type="UNSUPPORTED_FACTUAL_ASSERTION"
)
assert wol.bullshit_qualifying_event(unsupported_without_review, governance) is False

unsupported_with_review = event(
    24, event_type="UNSUPPORTED_FACTUAL_ASSERTION"
)
unsupported_with_review["evidentiary_support_review"] = {
    "status": "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH",
    "search_scope": "source's cited material plus public primary/secondary evidence",
    "checked_at": "2026-09-21T15:30:00-04:00",
    "claimant_basis_status": "NONE_PROVIDED",
}
assert wol.bullshit_qualifying_event(unsupported_with_review, governance) is True

self_sealing = event(
    25, event_type="EVIDENTIARY_EVASION"
)
self_sealing["evidentiary_support_review"] = {
    "status": "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH",
    "search_scope": "original assertion and follow-on factual escape-hatch claim",
    "checked_at": "2026-09-21T15:30:00-04:00",
    "claimant_basis_status": "SELF_SEALING",
}
assert wol.bullshit_qualifying_event(self_sealing, governance) is True

genuinely_unresolved = event(
    26, event_type="UNSUPPORTED_INFERENTIAL_ASSERTION"
)
genuinely_unresolved["evidentiary_support_review"] = {
    "status": "EVIDENCE_INCOMPLETE_OR_INACCESSIBLE",
    "search_scope": "available public evidence",
    "checked_at": "2026-09-21T15:30:00-04:00",
    "claimant_basis_status": "ASSERTION_ONLY",
}
assert wol.bullshit_qualifying_event(genuinely_unresolved, governance) is False

def native_incident(n: int) -> dict:
    return {
        "incident_id": f"N-{n}",
        "source_id": "SRC-NATIVE",
        "event_type": "UNSUPPORTED_FACTUAL_ASSERTION",
        "assertion_kind": "FACTUAL_ASSERTION",
        "published_at": f"2026-09-{10+n:02d}",
        "statement_identity": f"unsupported assertion {n}",
        "public_receipts": [{"receipt_id": f"R-N-{n}", "surface": "YOUTUBE"}],
        "evidentiary_support_review": {
            "status": "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH",
            "search_scope": "claimant basis plus public corroborating evidence",
            "checked_at": "2026-09-21T15:30:00-04:00",
            "claimant_basis_status": "DOES_NOT_SUPPORT_ASSERTION",
        },
    }


native_award = wol.bullshit_award_for_events(
    [native_incident(i) for i in range(1, 7)],
    governance,
    as_of="2026-09-21T15:30:00-04:00",
)
assert native_award is not None
assert native_award["qualifying_incident_count"] == 6
assert native_award["qualifying_incident_ids"] == [f"N-{i}" for i in range(1, 7)]

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
