'use strict';
const assert=require('node:assert/strict');
const DEBUG=process.env.ATLAS_CDP||'http://127.0.0.1:9222';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
class CDP{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();}
  async open(){this.ws=new WebSocket(this.url);await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('CDP open timeout')),10000);this.ws.onopen=()=>{clearTimeout(t);ok();};this.ws.onerror=()=>no(Error('CDP websocket error'));});this.ws.onmessage=e=>{const m=JSON.parse(String(e.data));if(!m.id||!this.pending.has(m.id))return;const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.no(Error(m.error.message)):p.ok(m.result||{});};}
  call(method,params={}){const id=++this.id;return new Promise((ok,no)=>{this.pending.set(id,{ok,no});this.ws.send(JSON.stringify({id,method,params}));});}
  async eval(expression){const out=await this.call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(out.result?.subtype==='error')throw Error(out.result.description||'Runtime error');return out.result?.value;}
  close(){this.ws?.close();}
}
async function wait(cdp,expression,timeout=25000){const start=Date.now();while(Date.now()-start<timeout){const v=await cdp.eval(expression);if(v)return v;await sleep(200);}throw Error(`timeout: ${expression}`);}
(async()=>{
  const targets=await(await fetch(`${DEBUG}/json`)).json();
  const target=targets.find(x=>x.type==='page'&&/^http:\/\/127\.0\.0\.1:8765\//.test(x.url));
  assert(target?.webSocketDebuggerUrl,'Atlas browser target missing');
  const cdp=new CDP(target.webSocketDebuggerUrl);await cdp.open();
  try{
    await cdp.call('Runtime.enable');
    await wait(cdp,'Boolean(window.ATLAS_CURRENT_UPDATE_20260827)||Boolean(window.ATLAS_CURRENT_UPDATE_ERROR_20260827)');
    const err=await cdp.eval('window.ATLAS_CURRENT_UPDATE_ERROR_20260827||null');if(err)throw Error(`Aug27 runtime error: ${err.message}`);
    assert.equal(await cdp.eval(`new Set((window.ATLAS_TEMPORAL_INDEX||[]).filter(x=>x?.event_id&&x.temporal_record_type!=='ANNOTATION').map(x=>x.event_id)).size`),205,'Aug27 chronology must be 205');
    assert.equal(await cdp.eval(`window.ATLAS_CURRENT_UPDATE_20260827.events.length`),3,'Aug27 overlay must expose 3 events');
    await wait(cdp,`Boolean(document.querySelector('[data-iran-messaging-shifts-20260827]'))`);
    const messaging=await cdp.eval(`(()=>{const root=document.querySelector('[data-iran-messaging-shifts-20260827]');return {cards:root?.querySelectorAll('[data-messaging-shift-id]').length||0,flags:root?.querySelectorAll('img.ims-flag').length||0,text:root?.innerText||''};})()`);
    assert.equal(messaging.cards,3,'three messaging-shift series cards required');
    assert(messaging.flags>=10,'actor flags must render across the shift series');
    for(const token of ['IRAN SAID','WHAT CLOSED OR CHANGED THE LANE','OBSERVED REALITY','IRAN SHIFTED TO','WALK-BACK','LANE SHIFT','POSSIBLE COMPENSATING HARDENING'])assert(messaging.text.includes(token),`messaging UI missing ${token}`);
    const state=await cdp.eval(`window.AtlasState?.get?.()||{}`);
    assert.equal(state.timeCutoff,'2026-08-27','fresh session timeline cutoff must advance to Aug27');
    const freshness=await cdp.eval(`window.AtlasPresentation?.freshness?.(window)||{}`);
    assert.equal(freshness.chronologyCount,205,'freshness count must remain 205 after public UI refresh');
    assert(String(freshness.currentOsintDisplay||'').includes('Aug. 27'),'freshness cutoff must show Aug27');
    console.log('browser Aug27 messaging/timeline smoke: PASS — 205 chronology records, 3 shift-series cards, actor flags, and Aug27 freshness verified');
  }finally{cdp.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
