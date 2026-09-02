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
      resolverSize: window.ATLAS_PUBLIC_EVIDENCE?.sourceResolver?.size || 0,
      sourceIndexBuilds: window.ATLAS_PUBLIC_EVIDENCE?.sourceIndexBuilds,
      rawModelExposed: Object.prototype.hasOwnProperty.call(window, 'ATLAS_PUBLIC_MODEL')
    }))()`);
    assert.equal(contract.routes, 25);
    assert(contract.nuclear.includes('analysis.iran_messaging'));
    assert(contract.nuclear.includes('analysis.endgame_public_view'));
    assert(contract.resolverSize > 300, 'shared source index was not built once from the current model');
    assert.equal(contract.sourceIndexBuilds, 1, 'source index was rebuilt during first render');
    assert.equal(contract.rawModelExposed, false, 'raw public model remains exposed as a guard bypass');

    const guardTests = await cdp.eval(`(async () => {
      const model = await fetch('./data/public-current-state.json', { cache: 'no-store' }).then(response => response.json());
      const base = window.AtlasPublicBoot.ROUTE_DATA_DEPENDENCIES;
      const contracts = Object.fromEntries(Object.entries(base).map(([key, value]) => [key, { modelPage: value.modelPage, datasets: [...value.datasets] }]));
      contracts['start.overview'].datasets = contracts['start.overview'].datasets.filter(key => key !== 'ledger.domain_assessments');
      const firstHost = document.createElement('div');
      const fakeWindow = hash => ({
        location: { hash }, history: { replaceState() {} },
        addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, CustomEvent: window.CustomEvent
      });
      let firstCode = null;
      try {
        const runtime = window.AtlasPublicBoot.createRouteRuntime(model, { ia: window.AtlasPublicIA, contracts });
        window.AtlasPublicIA.mount({ rootElement: firstHost, routeRuntime: runtime, state: {}, documentObject: document, windowObject: fakeWindow('#/start/overview') });
      } catch (error) { firstCode = error.code; }

      const transitionContracts = Object.fromEntries(Object.entries(base).map(([key, value]) => [key, { modelPage: value.modelPage, datasets: [...value.datasets] }]));
      transitionContracts['talks.nuclear'].datasets = transitionContracts['talks.nuclear'].datasets.filter(key => key !== 'analysis.iran_messaging');
      const transitionHost = document.createElement('div');
      const transitionWindow = fakeWindow('#/start/overview');
      const transitionRuntime = window.AtlasPublicBoot.createRouteRuntime(model, { ia: window.AtlasPublicIA, contracts: transitionContracts });
      const controller = window.AtlasPublicIA.mount({ rootElement: transitionHost, routeRuntime: transitionRuntime, state: {}, documentObject: document, windowObject: transitionWindow });
      transitionWindow.location.hash = '#/talks/nuclear';
      let transitionCode = null;
      try { controller.render(); } catch (error) { transitionCode = error.code; }
      const retainedOwner = transitionHost.querySelector('[data-page-owner]')?.dataset.pageOwner || null;
      controller.destroy();
      return { firstCode, firstH1: firstHost.querySelectorAll('h1').length, transitionCode, retainedOwner };
    })()`);
    assert.equal(guardTests.firstCode, 'UNDECLARED_DATA_DEPENDENCY', 'direct initial route did not fail through the real guard');
    assert.equal(guardTests.firstH1, 0, 'a page was committed before initial dependency authorization failed');
    assert.equal(guardTests.transitionCode, 'UNDECLARED_DATA_DEPENDENCY', 'route transition did not fail through the real guard');
    assert.equal(guardTests.retainedOwner, 'OverviewPage', 'failed transition replaced the previously authorized page');

    const futureEvidence = await cdp.eval(`(async () => {
      const model = await fetch('./data/public-current-state.json', { cache: 'no-store' }).then(response => response.json());
      const locationId = model.entities.locations[0].record.location_id;
      const sourceReference = model.chronology.find(item => item.source_references?.length).source_references[0];
      model.counts.chronology_records += 1;
      model.chronology.push({
        event_id: 'EV-FUTURE-PHASE5',
        actor_ids: ['ACT-PER-MOHAMMAD-BAQER-QALIBAF'],
        location_ids: [locationId],
        provenance: [{ package_key: 'future-test' }],
        source_ids: [sourceReference.source_id],
        source_references: [sourceReference],
        timeline: { date: '2099-01-02', first_reported: '2099-01-03' },
        event: {
          summary: 'Future accepted evidence fixture',
          event_date: '2099-01-02',
          event_time: '04:05',
          first_reported: '2099-01-03',
          evidence_status: 'SUPPORTED_WITH_LIMITATIONS',
          dispute_posture: 'DISPUTED',
          actor_ids: ['ACT-PER-MOHAMMAD-BAQER-QALIBAF'],
          location_ids: [locationId]
        }
      });
      const host = document.createElement('div');
      const testWindow = {
        location: { hash: '#/timeline/chronology' }, history: { replaceState() {} },
        addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, CustomEvent: window.CustomEvent
      };
      const runtime = window.AtlasPublicBoot.createRouteRuntime(model, { ia: window.AtlasPublicIA });
      const controller = window.AtlasPublicIA.mount({ rootElement: host, routeRuntime: runtime, state: {}, documentObject: document, windowObject: testWindow });
      const drawer = host.querySelector('[data-event-id="EV-FUTURE-PHASE5"] details.evidence-drawer');
      const text = drawer?.textContent || '';
      controller.destroy();
      return { text, locationLabel: model.entities.locations[0].record.canonical_name, sourceIndexes: runtime.diagnostics().sourceIndexBuilds };
    })()`);
    assert.match(futureEvidence.text, /Occurred2099-01-02 04:05/);
    assert.match(futureEvidence.text, /First reported \/ known2099-01-03/);
    assert.match(futureEvidence.text, /Mohammad Baqer Qalibaf/);
    assert(futureEvidence.text.includes(futureEvidence.locationLabel), 'canonical location_id did not resolve in the shared drawer');
    assert.match(futureEvidence.text, /Evidence statusSupported With Limitations/);
    assert.match(futureEvidence.text, /Dispute statusDisputed/);
    assert.equal(futureEvidence.sourceIndexes, 1, 'future model instance did not build exactly one fresh source index');

    for (const route of ia.ROUTES.values()) await setRoute(cdp, route.key);

    await setRoute(cdp, 'talks.nuclear');
    assert.equal(await cdp.eval(`window.ATLAS_PUBLIC_STATE.routeKey`), 'talks.nuclear');

    await setRoute(cdp, 'evidence.sources');
    const sourceUx = await cdp.eval(`(() => ({
      jargon: /provenance-scoped variants|provenance-scoped versions/i.test(document.querySelector('main')?.innerText || ''),
      preserved: document.querySelectorAll('[data-phase5-source-variants]').length,
      noWinner: [...document.querySelectorAll('[data-phase5-source-variants]')].every(node => /rather than silently choosing one/i.test(node.textContent || '')),
      variantLinks: [...document.querySelectorAll('[data-phase5-source-variants] a')].filter(link => /^https?:/.test(link.href)).length
      ,conflictHasTopLevelResolvedList: [...document.querySelectorAll('.source-card:has([data-phase5-source-variants])')].some(card => Boolean(card.querySelector(':scope > .source-link-list')))
    }))()`);
    assert.equal(sourceUx.jargon, false, 'ordinary source page still exposes internal provenance jargon');
    assert(sourceUx.preserved >= 1, 'conflicted sources do not expose preserved source versions');
    assert.equal(sourceUx.noWinner, true, 'source variant UI implies a global winner');
    assert(sourceUx.variantLinks >= 1, 'variant-specific source links are missing');
    assert.equal(sourceUx.conflictHasTopLevelResolvedList, false, 'conflicted source card selected a top-level winning record');

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
