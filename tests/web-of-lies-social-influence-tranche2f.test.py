#!/usr/bin/env python3
"""Regression coverage for account-level Verified4War behavior claims."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_web_of_lies as wol  # noqa: E402
import build_web_of_lies_forensic_input as aggregator  # noqa: E402

canonical = json.loads((ROOT / wol.CANONICAL).read_text(encoding="utf-8"))
governance = json.loads((ROOT / wol.GOVERNANCE).read_text(encoding="utf-8"))
assembled = aggregator.build_forensic_input(ROOT)
derived = wol.build_registry(canonical, assembled, governance)

profiles = {row["source_id"]: row for row in derived["source_profiles"]}
incidents = {row["incident_id"]: row for row in derived["source_behavior_incidents"]}

times_id = "WOL-BS-TIMES-OF-IRAN-NETANYAHU-RUMOR-LAUNDERING-20260301"
usa_id = "WOL-BS-USA-ARMY-NEWS-NETANYAHU-DEAD-20260318"
inn_id = "WOL-BS-INN-AI-AMAN-STRIKE-VIDEO-20260330"

assert {times_id, usa_id, inn_id} <= set(incidents)

times = incidents[times_id]
assert times["source_id"] == "WOL-SRC-TIMES-OF-IRAN-NEWS"
assert times["event_type"] == "EVIDENTIARY_EVASION"
assert times["assertion_kind"] == "MEDIA_PRESENTATION"
assert times["published_at"] == "2026-03-01T20:53:47Z"
assert "conditional" in times["statement_identity"]
assert "rumor laundering" in times["evidentiary_support_review"]["search_notes"]
assert times["evidentiary_support_review"]["status"] == "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
assert times["evidentiary_support_review"]["supporting_evidence_found"] is False
assert times["evidentiary_support_review"]["claimant_basis_status"] == "ASSERTION_ONLY"
assert any("2028212126591176861" in (r.get("url") or "") for r in times["public_receipts"])

usa = incidents[usa_id]
assert usa["source_id"] == "WOL-SRC-USA-ARMY-NEWS"
assert usa["event_type"] == "UNSUPPORTED_FACTUAL_ASSERTION"
assert usa["assertion_kind"] == "FACTUAL_ASSERTION"
assert usa["published_at"] == "2026-03-18T19:37:59Z"
assert "confirmed and official" in usa["statement_identity"]
assert "appeared in person" in usa["evidentiary_support_review"]["claimant_basis_note"]
assert "does not attribute other Verified4War claims" in usa["evidentiary_support_review"]["search_notes"]
assert any("2034353641696735520" in (r.get("url") or "") for r in usa["public_receipts"])

inn = incidents[inn_id]
assert inn["source_id"] == "WOL-SRC-INN-IRAN-NATIONAL-NEWS"
assert inn["event_type"] == "UNSUPPORTED_FACTUAL_ASSERTION"
assert inn["assertion_kind"] == "MEDIA_PRESENTATION"
assert inn["published_at"] == "2026-03-30T16:57:31Z"
assert "video" in inn["statement_identity"]
assert "AI-generated" in inn["evidentiary_support_review"]["claimant_basis_note"]
assert "ten days before" in inn["evidentiary_support_review"]["claimant_basis_note"]
assert "does not adjudicate that Iran never targeted" in inn["evidentiary_support_review"]["search_notes"]
assert any("2038661912494559605" in (r.get("url") or "") for r in inn["public_receipts"])

# One account-specific incident each is nowhere near the six-in-30 award
# threshold. The network itself also does not inherit member incidents.
for source_id in (
    "WOL-SRC-TIMES-OF-IRAN-NEWS",
    "WOL-SRC-USA-ARMY-NEWS",
    "WOL-SRC-INN-IRAN-NATIONAL-NEWS",
    "WOL-SRC-VERIFIED4WAR-NETWORK",
):
    assert profiles[source_id]["source_awards"] == []
    assert profiles[source_id]["direct_verdict"] is None

# Network coordination is an external assessment, not automatic attribution of
# every network narrative to each member and not proof of state control.
assert "state control" in profiles["WOL-SRC-TIMES-OF-IRAN-NEWS"]["identity_context"]
assert "does not transfer every network narrative" in profiles["WOL-SRC-USA-ARMY-NEWS"]["identity_context"]
assert "No state-control inference" in profiles["WOL-SRC-INN-IRAN-NATIONAL-NEWS"]["identity_context"]

for source_id in (
    "WOL-SRC-TIMES-OF-IRAN-NEWS",
    "WOL-SRC-USA-ARMY-NEWS",
    "WOL-SRC-INN-IRAN-NATIONAL-NEWS",
):
    assert len([
        row for row in incidents.values()
        if row["source_id"] == source_id
    ]) == 1

hall_ids = {
    entry["source_id"]
    for view_name in ("all_time", "current_period")
    for entries in derived["hall_of_shame"][view_name].values()
    for entry in entries
}
assert not {
    "WOL-SRC-TIMES-OF-IRAN-NEWS",
    "WOL-SRC-USA-ARMY-NEWS",
    "WOL-SRC-INN-IRAN-NATIONAL-NEWS",
    "WOL-SRC-VERIFIED4WAR-NETWORK",
}.intersection(hall_ids)

print(
    "web-of-lies social influence tranche2f: PASS "
    "times_rumor_evasion=1 usa_army_false_death=1 inn_ai_media=1 awards=0"
)
