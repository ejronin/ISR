#!/usr/bin/env python3
"""Build the Gate 3 public read model after validating the unchanged v1 public contract."""
from __future__ import annotations
import argparse, copy, hashlib, json, sys
from pathlib import Path
from typing import Any
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import build_public_current_state as public_v1
CANONICAL_V1="data/canonical-current-state.json"; CANONICAL_V2="data/canonical-current-state-v2.json"; DEFAULT_OUTPUT="data/public-current-state-v2.json"
def canonical_bytes(value:Any)->bytes: return (json.dumps(value,ensure_ascii=False,indent=2,sort_keys=True)+"\n").encode("utf-8")
def sha256(value:bytes)->str: return hashlib.sha256(value).hexdigest()
def entity_payload(canonical:dict[str,Any],key:str)->dict[str,Any]: return {"schema_version":"2.0","records":[copy.deepcopy(item.get("record") or item) for item in canonical["entities"].get(key,[])]}
def dataset(key:str,path:str,payload:Any)->dict[str,Any]: return {"key":key,"path":path,"role":"DERIVED_GATE3_CANONICAL_DATASET","payload":copy.deepcopy(payload),"media_type":"application/json","sha256":sha256(canonical_bytes(payload)),"source_references":[]}
def build_state(root:Path=ROOT)->dict[str,Any]:
    root=root.resolve()
    if not (root/CANONICAL_V1).is_file(): raise ValueError("Build data/canonical-current-state.json before Gate 3 public state")
    canonical=json.loads((root/CANONICAL_V2).read_text(encoding="utf-8"))
    if canonical.get("schema_version")!="2.0": raise ValueError("Gate 3 public builder requires canonical-current-state-v2")
    state=public_v1.build_state(root)
    state["schema_version"]="2.0"; state["artifact_role"]="DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL_V2"; state["authority_notice"]="Gate 3 public view. The sealed v1 state and its public contract were validated first; v2 then overlays append-only evidence corrections."
    state["chronology"]=copy.deepcopy(canonical["chronology"]); state["sources"]=copy.deepcopy(canonical["sources"]); state["entities"]=copy.deepcopy(canonical["entities"]); state["revision_history"]=copy.deepcopy(canonical.get("revision_history") or []); state["accepted_updates_v2"]=copy.deepcopy(canonical.get("accepted_updates_v2") or [])
    release=canonical["release"]; state["release"].update({"gate2_evidence_cutoff":release["gate2_evidence_cutoff"],"canonical_state_identity_v2":release["canonical_state_identity_v2"],"current_osint_cutoff":release["current_osint_cutoff"],"current_osint_cutoff_display":release["current_osint_cutoff_display"]})
    state["canonical_lineage"].update({"path":CANONICAL_V2,"sha256":sha256((root/CANONICAL_V2).read_bytes()),"v1_path":CANONICAL_V1,"v1_sha256":sha256((root/CANONICAL_V1).read_bytes())})
    replacements={"current.actors":[copy.deepcopy(item) for item in canonical["entities"].get("actors",[])],"current.locations":[copy.deepcopy(item) for item in canonical["entities"].get("locations",[])],"current.claims":{"schema_version":"2.0","claims":[copy.deepcopy(item["record"]) for item in canonical["entities"].get("claims",[])]},"current.material_losses":{"schema_version":"2.0","records":[copy.deepcopy(item["record"]) for item in canonical["entities"].get("material_losses",[])]},"current.relationships":copy.deepcopy(canonical["entities"].get("relationships",[]))}
    for key,payload in replacements.items():
        if key in state["datasets"]: state["datasets"][key]=dataset(key,CANONICAL_V2,payload)
    additions={"gate3.casualties":entity_payload(canonical,"casualties"),"gate3.agreements":entity_payload(canonical,"agreements"),"gate3.diplomacy":entity_payload(canonical,"diplomacy"),"gate3.facilities":entity_payload(canonical,"facilities"),"gate3.movements":entity_payload(canonical,"movements"),"gate3.shipping":entity_payload(canonical,"shipping"),"gate3.economics":entity_payload(canonical,"economics"),"gate3.gaps":entity_payload(canonical,"gaps"),"gate3.lie_ledger":entity_payload(canonical,"narrative_claims"),"gate3.narrative_families":entity_payload(canonical,"narrative_families"),"gate3.information_chains":entity_payload(canonical,"information_chains"),"gate3.daily_coverage":{"schema_version":"2.0","records":copy.deepcopy(canonical["daily_coverage"])},"gate3.legacy_dispositions":entity_payload(canonical,"legacy_dispositions"),"gate3.side_ledger_dispositions":entity_payload(canonical,"side_ledger_dispositions"),"gate3.source_reliability":entity_payload(canonical,"source_reliability")}
    for key,payload in additions.items(): state["datasets"][key]=dataset(key,CANONICAL_V2,payload)
    state["counts"].update({"gate3_dataset_records":sum(len((payload.get("records") or [])) for payload in additions.values() if isinstance(payload,dict)),"gate3_chronology_records":len(canonical["chronology"]),"gate3_lie_ledger_records":len(canonical["entities"].get("narrative_claims") or []),"gate3_source_records":len(canonical["sources"].get("records") or [])})
    state["integrity"].update({"gate3_semantic_validation_ready":canonical["integrity"]["gate3_semantic_validation_ready"],"false_is_not_automatically_lie":True,"daily_coverage_derived_from_chronology":True,"browser_replays_update_packets":False,"v1_public_contract_validated_before_v2_overlay":True})
    return state
def main()->int:
    p=argparse.ArgumentParser(description=__doc__); p.add_argument("--root",default=str(ROOT)); p.add_argument("--output",default=DEFAULT_OUTPUT); p.add_argument("--check",action="store_true"); a=p.parse_args(); root=Path(a.root).resolve(); output=Path(a.output); output=output if output.is_absolute() else root/output; serialized=canonical_bytes(build_state(root))
    if a.check:
        if not output.is_file() or output.read_bytes()!=serialized: raise SystemExit(f"FAIL: generated Gate 3 public state is missing or stale: {output}")
        print("gate3-public-current-state: PASS"); return 0
    output.parent.mkdir(parents=True,exist_ok=True); output.write_bytes(serialized); print(f"gate3-public-current-state: wrote {output.relative_to(root)}"); return 0
if __name__=="__main__": raise SystemExit(main())
