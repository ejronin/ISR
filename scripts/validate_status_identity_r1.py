from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
js = (ROOT / 'js/status-identity-r1.js').read_text(encoding='utf-8')
css = (ROOT / 'css/status-identity-r1.css').read_text(encoding='utf-8')
source = (ROOT / 'js/source-bias-r1.js').read_text(encoding='utf-8')
loader = (ROOT / 'js/endgame-20260823.js').read_text(encoding='utf-8')

required_js = [
    'ACTOR_FLAGS', '🇮🇷', '🇺🇸', '🇮🇱', '🇸🇦', '🇵🇰', '🇨🇳', '🇷🇺',
    'sir-condition-loss', 'sir-condition-damage', 'sir-condition-operational', 'sir-condition-unresolved',
    'SUNK', 'DESTROYED', 'INOPERABLE', 'DAMAGED', 'REPAIRED', 'OPERATING',
    'NOT INDEPENDENTLY VERIFIED', 'QTY UNRESOLVED',
]
for token in required_js:
    assert token in js, f'missing status/identity JS contract: {token}'

assert 'fetch(' not in js, 'status/identity presentation layer must not fetch or alter analytical data'
assert 'MutationObserver' not in js, 'status/identity presentation layer must remain event-driven'

required_css = [
    '--sir-loss:#e45d66', '--sir-damage:#f09a4b', '--sir-operational:#55c987', '--sir-unresolved:#e4b64f',
    '.sir-condition-loss', '.sir-condition-damage', '.sir-condition-operational', '.sir-condition-unresolved',
    '.isr-gov-source-star', '.sir-source-star-key',
]
for token in required_css:
    assert token in css, f'missing status/identity CSS contract: {token}'

for token in ['officialGovernmentProfile', 'markOfficialGovernment', 'isr-gov-source-star', 'Official government source / outlet']:
    assert token in source, f'missing government-source provenance marker: {token}'
assert 'evidence grade' in source.lower(), 'government-source star must explicitly remain separate from evidence grade'

for token in [
    './css/status-identity-r1.css?v=20260826-r1',
    './js/status-identity-r1.js?v=20260826-r1',
    './js/source-bias-r1.js?v=20260826-r3',
]:
    assert token in loader, f'loader missing cache-busted status/source asset: {token}'

print('status identity R1 validation: PASS')
