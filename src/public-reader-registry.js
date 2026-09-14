/* ATLAS AUTHORITATIVE PUBLIC READER REGISTRY
 *
 * Sole visible page authority. Base rendering and reader projection run inside
 * a connected off-screen staging host. Public Product finalization runs on that
 * staged reader output before it is validated and promoted.
 */
(function initAtlasPublicReaderRegistry(globalObject, factory) {
  'use strict';
  const api = factory(globalObject);
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  if (api) globalObject.AtlasPublicIA = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function atlasReaderRegistryFactory(root) {
  'use strict';

  const projection = root.AtlasPublicIA || (typeof require === 'function' ? require('./public-reader-layer.js') : null);
  if (!projection || typeof projection.mount !== 'function') return null;

  const VERSION = 'atlas-reader-registry-v1.1';
  const PRODUCT_VERSION = 'sep14-reader-convergence-v1';
  const INTERNAL_TEXT = /(?<![\w./-])ROOK(?![\w./-])|\bPR\/CI\b|claim[_ -]?instance[_ -]?id|proposition[_ -]?id|chain[_ -]?id|publication[_ -]?blocker|knowledge[_ -]?basis[_ -]?support[_ -]?failure/i;

  class ReaderRegistryError extends Error {
    constructor(code, message, cause) { super(message); this.name = 'ReaderRegistryError'; this.code = code; if (cause) this.cause = cause; }
  }
  const invariant = (condition, code, message) => { if (!condition) throw new ReaderRegistryError(code, message); };
  const txt = value => value == null ? '' : String(value).trim();

  function node(doc, tag, className, value) {
    const el = doc.createElement(tag);
    if (className) el.className = className;
    if (value != null) el.textContent = String(value);
    return el;
  }
  function add(host, tag, className, value) { const el = node(host.ownerDocument || host, tag, className, value); host.append(el); return el; }
  function intro(article, value) {
    const p = article.querySelector('.page-intro p:not(.eyebrow)');
    if (p) p.textContent = value;
  }
  function section(article, title, lead) {
    const s = node(article.ownerDocument, 'section', 'content-section lead-story reader-current-condition');
    s.dataset.publicProduct = PRODUCT_VERSION; add(s, 'h2', '', title); if (lead) add(s, 'p', 'lead-copy', lead);
    const i = article.querySelector('.page-intro'); if (i) i.after(s); else article.prepend(s); return s;
  }
  function card(host, title, body, kicker) {
    const c = add(host, 'article', 'orientation-card'); if (kicker) add(c, 'p', 'card-kicker', kicker);
    add(c, 'h3', '', title); add(c, 'p', '', body); return c;
  }
  function routeLink(host, key, label) { const a = add(host, 'a', 'inline-route-link', label); a.href = projection.routeHref(key); return a; }
  function findSection(article, pattern) {
    return [...article.querySelectorAll(':scope > section, :scope > details')].find(x => pattern.test(x.querySelector(':scope > h2, :scope > summary')?.textContent || '')) || null;
  }
  function collapse(el, label) {
    if (!el || el.tagName === 'DETAILS') return el;
    const d = node(el.ownerDocument, 'details', 'secondary-context reader-method-detail'); add(d, 'summary', '', label);
    [...el.children].forEach(child => { if (!/^H[1-6]$/.test(child.tagName)) d.append(child); }); el.replaceWith(d); return d;
  }
  function accessContext(routeRuntime, route, doc) { const a = routeRuntime.forRoute(route); return { documentObject: doc, model: a.model, services: a.services, route }; }
  function modelData(model, key) { return projection.modelData ? projection.modelData(model, key) : null; }
  function records(model, key) {
    const v = modelData(model, key);
    if (projection.recordArray) return projection.recordArray(v);
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') for (const k of ['records','items','facilities','shipping','economics','diplomacy','gaps','claims']) if (Array.isArray(v[k])) return v[k];
    return [];
  }
  function evidence(host, context, record, label='Evidence') {
    if (!record || !projection.EvidenceDrawer?.create) return;
    const ids = [...new Set([...(record.source_ids || []), ...((record.sources || []).filter(x => typeof x === 'string'))])];
    if (!ids.length) return;
    const d = projection.EvidenceDrawer.create(context, { source_ids: ids }); const s = d.querySelector('summary'); if (s) s.textContent = label; host.append(d);
  }
  function eventById(model, id) { return (model.chronology || []).find(x => x.event_id === id || x.event?.event_id === id); }

  const FACILITY = Object.freeze({
    'US-ALUDEID':['damaged_not_operating','Combined Air Operations Center','The CAOC was reported inoperable and campaign command shifted to Shaw. Whole-base incapacity is not established.'],
    'FAC-UAE-BARAKAH':['unknown','Plant/system','A generator was hit and one reactor shut down automatically. Current restart status and whole-plant operating effect remain unresolved.'],
    'FAC-KWT-KUWAIT-INTERNATIONAL-AIRPORT':['damaged_operating','Airport','Terminal damage and disruption were established while Terminal 4 flight activity continued.'],
    'FAC-IRN-KHONDAB-HEAVY-WATER':['damaged_not_operating','Facility','The IAEA reported severe damage and that the facility was no longer operational; repair or restart remains unresolved.'],
    'FAC-QAT-LNG-SYSTEM':['damaged_operating','Qatar LNG system','The wider LNG system continued operating while two of 14 LNG trains and a GTL facility remained unavailable.'],
    'US-NSA-BHR':['administrative','Fifth Fleet headquarters function','The headquarters function relocated to MacDill after extensive damage; this does not establish cessation of every local NSA Bahrain function.'],
    'US-ARIFJAN':['unknown','Facility','Damage was verified and U.S. troops were later reported present. Presence does not establish operating status.'],
    'US-ALISALEM':['unknown','Facility','Substantial localized damage was verified; current whole-base operating status is not affirmatively established.'],
    'US-BUEHRING':['unknown','Facility','Power-plant and other damage was verified; current whole-site operating status is not affirmatively established.'],
    'US-SHUAIBA-TOC':['destroyed','U.S. tactical operations center / outpost','The specific TOC was destroyed. This does not establish destruction of Camp Arifjan or the wider regional network.'],
    'US-CAMPDOHA':['unknown','Position','A U.S. troop position was reported, while the Iranian damage claim was not independently corroborated; operating effect remains unknown.'],
    'US-BUBIYAN':['unknown','Position','A relocated U.S. position was reported. Permanence and operating effect are not established.'],
    'US-ALDHAFRA':['unknown','Facility','Damage and continued U.S. presence are established. Presence and the absence of a shutdown report do not prove full operation.'],
    'US-JEBELALI':['unknown','Access site','Port-area damage and fire were established. No whole-access-site shutdown or isolated destroyed U.S. naval asset is established.'],
    'US-ERBIL':['administrative','Drawdown state','Damage was reported while the broader U.S. Iraq drawdown was underway; this is not a stable permanent-base operating state.'],
    'US-AINASAD':['administrative','Drawdown state','U.S. forces fully withdrew by Jan. 17, 2026; it was not an active U.S. base for the war baseline.'],
    'US-PRINCESULTAN':['unknown','Facility','Aircraft/base damage and later U.S. presence were reported. Current whole-base operating status is not affirmatively established.'],
    'US-MUWAFFAQ':['unknown','Facility','Earlier THAAD damage and Sep. 8 aircraft damage are established. Exact BDA and whole-base operating effect remain unresolved.'],
    'US-INCIRLIK':['operating','Facility','Affirmative U.S. wing activity is documented and no reviewed damage report was found.'],
    'US-ISA':['unknown','Facility','Patriot/base damage was established; current whole-site operating status is not affirmatively established.'],
    'US-RMELAN':['administrative','Drawdown state','Later current presence was not refreshed after drawdown reporting; stale presence is not current operation.'],
    'US-QASRAK':['administrative','Drawdown state','Withdrawal began during the February drawdown; a current operating U.S. presence is not established.'],
    'US-TANF':['administrative','Drawdown state','U.S. withdrawal was completed Feb. 12, 2026; no later re-entry evidence establishes an active garrison.']
  });
  const FSTAT = {
    destroyed:['Destroyed','destroyed'], damaged_not_operating:['Damaged — not operating','damaged-inoperable'],
    damaged_operating:['Damaged — operating','damaged-operational'], operating:['Operating','operational'],
    unknown:['Effect / operating status unknown','unknown'], administrative:['Withdrawn / closed / transferred','administrative']
  };

  const OBJECTIVES = [
    ['United States','Deny Iran a nuclear weapon','UNRESOLVED','No Iranian nuclear weapon is established, but no durable controlling nuclear settlement exists and the safeguards dispute has escalated.'],
    ['United States','Break offensive military power projection','PARTLY ACHIEVED','Substantial attrition and degradation are established, but Iran still uses missiles, drones and maritime coercive capability.'],
    ['United States','Reduce Iran’s ability to arm and sustain proxies','PARTLY ACHIEVED','Some proxy/network degradation is established, while the Houthi force remains operationally capable and made major Sep. 10–11 territorial gains.'],
    ['United States','Restore usable navigation through Hormuz','NOT ACHIEVED','Physical transit continues, but observable traffic remains severely depressed and no normalized navigation regime controls.'],
    ['United States','Use economic isolation to narrow Tehran’s options','PARTLY ACHIEVED','Severe trade, export and financial pressure is established; Iran remains able to trade and conduct coercive action.'],
    ['Iran','War damages / reparations paid','NOT ACHIEVED','Payment is not established.'],
    ['Iran','Frozen / blocked Iranian assets returned','NOT ACHIEVED','Return of the demanded assets is not established.'],
    ['Iran','U.S. naval blockade terminated','NOT ACHIEVED','Termination of the demanded blockade is not established.'],
    ['Iran','Full / verifiable sanctions relief','NOT ACHIEVED','Full or verifiable sanctions relief is not established.'],
    ['Iran','U.S. withdrawal from bases surrounding Iran','NOT ACHIEVED','Some pre-existing drawdowns occurred, but the broad demanded regional withdrawal is not established.'],
    ['Iran','Protection / non-aggression toward Axis allies','NOT ACHIEVED','No durable protection or non-aggression guarantee exists.'],
    ['Iran','Permanent Iranian Hormuz sovereignty / management / fees','NOT ACHIEVED','Iran retains coercive leverage, but recognized exclusive sovereignty, management and compulsory fee rights are not established.'],
    ['Iran','No concessions on nuclear, missiles, defense or regional architecture','PARTLY ACHIEVED','Important capabilities and red lines remain, but mediated/shared maritime arrangements are inconsistent with the earlier categorical posture.']
  ];

  function overview(article) {
    intro(article, 'The war remains militarily active, economically costly and diplomatically unsettled. U.S. and coalition forces retain the strike advantage; Iran still has disruptive missile, drone and maritime capability, but it has not secured exclusive control of Hormuz.');
    const s=section(article,'What changed in the latest accepted evidence','The latest evidence changes several current-status judgments without creating duplicate attack or capture events.'), g=add(s,'div','orientation-grid');
    card(g,'Hormuz talks','Oman confirmed the planned Gulf-Iran meeting existed and then postponed it. No signed reopening arrangement or agreed sovereignty, route or fee terms are established.','SEP. 13–14');
    card(g,'Saudi East-West pipeline','The Sep. 11 attack remains the occurrence. Later reporting says the pipeline is expected to remain mostly out of service for roughly three to five weeks.','CURRENT STATUS');
    card(g,'Yemen / Bab el-Mandeb','Greater and Lesser Hanish are confirmed under Houthi control, but general Bab el-Mandeb traffic continued near its recent observable average.','CURRENT STATUS');
    card(g,'Hormuz traffic','Observable commodity-vessel traffic remained severely depressed. That is not the same as physical closure of the Strait.','CURRENT STATUS');
    card(g,'Yemen displacement','IOM reporting put displacement since Sep. 1 at 82,164 people, with more than 2,000 reportedly fleeing to Djibouti.','UPDATED');
    card(g,'Unresolved attribution','The Sep. 13 Iranian commercial-vessel strike and Sep. 14 Sulaimani missile strikes are established; the attacker remains unresolved in both cases.','UNCERTAINTY');
  }

  function actors(article) {
    intro(article,'Start with the actors, not the data model: states and armed forces, non-state armed groups, leaders, mediators and international organizations appear here according to the role they actually play in the record.');
    const n=article.querySelector('.scope-note'); if(n) collapse(n,'How actor identity is assigned');
  }

  function timeline(article) {
    intro(article,'The conflict is easiest to follow in phases. Use this orientation first, then narrow the interactive timeline by date, actor or topic.');
    const s=section(article,'Conflict phases','The phase guide is orientation, not a replacement for the exhaustive chronology.'), g=add(s,'div','orientation-grid');
    card(g,'Opening strikes and regional expansion','Direct attacks quickly spread across bases, air-defense sites, maritime routes and aligned armed groups.','FEB–MAR');
    card(g,'Sustained strike and attrition campaign','Repeated strikes, interceptions and infrastructure damage accumulated while both sides tried to preserve leverage.','SPRING–SUMMER');
    card(g,'Hormuz coercion and interim bargain','Iran used maritime disruption as leverage; the June MOU temporarily structured behavior but did not become a final settlement.','JUNE–AUGUST');
    card(g,'Renewed pressure and regional spillover','By September, Hormuz remained badly disrupted, Yemen fighting intensified, Saudi energy infrastructure was hit and talks were unsettled.','SEPTEMBER');
  }

  function chronology(article) {
    intro(article,'Browse the complete chronology by date, actor, event type, evidence status and ordinary text search. Technical identifiers remain in provenance details rather than normal reader controls.');
    const c=article.querySelector('.chronology-controls'); if(!c) return;
    c.querySelectorAll('label').forEach(l=>{ const i=l.querySelector('input'); if(/source id|record id/i.test(l.textContent)||/^SRC-/i.test(i?.placeholder||'')) l.remove(); });
    const q=c.querySelector('input[type="search"]'); if(q) q.placeholder='Event, location, actor, or text';
  }

  function campaigns(article) {
    intro(article,'Read the campaign as action and result: objective, target or action, established effect, and current result. Recorded-event totals describe the evidence record; they are not a proxy for combat intensity.');
    const s=section(article,'Current campaign results','Recent fighting changed infrastructure and geography, while several attribution and operating-status questions remain open.'), g=add(s,'div','orientation-grid');
    card(g,'Saudi energy route hit','The Sep. 11 Iraqi-origin attack damaged the East-West pipeline. Later reporting puts it mostly out of service for roughly three to five weeks; the responsible group and ordering authority remain unresolved.','EFFECT ESTABLISHED');
    card(g,'Houthi west-coast gains','Greater and Lesser Hanish and Perim/Mayun improve the Houthi position around Bab el-Mandeb. They do not establish total control of commercial passage.','TERRITORIAL GAIN');
    card(g,'Threat activity is not damage','Saudi alerts and Houthi launch claims establish threat activity. They do not establish additional successful impacts or BDA without separate evidence.','EVIDENCE BOUNDARY');
    routeLink(s,'military.facilities','See authoritative facility status');
    const m=findSection(article,/^At a glance$/i); if(m) collapse(m,'Record coverage');
    const f=findSection(article,/^What did the damage change\?$/i); if(f){ const r=node(article.ownerDocument,'section','content-section canonical-owner-link'); add(r,'h2','','Facility effects'); add(r,'p','','Campaigns show when and how facilities were attacked. Current facility status is adjudicated once in Bases & Infrastructure.'); routeLink(r,'military.facilities','Open Bases & Infrastructure'); f.replaceWith(r); }
    article.querySelectorAll('[data-reader-drilldown="event-constituents"] .section-note').forEach(n=>n.textContent='These are recorded military events, not combat intensity or weapon quantity. Open a month to inspect the records behind the count.');
  }

  function facilities(article, context) {
    intro(article,'This is the authoritative reader view of current facility state. Damage, operating status and administrative withdrawal are distinct; continued presence is not proof that a facility is operating.');
    article.querySelector('[data-reader-facility-dashboard]')?.remove();
    const all=[...records(context.model,'ledger.facilities'),...records(context.model,'gate3.facilities')], map=new Map();
    all.forEach(r=>{const id=r.facility_id||r.id||r.name;if(id)map.set(id,{...(map.get(id)||{}),...r,facility_id:id});});
    const s=node(article.ownerDocument,'section','content-section reader-facility-dashboard'); s.dataset.readerFacilityDashboard='evidence-predicates';
    add(s,'h2','','Current facility status'); add(s,'p','lead-copy',`${map.size} named facilities are tracked in the current public record. That is the denominator here; it is not every facility in the theater.`);
    const order=['destroyed','damaged_not_operating','damaged_operating','operating','unknown','administrative'], groups=new Map(order.map(k=>[k,[]]));
    map.forEach((r,id)=>{const p=FACILITY[id]||['unknown','Facility','The current record does not support a more specific operating-status label.']; groups.get(p[0]).push([id,r,p]);});
    const active=order.slice(0,5).reduce((n,k)=>n+groups.get(k).length,0), bar=add(s,'div','reader-facility-status-bar');
    bar.setAttribute('role','img'); bar.setAttribute('aria-label',order.slice(0,5).map(k=>`${FSTAT[k][0]}: ${groups.get(k).length}`).join('; '));
    order.slice(0,5).forEach(k=>{const n=groups.get(k).length;if(!n)return;const z=add(bar,'span',`reader-facility-segment ${FSTAT[k][1]}`);z.style.width=`${active?n/active*100:0}%`;z.title=`${FSTAT[k][0]}: ${n}`;});
    const panels=add(s,'div','reader-facility-panels');
    order.forEach(k=>{const rows=groups.get(k);if(!rows.length)return;const d=add(panels,'details',`reader-facility-drawer ${FSTAT[k][1]}`);add(d,'summary','',`${FSTAT[k][0]} (${rows.length})`);const list=add(d,'div','reader-facility-list');
      rows.sort((a,b)=>txt(a[1].name||a[0]).localeCompare(txt(b[1].name||b[0]))).forEach(([id,r,p])=>{const c=add(list,'article','reader-facility-card');add(c,'h4','',txt(r.name||r.facility_name||id));add(c,'p','card-kicker',`Status scope: ${p[1]}`);const dates=[r.last_reviewed,r.assessment_date,r.date,...(r.damage_evidence_dates||[])].filter(Boolean).map(String).sort();if(dates.length)add(c,'p','card-kicker',`Status supported through ${dates.at(-1)}`);add(c,'strong','','Current qualification');add(c,'p','',p[2]);evidence(c,context,r,'Why this status is supported');});});
    const m=article.querySelector(':scope > .context-map'); if(m) article.insertBefore(s,m); else article.querySelector('.page-intro')?.after(s);
    const full=article.querySelector('.reader-full-facility-records')||findSection(article,/^Facility assessments$/i); if(full) collapse(full,`Browse full facility records (${map.size})`);
  }

  function losses(article) {
    intro(article,'Casualties and physical losses are separate questions. The record supports some exact or minimum quantities, but it does not support one honest theater-wide equipment-loss total.');
    const s=section(article,'No defensible total available','There is no defensible all-platform or all-actor physical-loss total. Only compatible, deduplicated physical quantities may be added; claim-only, approximate, mixed and unknown quantities stay outside the total.');
    const g=add(s,'div','orientation-grid'); card(g,'Known quantities','Exact sourced quantities may be summed only within compatible asset classes and statuses.','SUMMABLE WITHIN CLASS');card(g,'Unknown quantities','A damage or loss event can be established even when the number of physical assets is unknown.','KEEP UNKNOWN');card(g,'Actor claims','Reported target or loss counts are not converted into physical totals unless independently established.','NOT A PHYSICAL TOTAL');
    const c=article.querySelector('[data-loss-comparison]'); if(c){const h=c.querySelector('h2');if(h)h.textContent='Evidence records by category';const n=c.querySelector('.section-note');if(n)n.textContent='These counts describe evidence records, not physical losses. Open a category to inspect quantities and unknowns.';collapse(c,'Evidence records by category — not a physical loss total');}
  }

  function weapons(article) {
    intro(article,'Read weapons through event-level chains: what was used, what was intercepted or reached a target, and what effect was established. The record does not support a single whole-war effectiveness percentage.');
    const s=section(article,'No compatible whole-war denominator','Launches, interceptions, penetrations, impacts and damage come from different incidents, sources, time windows and counting universes.');
    card(s,'Sep. 8 Jordan-base attack','Jordan reported 20 ballistic missiles launched and 18 intercepted; it initially said two fell in unpopulated areas. Later U.S.-sourced reporting established real aircraft damage, so this is not a clean 18-of-20 interception-to-zero-hit chain.','EVENT-LEVEL CHAIN');
    const m=findSection(article,/^What counts mean$/i);if(m)collapse(m,'How weapon counts are kept compatible');
  }

  function imagery(article) {
    intro(article,'Start with what the imagery shows: the site, comparison date and visible physical change. Geolocation precision and interpretation limits come after the observation.');
    const m=[...article.querySelectorAll(':scope > section')].find(x=>/precision|tier|geolocat/i.test(x.querySelector('h2')?.textContent||''));if(m)collapse(m,'How imagery precision is graded');
    const a=findSection(article,/claims about these facilities hold up|facility assessments/i);if(a){const r=node(article.ownerDocument,'section','content-section canonical-owner-link');add(r,'h2','','Current facility status');add(r,'p','','Imagery supports physical observations. Current operating status is maintained in Bases & Infrastructure so the same site is not independently adjudicated twice.');routeLink(r,'military.facilities','Open Bases & Infrastructure');a.replaceWith(r);}
  }

  function shipping(article, context) {
    intro(article,'Hormuz traffic remains severely depressed, but physical closure is not established. Bab el-Mandeb traffic continued near its recent observable average despite Houthi territorial gains.');
    const s=section(article,'Current maritime condition','Provider-observable traffic, physical navigability and legal or commercial recognition are different questions.'),g=add(s,'div','orientation-grid'), rows=records(context.model,'gate3.shipping');
    const h=card(g,'Hormuz: severely depressed','Reuters preliminary tracking counted four commodity vessels exiting and ten entering the Gulf over the weekend. AIS-dark vessels may be absent; this does not establish physical closure.','PRELIMINARY OBSERVATION');evidence(h,context,rows.find(r=>r.shipping_id==='SHIP-HORMUZ-TRAFFIC-20260914'));
    const b=card(g,'Bab el-Mandeb: general traffic continues','Reuters counted 24 transits Saturday and 27 Sunday, approximately in line with the recent 10-day average. Houthi territorial gains do not establish general closure.','OBSERVED TRAFFIC');evidence(b,context,rows.find(r=>r.shipping_id==='SHIP-BAB-EL-MANDEB-TRAFFIC-20260914'));
    const a=card(g,'Iran’s 77-vessel list','Iran announced possible fines, detention or confiscation and warned maritime service providers. External legal recognition, enforceability and insurer/P&I/classification-society compliance are not established.','IRANIAN ANNOUNCEMENT');evidence(a,context,rows.find(r=>r.shipping_id==='SHIP-IRAN-STRAIT-AUTHORITY-LIST-20260914'));
    const m=findSection(article,/How to read the traffic observations/i);if(m)collapse(m,'How provider and AIS traffic data should be read');
  }

  function economy(article, context) {
    intro(article,'Iran and the Gulf are under severe wartime economic pressure. The current picture comes from sanctions, trade and oil-flow evidence, damaged energy infrastructure, freight costs and shipping disruption—not one forecast chart.');
    const s=section(article,'Current economic condition','Sanctions and war disruption materially constrain Iran and raise regional energy and freight costs, while trade and production continue unevenly rather than stopping altogether.'),g=add(s,'div','orientation-grid');
    const p=card(g,'Iran’s own assessment','President Masoud Pezeshkian acknowledged material sanctions and war effects and reported roughly a 35% fall in foreign trade. The percentage is an Iranian presidential self-assessment, not an independently audited statistic.','AUG. 28');evidence(p,context,eventById(context.model,'G3-PEZESHKIAN-SANCTIONS-ASSESSMENT-20260828'));
    const er=records(context.model,'gate3.economics');
    const o=card(g,'Oil market','Reuters reported Brent at $109.29/bbl and WTI at $104.26/bbl at 10:15 a.m. EDT Sep. 14, both up more than 4%. This is a dated snapshot.','SEP. 14');evidence(o,context,er.find(r=>r.economic_id==='ECON-OIL-MARKET-OPEN-20260914'));
    const f=card(g,'Freight and crude logistics','Reuters reported expectations of tighter sour crude, at least one delayed Saudi loading, record Gulf-to-Asia tanker rates and some AIS-dark Red Sea-loading vessels. This does not mean all Saudi deliveries were disrupted.','SOURCE-REPORTED');evidence(f,context,er.find(r=>r.economic_id==='ECON-ASIA-REFINERS-20260914'));
    card(g,'Saudi East-West pipeline','Later reporting says the line is expected to remain mostly out of service for roughly three to five weeks. Yanbu inventories and delivery timing are therefore material.','DAMAGED / MOSTLY OUT OF SERVICE');
    card(g,'Announced bank sanction','The announced large-bank U.S. sanction remained pending at the Sep. 14 12:01 ET cutoff. No bank is named because no Treasury/OFAC enactment identifying it was established.','NOT ENACTED');
    const m=findSection(article,/economic pressure: comparable snapshots|growth forecasts|comparable forecast/i);if(m)collapse(m,'Forecast context');
  }

  function hormuzTalks(article) {
    intro(article,'Oman publicly confirmed the planned Gulf-Iran Hormuz meeting existed and then postponed it. That resolves whether the meeting was real; it does not establish a signed reopening agreement or agreed sovereignty, route or fee terms.');
    const s=findSection(article,/^What is being negotiated now$/i),p=s?.querySelector('.lead-copy, p');if(p)p.textContent='Iran moved from claiming it would control and manage the Strait to a shared negotiating process with Oman and Gulf states. The confirmed meeting was postponed; substantive route, fee, sovereignty and reopening terms remain unresolved.';
    if(s)add(s,'p','scope-note','Saudi amendments were source-reported through a Gulf official; their detailed contents are not established through a public Saudi primary text.');
  }

  function diplomacy(article) {
    intro(article,'Diplomacy is shown as concrete changes: meetings held, meetings postponed, proposals made, exemptions denied, positions changed and agreements actually reached. Negotiating claims do not become agreements by repetition.');
    const c=article.querySelector('[data-diplomatic-state="current"]'),p=c?.querySelector('.lead-copy,p');if(p)p.textContent='The June MOU no longer controls either side. Oman confirmed the planned Gulf-Iran Hormuz meeting and then postponed it; no signed reopening arrangement replaced the MOU.';
    const s=section(article,'Latest diplomatic changes','The latest record distinguishes completed meetings from scheduled or postponed ones.'),g=add(s,'div','orientation-grid');
    card(g,'Hormuz meeting','Oman confirmed the planned meeting existed and then announced its postponement. Substantive terms remain unresolved.','CONFIRMED / POSTPONED');
    card(g,'U.S.–Saudi defense diplomacy','Crown Prince Mohammed bin Salman met CENTCOM commander Adm. Brad Cooper in Jeddah on Sep. 14.','MEETING HELD');
    card(g,'Eslami / IAEA conference','A UN sanctions travel exemption for Mohammad Eslami was not approved after a U.S. objection. This is not a new general sanctions package.','EXEMPTION NOT APPROVED');
    card(g,'Israel–Lebanon talks','A U.S. official said Israel and Lebanon are expected to meet in Rome in October. That is an expected negotiation, not a completed meeting.','EXPECTED');
  }

  function mou(article) {
    intro(article,'The June MOU was an interim bargain. It is no longer in force and no final arrangement has replaced it; current Hormuz, nuclear and regional terms have to be negotiated anew.');
    const s=section(article,'What controls now?','The June MOU no longer controls either side. It remains the historical baseline for what each side previously accepted, obtained and failed to sustain, but it is not the current operating agreement.');routeLink(s,'hormuz.talks','See current Hormuz talks');routeLink(s,'talks.nuclear','See current nuclear talks');
  }

  function nuclear(article) {
    const s=section(article,'Latest nuclear-diplomacy development','Mohammad Eslami was prevented from attending the IAEA General Conference after the UN sanctions travel-exemption process did not produce approval following a U.S. objection. This is not a new general sanctions package.');routeLink(s,'talks.overview','See wider diplomacy');
  }

  function regional(article) {
    intro(article,'Regional diplomacy is easiest to read through what actually changed—meetings held, proposals made, alignments tested and arrangements accepted or rejected. Participation rosters and causal interpretation come afterward.');
    const r=findSection(article,/14-state maritime support|roster/i);if(r)collapse(r,'Regional participation and roster detail');
  }

  function objectives(article) {
    intro(article,'Objectives are assessed one at a time. There is no composite victory score: each stated objective is compared with the current result and the reason for that result.');
    const s=node(article.ownerDocument,'section','content-section objective-reader-results');s.dataset.publicObjectiveResults='true';add(s,'h2','','Objectives and current results');
    ['United States','Iran'].forEach(actor=>{const g=add(s,'section','objective-actor-group');add(g,'h3','',actor);const l=add(g,'div','record-list');OBJECTIVES.filter(o=>o[0]===actor).forEach(o=>{const c=add(l,'article','provenance-card objective-result');add(c,'p','card-kicker',o[2]);add(c,'h4','',o[1]);add(c,'strong','','Why');add(c,'p','',o[3]);});});
    article.querySelector('.page-intro')?.after(s);
    for(const t of [/^Original and wartime objectives$/i,/^Negotiating demands and later changes$/i,/^Outcomes by level$/i]){const x=findSection(article,t);if(x)collapse(x,'Supporting objective and position evidence');}
  }

  function positions(article) {
    intro(article,'This is the before-and-after record of diplomatic and negotiating positions: what an actor demanded earlier, what changed, and what it later accepted, proposed or did. Objective success is assessed separately.');
    const m=findSection(article,/^What changed$/i);if(m)collapse(m,'Messaging context related to these position changes');
  }

  function iranMessaging(stage, article) {
    article.querySelector('h1')?.replaceChildren('Iran Messaging & Claims');
    intro(article,'This page follows Iranian rhetoric, threats, contradictions and narrative changes over time. It does not duplicate the objective scorecard or treat every changed phrase as a policy concession.');
    stage.querySelectorAll('a').forEach(a=>{if(txt(a.textContent)==="How Iran's Position Changed")a.textContent='Iran Messaging & Claims';});
  }

  function claimChecks(article) {
    article.querySelectorAll('.unresolved-box').forEach(b=>{if(![...b.querySelectorAll('li')].some(li=>txt(li.textContent)))b.remove();});
  }

  function information(stage, article) {
    article.querySelector('h1')?.replaceChildren('Claims, Falsehoods & Deception');
    intro(article,'Claims are grouped by what was asserted. Each entry shows the current finding, what later evidence established and how the evidence supports it. False does not mean lie unless knowing falsehood is established.');
    stage.querySelectorAll('a').forEach(a=>{if(txt(a.textContent)==='Lie Ledger')a.textContent='Claims, Falsehoods & Deception';});
    article.querySelectorAll('.reader-ledger-card').forEach(c=>{if(c.dataset.readerFinding==='likely-lie'){c.dataset.readerFinding='false';const b=[...c.querySelectorAll('*')].find(x=>txt(x.textContent)==='Likely lie');if(b)b.textContent='False';}});
    article.querySelectorAll('option').forEach(o=>{if(/likely lie/i.test(o.textContent)){o.textContent='False';o.value='false';}});
  }

  function finalizePublicProduct(stage, route, routeRuntime, doc) {
    const article=stage.querySelector('.public-page');if(!article||!route)return;article.dataset.publicProduct=PRODUCT_VERSION;const context=accessContext(routeRuntime,route,doc);
    const k=route.key;
    if(k==='start.overview')overview(article); if(k==='start.actors')actors(article); if(k==='timeline.war')timeline(article); if(k==='timeline.chronology')chronology(article);
    if(k==='military.campaigns')campaigns(article); if(k==='military.facilities')facilities(article,context); if(k==='military.losses')losses(article); if(k==='military.weapons')weapons(article); if(k==='military.imagery')imagery(article);
    if(k==='hormuz.shipping')shipping(article,context); if(k==='hormuz.economy')economy(article,context); if(k==='hormuz.talks')hormuzTalks(article);
    if(k==='talks.overview')diplomacy(article); if(k==='talks.mou')mou(article); if(k==='talks.nuclear')nuclear(article); if(k==='talks.regional')regional(article);
    if(k==='objectives.outcomes')objectives(article); if(k==='objectives.positions')positions(article); if(k==='objectives.iran')iranMessaging(stage,article);
    if(k==='evidence.claims')claimChecks(article); if(k==='evidence.information')information(stage,article);
  }

  function quiesceMaps(node) {
    if (!node || typeof node.querySelectorAll !== 'function') return;
    [node, ...node.querySelectorAll('*')].forEach(candidate => {
      const map = candidate && candidate._atlasMap; if (!map) return;
      if (typeof map.stop === 'function') try { map.stop(); } catch (_) {}
      if (map._animatingZoom) map._animatingZoom = false;
    });
  }
  function removeMaps(node) {
    if (!node || typeof node.querySelectorAll !== 'function') return;
    [node, ...node.querySelectorAll('*')].forEach(candidate => { const map=candidate&&candidate._atlasMap;if(map&&typeof map.remove==='function')try{map.remove();}catch(_){} });
  }
  function retireVisibleNodes(doc, rootElement, nodes) {
    if (!nodes?.length) return; const host=doc.createElement('div');host.dataset.atlasReaderRetirement=VERSION;host.setAttribute('aria-hidden','true');
    Object.assign(host.style,{position:'fixed',left:'-100000px',top:'0',width:'1px',height:'1px',visibility:'hidden',pointerEvents:'none',overflow:'hidden'});
    (doc.body||doc.documentElement||rootElement).append(host);nodes.forEach(n=>host.append(n));nodes.forEach(removeMaps);host.remove();
  }
  function createStagingHost(doc, rootElement, win) {
    const host=doc.createElement('div');host.dataset.atlasReaderStaging=VERSION;host.setAttribute('aria-hidden','true');
    Object.assign(host.style,{position:'fixed',left:'-100000px',top:'0',width:`${Math.max(1024,Number(win?.innerWidth)||1280)}px`,minHeight:'100vh',visibility:'hidden',pointerEvents:'none',overflow:'hidden'});
    (doc.body||doc.documentElement||rootElement).append(host);invariant(host.isConnected!==false,'READER_STAGE_DISCONNECTED','Reader staging host must remain connected during finalization.');return host;
  }
  function validateFinalizedStage(stage, projectionRuntime) {
    const app=stage.querySelector?.('.atlas-app'),article=stage.querySelector?.('.public-page'),heading=article?.querySelector?.('h1');
    invariant(app&&article&&heading,'READER_FINALIZATION_INCOMPLETE','The staged route is missing the qualified reader shell.');
    invariant(article.dataset&&article.dataset.readerLayer===projectionRuntime.READER_LAYER_VERSION,'READER_PROJECTION_MISSING','The staged route did not complete reader projection.');
    invariant(!INTERNAL_TEXT.test(String(stage.innerText||stage.textContent||'')),'READER_INTERNAL_LEAK','The staged route contains internal review text.');
    return {app,article,heading};
  }
  const copyRouteState=(target,staged)=>['routeKey','pageOwner','primarySection','secondaryPage'].forEach(k=>{target[k]=staged[k];});
  function emitRouteFailure(win,state,error){state.readerError={code:error.code||'READER_FINALIZATION_FAILED'};root.console?.error?.('Atlas reader route finalization failed',error);if(win?.CustomEvent&&win.dispatchEvent)win.dispatchEvent(new win.CustomEvent('atlasreadererror',{detail:{code:state.readerError.code}}));}

  function mount(options) {
    const settings=options||{},doc=settings.documentObject||root.document,win=settings.windowObject||root,rootElement=settings.rootElement,routeRuntime=settings.routeRuntime,state=settings.state||{},projectionRuntime=settings.projectionRuntime||projection;
    invariant(doc&&rootElement&&routeRuntime&&typeof routeRuntime.forRoute==='function','READER_REGISTRY_INVALID','Reader registry requires a document, root element, and guarded route runtime.');
    invariant(projectionRuntime&&typeof projectionRuntime.mount==='function'&&typeof projectionRuntime.parseRoute==='function','READER_PROJECTION_UNAVAILABLE','Reader projection support is unavailable.');
    rootElement.__atlasRouteController?.destroy?.();
    let destroyed=false,previousRouteKey=null,currentServices=null;
    const stageRoute=(focusHeading,propagateFailure=false)=>{
      invariant(!destroyed,'READER_REGISTRY_DESTROYED','Reader registry is no longer active.');
      const previousTitle=doc.title,previousVisible=Array.from(rootElement.children||[]).filter(n=>!n.dataset?.atlasReaderStaging),hasQualified=rootElement.dataset?.status==='ready'&&previousVisible.length>0,stagedState={...state},stage=createStagingHost(doc,rootElement,win);let support=null;
      try {
        support=projectionRuntime.mount({...settings,documentObject:doc,windowObject:win,rootElement:stage,routeRuntime,state:stagedState});
        const route=support?.current?.()||projectionRuntime.parseRoute(win.location&&win.location.hash);
        finalizePublicProduct(stage,route,routeRuntime,doc);
        const finalized=validateFinalizedStage(stage,projectionRuntime);
        currentServices=support?.services?.()||currentServices;support?.destroy?.();support=null;finalized.app.dataset.readerAuthority=VERSION;
        previousVisible.forEach(quiesceMaps);rootElement.replaceChildren(finalized.app);retireVisibleNodes(doc,rootElement,previousVisible);stage.remove();
        rootElement.className='atlas-ready';rootElement.dataset.status='ready';rootElement.setAttribute('aria-busy','false');copyRouteState(state,stagedState);delete state.readerError;
        if(focusHeading&&previousRouteKey&&route&&previousRouteKey!==route.key)finalized.heading.focus?.();previousRouteKey=route?.key||stagedState.routeKey||previousRouteKey;return route;
      } catch(error) {
        try{support?.destroy?.();}catch(_){} stage.remove();doc.title=previousTitle;
        const failure=error instanceof ReaderRegistryError?error:new ReaderRegistryError(error?.code||'READER_FINALIZATION_FAILED','Reader projection or finalization failed.',error);
        if(hasQualified){emitRouteFailure(win,state,failure);if(propagateFailure)throw failure;return null;} throw failure;
      }
    };
    const onHashChange=()=>stageRoute(true,false);win?.addEventListener?.('hashchange',onHashChange);let initialRoute;
    try{initialRoute=stageRoute(false,false);}catch(error){win?.removeEventListener?.('hashchange',onHashChange);throw error;}
    const controller=Object.freeze({render:()=>stageRoute(false,true),current:()=>projectionRuntime.parseRoute(win.location&&win.location.hash),services:()=>currentServices,destroy:()=>{destroyed=true;win?.removeEventListener?.('hashchange',onHashChange);},initialRoute});
    rootElement.__atlasRouteController=controller;return controller;
  }

  return Object.freeze({...projection,mount,READER_REGISTRY_VERSION:VERSION,ReaderRegistryError,validateFinalizedStage});
}));
