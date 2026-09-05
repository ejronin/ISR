#!/usr/bin/env python3
"""Adversarial Gate 3 semantic validator."""
from __future__ import annotations
import json, sys
from datetime import date, datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import build_canonical_current_state_v2 as gate3

def fail(message:str)->None: raise AssertionError(message)
def main()->int:
    state=gate3.build_state(ROOT)
    dispositions=[item["record"] for item in state["entities"].get("legacy_dispositions",[])]
    expected={f"E{i:03d}" for i in range(1,64)}; actual=[row["legacy_event_id"] for row in dispositions]
    if set(actual)!=expected or len(actual)!=63: fail("missing, duplicate or extra legacy disposition")
    event_ids={x["event_id"] for x in state["chronology"]}
    source_ids={x["source_id"] for x in state["sources"]["records"]}
    for collection in ("claims","narrative_claims"):
        for item in state["entities"].get(collection,[]):
            s=item.get("source_ids") or (item.get("record") or {}).get("source_ids") or []
            if not s: fail(f"claim record lacks provenance: {collection}:{item.get('entity_id') or item.get('case_id')}")
            if set(s)-source_ids: fail(f"claim record has unresolved source: {collection}:{item.get('entity_id')}")
            r=item.get("record") or {}
            if r.get("truth_adjudication")=="KNOWING_FALSEHOOD_LIE" and (r.get("deception_score",-1)<3 or not r.get("deception_basis")):
                fail(f"lie classification lacks knowledge evidence: {item.get('entity_id')}")
    for item in state["chronology"]:
        event=item["event"]; eid=item["event_id"]
        if not event.get("source_ids"): fail(f"chronology event lacks source provenance: {eid}")
        if set(event.get("source_ids") or [])-source_ids: fail(f"chronology event has unresolved source provenance: {eid}")
        if event.get("event_class") in {"PERIOD_ASSESSMENT","STATE_SNAPSHOT","RELATED_THEATER_CONTEXT","DIPLOMATIC_OR_POLICY_EVENT"} and event.get("strike_countable"):
            fail(f"non-strike class counted as strike: {eid}")
        if "RETROSPECTIVE" in str(event.get("knowledge_class") or ""):
            public=event.get("public_available_time")
            if public and datetime.fromisoformat(public).date()<date.fromisoformat(event["event_date"]): fail(f"retrospective discovery backdated: {eid}")
    for item in state["entities"].get("casualties",[]):
        r=item["record"]; d=item.get("semantic_disposition")
        if not d: fail(f"casualty lacks semantic disposition: {item['entity_id']}")
        if (r.get("cumulative_snapshot") or str(r.get("aggregation_type") or "").upper()=="CUMULATIVE_SNAPSHOT") and d.get("additive") is not False: fail(f"cumulative casualty snapshot became additive: {item['entity_id']}")
        if d.get("disposition")=="EVENT_LINK" and d.get("canonical_event_ref") not in event_ids: fail(f"casualty event link does not resolve: {item['entity_id']} -> {d.get('canonical_event_ref')}")
        if d.get("disposition") not in {"EVENT_LINK","AGGREGATE_SNAPSHOT","NON_EVENT_OR_AGGREGATE"}: fail(f"casualty has ambiguous semantic disposition: {item['entity_id']} {d}")
    for item in state["entities"].get("material_losses",[]):
        rid=item.get("loss_id") or (item.get("record") or {}).get("loss_id") or item.get("entity_id"); d=item.get("semantic_disposition")
        if not d: fail(f"material loss lacks semantic disposition: {rid}")
        if d.get("disposition")=="EVENT_LINK" and d.get("canonical_event_ref") not in event_ids: fail(f"material loss event link does not resolve: {rid} -> {d.get('canonical_event_ref')}")
        if d.get("disposition")=="CLAIM_ONLY" and not (item.get("source_ids") or (item.get("record") or {}).get("source_ids")): fail(f"claim-only material record lacks provenance: {rid}")
        if d.get("disposition") not in {"EVENT_LINK","CLAIM_ONLY","NON_EVENT_UNRESOLVED_DATE"}: fail(f"material loss has ambiguous semantic disposition: {rid} {d}")
    gaps=state["entities"].get("gaps",[])
    if {item["entity_id"] for item in gaps}!={f"GAP-{i:03d}" for i in range(1,20)}: fail("unresolved/collection migration diverged from GAP-001..GAP-019")
    for item in gaps:
        if "collection_actions" not in item["record"]: fail(f"gap lacks attached collection actions: {item['entity_id']}")
    for row in state["daily_coverage"]:
        if row["status"]=="NO_CANONICAL_EVENT_RECORDED" and row["canonical_event_ids"]: fail(f"quiet date contains canonical event: {row['date']}")
    serialized=json.dumps({"chronology":state["chronology"],"gate3_entities":{k:v for k,v in state["entities"].items() if k.startswith("narrative") or k.startswith("information")}},ensure_ascii=False).casefold()
    if "founding signatories" in serialized: fail("do-not-restore violation: stronger founding-signatory wording returned")
    for actor in state["entities"].get("actors",[]):
        r=actor.get("record") or {}; name=str(r.get("canonical_name") or "").casefold()
        if any(t in name for t in ("hezbollah","houthi")) and r.get("flag"): fail(f"do-not-restore violation: non-state actor has host-state flag: {r.get('canonical_name')}")
    if state["release"]["gate2_evidence_cutoff"]!="2026-09-05T00:37:00-04:00": fail("Gate 2 evidentiary boundary drifted")
    if state["integrity"].get("frozen_v1_inputs_mutated"): fail("frozen v1 inputs mutated")
    print("gate3-semantic-validation: PASS")
    print(f"  chronology={len(state['chronology'])}")
    print(f"  legacy_dispositions={len(dispositions)}")
    print(f"  gaps={len(gaps)}")
    print(f"  narrative_claims={len(state['entities'].get('narrative_claims',[]))}")
    return 0
if __name__=="__main__": raise SystemExit(main())
