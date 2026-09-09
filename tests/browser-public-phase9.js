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
const lieLedgerModel = model.datasets['gate3.lie_ledger'].payload;
const liePropositions = lieLedgerModel.records.flatMap(chain => chain.proposition_records || []);

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
    assert.match(timeline.copy, /191 conflict days are represented/);
    assert(timeline.densityBins > 0, 'full-conflict density overview is absent');
    assert.match(timeline.densityText, /not greater strategic importance/i, 'timeline density implies analytical importance');
    assert.deepEqual(timeline.scaleLabels, ['Full', '4×', '8×', '16×']);
    assert.deepEqual(timeline.topicLabels, ['All topics', 'Military', 'Hormuz', 'Economy', 'Diplomacy', 'Losses and damage', 'Wider record'], 'Phase 10 scale presentation corrupted the Topic filter');
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
    const blockedModel = liePropositions.find(record => record.publication_status === 'BLOCKED_EVIDENCE_COMPLETION');
    const readyModel = liePropositions.find(record => record.publication_status === 'PUBLIC_READY' && record.truth_adjudication === 'FALSE') || liePropositions.find(record => record.publication_status === 'PUBLIC_READY');
    assert(blockedModel, 'public model lacks an evidence-completion regression case');
    assert(readyModel, 'public model lacks a publication-ready regression case');
    const ledger = await cdp.eval(`(() => {
      const blockedId = ${JSON.stringify(blockedModel.claim_instance_id)};
      const readyId = ${JSON.stringify(readyModel.claim_instance_id)};
      const openRecord = id => {
        const row = document.querySelector('[data-claim-instance-id="' + CSS.escape(id) + '"]');
        const chain = row?.closest('[data-chain-id]');
        if (chain) chain.open = true;
        if (row) row.open = true;
        return row;
      };
      const blocked = openRecord(blockedId);
      const ready = openRecord(readyId);
      return {
        chainCount: document.querySelectorAll('[data-chain-id]').length,
        propositionCount: document.querySelectorAll('[data-claim-instance-id]').length,
        blocked: blocked ? {
          publicationStatus: blocked.dataset.publicationStatus,
          truth: blocked.dataset.truthAdjudication,
          knowledge: blocked.dataset.knowledgeJudgment,
          text: blocked.innerText || ''
        } : null,
        ready: ready ? {
          publicationStatus: ready.dataset.publicationStatus,
          truth: ready.dataset.truthAdjudication,
          knowledge: ready.dataset.knowledgeJudgment,
          combined: ready.dataset.combinedAssessment,
          text: ready.innerText || '',
          evidenceComponents: [...ready.querySelectorAll('[data-evidence-component]')].map(node => node.dataset.evidenceComponent),
          evidenceDrawers: ready.querySelectorAll('[data-evidence-component] .evidence-drawer').length
        } : null,
        families: document.querySelector('.narrative-family-directory summary')?.textContent || '',
        chains: document.querySelector('.information-chain-directory summary')?.textContent || '',
        reliability: document.querySelector('.reliability-directory summary')?.textContent || '',
        controls: [...document.querySelectorAll('.lie-ledger-controls input, .lie-ledger-controls select')].map(node => node.getBoundingClientRect().height),
        text: document.querySelector('main')?.innerText || '',
        scoreAttrs: document.querySelectorAll('[data-deception-score]').length,
        scoreOptions: [...document.querySelectorAll('.lie-ledger-controls option')].filter(node => /deception score|0 — no evidence/i.test(node.textContent)).length
      };
    })()`);
    assert.equal(ledger.chainCount, lieLedgerModel.records.length, 'renderer does not use chain-first primary objects');
    assert.equal(ledger.propositionCount, liePropositions.length, 'renderer claim-instance population diverges from public v2 model');
    assert.match(ledger.families, new RegExp(`${records('gate3.narrative_families').length} narrative families`));
    assert.match(ledger.chains, new RegExp(`${records('gate3.information_chains').length} information chains`));
    assert.match(ledger.reliability, new RegExp(`${records('gate3.source_reliability').length} source and claimant histories`));
    assert(ledger.controls.every(height => height >= 44), 'Lie Ledger has a touch target below 44px');
    assert.match(ledger.text, /a false statement is not automatically a deliberate lie/i);
    assert.match(ledger.text, /factual status and knowledge are separate assessments/i);
    assert.equal(ledger.scoreAttrs, 0, 'legacy deception score remains in active DOM state');
    assert.equal(ledger.scoreOptions, 0, 'legacy deception score remains in active filter controls');
    assert(ledger.blocked, 'blocked v2 proposition is absent from renderer');
    assert.equal(ledger.blocked.publicationStatus, 'BLOCKED_EVIDENCE_COMPLETION');
    assert.equal(ledger.blocked.knowledge, 'WITHHELD_PENDING_EVIDENCE_QUALIFICATION');
    assert.match(ledger.blocked.text, /EVIDENCE COMPLETION REQUIRED/);
    assert.doesNotMatch(ledger.blocked.text, /LIKELY KNEW FALSE|VERY LIKELY KNEW FALSE|KNOWING FALSEHOOD ESTABLISHED/i, 'withheld canonical ROOK knowledge leaked into blocked public rendering');
    assert(ledger.ready, 'publication-ready v2 proposition is absent from renderer');
    assert.equal(ledger.ready.publicationStatus, 'PUBLIC_READY');
    assert.equal(ledger.ready.knowledge, readyModel.public_knowledge_judgment);
    assert.equal(ledger.ready.combined, readyModel.public_combined_assessment);
    assert.match(ledger.ready.text, /Factual verdict/i);
    assert.match(ledger.ready.text, /Knowledge judgment/i);
    assert.match(ledger.ready.text, /Combined ROOK assessment/i);
    assert.match(ledger.ready.text, /Confidence/i);
    assert.match(ledger.ready.text, /Falsifier|What would change/i);
    assert(ledger.ready.evidenceComponents.length > 0 && ledger.ready.evidenceDrawers > 0, 'component-level Evidence drawers are absent');

    const acceptedNarrativeFunctions = liePropositions.filter(record => typeof record.narrative_function === 'string' && record.narrative_function.trim()).map(record => ({
      claimInstanceId: record.claim_instance_id,
      narrativeFunction: record.narrative_function.trim(),
      displayValue: ia.publicNarrative(record.narrative_function),
      truthAdjudication: String(record.truth_adjudication || ''),
      knowledgeJudgment: String(record.public_knowledge_judgment || ''),
      combinedAssessment: String(record.public_combined_assessment || '')
    }));
    assert(acceptedNarrativeFunctions.length > 0, 'v2 public model exposes no narrative functions');
    const narrativeFunctionDetails = await cdp.eval(`(() => {
      const accepted = ${JSON.stringify(acceptedNarrativeFunctions)};
      return accepted.map(record => {
        const row = document.querySelector('[data-claim-instance-id="' + CSS.escape(record.claimInstanceId) + '"]');
        const chain = row?.closest('[data-chain-id]');
        if (chain) chain.open = true;
        if (row) row.open = true;
        const terms = [...(row?.querySelectorAll('.lie-ledger-detail dt') || [])];
        const term = terms.find(node => node.textContent.trim() === 'Narrative function');
        const value = term?.nextElementSibling?.textContent.trim() || '';
        return {
          claimInstanceId: record.claimInstanceId,
          exposed: Boolean(term),
          value,
          valueMatches: value === record.displayValue,
          machineTokens: value.match(/\\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\\b/g) || [],
          truthUnchanged: row?.dataset.truthAdjudication === record.truthAdjudication,
          knowledgeUnchanged: row?.dataset.knowledgeJudgment === record.knowledgeJudgment,
          combinedUnchanged: row?.dataset.combinedAssessment === record.combinedAssessment
        };
      });
    })()`);
    assert(narrativeFunctionDetails.every(record => record.exposed && record.value && record.valueMatches && !record.machineTokens.length), 'a v2 narrative function is missing, not humanized, or exposes machine language');
    assert(narrativeFunctionDetails.every(record => record.truthUnchanged && record.knowledgeUnchanged && record.combinedUnchanged), 'narrative-function display altered a ROOK factual/knowledge/combined finding');

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
      const blockedId = ${JSON.stringify(blockedModel.claim_instance_id)};
      const readyId = ${JSON.stringify(readyModel.claim_instance_id)};
      const blocked = document.querySelector('[data-claim-instance-id="' + CSS.escape(blockedId) + '"]');
      const ready = document.querySelector('[data-claim-instance-id="' + CSS.escape(readyId) + '"]');
      [blocked, ready].forEach(row => { const chain = row?.closest('[data-chain-id]'); if (chain) chain.open = true; if (row) row.open = true; });
      const desktopClockHost = main.querySelector('[data-component="EvidenceClocks"] .evidence-clock-desktop');
      const mobileClockHost = main.querySelector('[data-component="EvidenceClocks"] .evidence-clock-mobile');
      if (mobileClockHost) {
        mobileClockHost.open = true;
        mobileClockHost.querySelectorAll('.evidence-clock-help').forEach(help => { help.open = true; });
      }
      const clockView = host => ({
        labels: [...(host?.querySelectorAll('.evidence-clock-summary > strong') || [])].map(node => node.textContent.trim()),
        dateTimes: [...(host?.querySelectorAll('time') || [])].map(node => node.dateTime),
        displayTimes: [...(host?.querySelectorAll('time') || [])].map(node => node.textContent.trim())
      });
      return {
        title: main?.querySelector('h1')?.textContent.trim() || '',
        desktopClocks: clockView(desktopClockHost),
        mobileClocks: clockView(mobileClockHost),
        mobileDisclosureSummary: mobileClockHost?.querySelector(':scope > summary')?.innerText.trim() || '',
        mobileHelpLabels: [...(mobileClockHost?.querySelectorAll('.evidence-clock-help > summary') || [])].map(node => node.textContent.trim()),
        mobileDefinitionText: mobileClockHost?.querySelector('.evidence-clock-mobile-body')?.innerText || '',
        explainer: main?.innerText || '',
        blockedText: blocked?.innerText || '',
        readyText: ready?.innerText || '',
        evidenceSummary: ready?.querySelector('.evidence-drawer > summary')?.textContent.trim() || ''
      };
    })()`);
    assert.equal(phase10Ledger.title, 'Lie Ledger');
    assert.deepEqual(phase10Ledger.desktopClocks.labels, ['Frozen review cutoff', 'Current evidence cutoff']);
    assert.deepEqual(phase10Ledger.mobileClocks.labels, ['Current evidence cutoff', 'Frozen review cutoff']);
    assert.deepEqual(phase10Ledger.desktopClocks.dateTimes, [model.release.gate2_evidence_cutoff, model.release.current_osint_cutoff]);
    assert.deepEqual(phase10Ledger.mobileClocks.dateTimes, [model.release.current_osint_cutoff, model.release.gate2_evidence_cutoff]);
    assert.deepEqual(phase10Ledger.mobileClocks.displayTimes, [...phase10Ledger.desktopClocks.displayTimes].reverse(), 'desktop and mobile clocks do not expose the same two formatted cutoffs');
    assert.match(phase10Ledger.mobileDisclosureSummary, /Evidence through .*Historical review/i);
    assert.deepEqual(phase10Ledger.mobileHelpLabels, ['How current works', 'Why frozen?']);
    assert.match(phase10Ledger.mobileDefinitionText, /Current Atlas evidence includes material incorporated through this time\./);
    assert.match(phase10Ledger.mobileDefinitionText, /This cutoff advances when new evidence is incorporated\./);
    assert.match(phase10Ledger.mobileDefinitionText, /Historical evaluation uses only evidence available by this time\./);
    assert.match(phase10Ledger.mobileDefinitionText, /fixed evidence boundary used for the historical Gate 2 review/i);
    assert.match(phase10Ledger.explainer, /Factual status and knowledge are separate assessments\./i);
    assert.match(phase10Ledger.explainer, /A false statement is not automatically a deliberate lie/i);
    assert.match(phase10Ledger.blockedText, /EVIDENCE COMPLETION REQUIRED/);
    assert.match(phase10Ledger.readyText, /Combined ROOK assessment/i);
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
      notAdjudicated: [...document.querySelectorAll('[data-agreement-balance] .agreement-current-balance')].filter(node => node.textContent.trim() === 'Balance not adjudicated').length,
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

    console.log(`browser public Phase 9: PASS - ${timeline.count} current records through ${timeline.cutoff}; interactive spatial timeline, full chronology, side-ledger losses, progressive imagery, human labels, and ${ledger.chainCount} Lie Ledger chains / ${ledger.propositionCount} claim instances verified`);
  } finally {
    try { await cdp.call('Browser.close'); } catch (_) { /* workflow cleanup is the fallback */ }
    cdp.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
