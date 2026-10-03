# The 2026 Iran War Guide — Facelift / IA Migration Contract

**Status:** APPROVED PLANNING CONTRACT  
**Effective:** 2026-10-02  
**Scope:** public visual system, information architecture, navigation, responsive composition, and limited reader interaction only  
**Internal project/system name:** ATLAS / ISR may remain in repository and engineering internals.  
**Public product name:** **The 2026 Iran War Guide**

## 1. Purpose

This work is a public-product facelift and information-architecture migration.

It is **not** an evidentiary rewrite, analytical reset, methodology change, sourcing change, adjudication change, or mission change.

The core purpose remains unchanged: provide a public, source-linked record of the 2026 Iran war that lets a reader understand what happened, where it stands, what the evidence supports, and how to inspect the underlying record.

The approved visual reference is the Sanctions & Impact mockup/design direction. The goal is not to clone that exact layout on every page. The goal is for every public page to look and behave as though it belongs to the same product.

## 2. Absolute evidence boundary

The facelift team has **zero authority** to alter accepted evidence or analytical meaning.

During this migration, Public Product / UX / IA / renderer work MUST NOT change:

- accepted source material or source associations;
- URLs, dates, quotations, attribution, chronology, or provenance;
- claim meaning;
- finding language;
- adjudications;
- evidence-to-claim relationships;
- objective interpretation or accepted outcome status;
- event identity;
- accepted canonical state;
- accepted evidence packet bytes or hashes;
- Lie Ledger semantics;
- Web of Lies findings;
- loss, casualty, BDA, facility, economic, sanctions, agreement, or other accepted analytical records.

If a presentation requirement appears to require a factual rewrite, inference, correction, or re-adjudication, the work stops at that boundary and is routed to the appropriate evidence/adjudication lane.

**Migration invariant:** a reader following an evidentiary relationship before the facelift must be able to follow the same relationship after the facelift and arrive at the same factual material.

## 3. Rook / Evidence Locker continuity is protected

The existing routine evidence pipeline remains controlling and must continue **during and after** the facelift:

**ROOK collects and appends → Evidence adjudicates → Public Product explains → Release qualifies and deploys.**

The facelift must not modify, suspend, replace, intercept, or depend on changes to the upstream Evidence Locker collection lane.

Protected pipeline behavior includes:

- append-only ROOK evidence-locker intake;
- approximately 12-hour collection windows as currently operated;
- `ROOK_FULL_EVIDENCE_LOCKER_SWEEP` intake;
- source-registry and source-discovery deltas;
- `scripts/rook_intake_status.py` continuity/consumption validation;
- accepted canonical packet consumption provenance;
- deterministic public-state generation from accepted canonical state;
- release qualification and deployment integrity.

The current update pipeline is deliberately separate from Public Product presentation. Visual migration must remain downstream of accepted evidence.

Relevant controlling operational doctrine remains `docs/ROUTINE_UPDATE_PIPELINE.md`.

## 4. Public identity

The public-facing product name is:

# The 2026 Iran War Guide

"ATLAS", repository terminology, engineering lane names, schema terminology, Git terminology, branch/commit notation, CI notation, internal packet IDs, and other implementation language must not appear as normal reader-facing product furniture.

Internal naming may remain unchanged where changing it would create engineering risk or unnecessary migration work.

Public-facing navigation, headings, metadata, and identity should use **The 2026 Iran War Guide** unless a narrower page title is more appropriate.

## 5. Visual system

The Sanctions & Impact mockup/design direction is the visual north star for:

- typography;
- spacing;
- information density;
- surface/card treatment;
- hierarchy;
- semantic status color;
- timelines;
- causal/explanatory diagrams;
- evidence-link treatment;
- responsive behavior;
- charts and map framing;
- plain-English section naming.

The site should share a recognizable visual grammar without forcing every page into the same composition.

Avoid "card soup": primary analytical panels, summary cards, and tertiary detail cards must retain different visual weight.

## 6. Required visual/content preservation

The following existing public visual/data systems are explicitly preserved:

- **existing economic charts**;
- **existing map points**;
- **existing route lines / route geometry**;
- **SVG country flags**;
- all existing public pages/content domains, though they may be regrouped or reordered;
- all existing evidentiary deep relationships and source access.

A component may receive a new frame, layout, responsive wrapper, legend treatment, typography, or interaction shell without changing the underlying data or analytical meaning.

Do not replace an existing requested chart, point set, route set, or flag system merely because another visualization is aesthetically preferable.

## 7. Responsive composition

### Desktop / large screens

The public reader becomes elastic.

Use available viewport width intelligently for maps, charts, timelines, diagrams, comparisons, and multi-column analytical layouts while keeping prose at a readable line length.

The design should scale materially across normal desktop, large desktop, and ultrawide screens rather than presenting the same narrow fixed-width canvas everywhere.

### Mobile

Mobile must **recompose**, not merely shrink.

Approved behavior includes:

- four-up summaries becoming vertical or 2×2 arrangements;
- two-column sections becoming ordered vertical sections;
- causal chains transforming from horizontal to vertical where appropriate;
- timelines using controlled horizontal scrolling where clearer;
- evidence and findings remaining visible without interaction traps;
- contextual navigation remaining discoverable.

Information priority must survive breakpoint changes.

## 8. Loading / first presentation

The current reader-facing loading presentation is to be retired as part of the facelift.

Target behavior:

- the stable Guide shell/navigation/page frame is the first meaningful paint;
- the product itself should not appear to sit behind a theatrical loading screen;
- delayed datasets, where unavoidable, may show restrained local skeleton/loading states inside their final layout bounds;
- removing the visible loader must not weaken release-manifest validation, deterministic release identity, security checks, or fail-closed release behavior.

This is a presentation change, not permission to bypass the current release/bootstrap integrity model. Renderer/release engineering must determine the safe implementation.

## 9. Navigation / information architecture

The target public navigation uses a clean two-level model.

### Primary navigation

Top-level domains remain concise, for example:

**Home | Regions | Themes | Intelligence | Data | Sources**

Exact labels/order are owned by the IA engineer after inventorying all current routes.

### Contextual/subsection navigation

The selected domain receives a thinner contextual bar directly below the main navigation.

That bar may contain:

- major child pages;
- same-page section anchors;
- collection views;
- entity/dossier links.

Long main pages remain vertically scrollable. Contextual navigation should let a user jump directly to a section without requiring them to reach a bottom-of-page navigation block.

Mobile contextual navigation may use a horizontally scrollable strip or another equally discoverable compact pattern. Do not hide ordinary subsection discovery unnecessarily.

## 10. Page model

The IA engineer should map all current public pages into a small number of reusable page archetypes rather than design every route independently.

Expected archetypes include:

1. overview / current-state page;
2. explanatory analysis page;
3. collection / index page;
4. entity / dossier page;
5. evidence / forensics page;
6. map / data-heavy page.

A common explanatory grammar should be used where appropriate:

**present condition → key findings → what it means → how/why → what changed → evidence → what to watch**

This is a presentation grammar, not permission to alter accepted wording.

## 11. WOL entity dossiers

The Web of Lies should support both an aggregate collection and durable actor-specific dossier pages.

The main WOL page remains the collection/aggregate view.

Major tracked speakers/actors may receive dedicated pages containing their existing accepted material, such as:

- current record;
- claim chronology;
- claim families/themes;
- findings;
- related evidence;
- relationship/network views;
- related Lie Ledger material;
- source access.

The migration may regroup the existing material but may not rewrite findings, claim meaning, adjudications, counts, or evidence associations.

Dedicated pages must support durable direct links for debate/reference use.

## 12. Lie Ledger claim dossiers

The Lie Ledger remains an aggregate collection/index.

Major accepted cases/claim chains may receive dedicated durable claim pages.

A claim dossier may visually organize the existing record as:

**claim → finding → evidence → chronology → related claims/material → sources**

The dedicated page must not create a second adjudication or public paraphrase that changes the accepted finding.

Durable deep links are a first-class requirement.

## 13. Sources and Methodology

Internal engineering/process material should be consolidated away from ordinary public navigation.

The public-facing destination should be organized around **Sources**, with IA optimized for low reader friction.

Expected structure:

- **Sources** — source registry/list and reader-facing source information;
- **Methodology** — concise plain-English explanation of sourcing, media validation, evidentiary testing, claim adjudication, uncertainty, corrections, and related methods.

The IA engineer may determine whether these are sibling pages, a parent/child hierarchy, or another low-friction structure after route inventory.

Claims Forensics, Lie Ledger, WOL, or other findings may link directly to the relevant Methodology section using a restrained **Methodology** / **How this was assessed** link.

Methodology must be readily available from the evidence it explains but must not stand between the reader and the evidence.

No public-facing Git/ATLAS engineering notation should be exposed as part of this explanation.

## 14. Deep-linking requirement

Durable links/anchors should be available wherever practical for:

- major sections;
- claims;
- WOL actor dossiers;
- Lie Ledger cases;
- events;
- objectives;
- evidence records;
- charts/visual states where appropriate;
- methodology sections.

The product should support the real reader workflow: "Here is the exact evidence/finding I mean."

## 15. Engineer roles for this migration

### A. UX/UI Systems Engineer

Owns:

- visual language;
- design tokens;
- typography;
- surfaces;
- card hierarchy;
- spacing;
- semantic colors;
- chart/map framing;
- flag presentation;
- accessible visual states;
- desktop/mobile visual behavior.

Does not own evidence or adjudication.

### B. Information Architecture / Navigation Engineer

Owns:

- route inventory;
- page hierarchy;
- primary/secondary navigation;
- breadcrumbs;
- anchors;
- parent/child relationships;
- WOL actor dossier structure;
- Lie Ledger dossier structure;
- Sources/Methodology organization;
- deep linking;
- minimizing navigation dead ends.

Moves references and presentation structure, never evidentiary meaning.

### C. Responsive Renderer / Migration Engineer

Owns:

- implementation of the approved visual system and IA;
- elastic desktop behavior;
- mobile recomposition;
- component migration;
- public shell;
- first meaningful paint;
- loading-presentation retirement;
- preserving release/bootstrap integrity.

Does not own evidence or adjudication.

## 16. Implementation order

1. inventory all current public routes and public components;
2. define design tokens and shared visual system;
3. define page archetypes;
4. define desktop/tablet/mobile transformations;
5. define new primary/contextual navigation and route relationships;
6. establish the new Guide shell/identity;
7. safely retire the current reader-facing loading presentation while preserving release integrity;
8. migrate representative pages first:
   - Sanctions & Impact / financial analysis;
   - WOL;
   - Lie Ledger;
   - one regional/current-state page;
   - one map-heavy page;
9. validate the archetypes;
10. migrate remaining pages;
11. perform evidence-link parity, responsive, accessibility, map, chart, and release qualification before production cutover.

## 17. Acceptance gates

A facelift change is not complete unless all applicable conditions hold:

- accepted factual content is unchanged unless separately changed by its owning evidence lane;
- evidence/source associations remain intact;
- Rook intake and Evidence Locker validation still pass;
- canonical authority validation still passes;
- existing economic charts remain present and functional;
- map points remain present;
- route lines/geometry remain present;
- SVG flags remain present;
- old public routes have a deliberate retained route or redirect/relationship;
- deep links work;
- desktop is elastic;
- mobile recomposes without losing material information;
- no ordinary public UI exposes repository/Git/CI/engineer/schema/internal ATLAS notation;
- public Sources/Methodology remains accessible without interrupting normal evidence reading;
- release qualification, deterministic build, Pages deployment, and live-byte attestation remain intact.

## 18. What does not change

This facelift does **not** change:

- sourcing philosophy;
- evidentiary standards;
- claim-testing methodology;
- actor-neutral adjudication standard;
- accepted wording;
- accepted findings;
- corrections doctrine;
- canonical data ownership;
- Rook collection role;
- Evidence Integration role;
- Information Claims & Forensic Adjudication role;
- release integrity model;
- the project's core mindset or purpose.

The public product changes how the record is **read**, not how the record becomes **true**.
