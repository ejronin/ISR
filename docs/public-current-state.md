# Derived public current-state read model

`data/public-current-state.json` is the generated, non-authoritative **v2** read model for the current public Atlas application. It is produced during validation/deployment and intentionally excluded from Git because it is reproducible and large. The release orchestrator first validates the sealed canonical-v1 migration lineage, then compiles and validates the current canonical-v2 state before producing the public-v2 read model. The browser receives only the already-assembled current result and never replays the update ledger.

The frozen public-v1 builder remains repository compatibility lineage, not a release artifact generator. Current v2 compilation uses `scripts/public_read_model_foundation.py`; an exact in-memory parity regression proves that this neutral foundation preserves the accepted v1 seed semantics while avoiding an executable v1 dependency in the production compiler.

## Build and validation

Use the same state orchestration contract used by CI and Pages:

```bash
python scripts/build_current_release_state.py
python scripts/build_current_release_state.py --check
```

Generation uses only repository inputs and includes no build timestamp. Object keys, record ordering, encoding and line endings are fixed, so identical inputs produce identical bytes. Input SHA-256 values use UTF-8 content with line endings normalized to LF, preventing Windows and Linux Git checkouts from producing different release identities for the same content. The release identity is derived from the sorted input-path and normalized SHA-256 inventory.

Current-state validation rebuilds/compares the deterministic v2 projection and verifies that registered inputs remain unchanged. Release qualification also runs the neutral-foundation parity regression against the unchanged legacy v1 seed in memory; it does not create a public-v1 release artifact.

Phase 2 binds the current v2 artifact to the public shell through the separately generated `data/public-release.json`. The browser validates that manifest, the shell-asset hashes, the exact read-model hash, and the read-model release identity before it performs the first current render. See `public-boot-architecture.md`.

## Current chronology assembly

The inherited seven-package record is sealed at accepted Phase 3 HEAD. Post-boundary changes are discovered only through `data/canonical-ledger/manifest.json`, and chronology totals/cutoff are derived from the compiled entities and accepted packet metadata. Adding an event no longer requires changing the public builder, a count constant, cutoff constant, browser loader or dated presentation layer. See `canonical-update-pipeline.md`.

The normalized chronology preserves the existing append-only order of authority and then sorts the resulting records by occurrence date, occurrence time and event ID:

| Input | Role | Contribution | Cumulative |
|---|---|---:|---:|
| `data/integration-v1.2` | Frozen historical ledger | 98 | 98 |
| `data/current-update-20260824` | Current overlay | 10 | 108 |
| `data/current-update-20260825` | Current overlay | 8 | 116 |
| `data/current-update-20260825-late` | Current overlay | 1 | 117 |
| `data/current-update-20260826` | Current overlay | 4 | 121 |
| `data/wiki-map-reconciliation-20260826` | Accepted historical reconciliation | 81 | 202 |
| `data/current-update-20260827` | Current overlay | 3 | 205 |

Every chronology item carries:

- the normalized event record;
- the normalized timeline record;
- resolved canonical source IDs;
- package identity and role;
- exact event/timeline input paths, array indexes and SHA-256 hashes.

The reconciliation package contains several source objects nested in source-ID positions. The canonical compiler extracts their explicit canonical `SRC-*` IDs while retaining the untouched sealed file, exact source variant and event provenance. No evidentiary meaning changes.

## Source assembly

The source catalog is assembled from the source namespaces belonging to the historical ledger, every current overlay, the reconciliation package and forensic v1.3.2. `data/source-registry.json` supplies its existing registry and outlet-profile context.

The Aug. 27 overlay contains three canonical sources that are not yet present in the generated source registry. They remain in the read model with `CANONICAL_SOURCE_NOT_YET_IN_GENERATED_REGISTRY` and their overlay provenance. This does not alter the source registry or the overlay.

When the same source ID appears in more than one canonical namespace, the read model retains every variant and explicitly records differing metadata fields. A chronology record points to the exact package-scoped source variant that supports it. A colliding global ID has no selected global `record`; it is marked `PROVENANCE_SCOPED_VARIANTS_REQUIRED`, preventing a future renderer from silently choosing the wrong URL or source metadata. Embedded page datasets expose every available variant and mark cases where their own provenance context must select one.

## Page-data mapping

Canonical and approved supporting datasets are embedded once under `datasets`. `page_data` maps the public sections to dataset keys without copying or re-adjudicating their contents. The registry-level owners remain:

- `start_here`
- `timeline`
- `military_record`
- `hormuz_economy`
- `diplomacy_mou`
- `objectives_position_changes`
- `claims_sources`

This mapping is an engineering index, not new analysis. Current v2 overlays add Gate 3 datasets to these owners while retaining the evidence/public boundary.

The original `data/*.json` public/map datasets remain embedded under `legacy.*` where required for historical bytes, provenance, or accepted structural normalization. They are classified `HISTORICAL_REFERENCE_DATA` and are not mapped into any current page as factual authority. Current page mappings use the frozen ledger, accepted reconciliation, normalized chronology/source catalog, forensic products, Gate 3 state, and approved analytical datasets that supersede those legacy runtime inputs. No legacy evidence file is rewritten by this classification.
