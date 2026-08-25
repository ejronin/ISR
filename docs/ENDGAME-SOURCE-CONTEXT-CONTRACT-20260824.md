# Endgame / MoU / Source-Context Contract — 2026-08-24

This document is the integration contract for the UI/Endgame/Mermaid pass.

## Locked invariants

- `data/integration-v1.2/events.json` remains the immutable 98-record historical ledger.
- `data/current-update-20260824/events.json` remains the 10-record append-only current overlay.
- Current chronology remains `98 + 10 = 108` through 2026-08-24 14:14 ET.
- UI work must not silently advance the Aug. 22 historical, MoU/Hormuz, or Aug. 20 outcome analytical locks.

## Endgame adjudication source

Use:

`data/endgame-adjudication-20260824.json`

as the machine-readable decision-path contract for the Endgame flowchart.

The Mermaid graph is a visualization of this data. It is not the analytical source of truth.

Allowed terminal states are exactly:

- `PROCEEDS_UNDER_IRAN_DEMAND`
- `WALKED_BACK_DILUTED`
- `CUT_OFF_DENIED`
- `OPEN_UNRESOLVED`

Do not create a composite war score or an aggregate victory percentage.

### MoU handling

The June 17 interim MoU is modeled as a historical instrument whose 60-day final-deal deadline expired on August 17 without a final agreement.

Current contract state:

`EXPIRED_NON_CONTROLLING`

An Iranian proposal to return to, restore, or invoke the old MoU is a bargaining position. It is not proof that the expired instrument remains controlling.

A new agreement may independently revive the same substantive term. In that case the new instrument is evaluated separately.

### Hormuz handling

Never collapse the following into a single `Iran controls Hormuz` verdict:

1. legal / recognized sovereignty or control;
2. de facto operational routing / gatekeeping;
3. monetizable fee / economic-rent authority.

The current adjudication contract intentionally gives the operational branch a different disposition from the legal and fee branches.

## Media-bias provider data

Existing Ground News metadata remains in:

`data/ground-news-outlet-metadata.json`

Verified alternative-provider records are in:

`data/media-bias-provider-metadata.json`

The alternative-provider file currently seeds real examples for:

- AFP / Agence France-Presse — Ad Fontes Media;
- Reuters — AllSides additional context;
- BBC News — AllSides additional context;
- Bellingcat — Ad Fontes Media when that canonical outlet is present in the registry.

AFP is also a deliberate negative-control case: AllSides lists AFP as `Not Rated`. That must never render as `Center` and must not suppress the separately verified Ad Fontes rating.

## Provider separation

Never average or normalize Ground News, AllSides, and Ad Fontes into a single hidden Atlas political-bias score.

Always identify the provider with the rating.

Political/media-bias context is publisher-level context only. It never changes proposition-level Atlas evidence grade.

## Source provenance

Atlas provenance remains separate from political bias. Preserve source roles such as:

- wire service;
- independent news;
- state media;
- official government;
- military / official;
- think tank / research;
- academic;
- OSINT / technical;
- satellite / imagery;
- advocacy / NGO;
- social / actor claim;
- international organization.

State affiliation / ownership notes should be shown when supported.

## Generated registry enrichment

Run the existing source build first:

```bash
python scripts/build_source_registry.py --root .
```

Then apply the additive provider context:

```bash
python scripts/enrich_source_bias_context.py --root .
```

The enrichment step preserves the existing `ground_news` object and adds `media_bias_context` to outlet profiles.

Preferred display logic is:

1. Ground News when actually rated;
2. AllSides when Ground News is not rated and a verified AllSides record exists;
3. Ad Fontes when neither above is rated and a verified Ad Fontes record exists.

All stored verified ratings remain inspectable even when one provider is preferred for the compact UI.

If no verified external rating is stored, render:

`NO INDEPENDENT POLITICAL-BIAS RATING LOCATED`

For official/technical source classes where a political-bias rating is not meaningful, render:

`NOT APPLICABLE`

## Validation

Run:

```bash
python scripts/validate_analysis_contracts.py
```

The contract validator checks:

- 98 historical records;
- 10 current-overlay records;
- 108 current chronology;
- terminal-state enum integrity;
- one terminal state per claim path;
- MoU-dependent paths explicitly marked `EXPIRED_NON_CONTROLLING`;
- new-bargain test present for MoU-dependent claims;
- Endgame/Hormuz source references resolve into the existing analytical datasets;
- legal/operational/fee Hormuz branches remain distinct;
- alternative bias providers are named and have HTTPS provenance URLs;
- AFP provides a real non-Ground-News Ad Fontes fallback example;
- AFP/AllSides `NOT_RATED` remains a negative control;
- existing Ground News Reuters metadata remains independently intact.

## UI integration expectation

The engineer should consume these contracts rather than duplicate analytical verdicts in hard-coded HTML/JS strings.

A selected Endgame claim should highlight the relevant decision path and expose its evidence trail. The accessible ledger must present the same terminal state as the graph.

Any future evidence update that changes a verdict should update structured adjudication data first; the graph and ledger should then derive from that data.
