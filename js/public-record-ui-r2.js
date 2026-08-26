'use strict';
(function PublicRecordUIR2(){
  if(window.__ISR_PUBLIC_RECORD_UI_R2__)return;
  window.__ISR_PUBLIC_RECORD_UI_R2__=true;
  if(!document.querySelector('link[data-public-record-bridge-r2]')){const l=document.createElement('link');l.rel='stylesheet';l.href='./css/public-record-legacy-bridge-r2.css?v=20260826-r2';l.dataset.publicRecordBridgeR2='1';document.head.appendChild(l);}
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const setText=(n,t)=>{if(n&&n.textContent!==t)n.textContent=t;};
  const STATUS_TEXT=new Map([
    ['UNCONTESTED','NOT INDEPENDENTLY VERIFIED'],
    ['UNCONTESTED CLAIM','CLAIMED · NOT INDEPENDENTLY VERIFIED'],
    ['UNVERIFIED','NOT INDEPENDENTLY VERIFIED'],
    ['UNVERIFIED / CLAIM','CLAIMED · NOT INDEPENDENTLY VERIFIED'],
    ['ACTOR CLAIM','ACTOR CLAIM · NOT VERIFIED']
  ]);

  function setShareStatus(message){const out=$('#shareStatus');if(!out)return;out.textContent=message;setTimeout(()=>{if(out.textContent===message)out.textContent='';},2200);}
  async function copyUrl(url,label){try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(url);else{const i=E('input','clipboard-fallback');i.value=url;i.readOnly=true;document.body.append(i);i.select();document.execCommand('copy');i.remove();}setShareStatus(label||'Link copied');}catch(_){setShareStatus('Copy failed — use the address bar');}}

  function applyPublicShell(){
    document.documentElement.classList.add('public-record-r2');
    const nav=$('.analysis-nav');if(nav)nav.hidden=false;
    $$('.isr-workspace-nav').forEach(n=>{n.hidden=true;n.setAttribute('aria-hidden','true');});
    setText($('.kicker'),'2026 IRAN WAR · PUBLIC EVIDENCE RECORD');
    setText($('.head .sub'),'A sourced record of events, damage, casualties, diplomacy, claims and outcomes.');
    const trust=$('.trust-strip'),items=trust?$$('span',trust):[];
    if(items[0])setText(items[0],'PUBLIC SOURCES');if(items[1])setText(items[1],'CLAIM ≠ CONFIRMATION');if(items[2])setText(items[2],'EVIDENCE CUTOFF SHOWN');
    setText($('#copyLinkButton'),'Copy current view link');
  }

  function applyFreshness(){
    const latest=window.ATLAS_CURRENT_UPDATE_20260825_LATE;if(!latest?.cutoff)return;
    const stamp=$('.review-stamp');if(stamp)setText(stamp,'Reviewed through 2026-08-25 21:32 ET');
    const strip=$('#timeline .isr-current-strip span');if(strip)setText(strip,'Current chronology through 2026-08-25 21:32 ET · 117 records');
  }

  function routeButton(title,copy,view){const b=E('button','pr2-route');b.type='button';b.dataset.pr2View=view;b.append(E('strong','',title),E('span','',copy));return b;}
  function ensureOverviewIntro(){
    const panel=$('#snapshot');if(!panel||$('.pr2-overview-intro',panel))return;
    const sec=E('section','pr2-overview-intro');sec.dataset.pr2Overview='1';
    sec.append(E('div','pr2-eyebrow','START HERE'),E('h2','','The war record at a glance'),E('p','','Use this page for the current picture. From here you can follow the chronology, inspect military events and losses, review diplomacy and outcomes, or open the underlying sources.'));
    const routes=E('div','pr2-route-grid');routes.append(routeButton('Follow the war','Read events in chronological order.','timeline'),routeButton('Military record','Bases, strikes, missiles, drones and imagery.','facilities'),routeButton('Consequences','Casualties, losses, economics and trade.','losses'),routeButton('Diplomacy & outcome','Talks, agreements, objectives and outcomes.','diplomacy-hub'));
    sec.append(routes);const key=E('div','pr2-status-key');[['pr2-confirmed','Confirmed'],['pr2-claimed','Claimed / not independently verified'],['pr2-disputed','Disputed or attribution unresolved'],['pr2-unresolved','Unknown / unresolved']].forEach(([c,t])=>key.append(E('span',c,t)));sec.append(key);panel.prepend(sec);
  }

  function tuneOverviewSynthesis(){
    const panel=$('#snapshot'),dash=$('.isr-outcome-dashboard',panel),picture=$('#currentPictureBlocks',panel);if(!panel||!dash)return;
    setText($('.isr-outcome-head h2',dash),'Iran: losses, retained capacity and limits of the evidence');
    const dek=$('.isr-outcome-head p',dash);if(dek&&/Five analytical levels/i.test(dek.textContent||''))setText(dek,'A structured synthesis of what the accepted record supports. This is not a combined war score.');
    if(picture&&dash.previousElementSibling!==picture)picture.insertAdjacentElement('afterend',dash);
  }
  function normalizeStatusLabels(root=document){$$('.pill,.badge,.evidence-badge,.isr-status,.iw-meta span',root).forEach(n=>{const k=(n.textContent||'').trim().replace(/\s+/g,' ').toUpperCase(),v=STATUS_TEXT.get(k);if(v)setText(n,v);});}

  function ensureTimelineReadingMode(){
    const panel=$('#timeline'),shell=$('.isr-timeline-shell',panel);if(!panel||!shell)return;
    if(!$('.pr2-timeline-intro',shell)){const intro=E('div','pr2-timeline-intro'),copy=E('div');copy.append(E('strong','','Read the chronology'),E('span','','Pick a date or event card to see what happened. Open Advanced timeline tools when you need historical evidence cutoffs, actor filters or a narrower time window.'));intro.append(copy);$('.isr-current-strip',shell)?.insertAdjacentElement('afterend',intro);}
    const controls=$('.isr-timeline-controls',shell),actors=$('.isr-actor-strip',shell),more=$('.isr-actor-more-menu',shell),ruler=$('.isr-ruler-wrap',shell),search=$('.isr-timeline-search',shell);
    if(search){search.classList.add('pr2-public-search');const map=$('.isr-timeline-map-slot',shell);if(search.parentElement===controls)(map||$('.pr2-timeline-intro',shell))?.insertAdjacentElement('afterend',search);}
    if(controls&&!$('.pr2-timeline-tools',shell)){const d=E('details','pr2-timeline-tools'),body=E('div','pr2-tools-body');d.append(E('summary','','Advanced timeline tools'),body);[controls,actors,more,ruler].filter(Boolean).forEach(n=>body.append(n));if(search)search.insertAdjacentElement('afterend',d);else $('.isr-timeline-map-slot',shell)?.insertAdjacentElement('afterend',d);}
    const help=$('.isr-timeline-help',shell);if(help)setText($('summary',help),'What AS OF and KNOWN BY mean');
  }

  function ensureSourcesReadingMode(){
    const panel=$('#sources'),root=$('.isr-source-directory',panel);if(!panel||!root)return;
    if(!$('.pr2-source-intro',panel)){const intro=E('section','pr2-source-intro');intro.append(E('div','pr2-eyebrow','SOURCE RECORD'),E('h2','','Inspect the evidence behind the Atlas'),E('p','','Important event and claim records link their sources directly. Use this directory when you want to audit the wider source base, compare outlets, or find a specific article. Publisher ratings describe the outlet; they do not change the evidence grade of a specific claim.'));const steps=E('div','pr2-source-steps');[['1 · Find the record','Start with the event, claim, facility or agreement you care about.'],['2 · Open its sources','Primary claims and independent confirmation stay distinct.'],['3 · Audit deeper','Use the filters below for provenance, outlet context and evidence roles.']].forEach(([h,p])=>{const c=E('div');c.append(E('strong','',h),E('span','',p));steps.append(c);});intro.append(steps);panel.prepend(intro);}
    const controls=$('.isr-source-controls',root);if(!controls)return;const input=$('input',controls);if(input)controls.classList.add('pr2-source-searchbar');
    if(!$('.pr2-source-filters',root)){const selects=$$('select',controls);if(selects.length){const d=E('details','pr2-source-filters'),grid=E('div','pr2-source-filter-grid');d.append(E('summary','','Advanced source filters'));selects.forEach(s=>grid.append(s));d.append(grid);controls.insertAdjacentElement('afterend',d);}}
  }

  function ensureObjectiveDisclosure(){
    const board=$('#endgame .eg25-objective-board');if(!board||$('.pr2-objective-method',board))return;const tally=$('.eg25-tally-summary',board),scale=$('.eg25-scale',board);if(!tally&&!scale)return;
    const d=E('details','pr2-objective-method'),body=E('div','pr2-objective-method-body');d.append(E('summary','','How the objective score is calculated'));[tally,scale].filter(Boolean).forEach(n=>body.append(n));d.append(body);const head=$('.eg3-section-head',board);if(head)head.insertAdjacentElement('afterend',d);else board.prepend(d);
  }

  function ensureEvidenceDrawerLink(){
    const drawer=$('.isr-evidence-drawer'),header=$('.isr-evidence-drawer header');if(!drawer||!header)return;let b=$('.pr2-copy-record',header);
    if(!b){b=E('button','pr2-copy-record','Copy record link');b.type='button';const close=$('button:not(.pr2-copy-record)',header);if(close)header.insertBefore(b,close);else header.append(b);b.onclick=()=>{const s=window.AtlasState?.get?.(),url=window.AtlasState?.url?.('https://ejronin.github.io/ISR/')||location.href;copyUrl(url,s?.selectedRecord?'Record link copied':'View link copied');};}
    setText(b,window.AtlasState?.get?.().selectedRecord?'Copy record link':'Copy view link');
  }

  function tuneMethodLanguage(){const panel=$('#intro');if(!panel)return;$$('.method-card h3',panel).forEach(h=>{const t=(h.textContent||'').trim();if(t==='Evidence doctrine')setText(h,'How evidence is treated');if(t==='Source doctrine')setText(h,'How sources are used');if(t==='Geographic precision')setText(h,'How precise the map is');if(t==='Damage vs operational effect')setText(h,'Damage is not the same as shutdown');});}

  function refresh(){applyPublicShell();applyFreshness();ensureOverviewIntro();tuneOverviewSynthesis();ensureTimelineReadingMode();ensureSourcesReadingMode();ensureObjectiveDisclosure();ensureEvidenceDrawerLink();tuneMethodLanguage();normalizeStatusLabels();}
  function bind(){document.addEventListener('click',e=>{const route=e.target.closest('[data-pr2-view]');if(route){window.showAtlasPanel?.(route.dataset.pr2View);return;}if(e.target.closest('.primary-nav,.secondary-nav,.analysis-nav,#timeline,#sources,#endgame,.isr-evidence-drawer'))[0,100,300].forEach(ms=>setTimeout(refresh,ms));},true);window.addEventListener('atlasstatechange',()=>setTimeout(refresh,0));window.addEventListener('atlascurrentready20260825late',()=>setTimeout(refresh,0));}
  function init(){refresh();bind();[80,220,600,1400,3000,6000].forEach(ms=>setTimeout(refresh,ms));window.ISRPublicRecordUIR2={refresh};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
