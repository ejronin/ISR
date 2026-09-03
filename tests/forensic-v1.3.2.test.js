'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const load = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const forensicApi = require('../js/forensic.js');
const stateApi = require('../js/state.js');
const presentation = require('../js/presentation.js');

const forensic = {
  losses: load('data/forensic-v1.3.2/iran-loss-envelopes.json'),
  leaders: load('data/forensic-v1.3.2/iran-leadership-casualties.json'),
  claims: load('data/forensic-v1.3.2/iranian-claim-evolution.json'),
  chains: load('data/forensic-v1.3.2/claim-chain-index.json'),
  sources: load('data/forensic-v1.3.2/sources.json')
};
const ledger = {
  events: load('data/integration-v1.2/events.json'),
  timeline: load('data/integration-v1.2/timeline.json'),
  facilities: load('data/integration-v1.2/facilities.json'),
  casualties: load('data/integration-v1.2/casualties.json'),
  'material-losses': load('data/integration-v1.2/material-losses.json'),
  claims: load('data/integration-v1.2/claims.json')
};

const model = forensicApi.lossViewModel(forensic.losses);
assert.deepStrictEqual(model.summary.material_loss_range_usd, { low: 7296811473, central: 19622936668, high: 57395962730 });
assert.strictEqual(model.categories.length, 8);
assert(!model.categories.some(row => /RECONSTITUTION/.test(row.category)));
assert.strictEqual(model.munitions.composition_derivation.combined_launch_total, 6770);
assert.deepStrictEqual(model.munitions.composition_derivation.cases['COMP-LOW-ITEMIZED-MISSILE-FLOOR'].missiles, 1234);
assert.deepStrictEqual(model.munitions.composition_derivation.cases['COMP-CENTRAL-POOLED-ITEMIZED-SHARE'].uas, 4861);
assert.deepStrictEqual(model.munitions.composition_derivation.cases['COMP-HIGH-ISRAEL-MISSILE-SHARE'].missiles, 2286);
assert.strictEqual(forensic.leaders.records.length, 11);
assert.deepStrictEqual(new Set(forensic.leaders.records.map(row => row.category)), new Set(['SENIOR_POLITICAL_STATE', 'SENIOR_MILITARY_SECURITY']));

const corrected = ledger.claims.claims.find(row => row.case_id === forensicApi.CORRECTION_ID);
assert.strictEqual(corrected.current_verdict, 'FALSE — CAUSATION NOT SUPPORTED');
assert.deepStrictEqual(corrected.evidence_supporting_claim, []);
assert.match(corrected.what_actually_happened, /did not alter their agreed timeline/);

const groups = forensicApi.groupCasualties(ledger.casualties.records);
assert(groups.current.some(row => row.casualty_id === 'C017'));
assert(!groups.current.some(row => ['C006', 'C015', 'C016'].includes(row.casualty_id)));
assert.deepStrictEqual(groups.superseded.map(row => row.casualty_id), ['C006', 'C015', 'C016']);

const originalCount = ledger.events.events.length;
const temporal = forensicApi.createTemporalIndex(ledger, forensic);
assert.strictEqual(ledger.events.events.length, originalCount, 'canonical events were mutated');
assert(temporal.some(row => /KC-?135/i.test(row.summary) && row.temporal_record_type === 'ANNOTATION'));
assert(temporal.some(row => row.temporal_record_type === 'ANNOTATION'));
assert.strictEqual(temporal.filter(row => row.temporal_record_type === 'CANONICAL_EVENT').length, originalCount);

const index = forensicApi.buildSearchIndex({ ledger, forensic, legacy: load('data/core.json') });
['Dena', 'Khamenei', 'Al Udeid', 'F-15E', 'uranium', 'Hormuz', 'naval losses'].forEach(query => assert(forensicApi.searchIndex(index, query).length, `missing search result for ${query}`));
forensicApi.searchIndex(index, 'Dena').forEach(row => assert(!/\b[A-Z0-9]+(?:_[A-Z0-9]+)+\b/.test(row.subtitle), `raw enum in search subtitle: ${row.subtitle}`));

const roundTrip = stateApi.parseState(stateApi.serializeState({ activeView: 'claims', selectedRecord: { type: 'case', id: forensicApi.CORRECTION_ID }, timeCutoff: '2026-04-03', temporalMode: 'known-by', temporalGranularity: 'day', manualLayerOverrides: { Sites: true, 'Strike effects': false }, lossScenario: 'high' }));
assert.strictEqual(roundTrip.activeView, 'claims');
assert.strictEqual(roundTrip.selectedRecord.id, forensicApi.CORRECTION_ID);
assert.deepStrictEqual(roundTrip.manualLayerOverrides, { Sites: true, 'Strike effects': false });
assert.strictEqual(roundTrip.lossScenario, 'high');
assert(!stateApi.serializeState(roundTrip).includes('%25'), 'state URL must remain human-debuggable');

const alUdeid = ledger.facilities.facilities.find(row => row.facility_id === 'US-ALUDEID');
assert.strictEqual(presentation.facilityEntityState(alUdeid), 'degraded');
assert.strictEqual(presentation.physicalState('CAOC rendered inoperable'), 'lost');
assert.strictEqual(presentation.physicalState('damaged or destroyed; final state unresolved'), 'degraded');
assert.strictEqual(presentation.physicalState('No whole-site shutdown reported'), 'neutral');
assert.strictEqual(presentation.physicalState('Flights resumed and operations continued'), 'operational');

const css = fs.readFileSync(path.join(root, 'css/app.css'), 'utf8');
assert.match(css, /prefers-reduced-motion:reduce/);
assert(css.lastIndexOf('.mapwrap{display:block!important') > css.lastIndexOf('.mapwrap{display:none'), 'mobile map override must win');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const legacyHtml = fs.readFileSync(path.join(root, 'legacy/phase1-public-runtime-reference.html'), 'utf8');
const publicRelease = JSON.parse(fs.readFileSync(path.join(root, 'data/public-release.json'), 'utf8'));
assert.match(legacyHtml, /js\/state\.js/);
assert.match(legacyHtml, /js\/forensic\.js/);
assert(html.includes(publicRelease.neutral_bootstrap.asset.path));
assert(html.includes(publicRelease.neutral_bootstrap.asset.integrity));
assert(!/<script\b[^>]*\bsrc="js\/public-app\.js/i.test(html));
assert.match(html, /object-src 'none'/);
assert(!/_[A-Z]+_[A-Z]+/.test('FALSE — CAUSATION NOT SUPPORTED'));

console.log('Forensic v1.3.2 release gates passed.');
