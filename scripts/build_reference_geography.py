#!/usr/bin/env python3
"""Build the deterministic regional Natural Earth reference geography asset.

This is a development-time preprocessor. Production serves only the checked-in,
content-addressed output and never downloads Natural Earth at runtime.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any, Callable
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = "assets/geography/atlas-reference-geography.geojson"
NATURAL_EARTH_VERSION = "5.1.1"
SOURCE_50M = {
    "url": "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_50m_admin_0_countries.geojson",
    "sha256": "3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb",
}
SOURCE_10M = {
    "url": "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson",
    "sha256": "239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255",
}
SOURCE_FILENAMES = {
    "1:50m": "ne_50m_admin_0_countries.v5.1.1.geojson",
    "1:10m": "ne_10m_admin_0_countries.v5.1.1.geojson",
}
REGIONAL_COUNTRIES = {
    "Afghanistan", "Bahrain", "Bangladesh", "China", "Djibouti", "Egypt", "Eritrea",
    "Iran", "Iraq", "Israel", "Jordan", "Kazakhstan", "Kuwait", "Lebanon", "Nigeria",
    "Oman", "Pakistan", "Qatar", "Russia", "Saudi Arabia", "Somalia", "Sudan", "Syria",
    "Turkey", "Turkmenistan", "United Arab Emirates", "Yemen",
}
HORMUZ_COUNTRIES = {"Bahrain", "Iran", "Oman", "Qatar", "Saudi Arabia", "United Arab Emirates"}
REGIONAL_BBOX = [2.0, -2.0, 110.0, 57.0]
HORMUZ_BBOX = [50.8, 22.4, 60.8, 28.9]
REFERENCE_LABELS = [
    {"label": "Iran", "lat": 32.4, "lon": 53.7, "kind": "country"},
    {"label": "Iraq", "lat": 33.0, "lon": 43.7, "kind": "country"},
    {"label": "Kuwait", "lat": 29.4, "lon": 47.5, "kind": "country"},
    {"label": "Saudi Arabia", "lat": 24.2, "lon": 45.0, "kind": "country"},
    {"label": "Bahrain", "lat": 26.05, "lon": 50.55, "kind": "country"},
    {"label": "Qatar", "lat": 25.35, "lon": 51.18, "kind": "country"},
    {"label": "United Arab Emirates", "lat": 24.2, "lon": 54.4, "kind": "country"},
    {"label": "Oman", "lat": 22.8, "lon": 57.6, "kind": "country"},
    {"label": "Pakistan", "lat": 29.4, "lon": 65.0, "kind": "country"},
    {"label": "Yemen", "lat": 15.8, "lon": 47.5, "kind": "country"},
    {"label": "Israel / Palestinian territories", "lat": 31.7, "lon": 35.1, "kind": "country"},
    {"label": "Egypt", "lat": 27.0, "lon": 30.8, "kind": "country"},
    {"label": "Suez", "lat": 29.97, "lon": 32.55, "kind": "water"},
    {"label": "Bab el-Mandeb", "lat": 12.58, "lon": 43.33, "kind": "water"},
    {"label": "Persian Gulf", "lat": 26.3, "lon": 52.3, "kind": "water"},
    {"label": "Strait of Hormuz", "lat": 26.55, "lon": 56.25, "kind": "water"},
    {"label": "Gulf of Oman", "lat": 24.5, "lon": 58.5, "kind": "water"},
    {"label": "Red Sea", "lat": 20.0, "lon": 38.7, "kind": "water"},
]


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def verify_source_bytes(raw: bytes, expected: dict[str, str], label: str) -> None:
    digest = sha256_bytes(raw)
    if digest != expected["sha256"]:
        raise ValueError(
            f"Natural Earth {label} source hash mismatch: expected {expected['sha256']}, got {digest}"
        )


def read_source(path: Path, expected: dict[str, str]) -> dict[str, Any]:
    raw = path.read_bytes()
    verify_source_bytes(raw, expected, str(path))
    payload = json.loads(raw.decode("utf-8"))
    if payload.get("type") != "FeatureCollection":
        raise ValueError(f"Natural Earth source is not a FeatureCollection: {path}")
    return payload


def obtain_pinned_source(directory: Path, label: str, expected: dict[str, str]) -> Path:
    """Fetch one exact versioned input, or validate an existing closed cache."""
    destination = directory / SOURCE_FILENAMES[label]
    if destination.exists():
        raw = destination.read_bytes()
        verify_source_bytes(raw, expected, label)
        return destination
    request = Request(expected["url"], headers={"User-Agent": "ISR-reference-geography-builder/1.0"})
    with urlopen(request, timeout=120) as response:
        raw = response.read()
    verify_source_bytes(raw, expected, label)
    directory.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(raw)
    return destination


def intersect(a: list[float], b: list[float], axis: int, bound: float) -> list[float]:
    delta = b[axis] - a[axis]
    ratio = 0.0 if delta == 0 else (bound - a[axis]) / delta
    return [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio]


def clip_edge(points: list[list[float]], inside: Callable[[list[float]], bool], axis: int, bound: float) -> list[list[float]]:
    if not points:
        return []
    output: list[list[float]] = []
    previous = points[-1]
    previous_inside = inside(previous)
    for current in points:
        current_inside = inside(current)
        if current_inside != previous_inside:
            output.append(intersect(previous, current, axis, bound))
        if current_inside:
            output.append(current)
        previous = current
        previous_inside = current_inside
    return output


def clip_ring(ring: list[list[float]], bbox: list[float]) -> list[list[float]]:
    min_lon, min_lat, max_lon, max_lat = bbox
    points = [list(point[:2]) for point in ring]
    if points and points[0] == points[-1]:
        points.pop()
    for inside, axis, bound in (
        (lambda point: point[0] >= min_lon, 0, min_lon),
        (lambda point: point[0] <= max_lon, 0, max_lon),
        (lambda point: point[1] >= min_lat, 1, min_lat),
        (lambda point: point[1] <= max_lat, 1, max_lat),
    ):
        points = clip_edge(points, inside, axis, bound)
    if len(points) < 3:
        return []
    points.append(points[0])
    return [[round(point[0], 5), round(point[1], 5)] for point in points]


def rounded_ring(ring: list[list[float]], digits: int = 4) -> list[list[float]]:
    output: list[list[float]] = []
    for point in ring:
        rounded = [round(point[0], digits), round(point[1], digits)]
        if not output or rounded != output[-1]:
            output.append(rounded)
    if output and output[0] != output[-1]:
        output.append(output[0])
    return output if len(output) >= 4 else []


def transform_geometry(geometry: dict[str, Any], clip_bbox: list[float] | None) -> dict[str, Any] | None:
    geometry_type = geometry.get("type")
    raw_polygons = [geometry.get("coordinates") or []] if geometry_type == "Polygon" else geometry.get("coordinates") or []
    if geometry_type not in {"Polygon", "MultiPolygon"}:
        return None
    polygons: list[list[list[list[float]]]] = []
    for polygon in raw_polygons:
        rings: list[list[list[float]]] = []
        for ring in polygon:
            result = clip_ring(ring, clip_bbox) if clip_bbox else rounded_ring(ring)
            if result:
                rings.append(result)
        if rings:
            polygons.append(rings)
    if not polygons:
        return None
    if len(polygons) == 1:
        return {"type": "Polygon", "coordinates": polygons[0]}
    return {"type": "MultiPolygon", "coordinates": polygons}


def subset(payload: dict[str, Any], names: set[str], layer: str, scale: str, clip_bbox: list[float] | None = None) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for feature in payload.get("features") or []:
        properties = feature.get("properties") or {}
        name = properties.get("ADMIN") or properties.get("NAME")
        if name not in names:
            continue
        geometry = transform_geometry(feature.get("geometry") or {}, clip_bbox)
        if not geometry:
            continue
        output.append({
            "type": "Feature",
            "properties": {
                "name": name,
                "iso_a3": properties.get("ADM0_A3") or properties.get("ISO_A3"),
                "layer": layer,
                "scale": scale,
            },
            "geometry": geometry,
        })
    return sorted(output, key=lambda item: (item["properties"]["layer"], item["properties"]["name"]))


def build(source_50m: Path, source_10m: Path) -> dict[str, Any]:
    regional = read_source(source_50m, SOURCE_50M)
    detailed = read_source(source_10m, SOURCE_10M)
    features = [
        *subset(regional, REGIONAL_COUNTRIES, "regional_50m", "1:50m", REGIONAL_BBOX),
        *subset(detailed, HORMUZ_COUNTRIES, "hormuz_10m", "1:10m", HORMUZ_BBOX),
    ]
    return {
        "type": "FeatureCollection",
        "artifact_role": "PRESENTATION_REFERENCE_GEOGRAPHY",
        "schema_version": "1.0",
        "name": "Atlas regional reference geography",
        "bbox": REGIONAL_BBOX,
        "metadata": {
            "source": "Natural Earth Admin-0 Countries",
            "version": NATURAL_EARTH_VERSION,
            "license": "Natural Earth public domain",
            "license_url": "https://www.naturalearthdata.com/about/terms-of-use/",
            "runtime_network_required": False,
            "source_files": [
                {"scale": "1:50m", **SOURCE_50M},
                {"scale": "1:10m", **SOURCE_10M},
            ],
            "layers": {
                "regional_50m": {"scale": "1:50m", "bbox": REGIONAL_BBOX},
                "hormuz_10m": {"scale": "1:10m", "bbox": HORMUZ_BBOX},
            },
            "labels": REFERENCE_LABELS,
        },
        "features": features,
    }


def stable_bytes(payload: dict[str, Any]) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-50m")
    parser.add_argument("--source-10m")
    parser.add_argument(
        "--fetch-source-dir",
        help="Fetch exact versioned Natural Earth inputs into this build-only directory and verify both pinned SHA-256 values",
    )
    parser.add_argument("--output", default=OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    explicit_sources = bool(args.source_50m or args.source_10m)
    if args.fetch_source_dir and explicit_sources:
        parser.error("use either --fetch-source-dir or both explicit source paths, not both")
    if explicit_sources and not (args.source_50m and args.source_10m):
        parser.error("--source-50m and --source-10m must be supplied together")
    if args.fetch_source_dir:
        source_directory = Path(args.fetch_source_dir).resolve()
        source_50m = obtain_pinned_source(source_directory, "1:50m", SOURCE_50M)
        source_10m = obtain_pinned_source(source_directory, "1:10m", SOURCE_10M)
    elif args.source_50m and args.source_10m:
        source_50m = Path(args.source_50m)
        source_10m = Path(args.source_10m)
    else:
        parser.error("provide --fetch-source-dir or both --source-50m and --source-10m")

    # These reads are intentional even though build() reads again: the command
    # reports each independently verified pin before deterministic generation.
    read_source(source_50m, SOURCE_50M)
    read_source(source_10m, SOURCE_10M)
    print(f"reference-geography: verified 1:50m source SHA-256 {SOURCE_50M['sha256']}")
    print(f"reference-geography: verified 1:10m source SHA-256 {SOURCE_10M['sha256']}")
    output = ROOT / args.output
    generated = stable_bytes(build(source_50m, source_10m))
    if args.check:
        if not output.is_file() or output.read_bytes() != generated:
            raise SystemExit(f"FAIL: reference geography is stale: {args.output}")
        print(f"reference-geography: PASS - {args.output} is deterministic and current")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(generated)
    print(f"reference-geography: wrote {args.output} ({len(generated)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
