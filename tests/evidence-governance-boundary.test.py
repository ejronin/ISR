#!/usr/bin/env python3
"""Protect neutral evidence-adjudication boundaries in active production code.

Historical migration files may retain persona-era names as provenance. Current
canonical/public builders and validators may not reintroduce persona ownership
or replay historical adjudication machinery as production authority.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ACTIVE_TARGETS = (
    "docs/LIE_LEDGER_EVIDENCE_ADJUDICATION_CONTRACT.md",
    "schemas/lie-ledger-evidence-adjudication-v2.json",
    "scripts/build_lie_ledger_evidence_adjudication.py",
    "scripts/build_canonical_current_state_v2_final.py",
    "scripts/build_public_current_state_v2_hardened.py",
    "scripts/validate_lie_ledger_v2.py",
    "scripts/validate_public_current_state_v2.py",
)

FORBIDDEN_ACTIVE_AUTHORITY = (
    'verdict_authority": "ROOK',
    'implementation_authority": "PR/CI',
    'authority_status": "ROOK_ADJUDICATED',
    'authority": "PR/CI',
    'authority": "ROOK',
    "ROOK is the sole authority",
    "ROOK owns substantive adjudication",
)

for relative in ACTIVE_TARGETS:
    text = (ROOT / relative).read_text(encoding="utf-8")
    for token in FORBIDDEN_ACTIVE_AUTHORITY:
        assert token not in text, f"active persona-authority token in {relative}: {token}"

active_builder = (ROOT / "scripts/build_lie_ledger_evidence_adjudication.py").read_text(encoding="utf-8")
for legacy_import in (
    "import build_lie_ledger_v2",
    "import apply_lie_ledger_evidence_completion_20260909",
    "import apply_lie_ledger_current_claims_20260909",
    "import neutralize_lie_ledger_governance",
):
    assert legacy_import not in active_builder, (
        f"active adjudication builder still replays historical machinery: {legacy_import}"
    )
assert "data/lie-ledger-v2-evidence-adjudications.json" in active_builder, (
    "active adjudication builder is not bound to the tracked neutral adjudication set"
)

final_builder = (ROOT / "scripts/build_canonical_current_state_v2_final.py").read_text(encoding="utf-8")
assert "import build_lie_ledger_evidence_adjudication as lie_ledger_pipeline" in final_builder, (
    "production final builder is not bound to the neutral evidence-adjudication entrypoint"
)
for legacy_import in (
    "import build_lie_ledger_v2",
    "import apply_lie_ledger_evidence_completion_20260909",
    "import apply_lie_ledger_current_claims_20260909",
):
    assert legacy_import not in final_builder, (
        f"production final builder bypasses neutral entrypoint: {legacy_import}"
    )

public_builder = (ROOT / "scripts/build_public_current_state_v2_hardened.py").read_text(encoding="utf-8")
assert "ACTIVE_LIE_LEDGER_EVIDENCE_ADJUDICATION_SET" in public_builder, (
    "public release input graph does not bind the neutral adjudication set"
)
for retired_input in (
    "HISTORICAL_LIE_LEDGER_ASSESSMENT_INPUT",
    "HISTORICAL_EVIDENCE_COMPLETION_INPUT",
    "HISTORICAL_CURRENT_CLAIM_ASSESSMENT_INPUT",
    "HISTORICAL_ASSESSMENT_PROJECTION_GENERATOR",
    "HISTORICAL_EVIDENCE_COMPLETION_APPLICATOR",
    "HISTORICAL_CURRENT_CLAIM_APPLICATOR",
):
    assert retired_input not in public_builder, (
        f"historical replay remains in active public input graph: {retired_input}"
    )


# Evidence Integration must be able to enrich the source/provenance graph without
# acquiring Claims Forensics adjudication authority. The F-15E / Isfahan packet
# is the first explicit neutral handoff to the downstream Forensics function.
evidence_record_path = ROOT / "data/evidence-integration/f15e-isfahan-source-provenance-20260920.json"
evidence_record = json.loads(evidence_record_path.read_text(encoding="utf-8"))
assert evidence_record["artifact_role"] == "EVIDENCE_INTEGRATION_SOURCE_PROVENANCE_RECORD"
assert evidence_record["chain_id"] == "CH-F15E-CSAR-URANIUM"
assert evidence_record["target_proposition_ids"] == [
    "CI-IR-CLM-0011-P01",
    "CI-IR-CLM-0011-P02",
]
assert evidence_record["authority_boundary"]["owner"] == "EVIDENCE_INTEGRATION"
assert evidence_record["authority_boundary"]["downstream_analysis_owner"] == "WEB_OF_LIES_INFORMATION_FORENSICS"
assert evidence_record["authority_boundary"]["semantic_mutations"] == "NONE"
assert evidence_record["handoff_status"] == "EVIDENCE_RECORD_COMPLETE"

for key in (
    "source_chronology",
    "physical_evidence_inventory",
    "nuclear_material_statement_inventory",
    "unresolved_provenance_gaps",
):
    assert evidence_record.get(key), f"F-15E evidence handoff lacks {key}"

forbidden_adjudication_keys = {
    "truth_adjudication",
    "truth_state",
    "knowledge_state",
    "knowledge_finding",
    "intent_finding",
    "deception_finding",
    "propaganda_finding",
    "narrative_substitution",
    "operational_plausibility",
    "source_family_culpability",
    "adjudication_recommendation",
    "lie_finding",
}

def assert_no_adjudication_keys(value, path="root"):
    if isinstance(value, dict):
        overlap = forbidden_adjudication_keys.intersection(value)
        assert not overlap, f"Evidence Integration crossed adjudication boundary at {path}: {sorted(overlap)}"
        for key, child in value.items():
            assert_no_adjudication_keys(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            assert_no_adjudication_keys(child, f"{path}[{index}]")

assert_no_adjudication_keys(evidence_record)

manifest = json.loads((ROOT / "data/canonical-ledger/manifest-v2.json").read_text(encoding="utf-8"))
registered_sources = {
    row["source_id"]
    for row in json.loads((ROOT / "data/source-registry.json").read_text(encoding="utf-8")).get("sources", [])
}
packet_by_id = {}
for entry in manifest.get("accepted_updates") or []:
    packet = json.loads((ROOT / entry["path"]).read_text(encoding="utf-8"))
    packet_by_id[packet["packet_id"]] = packet
    registered_sources.update(source["source_id"] for source in packet.get("sources") or [])

packet = packet_by_id["UPD-20260920-F15E-ISFAHAN-EVIDENCE"]
assert packet["status"] == "ACCEPTED"
assert packet["events"] == []
assert packet["entities"] == []
assert packet["narrative_claims"] == []
assert {source["source_id"] for source in packet["sources"]} == {
    "SRC-08A3A77BCD81",
    "SRC-D493B3396238",
    "SRC-DBB8501159D4",
}
assert set(evidence_record["canonical_source_additions"]) == {
    "SRC-08A3A77BCD81",
    "SRC-D493B3396238",
    "SRC-DBB8501159D4",
}

referenced_sources = set(evidence_record["canonical_source_additions"])
referenced_sources.update(evidence_record["existing_canonical_sources_reused"])
for row in evidence_record["source_chronology"]:
    referenced_sources.add(row["source_id"])
for collection in ("physical_evidence_inventory", "nuclear_material_statement_inventory"):
    for row in evidence_record[collection]:
        referenced_sources.update(row["source_ids"])

unresolved_sources = referenced_sources - registered_sources
assert not unresolved_sources, f"F-15E neutral evidence record has unresolved source IDs: {sorted(unresolved_sources)}"
delegated_forensics_fields = {
    "provenance_relationships",
    "source_family_connections",
    "correction_update_language",
    "external_commentary_feedback_review",
    "source_quality_metadata",
}
assert not delegated_forensics_fields.intersection(evidence_record), (
    "Evidence Integration retained Web of Lies information-forensics fields"
)
assert evidence_record["downstream_handoff"]["recipient"] == "WEB_OF_LIES_INFORMATION_FORENSICS"
assert evidence_record["downstream_handoff"]["contract_path"] == "docs/WEB_OF_LIES_INFORMATION_FORENSICS_CONTRACT.md"
assert evidence_record["downstream_handoff"]["package_character"] == "NEUTRAL_CANONICAL_EVIDENCE_INPUT"

print("evidence governance boundary: PASS - current production is neutral; historical persona-era material remains provenance only")

# Sep. 20 held-source promotions are Evidence Integration provenance only.
# This block proves canonical registration, carrier/claimant fidelity, and that
# the commit which introduces the packet does not modify Claims Forensics or
# Web-of-Lies semantic artifacts.
import hashlib
import subprocess

held_packet_path = ROOT / "data/canonical-updates/UPD-20260920-CLAIMS-SOURCE-PROMOTIONS.json"
held_handoff_path = ROOT / "data/evidence-integration/claims-source-promotions-handoff-20260920.json"
held_packet = json.loads(held_packet_path.read_text(encoding="utf-8"))
held_handoff = json.loads(held_handoff_path.read_text(encoding="utf-8"))

assert held_packet["packet_id"] == "UPD-20260920-CLAIMS-SOURCE-PROMOTIONS"
assert held_packet["status"] == "ACCEPTED"
assert held_packet["events"] == []
assert held_packet["entities"] == []
assert held_packet["narrative_claims"] == []
assert held_handoff["directive"] == "SOURCE_PROMOTION_ONLY — NO CLAIMS FORENSICS SEMANTIC MUTATION"
assert held_handoff["completion"]["promoted_source_count"] == 3
assert held_handoff["completion"]["blocked_target_count"] == 0
assert held_handoff["completion"]["claims_forensics_overlay_modified"] is False
assert held_handoff["completion"]["web_of_lies_semantics_modified"] is False

expected_promotions = {
    "SRC-61A4DB945FF2": (
        "https://apnews.com/article/03488b5cc4c13ecac1a27096b1641972",
        "Gen. Hassan Hassanzadeh",
        "Associated Press",
        "CH-IRAN-MILITARY-TRAINING-20260918",
    ),
    "SRC-C5D731879E3B": (
        "https://www.newindianexpress.com/world/2026/Sep/20/iran-sets-seven-conditions-for-talks-with-us-through-qatar-warns-of-decisive-war-if-trump-rejects-demands",
        "Mohsen Rezaei",
        "The New Indian Express",
        "CH-IRAN-ANTISHIP-MULTIWARHEAD-TEST-20260919",
    ),
    "SRC-229640C43A50": (
        "https://www.aa.com.tr/en/americas/us-military-says-over-1b-barrels-of-oil-shipped-through-strait-of-hormuz-under-us-blockade/4062037",
        "Adm. Brad Cooper",
        "Anadolu Agency",
        "CH-CENTCOM-ZERO-IRAN-OIL-EXPORTS-20260919",
    ),
}
packet_sources = {row["source_id"]: row for row in held_packet["sources"]}
handoff_targets = {row["canonical_source_id"]: row for row in held_handoff["targets"]}
assert set(packet_sources) == set(expected_promotions)
assert set(handoff_targets) == set(expected_promotions)

for source_id, (url, claimant, carrier, chain_id) in expected_promotions.items():
    assert source_id == "SRC-" + hashlib.sha1(url.rstrip("/").encode("utf-8")).hexdigest()[:12].upper()
    source = packet_sources[source_id]
    target = handoff_targets[source_id]
    assert source["url"] == url
    assert source["originating_claimant"] == claimant
    assert source["outlet"] == carrier
    assert source["relevant_chain_ids"] == [chain_id]
    assert target["source_url"] == url
    assert target["claimant"] == claimant
    assert target["carrier"] == carrier
    assert target["chain_id"] == chain_id
    assert target["source_blocker_status"] == "CLEARED_CANONICAL_SOURCE_PROMOTED"

assert packet_sources["SRC-61A4DB945FF2"]["claim_components"] == [
    {
        "component": "CURRENT_REGISTRATION_COUNT",
        "wording": "over 600,000 people had registered to participate",
    },
    {
        "component": "PROSPECTIVE_PROJECTION",
        "wording": "over 1 million expected to take part in the training",
    },
]
assert packet_sources["SRC-229640C43A50"]["quantitative_value"] == 0
assert packet_sources["SRC-229640C43A50"]["quantitative_unit"] == "barrels"
assert "does not state an exact start or end date" in packet_sources["SRC-229640C43A50"]["time_scope"]
assert "does not explicitly narrow the denominator" in packet_sources["SRC-229640C43A50"]["denominator_scope"]

promotion_forbidden_keys = {
    "truth_adjudication",
    "truth_state",
    "knowledge_state",
    "knowledge_finding",
    "knowledge_judgment",
    "adjudication",
    "disposition",
    "lie_finding",
    "deception_finding",
    "deception_score",
    "source_family_culpability",
}

def assert_promotion_only(value, path="root"):
    if isinstance(value, dict):
        overlap = promotion_forbidden_keys.intersection(value)
        assert not overlap, f"source-promotion artifact crossed Claims/Web-of-Lies boundary at {path}: {sorted(overlap)}"
        for key, child in value.items():
            assert_promotion_only(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            assert_promotion_only(child, f"{path}[{index}]")

assert_promotion_only(held_packet)
assert_promotion_only(held_handoff)

manifest_v2 = json.loads((ROOT / "data/canonical-ledger/manifest-v2.json").read_text(encoding="utf-8"))
accepted_updates = manifest_v2["accepted_updates"]
promotion_index = next(
    index
    for index, item in enumerate(accepted_updates)
    if item["packet_id"] == held_packet["packet_id"]
)
promotion_entry = accepted_updates[promotion_index]
assert promotion_entry["sequence"] == 19
assert promotion_entry["packet_id"] == held_packet["packet_id"]
assert promotion_entry["path"] == held_packet_path.relative_to(ROOT).as_posix()
assert promotion_index > 0
assert promotion_entry["previous_lineage_sha256"] == accepted_updates[promotion_index - 1]["lineage_sha256"]
packet_bytes = held_packet_path.read_bytes().replace(b"\r\n", b"\n")
assert promotion_entry["sha256"] == hashlib.sha256(packet_bytes).hexdigest()
lineage_material = {
    "sequence": promotion_entry["sequence"],
    "packet_id": promotion_entry["packet_id"],
    "path": promotion_entry["path"],
    "sha256": promotion_entry["sha256"],
    "known_at": promotion_entry["known_at"],
    "evidence_cutoff": promotion_entry["evidence_cutoff"],
    "acceptance_basis": promotion_entry["acceptance_basis"],
    "previous_lineage_sha256": promotion_entry["previous_lineage_sha256"],
}
lineage_bytes = (json.dumps(lineage_material, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
assert promotion_entry["lineage_sha256"] == hashlib.sha256(lineage_bytes).hexdigest()

# Byte-scope guard for the introducing commit. Existing release qualification
# separately regenerates and proves Claims Forensics and Web-of-Lies semantic
# parity after canonical compilation.
try:
    changed = subprocess.run(
        ["git", "diff", "--name-only", "HEAD^", "HEAD"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
except (subprocess.CalledProcessError, FileNotFoundError):
    changed = []
if "data/canonical-updates/UPD-20260920-CLAIMS-SOURCE-PROMOTIONS.json" in changed:
    assert not any(path.startswith("data/claims-forensics/") for path in changed), (
        "source-promotion commit modified Claims Forensics artifacts"
    )
    assert not any(path.startswith("data/web-of-lies/") for path in changed), (
        "source-promotion commit modified Web-of-Lies derived semantics"
    )

