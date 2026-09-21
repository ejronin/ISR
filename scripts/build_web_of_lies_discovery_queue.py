#!/usr/bin/env python3
"""Build the Web of Lies discovery queue from current canonical claim placement.

Evidence Integration may hand Web of Lies useful chronology before Claims
Forensics has assigned a canonical Lie Ledger family. Genuine unassigned
sequences remain fail-closed. Once Claims Forensics supplies a current family
placement, this compiler consumes that placement read-only and moves the
sequence out of the unresolved queue without changing upstream adjudication.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import jsonschema

ROOT = Path(__file__).resolve().parents[1]
HANDOFF = "data/evidence-integration/rook-catchup-web-of-lies-input-20260920.json"
SCHEMA = "schemas/web-of-lies-discovery-queue-v1.json"
OUTPUT = "data/web-of-lies/discovery-queue.json"
ROUTING = "data/evidence-integration/rook-catchup-claims-routing-20260920.json"
CLAIMS_MAINTENANCE = "data/claims-forensics/lie-ledger-maintenance-sweep-20260920.json"
NATIVE_DISCOVERIES = "data/web-of-lies/native-discoveries.json"
NATIVE_SCHEMA = "schemas/web-of-lies-native-discovery-v1.json"
sys.path.insert(0, str(ROOT / "scripts"))
import build_web_of_lies_current_anchor_packets as current_anchors  # noqa: E402

# Discovery IDs are Evidence Integration provenance IDs. The intake references
# are the stable bridge into the Claims Forensics maintenance sweep; chain IDs
# are deliberately not hard-coded here.
SEQUENCE_INTAKE_REFS = {
    "WOL-IN-ROOK-F15SA-20260920": {
        "CLM-HOUTHI-F15-SHOOTDOWN-20260916",
        "CLM-HOUTHI-F15-SHOOTDOWN-CONTINUITY-20260917",
    },
    "WOL-IN-ROOK-TREND-20260920": {
        "CLM-IRGC-TANKER-HORMUZ-20260917",
        "CLM-TREND-TANKER-US-DIRECTION-20260918",
    },
    "WOL-IN-ROOK-IRAN-CONDITIONS-20260920": {
        "CLM-IRAN-SEVEN-SETTLEMENT-CONDITIONS-20260919",
        "CLM-IRAN-SEVEN-CONDITIONS-SIX-PUBLIC-20260920",
    },
    "WOL-IN-ROOK-RIYADH-20260920": {
        "UPD-RIYADH-FUEL-DEPOT-FIRE-20260919",
    },
}

RESOLVED_STATUS_BY_DISPOSITION = {
    "NEW_ACCUSATION_CHAIN_PUBLIC_READY": "CANONICAL_CLAIM_FAMILY_ASSIGNED",
    "EXISTING_CONTROL_CHAIN_CHRONOLOGY_ADVANCE": "EXISTING_CANONICAL_CLAIM_CHRONOLOGY_ADVANCE",
}

# F-15SA predates the Claims Forensics maintenance output shape used by the
# three Sep. 20 family assignments. Preserve its established continuity row.
F15_CANONICAL_CLAIM_ID = "CLM-HOUTHI-F15SA-CAUSATION-20260916"


def load(root: Path, path: str) -> Any:
    return json.loads((root / path).read_text(encoding="utf-8"))


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def _routing_rows(value: Any) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    def visit(node: Any) -> None:
        if isinstance(node, list):
            for child in node:
                visit(child)
            return
        if not isinstance(node, dict):
            return
        if "intake_refs" in node or "existing_claim_refs" in node:
            rows.append(node)
        for child in node.values():
            visit(child)

    visit(value)
    return rows


def _maintenance_routes(value: dict[str, Any]) -> list[dict[str, Any]]:
    rows = value.get("route_dispositions") or []
    if not isinstance(rows, list):
        raise ValueError("Claims Forensics maintenance route_dispositions must be a list")
    return [row for row in rows if isinstance(row, dict)]


def _matching_route(
    sequence_id: str,
    maintenance_routes: list[dict[str, Any]],
) -> dict[str, Any] | None:
    intake_refs = SEQUENCE_INTAKE_REFS.get(sequence_id)
    if not intake_refs:
        return None
    matches = [
        row
        for row in maintenance_routes
        if set(str(value) for value in (row.get("intake_refs") or [])) == intake_refs
    ]
    if len(matches) > 1:
        raise ValueError(
            f"ADJUDICATION_REVIEW_CANDIDATE {sequence_id}: multiple current Claims "
            "Forensics routes match the same intake references"
        )
    return matches[0] if matches else None


def canonical_resolution(
    sequence_id: str,
    maintenance_routes: list[dict[str, Any]],
    active_chain_ids: set[str],
) -> dict[str, Any] | None:
    route = _matching_route(sequence_id, maintenance_routes)
    if route is None:
        return None

    chain_id = str(route.get("chain_id") or "").strip()
    if not chain_id:
        return None
    if chain_id not in active_chain_ids:
        raise ValueError(
            f"ADJUDICATION_REVIEW_CANDIDATE {sequence_id}: Claims Forensics route "
            f"points to non-current chain {chain_id}"
        )

    disposition = str(route.get("disposition") or "").strip()
    status = RESOLVED_STATUS_BY_DISPOSITION.get(disposition)
    if status is None:
        return None
    return {
        "chain_id": chain_id,
        "claims_forensics_disposition": disposition,
        "status": status,
    }


def build_queue(root: Path) -> dict[str, Any]:
    handoff = load(root, HANDOFF)
    routing = load(root, ROUTING)
    maintenance = load(root, CLAIMS_MAINTENANCE)
    native = load(root, NATIVE_DISCOVERIES)
    native_schema = load(root, NATIVE_SCHEMA)
    jsonschema.Draft202012Validator(native_schema).validate(native)
    records, overlay = current_anchors.current_records(root)
    active_chain_ids = set(str(value) for value in (overlay.get("chain_overrides") or {}))
    record_pairs = {
        (str(row.get("claim_id") or ""), str(row.get("chain_id") or ""))
        for row in records
    }
    routing_rows = _routing_rows(routing)
    maintenance_routes = _maintenance_routes(maintenance)

    items = []
    resolved_existing = []
    resolved_canonical = []
    for sequence in handoff.get("statement_sequences") or []:
        if sequence.get("claim_family_ref") is not None:
            continue
        sequence_id = str(sequence.get("sequence_id") or "").strip()
        observations = sequence.get("observations") or []
        note = str(sequence.get("downstream_note") or "").strip()
        if not sequence_id or not observations or not note:
            raise ValueError(f"incomplete Web of Lies handoff sequence: {sequence!r}")

        route = _matching_route(sequence_id, maintenance_routes)
        if sequence_id == "WOL-IN-ROOK-F15SA-20260920":
            if route is None:
                raise ValueError(
                    "ADJUDICATION_REVIEW_CANDIDATE WOL-IN-ROOK-F15SA-20260920: "
                    "Claims Forensics continuity route disappeared"
                )
            chain_id = str(route.get("chain_id") or "").strip()
            if (F15_CANONICAL_CLAIM_ID, chain_id) not in record_pairs:
                raise ValueError(
                    "ADJUDICATION_REVIEW_CANDIDATE WOL-IN-ROOK-F15SA-20260920: "
                    f"expected current claim continuity missing {F15_CANONICAL_CLAIM_ID} / {chain_id}"
                )
            if not any(
                F15_CANONICAL_CLAIM_ID in (row.get("existing_claim_refs") or [])
                for row in routing_rows
            ):
                raise ValueError(
                    "WOL-IN-ROOK-F15SA-20260920: Evidence Integration routing does not "
                    f"preserve existing claim ref {F15_CANONICAL_CLAIM_ID}"
                )
            resolved_existing.append({
                "sequence_id": sequence_id,
                "status": "EXISTING_CANONICAL_CLAIM_CONTINUITY",
                "claim_id": F15_CANONICAL_CLAIM_ID,
                "chain_id": chain_id,
                "routing_path": ROUTING,
            })
            continue

        resolution = canonical_resolution(sequence_id, maintenance_routes, active_chain_ids)
        if resolution:
            resolved_canonical.append({
                "sequence_id": sequence_id,
                "status": resolution["status"],
                "claim_family_ref": resolution["chain_id"],
                "chain_id": resolution["chain_id"],
                "claims_forensics_disposition": resolution["claims_forensics_disposition"],
                "claims_forensics_path": CLAIMS_MAINTENANCE,
                "source_handoff_path": HANDOFF,
                "routing_path": ROUTING,
                "observations": observations,
                "downstream_note": note,
            })
            continue

        items.append({
            "discovery_id": sequence_id,
            "status": "AWAITING_CANONICAL_CLAIM_FAMILY",
            "claim_family_ref": None,
            "observations": observations,
            "downstream_note": note,
            "review_target": "INFORMATION_CLAIMS_AND_FORENSIC_ADJUDICATION",
            "review_reason": (
                "Evidence Integration supplied a source/chronology sequence for Web of Lies, "
                "but current Claims Forensics supplies no canonical Lie Ledger family. Preserve "
                "it outside lineage/Hall scoring until Claims Forensics resolves family placement."
            ),
        })

    for discovery in native.get("items") or []:
        discovery_id = str(discovery.get("discovery_id") or "").strip()
        if not discovery_id:
            raise ValueError("native Web of Lies discovery is missing discovery_id")
        if discovery.get("claim_family_ref") is not None:
            raise ValueError(
                f"native discovery {discovery_id} already has a claim family; "
                "route it through canonical lineage instead of the unassigned queue"
            )
        receipts = discovery.get("public_receipts") or []
        if not receipts:
            raise ValueError(
                f"native discovery {discovery_id} has no public receipts"
            )
        for receipt in receipts:
            if not str(receipt.get("url") or "").strip():
                raise ValueError(
                    f"native discovery {discovery_id} contains a receipt without a public URL"
                )
            if str(receipt.get("surface") or "") in {
                "HACKER_PUBLICATION",
                "HACKTIVIST_PUBLICATION",
                "CYBER_GROUP_PUBLICATION",
            } and not receipt.get("claim_status"):
                raise ValueError(
                    f"native cyber discovery {discovery_id} must distinguish "
                    "claimed from verified compromise"
                )
        items.append({
            "discovery_id": discovery_id,
            "status": "AWAITING_CANONICAL_CLAIM_FAMILY",
            "claim_family_ref": None,
            "discovery_type": str(discovery["discovery_type"]),
            "subject": str(discovery["subject"]),
            "observations": discovery["observations"],
            "public_receipts": receipts,
            "attribution_confidence": str(discovery["attribution_confidence"]),
            "attribution_scope": str(discovery["attribution_scope"]),
            "downstream_note": str(discovery["downstream_note"]),
            "review_target": str(discovery["review_target"]),
            "review_reason": str(discovery["review_reason"]),
            "source_handoff_path": NATIVE_DISCOVERIES,
        })

    items.sort(key=lambda row: row["discovery_id"])
    resolved_existing.sort(key=lambda row: row["sequence_id"])
    resolved_canonical.sort(key=lambda row: row["sequence_id"])
    return {
        "schema_version": "1.0",
        "artifact_role": "WEB_OF_LIES_DISCOVERY_QUEUE",
        "authority": "WEB_OF_LIES_INFORMATION_FORENSICS",
        "source_handoff": HANDOFF,
        "as_of": max(
            str(handoff.get("as_of") or ""),
            str(native.get("as_of") or ""),
        ) or None,
        "items": items,
        "resolved_existing_claim_sequences": resolved_existing,
        "resolved_canonical_claim_sequences": resolved_canonical,
    }


def validate(root: Path, queue: dict[str, Any]) -> None:
    schema = load(root, SCHEMA)
    jsonschema.Draft202012Validator(schema).validate(queue)
    ids = [row["discovery_id"] for row in queue["items"]]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate Web of Lies discovery IDs")
    if any(row["claim_family_ref"] is not None for row in queue["items"]):
        raise ValueError("assigned-family sequence leaked into discovery queue")

    resolved_ids = [
        row["sequence_id"]
        for row in queue["resolved_existing_claim_sequences"]
        + queue["resolved_canonical_claim_sequences"]
    ]
    if len(resolved_ids) != len(set(resolved_ids)):
        raise ValueError("duplicate resolved Web of Lies sequence IDs")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--output", default=OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    queue = build_queue(root)
    validate(root, queue)
    output = Path(args.output)
    if not output.is_absolute():
        output = root / output

    serialized = canonical_bytes(queue)
    if args.check:
        if not output.is_file() or output.read_bytes() != serialized:
            raise SystemExit(f"FAIL stale {output}")
        print(
            f"web-of-lies discovery queue: PASS items={len(queue['items'])} "
            f"resolved_existing={len(queue['resolved_existing_claim_sequences'])} "
            f"resolved_canonical={len(queue['resolved_canonical_claim_sequences'])}"
        )
        return 0

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(serialized)
    print(
        f"web-of-lies discovery queue: wrote {output} items={len(queue['items'])} "
        f"resolved_existing={len(queue['resolved_existing_claim_sequences'])} "
        f"resolved_canonical={len(queue['resolved_canonical_claim_sequences'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
