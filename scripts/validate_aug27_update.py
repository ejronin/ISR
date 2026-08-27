#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OVERLAY=ROOT/"data"/"current-update-20260827"

def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def text(path: str):
    return (ROOT/path).read_text(encoding="utf-8")

def require(condition: bool,message: str):
    if not condition: raise AssertionError(message)

def canonical_id(url: str)->str:
    return "SRC-"+hashlib.sha1(url.rstrip("/").encode("utf-8")).hexdigest()[:12].upper()

def main()->int:
    manifest=load(OVERLAY/"manifest.json")
    events=load(OVERLAY/"events.json").get("events",[])
    timeline=load(OVERLAY/"timeline.json").get("records",[])
    sources=load(OVERLAY/"sources.json").get("sources",[])
    messaging=load(ROOT/"data"/"iran-messaging-shifts-20260827-r1.json")
    require(manifest.get("counts")=={"overlay_events":3,"overlay_timeline_records":3,"overlay_sources":3,"current_chronology_records":205},"Aug27 manifest counts changed")
    require(manifest.get("equation")=="202 + 3 = 205","Aug27 chronology equation changed")
    require(manifest.get("depends_on",{}).get("current_chronology_records")==202,"Aug27 must layer after 202-record reconciliation")
    require(len(events)==len(timeline)==len(sources)==3,"Aug27 overlay must contain 3 events/timeline records/sources")
    ids=[e.get("event_id") for e in events]
    require(len(set(ids))==3 and None not in ids,"Aug27 event IDs missing/duplicated")
    require(set(ids)=={r.get("event_id") for r in timeline},"Aug27 event/timeline IDs differ")
    source_ids={s.get("source_id") for s in sources}
    require(len(source_ids)==3 and None not in source_ids,"Aug27 source IDs missing/duplicated")
    for s in sources:
        require(s.get("source_id")==canonical_id(s.get("url","")),f"noncanonical Aug27 source ID: {s.get('source_id')}")
    for e in events:
        refs={r if isinstance(r,str) else r.get("source_id") for r in e.get("source_refs",[])}
        require(refs and refs<=source_ids,f"{e.get('event_id')}: unresolved source ref")
    prior_ids=set()
    for folder in ("current-update-20260824","current-update-20260825","current-update-20260825-late","current-update-20260826"):
        prior_ids.update(x.get("event_id") for x in load(ROOT/"data"/folder/"events.json").get("events",[]))
    prior_ids.update(x.get("event_id") for x in load(ROOT/"data"/"wiki-map-reconciliation-20260826"/"events.json").get("events",[]))
    require(not (set(ids)&prior_ids),"Aug27 overlay duplicates a prior chronology event ID")
    require(len(messaging.get("series",[]))==3,"Iran Messaging shift series must contain exactly three current tracked lanes")
    allowed_flags={"ir","us","pk","om","qa","sa"}
    for row in messaging.get("series",[]):
        require(row.get("said",{}).get("flag")=="ir",f"{row.get('id')}: initial Iranian line must carry Iran flag")
        require(row.get("shifted_to",{}).get("flag")=="ir",f"{row.get('id')}: shifted Iranian line must carry Iran flag")
        acts=row.get("closing_acts") or []
        require(acts,f"{row.get('id')}: no closing/changing acts")
        for act in acts:
            flag=act.get("flag")
            require(flag in allowed_flags,f"{row.get('id')}: unsupported flag {flag}")
            require((ROOT/"assets"/"flags"/f"{flag}.svg").exists(),f"{row.get('id')}: missing flag asset {flag}.svg")
            if act.get("secondary_flag"):
                sf=act["secondary_flag"];require((ROOT/"assets"/"flags"/f"{sf}.svg").exists(),f"{row.get('id')}: missing secondary flag {sf}.svg")
        assessment=row.get("assessment") or {}
        require(assessment.get("classification") and assessment.get("confidence") and assessment.get("text"),f"{row.get('id')}: incomplete assessment")
        require(len(assessment.get("alternatives") or [])>=2,f"{row.get('id')}: alternatives must remain visible")
    serialized=json.dumps(messaging,ensure_ascii=False).lower()
    for token in ("walk-back","lane shift","compensating hardening","motive","not proven","propaganda blacklist"):
        require(token in serialized,f"Iran Messaging series missing guardrail/concept: {token}")
    loader=text("js/current-update-20260827.js")
    require("EXPECTED_PRIOR=202" in loader and "EXPECTED_CURRENT=205" in loader,"Aug27 runtime count contract missing")
    require("window.ATLAS_WIKI_RECON_20260826" in loader,"Aug27 must wait for historical reconciliation")
    require("atlascurrentready20260827" in loader,"Aug27 ready event missing")
    require("2026-08-27T08:25:00-04:00" in loader,"Aug27 cutoff missing")
    require("loadMessagingShiftSeries" in loader,"Aug27 loader must install messaging series")
    renderer=text("js/iran-messaging-shifts-20260827-r1.js")
    for token in ("IRAN SAID","WHAT CLOSED OR CHANGED THE LANE","OBSERVED REALITY","IRAN SHIFTED TO","assets/flags/","Other explanations kept open"):
        require(token in renderer,f"messaging renderer missing {token}")
    current26=text("js/current-update-20260826.js")
    require("loadAug27Update" in current26 and "current-update-20260827.js" in current26,"Aug26 chain does not load Aug27 successor")
    print("Aug27 update: PASS — 3 additive events produce 205-record chronology; three messaging shifts retain actor flags, observed outcomes and motive alternatives")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
