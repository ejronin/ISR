#!/usr/bin/env python3
"""Remove the superseded persona-specific narrative gate from the signed runtime.

The tracked public-app source still contains the final-polish-era narrative block
while the reader rearchitecture is being decomposed. Production release assembly
must not ship or execute that block. This bounded migration transform removes the
entire generated narrative contract and clears the state hook before the entrypoint
is content-addressed and signed.

Current reader-facing state remains provided by OverviewPage from the canonical
public read model (`ledger.domain_assessments`, `analysis.endgame_public_view`,
`current.chronology`, and `gate3.gaps`). No evidence or canonical data is changed.
"""
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRYPOINT = Path("js/public-app.js")
BEGIN = "  // ROOK_NARRATIVE_CURRENT_BEGIN"
FUNCTION_AFTER_BLOCK = "  function now() {"
OLD_STATE = "      narrativeContract: FINAL_NARRATIVE_GATES,"
NEW_STATE = "      narrativeContract: null,"
RETIRED_MARKER = "  // ATLAS_PRIVILEGED_NARRATIVE_RETIRED"


def transform(source: str) -> str:
    """Return the deployable entrypoint with the old narrative path removed."""
    text = source.replace("\r\n", "\n").replace("\r", "\n")

    if BEGIN in text:
        start = text.index(BEGIN)
        end = text.index(FUNCTION_AFTER_BLOCK, start)
        text = text[:start] + RETIRED_MARKER + "\n\n" + text[end:]

    if OLD_STATE in text:
        text = text.replace(OLD_STATE, NEW_STATE, 1)

    if "ROOK_NARRATIVE_CURRENT" in text:
        raise ValueError("privileged ROOK narrative token remains in deployable entrypoint")
    if "FINAL_NARRATIVE_GATES" in text:
        raise ValueError("retired final narrative contract remains in deployable entrypoint")
    if OLD_STATE in text:
        raise ValueError("retired narrative state hook remains in deployable entrypoint")
    if NEW_STATE not in text:
        raise ValueError("neutral narrative state hook was not established")
    if RETIRED_MARKER not in text:
        raise ValueError("retired narrative marker is missing")
    return text


def apply(root: Path = ROOT) -> Path:
    root = Path(root).resolve()
    path = root / ENTRYPOINT
    original = path.read_text(encoding="utf-8")
    updated = transform(original)
    path.write_text(updated, encoding="utf-8", newline="\n")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    path = root / ENTRYPOINT
    source = path.read_text(encoding="utf-8")
    transformed = transform(source)
    if args.check:
        # Check transformation validity and idempotence without mutating source.
        if transform(transformed) != transformed:
            raise SystemExit("FAIL: privileged narrative retirement transform is not idempotent")
        print("privileged-narrative-runtime retirement: PASS")
        return 0
    path.write_text(transformed, encoding="utf-8", newline="\n")
    print(f"privileged-narrative-runtime retirement: updated {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
