'use strict';
const assert=require('node:assert/strict');
const DEBUG=process.env.ATLAS_CDP||'http://127.0.0.1:9222';
const RECON=81,TOTAL=100;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

class CDP{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();}
  async open(){this.ws=new WebSocket(this.url);await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('CDP open timeout')),10000);this.ws.onopen=()=>{clearTimeout(t);ok();};this.ws.onerror=()=>no(Error('CDP websocket error'));});this.ws.onmessage=e=>{const m=JSON.parse(String(e.data));if(!m.id||!this.pending.has(m.id))return;const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.no(Error(m.error.message)):p.ok(m.result||{});};}
  call(method,params={}){const id=++this.id;return new Promise((ok,no)=>{this.pending.set(id,{ok,no});this.ws.send(JSON.stringify({id,method,params}));});}
  async eval(expression){const out=await this.call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(out.result?.subtype==='error')throw Error(out.result.description||'Runtime error');return out.result?.value;}
  close(){this.ws?.close();}
}
async function wait(cdp,expression,timeout=25000){const start=Date.now();while(Date.now()-start<timeout){const v=await cdp.eval(expression);if(v)return v;await sleep(200);}throw Error(`timeout: ${expression}`);}
async function diagnostics(cdp){return cdp.eval(`(async()=>{
  let reconIds=[];try{const r=await fetch('./data/wiki-map-reconciliation-20260826/strikes.json',{cache:'no-store'});reconIds=((await r.json()).strikes||[]).map(x=>x.id);}catch{}
  const temporal=window.ATLAS_TEMPORAL_INDEX||[];
  return {
    error:window.ATLAS_WIKI_RECON_ERROR_20260826||null,
    temporal:temporal.length,
    chronology:new Set(temporal.filter(x=>x?.event_id&&x.temporal_record_type!=='ANNOTATION').map(x=>x.event_id)).size,
    annotations:temporal.filter(x=>x.temporal_record_type==='ANNOTATION').length,
    strikes:window.ATLAS_DATA?.strikes?.length??null,
    reconCanonical:reconIds.filter(id=>window.getAtlasMapMarker?.(id)).length,
    reconMissing:reconIds.filter(id=>!window.getAtlasMapMarker?.(id)).slice(0,10),
    globals:{a24:!!window.ATLAS_CURRENT_UPDATE,a25:!!window.ATLAS_CURRENT_UPDATE_20260825,late:!!window.ATLAS_CURRENT_UPDATE_20260825_LATE,a26:!!window.ATLAS_CURRENT_UPDATE_20260826,a27:!!window.ATLAS_CURRENT_UPDATE_20260827,recon:!!window.ATLAS_WIKI_RECON_20260826,housekeeping:!!window.ISRPublicHousekeepingR1}
  };
})()`);}

(async()=>{
  const targets=await(await fetch(`${DEBUG}/json`)).json();
  const target=targets.find(x=>x.type==='page'&&/^http:\/\/127\.0\.0\.1:8765\//.test(x.url));
  assert(target?.webSocketDebuggerUrl,'Atlas browser target missing');
  const cdp=new CDP(target.webSocketDebuggerUrl);await cdp.open();
  try{
    await cdp.call('Runtime.enable');
    await cdp.call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    try{await wait(cdp,`window.ATLAS_WIKI_RECON_20260826?.counts?.registered_strike_markers===${RECON}||window.ATLAS_WIKI_RECON_ERROR_20260826`);}catch(e){console.error('RECON DIAGNOSTICS',JSON.stringify(await diagnostics(cdp),null,2));throw e;}
    const early=await diagnostics(cdp);if(early.error){console.error('RECON DIAGNOSTICS',JSON.stringify(early,null,2));throw Error(`reconciliation runtime error: ${early.error.message}`);}

    const counts=await cdp.eval('window.ATLAS_WIKI_RECON_20260826.counts');
    assert.equal(counts.runtime_chronology,202,'reconciliation chronology count must exclude forensic annotations');
    assert.equal(counts.registered_strike_markers,RECON,'81 reconciliation markers must register');
    assert.equal(counts.map_linked_timeline_records,RECON,'81 reconciliation timeline links required');
    assert.equal(await cdp.eval('window.ATLAS_DATA.strikes.length'),TOTAL,'live strike dataset must be 19 + 81');

    await cdp.eval(`window.showAtlasPanel('strikes');window.refreshAtlasStrikeEffects();true`);await sleep(100);
    const proof=await cdp.eval(`(()=>{const ids=(window.ATLAS_DATA.strikes||[]).map(x=>x.id);const toggle=document.querySelector('[data-layer-name="Strike effects"]');return {cards:document.querySelectorAll('#strikeList article[data-map-ref]').length,ids:ids.length,missing:ids.filter(id=>!window.getAtlasMapMarker?.(id)),pressed:toggle?.getAttribute('aria-pressed'),markers:document.querySelectorAll('.leaflet-marker-pane .atlas-marker-host').length,active:document.getElementById('strikes')?.classList.contains('active')};})()`);
    assert.equal(proof.ids,TOTAL,'100 strike records required');
    assert.equal(proof.cards,TOTAL,'100 Campaigns & Strikes cards required');
    assert.deepEqual(proof.missing,[],'every strike ID must resolve to a canonical marker');
    assert.equal(proof.pressed,'true','Strike layer must be active in Campaigns & Strikes');
    assert.equal(proof.markers,TOTAL,'all 100 strike locations must be physically present on active Leaflet Strike layer');
    assert.equal(proof.active,true,'Campaigns & Strikes panel must be active');

    const action=await cdp.eval(`(()=>{const e=window.ATLAS_WIKI_RECON_20260826.events[0];const ref=[...(e.map_refs||[]),...(e.facility_refs||[])].find(x=>window.getAtlasMapMarker(x));const m=window.getAtlasMapMarker(ref);const ok=window.pan(ref);return {ref,ok,popup:!!m?.isPopupOpen?.()};})()`);
    assert.equal(Boolean(action.ref),true,'sample reconciliation event must resolve to a map ref');
    assert.equal(action.ok,true,'canonical pan action must succeed');
    assert.equal(action.popup,true,'canonical pan action must open the marker popup');
    await wait(cdp,'window.atlasMap?.getZoom?.()>=6',3000);

    await wait(cdp,'Boolean(window.ISREndgamePublicViewR1)');
    await wait(cdp,`Boolean(window.ISRPublicHousekeepingR1&&document.documentElement.dataset.publicHousekeepingR1==='1')`);

    // Diplomacy hub must route Talks & Agreements into the actual MOU record, not a retired peer-workspace control.
    await cdp.eval(`window.showAtlasPanel('diplomacy-hub');true`);await sleep(80);
    assert.equal(await cdp.eval(`Boolean(document.getElementById('openAgreementWorkspace'))`),true,'Talks & agreements action must exist');
    await cdp.eval(`document.getElementById('openAgreementWorkspace').click();true`);
    await wait(cdp,`document.getElementById('endgame')?.classList.contains('active')&&document.querySelector('[data-eg3-tab="mou"]')?.classList.contains('active')&&!document.querySelector('[data-eg3-panel="mou"]')?.hidden`);

    const mouPunch=await cdp.eval(`(()=>{const panel=document.querySelector('[data-eg3-panel="mou"]');const status=panel?.querySelector('[data-ph1-mou-status]');const jul7=[...panel.querySelectorAll('.eg3-timeline-row')].find(r=>/Jul\\s*7/i.test(r.querySelector('.eg3-date')?.textContent||''));const p5=panel?.querySelector('[data-eg4-section="p5"]');const actorTitles=[...panel.querySelectorAll('.ph1-mou-actor h4')].map(x=>x.textContent.trim());return {statusText:status?.innerText||'',jul7Title:jul7?.querySelector('h4')?.textContent||'',attribution:jul7?.querySelector('.ph1-attribution')?.innerText||'',redundant:p5?.querySelectorAll('.eg3-four-tests .eg3-badge.eg3-assessment').length??-1,actors:actorTitles};})()`);
    assert(mouPunch.statusText.includes('mutual agreement'),'MOU status must explain mutual-agreement extension requirement');
    assert(mouPunch.statusText.includes('cannot revive them unilaterally'),'MOU status must explain unilateral invocation cannot revive the deal');
    assert(mouPunch.jul7Title.includes('U.S. and Qatar attribute'),'Jul 7 event must identify the public attribution to Iran');
    assert(mouPunch.attribution.includes('Tehran disputed'),'Jul 7 event must preserve Iran\'s attribution dispute');
    assert.equal(mouPunch.redundant,0,'redundant Paragraph 5 category pills must be removed');
    assert.deepEqual(mouPunch.actors,['WASHINGTON','IRAN','GCC / MEDIATORS','WHAT CHANGED SINCE JUNE'],'MOU afterlife must be explained by actor/current-condition lane');

    const mou=await cdp.eval(`document.querySelector('#endgame')?.innerText||''`);for(const s of ['DEFERRED TO FINAL NEGOTIATIONS — NOT YET WON OR LOST','PROMISED BUT NEVER IMPLEMENTED','LATER REVERSED','Where the signed deal landed','UNSCORED / NOT YET ADJUDICABLE'])assert(mou.includes(s),`MOU missing ${s}`);

    // Strategic current-state hierarchy and paths → next-moves causal grouping.
    await cdp.eval(`window.ISREndgamePublicViewR1.open('strategic');true`);
    await wait(cdp,`Boolean(document.querySelector('[data-eg3-panel="strategic"] .ph1-status-first')&&document.querySelector('[data-eg3-panel="strategic"] .ph1-path-connector'))`);
    const order=await cdp.eval(`(()=>{const p=document.querySelector('[data-eg3-panel="strategic"]');const sections=[...p.children].filter(n=>n.matches?.('section.eg3-section'));const paths=p.querySelector('.ph1-path-source'),link=p.querySelector('.ph1-path-connector'),next=p.querySelector('.ph1-path-derived');return {first:sections[0]?.dataset.eg4Section||'',linked:paths?.nextElementSibling===link&&link?.nextElementSibling===next,connector:link?.innerText||''};})()`);
    assert.equal(order.first,'status','Where things stand now must be the first substantive strategic section');
    assert.equal(order.linked,true,'Iran paths must be directly linked to derived next moves');
    assert(order.connector.includes('drives'),'path linkage must visibly explain derivation');

    // CAUSE → EFFECT and OBJECTIVE AUDIT must be true mutually exclusive lenses.
    await cdp.eval(`document.querySelector('[data-eg3-lens="causal"]').click();true`);await sleep(80);
    let lens=await cdp.eval(`(()=>{const c=document.querySelector('[data-eg3-lens-panel="causal"]'),a=document.querySelector('[data-eg3-lens-panel="audit"]');return {causalHidden:c.hidden,auditHidden:a.hidden,causalPressed:document.querySelector('[data-eg3-lens="causal"]')?.getAttribute('aria-pressed')};})()`);
    assert.deepEqual(lens,{causalHidden:false,auditHidden:true,causalPressed:'true'},'causal lens must fully replace audit lens');
    await cdp.eval(`document.querySelector('[data-eg3-lens="audit"]').click();true`);await sleep(80);
    lens=await cdp.eval(`(()=>{const c=document.querySelector('[data-eg3-lens-panel="causal"]'),a=document.querySelector('[data-eg3-lens-panel="audit"]');return {causalHidden:c.hidden,auditHidden:a.hidden,auditPressed:document.querySelector('[data-eg3-lens="audit"]')?.getAttribute('aria-pressed')};})()`);
    assert.deepEqual(lens,{causalHidden:true,auditHidden:false,auditPressed:'true'},'audit lens must fully replace causal lens');

    // Every selectable causal-map node must drill into evidence and focus/zoom the selected branch.
    await cdp.eval(`document.querySelector('[data-eg3-lens="causal"]').click();true`);
    await wait(cdp,`Boolean(document.querySelector('#eg3CausalHost g.node[role="button"]'))`);
    const causalFocus=await cdp.eval(`(()=>{const host=document.getElementById('eg3CausalHost'),svg=host.querySelector('svg'),node=host.querySelector('g.node[role="button"]');const before=svg.dataset.ph1OriginalViewBox||svg.getAttribute('viewBox');node.click();return {before};})()`);
    await wait(cdp,`Boolean(document.querySelector('.ph1-graph-focus[data-for="eg3CausalHost"]')&&document.querySelector('#eg3CausalHost .ph1-node-focus'))`);
    const causalAfter=await cdp.eval(`(()=>{const host=document.getElementById('eg3CausalHost'),svg=host.querySelector('svg'),bar=document.querySelector('.ph1-graph-focus[data-for="eg3CausalHost"]'),drawer=document.getElementById('eg3EvidenceDrawer');return {after:svg.getAttribute('viewBox'),buttons:[...bar.querySelectorAll('button')].map(x=>x.textContent.trim()),drawer:drawer?.innerText||'',sources:drawer?.querySelectorAll('.eg3-source-chip').length||0};})()`);
    assert.notEqual(causalAfter.after,causalFocus.before,'causal node selection must zoom/focus the chart');
    assert.deepEqual(causalAfter.buttons,['Open associated information','Show full chart'],'causal focus must expose associated-information and reset actions');
    assert(causalAfter.drawer.length>20,'causal selection must display associated evidence detail');
    assert(causalAfter.sources>0,'causal selected evidence must expose source links');
    await cdp.eval(`document.querySelector('.ph1-graph-focus[data-for="eg3CausalHost"] button:last-child').click();true`);await sleep(80);
    assert.equal(await cdp.eval(`document.querySelector('#eg3CausalHost svg')?.getAttribute('viewBox')`),causalFocus.before,'causal full-chart action must restore the original view');

    // Objective-audit selectable nodes must likewise select their ledger/data tree and focus the chart.
    await cdp.eval(`document.querySelector('[data-eg3-lens="audit"]').click();true`);
    await wait(cdp,`Boolean(document.querySelector('#egMermaidHost g.node[role="button"]'))`);
    const auditFocus=await cdp.eval(`(()=>{const host=document.getElementById('egMermaidHost'),svg=host.querySelector('svg'),node=host.querySelector('g.node[role="button"]');const before=svg.dataset.ph1OriginalViewBox||svg.getAttribute('viewBox');node.click();return {before};})()`);
    await wait(cdp,`Boolean(document.querySelector('.ph1-graph-focus[data-for="egMermaidHost"]')&&document.querySelector('#egMermaidHost .ph1-node-focus')&&document.querySelector('#endgame .eg-ledger.selected,#endgame .eg-ledger[aria-pressed="true"]'))`);
    const auditAfter=await cdp.eval(`(()=>{const host=document.getElementById('egMermaidHost'),bar=document.querySelector('.ph1-graph-focus[data-for="egMermaidHost"]'),selected=document.querySelector('#endgame .eg-ledger.selected,#endgame .eg-ledger[aria-pressed="true"]');return {after:host.querySelector('svg')?.getAttribute('viewBox'),buttons:[...bar.querySelectorAll('button')].map(x=>x.textContent.trim()),selected:!!selected};})()`);
    assert.notEqual(auditAfter.after,auditFocus.before,'objective-audit node selection must zoom/focus the chart');
    assert.equal(auditAfter.selected,true,'objective-audit node must select its associated ledger/data tree');
    assert.deepEqual(auditAfter.buttons,['Open associated information','Show full chart'],'audit focus must expose associated-information and reset actions');
    await cdp.eval(`document.querySelector('.ph1-graph-focus[data-for="egMermaidHost"] button:last-child').click();true`);await sleep(80);
    assert.equal(await cdp.eval(`document.querySelector('#egMermaidHost svg')?.getAttribute('viewBox')`),auditFocus.before,'audit full-chart action must restore the original view');

    await wait(cdp,`Boolean(document.querySelector('[data-iran-messaging-shifts-20260827]')||document.querySelector('[data-iran-messaging-r1]'))`);

    await cdp.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);
    const mobile=await cdp.eval(`(()=>{window.showAtlasPanel('snapshot');const p=[...document.querySelectorAll('#primaryNav .primary-tab')].find(b=>b.textContent.trim()==='Military Operations');p?.click();const s=[...document.querySelectorAll('#secondaryNav .secondary-tab')].find(b=>b.textContent.trim()==='Campaigns & strikes');s?.click();return {p:!!p&&p.getBoundingClientRect().height>20,s:!!s&&s.getBoundingClientRect().height>20,active:document.getElementById('strikes')?.classList.contains('active')};})()`);assert.deepEqual(mobile,{p:true,s:true,active:true});
    console.log('browser MOU/strike/housekeeping smoke: PASS — 100/100 strike locations; Talks routing; strict Endgame lens swap; strategic hierarchy; MOU status/attribution; Mermaid evidence drill-down/focus; mobile navigation verified');
  }finally{cdp.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
