#!/usr/bin/env python3
"""Prove the neutral public foundation preserves the accepted v1 seed exactly."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_public_current_state as legacy
import public_read_model_foundation as foundation


def first_difference(left: Any, right: Any, path: str = "$" ) -> str | None:
    if type(left) is not type(right):
        return f"{path}: type {type(left).__name__} != {type(right).__name__}"
    if isinstance(left, dict):
        left_keys = set(left)
        right_keys = set(right)
        if left_keys != right_keys:
            return f"{path}: keys differ; only-left={sorted(left_keys-right_keys)} only-right={sorted(right_keys-left_keys)}"
        for key in sorted(left):
            difference = first_difference(left[key], right[key], f"{path}.{key}")
            if difference:
                return difference
        return None
    if isinstance(left, list):
        if len(left) != len(right):
            return f"{path}: list length {len(left)} != {len(right)}"
        for index, (left_item, right_item) in enumerate(zip(left, right)):
            difference = first_difference(left_item, right_item, f"{path}[{index}]")
            if difference:
                return difference
        return None
    if left != right:
        return f"{path}: {left!r} != {right!r}"
    return None


legacy_state = legacy.build_state(ROOT)
foundation_state = foundation.build_compatibility_foundation(ROOT)
difference = first_difference(legacy_state, foundation_state)
assert difference is None, f"neutral foundation diverged from accepted v1 seed: {difference}"

assert foundation_state["release"]["input_set_sha256"] == legacy_state["release"]["input_set_sha256"]
assert foundation_state["datasets"]["current.actors"]["payload"] == legacy_state["datasets"]["current.actors"]["payload"]
assert foundation_state["datasets"]["ledger.facilities"]["payload"] == legacy_state["datasets"]["ledger.facilities"]["payload"]
assert foundation_state["page_data"] == legacy_state["page_data"]
assert foundation_state["consumer_coverage"] == legacy_state["consumer_coverage"]

v2_source = (ROOT / "scripts/build_public_current_state_v2.py").read_text(encoding="utf-8")
hardened_source = (ROOT / "scripts/build_public_current_state_v2_hardened.py").read_text(encoding="utf-8")
assert "import build_public_current_state as public_v1" not in v2_source
assert "public_v1.build_state" not in v2_source
assert "public_v1." not in v2_source
assert "public_core.public_v1" not in hardened_source
assert "foundation.build_compatibility_foundation(root)" in v2_source
assert "public_read_model_foundation as foundation" in v2_source
assert "public_read_model_foundation as foundation" in hardened_source

# The compatibility foundation may fingerprint the legacy generator as lineage,
# but it must never execute or import that generator.
foundation_source = (ROOT / "scripts/public_read_model_foundation.py").read_text(encoding="utf-8")
assert "import build_public_current_state" not in foundation_source
assert "from build_public_current_state" not in foundation_source
assert "LEGACY_GENERATOR_PATH" in foundation_source

print(
    "public read-model foundation parity: PASS - neutral foundation exactly matches "
    "the accepted v1 seed while current v2 compilers no longer import the v1 builder"
)
