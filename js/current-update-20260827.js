'use strict';
(function ISRCurrentUpdate20260827(){
  if(window.__ISR_CURRENT_UPDATE_20260827__)return;
  window.__ISR_CURRENT_UPDATE_20260827__=true;

  const PATH='./data/current-update-20260827/';
  const CUTOFF='2026-08-27T08:25:00-04:00';
  const CUTOFF_DISPLAY='Aug. 27, 08:25 ET';
  const EXPECTED_PRIOR=202;
  const EXPECTED_OVERLAY=3;
  const EXPECTED_CURRENT=205;

  const fetchJson=async file=>{const r=await fetch(PATH+file,{cache:'no-store'});if(!r.ok)throw Error(`${file}: ${r.status}`);return r.json();};
  const waitFor=(predicate,timeout=18000)=>new Promise((resolve,reject)=>{const started=Date.now();(function poll(){const value=predicate();if(value)return resolve(value);if(Date.now()-started>timeout)return reject(Error('Aug27 overlay dependency timeout'));setTimeout(poll,50);}());});
  const chronologyCount=()=>{const ids=new Set();for(const row of window.ATLAS_TEMPORAL_INDEX||[]){if(!row?.event_id||row.temporal_record_type==='ANNOTATION')continue;ids.add(row.event_id);}return ids.size;};

  function assertPayload(manifest,events,timeline,sources){
    const prior=chronologyCount();
    if(prior!==EXPECTED_PRIOR)throw Error(`Aug27 prior chronology mismatch ${prior} != ${EXPECTED_PRIOR}`);
    if((events.events||[]).length!==EXPECTED_OVERLAY)throw Error('Aug27 event count mismatch');
    if((timeline.records||[]).length!==EXPECTED_OVERLAY)throw Error('Aug27 timeline count mismatch');
    if((sources.sources||[]).length!==3)throw Error('Aug27 source count mismatch');
    if(manifest?.counts?.current_chronology_records!==EXPECTED_CURRENT)throw Error('Aug27 manifest current count mismatch');
    const existing=new Set((window.ATLAS_TEMPORAL_INDEX||[]).map(row=>row.event_id));
    const sourceIds=new Set((sources.sources||[]).map(row=>row.source_id));
    const timelineIds=new Set((timeline.records||[]).map(row=>row.event_id));
    const knownMapRefs=new Set((window.ATLAS_LEDGER?.['map-links']?.links||[]).map(row=>row.map_ref));
    for(const row of events.events||[]){
      if(existing.has(row.event_id))throw Error(`Aug27 overlay duplicates ${row.event_id}`);
      if(!timelineIds.has(row.event_id))throw Error(`Aug27 event lacks timeline record ${row.event_id}`);
      for(const ref of row.source_refs||[]){const id=typeof ref==='string'?ref:ref.source_id;if(!sourceIds.has(id))throw Error(`Unresolved Aug27 source ${id}`);}
      for(const ref of row.map_refs||[])if(!knownMapRefs.has(ref))throw Error(`Unresolved Aug27 map ref ${ref}`);
    }
  }

  function installTemporal(events,timeline){
    const current=window.ATLAS_TEMPORAL_INDEX||[];
    const existing=new Set(current.map(row=>row.event_id));
    const additions=(events||[]).filter(row=>!existing.has(row.event_id)).map(row=>({...row,temporal_record_type:'CURRENT_OVERLAY',day:row.event_date,month:row.event_date?.slice(0,7)}));
    window.ATLAS_TEMPORAL_INDEX=current.concat(additions).sort((a,b)=>String(a.event_date||'').localeCompare(String(b.event_date||''))||String(a.event_time||'').localeCompare(String(b.event_time||''))||String(a.event_id||'').localeCompare(String(b.event_id||'')));
    window.registerAtlasEvents?.(additions);
    window.registerAtlasTimelineRecords?.(timeline||[]);
  }

  function installFreshnessOverride(){
    const P=window.AtlasPresentation;if(!P||P.__aug27Freshness)return;
    const priorFreshness=P.freshness?.bind(P);
    P.freshness=function freshnessAug27(context){
      const ctx=context||window||{};
      const current=ctx.ATLAS_CURRENT_UPDATE_20260827||window.ATLAS_CURRENT_UPDATE_20260827;
      if(!current)return priorFreshness?priorFreshness(context):{};
      return {
        historicalBaseCount:98,
        historicalReconciliationCount:81,
        chronologyCount:EXPECTED_CURRENT,
        currentOsintCutoff:CUTOFF,
        currentOsintDisplay:CUTOFF_DISPLAY,
        summary:`${EXPECTED_CURRENT} chronology records loaded · current OSINT reviewed through ${CUTOFF_DISPLAY}`
      };
    };
    P.applyFreshnessDisplay=function applyFreshnessAug27(doc,context){
      if(!doc)return P.freshness(context);
      const resolved=P.freshness(context||doc.defaultView||window);
      doc.querySelectorAll('[data-current-chronology-count]').forEach(node=>{node.textContent=String(resolved.chronologyCount);});
      doc.querySelectorAll('[data-historical-base-count]').forEach(node=>{node.textContent=String(resolved.historicalBaseCount);});
      doc.querySelectorAll('.kpi.info').forEach(kpi=>{if(!/chronology records/i.test(kpi.textContent||''))return;const b=kpi.querySelector('b'),span=kpi.querySelector('span');if(b)b.textContent=String(resolved.chronologyCount);if(span)span.textContent='chronology records loaded';});
      const badge=doc.querySelector('.isr-current-overlay-badge');if(badge)badge.textContent=resolved.summary;
      const stamp=doc.querySelector('.review-stamp');if(stamp)stamp.textContent=`Current OSINT reviewed through ${resolved.currentOsintDisplay}`;
      const strip=doc.querySelector('#timeline .isr-current-strip span');if(strip)strip.textContent=resolved.summary;
      return resolved;
    };
    P.__aug27Freshness=true;
  }

  function updateLabels(){
    document.querySelectorAll('[data-current-chronology-count]').forEach(node=>{node.textContent=String(EXPECTED_CURRENT);});
    document.querySelectorAll('.kpi.info').forEach(kpi=>{if(!/current chronology records|chronology records loaded/i.test(kpi.textContent||''))return;const b=kpi.querySelector('b'),span=kpi.querySelector('span');if(b)b.textContent=String(EXPECTED_CURRENT);if(span)span.textContent='chronology records loaded · 98 locked + 81 reconciliation + 23 Aug. 24-26 overlays + 3 Aug. 27 overlay records';});
    const badge=document.querySelector('.isr-current-overlay-badge');if(badge)badge.textContent=`Current chronology · ${EXPECTED_CURRENT} records through Aug. 27 08:25 ET`;
    const stamp=document.querySelector('.review-stamp');if(stamp)stamp.textContent='Current OSINT reviewed through Aug. 27, 08:25 ET';
    const strip=document.querySelector('#timeline .latest-strip');
    if(strip)strip.innerHTML='<b>CURRENT OSINT CUTOFF — Aug. 27, 08:25 ET:</b> Qatar moved the Hormuz/U.S.-Iran mediation track into an in-person Tehran meeting; no final breakthrough is yet established. Kpler visible Hormuz traffic rose modestly to 10 commodity transits on Aug. 26 but remained below its recent average. Iranian domestic messaging simultaneously framed U.S. pressure as an “all-out economic war.”';
  }

  function moveDefaultCutoff(){
    try{
      const params=new URLSearchParams(location.search);
      const state=window.AtlasState?.get?.();
      if(!params.has('cutoff')&&state&&String(state.timeCutoff||'')<'2026-08-27'){
        window.AtlasState.set({timeCutoff:'2026-08-27'},{source:'aug27-current-cutoff',replace:true});
      }
    }catch(_){}
  }

  function addCurrentPicture(){
    const panel=document.querySelector('#snapshot');if(!panel||panel.querySelector('[data-aug27-current-picture]'))return;
    const box=document.createElement('div');box.className='callout';box.dataset.aug27CurrentPicture='1';
    box.innerHTML='<strong>Aug. 27 current read:</strong> Qatar is now mediating in Tehran around a regional freedom-of-navigation/comprehensive-agreement frame. Iran has not publicly accepted a final Hormuz settlement; the IRGC finality/revenue claim remains stronger than the diplomatic record. Visible traffic is edging upward while Tehran hardens domestic economic-war language.';
    const grid=panel.querySelector('.current-picture-grid');if(grid?.nextSibling)panel.insertBefore(box,grid.nextSibling);else panel.prepend(box);
  }

  function loadMessagingShiftSeries(){
    if(!document.querySelector('link[data-iran-messaging-shifts-20260827]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href='./css/iran-messaging-shifts-20260827-r1.css?v=20260827-r1';css.dataset.iranMessagingShifts20260827='1';document.head.append(css);
    }
    if(!document.querySelector('script[data-iran-messaging-shifts-20260827]')){
      const js=document.createElement('script');js.src='./js/iran-messaging-shifts-20260827-r1.js?v=20260827-r1';js.async=false;js.dataset.iranMessagingShifts20260827='1';document.head.append(js);
    }
  }

  async function init(){
    await waitFor(()=>window.ATLAS_WIKI_RECON_20260826&&chronologyCount()===EXPECTED_PRIOR&&window.registerAtlasEvents&&window.registerAtlasSources&&window.registerAtlasTimelineRecords);
    const [manifest,events,timeline,sources]=await Promise.all([fetchJson('manifest.json'),fetchJson('events.json'),fetchJson('timeline.json'),fetchJson('sources.json')]);
    assertPayload(manifest,events,timeline,sources);
    window.ATLAS_CURRENT_UPDATE_20260827={cutoff:CUTOFF,manifest,events:events.events,timeline:timeline.records,sources:sources.sources};
    window.registerAtlasSources(sources.sources);
    installTemporal(events.events,timeline.records);
    const current=chronologyCount();if(current!==EXPECTED_CURRENT)throw Error(`Aug27 runtime chronology mismatch ${current} != ${EXPECTED_CURRENT}`);
    window.setAtlasCurrentOsintCutoff?.('2026-08-27 08:25 ET');
    installFreshnessOverride();
    moveDefaultCutoff();
    updateLabels();
    addCurrentPicture();
    loadMessagingShiftSeries();
    window.renderAtlasTimeline?.(document.getElementById('timelineSearch')?.value||'');
    window.refreshAtlasTimelineMap?.();
    window.ISRFullScope20260822?.refreshTimeline?.();
    window.ISRPublicRecordUIR2?.refresh?.();
    window.dispatchEvent(new CustomEvent('atlascurrentready20260827',{detail:{count:EXPECTED_CURRENT,cutoff:CUTOFF}}));
  }

  const start=()=>init().catch(error=>{window.ATLAS_CURRENT_UPDATE_ERROR_20260827={message:String(error?.message||error),stack:String(error?.stack||'')};console.warn('Aug. 27 current overlay unavailable; Aug. 26 reconciled chronology remains usable.',error);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}());
