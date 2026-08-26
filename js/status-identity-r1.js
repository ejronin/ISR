'use strict';
(function StatusIdentityR1(){
  if(window.__ISR_STATUS_IDENTITY_R1__)return;
  window.__ISR_STATUS_IDENTITY_R1__=true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

  const FLAG_ASSET_ROOT='./assets/flags/';
  const ACTOR_FLAGS=new Map([
    ['iran','ir'],['iran / aligned','ir'],['iran/aligned','ir'],['iranian','ir'],['irgc','ir'],
    ['u.s.','us'],['us','us'],['united states','us'],['u.s. / coalition','us'],['u.s./coalition','us'],['us / coalition','us'],['us/coalition','us'],
    ['israel','il'],['saudi arabia','sa'],['pakistan','pk'],['china','cn'],['russia','ru'],['oman','om'],
    ['turkey','tr'],['türkiye','tr'],['lebanon','lb'],['hezbollah','lb'],['united arab emirates','ae'],['uae','ae'],
    ['bahrain','bh'],['qatar','qa'],['kuwait','kw'],['iraq','iq'],['jordan','jo'],['yemen','ye'],['houthis','ye']
  ]);
  const FLAG_PREFIX=/^[\u{1F1E6}-\u{1F1FF}]{2}\s/u;
  const ACTOR_ROOTS='#snapshot,#timeline,#facilities,#strikes,#csis,#imagery,#losses,#economy,#arctic,#diplomacy-hub,#endgame,#claims,#infowar,.atlas-popup,.isr-evidence-drawer';
  const ACTOR_ELEMENTS='h1,h2,h3,h4,strong,button,[data-actor],.actor,.actor-label,.isr-actor-chip,.isr-actor-strip span,.isr-actor-strip button';
  /* Physical condition styling is intentionally restricted to explicit physical/loss surfaces. Evidence badges use their own vocabulary and classes. */
  const STATUS_ELEMENTS='.physical-badge,.loss-status,.isr-loss-status,.component-state .physical-badge';
  const STATUS_CLASSES=['sir-condition-loss','sir-condition-damage','sir-condition-operational','sir-condition-unresolved'];

  function norm(v){return String(v||'').trim().replace(/\s+/g,' ').toLowerCase();}
  function actorCodeFor(text){return ACTOR_FLAGS.get(norm(text))||null;}
  function actorFlagFor(text){const code=actorCodeFor(text);return code?`${FLAG_ASSET_ROOT}${code}.svg`:null;}
  function flagIcon(code,label){
    const img=document.createElement('img');
    img.className='sir-actor-flag-icon';
    img.src=`${FLAG_ASSET_ROOT}${code}.svg`;
    img.alt='';
    img.setAttribute('aria-hidden','true');
    img.width=24;
    img.height=18;
    img.decoding='async';
    img.dataset.flagCode=code;
    img.title=label;
    return img;
  }
  function decorateActors(){
    $$(ACTOR_ROOTS).forEach(root=>{
      $$(ACTOR_ELEMENTS,root).forEach(node=>{
        if(node.querySelector(':scope > .sir-actor-flag-icon')){node.dataset.actorFlagR1='1';return;}
        const raw=(node.textContent||'').trim();
        if(!raw)return;
        const text=raw.replace(FLAG_PREFIX,'').trim();
        const code=actorCodeFor(text);if(!code)return;
        if(raw!==text)node.textContent=text;
        const icon=flagIcon(code,text);
        node.prepend(document.createTextNode(' '));
        node.prepend(icon);
        node.dataset.actorFlagR1='1';
        node.dataset.actorIdentity=norm(text);
      });
    });
  }

  function conditionFor(text){
    const t=String(text||'').trim().replace(/\s+/g,' ').toUpperCase();
    if(!t)return null;
    if(/\b(SUNK|DESTROYED|LOST|INOPERABLE|NO LONGER OPERATIONAL|WRITE[- ]?OFF|CRASHED)\b/.test(t))return 'loss';
    if(/\b(REPAIRED|RESTORED|OPERATING|OPERATIONAL|RESUMED|RETURNED TO SERVICE|BACK IN SERVICE|REMAINED OPERATIONAL|STILL OPERATING)\b/.test(t))return 'operational';
    if(/\b(DAMAGED|DEGRADED|IMPAIRED|DISRUPTED|SEVERE DAMAGE|PARTIAL DAMAGE)\b/.test(t))return 'damage';
    if(/\b(UNRESOLVED|CLAIMED|UNVERIFIED|UNCONTESTED|TARGETED|ATTRIBUTION UNRESOLVED|NOT INDEPENDENTLY VERIFIED|QTY UNRESOLVED|QUANTITY UNRESOLVED)\b/.test(t))return 'unresolved';
    return null;
  }
  function decorateStatuses(){
    $$(STATUS_ELEMENTS).forEach(node=>{
      STATUS_CLASSES.forEach(c=>node.classList.remove(c));
      const condition=conditionFor(node.textContent);if(condition)node.classList.add(`sir-condition-${condition}`);
    });
    $$('#losses strong,#losses b,#losses span').forEach(node=>{
      const t=(node.textContent||'').trim();
      if(!/^(?:QTY|QUANTITY) UNRESOLVED$/i.test(t))return;
      STATUS_CLASSES.forEach(c=>node.classList.remove(c));node.classList.add('sir-condition-unresolved');
    });
  }

  function ensureSourceLegend(){
    const intro=$('#sources .pr2-source-intro');if(!intro||$('.sir-source-star-key',intro))return;
    const key=document.createElement('div');key.className='sir-source-star-key';key.textContent='★ Official government/state source · provenance only';intro.appendChild(key);
  }

  function refresh(){decorateActors();decorateStatuses();ensureSourceLegend();window.ISRSourceBiasR1?.apply?.();}
  function bind(){
    document.addEventListener('click',e=>{if(e.target.closest('.primary-nav,.secondary-nav,.analysis-nav,.panel,.isr-evidence-drawer,.leaflet-popup'))[0,80,220].forEach(ms=>setTimeout(refresh,ms));},true);
    ['atlasstatechange','atlasdataready','atlascurrentready20260825late','atlascurrentready20260826','atlaswikireconready20260826'].forEach(name=>window.addEventListener(name,()=>setTimeout(refresh,0)));
  }
  function init(){refresh();bind();[80,220,600,1400,3000].forEach(ms=>setTimeout(refresh,ms));window.ISRStatusIdentityR1={refresh,conditionFor,actorFlagFor,actorCodeFor};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
