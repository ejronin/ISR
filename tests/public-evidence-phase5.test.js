'use strict';

const assert = require('assert');
const boot = require('../js/public-app.js');

function dataset(role = 'APPROVED_ANALYTICAL_DATA', payload = {}) {
  return { role, payload };
}

function modelFixture() {
  const datasets = {
    'current.actors': dataset('DERIVED_CANONICAL_CURRENT_ENTITY_STATE', []),
    'current.locations': dataset('DERIVED_CANONICAL_CURRENT_ENTITY_STATE', []),
    'current.claims': dataset('DERIVED_CANONICAL_CURRENT_ENTITY_STATE', { claims: [] }),
    'current.material_losses': dataset('DERIVED_CANONICAL_CURRENT_ENTITY_STATE', { records: [] }),
    'current.relationships': dataset('DERIVED_CANONICAL_CURRENT_ENTITY_STATE', []),
    'ledger.domain_assessments': dataset(),
    'ledger.unresolved': dataset(),
    'analysis.endgame_public_view': dataset(),
    'reconciliation.strikes': dataset(),
    'ledger.facilities': dataset(),
    'ledger.munitions_expenditure': dataset(),
    'ledger.attrition_series': dataset(),
    'analysis.casualty_corrections': dataset(),
    'ledger.bda_overlays': dataset(),
    'analysis.hormuz': dataset(),
    'ledger.shipping': dataset(),
    'analysis.oil_routes': dataset(),
    'ledger.economics': dataset(),
    'analysis.china_oil_shift': dataset(),
    'ledger.diplomacy': dataset(),
    'analysis.iran_messaging': dataset(),
    'ledger.agreements': dataset(),
    'analysis.iran_outcomes': dataset(),
    'analysis.endgame_us_objectives': dataset(),
    'analysis.endgame_objective_corrections': dataset(),
    'analysis.information_war_claims': dataset(),
    'analysis.influence_networks': dataset(),
    'archive.snapshot_index': dataset('ARCHIVE_INDEX_DATA')
  };
  const pageData = {};
  for (const contract of Object.values(boot.ROUTE_DATA_DEPENDENCIES)) {
    const current = pageData[contract.modelPage] || [];
    pageData[contract.modelPage] = Array.from(new Set([...current, ...contract.datasets]));
  }
  return {
    schema_version: '1.0',
    artifact_role: 'DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL',
    release: { release_identity: 'x', input_set_sha256: 'y', current_osint_cutoff: 'z' },
    counts: { chronology_records: 1, canonical_source_records: 3 },
    chronology: [{ event_id: 'EVT-1', provenance: [{}], source_references: [{ source_id: 'SRC-AAA', variant_key: 'v1' }] }],
    sources: { records: [
      { source_id: 'SRC-AAA', resolution: 'UNAMBIGUOUS', record: { title: 'Ordinary', url: 'https://example.com/a' }, variants: [{ variant_key: 'v1', record: { title: 'Ordinary', url: 'https://example.com/a' } }] },
      { source_id: 'SRC-CONFLICT', resolution: 'PROVENANCE_SCOPED_VARIANTS_REQUIRED', variants: [
        { variant_key: 'pkg-a', package_label: 'Package A', record: { title: 'A title', publisher: 'A outlet', url: 'https://example.com/a-version' } },
        { variant_key: 'pkg-b', package_label: 'Package B', record: { title: 'B title', publisher: 'B outlet', url: 'https://example.com/b-version' } }
      ] },
      { source_id: 'SRC-OTHER', resolution: 'UNAMBIGUOUS', record: { title: 'Other' }, variants: [] }
    ] },
    datasets,
    page_data: Object.fromEntries(Object.entries(pageData).map(([key, dataset_keys]) => [key, { dataset_keys }])),
    integrity: { duplicate_event_ids: 0, unresolved_chronology_source_ids: [] },
    entities: { actors: [], locations: [] }
  };
}

const model = modelFixture();
assert.strictEqual(Object.keys(boot.ROUTE_DATA_DEPENDENCIES).length, 25, 'all 25 routes declare dependencies');
assert.strictEqual(boot.validatePageDataMappings(model), true);
assert.strictEqual(boot.validateRouteDependencies(model), true);
assert(boot.ROUTE_DATA_DEPENDENCIES['talks.nuclear'].datasets.includes('analysis.iran_messaging'), 'Nuclear Talks declares Iran messaging');
assert(boot.ROUTE_DATA_DEPENDENCIES['talks.nuclear'].datasets.includes('analysis.endgame_public_view'), 'Nuclear Talks declares public-view evidence');

{
  const broken = modelFixture();
  delete broken.datasets['analysis.iran_messaging'];
  assert.throws(() => boot.validateRouteDependencies(broken), error => error.code === 'MODEL_INVALID' && /missing dataset/.test(error.message));
}

{
  const broken = modelFixture();
  broken.datasets['legacy.bad'] = dataset('HISTORICAL_REFERENCE_DATA');
  broken.page_data.timeline.dataset_keys.push('legacy.bad');
  assert.throws(() => boot.validatePageDataMappings(broken), error => error.code === 'MODEL_INVALID' && /legacy reference data/.test(error.message));
}

{
  const broken = modelFixture();
  broken.datasets['historical.bad'] = dataset('HISTORICAL_REFERENCE_DATA');
  broken.page_data.timeline.dataset_keys.push('historical.bad');
  assert.throws(() => boot.validatePageDataMappings(broken), error => error.code === 'MODEL_INVALID' && /historical-reference/.test(error.message));
}

{
  const broken = modelFixture();
  broken.page_data.timeline.dataset_keys.push('current.sources');
  assert.throws(() => boot.validatePageDataMappings(broken), error => error.code === 'MODEL_INVALID' && /duplicate dataset/.test(error.message));
}

{
  const windowObject = { location: { hash: '#/talks/nuclear' } };
  const ia = { parseRoute() { return { key: 'talks.nuclear' }; } };
  const guard = boot.createRouteGuardedModel(model, { ia, windowObject, state: { routeKey: 'talks.nuclear' } });
  guard.enable();
  assert(model.datasets['analysis.iran_messaging']);
  assert(guard.model.datasets['analysis.iran_messaging']);
  assert.throws(() => guard.model.datasets['ledger.shipping'], error => error.code === 'UNDECLARED_DATA_DEPENDENCY');
}

{
  const resolver = boot.createSourceResolver(model);
  const ordinary = resolver.resolve('SRC-AAA');
  assert.strictEqual(ordinary.status, 'resolved');
  assert.strictEqual(ordinary.selected.record.title, 'Ordinary');
  const conflicted = resolver.resolve('SRC-CONFLICT');
  assert.strictEqual(conflicted.status, 'variant-required');
  assert.strictEqual(conflicted.selected, undefined, 'conflicted source has no implicit global winner');
  assert.strictEqual(conflicted.variants.length, 2);
  const b = resolver.resolve('SRC-CONFLICT', 'pkg-b');
  assert.strictEqual(b.status, 'resolved');
  assert.strictEqual(b.selected.record.title, 'B title');
  assert.strictEqual(b.selected.record.url, 'https://example.com/b-version');
  assert.strictEqual(b.selected.packageLabel, 'Package B');
  assert.strictEqual(resolver.resolve('SRC-CONFLICT', 'missing').status, 'missing-variant');
}

{
  const future = modelFixture();
  future.sources.records.push({ source_id: 'SRC-FUTURE', resolution: 'UNAMBIGUOUS', record: { title: 'Future source' }, variants: [] });
  const resolver = boot.createSourceResolver(future);
  assert.strictEqual(resolver.resolve('SRC-FUTURE').selected.record.title, 'Future source', 'new model source propagates without a frontend constant');
}

assert.strictEqual(
  boot.rewritePublicLanguageText('Conflicting provenance-scoped variants remain separate.'),
  'Conflicting source versions are preserved separately.'
);
assert(boot.rewritePublicLanguageText('The browser receives the already assembled current state; it does not rebuild history by replaying dated updates.').includes('Later corrections remain temporally explicit'));

console.log('public-evidence-phase5: PASS');
