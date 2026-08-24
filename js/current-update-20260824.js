'use strict';
(function ISRCurrentUpdate20260824(){
  if (window.__ISR_CURRENT_UPDATE_20260824__) return;
  window.__ISR_CURRENT_UPDATE_20260824__ = true;

  const PATH = './data/current-update-20260824/';
  const CUTOFF = '2026-08-24T14:14:00-04:00';
  const CURRENT_DAY = '2026-08-24';
  const EXPECTED_HISTORICAL = 98;
  const EXPECTED_OVERLAY = 10;
  const EXPECTED_CURRENT = 108;

  const fetchJson = async file => {
    const response = await fetch(PATH + file, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${file}: ${response.status}`);
    return response.json();
  };

  const waitFor = (predicate, timeout = 12000) => new Promise((resolve, reject) => {
    const started = Date.now();
    (function poll(){
      const value = predicate();
      if (value) return resolve(value);
      if (Date.now() - started > timeout) return reject(new Error('Aug24 current-overlay dependency timeout'));
      setTimeout(poll, 50);
    }());
  });

  function assertPayload(manifest, events, timeline, sources) {
    const historical = window.ATLAS_LEDGER?.events?.events || [];
    if (historical.length !== EXPECTED_HISTORICAL) throw new Error(`Historical ledger count changed: ${historical.length}`);
    if ((events.events || []).length !== EXPECTED_OVERLAY) throw new Error(`Overlay event count changed: ${(events.events || []).length}`);
    if ((timeline.records || []).length !== EXPECTED_OVERLAY) throw new Error(`Overlay timeline count changed: ${(timeline.records || []).length}`);
    if (manifest?.counts?.current_chronology_records !== EXPECTED_CURRENT) throw new Error('Overlay manifest current count mismatch');
    const ids = new Set(historical.map(row => row.event_id));
    for (const row of events.events || []) {
      if (ids.has(row.event_id)) throw new Error(`Overlay duplicates historical event ${row.event_id}`);
      ids.add(row.event_id);
    }
    if (ids.size !== EXPECTED_CURRENT) throw new Error(`98 + 10 invariant failed: ${ids.size}`);
    const eventIds = new Set((events.events || []).map(row => row.event_id));
    const timelineIds = new Set((timeline.records || []).map(row => row.event_id));
    if (eventIds.size !== timelineIds.size || [...eventIds].some(id => !timelineIds.has(id))) throw new Error('Overlay timeline/event IDs differ');
    const sourceIds = new Set((sources.sources || []).map(row => row.source_id));
    for (const row of events.events || []) {
      for (const ref of row.source_refs || []) {
        const id = typeof ref === 'string' ? ref : ref.source_id;
        if (!sourceIds.has(id) && !window.ATLAS_LEDGER?.sources?.sources?.some(source => source.source_id === id)) {
          throw new Error(`Unresolved overlay source ${id}`);
        }
      }
    }
  }

  function installTemporal(events) {
    const current = window.ATLAS_TEMPORAL_INDEX || [];
    const existing = new Set(current.map(row => row.event_id));
    const additions = events.filter(row => !existing.has(row.event_id)).map(row => ({
      ...row,
      temporal_record_type: 'CURRENT_OVERLAY',
      day: row.event_date,
      month: row.event_date?.slice(0, 7)
    }));
    window.ATLAS_TEMPORAL_INDEX = current.concat(additions).sort((a, b) =>
      String(a.event_date || '').localeCompare(String(b.event_date || '')) ||
      String(a.event_id || '').localeCompare(String(b.event_id || ''))
    );
    window.registerAtlasEvents?.(additions);
  }

  function updateLabels() {
    document.querySelectorAll('[data-current-chronology-count]').forEach(node => { node.textContent = String(EXPECTED_CURRENT); });
    const badge = document.querySelector('.isr-current-overlay-badge');
    if (badge) badge.textContent = `Current chronology · ${EXPECTED_CURRENT} records through Aug. 24 14:14 ET`;
  }

  async function init() {
    await waitFor(() => window.ATLAS_LEDGER && window.ATLAS_TEMPORAL_INDEX && window.registerAtlasEvents && window.registerAtlasSources);
    const [manifest, events, timeline, sources] = await Promise.all([
      fetchJson('manifest.json'), fetchJson('events.json'), fetchJson('timeline.json'), fetchJson('sources.json')
    ]);
    assertPayload(manifest, events, timeline, sources);
    window.ATLAS_CURRENT_UPDATE = {
      cutoff: CUTOFF,
      currentDay: CURRENT_DAY,
      manifest,
      events: events.events,
      timeline: timeline.records,
      sources: sources.sources
    };
    window.registerAtlasSources(sources.sources);
    installTemporal(events.events);
    updateLabels();
    window.ISRFullScope20260822?.refreshTimeline?.();
    window.dispatchEvent(new CustomEvent('atlascurrentready', { detail: { count: EXPECTED_CURRENT, cutoff: CUTOFF } }));
  }

  const start = () => init().catch(error => console.warn('Aug. 24 current overlay unavailable; locked historical ledger remains usable.', error));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}());
