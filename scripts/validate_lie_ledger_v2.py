#!/usr/bin/env python3
"""Validate neutral Lie Ledger evidence semantics and public projection.

This validator protects representation, evidence sufficiency, temporal/source
fidelity, denominator integrity, and public withholding behavior. It does not
assign factual authority to a person, persona, or implementation lane.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = "data/canonical-current-state-v2.json"
PUBLIC = "data/public-current-state-v2.json"
SCHEMA = "schemas/lie-ledger-evidence-adjudication-v2.json"
GOVERNANCE = "ATLAS-EVIDENCE-20260910-1"
CONTRACT = "2026-09-10"
COMPLETION = "ROOK-EVIDENCE-COMPLETION-20260909-v1"
ADJUDICATED = "EVIDENCE_ADJUDICATED"
STRONG = {"LIKELY_KNEW_FALSE", "VERY_LIKELY_KNEW_FALSE", "KNOWING_FALSEHOOD_ESTABLISHED"}
FALSY = {"FALSE", "MISLEADING"}

try:
    import jsonschema
except ImportError:  # pragma: no cover - CI installs project validator dependencies
    jsonschema = None


def require(condition: Any, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def load(root: Path, relative: str) -> Any:
    return json.loads((root / relative).read_text(encoding="utf-8"))


def canonical_records(state: dict[str, Any]) -> list[dict[str, Any]]:
    return [unwrap(item) for item in (state.get("entities") or {}).get("lie_ledger_v2") or []]


def public_records(state: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    ledger = (state.get("gate3") or {}).get("lie_ledger") or {}
    for chain in ledger.get("records") or []:
        result.extend(chain.get("proposition_records") or [])
    return result


def source_ids(state: dict[str, Any]) -> set[str]:
    return {
        str(item.get("source_id"))
        for item in (state.get("sources") or {}).get("records") or []
        if item.get("source_id")
    }


def evidence_refs(record: dict[str, Any]) -> set[str]:
    return {
        ref
        for values in (record.get("evidence_support") or {}).values()
        for ref in values or []
        if isinstance(ref, str)
    }


def claim_instance_key(record: dict[str, Any]) -> str:
    """Count one originating statement once even when decomposed into propositions."""
    return str(
        record.get("original_claim_id")
        or record.get("claim_id")
        or record.get("claim_instance_id")
    )


def recompute_metrics(records: list[dict[str, Any]], chain_count: int) -> dict[str, Any]:
    factual = Counter()
    knowledge = Counter()
    unique_ids: set[str] = set()
    claim_instance_keys: set[str] = set()
    originations = amplifications = corrections = retractions = substitutions = media = 0
    for record in records:
        if record.get("adjudication_status") != ADJUDICATED:
            continue
        claim_instance_keys.add(claim_instance_key(record))
        factual[record["truth_adjudication"]] += 1
        knowledge[record["knowledge_judgment"]] += 1
        relation = record.get("relation_type")
        if relation in {"ORIGINATION", "STANDALONE"}:
            originations += 1
        elif relation in {"REPETITION", "AMPLIFICATION"}:
            amplifications += 1
        elif relation == "CORRECTION":
            corrections += 1
        elif relation == "RETRACTION":
            retractions += 1
        elif relation == "NARRATIVE_SUBSTITUTION":
            substitutions += 1
        if record.get("denominator_class") == "MEDIA_ARTIFACT":
            media += 1
        if record.get("counts_as_unique_proposition"):
            unique_ids.add(str(record["proposition_id"]))
    falsy_unique = {
        record["proposition_id"]
        for record in records
        if record.get("adjudication_status") == ADJUDICATED
        and record.get("counts_as_unique_proposition")
        and record.get("truth_adjudication") in FALSY
    }
    resolved_unique = {
        record["proposition_id"]
        for record in records
        if record.get("adjudication_status") == ADJUDICATED
        and record.get("counts_as_unique_proposition")
        and record.get("truth_adjudication") != "UNRESOLVED"
    }
    pct = round(100.0 * len(falsy_unique) / len(resolved_unique), 2) if resolved_unique else None
    return {
        "unique_propositions": len(unique_ids),
        "claim_instances": len(claim_instance_keys),
        "originations": originations,
        "amplifications": amplifications,
        "corrections": corrections,
        "retractions": retractions,
        "narrative_substitutions": substitutions,
        "media_artifacts": media,
        "narrative_chains": chain_count,
        "factual_status_totals": dict(sorted(factual.items())),
        "knowledge_assessment_totals": dict(sorted(knowledge.items())),
        "percentages": {
            "falsy_share_of_resolved_unique_propositions": {
                "numerator": len(falsy_unique),
                "denominator": len(resolved_unique),
                "percentage": pct,
                "numerator_definition": "Unique evidence-adjudicated propositions classified FALSE or MISLEADING.",
                "denominator_definition": "Unique evidence-adjudicated propositions with a resolved factual status; UNRESOLVED excluded."
            }
        }
    }


def assert_no_active_deception_score(record: dict[str, Any]) -> None:
    for key, value in record.items():
        if key == "legacy_semantics":
            continue
        require(key != "deception_score", f"obsolete deception_score in active v2 record {record.get('claim_instance_id')}")
        require(key != "deception_basis", f"obsolete deception_basis in active v2 record {record.get('claim_instance_id')}")
        if isinstance(value, dict):
            assert_no_active_deception_score({"claim_instance_id": record.get("claim_instance_id"), **value})
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    assert_no_active_deception_score({"claim_instance_id": record.get("claim_instance_id"), **item})


def validate(root: Path = ROOT) -> None:
    root = Path(root).resolve()
    canonical = load(root, CANONICAL)
    public = load(root, PUBLIC)
    schema = load(root, SCHEMA)
    records = canonical_records(canonical)
    public_rows = public_records(public)
    chains = [unwrap(item) for item in (canonical.get("entities") or {}).get("lie_ledger_chains_v2") or []]

    require(records, "canonical Lie Ledger v2 is empty")
    require(chains, "canonical Lie Ledger v2 chains are empty")
    require("lie_ledger_v2_authority" not in canonical, "active persona-authority object remains in canonical state")
    governance = canonical.get("lie_ledger_v2_governance") or {}
    require(governance.get("governance_version") == GOVERNANCE, "neutral Lie Ledger governance version mismatch")
    require(governance.get("contract_version") == CONTRACT, "neutral Lie Ledger contract version mismatch")
    require(governance.get("adjudication_basis") == "EVIDENCE_AND_ACCEPTED_ASSESSMENT", "Lie Ledger adjudication basis is not evidence-based")
    require(governance.get("implementation_model") == "DETERMINISTIC_BUILDER", "Lie Ledger implementation model is not neutral")
    require(canonical.get("release", {}).get("lie_ledger_governance_version") == GOVERNANCE, "canonical governance release pin mismatch")
    public_ledger = (public.get("gate3") or {}).get("lie_ledger", {})
    require(public_ledger.get("governance_version") == GOVERNANCE, "public governance version mismatch")
    require(public_ledger.get("primary_object") == "NARRATIVE_PROPOSITION_CHAIN", "public primary object is not narrative/proposition chain")
    require("authority" not in public_ledger, "public Lie Ledger exposes an active authority object")

    if jsonschema is not None:
        validator = jsonschema.Draft202012Validator(schema)
        for record in records:
            validator.validate(record)

    known_sources = source_ids(canonical)
    for record in records:
        assert_no_active_deception_score(record)
        require("authority_status" not in record, f"active persona-status field remains in {record['claim_instance_id']}")
        require(record.get("adjudication_status") in {ADJUDICATED, "LEGACY_NORMALIZED_NOT_REASSESSED"}, f"invalid adjudication status {record['claim_instance_id']}")
        require(record["truth_adjudication"] in {"SUPPORTED", "PARTLY_TRUE", "MISLEADING", "FALSE", "UNRESOLVED"}, f"truth/lifecycle collapse in {record['claim_instance_id']}")
        require(record["knowledge_judgment"] != "NOT_ASSESSED_FOR_DECEPTION", f"obsolete knowledge token in {record['claim_instance_id']}")
        require(record["combined_assessment"] != "KNOWING_FALSEHOOD_LIE", f"obsolete combined token in {record['claim_instance_id']}")
        unresolved = sorted(evidence_refs(record) - known_sources)
        require(not unresolved, f"UNRESOLVED_SOURCE_REFERENCE {record['claim_instance_id']}: {unresolved}")
        if record["knowledge_judgment"] in STRONG and record["publication_status"] == "PUBLIC_READY":
            support = record["evidence_support"]
            require(support["what_was_said"], f"strong judgment lacks claim source {record['claim_instance_id']}")
            require(support["factual_baseline"], f"strong judgment lacks factual baseline {record['claim_instance_id']}")
            require(support["knowledge_access"], f"strong judgment lacks knowledge-access refs {record['claim_instance_id']}")
            require(record["knowledge_indicators"], f"strong judgment lacks structured knowledge indicators {record['claim_instance_id']}")
            require(record["credible_alternatives"], f"strong judgment lacks credible alternative {record['claim_instance_id']}")
            require(record["falsifier"], f"strong judgment lacks falsifier {record['claim_instance_id']}")
        if record["denominator_class"] in {"REPETITION_AMPLIFICATION", "CORRECTION_RETRACTION"}:
            require(not record["counts_as_unique_proposition"], f"amplification/correction inflates unique propositions {record['claim_instance_id']}")
        for blocker in record.get("publication_blockers") or []:
            require("authority" not in blocker, f"active blocker owner remains in {record['claim_instance_id']}")

    # False factual status cannot automatically manufacture a lie finding.
    require(
        any(
            record["truth_adjudication"] == "FALSE"
            and record["knowledge_judgment"] not in STRONG
            for record in records
        ),
        "anti-regression corpus lacks a false proposition with knowledge below likely-lie threshold"
    )

    # Direct mental-state evidence is not a prerequisite for an estimative
    # knowledge judgment; circumstantial/institutional access can support it.
    require(
        any(
            record["knowledge_judgment"] in {"LIKELY_KNEW_FALSE", "VERY_LIKELY_KNEW_FALSE"}
            and any(ind.get("indicator") == "ASSESSMENT_KNOWLEDGE_BASIS" for ind in record.get("knowledge_indicators") or [])
            for record in records
        ),
        "estimative knowledge is not represented through circumstantial/institutional evidence"
    )

    # Source proposition fidelity hard-stop: the 16-fighter source said hit, not destroyed/downed.
    sixteen = [
        record for record in records
        if record.get("original_claim_id") == "IR-CLM-0604"
        and record.get("adjudication_status") == ADJUDICATED
    ]
    require(sixteen, "IR-CLM-0604 v2 proposition missing")
    require(any(record["proposition"] == "At least 16 enemy fighters were hit." for record in sixteen), "IR-CLM-0604 source wording not restored to hit")
    require(all("destroy" not in record["proposition"].casefold() and "downed" not in record["proposition"].casefold() for record in sixteen), "IR-CLM-0604 proposition strengthened beyond source")

    # Publisher framing remains a separate claim instance from the quoted/source-body proposition.
    headline = [record for record in records if record.get("proposition_id") == "PROP-IR-210-DOWNED-HEADLINE"]
    require(len(headline) == 1, "210-aircraft publisher headline proposition missing or duplicated")
    require(headline[0]["actor"] == "Press TV", "publisher headline silently attributed to source speaker")
    require(headline[0]["proposition_axis"] == "PUBLISHER_FRAMING", "publisher framing not structurally separated")

    # Historical Sep. 9 evidence-completion inputs remain traceable, but no
    # historical author is active authority in generated state.
    historical = governance.get("historical_inputs") or {}
    require(historical.get("evidence_completion_version") == COMPLETION, "historical evidence-completion input is not pinned")
    resolved = set(historical.get("resolved_publication_blockers") or [])
    required_resolved = {"BLOCK-LINCOLN-MAR13", "BLOCK-CSAR-REMAINS", "BLOCK-QATAR-INVITATION", "BLOCK-TANF-CLAIM-SOURCE"}
    require(required_resolved <= resolved, "historical evidence-completion blocker set is incomplete")
    global_blockers = canonical.get("lie_ledger_v2_publication_blockers") or []
    global_blocker_ids = {str(item.get("blocker_id") or "") for item in global_blockers}
    require(not (required_resolved & global_blocker_ids), "resolved historical blocker remained open")
    require(all("authority" not in blocker for blocker in global_blockers), "global blocker carries active persona authority")

    remains = [record for record in records if record.get("proposition_id") == "PROP-CSAR-US-REMAINS-EVIDENTIARY-PRESENTATION"]
    require(len(remains) == 1, "American-remains evidence proposition missing or duplicated")
    require(remains[0]["proposition_fidelity"] == "SOURCE_HEDGE_PRESERVED", "American-remains hedge fidelity flag missing")
    require("believed" in remains[0]["proposition"].casefold(), "American-remains hedge was strengthened into a categorical claim")
    require(remains[0]["publication_status"] == "PUBLIC_READY", "American-remains completed ruling remains blocked")

    lincoln = [record for record in records if record.get("proposition_id") == "PROP-LINCOLN-20260313-NONOPERATIONAL"]
    require(len(lincoln) == 1, "March 13 Lincoln effect proposition missing or duplicated")
    require(lincoln[0]["combined_assessment"] == "VERY LIKELY LIE — FALSE NON-OPERATIONAL / FORCED-RETREAT CLAIM", "March 13 Lincoln assessment changed")
    require(lincoln[0]["publication_status"] == "PUBLIC_READY", "March 13 Lincoln completed ruling remains blocked")

    qatar = [record for record in records if record.get("original_claim_id") == "IR-CLM-0702" and "waiting for months" in record.get("proposition", "")]
    require(len(qatar) == 1, "Qatar access-obstruction completed proposition missing or duplicated")
    require(qatar[0]["combined_assessment"] == "LIKELY LIE — ACCESS-OBSTRUCTION CLAIM", "Qatar access-obstruction assessment changed")
    require(qatar[0]["publication_status"] == "PUBLIC_READY", "Qatar completed ruling remains blocked")

    tanf = [record for record in records if record.get("chain_id") == "CH-TANF-JUL17"]
    require(len(tanf) == 3, "al-Tanf must render as exactly three atomic propositions")
    require(len({claim_instance_key(record) for record in tanf}) == 1, "al-Tanf three propositions do not resolve to one originating claim instance")
    require(len({record["proposition_id"] for record in tanf}) == 3, "al-Tanf atomic proposition identities are not unique")
    require(all(record["counts_as_unique_proposition"] for record in tanf), "al-Tanf atomic proposition excluded from unique proposition denominator")
    require(not any(record.get("claim_id") == "CL-TANF" for record in records), "legacy blended CL-TANF v2 record still double-counts the atomic decomposition")

    expected_metrics = recompute_metrics(records, len(chains))
    require(canonical.get("lie_ledger_v2_metrics") == expected_metrics, "canonical Lie Ledger v2 metrics do not independently reconcile")
    require(public_ledger.get("metrics") == expected_metrics, "public Lie Ledger metrics differ from canonical recomputation")

    canonical_by_id = {record["claim_instance_id"]: record for record in records}
    public_by_id = {record["claim_instance_id"]: record for record in public_rows}
    require(set(canonical_by_id) == set(public_by_id), "public/canonical Lie Ledger claim-instance sets differ")
    for claim_id, source in canonical_by_id.items():
        rendered = public_by_id[claim_id]
        require(rendered["truth_adjudication"] == source["truth_adjudication"], f"public model altered factual verdict {claim_id}")
        if source["publication_status"] == "PUBLIC_READY":
            require(rendered.get("public_knowledge_judgment") == source["knowledge_judgment"], f"public model altered knowledge judgment {claim_id}")
            require(rendered.get("public_combined_assessment") == source["combined_assessment"], f"public model altered combined assessment {claim_id}")
            require(rendered.get("canonical_assessment_withheld") is False, f"public-ready assessment unexpectedly withheld {claim_id}")
        elif source["publication_status"] == "BLOCKED_EVIDENCE_COMPLETION":
            require(rendered.get("canonical_assessment_withheld") is True, f"blocked knowledge assessment leaked publicly {claim_id}")
            require("knowledge_judgment" not in rendered, f"blocked knowledge accusation leaked publicly {claim_id}")
            require("combined_assessment" not in rendered, f"blocked combined accusation leaked publicly {claim_id}")
            require(rendered.get("public_combined_assessment") == "EVIDENCE COMPLETION REQUIRED", f"blocked public status incorrect {claim_id}")
            require(rendered.get("truth_adjudication") == source.get("truth_adjudication"), f"blocked knowledge qualification erased factual status {claim_id}")
        elif source["publication_status"] == "NOT_REASSESSED":
            require(rendered.get("canonical_assessment_withheld") is True, f"not-reassessed knowledge state was not withheld {claim_id}")
            require(rendered.get("public_knowledge_judgment") == "NOT_ASSESSED", f"not-reassessed public knowledge marker incorrect {claim_id}")

    public_blob = json.dumps(public_ledger, ensure_ascii=False).casefold()
    require("0 — no evidence" not in public_blob and "0 - no evidence" not in public_blob, "score-zero/no-evidence semantics returned to public v2 model")
    require("not_assessed_for_deception" not in public_blob, "obsolete NOT_ASSESSED_FOR_DECEPTION returned to public v2 model")
    require("verdict_authority" not in public_blob and "implementation_authority" not in public_blob, "persona authority leaked into public v2 model")

    print(
        "lie-ledger-v2: PASS "
        f"records={len(records)} chains={len(chains)} "
        f"unique={expected_metrics['unique_propositions']} "
        f"claims={expected_metrics['claim_instances']} "
        f"blockers={len(global_blockers)}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    args = parser.parse_args()
    validate(Path(args.root))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
