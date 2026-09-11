# Atlas current release qualification

## Mission anchor

Atlas is a public, source-linked record of the 2026 Iran war. Release machinery exists to protect the reader hierarchy defined in `docs/ENGINEERING_DOCTRINE.md`: what happened, where it stands now, why Atlas can say it, and deeper evidence when wanted. CI does not own factual or editorial authority.

## Active qualification paths

### Primary current-product qualification — `.github/workflows/validate.yml`

This is the comprehensive PR and `main` qualification path. It builds the current canonical-v2/public-v2 state, proves deterministic release assembly, checks source and evidence integrity, runs neutral Lie Ledger parity, validates reader behavior and browser paths, verifies the closed Pages artifact, and retains historical fixture tests only where they still protect a live evidence or behavioral invariant.

A historical test name does not make that test authoritative. Tests remain only for the invariant they protect.

### Evidence/canonical focused qualification — `.github/workflows/gate3-validate.yml`

This is a focused evidence/canonical lane while its remaining Gate 3 naming is migrated. It must not become an alternate production builder. Historical compatibility may be inspected only as bounded migration evidence.

### Reader browser review — `.github/workflows/validate-source-humanization.yml`

This retains the full-stack browser/source-humanization checks and rendered screenshot artifact because those provide independent reader-facing regression evidence not supplied by static tests alone.

### Deployment — `.github/workflows/pages.yml`

Pages builds and publishes only the manifest-authorized closed artifact and binds deployment identity to the exact `main` SHA.

### Historical reconciliation audit — `.github/workflows/inspect-wiki-reconciliation.yml`

This workflow is historical reconciliation support. It is not a current production authority and should be narrowed to explicit audit use as the remaining CI convergence proceeds.

## Retired transition workflows

The following standalone workflows were removed after their unique protections were moved into the primary current-product qualification:

- `validate-aug25-late.yml` — its overlay and deployment-identity checks already run in `validate.yml`;
- `validate-current-public-foundation.yml` — PR #95 migration parity and v2-only orchestration are protected by durable tests in the primary suite;
- `validate-reader-rearchitecture.yml` — reader-layer, privileged-narrative retirement, syntax, and public-final-polish checks now run in the primary suite, while rendered browser review remains in the dedicated reader workflow.

## Non-negotiable release invariants

Never trade green CI for weaker evidence. Preserve accepted evidence bytes/hashes, source variants, temporal/knowledge distinctions, stable IDs, unknown-vs-zero, denominator integrity, False != Lie, canonical/public semantic fidelity, accessibility, deterministic generation, content addressing, closed-artifact enforcement, and exact-head deployment identity.
