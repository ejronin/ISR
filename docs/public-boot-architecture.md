# Current public runtime and release architecture

The root document has one release-bound boot path. Current public state flows from accepted evidence through the canonical compiler and derived public read model; the browser never reconstructs that state by replaying dated update packages.

## Current boot sequence

1. `index.html` exposes metadata, the neutral `#atlas-root` loading state, and one content-addressed bootstrap script protected by SHA-256 Subresource Integrity.
2. The bootstrap loads generated `data/public-release.json` with `cache: no-store`. No renderer or current content executes before that manifest is validated.
3. The bootstrap validates its own path, hash marker, and SRI against the manifest. It then obtains the manifest-authorized, content-addressed Leaflet runtime/CSS, public stylesheet, public page registry, local reference geography, and application entrypoint.
4. The browser enforces SRI for every JavaScript and CSS asset. The bootstrap separately verifies the fetched GeoJSON bytes before exposing the presentation-only geography.
5. The application verifies that the authorized runtimes, stylesheets, entrypoint, and geography resolve to the same release. It loads `data/public-current-state.json`, verifies the normalized byte hash and byte count, and parses it once.
6. The application verifies schema and release binding, the derived cutoff and chronology count, event-ID uniqueness, per-event provenance, and source resolution.
7. It initializes `window.ATLAS_PUBLIC_STATE` and renders all 25 routes from the single validated in-memory model. The shared evidence resolver, source service, timeline, charts, and MapView consume that model; none owns a parallel evidence pipeline.

The initial document contains no chronology count, cutoff, current summary, old navigation, old map workspace, dated update card, or active application CSS. If the manifest, an authorized asset, or the model fails validation, the neutral shell becomes an explicit error state with **Retry** and **Open archived records**. A release mismatch receives one controlled same-origin reload; a repeated mismatch becomes the explicit error state.

## Signed release

`data/public-release.json`, `data/public-current-state.json`, `data/canonical-current-state.json`, and `assets/releases/` are deterministic generated artifacts and are Git-ignored. `scripts/build_public_release.py` emits normalized, content-addressed copies of the neutral bootstrap, Leaflet runtime/CSS, application stylesheet, page registry, reference geography, application entrypoint, and only the evidence images referenced by the accepted current model. It binds those exact bytes and the current-state model in the manifest and fails if `index.html` does not bind the exact bootstrap.

This prevents a cache split from creating an old-code/new-model hybrid. A cached bootstrap can authorize only a manifest that names that bootstrap's exact hash. Application JS and CSS are immutable hash-addressed URLs protected by browser SRI, while the GeoJSON and model receive explicit byte verification.

Local evidence imagery may be published only when the accepted current model references a PNG, JPEG, or WebP under `assets/evidence/`. The release builder resolves links, enforces containment, fully decodes the image with the pinned build dependency, checks extension/format agreement, and publishes the original bytes at a content-addressed path. Absolute paths, URLs, traversal, link escapes, missing files, malformed content, extension mismatches, aliases, and unreferenced images fail closed or remain unpublished.

## Pages artifact boundary

`scripts/assemble_public_site.py` creates a closed artifact from the release manifest. Pages receives only:

- the neutral `index.html` and `.nojekyll` marker;
- the exact content-addressed assets authorized by `data/public-release.json`;
- `data/public-release.json` and `data/public-current-state.json`;
- the social preview;
- immutable files under `snapshots/`;
- deployment-generated `build-info.json`.

Raw canonical packages, source registries, schemas, mutable source modules, vendor source trees, and retired presentation layers are not public deployment inputs. `scripts/assemble_public_site.py --check`, `scripts/validate_public_runtime_inventory.py --site-root`, and `scripts/validate_public_deployment.py --site-root` enforce the closed inventory and signed-byte contract.

## Presentation classification

`config/public-runtime-inventory.json` is the deterministic ownership ledger for presentation files. It identifies:

- seven current signed source roles;
- the neutral shell and deployment support files;
- retired JavaScript, CSS, icons, flags, Mermaid, and the Phase 1 reference retained only for historical tests and engineering audit;
- pinned Leaflet package support retained at build time;
- generated artifacts and immutable snapshot roots.

Every top-level JavaScript and stylesheet must appear in exactly one current or archive classification. Adding an unclassified presentation module fails validation. Current sources are scanned for retired boot references, and the assembled artifact rejects any unmanifested file. This preserves the old implementation record without leaving an alternate public boot path.

The reviewable root source is `templates/public-index.html`; it must remain byte-identical to `index.html`. The retired large root is preserved at `legacy/phase1-public-runtime-reference.html` and is not deployed. Historical JavaScript/CSS continues to support frozen package tests where required, but it is not an application dependency and cannot execute in the current site.

## Security and network boundary

The current Content Security Policy permits scripts, styles, connections, and fonts only from the same origin. Images are same-origin plus `data:` and `blob:` for verified local presentation. The application uses no external tiles, fonts, routing service, image host, or analytics endpoint. MapView consumes the checked-in Natural Earth subset and signed evidence assets only.

The release builder's strict evidence-image decoder is build-time only. It is installed from `requirements-build.txt` by both validation and deployment workflows and is not shipped to browsers.

## Tests and measurements

The public boot smoke proves a neutral delayed-model state, current-model rendering, dated-loader non-execution, explicit model failure, controlled release mismatch, and split-release SRI rejection. Public route, evidence, map, responsive, keyboard, and reduced-motion suites exercise the current renderer. The runtime inventory test assembles a temporary Pages tree, proves it excludes raw/mutable presentation sources, and deliberately injects a dated loader to verify fail-closed rejection.

`validate_public_deployment.py` reports model bytes and deterministic gzip-9 bytes. Phase 7 reporting compares the accepted starting commit's current JS/CSS source bytes with the cleaned result and separately records signed runtime asset count, geography bytes, model bytes, and gzip bytes.
