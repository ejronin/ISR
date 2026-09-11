'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath));
const json = relativePath => JSON.parse(read(relativePath).toString('utf8'));
const normalizedHash = relativePath => {
  const raw = read(relativePath);
  const text = raw.toString('utf8').replace(/\r\n?/g, '\n');
  return crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
};

const state = json('data/public-current-state.json');
const canonicalState = json('data/canonical-current-state-v2.json');
assert.equal(state.schema_version, '2.0');
assert.equal(state.artifact_role, 'DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL');
assert.equal(state.release.repository, 'ejronin/ISR');
assert.equal(Object.hasOwn(state.release, 'approved_baseline_sha'), false);
assert.equal(Object.hasOwn(state.release, 'canonical_migration_head'), false);
assert.equal(Object.hasOwn(state.release, 'canonical_state_identity'), false);
assert.equal(state.release.current_osint_cutoff, canonicalState.release.current_osint_cutoff);
assert.equal(state.release.current_osint_cutoff_display, canonicalState.release.current_osint_cutoff_display);
assert.equal(
  state.canonical_lineage.migration_boundary.accepted_phase3_head,
  'b6dabf7d9dc346a81afc9ba4a9074c481e70e02a'
);
assert.equal(state.canonical_lineage.path, 'data/canonical-current-state-v2.json');
assert.equal(state.release.canonical_state_identity_v2, canonicalState.release.canonical_state_identity_v2);
assert.equal(Object.hasOwn(state.release, 'generated_at'), false);

assert.deepEqual(
  state.input_packages.map(item => [item.key, item.contribution, item.cumulative_chronology_records]),
  [
    ['historical_base', 98, 98],
    ['aug_24_overlay', 10, 108],
    ['aug_25_overlay', 8, 116],
    ['aug_25_late_overlay', 1, 117],
    ['aug_26_overlay', 4, 121],
    ['historical_reconciliation', 81, 202],
    ['aug_27_overlay', 3, 205],
  ]
);
assert.equal(state.counts.historical_base, 98);
assert.equal(state.counts.historical_reconciliation, 81);
assert.equal(state.counts.aug_27_overlay, 3);
assert.equal(state.counts.chronology_records, canonicalState.chronology.length);
assert.equal(state.chronology.length, canonicalState.chronology.length);

const eventIds = new Set();
const sourceIds = new Set(state.sources.records.map(item => item.source_id));
const sourceVariants = new Set(state.sources.records.flatMap(item => item.variants.map(variant => variant.variant_key)));
assert.equal(sourceIds.size, state.sources.records.length);
assert.equal(sourceIds.size, canonicalState.sources.records.length);
for (const item of state.chronology) {
  assert(!eventIds.has(item.event_id), `duplicate event ID: ${item.event_id}`);
  eventIds.add(item.event_id);
  assert.equal(item.event.event_id, item.event_id);
  assert.equal(item.timeline.event_id, item.event_id);
  assert(Array.isArray(item.provenance) && item.provenance.length > 0);
  assert.equal(typeof item.provenance[0], 'object');
  assert(item.source_ids.every(sourceId => sourceIds.has(sourceId)), `unresolved event source: ${item.event_id}`);
  assert.deepEqual(item.source_references.map(reference => reference.source_id), item.source_ids);
  assert(item.source_references.every(reference => {
    if (reference.variant_key) return sourceVariants.has(reference.variant_key);
    return state.sources.records.find(sourceItem => sourceItem.source_id === reference.source_id)?.resolution === 'PROVENANCE_SCOPED_VARIANTS_REQUIRED';
  }), `unresolved event source variant: ${item.event_id}`);
}

const scopedSources = state.sources.records.filter(item => item.resolution === 'PROVENANCE_SCOPED_VARIANTS_REQUIRED');
assert(scopedSources.every(item => item.record === null && item.variants.length > 1 && item.field_conflicts.length > 0));

for (const input of state.input_files) {
  assert.equal(input.hash_basis, 'UTF8_LF_NORMALIZED');
  assert.equal(normalizedHash(input.path), input.sha256, `input hash mismatch: ${input.path}`);
  assert(input.roles.length > 0, `input role missing: ${input.path}`);
}
for (const [key, dataset] of Object.entries(state.datasets)) {
  if (dataset.hash_basis === 'CANONICAL_DATASET_PAYLOAD_JSON') {
    assert.match(dataset.sha256, /^[a-f0-9]{64}$/, `dataset payload hash malformed: ${key}`);
    assert.equal(dataset.path, 'data/canonical-current-state-v2.json', `Gate 3 dataset lineage mismatch: ${key}`);
  } else {
    assert.equal(normalizedHash(dataset.path), dataset.sha256, `dataset input hash mismatch: ${key}`);
  }
}

assert(state.datasets['gate3.casualties']);
assert(state.datasets['gate3.agreements']);
assert(state.datasets['gate3.diplomacy']);
assert(state.datasets['gate3.facilities']);
assert(state.datasets['gate3.movements']);
assert(state.datasets['gate3.shipping']);
assert(state.datasets['gate3.economics']);
assert(state.datasets['gate3.gaps']);
assert(state.datasets['gate3.lie_ledger']);
assert(state.datasets['gate3.narrative_families']);
assert(state.datasets['gate3.information_chains']);
assert(state.datasets['gate3.daily_coverage']);
assert(state.datasets['gate3.legacy_dispositions']);
assert(state.datasets['gate3.side_ledger_dispositions']);
assert(state.datasets['gate3.source_reliability']);

assert(state.page_data.start_here.dataset_keys.includes('gate3.gaps'));
assert(state.page_data.timeline.dataset_keys.includes('gate3.daily_coverage'));
assert(state.page_data.military_record.dataset_keys.includes('gate3.casualties'));
assert(state.page_data.military_record.dataset_keys.includes('gate3.facilities'));
assert(state.page_data.military_record.dataset_keys.includes('gate3.movements'));
assert(state.page_data.hormuz_economy.dataset_keys.includes('gate3.shipping'));
assert(state.page_data.hormuz_economy.dataset_keys.includes('gate3.economics'));
assert(state.page_data.diplomacy_mou.dataset_keys.includes('gate3.agreements'));
assert(state.page_data.diplomacy_mou.dataset_keys.includes('gate3.diplomacy'));
assert(state.page_data.claims_sources.dataset_keys.includes('gate3.lie_ledger'));
assert(state.page_data.claims_sources.dataset_keys.includes('gate3.narrative_families'));
assert(state.page_data.claims_sources.dataset_keys.includes('gate3.information_chains'));
assert(state.page_data.claims_sources.dataset_keys.includes('gate3.source_reliability'));

assert.equal(state.integrity.browser_replays_update_packets, false);
assert.equal(state.integrity.phase9_routes_consume_gate3_state, true);
assert.equal(state.integrity.current_foundation_direct_from_canonical_v2, true);
assert.equal(state.integrity.historical_public_v1_compiler_in_active_input_graph, false);

console.log(
  `public-current-state: PASS - ${state.chronology.length} records; ${state.sources.records.length} sources; ` +
  `${Object.keys(state.datasets).length} datasets; canonical-v2 direct foundation verified`
);
