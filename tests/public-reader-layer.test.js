'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const reader = require('../src/public-reader-layer.js');
const { assertCampaignEventCountSemanticBoundary } = require('./public-copy-semantics.js');

assert.equal(reader.READER_SUPPORT_VERSION, 'atlas-reader-support-v1.3');

const finding = (truth, knowledge, publication = 'PUBLIC_READY', truthQualifier = '') => reader.readerPublicAdjudication({
  truth_adjudication: truth,
  truth_qualifier: truthQualifier,
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
assert.deepEqual(
  finding('UNRESOLVED', 'INSUFFICIENT_EVIDENCE', 'PUBLIC_READY', 'UNSUBSTANTIATED_EFFECT'),
  { label: 'Unsupported', key: 'unsupported' }
);
assert.deepEqual(
  finding('UNRESOLVED', 'NOT_ASSESSABLE', 'PUBLIC_READY', 'EXACT_COUNT_AND_EFFECT_NOT_INDEPENDENTLY_RECONCILED'),
  { label: 'Unverified', key: 'unverified' }
);
assert.deepEqual(
  finding('UNRESOLVED', 'INSUFFICIENT_EVIDENCE', 'PUBLIC_READY', 'PARTLY_CONFIRMED_EXACT_COUNT_UNRESOLVED'),
  { label: 'Partly supported', key: 'partly-supported' }
);
assert.deepEqual(
  finding('UNRESOLVED', 'INSUFFICIENT_EVIDENCE', 'PUBLIC_READY', 'CONTESTED_MINE_CAUSATION'),
  { label: 'Unresolved', key: 'unresolved' }
);

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

const acceptedFacilityStates = new Map([
  ['US-SHUAIBA-TOC', 'RED'],
  ['US-NSA-BHR', 'YELLOW'],
  ['US-ALUDEID', 'YELLOW'],
  ['US-ARIFJAN', 'YELLOW']
]);
const status = record => reader.readerFacilityStatus(record, acceptedFacilityStates);

assert.equal(status({ facility_id: 'US-SHUAIBA-TOC', current_presence_status: 'Destroyed' }), 'RED');
assert.equal(status({ facility_id: 'US-NSA-BHR', operational_effect_status: 'HQ_FUNCTION_RELOCATED' }), 'YELLOW');
assert.equal(status({ facility_id: 'US-ALUDEID', operational_effect_status: 'SUBFACILITY_INOPERABLE' }), 'YELLOW');
assert.equal(status({ facility_id: 'US-ARIFJAN', current_presence_status: 'U.S. troops present' }), 'YELLOW');
assert.equal(status({
  facility_id: 'US-INCIRLIK',
  current_presence_status: 'Operational and active.',
  damage_evidence_status: 'NO_REPORTED_DAMAGE_FOUND',
  operational_effect_status: 'OPERATIONAL'
}), 'UNCLASSIFIED', 'operational continuity plus absence of reported damage must not manufacture GREEN');
assert.equal(status({
  facility_id: 'UNLISTED-FACILITY',
  current_presence_status: 'Destroyed',
  damage_evidence_status: 'VERIFIED_DAMAGE',
  operational_effect_status: 'WHOLE_SITE_INOPERABLE'
}), 'UNCLASSIFIED', 'facility record text must not manufacture a RED classification');
assert.equal(reader.readerFacilityStatus({ facility_id: 'US-SHUAIBA-TOC' }), 'UNCLASSIFIED', 'accepted lookup is required for any colored state');

const readerSource = fs.readFileSync(path.join(root, 'src/public-reader-layer.js'), 'utf8');
const readerCss = fs.readFileSync(path.join(root, 'src/public-reader-layer.css'), 'utf8');
const releaseBuilder = fs.readFileSync(path.join(root, 'scripts/build_public_release.py'), 'utf8');
const releaseCore = fs.readFileSync(path.join(root, 'scripts/build_public_release_core.py'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js/public-app.js'), 'utf8');
assert.match(readerSource, /What made up these monthly totals/);
const campaignCountCopy = readerSource.match(/append\(details, 'p', 'section-note', '([^']*count of recorded military events[^']*)'\)/)?.[1] || '';
assertCampaignEventCountSemanticBoundary(campaignCountCopy);
assert.match(readerSource, /Facility status by actor/);
assert.match(readerSource, /Repeated by \(\$\{repeats\.length\}\)/);
assert.match(readerSource, /Why these findings/);
assert.match(readerSource, /Why this is/);
assert.doesNotMatch(readerSource, /That is why this branch is labeled False rather than Lie/);
assert.match(readerSource, /What happened/);
assert.match(readerSource, /Bottom line/);
assert.doesNotMatch(readerSource, /How the logic works/);
assert.match(readerSource, /Open evidence questions/);
assert.match(readerSource, /Claim history/);
assert.doesNotMatch(readerSource, /const intentNote = intentReviewNote/);
assert.match(readerSource, /readerSummaryText/);
assert.match(readerSource, /appendLedgerActorKicker/);
assert.match(readerSource, /reader-ledger-single-actions/);
assert.match(readerSource, /actionRow\.append\(traceLink\)/);
assert.match(readerCss, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/);
assert.match(readerCss, /\.reader-ledger-card-head\s*>\s*\.reader-wol-trace[\s\S]*grid-row:\s*2/);
assert.match(readerCss, /\.reader-ledger-card-head\s*>\s*\.reader-claim-status[\s\S]*grid-row:\s*2/);
assert.doesNotMatch(readerSource, /positiveDamage|negativeDamage|NO_WHOLE_SITE_SHUTDOWN\|OPERAT\|PRESENCE\|REOPEN\|CONTINU/, 'facility status must not be inferred from damage, presence, or continuity text');
assert.doesNotMatch(readerCss, /technical-record-metadata[\s\S]*display\s*:\s*none/i, 'internal fields must be removed structurally, not hidden by CSS');

assert.doesNotMatch(readerSource, /function\s+mount\s*\(/, 'reader support must not own a mount lifecycle');
assert.doesNotMatch(readerSource, /base\.mount\s*\(/, 'reader support must not wrap the superseded base mount');
assert.doesNotMatch(readerSource, /root\.AtlasPublicIA\s*=\s*api/, 'reader support must not replace the authoritative IA global');
assert.match(readerSource, /root\.AtlasPublicReaderSupport\s*=\s*api/, 'reader support must publish only its support namespace');

// Reader support is a signed dependency of one authoritative page registry; it has no mount or route lifecycle authority.
assert.match(releaseCore, /base_runtime/);
assert.match(releaseCore, /reader_support/);
assert.match(releaseCore, /page_registry/);
assert.match(releaseCore, /src\/public-reader-registry\.js/);
assert.match(releaseCore, /src\/public-reader-layer\.js/);
assert.match(releaseCore, /reader_stylesheet/);
assert.match(releaseCore, /src\/public-reader-layer\.css/);
assert.match(releaseCore, /2\.8-phase1-visualization-capabilities/);
assert.match(releaseCore, /visualization_runtime/);
assert.match(releaseCore, /MAPLIBRE_VERSION = "6\.11\.2"/);
assert.match(releaseBuilder, /from build_public_release_core import \*/);
assert.doesNotMatch(releaseBuilder, /_promote_reader_assets|_rebind_release_identity|_asset_set_sha256|READER_RUNTIME_SPEC|READER_STYLESHEET_SPEC|materialize_asset\(/);
assert.doesNotMatch(releaseBuilder, /compose_reader_sources|ATLAS_PUBLIC_READER_LAYER_COMPOSED|ATLAS_PUBLIC_READER_STYLES_COMPOSED/);
assert.doesNotMatch(releaseBuilder, /PAGE_REGISTRY|PUBLIC_STYLESHEET|retire_privileged_narrative_runtime|entrypoint_preparation/);
assert.match(appSource, /assetForRole\(manifest, 'graph_runtime'\)/);
assert.match(appSource, /assetForRole\(manifest, 'base_runtime'\)/);
assert.match(appSource, /assetForRole\(manifest, 'reader_support'\)/);
assert.match(appSource, /assetForRole\(manifest, 'page_registry'\)/);
assert.match(appSource, /assetForRole\(manifest, 'reader_stylesheet'\)/);
assert.match(appSource, /authorization\.runtimeAssets\.length === 6/);
assert.match(appSource, /assetForRole\(manifest, 'visualization_runtime'\)/);
assert.match(appSource, /authorization\.stylesheetAssets\.length === 3/);
assert.doesNotMatch(appSource, /ROOK_NARRATIVE_CURRENT|FINAL_NARRATIVE_GATES/);
assert.equal(fs.existsSync(path.join(root, 'scripts/retire_privileged_narrative_runtime.py')), false, 'retired entrypoint source transform remains in repository');

console.log('public reader layer: PASS - factual/intent separation, facility status integrity, constituent drilldown, structural public/internal boundary, explicit signed reader assets, single-pass release graph, and direct neutral entrypoint verified');
