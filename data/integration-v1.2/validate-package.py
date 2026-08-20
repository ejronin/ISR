#!/usr/bin/env python3
import json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def load(n): return json.loads((ROOT/n).read_text())

def actual_counts():
 e=load('events.json')['events']
 return {
  'events':len(e),
  'prewar_events':sum(1 for x in e if x['event_id'].startswith('PRE-')),
  'wartime_events':sum(1 for x in e if x['event_id'].startswith('EV-')),
  'timeline_records':len(load('timeline.json')['records']),
  'daily_coverage_days':len(load('daily-coverage.json')['coverage']),
  'facilities_integrated':len(load('facilities.json')['facilities']),
  'repo_facilities_to_preserve':len(load('facilities.json').get('repo_records_to_preserve',[])),
  'claims':len(load('claims.json')['claims']),
  'movements':len(load('movements.json')['movements']),
  'agreements':len(load('agreements.json')['records']),
  'casualty_records':len(load('casualties.json')['records']),
  'material_loss_records':len(load('material-losses.json')['records']),
  'munition_expenditure_records':len(load('munitions-expenditure.json')['records']),
  'shipping_records':len(load('shipping.json')['records']),
  'economic_backfill_records':len(load('economics.json')['records']),
  'diplomacy_records':len(load('diplomacy.json')['records']),
  'sources':len(load('sources.json')['sources']),
  'unresolved_items':len(load('unresolved.json')['items']),
  'collection_requests':len(load('collection-requests.json')['requests']),
  'bda_overlay_candidates':len(load('bda-overlays.json')['overlays']),
  'revision_records':len(load('revision-history.json')['revisions']),
 }

def parse_count_marker(text,label):
 m=re.search(r'<!-- AUTO_COUNTS:([^>]+) -->',text)
 if not m: raise AssertionError(f'{label}: missing AUTO_COUNTS marker')
 out={}
 for p in m.group(1).split(';'):
  k,v=p.split('=',1); out[k]=int(v)
 return out

def parse_inventory(text,name):
 pat=rf'<!-- BEGIN AUTO-ID-INVENTORY {re.escape(name)} -->\n(.*?)\n<!-- END AUTO-ID-INVENTORY {re.escape(name)} -->'
 blocks=re.findall(pat,text,re.S)
 if not blocks: raise AssertionError(f'CODEX: missing inventory {name}')
 parsed=[]
 for block in blocks:
  parsed.append(re.findall(r'^- `([^`]+)`$',block,re.M))
 first=parsed[0]
 for i,b in enumerate(parsed[1:],2):
  if b!=first: raise AssertionError(f'CODEX: repeated inventory {name} differs at occurrence {i}')
 return first

def ids(fn,key,field): return [x[field] for x in load(fn)[key]]

actual=actual_counts()
manifest=load('manifest.json')
errors=[]
for label,got in [('manifest',manifest.get('counts',{})),('summary',parse_count_marker((ROOT/'integration-summary.md').read_text(),'summary')),('codex',parse_count_marker((ROOT/'CODEX-INSTRUCTIONS.md').read_text(),'codex'))]:
 for k,v in actual.items():
  if got.get(k)!=v: errors.append(f'{label} count {k}: {got.get(k)} != {v}')

spec={
 'events':('events.json','events','event_id'),
 'movements':('movements.json','movements','movement_id'),
 'agreements':('agreements.json','records','agreement_id'),
 'claims':('claims.json','claims','case_id'),
 'diplomacy':('diplomacy.json','records','diplomacy_id'),
 'unresolved':('unresolved.json','items','unresolved_id'),
 'collection_requests':('collection-requests.json','requests','request_id'),
 'sources':('sources.json','sources','source_id'),
 'facilities_integrated':('facilities.json','facilities','facility_id'),
 'material_losses':('material-losses.json','records','loss_id'),
 'casualties':('casualties.json','records','casualty_id'),
 'munitions':('munitions-expenditure.json','records','expenditure_id'),
 'shipping':('shipping.json','records','shipping_id'),
 'bda_overlays':('bda-overlays.json','overlays','overlay_id'),
}
ct=(ROOT/'CODEX-INSTRUCTIONS.md').read_text()
for name,(fn,key,field) in spec.items():
 expected=ids(fn,key,field)
 try: got=parse_inventory(ct,name)
 except AssertionError as ex: errors.append(str(ex)); continue
 if got!=expected: errors.append(f'CODEX inventory {name} does not exactly match final JSON ({len(got)} vs {len(expected)})')
 if len(expected)!=len(set(expected)): errors.append(f'JSON duplicate IDs in {name}')

# Core reference validation
source_ids=set(ids('sources.json','sources','source_id'))
agreement_ids=set(ids('agreements.json','records','agreement_id'))
event_ids=set(ids('events.json','events','event_id'))
movement_ids=set(ids('movements.json','movements','movement_id'))
claim_ids=set(ids('claims.json','claims','case_id'))

def walk(o):
 if isinstance(o,dict):
  for k,v in o.items():
   if k in ('source_ids','prewar_plan_evidence') and isinstance(v,list):
    for x in v:
     if isinstance(x,str) and x.startswith('SRC-') and x not in source_ids: errors.append(f'missing source ref {x}')
   if k=='source_refs' and isinstance(v,list):
    for x in v:
     sid=x.get('source_id') if isinstance(x,dict) else None
     if sid and sid.startswith('SRC-') and sid not in source_ids: errors.append(f'missing source ref {sid}')
   if k=='agreement_refs' and isinstance(v,list):
    for x in v:
     if x not in agreement_ids: errors.append(f'missing agreement ref {x}')
   walk(v)
 elif isinstance(o,list):
  for x in o: walk(x)
for f in ROOT.glob('*.json'):
 if f.name!='manifest.json': walk(load(f.name))

if actual['events']!=actual['prewar_events']+actual['wartime_events']:
 errors.append('event partition mismatch')

if errors:
 print('VALIDATION: FAIL')
 for e in sorted(set(errors)): print('-',e)
 sys.exit(1)
print('VALIDATION: PASS')
for k,v in actual.items(): print(f'{k}={v}')
