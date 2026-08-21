#!/usr/bin/env python3
import json, hashlib, sys, re
from pathlib import Path

ROOT=Path(__file__).resolve().parent
errs=[]; objs={}
def err(x): errs.append(x)
def norm(u): return u.rstrip('/')
def sid(u): return 'SRC-'+hashlib.sha1(norm(u).encode()).hexdigest()[:12].upper()

required={
 'README.md','addon-summary.md','CHANGELOG.md','CODEX-ADDON-INSTRUCTIONS.md',
 'ENGINEER-RESEARCH-PROMPT.md','ANALYTICAL-DOCTRINE.md','research-log.md',
 'claim-taxonomy.json','iranian-claim-evolution.json','claim-chain-index.json',
 'media-forensics.json','facility-claim-audits.json','pilot-rescue-timeline.json',
 'imagery-index.json','strike-geolocations.csv','strike-geolocations.geojson',
 'connection-graph.json','connection-graph.dot','sources.json','unresolved.json',
 'collection-requests.json','iran-loss-envelopes.json','iran-leadership-casualties.json',
 'public-assessments.json','iran-war-cost-estimate.json','integration-bridge.json','manifest.json'
}
for f in required:
    if not (ROOT/f).exists(): err('missing '+f)

for p in ROOT.glob('*.json'):
    try: objs[p.name]=json.loads(p.read_text())
    except Exception as e: err(f'parse {p.name}: {e}')

# Source namespace / provenance
srcs=objs.get('sources.json',{}).get('sources',[])
ss={x.get('source_id') for x in srcs}; urls=[]
for x in srcs:
    u=x.get('url',''); urls.append(norm(u))
    if x.get('source_id')!=sid(u): err('source hash mismatch '+str(x.get('source_id')))
if len(urls)!=len(set(urls)): err('duplicate source URLs')

def walk(x,path='root'):
    if isinstance(x,dict):
        for k,v in x.items(): walk(v,path+'.'+str(k))
    elif isinstance(x,list):
        for i,v in enumerate(x): walk(v,f'{path}[{i}]')
    elif isinstance(x,str) and x.startswith('SRC-') and x!='SRC-' and x not in ss:
        err('unknown source '+x+' at '+path)

for fn,o in objs.items():
    if fn!='manifest.json': walk(o,fn)

# Accepted proposition / inference doctrine
allowed=set(objs.get('claim-taxonomy.json',{}).get('allowed_dispositions',[]))
expected={'CONFIRMED','MOSTLY_CONFIRMED','PARTLY_CONFIRMED','UNSUBSTANTIATED','MISLEADING',
          'FALSE_ATTRIBUTION','CONTRADICTED','FALSE','RETRACTED','CORRECTED',
          'NARRATIVE_SUBSTITUTION','UNRESOLVED'}
if allowed!=expected: err('disposition vocabulary mismatch')

likes=set(objs.get('claim-taxonomy.json',{}).get('estimative_judgment',{}).get('analytic_likelihood_values',[]))
exp_l={'ALMOST_CERTAIN','VERY_LIKELY','LIKELY','ROUGHLY_EVEN','UNLIKELY','VERY_UNLIKELY','REMOTE'}
if likes!=exp_l: err('likelihood vocabulary mismatch')
req_est={'analytic_likelihood','analytic_confidence','inference_basis','credible_alternatives','evidence_that_would_change_assessment'}

def check_disp(x,path):
    if isinstance(x,dict):
        if isinstance(x.get('disposition'),str) and x.get('disposition') in allowed:
            miss=req_est-set(x)
            if miss: err(path+' controlled disposition missing '+str(sorted(miss)))
        for k,v in x.items(): check_disp(v,path+'.'+str(k))
    elif isinstance(x,list):
        for i,v in enumerate(x): check_disp(v,f'{path}[{i}]')

for fn,o in objs.items():
    if fn not in {'manifest.json','claim-taxonomy.json'}: check_disp(o,fn)

claims=objs.get('iranian-claim-evolution.json',{}).get('claims',[])
cids=[]
for c in claims:
    cids.append(c.get('claim_id'))
    for p in c.get('factual_propositions',[]):
        if p.get('disposition') not in allowed: err(c.get('claim_id','?')+' bad disposition')
        miss=req_est-set(p)
        if miss: err(c.get('claim_id','?')+' proposition missing '+str(sorted(miss)))
        if p.get('analytic_likelihood') not in exp_l: err(c.get('claim_id','?')+' bad likelihood')
        if p.get('analytic_confidence') not in {'HIGH','MODERATE','LOW'}: err(c.get('claim_id','?')+' bad analytic confidence')
        if p.get('disposition')=='UNRESOLVED' and p.get('analytic_likelihood')!='ROUGHLY_EVEN':
            err(c.get('claim_id','?')+' UNRESOLVED not ROUGHLY_EVEN')
    for d in c.get('final_disposition',[]):
        if d not in allowed: err(c.get('claim_id','?')+' bad final disposition')
    if c.get('source_id') not in ss: err(c.get('claim_id','?')+' unresolved source')
if len(cids)!=len(set(cids)): err('duplicate claim IDs')

for rec in objs.get('facility-claim-audits.json',{}).get('records',[]):
    for p in rec.get('propositions',[]):
        miss=req_est-set(p)
        if miss: err(rec.get('facility_audit_id','?')+' proposition missing '+str(sorted(miss)))
for rec in objs.get('claim-audits.json',{}).get('claims',[]):
    miss=req_est-set(rec)
    if miss: err(rec.get('claim_id','?')+' coarse case missing '+str(sorted(miss)))

# No terminal UNPRICED in release data.
legacy_no_price='UN'+'PRICED'
for p in ROOT.iterdir():
    if p.is_file() and p.suffix.lower() in {'.json','.md','.csv','.geojson','.dot','.py'} and p.name!='validate-addon.py':
        if legacy_no_price in p.read_text(errors='ignore'):
            err('legacy terminal no-price token in '+p.name)

# Cost/accounting authority
loss=objs.get('iran-loss-envelopes.json',{})
cats={x.get('category'):x for x in loss.get('categories',[])}
material_categories={'NAVAL_LOSSES','AIRCRAFT','AIR_DEFENSE_RADAR','LAUNCHERS','MISSILE_UAS_INVENTORY',
                     'COMMAND_C2','FIXED_INFRASTRUCTURE','INDUSTRIAL_PRODUCTION'}
expected_c=material_categories|{'MUNITIONS_EXPENDITURE'}
if set(cats)!=expected_c: err('loss categories mismatch')
if 'REPAIR_RECONSTITUTION' in cats: err('future reconstitution category remains canonical')

mat_labels={'CONSERVATIVE EVIDENCE-SUPPORTED FLOOR','CENTRAL MODELED ESTIMATE','ASSESSED UPPER ENVELOPE'}
for name in material_categories:
    c=cats.get(name,{})
    es=c.get('envelopes',[])
    if {x.get('label') for x in es}!=mat_labels: err(name+' material envelope labels mismatch')
    for e in es:
        if e.get('estimate_status')=='PENDING_ESTIMATE': err(name+' active cost envelope still pending')
        if e.get('estimated_cost_usd') is None: err(name+' calculated envelope lacks cost')
        if 'CONFIRMED' in str(e.get('label','')).upper() or 'OBSERVED FLOOR' in str(e.get('label','')).upper():
            err(name+' low material label overstates evidence basis')
        if e.get('calculation_components_usd'):
            comp=sum(v.get('subtotal_usd',0) for v in e['calculation_components_usd'].values())
            if abs(comp-e.get('estimated_cost_usd',0))>5: err(name+' component arithmetic mismatch')

if loss.get('aggregate_total_status')!='CALCULATED_BOUNDED_MATERIAL_LOSS_ENVELOPE':
    err('material aggregate status does not acknowledge calculated envelope')
agg=loss.get('aggregate_material_loss_summary',{})
addcats=agg.get('additive_categories',[])
if set(addcats)!=material_categories: err('additive material categories mismatch')
for key,field in [('low','conservative_evidence_supported_floor_usd'),
                  ('central','central_modeled_estimate_usd'),
                  ('high','assessed_upper_envelope_usd')]:
    calc=sum(cats[x]['cost_model_range_usd'][key] for x in addcats)
    target=agg.get('material_loss_range_usd',{}).get(key)
    if target!=calc: err('aggregate material arithmetic '+key)
    if agg.get(field)!=calc: err('aggregate named field mismatch '+field)
labels=agg.get('labels',{})
if labels.get('low')!='CONSERVATIVE EVIDENCE-SUPPORTED FLOOR': err('aggregate low label')
if labels.get('central')!='CENTRAL MODELED ESTIMATE': err('aggregate central label')
if labels.get('high')!='ASSESSED UPPER ENVELOPE': err('aggregate high label')

# Munitions low/central/high must use one common all-region scope.
mun=cats.get('MUNITIONS_EXPENDITURE',{})
mes=mun.get('envelopes',[])
expected_m_labels={'CONSERVATIVE ALL-REGION EXPENDITURE FLOOR',
                   'CENTRAL MODELED ALL-REGION EXPENDITURE',
                   'ASSESSED UPPER ALL-REGION EXPENDITURE ENVELOPE'}
if {x.get('label') for x in mes}!=expected_m_labels: err('munitions envelope labels mismatch')
scope_ids={x.get('scope_id') for x in mes}
if len(scope_ids)!=1 or None in scope_ids: err('munitions envelopes do not share one scope')
mvals={x.get('label'):x.get('estimated_cost_usd') for x in mes}
if mvals.get('CONSERVATIVE ALL-REGION EXPENDITURE FLOOR')!=419220000: err('munitions all-region low mismatch')
if mvals.get('CENTRAL MODELED ALL-REGION EXPENDITURE')!=5897135000: err('munitions central mismatch')
if mvals.get('ASSESSED UPPER ALL-REGION EXPENDITURE ENVELOPE')!=18512200000: err('munitions upper mismatch')
for e in mes:
    if not str(e.get('additivity','')).startswith('SEPARATE_EXPENDITURE'):
        err('munitions additivity flag')
    if e.get('estimate_status')=='PENDING_ESTIMATE': err('munitions active estimate pending')
    if e.get('calculation_components_usd'):
        comp=sum(v.get('subtotal_usd',0) for v in e['calculation_components_usd'].values())
        if abs(comp-e.get('estimated_cost_usd',0))>5: err('munitions component arithmetic mismatch')
narrow=mun.get('narrower_itemized_subset',{})
if narrow.get('estimated_cost_usd_low_case')!=165300000: err('Israel-only subset missing')
if any(e.get('estimated_cost_usd')==165300000 for e in mes): err('Israel-only subset incorrectly used as all-region bound')
am=agg.get('munitions_expenditure_separate_usd',{})
if [am.get('low'),am.get('central'),am.get('high')]!=[419220000,5897135000,18512200000]:
    err('aggregate munitions summary mismatch')

# v1.3.2 inventory-scope correction: buried/inaccessible missiles are not automatic 100% material loss.
inv=cats.get('MISSILE_UAS_INVENTORY',{})
mscope=inv.get('missile_physical_loss_scope',{})
ambig=mscope.get('upper_case_ambiguous_tranche_damage_equivalent_fraction')
if ambig is None: err('missile inventory missing ambiguous-tranche physical-damage fraction')
elif not (0 <= ambig < 1): err('missile ambiguous/inaccessible tranche treated as automatic full material loss')
if mscope.get('inaccessible_only_full_loss_fraction') != 0.0:
    err('inaccessible-only missile share carries nonzero full-loss fraction')
if mscope.get('ambiguous_second_third_status')!='damaged_destroyed_or_buried_inaccessible':
    err('missile ambiguous second-third status not preserved')
if inv.get('cost_model_range_usd',{}).get('high')!=24000000000:
    err('missile/UAS corrected upper material-loss envelope mismatch')
high_inv=next((x for x in inv.get('envelopes',[]) if x.get('label')=='ASSESSED UPPER ENVELOPE'),{})
hic=high_inv.get('calculation_components_usd',{}).get('missile_inventory_physical_loss_damage_equivalent',{})
if hic.get('quantity_equivalent')!=3000 or hic.get('subtotal_usd')!=24000000000:
    err('missile upper physical-loss equivalent does not reconcile')
if 'inaccessib' not in ' '.join(high_inv.get('exclusions',[])).lower():
    err('missile upper envelope does not explicitly exclude temporary inaccessibility')

# UAS destroyed-airframe quantity must either be derived or excluded from additive material dollars.
uas_treat=inv.get('uas_physical_inventory_treatment',{})
if uas_treat.get('status')!='EXCLUDED_FROM_ADDITIVE_MATERIAL_DOLLARS_NO_DEFENSIBLE_PHYSICAL_AIRFRAME_COUNT':
    err('UAS physical-inventory treatment is not explicit exclusion/derivation')
if uas_treat.get('material_loss_usd') != 0:
    err('unsupported UAS airframe quantity contributes additive material dollars')
# Generic release safeguard: any positive additive UAS/drone component requires documented physical derivation.
for e in inv.get('envelopes',[]):
    for ck,cv in e.get('calculation_components_usd',{}).items():
        if any(tok in ck.lower() for tok in ('uas','drone')) and cv.get('subtotal_usd',0)>0:
            deriv=inv.get('uas_physical_inventory_derivation',{})
            if not deriv.get('formula') or not deriv.get('source_ids') or not deriv.get('temporal_scope'):
                err('positive UAS destroyed-airframe component lacks documented derivation')

# Munitions composition must be source-derived and temporally compatible with the common Mar. 31 scope.
comp=mun.get('composition_derivation',{})
common_scope=next(iter(scope_ids)) if len(scope_ids)==1 else None
if comp.get('scope_id')!=common_scope: err('munitions composition scope does not match envelope scope')
if comp.get('scope_start')!='2026-02-28' or comp.get('scope_end')!='2026-03-31':
    err('munitions composition temporal scope mismatch')
if comp.get('combined_launch_total')!=6770: err('munitions combined launch total mismatch')
if comp.get('combined_total_source') not in ss: err('munitions combined total source missing')
inputs=comp.get('date_compatible_itemized_inputs',[])
if not inputs: err('munitions composition lacks date-compatible itemized inputs')
for row in inputs:
    if row.get('source') not in ss: err('munitions composition input has unknown source')
    if row.get('missiles',0)+row.get('uas',0)!=row.get('total'): err('munitions composition input arithmetic')
ism=sum(x.get('missiles',0) for x in inputs); isu=sum(x.get('uas',0) for x in inputs); ist=sum(x.get('total',0) for x in inputs)
sample=comp.get('itemized_sample',{})
if [ism,isu,ist] != [1234,3142,4376]: err('munitions date-compatible itemized sample changed')
if [sample.get('missiles'),sample.get('uas'),sample.get('total')] != [ism,isu,ist]: err('munitions itemized sample summary mismatch')
if comp.get('unclassified_launches') != 6770-ist: err('munitions unclassified launch count mismatch')
cases=comp.get('cases',{})
for e in mes:
    case=cases.get(e.get('composition_case_id'),{})
    ec=e.get('calculation_components_usd',{})
    mq=ec.get('missiles',{}).get('quantity'); uq=ec.get('uas',{}).get('quantity')
    if not case: err('munitions envelope missing composition case')
    else:
        if [mq,uq] != [case.get('missiles'),case.get('uas')]: err('munitions envelope/case quantity mismatch')
        if (mq or 0)+(uq or 0)!=6770: err('munitions envelope composition does not sum to 6,770')
    if e.get('temporal_scope_compatibility')!='COMPATIBLE_WITH_2026-02-28_THROUGH_2026-03-31_LAUNCH_SCOPE':
        err('munitions envelope lacks compatible temporal-scope declaration')
excluded=comp.get('excluded_stock_depletion_partition',{})
if excluded.get('source') not in ss: err('CSIS depletion-context source missing')
if excluded.get('temporal_compatibility')!='NOT_USED_FOR_MAR31_PARTITION':
    err('later CSIS 30/60 depletion estimate improperly used for Mar31 partition')
for e in mes:
    text=(str(e.get('quantity_basis',''))+' '+str(e.get('methodology',''))).lower()
    if '30% of' in text or '30 percent of' in text or '60% of' in text or '60 percent of' in text:
        err('munitions envelope still partitions Mar31 launches using later stock-depletion percentage')

# Repair/reconstitution scenario research may survive only in research-log.md, not canonical cost/output surfaces.
canonical_no_recon=[
 'iran-loss-envelopes.json','integration-bridge.json','CODEX-ADDON-INSTRUCTIONS.md',
 'README.md','addon-summary.md','manifest.json'
]
for fn in canonical_no_recon:
    t=(ROOT/fn).read_text(errors='ignore')
    for forbidden in ['1063284221','4611581000','16697981365','$1.063B','$4.612B','$16.698B','15%/30%/50%']:
        if forbidden in t: err('reconstitution scenario value remains canonical in '+fn)
if 'ANLG-REPAIR-SEVERITY' in (ROOT/'iran-war-cost-estimate.json').read_text(errors='ignore'):
    err('repair severity analogue remains in canonical cost ledger')

# Release-side PENDING_ESTIMATE cannot remain in authoritative current-cost data.
for fn in ['iran-loss-envelopes.json','iran-war-cost-estimate.json']:
    if 'PENDING_ESTIMATE' in (ROOT/fn).read_text():
        err('active pending cost state in '+fn)

# Legacy four-asset subset must be explicitly archival only.
cost=objs.get('iran-war-cost-estimate.json',{})
leg=cost.get('legacy_superseded_subset_snapshot',{})
if leg.get('display_label')!='LEGACY PARTIAL SUBSET — ARCHIVAL / BACKWARD-COMPATIBILITY ONLY':
    err('legacy subset display label')
if leg.get('status')!='LEGACY_PARTIAL_SUBSET_ARCHIVAL_BACKWARD_COMPATIBILITY_ONLY':
    err('legacy subset status')
bridge=objs.get('integration-bridge.json',{})
legacy_bridge=bridge.get('legacy_archive_only',[])
if not any(x.get('label')=='LEGACY PARTIAL SUBSET — ARCHIVAL / BACKWARD-COMPATIBILITY ONLY' for x in legacy_bridge):
    err('bridge does not demote legacy subset')

# Integration bridge authorities
auth=bridge.get('authorities',{})
for k in ['material_loss','munitions_expenditure','leadership_records','propositions_claims','source_namespace']:
    if k not in auth: err('bridge missing authority '+k)
if auth.get('material_loss',{}).get('file')!='iran-loss-envelopes.json': err('bridge material authority')
if auth.get('munitions_expenditure',{}).get('file')!='iran-loss-envelopes.json': err('bridge munitions authority')
if auth.get('leadership_records',{}).get('file')!='iran-leadership-casualties.json': err('bridge leadership authority')
if auth.get('propositions_claims',{}).get('file')!='iranian-claim-evolution.json': err('bridge proposition authority')
if auth.get('source_namespace',{}).get('count')!=len(srcs): err('bridge source count')

# Accepted leadership work
leaders=objs.get('iran-leadership-casualties.json',{})
if leaders.get('canonical_itemized_minimum')!=len(leaders.get('records',[])): err('leadership minimum mismatch')
if len(leaders.get('records',[]))!=11: err('accepted 11-person leadership ledger changed')
lcats={r.get('category') for r in leaders.get('records',[])}
if not {'SENIOR_POLITICAL_STATE','SENIOR_MILITARY_SECURITY'}.issubset(lcats):
    err('leadership category separation lost')

# gaps/requests exact mapping
g={x.get('gap_id') for x in objs.get('unresolved.json',{}).get('records',[])}
r={x.get('gap_id') for x in objs.get('collection-requests.json',{}).get('records',[])}
if g!=r: err('gap/request mismatch')
if len(g)!=14 or len(r)!=14: err('authoritative gaps/requests not 14/14')

# graph integrity
cg=objs.get('connection-graph.json',{})
nodes={x.get('id') for x in cg.get('nodes',[])}
for e in cg.get('edges',[]):
    if e.get('from') not in nodes or e.get('to') not in nodes: err('graph dangling edge')

# Version identity. Historical baseline version values are allowed only in dedicated baseline dependency metadata.
m=objs.get('manifest.json',{})
if m.get('version')!='1.3.2': err('manifest version')
if m.get('release_status')!='analytical-final': err('manifest release status')
if bridge.get('package_version')!='1.3.2-analytical-final': err('bridge package version')
if not (ROOT/'README.md').read_text().startswith('# ISR Atlas Forensic Add-on v1.3.2 — analytical-final'): err('README version header')
if not (ROOT/'addon-summary.md').read_text().startswith('# Forensic Add-on Summary — v1.3.2 analytical-final'): err('summary version header')
if not (ROOT/'CODEX-ADDON-INSTRUCTIONS.md').read_text().startswith('# CODEX ADD-ON INSTRUCTIONS — FORENSIC AUDIT v1.3.2 analytical-final'): err('Codex version header')
if 'v1.3.2 analytical-final' not in (ROOT/'ANALYTICAL-DOCTRINE.md').read_text().splitlines()[0]: err('doctrine version header')

# Current package counts and text summaries must agree with data.
counts=m.get('counts',{})
expect={
 'sources':len(srcs),
 'canonical_claims':len(claims),
 'claim_audits':len(objs.get('claim-audits.json',{}).get('claims',[])),
 'claim_chains':len(objs.get('claim-chain-index.json',{}).get('chains',[])),
 'unresolved':len(g),
 'collection_requests':len(r),
 'leadership_records':len(leaders.get('records',[])),
 'loss_envelope_categories':len(cats),
 'public_assessments':len(objs.get('public-assessments.json',{}).get('assessments',[]))
}
for k,v in expect.items():
    if counts.get(k)!=v: err('manifest count '+k)

codex=(ROOT/'CODEX-ADDON-INSTRUCTIONS.md').read_text()
readme=(ROOT/'README.md').read_text()
summary=(ROOT/'addon-summary.md').read_text()
if f'Sources: {len(srcs)}' not in codex: err('Codex source count')
if 'Gaps/requests: 14 / 14' not in codex: err('Codex gap/request count')
if 'Unresolved gaps / collection requests: **14 / 14**' not in readme: err('README gap/request count')
if '| Unresolved gaps | 14 |' not in summary or '| Matching collection requests | 14 |' not in summary:
    err('summary gap/request count')

# Manifest inventory/hashes
listed={x['name'] for x in m.get('files',[])}
disk={p.name for p in ROOT.iterdir() if p.is_file() and p.name!='manifest.json'}
if listed!=disk: err('manifest inventory mismatch')
for x in m.get('files',[]):
    p=ROOT/x['name']; b=p.read_bytes()
    if len(b)!=x.get('bytes') or hashlib.sha256(b).hexdigest()!=x.get('sha256'):
        err('manifest hash/size '+x['name'])

if errs:
    print('FAIL')
    [print('-',e) for e in errs]
    sys.exit(1)

print('PASS')
print(
    f'version=1.3.2-analytical-final sources={len(srcs)} claims={len(claims)} '
    f'gaps={len(g)} requests={len(r)} leadership={len(leaders.get("records",[]))} '
    f'material_categories={len(material_categories)} cost_categories={len(cats)}'
)
print(
    f'material_loss_usd={low_total if False else agg.get("conservative_evidence_supported_floor_usd")}/'
    f'{agg.get("central_modeled_estimate_usd")}/{agg.get("assessed_upper_envelope_usd")} '
    f'munitions_usd={am.get("low")}/{am.get("central")}/{am.get("high")}'
)
