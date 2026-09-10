'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const source = read('js/public-ia.js');
const appSource = read('js/public-app.js');
const css = read('css/public-shell.css');
const releaseBuilder = read('scripts/build_public_release.py');
const retirementScript = path.join(root, 'scripts', 'retire_privileged_narrative_runtime.py');

assert.equal(fs.existsSync(path.join(root, 'config', 'rook-narrative-current.json')), false, 'retired persona narrative config remains active');
assert.equal(fs.existsSync(path.join(root, 'scripts', 'sync_rook_narrative.py')), false, 'retired persona narrative sync script remains active');
assert(fs.existsSync(retirementScript), 'neutral entrypoint preparation transform is missing');
assert(releaseBuilder.includes('import retire_privileged_narrative_runtime as entrypoint_preparation'), 'release builder does not import neutral entrypoint preparation');
assert(releaseBuilder.includes('entrypoint_preparation.apply(root)'), 'release builder does not prepare the neutral entrypoint before signing');
assert(releaseBuilder.includes('reader_runtime') && releaseBuilder.includes('reader_stylesheet'), 'release builder does not publish reader assets explicitly');
assert(!releaseBuilder.includes('compose_reader_sources'), 'release builder still concatenates reader source into base assets');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-neutral-narrative-'));
try {
  fs.mkdirSync(path.join(temp, 'js'));
  fs.writeFileSync(path.join(temp, 'js', 'public-app.js'), appSource);
  const run = spawnSync(process.env.PYTHON || 'python3', [retirementScript, '--root', temp], { encoding: 'utf8' });
  assert.equal(run.status, 0, `neutral entrypoint preparation transform failed: ${run.stderr || run.stdout}`);
  const deployableApp = fs.readFileSync(path.join(temp, 'js', 'public-app.js'), 'utf8');
  assert(!deployableApp.includes('ROOK_NARRATIVE_CURRENT'), 'deployable entrypoint still contains persona narrative payload');
  assert(!deployableApp.includes('FINAL_NARRATIVE_GATES'), 'deployable entrypoint still contains retired narrative contract');
  assert(!deployableApp.includes('narrativeContract: FINAL_NARRATIVE_GATES'), 'deployable entrypoint still supplies retired narrative contract');
  assert(deployableApp.includes('narrativeContract: null'), 'deployable entrypoint does not explicitly disable the retired narrative hook');
  assert(deployableApp.includes('ATLAS_PRIVILEGED_NARRATIVE_RETIRED'), 'deployable entrypoint lacks retirement marker');
  assert(deployableApp.includes("assetForRole(manifest, 'reader_runtime')"), 'deployable entrypoint does not authorize reader runtime');
  assert(deployableApp.includes("assetForRole(manifest, 'reader_stylesheet')"), 'deployable entrypoint does not authorize reader stylesheet');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

for (const phrase of [
  'Final polish semantic state notices',
  'Where things stand now',
  'Economic pressure on Iran is severe; regime collapse is not established',
  'The Strait remains physically traversable but commercially contested',
  'The June MOU no longer controls either side, but talks remain active',
  'Current diplomatic state',
  'Wartime agreements and negotiations',
  'Earlier agreements relevant to the war',
  'Geolocated shipping or commercial-loss records in this view: 0',
  'Four strategic transport corridors are shown'
]) assert(source.includes(phrase) || phrase === 'Four strategic transport corridors are shown' && source.includes('strategic transport corridor'), `missing final-polish public contract: ${phrase}`);

assert(source.includes("now.dataset.currentStateSummary = 'four-domain'"), 'Start Here current-state summary is not explicitly four-domain');
for (const domain of ['Military', 'Hormuz', 'Economy', 'Diplomacy']) assert(source.includes(`domain: '${domain}'`), `Start Here missing ${domain} orientation card`);
assert(source.includes("const firstWar = context.model.chronology.find"), 'Start Here opening-war context is not derived from chronology');
assert(source.includes("const diplomaticEvents = context.model.chronology.filter"), 'Start Here diplomacy context is not derived from chronology');
assert(source.includes("const publicView = modelData(context.model, 'analysis.endgame_public_view')"), 'Start Here does not consume its neutral public evidence view');
assert(source.includes("wartime.dataset.agreementGroup = 'wartime'"), 'wartime agreements group is absent');
const diplomacyPageSource = source.slice(source.indexOf('function DiplomacyPage'), source.indexOf('function MouPage'));
assert(!diplomacyPageSource.includes("'analysis.endgame_public_view'"), 'Talks overview reaches outside its mapped agreements/diplomacy evidence contract');
assert(source.includes("earlier.dataset.agreementGroup = 'historical'"), 'historical agreements group is absent');
assert(source.includes("notice.dataset.stateNotice = variant"), 'State Notice component lacks deterministic variant metadata');
assert(source.includes("variant: 'no-geolocated-records'"), 'Shipping zero geography does not use the semantic State Notice');
assert(source.includes("variant: 'dependency-unavailable'"), 'dependency unavailable State Notice is not used');

const retirementNote = read('docs/PRIVILEGED_NARRATIVE_RETIREMENT_2026-09-10.md');
for (const eventId of [
  'G3-US-IRAN-TANKERS-20260908',
  'G3-IRAN-JORDAN-BASE-ATTACK-20260908',
  'G3-HOUTHI-SAUDI-ENERGY-ATTACKS-20260908',
  'G3-NEW-ANDROS-DRONE-STRIKE-20260909',
  'G3-HORMUZ-TRAFFIC-20260909',
  'G3-BRENT-100-20260909'
]) assert(retirementNote.includes(eventId), `retired narrative evidence parity note missing ${eventId}`);

for (const phrase of [
  'Final polish design-system convergence', '--atlas-surface-card', '--atlas-focus-ring',
  '.evidence-clock-mobile', '.state-notice', '.current-state-grid',
  '.agreement-state.selected', '@media (prefers-reduced-motion: reduce)'
]) assert(css.includes(phrase), `missing final-polish CSS contract: ${phrase}`);
assert(css.includes('outline: 2px solid var(--atlas-focus-ring)'), 'editorial H1 keyboard focus is not preserved');
assert(css.includes('min-height: 2.75rem'), 'touch-target floor is absent');
assert(!css.includes('font-size: .58rem'), 'final polish still depends on sub-readable .58rem mobile type');

console.log('public final polish: PASS - current-state hierarchy, semantic state notices, Talks grouping, neutral entrypoint preparation and shared interaction/readability contracts verified');
