'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'endgame-so-far.json'), 'utf8'));
const state = fs.readFileSync(path.join(root, 'js', 'state.js'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'js', 'navigation.js'), 'utf8');
const view = fs.readFileSync(path.join(root, 'js', 'endgame-20260823.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'endgame-20260823.css'), 'utf8');

assert.equal(data.meta.page_id, 'endgame');
assert.match(data.meta.analytical_lock, /survival is an observed fact, not an original victory condition/i);
assert.ok(data.original_claims.length >= 6);
assert.ok(data.victory_ledger.length >= 8);
assert.ok(data.sources.some(s => s.outlet === 'Reuters'));
assert.ok(data.sources.some(s => /Press TV|IranWire/.test(s.outlet)));
assert.ok(data.sources.some(s => s.id === 'PT-20260522-MINIMUM'));
assert.ok(data.sources.some(s => s.id === 'RTR-20260817-UNREST'));
assert.ok(data.original_claims.some(x => /existential/i.test(x.phase)));
assert.ok(data.original_claims.some(x => /MINIMUM ACCEPTABLE OUTCOME/.test(x.phase)));
assert.ok(data.rhetorical_contraction.some(x => /REDUCED ENDGAME FRAME/.test(x.label)));
assert.ok(data.endgame_test.does_not_follow.some(x => /Survival alone.*original victory conditions/i.test(x)));
assert.match(state, /endgame:\s*'overview'/);
assert.match(nav, /\['endgame',\s*'Endgame \(so far\)'\]/);
assert.match(nav, /ensureEndgamePanel/);
assert.match(nav, /endgame-20260823\.js/);
assert.match(nav, /endgame-20260823\.css/);
assert.match(view, /Evidence cutoff/);
assert.match(view, /Do not move the goalposts/);
assert.match(view, /Original victory-condition ledger/);
assert.match(view, /Rhetorical contraction \/ walk-back/);
assert.match(css, /#endgame/);

console.log('endgame-page: Atlas view, cutoff behavior, victory-condition ledger and evidence trail passed');
