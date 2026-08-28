# Phase 2 public boot architecture

Phase 2 replaces the root document's dated presentation replay with one release-bound boot path. It does not perform the Phase 3 information-architecture or visual redesign.

## Current boot sequence

1. `index.html` exposes only metadata, the neutral `#atlas-root` loading state, and one content-addressed bootstrap script with a SHA-256 Subresource Integrity value.
2. The neutral bootstrap loads generated `data/public-release.json` with `cache: no-store`. The real renderer has not loaded and cannot execute at this point.
3. The bootstrap validates its own path, hash marker, and SRI value against the manifest. It then obtains the manifest-authorized, content-addressed stylesheet, public page registry, and application entrypoint.
4. The browser enforces each authorized asset's SHA-256 SRI while loading it. Only after the stylesheet and inert page registry succeed does the bootstrap load the application entrypoint.
5. The application validates that authorization, its executing script element, the active page registry, and the active stylesheet against the same manifest. It then loads generated `data/public-current-state.json`, verifies its normalized byte hash and byte count, and parses it once.
6. The application verifies the read-model schema, release binding, cutoff identity, 205-record chronology, event-ID uniqueness, per-event provenance, and source resolution.
7. It initializes `window.ATLAS_PUBLIC_STATE` and performs the first current public render. Current sections read only from that validated in-memory model.

The initial document contains no chronology count, cutoff, current summary, old navigation, map workspace, dated latest-update card, or active application CSS. If the manifest, authorized asset, or model cannot be loaded and validated, the neutral shell becomes an explicit error state with **Retry** and **Open archived records**. A release mismatch receives one controlled same-origin reload; a repeated mismatch becomes the explicit error state.

`data/public-release.json` and `assets/releases/` are deterministic generated artifacts and are Git-ignored. `scripts/build_public_release.py` emits normalized, content-addressed copies of the neutral bootstrap, application stylesheet, and application entrypoint; binds those exact bytes and the current-state read model in the manifest; and fails if `index.html` does not bind the exact bootstrap. `scripts/validate_public_deployment.py` verifies the same contract inside the final Pages directory.

This design prevents a cache split from creating an old-code/new-model hybrid. A cached bootstrap can authorize only a manifest that names that bootstrap's exact hash, while application JS and CSS are immutable hash-addressed URLs protected by browser SRI. A same-version asset with different bytes is rejected before it can execute.

The former root was a 340 KB largely single-line document. To keep the Phase 2 pull-request diff reviewable, `.gitattributes` marks the replaced root as generated/non-diffable and `templates/public-index.html` carries an exact reviewable source copy. The release builder fails if the two differ.

## Legacy runtime classification

The original root document is retained as repository-only `legacy/phase1-public-runtime-reference.html`; Pages packaging does not copy `legacy/`, and current boot does not link to or execute it.

The original top-level `data/*.json` runtime datasets also remain untouched for historical/reference inspection. The derived model classifies their `legacy.*` entries as `HISTORICAL_REFERENCE_DATA` and does not map them into any current page. Current mappings use the canonical ledger, normalized chronology/source catalog, accepted reconciliation, forensic products, and approved analytical datasets.

### Still required during Phase 2

- `js/public-bootstrap.js` — neutral manifest resolver and the only script bound by `index.html`.
- `js/public-ia.js` — manifest-authorized registry of permanent routes, page owners, shared public components, and shell navigation.
- `js/public-app.js` — manifest-authorized owner of model loading, current state, errors, and page-registry initialization.
- `css/public-shell.css` — manifest-authorized Phase 2 shell and temporary read-model presentation.

No former presentation module remains required during current boot.

### Data/build or historical reference only

The dated update/reconciliation modules and original presentation, repair, remount, map, chart, and compatibility modules remain in the repository for canonical package assembly, frozen tests, and audit reference. None executes from `index.html`. Their canonical JSON inputs remain authoritative and unchanged.

### Deferred to Phase 3

Coordinated map/layer state, spatial-temporal selection, specialized MOU/objectives/Iran Messaging presentation, route/Mermaid interactions, advanced source context, and page-specific charts remain Phase 3 work. Existing legacy modules are reference implementations, not live owners.

The temporary Phase 2 renderer preserves direct access to the complete 205-record chronology, exact event-source variants, all seven current page-data mappings, every embedded approved dataset, and the complete source catalog. It deliberately does not emulate the old map or repair-driven specialized views.

## Test transition

`browser-public-boot-smoke.js` proves that the loading shell stays neutral during a delayed model request; the validated 205-record Aug. 27 state renders; dated successor/repair scripts do not execute; model failure stays explicit; a manifest mismatch receives one controlled reload; and the exact split-release case—different old-but-valid application bytes served at the new content address—is blocked by SRI before the renderer can execute.

Frozen data/package validators continue to run. Validators whose old assertions concerned `index.html` inspect the repository-only legacy reference and separately enforce the new root through the public boot/deployment gates.

## Performance observation

The deploy validator reports uncompressed and deterministic gzip-9 model sizes. The browser smoke records model transfer bytes, load/integrity time, and JSON parse time from `window.ATLAS_PUBLIC_STATE.performance`. Page-specific splitting and indexes remain Phase 3 optimization candidates; Phase 2 prioritizes correct ownership.
