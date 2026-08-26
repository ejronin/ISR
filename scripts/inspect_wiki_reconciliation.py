#!/usr/bin/env python3
import base64, gzip, json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / "data" / "wiki-map-reconciliation-20260826"

manifest = json.loads((PKG / "manifest.json").read_text(encoding="utf-8"))
encoded = "".join((PKG / f"payload.part{i}.b64").read_text(encoding="utf-8").strip() for i in range(1, 5))
payload = json.loads(gzip.decompress(base64.b64decode(encoded)).decode("utf-8"))

print("TOP_LEVEL_KEYS", sorted(payload.keys()))
for key in ("sources", "events", "timeline", "strikes", "material_losses"):
    value = payload.get(key)
    print("COUNT", key, len(value) if isinstance(value, list) else f"TYPE={type(value).__name__}")

coverage = payload.get("coverage_audit") or {}
print("COVERAGE_TYPE", type(coverage).__name__)
accepted = []
rejected = []
if isinstance(coverage, dict):
    print("COVERAGE_KEYS", sorted(coverage.keys()))
    accepted = coverage.get("accepted_or_corrected") or []
    rejected = coverage.get("deduped_rejected_or_unresolved") or []
    if not isinstance(accepted, list):
        accepted = []
    if not isinstance(rejected, list):
        rejected = []
elif isinstance(coverage, list):
    accepted = coverage

rows = accepted + rejected
print("COVERAGE_ACCEPTED", len(accepted))
print("COVERAGE_REJECTED_OR_UNRESOLVED", len(rejected))
print("COVERAGE_ROWS", len(rows))
for label, subset in (("ACCEPTED", accepted), ("REJECTED", rejected), ("ALL", rows)):
    if not subset:
        continue
    all_keys = sorted(set().union(*(row.keys() for row in subset if isinstance(row, dict))))
    print(f"{label}_ROW_KEYS", all_keys)
    for field in ("status", "disposition", "decision", "result", "evidence_status", "candidate_type", "category", "source_list", "reason", "rejection_reason", "notes"):
        vals = [str(r.get(field)) for r in subset if isinstance(r, dict) and r.get(field) not in (None, "")]
        if vals:
            print(f"{label}_FIELD", field, Counter(vals).most_common())
    print(f"{label}_SAMPLE_FIRST", json.dumps(subset[:3], ensure_ascii=False, sort_keys=True))
    print(f"{label}_SAMPLE_LAST", json.dumps(subset[-3:], ensure_ascii=False, sort_keys=True))

losses = payload.get("material_losses") or []
if losses:
    loss_keys = sorted(set().union(*(row.keys() for row in losses if isinstance(row, dict))))
    print("LOSS_KEYS", loss_keys)
    for field in ("asset_category", "asset_type", "category", "type", "service", "actor", "country", "country_organization", "disposition", "damage_level", "status", "evidence_status"):
        vals = [str(r.get(field)) for r in losses if isinstance(r, dict) and r.get(field) not in (None, "")]
        if vals:
            print("LOSS_FIELD", field, Counter(vals).most_common())
    shipish = [r for r in losses if any(term in json.dumps(r, ensure_ascii=False).lower() for term in ("ship", "vessel", "tanker", "cargo", "frigate", "submarine", "carrier", "destroyer", "boat", "merchant"))]
    print("SHIPISH_LOSSES", len(shipish))
    print("SHIPISH_ROWS", json.dumps(shipish, ensure_ascii=False, sort_keys=True))

sources = payload.get("sources") or []
wiki_urls = [s.get("url") for s in sources if "wiki" in str(s.get("url", "")).lower()]
print("WIKI_AUTHORITATIVE_URLS", wiki_urls)
print("MANIFEST_COUNTS", manifest.get("counts"))
