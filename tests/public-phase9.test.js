'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../js/public-app.js');
const ia = require('../js/public-ia.js');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const model = JSON.parse(read('data/public-current-state.json'));
const canonical = JSON.parse(read('data/canonical-current-state-v2.json'));
const payload = key => model.datasets[key].payload;
const records = key => ia.recordArray(payload(key));

assert.equal(model.schema_version, '2.0');
assert.equal(model.release.current_osint_cutoff, canonical.release.current_osint_cutoff);
assert.equal(model.counts.chronology_records, canonical.chronology.length);
assert.equal(model.chronology.length, model.counts.chronology_records);
assert.equal(model.integrity.browser_replays_update_packets, false);

const coverage = records('gate3.daily_coverage');
assert.equal(coverage[0].date, '2026-02-28');
assert.equal(coverage.at(-1).date, model.release.current_osint_cutoff.slice(0, 10));
assert.equal(coverage.length, 190);
assert(coverage.every((day, index) => day.date === new Date(Date.UTC(2026, 1, 28 + index)).toISOString().slice(0, 10)), 'wartime coverage contains a gap');
assert(model.chronology.some(item => item.timeline.date < coverage[0].date), 'prewar context is absent');

for (const [key, routeKey] of [
  ['gate3.gaps', 'start.overview'], ['gate3.daily_coverage', 'timeline.war'],
  ['gate3.casualties', 'military.losses'], ['gate3.facilities', 'military.facilities'],
  ['gate3.movements', 'military.campaigns'], ['gate3.shipping', 'hormuz.shipping'],
  ['gate3.economics', 'hormuz.economy'], ['gate3.agreements', 'talks.overview'],
  ['gate3.diplomacy', 'talks.overview'], ['gate3.lie_ledger', 'evidence.information'],
  ['gate3.narrative_families', 'evidence.information'], ['gate3.information_chains', 'evidence.information'],
  ['gate3.source_reliability', 'evidence.information']
]) {
  assert(ia.ROUTES.get(routeKey).dataKeys.includes(key), `${key} is not consumed by ${routeKey}`);
  assert(app.ROUTE_DATA_DEPENDENCIES[routeKey].datasets.includes(key), `${key} is outside route authorization`);
}

assert.equal(ia.publicNarrative('naval_strike'), 'Naval strike');
assert.equal(ia.publicNarrative('SUPPORTED_WITH_LIMITATIONS'), 'Supported with limitations');
assert.equal(ia.publicNarrative('DURABLE_MATERIAL_DAMAGED'), 'Durable material damaged');
assert.equal(ia.publicNarrative('PRE_COORDINATED_DRAWDOWN_NOT_RETREAT'), 'Pre coordinated drawdown not retreat');
assert.equal(
  ia.publicNarrative('No machine-readable footprint/damage polygons were supplied. Do not create polygons or percentages from prose.'),
  'The evidence record does not include a precise imagery footprint or damage polygon, so no polygon or damage percentage is inferred.'
);
assert.equal(ia.publicNarrative('>12 structures and >=4 shelters'), 'more than 12 structures and at least 4 shelters');

const actors = ia.ActorIdentity.createResolver(model);
assert.equal(actors.resolve('Iran').flagCode, 'ir');
assert.equal(actors.resolve('United States').flagCode, 'us');
assert.equal(actors.resolve('Hezbollah').flagCode, null);
assert.equal(actors.resolve('Houthis / Ansar Allah').flagCode, null);

const losses = records('current.material_losses');
assert(losses.some(record => record.side === 'U.S./COALITION'));
assert(losses.some(record => record.side === 'IRAN/ALIGNED'));
assert(losses.some(record => record.side === 'CIVILIAN/COMMERCIAL'));
assert.equal(records('gate3.casualties').length, 23);

const ledger = records('gate3.lie_ledger');
assert.equal(ledger.length, model.counts.gate3_lie_ledger_records);
assert.equal(ledger.length, 76);
assert(ledger.every(record => record.truth_adjudication && Number.isInteger(record.deception_score)));
assert(ledger.some(record => record.truth_adjudication === 'DISPROVEN' && record.deception_score === 0), 'falsehood was treated as automatic intent');
assert.equal(records('gate3.narrative_families').length, 40);
assert.equal(records('gate3.information_chains').length, 14);
assert.equal(records('gate3.source_reliability').length, 67);

const sourceById = new Map(model.sources.records.map(source => [source.source_id, source]));
for (const item of model.chronology) {
  for (const reference of item.source_references) {
    const source = sourceById.get(reference.source_id);
    assert(source, `missing chronology source: ${reference.source_id}`);
    if (reference.variant_key) assert(source.variants.some(variant => variant.variant_key === reference.variant_key), `missing source variant: ${reference.variant_key}`);
    else assert.equal(source.resolution, 'PROVENANCE_SCOPED_VARIANTS_REQUIRED', 'unscoped reference is not an explicit conflict');
  }
}

const source = read('js/public-ia.js');
assert(!source.includes('Do not add the headline categories'));
assert(source.includes('How casualty totals are counted'));
assert(source.includes("dataset.lossSideGroup = definition.key"));
assert(source.includes("append(list, 'details', 'imagery-summary-row')"));
assert(source.includes("button.dataset.eventId = item.event_id"));
assert(source.includes('replaceMap([item])'));
assert(source.includes("dataset.timelinePrewar = 'distinct'"));
assert(source.includes("append(list, 'details', 'lie-ledger-record')"));
assert(source.includes('technicalId: strike.id'));
assert(source.includes('technicalId: record.loss_id'));
assert(!source.includes('meta: `Stable strike record:'));
assert(!source.includes('meta: `Stable record:'));
assert(!/\b316\b/.test(source), 'current chronology count is hard-coded in frontend source');
for (const replay of ['current-update-20260824.js', 'current-update-20260825.js', 'current-update-20260826.js', 'current-update-20260827.js']) assert(!source.includes(replay));

console.log(`public Phase 9: PASS - ${model.chronology.length} chronology records, ${coverage.length} conflict days, side-separated losses, progressive imagery, human labels, ${ledger.length} Lie Ledger propositions, and resolvable source references verified`);
