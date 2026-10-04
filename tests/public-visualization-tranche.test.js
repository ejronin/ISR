'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative));
const text = relative => read(relative).toString('utf8');
const sha256 = relative => crypto.createHash('sha256').update(read(relative)).digest('hex');

const upstream = Object.freeze({
  'vendor/maplibre/6.11.2/maplibre-gl.js': 'd4dc7a9076fbdec1e74868c627fe58769b04cf83dd9cf1adbcf7d4118d7312f8',
  'vendor/maplibre/6.11.2/maplibre-gl-shared.js': '76b5f55bdee928c65d592684aaff2b913d50b6b17b0ec6334e88b09b6aa47960',
  'vendor/maplibre/6.11.2/maplibre-gl-worker.js': '620e4c950804cab5b9a2c530de8c57110d7bdc288fde44215fe741235309fa58',
  'vendor/maplibre/6.11.2/maplibre-gl.css': 'd8617d8421930e3fc6185365400e788c374c1a5d9fbe87999998c0bc14a202d3',
  'vendor/maplibre/6.11.2/LICENSE.txt': 'ee5fc05a0677eaf69601d2c7db0d9ecd6cc27c3abc1d0733bc9ed34707cf8ef2'
});
for (const [relative, expected] of Object.entries(upstream)) {
  assert.equal(sha256(relative), expected, `${relative} drifted from the reviewed 6.11.2 vendor bytes`);
}

const vendorRuntime = Object.keys(upstream).filter(relative => /\.(?:js|css)$/.test(relative));
const compressedBytes = vendorRuntime.reduce((sum, relative) => sum + zlib.gzipSync(read(relative), { level: 9 }).length, 0);
assert(compressedBytes <= 450 * 1024, `MapLibre capability exceeds 450 KiB compressed budget: ${compressedBytes}`);

const bridgeCompressed = zlib.gzipSync(read('js/public-visualization-renderer.js'), { level: 9 }).length;
assert(bridgeCompressed <= 16 * 1024, `Visualization bridge is unexpectedly large: ${bridgeCompressed}`);

const builder = text('scripts/build_public_release_core.py');
assert.match(builder, /MAPLIBRE_VERSION = "6\.11\.2"/);
assert.match(builder, /"maplibre_worker"/);
assert.match(builder, /"loading": "lazy"/);
assert.match(builder, /"fallback": "leaflet"/);
assert.match(builder, /assets_by_role\["map_runtime"\]/, 'Leaflet is no longer the production map_runtime fallback');

const bootstrap = text('js/public-bootstrap.js');
assert.match(bootstrap, /maplibre_runtime/);
assert.match(bootstrap, /same_origin_only/);
assert.match(bootstrap, /manifest\.application\.runtime\.length === 6/);

const renderer = text('js/public-visualization-renderer.js');
assert.match(renderer, /setWorkerUrl/);
assert.match(renderer, /exact-SHA validation/);
assert.match(renderer, /getContext\('webgl2'\)/);
assert.match(renderer, /cameraModes/);
assert.match(renderer, /MapView\.create\(context, options\)/, 'Leaflet local fallback was removed');
assert(!/https?:\/\//.test(renderer.replace(/https:\/\/ejronin\.github\.io\/ISR\//g, '')), 'Renderer contains an external runtime origin');

const ia = text('js/public-ia.js');
const readerRegistry = text('src/public-reader-registry.js');
for (const mode of ['FULL NETWORK', 'DIRECT CONNECTIONS', 'TRACE PROPAGATION']) assert(ia.includes(mode), `WOL mode missing: ${mode}`);
assert.match(ia, /opacity': 0\.12/);
assert.match(ia, /prefers-reduced-motion: reduce/);
assert.match(ia, /cameraModes: \['theater', 'gulf', 'hormuz'\]/);
assert.match(ia, /data\.propagation_graph|propagation_graph/);
assert.match(builder, /ECHARTS_VERSION = "6\.1\.0"/);
assert.match(builder, /"echarts_runtime"/);
assert.match(renderer, /loadECharts/);
assert.match(renderer, /createEventDensity/);
assert.match(renderer, /createCategoryBars/);
assert.match(readerRegistry, /PROTECTED BASELINE/);
assert.match(readerRegistry, /HIT ≠ DAMAGED ≠ DESTROYED ≠ INEFFECTIVE/);

const csp = text('templates/public-index.html');
assert.match(csp, /worker-src 'self'/);
assert(!csp.includes("'unsafe-eval'"));
assert(!/worker-src[^;]*(?:https?:|blob:)/.test(csp));

const css = text('css/public-shell.css');
assert.match(css, /height: 62svh/);
assert.match(css, /@container/);
assert.match(css, /wol-mobile-trace/);

console.log(JSON.stringify({
  visualization_tranche: 'PASS',
  maplibre_version: '6.11.2',
  maplibre_gzip_bytes: compressedBytes,
  visualization_bridge_gzip_bytes: bridgeCompressed,
  leaflet_fallback: true,
  signed_echarts_capability: '6.1.0-simple',
  protected_echarts_replacement: false
}));
