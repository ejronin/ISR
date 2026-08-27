'use strict';
(function ISRWikiMapReconciliation20260826(){
  if (window.__ISR_WIKI_MAP_RECON_20260826__) return;
  window.__ISR_WIKI_MAP_RECON_20260826__ = true;

  const BASE='./data/wiki-map-reconciliation-20260826/';
  const EXPECTED={sources:56,events:81,timeline:81,strikes:81,material_losses:40,candidates:99,runtime_chronology:202};

  const waitFor=(predicate,timeout=15000)=>new Promise((resolve,reject)=>{
    const started=Date.now();
    (function poll(){
      const value=predicate();
      if(value)return resolve(value);
      if(Date.now()-started>timeout)return reject(new Error('Historical reconciliation dependency timeout'));
      setTimeout(poll,50);
    }());
  });
  const fetchJson=async file=>{
    const response=await fetch(BASE+file,{cache:'no-store'});
    if(!response.ok)throw new Error(`${file}: ${response.status}`);
    return response.json();
  };
  const sourceId=ref=>{
    let value=ref;
    for(let i=0;i<4&&value&&typeof value==='object';i++)value=value.source_id||value.id;
    return typeof value==='string'?value:null;
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeUrl=value=>{try{const u=new URL(value,location.href);return u.protocol==='https:'?u.href:''}catch{return''}};
  const sourceLinks=urls=>(urls||[]).map((url,i)=>{const href=safeUrl(url);return href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">source ${i+1}</a>`:''}).filter(Boolean).join(' ');

  function assertPayload(payload){
    for(const [key,count] of Object.entries({sources:56,events:81,timeline:81,strikes:81,material_losses:40})){
      if(!Array.isArray(payload[key])||payload[key].length!==count)throw new Error(`${key} count mismatch`);
    }
    const accepted=payload.coverage_audit?.accepted_or_corrected||[];
    const rejected=payload.coverage_audit?.deduped_rejected_or_unresolved||[];
    if(accepted.length!==81||rejected.length!==18||accepted.length+rejected.length!==EXPECTED.candidates)throw new Error('coverage-audit count mismatch');
    if(rejected.some(row=>!row.reason||!row.disposition))throw new Error('rejected candidate lacks reason');
    const sourceIds=new Set(payload.sources.map(row=>row.source_id));
    if(sourceIds.size!==EXPECTED.sources)throw new Error('duplicate reconciliation source IDs');
    for(const source of payload.sources){
      if(/wikipedia|wikizero/i.test(source.url||''))throw new Error(`Wikipedia URL leaked into authoritative sources: ${source.source_id}`);
    }
    const eventIds=new Set();
    for(const event of payload.events){
      if(eventIds.has(event.event_id))throw new Error(`duplicate event ${event.event_id}`);
      eventIds.add(event.event_id);
      const refs=(event.source_refs||[]).map(sourceId).filter(Boolean);
      if(!refs.length)throw new Error(`event lacks underlying evidence ${event.event_id}`);
      for(const id of refs)if(!sourceIds.has(id))throw new Error(`unresolved source ${id}`);
    }
    const timelineIds=new Set(payload.timeline.map(row=>row.event_id));
    if(timelineIds.size!==eventIds.size||[...eventIds].some(id=>!timelineIds.has(id)))throw new Error('timeline/event ID mismatch');
  }

  function installSources(payload){
    window.registerAtlasSources?.(payload.sources);
    const ledgerSources=window.ATLAS_LEDGER?.sources?.sources;
    if(Array.isArray(ledgerSources)){
      const existing=new Set(ledgerSources.map(row=>row.source_id));
      for(const row of payload.sources)if(!existing.has(row.source_id))ledgerSources.push(row);
    }
  }

  function installHistory(payload){
    const current=window.ATLAS_TEMPORAL_INDEX||[];
    const existing=new Set(current.map(row=>row.event_id));
    const additions=payload.events.filter(row=>!existing.has(row.event_id)).map(row=>({
      ...row,
      temporal_record_type:'HISTORICAL_RECONCILIATION',
      temporal_contexts:[...new Set([...(row.temporal_contexts||[]),'strike'])],
      day:row.event_date,
      month:row.event_date?.slice(0,7)
    }));
    window.ATLAS_TEMPORAL_INDEX=current.concat(additions).sort((a,b)=>
      String(a.event_date||'').localeCompare(String(b.event_date||''))||
      String(a.event_time||'').localeCompare(String(b.event_time||''))||
      String(a.event_id||'').localeCompare(String(b.event_id||''))
    );
    const ledgerEvents=window.ATLAS_LEDGER?.events?.events;
    if(Array.isArray(ledgerEvents)){
      const known=new Set(ledgerEvents.map(row=>row.event_id));
      for(const row of additions)if(!known.has(row.event_id))ledgerEvents.push(row);
    }
    const ledgerTimeline=window.ATLAS_LEDGER?.timeline?.records;
    if(Array.isArray(ledgerTimeline)){
      const known=new Set(ledgerTimeline.map(row=>row.event_id));
      for(const row of payload.timeline)if(!known.has(row.event_id))ledgerTimeline.push(row);
    }
    window.registerAtlasEvents?.(additions);
    window.registerAtlasTimelineRecords?.(payload.timeline);
  }

  function installLosses(payload){
    const ledger=window.ATLAS_LEDGER?.['material-losses'];
    if(!ledger?.records)return;
    const existing=new Set(ledger.records.map(row=>row.loss_id));
    for(const row of payload.material_losses)if(!existing.has(row.loss_id))ledger.records.push(row);
    const search=document.getElementById('lossSearch');
    if(search)search.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function installStrikes(payload){
    const api=window.registerAtlasStrikeRecords;
    if(typeof api!=='function')throw new Error('Canonical strike registration API unavailable');
    const result=api(payload.strikes,{refresh:true});
    if(result.eligible!==EXPECTED.strikes||result.registered!==EXPECTED.strikes){
      throw new Error(`reconciliation strike registration mismatch ${result.registered}/${result.eligible}; expected ${EXPECTED.strikes}/${EXPECTED.strikes}`);
    }
    return result;
  }

  function validateTimelineMapLinks(payload){
    let linked=0;
    for(const event of payload.events){
      const refs=[...(event.map_refs||[]),...(event.facility_refs||[])];
      const markerRef=refs.find(ref=>window.getAtlasMapMarker?.(ref));
      if(!markerRef)throw new Error(`reconciliation timeline event lacks canonical map marker: ${event.event_id}`);
      linked++;
    }
    if(linked!==EXPECTED.events)throw new Error(`reconciliation map-linked timeline count mismatch ${linked} != ${EXPECTED.events}`);
    return linked;
  }

  function chronologyCount(){
    const ids=new Set();
    for(const row of window.ATLAS_TEMPORAL_INDEX||[]){
      if(!row?.event_id)continue;
      if(row.temporal_record_type==='ANNOTATION')continue;
      ids.add(row.event_id);
    }
    return ids.size;
  }

  function updateLabels(){
    document.querySelectorAll('[data-current-chronology-count]').forEach(node=>{node.textContent=String(EXPECTED.runtime_chronology);});
    document.querySelectorAll('.kpi.info').forEach(kpi=>{
      if(/current chronology records/i.test(kpi.textContent||'')){
        const b=kpi.querySelector('b');if(b)b.textContent=String(EXPECTED.runtime_chronology);
        const span=kpi.querySelector('span');if(span)span.textContent='current chronology records · 98 locked + 81 historical reconciliation + 10 Aug. 24 + 8 Aug. 25 + 1 late Aug. 25 + 4 Aug. 26 overlay records';
      }
    });
    const badge=document.querySelector('.isr-current-overlay-badge');
    if(badge)badge.textContent='Current chronology · 202 records through Aug. 26 16:30 ET';
    const stamp=document.querySelector('.review-stamp');
    if(stamp)stamp.textContent='Reviewed through 2026-08-26 16:30 ET';
  }

  async function init(){
    await waitFor(()=>window.ATLAS_CURRENT_UPDATE_20260826&&window.ATLAS_DATA&&window.ATLAS_LEDGER&&window.registerAtlasEvents&&window.registerAtlasSources&&window.registerAtlasStrikeRecords&&window.getAtlasMapMarker&&window.atlasMap);
    const [manifest,events,timeline,sources,strikes,losses,audit]=await Promise.all([
      fetchJson('manifest.json'),fetchJson('events.json'),fetchJson('timeline.json'),fetchJson('sources.json'),fetchJson('strikes.json'),fetchJson('material-losses.json'),fetchJson('coverage-audit.json')
    ]);
    const payload={manifest,events:events.events||[],timeline:timeline.records||[],sources:sources.sources||[],strikes:strikes.strikes||[],material_losses:losses.records||[],coverage_audit:audit};
    assertPayload(payload);
    installSources(payload);
    installHistory(payload);
    installLosses(payload);
    const strikeRegistration=installStrikes(payload);
    const mapLinkedTimeline=validateTimelineMapLinks(payload);
    window.setAtlasCurrentOsintCutoff?.('2026-08-26 16:30 ET');
    updateLabels();
    const runtime=chronologyCount();
    if(runtime!==EXPECTED.runtime_chronology)throw new Error(`runtime chronology mismatch ${runtime} != ${EXPECTED.runtime_chronology}`);
    window.ATLAS_WIKI_RECON_20260826={cutoff:manifest.collection_cutoff||manifest.created_at,counts:{...EXPECTED,runtime_chronology:runtime,temporal_index_records:(window.ATLAS_TEMPORAL_INDEX||[]).length,registered_strike_markers:strikeRegistration.registered,map_linked_timeline_records:mapLinkedTimeline},coverageAudit:audit,sources:payload.sources,events:payload.events,materialLosses:payload.material_losses};
    // The legacy timeline list may have been retired/rebuilt by the public workspace before this late async loader completes.
    // Only refresh it when its canonical DOM target still exists; the full-scope timeline refresh owns the rebuilt surface.
    if(document.getElementById('timelineList')){
      window.renderAtlasTimeline?.(document.getElementById('timelineSearch')?.value||'');
      window.refreshAtlasTimelineMap?.();
    }
    window.ISRFullScope20260822?.refreshTimeline?.();
    window.dispatchEvent(new CustomEvent('atlaswikireconready20260826',{detail:window.ATLAS_WIKI_RECON_20260826.counts}));
  }

  const start=()=>init().catch(error=>{
    window.ATLAS_WIKI_RECON_ERROR_20260826={message:String(error?.message||error),stack:String(error?.stack||'')};
    console.warn('Historical regional reconciliation unavailable; prior Atlas data remains usable.',error);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}());
