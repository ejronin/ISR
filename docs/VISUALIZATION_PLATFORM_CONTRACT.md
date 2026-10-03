# Visualization Platform Contract

**Status:** Architecture decision record and prototype gate  
**Product:** The 2026 Iran War Guide  
**Assessment date:** 2026-10-03  
**Facelift state:** broad page-body migration remains paused  
**Authority boundary:** presentation/runtime only; no evidence authority

This contract is subordinate to:

- `docs/IRAN_WAR_GUIDE_FACELIFT_CONTRACT.md`
- `docs/ENGINEERING_DOCTRINE.md`
- `docs/ROUTINE_UPDATE_PIPELINE.md`
- `docs/public-ia.md`

It does not authorize any change to accepted evidence, adjudications, sources, wording, chronology, route geometry, map semantics, WOL relationships, economic calculations, or protected chart values.

The representative implementations in `prototypes/visualization-platform/` are an isolated engineering lab. They are not public routes, are not part of the signed release inventory, and must not be promoted into production merely because they exist.

---

## Executive decision

The Guide should not use one renderer for every information class.

The target platform is:

| Information class | Contract state | Target |
| --- | --- | --- |
| Maps | **REPLACE** | MapLibre GL JS for primary cartography; retain the current Leaflet MapView as the production implementation until signed-runtime, browser, WebGL2 and fallback gates pass |
| WOL networks | **UPGRADE** | Keep Cytoscape.js; evaluate fCoSE as the full-network layout and use deterministic presentation positions; preserve the existing interaction/evidence model |
| Directed flows | **PROTOTYPE FIRST** | Native HTML/CSS/SVG for simple flows; Cytoscape + ELK only for branching or genuinely graph-shaped directed diagrams |
| Quantitative charts | **KEEP** existing / **PROTOTYPE FIRST** future migrations | Keep protected current economic charts unchanged; use modular Apache ECharts as the default for future quantitative chart classes and separately approved faithful renderer migrations |
| General page layout | **KEEP** | Native semantic HTML, CSS Grid, Flexbox, custom properties and container queries; continue upgrading shared primitives without changing platform |
| Bootstrap | **KEEP OUT** | Do not adopt it; it does not solve the visualization or editorial-composition problem |
| Icons | **UPGRADE** | Vendored, pinned Lucide SVG subset; no icon runtime; existing country flags remain untouched |

The key architectural change is not a wholesale framework swap. It is a **capability-based visualization layer** that preserves the current signed read model and loads expensive renderers only on routes that need them.

---

# A. Current-stack audit

## A1. Signed public runtime

The current public boot architecture is strong and remains controlling:

1. `index.html` exposes only the neutral first-paint shell and the content-addressed bootstrap.
2. The bootstrap loads and validates `data/public-release.json`.
3. The manifest authorizes the current runtime, stylesheets, reference geography and entrypoint.
4. SRI is enforced for browser-loaded JavaScript and CSS.
5. Reference geography is fetched and byte-verified before use.
6. The application verifies the public current state, release identity, provenance and source resolution before promotion.
7. Every public route reads the same validated in-memory model.

The visualization architecture must fit this model. It must not create a second evidence path.

### Current eager-load issue

The present manifest treats both `map_runtime` and `graph_runtime` as mandatory fixed roles. `js/public-bootstrap.js` loads all authorized stylesheets, then all authorized runtimes, then reference geography, then the entrypoint. Therefore Leaflet and Cytoscape are paid for on routes that do not use either renderer.

Current source snapshot:

- Leaflet 1.9.4: `vendor/leaflet/leaflet.js` (~148 KB raw) plus CSS (~14 KB raw)
- Cytoscape.js 3.34.0: `vendor/cytoscape/cytoscape.min.js` (~435 KB raw)
- reference geography: `assets/geography/atlas-reference-geography.geojson` (~282 KB raw)
- base public IA runtime: `js/public-ia.js` (~414 KB raw)

The first platform optimization should therefore be **signed lazy activation**, not indiscriminate component rewriting.

## A2. Geography

The current map is not a remote-tile application. It already uses a checked-in, signed Natural Earth derivative built deterministically from pinned Natural Earth v5.1.1.

The current reference geography contains 58 features across three presentation layers:

- `western_context_110m`: 25 features
- `regional_50m`: 27 features
- `hormuz_10m`: 6 features

The current `MapView` preserves:

- record-derived locations;
- stable route IDs;
- current route geometry;
- selected-record relationships;
- accepted precision/semantic constraints;
- text fallback behavior;
- current focus behavior;
- signed reference geography.

The current route file `data/oil-routes-r1.json` contains four `SCHEMATIC_REFERENCE_ROUTE` records and explicitly states that the lines are not live tracks or surveyed alignments. That policy remains unchanged.

### Documentation defect

`THIRD_PARTY_NOTICES.md` still describes OpenStreetMap raster tiles as a runtime dependency. That is stale relative to the current signed boot architecture and current MapView. Correct it when the visualization dependency change is promoted; do not use the stale notice as architectural authority.

## A3. WOL network

WOL already uses Cytoscape.js 3.34.0 and the current derived `analysis.web_of_lies.propagation_graph`.

The renderer already has several correct behaviors:

- actor/edge selection is presentation-only;
- selected neighborhoods are derived from existing accepted graph edges;
- unrelated elements are dimmed to 0.12 opacity;
- selected actors and connections are strongly emphasized;
- a separate textual detail surface exists;
- the graph fails to a textual record when the runtime is unavailable.

The current layout is CoSE with `randomize: true`. That is the principal layout defect. It produces needless spatial churn between identical data loads and weakens visual memory.

The current wheel configuration (`wheelSensitivity: 0.22`) can also hijack page scrolling when the pointer is over the graph. The target interaction contract changes that behavior.

## A4. Directed flows

The Guide already contains diagram-shaped information that is not necessarily a graph problem. The current Sanctions & Impact presentation is a good example:

- the financial-plumbing object is a small semantic composition;
- the five-step sanctions cascade is an explicit ordered sequence;
- neither requires a physics layout engine merely to look polished.

ELK is justified only when the accepted relationship set forms a branching directed graph where automatic layering materially improves comprehension.

## A5. Quantitative charts

Current economic visuals are custom DOM/SVG and are explicitly protected by the facelift contract.

They include semantics that must not be lost in a renderer migration, including:

- recorded-snapshot-only plotting;
- no invented interpolation;
- explicit separation of sanction timing from GDP data;
- explicit “what if nothing else changed” treatment after the last recorded snapshot;
- current source/date relationships;
- current forecast values and calculations.

No production ECharts dependency exists today.

## A6. Page composition

The current shell already proves that native CSS can implement the approved Guide system: semantic layout, editorial width, elastic analytical regions, responsive recomposition, sticky guide chrome and dark analytical surfaces.

Bootstrap would add a generic layout/component abstraction without solving maps, graphs, causal diagrams, chart semantics, signed lazy runtime loading, or evidence relationships.

## A7. Iconography

The current system is mixed:

- country flags are checked-in SVG assets and are protected;
- a small legacy icon set exists;
- Lucide is already represented by a vendored eye icon and notice;
- Leaflet contributes marker PNG assets.

The target is a **vendored SVG subset**, not an icon-font or runtime package.

---

# B. Recommended platform matrix

## Maps — REPLACE, STAGED

**Target:** MapLibre GL JS 6.11.2, self-hosted, no external style, glyph, sprite, map API or remote tile dependency.

MapLibre is selected because the approved visual direction requires one continuous camera and zoom-dependent cartographic grammar from theater to Gulf to Hormuz. That requirement materially favors a style/layer engine over DOM/SVG overlay composition.

Leaflet remains production until the MapLibre implementation passes the gates in this contract. Because MapLibre GL JS v6 requires WebGL2, Leaflet is also the preferred signed fallback candidate for browsers/devices where qualified WebGL2 is unavailable.

## WOL networks — UPGRADE

**Keep:** Cytoscape.js 3.34.0.

**Layout target:** fCoSE for full network only if the prototype/performance gate proves a material readability or initialization improvement. Do not change graph semantics to fit the layout.

**Directed subviews:** ELK only when a user asks to trace a directed accepted chain or when a separate directed diagram truly benefits from layering.

## Directed flows — UPGRADE / SELECTIVE

Use this order:

1. semantic HTML + CSS Grid/Flex for a short linear sequence;
2. native SVG where connectors/annotations are simple and deterministic;
3. Cytoscape + ELK only for branching, interactive directed relationship graphs.

Do not use ELK for a five-box row merely because ELK is available.

## Quantitative charts — KEEP + UPGRADE

- **KEEP** all protected current economic chart calculations and current renderer during this facelift.
- **UPGRADE** future quantitative chart classes to modular Apache ECharts.
- A later renderer migration may reproduce an existing chart only after pixel/semantic/data parity tests prove that the same input values, annotations and caveats survive unchanged.

## General page layout — KEEP / UPGRADE

Continue with:

- semantic HTML;
- CSS Grid;
- Flexbox;
- CSS custom properties;
- container queries;
- existing Guide shell primitives.

## Icons — UPGRADE

Use a build-vendored Lucide SVG subset pinned to an exact upstream release/commit. Inline/sanitize only the required SVGs. No remote icon fetch and no icon JavaScript runtime.

Existing country flags remain unchanged.

---

# C. Leaflet vs MapLibre decision

## Why Leaflet is still good

Leaflet remains a strong fit when the job is:

- a modest number of markers;
- a few schematic routes;
- straightforward fit-bounds behavior;
- low runtime cost;
- broad non-WebGL compatibility;
- DOM/SVG interaction.

If the facelift requirement were only “restyle the current maps,” Leaflet should remain.

## Why the Guide has crossed the threshold

The approved target is now a **continuous cartographic system**, not a set of isolated marker canvases.

The desired theater → Gulf → Hormuz experience needs:

- resolution-aware geography in one map;
- declarative zoom thresholds;
- consistent camera policy;
- style-driven line hierarchy;
- controlled symbol/label behavior;
- clustering where appropriate;
- route emphasis/animation without rebuilding map DOM;
- future vector packaging without adopting a hosted map service.

MapLibre is materially better for that problem.

## Target source architecture

Initial production target:

```text
Natural Earth v5.1.1 pinned source
        ↓
existing deterministic geography builder
        ↓
atlas-reference-geography.geojson
        ↓
signed/content-addressed public asset
        ↓
MapLibre GeoJSON source
        ↓
zoom-dependent 110m / 50m / 10m style layers
```

The current ~282 KB geography asset is small enough that PMTiles is **not required now**.

### PMTiles rule

PMTiles is an option, not a goal.

Adopt a PMTiles packaging step only if one or more of these becomes true:

- reference geography expands materially;
- many additional vector layers are introduced;
- transfer/runtime measurement shows GeoJSON parsing is a real bottleneck;
- the archive can be deterministically generated and range-served by the actual Pages deployment.

Until then, a signed same-origin GeoJSON asset is simpler and easier to verify.

## Worker and CSP policy

MapLibre GL JS v6 is ESM-only, requires WebGL2, and ships its worker as a separate module. Production must set an explicit same-origin worker URL and:

- self-host the worker;
- content-address and manifest-bind both the main module and worker;
- add only `worker-src 'self'` to the current CSP;
- keep `connect-src 'self'`;
- keep `img-src 'self' data: blob:`;
- never permit a CDN or hosted basemap merely to satisfy the renderer.

No `blob:` worker permission is necessary when the worker is self-hosted. The prototype therefore uses MapLibre's explicit worker URL path rather than relying on the default Blob-worker laundering behavior.

## Camera policy

Maps use named purpose-specific camera states rather than arbitrary per-page defaults.

- **Theater:** broad strategic context; 110m presentation geography.
- **Regional Gulf:** Gulf/Iran/Iraq/Red Sea operational context; 50m presentation geography.
- **Hormuz/detail:** Strait-level geography; 10m presentation geography.

Initial route load uses an immediate camera state. User-invoked camera transitions may animate. Under `prefers-reduced-motion: reduce`, all camera transitions become immediate.

Automatic fit-bounds must never zoom farther than the purpose of the map allows merely because a single record contains a remote coordinate.

## Labels

No external label provider.

Labels must come from one of:

- the pinned Natural Earth properties already approved for presentation;
- a checked-in presentation label registry with deterministic provenance;
- explicitly accepted record labels already in the read model.

The first MapLibre migration should avoid introducing a new geopolitical naming source.

## Clustering

Clustering is permitted for dense point sets only when it answers a density/overview question.

Never cluster:

- route geometry nodes;
- a selected evidentiary record out of visibility;
- records whose separation is semantically necessary.

Every cluster must expose its count and allow the reader to reach the exact underlying records.

## Route animation

MapLibre can animate line emphasis, but animation is **presentation state only**.

Permitted:

- subtle motion along an already accepted route;
- temporary emphasis after user selection.

Forbidden:

- animation that suggests current vessel movement;
- interpolation that makes a schematic route look surveyed;
- motion that implies direction where the record does not establish direction.

All route animation stops under reduced motion.

## Fallback

Production MapLibre must have two failure layers:

1. textual map summary/record list remains authoritative and usable;
2. Leaflet may remain a signed, lazy fallback for qualified browsers without WebGL.

A renderer failure must never suppress the underlying accepted record.

---

# D. Cytoscape layout strategy

## Normal mode — full network

- Cytoscape remains the renderer.
- Full network uses fCoSE only after the layout gate passes.
- Identical data must not begin from random positions.
- Production should generate or persist a **presentation-only layout snapshot** keyed by graph input hash, or start from deterministic sorted positions and `randomize: false`.
- A layout snapshot is never evidence and may be regenerated without altering WOL authority.

## Select actor — direct connections

On actor selection:

- selected actor: full emphasis;
- directly connected nodes/edges: strong emphasis;
- unrelated graph: 0.10–0.15 effective opacity;
- no relationship is added to make the neighborhood look fuller;
- detail panel is populated from the same accepted node/edge records.

The current 0.12 dimming behavior is already in the correct range.

## Trace mode

“Trace propagation” may highlight only existing directed graph edges.

The renderer may follow the accepted `from_node_id → to_node_id` direction to expose a reachable accepted chain. It must not create a transitive evidence assertion. The accessible text equivalent should enumerate every highlighted edge so the reader can see that the trace is edge-by-edge.

Suggested reader modes:

- **Direct connections**
- **Trace propagation**
- **Full network**

## fCoSE finding

fCoSE is a plausible upgrade, not a semantic change. It supports constrained placement and is designed to improve CoSE performance/aesthetics. The prototype therefore tests it against the actual WOL graph.

Promotion gate:

- same node/edge count before and after;
- no dropped/self-rewritten edges;
- less or equal overlap at common desktop/mobile widths;
- initialization budget met;
- stable visual result for identical graph input.

If it does not materially improve the actual graph, keep CoSE but make the existing layout deterministic.

## ELK inside WOL

Do not use ELK for the full WOL network.

Use ELK only for a separate directed trace/chain view where hierarchical direction is the reader’s primary question.

## Wheel zoom

Default graph behavior must preserve page scroll.

Target:

- wheel/pinch zoom disabled until the reader explicitly enables graph zoom or gives the graph an interaction mode;
- visible Zoom In / Zoom Out / Fit controls remain keyboard accessible;
- exiting graph interaction restores ordinary page scrolling;
- mobile one-finger vertical gestures scroll the page unless the user deliberately engages the graph.

## Directional animation

Cytoscape supports dashed-line offset styling. Directional motion may be applied only to the currently selected/trace edges.

Contract:

- restrained speed;
- arrows remain the primary direction cue;
- no perpetual animation on the entire network;
- animation stops when the trace is cleared, page is hidden, or reduced motion is requested;
- the animated edge set must equal an already accepted edge set.

---

# E. ECharts strategy

Apache ECharts is selected as the default **future quantitative visualization platform**, not as authorization to rewrite existing charts.

## Production import policy

Use tree-shaken modules from `echarts/core`, not the full monolithic distribution.

Initial allowed chart classes:

- line;
- bar;
- stacked bar;
- scatter;
- quantitative time axis.

Initial allowed components:

- grid;
- tooltip;
- legend;
- dataset;
- data zoom where the chart materially needs it;
- mark line / annotation support where required;
- ARIA component.

Prefer SVG rendering for normal Guide charts with modest point counts. Use Canvas for genuinely large datasets where measured performance requires it.

## Protected economic charts

During this facelift:

- calculations stay untouched;
- current values stay untouched;
- current snapshot semantics stay untouched;
- current sanctions timing semantics stay untouched;
- existing custom DOM/SVG renderers stay live.

A later migration must be a renderer-parity task, not a data-model task.

## Future default

New quantitative chart work should use ECharts unless a static native HTML/SVG solution is materially simpler.

Every chart must also expose:

- a concise authored summary;
- units;
- source/evidence path;
- a data table or equivalent text representation when values are important;
- color-independent differentiation where status or series identity matters.

---

# F. Native CSS vs Bootstrap decision

**Decision: do not add Bootstrap.**

Bootstrap provides no material advantage for the current problem.

The Guide needs:

- editorial/analytical width switching;
- object-specific responsive behavior;
- maps, graphs and charts with container-driven composition;
- a bespoke dark visual language;
- strict signed local assets;
- minimal runtime overhead.

Native Grid/Flex/custom properties/container queries already solve those needs directly and are already established in production.

Adding Bootstrap would create another styling contract while leaving every visualization decision unresolved.

---

# G. Runtime / CSP / signed-release impact

## Current defect to fix before renderer migration

Visualization runtimes are currently mandatory/eager. The target manifest needs a distinction between:

- **core runtime assets** required before application promotion;
- **signed optional capability assets** that may be activated after promotion on authorized routes.

Do not weaken validation to accomplish this.

## Recommended manifest capability model

A future manifest revision may add a structure equivalent to:

```json
{
  "capabilities": {
    "map": {
      "runtime": "...",
      "worker": "...",
      "stylesheet": "...",
      "geography": "...",
      "fallback_runtime": "..."
    },
    "network": {
      "runtime": "...",
      "layouts": ["..."]
    },
    "directed_flow": {
      "runtime": "...",
      "layout": "..."
    },
    "quantitative_chart": {
      "runtime": "..."
    }
  }
}
```

The exact schema may differ, but these rules are mandatory:

- every executable asset is manifest-authorized before load;
- every worker is manifest-authorized and byte-bound;
- every stylesheet is manifest-authorized;
- every geography/vector archive is manifest-authorized;
- every capability loader refuses unknown roles/paths;
- assets remain content-addressed;
- browser SRI remains in use where the browser supports it;
- resources without browser SRI support are fetched/verified or addressed by a manifest-bound immutable digest path before execution/use.

## CSP delta

Current policy stays intact except for the minimum worker permission required by MapLibre/ELK workers:

```text
worker-src 'self'
```

Do not add:

- `unsafe-inline`;
- `unsafe-eval`;
- wildcard origins;
- remote tile/style/glyph/image hosts.

## Browser qualification delta

The current browser lane is Chromium-only and launches with `--disable-gpu`.

Before MapLibre promotion, add a dedicated map qualification lane that proves:

- WebGL2/MapLibre initialization in the actual CI environment;
- no external network request;
- same-origin worker creation under production CSP;
- graceful no-WebGL fallback;
- desktop and mobile camera/bounds behavior.

The general reader qualification must continue to run even if the map-specific lane is isolated.

---

# H. Asset, dependency and licensing plan

## Current pins

- Leaflet 1.9.4 — BSD-2-Clause
- Cytoscape.js 3.34.0 — MIT
- Natural Earth v5.1.1 — public-domain source discipline already documented

## Prototype/target pins

- MapLibre GL JS 6.11.2 — BSD-3-Clause
- cytoscape-fcose 2.2.0 — MIT
- cytoscape-elk 2.3.0 — MIT
- elkjs 0.9.3 — EPL-2.0 under the current `cytoscape-elk` 2.3.0 dependency; production must pin the resolved artifact exactly
- Apache ECharts 6.1.0 — Apache-2.0
- Lucide — ISC, vendored SVG subset

Do not promote an RC dependency merely because upstream `main` has a newer package version.

## Vendoring rule

Production does not depend on npm/CDN at runtime.

For each promoted dependency:

1. pin exact version/commit;
2. preserve upstream license;
3. record upstream URL and version/commit in `VERSION.json` or equivalent;
4. vendor the exact production artifact;
5. classify it in `config/public-runtime-inventory.json`;
6. bind it in the public-release manifest;
7. add/update `THIRD_PARTY_NOTICES.md`;
8. add a CI rule rejecting remote runtime URLs.

Lucide should be vendored as sanitized individual SVGs, not as an application dependency.

The prototype's `package.json` pins exact top-level lab versions, but it is not the production dependency authority. Production promotion requires the complete resolved dependency closure to be pinned/vendored, license-reviewed, hashed, classified and manifest-bound before any runtime is allowed across the signed boundary.

Existing country flags remain untouched.

---

# I. Accessibility and reduced-motion contract

A visualization is never the only way to obtain a material fact.

## All visualizations

- semantic heading before the visualization;
- plain-language purpose/summary;
- keyboard-reachable controls;
- visible focus;
- status is not color-only;
- minimum 44×44 CSS-pixel touch targets for primary touch controls;
- focus never disappears after closing/resetting a detail surface;
- no surprise scroll or zoom capture.

## Maps

- adjacent textual summary/record list;
- map container gets a concise purpose label, not a dump of every feature;
- selected record is announced in a separate live/status region;
- pan/zoom does not spam screen readers;
- keyboard map interaction is explicit;
- no required information exists only in popup geometry.

## WOL graphs

- actor picker/list is the primary keyboard selection path;
- selected node/edge details exist as DOM text;
- a trace has an ordered textual edge list;
- graph canvas accessibility is supplemental, not the sole representation.

## Directed flows

- preserve logical DOM order;
- provide an ordered list/table equivalent;
- visual left-to-right vs top-to-bottom layout must not change semantic order.

## Charts

- authored chart summary;
- units and caveats adjacent to the chart;
- ECharts ARIA enabled when used;
- data table/text equivalent for important values;
- decal/shape/label differentiation where color alone would carry meaning.

## Reduced motion

When `prefers-reduced-motion: reduce` is active:

- no map fly/ease animation;
- no animated WOL edge dashes;
- no graph layout animation;
- no ECharts series transition animation;
- no decorative pulse that communicates state solely through motion.

---

# J. Responsive visualization contract

Visualizations respond to their **container**, not only the viewport.

Use container queries where the object’s own width determines the correct mode.

## Maps

- analytical width may expand beyond prose width;
- minimum usable height is purpose-specific;
- controls wrap rather than overlap;
- touch interaction must not block ordinary document scroll;
- detail cards move below the map on narrow containers.

## WOL

Desktop:
- graph + detail can coexist.

Narrow/mobile:
- graph becomes a full-width object;
- selection detail follows the controls/graph in DOM order;
- actor picker and modes remain above the graph;
- no forced page-level horizontal scrolling.

## Directed flows

- `RIGHT` / horizontal layering on wide containers when it improves reading;
- `DOWN` / vertical layering on narrow containers;
- accepted relationship direction remains identical.

## Charts

- legend may move above/below plot;
- labels may shorten visually but exact values remain in tooltip/table;
- data zoom is used only when it improves an actually dense series;
- chart height uses a bounded responsive range.

---

# K. Performance budget

These are promotion budgets, not claims about current measured gzip output. CI should record both raw and compressed artifacts.

## Initial route

For a non-visualization route:

- no MapLibre;
- no Cytoscape;
- no ELK;
- no ECharts;
- no visualization worker.

Target incremental visualization bytes on initial non-viz route: **0**.

## Lazy capability budgets

| Capability | Transfer budget after compression | Initialization budget |
| --- | ---: | ---: |
| Map renderer + worker + map CSS (excluding geography) | ≤ 450 KiB | interactive ≤ 1.5 s on qualified mid-tier mobile |
| First map geography/data request | ≤ 400 KiB transferred | parse/style included in map budget |
| WOL Cytoscape + fCoSE incremental bundle | ≤ 225 KiB | layout ≤ 600 ms mid-tier mobile for current production graph |
| ELK directed-flow incremental bundle | ≤ 300 KiB | layout ≤ 350 ms for Guide-scale flow graphs |
| ECharts modular quantitative bundle | ≤ 180 KiB | first chart ≤ 250 ms mid-tier mobile for Guide-scale series |

Desktop targets should ordinarily be less than half the mobile initialization ceilings.

## Runtime resource rules

- initialize only when the visualization is on/near the active route;
- destroy observers/RAF loops when the visualization unmounts;
- pause motion on hidden documents;
- do not run full-network layout on every selection;
- do not reload reference geography per map instance;
- reuse the authorized fetched asset where the application lifecycle permits.

A renderer that cannot meet the budget does not get promoted merely because the prototype looks better.

---

# L. Cartographic-purpose rules

A coordinate is not sufficient reason to draw a map.

Every map must declare the geographic question it answers.

## Hormuz

Question:
**Where is the chokepoint, which accepted routes depend on it, and what accepted alternatives exist?**

Appropriate:
- Strait geography;
- route corridors;
- accepted conflict/location records that explain chokepoint conditions.

## Campaign

Question:
**Where did accepted activity occur, and what operational geography is needed to understand the campaign?**

Appropriate:
- accepted strike/loss/activity locations;
- theater context;
- operationally relevant boundaries.

## Sanctions

Question:
**Which jurisdictions/nodes matter to the financial network, and does spatial context make the network easier to understand?**

A map is not mandatory just because a sanctioned entity has an address.

## Losses

Question:
**Does location materially clarify where accepted losses occurred?**

If not, use a table/timeline instead.

## Diplomacy

Default: **no map**.

Use geography only when place/jurisdiction materially explains the diplomatic issue.

## Evidence / imagery

Use a map only when location, footprint or relation to another accepted location is part of the evidence question.

## Governance

These are presentation-purpose rules only. They do not add, delete or re-adjudicate geographic evidence.

---

# M. Migration strategy

## M1. Stay unchanged during this facelift

Do not touch:

- accepted evidence or source relationships;
- current route geometry or route IDs;
- accepted map-point semantics/precision;
- current WOL nodes/edges/award relationships;
- current economic calculations/values;
- current protected economic renderer while the facelift is underway;
- existing SVG country flags;
- EvidenceDrawer/source resolution;
- current hash routing/aliases;
- release identity and evidence-authority pipeline.

## M2. Upgrade in place

Safe renderer-neutral/current-renderer work:

- deterministic WOL selection/layout preparation;
- graph scroll/zoom behavior;
- reduced-motion support;
- visualization accessibility summaries;
- container-based layout primitives;
- generic visualization tokens;
- map-purpose metadata/presentation decisions;
- signed lazy-capability manifest design/tests.

## M3. Renderer-migrate later

After prototype approval:

1. add signed lazy capability roles without changing evidence inputs;
2. vendor/pin MapLibre and qualify same-origin worker/CSP;
3. migrate one representative map using the same point/route/geography inputs;
4. retain Leaflet fallback;
5. compare semantics and screenshots;
6. only then migrate other eligible maps;
7. add modular ECharts only for a new chart class or a separately approved parity migration;
8. add fCoSE/ELK only where the actual graph/flow benefits.

## M4. Explicitly out of scope now

- broad page-body migration;
- wholesale map conversion;
- WOL relationship redesign;
- chart value/calculation changes;
- evidence schema changes made solely for renderer convenience;
- Bootstrap adoption;
- hosted basemaps;
- external map APIs;
- remote runtime CDNs.

---

# N. Representative prototypes

The isolated lab at `prototypes/visualization-platform/` uses current repository/read-model material. It does not contain fictional war data.

## N1. Map rendering proof

Inputs:

- `assets/geography/atlas-reference-geography.geojson`
- `data/oil-routes-r1.json`
- `data/sanctions-financial-network-v1.json`

Proof:

- one MapLibre camera;
- explicit same-origin MapLibre v6 worker packaging;
- 110m → 50m → 10m geography visibility by zoom;
- current schematic route IDs and exact current coordinate arrays, converted only from the repository’s `[lat, lon]` presentation form to GeoJSON `[lon, lat]`;
- current sanctions jurisdiction markers;
- theater / Gulf / Hormuz named camera controls;
- no remote tiles/style/API.

No route geometry is edited. The lab build also runs `verify-inputs.mjs` against the same current files before bundling and copies only the prototype inputs into its isolated `dist/` tree; none of that output is part of the signed public release.

## N2. WOL/network proof

Input:

- generated current `data/public-current-state.json`
- `analysis.web_of_lies.propagation_graph`

Proof:

- Cytoscape + fCoSE;
- full network;
- direct-connection selection with 0.12 unrelated opacity;
- trace mode over existing directed accepted edges only;
- explicit graph-zoom enablement;
- selected-edge directional dash motion, disabled under reduced motion;
- textual selected/trace equivalent.

No node or edge is synthesized.

## N3. Directed-flow proof

Input:

- `data/sanctions-financial-network-v1.json`
- explicit `cascade[]` step ordering

Proof:

- Cytoscape + ELK layered layout;
- horizontal wide layout / vertical narrow layout;
- same ordered cascade text below the diagram.

This intentionally demonstrates that ELK works while also exposing why the current five-step linear cascade is probably better left as native semantic HTML/CSS in production. ELK is reserved for branching flows.

## N4. Quantitative-chart proof

Input:

- `data/integration-v1.2/economics.json`
- existing `forecast_context.rows[].delta`

Proof:

- Apache ECharts bar chart using the existing stored delta values;
- no recalculation or replacement of protected production charts;
- SVG renderer;
- ARIA enabled;
- exact-value table equivalent;
- reduced-motion support.

---

## Promotion gate / stop condition

This contract authorizes **architecture review only**.

The next production implementation step may begin only after review approves:

1. MapLibre as staged target;
2. the signed lazy-capability model;
3. Cytoscape layout/interaction strategy;
4. ECharts future-chart policy;
5. the accessibility/performance budgets.

Until then, broad page-body migration remains paused.

**Stop here. Do not mass-migrate pages.**
