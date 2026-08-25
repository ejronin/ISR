'use strict';
(function EndgameMermaidR2(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const DATA='./data/endgame-adjudication-v1.json';
  let model=null, rendering=false, queued=false, lastSelection=null;

  const clean=v=>String(v??'').replace(/[\r\n\t]+/g,' ').replace(/["`<>#{};]/g,'').replace(/\s+/g,' ').trim().slice(0,92);
  const id=(...xs)=>xs.join('_').replace(/[^A-Za-z0-9_]/g,'_');
  const terminalClass=s=>s==='PROCEEDS_UNDER_IRAN_DEMAND'?'good':s==='CUT_OFF_DENIED'?'bad':s==='WALKED_BACK_DILUTED'?'amber':'open';
  const state=s=>model?.terminal_state_labels?.[s]||s||'UNRESOLVED';
  const currentClaim=()=>$('.eg-ledger.selected')?.dataset.claimId||$('.eg-ledger[aria-pressed="true"]')?.dataset.claimId||model?.claims?.[0]?.id;

  function keyStage(c){
    const p=c.path||[];
    const candidates=p.filter(x=>!/^MOU_/.test(x.kind||'')&&x.kind!=='ORIGINAL_CONDITION');
    return candidates.at(-1)||p.at(-1)||null;
  }

  function clauseLabel(c){
    const r=c.mou_relationship||{};
    if(!r.relevant)return null;
    const clause=String(r.clause_ref||'').split('/')[0];
    return clause?`CLAUSE ${clean(clause)}`:'MoU TERM';
  }

  function buildGraph(){
    const L=[
      'flowchart LR',
      'classDef demand fill:#3b2f18,stroke:#e7b85a,color:#fff,stroke-width:2px;',
      'classDef spine fill:#251d35,stroke:#c29cff,color:#fff,stroke-width:2px;',
      'classDef expiry fill:#3a2132,stroke:#f08db1,color:#fff,stroke-width:3px;',
      'classDef reality fill:#0d2238,stroke:#527aa1,color:#eaf2ff;',
      'classDef split fill:#16283e,stroke:#7ea5cb,color:#fff,stroke-width:2px;',
      'classDef good fill:#102b21,stroke:#68d99c,color:#fff,stroke-width:3px;',
      'classDef bad fill:#351a21,stroke:#e46f73,color:#fff,stroke-width:3px;',
      'classDef open fill:#243247,stroke:#90a9c4,color:#fff,stroke-width:3px;',
      'classDef amber fill:#3d3216,stroke:#e7b85a,color:#fff,stroke-width:3px;',
      'classDef ghost fill:#111923,stroke:#3d5268,color:#9db0c4,stroke-dasharray:4 3;'
    ];
    const meta=new Map(), edges=[];
    const add=(nid,label,cls,claims=[],extra={})=>{L.push(`${nid}["${clean(label)}"]:::${cls}`);meta.set(nid,{claims:[...new Set(claims)],...extra});};
    const edge=(a,b,label,kind='normal')=>edges.push(`${a} ${kind==='soft'?'-.->':'-->'}${label?`|"${clean(label)}"|`:''} ${b}`);

    L.push('subgraph sg_demands["1 · ORIGINAL IRANIAN CONDITIONS"]','direction TB');
    model.claims.forEach(c=>{
      const n=id('demand',c.id), first=(c.path||[]).find(x=>x.kind==='ORIGINAL_CONDITION');
      add(n,first?.label||c.short_label,'demand',[c.id],{claim:c.id,stage:first});
    });
    L.push('end');

    L.push('subgraph sg_mou["2 · NEGOTIATION / INSTRUMENT"]','direction TB');
    add('mou_hub','JUNE 2026 U.S.–IRAN MoU','spine',model.claims.filter(c=>c.mou_relationship?.relevant).map(c=>c.id),{shared:true});
    const clauseMap=new Map();
    model.claims.forEach(c=>{
      const lab=clauseLabel(c);if(!lab)return;
      const key=String(c.mou_relationship.clause_ref||'term'),nid=id('clause',key);
      if(!clauseMap.has(key)){
        const linked=model.claims.filter(x=>String(x.mou_relationship?.clause_ref||'')===key).map(x=>x.id);
        add(nid,`${lab} · ${linked.map(x=>model.claims.find(c=>c.id===x)?.short_label).filter(Boolean).join(' / ')}`,'spine',linked,{shared:true,clause:key});
        clauseMap.set(key,nid);edge('mou_hub',nid,'paper term');
      }
    });
    add('mou_expired',`${model.mou_instrument.display_state} · deadline ${model.mou_instrument.deadline_expired_on}`,'expiry',model.claims.filter(c=>c.mou_relationship?.relevant).map(c=>c.id),{shared:true,expiry:true});
    clauseMap.forEach(n=>edge(n,'mou_expired','final deal not completed','soft'));
    L.push('end');

    L.push('subgraph sg_reality["3 · OBSERVED / LATER REALITY"]','direction TB');
    model.claims.forEach(c=>{
      if(c.dimensions?.length){
        const fork=id('reality',c.id,'fork');add(fork,'HORMUZ · THREE DISTINCT TESTS','split',[c.id],{claim:c.id});
        c.dimensions.forEach(d=>{const n=id('dim',c.id,d.id);add(n,d.label,'reality',[c.id],{claim:c.id,dim:d});edge(fork,n,'separate question')});
      }else{
        const st=keyStage(c),n=id('reality',c.id);add(n,st?.label||c.current_disposition.reasoning,'reality',[c.id],{claim:c.id,stage:st});
      }
    });
    L.push('end');

    L.push('subgraph sg_outcomes["4 · CURRENT DISPOSITION"]','direction TB');
    const terminalIds={};
    Object.keys(model.terminal_state_labels||{}).forEach(s=>{
      const claims=model.claims.filter(c=>c.current_disposition?.state===s).map(c=>c.id);
      const n=id('terminal',s);terminalIds[s]=n;add(n,state(s),terminalClass(s),claims,{terminal:s,shared:true});
    });
    L.push('end');

    model.claims.forEach(c=>{
      const demand=id('demand',c.id), mr=c.mou_relationship||{};
      if(mr.relevant){
        const clause=clauseMap.get(String(mr.clause_ref||'term'));
        edge(demand,clause||'mou_hub',mr.term_present?'entered paper bargain':'addressed in talks');
      }
      const reality=c.dimensions?.length?id('reality',c.id,'fork'):id('reality',c.id);
      if(mr.relevant)edge('mou_expired',reality,mr.dependent?'term lost controlling force':'old instrument non-controlling');
      else edge(demand,reality,'tested against later record');
      if(c.dimensions?.length){
        c.dimensions.forEach(d=>edge(id('dim',c.id,d.id),terminalIds[d.state],state(d.state)));
      }else edge(reality,terminalIds[c.current_disposition.state],'adjudicated');
    });

    L.push(...edges);
    L.push('linkStyle default stroke:#607d99,stroke-width:1.5px;');
    return {definition:L.join('\n'),meta};
  }

  function graphNode(svg,nid){return $$('g.node',svg).find(n=>n.id===nid||n.id.startsWith(`flowchart-${nid}-`)||n.id.includes(`-${nid}-`))}

  function applySelection(svg,meta){
    const selected=currentClaim();lastSelection=selected;
    meta.forEach((m,nid)=>{
      const n=graphNode(svg,nid);if(!n)return;
      const linked=m.claims||[];const active=!selected||linked.includes(selected);
      n.dataset.claimIds=linked.join(',');
      n.classList.toggle('eg-r2-dim',!active);
      n.classList.toggle('eg-r2-active',active);
      if(m.claim){
        n.tabIndex=0;n.setAttribute('role','button');
        n.setAttribute('aria-label',`${model.claims.find(c=>c.id===m.claim)?.short_label}: ${m.stage?.label||m.dim?.label||'analytical path'}`);
        const go=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();$(`.eg-ledger[data-claim-id="${CSS.escape(m.claim)}"]`)?.click()};
        n.onclick=go;n.onkeydown=go;
      }else if(linked.length>1){
        n.setAttribute('aria-label',`Shared analytical node affecting ${linked.length} claims`);
      }
    });
  }

  async function render(){
    if(rendering){queued=true;return}const host=$('#egMermaidHost');if(!host||!window.mermaid)return;
    rendering=true;host.dataset.graphSource='structured-adjudication-r2';
    try{
      if(!model){const r=await fetch(DATA,{cache:'no-store'});if(!r.ok)throw Error(`adjudication data ${r.status}`);model=await r.json()}
      const g=buildGraph();
      const m=window.mermaid;m.initialize({startOnLoad:false,securityLevel:'strict',theme:'dark',htmlLabels:false,flowchart:{htmlLabels:false,useMaxWidth:false,curve:'basis',nodeSpacing:34,rankSpacing:62}});
      const out=await m.render(`isrEndgameTopology_${Date.now()}`,g.definition);
      if(!document.body.contains(host))return;
      host.replaceChildren();const canvas=document.createElement('div');canvas.className='eg-graph-canvas eg-r2-canvas';canvas.innerHTML=out.svg;out.bindFunctions?.(canvas);host.append(canvas);
      const svg=$('svg',canvas);if(!svg)throw Error('no svg');svg.removeAttribute('style');svg.setAttribute('role','img');svg.setAttribute('aria-labelledby','egGraphTitle egGraphDesc');
      const ns='http://www.w3.org/2000/svg',title=document.createElementNS(ns,'title'),desc=document.createElementNS(ns,'desc');title.id='egGraphTitle';title.textContent='Endgame analytical topology';desc.id='egGraphDesc';desc.textContent='Original Iranian conditions flow through shared negotiation and MoU dependencies into observed reality and shared disposition basins. Hormuz separates legal control, operational gatekeeping, and fee authority.';svg.prepend(desc);svg.prepend(title);
      applySelection(svg,g.meta);
      host.dispatchEvent(new CustomEvent('isr:endgame-r2-rendered'));
    }catch(e){console.error('Endgame Mermaid R2',e)}finally{rendering=false;if(queued){queued=false;queueMicrotask(render)}}
  }

  function watch(){
    const root=$('#endgame');if(!root)return false;
    const mo=new MutationObserver(()=>{
      const host=$('#egMermaidHost');if(!host)return;
      const selected=currentClaim();
      if(host.dataset.graphSource!=='structured-adjudication-r2'||selected!==lastSelection)queueMicrotask(render);
    });
    mo.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-pressed']});
    render();return true;
  }

  function boot(){
    if(watch())return;
    const mo=new MutationObserver(()=>{if(watch())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.ISREndgameMermaidR2={render,buildGraph:()=>model?buildGraph():null};
}());
