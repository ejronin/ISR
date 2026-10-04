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
  { routeKey: 'hormuz.economy', label: 'economy-network', selector: '.context-map .atlas-maplibre-map', renderer: 'maplibre' },
  { routeKey: 'hormuz.sanctions', label: 'sanctions-network', selector: '.visual-route-hormuz-sanctions .context-map .atlas-leaflet-map', renderer: 'leaflet' }
];
const PHASE1_VISUAL_FOCUS = [
  { routeKey: 'timeline.war', label: 'timeline-density-chart', selector: '.guide-event-density', state: 'chart' },
  { routeKey: 'military.campaigns', label: 'campaign-activity-chart', selector: '.guide-category-bars', state: 'chart' },
  { routeKey: 'military.campaigns', label: 'campaign-map', selector: '[data-visual-sweep-hero="campaign"]', state: 'map' },
  { routeKey: 'hormuz.overview', label: 'hormuz-overview-map', selector: '.guide-hormuz-map', state: 'map' },
  { routeKey: 'hormuz.economy', label: 'economy-route-map', selector: '.context-map[data-map-renderer="maplibre-gl-js"]', state: 'map' },
  { routeKey: 'start.actors', label: 'actor-geography', selector: '.guide-region-map', state: 'map' },
  { routeKey: 'military.losses', label: 'paired-loss-accounting', selector: '.phase1-loss-accounting', state: 'static' },
  { routeKey: 'evidence.web_of_lies', label: 'wol-network', selector: '.wol-graph-column', state: 'wol' }
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
  const hash = ia.routeHref(routeKey);
  const ready = `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(routeKey)}`;
  await cdp.eval(`location.hash=${JSON.stringify(hash)};scrollTo(0,0);true`);
  try {
    await waitFor(cdp, ready, 10000);
  } catch (_) {
    await cdp.call('Page.navigate', { url: `${SITE}${hash}` });
    await waitFor(cdp, ready, 30000);
  }
  await sleep(120);
}

async function resetReviewPage(cdp) {
  await cdp.call('Page.navigate', { url: `${SITE}#/start/overview` });
  await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === "start.overview"`);
  await sleep(180);
}

async function captureViewport(cdp, filename) {
  const screenshot = await cdp.call('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  fs.writeFileSync(path.join(OUTPUT, filename), Buffer.from(screenshot.data, 'base64'));
}

async function captureElement(cdp, selector, filename, maxHeight = 1400) {
  const rect = await cdp.eval(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return {
      x: Math.max(0, box.left + scrollX),
      y: Math.max(0, box.top + scrollY),
      width: Math.max(1, box.width),
      height: Math.max(1, Math.min(box.height, ${Number(maxHeight)}))
    };
  })()`);
  assert(rect && rect.width > 0 && rect.height > 0, `cannot capture missing/empty element: ${selector}`);
  const screenshot = await cdp.call('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 }
  });
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

    await resetReviewPage(cdp);

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
        await captureElement(cdp, focus.selector, `mapfocus-${String(width).padStart(4, '0')}-${focus.label}.png`, 1100);
        mapFocusCaptures += 1;
      }
    }

    await resetReviewPage(cdp);

    let polishFocusCaptures = 0;
    for (const width of WIDTHS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
      for (const focus of POLISH_FOCUS) {
        await route(cdp, focus.routeKey);
        const selector = JSON.stringify(focus.selector);
        await waitFor(cdp, `Boolean(document.querySelector(${selector}))`);
        await cdp.eval(`(() => { const target=document.querySelector(${selector}); ${focus.openSelector ? `const disclosure=document.querySelector(${JSON.stringify(focus.openSelector)}); if (disclosure && innerWidth <= 600) disclosure.open=true;` : ''} target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' }); return true; })()`);
        await sleep(150);
        await captureElement(cdp, focus.selector, `polishfocus-${String(width).padStart(4, '0')}-${focus.label}.png`, 1200);
        polishFocusCaptures += 1;
      }
    }

    await resetReviewPage(cdp);

    let phase1VisualCaptures = 0;
    for (const width of [1440, 390]) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
      for (const focus of PHASE1_VISUAL_FOCUS) {
        await route(cdp, focus.routeKey);
        const selector = JSON.stringify(focus.selector);
        await waitFor(cdp, `Boolean(document.querySelector(${selector}))`);
        if (focus.state === 'chart') {
          await waitFor(cdp, `document.querySelector(${selector})?.dataset.chartState === 'ready'`);
        } else if (focus.state === 'map') {
          await waitFor(cdp, `(() => {
            const section = document.querySelector(${selector});
            return section?.querySelector('.atlas-maplibre-map')?.dataset.mapState === 'ready' || Boolean(section?.querySelector('.atlas-leaflet-map.leaflet-container'));
          })()`);
        } else if (focus.state === 'wol') {
          await waitFor(cdp, `document.querySelector('.wol-cytoscape-host')?.dataset.graphState === 'ready'`);
        }
        const state = await cdp.eval(`(() => {
          const target = document.querySelector(${selector});
          target?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
          return target ? {
            width: target.getBoundingClientRect().width,
            height: target.getBoundingClientRect().height,
            chartState: target.dataset.chartState || '',
            mapState: target.querySelector('.atlas-maplibre-map')?.dataset.mapState || '',
            graphState: target.querySelector('.wol-cytoscape-host')?.dataset.graphState || ''
          } : null;
        })()`);
        assert(state && state.width > 0 && state.height > 0, `${focus.label} has no rendered review area at ${width}px`);
        await sleep(180);
        await captureElement(cdp, focus.selector, `phase1visual-${String(width).padStart(4, '0')}-${focus.label}.png`, width <= 390 ? 1800 : 1400);
        phase1VisualCaptures += 1;
      }
    }

    await resetReviewPage(cdp);

    // Dedicated WOL actor-dossier reader-mode review.
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await route(cdp, 'evidence.web_of_lies');
    await waitFor(cdp, `document.querySelector('.wol-cytoscape-host')?.dataset.graphState === 'ready'`);
    const wolActorId = await cdp.eval(`(() => {
      const picker = document.querySelector('.wol-node-picker');
      return ([...picker.options].find(option => option.value && option.textContent.includes('💩')) || [...picker.options].find(option => option.value))?.value || '';
    })()`);
    assert(wolActorId, 'No WOL actor is available for dossier review');
    await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref('evidence.web_of_lies', { dossier: 'actor', source: '__ACTOR__' }).replace('__ACTOR__', wolActorId))};true`);
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.routeKey === 'evidence.web_of_lies' && document.querySelector('.public-page')?.dataset?.dossierSource === ${JSON.stringify(wolActorId)} || Boolean(document.querySelector('.wol-node-detail[data-guide-section="current-record"]'))`);
    await waitFor(cdp, `document.querySelector('.wol-cytoscape-host')?.dataset.graphState === 'ready'`);
    await cdp.eval(`(() => {
      document.querySelector('[data-wol-mode="full"]')?.click();
      document.querySelector('.wol-network')?.scrollIntoView({ block: 'center', behavior: 'auto' });
      return true;
    })()`);
    await sleep(180);
    await captureElement(cdp, '.wol-graph-column', 'wol-actor-dossier-full-1440.png', 1400);
    await cdp.eval(`document.querySelector('[data-wol-mode="direct"]')?.click(); true`);
    await sleep(180);
    await captureElement(cdp, '.wol-graph-column', 'wol-actor-dossier-direct-1440.png', 1400);
    await cdp.eval(`document.querySelector('[data-wol-mode="trace"]')?.click(); true`);
    await sleep(180);
    await captureElement(cdp, '.wol-graph-column', 'wol-actor-dossier-trace-1440.png', 1400);

    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp.eval(`document.querySelector('[data-wol-mode="trace"]')?.click(); document.querySelector('.wol-network')?.scrollIntoView({ block: 'start', behavior: 'auto' }); true`);
    await sleep(180);
    await captureElement(cdp, '.wol-mobile-trace:not([hidden])', 'wol-actor-dossier-trace-0390.png', 1800);

    // Lie Ledger case dossier — same accepted case record, desktop/ultrawide/mobile.
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await route(cdp, 'evidence.information');
    const lieCaseHref = await cdp.eval(`document.querySelector('.reader-case-link')?.getAttribute('href') || ''`);
    assert(lieCaseHref, 'No Lie Ledger case dossier link is available for review');
    await cdp.eval(`location.hash=${JSON.stringify(lieCaseHref)};scrollTo(0,0);true`);
    await waitFor(cdp, `Boolean(document.querySelector('.guide-lie-ledger-dossier .guide-dossier-record'))`);
    await captureElement(cdp, '.guide-lie-ledger-dossier .guide-dossier-record', 'lie-ledger-dossier-1440.png', 1400);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await sleep(120);
    await captureElement(cdp, '.guide-lie-ledger-dossier .guide-dossier-record', 'lie-ledger-dossier-1920.png', 1400);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(120);
    await captureElement(cdp, '.guide-lie-ledger-dossier .guide-dossier-record', 'lie-ledger-dossier-0390.png', 1800);

    // Same-record MapLibre / Leaflet fallback comparison on Shipping.
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await route(cdp, 'hormuz.shipping');
    await waitFor(cdp, `document.querySelector('[data-shipping-map-view="continuous"] .atlas-maplibre-map')?.dataset.mapState === 'ready'`);
    await cdp.eval(`document.querySelector('[data-shipping-map-view="continuous"]')?.scrollIntoView({ block: 'center', behavior: 'auto' }); true`);
    await sleep(180);
    await captureElement(cdp, '[data-shipping-map-view="continuous"] .atlas-maplibre-map', 'shipping-maplibre-1440.png', 1000);
    await cdp.eval(`(() => {
      window.__reviewSavedVisualizationRenderer = window.AtlasVisualizationRenderer;
      window.AtlasVisualizationRenderer = { create: () => null };
      document.querySelector('#atlas-root').__atlasRouteController.render();
      return true;
    })()`);
    await waitFor(cdp, `Boolean(document.querySelector('[data-shipping-map-view="continuous"] .atlas-leaflet-map'))`);
    await cdp.eval(`document.querySelector('[data-shipping-map-view="continuous"]')?.scrollIntoView({ block: 'center', behavior: 'auto' }); true`);
    await sleep(180);
    await captureElement(cdp, '[data-shipping-map-view="continuous"] .atlas-leaflet-map', 'shipping-leaflet-fallback-1440.png', 1000);
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
      phase1_visual_focus: PHASE1_VISUAL_FOCUS.map(({ routeKey, label, selector, state }) => ({ routeKey, label, selector, state })),
      phase1_visual_focus_captures: phase1VisualCaptures,
      wol_mode_captures: ['wol-actor-dossier-full-1440.png', 'wol-actor-dossier-direct-1440.png', 'wol-actor-dossier-trace-1440.png', 'wol-actor-dossier-trace-0390.png'],
      lie_ledger_dossier_captures: ['lie-ledger-dossier-1920.png', 'lie-ledger-dossier-1440.png', 'lie-ledger-dossier-0390.png'],
      maplibre_leaflet_comparison: ['shipping-maplibre-1440.png', 'shipping-leaflet-fallback-1440.png'],
      total_review_captures: captures + mapFocusCaptures + polishFocusCaptures + phase1VisualCaptures + 9
    };
    fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`browser public rendered review capture: PASS - ${captures} top-of-page screenshots (${ROUTES.length} high-risk routes x ${WIDTHS.length} widths) + ${mapFocusCaptures} focused map screenshots + ${polishFocusCaptures} evidence-first focus screenshots + ${phase1VisualCaptures} Phase 1 visualization screenshots`);
  } finally {
    try { await cdp.call('Browser.close'); } catch (_) { /* workflow cleanup is fallback */ }
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
