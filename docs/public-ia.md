# Phase 3 public information architecture

The permanent public IA uses GitHub Pages-compatible hash routes. `#/military/facilities`, for example, is a direct link that survives refresh and does not require server rewrites. Ordinary anchors drive navigation; a single `hashchange` listener owned by `AppShell` handles back/forward updates from the already parsed current model.

The seven primary sections and their secondary destinations are declared once in `js/public-ia.js`. Each of the 25 routes names one page owner. That owner creates the page's visible DOM and composes shared components; no other module rewrites or rearranges it after render.

| Primary section | Secondary routes and owners |
|---|---|
| Start Here | Overview — `OverviewPage`; Who's Involved — `ActorsPage` |
| Timeline | War Timeline — `TimelinePage`; Detailed Chronology — `ChronologyPage` |
| Military Record | Campaigns & Strikes — `CampaignsPage`; Bases & Infrastructure — `FacilitiesPage`; Air, Missiles & Drones — `WeaponsPage`; Casualties & Losses — `LossesPage`; Damage Imagery — `ImageryPage` |
| Hormuz & Economy | Why Hormuz Matters — `HormuzOverviewPage`; Shipping & Trade — `ShippingPage`; Oil & Economic Effects — `EconomyPage`; Current Hormuz Talks — `HormuzNegotiationsPage` |
| Talks & June Agreement | Talks & Agreements — `DiplomacyPage`; June MOU — `MouPage`; Nuclear Talks — `NuclearPage`; Regional Diplomacy — `RegionalDiplomacyPage` |
| What Each Side Wanted | Objectives & Outcomes — `ObjectivesPage`; Position Changes — `PositionChangesPage`; How Iran's Position Changed — `IranMessagingPage` |
| Claims & Evidence | Claim Checks — `ClaimChecksPage`; Information Environment — `InformationEnvironmentPage`; Sources — `SourcesPage`; How We Check the Evidence — `MethodPage`; Archive — `ArchivePage` |

`ArchivePage` describes retained revision and snapshot metadata within the current evidence product. Historical HTML applications remain repository-only audit material: the route does not link to or load them, and the closed Pages artifact does not contain them.

Shared owners are `AppShell`, `PublicNavigation`, `EvidenceDrawer`, `ActorIdentity`, `EvidenceStatus`, and contextual `MapView`. Page-owner configuration maps each route to a subset of one of the seven approved `page_data` groups in `data/public-current-state.json`. Registry validation fails if a route requests a dataset outside its approved group or any `legacy.*` dataset.

Cross-links carry the same event or record ID in the hash query instead of copying a canonical record. The detailed chronology resolves event IDs against the single derived in-memory chronology (205 records at the Phase 3.5 migration boundary). Later accepted evidence packets can add relationships through canonical data without replacing navigation.

Desktop navigation uses semantic primary and secondary `<nav>` elements. At mobile widths, a keyboard-operable disclosure presents the current primary/secondary location and vertically stacked links; it does not collapse the seven sections into a horizontal tab strip. Each page supplies exactly one H1. The shell-owned skip control moves focus directly to the current page-content container inside the single `main` landmark without changing the route hash, while route changes move focus to the new page heading.

Actor identity has two independent axes. A record is a person or an entity; a person may carry only a role explicitly supported by approved project data. Separately, the record resolves to an affiliated actor/entity with an affiliation type and, where applicable, a parent state. Flag treatment comes only from that affiliation. This lets a named parliament or IRGC official inherit Iranian state treatment while Hezbollah- and Houthi-affiliated people remain non-state and receive no host-country national flag. Unresolved identities keep their recorded name without a guessed role, affiliation, or flag.
