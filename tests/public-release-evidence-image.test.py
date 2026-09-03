#!/usr/bin/env python3
"""Exercise the real signed-release evidence-image publication boundary."""
from __future__ import annotations

import base64
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_release as release  # noqa: E402


def copy(relative: str, target: Path) -> None:
    destination = target / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / relative, destination)


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)


def valid_png() -> bytes:
    header = struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)
    pixels = zlib.compress(b"\x00\x00\x00\x00\xff")
    return b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", header) + png_chunk(b"IDAT", pixels) + png_chunk(b"IEND", b"")


def valid_jpeg() -> bytes:
    return base64.b64decode(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////"
        "2wBDAf//////////////////////////////////////////////////////////////////////////////////////"
        "wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/"
        "9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAA"
        "AAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAA"
        "AP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAA"
        "AAAAAAAAAAAAAAAA/9oACAEDAQE/EB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EB//xAAUEAEAAAAAAAAA"
        "AAAAAAAAAAAA/9oACAEBAAE/EB//2Q=="
    )


def valid_webp() -> bytes:
    payload = b"\x2f\x00\x00\x00\x00"
    chunk = b"VP8L" + struct.pack("<I", len(payload)) + payload + b"\x00"
    return b"RIFF" + struct.pack("<I", 4 + len(chunk)) + b"WEBP" + chunk


@contextmanager
def workspace() -> Iterator[Path]:
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
        yield target


def write_file(target: Path, relative: str, data: bytes) -> Path:
    output = target.joinpath(*relative.replace("\\", "/").split("/"))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(data)
    return output


def set_references(target: Path, references: list[str]) -> None:
    state_path = target / "data/public-current-state.json"
    state = json.loads(state_path.read_text(encoding="utf-8"))
    state["phase6_release_fixture"] = {
        "imagery": [
            {"imagery_type": "Signed-release security fixture", "asset_path": reference}
            for reference in references
        ]
    }
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def evidence_assets(manifest: dict) -> list[dict]:
    return [asset for asset in manifest["application"]["assets"] if asset["role"] == "evidence_image"]


def expect_failure(target: Path, references: list[str], expected: str) -> None:
    set_references(target, references)
    try:
        release.build_manifest(target)
    except (release.EvidenceImagePublicationError, FileNotFoundError) as error:
        assert expected.lower() in str(error).lower(), (expected, str(error))
    else:
        raise AssertionError(f"unsafe evidence-image case unexpectedly passed: {references}")


# A valid referenced image is signed; an unreferenced peer is not.
with workspace() as target:
    image_path = "assets/evidence/example.png"
    unused_path = "assets/evidence/unreferenced.png"
    image = write_file(target, image_path, valid_png())
    write_file(target, unused_path, valid_png())
    set_references(target, [image_path])
    manifest = release.build_manifest(target)
    images = evidence_assets(manifest)
    assert len(images) == 1
    assert images[0]["source_path"] == image_path
    assert images[0]["hash_basis"] == "BINARY_BYTES"
    assert manifest["application"]["evidence_images"] == [images[0]["path"]]
    assert (target / images[0]["path"]).read_bytes() == image.read_bytes()
    assert all(asset["source_path"] != unused_path for asset in images)

# Every documented supported format crosses the same production gate.
with workspace() as target:
    references = ["assets/evidence/example.png", "assets/evidence/example.jpg", "assets/evidence/example.webp"]
    for reference, content in zip(references, (valid_png(), valid_jpeg(), valid_webp()), strict=True):
        write_file(target, reference, content)
    set_references(target, references)
    assert [asset["source_path"] for asset in evidence_assets(release.build_manifest(target))] == sorted(references)

# Valid image bytes outside the sole publication root fail instead of being signed.
for outside_path in ("docs/unrelated.png", "scripts/foo.jpg"):
    with workspace() as target:
        write_file(target, outside_path, valid_png())
        expect_failure(target, [outside_path], "outside the approved")

# Absolute paths and both direct and normalized traversal attempts fail.
with workspace() as target:
    absolute = write_file(target, "assets/evidence/example.png", valid_png()).resolve()
    expect_failure(target, [str(absolute)], "must not be absolute")
with workspace() as target:
    write_file(target, "assets/outside.png", valid_png())
    expect_failure(target, ["assets/evidence/../outside.png"], "outside the approved")
with workspace() as target:
    write_file(target, "docs/unrelated.png", valid_png())
    expect_failure(target, ["assets/evidence/nested/../..\\docs/unrelated.png"], "outside the approved")

# A syntactically in-root symlink/junction that resolves outside the root fails closed.
with workspace() as target:
    outside = write_file(target, "outside/escape.png", valid_png())
    link = target / "assets/evidence/escape.png"
    link.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.symlink(outside, link)
        reference = "assets/evidence/escape.png"
    except OSError:
        if os.name != "nt":
            raise
        outside_directory = outside.parent
        link_directory = target / "assets/evidence/escape"
        result = subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(link_directory), str(outside_directory)],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode:
            raise AssertionError(f"could not create the required symlink-escape fixture: {result.stderr or result.stdout}")
        reference = "assets/evidence/escape/escape.png"
    expect_failure(target, [reference], "resolves outside")

# Missing, content-invalid, extension-mismatched, and unsupported references fail.
with workspace() as target:
    (target / "assets/evidence").mkdir(parents=True, exist_ok=True)
    expect_failure(target, ["assets/evidence/missing.png"], "missing")
with workspace() as target:
    write_file(target, "assets/evidence/not-image.png", b"<script>not an image</script>")
    expect_failure(target, ["assets/evidence/not-image.png"], "not a supported image")
with workspace() as target:
    write_file(target, "assets/evidence/wrong.jpg", valid_png())
    expect_failure(target, ["assets/evidence/wrong.jpg"], "extension/content mismatch")
with workspace() as target:
    write_file(target, "assets/evidence/unsupported.gif", b"GIF89a")
    expect_failure(target, ["assets/evidence/unsupported.gif"], "unsupported")

# Duplicate and equivalent normalized references produce one deterministic identity.
with workspace() as target:
    canonical = "assets/evidence/example.png"
    write_file(target, canonical, valid_png())
    set_references(target, [canonical, canonical, "assets/evidence/./nested/../example.png"])
    first = release.build_manifest(target)
    second = release.build_manifest(target)
    assert first == second
    assert [asset["source_path"] for asset in evidence_assets(first)] == [canonical]

# Case-only identities are rejected consistently, including on case-sensitive hosts.
with workspace() as target:
    write_file(target, "assets/evidence/Example.png", valid_png())
    expect_failure(
        target,
        ["assets/evidence/Example.png", "assets/evidence/example.png"],
        "case collision",
    )

print(
    "public release evidence image: PASS - approved-root containment, symlink escape, "
    "content signatures, reference-only publication, missing assets, duplicates, and collisions verified"
)
