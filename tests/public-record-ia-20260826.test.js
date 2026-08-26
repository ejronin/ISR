'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const navigation = fs.readFileSync(path.join(root, 'js', 'navigation.js'), 'utf8');
const state = fs.readFileSync(path.join(root, 'js', 'state.js'), 'utf8');
const publicUi = fs.readFileSync(path.join(root, 'js', 'public-record-ui-r2.js'), 'utf8');
const publicCss = fs.readFileSync(path.join(root, 'css', 'public-record-ui-r2.css'), 'utf8');
const endgameLoader = fs.readFileSync(path.join(root, 'js', 'endgame-20260823.js'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const plainReadme = readme.replace(/\*/g, '');
const ia = fs.readFileSync(path.join(root, 'docs', 'Public Record Information Architecture 20260826.md'), 'utf8');

for (const label of ['Overview', 'Military Operations', 'Consequences', 'Diplomacy & Outcome', 'Claims & Verification', 'Sources & Method']) {
  assert.match(navigation, new RegExp(label.replace(/[&]/g, '\\&')));
}

for (const marker of [
  "['snapshot', 'At a glance']",
  "['timeline', 'Timeline']",
  "['diplomacy-hub', 'Talks & agreements']",
  "['endgame', 'Objectives & outcomes']",
  "['analytic-record', 'Analytic record']",
  'retireLegacyWorkspaceNavigation',
  'data-peer-workspace="MOU"',
  'This is an audit of past assessments, not evidence that an event happened',
  'Completeness rule',
  "initialView = panelGroup[stored.activeView] ? stored.activeView : 'snapshot'",
  'public-record-ui-r2.css',
  'public-record-ui-r2.js'
]) assert.ok(navigation.includes(marker), `missing navigation/public-record marker: ${marker}`);

for (const marker of [
  "losses: 'consequences'",
  "'diplomacy-hub': 'diplomacy'",
  "endgame: 'diplomacy'",
  "claims: 'claims'",
  "'analytic-record': 'sources'"
]) assert.ok(state.includes(marker), `state is not aligned to public IA: ${marker}`);

for (const marker of [
  'The war record at a glance',
  'Advanced timeline tools',
  'Advanced source filters',
  'Copy record link',
  'NOT INDEPENDENTLY VERIFIED',
  'How the objective score is calculated'
]) assert.ok(publicUi.includes(marker), `missing public UX marker: ${marker}`);
assert.ok(!publicUi.includes('MutationObserver'), 'public-record UX must remain event-driven and avoid global DOM observers');
assert.ok(!publicUi.includes('fetch('), 'public-record UX must not fetch or replace analytical data');

for (const marker of [
  '.isr-workspace-nav{display:none!important}',
  '.kpis{display:none!important}',
  '--pr-confirmed:',
  '--pr-claimed:',
  '--pr-disputed:',
  '--pr-unresolved:',
  '.pr2-overview-intro',
  '.pr2-timeline-tools',
  '.pr2-source-filters'
]) assert.ok(publicCss.includes(marker), `missing public CSS contract: ${marker}`);

assert.ok(!endgameLoader.includes('workspace-ux-plain-language-r1.js'), 'superseded workspace label mutator must not be loaded');
assert.ok(!endgameLoader.includes('workspace-ux-plain-language-r1.css'), 'superseded workspace CSS must not be loaded');

assert.match(plainReadme, /analytic record is an audit layer, not an evidentiary layer/i);
assert.match(plainReadme, /historical entries are not published piecemeal/i);
assert.match(ia, /Evidence available then → contemporaneous assessment → subsequent independent evidence → adjudication/);
assert.match(ia, /Removing the entire Analytic record must not alter any factual event/i);
assert.match(ia, /No composite arithmetic score should silently convert unlike measures/i);

console.log('public-record-ia-20260826: public historical-record hierarchy, state, UX and evidence separation gates passed');
