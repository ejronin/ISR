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
assert.equal(model.release.gate2_evidence_cutoff, '2026-09-05T00:37:00-04:00');
assert.equal(model.release.current_osint_cutoff, '2026-09-06T14:10:43-04:00');
assert.equal(model.release.current_osint_cutoff, canonical.release.current_osint_cutoff);
assert.notEqual(model.release.current_osint_cutoff, model.release.gate2_evidence_cutoff);
assert.equal(model.counts.chronology_records, canonical.chronology.length);
assert.equal(model.chronology.length, model.counts.chronology_records);
assert.equal(model.integrity.browser_replays_update_packets, false);

const coverage = records('gate3.daily_coverage');
assert.equal(coverage[0].date, '2026-02-28');
assert.equal(coverage.at(-1).date, model.release.current_osint_cutoff.slice(0, 10));
assert.equal(coverage.length, 191);
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

// Lie Ledger v2: public primary object is a narrative/proposition chain, never a flat score row.
const ledger = payload('gate3.lie_ledger');
assert.equal(ledger.schema_version, '2.0');
assert.equal(ledger.primary_object, 'NARRATIVE_PROPOSITION_CHAIN');
assert.equal(ledger.doctrine_version, model.release.lie_ledger_doctrine_version);
assert.equal(ledger.contract_version, model.release.lie_ledger_contract_version);
assert.equal(ledger.authority.verdicts, 'ROOK');
assert.equal(ledger.authority.implementation_and_evidence_qualification, 'PR/CI');
assert.equal(ledger.authority.blocked_verdict_policy, 'WITHHOLD_NOT_DOWNGRADE');
assert.equal(ledger.records.length, model.counts.gate3_lie_ledger_chains);
assert.equal(ledger.metrics.narrative_chains, ledger.records.length);

const propositions = ledger.records.flatMap(chain => chain.proposition_records || []);
assert.equal(propositions.length, model.counts.gate3_lie_ledger_records);
assert.equal(propositions.length, model.counts.gate3_lie_ledger_claim_instances);
assert(propositions.every(record => record.semantic_version === '2.0'));
assert(propositions.every(record => record.doctrine_version === ledger.doctrine_version));
assert(propositions.every(record => record.contract_version === ledger.contract_version));
assert(propositions.every(record => record.truth_adjudication));
assert(propositions.every(record => record.public_knowledge_judgment));
assert(propositions.every(record => record.public_combined_assessment));
assert(propositions.every(record => !Object.hasOwn(record, 'deception_score')), 'active public v2 propositions expose legacy deception_score');
assert(propositions.every(record => record.proposition_fidelity), 'proposition fidelity is missing');
assert(propositions.every(record => record.actor_role), 'originator/amplifier role is missing');
assert(propositions.every(record => record.statement_time && typeof record.statement_time === 'object'), 'claim chronology is missing');
assert(propositions.every(record => record.evidence_support && typeof record.evidence_support === 'object'), 'component evidence support is missing');
for (const record of propositions) {
  for (const group of [
    'what_was_said', 'factual_baseline', 'contemporaneous_state', 'knowledge_access',
    'knowledge_indicators', 'contrary_evidence', 'corrections', 'repetitions',
    'credible_alternative', 'comparative_inference', 'falsifier'
  ]) assert(Array.isArray(record.evidence_support[group]), `missing evidence component ${group}: ${record.claim_instance_id}`);
}
const blocked = propositions.filter(record => record.publication_status === 'BLOCKED_EVIDENCE_COMPLETION');
assert(blocked.length > 0, 'expected evidence-completion blockers are absent');
assert(blocked.every(record => record.canonical_rook_assessment_withheld === true));
assert(blocked.every(record => record.public_combined_assessment === 'EVIDENCE COMPLETION REQUIRED'));
assert(blocked.every(record => record.public_knowledge_judgment === 'WITHHELD_PENDING_EVIDENCE_QUALIFICATION'));
assert(blocked.every(record => !Object.hasOwn(record, 'combined_assessment') && !Object.hasOwn(record, 'knowledge_judgment')), 'blocked canonical ROOK verdict leaked into public model');

for (const chain of ledger.records) {
  assert.equal(chain.primary_object, 'NARRATIVE_PROPOSITION_CHAIN');
  assert.equal(chain.chronology.length, chain.proposition_records.length, `chain chronology mismatch: ${chain.chain_id}`);
  assert.deepEqual(chain.chronology.map(item => item.claim_instance_id), chain.proposition_records.map(item => item.claim_instance_id), `chain chronology order mismatch: ${chain.chain_id}`);
}
assert.equal(ledger.metrics.unique_propositions, model.counts.gate3_lie_ledger_unique_propositions);
assert.equal(ledger.metrics.claim_instances, model.counts.gate3_lie_ledger_claim_instances);
assert.equal(ledger.metrics.claim_instances, propositions.filter(record => record.authority_status === 'ROOK_ADJUDICATED').length);
const percentage = ledger.metrics.percentages.falsy_share_of_resolved_unique_propositions;
assert.equal(percentage.numerator_definition, 'Unique ROOK-adjudicated propositions classified FALSE or MISLEADING.');
assert.match(percentage.denominator_definition, /UNRESOLVED excluded/);
if (percentage.denominator) assert.equal(percentage.percentage, Math.round((10000 * percentage.numerator) / percentage.denominator) / 100);

const narrativeFunctions = propositions.filter(record => typeof record.narrative_function === 'string' && record.narrative_function.trim());
assert(narrativeFunctions.length > 0, 'no narrative functions survive the v2 projection');
assert(narrativeFunctions.every(record => ia.publicNarrative(record.narrative_function) && !/\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\b/.test(ia.publicNarrative(record.narrative_function))), 'narrative function is not reader-facing');
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
assert(source.includes('public_knowledge_judgment'), 'v2 qualitative knowledge rendering is absent');
assert(source.includes('public_combined_assessment'), 'v2 combined ROOK assessment rendering is absent');
assert(source.includes('evidence_support'), 'component evidence rendering is absent');
assert(!source.includes('All deception scores'), 'legacy score filter remains active');
assert(!source.includes('dataset.deceptionScore'), 'legacy deception-score DOM contract remains active');
assert(source.includes('if (!section.isConnected || !map._mapPane) return;'), 'detached maps are not guarded before deferred viewport work');
assert(source.includes('technicalId: strike.id'));
assert(source.includes('technicalId: record.loss_id'));
assert(!source.includes('meta: `Stable strike record:'));
assert(!source.includes('meta: `Stable record:'));
assert(!/\b316\b/.test(source), 'current chronology count is hard-coded in frontend source');
for (const replay of ['current-update-20260824.js', 'current-update-20260825.js', 'current-update-20260826.js', 'current-update-20260827.js']) assert(!source.includes(replay));

console.log(`public Phase 9: PASS - ${model.chronology.length} chronology records, ${coverage.length} conflict days, side-separated losses, progressive imagery, human labels, ${ledger.records.length} Lie Ledger chains / ${propositions.length} claim instances, and resolvable source references verified`);

require('./public-phase10.test.js');
require('./public-final-polish.test.js');
