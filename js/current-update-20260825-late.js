'use strict';
(function ISRCurrentUpdate20260825Late(){
  if (window.__ISR_CURRENT_UPDATE_20260825_LATE__) return;
  window.__ISR_CURRENT_UPDATE_20260825_LATE__ = true;

  const PATH = './data/current-update-20260825-late/';
  const CUTOFF = '2026-08-25T21:32:55-04:00';
  const EXPECTED_PRIOR = 116;
  const EXPECTED_OVERLAY = 1;
  const EXPECTED_CURRENT = 117;

  const fetchJson = async file => {
    const response = await fetch(PATH + file, { cache:'no-store' });
    if (!response.ok) throw new Error(`${file}: ${response.status}`);
    return response.json();
  };

  const waitFor = (predicate, timeout = 12000) => new Promise((resolve,reject) => {
    const started = Date.now();
    (function poll(){
      const value = predicate();
      if (value) return resolve(value);
      if (Date.now() - started > timeout) return reject(new Error('Late Aug25 overlay dependency timeout'));
      setTimeout(poll, 50);
    }());
  });

  function loadChinaOilShift(){
    if (document.querySelector('script[data-china-oil-shift-r1]')) return;
    const script = document.createElement('script');
    script.src = './js/china-oil-sourcing-shift-r1.js?v=20260825-r1';
    script.async = false;
    script.dataset.chinaOilShiftR1 = '1';
    document.head.append(script);
  }

  function assertPayload(manifest, events, timeline, sources){
    const current = window.ATLAS_TEMPORAL_INDEX || [];
    if (current.length < EXPECTED_PRIOR) throw new Error(`Prior chronology not loaded: ${current.length}`);
    if ((events.events || []).length !== EXPECTED_OVERLAY) throw new Error('Late Aug25 event count mismatch');
    if ((timeline.records || []).length !== EXPECTED_OVERLAY) throw new Error('Late Aug25 timeline count mismatch');
    if (manifest?.counts?.current_chronology_records !== EXPECTED_CURRENT) throw new Error('Late Aug25 manifest count mismatch');
    const existing = new Set(current.map(row => row.event_id));
    for (const row of events.events || []) if (existing.has(row.event_id)) throw new Error(`Late Aug25 overlay duplicates ${row.event_id}`);
    const sourceIds = new Set((sources.sources || []).map(row => row.source_id));
    for (const row of events.events || []) {
      for (const ref of row.source_refs || []) {
        const id = typeof ref === 'string' ? ref : ref.source_id;
        const prior = window.ATLAS_LEDGER?.sources?.sources?.some(source => source.source_id === id)
          || window.ATLAS_CURRENT_UPDATE?.sources?.some(source => source.source_id === id)
          || window.ATLAS_CURRENT_UPDATE_20260825?.sources?.some(source => source.source_id === id);
        if (!sourceIds.has(id) && !prior) throw new Error(`Unresolved late Aug25 source ${id}`);
      }
    }
  }

  function installTemporal(events){
    const current = window.ATLAS_TEMPORAL_INDEX || [];
    const existing = new Set(current.map(row => row.event_id));
    const additions = events.filter(row => !existing.has(row.event_id)).map(row => ({
      ...row,
      temporal_record_type:'CURRENT_OVERLAY',
      day:row.event_date,
      month:row.event_date?.slice(0,7)
    }));
    window.ATLAS_TEMPORAL_INDEX = current.concat(additions).sort((a,b) =>
      String(a.event_date || '').localeCompare(String(b.event_date || '')) ||
      String(a.event_time || '').localeCompare(String(b.event_time || '')) ||
      String(a.event_id || '').localeCompare(String(b.event_id || ''))
    );
    window.registerAtlasEvents?.(additions);
  }

  function updateLabels(){
    document.querySelectorAll('[data-current-chronology-count]').forEach(node => { node.textContent = String(EXPECTED_CURRENT); });
    document.querySelectorAll('.kpi.info').forEach(kpi => {
      if (/current chronology records/i.test(kpi.textContent || '')) {
        const b = kpi.querySelector('b'); if (b) b.textContent = String(EXPECTED_CURRENT);
        const span = kpi.querySelector('span'); if (span) span.textContent = 'current chronology records · 98 locked + 10 Aug. 24 + 8 Aug. 25 + 1 late Aug. 25 overlays';
      }
    });
    const badge = document.querySelector('.isr-current-overlay-badge');
    if (badge) badge.textContent = `Current chronology · ${EXPECTED_CURRENT} records through Aug. 25 21:32 ET`;
    const stamp = document.querySelector('.review-stamp');
    if (stamp) stamp.textContent = 'Reviewed through 2026-08-25 21:32 ET';
    const strip = document.querySelector('#timeline .latest-strip');
    if (strip) strip.innerHTML = '<b>Current OSINT overlay — Aug. 25, 21:32 ET:</b> 117 chronology records are available. The latest shipping read still shows near-shutdown conditions at Hormuz despite diplomatic movement; provider-specific AIS/tracking counts remain methodology-bounded.';
  }

  function addCurrentPicture(){
    const panel = document.querySelector('#snapshot');
    if (!panel || panel.querySelector('[data-aug25-late-current-picture]')) return;
    const box = document.createElement('div');
    box.className = 'callout';
    box.dataset.aug25LateCurrentPicture = '1';
    box.innerHTML = '<strong>Late Aug. 25 shipping check:</strong> Windward data reported zero outbound Hormuz transits in the prior 24 hours, four inbound vessels on Aug. 24, and traffic around 3% of prewar levels. That is source-specific tracking evidence, not proof of literally zero physical movement.';
    const grid = panel.querySelector('.current-picture-grid');
    if (grid?.nextSibling) panel.insertBefore(box, grid.nextSibling); else panel.prepend(box);
  }

  async function init(){
    await waitFor(() => (window.ATLAS_TEMPORAL_INDEX || []).length >= EXPECTED_PRIOR && window.registerAtlasEvents && window.registerAtlasSources);
    const [manifest,events,timeline,sources] = await Promise.all([
      fetchJson('manifest.json'), fetchJson('events.json'), fetchJson('timeline.json'), fetchJson('sources.json')
    ]);
    assertPayload(manifest,events,timeline,sources);
    window.ATLAS_CURRENT_UPDATE_20260825_LATE = { cutoff:CUTOFF, manifest, events:events.events, timeline:timeline.records, sources:sources.sources };
    window.registerAtlasSources(sources.sources);
    installTemporal(events.events);
    updateLabels();
    addCurrentPicture();
    window.ISRFullScope20260822?.refreshTimeline?.();
    window.dispatchEvent(new CustomEvent('atlascurrentready20260825late', { detail:{ count:EXPECTED_CURRENT, cutoff:CUTOFF } }));
  }

  const start = () => {
    loadChinaOilShift();
    init().catch(error => console.warn('Late Aug. 25 current overlay unavailable; prior chronology remains usable.', error));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
}());
