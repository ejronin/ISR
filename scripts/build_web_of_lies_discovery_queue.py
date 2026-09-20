#!/usr/bin/env python3
"""Build the Web of Lies queue for evidence sequences without a canonical claim family.

Evidence Integration may hand Web of Lies useful chronology before Claims
Forensics has assigned a canonical Lie Ledger family. Those sequences must not
be discarded, silently attached to a nearby family, or allowed into Hall
metrics. This queue preserves them until the canonical claims lane resolves
their family/adjudication placement.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import jsonschema

ROOT = Path(__file__).resolve().parents[1]
HANDOFF = "data/evidence-integration/rook-catchup-web-of-lies-input-20260920.json"
SCHEMA = "schemas/web-of-lies-discovery-queue-v1.json"
OUTPUT = "data/web-of-lies/discovery-queue.json"


def load(root: Path, path: str) -> Any:
    return json.loads((root / path).read_text(encoding="utf-8"))


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def build_queue(root: Path) -> dict[str, Any]:
    handoff = load(root, HANDOFF)
    items = []
    for sequence in handoff.get("statement_sequences") or []:
        if sequence.get("claim_family_ref") is not None:
            continue
        sequence_id = str(sequence.get("sequence_id") or "").strip()
        observations = sequence.get("observations") or []
        note = str(sequence.get("downstream_note") or "").strip()
        if not sequence_id or not observations or not note:
            raise ValueError(f"incomplete Web of Lies handoff sequence: {sequence!r}")
        items.append({
            "discovery_id": sequence_id,
            "status": "AWAITING_CANONICAL_CLAIM_FAMILY",
            "claim_family_ref": None,
            "observations": observations,
            "downstream_note": note,
            "review_target": "INFORMATION_CLAIMS_AND_FORENSIC_ADJUDICATION",
            "review_reason": (
                "Evidence Integration supplied a source/chronology sequence for Web of Lies, "
                "but no canonical Lie Ledger claim family is assigned. Preserve it outside "
                "lineage/Hall scoring until Claims Forensics resolves family placement."
            ),
        })
    items.sort(key=lambda row: row["discovery_id"])
    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_DISCOVERY_QUEUE",
        "authority": "WEB_OF_LIES_INFORMATION_FORENSICS",
        "source_handoff": HANDOFF,
        "as_of": handoff.get("as_of"),
        "items": items,
    }


def validate(root: Path, queue: dict[str, Any]) -> None:
    schema = load(root, SCHEMA)
    jsonschema.Draft202012Validator(schema).validate(queue)
    ids = [row["discovery_id"] for row in queue["items"]]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate Web of Lies discovery IDs")
    if any(row["claim_family_ref"] is not None for row in queue["items"]):
        raise ValueError("assigned-family sequence leaked into discovery queue")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default=OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    queue = build_queue(root)
    validate(root, queue)
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output

    serialized = canonical_bytes(queue)
    if args.check:
        if not output.is_file() or output.read_bytes() != serialized:
            raise SystemExit(f"FAIL stale {output}")
        print(f"web-of-lies discovery queue: PASS items={len(queue['items'])}")
        return 0

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(f"web-of-lies discovery queue: wrote {output} items={len(queue['items'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
