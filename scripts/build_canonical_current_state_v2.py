#!/usr/bin/env python3
from __future__ import annotations
import argparse, copy, hashlib, json, re, sys
from datetime import date, datetime, timedelta
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import build_canonical_current_state as v1
SPEC="data/gate3/gate3-spec.json"; MANIFEST="data/canonical-ledger/manifest-v2.json"; OUT="data/canonical-current-state-v2.json"
SEEDS={"casualties":("data/integration-v1.2/casualties.json","records","casualty_id"),"agreements":("data/integration-v1.2/agreements.json","records","agreement_id"),"diplomacy":("data/integration-v1.2/diplomacy.json","records","diplomacy_id"),"facilities":("data/integration-v1.2/facilities.json","facilities","facility_id"),"movements":("data/integration-v1.2/movements.json","movements","movement_id"),"shipping":("data/integration-v1.2/shipping.json","records","shipping_id"),"economics":("data/integration-v1.2/economics.json","records","economic_id")}
PLURAL={"actor":"actors","location":"locations","claim":"claims","material_loss":"material_losses","casualty":"casualties","agreement":"agreements","diplomacy":"diplomacy","facility":"facilities","movement":"movements","shipping":"shipping","economic":"economics","gap":"gaps","narrative_claim":"narrative_claims","narrative_family":"narrative_families","information_chain":"information_chains","source_reliability":"source_reliability","legacy_disposition":"legacy_dispositions","side_ledger_disposition":"side_ledger_dispositions","relationship":"relationships"}
def load(root,p): return json.loads((root/p).read_text(encoding="utf-8"))
def cbytes(x): return (json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+"\n").encode()
def sha(b): return hashlib.sha256(b).hexdigest()
def canonical_packet_text_bytes(raw):
    """Return manifest-hash bytes for repository JSON text.

    Accepted v2 packet hashes describe the repository's LF text content, not a
    platform-specific checkout representation.  This deliberately changes
    newline representation only; JSON is never parsed or reserialized before
    its manifest hash is checked, so every substantive byte still matters.
    """
    raw.decode("utf-8")
    return raw.replace(b"\r\n", b"\n")
def dt(x):
    d=datetime.fromisoformat(x)
    if d.tzinfo is None: raise ValueError(f"timestamp needs offset: {x}")
    return d
def wrap(i,r,prov): return {"entity_id":i,"record":copy.deepcopy(r),"source_ids":list(r.get("source_ids") or []),"provenance":[prov],"revisions":[]}
def source_item(r,prov,key):
    return {"source_id":r["source_id"],"record":copy.deepcopy(r),"resolution":"CANONICAL_UPDATE_CURRENT","registry":None,"outlet_profile":None,"registry_status":"CANONICAL_UPDATE_SOURCE","provenance":[prov],"variants":[{"variant_key":key,"record":copy.deepcopy(r),"provenance":prov}],"field_conflicts":[],"revisions":[]}
def ensure_source(state,r,prov,key):
    by={x["source_id"]:x for x in state["sources"]["records"]}; i=r["source_id"]
    if i in by:
        old=(by[i].get("record") or {}).get("url")
        if old and old!=r.get("url"): raise ValueError(f"source collision {i}")
        by[i].setdefault("provenance",[]).append(prov); return
    state["sources"]["records"].append(source_item(r,prov,key))
def legacy_source(state,label,url,eid):
    i=v1.stable_id("SRC",url); r={"source_id":i,"outlet":label or "Legacy source","title":label or eid,"url":url,"published_date":None,"source_role":"LEGACY_SOURCE_REFERENCE"}
    ensure_source(state,r,{"kind":"GATE3_LEGACY_SOURCE","legacy_event_id":eid},f"legacy:{eid}:{i}"); return i
def chron(event,prov,key):
    e=copy.deepcopy(event); e["record_class"]=e.get("record_class") or e.get("event_class"); d=date.fromisoformat(e["event_date"]); s=list(dict.fromkeys(e.get("source_ids") or [])); e["source_ids"]=s
    t={"event_id":e["event_id"],"date":e["event_date"],"day":e["event_date"],"year":d.year,"month":e["event_date"][:7],"iso_week":f"{d.isocalendar().year}-W{d.isocalendar().week:02d}","time":e.get("event_time"),"time_precision":e.get("event_time_precision") or "DATE_ONLY","hour_bucket":None,"summary":e.get("summary"),"event_type":e.get("event_type"),"record_class":e["record_class"],"source_ids":s,"first_reported":e.get("public_available_time"),"first_verified":e.get("game_knowledge_time"),"claim_refs":[],"facility_refs":[],"map_refs":[]}
    return {"event_id":e["event_id"],"event":e,"timeline":t,"source_ids":s,"source_references":[{"source_id":x,"variant_key":f"{key}:{x}"} for x in s],"actor_ids":[],"location_ids":[],"claim_ids":[],"provenance":[prov],"revisions":[]}
def dispositions(spec):
    groups=spec["legacy_disposition"]; out={}
    for x in groups["clean"]: out[x]=("CLEAN_CANONICAL_SUCCESSOR","KEEP","CORE_WARTIME_EVENT")
    for x in groups["decomposed"]: out[x]=("FULLY_DECOMPOSED","KEEP","CORE_WARTIME_EVENT")
    for x in groups["partial"]: out[x]=("PARTIALLY_REPRESENTED","KEEP","CORE_WARTIME_EVENT")
    for x in groups["side"]: out[x]=("SIDE_LEDGER_SURVIVAL","SIDE","STATE_SNAPSHOT")
    for x in groups["restore_core"]: out[x]=("CORE_CHRONOLOGY_ORPHAN","RESTORE","CORE_WARTIME_EVENT")
    for x in groups["related_context"]: out[x]=("RELATED_THEATER_CONTEXT_ORPHAN","RESTORE","RELATED_THEATER_CONTEXT")
    for x in groups["period_assessment"]: out[x]=("PERIOD_ASSESSMENT","RESTORE","PERIOD_ASSESSMENT")
    out["E030"]=("SIDE_LEDGER_SURVIVAL","RESTORE","CORE_WARTIME_EVENT"); out["E037"]=("SIDE_LEDGER_SURVIVAL","SPLIT","CORE_WARTIME_EVENT")
    if set(out)!={f"E{i:03d}" for i in range(1,64)}: raise ValueError("legacy disposition incomplete")
    return out
def restore_legacy(root,state,spec):
    disp=dispositions(spec); raw={x["id"]:x for x in load(root,"data/events.json").get("fullLedger",[]) if x.get("id") in disp}; restored=[]
    for eid,(klass,act,eclass) in sorted(disp.items()):
        if act not in {"RESTORE","SPLIT"}: continue
        x=raw.get(eid)
        if not x: raise ValueError(f"missing legacy row {eid}")
        nid=f"LEG-{eid}" + ("-KINETIC" if act=="SPLIT" else ""); src=[]
        for s in x.get("src") or []:
            if isinstance(s,list) and len(s)>1 and s[1]: src.append(legacy_source(state,str(s[0]),str(s[1]),eid))
        summary=x.get("confirmed") or x.get("significance") or f"Restored {eid}"
        if eid=="E030": summary="July 17 Iranian regional attacks with confirmed U.S. casualties; wider damage claims remain source-bounded."
        if eid=="E037": summary="Eleventh consecutive U.S. strike night; cumulative 18-KIA/430-WIA snapshot retained separately and not additive."
        event={"event_id":nid,"legacy_event_id":eid,"event_date":x["date"],"event_time":x.get("time"),"event_time_precision":"DATE_ONLY","summary":summary,"event_type":"LEGACY_RESTORED","event_class":eclass,"evidence_form":"LEGACY_SOURCE_BOUNDED","knowledge_class":"CONTEMPORANEOUS_RESTORED","strike_countable":eclass=="CORE_WARTIME_EVENT","public_available_time":f"{x['date']}T23:59:59-04:00","game_knowledge_time":f"{x['date']}T23:59:59-04:00","source_ids":src,"gate2_disposition":klass}
        state["chronology"].append(chron(event,{"kind":"GATE3_GATE2_LEGACY_RESTORATION","legacy_event_id":eid},"legacy")); restored.append(nid)
    state["entities"]["legacy_dispositions"]=[wrap(eid,{"legacy_event_id":eid,"migration_class":a,"action":b,"event_class":c},{"kind":"GATE3_SPEC","path":SPEC}) for eid,(a,b,c) in sorted(disp.items())]
    return restored
def seed(root,state,spec):
    for plural,(p,a,i) in SEEDS.items():
        data=load(root,p); state["entities"][plural]=[wrap(r[i],r,{"kind":"IMMUTABLE_SIDE_LEDGER_SEED","path":p,"index":n}) for n,r in enumerate(data.get(a) or [])]
    req=load(root,"data/integration-v1.2/collection-requests.json").get("requests") or []; by={}
    for r in req:
        m=re.search(r"GAP-?0*([0-9]+)",str(r.get("request_id") or ""))
        if m: by.setdefault(f"GAP-{int(m.group(1)):03d}",[]).append(r)
    gaps=[]
    for n,r in enumerate(load(root,"data/integration-v1.2/unresolved.json").get("items") or []):
        m=re.search(r"([0-9]+)$",str(r.get("unresolved_id") or r.get("gap_id") or "")); gid=f"GAP-{int(m.group(1)):03d}" if m else None
        if not gid or gid not in spec["gap_statuses"]: raise ValueError("gap migration mismatch")
        z=copy.deepcopy(r); z.pop("unresolved_id",None); z["gap_id"]=gid; z.update(spec["gap_statuses"][gid]); z["collection_actions"]=by.get(gid,[]); gaps.append(wrap(gid,z,{"kind":"UNIFIED_GAP_MIGRATION","index":n}))
    state["entities"]["gaps"]=gaps
    for k in ("narrative_claims","narrative_families","information_chains","source_reliability","legacy_dispositions"): state["entities"].setdefault(k,[])
def migrate_info(root,state,spec):
    claims=state["entities"]["narrative_claims"]
    for n,r in enumerate(load(root,"data/information_war_claims_v2_7.json"),1):
        cid=f"LL-LEGACY-INFO-{n:03d}"; src=[]
        for s in r.get("sources") or []:
            if s.get("url"): src.append(legacy_source(state,s.get("label") or "Fact check",s["url"],cid))
        verdict=str(r.get("verdict") or "").upper(); truth="DISPROVEN" if "FALSE" in verdict else "MISLEADING" if "MISLEAD" in verdict else "UNRESOLVED"
        rec={"claim_id":cid,"actor":"Information environment / originator to be traced","claim":r.get("claim"),"proposition":r.get("claim"),"claim_category":"other","source_ids":src,"truth_adjudication":truth,"claim_test_status":"CLAIM_DISPROVEN" if truth=="DISPROVEN" else "TEST_IN_MOTION","deception_score":0,"deception_basis":"Artifact/proposition failure does not by itself establish originator knowledge.","knowledge_access":"TO_BE_TRACED","event_tree":["CLAIM","ACTION_BEHAVIOR","EXTERNAL_RESPONSE","OBSERVED_YIELD","CURRENT_ADJUDICATION"],"narrative_function":"Observable information effect only; motive not inferred.","confidence":"MEDIUM","what_would_change_rating":"Originator/amplifier reconstruction or direct knowledge evidence.","event_time":r.get("date_window"),"knowledge_time":r.get("last_reviewed_et"),"artifact_status":r.get("media_type"),"originator_status":"UNRESOLVED","inherited_assessment":r.get("assessment")}
        claims.append(wrap(cid,rec,{"kind":"LIE_LEDGER_MIGRATION","path":"data/information_war_claims_v2_7.json","index":n-1}))
    evo=load(root,"data/forensic-v1.3.2/iranian-claim-evolution.json"); recs=(evo.get("records") or evo.get("claims") or evo) if isinstance(evo,dict) else evo
    state["entities"]["information_chains"].append(wrap("INFOCHAIN-IRANIAN-CLAIM-EVOLUTION-V132",{"information_chain_id":"INFOCHAIN-IRANIAN-CLAIM-EVOLUTION-V132","records":recs,"rule":"Preserve original claim, amplification, contradiction and correction."},{"kind":"CLAIM_EVOLUTION_MIGRATION"}))
    for n,q in enumerate(spec["lie_ledger"]["priority_queue"],1): state["entities"]["narrative_families"].append(wrap(f"NF-{n:03d}",{"narrative_family_id":f"NF-{n:03d}","claim_family":q,"status":"RECONSTRUCT_FROM_EXISTING_OR_COLLECT"},{"kind":"LIE_LEDGER_PRIORITY_QUEUE"}))
def side_reconcile(root,state,spec):
    """Require every event-producing side record to resolve to an event or an explicit non-event/aggregate disposition."""
    over=spec["side_overrides"]
    legacy={x["id"]:x for x in load(root,"data/events.json").get("fullLedger",[]) if x.get("id")}
    event_ids={x["event_id"] for x in state["chronology"]}
    def add_side_event(eid,record,kind,summary,event_class="STATE_SNAPSHOT",strike=False):
        if eid in event_ids: return eid
        sids=list(record.get("source_ids") or [])
        if not sids: raise ValueError(f"side-ledger event {eid} lacks provenance")
        ev={"event_id":eid,"event_date":record["event_date"],"event_time_precision":"DATE_ONLY","summary":summary,"event_type":kind,"event_class":event_class,"evidence_form":"SIDE_LEDGER_SUPPORTED","knowledge_class":"MIGRATED_CONTEMPORANEOUS_RECORD","strike_countable":strike,"public_available_time":f"{record['event_date']}T23:59:59-04:00","game_knowledge_time":f"{record['event_date']}T23:59:59-04:00","source_ids":sids,"side_ledger_origin":True}
        state["chronology"].append(chron(ev,{"kind":"GATE3_SIDE_LEDGER_PROMOTION","side_record_id":eid},"side")); event_ids.add(eid); return eid
    casualty_map={"C001":"G3-SIDE-US-CASUALTIES-20260301","C002":"G3-SIDE-US-CASUALTIES-20260301","C003":"G3-SIDE-KC135-20260312","C004":"G3-SIDE-HELO-20260701","C005":"LEG-E030","C008":"LEG-E004"}
    for x in state["entities"]["casualties"]:
        r=x["record"]; rid=x["entity_id"]
        if rid in over:
            x["semantic_disposition"]=copy.deepcopy(over[rid]); continue
        if str(r.get("aggregation_type") or "").upper()=="CUMULATIVE_SNAPSHOT" or r.get("cumulative_snapshot"):
            x["semantic_disposition"]={"disposition":"AGGREGATE_SNAPSHOT","additive":False}; continue
        if rid in casualty_map:
            ref=casualty_map[rid]
            if ref.startswith("G3-SIDE"):
                add_side_event(ref,r,"CASUALTY_BEARING_OPERATIONAL_EVENT",r.get("notes") or f"Casualty-bearing event linked from {rid}",event_class="CORE_WARTIME_EVENT" if r.get("cause_type")=="HOSTILE" else "STATE_SNAPSHOT",strike=r.get("cause_type")=="HOSTILE")
            x["semantic_disposition"]={"disposition":"EVENT_LINK","canonical_event_ref":ref}; continue
        if r.get("event_ref"):
            ref="LEG-"+str(r["event_ref"]) if "LEG-"+str(r["event_ref"]) in event_ids else str(r["event_ref"])
            x["semantic_disposition"]={"disposition":"EVENT_LINK","canonical_event_ref":ref}; continue
        if r.get("event_date") and str(r.get("aggregation_type") or "").upper()=="ADDITIVE_EVENT":
            ref=add_side_event(f"G3-SIDE-CAS-{rid}",r,"CASUALTY_BEARING_EVENT",r.get("notes") or f"Event producing casualty record {rid}",event_class="CORE_WARTIME_EVENT" if r.get("cause_type")=="HOSTILE" else "STATE_SNAPSHOT",strike=r.get("cause_type")=="HOSTILE")
            x["semantic_disposition"]={"disposition":"EVENT_LINK","canonical_event_ref":ref}
        else:
            x["semantic_disposition"]={"disposition":"NON_EVENT_OR_AGGREGATE","reason":"Record is a cumulative/estimate/status observation rather than a discrete attributable event.","additive":False}
    material_by={((x.get("record") or {}).get("loss_id") or x.get("loss_id") or x.get("entity_id")):x for x in state["entities"].get("material_losses") or []}
    loss_map={"MAT-IRN-DENA-20260304":"LEG-E004","MAT-USA-KC135-20260312":"G3-SIDE-KC135-20260312","MAT-USA-HELO-20260701":"G3-SIDE-HELO-20260701","MAT-USA-PRINCESULTAN-AIRCRAFT":"LEG-E008"}
    for rid,x in material_by.items():
        r=x.get("record") or {}
        if rid in over and over[rid].get("disposition")=="CLAIM_ONLY":
            legid=over[rid].get("related_legacy_event_id"); l=legacy.get(legid) or {}; sid=[]
            for s in l.get("src") or []:
                if isinstance(s,list) and len(s)>1 and s[1]: sid.append(legacy_source(state,str(s[0]),str(s[1]),legid))
            r["source_ids"]=list(dict.fromkeys((r.get("source_ids") or [])+sid)); x["source_ids"]=copy.deepcopy(r["source_ids"]); r["exclude_from_verified_attrition"]=True; r["verified_attrition"]=False
            x["semantic_disposition"]=copy.deepcopy(over[rid])
            if not x["source_ids"]: raise ValueError(f"claim-only material record lacks provenance {rid}")
            continue
        if rid in loss_map:
            ref=loss_map[rid]
            if ref.startswith("G3-SIDE") and ref not in event_ids:
                add_side_event(ref,r,"MATERIAL_LOSS_EVENT",r.get("note") or f"Material loss {rid}",event_class="STATE_SNAPSHOT",strike=False)
            x["semantic_disposition"]={"disposition":"EVENT_LINK","canonical_event_ref":ref}; continue
        rawref=r.get("event_ref")
        if rawref:
            ref="LEG-"+str(rawref) if "LEG-"+str(rawref) in event_ids else str(rawref)
            x["semantic_disposition"]={"disposition":"EVENT_LINK","canonical_event_ref":ref}; continue
        if r.get("event_date"):
            ref=add_side_event(f"G3-SIDE-LOSS-{re.sub(r'[^A-Z0-9-]+','-',str(rid).upper())}",r,"MATERIAL_DAMAGE_OBSERVATION",r.get("note") or f"Material damage/loss observation {rid}",event_class="STATE_SNAPSHOT",strike=False)
            x["semantic_disposition"]={"disposition":"EVENT_LINK","canonical_event_ref":ref}
        else:
            x["semantic_disposition"]={"disposition":"NON_EVENT_UNRESOLVED_DATE","reason":"Record has a date range or unresolved first-damage date; retained as a material state observation pending event resolution.","additive":False}
    state["entities"]["side_ledger_dispositions"]=[]
    for plural in ("casualties","material_losses"):
        for x in state["entities"].get(plural) or []:
            rid=x.get("entity_id") or x.get("loss_id") or (x.get("record") or {}).get("loss_id")
            state["entities"]["side_ledger_dispositions"].append(wrap(f"SLD-{re.sub(r'[^A-Z0-9-]+','-',str(rid).upper())}",{"side_ledger_disposition_id":f"SLD-{re.sub(r'[^A-Z0-9-]+','-',str(rid).upper())}","side_record_id":rid,"side_collection":plural,**copy.deepcopy(x["semantic_disposition"])},{"kind":"GATE3_SIDE_LEDGER_RECONCILIATION"}))
def apply_packet(root,state,p,path):
    src={x["source_id"]:x for x in state["sources"]["records"]}
    for r in p.get("sources") or []:
        prov={"kind":"GATE3_ACCEPTED_PACKET","packet_id":p["packet_id"],"path":path}; ensure_source(state,r,prov,f"{p['packet_id']}:{r['source_id']}"); src={x["source_id"]:x for x in state["sources"]["records"]}
    ids={x["event_id"] for x in state["chronology"]}
    for e in p.get("events") or []:
        if e["event_id"] in ids: raise ValueError(f"duplicate event {e['event_id']}")
        miss=set(e.get("source_ids") or [])-set(src)
        if miss: raise ValueError(f"unresolved event sources {miss}")
        if e.get("event_class") in {"RELATED_THEATER_CONTEXT","PERIOD_ASSESSMENT","STATE_SNAPSHOT","DIPLOMATIC_OR_POLICY_EVENT"} and e.get("strike_countable"): raise ValueError(f"non-strike class counted as strike {e['event_id']}")
        if e.get("public_available_time") and dt(e["public_available_time"]).date()<date.fromisoformat(e["event_date"]): raise ValueError(f"backdated evidence {e['event_id']}")
        state["chronology"].append(chron(e,{"kind":"GATE3_ACCEPTED_PACKET","packet_id":p["packet_id"],"path":path},p["packet_id"])); ids.add(e["event_id"])
    for ent in p.get("entities") or []:
        et=ent["entity_type"]
        if et not in PLURAL: raise ValueError(f"unsupported v2 entity type {et}")
        plural=PLURAL[et]; eid=ent["entity_id"]; coll=state["entities"].setdefault(plural,[])
        id_fields={"actor":"actor_id","location":"location_id","claim":"case_id","material_loss":"loss_id"}
        def wid(x):
            return x.get("entity_id") or x.get(id_fields.get(et,"")) or (x.get("record") or {}).get(id_fields.get(et,"")) or (x.get("record") or {}).get(f"{et}_id")
        found=next((x for x in coll if wid(x)==eid),None)
        if ent.get("mode")=="update":
            if not found: raise ValueError(f"missing update target {eid}")
            found["record"].update(copy.deepcopy(ent["record"])); found["source_ids"]=list(found["record"].get("source_ids") or [])
            found.setdefault("revisions",[]).append({"packet_id":p["packet_id"],"known_at":p["known_at"],"kind":"GATE3_ENTITY_UPDATE"})
        else:
            if found: raise ValueError(f"duplicate entity {eid}")
            coll.append(wrap(eid,ent["record"],{"kind":"GATE3_ACCEPTED_PACKET","packet_id":p["packet_id"]}))
    for r in p.get("narrative_claims") or []:
        if not r.get("source_ids"): raise ValueError(f"claim lacks provenance {r['claim_id']}")
        state["entities"]["narrative_claims"].append(wrap(r["claim_id"],r,{"kind":"GATE3_ACCEPTED_PACKET","packet_id":p["packet_id"]}))
def coverage(state):
    by={}
    for x in state["chronology"]: by.setdefault(x["event"]["event_date"],[]).append(x["event_id"])
    start=min(date.fromisoformat(x) for x in by); end=dt(state["release"]["gate2_evidence_cutoff"]).date(); out=[]
    while start<=end:
        d=start.isoformat(); ids=sorted(by.get(d,[])); out.append({"date":d,"status":"EVENTS_RECORDED" if ids else "NO_CANONICAL_EVENT_RECORDED","canonical_event_ids":ids,"canonical_event_count":len(ids),"derived":True}); start+=timedelta(days=1)
    return out
def build_state(root=ROOT):
    root=Path(root).resolve(); base,report=v1.build_state(root); state=copy.deepcopy(base); spec=load(root,SPEC); man=load(root,MANIFEST)
    if spec["gate2_evidence_cutoff"]!=man["gate2_evidence_cutoff"]: raise ValueError("Gate2 cutoff mismatch")
    state["schema_version"]="2.0"; state["artifact_role"]="DERIVED_CANONICAL_CURRENT_ENTITY_STATE_V2"; seed(root,state,spec); restored=restore_legacy(root,state,spec); migrate_info(root,state,spec); side_reconcile(root,state,spec)
    prior=dt(base["release"]["current_osint_cutoff"]); accepted=[]
    for n,e in enumerate(man["accepted_updates"],1):
        if e["sequence"]!=n: raise ValueError("packet sequence gap")
        raw=canonical_packet_text_bytes((root/e["path"]).read_bytes())
        if sha(raw)!=e["sha256"]: raise ValueError(f"packet hash changed {e['path']}")
        p=json.loads(raw); known=dt(p["known_at"])
        if known<=prior or known>dt(man["gate2_evidence_cutoff"]): raise ValueError("packet knowledge order/cutoff violation")
        prior=known; apply_packet(root,state,p,e["path"]); accepted.append({**e,"summary":p["summary"]})
    state["chronology"].sort(key=lambda x:(x["event"]["event_date"],str(x["event"].get("event_time") or ""),x["event_id"]))
    state["accepted_updates_v2"]=accepted; state["release"]["gate2_evidence_cutoff"]=man["gate2_evidence_cutoff"]; state["release"]["current_osint_cutoff"]=man["gate2_evidence_cutoff"]; state["release"]["current_osint_cutoff_display"]="September 5, 2026 00:37 ET"; state["release"]["canonical_state_identity_v2"]="canonical-current-v2-"+sha(cbytes({"base":base["release"]["canonical_state_identity"],"packets":accepted,"restored":restored}))[:16]
    state["daily_coverage"]=coverage(state); state["counts"].update({"gate3_chronology_records":len(state["chronology"]),"gate3_legacy_events_restored":len(restored),"gate3_update_packets":len(accepted),"gate3_narrative_claims":len(state["entities"]["narrative_claims"])})
    state["integrity"].update({"gate3_cutoff_frozen":True,"legacy_disposition_complete":True,"daily_coverage_derived_from_chronology":True,"false_is_not_automatically_lie":True,"cumulative_casualty_snapshots_nonadditive":True,"frozen_v1_inputs_mutated":False,"gate3_semantic_validation_ready":True})
    return state
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--root",default=str(ROOT)); ap.add_argument("--output",default=OUT); ap.add_argument("--check",action="store_true"); a=ap.parse_args(); root=Path(a.root).resolve(); out=Path(a.output); out=out if out.is_absolute() else root/out; b=cbytes(build_state(root))
    if a.check:
        if not out.is_file() or out.read_bytes()!=b: raise SystemExit(f"FAIL stale {out}")
        print("gate3 canonical: PASS"); return 0
    out.parent.mkdir(parents=True,exist_ok=True); out.write_bytes(b); print(f"gate3 canonical: wrote {out}"); return 0
if __name__=="__main__": raise SystemExit(main())
