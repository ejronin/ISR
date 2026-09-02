#!/usr/bin/env python3
"""Prove future local evidence images enter the signed release without frontend edits."""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_release as release  # noqa: E402


def copy(relative: str, target: Path) -> None:
    destination = target / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / relative, destination)


with tempfile.TemporaryDirectory(prefix="atlas-phase6-release-") as directory:
    target = Path(directory)
    for _, _, source_path, _ in release.ASSET_SPECS:
        copy(source_path, target)
    for relative in (
        "index.html",
        "templates/public-index.html",
        "scripts/build_public_release.py",
        "data/public-current-state.json",
    ):
        copy(relative, target)

    image_path = "assets/evidence/future-imagery-fixture.png"
    image = target / image_path
    image.parent.mkdir(parents=True, exist_ok=True)
    image.write_bytes(b"\x89PNG\r\n\x1a\nphase-6-release-fixture")
    state_path = target / "data/public-current-state.json"
    state = json.loads(state_path.read_text(encoding="utf-8"))
    state["phase6_release_fixture"] = {"imagery": {"asset_path": image_path}}
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    manifest = release.build_manifest(target)
    images = [asset for asset in manifest["application"]["assets"] if asset["role"] == "evidence_image"]
    assert len(images) == 1
    asset = images[0]
    assert asset["source_path"] == image_path
    assert asset["hash_basis"] == "BINARY_BYTES"
    assert manifest["application"]["evidence_images"] == [asset["path"]]
    assert (target / asset["path"]).read_bytes() == image.read_bytes()

print("public release evidence image: PASS - current-model local imagery is discovered, content-addressed, and authorized without frontend edits")
