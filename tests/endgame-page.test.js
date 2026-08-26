'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'endgame-so-far.json'), 'utf8'));
const scoreData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'endgame-us-objectives-20260825-r1.json'), 'utf8'));
const scoreCorr = JSON.parse(fs.readFileSync(path.join(root, 'data', 'endgame-objective-score-corrections-20260825-r4.json'), 'utf8'));
const state = fs.readFileSync(path.join(root, 'js', 'state.js'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'js', 'navigation.js'), 'utf8');
const view = fs.readFileSync(path.join(root, 'js', 'endgame-20260823.js'), 'utf8');
const scoreboard = fs.readFileSync(path.join(root, 'js', 'endgame-objective-scoreboard-20260825-r2.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'endgame-20260823.css'), 'utf8');
const scoreboardCss = fs.readFileSync(path.join(root, 'css', 'endgame-objective-scoreboard-20260825-r2.css'), 'utf8');

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

function applyOverrides(items, overrides){
  return items.map(item => {
    const out = {...item};
    const o = overrides.find(x => x.match === item.objective);
    if(o){
      if(Object.prototype.hasOwnProperty.call(o, 'score')) out.score = o.score;
      if(o.objective) out.objective = o.objective;
    }
    return out;
  });
}
function tally(items){
  const adjudicable = items.filter(x => x.score != null);
  const points = adjudicable.reduce((sum, x) => sum + Math.max(0, Math.min(4, Number(x.score) || 0)), 0);
  return {
    documented: items.length,
    adjudicable: adjudicable.length,
    unresolved: items.length - adjudicable.length,
    points,
    available: adjudicable.length * 4
  };
}
const usTally = tally(applyOverrides(scoreData.us_objectives, scoreCorr.us_overrides || []));
const iranTally = tally(applyOverrides(scoreData.iran_objectives, scoreCorr.iran_overrides || []));
assert.deepEqual(usTally, {documented:5, adjudicable:4, unresolved:1, points:11, available:16});
assert.deepEqual(iranTally, {documented:8, adjudicable:7, unresolved:1, points:2, available:28});

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
assert.match(scoreboard, /function tally\(items\)/);
assert.match(scoreboard, /available=adjudicable\.length\*4/);
assert.match(scoreboard, /Only adjudicable objectives enter the point denominator/);
assert.match(scoreboard, /Unweighted objective tally — not a strategic-weight victory index/);
assert.doesNotMatch(scoreboard, /11 \/ 16/);
assert.doesNotMatch(scoreboard, /2 \/ 28/);
assert.match(scoreboard, /Restorative conditions are explicitly labeled/);
assert.match(scoreboardCss, /eg25-tally-summary/);
assert.match(scoreboardCss, /eg25-tally-metrics/);
assert.match(css, /#endgame/);

console.log('endgame-page: Atlas view, dynamic objective tally, cutoff behavior, victory-condition ledger, Iran scoring caveats and evidence trail passed');
