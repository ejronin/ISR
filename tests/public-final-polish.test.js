'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const source = read('js/public-ia.js');
const appSource = read('js/public-app.js');
const css = read('css/public-shell.css');

const rookNarrative = JSON.parse(read('config/rook-narrative-current.json'));
const rookKeys = [
  'schema_version', 'contract_version', 'evidence_as_of',
  'war90_current_title', 'war90_current_text', 'war90_current_changed',
  'us_record_shows', 'us_current_position', 'iran_record_shows', 'iran_current_position', 'hormuz_now'
].sort();
assert.deepEqual(Object.keys(rookNarrative).sort(), rookKeys, 'ROOK routine narrative slot schema changed');
assert.equal(rookNarrative.schema_version, '1.0', 'ROOK routine narrative schema version changed');
assert.equal(rookNarrative.contract_version, 'atlas-final-narrative-v1', 'ROOK routine narrative contract version changed');
assert(/^20\d{2}-\d{2}-\d{2}$/.test(rookNarrative.evidence_as_of), 'ROOK evidence_as_of must be YYYY-MM-DD');
assert(appSource.includes('ROOK_NARRATIVE_CURRENT_BEGIN') && appSource.includes('ROOK_NARRATIVE_CURRENT_END'), 'ROOK generated narrative slot markers are missing');
for (const key of rookKeys.filter(key => !['schema_version', 'contract_version', 'evidence_as_of'].includes(key))) {
  assert(typeof rookNarrative[key] === 'string' && rookNarrative[key].trim(), `ROOK routine slot ${key} is empty`);
  assert(appSource.includes(rookNarrative[key]) || appSource.includes(`ROOK_NARRATIVE_CURRENT.${key}`), `ROOK routine slot ${key} is not synchronized into public-app`);
}

for (const phrase of [
  'Final polish semantic state notices',
  'Where things stand now',
  'Economic pressure on Iran is severe; regime collapse is not established',
  'The Strait remains physically traversable but commercially contested',
  'The June MOU no longer controls either side, but talks remain active',
  'Current diplomatic state',
  'Wartime agreements and negotiations',
  'Earlier agreements relevant to the war',
  'Geolocated shipping or commercial-loss records in this view: 0',
  'Four strategic transport corridors are shown'
]) assert(source.includes(phrase) || phrase === 'Four strategic transport corridors are shown' && source.includes('strategic transport corridor'), `missing final-polish public contract: ${phrase}`);

assert(source.includes("now.dataset.currentStateSummary = 'four-domain'"), 'Start Here current-state summary is not explicitly four-domain');
for (const domain of ['Military', 'Hormuz', 'Economy', 'Diplomacy']) assert(source.includes(`domain: '${domain}'`), `Start Here missing ${domain} orientation card`);
assert(source.includes("const startState = context.route.key === 'start.overview' ? article.querySelector('[data-current-state-summary]')"), 'Start Here evidence clock is not anchored after current state');
assert(source.includes("wartime.dataset.agreementGroup = 'wartime'"), 'wartime agreements group is absent');
const diplomacyPageSource = source.slice(source.indexOf('function DiplomacyPage'), source.indexOf('function MouPage'));
assert(!diplomacyPageSource.includes("'analysis.endgame_public_view'"), 'Talks overview reaches outside its mapped agreements/diplomacy evidence contract');
assert(source.includes("earlier.dataset.agreementGroup = 'historical'"), 'historical agreements group is absent');
assert(source.includes("notice.dataset.stateNotice = variant"), 'State Notice component lacks deterministic variant metadata');
assert(source.includes("variant: 'no-geolocated-records'"), 'Shipping zero geography does not use the semantic State Notice');
assert(source.includes("variant: 'dependency-unavailable'"), 'dependency unavailable State Notice is not used');

for (const phrase of [
  'FINAL_NARRATIVE_GATES',
  'War in 90 Seconds',
  "These milestones are selected to explain the conflict's progression. They are not a ranking of strategic importance.",
  'Opening strikes — Feb. 28',
  'The MOU breaks down — Jul. 7',
  'Across prewar policy and objectives publicly formalized during the opening and early wartime period',
  'Original public benchmark',
  'Why the U.S. said it entered the war',
  'Intelligence predicate',
  'Expected-retaliation rationale',
  'Wartime campaign objectives',
  '60-day interim no-charge period'
]) assert(appSource.includes(phrase), `missing cleared narrative-gate semantic contract: ${phrase}`);
assert(/proposal\s*(?:—|–|-|,)\s*not an agreement/i.test(appSource), 'missing cleared narrative-gate semantic contract: proposal, not an agreement');

assert(source.includes("setAttribute('data-war-in-90-seconds', 'approved')"), 'War in 90 Seconds lacks deterministic approval metadata');
assert(source.includes(".dataset.objectiveOrientation = 'approved'"), 'objective orientation lacks deterministic approval metadata');
assert(source.includes(".dataset.usWarRationale = 'approved'"), 'U.S. rationale module lacks deterministic approval metadata');
assert(source.includes(".dataset.hormuzTrajectory = 'approved'"), 'Hormuz trajectory lacks deterministic approval metadata');
assert(source.includes('renderFinalNarrativeGates(frame.article, context);'), 'OverviewPage does not own the cleared narrative modules');
assert(appSource.includes('narrativeContract: FINAL_NARRATIVE_GATES'), 'public app does not supply the approved narrative contract to the page owner');
assert(source.includes("const startState = context.route.key === 'start.overview' ? article.querySelector('[data-current-state-summary]')"), 'Start Here Evidence Clock is not anchored to current state before narrative orientation');
assert(!appSource.includes('Why the war began'), 'U.S. rationale module was broadened into an omniscient war-cause heading');

for (const phrase of [
  'Final polish design-system convergence', '--atlas-surface-card', '--atlas-focus-ring',
  '.evidence-clock-mobile', '.state-notice', '.current-state-grid',
  '.agreement-state.selected', '@media (prefers-reduced-motion: reduce)'
]) assert(css.includes(phrase), `missing final-polish CSS contract: ${phrase}`);
assert(css.includes('outline: 2px solid var(--atlas-focus-ring)'), 'editorial H1 keyboard focus is not preserved');
assert(css.includes('min-height: 2.75rem'), 'touch-target floor is absent');
assert(!css.includes('font-size: .58rem'), 'final polish still depends on sub-readable .58rem mobile type');

console.log('public final polish: PASS - current-state hierarchy, semantic state notices, Talks grouping, compact clocks, cleared narrative gates and shared interaction/readability contracts verified');
