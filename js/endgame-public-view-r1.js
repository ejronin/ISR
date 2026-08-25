'use strict';
(function EndgamePublicViewR1(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const A=(p,tag,cls,text)=>{const n=E(tag,cls,text);p.append(n);return n;};
  const J=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}: ${r.status}`);return r.json();};
  const T=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${u}: ${r.status}`);return r.text();};
  const safe=u=>{try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:null}catch{return null;}};
  const plain=v=>String(v??'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
  const esc=v=>CSS.escape(String(v));
  const DATA='./data/endgame-public-view-v1.json?v=20260824-r1';
  const HORMUZ='./data/hormuz-strategic-v3.json?v=20260822-v3';
  const CAUSAL='./data/endgame-causal-map-r1.mmd?v=20260824-r1';
  let model=null,hormuz=null,causalText='',activeTab='strategic',strategicLens='causal',wrapping=false,rootObserver=null,navObserver=null,causalRendering=false,causalRendered=false;

  function source(id){return model?.sources?.[id]||null;}
  function handoffSources(parent,ids){
    const box=A(parent,'div','eg3-sources');let count=0;
    (ids||[]).forEach(id=>{const s=source(id),u=safe(s?.url);if(!s||!u)return;const a=A(box,'a','eg3-source-chip',`${id} · ${s.publisher}`);a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.title=`${s.date} · ${s.quality} · ${s.supports}`;count++;});
    if(!count)box.remove();
  }
  function legacySources(parent,ids){
    const box=A(parent,'div','eg3-sources');let count=0;
    (ids||[]).forEach(id=>{const s=hormuz?.sources?.[id],u=safe(s?.url);if(!s||!u)return;const a=A(box,'a','eg3-source-chip',`${s.label||s.outlet||id}`);a.href=u;a.target='_blank';a.rel='noopener noreferrer';count++;});
    if(!count)box.remove();
  }
  function badge(parent,text,kind='fact'){
    const b=A(parent,'span',`eg3-badge eg3-${kind}`,text);return b;
  }
  function bullets(parent,items){const ul=A(parent,'ul','eg3-list');(items||[]).forEach(x=>A(ul,'li','',x));return ul;}
  function section(parent,title,dek){const s=A(parent,'section','eg3-section');const h=A(s,'div','eg3-section-head');A(h,'h3','',title);if(dek)A(h,'p','',dek);return s;}
  function card(parent,title,text,cls=''){const c=A(parent,'article',`eg3-card ${cls}`.trim());if(title)A(c,'h4','',title);if(text)A(c,'p','',text);return c;}

  function setTopActive(name){
    $$('.isr-workspace-nav [data-peer-workspace]').forEach(b=>{const on=b.dataset.peerWorkspace===name;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});
  }
  function installTopNav(){
    const nav=$('.isr-workspace-nav');if(!nav)return false;
    let b=$('[data-peer-workspace="ENDGAME"]',nav);
    if(!b){
      const old=$('[data-peer-workspace="MOU"]',nav);
      if(old){b=old.cloneNode(true);old.replaceWith(b);}else{b=E('button');const src=$('[data-peer-workspace="SOURCES"]',nav);src?nav.insertBefore(b,src):nav.append(b);}
      b.type='button';b.textContent='ENDGAME';b.dataset.peerWorkspace='ENDGAME';b.removeAttribute('aria-current');
      b.onclick=e=>{e.preventDefault();openEndgame('strategic');};
    }
    return true;
  }
  function hideLegacyAnalysisEntry(){
    $$('.analysis-nav button').forEach(b=>{const t=(b.textContent||'').trim().toLowerCase();if(t==='endgame'||t==='mou'||t==='public view')b.hidden=true;});
  }
  function installAnalysisCrosslink(){
    const p=$('#snapshot');if(!p||$('.eg3-analysis-link',p))return;
    const c=E('button','eg3-analysis-link');c.type='button';A(c,'strong','','Where did the conflict leave the parties?');A(c,'span','','Open ENDGAME for the MOU record, strategic causal map, victory-condition audit and public-view evidence.');c.onclick=()=>openEndgame('strategic');
    const first=$('.section-title',p);first?p.insertBefore(c,first):p.prepend(c);
  }
  function openEndgame(tab='strategic'){
    try{if($('.isr-hormuz-overlay:not([hidden])'))window.ISRAug22Workspaces?.activatePeer?.('ANALYSIS');}catch{}
    window.showAtlasPanel?.('endgame');
    const nav=$('.analysis-nav');if(nav)nav.hidden=true;
    setTopActive('ENDGAME');
    selectTab(tab,false);
    requestAnimationFrame(()=>$('#endgame')?.scrollTo?.(0,0));
  }

  function header(shell){
    const h=A(shell,'header','eg3-hero');const copy=A(h,'div','eg3-hero-copy');A(copy,'div','eg3-eyebrow','Results board · agreement → choices → consequences → current options');A(copy,'h2','',model.title);A(copy,'p','',model.dek);
    const meta=A(h,'div','eg3-meta-box');A(meta,'b','',`Evidence cutoff · ${model.evidence_cutoff}`);A(meta,'span','','R2 adjudication remains the victory-condition audit. The causal map answers a different question: how choices in one lane changed options in another.');
  }
  function tabs(shell){
    const n=A(shell,'nav','eg3-subnav');n.setAttribute('aria-label','Endgame sections');
    [['mou','MOU'],['strategic','STRATEGIC ENDGAME'],['public','PUBLIC VIEW']].forEach(([id,label])=>{const b=A(n,'button','eg3-subtab',label);b.type='button';b.dataset.eg3Tab=id;b.onclick=()=>selectTab(id,true);});
    return n;
  }
  function selectTab(id,updateHash=true){
    if(!['mou','strategic','public'].includes(id))id='strategic';activeTab=id;
    const r=$('#endgame');if(!r)return;
    $$('[data-eg3-tab]',r).forEach(b=>{const on=b.dataset.eg3Tab===id;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
    $$('[data-eg3-panel]',r).forEach(p=>{p.hidden=p.dataset.eg3Panel!==id;});
    if(id==='strategic'&&strategicLens==='causal')setTimeout(renderCausal,0);
    if(updateHash){const hash=id==='mou'?'#mou':id==='public'?'#public-view':'#endgame';history.replaceState(null,'',hash);}
  }

  function renderMou(panel){
    panel.replaceChildren();
    const intro=section(panel,'What the agreement actually did','The Islamabad MOU was an interim bargain, not a final peace treaty. This section keeps the document text, the implementation sequence and the current status separate.');
    const flags=A(intro,'div','eg3-inline-flags');badge(flags,'DOCUMENTARY RECORD','fact');badge(flags,'EXPIRED / NON-CONTROLLING','dead');badge(flags,'SUCCESSOR TERMS MAY BE REUSED','open');

    const clauses=section(panel,'What it said · 14-clause plain-English record','Key paragraphs are emphasized because they drive the current dispute. Open a row for the source and analytical context.');
    const cg=A(clauses,'div','eg3-clause-list');
    model.clauses.forEach(x=>{const d=A(cg,'details',`eg3-clause${x.key?' key':''}`);d.id=`eg3-clause-${x.paragraph}`;const s=A(d,'summary','');const left=A(s,'span','eg3-clause-id',`¶${x.paragraph}`);badge(left,'FACT','fact');const tx=A(s,'span','eg3-clause-copy');A(tx,'strong','',x.title);A(tx,'span','',x.summary);const body=A(d,'div','eg3-clause-body');A(body,'p','',x.summary);handoffSources(body,['S01']);});

    const got=section(panel,'Who got what','Paper concessions are separated from whether they later survived implementation.');
    const gg=A(got,'div','eg3-two-col');Object.entries(model.who_got).forEach(([k,v])=>{const c=card(gg,k);bullets(c,v);handoffSources(c,['S01']);});
    const ng=section(panel,'Who did NOT get what','This prevents later rhetoric from being mistaken for language the MOU actually contained.');
    const ngd=A(ng,'div','eg3-two-col');Object.entries(model.who_did_not_get).forEach(([k,v])=>{const c=card(ngd,k);bullets(c,v);handoffSources(c,['S01']);});

    renderMouBars(panel);

    const death=section(panel,'When it effectively died','Functional failure, political status and negotiating afterlife are different questions.');
    const tl=A(death,'div','eg3-timeline');model.mou_death.forEach(x=>{const row=A(tl,'article','eg3-timeline-row');A(row,'div','eg3-date',x.date);const c=A(row,'div');A(c,'h4','',x.title);A(c,'p','',x.detail);handoffSources(c,x.source_ids);});
    const status=A(death,'div','eg3-status-triplet');[['Functional death',model.mou_status.functional_death],['Formal / political status',model.mou_status.formal_political],['Negotiating afterlife',model.mou_status.afterlife]].forEach(([a,b])=>{const c=card(status,a,b);});

    const killed=section(panel,'Who killed it?','The two public narratives are shown side by side. Sequence can be adjudicated more strongly than subjective intent.');const kd=A(killed,'div','eg3-two-col');Object.entries(model.who_killed_it).forEach(([k,v])=>{const c=card(kd,k);bullets(c,v.points);handoffSources(c,v.source_ids);});

    const evidence=section(panel,'What the evidence says · Paragraph 5','This is the narrowest high-confidence adjudication because the maritime language is concrete.');
    const pd=A(evidence,'div','eg3-two-col');const says=card(pd,'What ¶5 says');bullets(says,model.paragraph5.says);handoffSources(says,['S01']);const no=card(pd,'What ¶5 does NOT say');bullets(no,model.paragraph5.does_not_say);
    const tests=A(evidence,'div','eg3-four-tests');model.paragraph5.tests.forEach(x=>{const c=card(tests,x.kind,x.text);badge(c,x.kind==='BEHAVIORAL'?'DISPUTED ATTRIBUTION KEPT SEPARATE':x.kind,'assessment');handoffSources(c,x.source_ids);});
    const finding=card(evidence,'Finding',model.paragraph5.finding,'eg3-finding');badge(finding,`ASSESSMENT · ${model.paragraph5.confidence}`,'assessment');

    const now=section(panel,'Where the MOU is now','The expired instrument can still influence bargaining without itself controlling post-expiry outcomes.');const flow=A(now,'div','eg3-flow');model.mou_now.flow.forEach((x,i)=>{const n=A(flow,'span',i===3?'dead':'',x);if(i<model.mou_now.flow.length-1)A(flow,'i','','→');});A(now,'p','eg3-lead',model.mou_now.text);handoffSources(now,model.mou_now.source_ids);
  }

  function renderMouBars(panel){
    const balance=section(panel,'Bargaining balance · preserved comparative bars','These analyst aids answer “how far did each side move from its own bargaining pole?” They do not measure morality, blame or a war score. They are retained because the new layout does not supersede that comparison.');
    const matrix=hormuz?.mou_concession_matrix||[];
    const mg=A(balance,'div','eg3-bar-grid');matrix.forEach(x=>{const c=card(mg,x.topic);const rows=[['Iran concession aid',Number(x.iran_concession)||0,'iran'],['U.S. concession aid',Number(x.us_concession)||0,'us']];rows.forEach(([label,val,kind])=>{const r=A(c,'div','eg3-bar-row');A(r,'span','',label);const tr=A(r,'div','eg3-bar-track');const fill=A(tr,'i',kind);fill.style.width=`${Math.max(0,Math.min(10,val))*10}%`;A(r,'b','',`${val}/10`);});A(c,'p','eg3-muted',x.status||x.why||'');legacySources(c,x.sources);});
    if(!matrix.length)A(balance,'p','eg3-muted','Comparative concession data are unavailable at this cutoff.');

    const tracks=section(panel,'Clause position tracks · signed position vs later reality','The signed marker shows where the MOU sat between the two substantive poles. A second marker shows later implementation where the current dataset supports one.');
    const tg=A(tracks,'div','eg3-track-grid');(hormuz?.mou_position_tracks||[]).filter(x=>x.scorable).forEach(x=>{const c=card(tg,`Clause ${x.clause} · ${x.topic}`);A(c,'p','',x.analysis||x.mou||'');const l=A(c,'div','eg3-pole-labels');A(l,'span','','Iran pole');A(l,'span','','U.S. pole');const axis=A(c,'div','eg3-position-axis');const signed=A(axis,'i','signed');signed.style.left=`${Math.max(0,Math.min(100,Number(x.position)||0))}%`;signed.title=`Signed position: ${x.position}/100 toward U.S. pole`;if(x.later_marker){const later=A(axis,'i','later');later.style.left=`${Math.max(0,Math.min(100,Number(x.later_marker.position)||0))}%`;later.title=x.later_marker.text||x.later_marker.label||'Later position';}const leg=A(c,'div','eg3-track-legend');A(leg,'span','','● signed');if(x.later_marker)A(leg,'span','','◇ later');A(c,'strong','eg3-current-status',x.current_status||'');legacySources(c,x.sources);});
  }

  function renderStrategicScaffold(panel,legacyNodes){
    panel.replaceChildren();
    const status=section(panel,'Current strategic lanes','Simple status labels first; the detailed evidence remains below.');const sg=A(status,'div','eg3-status-board');model.strategic_status.forEach(x=>{const c=A(sg,'article',`eg3-status-card state-${x.state}`);A(c,'span','',x.lane);A(c,'strong','',x.status);});

    const lenses=section(panel,'Two non-duplicative views','The causal map explains how choices in one lane changed options in another. The R2 outcome audit tests Iran’s original victory conditions against the record.');const nav=A(lenses,'div','eg3-lens-nav');[['causal','CAUSAL CONSEQUENCE MAP'],['audit','VICTORY-CONDITION AUDIT · R2']].forEach(([id,label])=>{const b=A(nav,'button','eg3-lens-btn',label);b.type='button';b.dataset.eg3Lens=id;b.onclick=()=>selectLens(id);});
    const causal=A(lenses,'div','eg3-lens-panel');causal.dataset.eg3LensPanel='causal';const cintro=A(causal,'p','eg3-lead','Read each branch as: what Iran wanted → what it did or said → what happened → why that helped or hurt → where the consequence led next. Dotted connectors show contradiction or a failed assumption, not a confirmed causal chain.');
    const wrap=A(causal,'div','eg3-causal-layout');const graph=A(wrap,'div','eg3-causal-viewport');graph.id='eg3CausalHost';graph.setAttribute('aria-label','Strategic endgame causal map');const drawer=A(wrap,'aside','eg3-evidence-drawer');drawer.id='eg3EvidenceDrawer';A(drawer,'h4','','Evidence for selected node');A(drawer,'p','eg3-muted','Select a sourced node in the causal map. The drawer keeps actor claims, disputed attribution and inference distinct.');

    const audit=A(lenses,'div','eg3-lens-panel');audit.dataset.eg3LensPanel='audit';legacyNodes.forEach(n=>audit.append(n));

    const decisions=section(panel,'What Tehran can still do next','None of these branches is cost-free. Each card states what could make it work and what could make it backfire.');const dg=A(decisions,'div','eg3-decision-grid');model.decisions.forEach(x=>{const c=card(dg,x.title,x.plain);const q=A(c,'dl','eg3-decision-detail');[['Could work if',x.works],['Could backfire if',x.backfires],['What would change this',x.change]].forEach(([k,v])=>{A(q,'dt','',k);A(q,'dd','',v);});handoffSources(c,x.evidence);});
    selectLens(strategicLens);setTimeout(renderCausal,0);
  }

  function selectLens(id){
    strategicLens=id==='audit'?'audit':'causal';const r=$('#endgame');if(!r)return;
    $$('[data-eg3-lens]',r).forEach(b=>b.classList.toggle('active',b.dataset.eg3Lens===strategicLens));
    $$('[data-eg3-lens-panel]',r).forEach(p=>p.hidden=p.dataset.eg3LensPanel!==strategicLens);
    if(strategicLens==='causal')setTimeout(renderCausal,0);else setTimeout(()=>window.ISREndgameMermaidR2?.render?.(),0);
  }

  function renderPublic(panel){
    panel.replaceChildren();
    const intro=section(panel,'Domestic cost & public perception','Population signals, macro data and interviews are deliberately separated so one type of evidence is never made to impersonate another.');
    const pg=A(intro,'div','eg3-public-grid');const poll=card(pg,'GAMAAN survey signals');model.polling.signals.forEach(x=>{const r=A(poll,'div','eg3-poll-row');A(r,'span','',x.label);const tr=A(r,'div','eg3-poll-track');const fill=A(tr,'i');fill.style.width=`${x.value}%`;A(r,'b','',`${x.value}%`);});handoffSources(poll,[model.polling.source_id]);
    const meth=card(pg,'Methodology matters');A(meth,'dl','eg3-method');[['Field dates',model.polling.dates],['Weighted respondents',model.polling.weighted_respondents.toLocaleString()],['Sample',model.polling.sample],['Population target',model.polling.population],['Uncertainty',model.polling.interval]].forEach(([k,v])=>{A(meth,'dt','',k);A(meth,'dd','',v);});badge(meth,'SURVEY SIGNAL','survey');

    const hc=section(panel,'Household cost','Macro indicators and interviews answer different questions. They are shown together but not blended.');const hg=A(hc,'div','eg3-two-col');const macro=card(hg,'Macro / policy record');bullets(macro,model.household_cost.macro);const interviews=card(hg,'Interviewed household experience');bullets(interviews,model.household_cost.interviews);A(interviews,'p','eg3-warning-text',model.household_cost.warning);handoffSources(hc,model.household_cost.source_ids);

    const two=section(panel,'Two things can be true','An Iranian citizen can believe the Islamic Republic made strategic choices that hurt Iran and also believe U.S. or Israeli military/economic pressure is harming the country. Those positions are not mutually exclusive.');
    badge(two,'PUBLIC ATTITUDE ≠ STATE ALIGNMENT','assessment');

    const claims=section(panel,'Claims vs observable record','The same evidentiary standard applies regardless of whether a claim is pro-Iran, pro-U.S. or anti-Iran.');const cg=A(claims,'div','eg3-claim-grid');model.claim_vs_record.forEach(x=>{const c=card(cg,x.claim);badge(c,x.claim_class,'claim');A(c,'p','eg3-record',x.record);handoffSources(c,x.source_ids);});
    const audit=section(panel,'International narratives are audited too','Public View is not an anti-Iran propaganda page. Unsupported claims on the other side are tested by the same rules.');bullets(audit,model.international_audit);A(audit,'p','eg3-bottom-line','The Atlas separates what an actor says, what can be independently observed, and what the evidence reasonably supports.');
  }

  function evidenceFor(nodeId){return (model.node_evidence||[]).find(x=>x.node_id===nodeId)||null;}
  function showEvidence(nodeId){
    const d=$('#eg3EvidenceDrawer');if(!d)return;const x=evidenceFor(nodeId);d.replaceChildren();
    if(!x){A(d,'h4','',nodeId||'Strategic node');A(d,'p','eg3-muted','This connective or framing node has no separate evidence row. Follow the nearest sourced node for the underlying record.');return;}
    const h=A(d,'div','eg3-drawer-head');A(h,'span','eg3-node-id',x.node_id);badge(h,plain(x.classification),classificationKind(x.classification));A(d,'h4','',x.claim);A(d,'p','',x.editorial_note);const dl=A(d,'dl','eg3-method');A(dl,'dt','','Confidence');A(dl,'dd','',x.confidence);A(dl,'dt','','Why this matters');A(dl,'dd','',whyMatters(x));A(dl,'dt','','What would change this');A(dl,'dd','',whatChanges(x));handoffSources(d,x.source_ids);
  }
  function classificationKind(s){const v=String(s).toUpperCase();if(v.includes('DISPUTED'))return'disputed';if(v.includes('ACTOR')||v.includes('OFFICIAL'))return'claim';if(v.includes('INFERENCE')||v.includes('SYNTHESIS'))return'assessment';if(v.includes('SURVEY'))return'survey';return'fact';}
  function whyMatters(x){const id=x.node_id;if(/^M/.test(id))return'This node affects whether the old MOU can be treated as a continuing basis for current demands.';if(/^R/.test(id))return'This node tests whether Iranian coercion produced regional inclusion or instead strengthened security structures outside Iran.';if(/^H/.test(id))return'This node separates practical Hormuz leverage from durable legal or institutional control.';if(/^E/.test(id))return'This node tests whether political support translates into usable economic capacity under secondary-sanctions risk.';if(/^P/.test(id))return'This node separates strategic complementarity from proof of tactical command.';if(/^D/.test(id))return'This node informs the domestic-cost and legitimacy layer without converting anecdotes into population polling.';return'This node contributes to the current synthesis of Iran’s remaining low-cost options.';}
  function whatChanges(x){const c=String(x.classification).toUpperCase();if(c.includes('DISPUTED'))return'Independent attribution evidence that resolves the contested actor claim.';if(c.includes('ACTOR')||c.includes('OFFICIAL'))return'Independent confirmation or contradictory official action, not another repetition of the same statement.';if(c.includes('INFERENCE')||c.includes('SYNTHESIS'))return'New observable behavior that breaks the current causal relationship or shows the opposite strategic effect.';if(c.includes('SURVEY'))return'A newer methodologically comparable population survey or a material methodological revision.';return'Newer primary or independently verified evidence that supersedes the current factual record.';}

  function ensureMermaid(){if(window.mermaid)return Promise.resolve(window.mermaid);return new Promise((ok,no)=>{let s=$('script[data-local-mermaid]');if(s){s.addEventListener('load',()=>ok(window.mermaid),{once:true});return;}s=E('script');s.src='./vendor/mermaid/mermaid.min.js?v=11.6.0';s.dataset.localMermaid='11.6.0';s.async=false;s.onload=()=>window.mermaid?ok(window.mermaid):no(Error('Mermaid unavailable'));s.onerror=no;document.head.append(s);});}
  function graphNode(svg,id){return $$('g.node',svg).find(n=>n.id===id||n.id.startsWith(`flowchart-${id}-`)||n.id.includes(`-${id}-`));}
  async function renderCausal(){
    const host=$('#eg3CausalHost');if(!host||host.dataset.rendered==='1'||causalRendering)return;causalRendering=true;
    try{const m=await ensureMermaid();let def=causalText||await T(CAUSAL);causalText=def;def=def.replace(/<br\s*\/?\s*>/gi,' · ');m.initialize({startOnLoad:false,securityLevel:'strict',theme:'dark',htmlLabels:false,flowchart:{htmlLabels:false,useMaxWidth:false,curve:'basis',nodeSpacing:34,rankSpacing:54}});const out=await m.render(`isrEndgameCausal_${Date.now()}`,def);if(!document.body.contains(host))return;host.replaceChildren();const canvas=A(host,'div','eg3-causal-canvas');canvas.innerHTML=out.svg;out.bindFunctions?.(canvas);const svg=$('svg',canvas);if(!svg)throw Error('no svg');svg.removeAttribute('style');svg.setAttribute('role','img');svg.setAttribute('aria-label','Human causal endgame map showing Iranian aims, actions, observed outcomes, contradictions, dead ends and remaining paths.');
      (model.node_evidence||[]).forEach(x=>{const n=graphNode(svg,x.node_id);if(!n)return;n.classList.add(`eg3-node-${classificationKind(x.classification)}`);n.dataset.nodeId=x.node_id;n.tabIndex=0;n.setAttribute('role','button');n.setAttribute('aria-label',`${x.node_id}: ${x.claim}. ${plain(x.classification)}`);const go=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();$$('g.node.eg3-selected-node',svg).forEach(q=>q.classList.remove('eg3-selected-node'));n.classList.add('eg3-selected-node');showEvidence(x.node_id);};n.onclick=go;n.onkeydown=go;});
      $$('g.node',svg).forEach(n=>{const txt=(n.textContent||'').toUpperCase();if(txt.includes('DEAD END'))n.classList.add('eg3-node-dead');if(txt.includes('OPEN PATH')||txt.includes('OPEN POSSIBILITY')||txt.includes('OPEN TEST'))n.classList.add('eg3-node-open');});
      host.dataset.rendered='1';causalRendered=true;showEvidence('NARROW');
    }catch(e){console.error('ENDGAME causal map',e);host.replaceChildren();const c=card(host,'Causal map unavailable','The strategic status board, R2 outcome audit and evidence cards remain available.','eg3-error');}
    finally{causalRendering=false;}
  }

  function wrapEndgame(){
    const r=$('#endgame');if(!r||wrapping||!r.classList.contains('eg-r1'))return false;
    const direct=[...r.childNodes];if(direct.length===1&&direct[0].nodeType===1&&direct[0].classList.contains('eg3-shell'))return true;
    wrapping=true;
    try{
      const shell=E('div','eg3-shell');header(shell);tabs(shell);
      const body=A(shell,'div','eg3-body');
      const mou=A(body,'div','eg3-panel');mou.dataset.eg3Panel='mou';
      const strategic=A(body,'div','eg3-panel');strategic.dataset.eg3Panel='strategic';
      const pub=A(body,'div','eg3-panel');pub.dataset.eg3Panel='public';
      renderMou(mou);renderStrategicScaffold(strategic,direct);renderPublic(pub);
      r.replaceChildren(shell);r.classList.add('eg3-enhanced');
      r.addEventListener('click',interceptMou,true);
      selectTab(activeTab,false);setTimeout(()=>window.ISREndgameMermaidR2?.render?.(),0);
    }finally{wrapping=false;}
    return true;
  }
  function interceptMou(e){const b=e.target.closest?.('button.eg-link-btn');if(!b||!$('#endgame')?.contains(b))return;const t=(b.textContent||'');if(!/MoU/i.test(t))return;e.preventDefault();e.stopImmediatePropagation();const m=t.match(/clause\s+([0-9]+[A-C]?)/i);selectTab('mou',true);if(m)setTimeout(()=>document.getElementById(`eg3-clause-${m[1].replace(/[A-C]$/i,'')}`)?.scrollIntoView({behavior:'smooth',block:'center'}),30);}

  function watchRoot(){
    const r=$('#endgame');if(!r)return false;if(rootObserver)rootObserver.disconnect();rootObserver=new MutationObserver(()=>{if(wrapping)return;const first=r.firstElementChild;if(r.classList.contains('eg-r1')&&(!first||!first.classList.contains('eg3-shell')))queueMicrotask(wrapEndgame);});rootObserver.observe(r,{childList:true});wrapEndgame();return true;
  }
  function watchNav(){if(navObserver)navObserver.disconnect();navObserver=new MutationObserver(()=>{installTopNav();hideLegacyAnalysisEntry();installAnalysisCrosslink();});navObserver.observe(document.body,{childList:true,subtree:true});installTopNav();hideLegacyAnalysisEntry();installAnalysisCrosslink();}
  function handleHash(){const h=(location.hash||'').toLowerCase();if(h==='#mou'||h.includes('mou'))openEndgame('mou');else if(h==='#public-view'||h.includes('public-view')||h.includes('public_perception'))openEndgame('public');else if(h==='#endgame'||h.includes('strategic-endgame'))openEndgame('strategic');}

  async function init(){
    [model,hormuz,causalText]=await Promise.all([J(DATA),J(HORMUZ),T(CAUSAL)]);
    watchNav();
    if(!watchRoot()){const mo=new MutationObserver(()=>{if(watchRoot())mo.disconnect();});mo.observe(document.documentElement,{childList:true,subtree:true});}
    window.addEventListener('hashchange',handleHash);setTimeout(handleHash,120);
    window.ISREndgamePublicViewR1={open:openEndgame,selectTab,selectLens,renderCausal,model:()=>model};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error),{once:true});else init().catch(console.error);
}());
