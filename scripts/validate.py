#!/usr/bin/env python3
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
import json, re, struct, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = [
    'index.html','templates/public-index.html','css/public-shell.css','js/public-app.js',
    'legacy/phase1-public-runtime-reference.html','css/app.css','js/navigation.js','js/app.js','.nojekyll',
    'assets/social-preview.png','data/core.json','data/events.json','data/facilities.json',
    'data/strikes.json','data/losses.json','data/claims.json','data/influence-networks.json',
    'data/economics.json','data/routes.json','data/missiles.json','data/sources.json','data/snapshots.json',
    'data/integration-v1.2/manifest.json','data/integration-v1.2/events.json',
    'data/integration-v1.2/timeline.json','data/integration-v1.2/sources.json',
    'data/integration-v1.2/validate-package.py','scripts/validate_integration.py',
]
REQUIRED_IDS = {'atlas-root'}

class AtlasParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=[]; self.tab_targets=[]; self.local_assets=[]; self.meta={}; self.links=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag=='button' and 'tab' in a.get('class','').split() and a.get('onclick'):
            m=re.search(r"showAtlasPanel\('([^']+)'",a['onclick'])
            if m: self.tab_targets.append(m.group(1))
        if tag in {'script','link','img'}:
            v=a.get('src') or a.get('href')
            if v and '://' not in v and not v.startswith(('data:','#')): self.local_assets.append(v.split('?')[0])
        if tag=='meta':
            key=a.get('property') or a.get('name')
            if key: self.meta[key]=a.get('content','')
        if tag=='link': self.links.append(a)

def fail(msg):
    print('FAIL:',msg); return 1

def main():
    failures=0
    for rel in REQUIRED_FILES:
        if not (ROOT/rel).exists(): failures += fail(f'missing required file: {rel}')
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    if html != (ROOT/'templates/public-index.html').read_text(encoding='utf-8'):
        failures += fail('deployed index differs from templates/public-index.html review source')
    p=AtlasParser(); p.feed(html)
    seen=set(); dups=set()
    for x in p.ids:
        if x in seen: dups.add(x)
        seen.add(x)
    if dups: failures += fail(f'duplicate HTML ids: {sorted(dups)}')
    missing_ids=sorted(REQUIRED_IDS-set(p.ids))
    if missing_ids: failures += fail(f'missing required public-shell IDs: {missing_ids}')
    orphan=sorted(set(p.tab_targets)-set(p.ids))
    if orphan: failures += fail(f'orphan tab targets: {orphan}')
    for rel in p.local_assets:
        # percent-encoded paths are valid browser paths; decode simple spaces for filesystem validation
        path=Path(rel.replace('%20',' '))
        if not (ROOT/path).exists(): failures += fail(f'broken local asset reference: {rel}')
    expected={
        'og:type':'website','og:url':'https://ejronin.github.io/ISR/',
        'og:image':'https://ejronin.github.io/ISR/assets/social-preview.png',
        'twitter:card':'summary_large_image'
    }
    for k,v in expected.items():
        if p.meta.get(k)!=v: failures += fail(f'{k} expected {v!r}, got {p.meta.get(k)!r}')
    canonical=[x.get('href') for x in p.links if 'canonical' in x.get('rel','').split()]
    if canonical!=['https://ejronin.github.io/ISR/']: failures += fail(f'canonical link invalid: {canonical}')
    for f in sorted((ROOT/'data').rglob('*.json')):
        try: json.loads(f.read_text(encoding='utf-8'))
        except Exception as e: failures += fail(f'invalid JSON {f.relative_to(ROOT)}: {e}')
    # validate social PNG dimensions from IHDR without external packages
    png=ROOT/'assets/social-preview.png'
    if png.exists():
        b=png.read_bytes()[:24]
        if b[:8]!=b'\x89PNG\r\n\x1a\n': failures += fail('social-preview.png is not PNG')
        else:
            w,h=struct.unpack('>II',b[16:24])
            if (w,h)!=(1200,630): failures += fail(f'social preview dimensions {(w,h)} != (1200,630)')
    css=(ROOT/'css/public-shell.css').read_text(encoding='utf-8')
    if 'prefers-reduced-motion: reduce' not in css or '.section-nav' not in css:
        failures += fail('public shell responsive/reduced-motion styles missing')
    for js in ['js/public-app.js','js/navigation.js','js/app.js']:
        proc=subprocess.run(['node','--check',str(ROOT/js)],capture_output=True,text=True)
        if proc.returncode: failures += fail(f'JS syntax error in {js}: {proc.stderr.strip()}')
    # protect against the blank strategic CLAIM CHECK regression caught during migration
    legacy=(ROOT/'legacy/phase1-public-runtime-reference.html').read_text(encoding='utf-8')
    if re.search(r'<div class="date">2026-08-16 • CLAIM CHECK</div><h3>\s*</h3>',legacy):
        failures += fail('blank Aug. 16 strategic claim-check card regression present')
    if failures:
        print(f'Validation failed: {failures} issue(s)')
        return 1
    print('Validation passed: current shell, local assets, metadata, JSON, JS syntax, legacy reference, responsive styles, and social preview.')
    return 0

if __name__=='__main__': sys.exit(main())
