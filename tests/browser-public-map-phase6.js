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
      const pending = this.pending.get(message.id); this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result || {});
    };
  }
  call(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async eval(expression) {
    const output = await this.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (output.result && output.result.subtype === 'error') throw new Error(output.result.description || 'Runtime error');
    return output.result && output.result.value;
  }
  close() { if (this.ws) this.ws.close(); }
}

async function waitFor(cdp, expression, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (await cdp.eval(expression)) return; } catch (_) { /* navigation can replace the context */ }
    await sleep(100);
  }
  throw new Error(`timeout: ${expression}`);
}

async function setRoute(cdp, key) {
  await cdp.eval(`location.hash = window.AtlasPublicIA.routeHref(${JSON.stringify(key)}); true`);
  await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(key)}`);
}

const PRESERVED_FACILITY_IDS = [
  'US-NSA-BHR', 'US-ARIFJAN', 'US-ALISALEM', 'US-BUEHRING', 'US-SHUAIBA-TOC', 'US-CAMPDOHA',
  'US-BUBIYAN', 'US-ALDHAFRA', 'US-JEBELALI', 'US-ERBIL', 'US-AINASAD', 'US-PRINCESULTAN',
  'US-MUWAFFAQ', 'US-INCIRLIK', 'US-ISA', 'US-RMELAN', 'US-QASRAK', 'US-TANF'
];

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
    await cdp.call('Page.navigate', { url: `${SITE}?phase6=map-${Date.now()}#/hormuz/overview` });
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready'`);

    const local = await cdp.eval(`(() => ({
      leaflet: window.L?.version,
      role: window.ATLAS_REFERENCE_GEOGRAPHY?.artifact_role,
      version: window.ATLAS_REFERENCE_GEOGRAPHY?.metadata?.version,
      layers: [...new Set(window.ATLAS_REFERENCE_GEOGRAPHY?.features.map(item => item.properties.layer))],
      map: Boolean(document.querySelector('.atlas-leaflet-map.leaflet-container')),
      coastPaths: document.querySelectorAll('.leaflet-atlas-reference-pane path').length,
      labels: [...document.querySelectorAll('.reference-map-label')].map(node => node.textContent.trim()),
      external: performance.getEntriesByType('resource').map(item => item.name).filter(url => new URL(url).origin !== location.origin)
    }))()`);
    assert.equal(local.leaflet, '1.9.4');
    assert.equal(local.role, 'PRESENTATION_REFERENCE_GEOGRAPHY');
    assert.equal(local.version, '5.1.1');
    assert.deepEqual(new Set(local.layers), new Set(['regional_50m', 'hormuz_10m']));
    assert.equal(local.map, true);
    assert(local.coastPaths >= 4, 'Hormuz map lacks detailed local coast/country geometry');
    assert(local.labels.some(label => /Strait of Hormuz/.test(label)), 'Hormuz reference label is missing');
    assert.deepEqual(local.external, [], `current map made an external runtime request: ${JSON.stringify(local.external)}`);

    await setRoute(cdp, 'hormuz.shipping');
    const shipping = await cdp.eval(`(() => {
      const button = document.querySelector('.map-route-button');
      button?.click();
      return {
        routeButtons: document.querySelectorAll('.map-route-button').length,
        paths: document.querySelectorAll('.leaflet-atlas-routes-pane path').length,
        flow: document.querySelectorAll('.route-flow-marker').length,
        card: document.querySelector('.map-selection-card')?.innerText || '',
        drawer: Boolean(document.querySelector('.map-selection-card details[data-component="SharedEvidenceDrawer"]')),
        equivalent: document.querySelector('[data-phase6-map-equivalent]')?.textContent || ''
      };
    })()`);
    assert(shipping.routeButtons >= 1 && shipping.paths >= 1 && shipping.flow >= 1, 'stored maritime route did not render with its flow marker');
    assert.match(shipping.card, /Schematic reference route/i);
    assert.match(shipping.card, /not live (?:vessel )?tracking/i);
    assert.equal(shipping.drawer, true, 'route card does not use the shared evidence drawer');
    assert.match(shipping.equivalent, /schematic reference route/i);
    await cdp.call('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await cdp.eval(`getComputedStyle(document.querySelector('.route-flow-marker')).animationName`), 'none', 'reduced-motion mode retains route animation');
    await cdp.call('Emulation.setEmulatedMedia', { media: 'screen', features: [] });

    await setRoute(cdp, 'military.facilities');
    const facilityParity = await cdp.eval(`(() => ({
      ids: [...document.querySelectorAll('[data-facility-id]')].map(node => node.dataset.facilityId),
      auditDetails: document.querySelectorAll('.facility-claim-audit[data-facility-audit-id]').length,
      sourceLinks: [...document.querySelectorAll('[data-facility-id] .evidence-drawer a')].filter(link => /^https?:/.test(link.href)).length,
      page: document.querySelector('main')?.innerText || ''
    }))()`);
    assert.equal(new Set(facilityParity.ids).size, 23, 'generated live facility cards are missing or duplicated');
    assert(PRESERVED_FACILITY_IDS.every(facilityId => facilityParity.ids.includes(facilityId)), 'a preserved facility is not publicly reachable');
    assert.equal(facilityParity.auditDetails, 4, 'facility-linked claim audits are not reachable from facility cards');
    assert(facilityParity.sourceLinks > 0, 'restored facility cards do not expose source links');
    assert.match(facilityParity.page, /reference points identify the facility—not a precise damage location/i);

    await setRoute(cdp, 'military.imagery');
    const baselineBda = await cdp.eval(`(() => ({
      buttons: document.querySelectorAll('.map-imagery-button').length,
      overlays: document.querySelectorAll('img.leaflet-image-layer').length,
      points: document.querySelectorAll('.evidence-map-marker').length,
      damageObservationIds: [...document.querySelectorAll('[data-damage-observation-id]')].map(node => node.dataset.damageObservationId),
      facilityAuditCards: document.querySelectorAll('article[data-facility-audit-id]').length,
      facilityAuditDetails: document.querySelectorAll('article[data-facility-audit-id] .facility-claim-audit').length,
      evidenceLinks: [...document.querySelectorAll('[data-damage-observation-id] .evidence-drawer a, article[data-facility-audit-id] .evidence-drawer a')].filter(link => /^https?:/.test(link.href)).length,
      auditText: [...document.querySelectorAll('article[data-facility-audit-id] .facility-claim-audit')].map(node => node.textContent || '').join(' '),
      text: document.querySelector('[data-phase6-map-equivalent]')?.innerText || '',
      page: document.querySelector('main')?.innerText || ''
    }))()`);
    assert(baselineBda.buttons >= 1, 'baseline BDA records lack a keyboard imagery selector');
    assert.equal(baselineBda.overlays, 0, 'approximate baseline imagery was stretched into an unsupported image overlay');
    assert(baselineBda.points >= 1, 'location-linked baseline imagery lacks canonical markers');
    assert.match(baselineBda.page, /precise image footprint is unavailable/i);
    assert.equal(new Set(baselineBda.damageObservationIds).size, 9, 'forensic damage observations are not publicly reachable');
    assert.equal(baselineBda.facilityAuditCards, 4, 'facility claim audits lack a visible imagery consumer');
    assert.equal(baselineBda.facilityAuditDetails, 4, 'facility claim-audit propositions are not exposed');
    assert(baselineBda.evidenceLinks > 0, 'damage observations or facility audits lost source provenance');
    assert.match(baselineBda.page, /A physical damage observation records what imagery or reporting shows/i);
    assert.match(baselineBda.page, /Fath Air Base, Karaj/i);
    assert.match(baselineBda.auditText, /Confirmed.*Was Al Udeid struck/is);
    assert.match(baselineBda.auditText, /Unresolved.*permanently destroyed beyond repair/is);

    const propagation = await cdp.eval(`(async () => {
      const model = await fetch('./data/public-current-state.json', { cache: 'no-store' }).then(response => response.json());
      const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Av0mAAAAAElFTkSuQmCC';
      const sourceId = 'SRC-PHASE6-FUTURE';
      const locationId = 'LOC-PHASE6-FUTURE';
      const eventId = 'EV-PHASE6-FUTURE';
      const source = structuredClone(model.sources.records[0]);
      source.source_id = sourceId;
      source.record = { ...source.record, source_id: sourceId, title: 'Future imagery evidence source', url: 'https://example.test/future-imagery', records_supported: [eventId] };
      source.registry = { ...source.registry, source_id: sourceId, title: source.record.title, url: source.record.url, records_supported: [eventId] };
      source.variants = source.variants.map((variant, index) => ({ ...variant, variant_key: 'phase6:' + sourceId + ':' + index, record: { ...variant.record, ...source.record } }));
      model.sources.records.push(source);
      const location = structuredClone(model.entities.locations.find(item => Number.isFinite(item.record.latitude) && Number.isFinite(item.record.longitude)));
      location.location_id = locationId;
      location.record = { ...location.record, location_id: locationId, canonical_name: 'Future accepted imagery location', latitude: 26.51, longitude: 56.24, coordinate_precision: 'precise' };
      model.entities.locations.push(location);
      const future = structuredClone(model.chronology[0]);
      future.event_id = eventId; future.location_ids = [locationId]; future.source_ids = [sourceId]; future.source_references = [{ source_id: sourceId, variant_key: 'phase6:' + sourceId + ':0' }];
      future.timeline = { ...future.timeline, event_id: eventId, date: '2099-02-03', day: '2099-02-03', month: '2099-02', year: 2099, summary: 'Future accepted imagery evidence fixture', source_ids: [sourceId] };
      future.event = { ...future.event, event_id: eventId, event_date: '2099-02-03', first_reported: '2099-02-04', summary: 'Future accepted imagery evidence fixture', location_ids: [locationId], source_ids: [sourceId], evidence_status: 'SUPPORTED_WITH_LIMITATIONS', disputed_by: ['Recorded opposing party'], imagery: [{
        imagery_type: 'Satellite damage review', image_url: tinyPng, georeferenced_bounds: [[26.48, 56.20], [26.54, 56.28]], geolocation_reliable: true, geolocation_precision: 'precise', source_ids: [sourceId], limitations: 'Future accepted imagery limitation fixture'
      }, {
        imagery_type: 'Follow-up area-linked image', image_url: tinyPng, geolocation_reliable: true, geolocation_precision: 'area only', source_ids: [sourceId], limitations: 'Precise footprint not supplied.'
      }] };
      future.revisions = [{ known_at: '2099-02-05T12:00:00-04:00', change: 'Later accepted imagery metadata' }];
      model.chronology.push(future); model.counts.chronology_records += 1;

      const generalLocationId = 'LOC-PHASE6-GENERAL-AREA';
      const generalEventId = 'EV-PHASE6-GENERAL-AREA';
      const generalLocation = structuredClone(location);
      generalLocation.location_id = generalLocationId;
      generalLocation.record = { ...generalLocation.record, location_id: generalLocationId, canonical_name: 'Future supported Bandar Abbas general area', latitude: 27.18, longitude: 56.27, coordinate_precision: 'GENERAL_AREA' };
      model.entities.locations.push(generalLocation);
      const generalArea = structuredClone(future);
      generalArea.event_id = generalEventId; generalArea.location_ids = [generalLocationId];
      generalArea.timeline = { ...generalArea.timeline, event_id: generalEventId, summary: 'Future general-area imagery fixture' };
      generalArea.event = { ...generalArea.event, event_id: generalEventId, summary: 'Future general-area imagery fixture', location_ids: [generalLocationId], imagery: {
        imagery_type: 'General-area news imagery', image_url: tinyPng, geolocation_reliable: true, geolocation_precision: 'general area', source_ids: [sourceId], limitations: 'Associated only with the supported general area; precise footprint unavailable.'
      } };
      model.chronology.push(generalArea); model.counts.chronology_records += 1;

      const located = model.entities.locations.find(item => Number.isFinite(item.record.latitude) && Number.isFinite(item.record.longitude) && model.chronology.some(event => (event.location_ids || []).includes(item.location_id)) && item.location_id !== locationId);
      const retrofit = model.chronology.find(event => (event.location_ids || []).includes(located.location_id));
      const retrofitSourceId = retrofit.source_ids[0];
      const retrofitSource = model.sources.records.find(item => item.source_id === retrofitSourceId);
      located.record = { ...located.record, canonical_name: 'Refined retrofit location', latitude: 27.125, longitude: 55.875, coordinate_precision: 'refined footprint' };
      retrofit.timeline = { ...retrofit.timeline, summary: 'Retrofit accepted imagery evidence fixture' };
      retrofit.event = { ...retrofit.event, summary: 'Retrofit accepted imagery evidence fixture', evidence_status: 'DISPUTED', disputed_by: ['Later reviewed reporting'], imagery: {
        imagery_type: 'Retrofitted historical footprint', footprint: [[27.08, 55.82], [27.16, 55.82], [27.16, 55.93], [27.08, 55.93]], geolocation_reliable: true, geolocation_precision: 'refined footprint', source_ids: [retrofitSourceId], limitations: 'Image corners remain unavailable; accepted footprint only.'
      } };
      retrofit.revisions = [...(retrofit.revisions || []), { known_at: '2099-03-01T09:30:00-04:00', change: 'Accepted retrofit location and evidence status' }];
      if (retrofitSource) {
        retrofitSource.record = { ...retrofitSource.record, title: 'Updated retrofit source metadata' };
        retrofitSource.registry = { ...retrofitSource.registry, title: 'Updated retrofit source metadata' };
        retrofitSource.variants = retrofitSource.variants.map(variant => ({ ...variant, record: { ...variant.record, title: 'Updated retrofit source metadata' } }));
      }

      const runtime = window.AtlasPublicBoot.createRouteRuntime(model, { ia: window.AtlasPublicIA });
      const render = (key, query) => {
        const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-12000px;top:0;width:1100px;'; document.body.append(host);
        const fakeWindow = { location: { hash: window.AtlasPublicIA.routeHref(key) }, history: { replaceState() {} }, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, CustomEvent: window.CustomEvent };
        const controller = window.AtlasPublicIA.mount({ rootElement: host, routeRuntime: runtime, state: {}, documentObject: document, windowObject: fakeWindow });
        const search = host.querySelector('.source-controls input');
        if (search && query) { search.value = query; search.dispatchEvent(new Event('input', { bubbles: true })); }
        const chronologySearch = host.querySelector('.chronology-controls input');
        if (chronologySearch && query) { chronologySearch.value = query; chronologySearch.dispatchEvent(new Event('input', { bubbles: true })); }
        const result = {
          text: host.innerText,
          allText: host.textContent,
          html: host.innerHTML,
          overlays: host.querySelectorAll('img.leaflet-image-layer').length,
          footprints: host.querySelectorAll('.leaflet-atlas-imagery-pane path').length,
          imageryButtons: [...host.querySelectorAll('.map-imagery-button')].map(button => button.textContent),
          equivalent: host.querySelector('[data-phase6-map-equivalent]')?.textContent || '',
          drawers: host.querySelectorAll('details[data-component="SharedEvidenceDrawer"]').length
        };
        controller.destroy(); host.remove(); return result;
      };
      const generalDescriptor = window.AtlasPublicIA.MapView.imageryDescriptor({ ...generalArea.event.imagery, location_id: generalLocationId }, { resolve: id => id === generalLocationId ? { latitude: 27.18, longitude: 56.27, label: 'Future supported Bandar Abbas general area', precision: 'General area' } : null }, []);
      return { timeline: render('timeline.chronology'), retrofitTimeline: render('timeline.chronology', retrofit.event_id), imagery: render('military.imagery'), sources: render('evidence.sources', sourceId), retrofitSources: render('evidence.sources', retrofitSourceId), generalTier: generalDescriptor.tier, generalBounds: generalDescriptor.bounds, generalFootprint: generalDescriptor.footprint, eventId, sourceId };
    })()`);
    assert.match(propagation.timeline.text, /Future accepted imagery evidence fixture/);
    assert.match(propagation.timeline.allText, /Future imagery evidence source/);
    assert.match(propagation.timeline.text, /Supported With Limitations/i);
    assert.match(propagation.imagery.text, /Future accepted imagery evidence fixture/);
    assert(propagation.imagery.overlays >= 1, 'new reliable bounds did not produce a generic image overlay');
    assert(propagation.imagery.imageryButtons.some(label => /Satellite damage review/.test(label)) && propagation.imagery.imageryButtons.some(label => /Follow-up area-linked image/.test(label)), 'multiple imagery items at one accepted location are not distinguishable');
    assert.match(propagation.imagery.equivalent, /Future accepted imagery location/);
    assert.match(propagation.imagery.text, /Future general-area imagery fixture/);
    assert.match(propagation.imagery.equivalent, /Future supported Bandar Abbas general area/);
    assert.match(propagation.imagery.equivalent, /General Area/i);
    assert.match(propagation.imagery.equivalent, /precise footprint unavailable/i);
    assert.equal(propagation.generalTier, 'C', 'future general-area imagery did not remain Tier C');
    assert.equal(propagation.generalBounds, null, 'future general-area imagery invented rectangular bounds');
    assert.equal(propagation.generalFootprint, null, 'future general-area imagery invented a footprint');
    assert(propagation.imagery.drawers >= 1, 'new imagery record did not retain shared evidence actions');
    assert.match(propagation.sources.text, /Future imagery evidence source/);
    assert.match(propagation.retrofitTimeline.text, /Retrofit accepted imagery evidence fixture/);
    assert.match(propagation.retrofitTimeline.allText, /Refined retrofit location/);
    assert.match(propagation.retrofitTimeline.allText, /Updated retrofit source metadata/);
    assert.match(propagation.retrofitTimeline.text, /Disputed/i);
    assert(propagation.imagery.footprints >= 1, 'retrofit accepted footprint did not render through the generic imagery path');
    assert.match(propagation.imagery.equivalent, /Refined retrofit location/);
    assert.match(propagation.retrofitSources.text, /Updated retrofit source metadata/);

    await setRoute(cdp, 'military.imagery');
    const keyboard = await cdp.eval(`(() => {
      const marker = document.querySelector('.evidence-map-marker[tabindex="0"], .leaflet-marker-icon[tabindex="0"]');
      marker?.focus(); marker?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      const opened = !document.querySelector('.map-selection-card')?.hidden;
      const map = document.querySelector('.atlas-leaflet-map');
      map?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return { marker: Boolean(marker), focused: document.activeElement === marker, opened, closed: document.querySelector('.map-selection-card')?.hidden };
    })()`);
    assert.equal(keyboard.marker, true, 'map marker is not keyboard focusable');
    assert.equal(keyboard.focused, true, 'map marker did not receive keyboard focus');
    assert.equal(keyboard.opened, true, 'marker activation did not open a readable card');
    assert.equal(keyboard.closed, true, 'Escape did not close the map card');

    for (const width of [320, 390, 768, 1440]) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
      await setRoute(cdp, 'hormuz.overview');
      const responsive = await cdp.eval(`(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        mapOverflow: Math.max(0, document.querySelector('.atlas-leaflet-map').getBoundingClientRect().right - innerWidth),
        controls44: [...document.querySelectorAll('.leaflet-control-zoom a, .map-route-button, .map-imagery-button')].every(node => node.getBoundingClientRect().height >= 44)
      }))()`);
      assert(responsive.overflow <= 1, `${width}px viewport has page horizontal overflow: ${responsive.overflow}`);
      assert(responsive.mapOverflow <= 1, `${width}px map overflows its viewport: ${responsive.mapOverflow}`);
      assert.equal(responsive.controls44, true, `${width}px map control is below 44px`);
    }
    await cdp.call('Emulation.clearDeviceMetricsOverride');
    console.log('browser public map Phase 6: PASS - local Leaflet geography, routes, BDA tiers, evidence propagation, keyboard, and responsive behavior verified');
  } finally {
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
