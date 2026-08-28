# Iran War Evidence Atlas

A public, source-linked OSINT record for the 2026 Iran conflict. The project separates observed events, actor claims, physical damage, functional effects, later adjudication, and author analysis so readers can inspect the historical record without treating inference as evidence.

**Live atlas:** https://ejronin.github.io/ISR/

## Current public boot

The root page now starts from a neutral shell and renders only after the generated current-state model and application assets resolve to one validated release. The browser does not replay the Aug. 24 through Aug. 27 dated presentation chain to discover the current record. If the current model cannot be loaded or validated, the site shows an explicit error and an archive link instead of an older dashboard.

Build the ignored canonical state, public read model, and signed deployment artifacts with:

```bash
python scripts/build_canonical_current_state.py
python scripts/validate_canonical_authority.py
python scripts/validate_canonical_update_pipeline.py
python scripts/build_public_current_state.py
python scripts/build_public_release.py
python scripts/validate_public_deployment.py
```

Future evidence changes are small append-only packets under `data/canonical-updates/`; they do not require frontend edits or another dated loader. The migration boundary is independently pinned, and CI requires every prior accepted manifest entry to remain an exact prefix of the proposed ledger. See `docs/canonical-update-pipeline.md` for validation, dry-run, registration and publication commands.

The temporary Phase 2 renderer exposes the full chronology, provenance-scoped sources, and approved datasets without attempting the final navigation, map, or specialist-view redesign. See `docs/public-boot-architecture.md` for the boot sequence and legacy-runtime classification.

## Public information architecture

The public interface is organized around the questions a reader of a historical war record is likely to ask, rather than around the project's internal analytic workflow:

1. **Overview** — current/final status and chronology.
2. **Military Operations** — bases and infrastructure, campaigns and strikes, air/missile/drone activity, and supporting damage imagery.
3. **Consequences** — casualties and material losses, economic effects, and shipping/trade effects.
4. **Diplomacy & Outcome** — negotiations and agreements, documented objectives, concessions, unresolved terms, and outcome evidence.
5. **Claims & Verification** — claim checks and the information environment.
6. **Sources & Method** — source register, methodology, analytic record, historical-record construction, and immutable archive snapshots.

The former ATLAS / TIMELINE / ANALYSIS / MOU / SOURCES workspace bar remains an implementation dependency for specialized views but is no longer public navigation. The detailed agreement workspace remains reachable through **Diplomacy & Outcome**.

### Analytic record separation

The **Analytic record** is an audit layer, not an evidentiary layer. It is reserved for contemporaneous forecasts and current-state/actor-intent/causal assessments, followed by later source-based adjudication. It is never used to establish that an event occurred or to alter the factual ledger.

The analytic register is subject to a completeness gate: historical entries are not published piecemeal. The project sweep must include misses, revisions, incorrect mechanisms, and unresolved assessments before the register is exposed as a scored record.

## What the atlas covers

- current operational assessment without a composite “war score”;
- current chronology records built from 98 canonical historical-ledger records plus append-only current overlays;
- U.S./coalition facilities, strike effects, satellite/visual BDA, and missile/drone metrics;
- casualties, durable material loss, munitions expenditure, and economic effects as separate accounting scopes;
- bargaining, force posture, agreements, regional alignment, and trade routes;
- schematic oil-route mapping that distinguishes the degraded Iran→China crude chain from Russian and non-sanctioned Gulf substitute-supply lanes;
- claim checks, information-environment analysis, sources, revisions, and unresolved collection gaps;
- immutable historical HTML snapshots.

## How to read it

Start with **Overview → At a glance** for the latest synthesized picture, then use **Timeline** to follow events. Move into Military Operations, Consequences, Diplomacy & Outcome, or Claims & Verification for subject-specific records. **Sources & Method** contains the evidence provenance and audit machinery for readers who need to inspect how records were constructed.

Timeline modes have different meanings:

- **AS OF** selects records by event occurrence. Current adjudication is allowed only under an explicit current-assessment label.
- **KNOWN BY** selects records by when public evidence entered the record and prevents later evidence from leaking backward into historical cutoffs.

War, month, week, day, and hour zoom are supported. Hour zoom remains disabled unless the canonical records contain a source-supported hour bucket; the interface never invents midnight or noon for date-only evidence.

## Evidence discipline

- An actor claim is not promoted to confirmation without independent support.
- Physical damage and operational effect are separate findings.
- An observed event and attribution for that event may have different evidence states.
- Schematic routes are transportation-domain approximations, not live AIS tracks or exact operational routes.
- Source-specific vessel counts remain source-specific; they are not silently converted into exact total physical traffic.

Direct-military accounting is symmetric across U.S./coalition and Iran/aligned material and munitions. `SOURCE-REPORTED`, `CALCULATED`, `CALCULATED RANGE`, `ESTIMATED`, `UNPRICED REMAINDER`, and `UNRESOLVED` are distinct states. A calculated estimate requires a supported quantity and compatible price basis; overlapping aggregates are never added twice.

## Repository structure

- `index.html` — neutral current-record loading/failure shell with one application entry
- `templates/public-index.html` — exact review source for the root shell; build validation requires byte equality
- `legacy/phase1-public-runtime-reference.html` — repository-only retired presentation reference; excluded from Pages packaging
- `css/`, `js/` — local presentation, navigation, map, temporal, safety, costing, and public-record interface modules
- `assets/icons/` — local map icon grammar
- `vendor/leaflet/` — pinned Leaflet runtime
- `data/` — UI data, authoritative historical integration ledger, and append-only current overlays
- `snapshots/` — immutable dated public boards
- `scripts/`, `tests/` — structural, integration, temporal, costing, hostile-input, and public-IA checks
- `docs/` — methodology, migration, validation, information-architecture, and historical engineering notes

The public-record information-architecture specification is preserved in `docs/Public Record Information Architecture 20260826.md`.

## Local development

Serve the repository root with a local HTTP server, for example:

```bash
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

Run the release checks documented by the repository validation scripts and the JavaScript tests under `tests/`.

The current public evidence state also has a deterministic, generated read model and a release-binding manifest. Build and verify them with:

```bash
python scripts/build_public_current_state.py
python scripts/build_public_current_state.py --check
python scripts/validate_public_current_state.py
python scripts/build_public_release.py
python scripts/build_public_release.py --check
python scripts/validate_public_deployment.py
```

The ignored deploy-time artifacts at `data/public-current-state.json` and `data/public-release.json` are derived views only; canonical packages remain authoritative. See `docs/public-current-state.md` for the read-model input/provenance contract and `docs/public-boot-architecture.md` for the release boundary.

## Publishing and integrity

Pull requests run validation only. Deployment runs only from `main` through the scoped GitHub Pages workflow. The deployed artifact publishes `build-info.json` containing the canonical URL, exact deployed commit, ledger version, review cutoff, and authoritative-ledger hashes.

Before a data update, preserve the current complete board as a new dated file under `snapshots/`; never overwrite an existing snapshot. The canonical integration JSON is hash-checked during validation.

## Limitations

The atlas reflects the reviewed public record through the displayed cutoff, not classified knowledge or a complete loss inventory. Source availability, publication lag, unresolved time precision, incomplete BDA, inconsistent official accounting, and AIS-dark shipping constrain comparisons. Absence from the current source set is not proof that an event did not occur.

The atlas is designed to make underlying sources easy to inspect and reuse. Its own analytical conclusions are not substitutes for reliable independent secondary sources, and the factual record must remain valid if the analytic-record layer is removed entirely.
