from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / 'js/public-ia.js'
CSS = ROOT / 'css/public-shell.css'
VALIDATE = ROOT / '.github/workflows/validate.yml'
HUMANIZE = ROOT / '.github/workflows/validate-source-humanization.yml'
RENDER = ROOT / 'tests/browser-public-render-review.js'
STATIC_TEST = ROOT / 'tests/public-final-polish.test.js'
BROWSER_TEST = ROOT / 'tests/browser-public-final-polish.js'


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing replacement anchor: {label}')
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')
    return updated

js = JS.read_text(encoding='utf-8')
if 'Final polish semantic state notices' in js:
    raise SystemExit('final polish patch already applied')

metric_anchor = """  function addMetric(host, value, label, note) {
    const card = append(host, 'article', 'metric-card');
    append(card, 'strong', '', value); append(card, 'span', '', label); if (note) append(card, 'small', '', note); return card;
  }
"""
metric_replacement = metric_anchor + """

  // Final polish semantic state notices: reader meaning first, accounting detail second.
  const STATE_NOTICE_TITLES = Object.freeze({
    'no-applicable-records': 'No applicable records',
    'no-geolocated-records': 'No geolocated records in this view',
    unresolved: 'Unresolved',
    'partial-evidence': 'Partial evidence',
    'insufficient-evidence': 'Insufficient evidence',
    'dependency-unavailable': 'Data dependency unavailable',
    'methodology-boundary': 'Methodology boundary'
  });

  function createStateNotice(context, options) {
    const settings = options || {}; const variant = settings.variant || 'methodology-boundary';
    const notice = element(context.documentObject, 'aside', `state-notice state-notice-${variant}`);
    notice.dataset.stateNotice = variant;
    append(notice, 'strong', 'state-notice-title', settings.title || STATE_NOTICE_TITLES[variant] || 'Evidence state');
    if (settings.message) append(notice, 'p', 'state-notice-message', settings.message);
    if (settings.accounting) append(notice, 'p', 'state-notice-accounting', settings.accounting);
    return notice;
  }

  function addOrientationCard(host, context, options) {
    const settings = options || {};
    const card = addProvenanceCard(host, context, {
      kicker: settings.kicker || settings.domain,
      title: settings.title,
      text: settings.text,
      meta: settings.meta,
      item: settings.item || {},
      relatedRecords: settings.relatedRecords || [],
      localSources: settings.localSources || {}
    });
    card.classList.add('orientation-card');
    card.dataset.orientationDomain = String(settings.domain || '').toLowerCase();
    if (settings.route) {
      const actions = append(card, 'div', 'record-actions orientation-actions');
      const link = append(actions, 'a', 'inline-route-link', settings.linkLabel || `Explore ${settings.domain}`);
      link.href = routeHref(settings.route);
    }
    return card;
  }
"""
js = replace_once(js, metric_anchor, metric_replacement, 'state notice/orientation helpers')

clock_pattern = r"  function addEvidenceClocks\(article, context\) \{.*?\n\}\n\n  function appendDefinition"
clock_replacement = """  function addEvidenceClocks(article, context) {
  const release = context.model && context.model.release || {};
  if (!release.gate2_evidence_cutoff || !release.current_osint_cutoff) return;
  const intro = article.querySelector('.page-intro');
  if (!intro) return;
  const clocks = element(context.documentObject, 'section', 'evidence-clocks evidence-clock-bar');
  clocks.dataset.component = 'EvidenceClocks';
  clocks.setAttribute('aria-label', 'Evidence cutoffs');
  const addClock = (host, className, label, value, shortExplanation, helpLabel, helpText) => {
    const item = append(host, 'article', `evidence-clock-item ${className}`);
    const summary = append(item, 'div', 'evidence-clock-summary');
    append(summary, 'strong', '', label);
    const time = append(summary, 'time', '', formatEvidenceClock(value)); time.dateTime = value;
    const help = append(item, 'details', 'evidence-clock-help'); append(help, 'summary', '', helpLabel); append(help, 'p', '', shortExplanation); append(help, 'p', '', helpText);
    return item;
  };
  const frozenArgs = ['frozen-evidence-clock', 'Frozen review cutoff', release.gate2_evidence_cutoff, 'Historical evaluation uses only evidence available by this time.', 'Why frozen?', "This is the fixed evidence boundary used for the historical Gate 2 review. Evidence incorporated later can strengthen or revise the current Atlas record, but it does not rewrite what was available for the frozen evaluation."];
  const currentArgs = ['current-evidence-clock', 'Current evidence cutoff', release.current_osint_cutoff, 'Current Atlas evidence includes material incorporated through this time.', 'How current works', 'This cutoff advances when new evidence is incorporated. It does not reopen or retroactively alter a frozen historical evaluation.'];
  const desktop = append(clocks, 'div', 'evidence-clock-desktop');
  addClock(desktop, ...frozenArgs); addClock(desktop, ...currentArgs);
  const mobile = append(clocks, 'details', 'evidence-clock-mobile');
  const mobileSummary = append(mobile, 'summary', 'evidence-clock-mobile-summary');
  append(mobileSummary, 'span', 'evidence-clock-mobile-text', `Evidence through ${formatEvidenceClock(release.current_osint_cutoff)} · Historical review ${formatEvidenceClock(release.gate2_evidence_cutoff)}`);
  append(mobileSummary, 'span', 'evidence-clock-mobile-action', 'Details');
  const mobileBody = append(mobile, 'div', 'evidence-clock-mobile-body');
  addClock(mobileBody, ...currentArgs); addClock(mobileBody, ...frozenArgs);
  const startState = context.route.key === 'start.overview' ? article.querySelector('[data-current-state-summary]') : null;
  (startState || intro).after(clocks);
}

  function appendDefinition"""
js = sub_once(js, clock_pattern, clock_replacement, 'Evidence Clock treatment')

overview_pattern = r"  function OverviewPage\(context\) \{.*?\n  \}\n\n  const ACTOR_DIRECTORY_PINNED"
overview_replacement = """  function OverviewPage(context) {
    const frame = pageFrame(context, 'The conflict began with U.S. and Israeli strikes on Iran on February 28, 2026. Iran retaliated across the region, and the war developed into a sustained military, maritime, economic and diplomatic confrontation.');
    frame.article.classList.add('overview-page');
    const domains = recordArray(modelData(context.model, 'ledger.domain_assessments'));
    const force = domains.find(domain => domain.domain === 'Force preservation') || domains.find(domain => /Air \/ long-range strike/i.test(domain.domain || ''));
    const maritime = domains.find(domain => /Maritime control/i.test(domain.domain || ''));
    const firstWar = context.model.chronology.find(item => String(item.timeline && item.timeline.date || item.event && item.event.event_date || '') >= '2026-02-28');
    const economyRecords = recordArray(modelData(context.model, 'gate3.economics'));
    const economyCurrent = economyRecords.slice().reverse().find(record => /crude|foreign|import|economic/i.test(JSON.stringify(record))) || economyRecords[economyRecords.length - 1] || {};
    const shippingRecords = recordArray(modelData(context.model, 'gate3.shipping'));
    const shippingCurrent = shippingRecords[shippingRecords.length - 1] || {};
    const publicView = modelData(context.model, 'analysis.endgame_public_view') || {};
    const mouNow = publicView.mou_now || {};
    const diplomaticEvents = context.model.chronology.filter(item => /(DIPLOMATIC|TALK|NEGOTIAT|MEDIAT|DEESCALAT)/.test(eventType(item))).slice(-4);
    const hormuzEnvelope = { ...shippingCurrent, source_ids: Array.from(new Set([...sourceIdsFrom(shippingCurrent), ...sourceIdsFrom(maritime)])) };
    const diplomacyEnvelope = { ...mouNow, source_ids: Array.from(new Set([...sourceIdsFrom(mouNow), ...diplomaticEvents.flatMap(sourceIdsFrom)])) };

    const now = addSection(frame.article, 'Where things stand now', 'content-section current-state-summary');
    now.dataset.currentStateSummary = 'four-domain';
    const nowGrid = append(now, 'div', 'story-grid current-state-grid');
    addOrientationCard(nowGrid, context, {
      domain: 'Military', title: 'U.S. strike capacity remained intact; Iran retained disruptive capability',
      text: publicNarrative(force && force.assessment, 'The reviewed record supports a U.S./coalition force-preservation advantage while Iran retains consequential strike and maritime capabilities.'),
      meta: force && `Confidence: ${displayTerm(force.confidence)}`, item: force || {}, relatedRecords: force && force.supporting_evidence || [],
      route: 'military.campaigns', linkLabel: 'Explore Campaigns & Strikes'
    });
    addOrientationCard(nowGrid, context, {
      domain: 'Hormuz', title: 'The Strait remains physically traversable but commercially contested',
      text: 'Iran retains leverage, but recognized exclusive control is not established. A reported formula that could drop compulsory tolls while retaining legitimate service charges remained a proposal at the cutoff.',
      meta: maritime && `Confidence: ${displayTerm(maritime.confidence)}`, item: hormuzEnvelope,
      relatedRecords: maritime && [...asArray(maritime.supporting_evidence), ...asArray(maritime.contrary_evidence)] || [],
      route: 'hormuz.overview', linkLabel: 'Explore Why Hormuz Matters'
    });
    addOrientationCard(nowGrid, context, {
      domain: 'Economy', title: 'Economic pressure on Iran is severe; regime collapse is not established',
      text: 'Severe crude-export contraction and deeper foreign-exchange and import pressure are established. Shortage concerns and unrest risk increased as blockade and sanctions effects accumulated.',
      item: economyCurrent, relatedRecords: relatedRecordsFrom(economyCurrent), route: 'hormuz.economy', linkLabel: 'Explore Oil & Economic Effects'
    });
    addOrientationCard(nowGrid, context, {
      domain: 'Diplomacy', title: 'The June MOU no longer controls either side, but talks remain active',
      text: 'Washington called it over and Iran later called it suspended. No final deal replaced it, while U.S.–Iran and regional de-escalation contacts continued at the cutoff.',
      item: diplomacyEnvelope, localSources: localSourceMap(publicView), relatedRecords: diplomaticEvents.map(item => item.event_id).filter(Boolean),
      route: 'talks.overview', linkLabel: 'Explore Talks & Agreements'
    });

    const whatHappened = addSection(frame.article, 'How the conflict opened', 'content-section lead-story historical-orientation');
    append(whatHappened, 'p', 'lead-copy', publicNarrative(firstWar && firstWar.event && firstWar.event.observed_fact, 'The United States and Israel opened strikes on Iran, and Iran retaliated against Israel and regional bases hosting U.S. forces.'));
    if (firstWar) whatHappened.append(EvidenceDrawer.create(context, firstWar));

    const theaterRecords = mappedChronology(context.model.chronology, context.services.locationResolver).filter(item => { const point = pointFromRecord(item, context.services.locationResolver); return point && point.lat >= 8 && point.lat <= 42 && point.lon >= 28 && point.lon <= 70; });
    const theaterMap = MapView.create(context, { title: 'Where the conflict extends', records: theaterRecords, fallbackViewport: [[11, 32], [40.5, 67.5]], maxZoom: 5, description: `This map shows ${theaterRecords.length.toLocaleString()} recorded events whose locations can be placed with reasonable confidence across the Iran–Gulf–Levant–Red Sea theater. Multiple events at the same location may be grouped; records without reliable coordinates remain in the chronology.` });
    theaterMap.classList.add('overview-theater-map'); theaterMap.dataset.selectionRule = 'accepted-chronology-with-supported-coordinate-in-broad-theater'; frame.article.append(theaterMap);

    const developments = addSection(frame.article, 'Latest in the record');
    append(developments, 'p', 'section-note', 'These are the latest dated developments, not a claim that every one changed the conflict by the same amount.');
    const developmentList = append(developments, 'div', 'record-list compact-record-list'); context.model.chronology.slice(-3).reverse().forEach(item => renderEventCard(developmentList, item, context, { topic: eventTopic(item) }));

    const record = addSection(frame.article, 'About the record');
    append(record, 'p', '', 'Counts describe the evidence collection; they are not a score of who is winning.');
    const metrics = append(record, 'div', 'metric-grid');
    addMetric(metrics, formatNumber(context.model.counts.chronology_records), 'dated chronology records', 'From pre-war context through the current cutoff.');
    addMetric(metrics, formatNumber(context.model.counts.canonical_source_records), 'source records', 'Conflicting source versions are preserved separately.');
    addMetric(metrics, readableDate(firstWar && firstWar.timeline && firstWar.timeline.date), 'war began', 'The opening event remains linked to its source record.');
    addMetric(metrics, context.model.release.current_osint_cutoff_display, 'evidence reviewed through', 'Later information is not backdated into earlier knowledge states.');

    const gate3Gaps = recordArray(modelData(context.model, 'gate3.gaps')); const migrationBoundaryGaps = recordArray(modelData(context.model, 'ledger.unresolved'));
    const unresolved = addSection(frame.article, 'What remains unresolved'); const unresolvedList = append(unresolved, 'div', 'question-list'); const unresolvedRecords = gate3Gaps.length ? gate3Gaps : migrationBoundaryGaps;
    unresolvedRecords.filter(item => item.priority === 'HIGH').slice(0, 4).forEach(item => { const card = append(unresolvedList, 'article', 'question-card'); append(card, 'h3', '', publicNarrative(item.topic, 'Open question')); append(card, 'p', '', publicNarrative(item.question)); if (item.why_it_matters) append(card, 'small', '', publicNarrative(item.why_it_matters)); });
    if (unresolvedRecords.length > 4) { const more = append(unresolved, 'details', 'secondary-context'); append(more, 'summary', '', `Review all ${unresolvedRecords.length.toLocaleString()} open evidence questions`); const moreList = append(more, 'div', 'question-list'); unresolvedRecords.slice(4).forEach(item => { const card = addProvenanceCard(moreList, context, { kicker: `${plainLabel(item.priority, 'Priority not assigned')} priority · ${plainLabel(item.status, 'Open')}`, title: publicNarrative(item.topic, 'Open question'), text: publicNarrative(item.question), meta: publicNarrative(item.why_it_matters), item: { related_records: item.related_records } }); card.dataset.gapId = item.gap_id || ''; }); }

    const explore = addSection(frame.article, 'Where to go next'); const links = append(explore, 'div', 'explore-grid');
    [['timeline.war', 'What happened', 'Follow the conflict timeline and the developments that changed the military, maritime and diplomatic record.'], ['military.campaigns', 'Military record', 'Strikes, facilities, weapons, casualties and damage imagery, with action and effect kept separate.'], ['hormuz.overview', 'Hormuz and the economy', 'What Iran could disrupt, what it could not control, and how trade adapted.'], ['talks.mou', 'Talks and agreements', 'What each side received, what was implemented, and why the interim bargain stopped controlling events.'], ['objectives.positions', 'Objectives and positions', 'Earlier positions, intervening events and later positions, using accepted findings only.'], ['evidence.claims', 'Claims and evidence', 'Claims, adjudications, source context and unresolved questions.']].forEach(([key, title, text]) => { const link = append(links, 'a', 'pathway-card'); append(link, 'strong', '', title); append(link, 'span', '', text); link.href = routeHref(key); });
    return frame.article;
  }

  const ACTOR_DIRECTORY_PINNED"""
js = sub_once(js, overview_pattern, overview_replacement, 'Start Here order/current state')

diplomacy_pattern = r"  function DiplomacyPage\(context\) \{.*?\n  \}\n\n  function MouPage"
diplomacy_replacement = """  function DiplomacyPage(context) {
    const frame = pageFrame(context, 'The record moves from proposals to ceasefires, interim agreements, implementation, breakdown and renewed mediation. Those states are not interchangeable.');
    const agreements = mergeCurrentRecords(modelData(context.model, 'ledger.agreements'), modelData(context.model, 'gate3.agreements'), ['agreement_id', 'id']);
    const publicView = modelData(context.model, 'analysis.endgame_public_view') || {};
    const current = addSection(frame.article, 'Current diplomatic state', 'content-section lead-story'); current.dataset.diplomaticState = 'current';
    append(current, 'p', 'lead-copy', 'The June MOU no longer controls either side, but negotiations continue. Current talks involve Hormuz passage and administration, nuclear questions and regional de-escalation. Diplomatic contact does not itself establish agreement or concession.');
    const currentLinks = append(current, 'div', 'record-actions diplomatic-current-links');
    [['talks.mou', 'June MOU'], ['hormuz.talks', 'Current Hormuz Talks'], ['talks.nuclear', 'Nuclear Talks']].forEach(([key, label]) => { const link = append(currentLinks, 'a', 'inline-route-link', label); link.href = routeHref(key); });
    if (publicView.mou_now) current.append(EvidenceDrawer.create(context, sourceEnvelope(publicView.mou_now), { localSources: localSourceMap(publicView) }));

    const renderAgreement = (host, agreement) => {
      const formalized = agreement.signed_or_formalized_date;
      const card = addProvenanceCard(host, context, { kicker: `${formalized ? `Signed / formalized ${readableDate(formalized)}` : `Origin ${readableDate(agreement.origin_date)}`} · ${plainLabel(agreement.status)}`, title: publicNarrative(agreement.name, agreement.agreement_id), text: publicNarrative(agreement.current_assessment || agreement.what_it_proves), technicalId: agreement.agreement_id, technicalIdLabel: 'Stable agreement ID', item: agreement, relatedRecords: agreement.relevant_drawdown_or_event_refs });
      card.dataset.agreementId = agreement.agreement_id; card.dataset.agreementFormalized = formalized ? 'true' : 'false';
      if (asArray(agreement.parties).length) appendActorIdentities(card, context, agreement.parties);
      addFactList(card, [['Type', plainLabel(agreement.agreement_type)], ['Status', plainLabel(agreement.status)], ['Host or mediator', publicNarrative(agreement.host_or_mediator, '')], ['What happened', publicNarrative(agreement.what_it_proves, '')], ['What remains uncertain', publicNarrative(agreement.what_it_does_not_prove, '')]]);
      if (agreement.agreement_id === 'AGR-US-IRN-14POINT-MOU-2026') { const links = append(card, 'div', 'agreement-route-links'); const mou = append(links, 'a', 'inline-route-link', 'Open the June MOU record'); mou.href = routeHref('talks.mou'); const nuclear = append(links, 'a', 'inline-route-link', 'Open the nuclear-talks record'); nuclear.href = routeHref('talks.nuclear'); }
    };
    const isWartime = agreement => String(agreement.signed_or_formalized_date || agreement.origin_date || '') >= '2026-02-28';
    const wartimeAgreements = agreements.filter(isWartime); const earlierAgreements = agreements.filter(agreement => !isWartime(agreement));
    const wartime = addSection(frame.article, 'Wartime agreements and negotiations'); wartime.dataset.agreementGroup = 'wartime';
    append(wartime, 'p', 'section-note', `${wartimeAgreements.length.toLocaleString()} wartime agreement, framework or proposal record${wartimeAgreements.length === 1 ? '' : 's'} are grouped here by relevance to the conflict, not treated as interchangeable legal states.`);
    const wartimeList = append(wartime, 'div', 'record-list agreement-directory'); wartimeAgreements.forEach(agreement => renderAgreement(wartimeList, agreement));
    const earlier = addSection(frame.article, 'Earlier agreements relevant to the war'); earlier.dataset.agreementGroup = 'historical';
    append(earlier, 'p', 'section-note', `${earlierAgreements.length.toLocaleString()} earlier agreement or framework record${earlierAgreements.length === 1 ? '' : 's'} remain available as context and retain their original dates.`);
    const earlierList = append(earlier, 'div', 'record-list agreement-directory'); earlierAgreements.forEach(agreement => renderAgreement(earlierList, agreement));

    const diplomacy = modelData(context.model, 'ledger.diplomacy'); const diplomacyRecords = mergeCurrentRecords(diplomacy, modelData(context.model, 'gate3.diplomacy'), ['diplomacy_id', 'id']);
    const sequence = addSection(frame.article, 'Detailed negotiation sequence'); sequence.dataset.diplomaticState = 'sequence';
    append(sequence, 'p', 'section-note', publicNarrative(diplomacy.rule));
    addSequence(sequence, context, diplomacyRecords.map(record => ({ date: record.date, title: publicNarrative(record.position_change, 'Diplomatic development'), text: asArray(record.actors).map(actor => context.services.actorIdentity.resolve(actor).label).join(' · '), item: record, relatedRecords: record.event_refs })));
    renderRelatedLinks(frame.article, context); return frame.article;
  }

  function MouPage"""
js = sub_once(js, diplomacy_pattern, diplomacy_replacement, 'Talks semantic grouping')

shipping_pattern = r"function enhanceShippingVisual\(article, context\) \{.*?\n\}\n\nfunction visualLossGroup"
shipping_replacement = """function enhanceShippingVisual(article, context) {
  if (article.querySelector('[data-shipping-map-system]')) return;
  const oil = modelData(context.model, 'analysis.oil_routes') || {}; const routes = asArray(oil.routes);
  if (!routes.length) {
    const warning = createStateNotice(context, { variant: 'dependency-unavailable', title: 'Route data unavailable', message: 'Atlas cannot render the broader shipping network because no supported route geometry is present in the current public model.', accounting: 'No route geometry is inferred to fill this gap.' });
    warning.dataset.shippingRouteDependency = 'missing'; visualSweepInsertAfterStatus(article, warning); return;
  }
  const shippingRecords = [...recordArray(modelData(context.model, 'ledger.shipping')), ...recordArray(modelData(context.model, 'gate3.shipping')), ...recordArray(modelData(context.model, 'current.material_losses')).filter(record => record.military_platform === false || String(record.side || '').includes('COMMERCIAL'))];
  const inHormuz = shippingRecords.filter(record => { const point = pointFromRecord(record, context.services.locationResolver); return point && point.lat >= 22.4 && point.lat <= 28.9 && point.lon >= 50.8 && point.lon <= 60.8; });
  const system = element(context.documentObject, 'section', 'shipping-map-system analytical-hero'); system.dataset.shippingMapSystem = 'chokepoint-network';
  append(system, 'h2', '', 'From chokepoint to network consequences');
  append(system, 'p', 'section-note meaning-first-summary', `${routes.length.toLocaleString()} strategic transport corridor${routes.length === 1 ? ' is' : 's are'} shown.`);
  append(system, 'p', 'method-note', 'These are source-supported schematic routes, not precise vessel tracks, surveyed alignment, or targeting-quality geometry.');
  const grid = append(system, 'div', 'shipping-map-grid');
  const choke = MapView.create(context, { title: 'Hormuz chokepoint', records: inHormuz, viewportOverride: [[22.4, 50.8], [28.9, 60.8]], scope: 'hormuz-chokepoint', maxZoom: 7, contextNote: 'Country, coastline and named evidence locations provide orientation. Geographic precision remains bounded by the underlying record.', description: inHormuz.length ? `${inHormuz.length.toLocaleString()} geolocated shipping or commercial-loss record${inHormuz.length === 1 ? '' : 's'} are shown within the public Hormuz context window.` : 'This map provides geographic context for the Strait; current public shipping evidence in this view is primarily corridor- and reporting-based rather than point-mapped loss evidence.' });
  choke.dataset.shippingMapView = 'chokepoint';
  if (!inHormuz.length) choke.append(createStateNotice(context, { variant: 'no-geolocated-records', message: 'This map provides geographic context. Current public shipping evidence in this view is primarily corridor- and reporting-based rather than represented by geolocated material-loss records.', accounting: 'Geolocated shipping or commercial-loss records in this view: 0' }));
  const network = MapView.create(context, { title: 'Network consequences', records: shippingRecords, routes, scope: 'route-network', maxZoom: 5, contextLabels: routeContextLabels(routes), contextNote: 'Named route nodes provide city, port and corridor context. Roads are not inferred where no deterministic road reference layer is packaged.', description: 'Broader maritime, pipeline and rail corridors show how pressure at Hormuz connects to Red Sea, Arabian Peninsula and Eurasian alternatives.' }); network.dataset.shippingMapView = 'network';
  grid.append(choke, network); const oldMap = article.querySelector('.context-map'); if (oldMap && oldMap !== choke && oldMap !== network) { if (oldMap._atlasMap && oldMap._atlasMap.remove) oldMap._atlasMap.remove(); oldMap.remove(); }
  visualSweepInsertAfterStatus(article, system);
}

function visualLossGroup"""
js = sub_once(js, shipping_pattern, shipping_replacement, 'Shipping meaning-first/state notice')

js = replace_once(js, "const rows = asArray(outlook.rows); if (!rows.length) return;", "const rows = asArray(outlook.rows); if (!rows.length) { const notice = createStateNotice(context, { variant: 'dependency-unavailable', title: 'Comparable economic snapshots unavailable', message: 'Atlas cannot render the economic comparison because the current public model does not contain comparable recorded snapshots.', accounting: 'No values are interpolated or invented to fill the missing series.' }); visualSweepInsertAfterStatus(article, notice); return; }", 'Economy missing-data notice')

JS.write_text(js, encoding='utf-8')

css = CSS.read_text(encoding='utf-8')
if 'Final polish design-system convergence' in css:
    raise SystemExit('final polish CSS already applied')
css += r'''

/* Final polish design-system convergence */
:root {
  --atlas-surface-card: var(--surface);
  --atlas-surface-inset: #0d161e;
  --atlas-surface-control: var(--surface-2);
  --atlas-surface-selected: #203445;
  --atlas-control-hover: #1b3040;
  --atlas-focus-ring: var(--atlas-accent, var(--accent));
  --atlas-radius-section: .7rem;
  --atlas-radius-control: .52rem;
  --atlas-space-1: .35rem;
  --atlas-space-2: .55rem;
  --atlas-space-3: .75rem;
  --atlas-space-4: 1rem;
  --atlas-space-5: 1.35rem;
  --atlas-transition-fast: 140ms ease;
}

.public-page { gap: var(--atlas-space-4); }
.page-intro,
.content-section,
.dataset-section,
.related-section,
.context-map,
.analytical-hero,
.page-local-nav,
.state-notice { border-radius: var(--atlas-radius-section); }

.page-intro h1:focus-visible {
  outline: 2px solid var(--atlas-focus-ring);
  outline-offset: .35rem;
  border-radius: .18rem;
}

:where(button, input, select, a, summary) {
  transition: color var(--atlas-transition-fast), background-color var(--atlas-transition-fast), border-color var(--atlas-transition-fast), box-shadow var(--atlas-transition-fast), opacity var(--atlas-transition-fast);
}
:where(button, input, select):disabled,
:where(button, [aria-disabled="true"]) { opacity: .52; cursor: not-allowed; }

:where(.action, .map-route-button, .map-imagery-button, .section-index-link, .page-local-nav button, .timeline-marker, .timeline-density-bin) {
  border-radius: var(--atlas-radius-control);
}
:where(.action, .map-route-button, .map-imagery-button, .section-index-link, .page-local-nav button):hover {
  border-color: var(--atlas-accent);
  background: var(--atlas-control-hover);
  color: var(--text);
}
:where(.map-route-button, .timeline-marker, .timeline-density-bin)[aria-pressed="true"],
:where(.map-route-button, .timeline-marker, .timeline-density-bin).selected {
  border-color: var(--atlas-accent);
  background: var(--atlas-surface-selected);
  color: var(--text);
  box-shadow: inset 0 0 0 1px rgb(112 215 241 / 22%);
}

.page-local-nav,
.ux-disclosure,
.source-outlet,
.evidence-drawer-body,
.effect-framework-card,
.loss-group-summary,
.economic-snapshot-card,
.agreement-term-row { background: var(--atlas-surface-inset); }

/* One disclosure grammar: a CSS-drawn chevron, no external icon dependency. */
:where(.mobile-navigation, .ux-disclosure, .evidence-drawer, .evidence-clock-help, .evidence-role-guide, .loss-category-drilldown, .economic-numeric-equivalent, .agreement-term-detail, .source-outlet, .section-index-disclosure, .prewar-context, .merchant-loss-details) > summary {
  list-style: none;
}
:where(.mobile-navigation, .ux-disclosure, .evidence-drawer, .evidence-clock-help, .evidence-role-guide, .loss-category-drilldown, .economic-numeric-equivalent, .agreement-term-detail, .source-outlet, .section-index-disclosure, .prewar-context, .merchant-loss-details) > summary::-webkit-details-marker { display: none; }
:where(.mobile-navigation, .ux-disclosure, .evidence-drawer, .evidence-clock-help, .evidence-role-guide, .loss-category-drilldown, .economic-numeric-equivalent, .agreement-term-detail, .source-outlet, .section-index-disclosure, .prewar-context, .merchant-loss-details) > summary::after {
  width: .52rem;
  height: .52rem;
  flex: 0 0 auto;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  content: "";
  transform: rotate(45deg);
  transition: transform var(--atlas-transition-fast);
}
:where(.mobile-navigation, .ux-disclosure, .evidence-drawer, .evidence-clock-help, .evidence-role-guide, .loss-category-drilldown, .economic-numeric-equivalent, .agreement-term-detail, .source-outlet, .section-index-disclosure, .prewar-context, .merchant-loss-details)[open] > summary::after { transform: rotate(225deg); }

.current-state-summary { border-color: #355d75; background: linear-gradient(135deg, rgb(42 80 105 / 16%), var(--atlas-surface-card) 72%); }
.current-state-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--atlas-space-3); }
.orientation-card { display: flex; min-width: 0; flex-direction: column; }
.orientation-card .orientation-actions { margin-top: auto; padding-top: var(--atlas-space-3); }
.orientation-card .inline-route-link { display: inline-flex; min-height: 2.75rem; align-items: center; }

.evidence-clock-bar { display: block; margin: .65rem 0 .9rem; background: rgb(9 18 24 / 64%); }
.evidence-clock-desktop { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }
.evidence-clock-mobile { display: none; }
.evidence-clock-mobile > summary {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: space-between;
  gap: .65rem;
  padding: .6rem .7rem;
  color: var(--text);
  cursor: pointer;
  list-style: none;
}
.evidence-clock-mobile > summary::-webkit-details-marker { display: none; }
.evidence-clock-mobile-action { color: var(--atlas-accent); font-size: .76rem; font-weight: 760; }
.evidence-clock-mobile-body { display: grid; gap: .35rem; padding: 0 .35rem .35rem; }

.state-notice {
  display: grid;
  gap: .35rem;
  padding: .75rem .9rem;
  border: 1px solid var(--line-soft);
  border-left: 3px solid var(--atlas-accent);
  background: var(--atlas-surface-inset);
}
.state-notice-title { font-size: .8rem; letter-spacing: .02em; }
.state-notice-message,
.state-notice-accounting { margin: 0; line-height: 1.5; }
.state-notice-message { color: var(--text); }
.state-notice-accounting { color: var(--muted); font-size: .76rem; }
.state-notice-unresolved,
.state-notice-insufficient-evidence { border-left-color: var(--warn); }
.state-notice-partial-evidence { border-left-color: var(--good); }
.state-notice-dependency-unavailable { border-left-color: var(--danger); }
.state-notice-methodology-boundary { border-left-color: var(--muted); }

.meaning-first-summary { margin-bottom: .25rem; color: var(--text); font-weight: 720; }
.method-note { max-width: 72ch; margin: 0 0 .75rem; color: var(--muted); font-size: .8rem; line-height: 1.5; }

[data-diplomatic-state="current"] { border-color: #355d75; background: linear-gradient(135deg, rgb(42 80 105 / 14%), var(--atlas-surface-card) 72%); }
.diplomatic-current-links { display: flex; flex-wrap: wrap; gap: .5rem; }

.page-intro > p,
.lead-copy,
.content-section > .section-note,
.method-note { max-width: 72ch; }

.map-legend,
.visual-key {
  display: flex;
  flex-wrap: wrap;
  gap: .45rem .7rem;
  align-items: center;
}
.map-legend > strong,
.visual-key > strong { color: var(--muted); font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; }

.evidence-status,
.record-status,
.topic-chip,
.record-class-chip {
  border-radius: 999px;
}

.loss-category-drilldown > summary { min-height: 2.75rem; align-items: center; }
.loss-category-drilldown > summary strong { min-width: 2rem; text-align: right; }
.economic-paired-values > div { min-width: 0; }
.economic-paired-values span { font-size: .75rem; }
.economic-delta { min-height: 1.75rem; align-items: center; }

@media (max-width: 52rem) {
  .current-state-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .timeline-controls :is(input, select),
  .chronology-controls :is(input, select),
  .lie-ledger-controls :is(input, select),
  .source-controls :is(input, select),
  .map-route-button,
  .map-imagery-button,
  .section-index-link,
  .orientation-actions a { min-height: 2.75rem; }
}

@media (max-width: 37.5rem) {
  .evidence-clock-desktop { display: none; }
  .evidence-clock-mobile { display: block; }
  .current-state-grid { grid-template-columns: 1fr; }
  .orientation-card { padding: .85rem; }
  .orientation-card h3 { font-size: 1rem; line-height: 1.25; }
  .orientation-card p { line-height: 1.48; }
  .diplomatic-current-links { display: grid; grid-template-columns: 1fr; }
  .diplomatic-current-links a { min-height: 2.75rem; }
  .agreement-ordinal { gap: .32rem; }
  .agreement-state {
    min-height: .62rem;
    padding: 0;
    border-radius: 999px;
    font-size: 0;
    line-height: 0;
  }
  .agreement-state.selected { min-height: .9rem; box-shadow: 0 0 0 2px rgb(112 215 241 / 24%); }
  .agreement-current-balance { font-size: .78rem; line-height: 1.4; }
  .timeline-density-bin small { display: none; }
  .timeline-density-bin { min-width: .72rem; }
  .state-notice { padding: .7rem .75rem; }
}

@media (prefers-reduced-motion: reduce) {
  :where(button, input, select, a, summary),
  :where(.mobile-navigation, .ux-disclosure, .evidence-drawer, .evidence-clock-help, .evidence-role-guide, .loss-category-drilldown, .economic-numeric-equivalent, .agreement-term-detail, .source-outlet, .section-index-disclosure, .prewar-context, .merchant-loss-details) > summary::after { transition: none !important; }
}
'''
CSS.write_text(css, encoding='utf-8')

static_test = r'''\'use strict\';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('./public-phase10.test.js');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const source = read('js/public-ia.js');
const css = read('css/public-shell.css');

for (const phrase of [
  'Final polish semantic state notices',
  'Where things stand now',
  'Economic pressure on Iran is severe; regime collapse is not established',
  'The Strait remains physically traversable but commercially contested',
  'The June MOU no longer controls either side, but talks remain active',
  'Current diplomatic state',
  'Wartime agreements and negotiations',
  'Earlier agreements relevant to the war',
  'Geolocated shipping or commercial-loss records in this view: 0',
  'Four strategic transport corridors are shown'
]) assert(source.includes(phrase) || phrase === 'Four strategic transport corridors are shown' && source.includes('strategic transport corridor'), `missing final-polish public contract: ${phrase}`);

assert(source.includes("now.dataset.currentStateSummary = 'four-domain'"), 'Start Here current-state summary is not explicitly four-domain');
for (const domain of ['Military', 'Hormuz', 'Economy', 'Diplomacy']) assert(source.includes(`domain: '${domain}'`), `Start Here missing ${domain} orientation card`);
assert(source.includes("const startState = context.route.key === 'start.overview' ? article.querySelector('[data-current-state-summary]')"), 'Start Here evidence clock is not anchored after current state');
assert(source.includes("wartime.dataset.agreementGroup = 'wartime'"), 'wartime agreements group is absent');
assert(source.includes("earlier.dataset.agreementGroup = 'historical'"), 'historical agreements group is absent');
assert(source.includes("notice.dataset.stateNotice = variant"), 'State Notice component lacks deterministic variant metadata');
assert(source.includes("variant: 'no-geolocated-records'"), 'Shipping zero geography does not use the semantic State Notice');
assert(source.includes("variant: 'dependency-unavailable'"), 'dependency unavailable State Notice is not used');
assert(!source.includes('dataWarIn90Seconds'), 'gated War in 90 Seconds copy leaked into production runtime');
assert(!source.includes('dataObjectiveOrientation'), 'gated objective orientation copy leaked into production runtime');
assert(!source.includes('dataUsWarRationale'), 'gated U.S. rationale copy leaked into production runtime');

for (const phrase of [
  'Final polish design-system convergence', '--atlas-surface-card', '--atlas-focus-ring',
  '.evidence-clock-mobile', '.state-notice', '.current-state-grid',
  '.agreement-state.selected', '@media (prefers-reduced-motion: reduce)'
]) assert(css.includes(phrase), `missing final-polish CSS contract: ${phrase}`);
assert(css.includes('outline: 2px solid var(--atlas-focus-ring)'), 'editorial H1 keyboard focus is not preserved');
assert(css.includes('min-height: 2.75rem'), 'touch-target floor is absent');
assert(!css.includes('font-size: .58rem'), 'final polish still depends on sub-readable .58rem mobile type');

console.log('public final polish: PASS - cleared onboarding, semantic state notices, Talks grouping, compact clocks and shared interaction/readability contracts verified; narrative-gated modules remain unpublished');
'''.replace("\\'use strict\\';", "'use strict';")
STATIC_TEST.write_text(static_test, encoding='utf-8')

browser_test = r'''\'use strict\';

const assert = require('node:assert/strict');
const ia = require('../js/public-ia.js');

const DEBUG = process.env.ATLAS_CDP || 'http://127.0.0.1:9222';
const SITE = process.env.ATLAS_SITE || 'http://127.0.0.1:8765/';
const WIDTHS = [1440, 768, 390, 320];
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('CDP open timeout')), 10000); this.ws.onopen = () => { clearTimeout(timer); resolve(); }; this.ws.onerror = () => reject(new Error('CDP websocket error')); });
    this.ws.onmessage = event => { const message = JSON.parse(String(event.data)); if (!message.id || !this.pending.has(message.id)) return; const pending = this.pending.get(message.id); this.pending.delete(message.id); message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result || {}); };
  }
  call(method, params = {}) { const id = ++this.id; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) { const out = await this.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }); if (out.exceptionDetails) throw new Error(out.exceptionDetails.text || 'Runtime exception'); return out.result && out.result.value; }
  close() { if (this.ws) this.ws.close(); }
}

async function waitFor(cdp, expression, timeout = 30000) { const started = Date.now(); while (Date.now() - started < timeout) { try { if (await cdp.eval(expression)) return; } catch (_) {} await sleep(75); } throw new Error(`timeout: ${expression}`); }
async function route(cdp, routeKey) { await cdp.eval(`location.hash=${JSON.stringify(ia.routeHref(routeKey))};scrollTo(0,0);true`); await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready' && window.ATLAS_PUBLIC_STATE?.routeKey === ${JSON.stringify(routeKey)}`); await sleep(120); }

(async () => {
  const targets = await (await fetch(`${DEBUG}/json`)).json(); const target = targets.find(item => item.type === 'page'); assert(target && target.webSocketDebuggerUrl, 'Atlas browser target missing');
  const cdp = new CDP(target.webSocketDebuggerUrl); await cdp.open();
  try {
    await cdp.call('Runtime.enable'); await cdp.call('Page.enable');
    await cdp.call('Page.navigate', { url: `${SITE}#/start/overview` }); await waitFor(cdp, `window.ATLAS_PUBLIC_STATE?.status === 'ready'`);
    for (const width of WIDTHS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
      await route(cdp, 'start.overview');
      const start = await cdp.eval(`(() => {
        const article = document.querySelector('.overview-page'); const current = article?.querySelector('[data-current-state-summary]'); const clocks = article?.querySelector('.evidence-clock-bar'); const historical = article?.querySelector('.historical-orientation');
        const domains = [...(current?.querySelectorAll('[data-orientation-domain]') || [])].map(card => ({ domain: card.dataset.orientationDomain, href: card.querySelector('.orientation-actions a')?.getAttribute('href') || '', height: card.querySelector('.orientation-actions a')?.getBoundingClientRect().height || 0 }));
        const desktop = clocks?.querySelector('.evidence-clock-desktop'); const mobile = clocks?.querySelector('.evidence-clock-mobile');
        const position = node => node ? [...article.children].indexOf(node) : -1;
        const focusTarget = current?.querySelector('.orientation-actions a'); focusTarget?.focus(); const focusStyle = focusTarget ? getComputedStyle(focusTarget) : null;
        return { currentIndex: position(current), clockIndex: position(clocks), historicalIndex: position(historical), domains, desktopDisplay: desktop ? getComputedStyle(desktop).display : '', mobileDisplay: mobile ? getComputedStyle(mobile).display : '', focusOutline: focusStyle?.outlineStyle || '', gated: Boolean(article?.querySelector('[data-war-in-90-seconds], [data-objective-orientation], [data-us-war-rationale]')) };
      })()`);
      assert.equal(start.domains.length, 4, `Start Here does not expose four current-state domains at ${width}px`);
      assert.deepEqual(start.domains.map(item => item.domain).sort(), ['diplomacy', 'economy', 'hormuz', 'military']);
      assert(start.currentIndex >= 0 && start.clockIndex > start.currentIndex && start.historicalIndex > start.clockIndex, `Start Here order is not current state -> evidence -> historical orientation at ${width}px`);
      assert(start.domains.every(item => /^#\//.test(item.href)), `Start Here drill-down link is unresolved at ${width}px`);
      if (width <= 390) assert(start.domains.every(item => item.height >= 43.5), `Start Here touch target below 44px at ${width}px`);
      assert.notEqual(start.focusOutline, 'none', `focused Start Here action loses visible focus at ${width}px`);
      assert.equal(start.gated, false, 'content-gated narrative module was rendered before approval');
      if (width <= 600) { assert.notEqual(start.mobileDisplay, 'none', `mobile evidence summary hidden at ${width}px`); assert.equal(start.desktopDisplay, 'none', `desktop evidence clocks remain visible at ${width}px`); const expanded = await cdp.eval(`(() => { const d=document.querySelector('.evidence-clock-mobile'); d.open=true; return { labels:[...d.querySelectorAll('.evidence-clock-item strong')].map(n=>n.textContent.trim()), summary:d.querySelector('summary')?.textContent||'' }; })()`); assert(expanded.labels.includes('Current evidence cutoff') && expanded.labels.includes('Frozen review cutoff'), `mobile evidence details lost cutoff definitions at ${width}px`); assert(/Evidence through/.test(expanded.summary) && /Historical review/.test(expanded.summary), `mobile evidence summary is not compact/data-derived at ${width}px`); }
      else { assert.notEqual(start.desktopDisplay, 'none', `desktop evidence clocks hidden at ${width}px`); assert.equal(start.mobileDisplay, 'none', `mobile evidence disclosure visible at ${width}px`); }

      await route(cdp, 'talks.overview');
      const talks = await cdp.eval(`(() => { const article=document.querySelector('.public-page'); const current=article?.querySelector('[data-diplomatic-state="current"]'); const wartime=article?.querySelector('[data-agreement-group="wartime"]'); const historical=article?.querySelector('[data-agreement-group="historical"]'); const sequence=article?.querySelector('[data-diplomatic-state="sequence"]'); const order=node=>node?[...article.children].indexOf(node):-1; const ids=[...article.querySelectorAll('[data-agreement-id]')].map(n=>n.dataset.agreementId); return { order:[order(current),order(wartime),order(historical),order(sequence)], ids, unique:new Set(ids).size, wartimeCount:wartime?.querySelectorAll('[data-agreement-id]').length||0, historicalCount:historical?.querySelectorAll('[data-agreement-id]').length||0 }; })()`);
      assert(talks.order.every((value, index, rows) => value >= 0 && (index === 0 || value > rows[index - 1])), `Talks grouping order is wrong at ${width}px`);
      assert.equal(talks.ids.length, talks.unique, `an agreement appears in more than one Talks group at ${width}px`);
      assert.equal(talks.ids.length, talks.wartimeCount + talks.historicalCount, `Talks grouping dropped an agreement at ${width}px`);

      await route(cdp, 'hormuz.shipping');
      const shipping = await cdp.eval(`(() => { const choke=document.querySelector('[data-shipping-map-view="chokepoint"]'); const notice=choke?.querySelector('[data-state-notice="no-geolocated-records"]'); const summary=document.querySelector('[data-shipping-map-system] .meaning-first-summary')?.textContent||''; return { notice:Boolean(notice), message:notice?.querySelector('.state-notice-message')?.textContent||'', accounting:notice?.querySelector('.state-notice-accounting')?.textContent||'', summary }; })()`);
      assert(/strategic transport corridor/.test(shipping.summary), `Shipping does not lead with reader meaning at ${width}px`);
      if (shipping.notice) { assert(/geographic context/i.test(shipping.message), `Shipping zero state lacks meaning-first text at ${width}px`); assert(/: 0$/.test(shipping.accounting.trim()), `Shipping zero state lost exact accounting value at ${width}px`); }

      if (width <= 390) {
        await route(cdp, 'talks.mou');
        const mou = await cdp.eval(`(() => { const current=document.querySelector('.agreement-current-balance'); const states=[...document.querySelectorAll('.agreement-state')]; return { currentSize:current?parseFloat(getComputedStyle(current).fontSize):0, visibleTiny:states.filter(n=>getComputedStyle(n).fontSize!=='0px' && parseFloat(getComputedStyle(n).fontSize)<11.5).length }; })()`);
        assert(mou.currentSize >= 11.5, `MOU selected balance is sub-readable at ${width}px`); assert.equal(mou.visibleTiny, 0, `MOU compact track exposes sub-readable state labels at ${width}px`);
        await route(cdp, 'timeline.war');
        const controlFloor = await cdp.eval(`Math.min(...[...document.querySelectorAll('.timeline-controls input,.timeline-controls select,.timeline-navigation button')].map(n=>n.getBoundingClientRect().height).filter(Boolean))`);
        assert(controlFloor >= 43.5, `Timeline touch control below 44px at ${width}px`);
      }
    }
    await cdp.call('Emulation.clearDeviceMetricsOverride');
    console.log('browser public final polish: PASS - Start Here discoverability, compact evidence status, Talks grouping, semantic Shipping state, mobile readability and touch/focus behavior verified');
  } finally { try { await cdp.call('Browser.close'); } catch (_) {} cdp.close(); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
'''.replace("\\'use strict\\';", "'use strict';")
BROWSER_TEST.write_text(browser_test, encoding='utf-8')

render = RENDER.read_text(encoding='utf-8')
render = replace_once(render, "const MAP_FOCUS = [", "const POLISH_FOCUS = [\n  { routeKey: 'start.overview', label: 'start-current-state', selector: '[data-current-state-summary]' },\n  { routeKey: 'start.overview', label: 'start-evidence-clock', selector: '.evidence-clock-bar', openSelector: '.evidence-clock-mobile' },\n  { routeKey: 'talks.overview', label: 'talks-current-state', selector: '[data-diplomatic-state=\"current\"]' }\n];\nconst MAP_FOCUS = [", 'render review polish focus constant')
loop_anchor = """    await cdp.call('Emulation.clearDeviceMetricsOverride');
    const manifest = {
      widths: WIDTHS,
      routes: ROUTES,
      captures,
      map_focus: MAP_FOCUS.map(({ routeKey, label, selector }) => ({ routeKey, label, selector })),
      map_focus_captures: mapFocusCaptures,
      total_review_captures: captures + mapFocusCaptures
    };
"""
loop_replacement = """    let polishFocusCaptures = 0;
    for (const width of WIDTHS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 768 });
      for (const focus of POLISH_FOCUS) {
        await route(cdp, focus.routeKey);
        const selector = JSON.stringify(focus.selector);
        await waitFor(cdp, `Boolean(document.querySelector(${selector}))`);
        await cdp.eval(`(() => { const target=document.querySelector(${selector}); ${focus.openSelector ? `const disclosure=document.querySelector(${JSON.stringify(focus.openSelector)}); if (disclosure && innerWidth <= 600) disclosure.open=true;` : ''} target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' }); return true; })()`);
        await sleep(150);
        await captureViewport(cdp, `polishfocus-${String(width).padStart(4, '0')}-${focus.label}.png`);
        polishFocusCaptures += 1;
      }
    }

    await cdp.call('Emulation.clearDeviceMetricsOverride');
    const manifest = {
      widths: WIDTHS,
      routes: ROUTES,
      captures,
      map_focus: MAP_FOCUS.map(({ routeKey, label, selector }) => ({ routeKey, label, selector })),
      map_focus_captures: mapFocusCaptures,
      polish_focus: POLISH_FOCUS.map(({ routeKey, label, selector }) => ({ routeKey, label, selector })),
      polish_focus_captures: polishFocusCaptures,
      total_review_captures: captures + mapFocusCaptures + polishFocusCaptures
    };
"""
render = replace_once(render, loop_anchor, loop_replacement, 'render review focus loop')
render = replace_once(render, "console.log(`browser public rendered review capture: PASS - ${captures} top-of-page screenshots (${ROUTES.length} high-risk routes x ${WIDTHS.length} widths) + ${mapFocusCaptures} focused map screenshots`);", "console.log(`browser public rendered review capture: PASS - ${captures} top-of-page screenshots (${ROUTES.length} high-risk routes x ${WIDTHS.length} widths) + ${mapFocusCaptures} focused map screenshots + ${polishFocusCaptures} final-polish focus screenshots`);", 'render review console')
RENDER.write_text(render, encoding='utf-8')

validate = VALIDATE.read_text(encoding='utf-8')
validate = replace_once(validate, "          node tests/public-phase9.test.js\n", "          node tests/public-phase9.test.js\n          node tests/public-final-polish.test.js\n", 'validate static final polish')
validate = replace_once(validate, "          node --check tests/browser-public-responsive-phase9.js\n", "          node --check tests/browser-public-responsive-phase9.js\n          node --check tests/browser-public-final-polish.js\n", 'validate browser check final polish')
validate = replace_once(validate, "          ATLAS_CDP=http://127.0.0.1:9222 ATLAS_SITE=http://127.0.0.1:8765/ node tests/browser-public-phase9.js\n", "          ATLAS_CDP=http://127.0.0.1:9222 ATLAS_SITE=http://127.0.0.1:8765/ node tests/browser-public-phase9.js\n          ATLAS_CDP=http://127.0.0.1:9222 ATLAS_SITE=http://127.0.0.1:8765/ node tests/browser-public-final-polish.js\n", 'validate browser execute final polish')
VALIDATE.write_text(validate, encoding='utf-8')

humanize = HUMANIZE.read_text(encoding='utf-8')
humanize = replace_once(humanize, "          node --check tests/browser-public-render-review.js\n", "          node --check tests/browser-public-render-review.js\n          node --check tests/browser-public-final-polish.js\n", 'humanization browser check')
humanize = replace_once(humanize, "          python scripts/build_public_current_state_v2_hardened.py --output data/public-current-state.json\n", "          python scripts/build_public_current_state_v2_hardened.py --output data/public-current-state.json\n          node tests/public-final-polish.test.js\n", 'humanization static final polish')
humanize = replace_once(humanize, "          ATLAS_CDP=http://127.0.0.1:9222 ATLAS_SITE=http://127.0.0.1:8765/ node tests/browser-public-source-humanization-focus.js\n          stop_browser\n\n          launch_browser /tmp/atlas-render-review-profile\n", "          ATLAS_CDP=http://127.0.0.1:9222 ATLAS_SITE=http://127.0.0.1:8765/ node tests/browser-public-source-humanization-focus.js\n          ATLAS_CDP=http://127.0.0.1:9222 ATLAS_SITE=http://127.0.0.1:8765/ node tests/browser-public-final-polish.js\n          stop_browser\n\n          launch_browser /tmp/atlas-render-review-profile\n", 'humanization browser execute final polish')
HUMANIZE.write_text(humanize, encoding='utf-8')

print('final polish patch prepared')
