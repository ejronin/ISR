'use strict';

const assert = require('node:assert/strict');

const APPROVED_FINAL_READER_TITLES = Object.freeze({});

function isFinalizedPublicProduct(finalizationMarker) {
  return Boolean(finalizationMarker);
}

function expectedFinalReaderTitle(routeRecord, finalizationMarker) {
  assert(routeRecord && routeRecord.key && routeRecord.title, 'route record with key/title is required');
  if (!isFinalizedPublicProduct(finalizationMarker)) return routeRecord.title;
  return APPROVED_FINAL_READER_TITLES[routeRecord.key] || routeRecord.title;
}

function expectedFinalReaderLabel(routeRecord, finalizationMarker) {
  assert(routeRecord && routeRecord.key && routeRecord.label, 'route record with key/label is required');
  if (!isFinalizedPublicProduct(finalizationMarker)) return routeRecord.label;
  return APPROVED_FINAL_READER_TITLES[routeRecord.key] || routeRecord.label;
}

function assertFinalReaderHeading(routeRecord, headings, finalizationMarker, message) {
  assert.deepEqual(
    headings,
    [expectedFinalReaderTitle(routeRecord, finalizationMarker)],
    message || `route heading parity failed for ${routeRecord.key}`
  );
}

function runFinalReaderTitleFixtures() {
  const ordinary = { key: 'military.campaigns', title: 'Campaigns', label: 'Campaigns & Strikes' };
  const iranMessaging = { key: 'objectives.iran', title: "Iran's Position", label: "Iran's Position" };
  const information = { key: 'evidence.information', title: 'Lie Ledger', label: 'Lie Ledger' };
  const finalized = 'finalized-reader';

  assert.doesNotThrow(() => assertFinalReaderHeading(ordinary, ['Campaigns'], finalized));
  assert.throws(() => assertFinalReaderHeading(ordinary, ['Campaign Summary'], finalized));
  assert.equal(expectedFinalReaderLabel(ordinary, finalized), 'Campaigns & Strikes');

  assert.doesNotThrow(() => assertFinalReaderHeading(iranMessaging, ["Iran's Position"], ''));
  assert.doesNotThrow(() => assertFinalReaderHeading(iranMessaging, ["Iran's Position"], finalized));
  assert.equal(expectedFinalReaderLabel(iranMessaging, finalized), "Iran's Position");

  assert.doesNotThrow(() => assertFinalReaderHeading(information, ['Lie Ledger'], ''));
  assert.doesNotThrow(() => assertFinalReaderHeading(information, ['Lie Ledger'], finalized));
  assert.equal(expectedFinalReaderLabel(information, finalized), 'Lie Ledger');

  assert.throws(() => assertFinalReaderHeading(ordinary, [], finalized));
  assert.throws(() => assertFinalReaderHeading(ordinary, ['Campaigns', 'Campaigns'], finalized));
}

module.exports = {
  APPROVED_FINAL_READER_TITLES,
  isFinalizedPublicProduct,
  expectedFinalReaderTitle,
  expectedFinalReaderLabel,
  assertFinalReaderHeading,
  runFinalReaderTitleFixtures
};
