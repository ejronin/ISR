#!/usr/bin/env python3
"""Validate the Web of Lies derived forensic registry and authority boundary."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import jsonschema

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_web_of_lies as wol

SCHEMA = "schemas/web-of-lies-forensic-registry-v1.json"


def load(relative_path: str) -> dict[str, Any]:
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL {message}")


def main() -> int:
    canonical = load(wol.CANONICAL)
    forensic = load(wol.FORENSIC_INPUT)
    governance = load(wol.GOVERNANCE)
    registry = load(wol.OUTPUT)
    schema = load(SCHEMA)

    jsonschema.Draft202012Validator(schema).validate(registry)

    expected = wol.build_registry(canonical, forensic, governance)
    require(registry == expected, "derived registry differs from deterministic builder output")

    canonical_families = {
        str(wol.unwrap(item).get("chain_id") or item.get("entity_id") or "").strip()
        for item in ((canonical.get("entities") or {}).get("lie_ledger_chains_v2") or [])
    }
    canonical_families.discard("")
    derived_families = {row["claim_family_id"] for row in registry["claim_families"]}
    require(derived_families == canonical_families, "claim-family set differs from canonical Lie Ledger chains")

    hall = registry["hall_of_shame"]
    require(hall["manual_selection"] is False, "Hall of Shame permits manual selection")
    require(hall["top_n_per_class"] == 3, "Hall of Shame top-N changed from three")

    profile_by_id = {row["source_id"]: row for row in registry["source_profiles"]}
    for view_name in ("all_time", "current_period"):
        for source_class, entries in (hall.get(view_name) or {}).items():
            require(len(entries) <= 3, f"{view_name}/{source_class} exceeds top three")
            require([row["rank"] for row in entries] == list(range(1, len(entries) + 1)),
                    f"{view_name}/{source_class} ranks are not contiguous")
            scores = [float(row["score"]) for row in entries]
            require(scores == sorted(scores, reverse=True),
                    f"{view_name}/{source_class} is not ordered by score")
            for row in entries:
                profile = profile_by_id.get(row["source_id"])
                require(profile is not None, f"{view_name}/{source_class} references missing source profile")
                require(source_class in profile["behavior_classes"],
                        f"{view_name}/{source_class} ranks a source outside that class")
                require(row["why_this_source_appears_here"] == wol.explanation(row["ranking_basis"]),
                        f"{view_name}/{source_class} explanation is not metric-derived")

    governance_hall = governance.get("hall_of_shame") or {}
    require(governance_hall.get("manual_selection_allowed") is False,
            "governance permits manual Hall of Shame selection")
    prohibited = set(governance_hall.get("prohibited_ranking_inputs") or [])
    score_inputs = set(wol.SCORE_WEIGHTS)
    require(not prohibited.intersection(score_inputs),
            "Hall of Shame score uses a prohibited popularity/identity input")

    contract = (ROOT / governance["controlling_contract"]).read_text(encoding="utf-8")
    for phrase in (
        "publication into evidence",
        "repetition into corroboration",
        "different outlet into an independent origin",
        "Prove the pattern. Then call the pattern what it is.",
    ):
        require(phrase in contract, f"controlling contract lost invariant: {phrase}")

    print(
        "web-of-lies validation: PASS "
        f"families={len(registry['claim_families'])} "
        f"sources={len(registry['source_profiles'])} "
        f"events={len(registry['information_events'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
