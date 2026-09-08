from pathlib import Path

ia_path = Path('js/public-ia.js')
ia = ia_path.read_text(encoding='utf-8')
old = "dataKeys: ['current.chronology', 'ledger.domain_assessments', 'ledger.unresolved', 'analysis.endgame_public_view', 'gate3.gaps']"
new = "dataKeys: ['current.chronology', 'ledger.domain_assessments', 'ledger.unresolved', 'analysis.endgame_public_view', 'gate3.shipping', 'gate3.economics', 'gate3.gaps']"
if ia.count(old) != 1:
    raise SystemExit(f'expected exactly one Start Here route contract, found {ia.count(old)}')
ia = ia.replace(old, new, 1)
ia_path.write_text(ia, encoding='utf-8')

test_path = Path('tests/public-final-polish.test.js')
test = test_path.read_text(encoding='utf-8')
needle = "assert(source.includes(\"now.dataset.currentStateSummary = 'four-domain'\"), 'Start Here current-state summary is not explicitly four-domain');\n"
addition = needle + "for (const key of ['gate3.shipping', 'gate3.economics']) assert(source.includes(`'${key}'`), `Start Here current-state dependency is not declared: ${key}`);\n"
if test.count(needle) != 1:
    raise SystemExit(f'expected exactly one final-polish Start Here assertion, found {test.count(needle)}')
test = test.replace(needle, addition, 1)
test_path.write_text(test, encoding='utf-8')
