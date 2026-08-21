'use strict';
(function atlasShell() {
  const canonicalUrl = 'https://ejronin.github.io/ISR/';
  const groups = {
    overview: [['snapshot', 'Current picture'], ['timeline', 'Timeline']],
    operations: [['facilities', 'U.S. sites'], ['strikes', 'U.S. strike effects'], ['imagery', 'Satellite BDA'], ['csis', 'Missiles / drones']],
    effects: [['losses', 'Verified losses'], ['economy', 'GCC / Iran economy'], ['arctic', 'China Arctic routes']],
    information: [['claims', 'Claim checks'], ['infowar', 'Information war']],
    evidence: [['sources', 'Sources'], ['intro', 'Method'], ['historical', 'Historical model'], ['history', 'Historical snapshots']]
  };
  const panelGroup = Object.fromEntries(Object.entries(groups).flatMap(([group, rows]) => rows.map(([id]) => [id, group])));

  let restoringState = false;
  function activatePanel(id, focusButton, options) {
    const target = document.getElementById(id);
    if (!target) return false;
    document.querySelectorAll('.panel').forEach(panel => {
      const selected = panel === target;
      panel.classList.toggle('active', selected);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-hidden', String(!selected));
    });
    document.querySelector('.content')?.scrollTo({ top: 0 });
    document.querySelectorAll('.secondary-tab').forEach(button => {
      const selected = button.dataset.tab === id;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focusButton) button.focus();
    });
    const group = panelGroup[id];
    document.querySelectorAll('.primary-tab').forEach(button => {
      const selected = button.dataset.group === group;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    window.atlasActiveView = id;
    if (!restoringState && options?.writeState !== false && window.AtlasState?.set) {
      window.AtlasState.set({ activeView: id, activePrimaryGroup: group }, { source: 'navigation' });
    }
    if (typeof window.configureAtlasMap === 'function') window.configureAtlasMap(id);
    if (id === 'timeline' && typeof window.refreshAtlasTimelineMap === 'function') window.refreshAtlasTimelineMap();
    try { if (window.atlasMap) window.setTimeout(() => window.atlasMap.invalidateSize(), 40); } catch (error) { /* optional map */ }
    return true;
  }

  function renderSecondary(group, activeId, options) {
    const nav = document.getElementById('secondaryNav');
    if (!nav || !groups[group]) return;
    nav.textContent = '';
    groups[group].forEach(([id, label]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'tab secondary-tab'; button.dataset.tab = id; button.id = `tab-${id}`;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', id); button.textContent = label;
      document.getElementById(id)?.setAttribute('aria-labelledby', button.id);
      nav.appendChild(button);
    });
    activatePanel(activeId && panelGroup[activeId] === group ? activeId : groups[group][0][0], false, options);
  }

  window.showAtlasPanel = function showAtlasPanel(id, options) {
    const group = panelGroup[id] || 'overview';
    if (!document.querySelector(`.secondary-tab[data-tab="${id}"]`)) { renderSecondary(group, id, options); return true; }
    return activatePanel(id, false, options);
  };

  function handleRovingKeys(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const list = [...event.currentTarget.querySelectorAll('[role="tab"]')];
    if (!list.length) return;
    event.preventDefault();
    const current = list.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
    list[next].focus(); list[next].click();
  }

  function setShareStatus(message) {
    const el = document.getElementById('shareStatus'); if (!el) return;
    el.textContent = message; window.setTimeout(() => { if (el.textContent === message) el.textContent = ''; }, 2200);
  }

  async function copyCanonicalLink() {
    try {
      const stateUrl = window.AtlasState?.url ? window.AtlasState.url(canonicalUrl) : canonicalUrl;
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(stateUrl);
      else {
        const input = document.createElement('input'); input.value = stateUrl; input.setAttribute('readonly', ''); input.className = 'clipboard-fallback';
        document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
      }
      setShareStatus('Link copied');
    } catch (error) { setShareStatus('Copy failed — use the address bar'); }
  }

  async function loadSnapshots() {
    const list = document.getElementById('snapshotList'); if (!list || !window.AtlasSafe) return;
    try {
      const response = await fetch('./data/snapshots.json', { cache: 'no-store' }); if (!response.ok) throw new Error(String(response.status));
      const rows = await response.json(); list.textContent = '';
      [...rows].reverse().forEach(row => {
        const path = window.AtlasSafe.safeRelativeUrl(row.path); const wrapper = document.createElement('div'); wrapper.className = 'snapshot-row';
        const copy = document.createElement('div'); const strong = document.createElement('strong'); strong.textContent = row.date || 'Snapshot';
        const label = document.createElement('span'); label.textContent = row.label || 'Historical board'; copy.append(strong, document.createElement('br'), label); wrapper.appendChild(copy);
        if (path) { const link = document.createElement('a'); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.href = path; link.textContent = 'Open snapshot'; wrapper.appendChild(link); }
        list.appendChild(wrapper);
      });
    } catch (error) { /* retain static fallback */ }
  }

  async function loadBuildInfo() {
    const target = document.getElementById('buildVerification'); if (!target) return;
    try {
      const response = await fetch('./build-info.json', { cache: 'no-store' }); if (!response.ok) throw new Error(String(response.status));
      const info = await response.json(); target.replaceChildren();
      [['Canonical URL', info.canonical_url], ['Deployed commit', info.commit_sha], ['Ledger', info.ledger_version], ['Review cutoff', info.collection_cutoff]].forEach(([label, value]) => {
        const row = document.createElement('div'); const term = document.createElement('b'); term.textContent = label;
        const detail = document.createElement('span'); detail.textContent = value || 'UNAVAILABLE'; row.append(term, detail); target.appendChild(row);
      });
    } catch (error) { target.textContent = 'Build verification metadata is unavailable in this session.'; }
  }

  function wireShell() {
    const primary = document.getElementById('primaryNav'); const secondary = document.getElementById('secondaryNav');
    document.querySelectorAll('.primary-tab').forEach(button => button.setAttribute('aria-controls', 'secondaryNav'));
    primary?.addEventListener('click', event => { const button = event.target.closest('.primary-tab'); if (button) renderSecondary(button.dataset.group); });
    primary?.addEventListener('keydown', handleRovingKeys);
    secondary?.addEventListener('click', event => { const button = event.target.closest('.secondary-tab'); if (button) activatePanel(button.dataset.tab); });
    secondary?.addEventListener('keydown', handleRovingKeys);
    document.addEventListener('click', event => {
      const mapTarget = event.target.closest('[data-map-ref]'); if (mapTarget && window.pan) window.pan(mapTarget.dataset.mapRef);
      const eventTarget = event.target.closest('[data-event-id]'); if (eventTarget && window.focusLedgerEvent) window.focusLedgerEvent(eventTarget.dataset.eventId);
    });
    document.getElementById('copyLinkButton')?.addEventListener('click', copyCanonicalLink);
    const initial = window.AtlasState?.get?.() || { activePrimaryGroup: 'overview', activeView: 'snapshot' };
    restoringState = true;
    try { renderSecondary(initial.activePrimaryGroup, initial.activeView, { writeState: false }); } finally { restoringState = false; }
    loadSnapshots(); loadBuildInfo();
    window.AtlasState?.subscribe?.((state, source) => {
      if (!['popstate', 'history', 'restore'].includes(source)) return;
      restoringState = true;
      try {
        if (!document.querySelector(`.secondary-tab[data-tab="${state.activeView}"]`)) renderSecondary(state.activePrimaryGroup, state.activeView);
        activatePanel(state.activeView, false, { writeState: false });
      } finally { restoringState = false; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireShell); else wireShell();
}());
