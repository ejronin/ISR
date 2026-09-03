#!/usr/bin/env python3
"""Validate current, archived, generated and deployed presentation boundaries."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from assemble_public_site import check as check_site, deployed_inventory


ROOT = Path(__file__).resolve().parents[1]
INVENTORY_PATH = "config/public-runtime-inventory.json"
MANIFEST_PATH = "data/public-release.json"
REQUIRED_CLASSIFICATION_SEMANTICS = {
    "current_runtime",
    "archive_reference",
    "generated",
    "build_test_support",
}
REQUIRED_CURRENT_SERVICE_OWNERS = (
    ("public bootstrap", "js/public-bootstrap.js", "async function start"),
    ("public application", "js/public-app.js", "async function boot"),
    ("public page registry and route ownership", "js/public-ia.js", "PAGE_OWNERS"),
    ("shared evidence drawer", "js/public-ia.js", "EvidenceDrawer"),
    ("shared MapView", "js/public-ia.js", "MapView"),
    ("route data authorization", "js/public-app.js", "createRouteModelView"),
    ("shared source resolver", "js/public-app.js", "createSourceResolver"),
    ("canonical location resolver", "js/public-app.js", "createLocationResolver"),
    ("signed release builder", "scripts/build_public_release.py", "def build_manifest"),
    ("closed production artifact assembler", "scripts/assemble_public_site.py", "def expected_files"),
    ("runtime inventory validator", "scripts/validate_public_runtime_inventory.py", "def validate_repository"),
)


class RuntimeInventoryError(ValueError):
    """A presentation file is unclassified or crosses the public boundary."""


def files_under(root: Path, pattern: str) -> set[str]:
    return {path.relative_to(root).as_posix() for path in root.glob(pattern) if path.is_file()}


def require_exact(actual: set[str], expected: set[str], label: str) -> None:
    missing = sorted(expected - actual)
    unclassified = sorted(actual - expected)
    if missing or unclassified:
        raise RuntimeInventoryError(f"{label} classification mismatch; missing={missing}; unclassified={unclassified}")


def require_disjoint(classifications: dict[str, set[str]]) -> None:
    owners: dict[str, str] = {}
    for classification, paths in classifications.items():
        for relative in paths:
            if relative in owners:
                raise RuntimeInventoryError(
                    f"presentation path has multiple classifications: {relative}: "
                    f"{owners[relative]} and {classification}"
                )
            owners[relative] = classification


def load_json(root: Path, relative: str) -> dict:
    path = root / relative
    if not path.is_file():
        raise RuntimeInventoryError(f"required inventory input is missing: {relative}")
    return json.loads(path.read_text(encoding="utf-8"))


def validate_service_owners(root: Path, inventory: dict, eligible_paths: set[str]) -> None:
    owners = inventory.get("current_service_owners") or []
    actual: list[tuple[str, str, str]] = []
    for owner in owners:
        if not isinstance(owner, dict):
            raise RuntimeInventoryError(f"current service owner is invalid: {owner!r}")
        identity = (owner.get("service"), owner.get("path"), owner.get("symbol"))
        if not all(isinstance(value, str) and value for value in identity):
            raise RuntimeInventoryError(f"current service owner is incomplete: {owner!r}")
        actual.append(identity)
    expected = set(REQUIRED_CURRENT_SERVICE_OWNERS)
    actual_set = set(actual)
    if len(actual_set) != len(actual):
        raise RuntimeInventoryError("current service-owner inventory contains a duplicate")
    if actual_set != expected:
        raise RuntimeInventoryError(
            "required current service-owner set mismatch; "
            f"missing={sorted(expected - actual_set)}; unexpected={sorted(actual_set - expected)}"
        )
    for service, relative, symbol in actual:
        if relative not in eligible_paths:
            raise RuntimeInventoryError(f"current service owner is unclassified: {service}: {relative}")
        if symbol not in (root / relative).read_text(encoding="utf-8"):
            raise RuntimeInventoryError(f"current service owner is missing {symbol}: {relative}")


def validate_repository(root: Path) -> dict[str, int]:
    root = root.resolve()
    inventory = load_json(root, INVENTORY_PATH)
    manifest = load_json(root, MANIFEST_PATH)
    if inventory.get("artifact_role") != "PUBLIC_PRESENTATION_RUNTIME_CLASSIFICATION":
        raise RuntimeInventoryError("presentation inventory role is invalid")
    semantics = inventory.get("classification_semantics") or {}
    if set(semantics) != REQUIRED_CLASSIFICATION_SEMANTICS or any(
        not isinstance(semantics[key], str) or not semantics[key].strip() for key in semantics
    ):
        raise RuntimeInventoryError("presentation classification semantics are incomplete")

    current = inventory.get("current_sources") or []
    current_by_role = {item.get("role"): item.get("path") for item in current}
    if len(current_by_role) != len(current) or any(not role or not path for role, path in current_by_role.items()):
        raise RuntimeInventoryError("current source roles must be unique and complete")
    bootstrap = (manifest.get("neutral_bootstrap") or {}).get("asset") or {}
    release_assets = (manifest.get("application") or {}).get("assets") or []
    release_by_role = {asset.get("role"): asset.get("source_path") for asset in release_assets if asset.get("role") != "evidence_image"}
    release_by_role[bootstrap.get("role")] = bootstrap.get("source_path")
    if release_by_role != current_by_role:
        raise RuntimeInventoryError(f"signed release source roles differ from the current inventory: {release_by_role}")

    archived_js = set(inventory.get("archive_reference_javascript") or [])
    archived_css = set(inventory.get("archive_reference_stylesheets") or [])
    current_paths = set(current_by_role.values())
    require_exact(files_under(root, "js/*.js"), archived_js | {path for path in current_paths if path.startswith("js/")}, "JavaScript")
    require_exact(files_under(root, "css/*.css"), archived_css | {path for path in current_paths if path.startswith("css/")}, "stylesheet")

    archive_assets = set(inventory.get("archive_reference_assets") or [])
    current_package_support = set(inventory.get("current_package_support") or [])
    classified_support = archive_assets | current_package_support
    support_actual = set()
    for pattern in ("assets/flags/*", "assets/icons/*", "legacy/*", "vendor/leaflet/**/*", "vendor/mermaid/**/*"):
        support_actual |= files_under(root, pattern)
    support_current = {path for path in current_paths if path.startswith("vendor/")}
    require_exact(support_actual, classified_support | support_current, "presentation support asset")

    build_support = set(inventory.get("build_test_support") or [])
    current_shell = set(inventory.get("current_shell_sources") or [])
    deployment_support = set(inventory.get("deployment_support") or [])
    generated = set(inventory.get("generated_current_state_files") or [])
    require_disjoint({
        "current_runtime": current_paths | current_shell | deployment_support,
        "archive_reference": archived_js | archived_css | archive_assets,
        "generated": generated,
        "build_test_support": build_support | current_package_support,
    })
    for relative in build_support:
        if not (root / relative).is_file():
            raise RuntimeInventoryError(f"classified build/test/support file is missing: {relative}")
    validate_service_owners(root, inventory, current_paths | build_support)

    for relative in [*current_paths, *current_shell, *deployment_support]:
        if not (root / relative).is_file():
            raise RuntimeInventoryError(f"classified current file is missing: {relative}")
    for relative in generated:
        if not (root / relative).is_file():
            raise RuntimeInventoryError(f"generated public file is missing: {relative}")
    for relative in inventory.get("repository_archive_roots") or []:
        if not (root / relative).is_dir():
            raise RuntimeInventoryError(f"repository archive root is missing: {relative}")

    root_index = (root / "index.html").read_text(encoding="utf-8")
    template = (root / "templates/public-index.html").read_text(encoding="utf-8")
    if root_index != template:
        raise RuntimeInventoryError("index.html differs from its reviewable template")
    script_sources = re.findall(r'<script\b[^>]*\bsrc="([^"]+)"', root_index, re.I)
    if script_sources != [bootstrap.get("path")]:
        raise RuntimeInventoryError(f"root shell must load only the signed bootstrap: {script_sources}")
    if "tile.openstreetmap.org" in root_index:
        raise RuntimeInventoryError("retired external tile permission remains in the current shell")

    current_text_paths = set(inventory.get("current_shell_sources") or []) | {
        path for path in current_paths if path.endswith((".js", ".css"))
    }
    current_text = "\n".join((root / path).read_text(encoding="utf-8") for path in sorted(current_text_paths))
    leaked = [token for token in inventory.get("retired_boot_references", []) if token in current_text]
    if leaked:
        raise RuntimeInventoryError(f"retired boot references entered current presentation sources: {leaked}")

    evidence_sources = [asset.get("source_path") for asset in release_assets if asset.get("role") == "evidence_image"]
    if any(not isinstance(path, str) or not path.startswith("assets/evidence/") for path in evidence_sources):
        raise RuntimeInventoryError("signed evidence images must originate under assets/evidence/")
    evidence_files = files_under(root, "assets/evidence/**/*")
    if evidence_files != set(evidence_sources):
        raise RuntimeInventoryError(
            f"evidence-image source accounting mismatch; referenced={sorted(evidence_sources)}; present={sorted(evidence_files)}"
        )

    return {
        "current_sources": len(current_paths),
        "archive_reference_javascript": len(archived_js),
        "archive_reference_stylesheets": len(archived_css),
        "archive_reference_assets": len(classified_support),
        "signed_release_assets": 1 + len(release_assets),
        "required_service_owners": len(REQUIRED_CURRENT_SERVICE_OWNERS),
    }


def validate_site(root: Path, site: Path, *, require_build_info: bool = False) -> tuple[int, int]:
    return check_site(root.resolve(), site.resolve(), require_build_info=require_build_info)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--site-root")
    parser.add_argument("--require-build-info", action="store_true")
    args = parser.parse_args()
    if args.require_build_info and not args.site_root:
        parser.error("--require-build-info requires --site-root")
    root = Path(args.root).resolve()
    deployed_paths: list[str] = []
    try:
        counts = validate_repository(root)
        if args.site_root:
            site = Path(args.site_root)
            if not site.is_absolute():
                site = root / site
            validate_site(root, site, require_build_info=args.require_build_info)
            deployed_paths, _ = deployed_inventory(site.resolve())
    except (OSError, ValueError, json.JSONDecodeError) as error:
        raise SystemExit(f"FAIL: {error}") from error
    site_suffix = "; closed Pages artifact verified" if args.site_root else ""
    print(
        "public-runtime inventory: PASS - "
        f"{counts['current_sources']} current sources; {counts['signed_release_assets']} signed assets; "
        f"{counts['archive_reference_javascript']} archived JS; "
        f"{counts['archive_reference_stylesheets']} archived CSS; "
        f"{counts['archive_reference_assets']} archived/support assets; "
        f"{counts['required_service_owners']} required service owners{site_suffix}"
    )
    if deployed_paths:
        print("deployed paths:")
        for relative in deployed_paths:
            print(f"- {relative}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
