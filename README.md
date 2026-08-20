# Iran War Evidence Atlas

A public, source-linked OSINT atlas for the 2026 Iran conflict. The project separates physical damage, functional effect, actor claims, analytic assessment, and later adjudication so readers can inspect both the current picture and what the public record supported at an earlier cutoff.

**Live atlas:** https://ejronin.github.io/ISR/

## What the atlas covers

- current operational assessment without a composite “war score”;
- 83 canonical historical-ledger records, including 15 pre-war context records;
- U.S./coalition facilities, strike effects, satellite BDA, and missile/drone metrics;
- casualties, durable material loss, munitions expenditure, and economic effects as separate accounting scopes;
- bargaining, force posture, agreements, regional alignment, and trade routes;
- claim checks, information-environment analysis, sources, revisions, and unresolved collection gaps;
- immutable historical HTML snapshots.

## How to read it

The five primary analysis areas—Overview, Operations, Effects, Information, and Evidence—configure the evidence rail and map together. Contextual subviews remain available beneath the primary navigation. The compact map-layer menu is an expert override, not a second navigation system.

Timeline modes have different meanings:

- **AS OF** selects records by event occurrence. Current adjudication is allowed only under the explicit label `CURRENT ASSESSMENT — reviewed through <ledger cutoff>`.
- **KNOWN BY** selects records by `first_reported`, displays verification only when `first_verified` is at or before the chosen cutoff, and hides later or undated sources and later adjudication fields. Readers can deliberately open the separately labeled current adjudication.

War, month, week, day, and hour zoom are supported. Hour zoom remains disabled unless the canonical records contain a source-supported hour bucket; the interface never invents midnight or noon for date-only evidence.

## Evidence and accounting rules

- Observation is not attribution.
- Actor claim is not confirmation.
- Damage is not incapacity.
- A launch is an expenditure, not proof of impact.
- Unknown is not zero.
- Geographic precision follows public evidence.
- Schematic routes are transportation-domain approximations, not live AIS tracks or exact operational routes.

Direct-military accounting is symmetric across U.S./coalition and Iran/aligned material and munitions. `SOURCE-REPORTED`, `CALCULATED`, `CALCULATED RANGE`, `ESTIMATED`, `UNPRICED REMAINDER`, and `UNRESOLVED` are distinct states. A calculated estimate requires a supported quantity and compatible price basis; the two may come from different existing records when the join is explicit and auditable. Overlapping aggregates are never added twice.

## Repository structure

- `index.html` — semantic shell and readable no-JavaScript fallback
- `css/`, `js/` — local presentation, navigation, map, temporal, safety, and costing modules
- `assets/icons/` — local map icon grammar
- `vendor/leaflet/` — pinned Leaflet 1.9.4 runtime
- `data/` — legacy UI data plus the authoritative `integration-v1.2/` ledger
- `snapshots/` — immutable dated public boards
- `scripts/`, `tests/` — structural, integration, temporal, costing, and hostile-input checks
- `docs/` — methodology, migration, validation, and historical engineering notes

The prior engineering handoff is preserved at [`docs/Engineering Handoff 20260820.md`](docs/Engineering%20Handoff%2020260820.md).

## Local development

Serve the repository over HTTP; browser security rules make `file://` an unreliable test environment.

```bash
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

Run the release checks:

```bash
python scripts/validate.py
python scripts/validate_integration.py
python scripts/validate_ux.py
node tests/temporal-state.test.js
node tests/security-rendering.test.js
node tests/costing.test.js
```

## Publishing and integrity

Pull requests run validation only. Deployment runs only from `main` through the scoped GitHub Pages workflow. The deployed artifact publishes `build-info.json` containing the canonical URL, exact deployed commit, ledger version, review cutoff, and authoritative-ledger hashes.

Before a data update, preserve the current complete board as a new dated file under `snapshots/`; never overwrite an existing snapshot. The canonical integration JSON is hash-checked during validation.

See [`SECURITY.md`](SECURITY.md) for vulnerability reporting and the static-site threat model. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for vendored dependency details.

## Limitations

The atlas reflects the reviewed public record through the displayed cutoff, not classified knowledge or a complete loss inventory. Source availability, publication lag, unresolved time precision, incomplete BDA, and inconsistent official accounting constrain comparisons. Absence from the current source set is not proof that an event did not occur.
