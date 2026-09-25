#!/usr/bin/env python3
"""Regression guard for the receipt-backed media Bullshitter amplifier census."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOSSIER = json.loads(
    (ROOT / "data/web-of-lies/source-dossiers.json").read_text(encoding="utf-8")
)

press_rows = [
    row
    for row in (DOSSIER.get("amplification_observations") or [])
    if row.get("bullshitter_source_id") == "WOL-SRC-PRESS-TV"
]
assert len(press_rows) >= 36

# This tranche is a recoverable minimum, not an assertion that every platform's
# entire repost graph can be enumerated from the public web.
by_platform: dict[str, set[str]] = {}
for row in press_rows:
    platform = str(row.get("amplifier_platform") or "")
    by_platform.setdefault(platform, set()).add(str(row["amplifier_id"]))
    assert row.get("message_identity"), row["observation_id"]
    assert row.get("public_receipts"), row["observation_id"]
    assert all(
        receipt.get("url") or receipt.get("archive_url")
        for receipt in row["public_receipts"]
    ), row["observation_id"]

assert {
    "PRESS-TV-X",
    "X-NOTHIN-SOL",
    "X-GEOGR-STRATEGY",
    "X-NOBLE236",
    "X-M3IRANX",
    "X-MOAYYEDJAFRI",
    "X-OMARMOR50175584",
    "X-QUEENDANDYPANTS",
} <= by_platform["X"]

assert {
    "PRESS-TV-TELEGRAM",
    "TG-LAURARUHK",
    "TG-ROCKNROLLGEOPOLITICS",
    "TG-ALMASIRAH-EN",
} <= by_platform["TELEGRAM"]

assert {"YT-14MASSOOM"} <= by_platform["YOUTUBE"]
assert {
    "WEB-ALMASIRAH-EN",
    "WEB-STRUGGLE-LA-LUCHA",
    "WEB-TRUTHSEEKER",
    "WEB-PEOPLES-VOICE",
    "WEB-ALMANAR-TV",
    "WEB-HAJIJ",
    "WEB-COSMOS-CHRONICLE",
    "WEB-LANTIDIPLOMATICO",
    "WEB-GLOBALSECURITY-ORG",
} <= by_platform["WEBSITE"]
assert {
    "BLOG-MOST-REVOLUTIONARY-ACT",
    "BLOG-PANAFRICAN-NEWS-WIRE",
    "BLOG-STEEL-CITY-SCRIBBLINGS",
} <= by_platform["BLOG"]
assert {"SUBSTACK-ROBIN-WESTENRA"} <= by_platform["SUBSTACK"]
assert {"FORUM-TRADE2WIN-ILILILILI"} <= by_platform["FORUM"]

# Publisher-owned dissemination is intentionally retained as amplification.
self_rows = [
    row
    for row in press_rows
    if row.get("amplifier_source_id") == "WOL-SRC-PRESS-TV"
]
assert len(self_rows) >= 9
assert {row["amplifier_platform"] for row in self_rows} >= {"X", "TELEGRAM"}

# External census observations do not inherit a Bullshitter award merely by
# appearing downstream; profile promotion/award derivation remains separate.
external_rows = [
    row
    for row in press_rows
    if row.get("amplifier_source_id") != "WOL-SRC-PRESS-TV"
]
assert len(external_rows) >= 27

print(
    "web-of-lies media amplifier census: PASS "
    f"press_tv_observations={len(press_rows)} "
    f"x_unique={len(by_platform.get('X', set()))} "
    f"telegram_unique={len(by_platform.get('TELEGRAM', set()))} "
    f"website_unique={len(by_platform.get('WEBSITE', set()))} "
    f"forum_unique={len(by_platform.get('FORUM', set()))} "
    "minimum_census=1 self_amplification=retained"
)
