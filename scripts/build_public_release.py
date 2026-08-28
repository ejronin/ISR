#!/usr/bin/env python3
"""Build the deterministic content-addressed public release manifest and assets."""
from __future__ import annotations

import argparse
import base64
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
BOOTSTRAP_PROTOCOL = "atlas-release-bootstrap-v1"
SCHEMA_VERSION = "1.0"
GENERATOR_VERSION = "1.1"
ASSET_SPECS = (
    ("bootstrap", "public-bootstrap", "js/public-bootstrap.js", "js"),
    ("stylesheet", "public-shell", "css/public-shell.css", "css"),
    ("entrypoint", "public-app", "js/public-app.js", "js"),
)


def canonical_text_bytes(path: Path) -> bytes:
    text = path.read_text(encoding="utf-8")
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sri_sha256(data: bytes) -> str:
    return "sha256-" + base64.b64encode(hashlib.sha256(data).digest()).decode("ascii")


def stable_json_bytes(payload: dict[str, Any]) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def materialize_asset(root: Path, role: str, name: str, source_path: str, extension: str) -> dict[str, Any]:
    source = root / source_path
    if not source.is_file():
        raise FileNotFoundError(f"Public application source asset is missing: {source_path}")
    data = canonical_text_bytes(source)
    digest = sha256(data)
    relative_path = f"assets/releases/{name}.{digest}.{extension}"
    output = root / relative_path
    output.parent.mkdir(parents=True, exist_ok=True)
    if not output.is_file() or output.read_bytes() != data:
        output.write_bytes(data)
    return {
        "role": role,
        "name": name,
        "source_path": source_path,
        "path": relative_path,
        "sha256": digest,
        "integrity": sri_sha256(data),
        "bytes": len(data),
        "hash_basis": "UTF8_LF_NORMALIZED",
    }


def validate_source_versions(root: Path) -> str:
    entry = canonical_text_bytes(root / "js/public-app.js").decode("utf-8")
    bootstrap = canonical_text_bytes(root / "js/public-bootstrap.js").decode("utf-8")
    entry_match = re.search(r"const APPLICATION_VERSION = '([^']+)';", entry)
    bootstrap_app_match = re.search(r"const APPLICATION_VERSION = '([^']+)';", bootstrap)
    protocol_match = re.search(r"const BOOTSTRAP_PROTOCOL = '([^']+)';", bootstrap)
    if not entry_match or not bootstrap_app_match or not protocol_match:
        raise ValueError("Public application/bootstrap version constants are missing")
    if entry_match.group(1) != APPLICATION_VERSION or bootstrap_app_match.group(1) != APPLICATION_VERSION:
        raise ValueError(f"Public application version must be {APPLICATION_VERSION}")
    if protocol_match.group(1) != BOOTSTRAP_PROTOCOL:
        raise ValueError(f"Bootstrap protocol must be {BOOTSTRAP_PROTOCOL}")
    return APPLICATION_VERSION


def validate_document_shell(root: Path, bootstrap_asset: dict[str, Any]) -> None:
    document = canonical_text_bytes(root / "index.html").decode("utf-8")
    source_document = canonical_text_bytes(root / PUBLIC_SHELL_SOURCE).decode("utf-8")
    if document != source_document:
        raise ValueError(f"index.html differs from its review source: {PUBLIC_SHELL_SOURCE}")
    expected = (
        f'src="{bootstrap_asset["path"]}" integrity="{bootstrap_asset["integrity"]}" '
        f'crossorigin="anonymous" data-bootstrap-sha256="{bootstrap_asset["sha256"]}"'
    )
    if expected not in document:
        raise ValueError("Document shell does not bind the exact content-addressed bootstrap asset")
    if re.search(r'<script\b[^>]*\bsrc="js/public-app\.js', document, re.I):
        raise ValueError("Document shell must not execute the mutable application source directly")
    if re.search(r'<link\b[^>]*\bhref="css/public-shell\.css', document, re.I):
        raise ValueError("Document shell must not activate the mutable stylesheet source directly")


def build_manifest(root: Path = ROOT) -> dict[str, Any]:
    root = root.resolve()
    version = validate_source_versions(root)
    asset_records = [materialize_asset(root, *spec) for spec in ASSET_SPECS]
    assets_by_role = {asset["role"]: asset for asset in asset_records}
    validate_document_shell(root, assets_by_role["bootstrap"])

    state_path = root / CURRENT_STATE_PATH
    if not state_path.is_file():
        raise FileNotFoundError(f"Generated current-state artifact is missing: {CURRENT_STATE_PATH}")
    state_bytes = canonical_text_bytes(state_path)
    state = json.loads(state_bytes.decode("utf-8"))
    release = state.get("release") or {}
    if state.get("artifact_role") != "DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL":
        raise ValueError("Current-state artifact role is invalid")

    application_assets = [assets_by_role["stylesheet"], assets_by_role["entrypoint"]]
    asset_set_material = "".join(
        f"{item['role']}\0{item['path']}\0{item['sha256']}\n"
        for item in sorted(application_assets, key=lambda row: row["role"])
    ).encode("utf-8")
    asset_set_sha256 = sha256(asset_set_material)
    release_material = (
        f"{BOOTSTRAP_PROTOCOL}\0{assets_by_role['bootstrap']['sha256']}\0{version}\0"
        f"{asset_set_sha256}\0{sha256(state_bytes)}\0{release.get('release_identity', '')}\n"
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
        "neutral_bootstrap": {
            "protocol": BOOTSTRAP_PROTOCOL,
            "asset": assets_by_role["bootstrap"],
        },
        "application": {
            "version": version,
            "entrypoint": assets_by_role["entrypoint"]["path"],
            "stylesheet": assets_by_role["stylesheet"]["path"],
            "asset_set_sha256": asset_set_sha256,
            "assets": application_assets,
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
        print(f"public-release: PASS - {args.output} and content-addressed assets are current")
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
