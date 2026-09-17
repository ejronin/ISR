# R4-A Convergence and Stale-Machinery Audit

**Status:** preparation only while Public Product PR #115 is active  
**Date:** 2026-09-14  
**Owner:** Release Integrity & Regression  
**Boundary:** no changes to `src/public-reader-registry.js` or `tests/public-reader-registry.test.js`; Issue #100 migration remains blocked until #115 is merged, production-qualified and live-attested.

## Executive finding

The repository is already substantially converged around the signed v2 public runtime. The highest-value immediate cleanup is not deleting historical artifacts; it is removing operational churn and making routine intake mechanically discoverable. That work is R3 and is non-conflicting with #115.

The remaining convergence debt falls into three classes:

1. **blocked reader-runtime migration work** — Issue #100, explicitly deferred until #115 supplies the current qualified reader oracle;
2. **current tests with historical/implementation-shaped names or assertions** — candidates for semantic consolidation after #115, not safe to rewrite in parallel where they touch reader-registry behavior;
3. **repository-only historical runtime/validator material** — already classified as archive/audit and excluded from production authority; removal is optional housekeeping, not a release prerequisite.

## Current production authority is already narrow

`config/public-runtime-inventory.json` identifies the signed current sources and separately classifies a large body of older JS/CSS/Mermaid/workspace/current-update material as `archive_reference`.

That separation is healthy. Archive presence is not production authority.

The current signed reader graph remains:

`map_runtime → base_runtime → reader_support → page_registry → entrypoint`

R4-A does not alter that graph.

## Existing historical-validator classification is sound

`docs/HISTORICAL_VALIDATOR_CLASSIFICATION.md` already records that presentation-era Aug. 22-27, ENDGAME, Mermaid, old integration, old build-info and legacy UX validators are historical audit or retired presentation implementation rather than current qualification authority.

No R4-A change should accidentally re-promote those tests.

## Current qualification candidates for later consolidation

The reusable qualification workflow still runs several suites whose filenames encode migration phases or batches:

- `public-evidence-phase5`
- `public-map-phase6`
- `public-loss-actor-batch2`
- `public-parity-batch3`
- `public-phase9`
- corresponding browser suites

These suites are currently active and may protect real behavior. Their **names are stale, not necessarily their assertions**.

After #115 is live-qualified, R4 should inventory each assertion by invariant:

- evidence/source behavior;
- map lifecycle;
- losses/actor semantics;
- reader parity;
- responsive/accessibility behavior.

Only after equivalent invariant coverage is proven should dated/phase/batch files be renamed, merged or retired.

## Implementation-spelling assertions

Issue #116 identifies a specific form of convergence debt: qualification assertions that pin variable names or source spelling when behavioral tests already protect the safety contract.

PR #115 currently owns the candidate correction in the same reader-registry test file. Release must not race it.

After #115 lands:

1. read the exact `main` version of `tests/public-reader-registry.test.js`;
2. verify the #116 acceptance contract behaviorally:
   - hidden/aria-hidden staging;
   - validation before visible promotion;
   - map quiescence before replacement;
   - connected retirement after promotion;
   - map removal after retired nodes are reattached;
   - initial fail-closed and later-route last-qualified retention;
3. close #116 if those protections exist without implementation-spelling locks;
4. otherwise open a narrow Release patch from the new `main`.

## Issue #100 gate

Do not begin final projection/runtime elimination before #115 completes:

**merge → exact merge-SHA qualification → Pages deploy → live-byte attestation.**

At that point #115's reader output becomes the migration oracle for Issue #100.

R4-A may inspect and list dependencies now, but may not implement the final migration.

## Non-conflicting cleanup that can proceed now

R3's intake/discovery/release-no-op machinery is safe to land in parallel because it does not touch Public Product's two files and does not change factual or reader semantics.

Documentation/audit additions are also safe.

No production reader module, reader-registry test, Evidence packet, canonical packet, factual predicate or public wording is changed by this workstream.

## Archive cleanup candidates

The runtime inventory explicitly lists legacy JS/CSS, Mermaid and the phase-1 runtime reference as archive-only. Deleting them would reduce repository surface but provides little correctness benefit while historical archaeology still has value.

Recommendation: retain them until Issue #100 completes, then perform a separate repository-size/archaeology review. Any deletion must first prove:

- no current release inventory dependency;
- no current test fixture dependency;
- no unique evidence/provenance content;
- no documentation link requiring preservation.

Do not mix archive deletion with the #100 runtime migration.

## R4 next-step checklist after #115

1. Verify #115 live attestation and record its exact merge SHA.
2. Resolve #116 from actual `main`.
3. Freeze #115 output as the #100 reader parity oracle.
4. Map `base_runtime` and `reader_support` responsibilities into direct reader-first page construction.
5. Replace migration-shaped tests with behavior/invariant tests before deleting support runtime.
6. Remove only machinery proven redundant after exact-head and exact-merge-SHA qualification.
7. Preserve historical evidence and accepted packet lineage throughout.
