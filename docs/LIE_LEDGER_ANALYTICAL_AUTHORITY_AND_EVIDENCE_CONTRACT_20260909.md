# ATLAS LIE LEDGER — ANALYTICAL AUTHORITY, EVIDENCE-DRAWER & SEMANTIC-MIGRATION CONTRACT

**Status:** CONTROLLING PROJECT AUTHORITY  
**Effective date:** 2026-09-09  
**Authorized by:** Project Lead  
**Applies to:** Lie Ledger semantic remediation and all successor Lie Ledger updates  
**Governing remediation branch:** `fix/lie-ledger-semantic-contract-20260909`  
**Successor doctrine target:** `lie-ledger-v2`

This document supersedes any prior instruction, implementation assumption, PR/CI practice, test expectation, or product behavior that gives PR/CI independent authority to decide whether a statement was a lie.

The controlling authority split is:

> **ROOK decides what Atlas analytically concludes.**
>
> **PR/CI makes sure Atlas can prove, represent, and preserve that conclusion correctly.**

PR/CI may block publication of an unsupported or technically deficient adjudication. PR/CI may not replace ROOK's substantive judgment with its own.

---

## 1. CONTROLLING AUTHORITY

### 1.1 ROOK authority

ROOK is the analytical authority for the Lie Ledger.

For every proposition, claim instance, or narrative chain, ROOK owns:

- proposition definition;
- source-fidelity judgment;
- factual adjudication;
- contemporaneous evidence state;
- claimant/institution knowledge access;
- circumstantial knowledge indicators;
- credible innocent alternatives;
- comparative inference;
- knowledge judgment;
- narrative function;
- confidence;
- falsifier;
- relationship to origin, repetition, amplification, correction, retraction, substitution, and contrary evidence;
- final analytical classification.

ROOK therefore owns substantive classifications including, but not limited to:

- `SUPPORTED`
- `PARTLY_TRUE`
- `MISLEADING`
- `FALSE_KNOWLEDGE_INSUFFICIENT`
- `POSSIBLE_KNOWLEDGE`
- `LIKELY_LIE`
- `VERY_LIKELY_LIE`
- `LIE_KNOWING_FALSEHOOD_ESTABLISHED`
- `UNRESOLVED`
- `CORRECTED`
- `RETRACTED`

PR/CI must not independently promote, demote, reinterpret, or substitute these conclusions.

### 1.2 PR/CI authority

PR/CI owns:

- evidentiary qualification;
- proposition fidelity;
- source fidelity;
- actor attribution fidelity;
- temporal fidelity;
- knowledge-basis support verification;
- representation of credible alternatives;
- relationship integrity;
- evidence-versus-inference separation;
- schema and graph integrity;
- renderer fidelity;
- denominator/statistical integrity;
- CI enforcement;
- public evidence-drawer completeness.

PR/CI asks:

> **Can Atlas show the reader, from the cited record, why ROOK reached this adjudication?**

PR/CI does **not** ask:

> **Would PR/CI itself have called this a lie?**

---

## 2. EVIDENCE-TO-RULING CITATION REQUIREMENT

Every public Lie Ledger ruling must be traceable to the exact evidence ROOK relied upon.

A classification label without evidence-to-ruling linkage is not publication-ready.

### 2.1 Required ruling support

For every adjudicated proposition, the backend/public read model must preserve explicit references for the evidence supporting, as applicable:

1. **the proposition as stated**;
2. **the current factual baseline**;
3. **the contemporaneous evidence state**;
4. **claimant/institution knowledge access**;
5. **circumstantial or direct knowledge indicators**;
6. **material contrary evidence**;
7. **material omissions or contradictions considered by ROOK**;
8. **correction or retraction history**;
9. **later repetition after correction**;
10. **the strongest credible innocent alternative**;
11. **the comparative inference ROOK made**;
12. **the falsifier / evidence that would change the assessment**.

The evidence references must resolve to real Atlas source/evidence objects or other explicitly governed backend evidence records.

### 2.2 Public drawer rule

The Evidence drawer must not merely list generic sources at the bottom of the card.

It must make the evidence-to-ruling linkage intelligible to a reader.

For strong judgments, the drawer should expose the following sections or their semantic equivalent:

#### What was said

- faithful proposition;
- exact actor/institution/publisher;
- statement time;
- source citation(s).

#### What the record shows

- current factual baseline;
- evidence citation(s).

#### What was known at the time

- contemporaneous facts available by the relevant statement time;
- evidence citation(s);
- explicit distinction between contemporaneous and later evidence.

#### What the claimant could reasonably know

- institutional or physical evidence-access basis relied upon by ROOK;
- evidence citation(s).

Examples may include:

- own-force launch records;
- telemetry;
- wreckage custody;
- personnel accountability;
- diplomatic correspondence;
- operational logs;
- previously published contradictory facts;
- correction before later repetition;
- observed operational behavior;
- physical evidence under institutional control.

#### Why ROOK assessed knowledge

- ROOK's knowledge indicators;
- each indicator tied to supporting evidence references;
- visibly labeled as **ROOK analytic inference**, not direct source quotation unless a source actually states it.

#### Credible alternative

- strongest innocent explanation ROOK considered;
- supporting or contextual evidence where applicable.

#### Why ROOK favored its judgment

- comparative inference;
- clearly labeled as analysis;
- evidence cited for the facts on which the comparison depends.

#### Correction / repetition history

- prior claim;
- correction/retraction;
- later repetition/amplification/substitution;
- dates and evidence citations.

#### Related narrative

- chain/family relationship;
- this relationship must not create duplicate proposition counts.

#### Confidence

- ROOK's canonical confidence value.

#### What would change the assessment

- falsifier or specified contrary evidence condition.

#### Evidence

- actual source drawer with resolvable source IDs and reader-accessible links where available.

### 2.3 Citation precision

A citation must support the proposition or inference component to which it is attached.

Examples:

- a source proving an aircraft was hit cannot be cited as proof it was destroyed;
- a source proving a correction occurred cannot by itself prove the claimant knew of that correction before an earlier statement;
- a publisher headline cannot be assigned to a quoted official unless the official actually said the headline proposition;
- a source proving an actor had custody of wreckage may support a knowledge-access indicator, but the resulting knowledge conclusion remains ROOK's inference;
- later evidence may support today's retrospective adjudication, but must be identified as later evidence and must not be represented as contemporaneously available when it was not.

### 2.4 Backend enforcement requirement

The successor schema/read model must support explicit evidence references for each material ruling component.

A generic `source_ids` array is insufficient when it is impossible to tell **which source supports which part of the ruling**.

Preferred successor representation should support named reference groups such as, or semantically equivalent to:

- `claim_source_refs`
- `factual_baseline_refs`
- `contemporaneous_evidence_refs`
- `knowledge_access_refs`
- `knowledge_indicator_refs`
- `contrary_evidence_refs`
- `correction_refs`
- `repetition_refs`
- `credible_alternative_refs`
- `comparative_inference_basis_refs`
- `falsifier_refs`

Exact field names are an implementation decision, but the semantic capability is mandatory.

---

## 3. PR/CI QUALIFICATION TESTS

PR/CI must verify the following before a ROOK adjudication is publishable.

### 3.1 Proposition fidelity

The proposition shown by Atlas must faithfully match the source communication.

A source saying `hit` must not become `destroyed` unless another source actually makes the stronger proposition.

### 3.2 Source fidelity

Cited sources must be:

- real;
- resolvable;
- properly linked;
- correctly attributed;
- temporally appropriate;
- actually supportive of the proposition, fact, evidence-access indicator, alternative, or inference basis for which they are cited.

### 3.3 Actor fidelity

Atlas must distinguish:

- speaker;
- military command;
- government;
- publisher;
- state media;
- amplifier;
- unaffiliated/social account.

Publisher framing must not silently become the quoted speaker's statement.

### 3.4 Temporal fidelity

Atlas must distinguish:

- event time;
- statement time;
- evidence-publication time;
- Atlas knowledge time where applicable;
- correction time;
- repetition-after-correction time;
- later retrospective evidence.

Later evidence may strengthen today's assessment. It may not be backdated.

### 3.5 Knowledge-basis support

If ROOK relies on circumstantial knowledge evidence, the drawer must actually expose the evidence supporting that basis.

PR/CI verifies the evidence exists and is represented correctly.

PR/CI does not independently decide whether that evidence is enough for `LIKELY_LIE`, `VERY_LIKELY_LIE`, or another analytical classification.

### 3.6 Credible alternatives

Strong ROOK judgments must preserve the credible alternatives ROOK considered.

PR/CI checks completeness and faithful representation.

PR/CI may not replace ROOK's comparative judgment with a different preferred alternative.

### 3.7 Evidence versus inference

The product must visibly distinguish:

- **Observed fact**
- **Source/actor assertion**
- **ROOK analytic inference**
- **ROOK knowledge judgment**

No inference may render as if directly stated by a source.

---

## 4. PR/CI FAILURE AUTHORITY

PR/CI may block implementation/publication with one or more of these findings:

- `EVIDENCE_DRAWER_INCOMPLETE`
- `PROPOSITION_FIDELITY_FAILURE`
- `SOURCE_SUPPORT_FAILURE`
- `KNOWLEDGE_BASIS_SUPPORT_FAILURE`
- `TEMPORAL_SUPPORT_FAILURE`
- `ACTOR_ATTRIBUTION_FAILURE`
- `RELATIONSHIP_FAILURE`
- `DENOMINATOR_FAILURE`
- `EVIDENCE_INFERENCE_COLLAPSE`
- `UNRESOLVED_SOURCE_REFERENCE`

When such a failure occurs, PR/CI must return:

> **ROOK RE-ADJUDICATION / EVIDENCE COMPLETION REQUIRED**

with the exact technical/evidentiary deficiency.

PR/CI must **not** silently change ROOK's adjudication to make the record pass.

ROOK then decides whether to:

- add evidence;
- correct the proposition;
- alter the inference;
- change confidence;
- raise or lower the adjudication;
- leave the adjudication unchanged with improved qualification.

The final substantive decision remains ROOK's.

---

## 5. CI ROLE

CI enforces structural and representational integrity.

CI asks:

> **Is ROOK's canonical judgment represented, evidenced, related, counted, and rendered correctly?**

CI does not ask:

> **Was ROOK analytically correct to call this a lie?**

Required successor CI includes, at minimum:

1. every ROOK verdict has required supporting fields;
2. source/evidence IDs resolve;
3. proposition wording matches canonical proposition data;
4. knowledge-basis references resolve;
5. strong knowledge judgments include credible alternatives;
6. strong judgments include falsifiers;
7. later evidence is temporally identified;
8. corrections/repetitions retain parent relationships;
9. amplification does not inflate unique proposition counts;
10. corrections do not inflate falsehood totals;
11. `NOT_ASSESSED` never renders as `NO_EVIDENCE`;
12. truth status cannot automatically manufacture knowledge status;
13. actor-specific scoring rules do not exist;
14. the DOM faithfully renders ROOK's canonical adjudication;
15. each strong public ruling exposes its evidence-to-ruling citations;
16. generic source lists cannot satisfy component-level evidence support where multiple distinct inference components exist;
17. factual and knowledge axes remain separate;
18. contextual records do not enter accusation denominators;
19. synthetic artifacts do not automatically attribute deception to a state actor;
20. current records identify the active semantic/doctrine version.

---

## 6. SEMANTIC MIGRATION AUTHORITY

Lie Ledger remediation is a controlled forward semantic migration.

### 6.1 Branch topology

All semantic remediation occurs on:

`fix/lie-ledger-semantic-contract-20260909`

Do not modify `main` directly.

Do not mix this remediation into:

`rook/catchup-20260909`

Preferred topology:

`main`  
→ `fix/lie-ledger-semantic-contract-20260909`  
→ remediation PR  
→ `main`

Then:

new `main`  
→ replay/rebase `rook/catchup-20260909`  
→ PR #62  
→ `main`

No branch pyramids without explicit Project Lead authorization.

### 6.2 Canonical evidence integrity

The remediation must not:

- rewrite sealed migration evidence;
- alter accepted packet contents in place;
- reseal the migration boundary;
- edit historical source text to fit the successor model;
- erase provenance;
- backdate later evidence;
- manufacture missing evidence;
- convert unknown into zero;
- invent actor attribution;
- invent source support;
- silently change stable entity identity;
- treat generated public/current state as canonical authority;
- weaken CI merely to obtain a green build.

If historical representation conflicts with the corrected model, normalize forward while preserving provenance.

---

## 7. SUCCESSOR CONTRACT / RULE-CHANGE AUTHORITY

Rules that encode defective Lie Ledger semantics may be changed, including:

- schema;
- truth/knowledge vocabulary;
- deception-score interpretation;
- knowledge-assessment threshold structure;
- claim/proposition relationship rules;
- denominator definitions;
- public hierarchy;
- renderer behavior;
- obsolete CI assertions;
- magic-count expectations;
- builder normalization rules;
- evidence-drawer completeness requirements;
- circumstantial-knowledge representation.

When an existing rule prevents faithful representation of ROOK's adjudication, PR/CI must report:

> **SEMANTIC RULE CONFLICT — PROJECT-LEAD AUTHORIZATION REQUIRED**

with:

1. current rule;
2. enforcing file/test;
3. conflict with corrected doctrine;
4. proposed replacement;
5. migration impact;
6. compatibility impact;
7. CI changes;
8. historical-record effect;
9. future-update effect.

Project Lead authorization of `RULE SUPERSEDED` means the old rule must be deliberately replaced, migrated, documented, tested, and removed from every active production/test dependency.

It does **not** mean disabling a failing test and moving on.

---

## 8. SUCCESSOR VERSIONING

Preserve:

`lie-ledger-v1` → legacy input/provenance

Create/use:

`lie-ledger-v2` → corrected semantic contract

The successor contract must define:

- factual axis;
- knowledge axis;
- proposition identity;
- claim-instance identity;
- relationship model;
- evidence-access indicators;
- component-level evidence references;
- credible alternatives;
- comparative assessment/inference;
- confidence;
- falsifier;
- narrative function;
- amplification;
- corrections/retractions;
- substitutions;
- denominator classes;
- doctrine-version pinning.

Legacy evidence should be normalized into v2 deterministically.

Builders may normalize structure. They may not invent ROOK analysis.

---

## 9. SAFE IMPLEMENTATION ORDER

The remediation order is:

### Phase A — Contract

- schema;
- enums;
- relationship types;
- evidence-reference types;
- migration rules;
- governing documentation.

### Phase B — Normalization

- deterministic legacy-to-v2 normalization;
- provenance preservation;
- no automated invention of substantive ROOK judgments.

### Phase C — ROOK adjudication overlay

- ROOK supplies/approves substantive ledger-wide reassessment;
- each material adjudication resolves to proposition, actor, time, evidence basis, knowledge assessment, alternatives, confidence, falsifier, relationships, and doctrine version.

### Phase D — Public read model

- public model contains every field required by the Evidence drawer;
- material reasoning must not be trapped only in private/canonical layers.

### Phase E — Renderer

Primary unit:

> **Narrative / proposition chain**

not a flat pile of isolated records.

Renderer exposes:

- factual verdict;
- knowledge judgment;
- combined ROOK assessment;
- evidence-backed explanation;
- claim history;
- corrections;
- repetitions;
- narrative relationships;
- cited evidence.

### Phase F — Metrics

Metrics derive from canonical entity classes, never DOM row counts.

Separate:

- unique propositions;
- claim instances;
- originations;
- amplification;
- corrections;
- narrative chains;
- false propositions;
- knowledge-assessed propositions;
- likely/very-likely/directly established knowing falsehoods.

### Phase G — CI

CI enforces the successor doctrine only after the semantic structures exist.

### Phase H — Browser/render qualification

Run the complete production qualification stack, including mobile/tablet/desktop and evidence-drawer stress states.

---

## 10. ANTI-REGRESSION / ADJUDICATION STABILITY

After v2 becomes authoritative, routine ROOK sweeps may change individual adjudications when warranted by:

- new evidence;
- corrected attribution;
- improved chronology;
- new knowledge-access evidence;
- newly credible alternative;
- factual correction;
- relationship correction;
- proposition-fidelity correction.

Every substantive judgment change requires a traceable reason.

Routine updates may not silently reintroduce obsolete doctrine such as:

- no confession = no knowledge evidence;
- score `0` = no evidence;
- false automatically = lie;
- repetition = new proposition;
- amplification = new falsehood;
- correction = additional falsehood;
- source says hit → Atlas tests destroyed;
- publisher framing = speaker claim.

Every successor record should identify the governing doctrine/contract version, e.g.:

`lie_ledger_contract_version: 2.0`

CI must reject v1 semantic treatment of v2 records.

---

## 11. SUPERSEDED-RULE REGISTRY REQUIREMENT

The remediation must maintain a durable registry of deliberately superseded rules.

For each:

- **OLD RULE**
- **WHY DEFECTIVE**
- **NEW RULE**
- **PROJECT-LEAD AUTHORIZATION**
- **EFFECTIVE CONTRACT VERSION**
- **CI REGRESSION TEST**

Examples:

Old:

`deception_score 0 -> No evidence of knowing deception`

New:

`NOT_ASSESSED` and `ASSESSED_NO_EVIDENCE` are distinct.

Old:

knowledge/intent-bearing value permitted inside `truth_adjudication`

New:

factual status and knowledge status are separate axes.

Old:

hard-coded Lie Ledger record total treated as semantic truth

New:

canonical-derived entity-class counts plus versioned historical baseline.

---

## 12. CURRENT REMEDIATION WORKFLOW

The controlling workflow is:

**PR/CI fixes schema + graph + renderer + CI**

→

**ROOK performs the ledger-wide forensic reassessment under the corrected doctrine**

→

**PR/CI audits every Evidence drawer against ROOK's adjudication, including evidence-to-ruling citations**

→

if deficient:

**PR/CI → ROOK with exact evidentiary deficiency**

→

**ROOK re-adjudicates or completes the evidentiary basis**

→

**PR/CI implements and validates**

→

**Project Lead performs final exact-head release review**

No PR/CI analytical substitution is permitted at any stage.

---

## 13. PROJECT-LEAD RELEASE AUTHORITY

Before remediation merge, the Project Lead must verify:

- correct base and branch topology;
- no contaminated ancestry;
- complete semantic migration;
- ROOK adjudications represented faithfully;
- Evidence drawers cite the evidence supporting the ruling components;
- no sealed evidence rewritten;
- superseded rules fully removed/migrated from active code/tests;
- full exact-head CI green;
- browser/render review acceptable;
- public metrics reconcile;
- contract-version pinning works;
- anti-regression tests exist;
- PR #62 remains separate.

Only then may the remediation be promoted.

After remediation merges:

1. update/rebase/replay `rook/catchup-20260909` from corrected `main`;
2. preserve Sep. 7–9 evidence work;
3. run those propositions through the corrected contract;
4. regenerate canonical/public state;
5. update bounded current narrative as appropriate;
6. run complete exact-head CI;
7. inspect Evidence drawers;
8. verify metrics;
9. promote PR #62;
10. merge;
11. verify Pages;
12. retire the catch-up branch.

---

# FINAL CONTROL RULE

**ROOK decides the analytical conclusion.**

**PR/CI verifies that the conclusion is proposition-faithful, source-faithful, actor-faithful, temporally correct, evidentially supported, relationship-preserving, correctly counted, and faithfully rendered.**

**Every material public ruling must cite the evidence supporting the ruling, including the factual and knowledge bases on which ROOK relied.**

PR/CI may block unsupported publication.

PR/CI may not replace ROOK's adjudication.

Semantic-rule changes require Project Lead authorization and must become explicit, versioned, documented, migrated, tested, rendered, and pinned against regression.

Canonical evidence integrity remains non-negotiable.
