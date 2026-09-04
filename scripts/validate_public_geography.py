#!/usr/bin/env python3
"""Validate packaged reference geography and public maritime route geometry."""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
GEOGRAPHY_PATH = ROOT / "assets/geography/atlas-reference-geography.geojson"
ROUTES_PATH = ROOT / "data/oil-routes-r1.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def rings(geometry: dict[str, Any]) -> list[list[list[float]]]:
    if geometry.get("type") == "Polygon":
        return geometry.get("coordinates") or []
    if geometry.get("type") == "MultiPolygon":
        return [ring for polygon in geometry.get("coordinates") or [] for ring in polygon]
    return []


def polygon_sets(geometry: dict[str, Any]) -> list[list[list[list[float]]]]:
    if geometry.get("type") == "Polygon":
        return [geometry.get("coordinates") or []]
    if geometry.get("type") == "MultiPolygon":
        return geometry.get("coordinates") or []
    return []


def in_ring(lon: float, lat: float, ring: list[list[float]]) -> bool:
    inside = False
    previous = ring[-1]
    for current in ring:
        x1, y1 = previous[:2]
        x2, y2 = current[:2]
        if (y1 > lat) != (y2 > lat):
            crossing = (x2 - x1) * (lat - y1) / (y2 - y1) + x1
            if lon < crossing:
                inside = not inside
        previous = current
    return inside


def in_geometry(lon: float, lat: float, geometry: dict[str, Any]) -> bool:
    for polygon in polygon_sets(geometry):
        if not polygon or not in_ring(lon, lat, polygon[0]):
            continue
        if any(in_ring(lon, lat, hole) for hole in polygon[1:]):
            continue
        return True
    return False


def route_class(route: dict[str, Any]) -> str | None:
    explicit = route.get("authority_class") or route.get("route_class") or route.get("geometry_class")
    return str(explicit) if explicit else None


def validate_maritime(routes: dict[str, Any], geography: dict[str, Any]) -> int:
    land = [feature["geometry"] for feature in geography["features"] if feature["properties"].get("layer") == "regional_50m"]
    checked = 0
    for route in routes.get("routes") or []:
        if str(route.get("mode") or "").lower() != "maritime":
            continue
        checked += 1
        coords = route.get("coords") or []
        require(len(coords) >= 2, f"maritime route {route.get('id')} has no explicit polyline")
        require(route_class(route) in {"DOCUMENTED_TRACK", "DOCUMENTED_CORRIDOR", "SCHEMATIC_REFERENCE_ROUTE"}, f"maritime route {route.get('id')} lacks an authority class")
        for point in coords:
            require(isinstance(point, list) and len(point) >= 2, f"malformed coordinate in {route.get('id')}")
            lat, lon = float(point[0]), float(point[1])
            require(-90 <= lat <= 90 and -180 <= lon <= 180, f"out-of-range coordinate in {route.get('id')}")
        for segment_index, (start, end) in enumerate(zip(coords, coords[1:])):
            lat1, lon1 = map(float, start[:2])
            lat2, lon2 = map(float, end[:2])
            steps = max(2, math.ceil(max(abs(lat2 - lat1), abs(lon2 - lon1)) / 0.025))
            for sample in range(1, steps):
                fraction = sample / steps
                if (segment_index == 0 and fraction < 0.012) or (segment_index == len(coords) - 2 and fraction > 0.988):
                    continue
                lat = lat1 + (lat2 - lat1) * fraction
                lon = lon1 + (lon2 - lon1) * fraction
                require(not any(in_geometry(lon, lat, geometry) for geometry in land), f"maritime route {route.get('id')} crosses packaged land near {lat:.4f},{lon:.4f}")
        nodes = route.get("nodes") or []
        if nodes:
            require(abs(float(nodes[0][1]) - float(coords[0][0])) < 0.02 and abs(float(nodes[0][2]) - float(coords[0][1])) < 0.02, f"route {route.get('id')} start does not match its first named node")
            require(abs(float(nodes[-1][1]) - float(coords[-1][0])) < 0.02 and abs(float(nodes[-1][2]) - float(coords[-1][1])) < 0.02, f"route {route.get('id')} end does not match its final named node")
    require(checked > 0, "no maritime routes were validated")
    return checked


def main() -> int:
    geography = json.loads(GEOGRAPHY_PATH.read_text(encoding="utf-8"))
    routes = json.loads(ROUTES_PATH.read_text(encoding="utf-8"))
    require(geography.get("type") == "FeatureCollection", "reference geography is not GeoJSON")
    require(geography.get("artifact_role") == "PRESENTATION_REFERENCE_GEOGRAPHY", "reference geography role is not presentation-only")
    require((geography.get("metadata") or {}).get("version") == "5.1.1", "Natural Earth version is not pinned")
    require((geography.get("metadata") or {}).get("runtime_network_required") is False, "reference geography requires runtime network access")
    require(GEOGRAPHY_PATH.stat().st_size < 300_000, "regional geography exceeds the lightweight public budget")
    layers = {feature.get("properties", {}).get("layer") for feature in geography.get("features") or []}
    require(layers == {"regional_50m", "hormuz_10m"}, f"unexpected reference geography layers: {sorted(layers)}")
    regional_names = {
        feature.get("properties", {}).get("name")
        for feature in geography.get("features") or []
        if feature.get("properties", {}).get("layer") == "regional_50m"
    }
    required_context = {
        "Bangladesh", "China", "Djibouti", "Egypt", "Iran", "Israel", "Kazakhstan",
        "Nigeria", "Russia", "Saudi Arabia", "Somalia", "Sudan", "Turkey", "Yemen",
    }
    require(required_context <= regional_names, f"regional geography omits required theater/alignment/route context: {sorted(required_context - regional_names)}")
    for feature in geography.get("features") or []:
        require(set(feature.get("properties") or {}) == {"name", "iso_a3", "layer", "scale"}, "reference feature contains unnecessary attributes")
        for ring in rings(feature.get("geometry") or {}):
            for lon, lat, *_ in ring:
                require(-180 <= lon <= 180 and -90 <= lat <= 90, "reference coordinate is out of range")
    maritime = validate_maritime(routes, geography)
    print(f"public-geography: PASS - {len(geography['features'])} regional features; {GEOGRAPHY_PATH.stat().st_size} bytes; {maritime} maritime route(s) clear packaged land")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
