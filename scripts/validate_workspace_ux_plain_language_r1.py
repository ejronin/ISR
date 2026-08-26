from pathlib import Path

root = Path(__file__).resolve().parents[1]
js = (root / 'js' / 'public-record-ui-r2.js').read_text(encoding='utf-8')
css = (root / 'css' / 'public-record-ui-r2.css').read_text(encoding='utf-8')
bridge = (root / 'css' / 'public-record-legacy-bridge-r2.css').read_text(encoding='utf-8')
loader = (root / 'js' / 'navigation.js').read_text(encoding='utf-8')
endgame_loader = (root / 'js' / 'endgame-20260823.js').read_text(encoding='utf-8')
state = (root / 'js' / 'state.js').read_text(encoding='utf-8')
presentation = (root / 'js' / 'presentation.js').read_text(encoding='utf-8')

required_js = [
    'The war record at a glance',
    'Advanced timeline tools',
    'Advanced source filters',
    'Copy record link',
    'Dispute posture',
    'Evidence support',
    'Uncontested',
    'Claim only',
    'applyFreshnessDisplay',
    'DEFAULT_LAYER_OVERRIDES',
    "Reset to this view's defaults",
    'How the objective score is calculated',
    'public-record-legacy-bridge-r2.css',
]
for marker in required_js:
    assert marker in js, f'missing public-record UX marker: {marker}'

assert './data/' not in js, 'public-record UX must not load analytical data'
assert 'fetch(' not in js, 'public-record UX must not fetch or replace analytical data'
assert 'MutationObserver' not in js, 'public-record UX must remain event-driven and avoid global DOM observers'
assert "UNCONTESTED','NOT INDEPENDENTLY VERIFIED" not in js, 'uncontested must not be rewritten as not independently verified'
assert "UNVERIFIED: 'UNCONTESTED'" not in presentation, 'canonical presentation must not rewrite UNVERIFIED as UNCONTESTED'
assert 'disputePosture' in presentation and 'evidenceSupport' in presentation, 'two-axis evidence semantics missing from canonical presentation'
assert 'formatPublicDom' in presentation, 'canonical public machine-token humanizer missing'
assert 'public-record-ui-r2.css' in loader
assert 'public-record-ui-r2.js' in loader
assert 'workspace-ux-plain-language-r1.css' not in endgame_loader
assert 'workspace-ux-plain-language-r1.js' not in endgame_loader

for marker in [
    '.isr-workspace-nav{display:none!important}',
    '.kpis{display:none!important}',
    '.pr2-overview-intro',
    '.pr2-source-filters',
    '.pr2-timeline-tools',
    '--pr-confirmed:',
    '--pr-claimed:',
    '--pr-disputed:',
    '--pr-unresolved:',
]:
    assert marker in css, f'missing public-record CSS marker: {marker}'

for marker in [
    '.analysis-nav[hidden]{display:block!important}',
    '#app.isr-atlas-map-only>.side>.analysis-nav{display:block!important',
]:
    assert marker in bridge, f'missing retained-layout bridge marker: {marker}'

for marker in [
    "losses: 'consequences'",
    "'diplomacy-hub': 'diplomacy'",
    "endgame: 'diplomacy'",
    "claims: 'claims'",
    "'analytic-record': 'sources'",
]:
    assert marker in state, f'public navigation/state mismatch: {marker}'

print('public-record-ui-r2: dark, color-semantic, presentation-only public historical-record UX contract passed')
