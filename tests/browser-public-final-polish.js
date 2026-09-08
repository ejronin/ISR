'use strict';

const assert = require('node:assert/strict');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const WIDTHS = [1440, 768, 390, 320];
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('CDP open timeout')), 10000); this.ws.onopen = () => { clearTimeout(timer); resolve(); }; this.ws.onerror = () => reject(new Error('CDP websocket error')); });
    this.ws.onmessage = event => { const message = JSON.parse(String(event.data)); if (!message.id || !this.pending.has(message.id)) return; const pending = this.pending.get(message.id); this.pending.delete(message.id); message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result || {}); };
  }
  call(method, params = {}) { const id = ++this.id; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) { const out = await this.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }); if (out.exceptionDetails) throw new Error(out.exceptionDetails.text || 'Runtime exception'); return out.result && out.result.value; }
  close() { if (this.ws) this.ws.close(); }
}

async function waitFor(cdp, expression, timeout = 30000) { const started = Date.now(); while (Date.now() - started < timeout) { try { if (await cdp.eval(expression)) return; } catch (_) {} await sleep(75); } throw new Error(`timeout: ${expression}`); }
async function route(cdp, routeKey) { await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref(routeKey))};scrollTo(0,0);true`); await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(routeKey)}`); await sleep(120); }

(async () => {
  const targets = await (await fetch(`${DEBUG}/json`)).json(); const target = targets.find(item => item.type === 'page'); assert(target && target.webSocketDebuggerUrl, 'Atlas browser target missing');
  const cdp = new CDP(target.webSocketDebuggerUrl); await cdp.open();
  try {
    await cdp.call('Runtime.enable'); await cdp.call('Page.enable');
    await cdp.call('Page.navigate', { url: `${SITE}#/start/overview` }); await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready'`);
    for (const width of WIDTHS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
      await route(cdp, 'start.overview');
      const start = await cdp.eval(`(() => {
        const article = document.querySelector('.overview-page'); const current = article?.querySelector('[data-current-state-summary]'); const clocks = article?.querySelector('.evidence-clock-bar'); const historical = article?.querySelector('.historical-orientation');
        const domains = [...(current?.querySelectorAll('[data-orientation-domain]') || [])].map(card => ({ domain: card.dataset.orientationDomain, href: card.querySelector('.orientation-actions a')?.getAttribute('href') || '', height: card.querySelector('.orientation-actions a')?.getBoundingClientRect().height || 0 }));
        const desktop = clocks?.querySelector('.evidence-clock-desktop'); const mobile = clocks?.querySelector('.evidence-clock-mobile');
        const position = node => node ? [...article.children].indexOf(node) : -1;
        const focusTarget = current?.querySelector('.orientation-actions a'); focusTarget?.focus(); const focusStyle = focusTarget ? getComputedStyle(focusTarget) : null;
        return { currentIndex: position(current), clockIndex: position(clocks), historicalIndex: position(historical), domains, desktopDisplay: desktop ? getComputedStyle(desktop).display : '', mobileDisplay: mobile ? getComputedStyle(mobile).display : '', focusOutline: focusStyle?.outlineStyle || '', gated: Boolean(article?.querySelector('[data-war-in-90-seconds], [data-objective-orientation], [data-us-war-rationale]')) };
      })()`);
      assert.equal(start.domains.length, 4, `Start Here does not expose four current-state domains at ${width}px`);
      assert.deepEqual(start.domains.map(item => item.domain).sort(), ['diplomacy', 'economy', 'hormuz', 'military']);
      assert(start.currentIndex >= 0 && start.clockIndex > start.currentIndex && start.historicalIndex > start.clockIndex, `Start Here order is not current state -> evidence -> historical orientation at ${width}px`);
      assert(start.domains.every(item => /^#\//.test(item.href)), `Start Here drill-down link is unresolved at ${width}px`);
      if (width <= 390) assert(start.domains.every(item => item.height >= 43.5), `Start Here touch target below 44px at ${width}px`);
      assert.notEqual(start.focusOutline, 'none', `focused Start Here action loses visible focus at ${width}px`);
      assert.equal(start.gated, false, 'content-gated narrative module was rendered before approval');
      if (width <= 600) { assert.notEqual(start.mobileDisplay, 'none', `mobile evidence summary hidden at ${width}px`); assert.equal(start.desktopDisplay, 'none', `desktop evidence clocks remain visible at ${width}px`); const expanded = await cdp.eval(`(() => { const d=document.querySelector('.evidence-clock-mobile'); d.open=true; return { labels:[...d.querySelectorAll('.evidence-clock-item strong')].map(n=>n.textContent.trim()), summary:d.querySelector('summary')?.textContent||'' }; })()`); assert(expanded.labels.includes('Current evidence cutoff') && expanded.labels.includes('Frozen review cutoff'), `mobile evidence details lost cutoff definitions at ${width}px`); assert(/Evidence through/.test(expanded.summary) && /Historical review/.test(expanded.summary), `mobile evidence summary is not compact/data-derived at ${width}px`); }
      else { assert.notEqual(start.desktopDisplay, 'none', `desktop evidence clocks hidden at ${width}px`); assert.equal(start.mobileDisplay, 'none', `mobile evidence disclosure visible at ${width}px`); }

      await route(cdp, 'talks.overview');
      const talks = await cdp.eval(`(() => { const article=document.querySelector('.public-page'); const current=article?.querySelector('[data-diplomatic-state="current"]'); const wartime=article?.querySelector('[data-agreement-group="wartime"]'); const historical=article?.querySelector('[data-agreement-group="historical"]'); const sequence=article?.querySelector('[data-diplomatic-state="sequence"]'); const order=node=>node?[...article.children].indexOf(node):-1; const ids=[...article.querySelectorAll('[data-agreement-id]')].map(n=>n.dataset.agreementId); return { order:[order(current),order(wartime),order(historical),order(sequence)], ids, unique:new Set(ids).size, wartimeCount:wartime?.querySelectorAll('[data-agreement-id]').length||0, historicalCount:historical?.querySelectorAll('[data-agreement-id]').length||0 }; })()`);
      assert(talks.order.every((value, index, rows) => value >= 0 && (index === 0 || value > rows[index - 1])), `Talks grouping order is wrong at ${width}px`);
      assert.equal(talks.ids.length, talks.unique, `an agreement appears in more than one Talks group at ${width}px`);
      assert.equal(talks.ids.length, talks.wartimeCount + talks.historicalCount, `Talks grouping dropped an agreement at ${width}px`);

      await route(cdp, 'hormuz.shipping');
      const shipping = await cdp.eval(`(() => { const choke=document.querySelector('[data-shipping-map-view="chokepoint"]'); const notice=choke?.querySelector('[data-state-notice="no-geolocated-records"]'); const summary=document.querySelector('[data-shipping-map-system] .meaning-first-summary')?.textContent||''; return { notice:Boolean(notice), message:notice?.querySelector('.state-notice-message')?.textContent||'', accounting:notice?.querySelector('.state-notice-accounting')?.textContent||'', summary }; })()`);
      assert(/strategic transport corridor/.test(shipping.summary), `Shipping does not lead with reader meaning at ${width}px`);
      if (shipping.notice) { assert(/geographic context/i.test(shipping.message), `Shipping zero state lacks meaning-first text at ${width}px`); assert(/: 0$/.test(shipping.accounting.trim()), `Shipping zero state lost exact accounting value at ${width}px`); }

      if (width <= 390) {
        await route(cdp, 'talks.mou');
        const mou = await cdp.eval(`(() => { const current=document.querySelector('.agreement-current-balance'); const states=[...document.querySelectorAll('.agreement-state')]; return { currentSize:current?parseFloat(getComputedStyle(current).fontSize):0, visibleTiny:states.filter(n=>getComputedStyle(n).fontSize!=='0px' && parseFloat(getComputedStyle(n).fontSize)<11.5).length }; })()`);
        assert(mou.currentSize >= 11.5, `MOU selected balance is sub-readable at ${width}px`); assert.equal(mou.visibleTiny, 0, `MOU compact track exposes sub-readable state labels at ${width}px`);
        await route(cdp, 'timeline.war');
        const controlFloor = await cdp.eval(`Math.min(...[...document.querySelectorAll('.timeline-controls input,.timeline-controls select,.timeline-navigation button')].map(n=>n.getBoundingClientRect().height).filter(Boolean))`);
        assert(controlFloor >= 43.5, `Timeline touch control below 44px at ${width}px`);
      }
    }
    await cdp.call('Emulation.clearDeviceMetricsOverride');
    console.log('browser public final polish: PASS - Start Here discoverability, compact evidence status, Talks grouping, semantic Shipping state, mobile readability and touch/focus behavior verified');
  } finally { try { await cdp.call('Browser.close'); } catch (_) {} cdp.close(); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
