(function attachISRFullScopeCore(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.ISRFullScopeCore=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
  const AUTHORITY=Object.freeze({
    OUTCOME:100, PUBLIC_ASSESSMENT:100, FORENSIC_CURRENT:95, CLAIM_CHAIN:90,
    FORENSIC_ENTITY:85, CANONICAL_LEDGER:75, SUPERSEDED:50, LEGACY:30, SOURCE:20
  });
  const CLASS_LABEL=Object.freeze({
    OUTCOME:'CURRENT ASSESSMENT',PUBLIC_ASSESSMENT:'CURRENT ASSESSMENT',FORENSIC_CURRENT:'CURRENT FORENSIC RECORD',
    CLAIM_CHAIN:'CURRENT FORENSIC RECORD',FORENSIC_ENTITY:'CURRENT FORENSIC RECORD',CANONICAL_LEDGER:'CANONICAL LEDGER',
    SUPERSEDED:'SUPERSEDED RECORD',LEGACY:'LEGACY / ARCHIVE',SOURCE:'SOURCE ARTICLE'
  });
  const words=value=>String(value||'').toLowerCase().replace(/[^a-z0-9+/-]+/g,' ').trim().split(/\s+/).filter(Boolean);
  const textOf=value=>{
    if(value==null)return '';
    if(['string','number','boolean'].includes(typeof value))return String(value);
    if(Array.isArray(value))return value.map(textOf).join(' ');
    return Object.values(value).map(textOf).join(' ');
  };
  function add(rows,kind,id,title,subtitle,record,view,extra){
    if(!id||!title)return;
    const rank=AUTHORITY[kind]||0;
    const aliases=(extra&&extra.aliases)||'';
    rows.push({kind,id:String(id),title:String(title),subtitle:String(subtitle||''),record:record||{},view:view||'snapshot',rank,classLabel:CLASS_LABEL[kind]||kind,haystack:`${title} ${subtitle||''} ${aliases} ${textOf(record)}`.toLowerCase(),mapRef:extra&&extra.mapRef||null});
  }
  function buildAuthorityIndex(ctx){
    const rows=[]; const outcomes=ctx.outcomes?.outcomes||[]; const forensic=ctx.forensic||{}; const ledger=ctx.ledger||{}; const legacy=ctx.legacy||{};
    outcomes.forEach(o=>add(rows,'OUTCOME',o.id,`${o.label}: ${o.headline}`,o.strongest_supported_conclusion,o,'snapshot',{aliases:o.level==='STRATEGIC'?'iran won victory winner strategic outcome hormuz control':''}));
    (forensic.assessments?.assessments||[]).forEach(a=>add(rows,'PUBLIC_ASSESSMENT',a.assessment_id,a.text,`${a.analytic_likelihood||''} ${a.analytic_confidence||''}`,a,a.assessment_id?.includes('HORMUZ')?'snapshot':'losses',{aliases:a.assessment_id?.includes('CONVENTIONAL')?'335 launchers 23 aircraft 24 aircraft 58 naval':''}));
    (forensic.claims?.claims||[]).forEach(c=>add(rows,'FORENSIC_CURRENT',c.claim_id,c.exact_translated_claim||c.claim_id,(c.final_disposition||[]).join(' '),c,'claims',{aliases:`${c.chain_id||''} ${c.subsequent_iranian_revision||''}`}));
    (forensic.chains?.chains||[]).forEach(c=>add(rows,'CLAIM_CHAIN',c.chain_id,c.label,c.assessment,c,'claims',{aliases:/F15E|F35|URANIUM/i.test(c.chain_id)?'f-35 f35 f-15e f15e uranium pilot rescue':''}));
    (forensic.leaders?.records||[]).forEach(c=>add(rows,'FORENSIC_ENTITY',c.leadership_id,c.name,c.role_at_death,c,'losses',{aliases:/khamenei/i.test(c.name)?'Khamenei supreme leader':''}));
    (forensic.losses?.categories||[]).forEach(c=>add(rows,'FORENSIC_ENTITY',c.category,String(c.category).replace(/_/g,' '),c.model_status||'',c,'losses',{aliases:/launcher/i.test(c.category)?'335 launchers neutralized':''}));
    (forensic.facilities?.records||[]).forEach(c=>add(rows,'FORENSIC_ENTITY',c.facility_audit_id,c.facility_name||c.facility_audit_id,'facility audit',c,'imagery',{mapRef:c.facility_id,aliases:/udeid/i.test(c.facility_name||'')?'Al Udeid CAOC base whole base':''}));
    (ledger.events?.events||[]).forEach(c=>add(rows,'CANONICAL_LEDGER',c.event_id,c.summary||c.event_id,`${c.event_date||''} ${c.target||''}`,c,'timeline',{mapRef:(c.map_refs||[])[0]||(c.facility_refs||[])[0]}));
    (ledger.claims?.claims||[]).forEach(c=>{const title=c.claim||c.name||c.case_id||c.id; const id=c.case_id||c.id; add(rows,'CANONICAL_LEDGER',id,title,c.current_verdict||c.verdict||'',c,'claims',{mapRef:(c.map_refs||[])[0]||(c.facility_refs||[])[0],aliases:/carrier|lincoln/i.test(title||'')?'carrier sunk sinking hit USS Abraham Lincoln':''});});
    (ledger['material-losses']?.records||[]).forEach(c=>add(rows,'CANONICAL_LEDGER',c.loss_id,c.item||c.loss_id,c.owner||'',c,'losses',{mapRef:(c.map_refs||[])[0]}));
    (ledger.casualties?.records||[]).forEach(c=>add(rows,c.current_status==='ACTIVE_RECORD'?'CANONICAL_LEDGER':'SUPERSEDED',c.casualty_id,`${c.country||''} casualty record`,`${c.event_date||''} ${c.killed??''} KIA`,c,'losses'));
    const legacyViews={claims:'claims',losses:'losses',facilities:'facilities',strikes:'strikes',routes:'arctic',arcticRoutes:'arctic',economics:'economy',missiles:'csis'};
    Object.entries(legacy).forEach(([key,list])=>Array.isArray(list)&&list.forEach((c,i)=>{
      const isCanonicalClaim=key==='claims'&&Boolean(c.verdict||c.finding||c.claim);
      const kind=isCanonicalClaim?'CANONICAL_LEDGER':'LEGACY';
      const title=c.name||c.title||c.claim||key; const id=c.case_id||c.id||`${key}-${i}`;
      const aliases=isCanonicalClaim&&/carrier|lincoln/i.test(`${title} ${c.claim||''}`)?'carrier sunk sinking hit USS Abraham Lincoln':'';
      add(rows,kind,id,title,c.current_verdict||c.verdict||c.date||c.status||'',c,legacyViews[key]||'snapshot',{mapRef:c.id||null,aliases});
    }));
    (forensic.sources?.sources||[]).forEach(s=>add(rows,'SOURCE',s.source_id,`${s.outlet||'Source'} — ${s.title||'Untitled'}`,`${s.publication_date||''} ${(s.source_roles||[]).join(' ')}`,s,'sources'));
    return rows;
  }
  function rankSearch(index,query,limit=40){
    const qs=words(query); if(!qs.length)return [];
    return (index||[]).map(row=>{
      const matched=qs.every(q=>row.haystack.includes(q)); if(!matched)return null;
      const title=String(row.title).toLowerCase(); const subtitle=String(row.subtitle).toLowerCase();
      let relevance=0; qs.forEach(q=>{if(title.includes(q))relevance+=12;if(subtitle.includes(q))relevance+=4;});
      return {...row,score:row.rank*100+relevance};
    }).filter(Boolean).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,limit);
  }
  function claimFreshness(chain,claims,reviewed){
    const chainClaims=(claims||[]).filter(c=>(chain.claim_ids||[]).includes(c.claim_id)).sort((a,b)=>String(a.claim_date||'').localeCompare(String(b.claim_date||''))||String(a.claim_id).localeCompare(String(b.claim_id)));
    const claimed=chainClaims[0]||null;
    let corrected=null;
    if(claimed?.next_replacement_claim_id) corrected=chainClaims.find(c=>c.claim_id===claimed.next_replacement_claim_id)||null;
    if(!corrected) corrected=chainClaims.find(c=>(c.final_disposition||[]).includes('CORRECTED')||String(c.contradiction_type||'').includes('SELF_CORRECTION'))||null;
    const current={date:chain.end_date||corrected?.claim_date||claimed?.claim_date||null,label:chain.assessment||'UNRESOLVED'};
    return {claimed,corrected,current,reviewed};
  }
  const dayValue=value=>{const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m)return null; return Date.UTC(+m[1],+m[2]-1,+m[3]);};
  function timelinePositions(records){
    const withDay=(records||[]).map((r,i)=>({r,i,t:dayValue(r.event_date||r.claim_date||r.death_date||r.first_reported)})).filter(x=>x.t!=null);
    if(!withDay.length)return [];
    const min=Math.min(...withDay.map(x=>x.t)), max=Math.max(...withDay.map(x=>x.t)); const span=Math.max(86400000,max-min);
    const perDay=new Map();
    return withDay.map(x=>{const key=new Date(x.t).toISOString().slice(0,10); const lane=perDay.get(key)||0; perDay.set(key,lane+1); return {index:x.i,id:x.r.event_id||x.r.claim_id||x.r.leadership_id||String(x.i),position:(x.t-min)/span*100,lane:Math.min(lane,2),day:key};});
  }
  function isMapped(event){return Boolean((event?.map_refs||[]).length||(event?.facility_refs||[]).length);}
  function eventMapRef(event){return (event?.map_refs||[])[0]||(event?.facility_refs||[])[0]||null;}
  return {AUTHORITY,CLASS_LABEL,textOf,buildAuthorityIndex,rankSearch,claimFreshness,timelinePositions,isMapped,eventMapRef};
}));
