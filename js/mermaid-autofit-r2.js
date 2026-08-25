'use strict';
(function ISRMermaidAutoFitR2(){
  const $=(s,r=document)=>r.querySelector(s);
  const HOSTS=['#egMermaidHost','#eg3CausalHost'];
  const fittedSvg=new WeakMap();
  const observedHosts=new WeakSet();
  let queued=false,rootObserver=null;

  function visible(host){
    if(!host||!host.isConnected)return false;
    const r=host.getBoundingClientRect();
    const cs=getComputedStyle(host);
    return r.width>=240&&r.height>=220&&cs.display!=='none'&&cs.visibility!=='hidden';
  }
  function svgFor(host){return host?.querySelector('.eg-graph-canvas svg,.eg3-causal-canvas svg');}
  function ensureHint(host){
    if(!host)return;
    const existing=host.parentElement?.querySelector(`:scope > .isr-mermaid-help[data-for="${host.id}"]`);
    if(existing){host.setAttribute('aria-describedby',existing.id);return;}
    const hint=document.createElement('div');
    hint.className='isr-mermaid-help';
    hint.dataset.for=host.id;
    hint.id=`${host.id}Help`;
    hint.textContent='FIT shows the whole chart · − / + zoom · drag the chart to pan · click a node to review its evidence and details.';
    host.before(hint);
    host.setAttribute('aria-describedby',hint.id);
  }
  function fitVisible(host,svg,attempt=0){
    if(!host||!svg||svgFor(host)!==svg)return;
    if(!visible(host)){
      if(attempt<30)setTimeout(()=>fitVisible(host,svg,attempt+1),50);
      return;
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(svgFor(host)!==svg||!visible(host))return;
      window.ISRTrueMermaidFitR1?.fit?.(host);
      host.scrollTo?.({left:0,top:0,behavior:'auto'});
      fittedSvg.set(host,svg);
      host.dataset.autoFitR2='1';
    }));
  }
  function inspect(host){
    if(!host)return;
    ensureHint(host);
    if(!observedHosts.has(host)&&window.ResizeObserver){
      observedHosts.add(host);
      const ro=new ResizeObserver(()=>{
        const svg=svgFor(host);
        if(svg&&fittedSvg.get(host)!==svg&&visible(host))fitVisible(host,svg);
      });
      ro.observe(host);
    }
    const svg=svgFor(host);
    if(svg&&fittedSvg.get(host)!==svg)fitVisible(host,svg);
  }
  function run(){queued=false;HOSTS.forEach(sel=>inspect($(sel)));}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(run);}
  function observeEndgame(){
    const root=$('#endgame');
    if(!root)return false;
    rootObserver?.disconnect();
    rootObserver=new MutationObserver(schedule);
    rootObserver.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
    schedule();
    return true;
  }
  function watch(){
    if(!observeEndgame()){
      const bootstrap=new MutationObserver(()=>{if(observeEndgame())bootstrap.disconnect();});
      bootstrap.observe(document.documentElement,{childList:true,subtree:true});
    }
    addEventListener('resize',schedule,{passive:true});
    addEventListener('hashchange',()=>setTimeout(schedule,0));
    document.addEventListener('click',e=>{
      if(e.target.closest?.('.eg3-subtab,.eg3-lens-btn,.isr-workspace-nav button,.secondary-tab,.primary-tab'))setTimeout(schedule,0);
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
  window.ISRMermaidAutoFitR2={refresh:schedule};
}());
