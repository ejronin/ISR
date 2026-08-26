'use strict';
(function ISRCurrentUpdate20260825(){
  if (window.__ISR_CURRENT_UPDATE_20260825__) return;
  window.__ISR_CURRENT_UPDATE_20260825__ = true;

  const PATH = './data/current-update-20260825/';
  const CUTOFF = '2026-08-25T21:14:00-04:00';
  const EXPECTED_PRIOR = 108;
  const EXPECTED_OVERLAY = 8;
  const EXPECTED_CURRENT = 116;

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
      if (Date.now() - started > timeout) return reject(new Error('Aug25 current-overlay dependency timeout'));
      setTimeout(poll, 50);
    }());
  });

  function assertPayload(manifest, events, timeline, sources) {
    const current = window.ATLAS_TEMPORAL_INDEX || [];
    if (current.length < EXPECTED_PRIOR) throw new Error(`Prior chronology not loaded: ${current.length}`);
    if ((events.events || []).length !== EXPECTED_OVERLAY) throw new Error(`Aug25 event count mismatch: ${(events.events || []).length}`);
    if ((timeline.records || []).length !== EXPECTED_OVERLAY) throw new Error(`Aug25 timeline count mismatch: ${(timeline.records || []).length}`);
    if (manifest?.counts?.current_chronology_records !== EXPECTED_CURRENT) throw new Error('Aug25 manifest count mismatch');
    const existing = new Set(current.map(row => row.event_id));
    for (const row of events.events || []) {
      if (existing.has(row.event_id)) throw new Error(`Aug25 overlay duplicates ${row.event_id}`);
    }
    const eventIds = new Set((events.events || []).map(row => row.event_id));
    const timelineIds = new Set((timeline.records || []).map(row => row.event_id));
    if (eventIds.size !== timelineIds.size || [...eventIds].some(id => !timelineIds.has(id))) throw new Error('Aug25 timeline/event IDs differ');
    const sourceIds = new Set((sources.sources || []).map(row => row.source_id));
    for (const row of events.events || []) {
      for (const ref of row.source_refs || []) {
        const id = typeof ref === 'string' ? ref : ref.source_id;
        const prior = window.ATLAS_LEDGER?.sources?.sources?.some(source => source.source_id === id) || window.ATLAS_CURRENT_UPDATE?.sources?.some(source => source.source_id === id);
        if (!sourceIds.has(id) && !prior) throw new Error(`Unresolved Aug25 source ${id}`);
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
      String(a.event_time || '').localeCompare(String(b.event_time || '')) ||
      String(a.event_id || '').localeCompare(String(b.event_id || ''))
    );
    window.registerAtlasEvents?.(additions);
  }

  function updateLabels() {
    document.querySelectorAll('[data-current-chronology-count]').forEach(node => { node.textContent = String(EXPECTED_CURRENT); });
    document.querySelectorAll('.kpi.info').forEach(kpi => {
      if (/current chronology records/i.test(kpi.textContent || '')) {
        const b = kpi.querySelector('b'); if (b) b.textContent = String(EXPECTED_CURRENT);
        const span = kpi.querySelector('span'); if (span) span.textContent = 'current chronology records · 98 locked + 10 Aug. 24 + 8 Aug. 25 overlays';
      }
    });
    const badge = document.querySelector('.isr-current-overlay-badge');
    if (badge) badge.textContent = `Current chronology · ${EXPECTED_CURRENT} records through Aug. 25 21:14 ET`;
    const stamp = document.querySelector('.review-stamp');
    if (stamp) stamp.textContent = 'Reviewed through 2026-08-25 21:14 ET';
    const strip = document.querySelector('#timeline .latest-strip');
    if (strip) strip.innerHTML = '<b>Current OSINT overlay — Aug. 25, 21:14 ET:</b> 116 chronology records are available: 98 locked historical records + 10 Aug. 24 overlay records + 8 new Aug. 24/25 records. Event occurrence time remains controlling when known; claims and verified effects remain separate.';
  }

  function addCurrentPicture() {
    const panel = document.querySelector('#snapshot');
    if (!panel || panel.querySelector('[data-aug25-current-picture]')) return;
    const box = document.createElement('div');
    box.className = 'callout';
    box.dataset.aug25CurrentPicture = '1';
    box.innerHTML = '<strong>Latest OSINT · Aug. 25 21:14 ET:</strong> Pakistan reports significant mediation progress; Iran and Oman moved to a joint temporary Hormuz corridor/mine-clearing framework; Washington is returning diplomatic staff to some regional posts; Tehran fuel queues and subsidy pressure are visible; and oil prices continued falling on expectations of a maritime opening. A separate Iranian state-TV threat segment is recorded as information-environment evidence, not proof of an operational state assassination plan.';
    const grid = panel.querySelector('.current-picture-grid');
    if (grid?.nextSibling) panel.insertBefore(box, grid.nextSibling); else panel.prepend(box);
  }

  function loadSuccessor() {
    if (document.querySelector('script[data-current-update-20260825-late]')) return;
    const script = document.createElement('script');
    script.src = './js/current-update-20260825-late.js?v=20260825-r1';
    script.async = false;
    script.dataset.currentUpdate20260825Late = '1';
    document.head.append(script);
  }

  async function init() {
    await waitFor(() => window.ATLAS_CURRENT_UPDATE?.events?.length === 10 && window.ATLAS_TEMPORAL_INDEX && window.registerAtlasEvents && window.registerAtlasSources);
    const [manifest, events, timeline, sources] = await Promise.all([
      fetchJson('manifest.json'), fetchJson('events.json'), fetchJson('timeline.json'), fetchJson('sources.json')
    ]);
    assertPayload(manifest, events, timeline, sources);
    window.ATLAS_CURRENT_UPDATE_20260825 = { cutoff: CUTOFF, manifest, events: events.events, timeline: timeline.records, sources: sources.sources };
    window.registerAtlasSources(sources.sources);
    installTemporal(events.events);
    updateLabels();
    addCurrentPicture();
    window.ISRFullScope20260822?.refreshTimeline?.();
    window.dispatchEvent(new CustomEvent('atlascurrentready20260825', { detail: { count: EXPECTED_CURRENT, cutoff: CUTOFF } }));
    loadSuccessor();
  }

  const start = () => init().catch(error => console.warn('Aug. 25 current overlay unavailable; prior chronology remains usable.', error));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}());
