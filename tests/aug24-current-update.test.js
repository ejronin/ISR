'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));

const histEvents = json('data/integration-v1.2/events.json').events;
const histTimeline = json('data/integration-v1.2/timeline.json').records;
const histManifest = json('data/integration-v1.2/manifest.json');
const overlayEvents = json('data/current-update-20260824/events.json').events;
const overlayTimeline = json('data/current-update-20260824/timeline.json').records;
const overlayManifest = json('data/current-update-20260824/manifest.json');

assert.strictEqual(histEvents.length, 98, 'locked historical event count');
assert.strictEqual(histTimeline.length, 98, 'locked historical timeline count');
assert.strictEqual(histManifest.counts.events, 98, 'locked manifest event count');
assert.strictEqual(overlayEvents.length, 10, 'frozen Aug. 24 overlay event count');
assert.strictEqual(overlayTimeline.length, 10, 'frozen Aug. 24 overlay timeline count');
assert.strictEqual(overlayManifest.counts.current_chronology_records, 108, 'frozen Aug. 24 chronology count');
assert.strictEqual(overlayManifest.equation, '98 + 10 = 108');
assert.strictEqual(overlayManifest.collection_cutoff, '2026-08-24T14:14:00-04:00', 'Aug. 24 layer cutoff must remain frozen');
assert.strictEqual(new Set([...histEvents, ...overlayEvents].map(x => x.event_id)).size, 108, '98 + 10 unique Aug. 24 IDs');

const index = read('legacy/phase1-public-runtime-reference.html');
const publicIndex = read('index.html');
const publicRelease = json('data/public-release.json');
const state = read('js/state.js');
const work = read('js/workspaces-20260822.js');
const loader = read('js/current-update-20260824.js');
assert(index.includes('>98</b><span>canonical historical-ledger records'));
assert(index.includes('>108</b><span>current chronology records'));
assert(index.includes('js/current-update-20260824.js'));
assert(!publicIndex.includes('js/current-update-20260824.js'));
assert(publicIndex.includes(publicRelease.neutral_bootstrap.asset.path));
assert(publicIndex.includes(publicRelease.neutral_bootstrap.asset.integrity));
assert(!/<script\b[^>]*\bsrc="js\/public-app\.js/i.test(publicIndex));
// The Aug. 24 layer is frozen, but the public temporal default advances with later append-only overlays.
assert(state.includes("timeCutoff: '2026-08-26'"), 'current public timeline default must be Aug. 26');
assert(work.includes("const CANONICAL='2026-08-24'"));
assert(work.includes("const MOU_DISPLAY='2026-08-22 10:54 ET'"));
assert(work.includes("const OUTCOME_DISPLAY='2026-08-20 15:59 ET'"));
assert(loader.includes('EXPECTED_HISTORICAL = 98'));
assert(loader.includes('EXPECTED_OVERLAY = 10'));
assert(loader.includes('EXPECTED_CURRENT = 108'));
console.log('aug24-current-update.test.js: PASS — frozen Aug. 24 layer preserved while current public cutoff advances to Aug. 26');
