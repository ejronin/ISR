'use strict';
const assert = require('node:assert/strict');
const temporal = require('../js/temporal.js');

const sources = new Map([
  ['S-EARLY', { publication_date: '2026-03-02' }],
  ['S-LATE', { publication_date: '2026-03-09' }],
  ['S-UNDATED', { publication_date: null }]
]);
const event = {
  event_id: 'EV-TEST', event_type: 'TEST', record_class: 'WARTIME_EVENT', actors: ['Actor'], target: 'Target',
  event_date: '2026-03-01', first_reported: '2026-03-02', first_verified: '2026-03-06',
  source_refs: ['S-EARLY', 'S-LATE', 'S-UNDATED'], later_outcome: 'later outcome must not leak'
};

const cases = [];
cases.push(() => assert.equal(temporal.knownByProjection(event, '2026-03-01', sources), null, '1 before first_reported: absent'));
cases.push(() => assert.equal(temporal.knownByProjection(event, '2026-03-03', sources).badge, 'REPORTED / NOT VERIFIED BY CUTOFF', '2 reported before verified: explicit badge'));
cases.push(() => assert.equal(temporal.knownByProjection(event, '2026-03-06', sources).badge, 'VERIFIED BY CUTOFF', '3 after first_verified: verified badge allowed'));
cases.push(() => assert.deepEqual(temporal.knownByProjection(event, '2026-03-08', sources).sources, ['S-EARLY'], '4 sources after cutoff: hidden'));
cases.push(() => assert.equal(Object.hasOwn(temporal.knownByProjection(event, '2026-03-08', sources), 'later_outcome'), false, '5 undated later outcome: suppressed'));
cases.push(() => assert.equal(temporal.currentAssessmentLabel('2026-08-20T15:59:00-04:00'), 'CURRENT ASSESSMENT — reviewed through 2026-08-20T15:59:00-04:00', '6 AS OF current adjudication: labeled'));
cases.push(() => assert.equal(temporal.hourBucket({ day: '2026-03-01', hour_bucket: null }), null, '7 date-only record: no fabricated hour'));
cases.push(() => assert.equal(temporal.supportsHour([{ hour_bucket: null }, { hour_bucket: '' }]), false, '8 unsupported hour window: disabled/empty'));
cases.forEach(run => run());
console.log('temporal-state: 8 required deterministic cases passed');
