(function attachAtlasPresentation(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AtlasPresentation = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildAtlasPresentation() {
  'use strict';

  const EXACT_LABELS = {
    REPORTED_NOT_INDEPENDENTLY_VERIFIED: 'REPORTED — NOT INDEPENDENTLY VERIFIED',
    SOURCE_REPORTED_NOT_INDEPENDENTLY_VERIFIED: 'SOURCE-REPORTED — NOT INDEPENDENTLY VERIFIED',
    IRANIAN_STATEMENT_NOT_INDEPENDENTLY_VERIFIED: 'IRANIAN STATEMENT — NOT INDEPENDENTLY VERIFIED',
    CONFIRMED_SINKING_CASUALTY_TOTAL_DISPUTED: 'SINKING CONFIRMED — CASUALTY TOTAL CONTESTED',
    NOT_ACCEPTED_AS_CANONICAL_TOTAL_YET: 'NOT ACCEPTED AS A CANONICAL TOTAL',
    NO_REPORTED_DAMAGE_FOUND_IN_REVIEWED_SOURCE_SET: 'NO REPORTED DAMAGE FOUND IN THE REVIEWED SOURCE SET',
    NO_STANDALONE_VERIFIED_EVENT_IN_CURRENT_SOURCE_SET: 'NO STANDALONE VERIFIED EVENT IN THE CURRENT SOURCE SET',
    PRE_WAR_CONTEXT: 'PRE-WAR CONTEXT',
    WARTIME_EVENT: 'WARTIME EVENT'
  };

  function formatMachineToken(token) {
    return EXACT_LABELS[token] || token.replace(/_/g, ' ');
  }

  function formatLabel(value) {
    const text = String(value == null ? '' : value).trim();
    if (!text) return '';
    return text
      .replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, formatMachineToken)
      .replace(/\s*;\s*/g, ' • ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function evidenceState(value) {
    const text = String(value || '').toUpperCase();
    if (/CONTESTED|DISPUTED|CONTRADICT|MIXED/.test(text)) return 'contested';
    if (/UNVERIFIED|NOT_INDEPENDENT|ACTOR_CLAIM|CLAIMED|INSUFFICIENT/.test(text)) return 'unverified';
    if (/VERIFIED|CONFIRMED|HIGH|SATELLITE|INDEPENDENT/.test(text)) return 'verified';
    if (/SUPPORTED|PROBABLE|LIKELY|MEDIUM|CORROBORAT/.test(text)) return 'supported';
    if (/REPORTED|OFFICIAL|AUTHORITY|SOURCE/.test(text)) return 'reported';
    return 'supported';
  }

  function evidenceLabel(value) {
    return evidenceState(value).toUpperCase();
  }

  function physicalState(value) {
    const text = String(value || '').toUpperCase();
    if (!text || /UNKNOWN|UNRESOLVED|NOT ESTABLISHED|NO VERIFIED COMPONENT|INSUFFICIENT|NOT APPLICABLE/.test(text)) return 'neutral';
    if (/CONTINUED|RESUMED|RESTORED|REMAINED IN USE|REMAINED OPERATIONAL|STILL OPERAT|OPERATIONAL CONTINUITY|AFFIRMATIVE EVIDENCE|DID NOT (?:INTERFERE|DISRUPT)|CAMPAIGN DIRECTED|DISTRIBUTED (?:CAOC )?OPERATION|NO WHOLE[- ]?(?:BASE|SITE|PLANT|AIRPORT) SHUTDOWN/.test(text)) return 'operational';
    if (/DESTROYED|LOST|SUNK|INOPERABLE|KNOCKOUT|WRITE[- ]?OFF|PERMANENT LOCAL EFFECT|NO LONGER OPERATIONAL/.test(text)) return 'lost';
    if (/DAMAGED|DEGRADED|IMPAIRED|HIT|DISRUPT|PARTIAL|AFFECTED|RELOCATED|REDUCED|SEVERE DAMAGE/.test(text)) return 'degraded';
    return 'neutral';
  }

  function physicalLabel(state) {
    return ({ lost: 'DESTROYED / LOST / INOPERABLE', degraded: 'DAMAGED / DEGRADED', operational: 'OPERATIONAL / CONTINUED', neutral: 'UNKNOWN / UNRESOLVED' })[state] || 'UNKNOWN / UNRESOLVED';
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
      if (!/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/.test(node.nodeValue || '')) continue;
      const next = formatLabel(node.nodeValue);
      if (next !== node.nodeValue) { node.nodeValue = next; changed += 1; }
    }
    return changed;
  }

  return { formatLabel, evidenceState, evidenceLabel, physicalState, physicalLabel, formatTextNodes };
}));
