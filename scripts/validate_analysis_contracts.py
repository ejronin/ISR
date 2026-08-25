#!/usr/bin/env python3
"""Validate provider-separated source context and, when present, the UI Endgame contract.

This gate is intentionally additive:
- the locked 98-record historical ledger and 10-record current overlay stay untouched;
- existing Ground News metadata remains independent;
- verified alternative-provider context may be added without averaging providers;
- when the engineer's Endgame runtime data is present, key analytical invariants are
  checked without creating a second competing adjudication dataset.
"""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_ENDGAME_STATES = {
    "PROCEEDS_UNDER_IRAN_DEMAND",
    "WALKED_BACK_DILUTED",
    "CUT_OFF_DENIED",
    "OPEN_UNRESOLVED",
}


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def fail(message: str):
    raise SystemExit(f"ANALYSIS CONTRACT GATE: FAIL — {message}")


def valid_https(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return parsed.scheme == "https" and bool(parsed.netloc)
    except Exception:
        return False


def validate_counts():
    historical = load("data/integration-v1.2/events.json")
    overlay = load("data/current-update-20260824/events.json")
    overlay_manifest = load("data/current-update-20260824/manifest.json")
    if len(historical.get("events", [])) != 98:
        fail("locked historical ledger is not 98 records")
    if len(overlay.get("events", [])) != 10:
        fail("Aug. 24 overlay is not 10 records")
    if overlay_manifest.get("counts", {}).get("current_chronology_records") != 108:
        fail("current chronology manifest is not 108")


def validate_provider_metadata():
    provider_meta = load("data/media-bias-provider-metadata.json")
    ground = load("data/ground-news-outlet-metadata.json")
    profiles_payload = load("data/outlet-profiles.json")

    providers = provider_meta.get("provider_definitions", {})
    if not {"ALLSIDES", "AD_FONTES"}.issubset(providers):
        fail("alternative provider definitions are incomplete")
    if "GROUND_NEWS" in providers:
        fail("Ground News must remain in its existing authoritative metadata file, not be duplicated as an alternative provider definition")

    outlet_rows = provider_meta.get("outlets", [])
    canonical_names = [row.get("canonical_name") for row in outlet_rows]
    if None in canonical_names or len(canonical_names) != len(set(canonical_names)):
        fail("media-bias canonical outlet names are missing or duplicated")

    registry_names = {
        str(row.get("display_name") or "").strip().lower()
        for row in profiles_payload.get("outlet_profiles", [])
        if row.get("display_name")
    }
    rated_pairs = set()
    for outlet in outlet_rows:
        names = [outlet.get("canonical_name"), *(outlet.get("aliases") or [])]
        if not any(str(name or "").strip().lower() in registry_names for name in names):
            fail(f"alternative-provider outlet does not match the current Atlas registry: {outlet.get('canonical_name')}")
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
    if not afp or not any(
        r.get("provider") == "AD_FONTES" and r.get("label") == "MIDDLE"
        for r in afp.get("ratings", [])
    ):
        fail("AFP alternative Ad Fontes fallback example is missing")

    bellingcat = next((row for row in outlet_rows if row.get("canonical_name") == "Bellingcat"), None)
    if not bellingcat or not any(r.get("provider") == "AD_FONTES" for r in bellingcat.get("ratings", [])):
        fail("Bellingcat Ad Fontes fallback example is missing")

    negative = provider_meta.get("negative_control", {})
    if (
        negative.get("outlet") != "AFP"
        or negative.get("provider") != "ALLSIDES"
        or negative.get("status") != "NOT_RATED"
    ):
        fail("AFP / AllSides NOT_RATED negative control is missing")
    if not valid_https(negative.get("profile_url", "")):
        fail("AFP AllSides negative-control URL is invalid")

    # Existing Ground News metadata is an independent control. Alternative metadata must
    # not silently mutate a real Ground News rating or reinterpret NOT_RATED as Center.
    if ground.get("profiles", {}).get("Reuters", {}).get("status") != "RATED":
        fail("existing Ground News Reuters control unexpectedly changed")
    if ground.get("profiles", {}).get("Reuters", {}).get("bias_raw") != "CENTER":
        fail("existing Ground News Reuters bias control unexpectedly changed")

    return len(outlet_rows)


def validate_engineer_endgame_if_present():
    """Validate shared analytical requirements after this branch is combined with UI work.

    The data file intentionally lives on the engineer branch. Keeping this check optional on
    the standalone source-context branch avoids introducing a second Endgame source of truth.
    """
    path = ROOT / "data/endgame-adjudication-v1.json"
    if not path.exists():
        return "not present on standalone source-context branch"

    data = json.loads(path.read_text(encoding="utf-8"))
    labels = set((data.get("terminal_state_labels") or {}).keys())
    if labels != ALLOWED_ENDGAME_STATES:
        fail(f"engineer Endgame terminal-state enum mismatch: {sorted(labels)}")

    mou = data.get("mou_instrument") or {}
    if mou.get("current_state") != "EXPIRED_NON_CONTROLLING":
        fail("engineer Endgame does not mark the June MoU EXPIRED_NON_CONTROLLING")
    if mou.get("final_deal_completed") is not False:
        fail("engineer Endgame incorrectly marks the MoU final deal complete")
    if not mou.get("new_bargain_rule"):
        fail("engineer Endgame lacks the new-bargain rule for an expired MoU")

    claims = data.get("claims") or []
    if len(claims) < 8:
        fail("engineer Endgame has too few victory-condition claims")
    ids = [row.get("id") for row in claims]
    if None in ids or len(ids) != len(set(ids)):
        fail("engineer Endgame claim IDs are missing or duplicated")
    by_id = {row.get("id"): row for row in claims}

    for claim in claims:
        state = (claim.get("current_disposition") or {}).get("state")
        if state not in ALLOWED_ENDGAME_STATES:
            fail(f"engineer Endgame claim {claim.get('id')} has invalid state {state}")
        if not claim.get("path"):
            fail(f"engineer Endgame claim {claim.get('id')} has no decision path")

    # Clause 11 is analytically material to the frozen-assets path. The historical MoU
    # promised asset availability; its later expiry/non-performance is part of the chain.
    assets = by_id.get("assets")
    if not assets:
        fail("engineer Endgame is missing the frozen-assets claim")
    assets_mou = assets.get("mou_relationship") or {}
    if assets_mou.get("relevant") is not True or str(assets_mou.get("clause_ref")) != "11":
        fail("frozen-assets claim must link to MoU Clause 11")
    if assets_mou.get("current_control_state") != "NON_CONTROLLING":
        fail("frozen-assets claim does not preserve the expired MoU as non-controlling")

    hormuz = by_id.get("hormuz")
    if not hormuz:
        fail("engineer Endgame is missing the Hormuz claim")
    dimensions = {row.get("id"): row for row in hormuz.get("dimensions", [])}
    if set(dimensions) != {"legal", "operational", "fees"}:
        fail(f"Hormuz dimensions are not exactly legal/operational/fees: {sorted(dimensions)}")
    if dimensions["operational"].get("state") != "PROCEEDS_UNDER_IRAN_DEMAND":
        fail("Hormuz operational gatekeeping lost its distinct proceeds disposition")
    if dimensions["legal"].get("state") == "PROCEEDS_UNDER_IRAN_DEMAND":
        fail("Hormuz legal control is incorrectly inferred from operational gatekeeping")
    if dimensions["fees"].get("state") == "PROCEEDS_UNDER_IRAN_DEMAND":
        fail("Hormuz fee authority is incorrectly inferred from operational gatekeeping")

    return f"{len(claims)} Endgame claims checked"


def main():
    validate_counts()
    outlet_count = validate_provider_metadata()
    endgame_status = validate_engineer_endgame_if_present()
    print(
        "ANALYSIS CONTRACT GATE: PASS — "
        f"{outlet_count} alternative-provider outlet records; "
        f"Endgame: {endgame_status}; 98 + 10 = 108 unchanged"
    )


if __name__ == "__main__":
    main()
