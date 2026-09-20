#!/usr/bin/env python3
"""Protect neutral evidence-adjudication boundaries in active production code.

Historical migration files may retain persona-era names as provenance. Current
canonical/public builders and validators may not reintroduce persona ownership
or replay historical adjudication machinery as production authority.
"""
from __future__ import annotations

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
