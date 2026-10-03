import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(root, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [geography, routeData, sanctions, economics, currentState] = await Promise.all([
  readJson('assets/geography/atlas-reference-geography.geojson'),
  readJson('data/oil-routes-r1.json'),
  readJson('data/sanctions-financial-network-v1.json'),
  readJson('data/integration-v1.2/economics.json'),
  readJson('data/public-current-state.json')
]);

assert(geography.artifact_role === 'PRESENTATION_REFERENCE_GEOGRAPHY', 'Reference geography role changed.');
assert(Array.isArray(geography.features) && geography.features.length > 0, 'Reference geography is empty.');
const geographyLayers = new Set(geography.features.map(feature => feature?.properties?.layer).filter(Boolean));
for (const layer of ['western_context_110m', 'regional_50m', 'hormuz_10m']) {
  assert(geographyLayers.has(layer), 'Required geography layer missing: ' + layer);
}

const routes = Array.isArray(routeData.routes) ? routeData.routes : [];
assert(routes.length > 0, 'Current route dataset is empty.');
assert(new Set(routes.map(route => route.id)).size === routes.length, 'Current route IDs are not unique.');
for (const route of routes) {
  assert(route.authority_class === 'SCHEMATIC_REFERENCE_ROUTE', 'Unexpected route authority class: ' + route.id);
  assert(Array.isArray(route.coords) && route.coords.length >= 2, 'Route geometry missing: ' + route.id);
}

assert(sanctions.artifact_role === 'APPROVED_SANCTIONS_FINANCIAL_NETWORK_ANALYSIS', 'Sanctions analysis role changed.');
assert(Array.isArray(sanctions.map_nodes) && sanctions.map_nodes.length > 0, 'Sanctions map nodes are empty.');
assert(Array.isArray(sanctions.cascade) && sanctions.cascade.length > 0, 'Sanctions cascade is empty.');

const forecastRows = economics?.forecast_context?.rows;
assert(Array.isArray(forecastRows) && forecastRows.length > 0, 'Economic forecast rows are empty.');
for (const row of forecastRows) {
  assert(Number.isFinite(Number(row.prewar)), 'Invalid pre-war forecast: ' + row.country);
  assert(Number.isFinite(Number(row.current)), 'Invalid current forecast: ' + row.country);
  assert(Number.isFinite(Number(row.delta)), 'Invalid stored delta: ' + row.country);
  const arithmeticDelta = Number((Number(row.current) - Number(row.prewar)).toFixed(10));
  assert(Math.abs(arithmeticDelta - Number(row.delta)) < 1e-9, 'Stored delta no longer matches the accepted row values: ' + row.country);
}

assert(currentState.artifact_role === 'DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL', 'Generated public-current-state role changed.');
const wolPayload = currentState?.datasets?.['analysis.web_of_lies']?.payload;
const graph = wolPayload?.propagation_graph;
const graphNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
const graphEdges = Array.isArray(graph?.edges) ? graph.edges : [];
assert(graphNodes.length > 0, 'Generated WOL propagation graph has no nodes.');
assert(graphEdges.length > 0, 'Generated WOL propagation graph has no edges.');

console.log(JSON.stringify({
  geography_features: geography.features.length,
  geography_layers: [...geographyLayers].sort(),
  route_records: routes.length,
  sanctions_map_nodes: sanctions.map_nodes.length,
  sanctions_cascade_steps: sanctions.cascade.length,
  economic_rows: forecastRows.length,
  wol_nodes: graphNodes.length,
  wol_edges: graphEdges.length
}, null, 2));
