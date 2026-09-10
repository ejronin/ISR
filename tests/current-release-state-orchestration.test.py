#!/usr/bin/env python3
"""Static regression for the single current-state release orchestration contract."""
from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "build_current_release_state.py"

spec = importlib.util.spec_from_file_location("build_current_release_state", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


def normalized(commands):
    return [
        tuple(Path(part).as_posix() if index == 1 else part for index, part in enumerate(command))
        for command in commands
    ]


build = normalized(module.BUILD_COMMANDS)
check = normalized(module.CHECK_COMMANDS)

assert build[0][1:] == ("scripts/build_canonical_current_state.py",)
assert (
    "scripts/build_canonical_current_state_v2_final.py",
    "--output",
    "data/canonical-current-state-v2.json",
) in [item[1:] for item in build]
assert (
    "scripts/build_public_current_state_v2_hardened.py",
    "--output",
    "data/public-current-state.json",
) in [item[1:] for item in build]

for validator in (
    "scripts/validate_canonical_authority.py",
    "scripts/validate_canonical_update_pipeline.py",
    "scripts/validate_gate3_final.py",
    "scripts/validate_public_current_state_v2.py",
):
    assert any(item[1] == validator for item in build), f"build contract omitted {validator}"
    assert any(item[1] == validator for item in check), f"check contract omitted {validator}"

# Public-v1 remains frozen compatibility lineage, but it is no longer a release
# artifact or release validator. The current public path has one meaning: v2.
retired_public_v1_release_steps = {
    "scripts/build_public_current_state.py",
    "scripts/validate_public_current_state.py",
    "scripts/validate_public_current_state_compat.py",
}
assert not any(item[1] in retired_public_v1_release_steps for item in build), (
    "release build still executes a legacy public-v1 artifact step"
)
assert not any(item[1] in retired_public_v1_release_steps for item in check), (
    "release check still executes a legacy public-v1 artifact step"
)

assert all(
    "--check" in item or item[1].startswith("scripts/validate_") for item in check
), "check mode contains a write-capable builder"
assert build[-1][1] == "scripts/validate_public_current_state_v2.py"
assert check[-1][1] == "scripts/validate_public_current_state_v2.py"

source = SCRIPT.read_text(encoding="utf-8")
assert "subprocess.run" in source and "check=True" in source
assert "BUILD_COMMANDS" in source and "CHECK_COMMANDS" in source
assert "TemporaryDirectory" not in source
assert "legacy public-v1" in source.lower()

# Every production release qualification path already executes this test. Keep
# exact in-memory parity against the frozen v1 seed as the compatibility proof,
# without creating a v1 artifact in the release sequence.
subprocess.run(
    [sys.executable, "tests/public-read-model-foundation-parity.test.py"],
    cwd=ROOT,
    check=True,
)

print(
    "current release-state orchestration: PASS - canonical lineage remains qualified, "
    "public-v1 artifact execution is retired, and the release-facing public state is v2-only"
)
