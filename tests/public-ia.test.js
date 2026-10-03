'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ia = require('../js/public-ia.js');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data', 'public-current-state.json'), 'utf8'));

const expectedPrimary = [
  'Home',
  'War',
  'Themes',
  'Diplomacy & Outcomes',
  'Intelligence',
  'Sources'
];
assert.deepEqual(ia.PRIMARY_SECTIONS.map(section => section.label), expectedPrimary);

const expectedSecondary = {
  home: ['Overview', "Who's Involved"],
  war: ['Timeline', 'All Events', 'Campaigns & Strikes', 'Bases & Infrastructure', 'Air, Missiles & Drones', 'Casualties & Losses', 'Damage Images'],
  themes: ['Hormuz', 'Shipping & Trade', 'Oil & Economic Effects'],
  diplomacy: ['Overview', 'Current Hormuz Talks', 'June MOU', 'Nuclear Talks', 'Regional Diplomacy', 'Goals & Results', 'Position Changes', "Iran's Position"],
  intelligence: ['Claim Checks', 'Lie Ledger', 'Web of Lies'],
  sources: ['Source Library', 'Methodology', 'Archive']
};
for (const [primary, labels] of Object.entries(expectedSecondary)) {
  assert.deepEqual(ia.routesForPrimary(primary).map(route => route.label), labels, `secondary navigation mismatch: ${primary}`);
}

assert.equal(ia.ROUTES.size, 26);
assert.equal(Object.keys(ia.PAGE_OWNERS).length, 26);
assert.equal(new Set([...ia.ROUTES.values()].map(route => route.path)).size, 26);
const expectedPaths = {
  'start.overview': '/',
  'start.actors': '/home/actors/',
  'timeline.war': '/war/timeline/',
  'timeline.chronology': '/war/events/',
  'military.campaigns': '/war/campaigns/',
  'military.facilities': '/war/facilities/',
  'military.weapons': '/war/weapons/',
  'military.losses': '/war/losses/',
  'military.imagery': '/war/damage-images/',
  'hormuz.overview': '/themes/hormuz/',
  'hormuz.shipping': '/themes/shipping/',
  'hormuz.economy': '/themes/economy/',
  'hormuz.talks': '/diplomacy/hormuz/',
  'talks.overview': '/diplomacy/overview/',
  'talks.mou': '/diplomacy/june-mou/',
  'talks.nuclear': '/diplomacy/nuclear/',
  'talks.regional': '/diplomacy/regional/',
  'objectives.outcomes': '/diplomacy/outcomes/',
  'objectives.positions': '/diplomacy/positions/',
  'objectives.iran': '/diplomacy/iran-position/',
  'evidence.claims': '/intelligence/claims/',
  'evidence.information': '/intelligence/lie-ledger/',
  'evidence.web_of_lies': '/intelligence/wol/',
  'evidence.sources': '/sources/',
  'evidence.method': '/sources/methodology/',
  'evidence.archive': '/sources/archive/'
};
assert(Object.keys(ia.ROUTE_ALIASES).length >= 26, 'full legacy alias set is incomplete');
for (const [key, pathValue] of Object.entries(expectedPaths)) assert.equal(ia.ROUTES.get(key).path, pathValue, `logical path mismatch: ${key}`);
for (const [legacyPath, key] of Object.entries(ia.ROUTE_ALIASES)) {
  const parsed = ia.parseRoute(`#${legacyPath}?record=EV-1`);
  assert.equal(parsed.key, key, `legacy alias failed: ${legacyPath}`);
  assert.equal(parsed.params.record, 'EV-1', `legacy alias lost query state: ${legacyPath}`);
  assert.equal(parsed.aliased, true, `legacy alias was not identified as an alias: ${legacyPath}`);
}
const unknownRoute = ia.parseRoute('#/retired/evidence/path?record=EV-404');
assert.equal(unknownRoute.recognized, false, 'unknown route must be explicitly unrecognized');
assert.equal(unknownRoute.key, null, 'unknown route must not silently become Home');
assert.equal(unknownRoute.params.record, 'EV-404', 'unknown route diagnostics must preserve query state');
assert.deepEqual(
  ia.pageSectionsFor('start.overview').map(section => section.id),
  ['current-state', 'conflict-opening', 'latest-record', 'about', 'unresolved']
);
assert.deepEqual(
  ia.pageSectionsFor('military.campaigns').map(section => section.id),
  ['damage-effect', 'campaign-activity', 'strike-geography', 'physical-damage', 'operational-effect', 'developments']
);
assert.deepEqual(
  ia.pageSectionsFor('hormuz.shipping').map(section => section.id),
  ['observed-shipping', 'routes', 'alternative-paths', 'merchant-losses']
);
assert.deepEqual(
  ia.pageSectionsFor('evidence.claims').map(section => section.id),
  ['claim-checks']
);
assert.deepEqual(
  ia.pageSectionsFor('evidence.sources').map(section => section.id),
  ['source-context', 'browse-sources']
);
assert.deepEqual(
  ia.pageSectionsFor({ key: 'evidence.web_of_lies', params: { dossier: 'actor', source: 'SOURCE-1' } }).map(section => section.id),
  ['current-record', 'findings', 'claim-activity', 'chronology', 'network-claim-trails']
);
assert.deepEqual(
  ia.pageSectionsFor({ key: 'evidence.information', params: { case: 'CASE-1' } }).map(section => section.id),
  ['claim', 'finding', 'evidence', 'development', 'related-material']
);
assert.deepEqual(
  ia.pageSectionsFor({ key: 'evidence.web_of_lies', params: { source: 'SOURCE-1' } }),
  [],
  'ordinary WOL source selection must remain the collection view rather than becoming a dossier'
);
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
assert.equal(ia.parseRoute('#/not/a-route').key, null, 'unknown routes must fail closed instead of falling back to Home');
assert(ia.validateRegistry(model));
ia.ActorIdentity.configure(model);

const canonicalActorRecords = model.entities.actors.map(item => item.record);
assert(canonicalActorRecords.some(actor => actor.actor_id === 'ACT-IRGC-NAVY'));
assert(canonicalActorRecords.some(actor => actor.actor_id === 'ACT-PER-MOHAMMAD-BAQER-QALIBAF'));

const iran = ia.ActorIdentity.resolve('Iran');
assert.equal(iran.entityType, 'entity');
assert.equal(iran.affiliationType, 'state');
assert.equal(iran.parentState, 'Iran');
assert.equal(iran.flagCode, 'ir');

const parliament = ia.ActorIdentity.resolve('Iranian parliament');
assert.equal(parliament.entityType, 'entity');
assert.equal(parliament.affiliationType, 'state-institution');
assert.equal(parliament.parentState, 'Iran');
assert.equal(parliament.flagCode, 'ir');

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
assert.equal(qalibaf.flagCode, 'ir');
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
assert.equal(irgcOfficial.flagCode, 'ir');

const hezbollah = ia.ActorIdentity.resolve('Hezbollah');
assert.equal(hezbollah.affiliationType, 'non-state');
assert.equal(hezbollah.flagCode, null);
assert.equal(hezbollah.parentState, null);
const hezbollahOfficial = ia.ActorIdentity.resolve({ name: 'Affiliated Hezbollah person fixture', entityType: 'person', role: 'Official', affiliation: 'Hezbollah' });
assert.equal(hezbollahOfficial.entityType, 'person');
assert.equal(hezbollahOfficial.role, 'Official');
assert.equal(hezbollahOfficial.affiliation, 'Hezbollah');
assert.equal(hezbollahOfficial.affiliationType, 'non-state');
assert.equal(hezbollahOfficial.flagCode, null);

const houthis = ia.ActorIdentity.resolve('Houthis / Ansar Allah');
assert.equal(houthis.affiliationType, 'non-state');
assert.equal(houthis.flagCode, null);
assert.equal(houthis.parentState, null);
const houthiOfficial = ia.ActorIdentity.resolve({ name: 'Affiliated Houthi person fixture', entityType: 'person', role: 'Official', affiliation: 'Houthis / Ansar Allah' });
assert.equal(houthiOfficial.entityType, 'person');
assert.equal(houthiOfficial.role, 'Official');
assert.equal(houthiOfficial.affiliation, 'Houthis / Ansar Allah');
assert.equal(houthiOfficial.affiliationType, 'non-state');
assert.equal(houthiOfficial.flagCode, null);

assert.equal(ia.ActorIdentity.resolve('U.S. Central Command').flagCode, 'us');
assert.equal(ia.ActorIdentity.resolve('United Nations Security Council').affiliationType, 'international');
const unknownActor = ia.ActorIdentity.resolve('Unresolved actor example');
assert.equal(unknownActor.entityType, 'unresolved');
assert.equal(unknownActor.affiliation, null);
assert.equal(unknownActor.affiliationType, 'unknown');
assert.equal(unknownActor.flagCode, null);

assert.deepEqual(
  ia.EvidenceStatus.viewModel({ support: 'STRONGLY_SUPPORTED', dispute: 'DISPUTED_BY_IRAN' }),
  { support: 'Strongly supported', dispute: 'Disputed by Iran' }
);
assert.deepEqual(ia.EvidenceStatus.viewModel({ support: null }), { support: 'Unknown', dispute: null });
assert.notEqual(ia.EvidenceStatus.viewModel({ support: null }).support, '0');
assert.equal(ia.displayTerm('CURRENT_OVERLAY', 'Unknown'), 'Current overlay');
assert.equal(ia.displayTerm('NOT_YET_ADJUDICABLE', 'Unknown'), 'Not yet adjudicable');
assert.equal(ia.displayTerm('naval_strike', 'Unknown'), 'Naval strike');

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
assert.match(css, /\.atlas-app\[data-layout-scope="adaptive-wide"\]/, 'wide desktop layout must remain opt-in');
assert.match(css, /@media \(min-width: 80rem\)/, 'wide desktop layout breakpoint is missing');

console.log('public IA contract: PASS - 6 approved Guide domains, 26 deterministic page owners, deterministic legacy aliases, preserved route data mappings, and Home section registry verified');
