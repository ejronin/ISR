'use strict';
(function IranMessagingShifts20260827R1(){
  if(window.__ISR_IRAN_MESSAGING_SHIFTS_20260827_R1__)return;
  window.__ISR_IRAN_MESSAGING_SHIFTS_20260827_R1__=true;
  const DATA='./data/iran-messaging-shifts-20260827-r1.json?v=20260827-r1';
  const E=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n;};
  const A=(p,t,c,x)=>{const n=E(t,c,x);p.append(n);return n;};
  const J=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}: ${r.status}`);return r.json();};
  const safe=u=>{try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:null}catch{return null;}};
  const flagPath=code=>code?`assets/flags/${String(code).toLowerCase()}.svg`:null;

  const BRIDGES={
    'MSG-SHIFT-01':{
      old_position:'Washington must halt coercion and change course before Iran returns to talks.',
      new_position:'Iran can enter mediated talks while continuing to say U.S. coercion is illegitimate and that Tehran is negotiating from strength.',
      lets_iran_say:'We did not return because Washington ordered us to; regional mediation created an acceptable path.',
      practical_change:'Iran entered a political process before the precondition it had publicly set was satisfied.',
      logical_implication:'The precondition was therefore conceded / walked back. If X was stated as required before Y, X did not occur, and Iran nevertheless did Y, the earlier requirement no longer governed Iran’s behavior. That conclusion does not depend on proving why Tehran changed course.'
    },
    'MSG-SHIFT-02':{
      old_position:'This is ours to administer: Iran framed Hormuz management as its responsibility and said vessels should contribute to service costs.',
      new_position:'We secured our rightful share through negotiations with the regional states: Iran can describe a shared Oman/Gulf arrangement as recognition of Iranian rights and a legitimate Iranian role.',
      lets_iran_say:'Iran resisted outside dictates and obtained regional recognition of its rights in Hormuz.',
      practical_change:'Iran can retreat from “this is ours to administer” toward shared or regional management without publicly saying its original unilateral position failed.',
      logical_implication:'To the extent Iran enters and advances a shared regional administration framework, the earlier claim of unilateral Iranian management is conceded / walked back. Final authority, revenue and toll terms remain unresolved, so Atlas does not infer that every Iranian Hormuz demand has already been surrendered.'
    },
    'MSG-SHIFT-03':{
      old_position:'Iran framed the nuclear program and related sovereign capabilities as non-negotiable strategic capital.',
      new_position:'Iran can negotiate procedures, inspection conditions or implementation while continuing to say the sovereign right itself is not being surrendered.',
      lets_iran_say:'Negotiating the conditions is not surrendering the right itself.',
      practical_change:'A subject previously framed as outside bargaining can move into a negotiating process while Tehran preserves a domestic claim that the underlying sovereign right remains intact.',
      logical_implication:'Putting nuclear terms into a negotiated final-deal process necessarily walks back the narrower claim that those terms are not negotiable at all. It does not by itself concede the substantive final nuclear outcome. The present inspection hardening may be an attempt to protect what remains of that sovereignty line, but that motive is inferential.'
    }
  };

  function actor(parent,entry){
    const chip=A(parent,'span','ims-actor');
    if(entry?.flag){const img=A(chip,'img','ims-flag');img.src=flagPath(entry.flag);img.alt='';img.loading='lazy';}
    if(entry?.secondary_flag){const img=A(chip,'img','ims-flag ims-flag-secondary');img.src=flagPath(entry.secondary_flag);img.alt='';img.loading='lazy';}
    A(chip,'span','',entry?.actor||'Actor');
    return chip;
  }
  function sources(parent,model,ids){
    const unique=[...new Set(ids||[])],box=A(parent,'div','ims-sources');let count=0;
    unique.forEach(id=>{const s=model.sources?.[id],u=safe(s?.url);if(!s||!u)return;const a=A(box,'a','',`${s.publisher} · ${s.date}`);a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.title=s.supports||s.title||id;count++;});
    if(!count)box.remove();
  }
  function phase(parent,kicker,title,text,entry,cls=''){
    const box=A(parent,'section',`ims-phase ${cls}`.trim());
    A(box,'div','ims-kicker',kicker);
    const head=A(box,'div','ims-phase-head');
    if(entry)actor(head,entry);
    A(head,'strong','',title);
    if(entry?.date)A(head,'span','ims-date',entry.date);
    A(box,'p','',text||'Unresolved.');
    return box;
  }
  function acts(parent,row,model){
    const sec=A(parent,'section','ims-acts');
    A(sec,'div','ims-kicker','WHAT CLOSED OR CHANGED THE LANE');
    const list=A(sec,'div','ims-act-list');
    (row.closing_acts||[]).forEach(x=>{
      const item=A(list,'article','ims-act');
      const head=A(item,'div','ims-act-head');actor(head,x);A(head,'time','',x.date||'Date unresolved');
      A(item,'p','',x.act);
      A(item,'span','ims-evidence',x.evidence||'Evidence status unresolved');
      sources(item,model,x.source_ids);
    });
    return sec;
  }
  function bridge(parent,row){
    const b=row.interpretive_bridge||BRIDGES[row.id];
    if(!b)return;
    const sec=A(parent,'section','ims-phase ims-bridge');
    A(sec,'div','ims-kicker','HOW THE WALK-BACK CAN BE REFRAMED');
    const items=[
      ['OLD POSITION',b.old_position],
      ['NEW POSITION',b.new_position],
      ['WHAT THE NEW POSITION LETS IRAN SAY',b.lets_iran_say],
      ['WHAT CHANGED IN PRACTICE',b.practical_change]
    ];
    items.forEach(([label,text])=>{const line=A(sec,'div','ims-bridge-line');A(line,'strong','',label);A(line,'p','',text);});
    const logic=A(sec,'div','ims-logical-implication');A(logic,'strong','','LOGICAL IMPLICATION · CONCESSION / WALK-BACK');A(logic,'p','',b.logical_implication);
    A(sec,'p','ims-bridge-guardrail','The concession/walk-back conclusion follows from the documented change between the stated position and later behavior. What remains inferential is the motive: whether the replacement framing was deliberately designed to conceal the retreat, reflected mediator sequencing, factional differences, genuine policy evolution, or another cause.');
  }
  function alternatives(parent,row){
    const box=A(parent,'details','ims-alternatives');
    A(box,'summary','','Other explanations kept open');
    const ul=A(box,'ul','');
    (row.assessment?.alternatives||[]).forEach(x=>A(ul,'li','',x));
    return box;
  }
  function card(parent,row,model,index){
    const c=A(parent,'article','ims-shift-card');c.dataset.messagingShiftId=row.id;
    const top=A(c,'header','ims-card-head');
    A(top,'span','ims-step',String(index+1).padStart(2,'0'));
    const title=A(top,'div','');A(title,'h3','',row.issue);A(title,'span','ims-status',row.status);
    const flow=A(c,'div','ims-flow');
    const said=phase(flow,'IRAN SAID',row.said?.label||'ASSERTIVE / LEGITIMIZING MESSAGE',row.said?.text,row.said,'ims-said');sources(said,model,row.said?.source_ids);
    acts(flow,row,model);
    const reality=phase(flow,row.occurred?.label||'OBSERVED REALITY','What actually occurred',row.occurred?.text,null,'ims-reality');sources(reality,model,row.occurred?.source_ids);
    const shifted=phase(flow,'IRAN SHIFTED TO',row.shifted_to?.label||'OPTIONALITY-PRESERVING / NEGOTIATING MESSAGE',row.shifted_to?.text,row.shifted_to,'ims-shifted');sources(shifted,model,row.shifted_to?.source_ids);
    bridge(flow,row);
    const assess=A(c,'section','ims-assessment');
    const ah=A(assess,'div','ims-assessment-head');A(ah,'strong','',row.assessment?.classification||'Assessment unresolved');A(ah,'span','ims-confidence',row.assessment?.confidence||'Confidence unresolved');
    A(assess,'p','',row.assessment?.text||'');
    alternatives(assess,row);
    const ids=[...(row.said?.source_ids||[]),...(row.occurred?.source_ids||[]),...(row.shifted_to?.source_ids||[]),...(row.closing_acts||[]).flatMap(x=>x.source_ids||[])];
    sources(assess,model,ids);
  }
  function install(model){
    const root=document.getElementById('infowar');if(!root)return false;
    root.querySelector('[data-iran-messaging-r1]')?.remove();
    root.querySelector('[data-iran-messaging-shifts-20260827]')?.remove();
    const box=E('section','iran-messaging-shifts');box.dataset.iranMessagingShifts20260827='1';
    A(box,'div','section-title','IRAN MESSAGING · POSITION-SHIFT SERIES');
    A(box,'p','callout','Read each row left-to-right: what Iran said → the outside acts that narrowed or changed that lane → what actually happened → what Iran said next → how the new position can absorb the retreat without publicly admitting the old position failed. Where the premises establish that a stated requirement was abandoned in practice, Atlas calls the concession / walk-back directly. Only the motive for the change remains inferential. This is not a propaganda blacklist.');
    const key=A(box,'div','ims-key');
    [['ASSERTIVE / LEGITIMIZING MESSAGE','What Tehran publicly establishes as strength or a red line.'],['OPTIONALITY-PRESERVING / NEGOTIATING MESSAGE','Language that preserves room to bargain without openly surrendering the earlier line.'],['OBSERVED REALITY','What the sourced sequence establishes independently of either narrative.'],['PRACTICAL RECONCILIATION','How the new line can absorb a real positional retreat without Tehran publicly saying the earlier position failed; motive remains unproven unless evidence establishes it.']].forEach(([h,p])=>{const k=A(key,'div','');A(k,'strong','',h);A(k,'span','',p);});
    const list=A(box,'div','ims-series');
    (model.series||[]).forEach((row,i)=>card(list,row,model,i));
    const method=A(box,'details','ims-method');A(method,'summary','','Method and motive guardrail');const ul=A(method,'ul','');(model.method||[]).forEach(x=>A(ul,'li','',x));
    root.prepend(box);
    window.dispatchEvent(new CustomEvent('atlasiranmessagingready20260827',{detail:{series:(model.series||[]).length,cutoff:model.evidence_cutoff}}));
    return true;
  }
  function keepMounted(model){
    const remount=()=>{const root=document.getElementById('infowar');if(root&&!root.querySelector('[data-iran-messaging-shifts-20260827]'))install(model);};
    window.addEventListener('atlasstatechange',remount);
    window.addEventListener('atlascurrentready20260827',remount);
  }
  async function init(){const model=await J(DATA);window.ISRIranMessagingShifts20260827R1={model:()=>model,refresh:()=>install(model)};install(model);keepMounted(model);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error),{once:true});else init().catch(console.error);
}());
