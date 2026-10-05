# Visualization Platform Lab

This directory is the isolated architecture prototype for the Visualization Platform Contract.

It is **not a public route**, is **not part of the signed public release**, and does not authorize page migration.

## Current-data inputs

The lab reads only current repository/generated Guide material:

- `assets/geography/atlas-reference-geography.geojson`
- `data/oil-routes-r1.json`
- `data/sanctions-financial-network-v1.json`
- `data/integration-v1.2/economics.json`
- generated `data/public-current-state.json` for the current WOL propagation graph

No fictional war records are substituted if an input is unavailable.

## Run

From this directory:

```bash
npm install
npm run data
npm run verify
npm run dev
```

Then open:

```text
http://127.0.0.1:4173/prototypes/visualization-platform/
```

The Vite development root is the repository root so the prototype reads the same current files in place.

## Build the isolated proof

```bash
npm run build
npm run preview
```

Open the same `/prototypes/visualization-platform/` path on the preview server.

The build step first regenerates the existing derived current-state artifacts, verifies the prototype inputs, then copies only the five prototype data inputs into `prototypes/visualization-platform/dist/` so the preview remains self-contained. That `dist/` tree is prototype output, not a production release artifact.

## Dependency boundary

The package pins exact top-level prototype versions. npm remains a **prototype/build-time** mechanism only. Production adoption still requires the contract's stronger rule: vendor the exact runtime/worker/layout artifacts, preserve licenses, classify every public asset, content-address it, bind it in the public-release manifest, and qualify it under the production CSP.

The MapLibre proof uses the v6 split worker explicitly through a same-origin Vite-emitted worker URL. No remote map style, tile server, map API, glyph server, sprite server, or runtime CDN is used.

## Proofs

1. **MapLibre GL JS** — one camera across the current 110m / 50m / 10m Natural Earth-derived geography, current schematic routes, and current sanctions jurisdiction markers.
2. **Cytoscape + fCoSE** — current WOL propagation graph with full/direct/trace modes and reduced-motion-aware directional emphasis.
3. **Cytoscape + ELK** — current sanctions cascade, used to test layered directed layout rather than to argue that every linear flow should use a graph engine.
4. **Apache ECharts** — current stored economic forecast deltas, with SVG rendering and a DOM table equivalent.

See `docs/VISUALIZATION_PLATFORM_CONTRACT.md` for promotion gates and the stop condition.
