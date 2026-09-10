#!/usr/bin/env python3
"""Build the signed public release after composing the reader-first presentation layer.

The legacy page registry remains reviewable source during the migration. This
entrypoint deterministically appends the reader layer and its CSS to the signed
runtime source before delegating to the proven release builder. Composition is
idempotent inside a build workspace and does not alter canonical evidence.
"""
from __future__ import annotations

from pathlib import Path

import build_public_release_core as core
from build_public_release_core import *  # re-export release helpers for existing tests/importers

ROOT = Path(__file__).resolve().parents[1]
READER_JS = "js/public-reader-layer.js"
READER_CSS = "css/public-reader-layer.css"
PAGE_REGISTRY = "js/public-ia.js"
PUBLIC_STYLESHEET = "css/public-shell.css"
JS_MARKER = "/* ATLAS_PUBLIC_READER_LAYER_COMPOSED */"
CSS_MARKER = "/* ATLAS_PUBLIC_READER_STYLES_COMPOSED */"

_core_build_manifest = core.build_manifest


def _canonical_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")


def _compose_once(target: Path, source: Path, marker: str) -> None:
    current = _canonical_text(target)
    if marker in current:
        return
    addition = _canonical_text(source)
    combined = current.rstrip() + "\n\n" + marker + "\n" + addition.rstrip() + "\n"
    target.write_text(combined, encoding="utf-8", newline="\n")


def compose_reader_sources(root: Path = ROOT) -> None:
    root = Path(root).resolve()
    _compose_once(root / PAGE_REGISTRY, root / READER_JS, JS_MARKER)
    _compose_once(root / PUBLIC_STYLESHEET, root / READER_CSS, CSS_MARKER)


def build_manifest(root: Path = ROOT) -> dict:
    root = Path(root).resolve()
    compose_reader_sources(root)
    core.GENERATOR_VERSION = "2.0-reader"
    return _core_build_manifest(root)


def main() -> int:
    core.build_manifest = build_manifest
    core.GENERATOR_VERSION = "2.0-reader"
    return core.main()


if __name__ == "__main__":
    raise SystemExit(main())
