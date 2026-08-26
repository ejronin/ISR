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

  function findStrikeLayer(){
    const map=window.atlasMap;
    if(!map)return null;
    const known=new Set(['Kharg Island military targets','Bandar Abbas / port-area July strike reporting']);
    return Object.values(map._layers||{}).find(layer=>{
      if(typeof layer?.eachLayer!=='function')return false;
      let match=false;
      layer.eachLayer(child=>{if(known.has(child?.options?.title))match=true;});
      return match;
    })||null;
  }

  function installStrikes(payload){
    const data=window.ATLAS_DATA;
    const map=window.atlasMap;
    if(!data?.strikes||!map||!window.L)return new Map();
    const existing=new Set(data.strikes.map(row=>row.id));
    const rows=payload.strikes.filter(row=>!existing.has(row.id));
    data.strikes.push(...rows);
    const layer=findStrikeLayer();
    const markers=new Map();
    if(!layer)return markers;
    for(const row of rows){
      if(!Number.isFinite(row.lat)||!Number.isFinite(row.lon))continue;
      const popup=`<div class="atlas-popup"><h3>${esc(row.name)}</h3><div class="popup-badges"><span class="evidence-badge evidence-supported">${esc(row.verification||'SUPPORTED')}</span></div><p><b>Date</b>${esc(row.event_date||'Date unresolved.')}</p><p><b>Actor</b>${esc(row.actor||'Attribution unresolved.')}</p><p><b>Target / effect</b>${esc(row.target_type||row.note||'')}</p>${row.note?`<p><b>Context</b>${esc(row.note)}</p>`:''}<div class="sources">${sourceLinks(row.source_urls)}</div></div>`;
      const icon=L.divIcon({className:'atlas-marker-host evidence-marker-supported',html:'<div class="pin diamond" style="--marker-color:#364454"><img src="assets/icons/strike.svg" alt=""/></div>',iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-15]});
      const marker=L.marker([row.lat,row.lon],{icon,title:row.name,alt:row.name,keyboard:true}).bindPopup(popup,{maxWidth:380});
      marker.addTo(layer);
      markers.set(row.id,marker);
    }
    return markers;
  }

  function installPan(markers){
    const previous=window.pan;
    window.pan=function(id){
      const marker=markers.get(id);
      if(marker&&window.atlasMap){
        const map=window.atlasMap;
        const layer=findStrikeLayer();
        if(layer&&!map.hasLayer(layer))layer.addTo(map);
        if(!map.getBounds().pad(-.15).contains(marker.getLatLng()))map.panTo(marker.getLatLng());
        if(map.getZoom()<6)map.setZoom(6);
        marker.openPopup();
        return true;
      }
      return typeof previous==='function'?previous(id):false;
    };
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
    await waitFor(()=>window.ATLAS_CURRENT_UPDATE_20260826&&window.ATLAS_DATA&&window.ATLAS_LEDGER&&window.registerAtlasEvents&&window.registerAtlasSources&&window.atlasMap);
    const [manifest,events,timeline,sources,strikes,losses,audit]=await Promise.all([
      fetchJson('manifest.json'),fetchJson('events.json'),fetchJson('timeline.json'),fetchJson('sources.json'),fetchJson('strikes.json'),fetchJson('material-losses.json'),fetchJson('coverage-audit.json')
    ]);
    const payload={manifest,events:events.events||[],timeline:timeline.records||[],sources:sources.sources||[],strikes:strikes.strikes||[],material_losses:losses.records||[],coverage_audit:audit};
    assertPayload(payload);
    installSources(payload);
    installHistory(payload);
    installLosses(payload);
    const markers=installStrikes(payload);
    installPan(markers);
    updateLabels();
    const runtime=(window.ATLAS_TEMPORAL_INDEX||[]).length;
    if(runtime!==EXPECTED.runtime_chronology)throw new Error(`runtime chronology mismatch ${runtime} != ${EXPECTED.runtime_chronology}`);
    window.ATLAS_WIKI_RECON_20260826={cutoff:manifest.collection_cutoff||manifest.created_at,counts:{...EXPECTED,runtime_chronology:runtime},coverageAudit:audit,sources:payload.sources,events:payload.events,materialLosses:payload.material_losses};
    window.ISRFullScope20260822?.refreshTimeline?.();
    window.dispatchEvent(new CustomEvent('atlaswikireconready20260826',{detail:window.ATLAS_WIKI_RECON_20260826.counts}));
  }

  const start=()=>init().catch(error=>console.warn('Historical regional reconciliation unavailable; prior Atlas data remains usable.',error));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}());
