#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
js=(ROOT/'js/endgame-ux-plain-language-r1.js').read_text(encoding='utf-8')
css=(ROOT/'css/endgame-ux-plain-language-r1.css').read_text(encoding='utf-8')
loader=(ROOT/'js/endgame-20260823.js').read_text(encoding='utf-8')

def req(ok,msg):
    if not ok: raise SystemExit('FAIL: '+msg)

req('endgame-ux-plain-language-r1.js' in loader,'plain-language JS loader entry')
req('endgame-ux-plain-language-r1.css' in loader,'plain-language CSS loader entry')
req('fetch(' not in js and '/data/' not in js,'UX overlay must not fetch or replace analytical data')
for marker in [
    'What each side wanted and where it landed',
    'Objectives: what each side actually got',
    'Who moved how far',
    'Claims vs record',
    'CAUSE → EFFECT MAP',
    'How the 0–4 score works',
    "data-eg25-objective-scoreboard",
    "data-eg3-panel=\"strategic\"",
    'eg4-jumps',
    'eg4-disclosure'
]: req(marker in js,f'UX marker {marker}')
for marker in ['.eg4-nav-card','.eg4-jumps','.eg4-disclosure','#endgame .eg3-section-head p']:
    req(marker in css,f'CSS marker {marker}')
req('MutationObserver(schedule)' in js,'DOM rebuild observer must be scheduled/coalesced')
req('requestAnimationFrame(run)' in js,'UX observer must coalesce onto animation frame')
print('endgame-ux-plain-language-r1: PASS — plain-language navigation, strategic grouping and presentation-only contract gated')
