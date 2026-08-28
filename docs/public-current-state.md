# Derived public current-state read model

`data/public-current-state.json` is a generated, non-authoritative read model for the current public Atlas application. It is produced during validation/deployment and intentionally excluded from Git because it is reproducible and large. Canonical evidence remains in the historical ledger, append-only overlays, accepted reconciliation package, forensic package, source namespaces and approved analytical datasets.

## Build and validation

```bash
python scripts/build_public_current_state.py
python scripts/build_public_current_state.py --check
python scripts/validate_public_current_state.py
```

Generation uses only repository inputs and includes no build timestamp. Object keys, record ordering, encoding and line endings are fixed, so identical inputs produce identical bytes. Input SHA-256 values use UTF-8 content with line endings normalized to LF, preventing Windows and Linux Git checkouts from producing different release identities for the same content. The release identity is derived from the sorted input-path and normalized SHA-256 inventory.

The validator rebuilds the artifact twice in temporary locations, compares both byte streams with the generated output and verifies that every canonical input's raw byte hash is unchanged before and after generation.

Phase 2 binds this artifact to the public shell through the separately generated `data/public-release.json`. The browser validates that manifest, the shell-asset hashes, the exact read-model hash, and the read-model release identity before it performs the first current render. See `public-boot-architecture.md`.

## Current chronology assembly

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

The reconciliation package contains several source objects nested in source-ID positions. The read model extracts their explicit canonical `SRC-*` IDs, records each structural normalization in `normalizations`, and retains the untouched canonical file and its exact provenance. No evidentiary meaning changes.

## Source assembly

The source catalog is assembled from the source namespaces belonging to the historical ledger, every current overlay, the reconciliation package and forensic v1.3.2. `data/source-registry.json` supplies its existing registry and outlet-profile context.

The Aug. 27 overlay contains three canonical sources that are not yet present in the generated source registry. They remain in the read model with `CANONICAL_SOURCE_NOT_YET_IN_GENERATED_REGISTRY` and their overlay provenance. This does not alter the source registry or the overlay.

When the same source ID appears in more than one canonical namespace, the read model retains every variant and explicitly records differing metadata fields. A chronology record points to the exact package-scoped source variant that supports it. A colliding global ID has no selected global `record`; it is marked `PROVENANCE_SCOPED_VARIANTS_REQUIRED`, preventing a future renderer from silently choosing the wrong URL or source metadata. Embedded page datasets expose every available variant and mark cases where their own provenance context must select one.

## Page-data mapping

Canonical and approved supporting datasets are embedded once under `datasets`. `page_data` maps the seven planned public sections to dataset keys without copying or re-adjudicating their contents:

- `start_here`
- `timeline`
- `military_record`
- `hormuz_economy`
- `diplomacy_mou`
- `objectives_position_changes`
- `claims_sources`

This mapping is an engineering index, not new analysis. Phase 1 does not change the current browser boot path or visible site.

The original `data/*.json` public/map datasets are still embedded under `legacy.*` so their historical bytes and provenance remain inspectable. They are classified `HISTORICAL_REFERENCE_DATA` and are not mapped into any current page. Current page mappings use the frozen ledger, accepted reconciliation, normalized chronology/source catalog, forensic products, and approved analytical datasets that supersede those legacy runtime inputs. No legacy file is deleted or rewritten by this classification.
