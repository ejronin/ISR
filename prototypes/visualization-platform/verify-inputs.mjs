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

const [geography, routeData, sanctions, economics, currentState, marketResearch] = await Promise.all([
  readJson('assets/geography/atlas-reference-geography.geojson'),
  readJson('data/oil-routes-r1.json'),
  readJson('data/sanctions-financial-network-v1.json'),
  readJson('data/integration-v1.2/economics.json'),
  readJson('data/public-current-state.json'),
  readJson('data/research/eia-brent-spot-2026-visual-candidate.json')
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

assert(marketResearch.canonical_status === 'EXTERNAL_PRIMARY_SOURCE_RESEARCH_NOT_ACCEPTED_AS_CANONICAL','Unreviewed market candidate is being misrepresented as accepted evidence.');
assert(marketResearch.publisher === 'U.S. Energy Information Administration','Unqualified market publisher.');
assert(marketResearch.metric === 'Europe Brent crude oil spot price FOB','Market metric must be EIA spot Brent, not futures.');
const marketObservations = marketResearch.observations || [];
assert(marketObservations.length === 41,'Market research sample cardinality drift.');
for (let i=0;i<marketObservations.length;i++) {
  const row=marketObservations[i];
  assert(/^2026-\\d{2}-\\d{2}$/.test(row.date) && Number.isFinite(row.value) && row.value>0,'Invalid market observation.');
  if (i) assert(marketObservations[i-1].date < row.date,'Unsorted or repeated EIA observation date.');
}
assert(marketObservations[0].date === '2026-01-09' && marketObservations.at(-1).date === '2026-10-06','Unexpected observed market date range.');
assert(marketObservations.find(x=>x.date==='2026-02-27')?.value === 71.32,'EIA prewar market checkpoint mismatch.');
assert(marketObservations.find(x=>x.date==='2026-10-02')?.value === 135.51,'EIA October observed market checkpoint mismatch.');
assert((sanctions.wartime_actions||[]).filter(x=>x.date&&x.title).length>=8,'Missing accepted sanctions marker events.');
\nassert(currentState.artifact_role === 'DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL', 'Generated public-current-state role changed.');
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
  eia_market_samples: marketObservations.length,
  market_source_status: marketResearch.canonical_status,
  wol_nodes: graphNodes.length,
  wol_edges: graphEdges.length
}, null, 2));
