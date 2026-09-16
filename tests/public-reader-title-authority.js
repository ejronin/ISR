'use strict';

const assert = require('node:assert/strict');

const APPROVED_FINAL_READER_TITLES = Object.freeze({
  'objectives.iran': 'Iran Messaging & Claims',
  'evidence.information': 'Claims, Falsehoods & Deception'
});

function isFinalizedPublicProduct(finalizationMarker) {
  return Boolean(finalizationMarker);
}

function expectedFinalReaderTitle(routeRecord, finalizationMarker) {
  assert(routeRecord && routeRecord.key && routeRecord.title, 'route record with key/title is required');
  if (!isFinalizedPublicProduct(finalizationMarker)) return routeRecord.title;
  return APPROVED_FINAL_READER_TITLES[routeRecord.key] || routeRecord.title;
}

function assertFinalReaderHeading(routeRecord, headings, finalizationMarker, message) {
  assert.deepEqual(
    headings,
    [expectedFinalReaderTitle(routeRecord, finalizationMarker)],
    message || `route heading parity failed for ${routeRecord.key}`
  );
}

function runFinalReaderTitleFixtures() {
  const ordinary = { key: 'military.campaigns', title: 'Campaigns' };
  const iranMessaging = { key: 'objectives.iran', title: "How Iran's Position Changed" };
  const information = { key: 'evidence.information', title: 'Lie Ledger' };
  const finalized = 'finalized-reader';

  assert.doesNotThrow(() => assertFinalReaderHeading(ordinary, ['Campaigns'], finalized));
  assert.throws(() => assertFinalReaderHeading(ordinary, ['Campaign Summary'], finalized));

  assert.doesNotThrow(() => assertFinalReaderHeading(iranMessaging, ["How Iran's Position Changed"], ''));
  assert.doesNotThrow(() => assertFinalReaderHeading(iranMessaging, ['Iran Messaging & Claims'], finalized));
  assert.throws(() => assertFinalReaderHeading(iranMessaging, ["How Iran's Position Changed"], finalized));
  assert.throws(() => assertFinalReaderHeading(iranMessaging, ['Iran Claims'], finalized));

  assert.doesNotThrow(() => assertFinalReaderHeading(information, ['Lie Ledger'], ''));
  assert.doesNotThrow(() => assertFinalReaderHeading(information, ['Claims, Falsehoods & Deception'], finalized));
  assert.throws(() => assertFinalReaderHeading(information, ['Lie Ledger'], finalized));
  assert.throws(() => assertFinalReaderHeading(information, ['Claims & Information'], finalized));

  assert.throws(() => assertFinalReaderHeading(ordinary, [], finalized));
  assert.throws(() => assertFinalReaderHeading(ordinary, ['Campaigns', 'Campaigns'], finalized));
}

module.exports = {
  APPROVED_FINAL_READER_TITLES,
  isFinalizedPublicProduct,
  expectedFinalReaderTitle,
  assertFinalReaderHeading,
  runFinalReaderTitleFixtures
};
