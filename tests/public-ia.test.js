'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ia = require('../js/public-ia.js');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data', 'public-current-state.json'), 'utf8'));

const expectedPrimary = [
  'Start Here',
  'Timeline',
  'Military Record',
  'Hormuz & Economy',
  'Talks & June Agreement',
  'What Each Side Wanted',
  'Claims & Evidence'
];
assert.deepEqual(ia.PRIMARY_SECTIONS.map(section => section.label), expectedPrimary);

const expectedSecondary = {
  start: ['Overview', "Who's Involved"],
  timeline: ['War Timeline', 'Detailed Chronology'],
  military: ['Campaigns & Strikes', 'Bases & Infrastructure', 'Air, Missiles & Drones', 'Casualties & Losses', 'Damage Imagery'],
  hormuz: ['Why Hormuz Matters', 'Shipping & Trade', 'Oil & Economic Effects', 'Current Hormuz Talks'],
  talks: ['Talks & Agreements', 'June MOU', 'Nuclear Talks', 'Regional Diplomacy'],
  objectives: ['Objectives & Outcomes', 'Position Changes', "How Iran's Position Changed"],
  evidence: ['Claim Checks', 'Information Environment', 'Sources', 'How We Check the Evidence', 'Archive']
};
for (const [primary, labels] of Object.entries(expectedSecondary)) {
  assert.deepEqual(ia.routesForPrimary(primary).map(route => route.label), labels, `secondary navigation mismatch: ${primary}`);
}

assert.equal(ia.ROUTES.size, 25);
assert.equal(Object.keys(ia.PAGE_OWNERS).length, 25);
assert.equal(new Set([...ia.ROUTES.values()].map(route => route.path)).size, 25);
for (const route of ia.ROUTES.values()) {
  const href = ia.routeHref(route.key, { record: 'EV-1' });
  const parsed = ia.parseRoute(href);
  assert.equal(parsed.key, route.key, `route round trip failed: ${route.key}`);
  assert.equal(parsed.params.record, 'EV-1');
  assert(ia.PAGE_OWNERS[route.owner], `page owner missing: ${route.owner}`);
  const currentKeys = model.page_data[route.modelPage].dataset_keys;
  assert(route.dataKeys.every(key => currentKeys.includes(key)), `route uses data outside its current mapping: ${route.key}`);
  assert(route.dataKeys.every(key => !key.startsWith('legacy.')), `route maps legacy data: ${route.key}`);
  assert(route.related.every(key => ia.ROUTES.has(key)), `route has unresolved cross-link: ${route.key}`);
}
assert.equal(ia.parseRoute('#/not/a-route').key, 'start.overview');
assert(ia.validateRegistry(model));

assert.deepEqual(
  ia.ActorIdentity.resolve('Iran'),
  { aliases: ['iran', 'iranian government'], label: 'Iran', flag: '🇮🇷', kind: 'state', subtitle: 'State actor' }
);
assert.equal(ia.ActorIdentity.resolve('U.S. Central Command').flag, '🇺🇸');
assert.equal(ia.ActorIdentity.resolve('Hezbollah').flag, '');
assert.equal(ia.ActorIdentity.resolve('Hezbollah').kind, 'non-state');
assert.equal(ia.ActorIdentity.resolve('Houthis / Ansar Allah').flag, '');
assert.equal(ia.ActorIdentity.resolve('United Nations Security Council').kind, 'international');

assert.deepEqual(
  ia.EvidenceStatus.viewModel({ support: 'STRONGLY_SUPPORTED', dispute: 'DISPUTED_BY_IRAN' }),
  { support: 'Strongly supported', dispute: 'Disputed by Iran' }
);
assert.deepEqual(ia.EvidenceStatus.viewModel({ support: null }), { support: 'Unknown', dispute: null });
assert.notEqual(ia.EvidenceStatus.viewModel({ support: null }).support, '0');
assert.equal(ia.displayTerm('CURRENT_OVERLAY', 'Unknown'), 'Unknown');
assert.equal(ia.displayTerm('NOT_YET_ADJUDICABLE', 'Unknown'), 'Unknown');

const publicLabels = [
  ...ia.PRIMARY_SECTIONS.map(section => section.label),
  ...[...ia.ROUTES.values()].flatMap(route => [route.label, route.title])
];
assert(publicLabels.every(label => !/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/.test(label)), 'public navigation exposes a machine token');

const iaSource = fs.readFileSync(path.join(root, 'js', 'public-ia.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js', 'public-app.js'), 'utf8');
for (const forbidden of ['MutationObserver', 'setInterval(', 'setTimeout(']) {
  assert(!iaSource.includes(forbidden), `page registry uses forbidden repair mechanism: ${forbidden}`);
  assert(!appSource.includes(forbidden), `public app uses forbidden repair mechanism: ${forbidden}`);
}

const css = fs.readFileSync(path.join(root, 'css', 'public-shell.css'), 'utf8');
assert.match(css, /@media \(max-width: 52rem\)/);
assert.match(css, /@media \(max-width: 32rem\)/);
assert.match(css, /min-width:\s*20rem/);
assert.match(css, /overflow-x:\s*hidden/);
assert.match(css, /\.skip-link:focus/);
assert.match(css, /:focus-visible/);

console.log('public IA contract: PASS - 7 primary sections, 25 deterministic page owners, current-model-only mappings, actor/evidence boundaries, cross-links, and mobile/accessibility foundations verified');
