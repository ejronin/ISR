# Phase 3 Renderer Visual QA, Defect Register

**Baseline:** `main` merge `aaae881d050959c61dddde4d6a3d9de32819ac47` (PR #284).
**Qualified renderer:** `0881db7de7203e7235623606962006202a830b8f`.
**Render artifact:** GitHub Actions `11521318471` (run `37710923550`).
**Scope:** presentation, responsive rendering, screenshot reproducibility and data-preserving visualization only.
**Status:** Audit in progress. This file does not declare visual acceptance or authorize changes to source data.

| ID | Severity | Finding and inspected evidence | Verification | Next action | Status |
| --- | --- | --- | --- | --- | --- |
| VIS-301 | High | `src/public-reader-registry.js` `economy()` preserves the existing chart with `guide-protected-economic-chart`; `docs/VISUALIZATION_PLATFORM_CONTRACT.md` mandates retaining economic charts until parity approval. | Source verified; actual production screenshot requires review. | Capture and compare baseline at each width. Specify an additive financial-style histogram from accepted comparable observations; do **not** replace protected renderer or alter any values without explicit parity qualification. | Open, not a regression |
| VIS-302 | High | `data/sanctions-financial-network-v1.json` contains approved `plumbing`, `cascade`, named nodes and separately qualified legal/observed/potential effects; `tests/browser-public-render-review.js` previously covered the sanctions map/plumbing but not the cascade as a dedicated Phase 2 focus. | Dataset and screenshot-coverage gap verified; rendered design parity still unverified. | Capture both financial plumbing and transmission chain at desktop/tablet/mobile. Compare with accepted mockup and locate concrete legibility, interaction, source-link or state distinctions defects before changing renderer. | Coverage fix committed; design verification open |
| VIS-303 | High | PR #284 merged but CI artifact presence alone does not prove deployed production visual parity. | Merge SHA and artifact metadata confirmed; live-site inspection not completed. | Compare artifact screenshots to deployed routes; record actual selectors, viewport, reproduced defect and screenshot link for each fix. | Open |
| VIS-304 | Medium | Economy view exposes mode controls and existing baseline, but the target financial-grade presentation remains a distinct parity-migration requirement under visual architecture section 8.12. | Source verified; numeric/method parity not evaluated. | Audit source-series unit/date/forecast comparability, make separate ECharts candidate with explicit data and semantic parity tests before proposing renderer migration. | Open |

## Capture requirements

Use the existing `tests/browser-public-render-review.js` suite with widths `1920, 1440, 1024, 768, 390, 320`. Dedicated visual targets now include the protected economy baseline, economy mode controls, sanctions money-flow and sanctions transmission chain. A screenshot selector is an observation target, not proof that a component is correct.

## Non-negotiable gates

1. Accepted source wording, evidence references, calculations, economic series, sanctions statuses and chronology remain unchanged.
2. Unknown is never plotted as zero; observed effects are not drawn as potential effects; sanctions designations are not presented as proof of stopped flows.
3. Financial comparisons require explicit unit, date, population/denominator, source and observed-versus-forecast labeling.
4. Existing protected economic chart must remain available until independently qualified replacement receives approval.
5. WOL/Lie Ledger evidence and adjudication content is read-only.
6. No merge or deployment until exact-head automated and responsive-render verification and user review.
