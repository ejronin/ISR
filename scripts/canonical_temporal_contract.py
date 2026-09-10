#!/usr/bin/env python3
"""Single production authority for Atlas Gate 3 v2 temporal semantics.

This module owns cross-field and cross-entry temporal rules. Producers,
registrars and consumers may validate structure independently, but they must not
reimplement relationships between Atlas clocks.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Iterable

CONTRACT_VERSION = "1.0"


@dataclass(frozen=True)
class TemporalProjection:
    gate2_evidence_cutoff: str
    current_evidence_cutoff: str
    tip_known_at: str | None


def parse_datetime(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be an ISO-8601 timestamp with offset")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{label} must be an ISO-8601 timestamp with offset") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError(f"{label} must include an explicit UTC offset")
    return parsed


def parse_date(value: Any, label: str) -> date:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{label} must be an ISO-8601 date")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{label} must be an ISO-8601 date") from exc


def validate_packet_temporal_semantics(packet: dict[str, Any], *, label: str = "packet") -> tuple[datetime, datetime]:
    """Validate clocks intrinsic to one packet.

    known_at is the canonical knowledge-effective time of the packet.
    evidence_cutoff is the inclusive collection/evidence horizon represented by
    the packet review. Reporting lag is first-class, therefore cutoff < known is
    legal. Evidence from after the packet became knowledge-effective is not.
    """
    known_at = parse_datetime(packet.get("known_at"), f"{label} known_at")
    evidence_cutoff = parse_datetime(packet.get("evidence_cutoff"), f"{label} evidence_cutoff")
    if evidence_cutoff > known_at:
        raise ValueError(f"{label} evidence_cutoff may not be later than {label} known_at")
    return known_at, evidence_cutoff


def validate_event_temporal_semantics(event: dict[str, Any], *, label: str) -> None:
    """Validate observation/publication clocks without conflating them with packet clocks."""
    event_day = parse_date(event.get("event_date"), f"{label} event_date")
    public_raw = event.get("public_available_time")
    if public_raw:
        public = parse_datetime(public_raw, f"{label} public_available_time")
        if public.date() < event_day:
            raise ValueError(f"backdated evidence {event.get('event_id') or label}")
    game_raw = event.get("game_knowledge_time")
    if game_raw:
        parse_datetime(game_raw, f"{label} game_knowledge_time")


def validate_accepted_lineage_temporal_ordering(
    entries: Iterable[dict[str, Any]],
    *,
    gate2_evidence_cutoff: str,
    current_evidence_cutoff: str,
) -> TemporalProjection:
    """Validate knowledge chronology and evidence-horizon chronology independently."""
    gate2 = parse_datetime(gate2_evidence_cutoff, "Gate 2 evidence cutoff")
    current = parse_datetime(current_evidence_cutoff, "current evidence cutoff")
    rows = list(entries)
    prior_known_at: datetime | None = None
    prior_cutoff: datetime | None = None
    tip_known_raw: str | None = None

    for expected_sequence, entry in enumerate(rows, start=1):
        if entry.get("sequence") != expected_sequence:
            raise ValueError("Gate 3 v2 accepted packet sequence is not contiguous")
        known_at, cutoff = validate_packet_temporal_semantics(entry, label=f"accepted entry {expected_sequence}")
        if prior_known_at is not None and known_at <= prior_known_at:
            raise ValueError("Gate 3 v2 accepted known_at values must increase strictly")
        if prior_cutoff is not None and cutoff < prior_cutoff:
            raise ValueError("Gate 3 v2 evidence cutoff may not move backward")
        prior_known_at = known_at
        prior_cutoff = cutoff
        tip_known_raw = entry["known_at"]

    derived = rows[-1]["evidence_cutoff"] if rows else gate2_evidence_cutoff
    if current_evidence_cutoff != derived:
        raise ValueError("Gate 3 v2 current_evidence_cutoff must derive from the accepted lineage tip")
    if current < gate2:
        raise ValueError("Gate 3 v2 current evidence cutoff may not precede the frozen Gate 2 boundary")

    return TemporalProjection(
        gate2_evidence_cutoff=gate2_evidence_cutoff,
        current_evidence_cutoff=derived,
        tip_known_at=tip_known_raw,
    )


def validate_manifest_temporal_contract(manifest: dict[str, Any]) -> TemporalProjection:
    entries = manifest.get("accepted_updates")
    if not isinstance(entries, list):
        raise ValueError("Gate 3 v2 accepted_updates must be an array")
    return validate_accepted_lineage_temporal_ordering(
        entries,
        gate2_evidence_cutoff=manifest.get("gate2_evidence_cutoff"),
        current_evidence_cutoff=manifest.get("current_evidence_cutoff"),
    )


def validate_candidate_append(manifest: dict[str, Any], packet: dict[str, Any]) -> TemporalProjection:
    """Validate a candidate against the accepted tip without moving either clock backward."""
    projection = validate_manifest_temporal_contract(manifest)
    candidate_known_at, candidate_cutoff = validate_packet_temporal_semantics(packet)
    entries = manifest.get("accepted_updates") or []
    if entries:
        last_known_at = parse_datetime(entries[-1]["known_at"], "accepted tip known_at")
        if candidate_known_at <= last_known_at:
            raise ValueError("Gate 3 v2 packet known_at must be strictly later than the accepted tip")
    current_cutoff = parse_datetime(projection.current_evidence_cutoff, "current evidence cutoff")
    if candidate_cutoff < current_cutoff:
        raise ValueError("Gate 3 v2 packet evidence_cutoff may not move backward")
    return TemporalProjection(
        gate2_evidence_cutoff=projection.gate2_evidence_cutoff,
        current_evidence_cutoff=packet["evidence_cutoff"],
        tip_known_at=packet["known_at"],
    )


def validate_packet_against_accepted_entry(packet: dict[str, Any], entry: dict[str, Any]) -> None:
    """Require the packet bytes and accepted temporal projection to describe the same clocks."""
    validate_packet_temporal_semantics(packet)
    if packet.get("known_at") != entry.get("known_at"):
        raise ValueError(f"Accepted Gate 3 v2 packet known_at differs from manifest: {entry.get('packet_id')}")
    if packet.get("evidence_cutoff") != entry.get("evidence_cutoff"):
        raise ValueError(f"Accepted Gate 3 v2 packet evidence_cutoff differs from manifest: {entry.get('packet_id')}")


def validate_current_state_temporal_projection(state: dict[str, Any], *, label: str = "current state") -> TemporalProjection:
    """Validate canonical/public projection of accepted lineage and evidence horizon."""
    release = state.get("release") or {}
    entries = state.get("accepted_updates_v2") or []
    try:
        gate2 = release["gate2_evidence_cutoff"]
        current = release["current_osint_cutoff"]
    except KeyError as exc:
        raise ValueError(f"{label} is missing required temporal release fields") from exc
    return validate_accepted_lineage_temporal_ordering(
        entries,
        gate2_evidence_cutoff=gate2,
        current_evidence_cutoff=current,
    )
