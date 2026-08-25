'use strict';
(function EndgameMermaidTopologyR2(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const J=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}:${r.status}`);return r.json()};
const mlab=v=>String(v??'').replace(/[\r\n\t]+/g,' ').replace(/["`<>#{};]/g,'').replace(/\s+/g,' ').trim().slice(0,78);
const nid=(...x)=>x.join('_').replace(/[^A-Za-z0-9_]/g,'_');
let model=null, seq=0, showAll=true, pending=false, obs=null;

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
const shape=(id,label,cls,kind)=>{
 const q=mlab(label);
 if(kind==='ORIGINAL_CONDITION')return `${id}(["${q}"]):::${cls}`;
 if(/^MOU_/.test(kind))return `${id}[["${q}"]]:::${cls}`;
 if(/OBSERVABLE|CURRENT_POSITION/.test(kind))return `${id}(["${q}"]):::${cls}`;
 return `${id}["${q}"]:::${cls}`;
};

function build(modelIn){
 model=modelIn;
 const L=[
  'flowchart TB',
  'classDef original fill:#3b2f18,stroke:#e7b85a,color:#fff7e4,stroke-width:2px;',
  'classDef mou fill:#231a35,stroke:#c29cff,color:#f4ebff,stroke-width:1.8px;',
  'classDef expired fill:#3a1c28,stroke:#d67b8a,color:#ffe8ec,stroke-width:1.8px;',
  'classDef response fill:#0d2238,stroke:#6f9dcc,color:#edf6ff,stroke-width:1.4px;',
  'classDef observed fill:#0b2a33,stroke:#63cfe6,color:#e9fbff,stroke-width:1.6px;',
  'classDef stage fill:#102238,stroke:#527aa1,color:#eaf2ff;',
  'classDef junction fill:#172538,stroke:#8ca4bc,color:#edf5ff,stroke-width:1.8px;',
  'classDef good fill:#102b21,stroke:#68d99c,color:#e8fff1,stroke-width:2.4px;',
  'classDef bad fill:#351a21,stroke:#e46f73,color:#fff0f2,stroke-width:2.4px;',
  'classDef open fill:#243247,stroke:#90a9c4,color:#f0f6ff,stroke-width:2.4px;',
  'classDef amber fill:#3d3216,stroke:#e7b85a,color:#fff4d8,stroke-width:2.4px;',
  'subgraph eg_r2_key["HOW TO READ THE MAP"]',
  'direction LR',
  'eg_key_original(["ORIGINAL IRANIAN CONDITION"]):::original',
  'eg_key_mou[["PAPER / MOU TERM"]]:::mou',
  'eg_key_evidence["LATER POSITION / IMPLEMENTATION"]:::response',
  'eg_key_outcome{{"CURRENT DISPOSITION"}}:::open',
  'eg_key_original ~~~ eg_key_mou ~~~ eg_key_evidence ~~~ eg_key_outcome',
  'end'
 ], M=new Map(), clusterMeta=new Map();
 model.claims.forEach((c,claimIndex)=>{
   const sg=`sg_${nid(c.id)}`;
   L.push(`subgraph ${sg}["${mlab(c.short_label)}"]`,'direction LR');
   clusterMeta.set(sg,{claim:c.id,index:claimIndex});
   let prev=null;
   (c.path||[]).forEach((st,i)=>{
     const id=nid('r2',c.id,st.id), cls=stageClass(st.kind);
     L.push(shape(id,shortStage(c,st),cls,st.kind));
     if(prev)L.push(`${prev} -->|${edgeLabel(st.kind)}| ${id}`);
     prev=id;
     M.set(id,{claim:c.id,stage:st});
   });
   if(c.dimensions?.length){
     const split=nid('r2',c.id,'dimensions');
     L.push(`${split}(("THREE SEPARATE HORMUZ TESTS")):::junction`);
     if(prev)L.push(`${prev} -->|separate tests| ${split}`);
     M.set(split,{claim:c.id});
     c.dimensions.forEach(d=>{
       const id=nid('r2',c.id,'dim',d.id);
       L.push(`${id}{{"${mlab(d.label)} · ${mlab(state(d.state))}"}}:::${outcomeClass(d.state)}`);
       L.push(`${split} --> ${id}`);
       M.set(id,{claim:c.id,dim:d});
     });
   } else {
     const id=nid('r2',c.id,'terminal');
     L.push(`${id}{{"${mlab(state(c.current_disposition.state))}"}}:::${outcomeClass(c.current_disposition.state)}`);
     if(prev)L.push(`${prev} ==> ${id}`);
     M.set(id,{claim:c.id,terminal:true});
   }
   L.push('end');
 });
 return {definition:L.join('\n'),nodeMeta:M,clusterMeta};
}

function node(svg,id){return $$('g.node',svg).find(n=>n.id===id||n.id.startsWith(`flowchart-${id}-`)||n.id.includes(`-${id}-`))}
function cluster(svg,id){return $$('g.cluster',svg).find(n=>n.id===id||n.id.includes(id))}
function selectedClaim(){return $('#endgame .eg-ledger.selected')?.dataset.claimId||model?.claims?.[0]?.id}
function installKey(){
 const panel=$('#endgame .eg-graph-panel');if(!panel)return;
 const title=$('.eg-inline-head h3',panel);if(title)title.textContent='Strategic adjudication map · read left → right';
 if($('.eg-r2-map-note',panel))return;
 const note=document.createElement('div');note.className='eg-r2-map-note';
 note.textContent='Each swimlane is one original Iranian victory condition. Purple = MoU/paper term · blue/cyan = later evidence or implementation · terminal color = current disposition.';
 $('.eg-inline-head',panel)?.after(note);
}
function centerSelected(host,svg,claimId){
 if(showAll)return;
 requestAnimationFrame(()=>{
   const active=$$(`g.node[data-claim-id="${CSS.escape(claimId)}"]`,svg);
   if(!active.length)return;
   const boxes=active.map(n=>{try{return n.getBBox()}catch{return null}}).filter(Boolean);
   if(!boxes.length)return;
   const minY=Math.min(...boxes.map(b=>b.y)), maxY=Math.max(...boxes.map(b=>b.y+b.height));
   const vb=svg.viewBox?.baseVal, rect=svg.getBoundingClientRect();
   if(!vb?.height||!rect.height)return;
   const scaleY=rect.height/vb.height, cy=((minY+maxY)/2-vb.y)*scaleY;
   host.scrollTop=Math.max(0,cy-host.clientHeight/2);
 });
}

async function render(){
 const host=$('#egMermaidHost');
 if(!host||!model||!window.mermaid)return;
 if(host.dataset.topologyR2==='rendering')return;
 host.dataset.topologyR2='rendering';
 const graph=build(model), claimId=selectedClaim();
 try{
   window.mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'dark',htmlLabels:false,flowchart:{htmlLabels:false,useMaxWidth:false,curve:'linear',nodeSpacing:20,rankSpacing:52}});
   const r=await window.mermaid.render(`isrEndgameTopologyR2_${++seq}`,graph.definition);
   if(!document.contains(host))return;
   host.replaceChildren();
   const canvas=document.createElement('div');canvas.className='eg-graph-canvas eg-r2-canvas';canvas.innerHTML=r.svg;host.append(canvas);r.bindFunctions?.(canvas);
   const svg=$('svg',canvas);if(!svg)throw Error('no svg');
   svg.removeAttribute('style');svg.setAttribute('role','img');svg.setAttribute('aria-labelledby','egR2GraphTitle egR2GraphDesc');
   const ns='http://www.w3.org/2000/svg',title=document.createElementNS(ns,'title'),desc=document.createElementNS(ns,'desc');
   title.id='egR2GraphTitle';title.textContent='Strategic adjudication map of original Iranian victory conditions';
   desc.id='egR2GraphDesc';desc.textContent='Eight horizontal claim swimlanes read left to right from original condition through MoU or later evidence to current disposition. Hormuz branches into separate legal, operational, and fee tests.';
   svg.prepend(desc);svg.prepend(title);
   graph.nodeMeta.forEach((meta,id)=>{const n=node(svg,id);if(!n)return;n.dataset.claimId=meta.claim;n.dataset.stageKind=meta.stage?.kind||meta.dim?.id||'terminal';n.tabIndex=0;n.setAttribute('role','button');n.setAttribute('aria-label',`${model.claims.find(x=>x.id===meta.claim)?.short_label}: ${meta.stage?.label||meta.dim?.label||state(model.claims.find(x=>x.id===meta.claim)?.current_disposition?.state)}`);const go=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();showAll=false;window.ISREndgameAdjudicationR1?.pick?.(meta.claim,true)};n.onclick=go;n.onkeydown=go});
   graph.clusterMeta.forEach((meta,id)=>{const g=cluster(svg,id);if(!g)return;g.dataset.claimId=meta.claim;g.classList.toggle('eg-r2-cluster-dim',!showAll&&meta.claim!==claimId);g.classList.toggle('eg-r2-cluster-active',!showAll&&meta.claim===claimId)});
   host.dataset.graphSource='structured-adjudication-topology-r2';host.dataset.topologyR2='ready';
   installKey();centerSelected(host,svg,claimId);
 }catch(e){console.error('Endgame topology R2 render failed',e);host.dataset.topologyR2='failed'}
}
function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;render()},45)}
function wire(){
 document.addEventListener('click',e=>{
   const t=e.target.closest?.('button');if(!t)return;
   if(t.matches('#endgame .eg-ledger')){showAll=false;schedule();return}
   if(t.closest('#endgame .eg-graph-controls')&&/^Show all$/i.test(t.textContent.trim())){showAll=true;schedule();return}
   if(t.closest('#endgame .eg-ledger-panel')&&/^Show all paths$/i.test(t.textContent.trim())){showAll=true;schedule()}
 },true);
 obs=new MutationObserver(schedule);obs.observe(document.body,{childList:true,subtree:true});
}
async function init(){
 model=await J('./data/endgame-adjudication-v1.json?v=20260824-r1');
 for(let i=0;i<80&&!window.ISREndgameAdjudicationR1;i++)await new Promise(r=>setTimeout(r,50));
 for(let i=0;i<80&&!window.mermaid;i++)await new Promise(r=>setTimeout(r,50));
 wire();schedule();
 window.ISREndgameTopologyR2={build,render,get showAll(){return showAll}};
}
init().catch(e=>console.error('Endgame topology R2 unavailable',e));
}());
