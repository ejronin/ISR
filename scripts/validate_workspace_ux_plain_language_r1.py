from pathlib import Path

root = Path(__file__).resolve().parents[1]
js = (root / 'js' / 'workspace-ux-plain-language-r1.js').read_text(encoding='utf-8')
css = (root / 'css' / 'workspace-ux-plain-language-r1.css').read_text(encoding='utf-8')
loader = (root / 'js' / 'endgame-20260823.js').read_text(encoding='utf-8')

required_js = [
    'Pick the question you want answered',
    'Timeline basics',
    'Timeline zoom',
    'How to read this page',
    'Publisher bias · Ground News',
    'Oil routes',
    'CURRENT MAP · latest accepted state',
    'use Timeline to look backward',
]
for marker in required_js:
    assert marker in js, f'missing UX marker: {marker}'

assert './data/' not in js, 'workspace UX must not load analytical data'
assert 'fetch(' not in js, 'workspace UX must not fetch or replace analytical data'
assert 'MutationObserver' not in js, 'workspace UX must remain event-driven and avoid global DOM observers'
assert 'workspace-ux-plain-language-r1.css' in loader
assert 'workspace-ux-plain-language-r1.js' in loader

for marker in ['.isr-workspace-guide', '.isr-source-guide-grid', '.isr-timeline-help p', '.isr-ground-title']:
    assert marker in css, f'missing CSS marker: {marker}'

print('workspace-ux-plain-language-r1: presentation-only Atlas/Timeline/Analysis/Sources UX contract passed')
