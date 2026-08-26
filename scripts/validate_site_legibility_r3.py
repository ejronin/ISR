from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
js = (ROOT / 'js' / 'site-legibility-r3.js').read_text(encoding='utf-8')
css = (ROOT / 'css' / 'site-legibility-r3.css').read_text(encoding='utf-8')
loader = (ROOT / 'js' / 'endgame-20260823.js').read_text(encoding='utf-8')

required_js = [
    "FLAG_ROOT='./assets/flags/'",
    "['usa','us']",
    'function decoratePopup',
    'function markOfficialSources',
    'function normalizePublicPresentation',
    'formatPublicDom',
    'applyFreshnessDisplay',
    "new MutationObserver(schedule)",
    "atlasMap.on('popupopen'",
    "ACTOR_ROOTS='#snapshot,#timeline,#facilities,#strikes,#csis,#imagery,#losses,#economy,#arctic,#diplomacy-hub,#endgame,#claims,#infowar,.isr-evidence-drawer'",
]
required_css = [
    '.leaflet-popup-content-wrapper',
    'max-width:min(600px,calc(100vw - 44px))!important',
    '.atlas-popup .component-state',
    'grid-template-columns:1fr!important',
    '#sources .isr-outlet-card',
    '#sources .isr-country>h3',
    '#sources .isr-country-flag',
    '#sources .isr-gov-source',
    '#losses .forensic-category-grid',
    '#losses .casualty-records article',
    'font-size:14.5px!important',
    'font-size:11.5px!important',
    'font-size:10.5px!important',
    '@media(max-width:600px)',
    '@media(min-width:1700px)',
]
required_loader = [
    './css/site-legibility-r3.css?v=20260826-r3',
    './js/site-legibility-r3.js?v=20260826-r3',
]

missing = [x for x in required_js if x not in js]
missing += [x for x in required_css if x not in css]
missing += [x for x in required_loader if x not in loader]
if missing:
    raise SystemExit('site-legibility-r3 missing required contract markers: ' + ', '.join(missing))

# Source provenance must come from structured metadata, not a hardcoded list of favored publishers.
for forbidden_outlet in ["'xinhua'", "'anadolu agency'", "'saudi press agency'", "'irna'", "'press tv'"]:
    if forbidden_outlet in js.lower():
        raise SystemExit(f'site-legibility-r3 hardcodes government-source provenance for {forbidden_outlet}')

# The canonical public legibility layer must not reintroduce legacy 7/8/9px public typography.
for forbidden_size in ['font-size:7px', 'font-size:8px', 'font-size:9px']:
    if forbidden_size in css.replace(' ', '').lower():
        raise SystemExit(f'site-legibility-r3 reintroduces legacy public typography: {forbidden_size}')

# Presentation contract: this patch may read existing source metadata but must not mutate Atlas data.
for forbidden in ['ATLAS_DATA=', 'ATLAS_LEDGER=', 'ATLAS_CURRENT_UPDATE=', 'source_id =', 'event_id =']:
    if forbidden in js:
        raise SystemExit(f'site-legibility-r3 contains forbidden data mutation marker: {forbidden}')

print('site-legibility-r3: PASS — public typography, popup, freshness, source hierarchy and presentation-only contracts')
