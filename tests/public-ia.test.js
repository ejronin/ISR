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

const iran = ia.ActorIdentity.resolve('Iran');
assert.equal(iran.entityType, 'entity');
assert.equal(iran.affiliationType, 'state');
assert.equal(iran.parentState, 'Iran');
assert.equal(iran.flag, '🇮🇷');

const parliament = ia.ActorIdentity.resolve('Iranian parliament');
assert.equal(parliament.entityType, 'entity');
assert.equal(parliament.affiliationType, 'state-institution');
assert.equal(parliament.parentState, 'Iran');
assert.equal(parliament.flag, '🇮🇷');

assert.equal(new Set(ia.AFFILIATED_ACTORS.map(actor => actor.id)).size, ia.AFFILIATED_ACTORS.length, 'affiliation IDs must be unique');
assert.equal(new Set(ia.AFFILIATED_ACTORS.flatMap(actor => actor.aliases)).size, ia.AFFILIATED_ACTORS.flatMap(actor => actor.aliases).length, 'affiliation aliases must be unique');

const qalibafEvent = model.chronology.find(item => item.event_id === 'CUR-20260827-002');
assert.match(qalibafEvent.event.summary, /parliament speaker Mohammad Baqer Qalibaf/i, 'Qalibaf role must come from approved current data');
const qalibaf = ia.ActorIdentity.resolve('Mohammad Baqer Qalibaf');
assert.equal(qalibaf.canonicalName, 'Mohammad Baqer Qalibaf');
assert.equal(qalibaf.entityType, 'person');
assert.equal(qalibaf.role, 'Parliament speaker');
assert.equal(qalibaf.affiliation, 'Iranian parliament');
assert.equal(qalibaf.affiliationType, 'state-institution');
assert.equal(qalibaf.parentState, 'Iran');
assert.equal(qalibaf.flag, '🇮🇷');
assert.notEqual(qalibaf.entityType, qalibaf.affiliationType, 'person/entity and affiliation type must remain separate axes');
assert.equal(ia.ActorIdentity.resolve('Mohammad Bagher Qalibaf').canonicalName, 'Mohammad Baqer Qalibaf');

const currentActors = new Set(model.chronology.flatMap(item => item.event.actors || []));
for (const name of ['Abbas Araghchi', 'Badr Albusaidi', 'Masoud Pezeshkian', 'Ali Abdollahi']) {
  assert(currentActors.has(name), `actor audit fixture is not present in the current chronology: ${name}`);
  assert.equal(ia.ActorIdentity.resolve(name).entityType, 'person', `named current person falls through: ${name}`);
  assert.notEqual(ia.ActorIdentity.resolve(name).affiliationType, 'unknown', `named current person's affiliation is unresolved: ${name}`);
}
for (const name of ['Central Bank of Iran', 'Iranian Armed Forces', 'Iranian state television', 'Persian Gulf Strait Authority', 'Syrian government', 'U.S. Congress', 'U.S. Department of Defense', 'U.S. Secret Service', 'USAFCENT']) {
  assert(currentActors.has(name), `institution audit fixture is not present in the current chronology: ${name}`);
  assert.equal(ia.ActorIdentity.resolve(name).entityType, 'entity', `current institution falls through: ${name}`);
  assert.equal(ia.ActorIdentity.resolve(name).affiliationType, 'state-institution', `current institution is not typed correctly: ${name}`);
}

const irgc = ia.ActorIdentity.resolve('IRGC');
assert.equal(irgc.entityType, 'entity');
assert.equal(irgc.affiliationType, 'state-institution');
assert.equal(irgc.parentState, 'Iran');
const irgcOfficial = ia.ActorIdentity.resolve('Hossein Mohebi');
assert.equal(irgcOfficial.entityType, 'person');
assert.equal(irgcOfficial.role, 'Spokesperson');
assert.equal(irgcOfficial.affiliation, 'IRGC');
assert.equal(irgcOfficial.affiliationType, 'state-institution');
assert.equal(irgcOfficial.flag, '🇮🇷');

const hezbollah = ia.ActorIdentity.resolve('Hezbollah');
assert.equal(hezbollah.affiliationType, 'non-state');
assert.equal(hezbollah.flag, '');
assert.equal(hezbollah.parentState, null);
const hezbollahOfficial = ia.ActorIdentity.resolve({ name: 'Affiliated Hezbollah person fixture', entityType: 'person', role: 'Official', affiliation: 'Hezbollah' });
assert.equal(hezbollahOfficial.entityType, 'person');
assert.equal(hezbollahOfficial.role, 'Official');
assert.equal(hezbollahOfficial.affiliation, 'Hezbollah');
assert.equal(hezbollahOfficial.affiliationType, 'non-state');
assert.equal(hezbollahOfficial.flag, '');

const houthis = ia.ActorIdentity.resolve('Houthis / Ansar Allah');
assert.equal(houthis.affiliationType, 'non-state');
assert.equal(houthis.flag, '');
assert.equal(houthis.parentState, null);
const houthiOfficial = ia.ActorIdentity.resolve({ name: 'Affiliated Houthi person fixture', entityType: 'person', role: 'Official', affiliation: 'Houthis / Ansar Allah' });
assert.equal(houthiOfficial.entityType, 'person');
assert.equal(houthiOfficial.role, 'Official');
assert.equal(houthiOfficial.affiliation, 'Houthis / Ansar Allah');
assert.equal(houthiOfficial.affiliationType, 'non-state');
assert.equal(houthiOfficial.flag, '');

assert.equal(ia.ActorIdentity.resolve('U.S. Central Command').flag, '🇺🇸');
assert.equal(ia.ActorIdentity.resolve('United Nations Security Council').affiliationType, 'international');
const unknownActor = ia.ActorIdentity.resolve('Unresolved actor example');
assert.equal(unknownActor.entityType, 'unresolved');
assert.equal(unknownActor.affiliation, null);
assert.equal(unknownActor.affiliationType, 'unknown');
assert.equal(unknownActor.flag, '');

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
