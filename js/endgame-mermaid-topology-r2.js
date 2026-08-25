'use strict';
(function EndgameMermaidTopologyR2(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const J=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}:${r.status}`);return r.json()};
const mlab=v=>String(v??'').replace(/[\r\n\t]+/g,' ').replace(/["`<>#{};]/g,'').replace(/\s+/g,' ').trim().slice(0,78);
const nid=(...x)=>x.join('_').replace(/[^A-Za-z0-9_]/g,'_');
let model=null,seq=0,showAll=true,pending=false,obs=null;

const state=s=>model?.terminal_state_labels?.[s]||s||'UNRESOLVED STATE';
const outcomeClass=s=>s==='PROCEEDS_UNDER_IRAN_DEMAND'?'good':s==='CUT_OFF_DENIED'?'bad':s==='WALKED_BACK_DILUTED'?'amber':'open';
const stageClass=k=>k==='ORIGINAL_CONDITION'?'original':/^MOU_/.test(k)?(k==='MOU_STATUS'?'expired':'mou'):/OBSERVABLE|CURRENT_POSITION/.test(k)?'observed':/LATER_/.test(k)?'response':'stage';
const edgeLabel=k=>({MOU_RELATIONSHIP:'paper term',MOU_IMPLEMENTATION:'implementation',MOU_STATUS:'instrument status',LATER_IRANIAN_POSITION:'later Iran',LATER_COUNTERPARTY_POSITION:'counterparty',OBSERVABLE_IMPLEMENTATION:'observable test',CURRENT_POSITION:'current test'}[k]||'evidence');
const shortStage=(c,s)=>{
 let x=String(s?.label||'');
 x=x.replace(/^Original (?:demand|red line|bundled demand):\s*/i,'').replace(/^June MoU\s*/i,'').replace(/^Later Iranian evidence:\s*/i,'').trim();
 if(s?.kind==='ORIGINAL_CONDITION')x=c.short_label;
 return mlab(x);
};
const blockShape=(id,label,kind)=>{
 const q=mlab(label);
 if(kind==='ORIGINAL_CONDITION')return `${id}(["${q}"])`;
 if(/OBSERVABLE|CURRENT_POSITION/.test(kind))return `${id}("${q}")`;
 return `${id}["${q}"]`;
};

function build(modelIn){
 model=modelIn;
 const maxSteps=Math.max(...model.claims.map(c=>(c.path||[]).length));
 const cols=maxSteps+2,decisionCol=maxSteps,outcomeCol=maxSteps+1;
 const L=['block-beta',`columns ${cols}`],M=new Map(),classIds={header:[],original:[],mou:[],expired:[],response:[],observed:[],stage:[],junction:[],good:[],bad:[],open:[],amber:[]},edges=[];
 const headers=[];
 for(let i=0;i<cols;i++){
   const id=nid('r2','hdr',i),label=i===0?'ORIGINAL CONDITION':i<maxSteps?`EVIDENCE STEP ${i}`:i===decisionCol?'BUNDLED-CLAIM TEST':'CURRENT DISPOSITION';
   headers.push(`${id}["${label}"]`);classIds.header.push(id);
 }
 L.push(...headers);

 model.claims.forEach((c,row)=>{
   const real=[];
   for(let i=0;i<maxSteps;i++){
     const st=(c.path||[])[i];
     if(st){
       const id=nid('r2',c.id,st.id),cls=stageClass(st.kind);
       L.push(blockShape(id,shortStage(c,st),st.kind));classIds[cls].push(id);real.push({id,stage:st});M.set(id,{claim:c.id,stage:st,row,col:i});
     }else L.push('space');
   }
   for(let i=1;i<real.length;i++)edges.push(`${real[i-1].id}-- "${edgeLabel(real[i].stage.kind)}" -->${real[i].id}`);
   const last=real.at(-1)?.id;
   if(c.dimensions?.length){
     const split=nid('r2',c.id,'dimensions');L.push(`${split}(("THREE SEPARATE HORMUZ TESTS"))`);classIds.junction.push(split);M.set(split,{claim:c.id,row,col:decisionCol});if(last)edges.push(`${last}-- "separate tests" -->${split}`);
     const group=nid('r2',c.id,'outcomes');L.push(`block:${group}`,'columns 1');
     c.dimensions.forEach(d=>{const id=nid('r2',c.id,'dim',d.id);L.push(`${id}{{"${mlab(d.label)} · ${mlab(state(d.state))}"}}`);classIds[outcomeClass(d.state)].push(id);M.set(id,{claim:c.id,dim:d,row,col:outcomeCol});edges.push(`${split} --> ${id}`)});
     L.push('end');
   }else{
     L.push('space');
     const id=nid('r2',c.id,'terminal'),cls=outcomeClass(c.current_disposition.state);L.push(`${id}{{"${mlab(state(c.current_disposition.state))}"}}`);classIds[cls].push(id);M.set(id,{claim:c.id,terminal:true,row,col:outcomeCol});if(last)edges.push(`${last} --> ${id}`);
   }
 });

 L.push(...edges,
  'classDef header fill:#07111c,stroke:#304b65,color:#b9cee2,stroke-width:1px;',
  'classDef original fill:#3b2f18,stroke:#e7b85a,color:#fff7e4,stroke-width:2px;',
  'classDef mou fill:#231a35,stroke:#c29cff,color:#f4ebff,stroke-width:2px;',
  'classDef expired fill:#3a1c28,stroke:#d67b8a,color:#ffe8ec,stroke-width:2px;',
  'classDef response fill:#0d2238,stroke:#6f9dcc,color:#edf6ff,stroke-width:1.5px;',
  'classDef observed fill:#0b2a33,stroke:#63cfe6,color:#e9fbff,stroke-width:1.7px;',
  'classDef stage fill:#102238,stroke:#527aa1,color:#eaf2ff,stroke-width:1.4px;',
  'classDef junction fill:#172538,stroke:#8ca4bc,color:#edf5ff,stroke-width:2px;',
  'classDef good fill:#102b21,stroke:#68d99c,color:#e8fff1,stroke-width:2.5px;',
  'classDef bad fill:#351a21,stroke:#e46f73,color:#fff0f2,stroke-width:2.5px;',
  'classDef open fill:#243247,stroke:#90a9c4,color:#f0f6ff,stroke-width:2.5px;',
  'classDef amber fill:#3d3216,stroke:#e7b85a,color:#fff4d8,stroke-width:2.5px;'
 );
 Object.entries(classIds).forEach(([cls,ids])=>{if(ids.length)L.push(`class ${ids.join(',')} ${cls}`)});
 return {definition:L.join('\n'),nodeMeta:M,cols,maxSteps};
}

function graphItem(svg,id){
 const all=$$('[id]',svg),raw=all.find(n=>n.id===id)||all.find(n=>n.id.includes(id));if(!raw)return null;
 return raw.matches('g')?raw:raw.closest('g')||raw;
}
function selectedClaim(){return $('#endgame .eg-ledger.selected')?.dataset.claimId||model?.claims?.[0]?.id}
function installKey(){
 const panel=$('#endgame .eg-graph-panel');if(!panel)return;
 const title=$('.eg-inline-head h3',panel);if(title)title.textContent='Strategic adjudication matrix · read left → right';
 if($('.eg-r2-map-note',panel))return;
 const note=document.createElement('div');note.className='eg-r2-map-note';
 note.textContent='Each row is one original Iranian victory condition. Columns preserve the evidence sequence instead of allowing automatic graph layout to rearrange it. Gold = original condition · purple = MoU/paper term · blue/cyan = later evidence · terminal color = current disposition.';
 $('.eg-inline-head',panel)?.after(note);
}
function centerSelected(host,svg,claimId){
 if(showAll)return;
 requestAnimationFrame(()=>{
   const active=$$(`[data-claim-id="${CSS.escape(claimId)}"]`,svg);if(!active.length)return;
   const rects=active.map(n=>n.getBoundingClientRect()).filter(b=>b.width&&b.height);if(!rects.length)return;
   const hostRect=host.getBoundingClientRect(),cy=(Math.min(...rects.map(b=>b.top))+Math.max(...rects.map(b=>b.bottom)))/2-hostRect.top+host.scrollTop;
   host.scrollTop=Math.max(0,cy-host.clientHeight/2);
 });
}

async function render(){
 const host=$('#egMermaidHost');if(!host||!model||!window.mermaid)return;if(host.dataset.topologyR2==='rendering')return;
 host.dataset.topologyR2='rendering';const graph=build(model),claimId=selectedClaim();
 try{
   window.mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'dark',htmlLabels:false,block:{padding:8}});
   const r=await window.mermaid.render(`isrEndgameTopologyR2_${++seq}`,graph.definition);if(!document.contains(host))return;
   host.replaceChildren();const canvas=document.createElement('div');canvas.className='eg-graph-canvas eg-r2-canvas';canvas.innerHTML=r.svg;host.append(canvas);r.bindFunctions?.(canvas);
   const svg=$('svg',canvas);if(!svg)throw Error('no svg');svg.removeAttribute('style');svg.setAttribute('role','img');svg.setAttribute('aria-labelledby','egR2GraphTitle egR2GraphDesc');
   const ns='http://www.w3.org/2000/svg',title=document.createElementNS(ns,'title'),desc=document.createElementNS(ns,'desc');title.id='egR2GraphTitle';title.textContent='Strategic adjudication matrix of original Iranian victory conditions';desc.id='egR2GraphDesc';desc.textContent='Eight fixed claim rows read left to right across evidence-step columns to current disposition. Hormuz branches in its terminal cell into separate legal, operational, and fee tests.';svg.prepend(desc);svg.prepend(title);
   graph.nodeMeta.forEach((meta,id)=>{const n=graphItem(svg,id);if(!n)return;n.dataset.claimId=meta.claim;n.dataset.stageKind=meta.stage?.kind||meta.dim?.id||'terminal';n.classList.toggle('eg-r2-node-dim',!showAll&&meta.claim!==claimId);n.classList.toggle('eg-r2-node-active',!showAll&&meta.claim===claimId);n.tabIndex=0;n.setAttribute('role','button');n.setAttribute('aria-label',`${model.claims.find(x=>x.id===meta.claim)?.short_label}: ${meta.stage?.label||meta.dim?.label||state(model.claims.find(x=>x.id===meta.claim)?.current_disposition?.state)}`);const go=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();showAll=false;window.ISREndgameAdjudicationR1?.pick?.(meta.claim,true)};n.onclick=go;n.onkeydown=go});
   host.dataset.graphSource='structured-adjudication-topology-r2';host.dataset.topologyR2='ready';host.dataset.topologyEngine='mermaid-block-grid';installKey();centerSelected(host,svg,claimId);
 }catch(e){console.error('Endgame topology R2 render failed',e);host.dataset.topologyR2='failed'}
}
function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;render()},45)}
function wire(){
 document.addEventListener('click',e=>{const t=e.target.closest?.('button');if(!t)return;if(t.matches('#endgame .eg-ledger')){showAll=false;schedule();return}if(t.closest('#endgame .eg-graph-controls')&&/^Show all$/i.test(t.textContent.trim())){showAll=true;schedule();return}if(t.closest('#endgame .eg-ledger-panel')&&/^Show all paths$/i.test(t.textContent.trim())){showAll=true;schedule()}},true);
 obs=new MutationObserver(ms=>{const host=$('#egMermaidHost');if(!host)return;const selfStable=host.dataset.topologyR2==='ready'&&host.querySelector('.eg-r2-canvas')&&ms.every(m=>host.contains(m.target));if(!selfStable)schedule()});obs.observe(document.body,{childList:true,subtree:true});
}
async function init(){
 model=await J('./data/endgame-adjudication-v1.json?v=20260824-r1');
 for(let i=0;i<80&&!window.ISREndgameAdjudicationR1;i++)await new Promise(r=>setTimeout(r,50));
 for(let i=0;i<80&&!window.mermaid;i++)await new Promise(r=>setTimeout(r,50));
 wire();schedule();window.ISREndgameTopologyR2={build,render,get showAll(){return showAll}};
}
init().catch(e=>console.error('Endgame topology R2 unavailable',e));
}());
