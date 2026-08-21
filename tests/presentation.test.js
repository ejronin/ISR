'use strict';
const assert = require('node:assert/strict');
const presentation = require('../js/presentation.js');

assert.equal(presentation.formatLabel('REPORTED_NOT_INDEPENDENTLY_VERIFIED'), 'UNCONTESTED');
assert.equal(presentation.formatLabel('SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED'), 'UNCONTESTED');
assert.equal(presentation.formatLabel('UNVERIFIED'), 'UNCONTESTED');
assert.equal(presentation.formatLabel('CAOC_INOPERABLE_AS_LAST_VERIFIED; WHOLE_BASE_INCAPACITY_NOT_SUPPORTED'), 'CAOC INOPERABLE AS LAST VERIFIED • WHOLE BASE INCAPACITY NOT SUPPORTED');
assert.equal(presentation.evidenceState('SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED'), 'unverified');
assert.equal(presentation.evidenceLabel('SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED'), 'UNCONTESTED');
assert.equal(presentation.evidenceState('HIGH — satellite imagery'), 'verified');
assert.equal(presentation.evidenceState('NOVEL_MACHINE_TOKEN'), 'neutral');
assert.equal(presentation.evidenceLabel('NOVEL_MACHINE_TOKEN'), 'UNRESOLVED');
assert.equal(presentation.physicalState('Combined Air Operations Center rendered inoperable.'), 'lost');
assert.equal(presentation.physicalState('Terminal 4 flights resumed and continued.'), 'operational');
assert.equal(presentation.physicalState('Campaign directed from Shaw AFB from the start.'), 'operational');
assert.equal(presentation.physicalState('Damage status unresolved.'), 'neutral');
assert.equal(presentation.physicalState('Communications equipment damaged.'), 'degraded');
console.log('presentation: uncontested public labels and independent physical/evidence states passed');
