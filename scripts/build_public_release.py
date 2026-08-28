#!/usr/bin/env python3
"""Build the deterministic public application/read-model release manifest."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = "data/public-release.json"
CURRENT_STATE_PATH = "data/public-current-state.json"
PUBLIC_SHELL_SOURCE = "templates/public-index.html"
APPLICATION_VERSION = "atlas-public-shell-v1"
SCHEMA_VERSION = "1.0"
GENERATOR_VERSION = "1.0"
APPLICATION_ASSETS = (
    "index.html",
    "css/public-shell.css",
    "js/public-app.js",
)


def canonical_text_bytes(path: Path) -> bytes:
    text = path.read_text(encoding="utf-8")
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stable_json_bytes(payload: dict[str, Any]) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def application_version(root: Path) -> str:
    entry = canonical_text_bytes(root / "js/public-app.js").decode("utf-8")
    document = canonical_text_bytes(root / "index.html").decode("utf-8")
    source_document = canonical_text_bytes(root / PUBLIC_SHELL_SOURCE).decode("utf-8")
    if document != source_document:
        raise ValueError(f"index.html differs from its review source: {PUBLIC_SHELL_SOURCE}")
    entry_match = re.search(r"const APPLICATION_VERSION = '([^']+)';", entry)
    document_match = re.search(r'<meta name="atlas-application-version" content="([^"]+)">', document)
    if not entry_match or not document_match:
        raise ValueError("Public application version is missing from the entry point or document shell")
    if entry_match.group(1) != document_match.group(1):
        raise ValueError("Public application entry point and document shell versions differ")
    if entry_match.group(1) != APPLICATION_VERSION:
        raise ValueError(f"Public application version must be {APPLICATION_VERSION}")
    return entry_match.group(1)


def build_manifest(root: Path = ROOT) -> dict[str, Any]:
    root = root.resolve()
    version = application_version(root)
    state_path = root / CURRENT_STATE_PATH
    if not state_path.is_file():
        raise FileNotFoundError(f"Generated current-state artifact is missing: {CURRENT_STATE_PATH}")
    state_bytes = canonical_text_bytes(state_path)
    state = json.loads(state_bytes.decode("utf-8"))
    release = state.get("release") or {}
    if state.get("artifact_role") != "DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL":
        raise ValueError("Current-state artifact role is invalid")

    assets = []
    for relative_path in APPLICATION_ASSETS:
        path = root / relative_path
        if not path.is_file():
            raise FileNotFoundError(f"Public application asset is missing: {relative_path}")
        data = canonical_text_bytes(path)
        assets.append(
            {
                "path": relative_path,
                "sha256": sha256(data),
                "bytes": len(data),
                "hash_basis": "UTF8_LF_NORMALIZED",
            }
        )

    asset_set_material = "".join(
        f"{item['path']}\0{item['sha256']}\n" for item in sorted(assets, key=lambda row: row["path"])
    ).encode("utf-8")
    asset_set_sha256 = sha256(asset_set_material)
    release_material = (
        f"{version}\0{asset_set_sha256}\0{sha256(state_bytes)}\0{release.get('release_identity', '')}\n"
    ).encode("utf-8")
    release_set_sha256 = sha256(release_material)
    generator_path = "scripts/build_public_release.py"
    generator_bytes = canonical_text_bytes(root / generator_path)

    return {
        "schema_version": SCHEMA_VERSION,
        "artifact_role": "PUBLIC_APPLICATION_RELEASE_MANIFEST",
        "release_identity": f"public-release-v1-{release_set_sha256[:16]}",
        "release_set_sha256": release_set_sha256,
        "generated_timestamp_included": False,
        "generator": {
            "version": GENERATOR_VERSION,
            "path": generator_path,
            "sha256": sha256(generator_bytes),
        },
        "application": {
            "version": version,
            "entrypoint": "js/public-app.js",
            "stylesheet": "css/public-shell.css",
            "asset_set_sha256": asset_set_sha256,
            "assets": assets,
        },
        "current_state": {
            "path": CURRENT_STATE_PATH,
            "schema_version": state.get("schema_version"),
            "release_identity": release.get("release_identity"),
            "input_set_sha256": release.get("input_set_sha256"),
            "current_osint_cutoff": release.get("current_osint_cutoff"),
            "sha256": sha256(state_bytes),
            "bytes": len(state_bytes),
            "hash_basis": "UTF8_LF_NORMALIZED",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = root / args.output
    payload = stable_json_bytes(build_manifest(root))
    if args.check:
        if not output.is_file():
            raise SystemExit(f"FAIL: generated public release manifest is missing: {args.output}")
        if output.read_bytes() != payload:
            raise SystemExit(f"FAIL: generated public release manifest is stale: {args.output}")
        print(f"public-release: PASS - {args.output} is current")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(payload)
    manifest = json.loads(payload)
    print(
        "public-release: wrote "
        f"{args.output} ({manifest['release_identity']}; "
        f"model {manifest['current_state']['bytes']} bytes)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
