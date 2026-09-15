'use strict';

const assert = require('node:assert/strict');

function assertLossRecordDenominator(text) {
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
  assert(physicalLossExclusion, 'reader loss comparison does not explicitly exclude physical-loss quantity/count semantics');
}

function runLossRecordDenominatorFixtures() {
  for (const text of [
    'This comparison counts canonical material-loss records; it does not count physical losses.',
    'This comparison is counting canonical material-loss records, not physical losses.',
    'Canonical material-loss records are counted here rather than physical losses.',
    'This comparison counted material-loss records instead of physical losses.'
  ]) {
    assert.doesNotThrow(() => assertLossRecordDenominator(text), `equivalent denominator wording was rejected: ${text}`);
  }

  for (const text of [
    'This comparison counts physical losses.',
    'This comparison does not count physical losses.',
    'This comparison counts canonical material-loss records.'
  ]) {
    assert.throws(() => assertLossRecordDenominator(text), `invalid denominator wording was accepted: ${text}`);
  }
}

module.exports = { assertLossRecordDenominator, runLossRecordDenominatorFixtures };
