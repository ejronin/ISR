'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ia = require('../js/public-ia.js');
const app = require('../js/public-app.js');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data', 'public-current-state.json'), 'utf8'));
const derived = JSON.parse(fs.readFileSync(path.join(root, 'data', 'web-of-lies', 'derived-registry.json'), 'utf8'));
const forensicInput = JSON.parse(fs.readFileSync(path.join(root, 'data', 'web-of-lies', 'forensic-records.json'), 'utf8'));
const iaSource = fs.readFileSync(path.join(root, 'js', 'public-ia.js'), 'utf8');
const readerSource = fs.readFileSync(path.join(root, 'src', 'public-reader-layer.js'), 'utf8');

const route = ia.ROUTES.get('evidence.web_of_lies');
assert(route, 'Web of Lies route is missing');
assert.equal(route.path, '/evidence/web-of-lies');
assert.equal(route.owner, 'WebOfLiesPage');
assert.equal(route.hiddenNav, true, 'Web of Lies must remain buried beneath Lie Ledger');
assert(!ia.routesForPrimary('evidence').some(item => item.key === route.key), 'buried Web of Lies route leaked into persistent secondary navigation');

const roundTrip = ia.parseRoute(ia.routeHref('evidence.web_of_lies', { claim_family: 'CH-F15E-CSAR-URANIUM' }));
assert.equal(roundTrip.key, 'evidence.web_of_lies');
assert.equal(roundTrip.params.claim_family, 'CH-F15E-CSAR-URANIUM');

assert(app.ROUTE_DATA_DEPENDENCIES['evidence.web_of_lies'], 'public route-data authorization missing');
assert(app.ROUTE_DATA_DEPENDENCIES['evidence.web_of_lies'].datasets.includes('analysis.web_of_lies'));
assert(model.page_data.claims_sources.dataset_keys.includes('analysis.web_of_lies'), 'claims read model does not publish the Web of Lies dataset');
assert(model.datasets['analysis.web_of_lies'], 'Web of Lies dataset missing from public current state');
assert.deepEqual(model.datasets['analysis.web_of_lies'].payload, derived, 'public Web of Lies payload differs from qualified derived registry');

assert.equal(derived.artifact_role, 'WEB_OF_LIES_DERIVED_FORENSIC_REGISTRY');
assert.equal(derived.authority, 'WEB_OF_LIES_INFORMATION_FORENSICS');
assert.equal(derived.hall_of_shame.manual_selection, false);
assert.equal(derived.hall_of_shame.top_n_per_class, 3);
assert(derived.hall_of_shame.ranking_contract, 'public ranking contract is missing');
assert(Object.keys(derived.hall_of_shame.ranking_contract.score_weights || {}).length > 0, 'ranking weights are missing');
assert(Object.keys(derived.hall_of_shame.ranking_contract.event_metric_map || {}).length > 0, 'event-to-metric map is missing');
assert(Array.isArray(derived.hall_of_shame.ranking_contract.qualification_metric_keys) && derived.hall_of_shame.ranking_contract.qualification_metric_keys.length > 0, 'qualification metrics are missing');
const hallClasses = new Set(derived.hall_of_shame.ranking_contract.hall_of_shame_classes || []);
assert(!hallClasses.has('OFFICIAL_SOURCE'), 'neutral official-source typing leaked into Hall ranking classes');
assert(!hallClasses.has('JOURNALISTIC_SOURCE'), 'neutral journalistic-source typing leaked into Hall ranking classes');
assert.match(iaSource, /Plain-English verdict/);

const ledger = model.datasets['gate3.lie_ledger'].payload;
const ledgerChains = Array.isArray(ledger.records) ? ledger.records.filter(row => row.public_include_in_accusation_count !== false) : [];
const familyIds = new Set(derived.claim_families.map(row => row.claim_family_id));
for (const chain of ledgerChains) assert(familyIds.has(chain.chain_id), `Web of Lies registry missing Lie Ledger chain ${chain.chain_id}`);

assert.match(readerSource, /reader-wol-trace/);
assert.match(readerSource, /routeHref\('evidence\.web_of_lies', \{ claim_family:/);
assert.match(readerSource, /Open Web of Lies/);
assert.match(iaSource, /function WebOfLiesPage\(/);
assert.match(iaSource, /No qualifying source in this evidence slice/);
assert.match(iaSource, /Prove the pattern; then call the pattern what it is\./);
assert.match(iaSource, /Explore the propagation graph/);
assert.match(iaSource, /wol-cytoscape-host/);
assert.match(iaSource, /mermaid\.render/);
assert.match(iaSource, /bullshitter_source_count/);
assert.match(iaSource, /CONFIRMED_BOT/);
assert.match(iaSource, /Touch a node/);
assert.match(iaSource, /Observed megaphones/);
assert.match(iaSource, /Bullshitter sources repeated/);
assert(Array.isArray(derived.propagation_graph.nodes), 'compiled WOL graph nodes missing');
assert(Array.isArray(derived.propagation_graph.edges), 'compiled WOL graph edges missing');
assert.equal(derived.propagation_graph.graph_type, 'BULLSHITTER_MEGAPHONE_NETWORK');
assert(!/manual_rank|manual_score|featured_rank/.test(iaSource), 'public Web of Lies renderer contains a manual ranking control');

if ((forensicInput.source_profiles || []).length === 0 && (forensicInput.information_events || []).length === 0) {
  assert.deepEqual(derived.hall_of_shame.all_time, {}, 'empty forensic input must not manufacture Hall of Shame placements');
  assert.deepEqual(derived.hall_of_shame.current_period, {}, 'empty forensic input must not manufacture current-period Hall of Shame placements');
  assert(derived.claim_families.length > 0, 'canonical claim-family registry should still be populated before source forensics are seeded');
}

console.log(`web-of-lies public contract: PASS - ${derived.claim_families.length} claim families, buried route, signed TRACE links, deterministic ranking contract, interactive Cytoscape graph, and no manual Hall selection`);
