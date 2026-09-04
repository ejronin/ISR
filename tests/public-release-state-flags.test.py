#!/usr/bin/env python3
"""Validate the closed, non-executable state-flag release boundary."""
from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_release as release  # noqa: E402


manifest = json.loads((ROOT / "data/public-release.json").read_text(encoding="utf-8"))
flags = [asset for asset in manifest["application"]["assets"] if asset["role"] == "state_flag"]
assert len(flags) == len(release.FLAG_ASSET_SPECS) == 30
assert manifest["application"]["state_flags"] == flags
assert len({asset["code"] for asset in flags}) == len(flags)
for asset in flags:
    assert asset["source_path"] == f"assets/flags/{asset['code']}.svg"
    assert asset["path"].startswith(f"assets/releases/state-flag-{asset['code']}.")
    assert asset["path"].endswith(".svg") and asset["sha256"] in asset["path"]
    release.validate_flag_svg(asset["source_path"], (ROOT / asset["source_path"]).read_bytes())

unsafe = {
    "script": b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    "stylesheet import": b'<svg xmlns="http://www.w3.org/2000/svg"><style>@import url("https://example.com/x.css")</style></svg>',
    "stylesheet url": b'<svg xmlns="http://www.w3.org/2000/svg"><style>rect{fill:url(https://example.com/x)}</style></svg>',
    "xml stylesheet": b'<?xml-stylesheet href="https://example.com/x.css"?><svg xmlns="http://www.w3.org/2000/svg"/>',
    "handler": b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
    "external": b'<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/x.png"/></svg>',
    "data": b'<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,AA=="/></svg>',
    "text url": b'<svg xmlns="http://www.w3.org/2000/svg"><desc>url(https://example.com/x)</desc></svg>',
    "tail import": b'<svg xmlns="http://www.w3.org/2000/svg"><rect/>@import "https://example.com/x.css"</svg>',
    "doctype": b'<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>',
}
for label, payload in unsafe.items():
    try:
        release.validate_flag_svg("assets/flags/zz.svg", payload)
    except ValueError:
        pass
    else:
        raise AssertionError(f"unsafe SVG fixture was accepted: {label}")

safe_internal_fragment = b'<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="mark" d="M0 0h1v1H0z"/></defs><use href="#mark"/></svg>'
release.validate_flag_svg("assets/flags/zz.svg", safe_internal_fragment)

print("public state flags: PASS - 30 closed content-addressed SVGs; stylesheets, processing instructions, text/tail expressions, and active/external payloads rejected")
