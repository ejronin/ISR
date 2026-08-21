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
const Safe=window.AtlasSafe;
const Presentation=window.AtlasPresentation;
const Temporal=window.AtlasTemporal;
const Costing=window.AtlasCosting;
if(!Safe||!Presentation||!Temporal||!Costing)throw new Error('Required local safety and presentation modules are unavailable.');
const esc=Safe.escapeHtml;
const label=Presentation.formatLabel;
const escLabel=value=>esc(label(value));
const srcLinks=Safe.sourceLinks;
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
    const roleText=(roles||[]).map(label).join(' · ');
    return Safe.externalLink(`${source.outlet||id}${roleText?' — '+roleText:''}`,source.url,source.title||source.proof_note||'');
  }).join(' ');
}
function evidenceBadge(value){const state=Presentation.evidenceState(value);return `<span class="evidence-badge evidence-${state}">${esc(Presentation.evidenceLabel(value))}</span>`;}
function physicalBadge(value){const state=Presentation.physicalState(value);return `<span class="physical-badge physical-${state}">${esc(Presentation.physicalLabel(state))}</span>`;}
function physicalColor(state){return ({lost:'#ef5961',degraded:'#f2b84b',operational:'#42c77a',neutral:'#7f8d9d'})[state]||'#7f8d9d';}
function physicalComponent(text,labelText){const state=Presentation.physicalState(text);return `<li class="component-state component-${state}">${physicalBadge(text)}${labelText?`<b>${esc(labelText)}</b>`:''}<span>${escLabel(text)}</span></li>`;}
function componentList(values,emptyText){const rows=(values||[]).filter(Boolean);return `<ul class="component-list">${rows.length?rows.map(value=>physicalComponent(value)).join(''):physicalComponent(emptyText||'Status unresolved.')}</ul>`;}
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
 const iconAssets={facility:'assets/icons/facility.svg',strike:'assets/icons/strike.svg',claim:'assets/icons/claim.svg',historical:'assets/icons/historical.svg',agreement:'assets/icons/agreement.svg',current:'assets/icons/current.svg',imagery:'assets/icons/imagery.svg'};
 function icon(kind,color,shape='circle',evidence='supported'){const asset=iconAssets[kind]||iconAssets.current;return L.divIcon({className:`atlas-marker-host evidence-marker-${evidence}`,html:`<div class="pin ${shape}" style="--marker-color:${esc(color)}"><img src="${asset}" alt=""/></div>`,iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-15]})}
 function addMarker(group,id,lat,lon,kind,color,shape,popup,title,evidence='supported'){const markerLabel=title||id;const mk=L.marker([lat,lon],{icon:icon(kind,color,shape,evidence),title:markerLabel,alt:markerLabel,keyboard:true}).bindPopup(popup,{maxWidth:380});mk.addTo(group);allMarkers[id]=mk;return mk}
 function legacyFacilityPhysicalState(p){const assets=[...(p.critical_assets_reported||[]),...(p.noncritical_or_soft_assets_reported||[])];const states=assets.map(Presentation.physicalState);if(states.includes('lost'))return 'lost';if(states.includes('degraded'))return 'degraded';if(Presentation.physicalState(p.continuity||p.current_presence_status)==='operational')return 'operational';return 'neutral';}
 function canonicalFacilityPhysicalState(p){const states=[...(p.verified_physical_damage||[]),...(p.verified_functional_effect||[])].map(Presentation.physicalState);if(states.includes('lost'))return 'lost';if(states.includes('degraded'))return 'degraded';if((p.continued_operation_evidence||[]).some(value=>Presentation.physicalState(value)==='operational'))return 'operational';return 'neutral';}
 function facilityPopup(p){const assets=[...(p.critical_assets_reported||[]),...(p.noncritical_or_soft_assets_reported||[])];const evidence=p.verification_grade||p.damage_evidence_status;return `<div class="atlas-popup"><h3>${esc(p.name)}</h3><div class="popup-badges">${evidenceBadge(evidence)}</div><p><b>Purpose</b>${esc(p.purpose||p.role||'Purpose unresolved.')}</p><section><b>Component physical state</b>${componentList(assets,'No verified component list in the current ledger.')}</section><section><b>Functional effect</b>${componentList([p.effect||p.note||'Functional effect unresolved.'])}</section><section><b>Continuity</b>${componentList([p.continuity||p.current_presence_status||'Continuity unresolved.'])}</section><div class="sources">${srcLinks((p.source_urls||[]).map(u=>[sourceNameFromUrl(u),u]))}</div></div>`}
 function strikePopup(p){const evidence=p.verification||p.status||'SUPPORTED';return `<div class="atlas-popup"><h3>${esc(p.name)}</h3><div class="popup-badges">${evidenceBadge(evidence)}</div><p><b>Date</b>${esc(p.event_date||p.date||'Date unresolved.')}</p>${p.tally?`<p><b>Tally / effect</b>${esc(p.tally)}</p>`:''}<p><b>Target / effect</b>${esc(p.target_type||p.note||'')}</p>${p.network_relevance?`<p><b>Network relevance</b>${esc(p.network_relevance)}</p>`:''}${p.note&&p.target_type?`<p><b>Context</b>${esc(p.note)}</p>`:''}<div class="sources">${srcLinks(p.sources||(p.source_urls||[]).map((u,i)=>['source '+(i+1),u]))}</div></div>`}
 function claimPopup(p){return `<div class="atlas-popup"><h3>${esc(p.name)}</h3><div class="popup-badges">${evidenceBadge(p.verdict)}</div><p><b>Claim</b>${esc(p.claim)}</p><p><b>Finding</b>${esc(p.finding)}</p><div class="sources">${srcLinks(p.sources)}</div></div>`}
function historyLinkList(ids){
  return (ids||[]).map(id=>{
    const event=eventById.get(id);
    return event?`<button class="popup-event-link" type="button" data-event-id="${esc(id)}">${esc(event.event_date)} · ${esc(event.summary)}</button>`:`<span>${esc(id)}</span>`;
  }).join('');
}
 function canonicalFacilityPopup(facility,link){
   const evidence=facility&&facility.current_status||'SUPPORTED';
   return `<div class="atlas-popup"><h3>${esc((facility&&facility.name)||link.name)}</h3>${facility?`<div class="popup-badges">${evidenceBadge(evidence)}</div><section><b>Component physical state</b>${componentList(facility.verified_physical_damage,'No verified physical-damage statement in this record.')}</section><section><b>Functional effect</b>${componentList(facility.verified_functional_effect,'No verified functional-effect statement in this record.')}</section><section><b>Continuity</b>${componentList(facility.continued_operation_evidence,'Continuity unresolved.')}</section><p><b>Assessment</b>${esc(facility.assessment||'Assessment unresolved.')}</p>`:''}<div class="popup-history"><b>Historical ledger</b>${historyLinkList(link.related_event_ids)}</div></div>`;
  }
function mapLinkPopup(link){
  const facility=link.facility_ref?canonicalFacilityById.get(link.facility_ref):null;
  return facility?canonicalFacilityPopup(facility,link):`<h3>${esc(link.name)}</h3><b>Stable map identity:</b> ${esc(link.map_ref)}<div class="popup-history"><b>Historical ledger</b>${historyLinkList(link.related_event_ids)}</div>`;
}

// Sites use physical/functional state for marker fill; evidence is a separate corner dot and popup badge.
let g=L.layerGroup();groups['Sites']=g;
DATA.facilities.forEach(p=>{const physical=legacyFacilityPhysicalState(p);const evidence=Presentation.evidenceState(p.verification_grade||p.damage_evidence_status);addMarker(g,p.id,p.lat,p.lon,'facility',physicalColor(physical),'square',facilityPopup(p),p.name,evidence)});g.addTo(map);

// Historical event entities and force-posture geometry are separate expert layers.
let historyLayer=L.layerGroup();groups['Historical events']=historyLayer;
let forcePosture=L.layerGroup();groups['Force posture']=forcePosture;
const postureType=/POSTURE|BASE_HANDOVER|WITHDRAW|AGREEMENT|SECURITY_(?:TRANSITION|FRAMEWORK)|FORCE_PROTECTION|C2_RESILIENCE|COALITION_POSTURE/;
(LEDGER['map-links'].links||[]).forEach(link=>{
  const linkedEvents=(link.related_event_ids||[]).map(id=>eventById.get(id)).filter(Boolean);
  const isPosture=linkedEvents.some(event=>postureType.test(String(event.event_type||''))||event.record_class==='PRE-WAR CONTEXT');
  let marker=link.facility_ref?allMarkers[link.facility_ref]:null;
  if(marker){marker.bindPopup(mapLinkPopup(link),{maxWidth:380});allMarkers[link.map_ref]=marker;}
  if(link.lat==null||link.lon==null)return;
  if(isPosture){
    L.circleMarker([link.lat,link.lon],{radius:12,color:'#6d8fae',weight:3,opacity:.95,fillColor:'#101e2d',fillOpacity:.25,dashArray:'3 3'}).bindPopup(mapLinkPopup(link),{maxWidth:380}).addTo(forcePosture);
  }else if(!marker){
    marker=addMarker(historyLayer,link.facility_ref||link.map_ref,link.lat,link.lon,'historical','#7f8d9d','circle',mapLinkPopup(link),link.name,'supported');allMarkers[link.map_ref]=marker;
  }
});

// Source-supported BDA: a local eye icon denotes imagery availability; the cyan halo is not a damage polygon.
let bda=L.layerGroup();groups['BDA imagery']=bda;
(LEDGER['bda-overlays'].overlays||[]).filter(overlay=>overlay.candidate_confidence==='HIGH').forEach(overlay=>{
 const base=allMarkers[overlay.facility_ref];if(!base)return;
 const canonical=canonicalFacilityById.get(overlay.facility_ref);const legacy=DATA.facilities.find(facility=>facility.id===overlay.facility_ref);
 const name=canonical?.name||legacy?.name||overlay.facility_ref;
 const damage=canonical?.verified_physical_damage||[...(legacy?.critical_assets_reported||[]),...(legacy?.noncritical_or_soft_assets_reported||[])];
 const effect=canonical?.verified_functional_effect||[legacy?.effect||legacy?.note||'Functional effect unresolved.'];
 const popup=`<div class="atlas-popup bda-popup"><h3>${esc(name)}</h3><div class="popup-badges"><span class="imagery-badge"><img src="assets/icons/imagery.svg" alt=""/>IMAGERY AVAILABLE</span>${evidenceBadge(overlay.candidate_confidence)}</div><section><b>Imagery available</b><p>Source-linked visual coverage is available for this location.</p></section><section><b>Physical damage</b>${componentList(damage,'Physical damage unresolved.')}</section><section><b>Functional effect</b>${componentList(effect,'Functional effect unresolved.')}</section><section><b>Imagery limitations</b><p>${esc(overlay.limitations)}</p></section><div class="sources">${canonicalSourceLinks(overlay.damage_imagery_source_ids)}</div></div>`;
 L.circleMarker(base.getLatLng(),{radius:19,color:'#54d9e8',weight:3,opacity:.95,fill:false,dashArray:'5 4',interactive:false}).addTo(bda);
 addMarker(bda,overlay.overlay_id,base.getLatLng().lat,base.getLatLng().lng,'imagery','#1bbdd0','circle',popup,`${name} — imagery available`,'verified');
});

// U.S. strike effects are thematic markers; popup evidence remains separate from physical state.
let s=L.layerGroup();groups['Strike effects']=s;DATA.strikes.forEach(p=>{if(p.lat==null||p.lon==null)return;const evidence=Presentation.evidenceState(p.verification||p.status);addMarker(s,p.id,p.lat,p.lon,'strike','#364454','diamond',strikePopup(p),p.name,evidence)});s.addTo(map);

// Agreements and alignment share a single expert override layer.
let c=L.layerGroup();groups['Agreements / alignment']=c;
DATA.coalition14.forEach(p=>addMarker(c,p.id,p.lat,p.lon,'agreement','#4c7292','circle',`<div class="atlas-popup"><h3>${esc(p.name)}</h3><div class="popup-badges">${evidenceBadge('SUPPORTED')}</div><p><b>Alignment</b>${esc(p.role)}</p><p>${esc(p.political_context||'')}</p><div class="sources">${srcLinks((p.source_urls||[]).map((u,i)=>['source '+(i+1),u]))}</div></div>`,p.name,'supported'));
DATA.mecca.forEach((p,i)=>addMarker(c,'MECCA-'+i,p.lat,p.lon,'agreement','#4c7292','circle',`<div class="atlas-popup"><h3>${esc(p.name)}</h3><div class="popup-badges">${evidenceBadge('SOURCE REPORTED')}</div><p>Saudi Arabia, Türkiye and Pakistan signed a mutual-defense pact Aug. 7. An armed attack on one is to be regarded as an attack on all, but the published statement did not specify automatic operational commitments.</p><div class="sources">${srcLinks([['Reuters','https://www.reuters.com/world/asia-pacific/saudi-arabia-turkey-pakistan-sign-joint-defence-deal-amid-regional-turmoil-2026-08-07/'],['Al Jazeera','https://www.aljazeera.com/news/2026/8/7/turkiye-saudi-arabi-pakistan-sign-joint-defence-agreement-whats-in-it']])}</div></div>`,p.name,'reported'));

let v=L.layerGroup();groups['Verification mechanisms']=v;DATA.verifiers.forEach(p=>addMarker(v,p.id,p.lat,p.lon,'agreement','#596a7b','circle',`<div class="atlas-popup"><h3>${esc(p.name)}</h3><div class="popup-badges">${evidenceBadge('CONTESTED')}</div><p><b>Proposed — not finalized</b>${esc(p.role)}</p><p>Lebanese officials later denied that Beirut had agreed to a shortlist; this remains a candidate mechanism, not a settled deployment.</p><div class="sources">${srcLinks((p.source_urls||[]).map((u,i)=>['source '+(i+1),u]))}</div></div>`,p.name,'contested'));


// Current OSINT update layer — Aug. 17-19, 2026
let cur=L.layerGroup();groups['Current events']=cur;
(DATA.strategicMilestones||[]).filter(function(x){return String(x.date||'').slice(0,10)>='2026-08-17' && x.lat!=null && x.lon!=null;}).forEach(function(x,i){
  const cat=String(x.cat||'');
  addMarker(cur,'CUR-'+i,x.lat,x.lon,'current','#327d9b','circle',`<div class="atlas-popup"><h3>${esc(x.title)}</h3><div class="popup-badges">${evidenceBadge('SUPPORTED')}</div><p><b>${esc(x.date)} • ${escLabel(x.cat||'CURRENT OSINT')}</b></p><p>${esc(x.body||'')}</p><div class="sources">${srcLinks(x.src||[])}</div></div>`,x.title,'supported');
});

// China / Arctic routes — published corridors, schematic geometry (not live AIS tracks)
let ar=L.featureGroup();groups['Trade / logistics routes']=ar;
(function(){
  const audited={
    'ARCTIC-CN-EU-CONTAINER':[[29.87,121.54],[30.0,123.5],[33.8,129.2],[40.0,134.0],[45.7,142.2],[51.5,151.0],[60.0,165.0],[69.7,170.3],[72.0,145.0],[74.0,115.0],[73.5,85.0],[71.3,72.1],[70.5,50.0],[69.0,33.1],[62.0,12.0],[55.0,2.0],[51.96,1.35]],
    'ARCTIC-RU-CN-OIL':[[69.0,33.1],[71.0,50.0],[73.0,80.0],[74.0,115.0],[72.0,145.0],[69.7,170.3],[60.0,165.0],[51.5,151.0],[45.7,142.2],[40.0,134.0],[33.8,129.2],[30.0,123.5],[31.2,121.5]]
  };
(DATA.arcticRoutes||[]).forEach(function(r){
  const color=r.type==='energy'?'#c084fc':'#54d9e8';
  L.polyline(audited[r.id]||r.coords,{color:color,weight:4,opacity:.82,dashArray:r.type==='energy'?'8 7':null}).addTo(ar)
   .bindPopup(`<div class="atlas-popup"><h3>${esc(r.name)}</h3><div class="route-label">SCHEMATIC • ${escLabel(r.status)}</div><p>${esc(r.note)}</p><div class="sources">${srcLinks(r.src)}</div></div>`);
  (r.nodes||[]).forEach(function(n,i){
    L.circleMarker([n[1],n[2]],{radius:5,color:'#07111f',weight:2,fillColor:color,fillOpacity:.95}).addTo(ar)
      .bindPopup(`<h3>${esc(n[0])}</h3>${esc(r.name)}<br><small>Schematic corridor node; exact voyages vary.</small><div>${srcLinks(r.src)}</div>`);
  });
});
}());

// Claims
let q=L.layerGroup();groups['Geolinked claims']=q;DATA.claims.forEach(p=>addMarker(q,p.id,p.lat,p.lon,'claim','#596a7b','circle',claimPopup(p),p.name,Presentation.evidenceState(p.verdict)));

// Analysis navigation owns the map state; this compact control is an expert override.
const viewLayers={snapshot:['Sites','Strike effects','Current events'],timeline:['Sites','Strike effects','Historical events'],facilities:['Sites'],strikes:['Strike effects'],imagery:['Sites','BDA imagery'],csis:['Strike effects'],losses:['Sites','Strike effects'],economy:[],arctic:['Trade / logistics routes'],claims:['Geolinked claims'],infowar:['Geolinked claims'],historical:['Historical events','Force posture','Agreements / alignment','Verification mechanisms'],sources:[],intro:[],history:[]};
const viewCenters={snapshot:[[27.5,51.5],4],facilities:[[27.0,50.0],5],strikes:[[31.5,52.0],5],imagery:[[26.5,50.0],5],csis:[[31.5,52.0],5],losses:[[28.0,51.0],4],economy:[[25.5,51.0],4],claims:[[27.5,51.5],4],infowar:[[27.5,51.5],4],historical:[[29.0,48.0],4],sources:[[27.5,51.5],4],intro:[[27.5,51.5],4],history:[[27.5,51.5],4]};
function refreshLayerButtons(){document.querySelectorAll('[data-layer-name]').forEach(button=>button.classList.toggle('on',map.hasLayer(groups[button.dataset.layerName])));}
window.configureAtlasMap=function(viewId){map.closePopup();Object.values(groups).forEach(layer=>{if(map.hasLayer(layer))map.removeLayer(layer);});(viewLayers[viewId]||viewLayers.snapshot).forEach(name=>groups[name]?.addTo(map));if(viewId!=='timeline')document.querySelectorAll('.atlas-marker-host.timeline-member,.atlas-marker-host.timeline-hidden,.atlas-marker-host.selected-marker').forEach(el=>el.classList.remove('timeline-member','timeline-hidden','selected-marker'));refreshLayerButtons();if(viewId==='arctic'&&ar.getBounds().isValid())map.fitBounds(ar.getBounds(),{padding:[24,24],maxZoom:3});else if(viewId!=='timeline'&&viewCenters[viewId])map.setView(viewCenters[viewId][0],viewCenters[viewId][1]);};
const tb=document.getElementById('toolbar');
if(tb){const sections=[['Operations',[['Sites','Sites'],['Strike effects','Strike effects'],['Current events','Current events']]],['Evidence',[['BDA imagery','BDA imagery'],['Historical events','Historical events']]],['Posture',[['Force posture','Force posture'],['Agreements / alignment','Agreements / alignment'],['Verification mechanisms','Verification mechanisms']]],['Routes',[['Trade / logistics routes','Trade / logistics routes — SCHEMATIC']]],['Claims',[['Geolinked claims','Geolinked claims']]]];const details=document.createElement('details');details.className='layer-control';const summary=document.createElement('summary');summary.textContent='Map layers';details.appendChild(summary);const body=document.createElement('div');body.className='layer-control-body';sections.forEach(([heading,rows])=>{const section=document.createElement('section');section.className='layer-control-group';const title=document.createElement('h3');title.textContent=heading;section.appendChild(title);rows.forEach(([name,display])=>{const layer=groups[name];const button=document.createElement('button');button.type='button';button.className='layerbtn';button.dataset.layerName=name;button.textContent=display;button.addEventListener('click',()=>{map.hasLayer(layer)?map.removeLayer(layer):layer.addTo(map);refreshLayerButtons();});section.appendChild(button);});body.appendChild(section);});details.appendChild(body);tb.appendChild(details);}
window.configureAtlasMap('snapshot');

let selectedMarker=null;
function selectMarker(marker){if(selectedMarker?.getElement())selectedMarker.getElement().classList.remove('selected-marker');selectedMarker=marker;if(marker?.getElement())marker.getElement().classList.add('selected-marker');}
window.pan=function(id){const m=allMarkers[id];if(m && map){Object.values(groups).forEach(layer=>{if(layer.hasLayer&&layer.hasLayer(m)&&!map.hasLayer(layer))layer.addTo(map);});map.setView(m.getLatLng(),Math.max(map.getZoom(),6));m.openPopup();selectMarker(m);refreshLayerButtons();return true;}return false;};
}catch(mapError){
  console.warn('Map initialization failed; evidence panels remain available.', mapError);
  const mapEl=document.getElementById('map');
  if(mapEl){
    mapEl.innerHTML='<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:28px;background:#0b1728;color:#dceaff;font:14px/1.5 system-ui;text-align:center"><div><b>Interactive basemap unavailable in this browser session.</b><br><span style="color:#9cb0ca">The evidence tabs, timeline, source links, BDA, loss ledger and claim checks still work. Verify that the complete local Leaflet runtime and map assets were included in this deployment.</span></div></div>';
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
 const rows=domains.map(d=>`<article class="domain-assessment"><div class="domain-assessment-head"><b>${esc(d.domain)}</b><span class="analysis-badge">${escLabel(d.current_advantage)}</span><span class="confidence-badge">${escLabel(d.confidence)} CONFIDENCE</span></div><p>${esc(d.assessment)}</p><small>${escLabel(d.trend)}</small></article>`).join('');
 document.getElementById('balance').innerHTML=`<div class="callout"><strong>Domain assessment only:</strong> ${esc(LEDGER['domain-assessments'].rule)}</div><div class="domain-assessment-grid">${rows}</div>`;
}
try{renderBalance();}catch(e){console.warn("renderBalance failed; using embedded static fallback",e);}

function renderCurrentPicture(){
 const target=document.getElementById('currentPictureBlocks');if(!target)return;
 const domains=LEDGER['domain-assessments'].domains||[];
 const byName=name=>domains.find(row=>row.domain===name)||{};
 const blocks=[
  ['OPERATIONAL REACH',byName('Air / long-range strike')],
  ['C2ISR / FUNCTIONAL CONTINUITY',byName('C2ISR / targeting')],
  ['MARITIME LEVERAGE',byName('Maritime control / sea denial')],
  ['ALLIANCE / DIPLOMATIC POSITION',byName('Alliance / diplomatic position')]
 ];
 target.innerHTML=`<div class="current-picture-label">CURRENT ASSESSMENT — reviewed through ${esc(LEDGER.manifest.collection_cutoff)} • no composite war score</div>`+blocks.map(([blockLabel,row])=>`<article class="current-picture-block"><b>${esc(blockLabel)}</b><div><span class="analysis-badge">${escLabel(row.current_advantage||'UNRESOLVED')}</span><span class="confidence-badge">${escLabel(row.confidence||'UNRESOLVED')} CONFIDENCE</span></div><p>${esc(row.assessment||'Assessment unresolved in the current ledger.')}</p><small>${escLabel(row.trend||'')}</small></article>`).join('');
}
try{renderCurrentPicture();}catch(e){console.warn('renderCurrentPicture failed',e);}

function renderFacilities(filter=''){
 const f=filter.toLowerCase();
 const legacy=DATA.facilities.filter(x=>!canonicalFacilityById.has(x.id)).map(x=>({kind:'legacy',record:x,id:x.id}));
 const canonical=(LEDGER.facilities.facilities||[]).map(x=>({kind:'canonical',record:x,id:x.facility_id}));
 const rows=legacy.concat(canonical).filter(row=>JSON.stringify(row.record).toLowerCase().includes(f));
 document.getElementById('facilityList').innerHTML=`<div class="callout"><strong>Identity rule:</strong> ${esc(LEDGER.facilities.preservation_rule)} Canonical additions and updates: ${canonical.length}; preserved repository facilities: ${legacy.length}.</div>`+rows.map(row=>{
   const x=row.record;
   if(row.kind==='canonical'){
     const mapRef=x.map_ref||'';
     const evidence=/NOT_INDEPENDENT|UNVERIFIED/.test(x.current_status)?'UNVERIFIED':/REPORTED/.test(x.current_status)?'REPORTED':/VERIFIED/.test(x.current_status)?'VERIFIED':'SUPPORTED';
     return `<article class="item facility-card" data-map-ref="${esc(mapRef||x.facility_id)}"><div class="date">${esc(x.country)} • ${esc(x.facility_id)} • ${escLabel(x.integration_action)}</div><h3>${esc(x.name)}</h3><div class="status-row">${evidenceBadge(evidence)}</div><div class="facility-block-grid"><section><b>COMPONENT PHYSICAL STATE</b>${componentList(x.verified_physical_damage,'No verified physical-damage statement in this record.')}</section><section><b>FUNCTIONAL EFFECT</b>${componentList(x.verified_functional_effect,'No verified functional-effect statement in this record.')}</section><section><b>CONTINUITY</b>${componentList(x.continued_operation_evidence,'No continuity evidence recorded.')}</section><section class="assessment-block"><b>ASSESSMENT</b><p>${esc(x.assessment||'Assessment unresolved.')}</p></section></div><button class="ledger-map-button" type="button" data-map-ref="${esc(mapRef||x.facility_id)}">Locate on map</button><div class="sources">${canonicalSourceLinks(x.source_ids)}</div></article>`;
   }
   const components=(x.critical_assets_reported||[]).concat(x.noncritical_or_soft_assets_reported||[]);
   return `<article class="item facility-card" data-map-ref="${esc(x.id)}">
   <div class="date">${esc(x.host||'')} • last reviewed ${esc(x.last_reviewed||'')}</div>
   <h3>${esc(x.name)}</h3>
   <div class="status-row">${evidenceBadge(x.verification_grade||x.damage_evidence_status)}<span class="analysis-badge">${escLabel(x.impact_grade||x.operational_effect_status)}</span></div>
   <p><b>Purpose:</b> ${esc(x.purpose||x.role||'')}</p>
   <div class="facility-block-grid"><section><b>COMPONENT PHYSICAL STATE</b>${componentList(components,'No verified component list in the current ledger.')}</section><section><b>FUNCTIONAL EFFECT</b>${componentList([x.effect||x.note||'Functional effect unresolved.'])}</section><section><b>CONTINUITY</b>${componentList([x.continuity||x.current_presence_status||'Continuity unresolved.'])}</section><section class="assessment-block"><b>ASSESSMENT</b><p>${escLabel(x.impact_grade||x.operational_effect_status||'UNRESOLVED')}</p></section></div>
   <button class="ledger-map-button" type="button" data-map-ref="${esc(x.id)}">Locate on map</button>
   <div class="sources">${srcLinks(namedUrlLinks(x.source_urls))}</div>
 </article>`;
 }).join('');
 Presentation.formatTextNodes(document.getElementById('facilityList'));
}
try{renderFacilities();}catch(e){console.warn("renderFacilities failed; using embedded static fallback",e);}
document.getElementById('facilitySearch').addEventListener('input',e=>renderFacilities(e.target.value));

function renderStrikeEffects(filter=''){
 const f=filter.toLowerCase();
 const rows=DATA.strikes.filter(x=>(x.name+' '+(x.event_date||x.date||'')+' '+(x.verification||x.status||'')+' '+(x.impact_grade||'')+' '+(x.purpose||'')+' '+(x.effect||x.note||'')).toLowerCase().includes(f));
 document.getElementById('strikeList').innerHTML=rows.map(x=>`<article class="item" data-map-ref="${esc(x.id)}">
  <div class="date">${esc(x.event_date||x.date||'')} • ${escLabel(x.verification||x.status||'')}</div>
  <h3>${esc(x.name)}</h3>
  <div class="status-row">${evidenceBadge(x.verification||x.status)}<span class="analysis-badge">${escLabel(x.impact_grade||'')}</span></div>
  ${x.tally?`<p><b>Loss / effect tally:</b> ${esc(x.tally)}</p>`:''}
  <p><b>Purpose of the target set:</b> ${esc(x.purpose||x.network_relevance||'')}</p>
  <p><b>Operational effect:</b> ${esc(x.effect||x.note||'')}</p>
  ${x.network_relevance?`<p><b>Network context:</b> ${esc(x.network_relevance)}</p>`:''}
  <div class="sources">${srcLinks(x.sources||namedUrlLinks(x.source_urls))}</div>
 </article>`).join('');
 Presentation.formatTextNodes(document.getElementById('strikeList'));
}
try{renderStrikeEffects();}catch(e){console.warn("renderStrikeEffects failed; using embedded static fallback",e);}
document.getElementById('strikeSearch').addEventListener('input',e=>renderStrikeEffects(e.target.value));

function ensureTimelineControls(){
 const search=document.getElementById('timelineSearch');
 if(!search||document.getElementById('timelineControls'))return;
 const controls=document.createElement('div');
 controls.id='timelineControls';
 controls.className='ledger-controls';
 controls.innerHTML=`<label>Temporal mode<select id="timelineMode"><option value="as-of">AS OF</option><option value="known-by">KNOWN BY</option></select></label><label>Cutoff<input id="timelineCutoff" type="date" min="2020-11-18" max="2026-08-20" value="2026-08-20"></label><label>Zoom<select id="timelineGranularity"><option value="war">War</option><option value="month">Month</option><option value="week">Week</option><option value="day">Day</option><option value="hour">Hour — source-supported only</option></select></label><label>Context<select id="timelineContext"><option value="all">All events</option><option value="loss">Loss events</option><option value="strike">Strike events</option><option value="facility">Facility / BDA events</option><option value="posture">Force-posture events</option></select></label><output id="timelineCount" aria-live="polite"></output>`;
 search.parentNode.insertBefore(controls,search);
 controls.querySelectorAll('select,input').forEach(el=>el.addEventListener('change',()=>renderTimeline(search.value)));
}
const timelineRecordById=new Map((LEDGER.timeline.records||[]).map(row=>[row.event_id,row]));
function ledgerTimeline(filter=''){
 const mode=document.getElementById('timelineMode')?.value||'as-of';
 const cutoff=document.getElementById('timelineCutoff')?.value||'2026-08-20';
 const context=document.getElementById('timelineContext')?.value||'all';
 const granularity=document.getElementById('timelineGranularity')?.value||'war';
 const needle=filter.toLowerCase().trim();
 let rows=(LEDGER.events.events||[]).filter(event=>{
   const visible=mode==='known-by'?Temporal.knownByState(event,cutoff,sourceById).visible:Temporal.asOfVisible(event,cutoff);
   if(!visible)return false;
   if(!Temporal.contextMatches(event,context))return false;
   return !needle||JSON.stringify(event).toLowerCase().includes(needle);
 });
 const selectedRecords=Temporal.filterByGranularity(rows.map(event=>timelineRecordById.get(event.event_id)).filter(Boolean),granularity,cutoff);
 const selectedIds=new Set(selectedRecords.map(row=>row.event_id));
 rows=rows.filter(event=>selectedIds.has(event.event_id));
 return rows.sort((a,b)=>{
   const aKey=mode==='known-by'?(a.first_reported||a.first_verified||a.event_date):a.event_date;
   const bKey=mode==='known-by'?(b.first_reported||b.first_verified||b.event_date):b.event_date;
   return aKey.localeCompare(bKey)||a.event_id.localeCompare(b.event_id);
 });
}
function eventMapRefs(event){return [...(event.map_refs||[]),...(event.facility_refs||[])].filter(ref=>allMarkers[ref]);}
function syncTimelineMap(events){
 if(!map)return;
 document.querySelectorAll('.atlas-marker-host').forEach(el=>el.classList.remove('timeline-member','timeline-hidden'));
 if(window.atlasActiveView!=='timeline')return;
 // Navigation establishes the analytical layer set once; timeline updates preserve expert overrides.
 if(document.getElementById('timelineContext')?.value==='posture')groups['Force posture']?.addTo(map);
 const markers=[...new Set(events.flatMap(event=>eventMapRefs(event)).map(ref=>allMarkers[ref]).filter(Boolean))];
 document.querySelectorAll('.atlas-marker-host').forEach(el=>el.classList.add('timeline-hidden'));
 markers.forEach(marker=>marker.getElement()?.classList.remove('timeline-hidden'));
 markers.forEach(marker=>marker.getElement()?.classList.add('timeline-member'));
 if(markers.length===1){selectMarker(markers[0]);map.setView(markers[0].getLatLng(),Math.max(map.getZoom(),6));if(events.length===1)markers[0].openPopup();}
 if(markers.length>1){const bounds=L.latLngBounds(markers.map(marker=>marker.getLatLng()));if(bounds.isValid())map.fitBounds(bounds,{padding:[48,48],maxZoom:7});}
}
window.refreshAtlasTimelineMap=function(){syncTimelineMap(ledgerTimeline(document.getElementById('timelineSearch')?.value||''));};
function railBucket(event,granularity){const row=timelineRecordById.get(event.event_id)||{};if(granularity==='war')return row.month||event.event_date.slice(0,7);if(granularity==='month')return row.iso_week||row.day;if(granularity==='week')return row.day;if(granularity==='hour')return row.hour_bucket||'TIME UNRESOLVED';return event.event_id;}
function renderTimelineRail(items){
 const granularity=document.getElementById('timelineGranularity')?.value||'war';
 const buckets=new Map();items.forEach(event=>{const key=railBucket(event,granularity);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(event);});
 const rail=document.getElementById('timelineRail');if(!rail)return;
 rail.innerHTML=[...buckets.entries()].map(([key,events])=>`<button type="button" class="timeline-tick${events.length>1?' cluster':''}" data-event-ids="${esc(events.map(event=>event.event_id).join(','))}" aria-label="${esc(key)}: ${events.length} event${events.length===1?'':'s'}"><span>${esc(key)}</span><b>${events.length}</b></button>`).join('')||'<div class="timeline-empty">No records in this source-supported window.</div>';
 rail.querySelectorAll('.timeline-tick').forEach(button=>button.addEventListener('click',()=>{
   rail.querySelectorAll('.timeline-tick').forEach(tick=>tick.classList.remove('selected'));button.classList.add('selected');
   const ids=button.dataset.eventIds.split(',');const selected=ids.map(id=>eventById.get(id)).filter(Boolean);
   document.querySelectorAll('.ledger-event').forEach(card=>card.classList.toggle('temporal-dimmed',!ids.includes(card.dataset.eventId)));
   syncTimelineMap(selected);if(ids.length===1)document.getElementById(`ledger-event-${ids[0]}`)?.scrollIntoView({behavior:'smooth',block:'nearest'});
 }));
}
function renderTimeline(filter=''){
 ensureTimelineControls();
 const items=ledgerTimeline(filter);
 const mode=document.getElementById('timelineMode')?.value||'as-of';
 const cutoff=document.getElementById('timelineCutoff')?.value||'2026-08-20';
 const granularity=document.getElementById('timelineGranularity')?.value||'war';
 const hour=document.querySelector('#timelineGranularity option[value="hour"]');
 const allTimeline=LEDGER.timeline.records||[];const hourSupported=Temporal.supportsHour(allTimeline);
 if(hour){hour.disabled=!hourSupported;if(!hourSupported&&granularity==='hour'){document.getElementById('timelineGranularity').value='day';return renderTimeline(filter);}}
 const count=document.getElementById('timelineCount');
 if(count)count.value=`${items.length} shown`;
 let h=`<div class="ledger-view-note">${mode==='known-by'?'Evidence known by':'Events as of'} <b>${esc(cutoff)}</b> • ${esc(granularity.toUpperCase())} window</div><div class="timeline-rail" id="timelineRail" aria-label="Spatial-temporal event rail"></div><details class="temporal-integrity"><summary>Temporal integrity rules</summary><p><b>AS OF</b> follows occurrence and labels current adjudication through the ledger cutoff. <b>KNOWN BY</b> shows only records and dated sources available by the chosen cutoff; later adjudication stays suppressed unless explicitly opened. Date-only records never receive a fabricated time.${!hourSupported?' Hour zoom is disabled because no canonical event has a source-supported hour bucket.':''}</p></details>`;
 h+=items.map(event=>{
   const when=event.event_time?`${event.event_date} ${event.event_time}${event.timezone?' '+event.timezone:''}`:event.event_date;
   const mapRef=(event.map_refs||[]).find(ref=>allMarkers[ref])||(event.facility_refs||[]).find(ref=>allMarkers[ref]);
   const mapButton=mapRef?`<button class="ledger-map-button" type="button" data-map-ref="${esc(mapRef)}">Show linked map entity</button>`:'';
   if(mode==='known-by'){
     const state=Temporal.knownByState(event,cutoff,sourceById);
     const current=`<details class="current-adjudication"><summary>View current adjudication</summary><div class="current-label">CURRENT ASSESSMENT — reviewed through ${esc(LEDGER.manifest.collection_cutoff)}</div><h4>${esc(event.summary)}</h4>${event.observed_fact?`<p><b>Observed fact:</b> ${esc(event.observed_fact)}</p>`:''}${event.claimed_effect?`<p><b>Claimed effect:</b> ${esc(event.claimed_effect)}</p>`:''}${event.verified_effect?`<p><b>Verified effect:</b> ${esc(event.verified_effect)}</p>`:''}${event.counterevidence?`<p><b>Counterevidence:</b> ${esc(event.counterevidence)}</p>`:''}${event.continuity_evidence?`<p><b>Continuity:</b> ${esc(event.continuity_evidence)}</p>`:''}${event.later_outcome?`<p><b>Later outcome:</b> ${esc(event.later_outcome)}</p>`:''}</details>`;
     return `<article class="item ledger-event" id="ledger-event-${esc(event.event_id)}" data-event-id="${esc(event.event_id)}"><div class="date">KNOWN BY ${esc(cutoff)} • ${escLabel(event.record_class)} • ${esc(event.event_id)}</div><h3>Historical evidence state for ${esc(event.event_id)}</h3><div class="status-row"><span class="evidence-badge evidence-${state.verifiedByCutoff?'verified':'reported'}">${esc(state.badge)}</span><span class="analysis-badge">${escLabel(event.event_type)}</span></div><p><b>Actors / target metadata:</b> ${esc((event.actors||[]).join(', '))} → ${esc(event.target||'')}</p><p><b>State at cutoff:</b> First reported ${esc(event.first_reported)}${state.verifiedByCutoff?`; verification was available by ${esc(event.first_verified)}`:'; verification was not yet available in the dated public record'}.</p>${mapButton}<div class="sources">${canonicalSourceLinks(state.sources)}</div>${current}</article>`;
    }
    return `<article class="item ledger-event" id="ledger-event-${esc(event.event_id)}" data-event-id="${esc(event.event_id)}"><div class="date">${esc(when)} • ${escLabel(event.event_time_precision)} • ${escLabel(event.record_class)} • ${esc(event.event_id)}</div><h3>${esc(event.summary)}</h3><div class="current-label">CURRENT ASSESSMENT — reviewed through ${esc(LEDGER.manifest.collection_cutoff)}</div><div class="status-row">${evidenceBadge(event.evidence_status)}<span class="confidence-badge">${escLabel(event.confidence)} CONFIDENCE</span><span class="analysis-badge">${escLabel(event.event_type)}</span></div><p><b>Actors / target:</b> ${esc((event.actors||[]).join(', '))} → ${esc(event.target||'')}</p>${event.observed_fact?`<p><b>Observed fact:</b> ${esc(event.observed_fact)}</p>`:''}${event.claimed_effect?`<p><b>Claimed effect:</b> ${esc(event.claimed_effect)}</p>`:''}${event.verified_effect?`<p><b>Verified effect:</b> ${esc(event.verified_effect)}</p>`:''}${event.counterevidence?`<p><b>Counterevidence:</b> ${esc(event.counterevidence)}</p>`:''}${event.continuity_evidence?`<p><b>Continuity:</b> ${esc(event.continuity_evidence)}</p>`:''}${event.later_outcome?`<p><b>Later outcome:</b> ${esc(event.later_outcome)}</p>`:''}<div class="ledger-dates"><span>First reported: ${esc(event.first_reported||'UNRESOLVED')}</span><span>First verified: ${esc(event.first_verified||'UNRESOLVED')}</span><span>Valid from: ${esc(event.valid_from||event.event_date)}${event.valid_to?' to '+esc(event.valid_to):''}</span></div>${mapButton}<div class="sources">${canonicalSourceLinks(event.source_refs)}</div></article>`;
 }).join('');
 document.getElementById('timelineList').innerHTML=h;
 Presentation.formatTextNodes(document.getElementById('timelineList'));
 renderTimelineRail(items);syncTimelineMap(items);
}
window.panLedgerEvent=function(id){
 const event=eventById.get(id);if(!event)return false;
 const ref=(event.map_refs||[]).find(x=>allMarkers[x])||(event.facility_refs||[]).find(x=>allMarkers[x]);
 return ref?window.pan(ref):false;
};
window.focusLedgerEvent=function(id){
 if(typeof showAtlasPanel==='function')showAtlasPanel('timeline');
 const search=document.getElementById('timelineSearch');
 if(search){search.value=id;renderTimeline(id);}
 document.getElementById(`ledger-event-${id}`)?.scrollIntoView({behavior:'smooth',block:'start'});
};
try{renderTimeline();}catch(e){console.warn("renderTimeline failed; using embedded static fallback",e);}
document.getElementById('timelineSearch').addEventListener('input',e=>renderTimeline(e.target.value));

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
 const allMunitions=LEDGER['munitions-expenditure'].records||[];
 const tomahawkCount=allMunitions.find(x=>x.expenditure_id==='MUN-USA-TOMAHAWK-CEASEFIRE');
 const tomahawkBasis=allMunitions.find(x=>x.expenditure_id==='MUN-USA-TOMAHAWK-4WK');
 const tomahawkEstimate=Costing.calculate({...tomahawkCount,currency:tomahawkBasis?.currency},tomahawkBasis);
 const iranOpeningUas=allMunitions.find(x=>x.expenditure_id==='MUN-IRN-FIRST100H-UAS');
 const iranOpeningBm=allMunitions.find(x=>x.expenditure_id==='MUN-IRN-FIRST100H-BM');
 const categoryRows=(title,metric,predicate)=>{const rows=casualties.filter(predicate);return `<section class="casualty-category"><header><h3>${esc(title)}</h3><span>Like-for-like records only</span></header><div class="casualty-records">${rows.length?rows.map(x=>{const direct=x[metric];const estimated=metric==='killed'&&direct==null?x.estimated_killed:null;const value=direct!=null?direct:estimated!=null?estimated:'UNRESOLVED';const qualifier=estimated!=null?'ESTIMATED':direct!=null?'SOURCE-REPORTED':'UNRESOLVED';return `<article><div><b>${esc(x.country)}</b><span>${esc(x.event_date)} • ${esc(x.casualty_id)}</span></div><strong>${esc(value)}</strong><span class="cost-label">${qualifier}</span>${evidenceBadge(x.evidence_status)}<small>${escLabel(x.aggregation_type)}${x.notes?' • '+esc(x.notes):''}</small><div class="sources">${canonicalSourceLinks(x.source_ids)}</div></article>`;}).join(''):`<article class="casualty-unresolved"><strong>UNRESOLVED</strong><span class="cost-label">NO CANONICAL ITEMIZED RECORD</span><small>Unknown is not zero.</small></article>`}</div></section>`;};
 let h=`<div class="callout"><strong>Like-for-like accounting:</strong> ${esc(LEDGER.casualties.display_policy.rule)} Material loss, munitions expenditure, repair/reconstitution, and wider economic effects remain separate. UNPRICED and UNRESOLVED do not mean zero.</div><button class="timeline-context-button" type="button" data-timeline-context="loss">Open loss events on the canonical timeline</button>`;
 h+=`<div class="accounting-matrix" role="table" aria-label="Symmetric direct-military accounting"><div class="matrix-corner" aria-hidden="true">DIRECT MILITARY ACCOUNTING</div><div class="matrix-column us" role="columnheader">U.S. / COALITION</div><div class="matrix-column iran" role="columnheader">IRAN / ALIGNED</div><div class="matrix-row-label" role="rowheader">Material lost / damaged</div><article class="cost-cell us" role="cell" data-side="U.S. / COALITION"><strong>$5.8–$12.9B</strong><span class="cost-label">CALCULATED RANGE</span><small>$1.8–$3.5B durable equipment + $4.0–$9.4B fixed infrastructure. Earlier CSIS category estimates; overlapping item rows are not added again.</small><div class="sources">${canonicalSourceLinks(['SRC-C4FF4F823E1F'])}</div></article><article class="cost-cell iran" role="cell" data-side="IRAN / ALIGNED"><strong>UNPRICED REMAINDER</strong><span class="cost-label">SUPPORTED QUANTITY • NO COMPATIBLE PRICE BASIS</span><small>One confirmed frigate loss is retained, but the existing corpus supplies no compatible procurement, replacement, or repair basis. Unknown is not zero.</small><div class="sources">${canonicalSourceLinks(['SRC-B106A3769146','SRC-C092F7F591FC'])}</div></article><div class="matrix-row-label" role="rowheader">Munitions expended</div><article class="cost-cell us" role="cell" data-side="U.S. / COALITION"><strong>$26.1B</strong><span class="cost-label">SOURCE-REPORTED</span><small>CSIS aggregate through June 23. Compatible cross-record check: ${tomahawkEstimate?`${esc(tomahawkCount.quantity_qualifier)}${esc(tomahawkCount.quantity)} Tomahawks × ${Costing.formatUsd(tomahawkBasis.unit_cost_low)} = ${esc(tomahawkEstimate.qualifier)}${Costing.formatUsd(tomahawkEstimate.low)} CALCULATED LOWER BOUND`: 'UNRESOLVED'}. This is an auditable subset, not an additive second total.</small><div class="sources">${canonicalSourceLinks(['SRC-C4FF4F823E1F','SRC-14B6DC8A760C'])}</div></article><article class="cost-cell iran" role="cell" data-side="IRAN / ALIGNED"><strong>${esc(iranOpeningUas.quantity_qualifier)}${esc(iranOpeningUas.quantity)} UAS<br>${esc(iranOpeningBm.quantity_qualifier)}${esc(iranOpeningBm.quantity)} ballistic missiles</strong><span class="cost-label">SOURCE-REPORTED LOWER BOUND</span><span class="cost-label secondary">UNPRICED REMAINDER</span><small>Opening 100 hours. The corpus contains no compatible unit-cost basis, so the supported quantities are shown without fabricating a dollar estimate.</small><div class="sources">${canonicalSourceLinks(['SRC-F9C4A35EE811'])}</div></article></div><div class="callout"><strong>Complete Aug. 20 total: UNRESOLVED.</strong> ${esc(us.current_aug20_total.display)} Calculated components are labeled and never combined across overlapping scopes.</div>`;
 h+=`<div class="section-title">Casualties — category boundaries are the comparison rule</div><div class="casualty-doctrine"><span>${physicalBadge('Unknown / unresolved')}</span><p>Military KIA, WIA, MIA, leadership, civilian, and contractor/other records are never collapsed into a single score. Cumulative snapshots remain non-additive.</p></div>`;
 const militaryCategory=x=>/MILITARY|ARMED_GROUP/.test(x.display_category||'')&&!/MIXED|CIVILIAN/.test(x.display_category||'');
 h+=categoryRows('Military KIA','killed',x=>militaryCategory(x)&&((x.killed||0)>0||(x.estimated_killed||0)>0));
 h+=categoryRows('Military WIA','wounded',x=>militaryCategory(x)&&(x.wounded||0)>0);
 h+=categoryRows('Military MIA','missing',x=>militaryCategory(x)&&(x.missing||0)>0);
 h+=categoryRows('Senior military leadership','killed',x=>/SENIOR_MILITARY/.test(x.display_category||''));
 h+=categoryRows('Senior political / state leadership','killed',x=>/SENIOR_POLITICAL|STATE_LEADERSHIP/.test(x.display_category||''));
 h+=categoryRows('Civilian deaths','killed',x=>/^CIVILIAN_DEATHS/.test(x.display_category||'')&&(x.killed||0)>0);
 h+=categoryRows('Civilian wounded','wounded',x=>/^CIVILIAN_DEATHS_WIA/.test(x.display_category||'')&&(x.wounded||0)>0);
 h+=categoryRows('Contractors / other','killed',x=>/OTHER|CONTRACTOR/.test(x.display_category||'')&&(x.killed!=null||x.estimated_killed!=null));
 const mixed=casualties.filter(x=>/MIXED/.test(x.display_category||''));
 h+=`<section class="casualty-category noncomparable"><header><h3>Mixed category — not comparable</h3><span>Kept outside like-for-like charts</span></header><div class="casualty-records">${mixed.map(x=>`<article><div><b>${esc(x.country)}</b><span>${esc(x.event_date)} • ${esc(x.casualty_id)}</span></div><strong>${esc(x.estimated_killed??'UNRESOLVED')}</strong><span class="cost-label">ESTIMATED MIXED TOTAL</span>${evidenceBadge(x.evidence_status)}<small>${escLabel(x.display_category)} • ${escLabel(x.aggregation_type)}</small><div class="sources">${canonicalSourceLinks(x.source_ids)}</div></article>`).join('')}</div></section><details class="legacy-audit-note"><summary>Legacy leadership audit note</summary><p>The archived value of 11 leaders is not a plotted canonical loss event. It remains quarantined until the names, roles, dates, categories, and sources are itemized in the canonical schema.</p></details>`;
 h+=`<div class="section-title">Durable material losses</div><div class="loss-record-grid">`;
 h+=material.map(x=>`<article class="item"><div class="date">${esc(x.event_date)} • ${esc(x.loss_id)}</div><h3>${esc(x.owner)} — ${esc(x.item)}</h3><div class="status-row">${evidenceBadge(x.confidence)}${physicalBadge(`${x.status||''} ${x.disposition||''}`)}</div><p><b>Disposition:</b> ${esc(x.quantity)} × ${escLabel(x.status)} / ${escLabel(x.disposition)}</p><p><b>Accounting:</b> ${escLabel(x.accounting_category)} • cost ${escLabel(x.cost_status)}</p>${x.note?`<p><b>Qualification:</b> ${esc(x.note)}</p>`:''}<div class="sources">${canonicalSourceLinks(x.source_ids)}</div></article>`).join('');
 h+=`</div><div class="section-title">Munitions expenditure — launch remains expenditure</div><div class="loss-record-grid">`;
 h+=munitions.map(x=>`<article class="item"><div class="date">${esc(x.period_start)} to ${esc(x.period_end)} • ${esc(x.expenditure_id)}</div><h3>${esc(x.actor)} — ${esc(x.munition)}</h3><div class="status-row">${evidenceBadge(x.evidence_type)}<span class="cost-label">${x.quantity_qualifier?'LOWER BOUND':'SOURCE-REPORTED'}</span></div><p><b>Expended:</b> ${esc(x.quantity_qualifier||'')}${esc(x.quantity??'UNRESOLVED')} • ${escLabel(x.evidence_type)}</p><p><b>Status / cost:</b> ${escLabel(x.status)} • ${escLabel(x.cost_status)}</p>${x.note?`<p><b>Qualification:</b> ${esc(x.note)}</p>`:''}<div class="sources">${canonicalSourceLinks(x.source_ids)}</div></article>`).join('');
 h+=`</div>`;
 document.getElementById('lossList').innerHTML=h;
 Presentation.formatTextNodes(document.getElementById('lossList'));
}
try{renderLosses();}catch(e){console.warn("renderLosses failed; using embedded static fallback",e);}
document.getElementById('lossSearch').addEventListener('input',e=>renderLosses(e.target.value));
document.getElementById('lossList').addEventListener('click',event=>{const button=event.target.closest('[data-timeline-context]');if(!button)return;if(typeof showAtlasPanel==='function')showAtlasPanel('timeline');const select=document.getElementById('timelineContext');if(select){select.value=button.dataset.timelineContext;renderTimeline(document.getElementById('timelineSearch')?.value||'');}});

function cls(v){return String(v||'').replace(/[^A-Z0-9]+/g,'_')}
function renderClaims(filter=''){
 let f=filter.toLowerCase();
 const rows=(LEDGER.claims.claims||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(f));
 document.getElementById('claimList').innerHTML=`<div class="callout"><strong>Case-file rule:</strong> Claims are adjudicated through chronology, supporting evidence, counterevidence, continuity, and explicit change conditions—not a binary narrative score.</div>`+rows.map(x=>{const mapRef=(x.map_refs||[]).find(ref=>allMarkers[ref])||(x.facility_refs||[]).find(ref=>allMarkers[ref]);return `<article class="item claim-timeline"${mapRef?` data-map-ref="${esc(mapRef)}"`:''}><div class="date">${esc(x.earliest_known_origin||'ORIGIN UNRESOLVED')} • ${esc(x.case_id)}</div><h3>${evidenceBadge(x.current_verdict)}${esc(x.claim)}</h3><p><b>What happened:</b> ${esc(x.what_actually_happened)}</p>${(x.evidence_supporting_claim||[]).length?`<p><b>Supporting evidence:</b> ${esc(x.evidence_supporting_claim.join(', '))}</p>`:''}${(x.counterevidence||[]).length?`<p><b>Counterevidence:</b> ${esc(x.counterevidence.join(', '))}</p>`:''}${(x.unresolved_questions||[]).length?`<p><b>Unresolved:</b> ${esc(x.unresolved_questions.join(' '))}</p>`:''}<p><b>What would change the assessment:</b> ${esc((x.what_would_change_assessment||[]).join(' '))}</p><div class="sources">${canonicalSourceLinks(x.source_ids)}</div></article>`}).join('');Presentation.formatTextNodes(document.getElementById('claimList'));
}
try{renderClaims();}catch(e){console.warn("renderClaims failed; using embedded static fallback",e);}
document.getElementById('claimSearch').addEventListener('input',e=>renderClaims(e.target.value));

function renderSources(){
 const sources=LEDGER.sources.sources||[];
 let out=`<div class="callout"><strong>Canonical source namespace:</strong> ${esc(LEDGER.sources.id_rule)} This ledger contains ${sources.length} source records with explicit proof roles and record lineage.</div>`;
 const grouped=Object.groupBy?Object.groupBy(sources,x=>x.quality||'UNRATED'):sources.reduce((acc,x)=>{(acc[x.quality||'UNRATED']??=[]).push(x);return acc},{});
 for(const [quality,rows] of Object.entries(grouped).sort()){out+=`<div class="section-title">Quality ${escLabel(quality)}</div>`+rows.map(x=>`<article class="item source-record"><div class="date">${esc(x.source_id)} • ${esc(x.publication_date||'DATE UNRESOLVED')}</div><h3>${esc(x.outlet)} — ${esc(x.title||'Untitled source')}</h3><p><b>Roles:</b> ${esc((x.source_roles||[]).map(label).join(' · '))}</p><p><b>Proof note:</b> ${esc(x.proof_note||'')}</p><p><b>Lineage:</b> ${escLabel(x.lineage||x.source_origin||'')}</p><div class="sources">${Safe.externalLink('open source',x.url,x.title||'')}</div></article>`).join('')}
 document.getElementById('sourceList').innerHTML=out;Presentation.formatTextNodes(document.getElementById('sourceList'));
}
try{renderSources();}catch(e){console.warn("renderSources failed; using embedded static fallback",e);}

function renderHistoricalModel(){
 const summary=document.getElementById('historicalSummary');
 if(!summary)return;
 const counts=LEDGER.manifest.counts||{};
 const coverage=LEDGER['daily-coverage'].coverage||[];
 const quietMarkers=coverage.filter(x=>x.collection_status==='NO_STANDALONE_VERIFIED_EVENT_IN_CURRENT_SOURCE_SET').length;
 summary.innerHTML=`<div class="ledger-summary-grid"><div><b>${esc(counts.events)}</b><span>historical events</span></div><div><b>${esc(counts.prewar_events)}</b><span>pre-war context</span></div><div><b>${esc(counts.wartime_events)}</b><span>wartime events</span></div><div><b>${esc(coverage.length)}</b><span>daily coverage markers</span></div><div><b>${esc(counts.sources)}</b><span>canonical sources</span></div><div><b>${esc(counts.revision_records)}</b><span>documented revisions</span></div></div><div class="callout"><strong>Coverage rule:</strong> ${quietMarkers} daily markers record that no standalone verified event was found in the current source set. They are collection-state markers—not evidence that nothing happened.</div>`;
 document.getElementById('movementList').innerHTML=(LEDGER.movements.movements||[]).map(x=>`<article class="item"><div class="date">${esc(x.date)} • ${esc(x.movement_id)}</div><h3>${esc(x.unit_or_asset)}</h3><div class="status-row"><span class="analysis-badge">${escLabel(x.display_label)}</span><span class="confidence-badge">${escLabel(x.force_posture_classification)}</span></div><p><b>Movement:</b> ${esc(x.from)} → ${esc(x.to)}</p><p><b>Decision / execution:</b> ${esc(x.decision_date||'UNRESOLVED')} / ${esc(x.actual_execution_date||x.execution_date||'UNRESOLVED')}</p><p><b>War-change assessment:</b> ${esc(x.war_change_assessment||x.assessment_notes)}</p><p><b>Causation:</b> ${esc((x.causation_language||[]).join(' '))}</p><div class="sources">${canonicalSourceLinks(x.source_refs)}</div></article>`).join('');
 document.getElementById('agreementList').innerHTML=(LEDGER.agreements.records||[]).map(x=>{
   const relationship=x.replaces_us_linked_arrangement?'REPLACES U.S.-LINKED ARRANGEMENT':x.supplements_us_linked_arrangement?'SUPPLEMENTS U.S.-LINKED ARRANGEMENT':x.coexists_with_us_linked_arrangement?'COEXISTS WITH U.S.-LINKED ARRANGEMENT':'NO DEMONSTRATED EFFECT ON U.S.-LINKED ARRANGEMENT';
   return `<article class="item"><div class="date">${esc(x.origin_date||'ORIGIN UNRESOLVED')} • ${esc(x.agreement_id)}</div><h3>${esc(x.name)}</h3><div class="status-row">${evidenceBadge(x.status)}<span class="analysis-badge">${esc(relationship)}</span></div><p><b>Parties:</b> ${esc((x.parties||[]).join(' · '))}</p><p><b>U.S. role:</b> ${escLabel(x.us_role)}${(x.us_role_categories||[]).length?' — '+esc(x.us_role_categories.map(label).join(' · ')):''}</p><p><b>Assessment:</b> ${esc(x.current_assessment)}</p><p><b>What it does not prove:</b> ${esc(x.what_it_does_not_prove)}</p><div class="sources">${canonicalSourceLinks(x.source_ids)}</div></article>`;
 }).join('');
 const gaps=LEDGER.unresolved.items||[];
 document.getElementById('gapList').innerHTML=`<div class="callout"><strong>Open collection remains visible:</strong> ${gaps.length} unresolved items are retained as explicit gaps; no unknown is converted to zero or fact.</div>`+gaps.map(x=>`<article class="item"><div class="date">${escLabel(x.priority)} PRIORITY • ${esc(x.unresolved_id)} • ${escLabel(x.status)}</div><h3>${esc(x.topic)}</h3><p><b>Question:</b> ${esc(x.question)}</p><p><b>Why it matters:</b> ${esc(x.why_it_matters)}</p><p><b>Next collection:</b> ${esc((x.next_collection||[]).join(' · '))}</p></article>`).join('');
 const revisions=LEDGER['revision-history'].revisions||[];
 document.getElementById('revisionList').innerHTML=revisions.map(x=>`<article class="item"><div class="date">${esc(x.date)} • ${esc(x.revision_id)} • ${escLabel(x.action)}</div><h3>${esc(x.record)}</h3><p>${esc(x.change)}</p>${x.reason?`<p><b>Reason:</b> ${esc(x.reason)}</p>`:''}</article>`).join('');
 Presentation.formatTextNodes(summary.parentElement||document.body);
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

Presentation.formatTextNodes(document.body);

})();
