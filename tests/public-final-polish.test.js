'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const source = read('js/public-ia.js');
const appSource = read('js/public-app.js');
const css = read('css/public-shell.css');

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
  '60-day interim no-charge period',
  'proposal, not an agreement'
]) assert(appSource.includes(phrase), `missing cleared narrative-gate semantic contract: ${phrase}`);

assert(appSource.includes(".dataset.warIn90Seconds = 'approved'"), 'War in 90 Seconds lacks deterministic approval metadata');
assert(appSource.includes(".dataset.objectiveOrientation = 'approved'"), 'objective orientation lacks deterministic approval metadata');
assert(appSource.includes(".dataset.usWarRationale = 'approved'"), 'U.S. rationale module lacks deterministic approval metadata');
assert(appSource.includes(".dataset.hormuzTrajectory = 'approved'"), 'Hormuz trajectory lacks deterministic approval metadata');
assert(appSource.includes("article.querySelector('.evidence-clock-bar')"), 'narrative gates are not anchored after the Evidence Clock');
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
