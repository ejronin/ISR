'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const reader = require('../src/public-reader-layer.js');

assert.equal(reader.READER_LAYER_VERSION, 'atlas-reader-v1.1');

const finding = (truth, knowledge, publication = 'PUBLIC_READY') => reader.readerPublicAdjudication({
  truth_adjudication: truth,
  knowledge_judgment: knowledge,
  public_knowledge_judgment: knowledge,
  publication_status: publication
});

assert.deepEqual(finding('FALSE', 'KNOWING_FALSEHOOD_ESTABLISHED'), { label: 'Lie', key: 'lie' });
assert.deepEqual(finding('FALSE', 'VERY_LIKELY_KNEW_FALSE'), { label: 'Likely lie', key: 'likely-lie' });
assert.deepEqual(finding('FALSE', 'INSUFFICIENT_EVIDENCE'), { label: 'False', key: 'false' });
assert.deepEqual(finding('MISLEADING', 'NOT_ASSESSED'), { label: 'Misleading', key: 'misleading' });
assert.deepEqual(finding('SUPPORTED', 'NOT_ASSESSED'), { label: 'Supported', key: 'supported' });
assert.deepEqual(finding('UNRESOLVED', 'INSUFFICIENT_EVIDENCE'), { label: 'Unresolved', key: 'unresolved' });

// Publication qualification on the knowledge/intent axis must not erase the
// independently supported factual finding or promote a withheld lie conclusion.
assert.deepEqual(finding('FALSE', 'KNOWING_FALSEHOOD_ESTABLISHED', 'BLOCKED_EVIDENCE_COMPLETION'), { label: 'False', key: 'false' });
assert.deepEqual(finding('MISLEADING', 'VERY_LIKELY_KNEW_FALSE', 'BLOCKED_EVIDENCE_COMPLETION'), { label: 'Misleading', key: 'misleading' });
assert.deepEqual(finding('PARTLY_TRUE', 'LIKELY_KNEW_FALSE', 'BLOCKED_EVIDENCE_COMPLETION'), { label: 'Partly true', key: 'partly-true' });
assert.deepEqual(finding('SUPPORTED', 'KNOWING_FALSEHOOD_ESTABLISHED', 'BLOCKED_EVIDENCE_COMPLETION'), { label: 'Supported', key: 'supported' });
assert.deepEqual(finding('UNRESOLVED', 'KNOWING_FALSEHOOD_ESTABLISHED', 'BLOCKED_EVIDENCE_COMPLETION'), { label: 'Unresolved', key: 'unresolved' });
assert.deepEqual(finding('FALSE', 'VERY_LIKELY_KNEW_FALSE', 'NOT_REASSESSED'), { label: 'False', key: 'false' });
assert.equal(
  reader.readerIntentReviewNote({ publication_status: 'BLOCKED_EVIDENCE_COMPLETION' }),
  'The factual finding is shown above. The separate knowledge/intent assessment remains pending additional evidence.'
);
assert.equal(
  reader.readerIntentReviewNote({ publication_status: 'NOT_REASSESSED' }),
  'The factual finding is shown above. The claimant’s knowledge or intent has not yet been assessed.'
);
assert.equal(reader.readerIntentReviewNote({ publication_status: 'PUBLIC_READY' }), '');

const status = record => reader.readerFacilityStatus(record);

assert.equal(status({
  facility_class: 'OUTPOST',
  current_presence_status: 'Destroyed in March strike; not treated as an intact working facility afterward without later evidence.',
  damage_evidence_status: 'VERIFIED_DAMAGE',
  operational_effect_status: 'SUBFACILITY_INOPERABLE'
}), 'destroyed', 'an explicitly destroyed outpost must remain destroyed');

assert.equal(status({
  facility_class: 'BASE',
  current_presence_status: 'U.S. presence established in 2026.',
  damage_evidence_status: 'VERIFIED_DAMAGE',
  operational_effect_status: 'SUBFACILITY_INOPERABLE',
  continuity: 'The evidence establishes loss of a named command subfacility, not loss of the entire air base.'
}), 'damaged_operational', 'subfacility loss must not become whole-base inoperability');

assert.equal(status({
  facility_class: 'BASE',
  current_presence_status: 'Facility remains damaged.',
  damage_evidence_status: 'VERIFIED_DAMAGE',
  operational_effect_status: 'WHOLE_SITE_INOPERABLE'
}), 'damaged_inoperable');

assert.equal(status({
  facility_class: 'BASE',
  current_presence_status: 'Withdrawn and closed after transfer.',
  damage_evidence_status: 'NO_VERIFIED_DAMAGE',
  operational_effect_status: 'NOT ACTIVE'
}), 'administrative', 'withdrawal/closure must not be counted as destruction');

assert.equal(status({
  facility_class: 'BASE',
  current_presence_status: 'Operational and active.',
  damage_evidence_status: '',
  operational_effect_status: 'OPERATIONAL'
}), 'operational');

assert.equal(status({
  facility_class: 'BASE',
  current_presence_status: 'Operational and active.',
  damage_evidence_status: 'NO_VERIFIED_DAMAGE',
  operational_effect_status: 'OPERATIONAL'
}), 'operational', 'NO_VERIFIED_DAMAGE must not collide with VERIFIED_DAMAGE');

assert.equal(status({
  facility_class: 'BASE',
  current_presence_status: 'Status unresolved.',
  damage_evidence_status: 'NO_VERIFIED_DAMAGE',
  operational_effect_status: 'UNKNOWN'
}), 'unknown', 'absence of verified damage must not manufacture a damaged classification');

assert.equal(status({
  facility_class: 'BASE',
  current_presence_status: 'Operational status unclear.',
  damage_evidence_status: 'UNVERIFIED_DAMAGE',
  operational_effect_status: 'UNKNOWN'
}), 'unknown', 'UNVERIFIED_DAMAGE must not collide with VERIFIED_DAMAGE');

const readerSource = fs.readFileSync(path.join(root, 'src/public-reader-layer.js'), 'utf8');
const readerCss = fs.readFileSync(path.join(root, 'src/public-reader-layer.css'), 'utf8');
assert.match(readerSource, /What made up these monthly totals/);
assert.match(readerSource, /Equipment quantities are not substituted for event counts/);
assert.match(readerSource, /Facility status by actor/);
assert.match(readerSource, /Repeated by \(\$\{repeats\.length\}\)/);
assert.match(readerSource, /How we know it is/);
assert.match(readerSource, /The separate knowledge\/intent assessment remains pending additional evidence/);
assert.match(readerSource, /const positiveDamage = !negativeDamage/);
assert.doesNotMatch(readerCss, /technical-record-metadata[\s\S]*display\s*:\s*none/i, 'internal fields must be removed structurally, not hidden by CSS');

console.log('public reader layer: PASS - factual/intent separation, facility status integrity, constituent drilldown, and structural public/internal boundary verified');