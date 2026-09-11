#!/usr/bin/env python3
"""Prove the direct canonical-v2 public foundation preserves accepted semantics."""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_canonical_current_state as canonical_v1
import build_public_current_state_v2 as public_v2
import public_read_model_current_foundation as current
import public_read_model_foundation as compatibility


def first_difference(left: Any, right: Any, path: str = "$") -> str | None:
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


def assert_same(left: Any, right: Any, label: str) -> None:
    difference = first_difference(left, right)
    assert difference is None, f"{label} diverged: {difference}"


def canonical_v1_compatibility_foundation() -> dict[str, Any]:
    """Build the frozen compatibility oracle without making it a release input."""
    path = ROOT / "data/canonical-current-state.json"
    existed = path.exists()
    prior = path.read_bytes() if existed else None
    state, _ = canonical_v1.build_state(ROOT)
    try:
        path.write_bytes(canonical_v1.canonical_json_bytes(state))
        return compatibility.build_compatibility_foundation(ROOT)
    finally:
        if existed:
            path.write_bytes(prior or b"")
        else:
            path.unlink(missing_ok=True)


canonical_path = ROOT / current.CANONICAL_STATE_PATH
assert canonical_path.is_file(), "build canonical-current-state-v2 before foundation parity"
canonical = json.loads(canonical_path.read_text(encoding="utf-8"))
legacy = canonical_v1_compatibility_foundation()
direct = current.build_current_foundation(ROOT)

# Reader-facing static/analytical dataset payloads are preserved exactly. The
# current entity datasets are intentionally rebound to canonical-v2 below.
current_keys = {
    "current.actors",
    "current.locations",
    "current.claims",
    "current.material_losses",
    "current.relationships",
}
for key, old_dataset in legacy["datasets"].items():
    if key in current_keys:
        continue
    assert key in direct["datasets"], f"direct foundation dropped dataset {key}"
    assert_same(direct["datasets"][key]["payload"], old_dataset["payload"], f"dataset payload {key}")

assert_same(
    direct["datasets"]["ledger.facilities"]["payload"],
    legacy["datasets"]["ledger.facilities"]["payload"],
    "facility preservation materialization",
)
assert_same(direct["page_data"], legacy["page_data"], "page-data ownership")
assert_same(direct["consumer_coverage"], legacy["consumer_coverage"], "consumer coverage")
assert_same(
    direct["datasets"]["current.actors"]["payload"],
    legacy["datasets"]["current.actors"]["payload"],
    "public actor directory",
)

# Current entity datasets now originate directly from canonical-v2. These are
# the same replacements the pre-migration public-v2 overlay applied after the
# compatibility foundation was constructed.
def records(key: str) -> list[dict[str, Any]]:
    return [copy.deepcopy(item.get("record") or item) for item in canonical["entities"].get(key, [])]

assert_same(
    direct["datasets"]["current.locations"]["payload"],
    copy.deepcopy(canonical["entities"].get("locations", [])),
    "current locations",
)
assert_same(
    direct["datasets"]["current.claims"]["payload"],
    {"schema_version": "2.0", "claims": records("claims")},
    "current claims",
)
assert_same(
    direct["datasets"]["current.material_losses"]["payload"],
    {"schema_version": "2.0", "records": records("material_losses")},
    "current material losses",
)
assert_same(
    direct["datasets"]["current.relationships"]["payload"],
    copy.deepcopy(canonical["entities"].get("relationships", [])),
    "current relationships",
)
assert_same(direct["chronology"], canonical["chronology"], "canonical chronology")
assert_same(direct["sources"], canonical["sources"], "canonical sources")
assert_same(direct["entities"], canonical["entities"], "canonical entities")

# Reconstruct the pre-switch public-v2 payload inventory and prove the current
# core exposes the same reader data. Identity/provenance metadata is expected to
# change because historical-v1 compiler/schema hashes are being removed.
expected_payloads = {
    key: copy.deepcopy(value["payload"])
    for key, value in legacy["datasets"].items()
}
expected_payloads.update({
    "current.actors": copy.deepcopy(legacy["datasets"]["current.actors"]["payload"]),
    "current.locations": copy.deepcopy(canonical["entities"].get("locations", [])),
    "current.claims": {"schema_version": "2.0", "claims": records("claims")},
    "current.material_losses": {"schema_version": "2.0", "records": records("material_losses")},
    "current.relationships": copy.deepcopy(canonical["entities"].get("relationships", [])),
    "gate3.casualties": public_v2.entity_payload(canonical, "casualties"),
    "gate3.agreements": public_v2.entity_payload(canonical, "agreements"),
    "gate3.diplomacy": public_v2.entity_payload(canonical, "diplomacy"),
    "gate3.facilities": public_v2.entity_payload(canonical, "facilities"),
    "gate3.movements": public_v2.entity_payload(canonical, "movements"),
    "gate3.shipping": public_v2.entity_payload(canonical, "shipping"),
    "gate3.economics": public_v2.entity_payload(canonical, "economics"),
    "gate3.gaps": public_v2.entity_payload(canonical, "gaps"),
    "gate3.lie_ledger": public_v2.entity_payload(canonical, "narrative_claims"),
    "gate3.narrative_families": public_v2.entity_payload(canonical, "narrative_families"),
    "gate3.information_chains": public_v2.entity_payload(canonical, "information_chains"),
    "gate3.daily_coverage": {"schema_version": "2.0", "records": copy.deepcopy(canonical["daily_coverage"])},
    "gate3.legacy_dispositions": public_v2.entity_payload(canonical, "legacy_dispositions"),
    "gate3.side_ledger_dispositions": public_v2.entity_payload(canonical, "side_ledger_dispositions"),
    "gate3.source_reliability": public_v2.entity_payload(canonical, "source_reliability"),
})
current_core = public_v2.build_state(ROOT)
assert set(current_core["datasets"]) == set(expected_payloads), "current public-v2 dataset inventory changed"
for key, expected in expected_payloads.items():
    assert_same(current_core["datasets"][key]["payload"], expected, f"public-v2 payload {key}")

# Anti-recurrence: the active public compiler/foundation may not reach through
# to public-v1 or canonical-v1 compatibility artifacts.
v2_source = (ROOT / "scripts/build_public_current_state_v2.py").read_text(encoding="utf-8")
hardened_source = (ROOT / "scripts/build_public_current_state_v2_hardened.py").read_text(encoding="utf-8")
current_source = (ROOT / "scripts/public_read_model_current_foundation.py").read_text(encoding="utf-8")
assert "public_read_model_current_foundation as foundation" in v2_source
assert "public_read_model_current_foundation as foundation" in hardened_source
for token in (
    "build_compatibility_foundation",
    "CANONICAL_V1",
    "data/canonical-current-state.json",
    "import build_public_current_state as",
):
    assert token not in v2_source, f"active public-v2 compiler retained compatibility token: {token}"
for token in (
    "scripts/build_public_current_state.py",
    "schemas/public-current-state-v1.json",
    "LEGACY_GENERATOR_PATH",
    "import build_public_current_state",
    "from build_public_current_state",
):
    assert token not in current_source, f"current foundation retained public-v1 dependency: {token}"

active_paths = {item["path"] for item in current_core.get("input_files") or []}
for retired in (
    "scripts/build_public_current_state.py",
    "schemas/public-current-state-v1.json",
    "data/canonical-current-state.json",
):
    assert retired not in active_paths, f"historical compatibility path remains in active input graph: {retired}"

print(
    "public read-model foundation parity: PASS - direct canonical-v2 foundation preserves "
    "reader payloads, facility/actor semantics, route coverage and evidence data while public-v1 inputs are inactive"
)
