#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_web_of_lies as wol


def wrapped(chain_id: str, title: str):
    return {
        "entity_id": chain_id,
        "record": {
            "chain_id": chain_id,
            "public_title": title,
            "source_ids": [f"SRC-{chain_id[-1] * 12}"],
        },
    }


canonical = {
    "release": {
        "canonical_state_identity_v2": "fixture-canonical",
        "current_osint_cutoff": "2026-09-20T12:00:00-04:00",
    },
    "entities": {
        "lie_ledger_chains_v2": [
            wrapped("CHAIN-A", "Claim family A"),
            wrapped("CHAIN-B", "Claim family B"),
        ]
    },
}

governance = json.loads((ROOT / wol.GOVERNANCE).read_text(encoding="utf-8"))

empty = {
    "schema_version": "1.0",
    "artifact_role": "WEB_OF_LIES_FORENSIC_INPUT",
    "authority": "WEB_OF_LIES_INFORMATION_FORENSICS",
    "version": "fixture-empty",
    "source_profiles": [],
    "information_events": [],
    "relationships": [],
    "promotion_flags": [],
}

built = wol.build_registry(canonical, empty, governance)
assert [row["claim_family_id"] for row in built["claim_families"]] == ["CHAIN-A", "CHAIN-B"]
assert all(row["trace_status"] == "UNTRACED" for row in built["claim_families"])
assert built["hall_of_shame"]["all_time"] == {}
assert built["hall_of_shame"]["current_period"] == {}
assert built["hall_of_shame"]["manual_selection"] is False

forensic = copy.deepcopy(empty)
forensic["version"] = "fixture-ranked"
forensic["source_profiles"] = [
    {
        "source_id": "SRC-ACTOR-1",
        "display_name": "Actor One",
        "country_region": "Fixture",
        "primary_platform": "Fixture Platform",
        "behavior_classes": ["ACTIVIST_GRIFT", "NARRATIVE_MUTATION_OFFENDER"],
        "authenticity_class": "HUMAN_ACCOUNT",
        "revenue_model": ["PLATFORM_MONETIZED"],
        "classification_basis_event_ids": ["WOL-E1", "WOL-E2", "WOL-E3"],
        "revenue_basis_event_ids": ["WOL-E1"],
        "follower_count": 999999999,
    },
    {
        "source_id": "SRC-ACTOR-2",
        "display_name": "Actor Two",
        "country_region": "Fixture",
        "primary_platform": "Fixture Platform",
        "behavior_classes": ["ACTIVIST_GRIFT"],
        "authenticity_class": "HUMAN_ACCOUNT",
        "revenue_model": ["PLATFORM_MONETIZED"],
        "classification_basis_event_ids": ["WOL-E4", "WOL-E5", "WOL-E6"],
        "revenue_basis_event_ids": ["WOL-E4"],
        "follower_count": 1,
    },
]
forensic["information_events"] = [
    {
        "event_id": "WOL-E1",
        "claim_family_id": "CHAIN-A",
        "source_id": "SRC-ACTOR-1",
        "event_type": "NARRATIVE_MUTATION",
        "published_at": "2026-09-10T12:00:00",
        "first_observed_at": "2026-09-10T12:00:00",
        "epistemic_posture": "DEFINITIVE",
        "canonical_claim_refs": [],
        "evidence_source_ids": ["SRC-EVIDENCE-1"],
        "behavior_findings": ["ACTIVIST_GRIFT", "NARRATIVE_MUTATION_OFFENDER"],
        "revenue_findings": ["PLATFORM_MONETIZED"],
        "downstream_propagation_observed": 1000000,
    },
    {
        "event_id": "WOL-E2",
        "claim_family_id": "CHAIN-B",
        "source_id": "SRC-ACTOR-1",
        "event_type": "FALSE_OR_MISLEADING_CONNECTION",
        "published_at": "2026-09-11T12:00:00",
        "first_observed_at": "2026-09-11T12:00:00",
        "epistemic_posture": "CONFIRMED",
        "canonical_claim_refs": [],
        "evidence_source_ids": ["SRC-EVIDENCE-2"],
    },
    {
        "event_id": "WOL-E3",
        "claim_family_id": "CHAIN-B",
        "source_id": "SRC-ACTOR-1",
        "event_type": "REPEAT_AFTER_CORRECTION",
        "published_at": "2026-09-12T12:00:00",
        "first_observed_at": "2026-09-12T12:00:00",
        "epistemic_posture": "DEFINITIVE",
        "canonical_claim_refs": [],
        "evidence_source_ids": ["SRC-EVIDENCE-3"],
    },
    {
        "event_id": "WOL-E4",
        "claim_family_id": "CHAIN-A",
        "source_id": "SRC-ACTOR-2",
        "event_type": "NARRATIVE_MUTATION",
        "published_at": "2026-09-10T12:00:00",
        "first_observed_at": "2026-09-10T12:00:00",
        "epistemic_posture": "DEFINITIVE",
        "canonical_claim_refs": [],
        "evidence_source_ids": ["SRC-EVIDENCE-4"],
        "behavior_findings": ["ACTIVIST_GRIFT"],
        "revenue_findings": ["PLATFORM_MONETIZED"],
        "downstream_propagation_observed": 1,
    },
    {
        "event_id": "WOL-E5",
        "claim_family_id": "CHAIN-B",
        "source_id": "SRC-ACTOR-2",
        "event_type": "FALSE_OR_MISLEADING_CONNECTION",
        "published_at": "2026-09-11T12:00:00",
        "first_observed_at": "2026-09-11T12:00:00",
        "epistemic_posture": "CONFIRMED",
        "canonical_claim_refs": [],
        "evidence_source_ids": ["SRC-EVIDENCE-5"],
    },
    {
        "event_id": "WOL-E6",
        "claim_family_id": "CHAIN-B",
        "source_id": "SRC-ACTOR-2",
        "event_type": "REPEAT_AFTER_CORRECTION",
        "published_at": "2026-09-12T12:00:00",
        "first_observed_at": "2026-09-12T12:00:00",
        "epistemic_posture": "DEFINITIVE",
        "canonical_claim_refs": [],
        "evidence_source_ids": ["SRC-EVIDENCE-6"],
    },
]

ranked = wol.build_registry(canonical, forensic, governance)
activist = ranked["hall_of_shame"]["all_time"]["ACTIVIST_GRIFT"]
assert len(activist) == 2
assert {row["source_id"] for row in activist} == {"SRC-ACTOR-1", "SRC-ACTOR-2"}
assert activist[0]["source_id"] == "SRC-ACTOR-1"  # downstream spread can break a tie
assert activist[0]["score"] - activist[1]["score"] <= 5.0  # raw volume contribution is capped
assert "999999999" not in json.dumps(activist)
assert "Appears in 2 traced claim families" in activist[0]["why_this_source_appears_here"]

manual = copy.deepcopy(forensic)
manual["source_profiles"][0]["manual_rank"] = 1
try:
    wol.build_registry(canonical, manual, governance)
except ValueError as exc:
    assert "manual Hall of Shame fields are forbidden" in str(exc)
else:
    raise AssertionError("manual Hall of Shame rank was accepted")

bad_basis = copy.deepcopy(forensic)
bad_basis["source_profiles"][0]["classification_basis_event_ids"] = ["WOL-E4"]
try:
    wol.build_registry(canonical, bad_basis, governance)
except ValueError as exc:
    assert "another source's events" in str(exc)
else:
    raise AssertionError("cross-source classification basis was accepted")

unsupported_class = copy.deepcopy(forensic)
unsupported_class["information_events"][0]["behavior_findings"] = ["NARRATIVE_MUTATION_OFFENDER"]
try:
    wol.build_registry(canonical, unsupported_class, governance)
except ValueError as exc:
    assert "class ACTIVIST_GRIFT is not supported" in str(exc)
else:
    raise AssertionError("source behavior class without incident support was accepted")

unsupported_revenue = copy.deepcopy(forensic)
unsupported_revenue["information_events"][0]["revenue_findings"] = []
try:
    wol.build_registry(canonical, unsupported_revenue, governance)
except ValueError as exc:
    assert "revenue class PLATFORM_MONETIZED is not supported" in str(exc)
else:
    raise AssertionError("source revenue class without incident support was accepted")

recent = ranked["hall_of_shame"]["current_period"]["ACTIVIST_GRIFT"]
assert len(recent) == 2

old = copy.deepcopy(forensic)
for event in old["information_events"]:
    event["published_at"] = "2026-01-01T00:00:00"
    event["first_observed_at"] = "2026-01-01T00:00:00"
old_ranked = wol.build_registry(canonical, old, governance)
assert old_ranked["hall_of_shame"]["current_period"] == {}
assert old_ranked["hall_of_shame"]["all_time"]["ACTIVIST_GRIFT"]

print("web-of-lies foundation tests: PASS")
