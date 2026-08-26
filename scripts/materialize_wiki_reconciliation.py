#!/usr/bin/env python3
"""Materialize the vetted Wikipedia-discovery reconciliation into normal JSON products.

Wikipedia is discovery-only. This script never treats a Wikipedia row as evidence.
The frozen integration-v1.2 snapshot remains unchanged; this package is an additive
historical reconciliation layer loaded after the current overlay chain.
"""
from __future__ import annotations

import base64
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / "data" / "wiki-map-reconciliation-20260826"
PARTS = [PKG / f"payload.part{i}.b64" for i in range(1, 5)]


def load_payload() -> dict:
    encoded = "".join(path.read_text(encoding="utf-8").strip() for path in PARTS)
    return json.loads(gzip.decompress(base64.b64decode(encoded)).decode("utf-8"))


def dump(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    manifest = json.loads((PKG / "manifest.json").read_text(encoding="utf-8"))
    payload = load_payload()
    counts = manifest["counts"]

    expected = {
        "sources": counts["sources"],
        "events": counts["accepted_or_corrected_events"],
        "timeline": counts["accepted_or_corrected_events"],
        "strikes": counts["strike_markers"],
        "material_losses": counts["material_loss_records"],
    }
    for key, count in expected.items():
        rows = payload.get(key)
        if not isinstance(rows, list) or len(rows) != count:
            raise SystemExit(f"materialize: {key} count mismatch: {len(rows) if isinstance(rows, list) else type(rows).__name__} != {count}")

    coverage = payload.get("coverage_audit") or {}
    accepted = coverage.get("accepted_or_corrected") or []
    rejected = coverage.get("deduped_rejected_or_unresolved") or []
    if len(accepted) + len(rejected) != counts["coverage_candidates_documented"]:
        raise SystemExit("materialize: coverage candidate count mismatch")

    meta = {
        "schema_version": "1.0",
        "as_of": manifest["collection_cutoff"],
        "layer": manifest["role"],
        "discovery_basis": manifest["discovery_basis"],
        "evidence_rule": manifest["evidence_rule"],
    }
    dump(PKG / "events.json", {**meta, "events": payload["events"]})
    dump(PKG / "timeline.json", {**meta, "records": payload["timeline"]})
    dump(PKG / "sources.json", {**meta, "sources": payload["sources"]})
    dump(PKG / "strikes.json", {**meta, "strikes": payload["strikes"]})
    dump(
        PKG / "material-losses.json",
        {
            **meta,
            "accounting_rule": "Hit != loss. Durable destruction, damage, disablement and seizure remain distinct; near misses and claim-only impacts are excluded.",
            "records": payload["material_losses"],
        },
    )
    dump(PKG / "coverage-audit.json", coverage)

    print(
        "materialize: PASS — "
        f"{len(payload['events'])} events, {len(payload['strikes'])} strike markers, "
        f"{len(payload['material_losses'])} material losses, {len(payload['sources'])} sources, "
        f"{len(accepted)} accepted/corrected + {len(rejected)} rejected/unresolved"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
