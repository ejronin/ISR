#!/usr/bin/env python3
"""Adversarial Gate 3 semantic validator, including final hardening acceptance tests.

This validator protects the legacy-to-current migration boundary. Lie Ledger v2
truth/knowledge doctrine is enforced separately by validate_lie_ledger_v2.py;
this file must not manufacture or enforce substantive ROOK knowledge judgments.
"""
from __future__ import annotations

import copy
import json
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_canonical_current_state_v2 as gate3_base
import build_canonical_current_state_v2_hardened as gate3

PROTECTED_INHERITED_GAP_IDS = tuple(f"GAP-{i:03d}" for i in range(1, 20))
PROTECTED_GAP_BASELINE_LINEAGE_SHA256 = "d6250ba785c7480f59058b3e6292fad608c9390d47c3ab7cab60fd57c239d4eb"
GAP_ID_RE = re.compile(r"^GAP-[A-Z0-9][A-Z0-9-]*$")


def fail(message: str) -> None:
    raise AssertionError(message)


def _protected_gap_baseline(root: Path) -> dict[str, dict]:
    """Rebuild the accepted R1-era state of inherited GAP-001..GAP-019.

    The raw migration records are sealed, but GAP-009 and GAP-011 were later
    revised by an accepted Evidence packet before R1. Replaying only the exact
    accepted lineage through the R1 tip preserves those authorized revisions
    while preventing any later generic entity update from silently redefining a
    protected inherited gap. Advancing this baseline requires an explicit
    Release change tied to an authorized Evidence revision; appending new gap
    identities never requires changing the baseline.
    """
    spec = json.loads((root / "data/gate3/gate3-spec.json").read_text(encoding="utf-8"))
    scratch = {"entities": {}}
    gate3_base.seed(root, scratch, spec)
    baseline = {item["entity_id"]: item for item in scratch["entities"].get("gaps", [])}

    manifest = json.loads((root / "data/canonical-ledger/manifest-v2.json").read_text(encoding="utf-8"))
    reached_baseline_tip = False
    for entry in manifest.get("accepted_updates") or []:
        packet = json.loads((root / entry["path"]).read_text(encoding="utf-8"))
        for entity in packet.get("entities") or []:
            gap_id = str(entity.get("entity_id") or "")
            if entity.get("entity_type") != "gap" or gap_id not in baseline:
                continue
            if entity.get("mode") != "update":
                fail(f"protected inherited gap has non-update historical operation: {gap_id}")
            baseline[gap_id]["record"].update(copy.deepcopy(entity.get("record") or {}))
            baseline[gap_id]["provenance"].append({
                "kind": "GATE3_ENTITY_UPDATE",
                "packet_id": packet["packet_id"],
            })
            baseline[gap_id]["revisions"].append({
                "packet_id": packet["packet_id"],
                "known_at": packet["known_at"],
                "kind": "GATE3_ENTITY_UPDATE",
            })
        if entry.get("lineage_sha256") == PROTECTED_GAP_BASELINE_LINEAGE_SHA256:
            reached_baseline_tip = True
            break

    if not reached_baseline_tip:
        fail("protected inherited gap baseline lineage is not an exact accepted prefix")
    return baseline


def _meaningful_collection_action(action) -> bool:
    if isinstance(action, str):
        return bool(action.strip())
    if not isinstance(action, dict):
        return False
    for key in ("task", "question", "action", "purpose"):
        if str(action.get(key) or "").strip():
            return True
    for key in ("collection_scope", "scope", "targets"):
        value = action.get(key)
        if isinstance(value, list) and any(str(item or "").strip() for item in value):
            return True
    return False


def validate_gap_contract(state: dict, root: Path = ROOT) -> None:
    gaps = state.get("entities", {}).get("gaps", [])
    ids = [str(item.get("entity_id") or "") for item in gaps]
    if len(ids) != len(set(ids)):
        fail("duplicate gap identity")

    protected = set(PROTECTED_INHERITED_GAP_IDS)
    missing_protected = protected - set(ids)
    if missing_protected:
        fail(f"protected inherited gap deleted: {sorted(missing_protected)}")

    baseline = _protected_gap_baseline(Path(root))
    by_id = {item["entity_id"]: item for item in gaps}
    for gap_id in PROTECTED_INHERITED_GAP_IDS:
        current = by_id[gap_id]
        expected = baseline[gap_id]
        for field in ("record", "source_ids", "provenance", "revisions"):
            if current.get(field) != expected.get(field):
                fail(f"protected inherited gap mutated without authorized revision: {gap_id}:{field}")

    source_ids = {item["source_id"] for item in state.get("sources", {}).get("records", [])}
    for item in gaps:
        gap_id = str(item.get("entity_id") or "")
        record = item.get("record")
        if not GAP_ID_RE.fullmatch(gap_id):
            fail(f"invalid stable gap identity: {gap_id or '<missing>'}")
        if not isinstance(record, dict):
            fail(f"gap lacks valid record: {gap_id}")
        if record.get("gap_id") != gap_id:
            fail(f"gap record identity mismatch: {gap_id}")
        if not str(record.get("topic") or "").strip():
            fail(f"gap lacks topic: {gap_id}")
        if not str(record.get("status") or "").strip():
            fail(f"gap lacks status: {gap_id}")
        actions = record.get("collection_actions")
        if not isinstance(actions, list) or not actions or not all(_meaningful_collection_action(action) for action in actions):
            fail(f"gap lacks meaningful collection actions: {gap_id}")
        if not item.get("provenance"):
            fail(f"gap lacks provenance: {gap_id}")

        if gap_id not in protected:
            linked_sources = list(dict.fromkeys(record.get("source_ids") or item.get("source_ids") or []))
            if not linked_sources:
                fail(f"appended gap lacks source linkage: {gap_id}")
            unresolved = set(linked_sources) - source_ids
            if unresolved:
                fail(f"appended gap has unresolved source linkage: {gap_id} -> {sorted(unresolved)}")


def main() -> int:
    state = gate3.build_state(ROOT)
    dispositions = [item["record"] for item in state["entities"].get("legacy_dispositions", [])]
    expected = {f"E{i:03d}" for i in range(1, 64)}
    actual = [row["legacy_event_id"] for row in dispositions]
    if set(actual) != expected or len(actual) != 63:
        fail("missing, duplicate or extra legacy disposition")

    event_ids = {item["event_id"] for item in state["chronology"]}
    source_ids = {item["source_id"] for item in state["sources"]["records"]}
    if state["counts"].get("source_records") != len(source_ids):
        fail("Gate 3 source-count metadata is stale")
    if state["counts"].get("gate3_source_records") != len(source_ids):
        fail("Gate 3 source count does not match current source catalog")

    # Legacy claims remain provenance inputs only. Substantive factual/knowledge
    # adjudication belongs to the successor v2 projection and ROOK authority.
    for collection in ("claims", "narrative_claims"):
        for item in state["entities"].get(collection, []):
            sources = item.get("source_ids") or (item.get("record") or {}).get("source_ids") or []
            if not sources:
                fail(f"claim record lacks provenance: {collection}:{item.get('entity_id') or item.get('case_id')}")
            if set(sources) - source_ids:
                fail(f"claim record has unresolved source: {collection}:{item.get('entity_id')}")

    for item in state["chronology"]:
        event = item["event"]
        event_id = item["event_id"]
        if not event.get("source_ids"):
            fail(f"chronology event lacks source provenance: {event_id}")
        if set(event.get("source_ids") or []) - source_ids:
            fail(f"chronology event has unresolved source provenance: {event_id}")
        if event.get("event_class") in {"PERIOD_ASSESSMENT", "STATE_SNAPSHOT", "RELATED_THEATER_CONTEXT", "DIPLOMATIC_OR_POLICY_EVENT"} and event.get("strike_countable"):
            fail(f"non-strike class counted as strike: {event_id}")
        if "RETROSPECTIVE" in str(event.get("knowledge_class") or ""):
            public = event.get("public_available_time")
            if public and datetime.fromisoformat(public).date() < date.fromisoformat(event["event_date"]):
                fail(f"retrospective discovery backdated: {event_id}")

    for item in state["entities"].get("casualties", []):
        record = item["record"]
        disposition = item.get("semantic_disposition")
        if not disposition:
            fail(f"casualty lacks semantic disposition: {item['entity_id']}")
        if (record.get("cumulative_snapshot") or str(record.get("aggregation_type") or "").upper() == "CUMULATIVE_SNAPSHOT") and disposition.get("additive") is not False:
            fail(f"cumulative casualty snapshot became additive: {item['entity_id']}")
        if disposition.get("disposition") == "EVENT_LINK" and disposition.get("canonical_event_ref") not in event_ids:
            fail(f"casualty event link does not resolve: {item['entity_id']} -> {disposition.get('canonical_event_ref')}")
        if disposition.get("disposition") not in {"EVENT_LINK", "AGGREGATE_SNAPSHOT", "NON_EVENT_OR_AGGREGATE"}:
            fail(f"casualty has ambiguous semantic disposition: {item['entity_id']} {disposition}")

    for item in state["entities"].get("material_losses", []):
        record = item.get("record") or {}
        record_id = item.get("loss_id") or record.get("loss_id") or item.get("entity_id")
        disposition = item.get("semantic_disposition")
        if not disposition:
            fail(f"material loss lacks semantic disposition: {record_id}")
        if disposition.get("disposition") == "EVENT_LINK" and disposition.get("canonical_event_ref") not in event_ids:
            fail(f"material loss event link does not resolve: {record_id} -> {disposition.get('canonical_event_ref')}")
        if disposition.get("disposition") == "CLAIM_ONLY" and not (item.get("source_ids") or record.get("source_ids")):
            fail(f"claim-only material record lacks provenance: {record_id}")
        if disposition.get("disposition") not in {"EVENT_LINK", "CLAIM_ONLY", "NON_EVENT_UNRESOLVED_DATE"}:
            fail(f"material loss has ambiguous semantic disposition: {record_id} {disposition}")

    validate_gap_contract(state, ROOT)
    gaps = state["entities"].get("gaps", [])

    coverage = state.get("daily_coverage") or []
    current_cutoff_date = datetime.fromisoformat(state["release"].get("current_osint_cutoff") or state["release"]["gate2_evidence_cutoff"]).date()
    if not coverage:
        fail("daily coverage is empty")
    if coverage[0].get("date") != "2026-02-28":
        fail(f"daily coverage does not begin on conflict Day 1: {coverage[0].get('date')}")
    if coverage[-1].get("date") != current_cutoff_date.isoformat():
        fail(f"daily coverage does not reach current evidence cutoff date: {coverage[-1].get('date')}")
    expected_date = date(2026, 2, 28)
    for row in coverage:
        if row.get("date") != expected_date.isoformat():
            fail(f"daily coverage contains date gap or disorder at {expected_date.isoformat()}")
        if row["status"] == "NO_CANONICAL_EVENT_RECORDED" and row["canonical_event_ids"]:
            fail(f"quiet date contains canonical event: {row['date']}")
        expected_date += timedelta(days=1)
    if expected_date != current_cutoff_date + timedelta(days=1):
        fail("daily coverage span is incomplete")

    forensic = json.loads((ROOT / "data/forensic-v1.3.2/iranian-claim-evolution.json").read_text(encoding="utf-8"))
    forensic_claim_ids = {claim["claim_id"] for claim in forensic.get("claims") or []}
    migrated = [item["record"] for item in state["entities"].get("narrative_claims", []) if str(item.get("entity_id") or "").startswith("LL-EVO-")]
    represented = {record.get("original_claim_id") for record in migrated}
    if forensic_claim_ids != represented or len(forensic_claim_ids) != 37:
        fail("all 37 forensic claims are not represented proposition-by-proposition in the legacy migration layer")
    if not migrated:
        fail("forensic proposition-level migration layer is empty")
    if any(not record.get("original_claim_id") for record in migrated):
        fail("forensic migration record lost its original claim identity")

    forensic_chain_ids = {str(claim.get("chain_id")) for claim in forensic.get("claims") or []}
    granular_chains = [item["record"] for item in state["entities"].get("information_chains", []) if (item.get("record") or {}).get("source_chain_id")]
    represented_chains = {record.get("source_chain_id") for record in granular_chains}
    if forensic_chain_ids != represented_chains or len(forensic_chain_ids) != 13:
        fail("all 13 forensic claim chains are not represented as granular information chains")

    reliability = state["entities"].get("source_reliability") or []
    if not reliability:
        fail("source/claimant reliability history is empty")
    for item in reliability:
        record = item.get("record") or {}
        if not record.get("methodology") or record.get("proposition_count", 0) < 1:
            fail(f"reliability record lacks methodology or observations: {item.get('entity_id')}")

    serialized = json.dumps({
        "chronology": state["chronology"],
        "gate3_entities": {key: value for key, value in state["entities"].items() if key.startswith("narrative") or key.startswith("information")},
    }, ensure_ascii=False).casefold()
    if "founding signatories" in serialized:
        fail("do-not-restore violation: stronger founding-signatory wording returned")
    for actor in state["entities"].get("actors", []):
        record = actor.get("record") or {}
        name = str(record.get("canonical_name") or "").casefold()
        if any(token in name for token in ("hezbollah", "houthi")) and record.get("flag"):
            fail(f"do-not-restore violation: non-state actor has host-state flag: {record.get('canonical_name')}")

    if state["release"]["gate2_evidence_cutoff"] != "2026-09-05T00:37:00-04:00":
        fail("Gate 2 evidentiary boundary drifted")
    manifest = json.loads((ROOT / "data/canonical-ledger/manifest-v2.json").read_text(encoding="utf-8"))
    manifest_cutoff = manifest.get("current_evidence_cutoff") or manifest.get("gate2_evidence_cutoff")
    if not manifest_cutoff:
        fail("canonical v2 manifest lacks a current evidence cutoff")
    if state["release"].get("current_osint_cutoff") != manifest_cutoff:
        fail("current evidence cutoff does not match append-only canonical manifest")
    if datetime.fromisoformat(manifest_cutoff) < datetime.fromisoformat(state["release"]["gate2_evidence_cutoff"]):
        fail("current evidence cutoff precedes Gate 2 evidentiary boundary")
    accepted = manifest.get("accepted_updates") or []
    if state["counts"].get("gate3_update_packets") != len(accepted):
        fail("accepted-update count does not match append-only canonical manifest")
    if [item.get("sequence") for item in accepted] != list(range(1, len(accepted) + 1)):
        fail("append-only canonical manifest contains a sequence gap")
    if state["integrity"].get("frozen_v1_inputs_mutated"):
        fail("frozen v1 inputs mutated")
    for key in (
        "gate3_lie_ledger_hardening_complete",
        "source_reliability_populated",
        "source_count_metadata_current",
        "forensic_claim_evolution_proposition_migration_complete",
    ):
        if not state["integrity"].get(key):
            fail(f"hardening integrity flag is not satisfied: {key}")

    print("gate3-semantic-validation: PASS")
    print(f"  chronology={len(state['chronology'])}")
    print(f"  daily_coverage={coverage[0]['date']}..{coverage[-1]['date']} ({len(coverage)} days)")
    print(f"  legacy_dispositions={len(dispositions)}")
    print(f"  gaps={len(gaps)}")
    print(f"  sources={len(source_ids)}")
    print(f"  narrative_claims={len(state['entities'].get('narrative_claims', []))}")
    print(f"  forensic_propositions={len(migrated)}")
    print(f"  forensic_chains={len(granular_chains)}")
    print(f"  reliability_records={len(reliability)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
