'use strict';
const assert = require('node:assert/strict');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class CDP {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
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
    try {
      const value = await cdp.eval(expression);
      if (value) return value;
    } catch (_) { /* navigation may replace the execution context */ }
    await sleep(75);
  }
  throw new Error(`timeout: ${expression}`);
}

async function setRoute(cdp, route) {
  await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref(route.key))};true`);
  await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(route.key)}`);
  return cdp.eval(`(() => ({
    routeKey: window.ATLAS_PUBLIC_STATE.routeKey,
    owner: document.querySelector('[data-page-owner]')?.dataset.pageOwner,
    h1: [...document.querySelectorAll('main h1')].map(node => node.textContent.trim()),
    machineTokens: ['CURRENT_OVERLAY','HISTORICAL_RECONCILIATION','NOT_YET_ADJUDICABLE'].filter(token => document.body.innerText.includes(token)),
    currentSecondary: document.querySelector('.secondary-nav a[aria-current="page"]')?.textContent.trim()
  }))()`);
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
    await cdp.call('Network.setCacheDisabled', { cacheDisabled: true });

    await cdp.call('Page.navigate', { url: `${SITE}#/military/facilities` });
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === 'military.facilities'`);
    const direct = await cdp.eval(`(() => ({
      owner: document.querySelector('[data-page-owner]')?.dataset.pageOwner,
      h1: document.querySelector('main h1')?.textContent.trim(),
      navs: [...document.querySelectorAll('nav')].map(nav => nav.getAttribute('aria-label')),
      tabs: document.querySelectorAll('[role="tab"], [role="tablist"]').length,
      skipTag: document.querySelector('.skip-link')?.tagName,
      skipHref: document.querySelector('.skip-link')?.getAttribute('href'),
      scripts: performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /\.js(?:[?#]|$)/.test(name)),
      oldGlobals: [
        window.ATLAS_CURRENT_UPDATE,
        window.ATLAS_CURRENT_UPDATE_20260825,
        window.ATLAS_CURRENT_UPDATE_20260825_LATE,
        window.ATLAS_CURRENT_UPDATE_20260826,
        window.ATLAS_WIKI_RECON_20260826,
        window.ATLAS_CURRENT_UPDATE_20260827
      ].some(Boolean)
    }))()`);
    assert.equal(direct.owner, 'FacilitiesPage');
    assert.equal(direct.h1, 'Bases & Infrastructure');
    assert(direct.navs.includes('Primary'));
    assert(direct.navs.includes('Military Record pages'));
    assert.equal(direct.tabs, 0, 'global navigation must not use tab semantics');
    assert.equal(direct.skipTag, 'BUTTON', 'skip control must not enter the hash-router namespace');
    assert.equal(direct.skipHref, null, 'skip control must not create a fragment route');
    assert.equal(direct.oldGlobals, false);
    assert(!direct.scripts.some(url => /current-update|wiki-map-reconciliation|public-housekeeping|status-identity|js\/app\.js/.test(url)), 'legacy renderer entered Phase 3 navigation');

    await cdp.eval(`document.querySelector('.skip-link').focus();true`);
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await waitFor(cdp, `document.activeElement === document.getElementById('main-content')`);
    const skipped = await cdp.eval(`(() => ({
      hash: location.hash,
      routeKey: window.ATLAS_PUBLIC_STATE.routeKey,
      owner: document.querySelector('[data-page-owner]')?.dataset.pageOwner,
      mainFocused: document.activeElement === document.getElementById('main-content')
    }))()`);
    assert.equal(skipped.hash, '#/military/facilities');
    assert.equal(skipped.routeKey, 'military.facilities');
    assert.equal(skipped.owner, 'FacilitiesPage');
    assert.equal(skipped.mainFocused, true);

    for (const route of ia.ROUTES.values()) {
      const view = await setRoute(cdp, route);
      assert.equal(view.routeKey, route.key);
      assert.equal(view.owner, route.owner, `wrong owner for ${route.key}`);
      assert.deepEqual(view.h1, [route.title], `heading structure failed for ${route.key}`);
      assert.deepEqual(view.machineTokens, [], `machine token exposed by ${route.key}`);
      assert.equal(view.currentSecondary, route.label, `secondary location not obvious for ${route.key}`);
    }

    await setRoute(cdp, ia.ROUTES.get('start.overview'));
    const overview = await cdp.eval(`(() => ({
      text: document.querySelector('main')?.innerText || '',
      pathways: document.querySelectorAll('.pathway-card').length,
      latest: document.querySelectorAll('.compact-record-list .chronology-card').length,
      metrics: document.querySelectorAll('.metric-card').length
    }))()`);
    assert.match(overview.text, /What happened\?/);
    assert.match(overview.text, /Where things stand now/);
    assert.match(overview.text, /What should I look at next\?/);
    assert.match(overview.text, /The June MOU no longer controls either side/);
    assert.equal(overview.pathways, 6);
    assert.equal(overview.latest, 3);
    assert(overview.metrics >= 4);

    await setRoute(cdp, ia.ROUTES.get('timeline.war'));
    const timeline = await cdp.eval(`(() => ({
      phases: document.querySelectorAll('.timeline-phase').length,
      cards: document.querySelectorAll('.timeline-phase .chronology-card').length,
      maps: document.querySelectorAll('.timeline-phase [data-component="MapView"] svg').length,
      text: document.querySelector('main')?.innerText || ''
    }))()`);
    const expectedTimelineCount = await cdp.eval(`window.ATLAS_PUBLIC_MODEL.counts.chronology_records`);
    assert.equal(timeline.phases, 6);
    assert(timeline.cards > 10 && timeline.cards < expectedTimelineCount, 'primary timeline must emphasize representative developments');
    assert(timeline.maps > 0, 'timeline phases with coordinates must expose spatial context');
    assert(timeline.text.includes(`Detailed Chronology retains all ${expectedTimelineCount} records.`), 'timeline copy does not match the current model count');

    const changedModelTimeline = await cdp.eval(`(() => {
      const model = structuredClone(window.ATLAS_PUBLIC_MODEL);
      model.counts.chronology_records += 1;
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;';
      document.body.append(host);
      const testWindow = {
        location: { hash: '#/timeline/war' },
        history: { replaceState() {} },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {},
        CustomEvent: window.CustomEvent
      };
      const controller = window.AtlasPublicIA.mount({
        rootElement: host,
        model,
        state: {},
        documentObject: document,
        windowObject: testWindow
      });
      const text = host.querySelector('.page-host')?.innerText || '';
      controller.destroy();
      host.remove();
      return { count: model.counts.chronology_records, text };
    })()`);
    assert(
      changedModelTimeline.text.includes(`Detailed Chronology retains all ${changedModelTimeline.count} records.`),
      `timeline copy does not advance when the supplied model count changes: ${JSON.stringify(changedModelTimeline)}`
    );

    await setRoute(cdp, ia.ROUTES.get('timeline.war'));
    await cdp.eval('history.back();true');
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.routeKey === 'start.overview'`);
    await cdp.eval('history.forward();true');
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.routeKey === 'timeline.war'`);

    await setRoute(cdp, ia.ROUTES.get('start.actors'));
    const actors = await cdp.eval(`(() => ({
      hezbollahFlag: document.querySelector('[data-actor-kind="non-state"] .actor-flag')?.textContent || '',
      houthiFlag: document.querySelector('[data-actor-affiliation="Houthis / Ansar Allah"] .actor-flag')?.textContent || '',
      stateFlag: document.querySelector('[data-actor-kind="state"] .actor-flag')?.textContent || '',
      qalibaf: (() => {
        const node = document.querySelector('[data-actor-name="Mohammad Baqer Qalibaf"]');
        return node && {
          entityType: node.dataset.actorEntityType,
          role: node.dataset.actorRole,
          affiliation: node.dataset.actorAffiliation,
          affiliationType: node.dataset.actorAffiliationType,
          parentState: node.dataset.actorParentState,
          flag: node.querySelector('.actor-flag')?.textContent || '',
          subtitle: node.querySelector('.actor-subtitle')?.textContent || ''
        };
      })(),
      parliament: (() => {
        const node = document.querySelector('[data-actor-name="Iranian parliament"]');
        return node && {
          entityType: node.dataset.actorEntityType,
          affiliationType: node.dataset.actorAffiliationType,
          parentState: node.dataset.actorParentState,
          flag: node.querySelector('.actor-flag')?.textContent || ''
        };
      })()
    }))()`);
    assert.equal(actors.hezbollahFlag, '', 'non-state actor must not receive a host-country flag');
    assert.equal(actors.houthiFlag, '', 'Houthi actor must not receive a Yemeni state flag');
    assert(actors.stateFlag, 'state actors should retain their state identity');
    assert.deepEqual(actors.qalibaf, {
      entityType: 'person',
      role: 'Parliament speaker',
      affiliation: 'Iranian parliament',
      affiliationType: 'state-institution',
      parentState: 'Iran',
      flag: '🇮🇷',
      subtitle: 'Parliament speaker · Iranian parliament'
    });
    assert.deepEqual(actors.parliament, {
      entityType: 'entity',
      affiliationType: 'state-institution',
      parentState: 'Iran',
      flag: '🇮🇷'
    });

    for (const key of ['military.campaigns', 'military.facilities', 'military.imagery', 'hormuz.overview', 'hormuz.shipping']) {
      await setRoute(cdp, ia.ROUTES.get(key));
      assert.equal(await cdp.eval(`Boolean(document.querySelector('[data-component="MapView"] svg'))`), true, `map-first page lacks rendered contextual map: ${key}`);
    }
    for (const key of ['talks.mou', 'objectives.outcomes', 'objectives.positions', 'evidence.method']) {
      await setRoute(cdp, ia.ROUTES.get(key));
      assert.equal(await cdp.eval(`Boolean(document.querySelector('[data-component="MapView"]'))`), false, `text-first page requires a map: ${key}`);
    }

    await setRoute(cdp, ia.ROUTES.get('military.losses'));
    const losses = await cdp.eval(`document.querySelector('main')?.innerText || ''`);
    assert.match(losses, /18\s+Total military dead/);
    assert.match(losses, /757\s+WIA/);
    assert.match(losses, /1\s+MIA/);
    assert.match(losses, /2,008\s+military-death subtotal/);
    assert.match(losses, /does not mean 52 confirmed destroyed assets/);
    assert(!/\b\d[\d,]*\s+total casualties\b/i.test(losses), 'loss page displays an invalid unique-person grand total');
    assert.match(losses, /does not calculate [“"]total casualties\s*=\s*dead/i, 'loss page omits the approved anti-double-counting warning');

    await setRoute(cdp, ia.ROUTES.get('talks.mou'));
    const mou = await cdp.eval(`document.querySelector('main')?.innerText || ''`);
    for (const heading of ['1. What each side wanted before the MOU', '2. What the interim MOU gave each side', '3–5. Immediate obligations, deferred issues and implementation', '6–9. What was implemented, reversed and broken', '10. Status now', '11. How it still shapes current talks', '12. Clause explorer']) assert(mou.includes(heading), `MOU pedagogy step missing: ${heading}`);
    assert.match(mou, /The June MOU no longer controls what either side has to do/);
    assert(!/currently binding/i.test(mou), 'MOU page implies the expired instrument remains binding');

    await setRoute(cdp, ia.ROUTES.get('objectives.iran'));
    const positions = await cdp.eval(`document.querySelector('main')?.innerText || ''`);
    assert.match(positions, /What Iran said/);
    assert.match(positions, /What happened/);
    assert.match(positions, /What Iran said or did later/);
    assert.match(positions, /Approved assessment/i);

    await setRoute(cdp, ia.ROUTES.get('evidence.claims'));
    const evidence = await cdp.eval(`(() => ({
      claims: document.querySelectorAll('.claim-case').length,
      support: document.querySelectorAll('.support-column').length,
      contrary: document.querySelectorAll('.contrary-column').length,
      sourceLinks: [...document.querySelectorAll('.evidence-drawer a')].filter(link => /^https?:/.test(link.href)).length,
      recordLinks: [...document.querySelectorAll('.record-reference-list a')].every(link => link.getAttribute('href')?.startsWith('#/timeline/chronology?event=')),
      text: document.querySelector('main')?.innerText || ''
    }))()`);
    assert.equal(evidence.claims, 6);
    assert.equal(evidence.support, 6);
    assert.equal(evidence.contrary, 6);
    assert(evidence.sourceLinks > 0, 'claim evidence drawers do not resolve source links');
    assert.equal(evidence.recordLinks, true, 'claim evidence drawer contains an unresolved internal record link');
    assert.match(evidence.text, /False — causation not supported/i);

    await setRoute(cdp, ia.ROUTES.get('evidence.sources'));
    const sourceVariants = await cdp.eval(`document.querySelectorAll('.source-variants').length`);
    assert(sourceVariants > 0, 'provenance-scoped source variants are not exposed');

    for (const width of [320, 390]) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: true });
      await setRoute(cdp, ia.ROUTES.get('evidence.method'));
      const mobile = await cdp.eval(`(() => {
        const details = document.querySelector('.mobile-navigation');
        details.open = true;
        const link = details.querySelector('a');
        link.focus();
        return {
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          visible: getComputedStyle(details).display !== 'none',
          summary: details.querySelector('summary').textContent.trim(),
          focusedLink: document.activeElement === link,
          touchTarget: link.getBoundingClientRect().height,
          primaryCurrent: details.querySelector('.mobile-primary a[aria-current="page"]')?.textContent.trim(),
          secondaryCurrent: details.querySelector('.mobile-secondary a[aria-current="page"]')?.textContent.trim()
        };
      })()`);
      assert.equal(mobile.visible, true, `mobile navigation hidden at ${width}px`);
      assert(mobile.scrollWidth <= mobile.width, `page-level horizontal overflow at ${width}px`);
      assert.match(mobile.summary, /Claims & Evidence.*How We Check the Evidence/);
      assert.equal(mobile.focusedLink, true, `mobile navigation link not keyboard focusable at ${width}px`);
      assert(mobile.touchTarget >= 44, `mobile navigation target below 44px at ${width}px`);
      assert.equal(mobile.primaryCurrent, 'Claims & Evidence');
      assert.equal(mobile.secondaryCurrent, 'How We Check the Evidence');

      await setRoute(cdp, ia.ROUTES.get('evidence.claims'));
      const mobileTargets = await cdp.eval(`(() => ({
        skip: document.querySelector('.skip-link')?.getBoundingClientRect().height || 0,
        drawers: [...document.querySelectorAll('.evidence-drawer summary')].map(summary => summary.getBoundingClientRect().height),
        scrollWidth: document.documentElement.scrollWidth,
        width: document.documentElement.clientWidth
      }))()`);
      assert(mobileTargets.skip >= 44, `skip target below 44px at ${width}px`);
      assert(mobileTargets.drawers.length > 0 && mobileTargets.drawers.every(height => height >= 44), `evidence disclosure target below 44px at ${width}px`);
      assert(mobileTargets.scrollWidth <= mobileTargets.width, `claim page has page-level horizontal overflow at ${width}px`);
    }
    await cdp.call('Emulation.clearDeviceMetricsOverride');

    console.log('browser public IA smoke: PASS — 25 direct routes, skip-link route isolation, actor affiliation/role identity, back/forward, legacy isolation, contextual map boundary, semantic navigation, and 320/390px mobile accessibility verified');
  } finally {
    cdp.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
