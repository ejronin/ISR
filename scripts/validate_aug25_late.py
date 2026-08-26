#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def req(ok, msg):
    if not ok:
        raise SystemExit('FAIL: ' + msg)

base = ROOT / 'data/current-update-20260825-late'
manifest = json.loads((base / 'manifest.json').read_text(encoding='utf-8'))
events = json.loads((base / 'events.json').read_text(encoding='utf-8'))
timeline = json.loads((base / 'timeline.json').read_text(encoding='utf-8'))
sources = json.loads((base / 'sources.json').read_text(encoding='utf-8'))
mapdata = json.loads((ROOT / 'data/china-oil-sourcing-shift-r1.json').read_text(encoding='utf-8'))
loader = (ROOT / 'js/current-update-20260825.js').read_text(encoding='utf-8')
latejs = (ROOT / 'js/current-update-20260825-late.js').read_text(encoding='utf-8')
mapjs = (ROOT / 'js/china-oil-sourcing-shift-r1.js').read_text(encoding='utf-8')

req(manifest['counts']['overlay_events'] == 1, 'late overlay event count')
req(manifest['counts']['overlay_timeline_records'] == 1, 'late overlay timeline count')
req(manifest['counts']['overlay_sources'] == 1, 'late overlay source count')
req(manifest['counts']['current_chronology_records'] == 117, 'late overlay chronology count')
req(len(events.get('events', [])) == 1, 'events payload count')
req(len(timeline.get('records', [])) == 1, 'timeline payload count')
req(len(sources.get('sources', [])) == 1, 'sources payload count')

event = events['events'][0]
record = timeline['records'][0]
source = sources['sources'][0]
req(event['event_id'] == 'CUR-20260825-008', 'late event id')
req(record['event_id'] == event['event_id'], 'timeline/event id alignment')
req(source['source_id'] == 'SRC-8F55E805772A', 'Argus canonical source id')
req(source['source_id'] in {r['source_id'] for r in event['source_refs']}, 'event source resolves')
req('source-specific' in event['verified_effect'].lower(), 'shipping methodology boundary preserved')
req('current-update-20260825-late.js' in loader, 'Aug25 loader chains late overlay')
req('china-oil-sourcing-shift-r1.js' in latejs, 'late overlay chains map shift')

req(mapdata.get('schema_version') == '1.0', 'China oil shift schema')
req('schematic' in mapdata.get('geometry_policy', '').lower(), 'map geometry policy')
routes = mapdata.get('routes', [])
ids = {route.get('id') for route in routes}
req(ids == {'IRAN-CN-SHADOW-CRUDE','RU-CN-ESPO-SUBSTITUTE','GULF-CN-NONSANCTIONED-SUBSTITUTES'}, f'map route ids {ids}')
req(any(route.get('line_class') == 'degraded_legacy' for route in routes), 'Iran degraded route')
req(any(route.get('line_class') == 'expanded_substitute' for route in routes), 'Russia substitute route')
req(any(route.get('line_class') == 'hormuz_exposed_substitute' for route in routes), 'Gulf substitute route')
for route in routes:
    req(route.get('segments'), f"{route['id']} segments")
    req(route.get('sources'), f"{route['id']} sources")
    for segment in route['segments']:
        req(len(segment.get('coords', [])) >= 2, f"{route['id']} segment geometry")
        for lat, lon in segment['coords']:
            req(-90 <= lat <= 90 and -180 <= lon <= 180, f"{route['id']} coordinate bounds")
    for _, url in route['sources']:
        req(url.startswith('https://'), f"{route['id']} https source")

for marker in ['Trade / logistics routes','degraded_legacy','expanded_substitute','not a live vessel position']:
    req(marker in mapjs, f'map JS marker {marker}')
req("return { color:'#38bdf8'" in mapjs, 'default renderer style for additional substitute classes')

print('aug25-late: PASS — 117-record chronology, methodology-bounded Hormuz update, and China crude sourcing-shift map layer')
