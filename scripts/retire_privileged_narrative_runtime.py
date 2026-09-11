#!/usr/bin/env python3
"""Prepare the transitional signed public entrypoint for release.

The tracked public-app source still contains the final-polish-era privileged
narrative block while the reader rearchitecture is being decomposed. Production
release assembly removes that block and clears the state hook before the
entrypoint is content-addressed and signed.

The same bounded entrypoint-preparation seam also updates the release-authorization
contract for the separately signed reader runtime and stylesheet. The reader
modules themselves are never concatenated into the entrypoint, page registry or
base stylesheet. This source-transform seam is intentionally temporary and should
be removed once `js/public-app.js` is promoted to the final neutral source form.

Current reader-facing state remains provided by OverviewPage from the canonical
public read model (`ledger.domain_assessments`, `analysis.endgame_public_view`,
`current.chronology`, and `gate3.gaps`). No evidence or canonical data is changed.
"""
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRYPOINT = Path("js/public-app.js")
BEGIN = "  // ROOK_NARRATIVE_CURRENT_BEGIN"
FUNCTION_AFTER_BLOCK = "  function now() {"
OLD_STATE = "      narrativeContract: FINAL_NARRATIVE_GATES,"
NEW_STATE = "      narrativeContract: null,"
RETIRED_MARKER = "  // ATLAS_PRIVILEGED_NARRATIVE_RETIRED"

READER_CONTRACT_REPLACEMENTS = (
    (
        "    const runtime = validateContentAddressedAsset(assetForRole(manifest, 'page_registry'), 'js');\n"
        "    const mapStylesheet = validateContentAddressedAsset(assetForRole(manifest, 'map_stylesheet'), 'css');",
        "    const runtime = validateContentAddressedAsset(assetForRole(manifest, 'page_registry'), 'js');\n"
        "    const readerRuntime = validateContentAddressedAsset(assetForRole(manifest, 'reader_runtime'), 'js');\n"
        "    const mapStylesheet = validateContentAddressedAsset(assetForRole(manifest, 'map_stylesheet'), 'css');",
    ),
    (
        "    const stylesheet = validateContentAddressedAsset(assetForRole(manifest, 'stylesheet'), 'css');\n"
        "    const geography = validateContentAddressedAsset(assetForRole(manifest, 'reference_geography'), 'geojson');",
        "    const stylesheet = validateContentAddressedAsset(assetForRole(manifest, 'stylesheet'), 'css');\n"
        "    const readerStylesheet = validateContentAddressedAsset(assetForRole(manifest, 'reader_stylesheet'), 'css');\n"
        "    const geography = validateContentAddressedAsset(assetForRole(manifest, 'reference_geography'), 'geojson');",
    ),
    (
        "    const fixedRoles = ['map_runtime', 'page_registry', 'map_stylesheet', 'stylesheet', 'reference_geography', 'entrypoint'];",
        "    const fixedRoles = ['map_runtime', 'page_registry', 'reader_runtime', 'map_stylesheet', 'stylesheet', 'reader_stylesheet', 'reference_geography', 'entrypoint'];",
    ),
    (
        "    invariant(Array.isArray(manifest.application.runtime) && manifest.application.runtime.length === 2 && manifest.application.runtime[0] === mapRuntime.path && manifest.application.runtime[1] === runtime.path, 'RELEASE_MISMATCH', 'The application runtime paths are inconsistent.');",
        "    invariant(Array.isArray(manifest.application.runtime) && manifest.application.runtime.length === 3 && manifest.application.runtime[0] === mapRuntime.path && manifest.application.runtime[1] === runtime.path && manifest.application.runtime[2] === readerRuntime.path, 'RELEASE_MISMATCH', 'The application runtime paths are inconsistent.');",
    ),
    (
        "    invariant(Array.isArray(manifest.application.stylesheets) && manifest.application.stylesheets.length === 2 && manifest.application.stylesheets[0] === mapStylesheet.path && manifest.application.stylesheets[1] === stylesheet.path, 'RELEASE_MISMATCH', 'The application stylesheet paths are inconsistent.');",
        "    invariant(Array.isArray(manifest.application.stylesheets) && manifest.application.stylesheets.length === 3 && manifest.application.stylesheets[0] === mapStylesheet.path && manifest.application.stylesheets[1] === stylesheet.path && manifest.application.stylesheets[2] === readerStylesheet.path, 'RELEASE_MISMATCH', 'The application stylesheet paths are inconsistent.');",
    ),
    (
        "    const runtimes = [assetForRole(manifest, 'map_runtime'), assetForRole(manifest, 'page_registry')];",
        "    const runtimes = [assetForRole(manifest, 'map_runtime'), assetForRole(manifest, 'page_registry'), assetForRole(manifest, 'reader_runtime')];",
    ),
    (
        "    const stylesheets = [assetForRole(manifest, 'map_stylesheet'), assetForRole(manifest, 'stylesheet')];",
        "    const stylesheets = [assetForRole(manifest, 'map_stylesheet'), assetForRole(manifest, 'stylesheet'), assetForRole(manifest, 'reader_stylesheet')];",
    ),
    (
        "    invariant(Array.isArray(authorization.runtimeAssets) && authorization.runtimeAssets.length === 2, 'RELEASE_MISMATCH', 'The runtime authorization is incomplete.');",
        "    invariant(Array.isArray(authorization.runtimeAssets) && authorization.runtimeAssets.length === 3, 'RELEASE_MISMATCH', 'The runtime authorization is incomplete.');",
    ),
    (
        "    invariant(Array.isArray(authorization.stylesheetAssets) && authorization.stylesheetAssets.length === 2, 'RELEASE_MISMATCH', 'The stylesheet authorization is incomplete.');",
        "    invariant(Array.isArray(authorization.stylesheetAssets) && authorization.stylesheetAssets.length === 3, 'RELEASE_MISMATCH', 'The stylesheet authorization is incomplete.');",
    ),
)


def _replace_once_or_accept(source: str, old: str, new: str) -> str:
    if new in source:
        return source
    if old not in source:
        raise ValueError(f"entrypoint preparation could not find expected source contract: {old[:96]!r}")
    return source.replace(old, new, 1)


def transform(source: str) -> str:
    """Return the deployable entrypoint with old narrative and runtime contracts removed."""
    text = source.replace("\r\n", "\n").replace("\r", "\n")

    if BEGIN in text:
        start = text.index(BEGIN)
        end = text.index(FUNCTION_AFTER_BLOCK, start)
        text = text[:start] + RETIRED_MARKER + "\n\n" + text[end:]

    if OLD_STATE in text:
        text = text.replace(OLD_STATE, NEW_STATE, 1)

    for old, new in READER_CONTRACT_REPLACEMENTS:
        text = _replace_once_or_accept(text, old, new)

    if "ROOK_NARRATIVE_CURRENT" in text:
        raise ValueError("privileged ROOK narrative token remains in deployable entrypoint")
    if "FINAL_NARRATIVE_GATES" in text:
        raise ValueError("retired final narrative contract remains in deployable entrypoint")
    if OLD_STATE in text:
        raise ValueError("retired narrative state hook remains in deployable entrypoint")
    if NEW_STATE not in text:
        raise ValueError("neutral narrative state hook was not established")
    if RETIRED_MARKER not in text:
        raise ValueError("retired narrative marker is missing")
    for _old, new in READER_CONTRACT_REPLACEMENTS:
        if new not in text:
            raise ValueError("reader runtime authorization contract was not established")
    return text


def apply(root: Path = ROOT) -> Path:
    root = Path(root).resolve()
    path = root / ENTRYPOINT
    original = path.read_text(encoding="utf-8")
    updated = transform(original)
    path.write_text(updated, encoding="utf-8", newline="\n")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    path = root / ENTRYPOINT
    source = path.read_text(encoding="utf-8")
    transformed = transform(source)
    if args.check:
        if transform(transformed) != transformed:
            raise SystemExit("FAIL: public entrypoint preparation transform is not idempotent")
        print("public-entrypoint preparation: PASS")
        return 0
    path.write_text(transformed, encoding="utf-8", newline="\n")
    print(f"public-entrypoint preparation: updated {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
