# Validation Report — 2026-08-20 Engineering Migration

## Passed locally

- v2.9 root handoff preserved as `snapshots/Iran War Map 20260820.html` before migration.
- HTML contains no duplicate IDs.
- All 14 navigation controls resolve to existing panels.
- Required Introduction, current picture, timeline, verified losses, facilities, strike effects, satellite BDA, missiles/drones, economics, Arctic/logistics, claim checks, sources and historical snapshots modes exist.
- All committed JSON files parse successfully.
- `js/navigation.js` and `js/app.js` pass `node --check`.
- Local CSS/JS/image references resolve to committed files.
- Canonical URL, Open Graph and Twitter/X metadata are present and use the stable GitHub Pages URL.
- `assets/social-preview.png` is a valid 1200×630 PNG.
- Mobile CSS overrides the older v2.9 rule that hid `.mapwrap` below 850 px and gives primary tab controls ~44 px minimum tap height.
- Existing blank strategic CLAIM CHECK cards caused by the old timeline renderer were corrected; the renderer now distinguishes strategic claim-check milestones from the structured claim ledger.
- v2.7 information-war claims and influence-network data are migrated into the modular data architecture without deleting the original v2.7 files.

## Browser execution limitation in this workspace

A real Chromium/Playwright layout pass was attempted. The runtime contains Chromium and Playwright, but administrator policy blocks browser navigation to both `file://` and localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`). Therefore desktop/mobile screenshots from an executing browser are **not claimed as passed** in this workspace.

## Required post-deploy verification

After publishing to GitHub Pages, verify at minimum:

1. 1440×900 desktop: Introduction, map, layer buttons, Timeline, Verified losses, Historical snapshots.
2. 390×844 mobile: no page-level horizontal overflow; map remains visible outside Verified losses; tabs are touch-scrollable; loss dashboard reflows to one/two columns.
3. Block the Leaflet CDN once and confirm all evidence panels remain readable and the map shows the explicit degraded-mode message.
4. Verify Facebook/Open Graph preview resolves `https://ejronin.github.io/ISR/assets/social-preview.png`.
5. Run `python scripts/validate.py` and require a zero exit code.
