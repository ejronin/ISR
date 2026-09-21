#!/usr/bin/env python3
"""Extended public-OSINT, network and incremental helpers for Web of Lies.

This module is deliberately downstream of canonical Evidence Integration and
Claims Forensics. It validates Web-of-Lies-native public receipts, derives
propagation/circularity/independence summaries, and proves incremental rebuild
preserves unaffected family state while remaining byte-equivalent to a clean
full rebuild.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any, Iterable

PROVENANCE_EDGE_TYPES = {
    "DERIVES_FROM",
    "REPEATS",
    "SYNDICATES",
    "CIRCULARLY_DERIVED_FROM",
    "LAUNDERS_PROVENANCE",
    "REUSES_MEDIA_FROM",
    "MUTATES_INTO",
    "SUBSTITUTES_FOR",
}

CORRECTIVE_EVENT_TYPES = {"CORRECTION", "RETRACTION", "PREDICTION_CORRECTION"}

OPERATOR_LOCATION_CLASSES = {
    "PUBLICLY_CONFIRMED_OPERATOR_COUNTRY",
    "PUBLICLY_CONFIRMED_PLATFORM_LOCATION",
    "DOMAIN_REGISTRANT_COUNTRY",
    "HOSTING_INFRASTRUCTURE_COUNTRY",
    "ASN_NETWORK_LOCATION",
    "OPERATOR_LOCATION_UNKNOWN",
}

VPN_PROXY_STATUSES = {
    "VPN_OR_PROXY_PUBLICLY_ESTABLISHED",
    "VPN_OR_PROXY_POSSIBLE_NOT_ESTABLISHED",
}

RESEARCH_LEAD_DISPOSITIONS = {
    "PENDING_CLAIM_FIRST_RESEARCH",
    "MATERIAL_WOL_HISTORY_FOUND",
    "LIMITED_RELEVANT_ACTIVITY",
    "CARRIER_ONLY",
    "NO_MATERIAL_ATLAS_CLAIM_ACTIVITY_FOUND",
    "IDENTITY_UNRESOLVED",
    "UPSTREAM_REVIEW_REQUIRED",
}


def governance_set(governance: dict[str, Any], key: str) -> set[str]:
    return set(((governance.get("osint_collection") or {}).get(key) or []))


def _validate_public_receipt(
    owner_id: str,
    receipt: dict[str, Any],
    governance: dict[str, Any],
    seen_receipt_ids: set[str],
) -> None:
    receipt_id = str(receipt.get("receipt_id") or "").strip()
    if not receipt_id or receipt_id in seen_receipt_ids:
        raise ValueError(
            f"{owner_id} has duplicate or missing public receipt id {receipt_id!r}"
        )
    seen_receipt_ids.add(receipt_id)

    surface = str(receipt.get("surface") or "").strip()
    allowed_surfaces = governance_set(governance, "surfaces")
    if allowed_surfaces and surface not in allowed_surfaces:
        raise ValueError(f"{owner_id} has unsupported public receipt surface {surface}")

    url = str(receipt.get("url") or "").strip()
    archive_url = str(receipt.get("archive_url") or "").strip()
    if not url and not archive_url:
        raise ValueError(
            f"{owner_id} public receipt {receipt_id} has no public URL or archive URL"
        )

    provenance_status = str(receipt.get("provenance_status") or "").strip()
    allowed_provenance = governance_set(governance, "provenance_statuses")
    if allowed_provenance and provenance_status not in allowed_provenance:
        raise ValueError(
            f"{owner_id} public receipt {receipt_id} has unsupported provenance status "
            f"{provenance_status}"
        )

    deletion_status = str(receipt.get("deletion_status") or "AVAILABLE").strip()
    allowed_deletion = governance_set(governance, "deletion_statuses")
    if allowed_deletion and deletion_status not in allowed_deletion:
        raise ValueError(
            f"{owner_id} public receipt {receipt_id} has unsupported deletion status "
            f"{deletion_status}"
        )

    if provenance_status == "SCREENSHOT_ONLY":
        if receipt.get("original_verified") is True:
            raise ValueError(
                f"{owner_id} screenshot-only receipt {receipt_id} cannot claim "
                "verified original provenance"
            )
        if receipt.get("content_hash") and not receipt.get("capture_hash_scope"):
            raise ValueError(
                f"{owner_id} screenshot receipt {receipt_id} must state capture_hash_scope"
            )

    if surface == "WIKIPEDIA":
        if not (
            receipt.get("revision_id")
            or receipt.get("diff_url")
            or receipt.get("talk_section_url")
        ):
            raise ValueError(
                f"{owner_id} Wikipedia receipt {receipt_id} needs revision_id, "
                "diff_url, or talk_section_url"
            )

    if surface in {
        "HACKER_PUBLICATION",
        "HACKTIVIST_PUBLICATION",
        "CYBER_GROUP_PUBLICATION",
    }:
        if not receipt.get("claim_status"):
            raise ValueError(
                f"{owner_id} cyber-group receipt {receipt_id} must distinguish "
                "claimed from verified compromise"
            )


def validate_extended_forensic_input(
    forensic: dict[str, Any],
    governance: dict[str, Any],
) -> None:
    """Validate fields owned by the affirmative public-OSINT collection layer."""
    profiles = forensic.get("source_profiles") or []
    events = forensic.get("information_events") or []
    relationships = forensic.get("relationships") or []
    external_assessments = forensic.get("external_assessments") or []
    infrastructure_observations = forensic.get("infrastructure_observations") or []
    research_leads = forensic.get("research_leads") or []

    allowed_independence = governance_set(governance, "independence_statuses")
    allowed_assertion_kinds = governance_set(governance, "assertion_kinds")
    allowed_identity_confidence = governance_set(governance, "identity_confidence")
    allowed_relationship_types = governance_set(governance, "relationship_types")

    event_ids = {str(event.get("event_id") or "") for event in events}
    profile_ids = {str(profile.get("source_id") or "") for profile in profiles}
    seen_receipt_ids: set[str] = set()

    for profile in profiles:
        source_id = str(profile.get("source_id") or "")
        confidence = profile.get("identity_confidence")
        if (
            confidence
            and allowed_identity_confidence
            and confidence not in allowed_identity_confidence
        ):
            raise ValueError(
                f"source profile {source_id} has unsupported identity confidence {confidence}"
            )
        for receipt in profile.get("classification_basis_receipts") or []:
            _validate_public_receipt(
                f"source profile {source_id} classification basis",
                receipt,
                governance,
                seen_receipt_ids,
            )
        for receipt in profile.get("revenue_basis_receipts") or []:
            _validate_public_receipt(
                f"source profile {source_id} revenue basis",
                receipt,
                governance,
                seen_receipt_ids,
            )

        accounts = profile.get("platform_accounts") or []
        account_ids: set[str] = set()
        for account in accounts:
            account_id = str(account.get("account_id") or "").strip()
            if not account_id or account_id in account_ids:
                raise ValueError(
                    f"source profile {source_id} has duplicate or missing platform account id"
                )
            account_ids.add(account_id)
            if not account.get("platform"):
                raise ValueError(
                    f"source profile {source_id} platform account {account_id} lacks platform"
                )
            if not (account.get("handle") or account.get("url")):
                raise ValueError(
                    f"source profile {source_id} platform account {account_id} lacks handle/url"
                )

    seen_assessment_ids: set[str] = set()
    for assessment in external_assessments:
        assessment_id = str(assessment.get("assessment_id") or "").strip()
        if not assessment_id or assessment_id in seen_assessment_ids:
            raise ValueError(
                f"duplicate or missing external assessment id {assessment_id!r}"
            )
        seen_assessment_ids.add(assessment_id)
        source_id = str(assessment.get("source_id") or "").strip()
        if source_id not in profile_ids:
            raise ValueError(
                f"external assessment {assessment_id} references unknown source {source_id}"
            )
        for field in (
            "assessor",
            "assessor_url",
            "publication_date",
            "rating_classification",
            "assessment_scope",
            "methodology_summary",
            "caveat",
            "retrieval_date",
            "source_url",
        ):
            if not str(assessment.get(field) or "").strip():
                raise ValueError(
                    f"external assessment {assessment_id} lacks required {field}"
                )
        forbidden = {
            "hall_of_shame_rank",
            "hall_of_shame_score",
            "manual_rank",
            "manual_score",
            "featured_rank",
        }.intersection(assessment)
        if forbidden:
            raise ValueError(
                f"external assessment {assessment_id} contains forbidden Hall fields "
                f"{sorted(forbidden)}"
            )

    seen_observation_ids: set[str] = set()
    for observation in infrastructure_observations:
        observation_id = str(observation.get("observation_id") or "").strip()
        if not observation_id or observation_id in seen_observation_ids:
            raise ValueError(
                f"duplicate or missing infrastructure observation id {observation_id!r}"
            )
        seen_observation_ids.add(observation_id)
        source_id = str(observation.get("source_id") or "").strip()
        if source_id not in profile_ids:
            raise ValueError(
                f"infrastructure observation {observation_id} references unknown source "
                f"{source_id}"
            )
        for field in (
            "observation_type",
            "value",
            "observation_date",
            "source_url",
            "confidence",
            "inference_limit",
        ):
            if not str(observation.get(field) or "").strip():
                raise ValueError(
                    f"infrastructure observation {observation_id} lacks required {field}"
                )
        location_class = observation.get("operator_location_class")
        if location_class and location_class not in OPERATOR_LOCATION_CLASSES:
            raise ValueError(
                f"infrastructure observation {observation_id} has unsupported "
                f"operator_location_class {location_class}"
            )
        vpn_status = observation.get("vpn_proxy_status")
        if vpn_status and vpn_status not in VPN_PROXY_STATUSES:
            raise ValueError(
                f"infrastructure observation {observation_id} has unsupported "
                f"vpn_proxy_status {vpn_status}"
            )

    seen_lead_ids: set[str] = set()
    for lead in research_leads:
        lead_id = str(lead.get("lead_id") or "").strip()
        if not lead_id or lead_id in seen_lead_ids:
            raise ValueError(f"duplicate or missing research lead id {lead_id!r}")
        seen_lead_ids.add(lead_id)
        if not str(lead.get("display_name") or "").strip():
            raise ValueError(f"research lead {lead_id} lacks display_name")
        if not list(lead.get("seed_urls") or []):
            raise ValueError(f"research lead {lead_id} lacks seed_urls")
        disposition = str(lead.get("current_disposition") or "").strip()
        if disposition not in RESEARCH_LEAD_DISPOSITIONS:
            raise ValueError(
                f"research lead {lead_id} has unsupported disposition {disposition}"
            )
        if not str(lead.get("identity_status") or "").strip():
            raise ValueError(f"research lead {lead_id} lacks identity_status")

    for event in events:
        event_id = str(event.get("event_id") or "")
        public_receipts = list(event.get("public_receipts") or [])
        native_osint = bool(
            public_receipts
            or event.get("collection_surface")
            or event.get("osint_event_kind")
            or event.get("provenance_mode") == "PUBLIC_OSINT"
        )
        if native_osint and not list(event.get("evidence_source_ids") or []) and not public_receipts:
            raise ValueError(
                f"information event {event_id} needs a canonical evidence receipt "
                "or a public OSINT receipt"
            )
        for receipt in public_receipts:
            _validate_public_receipt(
                f"information event {event_id}",
                receipt,
                governance,
                seen_receipt_ids,
            )

        independence = event.get("independence_status")
        if (
            independence
            and allowed_independence
            and independence not in allowed_independence
        ):
            raise ValueError(
                f"information event {event_id} has unsupported independence status "
                f"{independence}"
            )
        legacy = event.get("independently_sourced")
        if independence == "INDEPENDENT" and legacy is False:
            raise ValueError(
                f"information event {event_id} conflicts on independence status"
            )
        if independence == "DERIVATIVE" and legacy is True:
            raise ValueError(
                f"information event {event_id} conflicts on independence status"
            )

        assertion_kind = event.get("assertion_kind")
        if (
            assertion_kind
            and allowed_assertion_kinds
            and assertion_kind not in allowed_assertion_kinds
        ):
            raise ValueError(
                f"information event {event_id} has unsupported assertion kind {assertion_kind}"
            )

        before = event.get("epistemic_posture_before")
        after = event.get("epistemic_posture_after")
        if bool(before) != bool(after):
            raise ValueError(
                f"information event {event_id} has incomplete epistemic transition"
            )

        for key in ("corrects_event_id", "subject_event_id", "supersedes_event_id"):
            target = event.get(key)
            if target and str(target) not in event_ids:
                raise ValueError(
                    f"information event {event_id} references unknown {key} {target}"
                )
            if target and str(target) == event_id:
                raise ValueError(
                    f"information event {event_id} cannot target itself via {key}"
                )

    for relation in relationships:
        rid = str(relation.get("relationship_id") or "")
        rtype = str(relation.get("relationship_type") or "")
        public_receipts = list(relation.get("public_receipts") or [])
        native_osint = bool(
            public_receipts
            or relation.get("collection_surface")
            or relation.get("provenance_mode") == "PUBLIC_OSINT"
        )
        if native_osint and allowed_relationship_types and rtype not in allowed_relationship_types:
            raise ValueError(
                f"relationship {rid} has unsupported relationship type {rtype}"
            )
        if native_osint and not list(relation.get("evidence_source_ids") or []) and not public_receipts:
            raise ValueError(
                f"relationship {rid} needs a canonical evidence receipt or a public OSINT receipt"
            )
        for receipt in public_receipts:
            _validate_public_receipt(
                f"relationship {rid}",
                receipt,
                governance,
                seen_receipt_ids,
            )


def corrected_target_ids(events: Iterable[dict[str, Any]]) -> set[str]:
    """Events later visibly corrected/retracted no longer count as uncorrected."""
    targets: set[str] = set()
    for event in events:
        if str(event.get("event_type") or "") not in CORRECTIVE_EVENT_TYPES:
            continue
        target = event.get("corrects_event_id") or event.get("subject_event_id")
        if target:
            targets.add(str(target))
    return targets


def direct_verdict(metrics: dict[str, int | None]) -> str | None:
    """Receipt-backed factual behavior summary; never a free-floating epithet."""
    clauses: list[str] = []
    pairs = [
        ("false_misleading_findings_connected", "false/misleading finding"),
        ("narrative_mutations_introduced", "material narrative mutation"),
        ("citation_laundering_events", "citation-laundering event"),
        (
            "continued_after_correction_incidents",
            "continuation after correction/contrary evidence",
        ),
        ("stealth_edits", "stealth edit"),
        ("victim_exploitation_incidents", "victim-exploitation incident"),
    ]
    for key, label in pairs:
        count = int(metrics.get(key) or 0)
        if count:
            clauses.append(
                f"{count} documented {label}{'' if count == 1 else 's'}"
            )
    if not clauses:
        return None
    return "Documented behavior: " + "; ".join(clauses) + "."


def _scc(nodes: set[str], edges: dict[str, set[str]]) -> list[list[str]]:
    index = 0
    stack: list[str] = []
    on_stack: set[str] = set()
    indices: dict[str, int] = {}
    lowlink: dict[str, int] = {}
    components: list[list[str]] = []

    def visit(node: str) -> None:
        nonlocal index
        indices[node] = index
        lowlink[node] = index
        index += 1
        stack.append(node)
        on_stack.add(node)

        for neighbor in sorted(edges.get(node, set())):
            if neighbor not in indices:
                visit(neighbor)
                lowlink[node] = min(lowlink[node], lowlink[neighbor])
            elif neighbor in on_stack:
                lowlink[node] = min(lowlink[node], indices[neighbor])

        if lowlink[node] == indices[node]:
            component: list[str] = []
            while True:
                current = stack.pop()
                on_stack.remove(current)
                component.append(current)
                if current == node:
                    break
            components.append(sorted(component))

    for node in sorted(nodes):
        if node not in indices:
            visit(node)
    return components


def event_independence(event: dict[str, Any]) -> str:
    explicit = event.get("independence_status")
    if explicit:
        return str(explicit)
    legacy = event.get("independently_sourced")
    if legacy is True:
        return "INDEPENDENT"
    if legacy is False:
        return "DERIVATIVE"
    return "UNKNOWN"


def derive_network_analysis(
    information_events: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
    profiles: list[dict[str, Any]],
) -> dict[str, Any]:
    event_by_id = {str(event["event_id"]): event for event in information_events}
    profile_by_id = {str(profile["source_id"]): profile for profile in profiles}

    family_events: dict[str, list[dict[str, Any]]] = defaultdict(list)
    family_relations: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in information_events:
        family_events[str(event["claim_family_id"])].append(event)
    for relation in relationships:
        families: set[str] = set()
        for endpoint in (str(relation["from_id"]), str(relation["to_id"])):
            if endpoint in event_by_id:
                families.add(str(event_by_id[endpoint]["claim_family_id"]))
        for family_id in families:
            family_relations[family_id].append(relation)

    family_rows: list[dict[str, Any]] = []
    surfaces: set[str] = set()
    total_edges = 0
    total_laundering = 0
    total_cycles = 0
    total_mutations = 0
    deletion_counts: dict[str, int] = defaultdict(int)
    correction_counts: dict[str, int] = defaultdict(int)

    for family_id in sorted(family_events):
        events = family_events[family_id]
        relations = family_relations.get(family_id, [])
        nodes = {str(event["event_id"]) for event in events}
        provenance_edges: dict[str, set[str]] = defaultdict(set)
        propagation_relationship_ids: list[str] = []

        for relation in relations:
            rtype = str(relation.get("relationship_type") or "")
            from_id = str(relation["from_id"])
            to_id = str(relation["to_id"])
            if (
                from_id in nodes
                and to_id in nodes
                and rtype in PROVENANCE_EDGE_TYPES
            ):
                provenance_edges[from_id].add(to_id)
                propagation_relationship_ids.append(
                    str(relation["relationship_id"])
                )

        cycles: list[list[str]] = []
        for component in _scc(nodes, provenance_edges):
            if len(component) > 1 or (
                len(component) == 1
                and component[0] in provenance_edges.get(component[0], set())
            ):
                cycles.append(component)

        independent_events = [
            event for event in events if event_independence(event) == "INDEPENDENT"
        ]
        derivative_events = [
            event for event in events if event_independence(event) == "DERIVATIVE"
        ]
        unknown_events = [
            event for event in events if event_independence(event) == "UNKNOWN"
        ]
        independent_identities = {
            str(
                (
                    profile_by_id.get(str(event["source_id"])) or {}
                ).get("stable_identity_id")
                or event["source_id"]
            )
            for event in independent_events
        }

        laundering_ids = {
            str(relation["relationship_id"])
            for relation in relations
            if str(relation.get("relationship_type") or "")
            == "LAUNDERS_PROVENANCE"
        }
        laundering_ids.update(
            str(event["event_id"])
            for event in events
            if str(event.get("event_type") or "") == "CITATION_LAUNDERING"
        )

        mutations = [
            event
            for event in events
            if str(event.get("event_type") or "") == "NARRATIVE_MUTATION"
        ]

        public_receipt_count = 0
        for event in events:
            for receipt in event.get("public_receipts") or []:
                public_receipt_count += 1
                if receipt.get("surface"):
                    surfaces.add(str(receipt["surface"]))
                if receipt.get("deletion_status"):
                    deletion_counts[str(receipt["deletion_status"])] += 1
            if event.get("correction_state"):
                correction_counts[str(event["correction_state"])] += 1

        total_edges += len(propagation_relationship_ids)
        total_laundering += len(laundering_ids)
        total_cycles += len(cycles)
        total_mutations += len(mutations)

        family_rows.append(
            {
                "claim_family_id": family_id,
                "documented_propagation_edges": len(
                    propagation_relationship_ids
                ),
                "propagation_relationship_ids": sorted(
                    propagation_relationship_ids
                ),
                "independent_corroboration_events": len(independent_events),
                "independent_source_identities": len(independent_identities),
                "derivative_repetition_events": len(derivative_events),
                "unknown_independence_events": len(unknown_events),
                "citation_laundering_findings": len(laundering_ids),
                "circular_source_components": cycles,
                "material_mutation_events": len(mutations),
                "public_receipt_count": public_receipt_count,
            }
        )

    return {
        "family_analysis": family_rows,
        "summary": {
            "documented_propagation_edges": total_edges,
            "citation_laundering_findings": total_laundering,
            "circular_source_findings": total_cycles,
            "material_mutation_findings": total_mutations,
            "social_platforms_represented": sorted(surfaces),
            "deletion_status_counts": dict(sorted(deletion_counts.items())),
            "correction_state_counts": dict(sorted(correction_counts.items())),
        },
    }


def derive_corpus_coverage(
    claim_families: list[dict[str, Any]],
    information_events: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
) -> dict[str, Any]:
    """Expose corpus-wide Web-of-Lies research coverage without claiming completeness."""
    family_ids = sorted(
        str(row.get("claim_family_id") or "").strip()
        for row in claim_families
        if str(row.get("claim_family_id") or "").strip()
    )
    event_by_id = {
        str(event["event_id"]): event for event in information_events
    }
    events_by_family: dict[str, list[dict[str, Any]]] = defaultdict(list)
    relationships_by_family: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for event in information_events:
        family_id = str(event.get("claim_family_id") or "").strip()
        if family_id:
            events_by_family[family_id].append(event)

    for relation in relationships:
        families: set[str] = set()
        for endpoint in (str(relation.get("from_id") or ""), str(relation.get("to_id") or "")):
            event = event_by_id.get(endpoint)
            if event:
                families.add(str(event.get("claim_family_id") or ""))
        for family_id in families:
            if family_id:
                relationships_by_family[family_id].append(relation)

    adverse_types = {
        "FALSE_OR_MISLEADING_CONNECTION",
        "NARRATIVE_MUTATION",
        "CITATION_LAUNDERING",
        "RECYCLED_MEDIA",
        "REPEAT_AFTER_CORRECTION",
        "DELETE_WITHOUT_CORRECTION",
        "FAILED_CLAIM_ABANDONED",
        "STEALTH_EDIT",
        "VICTIM_EXPLOITATION",
        "PREDICTION_FAILURE",
    }
    rows: list[dict[str, Any]] = []
    status_counts: dict[str, int] = defaultdict(int)
    families_with_public_receipts = 0

    for family_id in family_ids:
        events = events_by_family.get(family_id, [])
        anchors = [
            event
            for event in events
            if str(event.get("event_type") or "") == "CANONICAL_CLAIM_ANCHOR"
        ]
        non_anchor = [
            event
            for event in events
            if str(event.get("event_type") or "") != "CANONICAL_CLAIM_ANCHOR"
        ]
        relations = relationships_by_family.get(family_id, [])
        public_receipt_count = sum(
            len(event.get("public_receipts") or []) for event in non_anchor
        )
        public_osint_events = sum(
            1 for event in non_anchor if event.get("public_receipts")
        )
        origin_events = sum(
            1
            for event in non_anchor
            if "ORIGINATES" in set(event.get("lineage_roles") or [])
        )
        carrier_events = sum(
            1
            for event in non_anchor
            if set(event.get("lineage_roles") or []).intersection(
                {"REPORTS", "REPEATS", "AMPLIFIES", "SYNDICATES"}
            )
        )
        correction_events = sum(
            1
            for event in non_anchor
            if str(event.get("event_type") or "") in CORRECTIVE_EVENT_TYPES
            or event.get("correction_state")
        )
        adverse_events = sum(
            1
            for event in non_anchor
            if str(event.get("event_type") or "") in adverse_types
        )

        if not events:
            status = "CANONICAL_FAMILY_NO_LINEAGE"
        elif not non_anchor:
            status = "ANCHOR_ONLY"
        elif relations:
            status = "LINEAGE_TRACED"
        else:
            status = "LINEAGE_SEEDED"
        status_counts[status] += 1

        gaps: list[str] = []
        if not non_anchor:
            gaps.append("NO_NON_ANCHOR_LINEAGE")
        if len(non_anchor) > 1 and not relations:
            gaps.append("NO_DOCUMENTED_LINEAGE_EDGES")
        if non_anchor and public_receipt_count == 0:
            gaps.append("NO_WEB_OF_LIES_PUBLIC_OSINT_RECEIPTS")
        if public_receipt_count:
            families_with_public_receipts += 1

        rows.append(
            {
                "claim_family_id": family_id,
                "coverage_status": status,
                "canonical_anchor_events": len(anchors),
                "non_anchor_lineage_events": len(non_anchor),
                "documented_relationships": len(relations),
                "origin_events": origin_events,
                "carrier_or_amplifier_events": carrier_events,
                "correction_or_retraction_events": correction_events,
                "adverse_behavior_events": adverse_events,
                "public_osint_events": public_osint_events,
                "public_receipt_count": public_receipt_count,
                "research_gaps": gaps,
            }
        )

    return {
        "family_coverage": rows,
        "summary": {
            "canonical_claim_families": len(family_ids),
            "status_counts": dict(sorted(status_counts.items())),
            "families_with_non_anchor_lineage": sum(
                1 for row in rows if row["non_anchor_lineage_events"] > 0
            ),
            "families_without_non_anchor_lineage": sum(
                1 for row in rows if row["non_anchor_lineage_events"] == 0
            ),
            "families_with_public_osint_receipts": families_with_public_receipts,
            "families_without_public_osint_receipts": (
                len(family_ids) - families_with_public_receipts
            ),
        },
        "completion_claim": "NONE",
        "interpretation": (
            "Coverage measures documented tracing already present in Web of Lies; "
            "it does not assert that a family with lineage is exhaustively researched."
        ),
    }


def merge_incremental_with_full_equivalence(
    full: dict[str, Any],
    previous_registry: dict[str, Any],
    affected_family_ids: set[str],
    canonical_family_ids: set[str],
    canonical_state_identity: str,
    canonical_bytes,
) -> dict[str, Any]:
    previous_identity = str(
        (
            previous_registry.get("generated_from") or {}
        ).get("canonical_state_identity")
        or "UNKNOWN"
    )
    if previous_identity != canonical_state_identity:
        raise ValueError(
            "incremental rebuild refused stale previous canonical identity"
        )

    unknown = set(affected_family_ids) - canonical_family_ids
    if unknown:
        raise ValueError(
            "incremental rebuild references unknown affected families: "
            f"{sorted(unknown)}"
        )

    previous_family = {
        row["claim_family_id"]: row
        for row in previous_registry.get("claim_families") or []
    }
    full_family = {
        row["claim_family_id"]: row for row in full.get("claim_families") or []
    }
    candidate = dict(full)
    candidate["claim_families"] = [
        (
            full_family[family_id]
            if family_id in affected_family_ids
            or family_id not in previous_family
            else previous_family[family_id]
        )
        for family_id in sorted(canonical_family_ids)
    ]

    previous_network = {
        row["claim_family_id"]: row
        for row in (
            (previous_registry.get("network_analysis") or {}).get(
                "family_analysis"
            )
            or []
        )
    }
    full_network = {
        row["claim_family_id"]: row
        for row in (
            (full.get("network_analysis") or {}).get("family_analysis") or []
        )
    }
    candidate["network_analysis"] = dict(full["network_analysis"])
    candidate["network_analysis"]["family_analysis"] = [
        (
            full_network[family_id]
            if family_id in affected_family_ids
            or family_id not in previous_network
            else previous_network[family_id]
        )
        for family_id in sorted(full_network)
    ]

    previous_coverage = {
        row["claim_family_id"]: row
        for row in (
            (previous_registry.get("corpus_coverage") or {}).get("family_coverage")
            or []
        )
    }
    full_coverage = {
        row["claim_family_id"]: row
        for row in (
            (full.get("corpus_coverage") or {}).get("family_coverage") or []
        )
    }
    candidate["corpus_coverage"] = dict(full["corpus_coverage"])
    candidate["corpus_coverage"]["family_coverage"] = [
        (
            full_coverage[family_id]
            if family_id in affected_family_ids
            or family_id not in previous_coverage
            else previous_coverage[family_id]
        )
        for family_id in sorted(full_coverage)
    ]

    if canonical_bytes(candidate) != canonical_bytes(full):
        raise ValueError(
            "incremental rebuild diverges from clean full rebuild"
        )
    return candidate
