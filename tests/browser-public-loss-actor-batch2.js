'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const model = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'public-current-state.json'), 'utf8'));
const expectedMaterialLossRecords = model.counts.material_loss_records;

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
      const comparison = document.querySelector('[data-loss-comparison="record-count-auditable"]');
      const comparisonDetails = [...(comparison?.querySelectorAll('[data-aggregation="record-count-only"]') || [])];
      return {
        stateCount: model.chronologyCount,
        cardCount: cards.length,
        uniqueIds: new Set(cards.map(card => card.dataset.lossId)).size,
        visibleCount: cards.filter(card => !card.hidden).length,
        unknownText: unknown?.innerText || '',
        damagedText: damaged?.innerText || '',
        comparisonText: comparison?.innerText || '',
        comparisonGroups: comparison?.querySelectorAll('[data-loss-summary-group]').length || 0,
        comparisonContributors: comparisonDetails.flatMap(node => (node.dataset.contributingRecordIds || '').split(',').filter(Boolean)).sort(),
        cardIds: cards.map(card => card.dataset.lossId).sort(),
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
    if (losses.cardCount !== expectedMaterialLossRecords) console.error('Loss page diagnostics:', losses, await cdp.eval(`({state:window.ATLAS_PUBLIC_STATE,text:document.querySelector('main')?.innerText||document.body.innerText})`));
    assert.equal(losses.stateCount, model.counts.chronology_records);
    assert.equal(losses.cardCount, expectedMaterialLossRecords);
    assert.equal(losses.uniqueIds, expectedMaterialLossRecords);
    assert.equal(losses.visibleCount, expectedMaterialLossRecords);
    assert.match(losses.unknownText, /Quantity:\s*unknown/i, 'unresolved quantity is not explicitly labeled unknown');
    assert.match(losses.unknownText, /Unknown does not mean zero/i, 'unknown-quantity guardrail is absent');
    assert.doesNotMatch(losses.unknownText, /Quantity:\s*0(?:\D|$)/i, 'unresolved quantity was rendered as numeric zero');
    assert(losses.comparisonGroups >= 3, 'reader loss comparison collapsed actor/commercial grouping');
    assert.deepEqual(losses.comparisonContributors, losses.cardIds, 'reader loss comparison does not reconcile exactly to canonical material-loss records');
    assert.match(losses.comparisonText, /count material-loss records|count canonical material-loss records/i, 'reader loss comparison does not state its record-count denominator');
    assert.match(losses.comparisonText, /Unknown does not mean zero|unknown quantities/i, 'reader loss comparison permits unknown-to-zero semantics');
    assert.match(losses.damagedText, /Damaged/);
    assert(!/\bDestroyed\b/.test(losses.damagedText), 'damaged record was relabeled destroyed');
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
    assert.equal(filtered.before, expectedMaterialLossRecords);
    assert.equal(filtered.after, expectedMaterialLossRecords, 'filter deleted underlying loss records');
    assert(filtered.visible > 0 && filtered.visible < expectedMaterialLossRecords);
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
      lossCrosslink: [...document.querySelectorAll('a.inline-route-link')].some(node => node.getAttribute('href') === '#/military/losses'),
      text: document.querySelector('main')?.innerText || ''
    }))()`);
    assert.equal(weapons.durable, 0, 'Weapons duplicates the material-loss inventory instead of linking to its canonical reader view');
    assert.equal(weapons.metrics, 2);
    assert.equal(weapons.expenditures, 9);
    assert.equal(weapons.aviation, 0, 'Weapons duplicates the aviation incident inventory instead of linking to the loss page');
    assert.equal(weapons.lossCrosslink, true, 'Weapons does not link readers to the canonical Casualties & Losses inventory');
    assert.match(weapons.text, /Neutralized does not mean destroyed/);
    assert.match(weapons.text, /route-level aggregate.*interception.*impact.*known-target hit/i);

    for (const width of [320, 390]) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: true });
      await route(cdp, '#/military/losses', 'military.losses');
      const mobile = await cdp.eval(`(() => ({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,filters:[...document.querySelectorAll('[data-loss-filter]')].map(node => node.getBoundingClientRect().height),cards:document.querySelectorAll('[data-loss-id]').length}))()`);
      assert.equal(mobile.cards, expectedMaterialLossRecords);
      assert(mobile.scrollWidth <= mobile.width, `loss page overflows at ${width}px`);
      assert(mobile.filters.every(height => height >= 44), `loss filter target below 44px at ${width}px`);
    }
    await cdp.call('Emulation.clearDeviceMetricsOverride');

    const flagResources = await cdp.eval(`performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /state-flag-/.test(name))`);
    assert(flagResources.length > 0);
    assert(flagResources.every(url => new URL(url).origin === new URL(SITE).origin && /assets\/releases\/state-flag-[a-z]{2}\.[a-f0-9]{64}\.svg$/.test(new URL(url).pathname)), 'flag loading escaped the same-origin content-addressed release');

    console.log('browser public losses/actors Batch 2: PASS - canonical material-loss reconciliation, unknown preservation, filters, 115-identity directory, signed flags, non-state semantics, de-duplicated Weapons linkage, and 320/390px rendering verified');
  } finally {
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
