'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ia = require('../js/public-ia.js');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data', 'public-current-state.json'), 'utf8'));
const canonicalManifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'canonical-ledger', 'manifest-v2.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'js', 'public-ia.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'public-shell.css'), 'utf8');

assert.equal(model.counts.chronology_records, model.chronology.length, 'public copy must derive the accepted chronology count');
assert.equal(model.release.gate2_evidence_cutoff, '2026-09-05T00:37:00-04:00', 'frozen Gate 2 boundary changed');
assert.equal(model.release.current_osint_cutoff, canonicalManifest.current_evidence_cutoff, 'public status must derive the accepted current read model');
const acceptedUpdates = canonicalManifest.accepted_updates;
assert(Array.isArray(acceptedUpdates) && acceptedUpdates.length > 0, 'canonical manifest must retain an accepted update lineage');
const latestAccepted = acceptedUpdates.at(-1);
assert.equal(typeof latestAccepted.evidence_cutoff, 'string', 'latest accepted update must carry an evidence cutoff');
assert(latestAccepted.evidence_cutoff.length > 0, 'latest accepted update evidence cutoff must not be empty');
assert.equal(typeof latestAccepted.known_at, 'string', 'latest accepted update must carry a knowledge-effective time');
assert(latestAccepted.known_at.length > 0, 'latest accepted update knowledge-effective time must not be empty');
assert.equal(canonicalManifest.current_evidence_cutoff, latestAccepted.evidence_cutoff, 'current evidence cutoff must derive from the latest accepted evidence horizon');
for (const [index, update] of acceptedUpdates.entries()) {
  const knownAt = Date.parse(update.known_at);
  const evidenceCutoff = Date.parse(update.evidence_cutoff);
  assert.equal(update.sequence, index + 1, 'accepted update sequence must remain contiguous');
  assert(Number.isFinite(knownAt), `accepted update ${index + 1} known_at must be a valid timestamp`);
  assert(Number.isFinite(evidenceCutoff), `accepted update ${index + 1} evidence_cutoff must be a valid timestamp`);
  assert(evidenceCutoff <= knownAt, `accepted update ${index + 1} evidence cutoff may precede but may not be later than known_at`);
  if (index > 0) {
    const previous = acceptedUpdates[index - 1];
    assert(knownAt > Date.parse(previous.known_at), 'accepted known_at values must increase strictly');
    assert(evidenceCutoff >= Date.parse(previous.evidence_cutoff), 'accepted evidence cutoffs may not move backward');
  }
}
assert.notEqual(model.release.current_osint_cutoff, model.release.gate2_evidence_cutoff, 'current status must remain distinct from the frozen Gate 2 boundary after accepted later evidence');
assert.equal(ia.ROUTES.size, 26, 'public route inventory must include Web of Lies');
assert.equal(new Set([...ia.ROUTES.values()].map(route => route.owner)).size, 26, 'each route must retain one page owner');
assert([...ia.ROUTES.values()].every(route => route.dataKeys.every(key => !key.startsWith('legacy.'))), 'a current route maps a legacy dataset');

for (const phrase of [
  'How the conflict opened',
  'Where things stand now',
  'Where to go next',
  'Iran originally said it would control and manage the Strait.',
  'The June MOU no longer controls what either side has to do.',
  'Original and wartime objectives',
  'Evidence supporting the claim',
  'Unknown does not mean zero.'
]) assert(source.includes(phrase), `required public explanation missing: ${phrase}`);

assert(source.includes('From damage to strategic effect'), 'Phase 10 military-effects framework is missing its reader-facing heading');
assert(source.includes('A confirmed hit does not by itself establish destroyed capability or strategic effect.'), 'Phase 10 military-effects guardrail is missing');
for (const effect of [
  'Physical damage',
  'Asset lost',
  'Subsystem degraded',
  'Function degraded',
  'Local operational effect',
  'Theater operational effect',
  'Strategic consequence'
]) assert(source.includes(effect), `Phase 10 military-effects category missing: ${effect}`);
assert(source.includes('This is an effects framework, not an automatic severity staircase.'), 'Phase 10 military-effects framework must reject automatic progression');
assert(source.includes('Asset loss and functional degradation are independent analytical dimensions'), 'Phase 10 military-effects framework must keep asset loss and function degradation independent');
assert(source.includes('A launch does not prove penetration, impact or damage.'), 'method page no longer preserves the launch/effect distinction');

for (const forbidden of [
  'window.ATLAS_CURRENT_UPDATE',
  'current-update-20260824.js',
  'current-update-20260825.js',
  'current-update-20260826.js',
  'current-update-20260827.js'
]) assert(!source.includes(forbidden), `Phase 4 reintroduced browser update replay: ${forbidden}`);

const losses = model.datasets['analysis.casualty_corrections'].payload;
assert.deepEqual(losses.united_states.current_display, {
  hostile_deaths: 11,
  missing: 1,
  non_hostile_military_deaths: 7,
  total_military_dead: 18,
  wounded: 757
});
assert.equal(losses.iran.official_snapshot.military_dead, 2008);
assert.equal(losses.iran.current_military_only_total, null);

const abandonment = model.datasets['current.claims'].payload.claims.find(claim => claim.case_id === 'CASE-US-REGIONAL-ABANDONMENT-NARRATIVE-2026');
assert(abandonment, 'accepted abandonment claim case is missing');
assert.equal(abandonment.current_verdict, 'FALSE — CAUSATION NOT SUPPORTED');
assert.match(abandonment.what_actually_happened, /drawdowns already in execution/i);

for (const selector of [
  '.lead-story',
  '.story-sequence',
  '.atlas-leaflet-map',
  '.bar-chart',
  '.comparison-grid',
  '.claim-case',
  '.source-variants'
]) assert(css.includes(selector), `Phase 4 layout treatment missing: ${selector}`);
assert.match(css, /@media \(max-width: 52rem\)/);
assert.match(css, /@media \(max-width: 32rem\)/);
assert.match(css, /prefers-reduced-motion/);

console.log('public content redesign contract: PASS - narratives, evidence boundaries, Phase 10 effects framework, 26-route ownership, canonical current state, claims, casualties, maps/charts, and responsive foundations verified');
