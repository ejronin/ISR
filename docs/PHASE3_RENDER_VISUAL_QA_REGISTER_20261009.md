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


## October 11 continuation — exact-head qualification and evidence acceptance boundary

**Phase 3 head at audit:** `10e8b5161dc1d7e52f06c99b8d83fab3b2dbdddc` (PR #295, open/draft; not merged).
**Recorded first exact-head run:** `37931760337` — **FAIL** at screenshot review. All earlier cited reader/IA/Phase 5/Phase 6/Batch 3/full-stack gates passed; this is not a release pass.

### Reproduced stop

`tests/browser-public-render-review.js` waits for `.guide-protected-economic-chart` on `hormuz.economy` and times out. The class is only installed when `economy()` finds an existing forecast section by heading via `findSection()`; it must not be manufactured or a non-chart substituted simply to satisfy the screenshot target.

**Next technical action:** inspect the actual staged `hormuz.economy` section headings and route DOM at 1440/390, establish whether the protected forecast section is missing, renamed, reparented, or delayed, and repair the smallest valid cause. Confirm the captured element contains the unchanged accepted chart and that `chartState` readiness assertions apply to the actual chart element, not an unmarked outer section. Re-run exact-head qualification before visual approval.

### Scheduled Atlas / ROOK evidence reconciliation gate

GitHub PR history checked at this audit shows the latest **merged Evidence Integration** intake is PR #294, accepting sequence 34 through **2026-10-07 14:03 ET**. Relevant already-merged intake includes #291–#294 and analysis refresh #290. These contain the Oct. 7 nuclear/IAEA status, maritime attack counts, Iran–Hezbollah transfer with attribution limits, Iraq devaluation, Turkey/Saudi support, oil-price snapshot and China substitution/OFAC context. The present `economy()` source already shows some of those Oct. 7 accepted facts; this source inspection alone does not certify visual/public state parity.

**Outstanding acceptance gap:** any scheduled sweeps after Oct. 7 14:03 ET require discovery and origin-to-consumption reconciliation before declaring the current Atlas state complete. No post-cutoff sweep should be backdated, invented, or promoted through the renderer. Evidence Integration must accept/qualify such data in canonical state first; Phase 3 must regenerate against that accepted release and check source/date/amount/denominator/attribution on economy and sanctions surfaces. If no post-cutoff sweeps are found, mark **COLLECTION/INGESTION STATUS UNVERIFIED**, not `NO EVENTS`.

**Merge gate:** blocked pending valid visual captures, accepted evidence-horizon reconciliation, current-release parity, responsive review, exact-head PASS, and visual approval.
