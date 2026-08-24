# CODEX INSTRUCTIONS — ISR Atlas Integration Revision 1.2

Use this package as the adjudicated evidence/decision layer for `ejronin/ISR`. **Do not research the war, reinterpret evidentiary verdicts, fabricate missing values, or publish/push.** Inspect the current repository before implementation, preserve current functionality unless this package explicitly changes it, and show the user the resulting diff/blockers before any commit or push.

<!-- AUTO_COUNTS:events=98;prewar_events=15;wartime_events=83;timeline_records=98;daily_coverage_days=176;facilities_integrated=5;repo_facilities_to_preserve=18;claims=6;movements=10;agreements=8;casualty_records=23;material_loss_records=12;munition_expenditure_records=9;shipping_records=13;economic_backfill_records=9;diplomacy_records=28;sources=150;unresolved_items=19;collection_requests=19;bda_overlay_candidates=13;revision_records=24 -->

## Aug. 22 canonical append-only advancement

The canonical factual chronology is advanced through **2026-08-22 13:59 ET** by an append-only update. The original Revision 1.2 Aug. 20 records remain lineage-locked; new facts are appended, later corrections/count conflicts are linked rather than overwritten, and older chronology is not rewritten with later knowledge.

The five-level outcome synthesis remains reviewed through **2026-08-20 15:59 ET** unless separately re-reviewed. The MOU/Hormuz analytical prose remains reviewed through **2026-08-22 10:54 ET**. Those analytical cutoffs are intentionally independent of the newer canonical evidence cutoff.


## 1. Authority and migration order

The JSON files are authoritative. `integration-summary.md` must agree with them but does not override them.

Migration order:

1. `sources.json` and `source-role-map.json` — migrate source joins first.
2. `agreements.json` — load agreement/security-mechanism identities before force-posture linkage.
3. `events.json`, `timeline.json`, `daily-coverage.json`.
4. `facilities.json`, `map-links.json`, `bda-overlays.json`.
5. `claims.json`, `movements.json`, `revision-history.json`.
6. `casualties.json`, `material-losses.json`, `munitions-expenditure.json`, `attrition-series.json`.
7. `cost-model.json`, `shipping.json`, `economics.json`, `diplomacy.json`, `domain-assessments.json`.
8. `unresolved.json`, `collection-requests.json`.
9. Run `python validate-package.py` and the product acceptance tests below.

## 2. Source IDs and lineage

The repo and earlier collection reused `S001`, `S002`, etc. for different URLs. **Never join sources by a legacy `S###` alone.** Canonical source identity is the `SRC-*` ID in `sources.json`; legacy IDs are aliases only.

When migrating an existing repo source, match the canonical URL. If no canonical URL match exists, preserve the repo source as a separate source rather than guessing. Reuters/AP/AFP syndication remains one reporting lineage unless the source metadata establishes independent sourcing. Preserve source-role assignments, regional corroboration, counterevidence, continuity evidence, claim origins and BDA roles.

## 3. Canonical counts — must remain synchronized

- Events: **98** = **15 pre-war + 83 wartime**.
- Movements: **10**.
- Agreements/mechanisms: **8**.
- Diplomacy records: **28**.
- Claim cases: **6**.
- Sources: **150**.
- Unresolved gaps / collection requests: **19 / 19**.

Do not hand-edit these counts. They are checked by `validate-package.py`.

## 4. Events and temporal model

Import **every** event in `events.json` into the active canonical ledger. Historical/pre-war evidence is not archive-only.

### Complete pre-war event inventory (15)

- `PRE-20201118-001`
- `PRE-20230808-IRQ-001`
- `PRE-20240125-IRQ-001`
- `PRE-20240927-IRQ-001`
- `PRE-20251118-SAU-001`
- `PRE-20260113-001`
- `PRE-20260114-001`
- `PRE-20260117-IRQ-001`
- `PRE-20260207-001`
- `PRE-20260212-SYR-001`
- `PRE-20260215-SYR-001`
- `PRE-20260218-SYR-001`
- `PRE-20260223-SYR-001`
- `PRE-20260226-001`
- `PRE-20260227-001`

### Complete wartime event inventory (83)

- `EV-20260228-001`
- `EV-20260302-001`
- `EV-20260302-002`
- `EV-20260310-001`
- `EV-20260313-001`
- `EV-20260316-001`
- `EV-20260317-001`
- `EV-20260320-001`
- `EV-20260320-002`
- `EV-20260322-001`
- `EV-20260323-001`
- `EV-20260324-001`
- `EV-20260326-001`
- `EV-20260328-001`
- `EV-20260328-002`
- `EV-20260328-003`
- `EV-20260331-001`
- `EV-20260408-001`
- `EV-20260413-001`
- `EV-20260415-001`
- `EV-20260420-001`
- `EV-20260423-001`
- `EV-20260429-001`
- `EV-20260430-001`
- `EV-20260430-002`
- `EV-20260504-001`
- `EV-20260504-002`
- `EV-20260505-001`
- `EV-20260515-001`
- `EV-20260517-001`
- `EV-20260518-001`
- `EV-20260518-002`
- `EV-20260520-001`
- `EV-20260526-001`
- `EV-20260528-001`
- `EV-20260528-002`
- `EV-20260601-001`
- `EV-20260603-001`
- `EV-20260615-001`
- `EV-20260617-001`
- `EV-20260626-001`
- `EV-20260630-001`
- `EV-20260707-001`
- `EV-20260709-001`
- `EV-20260711-001`
- `EV-20260720-001`
- `EV-20260730-001`
- `EV-20260805-001`
- `EV-20260807-002`
- `EV-20260812-001`
- `EV-20260812-002`
- `EV-20260812-003`
- `EV-20260813-001`
- `EV-20260813-002`
- `EV-20260813-003`
- `EV-20260814-001`
- `EV-20260814-002`
- `EV-20260816-001`
- `EV-20260817-001`
- `EV-20260817-002`
- `EV-20260818-001`
- `EV-20260818-002`
- `EV-20260819-001`
- `EV-20260820-001`
- `EV-20260820-002`
- `EV-20260820-003`
- `EV-20260820-004`
- `EV-20260820-005`
- `EV-20260819-002`
- `EV-20260820-006`
- `EV-20260820-007`
- `EV-20260821-001`
- `EV-20260821-002`
- `EV-20260821-003`
- `EV-20260821-004`
- `EV-20260821-005`
- `EV-20260821-006`
- `EV-20260821-007`
- `EV-20260822-001`
- `EV-20260822-002`
- `EV-20260822-004`
- `EV-20260822-005`
- `EV-20260822-006`

<!-- BEGIN AUTO-ID-INVENTORY events -->
- `PRE-20201118-001`
- `PRE-20230808-IRQ-001`
- `PRE-20240125-IRQ-001`
- `PRE-20240927-IRQ-001`
- `PRE-20251118-SAU-001`
- `PRE-20260113-001`
- `PRE-20260114-001`
- `PRE-20260117-IRQ-001`
- `PRE-20260207-001`
- `PRE-20260212-SYR-001`
- `PRE-20260215-SYR-001`
- `PRE-20260218-SYR-001`
- `PRE-20260223-SYR-001`
- `PRE-20260226-001`
- `PRE-20260227-001`
- `EV-20260228-001`
- `EV-20260302-001`
- `EV-20260302-002`
- `EV-20260310-001`
- `EV-20260313-001`
- `EV-20260316-001`
- `EV-20260317-001`
- `EV-20260320-001`
- `EV-20260320-002`
- `EV-20260322-001`
- `EV-20260323-001`
- `EV-20260324-001`
- `EV-20260326-001`
- `EV-20260328-001`
- `EV-20260328-002`
- `EV-20260328-003`
- `EV-20260331-001`
- `EV-20260408-001`
- `EV-20260413-001`
- `EV-20260415-001`
- `EV-20260420-001`
- `EV-20260423-001`
- `EV-20260429-001`
- `EV-20260430-001`
- `EV-20260430-002`
- `EV-20260504-001`
- `EV-20260504-002`
- `EV-20260505-001`
- `EV-20260515-001`
- `EV-20260517-001`
- `EV-20260518-001`
- `EV-20260518-002`
- `EV-20260520-001`
- `EV-20260526-001`
- `EV-20260528-001`
- `EV-20260528-002`
- `EV-20260601-001`
- `EV-20260603-001`
- `EV-20260615-001`
- `EV-20260617-001`
- `EV-20260626-001`
- `EV-20260630-001`
- `EV-20260707-001`
- `EV-20260709-001`
- `EV-20260711-001`
- `EV-20260720-001`
- `EV-20260730-001`
- `EV-20260805-001`
- `EV-20260807-002`
- `EV-20260812-001`
- `EV-20260812-002`
- `EV-20260812-003`
- `EV-20260813-001`
- `EV-20260813-002`
- `EV-20260813-003`
- `EV-20260814-001`
- `EV-20260814-002`
- `EV-20260816-001`
- `EV-20260817-001`
- `EV-20260817-002`
- `EV-20260818-001`
- `EV-20260818-002`
- `EV-20260819-001`
- `EV-20260820-001`
- `EV-20260820-002`
- `EV-20260820-003`
- `EV-20260820-004`
- `EV-20260820-005`
- `EV-20260819-002`
- `EV-20260820-006`
- `EV-20260820-007`
- `EV-20260821-001`
- `EV-20260821-002`
- `EV-20260821-003`
- `EV-20260821-004`
- `EV-20260821-005`
- `EV-20260821-006`
- `EV-20260821-007`
- `EV-20260822-001`
- `EV-20260822-002`
- `EV-20260822-004`
- `EV-20260822-005`
- `EV-20260822-006`
<!-- END AUTO-ID-INVENTORY events -->

`daily-coverage.json` is collection coverage, **not** an event source. A quiet-day marker means no standalone verified event was found in that pass; it does not mean no activity occurred.

Support two independent temporal views:

- **AS OF** = what had happened by the selected date/time.
- **KNOWN BY** = only what had been publicly reported/verified by the selected date/time.

Use `event_date`, `event_time`, `event_time_precision`, `first_reported`, and `first_verified` exactly as stored. Never fabricate an hour for a date-only event. Legacy E001's `01:15 ET` is not carried into canonical `EV-20260228-001` until the opening-strike timing gap is resolved.

Keep June agreement/implementation stages separate rather than collapsing signature, reported terms, and later execution into one event.

## 5. Force-posture classification — mandatory

**Iran war start date: 2026-02-28.**

A drawdown, rotation, redeployment, or withdrawal whose governing decision, bilateral agreement, implementation schedule, or formal execution plan was established before that date must be classified by its documented force-posture type. **Do not label it RETREAT.**

For each such movement display/preserve:

- host country;
- governments/parties involved;
- discussions/origin date where known;
- agreement reached date where known;
- formalization/signature date where known;
- order or implementation-schedule date where known;
- planned execution window;
- actual execution date;
- Iran-war start date;
- evidence the war later accelerated, expanded, delayed, or otherwise changed the plan;
- subsequent U.S./allied activity showing broader force posture.

Unknown dates remain null/approximate. **Do not invent precision.** If the war later changed a pre-war plan, display that as a separate plan-change fact rather than retroactively changing the plan's origin classification.

Use the per-record `force_posture_classification`, `display_label`, `war_change_assessment`, and `causation_language` fields in `movements.json`.

Required causal wording where supported:

> The drawdown was negotiated and scheduled before the Iran war. The movement is therefore classified as a pre-coordinated drawdown, not a retreat.

> No reviewed evidence shows Iranian wartime pressure originated the decision.

### Iraq — mandatory causal chain

`AGR-US-IRQ-SECURITY-TRANSITION-2023-2026`: United States + Republic of Iraq.

- Aug. 8, 2023 — bilateral HMC commitment.
- Jan. 25, 2024 — HMC launch.
- Sept. 27, 2024 — formal two-phase transition timeline.
- Jan. 17, 2026 — Ain al-Asad handover.
- Sept. 30, 2026 — later endpoint governing remaining coalition-mission support phase as stored in the evidence package.

`MOV-20260117-IRQ-AINASAD` must display **PRE-COORDINATED DRAWDOWN — NOT A RETREAT** and/or **BILATERALLY AGREED WITHDRAWAL**.

`MOV-202607-IRQ-ERBIL` must display **PRE-COORDINATED DRAWDOWN / WARTIME EXECUTION — NOT A RETREAT**. The physical movement occurred during the war, but the governing U.S.–Iraq plan was formalized in 2024. Preserve possible wartime force-protection effects as a separate caveat; do not assign Iran as the originating cause without evidence the 2024 plan was superseded.

### Syria — mandatory causal chain

`AGR-US-SYR-BASE-CONSOLIDATION-2025-2026`: United States + Syrian government/authorities. Reviewed evidence supports coordinated pre-war handovers and a deliberate/conditions-based transition; it **does not** establish a single signed bilateral instrument with a precise 2025 signature day. Do not invent one.

- `MOV-20260212-SYR-TANF`: **FORCE-POSTURE CONSOLIDATION — NOT A RETREAT**.
- `MOV-20260215-SYR-SHADDADI`: **FORCE-POSTURE CONSOLIDATION — NOT A RETREAT**.
- `MOV-20260223-SYR-QASRAK`: **PRE-COORDINATED DRAWDOWN — NOT A RETREAT**.

All executed/began executing before February 28.

### Carrier posture

- `MOV-20260207-001`: pre-war scheduled Lincoln deployment. Later war-driven extension is separate.
- `MOV-20260320-001`: wartime reinforcement.
- `MOV-20260320-002`: carrier rotation/replacement; no pre-war decision date is claimed.
- `MOV-20260814-001`: **PLANNED ROTATION — NOT A RETREAT** after a war-driven extension. Do not falsely label the specific August relief decision “pre-war”; exact internal scheduling date is unresolved.
- `MOV-20260820-001`: scheduled redeployment/relief continuity; George Washington replacement presence must be linked.

### Complete movement inventory (10)

<!-- BEGIN AUTO-ID-INVENTORY movements -->
- `MOV-20260117-IRQ-AINASAD`
- `MOV-20260207-001`
- `MOV-20260212-SYR-TANF`
- `MOV-20260215-SYR-SHADDADI`
- `MOV-20260223-SYR-QASRAK`
- `MOV-20260320-001`
- `MOV-20260320-002`
- `MOV-202607-IRQ-ERBIL`
- `MOV-20260814-001`
- `MOV-20260820-001`
<!-- END AUTO-ID-INVENTORY movements -->

## 6. Agreements, panels, coalitions and alignment claims — mandatory

Load `agreements.json` as an active canonical dataset and join it to events, movements, claims, and relevant facilities through stored refs.

For each agreement/mechanism expose:

- name and type;
- parties;
- negotiation/origin date and precision;
- formalization/signature date;
- effective/implementation date;
- pre-war/wartime status;
- U.S. role categories (`SIGNATORY`, `BROKER`, `FACILITATOR`, `SUPPORTER`, `GUARANTOR`, `OBSERVER`, or `NO_DOCUMENTED_ROLE`) plus the detailed original U.S. role text;
- whether it replaces, supplements, coexists with, or has no demonstrated effect on earlier U.S.-linked structures;
- supporting sources and regional corroboration where present;
- Iranian characterization only where actually supported;
- counterevidence to abandonment narratives;
- reverse links to related events/movements/claims.

Do **not** infer “abandonment of the U.S.” merely because regional states form additional agreements. Do **not** infer continued U.S. primacy merely because the U.S. appears in some arrangements. Display the actual relationship.

### Complete agreement/mechanism inventory (8)

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

Required handling:

- `AGR-US-IRQ-SECURITY-TRANSITION-2023-2026`: pre-war bilateral U.S.–Iraq transition; coalition-mission reduction moves toward an enduring U.S.-linked bilateral security relationship.
- `AGR-US-SYR-BASE-CONSOLIDATION-2025-2026`: pre-war coordinated conditions-based force-posture transition; signature precision unresolved.
- `AGR-US-SAU-STRATEGIC-DEFENSE-2025`: pre-war signed U.S.–Saudi defense context.
- `AGR-MECCA-JOINT-DEFENSE-2026`: U.S. not a party; additional regional defense layer; existing agreements reported as not abrogated. Do not label it abandonment by itself.
- `AGR-SAUDI-MARITIME-COALITION-2026`: fourteen-state regional maritime proposal. U.S. formal role/member status is unresolved in reviewed evidence. Do not invent U.S. membership or anti-U.S. rupture.
- `AGR-ISR-LBN-FRAMEWORK-2026`: U.S.-brokered/mediated framework and implementation track.
- `AGR-LBN-HEZBOLLAH-VERIFY-PROP-2026`: proposed, U.S.-mediated verification mechanism. Britain, Italy, Switzerland and Indonesia are candidate contributors only; do not render a final four-state panel.
- `AGR-US-IRN-14POINT-MOU-2026`: U.S. is a party; later implementation fracture does not erase the historical agreement.

`CASE-US-REGIONAL-ABANDONMENT-NARRATIVE-2026` controls the current public assessment: **OVERBROAD — CAUSATION NOT SUPPORTED**. Preserve the contrary evidence that regional diversification and burden-sharing are real.

## 7. Facilities

Update, do not duplicate, `US-ALUDEID`. Keep CAOC/subfacility loss separate from whole-base status. Preserve Shaw/distributed C2 continuity and unresolved reconstitution timing.

Add/use the four new integrated identities from `facilities.json` and enrich existing repo identities `US-AINASAD`, `US-TANF`, `US-QASRAK`, and `US-ERBIL` with agreement refs and drawdown chronology. Do not create duplicate facilities for handover events. `US-RMELAN` remains a dated drawdown-status facility; do not invent an August presence state.

### Complete integrated facility inventory

<!-- BEGIN AUTO-ID-INVENTORY facilities_integrated -->
- `US-ALUDEID`
- `FAC-UAE-BARAKAH`
- `FAC-KWT-KUWAIT-INTERNATIONAL-AIRPORT`
- `FAC-IRN-KHONDAB-HEAVY-WATER`
- `FAC-QAT-LNG-SYSTEM`
<!-- END AUTO-ID-INVENTORY facilities_integrated -->

Existing repo facility identities listed in `repo_records_to_preserve` must remain preserved.

## 8. Claim case files

Use the case-file verdicts/caveats in `claims.json`. Do not collapse contested claims to a binary score.

- Existing `CL-ALUDEID` is superseded/expanded by `CASE-AL-UDEID-WHOLE-BASE-INOPERABLE-2026`.
- Existing `CL-HORMUZ-CONTROL` is superseded/expanded by `CASE-HORMUZ-OPEN-CLOSED-2026`.
- Keep `CL-LINCOLN` hit/sinking allegations distinct from the carrier-retreat/rotation causation case.
- Preserve existing unrelated claim cards listed in `repo_claims_to_preserve`.

### Complete canonical claim-case inventory (6)

<!-- BEGIN AUTO-ID-INVENTORY claims -->
- `CASE-US-IRAN-FIRST-STRIKE-2026`
- `CASE-US-CARRIER-RETREAT-GULF-2026`
- `CASE-HORMUZ-OPEN-CLOSED-2026`
- `CASE-EPIC-FURY-OBJECTIVES-2026`
- `CASE-AL-UDEID-WHOLE-BASE-INOPERABLE-2026`
- `CASE-US-REGIONAL-ABANDONMENT-NARRATIVE-2026`
<!-- END AUTO-ID-INVENTORY claims -->

## 9. Casualties — like-for-like only

Do not compare unlike categories. Split/label military KIA, WIA, MIA; senior military commanders; senior political/state leadership; civilians; contractors/other. Null/unknown is not zero. Cumulative snapshots are not additive events.

The legacy “11 leaders” value is not itemized in the reviewed structured data. Keep it out of canonical side-by-side comparison until its gap is resolved; if retained for audit, label it `LEGACY UNITEMIZED TOTAL — NOT COMPARABLE`.

<!-- BEGIN AUTO-ID-INVENTORY casualties -->
- `C001`
- `C002`
- `C003`
- `C004`
- `C005`
- `C006`
- `C015`
- `C016`
- `C017`
- `C007`
- `C008`
- `C009`
- `C010`
- `C011`
- `C012A`
- `C012B`
- `C013`
- `C014`
- `C018`
- `C019`
- `C020A`
- `C020B`
- `C021`
<!-- END AUTO-ID-INVENTORY casualties -->

## 10. Material losses and munitions expenditure

Keep durable destroyed, durable damaged, inventory destroyed before use, and launched munitions separate. Targeted/claimed does not mean destroyed. Intercepted or missed launches still count as inventory expenditure. Respect `supersedes` / overlap relationships and never double count cumulative aggregates with event subsets.

### Material-loss inventory

<!-- BEGIN AUTO-ID-INVENTORY material_losses -->
- `MAT-IRN-DENA-20260304`
- `MAT-USA-KC135-20260312`
- `MAT-USA-HELO-20260701`
- `MAT-USA-ALUDEID-CAOC-2026`
- `MAT-USA-NSA-BHR-RADOMES`
- `MAT-USA-ARIFJAN-COMMS`
- `MAT-USA-ALISALEM-AD`
- `MAT-USA-PRINCESULTAN-AIRCRAFT`
- `MAT-USA-MUWAFFAQ-THAAD`
- `MAT-USA-SHEIKHISA-PATRIOT`
- `MAT-CLAIM-IRN-100-VESSELS`
- `MAT-CLAIM-IRGC-SMALLBOATS-20260707`
<!-- END AUTO-ID-INVENTORY material_losses -->

### Munitions-expenditure inventory

<!-- BEGIN AUTO-ID-INVENTORY munitions -->
- `MUN-IRN-FIRST100H-UAS`
- `MUN-IRN-FIRST100H-BM`
- `MUN-USA-TOMAHAWK-4WK`
- `MUN-USA-TOMAHAWK-CEASEFIRE`
- `MUN-USA-STRIKE-MUNITIONS-BY-JUN23`
- `MUN-USA-TOMAHAWK-20260610`
- `MUN-IRN-PSAB-20260327-BM`
- `MUN-IRN-PSAB-20260327-UAS`
- `MUN-USA-VELANOVA-20260811`
<!-- END AUTO-ID-INVENTORY munitions -->

## 11. Cost/accounting separation

Direct military cost is separate from wider economic effects. Preserve period/scope caveats. Do not add forecast GDP effects, oil-price changes, shipping losses, sanctions effects or other macroeconomic consequences to direct DoD military cost.

Do not present June CSIS $34–42B or July Pentagon $37.5B as a final August 20 actual total. Keep unsupported Iranian/allied replacement prices `UNPRICED` rather than inventing unit costs.

## 12. Attrition and domain assessments

Use supported evidence points only; do not interpolate factual daily values. Treat cumulative snapshots as snapshots. Do not restore a single combined “war score.” Preserve the domain-level assessments in `domain-assessments.json` with their uncertainties and counterevidence.

## 13. Shipping / Hormuz

Keep physical transit, tracked/AIS observations, Iranian permission/coercion, commercial normalization, insurer/operator willingness, port throughput and U.S. blockade/interdiction analytically distinct. Some physical transit does not by itself prove normalized commercial freedom of navigation; low throughput does not by itself prove zero passage.

<!-- BEGIN AUTO-ID-INVENTORY shipping -->
- `SHIP-PKG-001`
- `SHIP-PKG-002`
- `SHIP-PKG-003`
- `SHIP-PKG-004`
- `SHIP-PKG-005`
- `SHIP-PKG-006`
- `SHIP-PKG-007`
- `SHIP-PKG-008`
- `SHIP-REPO-20260709`
- `SHIP-REPO-20260730`
- `SHIP-REPO-20260812`
- `SHIP-UPD-20260820-KPLER`
- `SHIP-UPD-20260820-REUTERS-AUG22`
<!-- END AUTO-ID-INVENTORY shipping -->

## 14. Diplomacy

Import all diplomacy records and retain `agreement_refs`/`event_refs`.

### Complete diplomacy inventory (19)

<!-- BEGIN AUTO-ID-INVENTORY diplomacy -->
- `DIP-INT-001`
- `DIP-INT-002`
- `DIP-PKG-001`
- `DIP-PKG-002`
- `DIP-PKG-003`
- `DIP-PKG-004`
- `DIP-PKG-005`
- `DIP-PKG-006`
- `DIP-PKG-007`
- `DIP-PKG-008`
- `DIP-INT-003`
- `DIP-PKG-009`
- `DIP-INT-004`
- `DIP-PKG-010`
- `DIP-INT-005`
- `DIP-PKG-011`
- `DIP-INT-006`
- `DIP-PKG-012`
- `DIP-PKG-013`
- `DIP-UPD-20260819-NATO-HORMUZ`
- `DIP-UPD-20260821-QALIBAF-IRAQ`
- `DIP-UPD-20260821-IRAQ-SAUDI-OPEC`
- `DIP-UPD-20260821-OMAN-IRAN`
- `DIP-UPD-20260822-IRAQ-HORMUZ`
- `DIP-UPD-20260822-FR-SAUDI`
- `DIP-UPD-20260822-PEZESHKIAN`
- `DIP-UPD-20260822-QALIBAF-REGIONAL`
- `DIP-UPD-20260822-SANCTIONS`
<!-- END AUTO-ID-INVENTORY diplomacy -->

## 15. BDA overlays

Only render overlays supported by actual footprint/imagery geometry. This package contains candidate records and limitations but no machine-readable damage polygons. Do not draw invented polygons or calculate affected-area percentages.

<!-- BEGIN AUTO-ID-INVENTORY bda_overlays -->
- `BDA-US-ALUDEID`
- `BDA-US-NSA-BHR`
- `BDA-US-ARIFJAN`
- `BDA-US-ALISALEM`
- `BDA-US-BUEHRING`
- `BDA-US-ALDHAFRA`
- `BDA-US-PRINCESULTAN`
- `BDA-US-MUWAFFAQ`
- `BDA-US-ISA`
- `BDA-FAC-UAE-BARAKAH`
- `BDA-FAC-KWT-KUWAIT-INTERNATIONAL-AIRPORT`
- `BDA-FAC-IRN-KHONDAB-HEAVY-WATER`
- `BDA-FAC-QAT-LNG-SYSTEM`
<!-- END AUTO-ID-INVENTORY bda_overlays -->

## 16. Revisions, AS OF / KNOWN BY and auditability

Preserve `revision-history.json`. Historical claims/verdicts must remain auditable rather than overwritten. AS OF and KNOWN BY are separate filters. Later outcomes must not be back-projected into what was publicly known at an earlier date.

## 17. Unresolved gaps / collection requests

Do not resolve gaps by inference. Display/open them where useful and hand them back to collection as narrowly scoped requests.

### Complete unresolved inventory (19)

<!-- BEGIN AUTO-ID-INVENTORY unresolved -->
- `GAP-001`
- `GAP-002`
- `GAP-003`
- `GAP-004`
- `GAP-005`
- `GAP-006`
- `GAP-007`
- `GAP-008`
- `GAP-009`
- `GAP-010`
- `GAP-011`
- `GAP-012`
- `GAP-013`
- `GAP-014`
- `GAP-015`
- `GAP-016`
- `GAP-017`
- `GAP-018`
- `GAP-019`
<!-- END AUTO-ID-INVENTORY unresolved -->

### Complete collection-request inventory (19)

<!-- BEGIN AUTO-ID-INVENTORY collection_requests -->
- `COLLECT-GAP-001`
- `COLLECT-GAP-002`
- `COLLECT-GAP-003`
- `COLLECT-GAP-004`
- `COLLECT-GAP-005`
- `COLLECT-GAP-006`
- `COLLECT-GAP-007`
- `COLLECT-GAP-008`
- `COLLECT-GAP-009`
- `COLLECT-GAP-010`
- `COLLECT-GAP-011`
- `COLLECT-GAP-012`
- `COLLECT-GAP-013`
- `COLLECT-GAP-014`
- `COLLECT-GAP-015`
- `COLLECT-GAP-016`
- `COLLECT-GAP-017`
- `COLLECT-GAP-018`
- `COLLECT-GAP-019`
<!-- END AUTO-ID-INVENTORY collection_requests -->

## 18. Source inventory

The canonical source count is **135**. Source IDs must remain unique and URL lineage must remain intact.

<!-- BEGIN AUTO-ID-INVENTORY sources -->
- `SRC-005D46FC622B`
- `SRC-0561D46C2441`
- `SRC-05EC0662B7EC`
- `SRC-07FE627C1B90`
- `SRC-0989970823E0`
- `SRC-0A8D55737F6E`
- `SRC-0F0B6070FCF6`
- `SRC-107ADCD0AB0C`
- `SRC-13C29898FA62`
- `SRC-14B6DC8A760C`
- `SRC-1531FAADFF52`
- `SRC-17A8BAFE71BD`
- `SRC-1F7AC92D882F`
- `SRC-1FCEC1114E60`
- `SRC-209378A46AAC`
- `SRC-20978ADE1FA1`
- `SRC-234390A3E087`
- `SRC-25DF3807300D`
- `SRC-27B4F9BD222C`
- `SRC-28B0CE7F2B7E`
- `SRC-29FAB9A69690`
- `SRC-2AD36D488E7F`
- `SRC-2C560C3002FC`
- `SRC-301D4457A5A8`
- `SRC-329DD7E492A8`
- `SRC-3300B7672235`
- `SRC-355C149D77E4`
- `SRC-3713FD1F35CD`
- `SRC-3826CE7F7FBB`
- `SRC-38F77594E6D5`
- `SRC-3B7FE42A1FF2`
- `SRC-3C8236B21AC0`
- `SRC-40708A58524D`
- `SRC-4818F69C326D`
- `SRC-4A733BFAC693`
- `SRC-4BAF1AD0125F`
- `SRC-4D79B1712E0D`
- `SRC-4E559726D514`
- `SRC-4E7A15C9F5B0`
- `SRC-4E85BD9B8182`
- `SRC-4FAD801FF49E`
- `SRC-543806914EAF`
- `SRC-54EDDA09EBC7`
- `SRC-551A9C2DB97C`
- `SRC-5581A889C78E`
- `SRC-566F047CEA46`
- `SRC-569997F08351`
- `SRC-569EA3D29954`
- `SRC-56C86C6E1D78`
- `SRC-572AFBAA0B04`
- `SRC-57864B8610ED`
- `SRC-583001F87534`
- `SRC-5EEA6488E035`
- `SRC-61F0DD052207`
- `SRC-6254D39BE9DA`
- `SRC-6261F62A2388`
- `SRC-62CEDAA21545`
- `SRC-631C96DF41A7`
- `SRC-64BB58499062`
- `SRC-66667A45F235`
- `SRC-691C9B6A352A`
- `SRC-6B8C48817118`
- `SRC-6C0B7AB1ADB0`
- `SRC-6C49C8F1ACDF`
- `SRC-6EB96703F633`
- `SRC-704574F8CB02`
- `SRC-7160505543FE`
- `SRC-72E371C289C9`
- `SRC-7538CF574DDF`
- `SRC-75B726B1EA91`
- `SRC-777D501C321D`
- `SRC-77D13A92FD64`
- `SRC-7831E5A00A7B`
- `SRC-7F8C51C69FF9`
- `SRC-80791B854E19`
- `SRC-824548DBBB68`
- `SRC-84C62BAB5B65`
- `SRC-8606F9274324`
- `SRC-87167CE9136F`
- `SRC-877766ED3824`
- `SRC-887221921E34`
- `SRC-8C302F9CD6F7`
- `SRC-8E5FBD1AE0C0`
- `SRC-90DA8D027955`
- `SRC-9396B216601A`
- `SRC-96170CB468F4`
- `SRC-9EB7D0DCB798`
- `SRC-A1739E70EEDC`
- `SRC-A28F817FCF49`
- `SRC-A2DF44867E0E`
- `SRC-A3FAF2999E6B`
- `SRC-A56F4E9B7A5C`
- `SRC-A71BC15C30DB`
- `SRC-AA1020760411`
- `SRC-AB2381268A40`
- `SRC-AC40CCC92A43`
- `SRC-AF45CA5FA4C9`
- `SRC-B106A3769146`
- `SRC-B3FFD2E97368`
- `SRC-B6B934C693E0`
- `SRC-B6BD666BCD4C`
- `SRC-B73D6749ACAD`
- `SRC-BB3EED5C3240`
- `SRC-BCB32C965F32`
- `SRC-BD807ACB7FF3`
- `SRC-BFCDC2B49D89`
- `SRC-C092F7F591FC`
- `SRC-C4FF4F823E1F`
- `SRC-CAC4D4DF4A81`
- `SRC-CEBE7CCFF600`
- `SRC-D129A9FA0378`
- `SRC-D1D26F5E9AA2`
- `SRC-D4268D5E43FB`
- `SRC-D6F67C3C1DA1`
- `SRC-DBD040C6756B`
- `SRC-DDB039D3C975`
- `SRC-DF7B6D820D63`
- `SRC-DFF12FB2C9ED`
- `SRC-E229B42C1EB1`
- `SRC-E277CF2E03A3`
- `SRC-E27CBB0AD0BC`
- `SRC-E6B1159781EB`
- `SRC-E79574E72235`
- `SRC-E7CF466D7C4C`
- `SRC-EE4B64925CA5`
- `SRC-EF1D932D8488`
- `SRC-EF8EDACF7DA3`
- `SRC-F0035CD212FD`
- `SRC-F0CD832C6472`
- `SRC-F342B5872062`
- `SRC-F54E8612EADA`
- `SRC-F77A9718856E`
- `SRC-F820228892CB`
- `SRC-F8F12DF86B47`
- `SRC-F9C4A35EE811`
- `SRC-087E077D488F`
- `SRC-C869142454CE`
- `SRC-5F06A28B79E7`
- `SRC-9016A9DDF69F`
- `SRC-980086328C21`
- `SRC-C5F2E7065110`
- `SRC-283DBF8D4872`
- `SRC-F33E9E8FE450`
- `SRC-B7E80EBD97E4`
- `SRC-1168EB0594C5`
- `SRC-3077D3E08CBE`
- `SRC-D5E73D346BF5`
- `SRC-03092951A37F`
- `SRC-32D26981B604`
- `SRC-E5297E5894E1`
<!-- END AUTO-ID-INVENTORY sources -->

## 19. Acceptance tests

Implementation fails if any of these occur:

1. A legacy `S###` joins to the wrong URL.
2. `US-ALUDEID` is duplicated or CAOC incapacity is rendered as whole-base incapacity.
3. Date-only events receive fabricated hours.
4. Quiet-day collection markers become “nothing happened” facts.
5. `CASE-HORMUZ-OPEN-CLOSED-2026` erases either continued physical transits or severe commercial disruption.
6. Lincoln planned rotation is rendered as retreat without causal evidence.
7. Ain al-Asad, al-Tanf, Shaddadi, Qasrak, or Erbil pre-coordinated/pre-war force-posture changes are labeled retreat because execution was near/during the war.
8. A pre-war plan is retroactively reclassified wholesale because the war later altered only schedule/scope. Later changes must be separate.
9. Mecca, the 14-state maritime initiative, Israel–Lebanon, Hezbollah verification talks, or other regional mechanisms are automatically labeled U.S. abandonment or U.S. primacy without the relationship field supporting that claim.
10. Candidate Hezbollah verifier states are rendered as a constituted four-state panel.
11. U.S. formal membership in the Saudi 14-state maritime grouping is invented.
12. The legacy 11-leader figure is compared directly with 18 U.S. service-member deaths.
13. Target-only/claim-only records are counted as verified destroyed assets.
14. Intercepted launches disappear from munitions expenditure.
15. Cumulative and event-level munitions/casualty rows are double counted.
16. Wider economic effects are added to direct military cost.
17. Unsupported current cost totals or Iranian unit prices are invented.
18. BDA polygons/affected-area percentages are fabricated.
19. A combined sports-style war score is restored as canonical.
20. `python validate-package.py` reports any JSON/manifest/summary/Codex count mismatch or incomplete ID inventory.
21. Any GitHub publish/push occurs without explicit user authorization.

## 20. Complete machine-checkable ID inventories

The following inventory blocks are authoritative mirrors of final JSON and are validated automatically. Do not edit them manually.

<!-- BEGIN AUTO-ID-INVENTORY events -->
- `PRE-20201118-001`
- `PRE-20230808-IRQ-001`
- `PRE-20240125-IRQ-001`
- `PRE-20240927-IRQ-001`
- `PRE-20251118-SAU-001`
- `PRE-20260113-001`
- `PRE-20260114-001`
- `PRE-20260117-IRQ-001`
- `PRE-20260207-001`
- `PRE-20260212-SYR-001`
- `PRE-20260215-SYR-001`
- `PRE-20260218-SYR-001`
- `PRE-20260223-SYR-001`
- `PRE-20260226-001`
- `PRE-20260227-001`
- `EV-20260228-001`
- `EV-20260302-001`
- `EV-20260302-002`
- `EV-20260310-001`
- `EV-20260313-001`
- `EV-20260316-001`
- `EV-20260317-001`
- `EV-20260320-001`
- `EV-20260320-002`
- `EV-20260322-001`
- `EV-20260323-001`
- `EV-20260324-001`
- `EV-20260326-001`
- `EV-20260328-001`
- `EV-20260328-002`
- `EV-20260328-003`
- `EV-20260331-001`
- `EV-20260408-001`
- `EV-20260413-001`
- `EV-20260415-001`
- `EV-20260420-001`
- `EV-20260423-001`
- `EV-20260429-001`
- `EV-20260430-001`
- `EV-20260430-002`
- `EV-20260504-001`
- `EV-20260504-002`
- `EV-20260505-001`
- `EV-20260515-001`
- `EV-20260517-001`
- `EV-20260518-001`
- `EV-20260518-002`
- `EV-20260520-001`
- `EV-20260526-001`
- `EV-20260528-001`
- `EV-20260528-002`
- `EV-20260601-001`
- `EV-20260603-001`
- `EV-20260615-001`
- `EV-20260617-001`
- `EV-20260626-001`
- `EV-20260630-001`
- `EV-20260707-001`
- `EV-20260709-001`
- `EV-20260711-001`
- `EV-20260720-001`
- `EV-20260730-001`
- `EV-20260805-001`
- `EV-20260807-002`
- `EV-20260812-001`
- `EV-20260812-002`
- `EV-20260812-003`
- `EV-20260813-001`
- `EV-20260813-002`
- `EV-20260813-003`
- `EV-20260814-001`
- `EV-20260814-002`
- `EV-20260816-001`
- `EV-20260817-001`
- `EV-20260817-002`
- `EV-20260818-001`
- `EV-20260818-002`
- `EV-20260819-001`
- `EV-20260820-001`
- `EV-20260820-002`
- `EV-20260820-003`
- `EV-20260820-004`
- `EV-20260820-005`
- `EV-20260819-002`
- `EV-20260820-006`
- `EV-20260820-007`
- `EV-20260821-001`
- `EV-20260821-002`
- `EV-20260821-003`
- `EV-20260821-004`
- `EV-20260821-005`
- `EV-20260821-006`
- `EV-20260821-007`
- `EV-20260822-001`
- `EV-20260822-002`
- `EV-20260822-004`
- `EV-20260822-005`
- `EV-20260822-006`
<!-- END AUTO-ID-INVENTORY events -->

<!-- BEGIN AUTO-ID-INVENTORY movements -->
- `MOV-20260117-IRQ-AINASAD`
- `MOV-20260207-001`
- `MOV-20260212-SYR-TANF`
- `MOV-20260215-SYR-SHADDADI`
- `MOV-20260223-SYR-QASRAK`
- `MOV-20260320-001`
- `MOV-20260320-002`
- `MOV-202607-IRQ-ERBIL`
- `MOV-20260814-001`
- `MOV-20260820-001`
<!-- END AUTO-ID-INVENTORY movements -->

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

<!-- BEGIN AUTO-ID-INVENTORY claims -->
- `CASE-US-IRAN-FIRST-STRIKE-2026`
- `CASE-US-CARRIER-RETREAT-GULF-2026`
- `CASE-HORMUZ-OPEN-CLOSED-2026`
- `CASE-EPIC-FURY-OBJECTIVES-2026`
- `CASE-AL-UDEID-WHOLE-BASE-INOPERABLE-2026`
- `CASE-US-REGIONAL-ABANDONMENT-NARRATIVE-2026`
<!-- END AUTO-ID-INVENTORY claims -->

<!-- BEGIN AUTO-ID-INVENTORY diplomacy -->
- `DIP-INT-001`
- `DIP-INT-002`
- `DIP-PKG-001`
- `DIP-PKG-002`
- `DIP-PKG-003`
- `DIP-PKG-004`
- `DIP-PKG-005`
- `DIP-PKG-006`
- `DIP-PKG-007`
- `DIP-PKG-008`
- `DIP-INT-003`
- `DIP-PKG-009`
- `DIP-INT-004`
- `DIP-PKG-010`
- `DIP-INT-005`
- `DIP-PKG-011`
- `DIP-INT-006`
- `DIP-PKG-012`
- `DIP-PKG-013`
- `DIP-UPD-20260819-NATO-HORMUZ`
- `DIP-UPD-20260821-QALIBAF-IRAQ`
- `DIP-UPD-20260821-IRAQ-SAUDI-OPEC`
- `DIP-UPD-20260821-OMAN-IRAN`
- `DIP-UPD-20260822-IRAQ-HORMUZ`
- `DIP-UPD-20260822-FR-SAUDI`
- `DIP-UPD-20260822-PEZESHKIAN`
- `DIP-UPD-20260822-QALIBAF-REGIONAL`
- `DIP-UPD-20260822-SANCTIONS`
<!-- END AUTO-ID-INVENTORY diplomacy -->

<!-- BEGIN AUTO-ID-INVENTORY unresolved -->
- `GAP-001`
- `GAP-002`
- `GAP-003`
- `GAP-004`
- `GAP-005`
- `GAP-006`
- `GAP-007`
- `GAP-008`
- `GAP-009`
- `GAP-010`
- `GAP-011`
- `GAP-012`
- `GAP-013`
- `GAP-014`
- `GAP-015`
- `GAP-016`
- `GAP-017`
- `GAP-018`
- `GAP-019`
<!-- END AUTO-ID-INVENTORY unresolved -->

<!-- BEGIN AUTO-ID-INVENTORY collection_requests -->
- `COLLECT-GAP-001`
- `COLLECT-GAP-002`
- `COLLECT-GAP-003`
- `COLLECT-GAP-004`
- `COLLECT-GAP-005`
- `COLLECT-GAP-006`
- `COLLECT-GAP-007`
- `COLLECT-GAP-008`
- `COLLECT-GAP-009`
- `COLLECT-GAP-010`
- `COLLECT-GAP-011`
- `COLLECT-GAP-012`
- `COLLECT-GAP-013`
- `COLLECT-GAP-014`
- `COLLECT-GAP-015`
- `COLLECT-GAP-016`
- `COLLECT-GAP-017`
- `COLLECT-GAP-018`
- `COLLECT-GAP-019`
<!-- END AUTO-ID-INVENTORY collection_requests -->

<!-- BEGIN AUTO-ID-INVENTORY sources -->
- `SRC-005D46FC622B`
- `SRC-0561D46C2441`
- `SRC-05EC0662B7EC`
- `SRC-07FE627C1B90`
- `SRC-0989970823E0`
- `SRC-0A8D55737F6E`
- `SRC-0F0B6070FCF6`
- `SRC-107ADCD0AB0C`
- `SRC-13C29898FA62`
- `SRC-14B6DC8A760C`
- `SRC-1531FAADFF52`
- `SRC-17A8BAFE71BD`
- `SRC-1F7AC92D882F`
- `SRC-1FCEC1114E60`
- `SRC-209378A46AAC`
- `SRC-20978ADE1FA1`
- `SRC-234390A3E087`
- `SRC-25DF3807300D`
- `SRC-27B4F9BD222C`
- `SRC-28B0CE7F2B7E`
- `SRC-29FAB9A69690`
- `SRC-2AD36D488E7F`
- `SRC-2C560C3002FC`
- `SRC-301D4457A5A8`
- `SRC-329DD7E492A8`
- `SRC-3300B7672235`
- `SRC-355C149D77E4`
- `SRC-3713FD1F35CD`
- `SRC-3826CE7F7FBB`
- `SRC-38F77594E6D5`
- `SRC-3B7FE42A1FF2`
- `SRC-3C8236B21AC0`
- `SRC-40708A58524D`
- `SRC-4818F69C326D`
- `SRC-4A733BFAC693`
- `SRC-4BAF1AD0125F`
- `SRC-4D79B1712E0D`
- `SRC-4E559726D514`
- `SRC-4E7A15C9F5B0`
- `SRC-4E85BD9B8182`
- `SRC-4FAD801FF49E`
- `SRC-543806914EAF`
- `SRC-54EDDA09EBC7`
- `SRC-551A9C2DB97C`
- `SRC-5581A889C78E`
- `SRC-566F047CEA46`
- `SRC-569997F08351`
- `SRC-569EA3D29954`
- `SRC-56C86C6E1D78`
- `SRC-572AFBAA0B04`
- `SRC-57864B8610ED`
- `SRC-583001F87534`
- `SRC-5EEA6488E035`
- `SRC-61F0DD052207`
- `SRC-6254D39BE9DA`
- `SRC-6261F62A2388`
- `SRC-62CEDAA21545`
- `SRC-631C96DF41A7`
- `SRC-64BB58499062`
- `SRC-66667A45F235`
- `SRC-691C9B6A352A`
- `SRC-6B8C48817118`
- `SRC-6C0B7AB1ADB0`
- `SRC-6C49C8F1ACDF`
- `SRC-6EB96703F633`
- `SRC-704574F8CB02`
- `SRC-7160505543FE`
- `SRC-72E371C289C9`
- `SRC-7538CF574DDF`
- `SRC-75B726B1EA91`
- `SRC-777D501C321D`
- `SRC-77D13A92FD64`
- `SRC-7831E5A00A7B`
- `SRC-7F8C51C69FF9`
- `SRC-80791B854E19`
- `SRC-824548DBBB68`
- `SRC-84C62BAB5B65`
- `SRC-8606F9274324`
- `SRC-87167CE9136F`
- `SRC-877766ED3824`
- `SRC-887221921E34`
- `SRC-8C302F9CD6F7`
- `SRC-8E5FBD1AE0C0`
- `SRC-90DA8D027955`
- `SRC-9396B216601A`
- `SRC-96170CB468F4`
- `SRC-9EB7D0DCB798`
- `SRC-A1739E70EEDC`
- `SRC-A28F817FCF49`
- `SRC-A2DF44867E0E`
- `SRC-A3FAF2999E6B`
- `SRC-A56F4E9B7A5C`
- `SRC-A71BC15C30DB`
- `SRC-AA1020760411`
- `SRC-AB2381268A40`
- `SRC-AC40CCC92A43`
- `SRC-AF45CA5FA4C9`
- `SRC-B106A3769146`
- `SRC-B3FFD2E97368`
- `SRC-B6B934C693E0`
- `SRC-B6BD666BCD4C`
- `SRC-B73D6749ACAD`
- `SRC-BB3EED5C3240`
- `SRC-BCB32C965F32`
- `SRC-BD807ACB7FF3`
- `SRC-BFCDC2B49D89`
- `SRC-C092F7F591FC`
- `SRC-C4FF4F823E1F`
- `SRC-CAC4D4DF4A81`
- `SRC-CEBE7CCFF600`
- `SRC-D129A9FA0378`
- `SRC-D1D26F5E9AA2`
- `SRC-D4268D5E43FB`
- `SRC-D6F67C3C1DA1`
- `SRC-DBD040C6756B`
- `SRC-DDB039D3C975`
- `SRC-DF7B6D820D63`
- `SRC-DFF12FB2C9ED`
- `SRC-E229B42C1EB1`
- `SRC-E277CF2E03A3`
- `SRC-E27CBB0AD0BC`
- `SRC-E6B1159781EB`
- `SRC-E79574E72235`
- `SRC-E7CF466D7C4C`
- `SRC-EE4B64925CA5`
- `SRC-EF1D932D8488`
- `SRC-EF8EDACF7DA3`
- `SRC-F0035CD212FD`
- `SRC-F0CD832C6472`
- `SRC-F342B5872062`
- `SRC-F54E8612EADA`
- `SRC-F77A9718856E`
- `SRC-F820228892CB`
- `SRC-F8F12DF86B47`
- `SRC-F9C4A35EE811`
- `SRC-087E077D488F`
- `SRC-C869142454CE`
- `SRC-5F06A28B79E7`
- `SRC-9016A9DDF69F`
- `SRC-980086328C21`
- `SRC-C5F2E7065110`
- `SRC-283DBF8D4872`
- `SRC-F33E9E8FE450`
- `SRC-B7E80EBD97E4`
- `SRC-1168EB0594C5`
- `SRC-3077D3E08CBE`
- `SRC-D5E73D346BF5`
- `SRC-03092951A37F`
- `SRC-32D26981B604`
- `SRC-E5297E5894E1`
<!-- END AUTO-ID-INVENTORY sources -->

Do not ask Codex to research or decide what the evidence means. Implement the stored verdicts, caveats, source lineage, temporal precision, agreement causality, and force-posture classifications exactly.
