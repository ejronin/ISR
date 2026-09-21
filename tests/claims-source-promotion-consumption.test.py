#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "data/claims-forensics/lie-ledger-semantic-overlay-20260919.json"
MAINTENANCE = ROOT / "data/claims-forensics/claims-source-promotion-consumption-20260920.json"
HANDOFF = ROOT / "data/claims-forensics/web-of-lies-source-promotion-handoff-20260920.json"
PACKET = ROOT / "data/canonical-updates/UPD-20260920-CLAIMS-SOURCE-PROMOTIONS.json"

TARGETS = {
    "CH-IRAN-MILITARY-TRAINING-20260918": {
        "claim_id": "CLM-IRAN-MILITARY-TRAINING-600K-1M-20260918",
        "source_id": "SRC-61A4DB945FF2",
        "prior": "CONTROL_CASE_SOURCE_PROMOTION_REQUIRED",
        "instances": {
            "CI-CLM-IRAN-MILITARY-TRAINING-600K-1M-20260918-P01",
            "CI-CLM-IRAN-MILITARY-TRAINING-600K-1M-20260918-P02",
        },
    },
    "CH-IRAN-ANTISHIP-MULTIWARHEAD-TEST-20260919": {
        "claim_id": "CLM-IRAN-ANTI-SHIP-MULTIWARHEAD-20260919",
        "source_id": "SRC-C5D731879E3B",
        "prior": "CONTROL_CASE_SOURCE_PROMOTION_REQUIRED",
        "instances": {"CI-CLM-IRAN-ANTI-SHIP-MULTIWARHEAD-20260919-P01"},
    },
    "CH-CENTCOM-ZERO-IRAN-OIL-EXPORTS-20260919": {
        "claim_id": "CLM-CENTCOM-ZERO-IRAN-OIL-EXPORTS-20260919",
        "source_id": "SRC-229640C43A50",
        "prior": "EXACT_METRIC_SOURCE_PROMOTION_REQUIRED",
        "instances": {"CI-CLM-CENTCOM-ZERO-IRAN-OIL-EXPORTS-20260919-P01"},
    },
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


overlay = load(OVERLAY)
maintenance = load(MAINTENANCE)
handoff = load(HANDOFF)
packet = load(PACKET)

assert maintenance["artifact_role"] == "CLAIMS_FORENSICS_MAINTENANCE_SWEEP"
assert maintenance["maintenance_type"] == "CLAIMS_FORENSICS_SOURCE_PROMOTION_CONSUMPTION"
assert maintenance["upstream_source_promotion"]["packet_id"] == "UPD-20260920-CLAIMS-SOURCE-PROMOTIONS"
assert maintenance["upstream_source_promotion"]["gate3_sequence"] == 19
assert maintenance["upstream_source_promotion"]["directive"] == (
    "SOURCE_PROMOTION_ONLY — NO CLAIMS FORENSICS SEMANTIC MUTATION"
)
assert overlay["maintenance_sweep_path"] == (
    "data/claims-forensics/claims-source-promotion-consumption-20260920.json"
)
assert overlay["maintenance_sweep_version"] == maintenance["maintenance_version"]

# PR #164 is source promotion only. Public eligibility is an explicit Claims
# Forensics decision in this pass, not a semantic side effect of Evidence promotion.
assert packet["events"] == []
assert packet["entities"] == []
assert packet["narrative_claims"] == []
packet_sources = {row["source_id"]: row for row in packet["sources"]}
assert set(packet_sources) == {spec["source_id"] for spec in TARGETS.values()}

maint_by_chain = {row["chain_id"]: row for row in maintenance["targets"]}
records_by_chain = {
    chain_id: [
        row for row in overlay["append_records"]
        if row.get("chain_id") == chain_id
    ]
    for chain_id in TARGETS
}

for chain_id, spec in TARGETS.items():
    assert chain_id in overlay["chain_overrides"]
    chain = overlay["chain_overrides"][chain_id]
    assert chain["classification"] != "ACCUSATION_CHAIN"
    assert chain["public_include_in_accusation_count"] is False
    assert chain["lie_ledger_accusation"] is False

    maint = maint_by_chain[chain_id]
    assert maint["prior_disposition"] == spec["prior"]
    assert maint["promoted_canonical_source_id"] == spec["source_id"]
    assert maint["blocker_resolution_state"] == "RESOLVED_BY_PR_164_GATE3_SEQUENCE_19"
    assert maint["truth_impact"] == "NONE"
    assert maint["knowledge_impact"] == "NONE"
    assert maint["public_eligibility"] == "PUBLIC_READY"

    rows = records_by_chain[chain_id]
    assert {row["claim_instance_id"] for row in rows} == spec["instances"]
    assert all(row["claim_id"] == spec["claim_id"] for row in rows)
    assert all(row["source_ids"] == [spec["source_id"]] for row in rows)
    assert all(row["evidence_support"]["what_was_said"] == [spec["source_id"]] for row in rows)
    assert all(row["truth_adjudication"] == "UNRESOLVED" for row in rows)
    assert all(row["knowledge_judgment"] == "NOT_ASSESSABLE" for row in rows)
    assert all(row["publication_status"] == "PUBLIC_READY" for row in rows)
    assert all(row["publication_blockers"] == [] for row in rows)
    assert all(row["counts_as_unique_proposition"] is False for row in rows)

    # Claims Forensics provenance must bind canonical IDs, not recovered-locker URLs.
    serialized = json.dumps(rows, sort_keys=True)
    assert "rook-evidence-locker" not in serialized
    assert "locker_artifact" not in serialized

training = records_by_chain["CH-IRAN-MILITARY-TRAINING-20260918"]
by_axis = {row["proposition_axis"]: row for row in training}
assert set(by_axis) == {"PARTICIPATION_COUNT", "PROSPECTIVE_PROJECTION"}
assert by_axis["PARTICIPATION_COUNT"]["source_proposition"] == (
    "over 600,000 people had registered to participate"
)
assert by_axis["PARTICIPATION_COUNT"]["truth_qualifier"] == (
    "EXACT_COUNT_NOT_INDEPENDENTLY_AUDITED"
)
assert by_axis["PROSPECTIVE_PROJECTION"]["source_proposition"] == (
    "over 1 million expected to take part in the training"
)
assert by_axis["PROSPECTIVE_PROJECTION"]["truth_qualifier"] == (
    "PROSPECTIVE_PROJECTION_NOT_PRESENT_TENSE_FACT"
)
assert "PRESENT-TENSE FALSEHOOD" in by_axis["PROSPECTIVE_PROJECTION"]["combined_assessment"]

rezaei = records_by_chain["CH-IRAN-ANTISHIP-MULTIWARHEAD-TEST-20260919"][0]
assert rezaei["source_proposition"] == (
    "Iran had recently test-fired a multi-warhead anti-ship missile near a U.S. vessel or aircraft carrier."
)
assert rezaei["truth_qualifier"] == "CLAIMANT_ASSERTION_LACKS_INDEPENDENT_CORROBORATION"
assert "NO LIE FINDING" in rezaei["combined_assessment"]

zero = records_by_chain["CH-CENTCOM-ZERO-IRAN-OIL-EXPORTS-20260919"][0]
assert zero["claim"] == "Iran has exported zero barrels thanks to our ironclad blockade."
assert zero["source_proposition"] == zero["claim"]
assert zero["truth_qualifier"] == (
    "EXACT_ZERO_TIME_WINDOW_AND_MEASUREMENT_DENOMINATOR_UNDEFINED"
)
assert "PRECISE TEST WINDOW AND MEASUREMENT DENOMINATOR UNDEFINED" in zero["combined_assessment"]
assert packet_sources["SRC-229640C43A50"]["time_scope"].endswith(
    "does not state an exact start or end date."
)
assert "does not explicitly narrow the denominator" in (
    packet_sources["SRC-229640C43A50"]["denominator_scope"]
)

# Exact counts remain unresolved unless the evidence resolves them. Lack of
# verification alone must never mutate them into FALSE.
for row in training + [rezaei, zero]:
    assert row["truth_adjudication"] != "FALSE"

# The downstream handoff is deterministic and semantic-only. It does not carry
# Web-of-Lies behavior, laundering, Hall, or deception findings.
assert handoff["artifact_role"] == "CLAIMS_FORENSICS_TO_WEB_OF_LIES_HANDOFF"
assert {row["chain_id"] for row in handoff["items"]} == set(TARGETS)
assert all(row["public_ready"] is True for row in handoff["items"])
assert all(row["classification"] != "ACCUSATION_CHAIN" for row in handoff["items"])
handoff_text = json.dumps(handoff, sort_keys=True).casefold()
for forbidden in ("behavior_findings", "hall_of_shame", "laundering", "deception_score"):
    assert forbidden not in handoff_text

assert maintenance["public_mutation_summary"] == {
    "newly_public_chains": [
        "CH-IRAN-MILITARY-TRAINING-20260918",
        "CH-IRAN-ANTISHIP-MULTIWARHEAD-TEST-20260919",
        "CH-CENTCOM-ZERO-IRAN-OIL-EXPORTS-20260919",
    ],
    "newly_public_proposition_rows": 4,
    "newly_public_claim_instances": 4,
    "unique_proposition_delta": 0,
    "accusation_chain_delta": 0,
    "control_chain_delta": 3,
    "truth_changes": 0,
    "knowledge_changes": 0,
    "remaining_source_promotion_holds": 0,
}

print("claims source-promotion consumption: PASS chains=3 rows=4 accusation_delta=0")
