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

    coverage = registry["corpus_coverage"]
    coverage_rows = coverage["family_coverage"]
    coverage_families = {row["claim_family_id"] for row in coverage_rows}
    require(
        coverage_families == canonical_families,
        "corpus coverage does not span every canonical Lie Ledger family",
    )
    require(
        coverage["completion_claim"] == "NONE",
        "corpus coverage may not declare research completion",
    )
    coverage_summary = coverage["summary"]
    require(
        coverage_summary["canonical_claim_families"] == len(canonical_families),
        "corpus coverage family count differs from canonical Lie Ledger",
    )
    require(
        coverage_summary["families_with_non_anchor_lineage"]
        + coverage_summary["families_without_non_anchor_lineage"]
        == len(canonical_families),
        "corpus coverage non-anchor partition is incomplete",
    )
    require(
        coverage_summary["families_with_public_osint_receipts"]
        + coverage_summary["families_without_public_osint_receipts"]
        == len(canonical_families),
        "corpus coverage public-OSINT partition is incomplete",
    )
    for row in coverage_rows:
        if row["coverage_status"] == "ANCHOR_ONLY":
            require(
                row["non_anchor_lineage_events"] == 0
                and "NO_NON_ANCHOR_LINEAGE" in row["research_gaps"],
                f"anchor-only family {row['claim_family_id']} lacks an explicit research gap",
            )

    propagation = registry["propagation_graph"]
    require(
        propagation["graph_type"] == "BULLSHITTER_MEGAPHONE_NETWORK",
        "public propagation graph has an unsupported graph type",
    )
    graph_nodes = {row["node_id"]: row for row in propagation["nodes"]}
    require(
        len(graph_nodes) == len(propagation["nodes"]),
        "public propagation graph contains duplicate node ids",
    )
    graph_edges = propagation["edges"]
    require(
        len({row["edge_id"] for row in graph_edges}) == len(graph_edges),
        "public propagation graph contains duplicate edge ids",
    )
    for node in graph_nodes.values():
        roles = set(node.get("node_roles") or [])
        require(bool(roles), f"propagation node {node['node_id']} lacks explicit node roles")
        if node["node_type"] == "BULLSHITTER":
            require(
                "BULLSHITTER" in roles,
                f"Bullshitter node {node['node_id']} lacks Bullshitter role",
            )
        if int(node.get("bullshitter_source_count") or 0) >= 1:
            require(
                "AMPLIFIER" in roles,
                f"propagation node {node['node_id']} has incoming bullshit but lacks amplifier role",
            )
        if node["node_type"] == "MEGAPHONE":
            require(
                roles == {"AMPLIFIER"},
                f"megaphone {node['node_id']} has unsupported node roles {sorted(roles)}",
            )
    for edge in graph_edges:
        source = graph_nodes.get(edge["from_node_id"])
        target = graph_nodes.get(edge["to_node_id"])
        require(source is not None and target is not None, f"propagation edge {edge['edge_id']} has a missing endpoint")
        require(source["node_type"] == "BULLSHITTER", f"propagation edge {edge['edge_id']} does not originate at a Bullshitter")
        require("BULLSHITTER" in source.get("award_codes", []), f"propagation source {source['node_id']} lacks the earned award")
        require(
            target["node_type"] in {"MEGAPHONE", "BULLSHITTER"},
            f"propagation edge {edge['edge_id']} has an unsupported target node type",
        )
        if target["node_type"] == "MEGAPHONE":
            require(
                not target.get("award_codes"),
                f"megaphone {target['node_id']} inherited an award from network position",
            )
        else:
            require(
                "BULLSHITTER" in target.get("award_codes", []),
                f"dual-role target {target['node_id']} is marked Bullshitter without an independently earned award",
            )
        require(
            int(target.get("bullshitter_source_count") or 0) >= 1,
            f"propagation target {target['node_id']} is not marked as a megaphone role",
        )
        require(edge["relationship_type"] == "AMPLIFIES_BULLSHIT", f"propagation edge {edge['edge_id']} has the wrong relationship type")
        expected_scope = (
            "SELF_AMPLIFICATION"
            if edge["from_node_id"] == edge["to_node_id"]
            else "EXTERNAL_AMPLIFICATION"
        )
        require(
            edge.get("amplification_scope") == expected_scope,
            f"propagation edge {edge['edge_id']} has inconsistent amplification scope",
        )
        require(edge["amplified_claim_count"] == len(edge["bullshitter_event_ids"]), f"propagation edge {edge['edge_id']} claim count is inconsistent")
        require(bool(edge.get("public_receipts")), f"propagation edge {edge['edge_id']} has no amplifier receipt")
    graph_summary = propagation["summary"]
    require(graph_summary["bullshitter_nodes"] == sum(1 for row in graph_nodes.values() if row["node_type"] == "BULLSHITTER"), "propagation Bullshitter node count is inconsistent")
    require(
        graph_summary["megaphone_nodes"]
        == sum(1 for row in graph_nodes.values() if int(row.get("bullshitter_source_count") or 0) >= 1),
        "propagation megaphone-role node count is inconsistent",
    )
    require(graph_summary["amplification_edges"] == len(graph_edges), "propagation edge count is inconsistent")
    require(
        graph_summary["self_amplification_edges"]
        == sum(1 for row in graph_edges if row.get("amplification_scope") == "SELF_AMPLIFICATION"),
        "propagation self-amplification edge count is inconsistent",
    )
    require(
        graph_summary["external_amplification_edges"]
        == sum(1 for row in graph_edges if row.get("amplification_scope") == "EXTERNAL_AMPLIFICATION"),
        "propagation external-amplification edge count is inconsistent",
    )
    require(
        graph_summary["network_pattern_nodes"]
        == sum(
            1 for row in graph_nodes.values()
            if int(row.get("external_upstream_source_count") or 0) >= 5
        ),
        "propagation network-pattern node count is inconsistent",
    )
    require(
        graph_summary["high_density_hub_nodes"]
        == sum(
            1 for row in graph_nodes.values()
            if int(row.get("external_upstream_source_count") or 0) >= 10
        ),
        "propagation high-density hub count is inconsistent",
    )

    network = registry["network_analysis"]
    summary = network["summary"]
    require(
        summary["documented_propagation_edges"] >= 0,
        "network analysis has invalid propagation-edge count",
    )
    require(
        summary["citation_laundering_findings"] >= 0
        and summary["circular_source_findings"] >= 0
        and summary["material_mutation_findings"] >= 0,
        "network analysis has invalid forensic finding counts",
    )
    incremental = registry["incremental_rebuild_contract"]
    require(all(incremental.values()), "incremental rebuild contract is not fail-closed/equivalent")

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
        "A Wikipedia edit is an information event, not proof",
        "A group saying “we hacked X” does not establish either the compromise",
        "produces bytes equivalent to a clean full rebuild",
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
