#!/usr/bin/env python3
"""Validate the generated current record and public release inside a Pages tree."""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
from pathlib import Path


REQUIRED_ASSETS = {"index.html", "css/public-shell.css", "js/public-app.js"}
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
    if state.get("counts", {}).get("chronology_records") != 205 or len(state.get("chronology", [])) != 205:
        fail("deployed current-state chronology is not 205 records")

    assets = manifest.get("application", {}).get("assets") or []
    asset_paths = {item.get("path") for item in assets}
    if not REQUIRED_ASSETS.issubset(asset_paths):
        fail("public release application asset inventory is incomplete")
    for asset in assets:
        data = canonical_text_bytes(site / asset["path"])
        if digest(data) != asset.get("sha256") or len(data) != asset.get("bytes"):
            fail(f"deployed asset does not match the public release manifest: {asset['path']}")

    index = canonical_text_bytes(site / "index.html").decode("utf-8")
    if 'id="atlas-root"' not in index or "Loading current evidence record…" not in index:
        fail("minimal current-record loading shell is missing")
    if any(token in index for token in FORBIDDEN_INITIAL_CONTENT):
        fail("obsolete current content remains in the initial public document")
    scripts = re.findall(r"<script\b[^>]*\bsrc=\"([^\"]+)\"", index, re.I)
    if len(scripts) != 1 or not scripts[0].startswith("js/public-app.js"):
        fail(f"initial document must load one canonical application entry; found {scripts}")
    if 'meta name="atlas-application-version" content="atlas-public-shell-v1"' not in index:
        fail("document/application release version marker is missing")

    if args.require_build_info and not (site / "build-info.json").is_file():
        fail("build-info.json is missing from the Pages artifact")

    compressed = gzip.compress(state_bytes, compresslevel=9, mtime=0)
    print(
        "public-deployment validation: PASS - "
        f"{manifest['release_identity']}; 205 records; "
        f"model={len(state_bytes)} bytes; gzip-9={len(compressed)} bytes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
