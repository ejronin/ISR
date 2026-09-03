'use strict';

const assert = require('node:assert/strict');
const boot = require('../js/public-app.js');
const ia = require('../js/public-ia.js');
const model = require('../data/public-current-state.json');

assert.equal(Object.keys(boot.ROUTE_DATA_DEPENDENCIES).length, 25, 'all 25 routes declare dependencies');
assert.equal(boot.validatePageDataMappings(model), true);
assert.equal(boot.validateRouteDependencies(model), true);

for (const [routeKey, contract] of Object.entries(boot.ROUTE_DATA_DEPENDENCIES)) {
  const generated = model.page_data[contract.modelPage].dataset_keys;
  assert(contract.datasets.every(key => generated.includes(key)), `${routeKey} exceeds generated ${contract.modelPage} authority`);
}

{
  const broken = structuredClone(model);
  broken.page_data.diplomacy_mou.dataset_keys = broken.page_data.diplomacy_mou.dataset_keys.filter(key => key !== 'analysis.iran_messaging');
  assert.throws(
    () => boot.validateRouteDependencies(broken),
    error => error.code === 'MODEL_INVALID' && /outside generated page-data owner/.test(error.message),
    'frontend contract must be a subset of independently generated page_data'
  );
}

{
  const view = boot.createRouteModelView(model, 'talks.nuclear');
  assert(view.datasets['analysis.iran_messaging']);
  assert.throws(() => view.datasets['ledger.shipping'], error => error.code === 'UNDECLARED_DATA_DEPENDENCY');
  assert.throws(() => view.accepted_updates, error => error.code === 'UNDECLARED_DATA_DEPENDENCY');
  assert.equal('enable' in view, false, 'route view must not have a disabled/bypass mode');
}

{
  const runtime = boot.createRouteRuntime(model, { ia });
  const first = runtime.forRoute('start.overview');
  assert(first.services.sourceResolver.size > 300);
  runtime.forRoute('talks.nuclear');
  assert.deepEqual(runtime.diagnostics(), { sourceIndexBuilds: 1, routeViewCount: 2, sourceCount: model.sources.records.length });
}

{
  const resolver = boot.createSourceResolver(model);
  const conflictedId = 'SRC-6843BB957E02';
  assert(resolver.conflictedSourceIds.includes(conflictedId));
  const conflicted = resolver.resolve(conflictedId);
  assert.equal(conflicted.status, 'variant-required');
  assert.equal(conflicted.selected, undefined, 'conflicted source has no implicit global winner');
  assert(conflicted.variants.length > 1);
  const explicit = resolver.resolve(conflictedId, conflicted.variants[0].variantKey);
  assert.equal(explicit.status, 'resolved');
  assert.equal(explicit.selected.variantKey, conflicted.variants[0].variantKey);
}

{
  const synthetic = {
    sources: { records: [{
      source_id: 'SRC-CURRENT',
      resolution: 'CANONICAL_UPDATE_CURRENT',
      record: { title: 'Accepted current metadata', url: 'https://example.com/current' },
      variants: [
        { variant_key: 'older', record: { title: 'Older metadata' } },
        { variant_key: 'current', record: { title: 'Accepted current metadata' } }
      ]
    }] }
  };
  const resolved = boot.createSourceResolver(synthetic).resolve('SRC-CURRENT');
  assert.equal(resolved.status, 'resolved', 'multiple variants alone must not create a conflict');
  assert.equal(resolved.selected.record.title, 'Accepted current metadata');
  assert.equal(resolved.selected.record.url, 'https://example.com/current');
}

{
  const synthetic = { sources: { records: [
    { source_id: 'SRC-REL', resolution: 'UNAMBIGUOUS', record: { title: 'Relative', url: '/not-absolute' }, variants: [] },
    { source_id: 'SRC-JS', resolution: 'UNAMBIGUOUS', record: { title: 'Script', url: 'javascript:alert(1)' }, variants: [] },
    { source_id: 'SRC-HTTPS', resolution: 'UNAMBIGUOUS', record: { title: 'Web', url: 'https://example.com/source' }, variants: [] }
  ] } };
  const resolver = boot.createSourceResolver(synthetic);
  assert.equal(resolver.resolve('SRC-REL').selected.record.url, null);
  assert.equal(resolver.resolve('SRC-JS').selected.record.url, null);
  assert.equal(resolver.resolve('SRC-HTTPS').selected.record.url, 'https://example.com/source');
}

{
  const locationResolver = boot.createLocationResolver(model);
  const event = model.chronology.find(item => (item.location_ids || []).some(id => {
    const value = locationResolver.resolve(id);
    return value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
  }));
  const location = event.location_ids.map(id => locationResolver.resolve(id)).find(value => value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude));
  assert(location && location.label && Number.isFinite(location.latitude) && Number.isFinite(location.longitude), 'canonical location_id must resolve to its entity');
  const unresolvedCoordinates = boot.createLocationResolver({ entities: { locations: [{ record: { location_id: 'LOC-UNKNOWN', canonical_name: 'Unknown coordinates', latitude: null, longitude: null } }] } }).resolve('LOC-UNKNOWN');
  assert.equal(unresolvedCoordinates.latitude, null, 'unknown latitude must not become zero');
  assert.equal(unresolvedCoordinates.longitude, null, 'unknown longitude must not become zero');
}

{
  const actorResolver = ia.ActorIdentity.createResolver(model);
  const qalibaf = actorResolver.resolve('Mohammad Baqer Qalibaf');
  assert.equal(qalibaf.entityType, 'person');
  assert.equal(qalibaf.role, 'Parliament speaker');
  assert.equal(qalibaf.affiliation, 'Iranian parliament');
  assert.equal(qalibaf.affiliationId, 'ACT-IRANIAN-PARLIAMENT');
  assert.equal(qalibaf.flag, '🇮🇷');
  assert.equal(actorResolver.resolve('IRGC').affiliationType, 'state-institution');
  assert.equal(actorResolver.resolve('Hezbollah').flag, '');
  assert.equal(actorResolver.resolve('Houthis / Ansar Allah').flag, '');
  assert.equal(actorResolver.resolve('Unresolved actor fixture').affiliationType, 'unknown');
}

{
  const future = structuredClone(model);
  future.sources.records.push({ source_id: 'SRC-FUTURE', resolution: 'UNAMBIGUOUS', record: { title: 'Future source' }, variants: [] });
  future.entities.actors.push({ record: { actor_id: 'ACT-FUTURE', aliases: ['future actor'], canonical_name: 'Future actor', entity_type: 'entity', affiliation_type: 'organization', flag: '', subtitle: 'Future organization' } });
  future.entities.locations.push({ record: { location_id: 'LOC-FUTURE', canonical_name: 'Future location', latitude: 1, longitude: 2, coordinate_precision: 'CITY' } });
  assert.equal(boot.createSourceResolver(future).resolve('SRC-FUTURE').selected.record.title, 'Future source');
  assert.equal(ia.ActorIdentity.createResolver(future).resolve('ACT-FUTURE').canonicalName, 'Future actor');
  assert.equal(boot.createLocationResolver(future).resolve('LOC-FUTURE').label, 'Future location');
  const event = structuredClone(future.chronology[0]);
  event.event_id = 'EV-FUTURE-PACKET';
  future.chronology.push(event);
  const futureView = boot.createRouteModelView(future, 'timeline.chronology');
  assert(futureView.chronology.some(item => item.event_id === 'EV-FUTURE-PACKET'), 'new chronology event must propagate without a frontend constant');
}

{
  const refined = structuredClone(model);
  const location = refined.entities.locations[0].record;
  location.canonical_name = 'Refined canonical location';
  location.latitude = 12.5;
  location.longitude = 42.25;
  const resolved = boot.createLocationResolver(refined).resolve(location.location_id);
  assert.deepEqual({ label: resolved.label, latitude: resolved.latitude, longitude: resolved.longitude }, { label: 'Refined canonical location', latitude: 12.5, longitude: 42.25 });

  const actor = refined.entities.actors.find(item => item.record.canonical_name === 'Mohammad Baqer Qalibaf').record;
  actor.role = 'Recorded refined role';
  assert.equal(ia.ActorIdentity.createResolver(refined).resolve(actor.actor_id).role, 'Recorded refined role');
}

{
  const temporal = ia.eventTemporalValues({
    event: { event_date: '2026-08-01', event_time: '03:00', first_reported: '2026-08-02' },
    revisions: [{ revision_id: 'UPD-TEST:EVENT:1', known_at: '2026-08-04T12:30:00-04:00', reason: 'Later accepted clarification' }]
  });
  assert.equal(temporal.occurred, '2026-08-01 03:00');
  assert.equal(temporal.knownBy, '2026-08-02');
  assert.deepEqual(temporal.revisionKnownAt, ['2026-08-04T12:30:00-04:00']);
  const status = ia.eventEvidenceValues({ event: { evidence_status: 'SUPPORTED_WITH_LIMITATIONS', dispute_posture: 'DISPUTED' } });
  assert.equal(status.support, 'SUPPORTED_WITH_LIMITATIONS');
  assert.equal(status.status, 'SUPPORTED_WITH_LIMITATIONS');
  assert.equal(status.dispute, 'DISPUTED');
  const canonicalShape = ia.eventEvidenceValues({
    event: {
      evidence_support: 'HIGH',
      evidence_status: 'SUPPORTED_WITH_LIMITATIONS',
      disputed_by: 'Recorded opposing party'
    }
  });
  assert.equal(canonicalShape.support, 'HIGH');
  assert.equal(canonicalShape.status, 'SUPPORTED_WITH_LIMITATIONS');
  assert.equal(canonicalShape.dispute, 'Recorded opposing party');
  assert.equal(canonicalShape.disputedBy, 'Recorded opposing party');
  const realStatusRecord = model.chronology.find(item => item.event && typeof item.event.evidence_status === 'string');
  const realStatus = ia.eventEvidenceValues(realStatusRecord);
  assert.equal(realStatus.support, realStatusRecord.event.evidence_status);
  assert.equal(realStatus.status, realStatusRecord.event.evidence_status);
}

console.log('public-evidence-phase5: PASS - generated authority, strict route views, provenance, actor/location/status and future-update behavior verified');
