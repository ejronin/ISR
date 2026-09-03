#!/usr/bin/env python3
"""Build the deterministic content-addressed public release manifest and assets."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import posixpath
import re
import zlib
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = "data/public-release.json"
CURRENT_STATE_PATH = "data/public-current-state.json"
PUBLIC_SHELL_SOURCE = "templates/public-index.html"
APPLICATION_VERSION = "atlas-public-shell-v1"
BOOTSTRAP_PROTOCOL = "atlas-release-bootstrap-v1"
SCHEMA_VERSION = "1.0"
GENERATOR_VERSION = "1.3"
EVIDENCE_MEDIA_ROOT = "assets/evidence"
SUPPORTED_EVIDENCE_IMAGE_EXTENSIONS = {
    ".png": "png",
    ".jpg": "jpeg",
    ".jpeg": "jpeg",
    ".webp": "webp",
}
ASSET_SPECS = (
    ("bootstrap", "public-bootstrap", "js/public-bootstrap.js", "js"),
    ("map_runtime", "leaflet", "vendor/leaflet/leaflet.js", "js"),
    ("page_registry", "public-ia", "js/public-ia.js", "js"),
    ("map_stylesheet", "leaflet", "vendor/leaflet/leaflet.css", "css"),
    ("stylesheet", "public-shell", "css/public-shell.css", "css"),
    ("reference_geography", "atlas-reference-geography", "assets/geography/atlas-reference-geography.geojson", "geojson"),
    ("entrypoint", "public-app", "js/public-app.js", "js"),
)


def canonical_text_bytes(path: Path) -> bytes:
    text = path.read_text(encoding="utf-8")
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sri_sha256(data: bytes) -> str:
    return "sha256-" + base64.b64encode(hashlib.sha256(data).digest()).decode("ascii")


def stable_json_bytes(payload: dict[str, Any]) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


class EvidenceImagePublicationError(ValueError):
    """An evidence-image reference cannot cross the signed-release boundary."""


def materialize_asset(root: Path, role: str, name: str, source_path: str, extension: str) -> dict[str, Any]:
    source = root / source_path
    if not source.is_file():
        raise FileNotFoundError(f"Public application source asset is missing: {source_path}")
    data = canonical_text_bytes(source)
    digest = sha256(data)
    relative_path = f"assets/releases/{name}.{digest}.{extension}"
    output = root / relative_path
    output.parent.mkdir(parents=True, exist_ok=True)
    if not output.is_file() or output.read_bytes() != data:
        output.write_bytes(data)
    return {
        "role": role,
        "name": name,
        "source_path": source_path,
        "path": relative_path,
        "sha256": digest,
        "integrity": sri_sha256(data),
        "bytes": len(data),
        "hash_basis": "UTF8_LF_NORMALIZED",
    }


def normalize_evidence_image_reference(value: str) -> str:
    """Return one repository-relative POSIX path or reject the reference."""
    if not value or value != value.strip() or "\0" in value:
        raise EvidenceImagePublicationError("Evidence image path is empty or contains unsafe whitespace/null bytes")
    candidate = value.replace("\\", "/")
    windows_path = PureWindowsPath(value)
    if windows_path.is_absolute() or windows_path.drive or candidate.startswith(("/", "//")):
        raise EvidenceImagePublicationError(f"Evidence image path must not be absolute: {value}")
    parsed = urlsplit(candidate)
    if parsed.scheme or parsed.netloc:
        raise EvidenceImagePublicationError(f"Evidence image path must be local and relative: {value}")
    if parsed.query or parsed.fragment:
        raise EvidenceImagePublicationError(f"Evidence image path must not contain a query or fragment: {value}")

    normalized = posixpath.normpath(candidate)
    parts = PurePosixPath(normalized).parts
    if normalized in {"", "."} or ".." in parts:
        raise EvidenceImagePublicationError(f"Evidence image path escapes its approved root: {value}")
    approved_prefix = f"{EVIDENCE_MEDIA_ROOT}/"
    if not normalized.startswith(approved_prefix):
        raise EvidenceImagePublicationError(
            f"Evidence image path is outside the approved {EVIDENCE_MEDIA_ROOT}/ root: {value}"
        )
    if PurePosixPath(normalized).suffix.lower() not in SUPPORTED_EVIDENCE_IMAGE_EXTENSIONS:
        raise EvidenceImagePublicationError(f"Evidence image format is unsupported: {value}")
    return normalized


def discover_evidence_images(payload: Any) -> list[str]:
    """Discover only referenced media; path security is applied before publication."""
    discovered: dict[str, str] = {}
    casefolded: dict[str, str] = {}
    image_keys = {"image_url", "thumbnail_url", "asset_path"}

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key in image_keys and isinstance(child, str):
                    normalized = normalize_evidence_image_reference(child)
                    collision_key = normalized.casefold()
                    prior = casefolded.get(collision_key)
                    if prior is not None and prior != normalized:
                        raise EvidenceImagePublicationError(
                            f"Evidence image path case collision is unsafe: {prior} and {normalized}"
                        )
                    casefolded[collision_key] = normalized
                    discovered.setdefault(normalized, child)
                else:
                    visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(payload)
    return sorted(discovered)


def resolve_evidence_image(root: Path, source_path: str) -> Path:
    """Resolve a referenced image and prove it remains inside the approved real path."""
    repository_root = root.resolve(strict=True)
    approved_lexical = repository_root.joinpath(*PurePosixPath(EVIDENCE_MEDIA_ROOT).parts)
    try:
        approved_root = approved_lexical.resolve(strict=True)
    except FileNotFoundError as error:
        raise FileNotFoundError(f"Approved evidence-media root is missing: {EVIDENCE_MEDIA_ROOT}") from error
    try:
        approved_root.relative_to(repository_root)
    except ValueError as error:
        raise EvidenceImagePublicationError(
            f"Approved evidence-media root resolves outside the repository: {EVIDENCE_MEDIA_ROOT}"
        ) from error

    lexical = repository_root.joinpath(*PurePosixPath(source_path).parts)
    try:
        resolved = lexical.resolve(strict=True)
    except FileNotFoundError as error:
        raise FileNotFoundError(f"Public evidence image is missing: {source_path}") from error
    try:
        resolved.relative_to(approved_root)
    except ValueError as error:
        raise EvidenceImagePublicationError(
            f"Evidence image resolves outside the approved {EVIDENCE_MEDIA_ROOT}/ root: {source_path}"
        ) from error
    if not resolved.is_file():
        raise FileNotFoundError(f"Public evidence image is not a file: {source_path}")
    return resolved


def valid_png(data: bytes) -> bool:
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return False
    offset = 8
    saw_header = saw_data = saw_end = False
    while offset + 12 <= len(data):
        length = int.from_bytes(data[offset:offset + 4], "big")
        chunk_type = data[offset + 4:offset + 8]
        chunk_end = offset + 12 + length
        if chunk_end > len(data):
            return False
        payload = data[offset + 8:offset + 8 + length]
        expected_crc = int.from_bytes(data[offset + 8 + length:chunk_end], "big")
        if zlib.crc32(chunk_type + payload) & 0xFFFFFFFF != expected_crc:
            return False
        if not saw_header:
            if chunk_type != b"IHDR" or length != 13:
                return False
            saw_header = True
        elif chunk_type == b"IHDR":
            return False
        if chunk_type == b"IDAT":
            saw_data = True
        if chunk_type == b"IEND":
            saw_end = length == 0
            return saw_header and saw_data and saw_end and chunk_end == len(data)
        offset = chunk_end
    return False


def valid_jpeg(data: bytes) -> bool:
    if len(data) < 8 or not data.startswith(b"\xff\xd8") or not data.endswith(b"\xff\xd9"):
        return False
    offset = 2
    saw_frame = False
    frame_markers = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
    while offset < len(data) - 2:
        if data[offset] != 0xFF:
            return False
        while offset < len(data) and data[offset] == 0xFF:
            offset += 1
        if offset >= len(data):
            return False
        marker = data[offset]
        offset += 1
        if marker == 0xDA:
            if offset + 2 > len(data):
                return False
            length = int.from_bytes(data[offset:offset + 2], "big")
            return saw_frame and length >= 2 and offset + length <= len(data) - 2
        if marker in {0x01, *range(0xD0, 0xD8)}:
            continue
        if marker == 0xD9 or offset + 2 > len(data):
            return False
        length = int.from_bytes(data[offset:offset + 2], "big")
        if length < 2 or offset + length > len(data):
            return False
        if marker in frame_markers:
            saw_frame = True
        offset += length
    return False


def valid_webp(data: bytes) -> bool:
    if len(data) < 20 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return False
    if int.from_bytes(data[4:8], "little") + 8 != len(data):
        return False
    offset = 12
    saw_image_chunk = False
    while offset + 8 <= len(data):
        chunk_type = data[offset:offset + 4]
        length = int.from_bytes(data[offset + 4:offset + 8], "little")
        chunk_end = offset + 8 + length
        if chunk_end > len(data):
            return False
        if chunk_type in {b"VP8 ", b"VP8L", b"VP8X"}:
            saw_image_chunk = True
        offset = chunk_end + (length % 2)
    return saw_image_chunk and offset == len(data)


def validate_image_content(source_path: str, data: bytes) -> str:
    detected = None
    for image_type, validator in (("png", valid_png), ("jpeg", valid_jpeg), ("webp", valid_webp)):
        if validator(data):
            detected = image_type
            break
    if detected is None:
        raise EvidenceImagePublicationError(f"Evidence image bytes are not a supported image: {source_path}")
    expected = SUPPORTED_EVIDENCE_IMAGE_EXTENSIONS[PurePosixPath(source_path).suffix.lower()]
    if detected != expected:
        raise EvidenceImagePublicationError(
            f"Evidence image extension/content mismatch for {source_path}: expected {expected}, detected {detected}"
        )
    return detected


def prepare_evidence_images(root: Path, payload: Any) -> list[tuple[str, Path, bytes, str]]:
    prepared: list[tuple[str, Path, bytes, str]] = []
    resolved_identities: dict[str, str] = {}
    for source_path in discover_evidence_images(payload):
        source = resolve_evidence_image(root, source_path)
        identity = str(source).casefold()
        prior = resolved_identities.get(identity)
        if prior is not None and prior != source_path:
            raise EvidenceImagePublicationError(
                f"Distinct evidence image paths resolve to one file: {prior} and {source_path}"
            )
        resolved_identities[identity] = source_path
        data = source.read_bytes()
        image_type = validate_image_content(source_path, data)
        prepared.append((source_path, source, data, image_type))
    return prepared


def materialize_binary_image(prepared: tuple[str, Path, bytes, str], root: Path, index: int) -> dict[str, Any]:
    source_path, source, data, image_type = prepared
    digest = sha256(data)
    extension = "jpg" if image_type == "jpeg" else image_type
    safe_stem = re.sub(r"[^a-z0-9-]+", "-", source.stem.lower()).strip("-") or "image"
    name = f"evidence-image-{index:03d}-{safe_stem}"
    relative_path = f"assets/releases/{name}.{digest}.{extension}"
    output = root / relative_path
    output.parent.mkdir(parents=True, exist_ok=True)
    if not output.is_file() or output.read_bytes() != data:
        output.write_bytes(data)
    return {
        "role": "evidence_image",
        "name": name,
        "source_path": source_path,
        "path": relative_path,
        "sha256": digest,
        "integrity": sri_sha256(data),
        "bytes": len(data),
        "hash_basis": "BINARY_BYTES",
    }


def validate_source_versions(root: Path) -> str:
    entry = canonical_text_bytes(root / "js/public-app.js").decode("utf-8")
    bootstrap = canonical_text_bytes(root / "js/public-bootstrap.js").decode("utf-8")
    entry_match = re.search(r"const APPLICATION_VERSION = '([^']+)';", entry)
    bootstrap_app_match = re.search(r"const APPLICATION_VERSION = '([^']+)';", bootstrap)
    protocol_match = re.search(r"const BOOTSTRAP_PROTOCOL = '([^']+)';", bootstrap)
    if not entry_match or not bootstrap_app_match or not protocol_match:
        raise ValueError("Public application/bootstrap version constants are missing")
    if entry_match.group(1) != APPLICATION_VERSION or bootstrap_app_match.group(1) != APPLICATION_VERSION:
        raise ValueError(f"Public application version must be {APPLICATION_VERSION}")
    if protocol_match.group(1) != BOOTSTRAP_PROTOCOL:
        raise ValueError(f"Bootstrap protocol must be {BOOTSTRAP_PROTOCOL}")
    return APPLICATION_VERSION


def validate_document_shell(root: Path, bootstrap_asset: dict[str, Any]) -> None:
    document = canonical_text_bytes(root / "index.html").decode("utf-8")
    source_document = canonical_text_bytes(root / PUBLIC_SHELL_SOURCE).decode("utf-8")
    if document != source_document:
        raise ValueError(f"index.html differs from its review source: {PUBLIC_SHELL_SOURCE}")
    expected = (
        f'src="{bootstrap_asset["path"]}" integrity="{bootstrap_asset["integrity"]}" '
        f'crossorigin="anonymous" data-bootstrap-sha256="{bootstrap_asset["sha256"]}"'
    )
    if expected not in document:
        raise ValueError("Document shell does not bind the exact content-addressed bootstrap asset")
    if re.search(r'<script\b[^>]*\bsrc="js/public-app\.js', document, re.I):
        raise ValueError("Document shell must not execute the mutable application source directly")
    if re.search(r'<link\b[^>]*\bhref="css/public-shell\.css', document, re.I):
        raise ValueError("Document shell must not activate the mutable stylesheet source directly")


def build_manifest(root: Path = ROOT) -> dict[str, Any]:
    root = root.resolve()
    version = validate_source_versions(root)
    asset_records = [materialize_asset(root, *spec) for spec in ASSET_SPECS]
    assets_by_role = {asset["role"]: asset for asset in asset_records}
    validate_document_shell(root, assets_by_role["bootstrap"])

    state_path = root / CURRENT_STATE_PATH
    if not state_path.is_file():
        raise FileNotFoundError(f"Generated current-state artifact is missing: {CURRENT_STATE_PATH}")
    state_bytes = canonical_text_bytes(state_path)
    state = json.loads(state_bytes.decode("utf-8"))
    release = state.get("release") or {}
    if state.get("artifact_role") != "DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL":
        raise ValueError("Current-state artifact role is invalid")

    prepared_images = prepare_evidence_images(root, state)
    evidence_images = [materialize_binary_image(item, root, index + 1) for index, item in enumerate(prepared_images)]
    application_assets = [
        assets_by_role["map_runtime"],
        assets_by_role["page_registry"],
        assets_by_role["map_stylesheet"],
        assets_by_role["stylesheet"],
        assets_by_role["reference_geography"],
        assets_by_role["entrypoint"],
        *evidence_images,
    ]
    asset_set_material = "".join(
        f"{item['role']}\0{item['path']}\0{item['sha256']}\n"
        for item in sorted(application_assets, key=lambda row: (row["role"], row["source_path"], row["path"]))
    ).encode("utf-8")
    asset_set_sha256 = sha256(asset_set_material)
    release_material = (
        f"{BOOTSTRAP_PROTOCOL}\0{assets_by_role['bootstrap']['sha256']}\0{version}\0"
        f"{asset_set_sha256}\0{sha256(state_bytes)}\0{release.get('release_identity', '')}\n"
    ).encode("utf-8")
    release_set_sha256 = sha256(release_material)
    generator_path = "scripts/build_public_release.py"
    generator_bytes = canonical_text_bytes(root / generator_path)

    return {
        "schema_version": SCHEMA_VERSION,
        "artifact_role": "PUBLIC_APPLICATION_RELEASE_MANIFEST",
        "release_identity": f"public-release-v1-{release_set_sha256[:16]}",
        "release_set_sha256": release_set_sha256,
        "generated_timestamp_included": False,
        "generator": {
            "version": GENERATOR_VERSION,
            "path": generator_path,
            "sha256": sha256(generator_bytes),
        },
        "neutral_bootstrap": {
            "protocol": BOOTSTRAP_PROTOCOL,
            "asset": assets_by_role["bootstrap"],
        },
        "application": {
            "version": version,
            "runtime": [assets_by_role["map_runtime"]["path"], assets_by_role["page_registry"]["path"]],
            "entrypoint": assets_by_role["entrypoint"]["path"],
            "stylesheet": assets_by_role["stylesheet"]["path"],
            "stylesheets": [assets_by_role["map_stylesheet"]["path"], assets_by_role["stylesheet"]["path"]],
            "reference_geography": assets_by_role["reference_geography"]["path"],
            "evidence_images": [asset["path"] for asset in evidence_images],
            "asset_set_sha256": asset_set_sha256,
            "assets": application_assets,
        },
        "current_state": {
            "path": CURRENT_STATE_PATH,
            "schema_version": state.get("schema_version"),
            "release_identity": release.get("release_identity"),
            "input_set_sha256": release.get("input_set_sha256"),
            "current_osint_cutoff": release.get("current_osint_cutoff"),
            "sha256": sha256(state_bytes),
            "bytes": len(state_bytes),
            "hash_basis": "UTF8_LF_NORMALIZED",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    output = root / args.output
    payload = stable_json_bytes(build_manifest(root))
    if args.check:
        if not output.is_file():
            raise SystemExit(f"FAIL: generated public release manifest is missing: {args.output}")
        if output.read_bytes() != payload:
            raise SystemExit(f"FAIL: generated public release manifest is stale: {args.output}")
        print(f"public-release: PASS - {args.output} and content-addressed assets are current")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(payload)
    manifest = json.loads(payload)
    print(
        "public-release: wrote "
        f"{args.output} ({manifest['release_identity']}; "
        f"model {manifest['current_state']['bytes']} bytes)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
