#!/usr/bin/env python3
"""Reject mutable-current fossils while preserving explicit historical fixtures.

The current Atlas evidence horizon and current-state populations must be derived
from canonical authority/generated state. Historical packet clocks and frozen
boundaries remain valid literals when they are not used as mutable-current
assertions.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SELF = Path(__file__).resolve()
TEXT_SUFFIXES = {".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".yml", ".yaml", ".sh"}
CODE_PREFIXES = ("tests/", "scripts/", "js/", ".github/", "templates/")
HISTORICAL_EXEMPTION = "MUTABLE_CURRENT_HISTORICAL_FIXTURE"
MUTABLE_CUTOFF_FIELDS = (
    "current_osint_cutoff",
    "current_evidence_cutoff",
    "collection_cutoff",
    "current_review_cutoff",
)
ISO_LITERAL = re.compile(r"['\"]20\d{2}-\d{2}-\d{2}T[^'\"]+['\"]")
HUMAN_DATE_LITERAL = re.compile(r"['\"](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s+\d{1,2},\s+20\d{2}[^'\"]*['\"]")
JS_LITERAL_ASSERT = re.compile(r"assert\.(?:equal|strictEqual)\([^\n]*,\s*(?:['\"][^'\"]+['\"]|\d+)\s*(?:,|\))")
PY_LITERAL_COMPARE = re.compile(r"(?:assert|if)\s+[^\n]*(?:==|!=)\s*(?:['\"][^'\"]+['\"]|\d+)")
EXPECTED_CURRENT_LITERAL = re.compile(r"\bEXPECTED_[A-Z0-9_]*CURRENT[A-Z0-9_]*(?:CUTOFF|COUNT|TOTAL|DAYS)\b\s*=\s*(?:['\"][^'\"]+['\"]|\d+)")
COVERAGE_LITERAL = re.compile(r"assert\.(?:equal|strictEqual)\(\s*coverage\.length\s*,\s*\d+")
CHRONOLOGY_LITERAL = re.compile(r"assert\.(?:equal|strictEqual)\(\s*(?:model\.)?chronology\.length\s*,\s*\d+")
MODEL_COUNT_LITERAL = re.compile(
    r"assert\.(?:equal|strictEqual)\(\s*model\.counts\."
    r"(?:chronology_records|material_loss_records|accepted_update_packets|gate3_daily_coverage_days)\s*,\s*\d+"
)
LOSS_LITERAL = re.compile(r"assert\.(?:equal|strictEqual)\(\s*losses\.length\s*,\s*\d+")


def tracked_paths() -> list[Path]:
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    paths: list[Path] = []
    for item in raw.decode("utf-8").split("\0"):
        if not item:
            continue
        if not item.startswith(CODE_PREFIXES):
            continue
        path = ROOT / item
        if path.suffix.lower() not in TEXT_SUFFIXES or path.resolve() == SELF:
            continue
        paths.append(path)
    return paths


def exempt(lines: list[str], index: int) -> bool:
    here = lines[index]
    previous = lines[index - 1] if index else ""
    return HISTORICAL_EXEMPTION in here or HISTORICAL_EXEMPTION in previous


def mutable_cutoff_literal(line: str) -> bool:
    if not any(field in line for field in MUTABLE_CUTOFF_FIELDS):
        return False
    if not (ISO_LITERAL.search(line) or HUMAN_DATE_LITERAL.search(line)):
        return False
    return bool(JS_LITERAL_ASSERT.search(line) or PY_LITERAL_COMPARE.search(line) or "fail(" in line or "raise " in line)


def scan(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8", errors="strict")
    lines = text.splitlines()
    public_current_consumer = (
        "public-current-state.json" in text
        or "build_public_current_state" in text
        or "current.material_losses" in text
    )
    violations: list[str] = []
    for index, line in enumerate(lines):
        if exempt(lines, index):
            continue
        reasons: list[str] = []
        if mutable_cutoff_literal(line):
            reasons.append("mutable current cutoff compared to a literal")
        if EXPECTED_CURRENT_LITERAL.search(line):
            reasons.append("expected mutable current value stored as a literal")
        if public_current_consumer and COVERAGE_LITERAL.search(line):
            reasons.append("current daily-coverage population pinned to a literal")
        if public_current_consumer and CHRONOLOGY_LITERAL.search(line):
            reasons.append("current chronology population pinned to a literal")
        if public_current_consumer and MODEL_COUNT_LITERAL.search(line):
            reasons.append("generated current count pinned to a literal")
        if "current.material_losses" in text and LOSS_LITERAL.search(line):
            reasons.append("current material-loss population pinned to a literal")
        if reasons:
            rel = path.relative_to(ROOT)
            violations.append(f"{rel}:{index + 1}: {', '.join(reasons)} :: {line.strip()}")
    return violations


def main() -> int:
    violations: list[str] = []
    paths = tracked_paths()
    for path in paths:
        violations.extend(scan(path))
    if violations:
        print("mutable-current invariant guard: FAIL")
        print("Mutable current state must derive from canonical authority/generated state.")
        print(f"Historical fixtures may be explicitly exempted with {HISTORICAL_EXEMPTION} only when truly historical.")
        for violation in violations:
            print(f"  - {violation}")
        return 1
    print(f"mutable-current invariant guard: PASS - scanned {len(paths)} tracked code/test/workflow files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
