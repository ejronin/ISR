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
const canonicalState = json('data/canonical-current-state.json');
assert.equal(state.schema_version, '1.0');
assert.equal(state.artifact_role, 'DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL');
assert.equal(state.release.repository, 'ejronin/ISR');
assert.equal(state.release.approved_baseline_sha, '9a93eea6afb1ba2f3899e96dc72e2e66071d41b1');
assert.equal(state.release.current_osint_cutoff, '2026-08-27T08:25:00-04:00');
assert.equal(state.release.current_osint_cutoff_display, '2026-08-27 08:25 ET');
assert.equal(state.release.canonical_migration_head, 'b6dabf7d9dc346a81afc9ba4a9074c481e70e02a');
assert.equal(state.release.canonical_state_identity, canonicalState.release.canonical_state_identity);
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
  assert(Array.isArray(item.provenance) && item.provenance.length > 0);
  const inherited = item.provenance[0];
  assert(inherited.event?.path && Number.isInteger(inherited.event.index));
  assert(inherited.timeline?.path && Number.isInteger(inherited.timeline.index));
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
const legacyDatasets = Object.entries(state.datasets).filter(([key]) => key.startsWith('legacy.'));
assert(legacyDatasets.length > 0, 'historical reference datasets must be retained');
assert(legacyDatasets.every(([, dataset]) => dataset.role === 'HISTORICAL_REFERENCE_DATA'));

assert.deepEqual(
  Object.keys(state.page_data).sort(),
  ['claims_sources', 'diplomacy_mou', 'hormuz_economy', 'military_record', 'objectives_position_changes', 'start_here', 'timeline']
);
const availableData = new Set([...Object.keys(state.datasets), 'current.chronology', 'current.sources']);
for (const [page, mapping] of Object.entries(state.page_data)) {
  assert(mapping.dataset_keys.length > 0, `page dataset mapping empty: ${page}`);
  assert(mapping.dataset_keys.every(key => availableData.has(key)), `page dataset mapping unresolved: ${page}`);
  assert(mapping.dataset_keys.every(key => !key.startsWith('legacy.')), `page maps historical reference data as current: ${page}`);
  assert(mapping.dataset_keys.every(key => state.datasets[key]?.role !== 'HISTORICAL_REFERENCE_DATA'), `page maps a historical-reference role as current: ${page}`);
}

assert.equal(state.integrity.duplicate_event_ids, 0);
assert.deepEqual(state.integrity.unresolved_chronology_source_ids, []);
assert.deepEqual(state.integrity.unresolved_page_dataset_source_ids, []);
assert.equal(state.integrity.canonical_inputs_modified, false);
assert.equal(state.integrity.generated_timestamp_included, false);
assert.equal(state.integrity.canonical_state_stale, false);
assert.equal(state.integrity.browser_replays_update_packets, false);
assert.deepEqual(state.chronology, canonicalState.chronology);
assert.deepEqual(state.entities, canonicalState.entities);
assert.deepEqual(state.revision_history, canonicalState.revision_history);
assert.equal(state.datasets['current.claims'].payload.claims.length, canonicalState.counts.claim_records);
assert.equal(state.datasets['current.material_losses'].payload.records.length, canonicalState.counts.material_loss_records);

const requiredPreservedFacilities = new Set([
  'US-NSA-BHR', 'US-ARIFJAN', 'US-ALISALEM', 'US-BUEHRING', 'US-SHUAIBA-TOC', 'US-CAMPDOHA',
  'US-BUBIYAN', 'US-ALDHAFRA', 'US-JEBELALI', 'US-ERBIL', 'US-AINASAD', 'US-PRINCESULTAN',
  'US-MUWAFFAQ', 'US-INCIRLIK', 'US-ISA', 'US-RMELAN', 'US-QASRAK', 'US-TANF'
]);
const facilityPayload = state.datasets['ledger.facilities'].payload;
const liveFacilityIds = facilityPayload.facilities.map(record => record.facility_id);
assert.equal(liveFacilityIds.length, new Set(liveFacilityIds).size, 'live facility IDs must be unique');
assert.deepEqual(new Set(facilityPayload.repo_records_to_preserve), requiredPreservedFacilities, 'the reviewed preservation contract changed');
assert([...requiredPreservedFacilities].every(facilityId => liveFacilityIds.includes(facilityId)), 'a preserved facility is absent from live public state');
assert.equal(facilityPayload.materialization.contract_enforced, true);
assert.deepEqual(new Set(facilityPayload.materialization.preserved_live_ids), requiredPreservedFacilities);
for (const facilityId of requiredPreservedFacilities) {
  const facility = facilityPayload.facilities.find(record => record.facility_id === facilityId);
  assert.equal(facility.preservation_provenance.status, 'PRESERVED_NON_SUPERSEDED');
  assert.equal(facility.location.precision, 'COARSE_EXISTING_ATLAS_POINT');
}

const bdaRecords = state.datasets['ledger.bda_overlays'].payload.overlays;
assert(bdaRecords.every(record => liveFacilityIds.includes(record.facility_ref)), 'BDA facility reference must resolve through the live facility set');
assert(bdaRecords.every(record => !record.image_bounds && !record.georeferenced_bounds && !record.footprint && !record.corners), 'facility restoration must not manufacture BDA geometry');
const damageObservations = state.datasets['forensic.damage_observations'];
assert.equal(damageObservations.role, 'APPROVED_FORENSIC_DATA');
assert.equal(damageObservations.payload.records.length, 9);
assert.equal(new Set(damageObservations.payload.records.map(record => record.observation_id)).size, 9);
assert(damageObservations.payload.records.every(record => record.sources.every(sourceId => sourceIds.has(sourceId))), 'damage-observation provenance must resolve');
const facilityAudits = state.datasets['forensic.facility_claim_audits'].payload.records;
assert.equal(facilityAudits.length, 4);
assert(facilityAudits.every(record => liveFacilityIds.includes(record.facility_id)), 'facility claim-audit relationship must resolve');
assert(facilityAudits.every(record => record.propositions.every(proposition => proposition.disposition)), 'claim-audit dispositions must remain proposition-specific');
assert(state.page_data.military_record.dataset_keys.includes('forensic.damage_observations'));
assert.deepEqual(state.integrity.unresolved_bda_facility_refs, []);
assert.deepEqual(state.integrity.unresolved_facility_claim_audit_refs, []);

console.log('public-current-state consumer test: PASS - canonical current entities, 205 unique events, 362 sources, facility preservation, BDA references, damage observations, provenance and page-data mappings verified');
