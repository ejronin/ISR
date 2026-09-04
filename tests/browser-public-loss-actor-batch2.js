'use strict';
const assert = require('node:assert/strict');

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
    try { const value = await cdp.eval(expression); if (value) return value; } catch (_) { /* navigation may replace context */ }
    await sleep(75);
  }
  throw new Error(`timeout: ${expression}`);
}

async function route(cdp, hash, key) {
  await cdp.eval(`location.hash=${JSON.stringify(hash)};true`);
  await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(key)}`);
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
    await cdp.call('Network.enable');
    await cdp.call('Page.navigate', { url: `${SITE}#/military/losses` });
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === 'military.losses'`);
    await waitFor(cdp, `[...document.querySelectorAll('img.actor-flag')].every(image => image.complete)`);

    const losses = await cdp.eval(`(() => {
      const cards = [...document.querySelectorAll('[data-loss-id]')];
      const model = window.ATLAS_PUBLIC_STATE;
      const unknown = cards.find(card => card.dataset.lossId === 'MAT-USA-ALISALEM-AD');
      const damaged = cards.find(card => card.dataset.lossPhysical === 'damaged');
      return {
        stateCount: model.chronologyCount,
        cardCount: cards.length,
        uniqueIds: new Set(cards.map(card => card.dataset.lossId)).size,
        visibleCount: cards.filter(card => !card.hidden).length,
        unknownText: unknown?.innerText || '',
        damagedText: damaged?.innerText || '',
        visualizations: [...document.querySelectorAll('[data-loss-visualization]')].map(node => node.dataset.lossVisualization),
        chartEquivalents: document.querySelectorAll('[data-phase5-chart-equivalent] table').length,
        assets: document.querySelectorAll('[data-asset-category-id]').length,
        envelopes: document.querySelectorAll('[data-envelope-category]').length,
        leaders: document.querySelectorAll('[data-leadership-id]').length,
        aviation: document.querySelectorAll('[data-aviation-id]').length,
        pilot: document.querySelectorAll('[data-pilot-rescue-id]').length,
        flagImages: [...document.querySelectorAll('img.actor-flag')].map(image => ({src:image.src,alt:image.alt,complete:image.complete,width:image.naturalWidth})),
        unresolvedActorNames: [...document.querySelectorAll('[data-loss-id] [data-actor-name]')].filter(node => !node.dataset.actorName).length,
        commercial: document.querySelectorAll('[data-loss-group="commercial"] [data-loss-id]').length,
        military: document.querySelectorAll('[data-loss-group="military"] [data-loss-id]').length,
        sourceDrawers: document.querySelectorAll('[data-loss-id] details.evidence-drawer').length
      };
    })()`);
    if (losses.cardCount !== 52) console.error('Loss page diagnostics:', losses, await cdp.eval(`({state:window.ATLAS_PUBLIC_STATE,text:document.querySelector('main')?.innerText||document.body.innerText})`));
    assert.equal(losses.stateCount, 205);
    assert.equal(losses.cardCount, 52);
    assert.equal(losses.uniqueIds, 52);
    assert.equal(losses.visibleCount, 52);
    assert.match(losses.unknownText, /Unknown quantity/);
    assert.match(losses.unknownText, /Unknown; not zero/);
    assert.match(losses.damagedText, /Damaged/);
    assert(!/\bDestroyed\b/.test(losses.damagedText), 'damaged record was relabeled destroyed');
    assert.deepEqual(new Set(losses.visualizations), new Set(['physical-state-record-counts', 'accounting-class-record-counts']));
    assert(losses.chartEquivalents >= 2, 'loss charts lack numeric equivalents');
    assert.equal(losses.assets, 10);
    assert.equal(losses.envelopes, 9);
    assert.equal(losses.leaders, 11);
    assert.equal(losses.aviation, 4);
    assert.equal(losses.pilot, 14);
    assert(losses.commercial > 0 && losses.military > 0, 'commercial and military ledgers were collapsed');
    assert(losses.sourceDrawers > 0, 'loss source access is absent');
    assert.equal(losses.unresolvedActorNames, 0);
    assert(losses.flagImages.length > 0 && losses.flagImages.every(flag => flag.src.startsWith(SITE) && /state-flag-[a-z]{2}\.[a-f0-9]{64}\.svg$/.test(flag.src) && flag.alt.endsWith(' flag') && flag.complete && flag.width > 0), 'deterministic same-origin state flags did not decode');

    const filtered = await cdp.eval(`(() => {
      const select = document.querySelector('[data-loss-filter="service"]');
      const before = document.querySelectorAll('[data-loss-id]').length;
      select.value = [...select.options].find(option => option.value)?.value || '';
      select.focus();
      select.dispatchEvent(new Event('change', {bubbles:true}));
      return {before, after:document.querySelectorAll('[data-loss-id]').length, visible:[...document.querySelectorAll('[data-loss-id]')].filter(card => !card.hidden).length, focused:document.activeElement === select, height:select.getBoundingClientRect().height};
    })()`);
    assert.equal(filtered.before, 52);
    assert.equal(filtered.after, 52, 'filter deleted underlying loss records');
    assert(filtered.visible > 0 && filtered.visible < 52);
    assert.equal(filtered.focused, true);
    assert(filtered.height >= 44);

    await route(cdp, '#/start/actors', 'start.actors');
    await waitFor(cdp, `[...document.querySelectorAll('img.actor-flag')].every(image => image.complete)`);
    const actors = await cdp.eval(`(() => {
      const required = ['ACT-SAUDI-ARABIA','ACT-BAHRAIN','ACT-KUWAIT','ACT-QATAR','ACT-JORDAN','ACT-YEMEN-PLC','ACT-EGYPT','ACT-SUDAN','ACT-DJIBOUTI','ACT-SOMALIA','ACT-NIGERIA','ACT-TURKIYE','ACT-PAKISTAN','ACT-BANGLADESH'];
      const card = id => document.querySelector('[data-actor-id="'+id+'"]');
      const named = name => document.querySelector('[data-actor-name="'+name+'"]');
      return {
        total: document.querySelectorAll('[data-actor-id]').length,
        allRequired: required.every(id => card(id)),
        hezbollahFlag: Boolean(named('Hezbollah')?.querySelector('img.actor-flag')),
        houthiFlag: Boolean(named('Houthis / Ansar Allah')?.querySelector('img.actor-flag')),
        irgcFlag: named('IRGC')?.querySelector('img.actor-flag')?.alt || '',
        iranFlag: named('Iran')?.querySelector('img.actor-flag')?.alt || '',
        text: document.querySelector('main')?.innerText || ''
      };
    })()`);
    assert.equal(actors.total, 115);
    assert.equal(actors.allRequired, true);
    assert.equal(actors.hezbollahFlag, false);
    assert.equal(actors.houthiFlag, false);
    assert.equal(actors.irgcFlag, 'Iran flag');
    assert.equal(actors.iranFlag, 'Iran flag');
    assert(!/founding signator/i.test(actors.text));

    await route(cdp, '#/military/weapons', 'military.weapons');
    const weapons = await cdp.eval(`(() => ({
      durable: document.querySelectorAll('[data-weapon-loss-id]').length,
      metrics: document.querySelectorAll('[data-weapon-metric-id]').length,
      expenditures: document.querySelectorAll('[data-expenditure-id]').length,
      aviation: document.querySelectorAll('[data-aviation-id]').length,
      text: document.querySelector('main')?.innerText || ''
    }))()`);
    assert(weapons.durable > 0, 'Weapons does not meaningfully consume current material losses');
    assert.equal(weapons.metrics, 2);
    assert.equal(weapons.expenditures, 9);
    assert.equal(weapons.aviation, 4);
    assert.match(weapons.text, /Neutralized does not mean destroyed/);
    assert.match(weapons.text, /No route-level interception, impact or known-target-hit aggregate/);

    for (const width of [320, 390]) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: true });
      await route(cdp, '#/military/losses', 'military.losses');
      const mobile = await cdp.eval(`(() => ({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,filters:[...document.querySelectorAll('[data-loss-filter]')].map(node => node.getBoundingClientRect().height),cards:document.querySelectorAll('[data-loss-id]').length}))()`);
      assert.equal(mobile.cards, 52);
      assert(mobile.scrollWidth <= mobile.width, `loss page overflows at ${width}px`);
      assert(mobile.filters.every(height => height >= 44), `loss filter target below 44px at ${width}px`);
    }
    await cdp.call('Emulation.clearDeviceMetricsOverride');

    const flagResources = await cdp.eval(`performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /state-flag-/.test(name))`);
    assert(flagResources.length > 0);
    assert(flagResources.every(url => new URL(url).origin === new URL(SITE).origin && /assets\/releases\/state-flag-[a-z]{2}\.[a-f0-9]{64}\.svg$/.test(new URL(url).pathname)), 'flag loading escaped the same-origin content-addressed release');

    console.log('browser public losses/actors Batch 2: PASS - complete 52-record ledger, filters, two accessible charts, approved detail consumers, 115-identity directory, signed flags, non-state semantics, Weapons linkage, and 320/390px rendering verified');
  } finally {
    try { await cdp.call('Browser.close'); } catch (_) { /* workflow cleanup remains the fallback */ }
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
