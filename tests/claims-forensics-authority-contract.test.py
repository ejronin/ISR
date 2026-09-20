#!/usr/bin/env python3
"""Mutation regression for the dedicated Claims Forensics authority contract."""
from __future__ import annotations

import copy
import hashlib
import json
import sys
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import validate_claims_forensics_authority as authority


def load_inputs():
    return (
        authority.load(ROOT, authority.CANONICAL),
        authority.load(ROOT, authority.PUBLIC),
        authority.load(ROOT, authority.GOVERNANCE_CONFIG),
    )


def canonical_chain(canonical, chain_id):
    for wrapped in (canonical.get("entities") or {}).get("lie_ledger_chains_v2") or []:
        chain = authority.unwrap(wrapped)
        if chain.get("chain_id") == chain_id:
            return chain
    raise AssertionError(f"missing canonical chain fixture: {chain_id}")


def public_chain(public, chain_id):
    for chain in authority.public_chains(public):
        if chain.get("chain_id") == chain_id:
            return chain
    raise AssertionError(f"missing public chain fixture: {chain_id}")


def canonical_record(canonical, instance):
    for wrapped in (canonical.get("entities") or {}).get("lie_ledger_v2") or []:
        record = authority.unwrap(wrapped)
        if record.get("claim_instance_id") == instance:
            return record
    raise AssertionError(f"missing canonical record fixture: {instance}")


def chain_record(chain, instance):
    for record in chain.get("proposition_records") or []:
        if record.get("claim_instance_id") == instance:
            return record
    raise AssertionError(f"missing chain record fixture: {instance}")


def mutate_record_everywhere(canonical, public, instance, mutator):
    mutator(canonical_record(canonical, instance))
    for chain in authority.canonical_chains(canonical):
        for record in chain.get("proposition_records") or []:
            if record.get("claim_instance_id") == instance:
                mutator(record)
    for chain in authority.public_chains(public):
        for record in chain.get("proposition_records") or []:
            if record.get("claim_instance_id") == instance:
                mutator(record)


def expect_rejected(
    name: str,
    baseline,
    mutator: Callable[[dict, dict, dict], None],
) -> None:
    canonical, public, config = (copy.deepcopy(value) for value in baseline)
    mutator(canonical, public, config)
    try:
        authority.validate_state(canonical, public, config)
    except AssertionError:
        return
    raise AssertionError(f"authority-drift mutation was not rejected: {name}")


def main() -> None:
    sealed_path = ROOT / authority.SEALED_HISTORICAL
    sealed_before = hashlib.sha256(sealed_path.read_bytes()).hexdigest()

    baseline = load_inputs()
    authority.validate_state(*baseline)

    # 1. Evidence Integration may supply factual/source baselines but cannot
    # acquire claim truth/knowledge adjudication authority.
    expect_rejected(
        "Evidence Integration acquires truth adjudication",
        baseline,
        lambda c, p, g: g["authority"]["evidence_integration_owns"].append("truth_adjudication"),
    )

    # 2. Canonical active authority cannot collapse back into Evidence or any
    # other lane while the Claims overlay remains present.
    expect_rejected(
        "canonical semantic authority reassigned",
        baseline,
        lambda c, p, g: c["lie_ledger_v2_governance"].__setitem__(
            "semantic_authority", "EVIDENCE_INTEGRATION"
        ),
    )

    # 3. Public Product cannot rewrite proposition wording.
    def public_wording(c, p, g):
        row = chain_record(public_chain(p, authority.F15_CHAIN_ID), "CI-IR-CLM-0004-P02")
        row["proposition"] = "Frontend-authored replacement proposition."
    expect_rejected("Public Product rewrites proposition wording", baseline, public_wording)

    # 4. Public Product cannot move a proposition between chains.
    def public_membership(c, p, g):
        row = chain_record(public_chain(p, authority.F15_CHAIN_ID), "CI-IR-CLM-0004-P02")
        row["chain_id"] = "CH-FRONTEND-REWRITE"
    expect_rejected("Public Product rewrites chain membership", baseline, public_membership)

    # 5. Release can validate semantics but cannot become their adjudicator.
    expect_rejected(
        "Release acquires truth adjudication",
        baseline,
        lambda c, p, g: g["authority"]["release_integrity_owns"].append("truth_adjudication"),
    )

    # 6. Systems Lead remains routing/scope/integration authority only.
    expect_rejected(
        "Systems Lead acquires semantic override",
        baseline,
        lambda c, p, g: g["authority"].__setitem__(
            "systems_lead", "scope_priority_integration_and_semantic_override"
        ),
    )

    # 7. A chain-level Lie finding cannot flatten a supported factual node.
    def flatten_supported_f15(c, p, g):
        def mutate(row):
            row["truth_adjudication"] = "FALSE"
        mutate_record_everywhere(c, p, "CI-IR-CLM-0004-P01", mutate)
    expect_rejected("F-15E parent Lie propagates false to supported node", baseline, flatten_supported_f15)

    # 8. Falsity by itself cannot manufacture claimant knowledge.
    def manufacture_lie(c, p, g):
        def mutate(row):
            row["truth_adjudication"] = "FALSE"
            row["knowledge_judgment"] = "KNOWING_FALSEHOOD_ESTABLISHED"
            row["combined_assessment"] = "LIE — KNOWING FALSEHOOD ESTABLISHED"
            row.setdefault("evidence_support", {})["knowledge_access"] = []
            row["knowledge_indicators"] = []
            if "public_knowledge_judgment" in row:
                row["public_knowledge_judgment"] = "KNOWING_FALSEHOOD_ESTABLISHED"
                row["public_combined_assessment"] = "LIE — KNOWING FALSEHOOD ESTABLISHED"
        mutate_record_everywhere(c, p, "CI-IR-CLM-0004-P02", mutate)
    expect_rejected("FALSE mechanically becomes LIE", baseline, manufacture_lie)

    # 9. Mere early possibility does not keep a proposition unresolved after
    # affirmative terminal evidence resolves it.
    def force_unresolved(c, p, g):
        mutate_record_everywhere(
            c,
            p,
            "CI-IR-CLM-0004-P02",
            lambda row: row.__setitem__("truth_adjudication", "UNRESOLVED"),
        )
    expect_rejected("possibility forces terminal capture unresolved", baseline, force_unresolved)

    # 10. Cross-event rhetorical similarity may be a narrative family but not a
    # synthetic event chain.
    def family_as_event(c, p, g):
        source = copy.deepcopy(canonical_chain(c, "CH-ARAMCO-FALSE-FLAG-20260302"))
        source["chain_id"] = "CH-FALSE-FLAG-REGIONAL"
        (c.get("entities") or {})["lie_ledger_chains_v2"].append({"record": source})
        psource = copy.deepcopy(public_chain(p, "CH-ARAMCO-FALSE-FLAG-20260302"))
        psource["chain_id"] = "CH-FALSE-FLAG-REGIONAL"
        (p.get("gate3") or {})["lie_ledger"]["records"].append(psource)
    expect_rejected("narrative family masquerades as event chain", baseline, family_as_event)

    # 11. Repetition/amplification cannot become another unique proposition.
    def inflate_repetition(c, p, g):
        rows = authority.canonical_records(c)
        unique_propositions = {
            row.get("proposition_id")
            for row in rows
            if row.get("counts_as_unique_proposition")
        }
        target = next(
            row
            for row in rows
            if row.get("relation_type") in {"REPETITION", "AMPLIFICATION"}
            and row.get("counts_as_unique_proposition") is False
            and row.get("proposition_id") in unique_propositions
        )
        instance = target["claim_instance_id"]
        mutate_record_everywhere(
            c,
            p,
            instance,
            lambda row: row.__setitem__("counts_as_unique_proposition", True),
        )
    expect_rejected("repetition inflates unique proposition denominator", baseline, inflate_repetition)

    # 12. Corrections remain correction nodes inside the original F-15E chain.
    def erase_correction(c, p, g):
        mutate_record_everywhere(
            c,
            p,
            "CI-IR-CLM-0006-P01",
            lambda row: row.__setitem__("relation_type", "ORIGINATION"),
        )
    expect_rejected("F-15E correction relationship erased", baseline, erase_correction)

    # 13. Public logic is a projection of the canonical Claims Forensics graph,
    # not a frontend-owned reasoning graph.
    def hand_author_logic(c, p, g):
        graph = public_chain(p, authority.F15_CHAIN_ID)["logic_graph"]
        if graph.get("edges"):
            graph["edges"].pop()
        else:
            graph["generation_rule"] = "HAND_AUTHORED_FRONTEND_LOGIC"
    expect_rejected("frontend independently rewrites logic graph", baseline, hand_author_logic)

    # 14. Public Product cannot collapse author-level uncertainty into the
    # publisher-level institutional knowledge finding or vice versa.
    def rewrite_publisher_knowledge(c, p, g):
        row = chain_record(public_chain(p, authority.F15_CHAIN_ID), "CI-IR-CLM-0011-P03")
        row["public_knowledge_judgment"] = "INSUFFICIENT_EVIDENCE"
        row["public_combined_assessment"] = "FALSE — KNOWLEDGE NOT ESTABLISHED"
    expect_rejected("publisher institutional knowledge is weakened downstream", baseline, rewrite_publisher_knowledge)

    # 15. Public Product cannot change the canonical chain-level Lie label.
    def rewrite_parent_label(c, p, g):
        public_chain(p, authority.F15_CHAIN_ID)["public_finding"] = {
            "label": "False",
            "key": "false",
        }
    expect_rejected("frontend rewrites canonical case label", baseline, rewrite_parent_label)

    sealed_after = hashlib.sha256(sealed_path.read_bytes()).hexdigest()
    assert sealed_after == sealed_before, "regression test modified sealed historical artifact"

    print(
        "Claims Forensics authority mutation regression: PASS - "
        "15 representative authority/semantic drift mutations rejected; "
        "F-15E reference distinctions preserved; sealed Sep. 9 artifact untouched"
    )


if __name__ == "__main__":
    main()
