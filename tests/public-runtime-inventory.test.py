#!/usr/bin/env python3
"""Regression tests for the closed current-public presentation boundary."""
from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from assemble_public_site import (  # noqa: E402
    SiteAssemblyError,
    assemble,
    check,
    ensure_source_file,
    expected_files,
    normalized_relative_path,
    validate_output_candidates,
)
from validate_public_runtime_inventory import (  # noqa: E402
    RuntimeInventoryError,
    require_disjoint,
    require_exact,
    validate_repository,
    validate_service_owners,
    validate_site,
)


SNAPSHOT = ROOT / "snapshots" / "Iran War Map 20260820.html"


class PublicRuntimeInventoryTests(unittest.TestCase):
    def test_workflows_publish_and_browse_only_the_closed_artifact(self) -> None:
        pages = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")
        validate = (ROOT / ".github/workflows/validate.yml").read_text(encoding="utf-8")
        self.assertIn("path: ./_site", pages)
        self.assertIn("assemble_public_site.py --output _site --check --require-build-info", pages)
        self.assertIn("validate_public_runtime_inventory.py --site-root _site --require-build-info", pages)
        self.assertIn("--directory _site", validate)
        for suite in (
            "browser-public-boot-smoke.js",
            "browser-public-ia-smoke.js",
            "browser-public-evidence-phase5.js",
            "browser-public-map-phase6.js",
        ):
            self.assertIn(f"ATLAS_SITE=http://127.0.0.1:8765/ node tests/{suite}", validate)

    def test_duplicate_case_and_normalization_collisions_fail(self) -> None:
        with self.assertRaisesRegex(SiteAssemblyError, "duplicate deployment output"):
            validate_output_candidates([
                ("first role", "assets/releases/asset.js", "assets/releases/"),
                ("second role", "assets/releases/asset.js", "assets/releases/"),
            ])
        with self.assertRaisesRegex(SiteAssemblyError, "case-insensitive deployment collision"):
            validate_output_candidates([
                ("first role", "assets/releases/asset.js", "assets/releases/"),
                ("second role", "assets/releases/Asset.js", "assets/releases/"),
            ])
        with self.assertRaisesRegex(SiteAssemblyError, "normalization alias"):
            validate_output_candidates([
                ("first role", "assets/releases/asset.js", "assets/releases/"),
                ("alias role", "assets/releases//asset.js", "assets/releases/"),
            ])

    def test_unclassified_source_and_service_owner_omission_fail(self) -> None:
        with self.assertRaisesRegex(RuntimeInventoryError, "unclassified"):
            require_exact({"js/current.js", "js/orphan.js"}, {"js/current.js"}, "JavaScript")
        with self.assertRaisesRegex(RuntimeInventoryError, "multiple classifications"):
            require_disjoint({"current_runtime": {"js/current.js"}, "archive_reference": {"js/current.js"}})
        inventory = json.loads((ROOT / "config/public-runtime-inventory.json").read_text(encoding="utf-8"))
        incomplete = copy.deepcopy(inventory)
        incomplete["current_service_owners"].pop()
        eligible = {item["path"] for item in incomplete["current_sources"]} | set(incomplete["build_test_support"])
        with self.assertRaisesRegex(RuntimeInventoryError, "required current service-owner set mismatch"):
            validate_service_owners(ROOT, incomplete, eligible)

    def test_traversal_and_linked_source_fail(self) -> None:
        with self.assertRaisesRegex(SiteAssemblyError, "not normalized"):
            normalized_relative_path("../outside.txt")
        with mock.patch.object(Path, "is_symlink", return_value=True):
            with self.assertRaisesRegex(SiteAssemblyError, "missing or linked"):
                ensure_source_file(ROOT, "index.html")

    def test_repository_archive_is_retained_but_not_deployed(self) -> None:
        self.assertTrue(SNAPSHOT.is_file(), "historical snapshot must remain in repository history")
        counts = validate_repository(ROOT)
        self.assertEqual(counts["current_sources"], 7)
        manifest = json.loads((ROOT / "data/public-release.json").read_text(encoding="utf-8"))
        self.assertEqual(counts["signed_release_assets"], 1 + len(manifest["application"]["assets"]))

        with tempfile.TemporaryDirectory(prefix="atlas-public-site-") as directory:
            site = Path(directory) / "site"
            assemble(ROOT, site)
            count, _ = check(ROOT, site)
            validate_site(ROOT, site)
            self.assertEqual(count, len(expected_files(ROOT, manifest)))
            self.assertFalse((site / "snapshots").exists(), "repository snapshots must not be published")
            self.assertFalse((site / "legacy").exists(), "retired applications must not be published")
            self.assertFalse((site / "js").exists(), "mutable source JS must not be published")
            self.assertFalse((site / "css").exists(), "mutable source CSS must not be published")
            self.assertFalse((site / "vendor").exists(), "vendor source trees must not be published")
            self.assertFalse((site / "schemas").exists(), "application schemas must not be published")
            self.assertEqual(
                sorted(path.name for path in (site / "data").iterdir()),
                ["public-current-state.json", "public-release.json"],
            )

            with self.assertRaisesRegex(SiteAssemblyError, "missing=.*build-info.json"):
                check(ROOT, site, require_build_info=True)
            (site / "build-info.json").write_text("{}\n", encoding="utf-8")
            count_with_identity, _ = check(ROOT, site, require_build_info=True)
            self.assertEqual(count_with_identity, len(expected_files(ROOT, manifest, include_build_info=True)))

            forbidden = site / "snapshots" / SNAPSHOT.name
            forbidden.parent.mkdir(parents=True)
            forbidden.write_text("retired application", encoding="utf-8")
            with self.assertRaisesRegex(SiteAssemblyError, "not deployable"):
                check(ROOT, site, require_build_info=True)
            forbidden.unlink()
            forbidden.parent.rmdir()

            unexpected = site / "unmanifested.txt"
            unexpected.write_text("unexpected", encoding="utf-8")
            with self.assertRaisesRegex(SiteAssemblyError, "unexpected=.*unmanifested.txt"):
                check(ROOT, site, require_build_info=True)
            unexpected.unlink()

            required = site / "index.html"
            required_bytes = required.read_bytes()
            required.unlink()
            with self.assertRaisesRegex(SiteAssemblyError, "missing=.*index.html"):
                check(ROOT, site, require_build_info=True)
            required.write_bytes(required_bytes)
            check(ROOT, site, require_build_info=True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
