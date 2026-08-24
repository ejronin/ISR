'use strict';
(function ISRFullScope20260822(){
  if(window.__ISR_FULL_SCOPE_20260822__) return;
  window.__ISR_FULL_SCOPE_20260822__=true;
  const Core=window.ISRFullScopeCore;
  if(!Core){console.warn('ISR full-scope core missing');return;}
  const REVIEWED='2026-08-20';
  const REVIEWED_DISPLAY='2026-08-20 15:59 ET';
  const ACTORS=['U.S.','Iran','Israel','UAE','Oman','Saudi Arabia','Qatar','Bahrain','Kuwait','Jordan','Lebanon','Yemen','Iraq','Türkiye','Pakistan','China'];
  const DASHBOARD_VIEWS=new Set(['snapshot','csis','losses','economy','claims','infowar','sources','intro','historical','history']);
  const MAP_PRIMARY_VIEWS=new Set(['facilities','strikes','arctic']);
  const el=(tag,cls,text)=>{const n=document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=text; return n;};
  const add=(p,tag,cls,text)=>{const n=el(tag,cls,text);p.appendChild(n);return n;};
  const fetchJson=async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(`${path}: ${r.status}`);return r.json();};
  const safeUrl=value=>{try{const u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?u.href:null}catch(_){return null}};
  const label=value=>String(value||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  let outcomes=null, registry=null, hormuz=null, outcomeEvidence=null, authorityIndex=[];
  let app=null, side=null, mapwrap=null, mapHomeParent=null, timelineState={scrollTop:0,selected:null};
  let evidenceDrawer=null, authorityPalette=null, mobileMapSheet=null, mobileMapLaunch=null, hormuzOverlay=null;
  let mobileMapContext={view:'timeline',scrollTop:0};

  function waitFor(predicate, timeout=12000){return new Promise((resolve,reject)=>{const start=Date.now();(function tick(){const v=predicate();if(v)return resolve(v);if(Date.now()-start>timeout)return reject(new Error('full-scope dependency timeout'));setTimeout(tick,50)}())})}
  function setReviewLabels(){
    const stamp=document.querySelector('.review-stamp'); if(stamp) stamp.textContent=`Evidence reviewed through ${REVIEWED_DISPLAY}`;
    const kicker=document.querySelector('.kicker'); if(kicker&&!/FULL SCOPE/.test(kicker.textContent)) kicker.textContent=`${kicker.textContent} · FULL SCOPE 2026-08-22`;
  }
  function restoreMapHome(){if(!mapwrap||!mapHomeParent)return; if(mapwrap.parentElement!==mapHomeParent)mapHomeParent.appendChild(mapwrap);}
  function invalidateMap(){setTimeout(()=>window.atlasMap?.invalidateSize?.(),50)}
  function applyLayout(view){
    if(!app||!mapwrap)return;
    app.classList.remove('isr-dashboard-layout','isr-map-primary-layout','isr-imagery-layout','isr-timeline-layout','isr-atlas-map-only');
    if(view==='timeline'){
      app.classList.add('isr-timeline-layout'); const slot=document.querySelector('.isr-timeline-map-slot'); if(slot&&innerWidth>850&&mapwrap.parentElement!==slot)slot.appendChild(mapwrap);
    }else{
      restoreMapHome();
      if(view==='facilities')app.classList.add('isr-atlas-map-only');
      else if(MAP_PRIMARY_VIEWS.has(view))app.classList.add('isr-map-primary-layout');
      else if(view==='imagery')app.classList.add('isr-imagery-layout');
      else app.classList.add('isr-dashboard-layout');
    }
    if(mobileMapLaunch) mobileMapLaunch.classList.toggle('visible',innerWidth<=850&&(MAP_PRIMARY_VIEWS.has(view)||view==='imagery'));
    invalidateMap();
  }

  function buildEvidenceDrawer(){
    evidenceDrawer=add(document.body,'aside','isr-evidence-drawer'); evidenceDrawer.hidden=true; evidenceDrawer.setAttribute('aria-label','Full scope evidence detail');
    const h=add(evidenceDrawer,'header'); const copy=add(h,'div'); add(copy,'div','eyebrow','EVIDENCE DETAIL'); add(copy,'h2','isr-evidence-title','Record');
    const close=add(h,'button','', 'Close'); close.type='button'; close.onclick=()=>evidenceDrawer.hidden=true;
    add(evidenceDrawer,'div','isr-evidence-body');
  }
  function openEvidence(title,record){
    if(!evidenceDrawer)return; evidenceDrawer.querySelector('.isr-evidence-title').textContent=title||'Evidence'; const body=evidenceDrawer.querySelector('.isr-evidence-body'); body.replaceChildren();
    const dl=add(body,'dl'); Object.entries(record||{}).filter(([k,v])=>v!=null&&v!==''&&!['url','sources'].includes(k)).slice(0,22).forEach(([k,v])=>{add(dl,'dt','',label(k));add(dl,'dd','',Core.textOf(v));});
    const sourceIndex=sourceMap();const links=[];const seen=new Set();
    const pushLink=s=>{if(!s)return;const u=safeUrl(s.url);if(!u||seen.has(u))return;seen.add(u);links.push({url:u,outlet:s.outlet||'Source',title:s.title||s.label||s.outlet||'Open source',note:s.note||s.proof_note||''});};
    const directRefs=[...(record?.sources||[]),...(record?.source_ids||[]),...(record?.source_refs||[])];directRefs.forEach(ref=>{const id=typeof ref==='string'?ref:ref?.source_id;if(id)pushLink(sourceIndex.get(id));});
    (outcomeEvidence?.[record?.id]||[]).forEach(pushLink);const directUrl=safeUrl(record?.url||record?.original_source_url);if(directUrl&&!seen.has(directUrl)&&new URL(directUrl).origin!==location.origin)pushLink({url:directUrl,outlet:'Publisher',title:record?.title||title});
    if(links.length){add(body,'div','section-title','News and source links');const list=add(body,'div','isr-evidence-source-list');links.forEach(s=>{const a=add(list,'a','isr-evidence-source');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';add(a,'b','',`${s.outlet}: ${s.title}`);if(s.note)add(a,'span','',s.note);});}else add(body,'div','isr-evidence-source-note','No public news/source URL is attached to this display record yet. Internal record IDs are intentionally not shown as evidence links.');
    /* public evidence links are rendered above from source records; no self-referential publisher fallback */
    evidenceDrawer.hidden=false;
  }

  function renderOutcomes(){
    const panel=document.getElementById('snapshot'); if(!panel||!outcomes||panel.querySelector('.isr-outcome-dashboard'))return;
    const dash=el('section','isr-outcome-dashboard'); const head=add(dash,'div','isr-outcome-head'); const hc=add(head,'div'); add(hc,'div','eyebrow','SYNTHESIS · DERIVED FROM ACCEPTED RECORDS'); add(hc,'h2','','What Iran actually lost'); add(hc,'p','',`Five analytical levels. Current assessment cutoff ${REVIEWED_DISPLAY}. No composite war score.`);
    const grid=add(dash,'div','isr-outcome-grid');
    outcomes.outcomes.forEach(o=>{
      const card=add(grid,'article','isr-outcome-card'); add(card,'div','isr-outcome-level',o.label); add(card,'h3','',o.headline);const cc=add(card,'div','isr-outcome-section isr-outcome-conclusion');add(cc,'b','','CURRENT CONCLUSION');add(cc,'span','',o.strongest_supported_conclusion);
      [['LOST',o.what_iran_lost],['RETAINED',o.what_iran_retained],['DOES NOT PROVE',o.what_this_does_not_prove]].forEach(([k,v])=>{const s=add(card,'div','isr-outcome-section');add(s,'b','',k);add(s,'span','',v)});
      const meta=add(card,'div','isr-outcome-meta'); ['trend', 'analytic_likelihood','confidence'].forEach(k=>add(meta,'span','pill',label(o[k])));
      const actions=add(card,'div','isr-outcome-actions'); const ev=add(actions,'button','','Open evidence');ev.type='button';ev.onclick=()=>openEvidence(`${o.label} outcome`,o);
      // Map only when existing canonical record references can resolve to safe map-linked records.
      const refs=resolveOutcomeMapRefs(o); if(refs.length){const mb=add(actions,'button','','Show on map');mb.type='button';mb.onclick=()=>{window.AtlasState?.set?.({activeView:'facilities',activePrimaryGroup:'operations',activeFilters:[`outcome:${o.id}`],selectedRecord:null},{source:'outcome-map'});window.showAtlasPanel?.('facilities',{writeState:false});setTimeout(()=>window.pan?.(refs[0]),80)};}
    });
    panel.insertBefore(dash,panel.firstChild);
  }
  function resolveOutcomeMapRefs(o){
    const events=window.ATLAS_LEDGER?.events?.events||[]; const refs=[]; (o.supporting_record_refs||[]).forEach(id=>{const e=events.find(x=>x.event_id===id);if(e)refs.push(...(e.map_refs||[]),...(e.facility_refs||[]));}); return [...new Set(refs)].filter(Boolean);
  }

  function sourceMap(){const m=new Map();(window.ATLAS_LEDGER?.sources?.sources||[]).forEach(s=>m.set(s.source_id,s));(window.ATLAS_FORENSIC?.sources?.sources||[]).forEach(s=>m.set(s.source_id,s));(window.ATLAS_CURRENT_UPDATE?.sources||[]).forEach(s=>m.set(s.source_id,s));return m}
  function normalizedTimelineRecords(){
    const records=(window.ATLAS_TEMPORAL_INDEX||[]).map(r=>({...r}));
    records.forEach(r=>{const d=String(r.event_date||r.claim_date||r.death_date||r.first_reported||'').slice(0,10);r.day=d;r.month=d.slice(0,7);if(d){const dt=new Date(`${d}T12:00:00Z`); const target=new Date(dt);target.setUTCDate(dt.getUTCDate()+4-(dt.getUTCDay()||7));const y0=new Date(Date.UTC(target.getUTCFullYear(),0,1));r.iso_week=`${target.getUTCFullYear()}-W${String(Math.ceil((((target-y0)/86400000)+1)/7)).padStart(2,'0')}`;} });
    return records;
  }
  function recordActors(r){return [...(r.actors||[]),r.country,r.owner,r.claimant].filter(Boolean).join(' ')}
  function actorMatches(r,actors){if(!actors.length)return true;const h=recordActors(r).toLowerCase();return actors.some(a=>h.includes(a.toLowerCase())||(a==='U.S.'&&/united states|\bu\.s\./i.test(h))||(a==='UAE'&&/united arab emirates/i.test(h)))}
  function visibleTimeline(records,state,query,actors){
    const sm=sourceMap(); let rows=records.filter(r=>{
      if(state.temporalMode==='known-by')return window.AtlasTemporal.knownByState(r,state.timeCutoff,sm).visible;
      return window.AtlasTemporal.asOfVisible(r,state.timeCutoff);
    });
    rows=window.AtlasTemporal.filterByGranularity(rows,state.temporalGranularity,state.timeCutoff);
    if(state.timelineContext&&state.timelineContext!=='all')rows=rows.filter(r=>window.AtlasTemporal.contextMatches(r,state.timelineContext));
    if(actors.length)rows=rows.filter(r=>actorMatches(r,actors));
    if(query){const qs=query.toLowerCase().split(/\s+/).filter(Boolean);rows=rows.filter(r=>{const h=Core.textOf(r).toLowerCase();return qs.every(q=>h.includes(q))});}
    return rows.sort((a,b)=>String(a.event_date||'').localeCompare(String(b.event_date||''))||String(a.event_id||'').localeCompare(String(b.event_id||'')));
  }
  function timelineKind(r){const t=String(r.event_type||'').toUpperCase();if(/CLAIM/.test(t))return'claim';if(/LOSS|CASUALT|DAMAGE|ATTRITION/.test(t))return'loss';if(/POSTURE|AGREEMENT|DIPLOM|WITHDRAW/.test(t)||r.record_class==='PRE-WAR CONTEXT')return'posture';return''}
  function renderTimeline(){
    const panel=document.getElementById('timeline'); if(!panel)return; if(!panel.classList.contains('isr-timeline-built')){panel.replaceChildren();panel.classList.add('isr-timeline-built');}
    let shell=panel.querySelector('.isr-timeline-shell'); if(!shell){shell=add(panel,'div','isr-timeline-shell');buildTimelineStructure(shell);}
    refreshTimeline();
  }
  function buildTimelineStructure(shell){
    const strip=add(shell,'div','isr-current-strip');add(strip,'span','',`Canonical chronology through ${REVIEWED_DISPLAY}`);add(strip,'b','','AS OF preserves event chronology · KNOWN BY preserves evidence chronology');
    const mapSlot=add(shell,'div','isr-timeline-map-slot'); if(innerWidth>850&&mapwrap)mapSlot.appendChild(mapwrap);
    const controls=add(shell,'div','isr-timeline-controls'); controls.id='isrTimelineControls';
    const mode=add(controls,'div','isr-segment'); ['as-of','known-by'].forEach(k=>{const b=add(mode,'button','',k==='as-of'?'AS OF':'KNOWN BY');b.type='button';b.dataset.mode=k;b.onclick=()=>window.AtlasState.set({temporalMode:k},{source:'timeline-mode'})});
    const zoom=add(controls,'div','isr-segment'); ['war','month','week','day','hour'].forEach(k=>{const b=add(zoom,'button','',k.toUpperCase());b.type='button';b.dataset.zoom=k;b.onclick=()=>{if(k==='hour'&&!window.AtlasTemporal.supportsHour(normalizedTimelineRecords()))return;window.AtlasState.set({temporalGranularity:k},{source:'timeline-zoom'})}});
    const context=add(controls,'div','isr-segment'); [['all','ALL'],['loss','LOSSES'],['strike','STRIKES'],['facility','FACILITIES'],['posture','POSTURE']].forEach(([k,l])=>{const b=add(context,'button','',l);b.type='button';b.dataset.context=k;b.onclick=()=>window.AtlasState.set({timelineContext:k},{source:'timeline-context'})});
    const search=add(controls,'input','isr-timeline-search');search.type='search';search.placeholder='Search chronology…';search.id='isrTimelineSearch';search.addEventListener('input',refreshTimeline);
    const actorStrip=add(shell,'div','isr-actor-strip');actorStrip.id='isrActorStrip'; const all=add(actorStrip,'button','isr-chip active','All');all.type='button';all.dataset.actor='__ALL__';all.onclick=()=>setTimelineActors([]);
    ACTORS.forEach(a=>{const b=add(actorStrip,'button','isr-chip',a);b.type='button';b.dataset.actor=a;b.onclick=()=>toggleTimelineActor(a)}); const more=add(actorStrip,'button','isr-chip more','More');more.type='button';more.title='Show additional actors present in the chronology.';const moreMenu=add(shell,'div','isr-actor-more-menu');moreMenu.id='isrActorMoreMenu';moreMenu.hidden=true;more.onclick=()=>{moreMenu.hidden=!moreMenu.hidden;populateMoreActors();};
    add(shell,'div','isr-ruler-wrap').appendChild(el('div','isr-ruler'));
    const rail=add(shell,'div','isr-event-rail');rail.id='isrEventRail';
  }

  function populateMoreActors(){const menu=document.getElementById('isrActorMoreMenu');if(!menu)return;menu.replaceChildren();const known=new Set(ACTORS.map(x=>x.toLowerCase()));const found=new Set();normalizedTimelineRecords().forEach(r=>(r.actors||[]).forEach(a=>{const v=String(a||'').trim();if(v&&!known.has(v.toLowerCase()))found.add(v)}));if(!found.size){add(menu,'span','method-note','No additional named actors in the current chronology.');return;}[...found].sort().forEach(a=>{const b=add(menu,'button','isr-chip',a);b.type='button';b.dataset.actor=a;b.classList.toggle('active',timelineActorsFromState().includes(a));b.onclick=()=>toggleTimelineActor(a);});}
  function timelineActorsFromState(){return (window.AtlasState?.get?.().activeFilters||[]).filter(x=>x.startsWith('actor:')).map(x=>x.slice(6))}
  function setTimelineActors(actors){const state=window.AtlasState.get();const other=(state.activeFilters||[]).filter(x=>!x.startsWith('actor:'));window.AtlasState.set({activeFilters:[...other,...actors.map(a=>`actor:${a}`)]},{source:'timeline-actor'})}
  function toggleTimelineActor(actor){const a=timelineActorsFromState();setTimelineActors(a.includes(actor)?a.filter(x=>x!==actor):[...a,actor])}
  function refreshTimeline(){
    const shell=document.querySelector('.isr-timeline-shell');if(!shell)return;const state=window.AtlasState?.get?.()||{};const query=document.getElementById('isrTimelineSearch')?.value||'';const actors=timelineActorsFromState();const rows=visibleTimeline(normalizedTimelineRecords(),state,query,actors);
    document.querySelectorAll('#isrTimelineControls [data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.temporalMode));document.querySelectorAll('#isrTimelineControls [data-zoom]').forEach(b=>{b.classList.toggle('active',b.dataset.zoom===state.temporalGranularity);if(b.dataset.zoom==='hour')b.disabled=!window.AtlasTemporal.supportsHour(normalizedTimelineRecords())});document.querySelectorAll('#isrTimelineControls [data-context]').forEach(b=>b.classList.toggle('active',b.dataset.context===state.timelineContext));
    document.querySelectorAll('#isrActorStrip [data-actor]').forEach(b=>b.classList.toggle('active',b.dataset.actor==='__ALL__'?!actors.length:actors.includes(b.dataset.actor)));
    renderRuler(rows,state.selectedRecord?.id);renderEventRail(rows,state.selectedRecord?.id);
  }
  function renderRuler(rows,selected){const r=document.querySelector('.isr-ruler');if(!r)return;r.replaceChildren();add(r,'div','isr-ruler-line');const positions=Core.timelinePositions(rows);const daySeen=new Set();positions.forEach(p=>{if(!daySeen.has(p.day)){daySeen.add(p.day);const tick=add(r,'i','isr-ruler-tick');tick.style.left=`${p.position}%`;const lab=add(r,'span','isr-ruler-label',p.day.slice(5));lab.style.left=`${p.position}%`;}
      const dot=add(r,'button',`isr-ruler-dot ${timelineKind(rows[p.index])}${p.id===selected?' selected':''}`);dot.type='button';dot.title=rows[p.index].summary||p.id;dot.style.left=`${p.position}%`;dot.style.top=`${20-(p.lane*8)}px`;dot.onclick=()=>selectTimelineEvent(rows[p.index],true);
    });}
  function renderEventRail(rows,selected){const rail=document.getElementById('isrEventRail');if(!rail)return;const old=rail.scrollLeft;rail.replaceChildren();if(!rows.length){add(rail,'div','isr-empty','No records match the current time, context, actor and search filters.');return;}rows.forEach(r=>{const card=add(rail,'button',`isr-event-card${r.event_id===selected?' selected':''}`);card.type='button';card.dataset.eventId=r.event_id||'';card.dataset.hasMap=String(Core.isMapped(r));add(card,'div','date',`${String(r.event_date||'DATE UNRESOLVED')} · ${label(r.event_type||r.record_class||'EVENT')}`);add(card,'h3','',r.summary||r.target||r.event_id||'Chronology record');if(r.verified_effect)add(card,'p','',r.verified_effect);else if(r.observed_fact)add(card,'p','',r.observed_fact);else if(r.target)add(card,'p','',r.target);add(card,'small','',`${r.evidence_status||r.confidence||''}${Core.isMapped(r)?' · MAP-LINKED':' · NO CANONICAL MAP REF'}`);card.onclick=()=>selectTimelineEvent(r,true);});rail.scrollLeft=old;}
  function selectTimelineEvent(r,userInitiated){
    if(!r)return;timelineState.selected=r.event_id;window.AtlasState?.set?.({selectedRecord:{type:'event',id:r.event_id}},{source:'timeline-selection'});refreshTimeline();const ref=Core.eventMapRef(r);
    if(innerWidth<=850&&ref){openMobileMap(r,ref);return;}if(ref){window.pan?.(ref);invalidateMap();}else if(userInitiated)openEvidence(r.summary||r.event_id,r);
    const card=document.querySelector(`.isr-event-card[data-event-id="${CSS.escape(r.event_id||'')}"]`);card?.scrollIntoView?.({block:'nearest',inline:'center',behavior:'smooth'});
  }

  function buildMobileMapSheet(){mobileMapSheet=add(document.body,'section','isr-mobile-map-sheet');mobileMapSheet.hidden=true;const h=add(mobileMapSheet,'header');add(h,'b','isr-mobile-map-title','Mapped record');const b=add(h,'button','','Return');b.type='button';b.onclick=closeMobileMap;add(mobileMapSheet,'div','isr-mobile-map-body');mobileMapLaunch=add(document.body,'button','isr-mobile-map-launch','Open map');mobileMapLaunch.type='button';mobileMapLaunch.onclick=()=>openMobileMapForView(window.AtlasState?.get?.().activeView||'facilities');}
  function openMobileMap(r,ref){const content=document.querySelector('.content');timelineState.scrollTop=content?.scrollTop||0;mobileMapContext={view:'timeline',scrollTop:timelineState.scrollTop};mobileMapSheet.querySelector('.isr-mobile-map-title').textContent=r.summary||r.event_id;mobileMapSheet.querySelector('header button').textContent='Return to timeline';mobileMapSheet.querySelector('.isr-mobile-map-body').appendChild(mapwrap);mobileMapSheet.hidden=false;document.body.classList.add('isr-overlay-open');invalidateMap();setTimeout(()=>window.pan?.(ref),90)}
  function openMobileMapForView(view){const content=document.querySelector('.content');mobileMapContext={view,scrollTop:content?.scrollTop||0};mobileMapSheet.querySelector('.isr-mobile-map-title').textContent=`${label(view)} · shared canonical map`;mobileMapSheet.querySelector('header button').textContent=`Return to ${label(view)}`;mobileMapSheet.querySelector('.isr-mobile-map-body').appendChild(mapwrap);mobileMapSheet.hidden=false;document.body.classList.add('isr-overlay-open');invalidateMap()}
  function closeMobileMap(){mobileMapSheet.hidden=true;document.body.classList.remove('isr-overlay-open');restoreMapHome();applyLayout(mobileMapContext.view);setTimeout(()=>{const c=document.querySelector('.content');if(c)c.scrollTop=mobileMapContext.scrollTop||0;invalidateMap()},40)}

  function buildAuthoritySearch(){
    authorityPalette=add(document.body,'div','isr-authority-palette');authorityPalette.hidden=true;authorityPalette.setAttribute('role','dialog');authorityPalette.setAttribute('aria-label','Authority-ranked atlas search');const shell=add(authorityPalette,'div','isr-authority-shell');const input=add(shell,'input','isr-authority-input');input.type='search';input.placeholder='Search F-35, F-15E, uranium, Al Udeid, Khamenei, Dena, 335 launchers, Hormuz control, carrier sunk, Iran won…';const results=add(shell,'div','isr-authority-results');
    const run=()=>{results.replaceChildren();Core.rankSearch(authorityIndex,input.value).forEach(row=>{const b=add(results,'button','isr-authority-result');b.type='button';const m=add(b,'div','isr-authority-rank');add(m,'span','',row.classLabel);add(m,'span','',`AUTHORITY ${row.rank}`);add(b,'strong','',row.title);add(b,'p','',row.subtitle||row.id);b.onclick=()=>{authorityPalette.hidden=true;document.body.classList.remove('isr-overlay-open');window.AtlasState?.set?.({activeView:row.view,selectedRecord:{type:row.kind.toLowerCase(),id:row.id},searchQuery:input.value},{source:'authority-search'});window.showAtlasPanel?.(row.view,{writeState:false});if(row.mapRef)setTimeout(()=>window.pan?.(row.mapRef),80);openEvidence(row.title,row.record)}});if(!results.children.length)add(results,'div','isr-empty','No matching adjudicated or source records.');};input.oninput=run;authorityPalette.onclick=e=>{if(e.target===authorityPalette)closeAuthority()};
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();e.stopImmediatePropagation();authorityPalette.hidden=false;document.body.classList.add('isr-overlay-open');input.focus();input.select();run()}else if(e.key==='Escape'&&!authorityPalette.hidden)closeAuthority()},true);
    const head=document.querySelector('.head');if(head&&!head.querySelector('.isr-authority-launch')){const b=add(head,'button','global-search-button isr-authority-launch','Search evidence  Ctrl/⌘ K');b.type='button';b.onclick=()=>{authorityPalette.hidden=false;document.body.classList.add('isr-overlay-open');input.focus();run()};}
  }
  function closeAuthority(){authorityPalette.hidden=true;document.body.classList.remove('isr-overlay-open')}

  function renderClaimChallenge(){const panel=document.getElementById('claims');if(!panel||panel.querySelector('.isr-challenge'))return;const box=el('section','isr-challenge');add(box,'h2','','Challenge a claim');add(box,'p','','Search the adjudicated record. A no-match is NOT YET ADJUDICATED — never automatically FALSE.');const row=add(box,'div','isr-challenge-row');const input=add(row,'input');input.type='search';input.placeholder='Paste or type a claim…';const b=add(row,'button','','Check record');b.type='button';const out=add(box,'div','isr-challenge-result');const run=()=>{out.replaceChildren();const hits=Core.rankSearch(authorityIndex,input.value,5).filter(x=>x.rank>=75);if(!hits.length){const c=add(out,'div','callout');add(c,'b','','NOT YET ADJUDICATED');add(c,'p','','No sufficiently authoritative matching record was found. This is not a false verdict.');return;}hits.forEach(h=>{const c=add(out,'button','isr-authority-result');c.type='button';add(c,'div','isr-authority-rank',h.classLabel);add(c,'strong','',h.title);add(c,'p','',h.subtitle);c.onclick=()=>openEvidence(h.title,h.record)});};b.onclick=run;input.addEventListener('keydown',e=>{if(e.key==='Enter')run()});panel.insertBefore(box,panel.firstChild);renderClaimFreshness(panel);}
  function renderClaimFreshness(panel){const forensic=window.ATLAS_FORENSIC;if(!forensic)return;const existing=panel.querySelector('.isr-claim-freshness-section');if(existing)existing.remove();const sec=el('section','isr-claim-freshness-section');add(sec,'div','section-title','Corrected / superseded claim chains');forensic.chains.chains.forEach(chain=>{const f=Core.claimFreshness(chain,forensic.claims.claims,REVIEWED_DISPLAY);const card=add(sec,'article','item');add(card,'h3','',chain.label);const strip=add(card,'div','isr-claim-freshness');const claimed=add(strip,'div','isr-fresh-step');add(claimed,'b','','CLAIMED');add(claimed,'span','',f.claimed?`${f.claimed.claim_date} · ${f.claimed.exact_translated_claim}`:`${chain.start_date} · claim record`);const corr=add(strip,'div','isr-fresh-step corrected');add(corr,'b','','CORRECTED / SUPERSEDED');add(corr,'span','',f.corrected?`${f.corrected.claim_date} · ${f.corrected.exact_translated_claim}`:'No explicit self-correction located; chain adjudication controls.');const cur=add(strip,'div','isr-fresh-step current');add(cur,'b','','CURRENT');add(cur,'span','',`${f.current.date||''} · ${f.current.label}`);const rev=add(strip,'div','isr-fresh-step');add(rev,'b','','REVIEWED');add(rev,'span','',REVIEWED_DISPLAY);card.onclick=()=>openEvidence(chain.label,{...chain,chronology:(chain.claim_ids||[]).map(id=>forensic.claims.claims.find(c=>c.claim_id===id)).filter(Boolean)});});panel.appendChild(sec);}

  async function renderSources(){const panel=document.getElementById('sources');if(!panel||!registry)return;panel.replaceChildren();const root=add(panel,'section','isr-source-directory');const controls=add(root,'div','isr-source-controls');const q=add(controls,'input');q.type='search';q.placeholder='Search outlet, title, role, source ID…';const fields=[['region','All regions'],['country','All countries'],['outlet_type','All outlet types'],['bias','All Ground News bias'],['factuality','All Ground News factuality'],['role','All evidence roles'],['quality','All evidence grades'],['affiliation','All official/state labels']];const selects={};fields.forEach(([k,l])=>{const s=add(controls,'select');s.dataset.filter=k;selects[k]=s;const o=add(s,'option','',l);o.value='';});
    const profiles=new Map(registry.outlet_profiles.map(p=>[p.outlet_profile_id,p]));const values={region:new Set(),country:new Set(),outlet_type:new Set(),bias:new Set(),factuality:new Set(),role:new Set(),quality:new Set(),affiliation:new Set(['STATE_OR_OFFICIAL','NO_STATE_LABEL'])};registry.outlet_profiles.forEach(p=>{values.region.add(p.region);if(p.country)values.country.add(p.country);values.outlet_type.add(p.outlet_type);if(p.ground_news?.bias_raw)values.bias.add(p.ground_news.bias_raw);if(p.ground_news?.factuality)values.factuality.add(p.ground_news.factuality)});registry.sources.forEach(s=>{(s.source_roles||[]).forEach(r=>values.role.add(r));if(s.quality)values.quality.add(s.quality)});Object.entries(values).forEach(([k,set])=>[...set].sort().forEach(v=>{const o=add(selects[k],'option','',label(v));o.value=v}));
    const summary=add(root,'div','isr-source-summary');const list=add(root,'div','isr-source-list');
    const render=()=>{list.replaceChildren();const filters=Object.fromEntries(Object.entries(selects).map(([k,s])=>[k,s.value]));const needle=q.value.toLowerCase().trim();let rows=registry.sources.filter(s=>{const p=profiles.get(s.outlet_profile_id);if(filters.region&&p.region!==filters.region)return false;if(filters.country&&p.country!==filters.country)return false;if(filters.outlet_type&&p.outlet_type!==filters.outlet_type)return false;if(filters.bias&&p.ground_news?.bias_raw!==filters.bias)return false;if(filters.factuality&&p.ground_news?.factuality!==filters.factuality)return false;if(filters.role&&!(s.source_roles||[]).includes(filters.role))return false;if(filters.quality&&s.quality!==filters.quality)return false;if(filters.affiliation){const a=p.state_affiliation?'STATE_OR_OFFICIAL':'NO_STATE_LABEL';if(a!==filters.affiliation)return false;}if(needle&&!`${s.source_id} ${s.title||''} ${p.display_name} ${(s.source_roles||[]).join(' ')} ${s.quality||''} ${p.state_affiliation||''}`.toLowerCase().includes(needle))return false;return true});summary.textContent=`${rows.length} sources · ${new Set(rows.map(r=>r.outlet_profile_id)).size} outlets · Ground News is publisher context only and does not change evidence grade.`;const grouped=new Map();rows.forEach(s=>{const p=profiles.get(s.outlet_profile_id);const reg=p.region||'GLOBAL_INTERNATIONAL',country=p.country||'Global / international';if(!grouped.has(reg))grouped.set(reg,new Map());const countries=grouped.get(reg);if(!countries.has(country))countries.set(country,new Map());const outlets=countries.get(country);if(!outlets.has(p.outlet_profile_id))outlets.set(p.outlet_profile_id,[]);outlets.get(p.outlet_profile_id).push(s)});[...grouped.entries()].sort().forEach(([reg,countries])=>{const rs=add(list,'section','isr-region');add(rs,'h2','',label(reg));[...countries.entries()].sort().forEach(([country,outlets])=>{const cs=add(rs,'section','isr-country');add(cs,'h3','',country);[...outlets.entries()].sort((a,b)=>profiles.get(a[0]).display_name.localeCompare(profiles.get(b[0]).display_name)).forEach(([pid,srcs])=>renderOutlet(cs,profiles.get(pid),srcs))})})};q.oninput=render;Object.values(selects).forEach(s=>s.onchange=render);render();}
  function renderOutlet(parent,p,srcs){const card=add(parent,'article','isr-outlet-card');const h=add(card,'div','isr-outlet-head');const hc=add(h,'div');add(hc,'strong','',p.display_name);add(hc,'div','method-note',`${p.outlet_type} · ${p.state_affiliation||'No state-affiliation label'} · Atlas evidence grade remains proposition-specific`);const gn=add(h,'div','isr-gn');const g=p.ground_news||{};add(gn,'span','',g.status||'NOT_RATED');if(g.bias_raw)add(gn,'span','',`GN ${g.bias_raw}`);if(g.factuality)add(gn,'span','',`GN ${g.factuality}`);srcs.sort((a,b)=>String(b.publication_date||'').localeCompare(String(a.publication_date||''))).forEach(s=>{const r=add(card,'div','isr-source-row');add(r,'span','',`${s.publication_date||'UNDATED'} · ${s.quality||'—'}`);const copy=add(r,'div');const u=safeUrl(s.url);if(u){const a=add(copy,'a','',s.title||s.source_id);a.href=u;a.target='_blank';a.rel='noopener noreferrer'}else add(copy,'span','',s.title||s.source_id);add(copy,'small','',` ${(s.source_roles||[]).map(label).join(' · ')}`);const meta=add(r,'div','isr-gn');add(meta,'span','',s.source_id)});}

  function buildHormuzOverlay(){
    if(!hormuz||!mapwrap)return;const launch=add(mapwrap,'button','isr-hormuz-launch','Hormuz strategic view');launch.type='button';launch.onclick=openHormuz;
    hormuzOverlay=add(document.body,'section','isr-hormuz-overlay');hormuzOverlay.hidden=true;hormuzOverlay.setAttribute('aria-label','Hormuz strategic leverage analytical view');const top=add(hormuzOverlay,'header','isr-hormuz-topbar');const tc=add(top,'div','isr-hormuz-title');add(tc,'b','','Hormuz strategic leverage');add(tc,'span','',`Separate later domain assessment · cutoff ${hormuz.cutoff} · full-map replacement mode`);const ret=add(top,'button','isr-return-map','← Return to map');ret.type='button';ret.onclick=closeHormuz;const body=add(hormuzOverlay,'div','isr-hormuz-body');add(body,'div','isr-hormuz-disclosure','This Aug. 22 analytical overlay is newer than the canonical Aug. 20 ledger. It is visibly separate and does not silently advance the canonical cutoff. De facto coercive control is not legal sovereignty; domain scores below are not a war score.');
    const m=add(body,'div','isr-hormuz-metrics');const metrics=[['8.5/10','De facto coercive / sea-denial leverage'],['1.5/10','Recognized / institutional control'],['1.5/10','Durable monetizable toll/rent leverage'],['~20 mb/d','2025 oil exports through Hormuz — IEA'],['3.5–5.5 mb/d','Available crude bypass capacity — IEA'],['DOWN','Long-run Iranian monopoly leverage trend']];metrics.forEach(([v,l])=>{const c=add(m,'div','isr-hormuz-metric');add(c,'strong','',v);add(c,'span','',l)});
    const tabs=add(body,'div','isr-hormuz-tabs');const names=[['current','Current board'],['sequence','Sequence'],['mou','MoU tracks'],['branches','Branches'],['sources','Sources']];names.forEach(([id,l],i)=>{const b=add(tabs,'button',i?'':'active',l);b.type='button';b.dataset.hormuzTab=id;b.onclick=()=>switchHormuzTab(id)});names.forEach(([id])=>{const p=add(body,'section',`isr-hormuz-panel${id==='current'?' active':''}`);p.dataset.hormuzPanel=id});renderHormuzPanels();}
  function switchHormuzTab(id){hormuzOverlay.querySelectorAll('[data-hormuz-tab]').forEach(b=>b.classList.toggle('active',b.dataset.hormuzTab===id));hormuzOverlay.querySelectorAll('[data-hormuz-panel]').forEach(p=>p.classList.toggle('active',p.dataset.hormuzPanel===id))}
  function renderHormuzPanels(){
    const current=hormuzOverlay.querySelector('[data-hormuz-panel="current"]');const grid=add(current,'div','isr-hormuz-current-grid');(hormuz.current_board_delta||[]).forEach(e=>{const c=add(grid,'article','isr-hormuz-card');add(c,'div','eyebrow',`${e.date} · ${e.category}`);add(c,'h3','',e.title);add(c,'p','',e.effect);add(c,'small','',`${e.verification} · ${e.precision}`)});
    const sequence=hormuzOverlay.querySelector('[data-hormuz-panel="sequence"]');add(sequence,'p','method-note','Horizontal chronology replaces the standalone HTML’s vertical timeline. Later evidence is not back-propagated into earlier knowledge states.');const seq=add(sequence,'div','isr-hormuz-sequence');(hormuz.sequence||[]).forEach(e=>{const c=add(seq,'article','isr-hormuz-card');add(c,'div','eyebrow',`${e.date} · ${e.track}`);add(c,'h3','',e.title);add(c,'p','',e.result);add(c,'small','',`Coercive ${e.coercive}/10 · converted ${e.converted}/10 · domain-specific analytical aid`) });
    const mou=hormuzOverlay.querySelector('[data-hormuz-panel="mou"]');(hormuz.mou_position_tracks||[]).forEach(t=>{const c=add(mou,'article','isr-hormuz-card');add(c,'div','eyebrow',`CLAUSE ${t.clause} · ${t.confidence} CONFIDENCE`);add(c,'h3','',t.topic);add(c,'p','',t.analysis);if(t.scorable){const tr=add(c,'div','isr-hormuz-track');add(tr,'span','',`MoU ${t.position}/100 toward U.S. pole`);const axis=add(tr,'div','isr-hormuz-axis');const marker=add(axis,'i');marker.style.left=`${t.position}%`;}add(c,'small','',t.current_status||'')});
    const branches=hormuzOverlay.querySelector('[data-hormuz-panel="branches"]');(hormuz.branches||[]).forEach(b=>{const c=add(branches,'article','isr-hormuz-card');add(c,'div','eyebrow',`${b.id} · structural ${b.structural_score}/10 · realized ${b.realized_score}/10`);add(c,'h3','',b.title);add(c,'p','',b.summary);const ul=add(c,'ul');(b.failed||[]).forEach(x=>add(ul,'li','',x))});
    const sources=hormuzOverlay.querySelector('[data-hormuz-panel="sources"]');Object.entries(hormuz.sources||{}).sort((a,b)=>String(b[1].date).localeCompare(String(a[1].date))).forEach(([id,s])=>{const c=add(sources,'article','isr-hormuz-card');add(c,'div','eyebrow',`${s.date||'UNDATED'} · GRADE ${s.grade}`);const u=safeUrl(s.url);if(u){const a=add(c,'a','',s.label);a.href=u;a.target='_blank';a.rel='noopener noreferrer'}else add(c,'h3','',s.label);add(c,'p','',s.role);add(c,'small','',id)});
  }
  function openHormuz(){hormuzOverlay.hidden=false;document.body.classList.add('isr-overlay-open');const state=window.AtlasState?.get?.();if(state){const filters=(state.activeFilters||[]).filter(x=>x!=='overlay:hormuz');window.AtlasState.set({activeFilters:[...filters,'overlay:hormuz']},{source:'hormuz-overlay'})}}
  function closeHormuz(){hormuzOverlay.hidden=true;document.body.classList.remove('isr-overlay-open');const state=window.AtlasState?.get?.();if(state)window.AtlasState.set({activeFilters:(state.activeFilters||[]).filter(x=>x!=='overlay:hormuz')},{source:'hormuz-return'});invalidateMap()}

  function stateSync(state,source){
    applyLayout(state.activeView); if(state.activeView==='timeline')refreshTimeline();
    if(source==='popstate'||source==='history'||source==='restore'){const wants=(state.activeFilters||[]).includes('overlay:hormuz');if(hormuzOverlay){hormuzOverlay.hidden=!wants;document.body.classList.toggle('isr-overlay-open',wants)}}
  }
  function observePanels(){
    const original=window.showAtlasPanel;if(typeof original==='function'&&!original.__isrFullScope){const wrapped=function(id,opts){const result=original(id,opts);setTimeout(()=>{applyLayout(id);if(id==='timeline')renderTimeline();if(id==='claims')renderClaimChallenge();if(id==='sources')renderSources()},0);return result};wrapped.__isrFullScope=true;window.showAtlasPanel=wrapped;}
  }
  async function init(){
    await waitFor(()=>window.ATLAS_LEDGER&&window.ATLAS_FORENSIC&&window.AtlasState&&window.AtlasTemporal&&document.getElementById('map'));
    app=document.getElementById('app');side=document.querySelector('.side');mapwrap=document.getElementById('map').parentElement;mapHomeParent=mapwrap.parentElement;
    [outcomes,registry,hormuz,outcomeEvidence]=await Promise.all([fetchJson('./data/iran-outcome-assessments-v1.0.json'),fetchJson('./data/source-registry.json').catch(()=>null),fetchJson('./data/hormuz-strategic-v3.json'),fetchJson('./data/outcome-evidence-links-20260823.json')]);
    authorityIndex=Core.buildAuthorityIndex({outcomes,forensic:window.ATLAS_FORENSIC,ledger:window.ATLAS_LEDGER,legacy:window.ATLAS_DATA});
    window.ISRFullScope20260822={authorityIndex,refreshTimeline,openHormuz,closeHormuz,applyLayout,rankSearch:(q,l)=>Core.rankSearch(authorityIndex,q,l)};
    setReviewLabels();buildEvidenceDrawer();buildMobileMapSheet();renderOutcomes();renderTimeline();renderClaimChallenge();if(registry)renderSources();buildAuthoritySearch();buildHormuzOverlay();observePanels();
    window.AtlasState.subscribe(stateSync);stateSync(window.AtlasState.get(),'init');
    window.addEventListener('resize',()=>{const view=window.AtlasState.get().activeView;if(view==='timeline'){if(innerWidth>850){const slot=document.querySelector('.isr-timeline-map-slot');if(slot&&mapwrap.parentElement!==slot)slot.appendChild(mapwrap)}else if(!mobileMapSheet.hidden){/* map stays in sheet */}else restoreMapHome();invalidateMap();}applyLayout(view)});
    document.addEventListener('click',e=>{const p=e.target.closest?.('.popup-event-link,[data-event-id]');if(!p)return;const id=p.dataset.eventId;const r=(window.ATLAS_TEMPORAL_INDEX||[]).find(x=>x.event_id===id);if(r&&window.AtlasState.get().activeView==='timeline')selectTimelineEvent(r,false)},true);
    window.atlasMap?.on?.('popupopen',evt=>{if(window.AtlasState.get().activeView!=='timeline')return;const node=evt.popup?.getElement?.();const links=node?[...node.querySelectorAll('[data-event-id]')]:[];if(links.length!==1)return;const r=(window.ATLAS_TEMPORAL_INDEX||[]).find(x=>x.event_id===links[0].dataset.eventId);if(r)selectTimelineEvent(r,false);});
  }
  const start=()=>init().catch(err=>console.warn('ISR full-scope overlay failed; canonical baseline remains usable.',err));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}());
