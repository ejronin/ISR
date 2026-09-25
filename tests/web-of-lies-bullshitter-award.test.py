#!/usr/bin/env python3
"""Regression coverage for the deterministic cumulative Bullshitter award."""
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
assert "window_days" not in award_rule
assert award_rule["qualification_semantics"] == "CUMULATIVE_DISTINCT_QUALIFYING_INCIDENTS"
assert award_rule["minimum_qualifying_incidents"] == 6
assert award_rule["manual_assignment_allowed"] is False
network_rule = award_rule["network_assisted_qualification"]
assert network_rule["enabled"] is True
assert network_rule["minimum_distinct_upstream_wol_nodes"] == 5
assert network_rule["minimum_qualifying_amplification_incidents"] == 6
assert network_rule["message_identity_required_for_award_counting"] is True
assert "source_awards" in wol.DISALLOWED_MANUAL_RANK_FIELDS


def event(
    n: int,
    *,
    source_id: str = "SRC-A",
    event_type: str = "FALSE_OR_MISLEADING_CONNECTION",
    assertion_kind: str = "FACTUAL_ASSERTION",
    group_id: str | None = None,
    published_at: str | None = "2026-09-15",
) -> dict:
    row = {
        "event_id": f"E-{n}",
        "source_id": source_id,
        "event_type": event_type,
        "assertion_kind": assertion_kind,
        "behavior_findings": [],
        "published_at": published_at,
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
assert award["qualification_route"] == "STANDARD_INCIDENT_COUNT"
assert award["qualification_scope"] == "CUMULATIVE"
assert award["qualifying_incident_count"] == 6
assert award["qualifying_incident_ids"] == [f"E-{i}" for i in range(1, 7)]
assert "6 cumulative qualifying bullshit incidents" in award["public_verdict"]
assert award["award_earned_at"] == "2026-09-15T00:00:00"
assert award["qualification_start"] == "2026-09-15T00:00:00"
assert award["qualification_end"] == "2026-09-15T00:00:00"

# Qualification is cumulative: six incidents earn the award regardless of how
# far apart they are within the active conflict corpus.
spread_out = [
    event(111, published_at="2026-01-01"),
    event(112, published_at="2026-02-05"),
    event(113, published_at="2026-03-12"),
    event(114, published_at="2026-04-18"),
    event(115, published_at="2026-05-24"),
    event(116, published_at="2026-06-30"),
]
spread_award = wol.bullshit_award_for_events(
    spread_out,
    governance,
    as_of="2026-09-21T15:30:00-04:00",
)
assert spread_award is not None
assert spread_award["qualification_scope"] == "CUMULATIVE"
assert spread_award["qualification_start"] == "2026-01-01T00:00:00"
assert spread_award["qualification_end"] == "2026-06-30T00:00:00"
assert spread_award["qualifying_incident_count"] == 6

# Undated conduct remains in the forensic record but cannot establish the
# chronological award-earned point until its date is recovered.
undated = [event(120 + i, published_at=None) for i in range(6)]
assert wol.bullshit_award_for_events(
    undated,
    governance,
    as_of="2026-09-21T15:30:00-04:00",
) is None

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

# Network-assisted route: six distinct downstream amplification publications
# from at least five independently awarded upstream WOL sources, cumulatively.
upstream_incidents = {
    "BS-1": {"U-1"},
    "BS-2": {"U-2"},
    "BS-3": {"U-3"},
    "BS-4": {"U-4"},
    "BS-5": {"U-5"},
}
network_observations = [
    {
        "observation_id": "NA-1",
        "bullshitter_source_id": "BS-1",
        "bullshitter_event_id": "U-1",
        "amplifier_source_id": "SRC-NET",
        "amplifier_id": "SRC-NET-X",
        "amplifier_display_name": "Network amplifier",
        "observed_at": "2026-03-01",
        "message_identity": "MSG-1",
        "public_receipts": [{"receipt_id": "RNA-1", "surface": "X", "url": "https://example.test/na1"}],
    },
    {
        "observation_id": "NA-2",
        "bullshitter_source_id": "BS-2",
        "bullshitter_event_id": "U-2",
        "amplifier_source_id": "SRC-NET",
        "amplifier_id": "SRC-NET-X",
        "amplifier_display_name": "Network amplifier",
        "observed_at": "2026-04-02",
        "message_identity": "MSG-2",
        "public_receipts": [{"receipt_id": "RNA-2", "surface": "X", "url": "https://example.test/na2"}],
    },
    {
        "observation_id": "NA-3",
        "bullshitter_source_id": "BS-3",
        "bullshitter_event_id": "U-3",
        "amplifier_source_id": "SRC-NET",
        "amplifier_id": "SRC-NET-X",
        "amplifier_display_name": "Network amplifier",
        "observed_at": "2026-05-03",
        "message_identity": "MSG-3",
        "public_receipts": [{"receipt_id": "RNA-3", "surface": "X", "url": "https://example.test/na3"}],
    },
    {
        "observation_id": "NA-4",
        "bullshitter_source_id": "BS-4",
        "bullshitter_event_id": "U-4",
        "amplifier_source_id": "SRC-NET",
        "amplifier_id": "SRC-NET-X",
        "amplifier_display_name": "Network amplifier",
        "observed_at": "2026-06-04",
        "message_identity": "MSG-4",
        "public_receipts": [{"receipt_id": "RNA-4", "surface": "X", "url": "https://example.test/na4"}],
    },
    {
        "observation_id": "NA-5",
        "bullshitter_source_id": "BS-5",
        "bullshitter_event_id": "U-5",
        "amplifier_source_id": "SRC-NET",
        "amplifier_id": "SRC-NET-X",
        "amplifier_display_name": "Network amplifier",
        "observed_at": "2026-07-05",
        "message_identity": "MSG-5",
        "public_receipts": [{"receipt_id": "RNA-5", "surface": "X", "url": "https://example.test/na5"}],
    },
    {
        "observation_id": "NA-6",
        "bullshitter_source_id": "BS-1",
        "bullshitter_event_id": "U-1",
        "amplifier_source_id": "SRC-NET",
        "amplifier_id": "SRC-NET-X",
        "amplifier_display_name": "Network amplifier",
        "observed_at": "2026-09-06",
        "message_identity": "MSG-6",
        "public_receipts": [{"receipt_id": "RNA-6", "surface": "X", "url": "https://example.test/na6"}],
    },
]
network_award = wol.network_assisted_bullshit_award(
    "SRC-NET",
    network_observations,
    upstream_incidents,
    governance,
    as_of="2026-09-21T15:30:00-04:00",
)
assert network_award is not None
assert network_award["award_code"] == "BULLSHITTER"
assert network_award["qualification_route"] == "NETWORK_ASSISTED_AMPLIFICATION"
assert network_award["qualifying_incident_count"] == 6
assert network_award["qualifying_upstream_source_count"] == 5
assert set(network_award["qualifying_upstream_source_ids"]) == set(upstream_incidents)
assert network_award["qualification_scope"] == "CUMULATIVE"
assert network_award["qualification_start"] == "2026-03-01T00:00:00"
assert network_award["qualification_end"] == "2026-09-06T00:00:00"

# Five publications are insufficient even across five Bullshitters.
assert wol.network_assisted_bullshit_award(
    "SRC-NET",
    network_observations[:5],
    upstream_incidents,
    governance,
    as_of="2026-09-21T15:30:00-04:00",
) is None

# Six publications sourced from only four distinct Bullshitters are insufficient.
four_source_map = {key: value for key, value in upstream_incidents.items() if key != "BS-5"}
four_source_observations = [
    dict(row, bullshitter_source_id=("BS-4" if row["bullshitter_source_id"] == "BS-5" else row["bullshitter_source_id"]),
         bullshitter_event_id=("U-4" if row["bullshitter_event_id"] == "U-5" else row["bullshitter_event_id"]))
    for row in network_observations
]
assert wol.network_assisted_bullshit_award(
    "SRC-NET",
    four_source_observations,
    four_source_map,
    governance,
    as_of="2026-09-21T15:30:00-04:00",
) is None

# A cross-platform mirror with the same message identity does not create a
# seventh qualifying incident.
mirror = dict(network_observations[-1])
mirror["observation_id"] = "NA-7-MIRROR"
mirror["amplifier_id"] = "SRC-NET-TELEGRAM"
mirror["observed_at"] = "2026-09-07"
mirror["public_receipts"] = [{"receipt_id": "RNA-7", "surface": "TELEGRAM", "url": "https://example.test/na7"}]
mirror_award = wol.network_assisted_bullshit_award(
    "SRC-NET",
    network_observations + [mirror],
    upstream_incidents,
    governance,
    as_of="2026-09-21T15:30:00-04:00",
)
assert mirror_award is not None
assert mirror_award["qualifying_incident_count"] == 6

# Missing message identity fails closed for award counting.
no_identity = [dict(row) for row in network_observations]
no_identity[0].pop("message_identity")
assert wol.network_assisted_bullshit_award(
    "SRC-NET",
    no_identity,
    upstream_incidents,
    governance,
    as_of="2026-09-21T15:30:00-04:00",
) is None

print("web-of-lies Bullshitter award: PASS threshold=6 cumulative=1 network_assisted=1 deterministic=1")
