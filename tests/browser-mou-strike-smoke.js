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
    globals:{a24:!!window.ATLAS_CURRENT_UPDATE,a25:!!window.ATLAS_CURRENT_UPDATE_20260825,late:!!window.ATLAS_CURRENT_UPDATE_20260825_LATE,a26:!!window.ATLAS_CURRENT_UPDATE_20260826,recon:!!window.ATLAS_WIKI_RECON_20260826}
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
    assert.equal(counts.runtime_chronology,202,'chronology count must exclude forensic annotations');
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

    await wait(cdp,'Boolean(window.ISREndgamePublicViewR1)');await cdp.eval(`window.ISREndgamePublicViewR1.open('mou');true`);
    const mou=await cdp.eval(`document.querySelector('#endgame')?.innerText||''`);for(const s of ['DEFERRED TO FINAL NEGOTIATIONS — NOT YET WON OR LOST','PROMISED BUT NEVER IMPLEMENTED','LATER REVERSED','Where the signed deal landed','UNSCORED / NOT YET ADJUDICABLE'])assert(mou.includes(s),`MOU missing ${s}`);
    await wait(cdp,`Boolean(document.querySelector('[data-iran-messaging-r1]'))`);

    await cdp.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);
    const mobile=await cdp.eval(`(()=>{window.showAtlasPanel('snapshot');const p=[...document.querySelectorAll('#primaryNav .primary-tab')].find(b=>b.textContent.trim()==='Military Operations');p?.click();const s=[...document.querySelectorAll('#secondaryNav .secondary-tab')].find(b=>b.textContent.trim()==='Campaigns & strikes');s?.click();return {p:!!p&&p.getBoundingClientRect().height>20,s:!!s&&s.getBoundingClientRect().height>20,active:document.getElementById('strikes')?.classList.contains('active')};})()`);assert.deepEqual(mobile,{p:true,s:true,active:true});
    console.log('browser MOU/strike smoke: PASS — 100/100 strike locations physically present on active Strike layer; 81/81 reconciliation timeline links; canonical pan/popup, MOU, messaging and mobile navigation verified');
  }finally{cdp.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
