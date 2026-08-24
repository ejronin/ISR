'use strict';
(function ISRAug22Workspaces(){
  if(window.__ISR_AUG22_WORKSPACES__) return;
  window.__ISR_AUG22_WORKSPACES__=true;
  const CANONICAL='2026-08-22';
  const CANONICAL_DISPLAY='2026-08-22 13:59 ET';
  const OUTCOME_DISPLAY='2026-08-20 15:59 ET';
  const MOU_DISPLAY='2026-08-22 10:54 ET';
  const GN_SCALE=['FAR LEFT','LEFT','LEAN LEFT','CENTER','LEAN RIGHT','RIGHT','FAR RIGHT'];
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const add=(p,tag,cls,text)=>{const n=el(tag,cls,text);p.appendChild(n);return n;};
  const label=v=>String(v??'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const safeUrl=v=>{try{const u=new URL(v,location.href);return /^https?:$/.test(u.protocol)?u.href:null}catch(_){return null}};
  const fetchJson=async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw new Error(`${p}: ${r.status}`);return r.json();};
  const waitFor=(fn,ms=12000)=>new Promise((resolve,reject)=>{const s=Date.now();(function tick(){const v=fn();if(v)return resolve(v);if(Date.now()-s>ms)return reject(new Error('Aug22 workspace dependency timeout'));setTimeout(tick,50);}())});
  const earliestTimelineDate=()=>{
    const dates=(window.ATLAS_TEMPORAL_INDEX||[])
      .map(x=>x.event_date)
      .filter(Boolean)
      .sort();
    return dates[0]||'2026-02-28';
  };
  let full=null, registry=null, mou=null, routes=null, peerNav=null, visualZoom='FIT', lastAnalysisView='snapshot', routeGroup=null, plainObserver=null;

  function setCanonicalLabels(){
    const stamp=document.querySelector('.review-stamp');
    if(stamp) stamp.textContent=`Canonical evidence reviewed through ${CANONICAL_DISPLAY}`;
    const strip=document.querySelector('#timeline .isr-current-strip span');
    if(strip) strip.textContent=`Canonical chronology through ${CANONICAL_DISPLAY}`;
  }

  function peerForState(){
    if(document.querySelector('.isr-hormuz-overlay:not([hidden])'))return'MOU';
    const v=window.AtlasState?.get?.().activeView;
    if(v==='timeline')return'TIMELINE';
    if(v==='sources')return'SOURCES';
    if(v==='facilities')return'ATLAS';
    return'ANALYSIS';
  }
  function setPeerActive(name){
    document.querySelectorAll('[data-peer-workspace]').forEach(b=>{const on=b.dataset.peerWorkspace===name;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});
    const analysisNav=document.querySelector('.analysis-nav');if(analysisNav)analysisNav.hidden=name!=='ANALYSIS';
  }
  function leaveMou(){if(document.querySelector('.isr-hormuz-overlay:not([hidden])'))full?.closeHormuz?.();}
  function activatePeer(name){
    if(name==='MOU'){full?.openHormuz?.();setPeerActive('MOU');setTimeout(rebuildMOU,0);return;}
    leaveMou();
    if(name==='TIMELINE'){
      const s=document.querySelector('.isr-timeline-prefetch');if(s)s.textContent='Opening prefetched chronology…';
      window.showAtlasPanel?.('timeline');setTimeout(()=>{enhanceTimeline();updateTimelineEnhancements();},0);
    }else if(name==='SOURCES'){
      window.showAtlasPanel?.('sources');setTimeout(enhanceSources,0);
    }else if(name==='ANALYSIS'){
      window.showAtlasPanel?.(lastAnalysisView||'snapshot');
    }else{
      window.showAtlasPanel?.('facilities');
      window.AtlasState?.set?.({selectedRecord:null},{source:'atlas-current-map'});
      setTimeout(ensureCurrentMapBadge,0);
    }
    setPeerActive(name);
  }
  function buildPeerNav(){
    if(document.querySelector('.isr-workspace-nav'))return;
    const old=document.querySelector('.analysis-nav');if(!old)return;
    peerNav=el('nav','isr-workspace-nav');peerNav.setAttribute('aria-label','Primary workspace');
    ['ATLAS','TIMELINE','ANALYSIS','MOU','SOURCES'].forEach(name=>{const b=add(peerNav,'button','',name);b.type='button';b.dataset.peerWorkspace=name;b.onclick=()=>activatePeer(name);});
    old.parentElement.insertBefore(peerNav,old);setPeerActive(peerForState());
  }

  function enhanceTimeline(){
    const panel=document.getElementById('timeline'),shell=panel?.querySelector('.isr-timeline-shell');if(!shell)return;
    setCanonicalLabels();
    if(shell.classList.contains('isr-workspace-enhanced')){applyVisualZoom();return;}
    shell.classList.add('isr-workspace-enhanced');
    const strip=shell.querySelector('.isr-current-strip');
    const help=el('details','isr-timeline-help');const sum=add(help,'summary','','How to use');add(help,'p','',`AS OF asks what was physically/operationally true by a date. KNOWN BY asks what public evidence had established by then. WAR / MONTH / WEEK / DAY / HOUR changes analytical filtering. FIT / 1× / 2× / 4× / 8× changes only the visual width of the chronology. Drag or horizontally scroll the ruler at higher visual scales. Canonical evidence currently runs through ${CANONICAL_DISPLAY}.`);strip?.after(help);
    const bar=el('div','isr-timeline-workbar');
    const status=add(bar,'div','isr-timeline-prefetch','Chronology prefetched');status.setAttribute('aria-live','polite');
    const dateNav=add(bar,'div','isr-date-nav');
    const prev=add(dateNav,'button','','← Day');prev.type='button';prev.onclick=()=>shiftDay(-1);
    const input=add(dateNav,'input');input.type='date';input.id='isrWorkspaceDate';input.min=earliestTimelineDate();input.max=CANONICAL;input.onchange=()=>{if(input.value)window.AtlasState?.set?.({timeCutoff:input.value},{source:'timeline-date-input'});};
    const next=add(dateNav,'button','','Day →');next.type='button';next.onclick=()=>shiftDay(1);
    const current=add(dateNav,'button','','Current');current.type='button';current.onclick=()=>window.AtlasState?.set?.({timeCutoff:CANONICAL},{source:'timeline-current'});
    const vz=add(bar,'div','isr-visual-zoom');add(vz,'span','','Visual scale');['FIT','1×','2×','4×','8×'].forEach(x=>{const b=add(vz,'button','',x);b.type='button';b.dataset.visualZoom=x;b.onclick=()=>setVisualZoom(x);});
    const reset=add(bar,'button','isr-timeline-reset','Reset');reset.type='button';reset.onclick=resetTimeline;
    const controls=shell.querySelector('.isr-timeline-controls');controls?.before(bar);
    const summary=el('div','isr-timeline-active-summary');summary.id='isrTimelineActiveSummary';bar.after(summary);
    const selected=el('div','isr-timeline-selected-confirm');selected.id='isrTimelineSelectedConfirm';summary.after(selected);
    const mapSlot=shell.querySelector('.isr-timeline-map-slot');if(mapSlot&&!mapSlot.querySelector('.isr-timeline-map-card')){const mc=add(mapSlot,'div','isr-timeline-map-card');mc.id='isrTimelineMapCard';add(mc,'b','','No event selected');add(mc,'span','','Select a timeline dot or event card to inspect it on the shared map.');}
    const wrap=shell.querySelector('.isr-ruler-wrap');if(wrap)enableDragPan(wrap);
    const search=document.getElementById('isrTimelineSearch');search?.addEventListener('input',()=>setTimeout(updateTimelineEnhancements,0));
    applyVisualZoom();updateTimelineEnhancements();
  }
function shiftDay(n){const state=window.AtlasState?.get?.();if(!state?.timeCutoff)return;const d=new Date(`${state.timeCutoff}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);let v=d.toISOString().slice(0,10);const min=earliestTimelineDate();if(v<min)v=min;if(v>CANONICAL)v=CANONICAL;window.AtlasState.set({timeCutoff:v},{source:'timeline-day-step'});}

  function resetTimeline(){
    const state=window.AtlasState?.get?.()||{};const other=(state.activeFilters||[]).filter(x=>!x.startsWith('actor:'));
    const q=document.getElementById('isrTimelineSearch');if(q)q.value='';visualZoom='FIT';
    window.AtlasState?.set?.({timeCutoff:CANONICAL,temporalMode:'as-of',temporalGranularity:'war',timelineContext:'all',activeFilters:other,selectedRecord:null},{source:'timeline-reset'});applyVisualZoom();
  }
  function setVisualZoom(v){visualZoom=v;applyVisualZoom();document.querySelectorAll('[data-visual-zoom]').forEach(b=>b.classList.toggle('active',b.dataset.visualZoom===v));}
  function applyVisualZoom(){
    const wrap=document.querySelector('#timeline .isr-ruler-wrap'),ruler=wrap?.querySelector('.isr-ruler');if(!wrap||!ruler)return;
    if(visualZoom==='FIT'){ruler.style.width='100%';wrap.scrollLeft=0;}
    else{const scale=parseInt(visualZoom,10)||1;ruler.style.width=`${Math.max(wrap.clientWidth,1200*scale)}px`;}
    document.querySelectorAll('[data-visual-zoom]').forEach(b=>b.classList.toggle('active',b.dataset.visualZoom===visualZoom));decorateRulerSelection();
  }
  function enableDragPan(node){
    let down=false,startX=0,start=0;
    node.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;down=true;startX=e.clientX;start=node.scrollLeft;node.setPointerCapture?.(e.pointerId);node.classList.add('dragging');});
    node.addEventListener('pointermove',e=>{if(!down)return;node.scrollLeft=start-(e.clientX-startX);});
    const stop=e=>{down=false;node.classList.remove('dragging');try{node.releasePointerCapture?.(e.pointerId)}catch(_){}};node.addEventListener('pointerup',stop);node.addEventListener('pointercancel',stop);
  }
  function decorateRulerSelection(){
    const r=document.querySelector('#timeline .isr-ruler');if(!r)return;const labs=[...r.querySelectorAll('.isr-ruler-label')];labs.forEach(x=>x.classList.remove('selected-date','hover-date'));
    const selectLabel=dot=>labs.find(x=>x.style.left===dot?.style.left);
    r.querySelectorAll('.isr-ruler-dot').forEach(dot=>{if(dot.dataset.dateHoverBound==='1')return;dot.dataset.dateHoverBound='1';dot.addEventListener('pointerenter',()=>selectLabel(dot)?.classList.add('hover-date'));dot.addEventListener('pointerleave',()=>selectLabel(dot)?.classList.remove('hover-date'));});
    const dot=r.querySelector('.isr-ruler-dot.selected');selectLabel(dot)?.classList.add('selected-date');
  }
  function updateTimelineEnhancements(){
    const state=window.AtlasState?.get?.();if(!state)return;setCanonicalLabels();
    const input=document.getElementById('isrWorkspaceDate');if(input)input.value=state.timeCutoff||CANONICAL;
    const actors=(state.activeFilters||[]).filter(x=>x.startsWith('actor:')).map(x=>x.slice(6));const q=document.getElementById('isrTimelineSearch')?.value?.trim();
    const summary=document.getElementById('isrTimelineActiveSummary');if(summary)summary.textContent=`${label(state.temporalMode||'as-of')} · ${state.timeCutoff||CANONICAL} · ${label(state.timelineContext||'all')} · ${actors.length?actors.join(', '):'all actors'}${q?` · search: ${q}`:''}`;
    const count=(window.ATLAS_TEMPORAL_INDEX||[]).length;const status=document.querySelector('.isr-timeline-prefetch');if(status)status.textContent=`Canonical chronology prefetched · ${count} indexed records`;
    const sel=document.getElementById('isrTimelineSelectedConfirm'),id=state.selectedRecord?.type==='event'?state.selectedRecord.id:null;const rec=id?(window.ATLAS_TEMPORAL_INDEX||[]).find(x=>x.event_id===id):null;
    if(sel){if(!rec)sel.textContent='No chronology record selected.';else{const mapped=Boolean((rec.map_refs||[]).length||(rec.facility_refs||[]).length);sel.textContent=`Selected ${rec.event_date||'date unresolved'} · ${rec.summary||id} · ${mapped?'confirmed on shared canonical map':'no canonical map reference'}`;}}
    const mapCard=document.getElementById('isrTimelineMapCard');if(mapCard){const b=mapCard.querySelector('b'),s=mapCard.querySelector('span');if(!rec){if(b)b.textContent='No event selected';if(s)s.textContent='Select a timeline dot or event card to inspect it on the shared map.';}else{if(b)b.textContent=rec.event_date||'Date unresolved';if(s)s.textContent=rec.summary||id;}}
    applyVisualZoom();
  }

  function enhanceSources(){
    const panel=document.getElementById('sources');if(!panel||!registry)return;
    const profiles=new Map((registry.outlet_profiles||[]).map(p=>[p.display_name,p]));
    panel.querySelectorAll('.isr-outlet-card').forEach(card=>{
      const head=card.querySelector('.isr-outlet-head'),name=head?.querySelector('strong')?.textContent?.trim(),p=profiles.get(name);if(!head||!p)return;
      const box=[...head.children].find(x=>x.classList.contains('isr-gn'));if(!box||box.dataset.gaugeBuilt==='1')return;box.dataset.gaugeBuilt='1';box.replaceChildren();box.classList.add('isr-ground-gauge');
      const g=p.ground_news||{},rated=g.status==='RATED'&&g.bias_raw;
      add(box,'b','isr-ground-title',rated?`Ground News bias: ${label(g.bias_raw)}`:'NOT measured by Ground News');
      const gauge=add(box,'div','isr-ground-scale');gauge.setAttribute('aria-label',rated?`Ground News publisher bias: ${label(g.bias_raw)}`:'Ground News has no audited publisher rating in this Atlas profile');
      GN_SCALE.forEach(x=>{const s=add(gauge,'span',rated&&String(g.bias_raw).toUpperCase()===x?'selected':'',x);s.title=x;});
      add(box,'div','isr-ground-factuality',rated?`Factuality: ${g.factuality||'not shown'}`:'Bias/factuality unavailable in the audited Ground News metadata.');
      const a=add(box,'a','isr-ground-link',rated?'View Ground News rating ↗':'Ground News rating methodology ↗');a.href=safeUrl(rated?g.profile_url:'https://ground.news/rating-system')||'#';a.target='_blank';a.rel='noopener noreferrer';
      add(box,'small','',rated?'Publisher-level context; not an article rating and not proof of neutrality. It never changes the Atlas evidence grade.':'NOT measured by Ground News means no audited Ground News publisher profile was attached here; the Atlas does not infer one.');
    });
    const summary=panel.querySelector('.isr-source-summary');if(summary&&!summary.querySelector('.isr-ground-scope'))add(summary,'div','isr-ground-scope','Ground News ratings are publisher-level context only: they are not article ratings, not proof of neutrality, and never modify evidence grade.');
  }
  function bindSourceRefresh(){const p=document.getElementById('sources');if(!p||p.dataset.gnRefreshBound)return;p.dataset.gnRefreshBound='1';['input','change'].forEach(evt=>p.addEventListener(evt,()=>setTimeout(enhanceSources,0),true));}

  function clearAndTitle(panel,title,lead){panel.replaceChildren();const h=add(panel,'div','isr-mou-section-head');add(h,'h2','',title);if(lead)add(h,'p','',lead);return panel;}
  function bulletList(parent,title,items){if(!items?.length)return;const box=add(parent,'section','isr-mou-list');add(box,'h3','',title);const ul=add(box,'ul');items.forEach(x=>add(ul,'li','',x));}
  function sourceLinks(parent,ids){if(!ids?.length)return;const box=add(parent,'div','isr-mou-sourcechips');ids.forEach(id=>{const s=mou.sources?.[id];if(!s){add(box,'span','srcchip',id);return;}const u=safeUrl(s.url);if(u){const a=add(box,'a','srcchip',id);a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.title=s.label||id;}else add(box,'span','srcchip',id);});}
  function rebuildMOU(){
    const overlay=document.querySelector('.isr-hormuz-overlay');if(!overlay||!mou)return;
    const title=overlay.querySelector('.isr-hormuz-title');if(title){title.replaceChildren();add(title,'b','','MOU / Hormuz strategic leverage');add(title,'span','',`Analytical review cutoff ${MOU_DISPLAY} · underlying canonical facts promoted through ${CANONICAL_DISPLAY}`);}
    let body=overlay.querySelector('.isr-hormuz-body');if(!body)return;body.replaceChildren();body.classList.add('isr-mou-workspace');
    add(body,'div','isr-hormuz-disclosure',`This MOU/Hormuz analysis remains reviewed through ${MOU_DISPLAY}. Its underlying factual chronology is now canonical through ${CANONICAL_DISPLAY}. That does not silently re-review the analytical prose. De facto passage leverage is not legal sovereignty, and the domain-specific 0–10 aids are not a composite war score.`);
    const metrics=add(body,'div','isr-hormuz-metrics');[
      [mou.summary_metrics?.iran_coercive_hormuz_leverage_0_10,'Iran de facto coercive Hormuz leverage /10'],[mou.summary_metrics?.iran_institutionalized_control_0_10,'Institutionalized control /10'],[mou.summary_metrics?.iran_monetizable_hormuz_leverage_0_10,'Monetizable leverage /10'],[mou.summary_metrics?.hormuz_global_systemic_importance_0_10,'Global systemic importance /10'],[mou.summary_metrics?.long_run_iran_hormuz_leverage_trend,'Long-run monopoly leverage trend']
    ].forEach(([v,l])=>{if(v==null)return;const c=add(metrics,'div','isr-hormuz-metric');add(c,'strong','',String(v));add(c,'span','',l);});
    const defs=[['overview','Overview'],['breach','Initial breakdown'],['matrix','Bargaining matrix'],['clauses','Clauses'],['sequence','Sequence'],['branches','Branches'],['lebanon','Lebanon'],['outside','Outside MOU'],['reality','Reality check'],['sources','Sources']];
    const tabs=add(body,'div','isr-hormuz-tabs');defs.forEach(([id,l],i)=>{const b=add(tabs,'button',i?'':'active',l);b.type='button';b.dataset.mouTab=id;b.onclick=()=>switchMouTab(body,id);});
    defs.forEach(([id],i)=>{const p=add(body,'section',`isr-hormuz-panel${i?'':' active'}`);p.dataset.mouPanel=id;});
    renderMouOverview(body.querySelector('[data-mou-panel="overview"]'));renderMouBreach(body.querySelector('[data-mou-panel="breach"]'));renderMouMatrix(body.querySelector('[data-mou-panel="matrix"]'));renderMouClauses(body.querySelector('[data-mou-panel="clauses"]'));renderMouSequence(body.querySelector('[data-mou-panel="sequence"]'));renderMouBranches(body.querySelector('[data-mou-panel="branches"]'));renderMouLebanon(body.querySelector('[data-mou-panel="lebanon"]'));renderMouOutside(body.querySelector('[data-mou-panel="outside"]'));renderMouReality(body.querySelector('[data-mou-panel="reality"]'));renderMouSources(body.querySelector('[data-mou-panel="sources"]'));
    buildOverlayPeerNav(overlay);
  }
  function switchMouTab(body,id){body.querySelectorAll('[data-mou-tab]').forEach(b=>b.classList.toggle('active',b.dataset.mouTab===id));body.querySelectorAll('[data-mou-panel]').forEach(p=>p.classList.toggle('active',p.dataset.mouPanel===id));}
  function buildOverlayPeerNav(overlay){let nav=overlay.querySelector('.isr-overlay-peer-nav');if(nav)return;const top=overlay.querySelector('.isr-hormuz-topbar');nav=el('nav','isr-overlay-peer-nav');['ATLAS','TIMELINE','ANALYSIS','MOU','SOURCES'].forEach(name=>{const b=add(nav,'button',name==='MOU'?'active':'',name);b.type='button';b.dataset.peerWorkspace=name;b.onclick=()=>activatePeer(name);});top?.insertBefore(nav,top.querySelector('.isr-return-map'));}
  function renderMouOverview(p){const ab=mou.agreement_balance||{};clearAndTitle(p,'What the signed MOU did — and what survived its collapse',ab.headline||mou.purpose);const grid=add(p,'div','isr-mou-grid');bulletList(grid,'Iran gained at signature',ab.iran_gained_at_signature);bulletList(grid,'Iran did not obtain',ab.iran_did_not_get);bulletList(grid,'Iran later lost / had reversed',ab.iran_lost_after_collapse);bulletList(grid,'Washington gained at signature',ab.us_gained_at_signature);bulletList(grid,'Washington did not obtain',ab.us_did_not_get);bulletList(p,'Current reality',ab.current_reality);}
  function renderMouBreach(p){const b=mou.mou_breach_assessment||{};clearAndTitle(p,b.title||'Initial MOU breakdown',b.analytical_note);const lead=add(p,'article','isr-mou-emphasis');add(lead,'div','eyebrow','PRIMARY INITIAL VIOLATOR · ANALYTICAL JUDGMENT');add(lead,'h3','',b.primary_initial_violator||'Unresolved');add(lead,'p','',b.confidence||'');[['U.S. implementation before breach',b.us_implementation_before_breach],['Tehran’s claimed trigger',b.tehran_claimed_trigger],['What the text actually allowed',b.why_tehran_reading_fails],['Public-record reality',b.public_record_reality],['Washington response',b.washington_response],['Bottom line',b.bottom_line]].forEach(([h,t])=>{if(!t)return;const c=add(p,'article','isr-hormuz-card');add(c,'h3','',h);add(c,'p','',t);});sourceLinks(p,b.sources);}
  function renderMouMatrix(p){clearAndTitle(p,'Bargaining matrix','Each row separates Iran’s priority, Washington’s priority, the signed compromise and what happened afterward. Concession scores are domain-specific analyst aids, not morality or a war score.');(mou.mou_concession_matrix||[]).forEach(x=>{const c=add(p,'article','isr-mou-matrix-card');add(c,'h3','',x.topic);const g=add(c,'div','isr-mou-matrix-grid');[['Iran priority',x.iran_priority],['U.S. priority',x.us_priority],['Agreed text/result',x.agreed],['Why/status',`${x.status||''}${x.why?` — ${x.why}`:''}`]].forEach(([h,t])=>{const d=add(g,'div');add(d,'b','',h);add(d,'p','',t||'—');});add(c,'small','',`Iran concession aid ${x.iran_concession}/10 · U.S. concession aid ${x.us_concession}/10`);sourceLinks(c,x.sources);});}
  function renderMouClauses(p){clearAndTitle(p,'Clause-by-clause position tracks','Markers show where the signed clause sat between each side’s substantive poles; later markers show where implementation moved afterward.');(mou.mou_position_tracks||[]).forEach(t=>{const c=add(p,'article','isr-hormuz-card');add(c,'div','eyebrow',`CLAUSE ${t.clause} · ${t.confidence} CONFIDENCE`);add(c,'h3','',t.topic);add(c,'p','',t.analysis);if(t.scorable){const tr=add(c,'div','isr-hormuz-track');add(tr,'span','',`Signed position: ${t.position}/100 toward U.S. pole`);const axis=add(tr,'div','isr-hormuz-axis');const marker=add(axis,'i');marker.style.left=`${t.position}%`;if(t.later_marker){const later=add(axis,'i','later');later.style.left=`${t.later_marker.position}%`;later.title=t.later_marker.text||t.later_marker.label;}}add(c,'small','',t.current_status||'');sourceLinks(c,t.sources);});}
  function renderMouSequence(p){clearAndTitle(p,'Sequence','Chronology is shown in event order; later facts do not rewrite what was known earlier.');const seq=add(p,'div','isr-hormuz-sequence');(mou.sequence||[]).forEach(e=>{const c=add(seq,'article','isr-hormuz-card');add(c,'div','eyebrow',`${e.date} · ${e.track}`);add(c,'h3','',e.title);add(c,'p','',e.result);add(c,'small','',`Coercive ${e.coercive}/10 · converted ${e.converted}/10 · ${e.verification}`);sourceLinks(c,e.sources);});}
  function renderMouBranches(p){clearAndTitle(p,'Strategic branches','Parallel tracks show why a tactical Hormuz advantage does not automatically become legal, diplomatic or durable economic control.');(mou.branches||[]).forEach(b=>{const c=add(p,'article','isr-hormuz-card');add(c,'div','eyebrow',`${b.id} · structural ${b.structural_score}/10 · realized ${b.realized_score}/10`);add(c,'h3','',b.title);add(c,'p','',b.summary);bulletList(c,'What worked',b.worked);bulletList(c,'What failed / constrained conversion',b.failed);sourceLinks(c,b.sources);});}
  function renderMouLebanon(p){const l=mou.lebanon_reversal||{};clearAndTitle(p,l.title||'Lebanon reversal',l.assessment);add(p,'div','isr-mou-scoreline',`Structural kneecap ${l.structural_kneecap}/10 · realized ${l.realized_kneecap}/10`);(l.steps||[]).forEach(s=>{const c=add(p,'article','isr-hormuz-card');add(c,'div','eyebrow',`${s.date} · ${s.stage}`);add(c,'p','',s.text);sourceLinks(c,s.sources);});}
  function renderMouOutside(p){clearAndTitle(p,'Demands outside the signed MOU','These positions matter because later rhetoric can otherwise be misread as if the signed interim text had already granted them.');const grid=add(p,'div','isr-mou-grid');[['Iranian demands',mou.non_mou_demands?.iran],['U.S. demands',mou.non_mou_demands?.us]].forEach(([h,items])=>{const sec=add(grid,'section');add(sec,'h3','',h);(items||[]).forEach(d=>{const c=add(sec,'article','isr-hormuz-card');add(c,'b','',d.demand);add(c,'p','',d.why_absent);sourceLinks(c,d.sources);});});}
  function renderMouReality(p){const r=mou.hormuz_reality_check||{};clearAndTitle(p,r.title||'Reality check',r.assessment);const metrics=add(p,'div','isr-hormuz-metrics');(r.metrics||[]).forEach(m=>{const c=add(metrics,'div','isr-hormuz-metric');add(c,'strong','',m.value);add(c,'span','',`${m.label} — ${m.note}`);});(r.erosion_mechanisms||[]).forEach(e=>{const c=add(p,'article','isr-hormuz-card');add(c,'h3','',e.mechanism);add(c,'p','',e.effect);sourceLinks(c,e.sources);});if(r.bottom_line){const c=add(p,'div','callout');add(c,'b','','Bottom line: ');c.append(document.createTextNode(r.bottom_line));}}
  function renderMouSources(p){clearAndTitle(p,'MOU / Hormuz sources','Source links establish the cited proposition or actor statement; their role is not automatically independent confirmation of every claimed effect.');Object.entries(mou.sources||{}).sort((a,b)=>String(b[1].date||'').localeCompare(String(a[1].date||''))).forEach(([id,s])=>{const c=add(p,'article','isr-hormuz-card');add(c,'div','eyebrow',`${s.date||'UNDATED'} · GRADE ${s.grade||'—'}`);const u=safeUrl(s.url);if(u){const a=add(c,'a','',s.label||id);a.href=u;a.target='_blank';a.rel='noopener noreferrer';}else add(c,'h3','',s.label||id);add(c,'p','',s.role||'');add(c,'small','',id);});}

  async function loadStrategicRoutes(){
    if(!routes)routes=await fetchJson('./data/routes.json').catch(()=>null);if(!routes?.proposedStrategicRoutes||!window.L||!window.atlasMap)return;
    routeGroup=window.L.layerGroup();routes.proposedStrategicRoutes.forEach(r=>{const opts={weight:3,opacity:.75};if(r.render_style==='DASHED')opts.dashArray='8 8';const line=window.L.polyline(r.coords,opts);line.bindTooltip?.(`${r.name} · ${label(r.status)}`);line.addTo(routeGroup);});
  }
  function syncStrategicRoutes(state){if(!routeGroup||!window.atlasMap)return;if(state.activeView==='arctic'){if(!window.atlasMap.hasLayer(routeGroup))routeGroup.addTo(window.atlasMap);}else if(window.atlasMap.hasLayer(routeGroup))window.atlasMap.removeLayer(routeGroup);}

  function ensureCurrentMapBadge(){
    const mapwrap=document.getElementById('map')?.parentElement;if(!mapwrap)return;
    let badge=mapwrap.querySelector('.isr-current-map-badge');
    if(!badge){badge=add(mapwrap,'div','isr-current-map-badge');add(badge,'b','','CURRENT MAP · latest verified state');add(badge,'span','','This map always shows the newest accepted map records. Timeline cutoffs do not roll the Atlas map backward. Use Map layers to explore sites, strike effects, imagery and agreements.');}
    badge.hidden=peerForState()!=='ATLAS';
  }

  const PLAIN_EXACT=new Map([
    ['SYNTHESIS · DERIVED FROM ACCEPTED RECORDS','BOTTOM LINE · BASED ON VERIFIED RECORDS'],
    ['CURRENT CONCLUSION','WHAT THE EVIDENCE SUPPORTS'],
    ['DOES NOT PROVE','WHAT THIS DOES NOT MEAN'],
    ['EVIDENCE DETAIL','WHY WE SAY THIS'],
    ['Open evidence','See sources'],
    ['Operational reach','Ability to strike at distance'],
    ['C2ISR / functional continuity','Command and intelligence systems still working'],
    ['Maritime leverage','Pressure through Hormuz and shipping'],
    ['Alliance / diplomatic position','Regional and diplomatic position'],
    ['Current domain assessments','Current situation by area'],
    ['Functional-damage scale used here','How damage is described here'],
    ['Visual verification','Photos and satellite evidence'],
    ['Regional alignment indicators','Regional cooperation and alliances'],
    ['ALMOST_CERTAIN','Almost certain'],['VERY_LIKELY','Very likely'],['LIKELY','Likely'],['MODERATE','Moderate'],['HIGH','High'],
    ['IRAN_CAPABILITY_ATTRITED_BUT_NOT_SUPPRESSED','Iran was weakened but still able to fight'],
    ['SEVERE_CONVENTIONAL_FORCE_DEGRADATION_WITH_SURVIVING_STRIKE_CAPACITY','Conventional forces badly weakened; strike capability remains'],
    ['SEVERE_LEADERSHIP_DISRUPTION_WITH_STATE_CONTINUITY','Major leadership losses; government still functioning'],
    ['REGIONAL_ALIGNMENT_HARDENED_WHILE_MEDIATION_PERSISTED','Regional coordination hardened while talks continued'],
    ['IRAN_STRATEGIC_POSITION_DEGRADED_BUT_COERCIVE_LEVERS_SURVIVE','Strategic position weakened; major pressure tools remain']
  ]);
  const PLAIN_REPLACE=[
    [/\bC2ISR\b/g,'command, surveillance and intelligence'],[/\bC2\b/g,'command and control'],[/\bUAS\b/g,'drones'],[/\bBDA\b/g,'damage assessment'],
    [/\bforce posture\b/gi,'force positioning'],[/\bfunctional continuity\b/gi,'ability to keep operating'],[/\bfunctional effect\b/gi,'what stopped working'],
    [/\battrition\b/gi,'losses'],[/\battrited\b/gi,'worn down'],[/\bdegradation\b/gi,'weakening'],[/\bdegraded\b/gi,'weakened'],
    [/\bsea-denial\b/gi,'ability to keep ships out'],[/\bcoercive leverage\b/gi,'pressure'],[/\bcoercive\b/gi,'pressure-based'],[/\bkinetic\b/gi,'military'],
    [/\bcapitulation\b/gi,'giving in'],[/\bdecapitation\b/gi,'senior leadership losses'],[/\binstitutionalized\b/gi,'formally established'],
    [/\btheater-wide\b/gi,'region-wide'],[/\bcampaign-generating capacity\b/gi,'ability to keep military operations going']
  ];
  function plainText(value){let s=String(value||'');if(PLAIN_EXACT.has(s.trim()))return PLAIN_EXACT.get(s.trim());if(/^[A-Z0-9_+\-/ ]{5,}$/.test(s.trim())&&s.includes('_'))s=label(s);PLAIN_REPLACE.forEach(([r,v])=>{s=s.replace(r,v)});return s;}
  function humanizeVisibleText(root){
    if(!root||!document.createTreeWalker)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];let n;while((n=walker.nextNode()))nodes.push(n);
    nodes.forEach(node=>{const p=node.parentElement;if(!p||p.closest('a,code,pre,.sources,.isr-source-row,.eg-source-index,.srcchip,.isr-ground-gauge'))return;const before=node.nodeValue;if(!before||!before.trim())return;const after=plainText(before);if(after!==before)node.nodeValue=after;});
  }
  function installPlainLanguage(){
    humanizeVisibleText(document.body);if(plainObserver)return;plainObserver=new MutationObserver(muts=>{muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)humanizeVisibleText(n);else if(n.nodeType===3&&n.parentElement)humanizeVisibleText(n.parentElement)}));});plainObserver.observe(document.body,{childList:true,subtree:true});
  }

  function ensurePublicUxCss(){if(document.querySelector('link[data-public-ux]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='./css/public-ux-20260823.css?v=20260823';link.dataset.publicUx='true';document.head.appendChild(link);}

  function stateSync(state){
    if(!['timeline','sources','facilities'].includes(state.activeView))lastAnalysisView=state.activeView||lastAnalysisView;
    const peer=peerForState();setCanonicalLabels();setPeerActive(peer);
    if(peer==='ATLAS')setTimeout(ensureCurrentMapBadge,0);
    if(state.activeView==='timeline'){setTimeout(()=>{enhanceTimeline();updateTimelineEnhancements();},0);}if(state.activeView==='sources')setTimeout(enhanceSources,0);if(peer==='MOU')setTimeout(rebuildMOU,0);syncStrategicRoutes(state);setTimeout(()=>humanizeVisibleText(document.body),0);
  }

  async function init(){
    await waitFor(()=>window.ISRFullScope20260822&&window.AtlasState&&document.querySelector('.analysis-nav'));
    full=window.ISRFullScope20260822;
    [registry,mou]=await Promise.all([fetchJson('./data/source-registry.json').catch(()=>null),fetchJson('./data/hormuz-strategic-v3.json')]);
    ensurePublicUxCss();buildPeerNav();setCanonicalLabels();enhanceTimeline();bindSourceRefresh();enhanceSources();await loadStrategicRoutes();installPlainLanguage();
    const launch=document.querySelector('.isr-hormuz-launch');if(launch){launch.textContent='Open MOU workspace';launch.addEventListener('click',()=>setTimeout(()=>{rebuildMOU();setPeerActive('MOU');},0));}
    const ret=document.querySelector('.isr-return-map');ret?.addEventListener('click',()=>setTimeout(()=>setPeerActive('ATLAS'),0));
    window.AtlasState.subscribe(stateSync);stateSync(window.AtlasState.get());
    const params=new URLSearchParams(location.search);if(!params.has('view')&&window.AtlasState.get().activeView==='snapshot')setTimeout(()=>activatePeer('ATLAS'),0);
    window.ISRAug22Workspaces={activatePeer,enhanceTimeline,enhanceSources,rebuildMOU,setVisualZoom,humanizeVisibleText};
  }
  const start=()=>init().catch(e=>console.warn('ISR Aug. 22 workspace enhancement failed; base atlas remains usable.',e));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}());
