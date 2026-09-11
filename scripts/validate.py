#!/usr/bin/env python3
"""Current static-site and security validation for the public Atlas release.

This validator deliberately ignores retired root-application and historical
presentation contracts. Current release qualification belongs to the signed
public shell/runtime plus canonical/public evidence validation.
"""
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import re
import struct
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = [
    "index.html",
    "templates/public-index.html",
    "css/public-shell.css",
    "js/public-bootstrap.js",
    "js/public-app.js",
    "js/public-ia.js",
    "src/public-reader-layer.js",
    "src/public-reader-layer.css",
    "data/public-release.json",
    ".nojekyll",
    "assets/social-preview.png",
    "vendor/leaflet/leaflet.js",
    "vendor/leaflet/leaflet.css",
    "vendor/leaflet/VERSION.json",
]
REQUIRED_IDS = {"atlas-root"}


class AtlasParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.local_assets: list[str] = []
        self.meta: dict[str, str] = {}
        self.links: list[dict[str, str]] = []
        self.errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if values.get("id"):
            self.ids.append(values["id"])
        if tag in {"script", "link", "img"}:
            value = values.get("src") or values.get("href")
            if value and "://" not in value and not value.startswith(("data:", "#")):
                self.local_assets.append(value.split("?")[0])
        if tag == "meta":
            key = values.get("property") or values.get("name")
            if key:
                self.meta[key] = values.get("content", "")
        if tag == "link":
            self.links.append(values)
        if tag == "a" and values.get("target") == "_blank":
            rel = set(values.get("rel", "").split())
            if not {"noopener", "noreferrer"}.issubset(rel):
                self.errors.append(f"target=_blank link missing noopener/noreferrer: {values.get('href')}")


def fail(message: str) -> int:
    print("FAIL:", message)
    return 1


def main() -> int:
    failures = 0
    for rel in REQUIRED_FILES:
        if not (ROOT / rel).exists():
            failures += fail(f"missing required current-release file: {rel}")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    template = (ROOT / "templates/public-index.html").read_text(encoding="utf-8")
    if html != template:
        failures += fail("deployed index differs from templates/public-index.html review source")

    parser = AtlasParser()
    parser.feed(html)
    for error in parser.errors:
        failures += fail(error)

    seen: set[str] = set()
    duplicates: set[str] = set()
    for value in parser.ids:
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    if duplicates:
        failures += fail(f"duplicate HTML ids: {sorted(duplicates)}")
    missing_ids = sorted(REQUIRED_IDS - set(parser.ids))
    if missing_ids:
        failures += fail(f"missing required public-shell IDs: {missing_ids}")

    for rel in parser.local_assets:
        path = Path(rel.replace("%20", " "))
        if not (ROOT / path).exists():
            failures += fail(f"broken local asset reference: {rel}")

    expected_meta = {
        "og:type": "website",
        "og:url": "https://ejronin.github.io/ISR/",
        "og:image": "https://ejronin.github.io/ISR/assets/social-preview.png",
        "twitter:card": "summary_large_image",
    }
    for key, value in expected_meta.items():
        if parser.meta.get(key) != value:
            failures += fail(f"{key} expected {value!r}, got {parser.meta.get(key)!r}")
    canonical = [item.get("href") for item in parser.links if "canonical" in item.get("rel", "").split()]
    if canonical != ["https://ejronin.github.io/ISR/"]:
        failures += fail(f"canonical link invalid: {canonical}")

    # Current public root security policy.
    for token, message in (
        ("Content-Security-Policy", "CSP meta policy missing"),
        ("script-src 'self'", "CSP script-src must be self-only"),
        ("object-src 'none'", "CSP object-src must be none"),
        ("form-action 'none'", "CSP form-action must be none"),
    ):
        if token not in html:
            failures += fail(message)
    if re.search(r"\son(?:click|load|error|input|change)=", html, re.I):
        failures += fail("inline executable handler found")
    if "unpkg.com" in html or "https://cdn" in html:
        failures += fail("remote executable/style dependency found")
    if "javascript:" in html.lower():
        failures += fail("javascript URL found in HTML")

    # All repository JSON should remain parseable even when some files are
    # historical evidence/audit material rather than current presentation.
    for path in sorted((ROOT / "data").rglob("*.json")):
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # pragma: no cover - diagnostic path
            failures += fail(f"invalid JSON {path.relative_to(ROOT)}: {exc}")

    png = ROOT / "assets/social-preview.png"
    if png.exists():
        header = png.read_bytes()[:24]
        if header[:8] != b"\x89PNG\r\n\x1a\n":
            failures += fail("social-preview.png is not PNG")
        else:
            width, height = struct.unpack(">II", header[16:24])
            if (width, height) != (1200, 630):
                failures += fail(f"social preview dimensions {(width, height)} != (1200, 630)")

    css = (ROOT / "css/public-shell.css").read_text(encoding="utf-8")
    for token in ("prefers-reduced-motion: reduce", ".secondary-nav", ".mobile-navigation"):
        if token not in css:
            failures += fail(f"public shell responsive/accessibility style missing: {token}")

    # Vendored mapping runtime is pinned and hashed; no CDN execution path.
    vendor = json.loads((ROOT / "vendor/leaflet/VERSION.json").read_text(encoding="utf-8"))
    if vendor.get("version") != "1.9.4":
        failures += fail("vendored Leaflet version mismatch")
    for relative, expected in vendor.get("sha256", {}).items():
        candidate = ROOT / "vendor/leaflet" / relative
        if not candidate.is_file():
            failures += fail(f"vendored Leaflet file missing: {relative}")
            continue
        data = candidate.read_bytes()
        if candidate.suffix.lower() in {".css", ".js", ".md", ".txt", ""}:
            data = data.replace(b"\r\n", b"\n")
        actual = hashlib.sha256(data).hexdigest()
        if actual != expected:
            failures += fail(f"vendored Leaflet hash mismatch: {relative}")

    # Syntax-check only current signed runtime sources. Retired root-app modules
    # are intentionally outside current release qualification.
    for rel in (
        "js/public-bootstrap.js",
        "js/public-app.js",
        "js/public-ia.js",
        "src/public-reader-layer.js",
    ):
        proc = subprocess.run(["node", "--check", str(ROOT / rel)], capture_output=True, text=True)
        if proc.returncode:
            failures += fail(f"JS syntax error in {rel}: {proc.stderr.strip()}")

    if failures:
        print(f"Validation failed: {failures} issue(s)")
        return 1
    print("Validation passed: current public shell, security policy, local assets, JSON, signed runtime syntax, accessibility styles, vendor hashes, metadata, and social preview.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
