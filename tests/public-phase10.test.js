'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ia = require('../js/public-ia.js');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const model = JSON.parse(read('data/public-current-state.json'));
const source = read('js/public-ia.js');
const css = read('css/public-shell.css');

assert.equal(model.release.gate2_evidence_cutoff, '2026-09-05T00:37:00-04:00');
assert.equal(model.release.current_osint_cutoff, '2026-09-06T14:10:43-04:00');
assert.equal(ia.formatEvidenceClock(model.release.gate2_evidence_cutoff), 'Sep. 5, 2026 · 12:37 AM ET');
assert.equal(ia.formatEvidenceClock(model.release.current_osint_cutoff), 'Sep. 6, 2026 · 2:10 PM ET');
assert.equal(ia.ROUTES.get('evidence.information').title, 'Lie Ledger');

assert.equal(ia.propositionStatusLabel('DISPROVEN'), 'False');
assert.equal(ia.propositionStatusLabel('FALSE'), 'False');
assert.equal(ia.propositionStatusLabel('SUPPORTED'), 'Substantially true');
assert.equal(ia.propositionStatusLabel('UNSUPPORTED'), 'Unsupported');
assert.equal(ia.propositionStatusLabel('DISPUTED'), 'Disputed');
assert.equal(ia.propositionStatusLabel('UNRESOLVED'), 'Unresolved');
assert.equal(ia.deceptionDisplay({ deception_score: 0 }), '0 — No evidence of knowing deception');
assert.equal(ia.deceptionDisplay({ deception_score: 2 }), '2 — Basis recorded below');
assert.equal(ia.deceptionDisplay({ deception_score: 2, deception_classification: 'ENCODED_CLASS' }), '2 — Encoded class');
assert.equal(ia.objectiveChangeLabel({ type: 'WALKBACK' }), 'Walkback');
assert.notEqual(ia.objectiveChangeLabel({ movement: 'WALKBACK_DILUTED_CANDIDATE_IF_ADOPTED' }), 'Walkback');
assert.equal(ia.lossQuantityLabel({ quantity: null }), 'Quantity: unknown');
assert.equal(ia.materialAssetClass({ military_platform: false }), 'Commercial / civilian');
assert.equal(ia.materialAssetClass({ military_platform: true }), 'Military');

for (const phrase of [
  'Frozen review cutoff', 'Current evidence cutoff',
  'Historical evaluation uses only evidence available by this time.',
  'Current Atlas evidence includes material incorporated through this time.',
  'Observation', 'Actor claim', 'Source reporting', 'Independent corroboration', 'Atlas assessment', 'Competing explanation', 'Confidence & limits',
  'Claim accuracy & deception evidence', 'A false statement is not automatically a deliberate lie.',
  'Evidence of knowing deception', 'Reasonable institutional knowledge',
  'From damage to strategic effect', 'A confirmed hit does not by itself establish destroyed capability or strategic effect.',
  'Physical damage', 'Asset lost', 'Subsystem degraded', 'Function degraded', 'Local operational effect', 'Theater operational effect', 'Strategic consequence',
  'Unknown ≠ zero.', 'Claimed ≠ verified.', 'Reported ≠ established.', 'Unsupported ≠ false.', 'Disputed ≠ false.',
  'IRGC claim: six vessel successes. Verified loss count not established.',
  'Attribution strengthened by later evidence. Existing event retained.',
  'Outcome against original objective', 'Outcome against revised objective'
]) assert(source.includes(phrase), `missing Phase 10 public language: ${phrase}`);

assert(!source.includes("const deceptionLabels = ['No evidence of deception', 'Possible spin'"), 'frontend still invents positive deception-score semantics');
assert(!source.includes("append(deceptionLabel, 'label', '', 'Deception score')"), 'old deception UI label remains');
assert(source.includes("? `Evidence (${references.length + relatedRecords.length})`"), 'Evidence drawer is not using the approved system label');
assert(css.includes('Phase 10 evidence-state presentation'));
assert(css.includes('Phase 10 approved visual sweep'));
assert(source.includes("const analyticalHero = article.querySelector('.analytical-hero')"), 'analytical hero is not recognized by local navigation');
assert(source.includes('(analyticalHero || clocks || glance || intro).after(nav)'), 'local section navigation can still precede the analytical hero');
assert(source.includes("density.dataset.timelineDensity = 'record-count-only'"), 'timeline density is not explicitly record-count-only');
assert(source.includes('not greater strategic importance'), 'timeline density lacks the non-importance guardrail');
assert(source.includes("system.dataset.shippingMapSystem = 'chokepoint-network'"), 'Shipping lacks the two-scope map system');
assert(source.includes("network.dataset.shippingMapView = 'network'"), 'Shipping network-consequences map is absent');
assert(source.includes("details.dataset.aggregation = 'record-count-only'"), 'loss summaries are not explicitly record-count-only');
assert(source.includes('details.dataset.contributingRecordIds'), 'loss summary aggregation does not expose contributing stable IDs');
assert(source.includes("section.dataset.interpolation = 'none'"), 'economy view does not explicitly prohibit interpolation');
assert(source.includes("section.dataset.agreementBalance = 'existing-position-derived'"), 'MOU balance does not declare its existing analytical source');
assert(source.includes('Balance not adjudicated'), 'MOU non-scorable fallback is absent');

const oilRoutePayload = model.datasets['analysis.oil_routes'].payload;
assert(Array.isArray(oilRoutePayload.routes) && oilRoutePayload.routes.length >= 4, 'supported oil/shipping route geometry is unavailable');
assert(oilRoutePayload.routes.every(route => Array.isArray(route.coords) && route.coords.length >= 2), 'a supported route lacks renderable geometry');
const economyPayload = model.datasets['ledger.economics'].payload;
assert(Array.isArray(economyPayload.forecast_context?.rows) && economyPayload.forecast_context.rows.length >= 2, 'economy view lacks comparable source snapshots');
const mouTracks = model.datasets['analysis.hormuz'].payload.mou_position_tracks;
assert(Array.isArray(mouTracks) && mouTracks.length > 0, 'MOU position tracks are unavailable');
assert(mouTracks.filter(track => track.scorable).every(track => Number.isFinite(Number(track.position))), 'scorable MOU term lacks an existing numeric analyst position');

const losses = (() => { const payload = model.datasets['current.material_losses'].payload; return payload.records || []; })();
assert.equal(losses.length, 57);
assert(losses.every(record => record.quantity !== null || record.quantity !== 0), 'unknown quantity was converted to zero');

console.log('public Phase 10: PASS - evidence semantics plus approved visual-sweep contracts for timeline density, shipping routes, auditable loss aggregation, non-interpolated economics and MOU balance verified');
