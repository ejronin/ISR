(function attachAtlasPresentation(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AtlasPresentation = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildAtlasPresentation(root) {
  'use strict';

  const EXACT_LABELS = Object.freeze({
    UNCONTESTED: 'Uncontested',
    CONTESTED: 'Contested',
    UNVERIFIED: 'Unverified',
    CLAIM_ONLY: 'Claim only',
    ACTOR_CLAIM: 'Actor claim',
    UNCONTESTED_CLAIM: 'Uncontested claim',
    CONTESTED_UNVERIFIED: 'Contested / unverified',
    REPORTED_NOT_INDEPENDENTLY_VERIFIED: 'Reported; not independently verified',
    SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED: 'Source reported; not independently verified',
    IRANIAN_STATEMENT_NOT_INDEPENDENTLY_VERIFIED: 'Iranian statement; not independently verified',
    CURRENT_PRESENCE_REPORTED_OPERATIONAL_EFFECT_NOT_PUBLIC: 'Current presence reported; operational effect not public',
    NO_WHOLE_SITE_SHUTDOWN_REPORTED: 'No whole-site shutdown reported',
    STATE_OR_OFFICIAL: 'Official or state source',
    NO_STATE_LABEL: 'No official/state label',
    DAMAGED_OR_DESTROYED_UNRESOLVED: 'Damaged; destruction unresolved',
    CONFIRMED_SINKING_CASUALTY_TOTAL_DISPUTED: 'Sinking confirmed; casualty total contested',
    NOT_ACCEPTED_AS_CANONICAL_TOTAL_YET: 'Not accepted as a canonical total',
    NO_REPORTED_DAMAGE_FOUND_IN_REVIEWED_SOURCE_SET: 'No reported damage found in the reviewed source set',
    NO_STANDALONE_VERIFIED_EVENT_IN_CURRENT_SOURCE_SET: 'No standalone verified event in the current source set',
    PRE_WAR_CONTEXT: 'Pre-war context',
    WARTIME_EVENT: 'Wartime event',
    SENIOR_POLITICAL_STATE: 'Senior political / state',
    SENIOR_MILITARY_SECURITY: 'Senior military / security',
    CALCULATED_BOUNDED_MATERIAL_LOSS_ENVELOPE: 'Calculated bounded material-loss envelope',
    ADDITIVE_TO_MATERIAL_LOSS_TOTAL: 'Additive to material-loss total',
    SUPPORTED_WITH_LIMITATIONS: 'Supported with limitations',
    STATEMENT_OR_POLICY_CONFIRMED: 'Statement or policy confirmed',
    SOURCE_REPORTED: 'Source reported',
    DATE_ONLY: 'Date only',
    CITY_OR_FACILITY_REFERENCE: 'City or facility reference',
    COUNTRY_OR_THEATER: 'Country or theater',
    HISTORICAL_COVERAGE_RECONCILIATION: 'Historical coverage reconciliation',
    CURRENT_OVERLAY: 'Current overlay',
    HISTORICAL_RECONCILIATION: 'Historical reconciliation'
  });

  const ABBREVIATIONS = new Map([
    ['ais', 'AIS'], ['bda', 'BDA'], ['caoc', 'CAOC'], ['centcom', 'CENTCOM'], ['c2', 'C2'],
    ['gcc', 'GCC'], ['id', 'ID'], ['idf', 'IDF'], ['irgc', 'IRGC'], ['isr', 'ISR'], ['mou', 'MOU'],
    ['osint', 'OSINT'], ['u.s.', 'U.S.'], ['us', 'US'], ['usa', 'USA'], ['uae', 'UAE'], ['uk', 'UK'],
    ['un', 'UN'], ['uas', 'UAS'], ['url', 'URL'], ['urls', 'URLs']
  ]);

  const MACHINE_TOKEN_RE = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
  const MACHINE_TOKEN_TEST_RE = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/;

  function titleWord(word, index) {
    const raw = String(word || '');
    const lower = raw.toLowerCase();
    if (ABBREVIATIONS.has(lower)) return ABBREVIATIONS.get(lower);
    if (/^\d+$/.test(raw)) return raw;
    if (index === 0 && raw) return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    return raw.toLowerCase();
  }

  function humanizePart(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const exact = EXACT_LABELS[text];
    if (exact) return exact;
    const words = text.replace(/_/g, ' ').replace(/\s+/g, ' ').split(' ');
    return words.map(titleWord).join(' ')
      .replace(/\bpre war\b/gi, 'pre-war')
      .replace(/\bwhole site\b/gi, 'whole-site')
      .replace(/\bmaterial loss\b/gi, 'material-loss');
  }

  function formatMachineToken(token) {
    const exact = EXACT_LABELS[token];
    if (exact) return exact;
    return token.split('/').map(part => humanizePart(part)).join(' / ');
  }

  function formatLabel(value) {
    const text = String(value == null ? '' : value).trim();
    if (!text) return '';
    if (EXACT_LABELS[text]) return EXACT_LABELS[text];

    let next = text.replace(MACHINE_TOKEN_RE, formatMachineToken);
    next = next
      .replace(/\bSource\s+Reported\s+Not\s+Independently\s+Verified\b/gi, 'Source reported; not independently verified')
      .replace(/\bReported\s+Not\s+Independently\s+Verified\b/gi, 'Reported; not independently verified')
      .replace(/\bIranian\s+Statement\s+Not\s+Independently\s+Verified\b/gi, 'Iranian statement; not independently verified')
      .replace(/\s*;\s*/g, '; ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (/^[A-Z0-9][A-Z0-9 .\-/]+$/.test(next) && /[A-Z]{2}/.test(next)) {
      next = next.split(/(\s+\/\s+|\s+—\s+)/).map((part, index) => {
        if (/^\s+(?:\/|—)\s+$/.test(part)) return part;
        return humanizePart(part.replace(/ /g, '_'));
      }).join('');
    }
    return next;
  }

  function disputePosture(value) {
    const text = String(value || '').toUpperCase();
    if (/(?:^|\b)(?:CONTESTED|DISPUTED|CONTRADICTED?|HOST[-_ ]NATION CONTRADICTION|MIXED)(?:\b|$)/.test(text)) return 'contested';
    if (/\bUNCONTESTED\b|NO (?:IDENTIFIED|LOCATED|PUBLIC) DISPUTE|NOT DISPUTED/.test(text)) return 'uncontested';
    return 'unresolved';
  }

  function evidenceSupport(value) {
    const text = String(value || '').toUpperCase();
    if (!text) return 'unresolved';

    if (/\bCLAIM_ONLY\b|\bCLAIM ONLY\b|\bACTOR_CLAIM\b|\bACTOR CLAIM\b|CLAIMANT (?:ITSELF|ONLY)|ONLY SUBSTANTIVE EVIDENCE/.test(text)) return 'claim-only';
    if (/NOT[_ ]INDEPENDENTLY[_ ]VERIFIED|\bUNVERIFIED\b|INSUFFICIENT|UNKNOWN|UNRESOLVED|NOT ESTABLISHED|NO VERIFIED|EVIDENCE NOT PUBLIC|EFFECT NOT PUBLIC/.test(text)) return 'unresolved';
    if (/\bVERIFIED\b|\bCONFIRMED\b|AUTHENTICATED|CONCLUSIVE|PHYSICAL EVIDENCE|\bBDA\b|INDEPENDENTLY VERIFIED/.test(text)) return 'verified';
    if (/\bSUPPORTED\b|SUPPORTED_WITH_LIMITATIONS|CORROBORAT|PROBABLE|LIKELY|\bMEDIUM\b|\bMODERATE\b|INDEPENDENT EVIDENCE/.test(text)) return 'supported';
    if (/\bCLAIMED\b|\bREPORTED\b|OFFICIAL CLAIM|SOURCE REPORTED|STATEMENT/.test(text)) return 'claim-only';
    return 'unresolved';
  }

  function disputeLabel(value) {
    const posture = typeof value === 'string' && ['uncontested', 'contested', 'unresolved'].includes(value) ? value : disputePosture(value);
    return ({ uncontested: 'UNCONTESTED', contested: 'CONTESTED', unresolved: 'DISPUTE POSTURE UNRESOLVED' })[posture];
  }

  function supportLabel(value) {
    const support = typeof value === 'string' && ['claim-only', 'supported', 'verified', 'unresolved'].includes(value) ? value : evidenceSupport(value);
    return ({ 'claim-only': 'CLAIM ONLY', supported: 'SUPPORTED', verified: 'VERIFIED', unresolved: 'UNRESOLVED' })[support];
  }

  function evidenceSemantics(value) {
    const posture = disputePosture(value);
    const support = evidenceSupport(value);
    let publicLabel = supportLabel(support);
    if (support === 'unresolved' && posture === 'contested') publicLabel = 'CONTESTED / UNVERIFIED';
    else if (support === 'unresolved' && posture === 'uncontested') publicLabel = 'UNCONTESTED CLAIM';
    else if (support === 'claim-only' && posture === 'uncontested') publicLabel = 'UNCONTESTED CLAIM · CLAIM ONLY';
    return { posture, support, disputeLabel: disputeLabel(posture), supportLabel: supportLabel(support), publicLabel };
  }

  function evidenceState(value) {
    const semantics = evidenceSemantics(value);
    if (semantics.support === 'verified') return 'verified';
    if (semantics.support === 'supported') return 'supported';
    if (semantics.posture === 'contested') return 'contested';
    if (semantics.support === 'claim-only' || semantics.posture === 'uncontested') return 'unverified';
    return 'neutral';
  }

  function evidenceLabel(value) {
    return evidenceSemantics(value).publicLabel;
  }

  function physicalState(value) {
    const text = String(value || '').toUpperCase();
    if (!text) return 'neutral';
    if (/DAMAGED(?:\s*\/\s*|\s+OR\s+)DESTROYED|DAMAGED_OR_DESTROYED_UNRESOLVED/.test(text)) return 'degraded';
    if (/NO (?:REVIEWED )?SOURCE REPORTS?(?: THE)? (?:WHOLE[- ]?)?(?:BASE|SITE|PLANT|AIRPORT).*STOPPED OPERATING|NO (?:REVIEWED )?SOURCE REPORTS? (?:WHOLE[- ]?)?(?:BASE|SITE|PLANT|AIRPORT) SHUTDOWN|WHOLE[- ]?(?:BASE|SITE|PLANT|AIRPORT) (?:INCAPACITY|SHUTDOWN) NOT SUPPORTED/.test(text)) return 'neutral';
    if (/UNKNOWN|UNRESOLVED|NOT ESTABLISHED|NO VERIFIED COMPONENT|INSUFFICIENT|NOT APPLICABLE/.test(text)) return 'neutral';
    if (/CONTINUED|RESUMED|RESTORED|REMAINED IN USE|REMAINED OPERATIONAL|STILL OPERAT|OPERATIONAL CONTINUITY|AFFIRMATIVE EVIDENCE|CAMPAIGN DIRECTED|DISTRIBUTED (?:CAOC )?OPERATION|FLIGHTS? RESUMED|TROOPS? (?:LATER )?PRESENT|SORTIES CONTINUED|LOGISTICS CONTINUED|COMMAND FUNCTION OPERATING/.test(text)) return 'operational';
    if (/DID NOT (?:INTERFERE|DISRUPT)/.test(text) && /OPERATION|SORTIE|FLIGHT|LOGISTIC|COMMAND|CAMPAIGN|FUNCTION/.test(text)) return 'operational';
    if (/DESTROYED|LOST|SUNK|INOPERABLE|KNOCKOUT|WRITE[- ]?OFF|PERMANENT LOCAL EFFECT|NO LONGER OPERATIONAL/.test(text)) return 'lost';
    if (/DAMAGED|DEGRADED|IMPAIRED|HIT|DISRUPT|PARTIAL|AFFECTED|RELOCATED|REDUCED|SEVERE DAMAGE/.test(text)) return 'degraded';
    return 'neutral';
  }

  function physicalLabel(state) {
    return ({ lost: 'DESTROYED / LOST / INOPERABLE', degraded: 'DAMAGED / DEGRADED', operational: 'OPERATIONAL / CONTINUED', neutral: 'UNKNOWN / UNRESOLVED' })[state] || 'UNKNOWN / UNRESOLVED';
  }

  function physicalLabelForValue(value) {
    const text = String(value || '').toUpperCase();
    if (/DAMAGED(?:\s*\/\s*|\s+OR\s+)DESTROYED|DAMAGED_OR_DESTROYED_UNRESOLVED/.test(text)) return 'DAMAGED; DESTRUCTION UNRESOLVED';
    return physicalLabel(physicalState(value));
  }

  function facilityEntityState(record) {
    const facility = record || {};
    const physical = facility.verified_physical_damage || facility.physical_damage || [];
    const effects = facility.verified_functional_effect || facility.functional_effect || [];
    const continuity = facility.continued_operation_evidence || facility.continuity_evidence || [];
    const physicalValues = Array.isArray(physical) ? physical : [physical];
    const effectValues = Array.isArray(effects) ? effects : [effects];
    const continuityValues = Array.isArray(continuity) ? continuity : [continuity];
    const wholeText = [facility.facility_level_status, facility.entity_status, facility.current_status, facility.assessment].filter(Boolean).join(' ').toUpperCase();
    const wholeLost = /(?:WHOLE|ENTIRE|FACILITY|BASE|SITE|PLANT|AIRPORT)[\s\S]{0,45}(?:DESTROYED|LOST|INOPERABLE|NO LONGER OPERATIONAL)/.test(wholeText) &&
      !/(?:NOT SUPPORTED|NOT ESTABLISHED|NO (?:REVIEWED )?SOURCE|COMPONENT|SUBFACILITY|CAOC)/.test(wholeText);
    if (wholeLost) return 'lost';
    const componentStates = physicalValues.concat(effectValues).map(physicalState);
    if (componentStates.includes('lost') || componentStates.includes('degraded')) return 'degraded';
    if (continuityValues.some(value => physicalState(value) === 'operational')) return 'operational';
    return 'neutral';
  }

  function isMachineToken(value) {
    return MACHINE_TOKEN_TEST_RE.test(String(value || ''));
  }

  function formatTextNodes(rootNode) {
    if (!rootNode || !rootNode.ownerDocument) return 0;
    const doc = rootNode.ownerDocument;
    const walker = doc.createTreeWalker(rootNode, 4);
    let changed = 0;
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(parent.tagName)) continue;
      const original = node.nodeValue || '';
      const next = isMachineToken(original) ? formatLabel(original) : original;
      if (next !== original) { node.nodeValue = next; changed += 1; }
    }
    return changed;
  }

  function formatPublicDom(rootNode) {
    if (!rootNode || !rootNode.ownerDocument) return 0;
    let changed = formatTextNodes(rootNode);
    const attrs = ['title', 'aria-label', 'placeholder'];
    rootNode.querySelectorAll?.('*').forEach(node => {
      if (/^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(node.tagName)) return;
      attrs.forEach(attr => {
        if (!node.hasAttribute(attr)) return;
        const original = node.getAttribute(attr) || '';
        if (!isMachineToken(original)) return;
        const next = formatLabel(original);
        if (next !== original) { node.setAttribute(attr, next); changed += 1; }
      });
    });
    return changed;
  }

  function cutoffDisplay(value) {
    const text = String(value || '');
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return text || 'cutoff unresolved';
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    return `${months[Number(match[2]) - 1]} ${Number(match[3])}, ${match[4]}:${match[5]} ET`;
  }

  function freshness(context) {
    const ctx = context || root || {};
    const historical = ctx.ATLAS_WIKI_RECON_20260826;
    const current26 = ctx.ATLAS_CURRENT_UPDATE_20260826;
    const current25Late = ctx.ATLAS_CURRENT_UPDATE_20260825_LATE;
    const runtimeCount = Number(historical?.counts?.runtime_chronology) || Number(ctx.ATLAS_TEMPORAL_INDEX?.length) || Number(current26?.manifest?.counts?.current_chronology_records) || Number(current25Late?.manifest?.counts?.current_chronology_records) || 0;
    const cutoff = historical ? '2026-08-26T16:30:00-04:00' : (current26?.cutoff || current25Late?.cutoff || '');
    const display = cutoffDisplay(cutoff);
    return {
      historicalBaseCount: 98,
      historicalReconciliationCount: historical ? 81 : 0,
      chronologyCount: runtimeCount,
      currentOsintCutoff: cutoff,
      currentOsintDisplay: display,
      summary: runtimeCount && cutoff ? `${runtimeCount} chronology records loaded · current OSINT reviewed through ${display}` : ''
    };
  }

  function applyFreshnessDisplay(doc, context) {
    if (!doc) return freshness(context);
    const resolved = freshness(context || doc.defaultView || root);
    if (!resolved.chronologyCount) return resolved;
    doc.querySelectorAll('[data-current-chronology-count]').forEach(node => { node.textContent = String(resolved.chronologyCount); });
    doc.querySelectorAll('[data-historical-base-count]').forEach(node => { node.textContent = String(resolved.historicalBaseCount); });
    doc.querySelectorAll('.kpi.info').forEach(kpi => {
      if (!/chronology records/i.test(kpi.textContent || '')) return;
      const b = kpi.querySelector('b');
      const span = kpi.querySelector('span');
      if (b) b.textContent = String(resolved.chronologyCount);
      if (span) span.textContent = 'chronology records loaded';
    });
    const badge = doc.querySelector('.isr-current-overlay-badge');
    if (badge) badge.textContent = resolved.summary;
    const stamp = doc.querySelector('.review-stamp');
    if (stamp) stamp.textContent = `Current OSINT reviewed through ${resolved.currentOsintDisplay}`;
    const strip = doc.querySelector('#timeline .isr-current-strip span');
    if (strip) strip.textContent = resolved.summary;
    return resolved;
  }

  return {
    EXACT_LABELS,
    formatMachineToken,
    formatLabel,
    disputePosture,
    disputeLabel,
    evidenceSupport,
    supportLabel,
    evidenceSemantics,
    evidenceState,
    evidenceLabel,
    physicalState,
    physicalLabel,
    physicalLabelForValue,
    facilityEntityState,
    isMachineToken,
    formatTextNodes,
    formatPublicDom,
    cutoffDisplay,
    freshness,
    applyFreshnessDisplay
  };
}));
