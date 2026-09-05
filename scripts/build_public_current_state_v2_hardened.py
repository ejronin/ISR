#!/usr/bin/env python3
"""Build the final Gate 3 public read model with current v2 metadata."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_current_state_v2 as public_core

OUT = "data/public-current-state-v2.json"
SCHEMA = "schemas/public-current-state-v2.json"
GENERATOR = "scripts/build_public_current_state_v2_hardened.py"
GENERATOR_VERSION = "2.0"


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def build_state(root: Path = ROOT) -> dict[str, Any]:
    root = Path(root).resolve()
    state = public_core.build_state(root)
    actual = len((state.get("sources") or {}).get("records") or [])
    counts = state.setdefault("counts", {})
    if "v1_public_source_records" not in counts:
        counts["v1_public_source_records"] = counts.get("source_records")
    if "v1_public_canonical_source_records" not in counts:
        counts["v1_public_canonical_source_records"] = counts.get("canonical_source_records")
    counts["source_records"] = actual
    counts["canonical_source_records"] = actual
    counts["gate3_source_records"] = actual
    canonical = json.loads((root / "data/canonical-current-state-v2.json").read_text(encoding="utf-8"))
    counts["gate3_source_reliability_records"] = len(canonical["entities"].get("source_reliability") or [])
    counts["gate3_forensic_proposition_records"] = canonical["counts"].get("gate3_forensic_proposition_records", 0)
    counts["gate3_daily_coverage_days"] = len(canonical.get("daily_coverage") or [])
    counts["chronology_referenced_sources"] = len({
        source_id for item in state.get("chronology") or [] for source_id in item.get("source_ids") or []
    })
    counts["page_dataset_referenced_sources"] = len(public_core.public_v1.extract_source_ids(state.get("datasets") or {}))

    input_roles = {
        "data/canonical-current-state-v2.json": "DERIVED_GATE3_CANONICAL_CURRENT_STATE",
        "scripts/build_public_current_state_v2.py": "GATE3_PUBLIC_READ_MODEL_GENERATOR",
        GENERATOR: "PHASE9_PUBLIC_READ_MODEL_GENERATOR",
        SCHEMA: "PHASE9_PUBLIC_READ_MODEL_SCHEMA",
    }
    input_files = {item["path"]: item for item in state.get("input_files") or []}
    for path, role in input_roles.items():
        raw = public_core.public_v1.canonical_input_bytes((root / path).read_bytes())
        input_files[path] = {
            "path": path,
            "sha256": sha256(raw),
            "bytes": len(raw),
            "hash_basis": "UTF8_LF_NORMALIZED",
            "roles": [role],
        }
    state["input_files"] = [input_files[path] for path in sorted(input_files)]
    input_set_material = "".join(
        f"{item['path']}\0{item['sha256']}\n" for item in state["input_files"]
    ).encode("utf-8")
    input_set_sha256 = sha256(input_set_material)
    state["release"]["input_set_sha256"] = input_set_sha256
    state["release"]["release_identity"] = f"public-current-v2-{input_set_sha256[:16]}"
    generator_raw = public_core.public_v1.canonical_input_bytes((root / GENERATOR).read_bytes())
    schema_raw = public_core.public_v1.canonical_input_bytes((root / SCHEMA).read_bytes())
    state["generator"] = {
        "version": GENERATOR_VERSION,
        "script_path": GENERATOR,
        "script_sha256": sha256(generator_raw),
        "schema_path": SCHEMA,
        "schema_sha256": sha256(schema_raw),
    }
    state.setdefault("integrity", {}).update({
        "source_count_metadata_current": counts["source_records"] == actual,
        "source_reliability_populated": counts["gate3_source_reliability_records"] > 0,
        "gate3_lie_ledger_hardening_complete": bool(canonical["integrity"].get("gate3_lie_ledger_hardening_complete")),
    })
    return state


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default=OUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    serialized = canonical_bytes(build_state(root))
    if args.check:
        if not output.is_file() or output.read_bytes() != serialized:
            raise SystemExit(f"FAIL: generated hardened Gate 3 public state is missing or stale: {output}")
        print("gate3 hardened public state: PASS")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(f"gate3 hardened public state: wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
