'use strict';
(function EndgameThreeAngles20260825R3(){
  const DATA='./data/endgame-current-20260825-r2.json?v=20260825-r4';
  const US_DATA='./data/endgame-us-objectives-20260825-r1.json?v=20260825-r1';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const safe=u=>{try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:null}catch{return null;}};
  const J=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}: ${r.status}`);return r.json();};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let live=null,us=null;

  function source(id){return us?.sources?.[id]||live?.sources?.[id]||window.ISREndgamePublicViewR1?.model?.()?.sources?.[id]||null;}
  function chips(parent,ids){
    const box=E('div','eg3-sources');let count=0;
    (ids||[]).forEach(id=>{const s=source(id),u=safe(s?.url);if(!s||!u)return;const a=E('a','eg3-source-chip',`${id} · ${s.publisher}`);a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.title=`${s.date||''} · ${s.quality||''} · ${s.supports||''}`;box.append(a);count++;});
    if(count)parent.append(box);
  }
  function findSection(panel,prefix){return $$('section.eg3-section',panel).find(s=>($('h3',s)?.textContent||'').trim().startsWith(prefix));}

  function makeOverview(){
    const s=E('section','eg3-section eg25-endgame-overview');s.dataset.eg25EndgameOverview='1';
    const head=E('div','eg3-section-head');head.append(E('h3','','What this board shows'),E('p','','The scoreboard is strategic position, not mere state survival.'));s.append(head);
    const card=E('article','eg3-card eg3-finding eg25-overview-card');
    const p1=E('p','eg25-overview-thesis','Iran has not been destroyed and retains meaningful coercive capability. But survival is increasingly the principal accomplishment Tehran can point to, while several of the strategic objectives that were supposed to make that survival advantageous have weakened, failed, or been replaced by less favorable arrangements.');
    const p2=E('p','eg25-overview-thesis','And that is why the “we did not capitulate” rhetoric matters so much. If Tehran were actually emerging with its original bargaining position intact, it would not need to redefine victory around continued existence and a face-saving account of concessions.');
    const rule=E('p','eg3-warning-text eg25-overview-rule','How to read Atlas: actor claims show the story each side wants told. They do not decide the board. Observable behavior, implemented arrangements, economic and military effects, and changes in bargaining position carry the analytical weight. The board does not invent hypothetical victories or motives to offset recorded outcomes.');
    card.append(p1,p2,rule);chips(card,['S01','S06','S07','S14','S15','S16','S24','S25','S27','S32']);s.append(card);
    return s;
  }

  function makeUSObjectives(){
    const s=E('section','eg3-section eg25-us-objectives');s.dataset.eg25UsObjectives='1';
    const head=E('div','eg3-section-head');head.append(E('h3','',us.title),E('p','',us.dek));s.append(head);
    const grid=E('div','eg25-three-angle-grid');
    (us.documented_objectives||[]).forEach(x=>{
      const card=E('article','eg3-card eg25-angle');
      const top=E('div','eg25-angle-head');top.append(E('h4','',x.objective),E('span','eg3-badge eg3-assessment',x.status));
      card.append(top,E('p','eg25-angle-assessment',x.explanation));chips(card,x.source_ids);grid.append(card);
    });
    s.append(grid);

    const not=E('article','eg3-card eg25-proof');not.append(E('h4','','What was not a required U.S. victory condition'));
    const ul=E('ul','eg25-objective-list');(us.not_documented_as_required_victory_conditions||[]).forEach(x=>ul.append(E('li','',x)));not.append(ul);chips(not,['US1','US2','US3']);s.append(not);

    const semantics=E('article','eg3-card eg3-finding eg25-proof');semantics.append(E('h4','',us.semantic_test.title),E('p','eg25-angle-assessment',us.semantic_test.text));chips(semantics,us.semantic_test.source_ids);s.append(semantics);
    s.append(E('p','eg3-warning-text eg25-precision',us.precision_note));
    return s;
  }

  function installTop(){
    const shell=$('#endgame .eg3-shell');if(!shell||!live||!us)return false;
    $('[data-eg25-endgame-overview]',shell)?.remove();$('[data-eg25-us-objectives]',shell)?.remove();
    const tabs=$('.eg3-subnav',shell);const overview=makeOverview();const objectives=makeUSObjectives();
    if(tabs){shell.insertBefore(overview,tabs);shell.insertBefore(objectives,tabs);}else{shell.prepend(objectives);shell.prepend(overview);}return true;
  }

  function makeSection(){
    const s=E('section','eg3-section eg25-three-angles');s.dataset.eg25ThreeAngles='1';
    const head=E('div','eg3-section-head');head.append(E('h3','','Iran’s three live paths · position test'),E('p','','This grades Tehran against its own stated objectives and observable behavior — not against a claim of unconditional surrender. The question is whether each path is improving, holding, or weakening Iran’s bargaining position.'));s.append(head);
    const proof=E('article','eg3-card eg25-proof');proof.append(E('h4','','The core contradiction: Iran is doing what it says pressure cannot make it do'));
    const chain=E('div','eg25-proof-chain');
    const a=E('div','eg25-proof-step');a.append(E('strong','','IRAN SAYS'),E('p','','Washington must stop coercion, restore the old bargain, or visibly move first before Tehran can return to a political process.'));
    const b=E('div','eg25-proof-step');b.append(E('strong','','IRAN HAS ALREADY DONE'),E('p','','Validated Pakistan’s mediation and accepted a joint Oman implementation process while the old MOU remains dead and its prior economic concessions have not simply been restored.'));
    const c=E('div','eg25-proof-step');c.append(E('strong','','WHAT THE RECORD MEANS'),E('p','','Measured against Iran’s own prior terms, Tehran has already moved before Washington restored what Tehran demanded. That is a concession — and, in bargaining terms, capitulation from the prior position — even if Iran packages the move as reciprocity or “negotiating from strength.” It is not unconditional surrender of Iran as a state.'));
    chain.append(a,b,c);proof.append(chain);chips(proof,['S06','S24','S25','S27','S32']);s.append(proof);
    const grid=E('div','eg25-three-angle-grid');
    (live.three_angle_status||[]).forEach(x=>{
      const card=E('article',`eg3-card eg25-angle state-${x.state||'mixed'}`);const top=E('div','eg25-angle-head');top.append(E('h4','',x.angle),E('span','eg3-badge eg3-assessment',x.status));card.append(top,E('p','eg25-angle-assessment',x.assessment));
      const why=E('div','eg25-why');why.append(E('strong','','Why'),E('p','',x.why));card.append(why);chips(card,x.source_ids);grid.append(card);
    });
    s.append(grid);
    s.append(E('p','eg3-warning-text eg25-precision','Precision note: “capitulation” here means retreat from Iran’s previously stated negotiating position under external pressure. It does not mean regime surrender, disarmament, occupation, or proof that every Iranian objective has failed.'));
    return s;
  }
  function install(){
    const panel=$('#endgame [data-eg3-panel="strategic"]');if(!panel||!live)return false;
    $('[data-eg25-three-angles]',panel)?.remove();
    const s=makeSection();const lenses=findSection(panel,'Two non-duplicative views');lenses?panel.insertBefore(s,lenses):panel.prepend(s);return true;
  }
  function refresh(){installTop();install();}
  async function init(){
    [live,us]=await Promise.all([J(DATA),J(US_DATA)]);
    for(let i=0;i<80;i++){if($('#endgame [data-eg3-panel="strategic"]')&&window.ISREndgamePublicViewR1?.model?.())break;await sleep(75);}
    refresh();
    const root=$('#endgame');if(root){const mo=new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&n.matches?.('.eg3-shell'))))setTimeout(refresh,60);});mo.observe(root,{childList:true});}
    window.ISREndgameThreeAnglesR3={refresh,live:()=>live,us:()=>us};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error),{once:true});else init().catch(console.error);
}());
