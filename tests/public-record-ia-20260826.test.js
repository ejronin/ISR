'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const navigation = fs.readFileSync(path.join(root, 'js', 'navigation.js'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const ia = fs.readFileSync(path.join(root, 'docs', 'Public Record Information Architecture 20260826.md'), 'utf8');

for (const label of ['Overview', 'Military Operations', 'Consequences', 'Diplomacy & Outcome', 'Claims & Verification', 'Sources & Method']) {
  assert.match(navigation, new RegExp(label.replace(/[&]/g, '\\&')));
}

assert.match(navigation, /\['snapshot', 'Current status'\]/);
assert.match(navigation, /\['timeline', 'Chronology'\]/);
assert.match(navigation, /\['diplomacy-hub', 'Diplomacy overview'\]/);
assert.match(navigation, /\['endgame', 'Objectives & outcomes'\]/);
assert.match(navigation, /\['analytic-record', 'Analytic record'\]/);
assert.match(navigation, /suppressLegacyWorkspaceNavigation/);
assert.match(navigation, /data-peer-workspace="MOU"/);
assert.match(navigation, /Separate from the factual ledger/);
assert.match(navigation, /Completeness gate/);
assert.match(navigation, /initialView = panelGroup\[stored\.activeView\] \? stored\.activeView : 'snapshot'/);

assert.match(readme, /analytic record is an audit layer, not an evidentiary layer/i);
assert.match(readme, /historical entries are not published piecemeal/i);
assert.match(ia, /Evidence available then → contemporaneous assessment → subsequent independent evidence → adjudication/);
assert.match(ia, /Removing the entire Analytic record must not alter any factual event/i);
assert.match(ia, /No composite arithmetic score should silently convert unlike measures/i);

console.log('public-record-ia-20260826: historical-record hierarchy and analytic/evidence separation gates passed');
