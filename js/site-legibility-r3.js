'use strict';
(function SiteLegibilityR3(){
  if(window.__ISR_SITE_LEGIBILITY_R3__)return;
  window.__ISR_SITE_LEGIBILITY_R3__=true;

  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const FLAG_ROOT='./assets/flags/';
  const ACTOR_FLAGS=new Map([
    ['iran','ir'],['iranian','ir'],['iran / aligned','ir'],['iran/aligned','ir'],['irgc','ir'],
    ['usa','us'],['u.s.','us'],['us','us'],['united states','us'],['u.s. / coalition','us'],['u.s./coalition','us'],['us / coalition','us'],['us/coalition','us'],
    ['israel','il'],['saudi arabia','sa'],['pakistan','pk'],['china','cn'],['russia','ru'],['oman','om'],
    ['turkey','tr'],['türkiye','tr'],['lebanon','lb'],['hezbollah','lb'],['united arab emirates','ae'],['uae','ae'],
    ['bahrain','bh'],['qatar','qa'],['kuwait','kw'],['iraq','iq'],['jordan','jo'],['yemen','ye'],['houthis','ye']
  ]);
  /* Sources are intentionally excluded: source country identity is owned by source-bias-r1 at country headings only. */
  const ACTOR_ROOTS='#snapshot,#timeline,#facilities,#strikes,#csis,#imagery,#losses,#economy,#arctic,#diplomacy-hub,#endgame,#claims,#infowar,.isr-evidence-drawer';
  const ACTOR_NODES='h1,h2,h3,h4,strong,[data-actor],.actor,.actor-label,.isr-actor-chip,.isr-actor-strip span,.isr-actor-strip button';
  let profiles=new Map(),queued=false;

  function norm(v){return String(v||'').trim().replace(/\s+/g,' ').toLowerCase();}
  function canonicalActor(v){const n=norm(v);if(n==='usa')return'United States';if(n==='us'||n==='u.s.')return'United States';return String(v||'').trim();}
  function codeFor(v){return ACTOR_FLAGS.get(norm(v))||null;}
  function flag(code,label){const img=document.createElement('img');img.className='sir-actor-flag-icon';img.src=`${FLAG_ROOT}${code}.svg`;img.alt='';img.setAttribute('aria-hidden','true');img.width=24;img.height=18;img.decoding='async';img.title=label;return img;}

  function exactActorNode(node){
    if(node.dataset.actorFlagR3==='1'||node.querySelector(':scope > .sir-actor-flag-icon'))return;
    const raw=(node.textContent||'').trim(),code=codeFor(raw);if(!code)return;
    const label=canonicalActor(raw);if(raw!==label)node.textContent=label;
    node.prepend(document.createTextNode(' '));node.prepend(flag(code,label));node.dataset.actorFlagR3='1';node.dataset.actorIdentity=norm(label);
  }
  function decorateActorLabels(){$$(ACTOR_ROOTS).forEach(root=>$$(ACTOR_NODES,root).forEach(exactActorNode));}

  function recordForPopup(title){
    const same=x=>String(x?.name||x?.title||'').trim()===title;
    const legacy=(window.ATLAS_DATA?.facilities||[]).find(same);if(legacy)return legacy;
    const canonical=(window.ATLAS_LEDGER?.facilities?.facilities||[]).find(same);if(canonical)return canonical;
    for(const key of ['strikes','claims','coalition14','mecca']){const hit=(window.ATLAS_DATA?.[key]||[]).find(same);if(hit)return hit;}
    return null;
  }
  function actorForRecord(record){
    if(!record)return null;
    if(String(record.facility_id||record.id||'').startsWith('US-'))return'United States';
    if(String(record.facility_id||record.id||'').startsWith('FAC-IRN-'))return'Iran';
    const raw=record.actor||record.claimant||record.owner||(Array.isArray(record.actors)?record.actors[0]:null)||record.country;
    return raw?canonicalActor(raw):null;
  }
  function decoratePopup(popup){
    popup.classList.add('pr3-readable-popup');
    if($$('.component-state',popup).length>1)popup.classList.add('pr3-multi-entry');
    if($('.pr3-popup-actor',popup))return;
    const titleNode=$('h3',popup);if(!titleNode)return;
    const record=recordForPopup((titleNode.textContent||'').trim()),actor=actorForRecord(record),code=codeFor(actor);if(!actor||!code)return;
    const row=document.createElement('div');row.className='pr3-popup-actor';row.dataset.actorFlagR3='1';row.append(flag(code,actor));
    const text=document.createElement('span');text.textContent=actor;row.append(text);
    if(record?.host&&norm(record.host)!==norm(actor)){const host=document.createElement('small');host.textContent=`Host: ${record.host}`;row.append(host);}
    titleNode.insertAdjacentElement('afterend',row);
  }
  function decoratePopups(){$$('.leaflet-popup .atlas-popup,.leaflet-popup-pane .atlas-popup').forEach(decoratePopup);}

  function profileOfficial(profile){
    const type=String(profile?.outlet_type||'').toUpperCase(),aff=String(profile?.state_affiliation||'').toUpperCase(),own=String(profile?.ownership_note||'').toUpperCase();
    return /OFFICIAL|GOVERNMENT|MILITARY|STATE_MEDIA|STATE MEDIA/.test(type)||/OFFICIAL|GOVERNMENT|MILITARY|STATE[- ]?(?:OWNED|AFFILIATED|CONTROLLED)|PUBLIC AUTHORITY/.test(aff)||/OFFICIAL GOVERNMENT|GOVERNMENT[- ]OWNED|STATE[- ]OWNED|STATE MEDIA|GOVERNMENT AGENCY|MILITARY COMMAND/.test(own);
  }
  function markOfficialSources(){
    $$('#sources .isr-outlet-card').forEach(card=>{
      const head=$('.isr-outlet-head',card),nameNode=$('strong',head);if(!head||!nameNode)return;
      const name=(nameNode.textContent||'').trim(),profile=profiles.get(name),official=card.classList.contains('isr-gov-source')||profileOfficial(profile);
      if(!official)return;
      card.classList.add('isr-gov-source');
      if($('.isr-gov-source-star',head))return;
      const star=document.createElement('span');star.className='isr-gov-source-star';star.textContent='★';star.setAttribute('role','img');star.setAttribute('aria-label','Official government or state source');star.title='Official government or state source · provenance only';nameNode.insertAdjacentElement('afterend',star);
    });
  }

  function normalizePublicPresentation(){
    const P=window.AtlasPresentation;
    if(!P)return;
    [$('.content'),$('.analysis-nav'),$('.toolbar'),$('.leaflet-popup-pane')].filter(Boolean).forEach(root=>P.formatPublicDom?.(root));
    P.applyFreshnessDisplay?.(document,window);
  }

  function refresh(){window.ISRStatusIdentityR1?.refresh?.();window.ISRSourceBiasR1?.apply?.();window.ISRPublicRecordUIR2?.normalizeLegacyEvidencePresentation?.();normalizePublicPresentation();decorateActorLabels();decoratePopups();markOfficialSources();normalizePublicPresentation();}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
  function observe(root){if(!root||root.dataset.pr3Observe==='1')return;root.dataset.pr3Observe='1';new MutationObserver(schedule).observe(root,{childList:true,subtree:true});}
  function bind(){
    /* These late-render roots genuinely need observation because chronology overlays, source directory, legacy evidence cards and Leaflet popups are injected asynchronously. */
    observe($('.content'));observe($('.analysis-nav'));observe($('.leaflet-popup-pane'));
    document.addEventListener('click',e=>{if(e.target.closest('.primary-nav,.secondary-nav,#sources,#losses,#claims,.leaflet-popup,.layer-control'))[0,90,240].forEach(ms=>setTimeout(schedule,ms));},true);
    ['atlasstatechange','atlasdataready','atlascurrentready20260824','atlascurrentready20260825','atlascurrentready20260825late','atlascurrentready20260826','atlaswikireconready20260826'].forEach(name=>window.addEventListener(name,schedule));
    const bindMap=()=>{if(window.atlasMap?.on&&!window.atlasMap.__pr3PopupBound){window.atlasMap.__pr3PopupBound=true;window.atlasMap.on('popupopen',()=>setTimeout(schedule,0));}else setTimeout(bindMap,250);};bindMap();
  }
  async function loadProfiles(){try{const r=await fetch('./data/source-registry.json?v=20260826-r3',{cache:'no-store'});if(r.ok){const data=await r.json();profiles=new Map((data.outlet_profiles||[]).map(p=>[p.display_name,p]));}}catch(_){/* existing source UI remains usable */}}
  async function init(){await loadProfiles();refresh();bind();[100,350,900,2200].forEach(ms=>setTimeout(schedule,ms));window.ISRSiteLegibilityR3={refresh};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
