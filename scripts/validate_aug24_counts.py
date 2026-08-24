#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

BASE = "c33de866114e99d52340b99bbdf65cab18029f1a"
HISTORICAL = 98
OVERLAY = 10
CURRENT = 108
CUTOFF = "2026-08-24T14:14:00-04:00"
LOCKED_BLOBS = {
    "data/integration-v1.2/events.json": "53b93c6f55c03d4d12ec628095bd98a41c227ff4",
    "data/integration-v1.2/timeline.json": "ed19addc25dd5d5bc912b58f9ef80ac391c15a72",
    "data/integration-v1.2/manifest.json": "6d6a357fb23acb92f9725a5c78c20718e96675cd",
}

def fail(message):
    raise SystemExit("AUG24 COUNT GATE: FAIL — " + message)

def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{path}: {exc}")

def git(root, *args):
    return subprocess.check_output(["git", *args], cwd=root, text=True).strip()

def canonical_source_id(url):
    return "SRC-" + hashlib.sha1(url.rstrip("/").encode()).hexdigest()[:12].upper()

def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

    for rel, expected in LOCKED_BLOBS.items():
        path = root / rel
        if not path.exists(): fail(f"missing locked file {rel}")
        try:
            actual = git(root, "hash-object", rel)
        except Exception as exc:
            fail(f"cannot hash locked file {rel}: {exc}")
        if actual != expected: fail(f"locked historical file changed: {rel} ({actual} != {expected})")

    hist_e = load(root/"data/integration-v1.2/events.json")
    hist_t = load(root/"data/integration-v1.2/timeline.json")
    hist_m = load(root/"data/integration-v1.2/manifest.json")
    if len(hist_e.get("events", [])) != HISTORICAL: fail("historical events != 98")
    if len(hist_t.get("records", [])) != HISTORICAL: fail("historical timeline != 98")
    if hist_m.get("counts", {}).get("events") != HISTORICAL: fail("historical manifest events != 98")
    if hist_m.get("counts", {}).get("timeline_records") != HISTORICAL: fail("historical manifest timeline != 98")

    curdir = root/"data/current-update-20260824"
    oe, ot, osrc, om = [load(curdir/name) for name in ("events.json","timeline.json","sources.json","manifest.json")]
    events, timeline, sources = oe.get("events", []), ot.get("records", []), osrc.get("sources", [])
    if len(events) != OVERLAY: fail(f"overlay events != 10 ({len(events)})")
    if len(timeline) != OVERLAY: fail(f"overlay timeline != 10 ({len(timeline)})")
    if om.get("counts", {}).get("overlay_events") != OVERLAY: fail("overlay manifest event count mismatch")
    if om.get("counts", {}).get("overlay_timeline_records") != OVERLAY: fail("overlay manifest timeline count mismatch")
    if om.get("counts", {}).get("overlay_sources") != len(sources): fail("overlay manifest source count mismatch")
    if om.get("counts", {}).get("current_chronology_records") != CURRENT: fail("overlay manifest current count != 108")
    if om.get("equation") != "98 + 10 = 108": fail("overlay manifest equation missing")

    hid = [row.get("event_id") for row in hist_e["events"]]
    oid = [row.get("event_id") for row in events]
    tid = [row.get("event_id") for row in timeline]
    if len(set(hid)) != HISTORICAL: fail("duplicate historical event IDs")
    if len(set(oid)) != OVERLAY: fail("duplicate overlay event IDs")
    if set(hid) & set(oid): fail("overlay event ID collides with historical ledger")
    if set(oid) != set(tid): fail("overlay timeline IDs differ from overlay event IDs")
    if len(set(hid + oid)) != CURRENT: fail("98 + 10 != 108")

    source_ids = {row.get("source_id") for row in sources}
    if len(source_ids) != len(sources): fail("duplicate overlay source IDs")
    for source in sources:
        expected = canonical_source_id(source.get("url", ""))
        if source.get("source_id") != expected:
            fail(f"source ID rule mismatch for {source.get('url')}")
    historical_source_ids = {row.get("source_id") for row in load(root/"data/integration-v1.2/sources.json").get("sources", [])}
    for event in events:
        refs = [ref if isinstance(ref, str) else ref.get("source_id") for ref in event.get("source_refs", [])]
        if not refs: fail(f"{event.get('event_id')} has no sources")
        for sid in refs:
            if sid not in source_ids and sid not in historical_source_ids:
                fail(f"{event.get('event_id')} unresolved source {sid}")
    for source in sources:
        for event_id in source.get("records_supported", []):
            if event_id not in set(oid): fail(f"{source['source_id']} supports unknown overlay event {event_id}")

    # Generated registry must contain the exact union of authoritative source namespaces.
    registry_path = root/"data/source-registry.json"
    if not registry_path.exists(): fail("generated data/source-registry.json missing; run build_source_registry.py first")
    registry = load(registry_path)
    forensic_path = root/"data/forensic-v1.3.2/sources.json"
    forensic_ids = {row.get("source_id") for row in load(forensic_path).get("sources", [])} if forensic_path.exists() else set()
    expected_union = historical_source_ids | forensic_ids | source_ids
    registry_ids = {row.get("source_id") for row in registry.get("sources", [])}
    if registry_ids != expected_union:
        missing = sorted(expected_union-registry_ids)[:6]
        extra = sorted(registry_ids-expected_union)[:6]
        fail(f"generated source registry mismatch; missing={missing} extra={extra}")
    if not source_ids.issubset(registry_ids): fail("overlay sources absent from generated registry")

    readme = (root/"README.md").read_text(encoding="utf-8")
    index = (root/"index.html").read_text(encoding="utf-8")
    state = (root/"js/state.js").read_text(encoding="utf-8")
    work = (root/"js/workspaces-20260822.js").read_text(encoding="utf-8")
    full = (root/"js/full-scope-20260822.js").read_text(encoding="utf-8")
    builder = (root/"scripts/build_source_registry.py").read_text(encoding="utf-8")
    workflow = (root/".github/workflows/validate.yml").read_text(encoding="utf-8")

    required_readme = ["98 canonical historical-ledger records", "108 current chronology records", "98 locked historical + 10 append-only current overlay", "2026-08-24 14:14 ET"]
    for token in required_readme:
        if token not in readme: fail(f"README missing {token!r}")
    for token in [">98</b><span>canonical historical-ledger records", ">108</b><span>current chronology records", "current-update-20260824.js"]:
        if token not in index: fail(f"index missing {token!r}")
    if "timeCutoff: '2026-08-24'" not in state: fail("state default cutoff is not Aug. 24")
    for token in ["const CANONICAL='2026-08-24'", "2026-08-24 14:14 ET", "2026-08-20 15:59 ET", "2026-08-22 10:54 ET"]:
        if token not in work: fail(f"workspace lock missing {token!r}")
    if "ATLAS_CURRENT_UPDATE?.sources" not in full: fail("full-scope source map does not include current overlay")
    if "data/current-update-20260824/sources.json" not in builder: fail("source builder does not include current overlay")
    if workflow.count("validate_aug24_counts.py") < 2: fail("workflow does not run Aug. 24 count gate twice")

    print(f"AUG24 COUNT GATE: PASS — {HISTORICAL} locked + {OVERLAY} overlay = {CURRENT} current; {len(sources)} overlay sources; registry {len(registry_ids)} unique sources")

if __name__ == "__main__":
    main()
