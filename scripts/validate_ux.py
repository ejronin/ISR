#!/usr/bin/env python3
"""Release-gate checks for the operational UX and static-site attack surface."""
from __future__ import annotations

import json
import hashlib
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LinkAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "a" and values.get("target") == "_blank":
            rel = set((values.get("rel") or "").split())
            if not {"noopener", "noreferrer"}.issubset(rel):
                self.errors.append(f"target=_blank link missing noopener/noreferrer: {values.get('href')}")


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    scripts = "\n".join(path.read_text(encoding="utf-8") for path in (ROOT / "js").glob("*.js"))
    require("Content-Security-Policy" in html, "CSP meta policy missing", errors)
    require("script-src 'self'" in html, "CSP script-src must be self-only", errors)
    require("object-src 'none'" in html and "form-action 'none'" in html, "CSP object/form restrictions missing", errors)
    require(not re.search(r"\son(?:click|load|error|input|change)=", html, re.I), "inline executable handler found", errors)
    require("unpkg.com" not in html and "https://cdn" not in html, "remote executable/style dependency found", errors)
    require((ROOT / "vendor/leaflet/leaflet.js").is_file(), "vendored Leaflet JS missing", errors)
    require((ROOT / "vendor/leaflet/leaflet.css").is_file(), "vendored Leaflet CSS missing", errors)
    vendor = json.loads((ROOT / "vendor/leaflet/VERSION.json").read_text(encoding="utf-8"))
    require(vendor.get("version") == "1.9.4", "vendored Leaflet version mismatch", errors)
    for relative, expected in vendor.get("sha256", {}).items():
        candidate = ROOT / "vendor/leaflet" / relative
        actual = hashlib.sha256(candidate.read_bytes()).hexdigest() if candidate.is_file() else None
        require(actual == expected, f"vendored Leaflet hash mismatch: {relative}", errors)
    for label in ("Overview", "Operations", "Effects", "Information", "Evidence"):
        require(f">{label}<" in html, f"primary area missing: {label}", errors)
    require('id="currentPictureBlocks"' in html, "Current Picture structured blocks missing", errors)
    require("CURRENT ASSESSMENT — reviewed through" in scripts, "current-adjudication cutoff label missing", errors)
    require("REPORTED / NOT VERIFIED BY CUTOFF" in (ROOT / "js/temporal.js").read_text(encoding="utf-8"), "KNOWN BY badge missing", errors)
    require("timeline-rail" in scripts and "timelineGranularity" in scripts, "temporal controller missing", errors)
    require("configureAtlasMap" in scripts and "viewLayers" in scripts, "analysis/map state synchronization missing", errors)
    require("SCHEMATIC" in scripts and "audited" in scripts, "route-geometry audit mapping/label missing", errors)
    require("accounting-matrix" in scripts and "CALCULATED RANGE" in scripts, "symmetric calculated accounting missing", errors)
    require("javascript:" not in html.lower(), "javascript URL found in HTML", errors)
    audit = LinkAudit()
    audit.feed(html)
    errors.extend(audit.errors)
    build_info = json.loads((ROOT / "build-info.json").read_text(encoding="utf-8"))
    require(build_info.get("ledger_version") == "integration-v1.2", "build ledger version mismatch", errors)
    require(len(build_info.get("authoritative_json_sha256", {})) == 24, "build manifest must hash all 24 authoritative JSON files", errors)
    if errors:
        print("UX/security validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("UX/security validation passed: navigation, temporal state, synchronized map, CSP, local runtime, safe links, and build identity")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
