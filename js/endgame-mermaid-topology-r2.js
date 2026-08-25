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
const shape=(id,label,cls,kind)=>{
 const q=mlab(label);
 if(kind==='ORIGINAL_CONDITION')return `${id}(["${q}"]):::${cls}`;
 if(/^MOU_/.test(kind))return `${id}[["${q}"]]:::${cls}`;
 if(/OBSERVABLE|CURRENT_POSITION/.test(kind))return `${id}(["${q}"]):::${cls}`;
 return `${id}["${q}"]:::${cls}`;
};
const spacer=id=>`${id}[" "]:::spacer`;

function build(modelIn){
 model=modelIn;
 const maxSteps=Math.max(...model.claims.map(c=>(c.path||[]).length));
 const phaseCount=maxSteps+2, decisionIndex=maxSteps, outcomeIndex=maxSteps+1;
 const phaseDefs=Array.from({length:phaseCount},()=>[]),phaseIds=Array.from({length:phaseCount},()=>[]);
 const edges=[],M=new Map(),P=new Map();
 const phaseLabel=i=>i===0?'1 · ORIGINAL CONDITION':i<maxSteps?`${i+1} · EVIDENCE STEP ${i}`:i===decisionIndex?'BUNDLED-CLAIM TEST':`CURRENT DISPOSITION`;

 model.claims.forEach((c,row)=>{
   const real=[];
   for(let i=0;i<maxSteps;i++){
     const st=(c.path||[])[i];
     if(st){
       const id=nid('r2',c.id,st.id);
       phaseDefs[i].push(shape(id,shortStage(c,st),stageClass(st.kind),st.kind));
       phaseIds[i].push(id);real.push({id,stage:st});M.set(id,{claim:c.id,stage:st,row,phase:i});
     }else{
       const id=nid('r2','sp',c.id,i);phaseDefs[i].push(spacer(id));phaseIds[i].push(id);
     }
   }
   for(let i=1;i<real.length;i++)edges.push(`${real[i-1].id} -->|${edgeLabel(real[i].stage.kind)}| ${real[i].id}`);
   const last=real.at(-1)?.id;
   if(c.dimensions?.length){
     const split=nid('r2',c.id,'dimensions');
     phaseDefs[decisionIndex].push(`${split}(("THREE SEPARATE HORMUZ TESTS")):::junction`);phaseIds[decisionIndex].push(split);M.set(split,{claim:c.id,row,phase:decisionIndex});
     if(last)edges.push(`${last} -->|separate tests| ${split}`);
     c.dimensions.forEach(d=>{
       const id=nid('r2',c.id,'dim',d.id);
       phaseDefs[outcomeIndex].push(`${id}{{"${mlab(d.label)} · ${mlab(state(d.state))}"}}:::${outcomeClass(d.state)}`);phaseIds[outcomeIndex].push(id);M.set(id,{claim:c.id,dim:d,row,phase:outcomeIndex});edges.push(`${split} ==> ${id}`);
     });
   }else{
     const ds=nid('r2','decision',c.id);phaseDefs[decisionIndex].push(spacer(ds));phaseIds[decisionIndex].push(ds);
     const id=nid('r2',c.id,'terminal');phaseDefs[outcomeIndex].push(`${id}{{"${mlab(state(c.current_disposition.state))}"}}:::${outcomeClass(c.current_disposition.state)}`);phaseIds[outcomeIndex].push(id);M.set(id,{claim:c.id,terminal:true,row,phase:outcomeIndex});
     if(last)edges.push(`${last} ==> ${id}`);
   }
 });

 const L=[
  'flowchart LR',
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
  'classDef spacer fill:transparent,stroke:transparent,color:transparent,stroke-width:0px;'
 ];
 phaseDefs.forEach((defs,i)=>{
   const id=nid('phase',i);L.push(`subgraph ${id}["${phaseLabel(i)}"]`,'direction TB',...defs);
   if(phaseIds[i].length>1)L.push(phaseIds[i].join(' ~~~ '));
   L.push('end');P.set(id,{index:i,label:phaseLabel(i)});
 });
 L.push(...edges);
 return {definition:L.join('\n'),nodeMeta:M,phaseMeta:P,maxSteps};
}

function node(svg,id){return $$('g.node',svg).find(n=>n.id===id||n.id.startsWith(`flowchart-${id}-`)||n.id.includes(`-${id}-`))}
function cluster(svg,id){return $$('g.cluster',svg).find(n=>n.id===id||n.id.includes(id))}
function selectedClaim(){return $('#endgame .eg-ledger.selected')?.dataset.claimId||model?.claims?.[0]?.id}
function installKey(){
 const panel=$('#endgame .eg-graph-panel');if(!panel)return;
 const title=$('.eg-inline-head h3',panel);if(title)title.textContent='Strategic adjudication matrix · read left → right';
 if($('.eg-r2-map-note',panel))return;
 const note=document.createElement('div');note.className='eg-r2-map-note';
 note.textContent='Rows are the eight original Iranian victory conditions; columns preserve the evidence sequence. Gold = original condition · purple = MoU/paper term · blue/cyan = later evidence or implementation · terminal color = current disposition.';
 $('.eg-inline-head',panel)?.after(note);
}
function centerSelected(host,svg,claimId){
 if(showAll)return;
 requestAnimationFrame(()=>{
   const active=$$(`g.node[data-claim-id="${CSS.escape(claimId)}"]`,svg);
   if(!active.length)return;
   const boxes=active.map(n=>{try{return n.getBBox()}catch{return null}}).filter(Boolean);
   if(!boxes.length)return;
   const minY=Math.min(...boxes.map(b=>b.y)),maxY=Math.max(...boxes.map(b=>b.y+b.height)),vb=svg.viewBox?.baseVal,rect=svg.getBoundingClientRect();
   if(!vb?.height||!rect.height)return;
   const cy=((minY+maxY)/2-vb.y)*(rect.height/vb.height);host.scrollTop=Math.max(0,cy-host.clientHeight/2);
 });
}

async function render(){
 const host=$('#egMermaidHost');if(!host||!model||!window.mermaid)return;if(host.dataset.topologyR2==='rendering')return;
 host.dataset.topologyR2='rendering';const graph=build(model),claimId=selectedClaim();
 try{
   window.mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'dark',htmlLabels:false,flowchart:{htmlLabels:false,useMaxWidth:false,curve:'linear',nodeSpacing:24,rankSpacing:56}});
   const r=await window.mermaid.render(`isrEndgameTopologyR2_${++seq}`,graph.definition);if(!document.contains(host))return;
   host.replaceChildren();const canvas=document.createElement('div');canvas.className='eg-graph-canvas eg-r2-canvas';canvas.innerHTML=r.svg;host.append(canvas);r.bindFunctions?.(canvas);
   const svg=$('svg',canvas);if(!svg)throw Error('no svg');svg.removeAttribute('style');svg.setAttribute('role','img');svg.setAttribute('aria-labelledby','egR2GraphTitle egR2GraphDesc');
   const ns='http://www.w3.org/2000/svg',title=document.createElementNS(ns,'title'),desc=document.createElementNS(ns,'desc');title.id='egR2GraphTitle';title.textContent='Strategic adjudication matrix of original Iranian victory conditions';desc.id='egR2GraphDesc';desc.textContent='Eight claim rows read left to right across evidence-step columns to current disposition. Hormuz forks at the end into separate legal, operational, and fee tests.';svg.prepend(desc);svg.prepend(title);
   graph.phaseMeta.forEach((meta,id)=>{const g=cluster(svg,id);if(!g)return;g.dataset.phaseIndex=meta.index;g.dataset.phaseLabel=meta.label});
   graph.nodeMeta.forEach((meta,id)=>{const n=node(svg,id);if(!n)return;n.dataset.claimId=meta.claim;n.dataset.stageKind=meta.stage?.kind||meta.dim?.id||'terminal';n.classList.toggle('eg-r2-node-dim',!showAll&&meta.claim!==claimId);n.classList.toggle('eg-r2-node-active',!showAll&&meta.claim===claimId);n.tabIndex=0;n.setAttribute('role','button');n.setAttribute('aria-label',`${model.claims.find(x=>x.id===meta.claim)?.short_label}: ${meta.stage?.label||meta.dim?.label||state(model.claims.find(x=>x.id===meta.claim)?.current_disposition?.state)}`);const go=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();showAll=false;window.ISREndgameAdjudicationR1?.pick?.(meta.claim,true)};n.onclick=go;n.onkeydown=go});
   host.dataset.graphSource='structured-adjudication-topology-r2';host.dataset.topologyR2='ready';installKey();centerSelected(host,svg,claimId);
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
