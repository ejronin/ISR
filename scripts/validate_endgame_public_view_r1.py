from __future__ import annotations
import json, pathlib, re, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
def fail(msg):
    print(f'FAIL: {msg}', file=sys.stderr); raise SystemExit(1)
def req(cond,msg):
    if not cond: fail(msg)
def text(p): return (ROOT/p).read_text(encoding='utf-8')
D=json.loads(text(pathlib.Path('data/endgame-public-view-v1.json')))
for js_path in ('js/endgame-public-view-r1.js','js/endgame-20260823.js'):
    cp=subprocess.run(['node','--check',str(ROOT/js_path)],capture_output=True,text=True)
    req(cp.returncode==0,f'node --check failed for {js_path}: {cp.stderr.strip()}')
JS=text(pathlib.Path('js/endgame-public-view-r1.js'))
CSS=text(pathlib.Path('css/endgame-public-view-r1.css'))
LOADER=text(pathlib.Path('js/endgame-20260823.js'))
MMD=text(pathlib.Path('data/endgame-causal-map-r1.mmd'))
req(D.get('version')=='2026.08.24-r1','wrong data version')
req(len(D.get('sources',{}))==23,'source manifest must contain 23 sources')
req(len(D.get('node_evidence',[]))==27,'node evidence matrix must contain 27 rows')
req(len(D.get('clauses',[]))==14,'MOU must expose 14 plain-English clauses')
req(all(re.match(r'^https://',s.get('url','')) for s in D['sources'].values()),'all handoff URLs must be HTTPS')
for n in D['node_evidence']:
    for sid in n.get('source_ids',[]): req(sid in D['sources'],f"{n['node_id']} unresolved source {sid}")
req(D['polling']['weighted_respondents']==31450,'GAMAAN weighted respondent count changed')
req('non-probability' in D['polling']['sample'],'GAMAAN non-probability caveat missing')
req('not population polling' in D['household_cost']['warning'],'interview/poll separation missing')
req(any(x['node_id']=='E6' and 'DISPUTED' in x['classification'] for x in D['node_evidence']),'UAE disputed attribution guardrail missing')
req(any(x['node_id']=='P2' and 'do not infer specific Iranian tasking' in x['editorial_note'] for x in D['node_evidence']),'Houthi tactical-tasking guardrail missing')
req('mou_concession_matrix' in JS and 'mou_position_tracks' in JS,'existing MOU comparative visuals not reused')
req("HORMUZ='./data/hormuz-strategic-v3.json" in JS,'MOU analytical source must remain single-sourced')
req('VICTORY-CONDITION AUDIT · R2' in JS and "strategicLens='causal'" in JS,'R2/casual lenses not separated')
req('eg3-analysis-link' in JS,'Analysis compact cross-link missing')
req('endgame-public-view-r1.css' in LOADER and 'endgame-public-view-r1.js' in LOADER,'new ENDGAME module not loaded')
req('Site-wide typography floor' in CSS,'site-wide typography pass missing')
for marker in ('.eg3-bar-row','.eg3-position-axis','.eg3-evidence-drawer','.eg3-poll-row'): req(marker in CSS,f'CSS marker missing: {marker}')
for edge in ('H9 --> M11','P4 --> R4','K2 --> R8','M2 -.','R2 -.','H7 -.','E1 -.'): req(edge in MMD,f'causal/cross-branch edge missing: {edge}')
# Guard the locked chronology contract from accidental edits in this package.
for forbidden in ('data/integration-v1.2/events.json','data/integration-v1.2/timeline.json'):
    req(forbidden not in JS and forbidden not in LOADER,'ENDGAME UI must not write locked historical data')
print('endgame-public-view-r1: PASS — 14 clauses, 23 sources, 27 evidence nodes, MOU bars/tracks, causal/R2 split, polling caveats, typography')
