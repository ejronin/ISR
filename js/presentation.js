(function attachAtlasPresentation(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AtlasPresentation = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildAtlasPresentation() {
  'use strict';

  const EXACT_LABELS = {
    UNCONTESTED: 'UNCONTESTED',
    UNVERIFIED: 'UNCONTESTED',
    REPORTED_NOT_INDEPENDENTLY_VERIFIED: 'UNCONTESTED',
    SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED: 'UNCONTESTED',
    IRANIAN_STATEMENT_NOT_INDEPENDENTLY_VERIFIED: 'UNCONTESTED',
    ACTOR_CLAIM: 'UNCONTESTED CLAIM',
    CONFIRMED_SINKING_CASUALTY_TOTAL_DISPUTED: 'SINKING CONFIRMED — CASUALTY TOTAL CONTESTED',
    NOT_ACCEPTED_AS_CANONICAL_TOTAL_YET: 'NOT ACCEPTED AS A CANONICAL TOTAL',
    NO_REPORTED_DAMAGE_FOUND_IN_REVIEWED_SOURCE_SET: 'NO REPORTED DAMAGE FOUND IN THE REVIEWED SOURCE SET',
    NO_STANDALONE_VERIFIED_EVENT_IN_CURRENT_SOURCE_SET: 'NO STANDALONE VERIFIED EVENT IN THE CURRENT SOURCE SET',
    PRE_WAR_CONTEXT: 'PRE-WAR CONTEXT',
    WARTIME_EVENT: 'WARTIME EVENT',
    SENIOR_POLITICAL_STATE: 'SENIOR POLITICAL / STATE',
    SENIOR_MILITARY_SECURITY: 'SENIOR MILITARY / SECURITY',
    DAMAGED_OR_DESTROYED_UNRESOLVED: 'DAMAGED — DESTRUCTION UNRESOLVED',
    CALCULATED_BOUNDED_MATERIAL_LOSS_ENVELOPE: 'CALCULATED BOUNDED MATERIAL-LOSS ENVELOPE',
    ADDITIVE_TO_MATERIAL_LOSS_TOTAL: 'ADDITIVE TO MATERIAL-LOSS TOTAL'
  };

  function formatMachineToken(token) {
    return EXACT_LABELS[token] || token.replace(/_/g, ' ');
  }

  function formatLabel(value) {
    const text = String(value == null ? '' : value).trim();
    if (!text) return '';
    return text
      .replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, formatMachineToken)
      .replace(/\b(?:SOURCE\s+)?REPORTED\s+NOT\s+INDEPENDENTLY\s+VERIFIED\b/gi, 'UNCONTESTED')
      .replace(/\bIRANIAN\s+STATEMENT\s+NOT\s+INDEPENDENTLY\s+VERIFIED\b/gi, 'UNCONTESTED')
      .replace(/\bUNVERIFIED\b/g, 'UNCONTESTED')
      .replace(/\bUnverified\b/g, 'Uncontested')
      .replace(/\s*;\s*/g, ' • ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function evidenceState(value) {
    const text = String(value || '').toUpperCase();
    if (/\bUNCONTESTED\b/.test(text)) return 'unverified';
    if (/(?:^|\b)(?:CONTESTED|DISPUTED|CONTRADICTED?|MIXED)(?:\b|$)/.test(text)) return 'contested';
    if (/UNVERIFIED|NOT_INDEPENDENT|ACTOR_CLAIM|CLAIMED/.test(text)) return 'unverified';
    if (/INSUFFICIENT/.test(text)) return 'neutral';
    if (/VERIFIED|CONFIRMED|HIGH|SATELLITE|INDEPENDENT/.test(text)) return 'verified';
    if (/SUPPORTED|PROBABLE|LIKELY|MEDIUM|CORROBORAT/.test(text)) return 'supported';
    if (/REPORTED|OFFICIAL|AUTHORITY|SOURCE/.test(text)) return 'reported';
    return 'neutral';
  }

  function evidenceLabel(value) {
    const state = evidenceState(value);
    if (state === 'unverified') return 'UNCONTESTED';
    return state === 'neutral' ? 'UNRESOLVED' : state.toUpperCase();
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
    if (/DAMAGED(?:\s*\/\s*|\s+OR\s+)DESTROYED|DAMAGED_OR_DESTROYED_UNRESOLVED/.test(text)) return 'DAMAGED — DESTRUCTION UNRESOLVED';
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
      let next = original;
      if (/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/.test(next)) next = formatLabel(next);
      next = next
        .replace(/\b(?:Source\s+)?Reported\s+Not\s+Independently\s+Verified\b/gi, 'UNCONTESTED')
        .replace(/\bIranian\s+Statement\s+Not\s+Independently\s+Verified\b/gi, 'UNCONTESTED')
        .replace(/\bUNVERIFIED\b/g, 'UNCONTESTED')
        .replace(/\bUnverified\b/g, 'Uncontested');
      if (next !== original) { node.nodeValue = next; changed += 1; }
    }
    return changed;
  }

  return { formatLabel, evidenceState, evidenceLabel, physicalState, physicalLabel, physicalLabelForValue, facilityEntityState, formatTextNodes };
}));
