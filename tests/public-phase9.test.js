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
assert.match(model.release.lie_ledger_claims_forensics_overlay_version || '', /^ATLAS-CLAIMS-FORENSICS-/,
  'public release does not pin Claims Forensics semantic overlay');
assert.match(model.release.lie_ledger_claims_forensics_full_sweep_version || '', /^ATLAS-CLAIMS-FORENSICS-SWEEP-/,
  'public release does not pin full Claims Forensics sweep');
assert.equal(model.release.lie_ledger_claims_forensics_contract_path, 'docs/LIE_LEDGER_LOGIC_AUTHORITY_CONTRACT.md');
assert.equal(model.integrity.lie_ledger_claims_forensics_release_pinned, true);
assert(!Object.hasOwn(ledger, 'authority'), 'public Lie Ledger must not expose persona authority');
assert.equal(ledger.blocked_assessment_policy, 'WITHHOLD_UNQUALIFIED_KNOWLEDGE_NOT_FACTUAL_STATUS');
assert.equal(ledger.records.length, model.counts.gate3_lie_ledger_chains);
assert.equal(ledger.metrics.narrative_chains, ledger.records.length);
const accusationChains = ledger.records.filter(chain =>
  chain.classification === 'ACCUSATION_CHAIN' &&
  chain.public_include_in_accusation_count === true
);
const controlChains = ledger.records.filter(chain =>
  chain.classification !== 'ACCUSATION_CHAIN' &&
  chain.public_include_in_accusation_count === false
);
assert.equal(accusationChains.length, 33, 'Lie Ledger accusation-chain denominator drifted');
assert.equal(controlChains.length, 14, 'Lie Ledger control-chain denominator drifted');
assert.equal(accusationChains.length + controlChains.length, ledger.records.length,
  'every current Lie Ledger chain must be explicitly classified as accusation or control');


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

const f15Chain = ledger.records.find(chain => chain.chain_id === 'CH-F15E-CSAR-URANIUM');
assert(f15Chain, 'F-15E / CSAR chain is missing');
assert.equal(f15Chain.public_finding?.label, 'Lie', 'F-15E chain-level finding must be explicit');
assert.match(f15Chain.plain_english_summary || '', /real F-15E/i, 'F-15E chain lacks plain-English factual anchor');
assert((f15Chain.how_we_know || []).length >= 5, 'F-15E chain lacks explicit plain-English inferential reasoning');
assert.match(f15Chain.event_baseline || '', /F-15E was lost/i, 'F-15E chain lacks established event baseline');
assert.match(f15Chain.terminal_event_state || '', /both crew were recovered/i, 'F-15E chain lacks terminal event state');
assert((f15Chain.open_evidence_gaps || []).length >= 1, 'F-15E chain must state genuine remaining evidence gaps');

const f15ByInstance = new Map((f15Chain.proposition_records || []).map(record => [record.claim_instance_id, record]));
assert.equal(f15ByInstance.get('CI-IR-CLM-0004-P01')?.truth_adjudication, 'SUPPORTED',
  'missing/evading airman must remain supported context');
assert.equal(f15ByInstance.get('CI-IR-CLM-0004-P02')?.truth_adjudication, 'FALSE',
  'capture proposition must be factually resolved false');
assert.match(f15ByInstance.get('CI-IR-CLM-0006-P01')?.proposition || '', /had not been captured or detained/i,
  'provincial IRGC denial must not retain positive-capture polarity');
assert.equal(f15ByInstance.get('CI-IR-CLM-0006-P01')?.relation_type, 'CORRECTION',
  'provincial IRGC denial must be modeled as a correction');
assert.equal(f15ByInstance.get('CI-IR-CLM-0007-P01')?.truth_adjudication, 'SUPPORTED',
  'real rescue-equipment loss must not inherit false causal attribution');
assert.equal(f15ByInstance.get('CI-IR-CLM-0009-P02')?.truth_adjudication, 'SUPPORTED',
  'Isfahan uranium presence must be separated from mission-purpose theory');
assert.equal(f15ByInstance.get('CI-IR-CLM-0010-P01')?.relation_type, 'NARRATIVE_SUBSTITUTION',
  'later nuclear-mission theory must retain its narrative-substitution relationship');

const qatarChain = ledger.records.find(chain => chain.chain_id === 'CH-QATAR-PILOTS');
assert(qatarChain, 'Qatar pilot/custody chain is missing');
assert.match(qatarChain.plain_english_summary || '', /aircraft and aircrew really were lost or went missing/i,
  'Qatar chain must preserve the physical-loss baseline');
const qatarByInstance = new Map((qatarChain.proposition_records || []).map(record => [record.claim_instance_id, record]));
assert.equal(qatarByInstance.get('CI-IR-CLM-0701-P01')?.truth_adjudication, 'SUPPORTED',
  'Qatar aircraft/aircrew-loss baseline must not inherit custody falsity');
assert.equal(qatarByInstance.get('CI-IR-CLM-0701-P02')?.truth_adjudication, 'FALSE',
  'secret-custody proposition must remain separately false');
assert.equal(qatarByInstance.get('CI-IR-CLM-0702-P01')?.relation_type, 'NARRATIVE_SUBSTITUTION',
  'Qatar obstruction allegation must be modeled as downstream narrative substitution');

const aggregateChain = ledger.records.find(chain => chain.chain_id === 'CH-AIRCRAFT-KILL-AGGREGATES');
assert(aggregateChain, 'aircraft/UAV aggregate chain is missing');
const aggregateByInstance = new Map((aggregateChain.proposition_records || []).map(record => [record.claim_instance_id, record]));
assert.notEqual(
  aggregateByInstance.get('CI-IR-CLM-0604-P01')?.proposition_id,
  aggregateByInstance.get('CI-IR-CLM-0604-P02')?.proposition_id,
  'Apr. 28 count and metric-integrity branches must not share one proposition identity'
);
assert.equal(aggregateByInstance.get('CI-IR-CLM-0604-P02')?.counts_as_unique_proposition, false,
  'metric-integrity inference must not inflate unique-proposition totals');
assert.equal(aggregateByInstance.get('CI-IR-CLM-0605-P01')?.counts_as_unique_proposition, false,
  'May 26 same-article metric correction must not duplicate the 210-downing proposition');
assert.match(aggregateByInstance.get('CI-PROP-IR-210-DOWNED-HEADLINE')?.proposition || '', /downed about 210 enemy aircraft/i,
  '210 headline node must adjudicate asserted content, not the observable fact that a headline existed');

const alUdeidChains = ledger.records.filter(chain =>
  chain.chain_id === 'CH-ALUDEID-BDA' || chain.chain_id === 'CHAIN-CL-ALUDEID'
);
assert.equal(alUdeidChains.length, 1, 'Al Udeid physical event must not exist as duplicate top-level chains');
assert.equal(alUdeidChains[0].chain_id, 'CH-ALUDEID-BDA');
assert((alUdeidChains[0].proposition_records || []).some(record => record.claim_instance_id === 'CI-CL-ALUDEID'),
  'legacy Al Udeid shorthand must survive as context inside the BDA chain');

for (const oldFalseFlag of ['CH-FALSE-FLAG-REGIONAL']) {
  assert(!ledger.records.some(chain => chain.chain_id === oldFalseFlag),
    'regional false-flag rhetoric must be a narrative family, not one physical event chain');
}
for (const incidentChain of [
  'CH-ARAMCO-FALSE-FLAG-20260302',
  'CH-ERBIL-KUWAIT-FALSE-FLAG-20260315',
  'CH-SHAHED-CLONE-FALSE-FLAG-20260315'
]) {
  assert(ledger.records.some(chain => chain.chain_id === incidentChain),
    `missing incident-specific false-flag chain: ${incidentChain}`);
}

const bushehr = propositions.find(record => record.claim_instance_id === 'CI-IR-CLM-0801-P01');
assert.equal(bushehr?.denominator_class, 'UNIQUE_ATOMIC_PROPOSITION',
  'Bushehr false aircraft-loss assertion must not be hidden as non-accusation context');
assert.equal(bushehr?.counts_as_unique_proposition, true);

for (const controlId of [
  'CH-DENA-ADMISSION',
  'CH-TANGSIRI-ADMISSION',
  'CHAIN-CL-HORMUZ-CONTROL',
  'CHAIN-LL-TRUMP-KHARG-AI-20260830',
  'CHAIN-LL-US-NOT-WAR-SMALL-POTATOES-20260904',
  'CHAIN-LL-IRAN-PREEMPTIVE-DOCTRINE-20260904',
  'CHAIN-LL-PAKNEJAD-KHARG-CONTINUED-OPS-20260906',
  'CHAIN-LL-IRAN-QALIBAF-ESCALATION-DOCTRINE-20260906',
  'CHAIN-LL-IRAN-DIVE-LD-CAPTURE-20260908'
]) {
  const chain = ledger.records.find(item => item.chain_id === controlId);
  assert(chain, `control chain missing from canonical audit model: ${controlId}`);
  assert.equal(chain.public_include_in_accusation_count, false,
    `control/non-accusation chain must not inflate accusation count: ${controlId}`);
}


const postCutoffByInstance = new Map(propositions.map(record => [record.claim_instance_id, record]));
for (const instance of [
  'CI-CLM-TRUMP-IRAN-PROBABLE-PIPELINE-20260912-P01',
  'CI-CLM-HOUTHI-SHARURAH-BASE-20260913-P01',
  'CI-CLM-IRGC-EL-GAIA-MINE-20260914-P01',
  'CI-CLM-IRGC-QESHM-MQ9-LOSS-20260916-P01',
  'CI-CLM-IRGC-QESHM-MQ9-52-20260916-P01',
  'CI-CLM-IRGC-QESHM-MQ9-LOSS-20260917-P01',
  'CI-CLM-IRGC-QESHM-MQ9-53-20260917-P01',
  'CI-CLM-HOUTHI-F15SA-CAUSATION-20260916-P01'
]) {
  assert(postCutoffByInstance.has(instance), `accepted post-Sep. 9 claim is absent from active Claims Forensics state: ${instance}`);
}

assert.equal(
  postCutoffByInstance.get('CI-CLM-IRGC-QESHM-MQ9-52-20260916-P01')?.truth_adjudication,
  'UNRESOLVED',
  '52nd MQ-9 ordinal must remain unsupported/unresolved rather than be auto-promoted to false'
);
assert.match(
  postCutoffByInstance.get('CI-CLM-IRGC-QESHM-MQ9-52-20260916-P01')?.public_combined_assessment || '',
  /NO LIE FINDING/i,
  '52nd MQ-9 ordinal must explicitly preserve no-Lie disposition'
);
assert.equal(
  postCutoffByInstance.get('CI-CLM-IRGC-QESHM-MQ9-53-20260917-P01')?.truth_adjudication,
  'UNRESOLVED',
  '53rd MQ-9 ordinal must remain unsupported/unresolved rather than be auto-promoted to false'
);

const omanDelay = propositions.filter(record =>
  record.proposition_id === 'PROP-SAUDI-REQUESTED-OMAN-DELAY-20260914'
);
assert.equal(omanDelay.length, 2, 'Saudi-requested-delay proposition must preserve one origin plus one repetition');
assert.equal(omanDelay.filter(record => record.counts_as_unique_proposition).length, 1,
  'Saudi-requested-delay repetition must not inflate unique-proposition totals');
assert.equal(omanDelay.filter(record => record.relation_type === 'REPETITION').length, 1);

const kingKhalid = propositions.filter(record =>
  (record.original_claim_id || record.claim_id) === 'CLM-HOUTHI-KING-KHALID-AIRBASE-BDA-20260914'
);
assert.equal(kingKhalid.length, 2, 'King Khalid claim must decompose occurrence from specific BDA');
assert.equal(kingKhalid.find(record => record.proposition_axis === 'ATTACK_OCCURRENCE')?.truth_adjudication, 'SUPPORTED');
assert.equal(kingKhalid.find(record => record.proposition_axis === 'BATTLE_DAMAGE_ASSESSMENT')?.truth_adjudication, 'UNRESOLVED');


const assetScorecard = propositions.find(record => record.claim_instance_id === 'CI-CL-IRGC-ASSET-LIST');
assert(assetScorecard, 'IRGC asset-scorecard case is missing');
assert.equal(assetScorecard.publication_status, 'PUBLIC_READY',
  'source-qualified IRGC asset scorecard parent must no longer be publication-blocked');
assert.equal(assetScorecard.canonical_assessment_withheld, false);
assert.equal(assetScorecard.counts_as_unique_proposition, false,
  'compound scorecard parent must not inflate the atomic proposition denominator');
assert.match(assetScorecard.public_combined_assessment || '', /DECOMPOSED/i);
assert((assetScorecard.source_ids || []).includes('SRC-E7D3837B67C4'),
  'asset scorecard parent must consume the canonical IRNA claim-origin source');
const assetAtoms = propositions.filter(record =>
  record.original_claim_id === 'CL-IRGC-ASSET-LIST' &&
  record.claim_instance_id !== 'CI-CL-IRGC-ASSET-LIST'
);
assert.equal(assetAtoms.length, 12, 'IRGC asset scorecard must expose twelve material atomic line items');
assert(assetAtoms.every(record => record.counts_as_unique_proposition === true));
assert(assetAtoms.every(record => record.truth_adjudication === 'UNRESOLVED'),
  'unreconciled exact asset counts must remain unresolved rather than be converted from no corroboration to falsity');
assert(assetAtoms.every(record => (record.evidence_support?.what_was_said || []).includes('SRC-E7D3837B67C4')));
assert(assetAtoms.every(record => /NO LIE FINDING/i.test(record.public_combined_assessment || '')),
  'unresolved scorecard line items must not manufacture Lie findings');

const kwi = propositions.find(record => record.claim_instance_id === 'CI-CL-KWI-PATRIOT');
assert(kwi, 'Kuwait Patriot-attribution proposition is missing');
assert.equal(kwi.publication_status, 'PUBLIC_READY');
assert.equal(kwi.truth_adjudication, 'FALSE');
assert.equal(kwi.public_knowledge_judgment, 'POSSIBLE_KNOWLEDGE');
assert.match(kwi.public_combined_assessment || '', /NO LIE FINDING/i);
assert((kwi.source_ids || []).includes('SRC-67995288F15E'));
assert((kwi.source_ids || []).includes('SRC-AB8D1A29D6A5'));
const kwiEvent = propositions.find(record => record.claim_instance_id === 'CI-CL-KWI-PATRIOT-EVENT-P01');
assert.equal(kwiEvent?.truth_adjudication, 'SUPPORTED',
  'real Kuwait airport damage must remain supported context separate from causal attribution');

const usDead = propositions.find(record => record.claim_instance_id === 'CI-CL-200-US-DEAD');
assert(usDead, '>200 U.S. fatalities proposition is missing');
assert.equal(usDead.publication_status, 'PUBLIC_READY');
assert.equal(usDead.truth_adjudication, 'FALSE');
assert.equal(usDead.public_knowledge_judgment, 'INSUFFICIENT_EVIDENCE');
assert.match(usDead.public_combined_assessment || '', /NO LIE FINDING/i);
assert((usDead.source_ids || []).includes('SRC-BACFCAB20181'));
assert((usDead.source_ids || []).includes('SRC-691C9B6A352A'));
assert((usDead.source_ids || []).includes('SRC-B4C80D942772'));

const erbilParent = propositions.find(record => record.claim_instance_id === 'CI-CL-ERBIL-ALL');
assert(erbilParent, 'Erbil compound parent is missing');
assert.equal(erbilParent.counts_as_unique_proposition, false,
  'Erbil compound parent must not duplicate decomposed effect/scale propositions');
assert.equal(erbilParent.publication_status, 'PUBLIC_READY');
const erbilAtoms = propositions.filter(record =>
  record.original_claim_id === 'CL-ERBIL-ALL' &&
  record.claim_instance_id !== 'CI-CL-ERBIL-ALL'
);
assert.equal(erbilAtoms.length, 4, 'Erbil claim must decompose occurrence, damage, functional effect and near-total scale');
assert.equal(erbilAtoms.find(record => record.proposition_axis === 'ATTACK_OCCURRENCE')?.truth_adjudication, 'SUPPORTED');
assert.equal(erbilAtoms.find(record => record.proposition_axis === 'PHYSICAL_EFFECT')?.truth_adjudication, 'PARTLY_TRUE');
assert.equal(erbilAtoms.find(record => record.proposition_axis === 'FUNCTIONAL_EFFECT')?.truth_adjudication, 'MISLEADING');
assert.equal(erbilAtoms.find(record => record.proposition_axis === 'SCALE')?.truth_adjudication, 'MISLEADING');
for (const row of erbilAtoms.filter(record => record.counts_as_unique_proposition)) {
  assert.equal(row.public_knowledge_judgment, 'INSUFFICIENT_EVIDENCE');
  assert.match(row.public_combined_assessment || '', /NO LIE FINDING/i);
}

const mediaArtifacts = propositions.filter(record => record.denominator_class === 'MEDIA_ARTIFACT');
for (const mediaId of ['MED-001','MED-002','MED-003','MED-004','MED-005','MED-006','MED-007']) {
  const row = mediaArtifacts.find(record => record.claim_id === mediaId);
  assert(row, `missing false-media forensic branch: ${mediaId}`);
  assert.equal(row.truth_adjudication, 'FALSE');
  assert.equal(row.public_knowledge_judgment, 'NOT_ASSESSABLE');
  assert.equal(row.counts_as_unique_proposition, false,
    `false media without official provenance must not inflate unique-Lie proposition counts: ${mediaId}`);
  assert.match(row.public_combined_assessment || '', /OFFICIAL ORIGIN NOT ESTABLISHED/i);
}
const qatarAi = mediaArtifacts.find(record => record.claim_id === 'MED-007');
assert(qatarAi, 'Qatar AI radar-image branch is missing');
assert((qatarAi.source_ids || []).includes('SRC-B56BDBD8628F'));
assert((qatarAi.source_ids || []).includes('SRC-81C038608946'));
assert((qatarAi.source_ids || []).includes('SRC-551A9C2DB97C'),
  'Qatar false-media branch must preserve separate real-damage context');
assert.match(qatarAi.actor || '', /official.*not established/i,
  'Qatar fake image must not be attributed to an official military/government origin');

for (const chain of ledger.records) {
  assert(chain.logic_graph, `missing machine logic graph for chain: ${chain.chain_id}`);
  assert.equal(chain.logic_graph.chain_id, chain.chain_id);
  assert.equal(chain.logic_graph.graph_type, 'CLAIM_EVIDENCE_ADJUDICATION');
  assert.equal(chain.logic_graph.claim_node_count, (chain.proposition_records || []).length,
    `logic graph claim-node count drifted: ${chain.chain_id}`);
  const graphClaimIds = new Set(
    (chain.logic_graph.nodes || [])
      .filter(node => node.type === 'ATOMIC_PROPOSITION')
      .map(node => node.claim_instance_id)
  );
  for (const record of chain.proposition_records || []) {
    assert(graphClaimIds.has(record.claim_instance_id),
      `logic graph omitted proposition ${record.claim_instance_id} from ${chain.chain_id}`);
    const graphNode = (chain.logic_graph.nodes || []).find(node => node.claim_instance_id === record.claim_instance_id);
    if (record.publication_status === 'BLOCKED_EVIDENCE_COMPLETION') {
      assert.equal(graphNode.knowledge_finding, 'WITHHELD_PENDING_EVIDENCE',
        `logic graph leaked blocked knowledge finding: ${record.claim_instance_id}`);
    }
  }
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