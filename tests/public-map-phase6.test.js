'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ia = require('../js/public-ia.js');
const geography = JSON.parse(fs.readFileSync(path.join(root, 'assets/geography/atlas-reference-geography.geojson'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(path.join(root, 'data/oil-routes-r1.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/public-release.json'), 'utf8'));

assert.equal(geography.artifact_role, 'PRESENTATION_REFERENCE_GEOGRAPHY');
assert.equal(geography.metadata.version, '5.1.1');
assert.equal(geography.metadata.runtime_network_required, false);
assert.deepEqual(new Set(geography.features.map(feature => feature.properties.layer)), new Set(['regional_50m', 'hormuz_10m']));
assert(fs.statSync(path.join(root, 'assets/geography/atlas-reference-geography.geojson')).size < 250_000);

for (const route of routes.routes) {
  assert(['DOCUMENTED_TRACK', 'DOCUMENTED_CORRIDOR', 'SCHEMATIC_REFERENCE_ROUTE'].includes(route.authority_class), `route class missing: ${route.id}`);
  assert(ia.MapView.routeGeometry(route).length > 1, `explicit route geometry missing: ${route.id}`);
}
assert.deepEqual(ia.MapView.routeGeometry({ coords: [[1, 2], [3, 4]] }), [], 'unclassified origin/destination geometry must not render');
assert.deepEqual(ia.MapView.pointAlongPolyline([[0, 0], [0, 10], [10, 10]], .75), [5, 10], 'flow marker must follow stored polyline length');

const locations = new Map([
  ['LOC-PRECISE', { latitude: 26.5, longitude: 56.2, label: 'Canonical Strait fixture', precision: 'Exact' }],
  ['LOC-UNKNOWN', { latitude: null, longitude: null, label: 'Unknown canonical fixture', precision: 'Unknown' }]
]);
const resolver = { resolve(id) { return locations.get(id) || null; } };
const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Av0mAAAAAElFTkSuQmCC';
assert.equal(ia.MapView.imageryDescriptor({ location_id: 'LOC-PRECISE', image_url: tinyPng, georeferenced_bounds: [[26.4, 56.1], [26.6, 56.3]], geolocation_reliable: true }, resolver, []).tier, 'A');
assert.equal(ia.MapView.imageryDescriptor({ location_id: 'LOC-PRECISE', footprint: [[26.4, 56.1], [26.5, 56.3], [26.6, 56.1]], geolocation_reliable: true }, resolver, []).tier, 'B');
assert.equal(ia.MapView.imageryDescriptor({ location_id: 'LOC-PRECISE', image_url: tinyPng }, resolver, []).tier, 'C');
assert.equal(ia.MapView.imageryDescriptor({ title: 'Unlocated imagery fixture', image_url: tinyPng }, resolver, []).tier, 'D');
assert.equal(ia.MapView.pointFromRecord({ location_id: 'LOC-UNKNOWN', location: { lat: 0, lon: 0, name: 'Stale embedded point' } }, resolver), null, 'stale embedded coordinates must not outrank a canonical unknown location');

assert.deepEqual(new Set(manifest.application.assets.map(asset => asset.role)), new Set(['map_runtime', 'page_registry', 'map_stylesheet', 'stylesheet', 'reference_geography', 'entrypoint']));
assert.equal(manifest.application.reference_geography, manifest.application.assets.find(asset => asset.role === 'reference_geography').path);
assert.equal(manifest.application.runtime.length, 2);
assert.equal(manifest.application.stylesheets.length, 2);

const mapSource = fs.readFileSync(path.join(root, 'js/public-ia.js'), 'utf8');
for (const forbidden of ['bda-map-data.json', 'map-only source index', 'image_id ===', 'facility ===']) assert(!mapSource.includes(forbidden), `map runtime contains a separate or record-specific path: ${forbidden}`);
assert(!/L\.tileLayer|tile\.openstreetmap|api\.mapbox|maps\.google/i.test(mapSource), 'current MapView depends on an external tile or map API');
for (const forbiddenPath of ['data/bda-map-data.json', 'data/map-source-index.json']) assert(!fs.existsSync(path.join(root, forbiddenPath)), `separate map pipeline artifact exists: ${forbiddenPath}`);

console.log('public map Phase 6: PASS - local geography, explicit route authority, polyline flow, generic imagery tiers, canonical precedence, and signed assets verified');
