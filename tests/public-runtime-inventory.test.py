#!/usr/bin/env python3
"""Regression tests for the closed current-public presentation boundary."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from assemble_public_site import SiteAssemblyError, assemble, check, normalized_relative_path  # noqa: E402
from validate_public_runtime_inventory import (  # noqa: E402
    RuntimeInventoryError,
    require_exact,
    validate_repository,
    validate_site,
)


class PublicRuntimeInventoryTests(unittest.TestCase):
    def test_unclassified_source_and_non_normalized_release_path_fail(self) -> None:
        with self.assertRaisesRegex(RuntimeInventoryError, "unclassified"):
            require_exact({"js/current.js", "js/orphan.js"}, {"js/current.js"}, "JavaScript")
        with self.assertRaisesRegex(SiteAssemblyError, "not normalized"):
            normalized_relative_path("assets/releases//orphan.js", expected_prefix="assets/releases/")

    def test_repository_and_closed_artifact(self) -> None:
        counts = validate_repository(ROOT)
        self.assertEqual(counts["current_sources"], 7)
        manifest = json.loads((ROOT / "data/public-release.json").read_text(encoding="utf-8"))
        self.assertEqual(counts["signed_release_assets"], 1 + len(manifest["application"]["assets"]))

        with tempfile.TemporaryDirectory(prefix="atlas-public-site-") as directory:
            site = Path(directory) / "site"
            assemble(ROOT, site)
            check(ROOT, site)
            validate_site(ROOT, site)
            self.assertFalse((site / "js").exists(), "mutable source JS must not be published")
            self.assertFalse((site / "css").exists(), "mutable source CSS must not be published")
            self.assertFalse((site / "vendor").exists(), "vendor source trees must not be published")
            self.assertFalse((site / "schemas").exists(), "application schemas must not be published")
            self.assertEqual(
                sorted(path.name for path in (site / "data").iterdir()),
                ["public-current-state.json", "public-release.json"],
            )

            forbidden = site / "js" / "current-update-20260827.js"
            forbidden.parent.mkdir(parents=True)
            forbidden.write_text("window.ATLAS_CURRENT_UPDATE_20260827 = {};", encoding="utf-8")
            with self.assertRaisesRegex(SiteAssemblyError, "unexpected"):
                check(ROOT, site)


if __name__ == "__main__":
    unittest.main(verbosity=2)
