'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ia = require('../js/public-ia.js');
const {
  assertLossRecordDenominator,
  assertCampaignEventCountSemanticBoundary
} = require('./public-copy-semantics.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const model = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'public-current-state.json'), 'utf8'));
const records = key => {
  const payload = model.datasets[key].payload;
  if (Array.isArray(payload)) return payload;
  return payload.records || payload.items || payload.events || payload.entries || [];
};
const lieLedgerModel = model.datasets['gate3.lie_ledger'].payload;
const liePropositions = lieLedgerModel.records.flatMap(chain => chain.proposition_records || []);
const readerChains = lieLedgerModel.records.filter(chain => chain.public_include_in_accusation_count !== false);
const expectedReaderChains = readerChains.length;
const f15ModelChain = readerChains.find(chain => chain.chain_id === 'CH-F15E-CSAR-URANIUM');
assert(f15ModelChain, 'canonical F-15E reference chain is missing from reader model');
const expectedF15Title = f15ModelChain.public_title || f15ModelChain.title || f15ModelChain.reader_title || '';
const expectedF15Reasons = f15ModelChain.how_we_know || [];
const parentFindingLabel = chain => {
  const raw = chain.public_finding || chain.event_level_finding || chain.chain_finding;
  if (!raw) return '';
  const label = (typeof raw === 'object'
    ? String(raw.label || raw.public_label || raw.finding || '')
    : String(raw)).trim();
  const normalized = label.toLowerCase();
  if (/false custody claim.*likely lie/.test(normalized)) return 'False / likely lie';
  if (/false.*(?:no lie finding|knowledge not established)/.test(normalized)) return 'False';
  if (/(?:overstated|misleading).*(?:no lie finding|knowledge not established)/.test(normalized)) return 'Misleading';
  if (/(?:unresolved|exact line-item tally).*(?:no parent lie finding|no lie finding)/.test(normalized)) return 'Unverified';
  return label;
};
const expectedParentFindingLabels = readerChains.map(parentFindingLabel).filter(Boolean);
const expectedParentFindings = expectedParentFindingLabels.length;

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
      topicLabels: [...document.querySelectorAll('.timeline-controls label')].find(label => /^Topic/.test(label.textContent.trim())) ? [...[...document.querySelectorAll('.timeline-controls label')].find(label => /^Topic/.test(label.textContent.trim())).querySelectorAll('option')].map(option => option.textContent.trim()) : [],
      fullLabel: [...document.querySelectorAll('.timeline-navigation button')].find(button => /full conflict/i.test(button.textContent))?.textContent.trim() || ''
    }))()`);
    assert.equal(timeline.count, model.counts.chronology_records);
    assert.equal(timeline.cutoff, model.release.current_osint_cutoff);
    assert(timeline.clusters > 0 && timeline.events === 0, 'full-war timeline is not clustered');
    assert.equal(timeline.map, true, 'active temporal window lacks contextual map state');
    assert.equal(timeline.prewar, 'distinct');
    assert(timeline.controls.every(height => height >= 44), 'timeline has a touch target below 44px');
    assert(timeline.copy.includes(`Detailed Chronology contains all ${model.counts.chronology_records} records.`));
    assert(timeline.copy.includes(`${model.counts.gate3_daily_coverage_days} conflict days are represented`));
    assert(timeline.densityBins > 0, 'full-conflict density overview is absent');
    assert.match(timeline.densityText, /not greater strategic importance/i, 'timeline density implies analytical importance');
    assert.deepEqual(timeline.scaleLabels, ['Full', '4×', '8×', '16×']);
    assert.deepEqual(timeline.topicLabels, ['All topics', 'Military', 'Hormuz', 'Economy', 'Diplomacy', 'Losses and damage', 'Wider record'], 'timeline scale presentation corrupted the Topic filter');
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
      const main = document.querySelector('main');
      const cards = [...main.querySelectorAll('.reader-ledger-chain-card')];
      const first = cards[0];
      const f15Card = cards.find(card =>
        card.querySelector(':scope > .reader-ledger-card-head h3')?.textContent.trim() === ${JSON.stringify(expectedF15Title)}
      );
      const f15Why = f15Card?.querySelector('.reader-chain-how-we-know');
      if (f15Why) f15Why.open = true;
      const why = first?.querySelector('.reader-how-we-know');
      const whySummary = why?.querySelector(':scope > summary');
      if (whySummary) {
        whySummary.focus();
        whySummary.click();
      }
      const evidenceSummary = why?.querySelector('.evidence-drawer > summary');
      if (evidenceSummary) evidenceSummary.click();
      const search = main.querySelector('.reader-ledger-controls input[type="search"]');
      const select = main.querySelector('.reader-ledger-controls select');
      const statuses = cards.map(card => card.querySelector(':scope > .reader-ledger-card-head .reader-claim-status')?.textContent.trim() || '').filter(Boolean);
      const internalSelectors = main.querySelectorAll('[data-claim-instance-id], [data-chain-id], [data-publication-status], [data-combined-assessment]').length;
      const technicalMetadata = main.querySelectorAll('.technical-record-metadata, .evidence-role-guide').length;
      const text = main.innerText || '';
      return {
        cards: cards.length,
        statuses,
        f15Found: Boolean(f15Card),
        f15Reasons: [...(f15Why?.querySelectorAll(':scope > .reader-explanation-list > li') || [])].map(node => node.textContent.trim()),
        logicInternals: main.querySelectorAll('.reader-chain-logic, .reader-logic-relations').length,
        why: Boolean(why),
        whyFocusable: !whySummary || document.activeElement === whySummary,
        whyOpen: Boolean(why?.open),
        evidence: Boolean(evidenceSummary),
        evidenceOpen: !evidenceSummary || Boolean(evidenceSummary.parentElement.open),
        controls: [...main.querySelectorAll('.reader-ledger-controls input, .reader-ledger-controls select')].map(node => node.getBoundingClientRect().height),
        search: Boolean(search),
        select: Boolean(select),
        internalSelectors,
        technicalMetadata,
        text,
        scoreAttrs: main.querySelectorAll('[data-deception-score]').length,
        oldControls: main.querySelectorAll('.lie-ledger-controls').length,
        clocks: main.querySelectorAll('[data-component="EvidenceClocks"], .evidence-clocks, .evidence-clock-bar').length,
        singleFindings: main.querySelectorAll('.reader-single-finding .reader-claim-status').length,
        actorFlags: main.querySelectorAll('.reader-actor-kicker img.actor-flag').length,
        duplicateWolPromo: main.querySelectorAll('.reader-wol-entry').length
      };
    })()`);
    assert.equal(ledger.cards, expectedReaderChains, 'reader Lie Ledger must render exactly one top-level card per narrative chain');
    assert(ledger.cards > 0, 'reader-facing chain ledger is empty');
    assert.equal(ledger.statuses.length, expectedParentFindings, 'reader chain-header findings must match explicit canonical parent findings only');
    assert(ledger.statuses.every(value => expectedParentFindingLabels.includes(value)), 'reader chain header must preserve a canonical parent-finding label');
    assert.equal(ledger.f15Found, true, 'reader lost the canonical F-15E reference chain');
    assert(ledger.f15Reasons.length > 0 && ledger.f15Reasons.length <= expectedF15Reasons.length,
      'Why these findings must preserve the canonical reasoning while allowing a plain-English reader projection');
    assert.doesNotMatch(
      ledger.f15Reasons.join(' '),
      /\b(?:proposition|denominator|canonical|BDA|adjudicat(?:e|ed|ion)|knowledge attribution|lie threshold)\b/i,
      'reader-facing F-15E reasoning still exposes forensic-office jargon'
    );
    assert.equal(ledger.logicInternals, 0,
      'internal Claims Forensics logic-graph relations must not be rendered on the public Lie Ledger');
    assert(ledger.why && ledger.whyFocusable && ledger.whyOpen, 'reader evidence explanation is not keyboard-openable');
    assert(ledger.evidence && ledger.evidenceOpen, 'reader evidence drawer is not discoverable/openable');
    assert(ledger.controls.length >= 2 && ledger.controls.every(height => height >= 44), 'reader claim controls have a touch target below 44px');
    assert(ledger.search && ledger.select, 'reader claim search/filter controls are missing');
    assert.equal(ledger.internalSelectors, 0, 'internal claim-instance/chain/publication metadata remains in the reader DOM');
    assert.equal(ledger.technicalMetadata, 0, 'technical metadata remains in the reader DOM');
    assert.equal(ledger.scoreAttrs, 0, 'legacy deception score remains in active DOM state');
    assert.equal(ledger.oldControls, 0, 'legacy forensic-workstation controls remain active');
    assert.equal(ledger.clocks, 0, 'evidence-clock machinery remains on the ordinary reader claim page');
    assert(ledger.singleFindings > 0, 'single-branch records do not expose a direct visible finding');
    assert(ledger.actorFlags > 0, 'state-affiliated Lie Ledger actors do not show country flags');
    assert.equal(ledger.duplicateWolPromo, 0, 'duplicate Web of Lies promo still pushes the ledger below the fold');
    assert.doesNotMatch(ledger.text, /Combined ROOK assessment|ROOK verdict|PR\/CI|claim_instance_id|proposition_id|chain_id|publication blocker|supports factual baseline|documents correction|typed links|proposition nodes/i, 'internal authority/schema language leaked into reader claims');
    assert.doesNotMatch(ledger.text, /False does not mean lie unless|That is why this branch is labeled False rather than Lie|no (?:parent )?Lie finding/i, 'threshold-caution language leaked into the reader presentation');
    assert.match(ledger.text, /Each card shows the claim, the finding, what happened and the evidence/i);
    assert.match(ledger.text, /Why these findings/i);

    const filteredLedger = await cdp.eval(`(() => {
      const main = document.querySelector('main');
      const search = main.querySelector('.reader-ledger-controls input[type="search"]');
      const first = main.querySelector('.reader-ledger-chain-card');
      const term = first?.querySelector('h3')?.textContent.trim().split(/\s+/).find(word => word.length >= 5) || '';
      if (!search || !term) return null;
      search.value = term;
      search.dispatchEvent(new Event('input', { bubbles: true }));
      return {
        term,
        visible: [...main.querySelectorAll('.reader-ledger-chain-card')].filter(card => !card.hidden).length,
        count: main.querySelector('.reader-ledger-controls .filter-result-count')?.textContent.trim() || ''
      };
    })()`);
    assert(filteredLedger && filteredLedger.visible > 0, 'reader chain search does not preserve matching chains');
    assert.match(filteredLedger.count, /^\d+ of \d+ chains shown$/);

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
      const drawer = card?.querySelector('.evidence-drawer');
      if (drawer) drawer.open = true;
      return { before: main?.innerText || '', after: card?.innerText || '' };
    })()`);
    assert(!/Stable strike record(?: ID)?:/i.test(technicalRecord.before), 'internal strike ID is visible on the reader surface');
    assert(!/Stable strike record(?: ID)?:/i.test(technicalRecord.after), 'internal strike ID leaks through ordinary evidence expansion');

    for (const width of [320, 390]) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: true });
      await route(cdp, '#/evidence/information', 'evidence.information');
      const mobile = await cdp.eval(`(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        controls: [...document.querySelectorAll('.reader-ledger-controls input, .reader-ledger-controls select')].map(node => node.getBoundingClientRect().height),
        summaries: [...document.querySelectorAll('.reader-how-we-know > summary')].map(node => node.getBoundingClientRect().height)
      }))()`);
      assert(mobile.scrollWidth <= mobile.width, `reader information page overflows at ${width}px`);
      assert(mobile.controls.every(height => height >= 44), `reader claim control below 44px at ${width}px`);
      assert(mobile.summaries.length > 0 && mobile.summaries.every(height => height >= 44), `reader evidence disclosure below 44px at ${width}px`);
    }
    await cdp.call('Emulation.clearDeviceMetricsOverride');

    await route(cdp, '#/military/campaigns', 'military.campaigns');
    const phase10Effects = await cdp.eval(`(() => ({
      text: document.querySelector('main')?.innerText || '',
      cards: document.querySelectorAll('.effect-framework-card').length,
      drilldown: document.querySelector('[data-reader-drilldown="event-constituents"]')?.textContent || ''
    }))()`);
    assert.equal(phase10Effects.cards, 7);
    assert.match(phase10Effects.text, /How damage and operational effect are separated/);
    assert.match(phase10Effects.text, /Attack occurrence, physical effect and operational consequence are separate/i);
    assert.match(phase10Effects.text, /does not automatically prove a mission kill, destroyed platform or whole-site shutdown/i);
    assertCampaignEventCountSemanticBoundary(phase10Effects.drilldown);

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
    assertLossRecordDenominator(lossAudit.comparisonText);
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
    assert.match(shippingVisual.text, /\bschematic\b/i, 'Shipping presentation does not identify route geometry as schematic');
    assert.match(shippingVisual.text, /not[^.\n]{0,160}precise vessel tracks/i, 'Shipping presentation does not disclaim precise vessel tracks');
    assert.match(shippingVisual.text, /not[^.\n]{0,160}surveyed alignment/i, 'Shipping presentation does not disclaim surveyed alignment');
    assert.match(shippingVisual.text, /not[^.\n]{0,160}targeting(?:-quality geometry| data)?/i, 'Shipping presentation does not disclaim targeting-quality use');
    assert.match(shippingVisual.text, /not[^.\n]{0,160}live tracking[^.\n]{0,160}navigation data/i, 'Shipping presentation does not disclaim live-tracking/navigation use');

    await route(cdp, '#/hormuz/economy', 'hormuz.economy');
    const economyVisual = await cdp.eval(`(() => ({
      interpolation: document.querySelector('[data-economic-viz]')?.dataset.interpolation || '',
      cards: document.querySelectorAll('[data-economic-country]').length,
      tableRows: document.querySelectorAll('.economic-numeric-equivalent tbody tr').length,
      hasConnectingPolyline: Boolean(document.querySelector('[data-economic-viz] svg polyline, [data-economic-viz] svg path[data-series]')),
      text: document.querySelector('[data-economic-viz]')?.innerText || '',
      duplicatedCorridorInventory: Boolean([...document.querySelectorAll('h2')].find(node => node.textContent.trim() === 'Strategic transport corridors'))
    }))()`);
    assert.equal(economyVisual.interpolation, 'none');
    assert.equal(economyVisual.cards, model.datasets['ledger.economics'].payload.forecast_context.rows.length);
    assert.equal(economyVisual.tableRows, economyVisual.cards);
    assert.equal(economyVisual.hasConnectingPolyline, false, 'economy snapshots are visually connected as an invented continuous series');
    assert.match(economyVisual.text, /does not interpolate values between observations/i);
    assert.equal(economyVisual.duplicatedCorridorInventory, false, 'Economy duplicates the Shipping & Trade corridor inventory');

    await route(cdp, '#/talks/june-mou', 'talks.mou');
    const mouVisual = await cdp.eval(`(() => ({
      analystMatrix: document.querySelectorAll('[data-agreement-balance], .agreement-balance-matrix').length,
      ranges: document.querySelectorAll('[data-agreement-balance] input[type="range"]').length,
      scoreText: (document.querySelector('main')?.innerText || '').replaceAll(' ', '').includes('/100'),
      clauses: document.querySelectorAll('[data-clause-id], .agreement-clause').length,
      text: document.querySelector('main')?.innerText || ''
    }))()`);
    assert.equal(mouVisual.analystMatrix, 0, 'internal analyst-position matrix remains on the public MOU page');
    assert.equal(mouVisual.ranges, 0, 'MOU balance was rendered as a continuous slider');
    assert.equal(mouVisual.scoreText, false, 'internal /100 analyst position leaked into the public MOU page');
    assert.match(mouVisual.text, /Read all 14 clauses|Read the agreement clause by clause/i, 'reader-accessible clause detail is missing after score removal');

    await route(cdp, '#/timeline/war', 'timeline.war');
    const densityInteraction = await cdp.eval(`(() => {
      const bin = document.querySelector('.timeline-density-bin'); const inputs = document.querySelectorAll('.timeline-controls input[type="date"]'); if (!bin || inputs.length < 2) return null; bin.click(); return { start: inputs[0].value, end: inputs[1].value, expectedStart: bin.dataset.start, expectedEnd: bin.dataset.end };
    })()`);
    assert(densityInteraction && densityInteraction.start === densityInteraction.expectedStart && densityInteraction.end === densityInteraction.expectedEnd, 'timeline density cluster does not drive the chronology window');

    console.log(`browser public reader/Phase 9: PASS - ${timeline.count} current records through ${timeline.cutoff}; interactive timeline, chronology, losses, imagery, ${ledger.cards} reader claims, public/internal boundary, maps, economics and score-free MOU presentation verified`);
  } finally {
    try { await cdp.call('Browser.close'); } catch (_) { /* workflow cleanup is the fallback */ }
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });