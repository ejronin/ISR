'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const OUTPUT = process.env.ATLAS_SCREENSHOT_DIR || path.join(__dirname, '..', 'audit-screens');
const WIDTHS = [1920, 1440, 1024, 768, 390, 320];
const ROUTES = [
  'start.overview',
  'timeline.war',
  'evidence.sources',
  'evidence.method',
  'evidence.information',
  'evidence.web_of_lies',
  'military.campaigns',
  'military.losses',
  'hormuz.overview',
  'hormuz.shipping',
  'hormuz.economy',
  'hormuz.sanctions',
  'talks.overview',
  'talks.mou',
  'evidence.archive',
  'military.imagery'
];
const POLISH_FOCUS = [
  { routeKey: 'start.overview', label: 'start-current-state', selector: '[data-current-state-summary]' },
  { routeKey: 'start.overview', label: 'start-opening-context', selector: '.historical-orientation' },
  { routeKey: 'start.overview', label: 'start-theater-map', selector: '.overview-theater-map' },
  { routeKey: 'evidence.information', label: 'claims-reader', selector: '[data-reader-lie-ledger]' },
  { routeKey: 'evidence.web_of_lies', label: 'web-of-lies-network', selector: '.wol-network' },
  { routeKey: 'evidence.web_of_lies', label: 'web-of-lies-hall', selector: '.wol-hall-of-shame' },
  { routeKey: 'military.facilities', label: 'facility-status-dashboard', selector: '[data-reader-facility-dashboard]' },
  { routeKey: 'military.campaigns', label: 'campaign-constituents', selector: '[data-reader-drilldown="event-constituents"]' },
  { routeKey: 'hormuz.overview', label: 'hormuz-pressure-pair', selector: '.hormuz-pressure-grid' },
  { routeKey: 'hormuz.sanctions', label: 'sanctions-summary', selector: '.sanctions-summary-grid' },
  { routeKey: 'hormuz.sanctions', label: 'sanctions-plumbing', selector: '.sanctions-plumbing' },
  { routeKey: 'hormuz.sanctions', label: 'sanctions-current-talks', selector: '.sanctions-current-talks' },
  { routeKey: 'talks.overview', label: 'talks-current-state', selector: '[data-diplomatic-state="current"]' }
];
const MAP_FOCUS = [
  { routeKey: 'military.campaigns', label: 'campaign-maplibre', selector: '[data-visual-sweep-hero="campaign"] .atlas-maplibre-map', renderer: 'maplibre' },
  { routeKey: 'hormuz.shipping', label: 'shipping-continuous-maplibre', selector: '[data-shipping-map-view="continuous"] .atlas-maplibre-map', renderer: 'maplibre' },
  { routeKey: 'hormuz.economy', label: 'economy-network', selector: '.context-map .atlas-leaflet-map', renderer: 'leaflet' },
  { routeKey: 'hormuz.sanctions', label: 'sanctions-network', selector: '.visual-route-hormuz-sanctions .context-map .atlas-leaflet-map', renderer: 'leaflet' }
];
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
    if (out.exceptionDetails) throw new Error(out.exceptionDetails.text || 'Runtime exception');
    return out.result && out.result.value;
  }
  close() { if (this.ws) this.ws.close(); }
}

async function waitFor(cdp, expression, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (await cdp.eval(expression)) return; } catch (_) { /* route rendering can replace context */ }
    await sleep(75);
  }
  throw new Error(`timeout: ${expression}`);
}

async function route(cdp, routeKey) {
  await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref(routeKey))};scrollTo(0,0);true`);
  await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(routeKey)}`);
  await sleep(120);
}

async function captureViewport(cdp, filename) {
  const screenshot = await cdp.call('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  fs.writeFileSync(path.join(OUTPUT, filename), Buffer.from(screenshot.data, 'base64'));
}

(async () => {
  fs.mkdirSync(OUTPUT, { recursive: true });
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
    await cdp.call('Page.navigate', { url: `${SITE}#/start/overview` });
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready'`);

    let captures = 0;
    for (const width of WIDTHS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
      for (const routeKey of ROUTES) {
        await route(cdp, routeKey);
        const safeRoute = routeKey.replace(/[^a-z0-9.-]+/gi, '-');
        await captureViewport(cdp, `${String(width).padStart(4, '0')}-${safeRoute}.png`);
        captures += 1;
      }
    }

    let mapFocusCaptures = 0;
    for (const width of WIDTHS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
      for (const focus of MAP_FOCUS) {
        await route(cdp, focus.routeKey);
        const selector = JSON.stringify(focus.selector);
        await waitFor(cdp, `Boolean(document.querySelector(${selector}))`);
        if (focus.renderer === 'maplibre') await waitFor(cdp, `document.querySelector(${selector})?.dataset.mapState === 'ready'`);
        const reviewState = await cdp.eval(`(() => {
          const target = document.querySelector(${selector});
          target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
          const map = target.closest('[data-component="MapLibreView"], [data-component="MapView"]');
          const isMapLibre = map?.dataset.mapRenderer === 'maplibre-gl-js';
          const routePane = !isMapLibre ? map?._atlasMap?.getPane('atlas-routes') : null;
          const labelSelector = isMapLibre ? '.guide-map-label' : '.reference-map-label';
          const labelNodes = [...target.querySelectorAll(labelSelector)].filter(node => !node.hidden && getComputedStyle(node).display !== 'none');
          return {
            renderer: map?.dataset.mapRenderer || 'leaflet',
            width: target.getBoundingClientRect().width,
            height: target.getBoundingClientRect().height,
            routePaths: isMapLibre ? Number(map?.dataset.mapRouteCount || 0) : (routePane?.querySelectorAll('path').length || 0),
            routeControls: isMapLibre ? map?.querySelectorAll('.visualization-toggle').length || 0 : map?.querySelectorAll('.map-route-button').length || 0,
            routeModes: map?.dataset.mapRouteModes || '',
            labels: target.querySelectorAll(labelSelector).length,
            visibleLabels: labelNodes.length,
            scope: map?.dataset.mapScope || '',
            bounds: map?.dataset.mapBounds || ''
          };
        })()`);
        assert(reviewState.width > 0 && reviewState.height > 0, `${focus.label} map has no rendered area at ${width}px`);
        if (focus.renderer === 'maplibre') {
          assert.equal(reviewState.renderer, 'maplibre-gl-js', `${focus.label} did not promote to MapLibre at ${width}px`);
          assert(reviewState.visibleLabels > 0, `${focus.label} has no visible progressive labels at ${width}px`);
        }
        if (focus.label === 'shipping-continuous-maplibre') {
          assert(reviewState.routePaths > 0, `${focus.label} has no accepted route geometry at ${width}px`);
          assert(reviewState.routeControls > 0 && reviewState.routeModes, `${focus.label} lacks route controls or route-mode metadata at ${width}px`);
        }
        await sleep(180);
        await captureViewport(cdp, `mapfocus-${String(width).padStart(4, '0')}-${focus.label}.png`);
        mapFocusCaptures += 1;
      }
    }

    let polishFocusCaptures = 0;
    for (const width of WIDTHS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
      for (const focus of POLISH_FOCUS) {
        await route(cdp, focus.routeKey);
        const selector = JSON.stringify(focus.selector);
        await waitFor(cdp, `Boolean(document.querySelector(${selector}))`);
        await cdp.eval(`(() => { const target=document.querySelector(${selector}); ${focus.openSelector ? `const disclosure=document.querySelector(${JSON.stringify(focus.openSelector)}); if (disclosure && innerWidth <= 600) disclosure.open=true;` : ''} target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' }); return true; })()`);
        await sleep(150);
        await captureViewport(cdp, `polishfocus-${String(width).padStart(4, '0')}-${focus.label}.png`);
        polishFocusCaptures += 1;
      }
    }

    // Dedicated WOL reader-mode review.
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await route(cdp, 'evidence.web_of_lies');
    await waitFor(cdp, `document.querySelector('.wol-cytoscape-host')?.dataset.graphState === 'ready'`);
    await cdp.eval(`(() => {
      const picker = document.querySelector('.wol-node-picker');
      const candidate = [...picker.options].find(option => option.value && option.textContent.includes('💩')) || [...picker.options].find(option => option.value);
      if (candidate) { picker.value = candidate.value; picker.dispatchEvent(new Event('change', { bubbles: true })); }
      document.querySelector('[data-wol-mode="full"]')?.click();
      document.querySelector('.wol-network')?.scrollIntoView({ block: 'center', behavior: 'auto' });
      return true;
    })()`);
    await sleep(180);
    await captureViewport(cdp, 'wol-full-1440.png');
    await cdp.eval(`document.querySelector('[data-wol-mode="direct"]')?.click(); true`);
    await sleep(180);
    await captureViewport(cdp, 'wol-direct-1440.png');
    await cdp.eval(`document.querySelector('[data-wol-mode="trace"]')?.click(); true`);
    await sleep(180);
    await captureViewport(cdp, 'wol-trace-1440.png');

    // Same-record MapLibre / Leaflet fallback comparison on Shipping.
    await route(cdp, 'hormuz.shipping');
    await waitFor(cdp, `document.querySelector('[data-shipping-map-view="continuous"] .atlas-maplibre-map')?.dataset.mapState === 'ready'`);
    await cdp.eval(`document.querySelector('[data-shipping-map-view="continuous"]')?.scrollIntoView({ block: 'center', behavior: 'auto' }); true`);
    await sleep(180);
    await captureViewport(cdp, 'shipping-maplibre-1440.png');
    await cdp.eval(`(() => {
      window.__reviewSavedVisualizationRenderer = window.AtlasVisualizationRenderer;
      window.AtlasVisualizationRenderer = { create: () => null };
      document.querySelector('#atlas-root').__atlasRouteController.render();
      return true;
    })()`);
    await waitFor(cdp, `Boolean(document.querySelector('[data-shipping-map-view="continuous"] .atlas-leaflet-map'))`);
    await cdp.eval(`document.querySelector('[data-shipping-map-view="continuous"]')?.scrollIntoView({ block: 'center', behavior: 'auto' }); true`);
    await sleep(180);
    await captureViewport(cdp, 'shipping-leaflet-fallback-1440.png');
    await cdp.eval(`(() => {
      window.AtlasVisualizationRenderer = window.__reviewSavedVisualizationRenderer;
      delete window.__reviewSavedVisualizationRenderer;
      document.querySelector('#atlas-root').__atlasRouteController.render();
      return true;
    })()`);

    await cdp.call('Emulation.clearDeviceMetricsOverride');
    const manifest = {
      widths: WIDTHS,
      routes: ROUTES,
      captures,
      map_focus: MAP_FOCUS.map(({ routeKey, label, selector }) => ({ routeKey, label, selector })),
      map_focus_captures: mapFocusCaptures,
      polish_focus: POLISH_FOCUS.map(({ routeKey, label, selector }) => ({ routeKey, label, selector })),
      polish_focus_captures: polishFocusCaptures,
      wol_mode_captures: ['wol-full-1440.png', 'wol-direct-1440.png', 'wol-trace-1440.png'],
      maplibre_leaflet_comparison: ['shipping-maplibre-1440.png', 'shipping-leaflet-fallback-1440.png'],
      total_review_captures: captures + mapFocusCaptures + polishFocusCaptures + 5
    };
    fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`browser public rendered review capture: PASS - ${captures} top-of-page screenshots (${ROUTES.length} high-risk routes x ${WIDTHS.length} widths) + ${mapFocusCaptures} focused map screenshots + ${polishFocusCaptures} evidence-first focus screenshots`);
  } finally {
    try { await cdp.call('Browser.close'); } catch (_) { /* workflow cleanup is fallback */ }
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
