'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ia = require('../js/public-ia.js');
const root = path.resolve(__dirname, '..');
execFileSync(process.env.PYTHON || 'python', ['tests/gate3-v2-mutable-current-invariants.test.py'], { cwd: root, stdio: 'inherit' });
const model = JSON.parse(fs.readFileSync(path.join(root, 'data/public-current-state.json'), 'utf8'));
const canonicalManifest = JSON.parse(fs.readFileSync(path.join(root, 'data/canonical-ledger/manifest-v2.json'), 'utf8'));
const payload = key => model.datasets[key] && model.datasets[key].payload;
const records = key => ia.recordArray(payload(key));
const sourceIdSet = new Set((model.sources && model.sources.records || []).map(item => item.source_id));

assert.equal(model.schema_version, '2.0');
assert.equal(model.artifact_role, 'DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL');
assert(model.release && model.release.release_identity);
assert.equal(model.release.current_osint_cutoff, canonicalManifest.current_evidence_cutoff);
const coverage = records('gate3.daily_coverage');
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

assert.equal(records('current.material_losses').length, model.counts.material_loss_records);
assert.equal(records('current.relationships').length, model.counts.relationship_records);
assert.equal(records('gate3.source_reliability').length, model.counts.gate3_source_reliability_records);
assert.equal(records('gate3.gaps').length, (model.entities.gaps || []).length);
assert.equal(records('gate3.casualties').length, (model.entities.casualties || []).length);

// Lie Ledger v2: public primary object is a narrative/proposition chain, never a flat score row.
const ledger = payload('gate3.lie_ledger');
assert.equal(ledger.schema_version, '2.0');
assert.equal(ledger.primary_object, 'NARRATIVE_PROPOSITION_CHAIN');
assert.equal(ledger.governance_version, model.release.lie_ledger_governance_version);
assert.equal(ledger.contract_version, model.release.lie_ledger_contract_version);
assert.equal(ledger.contract_path, model.release.lie_ledger_contract_path);
assert(!Object.hasOwn(ledger, 'authority'), 'public Lie Ledger must not expose persona authority');
assert.equal(ledger.blocked_assessment_policy, 'WITHHOLD_UNQUALIFIED_KNOWLEDGE_NOT_FACTUAL_STATUS');
assert.equal(ledger.records.length, model.counts.gate3_lie_ledger_chains);
assert.equal(ledger.metrics.narrative_chains, ledger.records.length);


assert(Array.isArray(ledger.reader_cards) && ledger.reader_cards.length > 0, 'reader narrative-card projection is missing');
assert(Array.isArray(ledger.reader_families), 'reader narrative-family projection is missing');
const readerAccusations = ledger.reader_cards.filter(card => card.lie_ledger_accusation !== false);
const readerContexts = ledger.reader_cards.filter(card => card.lie_ledger_accusation === false);
assert.equal(readerAccusations.length, model.counts.gate3_lie_ledger_reader_narratives);
assert.equal(readerContexts.length, model.counts.gate3_lie_ledger_reader_contexts);
assert.equal(ledger.reader_metrics.narrative_cards, readerAccusations.length);
assert.equal(ledger.reader_metrics.context_cards, readerContexts.length);

const readerCard = chainId => ledger.reader_cards.find(card => card.chain_id === chainId);
const readerRecord = (chainId, predicate) => (readerCard(chainId)?.proposition_records || []).find(predicate);
const f15eCard = readerCard('CH-F15E-CSAR-URANIUM');
assert(f15eCard && f15eCard.lie_ledger_accusation, 'F-15E / CSAR narrative is not one accusation card');
assert((f15eCard.proposition_records || []).some(record => record.truth_adjudication === 'SUPPORTED'),
  'F-15E narrative lost its independently supported branch');
assert((f15eCard.proposition_records || []).some(record => record.truth_adjudication === 'FALSE'),
  'F-15E narrative lost its independently false branch');

const aggregateCard = readerCard('CH-AIRCRAFT-KILL-AGGREGATES');
assert(aggregateCard, 'aircraft aggregate narrative card is missing');
for (const originalId of ['IR-CLM-0601', 'IR-CLM-0602', 'IR-CLM-0603', 'IR-CLM-0605']) {
  assert((aggregateCard.proposition_records || []).some(record => record.original_claim_id === originalId || record.claim_id === originalId),
    'aircraft aggregate narrative lost ' + originalId);
}
const mq52 = readerRecord('CH-AIRCRAFT-KILL-AGGREGATES', record => record.claim_id === 'CLM-IRGC-QESHM-MQ9-52-20260916');
const mq53 = readerRecord('CH-AIRCRAFT-KILL-AGGREGATES', record => record.claim_id === 'CLM-IRGC-QESHM-MQ9-53-20260917');
assert(mq52 && mq53, 'current Qeshm cumulative MQ-9 branches are missing');
for (const pair of [['52nd', mq52], ['53rd', mq53]]) {
  const label = pair[0], record = pair[1];
  assert.equal(record.truth_adjudication, 'UNRESOLVED', label + ' MQ-9 truth enum was improperly upgraded');
  assert.equal(record.evidence_disposition, 'UNSUBSTANTIATED', label + ' MQ-9 exact-count burden finding is missing');
  assert.match(record.public_combined_assessment || '', /UNSUBSTANTIATED EXACT COUNT/);
  assert.equal(record.public_knowledge_judgment, 'NOT_ASSESSABLE', label + ' MQ-9 exact count was improperly given a lie-knowledge finding');
  assert.match(record.public_combined_assessment || '', /NO LIE FINDING/, label + ' MQ-9 public disposition lost the accepted no-Lie boundary');
}
assert.match(mq52.reader_reason || '', /at least 45/i, '52nd MQ-9 reader explanation lost the accepted independent lower bound');

const qeshm16 = readerRecord('CH-AIRCRAFT-KILL-AGGREGATES', record => record.claim_id === 'CLM-IRGC-QESHM-MQ9-LOSS-20260916');
const qeshm17 = readerRecord('CH-AIRCRAFT-KILL-AGGREGATES', record => record.claim_id === 'CLM-IRGC-QESHM-MQ9-LOSS-20260917');
for (const pair of [['Sep. 16', qeshm16], ['Sep. 17', qeshm17]]) {
  const label = pair[0], record = pair[1];
  assert(record, label + ' individual Qeshm loss is missing');
  assert.equal(record.truth_adjudication, 'UNRESOLVED');
  assert.match(record.public_combined_assessment || '', /UNVERIFIED/i, label + ' individual loss did not remain unverified');
}

const aircraft210 = readerRecord('CH-AIRCRAFT-KILL-AGGREGATES', record => record.claim_instance_id === 'CI-IR-CLM-0605-P01');
assert(aircraft210, '210-aircraft metric branch is missing');
assert.equal(aircraft210.truth_adjudication, 'MISLEADING');
assert.match(aircraft210.reader_reason || '', /down 210|target around 210/i);

const turkeyCausal = readerRecord('CH-TURKEY-MISSILE-DENIAL', record => record.claim_instance_id === 'CI-IR-CLM-0204-P01');
const turkeyEvolution = readerRecord('CH-TURKEY-MISSILE-DENIAL', record => record.claim_instance_id === 'CI-IR-CLM-0204-P02');
assert(turkeyCausal && turkeyEvolution, 'Turkey false-flag propositions are not independently projected');
assert.equal(turkeyCausal.truth_adjudication, 'UNRESOLVED');
assert.match(turkeyCausal.public_combined_assessment || turkeyCausal.combined_assessment || '', /UNSUBSTANTIATED/i);
assert.equal(turkeyEvolution.truth_adjudication, 'SUPPORTED');
assert.match(turkeyEvolution.public_combined_assessment || '', /NARRATIVE SUBSTITUTION/i);

const regionalFamily = ledger.reader_families.find(family => family.narrative_family_id === 'NF-FALSE-FLAG-REGIONAL');
assert(regionalFamily, 'regional false-flag narrative family is missing');
assert.equal(readerCard('CH-FALSE-FLAG-REGIONAL'), undefined, 'legacy regional false-flag bucket still renders as one continuous event card');
assert.equal(regionalFamily.member_chain_ids.length, 3);
for (const chainId of regionalFamily.member_chain_ids) {
  const member = readerCard(chainId);
  assert(member && member.narrative_family?.narrative_family_id === 'NF-FALSE-FLAG-REGIONAL',
    'false-flag family member is not preserved as a separate incident card: ' + chainId);
}

for (const chainId of ['CH-DENA-ADMISSION', 'CH-TANGSIRI-ADMISSION']) {
  const control = readerCard(chainId);
  assert(control && control.lie_ledger_accusation === false, chainId + ' is not isolated as a non-lie control');
}
const f15sa = readerCard('CH-RSAF-F15SA-MARIB-20260916');
assert(f15sa, 'Saudi F-15SA current causation narrative is missing');
assert((f15sa.proposition_records || []).some(record => /F-15SA/i.test(record.claim || record.proposition || '')));
assert((f15sa.proposition_records || []).some(record => /Saudi/i.test(record.claim || '')),
  'F-15SA reader data lost the Royal Saudi operator distinction');

const propositions = ledger.records.flatMap(chain => chain.proposition_records || []);
assert.equal(propositions.length, model.counts.gate3_lie_ledger_records);
assert.equal(ledger.metrics.unique_propositions, model.counts.gate3_lie_ledger_unique_propositions);
assert.equal(ledger.metrics.claim_instances, model.counts.gate3_lie_ledger_claim_instances);
assert(model.counts.gate3_lie_ledger_claim_instances <= propositions.length,
  'claim-instance denominator cannot exceed atomic proposition rows');
const adjudicated = propositions.filter(record => record.adjudication_status === 'EVIDENCE_ADJUDICATED');
const originatingClaimKeys = new Set(adjudicated.map(record => record.original_claim_id || record.claim_id || record.claim_instance_id));
assert.equal(originatingClaimKeys.size, model.counts.gate3_lie_ledger_claim_instances,
  'claim-instance count must reconcile to distinct evidence-adjudicated originating statements/instances');
const uniquePropositionIds = new Set(adjudicated.filter(record => record.counts_as_unique_proposition).map(record => record.proposition_id));
assert.equal(uniquePropositionIds.size, model.counts.gate3_lie_ledger_unique_propositions,
  'unique-proposition count must reconcile independently within the evidence-adjudicated scope');
assert(propositions.every(record => record.semantic_version === '2.0'));
assert(propositions.every(record => record.doctrine_version === ledger.governance_version));
assert(propositions.every(record => record.contract_version === ledger.contract_version));
assert(propositions.every(record => record.truth_adjudication));
assert(propositions.every(record => record.public_knowledge_judgment));
assert(propositions.every(record => record.public_combined_assessment));
assert(propositions.every(record => !Object.hasOwn(record, 'deception_score')), 'active public v2 propositions expose legacy deception_score');
assert(propositions.every(record => !Object.hasOwn(record, 'authority_status')), 'active public v2 propositions expose persona adjudication status');
assert(propositions.every(record => record.proposition_fidelity), 'proposition fidelity is missing');
assert(propositions.every(record => record.actor_role), 'originator/amplifier role is missing');

const falseWithoutLieThreshold = propositions.find(record =>
  record.truth_adjudication === 'FALSE' &&
  !['LIKELY_KNEW_FALSE', 'VERY_LIKELY_KNEW_FALSE', 'KNOWING_FALSEHOOD_ESTABLISHED'].includes(record.public_knowledge_judgment)
);
assert(falseWithoutLieThreshold, 'public regression corpus must preserve a FALSE proposition below the lie knowledge threshold');

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
  for (const sourceId of record.source_ids || []) {
    assert(sourceIdSet.has(sourceId), `Lie Ledger source_id does not resolve: ${sourceId}`);
  }
  if (record.publication_status === 'BLOCKED_EVIDENCE_COMPLETION') {
    assert.equal(record.canonical_assessment_withheld, true);
    assert.equal(record.public_combined_assessment, 'EVIDENCE COMPLETION REQUIRED');
    assert(record.truth_adjudication, 'blocked knowledge qualification must retain factual status');
    assert(!Object.hasOwn(record, 'knowledge_judgment'));
    assert(!Object.hasOwn(record, 'combined_assessment'));
  } else if (record.publication_status === 'PUBLIC_READY') {
    assert.equal(record.canonical_assessment_withheld, false);
  } else if (record.publication_status === 'NOT_REASSESSED') {
    assert.equal(record.canonical_assessment_withheld, true);
    assert.equal(record.public_knowledge_judgment, 'NOT_ASSESSED');
  }
}

assert(!/\b316\b/.test(fs.readFileSync(path.join(root, 'js/public-ia.js'), 'utf8')), 'current chronology count is hard-coded in frontend source');
const source = fs.readFileSync(path.join(root, 'js/public-ia.js'), 'utf8');
for (const replay of ['current-update-20260824.js', 'current-update-20260825.js', 'current-update-20260826.js', 'current-update-20260827.js']) assert(!source.includes(replay));

console.log(`public Phase 9: PASS - ${model.chronology.length} chronology records, ${coverage.length} conflict days, side-separated losses, progressive imagery, human labels, ${model.counts.gate3_lie_ledger_unique_propositions} Lie Ledger propositions across ${model.counts.gate3_lie_ledger_claim_instances} claim instances, and evidence-governed Lie Ledger source references verified`);

require('./public-phase10.test.js');
require('./public-final-polish.test.js');