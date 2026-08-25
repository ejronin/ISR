#!/usr/bin/env python3
"""Validate the Aug. 24 Endgame adjudication and media-bias provider contracts.

This gate is intentionally data-focused. UI/Mermaid rendering may evolve independently,
but it must consume these contracts without changing the locked historical ledger.
"""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def fail(message: str):
    raise SystemExit(f"ANALYSIS CONTRACT GATE: FAIL — {message}")


def all_strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from all_strings(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from all_strings(item)


def valid_https(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return parsed.scheme == "https" and bool(parsed.netloc)
    except Exception:
        return False


def main():
    adjudication = load("data/endgame-adjudication-20260824.json")
    provider_meta = load("data/media-bias-provider-metadata.json")
    ground = load("data/ground-news-outlet-metadata.json")
    endgame = load("data/endgame-so-far.json")
    hormuz = load("data/hormuz-strategic-v3.json")
    historical = load("data/integration-v1.2/events.json")
    overlay = load("data/current-update-20260824/events.json")
    overlay_manifest = load("data/current-update-20260824/manifest.json")

    if len(historical.get("events", [])) != 98:
        fail("locked historical ledger is not 98 records")
    if len(overlay.get("events", [])) != 10:
        fail("Aug. 24 overlay is not 10 records")
    if overlay_manifest.get("counts", {}).get("current_chronology_records") != 108:
        fail("current chronology manifest is not 108")

    allowed = set(adjudication.get("allowed_terminal_states", []))
    required_allowed = {
        "PROCEEDS_UNDER_IRAN_DEMAND",
        "WALKED_BACK_DILUTED",
        "CUT_OFF_DENIED",
        "OPEN_UNRESOLVED",
    }
    if allowed != required_allowed:
        fail(f"terminal-state enum mismatch: {sorted(allowed)}")

    if adjudication.get("mou_status_contract", {}).get("current_status") != "EXPIRED_NON_CONTROLLING":
        fail("MoU current status is not explicitly EXPIRED_NON_CONTROLLING")

    endgame_ids = {row.get("id") for row in endgame.get("sources", []) if row.get("id")}
    hormuz_strings = set(all_strings(hormuz))

    claims = adjudication.get("claims", [])
    if len(claims) < 10:
        fail("too few independently adjudicated victory-condition branches")

    claim_ids = [row.get("claim_id") for row in claims]
    if None in claim_ids or len(claim_ids) != len(set(claim_ids)):
        fail("claim IDs are missing or duplicated")

    all_node_ids = []
    for claim in claims:
        terminal = claim.get("terminal_state")
        if terminal not in allowed:
            fail(f"{claim.get('claim_id')} has invalid terminal state {terminal}")

        path = claim.get("decision_path", [])
        if not path:
            fail(f"{claim.get('claim_id')} has no decision path")
        terminal_nodes = [node for node in path if node.get("type") == "TERMINAL"]
        if len(terminal_nodes) != 1:
            fail(f"{claim.get('claim_id')} must have exactly one terminal node")
        if terminal_nodes[0].get("state") != terminal:
            fail(f"{claim.get('claim_id')} terminal node disagrees with terminal_state")

        for node in path:
            node_id = node.get("node_id")
            if not node_id:
                fail(f"{claim.get('claim_id')} has a node without node_id")
            all_node_ids.append(node_id)

        mou = claim.get("mou_dependency", {})
        if mou.get("relevant"):
            if not mou.get("clauses"):
                fail(f"{claim.get('claim_id')} is MoU-dependent but has no clause refs")
            if mou.get("current_controlling_state") != "EXPIRED_NON_CONTROLLING":
                fail(f"{claim.get('claim_id')} does not mark the old MoU non-controlling")
            if not mou.get("new_bargain_test"):
                fail(f"{claim.get('claim_id')} lacks a new-bargain test")

        for ref in claim.get("original_source_refs", []) + claim.get("evidence_refs", []):
            namespace = ref.get("namespace")
            source_id = ref.get("id")
            if namespace == "ENDGAME" and source_id not in endgame_ids:
                fail(f"{claim.get('claim_id')} unresolved ENDGAME source {source_id}")
            if namespace == "HORMUZ" and source_id not in hormuz_strings:
                fail(f"{claim.get('claim_id')} unresolved HORMUZ source {source_id}")
            if namespace not in {"ENDGAME", "HORMUZ"}:
                fail(f"{claim.get('claim_id')} unknown evidence namespace {namespace}")

    if len(all_node_ids) != len(set(all_node_ids)):
        fail("decision-path node IDs are not globally unique")

    hormuz_claims = {row.get("category"): row for row in claims if str(row.get("category", "")).startswith("HORMUZ_")}
    required_hormuz = {
        "HORMUZ_LEGAL_CONTROL",
        "HORMUZ_OPERATIONAL_GATEKEEPING",
        "HORMUZ_FEES_RENT",
    }
    if set(hormuz_claims) != required_hormuz:
        fail(f"Hormuz branch split mismatch: {sorted(hormuz_claims)}")
    if hormuz_claims["HORMUZ_OPERATIONAL_GATEKEEPING"].get("terminal_state") != "PROCEEDS_UNDER_IRAN_DEMAND":
        fail("operational gatekeeping branch lost its distinct current disposition")
    if hormuz_claims["HORMUZ_LEGAL_CONTROL"].get("terminal_state") == "PROCEEDS_UNDER_IRAN_DEMAND":
        fail("legal Hormuz control is incorrectly inferred from operational gatekeeping")
    if hormuz_claims["HORMUZ_FEES_RENT"].get("terminal_state") == "PROCEEDS_UNDER_IRAN_DEMAND":
        fail("fee/rent authority is incorrectly inferred from operational gatekeeping")

    providers = provider_meta.get("provider_definitions", {})
    if not {"ALLSIDES", "AD_FONTES"}.issubset(providers):
        fail("alternative provider definitions are incomplete")

    outlet_rows = provider_meta.get("outlets", [])
    canonical_names = [row.get("canonical_name") for row in outlet_rows]
    if None in canonical_names or len(canonical_names) != len(set(canonical_names)):
        fail("media-bias canonical outlet names are missing or duplicated")

    rated_pairs = set()
    for outlet in outlet_rows:
        for rating in outlet.get("ratings", []):
            provider = rating.get("provider")
            status = rating.get("status")
            label = rating.get("label")
            url = rating.get("profile_url")
            if provider not in providers:
                fail(f"{outlet.get('canonical_name')} uses unknown provider {provider}")
            if status != "RATED":
                fail(f"stored alternative rating must be verified RATED: {outlet.get('canonical_name')} / {provider}")
            if not label:
                fail(f"missing native provider label for {outlet.get('canonical_name')} / {provider}")
            if not valid_https(url or ""):
                fail(f"invalid provider profile URL for {outlet.get('canonical_name')} / {provider}")
            pair = (outlet.get("canonical_name"), provider)
            if pair in rated_pairs:
                fail(f"duplicate provider rating {pair}")
            rated_pairs.add(pair)

    afp = next((row for row in outlet_rows if row.get("canonical_name") == "Agence France-Presse"), None)
    if not afp or not any(r.get("provider") == "AD_FONTES" and r.get("label") == "MIDDLE" for r in afp.get("ratings", [])):
        fail("AFP alternative Ad Fontes fallback example is missing")

    negative = provider_meta.get("negative_control", {})
    if negative.get("outlet") != "AFP" or negative.get("provider") != "ALLSIDES" or negative.get("status") != "NOT_RATED":
        fail("AFP / AllSides NOT_RATED negative control is missing")
    if not valid_https(negative.get("profile_url", "")):
        fail("AFP AllSides negative-control URL is invalid")

    # Existing Ground News metadata remains independent and must not be rewritten into the alternative file.
    if not ground.get("profiles", {}).get("Reuters", {}).get("status") == "RATED":
        fail("existing Ground News Reuters control unexpectedly changed")
    if "GROUND_NEWS" in providers:
        fail("Ground News must remain in its existing authoritative metadata file, not duplicated as an alternative provider definition")

    print(
        "ANALYSIS CONTRACT GATE: PASS — "
        f"{len(claims)} adjudication branches; "
        f"{len(outlet_rows)} alternative-provider outlet records; "
        "Hormuz legal/operational/fees split preserved; 98 + 10 = 108 unchanged"
    )


if __name__ == "__main__":
    main()
