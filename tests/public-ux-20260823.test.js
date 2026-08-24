'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const w = fs.readFileSync(path.join(root,'js','workspaces-20260822.js'),'utf8');
const f = fs.readFileSync(path.join(root,'js','full-scope-20260822.js'),'utf8');
const c = fs.readFileSync(path.join(root,'css','public-ux-20260823.css'),'utf8');
const e = JSON.parse(fs.readFileSync(path.join(root,'data','outcome-evidence-links-20260823.json'),'utf8'));

assert.match(w,/\['ATLAS','TIMELINE','ANALYSIS','MOU','SOURCES'\]/);
assert.match(w,/showAtlasPanel\?\.\('facilities'\)/);
assert.match(w,/CURRENT MAP · latest verified state/);
assert.match(w,/Timeline cutoffs do not roll the Atlas map backward/);
assert.match(w,/humanizeVisibleText/);
assert.match(w,/public-ux-20260823\.css/);
assert.match(f,/isr-atlas-map-only/);
assert.match(f,/outcomeEvidence/);
assert.match(f,/News and source links/);
assert.doesNotMatch(f,/Open publisher/);
assert.match(c,/#app\.isr-atlas-map-only/);
assert.match(c,/\.isr-evidence-source-list/);
for (const key of ['IRN-OUTCOME-TACTICAL','IRN-OUTCOME-MILITARY','IRN-OUTCOME-POLITICAL','IRN-OUTCOME-DIPLOMATIC','IRN-OUTCOME-STRATEGIC']) {
  assert.ok(Array.isArray(e[key]) && e[key].length >= 2, key);
  assert.ok(e[key].every(x => /^https:\/\//.test(x.url)));
  assert.ok(e[key].every(x => !/github\.com\/ejronin\/ISR/.test(x.url)));
}
console.log('public-ux-20260823: map-only Atlas, external evidence links and plain-language UI gates passed');
