'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const BASE=process.env.MARKET_CDP || 'http://127.0.0.1:9223';
const PAGE=process.env.MARKET_URL || 'http://127.0.0.1:4173/prototypes/visualization-platform/market-preview.html';
const OUTPUT=process.env.MARKET_SHOTS || path.join(__dirname,'market-qa-screens');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function target(){
 for(let i=0;i<80;i++){
  try{
   const res=await fetch(BASE+'/json/list');
   if(res.ok){
    const pages=await res.json();
    const page=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl);
    if(page)return page.webSocketDebuggerUrl;
   }
  }catch(_){}
  await wait(250);
 }
 throw Error('Chromium CDP page not available');
}
class CDP{
 constructor(url){this.url=url;this.seq=0;this.pending=new Map()}
 async open(){
  this.ws=new WebSocket(this.url);
  await new Promise((resolve,reject)=>{
   this.ws.onopen=resolve;this.ws.onerror=reject;
  });
  this.ws.onmessage=event=>{
   const m=JSON.parse(String(event.data));
   if(!this.pending.has(m.id))return;
   const p=this.pending.get(m.id);this.pending.delete(m.id);
   m.error?p.reject(new Error(m.error.message)):p.resolve(m.result||{});
  };
 }
 call(method,params={}){
  return new Promise((resolve,reject)=>{
   const id=++this.seq;this.pending.set(id,{resolve,reject});
   this.ws.send(JSON.stringify({id,method,params}));
  });
 }
 async eval(expr){
  const r=await this.call('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(r.exceptionDetails)throw Error(r.exceptionDetails.text||'Runtime exception');
  return r.result?.value;
 }
 close(){this.ws?.close()}
}
(async()=>{
 const cdp=new CDP(await target());await cdp.open();
 try{
  await cdp.call('Page.enable');await cdp.call('Runtime.enable');
  fs.mkdirSync(OUTPUT,{recursive:true});
  for(const width of [1440,390,320]){
   await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:920,deviceScaleFactor:1,mobile:false});
   await cdp.call('Page.navigate',{url:PAGE});
   let snapshot=null;
   for(let i=0;i<120;i++){
    try{
     snapshot=await cdp.eval('(()=>{const s=document.querySelector("#market-status")?.textContent||"";return {status:s, count:document.querySelectorAll("#market-observations-table tr").length, svg:document.querySelectorAll("#market-observations-chart svg").length, markers:document.querySelectorAll(".market-event-button").length, actionsOpen:document.querySelector("#market-actions-disclosure")?.open, cards:document.querySelectorAll(".market-gdp-mobile-card").length, cardsDisplay:getComputedStyle(document.querySelector(".market-gdp-mobile-cards")).display, tableDisplay:getComputedStyle(document.querySelector("[data-market-forecast-table]")).display, forecast:document.querySelector("[data-market-projection]")?.textContent||"", overflow:document.documentElement.scrollWidth-innerWidth};})()');
     if(snapshot?.status?.includes('47 EIA observed'))break;
    }catch(_){}
    await wait(250);
   }
   assert(snapshot&&snapshot.count===47,'47 actual EIA observations not visible at '+width+'px');
   assert(snapshot.svg>0,'ECharts SVG line missing at '+width+'px');
   assert(snapshot.markers>=10,'sanctions dates not selectable at '+width+'px');
   assert(snapshot.actionsOpen === (width>=700),'sanctions calendar must default compact on mobile and open on desktop');
   assert(snapshot.cards===7,'all seven GDP forecast comparison summaries must be available');
   assert(width<600 ? (snapshot.cardsDisplay!=='none'&&snapshot.tableDisplay==='none') : (snapshot.cardsDisplay==='none'&&snapshot.tableDisplay!=='none'),'GDP comparison must use legible compact cards only on mobile');
   assert(snapshot.forecast.includes('$105/b')&&snapshot.forecast.includes('not a daily price path'),
    'quarter-average forecast caveat missing at '+width+'px');
   assert(snapshot.overflow<=2,'horizontal page overflow at '+width+'px: '+snapshot.overflow);
   await cdp.eval('(()=>{const b=document.querySelector(".market-event-button");b?.click();return true;})()');
   const response=await cdp.eval('(()=>({selected:document.querySelector(".market-event-button")?.getAttribute("aria-pressed"),details:document.querySelector("#market-selected-event")?.textContent||""}))()');
   assert(response.selected==='true' && response.details.includes('Accepted target:'),'sanctions marker interaction failed at '+width+'px');
   await cdp.eval('(()=>{const n=document.querySelector(".market-event-button");n?.setAttribute("aria-pressed","false");return true;})()');
   const metrics=await cdp.call('Page.getLayoutMetrics');
   const size=metrics.cssContentSize||metrics.contentSize;
   const result=await cdp.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true,
     clip:{x:0,y:0,width:width,height:Math.ceil(Math.min(size.height,7000)),scale:1}});
   const file=path.join(OUTPUT,'eia-brent-forecast-'+width+'px.png');
   fs.writeFileSync(file,Buffer.from(result.data,'base64'));
   process.stdout.write(JSON.stringify({width,...snapshot,screen:file})+'\n');
  }
 }finally{cdp.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
