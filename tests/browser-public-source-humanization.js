'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const root = path.resolve(__dirname, '..');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data', 'public-current-state.json'), 'utf8'));
const iaSource = fs.readFileSync(path.join(root, 'js', 'public-ia.js'), 'utf8');

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

async function setRoute(cdp, routeKey) {
  await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref(routeKey))};true`);
  await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(routeKey)}`);
}

function assertStaticBoundary() {
  assert.equal(ia.displayTerm('GLOBAL_INTERNATIONAL', 'Other / not classified'), 'Global international');
  assert.equal(ia.displayTerm('SYNTHETIC_FUTURE_ORIGIN', 'Other / not classified'), 'Synthetic future origin');
  assert.equal(ia.displayTerm('United Kingdom', 'Other / not classified'), 'United Kingdom');
  assert.equal(ia.displayTerm(null, 'Other / not classified'), 'Other / not classified');

  const displayStart = iaSource.indexOf('function displayTerm(');
  const narrativeStart = iaSource.indexOf('function publicNarrative(');
  const plainStart = iaSource.indexOf('function plainLabel(');
  assert(displayStart >= 0 && narrativeStart > displayStart && plainStart > narrativeStart, 'shared public label helpers are missing or reordered unexpectedly');
  const displayBlock = iaSource.slice(displayStart, narrativeStart);
  const narrativeBlock = iaSource.slice(narrativeStart, plainStart);
  assert.match(displayBlock, /if \(DISPLAY_TERMS\[raw\]\) return DISPLAY_TERMS\[raw\];/);
  assert.match(displayBlock, /return publicNarrative\(raw, fallback\);/);
  assert.match(narrativeBlock, /replace\(MACHINE_TOKEN_PATTERN, token => DISPLAY_TERMS\[token\] \|\| machineTokenLabel\(token\)\)/);
  assert.match(narrativeBlock, /replace\(ANY_MACHINE_TOKEN_PATTERN, token => machineTokenLabel\(token\)\)/);

  const sourcesStart = iaSource.indexOf('function SourcesDirectoryPage(');
  const sourcesEnd = iaSource.indexOf('function SourcesPage(', sourcesStart);
  assert(sourcesStart >= 0 && sourcesEnd > sourcesStart, 'SourcesDirectoryPage block is unavailable for static audit');
  const sourcesBlock = iaSource.slice(sourcesStart, sourcesEnd);
  assert.match(sourcesBlock, /const origin = firstText\(profile\.country, profile\.region\) \|\| 'Other \/ not classified';/);
  assert.match(sourcesBlock, /if \(!originMap\.has\(origin\)\) originMap\.set\(origin, new Map\(\)\);/);
  assert.match(sourcesBlock, /const outletMap = originMap\.get\(origin\);/);
  assert.match(sourcesBlock, /append\(origin, 'h3', '', displayTerm\(originName, 'Other \/ not classified'\)\)/);
  assert.doesNotMatch(sourcesBlock, /GLOBAL_INTERNATIONAL/);
  assert.match(sourcesBlock, /if \(profile\.outlet_type\) append\(meta, 'span', '', plainLabel\(profile\.outlet_type\)\);/);
  assert.match(sourcesBlock, /if \(profile\.state_affiliation\) append\(meta, 'span', '', publicNarrative\(profile\.state_affiliation\)\);/);
  assert.match(sourcesBlock, /if \(profile\.ownership_note\) append\(meta, 'span', '', publicNarrative\(profile\.ownership_note\)\);/);
  assert.match(sourcesBlock, /append\(card, 'h4', '', publicNarrative\(record\.title \|\| record\.publisher, source\.sourceId\)\);/);
  assert.match(sourcesBlock, /if \(record\.role\) append\(metaLine, 'span', '', publicNarrative\(record\.role\)\);/);
}

(async () => {
  assertStaticBoundary();

  const globalRows = model.sources.records.filter(source => {
    const profile = source.outlet_profile || {};
    return profile.country === 'GLOBAL_INTERNATIONAL' || profile.region === 'GLOBAL_INTERNATIONAL';
  });
  assert(globalRows.length > 0, 'GLOBAL_INTERNATIONAL fixture is absent from the current public source model');

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

    const live = await cdp.eval(`(() => {
      const main = document.querySelector('main');
      const summaries = [...main.querySelectorAll('.source-outlet > summary')];
      const firstSummary = summaries[0];
      if (firstSummary) firstSummary.focus();
      const publicSurface = [
        main.innerText,
        ...[...main.querySelectorAll('[aria-label], [title], summary, option, label')].flatMap(node => [
          node.getAttribute('aria-label') || '',
          node.getAttribute('title') || '',
          node.tagName === 'SUMMARY' || node.tagName === 'OPTION' || node.tagName === 'LABEL' ? node.textContent : ''
        ])
      ].join(' ');
      const search = main.querySelector('.source-controls input[type="search"]');
      search.value = 'GLOBAL_INTERNATIONAL';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const filteredCards = [...main.querySelectorAll('.source-card')];
      const filteredHeadings = [...main.querySelectorAll('.source-origin > h3')].map(node => node.textContent.trim());
      const filteredCount = main.querySelector('.filter-result-count')?.textContent.trim() || '';
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      return {
        hasRawVisible: (main.innerText || '').includes('GLOBAL_INTERNATIONAL'),
        hasHumanHeading: [...main.querySelectorAll('.source-origin > h3')].some(node => node.textContent.trim() === 'Global international'),
        publicSurfaceHasRaw: publicSurface.includes('GLOBAL_INTERNATIONAL'),
        disclosureCount: summaries.length,
        disclosureVisible: summaries.every(node => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden'),
        disclosureFocusable: !firstSummary || document.activeElement === firstSummary,
        filteredCards: filteredCards.length,
        filteredHeadings,
        filteredCount
      };
    })()`);
    assert.equal(live.hasRawVisible, false, 'GLOBAL_INTERNATIONAL remains visible on the live Sources route');
    assert.equal(live.hasHumanHeading, true, 'GLOBAL_INTERNATIONAL did not reach the generic public display boundary');
    assert.equal(live.publicSurfaceHasRaw, false, 'GLOBAL_INTERNATIONAL leaked into aria/title/summary/label text');
    assert(live.disclosureCount > 0 && live.disclosureVisible && live.disclosureFocusable, 'Sources disclosure summaries are not discoverable/focusable');
    assert.equal(live.filteredCards, globalRows.length, 'raw-origin search no longer returns the same source rows');
    assert(live.filteredHeadings.length > 0 && live.filteredHeadings.every(value => value === 'Global international'), 'raw-origin filtering changed origin grouping/presentation semantics');
    assert.match(live.filteredCount, new RegExp(`^${globalRows.length} of `));

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
        sourceId: raw.source_id,
        status: 'resolved',
        conflict: false,
        variants: [],
        selected: { record: { publisher: raw.outlet_profile.display_name, title: raw.outlet_profile.display_name + ' report', role: 'Reporting' } }
      }));
      const context = {
        documentObject: document,
        windowObject: window,
        route,
        model: { sources: { records: rawRecords }, datasets: {} },
        services: { sourceResolver: { catalog: () => catalog } },
        state: {}
      };
      const fixture = document.createElement('div');
      fixture.id = 'synthetic-source-humanization-fixture';
      fixture.append(Atlas.PAGE_OWNERS.SourcesPage(context));
      document.body.append(fixture);

      const snapshot = () => [...fixture.querySelectorAll('.source-origin')].map(section => ({
        heading: section.querySelector(':scope > h3')?.textContent.trim() || '',
        ids: [...section.querySelectorAll('.source-card')].map(card => card.dataset.sourceId)
      }));
      const initialGroups = snapshot();
      const syntheticGroups = initialGroups.filter(group => group.heading === 'Synthetic future origin');
      const humanGroup = initialGroups.find(group => group.heading === 'United Kingdom');
      const fallbackGroup = initialGroups.find(group => group.heading === 'Other / not classified');
      const summaries = [...fixture.querySelectorAll('.source-outlet > summary')];
      const firstSummary = summaries[0];
      if (firstSummary) firstSummary.focus();
      const surface = [
        fixture.innerText,
        ...[...fixture.querySelectorAll('[aria-label], [title], summary, option, label')].flatMap(node => [
          node.getAttribute('aria-label') || '',
          node.getAttribute('title') || '',
          node.tagName === 'SUMMARY' || node.tagName === 'OPTION' || node.tagName === 'LABEL' ? node.textContent : ''
        ])
      ].join(' ');
      const search = fixture.querySelector('.source-controls input[type="search"]');
      search.value = 'SYNTHETIC_FUTURE_ORIGIN';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const rawQuery = {
        cards: [...fixture.querySelectorAll('.source-card')].map(card => card.dataset.sourceId),
        headings: [...fixture.querySelectorAll('.source-origin > h3')].map(node => node.textContent.trim()),
        count: fixture.querySelector('.filter-result-count')?.textContent.trim() || ''
      };
      search.value = 'Readable Outlet';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const outletQuery = {
        cards: [...fixture.querySelectorAll('.source-card')].map(card => card.dataset.sourceId),
        headings: [...fixture.querySelectorAll('.source-origin > h3')].map(node => node.textContent.trim()),
        count: fixture.querySelector('.filter-result-count')?.textContent.trim() || ''
      };
      fixture.remove();
      return {
        initialGroups,
        syntheticGroups,
        humanGroup,
        fallbackGroup,
        rawQuery,
        outletQuery,
        disclosureCount: summaries.length,
        disclosureFocusable: !firstSummary || document.activeElement === firstSummary,
        rawLeak: surface.includes('SYNTHETIC_FUTURE_ORIGIN')
      };
    })()`);

    assert.equal(synthetic.syntheticGroups.length, 2, 'raw grouping keys were collapsed after display humanization');
    assert.deepEqual(synthetic.syntheticGroups.map(group => group.ids).sort((a, b) => a[0].localeCompare(b[0])), [['SYN-COLLISION'], ['SYN-ENUM']], 'synthetic raw origin keys no longer define separate groups');
    assert.deepEqual(synthetic.humanGroup && synthetic.humanGroup.ids, ['SYN-HUMAN'], 'already-readable origin label changed or regrouped');
    assert.deepEqual(synthetic.fallbackGroup && synthetic.fallbackGroup.ids, ['SYN-MISSING'], 'missing origin metadata no longer uses the accepted fallback group');
    assert.deepEqual(synthetic.rawQuery.cards, ['SYN-ENUM'], 'search by raw enum origin changed behavior');
    assert.deepEqual(synthetic.rawQuery.headings, ['Synthetic future origin'], 'synthetic enum-like origin did not use the generic display path');
    assert.equal(synthetic.rawQuery.count, '1 of 4 sources shown');
    assert.deepEqual(synthetic.outletQuery.cards, ['SYN-HUMAN'], 'outlet search behavior changed');
    assert.deepEqual(synthetic.outletQuery.headings, ['United Kingdom'], 'human-readable origin label changed during filtered rendering');
    assert.equal(synthetic.outletQuery.count, '1 of 4 sources shown');
    assert.equal(synthetic.disclosureCount, 4, 'synthetic source disclosures are missing');
    assert.equal(synthetic.disclosureFocusable, true, 'synthetic source disclosure summary is not keyboard focusable');
    assert.equal(synthetic.rawLeak, false, 'synthetic enum leaked into visible/aria/title/summary text');

    const wider = await cdp.eval(`(() => {
      const machine = /\\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\\b/g;
      const leaks = [];
      const surfaceFor = main => [
        main?.innerText || '',
        ...[...(main?.querySelectorAll('[aria-label], [title], option, summary') || [])].flatMap(node => [
          node.getAttribute('aria-label') || '', node.getAttribute('title') || '',
          node.tagName === 'OPTION' || node.tagName === 'SUMMARY' ? node.textContent : ''
        ])
      ].join(' ');
      return { machine: machine.source, leaks, surfaceFor: String(surfaceFor) };
    })()`);
    assert(wider.machine.includes('A-Za-z0-9'), 'wider runtime machine-token audit pattern was not constructed');

    assert.deepEqual(cdp.exceptions.filter(Boolean), [], 'uncaught runtime exception occurred during focused source humanization qualification');
    console.log(`browser public source humanization: PASS - live GLOBAL_INTERNATIONAL + synthetic enum + raw grouping/search + fallback + disclosure/accessibility boundaries verified at 390px`);
  } finally {
    try { await cdp.call('Emulation.clearDeviceMetricsOverride'); } catch (_) { /* browser cleanup handles a lost target */ }
    cdp.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
