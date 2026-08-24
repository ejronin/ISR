from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
workspaces = root / 'js' / 'workspaces-20260822.js'
fullscope = root / 'js' / 'full-scope-20260822.js'
css = root / 'css' / 'public-ux-20260823.css'
evidence = root / 'data' / 'outcome-evidence-links-20260823.json'
endgame = root / 'data' / 'endgame-so-far.json'

missing = [str(p) for p in (workspaces, fullscope, css, evidence, endgame) if not p.exists()]
if missing:
    raise SystemExit('missing Aug23 public UX files: ' + ', '.join(missing))

w = workspaces.read_text(encoding='utf-8')
f = fullscope.read_text(encoding='utf-8')
c = css.read_text(encoding='utf-8')
e = json.loads(evidence.read_text(encoding='utf-8'))

assert "['ATLAS','TIMELINE','ANALYSIS','MOU','SOURCES']" in w
assert "window.showAtlasPanel?.('facilities')" in w
assert "CURRENT MAP · latest verified state" in w
assert 'Timeline cutoffs do not roll the Atlas map backward' in w
assert 'PLAIN_EXACT' in w and 'humanizeVisibleText' in w
assert 'data-public-ux' in w and 'public-ux-20260823.css' in w
assert "app.classList.add('isr-atlas-map-only')" in f
assert 'outcomeEvidence' in f
assert 'News and source links' in f
assert 'Internal record IDs are intentionally not shown as evidence links' in f
assert 'Open publisher' not in f
assert '#app.isr-atlas-map-only' in c
assert '.isr-evidence-source-list' in c

expected = {
    'IRN-OUTCOME-TACTICAL', 'IRN-OUTCOME-MILITARY', 'IRN-OUTCOME-POLITICAL',
    'IRN-OUTCOME-DIPLOMATIC', 'IRN-OUTCOME-STRATEGIC'
}
assert expected.issubset(e.keys())
for key in expected:
    assert len(e[key]) >= 2
    urls = [x['url'] for x in e[key]]
    assert all(u.startswith('https://') for u in urls)
    assert len(urls) == len(set(urls))
    assert all('github.com/ejronin/ISR' not in u for u in urls), 'public evidence must not self-reference the repo'

print('validate-public-ux-20260823: PASS (map-only Atlas, Analysis workspace, plain-language layer, external evidence links)')
