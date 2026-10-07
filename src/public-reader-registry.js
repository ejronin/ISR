/* ATLAS AUTHORITATIVE PUBLIC READER REGISTRY
 *
 * Sole visible page and route authority. The registry directly constructs the
 * public shell, invokes base page builders as non-authoritative render primitives,
 * applies reader support while the route is still staged, finalizes Public Product
 * semantics, validates the result, and only then promotes it. No alternate base
 * application is ever mounted underneath the reader.
 */
(function initAtlasPublicReaderRegistry(globalObject, factory) {
  'use strict';
  const api = factory(globalObject);
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  if (api) globalObject.AtlasPublicIA = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function atlasReaderRegistryFactory(root) {
  'use strict';

  const base = root.AtlasPublicIA || (typeof require === 'function' ? require('./public-ia.js') : null);
  const readerSupport = root.AtlasPublicReaderSupport || (typeof require === 'function' ? require('./public-reader-layer.js') : null);
  if (!base || typeof base.parseRoute !== 'function' || !readerSupport || typeof readerSupport.projectShell !== 'function') return null;

  const VERSION = 'atlas-reader-registry-v1';
  const PRODUCT_VERSION = 'sep14-reader-convergence-v1';
  const PROTECTED_LAYOUT_ROUTES = new Set(['evidence.information','evidence.web_of_lies']);
  const INTERNAL_TEXT = /(?<![\w./-])ROOK(?![\w./-])|\bPR\/CI\b|claim[_ -]?instance[_ -]?id|proposition[_ -]?id|chain[_ -]?id|publication[_ -]?blocker|knowledge[_ -]?basis[_ -]?support[_ -]?failure|\bcommit\s+SHA\b|\bmerge\s+SHA\b|\bpull request\b|\bGitHub Actions\b|\bworkflow run\b|\bcanonical material-loss records\b|\bcurrent qualification\b|\banalyst position\b|\bEvidence\s*\/\s*BDA\b/i;

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
  function routeLink(host, key, label) { const a = add(host, 'a', 'inline-route-link', label); a.href = base.routeHref(key); return a; }
  function findSection(article, pattern) {
    return [...article.querySelectorAll(':scope > section, :scope > details')].find(x => pattern.test(x.querySelector(':scope > h2, :scope > summary')?.textContent || '')) || null;
  }
  function collapse(el, label) {
    if (!el || el.tagName === 'DETAILS') return el;
    const d = node(el.ownerDocument, 'details', 'secondary-context reader-method-detail'); add(d, 'summary', '', label);
    if (el.id) d.id = el.id;
    Object.entries(el.dataset || {}).forEach(([key, value]) => { d.dataset[key] = value; });
    [...el.children].forEach(child => { if (!/^H[1-6]$/.test(child.tagName)) d.append(child); }); el.replaceWith(d); return d;
  }
  function addClass(el, className) {
    if (!el || !className) return el;
    const classes = new Set(String(el.className || '').split(/\s+/).filter(Boolean));
    String(className).split(/\s+/).filter(Boolean).forEach(value => classes.add(value));
    el.className = [...classes].join(' ');
    return el;
  }
  function markGuideSection(el, id, marker, title) {
    if (!el) return null;
    el.dataset.guideSection = id;
    if (marker) el.dataset.guideMarker = marker;
    addClass(el, 'guide-editorial-section');
    const heading = el.querySelector(':scope > h2, :scope > summary');
    if (heading) {
      if (title) heading.textContent = title;
      if (marker) heading.dataset.guideMarker = marker;
      addClass(heading, 'guide-section-heading');
    }
    return el;
  }
  function markGuideSupport(el) {
    if (!el) return null;
    addClass(el, 'guide-subordinate-section');
    return el;
  }
  function accessContext(routeRuntime, route, doc) { const a = routeRuntime.forRoute(route); return { documentObject: doc, model: a.model, services: a.services, route }; }
  function modelData(model, key) { return base.modelData ? base.modelData(model, key) : null; }
  function records(model, key) {
    const v = modelData(model, key);
    if (base.recordArray) return base.recordArray(v);
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') for (const k of ['records','items','facilities','shipping','economics','diplomacy','gaps','claims']) if (Array.isArray(v[k])) return v[k];
    return [];
  }
  function evidence(host, context, record, label='Evidence', localSources={}) {
    if (!record || !base.EvidenceDrawer?.create) return;
    const ids = [...new Set([...(record.source_ids || []), ...((record.sources || []).filter(x => typeof x === 'string'))])];
    if (!ids.length) return;
    const d = base.EvidenceDrawer.create(context, { source_ids: ids }, { localSources }); const summary = d.querySelector('summary'); if (summary) summary.textContent = label; host.append(d);
  }

  const FACILITY_PUBLIC_STATE = Object.freeze({
    RED: ['Inoperable base (whole)', 'facility-red'],
    YELLOW: ['Damaged; parts inoperable', 'facility-yellow'],
    BLUE: ['Damaged; operable', 'facility-blue'],
    GREEN: ['Untouched', 'facility-green'],
    UNCLASSIFIED: ['Unclassified', 'facility-unclassified']
  });

  function facilityAdjudication(context) {
    const payload = modelData(context.model, 'analysis.facility_operational_status') || {};
    const classifiedById = new Map(asArray(payload.classified).map(item => [txt(item && item.facility_id), item]).filter(([id]) => id));
    const unclassifiedById = new Map(asArray(payload.unclassified_tracked).map(item => [txt(item && item.facility_id), item]).filter(([id]) => id));
    return { payload, classifiedById, unclassifiedById };
  }

  const OBJECTIVES = [
    ['United States','Deny Iran a nuclear weapon','UNRESOLVED','No Iranian nuclear weapon is established, but no durable controlling nuclear settlement exists and the safeguards dispute has escalated.'],
    ['United States','Break offensive military power projection','PARTLY ACHIEVED','Iran suffered substantial losses and damage, but it continues missile and drone attacks and maritime coercion.'],
    ['United States','Reduce Iran’s ability to arm and sustain proxies','PARTLY ACHIEVED','Some proxy and network losses are established. Houthi forces remain capable of attacks, but Saudi-backed forces report materially reversing the September west-coast gains around Bab el-Mandeb; the extent remains contested and fighting around Taiz continues.'],
    ['United States','Restore usable navigation through Hormuz','NOT ACHIEVED','Gulf exports and physical transit have recovered substantially, but Hormuz remains selectively constrained and dangerous, tanker attacks continue, and no normalized navigation regime is established.'],
    ['United States','Use economic isolation to narrow Tehran’s options','PARTLY ACHIEVED','Severe trade, export and financial pressure is established. Kpler data cited by Reuters showed zero Iranian crude exports in September, while Chinese independent refiners substituted Iraqi and Qatari barrels. Iran retains other trade and coercive capacity.'],
    ['Iran','War damages / reparations paid','NOT ACHIEVED','Payment is not established.'],
    ['Iran','Frozen / blocked Iranian assets returned','NOT ACHIEVED','Return of the demanded assets is not established.'],
    ['Iran','U.S. naval blockade terminated','NOT ACHIEVED','Termination of the demanded blockade is not established.'],
    ['Iran','Full / verifiable sanctions relief','NOT ACHIEVED','Full or verifiable sanctions relief is not established.'],
    ['Iran','U.S. withdrawal from bases surrounding Iran','NOT ACHIEVED','Some pre-existing drawdowns occurred, but the broad demanded regional withdrawal is not established.'],
    ['Iran','Protection / non-aggression toward Axis allies','NOT ACHIEVED','No durable protection or non-aggression guarantee exists.'],
    ['Iran','Permanent Iranian Hormuz sovereignty / management / fees','NOT ACHIEVED','Iran continues to disrupt Hormuz traffic, but recognized exclusive sovereignty, management and compulsory fee rights are not established.'],
    ['Iran','No concessions on nuclear, missiles, defense or regional architecture','PARTLY ACHIEVED','Iran has not accepted every U.S. demand, but mediated and shared maritime arrangements are inconsistent with its earlier categorical position.']
  ];
  const objectiveKey = value => txt(value).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
  function objectiveStatusFamily(status) {
    const value=txt(status).toUpperCase();
    if (/ABANDONED/.test(value)) return ['failure','Abandoned'];
    if (/FAILING/.test(value)) return ['partial','Failing'];
    if (/UNRESOLVED|UNSCORED|NOT YET|OPEN/.test(value)) return ['not-yet','Open'];
    if (/PART|SUBSTANTIAL|INCOMPLETE|SOFTEN/.test(value)) return ['partial','Partial'];
    if (/NOT ACHIEVED|FAILED|REVERSED|MOSTLY UNMET|MOVING OPPOSITE|OBJECTIVE RETREATED/.test(value)) return ['failure','Failed'];
    if (/ACHIEVED|CONTROLLING|SUCCESS/.test(value)) return ['success','Achieved'];
    return ['not-yet','Open'];
  }

  const IRAN_PUBLIC_OBJECTIVE_OVERRIDES = [
    {
      match: /war damages|reparations/i,
      goal: 'War reparations',
      status: 'ABANDONED',
      family: 'failure',
      label: 'Abandoned',
      why: 'Iran demanded compensation for wartime damage, but no reparations payment was obtained. Later Iranian settlement terms kept other demands while reparations disappeared. The separate $300 billion June reconstruction/economic-development mechanism was conditional, was not legal reparations, and never became an operating fund.'
    },
    {
      match: /frozen.*blocked.*assets|frozen.*assets/i,
      goal: 'Recover frozen / blocked Iranian assets',
      status: 'FAILING',
      family: 'partial',
      label: 'Failing',
      why: 'Iran has not recovered broad, durable access to the assets it demanded. The June mechanism still required procedures and continuing performance and did not mature before the agreement collapsed. Iran continues to seek asset relief, but whether Washington will accept asset release as a condition of a final peace remains unresolved.'
    },
    {
      match: /naval blockade/i,
      goal: 'Compel removal of the U.S. naval blockade',
      status: 'FAILED',
      family: 'failure',
      label: 'Failed',
      why: 'Iran briefly obtained blockade relief under the June MOU, but the gain was reversed. Coercive pressure through Gulf-state pressure, attacks and regional military pressure, damage to U.S. facilities, and Hormuz/global-trade leverage did not force durable removal. The current bargaining problem is still blockade relief in exchange for restored freedom of navigation; no durable agreement has been reached.'
    },
    {
      match: /withdrawal from bases|regional withdrawal/i,
      goal: 'Force a U.S. regional withdrawal',
      status: 'FAILED',
      family: 'failure',
      label: 'Failed',
      why: 'The broad withdrawal Iran demanded did not happen. Gulf states did not expel U.S. forces under Iranian pressure; drawdowns already negotiated or scheduled before the war are not Iranian-forced retreats; and Iranian attacks damaged facilities without causing a broad U.S. regional withdrawal.'
    },
    {
      match: /protection.*axis|axis allies/i,
      goal: 'Secure protection / non-aggression for the Axis of Resistance',
      status: 'FAILED',
      family: 'failure',
      label: 'Failed',
      why: 'No durable Axis-wide protection arrangement was obtained. Lebanon and other regional states continued exercising their own sovereign authority over Iran-aligned armed groups rather than accepting an Iranian right to dictate their security policy. The later accepted record also establishes operational Iranian support to Houthi fighting, while not establishing Iranian command over every Houthi action.'
    },
    {
      match: /no concessions.*nuclear|nuclear.*missiles.*defense/i,
      goal: 'Make no concessions on nuclear, missile, defense or regional issues',
      status: 'FAILING',
      family: 'partial',
      label: 'Failing',
      why: 'Iran’s original categorical no-concessions position no longer holds intact. It has accepted negotiated or shared regional arrangements and publicly discussed negotiated inspection and nuclear arrangements that the earlier position treated categorically. Major enrichment, uranium-disposition, missile, defense and inspection terms remain unresolved, so the objective is failing rather than fully failed.'
    }
  ];
  function publicObjectivePresentation(actor, goal, status, why) {
    if (actor === 'Iran') {
      const override=IRAN_PUBLIC_OBJECTIVE_OVERRIDES.find(item=>item.match.test(txt(goal)));
      if (override) return { ...override, acceptedStatus: status, acceptedWhy: why };
    }
    const [family,label]=objectiveStatusFamily(status);
    return { goal, status, family, label, why, acceptedStatus: status, acceptedWhy: why };
  }

  function overview(article, context) {
    intro(article, 'Iran remains under severe military and economic pressure. Mediated contacts continue, but no agreement has been reached; Tehran ties reopening Hormuz to seven conditions while regional oil flows increasingly adapt around the disruption.');
    const s=section(article,'Where does it stand now?', 'Iran still has the ability to impose risk and disruption, but it has not secured the regional order or Hormuz authority it demanded. The current contest is over the terms for reopening and pressure relief, while Gulf exports recover and Iran’s own crude exports remain severely constrained.');
    s.dataset.overviewCurrentPosition = 'accepted-evidence';
    add(s,'p','', "Iran hasn't capitulated. But its negotiating position increasingly looks like a country trying to get the best deal it can from a bad position, rather than a country deciding what the final deal will be. That's a long way from where Iran said this war was going.");
    const eventEvidence = (host, ids) => {
      const selected = context.model.chronology.filter(item => ids.includes(item.event_id));
      evidence(host, context, { source_ids: selected.flatMap(item => item.source_ids || item.event?.source_ids || []) }, 'Sources behind this account');
    };
    const g=add(s,'div','record-list');
    const earlier=card(g,'What Iran said it would achieve','Iran talked about controlling Hormuz, deciding who could pass and charging ships for passage. It demanded that others accept its conditions before shipping and negotiations returned to normal.','ORIGINAL OBJECTIVE');
    eventEvidence(earlier, ['EV-20260805-001','EV-20260822-001','G3-IRAN-HORMUZ-RESTRICTED-ZONE-20260907','G3-IRAN-HORMUZ-SEQUENCING-20260920']);
    const offer=card(g,'What Iran is asking for now','Trump rejected Iran’s September 26 reopening proposal. Mediated contacts continued afterward, and Iran now says the U.S. response has been relayed through mediators while additional points remain unresolved. Qalibaf has tied reopening Hormuz to seven Iranian conditions based on the June Islamabad memorandum. No agreement has been reached.','CURRENT RESULT');
    eventEvidence(offer, ['G3-IRAN-HORMUZ-REOPENING-OFFER-20260922','G3-IRAN-SEVEN-DAY-HORMUZ-PROPOSAL-20260925','G3-TRUMP-REJECTS-IRAN-PROPOSAL-20260926','G3-OMAN-IRAN-HORMUZ-MEETING-20260926']);
    const result=card(g,'Iran has not made others accept its terms','Iran has not established the permanent control over Hormuz it sought or forced the United States to accept its terms. Gulf states have not accepted Iranian control of regional shipping. Saudi Arabia is publicly calling for the prewar system to return, without Iranian fees or tolls. Iran is asking for the pressure against it to end.','WHY THIS FALLS SHORT');
    eventEvidence(result, ['G3-ARAB-LEAGUE-HORMUZ-POSITION-20260908','G3-SAUDI-UNGA-NAVIGATION-NO-TOLLS-20260926','G3-TRUMP-REJECTS-IRAN-PROPOSAL-20260926']);
    routeLink(s,'hormuz.talks','Follow the Hormuz talks');

    // Keep the existing domain evidence and navigation, with present-condition copy.
    const summaries = {
      military: 'U.S. and coalition forces retained the strike advantage. Iran has not forced the broad U.S. withdrawal from the region it demanded.',
      hormuz: 'Iran has not established permanent control of Hormuz. Gulf exports have recovered substantially, but the strait remains selectively constrained and dangerous and no reopening agreement is in force.',
      economy: 'Iran faces severe currency, sanctions and export pressure. Kpler data cited by Reuters showed zero Iranian crude exports in September while Chinese refiners substituted Iraqi and Qatari barrels.',
      diplomacy: 'The June MOU is no longer in force. Mediated U.S.-Iran contacts continue, but additional points remain unresolved and no signed Hormuz reopening arrangement has replaced it.'
    };
    article.querySelectorAll('[data-orientation-domain]').forEach(c => {
      const p=c.querySelector(':scope > p:not(.card-kicker):not(.record-status)');
      if(p && summaries[c.dataset.orientationDomain]) p.textContent=summaries[c.dataset.orientationDomain];
      c.querySelector('.record-status')?.remove();
      if (c.dataset.orientationDomain === 'hormuz' || c.dataset.orientationDomain === 'diplomacy') eventEvidence(c, ['G3-TRUMP-REJECTS-IRAN-PROPOSAL-20260926','G3-SAUDI-UNGA-NAVIGATION-NO-TOLLS-20260926','G3-OMAN-IRAN-HORMUZ-MEETING-20260926']);
    });
  }

  function actors(article) {
    intro(article,'Start with the actors, not the data model: states and armed forces, non-state armed groups, leaders, mediators and international organizations appear here according to the role they actually play in the record.');
    addClass(article,'guide-migrated-page guide-collection-page guide-actor-directory-page guide-phase1-actors');
    const explorer=article.querySelector('.actor-explorer');
    if(explorer) addClass(explorer,'guide-structural-panel');
    const controls=article.querySelector('.actor-controls');
    if(controls) addClass(controls,'guide-filter-rail');
    const index=article.querySelector('.actor-index');
    if(index){
      index.dataset.guideSection='actor-directory';
      index.id='actor-directory';
      addClass(index,'guide-collection-group');
    }
    article.querySelectorAll('.actor-directory').forEach(list=>addClass(list,'guide-dense-directory'));
    article.querySelectorAll('.actor-family-section').forEach(sectionNode=>addClass(sectionNode,'guide-collection-group'));
    const n=article.querySelector(':scope > .scope-note'); if(n) collapse(n,'How actor identity is assigned');
  }

  function timeline(article, context) {
    const counts=context.model.counts||{}, chronologyCount=Number(counts.chronology_records)||0, conflictDays=Number(counts.gate3_daily_coverage_days)||0;
    intro(article,`The conflict is easiest to follow in phases. Use this orientation first, then narrow the interactive timeline by date, actor or topic. All Events contains all ${chronologyCount} records. ${conflictDays} conflict days are represented in the wartime coverage record.`);
    addClass(article,'guide-migrated-page guide-phase1-timeline');
    const explorer=article.querySelector('.timeline-explorer');
    if(explorer) addClass(explorer,'guide-structural-panel');
    const density=article.querySelector('.guide-event-density');
    if(density) addClass(density,'guide-phase1-primary-visual');
    const summary=article.querySelector('.timeline-period-summary');
    if(summary) addClass(summary,'guide-summary-strip');
    const s=section(article,'Conflict phases','The phase guide is orientation, not a replacement for the exhaustive chronology.'), g=add(s,'div','orientation-grid');
    card(g,'Opening strikes and regional expansion','Direct attacks quickly spread across bases, air-defense sites, maritime routes and aligned armed groups.','FEB–MAR');
    card(g,'Sustained strikes and mounting losses','Repeated strikes, interceptions and infrastructure damage accumulated through the spring and summer.','SPRING–SUMMER');
    card(g,'Hormuz coercion and interim bargain','Iran used maritime disruption as leverage; the June MOU temporarily structured behavior but did not become a final settlement.','JUNE–AUGUST');
    card(g,'Renewed pressure and regional spillover','By September, Hormuz remained badly disrupted, Yemen fighting intensified, Saudi energy infrastructure was hit and talks were unsettled.','SEPTEMBER');
  }

  function chronology(article) {
    intro(article,'Browse the complete chronology by date, actor, event type, evidence status and ordinary text search. Technical identifiers remain in provenance details rather than normal reader controls.');
    addClass(article,'guide-migrated-page guide-collection-page guide-event-directory-page');
    const c=article.querySelector('.chronology-controls'); if(!c) return;
    addClass(c,'guide-filter-rail');
    c.dataset.guideSection='event-directory';
    c.id='event-directory';
    c.querySelectorAll('label').forEach(l=>{ const i=l.querySelector('input'); if(/source id|record id/i.test(l.textContent)||/^SRC-/i.test(i?.placeholder||'')) l.remove(); });
    const q=c.querySelector('input[type="search"]'); if(q) q.placeholder='Event, location, actor, or text';
    addClass(article.querySelector(':scope > .record-list'),'guide-dense-directory');
    addClass(article.querySelector(':scope > .pager'),'guide-collection-pager');
  }

  function campaigns(article) {
    addClass(article, 'guide-migrated-page guide-campaign-page');
    intro(article,'Read the campaign as action and result: objective, target or action, established effect, and current result. Recorded-event totals describe the evidence record; they are not a proxy for combat intensity.');

    const summary=section(article,'Current campaign results','Recent fighting changed infrastructure and geography, while several attribution and operating-status questions remain open.');
    addClass(summary,'guide-summary-strip');
    const g=add(summary,'div','orientation-grid');
    card(g,'Saudi East-West pipeline','The Sep. 11 attack damaged three pumping stations. The line has since restarted and is carrying material bypass volume: Saudi Arabia said 5.8 million barrels had been pumped by Oct. 6, while Reuters reported roughly 4 million bpd was being rerouted toward Yanbu. Full 7 million bpd capacity is not established.','DAMAGED / OPERATING');
    card(g,'Bab el-Mandeb coast','Saudi-backed Yemeni forces report retaking most coastal areas around Bab el-Mandeb, but Reuters could not independently verify the full extent and the Houthis dispute the claimed losses. Fighting around Taiz continues, and the Houthis retained long-range strike capability, including an Oct. 7 attack on Aden airport and missiles Saudi Arabia said it intercepted toward Riyadh and Khamis Mushait.','COUNTEROFFENSIVE / CONTESTED');
    card(g,'Threat activity is not damage','Saudi alerts and Houthi launch claims establish threat activity. Additional successful impacts require separate damage evidence.','EVIDENCE BOUNDARY');
    routeLink(summary,'military.facilities','See authoritative facility status');

    const guard=article.querySelector('.guide-phase1-campaign-guardrail')||add(summary,'aside','scope-note guide-phase1-campaign-guardrail');
    if(!guard.querySelector('strong')) add(guard,'strong','','HIT ≠ DAMAGED ≠ DESTROYED ≠ INEFFECTIVE');
    if(!guard.querySelector('p')) add(guard,'p','','Each step requires independent support in the accepted record; the visualization does not collapse them into one state.');

    const coverage=findSection(article,/^At a glance$/i);
    if(coverage) collapse(coverage,'Record coverage');

    const boundary=markGuideSection(findSection(article,/^From damage to war results$/i),'damage-effect','01','Damage is not the same as effect');
    const tempo=markGuideSection(findSection(article,/^Recorded military activity by month$/i),'campaign-activity','02','Campaign activity');
    const strikeMap=article.querySelector(':scope > [data-visual-sweep-hero="campaign"]')||article.querySelector(':scope > .context-map');
    markGuideSection(strikeMap,'strike-geography','03','Where strikes occurred');
    addClass(strikeMap,'guide-structural-panel');

    const attacks=markGuideSupport(findSection(article,/^U\.S\. \/ coalition attacks inside Iran:/i));
    const physical=markGuideSection(findSection(article,/^What was physically damaged\?$/i),'physical-damage','04','Physical damage');
    if(physical&&attacks) physical.after(attacks);

    const effect=markGuideSection(findSection(article,/^What did the damage change\?$/i),'operational-effect','05','Operational effect');
    if(effect){
      add(effect,'p','scope-note','These records show the attack, physical damage and operating effect separately. Current facility status is shown on the facility page.');
      routeLink(effect,'military.facilities','Open Bases & Infrastructure for authoritative current facility status');
    }

    const posture=findSection(article,/^Troop and force movements$/i);
    const developments=findSection(article,/^Representative campaign developments$/i);
    if(posture){
      markGuideSection(posture,'developments','06','Movements & developments');
      markGuideSupport(developments);
    } else {
      markGuideSection(developments,'developments','06','Movements & developments');
    }

    [boundary,tempo,physical,effect].forEach(sectionNode=>{if(sectionNode)addClass(sectionNode,'guide-analysis-width');});

    /* Reorder only whole top-level analytical objects; charts, maps and evidence-bearing records remain the same nodes. */
    let campaignAnchor=summary;
    [boundary,tempo,strikeMap,physical,attacks,effect,posture,developments].filter(Boolean).forEach(sectionNode=>{
      campaignAnchor.after(sectionNode);
      campaignAnchor=sectionNode;
    });
    article.querySelectorAll('[data-reader-drilldown="event-constituents"] .section-note').forEach(n=>n.textContent='This is a count of recorded military events, not combat intensity or weapon quantity. Open a month to inspect the records behind the count.');
  }

  function facilities(article, context) {
    intro(article,'This is the authoritative reader view of current facility state. The four public colors come only from the accepted facility adjudication; all other tracked facilities remain neutral and unclassified.');
    article.querySelector('[data-reader-facility-dashboard]')?.remove();
    const all=[...records(context.model,'ledger.facilities'),...records(context.model,'gate3.facilities')], map=new Map();
    all.forEach(r=>{const id=r.facility_id||r.id||r.name;if(id)map.set(id,{...(map.get(id)||{}),...r,facility_id:id});});
    const accepted=facilityAdjudication(context);
    const stateFor=id=>{
      const row=accepted.classifiedById.get(id);
      const state=txt(row&&row.public_operational_state).toUpperCase();
      return Object.prototype.hasOwnProperty.call(FACILITY_PUBLIC_STATE,state)&&state!=='UNCLASSIFIED'?state:'UNCLASSIFIED';
    };
    const s=node(article.ownerDocument,'section','content-section reader-facility-dashboard');
    s.dataset.readerFacilityDashboard='accepted-four-state-adjudication';
    s.dataset.facilityStatusAuthority='analysis.facility_operational_status';
    add(s,'h2','','Current facility status');
    add(s,'p','lead-copy',`${map.size} named facilities are tracked in the current public record. Only facilities with an accepted four-state finding receive red, yellow, blue or green; every other tracked facility remains unclassified.`);
    const order=['RED','YELLOW','BLUE','GREEN','UNCLASSIFIED'], groups=new Map(order.map(k=>[k,[]]));
    map.forEach((r,id)=>groups.get(stateFor(id)).push([id,r]));
    const bar=add(s,'div','reader-facility-status-bar');
    bar.setAttribute('role','img');
    bar.setAttribute('aria-label',order.map(k=>`${FACILITY_PUBLIC_STATE[k][0]}: ${groups.get(k).length}`).join('; '));
    order.forEach(k=>{const n=groups.get(k).length;if(!n)return;const z=add(bar,'span',`reader-facility-segment ${FACILITY_PUBLIC_STATE[k][1]}`);z.style.width=`${map.size?n/map.size*100:0}%`;z.title=`${FACILITY_PUBLIC_STATE[k][0]}: ${n}`;});
    const legend=add(s,'div','reader-status-legend');
    order.forEach(k=>{const item=add(legend,'span',`reader-status-key ${FACILITY_PUBLIC_STATE[k][1]}`);add(item,'strong','',String(groups.get(k).length));item.append(article.ownerDocument.createTextNode(` ${FACILITY_PUBLIC_STATE[k][0]}`));});
    const panels=add(s,'div','reader-facility-panels');
    order.forEach(k=>{const rows=groups.get(k);if(!rows.length)return;const d=add(panels,'details',`reader-facility-drawer ${FACILITY_PUBLIC_STATE[k][1]}`);add(d,'summary','',`${FACILITY_PUBLIC_STATE[k][0]} (${rows.length})`);const list=add(d,'div','reader-facility-list');
      rows.sort((a,b)=>txt(a[1].name||a[0]).localeCompare(txt(b[1].name||b[0]))).forEach(([id,r])=>{
        const classified=accepted.classifiedById.get(id), unresolved=accepted.unclassifiedById.get(id);
        const c=add(list,'article','reader-facility-card');c.dataset.facilityId=id;c.dataset.facilityOperationalStatus=k;
        add(c,'h4','',txt(r.name||r.facility_name||id));
        add(c,'p','card-kicker',`Operational map state: ${FACILITY_PUBLIC_STATE[k][0]}`);
        const dates=[r.last_reviewed,r.assessment_date,r.date,...(r.damage_evidence_dates||[])].filter(Boolean).map(String).sort();if(dates.length)add(c,'p','card-kicker',`Evidence through ${dates.at(-1)}`);
        const basis=txt(classified&&classified.basis||unresolved&&unresolved.reason||'No accepted four-state classification is available for this facility.');
        add(c,'strong','',k==='UNCLASSIFIED'?'Why this remains unclassified':'Why this status is supported');add(c,'p','',basis);
        evidence(c,context,{...r,source_ids:[...new Set([...(r.source_ids||[]),...(classified&&classified.source_ids||[]),...(unresolved&&unresolved.source_ids||[])])]},'Evidence and sources');
      });
    });
    const m=article.querySelector(':scope > .context-map'); if(m) article.insertBefore(s,m); else article.querySelector('.page-intro')?.after(s);
    const full=article.querySelector('.reader-full-facility-records')||findSection(article,/^Facility assessments$/i); if(full) collapse(full,`Browse full facility records (${map.size})`);
  }

  function losses(article) {
    intro(article,'Casualties and equipment losses are separate. Some numbers are exact or minimum counts, but the evidence does not support one reliable equipment-loss total for the whole war.');
    addClass(article,'guide-migrated-page guide-phase1-losses');
    const s=section(article,'No single reliable total','There is no reliable single number covering every side and every kind of equipment loss. Only matching, non-duplicate physical counts are added. Claims, estimates, mixed categories and unknown quantities stay separate.');
    addClass(s,'guide-summary-strip');
    const g=add(s,'div','orientation-grid');
    card(g,'Known numbers','Exact sourced counts are added only when they describe the same kind of asset and loss status.','ADD LIKE WITH LIKE');
    card(g,'Unknown numbers','A loss event and an exact quantity are separate findings. When the number is unknown, it stays unknown.','KEEP UNKNOWN');
    card(g,'Actor claims','Reported target or loss counts stay claims unless separate evidence establishes the physical losses.','CLAIM ONLY');

    const material=findSection(article,/^Equipment$/i);
    if(material){
      addClass(material,'phase1-loss-accounting');
      const us=material.querySelector('[data-loss-side-group="us-coalition"]');
      const iran=material.querySelector('[data-loss-side-group="iran-aligned"]');
      if(us&&iran&&!material.querySelector('.phase1-loss-pair')){
        const pair=article.ownerDocument.createElement('div');
        pair.className='phase1-loss-pair';
        pair.dataset.lossComparison='paired-accounting';
        material.insertBefore(pair,us);
        pair.append(us,iran);
      }
      const sourceClassFilter=material.querySelector('select[data-loss-filter="class"]');
      if(sourceClassFilter&&!material.querySelector('[data-loss-category-compare]')){
        const compare=article.ownerDocument.createElement('div');
        compare.className='phase1-loss-compare';
        compare.dataset.lossCategoryCompare='shared-category';
        add(compare,'strong','','COMPARE ONE SHARED CATEGORY');
        add(compare,'p','section-note','Both military columns keep the same selected accounting category. Record state, quantity and evidence remain attached to each accepted record; no kill ratio or composite score is calculated.');
        const label=add(compare,'label','','Shared category');
        const select=add(label,'select','');
        [...sourceClassFilter.options].forEach(option=>{
          const copy=article.ownerDocument.createElement('option');
          copy.value=option.value;copy.textContent=option.textContent;select.append(copy);
        });
        select.addEventListener('change',()=>{sourceClassFilter.value=select.value;sourceClassFilter.dispatchEvent(new Event('change',{bubbles:true}));});
        sourceClassFilter.addEventListener('change',()=>{select.value=sourceClassFilter.value;});
        const physicalFilter=material.querySelector('select[data-loss-filter="physical"]');
        if(physicalFilter){
          const states=add(compare,'div','phase1-loss-state-key');
          states.setAttribute('aria-label','Recorded loss-state key');
          [...physicalFilter.options].filter(option=>option.value).forEach(option=>add(states,'span','phase1-loss-state',option.textContent));
        }
        const first=material.querySelector('.loss-controls');
        if(first) first.before(compare); else material.prepend(compare);
      }
      const boundary=add(material,'aside','scope-note phase1-loss-boundary');
      add(boundary,'strong','','ACCOUNTING · NOT SCORE');
      add(boundary,'p','','No kill ratio · no incompatible totals · unknown is never zero · category and denominator remain visible.');
    }

    const c=article.querySelector('[data-loss-comparison]');
    if(c){
      const h=c.querySelector('h2');if(h)h.textContent='Loss records by side and type';
      const n=c.querySelector('.section-note');if(n)n.textContent='These totals count loss records, not individual destroyed or damaged items when the quantity is unknown. Unknown quantities stay unknown. Open a category to see the records behind the total.';
      c.classList.add('secondary-context');
    }
  }

  function weapons(article) {
    intro(article,'Read weapons by incident: what was launched, what was intercepted or reached a target, and what damage followed. The evidence does not support one whole-war effectiveness percentage.');
    const s=section(article,'No single whole-war percentage','Launches, interceptions, penetrations, impacts and damage come from different incidents, sources and time periods. Those numbers are not one shared total.');
    card(s,'Sep. 8 Jordan-base attack','Jordan reported 20 ballistic missiles launched and 18 intercepted; it initially said two fell in unpopulated areas. Later U.S.-sourced reporting established real aircraft damage, so this is not a clean 18-of-20 interception-to-zero-hit chain.','EVENT-LEVEL CHAIN');
    const m=findSection(article,/^What counts mean$/i);if(m)collapse(m,'How weapon counts are kept compatible');
  }

  function imagery(article) {
    intro(article,'Start with what the imagery shows: the site, comparison date and visible physical change. Geolocation precision and interpretation limits come after the observation.');
    const m=[...article.querySelectorAll(':scope > section')].find(x=>/precision|tier|geolocat/i.test(x.querySelector('h2')?.textContent||''));if(m)collapse(m,'How map location accuracy works');
    const a=findSection(article,/claims about these facilities hold up|facility assessments/i);
    if(a){
      const h=a.querySelector(':scope > h2'); if(h) h.textContent='Facility claim evidence';
      add(a,'p','scope-note','These checks compare specific claims with imagery and reporting. The facility page shows the current operating status.');
      routeLink(a,'military.facilities','Open Bases & Infrastructure for authoritative current facility status');
    }
  }

  function hormuzOverview(article, context) {
    addClass(article,'guide-migrated-page guide-phase1-hormuz');
    const map=article.querySelector(':scope > [data-component="MapLibreView"], :scope > .context-map');
    if(map){
      addClass(map,'guide-phase1-primary-visual guide-hormuz-map');
      const strip=article.ownerDocument.createElement('div');
      strip.className='hormuz-context-strip guide-filter-rail';
      strip.dataset.hormuzContext='temporal-not-causal';
      const cutoff=context.model?.release?.current_osint_cutoff_display||context.model?.release?.current_osint_cutoff||'current accepted cutoff';
      const date=add(strip,'span','hormuz-basis','DATE BASIS · '+String(cutoff));
      add(strip,'span','hormuz-basis','SOURCE BASIS · accepted public record');
      const selected=add(strip,'span','hormuz-selection-state','SELECTION · full accepted context');
      const reset=add(strip,'button','action','RESET');
      reset.type='button';
      reset.addEventListener('click',()=>{
        if(typeof map._atlasReset==='function')map._atlasReset();
        selected.textContent='SELECTION · full accepted context';
      });
      map.addEventListener('guide:map-selection',event=>{
        const record=event.detail&&event.detail.record;
        const when=record&&(record.date||record.event_date||record.timeline?.date||record.event?.event_date);
        selected.textContent=when?`SELECTION · ${when} · shared accepted date context only`:'SELECTION · accepted record';
      });
      map.before(strip);
      const note=add(article,'aside','scope-note hormuz-temporal-note');
      add(note,'strong','','Cross-highlight = shared accepted context');
      add(note,'p','','Shared date or geography does not establish causation unless the underlying evidence does.');
      map.after(note);
    }
  }

  function shipping(article, context) {
    addClass(article, 'guide-migrated-page guide-shipping-page');
    intro(article,'Gulf export flows have recovered substantially, but Hormuz is not normalized. Selective passage constraints, tanker attacks, dark transits and extreme transport risk remain, while Saudi-backed forces report reversing much of the September Houthi coastal advance near Bab el-Mandeb.');

    const summary=section(article,'Current maritime picture','Tracked traffic, physical passage and commercial or legal acceptance are separate facts.');
    addClass(summary,'guide-summary-strip');
    const g=add(summary,'div','orientation-grid'), rows=records(context.model,'gate3.shipping');
    const h=card(g,'Hormuz: recovery without normalization','September Gulf oil flows excluding Iran averaged about 81% of pre-war levels, with crude and condensate around 91%. That export recovery is not the same as normal unrestricted Hormuz traffic: selective constraints, tanker incidents and abnormal risk remain.','RECOVERING / STILL CONSTRAINED');evidence(h,context,rows.find(r=>r.shipping_id==='SHIP-HORMUZ-KPLER-RECOVERY-20260929'));
    const b=card(g,'Bab el-Mandeb: battlefield control shifted','Saudi-backed forces report retaking most coastal areas around the strait and reaching Mocha, but Reuters could not independently verify the full extent and the Houthis dispute the losses. The battlefield change does not by itself establish closure of general commercial passage.','COUNTEROFFENSIVE / CONTESTED');evidence(b,context,rows.find(r=>r.shipping_id==='SHIP-BAB-EL-MANDEB-TRAFFIC-20260914'));
    const a=card(g,'Iran’s 77-vessel list','Iran announced possible fines, detention or confiscation and warned maritime service providers. External legal recognition, enforceability and insurer/P&I/classification-society compliance are not established.','IRANIAN ANNOUNCEMENT');evidence(a,context,rows.find(r=>r.shipping_id==='SHIP-IRAN-STRAIT-AUTHORITY-LIST-20260914'));

    const method=findSection(article,/^How to read the traffic observations$/i);
    const methodDetails=method?collapse(method,'How provider and AIS traffic data should be read'):null;
    if(methodDetails) markGuideSupport(methodDetails);

    const observed=markGuideSection(findSection(article,/^Observed shipping record$/i),'observed-shipping','01','Observed shipping');
    const routeMap=article.querySelector(':scope > [data-shipping-map-system]')||article.querySelector(':scope > .context-map');
    markGuideSection(routeMap,'routes','02','The routes');
    addClass(routeMap,'guide-structural-panel');
    const alternatives=markGuideSection(findSection(article,/^Alternative routes and trade changes$/i),'alternative-paths','03','Alternative paths');
    const merchant=markGuideSection(findSection(article,/^Merchant-vessel losses$/i),'merchant-losses','04','Merchant losses');

    if(observed){
      const list=observed.querySelector('.record-list'); if(list)addClass(list,'guide-dense-records');
    }
    if(merchant){
      const list=merchant.querySelector('.record-list'); if(list)addClass(list,'guide-dense-records');
    }
    [observed,alternatives,merchant].forEach(sectionNode=>{if(sectionNode)addClass(sectionNode,'guide-analysis-width');});

    /* Reorder only whole top-level analytical objects. The map instance, records, route geometry and controls remain untouched. */
    let anchor=summary;
    [methodDetails,observed,routeMap,alternatives,merchant].filter(Boolean).forEach(sectionNode=>{anchor.after(sectionNode);anchor=sectionNode;});
  }

  function economy(article, context) {
    intro(article,'Iran and the Gulf are under severe wartime economic pressure. The current picture comes from sanctions, trade and oil-flow evidence, damaged energy infrastructure, freight costs and shipping disruption—not one forecast chart.');
    const s=section(article,'Current economic condition','Sanctions and war disruption materially constrain Iran and raise regional energy and freight costs, while trade and production continue unevenly rather than stopping altogether.'),g=add(s,'div','orientation-grid');
    const p=card(g,'Iran’s own figure','President Masoud Pezeshkian acknowledged sanctions and war effects and reported roughly a 35% fall in foreign trade. The percentage comes from the Iranian president and is not an independently audited figure.','AUG. 28');evidence(p,context,{ source_ids: ['SRC-F550DDD51246','SRC-5D32C7182EFF'] });
    const er=records(context.model,'gate3.economics');
    const o=card(g,'Oil market','Brent settled Oct. 6 at $100.58 and WTI at $89.44. Strong Middle Eastern exports and emergency stock releases limited crude-supply pressure, but Saudi-Houthi escalation, shipping risk and refined-product tightness kept a substantial war-risk premium in the market.','OCT. 6 CLOSE');evidence(o,context,er.find(r=>r.economic_id==='ECON-GULF-ENERGY-RECOVERY-20260930'));
    const f=card(g,'Exports and logistics','Regional crude exports have recovered strongly, but freight, tanker security and refined-product conditions remain abnormal. Recovery in barrels moved is not the same as normalization of transport cost or risk.','RECOVERING / ABNORMAL');evidence(f,context,er.find(r=>r.economic_id==='ECON-GULF-ENERGY-RECOVERY-20260930'));
    card(g,'Saudi East-West pipeline','The line has restarted and is carrying material bypass volume. Saudi Arabia said 5.8 million barrels had been pumped by Oct. 6, and Reuters reported roughly 4 million bpd was being rerouted toward Yanbu; full rated capacity is not yet established.','DAMAGED / OPERATING');
    const fin=card(g,'Financial pressure','On Oct. 5, Treasury warned foreign financial institutions that continued transactions with sanctioned Iranian financial institutions could trigger U.S. measures without advance notice.','ENFORCEMENT PRESSURE');evidence(fin,context,{source_ids:['SRC-A2105A000019','SRC-A2105A00001A']});
    const forecast=findSection(article,/^2026 growth forecasts$|economic pressure: comparable snapshots|growth forecasts|comparable forecast/i);
    if(forecast){
      forecast.dataset.protectedEconomicChart='retained';
      addClass(forecast,'guide-protected-economic-chart guide-phase1-primary-visual');
      const badge=add(forecast,'p','card-kicker protected-chart-badge','PROTECTED BASELINE · existing calculation / series retained');
      forecast.insertBefore(badge,forecast.firstChild);
    }
    const compare=findSection(article,/^GCC and Iran: forecast changes$/i);
    const events=findSection(article,/^Recorded economic effects$/i);
    const modes=article.ownerDocument.createElement('div');
    modes.className='economic-mode-controls visualization-mode-controls';
    modes.setAttribute('role','group');
    modes.setAttribute('aria-label','Economic analytical views supported by the accepted read model');
    const mode=(label,target)=>{
      const button=add(modes,'button','visualization-mode-button',label);
      button.type='button';
      button.addEventListener('click',()=>target?.scrollIntoView?.({behavior:'smooth',block:'start'}));
      return button;
    };
    mode('PROTECTED BASELINE',forecast);
    if(compare)mode('COMPARE',compare);
    if(events)mode('EVENT CONTEXT',events);
    const introNode=article.querySelector('.page-intro');
    if(introNode)introNode.after(modes);else article.prepend(modes);
    const grammar=add(article,'aside','scope-note economic-causality-boundary');
    add(grammar,'strong','','Transmission grammar boundary');
    add(grammar,'p','','Observed findings and their existing causation notes remain separate. This read model does not authorize a synthetic mechanism → consequence chain, so none is inferred. Chronology is not causality; gaps remain gaps.');
  }

  function hormuzTalks(article) {
    intro(article,'Mediator exchanges continue, but there is still no signed U.S.-Iran agreement or Hormuz reopening arrangement. Iran says the U.S. response was relayed through mediators and that additional points remain unresolved.');
    const s=findSection(article,/^What is being negotiated now$/i),p=s?.querySelector('.lead-copy, p');if(p)p.textContent='Iran now ties reopening Hormuz to seven conditions based on the June Islamabad memorandum. Tehran says the U.S. response has been relayed through mediators, but additional points remain unresolved. No replacement agreement or reopening arrangement is in force.';
    if(s)add(s,'p','scope-note','Iran’s Foreign Ministry said on Oct. 4 that Tehran had not entered nuclear discussions with Washington. On Oct. 6, Vice President JD Vance said the U.S. was negotiating with President Masoud Pezeshkian and Foreign Minister Abbas Araqchi and would require a meaningful reduction in enrichment capacity for an agreement. The public descriptions differ; no agreement is in force.');
  }

  function diplomacy(article) {
    intro(article,'Diplomacy is shown as concrete changes: meetings held, meetings postponed, proposals made, exemptions denied, positions changed and agreements actually reached. Negotiating claims do not become agreements by repetition.');
    const c=article.querySelector('[data-diplomatic-state="current"]'),p=c?.querySelector('.lead-copy,p');if(p)p.textContent='The June MOU no longer controls either side. Mediated U.S.-Iran contacts continue, but Iran says additional points remain unresolved and no signed Hormuz reopening arrangement has replaced it.';
    const s=section(article,'Latest diplomatic changes','The latest record distinguishes active mediation from agreements that have actually taken effect.'),g=add(s,'div','orientation-grid');
    card(g,'U.S.–Iran / Hormuz contacts','Vice President JD Vance said the U.S. is negotiating with President Masoud Pezeshkian, Foreign Minister Abbas Araqchi and other Iranian political officials, but is uncertain how much decision authority they hold. He said an agreement would require a meaningful reduction in enrichment capacity. Iran had publicly described the channel differently. No replacement agreement is in force.','CONTACTS / NO AGREEMENT');
    card(g,'U.S.–Saudi defense diplomacy','Crown Prince Mohammed bin Salman met CENTCOM commander Adm. Brad Cooper in Jeddah on Sep. 14.','MEETING HELD');
    card(g,'Eslami / IAEA conference','A UN sanctions travel exemption for Mohammad Eslami was not approved after a U.S. objection. This is not a new general sanctions package.','EXEMPTION NOT APPROVED');
    card(g,'Israel–Lebanon talks','A U.S. official said Israel and Lebanon are expected to meet in Rome in October. That is an expected negotiation, not a completed meeting.','EXPECTED');
  }

  function mou(article) {
    intro(article,'The June MOU was an interim bargain. It is no longer in force and no final arrangement has replaced it; current Hormuz, nuclear and regional terms have to be negotiated anew.');
    const s=section(article,'What controls now?','The June MOU no longer controls either side. It remains the historical baseline for what each side previously accepted, obtained and failed to sustain, but it is not the current operating agreement.');routeLink(s,'hormuz.talks','See current Hormuz talks');routeLink(s,'talks.nuclear','See current nuclear talks');
  }

  function nuclear(article) {
    const s=section(article,'Latest nuclear-diplomacy development','Vice President JD Vance said on Oct. 6 that any agreement ending the war would require Iran to make a meaningful reduction in enrichment capacity and take concrete action rather than offer promises. He said the U.S. is negotiating with President Masoud Pezeshkian, Foreign Minister Abbas Araqchi and other political officials, while Washington remains uncertain how decisions are made inside Iran. Iran had said on Oct. 4 that it had not entered nuclear discussions with Washington. No nuclear settlement is established.');routeLink(s,'talks.overview','See wider diplomacy');
  }

  function regional(article) {
    intro(article,'Regional diplomacy is easiest to read through what actually changed—meetings held, proposals made, alignments tested and arrangements accepted or rejected. Participant lists and evidence about why those changes happened come afterward.');
    const introBlock=article.querySelector('.page-intro');
    if(introBlock)add(introBlock,'p','scope-note','The participant-state map identifies supporting states only; it does not identify capitals, headquarters, command nodes, deployments, or operating areas.');
    const r=findSection(article,/14-state maritime support|roster/i);if(r)collapse(r,'Regional participation and roster detail');
  }

  function objectives(article, context) {
    intro(article,'These are the goals each side publicly set, whether the current record shows they got them, and why. The two sides are shown together so the present result is easy to compare. A later, narrower goal does not erase an earlier unmet goal.');
    const sourceData=modelData(context.model,'analysis.endgame_us_objectives')||{}, corrections=modelData(context.model,'analysis.endgame_objective_corrections')||{}, currentPositionData=modelData(context.model,'analysis.iran_messaging')||{};
    const localPositionSources={...(sourceData.sources||{}),...(currentPositionData.sources||{})}; const publicSources=Array.isArray(context.model.sources&&context.model.sources.records)?context.model.sources.records:[];
    const resolvePositionSource=id=>{const local=localPositionSources[id]||{};const registered=publicSources.find(source=>local.url&&source.url===local.url)||{};return {...local,title:registered.title||local.title||local.publisher||id};};
    const sourceAttribution=id=>{const source=resolvePositionSource(id), haystack=txt(source.title)+' '+txt(source.supports)+' '+txt(source.quality); if(/Pezeshkian/i.test(haystack))return 'Masoud Pezeshkian — President of Iran'; if(/Aref/i.test(haystack))return 'Aref — Iranian vice president'; if(/STATE-MEDIA/i.test(haystack))return 'Iranian state media — stated strategic position'; return /FOREIGN MINISTRY|Foreign Ministry/i.test(haystack)?'Iranian Foreign Ministry':'Iranian public / official position';};
    const applyOverrides=(records,overrides)=>records.map(record=>{const correction=(overrides||[]).find(item=>objectiveKey(record.objective).includes(objectiveKey(item.match)));return correction?{...record,...correction,objective:record.objective}:record;});
    const accepted=[
      ...applyOverrides(sourceData.us_objectives||[],corrections.us_overrides||[]).map(record=>({...record,actor:'United States'})),
      ...applyOverrides(sourceData.iran_objectives||[],corrections.iran_overrides||[]).map(record=>({...record,actor:'Iran'}))
    ];
    const acceptedFor=(actor,goal)=>accepted.find(record=>record.actor===actor&&(objectiveKey(record.objective)===objectiveKey(goal)||objectiveKey(record.objective).includes(objectiveKey(goal))||objectiveKey(goal).includes(objectiveKey(record.objective))));
    const s=node(article.ownerDocument,'section','content-section objective-reader-results');s.dataset.publicObjectiveResults='true';add(s,'h2','','Goals and current results');
    add(s,'p','section-note','Status color summarizes the public result: gray is open, amber is failing or partial, green is achieved, and red is failed or abandoned. Sources behind the accepted evidence remain available on every card.');
    const legend=add(s,'div','objective-status-legend');[['not-yet','Open'],['partial','Failing / Partial'],['success','Achieved'],['failure','Failed / Abandoned']].forEach(([family,label])=>add(legend,'span',`objective-status objective-status-${family}`,label));
    const split=add(s,'div','objective-split-grid');
    ['United States','Iran'].forEach(actor=>{
      const g=add(split,'section','objective-actor-group');g.dataset.objectiveActor=actor==='United States'?'united-states':'iran';
      const heading=add(g,'h3','objective-actor-heading');heading.append(context.services.actorIdentity.create(context.documentObject,actor));
      const acceptedRows=accepted.filter(record=>record.actor===actor);
      const actorRows=acceptedRows.length?acceptedRows.map(record=>[actor,record.objective,record.status,record.assessment,record]):OBJECTIVES.filter(o=>o[0]===actor).map(row=>[...row,null]);
      const presentations=actorRows.map(row=>publicObjectivePresentation(actor,row[1],row[2],row[3]));
      const summaryCounts=presentations.reduce((acc,item)=>{const key=txt(item.label).toLowerCase();acc[key]=(acc[key]||0)+1;return acc;},{});
      const summary=add(g,'p','objective-actor-summary');
      summary.textContent=['achieved','partial','failing','open','failed','abandoned'].map(key=>summaryCounts[key]?`${summaryCounts[key]} ${key}`:'').filter(Boolean).join(' · ');
      if(actor==='Iran'){
        const walkbacks=(sourceData.iran_walkbacks||[]).slice();
        const original=walkbacks.find(item=>/ORIGINAL BENCHMARK/i.test(txt(item.type)));
        const downgrade=walkbacks.find(item=>/OBJECTIVE DOWNGRADE/i.test(txt(item.type)));
        const currentSeries=(currentPositionData.series||[]).find(item=>/return to talks|who must move first/i.test(txt(item.issue)))||(currentPositionData.series||[])[0]||null;
        const currentPosition=currentSeries&&currentSeries.shifted_to||null;
        const chain=add(g,'aside','objective-position-history'); chain.dataset.positionHistory='iran';
        add(chain,'h4','','Iran’s stated position — current to original');
        add(chain,'p','section-note','This runs backward from the current public position to the earlier position it replaced, then to the original war-end benchmark. The step label comes from the accepted record; a later position does not erase the earlier objective.');
        const list=add(chain,'ol','objective-position-chain');
        const addPositionSource=(host,id,fallbackDate,attribution)=>{const source=resolvePositionSource(id);if(!source.url)return;const meta=add(host,'p','objective-position-source');add(meta,'strong','',attribution||sourceAttribution(id));meta.append(context.documentObject.createTextNode(' · '+(source.date||fallbackDate||'')+' · '));const link=add(meta,'a','',source.title||source.publisher||id);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';};
        if(currentPosition){
          const item=add(list,'li','objective-position-step current'); item.dataset.positionStep='current';
          add(item,'span','objective-position-marker','Current position');
          add(item,'p','objective-position-copy',txt(currentPosition.text));
          (currentPosition.source_ids||[]).forEach(id=>addPositionSource(item,id,currentPosition.date,'Speaker not named in accepted record — Iranian public negotiating position'));
        }
        if(currentSeries&&currentSeries.said&&currentPosition){
          const item=add(list,'li','objective-position-step change'); item.dataset.positionStep=objectiveKey(currentSeries.assessment&&currentSeries.assessment.classification||currentSeries.status||'walkback');
          const acceptedLabel=txt(currentSeries.assessment&&currentSeries.assessment.classification||currentSeries.status||'Walkback').split('/')[0].trim();
          add(item,'span','objective-position-marker',acceptedLabel);
          const move=add(item,'p','objective-position-copy'); add(move,'strong','','Moved from: '); move.append(context.documentObject.createTextNode(txt(currentSeries.said.text)));
          const now=add(item,'p','objective-position-copy'); add(now,'strong','','To: '); now.append(context.documentObject.createTextNode(txt(currentPosition.text)));
          if(currentSeries.assessment&&currentSeries.assessment.text)add(item,'p','objective-position-why',txt(currentSeries.assessment.text));
          (currentSeries.said.source_ids||[]).forEach(id=>addPositionSource(item,id,currentSeries.said.date,txt(currentSeries.said.speaker)||'Iranian official position'));
          (currentPosition.source_ids||[]).forEach(id=>addPositionSource(item,id,currentPosition.date,'Speaker not named in accepted record — later Iranian public negotiating position'));
        }
        {
          const item=add(list,'li','objective-position-step change objective-position-reversal'); item.dataset.positionStep='june-mou-reversal';
          add(item,'span','objective-position-marker','Position reversal');
          const quote=add(item,'p','objective-position-copy'); add(quote,'strong','','July 18: '); quote.append(context.documentObject.createTextNode('Supreme Leader Mojtaba Khamenei said repeated U.S. breaches showed Trump’s signature on the June MOU was “worthless.”'));
          const source=add(item,'p','objective-position-source'); add(source,'strong','','Reuters · 2026-07-18 · '); const link=add(source,'a','','Iran’s supreme leader says U.S. breaches show Trump’s signature is worthless'); link.href='https://www.reuters.com/world/middle-east/irans-supreme-leader-says-us-breaches-show-trumps-signature-is-worthless-2026-07-18/'; link.target='_blank'; link.rel='noopener noreferrer';
          add(item,'p','objective-position-copy','After economic pressure intensified, Iranian officials repeatedly pressed to restore or reuse the June terms. By September, Foreign Minister Abbas Araqchi was again proposing Hormuz reopening if the United States took steps already contemplated in the June MOU.');
          const laterSource=add(item,'p','objective-position-source'); add(laterSource,'strong','','Reuters reporting · 2026-09-25 · '); const laterLink=add(laterSource,'a','','Araqchi says it is up to the U.S. to accept Iran’s seven-day plan'); laterLink.href='https://www.investing.com/news/commodities-news/irans-araqchi-says-now-up-to-us-to-accept-7day-plan-4918113'; laterLink.target='_blank'; laterLink.rel='noopener noreferrer';
        }
        if(downgrade){
          const item=add(list,'li','objective-position-step change'); item.dataset.positionStep=objectiveKey(downgrade.type);
          add(item,'span','objective-position-marker',txt(downgrade.type).replaceAll('_',' ').replace(/verified /i,''));
          const move=add(item,'p','objective-position-copy'); add(move,'strong','','Moved from: '); move.append(context.documentObject.createTextNode(txt(downgrade.from)));
          const now=add(item,'p','objective-position-copy'); add(now,'strong','','To: '); now.append(context.documentObject.createTextNode(txt(downgrade.to)));
          if(downgrade.assessment)add(item,'p','objective-position-why',txt(downgrade.assessment));
          (downgrade.source_ids||[]).forEach(id=>addPositionSource(item,id,downgrade.date));
        }
        if(original){
          const item=add(list,'li','objective-position-step original'); item.dataset.positionStep='original';
          add(item,'span','objective-position-marker','Original claim / objective');
          add(item,'p','objective-position-copy',txt(original.from));
          (original.source_ids||[]).forEach(id=>addPositionSource(item,id,original.date));
        }
      }
      const l=add(g,'div','objective-card-list');
      actorRows.forEach(row=>{
        const [side,goal,status,why,rowRecord]=row, acceptedRecord=rowRecord||acceptedFor(side,goal);
        const presentation=publicObjectivePresentation(side,goal,status,why), family=presentation.family, label=presentation.label;
        const c=add(l,'article','provenance-card objective-result');c.dataset.objectiveStatus=family;c.dataset.objectiveGoal=objectiveKey(goal);c.dataset.objectivePublicState=objectiveKey(presentation.status);
        const top=add(c,'div','objective-card-head');add(top,'span',`objective-status objective-status-${family}`,label);add(top,'span','objective-finding-detail',txt(presentation.status).replaceAll('_',' '));
        add(c,'h4','',presentation.goal);
        if(acceptedRecord&&acceptedRecord.origin){const origin=add(c,'p','objective-origin');add(origin,'strong','','Originally stated as: ');origin.append(context.documentObject.createTextNode?context.documentObject.createTextNode(txt(acceptedRecord.origin)):node(context.documentObject,'span','',txt(acceptedRecord.origin)));}
        add(c,'strong','','Why / what changed');add(c,'p','',presentation.why);
        if(acceptedRecord) evidence(c,context,acceptedRecord,'Objective record & sources',sourceData.sources||{});
      });
    });
    article.querySelector('.page-intro')?.after(s);
    for(const [pattern,label] of [[/^Original and wartime objectives$/i,'Supporting goal evidence'],[/^Negotiating demands and later changes$/i,'Full position-change record'],[/^Outcomes by level$/i,'Wider outcome evidence']]){const x=findSection(article,pattern);if(x)collapse(x,label);}
  }

  function positions(article) {
    intro(article,'This is the before-and-after record of negotiating positions: what each side demanded earlier, what changed, and what it later accepted, proposed or did. Goal results are shown separately.');
    const m=findSection(article,/^What changed$/i);if(m)collapse(m,'Messaging context related to these position changes');
  }

  function iranMessaging(stage, article) {
    intro(article,'This page follows Iranian rhetoric, threats, contradictions and narrative changes over time. It does not duplicate the objective scorecard or treat every changed phrase as a policy concession.');
  }

  function claimChecks(article) {
    article.querySelectorAll('.unresolved-box').forEach(b=>{if(![...b.querySelectorAll('li')].some(li=>txt(li.textContent)))b.remove();});
    article.classList.add('guide-claim-checks-page','guide-forensics-page');
    const cases=[...article.querySelectorAll(':scope > .claim-case')];
    cases.forEach((section,index)=>{
      section.classList.add('guide-forensic-record');
      section.dataset.guideRecord=String(index+1).padStart(2,'0');
    });
    if(cases[0]){
      cases[0].dataset.guideSection='claim-checks';
      cases[0].id='claim-checks';
    }
  }

  function sourceLibrary(article) {
    article.classList.add('guide-source-library-page','guide-collection-page');
    const sourceContext=findSection(article,/^How source context works$/i);
    if(sourceContext){
      sourceContext.classList.add('guide-source-context');
      sourceContext.dataset.guideSection='source-context';
      sourceContext.id='source-context';
    }
    const controls=article.querySelector(':scope > .source-controls');
    if(controls){
      controls.classList.add('guide-filter-rail');
      controls.dataset.guideSection='browse-sources';
      controls.id='browse-sources';
    }
    article.querySelector(':scope > .source-directory')?.classList.add('guide-dense-directory');
  }

  function information(stage, article, route) {
    intro(article,'Documented false claims, misleading claims and lies, with the evidence behind each finding.');
    if(route?.params?.case) return;
    addClass(article,'guide-migrated-page guide-collection-page guide-lie-ledger-collection');
    const ledger=article.querySelector(':scope > .reader-lie-ledger');
    if(ledger){
      ledger.dataset.guideSection='ledger-cases';
      ledger.id='ledger-cases';
      addClass(ledger,'guide-collection-group');
    }
    addClass(article.querySelector('.reader-ledger-controls'),'guide-filter-rail');
    article.querySelectorAll('.reader-ledger-chain-card').forEach(card=>addClass(card,'guide-collection-record'));
  }

  function webOfLiesCollection(article, route) {
    if(route?.params?.dossier === 'actor') return;
    addClass(article,'guide-migrated-page guide-collection-page guide-wol-collection');
    const network=findSection(article,/^Web of Lies network$|^Explore the connection web$/i);
    if(network){
      network.dataset.guideSection='wol-network';
      network.id='wol-network';
      addClass(network,'guide-structural-panel');
    }
    const hall=findSection(article,/Hall of Shame|Bullshitter awardees/i);
    if(hall){
      hall.dataset.guideSection='hall-of-shame';
      hall.id='hall-of-shame';
      addClass(hall,'guide-collection-group');
    }
    const trails=findSection(article,/^Claim trails$/i);
    if(trails){
      trails.dataset.guideSection='claim-trails';
      trails.id='claim-trails';
      addClass(trails,'guide-collection-group');
    }
    article.querySelectorAll('.wol-hall-grid,.wol-family-list,.wol-source-events').forEach(list=>addClass(list,'guide-dense-directory'));
    addClass(article.querySelector('.wol-semantic-legend'),'guide-status-key');
    const graph=article.querySelector('.wol-cytoscape-host');
    if(graph)graph.dataset.layoutSemantics='presentation-only';
  }

  function archive(article) {
    addClass(article,'guide-migrated-page guide-collection-page guide-archive-page');
    const editions=findSection(article,/^Archived editions$/i);
    if(editions){
      editions.dataset.guideSection='archived-editions';
      editions.id='archived-editions';
      addClass(editions,'guide-collection-group');
      addClass(editions.querySelector('.record-list'),'guide-dense-directory');
    }
  }

  function finalizePublicProduct(stage, route, routeRuntime, doc) {
    const article=stage.querySelector('.public-page');if(!article||!route)return;article.dataset.publicProduct=PRODUCT_VERSION;const context=accessContext(routeRuntime,route,doc);
    const k=route.key;
    if(k==='start.overview')overview(article,context); if(k==='start.actors')actors(article); if(k==='timeline.war')timeline(article,context); if(k==='timeline.chronology')chronology(article);
    if(k==='military.campaigns')campaigns(article); if(k==='military.facilities')facilities(article,context); if(k==='military.losses')losses(article); if(k==='military.weapons')weapons(article); if(k==='military.imagery')imagery(article);
    if(k==='hormuz.overview')hormuzOverview(article,context); if(k==='hormuz.shipping')shipping(article,context); if(k==='hormuz.economy')economy(article,context); if(k==='hormuz.talks')hormuzTalks(article);
    if(k==='talks.overview')diplomacy(article); if(k==='talks.mou')mou(article); if(k==='talks.nuclear')nuclear(article); if(k==='talks.regional')regional(article);
    if(k==='objectives.outcomes')objectives(article,context); if(k==='objectives.positions')positions(article); if(k==='objectives.iran')iranMessaging(stage,article);
    if(k==='evidence.claims')claimChecks(article); if(k==='evidence.information')information(stage,article,route); if(k==='evidence.web_of_lies')webOfLiesCollection(article,route); if(k==='evidence.sources')sourceLibrary(article); if(k==='evidence.archive')archive(article);
    connectMappedCards(article,k);
  }

  function connectMappedCards(article, routeKey) {
    if (['start.overview','evidence.information','evidence.web_of_lies'].includes(routeKey)) return;
    const maps=[...article.querySelectorAll('.context-map')].filter(map=>typeof map._atlasHasRecord==='function'&&typeof map._atlasFocusRecord==='function');
    if(!maps.length)return;
    const cards=[...article.querySelectorAll('[data-facility-id],[data-loss-id],[data-damage-observation-id],[data-casualty-id],[data-movement-id],[data-strike-effect-id]')];
    cards.forEach(card=>{
      const key=card.dataset.facilityId||card.dataset.lossId||card.dataset.damageObservationId||card.dataset.casualtyId||card.dataset.movementId||card.dataset.strikeEffectId;
      if(!key)return;
      const map=maps.find(candidate=>candidate._atlasHasRecord(key));if(!map)return;
      let actions=card.querySelector(':scope > .record-actions');if(!actions)actions=add(card,'div','record-actions');
      if(actions.querySelector?.('[data-map-record-link]'))return;
      const button=add(actions,'button','inline-map-link','Show on map');button.type='button';button.dataset.mapRecordLink=key;
      button.addEventListener('click',()=>{map.scrollIntoView?.({behavior:'smooth',block:'start'});map._atlasFocusRecord(key);});
    });
  }

  function quiesceMaps(node) {
    if (!node || typeof node.querySelectorAll !== 'function') return;
    [node, ...node.querySelectorAll('*')].forEach(candidate => {
      const map = candidate && (candidate._atlasMapLibre || candidate._atlasMap);
      if (map) {
        if (typeof map.stop === 'function') try { map.stop(); } catch (_) {}
        if (map._animatingZoom) map._animatingZoom = false;
      }
      const chart = candidate && candidate._atlasChart;
      if (chart && typeof chart.resize === 'function') try { chart.resize(); } catch (_) {}
    });
  }
  function removeMaps(node) {
    if (!node || typeof node.querySelectorAll !== 'function') return;
    [node, ...node.querySelectorAll('*')].forEach(candidate => {
      const map=candidate&&(candidate._atlasMapLibre||candidate._atlasMap);if(map&&typeof map.remove==='function')try{map.remove();}catch(_){}
      const chart=candidate&&candidate._atlasChart;if(chart&&typeof chart.dispose==='function')try{chart.dispose();}catch(_){}
    });
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
  function validateFinalizedStage(stage, readerSupportRuntime) {
    const app=stage.querySelector?.('.atlas-app'),article=stage.querySelector?.('.public-page'),heading=article?.querySelector?.('h1');
    invariant(app&&article&&heading,'READER_FINALIZATION_INCOMPLETE','The staged route is missing the qualified reader shell.');
    invariant(article.dataset&&article.dataset.readerLayer===readerSupportRuntime.READER_SUPPORT_VERSION,'READER_PROJECTION_MISSING','The staged route did not complete reader projection.');
    invariant(!INTERNAL_TEXT.test(String(stage.innerText||stage.textContent||'')),'READER_INTERNAL_LEAK','The staged route contains internal review text.');
    return {app,article,heading};
  }
  const copyRouteState=(target,staged)=>['routeKey','pageOwner','primarySection','secondaryPage'].forEach(k=>{target[k]=staged[k];});
  function emitRouteFailure(win,state,error){state.readerError={code:error.code||'READER_FINALIZATION_FAILED'};root.console?.error?.('Atlas reader route finalization failed',error);if(win?.CustomEvent&&win.dispatchEvent)win.dispatchEvent(new win.CustomEvent('atlasreadererror',{detail:{code:state.readerError.code}}));}

  function revealRailItem(link) {
    const rail = link?.closest?.('nav');
    if (!rail || !link) return;
    const left = Number(link.offsetLeft);
    const width = Number(link.offsetWidth);
    const railWidth = Number(rail.clientWidth);
    if (![left, width, railWidth].every(Number.isFinite) || railWidth <= 0) return;
    const target = Math.max(0, left - Math.max(0, railWidth - width) / 2);
    if (typeof rail.scrollTo === 'function') rail.scrollTo({ left: target, behavior: 'auto' });
    else rail.scrollLeft = target;
  }

  function revealCurrentNavigation(app) {
    app?.querySelectorAll?.('.primary-nav a[aria-current="page"], .context-route[aria-current="page"]').forEach(revealRailItem);
  }

  function activateGuideSections(app, route, win) {
    const definitions = typeof base.pageSectionsFor === 'function' ? base.pageSectionsFor(route) : [];
    if (!definitions.length) return () => {};
    const links = [...app.querySelectorAll('[data-section-id]')];
    const setActive = id => {
      let activeLink = null;
      links.forEach(link => {
        const active = link.dataset.sectionId === id;
        if (active) { link.setAttribute('aria-current', 'location'); activeLink = link; }
        else if (link.getAttribute?.('aria-current') === 'location') link.removeAttribute?.('aria-current');
      });
      if (activeLink) revealRailItem(activeLink);
    };
    const requested = definitions.find(item => item.id === route.params?.section);
    if (requested) {
      setActive(requested.id);
      const target = app.querySelector(`[data-guide-section="${requested.id}"]`);
      target?.scrollIntoView?.({ block: 'start' });
    }
    if (typeof win?.IntersectionObserver !== 'function') return () => {};
    const defaultSectionId = definitions[0]?.id || '';
    let activeId = requested?.id || null;
    let sectionParam = route.params?.section || '';
    const observer = new win.IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((left, right) => Math.abs(left.boundingClientRect?.top || 0) - Math.abs(right.boundingClientRect?.top || 0));
      const id = visible[0]?.target?.dataset?.guideSection;
      if (!id || id === activeId) return;
      activeId = id;
      setActive(id);
      if (id === defaultSectionId) {
        if (!sectionParam) return;
        const params = { ...(route.params || {}) };
        delete params.section;
        sectionParam = '';
        win.history?.replaceState?.(null, '', base.routeHref(route.key, params));
        return;
      }
      if (sectionParam === id) return;
      const params = { ...(route.params || {}), section: id };
      sectionParam = id;
      win.history?.replaceState?.(null, '', base.routeHref(route.key, params));
    }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.01] });
    definitions.forEach(definition => {
      const target = app.querySelector(`[data-guide-section="${definition.id}"]`);
      if (target) observer.observe(target);
    });
    return () => observer.disconnect();
  }

  function mount(options) {
    const settings=options||{},doc=settings.documentObject||root.document,win=settings.windowObject||root,rootElement=settings.rootElement,routeRuntime=settings.routeRuntime,state=settings.state||{};
    const baseRuntime=settings.baseRuntime||base,readerSupportRuntime=settings.readerSupportRuntime||readerSupport;
    invariant(doc&&rootElement&&routeRuntime&&typeof routeRuntime.forRoute==='function','READER_REGISTRY_INVALID','Reader registry requires a document, root element, and guarded route runtime.');
    invariant(baseRuntime&&typeof baseRuntime.parseRoute==='function'&&baseRuntime.AppShell&&baseRuntime.PublicNavigation&&baseRuntime.PAGE_OWNERS,'READER_BASE_SUPPORT_UNAVAILABLE','Reader render primitives are unavailable.');
    invariant(readerSupportRuntime&&typeof readerSupportRuntime.projectShell==='function'&&readerSupportRuntime.READER_SUPPORT_VERSION,'READER_SUPPORT_UNAVAILABLE','Reader projection support is unavailable.');
    rootElement.__atlasRouteController?.destroy?.();
    let destroyed=false,previousRouteKey=null,currentServices=null,disposeSectionTracking=()=>{};
    const stageRoute=(focusHeading,propagateFailure=false)=>{
      invariant(!destroyed,'READER_REGISTRY_DESTROYED','Reader registry is no longer active.');
      const previousTitle=doc.title,previousVisible=Array.from(rootElement.children||[]).filter(n=>!n.dataset?.atlasReaderStaging),hasQualified=rootElement.dataset?.status==='ready'&&previousVisible.length>0,stagedState={...state},stage=createStagingHost(doc,rootElement,win);
      try {
        const route=baseRuntime.parseRoute(win.location&&win.location.hash),access=routeRuntime.forRoute(route),context={documentObject:doc,windowObject:win,model:access.model,services:access.services,state:stagedState,route};
        currentServices=access.services;
        if(!route.canonical&&win.history&&win.location)win.history.replaceState(null,'',baseRuntime.routeHref(route.key,route.params));
        const shell=baseRuntime.AppShell.create(doc);stage.replaceChildren(shell.app);
        shell.primaryHost.replaceChildren(baseRuntime.PublicNavigation.renderPrimary(doc,route));
        shell.contextHost.replaceChildren(baseRuntime.PublicNavigation.renderContext(doc,route));
        const contents=baseRuntime.PublicNavigation.renderContentsRail(doc,route);
        shell.contentsHost.replaceChildren(...(contents?[contents]:[]));
        const owner=baseRuntime.PAGE_OWNERS[route.owner];invariant(typeof owner==='function','READER_PAGE_OWNER_MISSING',`Reader page owner is unavailable: ${route.owner}`);
        const page=owner(context);shell.main.replaceChildren(page);
        shell.footer.replaceChildren();add(shell.footer,'span','',`Evidence current through ${access.model?.release?.current_osint_cutoff_display||access.model?.release?.current_osint_cutoff||'the latest evidence date'}. `);
        const archive=add(shell.footer,'a','','Archive');archive.href=baseRuntime.routeHref('evidence.archive');
        stagedState.routeKey=route.key;stagedState.pageOwner=route.owner;stagedState.primarySection=route.primaryLabel;stagedState.secondaryPage=route.label;doc.title=`${route.title} · The 2026 Iran War Guide`;
        readerSupportRuntime.projectShell(shell.app,context);
        finalizePublicProduct(stage,route,routeRuntime,doc);
        const finalized=validateFinalizedStage(stage,readerSupportRuntime);finalized.app.dataset.readerAuthority=VERSION;finalized.app.dataset.routeKey=route.key;finalized.app.dataset.layoutScope=PROTECTED_LAYOUT_ROUTES.has(route.key)?'protected':'adaptive-wide';
        previousVisible.forEach(quiesceMaps);disposeSectionTracking();rootElement.replaceChildren(finalized.app);retireVisibleNodes(doc,rootElement,previousVisible);stage.remove();
        rootElement.className='atlas-ready';rootElement.dataset.status='ready';rootElement.setAttribute('aria-busy','false');copyRouteState(state,stagedState);delete state.readerError;
        revealCurrentNavigation(finalized.app);
        disposeSectionTracking=activateGuideSections(finalized.app,route,win);
        if(focusHeading&&previousRouteKey&&previousRouteKey!==route.key)finalized.heading.focus?.();previousRouteKey=route.key;return route;
      } catch(error) {
        stage.remove();doc.title=previousTitle;
        const failure=error instanceof ReaderRegistryError?error:new ReaderRegistryError(error?.code||'READER_FINALIZATION_FAILED','Reader rendering or finalization failed.',error);
        if(hasQualified){emitRouteFailure(win,state,failure);if(propagateFailure)throw failure;return null;} root.console?.error?.('Atlas initial reader finalization failed', failure, failure.cause || error); throw failure;
      }
    };
    const onHashChange=()=>stageRoute(true,false);win?.addEventListener?.('hashchange',onHashChange);let initialRoute;
    try{initialRoute=stageRoute(false,false);}catch(error){win?.removeEventListener?.('hashchange',onHashChange);throw error;}
    const controller=Object.freeze({render:()=>stageRoute(false,true),current:()=>baseRuntime.parseRoute(win.location&&win.location.hash),services:()=>currentServices,destroy:()=>{destroyed=true;disposeSectionTracking();win?.removeEventListener?.('hashchange',onHashChange);},initialRoute});
    rootElement.__atlasRouteController=controller;return controller;
  }

  return Object.freeze({...base,mount,READER_REGISTRY_VERSION:VERSION,ReaderRegistryError,validateFinalizedStage});
}));
