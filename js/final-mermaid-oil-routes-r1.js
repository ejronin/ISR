'use strict';
(function ISRFinalMermaidOilRoutesR1(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const MIN_SCALE=.04, MAX_SCALE=2.5, PAD=18;
  const graphState=new WeakMap();
  const ROUTES='./data/oil-routes-r1.json?v=20260825-r1';
  let supplementalLayer=null, routeModel=null, mapWrapped=false, lastView='snapshot';

  function stateFor(host){let s=graphState.get(host);if(!s){s={scale:1,x:0,y:0};graphState.set(host,s);}return s;}
  function canvasFor(host){return host?.querySelector('.eg-graph-canvas,.eg3-causal-canvas');}
  function svgFor(host){return canvasFor(host)?.querySelector('svg');}
  function svgSize(svg){
    if(!svg)return null;
    const vb=svg.viewBox?.baseVal;
    if(vb&&vb.width>0&&vb.height>0)return{width:vb.width,height:vb.height};
    try{const b=svg.getBBox();if(b.width>0&&b.height>0)return{width:b.width,height:b.height};}catch{}
    const r=svg.getBoundingClientRect();return r.width&&r.height?{width:r.width,height:r.height}:null;
  }
  function apply(host){const c=canvasFor(host),s=stateFor(host);if(!c)return;c.style.transformOrigin='0 0';c.style.transform=`translate(${s.x}px,${s.y}px) scale(${s.scale})`;host.dataset.mermaidScale=s.scale.toFixed(4);}
  function fit(host){
    const svg=svgFor(host),size=svgSize(svg);if(!svg||!size)return;
    const availW=Math.max(80,host.clientWidth-PAD*2),availH=Math.max(80,host.clientHeight-PAD*2);
    const scale=Math.max(MIN_SCALE,Math.min(1,availW/size.width,availH/size.height));
    const s=stateFor(host);s.scale=scale;s.x=Math.max(0,(availW-size.width*scale)/2)+PAD;s.y=Math.max(0,(availH-size.height*scale)/2)+PAD;apply(host);host.scrollTo?.({left:0,top:0,behavior:'auto'});
  }
  function zoom(host,delta){const s=stateFor(host);s.scale=Math.max(MIN_SCALE,Math.min(MAX_SCALE,s.scale+delta));apply(host);}
  function pan(host){
    if(host.dataset.trueFitPan==='1')return;host.dataset.trueFitPan='1';let on=false,sx=0,sy=0,ox=0,oy=0;
    host.onpointerdown=e=>{if(e.target.closest('button,a,g.node'))return;const s=stateFor(host);on=true;sx=e.clientX;sy=e.clientY;ox=s.x;oy=s.y;host.setPointerCapture?.(e.pointerId);host.classList.add('dragging');};
    host.onpointermove=e=>{if(!on)return;const s=stateFor(host);s.x=ox+e.clientX-sx;s.y=oy+e.clientY-sy;apply(host);};
    host.onpointerup=host.onpointercancel=e=>{on=false;host.classList.remove('dragging');try{host.releasePointerCapture?.(e.pointerId);}catch{}};
  }
  function button(parent,text,fn){let b=[...parent.querySelectorAll('button')].find(x=>(x.textContent||'').trim()===text);if(!b){b=document.createElement('button');b.type='button';b.className='eg-small-btn eg3-graph-btn';b.textContent=text;parent.append(b);}b.onclick=e=>{e.preventDefault();fn();};return b;}
  function setupAudit(){
    const host=$('#egMermaidHost'),controls=$('.eg-graph-controls');if(!host||!controls||!svgFor(host))return;
    button(controls,'FIT',()=>fit(host));button(controls,'−',()=>zoom(host,-.10));button(controls,'+',()=>zoom(host,.10));pan(host);
    if(host.dataset.trueFitReady!=='1'){host.dataset.trueFitReady='1';requestAnimationFrame(()=>fit(host));}
  }
  function setupCausal(){
    const host=$('#eg3CausalHost');if(!host||!svgFor(host))return;
    let controls=$('.eg3-causal-controls');if(!controls){controls=document.createElement('div');controls.className='eg3-causal-controls';controls.setAttribute('aria-label','Causal map zoom controls');host.before(controls);}
    button(controls,'FIT',()=>fit(host));button(controls,'−',()=>zoom(host,-.10));button(controls,'+',()=>zoom(host,.10));pan(host);
    if(host.dataset.trueFitReady!=='1'){host.dataset.trueFitReady='1';requestAnimationFrame(()=>fit(host));}
  }
  function watchMermaid(){
    const run=()=>{setupAudit();setupCausal();};run();
    const mo=new MutationObserver(()=>queueMicrotask(run));mo.observe(document.documentElement,{childList:true,subtree:true});
    addEventListener('resize',()=>{const a=$('#egMermaidHost'),c=$('#eg3CausalHost');if(a?.dataset.trueFitReady==='1')fit(a);if(c?.dataset.trueFitReady==='1')fit(c);},{passive:true});
  }

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function sourceLinks(sources){return(sources||[]).map(([label,url])=>{try{const u=new URL(url);if(u.protocol!=='https:')return'';return`<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;}catch{return'';}}).join(' ');}
  function routeColor(mode){return mode==='rail'?'#c084fc':mode==='pipeline'?'#ffb84d':'#54d9e8';}
  function routePopup(r){return`<div class="atlas-popup oil-route-popup"><h3>${esc(r.name)}</h3><div class="route-label">SCHEMATIC · ${esc(r.status)}</div><p>${esc(r.note)}</p><div class="sources">${sourceLinks(r.sources)}</div></div>`;}
  function buildSupplementalLayer(){
    if(supplementalLayer||!window.L||!window.atlasMap||!routeModel)return;
    supplementalLayer=L.featureGroup();supplementalLayer._isrOilRoutesR1=true;
    (routeModel.routes||[]).forEach(r=>{const color=routeColor(r.mode);L.polyline(r.coords,{color,weight:r.mode==='pipeline'?5:4,opacity:.88,dashArray:null}).addTo(supplementalLayer).bindPopup(routePopup(r),{maxWidth:420});(r.nodes||[]).forEach(n=>L.circleMarker([n[1],n[2]],{radius:5,color:'#07111f',weight:2,fillColor:color,fillOpacity:.96}).addTo(supplementalLayer).bindPopup(`<div class="atlas-popup"><h3>${esc(n[0])}</h3><p>${esc(r.name)}</p><small>Schematic corridor node; not a live position or exact alignment.</small><div class="sources">${sourceLinks(r.sources)}</div></div>`,{maxWidth:380}));});
    window.ISROilRoutesR1={layer:supplementalLayer,model:routeModel,sync:syncRoutes};syncRoutes();
  }
  function activeRouteOverride(){return window.AtlasState?.get?.().manualLayerOverrides?.['Trade / logistics routes'];}
  function shouldShow(view=lastView){const o=activeRouteOverride();if(o===true)return true;if(o===false)return false;return view==='arctic';}
  function syncRoutes(view=window.atlasActiveView||window.AtlasState?.get?.().activeView||lastView){lastView=view||lastView;if(!supplementalLayer||!window.atlasMap)return;shouldShow(lastView)?supplementalLayer.addTo(window.atlasMap):window.atlasMap.removeLayer(supplementalLayer);relabelRoutes();}
  function relabelRoutes(){
    const layerBtn=$('[data-layer-name="Trade / logistics routes"]');if(layerBtn)layerBtn.textContent='Oil Routes — SCHEMATIC';
    $$('.secondary-tab,.primary-tab,.tab,button').forEach(b=>{const t=(b.textContent||'').trim();if(/^China\s*\/\s*Arctic routes$/i.test(t)||/^China Arctic routes$/i.test(t)||/^Arctic routes$/i.test(t))b.textContent='Oil Routes';});
  }
  async function installRoutes(){
    try{const r=await fetch(ROUTES,{cache:'no-store'});if(!r.ok)throw Error(`oil routes ${r.status}`);routeModel=await r.json();}catch(e){console.error('Oil Routes R1',e);return;}
    let tries=0;const timer=setInterval(()=>{tries++;if(window.L&&window.atlasMap){clearInterval(timer);buildSupplementalLayer();wrapMap();}else if(tries>120)clearInterval(timer);},50);
  }
  function wrapMap(){
    if(mapWrapped)return;mapWrapped=true;const original=window.configureAtlasMap;
    if(typeof original==='function'){const wrapped=function(viewId){const out=original.apply(this,arguments);lastView=viewId||lastView;queueMicrotask(()=>syncRoutes(lastView));return out;};wrapped._isrOilRoutesR1=true;window.configureAtlasMap=wrapped;}
    const b=$('[data-layer-name="Trade / logistics routes"]');b?.addEventListener('click',()=>setTimeout(()=>syncRoutes(),0));
    window.AtlasState?.subscribe?.(s=>{if(s?.activeView)lastView=s.activeView;syncRoutes(lastView);});relabelRoutes();syncRoutes();
    const mo=new MutationObserver(relabelRoutes);mo.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{watchMermaid();installRoutes();},{once:true});else{watchMermaid();installRoutes();}
  window.ISRTrueMermaidFitR1={fit:sel=>{const h=typeof sel==='string'?$(sel):sel;if(h)fit(h);},zoom:(sel,d)=>{const h=typeof sel==='string'?$(sel):sel;if(h)zoom(h,d);},minScale:MIN_SCALE};
}());
