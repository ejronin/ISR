'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const data = JSON.parse(read('data/endgame-adjudication-v1.json'));
const sourceContext = JSON.parse(read('data/source-context-v1.json'));
const loader = read('js/endgame-20260823.js');
const view = read('js/endgame-adjudication-r1.js');
const css = read('css/endgame-adjudication-r1.css');
const version = JSON.parse(read('vendor/mermaid/VERSION.json'));

const allowed = new Set(['PROCEEDS_UNDER_IRAN_DEMAND','WALKED_BACK_DILUTED','CUT_OFF_DENIED','OPEN_UNRESOLVED']);
assert.deepEqual(new Set(Object.keys(data.terminal_state_labels)), allowed);
assert.ok(data.claims.length >= 8);
for (const claim of data.claims) {
  assert.ok(allowed.has(claim.current_disposition.state), claim.id);
  assert.ok(claim.path.length >= 2, claim.id);
  if (claim.mou_relationship.dependent) {
    assert.equal(claim.mou_relationship.applicability, 'EXPIRED_NON_CONTROLLING');
    assert.equal(claim.mou_relationship.current_control_state, 'NON_CONTROLLING');
    assert.equal(claim.mou_relationship.final_deal_completed, false);
  }
}
const hormuz = data.claims.find(c => c.id === 'hormuz');
assert.deepEqual(new Set(hormuz.dimensions.map(d => d.id)), new Set(['legal','operational','fees']));
assert.equal(hormuz.dimensions.find(d => d.id === 'operational').state, 'PROCEEDS_UNDER_IRAN_DEMAND');
assert.notEqual(hormuz.dimensions.find(d => d.id === 'legal').state, hormuz.dimensions.find(d => d.id === 'operational').state);

assert.equal(data.mou_instrument.display_state, 'EXPIRED / NON-CONTROLLING');
assert.match(data.mou_instrument.new_bargain_rule, /later agreement may independently revive/i);

assert.match(view, /buildMermaidGraph\(adj\)/);
assert.match(view, /securityLevel: 'strict'/);
assert.match(view, /htmlLabels: false/);
assert.match(view, /vendor\/mermaid\/mermaid\.min\.js/);
assert.doesNotMatch(view, /cdn\.jsdelivr|unpkg\.com/i);
assert.match(view, /\['16×','32×'\]/);
assert.match(view, /setVisualZoom\(v\)/);
assert.match(view, /Evidence cutoff/);
assert.match(view, /Do not move the goalposts/);
assert.match(view, /Original victory-condition ledger/);
assert.match(view, /Rhetorical contraction \/ walk-back/);
assert.match(loader, /endgame-adjudication-r1\.js/);
assert.match(loader, /endgame-adjudication-r1\.css/);
assert.match(view, /SURVIVAL IS AN OBSERVED FACT/);
assert.match(view, /SURVIVAL WAS NOT THE ORIGINAL VICTORY CONDITION/);
assert.match(view, /NO INDEPENDENT POLITICAL-BIAS RATING LOCATED|unrated_display/);
assert.match(view, /Provenance:/);
assert.match(view, /Atlas role:/);
assert.match(css, /flex-wrap:nowrap!important/);
assert.match(css, /\.kpis\{display:none!important\}/);
assert.match(css, /#timelineSearch\[hidden\]/);
assert.match(css, /eg-graph-dim/);
assert.match(css, /prefers-reduced-motion/);

assert.equal(version.version, '11.6.0');
assert.equal(sourceContext.political_bias.unrated_display, 'NO INDEPENDENT POLITICAL-BIAS RATING LOCATED');
assert.ok(sourceContext.provenance_categories.includes('STATE MEDIA'));
assert.ok(sourceContext.provenance_categories.includes('SATELLITE / IMAGERY'));

console.log('ui-endgame-mermaid-r1: compact shell, 32x timeline, structured adjudication, MoU expiry, Hormuz branches, Mermaid security, and source context passed');
