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
FIXED_FILES = ("index.html", ".nojekyll", "assets/social-preview.png", MANIFEST_PATH, CURRENT_STATE_PATH)


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
        raise SiteAssemblyError(f"deployment path is not normalized: {value!r}")
    if expected_prefix and not normalized.startswith(expected_prefix):
        raise SiteAssemblyError(f"deployment path escapes {expected_prefix}: {normalized}")
    return normalized


def load_manifest(root: Path) -> dict:
    path = root / MANIFEST_PATH
    if not path.is_file():
        raise SiteAssemblyError(f"generated release manifest is missing: {MANIFEST_PATH}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("artifact_role") != "PUBLIC_APPLICATION_RELEASE_MANIFEST":
        raise SiteAssemblyError("generated release manifest role is invalid")
    return payload


def expected_files(root: Path, manifest: dict) -> list[str]:
    expected = set(FIXED_FILES)
    bootstrap = (manifest.get("neutral_bootstrap") or {}).get("asset") or {}
    assets = (manifest.get("application") or {}).get("assets") or []
    for asset in [bootstrap, *assets]:
        expected.add(normalized_relative_path(asset.get("path"), expected_prefix="assets/releases/"))
    current = manifest.get("current_state") or {}
    if normalized_relative_path(current.get("path")) != CURRENT_STATE_PATH:
        raise SiteAssemblyError("release manifest current-state path is invalid")
    snapshots = root / "snapshots"
    if snapshots.is_dir():
        for path in sorted(item for item in snapshots.rglob("*") if item.is_file()):
            expected.add(path.relative_to(root).as_posix())
    return sorted(expected)


def ensure_source_file(root: Path, relative: str) -> Path:
    source = root / relative
    if not source.is_file() or source.is_symlink():
        raise SiteAssemblyError(f"deployment source is missing or linked: {relative}")
    try:
        source.resolve().relative_to(root.resolve())
    except ValueError as error:
        raise SiteAssemblyError(f"deployment source escapes repository: {relative}") from error
    return source


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
        destination = output / PurePosixPath(relative)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        byte_count += source.stat().st_size
    return len(files), byte_count


def check(root: Path, output: Path) -> tuple[int, int]:
    root = root.resolve()
    output = output.resolve()
    expected = expected_files(root, load_manifest(root))
    actual = sorted(path.relative_to(output).as_posix() for path in output.rglob("*") if path.is_file())
    allowed_extra = {"build-info.json"}
    missing = sorted(set(expected) - set(actual))
    extras = sorted(set(actual) - set(expected) - allowed_extra)
    if missing or extras:
        raise SiteAssemblyError(f"deployment inventory mismatch; missing={missing}; unexpected={extras}")
    byte_count = 0
    for relative in expected:
        source = ensure_source_file(root, relative)
        deployed = output / PurePosixPath(relative)
        if deployed.read_bytes() != source.read_bytes():
            raise SiteAssemblyError(f"deployed bytes differ from source: {relative}")
        byte_count += deployed.stat().st_size
    return len(expected), byte_count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default="_site")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output
    try:
        count, byte_count = check(root, output) if args.check else assemble(root, output)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        raise SystemExit(f"FAIL: {error}") from error
    action = "verified" if args.check else "assembled"
    print(f"public-site assembly: PASS - {action} {count} files ({byte_count} bytes) at {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
