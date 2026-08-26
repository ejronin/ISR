'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'endgame-so-far.json'), 'utf8'));
const scoreCorr = JSON.parse(fs.readFileSync(path.join(root, 'data', 'endgame-objective-score-corrections-20260825-r4.json'), 'utf8'));
const state = fs.readFileSync(path.join(root, 'js', 'state.js'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'js', 'navigation.js'), 'utf8');
const view = fs.readFileSync(path.join(root, 'js', 'endgame-20260823.js'), 'utf8');
const scoreboard = fs.readFileSync(path.join(root, 'js', 'endgame-objective-scoreboard-20260825-r2.js'), 'utf8');
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

const blockade = scoreCorr.iran_overrides.find(x => x.match === 'U.S. naval blockade terminated');
assert.ok(blockade);
assert.match(blockade.origin, /Iranian state-media victory framing/i);
assert.match(blockade.origin, /RESTORATIVE \/ DEFENSIVE CONDITION/i);
assert.equal(blockade.score, 0);

const iranRedline = scoreCorr.iran_overrides.find(x => x.match === 'No concessions on nuclear, missiles, defense or regional architecture');
assert.ok(iranRedline);
assert.equal(iranRedline.score, null);
assert.match(iranRedline.status, /UNSCORED \/ FINAL BARGAIN UNRESOLVED/i);
assert.match(iranRedline.assessment, /No nuclear concession yet is not evidence/i);

assert.match(state, /endgame:\s*'overview'/);
assert.match(nav, /\['endgame',\s*'Endgame \(so far\)'\]/);
assert.match(nav, /ensureEndgamePanel/);
assert.match(nav, /endgame-20260823\.js/);
assert.match(view, /Evidence cutoff/);
assert.match(view, /Do not move the goalposts/);
assert.match(view, /Original victory-condition ledger/);
assert.match(view, /Rhetorical contraction \/ walk-back/);
assert.match(scoreboard, /endgame-objective-score-corrections-20260825-r4\.json/);
assert.match(scoreboard, /corr\?\.iran_overrides/);
assert.match(scoreboard, /Restorative conditions are explicitly labeled/);
assert.match(css, /#endgame/);

console.log('endgame-page: Atlas view, cutoff behavior, victory-condition ledger, Iran scoring caveats and evidence trail passed');
