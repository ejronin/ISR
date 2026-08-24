'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(ROOT,'js/workspaces-20260822.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'css/workspaces-20260822.css'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const hz=JSON.parse(fs.readFileSync(path.join(ROOT,'data/hormuz-strategic-v3.json'),'utf8'));
const outcome=JSON.parse(fs.readFileSync(path.join(ROOT,'data/iran-outcome-assessments-v1.0.json'),'utf8'));

for(const name of ['ATLAS','TIMELINE','ANALYSIS','MOU','SOURCES'])assert.ok(js.includes(name),`peer workspace missing ${name}`);
for(const z of ['FIT','1×','2×','4×','8×'])assert.ok(js.includes(z),`visual timeline zoom missing ${z}`);
assert.ok(js.includes('How to use'),'Timeline help missing');
assert.ok(js.includes('Chronology prefetched'),'Timeline loading/prefetch feedback missing');

/*
 * Aug. 23 architecture correction:
 * ATLAS is now map-only. The former Atlas subordinate analysis navigation moved
 * under the ANALYSIS peer workspace, so the legacy Aug. 22 assertion must test
 * that new ownership rather than requiring the retired ATLAS-scoped behavior.
 */
assert.ok(js.includes("analysisNav.hidden=name!=='ANALYSIS'"),'Analysis subordinate navigation is not scoped to ANALYSIS workspace');
assert.ok(js.includes("window.showAtlasPanel?.('facilities')"),'ATLAS does not route to the current facilities map');
assert.ok(js.includes('CURRENT MAP · latest verified state'),'ATLAS current-map status badge missing');
assert.ok(js.includes('Timeline cutoffs do not roll the Atlas map backward'),'ATLAS latest-state semantics missing');

assert.ok(js.includes('isrTimelineMapCard'),'selected timeline date/map confirmation card missing');
assert.ok(js.includes('hover-date'),'timeline-dot date hover linkage missing');
assert.ok(css.includes('.panel.isr-timeline-built:not(.active)')&&css.includes('display:none!important'),'Timeline panel leak fix missing');
assert.ok(css.includes('overflow-x:auto!important'),'Timeline ruler horizontal scrolling missing');
for(const b of ['FAR LEFT','LEFT','LEAN LEFT','CENTER','LEAN RIGHT','RIGHT','FAR RIGHT'])assert.ok(js.includes(b),`Ground News gauge scale missing ${b}`);
assert.ok(js.includes('NOT measured by Ground News'),'Ground News unmeasured state missing');
assert.ok(js.includes('not proof of neutrality'),'Ground News scope warning missing');
assert.ok(js.includes('rating methodology'),'Ground News unrated methodology link missing');
assert.ok(js.includes('mou_breach_assessment')&&js.includes('mou_concession_matrix'),'full MOU analysis not consumed');
assert.equal(hz.cutoff,'2026-08-22 10:54 ET');
assert.equal(hz.canonical_ledger_advanced,true);
assert.equal(hz.canonical_ledger_cutoff,'2026-08-22 13:59 ET');
assert.ok(hz.mou_breach_assessment&&hz.mou_concession_matrix);
assert.ok(!Object.hasOwn(hz,'map_points')&&!Object.hasOwn(hz,'routes'),'standalone MOU map geometry reintroduced');
assert.equal(outcome.review_cutoff,'2026-08-20T15:59:00-04:00');
assert.ok(index.includes('workspaces-20260822.css')&&index.includes('workspaces-20260822.js'),'workspace assets not loaded');
console.log('Aug. 22 workspace regression compatibility: PASS (Aug. 23 map-only Atlas / Analysis architecture)');
