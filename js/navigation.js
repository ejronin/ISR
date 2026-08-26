'use strict';
(function atlasShell() {
  const canonicalUrl = 'https://ejronin.github.io/ISR/';
  const groups = {
    overview: [['snapshot', 'Current status'], ['timeline', 'Chronology']],
    operations: [['facilities', 'Bases & infrastructure'], ['strikes', 'Campaigns & strikes'], ['csis', 'Air / missile / drone'], ['imagery', 'Damage imagery']],
    consequences: [['losses', 'Casualties & losses'], ['economy', 'Economic effects'], ['arctic', 'Shipping & trade']],
    diplomacy: [['diplomacy-hub', 'Diplomacy overview'], ['endgame', 'Objectives & outcomes']],
    claims: [['claims', 'Claim checks'], ['infowar', 'Information environment']],
    sources: [['sources', 'Sources'], ['intro', 'Method'], ['analytic-record', 'Analytic record'], ['historical', 'Historical record'], ['history', 'Archive']]
  };
  const primaryLabels = {
    overview: 'Overview',
    operations: 'Military Operations',
    consequences: 'Consequences',
    diplomacy: 'Diplomacy & Outcome',
    claims: 'Claims & Verification',
    sources: 'Sources & Method'
  };
  const panelGroup = Object.fromEntries(Object.entries(groups).flatMap(([group, rows]) => rows.map(([id]) => [id, group])));

  let restoringState = false;
  let legacyObserver = null;

  function closeLegacyOverlay() {
    if (!document.querySelector('.isr-hormuz-overlay:not([hidden])')) return;
    document.querySelector('[data-peer-workspace="ANALYSIS"]')?.click();
  }

  function ensurePrimaryNavigation() {
    const nav = document.getElementById('primaryNav');
    if (!nav) return;
    nav.textContent = '';
    Object.entries(primaryLabels).forEach(([group, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary-tab';
      button.dataset.group = group;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.tabIndex = -1;
      button.textContent = label;
      nav.appendChild(button);
    });
  }

  function ensureDiplomacyPanel() {
    const content = document.querySelector('.content');
    if (!content || document.getElementById('diplomacy-hub')) return;
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = 'diplomacy-hub';
    panel.innerHTML = '<div class="section-title">Diplomacy &amp; outcome</div>' +
      '<div class="callout"><strong>Negotiations and agreements</strong><br>The existing agreement workspace remains available as a detailed view of the Islamabad memorandum, Hormuz bargaining and related diplomatic records.</div>' +
      '<div class="item"><h3>Negotiations / agreement record</h3><p>Open the detailed agreement workspace.</p><button class="action-btn" id="openAgreementWorkspace" type="button">Open negotiations &amp; agreements</button></div>' +
      '<div class="item"><h3>Objectives &amp; outcomes</h3><p>Compare documented objectives, concessions, unresolved terms and outcome evidence without converting unlike measures into a single war score.</p><button class="action-btn" id="openOutcomeRecord" type="button">Open objectives &amp; outcomes</button></div>';
    content.appendChild(panel);
    panel.querySelector('#openAgreementWorkspace')?.addEventListener('click', () => {
      const legacy = document.querySelector('[data-peer-workspace="MOU"]');
      if (legacy) legacy.click();
    });
    panel.querySelector('#openOutcomeRecord')?.addEventListener('click', () => window.showAtlasPanel?.('endgame'));
  }

  function ensureAnalyticRecordPanel() {
    const content = document.querySelector('.content');
    if (!content || document.getElementById('analytic-record')) return;
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = 'analytic-record';
    panel.innerHTML = '<div class="section-title">Analytic record</div>' +
      '<div class="callout"><strong>Separate from the factual ledger.</strong> This section is reserved for contemporaneous forecasts and assessments, followed by later source-based adjudication. It is never used to establish that an event occurred.</div>' +
      '<div class="method-grid">' +
        '<div class="method-card"><h3>Evidence available then</h3><p>Sources and observations available when the assessment was made.</p></div>' +
        '<div class="method-card"><h3>Contemporaneous assessment</h3><p>What the author assessed, including actors, mechanism, expected movement and time horizon where stated.</p></div>' +
        '<div class="method-card"><h3>Subsequent record</h3><p>Later independent sources used to test the assessment.</p></div>' +
        '<div class="method-card"><h3>Adjudication</h3><p>Supported, partial, contradicted or unresolved; quantitative calibration is limited to forecasts that can be scored honestly.</p></div>' +
      '</div>' +
      '<div class="callout"><strong>Completeness gate:</strong> the historical assessment register is not being published piecemeal. The full project sweep must include misses, revisions and failed mechanisms before individual entries are exposed here.</div>';
    content.appendChild(panel);
  }

  function suppressLegacyWorkspaceNavigation() {
    const apply = () => {
      document.querySelectorAll('.isr-workspace-nav').forEach(nav => {
        if (!nav.hidden) nav.hidden = true;
        nav.setAttribute('aria-hidden', 'true');
      });
      const analysisNav = document.querySelector('.analysis-nav');
      if (analysisNav?.hidden) analysisNav.hidden = false;
    };
    apply();
    if (!legacyObserver && document.body) {
      legacyObserver = new MutationObserver(apply);
      legacyObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    }
  }

  function activatePanel(id, focusButton, options) {
    const target = document.getElementById(id);
    if (!target) return false;
    if (id !== 'diplomacy-hub') closeLegacyOverlay();
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
    window.ISRRebuild133?.syncWorkspace?.();
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

  function ensureEndgamePanel() {
    const content = document.querySelector('.content');
    if (!content) return;
    if (!document.getElementById('endgame')) {
      const panel = document.createElement('section');
      panel.className = 'panel';
      panel.id = 'endgame';
      panel.innerHTML = '<div class="callout"><strong>Objectives & outcomes</strong><br>Loading the source-linked outcome audit…</div>';
      content.appendChild(panel);
    }
    if (!document.querySelector('link[data-atlas-endgame]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = './css/endgame-20260823.css?v=20260823';
      style.dataset.atlasEndgame = 'true';
      document.head.appendChild(style);
    }
    if (!document.querySelector('script[data-atlas-endgame]')) {
      const script = document.createElement('script');
      script.src = './js/endgame-20260823.js?v=20260823';
      script.async = false;
      script.dataset.atlasEndgame = 'true';
      document.head.appendChild(script);
    }
  }

  function wireShell() {
    ensurePrimaryNavigation();
    ensureEndgamePanel();
    ensureDiplomacyPanel();
    ensureAnalyticRecordPanel();
    suppressLegacyWorkspaceNavigation();
    const primary = document.getElementById('primaryNav'); const secondary = document.getElementById('secondaryNav');
    document.querySelectorAll('.primary-tab').forEach(button => button.setAttribute('aria-controls', 'secondaryNav'));
    primary?.addEventListener('click', event => {
      const button = event.target.closest('.primary-tab');
      if (button) { closeLegacyOverlay(); renderSecondary(button.dataset.group); }
    });
    primary?.addEventListener('keydown', handleRovingKeys);
    secondary?.addEventListener('click', event => { const button = event.target.closest('.secondary-tab'); if (button) activatePanel(button.dataset.tab); });
    secondary?.addEventListener('keydown', handleRovingKeys);
    document.addEventListener('click', event => {
      const mapTarget = event.target.closest('[data-map-ref]'); if (mapTarget && window.pan) window.pan(mapTarget.dataset.mapRef);
      const eventTarget = event.target.closest('[data-event-id]'); if (eventTarget && window.focusLedgerEvent) window.focusLedgerEvent(eventTarget.dataset.eventId);
    });
    document.getElementById('copyLinkButton')?.addEventListener('click', copyCanonicalLink);
    const stored = window.AtlasState?.get?.() || {};
    const initialView = panelGroup[stored.activeView] ? stored.activeView : 'snapshot';
    const initialGroup = panelGroup[initialView] || 'overview';
    restoringState = true;
    try { renderSecondary(initialGroup, initialView, { writeState: false }); } finally { restoringState = false; }
    loadSnapshots(); loadBuildInfo();
    window.AtlasState?.subscribe?.((state, source) => {
      if (!['popstate', 'history', 'restore'].includes(source)) return;
      const view = panelGroup[state.activeView] ? state.activeView : 'snapshot';
      const group = panelGroup[view] || 'overview';
      restoringState = true;
      try {
        if (!document.querySelector(`.secondary-tab[data-tab="${view}"]`)) renderSecondary(group, view);
        activatePanel(view, false, { writeState: false });
      } finally { restoringState = false; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireShell); else wireShell();
}());

/* v1.3.3 integrated recovery extension. Single loader only; the former hotfix observer is retired. */
(function loadISRRebuild133() {
  if (window.__ISR_REBUILD_LOADER_133__) return;
  window.__ISR_REBUILD_LOADER_133__ = true;
  const script = document.createElement('script');
  script.src = './js/rebuild-v1.3.3.js?v=20260821-rebuild4';
  script.async = false;
  script.dataset.isrRebuild133 = 'true';
  document.head.appendChild(script);
}());
