#!/usr/bin/env python3
"""Build or verify Atlas current canonical/public state through one release contract.

The default release path is current-v2 only. Historical canonical-v1 lineage
remains available as an explicit read-only audit and is no longer generated or
validated on every current release. Current production still preserves the
sealed migration boundary and append-only accepted packets through the v2
compiler and Gate 3 validators.

No accepted evidence is owned or rewritten by this orchestration layer.
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
    command("scripts/build_canonical_current_state_v2_final.py", "--output", CANONICAL_V2),
    command("scripts/validate_gate3_final.py"),
    command("scripts/build_public_current_state_v2_hardened.py", "--output", PUBLIC_CURRENT),
    command("scripts/build_canonical_current_state_v2_final.py", "--check", "--output", CANONICAL_V2),
    command("scripts/build_public_current_state_v2_hardened.py", "--check", "--output", PUBLIC_CURRENT),
    command("scripts/validate_public_current_state_v2.py"),
)

CHECK_COMMANDS: tuple[tuple[str, ...], ...] = (
    command("scripts/build_canonical_current_state_v2_final.py", "--check", "--output", CANONICAL_V2),
    command("scripts/validate_gate3_final.py"),
    command("scripts/build_public_current_state_v2_hardened.py", "--check", "--output", PUBLIC_CURRENT),
    command("scripts/validate_public_current_state_v2.py"),
)

# Historical audit is deliberately read-only. It verifies the preserved v1
# artifact and migration/update rules when explicitly requested, but it is not
# part of the current release identity or normal build choreography.
HISTORICAL_AUDIT_COMMANDS: tuple[tuple[str, ...], ...] = (
    command("scripts/build_canonical_current_state.py", "--check"),
    command("scripts/validate_canonical_authority.py"),
    command("scripts/validate_canonical_update_pipeline.py"),
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
        help="Verify final promoted current-v2 state without writing it",
    )
    parser.add_argument(
        "--historical-audit",
        action="store_true",
        help="Run preserved canonical-v1 lineage checks before the current-v2 contract",
    )
    args = parser.parse_args()
    root = Path(args.root)
    if args.historical_audit:
        run(HISTORICAL_AUDIT_COMMANDS, root)
    commands = CHECK_COMMANDS if args.check else BUILD_COMMANDS
    run(commands, root)
    mode = "final promoted current-v2 state verified without writes" if args.check else "current v2 state built and verified"
    if args.historical_audit:
        mode += "; historical lineage audit passed"
    print(f"current-release-state: PASS {mode}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
