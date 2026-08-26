'use strict';
const assert = require('node:assert/strict');
const presentation = require('../js/presentation.js');

// Human-readable public vocabulary must never reinterpret evidentiary uncertainty as lack of dispute.
assert.equal(presentation.formatLabel('REPORTED_NOT_INDEPENDENTLY_VERIFIED'), 'Reported; not independently verified');
assert.equal(presentation.formatLabel('SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED'), 'Source reported; not independently verified');
assert.equal(presentation.formatLabel('IRANIAN_STATEMENT_NOT_INDEPENDENTLY_VERIFIED'), 'Iranian statement; not independently verified');
assert.equal(presentation.formatLabel('UNVERIFIED'), 'Unverified');
assert.notEqual(presentation.formatLabel('UNVERIFIED'), 'Uncontested');
assert.notEqual(presentation.formatLabel('SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED'), 'Uncontested');

// Representative machine enums must be rendered as human language while the underlying values stay untouched.
const representativeMachineTokens = [
  'CURRENT_PRESENCE_REPORTED_OPERATIONAL_EFFECT_NOT_PUBLIC',
  'NO_WHOLE_SITE_SHUTDOWN_REPORTED',
  'STATE_OR_OFFICIAL',
  'DAMAGED_OR_DESTROYED_UNRESOLVED',
  'SUPPORTED_WITH_LIMITATIONS',
  'STATEMENT_OR_POLICY_CONFIRMED',
  'NOVEL_MACHINE_TOKEN'
];
const representativePublicStrings = representativeMachineTokens.map(presentation.formatLabel);
assert.deepEqual(representativePublicStrings.slice(0, 4), [
  'Current presence reported; operational effect not public',
  'No whole-site shutdown reported',
  'Official or state source',
  'Damaged; destruction unresolved'
]);
representativePublicStrings.forEach(text => {
  assert.equal(presentation.isMachineToken(text), false, `machine token leaked to public string: ${text}`);
  assert.equal(text.includes('_'), false, `underscore leaked to public string: ${text}`);
});
assert.equal(presentation.formatLabel('NOVEL_MACHINE_TOKEN'), 'Novel machine token');

// Dispute posture and evidentiary support are independent dimensions.
assert.equal(presentation.disputePosture('UNCONTESTED'), 'uncontested');
assert.equal(presentation.evidenceSupport('UNCONTESTED'), 'unresolved');
assert.equal(presentation.evidenceLabel('UNCONTESTED'), 'UNCONTESTED CLAIM');
assert.equal(presentation.disputePosture('CONTESTED / UNVERIFIED'), 'contested');
assert.equal(presentation.evidenceSupport('CONTESTED / UNVERIFIED'), 'unresolved');
assert.equal(presentation.evidenceLabel('CONTESTED / UNVERIFIED'), 'CONTESTED / UNVERIFIED');
assert.equal(presentation.evidenceSupport('ACTOR_CLAIM'), 'claim-only');
assert.equal(presentation.evidenceLabel('ACTOR_CLAIM'), 'CLAIM ONLY');
assert.equal(presentation.disputePosture('CONTESTED / SUPPORTED'), 'contested');
assert.equal(presentation.evidenceSupport('CONTESTED / SUPPORTED'), 'supported');
assert.equal(presentation.evidenceLabel('CONTESTED / SUPPORTED'), 'SUPPORTED');
assert.equal(presentation.disputePosture('CONTESTED / VERIFIED'), 'contested');
assert.equal(presentation.evidenceSupport('CONTESTED / VERIFIED'), 'verified');
assert.equal(presentation.evidenceLabel('CONTESTED / VERIFIED'), 'VERIFIED');
assert.equal(presentation.evidenceSupport('SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED'), 'unresolved');
assert.equal(presentation.evidenceLabel('SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED'), 'UNRESOLVED');
assert.equal(presentation.evidenceState('HIGH — satellite imagery verified'), 'verified');
assert.equal(presentation.evidenceState('NOVEL_MACHINE_TOKEN'), 'neutral');
assert.equal(presentation.evidenceLabel('NOVEL_MACHINE_TOKEN'), 'UNRESOLVED');

// Current public freshness is presentation state, distinct from the locked historical base.
const fakeRuntime = {
  ATLAS_TEMPORAL_INDEX: Array.from({ length: 202 }, (_, i) => ({ event_id: `E${i}` })),
  ATLAS_CURRENT_UPDATE_20260826: { cutoff: '2026-08-26T15:52:00-04:00' },
  ATLAS_WIKI_RECON_20260826: { counts: { runtime_chronology: 202 } }
};
const freshness = presentation.freshness(fakeRuntime);
assert.equal(freshness.historicalBaseCount, 98);
assert.equal(freshness.historicalReconciliationCount, 81);
assert.equal(freshness.chronologyCount, 202);
assert.equal(freshness.currentOsintDisplay, 'Aug. 26, 16:30 ET');
assert.equal(freshness.summary, '202 chronology records loaded · current OSINT reviewed through Aug. 26, 16:30 ET');

// Physical condition remains an independent semantic channel.
assert.equal(presentation.physicalState('Combined Air Operations Center rendered inoperable.'), 'lost');
assert.equal(presentation.physicalState('Terminal 4 flights resumed and continued.'), 'operational');
assert.equal(presentation.physicalState('Campaign directed from Shaw AFB from the start.'), 'operational');
assert.equal(presentation.physicalState('Damage status unresolved.'), 'neutral');
assert.equal(presentation.physicalState('Communications equipment damaged.'), 'degraded');
assert.equal(presentation.physicalState('damaged or destroyed; final state unresolved'), 'degraded');
assert.equal(presentation.physicalState('No whole-site shutdown reported'), 'neutral');
assert.equal(presentation.physicalLabelForValue('DAMAGED_OR_DESTROYED_UNRESOLVED'), 'DAMAGED; DESTRUCTION UNRESOLVED');

console.log('presentation: dispute posture, evidence support, humanization, freshness, and physical-state semantics passed');
