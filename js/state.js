(function attachAtlasState(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AtlasState = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildAtlasState(root) {
  'use strict';

  const DEFAULTS = Object.freeze({
    activePrimaryGroup: 'overview',
    activeView: 'snapshot',
    selectedRecord: null,
    timeCutoff: '2026-08-24',
    temporalMode: 'as-of',
    temporalGranularity: 'war',
    timelineContext: 'all',
    activeCoreLayers: [],
    manualLayerOverrides: {},
    activeFilters: [],
    searchQuery: '',
    lossScenario: 'central'
  });

  const VIEW_GROUPS = Object.freeze({
    snapshot: 'overview',
    timeline: 'overview',
    facilities: 'operations',
    strikes: 'operations',
    imagery: 'operations',
    csis: 'operations',
    losses: 'consequences',
    economy: 'consequences',
    arctic: 'consequences',
    'diplomacy-hub': 'diplomacy',
    endgame: 'diplomacy',
    claims: 'claims',
    infowar: 'claims',
    sources: 'sources',
    intro: 'sources',
    'analytic-record': 'sources',
    historical: 'sources',
    history: 'sources'
  });

  function selectedRecord(value) {
    if (!value) return null;
    if (typeof value === 'object' && value.type && value.id) return { type: String(value.type), id: String(value.id) };
    const text = String(value);
    const split = text.indexOf(':');
    return split > 0 ? { type: text.slice(0, split), id: text.slice(split + 1) } : null;
  }

  function uniqueStrings(values) {
    return [...new Set((values || []).map(value => String(value).trim()).filter(Boolean))];
  }

  function normalize(input) {
    const next = Object.assign({}, DEFAULTS, input || {});
    next.activeView = VIEW_GROUPS[next.activeView] ? next.activeView : DEFAULTS.activeView;
    next.activePrimaryGroup = VIEW_GROUPS[next.activeView] || DEFAULTS.activePrimaryGroup;
    next.selectedRecord = selectedRecord(next.selectedRecord);
    next.temporalMode = next.temporalMode === 'known-by' ? 'known-by' : 'as-of';
    next.temporalGranularity = ['war', 'month', 'week', 'day', 'hour'].includes(next.temporalGranularity) ? next.temporalGranularity : 'war';
    next.timelineContext = ['all', 'loss', 'strike', 'facility', 'posture'].includes(next.timelineContext) ? next.timelineContext : 'all';
    next.lossScenario = ['low', 'central', 'high'].includes(next.lossScenario) ? next.lossScenario : 'central';
    next.activeCoreLayers = uniqueStrings(next.activeCoreLayers);
    next.activeFilters = uniqueStrings(next.activeFilters);
    next.searchQuery = String(next.searchQuery || '');
    next.manualLayerOverrides = Object.fromEntries(Object.entries(next.manualLayerOverrides || {}).filter(([key, value]) => key && typeof value === 'boolean'));
    return next;
  }

  function parseOverrides(value) {
    const result = {};
    String(value || '').split(',').filter(Boolean).forEach(token => {
      const split = token.lastIndexOf(':');
      if (split < 1) return;
      result[decodeURIComponent(token.slice(0, split))] = token.slice(split + 1) !== 'off';
    });
    return result;
  }

  function parseState(value) {
    const params = value instanceof URLSearchParams ? value : new URLSearchParams(String(value || '').replace(/^\?/, ''));
    return normalize({
      activePrimaryGroup: params.get('group') || DEFAULTS.activePrimaryGroup,
      activeView: params.get('view') || DEFAULTS.activeView,
      selectedRecord: selectedRecord(params.get('record')),
      timeCutoff: params.get('cutoff') || DEFAULTS.timeCutoff,
      temporalMode: params.get('mode') || DEFAULTS.temporalMode,
      temporalGranularity: params.get('zoom') || DEFAULTS.temporalGranularity,
      timelineContext: params.get('context') || DEFAULTS.timelineContext,
      activeCoreLayers: (params.get('layers') || '').split(','),
      manualLayerOverrides: parseOverrides(params.get('overrides')),
      activeFilters: (params.get('filters') || '').split('|'),
      searchQuery: params.get('q') || '',
      lossScenario: params.get('scenario') || DEFAULTS.lossScenario
    });
  }

  function serializeState(value) {
    const state = normalize(value);
    const params = new URLSearchParams();
    if (state.activeView !== DEFAULTS.activeView) params.set('view', state.activeView);
    if (state.selectedRecord) params.set('record', `${state.selectedRecord.type}:${state.selectedRecord.id}`);
    if (state.timeCutoff !== DEFAULTS.timeCutoff) params.set('cutoff', state.timeCutoff);
    if (state.temporalMode !== DEFAULTS.temporalMode) params.set('mode', state.temporalMode);
    if (state.temporalGranularity !== DEFAULTS.temporalGranularity) params.set('zoom', state.temporalGranularity);
    if (state.timelineContext !== DEFAULTS.timelineContext) params.set('context', state.timelineContext);
    if (state.activeCoreLayers.length) params.set('layers', state.activeCoreLayers.join(','));
    const overrides = Object.entries(state.manualLayerOverrides).map(([name, on]) => `${name}:${on ? 'on' : 'off'}`);
    if (overrides.length) params.set('overrides', overrides.join(','));
    if (state.activeFilters.length) params.set('filters', state.activeFilters.join('|'));
    if (state.searchQuery) params.set('q', state.searchQuery);
    if (state.lossScenario !== DEFAULTS.lossScenario) params.set('scenario', state.lossScenario);
    return params.toString();
  }

  function createStore(options) {
    const settings = options || {};
    const historyApi = settings.history || null;
    const locationApi = settings.location || null;
    const eventTarget = settings.eventTarget || null;
    let state = normalize(settings.initial || (locationApi ? parseState(locationApi.search) : DEFAULTS));
    const listeners = new Set();

    function notify(source) {
      listeners.forEach(listener => listener(state, source));
      if (eventTarget && typeof eventTarget.dispatchEvent === 'function' && typeof eventTarget.CustomEvent === 'function') {
        eventTarget.dispatchEvent(new eventTarget.CustomEvent('atlasstatechange', { detail: { state, source } }));
      }
    }

    function writeUrl(replace) {
      if (!historyApi || !locationApi) return;
      const query = serializeState(state);
      const nextUrl = `${locationApi.pathname || '/'}${query ? `?${query}` : ''}${locationApi.hash || ''}`;
      historyApi[replace ? 'replaceState' : 'pushState']({ atlas: state }, '', nextUrl);
    }

    function set(patch, options) {
      const control = Object.assign({ replace: false, writeUrl: true, source: 'ui' }, options || {});
      state = normalize(Object.assign({}, state, patch || {}));
      if (control.writeUrl) writeUrl(control.replace);
      notify(control.source);
      return state;
    }

    function reset(options) {
      return set(DEFAULTS, Object.assign({ source: 'reset' }, options || {}));
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function url(base) {
      const query = serializeState(state);
      const rootUrl = base || (locationApi ? `${locationApi.origin}${locationApi.pathname}` : 'https://ejronin.github.io/ISR/');
      return `${rootUrl}${query ? `?${query}` : ''}`;
    }

    function restore(search, source) {
      state = parseState(search);
      notify(source || 'history');
      return state;
    }

    if (eventTarget && typeof eventTarget.addEventListener === 'function') {
      eventTarget.addEventListener('popstate', () => restore(locationApi.search, 'popstate'));
    }

    return { get: () => state, set, reset, subscribe, url, restore };
  }

  const store = root && root.location ? createStore({ initial: parseState(root.location.search), history: root.history, location: root.location, eventTarget: root }) : null;
  return Object.assign({ DEFAULTS, VIEW_GROUPS, normalize, parseState, serializeState, createStore }, store || {});
}));
