'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const root = path.resolve(__dirname, '..');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data', 'public-current-state.json'), 'utf8'));
const iaSource = fs.readFileSync(path.join(root, 'js', 'public-ia.js'), 'utf8');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const MACHINE_PATTERN = /\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\b/g;

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.exceptions = []; }
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
    try { if (await cdp.eval(expression)) return; } catch (_) { /* route render can replace context */ }
    await sleep(75);
  }
  throw new Error(`timeout: ${expression}`);
}

async function setRoute(cdp, routeKey) {
  await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref(routeKey))};true`);
  await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(routeKey)}`);
}

function publicSurfaceExpression(selector) {
  return `(() => {
    const root = document.querySelector(${JSON.stringify(selector)});
    const text = root?.innerText || '';
    const auxiliary = [...(root?.querySelectorAll('[aria-label], [title], option, summary, label') || [])]
      .flatMap(node => [node.getAttribute('aria-label') || '', node.getAttribute('title') || '',
        ['OPTION','SUMMARY','LABEL'].includes(node.tagName) ? node.textContent : '']).join(' ');
    return text + ' ' + auxiliary;
  })()`;
}

function assertStaticBoundary() {
  assert.equal(ia.displayTerm('GLOBAL_INTERNATIONAL', 'Other / not classified'), 'Global international');
  assert.equal(ia.displayTerm('SYNTHETIC_FUTURE_ORIGIN', 'Other / not classified'), 'Synthetic future origin');
  assert.equal(ia.displayTerm('United Kingdom', 'Other / not classified'), 'United Kingdom');
  assert.equal(ia.displayTerm(null, 'Other / not classified'), 'Other / not classified');

  const displayStart = iaSource.indexOf('function displayTerm(');
  const narrativeStart = iaSource.indexOf('function publicNarrative(');
  const plainStart = iaSource.indexOf('function plainLabel(');
  assert(displayStart >= 0 && narrativeStart > displayStart && plainStart > narrativeStart, 'shared public label helpers are missing');
  const displayBlock = iaSource.slice(displayStart, narrativeStart);
  const narrativeBlock = iaSource.slice(narrativeStart, plainStart);
  assert.match(displayBlock, /if \(DISPLAY_TERMS\[raw\]\) return DISPLAY_TERMS\[raw\];/);
  assert.match(displayBlock, /return publicNarrative\(raw, fallback\);/);
  assert.match(narrativeBlock, /replace\(MACHINE_TOKEN_PATTERN, token => DISPLAY_TERMS\[token\] \|\| machineTokenLabel\(token\)\)/);
  assert.match(narrativeBlock, /replace\(ANY_MACHINE_TOKEN_PATTERN, token => machineTokenLabel\(token\)\)/);

  const start = iaSource.indexOf('function SourcesDirectoryPage(');
  const end = iaSource.indexOf('function SourcesPage(', start);
  assert(start >= 0 && end > start, 'SourcesDirectoryPage block is unavailable');
  const block = iaSource.slice(start, end);
  assert.match(block, /const origin = firstText\(profile\.country, profile\.region\) \|\| 'Other \/ not classified';/);
  assert.match(block, /if \(!originMap\.has\(origin\)\) originMap\.set\(origin, new Map\(\)\);/);
  assert.match(block, /const outletMap = originMap\.get\(origin\);/);
  assert.match(block, /append\(origin, 'h3', '', displayTerm\(originName, 'Other \/ not classified'\)\)/);
  assert.doesNotMatch(block, /GLOBAL_INTERNATIONAL/);
  assert.match(block, /if \(profile\.outlet_type\) append\(meta, 'span', '', plainLabel\(profile\.outlet_type\)\);/);
  assert.match(block, /if \(profile\.state_affiliation\) append\(meta, 'span', '', publicNarrative\(profile\.state_affiliation\)\);/);
  assert.match(block, /if \(profile\.ownership_note\) append\(meta, 'span', '', publicNarrative\(profile\.ownership_note\)\);/);
  assert.match(block, /append\(card, 'h4', '', publicNarrative\(record\.title \|\| record\.publisher, source\.sourceId\)\);/);
  assert.match(block, /if \(record\.role\) append\(metaLine, 'span', '', publicNarrative\(record\.role\)\);/);
}

(async () => {
  assertStaticBoundary();
  const globalRows = model.sources.records.filter(source => {
    const profile = source.outlet_profile || {};
    return profile.country === 'GLOBAL_INTERNATIONAL' || profile.region === 'GLOBAL_INTERNATIONAL';
  });
  assert(globalRows.length > 0, 'GLOBAL_INTERNATIONAL fixture is absent from current public source data');

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
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp.call('Page.navigate', { url: `${SITE}#/evidence/sources` });
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === 'evidence.sources'`);

    const initialSurface = await cdp.eval(publicSurfaceExpression('main'));
    assert(!initialSurface.includes('GLOBAL_INTERNATIONAL'), 'live Sources public surface exposes GLOBAL_INTERNATIONAL');
    assert.deepEqual(initialSurface.match(MACHINE_PATTERN) || [], [], 'live Sources public surface exposes another underscore-delimited token');

    const live = await cdp.eval(`(() => {
      const main = document.querySelector('main');
      const headings = [...main.querySelectorAll('.source-origin > h3')].map(node => node.textContent.trim());
      const summaries = [...main.querySelectorAll('.source-outlet > summary')];
      const first = summaries[0];
      if (first) first.focus();
      const disclosureFocusable = !first || document.activeElement === first;
      const disclosureVisible = summaries.every(node => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
      const search = main.querySelector('.source-controls input[type="search"]');
      search.value = 'GLOBAL_INTERNATIONAL';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const filtered = {
        cards: [...main.querySelectorAll('.source-card')].map(card => card.dataset.sourceId),
        headings: [...main.querySelectorAll('.source-origin > h3')].map(node => node.textContent.trim()),
        count: main.querySelector('.filter-result-count')?.textContent.trim() || ''
      };
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      return { headings, disclosureCount: summaries.length, disclosureFocusable, disclosureVisible, filtered };
    })()`);
    assert(live.headings.includes('Global international'), 'GLOBAL_INTERNATIONAL is not rendered through the generic display boundary');
    assert(live.disclosureCount > 0 && live.disclosureVisible && live.disclosureFocusable, 'Sources disclosures are not discoverable/focusable');
    assert.equal(live.filtered.cards.length, globalRows.length, 'search by raw origin no longer returns the same rows');
    assert(live.filtered.headings.length > 0 && live.filtered.headings.every(label => label === 'Global international'), 'raw-origin search changed grouping/display behavior');
    assert.match(live.filtered.count, new RegExp(`^${globalRows.length} of `));

    const synthetic = await cdp.eval(`(() => {
      const Atlas = window.AtlasPublicIA;
      const route = Atlas.ROUTES.get('evidence.sources');
      const rawRecords = [
        { source_id: 'SYN-ENUM', outlet_profile: { outlet_type: 'NEWS_OUTLET', country: 'SYNTHETIC_FUTURE_ORIGIN', display_name: 'Synthetic Outlet' } },
        { source_id: 'SYN-COLLISION', outlet_profile: { outlet_type: 'NEWS_OUTLET', country: 'Synthetic future origin', display_name: 'Collision Outlet' } },
        { source_id: 'SYN-HUMAN', outlet_profile: { outlet_type: 'NEWS_OUTLET', country: 'United Kingdom', display_name: 'Readable Outlet' } },
        { source_id: 'SYN-MISSING', outlet_profile: { outlet_type: 'NEWS_OUTLET', display_name: 'Fallback Outlet' } }
      ];
      const catalog = rawRecords.map(raw => ({
        sourceId: raw.source_id, status: 'resolved', conflict: false, variants: [],
        selected: { record: { publisher: raw.outlet_profile.display_name, title: raw.outlet_profile.display_name + ' report', role: 'Reporting' } }
      }));
      const context = {
        documentObject: document, windowObject: window, route,
        model: { sources: { records: rawRecords }, datasets: {} },
        services: { sourceResolver: { catalog: () => catalog } }, state: {}
      };
      const fixture = document.createElement('div');
      fixture.id = 'synthetic-source-humanization-fixture';
      fixture.append(Atlas.PAGE_OWNERS.SourcesPage(context));
      document.body.append(fixture);
      const groupSnapshot = () => [...fixture.querySelectorAll('.source-origin')].map(section => ({
        heading: section.querySelector(':scope > h3')?.textContent.trim() || '',
        ids: [...section.querySelectorAll('.source-card')].map(card => card.dataset.sourceId)
      }));
      const initialGroups = groupSnapshot();
      const summaries = [...fixture.querySelectorAll('.source-outlet > summary')];
      const first = summaries[0];
      if (first) first.focus();
      const disclosureFocusable = !first || document.activeElement === first;
      const disclosureVisible = summaries.every(node => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
      const surface = [fixture.innerText, ...[...fixture.querySelectorAll('[aria-label],[title],summary,option,label')]
        .flatMap(node => [node.getAttribute('aria-label') || '', node.getAttribute('title') || '',
          ['SUMMARY','OPTION','LABEL'].includes(node.tagName) ? node.textContent : ''])].join(' ');
      const search = fixture.querySelector('.source-controls input[type="search"]');
      search.value = 'SYNTHETIC_FUTURE_ORIGIN';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const rawQuery = { cards: [...fixture.querySelectorAll('.source-card')].map(card => card.dataset.sourceId), headings: [...fixture.querySelectorAll('.source-origin > h3')].map(node => node.textContent.trim()), count: fixture.querySelector('.filter-result-count')?.textContent.trim() || '' };
      search.value = 'Readable Outlet';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const outletQuery = { cards: [...fixture.querySelectorAll('.source-card')].map(card => card.dataset.sourceId), headings: [...fixture.querySelectorAll('.source-origin > h3')].map(node => node.textContent.trim()), count: fixture.querySelector('.filter-result-count')?.textContent.trim() || '' };
      const result = { initialGroups, disclosureCount: summaries.length, disclosureFocusable, disclosureVisible, surface, rawQuery, outletQuery };
      fixture.remove();
      return result;
    })()`);

    const syntheticGroups = synthetic.initialGroups.filter(group => group.heading === 'Synthetic future origin');
    assert.equal(syntheticGroups.length, 2, 'display humanization collapsed distinct raw grouping keys');
    assert.deepEqual(syntheticGroups.map(group => group.ids).sort((a, b) => a[0].localeCompare(b[0])), [['SYN-COLLISION'], ['SYN-ENUM']]);
    assert.deepEqual(synthetic.initialGroups.find(group => group.heading === 'United Kingdom')?.ids, ['SYN-HUMAN'], 'human-readable origin changed');
    assert.deepEqual(synthetic.initialGroups.find(group => group.heading === 'Other / not classified')?.ids, ['SYN-MISSING'], 'missing-origin fallback changed');
    assert.deepEqual(synthetic.rawQuery, { cards: ['SYN-ENUM'], headings: ['Synthetic future origin'], count: '1 of 4 sources shown' }, 'synthetic raw-origin search/display path changed');
    assert.deepEqual(synthetic.outletQuery, { cards: ['SYN-HUMAN'], headings: ['United Kingdom'], count: '1 of 4 sources shown' }, 'ordinary outlet search/display path changed');
    assert.equal(synthetic.disclosureCount, 4);
    assert.equal(synthetic.disclosureFocusable, true);
    assert.equal(synthetic.disclosureVisible, true);
    assert(!synthetic.surface.includes('SYNTHETIC_FUTURE_ORIGIN'), 'synthetic raw origin leaked into visible/aria/title/summary text');
    assert.deepEqual(synthetic.surface.match(MACHINE_PATTERN) || [], [], 'synthetic Sources surface exposes an underscore-delimited token');

    const widerLeaks = [];
    for (const route of ia.ROUTES.values()) {
      await setRoute(cdp, route.key);
      const surface = await cdp.eval(publicSurfaceExpression('main'));
      const tokens = [...new Set(surface.match(MACHINE_PATTERN) || [])];
      widerLeaks.push(...tokens.map(token => `${route.key}:${token}`));
    }
    assert.deepEqual(widerLeaks, [], 'wider runtime audit found raw taxonomy on a public route');
    assert.deepEqual(cdp.exceptions.filter(Boolean), [], 'uncaught runtime exception during focused qualification');

    console.log(`source humanization focus: PASS - shared boundary, live/synthetic origins, raw grouping/search, fallback, disclosure/accessibility, and ${ia.ROUTES.size}-route runtime audit verified at 390px`);
  } finally {
    try { await cdp.call('Emulation.clearDeviceMetricsOverride'); } catch (_) { /* cleanup */ }
    cdp.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
