# Guide Facelift Reference Sweep

**Base checkpoint:** `09fa1697936b0f232825dc9b1a15694fd31e5a9d`  
**Purpose:** whole-site reference definition before broad renderer propagation.  
**Production rollout:** explicitly out of scope.

## Controlling visual language

The approved Sanctions & Impact and Hormuz & Economy mockups are the visual north star. The sweep therefore uses: flat dark analytical surfaces; high-information summary bands; semantic cyan/amber/red/green accents; authored maps; financial/analytical chart framing; deliberate causal flows; dense but readable panels; integrated labels/legends; wide analytical canvases; and mobile recomposition rather than desktop shrinkage.

The references are intentionally **presentation-only**. Text such as “accepted current value” marks where the existing accepted value/content appears; it is not new data.

## Global preservation boundary

No reference authorizes changes to accepted wording, findings, adjudications, chronology, source associations, item membership, protected list order, EvidenceDrawer behavior, evidence injection/resolution, route ownership, accepted page data authority, coordinates, route geometry, WOL nodes/edges, protected/current economic calculations, flags, read-model semantics, canonical update behavior, ROOK, or the Evidence Locker.


## Route-by-route references

### Overview

- **Page identifier:** `start.overview` · `/` · `OverviewPage`
- **Archetype:** Current-state command overview
- **Visual recomposition:** Four-domain summary strip; authored theater map; current developments; unresolved questions.
- **Renderer/platform:** MapLibre + HTML/CSS/SVG.
- **Preservation:** Keep all accepted current-state language, chronology, source links, map coordinates and evidence drawers unchanged.
- **Implementation caution:** Do not turn the theater map into a map app; prose stays constrained while the analytical canvas can widen.
- **Reference:** [desktop](../mockups/guide-facelift-reference/start-overview--desktop.svg) · [mobile](../mockups/guide-facelift-reference/start-overview--mobile.svg)

### Who's Involved

- **Page identifier:** `start.actors` · `/home/actors/` · `ActorsPage`
- **Archetype:** Identity / directory
- **Visual recomposition:** Grouped actor index; affiliation bands; role context; selected identity detail.
- **Renderer/platform:** HTML/CSS/SVG.
- **Preservation:** Keep actor identities, affiliations, roles, flags, ordering rules and evidence relationships unchanged.
- **Implementation caution:** Avoid a decorative org chart unless a relationship is already accepted in the model.
- **Reference:** [desktop](../mockups/guide-facelift-reference/start-actors--desktop.svg)

### Timeline

- **Page identifier:** `timeline.war` · `/war/timeline/` · `TimelinePage`
- **Archetype:** Temporal analytical explorer
- **Visual recomposition:** Tempo/density chart; annotated timeline; selected-window map; event detail.
- **Renderer/platform:** ECharts + MapLibre + HTML/CSS.
- **Preservation:** Keep chronology membership/order, date semantics, topic classifications and selected-event evidence unchanged.
- **Implementation caution:** ECharts is the reference target for tempo/density; preserve existing timeline semantics and full-conflict controls.
- **Reference:** [desktop](../mockups/guide-facelift-reference/timeline-war--desktop.svg) · [mobile](../mockups/guide-facelift-reference/timeline-war--mobile.svg)

### All Events

- **Page identifier:** `timeline.chronology` · `/war/events/` · `ChronologyPage`
- **Archetype:** Dense event index
- **Visual recomposition:** Search/filter band; compact event table; density strip; evidence detail.
- **Renderer/platform:** ECharts + HTML/CSS.
- **Preservation:** Keep all event records, pagination semantics, record classes, source associations and chronology order unchanged.
- **Implementation caution:** The chart is context, not a new ranking signal; filtering must remain auditable and keyboard accessible.
- **Reference:** [desktop](../mockups/guide-facelift-reference/timeline-chronology--desktop.svg) · [mobile](../mockups/guide-facelift-reference/timeline-chronology--mobile.svg)

### Campaigns & Strikes

- **Page identifier:** `military.campaigns` · `/war/campaigns/` · `CampaignsPage`
- **Archetype:** Campaign analysis
- **Visual recomposition:** Activity trend; strike map; damage/effect comparison; development rail.
- **Renderer/platform:** MapLibre + ECharts + HTML/CSS/SVG.
- **Preservation:** Keep accepted strike records, coordinates, facility links, damage observations, operational-effect language and sources unchanged.
- **Implementation caution:** Physical damage and operational effect must remain visually distinct; MapLibre cannot alter coordinate authority.
- **Reference:** [desktop](../mockups/guide-facelift-reference/military-campaigns--desktop.svg) · [mobile](../mockups/guide-facelift-reference/military-campaigns--mobile.svg)

### Bases & Infrastructure

- **Page identifier:** `military.facilities` · `/war/facilities/` · `FacilitiesPage`
- **Archetype:** Facility status analysis
- **Visual recomposition:** Status matrix; infrastructure map; damage-tier distribution; selected facility dossier.
- **Renderer/platform:** MapLibre + ECharts + HTML/CSS.
- **Preservation:** Keep facility IDs, status authority, BDA tiers, imagery links and source relationships unchanged.
- **Implementation caution:** No inferred footprints, damage percentages or facility geometry.
- **Reference:** [desktop](../mockups/guide-facelift-reference/military-facilities--desktop.svg) · [mobile](../mockups/guide-facelift-reference/military-facilities--mobile.svg)

### Air, Missiles & Drones

- **Page identifier:** `military.weapons` · `/war/weapons/` · `WeaponsPage`
- **Archetype:** Systems / attrition analysis
- **Visual recomposition:** System comparison; expenditure/attrition trend; operational sequence; evidence-linked system cards.
- **Renderer/platform:** ECharts + HTML/CSS/SVG.
- **Preservation:** Keep accepted expenditure, attrition, asset/loss reconciliation and unknown quantities unchanged.
- **Implementation caution:** Do not normalize incompatible systems into a synthetic score; charts must expose denominator and time basis.
- **Reference:** [desktop](../mockups/guide-facelift-reference/military-weapons--desktop.svg) · [mobile](../mockups/guide-facelift-reference/military-weapons--mobile.svg)

### Casualties & Losses

- **Page identifier:** `military.losses` · `/war/losses/` · `LossesPage`
- **Archetype:** Loss accounting
- **Visual recomposition:** Side-separated KPI band; category chart; casualty ledger; denominator/audit note.
- **Renderer/platform:** ECharts + HTML/CSS.
- **Preservation:** Keep side separation, loss IDs, casualty records, unknown quantities and reconciliation semantics unchanged.
- **Implementation caution:** Unknown does not mean zero; claimed and verified losses remain separate.
- **Reference:** [desktop](../mockups/guide-facelift-reference/military-losses--desktop.svg) · [mobile](../mockups/guide-facelift-reference/military-losses--mobile.svg)

### Damage Images

- **Page identifier:** `military.imagery` · `/war/damage-images/` · `ImageryPage`
- **Archetype:** Evidence gallery / BDA review
- **Visual recomposition:** Imagery map; evidence filmstrip; selected image plate; source/assessment rail.
- **Renderer/platform:** MapLibre + HTML/CSS.
- **Preservation:** Keep imagery records, dates, facility associations, observation wording and evidence source links unchanged.
- **Implementation caution:** No inferred polygons, damage percentages or targeting-quality overlays.
- **Reference:** [desktop](../mockups/guide-facelift-reference/military-imagery--desktop.svg) · [mobile](../mockups/guide-facelift-reference/military-imagery--mobile.svg)

### Hormuz & Economy

- **Page identifier:** `hormuz.overview` · `/themes/hormuz/` · `HormuzOverviewPage`
- **Archetype:** Theme overview dashboard
- **Visual recomposition:** Shipping/oil/sanctions/risk summary band; why-Hormuz map; sanctions explainer; watch rail.
- **Renderer/platform:** MapLibre + ECharts + HTML/CSS/SVG.
- **Preservation:** Keep Hormuz assessments, shipping records, sanctions network data and evidence associations unchanged.
- **Implementation caution:** This page is the primary composition reference for the theme family; avoid duplicate detail from child pages.
- **Reference:** [desktop](../mockups/guide-facelift-reference/hormuz-overview--desktop.svg) · [mobile](../mockups/guide-facelift-reference/hormuz-overview--mobile.svg)

### Shipping & Trade

- **Page identifier:** `hormuz.shipping` · `/themes/shipping/` · `ShippingPage`
- **Archetype:** Continuous route analysis
- **Visual recomposition:** Theater→Gulf→Hormuz map; transit/risk trend; alternatives; merchant losses.
- **Renderer/platform:** MapLibre + ECharts + HTML/CSS.
- **Preservation:** Keep route IDs, exact geometry, route semantics, selected relationships and merchant-loss records unchanged.
- **Implementation caution:** Routes remain schematic and non-navigational; Leaflet fallback stays authoritative fallback under the settled runtime model.
- **Reference:** [desktop](../mockups/guide-facelift-reference/hormuz-shipping--desktop.svg) · [mobile](../mockups/guide-facelift-reference/hormuz-shipping--mobile.svg)

### Oil & Economic Effects

- **Page identifier:** `hormuz.economy` · `/themes/economy/` · `EconomyPage`
- **Archetype:** Economic analytical dashboard
- **Visual recomposition:** Oil/price charts; FX/import pressure; sourcing shift; transmission flow.
- **Renderer/platform:** ECharts + MapLibre + HTML/CSS.
- **Preservation:** Keep protected economic calculations, accepted snapshots, source dates and current read-model semantics unchanged.
- **Implementation caution:** No interpolation unless already authorized; distinguish observed values from contextual/forecast material.
- **Reference:** [desktop](../mockups/guide-facelift-reference/hormuz-economy--desktop.svg) · [mobile](../mockups/guide-facelift-reference/hormuz-economy--mobile.svg)

### Sanctions & Impact

- **Page identifier:** `hormuz.sanctions` · `/themes/sanctions/` · `SanctionsPage`
- **Archetype:** Sanctions system analysis
- **Visual recomposition:** Named-node map; primary/secondary sanctions explainer; money flow; sanctions timeline/watch rail.
- **Renderer/platform:** MapLibre + ECharts + HTML/CSS/SVG + ELK where branching warrants.
- **Preservation:** Keep designation records, network nodes, legal/behavioral distinctions, economic calculations and sources unchanged.
- **Implementation caution:** Designation ≠ damage and legal reach ≠ behavioral reach must remain legible; ELK only for genuinely branching flow.
- **Reference:** [desktop](../mockups/guide-facelift-reference/hormuz-sanctions--desktop.svg) · [mobile](../mockups/guide-facelift-reference/hormuz-sanctions--mobile.svg)

### Current Hormuz Talks

- **Page identifier:** `hormuz.talks` · `/diplomacy/hormuz/` · `HormuzNegotiationsPage`
- **Archetype:** Negotiation state
- **Visual recomposition:** Current-state band; party lanes; condition→response flow; talks chronology.
- **Renderer/platform:** HTML/CSS/SVG + ECharts.
- **Preservation:** Keep accepted positions, chronology, proposal status, source associations and wording unchanged.
- **Implementation caution:** Do not imply an agreement where the record only supports proposals/conditions.
- **Reference:** [desktop](../mockups/guide-facelift-reference/hormuz-talks--desktop.svg) · [mobile](../mockups/guide-facelift-reference/hormuz-talks--mobile.svg)

### Diplomacy & Outcomes

- **Page identifier:** `talks.overview` · `/diplomacy/overview/` · `DiplomacyPage`
- **Archetype:** Diplomatic overview
- **Visual recomposition:** Active-track cards; regional mediation map; agreement/status matrix; diplomacy timeline.
- **Renderer/platform:** MapLibre + ECharts + HTML/CSS.
- **Preservation:** Keep agreement membership/status, diplomatic records, mediator roles and chronology unchanged.
- **Implementation caution:** Map encodes accepted geographic/actor context only; status colors must not become scores.
- **Reference:** [desktop](../mockups/guide-facelift-reference/talks-overview--desktop.svg) · [mobile](../mockups/guide-facelift-reference/talks-overview--mobile.svg)

### June MOU

- **Page identifier:** `talks.mou` · `/diplomacy/june-mou/` · `MouPage`
- **Archetype:** Agreement dossier
- **Visual recomposition:** What each side received; clause/status matrix; implementation chronology; current controlling status.
- **Renderer/platform:** HTML/CSS/SVG + ECharts.
- **Preservation:** Keep exact accepted MOU language, obligations, implementation facts, chronology and source relationships unchanged.
- **Implementation caution:** Balance the two sides visually without manufacturing equivalence; later status must not rewrite original terms.
- **Reference:** [desktop](../mockups/guide-facelift-reference/talks-mou--desktop.svg) · [mobile](../mockups/guide-facelift-reference/talks-mou--mobile.svg)

### Nuclear Talks

- **Page identifier:** `talks.nuclear` · `/diplomacy/nuclear/` · `NuclearPage`
- **Archetype:** Issue / position analysis
- **Visual recomposition:** Issue matrix; position-change lanes; negotiation chronology; evidence rail.
- **Renderer/platform:** ECharts + HTML/CSS/SVG.
- **Preservation:** Keep accepted nuclear-position language, chronology and sources unchanged.
- **Implementation caution:** Do not infer breakout timelines or technical findings not present in the accepted record.
- **Reference:** [desktop](../mockups/guide-facelift-reference/talks-nuclear--desktop.svg)

### Regional Diplomacy

- **Page identifier:** `talks.regional` · `/diplomacy/regional/` · `RegionalDiplomacyPage`
- **Archetype:** Regional relationship map
- **Visual recomposition:** Diplomacy map; actor/mediator lanes; agreement cards; chronology strip.
- **Renderer/platform:** MapLibre + HTML/CSS/SVG.
- **Preservation:** Keep state/mediator identities, agreement records, chronology and evidence relationships unchanged.
- **Implementation caution:** No relationship line unless supported by an accepted agreement/diplomatic record.
- **Reference:** [desktop](../mockups/guide-facelift-reference/talks-regional--desktop.svg) · [mobile](../mockups/guide-facelift-reference/talks-regional--mobile.svg)

### Goals & Results

- **Page identifier:** `objectives.outcomes` · `/diplomacy/outcomes/` · `ObjectivesPage`
- **Archetype:** Objective→result matrix
- **Visual recomposition:** Objective/evidence/result lanes; status matrix; contrary-evidence rail; current result summary.
- **Renderer/platform:** HTML/CSS/SVG + ECharts.
- **Preservation:** Keep objective wording, outcome status, correction records and evidence links unchanged.
- **Implementation caution:** Do not create a composite win score; every result must remain traceable to its accepted objective.
- **Reference:** [desktop](../mockups/guide-facelift-reference/objectives-outcomes--desktop.svg)

### Position Changes

- **Page identifier:** `objectives.positions` · `/diplomacy/positions/` · `PositionChangesPage`
- **Archetype:** Before/event/after analysis
- **Visual recomposition:** Position lanes; change timeline; issue comparison; evidence links.
- **Renderer/platform:** ECharts + HTML/CSS/SVG.
- **Preservation:** Keep original/later position language, event chronology and change classifications unchanged.
- **Implementation caution:** The intervening event is mandatory context; avoid visually implying causation where only sequence is established.
- **Reference:** [desktop](../mockups/guide-facelift-reference/objectives-positions--desktop.svg)

### Iran's Position

- **Page identifier:** `objectives.iran` · `/diplomacy/iran-position/` · `IranMessagingPage`
- **Archetype:** Position / messaging analysis
- **Visual recomposition:** Issue cards; messaging chronology; change markers; evidence/source rail.
- **Renderer/platform:** ECharts + HTML/CSS.
- **Preservation:** Keep accepted Iranian statements, position-change record, chronology and source context unchanged.
- **Implementation caution:** Separate statement, assessed position, and outcome; do not collapse rhetoric into fact.
- **Reference:** [desktop](../mockups/guide-facelift-reference/objectives-iran--desktop.svg)

### Claim Checks

- **Page identifier:** `evidence.claims` · `/intelligence/claims/` · `ClaimChecksPage`
- **Archetype:** Claim-status review
- **Visual recomposition:** Status/topic controls; status distribution; claim cards; selected evidence chain.
- **Renderer/platform:** ECharts + HTML/CSS.
- **Preservation:** Keep claim IDs, exact claim text, adjudication status, knowledge state and evidence associations unchanged.
- **Implementation caution:** Charts summarize accepted statuses only; they must not become a credibility score for actors/outlets.
- **Reference:** [desktop](../mockups/guide-facelift-reference/evidence-claims--desktop.svg) · [mobile](../mockups/guide-facelift-reference/evidence-claims--mobile.svg)

### Lie Ledger

- **Page identifier:** `evidence.information` · `/intelligence/lie-ledger/` · `InformationEnvironmentPage`
- **Archetype:** Case collection
- **Visual recomposition:** Case index; finding bands; evidence-chain preview; related-material rail.
- **Renderer/platform:** HTML/CSS/SVG.
- **Preservation:** Keep case membership/order where protected, claim language, findings, evidence, chronology and related material unchanged.
- **Implementation caution:** Collection view must lead cleanly into the existing parameterized case dossier without cloning records.
- **Reference:** [desktop](../mockups/guide-facelift-reference/evidence-information--desktop.svg) · [mobile](../mockups/guide-facelift-reference/evidence-information--mobile.svg)

### Web of Lies

- **Page identifier:** `evidence.web_of_lies` · `/intelligence/wol/` · `WebOfLiesPage`
- **Archetype:** Relationship network
- **Visual recomposition:** Full/direct/trace Cytoscape network; detail rail; Hall; claim trails.
- **Renderer/platform:** Cytoscape + HTML/CSS/SVG.
- **Preservation:** Keep WOL nodes, edges, direction, receipts, Hall logic and evidence relationships unchanged.
- **Implementation caution:** Do not add inferred edges; fCoSE/other layout changes are acceptable only when they improve readability without semantic drift.
- **Reference:** [desktop](../mockups/guide-facelift-reference/evidence-web-of-lies--desktop.svg) · [mobile](../mockups/guide-facelift-reference/evidence-web-of-lies--mobile.svg)

### Source Library

- **Page identifier:** `evidence.sources` · `/sources/` · `SourcesPage`
- **Archetype:** Dense source directory
- **Visual recomposition:** Search/filter band; origin/outlet groups; dense rows; selected source context.
- **Renderer/platform:** HTML/CSS.
- **Preservation:** Keep source records, origin grouping keys, role/context fields and exact evidence links unchanged.
- **Implementation caution:** Humanized labels must not collapse distinct raw grouping keys; maintain current source-resolution behavior.
- **Reference:** [desktop](../mockups/guide-facelift-reference/evidence-sources--desktop.svg)

### Methodology

- **Page identifier:** `evidence.method` · `/sources/methodology/` · `MethodPage`
- **Archetype:** Editorial methodology
- **Visual recomposition:** Method overview; evidence/adjudication flow; vocabulary; update/release process.
- **Renderer/platform:** HTML/CSS/SVG.
- **Preservation:** Keep methodology meaning, evidence boundary, update semantics and release authority unchanged.
- **Implementation caution:** Reader-facing language stays durable and non-engineering; diagrams explain policy but do not expose internal-only notation.
- **Reference:** [desktop](../mockups/guide-facelift-reference/evidence-method--desktop.svg)

### Archive

- **Page identifier:** `evidence.archive` · `/sources/archive/` · `ArchivePage`
- **Archetype:** Release / provenance index
- **Visual recomposition:** Release timeline; snapshot index; provenance panel; current-vs-archive boundary.
- **Renderer/platform:** ECharts + HTML/CSS.
- **Preservation:** Keep archived snapshot identity, chronology and current-authority boundary unchanged.
- **Implementation caution:** Archive visuals must never imply an old snapshot is current authority.
- **Reference:** [desktop](../mockups/guide-facelift-reference/evidence-archive--desktop.svg)

### Lie Ledger · Case Dossier

- **Page identifier:** `evidence.information.case-dossier` · `/intelligence/lie-ledger/?dossier=case` · `InformationEnvironmentPage`
- **Archetype:** Single-case dossier
- **Visual recomposition:** Claim → finding → evidence → development → related material.
- **Renderer/platform:** HTML/CSS/SVG.
- **Preservation:** Keep selected case wording, list membership/order, finding, evidence, chronology and related material unchanged.
- **Implementation caution:** Dossier chrome may recompose; accepted case record content cannot be reordered where protected.
- **Reference:** [desktop](../mockups/guide-facelift-reference/evidence-information-case-dossier--desktop.svg) · [mobile](../mockups/guide-facelift-reference/evidence-information-case-dossier--mobile.svg)

### Web of Lies · Actor Dossier

- **Page identifier:** `evidence.web_of_lies.actor-dossier` · `/intelligence/wol/?dossier=actor` · `WebOfLiesPage`
- **Archetype:** Actor dossier / network
- **Visual recomposition:** Current record; findings; claim activity; direct/trace network; chronology.
- **Renderer/platform:** Cytoscape + HTML/CSS/SVG.
- **Preservation:** Keep selected actor identity, findings, receipts, accepted edges and claim trails unchanged.
- **Implementation caution:** Desktop graph remains dominant; mobile uses selection-first/direct connections plus vertical trace.
- **Reference:** [desktop](../mockups/guide-facelift-reference/evidence-web-of-lies-actor-dossier--desktop.svg) · [mobile](../mockups/guide-facelift-reference/evidence-web-of-lies-actor-dossier--mobile.svg)

## Implementation handoff rule

This package answers what each route should look like once the approved facelift is propagated. It does **not** authorize that propagation. The later renderer pass must work route-by-route against these references, preserve the boundaries above, and retain the settled runtime/platform architecture. ECharts appearances here are implementation targets for appropriate quantitative classes; protected existing economic charts/calculations remain protected until their specific implementation path is authorized.
