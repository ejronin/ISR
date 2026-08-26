'use strict';
(function ISRWikiMapReconciliation20260826(){
  if (window.__ISR_WIKI_MAP_RECON_20260826__) return;
  window.__ISR_WIKI_MAP_RECON_20260826__ = true;

  const BASE = './data/wiki-map-reconciliation-20260826/';
  const PARTS = [1,2,3,4].map(n => `${BASE}payload.part${n}.b64`);
  const EXPECTED = { sources:56, events:81, timeline:81, strikes:81, material_losses:40 };

  const waitFor = (predicate, timeout=15000) => new Promise((resolve,reject) => {
    const started=Date.now();
    (function poll(){
      const value=predicate();
      if (value) return resolve(value);
      if (Date.now()-started > timeout) return reject(new Error('Wikipedia reconciliation dependency timeout'));
      setTimeout(poll,50);
    }());
  });

  const fetchText = async path => {
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.text();
  };

  async function decodePayload(){
    const encoded=(await Promise.all(PARTS.map(fetchText))).join('').replace(/\s+/g,'');
    const binary=atob(encoded);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    if(typeof DecompressionStream!=='function') throw new Error('Browser lacks gzip DecompressionStream');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function safeUrl(value){
    try { const u=new URL(value,location.href); return /^https:$/.test(u.protocol)?u.href:''; } catch { return ''; }
  }
  function sourceLinks(urls){
    return (urls||[]).map((url,i)=>{
      const href=safeUrl(url);
      return href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">source ${i+1}</a>`:'';
    }).filter(Boolean).join(' ');
  }

  function assertPayload(payload){
    for(const [key,count] of Object.entries(EXPECTED)){
      if(!Array.isArray(payload[key]) || payload[key].length!==count) throw new Error(`${key} count mismatch`);
    }
    const sourceIds=new Set(payload.sources.map(x=>x.source_id));
    if(sourceIds.size!==EXPECTED.sources) throw new Error('duplicate reconciliation source IDs');
    for(const source of payload.sources){
      if(/wikipedia|wikizero/i.test(source.url||'')) throw new Error(`Wikipedia URL leaked into authoritative sources: ${source.source_id}`);
    }
    const ids=new Set();
    for(const event of payload.events){
      if(ids.has(event.event_id)) throw new Error(`duplicate event ${event.event_id}`);
      ids.add(event.event_id);
      for(const ref of event.source_refs||[]){
        const id=typeof ref==='string'?ref:ref.source_id;
        if(!sourceIds.has(id)) throw new Error(`unresolved source ${id}`);
      }
    }
  }

  function installHistory(payload){
    window.registerAtlasSources?.(payload.sources);
    const current=window.ATLAS_TEMPORAL_INDEX||[];
    const existing=new Set(current.map(row=>row.event_id));
    const additions=payload.events.filter(row=>!existing.has(row.event_id)).map(row=>({
      ...row,
      temporal_record_type:'HISTORICAL_RECONCILIATION',
      day:row.event_date,
      month:row.event_date?.slice(0,7)
    }));
    window.ATLAS_TEMPORAL_INDEX=current.concat(additions).sort((a,b)=>
      String(a.event_date||'').localeCompare(String(b.event_date||'')) ||
      String(a.event_time||'').localeCompare(String(b.event_time||'')) ||
      String(a.event_id||'').localeCompare(String(b.event_id||''))
    );
    window.registerAtlasEvents?.(additions);
  }

  function installLosses(payload){
    const ledger=window.ATLAS_LEDGER?.['material-losses'];
    if(!ledger?.records) return;
    const existing=new Set(ledger.records.map(row=>row.loss_id));
    for(const row of payload.material_losses) if(!existing.has(row.loss_id)) ledger.records.push(row);
    const search=document.getElementById('lossSearch');
    if(search) search.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function findStrikeLayer(){
    const map=window.atlasMap;
    if(!map) return null;
    const known=new Set(['Kharg Island military targets','Bandar Abbas / port-area July strike reporting']);
    return Object.values(map._layers||{}).find(layer=>{
      if(typeof layer?.eachLayer!=='function') return false;
      let match=false;
      layer.eachLayer(child=>{ if(known.has(child?.options?.title)) match=true; });
      return match;
    })||null;
  }

  function installStrikes(payload){
    const data=window.ATLAS_DATA;
    const map=window.atlasMap;
    if(!data?.strikes || !map || !window.L) return new Map();
    const existing=new Set(data.strikes.map(row=>row.id));
    const rows=payload.strikes.filter(row=>!existing.has(row.id));
    data.strikes.push(...rows);
    const layer=findStrikeLayer();
    const markers=new Map();
    if(!layer) return markers;
    for(const row of rows){
      if(!Number.isFinite(row.lat)||!Number.isFinite(row.lon)) continue;
      const popup=`<div class="atlas-popup"><h3>${esc(row.name)}</h3><div class="popup-badges"><span class="evidence-badge evidence-supported">${esc(row.verification||'SUPPORTED')}</span></div><p><b>Date</b>${esc(row.event_date||'Date unresolved.')}</p><p><b>Actor</b>${esc(row.actor||'Attribution unresolved.')}</p><p><b>Target / effect</b>${esc(row.target_type||row.note||'')}</p>${row.note?`<p><b>Context</b>${esc(row.note)}</p>`:''}<div class="sources">${sourceLinks(row.source_urls)}</div></div>`;
      const icon=L.divIcon({
        className:'atlas-marker-host evidence-marker-supported',
        html:'<div class="pin diamond" style="--marker-color:#364454"><img src="assets/icons/strike.svg" alt=""/></div>',
        iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-15]
      });
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
        if(layer&&!map.hasLayer(layer)) layer.addTo(map);
        if(!map.getBounds().pad(-.15).contains(marker.getLatLng())) map.panTo(marker.getLatLng());
        if(map.getZoom()<6) map.setZoom(6);
        marker.openPopup();
        return true;
      }
      return typeof previous==='function'?previous(id):false;
    };
  }

  async function init(){
    await waitFor(()=>window.ATLAS_CURRENT_UPDATE_20260826 && window.ATLAS_DATA && window.ATLAS_LEDGER && window.registerAtlasEvents && window.registerAtlasSources && window.atlasMap);
    const payload=await decodePayload();
    assertPayload(payload);
    installHistory(payload);
    installLosses(payload);
    const markers=installStrikes(payload);
    installPan(markers);
    window.ATLAS_WIKI_RECON_20260826={
      counts:{...EXPECTED,runtime_chronology:(window.ATLAS_TEMPORAL_INDEX||[]).length},
      coverageAudit:payload.coverage_audit
    };
    window.ISRFullScope20260822?.refreshTimeline?.();
    window.dispatchEvent(new CustomEvent('atlaswikireconready20260826',{detail:window.ATLAS_WIKI_RECON_20260826.counts}));
  }

  const start=()=>init().catch(error=>console.warn('Wikipedia regional reconciliation unavailable; prior Atlas data remains usable.',error));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
}());
