# Guide Phase 1 Review Mockup Package

This document is the review gate between the approved page-level visual architecture and production renderer migration.

## Scope

The package at `mockups/guide-phase1-review/` contains desktop and mobile references for all seven Phase 1 pages defined in `docs/GUIDE_PAGE_VISUAL_ARCHITECTURE.md`.

The mockups are deliberately presentation-only. They demonstrate hierarchy, analytical object choice, state grammar, interaction framing, and mobile recomposition. They do not introduce factual content.

## Gate

A Phase 1 page is ready for production implementation only after the corresponding mockups prove the acceptance row in **§15.1 Phase 1 mockup acceptance matrix** of the controlling architecture specification.

No broad page migration is authorized by this package.

## Preservation

The renderer must continue to preserve:

- accepted wording and record membership;
- EvidenceDrawer/source relationships;
- protected economic charts/calculations/series;
- accepted map points, route IDs, and route geometry;
- all WOL nodes, edges, directionality, relationship semantics, findings, and receipts;
- unknown-vs-zero and claimed-vs-verified distinctions;
- ROOK / Evidence Locker / deterministic release behavior.

Any visual that cannot be implemented without changing one of those items is a conflict to escalate, not a renderer decision.
