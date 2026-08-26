#!/usr/bin/env python3
"""Apply the minimal runtime/build integration for the vetted historical reconciliation."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(path: str, old: str, new: str, marker: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if marker in text:
        return
    if old not in text:
        raise SystemExit(f"integration patch anchor missing in {path}: {old[:80]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


def main() -> int:
    source_anchor = '    "data/current-update-20260825-late/sources.json",\n]'
    source_replacement = '    "data/current-update-20260825-late/sources.json",\n    "data/current-update-20260826/sources.json",\n    "data/wiki-map-reconciliation-20260826/sources.json",\n]'
    patch(
        "scripts/build_source_registry.py",
        source_anchor,
        source_replacement,
        '"data/wiki-map-reconciliation-20260826/sources.json"',
    )
    patch(
        "scripts/validate_aug24_counts.py",
        source_anchor,
        source_replacement,
        '"data/wiki-map-reconciliation-20260826/sources.json"',
    )

    timeline_anchor = 'const timelineRecordById=new Map((LEDGER.timeline.records||[]).map(row=>[row.event_id,row]));\nwindow.registerAtlasEvents=function registerAtlasEvents(events){'
    timeline_replacement = '''const timelineRecordById=new Map((LEDGER.timeline.records||[]).map(row=>[row.event_id,row]));
window.registerAtlasTimelineRecords=function registerAtlasTimelineRecords(records){(records||[]).forEach(row=>{if(row?.event_id)timelineRecordById.set(row.event_id,row);});};
window.registerAtlasEvents=function registerAtlasEvents(events){'''
    patch(
        "js/app.js",
        timeline_anchor,
        timeline_replacement,
        "window.registerAtlasTimelineRecords=function registerAtlasTimelineRecords",
    )

    aug26_anchor = '  async function init(){\n'
    aug26_replacement = '''  function loadHistoricalReconciliation(){
    if(document.querySelector('script[data-historical-reconciliation-20260826]')) return;
    const script=document.createElement('script');
    script.src='./js/wiki-map-reconciliation-20260826.js?v=20260826-r2';
    script.async=false;
    script.dataset.historicalReconciliation20260826='1';
    document.head.append(script);
  }

  async function init(){
'''
    patch(
        "js/current-update-20260826.js",
        aug26_anchor,
        aug26_replacement,
        "data-historical-reconciliation-20260826",
    )

    start_anchor = "  const start = () => init().catch(error => console.warn('Aug. 26 current overlay unavailable; prior chronology remains usable.', error));"
    start_replacement = "  const start = () => init().then(loadHistoricalReconciliation).catch(error => console.warn('Aug. 26 current overlay unavailable; prior chronology remains usable.', error));"
    patch(
        "js/current-update-20260826.js",
        start_anchor,
        start_replacement,
        "init().then(loadHistoricalReconciliation)",
    )

    print("integration patch: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
