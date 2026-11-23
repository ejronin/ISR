#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/"data/claims-forensics/sep23-proposition-referral-adjudication-20260924.json"
d=json.loads(P.read_text(encoding="utf-8"))
assert d["authority"]=="INFORMATION_CLAIMS_AND_FORENSIC_ADJUDICATION"
assert d["counts"]=={"atomic_propositions":19,"chains_created":5,"chains_updated":1,"deferred_chains":1}
chains={c["chain_id"]:c for c in d["chains"]}
assert "CH-HORMUZ-NEGOTIATING-CLAIMS-20260912" in chains
h=chains["CH-HORMUZ-NEGOTIATING-CLAIMS-20260912"]["propositions"]
z=next(x for x in h if x["id"]=="CF-SEP23-014")
r=next(x for x in h if x["id"]=="CF-SEP23-015")
assert "not established as controlling" in z["authority_effect"]
assert "greater formal national-security authority" in r["authority_effect"]
assert next(x for x in h if x["id"]=="CF-SEP23-018")["truth"]=="UNSUBSTANTIATED"

hou=chains["CH-IRAN-HOUTHI-SUPPORT-TAXONOMY-202609"]["propositions"]
by_axis={x["axis"]:x for x in hou}
assert by_axis["OPERATIONAL_ASSISTANCE"]["truth"]=="SUPPORTED"
assert by_axis["OPERATION_SPECIFIC_DIRECTION"]["truth"]=="PARTLY_SUPPORTED"
assert by_axis["ORGANIZATION_WIDE_COMMAND_CONTROL"]["truth"]=="UNSUBSTANTIATED"

ham=chains["CH-IRAN-HAMAS-SUPPORT-SEPARATE-202609"]["propositions"]
assert ham[0]["truth"]=="SUPPORTED"
assert ham[1]["truth"]=="UNSUBSTANTIATED"

neg=chains["CH-IRAN-NEGOTIATION-WILLINGNESS-20260922-23"]["propositions"]
assert neg[0]["truth"]=="SUPPORTED"
assert neg[1]["truth"]=="UNSUBSTANTIATED"

assert d["downstream_wol_referrals"]==[]
assert d["web_of_lies_modified"] is False
serialized=json.dumps(d).casefold()
assert "knowing_falsehood_established" not in serialized
assert "very_likely_knew_false" not in serialized
assert "likely_knew_false" not in serialized
print("Sep23 Claims Forensics referrals: PASS propositions=19 chains=7 wol_referrals=0")
