'use strict';
(function ISRPublicHousekeepingR1(){
  if(window.__ISR_PUBLIC_HOUSEKEEPING_R1__)return;
  window.__ISR_PUBLIC_HOUSEKEEPING_R1__=true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const safe=u=>{try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:null}catch{return null;}};
  let queued=false,observer=null,pendingAuditClaim=null;

  function sourceMap(){
    const out={};
    const base=window.ISREndgamePublicViewR1?.model?.()?.sources||{};
    const live=window.ISREndgameCurrentR2?.live?.()?.sources||{};
    Object.assign(out,base,live);
    (window.ATLAS_CURRENT_UPDATE_20260827?.sources||[]).forEach(s=>{
      out[s.source_id]={id:s.source_id,publisher:s.outlet,date:s.publication_date,url:s.url,quality:s.quality,supports:s.proof_note||s.title};
    });
    return out;
  }
  function chips(parent,ids){
    const map=sourceMap(),resolved=(ids||[]).filter(id=>map[id]&&safe(map[id].url));
    const sig=resolved.join('|');if(parent.dataset.ph1SourceSig===sig&&$(':scope > .ph1-sources',parent))return;
    parent.dataset.ph1SourceSig=sig;$(':scope > .ph1-sources',parent)?.remove();
    if(!resolved.length)return;
    const box=E('div','eg3-sources ph1-sources');
    resolved.forEach(id=>{const s=map[id],u=safe(s.url);const a=E('a','eg3-source-chip',`${id} · ${s.publisher||'Source'}`);a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.title=`${s.date||''} · ${s.quality||''} · ${s.supports||''}`;box.append(a);});
    parent.append(box);
  }
  function section(panel,idOrTitle){
    if(!panel)return null;
    return $$('section.eg3-section',panel).find(s=>s.dataset.eg4Section===idOrTitle||($('h3',s)?.textContent||'').trim().startsWith(idOrTitle))||null;
  }
  function resetNodeFocus(host){
    const svg=host?.querySelector('svg');if(!svg)return;
    const original=svg.dataset.ph1OriginalViewBox;if(original)svg.setAttribute('viewBox',original);
    svg.removeAttribute('data-ph1-focus');
    host.querySelectorAll('g.node.ph1-node-focus').forEach(n=>n.classList.remove('ph1-node-focus'));
    host.parentElement?.querySelector(`.ph1-graph-focus[data-for="${host.id}"]`)?.remove();
    requestAnimationFrame(()=>window.ISRTrueMermaidFitR1?.fit?.(host));
  }
  function associatedTarget(host){
    if(host?.id==='eg3CausalHost')return $('#eg3EvidenceDrawer');
    return $('#endgame .eg-ledger.selected')||$('#endgame .eg-ledger[aria-pressed="true"]');
  }
  function focusNode(host,node){
    const svg=host?.querySelector('svg');if(!host||!svg||!node?.getBBox)return false;
    if(!svg.dataset.ph1OriginalViewBox){const vb=svg.getAttribute('viewBox');if(vb)svg.dataset.ph1OriginalViewBox=vb;}
    let b;try{b=node.getBBox();}catch{return false;}
    const hostRect=host.getBoundingClientRect(),aspect=Math.max(.8,hostRect.width/Math.max(1,hostRect.height));
    let w=Math.max(260,b.width*4.4),h=Math.max(190,b.height*6.2);if(w/h<aspect)w=h*aspect;else h=w/aspect;
    const cx=b.x+b.width/2,cy=b.y+b.height/2;
    svg.setAttribute('viewBox',`${cx-w/2} ${cy-h/2} ${w} ${h}`);svg.dataset.ph1Focus='1';
    $$('g.node.ph1-node-focus',svg).forEach(n=>n.classList.remove('ph1-node-focus'));node.classList.add('ph1-node-focus');
    let bar=host.parentElement?.querySelector(`.ph1-graph-focus[data-for="${host.id}"]`);
    if(!bar){bar=E('div','ph1-graph-focus');bar.dataset.for=host.id;host.before(bar);}
    bar.replaceChildren();
    const label=(node.textContent||node.dataset.nodeId||node.dataset.claimIds||'Selected node').replace(/\s+/g,' ').trim();
    bar.append(E('strong','','FOCUSED NODE'),E('span','',label));
    const details=E('button','','Open associated information');details.type='button';details.onclick=()=>associatedTarget(host)?.scrollIntoView({behavior:'smooth',block:'center'});
    const full=E('button','','Show full chart');full.type='button';full.onclick=()=>resetNodeFocus(host);
    bar.append(details,full);
    return true;
  }
  function selectedLedgerFor(claim){
    return $$('#endgame .eg-ledger').find(l=>l.dataset.claimId===claim&&(l.classList.contains('selected')||l.getAttribute('aria-pressed')==='true'))||null;
  }
  function settleAuditFocus(claim,attempt=0){
    if(!claim||pendingAuditClaim!==claim)return;
    const host=document.getElementById('egMermaidHost');
    const target=host&&$$('g.node[role="button"]',host).find(n=>(n.dataset.claimIds||'').split(',').includes(claim));
    if(host&&target?.isConnected&&selectedLedgerFor(claim)){
      installGraphInteraction();
      if(focusNode(host,target))pendingAuditClaim=null;
      return;
    }
    if(attempt<32)setTimeout(()=>settleAuditFocus(claim,attempt+1),75);
  }

  function installGraphInteraction(){
    ['eg3CausalHost','egMermaidHost'].forEach(id=>{
      const host=document.getElementById(id);if(!host)return;
      const svg=$('svg',host);if(svg&&!svg.dataset.ph1OriginalViewBox){const vb=svg.getAttribute('viewBox');if(vb)svg.dataset.ph1OriginalViewBox=vb;}
      $$('g.node[role="button"]',host).forEach(n=>{n.classList.add('ph1-drill-node');n.title='Open associated evidence/data and focus this part of the chart';});
    });
  }

  function strictLensSwap(){
    const panel=$('#endgame [data-eg3-panel="strategic"]');const maps=section(panel,'maps')||section(panel,'Two ways to read the endgame');if(!maps)return;
    maps.classList.add('ph1-lens-swap');
    const buttons=$$('[data-eg3-lens]',maps),panels=$$('[data-eg3-lens-panel]',maps);
    const sync=()=>{
      const active=buttons.find(b=>b.classList.contains('active'))?.dataset.eg3Lens||'causal';
      buttons.forEach(b=>{const on=b.dataset.eg3Lens===active;b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-selected',String(on));});
      panels.forEach(p=>{const on=p.dataset.eg3LensPanel===active;p.hidden=!on;p.setAttribute('aria-hidden',String(!on));});
      maps.dataset.ph1Lens=active;setTimeout(installGraphInteraction,80);
    };
    buttons.forEach(b=>{if(b.dataset.ph1SwapBound==='1')return;b.dataset.ph1SwapBound='1';b.addEventListener('click',()=>setTimeout(sync,0));});sync();
  }

  function strategicOrder(){
    const panel=$('#endgame [data-eg3-panel="strategic"]');if(!panel)return;
    const jumps=$(':scope > .eg4-jumps',panel),status=section(panel,'status')||section(panel,'Where things stand now'),quick=section(panel,'quick')||section(panel,'Start here'),paths=section(panel,'paths')||section(panel,'Iran’s three live paths'),next=section(panel,'next')||section(panel,'What can happen next');
    if(status){const anchor=jumps?.nextSibling||panel.firstChild;if(status!==anchor)panel.insertBefore(status,anchor);status.classList.add('ph1-status-first');}
    if(quick&&status?.nextSibling!==quick)status?.after(quick);
    if(paths&&next){
      paths.classList.add('ph1-path-source');next.classList.add('ph1-path-derived');
      let connector=$('.ph1-path-connector',panel);if(!connector){connector=E('div','ph1-path-connector');connector.append(E('span','','IRAN’S AVAILABLE PATHS'),E('b','','↓ drives ↓'),E('span','','WHAT HAPPENS NEXT'));}
      const anchor=quick||status;if(anchor&&anchor.nextSibling!==paths)anchor.after(paths);
      if(paths.nextSibling!==connector)paths.after(connector);if(connector.nextSibling!==next)connector.after(next);
    }
    if(jumps){const order=['Current status','Quick read','Iran’s paths','Next moves','Objectives','Maps / audit'];const nodes=$$('button',jumps);order.forEach(label=>{const b=nodes.find(x=>(x.textContent||'').trim()===label);if(b)jumps.append(b);});}
  }

  function ensureMouStatus(panel){
    let sec=$('[data-ph1-mou-status]',panel);if(!sec){
      sec=E('section','eg3-section ph1-mou-status');sec.dataset.ph1MouStatus='1';
      const head=E('div','eg3-section-head');head.append(E('h3','','Status first: the June MOU is effectively dead'),E('p','','The old instrument can still be cited in negotiations, but it no longer controls the parties by itself.'));sec.append(head);
      const card=E('article','eg3-card eg3-finding ph1-mou-status-card');card.dataset.ph1Sources='S01,S05,S06,S23';card.append(E('span','eg3-badge eg3-dead','DEAD / NON-CONTROLLING'));
      const ul=E('ul','eg3-list');[
        'Paragraph 3 created a 60-day route to a final deal and allowed an extension only by mutual agreement.',
        'Washington subsequently declared the MOU “over.” Iran later described it as “suspended,” but that is only one party’s characterization of a bilateral instrument.',
        'No mutually agreed extension or final controlling agreement replaced the expired 60-day bargain. Iran can invoke the old terms as a negotiating baseline; it cannot revive them unilaterally.'
      ].forEach(t=>ul.append(E('li','',t)));card.append(ul);sec.append(card);
    }
    const card=$('.ph1-mou-status-card',sec);if(card)chips(card,(card.dataset.ph1Sources||'').split(',').filter(Boolean));
    const jumps=$(':scope > .eg4-jumps',panel);const first=jumps?.nextSibling||panel.firstChild;if(sec!==first)panel.insertBefore(sec,first);
  }

  function patchMouAttribution(panel){
    const timeline=section(panel,'timeline')||section(panel,'How the MOU fell apart');if(!timeline)return;
    const row=$$('.eg3-timeline-row',timeline).find(r=>/Jul\s*7/i.test($('.eg3-date',r)?.textContent||''));if(!row)return;
    const body=row.children[1]||row;const h=$('h4',body);if(h)h.textContent='Three tankers attacked; U.S. and Qatar attribute the attacks to Iran; U.S. strikes and revokes oil relief';
    let note=$('.ph1-attribution',body);if(!note){note=E('div','ph1-attribution');note.dataset.ph1Sources='S04,S05';note.append(E('strong','','ATTRIBUTION / CAUSAL LINK'),E('p','','U.S. initial indications said Iran fired on the vessels, and Qatar blamed Iran. Tehran disputed the attribution while warning that ships using routes not coordinated with Iran faced risk. The record therefore does not read as a random attack followed by an unrelated U.S. withdrawal: the vessel attacks, the attribution to Iran, Iran’s route warning, the U.S. strike/oil-waiver revocation and Washington’s subsequent “MOU is over” declaration form the relevant sequence.'));body.append(note);}
    chips(note,(note.dataset.ph1Sources||'').split(',').filter(Boolean));
  }

  function removeRedundantPills(panel){
    const p5=section(panel,'p5')||section(panel,'Paragraph 5');if(!p5)return;
    $$('.eg3-four-tests .eg3-badge.eg3-assessment',p5).forEach(b=>b.remove());
  }

  function clarifyMouAfterlife(panel){
    const now=section(panel,'now')||section(panel,'Why the old MOU still matters');if(!now)return;
    let block=$('.ph1-mou-actors',now);if(!block){
      block=E('div','ph1-mou-actors');const cards=[
        ['WASHINGTON','The June instrument is no longer controlling, so its old relief package is not an automatic U.S. starting obligation. Washington is negotiating any successor arrangement from the post-collapse record, not from a presumption that the June concessions simply resume.','S05,S06,S31'],
        ['IRAN','The old MOU still gives Tehran a more favorable optical baseline than its current position. Citing it lets Iran describe a successor negotiation as restoration of an agreed bargain rather than movement from weaker terms. But Iran’s own later “suspension” and renewed invocation cannot substitute for the mutual agreement required to extend the bilateral instrument.','S01,S06,S24,S25'],
        ['GCC / MEDIATORS','The old text remains useful as a reference architecture: safe passage, mine-clearing, littoral-state consultation, administration and maritime services can be reused to coax the parties back into a common process. Oman, Pakistan and now Qatar are working from that kind of shared framework rather than validating unilateral permanent Iranian control.','S01,S25,S27,S32,SRC-93B855640581,SRC-25C68ED54E67'],
        ['WHAT CHANGED SINCE JUNE','The record no longer supports treating the June front-loaded package as automatically available to Tehran. Renewed maritime conflict, withdrawn oil relief, broader secondary sanctions and a new shared maritime process have worsened Iran’s bargaining baseline. Any renewed relief now has to be negotiated into a successor bargain. A longer period of observable implementation before major relief is an analytical implication of the changed leverage—not an announced final U.S. term.','S04,S05,S24,S25,S31,S32,SRC-93B855640581']
      ];
      cards.forEach(([title,copy,src])=>{const c=E('article','eg3-card ph1-mou-actor');c.dataset.ph1Sources=src;c.append(E('h4','',title),E('p','',copy));block.append(c);});
      const flow=$('.eg3-flow',now);flow?flow.after(block):$('.eg3-section-head',now)?.after(block);
    }
    $$('.ph1-mou-actor',block).forEach(c=>chips(c,(c.dataset.ph1Sources||'').split(',').filter(Boolean)));
  }

  function fixTalksAgreementButton(){const b=document.getElementById('openAgreementWorkspace');if(b){b.dataset.ph1Fixed='1';b.setAttribute('aria-label','Open the MOU talks and agreements record');}}
  function openAgreement(e){
    const b=e.target.closest?.('#openAgreementWorkspace');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(window.ISREndgamePublicViewR1?.open)window.ISREndgamePublicViewR1.open('mou');else{window.showAtlasPanel?.('endgame');setTimeout(()=>window.ISREndgamePublicViewR1?.selectTab?.('mou',true),80);}
  }

  function mouPunchout(){const panel=$('#endgame [data-eg3-panel="mou"]');if(!panel)return;ensureMouStatus(panel);patchMouAttribution(panel);removeRedundantPills(panel);clarifyMouAfterlife(panel);}
  function apply(){queued=false;fixTalksAgreementButton();strictLensSwap();strategicOrder();mouPunchout();installGraphInteraction();document.documentElement.dataset.publicHousekeepingR1='1';}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(apply);}
  function bind(){
    document.addEventListener('click',openAgreement,true);
    document.addEventListener('click',e=>{
      const node=e.target.closest?.('#eg3CausalHost g.node[role="button"],#egMermaidHost g.node[role="button"]');if(!node)return;
      const host=node.closest('#eg3CausalHost,#egMermaidHost');
      if(host?.id==='egMermaidHost'){
        const claim=(node.dataset.claimIds||'').split(',').find(Boolean)||'';
        if(!claim)return;
        pendingAuditClaim=claim;
        setTimeout(()=>settleAuditFocus(claim),60);
      }else{
        setTimeout(()=>{if(node.isConnected)focusNode(host,node);},60);
      }
    },true);
    document.addEventListener('click',e=>{const fit=e.target.closest?.('.eg3-causal-controls button,.eg-graph-controls button');if(!fit||!/^(FIT)$/i.test((fit.textContent||'').trim()))return;const host=fit.closest('.eg3-causal-controls')?$('#eg3CausalHost'):$('#egMermaidHost');const svg=host?.querySelector('svg');if(svg?.dataset.ph1OriginalViewBox)svg.setAttribute('viewBox',svg.dataset.ph1OriginalViewBox);host?.parentElement?.querySelector(`.ph1-graph-focus[data-for="${host.id}"]`)?.remove();},true);
    window.addEventListener('atlascurrentready20260827',()=>setTimeout(schedule,30));
  }
  function init(){
    apply();bind();observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
    [100,300,900,1800,3500].forEach(ms=>setTimeout(schedule,ms));
    window.ISRPublicHousekeepingR1={apply,focusNode,resetNodeFocus,settleAuditFocus};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());