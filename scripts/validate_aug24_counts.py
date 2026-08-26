#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

HISTORICAL = 98
OVERLAY = 10
AUG24_CURRENT = 108
AUG24_CUTOFF = "2026-08-24T14:14:00-04:00"
LOCKED_BLOBS = {
    "data/integration-v1.2/events.json": "53b93c6f55c03d4d12ec628095bd98a41c227ff4",
    "data/integration-v1.2/timeline.json": "ed19addc25dd5d5bc912b58f9ef80ac391c15a72",
    "data/integration-v1.2/manifest.json": "6d6a357fb23acb92f9725a5c78c20718e96675cd",
}
SOURCE_NAMESPACES = [
    "data/integration-v1.2/sources.json",
    "data/forensic-v1.3.2/sources.json",
    "data/current-update-20260824/sources.json",
    "data/current-update-20260825/sources.json",
    "data/current-update-20260825-late/sources.json",
]

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

def ids_from(path):
    return {row.get("source_id") for row in load(path).get("sources", []) if row.get("source_id")}

def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

    # Historical ledger remains immutable.
    for rel, expected in LOCKED_BLOBS.items():
        path = root / rel
        if not path.exists(): fail(f"missing locked file {rel}")
        actual = git(root, "hash-object", rel)
        if actual != expected: fail(f"locked historical file changed: {rel} ({actual} != {expected})")

    hist_e = load(root/"data/integration-v1.2/events.json")
    hist_t = load(root/"data/integration-v1.2/timeline.json")
    hist_m = load(root/"data/integration-v1.2/manifest.json")
    if len(hist_e.get("events", [])) != HISTORICAL: fail("historical events != 98")
    if len(hist_t.get("records", [])) != HISTORICAL: fail("historical timeline != 98")
    if hist_m.get("counts", {}).get("events") != HISTORICAL: fail("historical manifest events != 98")
    if hist_m.get("counts", {}).get("timeline_records") != HISTORICAL: fail("historical manifest timeline != 98")

    # The Aug. 24 layer is frozen at 98 + 10 = 108 even when later overlays advance the public total.
    curdir = root/"data/current-update-20260824"
    oe, ot, osrc, om = [load(curdir/name) for name in ("events.json","timeline.json","sources.json","manifest.json")]
    events, timeline, sources = oe.get("events", []), ot.get("records", []), osrc.get("sources", [])
    if len(events) != OVERLAY: fail(f"overlay events != 10 ({len(events)})")
    if len(timeline) != OVERLAY: fail(f"overlay timeline != 10 ({len(timeline)})")
    if om.get("counts", {}).get("overlay_events") != OVERLAY: fail("overlay manifest event count mismatch")
    if om.get("counts", {}).get("overlay_timeline_records") != OVERLAY: fail("overlay manifest timeline count mismatch")
    if om.get("counts", {}).get("overlay_sources") != len(sources): fail("overlay manifest source count mismatch")
    if om.get("counts", {}).get("current_chronology_records") != AUG24_CURRENT: fail("Aug. 24 manifest current count != 108")
    if om.get("equation") != "98 + 10 = 108": fail("Aug. 24 manifest equation missing")
    if om.get("collection_cutoff") != AUG24_CUTOFF: fail("Aug. 24 manifest cutoff changed")

    hid = [row.get("event_id") for row in hist_e["events"]]
    oid = [row.get("event_id") for row in events]
    tid = [row.get("event_id") for row in timeline]
    if len(set(hid)) != HISTORICAL: fail("duplicate historical event IDs")
    if len(set(oid)) != OVERLAY: fail("duplicate Aug. 24 overlay event IDs")
    if set(hid) & set(oid): fail("Aug. 24 event ID collides with historical ledger")
    if set(oid) != set(tid): fail("Aug. 24 timeline IDs differ from event IDs")
    if len(set(hid + oid)) != AUG24_CURRENT: fail("98 + 10 != 108 in frozen Aug. 24 layer")

    source_ids = {row.get("source_id") for row in sources}
    if len(source_ids) != len(sources): fail("duplicate Aug. 24 source IDs")
    for source in sources:
        expected = canonical_source_id(source.get("url", ""))
        if source.get("source_id") != expected:
            fail(f"source ID rule mismatch for {source.get('url')}")
    historical_source_ids = ids_from(root/"data/integration-v1.2/sources.json")
    for event in events:
        refs = [ref if isinstance(ref, str) else ref.get("source_id") for ref in event.get("source_refs", [])]
        if not refs: fail(f"{event.get('event_id')} has no sources")
        for sid in refs:
            if sid not in source_ids and sid not in historical_source_ids:
                fail(f"{event.get('event_id')} unresolved source {sid}")

    # Generated registry must contain the exact union of every authoritative source namespace currently present.
    registry_path = root/"data/source-registry.json"
    if not registry_path.exists(): fail("generated data/source-registry.json missing; run build_source_registry.py first")
    registry = load(registry_path)
    expected_union = set()
    for rel in SOURCE_NAMESPACES:
        path = root / rel
        if path.exists():
            expected_union |= ids_from(path)
    registry_ids = {row.get("source_id") for row in registry.get("sources", [])}
    if registry_ids != expected_union:
        missing = sorted(expected_union-registry_ids)[:6]
        extra = sorted(registry_ids-expected_union)[:6]
        fail(f"generated source registry mismatch; missing={missing} extra={extra}")
    if not source_ids.issubset(registry_ids): fail("Aug. 24 sources absent from generated registry")

    readme = (root/"README.md").read_text(encoding="utf-8")
    index = (root/"index.html").read_text(encoding="utf-8")
    state = (root/"js/state.js").read_text(encoding="utf-8")
    work = (root/"js/workspaces-20260822.js").read_text(encoding="utf-8")
    full = (root/"js/full-scope-20260822.js").read_text(encoding="utf-8")
    builder = (root/"scripts/build_source_registry.py").read_text(encoding="utf-8")
    workflow = (root/".github/workflows/validate.yml").read_text(encoding="utf-8")

    # README may advance beyond Aug. 24; it must still identify the locked historical baseline and current-overlay architecture.
    for token in ["98 canonical historical-ledger records", "append-only", "current chronology records"]:
        if token not in readme: fail(f"README missing {token!r}")
    # index.html is the static baseline; runtime successor overlays may advance the displayed count.
    for token in [">98</b><span>canonical historical-ledger records", ">108</b><span>current chronology records", "current-update-20260824.js"]:
        if token not in index: fail(f"index missing {token!r}")
    if "timeCutoff: '2026-08-24'" not in state: fail("state default cutoff is not Aug. 24")
    for token in ["const CANONICAL='2026-08-24'", "2026-08-24 14:14 ET", "2026-08-20 15:59 ET", "2026-08-22 10:54 ET"]:
        if token not in work: fail(f"workspace lock missing {token!r}")
    if "ATLAS_CURRENT_UPDATE?.sources" not in full: fail("full-scope source map does not include current overlay")
    for rel in SOURCE_NAMESPACES[2:]:
        if rel not in builder: fail(f"source builder does not include {rel}")
    if workflow.count("validate_aug24_counts.py") < 2: fail("workflow does not run Aug. 24 integrity gate twice")

    print(f"AUG24 COUNT GATE: PASS — frozen Aug.24 layer remains {HISTORICAL}+{OVERLAY}={AUG24_CURRENT}; registry now contains {len(registry_ids)} unique sources across current namespaces")

if __name__ == "__main__":
    main()
