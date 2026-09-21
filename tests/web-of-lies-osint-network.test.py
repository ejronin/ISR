#!/usr/bin/env python3
"""Adversarial Web of Lies public-OSINT / network / incremental regressions."""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_web_of_lies as wol


def wrapped(chain_id: str, title: str) -> dict:
    return {"entity_id": chain_id, "record": {"chain_id": chain_id, "public_title": title}}


canonical = {
    "release": {
        "canonical_state_identity_v2": "fixture-canonical-osint",
        "current_osint_cutoff": "2026-09-21T12:00:00-04:00",
    },
    "sources": {"records": [{"source_id": "SRC-CANON-1"}]},
    "entities": {
        "lie_ledger_chains_v2": [
            wrapped("CHAIN-A", "Claim family A"),
            wrapped("CHAIN-B", "Claim family B"),
        ]
    },
}

governance = json.loads((ROOT / wol.GOVERNANCE).read_text(encoding="utf-8"))


def profile(source_id: str, *, stable_identity_id: str | None = None, revenue=None):
    return {
        "source_id": source_id,
        "display_name": source_id,
        "source_entity_type": "ACCOUNT",
        "country_region": None,
        "primary_platform": "Fixture",
        "stable_identity_id": stable_identity_id or source_id,
        "identity_confidence": "CONFIRMED",
        "behavior_classes": ["UNKNOWN"],
        "authenticity_class": "HUMAN_ACCOUNT",
        "revenue_model": revenue or ["UNKNOWN_REVENUE_MODEL"],
        "classification_basis_event_ids": [],
        "revenue_basis_event_ids": [],
        "platform_accounts": [
            {
                "account_id": f"{source_id}-acct",
                "platform": "Fixture",
                "handle": f"@{source_id.lower()}",
            }
        ],
    }


def receipt(receipt_id: str, surface: str = "X", **extra):
    row = {
        "receipt_id": receipt_id,
        "surface": surface,
        "url": f"https://example.invalid/{receipt_id}",
        "provenance_status": "ORIGINAL_URL",
        "deletion_status": "AVAILABLE",
    }
    row.update(extra)
    return row


def event(
    event_id: str,
    source_id: str,
    *,
    family: str = "CHAIN-A",
    event_type: str = "REPORTS",
    surface: str = "X",
    independence: str = "DERIVATIVE",
    assertion_kind: str = "ATTRIBUTED_REPORT",
    behavior_findings=None,
    revenue_findings=None,
    public_receipts=None,
    **extra,
):
    row = {
        "event_id": event_id,
        "claim_family_id": family,
        "source_id": source_id,
        "event_type": event_type,
        "published_at": "2026-09-20T12:00:00-04:00",
        "first_observed_at": "2026-09-20T12:00:00-04:00",
        "epistemic_posture": "REPORTED",
        "canonical_claim_refs": [],
        "evidence_source_ids": [],
        "public_receipts": public_receipts or [receipt(f"R-{event_id}", surface)],
        "behavior_findings": behavior_findings or [],
        "revenue_findings": revenue_findings or [],
        "independence_status": independence,
        "assertion_kind": assertion_kind,
    }
    row.update(extra)
    return row


base = {
    "schema_version": "1.0",
    "artifact_role": "WEB_OF_LIES_FORENSIC_INPUT",
    "authority": "WEB_OF_LIES_INFORMATION_FORENSICS",
    "version": "fixture-osint",
    "source_profiles": [],
    "information_events": [],
    "relationships": [],
    "promotion_flags": [],
}

# 100 accounts repeating one origin do not become 100 corroborators.
many = copy.deepcopy(base)
many["source_profiles"] = [profile("SRC-ORIGIN")] + [
    profile(f"SRC-R-{i:03d}") for i in range(100)
]
many["information_events"] = [
    event(
        "E-ORIGIN",
        "SRC-ORIGIN",
        independence="INDEPENDENT",
        assertion_kind="FACTUAL_ASSERTION",
    )
]
for i in range(100):
    many["information_events"].append(
        event(f"E-R-{i:03d}", f"SRC-R-{i:03d}", surface=("TIKTOK" if i % 2 else "X"))
    )
    many["relationships"].append(
        {
            "relationship_id": f"REL-R-{i:03d}",
            "from_id": f"E-R-{i:03d}",
            "to_id": "E-ORIGIN",
            "relationship_type": "REPEATS",
            "evidence_source_ids": [],
            "public_receipts": [receipt(f"RR-{i:03d}", "X")],
        }
    )
built_many = wol.build_registry(canonical, many, governance)
fa = built_many["network_analysis"]["family_analysis"][0]
assert fa["independent_corroboration_events"] == 1
assert fa["independent_source_identities"] == 1
assert fa["derivative_repetition_events"] == 100
assert fa["documented_propagation_edges"] == 100

# Cross-platform reposts remain derivative, and stripping attribution can be a mutation.
mutation = copy.deepcopy(base)
mutation["source_profiles"] = [profile("SRC-UP"), profile("SRC-TIK")]
mutation["information_events"] = [
    event("E-UP", "SRC-UP", independence="INDEPENDENT"),
    event(
        "E-TIK",
        "SRC-TIK",
        event_type="NARRATIVE_MUTATION",
        surface="TIKTOK",
        epistemic_posture="CONFIRMED",
        epistemic_posture_before="REPORTED",
        epistemic_posture_after="CONFIRMED",
        assertion_kind="FACTUAL_ASSERTION",
        exact_statement="X happened.",
    ),
]
mutation["relationships"] = [
    {
        "relationship_id": "REL-MUT",
        "from_id": "E-TIK",
        "to_id": "E-UP",
        "relationship_type": "MUTATES_INTO",
        "evidence_source_ids": [],
        "public_receipts": [receipt("RR-MUT", "TIKTOK")],
    }
]
built_mutation = wol.build_registry(canonical, mutation, governance)
assert built_mutation["network_analysis"]["summary"]["material_mutation_findings"] == 1
mutation_profiles = {row["source_id"]: row for row in built_mutation["source_profiles"]}
assert mutation_profiles["SRC-TIK"]["metrics"]["narrative_mutations_introduced"] == 1

# Accurate attributed reporting does not inherit the underlying allegation as misconduct.
carrier = copy.deepcopy(base)
carrier["source_profiles"] = [profile("SRC-CARRIER")]
carrier["information_events"] = [
    event(
        "E-CARRIER",
        "SRC-CARRIER",
        event_type="REPORTS",
        assertion_kind="ATTRIBUTED_REPORT",
        exact_statement="IRGC claims X.",
    )
]
built_carrier = wol.build_registry(canonical, carrier, governance)
metrics = built_carrier["source_profiles"][0]["metrics"]
assert metrics["false_misleading_findings_connected"] == 0
assert metrics["narrative_mutations_introduced"] == 0
assert built_carrier["source_profiles"][0]["direct_verdict"] is None

# A later visible correction prevents a deleted/failed post remaining scored as uncorrected.
corrected = copy.deepcopy(base)
corrected["source_profiles"] = [profile("SRC-CORR")]
corrected["information_events"] = [
    event(
        "E-DEL",
        "SRC-CORR",
        event_type="DELETE_WITHOUT_CORRECTION",
        public_receipts=[
            receipt(
                "R-DEL",
                "X",
                deletion_status="POST_CONFIRMED_DELETED",
            )
        ],
    ),
    event(
        "E-CORR",
        "SRC-CORR",
        event_type="CORRECTION",
        assertion_kind="CORRECTION",
        corrects_event_id="E-DEL",
        correction_state="VISIBLE_CORRECTION",
    ),
]
built_corrected = wol.build_registry(canonical, corrected, governance)
metrics = built_corrected["source_profiles"][0]["metrics"]
assert metrics["failed_claims_deleted_or_abandoned"] == 0
assert metrics["corrections_issued"] == 1

# Screenshot-only evidence cannot masquerade as a verified pristine original.
bad_screen = copy.deepcopy(base)
bad_screen["source_profiles"] = [profile("SRC-SCREEN")]
bad_screen["information_events"] = [
    event(
        "E-SCREEN",
        "SRC-SCREEN",
        public_receipts=[
            receipt(
                "R-SCREEN",
                "X",
                provenance_status="SCREENSHOT_ONLY",
                original_verified=True,
            )
        ],
    )
]
try:
    wol.build_registry(canonical, bad_screen, governance)
except ValueError as exc:
    assert "screenshot-only" in str(exc)
else:
    raise AssertionError("screenshot-only receipt was accepted as verified original")

# Two handles mapped to one stable identity are not two independent source identities.
handles = copy.deepcopy(base)
handles["source_profiles"] = [
    profile("SRC-H1", stable_identity_id="PERSON-1"),
    profile("SRC-H2", stable_identity_id="PERSON-1"),
]
handles["information_events"] = [
    event("E-H1", "SRC-H1", independence="INDEPENDENT"),
    event("E-H2", "SRC-H2", independence="INDEPENDENT"),
]
built_handles = wol.build_registry(canonical, handles, governance)
fa = built_handles["network_analysis"]["family_analysis"][0]
assert fa["independent_corroboration_events"] == 2
assert fa["independent_source_identities"] == 1

# Monetization alone earns no adverse classification or Hall entry.
money = copy.deepcopy(base)
money["source_profiles"] = [
    profile("SRC-MONEY", revenue=["PLATFORM_MONETIZED"])
]
money["source_profiles"][0]["revenue_basis_event_ids"] = ["E-MONEY"]
money["information_events"] = [
    event(
        "E-MONEY",
        "SRC-MONEY",
        revenue_findings=["PLATFORM_MONETIZED"],
    )
]
built_money = wol.build_registry(canonical, money, governance)
assert built_money["hall_of_shame"]["all_time"] == {}
assert built_money["source_profiles"][0]["direct_verdict"] is None

# Wikipedia requires a reproducible revision/diff/talk receipt.
wiki_bad = copy.deepcopy(base)
wiki_bad["source_profiles"] = [profile("SRC-WIKI")]
wiki_bad["information_events"] = [
    event(
        "E-WIKI-BAD",
        "SRC-WIKI",
        surface="WIKIPEDIA",
        public_receipts=[receipt("R-WIKI-BAD", "WIKIPEDIA")],
    )
]
try:
    wol.build_registry(canonical, wiki_bad, governance)
except ValueError as exc:
    assert "Wikipedia receipt" in str(exc)
else:
    raise AssertionError("Wikipedia receipt without revision/diff was accepted")

wiki_ok = copy.deepcopy(base)
wiki_ok["source_profiles"] = [profile("SRC-WIKI")]
wiki_ok["information_events"] = [
    event(
        "E-WIKI-OK",
        "SRC-WIKI",
        surface="WIKIPEDIA",
        public_receipts=[
            receipt("R-WIKI-OK", "WIKIPEDIA", revision_id="123456")
        ],
    )
]
wol.build_registry(canonical, wiki_ok, governance)

# Public cyber-group claims must state whether the compromise is claimed or verified.
cyber_bad = copy.deepcopy(base)
cyber_bad["source_profiles"] = [profile("SRC-CYBER")]
cyber_bad["information_events"] = [
    event(
        "E-CYBER-BAD",
        "SRC-CYBER",
        surface="HACKTIVIST_PUBLICATION",
        public_receipts=[receipt("R-CYBER-BAD", "HACKTIVIST_PUBLICATION")],
    )
]
try:
    wol.build_registry(canonical, cyber_bad, governance)
except ValueError as exc:
    assert "claimed from verified compromise" in str(exc)
else:
    raise AssertionError("cyber claim without claim_status was accepted")

cyber_ok = copy.deepcopy(base)
cyber_ok["source_profiles"] = [profile("SRC-CYBER")]
cyber_ok["information_events"] = [
    event(
        "E-CYBER-OK",
        "SRC-CYBER",
        surface="HACKTIVIST_PUBLICATION",
        assertion_kind="ATTRIBUTED_REPORT",
        public_receipts=[
            receipt(
                "R-CYBER-OK",
                "HACKTIVIST_PUBLICATION",
                claim_status="CLAIMED_COMPROMISE",
            )
        ],
    )
]
built_cyber = wol.build_registry(canonical, cyber_ok, governance)
assert built_cyber["source_profiles"][0]["metrics"]["false_misleading_findings_connected"] == 0

# Circularity requires graph evidence.
circular = copy.deepcopy(base)
circular["source_profiles"] = [profile("SRC-A"), profile("SRC-B")]
circular["information_events"] = [
    event("E-A", "SRC-A"),
    event("E-B", "SRC-B"),
]
circular["relationships"] = [
    {
        "relationship_id": "REL-AB",
        "from_id": "E-A",
        "to_id": "E-B",
        "relationship_type": "DERIVES_FROM",
        "evidence_source_ids": [],
        "public_receipts": [receipt("R-AB", "WEBSITE")],
    },
    {
        "relationship_id": "REL-BA",
        "from_id": "E-B",
        "to_id": "E-A",
        "relationship_type": "DERIVES_FROM",
        "evidence_source_ids": [],
        "public_receipts": [receipt("R-BA", "WEBSITE")],
    },
]
built_circular = wol.build_registry(canonical, circular, governance)
assert built_circular["network_analysis"]["summary"]["circular_source_findings"] == 1

# Incremental + preserved unaffected state must equal a clean full build.
before = copy.deepcopy(base)
before["source_profiles"] = [profile("SRC-INC-A"), profile("SRC-INC-B")]
before["information_events"] = [
    event("E-INC-A", "SRC-INC-A", family="CHAIN-A"),
    event("E-INC-B", "SRC-INC-B", family="CHAIN-B"),
]
previous = wol.build_registry(canonical, before, governance)

after = copy.deepcopy(before)
after["information_events"].append(
    event(
        "E-INC-A2",
        "SRC-INC-A",
        family="CHAIN-A",
        event_type="NARRATIVE_MUTATION",
        epistemic_posture_before="REPORTED",
        epistemic_posture_after="CONFIRMED",
    )
)
full_after = wol.build_registry(canonical, after, governance)
incremental_after = wol.build_registry_incremental(
    canonical,
    after,
    governance,
    previous,
    {"CHAIN-A"},
)
assert incremental_after == full_after

stale = copy.deepcopy(previous)
stale["generated_from"]["canonical_state_identity"] = "stale"
try:
    wol.build_registry_incremental(canonical, after, governance, stale, {"CHAIN-A"})
except ValueError as exc:
    assert "stale previous canonical identity" in str(exc)
else:
    raise AssertionError("incremental rebuild accepted stale prior registry")

print("web-of-lies public OSINT/network/incremental tests: PASS")
