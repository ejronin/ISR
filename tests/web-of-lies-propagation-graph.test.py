#!/usr/bin/env python3
"""Regression coverage for the Bullshitter -> megaphone propagation graph."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_web_of_lies as wol  # noqa: E402


profiles = [
    {
        "source_id": "BS-IR",
        "display_name": "Iran source",
        "country_region": "Iran",
        "primary_platform": "X",
        "authenticity_class": "HUMAN_ACCOUNT",
        "source_awards": [{
            "award_code": "BULLSHITTER",
            "qualifying_incident_count": 6,
            "qualifying_incident_ids": ["I-IR-1", "I-IR-2"],
        }],
    },
    {
        "source_id": "BS-US",
        "display_name": "US source",
        "country_region": "United States",
        "primary_platform": "YouTube",
        "authenticity_class": "HUMAN_ACCOUNT",
        "source_awards": [{
            "award_code": "BULLSHITTER",
            "qualifying_incident_count": 7,
            "qualifying_incident_ids": ["I-US-1"],
        }],
    },
    {
        "source_id": "CLEAN",
        "display_name": "No award source",
        "country_region": "India",
        "primary_platform": "X",
        "authenticity_class": "HUMAN_ACCOUNT",
        "source_awards": [],
    },
]

incidents = [
    {"incident_id": "I-IR-1", "source_id": "BS-IR"},
    {"incident_id": "I-IR-2", "source_id": "BS-IR"},
    {"incident_id": "I-US-1", "source_id": "BS-US"},
    {"incident_id": "I-CLEAN-1", "source_id": "CLEAN"},
]

observations = [
    {
        "observation_id": "A-1",
        "bullshitter_source_id": "BS-IR",
        "bullshitter_event_id": "I-IR-1",
        "amplifier_id": "AMP-RU-BOT",
        "amplifier_display_name": "Example RU Bot",
        "amplifier_handle": "@ru_example",
        "amplifier_platform": "X",
        "amplifier_country_code": "RU",
        "amplifier_authenticity_class": "CONFIRMED_BOT",
        "public_receipts": [{"receipt_id": "R-1", "surface": "X", "url": "https://example.test/r1", "provenance_status": "ORIGINAL_URL"}],
    },
    {
        "observation_id": "A-2",
        "bullshitter_source_id": "BS-US",
        "bullshitter_event_id": "I-US-1",
        "amplifier_id": "AMP-RU-BOT",
        "amplifier_display_name": "Example RU Bot",
        "amplifier_handle": "@ru_example",
        "amplifier_platform": "X",
        "amplifier_country_code": "RU",
        "amplifier_authenticity_class": "CONFIRMED_BOT",
        "public_receipts": [{"receipt_id": "R-2", "surface": "X", "url": "https://example.test/r2", "provenance_status": "ORIGINAL_URL"}],
    },
    {
        "observation_id": "A-3",
        "bullshitter_source_id": "BS-IR",
        "bullshitter_event_id": "I-IR-2",
        "amplifier_id": "AMP-RU-BOT",
        "amplifier_display_name": "Example RU Bot",
        "amplifier_handle": "@ru_example",
        "amplifier_platform": "X",
        "amplifier_country_code": "RU",
        "amplifier_authenticity_class": "CONFIRMED_BOT",
        "public_receipts": [{"receipt_id": "R-3", "surface": "X", "url": "https://example.test/r3", "provenance_status": "ORIGINAL_URL"}],
    },
    {
        "observation_id": "A-4",
        "bullshitter_source_id": "CLEAN",
        "bullshitter_event_id": "I-CLEAN-1",
        "amplifier_id": "AMP-IGNORED",
        "amplifier_display_name": "Ignored",
        "amplifier_country_code": "IN",
        "amplifier_authenticity_class": "HUMAN_ACCOUNT",
        "public_receipts": [{"receipt_id": "R-4", "surface": "X", "url": "https://example.test/r4", "provenance_status": "ORIGINAL_URL"}],
    },
]

relationships = []
graph = wol.derive_award_propagation_graph(profiles, incidents, relationships, observations)
nodes = {row["node_id"]: row for row in graph["nodes"]}
edges = {(row["from_node_id"], row["to_node_id"]): row for row in graph["edges"]}

assert graph["graph_type"] == "BULLSHITTER_MEGAPHONE_NETWORK"
assert graph["summary"] == {
    "bullshitter_nodes": 2,
    "megaphone_nodes": 1,
    "amplification_edges": 2,
    "cross_bullshitter_megaphones": 1,
    "confirmed_bot_megaphones": 1,
}

assert nodes["BS-IR"]["node_type"] == "BULLSHITTER"
assert nodes["BS-IR"]["country_code"] == "IR"
assert nodes["BS-US"]["country_code"] == "US"

megaphone = nodes["AMP::AMP-RU-BOT"]
assert megaphone["node_type"] == "MEGAPHONE"
assert megaphone["country_code"] == "RU"
assert megaphone["authenticity_class"] == "CONFIRMED_BOT"
assert megaphone["bullshitter_source_count"] == 2
assert megaphone["amplification_observation_count"] == 3
assert megaphone["award_codes"] == []

ir_edge = edges[("BS-IR", "AMP::AMP-RU-BOT")]
assert ir_edge["amplified_claim_count"] == 2
assert set(ir_edge["bullshitter_event_ids"]) == {"I-IR-1", "I-IR-2"}
assert len(ir_edge["public_receipts"]) == 2

us_edge = edges[("BS-US", "AMP::AMP-RU-BOT")]
assert us_edge["amplified_claim_count"] == 1
assert us_edge["bullshitter_event_ids"] == ["I-US-1"]

assert "CLEAN" not in nodes
assert "AMP::AMP-IGNORED" not in nodes
assert all(row["node_type"] != "MEGAPHONE" or not row["award_codes"] for row in graph["nodes"])

print(
    "web-of-lies propagation graph: PASS "
    "bullshitters=2 megaphones=1 cross_source_megaphone=1 confirmed_bot=1"
)
