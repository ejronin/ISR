# Endgame / MoU / Source-Context Integration Contract — 2026-08-24

This document records the analytical handoff for the approved UI/Endgame/Mermaid pass.

## Locked invariants

- `data/integration-v1.2/events.json` remains the immutable 98-record historical ledger.
- `data/current-update-20260824/events.json` remains the 10-record append-only current overlay.
- Current chronology remains `98 + 10 = 108` through 2026-08-24 14:14 ET.
- UI work must not silently advance the Aug. 22 historical/MoU locks or the Aug. 20 outcome lock.

## One Endgame source of truth

The engineer branch owns the runtime adjudication model:

- `schemas/endgame-adjudication-v1.json`
- `data/endgame-adjudication-v1.json`

Do **not** create a second competing Endgame JSON dataset.

The Mermaid graph and accessible ledger must derive from the same structured adjudication model. The graph is a visualization, not the analytical source of truth.

Allowed terminal states are exactly:

- `PROCEEDS_UNDER_IRAN_DEMAND`
- `WALKED_BACK_DILUTED`
- `CUT_OFF_DENIED`
- `OPEN_UNRESOLVED`

No composite war score or aggregate victory percentage.

## Required Endgame analytical rules

### MoU status

The June 2026 interim MoU is a historical instrument. Its 60-day final-deal deadline expired August 17 without a final agreement.

Current state:

`EXPIRED_NON_CONTROLLING`

Iran citing, restoring, or falling back on the old MoU is a bargaining position. It is not proof the expired instrument remains controlling.

A new agreement may independently revive the same substantive term. That later agreement must be evaluated as a new controlling bargain.

### Frozen assets must link to Clause 11

The frozen/restricted-assets Endgame path is MoU-relevant.

Clause 11 promised broad asset availability subject to implementation procedures. The promise did not mature into durable broad access before the MoU failed.

Therefore the runtime Endgame model must not mark the assets claim as `mou_relationship.relevant = false` or omit Clause 11.

Required relationship:

- MoU relevant: yes;
- clause: `11`;
- historical effect: strong Iran-favorable paper promise;
- current old-instrument state: non-controlling / expired;
- observable outcome: broad durable access not established.

### Hormuz remains three-dimensional

Never collapse `Iran controls Hormuz` into one binary verdict.

Preserve separately:

1. legal / recognized sovereignty or control;
2. de facto operational routing / gatekeeping;
3. monetizable fee / economic-rent authority.

The operational branch may proceed under Iran's narrow practical demand while the legal and fee branches remain denied. That distinction must survive every UI representation.

## Media-bias provider data

Existing Ground News metadata remains authoritative in:

`data/ground-news-outlet-metadata.json`

Verified alternative-provider records are stored in:

`data/media-bias-provider-metadata.json`

Current real fallback/additional examples are limited to outlets actually present in the Atlas registry:

- AFP / Agence France-Presse — Ad Fontes Media fallback;
- Reuters — AllSides additional context alongside Ground News;
- Bellingcat — Ad Fontes Media fallback.

AFP is also a deliberate negative-control case: AllSides lists AFP as `Not Rated`. That must never render as `Center` and must not suppress the separately verified Ad Fontes record.

Do not seed provider records for outlets that are not currently present in the Atlas registry merely to demonstrate a provider integration.

## Provider separation

Never average or normalize Ground News, AllSides, and Ad Fontes into one hidden Atlas political-bias score.

Always identify the provider with its native rating.

Political/media-bias context is publisher-level context only. It never changes proposition-level Atlas evidence grade.

## Source provenance remains separate

Atlas provenance/source role remains independent of political bias. Preserve useful classes such as:

- wire service;
- independent news;
- state media;
- official government;
- military / official;
- regional news;
- think tank / research;
- academic;
- OSINT / technical;
- satellite / imagery;
- advocacy / NGO;
- social / actor claim;
- international organization.

State affiliation or ownership notes should be shown when supported.

## Generated registry enrichment

Run the existing source build first:

```bash
python scripts/build_source_registry.py --root .
```

Then apply the additive provider context when a generated enriched registry artifact is needed:

```bash
python scripts/enrich_source_bias_context.py --root .
```

The enrichment step preserves the existing `ground_news` object and adds `media_bias_context` to generated outlet profiles.

The live Sources UI also reads the verified provider metadata directly, so GitHub Pages does not depend on a server-side enrichment service.

Preferred compact display logic:

1. Ground News when actually rated;
2. AllSides when Ground News is not rated and a verified AllSides record exists;
3. Ad Fontes when neither above is rated and a verified Ad Fontes record exists.

All stored verified ratings remain inspectable even when one provider is preferred for compact display.

If no verified external rating is stored, display:

`NO INDEPENDENT POLITICAL-BIAS RATING LOCATED`

For official/technical source classes where political-bias scoring is not meaningful, display:

`NOT APPLICABLE`

## Validation

Run:

```bash
python scripts/validate_analysis_contracts.py
```

The combined gate validates:

- 98 historical records;
- 10 current-overlay records;
- 108 current chronology;
- verified alternative-provider metadata and HTTPS provider provenance;
- AFP Ad Fontes fallback;
- Bellingcat Ad Fontes fallback;
- Reuters multi-provider context without replacing Ground News;
- AFP/AllSides `NOT_RATED` negative control;
- existing Ground News Reuters metadata remains independently intact;
- terminal-state enum integrity;
- expired/non-controlling MoU state and new-bargain rule;
- frozen-assets linkage to MoU Clause 11;
- legal/operational/fee Hormuz branch separation;
- operational gatekeeping cannot silently become legal sovereignty or fee authority;
- Ground News seven-position semantic/color hooks;
- named AllSides and Ad Fontes rendering paths;
- source-bias JS/CSS modules are actually loaded by the Atlas UI.

The existing Endgame/Mermaid validators remain authoritative for rendering, schema, accessibility, and browser behavior.
