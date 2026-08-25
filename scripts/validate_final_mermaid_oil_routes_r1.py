#!/usr/bin/env python3
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def req(ok,msg):
    if not ok: raise SystemExit('FAIL: '+msg)

routes=json.loads((ROOT/'data/oil-routes-r1.json').read_text(encoding='utf-8'))
js=(ROOT/'js/final-mermaid-oil-routes-r1.js').read_text(encoding='utf-8')
css=(ROOT/'css/final-mermaid-oil-routes-r1.css').read_text(encoding='utf-8')
auto=(ROOT/'js/mermaid-autofit-r2.js').read_text(encoding='utf-8')
autocss=(ROOT/'css/mermaid-autofit-r2.css').read_text(encoding='utf-8')
loader=(ROOT/'js/endgame-20260823.js').read_text(encoding='utf-8')

req(routes.get('schema_version')=='1.0','oil route schema version')
req('schematic' in routes.get('geometry_policy','').lower(),'geometry must be explicitly schematic')
items=routes.get('routes',[])
ids={r.get('id') for r in items}
expected={'REDSEA-SUEZ-MARITIME','REDSEA-SAUDI-EAST-WEST','RAIL-CN-IR-APRIN','RAIL-RU-IR-APRIN'}
req(ids==expected,f'route ids {ids}')
req(sum(r.get('mode')=='rail' for r in items)==2,'exactly two rail corridors')
req(sum(r.get('id','').startswith('REDSEA-') for r in items)==2,'exactly two Red Sea corridors')
for r in items:
    req('schematic' in r.get('note','').lower(),f"{r['id']} note must disclose schematic geometry")
    req(len(r.get('coords',[]))>=2,f"{r['id']} needs line geometry")
    for lat,lon in r['coords']:
        req(math.isfinite(lat) and math.isfinite(lon),f"{r['id']} finite coordinate")
        req(-90<=lat<=90 and -180<=lon<=180,f"{r['id']} coordinate bounds")
    req(r.get('sources'),f"{r['id']} sources")
    for label,url in r['sources']:
        req(url.startswith('https://'),f"{r['id']} source must be https")

for marker in ['#egMermaidHost','#eg3CausalHost','MIN_SCALE=.04','function fit(host)','Oil Routes — SCHEMATIC','Trade / logistics routes','oil-routes-r1.json']:
    req(marker in js,f'JS marker {marker}')
req("button(controls,'FIT'" in js,'FIT control must be wired')
req("button(controls,'−'" in js and "button(controls,'+'" in js,'zoom controls must be wired')
req('svg.viewBox' in js and 'getBBox' in js,'FIT must calculate rendered diagram geometry')
req('renderedSvg=new WeakMap()' in js and 'function fitNewSvg(host)' in js,'new Mermaid SVGs must trigger a fresh FIT')
req("function setText(el,text){if(el&&el.textContent!==text)el.textContent=text;}" in js,'route relabel writes must be idempotent')
req('function scheduleRelabel()' in js and 'new MutationObserver(scheduleRelabel)' in js,'route relabel observer must be coalesced')
req("layerBtn.textContent='Oil Routes — SCHEMATIC'" not in js,'observer callback must not unconditionally rewrite layer text')
req('function fitOilRouteBounds()' in js and 'ATLAS_DATA?.arcticRoutes' in js,'Oil Routes view must fit legacy Arctic plus supplemental corridor bounds')

for marker in ["HOSTS=['#egMermaidHost','#eg3CausalHost']",'new ResizeObserver','function fitVisible(host,svg','window.ISRTrueMermaidFitR1?.fit?.(host)','fittedSvg.set(host,svg)','click a node to review its evidence and details']:
    req(marker in auto,f'auto-fit marker {marker}')
req('r.width>=240&&r.height>=220' in auto,'auto-fit must wait for a visible, laid-out viewport')
req('mermaid-autofit-r2.js' in loader and 'mermaid-autofit-r2.css' in loader,'auto-fit R2 assets must be loaded')
req('.isr-mermaid-help' in autocss and '#egMermaidHost,#eg3CausalHost' in autocss,'auto-fit guidance and both hosts must be styled')
req('final-mermaid-oil-routes-r1.js' in loader,'loader JS entry')
req('final-mermaid-oil-routes-r1.css' in loader,'loader CSS entry')
req('#egMermaidHost' in css and '#eg3CausalHost' in css,'both Mermaid hosts styled')
print('final-mermaid-oil-routes-r1: PASS — true FIT, visible auto-fit on both charts, interaction guidance, idempotent observers, and combined Oil Routes bounds gated')
