'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const load = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const text = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const casualties = load('data/casualty-corrections-v1.3.3.json');
const assets = load('data/asset-display-v1.3.3.json');
const rationales = load('data/us-war-rationales-v1.3.3.json');

assert.deepStrictEqual(casualties.united_states.current_display, {
  total_military_dead: 18,
  hostile_deaths: 11,
  non_hostile_military_deaths: 7,
  wounded: 757,
  missing: 1
});
assert.equal(casualties.iran.official_snapshot.military_dead, 2008);
assert.equal(casualties.iran.official_snapshot.civilian_dead, 1460);
assert.equal(casualties.iran.official_snapshot.total_dead, 3468);
assert.equal(casualties.iran.current_military_only_total, null);
assert.equal(casualties.iran.current_military_wia, null);
assert.equal(casualties.iran.current_military_mia, null);
assert.deepStrictEqual(casualties.iran.later_mixed_tallies.map(x => x.total_dead), [3519, 3636]);

const byId = Object.fromEntries(assets.iran.headline_categories.map(x => [x.id, x]));
assert.equal(byId.aircraft.headline, '23+');
assert.equal(byId.launchers.headline, '335+');
assert.equal(byId.naval_total.headline, '58+');
assert.equal(byId.submarines.headline, '12');
assert.equal(byId.surface.headline, '11');
assert.equal(byId.fac.headline, '3');
assert.equal(byId.afsb.headline, '2');
assert.equal(byId.smallcraft.headline, '30+');
assert.equal(byId.missile_inventory.headline, '833 / 1,417 / 3,000 eq.');
assert.equal(assets.specific_ledger_policy.labels['TARGETED; DESTRUCTION_NOT_ESTABLISHED'], 'UNCONTESTED TARGET COUNT · DESTRUCTION UNRESOLVED');

assert.equal(rationales.groups.length, 10);
const first = rationales.groups.find(x => x.id === 'first-strike-intelligence');
assert.equal(first.overall_status, 'FALSE');
assert.match(first.summary, /Pentagon briefing/i);
assert(rationales.groups.some(x => x.id === 'diplomacy-exhausted'));
assert(rationales.groups.some(x => x.id === 'regime-change'));

const runtime = text('js/rebuild-v1.3.3.js');
assert(!runtime.includes('new MutationObserver'), 'rebuild must not reintroduce observer hotfix architecture');
assert(runtime.includes('v133-loss-workspace'));
assert(runtime.includes('UNCONTESTED TARGET COUNT'));
assert(!/\$\{[^}]*total_military_dead[^}]*\}\s*KIA/.test(runtime), 'total U.S. deaths must not render as KIA');
assert(!runtime.includes('3,519–3,636'));
const navigation = text('js/navigation.js');
assert(navigation.includes('rebuild-v1.3.3.js?v=20260821-rebuild4'));
assert(!navigation.includes('casualty-dashboard-hotfix.js?v=20260821a'));
const compatibility = text('js/casualty-dashboard-hotfix.js');
assert(!compatibility.includes('MutationObserver'));

console.log('rebuild-v1.3.3: casualty, attrition, rationale and recovery architecture gates passed');
