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
historical = normalized(module.HISTORICAL_AUDIT_COMMANDS)

assert build[0][1:] == (
    "scripts/build_canonical_current_state_v2_final.py",
    "--output",
    "data/canonical-current-state-v2.json",
)
assert (
    "scripts/build_public_current_state_v2_hardened.py",
    "--output",
    "data/public-current-state.json",
) in [item[1:] for item in build]

for validator in (
    "scripts/validate_gate3_final.py",
    "scripts/validate_public_current_state_v2.py",
):
    assert any(item[1] == validator for item in build), f"build contract omitted {validator}"
    assert any(item[1] == validator for item in check), f"check contract omitted {validator}"

# Current release choreography must not generate/check canonical-v1 or bind its
# old authority/update validators into every production build.
retired_current_steps = {
    "scripts/build_canonical_current_state.py",
    "scripts/validate_canonical_authority.py",
    "scripts/validate_canonical_update_pipeline.py",
    "scripts/build_public_current_state.py",
    "scripts/validate_public_current_state.py",
    "scripts/validate_public_current_state_compat.py",
}
assert not any(item[1] in retired_current_steps for item in build), (
    "current release build still executes a historical compatibility step"
)
assert not any(item[1] in retired_current_steps for item in check), (
    "current release check still executes a historical compatibility step"
)

# Historical lineage remains explicitly auditable and read-only.
assert [item[1:] for item in historical] == [
    ("scripts/build_canonical_current_state.py", "--check"),
    ("scripts/validate_canonical_authority.py",),
    ("scripts/validate_canonical_update_pipeline.py",),
]
assert all(
    "--check" in item or item[1].startswith("scripts/validate_") for item in historical
), "historical audit contains a write-capable builder"

assert all(
    "--check" in item or item[1].startswith("scripts/validate_") for item in check
), "check mode contains a write-capable builder"
assert build[-1][1] == "scripts/validate_public_current_state_v2.py"
assert check[-1][1] == "scripts/validate_public_current_state_v2.py"

source = SCRIPT.read_text(encoding="utf-8")
assert "subprocess.run" in source and "check=True" in source
assert "BUILD_COMMANDS" in source and "CHECK_COMMANDS" in source
assert "HISTORICAL_AUDIT_COMMANDS" in source and "--historical-audit" in source
assert "TemporaryDirectory" not in source
assert "current-v2 only" in source.lower()

# Production public-foundation migration must be parity-qualified independently.
subprocess.run(
    [sys.executable, "tests/public-read-model-foundation-parity.test.py"],
    cwd=ROOT,
    check=True,
)

print(
    "current release-state orchestration: PASS - default release is v2-only, "
    "historical canonical-v1 validation is explicit/read-only, and current foundation parity is enforced"
)
