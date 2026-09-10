#!/usr/bin/env python3
"""Static regression for the single current-state release orchestration contract."""
from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "build_current_release_state.py"

spec = importlib.util.spec_from_file_location("build_current_release_state", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


def normalized(commands):
    return [tuple(Path(part).as_posix() if index == 1 else part for index, part in enumerate(command)) for command in commands]


compat = "/tmp/atlas-public-v1-compat-test.json"
build = normalized(module.build_commands(compat))
check = normalized(module.CHECK_COMMANDS)

assert build[0][1:] == ("scripts/build_canonical_current_state.py",)
assert ("scripts/build_public_current_state.py", "--output", compat) in [item[1:] for item in build]
assert ("scripts/build_public_current_state.py", "--check", "--output", compat) in [item[1:] for item in build]
assert ("scripts/validate_public_current_state_compat.py", "--artifact", compat) in [item[1:] for item in build]
assert ("scripts/build_canonical_current_state_v2_final.py", "--output", "data/canonical-current-state-v2.json") in [item[1:] for item in build]
assert ("scripts/build_public_current_state_v2_hardened.py", "--output", "data/public-current-state.json") in [item[1:] for item in build]

for validator in (
    "scripts/validate_canonical_authority.py",
    "scripts/validate_canonical_update_pipeline.py",
    "scripts/validate_gate3_final.py",
    "scripts/validate_public_current_state_v2.py",
):
    assert any(item[1] == validator for item in build), f"build contract omitted {validator}"
    assert any(item[1] == validator for item in check), f"check contract omitted {validator}"

# Legacy public state is still fully qualified, but its builder is forbidden from
# targeting the one release-facing public-current-state path.
v1_builds = [item for item in build if item[1] == "scripts/build_public_current_state.py"]
assert len(v1_builds) == 2
assert all(compat in item for item in v1_builds)
assert all("data/public-current-state.json" not in item for item in v1_builds)
assert not any(item[1] in {"scripts/build_public_current_state.py", "scripts/validate_public_current_state.py", "scripts/validate_public_current_state_compat.py"} for item in check), "final-state check must not regenerate legacy public compatibility state"

assert all("--check" in item or item[1].startswith("scripts/validate_") for item in check), "check mode contains a write-capable builder"
assert build.index(v1_builds[0]) < build.index(next(item for item in build if item[1] == "scripts/build_canonical_current_state_v2_final.py" and "--check" not in item)), "legacy public compatibility validation must precede the v2 overlay"
assert build[-1][1] == "scripts/validate_public_current_state_v2.py"
assert check[-1][1] == "scripts/validate_public_current_state_v2.py"

source = SCRIPT.read_text(encoding="utf-8")
assert "subprocess.run" in source and "check=True" in source
assert "build_commands" in source and "CHECK_COMMANDS" in source
assert "TemporaryDirectory" in source
assert "data/public-current-state.json` is therefore a v2-only release path" in source

compat_validator = (ROOT / "scripts" / "validate_public_current_state_compat.py").read_text(encoding="utf-8")
assert "legacy.validate_payload" in compat_validator
assert "legacy.validate_references_and_views" in compat_validator
assert "legacy.validate_facility_and_imagery_parity" in compat_validator
assert "legacy compatibility validation may not target data/public-current-state.json" in compat_validator

print("current release-state orchestration: PASS - legacy public compatibility is isolated and the current public path is v2-only")
