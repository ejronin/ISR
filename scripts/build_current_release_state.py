#!/usr/bin/env python3
"""Build or verify Atlas current canonical/public state through one release contract.

This orchestrator deliberately preserves the qualified v1 compatibility lineage
while the successor v2 builders are being converged. Workflows should call this
script instead of independently spelling out the v1 -> v2 choreography.

The legacy public projection is generated only inside an isolated temporary
directory. `data/public-current-state.json` is therefore a v2-only release path.
No accepted evidence is owned or rewritten by this orchestration layer.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Sequence

ROOT = Path(__file__).resolve().parents[1]
CANONICAL_V2 = "data/canonical-current-state-v2.json"
PUBLIC_CURRENT = "data/public-current-state.json"


def command(script: str, *args: str) -> tuple[str, ...]:
    return (sys.executable, script, *args)


def build_commands(compat_artifact: str) -> tuple[tuple[str, ...], ...]:
    """Return the qualified build sequence for one isolated v1 artifact path."""
    return (
        command("scripts/build_canonical_current_state.py"),
        command("scripts/build_canonical_current_state.py", "--check"),
        command("scripts/validate_canonical_authority.py"),
        command("scripts/validate_canonical_update_pipeline.py"),
        command("scripts/build_public_current_state.py", "--output", compat_artifact),
        command("scripts/build_public_current_state.py", "--check", "--output", compat_artifact),
        command("scripts/validate_public_current_state_compat.py", "--artifact", compat_artifact),
        command("scripts/build_canonical_current_state_v2_final.py", "--output", CANONICAL_V2),
        command("scripts/validate_gate3_final.py"),
        command("scripts/build_public_current_state_v2_hardened.py", "--output", PUBLIC_CURRENT),
        command("scripts/build_canonical_current_state_v2_final.py", "--check", "--output", CANONICAL_V2),
        command("scripts/build_public_current_state_v2_hardened.py", "--check", "--output", PUBLIC_CURRENT),
        command("scripts/validate_public_current_state_v2.py"),
    )


# Check mode starts from the final promoted repository state. The legacy public
# compatibility calculation is intentionally absent: it is fully generated and
# byte-validated inside build mode, while this read-only mode verifies the
# persisted canonical lineage and the only release-facing public artifact.
CHECK_COMMANDS: tuple[tuple[str, ...], ...] = (
    command("scripts/build_canonical_current_state.py", "--check"),
    command("scripts/validate_canonical_authority.py"),
    command("scripts/validate_canonical_update_pipeline.py"),
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
        help="Verify final promoted derived state without writing it",
    )
    args = parser.parse_args()
    root = Path(args.root).resolve()

    if args.check:
        run(CHECK_COMMANDS, root)
        print("current-release-state: PASS final promoted state verified without writes", flush=True)
        return 0

    # Keep the compatibility artifact below the repository root because the
    # legacy builder's status output expects to render repository-relative paths.
    # TemporaryDirectory still guarantees cleanup on success and exceptions.
    with tempfile.TemporaryDirectory(prefix=".atlas-public-v1-compat-", dir=root) as temporary:
        compat_artifact = str(Path(temporary) / "public-current-state-v1.json")
        run(build_commands(compat_artifact), root)

    print("current-release-state: PASS built and verified; legacy public projection remained isolated", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
