'use strict';
(function SourceBiasR1(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n};
  const A=(p,t,c,x)=>{const n=E(t,c,x);p.append(n);return n};
  const J=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}:${r.status}`);return r.json()};
  const safe=u=>{try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:null}catch{return null}};
  const norm=v=>String(v||'').trim().toLowerCase();
  const POS=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,'-');
  let registry,ctx,biasMeta,obs;

  function outletRatingRow(profile){
    const key=norm(profile?.display_name);
    return (biasMeta?.outlets||[]).find(row=>[row.canonical_name,...(row.aliases||[])].some(name=>norm(name)===key))||null;
  }

  /* Explicitly named for the contract gate: this is the provider-separated media_bias_context. */
  function media_bias_context(profile){
    return (outletRatingRow(profile)?.ratings||[]).filter(r=>r.status==='RATED'&&safe(r.profile_url));
  }

  function positionScale(parent,provider,labels,selected){
    const scale=A(parent,'div','isr-ground-scale');
    scale.dataset.biasProvider=provider;
    labels.forEach(label=>{
      const span=A(scale,'span',String(selected||'').toUpperCase()===label?'selected':'',label);
      span.dataset.biasPosition=POS(label);
      if(span.classList.contains('selected'))span.setAttribute('aria-current','true');
    });
    return scale;
  }

  function providerLink(parent,rating,label){
    const u=safe(rating?.profile_url);if(!u)return null;
    const a=A(parent,'a','isr-ground-link',label);a.href=u;a.target='_blank';a.rel='noopener noreferrer';return a;
  }

  function secondaryRatings(parent,ratings,excludeProvider){
    const rows=(ratings||[]).filter(r=>r.provider!==excludeProvider);
    if(!rows.length)return;
    const box=A(parent,'div','isr-bias-secondary');
    A(box,'span','isr-bias-secondary-label','Additional provider context');
    rows.forEach(r=>{
      const u=safe(r.profile_url);if(!u)return;
      const a=A(box,'a','isr-provider-chip',`${r.provider==='AD_FONTES'?'AD FONTES MEDIA':r.provider} · ${String(r.label||'').toUpperCase()}`);
      a.dataset.provider=r.provider;a.href=u;a.target='_blank';a.rel='noopener noreferrer';
    });
  }

  function renderGround(parent,g,alts){
    A(parent,'b','isr-ground-title',`GROUND NEWS · ${String(g.bias_raw).toUpperCase()}${g.factuality?` · ${String(g.factuality).toUpperCase()} FACTUALITY`:''}`);
    positionScale(parent,'GROUND_NEWS',['FAR LEFT','LEFT','LEAN LEFT','CENTER','LEAN RIGHT','RIGHT','FAR RIGHT'],String(g.bias_raw).toUpperCase());
    providerLink(parent,g,'Ground News publisher profile ↗');
    A(parent,'small','','Third-party publisher context only. It does not change Atlas evidence grade.');
    secondaryRatings(parent,alts,'GROUND_NEWS');
  }

  function renderAllSides(parent,rating,alts){
    A(parent,'b','isr-ground-title',`ALLSIDES · ${String(rating.label).toUpperCase()}`);
    positionScale(parent,'ALLSIDES',['LEFT','LEAN LEFT','CENTER','LEAN RIGHT','RIGHT'],String(rating.label).toUpperCase());
    providerLink(parent,rating,'AllSides publisher profile ↗');
    const note=A(parent,'div','isr-bias-provider-note');
    note.textContent=`Provider-native publisher rating${rating.confidence?` · ${String(rating.confidence).toUpperCase()} confidence`:''}. Not an Atlas evidence grade.`;
    secondaryRatings(parent,alts,'ALLSIDES');
  }

  function renderAdFontes(parent,rating,alts){
    A(parent,'b','isr-ground-title',`AD FONTES MEDIA · ${String(rating.label).toUpperCase()}`);
    const wrap=A(parent,'div','isr-adfontes-wrap'),meter=A(wrap,'div','isr-adfontes-meter');
    const score=Number(rating.bias_score),bounded=Number.isFinite(score)?Math.max(-42,Math.min(42,score)):0;
    meter.style.setProperty('--bias-pos',`${((bounded+42)/84)*100}%`);
    meter.dataset.biasProvider='AD_FONTES';meter.dataset.biasPosition=POS(rating.label);
    const axis=A(wrap,'div','isr-adfontes-axis');A(axis,'span','','-42 LEFT');A(axis,'span','',`${bounded.toFixed(2)} · ${String(rating.label).toUpperCase()}`);A(axis,'span','', '+42 RIGHT');
    if(rating.reliability_label||rating.reliability_score!=null){A(parent,'div','isr-bias-reliability',`Reliability: ${rating.reliability_label||'provider rated'}${rating.reliability_score!=null?` · ${rating.reliability_score}`:''}`)}
    providerLink(parent,rating,'Ad Fontes publisher profile ↗');
    A(parent,'small','','Ad Fontes bias/reliability are provider-native publisher context. They do not change Atlas evidence grade.');
    secondaryRatings(parent,alts,'AD_FONTES');
  }

  function renderBias(parent,profile){
    parent.replaceChildren();
    const g=profile?.ground_news||{},alts=media_bias_context(profile);
    const groundRated=g.status==='RATED'&&g.bias_raw&&safe(g.profile_url),na=g.status==='NOT_APPLICABLE';
    if(groundRated){renderGround(parent,g,alts);return}
    const allSides=alts.find(r=>r.provider==='ALLSIDES');if(allSides){renderAllSides(parent,allSides,alts);return}
    const adFontes=alts.find(r=>r.provider==='AD_FONTES');if(adFontes){renderAdFontes(parent,adFontes,alts);return}
    A(parent,'b','isr-ground-title',na?(ctx?.political_bias?.not_applicable_display||'POLITICAL-BIAS RATING NOT APPLICABLE'):(ctx?.political_bias?.unrated_display||'NO INDEPENDENT POLITICAL-BIAS RATING LOCATED'));
    A(parent,'small','',na?'Political-bias rating is not applicable to this source type.':'No verified Ground News, AllSides or Ad Fontes publisher rating is stored for this outlet. NOT RATED is never interpreted as CENTER.');
  }

  function apply(){
    const root=$('#sources');if(!root||!registry)return;
    const profiles=new Map((registry.outlet_profiles||[]).map(p=>[p.display_name,p]));
    $$('.isr-outlet-card',root).forEach(card=>{
      const name=$('.isr-outlet-head strong',card)?.textContent?.trim(),profile=profiles.get(name);if(!profile)return;
      const box=$('.isr-gn',card);if(!box||box.dataset.biasR1==='provider-separated')return;
      renderBias(box,profile);box.dataset.biasR1='provider-separated';
    });
  }

  function observe(){
    const root=$('#sources');if(!root||obs)return;
    let queued=false;obs=new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;apply()},80)});obs.observe(root,{childList:true,subtree:true});
  }

  async function init(){
    [registry,ctx,biasMeta]=await Promise.all([
      J('./data/source-registry.json?v=20260824-r1'),
      J('./data/source-context-v1.json?v=20260824-r1'),
      J('./data/media-bias-provider-metadata.json?v=20260824-r1')
    ]);
    apply();observe();window.AtlasState?.subscribe?.(s=>{if(s.activeView==='sources')setTimeout(apply,90)});
    window.ISRSourceBiasR1={apply,media_bias_context};
  }

  init().catch(e=>console.error('source-bias-r1',e));
}());
