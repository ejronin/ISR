# Atlas current release qualification

## Mission anchor

Atlas is a public, source-linked record of the 2026 Iran war. Release machinery exists to protect the reader hierarchy defined in `docs/ENGINEERING_DOCTRINE.md`: what happened, where it stands now, why Atlas can say it, and deeper evidence when wanted. CI does not own factual or editorial authority.

## Active qualification paths

### Primary current-product qualification — `.github/workflows/validate.yml`

This is the comprehensive PR and `main` qualification path. It builds the current canonical-v2/public-v2 state, proves deterministic release assembly, checks source and evidence integrity, runs neutral Lie Ledger parity, validates reader behavior and browser paths, verifies the closed Pages artifact, and retains historical fixture tests only where they still protect a live evidence or behavioral invariant.

A historical test name does not make that test authoritative. Tests remain only for the invariant they protect.

### Evidence/canonical focused qualification — `.github/workflows/validate-evidence-integrity.yml`

This is the durable Evidence Integration / Release Integrity gate for changes to accepted evidence, canonical-v2, temporal semantics, neutral claim adjudication, and evidence-linked public projection. It exercises append-only history, packet portability, registration, temporal canaries, neutral Lie Ledger migration parity, active-governance boundaries, canonical/public determinism, and focused semantic validators.

It uses the same current-v2 release path as production. Historical compatibility is reconstructed only inside bounded parity/canary tests where it is evidence for migration safety; it is not generated as current state or allowed to control release identity.

### Reader browser review — `.github/workflows/validate-source-humanization.yml`

This retains the full-stack browser/source-humanization checks and rendered screenshot artifact because those provide independent reader-facing regression evidence not supplied by static tests alone.

### Deployment — `.github/workflows/pages.yml`

Pages builds and publishes only the manifest-authorized closed artifact and binds deployment identity to the exact `main` SHA.

### Historical reconciliation audit — `.github/workflows/inspect-wiki-reconciliation.yml`

This workflow is `workflow_dispatch` only. It preserves the ability to inspect and materialize the Aug. 2026 Wikipedia reconciliation package without making that dated package a current-production CI authority. The live reconciliation invariants still run in the primary suite through `scripts/validate_wiki_reconciliation.py`.

## Retired transition workflows

The following standalone workflows were removed after their unique protections were moved into durable qualification paths:

- `validate-aug25-late.yml` — its overlay and deployment-identity checks already run in `validate.yml`;
- `validate-current-public-foundation.yml` — PR #95 migration parity and v2-only orchestration are protected by durable tests in the primary suite;
- `validate-reader-rearchitecture.yml` — reader-layer, privileged-narrative retirement, syntax, and public-final-polish checks now run in the primary suite, while rendered browser review remains in the dedicated reader workflow;
- `gate3-validate.yml` — registration, temporal, canary, canonical/public, and diagnostic protections moved to `validate-evidence-integrity.yml` without the routine canonical-v1 build or branch-era triggers;
- `validate-neutral-lie-ledger-governance.yml` — neutral adjudication migration/parity and anti-persona boundary checks moved to the durable evidence workflow and the primary suite.

## Non-negotiable release invariants

Never trade green CI for weaker evidence. Preserve accepted evidence bytes/hashes, source variants, temporal/knowledge distinctions, stable IDs, unknown-vs-zero, denominator integrity, False != Lie, canonical/public semantic fidelity, accessibility, deterministic generation, content addressing, closed-artifact enforcement, and exact-head deployment identity.
