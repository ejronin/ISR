#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
IP=ROOT/'data/integration-v1.2'
NEW_EVENTS={'EV-20260819-002','EV-20260820-006','EV-20260820-007','EV-20260821-001','EV-20260821-002','EV-20260821-003','EV-20260821-004','EV-20260821-005','EV-20260821-006','EV-20260821-007','EV-20260822-001','EV-20260822-002','EV-20260822-004','EV-20260822-005','EV-20260822-006'}
NEW_SOURCES={'SRC-087E077D488F','SRC-C869142454CE','SRC-5F06A28B79E7','SRC-9016A9DDF69F','SRC-980086328C21','SRC-C5F2E7065110','SRC-283DBF8D4872','SRC-F33E9E8FE450','SRC-B7E80EBD97E4','SRC-1168EB0594C5','SRC-3077D3E08CBE','SRC-D5E73D346BF5','SRC-03092951A37F','SRC-32D26981B604','SRC-E5297E5894E1'}

def load(p): return json.loads((ROOT/p).read_text(encoding='utf-8'))
def req(c,m):
    if not c: print('FAIL:',m);raise SystemExit(1)
def stable(o): return hashlib.sha256(json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def expected_sid(url): return 'SRC-'+hashlib.sha1(url.rstrip('/').encode()).hexdigest()[:12].upper()

def main():
    events_obj=load('data/integration-v1.2/events.json');events=events_obj['events'];timeline=load('data/integration-v1.2/timeline.json')['records'];sources=load('data/integration-v1.2/sources.json')['sources']
    req(events_obj.get('as_of')=='2026-08-22T13:59:00-04:00','canonical events cutoff not advanced to Aug. 22 13:59 ET')
    req(len(events)==98 and len(timeline)==98,'canonical event/timeline count must be 98')
    req(len(sources)==150,'canonical source count must be 150')
    eids={x['event_id'] for x in events};sids={x['source_id'] for x in sources};req(NEW_EVENTS<=eids,'one or more Aug. 22 event IDs missing');req(NEW_SOURCES<=sids,'one or more Aug. 22 source IDs missing')
    req(len(eids)==len(events) and len(sids)==len(sources),'duplicate canonical IDs')
    for s in sources:
        if s['source_id'] in NEW_SOURCES:req(expected_sid(s['url'])==s['source_id'],f'new source ID does not match canonical URL hash: {s["source_id"]}')
    req(max(x['event_date'] for x in events)<='2026-08-22','future-dated canonical event entered before cutoff')
    req(max(x['date'] for x in timeline)<='2026-08-22','future-dated timeline record entered before cutoff')
    by={x['event_id']:x for x in events}
    seven=by['EV-20260820-006'];four=by['EV-20260820-007'];req('seven' in seven['summary'].lower() and 'four' in four['summary'].lower(),'7-vs-4 Hormuz observations not both preserved')
    req(four['event_id'] in seven.get('related_event_ids',[]) and seven['event_id'] in four.get('related_event_ids',[]),'Hormuz count discrepancy records not linked')
    req('UNRESOLVED' in four['current_status'],'later Hormuz count discrepancy is not visibly unresolved')
    iraq=by['EV-20260822-001'];req('LEGAL_SOVEREIGNTY_NOT_ESTABLISHED' in iraq['current_status'],'Iraqi selective passage was upgraded into legal sovereignty')
    oman=by['EV-20260821-004'];req('ACTIVE' in oman['current_status'] and 'UNRESOLVED' in oman['current_status'],'Oman-Iran channel must remain ACTIVE / UNRESOLVED')
    sanctions=by['EV-20260822-006'];req('ANNOUNCED' in sanctions['current_status'] and 'SCHEDULED' in sanctions['current_status'] and 'NOT_ENACTED' in sanctions['current_status'],'Aug. 24 sanctions must remain announced/scheduled, not enacted')
    for eid in ['EV-20260821-005','EV-20260822-004']:
        loc=by[eid].get('location') or {};req(loc.get('lat') is None and loc.get('lon') is None,f'{eid} introduced disallowed precise current coordinates')
    routes=load('data/routes.json').get('proposedStrategicRoutes',[]);rmap={x['id']:x for x in routes}
    for rid in ['IRQ-BANIYAS-PROPOSED','IRQ-AQABA-PROPOSED']:
        req(rid in rmap and 'PROPOSED' in rmap[rid].get('operational_state','') and rmap[rid].get('render_style')=='DASHED',f'{rid} is not visibly proposed/non-operational/dashed')
    req(rmap.get('IRQ-CEYHAN-DIVERSIFICATION',{}).get('render_style')=='SOLID','existing Ceyhan diversification route must remain distinct from proposed routes')
    outcomes=load('data/iran-outcome-assessments-v1.0.json');req(outcomes['review_cutoff']=='2026-08-20T15:59:00-04:00','outcome synthesis cutoff was silently advanced')
    hz=load('data/hormuz-strategic-v3.json');req(hz['cutoff']=='2026-08-22 10:54 ET','MOU/Hormuz analytical cutoff changed');req(hz.get('canonical_ledger_advanced') is True and hz.get('canonical_ledger_cutoff')=='2026-08-22 13:59 ET','MOU/Hormuz metadata does not acknowledge promoted canonical facts');req('mou_breach_assessment' in hz and 'mou_concession_matrix' in hz,'MOU breakdown/matrix restoration missing');req('map_points' not in hz and 'routes' not in hz,'standalone MOU map geometry was reimported')
    pubs=load('data/forensic-v1.3.2/public-assessments.json');pids={x['assessment_id'] for x in pubs['assessments']};req({'PUB-F15E-001','PUB-ALUDEID-001','PUB-NAVY-001'}<=pids,'locked forensic public assessments disappeared')
    lin=load('data/integration-v1.2/aug22-update-lineage.json');sets={'events':{x['event_id']:x for x in events},'sources':{x['source_id']:x for x in sources},'timeline':{x['event_id']:x for x in timeline}}
    for kind in ['events','sources','timeline']:
        for ident,want in lin[kind].items(): req(ident in sets[kind] and stable(sets[kind][ident])==want,f'pre-update {kind} record was silently rewritten: {ident}')
    shipping=load('data/integration-v1.2/shipping.json')['records'];ship={x['shipping_id']:x for x in shipping};req(ship['SHIP-UPD-20260820-KPLER']['value']==7 and ship['SHIP-UPD-20260820-REUTERS-AUG22']['value']==4,'shipping discrepancy records missing')
    rev=load('data/integration-v1.2/revision-history.json')['revisions'];req(any(x.get('revision_id')=='REV-024' for x in rev),'REV-024 append-only update audit entry missing')
    index=(ROOT/'index.html').read_text(encoding='utf-8');css=(ROOT/'css/workspaces-20260822.css').read_text(encoding='utf-8');js=(ROOT/'js/workspaces-20260822.js').read_text(encoding='utf-8')
    req('workspaces-20260822.css' in index and 'workspaces-20260822.js' in index,'workspace assets not loaded by index')
    req('.panel.isr-timeline-built:not(.active)' in css and 'display:none!important' in css,'Timeline panel-specificity leak fix missing')
    for token in ['ATLAS','TIMELINE','MOU','SOURCES','How to use','FIT','1×','2×','4×','8×','NOT measured by Ground News','FAR LEFT','LEAN LEFT','CENTER','LEAN RIGHT','FAR RIGHT']:
        req(token in js,f'workspace UI requirement missing: {token}')
    req('not proof of neutrality' in js,'Ground News scope disclaimer missing')
    req('mou_breach_assessment' in js and 'mou_concession_matrix' in js,'full MOU workspace does not consume restored analysis')
    builder=(ROOT/'scripts/build_source_registry.py').read_text(encoding='utf-8');req('not an article rating or proof of neutrality' in builder,'generated Ground News methodology scope note missing')
    reg_path=ROOT/'data/source-registry.json'
    if reg_path.exists():
        reg=load('data/source-registry.json');regids={x['source_id'] for x in reg['sources']};req(sids<=regids,'generated source registry is not exhaustive against canonical sources')
        for p in reg['outlet_profiles']:
            g=p.get('ground_news',{});req(g.get('status') in {'RATED','NOT_RATED','NOT_APPLICABLE'},'invalid Ground News status')
            if g.get('status')=='RATED': req(g.get('bias_raw') and g.get('profile_url') and g.get('checked_at'),'rated Ground News profile lacks auditable fields')
    print('Aug. 22 canonical/workspace validation: PASS')
if __name__=='__main__':main()
