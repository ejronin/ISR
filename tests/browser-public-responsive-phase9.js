'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const VIEWPORTS = [390, 320];
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class CDP {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.exceptions = [];
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
      if (!message.id) {
        if (message.method === 'Runtime.exceptionThrown') this.exceptions.push(message.params && message.params.exceptionDetails);
        return;
      }
      if (!this.pending.has(message.id)) return;
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
    if (out.result && out.result.subtype === 'error') throw new Error(out.result.description || 'Runtime error');
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

async function setRoute(cdp, route) {
  await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref(route.key))};true`);
  await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(route.key)}`);
}

function assertRouteView(view, route, width) {
  const label = `${route.key} at ${width}px`;
  assert.equal(view.routeKey, route.key, `route did not render: ${label}`);
  assert.equal(view.owner, route.owner, `wrong page owner: ${label}`);
  assert.deepEqual(view.h1, [route.title], `route must expose exactly one primary H1: ${label}`);
  assert.equal(view.mobileNavigationVisible, true, `primary mobile navigation is unreachable: ${label}`);
  assert(view.primaryLinks > 0, `primary mobile navigation contains no links: ${label}`);
  assert.equal(view.primaryLinkFocusable, true, `primary mobile navigation link is not focusable: ${label}`);
  assert.equal(view.mainReachable, true, `Skip to content cannot reach main content: ${label}`);
  if (view.controlCount) assert.equal(view.controlFocusable, true, `primary route control is not focusable: ${label}`);
  assert(view.pageScrollWidth <= view.pageWidth, `page-level horizontal overflow: ${label} (${view.pageScrollWidth} > ${view.pageWidth})`);
  assert.deepEqual(view.overflowingContainers, [], `major route container exceeds the viewport: ${label}`);
  assert.deepEqual(view.machineTokens, [], `raw underscore-delimited public taxonomy is visible: ${label}`);
}

(async () => {
  const targets = await (await fetch(`${DEBUG}/json`)).json();
  const target = targets.find(item => item.type === 'page');
  assert(target && target.webSocketDebuggerUrl, 'Atlas browser target missing');
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();
  let cases = 0;
  try {
    await cdp.call('Runtime.enable');
    await cdp.call('Page.enable');
    await cdp.call('Network.enable');
    await cdp.call('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.call('Page.navigate', { url: `${SITE}#/start/overview` });
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready'`);
    await cdp.eval(`(() => {
      window.__atlasResponsiveSmokeErrors = [];
      window.addEventListener('error', event => window.__atlasResponsiveSmokeErrors.push(String(event.error?.stack || event.message || 'window error')));
      window.addEventListener('unhandledrejection', event => window.__atlasResponsiveSmokeErrors.push(String(event.reason?.stack || event.reason || 'unhandled rejection')));
      return true;
    })()`);

    assert.equal(ia.ROUTES.size, 25, 'responsive route inventory changed');
    for (const width of VIEWPORTS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
      for (const route of ia.ROUTES.values()) {
        await setRoute(cdp, route);
        const view = await cdp.eval(`(() => {
          const main = document.querySelector('main');
          const navigation = document.querySelector('.mobile-navigation');
          navigation.open = true;
          const primaryLink = navigation.querySelector('.mobile-primary a');
          primaryLink.focus();
          const primaryLinkFocusable = document.activeElement === primaryLink;
          const controls = [...main.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, a[href]')]
            .filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
          const control = controls[0];
          if (control) control.focus();
          const controlFocusable = !control || document.activeElement === control;
          const visibleText = main?.innerText || '';
          const skip = document.querySelector('.skip-link');
          skip.focus();
          skip.click();
          const majorSelectors = [
            '[data-component="MapView"]', '.timeline-explorer', '.chronology-controls', '.chronology-list',
            '.lie-ledger-controls', '.lie-ledger-list', '[data-loss-side-group]', '[data-imagery-summary]'
          ].join(',');
          const viewportWidth = document.documentElement.clientWidth;
          return {
            routeKey: window.ATLAS_PUBLIC_STATE.routeKey,
            owner: document.querySelector('[data-page-owner]')?.dataset.pageOwner,
            h1: [...document.querySelectorAll('main h1')].map(node => node.textContent.trim()),
            mobileNavigationVisible: getComputedStyle(navigation).display !== 'none',
            primaryLinks: navigation.querySelectorAll('.mobile-primary a').length,
            primaryLinkFocusable,
            mainReachable: document.activeElement === document.getElementById('main-content'),
            controlCount: controls.length,
            controlFocusable,
            pageWidth: viewportWidth,
            pageScrollWidth: document.documentElement.scrollWidth,
            overflowingContainers: [...main.querySelectorAll(majorSelectors)].map(node => {
              const rect = node.getBoundingClientRect();
              return { label: node.dataset.component || node.className || node.tagName, left: rect.left, right: rect.right };
            }).filter(item => item.left < -1 || item.right > viewportWidth + 1),
            machineTokens: [...new Set((visibleText.match(/\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\b/g) || []))]
          };
        })()`);
        assertRouteView(view, route, width);

        const interaction = await cdp.eval(`(() => {
          const main = document.querySelector('main');
          const result = { timeline: false, map: false, filter: false, evidence: false, ledger: false, imagery: false, losses: false };
          const cluster = main.querySelector('.timeline-marker.cluster');
          if (cluster) { cluster.click(); result.timeline = Boolean(main.querySelector('.timeline-marker.event')); }
          const map = main.querySelector('[data-component="MapView"] .leaflet-container');
          if (map) {
            const zoom = main.querySelector('[data-component="MapView"] .leaflet-control-zoom-in');
            if (zoom) zoom.click();
            result.map = true;
          }
          const filter = main.querySelector('form input:not([disabled]), form select:not([disabled])');
          if (filter) {
            filter.focus();
            filter.dispatchEvent(new Event(filter.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
            result.filter = true;
          }
          const evidence = main.querySelector('.evidence-drawer');
          if (evidence) { evidence.open = true; result.evidence = evidence.open; }
          const ledger = main.querySelector('.lie-ledger-record');
          if (ledger) { ledger.open = true; result.ledger = ledger.open; }
          const imagery = main.querySelector('[data-imagery-summary]');
          if (imagery) { imagery.open = true; result.imagery = imagery.open; }
          const losses = main.querySelector('.casualty-method');
          if (losses) { losses.open = true; result.losses = losses.open; }
          return {
            ...result,
            pageWidth: document.documentElement.clientWidth,
            pageScrollWidth: document.documentElement.scrollWidth
          };
        })()`);
        if (route.key === 'timeline.war') assert.equal(interaction.timeline, true, `timeline state is unusable at ${width}px`);
        if (route.key === 'evidence.information') assert.equal(interaction.ledger, true, `Lie Ledger cannot expand at ${width}px`);
        if (route.key === 'military.imagery') assert.equal(interaction.imagery, true, `imagery detail cannot expand at ${width}px`);
        if (route.key === 'military.losses') assert.equal(interaction.losses, true, `loss methodology cannot expand at ${width}px`);
        assert(interaction.pageScrollWidth <= interaction.pageWidth, `representative interactive state causes overflow: ${route.key} at ${width}px`);
        cases += 1;
      }
    }
    assert.equal(cases, 50, 'responsive route/viewport case count changed');
    const windowErrors = await cdp.eval('window.__atlasResponsiveSmokeErrors');
    assert.deepEqual(windowErrors, [], 'fatal window error occurred during responsive route smoke');
    assert.deepEqual(cdp.exceptions.filter(Boolean), [], 'uncaught runtime exception occurred during responsive route smoke');

    // Chain the final-polish browser contract through an already-protected browser entry point.
    // The child opens its own CDP socket but intentionally leaves the shared browser process alive.
    const polish = spawnSync(process.execPath, [require.resolve('./browser-public-final-polish.js')], {
      stdio: 'inherit',
      env: { ...process.env, ATLAS_CDP: DEBUG, ATLAS_SITE: SITE }
    });
    assert.equal(polish.status, 0, `final-polish browser audit failed with status ${polish.status}`);

    console.log(`browser public responsive Phase 9: PASS - ${ia.ROUTES.size} routes at ${VIEWPORTS.join('px and ')}px; ${cases} route/viewport cases plus final-polish discoverability audit verified`);
  } finally {
    try { await cdp.call('Emulation.clearDeviceMetricsOverride'); } catch (_) { /* browser cleanup handles a lost target */ }
    cdp.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
