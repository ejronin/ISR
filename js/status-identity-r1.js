'use strict';
(function StatusIdentityR1(){
  if(window.__ISR_STATUS_IDENTITY_R1__)return;
  window.__ISR_STATUS_IDENTITY_R1__=true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

  const ACTOR_FLAGS=new Map([
    ['iran','🇮🇷'],['iran / aligned','🇮🇷'],['iran/aligned','🇮🇷'],['iranian','🇮🇷'],['irgc','🇮🇷'],
    ['u.s.','🇺🇸'],['us','🇺🇸'],['united states','🇺🇸'],['u.s. / coalition','🇺🇸'],['u.s./coalition','🇺🇸'],['us / coalition','🇺🇸'],['us/coalition','🇺🇸'],
    ['israel','🇮🇱'],['saudi arabia','🇸🇦'],['pakistan','🇵🇰'],['china','🇨🇳'],['russia','🇷🇺'],['oman','🇴🇲'],
    ['turkey','🇹🇷'],['türkiye','🇹🇷'],['lebanon','🇱🇧'],['hezbollah','🇱🇧'],['united arab emirates','🇦🇪'],['uae','🇦🇪'],
    ['bahrain','🇧🇭'],['qatar','🇶🇦'],['kuwait','🇰🇼'],['iraq','🇮🇶'],['jordan','🇯🇴'],['yemen','🇾🇪'],['houthis','🇾🇪']
  ]);
  const FLAG_PREFIX=/^[\u{1F1E6}-\u{1F1FF}]{2}\s/u;
  const ACTOR_ROOTS='#snapshot,#timeline,#facilities,#strikes,#csis,#imagery,#losses,#economy,#arctic,#diplomacy-hub,#endgame,#claims,#infowar,.atlas-popup,.isr-evidence-drawer';
  const ACTOR_ELEMENTS='h1,h2,h3,h4,strong,button,[data-actor],.actor,.actor-label,.isr-actor-chip,.isr-actor-strip span,.isr-actor-strip button';
  const STATUS_ELEMENTS='.pill,.badge,.evidence-badge,.physical-badge,.isr-status,.iw-meta span,.status,.loss-status,.isr-loss-status,.component-state b,.component-state span';
  const STATUS_CLASSES=['sir-condition-loss','sir-condition-damage','sir-condition-operational','sir-condition-unresolved'];

  function norm(v){return String(v||'').trim().replace(/\s+/g,' ').toLowerCase();}
  function actorFlagFor(text){return ACTOR_FLAGS.get(norm(text))||null;}
  function decorateActors(){
    $$(ACTOR_ROOTS).forEach(root=>{
      $$(ACTOR_ELEMENTS,root).forEach(node=>{
        if(node.dataset.actorFlagR1==='1')return;
        const text=(node.textContent||'').trim();
        if(!text||FLAG_PREFIX.test(text))return;
        const flag=actorFlagFor(text);if(!flag)return;
        node.textContent=`${flag} ${text}`;
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
    const key=document.createElement('div');key.className='sir-source-star-key';key.textContent='★ Official government source / outlet';intro.appendChild(key);
  }

  function refresh(){decorateActors();decorateStatuses();ensureSourceLegend();window.ISRSourceBiasR1?.apply?.();}
  function bind(){
    document.addEventListener('click',e=>{if(e.target.closest('.primary-nav,.secondary-nav,.analysis-nav,.panel,.isr-evidence-drawer,.leaflet-popup'))[0,80,220].forEach(ms=>setTimeout(refresh,ms));},true);
    window.addEventListener('atlasstatechange',()=>setTimeout(refresh,0));
    window.addEventListener('atlasdataready',()=>setTimeout(refresh,0));
    window.addEventListener('atlascurrentready20260825late',()=>setTimeout(refresh,0));
  }
  function init(){refresh();bind();[80,220,600,1400,3000].forEach(ms=>setTimeout(refresh,ms));window.ISRStatusIdentityR1={refresh,conditionFor,actorFlagFor};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());