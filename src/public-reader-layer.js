/* ATLAS PUBLIC READER LAYER
 *
 * Reader-first projection and presentation behavior for the public Atlas.
 * This layer deliberately operates downstream of the evidence/canonical model.
 * It may simplify or reorganize presentation, but it must not manufacture facts.
 */
(function installAtlasPublicReaderLayer(root) {
  'use strict';

  const existingModule = typeof module === 'object' && module.exports && typeof module.exports.mount === 'function'
    ? module.exports
    : null;
  const base = existingModule || root.AtlasPublicIA || (
    typeof require === 'function' ? require('./public-ia.js') : null
  );
  if (!base || typeof base.mount !== 'function') return;
  if (base.READER_LAYER_VERSION) return;

  const VERSION = 'atlas-reader-v1';
  const INTERNAL_TEXT = /\b(?:ROOK|PR\/CI)\b|claim[_ -]?instance[_ -]?id|proposition[_ -]?id|chain[_ -]?id|publication[_ -]?blocker|knowledge[_ -]?basis[_ -]?support[_ -]?failure/i;

  const asArray = value => Array.isArray(value) ? value : [];
  const text = value => value === null || value === undefined ? '' : String(value).trim();
  const slug = value => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown';
  const unique = values => [...new Set(asArray(values).filter(Boolean))];

  function el(documentObject, tag, className, value) {
    const node = documentObject.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  }

  function append(host, tag, className, value) {
    const node = el(host.ownerDocument || host, tag, className, value);
    host.append(node);
    return node;
  }

  function findSection(article, title) {
    return [...article.querySelectorAll(':scope > section, :scope > details')].find(node => {
      const heading = node.querySelector(':scope > h2, :scope > summary');
      return heading && heading.textContent.trim().toLowerCase() === String(title).trim().toLowerCase();
    }) || null;
  }

  function collapseSection(article, title, summaryText) {
    const section = findSection(article, title);
    if (!section || section.tagName === 'DETAILS') return section;
    const details = el(article.ownerDocument, 'details', 'secondary-context reader-method-detail');
    append(details, 'summary', '', summaryText || title);
    [...section.children].forEach(child => {
      if (child.tagName !== 'H2') details.append(child);
    });
    section.replaceWith(details);
    return details;
  }

  function sourceIdsFrom(record) {
    if (!record || typeof record !== 'object') return [];
    const support = record.evidence_support && typeof record.evidence_support === 'object' ? record.evidence_support : {};
    return unique([
      ...asArray(record.source_ids),
      ...asArray(record.sources).filter(value => typeof value === 'string'),
      ...Object.values(support).flatMap(value => asArray(value)).filter(value => typeof value === 'string')
    ]);
  }

  function directSourceUrls(record) {
    if (!record || typeof record !== 'object') return [];
    return unique([
      ...asArray(record.source_urls),
      ...asArray(record.unresolved_source_urls),
      ...(typeof record.url === 'string' ? [record.url] : [])
    ]).filter(value => /^https?:\/\//i.test(value));
  }

  function addEvidence(host, context, records, label) {
    const rows = asArray(records).filter(Boolean);
    const sourceIds = unique(rows.flatMap(sourceIdsFrom));
    const urls = unique(rows.flatMap(directSourceUrls));
    if (sourceIds.length && base.EvidenceDrawer && typeof base.EvidenceDrawer.create === 'function') {
      const drawer = base.EvidenceDrawer.create(context, { source_ids: sourceIds });
      const summary = drawer.querySelector('summary');
      if (summary && label) summary.textContent = label;
      host.append(drawer);
    }
    if (urls.length) {
      const details = append(host, 'details', 'reader-direct-sources');
      append(details, 'summary', '', label || `Sources (${urls.length})`);
      const list = append(details, 'ul', 'reader-source-list');
      urls.forEach((url, index) => {
        const item = append(list, 'li');
        const link = append(item, 'a', '', `Source ${index + 1}`);
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      });
    }
  }

  function cleanPublicText(value) {
    let result = text(value);
    result = result.replace(/\bROOK(?:'s)?\b/gi, 'the review');
    result = result.replace(/\bPR\/CI\b/gi, 'evidence review');
    result = result.replace(/\s{2,}/g, ' ').trim();
    return result;
  }

  function removeInternalChrome(article, routeKey) {
    article.querySelectorAll('.evidence-role-guide, .technical-record-metadata').forEach(node => node.remove());
    article.querySelectorAll('[data-phase5-chart-equivalent]').forEach(details => {
      if (routeKey !== 'military.campaigns' || details.dataset.phase5ChartEquivalent !== 'campaign-tempo') return;
      details.classList.add('reader-pending-campaign-drilldown');
    });
    if (!['evidence.method', 'evidence.archive'].includes(routeKey)) {
      article.querySelectorAll('.evidence-clocks, .evidence-clock-bar').forEach(node => node.remove());
    }
    article.querySelectorAll('.fact-list dt, .fact-list dd, .record-status, .section-note').forEach(node => {
      if (INTERNAL_TEXT.test(node.textContent || '')) node.remove();
    });
  }

  function simplifyFooter(rootElement, model, routeKey) {
    const footer = rootElement.querySelector('.page-footer');
    if (!footer) return;
    const first = footer.querySelector('span');
    if (!first) return;
    const current = model && model.release && (model.release.current_osint_cutoff_display || model.release.current_osint_cutoff);
    if (['evidence.method', 'evidence.archive'].includes(routeKey)) return;
    first.textContent = `Evidence current through ${current || 'the current review cutoff'}. `;
  }

  function setPageIntro(article, copy) {
    const intro = article.querySelector('.page-intro');
    if (!intro) return;
    const paragraphs = [...intro.querySelectorAll(':scope > p')].filter(node => !node.classList.contains('eyebrow'));
    if (paragraphs[0]) paragraphs[0].textContent = copy;
  }

  function simplifyOverview(article) {
    const replacements = new Map([
      ['U.S. strike capacity remained intact; Iran retained disruptive capability', 'U.S. / coalition forces retained the strike advantage'],
      ['The Strait remains physically traversable but commercially contested', 'Iran has not secured exclusive control of Hormuz'],
      ['Economic pressure on Iran is severe; regime collapse is not established', 'Economic pressure on Iran is severe'],
      ['The June MOU no longer controls either side, but talks remain active', 'The June MOU is no longer in force; negotiations continue']
    ]);
    article.querySelectorAll('.orientation-card h3').forEach(heading => {
      const replacement = replacements.get(heading.textContent.trim());
      if (replacement) heading.textContent = replacement;
    });
    const about = findSection(article, 'About the record');
    if (about) collapseSection(article, 'About the record', 'About the evidence record');
  }

  function militaryEventDate(item) {
    return text(item && item.timeline && item.timeline.date || item && item.event && item.event.event_date);
  }

  function militaryEventType(item) {
    return text(item && item.event && item.event.event_type || item && item.timeline && item.timeline.event_type);
  }

  function militaryEventTitle(item) {
    const record = item && item.event || {};
    return cleanPublicText(
      record.observed_fact || record.headline || record.title || item && item.timeline && item.timeline.label || militaryEventType(item) || 'Recorded military event'
    );
  }

  function buildCampaignDrilldown(article, context) {
    const details = article.querySelector('[data-phase5-chart-equivalent="campaign-tempo"]');
    if (!details) return;
    const events = asArray(context.model.chronology).filter(item => /(STRIKE|ATTACK|MISSILE|DRONE|INTERCEPT|MILITARY_OPERATION|NAVAL)/.test(militaryEventType(item)));
    const byMonth = new Map();
    events.forEach(item => {
      const month = militaryEventDate(item).slice(0, 7);
      if (!month) return;
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month).push(item);
    });
    details.replaceChildren();
    details.className = 'reader-constituent-drilldown';
    details.dataset.readerDrilldown = 'event-constituents';
    append(details, 'summary', '', 'What made up these monthly totals');
    append(details, 'p', 'section-note', 'Each monthly number is a count of recorded military events. Open a month to see the records that make up that exact total. Equipment quantities are not substituted for event counts.');
    const monthList = append(details, 'div', 'reader-month-list');
    [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([month, records]) => {
      const monthDetails = append(monthList, 'details', 'reader-month-drilldown');
      append(monthDetails, 'summary', '', `${month} — ${records.length} recorded event${records.length === 1 ? '' : 's'}`);
      const list = append(monthDetails, 'ol', 'reader-constituent-list');
      records.sort((a, b) => militaryEventDate(a).localeCompare(militaryEventDate(b))).forEach(item => {
        const row = append(list, 'li');
        const id = item && item.event_id;
        if (id) {
          const link = append(row, 'a', '', militaryEventTitle(item));
          link.href = base.routeHref('timeline.chronology', { event: id });
        } else append(row, 'span', '', militaryEventTitle(item));
        const date = militaryEventDate(item);
        if (date) append(row, 'small', '', ` ${date}`);
      });
    });
    collapseSection(article, 'From damage to strategic effect', 'How damage and operational effect are separated');
  }

  function normalizeActor(record) {
    const raw = text(record && (record.actor || record.owner || record.side || record.country || record.host)).toUpperCase();
    const id = text(record && (record.facility_id || record.id)).toUpperCase();
    if (/^US-|\bUSA\b|UNITED STATES|U\.S\./.test(`${id} ${raw}`)) return 'United States';
    if (/^FAC-IRN-|\bIRAN\b|\bIRGC\b/.test(`${id} ${raw}`)) return 'Iran';
    if (/SAUDI/.test(raw)) return 'Saudi Arabia';
    if (/YEMEN|HOUTHI|ANSAR/.test(raw)) return 'Yemen / Houthis';
    if (/ISRAEL/.test(raw)) return 'Israel';
    if (/QATAR/.test(raw)) return 'Qatar';
    if (/BAHRAIN/.test(raw)) return 'Bahrain';
    if (/KUWAIT/.test(raw)) return 'Kuwait';
    if (/JORDAN/.test(raw)) return 'Jordan';
    if (/OMAN/.test(raw)) return 'Oman';
    return cleanPublicText(record && (record.actor || record.owner || record.country || record.host)) || 'Other / unresolved';
  }

  const FACILITY_STATUS = Object.freeze({
    destroyed: { label: 'Destroyed', className: 'destroyed' },
    damaged_inoperable: { label: 'Damaged — inoperable', className: 'damaged-inoperable' },
    damaged_operational: { label: 'Damaged — operational', className: 'damaged-operational' },
    operational: { label: 'Operational', className: 'operational' },
    unknown: { label: 'Unknown', className: 'unknown' },
    administrative: { label: 'Closed / withdrawn / transferred', className: 'administrative' }
  });

  function facilityStatus(record) {
    const presence = text(record && (record.current_status || record.current_presence_status)).toUpperCase();
    const damage = text(record && record.damage_evidence_status).toUpperCase();
    const effect = text(record && record.operational_effect_status).toUpperCase();
    const continuity = cleanPublicText(record && record.continuity).toUpperCase();
    const facilityClass = text(record && record.facility_class).toUpperCase();
    const type = text(record && record.type).toUpperCase();
    const adminText = `${presence} ${effect}`;
    if (/\b(WITHDRAWN|CLOSED|TRANSFERRED|DRAWDOWN|DEACTIVATED|VACATED|NOT ACTIVE)\b/.test(adminText) && !/DESTROYED/.test(adminText)) return 'administrative';
    if (/\b(WHOLE_SITE_DESTROYED|FACILITY_DESTROYED|BASE_DESTROYED)\b/.test(effect)) return 'destroyed';
    if (/^DESTROYED\b/.test(presence) || (/\bDESTROYED\b/.test(presence) && /OUTPOST|SITE|CENTER|CENTRE|FACILITY/.test(facilityClass + ' ' + type))) return 'destroyed';
    if (/\b(WHOLE_SITE_INOPERABLE|FACILITY_INOPERABLE|BASE_INOPERABLE|MISSION_KILL)\b/.test(effect)) return 'damaged_inoperable';
    if (/SUBFACILITY_INOPERABLE/.test(effect)) {
      if (/OUTPOST|SUBFACILITY|OPERATIONS_CENTER|OPERATIONS CENTRE|TOC/.test(`${facilityClass} ${type} ${presence}`)) return 'damaged_inoperable';
      return 'damaged_operational';
    }
    if (/VERIFIED_DAMAGE|CONFIRMED_DAMAGE/.test(damage)) {
      if (/NO_WHOLE_SITE_SHUTDOWN|OPERAT|PRESENCE|REOPEN|CONTINU/.test(`${effect} ${presence} ${continuity}`)) return 'damaged_operational';
      return 'damaged_operational';
    }
    if (/OPERATIONAL|OPERATING|PRESENCE ESTABLISHED|TROOP POSITION REPORTED|ACTIVE/.test(`${presence} ${effect} ${continuity}`) && !/UNVERIFIED.*DAMAGE/.test(damage)) return 'operational';
    if (/DAMAGE_CLAIM_UNVERIFIED|UNVERIFIED|UNKNOWN|UNRESOLVED/.test(`${damage} ${effect} ${presence}`)) return 'unknown';
    return 'unknown';
  }

  function facilityDate(record) {
    const dates = [
      record && record.last_reviewed,
      record && record.assessment_date,
      record && record.date,
      ...asArray(record && record.damage_evidence_dates)
    ].filter(Boolean).map(String).sort();
    return dates[dates.length - 1] || null;
  }

  function mergeFacilities(context) {
    const baseRows = base.recordArray(base.modelData(context.model, 'ledger.facilities'));
    const currentRows = base.recordArray(base.modelData(context.model, 'gate3.facilities'));
    const map = new Map();
    [...baseRows, ...currentRows].forEach(record => {
      const id = record && (record.facility_id || record.id || record.name);
      if (!id) return;
      map.set(id, { ...(map.get(id) || {}), ...record, facility_id: record.facility_id || record.id || id });
    });
    return [...map.values()];
  }

  function buildFacilityDashboard(article, context) {
    if (article.querySelector('[data-reader-facility-dashboard]')) return;
    const records = mergeFacilities(context);
    if (!records.length) return;
    const documentObject = article.ownerDocument;
    const dashboard = el(documentObject, 'section', 'content-section reader-facility-dashboard');
    dashboard.dataset.readerFacilityDashboard = VERSION;
    append(dashboard, 'h2', '', 'Facility status by actor');
    append(dashboard, 'p', 'section-note', 'The bar gives the current facility-level picture. Open a status to see the facilities and the evidence behind each result. Damage to one subfacility is not treated as loss of an entire base unless the evidence supports that conclusion.');
    const groups = new Map();
    records.forEach(record => {
      const actor = normalizeActor(record);
      if (!groups.has(actor)) groups.set(actor, []);
      groups.get(actor).push(record);
    });
    const order = ['Iran', 'United States', 'Saudi Arabia', 'Yemen / Houthis', 'Israel', 'Qatar', 'Bahrain', 'Kuwait', 'Jordan', 'Oman'];
    const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
      const ai = order.indexOf(a); const bi = order.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });
    sortedGroups.forEach(([actor, facilities]) => {
      const panel = append(dashboard, 'section', 'reader-facility-actor');
      append(panel, 'h3', '', actor);
      const buckets = new Map(Object.keys(FACILITY_STATUS).map(key => [key, []]));
      facilities.forEach(record => buckets.get(facilityStatus(record)).push(record));
      const operationalKeys = ['destroyed', 'damaged_inoperable', 'damaged_operational', 'operational', 'unknown'];
      const denominator = operationalKeys.reduce((sum, key) => sum + buckets.get(key).length, 0);
      const bar = append(panel, 'div', 'reader-status-bar');
      bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', operationalKeys.map(key => `${FACILITY_STATUS[key].label}: ${buckets.get(key).length}`).join('; '));
      operationalKeys.forEach(key => {
        const count = buckets.get(key).length;
        if (!count) return;
        const segment = append(bar, 'span', `reader-status-segment ${FACILITY_STATUS[key].className}`);
        segment.style.width = `${denominator ? count / denominator * 100 : 0}%`;
        segment.title = `${FACILITY_STATUS[key].label}: ${count}`;
      });
      const legend = append(panel, 'div', 'reader-status-legend');
      operationalKeys.forEach(key => {
        const count = buckets.get(key).length;
        const item = append(legend, 'span', `reader-status-key ${FACILITY_STATUS[key].className}`);
        append(item, 'strong', '', String(count));
        item.append(documentObject.createTextNode(` ${FACILITY_STATUS[key].label}`));
      });
      operationalKeys.forEach(key => {
        const rows = buckets.get(key);
        if (!rows.length) return;
        const details = append(panel, 'details', `reader-facility-drawer ${FACILITY_STATUS[key].className}`);
        append(details, 'summary', '', `${FACILITY_STATUS[key].label} (${rows.length})`);
        const list = append(details, 'div', 'reader-facility-list');
        rows.sort((a, b) => text(a.name).localeCompare(text(b.name))).forEach(record => {
          const card = append(list, 'article', 'reader-facility-card');
          append(card, 'h4', '', cleanPublicText(record.name || record.facility_id || record.id));
          const date = facilityDate(record);
          if (date) append(card, 'p', 'card-kicker', `Status supported through ${date}`);
          const effect = cleanPublicText(record.assessment || record.effect || record.note || record.continuity || 'No broader effect is stated beyond the recorded status.');
          if (effect) append(card, 'p', '', effect);
          addEvidence(card, context, [record], 'Evidence / BDA');
        });
      });
      const admin = buckets.get('administrative');
      if (admin.length) {
        const details = append(panel, 'details', 'reader-facility-drawer administrative');
        append(details, 'summary', '', `${FACILITY_STATUS.administrative.label} (${admin.length})`);
        append(details, 'p', 'section-note', 'These records are kept outside the operational-status denominator. Administrative closure, transfer or withdrawal is not physical destruction.');
        const list = append(details, 'ul', 'reader-constituent-list');
        admin.forEach(record => append(list, 'li', '', cleanPublicText(record.name || record.facility_id || record.id)));
      }
    });
    const map = article.querySelector(':scope > .context-map, :scope > section .context-map');
    if (map && map.parentElement === article) article.insertBefore(dashboard, map);
    else article.querySelector('.page-intro')?.after(dashboard);

    const old = findSection(article, 'Facility assessments');
    if (old) {
      const details = el(documentObject, 'details', 'secondary-context reader-full-facility-records');
      append(details, 'summary', '', `Browse full facility records (${records.length})`);
      [...old.children].forEach(child => { if (child.tagName !== 'H2') details.append(child); });
      old.replaceWith(details);
    }
  }

  function publicAdjudication(record) {
    const publication = text(record && record.publication_status).toUpperCase();
    if (publication === 'BLOCKED_EVIDENCE_COMPLETION') return { label: 'Evidence review incomplete', key: 'pending' };
    if (publication === 'NOT_ROOK_REASSESSED') return { label: 'Not yet assessed', key: 'pending' };
    const truth = text(record && record.truth_adjudication).toUpperCase();
    const knowledge = text(record && (record.public_knowledge_judgment || record.knowledge_judgment)).toUpperCase();
    if (truth === 'FALSE') {
      if (knowledge === 'KNOWING_FALSEHOOD_ESTABLISHED') return { label: 'Lie', key: 'lie' };
      if (['LIKELY_KNEW_FALSE', 'VERY_LIKELY_KNEW_FALSE'].includes(knowledge)) return { label: 'Likely lie', key: 'likely-lie' };
      return { label: 'False', key: 'false' };
    }
    if (truth === 'MISLEADING') return { label: 'Misleading', key: 'misleading' };
    if (truth === 'PARTLY_TRUE') return { label: 'Partly true', key: 'partly-true' };
    if (truth === 'SUPPORTED') return { label: 'Supported', key: 'supported' };
    return { label: 'Unresolved', key: 'unresolved' };
  }

  function statementDate(record) {
    return text(record && record.statement_time && (record.statement_time.display_time || record.statement_time.date) || record && record.event_time);
  }

  function recordProposition(record) {
    return cleanPublicText(record && (record.proposition || record.source_proposition || record.claim || 'Claim text unavailable'));
  }

  function howWeKnow(record, adjudication) {
    const facts = asArray(record && record.observed_facts).map(cleanPublicText).filter(Boolean);
    const result = facts.slice(0, 4);
    const knowledge = text(record && (record.public_knowledge_judgment || record.knowledge_judgment)).toUpperCase();
    if (adjudication.key === 'lie' && !result.some(value => /knew|knowledge|access/i.test(value))) {
      result.push('The evidence supports that the claimant had access to information contradicting the statement when it was made.');
    } else if (adjudication.key === 'likely-lie' && !result.some(value => /knew|knowledge|access/i.test(value))) {
      result.push('The evidence makes it more likely than not that the claimant had access to contradictory information at the time.');
    } else if (knowledge === 'INSUFFICIENT_EVIDENCE' && adjudication.key === 'false') {
      result.push('The claim is false on the available record, but the evidence does not establish that the claimant knew it was false when stated.');
    }
    if (!result.length) {
      const inference = cleanPublicText(record && record.analytic_inference);
      if (inference && !INTERNAL_TEXT.test(inference)) result.push(inference);
    }
    if (!result.length) result.push('The current evidence supports this finding; open the sources below for the underlying record.');
    return result;
  }

  function rebuildLieLedger(article, context) {
    const payload = base.modelData(context.model, 'gate3.lie_ledger') || {};
    const chains = asArray(payload.records).length ? asArray(payload.records) : base.recordArray(payload);
    const documentObject = article.ownerDocument;
    const header = article.querySelector('.page-intro');
    if (!header) return;
    setPageIntro(article, 'Claims are grouped by what was actually asserted. Each entry shows the current finding, repeats or related claims when they matter, and the evidence that supports the result.');
    [...article.children].forEach(child => { if (child !== header) child.remove(); });

    const section = append(article, 'section', 'content-section reader-lie-ledger');
    section.dataset.readerLieLedger = VERSION;
    append(section, 'h2', '', 'Claims and findings');
    const controls = append(section, 'form', 'reader-ledger-controls');
    controls.addEventListener('submit', event => event.preventDefault());
    const searchLabel = append(controls, 'label', '', 'Search claims');
    const search = append(searchLabel, 'input');
    search.type = 'search'; search.placeholder = 'Search claim or claimant';
    const statusLabel = append(controls, 'label', '', 'Finding');
    const status = append(statusLabel, 'select');
    append(status, 'option', '', 'All findings').value = '';
    const statusKeys = new Map();
    const cards = [];

    chains.forEach(chain => {
      const records = asArray(chain && chain.proposition_records);
      const groups = new Map();
      records.forEach(record => {
        const key = record.proposition_id || recordProposition(record).toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(record);
      });
      const groupEntries = [...groups.entries()];
      groupEntries.forEach(([groupKey, groupRecords]) => {
        const main = groupRecords.find(record => record.actor_role === 'ORIGINATOR' || record.relation_type === 'ORIGINATION') || groupRecords[0];
        if (!main) return;
        const adjudication = publicAdjudication(main);
        statusKeys.set(adjudication.key, adjudication.label);
        const card = append(section, 'article', `reader-ledger-card finding-${adjudication.key}`);
        card.dataset.readerFinding = adjudication.key;
        card.dataset.readerSearch = `${recordProposition(main)} ${cleanPublicText(main.actor)} ${adjudication.label}`.toLowerCase();
        const top = append(card, 'div', 'reader-ledger-card-head');
        const copy = append(top, 'div');
        append(copy, 'p', 'card-kicker', [cleanPublicText(main.actor), statementDate(main)].filter(Boolean).join(' · '));
        append(copy, 'h3', '', recordProposition(main));
        append(top, 'strong', `reader-claim-status ${adjudication.key}`, adjudication.label);

        const related = groupEntries.filter(([key]) => key !== groupKey).flatMap(([, rows]) => rows.filter(record => record.actor_role === 'ORIGINATOR' || record.relation_type === 'ORIGINATION').slice(0, 1));
        if (related.length) {
          const details = append(card, 'details', 'reader-related-claims');
          append(details, 'summary', '', `Related claims (${related.length})`);
          const list = append(details, 'ul', 'reader-claim-list');
          related.forEach(record => {
            const item = append(list, 'li');
            append(item, 'span', '', recordProposition(record));
            append(item, 'small', '', ` — ${publicAdjudication(record).label}`);
          });
        }

        const repeats = groupRecords.filter(record => record !== main && (record.actor_role === 'AMPLIFIER' || ['REPETITION', 'AMPLIFICATION'].includes(record.relation_type)));
        if (repeats.length) {
          const details = append(card, 'details', 'reader-repeated-by');
          append(details, 'summary', '', `Repeated by (${repeats.length})`);
          const list = append(details, 'ul', 'reader-claim-list');
          repeats.forEach(record => append(list, 'li', '', [cleanPublicText(record.actor || 'Unknown outlet / actor'), statementDate(record)].filter(Boolean).join(' · ')));
          addEvidence(details, context, repeats, 'Sources for repeats');
        }

        const why = append(card, 'details', 'reader-how-we-know');
        append(why, 'summary', '', `How we know it is ${adjudication.label.toLowerCase()}`);
        const explanation = append(why, 'ul', 'reader-explanation-list');
        howWeKnow(main, adjudication).forEach(value => append(explanation, 'li', '', value));
        addEvidence(why, context, [main], 'Evidence sources');
        cards.push(card);
      });
    });

    [...statusKeys.entries()].sort((a, b) => a[1].localeCompare(b[1])).forEach(([key, label]) => {
      const option = append(status, 'option', '', label); option.value = key;
    });
    const resultCount = append(controls, 'p', 'filter-result-count');
    resultCount.setAttribute('aria-live', 'polite');
    const draw = () => {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const hidden = Boolean((query && !card.dataset.readerSearch.includes(query)) || (status.value && card.dataset.readerFinding !== status.value));
        card.hidden = hidden;
        if (!hidden) visible += 1;
      });
      resultCount.textContent = `${visible} of ${cards.length} claims shown`;
    };
    search.addEventListener('input', draw); status.addEventListener('change', draw); draw();

    const methods = append(article, 'p', 'reader-method-link');
    methods.append(documentObject.createTextNode('Want the methodology behind these findings? '));
    const link = append(methods, 'a', '', 'How we check the evidence');
    link.href = base.routeHref('evidence.method');
  }

  function dedupeWeapons(article) {
    const headings = ['Related durable-loss records', 'Aviation reconciliation'];
    let anchor = null;
    headings.forEach(title => {
      const section = findSection(article, title);
      if (section) { if (!anchor) anchor = section; else section.remove(); }
    });
    if (anchor) {
      const replacement = el(article.ownerDocument, 'section', 'content-section reader-crosslink-section');
      append(replacement, 'h2', '', 'Equipment losses and aircraft incidents');
      append(replacement, 'p', '', 'The complete equipment-loss and aviation incident record is kept in one place so the same losses are not repeated on multiple pages.');
      const link = append(replacement, 'a', 'inline-route-link', 'Open Casualties & Losses');
      link.href = base.routeHref('military.losses');
      anchor.replaceWith(replacement);
    }
  }

  function dedupeEconomy(article) {
    const forecast = findSection(article, '2026 growth forecasts');
    if (forecast && article.querySelector('[data-economic-viz]')) forecast.remove();
    const corridors = findSection(article, 'Strategic transport corridors');
    if (corridors) {
      const replacement = el(article.ownerDocument, 'section', 'content-section reader-crosslink-section');
      append(replacement, 'h2', '', 'Transport alternatives');
      append(replacement, 'p', '', 'The route network is maintained on Shipping & Trade. This page focuses on the economic effects and comparable forecast record.');
      const link = append(replacement, 'a', 'inline-route-link', 'Open Shipping & Trade routes');
      link.href = base.routeHref('hormuz.shipping');
      corridors.replaceWith(replacement);
    }
  }

  function simplifyObjectives(article) {
    setPageIntro(article, 'This page compares what each side originally said it wanted with what the evidence shows it has achieved so far. Later narrower goals do not erase the result against the original goal.');
    const method = collapseSection(article, 'Objective benchmarks', 'How objective outcomes are labeled');
    if (method) article.append(method);
  }

  function simplifyPositionChanges(article) {
    setPageIntro(article, 'This page shows what an actor said earlier, what happened next, and what it later said or did. A change is called a walkback only when the record supports a real retreat from the earlier position.');
    const scope = [...article.querySelectorAll(':scope > aside.scope-note')].find(node => /walkback is an analytical classification/i.test(node.textContent || ''));
    if (scope) {
      const details = el(article.ownerDocument, 'details', 'secondary-context reader-method-detail');
      append(details, 'summary', '', 'How we use “walkback”');
      [...scope.children].forEach(child => { if (child.tagName !== 'STRONG') details.append(child); });
      scope.replaceWith(details);
    }
  }

  function simplifyIranMessaging(article) {
    setPageIntro(article, 'This page compares Iran’s earlier statements with what later happened and what Iranian officials then said or did.');
    const scope = [...article.querySelectorAll(':scope > aside.scope-note')].find(node => /threat.*trigger.*outcome/i.test(node.textContent || ''));
    if (scope) {
      const details = el(article.ownerDocument, 'details', 'secondary-context reader-method-detail');
      append(details, 'summary', '', 'How threats are evaluated');
      [...scope.children].forEach(child => { if (child.tagName !== 'STRONG') details.append(child); });
      scope.replaceWith(details);
    }
  }

  function simplifyHormuz(article) {
    setPageIntro(article, 'Iran severely disrupted Hormuz but has not secured internationally recognized exclusive control of the Strait. Current talks concern a shared arrangement and unresolved passage, mine-clearing, inspection and fee rules.');
  }

  function simplifyMou(article) {
    article.querySelectorAll('[data-agreement-balance], .agreement-balance-matrix').forEach(node => node.remove());
    const explorer = findSection(article, 'Read the agreement clause by clause');
    if (explorer) {
      const note = explorer.querySelector('.section-note');
      if (note) note.textContent = 'Open the clauses when you want the agreement detail and supporting sources.';
    }
  }

  function simplifyLosses(article) {
    const duplicateCharts = findSection(article, 'Two views of the material-loss record');
    if (duplicateCharts && article.querySelector('[data-loss-comparison]')) duplicateCharts.remove();
    const comparison = article.querySelector('[data-loss-comparison] .section-note');
    if (comparison) comparison.textContent = 'These summaries count material-loss records by side and type. Open a category to see the records that make up the count. Unknown quantities remain unknown.';
  }

  function applyReaderLayer(rootElement, options, context) {
    const article = rootElement.querySelector('.public-page');
    if (!article) return;
    const routeKey = context.route.key;
    article.dataset.readerLayer = VERSION;
    removeInternalChrome(article, routeKey);
    simplifyFooter(rootElement, context.model, routeKey);
    if (routeKey === 'start.overview') simplifyOverview(article);
    if (routeKey === 'military.campaigns') buildCampaignDrilldown(article, context);
    if (routeKey === 'military.facilities') buildFacilityDashboard(article, context);
    if (routeKey === 'military.weapons') dedupeWeapons(article);
    if (routeKey === 'military.losses') simplifyLosses(article);
    if (routeKey === 'hormuz.overview') simplifyHormuz(article);
    if (routeKey === 'hormuz.economy') dedupeEconomy(article);
    if (routeKey === 'talks.mou') simplifyMou(article);
    if (routeKey === 'objectives.outcomes') simplifyObjectives(article);
    if (routeKey === 'objectives.positions') simplifyPositionChanges(article);
    if (routeKey === 'objectives.iran') simplifyIranMessaging(article);
    if (routeKey === 'evidence.information') rebuildLieLedger(article, context);
    article.querySelectorAll('.evidence-role-guide, .technical-record-metadata').forEach(node => node.remove());
  }

  function makeContext(options) {
    const windowObject = options.windowObject || root;
    const route = base.parseRoute(windowObject.location && windowObject.location.hash);
    const access = options.routeRuntime.forRoute(route);
    return {
      documentObject: options.documentObject || root.document,
      windowObject,
      model: access.model,
      services: access.services,
      state: options.state || {},
      route
    };
  }

  function mount(options) {
    const settings = options || {};
    const controller = base.mount(settings);
    const windowObject = settings.windowObject || root;
    const rootElement = settings.rootElement;
    const apply = () => {
      try { applyReaderLayer(rootElement, settings, makeContext(settings)); }
      catch (error) { if (root.console && root.console.error) root.console.error('Atlas reader layer failed', error); }
    };
    apply();
    const onHashChange = () => {
      if (typeof queueMicrotask === 'function') queueMicrotask(apply);
      else Promise.resolve().then(apply);
    };
    windowObject.addEventListener('hashchange', onHashChange);
    const wrapped = Object.freeze({
      ...controller,
      render: () => { const result = controller.render(); apply(); return result; },
      destroy: () => { windowObject.removeEventListener('hashchange', onHashChange); controller.destroy(); }
    });
    rootElement.__atlasRouteController = wrapped;
    return wrapped;
  }

  const api = Object.freeze({ ...base, mount, READER_LAYER_VERSION: VERSION, readerFacilityStatus: facilityStatus, readerPublicAdjudication: publicAdjudication });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AtlasPublicIA = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
