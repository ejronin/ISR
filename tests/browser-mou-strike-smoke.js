'use strict';

const assert = require('node:assert/strict');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const EXPECTED_RECON = 81;
const EXPECTED_TOTAL_STRIKES = 100;

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

class CDP {
  constructor(url) {
    this.url = url;
    this.nextId = 0;
    this.pending = new Map();
  }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP websocket open timeout')), 10000);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); });
      this.ws.addEventListener('error', event => { clearTimeout(timer); reject(event.error || new Error('CDP websocket error')); });
    });
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.code}: ${message.error.message}`));
      else resolve(message.result || {});
    });
  }
  call(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const out = await this.call('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    const result = out.result || {};
    if (result.subtype === 'error') throw new Error(result.description || 'Runtime.evaluate error');
    return result.value;
  }
  close() { this.ws?.close(); }
}

async function waitFor(cdp, expression, timeout = 25000) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeout) {
    last = await cdp.eval(expression);
    if (last) return last;
    await sleep(250);
  }
  throw new Error(`waitFor timeout: ${expression}; last=${JSON.stringify(last)}`);
}

async function main() {
  const targets = await (await fetch(`${DEBUG}/json`)).json();
  const target = targets.find(row => row.type === 'page' && /^http:\/\/127\.0\.0\.1:8765\//.test(row.url));
  assert(target?.webSocketDebuggerUrl, 'Atlas browser target was not found');

  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();
  try {
    await cdp.call('Runtime.enable');
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    await waitFor(cdp, `window.ATLAS_WIKI_RECON_20260826?.counts?.registered_strike_markers === ${EXPECTED_RECON}`);

    const counts = await cdp.eval(`window.ATLAS_WIKI_RECON_20260826.counts`);
    assert.equal(counts.registered_strike_markers, EXPECTED_RECON, 'all reconciliation strikes must register canonically');
    assert.equal(counts.map_linked_timeline_records, EXPECTED_RECON, 'all reconciliation timeline records must resolve to map markers');
    assert.equal(await cdp.eval('window.ATLAS_DATA.strikes.length'), EXPECTED_TOTAL_STRIKES, 'late reconciliation strikes must append to the live strike dataset');

    await cdp.eval(`window.showAtlasPanel('strikes'); window.refreshAtlasStrikeEffects(); true`);
    assert.equal(await cdp.eval(`document.querySelectorAll('#strikeList article[data-map-ref]').length`), EXPECTED_TOTAL_STRIKES,
      'Campaigns & Strikes must rerender immediately with all 100 records');
    assert.equal(await cdp.eval(`document.getElementById('strikes').classList.contains('active')`), true,
      'Campaigns & Strikes must be reachable through normal public navigation');

    const strikeLayerProof = await cdp.eval(`(() => {
      const ids=(window.ATLAS_DATA.strikes||[]).map(row=>row.id);
      const missingCanonical=ids.filter(id=>!window.getAtlasMapMarker?.(id));
      const visibleMarkerHosts=document.querySelectorAll('.leaflet-marker-pane .atlas-marker-host').length;
      const strikeToggle=[...document.querySelectorAll('[data-layer-name="Strike effects"]')].find(Boolean);
      return {
        dataset:ids.length,
        missingCanonical,
        visibleMarkerHosts,
        strikeLayerPressed:strikeToggle?.getAttribute('aria-pressed')||null
      };
    })()`);
    assert.equal(strikeLayerProof.dataset, EXPECTED_TOTAL_STRIKES, 'strike dataset must contain all 100 strike locations');
    assert.deepEqual(strikeLayerProof.missingCanonical, [], 'every strike location must resolve to a canonical marker');
    assert.equal(strikeLayerProof.strikeLayerPressed, 'true', 'Strike effects layer must be active in Campaigns & Strikes');
    assert.equal(strikeLayerProof.visibleMarkerHosts, EXPECTED_TOTAL_STRIKES,
      'all 100 strike locations must be physically present in the active Leaflet Strike layer');

    const markerResolution = await cdp.eval(`(() => {
      const events=window.ATLAS_WIKI_RECON_20260826.events||[];
      return events.filter(event=>[...(event.map_refs||[]),...(event.facility_refs||[])].some(ref=>window.getAtlasMapMarker(ref))).length;
    })()`);
    assert.equal(markerResolution, EXPECTED_RECON, 'every reconciliation event must resolve to the canonical marker registry');

    await cdp.eval(`(() => {
      window.showAtlasPanel('timeline');
      const context=document.getElementById('timelineContext');
      context.value='strike';
      window.AtlasState?.set?.({timelineContext:'strike',timeCutoff:'2026-08-26',temporalGranularity:'war'},{source:'browser-smoke',writeUrl:false});
      window.renderAtlasTimeline('');
      return true;
    })()`);
    const timeline = await cdp.eval(`(() => {
      const ids=new Set((window.ATLAS_WIKI_RECON_20260826.events||[]).map(event=>event.event_id));
      const cards=[...document.querySelectorAll('#timelineList .ledger-event')].filter(card=>ids.has(card.dataset.eventId));
      return {cards:cards.length,mapActions:cards.filter(card=>card.querySelector('.ledger-map-button')).length,cutoff:document.getElementById('timelineCutoff').value};
    })()`);
    assert.equal(timeline.cards, EXPECTED_RECON, 'Timeline STRIKES context must surface all 81 reconciliation records');
    assert.equal(timeline.mapActions, EXPECTED_RECON, 'all 81 reconciliation timeline cards must expose a map action');
    assert.equal(timeline.cutoff, '2026-08-26', 'default/current timeline cutoff must be Aug. 26');

    const mapAction = await cdp.eval(`(() => {
      const event=window.ATLAS_WIKI_RECON_20260826.events[0];
      const ref=[...(event.map_refs||[]),...(event.facility_refs||[])].find(id=>window.getAtlasMapMarker(id));
      const marker=window.getAtlasMapMarker(ref);
      const card=document.getElementById('ledger-event-'+event.event_id);
      const button=card?.querySelector('.ledger-map-button');
      button?.click();
      return {ref,hasButton:Boolean(button),popup:Boolean(marker?.isPopupOpen?.()),zoom:window.atlasMap?.getZoom?.()||0};
    })()`);
    assert.equal(mapAction.hasButton, true, 'sample reconciliation timeline record must have a working map button');
    assert.equal(mapAction.popup, true, 'timeline map action must open the canonical marker popup');
    assert(mapAction.zoom >= 6, 'timeline map action must pan/zoom to the canonical marker');

    await waitFor(cdp, `Boolean(window.ISREndgamePublicViewR1)`);
    await cdp.eval(`window.ISREndgamePublicViewR1.open('mou'); true`);
    const mou = await cdp.eval(`document.querySelector('#endgame')?.innerText || ''`);
    for (const required of [
      'OBTAINED IN THE INTERIM DEAL',
      'DEFERRED TO FINAL NEGOTIATIONS — NOT YET WON OR LOST',
      'EXPLICITLY NOT INCLUDED / REJECTED',
      'PROMISED BUT NEVER IMPLEMENTED',
      'LATER REVERSED',
      'Where the signed deal landed',
      'UNSCORED / NOT YET ADJUDICABLE'
    ]) assert(mou.includes(required), `MOU browser presentation missing: ${required}`);

    await waitFor(cdp, `Boolean(document.querySelector('[data-iran-messaging-r1]'))`);
    const messaging = await cdp.eval(`document.querySelector('[data-iran-messaging-r1]').innerText`);
    assert(messaging.includes('ASSERTIVE / LEGITIMIZING MESSAGE'), 'Iran Messaging assertive lane missing');
    assert(messaging.includes('OPTIONALITY-PRESERVING / NEGOTIATING MESSAGE'), 'Iran Messaging negotiating lane missing');
    assert(messaging.includes('OBSERVED REALITY'), 'Iran Messaging observed-reality lane missing');

    assert.equal(await cdp.eval(`[...document.querySelectorAll('button')].some(button=>button.textContent.includes('Open Campaigns & strikes'))`), true,
      'Overview must expose the expanded attack/strike record');

    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(150);
    const mobile = await cdp.eval(`(() => {
      window.showAtlasPanel('snapshot');
      const military=[...document.querySelectorAll('#primaryNav .primary-tab')].find(button=>button.textContent.trim()==='Military Operations');
      military?.click();
      const strikes=[...document.querySelectorAll('#secondaryNav .secondary-tab')].find(button=>button.textContent.trim()==='Campaigns & strikes');
      strikes?.click();
      const primary=document.getElementById('primaryNav');
      const pStyle=getComputedStyle(primary);
      return {
        width:innerWidth,
        militaryUsable:Boolean(military&&military.getBoundingClientRect().height>20),
        strikesUsable:Boolean(strikes&&strikes.getBoundingClientRect().height>20),
        strikesActive:document.getElementById('strikes')?.classList.contains('active')||false,
        navOverflowOk:primary.scrollWidth<=primary.clientWidth || ['auto','scroll'].includes(pStyle.overflowX)
      };
    })()`);
    assert.equal(mobile.width, 390, 'mobile viewport override failed');
    assert.equal(mobile.militaryUsable, true, 'Military Operations primary navigation is not usable at mobile width');
    assert.equal(mobile.strikesUsable, true, 'Campaigns & strikes secondary navigation is not usable at mobile width');
    assert.equal(mobile.strikesActive, true, 'mobile public navigation cannot reach Campaigns & Strikes');
    assert.equal(mobile.navOverflowOk, true, 'mobile primary navigation overflows without a usable scroll strategy');

    console.log('browser MOU/strike smoke: PASS — 100/100 strike locations visibly present on active Strike layer, 81 reconciliation timeline map actions, pan/popup, MOU semantics, messaging and mobile navigation');
  } finally {
    cdp.close();
  }
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
