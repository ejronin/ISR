# Gate 3 evidence remediation — 2026-09-05

Gate 3 implements the frozen Gate 2 adjudication without rewriting the sealed v1 migration packages.

## Authority boundary

- Base canonical authority remains `data/canonical-ledger/manifest.json` and the v1 compiler's sealed migration boundary.
- Gate 3 is an append-only v2 extension registered by `data/canonical-ledger/manifest-v2.json`.
- Frozen Gate 2 evidence cutoff: `2026-09-05T00:37:00-04:00`.
- New evidence after that instant belongs to a later packet and must not leak backward into this state.

## Gate 3 outputs

`build_canonical_current_state_v2.py` first compiles and verifies the complete v1 state. It then:

1. requires one machine-readable disposition for every legacy E001-E063 record;
2. restores only records Gate 2 explicitly marked for restoration, while preserving `RELATED_THEATER_CONTEXT`, `STATE_SNAPSHOT`, `DIPLOMATIC_OR_POLICY_EVENT`, and `PERIOD_ASSESSMENT` as separate classes;
3. seeds immutable side ledgers and requires semantic event/exemption links;
4. merges unresolved gaps and collection requests into a single gap state;
5. migrates the existing information-war and claim-evolution records into the Lie Ledger without turning `FALSE` into `LIE`;
6. applies accepted v2 packets in strictly increasing `known_at` order;
7. derives daily coverage from canonical chronology rather than hand-maintained quiet-day rows.

`build_public_current_state_v2.py` validates the unchanged v1 public/read-model contract first, then overlays the validated v2 chronology/entity state and exposes Gate 3 families as explicit datasets. It does not silently remap legacy pages; Phase 9 may consume the new datasets only after parity revalidation.

## Lie Ledger

The authoritative design is the Gate 2 Claim, Contradiction & Deception Adjudication specification plus its Social Media / Propaganda addendum. Core invariants:

- test the proposition, not the rhetoric around it;
- claim -> behavior -> external response -> observed yield -> adjudication;
- factual adjudication and deceptive intent are separate dimensions;
- deception score 0-4;
- `KNOWING_FALSEHOOD_LIE` requires evidence about claimant knowledge;
- originator and amplifier remain separate;
- recycled narratives and knowledge access increase evidentiary scrutiny but do not themselves prove deception;
- launch != impact != damage != mission kill != strategic effect;
- event time and knowledge time are separate clocks.

Inherited `information_war_claims_v2_7.json` cases migrate with deception score 0 unless separate knowledge evidence exists. The forensic Iranian claim-evolution chain remains intact rather than flattened, so a false aircraft-type identification cannot erase a real aircraft loss, and a hedged pilot-capture rumor cannot be rewritten as a confirmed official prisoner claim.

## Side-ledger semantics

Event-producing casualty and material-loss records may not remain stranded. Gate 3 uses one of three treatments:

- link to an existing/restored canonical event;
- promote the dated side record to an explicit canonical event/state observation; or
- declare an explicit non-event/aggregate/unresolved-date disposition.

Cumulative casualty snapshots are never additive. Material-loss claim rows remain excluded from verified attrition and must carry source provenance.

## Do-not-restore controls

1. no stronger Red Sea/regional “founding signatories” wording without new canonical evidence;
2. no host-state flags for Hezbollah, Houthis, or other non-state actors;
3. archived/retired HTML runtime is not a current-state dependency;
4. no manufactured BDA geometry or precision.

## Validation

`validate_gate3.py` is intentionally semantic. It fails on missing E001-E063 dispositions, claims without provenance, FALSE-to-LIE shortcuts, non-strike classes counted as strikes, backdated retrospective evidence, additive cumulative casualty snapshots, unresolved event-producing side records, gap/collection divergence, quiet dates containing events, do-not-restore regressions, cutoff drift, unresolved source references, or any failure of the v1 sealed-input authority checks.

The branch workflow builds the v1 authority state, validates it, builds canonical v2, runs semantic validation, builds public v2, and reruns both v2 builders in `--check` mode for deterministic byte-for-byte output.
