#!/usr/bin/env python3
"""Build the deterministic content-addressed public release manifest and assets."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import posixpath
import re
import warnings
import xml.etree.ElementTree as ET
from io import BytesIO
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any
from urllib.parse import urlsplit

import PIL
from PIL import Image, UnidentifiedImageError


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = "data/public-release.json"
CURRENT_STATE_PATH = "data/public-current-state.json"
PUBLIC_SHELL_SOURCE = "templates/public-index.html"
APPLICATION_VERSION = "atlas-public-shell-v1"
BOOTSTRAP_PROTOCOL = "atlas-release-bootstrap-v1"
SCHEMA_VERSION = "1.0"
GENERATOR_VERSION = "1.4"
REQUIRED_PILLOW_VERSION = "12.3.0"
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
FLAG_ASSET_SPECS = (
    ("ae", "United Arab Emirates"), ("au", "Australia"), ("bd", "Bangladesh"), ("bg", "Bulgaria"),
    ("bh", "Bahrain"), ("cn", "China"), ("dj", "Djibouti"), ("eg", "Egypt"), ("fr", "France"),
    ("gb", "United Kingdom"), ("il", "Israel"), ("in", "India"), ("iq", "Iraq"), ("ir", "Iran"),
    ("jo", "Jordan"), ("jp", "Japan"), ("kw", "Kuwait"), ("lb", "Lebanon"), ("ng", "Nigeria"),
    ("om", "Oman"), ("pk", "Pakistan"), ("qa", "Qatar"), ("ru", "Russia"), ("sa", "Saudi Arabia"),
    ("sd", "Sudan"), ("so", "Somalia"), ("sy", "Syria"), ("tr", "Türkiye"), ("us", "United States"),
    ("ye", "Yemen"),
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


if PIL.__version__ != REQUIRED_PILLOW_VERSION:
    raise RuntimeError(
        f"Public release image validation requires Pillow {REQUIRED_PILLOW_VERSION}; found {PIL.__version__}"
    )


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


def validate_flag_svg(source_path: str, data: bytes) -> None:
    """Reject executable or externally referential SVG before publication."""
    if not re.fullmatch(r"assets/flags/[a-z]{2}\.svg", source_path):
        raise ValueError(f"State flag is outside the closed allowlist path: {source_path}")
    if len(data) > 65536:
        raise ValueError(f"State flag exceeds the 64 KiB presentation limit: {source_path}")
    text = data.decode("utf-8")
    lowered = text.lower()
    if "<!doctype" in lowered or "<!entity" in lowered:
        raise ValueError(f"State flag contains a forbidden document declaration: {source_path}")
    try:
        root = ET.fromstring(text)
    except ET.ParseError as error:
        raise ValueError(f"State flag is malformed XML: {source_path}: {error}") from error
    if root.tag.rsplit("}", 1)[-1].lower() != "svg":
        raise ValueError(f"State flag root is not SVG: {source_path}")
    forbidden_tags = {"script", "foreignobject", "iframe", "object", "embed", "audio", "video", "animate", "animatemotion", "animatetransform", "set"}
    for node in root.iter():
        if node.tag.rsplit("}", 1)[-1].lower() in forbidden_tags:
            raise ValueError(f"State flag contains active content: {source_path}")
        for raw_name, raw_value in node.attrib.items():
            name = raw_name.rsplit("}", 1)[-1].lower()
            value = str(raw_value).strip().lower()
            if name.startswith("on"):
                raise ValueError(f"State flag contains an event-handler attribute: {source_path}")
            if name in {"href", "src"} and value and not value.startswith("#"):
                raise ValueError(f"State flag contains an external resource reference: {source_path}")
            if "url(" in value or "javascript:" in value or "data:" in value or "@import" in value or "expression(" in value:
                raise ValueError(f"State flag contains an unsafe resource expression: {source_path}")


def materialize_state_flag(root: Path, code: str, label: str) -> dict[str, Any]:
    source_path = f"assets/flags/{code}.svg"
    data = canonical_text_bytes(root / source_path)
    validate_flag_svg(source_path, data)
    record = materialize_asset(root, "state_flag", f"state-flag-{code}", source_path, "svg")
    record.update({"code": code, "label": label})
    return record


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


def validate_image_content(source_path: str, data: bytes) -> str:
    """Verify structure, then reopen and force full pixel-data decoding."""
    expected = SUPPORTED_EVIDENCE_IMAGE_EXTENSIONS[PurePosixPath(source_path).suffix.lower()]
    supported_formats = {"PNG": "png", "JPEG": "jpeg", "WEBP": "webp"}
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                detected = supported_formats.get(image.format or "")
                width, height = image.size
                if detected is None:
                    raise EvidenceImagePublicationError(
                        f"Evidence image format is unsupported after decode: {source_path}"
                    )
                if detected != expected:
                    raise EvidenceImagePublicationError(
                        f"Evidence image extension/content mismatch for {source_path}: "
                        f"expected {expected}, detected {detected}"
                    )
                if width <= 0 or height <= 0:
                    raise EvidenceImagePublicationError(
                        f"Evidence image dimensions must be positive for {source_path}: {width}x{height}"
                    )
                image.verify()

            # verify() checks container structure but intentionally does not decode
            # pixels. Reopen and load every pixel so corrupt compressed payloads fail.
            with Image.open(BytesIO(data)) as image:
                decoded = supported_formats.get(image.format or "")
                if decoded != detected or image.size != (width, height):
                    raise EvidenceImagePublicationError(
                        f"Evidence image identity changed during decode: {source_path}"
                    )
                image.load()
    except EvidenceImagePublicationError:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning, UnidentifiedImageError, OSError, SyntaxError, ValueError) as error:
        raise EvidenceImagePublicationError(
            f"Evidence image is malformed or undecodable: {source_path}: {error}"
        ) from error
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
    state_flags = [materialize_state_flag(root, code, label) for code, label in FLAG_ASSET_SPECS]
    application_assets = [
        assets_by_role["map_runtime"],
        assets_by_role["page_registry"],
        assets_by_role["map_stylesheet"],
        assets_by_role["stylesheet"],
        assets_by_role["reference_geography"],
        assets_by_role["entrypoint"],
        *state_flags,
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
            "state_flags": state_flags,
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
