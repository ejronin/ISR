'use strict';

const assert = require('node:assert/strict');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const WIDTHS = [1440, 1024, 768, 390, 320];
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
        const article = document.querySelector('.overview-page');
        const current = article?.querySelector('[data-current-state-summary]');
        const clocks = article?.querySelector('.evidence-clock-bar');
        const narratives = article?.querySelector('[data-narrative-gates]');
        const historical = article?.querySelector('.historical-orientation');
        const war = narratives?.querySelector('[data-war-in-90-seconds]');
        const objectives = narratives?.querySelector('[data-objective-orientation]');
        const rationale = narratives?.querySelector('[data-us-war-rationale]');
        const hormuz = narratives?.querySelector('[data-hormuz-trajectory]');
        const domains = [...(current?.querySelectorAll('[data-orientation-domain]') || [])].map(card => ({ domain: card.dataset.orientationDomain, href: card.querySelector('.orientation-actions a')?.getAttribute('href') || '', height: card.querySelector('.orientation-actions a')?.getBoundingClientRect().height || 0 }));
        const desktop = clocks?.querySelector('.evidence-clock-desktop'); const mobile = clocks?.querySelector('.evidence-clock-mobile');
        const position = node => node ? [...article.children].indexOf(node) : -1;
        const focusTarget = current?.querySelector('.orientation-actions a'); focusTarget?.focus(); const focusStyle = focusTarget ? getComputedStyle(focusTarget) : null;
        const actorStages = [...(objectives?.querySelectorAll('[data-objective-actor]') || [])].map(actor => ({ actor: actor.dataset.objectiveActor, stages: [...actor.querySelectorAll('[data-objective-stage]')].map(stage => stage.dataset.objectiveStage) }));
        const rationaleKinds = [...(rationale?.querySelectorAll('[data-rationale-kind]') || [])].map(node => node.dataset.rationaleKind);
        const hormuzStages = [...(hormuz?.querySelectorAll('[data-hormuz-stage]') || [])].map(node => node.dataset.hormuzStage);
        const gateNodes = narratives ? [...narratives.querySelectorAll('[data-narrative-gate]')] : [];
        const viewportOverflow = gateNodes.some(node => { const rect=node.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1; });
        return {
          currentIndex: position(current), clockIndex: position(clocks), narrativeIndex: position(narratives), historicalIndex: position(historical),
          domains, desktopDisplay: desktop ? getComputedStyle(desktop).display : '', mobileDisplay: mobile ? getComputedStyle(mobile).display : '', focusOutline: focusStyle?.outlineStyle || '',
          narrativeSections: gateNodes.length,
          warMilestones: war?.querySelectorAll('[data-war-milestone]').length || 0,
          warMilestoneBodies: [...(war?.querySelectorAll('[data-war-milestone] > .step-body') || [])].map(node => node.getBoundingClientRect().width),
          warDisclaimer: war?.querySelector('.section-note')?.textContent || '',
          actorStages,
          rationaleKinds,
          rationaleTitle: rationale?.querySelector('h2')?.textContent || '',
          rationaleText: rationale?.textContent || '',
          hormuzStages,
          hormuzText: hormuz?.textContent || '',
          viewportOverflow
        };
      })()`);
      assert.equal(start.domains.length, 4, `Start Here does not expose four current-state domains at ${width}px`);
      assert.deepEqual(start.domains.map(item => item.domain).sort(), ['diplomacy', 'economy', 'hormuz', 'military']);
      assert(start.currentIndex >= 0 && start.clockIndex > start.currentIndex && start.narrativeIndex > start.clockIndex && start.historicalIndex > start.narrativeIndex, `Start Here order is not current state -> evidence -> cleared narratives -> historical orientation at ${width}px`);
      assert(start.domains.every(item => /^#\//.test(item.href)), `Start Here drill-down link is unresolved at ${width}px`);
      if (width <= 390) assert(start.domains.every(item => item.height >= 43.5), `Start Here touch target below 44px at ${width}px`);
      assert.notEqual(start.focusOutline, 'none', `focused Start Here action loses visible focus at ${width}px`);
      assert.equal(start.narrativeSections, 4, `Start Here does not expose all four cleared narrative modules at ${width}px`);
      assert.equal(start.warMilestones, 8, `War in 90 Seconds does not contain exactly eight milestones at ${width}px`);
      assert.equal(start.warMilestoneBodies.length, 8, `War in 90 Seconds milestone content is not contained by the story-step body at ${width}px`);
      if (width <= 390) assert(Math.min(...start.warMilestoneBodies) >= 180, `War in 90 Seconds milestone body is squeezed below a readable mobile width at ${width}px`);
      assert(/not a ranking of strategic importance/i.test(start.warDisclaimer), `War in 90 Seconds lost its non-ranking disclaimer at ${width}px`);
      assert.deepEqual(start.actorStages.map(item => item.actor).sort(), ['iran', 'us-coalition'], `objective orientation actor set changed at ${width}px`);
      assert(start.actorStages.every(item => item.stages.join('|') === 'original-public-benchmark|record-shows|current-position'), `objective orientation three-stage structure changed at ${width}px`);
      assert.deepEqual(start.rationaleKinds.sort(), ['atlas-assessment', 'campaign-objectives', 'diplomatic-record', 'expected-retaliation', 'intelligence-predicate', 'strategic-regional'].sort(), `U.S. entry rationale taxonomy collapsed at ${width}px`);
      assert.equal(start.rationaleTitle, 'Why the U.S. said it entered the war', `U.S. entry module title changed at ${width}px`);
      assert(!/Why the war began/.test(start.rationaleText), `U.S. entry module became an omniscient war-cause explanation at ${width}px`);
      assert.deepEqual(start.hormuzStages, ['then', 'development', 'now'], `Hormuz trajectory stages changed at ${width}px`);
      assert(/60-day interim no-charge period/.test(start.hormuzText), `Hormuz trajectory lost the 60-day interim no-charge boundary at ${width}px`);
      assert(/recognized exclusive control is not established/.test(start.hormuzText), `Hormuz trajectory lost the recognized-control boundary at ${width}px`);
      assert(/proposal, not an agreement/.test(start.hormuzText), `Hormuz trajectory lost proposal-not-agreement status at ${width}px`);
      assert.equal(start.viewportOverflow, false, `cleared narrative module escapes its viewport at ${width}px`);
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
    console.log('browser public final polish: PASS - Start Here current-state/evidence/narrative hierarchy, cleared Gates A-D, compact evidence status, Talks grouping, semantic Shipping state and responsive interaction behavior verified');
  } finally { try { await cdp.call('Emulation.clearDeviceMetricsOverride'); } catch (_) {} cdp.close(); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
