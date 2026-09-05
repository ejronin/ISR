'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'public-release.json'), 'utf8'));
const model = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'public-current-state.json'), 'utf8'));
const entrypoint = manifest.application.assets.find(asset => asset.role === 'entrypoint');
const stylesheet = manifest.application.assets.find(asset => asset.role === 'stylesheet');
const pageRegistry = manifest.application.assets.find(asset => asset.role === 'page_registry');
const mapRuntime = manifest.application.assets.find(asset => asset.role === 'map_runtime');
const mapStylesheet = manifest.application.assets.find(asset => asset.role === 'map_stylesheet');
const referenceGeography = manifest.application.assets.find(asset => asset.role === 'reference_geography');
const bootstrap = manifest.neutral_bootstrap.asset;
const oldValidApplication = fs.readFileSync(path.join(__dirname, 'fixtures', 'public-app-old-valid.js'), 'utf8');

assert(entrypoint && stylesheet && pageRegistry && mapRuntime && mapStylesheet && referenceGeography && bootstrap, 'content-addressed release assets are missing');
assert(oldValidApplication.includes("const APPLICATION_VERSION = 'atlas-public-shell-v1'"), 'split-release fixture must keep the current logical application version');
assert.equal(model.release.release_identity, manifest.current_state.release_identity, 'split-release test requires a valid new manifest/model pair');

class CDP {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP open timeout')), 10000);
      this.ws.onopen = () => { clearTimeout(timer); resolve(); };
      this.ws.onerror = () => reject(new Error('CDP websocket error'));
    });
    this.ws.onmessage = event => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result || {});
        return;
      }
      if (message.method) {
        for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
      }
    };
  }
  call(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(listener);
    return () => this.listeners.get(method).delete(listener);
  }
  waitEvent(method, predicate = () => true, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { off(); reject(new Error(`timeout waiting for ${method}`)); }, timeout);
      const off = this.on(method, params => {
        if (!predicate(params)) return;
        clearTimeout(timer);
        off();
        resolve(params);
      });
    });
  }
  async eval(expression) {
    const out = await this.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (out.result && out.result.subtype === 'error') throw new Error(out.result.description || 'Runtime error');
    return out.result && out.result.value;
  }
  close() { if (this.ws) this.ws.close(); }
}

async function waitFor(cdp, expression, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const result = await cdp.eval(expression);
      if (result) return result;
    } catch (_) { /* navigation may temporarily replace the execution context */ }
    await sleep(100);
  }
  throw new Error(`timeout: ${expression}`);
}

function base64(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

(async () => {
  const targets = await (await fetch(`${DEBUG}/json`)).json();
  const target = targets.find(item => item.type === 'page');
  assert(target && target.webSocketDebuggerUrl, 'Atlas browser target missing');
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();
  try {
    await cdp.call('Runtime.enable');
    await cdp.call('Page.enable');
    await cdp.call('Network.enable');
    const observedRequests = [];
    cdp.on('Network.requestWillBeSent', params => observedRequests.push(params.request.url));
    await cdp.call('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.call('Fetch.disable');
    await cdp.call('Fetch.enable', { patterns: [{ urlPattern: '*data/public-current-state.json*', requestStage: 'Request' }] });
    const pausedPromise = cdp.waitEvent('Fetch.requestPaused', params => params.request.url.includes('public-current-state.json'));
    await cdp.call('Page.navigate', { url: `${SITE}?phase2=cold` });
    const paused = await pausedPromise;
    await sleep(500);
    const loading = await cdp.eval(`(() => ({
      status: document.getElementById('atlas-root')?.dataset.status,
      text: document.body.innerText,
      scripts: [...document.scripts].map(script => ({ src: script.src, integrity: script.integrity })),
      styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => ({ href: link.href, integrity: link.integrity })),
      ready: Boolean(window.ATLAS_PUBLIC_STATE?.status === 'ready')
    }))()`);
    assert.equal(loading.status, 'loading', 'slow current-state response must leave the neutral loading shell active');
    assert.equal(loading.ready, false, 'current application state must not initialize before the model is ready');
    const loadedScripts = new Map(loading.scripts.map(item => [new URL(item.src).pathname, item.integrity]));
    assert.deepEqual(new Set(loadedScripts.keys()), new Set([`/${bootstrap.path}`, `/${mapRuntime.path}`, `/${pageRegistry.path}`, `/${entrypoint.path}`]), 'cold shell must execute only the bound bootstrap and authorized runtimes/entrypoint');
    assert.equal(loadedScripts.get(`/${bootstrap.path}`), bootstrap.integrity, 'bootstrap must carry the manifest-authorized SRI value');
    assert.equal(loadedScripts.get(`/${pageRegistry.path}`), pageRegistry.integrity, 'page registry must carry the manifest-authorized SRI value');
    assert.equal(loadedScripts.get(`/${mapRuntime.path}`), mapRuntime.integrity, 'map runtime must carry the manifest-authorized SRI value');
    assert.equal(loadedScripts.get(`/${entrypoint.path}`), entrypoint.integrity, 'entrypoint must carry the manifest-authorized SRI value');
    assert.deepEqual(loading.styles.map(item => new URL(item.href).pathname), [`/${mapStylesheet.path}`, `/${stylesheet.path}`], 'cold shell must activate only the authorized stylesheets');
    assert.deepEqual(loading.styles.map(item => item.integrity), [mapStylesheet.integrity, stylesheet.integrity], 'active stylesheets must carry manifest-authorized SRI values');
    for (const forbidden of [
      'REVIEWED THROUGH 2026-08-20 15:59 ET',
      '108 CURRENT CHRONOLOGY',
      'CURRENT OSINT CUTOFF — AUG. 26',
      'OVERVIEW OPERATIONS EFFECTS INFORMATION EVIDENCE',
      'ATLAS TIMELINE ANALYSIS MOU SOURCES'
    ]) assert(!loading.text.toUpperCase().includes(forbidden), `cold shell revealed stale content: ${forbidden}`);
    assert.match(loading.text, /Loading current evidence record/i);
    await cdp.call('Fetch.continueRequest', { requestId: paused.requestId });
    await cdp.call('Fetch.disable');
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready'`);
    const ready = await cdp.eval(`(() => ({
      status: document.getElementById('atlas-root')?.dataset.status,
      count: window.ATLAS_PUBLIC_STATE.chronologyCount,
      cutoff: window.ATLAS_PUBLIC_STATE.currentOsintCutoff,
      release: window.ATLAS_PUBLIC_STATE.releaseIdentity,
      currentRelease: window.ATLAS_PUBLIC_STATE.currentStateReleaseIdentity,
      performance: window.ATLAS_PUBLIC_STATE.performance,
      authorization: {
        release: window.ATLAS_RELEASE_AUTHORIZATION?.releaseIdentity,
        entrypoint: window.ATLAS_RELEASE_AUTHORIZATION?.entrypointPath,
        runtimes: window.ATLAS_RELEASE_AUTHORIZATION?.runtimeAssets?.map(item => item.path),
        stylesheets: window.ATLAS_RELEASE_AUTHORIZATION?.stylesheetAssets?.map(item => item.path),
        stylesheet: window.ATLAS_RELEASE_AUTHORIZATION?.stylesheetPath,
        geography: window.ATLAS_RELEASE_AUTHORIZATION?.referenceGeography?.path
      },
      scripts: performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /\\.js(?:[?#]|$)/.test(name)),
      resources: performance.getEntriesByType('resource').map(entry => new URL(entry.name).pathname),
      oldGlobals: [
        window.ATLAS_CURRENT_UPDATE,
        window.ATLAS_CURRENT_UPDATE_20260825,
        window.ATLAS_CURRENT_UPDATE_20260825_LATE,
        window.ATLAS_CURRENT_UPDATE_20260826,
        window.ATLAS_WIKI_RECON_20260826,
        window.ATLAS_CURRENT_UPDATE_20260827
      ].some(Boolean)
    }))()`);
    assert.equal(ready.status, 'ready');
    assert.equal(ready.count, model.counts.chronology_records);
    assert.equal(ready.cutoff, model.release.current_osint_cutoff);
    assert.match(ready.release, /^public-release-v1-[a-f0-9]{16}$/);
    assert.equal(ready.currentRelease, manifest.current_state.release_identity);
    assert.match(ready.currentRelease, /^public-current-v2-[a-f0-9]{16}$/);
    assert.equal(ready.authorization.release, ready.release);
    assert.equal(ready.authorization.entrypoint, entrypoint.path);
    assert.deepEqual(ready.authorization.runtimes, [mapRuntime.path, pageRegistry.path]);
    assert.deepEqual(ready.authorization.stylesheets, [mapStylesheet.path, stylesheet.path]);
    assert.equal(ready.authorization.stylesheet, stylesheet.path);
    assert.equal(ready.authorization.geography, referenceGeography.path);
    assert(ready.performance.model_transfer_bytes > 4_000_000);
    assert(ready.performance.model_parse_milliseconds >= 0);
    assert.equal(ready.oldGlobals, false, 'dated successor-chain globals must not initialize');
    assert(!ready.scripts.some(url => /current-update|wiki-map-reconciliation|public-housekeeping|status-identity/.test(url)), 'dated or repair scripts entered current boot');
    assert(!ready.resources.some(url => /\/(?:js|css|vendor|schemas|legacy|snapshots)\//.test(url) || /\/data\/(?!public-(?:release|current-state)\.json$)/.test(url)), 'mutable, retired, archived, or raw evidence paths entered the current network graph');

    await cdp.call('Fetch.enable', { patterns: [{ urlPattern: '*data/public-current-state.json*', requestStage: 'Request' }] });
    const failedPromise = cdp.waitEvent('Fetch.requestPaused', params => params.request.url.includes('public-current-state.json'));
    await cdp.call('Page.navigate', { url: `${SITE}?phase2=failure` });
    const failedRequest = await failedPromise;
    await cdp.call('Fetch.fulfillRequest', {
      requestId: failedRequest.requestId,
      responseCode: 503,
      responseHeaders: [{ name: 'Content-Type', value: 'text/plain; charset=utf-8' }],
      body: base64('current record unavailable')
    });
    await cdp.call('Fetch.disable');
    await waitFor(cdp, `document.getElementById('atlas-root')?.dataset.status === 'error'`);
    const failure = await cdp.eval(`(() => ({
      text: document.body.innerText,
      retry: Boolean(document.querySelector('.error-actions button')),
      archive: Boolean(document.querySelector('.error-actions a')),
      old: Boolean(document.getElementById('primaryNav') || document.getElementById('map'))
    }))()`);
    assert.match(failure.text, /The current evidence record could not be loaded/i);
    assert.equal(failure.retry, true);
    assert.equal(failure.archive, false, 'failure state must not link to a repository-only snapshot');
    assert.equal(failure.old, false, 'failure state must not reveal the old dashboard');

    await cdp.eval(`sessionStorage.removeItem('atlas-public-release-reload-attempted-v1');true`);
    await cdp.call('Fetch.enable', { patterns: [{ urlPattern: `*${entrypoint.path}`, requestStage: 'Request' }] });
    const splitPromise = cdp.waitEvent('Fetch.requestPaused', params => params.request.url.includes(entrypoint.path));
    await cdp.call('Page.navigate', { url: `${SITE}?phase2=split-release` });
    const splitRequest = await splitPromise;
    await cdp.call('Fetch.fulfillRequest', {
      requestId: splitRequest.requestId,
      responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'application/javascript; charset=utf-8' }],
      body: base64(oldValidApplication)
    });
    await cdp.call('Fetch.disable');
    await waitFor(cdp, `document.getElementById('atlas-root')?.dataset.status === 'error' && window.ATLAS_PUBLIC_STATE?.code === 'ASSET_INTEGRITY_FAILED'`, 30000);
    const split = await cdp.eval(`({
      status: window.ATLAS_PUBLIC_STATE?.status,
      code: window.ATLAS_PUBLIC_STATE?.code,
      oldExecuted: Boolean(window.ATLAS_SPLIT_RELEASE_OLD_EXECUTED),
      hybrid: Boolean(window.ATLAS_PUBLIC_STATE?.hybrid),
      text: document.body.innerText
    })`);
    assert.equal(split.status, 'error');
    assert.equal(split.code, 'ASSET_INTEGRITY_FAILED');
    assert.equal(split.oldExecuted, false, 'old valid application bytes must fail SRI before execution');
    assert.equal(split.hybrid, false, 'old application bytes must not render against the new model');
    assert.match(split.text, /could not be loaded|integrity validation/i);

    const mismatched = JSON.parse(JSON.stringify(manifest));
    mismatched.application.version = 'stale-public-shell';
    await cdp.eval(`sessionStorage.removeItem('atlas-public-release-reload-attempted-v1');true`);
    let mismatchRequests = 0;
    await cdp.call('Fetch.enable', { patterns: [{ urlPattern: '*data/public-release.json*', requestStage: 'Request' }] });
    const offMismatch = cdp.on('Fetch.requestPaused', async params => {
      if (!params.request.url.includes('public-release.json')) {
        await cdp.call('Fetch.continueRequest', { requestId: params.requestId });
        return;
      }
      mismatchRequests += 1;
      await cdp.call('Fetch.fulfillRequest', {
        requestId: params.requestId,
        responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
        body: base64(JSON.stringify(mismatched))
      });
    });
    await cdp.call('Page.navigate', { url: `${SITE}?phase2=mismatch` });
    await waitFor(cdp, `document.getElementById('atlas-root')?.dataset.status === 'error' && window.ATLAS_PUBLIC_STATE?.code === 'RELEASE_MISMATCH'`, 30000);
    offMismatch();
    await cdp.call('Fetch.disable');
    const mismatch = await cdp.eval(`({
      text: document.body.innerText,
      status: window.ATLAS_PUBLIC_STATE?.status,
      code: window.ATLAS_PUBLIC_STATE?.code,
      old: Boolean(document.getElementById('primaryNav') || document.getElementById('map'))
    })`);
    assert(mismatchRequests >= 2, 'release mismatch must perform one controlled reload before the explicit error state');
    assert.equal(mismatch.status, 'error');
    assert.equal(mismatch.code, 'RELEASE_MISMATCH');
    assert.match(mismatch.text, /did not resolve to one release/i);
    assert.equal(mismatch.old, false, 'release mismatch must not produce a hybrid legacy UI');

    const allowedPaths = new Set([
      '/',
      '/data/public-release.json',
      `/${manifest.current_state.path}`,
      `/${bootstrap.path}`,
      ...manifest.application.assets.map(asset => `/${asset.path}`)
    ]);
    const siteOrigin = new URL(SITE).origin;
    const networkRequests = [...new Set(observedRequests)]
      .filter(value => !value.startsWith('data:'))
      .map(value => new URL(value));
    assert(networkRequests.length > 0, 'browser network allowlist did not observe any requests');
    for (const request of networkRequests) {
      assert.equal(request.origin, siteOrigin, `current production requested a non-site origin: ${request.href}`);
      assert(allowedPaths.has(request.pathname), `current production requested an unauthorized path: ${request.pathname}`);
    }
    const observedPaths = [...new Set(networkRequests.map(request => request.pathname))].sort();

    console.log(`browser public boot smoke: PASS — neutral cold shell; ${ready.count} records rendered; parse ${ready.performance.model_parse_milliseconds.toFixed(1)}ms; fetch failure, exact split-release SRI rejection, controlled manifest mismatch, and closed request allowlist (${observedPaths.join(', ')}) verified`);
  } finally {
    cdp.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
