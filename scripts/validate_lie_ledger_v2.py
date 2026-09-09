#!/usr/bin/env python3
"""Validate Lie Ledger v2 doctrine, evidence support, metrics and public projection.

This validator enforces representation and evidentiary integrity. It never decides
whether ROOK's substantive adjudication was analytically correct.
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
SCHEMA = "schemas/lie-ledger-v2.json"
DOCTRINE = "ROOK-20260909-1"
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


def recompute_metrics(records: list[dict[str, Any]], chain_count: int) -> dict[str, Any]:
    factual = Counter()
    knowledge = Counter()
    unique_ids: set[str] = set()
    originations = amplifications = corrections = retractions = substitutions = media = claims = 0
    for record in records:
        if record.get("authority_status") != "ROOK_ADJUDICATED":
            continue
        claims += 1
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
        if record.get("authority_status") == "ROOK_ADJUDICATED"
        and record.get("counts_as_unique_proposition")
        and record.get("truth_adjudication") in FALSY
    }
    resolved_unique = {
        record["proposition_id"]
        for record in records
        if record.get("authority_status") == "ROOK_ADJUDICATED"
        and record.get("counts_as_unique_proposition")
        and record.get("truth_adjudication") != "UNRESOLVED"
    }
    pct = round(100.0 * len(falsy_unique) / len(resolved_unique), 2) if resolved_unique else None
    return {
        "unique_propositions": len(unique_ids),
        "claim_instances": claims,
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
                "numerator_definition": "Unique ROOK-adjudicated propositions classified FALSE or MISLEADING.",
                "denominator_definition": "Unique ROOK-adjudicated propositions with a resolved factual status; UNRESOLVED excluded."
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
    require(canonical.get("lie_ledger_v2_authority", {}).get("verdict_authority") == "ROOK", "ROOK verdict authority is not pinned")
    require(canonical.get("lie_ledger_v2_authority", {}).get("implementation_authority") == "PR/CI", "PR/CI implementation authority is not pinned")
    require(canonical.get("release", {}).get("lie_ledger_doctrine_version") == DOCTRINE, "canonical doctrine version mismatch")
    require((public.get("gate3") or {}).get("lie_ledger", {}).get("doctrine_version") == DOCTRINE, "public doctrine version mismatch")
    require((public.get("gate3") or {}).get("lie_ledger", {}).get("primary_object") == "NARRATIVE_PROPOSITION_CHAIN", "public primary object is not narrative/proposition chain")

    if jsonschema is not None:
        for record in records:
            jsonschema.Draft202012Validator(schema).validate(record)

    known_sources = source_ids(canonical)
    for record in records:
        assert_no_active_deception_score(record)
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

    # False factual status cannot automatically manufacture a lie finding.
    require(
        any(
            record["truth_adjudication"] == "FALSE"
            and record["knowledge_judgment"] not in STRONG
            for record in records
        ),
        "anti-regression corpus lacks a false proposition with knowledge below likely-lie threshold"
    )

    # Direct mental-state evidence is not a prerequisite for estimative knowledge.
    require(
        any(
            record["knowledge_judgment"] in {"LIKELY_KNEW_FALSE", "VERY_LIKELY_KNEW_FALSE"}
            and any(ind.get("indicator") == "ROOK_KNOWLEDGE_BASIS" for ind in record.get("knowledge_indicators") or [])
            for record in records
        ),
        "estimative knowledge is not represented through circumstantial/institutional evidence"
    )

    # Source proposition fidelity hard-stop: the 16-fighter source said hit, not destroyed/downed.
    sixteen = [
        record for record in records
        if record.get("original_claim_id") == "IR-CLM-0604"
        and record.get("authority_status") == "ROOK_ADJUDICATED"
    ]
    require(sixteen, "IR-CLM-0604 v2 proposition missing")
    require(any(record["proposition"] == "At least 16 enemy fighters were hit." for record in sixteen), "IR-CLM-0604 source wording not restored to hit")
    require(all("destroy" not in record["proposition"].casefold() and "downed" not in record["proposition"].casefold() for record in sixteen), "IR-CLM-0604 proposition strengthened beyond source")

    # Publisher framing remains a separate claim instance from the quoted/source-body proposition.
    headline = [record for record in records if record.get("proposition_id") == "PROP-IR-210-DOWNED-HEADLINE"]
    require(len(headline) == 1, "210-aircraft publisher headline proposition missing or duplicated")
    require(headline[0]["actor"] == "Press TV", "publisher headline silently attributed to source speaker")
    require(headline[0]["proposition_axis"] == "PUBLISHER_FRAMING", "publisher framing not structurally separated")

    expected_metrics = recompute_metrics(records, len(chains))
    require(canonical.get("lie_ledger_v2_metrics") == expected_metrics, "canonical Lie Ledger v2 metrics do not independently reconcile")
    require((public.get("gate3") or {}).get("lie_ledger", {}).get("metrics") == expected_metrics, "public Lie Ledger metrics differ from canonical recomputation")

    canonical_by_id = {record["claim_instance_id"]: record for record in records}
    public_by_id = {record["claim_instance_id"]: record for record in public_rows}
    require(set(canonical_by_id) == set(public_by_id), "public/canonical Lie Ledger claim-instance sets differ")
    for claim_id, source in canonical_by_id.items():
        rendered = public_by_id[claim_id]
        require(rendered["truth_adjudication"] == source["truth_adjudication"], f"renderer/public model altered factual verdict {claim_id}")
        if source["publication_status"] == "PUBLIC_READY":
            require(rendered.get("public_knowledge_judgment") == source["knowledge_judgment"], f"public model altered ROOK knowledge judgment {claim_id}")
            require(rendered.get("public_combined_assessment") == source["combined_assessment"], f"public model altered ROOK combined assessment {claim_id}")
            require(not rendered.get("canonical_rook_assessment_withheld"), f"public-ready verdict unexpectedly withheld {claim_id}")
        elif source["publication_status"] == "BLOCKED_EVIDENCE_COMPLETION":
            require(rendered.get("canonical_rook_assessment_withheld") is True, f"blocked ROOK verdict leaked publicly {claim_id}")
            require("knowledge_judgment" not in rendered, f"blocked knowledge accusation leaked publicly {claim_id}")
            require("combined_assessment" not in rendered, f"blocked combined accusation leaked publicly {claim_id}")
            require(rendered.get("public_combined_assessment") == "EVIDENCE COMPLETION REQUIRED", f"blocked public status incorrect {claim_id}")

    # NOT_ASSESSED is a workflow state, not the old score-zero/no-evidence claim.
    public_blob = json.dumps((public.get("gate3") or {}).get("lie_ledger") or {}, ensure_ascii=False).casefold()
    require("0 — no evidence" not in public_blob and "0 - no evidence" not in public_blob, "score-zero/no-evidence semantics returned to public v2 model")
    require("not_assessed_for_deception" not in public_blob, "obsolete NOT_ASSESSED_FOR_DECEPTION returned to public v2 model")

    print(
        "lie-ledger-v2: PASS "
        f"records={len(records)} chains={len(chains)} "
        f"unique={expected_metrics['unique_propositions']} "
        f"blockers={len(canonical.get('lie_ledger_v2_publication_blockers') or [])}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    args = parser.parse_args()
    validate(Path(args.root))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
