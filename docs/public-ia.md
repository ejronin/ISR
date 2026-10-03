# The 2026 Iran War Guide — public IA runtime

## Implementation checkpoint

This document describes the accepted Guide shell plus the third representative renderer migration tranche. The Guide shell and route registry are implemented globally. **Home / Overview, Campaigns & Strikes, Shipping & Trade, the Web of Lies actor dossier, and the Lie Ledger case dossier are migrated to their approved archetypes in this checkpoint.** The remaining page owners continue to render their existing accepted content structures under the Guide shell until a later migration tranche.

GitHub Pages hash routing remains the transport. Canonical logical paths therefore appear after the hash, for example `#/war/campaigns/`. No hosting or router migration is bundled into this work.

## Approved primary navigation

**Home | War | Themes | Diplomacy & Outcomes | Intelligence | Sources**

The route key, page owner, and original public read-model authorization remain the stable execution boundary. Regrouping a route under a new primary navigation domain does not broaden its data access.

| Primary | Route | Canonical logical path | Owner | Existing read-model group |
|---|---|---|---|---|
| Home | Overview | `/` | `OverviewPage` | `start_here` |
| Home | Who's Involved | `/home/actors/` | `ActorsPage` | `start_here` |
| War | Timeline | `/war/timeline/` | `TimelinePage` | `timeline` |
| War | All Events | `/war/events/` | `ChronologyPage` | `timeline` |
| War | Campaigns & Strikes | `/war/campaigns/` | `CampaignsPage` | `military_record` |
| War | Bases & Infrastructure | `/war/facilities/` | `FacilitiesPage` | `military_record` |
| War | Air, Missiles & Drones | `/war/weapons/` | `WeaponsPage` | `military_record` |
| War | Casualties & Losses | `/war/losses/` | `LossesPage` | `military_record` |
| War | Damage Images | `/war/damage-images/` | `ImageryPage` | `military_record` |
| Themes | Hormuz | `/themes/hormuz/` | `HormuzOverviewPage` | `hormuz_economy` |
| Themes | Shipping & Trade | `/themes/shipping/` | `ShippingPage` | `hormuz_economy` |
| Themes | Oil & Economic Effects | `/themes/economy/` | `EconomyPage` | `hormuz_economy` |
| Diplomacy & Outcomes | Overview | `/diplomacy/overview/` | `DiplomacyPage` | `diplomacy_mou` |
| Diplomacy & Outcomes | Current Hormuz Talks | `/diplomacy/hormuz/` | `HormuzNegotiationsPage` | `hormuz_economy` |
| Diplomacy & Outcomes | June MOU | `/diplomacy/june-mou/` | `MouPage` | `diplomacy_mou` |
| Diplomacy & Outcomes | Nuclear Talks | `/diplomacy/nuclear/` | `NuclearPage` | `diplomacy_mou` |
| Diplomacy & Outcomes | Regional Diplomacy | `/diplomacy/regional/` | `RegionalDiplomacyPage` | `diplomacy_mou` |
| Diplomacy & Outcomes | Goals & Results | `/diplomacy/outcomes/` | `ObjectivesPage` | `objectives_position_changes` |
| Diplomacy & Outcomes | Position Changes | `/diplomacy/positions/` | `PositionChangesPage` | `objectives_position_changes` |
| Diplomacy & Outcomes | Iran's Position | `/diplomacy/iran-position/` | `IranMessagingPage` | `objectives_position_changes` |
| Intelligence | Claim Checks | `/intelligence/claims/` | `ClaimChecksPage` | `claims_sources` |
| Intelligence | Lie Ledger | `/intelligence/lie-ledger/` | `InformationEnvironmentPage` | `claims_sources` |
| Intelligence | Web of Lies | `/intelligence/wol/` | `WebOfLiesPage` | `claims_sources` |
| Sources | Source Library | `/sources/` | `SourcesPage` | `claims_sources` |
| Sources | Methodology | `/sources/methodology/` | `MethodPage` | `claims_sources` |
| Sources | Archive | `/sources/archive/` | `ArchivePage` | `claims_sources` |

The in-flight Sanctions & Impact branch remains separately owned and is intentionally not absorbed into this tranche.

## Legacy URL contract

All 26 former route paths remain deterministic aliases to their intended route keys, and the older public section shortcuts are retained as compatibility aliases as well. Query/deep-link state is preserved while the browser replaces the address with the canonical Guide path. An unrecognized route is distinct from an alias and fails closed; it never silently becomes Home.

The route registry test enumerates every legacy alias and verifies both destination and query preservation.

## Navigation behavior

The shell owns two persistent horizontal rails:

1. the six-domain primary navigation;
2. the current domain's child routes plus, where registered, current-page anchors.

Mobile uses the same two rails with horizontal scrolling and overflow cues. There is no hamburger replacement for this hierarchy.

Long explanatory pages may expose an **On this page** rail at wide desktop sizes. It consumes the same page-section registry as the context anchors. It is never a second manually maintained navigation list.

Scroll-linked section state uses `history.replaceState`; it does not add a history entry on every section transition. Durable section targets use the shared sticky-shell scroll offset.

## Representative page tranches

`start.overview` remains the representative current-state / overview migration, with durable sections for Current state, Conflict opening, Latest record, About, and Unresolved.

`military.campaigns` is the representative explanatory-analysis / campaign migration. Its durable sections are:

- Damage vs effect
- Campaign activity
- Strike geography
- Physical damage
- Operational effect
- Developments

`hormuz.shipping` is the representative map / data-heavy migration. Its durable sections are:

- Observed shipping
- The routes
- Alternative paths
- Merchant losses

Campaigns keeps the existing monthly recorded-event calculation, constituent drilldown, strike map, damage observations, facility-effect propositions, force-movement records, and chronology records. Shipping keeps the existing chokepoint/network map system, route geometry, route controls, traffic records, alternative-route records, merchant-loss records, and loss cross-links. The migration changes hierarchy, durable section navigation, whole-object ordering, spacing and responsive presentation only.

### Parameterized Intelligence dossiers

The dossier archetypes are parameterized views over the same accepted records; they are not new page owners or new datasets.

**Web of Lies actor dossier** uses `#/intelligence/wol/?dossier=actor&source=<source_id>` and registers:

- Current record
- Findings
- Claim activity
- Chronology
- Network & claim trails

**Lie Ledger case dossier** uses `#/intelligence/lie-ledger/?case=<chain_id>` and registers:

- Claim
- Finding
- Evidence
- Development
- Related material

The dossier facelift may change hierarchy, spacing, breadcrumbs, rails, responsive composition, section landmarks, and visual emphasis. It may not rewrite accepted public language, relabel findings, change item membership, reorder evidence/list items, alter receipts, or create a second adjudication layer. Browser qualification compares the selected collection record with its dossier view to enforce text, list-membership, list-order, disclosure-label, and content-order preservation.

The remaining page bodies are not considered migrated by this checkpoint.

## First paint and release integrity

The old theatrical loading presentation is retired. The initial document exposes the Guide masthead, primary navigation, Home context navigation, stable page bounds, and the Overview H1 region. Delayed content uses a local low-contrast skeleton rather than a page-level spinner.

The neutral bootstrap remains the only initial script. Signed runtime authorization, release-manifest validation, fail-closed reader staging, and validation-before-promotion remain the publication boundary.

## Evidence and data boundary

This tranche changes presentation and routing only.

- Existing route keys remain stable.
- Existing page owners remain stable.
- Existing per-route `dataKeys` remain stable.
- Existing `page_data` authorization groups remain stable.
- `EvidenceDrawer` and source resolution remain one shared system.
- Maps, chart calculations, state-flag assets, and evidence semantics are not replaced or recomputed.
- No evidence, adjudication, ROOK/Evidence Locker, canonical-update, or sanctions-analysis dataset is modified.

Further page-body migration is intentionally stopped at this checkpoint pending review of the Web of Lies actor dossier and Lie Ledger case dossier archetypes.
