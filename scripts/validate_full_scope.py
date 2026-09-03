#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def load(p): return json.loads((ROOT/p).read_text(encoding='utf-8'))
def fail(msg): print('FAIL:',msg); raise SystemExit(1)
def req(cond,msg):
    if not cond: fail(msg)

def main():
    outcomes=load('data/iran-outcome-assessments-v1.0.json')
    req([o['level'] for o in outcomes['outcomes']]==['TACTICAL','MILITARY_OPERATIONAL','POLITICAL','DIPLOMATIC','STRATEGIC'],'five-level Iran outcome order changed')
    req(outcomes['review_cutoff'].startswith('2026-08-20T15:59'),'canonical outcome cutoff must remain Aug 20 15:59 ET')
    military=outcomes['outcomes'][1]
    for token in ['58+','23+','335+']: req(token in military['what_iran_lost'],f'military outcome missing {token}')
    domain=load('data/integration-v1.2/domain-assessments.json')
    fp=next(x for x in domain['domains'] if x['domain']=='Force preservation')
    req(fp['current_advantage']=='U.S./COALITION','Force preservation must be U.S./COALITION')
    req(fp['confidence']=='MODERATE','Force preservation confidence must be MODERATE')
    req(fp['trend']=='IRAN_CONVENTIONAL_FORCE_SEVERELY_ATTRITED_CAPABILITY_SURVIVES','Force preservation trend mismatch')
    pubs=load('data/forensic-v1.3.2/public-assessments.json'); ids={x['assessment_id'] for x in pubs['assessments']}
    preserve={'PUB-NAVY-001','PUB-ALUDEID-001','PUB-F15E-001'}
    req(preserve <= ids,'locked public assessments were removed')
    required={'PUB-LEADERSHIP-001','PUB-CONVENTIONAL-ATTRITION-001','PUB-DIPLOMATIC-001','PUB-FORCE-PRESERVATION-001','PUB-HORMUZ-001','PUB-REGIONAL-ALIGNMENT-001'}
    req(required <= ids,'required new public assessments missing')
    f15=next(x for x in pubs['assessments'] if x['assessment_id']=='PUB-F15E-001'); req('F-15E' in f15['text'] and 'uranium' in f15['text'],'F-15E/uranium locked distinction changed')
    alu=next(x for x in pubs['assessments'] if x['assessment_id']=='PUB-ALUDEID-001'); req('CAOC was knocked out' in alu['text'] and 'Al Udeid was not' in alu['text'],'CAOC vs whole-base distinction changed')
    attr=next(x for x in pubs['assessments'] if x['assessment_id']=='PUB-CONVENTIONAL-ATTRITION-001'); req('neutralized' in ' '.join(attr['basis']).lower(),'335 launcher wording must remain neutralized')
    hz=load('data/hormuz-strategic-v3.json')
    req(hz['cutoff']=='2026-08-22 10:54 ET','Hormuz v3 cutoff mismatch')
    req(hz['integration_status']=='ANALYTICAL_VIEW_WITH_PROMOTED_CANONICAL_FACTS' and hz['canonical_ledger_advanced'] is True,'Hormuz integration status must reflect promoted canonical facts')
    req(hz.get('canonical_ledger_cutoff')=='2026-08-22 13:59 ET','Hormuz canonical-ledger cutoff mismatch')
    req('mou_breach_assessment' in hz and 'mou_concession_matrix' in hz,'full MOU analytical experience was not restored')
    req('map_points' not in hz and 'routes' not in hz,'Hormuz overlay must not import standalone coordinates into a second map database')
    sm=hz['summary_metrics']; req(sm['iran_coercive_hormuz_leverage_0_10']>sm['iran_institutionalized_control_0_10'],'de facto/legal Hormuz distinction lost')
    index=(ROOT/'legacy/phase1-public-runtime-reference.html').read_text(encoding='utf-8') if (ROOT/'legacy/phase1-public-runtime-reference.html').exists() else ''
    if index:
        req('full-scope-20260822.css' in index and 'full-scope-core.js' in index and 'full-scope-20260822.js' in index,'retired runtime reference does not preserve full-scope layer')
    regpath=ROOT/'data/source-registry.json'
    if regpath.exists():
        reg=load('data/source-registry.json'); req(reg['schema_version']=='1.0','source registry schema mismatch')
        ids=[s['source_id'] for s in reg['sources']]; req(len(ids)==len(set(ids)),'duplicate source IDs in registry')
        for p in reg['outlet_profiles']:
            g=p['ground_news']; req(g['status'] in {'RATED','NOT_RATED','NOT_APPLICABLE'},'bad Ground News status')
            if g['status']=='RATED': req(g.get('bias_raw') and g.get('profile_url') and g.get('checked_at'),'rated Ground News profile missing auditable fields')
        # Exhaustiveness against authoritative source namespaces.
        expected=set()
        for rel in ['data/integration-v1.2/sources.json','data/forensic-v1.3.2/sources.json']:
            p=ROOT/rel
            if p.exists(): expected.update(x['source_id'] for x in json.loads(p.read_text(encoding='utf-8')).get('sources',[]))
        req(expected <= set(ids),f'source registry missing {len(expected-set(ids))} authoritative sources')
    print('full-scope validation: PASS')
if __name__=='__main__': main()
