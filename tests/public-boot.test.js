'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const app = require('../js/public-app.js');

const manifest = json('data/public-release.json');
const model = json('data/public-current-state.json');
const canonical = text => text.replace(/\r\n?/g, '\n');
const digest = text => crypto.createHash('sha256').update(Buffer.from(canonical(text), 'utf8')).digest('hex');
const byteLength = text => Buffer.byteLength(canonical(text), 'utf8');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function response(text, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return text; }
  };
}

function fixtureFetch(url) {
  const pathname = String(url).replace(/^\.\//, '').split('?')[0];
  const candidate = path.join(root, pathname);
  if (!fs.existsSync(candidate)) return Promise.resolve(response('missing', 404));
  return Promise.resolve(response(fs.readFileSync(candidate, 'utf8')));
}

(async () => {
  assert.equal(app.APPLICATION_VERSION, 'atlas-public-shell-v1');
  app.validateManifest(manifest, app.APPLICATION_VERSION);
  app.validateModel(model, manifest);
  assert.equal(model.counts.chronology_records, 205);
  assert.equal(model.release.current_osint_cutoff, '2026-08-27T08:25:00-04:00');
  assert.equal(manifest.current_state.release_identity, model.release.release_identity);
  assert.equal(digest(read('data/public-current-state.json')), manifest.current_state.sha256);
  assert.equal(byteLength(read('data/public-current-state.json')), manifest.current_state.bytes);
  await app.verifyApplicationAssets(manifest, fixtureFetch);

  const loaded = await app.loadCurrentRecord({
    fetchImpl: fixtureFetch,
    documentVersion: app.APPLICATION_VERSION
  });
  assert.equal(loaded.model.chronology.length, 205);
  assert.equal(loaded.manifest.release_identity, manifest.release_identity);
  assert(loaded.performance.model_transfer_bytes > 4_000_000, 'Phase 2 model transfer observation must remain explicit');
  assert(loaded.performance.model_parse_milliseconds >= 0);

  const wrongApplication = clone(manifest);
  wrongApplication.application.version = 'stale-public-shell';
  assert.throws(
    () => app.validateManifest(wrongApplication, app.APPLICATION_VERSION),
    error => error.code === 'RELEASE_MISMATCH'
  );

  const wrongModel = clone(model);
  wrongModel.release.release_identity = 'public-current-v1-0000000000000000';
  assert.throws(
    () => app.validateModel(wrongModel, manifest),
    error => error.code === 'RELEASE_MISMATCH'
  );

  await assert.rejects(
    app.loadCurrentRecord({
      fetchImpl: async url => String(url).includes('public-current-state') ? response('unavailable', 503) : fixtureFetch(url),
      verifyAssets: false,
      documentVersion: app.APPLICATION_VERSION
    }),
    error => error.code === 'FETCH_FAILED'
  );
  assert.match(app.failureDetail({ code: 'FETCH_FAILED' }), /unavailable|integrity/i);

  const index = read('index.html');
  assert.equal(index, read('templates/public-index.html'), 'public root must match its reviewable shell source');
  const scriptSources = [...index.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)].map(match => match[1]);
  assert.equal(scriptSources.length, 1, 'initial document must have one application entry point');
  assert.match(scriptSources[0], /^js\/public-app\.js/);
  for (const forbidden of [
    'Reviewed through 2026-08-20 15:59 ET',
    '>108</b><span>current chronology records',
    'current-update-20260824.js',
    'id="primaryNav"',
    'id="map"'
  ]) assert(!index.includes(forbidden), `initial document exposes legacy state: ${forbidden}`);
  assert(index.includes('Loading current evidence record…'));
  assert(index.includes('The Atlas will not display an older release as current'));

  const legacy = read('legacy/phase1-public-runtime-reference.html');
  assert(legacy.includes('current-update-20260824.js'), 'retired presentation reference must preserve the dated runtime for audit');
  assert(legacy.includes('>108</b><span>current chronology records'), 'retired presentation reference must preserve its obsolete baseline state');
  assert(!index.includes('legacy/phase1-public-runtime-reference.html'), 'retired presentation reference must not enter current boot');

  console.log('public boot contract: PASS - cold shell, release binding, 205-record model, mismatch rejection, failure behavior, and retired successor chain verified');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
