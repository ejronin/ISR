'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ia = require('../js/public-ia.js');
const app = require('../js/public-app.js');

const root = path.resolve(__dirname, '..');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data/public-current-state.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/public-release.json'), 'utf8'));
const payload = key => model.datasets[key] && model.datasets[key].payload;

assert.equal(model.counts.chronology_records, 205);
assert.equal(model.counts.canonical_source_records, 362);
assert.equal(model.counts.accepted_update_packets, 0);
assert.equal(model.release.current_osint_cutoff, '2026-08-27T08:25:00-04:00');

const losses = payload('current.material_losses').records;
assert.equal(losses.length, model.counts.material_loss_records);
assert.equal(losses.length, 52);
assert.equal(new Set(losses.map(record => record.loss_id)).size, losses.length);
assert(losses.some(record => record.quantity == null), 'unknown-quantity test records are absent');
assert(losses.some(record => record.status === 'DAMAGED'));
assert(losses.some(record => record.status.includes('TARGETED')));
assert(losses.some(record => record.side === 'CIVILIAN/COMMERCIAL'));
assert(losses.some(record => record.side !== 'CIVILIAN/COMMERCIAL'));

const militaryMapping = model.page_data.military_record.dataset_keys;
for (const key of ['current.material_losses', 'analysis.asset_display', 'forensic.loss_envelopes', 'forensic.leadership_casualties', 'forensic.aviation_reconciliation', 'forensic.pilot_rescue_timeline']) {
  assert(militaryMapping.includes(key), `military read model is missing ${key}`);
}
for (const key of ia.ROUTES.get('military.losses').dataKeys) assert(app.ROUTE_DATA_DEPENDENCIES['military.losses'].datasets.includes(key));
for (const key of ia.ROUTES.get('military.weapons').dataKeys) assert(app.ROUTE_DATA_DEPENDENCIES['military.weapons'].datasets.includes(key));

const assetCategories = payload('analysis.asset_display').iran.headline_categories;
assert.equal(assetCategories.length, 10);
assert.equal(assetCategories.find(item => item.id === 'launchers').scope, 'neutralized; not automatically equivalent to destroyed');
assert.equal(assetCategories.find(item => item.id === 'missile_inventory').public_status, 'SUPPORTED MODEL');
assert(assetCategories.find(item => item.id === 'aircraft').components.length > 1);
assert.equal(payload('forensic.loss_envelopes').categories.length, 9);
assert(payload('forensic.loss_envelopes').categories.every(category => category.envelopes.length === 3));
assert.equal(payload('forensic.leadership_casualties').records.length, 11);
assert.equal(payload('forensic.aviation_reconciliation').records.length, 4);
assert.equal(payload('forensic.pilot_rescue_timeline').records.length, 14);

const directory = payload('current.actors').map(item => item.record || item);
assert.equal(directory.length, model.counts.public_actor_records);
assert.equal(model.counts.canonical_actor_records, 96);
assert(directory.length > model.counts.canonical_actor_records, 'structural identities were not added to the public directory');
const required = new Map([
  ['Saudi Arabia', 'ACT-SAUDI-ARABIA'], ['Bahrain', 'ACT-BAHRAIN'], ['Kuwait', 'ACT-KUWAIT'], ['Qatar', 'ACT-QATAR'],
  ['Jordan', 'ACT-JORDAN'], ["Yemen's internationally recognized government", 'ACT-YEMEN-PLC'], ['Egypt', 'ACT-EGYPT'],
  ['Sudan', 'ACT-SUDAN'], ['Djibouti', 'ACT-DJIBOUTI'], ['Somalia', 'ACT-SOMALIA'], ['Nigeria', 'ACT-NIGERIA'],
  ['Türkiye', 'ACT-TURKIYE'], ['Pakistan', 'ACT-PAKISTAN'], ['Bangladesh', 'ACT-BANGLADESH']
]);
for (const [name, actorId] of required) assert.equal(directory.find(actor => actor.canonical_name === name)?.actor_id, actorId, `stable public identity missing: ${name}`);
assert(!JSON.stringify(payload('current.actors')).includes('FOUNDING_SIGNATORY'));

const flagResolver = app.createStateFlagResolver(manifest);
const actorResolver = ia.ActorIdentity.createResolver(model, flagResolver);
for (const [name] of required) assert.notEqual(actorResolver.resolve(name).affiliationType, 'unknown', `participant identity unresolved: ${name}`);
for (const [name, code] of [['Iran', 'ir'], ['United States', 'us'], ['Oman', 'om'], ['IRGC', 'ir'], ['Mohammad Baqer Qalibaf', 'ir']]) {
  assert.equal(actorResolver.resolve(name).flagCode, code, `state flag code mismatch: ${name}`);
  assert(flagResolver.resolve(code).path.endsWith('.svg'));
}
for (const name of ['Hezbollah', 'Houthis / Ansar Allah', 'United Nations', 'IAEA']) assert.equal(actorResolver.resolve(name).flagCode, null, `non-national identity received a state flag: ${name}`);

const source = fs.readFileSync(path.join(root, 'js/public-ia.js'), 'utf8');
assert(!source.includes('losses.slice(0, 12)'), 'fixed material-loss ceiling remains');
assert(!source.includes('.slice(0, 32)'), 'fixed actor-directory ceiling remains');
for (const token of ['dataset.lossId', 'dataset.lossFilter', 'dataset.assetCategoryId', 'dataset.envelopeCategory', 'dataset.leadershipId', 'dataset.aviationId', 'dataset.pilotRescueId', 'dataset.weaponLossId']) assert(source.includes(token), `consumer marker missing: ${token}`);
assert(!/[\u{1F1E6}-\u{1F1FF}]{2}/u.test(source.slice(source.indexOf('const ActorIdentity'), source.indexOf('const EvidenceStatus'))), 'ActorIdentity rendering still depends on Unicode regional-indicator flags');

console.log(`public losses/actors Batch 2: PASS - ${losses.length} loss IDs, ${assetCategories.length} asset categories, 9 envelopes, 11 leaders, 4 aviation records, 14 pilot steps, ${directory.length} public actor identities, 30 signed flags`);
