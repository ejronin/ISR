# Phase 2 public boot architecture

Phase 2 replaces the root document's dated presentation replay with one release-bound boot path. It does not perform the Phase 3 information-architecture or visual redesign.

## Current boot sequence

1. `index.html` exposes metadata, the neutral `#atlas-root` loading state, critical shell CSS, and one script: `js/public-app.js`.
2. The entry point loads generated `data/public-release.json` with `cache: no-store`.
3. It verifies the document/application protocol and the manifest's application-asset inventory.
4. It loads generated `data/public-current-state.json`, verifies its normalized byte hash and byte count, and parses it once.
5. It verifies the read-model schema, application/read-model release binding, cutoff identity, 205-record chronology, event-ID uniqueness, per-event provenance, and source resolution.
6. It initializes `window.ATLAS_PUBLIC_STATE` and performs the first current public render.
7. Current-record sections read only from that validated in-memory model. Dataset inspection is lazy, but no second current-state reconstruction occurs.

The initial document contains no chronology count, cutoff, current summary, old navigation, map workspace, or dated latest-update card. If the release manifest or model cannot be loaded and validated, the shell becomes an explicit error state with **Retry** and **Open archived records**. A release mismatch receives one controlled same-origin reload; a repeated mismatch becomes the explicit error state.

`data/public-release.json` is deterministic and Git-ignored. `scripts/build_public_release.py` binds the exact normalized bytes of `index.html`, `css/public-shell.css`, `js/public-app.js`, and `data/public-current-state.json`. `scripts/validate_public_deployment.py` verifies that binding inside the final Pages directory.

The former root was a 340 KB largely single-line document. To keep the Phase 2 pull-request diff below the reviewer's per-diff limit, `.gitattributes` marks the replaced root as generated/non-diffable and `templates/public-index.html` carries an exact, normally reviewable source copy of the new shell. The release builder and static validator fail if those two files differ.

## Legacy runtime classification

The original root document is retained as the repository-only `legacy/phase1-public-runtime-reference.html` so frozen UI/data validators can continue checking the presentation that produced the prior public state. Pages packaging does not copy `legacy/`, and the current root does not link to or execute it.

### Still required during Phase 2

- `js/public-app.js` — the new single owner of loading/error state, release initialization, application state, and the top-level current render.
- `css/public-shell.css` — the Phase 2 shell and temporary read-model browser presentation.

No module from the former presentation stack remains required during current boot. Keeping one old renderer active would reintroduce competing shell/current-release ownership.

### Data/build only

These dated runtime modules remain in the repository because their corresponding packages and frozen validators are part of the historical/build record. Their current-state assembly behavior is now owned by `scripts/build_public_current_state.py`; none executes from `index.html`:

- `js/current-update-20260824.js`
- `js/current-update-20260825.js`
- `js/current-update-20260825-late.js`
- `js/current-update-20260826.js`
- `js/wiki-map-reconciliation-20260826.js`
- `js/current-update-20260827.js`
- dated successor-script injection and readiness events in those modules

The canonical JSON packages those modules used are unchanged and remain authoritative inputs.

### Legacy presentation

These modules are preserved for audit, historical tests, and Phase 3 reference, but do not execute during current public boot:

- original shell/data owners: `js/app.js`, `js/navigation.js`, `js/state.js`, `js/temporal.js`, `js/presentation.js`, `js/safe-render.js`, `js/costing.js`, `js/forensic.js`;
- Aug. 22 workspace/presentation layers: `js/full-scope-core.js`, `js/full-scope-20260822.js`, `js/workspaces-20260822.js`, `js/endgame-20260823.js` and the Endgame follow-on modules;
- post-render replacement/repair layers: `js/rebuild-v1.3.3.js`, `js/casualty-dashboard-hotfix.js`, `js/public-record-ui-r2.js`, `js/public-housekeeping-r1.js`, `js/status-identity-r1.js`, `js/site-legibility-r3.js`, `js/source-bias-r1.js`, and the workspace/Endgame plain-language passes;
- compatibility/remount layers: `js/iran-messaging-r1.js`, `js/iran-messaging-shifts-20260827-r1.js`, `js/endgame-current-20260825-r2.js`, and related MutationObserver/timer-based remount logic;
- legacy map/chart overlays: `js/china-oil-sourcing-shift-r1.js`, `js/final-mermaid-oil-routes-r1.js`, `js/mermaid-autofit-r2.js`, `js/endgame-mermaid-r2.js`, and related presentation helpers.

Their CSS files also remain preserved but are not linked by the current root.

### Deferred to Phase 3

No legacy module is allowed to operate temporarily under this label in Phase 2. The following *capabilities* are deferred for clean, single-owner reimplementation from the read model: coordinated map/layer state, spatial-temporal timeline selection, specialized MOU and objectives presentation, Iran Messaging visual lanes, Mermaid interactions, advanced source context, and page-specific charts. Existing modules and CSS are reference implementations, not live owners.

The temporary Phase 2 renderer preserves direct access to the complete 205-record chronology, exact event-source variants, all seven page-data mappings, every embedded approved dataset, and the complete 362-record source catalog. It deliberately does not emulate the old map or repair-driven specialized views.

## Test transition

The retired `browser-mou-strike-smoke.js` and `browser-aug27-messaging-smoke.js` depend on the legacy DOM and successor globals, so they remain in the repository but are no longer current-root acceptance tests. `browser-public-boot-smoke.js` replaces them at the Phase 2 boundary and proves:

- the loading shell remains neutral while the current model request is paused;
- the validated 205-record state and Aug. 27 cutoff initialize after release verification;
- no dated successor or repair script executes;
- a model fetch failure exposes only the explicit error state;
- a release mismatch performs one controlled reload and then exposes only the explicit error state.

Frozen data/package validators continue to run. Validators whose old assertions concerned `index.html` now inspect the repository-only legacy reference for those frozen expectations and separately enforce the new root through the public boot/deployment gates.

## Performance observation

The deploy validator reports uncompressed and deterministic gzip-9 model sizes. The browser smoke test records model transfer bytes, load/integrity time, and JSON parse time from `window.ATLAS_PUBLIC_STATE.performance`. Page-specific splitting and indexes remain Phase 3 optimization candidates; Phase 2 prioritizes correct ownership.
