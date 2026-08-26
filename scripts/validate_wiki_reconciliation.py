#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / "data" / "wiki-map-reconciliation-20260826"


def load(name: str) -> dict:
    return json.loads((PKG / name).read_text(encoding="utf-8"))


def fail(message: str) -> None:
    raise SystemExit("WIKI RECONCILIATION GATE: FAIL — " + message)


def sid(ref):
    value = ref
    seen = set()
    while isinstance(value, dict):
        marker = id(value)
        if marker in seen:
            return None
        seen.add(marker)
        value = value.get("source_id") or value.get("id")
    return value if isinstance(value, str) and value else None


def sids(values):
    return [value for value in (sid(ref) for ref in (values or [])) if value]


def main() -> int:
    required = ["manifest.json", "coverage-audit.json", "events.json", "timeline.json", "sources.json", "strikes.json", "material-losses.json"]
    missing = [name for name in required if not (PKG / name).exists()]
    if missing:
        fail(f"materialized products missing: {missing}; run materialize_wiki_reconciliation.py")

    manifest = load("manifest.json")
    audit = load("coverage-audit.json")
    events = load("events.json").get("events", [])
    timeline = load("timeline.json").get("records", [])
    sources = load("sources.json").get("sources", [])
    strikes = load("strikes.json").get("strikes", [])
    losses = load("material-losses.json").get("records", [])
    counts = manifest.get("counts", {})

    expected = {
        "events": counts.get("accepted_or_corrected_events"),
        "timeline": counts.get("accepted_or_corrected_events"),
        "strikes": counts.get("strike_markers"),
        "losses": counts.get("material_loss_records"),
        "sources": counts.get("sources"),
    }
    actual = {"events": len(events), "timeline": len(timeline), "strikes": len(strikes), "losses": len(losses), "sources": len(sources)}
    if actual != expected:
        fail(f"manifest/product count mismatch actual={actual} expected={expected}")

    accepted = audit.get("accepted_or_corrected") or []
    rejected = audit.get("deduped_rejected_or_unresolved") or []
    if len(accepted) != 81 or len(rejected) != 18 or len(accepted) + len(rejected) != 99:
        fail(f"candidate accounting must be 81 + 18 = 99; got {len(accepted)} + {len(rejected)}")
    if counts.get("coverage_candidates_documented") != 99:
        fail("manifest candidate count != 99")

    source_ids = [row.get("source_id") for row in sources]
    if None in source_ids or len(source_ids) != len(set(source_ids)):
        fail("source IDs missing or duplicated")
    source_set = set(source_ids)
    for source in sources:
        url = str(source.get("url") or "")
        if not url.startswith("https://"):
            fail(f"non-HTTPS authoritative source: {source.get('source_id')} {url}")
        if "wikipedia" in url.lower() or "wikizero" in url.lower():
            fail(f"Wikipedia leaked into authoritative source set: {source.get('source_id')}")

    event_ids = [row.get("event_id") for row in events]
    timeline_ids = [row.get("event_id") for row in timeline]
    if None in event_ids or len(event_ids) != len(set(event_ids)):
        fail("event IDs missing or duplicated")
    if set(event_ids) != set(timeline_ids) or len(timeline_ids) != len(set(timeline_ids)):
        fail("timeline/event ID set mismatch")
    for event in events:
        refs = sids(event.get("source_refs"))
        if not refs:
            fail(f"event {event.get('event_id')} has no underlying sources")
        unresolved = [ref for ref in refs if ref not in source_set]
        if unresolved:
            fail(f"event {event.get('event_id')} unresolved sources {unresolved}")

    accepted_event_ids = {row.get("atlas_event_id") for row in accepted}
    if accepted_event_ids != set(event_ids):
        fail(f"accepted audit/event mismatch missing={sorted(set(event_ids)-accepted_event_ids)[:5]} extra={sorted(accepted_event_ids-set(event_ids))[:5]}")
    for row in accepted:
        if not row.get("candidate") or not row.get("disposition") or not row.get("reason"):
            fail(f"accepted audit row incomplete: {row}")
        refs = sids(row.get("underlying_source_ids"))
        if not refs:
            fail(f"accepted candidate lacks underlying evidence: {row.get('candidate')}")
        unresolved = [ref for ref in refs if ref not in source_set]
        if unresolved:
            fail(f"accepted candidate unresolved underlying evidence {row.get('candidate')}: {unresolved}")
    for row in rejected:
        if not row.get("candidate") or not row.get("disposition") or not row.get("reason"):
            fail(f"rejected/unresolved audit row lacks explicit reason: {row}")

    strike_ids = [row.get("id") for row in strikes]
    if None in strike_ids or len(strike_ids) != len(set(strike_ids)):
        fail("strike marker IDs missing or duplicated")
    for strike in strikes:
        urls = strike.get("source_urls") or [pair[1] for pair in strike.get("sources", []) if isinstance(pair, list) and len(pair) > 1]
        if not urls:
            fail(f"strike marker {strike.get('id')} has no public evidence URL")
        if any("wikipedia" in str(url).lower() for url in urls):
            fail(f"strike marker {strike.get('id')} cites Wikipedia")

    loss_ids = [row.get("loss_id") for row in losses]
    if None in loss_ids or len(loss_ids) != len(set(loss_ids)):
        fail("material loss IDs missing or duplicated")
    accepted_loss_ids = {row.get("atlas_loss_id") for row in accepted if row.get("atlas_loss_id")}
    if set(loss_ids) - accepted_loss_ids:
        fail(f"loss records lack accepted candidate lineage: {sorted(set(loss_ids)-accepted_loss_ids)[:5]}")
    for loss in losses:
        refs = sids(loss.get("source_ids"))
        if not refs:
            fail(f"material loss {loss.get('loss_id')} has no sources")
        unresolved = [ref for ref in refs if ref not in source_set]
        if unresolved:
            fail(f"material loss {loss.get('loss_id')} unresolved sources {unresolved}")
        if loss.get("status") == "DESTROYED" and str(loss.get("disposition", "")).upper() not in {"SUNK", "DESTROYED"}:
            fail(f"destroyed record has incompatible disposition: {loss.get('loss_id')}")

    items = {str(row.get("item") or "").lower(): row for row in losses}
    if not any("mkd vyom" in item for item in items):
        fail("MKD Vyom missing from material-loss ledger")
    if not any("hercules star" in item for item in items):
        fail("Hercules Star missing from material-loss ledger")
    for forbidden in ("ocean electra", "msc grace", "haiphong express"):
        if any(forbidden in item for item in items):
            fail(f"non-durable/claim-only vessel incorrectly counted as loss: {forbidden}")

    service_counts = Counter(row.get("service") for row in losses)
    if service_counts.get("Commercial maritime") != 35 or service_counts.get("Iranian Navy / IRGC Navy") != 5:
        fail(f"unexpected maritime service split: {service_counts}")
    status_counts = Counter(row.get("status") for row in losses)
    if status_counts != Counter({"DAMAGED": 34, "DESTROYED": 4, "SEIZED": 1, "DISABLED": 1}):
        fail(f"unexpected loss-status distribution: {status_counts}")

    if counts.get("prior_runtime_chronology") != 121 or counts.get("reconciled_runtime_chronology") != 202:
        fail("runtime chronology equation must remain 121 + 81 = 202")

    print(
        "WIKI RECONCILIATION GATE: PASS — 99/99 candidates accounted for; "
        "81 accepted/corrected, 18 rejected/unresolved with reasons; 56 non-Wikipedia sources; "
        "40 maritime losses with hit/loss distinctions preserved; runtime chronology 202"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
