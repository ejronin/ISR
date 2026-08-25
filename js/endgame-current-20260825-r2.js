'use strict';
(function EndgameCurrent20260825R2(){
  const LIVE='./data/endgame-current-20260825-r2.json?v=20260825-r2';
  const CAUSAL='./data/endgame-causal-map-r2.mmd?v=20260825-r2';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n;};
  const safe=u=>{try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:null}catch{return null;}};
  const J=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}: ${r.status}`);return r.json();};
  const T=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}: ${r.status}`);return r.text();};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let live=null,model=null,applying=false,observer=null;

  function classificationKind(s){const v=String(s||'').toUpperCase();if(v.includes('DISPUTED'))return'disputed';if(v.includes('ACTOR')||v.includes('OFFICIAL')||v.includes('CLAIM')||v.includes('THREAT'))return'claim';if(v.includes('INFERENCE')||v.includes('SYNTHESIS'))return'assessment';if(v.includes('SURVEY'))return'survey';return'fact';}
  function sourceChips(parent,ids){
    const old=$('.eg25-sources',parent);old?.remove();
    const box=E('div','eg3-sources eg25-sources');let n=0;
    (ids||[]).forEach(id=>{const s=model?.sources?.[id],u=safe(s?.url);if(!s||!u)return;const a=E('a','eg3-source-chip',`${id} · ${s.publisher}`);a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.title=`${s.date||''} · ${s.quality||''} · ${s.supports||''}`;box.append(a);n++;});
    if(n)parent.append(box);
  }
  function sectionByTitle(panel,text){return $$('section.eg3-section',panel).find(s=>($('h3',s)?.textContent||'').trim().startsWith(text))||null;}
  function mergeLive(){
    if(!model||!live)return;
    model.sources=Object.assign(model.sources||{},live.sources||{});
    model.evidence_cutoff=live.evidence_cutoff||model.evidence_cutoff;
    const incoming=new Map((live.node_evidence||[]).map(x=>[x.node_id,x]));
    model.node_evidence=[...(model.node_evidence||[]).filter(x=>!incoming.has(x.node_id)),...incoming.values()];
    (model.strategic_status||[]).forEach(x=>{if(live.status_overrides?.[x.lane])x.status=live.status_overrides[x.lane];});
    if(model.mou_now&&live.mou_now){model.mou_now.text=live.mou_now.text;model.mou_now.source_ids=live.mou_now.source_ids;model.mou_now.flow=['SIGNED','IMPLEMENTED','MARITIME DISPUTE','FUNCTIONALLY DEAD','IRAN INVOKES OLD BASELINE','NEW OMAN FRAMEWORK','SUCCESSOR DEAL OPEN'];}
  }
  function patchHeader(){const b=$('#endgame .eg3-meta-box b');if(b)b.textContent=`Evidence cutoff · ${model.evidence_cutoff}`;}
  function patchStatus(){
    $$('#endgame [data-eg3-panel="strategic"] .eg3-status-card').forEach(c=>{const lane=$('span',c)?.textContent?.trim(),v=live.status_overrides?.[lane];if(v){const s=$('strong',c);if(s)s.textContent=v;}});
  }
  function patchMou(){
    const panel=$('#endgame [data-eg3-panel="mou"]');if(!panel)return;
    const ev=sectionByTitle(panel,'What the evidence says · Paragraph 5');
    if(ev){$('.eg25-p5',ev)?.remove();const c=E('article','eg3-card eg3-finding eg25-p5');const h=E('h4','',live.paragraph5_update.title);const b=E('span','eg3-badge eg3-fact','NEW FACT · AUG. 25');const p=E('p','',live.paragraph5_update.text);c.append(h,b,p);sourceChips(c,live.paragraph5_update.source_ids);ev.append(c);}
    const now=sectionByTitle(panel,'Where the MOU is now');
    if(now){const p=$('.eg3-lead',now);if(p)p.textContent=live.mou_now.text;sourceChips(now,live.mou_now.source_ids);const flow=$('.eg3-flow',now);if(flow){flow.replaceChildren();['SIGNED','IMPLEMENTED','MARITIME DISPUTE','FUNCTIONALLY DEAD','IRAN INVOKES OLD BASELINE','NEW OMAN FRAMEWORK','SUCCESSOR DEAL OPEN'].forEach((x,i,a)=>{const n=E('span',x==='FUNCTIONALLY DEAD'?'dead':'',x);flow.append(n);if(i<a.length-1)flow.append(E('i','','→'));});}}
  }
  function graphNode(svg,id){return $$('g.node',svg).find(n=>n.id===id||n.id.startsWith(`flowchart-${id}-`)||n.id.includes(`-${id}-`));}
  function showEvidence(nodeId){
    const d=$('#eg3EvidenceDrawer');if(!d)return;const x=(model.node_evidence||[]).find(q=>q.node_id===nodeId);d.replaceChildren();
    if(!x){d.append(E('h4','',nodeId||'Strategic node'),E('p','eg3-muted','This connective node is explanatory. Follow the nearest sourced node for the underlying record.'));return;}
    const head=E('div','eg3-drawer-head');head.append(E('span','eg3-node-id',x.node_id),E('span',`eg3-badge eg3-${classificationKind(x.classification)}`,String(x.classification||'EVIDENCE').replace(/_/g,' ')));d.append(head,E('h4','',x.claim),E('p','',x.editorial_note||''));
    const dl=E('dl','eg3-method');dl.append(E('dt','','Confidence'),E('dd','',x.confidence||'Not rated'));d.append(dl);sourceChips(d,x.source_ids);
  }
  async function renderLiveCausal(){
    const host=$('#eg3CausalHost');if(!host||host.dataset.liveR2==='1')return;
    if(!window.mermaid){for(let i=0;i<40&&!window.mermaid;i++)await sleep(50);}if(!window.mermaid)return;
    let def=await T(CAUSAL);def=def.replace(/<br\s*\/?\s*>/gi,' · ');
    const m=window.mermaid;m.initialize({startOnLoad:false,securityLevel:'strict',theme:'dark',htmlLabels:false,flowchart:{htmlLabels:false,useMaxWidth:false,curve:'basis',nodeSpacing:34,rankSpacing:54}});
    const out=await m.render(`isrEndgameCausalR2_${Date.now()}`,def);if(!document.body.contains(host))return;
    host.replaceChildren();const canvas=E('div','eg3-causal-canvas');canvas.innerHTML=out.svg;out.bindFunctions?.(canvas);host.append(canvas);
    const svg=$('svg',canvas);if(!svg)return;svg.removeAttribute('style');svg.setAttribute('role','img');svg.setAttribute('aria-label','Updated human causal endgame map distinguishing Iranian public framing from observable negotiation behavior and the Aug. 25 Oman framework.');
    (model.node_evidence||[]).forEach(x=>{const n=graphNode(svg,x.node_id);if(!n)return;n.classList.add(`eg3-node-${classificationKind(x.classification)}`);n.dataset.nodeId=x.node_id;n.tabIndex=0;n.setAttribute('role','button');n.setAttribute('aria-label',`${x.node_id}: ${x.claim}`);const go=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();$$('g.node.eg3-selected-node',svg).forEach(q=>q.classList.remove('eg3-selected-node'));n.classList.add('eg3-selected-node');showEvidence(x.node_id);};n.onclick=go;n.onkeydown=go;});
    $$('g.node',svg).forEach(n=>{const txt=(n.textContent||'').toUpperCase();if(txt.includes('DEAD END')||txt.includes('STILL NOT VALIDATED'))n.classList.add('eg3-node-dead');if(txt.includes('OPEN PATH')||txt.includes('OPEN POSSIBILITY')||txt.includes('OPEN TEST')||txt.includes('NOW HAPPENING'))n.classList.add('eg3-node-open');});
    host.dataset.rendered='1';host.dataset.liveR2='1';showEvidence('NARROW');
  }
  async function apply(){
    if(applying||!live)return;const api=window.ISREndgamePublicViewR1;if(!api?.model?.())return;const root=$('#endgame .eg3-shell');if(!root)return;applying=true;
    try{model=api.model();mergeLive();patchHeader();patchStatus();patchMou();await renderLiveCausal();}catch(e){console.error('Endgame Aug25 R2 overlay',e);}finally{applying=false;}
  }
  async function init(){
    live=await J(LIVE);
    for(let i=0;i<80;i++){if(window.ISREndgamePublicViewR1?.model?.()&&$('#endgame .eg3-shell'))break;await sleep(75);}
    await apply();
    const root=$('#endgame');if(root){observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(()=>apply(),60);});observer.observe(root,{childList:true,subtree:true});}
    window.ISREndgameCurrentR2={apply,live:()=>live};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error),{once:true});else init().catch(console.error);
}());
