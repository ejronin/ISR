#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_IDENTITY_FILES = ("data/public-release.json", "data/public-current-state.json")
INTAKE_PREFIXES = (
    "data/evidence-integration/rook-evidence-locker-sweep-",
    "data/evidence-integration/rook-source-registry-delta-",
    "data/evidence-integration/source-discovery-",
)


def run(*args: str, cwd: Path = ROOT, capture: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(args),
        cwd=cwd,
        check=True,
        text=True,
        capture_output=capture,
    )


def diff_rows(base_ref: str, head_ref: str = "HEAD") -> list[tuple[str, str]]:
    proc = run("git", "diff", "--name-status", f"{base_ref}...{head_ref}")
    rows: list[tuple[str, str]] = []
    for line in proc.stdout.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        rows.append((parts[0], parts[-1]))
    return rows


def is_formally_named_intake_path(path: str) -> bool:
    return path.endswith(".json") and any(path.startswith(prefix) for prefix in INTAKE_PREFIXES)


def classify_paths(rows: list[tuple[str, str]]) -> dict[str, Any]:
    if not rows:
        return {
            "candidate_intake_only": True,
            "reason": "NO_TREE_CHANGE",
            "changed_files": [],
        }

    changed = [{"status": status, "path": path} for status, path in rows]
    for status, path in rows:
        if status != "A":
            return {
                "candidate_intake_only": False,
                "reason": f"NON_APPEND_CHANGE:{status}:{path}",
                "changed_files": changed,
            }
        if not is_formally_named_intake_path(path):
            return {
                "candidate_intake_only": False,
                "reason": f"RELEASE_AFFECTING_OR_UNKNOWN_PATH:{path}",
                "changed_files": changed,
            }

    return {
        "candidate_intake_only": True,
        "reason": "ONLY_FORMALLY_NAMED_UPSTREAM_INTAKE_ADDITIONS",
        "changed_files": changed,
    }


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_public_identity_at(ref: str) -> dict[str, str]:
    with tempfile.TemporaryDirectory(prefix="atlas-release-identity-") as temp_name:
        worktree = Path(temp_name) / "tree"
        run("git", "worktree", "add", "--detach", str(worktree), ref)
        try:
            run(sys.executable, "scripts/build_current_release_state.py", cwd=worktree, capture=False)
            run(sys.executable, "scripts/build_public_release.py", cwd=worktree, capture=False)
            values = {}
            for rel in PUBLIC_IDENTITY_FILES:
                path = worktree / rel
                if not path.exists():
                    raise RuntimeError(f"{ref}: deterministic build did not produce {rel}")
                values[rel] = sha256_file(path)
            joined = "\n".join(f"{key}:{values[key]}" for key in sorted(values))
            values["release_identity_sha256"] = hashlib.sha256(joined.encode("utf-8")).hexdigest()
            return values
        finally:
            subprocess.run(
                ["git", "worktree", "remove", "--force", str(worktree)],
                cwd=ROOT,
                check=False,
                text=True,
                capture_output=True,
            )


def validate_intake(base_ref: str) -> None:
    run(
        sys.executable,
        "scripts/rook_intake_status.py",
        "validate",
        "--compare-ref",
        base_ref,
        cwd=ROOT,
        capture=False,
    )


def classify_release_change(base_ref: str, force_release: bool = False) -> dict[str, Any]:
    if force_release:
        return {
            "release_required": True,
            "intake_only": False,
            "release_identity_changed": True,
            "reason": "MANUAL_FULL_RELEASE_REQUEST",
            "changed_files": [],
        }

    rows = diff_rows(base_ref)
    path_result = classify_paths(rows)
    if not path_result["candidate_intake_only"]:
        return {
            "release_required": True,
            "intake_only": False,
            "release_identity_changed": True,
            **path_result,
        }

    validate_intake(base_ref)

    base_identity = build_public_identity_at(base_ref)
    head_identity = build_public_identity_at("HEAD")
    identity_changed = (
        base_identity["release_identity_sha256"]
        != head_identity["release_identity_sha256"]
    )

    if identity_changed:
        return {
            "release_required": True,
            "intake_only": False,
            "release_identity_changed": True,
            "reason": "UPSTREAM_INTAKE_CHANGED_DETERMINISTIC_PUBLIC_RELEASE_IDENTITY",
            "changed_files": path_result["changed_files"],
            "base_identity": base_identity,
            "head_identity": head_identity,
        }

    return {
        "release_required": False,
        "intake_only": True,
        "release_identity_changed": False,
        "reason": "UPSTREAM_INTAKE_ONLY_PUBLIC_RELEASE_IDENTITY_UNCHANGED",
        "changed_files": path_result["changed_files"],
        "base_identity": base_identity,
        "head_identity": head_identity,
    }


def write_github_output(path: str, result: dict[str, Any]) -> None:
    with open(path, "a", encoding="utf-8") as handle:
        for key in ("release_required", "intake_only", "release_identity_changed", "reason"):
            value = result[key]
            if isinstance(value, bool):
                value = "true" if value else "false"
            handle.write(f"{key}={value}\n")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Classify a main-branch change and suppress identical Pages redeployments only after deterministic identity proof."
    )
    parser.add_argument("--base-ref", required=True)
    parser.add_argument("--force-release", action="store_true")
    parser.add_argument("--json-out", default="")
    parser.add_argument("--github-output", default=os.environ.get("GITHUB_OUTPUT", ""))
    args = parser.parse_args()

    result = classify_release_change(args.base_ref, force_release=args.force_release)
    print(json.dumps(result, indent=2, sort_keys=True))
    if args.json_out:
        Path(args.json_out).write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if args.github_output:
        write_github_output(args.github_output, result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
