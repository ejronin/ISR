# Guide Page Visual Architecture

**Status:** analytical-design specification before final mockup production  
**Product:** The 2026 Iran War Guide  
**Branch:** `design/guide-page-visual-architecture-20261004`  
**Inputs:** approved facelift contract, current public IA/read model, PR #276 visualization platform contract, green PR #277 renderer checkpoint, rough PR #279 reference sweep, approved Sanctions & Impact / Hormuz & Economy visual language.  
**Authority:** presentation and interaction only. This document does not authorize evidence, wording, adjudication, source, chronology, canonical, or updater changes.

---

## 1. Purpose

This specification answers a different question from PR #279.

PR #279 asked, in effect, “what broad composition and renderer might fit this page?” This pass must answer:

> **What is the clearest objective visual representation of the accepted facts and accepted language already on this page, for readers with very different prior beliefs and levels of subject knowledge, and exactly how should the settled visualization tools be used to build it?**

The renderer must not have to invent the analytical composition.

For every public route/state this document defines:

1. the analytical job;
2. the reader misconception/failure mode to design against;
3. the dominant visual object;
4. secondary visual objects;
5. reading order and desktop composition;
6. useful interactions and non-useful interactions;
7. mobile recomposition;
8. exact platform/tool assignment;
9. actor-neutral color semantics;
10. accepted information that must survive unchanged;
11. accepted information currently buried that should be surfaced more clearly;
12. missing information/data dependencies;
13. implementation risks;
14. explicit mockup instructions.

The whole site should feel like one high-quality analytical product, but it must not feel like one repeated dashboard template.

---

## 2. Non-negotiable evidence and update boundary

The facelift may alter **presentation, grouping, visual hierarchy, interaction, spatial composition, and visualization renderer**. It may not alter the information being asserted.

The renderer and any later implementation pass may **not** change:

- accepted evidence;
- accepted wording;
- findings;
- adjudications;
- chronology;
- source associations;
- item membership;
- protected ordering;
- route ownership;
- accepted page authority;
- EvidenceDrawer behavior;
- evidence injection or resolution;
- map coordinates;
- accepted route geometry or route IDs;
- WOL nodes, edges, or directionality;
- accepted economic calculations or accepted economic series;
- source dates;
- flags;
- canonical update behavior;
- ROOK;
- Evidence Locker behavior;
- read-model semantics;
- the normal roughly 12-hour ROOK → Evidence → Public Product → Release operating cycle.

The current update pipeline remains:

**ROOK collects/appends → Evidence adjudicates → Public Product explains → Release qualifies/deploys.**

No visualization may become a second source of truth. Charts, maps, diagrams, counts, groupings, and derived views must be generated from already-authorized page data or from explicitly approved safe aggregations over that data. If a desired visual needs a new factual inference or new data, mark the dependency; do not manufacture it.

**Preserve semantics does not mean preserve old presentation.** The presentation is the thing being redesigned.

### Forensic authority boundary: Web of Lies and Lie Ledger

For **Web of Lies** and **Lie Ledger**—including collection views, case dossiers, actor dossiers, claim chains, receipts, findings, chronology, and related material—the facelift is **presentation-only with respect to the current accepted record**.

The renderer, visual-architecture pass, mockup pass, and implementation pass may **not independently modify the current accepted record**. In particular, they may not:
- rewrite, paraphrase, shorten, summarize, “clarify,” humanize, soften, harden, or otherwise alter currently accepted language;
- change current adjudications, findings, knowledge states, claim text, proposition meaning, chronology, case membership, protected record order, evidence association, receipt wording, or relationship semantics;
- generate replacement labels that restate an existing finding in different words where accepted wording already exists;
- collapse multiple accepted findings into a new synthesized ruling;
- infer new WOL edges, relationship types, actor roles, narrative groupings, or case relationships.

They may change presentation only:
- spatial composition;
- typography;
- spacing;
- visual grouping that preserves the accepted record structure;
- selection/focus behavior;
- graph layout;
- node/edge styling that maps existing node/edge semantics without changing them;
- responsive/mobile presentation;
- evidence-control placement while continuing to invoke the existing evidence system.

**Facelift scope rule:** for this facelift task, the current accepted WOL / Lie Ledger record is read-only. The facelift does not add, revise, correct, re-adjudicate, or reinterpret evidentiary findings, rulings, claims, relationships, chronology, or accepted language.

If the underlying WOL / Lie Ledger record changes later through its normal authorized evidence/adjudication workflow, the facelift implementation may render that newly accepted state automatically through the existing read model. That external workflow is not part of this facelift task and is not authorized by this specification.

**Authority rule:** the renderer, UX/UI engineer, visualization engineer, and facelift process have zero authority to modify WOL / Lie Ledger adjudications or evidentiary findings. Their authority is presentation-only.

---

## 3. Reader model: design for four audiences at once

Every page must work for these readers without changing the factual standard for any of them.

### A. Reader who knows nothing

Design requirement:

- answer “what is this?” before “what does it imply?”;
- establish geography/actors/time basis before detail;
- use ordinary-language visual labels rather than internal taxonomy;
- show the present accepted condition first;
- make units, dates, denominator, and status visible;
- provide one obvious reading path;
- keep deeper receipts available without forcing the novice into them immediately.

### B. Reader who gets most news from social media

Design requirement:

- make claim / accepted status / how-we-know relationships visually explicit;
- keep source/evidence affordances visible, not buried behind generic “more” controls;
- put dates and current-state markers near claims because old screenshots/posts are often recirculated;
- distinguish observed fact, claim, assessment, and unresolved material visually;
- avoid visuals that can be screenshotted out of context without the relevant qualifier or legend.

### C. Pro-Iran reader exposed to pro-Iran misinformation

Design requirement:

- no U.S.-coded “truth color” and no Iran-coded “false color”;
- unfavorable Iranian facts must be shown through the same neutral evidence grammar used for unfavorable U.S./Israeli/GCC facts;
- show claim → evidence → adjudication rather than rhetorical rebuttal;
- make alternative explanations/uncertainty visible when they materially survive;
- make chronology and receipts easy to inspect.

### D. Pro-U.S. reader inclined to ignore unfavorable U.S./allied facts

Design requirement:

- exactly the same actor-neutral grammar;
- no “friendly side” visual privilege;
- U.S./allied losses, failed objectives, contradictions, or unsupported claims receive the same prominence rules as Iranian equivalents;
- avoid patriotic red/white/blue semantics as analytical status;
- separate actor identity from evidence status.

### Universal rule

The interface must make disagreement with the conclusion lead naturally toward **the evidence**, not toward louder visual rhetoric.

---

## 4. Research-derived interaction and composition rules

The design is informed by contemporary analytical dashboard practice, but adapted to the Guide rather than copied from commercial BI.

- **Purpose and audience first.** Tableau’s dashboard guidance starts with the question being answered and the audience’s expertise. Each Guide route therefore gets an explicit analytical job instead of a default card grid.
- **Visual hierarchy before density.** Power BI and Tableau both emphasize placing the most important view first and making the reading path obvious. The top of each page must establish current state and the dominant analytical object before secondary detail.
- **Use the right visual, not more visuals.** Financial Times’ Visual Vocabulary frames chart selection around the analytical relationship—change over time, comparison, distribution, correlation, flow, etc. A page does not receive ECharts merely because ECharts exists.
- **Interactivity must add insight.** Filters, hover, selection and drill-down are used only when they change the reader’s analytical view. Interaction cannot be decorative.
- **Annotations are part of analysis.** Important events, discontinuities, qualifications and statuses belong on/next to the analytical object rather than in detached prose whenever this can be done without changing wording.
- **Mobile is recomposed, not shrunk.** Desktop split views may become selection-first flows, vertical traces, compact selectors, and scrollable detail on mobile.
- **Limit simultaneous primary views.** Most routes should have one dominant analytical object and at most one co-primary object above the fold. Additional views should support, not compete.

Reference practice reviewed:
- Tableau, “Best Practices for Effective Dashboards” and Blueprint visual best practices.
- Microsoft Power BI, “Tips for designing a great Power BI dashboard.”
- Financial Times, Visual Vocabulary / “Charts that work.”
- Flourish guidance on annotations and story transitions.

These are design-practice references only; they do not add data or authority to the Guide.

---

## 5. Settled rendering vocabulary

Do not reopen platform selection.

| Need | Settled tool | Use |
|---|---|---|
| Authored analytical maps | **MapLibre GL JS 6.11.2** | strategic geography, facilities, strikes, shipping, diplomacy, sanctions geography |
| Map fallback | **Leaflet** | retained under the approved runtime/fallback contract |
| Quantitative analytical charts | **ECharts** | time series, bars, distributions, event-density, financial-style comparison views |
| WOL relational network | **Cytoscape 3.34.0** | full network, direct connections, propagation trace |
| Simple causal/operational flow | **HTML/CSS/SVG** | 2–8 step explanatory sequences, bilateral comparisons, agreement/condition flows |
| Complex branching flow | **Cytoscape + ELK** | only when branching topology materially exceeds a hand-authored flow |
| Layout | **CSS Grid/Flex/container queries** | editorial and analytical composition |
| Icons | **Vendored pinned Lucide subset** | semantic controls / analytical object cues only |
| Country identity | **Existing SVG flags** | identity, not status |

No Bootstrap. No external map tiles/CDN runtime. No second design system.

---

## 6. Site-wide visual semantics

### 6.1 Approved token base

Use existing Guide tokens, not arbitrary per-page palettes:

- canvas: `#080d13`
- surface-1: `#0c131a`
- surface-2: `#111a23`
- surface-3: `#17232e`
- raised: `#18232d`
- border subtle: `#202d38`
- border strong: `#355063`
- text primary: `#f1f4f7`
- text secondary: `#aab5bf`
- accent / analytical selection: `#79b7df`
- strong accent: `#b9def5`
- good / still usable / confirmed favorable state: `#8fd0b3`
- warn / degraded / conditional: `#e4c384`
- danger / blocked / contradicted / severe disruption: `#eea0a0`

### 6.2 Color meaning

Color encodes **state**, never allegiance.

- Cyan/blue: selected analytical object, neutral informational emphasis, routes/links.
- Green: still usable, completed/confirmed positive status, functioning path.
- Amber: degraded, conditional, partial, elevated risk, unresolved-but-bounded warning.
- Red: blocked, severe disruption, materially contradicted/failed where that is the accepted status.
- Gray/slate: context, inactive, unknown/not-selected.
- Flags/names identify actors. Status color must not be inferred from national identity.

Do not make the United States “blue/good” or Iran “red/bad.”

### 6.3 Unknown and unresolved

Unknown is not zero. Unresolved is not amber merely because amber is visually convenient.

Unknown quantities use explicit “unknown” labels and neutral/slate patterning. Unresolved adjudications use their accepted status label plus neutral/amber only if the existing semantic contract maps to that state.

### 6.4 Animation

Animation is authorized only when it explains:

- direction of accepted flow;
- chronological transition;
- propagation along accepted WOL edges;
- change between explicitly selected states.

No decorative pulses, scanning radar, continuous vessel movement, animated missile arcs, or “live” effects where the record is not live.

Reduced-motion mode must preserve the same meaning with static arrows/state transitions.

### 6.5 Interaction

Every interactive analytical object needs:

- obvious selectable affordance;
- keyboard path;
- visible focus;
- selected state not dependent on color alone;
- text/data equivalent for material facts;
- durable evidence access;
- no hover-only fact;
- no surprise scroll/zoom capture.

Selections should generally update **one detail rail + related marks**, not reconfigure the whole page unpredictably.

### 6.6 Evidence affordance

Evidence is not a tertiary utility.

On factual/forensic pages, the selected item’s evidence control should sit in or immediately adjacent to the selected detail surface. It must continue invoking the existing EvidenceDrawer/source resolver, not a new evidence system.

---

### 6.7 Distinction grammar for Phase 1 analytical surfaces

Phase 1 visualizations must preserve the following distinctions as separate visual states. The renderer may choose shape, border, pattern, lane, annotation position, and typographic emphasis, but it may not create a new factual category or substitute a presentation label for accepted wording.

- **Claim vs established fact:** identity and status are separate channels. A claim remains visibly a claim until the accepted record gives it another state; the selected detail surface carries the exact accepted language and evidence control.
- **Known vs unknown:** unknown/unresolved values remain explicit text states and may use neutral patterning. They never collapse to zero, an empty bar, or an omitted row.
- **Physical damage vs operational effect:** render as independent labeled dimensions. A hit, visible damage, destruction, closure, degradation, and operational ineffectiveness are not visual synonyms.
- **Proposal vs agreement:** negotiation graphics must carry the accepted proposal/condition/agreement status. A directional flow or chronological sequence does not visually upgrade a proposal into an agreement.
- **Supported mechanism vs observed consequence vs potential/watch consequence:** these are different node/edge treatments in explanatory economic/sanctions flows. Potential/watch material may not be drawn as though already observed.
- **Chronology vs causality:** temporal co-occurrence and event annotation use neutral time linkage. Use a causal arrow or causal connector only where the accepted record supports that causal relationship.

Status remains actor-neutral. Flags/names identify parties; state treatments identify evidence/operational status.

### 6.8 Coordinated selection and cross-highlighting

Cross-view coordination is allowed only to clarify already-supported relationships:

- a map selection may highlight the same accepted record, date, period, facility, actor, or explicitly related accepted object in another view;
- date/event cross-highlighting between geography and a chart is a **temporal relationship**, not a causal claim, unless accepted evidence establishes causation;
- selecting a country, metric, actor, or category may emphasize relevant marks but must not silently remove unrelated accepted facts;
- if a selection actually filters the record set, the active date basis, units, category basis, and denominator/count basis must remain visible;
- chart/map/network selection must keep the selected state legible without hover and retain adjacent EvidenceDrawer/source access;
- linked views must clear/reset together through an obvious control; a reader must be able to return to the full accepted context.

## 7. Site-wide topology matrix

| Page/state | Analytical archetype | Dominant object | Secondary object | Primary renderer | Interaction density |
|---|---|---|---|---|---|
| Overview | Current-state explainer | Authored theater map | current-state/development lanes | MapLibre + HTML/SVG | medium |
| Who’s Involved | Three-level actor explorer | supported state geography → accepted actor family → selected actor detail | canonical searchable actor index | MapLibre + HTML | medium |
| Timeline | Temporal explorer | event-density/time navigator | selected-period summary + map + accepted chronology | ECharts + MapLibre | high |
| All Events | Evidence chronology index | dense chronology | density strip/filtering | HTML + ECharts | medium |
| Campaigns & Strikes | Campaign analysis | hierarchic strike/facility geography | activity time series + independent damage/effect lanes | MapLibre + ECharts | high |
| Bases & Infrastructure | Facility status explorer | infrastructure map | status distribution + dossier | MapLibre + ECharts | high |
| Air, Missiles & Drones | System/tempo analysis | comparable system time series/small multiples | system ledger + operational flow | ECharts + HTML/SVG | medium-high |
| Casualties & Losses | Bilateral accounting | paired columns with shared category structure | accepted/claimed/unknown states + actor ledger | ECharts + HTML | medium |
| Damage Images | Imagery/BDA review | selected imagery plate | facility map + filmstrip | HTML + MapLibre | medium |
| Hormuz & Economy | Strategic-economic synthesis | layered Hormuz map | protected economic views + additive authorized analytical charting with coordinated highlighting | MapLibre + ECharts | high |
| Shipping & Trade | Chokepoint/route analysis | continuous route map | transit/risk time series + alternatives | MapLibre + ECharts | high |
| Oil & Economic Effects | Financial/economic analysis | protected charts plus authorized Trend / Compare / Event Context views | transmission flow separating mechanism / observed / potential | ECharts + HTML/SVG | high |
| Sanctions & Impact | Financial-network analysis | money/network flow | named-node map + consequence chain | HTML/SVG/ELK + MapLibre | high |
| Diplomacy & Outcomes | Multi-track diplomacy overview | track/status matrix | mediation geography + chronology | HTML/SVG + MapLibre | medium |
| Current Hormuz Talks | Negotiation state | position/condition flow | talks chronology | HTML/SVG | medium |
| June MOU | Agreement dossier | obligation/status matrix | implementation chronology | HTML/SVG | medium |
| Nuclear Talks | Issue/position analysis | issue-by-party position matrix | chronology | HTML/SVG | medium |
| Regional Diplomacy | Geographic diplomacy | mediation/relationship map | actor detail + chronology | MapLibre + HTML/SVG | medium-high |
| Goals & Results | Objective accountability | objective → result lanes | evidence/contrary detail | HTML/SVG | medium |
| Position Changes | Before/event/after analysis | aligned change lanes | chronology | HTML/SVG + ECharts only if useful | medium |
| Iran’s Position | Messaging/position record | issue-based position chronology | statement/evidence rail | HTML + ECharts only for temporal density | low-medium |
| Claim Checks | Claim adjudication | claim → finding → evidence sequence | filters/status summary | HTML + ECharts summary only | medium |
| Lie Ledger | Narrative-chain collection | case-chain previews | finding/filter rail | HTML/SVG | medium |
| WOL | Relationship network | Cytoscape graph with accepted-class node/edge grammar | detail rail/trace/receipts | Cytoscape | high |
| Lie Ledger case dossier | Single forensic case | claim→finding→evidence→development | related material | HTML/SVG | medium |
| WOL actor dossier | Actor/network dossier | selected network neighborhood | findings/chronology/receipts | Cytoscape + HTML | high |
| Source Library | Source index | grouped dense directory | source detail | HTML | medium |
| Methodology | Explanatory method | evidence-to-public flow | vocabulary/standards | HTML/SVG | low |
| Archive | Provenance/history index | release/snapshot chronology | archive list | HTML; ECharts only if meaningful | low |

---

# 8. Page-by-page visual architecture

## 8.1 Home · Overview
**Route:** `start.overview` · `/` · `OverviewPage`

### Analytical job
Answer, in under one screen: **What is the accepted current state of the war, where are the major active pressures, what materially changed recently, and what remains unresolved?**

### Reader failure to prevent
A novice should not mistake the page for a breaking-news feed. A partisan reader should not be able to infer “winning” from visual prominence alone.

### Primary visual
**Authored MapLibre theater map**, not a general map viewer.

Show only accepted geographic objects already available to this page. The map should establish:
- theater geography;
- current materially relevant locations/areas;
- selected current development;
- clear distinction between point, route, and area semantics.

Use controlled label density and a deliberate camera. No generic basemap furniture.

### Secondary objects
- current-state summary band using existing accepted public language;
- “latest record” / current developments lane;
- unresolved questions lane;
- evidence access attached to selected development.

Do not invent KPI numbers simply to fill four tiles.

### Desktop composition
Top: page title + concise current-state language.  
Middle: 65/35 map/detail split on wide screens.  
Below: developments and unresolved material in two editorial lanes.  
Prose remains within reading width; map may use analysis width.

### Interactions
Map selection → detail rail; legend toggles only if they correspond to accepted layer classes. Evidence reveal from selected detail. No autoplay.

### Mobile
Map becomes a focused 55–65svh analytical plate. Selecting a mark opens the detail below it. Developments follow as a chronology list. Do not squeeze a desktop side rail beside the map.

### Platform
MapLibre + HTML/CSS/SVG; Leaflet fallback retained.

### Color
Cyan selection; red/amber/green only for accepted statuses, never actors.

### Preserve
All current-state wording, chronology, map coordinates, selected record identities, unresolved language, source/evidence links.

### Surface better
Current accepted distinctions between “current condition,” “recent development,” and “unresolved” should be visually separated if presently buried.

### Missing/dependency
Any desire for aggregate “war score,” front-line state, or confidence percentage is **not authorized** and should not be added.

### Mockup instruction
Produce desktop and mobile comps showing one actual current selected map record and its existing language/evidence affordance.

---

## 8.2 Home · Who’s Involved
**Route:** `start.actors` · `/home/actors/` · `ActorsPage`

### Analytical job
Answer: **Who is involved, where can geography legitimately identify them, what accepted actor family/classification do they belong to, what role do they play, and how do I reach the accepted record about them?**

### Reader failure to prevent
Do not make every actor look equivalent in role or involvement merely because every actor is browsable. Do not manufacture map positions, alliances, or ideological blocs to make the explorer visually complete.

### Primary visual
**Three-level actor explorer:**

1. **Geography** — MapLibre state geography where the accepted data supports state/jurisdiction geography. Do not invent a geographic point for a non-state actor.
2. **Actor families** — selector/filter using only actor classifications/groupings already present in the accepted read model.
3. **Selected actor detail** — render only accepted categories actually populated for that actor.

The canonical searchable actor index remains present as the comprehensive and accessible browse path.

### Selected actor detail grammar
Potential categories include role, accepted actions, facilities, diplomacy, losses, position, related claims, and evidence **only where the current read model supplies them for the selected actor**. Omit an unavailable category rather than rendering an invented empty fact state or filling it from another route.

### Desktop
Use geography and actor discovery as the wide analytical field with a persistent selected-actor detail rail. Actor-family controls sit with the canonical index/search so a reader can move geography → accepted family → actor detail without losing the full directory.

### Interactions
Map and index selection synchronize for actors that have supported geography. Family filtering uses only accepted classifications. Selecting a non-state actor focuses the index/detail state without creating a map pin. Evidence access remains in the selected actor detail.

### Mobile
Search/index first → accepted family filter where available → selected actor detail. “View on map” is optional and only enabled for actors with supported state geography. A novice must not manipulate a map to locate an actor.

### Platform
MapLibre + HTML/CSS. Existing SVG flags identify actors; flags never encode status.

### Preserve
Actor identities, accepted classifications/group membership, roles, affiliations, existing flags, ordering/search semantics, populated category membership, and evidence relationships.

### Surface better
Existing geography/facility relationships already available but currently detached from actor identity; sparse versus richly populated actor records without pretending they contain the same categories.

### Missing/dependency
Do not draw alliance/relationship edges unless accepted relational data supports them. Do not geocode a non-state actor merely for presentation.

### Mockup instruction
Show one state actor with supported geography, one non-state actor that remains index/detail-only, and one sparsely populated actor to prove the renderer omits unavailable categories rather than inventing them. The canonical searchable index must remain visibly usable.

## 8.3 War · Timeline
**Route:** `timeline.war` · `/war/timeline/` · `TimelinePage`

### Analytical job
Answer: **When did recorded activity cluster or change, what accepted events fall inside a selected period, and where did those events occur?**

### Primary visual
**ECharts event-density histogram/area navigator** over the accepted chronology. It is a deterministic count of accepted event records in the chosen time bin, **not an operational-intensity score**.

Use daily bins where density permits; aggregate to weekly/monthly only by explicit deterministic count. The visible bin basis must stay labeled.

### Selected Period Summary
Every non-full-range selection exposes a compact summary immediately adjacent to the navigator:

- exact selected start and end date;
- accepted event count inside that window;
- active accepted categories/topics represented by the current filter state;
- explicit Reset / Full range control.

The summary is a navigation/accounting aid. It may not characterize the selected period as more or less operationally intense merely because it contains more recorded events.

### Secondary
- accepted annotated chronology;
- selected-window MapLibre geography;
- selected event detail/evidence.

### Desktop
Full-width density navigator + Selected Period Summary at top; below, chronology remains the primary reading surface with the selected-window map as geographic context.

### Interactions
Brush time window, use already-authorized topic/category filters, select event, reveal evidence, reset full conflict. Brush/filter state updates the Selected Period Summary, chronology, and map together. Material annotations use existing accepted event language or an already-approved label; do not synthesize a new event interpretation.

### Mobile
Compact horizontal density navigator with accessible range controls and Selected Period Summary directly below. Accepted chronology dominates. Geography opens/focuses for the selected event/window rather than permanently occupying half the screen.

### Platform
ECharts + MapLibre + HTML.

### Color
One neutral/cyan base series for recorded-event count. Category distinction only when accepted categories are stable and legible; never use national/side colors as status.

### Preserve
Event membership/order, timestamps, accepted classifications, filters, map coordinates, source links, pagination/selection semantics, exact event wording, and evidence relationships.

### Surface better
Temporal clustering already implicit in the chronology, while keeping the underlying accepted event list primary.

### Missing/dependency
No “operational intensity” index unless separately adjudicated. Event count ≠ operational importance.

### Risk
A high-density bar can be screenshotted as “most violent” or “most intense.” Keep “recorded events,” bin basis, selected date range, and count visible in the same analytical frame.

### Mockup instruction
Show both full-range and a brushed 7–14 day state. The brushed state must visibly include exact date range, accepted event count, active categories/topics, Reset / Full range, selected chronology, and focused geography.

## 8.4 War · All Events
**Route:** `timeline.chronology` · `/war/events/` · `ChronologyPage`

### Analytical job
Provide a **complete, searchable, auditable chronology** without turning it into another overview dashboard.

### Primary
Dense event index/table/list with sticky date/topic controls.

### Secondary
Small ECharts density strip for navigation context only.

### Desktop
Filter/search band → density strip → dense chronology rows. Selected row expands or uses detail rail while preserving list position.

### Interactions
Search, existing filters, date jump, pagination, evidence reveal. Density strip may set date window.

### Mobile
No permanent chart if it displaces records. Use collapsible “activity by time” navigator.

### Platform
HTML/CSS + ECharts context strip.

### Preserve
Every event record, order, IDs, filters, pagination, cross-links, EvidenceDrawer relationships.

### Surface better
Date-grouping and topic scanning.

### Avoid
Pie charts, actor leaderboards, or “top event” ranking.

### Mockup instruction
Prioritize fast scan and receipts over decorative visualization.

---

## 8.5 War · Campaigns & Strikes
**Route:** `military.campaigns` · `/war/campaigns/` · `CampaignsPage`

### Analytical job
Answer: **Where and when were strikes recorded, what physical damage is accepted, and what operational effect is actually supported?**

### Primary
**MapLibre strike/facility geography** using the authoritative existing points and coordinates.

Map visual hierarchy is fixed:

1. theater/campaign context;
2. accepted facility/target locations;
3. selected strike/facility;
4. accepted physical-damage state;
5. accepted operational-effect state.

The last two are independent analytical states. Their visual treatment may be coordinated around the same selected facility, but one may not be inferred from the other.

### Co-primary
**ECharts recorded-activity time series** using the existing accepted monthly recorded-event calculation. Use vertical bars for monthly counts; add another series only if it is accepted, compatible, and clearly denominated.

### Secondary
A deliberate **Physical Damage / Operational Effect** paired surface using exact accepted language and separate state labels/evidence paths.

### Desktop
Recorded-activity context above or beside the map without displacing the map as the geographic analytical object. The selected facility/strike detail rail carries physical damage and operational effect as separately labeled fields. The paired explanatory surface reinforces the distinction below.

### Interactions
Selecting a time period highlights corresponding accepted records and makes the active temporal basis/count denominator visible. Selecting a map record exposes its accepted damage text, operational-effect text, and evidence. Broad-zoom clustering is permitted for readability only if every cluster exposes its count and **the selected record can never disappear into a cluster**.

Filtering may reduce visible records only through existing/authorized criteria; the active time window, category basis, and count denominator remain visible. Never animate strike trajectories.

### Mobile
Activity chart as compact context → full-width map → selected record detail with separate Physical Damage and Operational Effect fields → paired explanatory sections. Clusters must expand/reveal exact underlying accepted records.

### Platform
MapLibre + ECharts + HTML/CSS/SVG.

### Color
Selection cyan. Physical-damage state may use existing accepted status semantics. Operational effect uses a separately labeled treatment and may not inherit a physical-damage color by proxy.

### Preserve
Strike records, dates, all existing map points/coordinates, facility links, monthly calculation, damage observations, operational-effect propositions, force movements, chronology, and evidence.

### Surface better
The evidentiary ladder that a casual reader often collapses. The design must not imply **hit = damaged = destroyed = operationally ineffective** unless the accepted record independently supports each step.

### Missing/dependency
No inferred strike radius, accuracy cone, destroyed percentage, cumulative campaign score, or operational-effect promotion based only on imagery/damage.

### Mockup instruction
Show a selected facility/strike with all five map hierarchy levels legible, an active temporal filter with basis/denominator visible, and a Physical Damage / Operational Effect pair whose accepted states differ. The screenshot must make the false equivalence between hit, damage, destruction, and ineffectiveness visually impossible.

## 8.6 War · Bases & Infrastructure
**Route:** `military.facilities` · `/war/facilities/` · `FacilitiesPage`

### Analytical job
Answer: **Which facilities are in the accepted record, what is their current accepted status, and what evidence supports that status?**

### Primary
MapLibre facility map with semantic symbol shape for facility class where available and accepted status treatment.

### Secondary
- horizontal bar/count distribution by existing facility status/BDA tier;
- selected facility dossier;
- imagery/evidence links.

### Desktop
65/35 map/detail; status distribution above or immediately below map as a compact analytical summary.

### Interactions
Status/class filters; map/list synchronization; selected facility detail; evidence/imagery reveal.

### Mobile
Search/filter → facility list; map is a switchable analytical view. Selection opens dossier below.

### Platform
MapLibre + ECharts + HTML.

### Preserve
Facility IDs, location coordinates, status predicates, BDA tiers, full record disclosure, imagery links, evidence.

### Color
Status semantics only. Facility class differentiated by icon/shape, not color alone.

### Avoid
Heatmaps that imply uncertainty density, inferred footprints, radius rings, damage percentages.

### Mockup instruction
Show one selected facility with status and evidence path visibly tied to it.

---

## 8.7 War · Air, Missiles & Drones
**Route:** `military.weapons` · `/war/weapons/` · `WeaponsPage`

### Analytical job
Answer: **What systems are in the accepted record, how has their recorded use/loss changed over time, and what can/cannot be compared?**

### Primary
ECharts **small-multiple time series** by compatible system family or actor, using only accepted expenditure/launch/loss series. Do not combine incompatible denominators.

Where only categorical totals exist, use horizontal bars instead of inventing a time series.

### Secondary
- system comparison ledger;
- HTML/SVG operational sequence only where accepted records support a clear process (launch → detection/intercept → outcome, etc.);
- aviation cross-checks.

### Desktop
Dominant chart area with selector for metric/family; ledger beneath. Keep units persistent.

### Interactions
Metric selector, actor/system selector, time window where supported, evidence detail.

### Mobile
One selected metric/system at a time; swipe/segmented selector for small multiples, not compressed 6-series spaghetti.

### Platform
ECharts + HTML/CSS/SVG.

### Color
One hue per selected series only where needed for comparison; actor identity primarily labels/flags. Red/green reserved for status/outcome.

### Preserve
Accepted expenditure records, attrition/loss reconciliation, aviation cross-checks, unknown quantities, evidence.

### Missing/dependency
If historical series are sparse, show sparse marks and gaps. No interpolation/smoothing.

### Risk
“Fired” versus “intercepted” versus “hit” denominators can diverge. Units and source basis must remain explicit.

### Mockup instruction
Show a supported time-series case and a sparse-data case so the renderer demonstrates gap handling.

---

## 8.8 War · Casualties & Losses
**Route:** `military.losses` · `/war/losses/` · `LossesPage`

### Analytical job
Answer: **What casualty and materiel losses are in the accepted record for each existing side/actor grouping, by compatible category, while keeping verified, claimed-only, and unknown/unresolved states honest?**

### Primary
**Paired analytical accounting columns with one shared category structure.** This is accounting, not a scoreboard.

Use the existing accepted side/group membership. Align categories across the center so like is compared with like. The center carries category/unit labels and shared basis—not a winner, ratio, or aggregate score.

Where the read model already supports the distinction, each quantity uses an explicit status treatment for:

- accepted/verified quantity;
- claimed-only quantity;
- unknown/unresolved quantity;
- direct evidence access.

Unknown/unresolved is a labeled state, never an empty bar interpreted as zero.

### Secondary
Actor-specific modules beneath/within each side showing only categories actually present: personnel, aircraft, ships, vehicles, systems, other materiel, and unknown/unresolved as supported by the accepted record.

### Desktop
Paired columns remain simultaneously visible with shared category alignment. Evidence/control detail appears at the row or selected-category level so the reader can inspect why a number/status is present.

### Interactions
Actor/category filter; accepted status view controls only where those distinctions already exist; selected category highlights the same category on both sides without adding unlike denominators. Evidence reveal stays tied to the selected quantity/record.

### Mobile
Support both required reading modes:

1. **Focused side view** — one existing side/group with the full shared category order;
2. **One-category compare** — the same selected category shown side by side/stacked for both sides.

Switching modes cannot change the denominator, status, or underlying record set silently.

### Platform
ECharts + HTML/CSS.

### Color
Sides/actors are identified by names/flags/labels, not red-versus-blue. Accepted/verified, claimed-only, and unknown/unresolved states use the common status grammar and non-color cues.

### Preserve
All casualty/material-loss records, IDs, existing side/group membership, claimed vs verified separation, unknown quantity treatment, reconciliation logic, any authorized maps, source basis, and evidence.

### Avoid
Do not turn unknown into zero; add unlike denominators; produce kill ratios; sum incompatible categories into a headline total; or manufacture a composite win/loss score.

### Mockup instruction
Show paired accounting with at least one accepted/verified quantity, one claimed-only quantity, and one unknown/unresolved quantity where currently supported. Include desktop paired columns, mobile focused-side state, and mobile one-category comparison with evidence access visible.

## 8.9 War · Damage Images
**Route:** `military.imagery` · `/war/damage-images/` · `ImageryPage`

### Analytical job
Answer: **What imagery exists, what does the accepted observation say, where is it, and what should the reader not infer from the image alone?**

### Primary
Large selected imagery plate with accepted observation text and source/date immediately adjacent.

### Secondary
MapLibre facility/imagery location map + filmstrip/gallery.

### Interaction
Select facility/image; progressive disclosure for observation/evidence. Before/after slider only if the read model explicitly contains a valid paired before/after set.

### Desktop
60/40 selected image + detail; map/filmstrip below or beside depending aspect ratio.

### Mobile
Image first; observation directly below; filmstrip; optional map after.

### Platform
HTML/CSS + MapLibre.

### Preserve
Image records, dates, facility associations, observation wording, claim links, evidence/source.

### Avoid
AI enhancement, inferred polygons, damage percentages, target-quality annotations, unapproved before/after pairing.

### Mockup instruction
Demonstrate the treatment of an image whose observation is narrower than what a casual viewer might assume.

---

## 8.10 Themes · Hormuz & Economy
**Route:** `hormuz.overview` · `/themes/hormuz/` · `HormuzOverviewPage`

### Analytical job
Answer: **How does the Strait connect military control/access, shipping behavior, sanctions/financial pressure, and economic consequences in the accepted current record?**

This is a flagship analytical composition, not a generic theme landing page.

### Primary visual A
One **layered MapLibre Hormuz analytical map**. Where supported by accepted data, layers may include:
- strategic geography;
- shipping lanes;
- choke points;
- ports/facilities;
- accepted control/closure claims;
- historical/pre-war operating condition;
- current accepted access/control condition;
- negotiating positions concerning passage;
- relevant GCC positions;
- U.S./Iran positions;
- alternative routes.

These are layers on one authored map, not repeated maps. Existing point and route geometry remains authoritative.

### Primary visual B
A serious financial/economic analytical surface using **existing protected economic charts as required content** plus only separately authorized/additive ECharts views.

For any additive ECharts view supported by accepted data:
- line for a compatible continuous time series;
- bars/dot plot for discrete same-unit comparison;
- small multiples when units differ;
- accepted event annotations for chronology/context.

Do not silently replace a protected economic chart. A proposed richer ECharts reproduction of a protected chart must be labeled a **separately approved parity-migration candidate** outside this facelift specification.

### Desktop
Map and economic surface operate as co-primary objects on wide screens, with integrated legends and selected-state detail. Under them: accepted “why it matters” / transmission / sanctions explanation and child-theme navigation.

### Coordinated cross-highlighting
- Selecting an accepted geographic event/state may highlight the corresponding accepted date/event annotation on the economic surface when that temporal relationship is supported.
- That highlight means **same accepted event/date context**, not causation, unless accepted evidence establishes causation.
- Selecting a country/metric may emphasize relevant geographic context but may not silently hide unrelated accepted map facts.
- The chart always keeps date basis, units, source basis, selected metric/country, and selected state visible.
- Map and economic selections share an obvious reset to the full accepted context.

### Interactions
Map layer toggles; country/metric controls only where supported; exact accepted observation on selection; evidence reveal. Selection never silently changes the date basis or denominator.

### Mobile
Segmented switch between **Map** and **Economy** as co-primary surfaces. Each retains its own legend, selected-state summary, and evidence path. Cross-highlighted context is described textually when the paired surface is not visible. Explanatory flow follows.

### Platform
MapLibre + existing protected economic renderer(s) + additive ECharts where explicitly authorized + HTML/CSS/SVG.

### Color
Routes/selection cyan. Degraded access amber, blocked/severe disruption red, still-usable green only where accepted. Country series use labels/markers/line style; nation identity never maps to good/bad semantics.

### Preserve
All accepted Hormuz assessments, shipping records, sanctions relationships, **all existing protected economic charts/calculations/series**, map points, route geometry/IDs, source dates, and evidence.

### Data dependency
If a desired historical baseline is not present, show the actual accepted temporal extent. Cross-highlighting requires an accepted matching record/date/context; otherwise the views remain unlinked rather than implying a relationship.

### Mockup instruction
Produce a flagship desktop and mobile state showing the layered Hormuz map, the required protected economic visualization, and—only if data supports it—an additive analytical ECharts view. Include one map→time-context cross-highlight and one country/metric→geographic emphasis state with date basis, units, source basis, selection, and reset visible. The reference must make clear that temporal coordination is not causal attribution.

## 8.11 Themes · Shipping & Trade
**Route:** `hormuz.shipping` · `/themes/shipping/` · `ShippingPage`

### Analytical job
Answer: **What shipping routes remain usable, what has changed in observed traffic/risk, what alternatives exist, and what merchant losses are accepted?**

### Primary
Continuous MapLibre **Theater → Gulf → Hormuz** route map preserving exact accepted route geometry and IDs.

### Secondary
ECharts time-series of accepted transit/shipping observations. Use points/line with gaps exactly where observations are missing; do not imply continuous telemetry.

Alternative-route comparison uses HTML/SVG or structured rows, not another map unless geography is necessary.

### Interactions
Route selection; layer toggles; date observation selection; merchant-loss selection; evidence reveal. If direction is accepted by route semantics, restrained arrows may show direction; no animated vessel movement.

### Desktop
Map dominates 65–70%; right rail contains selected route/traffic observation. Trend chart below map; alternatives/merchant losses below.

### Mobile
Map first with route selector; selected route detail; compact trend; alternatives; losses.

### Platform
MapLibre + ECharts + HTML.

### Preserve
Route IDs/geometry, route controls, transit records, alternatives, merchant-loss records, cross-links, evidence.

### Risk
Schematic routes must be labeled schematic/non-navigational as already required.

### Mockup instruction
Show one selected route and one accepted traffic observation with its date/source basis.

---

## 8.12 Themes · Oil & Economic Effects
**Route:** `hormuz.economy` · `/themes/economy/` · `EconomyPage`

### Analytical job
Answer: **What economic effects are actually observed, how have supported indicators moved, what comparisons are valid, what accepted events provide chronological context, and through what supported mechanisms can Hormuz/war pressure transmit into prices, FX, imports, procurement, and commerce?**

### Protected baseline
Existing protected economic charts/calculations/series remain present and functional. This facelift may reframe, annotate, or compose around them, but may not silently replace their renderer or semantics.

Where a richer ECharts treatment would materially improve the page, classify it as either:
1. an **additive supporting visualization** built from accepted data; or
2. a **separately approved parity-migration candidate** for later work.

### Authorized quantitative modes
Where existing accepted data supports them, new/additive ECharts views use only these forms:

**Trend**
- one compatible metric over time;
- actual accepted observations only;
- visible missing intervals/gaps;
- no interpolation or smoothing across missing data.

**Compare**
- same-period, same-unit, denominator-compatible comparison;
- horizontal bar or dot plot where it communicates the comparison more clearly;
- no false multi-axis equivalence and no normalization/indexing unless separately accepted and explicitly labeled.

**Event Context**
- accepted event annotations over an accepted time series;
- chronology/context only;
- no visual causal arrow or causal language unless the accepted record establishes causation.

Do not use candlestick/OHLC styling without actual accepted OHLC data.

### Secondary
HTML/SVG **economic transmission diagram** whose visual grammar distinguishes:

- **supported mechanism** — accepted pathway/relationship;
- **observed consequence** — accepted consequence already observed;
- **potential/watch consequence** — explicitly not yet observed/established as a current consequence.

Use different border/connector/label treatments in addition to status color. Do not turn an ordered flow into a stronger causal finding than the accepted record supports.

### Desktop
Protected chart(s) remain in the primary analytical composition. Authorized Trend/Compare/Event Context views may sit beside/below them where they add a distinct analytical job. Selected metric/current reading detail and source/evidence access remain adjacent. Transmission flow follows as explanation, not as a second source of truth.

### Interactions
Metric/country selection only where supported; selected series retains units/date/source basis. Event annotation selection may focus the matching accepted chronology item. Compare mode refuses incompatible unit/period combinations rather than forcing a visual comparison.

### Mobile
One metric/country/mode at a time; protected charts retain their required semantics; no compressed multi-axis view. Transmission flow becomes vertical while preserving the same mechanism/observed/potential distinctions.

### Platform
Existing protected economic renderer(s) + additive ECharts where authorized + HTML/CSS/SVG. MapLibre only where a supported geographic economic relationship answers a real analytical question.

### Preserve
Protected economic charts, calculations, accepted observations/series, source/date basis, forecast/observed distinctions, accepted annotations, and evidence.

### Avoid
Smoothing, filled gaps, invented baselines, synthetic composite “economic pressure” index, unlabeled forecast continuation, incompatible comparisons, candlestick/OHLC without OHLC data, or chronology rendered as causation.

### Mockup instruction
Show the protected chart treatment plus one supported additive mode (Trend, Compare, or Event Context) if current data supports it. Include a transmission-flow example in which supported mechanism, observed consequence, and potential/watch consequence are visually distinct. The result must read as a credible financial analytical page, not KPI tiles with decorative sparklines.

## 8.13 Themes · Sanctions & Impact
**Route:** `hormuz.sanctions` · `/themes/sanctions/` · `SanctionsPage`

### Analytical job
Answer: **What was legally targeted, where does the targeted node sit in the financial/commercial network, what routes are degraded/blocked/still usable, and what consequences are observed?**

### Primary composition
Preserve the approved north-star concepts:
- What changed
- Why it matters
- What still flows
- Observed effect
- Why sanctions matter now
- “47 years is not the same as now”
- named-node geography
- primary vs secondary sanctions
- money-flow / workaround architecture
- one-node consequence chain
- watch indicators
- wartime sanctions/entities chronology

### Visual assignment
- MapLibre: named-node geography.
- HTML/CSS/SVG: primary-vs-secondary and short causal chains.
- ELK only if the money/workaround network becomes genuinely branching enough to require it.
- ECharts: only for actual quantitative economic/time-series panels, not the core conceptual flow.
- Existing flags/icons retained.

### Interaction
Selecting a named node highlights its network position and associated accepted detail. Flow state legend: blocked / degraded / still usable / high risk. Evidence attached to designation/observation nodes.

### Color
Use the mockup semantics: red blocked/severe, amber degraded, green usable, cyan neutral/selected. Never infer legal designation = observed damage.

### Preserve
Designation records, sanctioned entities, legal/behavioral distinctions, network relations, accepted consequences, chronology, evidence.

### Critical semantic rule
**Designation ≠ damage. Legal reach ≠ behavioral reach.** The visual hierarchy must preserve this distinction.

### Mockup instruction
Use this page as the production-quality reference, not as a template to duplicate elsewhere.

---

## 8.14 Diplomacy · Overview
**Route:** `talks.overview` · `/diplomacy/overview/` · `DiplomacyPage`

### Analytical job
Answer: **What diplomatic tracks exist, who is participating/mediating, what is their current accepted status, and what has actually been agreed versus merely proposed?**

### Primary
HTML/SVG **multi-track status matrix**. Rows = accepted diplomatic tracks; columns = parties/mediator/current status/latest accepted milestone.

### Secondary
MapLibre regional mediation geography + compact chronology.

### Interaction
Select track to update detail/chronology/map participants. Evidence reveal from accepted milestone/status.

### Desktop
Status matrix dominant 60%; map 40%. Chronology beneath.

### Mobile
Track cards with expandable detail; map optional after selected track.

### Platform
HTML/CSS/SVG + MapLibre. ECharts only if a genuine temporal density or comparable quantitative series exists; do not chart diplomacy for decoration.

### Preserve
Agreement membership/status, mediator roles, diplomatic records, chronology, wording, evidence.

### Mockup instruction
Make “agreement / proposal / condition / talks / unresolved” visually impossible to confuse.

---

## 8.15 Diplomacy · Current Hormuz Talks
**Route:** `hormuz.talks` · `/diplomacy/hormuz/` · `HormuzNegotiationsPage`

### Analytical job
Answer: **What is each side currently saying/conditioning, what has or has not been agreed, and how did the talks reach this state?**

### Primary
HTML/SVG **party-position / condition-response flow**, with lanes by party/mediator. Do not merge statements into a synthetic compromise.

### Secondary
Chronology with clearly marked accepted proposal/agreement/status changes.

### Interactions
Select issue/party; highlight corresponding accepted statements and evidence.

### Mobile
Vertical party lanes; issue selector.

### Preserve
Exact accepted positions, proposal status, chronology, source associations, language.

### Risk
Never display “Phase 1,” “deal,” “agreement,” or equivalent unless that is accepted wording/status.

### Mockup instruction
The first screen must answer “Is there an agreement?” from accepted language before showing negotiation detail.

---

## 8.16 Diplomacy · June MOU
**Route:** `talks.mou` · `/diplomacy/june-mou/` · `MouPage`

### Analytical job
Answer: **What did the signed MOU actually say, what obligations/concessions belonged to whom, and what is the current implementation/status?**

### Primary
HTML/CSS **clause/obligation matrix** with exact accepted clause summaries/wording and party ownership.

### Secondary
Implementation chronology and current-status callout.

### Interaction
Select clause → exact accepted language/source/evidence. Optional filter by party/topic.

### Desktop
Document/status summary → matrix → chronology → source text/evidence.

### Mobile
Accordion by clause, preserving clause order.

### Platform
HTML/CSS/SVG. ECharts is not required unless there is an actual quantitative series.

### Preserve
Exact accepted MOU language, obligations, implementation facts, chronology, source relationships.

### Avoid
“Who won the deal” scorecards, equal-sized concessions implying equivalence, or later facts rewriting original terms.

### Mockup instruction
Design it like a professional agreement dossier, not a comparison infographic with invented balance.

---

## 8.17 Diplomacy · Nuclear Talks
**Route:** `talks.nuclear` · `/diplomacy/nuclear/` · `NuclearPage`

### Analytical job
Answer: **What are the key issues, what position does each party hold in the accepted record, how have those positions changed, and what remains unresolved?**

### Primary
HTML/SVG **issue-by-party position matrix** with rows for accepted issues and columns for relevant parties/status.

### Secondary
Chronology/position-change lane.

### Interaction
Issue select → accepted statements and source detail. No technical simulation.

### Platform
HTML/CSS/SVG. ECharts only if there is an accepted quantitative series; otherwise its use is gratuitous.

### Preserve
Accepted nuclear-position language, chronology, sources.

### Avoid
Breakout clocks, enrichment projections, capability gauges, or inferred technical values not in accepted data.

### Mockup instruction
Text precision is more important than visual spectacle here; visual design should reduce position confusion.

---

## 8.18 Diplomacy · Regional Diplomacy
**Route:** `talks.regional` · `/diplomacy/regional/` · `RegionalDiplomacyPage`

### Analytical job
Answer: **Which regional actors are mediating, aligning, negotiating, or entering accepted agreements, and where do those relationships sit geographically?**

### Primary
MapLibre regional diplomacy map. Use lines only for accepted relationships/events and clearly distinguish agreement, mediation, and contact if those types are present.

### Secondary
Actor/mediator detail + chronology.

### Interactions
Actor select, relationship-type filter, chronology selection.

### Mobile
Actor selector → focused map → accepted relationship list.

### Preserve
State/mediator identities, agreements, chronology, source relationships.

### Avoid
Implied alliances from proximity or unaccepted “blocs.”

### Mockup instruction
Show at least two relationship types to prove line style/legend semantics.

---

## 8.19 Diplomacy · Goals & Results
**Route:** `objectives.outcomes` · `/diplomacy/outcomes/` · `ObjectivesPage`

### Analytical job
Answer: **What was the original objective, what is the accepted current result, why, and what evidence supports that result?**

### Primary
HTML/SVG **objective → result lanes**. Each lane:
original objective → current accepted result/status → concise “why” → evidence.

### Secondary
Contrary/supporting evidence detail where already present.

### Interaction
Filter by actor/objective type if existing data supports it; select lane for evidence.

### Platform
HTML/CSS/SVG. Do not use a chart merely to count wins/losses.

### Color
Status semantics may use good/warn/danger/neutral, but label text is mandatory. Do not produce a composite score.

### Preserve
Objective wording, outcome status, evidence, corrections, actor relationships.

### Mockup instruction
The page should visually enforce the engineering doctrine: original objective → current result → short why → evidence.

---

## 8.20 Diplomacy · Position Changes
**Route:** `objectives.positions` · `/diplomacy/positions/` · `PositionChangesPage`

### Analytical job
Answer: **What was said/held before, what intervening event occurred, and what position is accepted afterward?**

### Primary
HTML/SVG **Before → Event → After lanes**, one per accepted position-change record.

### Secondary
Chronology density only if many records; otherwise no ECharts.

### Interaction
Issue/actor filter; select record for exact wording/evidence.

### Mobile
Vertical Before ↓ Event ↓ After sequence.

### Preserve
Original/later language, intervening event chronology, classifications, sources.

### Risk
Sequence is not causation. Use “after”/“following” language unless the accepted record establishes causality.

### Mockup instruction
Do not use arrow styling that implies causal force where only chronology is accepted.

---

## 8.21 Diplomacy · Iran’s Position
**Route:** `objectives.iran` · `/diplomacy/iran-position/` · `IranMessagingPage`

### Analytical job
Answer: **What has Iran publicly said on each relevant issue, what does the accepted record assess as its current position, and how has that changed over time?**

### Primary
Issue-based **position chronology**: accepted statement → later statement/change → current accepted position.

### Secondary
Source/evidence rail; small chronology density only if it adds navigation value.

### Platform
HTML/CSS; ECharts only for event density, not rhetorical sentiment scoring.

### Preserve
Exact accepted statements, position-change records, dates, source context.

### Avoid
Sentiment analysis, propaganda score, inferred intent not already adjudicated.

### Mockup instruction
Visually distinguish “statement” from “accepted assessed current position.”

---

## 8.22 Intelligence · Claim Checks
**Route:** `evidence.claims` · `/intelligence/claims/` · `ClaimChecksPage`

### Analytical job
Answer: **What exactly was claimed, what is the accepted adjudication, what evidence supports/contradicts it, and what remains unresolved?**

### Primary
Claim → adjudication → evidence sequence, with the claim text visually dominant enough to prevent paraphrase drift.

### Secondary
Filter/status summary. If ECharts is used, use a simple horizontal count by accepted adjudication status for navigation context only. Do not chart actor “truthfulness.”

### Interaction
Status/topic filter, claim select, evidence reveal, related/repeated claim navigation.

### Mobile
Claim cards in accepted sequence; evidence drawer remains the receipt surface.

### Platform
HTML/CSS; ECharts optional summary only.

### Color
Adjudication statuses use existing semantic treatment and labels. Actor identity stays neutral.

### Preserve
Claim IDs/text, adjudication, knowledge state where public, observed outcome, unresolved items, supporting/contrary evidence, order, EvidenceDrawer relations.

### Mockup instruction
A screenshot must always contain the exact claim + adjudication + a visible path to “how we know.”

---

## 8.23 Intelligence · Lie Ledger collection
**Route:** `evidence.information` · `/intelligence/lie-ledger/` · `InformationEnvironmentPage`

### Analytical job
Answer: **What forensic narrative cases exist and what finding was reached, while letting the reader enter a complete case chain?**

### Primary
Dense case index with compact **claim/finding/evidence-chain preview**.

### Secondary
Filters and related-material cues.

### Platform
HTML/CSS/SVG.

### Interaction
Filter by accepted finding/category; open case dossier; evidence reveal where already supported.

### Preserve
Chain membership/order, finding filters, case links, evidence drawers, exact claim/finding language.

### Avoid
Actor liar rankings, scoreboards, or summary percentages that flatten case nuance.

### Mockup instruction
The collection should feel forensic and searchable, not like a sensational “wall of lies.”

---

## 8.24 Intelligence · Lie Ledger case dossier
**State:** parameterized `InformationEnvironmentPage`

### Analytical job
Answer one case completely: **claim → finding → evidence → development/correction → related material.**

### Primary
Vertical forensic chain with clear state labels and exact accepted content order.

### Secondary
Chronology markers and related-material rail.

### Interaction
Evidence reveal at each relevant record; related-case navigation.

### Mobile
Single column; no side rail required.

### Platform
HTML/CSS/SVG.

### Preserve
Exact selected case wording, list membership/order, evidence, chronology, findings.

### Mockup instruction
Use strong visual causality only where the record itself establishes it; otherwise connect sections by chronology/record relation.

---

## 8.25 Intelligence · Web of Lies
**Route:** `evidence.web_of_lies` · `/intelligence/wol/` · `WebOfLiesPage`

### Analytical job
Answer: **Who propagated which accepted claim relationship, how are accepted nodes directly connected, and what is the accepted directed propagation trace?**

### Primary
Cytoscape network with the existing explicit reader modes:
- FULL NETWORK
- DIRECT CONNECTIONS
- TRACE PROPAGATION

### Accepted-semantic node grammar
Build the visual node grammar **only from node classes/types already present in the accepted WOL model**:

- shape may distinguish an existing node class;
- icon may distinguish an existing node class where an approved icon exists;
- border style/weight may distinguish an existing accepted node state/class;
- actor/source identity remains textual and may use existing flags where already authorized.

Do not create a new class merely because the graph would look cleaner.

### Accepted-semantic edge grammar
Edge treatment may distinguish only relationship classes already present in accepted WOL data:

- accepted direction remains arrow direction;
- existing relationship class may map to line pattern/weight/label;
- selected/trace edges may receive presentation emphasis or reduced-motion-safe direction treatment;
- layout proximity, crossing avoidance, or clustering never creates a relationship.

### Forbidden encodings
Never encode or infer:
- credibility score;
- ideological guilt;
- “bad actor” status;
- inferred relationship;
- new narrative family/grouping;
- guilt/importance by node size unless an already-accepted quantitative field explicitly defines that size.

### Layout behavior
Selected node 100% prominence; directly connected accepted nodes/edges high prominence; unrelated graph approximately 10–15% opacity. Direction arrows remain readable. Trace animation, when enabled, follows accepted directed edges only and is replaced by static direction under reduced motion.

Layout clustering is presentation-only. If a grouping does not already exist in accepted data, spatial proximity/cluster hulls may not be labeled as a factual group.

### Secondary
Detail rail with actor/claim identity, exact accepted findings/receipts, direct relationships, ordered trace equivalent, and evidence.

### Interaction
Search/select node; switch mode; trace; fit/reset; evidence reveal. Graph wheel/pinch must not hijack ordinary page scroll until the reader deliberately engages graph interaction.

### Mobile
Selection-first. DIRECT CONNECTIONS plus a vertical accepted TRACE PROPAGATION representation is the default comprehension path. FULL NETWORK remains available, but it cannot be the only way to understand the selected record.

### Platform
Cytoscape 3.34.0 + HTML/CSS/SVG. fCoSE only if it passes the established deterministic/readability/performance gates; ELK is not the full-network layout.

### Preserve
FULL NETWORK / DIRECT CONNECTIONS / TRACE PROPAGATION modes; every accepted WOL node; every accepted edge and its direction/class; receipts; findings; Hall logic; claim trails; ordering where protected; and evidence relationships.

### Color
Use actor-neutral state semantics. Node/edge class distinction may use restrained categorical styling only when directly mapped from existing WOL semantics. Do not let truth/falsity/status color overwrite actor/type identity or imply a credibility scale.

### Mockup instruction
Show all three modes and a dense-network case. Include a visual legend that names only existing accepted node/edge classes, a selected node with detail/evidence, and a trace whose textual equivalent enumerates the same accepted directed edges. No new grouping, score, or inferred relationship may appear.

## 8.26 Intelligence · WOL actor dossier
**State:** parameterized `WebOfLiesPage`

### Analytical job
Answer: **What is this actor’s current record, findings, claim activity, chronology, and accepted direct/trace network?**

### Primary
Selected actor neighborhood/trace with the actor dossier text as co-primary.

### Desktop
60–70% graph / 30–40% dossier rail; below: chronology and receipts.

### Mobile
Identity/findings first, then direct connections, then vertical trace, chronology, receipts.

### Platform
Cytoscape + HTML/CSS/SVG.

### Preserve
Actor identity, findings, claim activity, accepted edges, receipts, chronology.

### Mockup instruction
Ensure the graph supports the dossier rather than becoming a decorative background.

---

## 8.27 Sources · Source Library
**Route:** `evidence.sources` · `/sources/` · `SourcesPage`

### Analytical job
Answer: **What sources are in the public evidence system, how are they grouped, and where has each source been used?**

### Primary
Dense searchable grouped directory.

### Secondary
Selected source detail and saved-version/context disclosure.

### Interaction
Search, existing family/origin/outlet filters, group expand/collapse, source detail.

### Platform
HTML/CSS only.

### Preserve
Source resolver, grouping keys, source identities, saved-version behavior, search, item order, evidence relationships.

### Avoid
Charts of “source quality” unless such a metric is explicitly accepted—which it currently is not.

### Mockup instruction
Polish comes from information density, typography, grouping, and search—not gratuitous visualization.

---

## 8.28 Sources · Methodology
**Route:** `evidence.method` · `/sources/methodology/` · `MethodPage`

### Analytical job
Answer: **How does information become an accepted public conclusion, what do key statuses mean, and how is the record updated without exposing internal engineering clutter?**

### Primary
HTML/SVG reader-facing process:
source/evidence → accepted factual record/adjudication → public explanation → evidence access/update.

Do not expose internal-only lane/persona/schema jargon prohibited by engineering doctrine.

### Secondary
Vocabulary/status definitions and correction/update principles.

### Platform
HTML/CSS/SVG.

### Animation
Optional one-time directional emphasis on the flow, reduced-motion safe. No looping process animation.

### Preserve
Methodology meaning, evidence boundary, correction policy, update semantics.

### Mockup instruction
Use the same polished flow language as sanctions operational flows, but with reader-facing methodology concepts only.

---

## 8.29 Sources · Archive
**Route:** `evidence.archive` · `/sources/archive/` · `ArchivePage`

### Analytical job
Answer: **What historical public snapshots/editions exist, when were they current, and how do I inspect them without confusing them for present authority?**

### Primary
Chronological release/snapshot index.

### Secondary
Compact timeline if volume justifies it; otherwise no chart.

### Interaction
Date/year filter; open snapshot; explicit return-to-current action.

### Platform
HTML/CSS. ECharts only if archive volume makes a temporal navigator genuinely useful.

### Preserve
Edition records, order, snapshot identity, chronology, current-vs-archive authority.

### Color
Archived items neutral/slate. Current authority gets accent treatment, not “good” green.

### Mockup instruction
A screenshot of an archive state must visibly say it is historical/non-current.

---

# 9. Pages that should remain relatively simple

The following should receive full visual polish but **not** be forced into chart-heavy dashboards:

- Source Library
- Methodology
- Archive (unless volume warrants chart navigation)
- June MOU
- Nuclear Talks
- Goals & Results
- Position Changes
- Iran’s Position
- Lie Ledger collection/case dossier

Their analytical quality comes from structure, typography, exact wording, selective diagrams, and evidence access.

# 10. Pages that deserve major recomposition

Highest-value recompositions:

1. Hormuz & Economy
2. Oil & Economic Effects
3. Shipping & Trade
4. Campaigns & Strikes
5. Casualties & Losses
6. Timeline
7. Bases & Infrastructure
8. Who’s Involved
9. Sanctions & Impact production realization
10. WOL presentation modes

# 11. Map-worthy pages

MapLibre materially improves:

- Overview
- Who’s Involved (hybrid)
- Timeline selected window
- Campaigns & Strikes
- Bases & Infrastructure
- Damage Images context
- Hormuz & Economy
- Shipping & Trade
- Sanctions named-node geography
- Diplomacy Overview (secondary)
- Regional Diplomacy

Map use is gratuitous or secondary for:

- Weapons
- Losses
- June MOU
- Nuclear Talks
- Goals & Results
- Position Changes
- Iran’s Position
- Claim Checks
- Lie Ledger
- Sources/Methodology/Archive

# 12. ECharts-worthy pages

ECharts materially improves understanding when supported by accepted data:

- Timeline event-density navigator
- All Events density context
- Campaign recorded-activity series
- Bases status distribution
- Weapons compatible time series / categorical comparisons
- Losses category comparisons
- Hormuz financial/economic chart
- Shipping traffic time series
- Oil & Economic Effects financial workbench
- Claim Checks status summary only if useful

ECharts should **not** be used simply to make these pages look richer:

- Source Library
- Methodology
- June MOU
- Nuclear Talks without actual quantitative series
- Goals & Results
- Lie Ledger
- WOL

# 13. Information dependencies that must be surfaced, not invented

The renderer must label a mockup dependency when the ideal visual requires any of the following:

- historical economic series earlier than the accepted extent;
- a relationship edge not present in accepted data;
- a before/after imagery pairing not explicitly represented;
- a compatible denominator across weapons/loss categories;
- a geographic point for a non-state actor without accepted location semantics;
- a causal relationship stronger than accepted chronology;
- a quantitative confidence/score not already accepted;
- continuous shipping telemetry where only discrete observations exist;
- facility footprints/radii not in accepted geometry;
- uncertainty bands not present in source data.

Classify dependencies as:
1. already available elsewhere in accepted Guide data;
2. safe aggregation from existing accepted records, requiring explicit authorization;
3. requires new research/evidence;
4. should not be added.

# 14. Mockup production order

The renderer should not produce 29 arbitrary mockups in parallel.

## Phase 1 — flagship visual grammar
Produce and review:
1. Hormuz & Economy
2. Oil & Economic Effects
3. Campaigns & Strikes
4. Casualties & Losses
5. Timeline
6. WOL
7. Who’s Involved

These prove the major object classes:
- financial chart;
- authored map;
- bilateral comparison;
- temporal navigator;
- network;
- geographic selector.

## Phase 2 — adjacent archetypes
After Phase 1 is accepted:
- Shipping & Trade
- Bases & Infrastructure
- Weapons
- Damage Images
- Sanctions production reference
- Diplomacy Overview
- Regional Diplomacy
- Current Hormuz Talks

## Phase 3 — text/forensic/reference surfaces
Then:
- All Events
- June MOU
- Nuclear Talks
- Goals & Results
- Position Changes
- Iran’s Position
- Claim Checks
- Lie Ledger collection + dossier
- WOL actor dossier
- Source Library
- Methodology
- Archive
- Overview

Overview comes late deliberately: it should synthesize the settled visual grammar rather than become another template source.

# 15. Required renderer mockup package

For every route/state the renderer must package:

1. canonical route key/path/owner;
2. desktop mockup;
3. mobile mockup for every map/chart/network/high-interaction page;
4. primary analytical question;
5. dominant visual object;
6. exact renderer/tool;
7. exact chart/diagram/map form;
8. color/state legend;
9. interaction list;
10. selected-state example;
11. loading/failure state where a heavy renderer is used;
12. evidence affordance location;
13. preservation checklist;
14. any data dependency/conflict;
15. note explaining why this visual form is better than the rough PR #279 composition.

Mockups must use representative **existing accepted language/data placeholders from the current page**, not invented political claims or synthetic findings. When exact content cannot safely be embedded in the reference, label the slot by existing field/category rather than fabricate copy.

## 15.1 Phase 1 mockup acceptance matrix

The seven Phase 1 mockups are not approved merely because they contain the named renderer. Each must prove the following reader contract before production implementation:

| Phase 1 page | Mockup must prove | Must not imply |
|---|---|---|
| Hormuz & Economy | layered authoritative geography; protected economic visualization retained; coordinated map↔time/country context; visible date/unit/source/selection/reset | temporal correlation = causation; ECharts automatically replaces protected charts |
| Oil & Economic Effects | protected chart treatment; valid Trend/Compare/Event Context mode where supported; mechanism vs observed vs potential/watch flow grammar | missing data interpolation; incompatible comparison; chronology = causality; OHLC without OHLC |
| Campaigns & Strikes | five-level map hierarchy; selected record never hidden by clustering; visible filter basis/denominator; separate physical-damage and operational-effect state | hit = damaged = destroyed = operationally ineffective |
| Casualties & Losses | paired accounting columns; shared categories; accepted/verified vs claimed-only vs unknown/unresolved where supported; evidence at quantity/category level; both mobile modes | scoreboard, kill ratio, unknown = zero, unlike totals |
| Timeline | event-density navigator; Selected Period Summary with exact range/count/categories/reset; chronology primary on mobile | recorded-event density = operational-intensity score |
| Web of Lies | FULL NETWORK / DIRECT CONNECTIONS / TRACE PROPAGATION; legend derived only from accepted node/edge classes; deterministic selection/trace; textual trace equivalent | credibility/ideology/guilt scoring, inferred edges or new groupings |
| Who’s Involved | geography → accepted actor family → selected actor detail; canonical searchable index; non-state actor without fake map point; populated categories only | invented alliance/family/geography or equal-role implication |

Across all seven: selected evidence access remains visible; status is not color-only; mobile recomposes rather than shrinks; any desired visual that needs a new relationship, new calculation, new geographic point, new WOL semantic, or protected-chart replacement is recorded as a dependency/conflict rather than implemented in the mockup.

# 16. Renderer implementation instructions after mockup approval

No production implementation begins until the page mockups are approved.

When implementation begins:

1. retain PR #277’s signed lazy capability architecture, fallback logic, responsive primitives, qualification, and evidence boundaries;
2. implement shared primitives first (chart theme, map style primitives, analytical header, legends, selected detail rail, flow node grammar, mobile selector);
3. migrate flagship pages one at a time;
4. run exact-SHA qualification after each coherent tranche;
5. visually compare against the approved route mockup;
6. verify no wording/list/evidence/geometry/calculation drift;
7. then propagate the same object class to adjacent pages;
8. stop and escalate any case where the visual requires a factual transformation outside the accepted read model.

# 17. Final renderer directive

The facelift is successful when a reader can enter any Guide page and immediately understand:

- what question the page answers;
- what the accepted present state is;
- which visual object explains it;
- what can be explored;
- what is claim versus accepted finding;
- what is known versus unknown;
- how to inspect the evidence;

without needing prior military, sanctions, financial, or intelligence-analysis expertise.

The polish standard is the approved Sanctions & Impact / Hormuz & Economy work: **dense but readable, authored rather than generic, visually explanatory, evidence-aware, responsive, and actor-neutral.**

The renderer is not being asked to “make the current site prettier.” It is being asked to build the best analytical presentation of the **same accepted public record** using the platform that has already been selected.

The evidence/update machinery remains untouched.
