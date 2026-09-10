#!/usr/bin/env python3
"""Build or verify Atlas current canonical/public state through one release contract.

This orchestrator deliberately preserves the qualified v1 compatibility lineage
while the successor v2 builders are being converged. Workflows should call this
script instead of independently spelling out the v1 -> v2 choreography.

It does not own evidence. Each invoked builder/validator retains its existing
authority and byte-level semantics; this file only fixes ordering and gives
validation and deployment one deterministic entrypoint.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import Sequence

ROOT = Path(__file__).resolve().parents[1]
CANONICAL_V2 = "data/canonical-current-state-v2.json"
PUBLIC_CURRENT = "data/public-current-state.json"


def command(script: str, *args: str) -> tuple[str, ...]:
    return (sys.executable, script, *args)


BUILD_COMMANDS: tuple[tuple[str, ...], ...] = (
    command("scripts/build_canonical_current_state.py"),
    command("scripts/build_canonical_current_state.py", "--check"),
    command("scripts/validate_canonical_authority.py"),
    command("scripts/validate_canonical_update_pipeline.py"),
    command("scripts/build_public_current_state.py"),
    command("scripts/build_public_current_state.py", "--check"),
    command("scripts/validate_public_current_state.py"),
    command("scripts/build_canonical_current_state_v2_final.py", "--output", CANONICAL_V2),
    command("scripts/validate_gate3_final.py"),
    command("scripts/build_public_current_state_v2_hardened.py", "--output", PUBLIC_CURRENT),
    command("scripts/build_canonical_current_state_v2_final.py", "--check", "--output", CANONICAL_V2),
    command("scripts/build_public_current_state_v2_hardened.py", "--check", "--output", PUBLIC_CURRENT),
    command("scripts/validate_public_current_state_v2.py"),
)

CHECK_COMMANDS: tuple[tuple[str, ...], ...] = (
    command("scripts/build_canonical_current_state.py", "--check"),
    command("scripts/validate_canonical_authority.py"),
    command("scripts/validate_canonical_update_pipeline.py"),
    command("scripts/build_public_current_state.py", "--check"),
    command("scripts/validate_public_current_state.py"),
    command("scripts/build_canonical_current_state_v2_final.py", "--check", "--output", CANONICAL_V2),
    command("scripts/validate_gate3_final.py"),
    command("scripts/build_public_current_state_v2_hardened.py", "--check", "--output", PUBLIC_CURRENT),
    command("scripts/validate_public_current_state_v2.py"),
)


def display(argv: Sequence[str]) -> str:
    return " ".join(str(part) for part in argv)


def run(commands: Sequence[Sequence[str]], root: Path = ROOT) -> None:
    root = Path(root).resolve()
    for index, argv in enumerate(commands, 1):
        rendered = display(argv)
        print(f"release-state [{index}/{len(commands)}] {rendered}", flush=True)
        subprocess.run(list(argv), cwd=root, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT), help="Repository root")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify tracked derived state without writing it",
    )
    args = parser.parse_args()
    commands = CHECK_COMMANDS if args.check else BUILD_COMMANDS
    run(commands, Path(args.root))
    print(
        "current-release-state: PASS "
        + ("verified without writes" if args.check else "built and verified"),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
