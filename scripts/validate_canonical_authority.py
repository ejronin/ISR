#!/usr/bin/env python3
"""Validate immutable migration authority and append-only accepted-ledger lineage."""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

import canonical_authority as authority


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = "data/canonical-ledger/manifest.json"
IMMUTABLE_POST_MIGRATION_PATHS = (
    authority.MIGRATION_BOUNDARY_PATH,
    authority.MIGRATION_ACTOR_REGISTRY_PATH,
    "scripts/canonical_authority.py",
)


def fail(message: str) -> None:
    raise SystemExit(f"canonical-authority: FAIL - {message}")


def git_show(root: Path, reference: str, path: str) -> bytes | None:
    result = subprocess.run(
        ["git", "show", f"{reference}:{path}"],
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    return result.stdout if result.returncode == 0 else None


def read_json(path: Path) -> dict:
    return json.loads(authority.canonical_input_bytes(path.read_bytes()).decode("utf-8"))


def validate_phase3_tree(root: Path, boundary: dict) -> int:
    checked = 0
    for item in boundary.get("protected_files") or []:
        path = item["path"]
        if path == authority.MIGRATION_ACTOR_REGISTRY_PATH:
            continue
        accepted = git_show(root, authority.ACCEPTED_PHASE3_HEAD, path)
        if accepted is None:
            fail(f"boundary path {path} is absent from accepted Phase 3 commit {authority.ACCEPTED_PHASE3_HEAD}")
        accepted_digest = authority.sha256_bytes(authority.canonical_input_bytes(accepted))
        current_digest = authority.sha256_bytes(authority.canonical_input_bytes((root / path).read_bytes()))
        if accepted_digest != item.get("sha256") or current_digest != accepted_digest:
            fail(f"sealed Phase 3 input differs from accepted commit: {path}")
        checked += 1
    return checked


def validate_genesis_artifacts(root: Path) -> None:
    for path in (authority.MIGRATION_BOUNDARY_PATH, authority.MIGRATION_ACTOR_REGISTRY_PATH):
        genesis = git_show(root, authority.PHASE35_AUTHORITY_GENESIS_COMMIT, path)
        if genesis is None:
            fail(f"authority genesis commit lacks {path}")
        current = authority.canonical_input_bytes((root / path).read_bytes())
        if current != authority.canonical_input_bytes(genesis):
            fail(f"immutable migration authority differs from Phase 3.5 genesis: {path}")


def compare_prior_ref(root: Path, reference: str, current_manifest: dict) -> int:
    prior_manifest_bytes = git_show(root, reference, MANIFEST_PATH)
    if prior_manifest_bytes is None:
        if current_manifest.get("accepted_updates"):
            fail("cannot introduce accepted packets before an append-only prior manifest exists")
        return 0
    prior_manifest = json.loads(authority.canonical_input_bytes(prior_manifest_bytes).decode("utf-8"))
    try:
        authority.require_exact_prefix(prior_manifest, current_manifest)
    except ValueError as exc:
        fail(str(exc))
    for path in IMMUTABLE_POST_MIGRATION_PATHS:
        prior = git_show(root, reference, path)
        if prior is None:
            continue
        current = authority.canonical_input_bytes((root / path).read_bytes())
        if current != authority.canonical_input_bytes(prior):
            fail(f"normal evidence update modified immutable authority path: {path}")
    return len(prior_manifest.get("accepted_updates") or [])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT), help="Repository root")
    parser.add_argument("--compare-ref", help="Prior accepted Git ref whose accepted_updates must remain an exact prefix")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    manifest = read_json(root / MANIFEST_PATH)
    boundary = read_json(root / authority.MIGRATION_BOUNDARY_PATH)
    try:
        authority.verify_static_authority(root, manifest)
    except ValueError as exc:
        fail(str(exc))
    if boundary.get("accepted_phase3_head") != authority.ACCEPTED_PHASE3_HEAD:
        fail("migration boundary accepted Phase 3 HEAD mismatch")
    validate_genesis_artifacts(root)
    phase3_files = validate_phase3_tree(root, boundary)
    prior_count = compare_prior_ref(root, args.compare_ref, manifest) if args.compare_ref else 0
    print(
        "canonical-authority: PASS - "
        f"boundary/actor authority pinned to {authority.PHASE35_AUTHORITY_GENESIS_COMMIT}; "
        f"{phase3_files} inherited Phase 3 files match {authority.ACCEPTED_PHASE3_HEAD}; "
        f"{prior_count} prior accepted entries preserved; {len(manifest.get('accepted_updates') or [])} current entries"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
