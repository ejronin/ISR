#!/usr/bin/env python3
"""Assemble the closed, manifest-authorized GitHub Pages artifact."""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = "data/public-release.json"
CURRENT_STATE_PATH = "data/public-current-state.json"
BUILD_INFO_PATH = "build-info.json"
FIXED_FILES = ("index.html", ".nojekyll", "assets/social-preview.png", MANIFEST_PATH)
FORBIDDEN_DEPLOYMENT_PREFIXES = (
    "snapshots/",
    "legacy/",
    "js/",
    "css/",
    "vendor/",
    "schemas/",
    "data/canonical-",
    "data/canonical-updates/",
    "data/current-update-",
)


class SiteAssemblyError(ValueError):
    """The requested Pages artifact would cross the publication boundary."""


def normalized_relative_path(value: object, *, expected_prefix: str | None = None) -> str:
    if not isinstance(value, str) or not value or "\\" in value:
        raise SiteAssemblyError(f"invalid deployment path: {value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise SiteAssemblyError(f"deployment path is not normalized and relative: {value!r}")
    normalized = path.as_posix()
    if normalized != value:
        raise SiteAssemblyError(f"deployment path normalization alias is forbidden: {value!r} -> {normalized!r}")
    if expected_prefix and not normalized.startswith(expected_prefix):
        raise SiteAssemblyError(f"deployment path escapes {expected_prefix}: {normalized}")
    return normalized


def reject_forbidden_deployment_path(relative: str) -> None:
    if any(relative.startswith(prefix) for prefix in FORBIDDEN_DEPLOYMENT_PREFIXES):
        raise SiteAssemblyError(f"archive, mutable source, or raw-data path is not deployable: {relative}")


def validate_output_candidates(candidates: list[tuple[str, object, str | None]]) -> list[str]:
    """Validate identities before any set/deduplication can hide a collision."""
    exact: dict[str, str] = {}
    casefolded: dict[str, tuple[str, str]] = {}
    paths: list[str] = []
    for owner, value, expected_prefix in candidates:
        relative = normalized_relative_path(value, expected_prefix=expected_prefix)
        reject_forbidden_deployment_path(relative)
        if relative in exact:
            raise SiteAssemblyError(
                f"duplicate deployment output path {relative!r}: {exact[relative]!r} and {owner!r}"
            )
        identity = relative.casefold()
        if identity in casefolded:
            prior_path, prior_owner = casefolded[identity]
            raise SiteAssemblyError(
                f"case-insensitive deployment collision {prior_path!r} / {relative!r}: "
                f"{prior_owner!r} and {owner!r}"
            )
        exact[relative] = owner
        casefolded[identity] = (relative, owner)
        paths.append(relative)
    return sorted(paths)


def load_manifest(root: Path) -> dict:
    path = root / MANIFEST_PATH
    if not path.is_file():
        raise SiteAssemblyError(f"generated release manifest is missing: {MANIFEST_PATH}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("artifact_role") != "PUBLIC_APPLICATION_RELEASE_MANIFEST":
        raise SiteAssemblyError("generated release manifest role is invalid")
    return payload


def expected_files(root: Path, manifest: dict, *, include_build_info: bool = False) -> list[str]:
    del root  # Policy is explicit; repository directory contents never expand deployment.
    candidates: list[tuple[str, object, str | None]] = [
        (f"fixed current-production file {relative}", relative, None) for relative in FIXED_FILES
    ]
    current = manifest.get("current_state") or {}
    current_path = current.get("path")
    if normalized_relative_path(current_path) != CURRENT_STATE_PATH:
        raise SiteAssemblyError("release manifest current-state path is invalid")
    candidates.append(("manifest current-state model", current_path, None))

    bootstrap = (manifest.get("neutral_bootstrap") or {}).get("asset") or {}
    candidates.append(("manifest neutral bootstrap", bootstrap.get("path"), "assets/releases/"))
    assets = (manifest.get("application") or {}).get("assets") or []
    if not isinstance(assets, list):
        raise SiteAssemblyError("release manifest application assets are invalid")
    for index, asset in enumerate(assets):
        if not isinstance(asset, dict):
            raise SiteAssemblyError(f"release manifest application asset {index} is invalid")
        owner = f"manifest application asset {index} ({asset.get('role') or 'unknown role'})"
        candidates.append((owner, asset.get("path"), "assets/releases/"))
    if include_build_info:
        candidates.append(("Pages deployment identity", BUILD_INFO_PATH, None))
    return validate_output_candidates(candidates)


def ensure_source_file(root: Path, relative: str) -> Path:
    relative = normalized_relative_path(relative)
    source = root / PurePosixPath(relative)
    if not source.is_file() or source.is_symlink():
        raise SiteAssemblyError(f"deployment source is missing or linked: {relative}")
    try:
        source.resolve().relative_to(root.resolve())
    except ValueError as error:
        raise SiteAssemblyError(f"deployment source escapes repository: {relative}") from error
    return source


def destination_path(output: Path, relative: str) -> Path:
    relative = normalized_relative_path(relative)
    destination = output.joinpath(*PurePosixPath(relative).parts)
    try:
        destination.parent.resolve().relative_to(output.resolve())
    except ValueError as error:
        raise SiteAssemblyError(f"deployment destination escapes assembly directory: {relative}") from error
    if destination.is_symlink():
        raise SiteAssemblyError(f"deployment destination is a filesystem link: {relative}")
    return destination


def deployed_inventory(output: Path) -> tuple[list[str], list[str]]:
    if not output.is_dir():
        raise SiteAssemblyError(f"deployment output directory is missing: {output}")
    files: list[str] = []
    directories: list[str] = []
    casefolded: dict[str, str] = {}
    for path in sorted(output.rglob("*")):
        relative = path.relative_to(output).as_posix()
        if path.is_symlink():
            raise SiteAssemblyError(f"deployment artifact contains a filesystem link: {relative}")
        normalized = normalized_relative_path(relative)
        reject_forbidden_deployment_path(normalized)
        identity = normalized.casefold()
        if identity in casefolded:
            raise SiteAssemblyError(
                f"case-insensitive deployed-path collision: {casefolded[identity]!r} / {normalized!r}"
            )
        casefolded[identity] = normalized
        if path.is_file():
            files.append(normalized)
        elif path.is_dir():
            directories.append(normalized)
        else:
            raise SiteAssemblyError(f"deployment artifact contains a non-file entry: {relative}")
    return files, directories


def allowed_directories(files: list[str]) -> set[str]:
    directories: set[str] = set()
    for relative in files:
        parent = PurePosixPath(relative).parent
        while parent != PurePosixPath("."):
            directories.add(parent.as_posix())
            parent = parent.parent
    return directories


def assemble(root: Path, output: Path) -> tuple[int, int]:
    root = root.resolve()
    output = output.resolve()
    if output == root:
        raise SiteAssemblyError("deployment output cannot be the repository root")
    if output.exists() and any(output.iterdir()):
        raise SiteAssemblyError(f"deployment output must be absent or empty: {output}")
    output.mkdir(parents=True, exist_ok=True)
    files = expected_files(root, load_manifest(root))
    byte_count = 0
    for relative in files:
        source = ensure_source_file(root, relative)
        destination = destination_path(output, relative)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        byte_count += source.stat().st_size
    return len(files), byte_count


def check(root: Path, output: Path, *, require_build_info: bool = False) -> tuple[int, int]:
    root = root.resolve()
    output = output.resolve()
    expected = expected_files(root, load_manifest(root), include_build_info=require_build_info)
    actual, actual_directories = deployed_inventory(output)
    missing = sorted(set(expected) - set(actual))
    extras = sorted(set(actual) - set(expected))
    unexpected_directories = sorted(set(actual_directories) - allowed_directories(expected))
    if missing or extras or unexpected_directories:
        raise SiteAssemblyError(
            "deployment inventory mismatch; "
            f"missing={missing}; unexpected={extras}; unexpected_directories={unexpected_directories}"
        )
    byte_count = 0
    for relative in expected:
        deployed = destination_path(output, relative)
        if relative == BUILD_INFO_PATH:
            if not deployed.is_file():
                raise SiteAssemblyError(f"deployment identity is missing: {relative}")
        else:
            source = ensure_source_file(root, relative)
            if deployed.read_bytes() != source.read_bytes():
                raise SiteAssemblyError(f"deployed bytes differ from source: {relative}")
        byte_count += deployed.stat().st_size
    return len(expected), byte_count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default="_site")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--require-build-info", action="store_true")
    args = parser.parse_args()
    if args.require_build_info and not args.check:
        parser.error("--require-build-info requires --check")
    root = Path(args.root).resolve()
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    try:
        count, byte_count = (
            check(root, output, require_build_info=args.require_build_info)
            if args.check
            else assemble(root, output)
        )
    except (OSError, ValueError, json.JSONDecodeError) as error:
        raise SystemExit(f"FAIL: {error}") from error
    action = "verified" if args.check else "assembled"
    print(f"public-site assembly: PASS - {action} {count} files ({byte_count} bytes) at {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
