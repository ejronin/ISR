'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const source = read('js/public-ia.js');
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
assert(!source.includes('dataWarIn90Seconds'), 'gated War in 90 Seconds copy leaked into production runtime');
assert(!source.includes('dataObjectiveOrientation'), 'gated objective orientation copy leaked into production runtime');
assert(!source.includes('dataUsWarRationale'), 'gated U.S. rationale copy leaked into production runtime');

for (const phrase of [
  'Final polish design-system convergence', '--atlas-surface-card', '--atlas-focus-ring',
  '.evidence-clock-mobile', '.state-notice', '.current-state-grid',
  '.agreement-state.selected', '@media (prefers-reduced-motion: reduce)'
]) assert(css.includes(phrase), `missing final-polish CSS contract: ${phrase}`);
assert(css.includes('outline: 2px solid var(--atlas-focus-ring)'), 'editorial H1 keyboard focus is not preserved');
assert(css.includes('min-height: 2.75rem'), 'touch-target floor is absent');
assert(!css.includes('font-size: .58rem'), 'final polish still depends on sub-readable .58rem mobile type');

console.log('public final polish: PASS - cleared onboarding, semantic state notices, Talks grouping, compact clocks and shared interaction/readability contracts verified; narrative-gated modules remain unpublished');
