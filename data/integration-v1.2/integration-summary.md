# ISR Atlas Integration Summary — Revision 1.2

**Collection cutoff:** 2026-08-22 13:59 America/New_York  
**Revision 1.2 package built:** 2026-08-20 17:01 America/New_York  
**Repository reviewed:** `ejronin/ISR` (`main`, previously reconciled at `8cd97cf409b56060a1806ccf52fe9850e883df79`)  
**Publishing:** none. No GitHub changes were made.

<!-- AUTO_COUNTS:events=98;prewar_events=15;wartime_events=83;timeline_records=98;daily_coverage_days=176;facilities_integrated=5;repo_facilities_to_preserve=18;claims=6;movements=10;agreements=8;casualty_records=23;material_loss_records=12;munition_expenditure_records=9;shipping_records=13;economic_backfill_records=9;diplomacy_records=28;sources=150;unresolved_items=19;collection_requests=19;bda_overlay_candidates=13;revision_records=24 -->

## Aug. 22 canonical append-only advancement

The canonical factual chronology is advanced through **2026-08-22 13:59 ET** by an append-only update. The original Revision 1.2 Aug. 20 records remain lineage-locked; new facts are appended, later corrections/count conflicts are linked rather than overwritten, and older chronology is not rewritten with later knowledge.

The five-level outcome synthesis remains reviewed through **2026-08-20 15:59 ET** unless separately re-reviewed. The MOU/Hormuz analytical prose remains reviewed through **2026-08-22 10:54 ET**. Those analytical cutoffs are intentionally independent of the newer canonical evidence cutoff.


## Bottom line

Revision 1.2 is a consistency repair of the final integration package, **not a new OSINT collection**. The final JSON record set remains authoritative. This revision preserves the revision-1.1 drawdown/agreement/alignment work, normalizes force-posture metadata, and regenerates the human-readable handoff against the actual JSON.

The package keeps the evidence doctrine already established: source lineage matters; damage is not automatically incapacity; subfacility loss is not whole-base loss; launches are expenditures even when intercepted; casualty categories are compared like-for-like; wider economic effects are not added to direct military cost; unresolved values remain unresolved; quiet-day collection markers are not facts of inactivity; and no combined sports-style war score is canonical.

## Authoritative record counts

- **98 events:** **15 pre-war** context records and **83 wartime** records.
- **98** timeline records and **174** calendar-day coverage markers.
- **5** integrated facility records, plus **18** existing repo facility identities explicitly preserved.
- **6** full claim case files.
- **10** force-posture movement records.
- **8** agreement/security-mechanism records.
- **28** diplomacy records.
- **23** normalized casualty records/components/snapshots.
- **12** material-loss/damage records.
- **9** munitions-expenditure records.
- **13** shipping observations.
- **9** backfill economic records, with existing forecast context preserved separately.
- **150** canonical sources.
- **19** unresolved gaps and **19** targeted collection requests.
- **13** BDA overlay candidates/records.
- **24** revision-history records.

## Force-posture classification rule

A drawdown, rotation, redeployment, or withdrawal whose governing decision, bilateral agreement, implementation schedule, or formal execution plan was established **before the Iran war began on February 28, 2026** is classified by its documented force-posture type. It is **not** relabeled as a retreat merely because some execution occurred during the war.

For every such movement, `movements.json` now carries normalized fields for host country, governments/parties, discussion/origin date, agreement/formalization dates where known, implementation-schedule date where known, planned execution window, actual execution date, Iran-war start date, later war-change evidence, and subsequent broader force-posture activity. Unknown dates remain null or explicitly approximate.

The causal language is explicit where supported:

> The drawdown was negotiated and scheduled before the Iran war. The movement is therefore classified as a pre-coordinated drawdown, not a retreat.

> No reviewed evidence shows Iranian wartime pressure originated the decision.

If later evidence shows the war accelerated, expanded, delayed, or otherwise changed a pre-existing plan, that change is recorded separately rather than rewriting the origin of the plan.

### Iraq

The U.S.–Iraq transition chain remains first-class evidence: **August 8, 2023 HMC commitment → January 25, 2024 HMC launch → September 27, 2024 formal two-phase transition → January 17, 2026 Ain al-Asad handover**. The governing transition predates the Iran war by roughly 17 months.

- `MOV-20260117-IRQ-AINASAD`: **PRE-COORDINATED DRAWDOWN — NOT A RETREAT / BILATERALLY AGREED WITHDRAWAL**.
- `MOV-202607-IRQ-ERBIL`: **PRE-COORDINATED DRAWDOWN / WARTIME EXECUTION — NOT A RETREAT**. Execution occurred during the war, but the governing 2024 U.S.–Iraq schedule and September 30, 2026 endpoint predated it. Possible wartime force-protection effects remain separate from the originating cause.

### Syria

Al-Tanf, Shaddadi and Qasrak remain linked to `AGR-US-SYR-BASE-CONSOLIDATION-2025-2026`. The package establishes pre-war U.S.–Syrian coordination / conditions-based force-posture transition, while preserving the gap that no single signed document fixing every closure date was established.

- `MOV-20260212-SYR-TANF`: **FORCE-POSTURE CONSOLIDATION — NOT A RETREAT**.
- `MOV-20260215-SYR-SHADDADI`: **FORCE-POSTURE CONSOLIDATION — NOT A RETREAT**.
- `MOV-20260223-SYR-QASRAK`: **PRE-COORDINATED DRAWDOWN — NOT A RETREAT**.

All three executed or began executing before February 28, 2026. No reviewed evidence shows Iranian wartime pressure originated those decisions.

### Carrier posture

The carrier records remain distinct from the bilateral drawdowns. Lincoln's Middle East deployment was scheduled and established before the war; combat later extended it. The August departure is classified **PLANNED ROTATION — NOT A RETREAT**, while George Washington's arrival is a **scheduled redeployment/relief continuity event**. The package does **not** fabricate a pre-war date for the specific August relief decision; that internal scheduling date remains unresolved.

## Agreement / alignment requirement

`agreements.json` is an active canonical dataset. Each record now exposes negotiation/origin date, formalization/signature date, effective date, pre-war/wartime status, normalized U.S. role categories, relationship to earlier U.S.-linked security structures, supporting sources, regional corroboration where present, linked movements/events/claims, and abandonment counterevidence.

The required analytical rule is symmetrical: **forming an additional regional arrangement does not by itself prove abandonment of the United States; U.S. involvement somewhere does not by itself prove continued U.S. primacy.** The atlas must show the actual relationship.

The eight current agreement/mechanism records are:

<!-- BEGIN AUTO-ID-INVENTORY agreements -->
- `AGR-US-IRQ-SECURITY-TRANSITION-2023-2026`
- `AGR-US-SYR-BASE-CONSOLIDATION-2025-2026`
- `AGR-US-SAU-STRATEGIC-DEFENSE-2025`
- `AGR-US-IRN-14POINT-MOU-2026`
- `AGR-ISR-LBN-FRAMEWORK-2026`
- `AGR-LBN-HEZBOLLAH-VERIFY-PROP-2026`
- `AGR-SAUDI-MARITIME-COALITION-2026`
- `AGR-MECCA-JOINT-DEFENSE-2026`
<!-- END AUTO-ID-INVENTORY agreements -->

Key alignment handling remains:

- **U.S.–Iraq transition:** changes the coalition mission into an enduring bilateral U.S.–Iraq security relationship; it is not evidence that Iran originated the drawdown.
- **U.S.–Syria force-posture transition:** coordinated pre-war handovers/consolidation are preserved with date-precision limits.
- **U.S.–Saudi Strategic Defense Agreement:** signed before the Iran war and retained as relevant continuity evidence.
- **Mecca Joint Defence Agreement:** additional Saudi–Türkiye–Pakistan defense layer; U.S. is not a party and the record says existing agreements were not abrogated. No abandonment inference is permitted without separate evidence.
- **Saudi-led 14-state maritime coalition proposal:** regional burden-sharing is real; reviewed evidence does not establish the United States as one of the 14 formal supporting states. U.S. formal role remains unresolved.
- **Israel–Lebanon framework:** U.S.-brokered/mediated security framework with continuing implementation relevance.
- **Hezbollah verification mechanism:** proposed and U.S.-mediated; the possible four-country composition is **not** treated as a constituted panel.
- **U.S.–Iran 14-point MOU/framework:** U.S. is a party; later fracture does not erase the historical agreement.

The linked `CASE-US-REGIONAL-ABANDONMENT-NARRATIVE-2026` verdict remains **OVERBROAD — CAUSATION NOT SUPPORTED**. Evidence of regional diversification and burden-sharing is preserved rather than hidden.

## Other substantive adjudications preserved

### Al Udeid

Serious CAOC damage and CAOC inoperability are verified; whole-base incapacity is not supported. Distributed C2/continuity evidence remains linked. Exact disabling strike timing and reconstitution remain unresolved.

### Hormuz

The package preserves a multi-axis assessment: physical transit, commercial normalization, Iranian permission/coercion, U.S. blockade/interdiction, insurance/commercial willingness, and legal/control questions are not collapsed into a binary open/closed slogan.

### Casualties

Military KIA/WIA/MIA, senior military commanders, senior political/state leadership, civilians, and contractors/other remain separate. The current structured data supports a clean U.S. cumulative snapshot of **18 military KIA** by July 22; the legacy “11 leaders” value remains quarantined from like-for-like comparison until itemized.

### Munitions and material attrition

A launched missile or one-way drone is inventory expenditure whether it hits, misses, or is intercepted. Durable destroyed, durable damaged, inventory destroyed before use, and launched munitions remain separate accounting categories. Claim-only/target-only records do not become verified destruction.

### Cost and economics

Direct military costs stay separate from wider economic effects. The June CSIS $34–42B DoD estimate predates renewed July fighting; the July 21 Pentagon $37.5B figure includes projected costs through September 30. Neither is represented as a final August 20 actual total. Iranian/allied costs without defensible item-price support remain unpriced rather than guessed.

### BDA

Overlay candidates and limitations are preserved. No machine-readable footprint/damage polygons were supplied, so the package contains no invented polygons or affected-area percentages.

## Temporal model and revisions

The **AS OF** versus **KNOWN BY** distinction remains mandatory. Date-only events stay date-only; unsupported hours are never fabricated. `revision-history.json` remains the audit trail, and `daily-coverage.json` remains collection coverage rather than an event ledger.

## Open gaps

There are **19** unresolved records and **19** one-to-one targeted collection requests. No gap was silently converted into a fact during this revision. The existing high-priority issues—Al Udeid chronology/reconstitution, Hormuz hidden traffic, facility repair status, casualty itemization, current direct military cost, opening-strike exact time, U.S. equipment-loss itemization, and force-posture timing details—remain governed by `unresolved.json` and `collection-requests.json`.

## Validation / future consistency protection

Revision 1.2 adds `validate-package.py`. It recomputes JSON counts and compares them to:

1. `manifest.json` counts;
2. the `AUTO_COUNTS` marker in this summary;
3. the `AUTO_COUNTS` marker in `CODEX-INSTRUCTIONS.md`; and
4. every machine-readable `AUTO-ID-INVENTORY` block in `CODEX-INSTRUCTIONS.md`.

A mismatch causes validation failure. This prevents a future JSON revision from silently leaving stale prose/counts or an incomplete Codex ID inventory.

## Files Codex should treat as authoritative

All JSON in this package is authoritative for the handoff. `CODEX-INSTRUCTIONS.md` is the implementation contract. `integration-summary.md` is the human-readable synopsis. `validate-package.py` is the consistency gate. No GitHub publishing action is authorized by this package.
