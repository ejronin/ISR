'use strict';
(function ISRCurrentUpdate20260826(){
  if (window.__ISR_CURRENT_UPDATE_20260826__) return;
  window.__ISR_CURRENT_UPDATE_20260826__ = true;

  const PATH = './data/current-update-20260826/';
  const CUTOFF = '2026-08-26T15:52:00-04:00';
  const EXPECTED_PRIOR = 117;
  const EXPECTED_OVERLAY = 4;
  const EXPECTED_CURRENT = 121;

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
      if (Date.now() - started > timeout) return reject(new Error('Aug26 overlay dependency timeout'));
      setTimeout(poll, 50);
    }());
  });

  function assertPayload(manifest, events, timeline, sources){
    const current = window.ATLAS_TEMPORAL_INDEX || [];
    if (current.length < EXPECTED_PRIOR) throw new Error(`Prior chronology not loaded: ${current.length}`);
    if ((events.events || []).length !== EXPECTED_OVERLAY) throw new Error('Aug26 event count mismatch');
    if ((timeline.records || []).length !== EXPECTED_OVERLAY) throw new Error('Aug26 timeline count mismatch');
    if (manifest?.counts?.current_chronology_records !== EXPECTED_CURRENT) throw new Error('Aug26 manifest count mismatch');
    const existing = new Set(current.map(row => row.event_id));
    for (const row of events.events || []) if (existing.has(row.event_id)) throw new Error(`Aug26 overlay duplicates ${row.event_id}`);
    const sourceIds = new Set((sources.sources || []).map(row => row.source_id));
    const knownMapRefs = new Set((window.ATLAS_LEDGER?.['map-links']?.links || []).map(row => row.map_ref));
    for (const row of events.events || []) {
      for (const ref of row.source_refs || []) {
        const id = typeof ref === 'string' ? ref : ref.source_id;
        if (!sourceIds.has(id)) throw new Error(`Unresolved Aug26 source ${id}`);
      }
      for (const mapRef of row.map_refs || []) if (!knownMapRefs.has(mapRef)) throw new Error(`Unresolved Aug26 map ref ${mapRef}`);
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
        const span = kpi.querySelector('span'); if (span) span.textContent = 'current chronology records · 98 locked + 10 Aug. 24 + 8 Aug. 25 + 1 late Aug. 25 + 4 Aug. 26 overlay records';
      }
    });
    const badge = document.querySelector('.isr-current-overlay-badge');
    if (badge) badge.textContent = `Current chronology · ${EXPECTED_CURRENT} records through Aug. 26 15:52 ET`;
    const stamp = document.querySelector('.review-stamp');
    if (stamp) stamp.textContent = 'Reviewed through 2026-08-26 15:52 ET';
    const strip = document.querySelector('#timeline .latest-strip');
    if (strip) strip.innerHTML = '<b>Current OSINT overlay — Aug. 26, 15:52 ET:</b> Iran says Hormuz control/revenue terms were agreed with Oman, but independent reporting still describes an evolving framework. Kpler traffic remained well below its recent average; Iran\'s 45-ship blacklist is changing buyer behavior; QatarEnergy is expanding ship-to-ship export workarounds outside Hormuz.';
  }

  function addCurrentPicture(){
    const panel = document.querySelector('#snapshot');
    if (!panel || panel.querySelector('[data-aug26-current-picture]')) return;
    const box = document.createElement('div');
    box.className = 'callout';
    box.dataset.aug26CurrentPicture = '1';
    box.innerHTML = '<strong>Aug. 26 current read:</strong> The Hormuz negotiation is materially moving, but Iran\'s finality claim is not yet the same thing as independently verified implementation. Visible commodity traffic remains depressed, the Iranian ship blacklist is producing commercial avoidance behavior, and Gulf exporters continue building workarounds outside the Strait.';
    const grid = panel.querySelector('.current-picture-grid');
    if (grid?.nextSibling) panel.insertBefore(box, grid.nextSibling); else panel.prepend(box);
  }

  function loadHistoricalReconciliation(){
    if(document.querySelector('script[data-historical-reconciliation-20260826]')) return;
    const script=document.createElement('script');
    script.src='./js/wiki-map-reconciliation-20260826.js?v=20260826-r2';
    script.async=false;
    script.dataset.historicalReconciliation20260826='1';
    document.head.append(script);
  }

  function loadAug27Update(){
    if(document.querySelector('script[data-current-update-20260827]'))return;
    const script=document.createElement('script');
    script.src='./js/current-update-20260827.js?v=20260827-r1';
    script.async=false;
    script.dataset.currentUpdate20260827='1';
    document.head.append(script);
  }

  async function init(){
    await waitFor(() => (window.ATLAS_TEMPORAL_INDEX || []).length >= EXPECTED_PRIOR && window.ATLAS_CURRENT_UPDATE_20260825_LATE && window.registerAtlasEvents && window.registerAtlasSources);
    const [manifest,events,timeline,sources] = await Promise.all([
      fetchJson('manifest.json'), fetchJson('events.json'), fetchJson('timeline.json'), fetchJson('sources.json')
    ]);
    assertPayload(manifest,events,timeline,sources);
    window.ATLAS_CURRENT_UPDATE_20260826 = { cutoff:CUTOFF, manifest, events:events.events, timeline:timeline.records, sources:sources.sources };
    window.registerAtlasSources(sources.sources);
    installTemporal(events.events);
    updateLabels();
    addCurrentPicture();
    window.ISRFullScope20260822?.refreshTimeline?.();
    window.dispatchEvent(new CustomEvent('atlascurrentready20260826', { detail:{ count:EXPECTED_CURRENT, cutoff:CUTOFF } }));
  }

  const start = () => init().then(()=>{loadHistoricalReconciliation();loadAug27Update();}).catch(error => console.warn('Aug. 26 current overlay unavailable; prior chronology remains usable.', error));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
}());
