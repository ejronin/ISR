'use strict';
(function IranMessagingR1(){
  const E=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n};
  const A=(p,t,c,x)=>{const n=E(t,c,x);p.append(n);return n};
  const J=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}:${r.status}`);return r.json()};
  function sourceLinks(parent,model,ids){const box=A(parent,'div','sources');(ids||[]).forEach(id=>{const s=model.sources?.[id];if(!s?.url)return;const a=A(box,'a','',`${id} · ${s.publisher}`);a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';});}
  function lane(parent,label,text,cls){const row=A(parent,'section',`iran-message-lane ${cls||''}`);A(row,'h4','',label);A(row,'p','',text);return row;}
  function install(model){
    const root=document.getElementById('infowar');if(!root)return;
    if(root.querySelector('[data-iran-messaging-shifts-20260827]'))return;
    if(window.ISRIranMessagingShifts20260827R1){window.ISRIranMessagingShifts20260827R1.refresh?.();return;}
    if(root.querySelector('[data-iran-messaging-r1]'))return;
    const box=E('section','iran-messaging-r1');box.dataset.iranMessagingR1='1';A(box,'div','section-title','Iran messaging · audience-split reconciliation');A(box,'p','callout','This is not a propaganda blacklist. It separates simultaneous Iranian public/legitimizing language, negotiating behavior and independently observed facts. Different lines may reflect audience segmentation, deliberate ambiguity, bureaucratic disagreement, negotiating front-running, deception, or genuine policy evolution; motive is not assumed without evidence.');const grid=A(box,'div','iran-messaging-grid');const q=id=>(model.node_evidence||[]).find(x=>x.node_id===id);lane(grid,'EVENT / ISSUE','Return to mediated bargaining after the June MOU collapsed.','issue');lane(grid,'ASSERTIVE / LEGITIMIZING MESSAGE',q('Q0')?.claim||'No sourced domestic-facing line is published for this record.','assertive');lane(grid,'OPTIONALITY-PRESERVING / NEGOTIATING MESSAGE','Iran expressed willingness to use Pakistani mediation while Iranian and Omani behavior moved into a concrete shared maritime process.','negotiating');lane(grid,'OBSERVED REALITY',q('Q2')?.claim||'Observed behavior unresolved.','reality');lane(grid,'PRACTICAL RECONCILIATION','The public demand that Washington change course can coexist with practical engagement if Tehran preserves rhetorical leverage while testing mediated terms. That is a strategic possibility, not a finding about hidden motive.','reconcile');lane(grid,'WHAT CHANGED LATER','The shared Oman framework shows the negotiating channel became more concrete. It does not establish that Iran accepted a final settlement or that every earlier demand was abandoned.','later');sourceLinks(box,model,['S24','S25','S27','S32']);root.prepend(box);
  }
  function loadShiftSeries(){
    if(!document.querySelector('link[data-iran-messaging-shifts-20260827]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./css/iran-messaging-shifts-20260827-r1.css?v=20260827-r1';css.dataset.iranMessagingShifts20260827='1';document.head?.appendChild(css);}
    if(!document.querySelector('script[data-iran-messaging-shifts-20260827]')){const js=document.createElement('script');js.src='./js/iran-messaging-shifts-20260827-r1.js?v=20260827-r1';js.async=false;js.dataset.iranMessagingShifts20260827='1';document.head?.appendChild(js);}
    else window.ISRIranMessagingShifts20260827R1?.refresh?.();
  }
  async function init(){const model=await J('./data/endgame-current-20260825-r2.json?v=20260825-r2');install(model);window.ISRIranMessagingR1={install,model:()=>model,loadShiftSeries};loadShiftSeries();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error),{once:true});else init().catch(console.error);
}());
