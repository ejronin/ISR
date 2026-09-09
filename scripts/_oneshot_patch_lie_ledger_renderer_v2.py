#!/usr/bin/env python3
"""One-shot deterministic patch for the Lie Ledger v2 public renderer.

This script is intentionally self-removing via its paired workflow. It changes
only the legacy Lie Ledger helper/page-owner blocks and a few reader-facing
labels in js/public-ia.js. Any unexpected source shape fails closed.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "js/public-ia.js"


def replace_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"FAIL: expected exactly one {label} block; found {count}")
    return updated


KNOWLEDGE_HELPER = r'''  function knowledgeJudgmentDisplay(record) {
    const raw = firstText(record && record.public_knowledge_judgment, record && record.knowledge_judgment);
    const labels = {
      NOT_ASSESSED: 'Not assessed',
      NOT_ASSESSABLE: 'Not assessable',
      INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
      POSSIBLE_KNOWLEDGE: 'Possible knowledge',
      LIKELY_KNEW_FALSE: 'Likely knew false',
      VERY_LIKELY_KNEW_FALSE: 'Very likely knew false',
      KNOWING_FALSEHOOD_ESTABLISHED: 'Knowing falsehood established',
      WITHHELD_PENDING_EVIDENCE_QUALIFICATION: 'Evidence completion required'
    };
    return labels[String(raw || '').toUpperCase()] || publicNarrative(raw, 'Not assessed');
  }

'''

V2_INFORMATION_PAGE = r'''  function InformationEnvironmentPage(context) {
    const frame = pageFrame(context, 'Factual status and knowledge are separate assessments. A false statement is not automatically a deliberate lie. Atlas shows ROOK’s substantive adjudication separately from PR/CI evidence qualification.');
    const ledgerModel = modelData(context.model, 'gate3.lie_ledger') || {};
    const ledgerChains = asArray(ledgerModel.records);
    const propositions = ledgerChains.flatMap(chainRecord => asArray(chainRecord.proposition_records));
    const families = recordArray(modelData(context.model, 'gate3.narrative_families'));
    const chains = recordArray(modelData(context.model, 'gate3.information_chains'));
    const reliability = recordArray(modelData(context.model, 'gate3.source_reliability'));

    const boundary = addSection(frame.article, 'How the ledger reaches a finding', 'content-section lie-ledger-boundary');
    append(boundary, 'p', 'lead-copy', 'Factual status and knowledge are separate assessments. A false statement is not automatically a deliberate lie. Knowledge may be estimated from direct or circumstantial evidence, including what an institution controlled, possessed, observed, corrected, repeated, or contradicted.');
    const authority = append(boundary, 'aside', 'scope-note knowledge-boundary');
    append(authority, 'strong', '', 'ROOK verdict / PR/CI evidence boundary');
    append(authority, 'p', '', 'ROOK owns the factual and knowledge judgments. PR/CI qualifies whether the public Evidence drawer supports those judgments. If that support is incomplete, Atlas shows EVIDENCE COMPLETION REQUIRED and withholds the canonical knowledge conclusion rather than weakening it.');
    const flow = append(boundary, 'ol', 'claim-event-tree');
    ['What was said', 'What the evidence showed at the time', 'What the claimant could reasonably know', 'Corrections, repetitions and substitutions', 'Factual verdict', 'Knowledge judgment', 'Combined ROOK assessment'].forEach(step => append(flow, 'li', '', step));

    const section = addSection(frame.article, 'Narrative and proposition chains');
    append(section, 'p', 'section-note', `${ledgerChains.length.toLocaleString()} narrative / proposition chains contain ${propositions.length.toLocaleString()} claim instances in the current public model. Amplification and correction remain distinct from unique propositions.`);
    const controls = append(section, 'form', 'lie-ledger-controls');
    controls.addEventListener('submit', event => event.preventDefault());
    const searchLabel = append(controls, 'label', '', 'Search claims');
    const search = append(searchLabel, 'input'); search.type = 'search'; search.placeholder = 'Search propositions, claimants or narrative chains';
    const truthLabel = append(controls, 'label', '', 'Factual verdict');
    const truth = append(truthLabel, 'select'); append(truth, 'option', '', 'All factual verdicts').value = '';
    Array.from(new Set(propositions.map(record => record.truth_adjudication).filter(Boolean))).sort().forEach(value => { const option = append(truth, 'option', '', propositionStatusLabel(value)); option.value = value; });
    const knowledgeLabel = append(controls, 'label', '', 'Knowledge judgment');
    const knowledge = append(knowledgeLabel, 'select'); append(knowledge, 'option', '', 'All knowledge judgments').value = '';
    Array.from(new Set(propositions.map(record => record.public_knowledge_judgment).filter(Boolean))).sort().forEach(value => { const option = append(knowledge, 'option', '', knowledgeJudgmentDisplay({ public_knowledge_judgment: value })); option.value = value; });
    const relationLabel = append(controls, 'label', '', 'Claim relationship');
    const relation = append(relationLabel, 'select'); append(relation, 'option', '', 'All claim relationships').value = '';
    Array.from(new Set(propositions.map(record => record.actor_role || record.relation_type).filter(Boolean))).sort().forEach(value => { const option = append(relation, 'option', '', plainLabel(value)); option.value = value; });
    const count = append(controls, 'p', 'filter-result-count'); count.setAttribute('aria-live', 'polite');
    const chainHost = append(section, 'div', 'lie-ledger-chain-list');

    const evidenceComponentLabels = {
      what_was_said: 'What was said',
      factual_baseline: 'Factual baseline',
      contemporaneous_state: 'Contemporaneous evidence state',
      knowledge_access: 'Claimant knowledge access',
      knowledge_indicators: 'Knowledge indicators',
      contrary_evidence: 'Contrary evidence',
      corrections: 'Corrections',
      repetitions: 'Repetitions / amplification',
      credible_alternative: 'Credible alternative',
      comparative_inference: 'Comparative inference',
      falsifier: 'Falsifier'
    };
    const temporalText = value => {
      if (!value) return 'Not established';
      if (typeof value === 'string') return publicNarrative(value);
      if (typeof value !== 'object') return String(value);
      return firstText(value.iso, value.datetime, value.timestamp, value.date_time, value.date, value.time, value.value) || publicNarrative(JSON.stringify(value));
    };
    const renderStringList = (host, title, values, className) => {
      const rows = asArray(values).filter(Boolean);
      if (!rows.length) return;
      const block = append(host, 'section', className || 'lie-ledger-analysis-block');
      append(block, 'h4', '', title);
      const list = append(block, 'ul', 'method-list'); rows.forEach(value => append(list, 'li', '', publicNarrative(typeof value === 'string' ? value : value.summary || value.alternative || value.basis || JSON.stringify(value))));
    };

    const renderLedger = () => {
      const query = search.value.trim().toLowerCase();
      const visibleChains = ledgerChains.map(chainRecord => {
        const propositionRecords = asArray(chainRecord.proposition_records).filter(record => !query || JSON.stringify(record).toLowerCase().includes(query) || JSON.stringify(chainRecord).toLowerCase().includes(query)).filter(record => !truth.value || record.truth_adjudication === truth.value).filter(record => !knowledge.value || record.public_knowledge_judgment === knowledge.value).filter(record => !relation.value || (record.actor_role || record.relation_type) === relation.value);
        return { chainRecord, propositionRecords };
      }).filter(entry => entry.propositionRecords.length);
      chainHost.replaceChildren();
      let visiblePropositions = 0;
      visibleChains.forEach(({ chainRecord, propositionRecords }) => {
        const chainDetails = append(chainHost, 'details', 'lie-ledger-chain');
        chainDetails.dataset.chainId = chainRecord.chain_id || 'UNASSIGNED_CHAIN';
        const chainSummary = append(chainDetails, 'summary', 'lie-ledger-chain-summary');
        const chainCopy = append(chainSummary, 'span', 'lie-ledger-summary-copy');
        append(chainCopy, 'span', 'card-kicker', `${propositionRecords.length.toLocaleString()} claim instance${propositionRecords.length === 1 ? '' : 's'} · ${asArray(chainRecord.proposition_ids).length.toLocaleString()} proposition ID${asArray(chainRecord.proposition_ids).length === 1 ? '' : 's'}`);
        append(chainCopy, 'strong', '', publicNarrative(chainRecord.narrative_family_id || chainRecord.chain_id, 'Narrative / proposition chain'));
        append(chainCopy, 'small', '', asArray(chainRecord.claimants).length ? `Claimants: ${asArray(chainRecord.claimants).map(value => publicNarrative(value)).join(' · ')}` : 'Claimant unresolved');
        const chainBody = append(chainDetails, 'div', 'lie-ledger-chain-body');
        const chronology = asArray(chainRecord.chronology);
        if (chronology.length) {
          const chronologyBlock = append(chainBody, 'section', 'lie-ledger-chain-chronology');
          append(chronologyBlock, 'h4', '', 'Chain chronology');
          const chronologyList = append(chronologyBlock, 'ol', 'method-list');
          chronology.forEach(item => append(chronologyList, 'li', '', [temporalText(item.statement_time), publicNarrative(item.actor_role || item.relation_type, ''), publicNarrative(item.claim_instance_id, '')].filter(Boolean).join(' · ')));
        }
        if (asArray(chainRecord.publication_blockers).length) renderStringList(chainBody, 'Chain evidence qualification', chainRecord.publication_blockers, 'lie-ledger-chain-blockers');
        const list = append(chainBody, 'div', 'lie-ledger-proposition-list');
        propositionRecords.forEach(record => {
          visiblePropositions += 1;
          const details = append(list, 'details', 'lie-ledger-record');
          details.dataset.claimInstanceId = record.claim_instance_id || '';
          details.dataset.propositionId = record.proposition_id || '';
          details.dataset.truthAdjudication = String(record.truth_adjudication || '');
          details.dataset.knowledgeJudgment = String(record.public_knowledge_judgment || '');
          details.dataset.combinedAssessment = String(record.public_combined_assessment || '');
          details.dataset.publicationStatus = String(record.publication_status || '');
          details.dataset.actorRole = String(record.actor_role || '');
          details.dataset.relationType = String(record.relation_type || '');
          const summary = append(details, 'summary', 'lie-ledger-summary');
          const heading = append(summary, 'span', 'lie-ledger-summary-copy');
          append(heading, 'span', 'card-kicker', `${propositionStatusLabel(record.truth_adjudication)} · ${knowledgeJudgmentDisplay(record)}`);
          append(heading, 'strong', '', publicNarrative(record.proposition || record.claim, record.proposition_id));
          append(heading, 'small', '', `${publicNarrative(record.actor, 'Claimant unresolved')} · ${plainLabel(record.actor_role || record.relation_type, 'Relationship unresolved')}`);
          const body = append(details, 'article', 'record-card lie-ledger-detail');
          appendActorIdentities(body, context, [record.actor || 'Claimant unresolved']);
          addFactList(body, [
            ['Claim', publicNarrative(record.claim)],
            ['Testable proposition', publicNarrative(record.proposition)],
            ['Claimant / originator', publicNarrative(record.actor, 'Unresolved in the record')],
            ['Actor role', plainLabel(record.actor_role || record.relation_type, 'Not separately resolved')],
            ['Statement time', temporalText(record.statement_time)],
            ['Event time', temporalText(record.event_time)],
            ['Factual verdict', propositionStatusLabel(record.truth_adjudication)],
            ['Knowledge judgment', knowledgeJudgmentDisplay(record)],
            ['Combined ROOK assessment', record.public_combined_assessment || 'Not yet ROOK reassessed'],
            ['Proposition fidelity', plainLabel(record.proposition_fidelity, 'Unresolved')],
            ['Narrative function', firstText(record.narrative_function) ? publicNarrative(record.narrative_function) : null],
            ['Confidence', plainLabel(record.confidence, 'Unresolved')],
            ['Narrative family / chain', [record.narrative_family_id, record.chain_id].filter(Boolean).map(publicNarrative).join(' · ')],
            ['Publication qualification', record.publication_status === 'BLOCKED_EVIDENCE_COMPLETION' ? 'EVIDENCE COMPLETION REQUIRED' : plainLabel(record.publication_status, 'Public qualification not separately recorded')]
          ]);
          renderStringList(body, 'Observed facts', record.observed_facts, 'lie-ledger-observed-facts');
          if (record.analytic_inference) { const inference = append(body, 'section', 'lie-ledger-analysis-block rook-inference'); append(inference, 'h4', '', 'ROOK analytical inference'); append(inference, 'p', '', publicNarrative(record.analytic_inference)); }
          if (asArray(record.knowledge_indicators).length) {
            const indicatorBlock = append(body, 'section', 'lie-ledger-analysis-block knowledge-indicator-block'); append(indicatorBlock, 'h4', '', 'Knowledge indicators'); const indicatorList = append(indicatorBlock, 'ul', 'method-list');
            asArray(record.knowledge_indicators).forEach(indicator => append(indicatorList, 'li', '', [plainLabel(indicator.indicator || indicator.type, 'Indicator'), publicNarrative(indicator.summary || indicator.basis, ''), indicator.direction ? plainLabel(indicator.direction) : '', indicator.strength ? `Strength: ${plainLabel(indicator.strength)}` : ''].filter(Boolean).join(' · ')));
          }
          if (asArray(record.credible_alternatives).length) {
            const alternativeBlock = append(body, 'section', 'lie-ledger-analysis-block credible-alternative-block'); append(alternativeBlock, 'h4', '', 'Credible alternative'); const alternativeList = append(alternativeBlock, 'ul', 'method-list');
            asArray(record.credible_alternatives).forEach(alternative => append(alternativeList, 'li', '', [publicNarrative(alternative.alternative || alternative.basis || alternative), alternative.comparative_weight ? `Comparative weight: ${plainLabel(alternative.comparative_weight)}` : '', alternative.basis && alternative.alternative ? publicNarrative(alternative.basis) : ''].filter(Boolean).join(' · ')));
          }
          if (record.comparative_assessment) { const comparison = append(body, 'section', 'lie-ledger-analysis-block comparative-inference-block'); append(comparison, 'h4', '', 'ROOK comparative inference'); append(comparison, 'p', '', publicNarrative(record.comparative_assessment)); }
          renderStringList(body, 'Falsifier / what would change the assessment', record.falsifier, 'lie-ledger-falsifier');
          const support = record.evidence_support && typeof record.evidence_support === 'object' ? record.evidence_support : {};
          Object.entries(evidenceComponentLabels).forEach(([key, label]) => {
            const refs = asArray(support[key]).filter(value => typeof value === 'string');
            if (!refs.length) return;
            const component = append(body, 'section', 'evidence-component');
            component.dataset.evidenceComponent = key;
            append(component, 'h4', '', label);
            component.append(EvidenceDrawer.create(context, { source_ids: refs }));
          });
          const componentRefs = new Set(Object.values(support).flatMap(value => asArray(value)).filter(value => typeof value === 'string'));
          const residualRefs = asArray(record.source_ids).filter(value => typeof value === 'string' && !componentRefs.has(value));
          if (residualRefs.length) { const residual = append(body, 'section', 'evidence-component'); residual.dataset.evidenceComponent = 'additional_source_context'; append(residual, 'h4', '', 'Additional source context'); residual.append(EvidenceDrawer.create(context, { source_ids: residualRefs })); }
        });
      });
      count.textContent = `${visiblePropositions.toLocaleString()} of ${propositions.length.toLocaleString()} claim instances shown in ${visibleChains.length.toLocaleString()} of ${ledgerChains.length.toLocaleString()} narrative / proposition chains`;
      if (!visibleChains.length) append(chainHost, 'p', 'empty-state', 'No narrative / proposition chains match these filters.');
    };
    search.addEventListener('input', renderLedger); [truth, knowledge, relation].forEach(control => control.addEventListener('change', renderLedger)); renderLedger();

    const familySection = addSection(frame.article, 'Recurring narrative families');
    append(familySection, 'p', 'section-note', 'A family links repeated or potentially recycled stories. A family relationship does not itself establish falsity, coordination, or deceptive knowledge.');
    const familyDetails = append(familySection, 'details', 'secondary-context narrative-family-directory'); append(familyDetails, 'summary', '', `Browse ${families.length.toLocaleString()} narrative families`);
    const familyList = append(familyDetails, 'div', 'record-list two-column-list'); families.forEach(record => { const card = addProvenanceCard(familyList, context, { kicker: plainLabel(record.status, 'Status recorded'), title: publicNarrative(record.claim_family), text: 'This family remains linked for cross-iteration reconstruction; its status is not promoted into a factual or knowledge finding.', item: record }); card.dataset.narrativeFamilyId = record.narrative_family_id; });

    const chainSection = addSection(frame.article, 'Legacy information-chain reconstruction');
    append(chainSection, 'p', 'section-note', 'These preserved chain records remain supporting context. The v2 narrative / proposition chain above is the primary public object and controls current proposition counting.');
    const chainDetails = append(chainSection, 'details', 'secondary-context information-chain-directory'); append(chainDetails, 'summary', '', `Browse ${chains.length.toLocaleString()} information chains`);
    const legacyChainList = append(chainDetails, 'div', 'record-list'); chains.forEach(record => { const chainRecords = asArray(record.records); const sources = [...new Set(chainRecords.flatMap(item => [item.source_id, ...asArray(item.later_evidence)]).filter(Boolean))]; const card = addProvenanceCard(legacyChainList, context, { kicker: `${chainRecords.length.toLocaleString()} linked record${chainRecords.length === 1 ? '' : 's'}`, title: publicNarrative(record.information_chain_id, 'Information chain'), text: chainRecords.length ? `${publicNarrative(chainRecords[0].exact_translated_claim || chainRecords[0].proposition, 'Original claim recorded')}${chainRecords[chainRecords.length - 1].subsequent_iranian_revision ? ` Later revision: ${publicNarrative(chainRecords[chainRecords.length - 1].subsequent_iranian_revision)}` : ''}` : 'No linked records are exposed in this chain.', item: { source_ids: sources } }); card.dataset.informationChainId = record.information_chain_id; });

    const reliabilitySection = addSection(frame.article, 'Descriptive source history');
    append(reliabilitySection, 'p', 'section-note', 'These counts describe propositions adjudicated in this corpus. They are not a probability that a future claim is true, and they do not by themselves establish deceptive knowledge.');
    const reliabilityDetails = append(reliabilitySection, 'details', 'secondary-context reliability-directory'); append(reliabilityDetails, 'summary', '', `Browse ${reliability.length.toLocaleString()} source and claimant histories`);
    const reliabilityList = append(reliabilityDetails, 'div', 'record-list two-column-list'); reliability.forEach(record => { const outcomes = Object.entries(record.proposition_outcomes || {}).map(([label, value]) => `${plainLabel(label)}: ${formatNumber(value)}`).join(' · '); const card = addProvenanceCard(reliabilityList, context, { kicker: plainLabel(record.subject_type, 'Recorded subject'), title: publicNarrative(record.display_name || record.subject_id_or_name), text: outcomes || 'No proposition outcomes recorded.', meta: `${formatNumber(record.correction_count)} corrections recorded · ${formatNumber(record.claim_count)} claims reviewed`, item: record }); card.dataset.reliabilityId = record.reliability_id; });

    const legacyClaims = modelData(context.model, 'analysis.information_war_claims');
    const legacySection = addSection(frame.article, 'Earlier curated narrative summaries');
    const legacyDetails = append(legacySection, 'details', 'secondary-context'); append(legacyDetails, 'summary', '', `Review ${asArray(legacyClaims).length.toLocaleString()} earlier narrative summaries preserved at the migration boundary`);
    const legacyList = append(legacyDetails, 'div', 'record-list'); asArray(legacyClaims).forEach((claim, claimIndex) => { const localSources = Object.fromEntries(asArray(claim.sources).map((source, sourceIndex) => [`INFO-${claimIndex}-${sourceIndex}`, source])); const card = addProvenanceCard(legacyList, context, { kicker: `${plainLabel(claim.verdict)} · ${publicNarrative(claim.date_window, 'Date window not established')}`, title: publicNarrative(claim.claim), text: publicNarrative(claim.assessment), meta: [claim.platform, claim.reach].filter(Boolean).map(value => publicNarrative(value)).join(' · '), item: { source_ids: Object.keys(localSources) }, localSources }); if (asArray(claim.status_tags).length) { const tags = append(card, 'div', 'tag-row'); claim.status_tags.forEach(tag => append(tags, 'span', '', plainLabel(tag))); } });
    const networks = modelData(context.model, 'analysis.influence_networks');
    const networkSection = addSection(frame.article, 'Observed amplification networks'); append(networkSection, 'p', 'section-note', 'These measurements describe the collected sample and minimum observed engagement. They do not prove who directed a network, establish a new unique proposition, or determine what amplifiers knew.');
    const networkList = append(networkSection, 'div', 'record-list two-column-list'); asArray(networks.networks).forEach(network => addProvenanceCard(networkList, context, { title: publicNarrative(network.name), text: `${formatNumber(network.posts_approx)} approximate posts · at least ${formatNumber(network.views_min)} views · ${formatNumber(network.sampled_accounts)} sampled accounts`, meta: asArray(network.notes).map(note => publicNarrative(note)).filter(Boolean).join(' ') }));
    renderRelatedLinks(frame.article, context); return frame.article;
  }

'''


def main() -> int:
    original = TARGET.read_text(encoding="utf-8")
    text = original

    text = replace_once(
        text,
        r"  function deceptionDisplay\(record\) \{.*?\n  \}\n\n(?=  function objectiveChangeLabel)",
        KNOWLEDGE_HELPER,
        "legacy deceptionDisplay",
    )
    text = replace_once(
        text,
        r"  function explicitInstitutionalKnowledge\(record\) \{.*?\n  \}\n\n  function deceptionConclusion\(record\) \{.*?\n  \}\n\n  function claimPublicSentence\(record\) \{.*?\n  \}\n\n(?=  function evidenceLayerRows)",
        "",
        "legacy deception conclusion helpers",
    )
    text = replace_once(
        text,
        r"  function InformationEnvironmentPage\(context\) \{.*?\n  \}\n\n(?=  function sourceFamilyForProfile)",
        V2_INFORMATION_PAGE,
        "legacy InformationEnvironmentPage",
    )

    replacements = {
        "'gate3.lie_ledger': 'Lie Ledger claim records'": "'gate3.lie_ledger': 'Lie Ledger narrative / proposition chains'",
        "'evidence.information': [['gate3.lie_ledger', 'claim propositions']": "'evidence.information': [['gate3.lie_ledger', 'narrative / proposition chains']",
        "formatEvidenceClock, propositionStatusLabel, deceptionDisplay, objectiveChangeLabel": "formatEvidenceClock, propositionStatusLabel, knowledgeJudgmentDisplay, objectiveChangeLabel",
    }
    for old, new in replacements.items():
        if text.count(old) != 1:
            raise SystemExit(f"FAIL: expected exactly one label/export replacement for {old!r}; found {text.count(old)}")
        text = text.replace(old, new)

    forbidden = [
        "deception_score",
        "deceptionDisplay",
        "All deception scores",
        "dataset.deceptionScore",
        "0 — No evidence of knowing deception",
    ]
    for token in forbidden:
        if token in text:
            raise SystemExit(f"FAIL: active legacy renderer token remains: {token}")
    required = [
        "function knowledgeJudgmentDisplay(record)",
        "Factual status and knowledge are separate assessments.",
        "Combined ROOK assessment",
        "EVIDENCE COMPLETION REQUIRED",
        "evidence_support",
        "dataset.evidenceComponent",
        "dataset.claimInstanceId",
        "dataset.chainId",
    ]
    for token in required:
        if token not in text:
            raise SystemExit(f"FAIL: successor renderer token missing: {token}")

    if text == original:
        raise SystemExit("FAIL: renderer patch made no changes")
    TARGET.write_text(text, encoding="utf-8", newline="\n")
    print("Lie Ledger v2 renderer patch: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
