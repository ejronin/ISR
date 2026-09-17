#!/usr/bin/env python3
"""Stable CLI/import entrypoint for the single-pass signed public release builder.

The canonical release graph, including explicit reader runtime and stylesheet
assets, is defined and materialized once in build_public_release_core.py. This
module remains only as the reviewable stable command/import path used by CI and
existing release tests.
"""
from __future__ import annotations

from build_public_release_core import *  # re-export release helpers for existing tests/importers


if __name__ == "__main__":
    raise SystemExit(main())
