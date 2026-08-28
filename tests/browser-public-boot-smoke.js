'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

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
    await cdp.call('Fetch.enable', { patterns: [{ urlPattern: '*data/public-current-state.json*', requestStage: 'Request' }] });
    const pausedPromise = cdp.waitEvent('Fetch.requestPaused', params => params.request.url.includes('public-current-state.json'));
    await cdp.call('Page.navigate', { url: `${SITE}?phase2=cold` });
    const paused = await pausedPromise;
    await sleep(500);
    const loading = await cdp.eval(`(() => ({
      status: document.getElementById('atlas-root')?.dataset.status,
      text: document.body.innerText,
      scripts: [...document.scripts].map(script => script.src),
      ready: Boolean(window.ATLAS_PUBLIC_STATE?.status === 'ready')
    }))()`);
    assert.equal(loading.status, 'loading', 'slow current-state response must leave the neutral loading shell active');
    assert.equal(loading.ready, false, 'current application state must not initialize before the model is ready');
    assert.deepEqual(loading.scripts.map(url => new URL(url).pathname.split('/').pop()), ['public-app.js'], 'cold shell must execute one application entry');
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
      scripts: performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /\\.js(?:[?#]|$)/.test(name)),
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
    assert.equal(ready.count, 205);
    assert.equal(ready.cutoff, '2026-08-27T08:25:00-04:00');
    assert.match(ready.release, /^public-release-v1-[a-f0-9]{16}$/);
    assert.match(ready.currentRelease, /^public-current-v1-[a-f0-9]{16}$/);
    assert(ready.performance.model_transfer_bytes > 4_000_000);
    assert(ready.performance.model_parse_milliseconds >= 0);
    assert.equal(ready.oldGlobals, false, 'dated successor-chain globals must not initialize');
    assert(!ready.scripts.some(url => /current-update|wiki-map-reconciliation|public-housekeeping|status-identity/.test(url)), 'dated or repair scripts entered current boot');

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
      archive: document.querySelector('.error-actions a')?.getAttribute('href'),
      old: Boolean(document.getElementById('primaryNav') || document.getElementById('map'))
    }))()`);
    assert.match(failure.text, /The current evidence record could not be loaded/i);
    assert.equal(failure.retry, true);
    assert.match(failure.archive || '', /snapshots\//);
    assert.equal(failure.old, false, 'failure state must not reveal the old dashboard');

    const manifestPath = path.join(__dirname, '..', 'data', 'public-release.json');
    const mismatched = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
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

    console.log(`browser public boot smoke: PASS — cold shell remained neutral for 500ms; 205 records rendered; parse ${ready.performance.model_parse_milliseconds.toFixed(1)}ms; fetch failure and controlled release mismatch stayed explicit`);
  } finally {
    cdp.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
