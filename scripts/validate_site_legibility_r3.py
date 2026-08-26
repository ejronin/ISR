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
    "'xinhua'",
    "'anadolu agency'",
    "'saudi press agency'",
    "'irna'",
    "'press tv'",
    "new MutationObserver(schedule)",
    "atlasMap.on('popupopen'",
]
required_css = [
    '.leaflet-popup-content-wrapper',
    'max-width:min(560px,calc(100vw - 44px))!important',
    '.atlas-popup .component-state',
    'grid-template-columns:1fr!important',
    '#sources .isr-outlet-card',
    '#sources .isr-gov-source',
    '#losses .forensic-category-grid',
    '#losses .casualty-records article',
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

# Presentation contract: this patch may read existing source metadata but must not mutate Atlas data.
for forbidden in ['ATLAS_DATA=', 'ATLAS_LEDGER=', 'ATLAS_CURRENT_UPDATE=', 'source_id =', 'event_id =']:
    if forbidden in js:
        raise SystemExit(f'site-legibility-r3 contains forbidden data mutation marker: {forbidden}')

print('site-legibility-r3: PASS')
