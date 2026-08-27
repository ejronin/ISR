'use strict';
(function EndgameUxPlainLanguageR1(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let queued=false,observer=null;

  function text(el,value){if(el&&el.textContent!==value)el.textContent=value;}
  function section(panel,keys){
    if(!panel)return null;
    const list=Array.isArray(keys)?keys:[keys];
    return $$('section.eg3-section',panel).find(s=>list.includes(s.dataset.eg4Section)||list.some(k=>( $('h3',s)?.textContent||'').trim().startsWith(k)))||null;
  }
  function renameSection(panel,keys,id,title,dek){
    const s=section(panel,[id,...(Array.isArray(keys)?keys:[keys])]);if(!s)return null;
    s.dataset.eg4Section=id;
    text($('.eg3-section-head h3',s),title);
    if(dek!=null)text($('.eg3-section-head p',s),dek);
    return s;
  }
  function tabCopy(shell){
    const nav=$('.eg3-subnav',shell);if(!nav)return;
    nav.classList.add('eg4-nav');
    const copy={
      mou:['MOU','What the deal said and what happened'],
      strategic:['STRATEGIC ENDGAME','What each side wanted and where it landed'],
      public:['PUBLIC VIEW','Polling, household cost and claims vs record']
    };
    $$('[data-eg3-tab]',nav).forEach(b=>{
      const c=copy[b.dataset.eg3Tab];if(!c)return;
      if(!b.classList.contains('eg4-nav-card')){
        const strong=document.createElement('strong'),span=document.createElement('span');
        strong.className='eg4-tab-title';span.className='eg4-tab-dek';
        b.replaceChildren(strong,span);b.classList.add('eg4-nav-card');
      }
      text($('.eg4-tab-title',b),c[0]);text($('.eg4-tab-dek',b),c[1]);
      b.setAttribute('aria-label',`${c[0]} — ${c[1]}`);
    });
  }
  function jumpBar(panel,items){
    if(!panel)return;
    let bar=$(':scope > .eg4-jumps',panel);
    if(!bar){bar=document.createElement('nav');bar.className='eg4-jumps';bar.setAttribute('aria-label','Jump within this ENDGAME section');panel.prepend(bar);}
    if(bar.dataset.eg4JumpKey===items.map(x=>x[0]).join('|'))return;
    bar.replaceChildren();
    items.forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.className='eg4-jump';b.textContent=label;b.onclick=()=>panel.querySelector(`[data-eg4-section="${id}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});bar.append(b);});
    bar.dataset.eg4JumpKey=items.map(x=>x[0]).join('|');
  }
  function wrapDisclosure(node,label,open=false){
    if(!node||node.closest('.eg4-disclosure'))return;
    const d=document.createElement('details'),s=document.createElement('summary');d.className='eg4-disclosure';s.textContent=label;d.append(s);node.before(d);d.append(node);d.open=open;
  }
  function hero(shell){
    text($('.eg3-eyebrow',shell),'Where the war left each side');
    text($('.eg3-hero-copy > p',shell),'Start with the quick read, then use the three sections below for the deal, the strategic outcome, or the public picture.');
    text($('.eg3-meta-box span',shell),'MOU = the deal itself · Strategic Endgame = goals and consequences · Public View = polling, costs and claims.');
  }
  function overview(shell,strategic){
    const o=$('[data-eg25-endgame-overview]',shell);if(!o)return;
    o.dataset.eg4Section='quick';
    if(o.parentElement!==strategic)strategic.prepend(o);
    text($('.eg3-section-head h3',o),'Start here');
    text($('.eg3-section-head p',o),'The short version before the details.');
    const ps=$$('.eg25-overview-thesis',o);
    if(ps[0])text(ps[0],'Iran still has meaningful coercive power. But several goals that were supposed to turn survival into leverage have weakened, failed, or shifted to less favorable terms.');
    if(ps[1])text(ps[1],'Tehran increasingly frames success around survival and continued resistance. Atlas keeps that later rhetoric separate from the original objectives and the current bargaining position.');
    text($('.eg25-overview-rule',o),'How Atlas reads this: claims show what each side wants you to believe. The board is scored from what was implemented, what changed, and what can actually be observed.');
  }
  function objectiveBoard(shell,strategic){
    const board=$('[data-eg25-objective-scoreboard]',shell);if(!board)return;
    board.dataset.eg4Section='objectives';
    const paths=$('[data-eg25-three-angles]',strategic),maps=section(strategic,['maps','Two non-duplicative views','Two ways to read the endgame']);
    if(board.parentElement!==strategic){if(paths)paths.after(board);else if(maps)strategic.insertBefore(board,maps);else strategic.append(board);}
    text($('.eg3-section-head h3',board),'Objectives: what each side actually got');
    text($('.eg3-section-head p',board),'The original goals stay on the board. Only outcomes with enough evidence are scored.');
    const tally=$('.eg25-tally-summary',board);if(tally){text($('.eg25-tally-head h4',tally),'Quick tally');text($('.eg25-tally-head p',tally),'Only objectives with enough evidence are scored. Unresolved ones stay out of the denominator instead of counting as zero.');}
    const labels={
      'objectives adjudicable':'objectives scored',
      'points on adjudicable objectives':'points on scored objectives',
      'unweighted tally':'simple tally',
      'unresolved / excluded':'not scored yet'
    };
    $$('.eg25-tally-metric span',board).forEach(x=>{const k=x.textContent.trim();if(labels[k])text(x,labels[k]);});
    $$('.eg25-no-composite',board).forEach(x=>{if(/Unweighted objective tally/i.test(x.textContent))text(x,'Simple tally only — not a weighted “who won” score. A minor objective and a major objective can both be worth four points here.');});
    if(!$('.eg4-board-guide',board)){const p=document.createElement('p');p.className='eg4-board-guide';p.textContent='Open a section below for the individual objectives, scores and source links.';const t=$('.eg25-tally-summary',board);t?.after(p);}
    wrapDisclosure($('.eg25-scale',board),'How the 0–4 score works');
    $$('.eg25-objective-side',board).forEach(side=>{const h=$('.eg25-objective-side-head h4',side)?.textContent||'';wrapDisclosure(side,/United States/i.test(h)?'U.S. objectives — scores and evidence':'Iran’s original victory conditions — scores and evidence');});
    wrapDisclosure($('.eg25-walkbacks',board),'How Iran’s stated goals changed');
    const not=$$('.eg3-card',board).find(c=>/What was not a required U\.S\. victory condition/i.test($('h4',c)?.textContent||''));wrapDisclosure(not,'What Atlas does not count as a required U.S. win');
  }
  function strategicPanel(shell){
    const panel=$('[data-eg3-panel="strategic"]',shell);if(!panel)return;
    overview(shell,panel);
    const status=renameSection(panel,['Current strategic lanes','Where things stand now'],'status','Where things stand now','Quick read first. Open the sections below when you want the evidence and scoring.');
    const paths=section(panel,['Iran’s three live paths · position test','Iran’s three live paths']);if(paths){paths.dataset.eg4Section='paths';text($('.eg3-section-head h3',paths),'Iran’s three live paths');text($('.eg3-section-head p',paths),'Three ways Tehran can still try to improve its position. Each is measured against Iran’s own stated goals and what it is actually doing.');const proof=$('.eg25-proof',paths);if(proof){text($('h4',proof),'What changed in Iran’s negotiating position');const steps=$$('.eg25-proof-step',proof);const copy=[['Stated position','Tehran said Washington had to stop coercion, restore the old bargain, or move first before Iran could return to a political process.'],['Observed move','Iran then validated Pakistani mediation and accepted a joint Oman process while the old MOU stayed dead and its earlier economic terms were not simply restored.'],['What that means','Iran moved off a previously stated negotiating precondition before Washington restored all of the terms Tehran had demanded. That is movement toward the negotiating process Washington had sought; it is not by itself acceptance of substantive U.S. final terms.']];steps.slice(0,3).forEach((x,i)=>{text($('strong',x),copy[i][0]);text($('p',x),copy[i][1]);});}text($('.eg25-precision',paths),'Movement into mediation is scored only as a change in negotiating position. It is not automatically surrender, disarmament, or acceptance of the other side’s substantive final terms. Washington’s own pre-MOU movement must be established separately from dated evidence.');}
    const maps=renameSection(panel,['Two non-duplicative views','Two ways to read the endgame'],'maps','Two ways to read the endgame','Use the cause → effect map to follow what led to what. Use the objective audit to check the original victory conditions one by one.');
    if(maps){const buttons=$$('[data-eg3-lens]',maps);buttons.forEach(b=>{if(b.dataset.eg3Lens==='causal')text(b,'CAUSE → EFFECT MAP');if(b.dataset.eg3Lens==='audit')text(b,'OBJECTIVE AUDIT');});text($('[data-eg3-lens-panel="causal"] > .eg3-lead',maps),'Follow each line from what Iran wanted, to what it did or said, to what happened, and then to the result. Dotted lines mean a contradiction or failed assumption — not a proven causal link.');const drawer=$('#eg3EvidenceDrawer',maps);if(drawer&&!drawer.dataset.eg4Drawer){text($('h4',drawer),'Details for selected item');text($('p',drawer),'Click a sourced box in the map to see what supports it and how Atlas classifies the evidence.');drawer.dataset.eg4Drawer='1';}}
    renameSection(panel,['What Tehran can still do next','What can happen next'],'next','What can happen next','These are the main paths still open to Tehran. Each one has a way it could help and a way it could backfire.');
    objectiveBoard(shell,panel);
    jumpBar(panel,[['quick','Quick read'],['status','Current status'],['paths','Iran’s paths'],['objectives','Objectives'],['maps','Maps / audit'],['next','Next moves']]);
  }
  function mouPanel(shell){
    const p=$('[data-eg3-panel="mou"]',shell);if(!p)return;
    renameSection(p,['What the agreement actually did','What the MOU was'],'what','What the MOU was','A 60-day interim deal, not a final peace treaty. Here’s what it said, what happened afterward, and what still matters.');
    renameSection(p,['What it said · 14-clause plain-English record','What it said, clause by clause'],'clauses','What it said, clause by clause','Open any clause for the source and the analytical context.');
    renameSection(p,['Who got what','What each side got on paper'],'paper','What each side got on paper','These were the concessions written into the deal. A promise on paper is kept separate from what was later implemented.');
    renameSection(p,['Who did NOT get what','What neither side got','Explicitly not included / rejected'],'notgot','Explicitly not included / rejected','Deferred final-deal questions are shown separately; this section is only for terms the interim text did not grant.');
    const bars=renameSection(p,['Bargaining balance · preserved comparative bars','Who moved how far','Where the signed deal landed'],'bars','Where the signed deal landed','These bars place the signed clause between analyst-defined Iran and U.S. preferred endpoints. They do NOT measure how far either actor moved from a dated pre-MOU position.');
    if(bars){$$('.eg3-bar-row > span',bars).forEach(x=>{if(/Iran concession aid/i.test(x.textContent))text(x,'Iran moved from its start');if(/U\.S\. concession aid/i.test(x.textContent))text(x,'U.S. moved from its start');});}
    const tracks=renameSection(p,['Clause position tracks · signed position vs later reality','Deal position vs what happened later'],'tracks','Deal position vs what happened later','The first marker is the position in the signed MOU. The second shows where implementation later ended up when the evidence supports a comparison.');
    if(tracks){$$('.eg3-pole-labels',tracks).forEach(l=>{const spans=$$('span',l);if(spans[0])text(spans[0],'Closer to Iran’s position');if(spans[1])text(spans[1],'Closer to U.S. position');});$$('.eg3-track-legend span',tracks).forEach(x=>{if(/signed/i.test(x.textContent))text(x,'● deal as signed');if(/later/i.test(x.textContent))text(x,'◇ later reality');});}
    renameSection(p,['When it effectively died','How the MOU fell apart'],'timeline','How the MOU fell apart','Three separate questions matter: when it stopped working, what each side called its status, and whether the old terms still matter in later talks.');
    renameSection(p,['Who killed it?','Why each side says it failed'],'blame','Why each side says it failed','The sequence is easier to establish than anyone’s intent, so the two public explanations stay separate.');
    renameSection(p,['What the evidence says · Paragraph 5','Paragraph 5: what it actually says'],'p5','Paragraph 5: what it actually says','This is the clearest part of the maritime dispute because the language is specific.');
    renameSection(p,['Where the MOU is now','Why the old MOU still matters'],'now','Why the old MOU still matters','The MOU expired, but some of its terms can still be reused if the parties accept them in a new arrangement.');
    const flags=$$('.eg3-inline-flags .eg3-badge',p);flags.forEach(x=>{if(/DOCUMENTARY RECORD/i.test(x.textContent))text(x,'SIGNED RECORD');if(/SUCCESSOR TERMS MAY BE REUSED/i.test(x.textContent))text(x,'TERMS CAN BE REUSED IN A NEW DEAL');});
    jumpBar(p,[['what','What it was'],['clauses','Clauses'],['bars','Where deal landed'],['timeline','How it failed'],['p5','Paragraph 5'],['now','Where it is now']]);
  }
  function publicPanel(shell){
    const p=$('[data-eg3-panel="public"]',shell);if(!p)return;
    const poll=renameSection(p,['Domestic cost & public perception','Public view: costs, polling and claims'],'polling','Public view: costs, polling and claims','Polling, economic data and interviews answer different questions, so Atlas keeps them separate.');
    if(poll){const cards=$$('.eg3-card',poll);cards.forEach(c=>{const h=$('h4',c);if(/GAMAAN survey signals/i.test(h?.textContent||''))text(h,'What the GAMAAN survey found');if(/Methodology matters/i.test(h?.textContent||''))text(h,'How the survey was run');});}
    renameSection(p,['Household cost'],'cost','Household cost','Economic indicators show the broader pressure. Interviews show what that pressure feels like to individual households. Atlas shows both without treating anecdotes as polling.');
    renameSection(p,['Two things can be true'],'both','Two things can be true','Someone can think Iranian policy hurt Iran and also think U.S. or Israeli pressure is harming the country. Those views are not mutually exclusive.');
    renameSection(p,['Claims vs observable record','Claims vs record'],'claims','Claims vs record','Same rule for everyone: a claim is not a fact until the record supports it.');
    renameSection(p,['International narratives are audited too','Claims from the other side get checked too'],'audit','Claims from the other side get checked too','Unsupported U.S., Israeli, Gulf or other claims get the same treatment as unsupported Iranian claims.');
    jumpBar(p,[['polling','Polling'],['cost','Household cost'],['claims','Claims vs record'],['audit','Other narratives']]);
  }
  function shellCopy(shell){hero(shell);tabCopy(shell);strategicPanel(shell);mouPanel(shell);publicPanel(shell);shell.dataset.eg4Ux='plain-language-r1';}
  function run(){queued=false;const shell=$('#endgame .eg3-shell');if(shell)shellCopy(shell);}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(run);}
  function init(){schedule();const root=$('#endgame');if(root){observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});}document.addEventListener('click',e=>{if(e.target.closest?.('[data-eg3-tab],[data-eg3-lens]'))setTimeout(schedule,0);},true);window.ISREndgameUxPlainLanguageR1={refresh:schedule};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
