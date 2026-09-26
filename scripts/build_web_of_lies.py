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
    incidents_by_id: dict[str, dict[str, Any]] = {}
    for incident in source_behavior_incidents:
        incident_id = str(incident.get("incident_id") or "").strip()
        if not incident_id or incident_id in incident_ids:
            raise ValueError(
                f"duplicate or missing source behavior incident id: {incident_id!r}"
            )
        incident_ids.add(incident_id)
        incidents_by_id[incident_id] = incident
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
        behavior_findings = set(incident.get("behavior_findings") or [])
        unsupported_behavior = behavior_findings - allowed_classes - allowed_moral_findings
        if unsupported_behavior:
            raise ValueError(
                f"source behavior incident {incident_id} has unsupported behavior findings: "
                f"{sorted(unsupported_behavior)}"
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
        events_by_source[source_id].add(incident_id)

    classification_records_by_id = {**events_by_id, **incidents_by_id}
    classification_record_ids = set(classification_records_by_id)

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
        amplifier_source_id = str(observation.get("amplifier_source_id") or "").strip()
        if amplifier_source_id and amplifier_source_id not in source_ids:
            raise ValueError(
                f"amplification observation {observation_id} references unknown "
                f"amplifier source profile {amplifier_source_id}"
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
        missing = basis - classification_record_ids
        if missing:
            raise ValueError(
                f"source profile {source_id} classification basis references unknown "
                f"information events/source-behavior incidents: {sorted(missing)}"
            )
        foreign = basis - events_by_source[source_id]
        if foreign:
            raise ValueError(
                f"source profile {source_id} classification basis uses another source's "
                f"events/records: {sorted(foreign)}"
            )
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
                in (classification_records_by_id[event_id].get("behavior_findings") or [])
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


def deduplicated_documented_bullshit_events(
    events: list[dict[str, Any]],
    governance: dict[str, Any],
) -> list[dict[str, Any]]:
    """Return every distinct receipt-backed qualifying incident, dated or not."""
    distinct: dict[str, dict[str, Any]] = {}
    for event in events:
        if not bullshit_qualifying_event(event, governance):
            continue
        incident_id = bullshit_incident_id(event)
        if not incident_id:
            continue
        key = str(
            event.get("information_event_group_id")
            or event.get("source_information_event_id")
            or incident_id
        ).strip()
        prior = distinct.get(key)
        if prior is None:
            distinct[key] = event
            continue
        # Prefer the record with an actual publication timestamp when duplicate
        # preservation paths exist for the same information event.
        if bullshit_incident_moment(prior) is None and bullshit_incident_moment(event) is not None:
            distinct[key] = event
    return sorted(
        distinct.values(),
        key=lambda event: (
            bullshit_incident_moment(event) or datetime.max,
            bullshit_incident_id(event),
        ),
    )


def deduplicated_qualifying_bullshit_events(
    events: list[dict[str, Any]],
    governance: dict[str, Any],
    *,
    as_of: Any = None,
) -> list[tuple[datetime, dict[str, Any]]]:
    """Return dated, deduplicated qualifying incidents in chronological order.\n\n    Dates establish deterministic earning chronology only; no recency window applies.\n    """
    cutoff = parse_time(as_of)
    distinct: dict[str, tuple[datetime, dict[str, Any]]] = {}
    for event in events:
        if not bullshit_qualifying_event(event, governance):
            continue
        incident_id = bullshit_incident_id(event)
        moment = bullshit_incident_moment(event)
        if not incident_id or moment is None:
            # Award earning chronology requires a dated incident; no recency window applies.
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
    """Derive the persistent Bullshitter award from cumulative distinct incidents."""
    cfg = ((governance.get("source_awards") or {}).get("BULLSHITTER") or {})
    if not cfg:
        return None
    minimum = int(cfg.get("minimum_qualifying_incidents") or 6)
    documented_rows = deduplicated_documented_bullshit_events(
        events,
        governance,
    )
    rows = deduplicated_qualifying_bullshit_events(
        events,
        governance,
        as_of=as_of,
    )
    if len(rows) < minimum:
        return None

    # No recency/timebox rule applies. The award is earned when the cumulative
    # deduplicated qualifying record first reaches the configured threshold.
    earning_rows = rows[:minimum]
    earned_start = earning_rows[0][0]
    earned_end = earning_rows[-1][0]
    qualifying_incident_ids = sorted(
        bullshit_incident_id(event)
        for _moment, event in earning_rows
        if bullshit_incident_id(event)
    )
    documented_incident_ids = sorted(
        bullshit_incident_id(event)
        for event in documented_rows
        if bullshit_incident_id(event)
    )

    label = str(cfg.get("public_label") or "Bullshitter")
    public_verdict = (
        f"{label} — award earned after {len(earning_rows)} cumulative qualifying "
        f"bullshit incidents documented from {earned_start.isoformat()} through "
        f"{earned_end.isoformat()}; {len(documented_incident_ids)} documented "
        f"qualifying incidents total."
    )

    return {
        "award_code": "BULLSHITTER",
        "public_label": label,
        "qualification_route": "STANDARD_INCIDENT_COUNT",
        "qualification_scope": "CUMULATIVE",
        "minimum_qualifying_incidents": minimum,
        "award_earned_at": earned_end.isoformat(),
        "qualification_start": earned_start.isoformat(),
        "qualification_end": earned_end.isoformat(),
        "qualifying_incident_count": len(earning_rows),
        "qualifying_incident_ids": qualifying_incident_ids,
        "documented_incident_count": len(documented_incident_ids),
        "documented_incident_ids": documented_incident_ids,
        "as_of": as_of,
        "public_verdict": public_verdict,
    }


def network_assisted_bullshit_award(
    source_id: str,
    amplification_observations: list[dict[str, Any]],
    upstream_award_incident_ids_by_source: dict[str, set[str]],
    governance: dict[str, Any],
    *,
    as_of: Any,
) -> dict[str, Any] | None:
    """Derive a cumulative Bullshitter award from systematic amplification.

    This route reuses already-qualified upstream bullshit incidents. The
    downstream publication act is the target source's own conduct; stable
    message_identity values prevent cross-platform mirrors from inflating the
    threshold. No recency/timebox rule applies.
    """
    cfg = ((governance.get("source_awards") or {}).get("BULLSHITTER") or {})
    network_cfg = cfg.get("network_assisted_qualification") or {}
    if not network_cfg.get("enabled"):
        return None

    minimum_sources = int(
        network_cfg.get("minimum_distinct_upstream_wol_nodes") or 5
    )
    minimum_incidents = int(
        network_cfg.get("minimum_qualifying_amplification_incidents") or 6
    )
    require_message_identity = bool(
        network_cfg.get("message_identity_required_for_award_counting", True)
    )
    cutoff = parse_time(as_of)

    distinct: dict[str, tuple[datetime, dict[str, Any], str]] = {}
    for observation in amplification_observations:
        if str(observation.get("amplifier_source_id") or "").strip() != source_id:
            continue
        upstream_source_id = str(
            observation.get("bullshitter_source_id") or ""
        ).strip()
        upstream_event_id = str(
            observation.get("bullshitter_event_id") or ""
        ).strip()
        if not upstream_source_id or upstream_source_id == source_id:
            continue
        if upstream_event_id not in upstream_award_incident_ids_by_source.get(
            upstream_source_id, set()
        ):
            continue
        if not list(observation.get("public_receipts") or []):
            continue
        moment = parse_time(observation.get("observed_at"))
        if moment is None or (cutoff is not None and moment > cutoff):
            continue
        message_identity = str(observation.get("message_identity") or "").strip()
        if require_message_identity and not message_identity:
            continue
        key = message_identity or str(observation.get("observation_id") or "").strip()
        if not key:
            continue
        prior = distinct.get(key)
        if prior is None or moment < prior[0]:
            distinct[key] = (moment, observation, upstream_source_id)

    rows = sorted(
        distinct.values(),
        key=lambda row: (
            row[0],
            str(row[1].get("observation_id") or ""),
        ),
    )
    if len(rows) < minimum_incidents:
        return None

    earning_rows: list[tuple[datetime, dict[str, Any], str]] | None = None
    for right in range(len(rows)):
        candidate = rows[:right + 1]
        upstream_ids = {row[2] for row in candidate}
        if (
            len(candidate) >= minimum_incidents
            and len(upstream_ids) >= minimum_sources
        ):
            earning_rows = candidate
            break

    if earning_rows is None:
        return None

    earned_start = earning_rows[0][0]
    earned_end = earning_rows[-1][0]
    qualifying_incident_ids = sorted(
        str(row[1].get("observation_id") or "")
        for row in earning_rows
        if str(row[1].get("observation_id") or "")
    )
    qualifying_upstream_source_ids = sorted({row[2] for row in earning_rows})
    documented_incident_ids = sorted(
        str(row[1].get("observation_id") or "")
        for row in rows
        if str(row[1].get("observation_id") or "")
    )

    label = str(cfg.get("public_label") or "Bullshitter")
    public_verdict = (
        f"{label} — network-assisted award earned after {len(earning_rows)} "
        f"cumulative qualifying amplification publications across "
        f"{len(qualifying_upstream_source_ids)} distinct upstream WOL sources."
    )
    return {
        "award_code": "BULLSHITTER",
        "public_label": label,
        "qualification_route": "NETWORK_ASSISTED_AMPLIFICATION",
        "qualification_scope": "CUMULATIVE",
        "minimum_qualifying_incidents": minimum_incidents,
        "minimum_distinct_upstream_wol_nodes": minimum_sources,
        "award_earned_at": earned_end.isoformat(),
        "qualification_start": earned_start.isoformat(),
        "qualification_end": earned_end.isoformat(),
        "qualifying_incident_count": len(earning_rows),
        "qualifying_incident_ids": qualifying_incident_ids,
        "qualifying_upstream_source_count": len(qualifying_upstream_source_ids),
        "qualifying_upstream_source_ids": qualifying_upstream_source_ids,
        "documented_incident_count": len(documented_incident_ids),
        "documented_incident_ids": documented_incident_ids,
        "as_of": as_of,
        "public_verdict": public_verdict,
    }


def attach_source_awards(
    profiles: list[dict[str, Any]],
    all_events: list[dict[str, Any]],
    governance: dict[str, Any],
    *,
    as_of: Any,
    amplification_observations: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in all_events:
        by_source[str(event.get("source_id") or "")].append(event)

    output = []
    upstream_award_incident_ids_by_source: dict[str, set[str]] = {}
    for profile in profiles:
        record = dict(profile)
        source_id = str(record.get("source_id") or "")
        award = bullshit_award_for_events(
            by_source.get(source_id, []),
            governance,
            as_of=as_of,
        )
        record["source_awards"] = [award] if award is not None else []
        if award is not None:
            upstream_award_incident_ids_by_source[source_id] = set(
                award.get("documented_incident_ids")
                or award.get("qualifying_incident_ids")
                or []
            )
        output.append(record)

    observations = list(amplification_observations or [])
    if observations:
        for record in output:
            if record.get("source_awards"):
                continue
            source_id = str(record.get("source_id") or "")
            award = network_assisted_bullshit_award(
                source_id,
                observations,
                upstream_award_incident_ids_by_source,
                governance,
                as_of=as_of,
            )
            if award is not None:
                record["source_awards"] = [award]

    return sorted(output, key=lambda item: item["source_id"])



def derive_role_failure_appellations(
    profile: dict[str, Any],
    events: list[dict[str, Any]],
    governance: dict[str, Any],
) -> list[dict[str, Any]]:
    """Derive adverse role-failure labels only from self-claimed roles + incident evidence."""
    claimed_roles = {
        str(row.get("role_code") or "").strip()
        for row in (profile.get("claimed_roles") or [])
        if str(row.get("role_code") or "").strip()
        and (row.get("public_receipts") or [])
    }
    awards = {
        str(row.get("award_code") or "").strip()
        for row in (profile.get("source_awards") or [])
        if str(row.get("award_code") or "").strip()
    }
    distinct: dict[str, dict[str, Any]] = {}
    for event in events:
        event_id = bullshit_incident_id(event)
        if not event_id or not bullshit_qualifying_event(event, governance):
            continue
        key = str(
            event.get("information_event_group_id")
            or event.get("source_information_event_id")
            or event_id
        ).strip()
        distinct.setdefault(key, event)

    role_evidence_rule = governance.get("role_failure_evidence") or {}
    required_role_evidence_status = str(
        role_evidence_rule.get("qualification_status")
        or "QUALIFIED_ROLE_FAILURE_EVIDENCE"
    ).strip()
    for evidence in profile.get("role_failure_evidence") or []:
        if not isinstance(evidence, dict):
            continue
        evidence_id = str(
            evidence.get("incident_id") or evidence.get("event_id") or ""
        ).strip()
        if not evidence_id:
            continue
        if str(evidence.get("qualification_status") or "").strip() != required_role_evidence_status:
            continue
        if not list(evidence.get("public_receipts") or []):
            continue
        key = str(
            evidence.get("information_event_group_id")
            or evidence.get("source_information_event_id")
            or evidence_id
        ).strip()
        distinct.setdefault(f"ROLE_FAILURE::{key}", evidence)

    output: list[dict[str, Any]] = []
    rules = governance.get("role_failure_appellations") or {}
    for code, rule in sorted(rules.items()):
        claimed_role = str(rule.get("claimed_role") or "").strip()
        required_award = str(rule.get("requires_source_award") or "").strip()
        if claimed_role not in claimed_roles:
            continue
        if required_award and required_award not in awards:
            continue
        primary_tag = str(rule.get("qualifying_incident_tag") or "").strip()
        review_gate = rule.get("incident_review_gate") or {}
        allowed_failure_types = {
            str(value).strip()
            for value in (rule.get("qualifying_failure_types") or [])
            if str(value).strip()
        }

        def passes_incident_review_gate(event: dict[str, Any]) -> bool:
            if not review_gate:
                return True
            review_field = str(review_gate.get("review_field") or "").strip()
            review = event.get(review_field) if review_field else None
            if not isinstance(review, dict):
                return False
            required_status = str(review_gate.get("required_status") or "").strip()
            if required_status and str(review.get("status") or "").strip() != required_status:
                return False
            if bool(review_gate.get("require_exact_proposition")) and not str(
                review.get("exact_proposition") or ""
            ).strip():
                return False
            failure_type_field = str(
                review_gate.get("failure_type_field") or "failure_type"
            ).strip()
            failure_type = str(review.get(failure_type_field) or "").strip()
            if allowed_failure_types and failure_type not in allowed_failure_types:
                return False
            if bool(review_gate.get("require_contrary_evidence_sources")):
                contrary = review.get("contrary_evidence_sources") or []
                if not isinstance(contrary, list) or not contrary:
                    return False
                if any(
                    not isinstance(source, dict)
                    or not str(source.get("url") or "").strip()
                    or not str(source.get("source_name") or "").strip()
                    for source in contrary
                ):
                    return False
            return True

        primary_events = [
            event for event in distinct.values()
            if primary_tag
            and primary_tag in set(event.get("role_failure_tags") or [])
            and passes_incident_review_gate(event)
        ]
        minimum = int(rule.get("minimum_tagged_incidents") or 1)
        if len(primary_events) < minimum:
            continue
        secondary_tag = str(rule.get("secondary_incident_tag") or "").strip()
        secondary_events = [
            event for event in distinct.values()
            if secondary_tag and secondary_tag in set(event.get("role_failure_tags") or [])
        ]
        secondary_minimum = int(rule.get("minimum_secondary_tagged_incidents") or 0)
        if secondary_minimum and len(secondary_events) < secondary_minimum:
            continue
        basis_ids = sorted({
            bullshit_incident_id(event)
            for event in primary_events + secondary_events
            if bullshit_incident_id(event)
        })
        role_receipts = [
            dict(receipt)
            for row in (profile.get("claimed_roles") or [])
            if str(row.get("role_code") or "").strip() == claimed_role
            for receipt in (row.get("public_receipts") or [])
        ]
        output.append({
            "appellation_code": str(code),
            "public_label": str(rule.get("public_label") or code),
            "claimed_role": claimed_role,
            "incident_count": len(basis_ids),
            "basis_incident_ids": basis_ids,
            "claimed_role_receipts": role_receipts,
            "rule": str(rule.get("rule") or ""),
        })
    return output


def attach_role_failure_appellations(
    profiles: list[dict[str, Any]],
    all_events: list[dict[str, Any]],
    governance: dict[str, Any],
) -> list[dict[str, Any]]:
    by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in all_events:
        by_source[str(event.get("source_id") or "")].append(event)
    output = []
    for profile in profiles:
        record = dict(profile)
        record["role_failure_appellations"] = derive_role_failure_appellations(
            record,
            by_source.get(str(record.get("source_id") or ""), []),
            governance,
        )
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
    "Singapore": "SG",
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
    relationships: list[dict[str, Any]],
    amplification_observations: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compile the explorable Bullshitter -> megaphone graph from structured receipts.

    Existing WOL lineage can contribute a megaphone edge only when the downstream
    event itself is explicitly marked as amplification/repetition/syndication and
    has a public receipt. Neutral REPORTS-only lineage is not auto-promoted.
    """
    profile_by_id = {str(row.get("source_id") or ""): row for row in profiles}
    event_by_id = {
        str(row.get("event_id") or row.get("incident_id") or ""): row
        for row in qualifying_events
        if str(row.get("event_id") or row.get("incident_id") or "")
    }
    award_event_ids_by_source: dict[str, set[str]] = {}
    awardee_ids: set[str] = set()
    for source_id, profile in profile_by_id.items():
        awards = [
            award
            for award in profile.get("source_awards") or []
            if str(award.get("award_code") or "") == "BULLSHITTER"
        ]
        if not awards:
            continue
        awardee_ids.add(source_id)
        award_event_ids_by_source[source_id] = {
            str(event_id)
            for award in awards
            for event_id in (
                award.get("documented_incident_ids")
                or award.get("qualifying_incident_ids")
                or []
            )
            if str(event_id)
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
            "node_roles": ["BULLSHITTER"],
            "display_name": str(profile.get("display_name") or source_id),
            "country_code": profile_country_code(profile),
            "country_region": profile.get("country_region"),
            "primary_platform": profile.get("primary_platform"),
            "authenticity_class": str(profile.get("authenticity_class") or "UNKNOWN"),
            "award_codes": ["BULLSHITTER"],
            "award_incident_count": max(
                [
                    int(
                        award.get("documented_incident_count")
                        or award.get("qualifying_incident_count")
                        or 0
                    )
                    for award in awards
                ]
                or [0]
            ),
        }

    edge_groups: dict[tuple[str, str], dict[str, Any]] = {}
    amplifier_awardees: dict[str, set[str]] = defaultdict(set)
    amplifier_observations: dict[str, set[str]] = defaultdict(set)

    def profiled_amplifier_node(source_id: str) -> str | None:
        profile = profile_by_id.get(source_id)
        if profile is None:
            return None
        if source_id not in nodes:
            nodes[source_id] = {
                "node_id": source_id,
                "node_type": "MEGAPHONE",
                "node_roles": ["AMPLIFIER"],
                "display_name": str(profile.get("display_name") or source_id),
                "country_code": profile_country_code(profile),
                "country_region": profile.get("country_region"),
                "primary_platform": profile.get("primary_platform"),
                "authenticity_class": str(profile.get("authenticity_class") or "UNKNOWN"),
                "award_codes": [],
            }
        return source_id

    def anonymous_amplifier_node(
        amplifier_id: str,
        display_name: str,
        handle: Any,
        platform: Any,
        country_code: Any,
        authenticity_class: Any,
    ) -> str:
        node_id = f"AMP::{amplifier_id}"
        incoming = {
            "node_id": node_id,
            "node_type": "MEGAPHONE",
            "node_roles": ["AMPLIFIER"],
            "amplifier_id": amplifier_id,
            "display_name": display_name or amplifier_id,
            "handle": handle,
            "primary_platform": platform,
            "country_code": country_code,
            "country_region": None,
            "authenticity_class": str(authenticity_class or "UNKNOWN"),
            "award_codes": [],
        }
        prior = nodes.get(node_id)
        if prior is None:
            nodes[node_id] = incoming
            return node_id
        for field in (
            "display_name",
            "handle",
            "primary_platform",
            "country_code",
            "authenticity_class",
        ):
            value = incoming.get(field)
            if value not in (None, "") and prior.get(field) not in (None, "", value):
                raise ValueError(
                    f"amplifier {amplifier_id} conflicts on {field}: "
                    f"{prior.get(field)!r} != {value!r}"
                )
            if prior.get(field) in (None, "") and value not in (None, ""):
                prior[field] = value
        return node_id

    def add_edge(
        *,
        source_id: str,
        event_id: str,
        amplifier_node_id: str,
        evidence_id: str,
        public_receipts: list[dict[str, Any]],
    ) -> None:
        amplification_scope = (
            "SELF_AMPLIFICATION"
            if source_id == amplifier_node_id
            else "EXTERNAL_AMPLIFICATION"
        )
        amplifier_awardees[amplifier_node_id].add(source_id)
        amplifier_observations[amplifier_node_id].add(evidence_id)
        key = (source_id, amplifier_node_id)
        group = edge_groups.setdefault(
            key,
            {
                "edge_id": f"{source_id}::{amplifier_node_id}",
                "from_node_id": source_id,
                "to_node_id": amplifier_node_id,
                "relationship_type": "AMPLIFIES_BULLSHIT",
                "amplification_scope": amplification_scope,
                "observation_ids": [],
                "bullshitter_event_ids": [],
                "public_receipts": [],
            },
        )
        group["observation_ids"].append(evidence_id)
        group["bullshitter_event_ids"].append(event_id)
        group["public_receipts"].extend([dict(receipt) for receipt in public_receipts])

    # Reuse already-proven WOL propagation where the downstream event is an
    # explicit amplifier/repeater and a public receipt can be shown to the user.
    for relation in relationships:
        relation_type = str(relation.get("relationship_type") or "")
        if relation_type not in {"AMPLIFIES", "REPEATS", "SYNDICATES", "DERIVES_FROM"}:
            continue
        downstream = event_by_id.get(str(relation.get("from_id") or ""))
        upstream = event_by_id.get(str(relation.get("to_id") or ""))
        if downstream is None or upstream is None:
            continue
        source_id = str(upstream.get("source_id") or "")
        event_id = str(upstream.get("event_id") or upstream.get("incident_id") or "")
        if (
            source_id not in awardee_ids
            or event_id not in award_event_ids_by_source.get(source_id, set())
        ):
            continue
        downstream_source_id = str(downstream.get("source_id") or "")
        if not downstream_source_id:
            continue
        downstream_roles = set(downstream.get("lineage_roles") or [])
        if not downstream_roles.intersection({"AMPLIFIES", "REPEATS", "SYNDICATES"}):
            continue
        receipts = [
            dict(receipt)
            for receipt in (
                list(downstream.get("public_receipts") or [])
                + list(relation.get("public_receipts") or [])
            )
            if receipt.get("url") or receipt.get("archive_url")
        ]
        if not receipts:
            continue
        amplifier_node_id = profiled_amplifier_node(downstream_source_id)
        if amplifier_node_id is None:
            continue
        add_edge(
            source_id=source_id,
            event_id=event_id,
            amplifier_node_id=amplifier_node_id,
            evidence_id=f"REL::{relation.get('relationship_id')}",
            public_receipts=receipts,
        )

    # New discovery can add a megaphone without creating a full WOL source
    # dossier or re-adjudicating the upstream claim.
    for observation in amplification_observations:
        source_id = str(observation.get("bullshitter_source_id") or "")
        if source_id not in awardee_ids:
            continue
        event_id = str(observation.get("bullshitter_event_id") or "")
        upstream_event = event_by_id.get(event_id)
        if (
            upstream_event is None
            or str(upstream_event.get("source_id") or "") != source_id
            or event_id not in award_event_ids_by_source.get(source_id, set())
        ):
            continue

        amplifier_source_id = str(observation.get("amplifier_source_id") or "").strip()
        amplifier_node_id = (
            profiled_amplifier_node(amplifier_source_id)
            if amplifier_source_id
            else None
        )
        if amplifier_node_id is None:
            amplifier_id = str(observation.get("amplifier_id") or "").strip()
            if not amplifier_id:
                continue
            amplifier_node_id = anonymous_amplifier_node(
                amplifier_id,
                str(observation.get("amplifier_display_name") or amplifier_id),
                observation.get("amplifier_handle"),
                observation.get("amplifier_platform"),
                observation.get("amplifier_country_code"),
                observation.get("amplifier_authenticity_class"),
            )
        add_edge(
            source_id=source_id,
            event_id=event_id,
            amplifier_node_id=amplifier_node_id,
            evidence_id=str(observation.get("observation_id") or ""),
            public_receipts=list(observation.get("public_receipts") or []),
        )

    for amplifier_node_id in sorted(amplifier_awardees):
        meta = nodes[amplifier_node_id]
        roles = set(meta.get("node_roles") or [])
        roles.add("AMPLIFIER")
        if "BULLSHITTER" in set(meta.get("award_codes") or []):
            roles.add("BULLSHITTER")
        meta["node_roles"] = sorted(roles)
        upstream_sources = set(amplifier_awardees[amplifier_node_id])
        meta["bullshitter_source_count"] = len(upstream_sources)
        meta["external_upstream_source_count"] = len(
            upstream_sources - {amplifier_node_id}
        )
        meta["amplification_observation_count"] = len(
            amplifier_observations[amplifier_node_id]
        )

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
            "megaphone_nodes": len(amplifier_awardees),
            "amplification_edges": len(edges),
            "self_amplification_edges": sum(
                1 for row in edges
                if row.get("amplification_scope") == "SELF_AMPLIFICATION"
            ),
            "external_amplification_edges": sum(
                1 for row in edges
                if row.get("amplification_scope") == "EXTERNAL_AMPLIFICATION"
            ),
            "network_pattern_nodes": sum(
                1
                for node_id in amplifier_awardees
                if int(nodes[node_id].get("external_upstream_source_count") or 0) >= 5
            ),
            "high_density_hub_nodes": sum(
                1
                for node_id in amplifier_awardees
                if int(nodes[node_id].get("external_upstream_source_count") or 0) >= 10
            ),
            "cross_bullshitter_megaphones": sum(
                1
                for node_id, values in amplifier_awardees.items()
                if len(values - {node_id}) > 1
            ),
            "confirmed_bot_megaphones": sum(
                1
                for node_id in amplifier_awardees
                if nodes[node_id].get("authenticity_class") == "CONFIRMED_BOT"
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
        amplification_observations=amplification_observations,
    )
    profiles = attach_role_failure_appellations(
        profiles,
        information_events + source_behavior_incidents,
        governance,
    )
    for profile in profiles:
        country_code = profile_country_code(profile)
        if country_code:
            profile["country_code"] = country_code
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
        relationships,
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
