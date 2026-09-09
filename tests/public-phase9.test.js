'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data/public-current-state.json'), 'utf8'));
const payload = key => model.datasets[key] && model.datasets[key].payload;
const records = key => {
  const value = payload(key);
  if (Array.isArray(value)) return value;
  return value && (value.records || value.items || value.events || value.entries) || [];
};
const sourceIdSet = new Set((model.sources && model.sources.records || []).map(item => item.source_id));
const referenceIds = value => {
  const result = new Set();
  const walk = node => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node)) {
      if (key === 'source_id' && typeof child === 'string') result.add(child);
      else if ((key === 'source_ids' || key === 'sources') && Array.isArray(child)) child.forEach(item => {
        if (typeof item === 'string') result.add(item);
        else walk(item);
      });
      else walk(child);
    }
  };
  walk(value);
  return result;
};

assert.equal(model.schema_version, '2.0');
assert.equal(model.artifact_role, 'DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL');
assert(model.release && model.release.release_identity);
assert.equal(model.release.current_osint_cutoff, '2026-09-06T14:10:43-04:00');
const coverage = records('gate3.daily_coverage');
assert.equal(coverage.length, 191);
assert.equal(coverage[0].date, '2026-02-28');
assert.equal(coverage.at(-1).date, model.release.current_osint_cutoff.slice(0, 10));
assert(coverage.every(row => row.coverage_scope === 'CONFLICT_DAY_1_THROUGH_CURRENT_EVIDENCE_CUTOFF'));
assert.equal(model.counts.gate3_daily_coverage_days, coverage.length);
assert(coverage.every((day, index) => day.date === new Date(Date.UTC(2026, 1, 28 + index)).toISOString().slice(0, 10)), 'wartime coverage contains a gap');
assert(model.chronology.some(item => item.timeline.date < coverage[0].date), 'prewar context is absent');

const chronologyIds = model.chronology.map(item => item.event_id);
assert.equal(new Set(chronologyIds).size, chronologyIds.length);
assert.equal(model.counts.chronology_records, model.chronology.length);
assert(model.chronology.every(item => item.event && item.timeline));
assert(model.chronology.every(item => item.event.event_date === item.timeline.date));
assert(model.chronology.every(item => Array.isArray(item.source_references)));

assert.equal(records('gate3.material_losses').length, model.counts.material_loss_records);
assert.equal(records('gate3.relationships').length, model.counts.relationship_records);
assert.equal(records('gate3.source_reliability').length, model.counts.gate3_source_reliability_records);
assert.equal(records('gate3.gaps').length, 19);
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
assert.equal(ledger.metrics.unique_propositions, model.counts.gate3_lie_ledger_unique_propositions);
assert.equal(ledger.metrics.claim_instances, model.counts.gate3_lie_ledger_claim_instances);
assert(model.counts.gate3_lie_ledger_claim_instances <= propositions.length,
  'claim-instance denominator cannot exceed atomic proposition rows');
const originatingClaimKeys = new Set(propositions.map(record => record.original_claim_id || record.claim_id || record.claim_instance_id));
assert.equal(originatingClaimKeys.size, model.counts.gate3_lie_ledger_claim_instances,
  'claim-instance count must reconcile to distinct originating statements/instances');
const uniquePropositionIds = new Set(propositions.filter(record => record.counts_as_unique_proposition).map(record => record.proposition_id));
assert.equal(uniquePropositionIds.size, model.counts.gate3_lie_ledger_unique_propositions,
  'unique-proposition count must reconcile independently of claim-instance count');
assert(propositions.every(record => record.semantic_version === '2.0'));
assert(propositions.every(record => record.doctrine_version === ledger.doctrine_version));
assert(propositions.every(record => record.contract_version === ledger.contract_version));
assert(propositions.every(record => record.truth_adjudication));
assert(propositions.every(record => record.public_knowledge_judgment));
assert(propositions.every(record => record.public_combined_assessment));
assert(propositions.every(record => !Object.hasOwn(record, 'deception_score')), 'active public v2 propositions expose legacy deception_score');
assert(propositions.every(record => record.proposition_fidelity), 'proposition fidelity is missing');
assert(propositions.every(record => record.actor_role), 'originator/amplifier role is missing');

const tanf = propositions.filter(record => record.chain_id === 'CH-TANF-JUL17');
if (tanf.length) {
  assert.equal(tanf.length, 3, 'al-Tanf statement must decompose into three atomic propositions');
  assert.equal(new Set(tanf.map(record => record.original_claim_id || record.claim_id || record.claim_instance_id)).size, 1,
    'al-Tanf atomic propositions must remain one originating claim instance');
  assert.equal(new Set(tanf.map(record => record.proposition_id)).size, 3,
    'al-Tanf proposition identities must remain atomic and unique');
}

for (const record of propositions) {
  const support = record.evidence_support || {};
  for (const ids of Object.values(support)) {
    for (const sourceId of ids || []) assert(sourceIdSet.has(sourceId), `Lie Ledger evidence ref does not resolve: ${sourceId}`);
  }
  if (record.publication_status === 'BLOCKED_EVIDENCE_COMPLETION') {
    assert.equal(record.canonical_rook_assessment_withheld, true);
    assert.equal(record.public_combined_assessment, 'EVIDENCE COMPLETION REQUIRED');
    assert(!Object.hasOwn(record, 'knowledge_judgment'));
    assert(!Object.hasOwn(record, 'combined_assessment'));
  }
}

const publicSourceRefs = referenceIds(model.datasets);
for (const sourceId of publicSourceRefs) assert(sourceIdSet.has(sourceId), `public dataset source does not resolve: ${sourceId}`);

assert(!/\b316\b/.test(fs.readFileSync(path.join(root, 'js/public-ia.js'), 'utf8')), 'current chronology count is hard-coded in frontend source');
const source = fs.readFileSync(path.join(root, 'js/public-ia.js'), 'utf8');
for (const replay of ['current-update-20260824.js', 'current-update-20260825.js', 'current-update-20260826.js', 'current-update-20260827.js']) assert(!source.includes(replay));

console.log(`public Phase 9: PASS - ${model.chronology.length} chronology records, ${coverage.length} conflict days, side-separated losses, progressive imagery, human labels, ${model.counts.gate3_lie_ledger_unique_propositions} Lie Ledger propositions across ${model.counts.gate3_lie_ledger_claim_instances} claim instances, and resolvable source references verified`);

require('./public-phase10.test.js');
require('./public-final-polish.test.js');