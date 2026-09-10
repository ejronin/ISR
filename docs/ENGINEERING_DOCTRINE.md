# ATLAS ISR — Engineering Doctrine Bootstrap

**Status:** CONTROLLING ENGINEERING GOVERNANCE UNTIL REPLACED BY THE LEAD PUBLIC PRODUCT ENGINEER  
**Effective:** 2026-09-10  
**Purpose:** Remove prior engineer/persona authority structures as binding project law and give the Lead Public Product Engineer authority to rebuild the engineering organization around the product.

## 1. This document supersedes prior engineering-authority doctrine

Any repository document, prompt, test, schema, builder, validator, workflow, generated artifact, or internal note that assigns controlling factual, editorial, semantic, publication, or analytical authority to ROOK, PR/CI, UX/UI, Atlas, or another engineer/persona is **non-binding implementation history** unless the Lead Public Product Engineer expressly re-adopts it in the successor doctrine.

This includes prior language such as:

- "ROOK decides what Atlas analytically concludes";
- "ROOK is the analytical authority";
- PR/CI or UX/UI authority splits over substantive propositions;
- frozen semantic wording contracts;
- renderer requirements that expose internal adjudication machinery;
- lane restrictions that prevent the lead from changing tests, schemas, builders, workflows, prompts, or documentation needed to repair the product.

If an old file conflicts with this document or with the lead's later successor doctrine, the old file loses.

## 2. The lead may redesign the system

The Lead Public Product Engineer may inspect, retain, replace, retire, rewrite, reorganize, or supersede any existing Atlas engineering artifact necessary to restore the intended public product.

That authority includes, without limitation:

- engineering lanes and role boundaries;
- internal doctrine and prompts;
- public information architecture;
- renderers and components;
- schemas and read models;
- builders and synchronization scripts;
- validators and CI expectations;
- tests that freeze obsolete wording or obsolete ownership models;
- internal ROOK/PR-CI authority overlays;
- update workflows and release handoffs.

Existing implementation is evidence of how the project currently works, not a veto over how it should work.

## 3. What remains non-negotiable

The lead's reorganization may not corrupt the underlying evidentiary record.

Preserve useful source material, dates, chronology, claim history, corrections, factual records, provenance, and historical evidence unless there is a documented evidentiary reason to correct them.

No engineer or persona owns reality. Factual conclusions must remain grounded in evidence.

The public product must not expose internal engineering or analytical process merely because that process exists in the backend. Internal provenance is not automatically reader-facing provenance.

## 4. Lead-authored successor doctrine

The Lead Public Product Engineer is expected to replace this bootstrap with a durable project doctrine and lane registry once the repair architecture is understood.

The successor doctrine is the single fallback reference for future engineers.

For each engineer lane, the lead should define the lane in operational terms using these headings or clear equivalents:

- **ALWAYS** — invariants the lane must preserve;
- **DO** — normal responsibilities and expected actions;
- **NEVER / DON'T** — prohibited actions and ownership boundaries;
- **SOMETIMES** — discretionary actions the lane may take when useful;
- **IF** — conditions that change the lane's behavior or require escalation;
- **WHEN** — timing, handoff, review, and release conditions.

The lead decides the number of lanes, their names, their sequencing, their ownership fences, and which engineering style/persona is best suited to each.

Future engineers should start from the lead's doctrine and their assigned lane definition rather than reconstructing authority from old PRs, old prompts, superseded contracts, or historical CI expectations.

## 5. Conflict rule

If an engineer encounters a contradiction among old repository artifacts, do not arbitrate by document age, previous PR authority, persona, or test rigidity.

Use this order:

1. current Lead Public Product Engineer doctrine;
2. current lane definition;
3. current verified evidence and canonical data;
4. current implementation details;
5. historical/superseded documents only for context.

If the lead has not yet resolved the conflict, escalate it to the lead rather than inventing a new authority split.

## 6. No compatibility theater

Do not preserve a defective authority model merely because existing CI enforces it.

If an old test, validator, schema constant, workflow, or builder encodes a superseded rule, the lead may change the rule and change the enforcement together.

The objective is not to make the repaired product conform to obsolete controls. The objective is to make the controls conform to the repaired product while preserving evidentiary integrity.

## 7. Public/internal boundary

Public Atlas should explain the war and the supporting evidence.

Internal engineering may retain deeper analytical, forensic, provenance, and adjudication machinery where useful.

Those internal structures are not public content by default.

## 8. Transition

Until the Lead Public Product Engineer publishes the successor doctrine and lane registry, this document is the controlling engineering-governance reference.

Once the successor doctrine is committed, it should explicitly state that it replaces this bootstrap and all earlier authority contracts.
