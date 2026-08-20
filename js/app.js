(async function bootstrapAtlas(){
  let DATA, LEDGER;
  try {
    const dataFiles=['core.json','events.json','facilities.json','strikes.json','losses.json','claims.json','sources.json','economics.json','routes.json','missiles.json','influence-networks.json'];
    const ledgerFiles=['manifest.json','events.json','timeline.json','daily-coverage.json','facilities.json','map-links.json','movements.json','agreements.json','claims.json','casualties.json','material-losses.json','munitions-expenditure.json','cost-model.json','economics.json','shipping.json','diplomacy.json','attrition-series.json','bda-overlays.json','sources.json','source-role-map.json','revision-history.json','unresolved.json','collection-requests.json','domain-assessments.json'];
    const fetchJson=async path=>{
      const response=await fetch(path,{cache:'no-store'});
      if(!response.ok) throw new Error(`${path} request failed: ${response.status}`);
      return response.json();
    };
    const [payloads,ledgerPayloads]=await Promise.all([
      Promise.all(dataFiles.map(file=>fetchJson('./data/'+file))),
      Promise.all(ledgerFiles.map(file=>fetchJson('./data/integration-v1.2/'+file)))
    ]);
    DATA=Object.assign({},...payloads);
    LEDGER=Object.fromEntries(ledgerFiles.map((file,index)=>[file.replace(/\.json$/,''),ledgerPayloads[index]]));
    window.ATLAS_DATA=DATA;
    window.ATLAS_LEDGER=LEDGER;
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
const sourceById=new Map((LEDGER.sources.sources||[]).map(source=>[source.source_id,source]));
const eventById=new Map((LEDGER.events.events||[]).map(event=>[event.event_id,event]));
const mapLinkById=new Map((LEDGER['map-links'].links||[]).map(link=>[link.map_ref,link]));
const canonicalFacilityById=new Map((LEDGER.facilities.facilities||[]).map(facility=>[facility.facility_id,facility]));
function canonicalSourceLinks(refs){
  return (refs||[]).map(ref=>{
    const id=typeof ref==='string'?ref:ref.source_id;
    const source=sourceById.get(id);
    if(!source)return `<span class="source-missing">${esc(id)} — unresolved source reference</span>`;
    const roles=typeof ref==='string'?source.source_roles:(ref.roles||source.source_roles);
    const roleText=(roles||[]).length?` <small>${esc((roles||[]).join(' · '))}</small>`:'';
    return `<a target="_blank" rel="noopener" href="${esc(source.url)}" title="${esc(source.title||source.proof_note||'')}">${esc(source.outlet||id)}${roleText}</a>`;
  }).join(' ');
}
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
function historyLinkList(ids){
  return (ids||[]).map(id=>{
    const event=eventById.get(id);
    return event?`<button class="popup-event-link" type="button" onclick="focusLedgerEvent('${esc(id)}')">${esc(event.event_date)} · ${esc(event.summary)}</button>`:`<span>${esc(id)}</span>`;
  }).join('');
}
function canonicalFacilityPopup(facility,link){
  const damage=(facility&&facility.verified_physical_damage||[]).join('; ');
  const effect=(facility&&facility.verified_functional_effect||[]).join('; ');
  return `<h3>${esc((facility&&facility.name)||link.name)}</h3>${facility?`<b>Canonical status:</b> ${esc(facility.current_status)}<br><b>Verified damage:</b> ${esc(damage||'No verified physical-damage statement in this record.')}<br><b>Verified effect:</b> ${esc(effect||'No verified functional-effect statement in this record.')}<br><b>Assessment:</b> ${esc(facility.assessment||'')}`:''}<div class="popup-history"><b>Historical ledger</b>${historyLinkList(link.related_event_ids)}</div>`;
}
function mapLinkPopup(link){
  const facility=link.facility_ref?canonicalFacilityById.get(link.facility_ref):null;
  return facility?canonicalFacilityPopup(facility,link):`<h3>${esc(link.name)}</h3><b>Stable map identity:</b> ${esc(link.map_ref)}<div class="popup-history"><b>Historical ledger</b>${historyLinkList(link.related_event_ids)}</div>`;
}

// Facilities
let g=L.layerGroup(); groups['Iran damage → U.S.-linked sites']=g; DATA.facilities.forEach(p=>{let color='#8b98a9',txt='US';if(p.damage_evidence_status==='VERIFIED_DAMAGE')color='#ff5a5f';if(p.operational_effect_status==='SUBFACILITY_INOPERABLE')color='#111827';if(p.operational_effect_status==='HQ_FUNCTION_RELOCATED')color='#c084fc';if(p.damage_evidence_status==='NO_REPORTED_DAMAGE_FOUND_IN_REVIEWED_SOURCE_SET')color='#43d17a';if(p.damage_evidence_status==='DAMAGE_CLAIM_UNVERIFIED')color='#ffb84d';addMarker(g,p.id,p.lat,p.lon,txt,color,'square',facilityPopup(p))});g.addTo(map);
// Stable historical entities. Existing facility markers are enriched in place;
// only coordinate-backed new entities receive a new point marker.
let historyLayer=L.layerGroup(); groups['Historical ledger entities']=historyLayer;
(LEDGER['map-links'].links||[]).forEach(link=>{
  let marker=link.facility_ref?allMarkers[link.facility_ref]:null;
  if(marker){
    marker.bindPopup(mapLinkPopup(link),{maxWidth:380});
  }else if(link.lat!=null&&link.lon!=null){
    marker=addMarker(historyLayer,link.facility_ref||link.map_ref,link.lat,link.lon,'H','#2fb8c6','circle',mapLinkPopup(link));
  }
  if(marker)allMarkers[link.map_ref]=marker;
});
historyLayer.addTo(map);
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
 const domains=LEDGER['domain-assessments'].domains||[];
 const rows=domains.map(d=>`<article class="domain-assessment"><div class="domain-assessment-head"><b>${esc(d.domain)}</b><span class="pill ev-med">${esc(d.current_advantage)}</span><span class="pill impact">${esc(d.confidence)} CONFIDENCE</span></div><p>${esc(d.assessment)}</p><small>${esc(d.trend)}</small></article>`).join('');
 document.getElementById('balance').innerHTML=`<div class="callout"><strong>Domain assessment only:</strong> ${esc(LEDGER['domain-assessments'].rule)}</div><div class="domain-assessment-grid">${rows}</div>`;
}
try{renderBalance();}catch(e){console.warn("renderBalance failed; using embedded static fallback",e);}

function renderFacilities(filter=''){
 const f=filter.toLowerCase();
 const legacy=DATA.facilities.filter(x=>!canonicalFacilityById.has(x.id)).map(x=>({kind:'legacy',record:x,id:x.id}));
 const canonical=(LEDGER.facilities.facilities||[]).map(x=>({kind:'canonical',record:x,id:x.facility_id}));
 const rows=legacy.concat(canonical).filter(row=>JSON.stringify(row.record).toLowerCase().includes(f));
 document.getElementById('facilityList').innerHTML=`<div class="callout"><strong>Identity rule:</strong> ${esc(LEDGER.facilities.preservation_rule)} Canonical additions and updates: ${canonical.length}; preserved repository facilities: ${legacy.length}.</div>`+rows.map(row=>{
   const x=row.record;
   if(row.kind==='canonical'){
     const mapRef=x.map_ref||'';
     const damage=(x.verified_physical_damage||[]).join('; ')||'No verified physical-damage statement in this record.';
     const effect=(x.verified_functional_effect||[]).join('; ')||'No verified functional-effect statement in this record.';
     const continuity=(x.continued_operation_evidence||[]).join('; ')||'No continuity evidence recorded.';
     return `<div class="item facility-card" onclick="pan('${esc(mapRef||x.facility_id)}')"><div class="date">${esc(x.country)} • ${esc(x.facility_id)} • ${esc(x.integration_action)}</div><h3>${esc(x.name)}</h3><div><span class="pill ${verificationClass(x.current_status)}">${esc(x.current_status)}</span></div><p><b>Verified physical damage:</b> ${esc(damage)}</p><p><b>Verified functional effect:</b> ${esc(effect)}</p><p><b>Continuity:</b> ${esc(continuity)}</p><p><b>Assessment:</b> ${esc(x.assessment)}</p><div class="sources">${canonicalSourceLinks(x.source_ids)}</div></div>`;
   }
   return `<div class="item facility-card" onclick="pan('${x.id}')">
   <div class="date">${esc(x.host||'')} • last reviewed ${esc(x.last_reviewed||'')}</div>
   <h3>${esc(x.name)}</h3>
   <div><span class="pill ${verificationClass(x.verification_grade)}">${esc(x.verification_grade||x.damage_evidence_status)}</span><span class="pill impact">${esc(x.impact_grade||x.operational_effect_status)}</span></div>
   <p><b>Purpose:</b> ${esc(x.purpose||x.role||'')}</p>
   <p><b>Verified physical damage:</b> ${esc((x.critical_assets_reported||[]).concat(x.noncritical_or_soft_assets_reported||[]).join('; ')||'No verified component list in the current ledger.')}</p>
   <p><b>Operational effect:</b> ${esc(x.effect||x.note||'')}</p>
   <p><b>What remained / what is not proved:</b> ${esc(x.continuity||x.current_presence_status||'')}</p>
   <div class="sources">${srcLinks(namedUrlLinks(x.source_urls))}</div>
 </div>`;
 }).join('')
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

function ensureTimelineControls(){
 const search=document.getElementById('timelineSearch');
 if(!search||document.getElementById('timelineControls'))return;
 const controls=document.createElement('div');
 controls.id='timelineControls';
 controls.className='ledger-controls';
 controls.innerHTML=`<label>View<select id="timelineMode"><option value="as-of">AS OF — event chronology</option><option value="known-by">KNOWN BY — evidence availability</option></select></label><label>Cutoff<input id="timelineCutoff" type="date" min="2020-11-18" max="2026-08-20" value="2026-08-20"></label><label>Record class<select id="timelineClass"><option value="all">All 83 records</option><option value="prewar">Pre-war context (15)</option><option value="wartime">Wartime events (68)</option></select></label><output id="timelineCount" aria-live="polite"></output>`;
 search.parentNode.insertBefore(controls,search);
 controls.querySelectorAll('select,input').forEach(el=>el.addEventListener('change',()=>renderTimeline(search.value)));
}
function ledgerTimeline(filter=''){
 const mode=document.getElementById('timelineMode')?.value||'as-of';
 const cutoff=document.getElementById('timelineCutoff')?.value||'2026-08-20';
 const klass=document.getElementById('timelineClass')?.value||'all';
 const needle=filter.toLowerCase().trim();
 return (LEDGER.events.events||[]).filter(event=>{
   const relevantDate=mode==='known-by'?(event.first_reported||event.first_verified):event.event_date;
   if(!relevantDate||relevantDate.slice(0,10)>cutoff)return false;
   if(klass==='prewar'&&event.record_class!=='PRE-WAR CONTEXT')return false;
   if(klass==='wartime'&&event.record_class!=='WARTIME_EVENT')return false;
   return !needle||JSON.stringify(event).toLowerCase().includes(needle);
 }).sort((a,b)=>{
   const aKey=mode==='known-by'?(a.first_reported||a.first_verified||a.event_date):a.event_date;
   const bKey=mode==='known-by'?(b.first_reported||b.first_verified||b.event_date):b.event_date;
   return aKey.localeCompare(bKey)||a.event_id.localeCompare(b.event_id);
 });
}
function renderTimeline(filter=''){
 ensureTimelineControls();
 const items=ledgerTimeline(filter);
 const mode=document.getElementById('timelineMode')?.value||'as-of';
 const cutoff=document.getElementById('timelineCutoff')?.value||'2026-08-20';
 const count=document.getElementById('timelineCount');
 if(count)count.value=`${items.length} shown`;
 let h=`<div class="callout"><strong>Canonical historical ledger:</strong> 83 records — 15 pre-war context records and 68 wartime events. <b>AS OF</b> follows when an event occurred; <b>KNOWN BY</b> follows when public evidence first entered the record. Current adjudications remain visible in both modes. Date-only records never receive a fabricated time.</div><div class="ledger-view-note">${mode==='known-by'?'Evidence known by':'Events as of'} <b>${esc(cutoff)}</b></div>`;
 h+=items.map(event=>{
   const when=event.event_time?`${event.event_date} ${event.event_time}${event.timezone?' '+event.timezone:''}`:event.event_date;
   const mapRef=(event.map_refs||[]).find(ref=>allMarkers[ref])||(event.facility_refs||[]).find(ref=>allMarkers[ref]);
   const mapButton=mapRef?`<button class="ledger-map-button" type="button" onclick="panLedgerEvent('${esc(event.event_id)}')">Show linked map entity</button>`:'';
   return `<article class="item ledger-event" id="ledger-event-${esc(event.event_id)}"><div class="date">${esc(when)} • ${esc(event.event_time_precision)} • ${esc(event.record_class)} • ${esc(event.event_id)}</div><h3>${esc(event.summary)}</h3><div><span class="pill ${verificationClass(event.evidence_status)}">${esc(event.evidence_status)}</span><span class="pill impact">${esc(event.confidence)} CONFIDENCE</span><span class="pill">${esc(event.event_type)}</span></div><p><b>Actors / target:</b> ${esc((event.actors||[]).join(', '))} → ${esc(event.target||'')}</p>${event.observed_fact?`<p><b>Observed fact:</b> ${esc(event.observed_fact)}</p>`:''}${event.claimed_effect?`<p><b>Claimed effect:</b> ${esc(event.claimed_effect)}</p>`:''}${event.verified_effect?`<p><b>Verified effect:</b> ${esc(event.verified_effect)}</p>`:''}${event.counterevidence?`<p><b>Counterevidence:</b> ${esc(event.counterevidence)}</p>`:''}${event.continuity_evidence?`<p><b>Continuity:</b> ${esc(event.continuity_evidence)}</p>`:''}${event.later_outcome?`<p><b>Later outcome:</b> ${esc(event.later_outcome)}</p>`:''}<div class="ledger-dates"><span>First reported: ${esc(event.first_reported||'UNRESOLVED')}</span><span>First verified: ${esc(event.first_verified||'UNRESOLVED')}</span><span>Valid from: ${esc(event.valid_from||event.event_date)}${event.valid_to?' to '+esc(event.valid_to):''}</span></div>${mapButton}<div class="sources">${canonicalSourceLinks(event.source_refs)}</div></article>`;
 }).join('');
 document.getElementById('timelineList').innerHTML=h;
}
window.panLedgerEvent=function(id){
 const event=eventById.get(id);if(!event)return false;
 const ref=(event.map_refs||[]).find(x=>allMarkers[x])||(event.facility_refs||[]).find(x=>allMarkers[x]);
 return ref?window.pan(ref):false;
};
window.focusLedgerEvent=function(id){
 const tab=document.querySelector('.tab[data-tab="timeline"]');
 if(typeof showAtlasPanel==='function')showAtlasPanel('timeline',tab);
 const search=document.getElementById('timelineSearch');
 if(search){search.value=id;renderTimeline(id);}
 document.getElementById(`ledger-event-${id}`)?.scrollIntoView({behavior:'smooth',block:'start'});
};
try{renderTimeline();}catch(e){console.warn("renderTimeline failed; using embedded static fallback",e);}
document.getElementById('timelineSearch').oninput=e=>renderTimeline(e.target.value);

function renderCSIS(){
 const cards=DATA.csisMetrics.map(x=>`<div class="metric-card"><div class="metric-num">${esc(x.metric)}</div><div class="metric-period">${esc(x.period)}</div><p>${esc(x.meaning)}</p><p class="interpret"><b>What it means:</b> ${esc(x.interpretation)}</p><div class="sources">${srcLinks(x.src)}</div></div>`).join('');
 document.getElementById('csisList').innerHTML=cards;
}
try{renderCSIS();}catch(e){console.warn("renderCSIS failed; using embedded static fallback",e);}

function renderLosses(filter=''){
 const f=filter.toLowerCase();
 const casualties=(LEDGER.casualties.records||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(f));
 const material=(LEDGER['material-losses'].records||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(f));
 const munitions=(LEDGER['munitions-expenditure'].records||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(f));
 const us=LEDGER['cost-model'].us_coalition.ui_fields;
 let h=`<div class="callout"><strong>Like-for-like accounting:</strong> ${esc(LEDGER.casualties.display_policy.rule)} Material loss, munitions expenditure, repair/reconstitution, and wider economic effects remain separate. UNPRICED does not mean zero.</div>`;
 h+=`<div class="ledger-cost-grid"><div><b>U.S. material loss/damage</b><strong>$5.8–$12.9B</strong><small>${esc(us.material_loss_damage_cost.label)}</small></div><div><b>U.S. munitions expended</b><strong>$26.1B</strong><small>${esc(us.munitions_expended_cost.label)}</small></div><div><b>Iran material loss</b><strong>UNPRICED</strong><small>No defensible replacement/repair price basis in the reviewed set.</small></div><div><b>Complete Aug. 20 military total</b><strong>UNRESOLVED</strong><small>${esc(us.current_aug20_total.display)}</small></div></div>`;
 h+=`<div class="section-title">Casualty records — same-category comparison only</div>`;
 h+=casualties.map(x=>`<div class="item"><div class="date">${esc(x.event_date)} • ${esc(x.casualty_id)} • ${esc(x.evidence_status)}</div><h3>${esc(x.country)} — ${esc(x.display_category)}</h3><p><b>Supported record:</b> killed ${esc(x.killed??'—')} • wounded ${esc(x.wounded??'—')} • missing ${esc(x.missing??'—')}</p><p><b>Cause / aggregation:</b> ${esc(x.cause_type)} • ${esc(x.aggregation_type)}</p>${x.notes?`<p><b>Qualification:</b> ${esc(x.notes)}</p>`:''}<div class="sources">${canonicalSourceLinks(x.source_ids)}</div></div>`).join('');
 h+=`<div class="callout"><strong>Leadership gap:</strong> ${esc(LEDGER.casualties.leadership_gap)} The legacy total of 11 remains quarantined from canonical comparison until itemized.</div><div class="section-title">Durable material losses</div>`;
 h+=material.map(x=>`<div class="item"><div class="date">${esc(x.event_date)} • ${esc(x.loss_id)} • ${esc(x.confidence)} CONFIDENCE</div><h3>${esc(x.owner)} — ${esc(x.item)}</h3><p><b>Disposition:</b> ${esc(x.quantity)} × ${esc(x.status)} / ${esc(x.disposition)}</p><p><b>Accounting:</b> ${esc(x.accounting_category)} • cost ${esc(x.cost_status)}</p>${x.note?`<p><b>Qualification:</b> ${esc(x.note)}</p>`:''}<div class="sources">${canonicalSourceLinks(x.source_ids)}</div></div>`).join('');
 h+=`<div class="section-title">Munitions expenditure — launch remains expenditure</div>`;
 h+=munitions.map(x=>`<div class="item"><div class="date">${esc(x.period_start)} to ${esc(x.period_end)} • ${esc(x.expenditure_id)}</div><h3>${esc(x.actor)} — ${esc(x.munition)}</h3><p><b>Expended:</b> ${esc(x.quantity_qualifier||'')}${esc(x.quantity??'UNRESOLVED')} • ${esc(x.evidence_type)}</p><p><b>Status / cost:</b> ${esc(x.status)} • ${esc(x.cost_status)}</p>${x.note?`<p><b>Qualification:</b> ${esc(x.note)}</p>`:''}<div class="sources">${canonicalSourceLinks(x.source_ids)}</div></div>`).join('');
 document.getElementById('lossList').innerHTML=h;
}
try{renderLosses();}catch(e){console.warn("renderLosses failed; using embedded static fallback",e);}
document.getElementById('lossSearch').oninput=e=>renderLosses(e.target.value);

function cls(v){return String(v||'').replace(/[^A-Z0-9]+/g,'_')}
function renderClaims(filter=''){
 let f=filter.toLowerCase();
 const rows=(LEDGER.claims.claims||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(f));
 document.getElementById('claimList').innerHTML=`<div class="callout"><strong>Case-file rule:</strong> Claims are adjudicated through chronology, supporting evidence, counterevidence, continuity, and explicit change conditions—not a binary narrative score.</div>`+rows.map(x=>{const mapRef=(x.map_refs||[]).find(ref=>allMarkers[ref])||(x.facility_refs||[]).find(ref=>allMarkers[ref]);return `<article class="item claim-timeline"${mapRef?` onclick="pan('${esc(mapRef)}')"`:''}><div class="date">${esc(x.earliest_known_origin||'ORIGIN UNRESOLVED')} • ${esc(x.case_id)}</div><h3><span class="badge ${cls(x.current_verdict)}">${esc(x.current_verdict)}</span>${esc(x.claim)}</h3><p><b>What happened:</b> ${esc(x.what_actually_happened)}</p>${(x.evidence_supporting_claim||[]).length?`<p><b>Supporting evidence:</b> ${esc(x.evidence_supporting_claim.join(', '))}</p>`:''}${(x.counterevidence||[]).length?`<p><b>Counterevidence:</b> ${esc(x.counterevidence.join(', '))}</p>`:''}${(x.unresolved_questions||[]).length?`<p><b>Unresolved:</b> ${esc(x.unresolved_questions.join(' '))}</p>`:''}<p><b>What would change the assessment:</b> ${esc((x.what_would_change_assessment||[]).join(' '))}</p><div class="sources">${canonicalSourceLinks(x.source_ids)}</div></article>`}).join('')
}
try{renderClaims();}catch(e){console.warn("renderClaims failed; using embedded static fallback",e);}
document.getElementById('claimSearch').oninput=e=>renderClaims(e.target.value);

function renderSources(){
 const sources=LEDGER.sources.sources||[];
 let out=`<div class="callout"><strong>Canonical source namespace:</strong> ${esc(LEDGER.sources.id_rule)} This ledger contains ${sources.length} source records with explicit proof roles and record lineage.</div>`;
 const grouped=Object.groupBy?Object.groupBy(sources,x=>x.quality||'UNRATED'):sources.reduce((acc,x)=>{(acc[x.quality||'UNRATED']??=[]).push(x);return acc},{});
 for(const [quality,rows] of Object.entries(grouped).sort()){out+=`<div class="section-title">Quality ${esc(quality)}</div>`+rows.map(x=>`<article class="item source-record"><div class="date">${esc(x.source_id)} • ${esc(x.publication_date||'DATE UNRESOLVED')}</div><h3>${esc(x.outlet)} — ${esc(x.title||'Untitled source')}</h3><p><b>Roles:</b> ${esc((x.source_roles||[]).join(' · '))}</p><p><b>Proof note:</b> ${esc(x.proof_note||'')}</p><p><b>Lineage:</b> ${esc(x.lineage||x.source_origin||'')}</p><div class="sources"><a target="_blank" rel="noopener" href="${esc(x.url)}">open source</a></div></article>`).join('')}
 document.getElementById('sourceList').innerHTML=out
}
try{renderSources();}catch(e){console.warn("renderSources failed; using embedded static fallback",e);}

function renderHistoricalModel(){
 const summary=document.getElementById('historicalSummary');
 if(!summary)return;
 const counts=LEDGER.manifest.counts||{};
 const coverage=LEDGER['daily-coverage'].coverage||[];
 const quietMarkers=coverage.filter(x=>x.collection_status==='NO_STANDALONE_VERIFIED_EVENT_IN_CURRENT_SOURCE_SET').length;
 summary.innerHTML=`<div class="ledger-summary-grid"><div><b>${esc(counts.events)}</b><span>historical events</span></div><div><b>${esc(counts.prewar_events)}</b><span>pre-war context</span></div><div><b>${esc(counts.wartime_events)}</b><span>wartime events</span></div><div><b>${esc(coverage.length)}</b><span>daily coverage markers</span></div><div><b>${esc(counts.sources)}</b><span>canonical sources</span></div><div><b>${esc(counts.revision_records)}</b><span>documented revisions</span></div></div><div class="callout"><strong>Coverage rule:</strong> ${quietMarkers} daily markers record that no standalone verified event was found in the current source set. They are collection-state markers—not evidence that nothing happened.</div>`;
 document.getElementById('movementList').innerHTML=(LEDGER.movements.movements||[]).map(x=>`<article class="item"><div class="date">${esc(x.date)} • ${esc(x.movement_id)}</div><h3>${esc(x.unit_or_asset)}</h3><div><span class="pill bargain">${esc(x.display_label)}</span><span class="pill impact">${esc(x.force_posture_classification)}</span></div><p><b>Movement:</b> ${esc(x.from)} → ${esc(x.to)}</p><p><b>Decision / execution:</b> ${esc(x.decision_date||'UNRESOLVED')} / ${esc(x.actual_execution_date||x.execution_date||'UNRESOLVED')}</p><p><b>War-change assessment:</b> ${esc(x.war_change_assessment||x.assessment_notes)}</p><p><b>Causation:</b> ${esc((x.causation_language||[]).join(' '))}</p><div class="sources">${canonicalSourceLinks(x.source_refs)}</div></article>`).join('');
 document.getElementById('agreementList').innerHTML=(LEDGER.agreements.records||[]).map(x=>{
   const relationship=x.replaces_us_linked_arrangement?'REPLACES U.S.-LINKED ARRANGEMENT':x.supplements_us_linked_arrangement?'SUPPLEMENTS U.S.-LINKED ARRANGEMENT':x.coexists_with_us_linked_arrangement?'COEXISTS WITH U.S.-LINKED ARRANGEMENT':'NO DEMONSTRATED EFFECT ON U.S.-LINKED ARRANGEMENT';
   return `<article class="item"><div class="date">${esc(x.origin_date||'ORIGIN UNRESOLVED')} • ${esc(x.agreement_id)}</div><h3>${esc(x.name)}</h3><div><span class="pill ${verificationClass(x.status)}">${esc(x.status)}</span><span class="pill impact">${esc(relationship)}</span></div><p><b>Parties:</b> ${esc((x.parties||[]).join(' · '))}</p><p><b>U.S. role:</b> ${esc(x.us_role)}${(x.us_role_categories||[]).length?' — '+esc(x.us_role_categories.join(' · ')):''}</p><p><b>Assessment:</b> ${esc(x.current_assessment)}</p><p><b>What it does not prove:</b> ${esc(x.what_it_does_not_prove)}</p><div class="sources">${canonicalSourceLinks(x.source_ids)}</div></article>`;
 }).join('');
 const gaps=LEDGER.unresolved.items||[];
 document.getElementById('gapList').innerHTML=`<div class="callout"><strong>Open collection remains visible:</strong> ${gaps.length} unresolved items are retained as explicit gaps; no unknown is converted to zero or fact.</div>`+gaps.map(x=>`<article class="item"><div class="date">${esc(x.priority)} PRIORITY • ${esc(x.unresolved_id)} • ${esc(x.status)}</div><h3>${esc(x.topic)}</h3><p><b>Question:</b> ${esc(x.question)}</p><p><b>Why it matters:</b> ${esc(x.why_it_matters)}</p><p><b>Next collection:</b> ${esc((x.next_collection||[]).join(' · '))}</p></article>`).join('');
 const revisions=LEDGER['revision-history'].revisions||[];
 document.getElementById('revisionList').innerHTML=revisions.map(x=>`<article class="item"><div class="date">${esc(x.date)} • ${esc(x.revision_id)} • ${esc(x.action)}</div><h3>${esc(x.record)}</h3><p>${esc(x.change)}</p>${x.reason?`<p><b>Reason:</b> ${esc(x.reason)}</p>`:''}</article>`).join('');
}
try{renderHistoricalModel();}catch(e){console.warn('renderHistoricalModel failed',e);}


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
