'use strict';
(async function casualtyDashboardHotfix() {
  const DATA_URL = './data/casualty-corrections-v1.3.3.json';
  let correction;

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
  const fmt = value => value == null ? 'UNRESOLVED' : new Intl.NumberFormat('en-US').format(value);

  function injectStyles() {
    if (document.getElementById('casualty-hotfix-style')) return;
    const style = document.createElement('style');
    style.id = 'casualty-hotfix-style';
    style.textContent = `
      .hotfix-banner{border:1px solid #426785;border-left:4px solid #54d9e8;background:#0a2033;border-radius:9px;padding:10px 12px;margin:10px 0;color:#d9e8f7;font-size:10px;line-height:1.5}
      .hotfix-personnel-dashboard,.hotfix-attrition-dashboard{border:1px solid #315170;border-radius:12px;background:#081827;padding:12px;margin:12px 0}
      .hotfix-dashboard-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}
      .hotfix-dashboard-title h2{margin:2px 0;font-size:17px}.hotfix-dashboard-title small{color:#8ea7be;font-size:9px}
      .hotfix-country-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .hotfix-country{border:1px solid #29465f;border-radius:10px;background:#0b1b2c;padding:11px;min-width:0}
      .hotfix-country h3{margin:0 0 8px;font-size:13px}.hotfix-country.us{border-top:3px solid #5aa7ff}.hotfix-country.iran{border-top:3px solid #ff5a5f}
      .hotfix-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .hotfix-metric{border:1px solid #243d55;border-radius:8px;background:#091624;padding:9px;min-width:0}
      .hotfix-metric b{display:block;font-size:22px;line-height:1.05;color:#eaf2ff}.hotfix-metric span{display:block;margin-top:4px;color:#9fb4c9;font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
      .hotfix-metric.primary b{color:#77dbe8}.hotfix-metric.warn b{color:#ffd27f}.hotfix-metric.danger b{color:#ff8c91}
      .hotfix-note{margin:8px 0 0;color:#aebfd1;font-size:9.5px;line-height:1.45}
      .hotfix-details{margin-top:9px;border-top:1px solid #223c54;padding-top:8px}.hotfix-details summary{cursor:pointer;color:#a9d9ff;font-size:9px;font-weight:900;min-height:30px}
      .hotfix-source-list{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.hotfix-source-list a{display:inline-flex;align-items:center;min-height:34px;border:1px solid #2b5876;border-radius:6px;padding:5px 7px;color:#b9ddff;text-decoration:none;font-size:8px}
      .hotfix-mixed-row{display:grid;grid-template-columns:80px 1fr auto;gap:7px;padding:6px 0;border-top:1px solid #20384e;align-items:center;font-size:9px}.hotfix-mixed-row strong{font-size:13px}
      .hotfix-attrition-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .hotfix-asset{border:1px solid #294a65;border-radius:9px;background:#0b1c2e;overflow:hidden}
      .hotfix-asset summary{list-style:none;cursor:pointer;padding:10px;min-height:82px}.hotfix-asset summary::-webkit-details-marker{display:none}
      .hotfix-asset-label{display:block;color:#9db1c5;font-size:8px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.hotfix-asset-value{display:block;margin-top:5px;color:#f1f7ff;font-size:24px;font-weight:950}.hotfix-asset-sub{display:block;margin-top:4px;color:#8fa6bd;font-size:8px;line-height:1.35}
      .hotfix-asset-body{border-top:1px solid #26445d;padding:9px;font-size:9px;color:#b9c9d9}.hotfix-breakdown{display:grid;grid-template-columns:1fr auto;gap:5px 10px}.hotfix-breakdown b{text-align:right}
      @media(min-width:851px){
        body.aggregate-dashboard-mode #app{grid-template-columns:1fr!important}
        body.aggregate-dashboard-mode .mapwrap{display:none!important}
        body.aggregate-dashboard-mode .side{width:100%!important;border-right:0!important}
        body.aggregate-dashboard-mode .content{padding-left:18px;padding-right:18px}
        body.aggregate-dashboard-mode .forensic-category-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
      }
      @media(max-width:900px){.hotfix-attrition-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){.hotfix-country-grid,.hotfix-metrics,.hotfix-attrition-grid{grid-template-columns:1fr}.hotfix-personnel-dashboard,.hotfix-attrition-dashboard{padding:9px}.hotfix-metric b{font-size:20px}}
    `;
    document.head.appendChild(style);
  }

  function sourceLinks(parent, sources) {
    const wrap = add(parent, 'div', 'hotfix-source-list');
    (sources || []).forEach(source => {
      const a = add(wrap, 'a', '', source.outlet || 'Source');
      a.href = source.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = `${source.title || ''}${source.supports ? ' — ' + source.supports : ''}`;
    });
  }

  function metric(parent, label, value, className='') {
    const box = add(parent, 'div', `hotfix-metric ${className}`.trim());
    add(box, 'b', '', fmt(value));
    add(box, 'span', '', label);
    return box;
  }

  function renderPersonnel() {
    const lossList = document.getElementById('lossList');
    if (!lossList || !correction) return;
    const stale = lossList.querySelector('.casualty-ledger');
    if (!stale || stale.dataset.hotfixed === 'true') return;

    const wrap = el('section', 'hotfix-personnel-dashboard');
    wrap.dataset.hotfixed = 'true';
    const head = add(wrap, 'div', 'hotfix-dashboard-title');
    const hc = add(head, 'div');
    add(hc, 'div', 'eyebrow', 'PERSONNEL LOSSES · CORRECTED CURRENT DISPLAY');
    add(hc, 'h2', '', 'Military casualties by side');
    add(head, 'small', '', `Reviewed ${correction.reviewed_at}`);

    const grid = add(wrap, 'div', 'hotfix-country-grid');

    const us = correction.united_states;
    const usCard = add(grid, 'article', 'hotfix-country us');
    add(usCard, 'h3', '', 'United States');
    const usMetrics = add(usCard, 'div', 'hotfix-metrics');
    metric(usMetrics, 'Total military dead', us.current_display.total_military_dead, 'danger');
    metric(usMetrics, 'Hostile deaths', us.current_display.hostile_deaths);
    metric(usMetrics, 'Non-hostile military deaths', us.current_display.non_hostile_military_deaths);
    metric(usMetrics, 'WIA', us.current_display.wounded, 'primary');
    metric(usMetrics, 'MIA', us.current_display.missing, 'warn');
    add(usCard, 'p', 'hotfix-note', '18 is the combined military death total, not 18 KIA. The dashboard retains 1 MIA; historical event states remain intact.');
    const usDetails = add(usCard, 'details', 'hotfix-details');
    add(usDetails, 'summary', '', 'Sources and accounting notes');
    us.notes.forEach(note => add(usDetails, 'p', 'hotfix-note', note));
    sourceLinks(usDetails, us.sources);

    const iran = correction.iran;
    const snap = iran.official_snapshot;
    const irCard = add(grid, 'article', 'hotfix-country iran');
    add(irCard, 'h3', '', 'Iran');
    const irMetrics = add(irCard, 'div', 'hotfix-metrics');
    metric(irMetrics, 'Military dead · Apr. 26 official snapshot', snap.military_dead, 'danger');
    metric(irMetrics, 'Civilian dead · Apr. 26 official snapshot', snap.civilian_dead);
    metric(irMetrics, 'Total dead · Apr. 26 official snapshot', snap.total_dead, 'primary');
    metric(irMetrics, 'Current military-only total', iran.current_military_only_total, 'warn');
    metric(irMetrics, 'Military WIA · cumulative', iran.current_military_wia, 'warn');
    metric(irMetrics, 'Military MIA · cumulative', iran.current_military_mia, 'warn');
    add(irCard, 'p', 'hotfix-note', '2,008 is an official Iranian military-death snapshot, not KIA and not an August military-only cumulative total.');
    const irDetails = add(irCard, 'details', 'hotfix-details');
    add(irDetails, 'summary', '', 'Later mixed tallies and sources');
    iran.later_mixed_tallies.forEach(row => {
      const line = add(irDetails, 'div', 'hotfix-mixed-row');
      add(line, 'span', '', row.date);
      const a = add(line, 'a', '', row.source);
      a.href = row.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      add(line, 'strong', '', fmt(row.total_dead));
    });
    add(irDetails, 'p', 'hotfix-note', 'These are separate mixed national tallies, not a statistical low/high range and not substitutes for a military-only subtotal.');
    sourceLinks(irDetails, iran.sources);

    stale.replaceWith(wrap);
  }

  function numberFrom(component, fallback=0) {
    return Number(component && component.quantity != null ? component.quantity : fallback);
  }

  function breakdownDetails(parent, rows) {
    const body = add(parent, 'div', 'hotfix-asset-body');
    const grid = add(body, 'div', 'hotfix-breakdown');
    rows.forEach(([name, value]) => { add(grid, 'span', '', name); add(grid, 'b', '', String(value)); });
  }

  function renderAttrition() {
    const lossList = document.getElementById('lossList');
    const forensic = window.ATLAS_FORENSIC;
    if (!lossList || !forensic?.losses || lossList.querySelector('.hotfix-attrition-dashboard')) return;

    const categories = new Map((forensic.losses.categories || []).map(row => [row.category, row]));
    const aircraft = categories.get('AIRCRAFT');
    const naval = categories.get('NAVAL_LOSSES');
    const launchers = categories.get('LAUNCHERS');

    const aLow = aircraft?.envelopes?.[0]?.calculation_components_usd || {};
    const aCentral = aircraft?.envelopes?.[1]?.calculation_components_usd || {};
    const aircraftFloor = Object.values(aLow).reduce((sum, item) => sum + numberFrom(item), 0);
    const aircraftCentral = Object.values(aCentral).reduce((sum, item) => sum + numberFrom(item), 0);

    const nLow = naval?.envelopes?.[0]?.calculation_components_usd || {};
    const submarines = numberFrom(nLow.kilo_submarines) + numberFrom(nLow.other_submarines);
    const surfaceCombatants = numberFrom(nLow.frigates) + numberFrom(nLow.corvettes) + numberFrom(nLow.fast_attack_craft);
    const smallCraft = numberFrom(nLow.mine_laying_small_craft);

    const section = el('section', 'hotfix-attrition-dashboard');
    const head = add(section, 'div', 'hotfix-dashboard-title');
    const hc = add(head, 'div');
    add(hc, 'div', 'eyebrow', 'IRAN · PHYSICAL ATTRITION BEFORE DOLLAR VALUE');
    add(hc, 'h2', '', 'Readable evidence-supported quantities');
    add(head, 'small', '', 'Click a category for breakdown');

    const grid = add(section, 'div', 'hotfix-attrition-grid');

    const aircraftCard = add(grid, 'details', 'hotfix-asset');
    let s = add(aircraftCard, 'summary');
    add(s, 'span', 'hotfix-asset-label', 'Aircraft');
    add(s, 'strong', 'hotfix-asset-value', aircraftFloor ? `${aircraftFloor}+` : 'See model');
    add(s, 'span', 'hotfix-asset-sub', aircraftCentral && aircraftCentral !== aircraftFloor ? `${aircraftCentral} central modeled · evidence-supported floor shown first` : 'Evidence-supported floor');
    breakdownDetails(aircraftCard, Object.entries(aLow).map(([name, item]) => [name.replace(/([a-z])([A-Z0-9])/g,'$1-$2').toUpperCase(), numberFrom(item)]));

    const subCard = add(grid, 'details', 'hotfix-asset');
    s = add(subCard, 'summary');
    add(s, 'span', 'hotfix-asset-label', 'Submarines');
    add(s, 'strong', 'hotfix-asset-value', submarines || 'See model');
    add(s, 'span', 'hotfix-asset-sub', 'Evidence-supported naval floor');
    breakdownDetails(subCard, [['Kilo submarines', numberFrom(nLow.kilo_submarines)], ['Other submarines', numberFrom(nLow.other_submarines)]]);

    const surfaceCard = add(grid, 'details', 'hotfix-asset');
    s = add(surfaceCard, 'summary');
    add(s, 'span', 'hotfix-asset-label', 'Major / fast surface combatants');
    add(s, 'strong', 'hotfix-asset-value', surfaceCombatants || 'See model');
    add(s, 'span', 'hotfix-asset-sub', 'Frigates + corvettes + fast attack craft');
    breakdownDetails(surfaceCard, [['Frigates', numberFrom(nLow.frigates)], ['Corvettes', numberFrom(nLow.corvettes)], ['Fast attack craft', numberFrom(nLow.fast_attack_craft)]]);

    const smallCard = add(grid, 'details', 'hotfix-asset');
    s = add(smallCard, 'summary');
    add(s, 'span', 'hotfix-asset-label', 'Mine-laying small craft');
    add(s, 'strong', 'hotfix-asset-value', smallCraft ? `${smallCraft}+` : 'See model');
    add(s, 'span', 'hotfix-asset-sub', 'Small craft, not major naval ships');
    breakdownDetails(smallCard, [['Evidence-supported floor', `${smallCraft}+`]]);

    const afsbCard = add(grid, 'details', 'hotfix-asset');
    s = add(afsbCard, 'summary');
    add(s, 'span', 'hotfix-asset-label', 'AFSB / power projection hulls');
    add(s, 'strong', 'hotfix-asset-value', numberFrom(nLow.power_projection_afsb) || 'See model');
    add(s, 'span', 'hotfix-asset-sub', 'Afloat staging / support hulls');
    breakdownDetails(afsbCard, [['Power-projection / AFSB', numberFrom(nLow.power_projection_afsb)]]);

    const launcherCard = add(grid, 'details', 'hotfix-asset');
    s = add(launcherCard, 'summary');
    add(s, 'span', 'hotfix-asset-label', 'Missile launchers');
    add(s, 'strong', 'hotfix-asset-value', '335+');
    add(s, 'span', 'hotfix-asset-sub', 'Neutralized reported · not automatically synonymous with destroyed');
    const lbody = add(launcherCard, 'div', 'hotfix-asset-body');
    add(lbody, 'p', 'hotfix-note', launchers?.envelopes?.[0]?.quantity_basis || 'See accepted v1.3.2 launcher model for source basis.');

    const leaders = forensic.leaders?.records || [];
    const leaderCard = add(grid, 'details', 'hotfix-asset');
    s = add(leaderCard, 'summary');
    add(s, 'span', 'hotfix-asset-label', 'Senior leadership');
    add(s, 'strong', 'hotfix-asset-value', String(leaders.length || 11));
    add(s, 'span', 'hotfix-asset-sub', 'Itemized senior political/state + military/security');
    const political = leaders.filter(row => row.category === 'SENIOR_POLITICAL_STATE').length;
    const military = leaders.filter(row => row.category === 'SENIOR_MILITARY_SECURITY').length;
    breakdownDetails(leaderCard, [['Political / state', political], ['Military / security', military]]);

    const firstPersonnel = lossList.querySelector('.hotfix-personnel-dashboard, .casualty-ledger, .leadership-ledger');
    if (firstPersonnel) lossList.insertBefore(section, firstPersonnel);
    else lossList.prepend(section);
  }

  function apply() {
    renderAttrition();
    renderPersonnel();
  }

  function syncWorkspace() {
    const view = window.AtlasState?.get?.().activeView || window.atlasActiveView;
    document.body.classList.toggle('aggregate-dashboard-mode', view === 'losses');
  }

  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${DATA_URL}: ${response.status}`);
    correction = await response.json();
    window.ATLAS_CASUALTY_CORRECTIONS = correction;
    injectStyles();

    const waitForLossList = () => {
      const target = document.getElementById('lossList');
      if (!target) { setTimeout(waitForLossList, 100); return; }
      let scheduled = false;
      const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => { scheduled = false; apply(); });
      });
      observer.observe(target, { childList: true, subtree: true });
      apply();
    };

    waitForLossList();
    syncWorkspace();
    window.AtlasState?.subscribe?.(() => syncWorkspace());
    document.addEventListener('click', () => setTimeout(syncWorkspace, 0), true);
  } catch (error) {
    console.warn('Emergency casualty/dashboard correction unavailable; baseline atlas remains readable.', error);
  }
}());
