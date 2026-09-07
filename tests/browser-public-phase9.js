'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const model = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'public-current-state.json'), 'utf8'));
const records = key => {
  const payload = model.datasets[key].payload;
  if (Array.isArray(payload)) return payload;
  return payload.records || payload.items || payload.events || payload.entries || [];
};

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
    try { if (await cdp.eval(expression)) return; } catch (_) { /* navigation can replace the context */ }
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
    await cdp.call('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.call('Page.navigate', { url: `${SITE}#/timeline/war` });
    await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === 'timeline.war'`);

    const timeline = await cdp.eval(`(() => ({
      count: window.ATLAS_PUBLIC_STATE.chronologyCount,
      cutoff: window.ATLAS_PUBLIC_STATE.currentOsintCutoff,
      clusters: document.querySelectorAll('.timeline-marker.cluster').length,
      events: document.querySelectorAll('.timeline-marker.event').length,
      map: Boolean(document.querySelector('.timeline-map-host [data-component="MapView"] .leaflet-container')),
      prewar: document.querySelector('[data-timeline-prewar]')?.dataset.timelinePrewar,
      copy: document.querySelector('main')?.innerText || '',
      controls: [...document.querySelectorAll('.timeline-controls input, .timeline-controls select, .timeline-navigation button')].map(node => node.getBoundingClientRect().height),
      densityBins: document.querySelectorAll('[data-timeline-density="record-count-only"] .timeline-density-bin').length,
      densityText: document.querySelector('[data-timeline-density="record-count-only"]')?.innerText || '',
      scaleLabels: [...(document.querySelector('[data-timeline-scale-model="semantic-conflict-span"]')?.options || [])].map(option => option.textContent.trim()),
      fullLabel: [...document.querySelectorAll('.timeline-navigation button')].find(button => /full conflict/i.test(button.textContent))?.textContent.trim() || ''
    }))()`);
    assert.equal(timeline.count, model.counts.chronology_records);
    assert.equal(timeline.cutoff, model.release.current_osint_cutoff);
    assert(timeline.clusters > 0 && timeline.events === 0, 'full-war timeline is not clustered');
    assert.equal(timeline.map, true, 'active temporal window lacks contextual map state');
    assert.equal(timeline.prewar, 'distinct');
    assert(timeline.controls.every(height => height >= 44), 'timeline has a touch target below 44px');
    assert(timeline.copy.includes(`Detailed Chronology contains all ${model.counts.chronology_records} records.`));
    assert.match(timeline.copy, /191 conflict days are represented/);
    assert(timeline.densityBins > 0, 'full-conflict density overview is absent');
    assert.match(timeline.densityText, /not greater strategic importance/i, 'timeline density implies analytical importance');
    assert.deepEqual(timeline.scaleLabels, ['Full', '4×', '8×', '16×']);
    assert.equal(timeline.fullLabel, 'Back to full conflict');

    const selected = await cdp.eval(`(() => {
      const narrow = () => document.querySelector('.timeline-marker.cluster')?.click();
      narrow();
      if (!document.querySelector('.timeline-marker.event')) narrow();
      const marker = document.querySelector('.timeline-marker.event');
      marker?.click();
      return {
        eventMarkers: document.querySelectorAll('.timeline-marker.event').length,
        pressed: marker?.getAttribute('aria-pressed'),
        record: Boolean(document.querySelector('.timeline-selection .chronology-card')),
        spatial: Boolean(document.querySelector('.timeline-map-host [data-component="MapView"], .timeline-map-host .empty-state'))
      };
    })()`);
    assert(selected.eventMarkers > 0, 'cluster selection did not expose event ticks');
    assert.deepEqual({ pressed: selected.pressed, record: selected.record, spatial: selected.spatial }, { pressed: 'true', record: true, spatial: true });

    await route(cdp, '#/timeline/chronology', 'timeline.chronology');
    const chronology = await cdp.eval(`(() => ({
      cards: document.querySelectorAll('.chronology-card').length,
      pager: document.querySelector('.pager')?.innerText || '',
      classes: document.querySelectorAll('.record-class-chip').length,
      controls: [...document.querySelectorAll('.chronology-controls input, .chronology-controls select, .pager button')].map(node => node.getBoundingClientRect().height)
    }))()`);
    assert.equal(chronology.cards, 40, 'chronology first page is not explicitly paginated');
    assert.match(chronology.pager, new RegExp(`${model.counts.chronology_records} matching records`));
    assert(chronology.classes > 0, 'chronology records do not expose their record class');
    assert(chronology.controls.every(height => height >= 44), 'chronology has a touch target below 44px');

    await route(cdp, '#/military/losses', 'military.losses');
    const losses = await cdp.eval(`(() => ({
      groups: [...document.querySelectorAll('[data-loss-side-group]')].map(node => node.dataset.lossSideGroup),
      casualtyRecords: document.querySelectorAll('[data-casualty-id]').length,
      method: document.querySelector('.casualty-method summary')?.textContent.trim(),
      badHeading: (document.querySelector('main')?.innerText || '').includes('Do not add the headline categories'),
      cards: document.querySelectorAll('[data-loss-id]').length
    }))()`);
    assert.deepEqual(losses.groups, ['us-coalition', 'iran-aligned', 'civilian-commercial', 'unclassified']);
    assert.equal(losses.casualtyRecords, records('gate3.casualties').length);
    assert.equal(losses.method, 'How casualty totals are counted');
    assert.equal(losses.badHeading, false);
    assert.equal(losses.cards, model.counts.material_loss_records);

    await route(cdp, '#/military/imagery', 'military.imagery');
    const imagery = await cdp.eval(`(() => ({
      summaries: document.querySelectorAll('[data-imagery-summary]').length,
      open: document.querySelectorAll('[data-imagery-summary][open]').length,
      identities: document.querySelectorAll('[data-imagery-summary] > summary [data-actor-name]').length,
      unresolvedDates: [...document.querySelectorAll('[data-map-imagery-control]')].filter(node => /Date unresolved/i.test(node.innerText)).length,
      map: Boolean(document.querySelector('[data-component="MapView"] .leaflet-container'))
    }))()`);
    assert(imagery.summaries > 0 && imagery.open === 0, 'imagery evidence is not progressively disclosed');
    assert.equal(imagery.identities, imagery.summaries, 'imagery summaries lack actor identity context');
    assert.equal(imagery.unresolvedDates, 0, 'undated imagery controls expose repetitive unresolved-date text');
    assert.equal(imagery.map, true);
    const imageryDetail = await cdp.eval(`(() => {
      const row = document.querySelector('[data-imagery-summary]');
      row.open = true;
      return row.innerText;
    })()`);
    assert(!/Do not create polygons|machine-readable footprint/i.test(imageryDetail), 'imagery detail exposes implementation-style instructions');
    assert.match(imageryDetail, /no polygon or damage percentage is inferred|no precise imagery footprint/i);

    await route(cdp, '#/evidence/information', 'evidence.information');
    const ledger = await cdp.eval(`(() => {
      const independent = [...document.querySelectorAll('[data-claim-id]')].find(node => node.dataset.truthAdjudication === 'disproven' && node.dataset.deceptionScore === '0');
      independent?.querySelector('summary')?.click();
      return {
        claims: document.querySelectorAll('[data-claim-id]').length,
        families: document.querySelector('.narrative-family-directory summary')?.textContent || '',
        chains: document.querySelector('.information-chain-directory summary')?.textContent || '',
        reliability: document.querySelector('.reliability-directory summary')?.textContent || '',
        independent: Boolean(independent),
        independentOpen: Boolean(independent?.open),
        evidence: Boolean(independent?.querySelector('.evidence-drawer')),
        controls: [...document.querySelectorAll('.lie-ledger-controls input, .lie-ledger-controls select')].map(node => node.getBoundingClientRect().height),
        text: document.querySelector('main')?.innerText || ''
      };
    })()`);
    assert.equal(ledger.claims, records('gate3.lie_ledger').length);
    assert.match(ledger.families, new RegExp(`${records('gate3.narrative_families').length} narrative families`));
    assert.match(ledger.chains, new RegExp(`${records('gate3.information_chains').length} information chains`));
    assert.match(ledger.reliability, new RegExp(`${records('gate3.source_reliability').length} source and claimant histories`));
    assert(ledger.independent && ledger.independentOpen, 'truth and deception were not rendered as independent findings');
    assert.equal(ledger.evidence, true, 'Lie Ledger detail lacks source access');
    assert(ledger.controls.every(height => height >= 44), 'Lie Ledger has a touch target below 44px');
    assert.match(ledger.text, /a false statement is not automatically a deliberate lie/i);

    const acceptedNarrativeFunctions = records('gate3.lie_ledger').map(record => ({
      claimId: record.claim_id,
      narrativeFunction: typeof record.narrative_function === 'string' ? record.narrative_function.trim() : '',
      displayValue: typeof record.narrative_function === 'string' ? ia.publicNarrative(record.narrative_function) : '',
      truthAdjudication: String(record.truth_adjudication || '').toLowerCase(),
      deceptionScore: String(record.deception_score)
    }));
    assert.equal(acceptedNarrativeFunctions.filter(record => record.narrativeFunction).length, 21, 'accepted populated narrative-function count changed');
    const narrativeFunctionDetails = await cdp.eval(`(() => {
      const accepted = ${JSON.stringify(acceptedNarrativeFunctions)};
      return accepted.map(record => {
        const row = [...document.querySelectorAll('[data-claim-id]')].find(node => node.dataset.claimId === record.claimId);
        row.open = true;
        const terms = [...row.querySelectorAll('.lie-ledger-detail dt')];
        const term = terms.find(node => node.textContent.trim() === 'Narrative function');
        const value = term?.nextElementSibling?.textContent.trim() || '';
        return {
          claimId: record.claimId,
          populated: Boolean(record.narrativeFunction),
          exposed: Boolean(term),
          value,
          valueMatches: value === record.displayValue,
          machineTokens: value.match(/\\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\\b/g) || [],
          truthUnchanged: row.dataset.truthAdjudication === record.truthAdjudication,
          deceptionUnchanged: row.dataset.deceptionScore === record.deceptionScore
        };
      });
    })()`);
    const populatedNarrativeFunctionDetails = narrativeFunctionDetails.filter(record => record.populated);
    const emptyNarrativeFunctionDetails = narrativeFunctionDetails.filter(record => !record.populated);
    assert.equal(populatedNarrativeFunctionDetails.length, 21);
    assert(populatedNarrativeFunctionDetails.every(record => record.exposed && record.value && record.valueMatches && !record.machineTokens.length), 'a populated narrative function is missing, not humanized by the public-language system, or exposes machine language');
    assert(emptyNarrativeFunctionDetails.every(record => !record.exposed && !record.value), 'an empty narrative function was invented');
    assert(narrativeFunctionDetails.every(record => record.truthUnchanged && record.deceptionUnchanged), 'narrative-function display changed truth or deception findings');

    const publicLanguageLeaks = [];
    for (const routeRecord of ia.ROUTES.values()) {
      await route(cdp, ia.routeHref(routeRecord.key), routeRecord.key);
      const leaks = await cdp.eval(`(() => {
        const main = document.querySelector('main');
        const visible = main?.innerText || '';
        const labels = [...(main?.querySelectorAll('[aria-label], [title], option') || [])]
          .flatMap(node => [node.getAttribute('aria-label'), node.getAttribute('title'), node.tagName === 'OPTION' ? node.textContent : ''])
          .filter(Boolean).join(' ');
        return {
          machine: [...new Set((visible + ' ' + labels).match(/\\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\\b/g) || [])],
          internal: ['Do not add the headline categories', 'No machine-readable footprint/damage polygons were supplied', 'Do not create polygons or percentages from prose'].filter(phrase => visible.includes(phrase))
        };
      })()`);
      publicLanguageLeaks.push(...leaks.machine.map(token => `${routeRecord.key}:${token}`));
      publicLanguageLeaks.push(...leaks.internal.map(phrase => `${routeRecord.key}:${phrase}`));
    }
    assert.deepEqual(publicLanguageLeaks, [], 'raw machine taxonomy or implementation instructions leaked into public language');

    await route(cdp, '#/military/campaigns', 'military.campaigns');
    const technicalRecord = await cdp.eval(`(() => {
      const main = document.querySelector('main');
      const card = document.querySelector('[data-strike-effect-id]');
      const before = main.innerText;
      const drawer = card?.querySelector('.evidence-drawer');
      if (drawer) drawer.open = true;
      return { before, after: card?.innerText || '' };
    })()`);
    assert(!/Stable strike record(?: ID)?:/i.test(technicalRecord.before), 'internal strike ID is visible before deliberate evidence expansion');
    assert.match(technicalRecord.after, /Stable strike record ID/i, 'expanded evidence omits stable technical identity');

    for (const width of [320, 390]) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: true });
      await route(cdp, '#/evidence/information', 'evidence.information');
      const mobile = await cdp.eval(`({ width:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth })`);
      assert(mobile.scrollWidth <= mobile.width, `Phase 9 information page overflows at ${width}px`);
    }
    await cdp.call('Emulation.clearDeviceMetricsOverride');

    await route(cdp, '#/evidence/information', 'evidence.information');
    const phase10Ledger = await cdp.eval(`(() => {
      const main = document.querySelector('main');
      const falseRow = [...document.querySelectorAll('[data-claim-id]')].find(node => node.dataset.truthAdjudication === 'disproven');
      if (falseRow) falseRow.open = true;
      const zeroRow = [...document.querySelectorAll('[data-claim-id]')].find(node => node.dataset.deceptionScore === '0');
      if (zeroRow) zeroRow.open = true;
      return {
        title: main?.querySelector('h1')?.textContent.trim() || '',
        clocks: [...main.querySelectorAll('[data-component="EvidenceClocks"] .evidence-clock-summary > strong')].map(node => node.textContent.trim()),
        clockTimes: [...main.querySelectorAll('[data-component="EvidenceClocks"] time')].map(node => node.textContent.trim()),
        explainer: main?.innerText || '',
        falseLine: falseRow?.querySelector('.claim-public-sentence')?.textContent.trim() || '',
        zeroText: zeroRow?.innerText || '',
        evidenceSummary: falseRow?.querySelector('.evidence-drawer > summary')?.textContent.trim() || ''
      };
    })()`);
    assert.equal(phase10Ledger.title, 'Lie Ledger');
    assert.deepEqual(phase10Ledger.clocks, ['Frozen review cutoff', 'Current evidence cutoff']);
    assert.deepEqual(phase10Ledger.clockTimes, ['Sep. 5, 2026 · 12:37 AM ET', 'Sep. 6, 2026 · 2:10 PM ET']);
    assert.match(phase10Ledger.explainer, /Claim accuracy & deception evidence/i);
    assert.match(phase10Ledger.explainer, /A false statement is not automatically a deliberate lie/i);
    assert.match(phase10Ledger.zeroText, /No evidence of knowing deception/);
    assert.match(phase10Ledger.falseLine, /That claim was false\.|direct institutional knowledge/i);
    assert.match(phase10Ledger.evidenceSummary, /^Evidence(?: \(\d+\))?$/);

    await route(cdp, '#/military/campaigns', 'military.campaigns');
    const phase10Effects = await cdp.eval(`(() => ({ text: document.querySelector('main')?.innerText || '', cards: document.querySelectorAll('.effect-framework-card').length }))()`);
    assert.equal(phase10Effects.cards, 7);
    assert.match(phase10Effects.text, /From damage to strategic effect/);
    assert.match(phase10Effects.text, /confirmed hit does not by itself establish destroyed capability or strategic effect/i);

    await route(cdp, '#/military/losses', 'military.losses');
    const phase10Losses = await cdp.eval(`(() => ({ text: document.querySelector('main')?.innerText || '', cards: document.querySelectorAll('[data-loss-id]').length }))()`);
    assert.equal(phase10Losses.cards, model.counts.material_loss_records);
    assert.match(phase10Losses.text, /Claimed ≠ verified/);
    assert.match(phase10Losses.text, /IRGC claim: six vessel successes\. Verified loss count not established\./);
    assert(!/Quantity: 0\b/.test(phase10Losses.text), 'unknown quantity rendered as zero');

    const lossAudit = await cdp.eval(`(() => {
      const ids = [...document.querySelectorAll('[data-loss-id]')].map(node => node.dataset.lossId).sort();
      const details = [...document.querySelectorAll('[data-loss-comparison="record-count-auditable"] [data-aggregation="record-count-only"]')];
      const contributors = details.flatMap(node => (node.dataset.contributingRecordIds || '').split(',').filter(Boolean)).sort();
      return { ids, contributors, groupCount: document.querySelectorAll('[data-loss-summary-group]').length, comparisonText: document.querySelector('[data-loss-comparison]')?.innerText || '' };
    })()`);
    assert.deepEqual(lossAudit.contributors, lossAudit.ids, 'loss comparison aggregation cannot be audited back to the exact canonical loss IDs');
    assert(lossAudit.groupCount >= 3, 'loss comparison collapsed actor/commercial group structure');
    assert.match(lossAudit.comparisonText, /count canonical material-loss records/i);
    assert.match(lossAudit.comparisonText, /Unknown does not mean zero|unknown quantities/i);

    await route(cdp, '#/hormuz/shipping', 'hormuz.shipping');
    const shippingVisual = await cdp.eval(`(() => ({
      views: [...document.querySelectorAll('[data-shipping-map-view]')].map(node => node.dataset.shippingMapView),
      routeLines: document.querySelectorAll('[data-shipping-map-view="network"] [data-route-id]').length,
      contextLabels: [...document.querySelectorAll('[data-shipping-map-view="network"] .reference-map-label')].map(node => node.textContent.trim()).filter(Boolean),
      chokepointLabels: [...document.querySelectorAll('[data-shipping-map-view="chokepoint"] .reference-map-label')].map(node => node.textContent.trim()).filter(Boolean),
      text: document.querySelector('[data-shipping-map-system]')?.innerText || ''
    }))()`);
    assert.deepEqual(shippingVisual.views, ['chokepoint', 'network']);
    assert(shippingVisual.routeLines >= 4, 'supported oil/shipping route geometry is not visibly rendered');
    assert(shippingVisual.contextLabels.length > 0, 'broader route map lacks named city/port/corridor context');
    assert(shippingVisual.chokepointLabels.some(label => /Iran|Oman|Hormuz|Persian Gulf|Gulf of Oman/i.test(label)), 'chokepoint map lacks basic geographic orientation');
    assert.match(shippingVisual.text, /not live vessel positions, surveyed alignment, or targeting-quality geometry/i);

    await route(cdp, '#/hormuz/economy', 'hormuz.economy');
    const economyVisual = await cdp.eval(`(() => ({
      interpolation: document.querySelector('[data-economic-viz]')?.dataset.interpolation || '',
      cards: document.querySelectorAll('[data-economic-country]').length,
      tableRows: document.querySelectorAll('.economic-numeric-equivalent tbody tr').length,
      hasConnectingPolyline: Boolean(document.querySelector('[data-economic-viz] svg polyline, [data-economic-viz] svg path[data-series]')),
      text: document.querySelector('[data-economic-viz]')?.innerText || ''
    }))()`);
    assert.equal(economyVisual.interpolation, 'none');
    assert.equal(economyVisual.cards, model.datasets['ledger.economics'].payload.forecast_context.rows.length);
    assert.equal(economyVisual.tableRows, economyVisual.cards);
    assert.equal(economyVisual.hasConnectingPolyline, false, 'economy snapshots are visually connected as an invented continuous series');
    assert.match(economyVisual.text, /does not interpolate values between observations/i);

    await route(cdp, '#/talks/june-mou', 'talks.mou');
    const mouVisual = await cdp.eval(`(() => ({
      rows: document.querySelectorAll('[data-agreement-balance] .agreement-term-row').length,
      selected: document.querySelectorAll('[data-agreement-balance] .agreement-state.selected').length,
      notAdjudicated: (document.querySelector('[data-agreement-balance]')?.innerText.match(/Balance not adjudicated/g) || []).length,
      ranges: document.querySelectorAll('[data-agreement-balance] input[type="range"]').length,
      labels: [...document.querySelectorAll('[data-agreement-balance] .agreement-ordinal')].map(node => node.getAttribute('aria-label') || '')
    }))()`);
    const mouTracks = model.datasets['analysis.hormuz'].payload.mou_position_tracks;
    assert.equal(mouVisual.rows, mouTracks.length);
    assert.equal(mouVisual.selected, mouTracks.filter(track => track.scorable).length);
    assert.equal(mouVisual.notAdjudicated, mouTracks.filter(track => !track.scorable).length);
    assert.equal(mouVisual.ranges, 0, 'MOU balance was rendered as a continuous slider');
    assert(mouVisual.labels.filter(label => /underlying analyst position/i.test(label)).length === mouVisual.selected, 'scorable MOU terms do not expose their existing analyst-position basis');

    await route(cdp, '#/timeline/war', 'timeline.war');
    const densityInteraction = await cdp.eval(`(() => {
      const bin = document.querySelector('.timeline-density-bin'); const inputs = document.querySelectorAll('.timeline-controls input[type="date"]'); if (!bin || inputs.length < 2) return null; bin.click(); return { start: inputs[0].value, end: inputs[1].value, expectedStart: bin.dataset.start, expectedEnd: bin.dataset.end };
    })()`);
    assert(densityInteraction && densityInteraction.start === densityInteraction.expectedStart && densityInteraction.end === densityInteraction.expectedEnd, 'timeline density cluster does not drive the chronology window');

    console.log(`browser public Phase 9: PASS - ${timeline.count} current records through ${timeline.cutoff}; interactive spatial timeline, full chronology, side-ledger losses, progressive imagery, human labels, and ${ledger.claims} Lie Ledger propositions including ${populatedNarrativeFunctionDetails.length} narrative functions verified`);
  } finally {
    try { await cdp.call('Browser.close'); } catch (_) { /* workflow cleanup is the fallback */ }
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });