'use strict';
(function WorkspaceUXPlainLanguageR1(){
  if(window.__ISR_WORKSPACE_UX_PLAIN_R1__)return;
  window.__ISR_WORKSPACE_UX_PLAIN_R1__=true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const setText=(node,text)=>{if(node&&node.textContent!==text)node.textContent=text;};

  const primaryLabels={overview:'Summary',operations:'Military',effects:'Losses & economy',information:'Claims & media',evidence:'Method & history'};
  const secondaryLabels={
    snapshot:'Current picture',timeline:'Open Timeline',endgame:'Open Endgame',facilities:'U.S. sites',strikes:'Strike effects',imagery:'Satellite damage',csis:'Missiles & drones',
    losses:'Verified losses',economy:'Economy',arctic:'Oil routes',claims:'Claim checks',infowar:'Information war',sources:'Open Sources',intro:'Method',historical:'Historical model',history:'Past snapshots'
  };

  function activePeer(){return $('.isr-workspace-nav [data-peer-workspace].active')?.dataset.peerWorkspace||'';}

  function analysisGuide(){
    const nav=$('.analysis-nav');if(!nav)return;
    let guide=$('.isr-analysis-guide');
    if(!guide){
      guide=E('section','isr-workspace-guide isr-analysis-guide');
      guide.append(E('div','isr-workspace-guide-kicker','ANALYSIS'),E('h2','','Pick the question you want answered'),E('p','','Choose a category, then a view. Use Timeline for chronology, Endgame for bargaining and outcomes, and Sources when you want to audit the source base.'));
      nav.parentElement.insertBefore(guide,nav);
    }
    guide.hidden=activePeer()!=='ANALYSIS';
    $('#primaryNav')?.setAttribute('aria-label','Analysis categories');
    $('#secondaryNav')?.setAttribute('aria-label','Views in this analysis category');
    $$('.primary-tab').forEach(b=>{const label=primaryLabels[b.dataset.group];if(label)setText(b,label);});
    $$('.secondary-tab').forEach(b=>{const label=secondaryLabels[b.dataset.tab];if(label)setText(b,label);});
  }

  function atlasGuide(){
    const badge=$('.isr-current-map-badge');if(!badge)return;
    setText($('b',badge),'CURRENT MAP · latest accepted state');
    setText($('span',badge),'Use Layers to turn routes, sites and effects on or off. Click a marker for details. This map shows the current accepted state; use Timeline to look backward.');
  }

  function timelineGuide(){
    const panel=$('#timeline');if(!panel)return;
    const help=$('.isr-timeline-help',panel);
    if(help){
      setText($('summary',help),'Timeline basics');
      setText($('p',help),'Pick a date, then choose how you want to read it. AS OF = what had happened by that date. KNOWN BY = what the public record had established by then. War / Month / Week / Day / Hour changes the time window. Timeline zoom only changes the ruler size; drag the ruler when you zoom in.');
    }
    setText($('.isr-visual-zoom > span',panel),'Timeline zoom');
    const status=$('.isr-timeline-prefetch',panel);
    if(status){
      let t=status.textContent||'';
      t=t.replace(/^Current chronology prefetched\s*·\s*/,'Loaded · ').replace(/^Chronology prefetched$/,'Loaded').replace(/event records/g,'events').replace(/evidence annotations/g,'evidence notes');
      setText(status,t);
    }
    const selected=$('.isr-timeline-selected-confirm',panel);
    if(selected){
      let t=selected.textContent||'';
      if(t==='No chronology record selected.')t='Nothing selected yet. Click a dot or event card.';
      t=t.replace(/confirmed on shared canonical map/g,'shown on the Atlas map').replace(/no canonical map reference/g,'not mapped');
      setText(selected,t);
    }
    $$('.isr-timeline-controls button',panel).forEach(b=>{
      const t=(b.textContent||'').trim().toUpperCase();
      if(t==='AS OF')b.title='Show what had happened by the selected date.';
      if(t==='KNOWN BY')b.title='Show only what public evidence had established by the selected date.';
    });
  }

  function sourcesGuide(){
    const panel=$('#sources');if(!panel)return;
    let guide=$('.isr-sources-guide',panel);
    if(!guide){
      guide=E('section','isr-workspace-guide isr-sources-guide');
      guide.append(E('div','isr-workspace-guide-kicker','SOURCES'),E('h2','','How to read this page'),E('p','','Search or filter by outlet. The source card tells you what the outlet contributed, what kind of source it is, and any independent publisher rating we could verify. A publisher rating never changes the evidence grade of a specific claim.'));
      const grid=E('div','isr-source-guide-grid');
      [['Evidence','What this source actually supports in the Atlas.'],['Publisher context','Ground News, AllSides or Ad Fontes describe the outlet, not the individual article.'],['Source type','Official, wire, state media, research, OSINT and other provenance stay separate from political bias.']].forEach(([h,p])=>{const c=E('div','isr-source-guide-card');c.append(E('strong','',h),E('span','',p));grid.append(c);});
      guide.append(grid);panel.prepend(guide);
    }
    $$('.isr-ground-gauge',panel).forEach(box=>{
      const title=$('.isr-ground-title',box);if(title){let t=title.textContent||'';t=t.replace(/^Ground News bias:\s*/,'Publisher bias · Ground News: ').replace(/^NOT measured by Ground News$/,'No Ground News rating');setText(title,t);}
      const fact=$('.isr-ground-factuality',box);if(fact){let t=fact.textContent||'';if(/^Factuality:/.test(t))t=t.replace(/^Factuality:/,'Ground News factuality:');setText(fact,t);}
      const note=$('small',box);if(note){const rated=!/No Ground News rating/i.test(title?.textContent||'');setText(note,rated?'Publisher-level context only. It does not rate this article or change the Atlas evidence grade.':'No audited Ground News publisher profile is attached here. Atlas does not guess a rating.');}
    });
  }

  function refresh(){analysisGuide();atlasGuide();timelineGuide();sourcesGuide();}
  function queueRefresh(){setTimeout(refresh,0);setTimeout(refresh,90);}

  function bind(){
    const interactive='.isr-workspace-nav,.analysis-nav,#timeline,#sources';
    document.addEventListener('click',e=>{if(e.target.closest(interactive))queueRefresh();},true);
    document.addEventListener('input',e=>{if(e.target.closest('#timeline,#sources'))queueRefresh();},true);
    document.addEventListener('change',e=>{if(e.target.closest('#timeline,#sources'))queueRefresh();},true);
    window.AtlasState?.subscribe?.(queueRefresh);
  }

  function init(){
    let tries=0;const timer=setInterval(()=>{refresh();tries++;if((($('.isr-workspace-nav')&&$('.analysis-nav')&&$('#timeline')&&$('#sources')))||tries>=80)clearInterval(timer);},100);
    refresh();bind();
    window.ISRWorkspaceUXPlainR1={refresh};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
