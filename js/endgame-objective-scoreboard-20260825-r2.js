'use strict';
(function EndgameObjectiveScoreboard20260825R2(){
  const DATA='./data/endgame-us-objectives-20260825-r1.json?v=20260825-r2';
  const LIVE='./data/endgame-current-20260825-r2.json?v=20260825-r4';
  const CORR='./data/endgame-objective-score-corrections-20260825-r4.json?v=20260825-r4';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const safe=u=>{try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:null}catch{return null;}};
  const J=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}: ${r.status}`);return r.json();};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let data=null,live=null,corr=null;

  function applyCorrections(){
    (corr?.us_overrides||[]).forEach(o=>{
      const x=(data?.us_objectives||[]).find(v=>v.objective===o.match);
      if(!x)return;
      if(o.objective)x.objective=o.objective;
      x.score=o.score;
      if(o.status)x.status=o.status;
      if(o.assessment)x.assessment=o.assessment;
      if(o.origin)x.origin=o.origin;
      if(o.source_ids)x.source_ids=o.source_ids;
    });
    (corr?.iran_overrides||[]).forEach(o=>{
      const x=(data?.iran_objectives||[]).find(v=>v.objective===o.match);
      if(!x)return;
      if(o.objective)x.objective=o.objective;
      x.score=o.score;
      if(o.status)x.status=o.status;
      if(o.assessment)x.assessment=o.assessment;
      if(o.origin)x.origin=o.origin;
      if(o.source_ids)x.source_ids=o.source_ids;
    });
  }
  function source(id){return corr?.sources?.[id]||data?.sources?.[id]||live?.sources?.[id]||window.ISREndgamePublicViewR1?.model?.()?.sources?.[id]||null;}
  function chips(parent,ids){
    const box=E('div','eg3-sources');let count=0;
    (ids||[]).forEach(id=>{const s=source(id),u=safe(s?.url);if(!s||!u)return;const a=E('a','eg3-source-chip',`${id} · ${s.publisher||s.outlet||'source'}`);a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.title=`${s.date||''} · ${s.quality||''} · ${s.supports||s.note||''}`;box.append(a);count++;});
    if(count)parent.append(box);
  }
  function meter(score){
    const wrap=E('div','eg25-score-wrap');
    if(score==null){
      const m=E('span','eg25-meter eg25-meter-unscored');m.setAttribute('role','img');m.setAttribute('aria-label','Unscored: current evidence does not establish an adjudicable outcome');
      for(let i=1;i<=4;i++)m.append(E('i',''));
      wrap.append(m,E('span','eg25-score','UNSCORED'));return wrap;
    }
    const m=E('span','eg25-meter');const v=Math.max(0,Math.min(4,Number(score)||0));
    m.setAttribute('role','img');m.setAttribute('aria-label',`${v} of 4 on the Atlas objective-outcome evidence scale`);
    for(let i=1;i<=4;i++)m.append(E('i',i<=v?'on':''));
    wrap.append(m,E('span','eg25-score',`${v} / 4`));return wrap;
  }
  function objectiveCard(x){
    const card=E('article','eg3-card eg25-objective-card');
    const top=E('div','eg25-objective-top');top.append(E('h5','',x.objective),meter(x.score));card.append(top);
    const badge=E('span','eg3-badge eg3-assessment',x.status||'UNRATED');card.append(badge);
    if(x.origin)card.append(E('div','eg25-origin',`Original benchmark · ${x.origin}`));
    card.append(E('p','',x.assessment));chips(card,x.source_ids);return card;
  }
  function tally(items){
    const all=items||[];
    const adjudicable=all.filter(x=>x.score!=null);
    const points=adjudicable.reduce((sum,x)=>sum+Math.max(0,Math.min(4,Number(x.score)||0)),0);
    const available=adjudicable.length*4;
    return {
      documented:all.length,
      adjudicable:adjudicable.length,
      unresolved:all.length-adjudicable.length,
      points,
      available,
      percent:available?((points/available)*100):null
    };
  }
  function tallySide(label,items){
    const t=tally(items),card=E('article','eg3-card eg25-tally-card');
    card.append(E('h4','',label));
    const grid=E('div','eg25-tally-metrics');
    const metric=(value,name)=>{const m=E('div','eg25-tally-metric');m.append(E('strong','',value),E('span','',name));return m;};
    grid.append(
      metric(`${t.adjudicable} / ${t.documented}`,'objectives adjudicable'),
      metric(`${t.points} / ${t.available}`,'points on adjudicable objectives'),
      metric(t.percent==null?'—':`${t.percent.toFixed(1)}%`,'unweighted tally'),
      metric(String(t.unresolved),'unresolved / excluded')
    );
    card.append(grid);
    return card;
  }
  function tallySummary(){
    const sec=E('section','eg25-tally-summary');sec.dataset.eg25ObjectiveTally='1';
    const head=E('div','eg25-tally-head');head.append(E('h4','','Current objective tally'),E('p','eg3-muted','Only adjudicable objectives enter the point denominator. UNSCORED lanes are excluded rather than treated as zero.'));
    sec.append(head);
    const grid=E('div','eg25-tally-grid');grid.append(tallySide('United States',data.us_objectives),tallySide('Iran',data.iran_objectives));sec.append(grid);
    sec.append(E('p','eg3-warning-text eg25-no-composite','Unweighted objective tally — not a strategic-weight victory index. Each scored objective contributes at most four points regardless of its strategic ambition, so use this as a compact status summary, not as a claim that every objective is equally important.'));
    return sec;
  }
  function side(title,dek,items){
    const box=E('div','eg25-objective-side');const h=E('div','eg25-objective-side-head');h.append(E('h4','',title),E('p','eg3-muted',dek));box.append(h);
    const grid=E('div','eg25-objective-grid');(items||[]).forEach(x=>grid.append(objectiveCard(x)));box.append(grid);return box;
  }
  function scaleLegend(){
    const wrap=E('div','eg25-scale');
    const u=E('div','eg25-scale-item');u.append(E('strong','','UNSCORED'),E('span','','Current evidence does not yet create an adjudicable end state. Do not convert absence of a score into 0/4.'));wrap.append(u);
    (data.scale||[]).forEach(x=>{const c=E('div','eg25-scale-item');c.append(E('strong','',`${x.score}/4 · ${x.label}`),E('span','',x.meaning));wrap.append(c);});return wrap;
  }
  function walkbacks(){
    const sec=E('article','eg3-card eg25-walkbacks');sec.append(E('h4','','Iran objective walk-backs · original benchmark stays on the board'));
    (data.iran_walkbacks||[]).forEach(x=>{const row=E('div','eg25-walkback');const left=E('div','');left.append(E('div','eg25-walk-date',x.date),E('span','eg25-walk-type',x.type));const from=E('div','');from.append(E('strong','','FROM'),E('p','',x.from));const to=E('div','');to.append(E('strong','','TO'),E('p','',x.to));row.append(left,from,to);sec.append(row);if(x.assessment)sec.append(E('p','eg3-warning-text',x.assessment));chips(sec,x.source_ids);});return sec;
  }
  function build(){
    const s=E('section','eg3-section eg25-objective-board');s.dataset.eg25ObjectiveScoreboard='1';
    const head=E('div','eg3-section-head');head.append(E('h3','',data.title),E('p','',data.dek));s.append(head);
    if(corr?.method_note)s.append(E('p','eg3-warning-text eg25-no-composite',corr.method_note));
    s.append(tallySummary());
    s.append(scaleLegend());
    s.append(side('United States · documented objectives','Official sources define the objective; independent and cross-source evidence grades the outcome. The score threshold matches the objective actually stated — degradation is not graded against eradication.',data.us_objectives));
    s.append(side('Iran · original victory conditions','Later, easier claims do not reset the benchmark. Each original condition stays visible and is graded against the current record. Restorative conditions are explicitly labeled so they are not mistaken for equivalent-weight strategic prizes.',data.iran_objectives));
    s.append(walkbacks());
    const not=E('article','eg3-card');not.append(E('h4','','What was not a required U.S. victory condition'));const ul=E('ul','eg25-us-not-list');(data.not_documented_as_required_us_victory_conditions||[]).forEach(x=>ul.append(E('li','',x)));not.append(ul);chips(not,['US1','US2','US3']);s.append(not);
    const sem=E('article','eg3-card eg3-finding');sem.append(E('h4','',data.semantic_test.title),E('p','',data.semantic_test.text));chips(sem,data.semantic_test.source_ids);s.append(sem);
    s.append(E('p','eg3-warning-text eg25-no-composite',data.precision_note));return s;
  }
  function install(){
    const shell=$('#endgame .eg3-shell');if(!shell||!data||!live||!corr)return false;
    $('[data-eg25-us-objectives]',shell)?.remove();$('[data-eg25-objective-scoreboard]',shell)?.remove();
    const overview=$('[data-eg25-endgame-overview]',shell),tabs=$('.eg3-subnav',shell),board=build();
    if(overview&&overview.nextSibling)shell.insertBefore(board,overview.nextSibling);else if(tabs)shell.insertBefore(board,tabs);else shell.prepend(board);return true;
  }
  async function init(){
    [data,live,corr]=await Promise.all([J(DATA),J(LIVE),J(CORR)]);applyCorrections();
    for(let i=0;i<100;i++){if($('#endgame .eg3-shell'))break;await sleep(60);}install();
    const root=$('#endgame');if(root){const mo=new MutationObserver(m=>{const oldAppeared=m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('[data-eg25-us-objectives]')||n.matches?.('.eg3-shell')||n.querySelector?.('[data-eg25-us-objectives]'))));if(oldAppeared)setTimeout(install,80);});mo.observe(root,{childList:true,subtree:true});}
    window.ISREndgameObjectiveScoreboardR2={refresh:install,data:()=>data,corrections:()=>corr,tallies:()=>({us:tally(data?.us_objectives||[]),iran:tally(data?.iran_objectives||[])})};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error),{once:true});else init().catch(console.error);
}());
