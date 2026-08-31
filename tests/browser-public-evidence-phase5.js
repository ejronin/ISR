'use strict';
const assert = require('node:assert/strict');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP open timeout')), 10000);
      this.ws.onopen = () => { clearTimeout(timer); resolve(); };
      this.ws.onerror = () => reject(new Error('CDP websocket error'));
    });
    this.ws.onmessage = event => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result || {});
    };
  }
  call(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
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
      const value = await cdp.eval(expression);
      if (value) return value;
    } catch (_) { /* navigation may replace the execution context */ }
    await sleep(75);
  }
  throw new Error(`timeout: ${expression}`);
}

async function setRoute(cdp, routeKey) {
  const route = ia.ROUTES.get(routeKey);
  assert(route, `unknown route ${routeKey}`);
  await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref(route.key))};true`);
  await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(route.key)}`);
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
    await cdp.call('Page.navigate', { url: `${SITE}#/start/overview` });
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready'`);

    const contract = await cdp.eval(`(() => ({
      routes: Object.keys(window.AtlasPublicBoot.ROUTE_DATA_DEPENDENCIES).length,
      nuclear: window.AtlasPublicBoot.ROUTE_DATA_DEPENDENCIES['talks.nuclear'].datasets,
      resolverSize: window.ATLAS_PUBLIC_EVIDENCE?.sourceResolver?.size || 0
    }))()`);
    assert.equal(contract.routes, 25);
    assert(contract.nuclear.includes('analysis.iran_messaging'));
    assert(contract.nuclear.includes('analysis.endgame_public_view'));
    assert(contract.resolverSize > 300, 'shared source index was not built once from the current model');

    for (const route of ia.ROUTES.values()) await setRoute(cdp, route.key);

    await setRoute(cdp, 'talks.nuclear');
    assert.equal(await cdp.eval(`window.ATLAS_PUBLIC_STATE.routeKey`), 'talks.nuclear');

    await setRoute(cdp, 'evidence.sources');
    const sourceUx = await cdp.eval(`(() => ({
      jargon: /provenance-scoped variants|provenance-scoped versions/i.test(document.querySelector('main')?.innerText || ''),
      preserved: document.querySelectorAll('[data-phase5-source-variants]').length,
      noWinner: [...document.querySelectorAll('[data-phase5-source-variants]')].every(node => /rather than silently choosing one/i.test(node.textContent || '')),
      variantLinks: [...document.querySelectorAll('[data-phase5-source-variants] a')].filter(link => /^https?:/.test(link.href)).length
    }))()`);
    assert.equal(sourceUx.jargon, false, 'ordinary source page still exposes internal provenance jargon');
    assert(sourceUx.preserved >= 1, 'conflicted sources do not expose preserved source versions');
    assert.equal(sourceUx.noWinner, true, 'source variant UI implies a global winner');
    assert(sourceUx.variantLinks >= 1, 'variant-specific source links are missing');

    await setRoute(cdp, 'timeline.chronology');
    const drawer = await cdp.eval(`(() => ({
      total: document.querySelectorAll('details.evidence-drawer').length,
      shared: document.querySelectorAll('details.evidence-drawer[data-component="SharedEvidenceDrawer"]').length,
      sourceLinks: [...document.querySelectorAll('details.evidence-drawer a')].filter(link => /^https?:/.test(link.href)).length,
      temporal: [...document.querySelectorAll('details.evidence-drawer .evidence-facts')].some(node => /Known by Atlas|Occurred/.test(node.textContent || '')),
      factsText: [...document.querySelectorAll('details.evidence-drawer .evidence-facts')].slice(0, 6).map(node => (node.textContent || '').replace(/\s+/g, ' ').trim()),
      drawerText: [...document.querySelectorAll('details.evidence-drawer')].slice(0, 3).map(node => (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1200))
    }))()`);
    assert(drawer.total > 0 && drawer.shared === drawer.total, 'evidence drawers are not using the shared Phase 5 contract');
    assert(drawer.sourceLinks > 0, 'chronology evidence drawer does not resolve source links');
    assert.equal(drawer.temporal, true, `chronology evidence detail lacks temporal evidence fields: ${JSON.stringify({ factsText: drawer.factsText, drawerText: drawer.drawerText })}`);

    await setRoute(cdp, 'military.campaigns');
    const chart = await cdp.eval(`(() => ({
      count: document.querySelectorAll('[data-phase5-chart-equivalent]').length,
      rows: document.querySelectorAll('[data-phase5-chart-equivalent] tbody tr').length,
      text: document.querySelector('[data-phase5-chart-equivalent]')?.textContent || ''
    }))()`);
    assert(chart.count >= 1 && chart.rows >= 1, 'campaign chart lacks numeric accessible equivalent');
    assert.match(chart.text, /recorded military-event \/ strike-record counts/i);
    assert.match(chart.text, /not total weapons/i);

    for (const routeKey of ['military.campaigns', 'military.facilities', 'military.imagery', 'hormuz.overview', 'hormuz.shipping']) {
      await setRoute(cdp, routeKey);
      const map = await cdp.eval(`(() => ({
        maps: document.querySelectorAll('[data-component="MapView"] svg').length,
        textEquivalents: document.querySelectorAll('[data-component="MapView"] [data-phase5-map-equivalent]').length,
        locations: document.querySelectorAll('[data-component="MapView"] [data-phase5-map-equivalent] li').length
      }))()`);
      assert(map.maps >= 1, `expected contextual map on ${routeKey}`);
      assert(map.textEquivalents >= 1 && map.locations >= 1, `map evidence is not textually available on ${routeKey}`);
    }

    await setRoute(cdp, 'evidence.method');
    const method = await cdp.eval(`document.querySelector('main')?.innerText || ''`);
    assert(!method.includes('browser receives the already assembled current state'));
    assert(!method.includes('replaying dated updates'));
    assert.match(method, /Later corrections remain temporally explicit/i);
    assert.match(method, /A launch does not prove a hit/i);
    assert.match(method, /Unknown does not mean zero/i);

    for (const width of [320, 390]) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
      await setRoute(cdp, 'timeline.chronology');
      const overflow = await cdp.eval(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
      assert(overflow <= 1, `${width}px viewport has page-level horizontal overflow: ${overflow}px`);
      const targets = await cdp.eval(`[...document.querySelectorAll('details.evidence-drawer > summary')].every(node => node.getBoundingClientRect().height >= 44)`);
      assert.equal(targets, true, `${width}px evidence disclosure target is below 44px`);
    }

    console.log('public Phase 5 browser contract: PASS - shared drawers/sources, variants, temporal evidence, chart/map equivalents, route contracts, and 320/390 accessibility verified');
  } finally {
    cdp.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
