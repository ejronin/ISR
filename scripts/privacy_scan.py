#!/usr/bin/env python3
"""Scan tracked text and Git metadata without printing discovered personal values."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = {
    "local_user_path": re.compile(rb"(?:[A-Za-z]:\\Users\\[^\\\s]+|/Users/[^/\s]+|/home/[^/\s]+)"),
    "email_address": re.compile(rb"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I),
    "private_key": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "github_token": re.compile(rb"(?:ghp_|github_pat_)[A-Za-z0-9_]{16,}"),
    "aws_access_key": re.compile(rb"AKIA[0-9A-Z]{16}"),
    "slack_token": re.compile(rb"xox[baprs]-[A-Za-z0-9-]{10,}"),
}


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=ROOT)


def main() -> int:
    files = [ROOT / raw.decode("utf-8") for raw in git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split(b"\0") if raw]
    findings: dict[str, set[str]] = {name: set() for name in PATTERNS}
    scanned = 0
    for path in files:
        if not path.is_file():
            continue
        data = path.read_bytes()
        if b"\0" in data[:8192]:
            continue
        relative = path.relative_to(ROOT).as_posix()
        # This scanner contains the literal detection signatures and would self-match.
        if relative == "scripts/privacy_scan.py":
            continue
        scanned += 1
        for name, pattern in PATTERNS.items():
            if pattern.search(data):
                findings[name].add(relative)
    failures = {name: paths for name, paths in findings.items() if paths}
    identities = set(git("log", "--all", "--format=%an|%ae").decode("utf-8", "replace").splitlines())
    non_noreply = {row for row in identities if "noreply.github.com" not in row and "actions@github.com" not in row}
    print(f"privacy-scan: tracked_text_files={scanned}")
    print(f"privacy-scan: history_unique_identities={len(identities)}")
    print(f"privacy-scan: history_non_noreply_identities={len(non_noreply)}")
    if failures:
        for name, paths in failures.items():
            print(f"FAIL: {name} found in {len(paths)} tracked file(s)")
        return 1
    print("privacy-scan: PASS - no local user paths, email addresses, private keys, or recognized credential formats in tracked text")
    if non_noreply:
        print("privacy-scan: NOTICE - historical Git metadata contains non-noreply identity/email values; no history rewrite performed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
