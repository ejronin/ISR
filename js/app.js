(async function bootstrapAtlas(){
  let DATA;
  try {
    const dataFiles=['core.json','events.json','facilities.json','strikes.json','losses.json','claims.json','sources.json','economics.json','routes.json','missiles.json','influence-networks.json'];
    const payloads=await Promise.all(dataFiles.map(async file=>{
      const response=await fetch('./data/'+file,{cache:'no-store'});
      if(!response.ok) throw new Error(`${file} request failed: ${response.status}`);
      return response.json();
    }));
    DATA=Object.assign({},...payloads);
    window.ATLAS_DATA=DATA;
  } catch (dataError) {
    console.warn('Structured atlas data could not be loaded. Embedded static evidence remains readable.', dataError);
    const mapEl = document.getElementById('map');
    if (mapEl && !mapEl.textContent.trim()) {
      mapEl.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:28px;background:#0b1728;color:#dceaff;font:14px/1.5 system-ui;text-align:center"><div><b>Interactive data unavailable in this browser session.</b><br><span style="color:#9cb0ca">The embedded evidence panels remain readable. Open the hosted GitHub Pages site for full filtering and map interaction.</span></div></div>';
    }
    return;
  }
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function srcLinks(arr){return (arr||[]).map(x=>`<a target="_blank" rel="noopener" href="${esc(x[1])}">${esc(x[0])}</a>`).join(' ')}
window.pan=function(){return false;};
let map=null;
window.atlasMap=null;
const groups={}; const allMarkers={};
window.pan=function(){ return false; };
try{
if(!window.L) throw new Error('Leaflet map library was blocked or unavailable.');
map=L.map('map',{zoomControl:true}).setView([27.5,51.5],4);
window.atlasMap=map;
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function srcLinks(arr){return (arr||[]).map(x=>`<a target="_blank" rel="noopener" href="${esc(x[1])}">${esc(x[0])}</a>`).join(' ')}
function icon(text,color,shape='circle'){return L.divIcon({className:'',html:`<div class="pin ${shape}">${shape==='diamond'?'<span>'+esc(text)+'</span>':esc(text)}</div>`.replace('class="pin','style="background:'+color+'" class="pin'),iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-13]})}
function addMarker(group,id,lat,lon,txt,color,shape,popup){const mk=L.marker([lat,lon],{icon:icon(txt,color,shape)}).bindPopup(popup,{maxWidth:360});mk.addTo(group);allMarkers[id]=mk;return mk}
function facilityPopup(p){let assets=[...(p.critical_assets_reported||[]),...(p.noncritical_or_soft_assets_reported||[])];return `<h3>${esc(p.name)}</h3><b>Verification:</b> ${esc(p.verification_grade||p.damage_evidence_status)}<br><b>Functional severity:</b> ${esc(p.impact_grade||p.operational_effect_status)}<br><b>Purpose:</b> ${esc(p.purpose||p.role)}<br><b>Verified physical damage:</b> ${assets.length?assets.map(esc).join('; '):'No verified component list in current ledger.'}<br><b>Operational effect:</b> ${esc(p.effect||p.note)}<br><b>What is not proved:</b> ${esc(p.continuity||p.current_presence_status||'')}<div>${srcLinks((p.source_urls||[]).map(u=>[sourceNameFromUrl(u),u]))}</div>`}
function strikePopup(p){return `<h3>${esc(p.name)}</h3><b>Date:</b> ${esc(p.event_date||p.date||'')}<br><b>Evidence:</b> ${esc(p.verification||p.status||'')}<br>${p.tally?'<b>Tally/effect:</b> '+esc(p.tally)+'<br>':''}<b>Target/effect:</b> ${esc(p.target_type||p.note||'')}<br>${p.network_relevance?'<b>Network relevance:</b> '+esc(p.network_relevance)+'<br>':''}${p.note&&p.target_type?'<b>Context:</b> '+esc(p.note):''}<div>${srcLinks(p.sources||(p.source_urls||[]).map((u,i)=>['source '+(i+1),u]))}</div>`}
function claimPopup(p){return `<h3>${esc(p.name)}</h3><b>Verdict:</b> ${esc(p.verdict)}<br><b>Claim:</b> ${esc(p.claim)}<br><b>Finding:</b> ${esc(p.finding)}<div>${srcLinks(p.sources)}</div>`}

// Facilities
let g=L.layerGroup(); groups['Iran damage → U.S.-linked sites']=g; DATA.facilities.forEach(p=>{let color='#8b98a9',txt='US';if(p.damage_evidence_status==='VERIFIED_DAMAGE')color='#ff5a5f';if(p.operational_effect_status==='SUBFACILITY_INOPERABLE')color='#111827';if(p.operational_effect_status==='HQ_FUNCTION_RELOCATED')color='#c084fc';if(p.damage_evidence_status==='NO_REPORTED_DAMAGE_FOUND_IN_REVIEWED_SOURCE_SET')color='#43d17a';if(p.damage_evidence_status==='DAMAGE_CLAIM_UNVERIFIED')color='#ffb84d';addMarker(g,p.id,p.lat,p.lon,txt,color,'square',facilityPopup(p))});g.addTo(map);
// U.S. strike effects
let s=L.layerGroup(); groups['U.S. / coalition strike effects']=s;DATA.strikes.forEach(p=>{let lat=p.lat,lon=p.lon;if(lat==null||lon==null)return;addMarker(s,p.id,lat,lon,'US','#111827','diamond',strikePopup(p))});s.addTo(map);
// Founding 14
let c=L.layerGroup();groups['Red Sea coalition — founding 14']=c;DATA.coalition14.forEach(p=>addMarker(c,p.id,p.lat,p.lon,p.actor||'14','#54d9e8','circle',`<h3>${esc(p.name)}</h3><b>Founding 14 support statement</b><br>${esc(p.role)}<br><small>${esc(p.political_context||'')}</small><div>${srcLinks((p.source_urls||[]).map((u,i)=>['source '+(i+1),u]))}</div>`));
// Mecca pact
let mp=L.layerGroup();groups['Mecca defense pact — 3 states']=mp;DATA.mecca.forEach((p,i)=>addMarker(mp,'MECCA-'+i,p.lat,p.lon,p.actor,'#22b7c7','circle',`<h3>${esc(p.name)}</h3>Saudi Arabia, Türkiye and Pakistan signed a mutual-defense pact Aug. 7. An armed attack on one is to be regarded as an attack on all, but the published statement did not specify automatic operational commitments.<div>${srcLinks([['Reuters','https://www.reuters.com/world/asia-pacific/saudi-arabia-turkey-pakistan-sign-joint-defence-deal-amid-regional-turmoil-2026-08-07/'],['Al Jazeera','https://www.aljazeera.com/news/2026/8/7/turkiye-saudi-arabi-pakistan-sign-joint-defence-agreement-whats-in-it']])}</div>`));
// Lebanon verifier candidates
let v=L.layerGroup();groups['Lebanon verifier candidates — proposed']=v;DATA.verifiers.forEach(p=>addMarker(v,p.id,p.lat,p.lon,p.actor,'#c084fc','circle',`<h3>${esc(p.name)}</h3><b>PROPOSED / NOT FINALIZED</b><br>${esc(p.role)}<br>Lebanese official later denied Beirut had agreed to a shortlist; treat this as a candidate mechanism, not a settled deployment.<div>${srcLinks((p.source_urls||[]).map((u,i)=>['source '+(i+1),u]))}</div>`));


// Current OSINT update layer — Aug. 17-19, 2026
let cur=L.layerGroup();groups['Current OSINT — Aug. 17–19']=cur;
(DATA.strategicMilestones||[]).filter(function(x){return String(x.date||'').slice(0,10)>='2026-08-17' && x.lat!=null && x.lon!=null;}).forEach(function(x,i){
  const cat=String(x.cat||'');
  const color=cat.includes('ECONOMIC')?'#ffb84d':cat.includes('MARITIME')?'#54d9e8':cat.includes('MISSILE')?'#ff5a5f':'#c084fc';
  addMarker(cur,'CUR-'+i,x.lat,x.lon,'NEW',color,'circle',`<h3>${esc(x.title)}</h3><b>${esc(x.date)} • ${esc(x.cat||'CURRENT OSINT')}</b><br>${esc(x.body||'')}<div>${srcLinks(x.src||[])}</div>`);
});
cur.addTo(map);

// China / Arctic routes — published corridors, schematic geometry (not live AIS tracks)
let ar=L.featureGroup();groups['China / Arctic routes — schematic']=ar;
(DATA.arcticRoutes||[]).forEach(function(r){
  const color=r.type==='energy'?'#c084fc':'#54d9e8';
  L.polyline(r.coords,{color:color,weight:4,opacity:.82,dashArray:r.type==='energy'?'8 7':null}).addTo(ar)
   .bindPopup(`<h3>${esc(r.name)}</h3><b>${esc(r.status)}</b><br>${esc(r.note)}<div>${srcLinks(r.src)}</div>`);
  (r.nodes||[]).forEach(function(n,i){
    L.circleMarker([n[1],n[2]],{radius:5,color:'#07111f',weight:2,fillColor:color,fillOpacity:.95}).addTo(ar)
      .bindPopup(`<h3>${esc(n[0])}</h3>${esc(r.name)}<br><small>Schematic corridor node; exact voyages vary.</small><div>${srcLinks(r.src)}</div>`);
  });
});

// Claims
let q=L.layerGroup();groups['Claim checks']=q;DATA.claims.forEach(p=>addMarker(q,p.id,p.lat,p.lon,'!', '#ffb84d','circle',claimPopup(p)));q.addTo(map);

// toolbar
const tb=document.getElementById('toolbar');Object.entries(groups).forEach(([name,layer],idx)=>{const b=document.createElement('button');b.className='layerbtn '+(map.hasLayer(layer)?'on':'');b.textContent=name;b.onclick=()=>{if(map.hasLayer(layer)){map.removeLayer(layer);b.classList.remove('on')}else{layer.addTo(map);b.classList.add('on');if(name.includes('Arctic') && typeof layer.getBounds==='function' && layer.getBounds().isValid()){map.fitBounds(layer.getBounds(),{padding:[24,24],maxZoom:3});}}};tb.appendChild(b)});

window.pan=function(id){const m=allMarkers[id];if(m && map){map.setView(m.getLatLng(),Math.max(map.getZoom(),6));m.openPopup();return true;}return false;};
}catch(mapError){
  console.warn('Map initialization failed; evidence panels remain available.', mapError);
  const mapEl=document.getElementById('map');
  if(mapEl){
    mapEl.innerHTML='<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:28px;background:#0b1728;color:#dceaff;font:14px/1.5 system-ui;text-align:center"><div><b>Interactive basemap unavailable in this browser session.</b><br><span style="color:#9cb0ca">The evidence tabs, timeline, source links, BDA, loss ledger and claim checks still work. If this is a local file in Brave, Shields may be blocking the Leaflet CDN. Hosting the page or allowing the CDN restores the map.</span></div></div>';
  }
}

function sourceNameFromUrl(u){
  try{
    const h=new URL(u).hostname.replace(/^www\./,'');
    if(h.includes('reuters'))return 'Reuters';
    if(h.includes('apnews'))return 'Associated Press';
    if(h.includes('washingtonpost'))return 'Washington Post';
    if(h.includes('centcom')||h.includes('defense.gov'))return 'U.S. / CENTCOM';
    if(h.includes('csis'))return 'CSIS';
    if(h.includes('missilethreat'))return 'CSIS Missile Threat';
    if(h.includes('aljazeera'))return 'Al Jazeera';
    if(h.includes('arabnews'))return 'Arab News';
    if(h.includes('thenationalnews'))return 'The National';
    if(h.includes('spa.gov.sa'))return 'Saudi Press Agency';
    return h;
  }catch(e){return 'source'}
}
function namedUrlLinks(urls){return (urls||[]).map(u=>[sourceNameFromUrl(u),u])}
function verificationClass(t){
 const s=(t||'').toUpperCase();
 if(s.includes('UNVERIFIED')||s.includes('CLAIMED')||s.includes('ACTOR CLAIM')||s.includes('NOT INDEPENDENT'))return 'ev-low';
 if(s.includes('MIXED')||s.includes('PARTIAL')||s.includes('LIKELY')||s.includes('PROBABLE')||s.includes('INCOMPLETE')||s.includes('MEDIUM'))return 'ev-med';
 return 'ev-high';
}
function claimClass(t){
 const s=(t||'').toUpperCase();
 if(s.includes('FALSE'))return 'ev-low';
 if(s.includes('UNVERIFIED')||s.includes('OVERSTAT')||s.includes('MIXED'))return 'ev-med';
 return 'ev-high';
}
function renderBalance(){
 let b=DATA.balance;let rows=b.domains.map(d=>`<div class="domain"><span>${esc(d[0])}</span><span class="u">${d[1]>0?'+':''}${d[1]}</span><span class="i">${d[2]>0?'+':''}${d[2]}</span></div>`).join('');
 document.getElementById('balance').innerHTML=`<div class="balance-top"><div><div class="score us">+${b.coalitionComposite}</div><div class="v">U.S./aligned coalition</div></div><div style="font-size:20px;color:#6c8097">vs</div><div><div class="score ir">${b.iranComposite}</div><div class="v">Iran/aligned state forces</div></div></div><div style="font-size:9.5px;color:#9cb0ca;margin:8px 0">${esc(b.note)}</div><div class="domain" style="font-weight:900;color:#c7d9ec"><span>Domain</span><span>US+</span><span>IRN</span></div>${rows}<div class="method-note">This is the project's analytic index, not a government or third-party score. It is included to summarize relative military/political leverage and is kept separate from the underlying evidence.</div>`
}
try{renderBalance();}catch(e){console.warn("renderBalance failed; using embedded static fallback",e);}

function renderFacilities(filter=''){
 const f=filter.toLowerCase();
 const rows=DATA.facilities.filter(x=>(x.name+' '+x.host+' '+x.role+' '+x.damage_evidence_status+' '+x.operational_effect_status+' '+(x.impact_grade||'')+' '+(x.effect||'')).toLowerCase().includes(f));
 document.getElementById('facilityList').innerHTML=rows.map(x=>`<div class="item facility-card" onclick="pan('${x.id}')">
   <div class="date">${esc(x.host||'')} • last reviewed ${esc(x.last_reviewed||'')}</div>
   <h3>${esc(x.name)}</h3>
   <div><span class="pill ${verificationClass(x.verification_grade)}">${esc(x.verification_grade||x.damage_evidence_status)}</span><span class="pill impact">${esc(x.impact_grade||x.operational_effect_status)}</span></div>
   <p><b>Purpose:</b> ${esc(x.purpose||x.role||'')}</p>
   <p><b>Verified physical damage:</b> ${esc((x.critical_assets_reported||[]).concat(x.noncritical_or_soft_assets_reported||[]).join('; ')||'No verified component list in the current ledger.')}</p>
   <p><b>Operational effect:</b> ${esc(x.effect||x.note||'')}</p>
   <p><b>What remained / what is not proved:</b> ${esc(x.continuity||x.current_presence_status||'')}</p>
   <div class="sources">${srcLinks(namedUrlLinks(x.source_urls))}</div>
 </div>`).join('')
}
try{renderFacilities();}catch(e){console.warn("renderFacilities failed; using embedded static fallback",e);}
document.getElementById('facilitySearch').oninput=e=>renderFacilities(e.target.value);

function renderStrikeEffects(filter=''){
 const f=filter.toLowerCase();
 const rows=DATA.strikes.filter(x=>(x.name+' '+(x.event_date||x.date||'')+' '+(x.verification||x.status||'')+' '+(x.impact_grade||'')+' '+(x.purpose||'')+' '+(x.effect||x.note||'')).toLowerCase().includes(f));
 document.getElementById('strikeList').innerHTML=rows.map(x=>`<div class="item" onclick="pan('${x.id}')">
  <div class="date">${esc(x.event_date||x.date||'')} • ${esc(x.verification||x.status||'')}</div>
  <h3>${esc(x.name)}</h3>
  <div><span class="pill ${verificationClass(x.verification||x.status)}">${esc(x.verification||x.status||'')}</span><span class="pill impact">${esc(x.impact_grade||'')}</span></div>
  ${x.tally?`<p><b>Loss / effect tally:</b> ${esc(x.tally)}</p>`:''}
  <p><b>Purpose of the target set:</b> ${esc(x.purpose||x.network_relevance||'')}</p>
  <p><b>Operational effect:</b> ${esc(x.effect||x.note||'')}</p>
  ${x.network_relevance?`<p><b>Network context:</b> ${esc(x.network_relevance)}</p>`:''}
  <div class="sources">${srcLinks(x.sources||namedUrlLinks(x.source_urls))}</div>
 </div>`).join('')
}
try{renderStrikeEffects();}catch(e){console.warn("renderStrikeEffects failed; using embedded static fallback",e);}
document.getElementById('strikeSearch').oninput=e=>renderStrikeEffects(e.target.value);

function timelineKey(x){const m=(x.date||x.sort||'').match(/\d{4}-\d{2}-\d{2}/);return m?m[0]:'9999-12-31'}
function combinedTimeline(filter=''){
 const f=filter.toLowerCase();
 let items=[];
 DATA.fullLedger.forEach(x=>items.push({kind:'KINETIC / INCIDENT',date:x.date,sort:x.date,title:`${x.attacker} → ${x.target||x.defender}`,body:x,search:Object.values(x).join(' ')}));
 DATA.strategicMilestones.forEach(x=>items.push({kind:x.cat==='CLAIM CHECK'?'STRATEGIC CLAIM CHECK':(x.cat||'STRATEGIC'),date:x.date,sort:timelineKey(x),title:x.title,body:x,search:Object.values(x).join(' ')}));
 DATA.demands.forEach(x=>items.push({kind:'BARGAINING / DEMAND',date:x.date,sort:x.sort,title:x.title,body:x,search:Object.values(x).join(' ')}));
 DATA.claims.forEach(x=>items.push({kind:'CLAIM CHECK',date:x.date,sort:timelineKey(x),title:x.name,body:x,search:Object.values(x).join(' ')}));
 items=items.filter(x=>(x.kind+' '+x.date+' '+x.title+' '+x.search).toLowerCase().includes(f));
 items.sort((a,b)=>a.sort.localeCompare(b.sort)||a.kind.localeCompare(b.kind));
 return items;
}
function renderTimeline(filter=''){
 const items=combinedTimeline(filter);
 let h=`<div class="callout"><strong>Coverage:</strong> the canonical engagement ledger starts on <b>${DATA.publicMeta.timeline_start}</b>. Bargaining entries and claim checks are interleaved by date so demands, concessions, reversals and disputed damage claims can be read alongside military events. Actor claims are not promoted to confirmed effects.</div>`;
 h+=items.map(it=>{
   if(it.kind==='BARGAINING / DEMAND'){
     const x=it.body;
     return `<div class="item demand-card"><div class="date">${esc(x.date)} • BARGAINING / DEMAND</div><h3>${esc(x.title)}</h3>
       <div><span class="pill bargain">${esc(x.status)}</span><span class="pill ${verificationClass(x.evidence)}">${esc(x.evidence)}</span></div>
       <p><b>Position / demand:</b> ${esc(x.position)}</p><p><b>Response:</b> ${esc(x.response)}</p><p><b>How the position changed:</b> ${esc(x.change)}</p><p><b>Outcome:</b> ${esc(x.outcome)}</p>
       <div class="sources">${srcLinks(x.src)}</div></div>`;
   }
   if(it.kind==='CLAIM CHECK'){
     const x=it.body;
     return `<div class="item claim-timeline"><div class="date">${esc(x.date)} • CLAIM CHECK</div><h3>${esc(x.name)}</h3>
       <div><span class="pill ${claimClass(x.verdict)}">${esc(x.verdict)}</span></div>
       <p><b>Claim:</b> ${esc(x.claim)}</p><p><b>Evidence finding:</b> ${esc(x.finding)}</p>
       <div class="sources">${srcLinks(x.sources)}</div></div>`;
   }
   if(it.kind==='KINETIC / INCIDENT'){
     const x=it.body;
     return `<div class="item"><div class="date">${esc(x.date)} ${esc(x.time)} • ${esc(x.id)} • KINETIC / INCIDENT</div><h3>${esc(it.title)}</h3>
       <div><span class="pill ${verificationClass(x.evidence)}">${esc(x.evidence)}</span></div>
       <p><b>Target / event:</b> ${esc(x.category)}${x.weapon?' • '+esc(x.weapon):''}</p>
       ${x.confirmed?`<p><b>Observed / confirmed:</b> ${esc(x.confirmed)}</p>`:''}${x.claimed?`<p><b>Actor claim:</b> ${esc(x.claimed)}</p>`:''}
       <p><b>Operational significance:</b> ${esc(x.significance)}</p>${x.notes?`<p><b>Qualification:</b> ${esc(x.notes)}</p>`:''}
       <div class="sources">${srcLinks(x.src)}</div></div>`;
   }
   const x=it.body;
   return `<div class="item"><div class="date">${esc(x.date)} • ${esc(it.kind)}</div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p><div class="sources">${srcLinks(x.src)}</div></div>`;
 }).join('');
 document.getElementById('timelineList').innerHTML=h;
}
try{renderTimeline();}catch(e){console.warn("renderTimeline failed; using embedded static fallback",e);}
document.getElementById('timelineSearch').oninput=e=>renderTimeline(e.target.value);

function renderCSIS(){
 const cards=DATA.csisMetrics.map(x=>`<div class="metric-card"><div class="metric-num">${esc(x.metric)}</div><div class="metric-period">${esc(x.period)}</div><p>${esc(x.meaning)}</p><p class="interpret"><b>What it means:</b> ${esc(x.interpretation)}</p><div class="sources">${srcLinks(x.src)}</div></div>`).join('');
 document.getElementById('csisList').innerHTML=cards;
}
try{renderCSIS();}catch(e){console.warn("renderCSIS failed; using embedded static fallback",e);}

function renderLosses(filter=''){
 const f=filter.toLowerCase();
 const a=DATA.assetLosses.filter(x=>(Object.values(x).join(' ')).toLowerCase().includes(f));
 const c=DATA.casualties.filter(x=>(Object.values(x).join(' ')).toLowerCase().includes(f));
 let h=`<div class="callout"><strong>Aggregation rule:</strong> cumulative casualty snapshots are not added to event-level rows. Claimed, visually confirmed and independently confirmed asset quantities remain separate.</div>`;
 h+=`<div class="section-title">Asset-loss ledger</div>`;
 h+=a.map(x=>`<div class="item"><div class="date">${esc(x.date)} • ${esc(x.id)} • ${esc(x.evidence)}</div><h3>${esc(x.actor)} → ${esc(x.country)}: ${esc(x.model||x.type)}</h3>
 <p><b>Damage / disposition:</b> ${esc(x.damage)} / ${esc(x.disposition)} • ${esc(x.location)}</p>
 <p><b>Quantities:</b> claimed ${esc(x.claimed??'—')} • visually confirmed ${esc(x.visual??'—')} • independently confirmed ${esc(x.independent??'—')} • assessed probable ${esc(x.probable??'—')}</p>
 <p><b>Cause:</b> ${esc(x.cause)}${x.notes?'<br><b>Qualification:</b> '+esc(x.notes):''}</p><div class="sources">${srcLinks(x.src)}</div></div>`).join('');
 h+=`<div class="section-title">Casualty records and snapshots</div>`;
 h+=c.map(x=>`<div class="item"><div class="date">${esc(x.date)} • ${esc(x.id)} • ${esc(x.evidence)}</div><h3>${esc(x.country)} — ${esc(x.scope)}</h3>
 <p><b>Confirmed:</b> killed ${esc(x.killed??'—')} • wounded ${esc(x.wounded??'—')} • missing ${esc(x.missing??'—')} ${x.estimatedKilled!=null?'• estimated killed '+esc(x.estimatedKilled):''}</p>
 <p><b>Aggregation:</b> ${esc(x.aggregation)}${x.notes?'<br><b>Qualification:</b> '+esc(x.notes):''}</p><div class="sources">${srcLinks(x.src)}</div></div>`).join('');
 document.getElementById('lossList').innerHTML=h;
}
try{renderLosses();}catch(e){console.warn("renderLosses failed; using embedded static fallback",e);}
document.getElementById('lossSearch').oninput=e=>renderLosses(e.target.value);

function cls(v){return String(v||'').replace(/[^A-Z0-9]+/g,'_')}
function renderClaims(filter=''){
 let f=filter.toLowerCase();
 document.getElementById('claimList').innerHTML=DATA.claims.filter(x=>(x.date+' '+x.name+' '+x.verdict+' '+x.claim+' '+x.finding).toLowerCase().includes(f)).map(x=>`<div class="item" onclick="pan('${x.id}')"><div class="date">${esc(x.date)}</div><h3><span class="badge ${cls(x.verdict)}">${esc(x.verdict)}</span>${esc(x.name)}</h3><p><b>Claim:</b> ${esc(x.claim)}<br><b>Finding:</b> ${esc(x.finding)}</p><div class="sources">${srcLinks(x.sources)}</div></div>`).join('')
}
try{renderClaims();}catch(e){console.warn("renderClaims failed; using embedded static fallback",e);}
document.getElementById('claimSearch').oninput=e=>renderClaims(e.target.value);

function renderSources(){
 let out='<div class="callout"><strong>Source architecture:</strong> wire services and independent imagery are used for factual verification; official/belligerent sources establish what an actor claims or acknowledges; regional/Eastern sources are used for local reporting, official statements and cross-checking. Where independent corroboration is absent, the item remains labeled unverified.</div>';
 for(const [k,arr] of Object.entries(DATA.sources)){out+=`<div class="section-title">${esc(k)}</div>`+arr.map(x=>`<div class="item"><h3>${esc(x[0])}</h3><div class="sources"><a target="_blank" rel="noopener" href="${esc(x[1])}">open source</a></div></div>`).join('')}
 document.getElementById('sourceList').innerHTML=out
}
try{renderSources();}catch(e){console.warn("renderSources failed; using embedded static fallback",e);}


function fallbackFilter(inputId,listId){
  const input=document.getElementById(inputId), list=document.getElementById(listId); if(!input||!list)return;
  input.addEventListener('input',function(){const q=this.value.toLowerCase(); list.querySelectorAll('[data-search]').forEach(function(el){el.style.display=(el.getAttribute('data-search')||'').toLowerCase().includes(q)?'':'none';});});
}
fallbackFilter('timelineSearch','timelineList');fallbackFilter('facilitySearch','facilityList');fallbackFilter('strikeSearch','strikeList');fallbackFilter('lossSearch','lossList');fallbackFilter('claimSearch','claimList');

document.querySelectorAll('.tab').forEach(function(b){ b.setAttribute('aria-controls',b.dataset.tab); });
if(map){ setTimeout(function(){map.invalidateSize();},100); }



// v2.7 information-war claim filters
(function(){
  function wireInfoWarFilters(){
    var root=document.getElementById('iwFilters');
    if(!root || root.dataset.wired==='1') return;
    root.dataset.wired='1';
    var buttons=root.querySelectorAll('.iw-filter');
    buttons.forEach(function(btn){
      btn.addEventListener('click',function(){
        buttons.forEach(function(b){b.classList.remove('active');});
        btn.classList.add('active');
        var key=btn.getAttribute('data-iw')||'ALL';
        document.querySelectorAll('#iwClaims .iw-claim').forEach(function(card){
          var st=(card.getAttribute('data-status')||'').toUpperCase();
          card.style.display=(key==='ALL'||st.indexOf(key)>=0)?'block':'none';
        });
      });
    });
  }
  wireInfoWarFilters();
  window.wireInfoWarFilters=wireInfoWarFilters;
})();

(function(){
 var q=document.getElementById('iwSearch');
 if(!q || q.dataset.wired==='1') return; q.dataset.wired='1';
 q.addEventListener('input',function(){
   var term=(q.value||'').toLowerCase().trim();
   document.querySelectorAll('#iwClaims .iw-claim').forEach(function(card){
     var filter=document.querySelector('#iwFilters .iw-filter.active');
     var key=filter?filter.getAttribute('data-iw'):'ALL';
     var status=(card.getAttribute('data-status')||'').toUpperCase();
     var okStatus=(key==='ALL'||status.indexOf(key)>=0);
     var okText=(!term||card.textContent.toLowerCase().indexOf(term)>=0);
     card.style.display=(okStatus&&okText)?'block':'none';
   });
 });
})();

})();
