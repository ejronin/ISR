#!/usr/bin/env python3
"""Build the public source registry from authoritative ISR source namespaces.

Ground News metadata is publisher context only; it never mutates source quality.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, re
from pathlib import Path
from urllib.parse import urlparse

REGIONS = {
    "US":"NORTH_AMERICA","USA":"NORTH_AMERICA","UNITED STATES":"NORTH_AMERICA","CANADA":"NORTH_AMERICA",
    "UK":"EUROPE","UNITED KINGDOM":"EUROPE","FRANCE":"EUROPE","GERMANY":"EUROPE","ITALY":"EUROPE","SWITZERLAND":"EUROPE","TÜRKIYE":"EUROPE","TURKEY":"EUROPE",
    "IRAN":"MIDDLE_EAST_NORTH_AFRICA","IRAQ":"MIDDLE_EAST_NORTH_AFRICA","QATAR":"MIDDLE_EAST_NORTH_AFRICA","OMAN":"MIDDLE_EAST_NORTH_AFRICA","SAUDI ARABIA":"MIDDLE_EAST_NORTH_AFRICA","UNITED ARAB EMIRATES":"MIDDLE_EAST_NORTH_AFRICA","UAE":"MIDDLE_EAST_NORTH_AFRICA","ISRAEL":"MIDDLE_EAST_NORTH_AFRICA","LEBANON":"MIDDLE_EAST_NORTH_AFRICA","JORDAN":"MIDDLE_EAST_NORTH_AFRICA","KUWAIT":"MIDDLE_EAST_NORTH_AFRICA","BAHRAIN":"MIDDLE_EAST_NORTH_AFRICA","YEMEN":"MIDDLE_EAST_NORTH_AFRICA","SYRIA":"MIDDLE_EAST_NORTH_AFRICA",
    "PAKISTAN":"SOUTH_ASIA","INDIA":"SOUTH_ASIA","CHINA":"EAST_ASIA","JAPAN":"EAST_ASIA","SOUTH KOREA":"EAST_ASIA","AUSTRALIA":"OCEANIA"
}
OUTLET_OVERRIDES = {
    "Reuters":("United Kingdom","EUROPE","WIRE_SERVICE",None),
    "Associated Press":("United States","NORTH_AMERICA","WIRE_SERVICE",None),
    "AP":("United States","NORTH_AMERICA","WIRE_SERVICE",None),
    "Agence France-Presse":("France","EUROPE","WIRE_SERVICE",None),
    "AFP":("France","EUROPE","WIRE_SERVICE",None),
    "The Washington Post":("United States","NORTH_AMERICA","NEWSPAPER",None),
    "Washington Post":("United States","NORTH_AMERICA","NEWSPAPER",None),
    "BBC News":("United Kingdom","EUROPE","PUBLIC_BROADCASTER",None),
    "Al Jazeera":("Qatar","MIDDLE_EAST_NORTH_AFRICA","BROADCASTER","Qatari state-funded"),
    "The National":("United Arab Emirates","MIDDLE_EAST_NORTH_AFRICA","NEWSPAPER",None),
    "Iran International":(None,"GLOBAL_INTERNATIONAL","BROADCASTER",None),
    "Press TV":("Iran","MIDDLE_EAST_NORTH_AFRICA","STATE_MEDIA","Iranian state media"),
    "IRNA":("Iran","MIDDLE_EAST_NORTH_AFRICA","STATE_MEDIA","Iranian state news agency"),
    "Tasnim":("Iran","MIDDLE_EAST_NORTH_AFRICA","NEWS_AGENCY","Iranian state-aligned"),
    "Tehran Times":("Iran","MIDDLE_EAST_NORTH_AFRICA","NEWSPAPER","Iranian state-aligned"),
    "Saudi Press Agency":("Saudi Arabia","MIDDLE_EAST_NORTH_AFRICA","STATE_NEWS_AGENCY","Saudi official"),
    "U.S. Central Command":("United States","NORTH_AMERICA","OFFICIAL_MILITARY","U.S. government"),
    "CENTCOM":("United States","NORTH_AMERICA","OFFICIAL_MILITARY","U.S. government"),
    "U.S. Department of Defense":("United States","NORTH_AMERICA","OFFICIAL_GOVERNMENT","U.S. government"),
    "U.S. Department of State":("United States","NORTH_AMERICA","OFFICIAL_GOVERNMENT","U.S. government"),
    "U.S. Department of State (archived)":("United States","NORTH_AMERICA","OFFICIAL_GOVERNMENT","U.S. government"),
    "IMO":(None,"GLOBAL_INTERNATIONAL","INTERNATIONAL_ORGANIZATION",None),
    "International Maritime Organization":(None,"GLOBAL_INTERNATIONAL","INTERNATIONAL_ORGANIZATION",None),
    "IEA":(None,"GLOBAL_INTERNATIONAL","INTERNATIONAL_ORGANIZATION",None),
    "International Energy Agency":(None,"GLOBAL_INTERNATIONAL","INTERNATIONAL_ORGANIZATION",None),
    "CSIS":("United States","NORTH_AMERICA","THINK_TANK",None),
    "NASA":("United States","NORTH_AMERICA","TECHNICAL_GOVERNMENT",None),
    "USGS":("United States","NORTH_AMERICA","TECHNICAL_GOVERNMENT",None),
    "World Bank":(None,"GLOBAL_INTERNATIONAL","INTERNATIONAL_ORGANIZATION",None),
    "Bulgarian News Agency":("Bulgaria","EUROPE","NEWS_AGENCY",None),
    "Arab News":("Saudi Arabia","MIDDLE_EAST_NORTH_AFRICA","NEWSPAPER",None)
}
ALIASES = {"AP":"Associated Press","Washington Post":"The Washington Post"}
OFFICIAL_RE = re.compile(r"\b(ministry|department|command|military|navy|air force|army|government|presidency|parliament|treasury|white house|centcom|nato|united nations|imo|iaea|iea)\b", re.I)
STATE_MEDIA_RE = re.compile(r"\b(press tv|irna|tasnim|tehran times|spa|saudi press agency)\b", re.I)

def canonical_outlet(name: str, url: str = '') -> str:
    name = re.sub(r"\s+", " ", (name or "Unknown outlet").strip())
    host = urlparse(url or '').netloc.lower()
    direct = {
        'www.reuters.com':'Reuters','reuters.com':'Reuters',
        'apnews.com':'Associated Press','www.apnews.com':'Associated Press',
        'www.washingtonpost.com':'The Washington Post','washingtonpost.com':'The Washington Post',
        'www.aljazeera.com':'Al Jazeera','aljazeera.com':'Al Jazeera',
        'www.bbc.com':'BBC News','bbc.com':'BBC News','www.bbc.co.uk':'BBC News','bbc.co.uk':'BBC News',
        'www.thenationalnews.com':'The National','thenationalnews.com':'The National'
    }
    return direct.get(host, ALIASES.get(name, name))

def profile_id(name: str) -> str:
    return "OUTLET-" + hashlib.sha256(name.lower().encode()).hexdigest()[:12].upper()

def classify(name: str, url: str):
    key = canonical_outlet(name, url)
    if key in OUTLET_OVERRIDES: return OUTLET_OVERRIDES[key]
    host = urlparse(url or "").netloc.lower()
    if host.endswith(".gov") or ".gov." in host or OFFICIAL_RE.search(key):
        return (None,"GLOBAL_INTERNATIONAL","OFFICIAL_OR_TECHNICAL",None)
    if STATE_MEDIA_RE.search(key): return (None,"GLOBAL_INTERNATIONAL","STATE_MEDIA","State/state-aligned actor source")
    country = None; region = "GLOBAL_INTERNATIONAL"
    cc = {".qa":"Qatar",".ae":"United Arab Emirates",".sa":"Saudi Arabia",".ir":"Iran",".pk":"Pakistan",".tr":"Türkiye",".uk":"United Kingdom",".au":"Australia",".cn":"China",".jp":"Japan",".bg":"Bulgaria"}
    for suffix,c in cc.items():
        if host.endswith(suffix): country=c; region=REGIONS.get(c.upper(),region); break
    kind = "NEWS_OUTLET" if any(x in host for x in ["news","reuters","apnews","bbc","aljazeera","washingtonpost"]) else "PUBLISHER_OR_TECHNICAL_SOURCE"
    return country,region,kind,None

def ground_for(name: str, metadata: dict, checked: str):
    raw = metadata.get("profiles",{}).get(name) or metadata.get("profiles",{}).get(canonical_outlet(name))
    if raw and raw.get("alias_of"):
        raw = metadata.get("profiles",{}).get(raw["alias_of"])
    if raw:
        return {k:raw.get(k) for k in ["status","bias_raw","bias_bucket_3","factuality","profile_url"]} | {"checked_at":checked,"methodology_note":"Ground News publication-level rating; not an article rating or proof of neutrality."}
    # Official, technical and actor institutions are not forced into a political-rating field.
    _,_,kind,_ = classify(name,"")
    status = "NOT_APPLICABLE" if kind.startswith("OFFICIAL") or kind in {"INTERNATIONAL_ORGANIZATION","THINK_TANK","TECHNICAL_GOVERNMENT"} else "NOT_RATED"
    return {"status":status,"bias_raw":None,"bias_bucket_3":None,"factuality":None,"profile_url":None,"checked_at":checked,"methodology_note":"Ground News publication-level rating; not an article rating or proof of neutrality."}

def load_sources(root: Path):
    namespaces = [root/"data/integration-v1.2/sources.json", root/"data/forensic-v1.3.2/sources.json", root/"data/current-update-20260824/sources.json"]
    merged = {}
    for path in namespaces:
        if not path.exists(): continue
        payload=json.loads(path.read_text(encoding="utf-8"))
        for src in payload.get("sources",[]):
            sid=src.get("source_id")
            if not sid: continue
            if sid in merged:
                # Same canonical source may appear in both namespaces. Preserve richer fields without changing quality.
                old=merged[sid]
                for k,v in src.items():
                    if old.get(k) in (None,"",[]) and v not in (None,"",[]): old[k]=v
            else: merged[sid]=dict(src)
    return list(merged.values())

def build(root: Path):
    meta_path=root/"data/ground-news-outlet-metadata.json"
    meta=json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {"checked_at":"UNSET","profiles":{}}
    checked=meta.get("checked_at","UNSET")
    sources=load_sources(root)
    profiles={}
    output=[]
    for src in sources:
        outlet=canonical_outlet(src.get("outlet") or "Unknown outlet", src.get("url") or '')
        pid=profile_id(outlet)
        if pid not in profiles:
            country,region,kind,state=classify(outlet,src.get("url") or "")
            gn=ground_for(outlet,meta,checked)
            # A real Ground News profile may supply a more specific location classification.
            gnraw=meta.get("profiles",{}).get(outlet)
            if gnraw:
                country=gnraw.get("country",country); region=gnraw.get("region",region)
            profiles[pid]={"outlet_profile_id":pid,"display_name":outlet,"aliases":sorted({src.get("outlet") or outlet} - {outlet}),"country":country,"region":region,"outlet_type":kind,"state_affiliation":state,"ownership_note":None,"ground_news":gn}
        else:
            alias=src.get("outlet")
            if alias and alias != outlet and alias not in profiles[pid]["aliases"]: profiles[pid]["aliases"].append(alias)
        output.append({
            "source_id":src["source_id"],"outlet_profile_id":pid,"title":src.get("title"),"url":src.get("url") or "",
            "publication_date":src.get("publication_date"),"source_roles":src.get("source_roles") or [],"quality":src.get("quality"),
            "lineage":src.get("lineage"),"records_supported":src.get("records_supported") or []
        })
    registry={"schema_version":"1.0","generated_at":checked,"methodology":{"ground_news":"Publisher context only; ratings do not alter evidence grade.","authoritative_namespaces":["data/integration-v1.2/sources.json","data/forensic-v1.3.2/sources.json","data/current-update-20260824/sources.json"]},"outlet_profiles":sorted(profiles.values(),key=lambda x:(x["region"],x.get("country") or "",x["display_name"])),"sources":sorted(output,key=lambda x:x["source_id"])}
    return registry

def write(root: Path, registry: dict):
    (root/"data/source-registry.json").write_text(json.dumps(registry,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    (root/"data/outlet-profiles.json").write_text(json.dumps({"schema_version":"1.0","generated_at":registry["generated_at"],"outlet_profiles":registry["outlet_profiles"]},indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    fields=["source_id","outlet_profile_id","outlet","country","region","outlet_type","ground_news_status","bias_raw","bias_bucket_3","factuality","quality","publication_date","source_roles","title","url"]
    profiles={p["outlet_profile_id"]:p for p in registry["outlet_profiles"]}
    with (root/"data/source-registry.csv").open("w",newline="",encoding="utf-8") as fh:
        w=csv.DictWriter(fh,fieldnames=fields); w.writeheader()
        for s in registry["sources"]:
            p=profiles[s["outlet_profile_id"]]; g=p["ground_news"]
            w.writerow({"source_id":s["source_id"],"outlet_profile_id":p["outlet_profile_id"],"outlet":p["display_name"],"country":p.get("country") or "","region":p["region"],"outlet_type":p["outlet_type"],"ground_news_status":g["status"],"bias_raw":g.get("bias_raw") or "","bias_bucket_3":g.get("bias_bucket_3") or "","factuality":g.get("factuality") or "","quality":s.get("quality") or "","publication_date":s.get("publication_date") or "","source_roles":"|".join(s.get("source_roles") or []),"title":s.get("title") or "","url":s["url"]})

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--root",default="."); ns=ap.parse_args(); root=Path(ns.root).resolve()
    reg=build(root); write(root,reg)
    rated=sum(p["ground_news"]["status"]=="RATED" for p in reg["outlet_profiles"])
    print(f"source-registry: {len(reg['sources'])} sources, {len(reg['outlet_profiles'])} outlets, {rated} Ground News rated")
if __name__=="__main__": main()
