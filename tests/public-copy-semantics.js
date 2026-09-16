'use strict';

const assert = require('node:assert/strict');

function assertLossRecordDenominator(text, options = {}) {
  const { requirePhysicalLossExclusion = false } = options;
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  const clauses = normalized.split(/(?<=[.!?;])\s+/);

  const recordDenominator = clauses.some(clause => {
    const active = /\bcount(?:s|ed|ing)?\b[^.!?;]{0,80}\b(?:canonical\s+)?material-loss\s+records\b/i.test(clause);
    const passive = /\b(?:canonical\s+)?material-loss\s+records\b[^.!?;]{0,80}\b(?:are|were|is|was|be|being)\s+counted\b/i.test(clause);
    const negatedActive = /\b(?:not|never)\b[^.!?;]{0,30}\bcount(?:s|ed|ing)?\b/i.test(clause);
    const negatedPassive = /\b(?:canonical\s+)?material-loss\s+records\b[^.!?;]{0,40}\b(?:are|were|is|was|be|being)\s+(?:not|never)\s+counted\b/i.test(clause);
    return (active && !negatedActive) || (passive && !negatedPassive);
  });

  const physicalLossExclusion = clauses.some(clause => (
    /\b(?:does|do|did|will|would|can|could)\s+not\s+count\b[^.!?;]{0,60}\bphysical\s+loss(?:es)?\b/i.test(clause)
    || /\b(?:is|are|was|were)\s+not\s+(?:a\s+)?(?:count|quantity|total)\s+of\s+physical\s+loss(?:es)?\b/i.test(clause)
    || /\b(?:is|are|was|were)\s+not\s+(?:a\s+)?physical-loss\s+(?:count|quantity|total)\b/i.test(clause)
    || /\b(?:rather than|instead of)\s+(?:counting\s+)?physical\s+loss(?:es)?\b/i.test(clause)
    || /,\s*not\s+(?:counting\s+)?physical\s+loss(?:es)?\b/i.test(clause)
  ));

  assert(recordDenominator, 'reader loss comparison does not identify material-loss records as the counted denominator');
  if (requirePhysicalLossExclusion) {
    assert(physicalLossExclusion, 'reader loss comparison does not explicitly exclude physical-loss quantity/count semantics');
  }
}

function runLossRecordDenominatorFixtures() {
  const fullContract = { requirePhysicalLossExclusion: true };
  for (const text of [
    'This comparison counts canonical material-loss records; it does not count physical losses.',
    'This comparison is counting canonical material-loss records, not physical losses.',
    'Canonical material-loss records are counted here rather than physical losses.',
    'This comparison counted material-loss records instead of physical losses.'
  ]) {
    assert.doesNotThrow(() => assertLossRecordDenominator(text, fullContract), `equivalent denominator wording was rejected: ${text}`);
  }

  for (const text of [
    'This comparison counts physical losses.',
    'This comparison does not count physical losses.',
    'This comparison counts canonical material-loss records.'
  ]) {
    assert.throws(() => assertLossRecordDenominator(text, fullContract), `invalid denominator wording was accepted: ${text}`);
  }

  assert.doesNotThrow(
    () => assertLossRecordDenominator('These summaries count material-loss records by side and type.'),
    'pre-finalization reader baseline lost its record-denominator compatibility contract'
  );
}

function assertCampaignEventCountSemanticBoundary(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const denominator = '(?:combat intensity|(?:equipment|weapon|physical asset|platform)\\s+(?:quantit(?:y|ies)|counts?))';

  const hasRecordedEventCount = [
    /\bcount(?:s)?\s+of\s+(?:recorded\s+)?(?:military\s+)?(?:events?|records?)\b/,
    /\b(?:recorded\s+)?(?:military\s+)?(?:event|record)\s+counts?\b/
  ].some(pattern => pattern.test(normalized));
  assert(hasRecordedEventCount, 'Campaigns explanation must identify the figure as a count of recorded events or records');

  const distinctionPatterns = [
    new RegExp(`\\bcount(?:s)?\\s+of\\s+(?:recorded\\s+)?(?:military\\s+)?(?:events?|records?)\\b[^.!?]{0,120}\\bnot\\b[^.!?]{0,80}\\b${denominator}\\b`),
    new RegExp(`\\b(?:recorded\\s+)?(?:military\\s+)?(?:event|record)\\s+counts?\\b[^.!?]{0,100}\\b(?:are|is)\\s+not\\b[^.!?]{0,80}\\b${denominator}\\b`),
    new RegExp(`\\b(?:recorded\\s+)?(?:military\\s+)?(?:event|record)\\s+counts?\\b\\s*[,;:—-]?\\s*not\\b[^.!?]{0,80}\\b${denominator}\\b`),
    new RegExp(`\\b(?:equipment|weapon|physical asset|platform)\\s+(?:quantit(?:y|ies)|counts?)\\b[^.!?]{0,100}\\b(?:are|is)\\s+not\\s+(?:substituted\\s+for|the\\s+same\\s+as|equivalent\\s+to)\\b[^.!?]{0,80}\\b(?:event|record)\\s+counts?\\b`),
    new RegExp(`\\b(?:recorded\\s+)?(?:military\\s+)?(?:event|record)\\s+counts?\\b[^.!?]{0,100}\\b(?:do|does)\\s+not\\s+(?:represent|measure|equal|mean|count)\\b[^.!?]{0,80}\\b${denominator}\\b`)
  ];
  assert(
    distinctionPatterns.some(pattern => pattern.test(normalized)),
    'Campaigns explanation must distinguish recorded-event counts from equipment/weapon/platform quantity, physical asset count, or combat intensity'
  );

  const forwardEquivalence = new RegExp(
    `\\b(?:recorded\\s+)?(?:military\\s+)?(?:event|record)\\s+counts?\\b\\s*(?:=|(?:is|are|equals?|represents?|measures?|means?|corresponds?\\s+to|substitutes?\\s+for)\\s+)${denominator}\\b`
  );
  const reverseEquivalence = new RegExp(
    `\\b${denominator}\\b\\s*(?:=|(?:is|are|equals?|represents?|measures?|means?|corresponds?\\s+to|substitutes?\\s+for)\\s+)\\b(?:recorded\\s+)?(?:military\\s+)?(?:event|record)\\s+counts?\\b`
  );
  assert(
    !forwardEquivalence.test(normalized) && !reverseEquivalence.test(normalized),
    'Campaigns explanation must not equate event/record counts with equipment, weapon, platform, physical-asset quantities, or combat intensity'
  );
}

function runCampaignEventCountSemanticBoundaryFixtures() {
  for (const text of [
    'This is a count of recorded military events, not combat intensity or weapon quantity.',
    'Recorded event count, not equipment quantity.',
    'Recorded military event count does not represent platform quantity.'
  ]) {
    assert.doesNotThrow(() => assertCampaignEventCountSemanticBoundary(text), `equivalent Campaigns count boundary was rejected: ${text}`);
  }

  for (const text of [
    'Recorded event count = equipment quantity.',
    'Recorded event count represents weapon quantity.',
    'Recorded event count equals physical asset count.',
    'Recorded event count is platform count.',
    'Recorded event count measures combat intensity.',
    'This is a count of recorded military events.'
  ]) {
    assert.throws(() => assertCampaignEventCountSemanticBoundary(text), undefined, `unsafe Campaigns count formulation passed: ${text}`);
  }
}

module.exports = {
  assertLossRecordDenominator,
  runLossRecordDenominatorFixtures,
  assertCampaignEventCountSemanticBoundary,
  runCampaignEventCountSemanticBoundaryFixtures
};
