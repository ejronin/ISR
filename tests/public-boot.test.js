'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const bootstrap = require('../js/public-bootstrap.js');
const app = require('../js/public-app.js');
const ia = require('../js/public-ia.js');

const manifest = json('data/public-release.json');
const model = json('data/public-current-state.json');
const canonical = text => text.replace(/\r\n?/g, '\n');
const bytes = text => Buffer.from(canonical(text), 'utf8');
const digest = text => crypto.createHash('sha256').update(bytes(text)).digest('hex');
const integrity = text => `sha256-${crypto.createHash('sha256').update(bytes(text)).digest('base64')}`;
const byteLength = text => bytes(text).byteLength;

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

function fakeBootstrapScript(sourceManifest = manifest) {
  const asset = sourceManifest.neutral_bootstrap.asset;
  return {
    src: `http://localhost/${asset.path}`,
    integrity: asset.integrity,
    dataset: { bootstrapSha256: asset.sha256 }
  };
}

function fakeAuthorizedRuntime(sourceManifest = manifest) {
  const entrypoint = app.assetForRole(sourceManifest, 'entrypoint');
  const stylesheet = app.assetForRole(sourceManifest, 'stylesheet');
  const runtimes = ['map_runtime', 'page_registry'].map(role => app.assetForRole(sourceManifest, role));
  const stylesheets = ['map_stylesheet', 'stylesheet'].map(role => app.assetForRole(sourceManifest, role));
  const geography = app.assetForRole(sourceManifest, 'reference_geography');
  const authorization = {
    releaseIdentity: sourceManifest.release_identity,
    manifest: sourceManifest,
    bootstrapPath: sourceManifest.neutral_bootstrap.asset.path,
    entrypointPath: entrypoint.path,
    stylesheetPath: stylesheet.path,
    runtimeAssets: runtimes.map(runtime => ({ path: runtime.path, sha256: runtime.sha256 })),
    stylesheetAssets: stylesheets.map(style => ({ path: style.path, sha256: style.sha256 })),
    referenceGeography: { path: geography.path, sha256: geography.sha256 },
    evidenceImages: [],
    entrypointSha256: entrypoint.sha256,
    stylesheetSha256: stylesheet.sha256
  };
  const executingScript = {
    src: `http://localhost/${entrypoint.path}`,
    integrity: entrypoint.integrity,
    dataset: {
      atlasAuthorizedEntrypoint: sourceManifest.release_identity,
      assetSha256: entrypoint.sha256
    }
  };
  const activeStyles = stylesheets.map(style => ({
    href: `http://localhost/${style.path}`,
    integrity: style.integrity,
    dataset: { atlasAuthorizedStyle: sourceManifest.release_identity, assetSha256: style.sha256 }
  }));
  const activeRuntimes = runtimes.map(runtime => ({
    src: `http://localhost/${runtime.path}`,
    integrity: runtime.integrity,
    dataset: { atlasAuthorizedRuntime: sourceManifest.release_identity, assetSha256: runtime.sha256 }
  }));
  return {
    authorization,
    executingScript,
    documentObject: { querySelectorAll: selector => selector.startsWith('script') ? activeRuntimes : activeStyles }
  };
}

(async () => {
  assert.equal(bootstrap.BOOTSTRAP_PROTOCOL, 'atlas-release-bootstrap-v1');
  assert.equal(bootstrap.APPLICATION_VERSION, 'atlas-public-shell-v1');
  assert.equal(app.APPLICATION_VERSION, 'atlas-public-shell-v1');
  bootstrap.validateManifest(manifest, fakeBootstrapScript());
  app.validateManifest(manifest);
  app.validateModel(model, manifest);
  ia.validateRegistry(model);

  const bootstrapAsset = manifest.neutral_bootstrap.asset;
  const applicationAssets = manifest.application.assets;
  assert.equal(applicationAssets.length, 6);
  assert.deepEqual(new Set(applicationAssets.map(asset => asset.role)), new Set(['map_runtime', 'page_registry', 'map_stylesheet', 'stylesheet', 'reference_geography', 'entrypoint']));
  for (const asset of [bootstrapAsset, ...applicationAssets]) {
    const generated = read(asset.path);
    const source = read(asset.source_path);
    assert.equal(generated, canonical(source), `generated asset bytes differ from source: ${asset.role}`);
    assert.equal(digest(generated), asset.sha256, `generated asset hash mismatch: ${asset.role}`);
    assert.equal(integrity(generated), asset.integrity, `generated asset SRI mismatch: ${asset.role}`);
    assert.equal(byteLength(generated), asset.bytes, `generated asset byte count mismatch: ${asset.role}`);
    assert(asset.path.includes(asset.sha256), `generated asset is not content-addressed: ${asset.role}`);
  }

  const runtime = fakeAuthorizedRuntime();
  assert.equal(app.validateRuntimeAuthorization(runtime.authorization, runtime.executingScript, runtime.documentObject), manifest);
  assert.equal(model.counts.chronology_records, 205);
  assert.equal(model.release.current_osint_cutoff, '2026-08-27T08:25:00-04:00');
  assert.equal(manifest.current_state.release_identity, model.release.release_identity);
  assert.equal(digest(read('data/public-current-state.json')), manifest.current_state.sha256);
  assert.equal(byteLength(read('data/public-current-state.json')), manifest.current_state.bytes);

  const loaded = await app.loadCurrentRecord({ manifest, fetchImpl: fixtureFetch });
  assert.equal(loaded.model.chronology.length, 205);
  assert.equal(loaded.manifest.release_identity, manifest.release_identity);
  assert(loaded.performance.model_transfer_bytes > 4_000_000, 'Phase 2 model transfer observation must remain explicit');
  assert(loaded.performance.model_parse_milliseconds >= 0);

  const wrongApplication = clone(manifest);
  wrongApplication.application.version = 'stale-public-shell';
  assert.throws(
    () => bootstrap.validateManifest(wrongApplication, fakeBootstrapScript(wrongApplication)),
    error => error.code === 'RELEASE_MISMATCH'
  );

  const wrongBootstrapScript = fakeBootstrapScript();
  wrongBootstrapScript.src = 'http://localhost/assets/releases/public-bootstrap.old-valid.js';
  assert.throws(
    () => bootstrap.validateManifest(manifest, wrongBootstrapScript),
    error => error.code === 'RELEASE_MISMATCH'
  );

  const wrongRuntime = fakeAuthorizedRuntime();
  wrongRuntime.executingScript.integrity = 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  assert.throws(
    () => app.validateRuntimeAuthorization(wrongRuntime.authorization, wrongRuntime.executingScript, wrongRuntime.documentObject),
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
      manifest,
      fetchImpl: async url => String(url).includes('public-current-state') ? response('unavailable', 503) : fixtureFetch(url)
    }),
    error => error.code === 'FETCH_FAILED'
  );
  assert.match(app.failureDetail({ code: 'FETCH_FAILED' }), /unavailable|integrity/i);

  const index = read('index.html');
  assert.equal(index, read('templates/public-index.html'), 'public root must match its reviewable shell source');
  const scriptTags = [...index.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)];
  assert.equal(scriptTags.length, 1, 'initial document must have one neutral bootstrap');
  assert.equal(scriptTags[0][1], bootstrapAsset.path);
  assert(scriptTags[0][0].includes(`integrity="${bootstrapAsset.integrity}"`));
  assert(scriptTags[0][0].includes(`data-bootstrap-sha256="${bootstrapAsset.sha256}"`));
  assert(!/<script\b[^>]*\bsrc="js\/public-app\.js/i.test(index), 'initial document must not execute mutable app source');
  assert(!/<link\b[^>]*\bhref="css\/public-shell\.css/i.test(index), 'initial document must not activate mutable CSS source');
  for (const forbidden of [
    'Reviewed through 2026-08-20 15:59 ET',
    '>108</b><span>current chronology records',
    'current-update-20260824.js',
    'id="primaryNav"',
    'id="map"'
  ]) assert(!index.includes(forbidden), `initial document exposes legacy state: ${forbidden}`);
  assert(index.includes('Loading current evidence record…'));
  assert(index.includes('The Atlas will not display an older or unvalidated release as current'));
  assert(!index.includes('snapshots/'), 'current shell must not link to repository-only snapshots');
  assert(!read('js/public-bootstrap.js').includes('snapshots/'), 'current bootstrap must not link to repository-only snapshots');
  assert(!read('js/public-app.js').includes('snapshots/'), 'current application must not link to repository-only snapshots');

  const legacy = read('legacy/phase1-public-runtime-reference.html');
  assert(legacy.includes('current-update-20260824.js'), 'retired presentation reference must preserve the dated runtime for audit');
  assert(legacy.includes('>108</b><span>current chronology records'), 'retired presentation reference must preserve its obsolete baseline state');
  assert(!index.includes('legacy/phase1-public-runtime-reference.html'), 'retired presentation reference must not enter current boot');

  console.log('public boot contract: PASS - neutral bootstrap, content-addressed SRI assets, runtime authorization, 205-record model, mismatch rejection, and retired successor chain verified');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
