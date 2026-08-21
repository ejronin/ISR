(function attachForensic(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AtlasForensic = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function forensicFactory() {
  'use strict';

  const FILES = {
    manifest: 'manifest.json', losses: 'iran-loss-envelopes.json', leaders: 'iran-leadership-casualties.json',
    claims: 'iranian-claim-evolution.json', chains: 'claim-chain-index.json', sources: 'sources.json',
    assessments: 'public-assessments.json', facilities: 'facility-claim-audits.json', pilots: 'pilot-rescue-timeline.json'
  };
  const CORRECTION_ID = 'CASE-US-REGIONAL-ABANDONMENT-NARRATIVE-2026';
  const HUMAN_LABELS = {
    NAVAL_LOSSES: 'Naval losses', AIRCRAFT: 'Aircraft', AIR_DEFENSE_RADAR: 'Air defense & radar', LAUNCHERS: 'Launchers',
    MISSILE_UAS_INVENTORY: 'Missile / UAS inventory', COMMAND_C2: 'Command & C2', FIXED_INFRASTRUCTURE: 'Fixed infrastructure',
    INDUSTRIAL_PRODUCTION: 'Industrial production', MUNITIONS_EXPENDITURE: 'Munitions expenditure',
    SENIOR_POLITICAL_STATE: 'Political / state leadership', SENIOR_MILITARY_SECURITY: 'Military / security leadership'
  };

  const label = value => HUMAN_LABELS[value] || String(value || 'Unresolved').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  const textOf = value => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(textOf).join(' ');
    return Object.values(value).map(textOf).join(' ');
  };
  const displayValue = value => {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(displayValue).join(' · ');
    if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${label(key)}: ${displayValue(item)}`).join(' · ');
    const raw = String(value);
    return /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(raw) ? label(raw) : raw;
  };
  const humanText = value => String(value || '').replace(/\b[A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, token => label(token));
  const usd = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);
  const usdExact = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  function groupCasualties(records) {
    const rows = records || [];
    return {
      current: rows.filter(row => row.current_status === 'ACTIVE_RECORD' && row.aggregation_type !== 'ADDITIVE_EVENT'),
      events: rows.filter(row => row.current_status === 'ACTIVE_RECORD' && row.aggregation_type === 'ADDITIVE_EVENT'),
      superseded: rows.filter(row => row.current_status !== 'ACTIVE_RECORD')
    };
  }

  function lossViewModel(losses) {
    const summary = losses.aggregate_material_loss_summary;
    const categories = (losses.categories || []).filter(row => row.category !== 'MUNITIONS_EXPENDITURE');
    const munitions = (losses.categories || []).find(row => row.category === 'MUNITIONS_EXPENDITURE');
    return { summary, categories, munitions };
  }

  function createTemporalIndex(ledger, forensic) {
    const canonical = (ledger.events?.events || []).map(event => ({ ...event, temporal_record_type: 'CANONICAL_EVENT' }));
    const annotations = [];
    (ledger.casualties?.records || []).forEach(row => annotations.push({
      event_id: `ANNOTATION-CASUALTY-${row.casualty_id}`, event_date: row.event_date, summary: `${row.country} casualty record`,
      record_class: 'EVIDENCE ANNOTATION', event_type: 'CASUALTY', evidence_status: row.evidence_status || 'SUPPORTED', confidence: row.confidence || 'UNRESOLVED',
      actors: [row.country], target: label(row.display_category), source_refs: row.source_ids || [], map_refs: row.map_refs || [], facility_refs: row.facility_refs || [],
      temporal_record_type: 'ANNOTATION', annotation_source_id: row.casualty_id
    }));
    (ledger['material-losses']?.records || []).forEach(row => annotations.push({
      event_id: `ANNOTATION-MATERIAL-${row.loss_id}`, event_date: row.event_date, summary: `${row.owner} — ${row.item}`,
      record_class: 'EVIDENCE ANNOTATION', event_type: 'MATERIAL LOSS', evidence_status: row.confidence || 'SUPPORTED', confidence: row.confidence || 'UNRESOLVED',
      actors: [row.owner], target: row.item, source_refs: row.source_ids || [], map_refs: row.map_refs || [], facility_refs: row.facility_refs || [],
      temporal_record_type: 'ANNOTATION', annotation_source_id: row.loss_id
    }));
    (forensic.leaders?.records || []).forEach(row => annotations.push({
      event_id: `ANNOTATION-LEADER-${row.leadership_id}`, event_date: row.death_date, summary: `${row.name} — ${row.role_at_death}`,
      record_class: 'EVIDENCE ANNOTATION', event_type: 'LEADERSHIP CASUALTY', evidence_status: row.death_status, confidence: row.analytic_confidence,
      actors: ['Iran'], target: row.name, source_refs: row.sources || [], map_refs: [], facility_refs: [], temporal_record_type: 'ANNOTATION', annotation_source_id: row.leadership_id
    }));
    const kc135 = annotations.filter(row => /KC-?135|refuel/i.test(row.summary));
    if (!kc135.length) {
      annotations.push({ event_id: 'ANNOTATION-KC135-DISCOVERY', event_date: '2026-03-12', summary: 'KC-135 loss / crew casualty evidence', record_class: 'EVIDENCE ANNOTATION', event_type: 'MATERIAL LOSS', evidence_status: 'SUPPORTED', confidence: 'HIGH', actors: ['United States'], target: 'KC-135', source_refs: [], map_refs: [], facility_refs: [], temporal_record_type: 'ANNOTATION', annotation_source_id: 'M002+C003' });
    }
    annotations.forEach(row => { row.first_reported = row.first_reported || row.event_date; row.first_verified = row.first_verified || row.event_date; });
    return canonical.concat(annotations).sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)) || a.event_id.localeCompare(b.event_id));
  }

  function buildSearchIndex({ ledger, forensic, legacy }) {
    const results = [];
    const add = (type, id, title, subtitle, view, record, mapRef) => results.push({ type, id, title, subtitle: humanText(subtitle), view, record, mapRef, haystack: `${title} ${subtitle} ${textOf(record)}`.toLowerCase() });
    (ledger.facilities?.facilities || []).forEach(row => add('facility', row.facility_id, row.name, textOf(row.verified_functional_effect), 'facilities', row, row.facility_id));
    (ledger.events?.events || []).forEach(row => add('event', row.event_id, row.summary, `${row.event_date} ${row.target || ''}`, 'timeline', row, (row.map_refs || [])[0] || (row.facility_refs || [])[0]));
    (ledger.claims?.claims || []).forEach(row => add('case', row.case_id, row.claim, row.current_verdict, 'claims', row, (row.map_refs || [])[0] || (row.facility_refs || [])[0]));
    (ledger['material-losses']?.records || []).forEach(row => add('loss', row.loss_id, row.item, row.owner, 'losses', row, (row.map_refs || [])[0]));
    (forensic.leaders?.records || []).forEach(row => add('leader', row.leadership_id, row.name, row.role_at_death, 'losses', row));
    (forensic.facilities?.records || []).forEach(row => add('facility-audit', row.facility_audit_id, `${row.facility_name} — facility / component audit`, 'BDA propositions and whole-site assessment', 'imagery', row, row.facility_id));
    (forensic.chains?.chains || []).forEach(row => add('claim-chain', row.chain_id, row.label, row.assessment, 'claims', row));
    (forensic.losses?.categories || []).forEach(row => add('loss-category', row.category, label(row.category), row.model_status, 'losses', row));
    (forensic.sources?.sources || []).forEach(row => add('source', row.source_id, `${row.outlet} — ${row.title || 'Untitled source'}`, (row.source_roles || []).map(label).join(' · '), 'sources', row));
    Object.entries(legacy || {}).forEach(([key, rows]) => (Array.isArray(rows) ? rows : []).forEach((row, index) => add('atlas-record', row.id || `${key}-${index}`, row.name || row.title || key, `${row.date || row.event_date || row.status || label(key)} · ${row.id || ''}`, key === 'arcticRoutes' ? 'arctic' : 'snapshot', row, row.id)));
    return results;
  }

  function searchIndex(index, query, limit = 40) {
    const words = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return (index || []).filter(row => words.every(word => row.haystack.includes(word))).slice(0, limit);
  }

  function renderBrowser() {
    if (typeof document === 'undefined') return;
    const root = globalThis;
    const fetchJson = async path => { const response = await fetch(path, { cache: 'no-store' }); if (!response.ok) throw new Error(`${path}: ${response.status}`); return response.json(); };
    const el = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value != null) node.textContent = value; return node; };
    const add = (parent, tag, className, value) => { const node = el(tag, className, value); parent.appendChild(node); return node; };
    const badge = value => el('span', `forensic-badge forensic-${String(value).toLowerCase().replace(/[^a-z]+/g, '-')}`, label(value));
    const sourceButton = (sourceId, forensic) => { const button = el('button', 'source-detail-button', sourceId); button.type = 'button'; button.dataset.sourceId = sourceId; button.dataset.forensicSource = 'true'; button.title = forensic.sourcesById.get(sourceId)?.title || 'Open source record'; return button; };
    const moneyRange = range => `${usd(range.low)} / ${usd(range.central)} / ${usd(range.high)}`;
    let forensic = null;
    let searchRows = [];
    let drawer = null;

    function openDrawer(title, subtitle, record, sources, options = {}) {
      if (!drawer) return;
      drawer.querySelector('.forensic-drawer-title').textContent = title;
      drawer.querySelector('.forensic-drawer-subtitle').textContent = subtitle || '';
      const body = drawer.querySelector('.forensic-drawer-body'); body.replaceChildren();
      if (record?.factual_propositions) {
        record.factual_propositions.forEach(prop => { const article = add(body, 'article', 'proposition-card'); article.appendChild(badge(prop.disposition)); add(article, 'h3', '', prop.proposition); add(article, 'p', '', prop.basis); });
      } else if (record?.propositions) {
        record.propositions.forEach(prop => { const article = add(body, 'article', 'proposition-card'); article.appendChild(badge(prop.disposition)); add(article, 'h3', '', prop.question); add(article, 'p', '', (prop.inference_basis || []).join(' ')); });
      } else if (record?.envelopes) {
        record.envelopes.forEach(envelope => { const article = add(body, 'article', 'proposition-card cost-envelope-detail'); article.appendChild(badge(envelope.estimate_status)); add(article, 'h3', '', `${envelope.label} · ${usdExact(envelope.estimated_cost_usd)}`); add(article, 'p', '', envelope.quantity_basis); add(article, 'p', '', envelope.methodology); const assumptions = add(article, 'small', '', `Confidence: ${label(envelope.confidence)} · ${label(envelope.additivity)}`); assumptions.className = 'cost-assumptions'; });
      } else {
        const dl = add(body, 'dl', 'forensic-detail-list');
        Object.entries(record || {}).filter(([key, value]) => value != null && value !== '' && !['url', 'sources', 'source_ids', 'source_refs'].includes(key)).slice(0, 16).forEach(([key, value]) => {
          add(dl, 'dt', '', label(key)); add(dl, 'dd', '', displayValue(value));
        });
      }
      const refs = sources || record?.sources || record?.source_ids || record?.source_refs || [];
      const temporalDate = record?.death_date || record?.claim_date || record?.event_date || record?.start_date;
      const temporalNeedle = record?.name || record?.claim_id || record?.chain_id || record?.leadership_id;
      if (temporalDate && temporalNeedle) { const chronology = add(body, 'button', 'drawer-chronology-button', 'Open related chronology'); chronology.type = 'button'; chronology.addEventListener('click', () => { drawer.hidden = true; const selected = root.AtlasState?.get?.().selectedRecord; root.AtlasState?.set?.({ activeView: 'timeline', activePrimaryGroup: 'overview', selectedRecord: selected, timeCutoff: temporalDate.length >= 10 ? temporalDate.slice(0,10) : root.AtlasState.get().timeCutoff, activeFilters: [temporalNeedle] }, { source: 'chronology-link' }); root.showAtlasPanel?.('timeline', { writeState: false }); const search = document.getElementById('timelineSearch'); if (search) { search.value = temporalNeedle; root.renderAtlasTimeline?.(temporalNeedle); } }); }
      if (refs.length) { const section = add(body, 'section', 'drawer-sources'); add(section, 'h3', '', 'Evidence sources'); refs.forEach(ref => section.appendChild(sourceButton(typeof ref === 'string' ? ref : ref.source_id, forensic))); }
      if (record?.url && /^https:\/\//i.test(record.url)) { const outbound = add(body, 'a', 'outbound-source-link', 'Open publisher in new tab'); outbound.href = record.url; outbound.target = '_blank'; outbound.rel = 'noopener noreferrer'; }
      drawer.hidden = false; drawer.querySelector('.forensic-drawer-close').focus();
      if (options.writeState !== false) { const id = record?.claim_id || record?.chain_id || record?.leadership_id || record?.category || record?.facility_audit_id || record?.source_id || record?.case_id || title; const type = record?.claim_id ? 'claim' : record?.chain_id ? 'claim-chain' : record?.leadership_id ? 'leader' : record?.facility_audit_id ? 'facility-audit' : record?.source_id ? 'source' : 'record'; root.AtlasState?.set?.({ selectedRecord: { type, id } }, { source: 'selection' }); }
    }

    function buildDrawer() {
      drawer = add(document.body, 'aside', 'forensic-drawer'); drawer.hidden = true; drawer.setAttribute('aria-label', 'Evidence detail');
      const header = add(drawer, 'header', 'forensic-drawer-header'); const copy = add(header, 'div'); add(copy, 'div', 'forensic-drawer-subtitle'); add(copy, 'h2', 'forensic-drawer-title');
      const close = add(header, 'button', 'forensic-drawer-close', 'Close'); close.type = 'button'; close.addEventListener('click', () => { drawer.hidden = true; });
      add(drawer, 'div', 'forensic-drawer-body');
    }

    function renderLosses(query = '') {
      const target = document.getElementById('lossList'); if (!target) return;
      target.replaceChildren(); const model = lossViewModel(forensic.losses); const scenario = root.AtlasState?.get?.().lossScenario || 'central';
      const assessment = add(target, 'section', 'forensic-assessment-strip');
      forensic.assessments.assessments.forEach(row => { const article = add(assessment, 'article'); article.appendChild(badge(row.analytic_likelihood)); add(article, 'p', '', row.text); article.addEventListener('click', () => openDrawer('Public assessment', `${label(row.analytic_likelihood)} · ${label(row.analytic_confidence)}`, row, row.sources)); });
      const hero = add(target, 'section', 'loss-envelope'); add(hero, 'div', 'eyebrow', 'IRAN STANDING MATERIAL LOSS · CALCULATED RANGE'); add(hero, 'strong', 'loss-range', moneyRange(model.summary.material_loss_range_usd)); add(hero, 'p', '', 'Low evidence-supported floor / central modeled estimate / assessed upper envelope. Eight additive categories; current loss only.');
      const exact = add(hero, 'details', 'exact-loss-values'); add(exact, 'summary', '', 'Exact values and accounting scope'); add(exact, 'p', '', `${usdExact(model.summary.material_loss_range_usd.low)} / ${usdExact(model.summary.material_loss_range_usd.central)} / ${usdExact(model.summary.material_loss_range_usd.high)}`); add(exact, 'p', '', model.summary.accounting_scope);
      const scenarios = add(hero, 'div', 'scenario-switch'); ['low', 'central', 'high'].forEach(key => { const button = add(scenarios, 'button', key === scenario ? 'active' : '', `${key.toUpperCase()} · ${usd(model.summary.material_loss_range_usd[key])}`); button.type = 'button'; button.addEventListener('click', () => { root.AtlasState?.set?.({ lossScenario: key }, { source: 'loss-scenario' }); renderLosses(query); }); });
      const grid = add(target, 'section', 'forensic-category-grid');
      model.categories.filter(row => !query || textOf(row).toLowerCase().includes(query.toLowerCase())).forEach(row => {
        const card = add(grid, 'button', 'loss-category-card'); card.type = 'button'; add(card, 'span', 'loss-category-name', label(row.category)); add(card, 'strong', '', usd(row.cost_model_range_usd[scenario])); add(card, 'small', '', `CALCULATED · ${label(row.model_status)}`); card.addEventListener('click', () => openDrawer(label(row.category), moneyRange(row.cost_model_range_usd), row, row.envelopes?.[scenario === 'low' ? 0 : scenario === 'central' ? 1 : 2]?.source_ids));
      });
      const mun = add(target, 'section', 'munitions-separate'); add(mun, 'div', 'eyebrow', 'SEPARATE ACCOUNTING STREAM · NOT ADDITIVE'); add(mun, 'h2', '', 'Munitions expended'); add(mun, 'strong', '', moneyRange({ low: model.munitions.cost_model_range_usd.all_region_model_low, central: model.munitions.cost_model_range_usd.all_region_model_central, high: model.munitions.cost_model_range_usd.all_region_model_high })); add(mun, 'p', '', 'CALCULATED RANGE · 6,770 combined launches through Mar. 31. Low 1,234 missiles / 5,536 UAS; central 1,909 / 4,861; high 2,286 / 4,484.');
      const munExact = add(mun, 'details', 'exact-loss-values'); add(munExact, 'summary', '', 'Exact expenditure values'); add(munExact, 'p', '', `${usdExact(model.munitions.cost_model_range_usd.all_region_model_low)} / ${usdExact(model.munitions.cost_model_range_usd.all_region_model_central)} / ${usdExact(model.munitions.cost_model_range_usd.all_region_model_high)}`);
      const leaders = add(target, 'section', 'leadership-ledger'); add(leaders, 'div', 'eyebrow', 'CANONICAL ITEMIZED MINIMUM · 11 PEOPLE'); add(leaders, 'h2', '', 'Senior Iranian leadership casualties');
      ['SENIOR_POLITICAL_STATE', 'SENIOR_MILITARY_SECURITY'].forEach(category => { const group = add(leaders, 'section', 'leader-group'); add(group, 'h3', '', label(category)); forensic.leaders.records.filter(row => row.category === category && (!query || textOf(row).toLowerCase().includes(query.toLowerCase()))).forEach(row => { const button = add(group, 'button', 'leader-row'); button.type = 'button'; add(button, 'span', '', row.name); add(button, 'small', '', `${row.role_at_death} · ${row.death_date}`); button.addEventListener('click', () => openDrawer(row.name, `${label(row.category)} · ${row.death_date}`, row, row.sources)); }); });
      renderCasualties(target, query);
    }

    function renderCasualties(target, query) {
      const groups = groupCasualties(root.ATLAS_LEDGER.casualties.records); const wrap = add(target, 'section', 'casualty-ledger'); add(wrap, 'div', 'eyebrow', 'CASUALTIES · NON-ADDITIVE SNAPSHOTS KEPT SEPARATE'); add(wrap, 'h2', '', 'Current totals, events, and prior snapshots');
      [['Current cumulative records', groups.current], ['Additive event records', groups.events]].forEach(([title, rows]) => { const section = add(wrap, 'section', 'casualty-lane'); add(section, 'h3', '', title); rows.filter(row => !query || textOf(row).toLowerCase().includes(query.toLowerCase())).forEach(row => { const article = add(section, 'article'); add(article, 'b', '', row.country); add(article, 'strong', '', `${row.killed ?? '—'} KIA · ${row.wounded ?? '—'} WIA · ${row.missing ?? '—'} MIA`); add(article, 'small', '', `${row.event_date} · ${row.casualty_id} · ${label(row.aggregation_type)}`); }); });
      const prior = add(wrap, 'details', 'superseded-records'); add(prior, 'summary', '', `Superseded cumulative snapshots · ${groups.superseded.length}`); groups.superseded.forEach(row => add(prior, 'p', '', `${row.event_date} · ${row.casualty_id} · ${row.country}: ${row.killed ?? '—'} KIA / ${row.wounded ?? '—'} WIA`));
    }

    function renderClaims(query = '') {
      const target = document.getElementById('claimList'); if (!target) return; target.replaceChildren();
      const correction = root.ATLAS_UI_CORRECTIONS.records[0]; const canonical = root.ATLAS_LEDGER.claims.claims || [];
      const caseFile = canonical.find(row => row.case_id === CORRECTION_ID);
      if ((!query || textOf(caseFile).toLowerCase().includes(query.toLowerCase())) && caseFile) {
        const card = add(target, 'article', 'corrected-case-file'); card.appendChild(badge('FALSE')); add(card, 'div', 'eyebrow', `${caseFile.earliest_known_origin || 'ORIGIN UNRESOLVED'} · ${caseFile.case_id}`); add(card, 'h2', '', caseFile.claim); add(card, 'p', '', correction.reason); const button = add(card, 'button', 'case-detail-button', 'Open chronology and evidence'); button.type = 'button'; button.addEventListener('click', () => openDrawer(correction.display_verdict, caseFile.claim, caseFile, caseFile.source_ids));
      }
      const chainGrid = add(target, 'section', 'claim-chain-grid');
      forensic.chains.chains.filter(row => !query || textOf(row).toLowerCase().includes(query.toLowerCase())).forEach(row => { const button = add(chainGrid, 'button', row.chain_id === 'CH-F15E-CSAR-URANIUM' ? 'claim-chain-card featured' : 'claim-chain-card'); button.type = 'button'; add(button, 'span', 'eyebrow', `${row.start_date}–${row.end_date} · ${row.claim_ids.length} CLAIMS`); add(button, 'strong', '', row.label); add(button, 'small', '', label(row.assessment)); button.addEventListener('click', () => { const claims = forensic.claims.claims.filter(claim => row.claim_ids.includes(claim.claim_id)).sort((a,b)=>String(a.claim_date).localeCompare(String(b.claim_date))); const dossier = { ...row, factual_propositions: claims.flatMap(claim => (claim.factual_propositions || []).map(prop => ({ ...prop, proposition: `${claim.claim_date} · ${claim.exact_translated_claim} — ${prop.proposition}` }))) }; const refs = [...new Set(claims.flatMap(claim => [claim.source_id, ...(claim.later_evidence || [])]).filter(Boolean))]; openDrawer(row.label, label(row.assessment), dossier, refs); }); });
    }

    function buildSearch() {
      const palette = add(document.body, 'div', 'atlas-search-palette'); palette.hidden = true; palette.setAttribute('role', 'dialog'); palette.setAttribute('aria-label', 'Search evidence atlas');
      const shell = add(palette, 'div', 'atlas-search-shell'); const input = add(shell, 'input', 'atlas-search-input'); input.type = 'search'; input.placeholder = 'Search Dena, Khamenei, Al Udeid, F-15E, uranium, Hormuz…'; input.setAttribute('aria-label', 'Search all evidence'); const results = add(shell, 'div', 'atlas-search-results');
      const close = () => { palette.hidden = true; };
      const run = () => { results.replaceChildren(); searchIndex(searchRows, input.value).forEach(row => { const button = add(results, 'button', 'atlas-search-result'); button.type = 'button'; add(button, 'span', '', row.title); add(button, 'small', '', `${label(row.type)} · ${row.subtitle || row.id}`); button.addEventListener('click', () => { close(); root.AtlasState?.set?.({ activeView: row.view, selectedRecord: { type: row.type, id: row.id }, searchQuery: input.value }, { source: 'search-selection' }); root.showAtlasPanel?.(row.view, { writeState: false }); if (row.mapRef) root.pan?.(row.mapRef); openDrawer(row.title, row.subtitle, row.record, row.record?.sources || row.record?.source_ids); }); results.appendChild(button); }); if (!results.children.length) add(results, 'p', 'atlas-search-empty', 'No matching evidence records.'); };
      input.addEventListener('input', run); palette.addEventListener('click', event => { if (event.target === palette) close(); });
      document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); palette.hidden = false; input.focus(); input.select(); run(); } else if (event.key === 'Escape' && !palette.hidden) close(); });
      const nav = document.querySelector('.head'); if (nav) { const button = add(nav, 'button', 'global-search-button', 'Search evidence  Ctrl/⌘ K'); button.type = 'button'; button.addEventListener('click', () => { palette.hidden = false; input.focus(); run(); }); }
    }

    function buildContextStrip() {
      const host = document.querySelector('.analysis-nav'); if (!host) return; const strip = el('div', 'atlas-context-strip');
      add(strip, 'span', 'atlas-context-view', 'Current picture'); add(strip, 'span', 'atlas-context-time', 'AS OF · 2026-08-20'); const copy = add(strip, 'button', '', 'Copy state link'); copy.type = 'button'; copy.addEventListener('click', async () => { await navigator.clipboard.writeText(root.AtlasState.url()); copy.textContent = 'State link copied'; setTimeout(() => { copy.textContent = 'Copy state link'; }, 1600); }); host.after(strip);
      const sync = state => { strip.querySelector('.atlas-context-view').textContent = label(state.activeView); strip.querySelector('.atlas-context-time').textContent = `${state.temporalMode === 'known-by' ? 'KNOWN BY' : 'AS OF'} · ${state.timeCutoff}`; };
      sync(root.AtlasState?.get?.() || { activeView: 'snapshot', temporalMode: 'as-of', timeCutoff: '2026-08-20' }); root.AtlasState?.subscribe?.(sync);
    }

    function wireSourceDetails() {
      document.addEventListener('click', event => {
        const explicit = event.target.closest('[data-forensic-source]'); if (explicit) { const source = forensic.sourcesById.get(explicit.dataset.sourceId); if (source) openDrawer(`${source.outlet} — ${source.title || 'Untitled source'}`, source.source_id, source, []); return; }
        const anchor = event.target.closest('.sources a'); if (!anchor || !anchor.href) return; event.preventDefault(); const source = [...forensic.sourcesById.values()].find(row => row.url === anchor.href);
        const record = source || { title: anchor.textContent, url: anchor.href, source_roles: ['LEGACY SOURCE LINK'], proof_note: 'Legacy source link; open the publisher only after reviewing this record.' };
        openDrawer(record.title || anchor.textContent, source?.source_id || 'Source detail', record, []); const body = drawer.querySelector('.forensic-drawer-body'); const outbound = add(body, 'a', 'outbound-source-link', 'Open publisher in new tab'); outbound.href = anchor.href; outbound.target = '_blank'; outbound.rel = 'noopener noreferrer';
      }, true);
    }

    function buildMobileToggle() {
      const controls = add(document.body, 'div', 'mobile-view-toggle'); ['Evidence', 'Map'].forEach(name => { const button = add(controls, 'button', name === 'Evidence' ? 'active' : '', name); button.type = 'button'; button.addEventListener('click', () => { document.body.dataset.mobileView = name.toLowerCase(); controls.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button)); setTimeout(() => root.atlasMap?.invalidateSize?.(), 40); }); });
    }

    async function init() {
      if (!root.ATLAS_LEDGER || !root.ATLAS_DATA) { root.addEventListener('atlasdataready', init, { once: true }); return; }
      const entries = await Promise.all(Object.entries(FILES).map(async ([key, file]) => [key, await fetchJson(`./data/forensic-v1.3.2/${file}`)]));
      forensic = Object.fromEntries(entries); forensic.corrections = await fetchJson('./data/ui-corrections-v1.3.2.json'); forensic.sourcesById = new Map(forensic.sources.sources.map(source => [source.source_id, source]));
      const kicker = document.querySelector('.kicker'); if (kicker) kicker.textContent = '2026 IRAN WAR · PUBLIC OSINT · FORENSIC v1.3.2 + LEDGER v1.2';
      root.ATLAS_FORENSIC = forensic; root.ATLAS_UI_CORRECTIONS = forensic.corrections; root.registerAtlasSources?.(forensic.sources.sources);
      root.ATLAS_TEMPORAL_INDEX = createTemporalIndex(root.ATLAS_LEDGER, forensic); root.registerAtlasEvents?.(root.ATLAS_TEMPORAL_INDEX);
      searchRows = buildSearchIndex({ ledger: root.ATLAS_LEDGER, forensic, legacy: root.ATLAS_DATA });
      buildDrawer(); buildSearch(); buildContextStrip(); buildMobileToggle(); wireSourceDetails();
      const lossSearch = document.getElementById('lossSearch'); lossSearch?.addEventListener('input', event => { event.stopImmediatePropagation(); renderLosses(event.target.value); }, true);
      const claimSearch = document.getElementById('claimSearch'); claimSearch?.addEventListener('input', event => { event.stopImmediatePropagation(); renderClaims(event.target.value); }, true);
      renderLosses(); renderClaims(); root.renderAtlasTimeline?.();
      const restoreSelection = state => { const selected = state?.selectedRecord; if (!selected) return; const row = searchRows.find(item => item.id === selected.id); if (!row) return; root.showAtlasPanel?.(state.activeView || row.view, { writeState: false }); if (row.mapRef && state.activeView !== 'timeline') root.pan?.(row.mapRef); if (state.activeView === 'timeline' && state.activeFilters?.[0]) { const search = document.getElementById('timelineSearch'); if (search) { search.value = state.activeFilters[0]; root.renderAtlasTimeline?.(state.activeFilters[0]); } } openDrawer(row.title, row.subtitle, row.record, row.record?.sources || row.record?.source_ids, { writeState: false }); };
      restoreSelection(root.AtlasState?.get?.());
      root.AtlasState?.subscribe?.((state, source) => { if (['popstate', 'history', 'restore'].includes(source)) restoreSelection(state); });
      const resize = new ResizeObserver(() => root.atlasMap?.invalidateSize?.()); resize.observe(document.getElementById('app'));
    }
    init().catch(error => console.warn('Forensic v1.3.2 overlay unavailable; baseline atlas remains readable.', error));
  }

  renderBrowser();
  return { FILES, CORRECTION_ID, HUMAN_LABELS, label, groupCasualties, lossViewModel, createTemporalIndex, buildSearchIndex, searchIndex };
}));
