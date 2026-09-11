#!/usr/bin/env python3
"""Build the signed public release with reader assets represented explicitly.

The reader-first JavaScript and CSS are published as first-class content-addressed
assets. They are never concatenated into the base page registry or public shell
stylesheet. The only remaining release-workspace source transform is the bounded
entrypoint preparation in `retire_privileged_narrative_runtime.py`; that seam is
tracked separately for removal after this asset promotion is qualified.
"""
from __future__ import annotations

from pathlib import Path

import build_public_release_core as core
import retire_privileged_narrative_runtime as entrypoint_preparation
from build_public_release_core import *  # re-export release helpers for existing tests/importers

ROOT = Path(__file__).resolve().parents[1]
GENERATOR_VERSION = "2.1-reader-assets-neutral-narrative"
READER_RUNTIME_SPEC = ("reader_runtime", "public-reader-layer", "src/public-reader-layer.js", "js")
READER_STYLESHEET_SPEC = ("reader_stylesheet", "public-reader-layer", "src/public-reader-layer.css", "css")

_core_build_manifest = core.build_manifest


def _asset_set_sha256(assets: list[dict]) -> str:
    material = "".join(
        f"{item['role']}\0{item['path']}\0{item['sha256']}\n"
        for item in sorted(assets, key=lambda row: (row["role"], row["source_path"], row["path"]))
    ).encode("utf-8")
    return core.sha256(material)


def _rebind_release_identity(manifest: dict) -> dict:
    application = manifest["application"]
    asset_set_sha256 = _asset_set_sha256(application["assets"])
    application["asset_set_sha256"] = asset_set_sha256
    current = manifest["current_state"]
    bootstrap = manifest["neutral_bootstrap"]["asset"]
    material = (
        f"{core.BOOTSTRAP_PROTOCOL}\0{bootstrap['sha256']}\0{application['version']}\0"
        f"{asset_set_sha256}\0{current['sha256']}\0{current.get('release_identity', '')}\n"
    ).encode("utf-8")
    release_set_sha256 = core.sha256(material)
    manifest["release_set_sha256"] = release_set_sha256
    manifest["release_identity"] = f"public-release-v1-{release_set_sha256[:16]}"
    return manifest


def _promote_reader_assets(root: Path, manifest: dict) -> dict:
    application = manifest["application"]
    existing = application["assets"]
    if any(asset.get("role") in {"reader_runtime", "reader_stylesheet"} for asset in existing):
        raise ValueError("reader assets must not already exist in the base release manifest")

    reader_runtime = core.materialize_asset(root, *READER_RUNTIME_SPEC)
    reader_stylesheet = core.materialize_asset(root, *READER_STYLESHEET_SPEC)
    promoted: list[dict] = []
    for asset in existing:
        promoted.append(asset)
        if asset.get("role") == "page_registry":
            promoted.append(reader_runtime)
        elif asset.get("role") == "stylesheet":
            promoted.append(reader_stylesheet)

    by_role = {asset["role"]: asset for asset in promoted if asset.get("role") not in {"evidence_image", "state_flag"}}
    required = {
        "map_runtime", "page_registry", "reader_runtime",
        "map_stylesheet", "stylesheet", "reader_stylesheet",
        "reference_geography", "entrypoint",
    }
    if set(by_role) != required:
        raise ValueError(f"reader asset promotion produced an invalid fixed-role set: {sorted(by_role)}")

    application["assets"] = promoted
    application["runtime"] = [
        by_role["map_runtime"]["path"],
        by_role["page_registry"]["path"],
        by_role["reader_runtime"]["path"],
    ]
    application["stylesheets"] = [
        by_role["map_stylesheet"]["path"],
        by_role["stylesheet"]["path"],
        by_role["reader_stylesheet"]["path"],
    ]
    # `stylesheet` remains the primary/base shell stylesheet. The reader sheet is
    # an ordered augmentation, not a replacement for the public-shell identity.
    application["stylesheet"] = by_role["stylesheet"]["path"]
    return _rebind_release_identity(manifest)


def build_manifest(root: Path = ROOT) -> dict:
    root = Path(root).resolve()
    entrypoint_preparation.apply(root)
    core.GENERATOR_VERSION = GENERATOR_VERSION
    return _promote_reader_assets(root, _core_build_manifest(root))


def main() -> int:
    core.build_manifest = build_manifest
    core.GENERATOR_VERSION = GENERATOR_VERSION
    return core.main()


if __name__ == "__main__":
    raise SystemExit(main())
