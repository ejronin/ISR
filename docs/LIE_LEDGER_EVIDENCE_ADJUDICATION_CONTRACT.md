# Lie Ledger evidence-adjudication contract

**Status:** Active successor contract for generated Lie Ledger state.
**Reasoning amendment:** 2026-09-18 — ordinary-language proposition testing, claimant burden, reasonable inference, and source-reliability weighting.

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

## 2A. Proposition meaning and evidentiary burden

The adjudicator tests what the speaker actually communicated, not a hypothetical version that would be easier to defend later.

- Use the ordinary meaning of the words in their contemporaneous context, including qualifiers, audience, role, and surrounding statements.
- Preserve the speaker's level of specificity. Exact counts, ordinals, identities, universal propositions, causal attributions, destruction claims, capture claims, casualty counts, and claims of total control are exact testable propositions.
- An affirmative claimant does not receive a presumption of truth merely because an opposing actor has not issued a dispositive rebuttal. The evidence must support the proposition at the precision asserted.
- Absence of corroboration alone may support `UNSUBSTANTIATED` or an equivalent evidence-deficient state; it does not automatically establish `FALSE`.
- `UNRESOLVED` is not the default for every unverified proposition. Reserve it for cases where material evidence leaves genuinely live explanations and no answer is materially favored.
- A later clarification, correction, retraction, or claim of misquotation is evaluated as a later record. It may alter current understanding, but it does not erase or silently rewrite the earlier proposition.

## 2B. Reasonable inference, internal consistency, and knowledge

Atlas may reach factual and knowledge judgments through reasonable inference. Direct admission, a single dispositive source, or courtroom-style proof is not required.

The adjudicator must consider, where relevant:

- independent observation and physical evidence;
- chronology and arithmetic;
- internal consistency with the claimant's own prior records, category definitions, itemization, corrections, and later acknowledgments;
- whether an exact cumulative claim implies a ledger that can be reconstructed and tested;
- claimant/institution access to own-force records, BDA, personnel accountability, targeting data, sensor feeds, diplomatic records, or other counterfacts;
- whether contrary evidence or correction opportunity existed before a repetition or escalation;
- source reliability based on the source's documented record of accurate, unsupported, contradicted, exaggerated, recycled, corrected, or quietly abandoned claims;
- subsequent behavior and operational consequences;
- credible innocent-error explanations such as stale data, misidentification, translation error, reporting delay, fog of war, or subordinate-source error;
- plausible motive or narrative function, including deterrence, bargaining, domestic messaging, face-saving, propaganda, or operational deception.

These factors have different roles. Source history and motive change evidentiary weight and comparative plausibility; they do not make a proposition false by themselves. Institutional access does not automatically prove deception; it can, however, materially support a knowledge inference when the proposition is false and the access makes innocent error less plausible.

An exact statement such as “the 52nd” or “all targets were destroyed” also makes an implicit record-keeping proposition: the claimant is representing that it possesses a coherent basis for that exact accounting. The adjudicator may test the asserted ordinal or universal against the claimant's own ledger, accepted external baselines, duplication controls, category boundaries, and later corrections.

`FALSE != Lie` remains mandatory, but the knowledge prong does not require a confession. `LIKELY_KNEW_FALSE`, `VERY_LIKELY_KNEW_FALSE`, or `KNOWING_FALSEHOOD_ESTABLISHED` may be supported by converging evidence of access, chronology, internal contradiction, repetition after correction opportunity, record-keeping responsibility, and the relative weakness of credible innocent-error alternatives.

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
