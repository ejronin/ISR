#!/usr/bin/env python3
"""Validate provider-separated source context and the UI Endgame analytical contract.

This gate is intentionally additive:
- the locked 98-record historical ledger and 10-record current overlay stay untouched;
- existing Ground News metadata remains independent;
- verified alternative-provider context may be added without averaging providers;
- the approved UI remains structurally separate from the analytical/source guardrails.
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

    if ground.get("profiles", {}).get("Reuters", {}).get("status") != "RATED":
        fail("existing Ground News Reuters control unexpectedly changed")
    if ground.get("profiles", {}).get("Reuters", {}).get("bias_raw") != "CENTER":
        fail("existing Ground News Reuters bias control unexpectedly changed")

    return len(outlet_rows)


def validate_endgame():
    data = load("data/endgame-adjudication-v1.json")
    labels = set((data.get("terminal_state_labels") or {}).keys())
    if labels != ALLOWED_ENDGAME_STATES:
        fail(f"Endgame terminal-state enum mismatch: {sorted(labels)}")

    mou = data.get("mou_instrument") or {}
    if mou.get("current_state") != "EXPIRED_NON_CONTROLLING":
        fail("Endgame does not mark the June MoU EXPIRED_NON_CONTROLLING")
    if mou.get("final_deal_completed") is not False:
        fail("Endgame incorrectly marks the MoU final deal complete")
    if not mou.get("new_bargain_rule"):
        fail("Endgame lacks the new-bargain rule for an expired MoU")

    claims = data.get("claims") or []
    if len(claims) < 8:
        fail("Endgame has too few victory-condition claims")
    ids = [row.get("id") for row in claims]
    if None in ids or len(ids) != len(set(ids)):
        fail("Endgame claim IDs are missing or duplicated")
    by_id = {row.get("id"): row for row in claims}

    for claim in claims:
        state = (claim.get("current_disposition") or {}).get("state")
        if state not in ALLOWED_ENDGAME_STATES:
            fail(f"Endgame claim {claim.get('id')} has invalid state {state}")
        if not claim.get("path"):
            fail(f"Endgame claim {claim.get('id')} has no decision path")

    assets = by_id.get("assets")
    if not assets:
        fail("Endgame is missing the frozen-assets claim")
    assets_mou = assets.get("mou_relationship") or {}
    if assets_mou.get("relevant") is not True or str(assets_mou.get("clause_ref")) != "11":
        fail("frozen-assets claim must link to MoU Clause 11")
    if assets_mou.get("current_control_state") != "NON_CONTROLLING":
        fail("frozen-assets claim does not preserve the expired MoU as non-controlling")
    asset_path_text = " ".join(
        f"{row.get('label', '')} {row.get('detail', '')}" for row in assets.get("path", [])
    ).upper()
    if "CLAUSE 11" not in asset_path_text or "EXPIRED" not in asset_path_text:
        fail("frozen-assets path must visibly traverse Clause 11 and MoU expiry")

    hormuz = by_id.get("hormuz")
    if not hormuz:
        fail("Endgame is missing the Hormuz claim")
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


def validate_bias_ui():
    base_view = (ROOT / "js/endgame-adjudication-r1.js").read_text(encoding="utf-8")
    bias_view = (ROOT / "js/source-bias-r1.js").read_text(encoding="utf-8")
    base_css = (ROOT / "css/endgame-adjudication-r1.css").read_text(encoding="utf-8")
    bias_css = (ROOT / "css/source-bias-r1.css").read_text(encoding="utf-8")
    loader = (ROOT / "js/endgame-20260823.js").read_text(encoding="utf-8")
    view = base_view + "\n" + bias_view
    css = base_css + "\n" + bias_css
    compact = "".join(view.split())

    if "media_bias_context" not in view:
        fail("source UI does not consume provider-separated media_bias_context")
    if "ALLSIDES" not in view or "AD_FONTES" not in view:
        fail("source UI does not expose both named alternative bias providers")
    if "media-bias-provider-metadata.json" not in bias_view:
        fail("source UI does not load verified alternative-provider metadata")
    if "source-bias-r1.js" not in loader or "source-bias-r1.css" not in loader:
        fail("source-bias JS/CSS modules are not loaded by the Endgame/UI loader")

    semantic_hook = any(
        token in compact
        for token in (
            "dataset.biasPosition=",
            "dataset.bias=",
            "data-bias-position",
            "bias-${",
            "bias_",
        )
    )
    if not semantic_hook:
        fail("bias scales have no per-position semantic hook for distinct coloring")

    for position in ("FAR-LEFT", "LEFT", "LEAN-LEFT", "CENTER", "LEAN-RIGHT", "RIGHT", "FAR-RIGHT"):
        if f'data-bias-position="{position}"' not in bias_css:
            fail(f"Ground News bias CSS is missing distinct treatment for {position}")

    if 'data-bias-provider="ALLSIDES"' not in bias_css:
        fail("AllSides provider-specific scale styling is missing")
    if "isr-adfontes-meter" not in bias_css or "AD_FONTES" not in bias_view:
        fail("Ad Fontes provider-native bias display is missing")
    if "NOT RATED is never interpreted as CENTER" not in bias_view:
        fail("unrated-to-Center negative-control language is missing")

    return "Ground News colors + AllSides/Ad Fontes fallbacks checked"


def main():
    validate_counts()
    outlet_count = validate_provider_metadata()
    endgame_status = validate_endgame()
    bias_ui_status = validate_bias_ui()
    print(
        "ANALYSIS CONTRACT GATE: PASS — "
        f"{outlet_count} alternative-provider outlet records; "
        f"Endgame: {endgame_status}; Bias UI: {bias_ui_status}; 98 + 10 = 108 unchanged"
    )


if __name__ == "__main__":
    main()
