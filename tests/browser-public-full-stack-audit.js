'use strict';

const assert = require('node:assert/strict');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const WIDTHS = [1440, 1024, 768, 390, 320];
const MACHINE_TOKEN = /\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\b/g;
const INTERNAL_PHRASES = [
  'Do not add the headline categories',
  'No machine-readable footprint/damage polygons were supplied',
  'Do not create polygons or percentages from prose'
];
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
        if (message.method === 'Runtime.exceptionThrown') {
          this.exceptions.push(message.params && message.params.exceptionDetails || { text: 'runtime exception' });
        }
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
    if (out.exceptionDetails) {
      throw new Error(out.exceptionDetails.exception && out.exceptionDetails.exception.description || out.exceptionDetails.text || 'Runtime exception');
    }
    if (out.result && out.result.subtype === 'error') throw new Error(out.result.description || 'Runtime error');
    return out.result && out.result.value;
  }
  close() { if (this.ws) this.ws.close(); }
}

async function waitFor(cdp, expression, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (await cdp.eval(expression)) return; } catch (_) { /* route render can replace context */ }
    await sleep(75);
  }
  throw new Error(`timeout: ${expression}`);
}

async function route(cdp, routeKey) {
  await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref(routeKey))};true`);
  await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(routeKey)}`);
}

function addFinding(findings, routeKey, width, category, detail) {
  findings.push(`${routeKey}@${width}:${category}:${detail}`);
}

(async () => {
  const targets = await (await fetch(`${DEBUG}/json`)).json();
  const target = targets.find(item => item.type === 'page');
  assert(target && target.webSocketDebuggerUrl, 'Atlas browser target missing');
  const cdp = new CDP(target.webSocketDebuggerUrl);
  const findings = [];
  const routeCount = ia.ROUTES.size;
  await cdp.open();
  try {
    await cdp.call('Runtime.enable');
    await cdp.call('Page.enable');
    await cdp.call('Network.enable');
    await cdp.call('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.call('Page.navigate', { url: `${SITE}#/start/overview` });
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready'`);

    for (const width of WIDTHS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
      for (const routeRecord of ia.ROUTES.values()) {
        const exceptionStart = cdp.exceptions.length;
        try {
          await route(cdp, routeRecord.key);
          const snapshot = await cdp.eval(`(() => {
            const main = document.querySelector('main');
            const reader = main?.innerText || '';
            const a11y = [...(main?.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [title], img[alt], summary, button, label, option') || [])]
              .flatMap(node => [
                node.getAttribute('aria-label') || '',
                node.getAttribute('aria-labelledby') || '',
                node.getAttribute('aria-describedby') || '',
                node.getAttribute('title') || '',
                node.getAttribute('alt') || '',
                ['SUMMARY', 'BUTTON', 'LABEL', 'OPTION'].includes(node.tagName) ? node.textContent || '' : ''
              ]).filter(Boolean).join(' ');
            const publicText = reader + ' ' + a11y;
            const mobileSummary = document.querySelector('.mobile-navigation > summary');
            const h1 = main?.querySelector('h1');
            return {
              routeKey: window.ATLAS_PUBLIC_STATE?.routeKey,
              h1: h1?.textContent.trim() || '',
              h1Visible: Boolean(h1 && h1.getClientRects().length),
              machine: [...new Set(publicText.match(/\\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\\b/g) || [])],
              internal: ${JSON.stringify(INTERNAL_PHRASES)}.filter(phrase => publicText.includes(phrase)),
              clientWidth: document.documentElement.clientWidth,
              scrollWidth: document.documentElement.scrollWidth,
              mainWidth: main?.getBoundingClientRect().width || 0,
              mobileSummaryVisible: !mobileSummary || Boolean(mobileSummary.getClientRects().length),
              mainTextLength: reader.trim().length
            };
          })()`);

          if (snapshot.routeKey !== routeRecord.key) addFinding(findings, routeRecord.key, width, 'route', `resolved-${snapshot.routeKey}`);
          if (!snapshot.h1 || !snapshot.h1Visible) addFinding(findings, routeRecord.key, width, 'heading', 'missing-or-hidden-h1');
          if (snapshot.mainTextLength < 20) addFinding(findings, routeRecord.key, width, 'content', 'empty-reading-surface');
          snapshot.machine.forEach(token => addFinding(findings, routeRecord.key, width, 'machine-token', token));
          snapshot.internal.forEach(phrase => addFinding(findings, routeRecord.key, width, 'internal-copy', phrase));
          if (snapshot.scrollWidth > snapshot.clientWidth) addFinding(findings, routeRecord.key, width, 'overflow', `${snapshot.scrollWidth}>${snapshot.clientWidth}`);
          if ((width === 390 || width === 320) && !snapshot.mobileSummaryVisible) addFinding(findings, routeRecord.key, width, 'mobile-nav', 'summary-not-visible');
        } catch (error) {
          addFinding(findings, routeRecord.key, width, 'exception', String(error && error.message || error));
        }
        cdp.exceptions.slice(exceptionStart).forEach(exception => {
          addFinding(findings, routeRecord.key, width, 'runtime-exception', exception.text || exception.exception && exception.exception.description || 'unknown');
        });
      }
    }

    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });

    await route(cdp, 'evidence.sources');
    const sources = await cdp.eval(`(() => {
      const main = document.querySelector('main');
      const search = main.querySelector('.source-controls input[type="search"]');
      const initialSummaries = [...main.querySelectorAll('.source-outlet > summary')];
      const firstSummary = initialSummaries[0];
      if (firstSummary) firstSummary.focus();
      const focusable = !firstSummary || document.activeElement === firstSummary;
      if (firstSummary) firstSummary.click();
      const opened = !firstSummary || firstSummary.parentElement.open;
      search.value = 'GLOBAL_INTERNATIONAL';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const filteredCards = [...main.querySelectorAll('.source-card')];
      const filteredSummaries = [...main.querySelectorAll('.source-outlet > summary')];
      const filteredHeadings = [...main.querySelectorAll('.source-origin > h3')].map(node => node.textContent.trim());
      const count = main.querySelector('.filter-result-count')?.textContent.trim() || '';
      const visibleRoute = filteredSummaries.length > 0 && filteredSummaries.every(node => node.getClientRects().length > 0);
      const rawVisible = (main.innerText || '').includes('GLOBAL_INTERNATIONAL');
      search.value = '__NO_SOURCE_SHOULD_MATCH_THIS__';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const empty = main.querySelector('.empty-state')?.textContent.trim() || '';
      return { focusable, opened, filteredCards: filteredCards.length, filteredSummaries: filteredSummaries.length, filteredHeadings, count, visibleRoute, rawVisible, empty };
    })()`);
    if (!sources.focusable || !sources.opened) addFinding(findings, 'evidence.sources', 390, 'disclosure', 'source-summary-not-focusable-or-openable');
    if (!sources.filteredCards || !sources.filteredSummaries || !sources.visibleRoute) addFinding(findings, 'evidence.sources', 390, 'search', 'matching-source-not-discoverable');
    if (sources.rawVisible) addFinding(findings, 'evidence.sources', 390, 'machine-token', 'GLOBAL_INTERNATIONAL-visible-after-search');
    if (sources.filteredHeadings.some(value => /_/.test(value))) addFinding(findings, 'evidence.sources', 390, 'heading', `raw-filter-heading-${sources.filteredHeadings.join('|')}`);
    if (!/^\d+ of \d+ sources shown$/.test(sources.count)) addFinding(findings, 'evidence.sources', 390, 'search-count', sources.count || 'missing');
    if (!/No sources match this search/i.test(sources.empty)) addFinding(findings, 'evidence.sources', 390, 'empty-state', sources.empty || 'missing');

    await route(cdp, 'evidence.information');
    const ledger = await cdp.eval(`(() => {
      const main = document.querySelector('main');
      const claim = main.querySelector('[data-claim-instance-id]');
      const chain = claim?.closest('[data-chain-id]');
      if (chain) chain.open = true;
      const summary = claim?.querySelector(':scope > summary');
      if (summary) summary.focus();
      const focusable = !summary || document.activeElement === summary;
      if (summary) summary.click();
      const drawerSummary = claim?.querySelector('[data-evidence-component] .evidence-drawer > summary');
      if (drawerSummary) drawerSummary.click();
      return {
        claim: Boolean(claim),
        chain: Boolean(chain),
        chainOpen: !chain || Boolean(chain.open),
        focusable,
        open: Boolean(claim?.open),
        drawer: Boolean(drawerSummary),
        drawerOpen: !drawerSummary || drawerSummary.parentElement.open,
        text: claim?.innerText || ''
      };
    })()`);
    if (!ledger.claim || !ledger.chain || !ledger.chainOpen || !ledger.focusable || !ledger.open) addFinding(findings, 'evidence.information', 390, 'disclosure', 'claim-instance-not-focusable-or-openable');
    if (!ledger.drawer || !ledger.drawerOpen) addFinding(findings, 'evidence.information', 390, 'evidence-drawer', 'component-drawer-not-discoverable-or-openable');

    await route(cdp, 'military.imagery');
    const imagery = await cdp.eval(`(() => {
      const row = document.querySelector('[data-imagery-summary]');
      const summary = row?.querySelector(':scope > summary');
      if (summary) summary.focus();
      const focusable = !summary || document.activeElement === summary;
      if (summary) summary.click();
      return { row: Boolean(row), focusable, open: Boolean(row?.open), map: Boolean(document.querySelector('[data-component="MapView"] .leaflet-container')) };
    })()`);
    if (!imagery.row || !imagery.focusable || !imagery.open) addFinding(findings, 'military.imagery', 390, 'disclosure', 'imagery-not-focusable-or-openable');
    if (!imagery.map) addFinding(findings, 'military.imagery', 390, 'map', 'missing-map-runtime');

    await route(cdp, 'military.losses');
    const losses = await cdp.eval(`(() => {
      const select = document.querySelector('[data-loss-filter="physical"]');
      if (!select || select.options.length < 2) return { filter:false };
      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const visible = [...document.querySelectorAll('[data-loss-id]')].filter(card => !card.hidden).length;
      const count = document.querySelector('.filter-result-count')?.textContent.trim() || '';
      return { filter:true, visible, count };
    })()`);
    if (!losses.filter || !losses.visible || !/^\d+ of \d+ material-loss records shown$/.test(losses.count)) addFinding(findings, 'military.losses', 390, 'filter', losses.count || 'filter-not-operational');

    await route(cdp, 'military.campaigns');
    const mapInteraction = await cdp.eval(`(() => {
      const map = document.querySelector('[data-component="MapView"] .leaflet-container');
      const marker = document.querySelector('[data-component="MapView"] .leaflet-marker-icon');
      if (marker) marker.click();
      const card = document.querySelector('.map-card');
      const close = card?.querySelector('.map-card-close');
      if (close) close.click();
      return { map:Boolean(map), marker:Boolean(marker), cardOpened:Boolean(card), cardClosed: !document.querySelector('.map-card') || document.querySelector('.map-card')?.parentElement?.hidden === true };
    })()`);
    if (!mapInteraction.map) addFinding(findings, 'military.campaigns', 390, 'map', 'missing-map-runtime');
    if (mapInteraction.marker && !mapInteraction.cardOpened) addFinding(findings, 'military.campaigns', 390, 'map', 'marker-does-not-open-context');

    await route(cdp, 'evidence.sources');
    const navigation = await cdp.eval(`(() => {
      const nav = document.querySelector('.mobile-navigation');
      const summary = nav?.querySelector(':scope > summary');
      if (summary) summary.focus();
      const focusable = !summary || document.activeElement === summary;
      if (summary) summary.click();
      const link = nav?.querySelector('a[href]');
      return { exists:Boolean(nav), focusable, open:Boolean(nav?.open), link:Boolean(link) };
    })()`);
    if (!navigation.exists || !navigation.focusable || !navigation.open || !navigation.link) addFinding(findings, 'evidence.sources', 390, 'mobile-nav', 'not-focusable-openable-navigable');

    const beforeHistory = await cdp.eval(`location.hash`);
    await route(cdp, 'evidence.method');
    await cdp.eval(`history.back(); true`);
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === 'evidence.sources'`);
    const afterHistory = await cdp.eval(`location.hash`);
    if (afterHistory !== beforeHistory) addFinding(findings, 'evidence.sources', 390, 'history', `${beforeHistory}->${afterHistory}`);

    await cdp.call('Emulation.clearDeviceMetricsOverride');

    if (findings.length) {
      console.error(`PUBLIC FULL-STACK AUDIT: ${findings.length} finding(s)`);
      findings.forEach(item => console.error(` - ${item}`));
      throw new assert.AssertionError({ message: 'aggregate public full-stack audit found release defects', actual: findings, expected: [] });
    }

    console.log(`browser public full-stack audit: PASS - ${routeCount} routes x ${WIDTHS.length} widths (${routeCount * WIDTHS.length} renders), reader/a11y machine-language scan, overflow, disclosures, search/filter, map, mobile navigation and history verified`);
  } finally {
    try { await cdp.call('Browser.close'); } catch (_) { /* workflow cleanup is fallback */ }
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });