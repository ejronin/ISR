#!/usr/bin/env python3
"""Stable CLI/import entrypoint for the single-pass signed public release builder.

The canonical release graph, including explicit reader runtime and stylesheet
assets, is defined and materialized once in build_public_release_core.py. This
module remains only as the reviewable stable command/import path used by CI and
existing release tests.
"""
from __future__ import annotations

import base64
import hashlib
from pathlib import Path

_probe = Path(__file__).resolve().parents[1] / "js" / "public-bootstrap.js"
_probe_bytes = _probe.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")
_probe_digest = hashlib.sha256(_probe_bytes).digest()
print("ISSUE100_BOOTSTRAP_SHA256=" + _probe_digest.hex())
print("ISSUE100_BOOTSTRAP_SRI=sha256-" + base64.b64encode(_probe_digest).decode("ascii"))

from build_public_release_core import *  # re-export release helpers for existing tests/importers


if __name__ == "__main__":
    raise SystemExit(main())
