#!/usr/bin/env python3
"""Build the Lie Ledger v2 semantic projection without rewriting sealed evidence.

ROOK is the sole authority for substantive truth/knowledge/combined adjudications.
This module may normalize legacy structure and factual vocabulary, but it must not
manufacture a substantive knowledge judgment.
"""
from __future__ import annotations

import copy
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
AUTHORITY_PATH = "data/lie-ledger-v2-rook-authority.json"
FORENSIC_PATH = "data/forensic-v1.3.2/iranian-claim-evolution.json"
CURATED_PATH = "data/claims.json"
CONTRACT_PATH = "docs/LIE_LEDGER_ANALYTICAL_AUTHORITY_AND_EVIDENCE_CONTRACT_20260909.md"
CONTRACT_VERSION = "2026-09-09"

STRONG_KNOWLEDGE = {
    "LIKELY_KNEW_FALSE",
    "VERY_LIKELY_KNEW_FALSE",
    "KNOWING_FALSEHOOD_ESTABLISHED",
}
FALSY = {"FALSE", "MISLEADING"}
TRUTH_VALUES = {"SUPPORTED", "PARTLY_TRUE", "MISLEADING", "FALSE", "UNRESOLVED"}
KNOWLEDGE_VALUES = {
    "NOT_ASSESSED",
    "NOT_ASSESSABLE",
    "INSUFFICIENT_EVIDENCE",
    "POSSIBLE_KNOWLEDGE",
    "LIKELY_KNEW_FALSE",
    "VERY_LIKELY_KNEW_FALSE",
    "KNOWING_FALSEHOOD_ESTABLISHED",
}
DENOMINATOR_CLASSES = {
    "UNIQUE_ATOMIC_PROPOSITION",
    "REPETITION_AMPLIFICATION",
    "CLAIM_INSTANCE",
    "CORRECTION_RETRACTION",
    "MEDIA_ARTIFACT",
    "ATLAS_CONTEXT_EFFECT_LADDER",
    "STRATEGIC_NARRATIVE_CASE_FILE",
    "RHETORIC_DECLARATORY_POLICY",
    "NON_ACCUSATION_CONTEXT",
}
EVIDENCE_GROUPS = (
    "what_was_said",
    "factual_baseline",
    "contemporaneous_state",
    "knowledge_access",
    "knowledge_indicators",
    "contrary_evidence",
    "corrections",
    "repetitions",
    "credible_alternative",
    "comparative_inference",
    "falsifier",
)

EVIDENCE_KEY_MAP = {
    "claim": "what_was_said",
    "baseline": "factual_baseline",
    "contemporaneous": "contemporaneous_state",
    "knowledge": "knowledge_access",
    "knowledge_indicators": "knowledge_indicators",
    "contrary": "contrary_evidence",
    "correction": "corrections",
    "repetition": "repetitions",
    "alternative": "credible_alternative",
    "comparative": "comparative_inference",
    "falsifier": "falsifier",
}


def load(root: Path, relative: str) -> Any:
    return json.loads((root / relative).read_text(encoding="utf-8"))


def stable(prefix: str, *values: Any) -> str:
    material = "\0".join(str(value or "").strip().casefold() for value in values).encode("utf-8")
    return f"{prefix}-{hashlib.sha256(material).hexdigest()[:12].upper()}"


def unwrap(item: Any) -> dict[str, Any]:
    if not isinstance(item, dict):
        return {}
    record = item.get("record")
    return record if isinstance(record, dict) else item


def factual_status(value: Any) -> str:
    raw = str(value or "").strip().upper()
    if raw in TRUTH_VALUES:
        return raw
    if any(token in raw for token in ("FALSE", "DISPRO", "CONTRADICT")):
        return "FALSE"
    if "MISLEAD" in raw or "OVERSTAT" in raw or "EXAGGER" in raw:
        return "MISLEADING"
    if any(token in raw for token in ("PARTLY", "MOSTLY", "PARTIAL")):
        return "PARTLY_TRUE"
    if any(token in raw for token in ("CONFIRM", "VERIFIED", "SUPPORTED", "TRUE")):
        return "SUPPORTED"
    return "UNRESOLVED"


def confidence(value: Any) -> str:
    raw = str(value or "MODERATE").strip().upper().replace(" ", "_").replace("-", "_")
    aliases = {
        "MEDIUM": "MODERATE",
        "MODERATE/HIGH": "MODERATE_HIGH",
        "MODERATE_HIGH": "MODERATE_HIGH",
        "VERY_HIGH": "HIGH",
    }
    raw = aliases.get(raw, raw)
    return raw if raw in {"LOW", "MODERATE", "MODERATE_HIGH", "HIGH"} else "MODERATE"


def source_catalog(state: dict[str, Any]) -> tuple[set[str], dict[str, str]]:
    ids: set[str] = set()
    by_url: dict[str, str] = {}
    for item in (state.get("sources") or {}).get("records") or []:
        source_id = str(item.get("source_id") or "")
        if not source_id:
            continue
        ids.add(source_id)
        candidates = [item]
        candidates.extend(
            (variant.get("record") or variant)
            for variant in item.get("variants") or []
            if isinstance(variant, dict)
        )
        for candidate in candidates:
            url = str((candidate or {}).get("url") or "").strip()
            if url:
                by_url[url] = source_id
    return ids, by_url


def component_refs(overlay: dict[str, Any] | None) -> dict[str, list[str]]:
    groups = {key: [] for key in EVIDENCE_GROUPS}
    if not overlay:
        return groups
    for key, refs in (overlay.get("evidence") or {}).items():
        target = EVIDENCE_KEY_MAP.get(key)
        if target:
            groups[target] = list(dict.fromkeys(str(ref) for ref in refs or [] if ref))
    return groups


def forensic_overlay_matches(
    claim: dict[str, Any],
    proposition: dict[str, Any],
    overlays: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    claim_id = str(claim.get("claim_id") or "")
    proposition_text = str(proposition.get("proposition") or claim.get("exact_translated_claim") or "")
    matches = []
    for overlay in overlays:
        if overlay.get("original_claim_id") != claim_id:
            continue
        contains = str(overlay.get("proposition_contains") or "").strip()
        if contains and contains.casefold() not in proposition_text.casefold():
            continue
        matches.append(overlay)
    return matches


def relationship_from(overlay: dict[str, Any] | None, claim: dict[str, Any]) -> tuple[str, str]:
    denominator = str((overlay or {}).get("denominator") or "")
    if denominator == "REPETITION_AMPLIFICATION":
        return "AMPLIFICATION", "AMPLIFIER"
    if denominator == "CORRECTION_RETRACTION":
        raw = " ".join(str(x) for x in claim.get("final_disposition") or []).upper()
        return ("RETRACTION", "RETRACTOR") if "RETRACT" in raw else ("CORRECTION", "CORRECTOR")
    if claim.get("previous_claim_id"):
        return "REPETITION", "AMPLIFIER"
    return "ORIGINATION", "ORIGINATOR"


def lifecycle_from(overlay: dict[str, Any] | None, claim: dict[str, Any]) -> str:
    denominator = str((overlay or {}).get("denominator") or "")
    raw = " ".join(str(x) for x in claim.get("final_disposition") or []).upper()
    if denominator == "CORRECTION_RETRACTION" or "CORRECT" in raw or "RETRACT" in raw:
        if "CORRECT" in raw and "RETRACT" in raw:
            return "CORRECTED_AND_RETRACTED"
        if "RETRACT" in raw:
            return "RETRACTED"
        return "CORRECTED"
    if "NARRATIVE_SUBSTITUTION" in raw:
        return "SUPERSEDED"
    return "ACTIVE"


def make_alt(value: Any) -> list[dict[str, str]]:
    if not value:
        return []
    values = value if isinstance(value, list) else [value]
    result = []
    for item in values:
        if isinstance(item, dict):
            result.append({
                "alternative": str(item.get("alternative") or item.get("text") or ""),
                "comparative_weight": str(item.get("comparative_weight") or "PLAUSIBLE"),
                "basis": str(item.get("basis") or "ROOK credible alternative."),
            })
        else:
            result.append({
                "alternative": str(item),
                "comparative_weight": "PLAUSIBLE",
                "basis": "ROOK credible alternative.",
            })
    return [item for item in result if item["alternative"]]


def falsifiers(proposition: dict[str, Any], claim: dict[str, Any], overlay: dict[str, Any] | None) -> list[str]:
    if overlay and overlay.get("falsifier"):
        raw = overlay.get("falsifier")
    else:
        raw = proposition.get("evidence_that_would_change_assessment")
        if not raw:
            raw = claim.get("evidence_that_would_change_assessment")
    if isinstance(raw, str):
        return [raw] if raw.strip() else []
    return [str(item) for item in (raw or []) if str(item).strip()]


def knowledge_indicators(
    overlay: dict[str, Any] | None,
    evidence: dict[str, list[str]],
) -> list[dict[str, Any]]:
    if not overlay or not evidence["knowledge_access"]:
        return []
    return [{
        "indicator": "ROOK_KNOWLEDGE_BASIS",
        "direction": "SUPPORTS_KNOWLEDGE",
        "strength": (
            "DIRECT" if overlay.get("knowledge") == "KNOWING_FALSEHOOD_ESTABLISHED"
            else "STRONG" if overlay.get("knowledge") in {"LIKELY_KNEW_FALSE", "VERY_LIKELY_KNEW_FALSE"}
            else "MODERATE"
        ),
        "summary": "ROOK identified the linked evidence as part of the claimant/institution knowledge-access basis.",
        "evidence_refs": copy.deepcopy(evidence["knowledge_access"]),
    }]


def publication_blockers_for_record(
    record: dict[str, Any],
    overlay: dict[str, Any] | None,
    known_source_ids: set[str],
) -> list[dict[str, str]]:
    blockers: list[dict[str, str]] = []
    if overlay and overlay.get("publication_blocked"):
        blockers.append({
            "code": "ROOK_EVIDENCE_COMPLETION_REQUIRED",
            "deficiency": str(overlay["publication_blocked"]),
        })
    refs = {
        ref
        for group in record["evidence_support"].values()
        for ref in group
        if isinstance(ref, str)
    }
    unresolved = sorted(refs - known_source_ids)
    if unresolved:
        blockers.append({
            "code": "UNRESOLVED_SOURCE_REFERENCE",
            "deficiency": "Unresolved evidence references: " + ", ".join(unresolved),
        })
    if record["knowledge_judgment"] in STRONG_KNOWLEDGE:
        required_groups = ("what_was_said", "factual_baseline", "knowledge_access")
        missing_groups = [group for group in required_groups if not record["evidence_support"][group]]
        if missing_groups:
            blockers.append({
                "code": "KNOWLEDGE_BASIS_SUPPORT_FAILURE",
                "deficiency": "Strong ROOK judgment lacks component evidence for: " + ", ".join(missing_groups),
            })
        if not record["credible_alternatives"]:
            blockers.append({
                "code": "CREDIBLE_ALTERNATIVE_MISSING",
                "deficiency": "Strong ROOK judgment lacks the credible alternative required by the contract.",
            })
        if not record["falsifier"]:
            blockers.append({
                "code": "FALSIFIER_MISSING",
                "deficiency": "Strong ROOK judgment lacks a falsifier/evidence-that-would-change-assessment.",
            })
    return blockers


def forensic_records(
    root: Path,
    authority: dict[str, Any],
    known_source_ids: set[str],
) -> list[dict[str, Any]]:
    forensic = load(root, FORENSIC_PATH)
    claims = forensic.get("claims") or forensic.get("records") or []
    overlays = authority.get("forensic_overrides") or []
    records: list[dict[str, Any]] = []

    for claim in claims:
        propositions = claim.get("factual_propositions") or [{
            "axis": "CLAIM",
            "proposition": claim.get("exact_translated_claim"),
            "disposition": (claim.get("final_disposition") or ["UNRESOLVED"])[0],
            "confidence": claim.get("confidence"),
        }]
        for index, proposition in enumerate(propositions, 1):
            matched = forensic_overlay_matches(claim, proposition, overlays)
            overlay = matched[0] if matched else None
            source_proposition = str(proposition.get("proposition") or claim.get("exact_translated_claim") or "")
            rendered_proposition = str((overlay or {}).get("proposition_override") or source_proposition)
            truth = str((overlay or {}).get("truth") or factual_status(proposition.get("disposition")))
            if truth not in TRUTH_VALUES:
                truth = factual_status(truth)
            knowledge = str((overlay or {}).get("knowledge") or "NOT_ASSESSED")
            if knowledge not in KNOWLEDGE_VALUES:
                raise ValueError(f"Unsupported ROOK knowledge judgment {knowledge} for {claim.get('claim_id')}")
            relation_type, actor_role = relationship_from(overlay, claim)
            denominator = str((overlay or {}).get("denominator") or "NON_ACCUSATION_CONTEXT")
            if denominator not in DENOMINATOR_CLASSES:
                raise ValueError(f"Unsupported denominator class {denominator}")
            evidence = component_refs(overlay)
            claim_source = str(claim.get("source_id") or "")
            if claim_source and not evidence["what_was_said"]:
                evidence["what_was_said"] = [claim_source]
            if not overlay:
                evidence["contemporaneous_state"] = list(dict.fromkeys(
                    str(x) for x in claim.get("contemporaneous_independent_evidence") or [] if x
                ))
                evidence["factual_baseline"] = list(dict.fromkeys(
                    [*evidence["contemporaneous_state"],
                     *(str(x) for x in claim.get("later_evidence") or [] if x)]
                ))
            proposition_id = str((overlay or {}).get("proposition_id") or stable(
                "PROP", claim.get("chain_id"), rendered_proposition
            ))
            record = {
                "semantic_version": "2.0",
                "doctrine_version": authority["doctrine_version"],
                "contract_version": CONTRACT_VERSION,
                "contract_path": CONTRACT_PATH,
                "claim_id": str(claim.get("claim_id") or ""),
                "claim_instance_id": f"CI-{claim.get('claim_id')}-P{index:02d}",
                "original_claim_id": str(claim.get("claim_id") or ""),
                "proposition_id": proposition_id,
                "chain_id": str(claim.get("chain_id") or stable("CHAIN", claim.get("claim_id"))),
                "narrative_family_id": str(claim.get("chain_id") or stable("FAMILY", claim.get("claim_id"))),
                "actor": str(claim.get("claimant") or "Originator unresolved"),
                "claimant_type": claim.get("claimant_type"),
                "actor_role": actor_role,
                "claim": str(claim.get("exact_translated_claim") or rendered_proposition),
                "source_proposition": source_proposition,
                "proposition": rendered_proposition,
                "proposition_axis": proposition.get("axis"),
                "proposition_fidelity": (
                    str((overlay or {}).get("proposition_fidelity"))
                    if (overlay or {}).get("proposition_fidelity")
                    else "SOURCE_EQUIVALENT"
                ),
                "truth_adjudication": truth,
                "truth_qualifier": (overlay or {}).get("truth_qualifier"),
                "lifecycle_status": lifecycle_from(overlay, claim),
                "knowledge_judgment": knowledge,
                "combined_assessment": str(
                    (overlay or {}).get("combined")
                    or f"{truth.replace('_', ' ')} — KNOWLEDGE NOT ASSESSED"
                ),
                "denominator_class": denominator,
                "counts_as_unique_proposition": bool(
                    (overlay or {}).get("counts_unique")
                    or denominator == "UNIQUE_ATOMIC_PROPOSITION"
                ),
                "observed_facts": [
                    str(proposition.get("basis") or "").strip()
                ] if proposition.get("basis") else [],
                "analytic_inference": str(
                    (overlay or {}).get("comparative")
                    or proposition.get("basis")
                    or claim.get("analyst_note")
                    or "No separate ROOK knowledge inference has been supplied for this normalized legacy proposition."
                ),
                "knowledge_indicators": knowledge_indicators(overlay, evidence),
                "credible_alternatives": make_alt((overlay or {}).get("alt")),
                "comparative_assessment": str(
                    (overlay or {}).get("comparative")
                    or "No ROOK comparative knowledge inference supplied."
                ),
                "narrative_function": str(
                    (overlay or {}).get("narrative")
                    or "Legacy narrative function not separately reassessed."
                ),
                "confidence": confidence((overlay or {}).get("confidence") or proposition.get("confidence") or claim.get("confidence")),
                "falsifier": falsifiers(proposition, claim, overlay),
                "evidence_support": evidence,
                "source_ids": sorted({
                    claim_source,
                    *[ref for group in evidence.values() for ref in group],
                } - {""}),
                "statement_time": {
                    "date": claim.get("claim_date"),
                    "display_time": claim.get("source_display_timestamp"),
                    "precision": claim.get("timestamp_precision"),
                },
                "event_time": claim.get("claim_date"),
                "knowledge_time": claim.get("claim_date"),
                "assessment_time": "2026-09-09",
                "relation_type": relation_type,
                "parent_claim_instance_id": None,
                "parent_claim_id": claim.get("previous_claim_id"),
                "next_claim_id": claim.get("next_replacement_claim_id"),
                "legacy_semantics": {
                    "final_disposition": copy.deepcopy(claim.get("final_disposition") or []),
                    "taxonomy_tags": copy.deepcopy(claim.get("taxonomy_tags") or []),
                },
                "authority_status": "ROOK_ADJUDICATED" if overlay else "LEGACY_NORMALIZED_NOT_ROOK_REASSESSED",
            }
            blockers = publication_blockers_for_record(record, overlay, known_source_ids)
            record["publication_blockers"] = blockers
            record["publication_status"] = "BLOCKED_EVIDENCE_COMPLETION" if blockers else (
                "PUBLIC_READY" if overlay else "NOT_ROOK_REASSESSED"
            )
            records.append(record)

        for overlay in matched_overlays_for_claim(claim, overlays):
            for extra in overlay.get("extra_propositions") or []:
                records.append(extra_forensic_record(
                    claim, overlay, extra, authority, known_source_ids
                ))
    return records


def matched_overlays_for_claim(
    claim: dict[str, Any],
    overlays: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    claim_id = str(claim.get("claim_id") or "")
    return [item for item in overlays if item.get("original_claim_id") == claim_id]


def extra_forensic_record(
    claim: dict[str, Any],
    parent_overlay: dict[str, Any],
    extra: dict[str, Any],
    authority: dict[str, Any],
    known_source_ids: set[str],
) -> dict[str, Any]:
    evidence = component_refs(extra)
    proposition_id = str(extra["proposition_id"])
    knowledge = str(extra.get("knowledge") or "NOT_ASSESSED")
    record = {
        "semantic_version": "2.0",
        "doctrine_version": authority["doctrine_version"],
        "contract_version": CONTRACT_VERSION,
        "contract_path": CONTRACT_PATH,
        "claim_id": proposition_id,
        "claim_instance_id": f"CI-{proposition_id}",
        "original_claim_id": str(claim.get("claim_id") or ""),
        "proposition_id": proposition_id,
        "chain_id": str(claim.get("chain_id") or stable("CHAIN", claim.get("claim_id"))),
        "narrative_family_id": str(claim.get("chain_id") or stable("FAMILY", claim.get("claim_id"))),
        "actor": "Press TV" if "Press TV" in str(extra.get("proposition") or "") else str(claim.get("claimant") or "Publisher"),
        "claimant_type": "STATE_MEDIA" if "Press TV" in str(extra.get("proposition") or "") else claim.get("claimant_type"),
        "actor_role": "ORIGINATOR",
        "claim": str(extra.get("proposition") or ""),
        "source_proposition": str(extra.get("proposition") or ""),
        "proposition": str(extra.get("proposition") or ""),
        "proposition_axis": "PUBLISHER_FRAMING",
        "proposition_fidelity": "SOURCE_EQUIVALENT",
        "truth_adjudication": str(extra.get("truth") or "UNRESOLVED"),
        "truth_qualifier": extra.get("truth_qualifier"),
        "lifecycle_status": "ACTIVE",
        "knowledge_judgment": knowledge,
        "combined_assessment": str(extra.get("combined") or ""),
        "denominator_class": str(extra.get("denominator") or "CLAIM_INSTANCE"),
        "counts_as_unique_proposition": bool(extra.get("counts_unique")),
        "observed_facts": [],
        "analytic_inference": str(extra.get("comparative") or ""),
        "knowledge_indicators": knowledge_indicators(extra, evidence),
        "credible_alternatives": make_alt(extra.get("alt")),
        "comparative_assessment": str(extra.get("comparative") or ""),
        "narrative_function": str(extra.get("narrative") or ""),
        "confidence": confidence(extra.get("confidence")),
        "falsifier": falsifiers({}, claim, extra),
        "evidence_support": evidence,
        "source_ids": sorted({ref for group in evidence.values() for ref in group}),
        "statement_time": {
            "date": claim.get("claim_date"),
            "display_time": claim.get("source_display_timestamp"),
            "precision": claim.get("timestamp_precision"),
        },
        "event_time": claim.get("claim_date"),
        "knowledge_time": claim.get("claim_date"),
        "assessment_time": "2026-09-09",
        "relation_type": "ORIGINATION",
        "parent_claim_instance_id": None,
        "next_claim_id": None,
        "legacy_semantics": {"derived_from_original_claim_id": claim.get("claim_id")},
        "authority_status": "ROOK_ADJUDICATED",
    }
    blockers = publication_blockers_for_record(record, extra, known_source_ids)
    record["publication_blockers"] = blockers
    record["publication_status"] = "BLOCKED_EVIDENCE_COMPLETION" if blockers else "PUBLIC_READY"
    return record


def curated_source_groups(
    case: dict[str, Any],
    url_to_source: dict[str, str],
) -> tuple[dict[str, list[str]], list[str]]:
    groups = {key: [] for key in EVIDENCE_GROUPS}
    all_ids: list[str] = []
    for raw in case.get("sources") or []:
        if not isinstance(raw, list) or len(raw) < 2:
            continue
        label, url = str(raw[0] or ""), str(raw[1] or "")
        source_id = url_to_source.get(url)
        if not source_id:
            continue
        all_ids.append(source_id)
        lower = label.casefold()
        if "claim source" in lower or "irna" in lower and "claim" in lower or "press tv" in lower and "claim" in lower:
            groups["what_was_said"].append(source_id)
        else:
            groups["factual_baseline"].append(source_id)
            groups["contrary_evidence"].append(source_id)
    groups = {key: list(dict.fromkeys(values)) for key, values in groups.items()}
    return groups, list(dict.fromkeys(all_ids))


def curated_records(
    root: Path,
    authority: dict[str, Any],
    known_source_ids: set[str],
    url_to_source: dict[str, str],
) -> list[dict[str, Any]]:
    raw = load(root, CURATED_PATH)
    cases = {str(item.get("id")): item for item in raw.get("claims") or [] if item.get("id")}
    records = []
    for overlay in authority.get("curated_cases") or []:
        case_id = str(overlay.get("case_id") or "")
        case = cases.get(case_id)
        if not case:
            continue
        evidence, all_ids = curated_source_groups(case, url_to_source)
        if overlay.get("evidence"):
            explicit = component_refs(overlay)
            for group, refs in explicit.items():
                if refs:
                    evidence[group] = refs
        if overlay.get("knowledge") in STRONG_KNOWLEDGE and evidence["what_was_said"] and not evidence["knowledge_access"]:
            # This is evidence-access representation, not a new mental-state inference:
            # the claim-origin source identifies the institution/speaker and the subject matter.
            evidence["knowledge_access"] = copy.deepcopy(evidence["what_was_said"])
        truth = str(overlay.get("truth") or factual_status(case.get("verdict")))
        knowledge = str(overlay.get("knowledge") or "NOT_ASSESSED")
        denominator = str(overlay.get("denominator") or "NON_ACCUSATION_CONTEXT")
        record = {
            "semantic_version": "2.0",
            "doctrine_version": authority["doctrine_version"],
            "contract_version": CONTRACT_VERSION,
            "contract_path": CONTRACT_PATH,
            "claim_id": case_id,
            "claim_instance_id": f"CI-{case_id}",
            "original_claim_id": case_id,
            "proposition_id": stable("PROP", case_id, case.get("claim")),
            "chain_id": f"CHAIN-{case_id}",
            "narrative_family_id": f"FAMILY-{case_id}",
            "actor": str(case.get("claimant") or "Originator identified in claim text / source"),
            "claimant_type": None,
            "actor_role": "ORIGINATOR",
            "claim": str(case.get("claim") or case.get("name") or ""),
            "source_proposition": str(case.get("claim") or ""),
            "proposition": str(case.get("claim") or ""),
            "proposition_axis": "CURATED_CASE",
            "proposition_fidelity": "SOURCE_EQUIVALENT",
            "truth_adjudication": truth,
            "truth_qualifier": overlay.get("truth_qualifier"),
            "lifecycle_status": "ACTIVE",
            "knowledge_judgment": knowledge,
            "combined_assessment": str(overlay.get("combined") or truth),
            "denominator_class": denominator,
            "counts_as_unique_proposition": denominator == "UNIQUE_ATOMIC_PROPOSITION",
            "observed_facts": [str(case.get("finding") or "")] if case.get("finding") else [],
            "analytic_inference": str(overlay.get("comparative") or case.get("finding") or ""),
            "knowledge_indicators": knowledge_indicators(overlay, evidence),
            "credible_alternatives": make_alt(overlay.get("alt")),
            "comparative_assessment": str(overlay.get("comparative") or "No separate ROOK comparative inference supplied."),
            "narrative_function": str(overlay.get("narrative") or ""),
            "confidence": confidence(overlay.get("confidence")),
            "falsifier": [str(x) for x in overlay.get("falsifier") or []] if isinstance(overlay.get("falsifier"), list) else (
                [str(overlay["falsifier"])] if overlay.get("falsifier") else []
            ),
            "evidence_support": evidence,
            "source_ids": sorted(set(all_ids) | {ref for group in evidence.values() for ref in group}),
            "statement_time": {"date": case.get("date"), "display_time": None, "precision": "DATE_OR_RANGE"},
            "event_time": case.get("date"),
            "knowledge_time": case.get("date"),
            "assessment_time": "2026-09-09",
            "relation_type": "ORIGINATION",
            "parent_claim_instance_id": None,
            "next_claim_id": None,
            "legacy_semantics": {
                "legacy_verdict": case.get("verdict"),
                "legacy_finding": case.get("finding"),
            },
            "authority_status": "ROOK_ADJUDICATED",
        }
        blockers = publication_blockers_for_record(record, overlay, known_source_ids)
        if overlay.get("publication_note"):
            record["publication_note"] = str(overlay["publication_note"])
        record["publication_blockers"] = blockers
        record["publication_status"] = "BLOCKED_EVIDENCE_COMPLETION" if blockers else "PUBLIC_READY"
        records.append(record)
    return records


def current_claim_records(
    state: dict[str, Any],
    authority: dict[str, Any],
    known_source_ids: set[str],
) -> list[dict[str, Any]]:
    legacy = {}
    for item in (state.get("entities") or {}).get("narrative_claims") or []:
        record = unwrap(item)
        claim_id = str(record.get("claim_id") or "")
        if claim_id:
            legacy[claim_id] = record
    records = []
    for claim_id, overlay in (authority.get("current_claims") or {}).items():
        source = legacy.get(claim_id)
        if not source:
            continue
        evidence = {key: [] for key in EVIDENCE_GROUPS}
        evidence["what_was_said"] = list(dict.fromkeys(source.get("source_ids") or []))
        evidence["factual_baseline"] = list(dict.fromkeys(source.get("source_ids") or []))
        truth = str(overlay.get("truth") or factual_status(source.get("truth_adjudication")))
        knowledge = str(overlay.get("knowledge") or "NOT_ASSESSED")
        denominator = str(overlay.get("denominator") or "NON_ACCUSATION_CONTEXT")
        record = {
            "semantic_version": "2.0",
            "doctrine_version": authority["doctrine_version"],
            "contract_version": CONTRACT_VERSION,
            "contract_path": CONTRACT_PATH,
            "claim_id": claim_id,
            "claim_instance_id": f"CI-{claim_id}",
            "original_claim_id": claim_id,
            "proposition_id": str(source.get("proposition_id") or stable("PROP", claim_id, source.get("proposition") or source.get("claim"))),
            "chain_id": str(source.get("chain_id") or f"CHAIN-{claim_id}"),
            "narrative_family_id": str(source.get("chain_id") or f"FAMILY-{claim_id}"),
            "actor": str(source.get("actor") or "Originator unresolved"),
            "claimant_type": source.get("claimant_type"),
            "actor_role": "ORIGINATOR",
            "claim": str(source.get("claim") or source.get("proposition") or ""),
            "source_proposition": str(source.get("proposition") or source.get("claim") or ""),
            "proposition": str(source.get("proposition") or source.get("claim") or ""),
            "proposition_axis": source.get("proposition_axis"),
            "proposition_fidelity": str(source.get("proposition_fidelity") or "SOURCE_EQUIVALENT"),
            "truth_adjudication": truth,
            "truth_qualifier": overlay.get("truth_qualifier"),
            "lifecycle_status": "ACTIVE",
            "knowledge_judgment": knowledge,
            "combined_assessment": str(overlay.get("combined") or truth),
            "denominator_class": denominator,
            "counts_as_unique_proposition": denominator == "UNIQUE_ATOMIC_PROPOSITION",
            "observed_facts": copy.deepcopy(source.get("observed_facts") or []),
            "analytic_inference": str(source.get("analytic_inference") or "No additional inference supplied."),
            "knowledge_indicators": [],
            "credible_alternatives": make_alt(overlay.get("alt")),
            "comparative_assessment": str(overlay.get("comparative") or "No separate ROOK comparative inference supplied."),
            "narrative_function": str(overlay.get("narrative") or source.get("narrative_function") or ""),
            "confidence": confidence(overlay.get("confidence") or source.get("confidence")),
            "falsifier": (
                [str(source.get("falsifier") or source.get("what_would_change_rating"))]
                if isinstance(source.get("falsifier") or source.get("what_would_change_rating"), str)
                else copy.deepcopy(source.get("falsifier") or source.get("what_would_change_rating") or [])
            ),
            "evidence_support": evidence,
            "source_ids": sorted(set(source.get("source_ids") or [])),
            "statement_time": {"date": source.get("event_time"), "display_time": None, "precision": None},
            "event_time": source.get("event_time"),
            "knowledge_time": source.get("knowledge_time"),
            "assessment_time": "2026-09-09",
            "relation_type": str(source.get("relation_type") or "STANDALONE"),
            "parent_claim_instance_id": None,
            "next_claim_id": None,
            "legacy_semantics": copy.deepcopy(source.get("legacy_semantics") or {
                "truth_adjudication": source.get("truth_adjudication"),
                "deception_score": source.get("deception_score"),
                "deception_basis": source.get("deception_basis"),
                "knowledge_access": source.get("knowledge_access"),
            }),
            "authority_status": "ROOK_ADJUDICATED",
        }
        blockers = publication_blockers_for_record(record, overlay, known_source_ids)
        record["publication_blockers"] = blockers
        record["publication_status"] = "BLOCKED_EVIDENCE_COMPLETION" if blockers else "PUBLIC_READY"
        records.append(record)
    return records


def add_authority_blockers(
    blockers: list[dict[str, Any]],
    authority: dict[str, Any],
) -> None:
    existing = {item.get("blocker_id") for item in blockers}
    for item in authority.get("publication_blockers") or []:
        blocker_id = str(item.get("id") or stable("BLOCK", item.get("ruling")))
        if blocker_id in existing:
            continue
        blockers.append({
            "blocker_id": blocker_id,
            "code": str(item.get("code") or "EVIDENCE_COMPLETION_REQUIRED"),
            "ruling": str(item.get("ruling") or ""),
            "deficiency": str(item.get("deficiency") or ""),
            "authority": "ROOK",
            "status": "OPEN",
        })
        existing.add(blocker_id)


def build_chains(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[str(record["chain_id"])].append(record)
    chains = []
    for chain_id, rows in sorted(grouped.items()):
        rows = sorted(rows, key=lambda row: (
            str((row.get("statement_time") or {}).get("date") or ""),
            str((row.get("statement_time") or {}).get("display_time") or ""),
            str(row.get("claim_instance_id") or ""),
        ))
        chains.append({
            "semantic_version": "2.0",
            "doctrine_version": rows[0]["doctrine_version"],
            "chain_id": chain_id,
            "narrative_family_id": rows[0].get("narrative_family_id"),
            "primary_object": "NARRATIVE_PROPOSITION_CHAIN",
            "claimants": sorted({row.get("actor") for row in rows if row.get("actor")}),
            "claim_instance_ids": [row["claim_instance_id"] for row in rows],
            "proposition_ids": sorted({row["proposition_id"] for row in rows}),
            "chronology": [{
                "claim_instance_id": row["claim_instance_id"],
                "statement_time": copy.deepcopy(row.get("statement_time")),
                "relation_type": row.get("relation_type"),
                "actor_role": row.get("actor_role"),
                "truth_adjudication": row.get("truth_adjudication"),
                "knowledge_judgment": row.get("knowledge_judgment"),
                "combined_assessment": row.get("combined_assessment"),
                "publication_status": row.get("publication_status"),
            } for row in rows],
            "proposition_records": copy.deepcopy(rows),
            "publication_blockers": [
                {"claim_instance_id": row["claim_instance_id"], **blocker}
                for row in rows
                for blocker in row.get("publication_blockers") or []
            ],
        })
    return chains


def metrics(records: list[dict[str, Any]], chains: list[dict[str, Any]]) -> dict[str, Any]:
    factual = Counter()
    knowledge = Counter()
    originations = amplifications = corrections = retractions = substitutions = media = 0
    unique_ids: set[str] = set()
    claim_instances = 0

    for record in records:
        if record.get("authority_status") != "ROOK_ADJUDICATED":
            continue
        claim_instances += 1
        factual[record["truth_adjudication"]] += 1
        knowledge[record["knowledge_judgment"]] += 1
        relation = record.get("relation_type")
        if relation in {"ORIGINATION", "STANDALONE"}:
            originations += 1
        elif relation in {"REPETITION", "AMPLIFICATION"}:
            amplifications += 1
        elif relation == "CORRECTION":
            corrections += 1
        elif relation == "RETRACTION":
            retractions += 1
        elif relation == "NARRATIVE_SUBSTITUTION":
            substitutions += 1
        if record.get("denominator_class") == "MEDIA_ARTIFACT":
            media += 1
        if record.get("counts_as_unique_proposition"):
            unique_ids.add(str(record["proposition_id"]))

    falsy_unique = {
        record["proposition_id"]
        for record in records
        if record.get("authority_status") == "ROOK_ADJUDICATED"
        and record.get("counts_as_unique_proposition")
        and record.get("truth_adjudication") in FALSY
    }
    resolved_unique = {
        record["proposition_id"]
        for record in records
        if record.get("authority_status") == "ROOK_ADJUDICATED"
        and record.get("counts_as_unique_proposition")
        and record.get("truth_adjudication") != "UNRESOLVED"
    }
    percentage = None
    if resolved_unique:
        percentage = round(100.0 * len(falsy_unique) / len(resolved_unique), 2)

    return {
        "unique_propositions": len(unique_ids),
        "claim_instances": claim_instances,
        "originations": originations,
        "amplifications": amplifications,
        "corrections": corrections,
        "retractions": retractions,
        "narrative_substitutions": substitutions,
        "media_artifacts": media,
        "narrative_chains": len(chains),
        "factual_status_totals": dict(sorted(factual.items())),
        "knowledge_assessment_totals": dict(sorted(knowledge.items())),
        "percentages": {
            "falsy_share_of_resolved_unique_propositions": {
                "numerator": len(falsy_unique),
                "denominator": len(resolved_unique),
                "percentage": percentage,
                "numerator_definition": "Unique ROOK-adjudicated propositions classified FALSE or MISLEADING.",
                "denominator_definition": "Unique ROOK-adjudicated propositions with a resolved factual status; UNRESOLVED excluded.",
            }
        },
    }


def wrap(entity_id: str, record: dict[str, Any]) -> dict[str, Any]:
    return {
        "entity_id": entity_id,
        "record": record,
        "source_ids": sorted(set(record.get("source_ids") or [])),
        "provenance": [{
            "kind": "LIE_LEDGER_V2_FORWARD_SEMANTIC_MIGRATION",
            "authority_path": AUTHORITY_PATH,
            "contract_path": CONTRACT_PATH,
        }],
    }


def apply(state: dict[str, Any], root: Path = ROOT) -> dict[str, Any]:
    root = Path(root).resolve()
    authority = load(root, AUTHORITY_PATH)
    if authority.get("authority") != "ROOK":
        raise ValueError("Lie Ledger v2 authority overlay must be ROOK-owned")
    known_source_ids, url_to_source = source_catalog(state)

    records = forensic_records(root, authority, known_source_ids)
    records.extend(curated_records(root, authority, known_source_ids, url_to_source))
    records.extend(current_claim_records(state, authority, known_source_ids))

    # De-duplicate exact claim-instance identities. ROOK overlays can generate an
    # additional publisher proposition without rewriting the source-speaker proposition.
    deduped: dict[str, dict[str, Any]] = {}
    for record in records:
        key = str(record["claim_instance_id"])
        if key in deduped:
            prior = deduped[key]
            if prior["proposition"] != record["proposition"]:
                key = f"{key}-{stable('VAR', record['proposition'])}"
                record["claim_instance_id"] = key
        deduped[key] = record
    records = list(deduped.values())

    chains = build_chains(records)
    ledger_metrics = metrics(records, chains)

    global_blockers: list[dict[str, Any]] = []
    add_authority_blockers(global_blockers, authority)
    for record in records:
        for blocker in record.get("publication_blockers") or []:
            global_blockers.append({
                "blocker_id": stable("BLOCK", record["claim_instance_id"], blocker.get("code"), blocker.get("deficiency")),
                "code": blocker.get("code"),
                "ruling": record.get("combined_assessment"),
                "deficiency": blocker.get("deficiency"),
                "claim_instance_id": record["claim_instance_id"],
                "authority": "PR/CI",
                "status": "OPEN",
            })

    entities = state.setdefault("entities", {})
    entities["lie_ledger_v2"] = [wrap(record["claim_instance_id"], record) for record in records]
    entities["lie_ledger_chains_v2"] = [
        wrap(chain["chain_id"], {**chain, "source_ids": sorted({
            source_id
            for proposition in chain["proposition_records"]
            for source_id in proposition.get("source_ids") or []
        })})
        for chain in chains
    ]
    state["lie_ledger_v2_metrics"] = ledger_metrics
    state["lie_ledger_v2_publication_blockers"] = global_blockers
    state["lie_ledger_v2_authority"] = {
        "semantic_version": "2.0",
        "doctrine_version": authority["doctrine_version"],
        "contract_version": CONTRACT_VERSION,
        "contract_path": CONTRACT_PATH,
        "authority_path": AUTHORITY_PATH,
        "verdict_authority": "ROOK",
        "implementation_authority": "PR/CI",
        "legacy_input_preserved": True,
        "builders_may_manufacture_rook_judgments": False,
    }
    state.setdefault("release", {})["lie_ledger_doctrine_version"] = authority["doctrine_version"]
    state["release"]["lie_ledger_contract_version"] = CONTRACT_VERSION
    state["release"]["lie_ledger_contract_path"] = CONTRACT_PATH
    state.setdefault("counts", {}).update({
        "lie_ledger_v2_records": len(records),
        "lie_ledger_v2_chains": len(chains),
        "lie_ledger_v2_unique_propositions": ledger_metrics["unique_propositions"],
        "lie_ledger_v2_claim_instances": ledger_metrics["claim_instances"],
        "lie_ledger_v2_publication_blockers": len(global_blockers),
    })
    state.setdefault("integrity", {}).update({
        "lie_ledger_v1_preserved_as_provenance": True,
        "lie_ledger_v2_forward_migration_active": True,
        "lie_ledger_truth_knowledge_axes_separate": True,
        "lie_ledger_builder_manufactures_rook_judgments": False,
        "lie_ledger_component_evidence_refs_active": True,
        "lie_ledger_publication_blockers_open": bool(global_blockers),
    })
    return state
