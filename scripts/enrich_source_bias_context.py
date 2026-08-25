#!/usr/bin/env python3
"""Enrich generated ISR outlet profiles with provider-separated media-bias context.

Run AFTER scripts/build_source_registry.py. This script is deliberately additive:
- existing ground_news fields remain untouched;
- alternative providers are named explicitly;
- unlike provider methodologies are never averaged;
- political/media-bias context never changes Atlas evidence grade.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

PREFERENCE = ["GROUND_NEWS", "ALLSIDES", "AD_FONTES"]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def alt_index(metadata: dict):
    index = {}
    for row in metadata.get("outlets", []):
        names = [row.get("canonical_name"), *(row.get("aliases") or [])]
        for name in names:
            if name:
                index[name.strip().lower()] = row
    return index


def ground_rating(profile: dict):
    ground = profile.get("ground_news") or {}
    if ground.get("status") != "RATED":
        return None
    return {
        "provider": "GROUND_NEWS",
        "status": "RATED",
        "label": ground.get("bias_raw"),
        "bias_bucket_3": ground.get("bias_bucket_3"),
        "factuality": ground.get("factuality"),
        "profile_url": ground.get("profile_url"),
        "checked_at": ground.get("checked_at"),
        "provider_native": True,
    }


def normalize_alt(rating: dict):
    keep = {
        "provider",
        "status",
        "label",
        "bias_score",
        "reliability_label",
        "reliability_score",
        "confidence",
        "profile_url",
        "checked_at",
        "notes",
    }
    out = {key: rating.get(key) for key in keep if rating.get(key) is not None}
    out["provider_native"] = True
    return out


def preferred(ratings: list[dict]):
    for provider in PREFERENCE:
        for rating in ratings:
            if rating.get("provider") == provider and rating.get("status") == "RATED":
                return rating
    return None


def enrich_profile(profile: dict, alternatives: dict):
    ratings = []
    ground = ground_rating(profile)
    if ground:
        ratings.append(ground)

    alt = alternatives.get(str(profile.get("display_name") or "").strip().lower())
    if alt:
        for rating in alt.get("ratings", []):
            if rating.get("status") == "RATED":
                ratings.append(normalize_alt(rating))

    chosen = preferred(ratings)
    ground_status = (profile.get("ground_news") or {}).get("status")
    if chosen:
        status = "RATED"
        preferred_provider = chosen.get("provider")
    elif ground_status == "NOT_APPLICABLE":
        status = "NOT_APPLICABLE"
        preferred_provider = None
    else:
        status = "NO_INDEPENDENT_RATING_LOCATED"
        preferred_provider = None

    profile["media_bias_context"] = {
        "status": status,
        "preferred_provider": preferred_provider,
        "ratings": ratings,
        "methodology_note": "Third-party publisher context only. Provider methodologies are not normalized or averaged and do not change Atlas evidence grade.",
    }
    return profile


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ns = ap.parse_args()
    root = Path(ns.root).resolve()

    registry_path = root / "data/source-registry.json"
    profiles_path = root / "data/outlet-profiles.json"
    metadata_path = root / "data/media-bias-provider-metadata.json"
    if not registry_path.exists() or not profiles_path.exists() or not metadata_path.exists():
        raise SystemExit("source registry, outlet profiles, and media-bias provider metadata must exist before enrichment")

    registry = load(registry_path)
    profiles_payload = load(profiles_path)
    metadata = load(metadata_path)
    alternatives = alt_index(metadata)

    profiles = registry.get("outlet_profiles", [])
    for profile in profiles:
        enrich_profile(profile, alternatives)

    by_id = {row.get("outlet_profile_id"): row for row in profiles}
    synced_profiles = []
    for row in profiles_payload.get("outlet_profiles", []):
        enriched = by_id.get(row.get("outlet_profile_id"))
        synced_profiles.append(enriched if enriched is not None else enrich_profile(row, alternatives))
    profiles_payload["outlet_profiles"] = synced_profiles

    registry.setdefault("methodology", {})["media_bias_context"] = (
        "Provider-separated publisher context from Ground News plus verified alternative-provider metadata. "
        "Ratings are not averaged and never alter evidence grade."
    )
    registry["media_bias_provider_metadata_checked_at"] = metadata.get("checked_at")
    profiles_payload["media_bias_provider_metadata_checked_at"] = metadata.get("checked_at")

    write(registry_path, registry)
    write(profiles_path, profiles_payload)

    rated = sum((row.get("media_bias_context") or {}).get("status") == "RATED" for row in profiles)
    fallback = sum(
        (row.get("media_bias_context") or {}).get("preferred_provider") in {"ALLSIDES", "AD_FONTES"}
        and (row.get("ground_news") or {}).get("status") != "RATED"
        for row in profiles
    )
    print(
        f"source-bias-context: {len(profiles)} outlets; {rated} externally rated; "
        f"{fallback} alternative-provider fallback outlets"
    )


if __name__ == "__main__":
    main()
