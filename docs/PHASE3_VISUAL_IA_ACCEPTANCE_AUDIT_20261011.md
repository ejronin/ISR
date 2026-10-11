# Visual IA independent adjudication — Phase 3 at live SHA 9a3764a

Authority: approved facelift contract; `docs/GUIDE_PAGE_VISUAL_ARCHITECTURE.md` §§8.10, 8.12, 8.13; `mockups/guide-phase1-review/oil-economic-effects--desktop.svg` and mobile; `docs/GUIDE_FACELIFT_REFERENCE_SWEEP.md`; live `main` source inspection.

This is the Visual IA **design acceptance** disposition, separate from the successful release-integrity attestation of workflow #38169029266.

| Check | Visual IA disposition | Evidence | Resolution |
|---|---|---|---|
| Approved forecast Compare analytical object | **PASS, bounded** | `src/public-reader-registry.js:forecastRevisionChart()` reads `ledger.economics.forecast_context.rows`, rejects nonfinite/mismatched revisions, draws prewar/current connected endpoints and explicit signed pp; source drawer for every country. | Preserve; refine visual hierarchy only if screenshot review finds layout defects. |
| Protected original financial chart | **PASS** | `economy()` finds existing forecast, marks protected, retains original calculation/renderer. | Preserve. |
| Trend / Compare / Event Context mode semantics | **PARTIAL / NEEDS CORRECTION** | `economy()` constructs buttons whose handlers only `scrollIntoView`; labels `FORECAST REVISIONS`, `PROTECTED BASELINE`, `COMPARE`, `EVENT CONTEXT` are section navigation rather than a one-active-mode analytical selector; Trend unavailable without explicit reason. The labelled Event Context target is an existing recorded-effects section, not proved to be an event overlay on a compatible numeric series. | First design a true mode-state/availability model; expose unsupported views as unavailable with explanatory reason, not counterfeit time series. Do not hide protected baseline. |
| Economic transmission grammar | **FAIL / NOT IMPLEMENTED** | `economy()` appends `.economic-causality-boundary` prose expressly saying no mechanism→consequence chain inferred. The specified distinct supported mechanism/observed consequence/potential-watch diagram is absent. | Evidence lane first determines which **existing accepted** relationships and status classes can be bound; then render only those, with visible attribution, distinct shape/connector/status; do not invent causation to satisfy mockup. |
| Sanctions selected-node interaction | **PARTIAL** | `js/public-ia.js:SanctionsPage()` creates six keyboard-selectable intermediary/alternative nodes, updates `aria-pressed` and selected explanation. | Bind selected node to accepted related record, accepted source drawer, and named-node geography only where such join keys actually exist; otherwise explicitly show no established link. |
| Sanctions data/semantics | **PASS, bounded** | Approved `analysis.sanctions_network` powers states, legend, chronology, actor-specific notes, map, cascade and observed/remaining/potential sections. Selected state text refuses to infer stopped flows from designations. | Protect the legal-vs-behavioral distinction. |
| Hormuz map ↔ economic chart cross-highlighting | **UNVERIFIED / REQUIRES SPECIFIC TEST** | §8.10 requires bidirectional accepted context and reset; no cross-highlight contract is established by Phase 3 tests cited. | Review `hormuz.overview` actual selection and acceptance data; implement only grounded temporal pairings. |
| 320/390 layout legibility | **TECHNICAL PASS, VISUAL PARTIAL** | Phase 3 exact-head render suite produces six-width screenshots; earlier inspection shows long stacked sanctions flows at narrow widths. Screenshot existence cannot establish interaction burden or mockup parity. | Side-by-side 1440/390/320 screenshots against SVGs, then compact selected path without hiding evidence. |

## Overall disposition

**PARTIAL — NOT VISUAL IA ACCEPTED as full facelift.** This does not negate qualified deployment or require reverting valid additive improvements. It means the currently deployed implementation does **not** satisfy the full approved Phase 3/page-family Visual IA requirements.

## Boundaries

No evidence/canonical edits, speculative dated trends, invented financial OHLC/candlestick values, synthetic economic indexes, fabricated network edges or invented sanction transaction stoppages. Do not treat existing source IDs on a separate wartime action as proof that an unlinked generic intermediary node has that actor's evidence.

## Implementation sequence

1. Establish valid source joins for economic transmission and sanctions selected-node attribution; classify what cannot be shown.
2. Implement mode-state UX (including unsupported-mode explanation), maintaining protected baseline and accepted quantitative parity.
3. Implement only evidence-backed mechanism/observed/watch transmission diagrams and sanctions map/evidence coordination.
4. Re-capture & compare 1440/390/320 plus full six-width regression, run exact-SHA CI and live deployment attestation.
5. Close Visual IA only when each failing/partial requirement is backed by actual screenshot + interaction tests.

Note: this is a *source-code compliance audit*. Independent current-live browser interaction was not performed in this pass; deployed SHA is the build being evaluated.
