#!/usr/bin/env python3
"""Validate the generated current record and bound release inside a Pages tree."""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import re
from pathlib import Path


FORBIDDEN_INITIAL_CONTENT = (
    "Reviewed through 2026-08-20 15:59 ET",
    ">108</b><span>current chronology records",
    "ATLAS / TIMELINE / ANALYSIS / MOU / SOURCES",
    "current-update-20260824.js",
)


def fail(message: str) -> None:
    raise SystemExit(f"FAIL: {message}")


def canonical_text_bytes(path: Path) -> bytes:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        fail(f"deployment file is missing: {path}")
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def integrity(data: bytes) -> str:
    return "sha256-" + base64.b64encode(hashlib.sha256(data).digest()).decode("ascii")


def validate_asset(site: Path, asset: dict, role: str, extension: str, hash_basis: str = "UTF8_LF_NORMALIZED") -> None:
    if asset.get("role") != role:
        fail(f"public release {role} role mismatch")
    expected_path = f"assets/releases/{asset.get('name')}.{asset.get('sha256')}.{extension}"
    if asset.get("path") != expected_path:
        fail(f"public release {role} is not content-addressed")
    data = (site / expected_path).read_bytes() if hash_basis == "BINARY_BYTES" else canonical_text_bytes(site / expected_path)
    if digest(data) != asset.get("sha256") or len(data) != asset.get("bytes"):
        fail(f"deployed {role} bytes do not match the public release manifest")
    if integrity(data) != asset.get("integrity"):
        fail(f"deployed {role} SRI does not match the public release manifest")
    if asset.get("hash_basis") != hash_basis:
        fail(f"public release {role} hash basis mismatch")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-root", default=".")
    parser.add_argument("--require-build-info", action="store_true")
    args = parser.parse_args()
    site = Path(args.site_root).resolve()
    manifest_path = site / "data/public-release.json"
    state_path = site / "data/public-current-state.json"
    if not manifest_path.is_file():
        fail("data/public-release.json was not generated into the Pages artifact")
    if not state_path.is_file():
        fail("data/public-current-state.json was not generated into the Pages artifact")
    manifest = json.loads(canonical_text_bytes(manifest_path).decode("utf-8"))
    state_bytes = canonical_text_bytes(state_path)
    state = json.loads(state_bytes.decode("utf-8"))

    if manifest.get("artifact_role") != "PUBLIC_APPLICATION_RELEASE_MANIFEST":
        fail("public release manifest role mismatch")
    if manifest.get("generated_timestamp_included") is not False:
        fail("public release manifest must remain deterministic")
    if not re.fullmatch(r"public-release-v1-[a-f0-9]{16}", manifest.get("release_identity") or ""):
        fail("public release identity mismatch")
    current = manifest.get("current_state") or {}
    if current.get("path") != "data/public-current-state.json":
        fail("public release current-state path mismatch")
    if current.get("sha256") != digest(state_bytes) or current.get("bytes") != len(state_bytes):
        fail("deployed current-state bytes do not match the public release manifest")
    release = state.get("release") or {}
    if current.get("release_identity") != release.get("release_identity"):
        fail("deployed application and current-state release identities differ")
    if current.get("input_set_sha256") != release.get("input_set_sha256"):
        fail("deployed application and current-state input identities differ")
    if current.get("current_osint_cutoff") != release.get("current_osint_cutoff"):
        fail("deployed application and current-state cutoffs differ")
    chronology_count = state.get("counts", {}).get("chronology_records")
    if not isinstance(chronology_count, int) or chronology_count < 1 or len(state.get("chronology", [])) != chronology_count:
        fail("deployed current-state chronology does not match its derived count")

    bootstrap_block = manifest.get("neutral_bootstrap") or {}
    if bootstrap_block.get("protocol") != "atlas-release-bootstrap-v1":
        fail("neutral bootstrap protocol mismatch")
    bootstrap = bootstrap_block.get("asset") or {}
    application = manifest.get("application") or {}
    assets = application.get("assets") or []
    expected_roles = {"map_runtime", "page_registry", "map_stylesheet", "stylesheet", "reference_geography", "entrypoint"}
    role_counts = {role: sum(asset.get("role") == role for asset in assets) for role in expected_roles}
    if any(count != 1 for count in role_counts.values()) or any(asset.get("role") not in expected_roles | {"evidence_image"} for asset in assets):
        fail("public release application asset inventory is incomplete")
    by_role = {asset["role"]: asset for asset in assets}
    validate_asset(site, bootstrap, "bootstrap", "js")
    validate_asset(site, by_role["map_runtime"], "map_runtime", "js")
    validate_asset(site, by_role["page_registry"], "page_registry", "js")
    validate_asset(site, by_role["map_stylesheet"], "map_stylesheet", "css")
    validate_asset(site, by_role["stylesheet"], "stylesheet", "css")
    validate_asset(site, by_role["reference_geography"], "reference_geography", "geojson")
    validate_asset(site, by_role["entrypoint"], "entrypoint", "js")
    evidence_images = [asset for asset in assets if asset.get("role") == "evidence_image"]
    for asset in evidence_images:
        extension = str(asset.get("path") or "").rsplit(".", 1)[-1]
        if extension not in {"png", "jpg", "webp"}:
            fail("public release evidence-image extension is unsupported")
        validate_asset(site, asset, "evidence_image", extension, "BINARY_BYTES")
    if application.get("runtime") != [by_role["map_runtime"].get("path"), by_role["page_registry"].get("path")]:
        fail("public release runtime pointers mismatch")
    if application.get("stylesheets") != [by_role["map_stylesheet"].get("path"), by_role["stylesheet"].get("path")]:
        fail("public release stylesheet inventory mismatch")
    if application.get("stylesheet") != by_role["stylesheet"].get("path"):
        fail("public release stylesheet pointer mismatch")
    if application.get("reference_geography") != by_role["reference_geography"].get("path"):
        fail("public release reference-geography pointer mismatch")
    if application.get("evidence_images") != [asset.get("path") for asset in evidence_images]:
        fail("public release evidence-image inventory mismatch")
    if application.get("entrypoint") != by_role["entrypoint"].get("path"):
        fail("public release entrypoint pointer mismatch")

    index = canonical_text_bytes(site / "index.html").decode("utf-8")
    if 'id="atlas-root"' not in index or "Loading current evidence record…" not in index:
        fail("minimal current-record loading shell is missing")
    if any(token in index for token in FORBIDDEN_INITIAL_CONTENT):
        fail("obsolete current content remains in the initial public document")
    script_tags = re.findall(r"<script\b[^>]*\bsrc=\"[^\"]+\"[^>]*>", index, re.I)
    if len(script_tags) != 1:
        fail(f"initial document must load one neutral bootstrap; found {len(script_tags)} scripts")
    script = script_tags[0]
    required_attributes = (
        f'src="{bootstrap["path"]}"',
        f'integrity="{bootstrap["integrity"]}"',
        'crossorigin="anonymous"',
        f'data-bootstrap-sha256="{bootstrap["sha256"]}"',
        'data-atlas-entry="bootstrap"',
    )
    if not all(attribute in script for attribute in required_attributes):
        fail("initial document does not bind the exact manifest-authorized bootstrap")
    if re.search(r'<script\b[^>]*\bsrc="js/public-app\.js', index, re.I):
        fail("initial document executes mutable application bytes directly")
    if re.search(r'<link\b[^>]*\bhref="css/public-shell\.css', index, re.I):
        fail("initial document activates mutable application CSS directly")
    if 'meta name="atlas-bootstrap-protocol" content="atlas-release-bootstrap-v1"' not in index:
        fail("neutral bootstrap protocol marker is missing")

    if args.require_build_info and not (site / "build-info.json").is_file():
        fail("build-info.json is missing from the Pages artifact")

    compressed = gzip.compress(state_bytes, compresslevel=9, mtime=0)
    print(
        "public-deployment validation: PASS - "
        f"{manifest['release_identity']}; content-addressed bootstrap/application; {chronology_count} records; "
        f"model={len(state_bytes)} bytes; gzip-9={len(compressed)} bytes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
