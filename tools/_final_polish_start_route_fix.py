from pathlib import Path

ia_path = Path('js/public-ia.js')
ia = ia_path.read_text(encoding='utf-8')
old = "dataKeys: ['current.chronology', 'ledger.domain_assessments', 'ledger.unresolved', 'analysis.endgame_public_view', 'gate3.gaps']"
new = "dataKeys: ['current.chronology', 'ledger.domain_assessments', 'ledger.unresolved', 'analysis.endgame_public_view', 'gate3.shipping', 'gate3.economics', 'gate3.gaps']"
if ia.count(old) != 1:
    raise SystemExit(f'expected exactly one Start Here route contract, found {ia.count(old)}')
ia_path.write_text(ia.replace(old, new, 1), encoding='utf-8')

test_path = Path('tests/public-final-polish.test.js')
test = test_path.read_text(encoding='utf-8')
require_needle = "const path = require('node:path');\n"
if "const ia = require('../js/public-ia.js');" not in test:
    if test.count(require_needle) != 1:
        raise SystemExit('final-polish test require insertion point changed')
    test = test.replace(require_needle, require_needle + "const ia = require('../js/public-ia.js');\n", 1)
assert_needle = "assert(source.includes(\"now.dataset.currentStateSummary = 'four-domain'\"), 'Start Here current-state summary is not explicitly four-domain');\n"
assert_addition = assert_needle + "for (const key of ['gate3.shipping', 'gate3.economics']) assert(ia.ROUTES.get('start.overview').dataKeys.includes(key), `Start Here current-state dependency is not declared: ${key}`);\n"
if test.count(assert_needle) != 1:
    raise SystemExit('final-polish Start Here assertion insertion point changed')
test_path.write_text(test.replace(assert_needle, assert_addition, 1), encoding='utf-8')
