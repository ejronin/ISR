#!/usr/bin/env python3
"""Build the Web of Lies derived forensic registry.

The builder consumes the already-built canonical current state plus the
independent Web of Lies forensic input registry. It never rewrites canonical
Evidence or Lie Ledger adjudication. Hall of Shame output is deterministic and
is derived only from documented information events and source classifications.
"""
from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import web_of_lies_network as wol_network

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = "data/canonical-current-state-v2.json"
FORENSIC_INPUT = "data/web-of-lies/forensic-records.json"
GOVERNANCE = "config/web-of-lies-governance.json"
OUTPUT = "data/web-of-lies/derived-registry.json"
CONTRACT = "docs/WEB_OF_LIES_INFORMATION_FORENSICS_CONTRACT.md"

METRIC_EVENT_TYPES = {
    "FALSE_OR_MISLEADING_CONNECTION": "false_misleading_findings_connected",
    "NARRATIVE_MUTATION": "narrative_mutations_introduced",
    "CITATION_LAUNDERING": "citation_laundering_events",
    "RECYCLED_MEDIA": "recycled_media_incidents",
    "CORRECTION": "corrections_issued",
    "REPEAT_AFTER_CORRECTION": "continued_after_correction_incidents",
    "DELETE_WITHOUT_CORRECTION": "failed_claims_deleted_or_abandoned",
    "FAILED_CLAIM_ABANDONED": "failed_claims_deleted_or_abandoned",
    "STEALTH_EDIT": "stealth_edits",
    "VICTIM_EXPLOITATION": "victim_exploitation_incidents",
    "UNIQUE_PROPAGATION": "unique_propagation_events",
    "PREDICTION_FAILURE": "prediction_failures",
    "PREDICTION_CORRECTION": "prediction_corrections",
}

ADVERSE_FAMILY_EVENT_TYPES = {
    "FALSE_OR_MISLEADING_CONNECTION",
    "NARRATIVE_MUTATION",
    "CITATION_LAUNDERING",
    "RECYCLED_MEDIA",
    "REPEAT_AFTER_CORRECTION",
    "DELETE_WITHOUT_CORRECTION",
    "FAILED_CLAIM_ABANDONED",
    "STEALTH_EDIT",
    "VICTIM_EXPLOITATION",
    "UNIQUE_PROPAGATION",
    "PREDICTION_FAILURE",
}

SCORE_WEIGHTS = {
    "claim_families_traced": 2.0,
    "false_misleading_findings_connected": 6.0,
    "narrative_mutations_introduced": 5.0,
    "citation_laundering_events": 5.0,
    "recycled_media_incidents": 5.0,
    "corrections_issued": -2.0,
    "continued_after_correction_incidents": 6.0,
    "failed_claims_deleted_or_abandoned": 3.0,
    "stealth_edits": 4.0,
    "victim_exploitation_incidents": 7.0,
    "unique_propagation_events": 2.0,
    "prediction_failures": 2.0,
    "prediction_corrections": -1.0,
}

LOWER_THRESHOLD_CLASSES = {
    "CONFIRMED_BOT",
    "COORDINATED_INFLUENCE",
    "FINANCIAL_SHILL",
    "ORGANIZATIONAL_SHILL",
}

DISALLOWED_MANUAL_RANK_FIELDS = {
    "hall_of_shame_rank",
    "hall_of_shame_score",
    "manual_rank",
    "manual_score",
    "featured_rank",
    "source_awards",
}


def load_json(root: Path, relative_path: str) -> dict[str, Any]:
    path = root / relative_path
    return json.loads(path.read_text(encoding="utf-8"))


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def unwrap(item: dict[str, Any]) -> dict[str, Any]:
    record = item.get("record")
    return record if isinstance(record, dict) else item


def unique_strings(values: Any) -> list[str]:
    return sorted({str(value).strip() for value in (values or []) if str(value).strip()})


def parse_time(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        try:
            parsed = datetime.fromisoformat(text[:10])
        except ValueError:
            return None
    if parsed.tzinfo is not None:
        parsed = parsed.replace(tzinfo=None)
    return parsed


def canonical_source_id_set(canonical: dict[str, Any]) -> set[str]:
    records = ((canonical.get("sources") or {}).get("records") or [])
    result: set[str] = set()
    for item in records:
        record = unwrap(item)
        source_id = str(record.get("source_id") or item.get("source_id") or "").strip()
        if source_id:
            result.add(source_id)
    return result


def chain_adjudication(record: dict[str, Any]) -> str | None:
    for key in (
        "public_adjudication",
        "chain_adjudication",
        "truth_adjudication",
        "classification",
        "current_finding",
    ):
        value = record.get(key)
        if value:
            return str(value)
    return None


def derive_claim_families(
    canonical: dict[str, Any],
    information_events: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    events_by_family: dict[str, list[str]] = defaultdict(list)
    relations_by_family: dict[str, list[str]] = defaultdict(list)

    event_family_by_id = {}
    for event in information_events:
        event_id = str(event["event_id"])
        family_id = str(event["claim_family_id"])
        event_family_by_id[event_id] = family_id
        events_by_family[family_id].append(event_id)

    for relation in relationships:
        rid = str(relation["relationship_id"])
        from_family = event_family_by_id.get(str(relation["from_id"]))
        to_family = event_family_by_id.get(str(relation["to_id"]))
        for family_id in {from_family, to_family} - {None}:
            relations_by_family[str(family_id)].append(rid)

    families = []
    for wrapped in ((canonical.get("entities") or {}).get("lie_ledger_chains_v2") or []):
        record = unwrap(wrapped)
        chain_id = str(record.get("chain_id") or wrapped.get("entity_id") or "").strip()
        if not chain_id:
            continue
        event_ids = sorted(set(events_by_family.get(chain_id, [])))
        relationship_ids = sorted(set(relations_by_family.get(chain_id, [])))
        if not event_ids:
            trace_status = "UNTRACED"
        elif relationship_ids:
            trace_status = "TRACED"
        else:
            trace_status = "PARTIAL"
        title = (
            record.get("public_title")
            or record.get("title")
            or record.get("reader_title")
            or chain_id
        )
        source_ids = unique_strings(
            list(record.get("source_ids") or [])
            + list(wrapped.get("source_ids") or [])
        )
        families.append({
            "claim_family_id": chain_id,
            "canonical_chain_id": chain_id,
            "title": str(title),
            "canonical_adjudication": chain_adjudication(record),
            "source_ids": source_ids,
            "trace_status": trace_status,
            "information_event_ids": event_ids,
            "relationship_ids": relationship_ids,
        })
    return sorted(families, key=lambda item: item["claim_family_id"])


def validate_forensic_input(
    forensic: dict[str, Any],
    governance: dict[str, Any],
    claim_family_ids: set[str],
    canonical_source_ids: set[str],
) -> None:
    if forensic.get("artifact_role") != "WEB_OF_LIES_FORENSIC_INPUT":
        raise ValueError("unexpected Web of Lies forensic input role")
    if forensic.get("authority") != "WEB_OF_LIES_INFORMATION_FORENSICS":
        raise ValueError("unexpected Web of Lies forensic input authority")

    profiles = forensic.get("source_profiles") or []
    events = forensic.get("information_events") or []
    relationships = forensic.get("relationships") or []
    flags = forensic.get("promotion_flags") or []
    source_behavior_incidents = forensic.get("source_behavior_incidents") or []

    allowed_classes = set(governance.get("source_behavior_classes") or [])
    allowed_authenticity = set(governance.get("authenticity_classes") or [])
    allowed_revenue = set(governance.get("revenue_classes") or [])
    allowed_correction = set(governance.get("correction_states") or [])
    allowed_moral_findings = set(governance.get("moral_severity_findings") or [])
    allowed_flags = set((governance.get("authority") or {}).get("promotion_flags") or [])
    receipt_backed_descriptive_classes = set(
        (governance.get("profile_evidence") or {}).get(
            "receipt_backed_descriptive_classes"
        )
        or []
    )
    source_ids: set[str] = set()
    for profile in profiles:
        forbidden = DISALLOWED_MANUAL_RANK_FIELDS.intersection(profile)
        if forbidden:
            raise ValueError(f"manual Hall of Shame fields are forbidden: {sorted(forbidden)}")
        source_id = str(profile.get("source_id") or "").strip()
        if not source_id or source_id in source_ids:
            raise ValueError(f"duplicate or missing source profile id: {source_id!r}")
        source_ids.add(source_id)
        classes = set(profile.get("behavior_classes") or [])
        if not classes:
            raise ValueError(f"source profile {source_id} must state at least one behavior class, including UNKNOWN when uncharacterized")
        unknown_classes = classes - allowed_classes
        if unknown_classes:
            raise ValueError(f"unknown source behavior classes for {source_id}: {sorted(unknown_classes)}")
        authenticity = str(profile.get("authenticity_class") or "UNKNOWN")
        if authenticity not in allowed_authenticity:
            raise ValueError(f"unknown authenticity class for {source_id}: {authenticity}")
        profile_receipts = set(profile.get("canonical_source_ids") or [])
        missing_profile_receipts = profile_receipts - canonical_source_ids
        if missing_profile_receipts:
            raise ValueError(
                f"source profile {source_id} references non-canonical source receipts: {sorted(missing_profile_receipts)}"
            )
        revenue = set(profile.get("revenue_model") or [])
        if not revenue:
            raise ValueError(f"source profile {source_id} must state a revenue model, including UNKNOWN_REVENUE_MODEL when unknown")
        if revenue - allowed_revenue:
            raise ValueError(f"unknown revenue class for {source_id}: {sorted(revenue - allowed_revenue)}")

    event_ids: set[str] = set()
    events_by_id: dict[str, dict[str, Any]] = {}
    events_by_source: dict[str, set[str]] = defaultdict(set)
    for event in events:
        event_id = str(event.get("event_id") or "").strip()
        if not event_id or event_id in event_ids:
            raise ValueError(f"duplicate or missing information event id: {event_id!r}")
        event_ids.add(event_id)
        events_by_id[event_id] = event
        source_id = str(event.get("source_id") or "").strip()
        if source_id not in source_ids:
            raise ValueError(f"information event {event_id} references unknown source profile {source_id}")
        family_id = str(event.get("claim_family_id") or "").strip()
        if family_id not in claim_family_ids:
            raise ValueError(f"information event {event_id} references unknown canonical claim family {family_id}")
        correction_state = event.get("correction_state")
        if correction_state and correction_state not in allowed_correction:
            raise ValueError(f"information event {event_id} has unknown correction state {correction_state}")
        behavior_findings = set(event.get("behavior_findings") or [])
        unsupported_behavior = behavior_findings - allowed_classes - allowed_moral_findings
        if unsupported_behavior:
            raise ValueError(f"information event {event_id} has unsupported behavior findings: {sorted(unsupported_behavior)}")
        event_type = str(event.get("event_type") or "")
        if event_type in UNSUPPORTED_BULLSHIT_EVENT_TYPES and not unsupported_evidence_gate_satisfied(event, governance):
            raise ValueError(
                f"information event {event_id} cannot claim {event_type} without "
                "a documented no-support evidentiary review"
            )
        carrier_ids = set(event.get("carrier_profile_ids") or [])
        missing_carriers = carrier_ids - source_ids
        if missing_carriers:
            raise ValueError(
                f"information event {event_id} references unknown carrier profiles: {sorted(missing_carriers)}"
            )
        receipt_ids = set(event.get("evidence_source_ids") or []) | set(event.get("contrary_evidence_source_ids") or [])
        missing_receipts = receipt_ids - canonical_source_ids
        if missing_receipts:
            raise ValueError(
                f"information event {event_id} references non-canonical source receipts: {sorted(missing_receipts)}"
            )
        revenue_findings = set(event.get("revenue_findings") or [])
        unsupported_revenue = revenue_findings - allowed_revenue
        if unsupported_revenue:
            raise ValueError(f"information event {event_id} has unsupported revenue findings: {sorted(unsupported_revenue)}")
        events_by_source[source_id].add(event_id)

    incident_ids: set[str] = set()
    for incident in source_behavior_incidents:
        incident_id = str(incident.get("incident_id") or "").strip()
        if not incident_id or incident_id in incident_ids:
            raise ValueError(
                f"duplicate or missing source behavior incident id: {incident_id!r}"
            )
        incident_ids.add(incident_id)
        source_id = str(incident.get("source_id") or "").strip()
        if source_id not in source_ids:
            raise ValueError(
                f"source behavior incident {incident_id} references unknown source profile {source_id}"
            )
        event_type = str(incident.get("event_type") or "")
        if event_type not in UNSUPPORTED_BULLSHIT_EVENT_TYPES:
            raise ValueError(
                f"source behavior incident {incident_id} has unsupported event type {event_type}"
            )
        if not unsupported_evidence_gate_satisfied(incident, governance):
            raise ValueError(
                f"source behavior incident {incident_id} lacks the documented "
                "no-support evidentiary review required for WOL-native scoring"
            )
        if not list(incident.get("public_receipts") or []):
            raise ValueError(
                f"source behavior incident {incident_id} has no public receipts"
            )

    amplification_observations = forensic.get("amplification_observations") or []
    amplification_ids: set[str] = set()
    allowed_authenticity = set(governance.get("authenticity_classes") or [])
    for observation in amplification_observations:
        observation_id = str(observation.get("observation_id") or "").strip()
        if not observation_id or observation_id in amplification_ids:
            raise ValueError(
                f"duplicate or missing amplification observation id: {observation_id!r}"
            )
        amplification_ids.add(observation_id)
        bullshitter_source_id = str(observation.get("bullshitter_source_id") or "").strip()
        bullshitter_event_id = str(observation.get("bullshitter_event_id") or "").strip()
        if bullshitter_source_id not in source_ids:
            raise ValueError(
                f"amplification observation {observation_id} references unknown "
                f"Bullshitter source {bullshitter_source_id}"
            )
        upstream_event = events_by_id.get(bullshitter_event_id)
        if upstream_event is None:
            upstream_event = next(
                (
                    incident
                    for incident in source_behavior_incidents
                    if str(incident.get("incident_id") or "") == bullshitter_event_id
                ),
                None,
            )
        if upstream_event is None:
            raise ValueError(
                f"amplification observation {observation_id} references unknown "
                f"Bullshitter qualifying event {bullshitter_event_id}"
            )
        if str(upstream_event.get("source_id") or "") != bullshitter_source_id:
            raise ValueError(
                f"amplification observation {observation_id} event/source mismatch: "
                f"{bullshitter_event_id} != {bullshitter_source_id}"
            )
        if not bullshit_qualifying_event(upstream_event, governance):
            raise ValueError(
                f"amplification observation {observation_id} references "
                f"non-qualifying upstream event {bullshitter_event_id}"
            )
        amplifier_id = str(observation.get("amplifier_id") or "").strip()
        if not amplifier_id:
            raise ValueError(
                f"amplification observation {observation_id} lacks amplifier_id"
            )
        authenticity = observation.get("amplifier_authenticity_class")
        if authenticity and authenticity not in allowed_authenticity:
            raise ValueError(
                f"amplification observation {observation_id} has unsupported "
                f"amplifier authenticity {authenticity}"
            )
        country_code = str(observation.get("amplifier_country_code") or "").strip()
        if country_code and (len(country_code) != 2 or country_code.upper() != country_code):
            raise ValueError(
                f"amplification observation {observation_id} has invalid country code {country_code}"
            )
        if not list(observation.get("public_receipts") or []):
            raise ValueError(
                f"amplification observation {observation_id} has no public receipts"
            )

    relationship_ids: set[str] = set()
    graph_ids = event_ids | source_ids
    for relation in relationships:
        rid = str(relation.get("relationship_id") or "").strip()
        if not rid or rid in relationship_ids:
            raise ValueError(f"duplicate or missing relationship id: {rid!r}")
        relationship_ids.add(rid)
        for endpoint in ("from_id", "to_id"):
            value = str(relation.get(endpoint) or "").strip()
            if value not in graph_ids:
                raise ValueError(f"relationship {rid} references unknown endpoint {value}")
        missing_relation_receipts = set(relation.get("evidence_source_ids") or []) - canonical_source_ids
        if missing_relation_receipts:
            raise ValueError(
                f"relationship {rid} references non-canonical source receipts: {sorted(missing_relation_receipts)}"
            )

    flag_ids: set[str] = set()
    for flag in flags:
        fid = str(flag.get("flag_id") or "").strip()
        if not fid or fid in flag_ids:
            raise ValueError(f"duplicate or missing promotion flag id: {fid!r}")
        flag_ids.add(fid)
        if flag.get("flag_type") not in allowed_flags:
            raise ValueError(f"promotion flag {fid} has unsupported type {flag.get('flag_type')}")
        missing_flag_receipts = set(flag.get("evidence_source_ids") or []) - canonical_source_ids
        if missing_flag_receipts:
            raise ValueError(
                f"promotion flag {fid} references non-canonical source receipts: {sorted(missing_flag_receipts)}"
            )

    for profile in profiles:
        source_id = profile["source_id"]
        basis = set(profile.get("classification_basis_event_ids") or [])
        missing = basis - event_ids
        if missing:
            raise ValueError(f"source profile {source_id} classification basis references unknown events: {sorted(missing)}")
        foreign = basis - events_by_source[source_id]
        if foreign:
            raise ValueError(f"source profile {source_id} classification basis uses another source's events: {sorted(foreign)}")
        substantive_classes = [
            value
            for value in profile.get("behavior_classes") or []
            if value != "UNKNOWN"
        ]
        classification_receipts = list(
            profile.get("classification_basis_receipts") or []
        )
        receipt_classes = {
            str(value)
            for receipt in classification_receipts
            for value in (receipt.get("behavior_classes") or [])
        }
        unsupported_receipt_classes = receipt_classes - allowed_classes
        if unsupported_receipt_classes:
            raise ValueError(
                f"source profile {source_id} classification receipts use unknown classes: "
                f"{sorted(unsupported_receipt_classes)}"
            )
        prohibited_receipt_classes = (
            receipt_classes - receipt_backed_descriptive_classes
        )
        if prohibited_receipt_classes:
            raise ValueError(
                f"source profile {source_id} attempts to support incident-gated classes "
                f"with profile receipts: {sorted(prohibited_receipt_classes)}"
            )
        if substantive_classes and not basis and not classification_receipts:
            raise ValueError(
                f"source profile {source_id} has substantive behavior classes without "
                "classification-basis events or descriptive profile receipts"
            )
        for source_class in substantive_classes:
            event_supported = any(
                source_class
                in (events_by_id[event_id].get("behavior_findings") or [])
                for event_id in basis
            )
            receipt_supported = (
                source_class in receipt_classes
                and source_class in receipt_backed_descriptive_classes
            )
            if not (event_supported or receipt_supported):
                raise ValueError(
                    f"source profile {source_id} class {source_class} is not supported "
                    "by incident events or permitted descriptive profile receipts"
                )

        revenue_basis = set(profile.get("revenue_basis_event_ids") or [])
        missing_revenue = revenue_basis - event_ids
        if missing_revenue:
            raise ValueError(f"source profile {source_id} revenue basis references unknown events: {sorted(missing_revenue)}")
        foreign_revenue = revenue_basis - events_by_source[source_id]
        if foreign_revenue:
            raise ValueError(f"source profile {source_id} revenue basis uses another source's events: {sorted(foreign_revenue)}")
        substantive_revenue = [
            value
            for value in profile.get("revenue_model") or []
            if value != "UNKNOWN_REVENUE_MODEL"
        ]
        revenue_receipts = list(profile.get("revenue_basis_receipts") or [])
        receipt_revenue_classes = {
            str(value)
            for receipt in revenue_receipts
            for value in (receipt.get("revenue_classes") or [])
        }
        unsupported_receipt_revenue = receipt_revenue_classes - allowed_revenue
        if unsupported_receipt_revenue:
            raise ValueError(
                f"source profile {source_id} revenue receipts use unknown classes: "
                f"{sorted(unsupported_receipt_revenue)}"
            )
        if substantive_revenue and not revenue_basis and not revenue_receipts:
            raise ValueError(
                f"source profile {source_id} has observed revenue classes without "
                "revenue-basis events or public profile receipts"
            )
        for revenue_class in substantive_revenue:
            event_supported = any(
                revenue_class
                in (events_by_id[event_id].get("revenue_findings") or [])
                for event_id in revenue_basis
            )
            receipt_supported = revenue_class in receipt_revenue_classes
            if not (event_supported or receipt_supported):
                raise ValueError(
                    f"source profile {source_id} revenue class {revenue_class} is not "
                    "supported by incident events or public profile receipts"
                )

    wol_network.validate_extended_forensic_input(forensic, governance)


def empty_metrics() -> dict[str, int | None]:
    return {
        "claim_families_traced": 0,
        "false_misleading_findings_connected": 0,
        "narrative_mutations_introduced": 0,
        "citation_laundering_events": 0,
        "recycled_media_incidents": 0,
        "corrections_issued": 0,
        "continued_after_correction_incidents": 0,
        "failed_claims_deleted_or_abandoned": 0,
        "stealth_edits": 0,
        "victim_exploitation_incidents": 0,
        "unique_propagation_events": 0,
        "observed_downstream_propagation": None,
        "prediction_failures": 0,
        "prediction_corrections": 0,
    }


def metrics_for_events(events: list[dict[str, Any]]) -> dict[str, int | None]:
    metrics = empty_metrics()
    corrected_targets = wol_network.corrected_target_ids(events)
    adverse_families = {
        str(event["claim_family_id"])
        for event in events
        if str(event.get("event_type") or "") in ADVERSE_FAMILY_EVENT_TYPES
        and str(event.get("event_id") or "") not in corrected_targets
    }
    metrics["claim_families_traced"] = len(adverse_families)
    downstream_values = []
    for event in events:
        event_type = str(event.get("event_type") or "")
        event_id = str(event.get("event_id") or "")
        metric_key = METRIC_EVENT_TYPES.get(event_type)
        if metric_key == "failed_claims_deleted_or_abandoned" and event_id in corrected_targets:
            metric_key = None
        if metric_key:
            metrics[metric_key] = int(metrics[metric_key] or 0) + 1
        downstream = event.get("downstream_propagation_observed")
        if isinstance(downstream, int) and downstream >= 0:
            downstream_values.append(downstream)
    if downstream_values:
        metrics["observed_downstream_propagation"] = sum(downstream_values)
    return metrics


def score_metrics(metrics: dict[str, int | None]) -> float:
    score = 0.0
    for key, weight in SCORE_WEIGHTS.items():
        score += float(metrics.get(key) or 0) * weight
    downstream = metrics.get("observed_downstream_propagation")
    if isinstance(downstream, int) and downstream > 0:
        # Downstream spread matters, but raw volume is deliberately capped so
        # passive virality cannot outweigh origination/mutation/laundering.
        score += min(math.log2(downstream + 1), 5.0)
    return round(score, 3)


def qualifying_event_count(metrics: dict[str, int | None]) -> int:
    return sum(
        int(metrics.get(key) or 0)
        for key in (
            "false_misleading_findings_connected",
            "narrative_mutations_introduced",
            "citation_laundering_events",
            "recycled_media_incidents",
            "continued_after_correction_incidents",
            "failed_claims_deleted_or_abandoned",
            "stealth_edits",
            "victim_exploitation_incidents",
            "unique_propagation_events",
            "prediction_failures",
        )
    )


def qualifies(source_class: str, metrics: dict[str, int | None]) -> bool:
    families = int(metrics.get("claim_families_traced") or 0)
    events = qualifying_event_count(metrics)
    if source_class in LOWER_THRESHOLD_CLASSES:
        return families >= 1 and events >= 1
    return families >= 2 and events >= 3


def explanation(metrics: dict[str, int | None]) -> str:
    parts = []
    fields = [
        ("claim_families_traced", "appears in {n} traced claim {word}"),
        ("false_misleading_findings_connected", "is connected to {n} false/misleading {word}"),
        ("narrative_mutations_introduced", "introduced {n} unsupported narrative {word}"),
        ("citation_laundering_events", "participated in {n} citation-laundering {word}"),
        ("recycled_media_incidents", "participated in {n} recycled-media {word}"),
        ("continued_after_correction_incidents", "continued {n} {word} after contrary evidence or correction"),
        ("failed_claims_deleted_or_abandoned", "deleted or abandoned {n} failed {word} without correction"),
        ("victim_exploitation_incidents", "has {n} documented victim-exploitation {word}"),
    ]
    for key, template in fields:
        n = int(metrics.get(key) or 0)
        if not n:
            continue
        if key == "claim_families_traced":
            word = "family" if n == 1 else "families"
        elif key == "false_misleading_findings_connected":
            word = "finding" if n == 1 else "findings"
        elif key == "narrative_mutations_introduced":
            word = "mutation" if n == 1 else "mutations"
        elif key in {"citation_laundering_events"}:
            word = "event" if n == 1 else "events"
        elif key in {"recycled_media_incidents", "victim_exploitation_incidents"}:
            word = "incident" if n == 1 else "incidents"
        elif key == "continued_after_correction_incidents":
            word = "claim" if n == 1 else "claims"
        else:
            word = "claim" if n == 1 else "claims"
        parts.append(template.format(n=n, word=word))
    if not parts:
        return "No qualifying Hall of Shame conduct is recorded for this period."
    sentence = ", ".join(parts[:4])
    if len(parts) > 4:
        sentence += ", and " + parts[4]
    return sentence[0].upper() + sentence[1:] + "."


def source_profiles_with_metrics(
    profiles: list[dict[str, Any]],
    events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        by_source[str(event["source_id"])].append(event)

    output = []
    for profile in profiles:
        record = dict(profile)
        record["behavior_classes"] = unique_strings(record.get("behavior_classes"))
        record["revenue_model"] = unique_strings(record.get("revenue_model"))
        record["classification_basis_event_ids"] = unique_strings(record.get("classification_basis_event_ids"))
        record["revenue_basis_event_ids"] = unique_strings(record.get("revenue_basis_event_ids"))
        record["metrics"] = metrics_for_events(by_source.get(str(record["source_id"]), []))
        record["direct_verdict"] = wol_network.direct_verdict(record["metrics"])
        output.append(record)
    return sorted(output, key=lambda item: item["source_id"])


def ranking_view(
    profiles: list[dict[str, Any]],
    events: list[dict[str, Any]],
    supported_classes: list[str],
) -> dict[str, list[dict[str, Any]]]:
    by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        by_source[str(event["source_id"])].append(event)

    result: dict[str, list[dict[str, Any]]] = {}
    for source_class in supported_classes:
        if source_class == "UNKNOWN":
            continue
        candidates = []
        for profile in profiles:
            if source_class not in (profile.get("behavior_classes") or []):
                continue
            metrics = metrics_for_events(by_source.get(str(profile["source_id"]), []))
            if not qualifies(source_class, metrics):
                continue
            candidates.append((
                score_metrics(metrics),
                int(metrics.get("claim_families_traced") or 0),
                str(profile["source_id"]),
                metrics,
            ))
        candidates.sort(key=lambda item: (-item[0], -item[1], item[2]))
        if not candidates:
            continue
        entries = []
        for rank, (score, _families, source_id, metrics) in enumerate(candidates[:3], 1):
            entries.append({
                "rank": rank,
                "source_id": source_id,
                "source_class": source_class,
                "score": score,
                "ranking_basis": metrics,
                "why_this_source_appears_here": explanation(metrics),
            })
        result[source_class] = entries
    return result



UNSUPPORTED_BULLSHIT_EVENT_TYPES = {
    "UNSUPPORTED_FACTUAL_ASSERTION",
    "UNSUPPORTED_INFERENTIAL_ASSERTION",
    "EVIDENTIARY_EVASION",
}


def unsupported_evidence_gate_satisfied(
    event: dict[str, Any],
    governance: dict[str, Any],
) -> bool:
    """Require documented support review before an unsupported claim counts."""
    cfg = ((governance.get("source_awards") or {}).get("BULLSHITTER") or {})
    gate = cfg.get("unsupported_evidence_gate") or {}
    review = event.get("evidentiary_support_review") or {}
    required_status = str(
        gate.get("required_review_status") or "NO_SUPPORT_FOUND_AFTER_DOCUMENTED_SEARCH"
    )
    if str(review.get("status") or "") != required_status:
        return False
    if gate.get("require_search_scope") and not str(review.get("search_scope") or "").strip():
        return False
    if gate.get("require_checked_at") and not str(review.get("checked_at") or "").strip():
        return False
    if gate.get("require_claimant_basis_review"):
        claimant_basis = str(review.get("claimant_basis_status") or "").strip()
        if claimant_basis not in {
            "NONE_PROVIDED",
            "CIRCULAR",
            "DOES_NOT_SUPPORT_ASSERTION",
            "ASSERTION_ONLY",
            "SELF_SEALING",
        }:
            return False
    return True


def bullshit_qualifying_event(
    event: dict[str, Any],
    governance: dict[str, Any],
) -> bool:
    """Return whether one source information event qualifies for the Bullshitter award."""
    cfg = ((governance.get("source_awards") or {}).get("BULLSHITTER") or {})
    event_type = str(event.get("event_type") or "")
    assertion_kind = str(event.get("assertion_kind") or "")
    if assertion_kind in {"OPINION", "QUESTION"}:
        return False
    if event_type == "REPORTS":
        return False
    if event_type in UNSUPPORTED_BULLSHIT_EVENT_TYPES:
        return unsupported_evidence_gate_satisfied(event, governance)
    qualifying_types = set(cfg.get("qualifying_event_types") or [])
    qualifying_findings = set(cfg.get("qualifying_behavior_findings") or [])
    findings = set(event.get("behavior_findings") or [])
    return event_type in qualifying_types or bool(findings & qualifying_findings)


def bullshit_incident_id(event: dict[str, Any]) -> str:
    return str(event.get("event_id") or event.get("incident_id") or "").strip()


def bullshit_incident_moment(event: dict[str, Any]) -> datetime | None:
    return parse_time(event.get("published_at")) or parse_time(event.get("first_observed_at"))


def deduplicated_qualifying_bullshit_events(
    events: list[dict[str, Any]],
    governance: dict[str, Any],
    *,
    as_of: Any = None,
) -> list[tuple[datetime, dict[str, Any]]]:
    """Return dated, deduplicated qualifying incidents in chronological order."""
    cutoff = parse_time(as_of)
    distinct: dict[str, tuple[datetime, dict[str, Any]]] = {}
    for event in events:
        if not bullshit_qualifying_event(event, governance):
            continue
        incident_id = bullshit_incident_id(event)
        moment = bullshit_incident_moment(event)
        if not incident_id or moment is None:
            # A time-bounded award cannot be earned from an undated incident.
            continue
        if cutoff is not None and moment > cutoff:
            continue
        key = str(
            event.get("information_event_group_id")
            or event.get("source_information_event_id")
            or incident_id
        ).strip()
        prior = distinct.get(key)
        if prior is None or moment < prior[0]:
            distinct[key] = (moment, event)
    return sorted(
        distinct.values(),
        key=lambda row: (row[0], bullshit_incident_id(row[1])),
    )


def bullshit_award_for_events(
    events: list[dict[str, Any]],
    governance: dict[str, Any],
    *,
    as_of: Any,
) -> dict[str, Any] | None:
    """Derive a persistent award from the earliest qualifying 30-day cluster."""
    cfg = ((governance.get("source_awards") or {}).get("BULLSHITTER") or {})
    if not cfg:
        return None
    minimum = int(cfg.get("minimum_qualifying_incidents") or 6)
    window_days = int(cfg.get("window_days") or 30)
    rows = deduplicated_qualifying_bullshit_events(
        events,
        governance,
        as_of=as_of,
    )
    if len(rows) < minimum:
        return None

    left = 0
    earned_window: list[tuple[datetime, dict[str, Any]]] | None = None
    for right in range(len(rows)):
        while left <= right and rows[right][0] - rows[left][0] > timedelta(days=window_days):
            left += 1
        if right - left + 1 >= minimum:
            earned_window = rows[left:right + 1]
            break

    if earned_window is None:
        return None

    earned_start = earned_window[0][0]
    earned_end = earned_window[-1][0]
    qualifying_incident_ids = sorted(
        bullshit_incident_id(event)
        for _moment, event in earned_window
        if bullshit_incident_id(event)
    )

    cutoff = parse_time(as_of)
    current_rows: list[tuple[datetime, dict[str, Any]]] = []
    if cutoff is not None:
        current_start = cutoff - timedelta(days=window_days)
        current_rows = [
            row for row in rows
            if current_start <= row[0] <= cutoff
        ]
    currently_active = len(current_rows) >= minimum
    current_incident_ids = sorted(
        bullshit_incident_id(event)
        for _moment, event in current_rows
        if bullshit_incident_id(event)
    )

    label = str(cfg.get("public_label") or "Bullshitter")
    if currently_active:
        public_verdict = (
            f"{label} — award earned {earned_start.isoformat()} through "
            f"{earned_end.isoformat()}; {len(current_rows)} qualifying bullshit "
            f"incidents in the current {window_days}-day window."
        )
        current_status = "ACTIVE_CURRENT_WINDOW"
    else:
        public_verdict = (
            f"{label} — award earned {earned_start.isoformat()} through "
            f"{earned_end.isoformat()} with {len(earned_window)} qualifying bullshit "
            f"incidents; {len(current_rows)} in the current {window_days}-day window."
        )
        current_status = "EARNED_HISTORICAL"

    return {
        "award_code": "BULLSHITTER",
        "public_label": label,
        "window_days": window_days,
        "minimum_qualifying_incidents": minimum,
        "award_earned_at": earned_end.isoformat(),
        "qualifying_window_start": earned_start.isoformat(),
        "qualifying_window_end": earned_end.isoformat(),
        "qualifying_incident_count": len(earned_window),
        "qualifying_incident_ids": qualifying_incident_ids,
        "current_window_status": current_status,
        "currently_active": currently_active,
        "current_window_incident_count": len(current_rows),
        "current_window_incident_ids": current_incident_ids,
        "as_of": as_of,
        "public_verdict": public_verdict,
    }


def attach_source_awards(
    profiles: list[dict[str, Any]],
    all_events: list[dict[str, Any]],
    governance: dict[str, Any],
    *,
    as_of: Any,
) -> list[dict[str, Any]]:
    by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in all_events:
        by_source[str(event.get("source_id") or "")].append(event)

    output = []
    for profile in profiles:
        record = dict(profile)
        award = bullshit_award_for_events(
            by_source.get(str(record.get("source_id") or ""), []),
            governance,
            as_of=as_of,
        )
        record["source_awards"] = [award] if award is not None else []
        output.append(record)
    return sorted(output, key=lambda item: item["source_id"])


def current_period_events(
    events: list[dict[str, Any]],
    canonical: dict[str, Any],
    days: int,
) -> list[dict[str, Any]]:
    cutoff = parse_time((canonical.get("release") or {}).get("current_osint_cutoff"))
    if cutoff is None:
        return []
    start = cutoff - timedelta(days=days)
    selected = []
    for event in events:
        moment = parse_time(event.get("published_at")) or parse_time(event.get("first_observed_at"))
        if moment is not None and start <= moment <= cutoff:
            selected.append(event)
    return selected


COUNTRY_CODE_BY_REGION = {
    "Iran": "IR",
    "Russia": "RU",
    "United States": "US",
    "United States of America": "US",
    "India": "IN",
    "China": "CN",
    "Pakistan": "PK",
    "Israel": "IL",
    "United Kingdom": "GB",
    "Saudi Arabia": "SA",
    "United Arab Emirates": "AE",
    "Iraq": "IQ",
    "Yemen": "YE",
}


def profile_country_code(profile: dict[str, Any]) -> str | None:
    explicit = str(profile.get("country_code") or "").strip().upper()
    if len(explicit) == 2:
        return explicit
    return COUNTRY_CODE_BY_REGION.get(str(profile.get("country_region") or "").strip())


def derive_award_propagation_graph(
    profiles: list[dict[str, Any]],
    qualifying_events: list[dict[str, Any]],
    amplification_observations: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compile the explorable Bullshitter -> megaphone graph from structured receipts."""
    profile_by_id = {str(row.get("source_id") or ""): row for row in profiles}
    event_by_id = {
        str(row.get("event_id") or row.get("incident_id") or ""): row
        for row in qualifying_events
        if str(row.get("event_id") or row.get("incident_id") or "")
    }
    awardee_ids = {
        source_id
        for source_id, profile in profile_by_id.items()
        if any(
            str(award.get("award_code") or "") == "BULLSHITTER"
            for award in profile.get("source_awards") or []
        )
    }

    nodes: dict[str, dict[str, Any]] = {}
    for source_id in sorted(awardee_ids):
        profile = profile_by_id[source_id]
        awards = [
            dict(award)
            for award in profile.get("source_awards") or []
            if str(award.get("award_code") or "") == "BULLSHITTER"
        ]
        nodes[source_id] = {
            "node_id": source_id,
            "node_type": "BULLSHITTER",
            "display_name": str(profile.get("display_name") or source_id),
            "country_code": profile_country_code(profile),
            "country_region": profile.get("country_region"),
            "primary_platform": profile.get("primary_platform"),
            "authenticity_class": str(profile.get("authenticity_class") or "UNKNOWN"),
            "award_codes": ["BULLSHITTER"],
            "award_incident_count": max(
                [int(award.get("qualifying_incident_count") or 0) for award in awards] or [0]
            ),
        }

    edge_groups: dict[tuple[str, str], dict[str, Any]] = {}
    amplifier_awardees: dict[str, set[str]] = defaultdict(set)
    amplifier_observations: dict[str, set[str]] = defaultdict(set)
    amplifier_meta: dict[str, dict[str, Any]] = {}

    for observation in amplification_observations:
        source_id = str(observation.get("bullshitter_source_id") or "")
        if source_id not in awardee_ids:
            continue
        event_id = str(observation.get("bullshitter_event_id") or "")
        upstream_event = event_by_id.get(event_id)
        if upstream_event is None or str(upstream_event.get("source_id") or "") != source_id:
            continue

        amplifier_id = str(observation.get("amplifier_id") or "").strip()
        if not amplifier_id:
            continue
        amplifier_node_id = f"AMP::{amplifier_id}"
        meta = amplifier_meta.setdefault(amplifier_node_id, {
            "node_id": amplifier_node_id,
            "node_type": "MEGAPHONE",
            "amplifier_id": amplifier_id,
            "display_name": str(observation.get("amplifier_display_name") or amplifier_id),
            "handle": observation.get("amplifier_handle"),
            "primary_platform": observation.get("amplifier_platform"),
            "country_code": observation.get("amplifier_country_code"),
            "country_region": None,
            "authenticity_class": str(
                observation.get("amplifier_authenticity_class") or "UNKNOWN"
            ),
            "award_codes": [],
        })
        # Conflicting identity metadata fails closed instead of silently merging.
        for field in (
            "display_name", "handle", "primary_platform", "country_code",
            "authenticity_class",
        ):
            incoming = observation.get({
                "display_name": "amplifier_display_name",
                "handle": "amplifier_handle",
                "primary_platform": "amplifier_platform",
                "country_code": "amplifier_country_code",
                "authenticity_class": "amplifier_authenticity_class",
            }[field])
            if incoming not in (None, "") and meta.get(field) not in (None, "", incoming):
                raise ValueError(
                    f"amplifier {amplifier_id} conflicts on {field}: "
                    f"{meta.get(field)!r} != {incoming!r}"
                )
            if meta.get(field) in (None, "") and incoming not in (None, ""):
                meta[field] = incoming

        amplifier_awardees[amplifier_node_id].add(source_id)
        amplifier_observations[amplifier_node_id].add(
            str(observation.get("observation_id") or "")
        )
        key = (source_id, amplifier_node_id)
        group = edge_groups.setdefault(key, {
            "edge_id": f"{source_id}::{amplifier_node_id}",
            "from_node_id": source_id,
            "to_node_id": amplifier_node_id,
            "relationship_type": "AMPLIFIES_BULLSHIT",
            "observation_ids": [],
            "bullshitter_event_ids": [],
            "public_receipts": [],
        })
        group["observation_ids"].append(str(observation.get("observation_id") or ""))
        group["bullshitter_event_ids"].append(event_id)
        group["public_receipts"].extend(
            [dict(receipt) for receipt in observation.get("public_receipts") or []]
        )

    for amplifier_node_id, meta in amplifier_meta.items():
        meta["bullshitter_source_count"] = len(amplifier_awardees[amplifier_node_id])
        meta["amplification_observation_count"] = len(
            amplifier_observations[amplifier_node_id]
        )
        nodes[amplifier_node_id] = meta

    edges = []
    for key in sorted(edge_groups):
        row = edge_groups[key]
        row["observation_ids"] = sorted(set(row["observation_ids"]))
        row["bullshitter_event_ids"] = sorted(set(row["bullshitter_event_ids"]))
        unique_receipts: dict[str, dict[str, Any]] = {}
        for receipt in row["public_receipts"]:
            rid = str(receipt.get("receipt_id") or "")
            unique_receipts[rid or json.dumps(receipt, sort_keys=True)] = receipt
        row["public_receipts"] = [
            unique_receipts[rid] for rid in sorted(unique_receipts)
        ]
        row["amplified_claim_count"] = len(row["bullshitter_event_ids"])
        edges.append(row)

    return {
        "graph_type": "BULLSHITTER_MEGAPHONE_NETWORK",
        "nodes": sorted(nodes.values(), key=lambda row: row["node_id"]),
        "edges": edges,
        "summary": {
            "bullshitter_nodes": len(awardee_ids),
            "megaphone_nodes": len(amplifier_meta),
            "amplification_edges": len(edges),
            "cross_bullshitter_megaphones": sum(
                1 for values in amplifier_awardees.values() if len(values) > 1
            ),
            "confirmed_bot_megaphones": sum(
                1
                for row in amplifier_meta.values()
                if row.get("authenticity_class") == "CONFIRMED_BOT"
            ),
        },
    }


def build_registry(
    canonical: dict[str, Any],
    forensic: dict[str, Any],
    governance: dict[str, Any],
) -> dict[str, Any]:
    initial_families = derive_claim_families(canonical, [], [])
    family_ids = {item["claim_family_id"] for item in initial_families}
    canonical_source_ids = canonical_source_id_set(canonical)
    validate_forensic_input(forensic, governance, family_ids, canonical_source_ids)

    information_events = [dict(item) for item in (forensic.get("information_events") or [])]
    source_behavior_incidents = [
        dict(item) for item in (forensic.get("source_behavior_incidents") or [])
    ]
    relationships = [dict(item) for item in (forensic.get("relationships") or [])]
    amplification_observations = [
        dict(item) for item in (forensic.get("amplification_observations") or [])
    ]
    families = derive_claim_families(canonical, information_events, relationships)
    profiles = source_profiles_with_metrics(forensic.get("source_profiles") or [], information_events)

    hall = governance.get("hall_of_shame") or {}
    period_days = int(hall.get("current_period_days") or 30)
    allowed_classes = set(governance.get("source_behavior_classes") or [])
    supported_classes = list(hall.get("hall_of_shame_classes") or [])
    unknown_hall_classes = sorted(set(supported_classes) - allowed_classes)
    if unknown_hall_classes:
        raise ValueError(f"Hall of Shame contains unknown source classes: {unknown_hall_classes}")

    all_time = ranking_view(profiles, information_events, supported_classes)
    recent_events = current_period_events(information_events, canonical, period_days)
    profiles = attach_source_awards(
        profiles,
        information_events + source_behavior_incidents,
        governance,
        as_of=(canonical.get("release") or {}).get("current_osint_cutoff"),
    )
    current_period = ranking_view(profiles, recent_events, supported_classes)
    network_analysis = wol_network.derive_network_analysis(
        information_events,
        relationships,
        profiles,
    )
    corpus_coverage = wol_network.derive_corpus_coverage(
        families,
        information_events,
        relationships,
    )
    propagation_graph = derive_award_propagation_graph(
        profiles,
        information_events + source_behavior_incidents,
        amplification_observations,
    )

    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_DERIVED_FORENSIC_REGISTRY",
        "authority": "WEB_OF_LIES_INFORMATION_FORENSICS",
        "contract_path": CONTRACT,
        "generated_at": (canonical.get("release") or {}).get("current_osint_cutoff"),
        "generated_from": {
            "canonical_state_identity": str((canonical.get("release") or {}).get("canonical_state_identity_v2") or "UNKNOWN"),
            "lie_ledger_chain_count": len(families),
            "forensic_input_version": str(forensic.get("version") or "UNKNOWN"),
        },
        "claim_families": families,
        "source_profiles": profiles,
        "information_events": sorted(information_events, key=lambda item: item["event_id"]),
        "source_behavior_incidents": sorted(
            source_behavior_incidents, key=lambda item: item["incident_id"]
        ),
        "amplification_observations": sorted(
            amplification_observations, key=lambda item: item["observation_id"]
        ),
        "propagation_graph": propagation_graph,
        "relationships": sorted(relationships, key=lambda item: item["relationship_id"]),
        "promotion_flags": sorted(
            [dict(item) for item in (forensic.get("promotion_flags") or [])],
            key=lambda item: item["flag_id"],
        ),
        "external_assessments": sorted(
            [dict(item) for item in (forensic.get("external_assessments") or [])],
            key=lambda item: item["assessment_id"],
        ),
        "infrastructure_observations": sorted(
            [
                dict(item)
                for item in (forensic.get("infrastructure_observations") or [])
            ],
            key=lambda item: item["observation_id"],
        ),
        "research_leads": sorted(
            [dict(item) for item in (forensic.get("research_leads") or [])],
            key=lambda item: item["lead_id"],
        ),
        "network_analysis": network_analysis,
        "corpus_coverage": corpus_coverage,
        "incremental_rebuild_contract": {
            "affected_family_isolation": True,
            "unaffected_family_state_preserved": True,
            "source_profiles_and_hall_recomputed_when_affected": True,
            "clean_full_build_equivalence_required": True,
            "stale_previous_registry_fails_closed": True,
        },
        "hall_of_shame": {
            "algorithm_version": "WOL-HOS-1",
            "top_n_per_class": 3,
            "manual_selection": False,
            "current_period_days": period_days,
            "ranking_contract": {
                "score_weights": dict(SCORE_WEIGHTS),
                "event_metric_map": dict(METRIC_EVENT_TYPES),
                "qualification_metric_keys": [
                    "false_misleading_findings_connected",
                    "narrative_mutations_introduced",
                    "citation_laundering_events",
                    "recycled_media_incidents",
                    "continued_after_correction_incidents",
                    "failed_claims_deleted_or_abandoned",
                    "stealth_edits",
                    "victim_exploitation_incidents",
                    "unique_propagation_events",
                    "prediction_failures",
                ],
                "lower_threshold_classes": sorted(LOWER_THRESHOLD_CLASSES),
                "hall_of_shame_classes": sorted(supported_classes),
                "default_min_families": 2,
                "default_min_events": 3,
                "lower_min_families": 1,
                "lower_min_events": 1,
                "downstream_log2_cap": 5.0,
            },
            "all_time": all_time,
            "current_period": current_period,
        },
    }


def build_registry_incremental(
    canonical: dict[str, Any],
    forensic: dict[str, Any],
    governance: dict[str, Any],
    previous_registry: dict[str, Any],
    affected_family_ids: set[str],
) -> dict[str, Any]:
    full = build_registry(canonical, forensic, governance)
    canonical_family_ids = {
        row["claim_family_id"] for row in derive_claim_families(canonical, [], [])
    }
    canonical_identity = str(
        (canonical.get("release") or {}).get("canonical_state_identity_v2") or "UNKNOWN"
    )
    return wol_network.merge_incremental_with_full_equivalence(
        full,
        previous_registry,
        set(affected_family_ids),
        canonical_family_ids,
        canonical_identity,
        canonical_bytes,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--canonical", default=CANONICAL)
    parser.add_argument("--forensic-input", default=FORENSIC_INPUT)
    parser.add_argument("--governance", default=GOVERNANCE)
    parser.add_argument("--output", default=OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    canonical = load_json(root, args.canonical)
    forensic = load_json(root, args.forensic_input)
    governance = load_json(root, args.governance)
    registry = build_registry(canonical, forensic, governance)
    serialized = canonical_bytes(registry)

    output = Path(args.output)
    if not output.is_absolute():
        output = root / output

    if args.check:
        if not output.is_file() or output.read_bytes() != serialized:
            raise SystemExit(f"FAIL stale {output}")
        print("web-of-lies derived registry: PASS")
        return 0

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(f"web-of-lies derived registry: wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
