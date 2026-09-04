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
    if (out.exceptionDetails) throw new Error(out.exceptionDetails.exception && out.exceptionDetails.exception.description || out.exceptionDetails.text || 'Runtime exception');
    return out.result && out.result.value;
  }
  close() { if (this.ws) this.ws.close(); }
}

async function waitFor(cdp, expression, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const value = await cdp.eval(expression); if (value) return value; } catch (_) { /* route replacement may invalidate context */ }
    await sleep(75);
  }
  throw new Error(`timeout: ${expression}`);
}

async function route(cdp, routeRecord) {
  await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref(routeRecord.key))};true`);
  try {
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(routeRecord.key)}`, 5000);
  } catch (error) {
    const detail = await cdp.eval(`({hash:location.hash,state:window.ATLAS_PUBLIC_STATE,errors:window.__atlasBatch3Errors || [],text:document.body.innerText.slice(0,500)})`);
    throw new Error(`route failed for ${routeRecord.key}: ${JSON.stringify(detail)}; ${error.message}`);
  }
  await sleep(75);
}

async function routeKey(cdp, key) { return route(cdp, ia.ROUTES.get(key)); }

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
    await cdp.call('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.call('Page.navigate', { url: `${SITE}?batch3=${Date.now()}#/start/overview` });
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === 'start.overview'`);
    await cdp.eval(`window.__atlasBatch3Errors=[];window.addEventListener('error',event=>window.__atlasBatch3Errors.push(String(event.error?.stack||event.message)));window.addEventListener('unhandledrejection',event=>window.__atlasBatch3Errors.push(String(event.reason?.stack||event.reason)));true`);
    await sleep(250);
    const coverageBoot = await cdp.eval(`({
      coverage: Boolean(window.ATLAS_PUBLIC_COVERAGE?.diagnostics && window.ATLAS_PUBLIC_COVERAGE?.validate),
      validator: typeof window.AtlasPublicBoot?.validateConsumerCoverage,
      state: window.ATLAS_PUBLIC_STATE,
      script: [...document.scripts].map(node => node.src).find(src => /public-app/.test(src))
    })`);
    assert.equal(coverageBoot.coverage, true, `consumer coverage runtime was not exposed: ${JSON.stringify(coverageBoot)}`);

    const expectedRoutes = [...ia.ROUTES.values()];
    assert.equal(expectedRoutes.length, 25);
    for (const routeRecord of expectedRoutes) {
      await route(cdp, routeRecord);
      const owner = await cdp.eval(`document.querySelector('[data-page-owner]')?.dataset.pageOwner`);
      const headings = await cdp.eval(`[...document.querySelectorAll('main h1')].map(node => node.textContent.trim())`);
      const publicText = await cdp.eval(`document.querySelector('main')?.innerText || ''`);
      assert.equal(owner, routeRecord.owner, `wrong page owner for ${routeRecord.key}`);
      assert.deepEqual(headings, [routeRecord.title], `route heading parity failed for ${routeRecord.key}`);
      assert(!/founding signator/i.test(publicText), `retired founding-signatory wording surfaced on ${routeRecord.key}`);
    }

    const diagnostics = await cdp.eval(`window.ATLAS_PUBLIC_COVERAGE.diagnostics()`);
    let coverage;
    try {
      coverage = await cdp.eval(`window.ATLAS_PUBLIC_COVERAGE.validate()`);
    } catch (error) {
      console.error('Consumer coverage diagnostics:', JSON.stringify(diagnostics, null, 2));
      throw error;
    }
    assert.equal(coverage.routeCount, 25);
    assert.equal(coverage.coveredDatasetCount, 76);
    assert.equal(coverage.datasetWaiverCount, 40);
    assert.equal(coverage.routeWaiverCount, 0);
    assert.equal(Object.keys(diagnostics.routeAccesses).length, 25);
    assert.deepEqual(diagnostics.sharedAccesses, ['current.actors', 'current.locations', 'current.sources']);

    await routeKey(cdp, 'start.overview');
    const overview = await cdp.eval(`(() => {
      const map = document.querySelector('[data-component="MapView"]');
      const bounds = JSON.parse(map.dataset.mapBounds);
      const leaflet = map._atlasMap;
      const fitted = leaflet.getBounds();
      return {
        extent: map.dataset.mapExtentSource,
        rule: map.dataset.selectionRule,
        bounds,
        fitted: [[fitted.getSouth(), fitted.getWest()], [fitted.getNorth(), fitted.getEast()]],
        inside: fitted.contains(bounds[0]) && fitted.contains(bounds[1]),
        text: map.innerText
      };
    })()`);
    assert.equal(overview.extent, 'visible-records');
    assert.equal(overview.rule, 'accepted-chronology-with-supported-coordinate-in-broad-theater');
    assert(overview.bounds[0][1] < 50 && overview.bounds[1][1] > 60, 'overview remained trapped in a Hormuz frame');
    assert.equal(overview.inside, true, `record-derived overview bounds do not fit the map: ${JSON.stringify(overview)}`);
    assert.match(overview.text, /broad .* theater/i);

    const routeIds = ['REDSEA-SUEZ-MARITIME', 'REDSEA-SAUDI-EAST-WEST', 'RAIL-CN-IR-APRIN', 'RAIL-RU-IR-APRIN'];
    await routeKey(cdp, 'hormuz.shipping');
    const shipping = await cdp.eval(`(() => {
      const map = document.querySelector('[data-component="MapView"]');
      const controls = [...map.querySelectorAll('button[data-route-id]')];
      const bounds = JSON.parse(map.dataset.mapBounds);
      const fitted = map._atlasMap.getBounds();
      return {
        routeIds: controls.map(node => node.dataset.routeId),
        modes: [...new Set(controls.map(node => node.dataset.routeMode))].sort(),
        mapModes: map.dataset.mapRouteModes,
        bounds,
        fitted: [[fitted.getSouth(), fitted.getWest()], [fitted.getNorth(), fitted.getEast()]],
        inside: fitted.contains(bounds[0]) && fitted.contains(bounds[1]),
        legend: map.querySelector('.map-legend')?.innerText || '',
        mapText: map.innerText,
        merchant: document.querySelectorAll('.merchant-loss-details [data-loss-id]').length,
        merchantLinks: [...document.querySelectorAll('.merchant-loss-details [data-loss-id] a.inline-route-link')].map(node => node.getAttribute('href')),
        text: document.querySelector('main')?.innerText || ''
      };
    })()`);
    assert.deepEqual(shipping.routeIds.sort(), routeIds.slice().sort());
    assert.deepEqual(shipping.modes, ['maritime', 'pipeline', 'rail']);
    assert.equal(shipping.mapModes, 'maritime,pipeline,rail');
    assert(shipping.bounds[0][1] <= 32.6, 'Red Sea/Suez was clipped from the derived route bounds');
    assert.equal(shipping.inside, true, `long-distance shipping routes do not fit the map: ${JSON.stringify({bounds: shipping.bounds, fitted: shipping.fitted})}`);
    assert.match(shipping.legend, /Maritime · schematic/);
    assert.match(shipping.legend, /Pipeline · schematic/);
    assert.match(shipping.legend, /Rail · schematic/);
    assert.match(shipping.mapText, /not live vessel tracking/i);
    assert.match(shipping.mapText, /pipeline lines are not surveyed alignments/i);
    assert.match(shipping.mapText, /rail lines are not exact track alignments/i);
    assert(shipping.merchant > 0);
    assert.equal(shipping.merchantLinks.length, shipping.merchant);
    assert(shipping.merchantLinks.every(link => link.startsWith('#/military/losses?loss=')));
    assert.match(shipping.text, /excluded from military equipment totals/i);

    await routeKey(cdp, 'hormuz.economy');
    const economy = await cdp.eval(`(() => {
      const map = document.querySelector('[data-component="MapView"]');
      const bounds = JSON.parse(map.dataset.mapBounds);
      return {
        mapRouteIds: [...map.querySelectorAll('button[data-route-id]')].map(node => node.dataset.routeId),
        directoryRouteIds: [...document.querySelectorAll('[data-economy-route-id]')].map(node => node.dataset.economyRouteId),
        countries: [...document.querySelectorAll('[data-economic-comparison-country]')].map(node => node.dataset.economicComparisonCountry),
        arctic: [...document.querySelectorAll('[data-arctic-route-id]')].map(node => node.dataset.arcticRouteId),
        arcticText: document.querySelector('.arctic-context')?.textContent || '',
        inside: map._atlasMap.getBounds().contains(bounds[0]) && map._atlasMap.getBounds().contains(bounds[1]),
        text: document.querySelector('main')?.innerText || ''
      };
    })()`);
    assert.deepEqual(economy.mapRouteIds.sort(), routeIds.slice().sort());
    assert.deepEqual(economy.directoryRouteIds.sort(), routeIds.slice().sort());
    assert.deepEqual(economy.countries.sort(), ['Bahrain', 'Iran', 'Kuwait', 'Oman', 'Qatar', 'Saudi Arabia', 'United Arab Emirates'].sort());
    assert.deepEqual(economy.arctic, ['ARCTIC-RU-CN-OIL']);
    assert.equal(economy.inside, true);
    assert.match(economy.text, /FORECAST \/ MODELED OUTLOOK, not realized GDP and not a military score/i);
    assert.match(economy.arcticText, /not an Iranian supply route/i);
    assert.match(economy.arcticText, /not .*observed current war movement/i);

    await routeKey(cdp, 'talks.regional');
    const alignment = await cdp.eval(`(() => {
      const map = document.querySelector('[data-component="MapView"]');
      const bounds = JSON.parse(map.dataset.mapBounds);
      return {
        actors: [...document.querySelectorAll('[data-alignment-actor-id]')].map(node => node.dataset.alignmentActorId),
        countries: map.dataset.mapCountries.split(','),
        bounds,
        fitted: [[map._atlasMap.getBounds().getSouth(), map._atlasMap.getBounds().getWest()], [map._atlasMap.getBounds().getNorth(), map._atlasMap.getBounds().getEast()]],
        equivalentStates: map.querySelectorAll('[data-phase5-map-equivalent] li').length,
        inside: map._atlasMap.getBounds().contains(bounds[0]) && map._atlasMap.getBounds().contains(bounds[1]),
        unsignedFlags: [...document.querySelectorAll('.alignment-participant img.actor-flag')].filter(node => !/state-flag-[a-z]{2}\.[a-f0-9]{64}\.svg$/.test(new URL(node.src).pathname)).length,
        text: document.querySelector('main')?.innerText || ''
      };
    })()`);
    const alignmentIds = ['ACT-SAUDI-ARABIA','ACT-BAHRAIN','ACT-KUWAIT','ACT-QATAR','ACT-JORDAN','ACT-YEMEN-PLC','ACT-EGYPT','ACT-SUDAN','ACT-DJIBOUTI','ACT-SOMALIA','ACT-NIGERIA','ACT-TURKIYE','ACT-PAKISTAN','ACT-BANGLADESH'];
    assert.deepEqual(alignment.actors.sort(), alignmentIds.slice().sort());
    assert.equal(alignment.countries.length, 14);
    assert(alignment.equivalentStates >= 14);
    assert.equal(alignment.inside, true, `participant-state geography does not fit its map: ${JSON.stringify(alignment)}`);
    assert.equal(alignment.unsignedFlags, 0);
    assert.match(alignment.text, /does not identify capitals, headquarters, command nodes, deployments, or operating areas/i);
    assert(!/founding signator/i.test(alignment.text));

    await routeKey(cdp, 'military.campaigns');
    const campaigns = await cdp.eval(`(() => ({
      strikes: document.querySelectorAll('[data-strike-effect-id]').length,
      strikeIds: [...document.querySelectorAll('[data-strike-effect-id]')].map(node => node.dataset.strikeEffectId),
      damage: document.querySelectorAll('[data-damage-observation-id]').length,
      audits: document.querySelectorAll('.effect-proposition-group[data-facility-audit-id]').length,
      propositions: document.querySelectorAll('.effect-proposition-group .record-card').length,
      facilityLinks: document.querySelectorAll('.effect-proposition-group a[href^="#/military/facilities"]').length,
      text: document.querySelector('main')?.innerText || ''
    }))()`);
    assert(campaigns.strikes > 0);
    assert(!campaigns.strikeIds.includes('MAP-WIKI-20260602-LEXIE'), 'maritime blockade strike was presented as an attack inside Iran');
    assert.equal(campaigns.damage, 9);
    assert.equal(campaigns.audits, 4);
    assert(campaigns.propositions > campaigns.audits);
    assert.equal(campaigns.facilityLinks, 4);
    assert.match(campaigns.text, /Attack occurrence/);
    assert.match(campaigns.text, /Physical effect/);
    assert.match(campaigns.text, /Operational effect/);
    assert.match(campaigns.text, /Unresolved unless separately established/);

    await routeKey(cdp, 'talks.overview');
    const agreements = await cdp.eval(`(() => ({
      ids: [...document.querySelectorAll('[data-agreement-id]')].map(node => node.dataset.agreementId),
      formalized: [...document.querySelectorAll('[data-agreement-id]')].filter(node => node.dataset.agreementFormalized === 'true').length,
      evidence: document.querySelectorAll('[data-agreement-id] details.evidence-drawer').length,
      mou: Boolean(document.querySelector('[data-agreement-id="AGR-US-IRN-14POINT-MOU-2026"] a[href^="#/talks/june-mou"]')),
      nuclear: Boolean(document.querySelector('[data-agreement-id="AGR-US-IRN-14POINT-MOU-2026"] a[href^="#/talks/nuclear"]')),
      text: document.querySelector('main')?.innerText || ''
    }))()`);
    assert.equal(agreements.ids.length, 8);
    assert.equal(new Set(agreements.ids).size, 8);
    assert(agreements.formalized > 0 && agreements.formalized < 8);
    assert(agreements.evidence > 0);
    assert.equal(agreements.mou, true);
    assert.equal(agreements.nuclear, true);
    assert.match(agreements.text, /proposal or negotiating mechanism is not relabeled as a signed agreement/i);

    for (const width of [320, 390]) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
      for (const key of ['start.overview', 'hormuz.shipping', 'hormuz.economy', 'talks.regional', 'military.campaigns', 'talks.overview']) {
        await routeKey(cdp, key);
        const mobile = await cdp.eval(`({clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,targets:[...document.querySelectorAll('.map-route-button,.map-imagery-button,.map-record-button,.map-card-close,.mobile-navigation summary,.mobile-navigation a')].filter(node => node.offsetParent !== null).map(node => node.getBoundingClientRect().height)})`);
        assert(mobile.scrollWidth <= mobile.clientWidth, `${key} overflows at ${width}px`);
        assert(mobile.targets.every(height => height >= 44), `${key} exposes a touch target below 44px at ${width}px`);
      }
    }
    await cdp.call('Emulation.clearDeviceMetricsOverride');

    const externalResources = await cdp.eval(`performance.getEntriesByType('resource').map(entry => entry.name).filter(url => { try { return new URL(url).origin !== location.origin; } catch (_) { return true; } })`);
    assert.deepEqual(externalResources, [], `runtime made external requests: ${externalResources.join(', ')}`);

    console.log('browser public parity Batch 3: PASS - 25 owners, enforceable consumer coverage, broad/record-driven geography, three corridor modes, GCC/Iran forecast context, Arctic boundary, 14-state alignment, strike effects, eight agreements, merchant cross-links, accessibility, and responsive behavior verified');
  } finally {
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
