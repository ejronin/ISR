'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = require('../js/public-app.js');
const ia = require('../js/public-ia.js');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data', 'public-current-state.json'), 'utf8'));
const geography = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'geography', 'atlas-reference-geography.geojson'), 'utf8'));
const payload = key => model.datasets[key].payload;

assert.equal(model.counts.chronology_records, model.chronology.length);
assert.equal(model.release.current_osint_cutoff, model.release.gate2_evidence_cutoff);
assert.equal(ia.ROUTES.size, 25);
assert.equal(Object.keys(app.ROUTE_DATA_DEPENDENCIES).length, 25);
for (const route of ia.ROUTES.values()) {
  const expected = new Set([...app.SHARED_DATASETS, ...route.dataKeys]);
  assert.deepEqual(new Set(app.ROUTE_DATA_DEPENDENCIES[route.key].datasets), expected, `route authorization drift: ${route.key}`);
}

const fallback = [[11, 32], [40.5, 67.5]];
assert.deepEqual(ia.MapView.deriveMapViewport([], [], [], [], fallback), { bounds: fallback, derived: false, coordinateCount: 0 });
assert.deepEqual(ia.MapView.deriveMapViewport([{ point: { lat: null, lon: null } }], [], [], [], fallback), { bounds: fallback, derived: false, coordinateCount: 0 });
const supplied = ia.MapView.deriveMapViewport([{ point: { lat: 12.58, lon: 43.33 } }, { point: { lat: 35.7, lon: 51.6 } }], [], [], [], fallback);
assert.equal(supplied.derived, true);
assert.deepEqual(supplied.bounds, [[12.58, 43.33], [35.7, 51.6]]);

const oilRoutes = payload('analysis.oil_routes').routes;
const expectedRouteIds = ['REDSEA-SUEZ-MARITIME', 'REDSEA-SAUDI-EAST-WEST', 'RAIL-CN-IR-APRIN', 'RAIL-RU-IR-APRIN'];
assert.deepEqual(oilRoutes.map(route => route.id).sort(), expectedRouteIds.slice().sort());
assert.deepEqual(new Set(oilRoutes.map(route => route.mode)), new Set(['maritime', 'pipeline', 'rail']));
assert(oilRoutes.every(route => route.authority_class === 'SCHEMATIC_REFERENCE_ROUTE'));
assert(oilRoutes.every(route => ia.MapView.routeGeometry(route).length > 1));
const routeViewport = ia.MapView.deriveMapViewport([], oilRoutes, [], [], fallback);
assert.equal(routeViewport.derived, true);
assert(routeViewport.bounds[0][1] <= 32.6, 'Red Sea/Suez route geometry is absent from the derived extent');
assert(routeViewport.bounds[1][1] >= 108, 'China–Iran rail geometry is absent from the derived extent');

const forecast = payload('ledger.economics').forecast_context;
assert.equal(forecast.metric, '2026 real GDP growth forecast (%)');
assert.match(forecast.note, /Forecast trajectory, not realized GDP/i);
assert.deepEqual(forecast.rows.map(row => row.country).sort(), ['Saudi Arabia', 'Oman', 'United Arab Emirates', 'Bahrain', 'Kuwait', 'Qatar', 'Iran'].sort());
assert(forecast.rows.every(row => ['prewar', 'current', 'delta'].every(field => Number.isFinite(row[field]))));
assert.deepEqual(payload('analysis.china_oil_shift').linked_existing_routes.map(route => route.route_id), ['ARCTIC-RU-CN-OIL']);

const actorResolver = ia.ActorIdentity.createResolver(model);
const agreements = ia.recordArray(payload('ledger.agreements'));
assert.equal(agreements.length, 8);
const alignment = agreements.find(record => record.agreement_id === 'AGR-SAUDI-MARITIME-COALITION-2026');
assert(alignment);
const alignmentIds = alignment.parties.map(name => actorResolver.resolve(name).actorId);
const expectedAlignmentIds = ['ACT-SAUDI-ARABIA','ACT-BAHRAIN','ACT-KUWAIT','ACT-QATAR','ACT-JORDAN','ACT-YEMEN-PLC','ACT-EGYPT','ACT-SUDAN','ACT-DJIBOUTI','ACT-SOMALIA','ACT-NIGERIA','ACT-TURKIYE','ACT-PAKISTAN','ACT-BANGLADESH'];
assert.deepEqual(alignmentIds.sort(), expectedAlignmentIds.slice().sort());
assert.equal(new Set(alignmentIds).size, 14);
assert.equal(actorResolver.resolve('Yemen (internationally recognized government)').actorId, 'ACT-YEMEN-PLC');
assert.equal(actorResolver.resolve('Houthis / Ansar Allah').flagCode, null);
assert.equal(actorResolver.resolve('Hezbollah').flagCode, null);
const regionalNames = new Set(geography.features.filter(feature => feature.properties.layer === 'regional_50m').map(feature => feature.properties.name));
for (const name of ['Bangladesh', 'Bahrain', 'Djibouti', 'Egypt', 'Jordan', 'Kuwait', 'Nigeria', 'Pakistan', 'Qatar', 'Saudi Arabia', 'Somalia', 'Sudan', 'Turkey', 'Yemen']) {
  assert(regionalNames.has(name), `reference geography lacks alignment state ${name}`);
}
assert.equal(geography.metadata.runtime_network_required, false);
assert.deepEqual(geography.metadata.source_files.map(item => item.sha256), [
  '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb',
  '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255'
]);

const strikes = ia.recordArray(payload('reconciliation.strikes'));
const coalitionIranStrikes = strikes.filter(strike => /USA|US_ISR_COMBINED/.test(String(strike.actor || '')) && Number(strike.lat) >= 25 && Number(strike.lat) <= 40 && Number(strike.lon) >= 44 && Number(strike.lon) <= 64);
assert(coalitionIranStrikes.length > 0);
assert.equal(ia.recordArray(payload('forensic.damage_observations')).length, 9);
assert.equal(ia.recordArray(payload('forensic.facility_claim_audits')).length, 4);
for (const audit of ia.recordArray(payload('forensic.facility_claim_audits'))) {
  assert(audit.propositions.length > 0);
  assert(audit.propositions.every(proposition => proposition.question && proposition.disposition));
}
assert(ia.recordArray(payload('forensic.facility_claim_audits')).some(audit => audit.propositions.some(proposition => proposition.axis)), 'approved proposition axes were not retained');
const merchantLosses = ia.recordArray(payload('current.material_losses')).filter(record => record.side === 'CIVILIAN/COMMERCIAL');
assert(merchantLosses.length > 0);
assert(merchantLosses.every(record => record.loss_id));

const facilities = payload('ledger.facilities');
const preserved = new Set(facilities.repo_records_to_preserve);
const liveFacilities = new Set(facilities.facilities.map(record => record.facility_id));
assert.equal(preserved.size, 18);
assert([...preserved].every(id => liveFacilities.has(id)), 'facility preservation contract is not a live-record subset');
const bdaRefs = ia.recordArray(payload('ledger.bda_overlays')).map(record => record.facility_ref).filter(Boolean);
const auditRefs = ia.recordArray(payload('forensic.facility_claim_audits')).map(record => record.facility_id).filter(Boolean);
assert([...bdaRefs, ...auditRefs].every(id => liveFacilities.has(id)), 'BDA or claim-audit reference does not resolve to a live facility');

assert.equal(model.consumer_coverage.schema_version, '1.0');
assert.equal(model.consumer_coverage.route_data_waivers.length, 0);
assert(model.consumer_coverage.dataset_waivers.length >= 40);
assert(model.consumer_coverage.dataset_waivers.some(waiver => waiver.dataset_key === 'gate3.legacy_dispositions'));
assert(model.consumer_coverage.dataset_waivers.some(waiver => waiver.dataset_key === 'gate3.side_ledger_dispositions'));
assert(model.consumer_coverage.dataset_waivers.every(waiver => waiver.reason.trim().length >= 20 && waiver.owner && waiver.authority_role));
const fullyObserved = {
  sharedAccesses: app.SHARED_DATASETS.slice(),
  routeAccesses: Object.fromEntries(Object.entries(app.ROUTE_DATA_DEPENDENCIES).map(([routeKey, contract]) => [routeKey, contract.datasets.filter(key => !app.SHARED_DATASETS.includes(key))]))
};
const coverage = app.validateConsumerCoverage(model, app.ROUTE_DATA_DEPENDENCIES, fullyObserved);
assert.equal(coverage.routeCount, 25);
assert.equal(coverage.actualConsumerCount, new Set(Object.values(app.ROUTE_DATA_DEPENDENCIES).flatMap(contract => contract.datasets)).size);
assert.equal(coverage.routeWaiverCount, 0);
assert.equal(coverage.datasetWaiverCount, model.consumer_coverage.dataset_waivers.length);
assert.equal(coverage.coveredDatasetCount, Object.keys(model.datasets).length + 2);

const lostAccess = structuredClone(fullyObserved);
lostAccess.routeAccesses['hormuz.economy'] = lostAccess.routeAccesses['hormuz.economy'].filter(key => key !== 'analysis.oil_routes');
assert.throws(() => app.validateConsumerCoverage(model, app.ROUTE_DATA_DEPENDENCIES, lostAccess), /Silent route dataset: hormuz\.economy \/ analysis\.oil_routes/);

const orphanModel = structuredClone(model);
orphanModel.datasets['analysis.future_orphan_fixture'] = { role: 'APPROVED_ANALYTICAL_DATA', payload: {}, path: 'fixture.json' };
assert.throws(() => app.validateConsumerCoverage(orphanModel, app.ROUTE_DATA_DEPENDENCIES, fullyObserved), /no actual consumer or audit-only waiver: analysis\.future_orphan_fixture/);

const addedRouteKeyContracts = { ...app.ROUTE_DATA_DEPENDENCIES, 'start.overview': { ...app.ROUTE_DATA_DEPENDENCIES['start.overview'], datasets: [...app.ROUTE_DATA_DEPENDENCIES['start.overview'].datasets, 'analysis.endgame_adjudication'] } };
assert.throws(() => app.validateConsumerCoverage(model, addedRouteKeyContracts, fullyObserved), /Silent route dataset: start\.overview \/ analysis\.endgame_adjudication/);

const emptyReasonModel = structuredClone(model);
emptyReasonModel.consumer_coverage.dataset_waivers[0].reason = '';
assert.throws(() => app.validateConsumerCoverage(emptyReasonModel, app.ROUTE_DATA_DEPENDENCIES, fullyObserved), /reason is not reviewable/);

console.log('public parity Batch 3: PASS - map framing, three transport modes, economy/Arctic boundaries, 14-state alignment, strike effects, eight agreements, merchant links, preservation references, and enforceable consumer coverage verified');
