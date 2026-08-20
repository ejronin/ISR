# Iran War Public Evidence Atlas — Engineer Handoff

**Handoff date:** 2026-08-20  
**Repository:** `ejronin/ISR`  
**Public Pages target:** `https://ejronin.github.io/ISR/`  
**Authoritative working UI:** **v2.9 local loss-dashboard build** (`index.html` in this package)

## Critical precedence rule

The root `index.html` in this handoff is the **v2.9 working baseline** and must control UI/feature continuity.

The `archive/published v2.7/` files and `data/*v2_7*` datasets are retained because the live GitHub repository was still on the v2.7 generation when this handoff was cut. They are **migration inputs**, not permission to regress the interface.

Preserve or improve every v2.9 feature while modularizing the codebase.

## Mission

Maintain a public, auditable, human-readable OSINT war board for the 2026 Iran conflict. The product should consolidate publicly verifiable facts from multiple independent sources, preserve uncertainty, show what changed over time, and distinguish physical damage from operational effect.

This is not a political, religious, ideological, or morale product. It is not designed to make any side feel good. The evidence record controls the presentation.

## Required public sections

- Introduction / methodology
- Current operational picture
- Interactive map
- Full event timeline
- Historical map snapshots
- U.S./coalition facility damage and operational status
- U.S./Israeli strike effects inside Iran
- Verified loss dashboard and loss timeline
- Missile / drone performance and CSIS-derived calculations
- Bargaining demands, responses, narrowing and walk-backs
- Economic effects: GCC states versus Iran
- China–Iran / Russia–Iran corridors, including Arctic/Northern Sea Route context
- Satellite BDA and imagery links
- Information-war / false-claim tracker
- Source ledger and methodology

## Snapshot requirement

Before each daily mutation of the live board, save the prior/current complete board as:

`snapshots/Iran War Map YYYYMMDD.html`

Example:

`snapshots/Iran War Map 20260820.html`

Never overwrite a prior dated snapshot. If two updates occur on the same date, preserve the first and append a human-readable suffix such as `AM` or `PM`; do not silently replace history.

## Evidence doctrine

- Observation is not attribution.
- Actor claim is not confirmation.
- Damage is not incapacity.
- Subfacility incapacity is not whole-base incapacity.
- A weapon launch is not proof of impact.
- Social-media reach is not proof.
- Geographic precision follows evidence. If the public record supports only city/province/sector resolution, keep it coarse.
- Never create fake precision to make the map look better.
- Publicly available satellite imagery and geolocation should be linked when available.
- Government and state-media sources may establish what an actor claimed; they do not self-verify their own claims.
- Strong claims should preferably have two or more independent sources, with at least one high-quality factual spine source where available.
- Preserve conflicting evidence and show why a verdict changed.

## Source hierarchy

Prefer, in rough order by use case:

1. Primary official releases/documents for what an actor officially said or did.
2. Reuters, AP, AFP and similarly rigorous wires for factual spine and cross-checking.
3. High-quality satellite/technical BDA: Planet, Maxar imagery as reported by credible outlets, CSIS, IISS, recognized technical OSINT researchers.
4. Credible regional/local reporting for local detail and narrative context.
5. Iranian official/state outlets for Iranian claim provenance and domestic signaling.
6. Social-media posts only as claim artifacts unless independently verified.

Do not collapse source roles. A Reuters report quoting the IRGC is evidence that the IRGC made the claim, not automatic verification of the claimed battle damage.

## Repository architecture target

The next engineer should migrate away from a single giant HTML file without breaking the current site. A sensible target is:

- `index.html`
- `assets/`
- `css/`
- `js/`
- `data/`
- `snapshots/`
- `docs/`
- `.nojekyll`

Use spaces in human-facing snapshot filenames as specified above. Coding/module filenames may use conventional hyphens or underscores where technically sensible.

## Social sharing

The public site must retain a stable share URL and include Open Graph metadata for Facebook and other platforms:

- `og:title`
- `og:description`
- `og:type=website`
- `og:url=https://ejronin.github.io/ISR/`
- `og:image` pointing to a committed social-preview image with absolute GitHub Pages URL
- corresponding Twitter/X card metadata

## Deployment safety

A daily updater must:

1. Read the current repo first.
2. Save a dated snapshot before changing `index.html`.
3. Update data and UI without deleting historical records.
4. Run structural/JS checks.
5. Commit only if the build is internally consistent.
6. If GitHub write permissions are unavailable, produce a ready-to-upload ZIP/diff and say so plainly; never claim the repository was updated.

## Implemented v2.9 engineering migration

This package now contains a GitHub Pages-ready modularized v2.9 baseline:

- `index.html` — semantic shell and embedded static evidence fallback
- `css/app.css` — extracted dashboard styles plus mobile reliability fixes
- `js/navigation.js` — panel navigation, share controls and snapshot browser enhancement
- `js/app.js` — dynamic rendering and progressive map initialization
- `data/core.json` — public metadata plus legacy/deprecated balance fields and coalition/alignment reference data
- `data/events.json` — canonical events, strategic milestones and bargaining records
- `data/facilities.json` / `data/strikes.json` — physical-damage and strike-effect ledgers
- `data/losses.json` — asset and casualty loss records
- `data/claims.json` / `data/influence-networks.json` — claim checks plus migrated v2.7 information-environment data
- `data/economics.json` / `data/routes.json` / `data/missiles.json` / `data/sources.json` — domain datasets
- `data/snapshots.json` — snapshot browser manifest
- `assets/social-preview.png` — 1200×630 Open Graph/Twitter preview
- `snapshots/Iran War Map 20260820.html` — immutable pre-migration v2.9 snapshot

### Reliability behavior

The evidence panels are present in the HTML before JavaScript runs. If the structured-data request or Leaflet CDN fails, the static evidence remains readable. On the hosted GitHub Pages site, the domain JSON files under `data/` enable filtering, map markers and dynamic refresh.

### Mobile behavior

The prior v2.9 CSS hid the map below 850 px. This migration removes that regression: the map remains a dedicated mobile mode, primary navigation becomes horizontally scrollable with ~44 px tap targets, and the loss dashboard reflows without page-level horizontal scrolling.

## Historical-ledger v1.2 integration

The live atlas consumes the authoritative package under `data/integration-v1.2/` in addition to preserving the v2.9 datasets for legacy panels and snapshot continuity. The integration adds:

- 83 canonical event records: 15 pre-war context records and 68 wartime events;
- AS OF and KNOWN BY timeline modes without fabricated time precision;
- stable facility/map identities with event-to-map and map-to-event links;
- explicit force-posture and agreement records, including pre-coordinated drawdowns;
- like-for-like casualty accounting and separate material-loss, munitions, repair and wider-economic scopes;
- canonical `SRC-*` source lineage, revision history and unresolved collection gaps;
- repository and package-level validation in CI.

Large authoritative JSON files are marked `linguist-generated` so GitHub collapses them in the default PR view; their manifest hashes and cross-file references remain validation-enforced.
