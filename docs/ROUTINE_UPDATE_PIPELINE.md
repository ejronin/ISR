# Routine Evidence Update Pipeline

**Status:** Release Integrity operational doctrine  
**Effective:** 2026-09-14  
**Scope:** steady-state ROOK → Evidence → Public Product → Release updates  
**Authority:** subordinate to `docs/ENGINEERING_DOCTRINE.md`; this document defines mechanics, not factual or editorial authority.

## Lane contract

The routine pipeline is:

**ROOK collects and appends → Evidence adjudicates → Public Product explains → Release qualifies and deploys.**

ROOK may append structurally valid evidence-locker material directly on its collection cadence. This is not an approval workflow. Evidence, Public Product, Release, an active PR, and the Project Lead are not preconditions for an upstream locker deposit.

Evidence Integration alone decides what enters accepted canonical state. Public Product alone decides reader-facing wording and presentation within accepted Evidence constraints. Release Integrity validates deterministic generation, release identity, browser/accessibility behavior, deployment and live-byte integrity.

A lane that encounters another lane's defect routes the exact defect to that lane. The Project Lead is not a ceremonial courier.

## Current locker contract

The working contract is formalized from the existing September 13-14 locker artifacts rather than replaced.

A completed ROOK sweep uses:

- `artifact_role = ROOK_FULL_EVIDENCE_LOCKER_SWEEP`;
- `authority = ROOK_UPSTREAM_COLLECTION`;
- an explicit `scope.window_start` and `scope.window_end` with UTC offset;
- `scope.timezone`;
- `write_policy = APPEND_ONLY_EVIDENCE_LOCKER_NO_CANONICAL_OR_PUBLIC_MUTATION`;
- completion metadata proving no canonical/public or accepted-packet mutation;
- stable intake identities for new events, later-evidence updates, claims/corrections and economic observations.

The current operating practice is approximately 12-hour collection windows. Twelve hours is **not** a schema rule. Validation uses timestamps and tolerates small boundary variation.

Source-registry deltas and standing-source discoveries are separate upstream artifacts. A source appearing in a sweep is not automatically a standing collection source. Standing-source discovery is append-only and must not contract prior collection coverage.

## Evidence discovery

Run:

```bash
python scripts/rook_intake_status.py report
```

For a validation-grade result:

```bash
python scripts/rook_intake_status.py validate
```

The report is derived from repository state and shows:

- latest accepted canonical evidence cutoff;
- every completed ROOK sweep and its timestamp window;
- whether an accepted canonical packet has consumed it;
- exact locker path and consuming packet;
- unconsumed completed sweeps;
- associated source-registry/source-discovery deltas;
- duplicate windows, suspicious overlaps, collection gaps and malformed timestamps.

There is no `pending approval` state.

## Consumption provenance

Accepted canonical packets remain the authority for what Evidence accepted.

New accepted packets that adjudicate one or more ROOK sweeps should record explicit provenance:

```json
{
  "upstream_provenance": {
    "locker_artifacts": [
      "data/evidence-integration/rook-evidence-locker-sweep-....json"
    ]
  }
}
```

This metadata says **what Evidence inspected**, not that the entire sweep was accepted as fact.

For already-accepted packets created before this field was formalized, the discovery tool recognizes the existing repository convention: an accepted `ROOK` packet whose `evidence_cutoff` exactly equals a completed sweep's `window_end`. Historical accepted packet bytes are not rewritten merely to add new metadata.

A completed sweep at or before the accepted canonical cutoff with no accepted consumption provenance is a release-integrity error because it represents a potentially skipped intake window.

## Later evidence and corrections

Occurrence time, publication time, collection time, evidence cutoff, knowledge time and current factual disposition are separate clocks.

A later report may update BDA, attribution, casualty count, facility status, unresolved questions or another current disposition without creating a second physical occurrence. Locker `existing_event_updates` therefore identifies:

- `updates_existing_ref`;
- a later-evidence `relationship`;
- the new observation/current status.

Evidence Integration determines the canonical semantics. Release validates that the upstream relationship is structurally preserved and that accepted history is not rewritten. Later knowledge is not backdated and earlier accepted states remain historical provenance.

## Intake-only versus release-affecting changes

`pages.yml` classifies every `main` push before deployment.

An intake-only candidate must consist exclusively of **new append-only recognized upstream intake artifacts**. Modification/deletion of an existing locker artifact, canonical change, public/runtime change, build/workflow change, or unknown path is release-affecting or fails closed.

For an intake-only candidate, Release:

1. validates the locker contract and append-only safety;
2. rebuilds the deterministic public state and signed public release at both the prior `main` commit and the new commit;
3. compares the generated public release identity.

Only when those identities are equal is Pages deployment skipped.

The resulting operational statement is:

> Upstream evidence intake changed; accepted public release identity did not. No public deployment required.

This is not a filename-only exemption. A candidate intake path that unexpectedly changes generated public bytes is promoted to the normal full release path.

## Release-affecting changes

Accepted canonical advancement, Public Product changes, runtime/build/release changes, or any other change that affects or might affect public release identity follows the normal chain:

**exact-SHA qualification → deterministic release build → qualified Pages deployment → live-byte attestation.**

Manual workflow dispatch remains a full qualification/deployment path for audit or debugging.

## Gap and overlap handling

Timestamp windows, not filenames or calendar-day assumptions, are authoritative.

Validation:

- rejects duplicate sweep windows;
- rejects malformed or future window ordering;
- reports suspicious overlaps;
- reports unexplained gaps;
- records small boundary variation (for example a 63-second handoff) without rejecting a legitimate sweep;
- rejects duplicate intake identities inside a sweep.

## Source discovery preservation

`ROOK_EVIDENCE_LOCKER_SOURCE_REGISTRY_DELTA` records sources used/inspected in an evidence window.

`EVIDENCE_LOCKER_SOURCE_DISCOVERY_DELTA` records newly identified recurring/standing collection sources.

Discovery files are deltas. Existing intake history is append-only; modifying or deleting a prior source-discovery delta is rejected. A new delta may expand standing coverage but may not silently erase earlier standing sources.

## Defect routing

- Evidence-semantic ambiguity → Evidence Integration.
- Reader wording/hierarchy/presentation defect → Public Product.
- Deterministic build, CI, release identity, deployment or regression-contract defect → Release Integrity.
- Upstream collection-structure defect → ROOK/intake producer.

Escalate to the Project Lead only for a genuinely owner-level product/evidence decision, not routine baton-passing.
