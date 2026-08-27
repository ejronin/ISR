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
assert.equal(state.schema_version, '1.0');
assert.equal(state.artifact_role, 'DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL');
assert.equal(state.release.repository, 'ejronin/ISR');
assert.equal(state.release.approved_baseline_sha, '9a93eea6afb1ba2f3899e96dc72e2e66071d41b1');
assert.equal(state.release.current_osint_cutoff, '2026-08-27T08:25:00-04:00');
assert.equal(state.release.current_osint_cutoff_display, '2026-08-27 08:25 ET');
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
assert.equal(state.counts.chronology_records, 205);
assert.equal(state.chronology.length, 205);

const eventIds = new Set();
const sourceIds = new Set(state.sources.records.map(item => item.source_id));
const sourceVariants = new Set(state.sources.records.flatMap(item => item.variants.map(variant => variant.variant_key)));
assert.equal(sourceIds.size, state.sources.records.length);
assert.equal(sourceIds.size, 362);
for (const item of state.chronology) {
  assert(!eventIds.has(item.event_id), `duplicate event ID: ${item.event_id}`);
  eventIds.add(item.event_id);
  assert.equal(item.event.event_id, item.event_id);
  assert.equal(item.timeline.event_id, item.event_id);
  assert(item.provenance?.event?.path && Number.isInteger(item.provenance.event.index));
  assert(item.provenance?.timeline?.path && Number.isInteger(item.provenance.timeline.index));
  assert(item.source_ids.every(sourceId => sourceIds.has(sourceId)), `unresolved event source: ${item.event_id}`);
  assert.deepEqual(item.source_references.map(reference => reference.source_id), item.source_ids);
  assert(item.source_references.every(reference => sourceVariants.has(reference.variant_key)), `unresolved event source variant: ${item.event_id}`);
}

const scopedSources = state.sources.records.filter(item => item.resolution === 'PROVENANCE_SCOPED_VARIANTS_REQUIRED');
assert.equal(scopedSources.length, 5);
assert(scopedSources.every(item => item.record === null && item.variants.length > 1 && item.field_conflicts.length > 0));

for (const input of state.input_files) {
  assert.equal(input.hash_basis, 'UTF8_LF_NORMALIZED');
  assert.equal(normalizedHash(input.path), input.sha256, `input hash mismatch: ${input.path}`);
  assert(input.roles.length > 0, `input role missing: ${input.path}`);
}
for (const [key, dataset] of Object.entries(state.datasets)) {
  assert.equal(normalizedHash(dataset.path), dataset.sha256, `dataset hash mismatch: ${key}`);
  assert(dataset.source_references.every(reference => reference.variant_keys.every(variantKey => sourceVariants.has(variantKey))), `dataset source variant mismatch: ${key}`);
}

assert.deepEqual(
  Object.keys(state.page_data).sort(),
  ['claims_sources', 'diplomacy_mou', 'hormuz_economy', 'military_record', 'objectives_position_changes', 'start_here', 'timeline']
);
const availableData = new Set([...Object.keys(state.datasets), 'current.chronology', 'current.sources']);
for (const [page, mapping] of Object.entries(state.page_data)) {
  assert(mapping.dataset_keys.length > 0, `page dataset mapping empty: ${page}`);
  assert(mapping.dataset_keys.every(key => availableData.has(key)), `page dataset mapping unresolved: ${page}`);
}

assert.equal(state.integrity.duplicate_event_ids, 0);
assert.deepEqual(state.integrity.unresolved_chronology_source_ids, []);
assert.deepEqual(state.integrity.unresolved_page_dataset_source_ids, []);
assert.equal(state.integrity.canonical_inputs_modified, false);
assert.equal(state.integrity.generated_timestamp_included, false);

console.log('public-current-state consumer test: PASS - 205 unique events, 362 sources, provenance and page-data mappings verified');
