import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
js = (ROOT / 'js/status-identity-r1.js').read_text(encoding='utf-8')
css = (ROOT / 'css/status-identity-r1.css').read_text(encoding='utf-8')
source = (ROOT / 'js/source-bias-r1.js').read_text(encoding='utf-8')
loader = (ROOT / 'js/endgame-20260823.js').read_text(encoding='utf-8')
outlet_profiles = json.loads((ROOT / 'data' / 'outlet-profiles.json').read_text(encoding='utf-8'))

SOURCE_COUNTRY_CODES = {
    'Australia': 'au',
    'Bahrain': 'bh',
    'Bulgaria': 'bg',
    'China': 'cn',
    'Iran': 'ir',
    'Iraq': 'iq',
    'Israel': 'il',
    'Jordan': 'jo',
    'Kuwait': 'kw',
    'Lebanon': 'lb',
    'Oman': 'om',
    'Pakistan': 'pk',
    'Qatar': 'qa',
    'Russia': 'ru',
    'Saudi Arabia': 'sa',
    'Turkey': 'tr',
    'Türkiye': 'tr',
    'United Arab Emirates': 'ae',
    'United Kingdom': 'gb',
    'United States': 'us',
    'Yemen': 'ye',
}
FLAG_CODES = sorted(set(SOURCE_COUNTRY_CODES.values()))

required_js = [
    'ACTOR_FLAGS', 'FLAG_ASSET_ROOT', 'sir-actor-flag-icon', 'actorCodeFor',
    'sir-condition-loss', 'sir-condition-damage', 'sir-condition-operational', 'sir-condition-unresolved',
    'SUNK', 'DESTROYED', 'INOPERABLE', 'DAMAGED', 'REPAIRED', 'OPERATING',
    'NOT INDEPENDENTLY VERIFIED', 'QTY UNRESOLVED',
]
for token in required_js:
    assert token in js, f'missing status/identity JS contract: {token}'

assert 'fetch(' not in js, 'status/identity presentation layer must not fetch or alter analytical data'
assert 'MutationObserver' not in js, 'status/identity presentation layer must remain event-driven'
for emoji in ['🇮🇷','🇺🇸','🇮🇱','🇸🇦','🇵🇰','🇨🇳','🇷🇺']:
    assert emoji not in js, f'emoji flag dependency must be removed: {emoji}'

# Physical condition is a distinct semantic channel. Evidence badges must not receive red/orange/green condition classes.
expected_status_selector = "const STATUS_ELEMENTS='.physical-badge,.loss-status,.isr-loss-status,.component-state .physical-badge';"
assert expected_status_selector in js, 'physical-condition decorator is not restricted to physical/loss surfaces'
assert ".evidence-badge" not in expected_status_selector, 'evidence badges must remain separate from physical condition colors'

# Every structured country currently capable of becoming a Sources country header must resolve to a local SVG.
structured_countries = sorted({
    profile.get('country')
    for profile in outlet_profiles.get('outlet_profiles', [])
    if profile.get('country')
})
unmapped = [country for country in structured_countries if country not in SOURCE_COUNTRY_CODES]
assert not unmapped, f'country header(s) lack presentation flag-code contract: {unmapped}'
source_lower = source.lower()
for country in structured_countries:
    code = SOURCE_COUNTRY_CODES[country]
    mapping_token = f"['{country.lower()}','{code}']"
    assert mapping_token in source_lower, f'country header is not mapped in source-bias-r1.js: {country} -> {code}'

for code in FLAG_CODES:
    path = ROOT / 'assets' / 'flags' / f'{code}.svg'
    assert path.exists(), f'missing local flag asset: {path.relative_to(ROOT)}'
    text = path.read_text(encoding='utf-8')
    assert '<svg' in text and 'viewBox=' in text, f'invalid local SVG flag: {path.relative_to(ROOT)}'

globe = ROOT / 'assets' / 'icons' / 'globe.svg'
assert globe.exists(), 'missing neutral Global / International globe icon'
assert '<svg' in globe.read_text(encoding='utf-8'), 'invalid local globe SVG'

required_css = [
    '--sir-loss:#e45d66', '--sir-damage:#f09a4b', '--sir-operational:#55c987', '--sir-unresolved:#e4b64f',
    '.sir-condition-loss', '.sir-condition-damage', '.sir-condition-operational', '.sir-condition-unresolved',
    '.sir-actor-flag-icon', '.isr-gov-source-star', '.sir-source-star-key',
]
for token in required_css:
    assert token in css, f'missing status/identity CSS contract: {token}'

for token in [
    'officialGovernmentProfile', 'markOfficialGovernment', 'isr-gov-source-star',
    'Official government or state source', 'decorateCountryHeaders', 'COUNTRY_FLAGS',
    "['united kingdom','gb']", "['bulgaria','bg']", "['australia','au']", 'GLOBE_ICON'
]:
    assert token in source, f'missing source identity/provenance contract: {token}'
assert 'evidence grade' in source.lower(), 'government-source star must explicitly remain separate from evidence grade'
assert 'provenance only' in source.lower(), 'government-source star must explicitly identify provenance only'

for token in [
    './css/status-identity-r1.css?v=20260826-r2-svg',
    './js/status-identity-r1.js?v=20260826-r2-svg',
    './js/source-bias-r1.js?v=20260826-r3',
]:
    assert token in loader, f'loader missing cache-busted status/source asset: {token}'

print('status identity R1 validation: PASS — actor flags, complete country-header identity, provenance and condition/evidence separation')
