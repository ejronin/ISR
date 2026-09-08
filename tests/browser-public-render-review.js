'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const OUTPUT = process.env.ATLAS_SCREENSHOT_DIR || path.join(__dirname, '..', 'audit-screens');
const WIDTHS = [1440, 1024, 768, 390, 320];
const ROUTES = [
  'start.overview',
  'timeline.war',
  'evidence.sources',
  'evidence.information',
  'military.campaigns',
  'military.losses',
  'hormuz.shipping',
  'hormuz.economy',
  'talks.overview',
  'talks.mou',
  'evidence.archive',
  'military.imagery'
];
const POLISH_FOCUS = [
  { routeKey: 'start.overview', label: 'start-current-state', selector: '[data-current-state-summary]' },
  { routeKey: 'start.overview', label: 'start-evidence-clock', selector: '.evidence-clock-bar', openSelector: '.evidence-clock-mobile' },
  { routeKey: 'talks.overview', label: 'talks-current-state', selector: '[data-diplomatic-state="current"]' },
  { routeKey: 'start.overview', label: 'start-war-90', selector: '[data-war-in-90-seconds]' },
  { routeKey: 'start.overview', label: 'start-objectives', selector: '[data-objective-orientation]' },
  { routeKey: 'start.overview', label: 'start-us-entry', selector: '[data-us-war-rationale]' },
  { routeKey: 'start.overview', label: 'start-hormuz-trajectory', selector: '[data-hormuz-trajectory]' }
];
const MAP_FOCUS = [
  { routeKey: 'military.campaigns', label: 'campaign', selector: '[data-visual-sweep-hero="campaign"] .atlas-leaflet-map' },
  { routeKey: 'hormuz.shipping', label: 'shipping-chokepoint', selector: '[data-shipping-map-view="chokepoint"] .atlas-leaflet-map' },
  { routeKey: 'hormuz.shipping', label: 'shipping-network', selector: '[data-shipping-map-view="network"] .atlas-leaflet-map' },
  { routeKey: 'hormuz.economy', label: 'economy-network', selector: '.context-map .atlas-leaflet-map' }
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
        const reviewState = await cdp.eval(`(() => {
          const target = document.querySelector(${selector});
          target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
          const map = target.closest('[data-component="MapView"]');
          const routePane = map?._atlasMap?.getPane('atlas-routes');
          return {
            width: target.getBoundingClientRect().width,
            height: target.getBoundingClientRect().height,
            routePaths: routePane?.querySelectorAll('path').length || 0,
            routeControls: map?.querySelectorAll('.map-route-button').length || 0,
            routeModes: map?.dataset.mapRouteModes || '',
            labels: target.querySelectorAll('.reference-map-label').length,
            visibleLabels: [...target.querySelectorAll('.reference-map-label')].filter(node => getComputedStyle(node).display !== 'none').length,
            labelOverlaps: (() => {
              const boxes = [...target.querySelectorAll('.reference-map-label')]
                .filter(node => getComputedStyle(node).display !== 'none')
                .map(node => (node.querySelector('span') || node).getBoundingClientRect());
              let overlaps = 0;
              for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
                const a = boxes[i], b = boxes[j];
                if (!(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)) overlaps += 1;
              }
              return overlaps;
            })(),
            labelClips: (() => {
              const bounds = target.getBoundingClientRect();
              return [...target.querySelectorAll('.reference-map-label')]
                .filter(node => getComputedStyle(node).display !== 'none')
                .map(node => (node.querySelector('span') || node).getBoundingClientRect())
                .filter(rect => rect.left < bounds.left + 3 || rect.right > bounds.right - 3 || rect.top < bounds.top + 3 || rect.bottom > bounds.bottom - 3).length;
            })(),
            labelPolicy: map?.dataset.mapLabelPolicy || '',
            scope: map?.dataset.mapScope || '',
            bounds: map?.dataset.mapBounds || ''
          };
        })()`);
        assert(reviewState.width > 0 && reviewState.height > 0, `${focus.label} map has no rendered area at ${width}px`);
        if (focus.label === 'shipping-network') {
          assert(reviewState.routePaths > 0, `${focus.label} has no rendered SVG route geometry at ${width}px`);
          assert(reviewState.routeControls > 0 && reviewState.routeModes, `${focus.label} lacks route controls or route-mode metadata at ${width}px`);
        }
        if (focus.label === 'shipping-network' || focus.label === 'economy-network') {
          const visibleCeiling = width <= 390 ? 6 : width <= 768 ? 9 : 14;
          assert(reviewState.visibleLabels <= visibleCeiling, `${focus.label} exceeds ${visibleCeiling} visible contextual labels at ${width}px`);
          assert.equal(reviewState.labelPolicy, 'route-endpoints-prioritized', `${focus.label} is not using the route-endpoint label policy at ${width}px`);
        }
        if (focus.label === 'campaign') {
          const visibleCeiling = width <= 390 ? 7 : width <= 768 ? 10 : 10;
          assert(reviewState.visibleLabels <= visibleCeiling, `campaign map exceeds ${visibleCeiling} visible theater labels at ${width}px`);
          assert.equal(reviewState.labelPolicy, 'theater-context-prioritized', `campaign map is not using the theater label policy at ${width}px`);
        }
        if (width <= 390) {
          assert.equal(reviewState.labelOverlaps, 0, `${focus.label} has overlapping visible context labels at ${width}px`);
          assert.equal(reviewState.labelClips, 0, `${focus.label} has a visible context label clipped by the map edge at ${width}px`);
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

    await cdp.call('Emulation.clearDeviceMetricsOverride');
    const manifest = {
      widths: WIDTHS,
      routes: ROUTES,
      captures,
      map_focus: MAP_FOCUS.map(({ routeKey, label, selector }) => ({ routeKey, label, selector })),
      map_focus_captures: mapFocusCaptures,
      polish_focus: POLISH_FOCUS.map(({ routeKey, label, selector }) => ({ routeKey, label, selector })),
      polish_focus_captures: polishFocusCaptures,
      total_review_captures: captures + mapFocusCaptures + polishFocusCaptures
    };
    fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`browser public rendered review capture: PASS - ${captures} top-of-page screenshots (${ROUTES.length} high-risk routes x ${WIDTHS.length} widths) + ${mapFocusCaptures} focused map screenshots + ${polishFocusCaptures} final-polish focus screenshots`);
  } finally {
    try { await cdp.call('Browser.close'); } catch (_) { /* workflow cleanup is fallback */ }
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
