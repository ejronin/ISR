# Lie Ledger evidence-adjudication contract

**Status:** Active successor contract for generated Lie Ledger state.

This contract governs the active generated Lie Ledger model. Historical ROOK and PR/CI artifacts remain preserved as provenance and migration inputs, but no persona, engineer, or prior workflow owns factual truth, knowledge judgment, publication authority, or implementation authority.

## 1. Governing rule

A Lie Ledger conclusion is justified by its evidence, temporal state, and accepted assessment record. A person or persona may have produced an earlier assessment, but authorship is provenance rather than authority.

Generated state must therefore distinguish:

- factual adjudication;
- knowledge judgment;
- combined public assessment;
- lifecycle/correction state;
- evidence support;
- denominator membership;
- publication qualification;
- historical assessment provenance.

These dimensions must not be collapsed merely to simplify the public presentation.

## 2. Factual status and knowledge are independent

`FALSE` does not by itself mean `Lie`.

A knowing-falsehood or likely-lie conclusion requires evidence supporting the relevant knowledge judgment. A factual finding may remain false while the knowledge/intent question is unresolved, insufficiently evidenced, or not assessable.

Likewise, a publication qualification affecting a knowledge judgment must not erase an independently supported factual status. The correct behavior is to withhold the unqualified knowledge/intent conclusion while retaining the supported factual finding.

## 3. Evidence invariants

Migration or rendering changes must not silently alter:

- claim, proposition, chain, event, or source identity;
- quotations or source-proposition polarity;
- source URLs or source variants;
- statement time, event time, knowledge time, or assessment time;
- factual adjudication;
- knowledge judgment;
- combined assessment;
- evidence references;
- denominator class or unique-proposition membership;
- correction/retraction/amplification relationships;
- credible alternatives or falsifiers;
- accepted evidence packet bytes or hashes.

Unknown is not zero. Repetition is not a new unique proposition unless the evidence model explicitly records a distinct proposition. A correction, withdrawal, administrative closure, or source hedge must retain its actual semantic role.

## 4. Active generated status vocabulary

Generated records use neutral adjudication state:

- `EVIDENCE_ADJUDICATED`
- `LEGACY_NORMALIZED_NOT_REASSESSED`

Generated publication state may use:

- `PUBLIC_READY`
- `BLOCKED_EVIDENCE_COMPLETION`
- `NOT_REASSESSED`

Historical status strings may remain inside explicitly historical provenance containers when necessary to preserve traceability.

## 5. Publication qualification

Publication blockers describe the evidentiary deficiency, not the person who is allowed to decide it.

A blocker may identify such deficiencies as unresolved source reference, missing knowledge-access evidence, missing credible alternative, missing falsifier, or other evidence-integrity failure. Active blocker objects must not assign truth or publishing authority to ROOK, PR/CI, UX/UI, Atlas, or an engineer.

## 6. Historical migration inputs

Historical files with names such as `lie-ledger-v2-rook-*` are not rewritten merely to sanitize repository history. Their filenames, internal authorship metadata, version strings, and accepted bytes can remain intact.

Production code may consume those artifacts as bounded historical assessment inputs. It must not treat their persona ownership fields as current governing authority.

Generated provenance should identify the historical input path/version and its migration role without reproducing active persona-authority semantics.

## 7. Metrics

Lie Ledger metrics are computed from evidence-adjudicated records and their denominator rules. They are not counts of persona-owned judgments.

A migration is invalid if it changes any metric count or percentage merely because governance vocabulary changed.

## 8. Public projection

Public presentation may simplify the internal evidence model, but must preserve the distinction between factual falsity and knowing deception. Internal claim/proposition/chain IDs, blocker machinery, authority history, and assessment-production metadata are not routine reader content.

Reader hierarchy remains:

**what was claimed → what the evidence shows → whether repetition/correction matters → how we know**.

## 9. Migration acceptance test

Before neutral governance becomes the production path, a deterministic before/after comparison must prove parity for substantive fields and counts. The migration must also prove that active generated state no longer contains persona authority/status semantics while historical provenance remains traceable.

The canonical/public build, schema validation, browser regression, release hashing, and deployment checks must pass on the exact proposed head before merge.
