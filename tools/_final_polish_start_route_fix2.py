from pathlib import Path

ia_path = Path('js/public-ia.js')
ia = ia_path.read_text(encoding='utf-8')
replacements = [
(
"dataKeys: ['current.chronology', 'ledger.domain_assessments', 'ledger.unresolved', 'analysis.endgame_public_view', 'gate3.shipping', 'gate3.economics', 'gate3.gaps']",
"dataKeys: ['current.chronology', 'ledger.domain_assessments', 'ledger.unresolved', 'analysis.endgame_public_view', 'gate3.gaps']"
),
(
"    const firstWar = context.model.chronology.find(item => String(item.timeline && item.timeline.date || item.event && item.event.event_date || '') >= '2026-02-28');\n    const economyRecords = recordArray(modelData(context.model, 'gate3.economics'));\n    const economyCurrent = economyRecords.slice().reverse().find(record => /crude|foreign|import|economic/i.test(JSON.stringify(record))) || economyRecords[economyRecords.length - 1] || {};\n    const shippingRecords = recordArray(modelData(context.model, 'gate3.shipping'));\n    const shippingCurrent = shippingRecords[shippingRecords.length - 1] || {};",
"    const economy = domains.find(domain => /Economic|economy|sanction/i.test(domain.domain || ''));\n    const firstWar = context.model.chronology.find(item => String(item.timeline && item.timeline.date || item.event && item.event.event_date || '') >= '2026-02-28');"
),
(
"    const hormuzEnvelope = { ...shippingCurrent, source_ids: Array.from(new Set([...sourceIdsFrom(shippingCurrent), ...sourceIdsFrom(maritime)])) };\n",
""
),
(
"      meta: maritime && `Confidence: ${displayTerm(maritime.confidence)}`, item: hormuzEnvelope,",
"      meta: maritime && `Confidence: ${displayTerm(maritime.confidence)}`, item: maritime || {},"
),
(
"      item: economyCurrent, relatedRecords: relatedRecordsFrom(economyCurrent), route: 'hormuz.economy', linkLabel: 'Explore Oil & Economic Effects'",
"      meta: economy && `Confidence: ${displayTerm(economy.confidence)}`, item: economy || {}, relatedRecords: economy && [...asArray(economy.supporting_evidence), ...asArray(economy.contrary_evidence)] || [], route: 'hormuz.economy', linkLabel: 'Explore Oil & Economic Effects'"
)
]
for old, new in replacements:
    if ia.count(old) != 1:
        raise SystemExit(f'expected exactly one replacement target, found {ia.count(old)}: {old[:90]}')
    ia = ia.replace(old, new, 1)
ia_path.write_text(ia, encoding='utf-8')

test_path = Path('tests/public-final-polish.test.js')
test = test_path.read_text(encoding='utf-8')
test = test.replace("const ia = require('../js/public-ia.js');\n", "", 1)
assertion = "for (const key of ['gate3.shipping', 'gate3.economics']) assert(ia.ROUTES.get('start.overview').dataKeys.includes(key), `Start Here current-state dependency is not declared: ${key}`);\n"
if test.count(assertion) != 1:
    raise SystemExit('temporary dependency assertion missing')
test_path.write_text(test.replace(assertion, '', 1), encoding='utf-8')
