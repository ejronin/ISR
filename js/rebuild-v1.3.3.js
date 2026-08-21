'use strict';
(async function ISRRebuild133() {
  if (window.__ISR_REBUILD_133__) return;
  window.__ISR_REBUILD_133__ = true;
  /* Disable the retired observer-based emergency implementation if a stale loader tries to start it later. */
  window.__ISR_COMPLETE_FIX_133__ = true;

  const PATHS = {
    casualties: './data/casualty-corrections-v1.3.3.json',
    assets: './data/asset-display-v1.3.3.json',
    rationales: './data/us-war-rationales-v1.3.3.json'
  };

  const fetchJson = async path => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path} request failed: ${response.status}`);
    return response.json();
  };

  const [casualties, assetDisplay, rationales] = await Promise.all([
    fetchJson(PATHS.casualties), fetchJson(PATHS.assets), fetchJson(PATHS.rationales)
  ]);

  const waitFor = async (test, timeoutMs = 15000) => {
    const started = Date.now();
    while (!test()) {
      if (Date.now() - started > timeoutMs) throw new Error('Timed out waiting for atlas core initialization.');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  await waitFor(() => window.ATLAS_LEDGER && window.ATLAS_FORENSIC && document.getElementById('lossList') && document.getElementById('claimList'));

  const nf = new Intl.NumberFormat('en-US');
  const fmt = value => value == null ? 'UNRESOLVED' : typeof value === 'number' ? nf.format(value) : String(value);
  const human = value => String(value == null ? '' : value)
    .replace(/_/g, ' ')
    .replace(/\s*;\s*/g, ' · ')
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
    if (document.getElementById('isr-rebuild-133-styles')) return;
    const style = document.createElement('style');
    style.id = 'isr-rebuild-133-styles';
    style.textContent = `
      .v133-rebuild-dashboard,.v133-rationale-reconstruction{display:grid;gap:12px;margin:0 0 15px}
      .v133-section{border:1px solid #315170;border-radius:12px;background:#081827;padding:13px;min-width:0}
      .v133-section-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:11px}
      .v133-section-head h2{margin:2px 0 0;font-size:18px;line-height:1.18}.v133-section-head p{max-width:780px;margin:4px 0 0;color:#9fb4c8;font-size:10px;line-height:1.48}
      .v133-eyebrow{font-size:8px;font-weight:950;letter-spacing:.12em;color:#6fe0ef;text-transform:uppercase}
      .v133-badge{display:inline-flex;align-items:center;min-height:24px;border:1px solid #47627c;border-radius:999px;padding:3px 7px;background:#112438;color:#d7e7f8;font-size:8px;font-weight:950;letter-spacing:.05em;text-transform:uppercase;line-height:1.2}
      .v133-badge.verified,.v133-badge.confirmed{border-color:#347451;background:#123527;color:#c7f7d9}.v133-badge.supported{border-color:#327287;background:#12323c;color:#bdefff}.v133-badge.uncontested{border-color:#8a7139;background:#352f1b;color:#ffe39a}.v133-badge.contested,.v133-badge.mixed{border-color:#76529b;background:#302040;color:#ead8ff}.v133-badge.unresolved,.v133-badge.not-established{border-color:#5d6774;background:#202933;color:#d1d8e1}.v133-badge.false{border-color:#8c3847;background:#401b23;color:#ffd4da}
      .v133-country-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.v133-country{border:1px solid #29465f;border-radius:10px;background:#0b1b2c;padding:11px;min-width:0}.v133-country.us{border-top:3px solid #5aa7ff}.v133-country.iran{border-top:3px solid #ff5a5f}.v133-country h3{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 9px;font-size:14px}
      .v133-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.v133-metric{border:1px solid #243d55;border-radius:8px;background:#091624;padding:9px;min-width:0}.v133-metric strong{display:block;font-size:24px;line-height:1.02;color:#eef6ff}.v133-metric span{display:block;margin-top:5px;color:#9fb4c9;font-size:8px;font-weight:900;letter-spacing:.055em;text-transform:uppercase;line-height:1.28}.v133-metric.primary strong{color:#75deed}.v133-metric.danger strong{color:#ff8e93}.v133-metric.warn strong{color:#ffd27f}
      .v133-note{margin:8px 0 0;color:#aebfd1;font-size:9.5px;line-height:1.48}.v133-details{margin-top:9px;border-top:1px solid #223c54;padding-top:7px}.v133-details summary{cursor:pointer;min-height:32px;color:#b6dcff;font-size:9px;font-weight:900}.v133-source-links{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.v133-source-links a,.v133-source-links button{display:inline-flex;align-items:center;min-height:34px;border:1px solid #2d607d;border-radius:7px;background:#0d2940;color:#c4e4ff;padding:5px 8px;font:850 8px/1.15 system-ui;text-decoration:none;cursor:pointer}
      .v133-tally-row{display:grid;grid-template-columns:92px minmax(0,1fr) auto;gap:8px;align-items:center;border-top:1px solid #20384e;padding:7px 0;font-size:9px}.v133-tally-row strong{font-size:14px}.v133-tally-row a{color:#bfe0ff}
      .v133-asset-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.v133-asset{border:1px solid #294a65;border-radius:9px;background:#0b1c2e;overflow:hidden;min-width:0}.v133-asset summary{list-style:none;cursor:pointer;padding:10px;min-height:112px}.v133-asset summary::-webkit-details-marker{display:none}.v133-asset-title{display:block;color:#9eb5ca;font-size:8px;font-weight:950;letter-spacing:.07em;text-transform:uppercase}.v133-asset-value{display:block;margin-top:6px;color:#f0f7ff;font-size:25px;font-weight:950;line-height:1.05}.v133-asset-sub{display:block;margin-top:5px;color:#92a9c0;font-size:8.5px;line-height:1.35}.v133-asset-status{display:block;margin-top:7px;color:#72ddec;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;line-height:1.3}.v133-asset-body{border-top:1px solid #28475f;padding:9px;color:#b9c9d9;font-size:9px;line-height:1.45}.v133-component-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 12px}.v133-component-grid b{text-align:right;color:#eff7ff}
      .v133-specific-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.v133-specific-side{border:1px solid #29455d;border-radius:10px;background:#091827;padding:10px;min-width:0}.v133-specific-side h3{margin:0 0 7px;font-size:13px}.v133-record{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;border-top:1px solid #20384e;padding:9px 0}.v133-record:first-of-type{border-top:0}.v133-record-name{font-size:10px;font-weight:900;color:#eef5ff;line-height:1.35}.v133-record-value{text-align:right;font-size:13px;font-weight:950;color:#dcecff}.v133-record-meta{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:5px;align-items:center;color:#91a8bf;font-size:8.5px;line-height:1.35}.v133-record-note{grid-column:1/-1;color:#adbdcd;font-size:9px;line-height:1.42}
      .v133-casualty-event{display:grid;grid-template-columns:86px minmax(0,1fr) auto;gap:7px;border-top:1px solid #20384e;padding:7px 0;font-size:8.5px;color:#aebfd0}.v133-casualty-event b{color:#dfeafb}.v133-casualty-event strong{color:#f1f6ff;text-align:right}.v133-method{border:1px dashed #46627c;border-radius:8px;background:#091724;padding:9px;color:#a9bbcd;font-size:9px;line-height:1.5}
      .v133-cost-handoff{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #28475f;background:#0a1a2a;border-radius:9px;padding:10px;color:#a9bbcd;font-size:9px;line-height:1.45}.v133-cost-handoff b{color:#eef6ff}
      .v133-rationale-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.v133-rationale{border:1px solid #294a65;border-radius:10px;background:#091827;overflow:hidden}.v133-rationale summary{list-style:none;cursor:pointer;padding:11px}.v133-rationale summary::-webkit-details-marker{display:none}.v133-rationale-title{display:block;margin-top:6px;font-size:12px;font-weight:900;color:#f0f6ff;line-height:1.3}.v133-rationale-type{display:block;margin-top:4px;color:#90a9c1;font-size:8px;font-weight:850;letter-spacing:.05em;text-transform:uppercase}.v133-rationale-summary{display:block;margin-top:7px;color:#b5c6d7;font-size:9px;line-height:1.42}.v133-rationale-body{border-top:1px solid #26445d;padding:9px}.v133-proposition{border-top:1px solid #1f384e;padding:8px 0}.v133-proposition:first-child{border-top:0}.v133-proposition-head{display:flex;gap:7px;align-items:flex-start;justify-content:space-between}.v133-proposition h4{font-size:9.5px;line-height:1.4;margin:2px 0;color:#e6eff9}.v133-proposition p{font-size:9px;line-height:1.45;margin:5px 0 0;color:#aebfd0}
      body.v133-loss-workspace #app{grid-template-columns:minmax(0,1fr)!important}body.v133-loss-workspace .mapwrap{display:none!important}body.v133-loss-workspace .side{width:100%!important;max-width:none!important;border-right:0!important}body.v133-loss-workspace .content{padding:12px 18px 48px!important}body.v133-loss-workspace #losses{max-width:1500px;margin:0 auto}body.v133-loss-workspace .mobile-view-toggle{display:none!important}body.v133-loss-workspace .forensic-category-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      @media(max-width:1100px){.v133-asset-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.v133-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:850px){body.v133-loss-workspace #app{grid-template-columns:1fr!important;grid-template-rows:1fr!important}body.v133-loss-workspace .side{height:100dvh!important;border:0!important}.v133-country-grid,.v133-specific-grid,.v133-rationale-grid{grid-template-columns:1fr}.v133-asset-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.v133-section{padding:9px}.v133-section-head{display:block}.v133-metric-grid,.v133-asset-grid{grid-template-columns:1fr}.v133-metric strong{font-size:22px}.v133-asset summary{min-height:88px}.v133-tally-row{grid-template-columns:72px minmax(0,1fr) auto}.v133-casualty-event{grid-template-columns:68px 1fr}.v133-casualty-event strong{grid-column:2;text-align:left}}
      @media(prefers-reduced-motion:reduce){.v133-rebuild-dashboard *,.v133-rationale-reconstruction *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function evidenceClass(value) {
    const text = String(value || '').toUpperCase();
    if (/\bUNCONTESTED\b/.test(text)) return 'uncontested';
    if (/\bFALSE\b|UNSUPPORTED BY REPORTED|FALSE \/ UNSUPPORTED/.test(text)) return 'false';
    if (/CONTEST|DISPUT|CONTRADICT/.test(text)) return 'contested';
    if (/MIXED|PARTLY/.test(text)) return 'mixed';
    if (/UNRESOLVED|NOT ESTABLISHED|NOT SUPPORTED/.test(text)) return 'unresolved';
    if (/CONFIRMED|VERIFIED/.test(text)) return 'confirmed';
    if (/SUPPORTED/.test(text)) return 'supported';
    return 'uncontested';
  }

  function badge(value, textOverride) {
    const text = textOverride || human(value || 'UNCONTESTED');
    return el('span', `v133-badge ${evidenceClass(text)}`, text);
  }

  function sourceLinks(parent, rows) {
    if (!rows?.length) return;
    const wrap = add(parent, 'div', 'v133-source-links');
    rows.forEach(row => {
      if (!row?.url || !/^https:\/\//i.test(row.url)) return;
      const a = add(wrap, 'a', '', row.outlet || row.source || 'Source');
      a.href = row.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.title = row.title || row.supports || '';
    });
  }

  function sourceIdButtons(parent, ids) {
    if (!ids?.length) return;
    const wrap = add(parent, 'div', 'v133-source-links');
    ids.forEach(id => {
      const button = add(wrap, 'button', '', id);
      button.type = 'button'; button.dataset.forensicSource = 'true'; button.dataset.sourceId = id;
    });
  }

  function metric(parent, label, value, className = '') {
    const box = add(parent, 'div', `v133-metric ${className}`.trim());
    add(box, 'strong', '', fmt(value)); add(box, 'span', '', label); return box;
  }

  function renderPersonnel(container) {
    const section = add(container, 'section', 'v133-section');
    const head = add(section, 'header', 'v133-section-head'); const copy = add(head, 'div');
    add(copy, 'div', 'v133-eyebrow', 'PERSONNEL LOSSES'); add(copy, 'h2', '', 'Readable current personnel picture');
    add(copy, 'p', '', 'Current headline categories are separated from dated snapshots and event chronology. A military death is not automatically labeled KIA.');
    add(head, 'span', 'v133-badge supported', `Reviewed ${casualties.reviewed_at}`);
    const countries = add(section, 'div', 'v133-country-grid');

    const us = casualties.united_states; const usCard = add(countries, 'article', 'v133-country us');
    const ush = add(usCard, 'h3'); add(ush, 'span', '', 'United States'); ush.appendChild(badge('SUPPORTED'));
    const usg = add(usCard, 'div', 'v133-metric-grid');
    metric(usg, 'Total military dead', us.current_display.total_military_dead, 'danger');
    metric(usg, 'Hostile deaths', us.current_display.hostile_deaths);
    metric(usg, 'Non-hostile military deaths', us.current_display.non_hostile_military_deaths);
    metric(usg, 'WIA', us.current_display.wounded, 'primary'); metric(usg, 'MIA', us.current_display.missing, 'warn');
    add(usCard, 'p', 'v133-note', '18 is the combined military-death total, not 18 KIA. MIA remains 1 under the current project adjudication.');
    const usDetails = add(usCard, 'details', 'v133-details'); add(usDetails, 'summary', '', 'Sources and accounting notes');
    us.notes.forEach(note => add(usDetails, 'p', 'v133-note', note)); sourceLinks(usDetails, us.sources);

    const iran = casualties.iran; const snap = iran.official_snapshot; const irCard = add(countries, 'article', 'v133-country iran');
    const irh = add(irCard, 'h3'); add(irh, 'span', '', 'Iran'); irh.appendChild(badge(snap.evidence_status, 'UNCONTESTED OFFICIAL SNAPSHOT'));
    const irg = add(irCard, 'div', 'v133-metric-grid');
    metric(irg, 'Military dead · Apr. 26 official snapshot', snap.military_dead, 'danger');
    metric(irg, 'Civilian dead · Apr. 26 official snapshot', snap.civilian_dead);
    metric(irg, 'Total dead · Apr. 26 official snapshot', snap.total_dead, 'primary');
    metric(irg, 'Current military-only cumulative', iran.current_military_only_total, 'warn');
    metric(irg, 'Military WIA · cumulative', iran.current_military_wia, 'warn'); metric(irg, 'Military MIA · cumulative', iran.current_military_mia, 'warn');
    add(irCard, 'p', 'v133-note', '2,008 is the official Iranian military-death subtotal for the Apr. 26 snapshot. It is not labeled KIA and is not presented as the current August military-only total.');
    const irDetails = add(irCard, 'details', 'v133-details'); add(irDetails, 'summary', '', 'Later national tallies and sources');
    iran.later_mixed_tallies.forEach(row => {
      const line = add(irDetails, 'div', 'v133-tally-row'); add(line, 'span', '', row.date);
      const a = add(line, 'a', '', row.source); a.href = row.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; add(line, 'strong', '', fmt(row.total_dead));
    });
    add(irDetails, 'p', 'v133-note', '3,519 and 3,636 are separate source tallies with different provenance/scope. They are not displayed as a statistical range and do not replace the military-only Apr. 26 subtotal.');
    sourceLinks(irDetails, iran.sources);
  }

  function renderAttrition(container) {
    const section = add(container, 'section', 'v133-section'); const head = add(section, 'header', 'v133-section-head'); const copy = add(head, 'div');
    add(copy, 'div', 'v133-eyebrow', 'IRAN · MATERIAL ATTRITION'); add(copy, 'h2', '', 'What was lost or neutralized — quantities first');
    add(copy, 'p', '', 'The headline states the exact proposition supported: lost, neutralized, damaged, targeted and modeled quantities are not interchangeable. Open a card for the type/class basis.');
    const grid = add(section, 'div', 'v133-asset-grid');
    (assetDisplay.iran?.headline_categories || []).forEach(row => {
      const card = add(grid, 'details', 'v133-asset'); const summary = add(card, 'summary');
      add(summary, 'span', 'v133-asset-title', row.label); add(summary, 'strong', 'v133-asset-value', row.headline);
      add(summary, 'span', 'v133-asset-sub', row.subheadline || row.scope); add(summary, 'span', 'v133-asset-status', human(row.public_status));
      const body = add(card, 'div', 'v133-asset-body');
      let components = row.components || [];
      if (row.dynamic === 'leadership') {
        const leaders = window.ATLAS_FORENSIC?.leaders?.records || [];
        components = [
          ['Political / state', leaders.filter(item => item.category === 'SENIOR_POLITICAL_STATE').length],
          ['Military / security', leaders.filter(item => item.category === 'SENIOR_MILITARY_SECURITY').length]
        ];
      }
      if (components.length) {
        const cg = add(body, 'div', 'v133-component-grid'); components.forEach(([name, value]) => { add(cg, 'span', '', name); add(cg, 'b', '', fmt(value)); });
      }
      if (row.scope) add(body, 'p', 'v133-note', `Scope: ${row.scope}.`); if (row.note) add(body, 'p', 'v133-note', row.note); sourceIdButtons(body, row.source_ids);
    });
  }

  function recordDisplayLabel(row) {
    const explicit = assetDisplay.specific_ledger_policy?.labels?.[row.status]; if (explicit) return explicit;
    const status = String(row.status || '').toUpperCase();
    if (/DAMAGED_OR_DESTROYED|DESTROYED_OR_LOST/.test(status)) return human(status).replace(/DAMAGED OR DESTROYED UNRESOLVED/i, 'DAMAGED — DESTRUCTION UNRESOLVED');
    if (/DESTROYED|SUNK/.test(status)) return row.disposition ? human(row.disposition) : 'DESTROYED / LOST';
    if (/DAMAGED/.test(status)) return 'DAMAGED';
    if (/TARGETED/.test(status)) return 'UNCONTESTED TARGET COUNT · DESTRUCTION UNRESOLVED';
    if (/CLAIM/.test(status)) return 'UNCONTESTED CLAIM · FINAL LOSS COUNT UNRESOLVED';
    return human(row.status || 'UNRESOLVED');
  }

  function renderSpecificLedger(container) {
    const section = add(container, 'section', 'v133-section'); const head = add(section, 'header', 'v133-section-head'); const copy = add(head, 'div');
    add(copy, 'div', 'v133-eyebrow', 'SPECIFIC ASSETS / CLAIMS'); add(copy, 'h2', '', 'Itemized material-loss ledger');
    add(copy, 'p', '', 'Specific named assets, subfacility damage and broader claim/target counts are shown separately. Uncontested does not convert a target count into a destruction count.');
    const grid = add(section, 'div', 'v133-specific-grid'); const records = window.ATLAS_LEDGER?.['material-losses']?.records || [];
    const sides = [
      ['Iran / aligned', row => row.side === 'IRAN/ALIGNED'],
      ['U.S. / coalition', row => row.side === 'U.S./COALITION']
    ];
    sides.forEach(([title, predicate]) => {
      const pane = add(grid, 'div', 'v133-specific-side'); add(pane, 'h3', '', title);
      const rows = records.filter(predicate);
      if (!rows.length) add(pane, 'p', 'v133-note', 'No itemized records in this ledger.');
      rows.forEach(row => {
        const rec = add(pane, 'article', 'v133-record'); add(rec, 'div', 'v133-record-name', row.item);
        add(rec, 'div', 'v133-record-value', row.quantity_qualifier || (row.quantity != null ? fmt(row.quantity) : 'QTY UNRESOLVED'));
        const meta = add(rec, 'div', 'v133-record-meta'); meta.appendChild(badge(recordDisplayLabel(row), recordDisplayLabel(row)));
        if (row.event_date || row.event_date_range) add(meta, 'span', '', row.event_date || row.event_date_range);
        if (row.disposition) add(meta, 'span', '', human(row.disposition)); if (row.note) add(rec, 'div', 'v133-record-note', row.note); sourceIdButtons(rec, row.source_ids);
      });
    });
  }

  function casualtyEventText(row) {
    const parts = [];
    if (row.killed != null) {
      const prefix = row.cause_type === 'NON_HOSTILE_OPERATIONAL' ? 'non-hostile dead' : row.cause_type === 'HOSTILE' ? 'hostile dead' : 'dead';
      parts.push(`${fmt(row.killed)} ${prefix}`);
    }
    if (row.estimated_killed != null) parts.push(`${fmt(row.estimated_killed)} reported/estimated dead`);
    if (row.wounded != null) parts.push(`${fmt(row.wounded)} WIA`);
    if (row.missing != null) parts.push(`${fmt(row.missing)} MIA`);
    return parts.length ? parts.join(' · ') : 'Casualty total unresolved';
  }

  function renderCasualtyChronology(container) {
    const details = add(container, 'details', 'v133-section v133-details');
    const rows = window.ATLAS_LEDGER?.casualties?.records || [];
    add(details, 'summary', '', `Personnel chronology and superseded snapshots · ${rows.length} records`);
    add(details, 'p', 'v133-note', 'Historical records preserve what was reported at that time. Cumulative snapshots are not additive. Event-level Iranian WIA/MIA do not become a national cumulative total.');
    [...rows].sort((a,b) => String(a.event_date).localeCompare(String(b.event_date))).forEach(row => {
      const line = add(details, 'div', 'v133-casualty-event'); add(line, 'span', '', row.event_date || 'DATE UNRESOLVED'); add(line, 'b', '', `${row.country} · ${human(row.aggregation_type)}`); add(line, 'strong', '', casualtyEventText(row));
    });
  }

  function renderMethod(container) {
    const box = add(container, 'div', 'v133-method');
    add(box, 'b', '', 'Public evidence vocabulary: ');
    box.append('VERIFIED and SUPPORTED remain distinct. When a reported claim lacks independent confirmation but the reviewed record contains no material dispute or contradiction, the public label is UNCONTESTED. UNCONTESTED does not mean verified and never expands the proposition beyond what was actually reported.');
    const handoff = add(container, 'div', 'v133-cost-handoff');
    add(handoff, 'span', '', 'Below this dashboard, the accepted v1.3.2 standing material-loss envelopes and separate munitions-expenditure model remain intact.'); add(handoff, 'b', '', 'QUANTITY → CONFIDENCE → COST → METHOD');
  }

  function renderLossDashboard() {
    const target = document.getElementById('lossList'); if (!target) return;
    target.querySelector(':scope > .v133-rebuild-dashboard')?.remove();
    target.querySelectorAll(':scope > .casualty-ledger').forEach(node => { node.hidden = true; node.setAttribute('aria-hidden', 'true'); });
    const wrap = el('div', 'v133-rebuild-dashboard');
    renderPersonnel(wrap); renderAttrition(wrap); renderSpecificLedger(wrap); renderCasualtyChronology(wrap); renderMethod(wrap); target.prepend(wrap);
    window.AtlasPresentation?.formatTextNodes?.(target);
  }

  function renderRationales(filter = '') {
    const target = document.getElementById('claimList'); if (!target) return;
    target.querySelector(':scope > .v133-rationale-reconstruction')?.remove();
    const q = String(filter || '').trim().toLowerCase();
    const haystack = JSON.stringify(rationales).toLowerCase(); if (q && !haystack.includes(q)) return;
    const root = el('section', 'v133-rationale-reconstruction');
    const intro = add(root, 'section', 'v133-section'); const head = add(intro, 'header', 'v133-section-head'); const copy = add(head, 'div');
    add(copy, 'div', 'v133-eyebrow', rationales.case_id); add(copy, 'h2', '', rationales.title); add(copy, 'p', '', rationales.subtitle);
    add(head, 'span', 'v133-badge mixed', '10 RATIONALE GROUPS'); add(intro, 'p', 'v133-note', rationales.scope_note); add(intro, 'p', 'v133-note', rationales.chronology_note);
    const grid = add(intro, 'div', 'v133-rationale-grid');
    [...rationales.groups].sort((a,b)=>a.order-b.order).forEach(group => {
      if (q && !JSON.stringify(group).toLowerCase().includes(q)) return;
      const card = add(grid, 'details', 'v133-rationale'); const summary = add(card, 'summary'); summary.appendChild(badge(group.overall_status));
      add(summary, 'span', 'v133-rationale-title', `${group.order}. ${group.title}`); add(summary, 'span', 'v133-rationale-type', human(group.rationale_type)); add(summary, 'span', 'v133-rationale-summary', group.summary);
      const body = add(card, 'div', 'v133-rationale-body');
      group.propositions.forEach(prop => {
        const row = add(body, 'article', 'v133-proposition'); const ph = add(row, 'div', 'v133-proposition-head'); add(ph, 'h4', '', prop.proposition); ph.appendChild(badge(prop.status)); add(row, 'p', '', prop.basis);
      });
      sourceLinks(body, group.sources);
    });
    target.prepend(root); window.AtlasPresentation?.formatTextNodes?.(root);
  }

  function currentView() {
    return window.AtlasState?.get?.().activeView || window.atlasActiveView || new URLSearchParams(location.search).get('view') || 'snapshot';
  }

  function syncWorkspace() {
    const losses = currentView() === 'losses'; document.body.classList.toggle('v133-loss-workspace', losses);
    if (!losses) document.body.classList.remove('aggregate-dashboard-mode');
    setTimeout(() => window.atlasMap?.invalidateSize?.(), 40);
  }

  function refreshAfterCore(kind) {
    setTimeout(() => {
      if (kind === 'loss') renderLossDashboard();
      if (kind === 'claim') renderRationales(document.getElementById('claimSearch')?.value || '');
      syncWorkspace();
    }, 0);
  }

  injectStyles(); renderLossDashboard(); renderRationales(document.getElementById('claimSearch')?.value || ''); syncWorkspace();
  window.AtlasPresentation?.formatTextNodes?.(document.body);

  /* These capture listeners schedule a rebuild after the existing core handlers complete. No DOM observers are used. */
  document.addEventListener('input', event => {
    if (event.target?.id === 'lossSearch') refreshAfterCore('loss');
    if (event.target?.id === 'claimSearch') refreshAfterCore('claim');
  }, true);
  document.addEventListener('click', event => {
    if (event.target.closest?.('#lossList .scenario-switch button')) refreshAfterCore('loss');
    if (event.target.closest?.('.primary-tab,.secondary-tab')) setTimeout(syncWorkspace, 0);
  }, true);
  window.AtlasState?.subscribe?.(() => syncWorkspace());

  window.ISRRebuild133 = { renderLossDashboard, renderRationales, syncWorkspace, data: { casualties, assetDisplay, rationales } };
}()).catch(error => console.error('ISR v1.3.3 rebuild extension failed to initialize.', error));
