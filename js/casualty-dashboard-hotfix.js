'use strict';
(async function ISRCompleteLossDashboardFix() {
  if (window.__ISR_COMPLETE_FIX_133__) return;
  window.__ISR_COMPLETE_FIX_133__ = true;

  const PATHS = {
    casualties: './data/casualty-corrections-v1.3.3.json',
    assets: './data/asset-display-v1.3.3.json',
    material: './data/integration-v1.2/material-losses.json'
  };

  const fetchJson = async path => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  };

  const [casualties, assetDisplay, materialLedger] = await Promise.all([
    fetchJson(PATHS.casualties),
    fetchJson(PATHS.assets),
    fetchJson(PATHS.material)
  ]);

  window.ATLAS_CASUALTY_CORRECTIONS = casualties;
  window.ATLAS_ASSET_DISPLAY = assetDisplay;

  const nf = new Intl.NumberFormat('en-US');
  const fmt = value => value == null ? 'UNRESOLVED' : typeof value === 'number' ? nf.format(value) : String(value);
  const human = value => String(value == null ? '' : value)
    .replace(/_/g, ' ')
    .replace(/\s*;\s*/g, ' · ')
    .replace(/\bUNVERIFIED\b/gi, match => match === 'Unverified' ? 'Uncontested' : 'UNCONTESTED')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const add = (parent, tag, className, text) => {
    const node = el(tag, className, text);
    parent.appendChild(node);
    return node;
  };

  function injectStyles() {
    if (document.getElementById('isr-v133-complete-style')) return;
    const style = document.createElement('style');
    style.id = 'isr-v133-complete-style';
    style.textContent = `
      .v133-dashboard{display:grid;gap:12px;margin:0 0 14px}
      .v133-section{border:1px solid #315170;border-radius:12px;background:#081827;padding:13px}
      .v133-section-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:11px}
      .v133-section-head h2{margin:2px 0 0;font-size:18px;line-height:1.2}
      .v133-section-head p{max-width:620px;margin:3px 0 0;color:#9fb4c8;font-size:10px;line-height:1.45}
      .v133-eyebrow{font-size:8px;font-weight:950;letter-spacing:.12em;color:#6fe0ef;text-transform:uppercase}
      .v133-badge{display:inline-flex;align-items:center;min-height:24px;border:1px solid #47627c;border-radius:999px;padding:3px 7px;background:#112438;color:#d7e7f8;font-size:8px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}
      .v133-badge.uncontested{border-color:#8a7139;background:#352f1b;color:#ffe39a}
      .v133-badge.supported{border-color:#327287;background:#12323c;color:#bdefff}
      .v133-badge.contested{border-color:#76529b;background:#302040;color:#ead8ff}
      .v133-badge.unresolved{border-color:#5d6774;background:#202933;color:#cad2dc}
      .v133-country-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .v133-country{border:1px solid #29465f;border-radius:10px;background:#0b1b2c;padding:11px;min-width:0}
      .v133-country.us{border-top:3px solid #5aa7ff}.v133-country.iran{border-top:3px solid #ff5a5f}
      .v133-country h3{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 9px;font-size:14px}
      .v133-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      .v133-metric{border:1px solid #243d55;border-radius:8px;background:#091624;padding:9px;min-width:0}
      .v133-metric strong{display:block;font-size:24px;line-height:1.02;color:#eef6ff}
      .v133-metric span{display:block;margin-top:5px;color:#9fb4c9;font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;line-height:1.25}
      .v133-metric.primary strong{color:#75deed}.v133-metric.danger strong{color:#ff8e93}.v133-metric.warn strong{color:#ffd27f}
      .v133-note{margin:8px 0 0;color:#aebfd1;font-size:9.5px;line-height:1.48}
      .v133-details{margin-top:9px;border-top:1px solid #223c54;padding-top:7px}
      .v133-details summary{cursor:pointer;min-height:32px;color:#b6dcff;font-size:9px;font-weight:900}
      .v133-tally-row{display:grid;grid-template-columns:88px minmax(0,1fr) auto;gap:8px;align-items:center;border-top:1px solid #20384e;padding:7px 0;font-size:9px}
      .v133-tally-row strong{font-size:14px}
      .v133-source-links{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
      .v133-source-links a,.v133-source-links button{display:inline-flex;align-items:center;min-height:34px;border:1px solid #2d607d;border-radius:7px;background:#0d2940;color:#c4e4ff;padding:5px 8px;font:850 8px/1 system-ui;text-decoration:none;cursor:pointer}
      .v133-asset-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .v133-asset{border:1px solid #294a65;border-radius:9px;background:#0b1c2e;overflow:hidden;min-width:0}
      .v133-asset summary{list-style:none;cursor:pointer;padding:10px;min-height:108px}.v133-asset summary::-webkit-details-marker{display:none}
      .v133-asset-title{display:block;color:#9eb5ca;font-size:8px;font-weight:950;letter-spacing:.07em;text-transform:uppercase}
      .v133-asset-value{display:block;margin-top:6px;color:#f0f7ff;font-size:25px;font-weight:950;line-height:1.05}
      .v133-asset-sub{display:block;margin-top:5px;color:#92a9c0;font-size:8.5px;line-height:1.35}
      .v133-asset-status{display:block;margin-top:7px;color:#72ddec;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      .v133-asset-body{border-top:1px solid #28475f;padding:9px;color:#b9c9d9;font-size:9px;line-height:1.45}
      .v133-component-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 12px}
      .v133-component-grid b{text-align:right;color:#eff7ff}
      .v133-specific-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .v133-specific-side{border:1px solid #29455d;border-radius:10px;background:#091827;padding:10px;min-width:0}
      .v133-specific-side h3{margin:0 0 7px;font-size:13px}
      .v133-record{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;border-top:1px solid #20384e;padding:9px 0}
      .v133-record:first-of-type{border-top:0}
      .v133-record-name{font-size:10px;font-weight:900;color:#eef5ff;line-height:1.35}
      .v133-record-value{text-align:right;font-size:13px;font-weight:950;color:#dcecff}
      .v133-record-meta{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:5px;align-items:center;color:#91a8bf;font-size:8.5px;line-height:1.35}
      .v133-record-note{grid-column:1/-1;color:#adbdcd;font-size:9px;line-height:1.42}
      .v133-event-grid{display:grid;gap:5px;margin-top:7px}
      .v133-event{display:grid;grid-template-columns:82px minmax(0,1fr) auto;gap:7px;border-top:1px solid #20384e;padding-top:6px;font-size:8.5px;color:#aebfd0}
      .v133-event b{color:#dfeafb}
      .v133-method{border:1px dashed #46627c;border-radius:8px;background:#091724;padding:9px;color:#a9bbcd;font-size:9px;line-height:1.5}
      body.aggregate-dashboard-mode .mobile-view-toggle{display:none!important}
      @media(min-width:851px){
        body.aggregate-dashboard-mode #app{grid-template-columns:minmax(0,1fr)!important}
        body.aggregate-dashboard-mode .mapwrap{display:none!important}
        body.aggregate-dashboard-mode .side{width:100%!important;max-width:none!important;border-right:0!important}
        body.aggregate-dashboard-mode .content{padding:12px 18px 48px!important}
        body.aggregate-dashboard-mode #losses{max-width:1500px;margin:0 auto}
        body.aggregate-dashboard-mode .forensic-category-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      }
      @media(max-width:1100px){.v133-asset-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.v133-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:850px){
        body.aggregate-dashboard-mode #app{grid-template-columns:1fr!important;grid-template-rows:1fr!important}
        body.aggregate-dashboard-mode .mapwrap{display:none!important}
        body.aggregate-dashboard-mode .side{height:100dvh!important;border:0!important}
        .v133-country-grid,.v133-specific-grid{grid-template-columns:1fr}
        .v133-asset-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:560px){
        .v133-section{padding:9px}.v133-section-head{display:block}
        .v133-metric-grid,.v133-asset-grid{grid-template-columns:1fr}
        .v133-metric strong{font-size:22px}.v133-asset summary{min-height:88px}
        .v133-tally-row{grid-template-columns:72px minmax(0,1fr) auto}
        .v133-event{grid-template-columns:68px 1fr}.v133-event span:last-child{grid-column:2}
      }
      @media(prefers-reduced-motion:reduce){.v133-dashboard *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function publicEvidence(value) {
    const text = String(value || '').toUpperCase();
    if (/FALSE|DEBUNK/.test(text)) return { label: 'FALSE', cls: 'contested' };
    if (/CONTEST|DISPUT|CONTRADICT/.test(text)) return { label: 'CONTESTED', cls: 'contested' };
    if (/UNKNOWN|UNRESOLVED|NOT ESTABLISHED|INSUFFICIENT/.test(text)) return { label: 'UNRESOLVED', cls: 'unresolved' };
    if (/UNVERIFIED|NOT_INDEPENDENT|ACTOR_CLAIM|CLAIMED|OFFICIAL_US_CLAIM|TARGETED/.test(text)) return { label: 'UNCONTESTED', cls: 'uncontested' };
    if (/HIGH|CONFIRMED|SUPPORTED|VERIFIED|INDEPENDENT|CALCULATED/.test(text)) return { label: 'SUPPORTED', cls: 'supported' };
    if (/REPORTED|OFFICIAL|SOURCE/.test(text)) return { label: 'UNCONTESTED', cls: 'uncontested' };
    return { label: 'UNRESOLVED', cls: 'unresolved' };
  }

  function badge(value, override) {
    const state = override ? { label: override, cls: override.includes('UNCONTESTED') ? 'uncontested' : override.includes('CONTESTED') ? 'contested' : override.includes('UNRESOLVED') ? 'unresolved' : 'supported' } : publicEvidence(value);
    return el('span', `v133-badge ${state.cls}`, state.label);
  }

  function sourceLinks(parent, rows) {
    if (!rows || !rows.length) return;
    const wrap = add(parent, 'div', 'v133-source-links');
    rows.forEach(row => {
      if (!row?.url) return;
      const a = add(wrap, 'a', '', row.outlet || row.source || 'Source');
      a.href = row.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.title = row.title || row.supports || '';
    });
  }

  function sourceIdButtons(parent, ids) {
    if (!ids || !ids.length) return;
    const wrap = add(parent, 'div', 'v133-source-links');
    ids.forEach(id => {
      const button = add(wrap, 'button', '', id);
      button.type = 'button';
      button.dataset.forensicSource = 'true';
      button.dataset.sourceId = id;
    });
  }

  function metric(parent, label, value, className='') {
    const box = add(parent, 'div', `v133-metric ${className}`.trim());
    add(box, 'strong', '', fmt(value));
    add(box, 'span', '', label);
    return box;
  }

  function renderPersonnel(container) {
    const section = add(container, 'section', 'v133-section');
    const head = add(section, 'header', 'v133-section-head');
    const copy = add(head, 'div');
    add(copy, 'div', 'v133-eyebrow', 'PERSONNEL LOSSES');
    add(copy, 'h2', '', 'Current readable personnel picture');
    add(copy, 'p', '', 'Headline status first; dated snapshots and event chronology remain visible underneath.');
    add(head, 'span', 'v133-badge supported', `Reviewed ${casualties.reviewed_at}`);

    const countries = add(section, 'div', 'v133-country-grid');

    const us = casualties.united_states;
    const usCard = add(countries, 'article', 'v133-country us');
    const ush = add(usCard, 'h3'); add(ush, 'span', '', 'United States'); ush.appendChild(badge('SUPPORTED'));
    const usg = add(usCard, 'div', 'v133-metric-grid');
    metric(usg, 'Total military dead', us.current_display.total_military_dead, 'danger');
    metric(usg, 'Hostile deaths', us.current_display.hostile_deaths);
    metric(usg, 'Non-hostile military deaths', us.current_display.non_hostile_military_deaths);
    metric(usg, 'WIA', us.current_display.wounded, 'primary');
    metric(usg, 'MIA', us.current_display.missing, 'warn');
    add(usCard, 'p', 'v133-note', 'The 18 figure is total military dead, not 18 KIA.');
    const usd = add(usCard, 'details', 'v133-details');
    add(usd, 'summary', '', 'Sources, notes, and event chronology');
    us.notes.forEach(note => add(usd, 'p', 'v133-note', note));
    sourceLinks(usd, us.sources);
    renderCasualtyEvents(usd, 'United States');

    const ir = casualties.iran, snap = ir.official_snapshot;
    const irCard = add(countries, 'article', 'v133-country iran');
    const irh = add(irCard, 'h3'); add(irh, 'span', '', 'Iran'); irh.appendChild(badge('OFFICIAL SOURCE', 'UNCONTESTED'));
    const irg = add(irCard, 'div', 'v133-metric-grid');
    metric(irg, 'Military dead · Apr. 26 official snapshot', snap.military_dead, 'danger');
    metric(irg, 'Civilian dead · Apr. 26 official snapshot', snap.civilian_dead);
    metric(irg, 'Total dead · Apr. 26 official snapshot', snap.total_dead, 'primary');
    metric(irg, 'Current military-only cumulative', ir.current_military_only_total, 'warn');
    metric(irg, 'Military WIA · cumulative', ir.current_military_wia, 'warn');
    metric(irg, 'Military MIA · cumulative', ir.current_military_mia, 'warn');
    add(irCard, 'p', 'v133-note', '2,008 is a dated official Iranian military-death subtotal for the Apr. 26 snapshot. It is not labeled KIA and is not silently promoted to an August cumulative military-only total.');
    const ird = add(irCard, 'details', 'v133-details');
    add(ird, 'summary', '', 'Later national tallies, sources, and event records');
    ir.later_mixed_tallies.forEach(row => {
      const line = add(ird, 'div', 'v133-tally-row');
      add(line, 'span', '', row.date);
      const a = add(line, 'a', '', row.source); a.href = row.url; a.target='_blank'; a.rel='noopener noreferrer';
      add(line, 'strong', '', fmt(row.total_dead));
    });
    add(ird, 'p', 'v133-note', '3,519 and 3,636 are separate source tallies, not a statistical range and not substitutes for a military-only subtotal.');
    sourceLinks(ird, ir.sources);
    renderCasualtyEvents(ird, 'Iran');
  }

  function renderCasualtyEvents(parent, country) {
    const rows = (window.ATLAS_LEDGER?.casualties?.records || []).filter(row => row.country === country && row.aggregation_type === 'ADDITIVE_EVENT');
    if (!rows.length) return;
    const grid = add(parent, 'div', 'v133-event-grid');
    rows.forEach(row => {
      const line = add(grid, 'div', 'v133-event');
      add(line, 'span', '', row.event_date || 'DATE UNRESOLVED');
      add(line, 'b', '', `${row.killed ?? '—'} dead · ${row.wounded ?? '—'} WIA · ${row.missing ?? '—'} MIA`);
      add(line, 'span', '', human(row.cause_type || row.evidence_status || ''));
    });
  }

  function renderAssetCard(grid, row) {
    const card = add(grid, 'details', 'v133-asset');
    const summary = add(card, 'summary');
    add(summary, 'span', 'v133-asset-title', row.label);
    add(summary, 'strong', 'v133-asset-value', row.headline);
    add(summary, 'span', 'v133-asset-sub', row.subheadline || row.scope || '');
    add(summary, 'span', 'v133-asset-status', human(row.public_status || ''));
    const body = add(card, 'div', 'v133-asset-body');
    if (row.dynamic === 'leadership') {
      const leaders = window.ATLAS_FORENSIC?.leaders?.records || [];
      const comp = add(body, 'div', 'v133-component-grid');
      [['Political / state', leaders.filter(x=>x.category==='SENIOR_POLITICAL_STATE').length],
       ['Military / security', leaders.filter(x=>x.category==='SENIOR_MILITARY_SECURITY').length]].forEach(([name,value])=>{ add(comp,'span','',name); add(comp,'b','',fmt(value)); });
      leaders.forEach(person => add(body, 'p', 'v133-note', `${person.name} — ${person.role_at_death} · ${person.death_date}`));
    } else if (row.components?.length) {
      const comp = add(body, 'div', 'v133-component-grid');
      row.components.forEach(([name,value]) => { add(comp,'span','',name); add(comp,'b','',fmt(value)); });
    }
    if (row.scope) add(body, 'p', 'v133-note', `Scope: ${row.scope}.`);
    if (row.note) add(body, 'p', 'v133-note', row.note);
    sourceIdButtons(body, row.source_ids);
  }

  function renderAttrition(container) {
    const section = add(container, 'section', 'v133-section');
    const head = add(section, 'header', 'v133-section-head');
    const copy = add(head, 'div');
    add(copy, 'div', 'v133-eyebrow', 'IRAN · MATERIAL ATTRITION');
    add(copy, 'h2', '', 'What was lost, neutralized, or assessed lost');
    add(copy, 'p', '', 'Physical quantities come before dollar valuation. Open any card for type/class breakdown and scope.');
    const grid = add(section, 'div', 'v133-asset-grid');
    assetDisplay.iran.headline_categories.forEach(row => renderAssetCard(grid, row));
  }

  function recordPublicLabel(row) {
    const raw = `${row.status || ''} ${row.confidence || ''} ${row.note || ''}`.toUpperCase();
    const configured = assetDisplay.specific_ledger_policy?.labels?.[row.status];
    if (configured) return configured;
    if (/CONTEST|DISPUT|CONTRADICT/.test(raw)) return 'CONTESTED';
    if (/TARGETED/.test(raw) && /DESTRUCTION_NOT_ESTABLISHED|NOT ESTABLISHED/.test(raw)) return 'UNCONTESTED TARGET COUNT · DESTRUCTION UNRESOLVED';
    if (/CLAIM|REPORTED/.test(raw) && !/HIGH|INDEPENDENT|CONFIRMED/.test(raw)) return 'UNCONTESTED';
    if (/HIGH|CONFIRMED|SUPPORTED|INDEPENDENT/.test(raw)) return 'SUPPORTED';
    return 'UNCONTESTED';
  }

  function renderSpecificLedger(container) {
    const section = add(container, 'section', 'v133-section');
    const head = add(section, 'header', 'v133-section-head');
    const copy = add(head, 'div');
    add(copy, 'div', 'v133-eyebrow', 'SPECIFIC ASSETS / CLAIMS');
    add(copy, 'h2', '', 'Named and itemized loss ledger');
    add(copy, 'p', '', 'Includes durable losses/damage and clearly separated claim/target-count records. “Targeted” is never silently converted to “destroyed.”');

    const sides = add(section, 'div', 'v133-specific-grid');
    const definitions = [
      ['Iran / aligned', row => String(row.side || '').includes('IRAN')],
      ['U.S. / coalition', row => String(row.side || '').includes('U.S.')]
    ];
    definitions.forEach(([title, predicate]) => {
      const pane = add(sides, 'section', 'v133-specific-side');
      add(pane, 'h3', '', title);
      const rows = (materialLedger.records || []).filter(predicate);
      rows.forEach(row => {
        const record = add(pane, 'article', 'v133-record');
        add(record, 'div', 'v133-record-name', row.item);
        add(record, 'div', 'v133-record-value', `${row.quantity_qualifier || (row.quantity != null ? fmt(row.quantity) : 'QTY UNRESOLVED')}`);
        const meta = add(record, 'div', 'v133-record-meta');
        meta.appendChild(badge(row.status, recordPublicLabel(row)));
        if (row.event_date || row.event_date_range) add(meta, 'span', '', row.event_date || row.event_date_range);
        if (row.status) add(meta, 'span', '', human(row.status));
        if (row.note) add(record, 'div', 'v133-record-note', row.note);
        sourceIdButtons(record, row.source_ids);
      });
    });
  }

  function renderMethod(container) {
    const box = add(container, 'div', 'v133-method');
    add(box, 'b', '', 'Public status vocabulary: ');
    box.append('VERIFIED/SUPPORTED remains available where established. Generic UNVERIFIED is displayed as UNCONTESTED when the reviewed record contains no material dispute or contradiction. UNCONTESTED does not mean independently verified. CONTESTED and UNRESOLVED remain distinct.');
  }

  function buildDashboard(target) {
    if (!target || target.querySelector(':scope > .v133-dashboard')) return;
    target.querySelector('.casualty-ledger')?.remove();
    const wrap = el('div', 'v133-dashboard');
    renderPersonnel(wrap);
    renderAttrition(wrap);
    renderSpecificLedger(wrap);
    renderMethod(wrap);
    target.prepend(wrap);
  }

  function sweepUnverified(root=document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const changes = [];
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(parent.tagName)) continue;
      const old = node.nodeValue || '';
      const next = old.replace(/\bUNVERIFIED\b/g, 'UNCONTESTED').replace(/\bUnverified\b/g, 'Uncontested');
      if (next !== old) changes.push([node, next]);
    }
    changes.forEach(([n,text]) => { n.nodeValue = text; });
  }

  function syncWorkspace() {
    const view = window.AtlasState?.get?.().activeView || window.atlasActiveView || new URLSearchParams(location.search).get('view');
    document.body.classList.toggle('aggregate-dashboard-mode', view === 'losses');
  }

  function apply() {
    const target = document.getElementById('lossList');
    if (!target || !window.ATLAS_FORENSIC || !window.ATLAS_LEDGER) return false;
    buildDashboard(target);
    sweepUnverified(document.body);
    syncWorkspace();
    return true;
  }

  injectStyles();

  let observerStarted = false;
  function start() {
    if (!apply()) {
      setTimeout(start, 100);
      return;
    }
    if (observerStarted) return;
    observerStarted = true;
    const target = document.getElementById('lossList');
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        buildDashboard(target);
        sweepUnverified(target);
      });
    });
    observer.observe(target, { childList: true, subtree: true });
    window.AtlasState?.subscribe?.(() => syncWorkspace());
    document.addEventListener('click', () => setTimeout(syncWorkspace, 0), true);

    let bodySweepScheduled = false;
    const bodyObserver = new MutationObserver(() => {
      if (bodySweepScheduled) return;
      bodySweepScheduled = true;
      requestAnimationFrame(() => {
        bodySweepScheduled = false;
        sweepUnverified(document.body);
      });
    });
    bodyObserver.observe(document.body, { childList:true, subtree:true });
  }

  start();
}()).catch(error => console.warn('ISR v1.3.3 casualty/attrition dashboard correction unavailable; baseline atlas remains readable.', error));
