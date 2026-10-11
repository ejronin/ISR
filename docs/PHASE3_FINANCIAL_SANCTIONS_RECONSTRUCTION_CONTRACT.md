# Phase 3 — Financial and Sanctions Chart Reconstruction Contract

**Authority:** `docs/GUIDE_PAGE_VISUAL_ARCHITECTURE.md` §§8.12–8.13; accepted `data/integration-v1.2/economics.json` and `data/sanctions-financial-network-v1.json`.

## Economy — actual required quantitative product

The existing growth-forecast horizontal bars are **not** the finished financial analytical product. They remain as protected baseline during implementation.

### Primary comparison: 2026 real-GDP forecast revision

Build a financial-research-grade **paired-point / dumbbell revision chart** (or equivalent ECharts scatter-and-connector plot) rather than reproducing the old single-state bar graph. Plot the approved **prewar forecast** and **current forecast** on one common numeric percentage axis for the same 2026 real GDP growth metric. Connect each same-country pair to expose revision magnitude and direction. Provide a clearly labelled **percentage-point delta**, not a percent-change conversion.

Accepted rows (not a new calculation or a claim about realized growth):

| Economy | Prewar % | Current % | Revision (pp) |
| --- | ---: | ---: | ---: |
| Saudi Arabia | 4.3 | 1.4 | -2.9 |
| Oman | 2.8 | 3.1 | +0.3 |
| UAE | 5.0 | -0.5 | -5.5 |
| Bahrain | 2.9 | -5.1 | -8.0 |
| Kuwait | 3.4 | -8.1 | -11.5 |
| Qatar | 4.9 | -8.1 | -13.0 |
| Iran | 1.1 | -5.4 | -6.5 |

**Source-of-truth:** read these values from `forecast_context.rows` in accepted data, **never copy this table into a second production facts array**. The rendered read model must carry approved source IDs and publication/forecast-vintage basis; where forecast vintage dates are not available, indicate that limitation rather than synthesizing dates.

- X-axis: real GDP growth forecast for 2026, percent; include visible zero line and negative side.
- Y-axis: seven named economies; avoid implying Iran and GCC are a single homogeneous basket.
- Two distinct point shapes/labels: `prewar forecast`, `current forecast`. The connecting segment indicates **revision between snapshots**, not annual time-series interpolation.
- Hover/focus: country, each original value, original source IDs, signed revision in **percentage points**, period and projection—not realized GDP or war-cost estimate.
- Sort by revision magnitude or retain canonical country order, but preserve identity on mobile.
- Desktop: one dominant comparative analytical chart with figures legible without hovering; optionally aligned revision column/table.
- Mobile 390/320: country-by-country focus or vertically sized dumbbell panels with both values, labels and units visible; never collapse seven countries to unlabeled micro-bars.

### Other modes (only when qualified supporting series exist)

- **Trend:** actual accepted **dated observations of one compatible metric**, with genuine gaps, zero synthetic smoothing.
- **Event Context:** dated accepted events over that same observation series; arrows cannot imply causation absent accepted causal finding.
- Explicitly decline to render either mode where the reader has no comparable dated series. Do **not** draw candlesticks/OHLC without accepted open/high/low/close data, and do not invent composite `economic pressure` scores.

The user-visible mode control must correspond to real, functional analytical views, not navigation labels over unchanged categorical bars.

## Sanctions — the financial network and consequences

The Sanctions & Impact page is primarily a **money-flow and enforcement network** with analytical overlay, not a numeric histogram invented from designation counts.

- **Network:** named financial/commercial participants, intermediaries, payments/workarounds, maritime interfaces and countries, preserving accepted node IDs and relationships from `data/sanctions-financial-network-v1.json`.
- **Legality vs observable operation:** show separately: legal designation/secondary-exposure; observed blocked/degraded/still-usable status; a potential/watch outcome must be visually distinct and never represented as observed.
- **Stage-specific transmission:** actor → targeted legal/financial instrument → intermediary/payment or commodity route → demonstrated effect → potential/watch consequence, with an explicit basis for each edge. Never infer full financial paralysis from OFAC listing alone.
- **Selection:** clicking a node must illuminate its role in flow, linked geographic MapLibre point when available, accepted date, evidence drawer, and affected observed paths; selection must not create a new accepted causal claim.
- **Charting:** quantitative ECharts panels only for compatible observed time-series and units with source coverage; no arbitrary numerical financial indicators, claimed counts, or speculative throughput portrayed as financial actuals.
- **Responsive:** side-by-side source and flow panels on wide screens; navigable vertical flow and one selected path at 390/320 px, with legend and legal/observed/potential grammar present.
- **Evidence acceptance:** future ROOK recovery must pass Evidence Integration before it changes financial/sanctions source-of-truth. Visual reconstruction must not quietly consume unaccepted PR #297 candidates.

## Implementation acceptance

1. Build actual comparative chart against accepted records and label all observed/forecast/revision semantics.
2. Add ECharts deterministic-parity tests across every original country/value/source ID; verify signed arithmetic only as an invariant.
3. Build sanctions interactive network, state/evidence semantics and meaningful flow/cascade, not stacked cards presented as complete.
4. Capture and inspect 1920, 1440, 1024, 768, 390, 320 px screenshots of **new implementations**, not existing baselines.
5. Retain the protected chart throughout; remove only on separately authorized exact quantitative/method/source parity migration.
6. Exact-SHA qualification, side-by-side approved mockup comparison, and deployed screenshot/live artifact attestation.

**Current status of this contract:** specification reconstructed; neither new analytical chart nor sanctions interactive reconstruction is implemented by this document. Do not declare Phase 3 done or awaiting approval merely because CI screenshots of the old visual surfaces exist.
