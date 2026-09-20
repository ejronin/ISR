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
) -> None:
    if forensic.get("artifact_role") != "WEB_OF_LIES_FORENSIC_INPUT":
        raise ValueError("unexpected Web of Lies forensic input role")
    if forensic.get("authority") != "WEB_OF_LIES_INFORMATION_FORENSICS":
        raise ValueError("unexpected Web of Lies forensic input authority")

    profiles = forensic.get("source_profiles") or []
    events = forensic.get("information_events") or []
    relationships = forensic.get("relationships") or []
    flags = forensic.get("promotion_flags") or []

    allowed_classes = set(governance.get("source_behavior_classes") or [])
    allowed_authenticity = set(governance.get("authenticity_classes") or [])
    allowed_revenue = set(governance.get("revenue_classes") or [])
    allowed_correction = set(governance.get("correction_states") or [])
    allowed_moral_findings = set(governance.get("moral_severity_findings") or [])
    allowed_flags = set((governance.get("authority") or {}).get("promotion_flags") or [])

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
        revenue_findings = set(event.get("revenue_findings") or [])
        unsupported_revenue = revenue_findings - allowed_revenue
        if unsupported_revenue:
            raise ValueError(f"information event {event_id} has unsupported revenue findings: {sorted(unsupported_revenue)}")
        events_by_source[source_id].add(event_id)

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

    flag_ids: set[str] = set()
    for flag in flags:
        fid = str(flag.get("flag_id") or "").strip()
        if not fid or fid in flag_ids:
            raise ValueError(f"duplicate or missing promotion flag id: {fid!r}")
        flag_ids.add(fid)
        if flag.get("flag_type") not in allowed_flags:
            raise ValueError(f"promotion flag {fid} has unsupported type {flag.get('flag_type')}")

    for profile in profiles:
        source_id = profile["source_id"]
        basis = set(profile.get("classification_basis_event_ids") or [])
        missing = basis - event_ids
        if missing:
            raise ValueError(f"source profile {source_id} classification basis references unknown events: {sorted(missing)}")
        foreign = basis - events_by_source[source_id]
        if foreign:
            raise ValueError(f"source profile {source_id} classification basis uses another source's events: {sorted(foreign)}")
        substantive_classes = [value for value in profile.get("behavior_classes") or [] if value != "UNKNOWN"]
        if substantive_classes and not basis:
            raise ValueError(f"source profile {source_id} has substantive behavior classes without classification-basis events")
        for source_class in substantive_classes:
            if not any(source_class in (events_by_id[event_id].get("behavior_findings") or []) for event_id in basis):
                raise ValueError(
                    f"source profile {source_id} class {source_class} is not supported by its classification-basis events"
                )

        revenue_basis = set(profile.get("revenue_basis_event_ids") or [])
        missing_revenue = revenue_basis - event_ids
        if missing_revenue:
            raise ValueError(f"source profile {source_id} revenue basis references unknown events: {sorted(missing_revenue)}")
        foreign_revenue = revenue_basis - events_by_source[source_id]
        if foreign_revenue:
            raise ValueError(f"source profile {source_id} revenue basis uses another source's events: {sorted(foreign_revenue)}")
        substantive_revenue = [value for value in profile.get("revenue_model") or [] if value != "UNKNOWN_REVENUE_MODEL"]
        if substantive_revenue and not revenue_basis:
            raise ValueError(f"source profile {source_id} has observed revenue classes without revenue-basis events")
        for revenue_class in substantive_revenue:
            if not any(revenue_class in (events_by_id[event_id].get("revenue_findings") or []) for event_id in revenue_basis):
                raise ValueError(
                    f"source profile {source_id} revenue class {revenue_class} is not supported by its revenue-basis events"
                )


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
    metrics["claim_families_traced"] = len({str(e["claim_family_id"]) for e in events})
    downstream_values = []
    for event in events:
        metric_key = METRIC_EVENT_TYPES.get(str(event.get("event_type") or ""))
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


def build_registry(
    canonical: dict[str, Any],
    forensic: dict[str, Any],
    governance: dict[str, Any],
) -> dict[str, Any]:
    initial_families = derive_claim_families(canonical, [], [])
    family_ids = {item["claim_family_id"] for item in initial_families}
    validate_forensic_input(forensic, governance, family_ids)

    information_events = [dict(item) for item in (forensic.get("information_events") or [])]
    relationships = [dict(item) for item in (forensic.get("relationships") or [])]
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
    current_period = ranking_view(profiles, recent_events, supported_classes)

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
        "relationships": sorted(relationships, key=lambda item: item["relationship_id"]),
        "promotion_flags": sorted(
            [dict(item) for item in (forensic.get("promotion_flags") or [])],
            key=lambda item: item["flag_id"],
        ),
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
