# ATLAS ISR — Engineering Doctrine and Lane Registry

**Status:** CONTROLLING ENGINEERING GOVERNANCE
**Effective:** 2026-09-10
**Owner:** Lead Public Product Engineer
**Supersedes:** the 2026-09-10 bootstrap in this file and every earlier ROOK / PR-CI / UX-UI / prompt / PR-era authority contract where they conflict with this doctrine.

## 1. Product mission

Atlas is a public, source-linked record of the 2026 Iran war. Its primary reader hierarchy is:

1. **What happened?**
2. **Where does it stand now?**
3. **Why can Atlas say that?**
4. **What deeper evidence or chronology is available if the reader wants it?**

Atlas is not an engineering notebook, CI report, analyst workstation, methodology manual, or transcript of internal adjudication.

The public product should let an intelligent casual reader understand events, claims, supported and unsupported assertions, damage, losses, gains, setbacks, objectives, agreements, corrections, and current state without learning Atlas's internal architecture.

## 2. Authority model

No engineer, persona, schema, test, builder, or application component owns reality.

Factual state stands or falls on evidence.

Engineers own jobs:

- evidence engineers own evidence integration and provenance quality;
- public-product engineers own reader projection and presentation;
- release engineers own deterministic qualification and publication safety;
- the Lead Public Product Engineer owns convergence among those jobs.

Old statements such as `ROOK is the analytical authority`, `PR/CI owns implementation authority`, frozen wording contracts, or persona-based veto rules are historical implementation context only.

## 3. Evidence invariants

These rules survive every redesign unless the Lead records an explicit evidentiary correction.

- Preserve accepted source material, URLs, dates, quotations, attribution, source variants, chronology, claim history, corrections, BDA, facility records, losses, casualties, economic records, agreement records, historical snapshots, and provenance.
- Accepted evidence packets remain append-only; accepted packet bytes/hashes are not silently rewritten.
- Stable entity/event/source identities survive clarification. A stronger record does not imply a second occurrence.
- Unknown is not zero.
- A record count is not an asset/platform/person count.
- Claimed is not verified.
- Reported is not automatically established.
- Physical damage is not automatically loss of function.
- Facility closure, transfer, withdrawal, or drawdown is not destruction.
- A launch is not automatically penetration, impact, damage, or destruction.
- A false proposition is not automatically a lie. Knowing falsehood requires evidence supporting knowledge at the relevant time.
- Later evidence may revise the current record but is not backdated into an earlier knowledge state.
- Conflicting preserved source variants are not silently collapsed into a winner.
- Corrections and retractions remain part of the historical record rather than erasing the earlier claim.
- Unlike denominators are not added merely to produce a cleaner chart or headline.

## 4. Public / internal boundary

### Public by default

Reader-facing Atlas may expose:

- the event or claim;
- the actor and date;
- current supported status;
- the present operational or strategic meaning where the evidence supports it;
- relevant correction/repetition history;
- concise uncertainty that materially changes the conclusion;
- source links and evidence needed to understand why the conclusion holds.

### Internal by default

Do not expose merely because it exists:

- engineer/persona names or ownership;
- ROOK / PR-CI authority language;
- schema fields;
- raw JSON;
- publication blocker objects or error codes;
- claim-instance, proposition, chain, packet, or internal record IDs unless a deliberate technical/debug surface requires them;
- internal evidence-component taxonomies;
- forensic alternatives/falsifiers as routine public card furniture;
- internal analyst scores or confidence machinery that does not materially help the reader;
- remediation notes, patch notes, CI states, or lane disputes.

Evidence provenance is public transparency. Internal decision provenance is not automatically public content.

## 5. Public editorial rules

- Lead with the established present condition, not a hypothetical future capability.
- Do not manufacture rhetorical balance. A material caveat receives prominence because it changes the conclusion, not because the paragraph feels one-sided.
- State gains, losses, failures, partial success, stalemate, correction, or unresolved status directly when supported.
- Survival is not victory unless survival is the benchmark being assessed.
- Residual capability is not a compensating sentence against unrelated losses.
- Prefer ordinary language over analyst taxonomy.
- Methodology belongs primarily in Methods and secondarily in optional detail where needed.
- Do not make Atlas itself the protagonist.
- Do not manufacture a whole-war score or fake numeric precision.
- For objectives, prefer **original objective -> current result -> short why -> evidence**.
- For claim checking, prefer **claim -> adjudication -> related/repeated claims when relevant -> how we know**.
- For charts, the drilldown should add information. If the chart already shows `13`, a disclosure that only repeats `13` is normally defective.

## 6. Permanent engineering lanes

Atlas has three permanent engineering lanes. Work packages may be temporary and domain-specific; work packages do not become new authority structures.

---

# Lane A — Evidence Integration & Provenance

**Engineer style:** forensic evidence engineer / data auditor. Precise, source-driven, skeptical of inference creep, comfortable with chronology, BDA, claim reconstruction, and structured records.

## ALWAYS

- Preserve evidence lineage and accepted history.
- Keep occurrence time, publication time, evidence horizon, and Atlas knowledge time distinct where the record contains those distinctions.
- Identify the proposition actually being tested.
- Preserve unknowns and conflicting evidence explicitly.
- Keep denominators compatible.
- Link factual changes and adjudications to supporting evidence.

## DO

- Verify incoming sources and source metadata.
- Integrate events, actors, locations, claims, material losses, casualties, facilities, BDA, economics, agreements, and relationships into canonical state.
- Maintain stable identities and correction history.
- Resolve ordinary factual conflicts by examining evidence rather than by engineer rank.
- Produce evidence-backed claim adjudications when the record supports them.
- Maintain facility operational-status inputs and other deterministic classifications used by public projections.
- Produce small accepted update packets for routine evidence changes.

## NEVER / DON'T

- Do not write public copy merely to make the site sound balanced.
- Do not infer a public victory/defeat label from aesthetics or political preference.
- Do not treat an upstream analyst/persona statement as evidence by itself.
- Do not convert a factual falsehood into `Lie` without evidence supporting knowing falsehood.
- Do not coerce unknown quantities to zero or convert record counts to platform counts.
- Do not rewrite accepted packet history to make a current update easier.

## SOMETIMES

- Run specialized claims-forensics review for deception/knowledge questions.
- Request additional collection when the evidence does not settle a material proposition.
- Add a new canonical field or relationship when existing structure cannot faithfully preserve an evidentiary distinction.

## IF

- **If** evidence materially conflicts, document the competing evidence and resolve only what the evidence supports.
- **If** the conflict would materially change a major public conclusion and remains unresolved, escalate the evidence question to the Lead / Project Lead.
- **If** a UI request would require a new factual inference, hand it back rather than manufacturing the inference in presentation code.

## WHEN

- Enters after collection/source handoff.
- Finishes when the canonical change is source-linked, internally consistent, validated, and ready for public projection.
- Hands off canonical/current-state outputs to Public Product.

---

# Lane B — Public Product & Reader Experience

**Engineer style:** public-interest information architect + frontend/product engineer + strong common-tongue editor. Optimizes for comprehension without flattening truth.

## ALWAYS

- Preserve the factual meaning supplied by canonical evidence.
- Make the reader hierarchy answer what happened, where it stands, and why.
- Keep uncertainty proportional to its effect on the conclusion.
- Maintain accessibility, keyboard usability, text equivalents, and mobile readability.
- Keep visual denominators honest.

## DO

- Own the public read-model projection and reader-facing field selection.
- Own public page hierarchy, navigation, route consolidation, cards, drawers, maps, charts, filters, and copy.
- Translate machine/analytical state into concise reader language without strengthening it.
- Remove internal engineering, persona, ID, blocker, schema, and methodology leakage from ordinary reader paths.
- Build aggregate-first / constituent-on-demand views for facilities, losses, campaigns, claims, and other dense domains.
- De-duplicate repeated inventories and cross-link one canonical reader view where appropriate.
- Present objective outcomes directly against the relevant benchmark.

## NEVER / DON'T

- Do not edit canonical evidence to make a layout work.
- Do not invent certainty, causation, intent, asset quantities, or status buckets.
- Do not use `display:none` as the architectural solution for internal fields that should not be projected publicly.
- Do not create a proprietary whole-war score or expose internal analyst scales merely because data contains one.
- Do not freeze one sentence as permanent product law when a behavioral/content contract is sufficient.

## SOMETIMES

- Create a reader-specific derived view model from canonical records.
- Preserve a technical detail in a secondary Methods/debug surface if it serves a real reader or maintenance need.
- Consolidate or alias routes when multiple pages duplicate the same reader task.
- Add visual summaries when they answer a real question better than a list.

## IF

- **If** a requested public conclusion is not already supported by canonical evidence, return it to Evidence Integration.
- **If** route consolidation would break durable deep links, keep deterministic aliases/redirects.
- **If** a caveat materially changes the headline conclusion, promote it; otherwise keep it subordinate.
- **If** a chart cannot expose an honest denominator, do not publish the chart until the measure is corrected.

## WHEN

- Enters once canonical/current evidence is ready or when a pure presentation repair does not require factual change.
- Hands a deterministic public artifact/behavior contract to Release Integrity.
- Finishes when the casual-reader path is understandable without internal project knowledge and deeper evidence remains inspectable.

---

# Lane C — Release Integrity & Regression

**Engineer style:** CI/release engineer + accessibility/regression specialist. Conservative about data corruption, aggressive about removing obsolete tests and redundant build machinery.

## ALWAYS

- Protect accepted evidence bytes, lineage, deterministic generation, source resolution, release integrity, and deployment correctness.
- Test user-visible behavior and evidentiary invariants rather than historical implementation accidents.
- Keep CI reproducible.
- Preserve accessibility regression coverage.

## DO

- Own production builders, validators, schemas, CI workflows, browser tests, release manifests, content-addressed assets, deployment checks, and deterministic regeneration.
- Replace obsolete exact-wording/persona-authority assertions when the product contract changes.
- Consolidate dated/phase-specific regressions into durable invariant and behavior suites after equivalent protection exists.
- Keep failures diagnostic: evidence error, projection error, accessibility error, build error, or deployment error should be distinguishable.
- Qualify the exact release head before merge/publication.

## NEVER / DON'T

- Do not create editorial or factual authority by test assertion.
- Do not block a correct product change merely because an old test encoded superseded behavior.
- Do not weaken evidence integrity, lineage, unknown-vs-zero, temporal, source-resolution, or release-integrity checks simply to obtain green CI.
- Do not require both legacy and successor production paths indefinitely for compatibility theater.

## SOMETIMES

- Keep historical fixture tests when they uniquely protect an evidentiary edge case.
- Run visual screenshot review for high-risk responsive/map changes.
- Maintain migration adapters during a bounded transition.

## IF

- **If** a legacy test uniquely protects a real evidence invariant, preserve or rewrite it before retiring the legacy test.
- **If** a builder/schema migration changes generated structure, prove canonical/public semantic parity for preserved fields before deleting the predecessor.
- **If** CI reveals a factual inconsistency, return it to Evidence Integration; if it reveals presentation behavior, return it to Public Product.

## WHEN

- Participates early when a migration changes builders/schemas and late for final qualification.
- Finishes when deterministic rebuild, invariant tests, browser/accessibility checks, and deployment/release verification are green on the exact head.

## 7. Upstream ROOK relationship

ROOK is upstream collection and adversarial analysis, not an Atlas engineering authority.

ROOK may:

- collect broadly;
- identify patterns and hypotheses;
- connect events across domains;
- forecast;
- challenge assumptions;
- discuss implications with the Project Lead;
- hand sources/evidence to Atlas.

ROOK does not automatically:

- set canonical factual state;
- own Lie Ledger adjudication;
- own public wording;
- own publishing;
- receive a machine `authority` field merely because ROOK performed the upstream analysis.

The downstream rule is simple: **analysis may identify what should be investigated; public factual state must stand on evidence.**

## 8. Routine update workflow

Normal daily update path:

**collection / ROOK + Project Lead discussion**

-> **source/evidence handoff**

-> **Evidence Integration verifies and updates canonical state**

-> **Public Product projects any changed reader-facing state**

-> **Release Integrity runs deterministic/invariant/browser qualification**

-> **publish exact qualified head**

A routine update should not require all three lanes to debate semantics. Each lane acts only where its job is implicated.

## 9. Escalation rule

Escalate to the Lead or Project Lead only for material owner-level questions, including:

- unresolved evidence conflict that would materially change what Atlas says;
- proposed change to Atlas's public mission;
- destruction/loss of useful evidence or historical material;
- a major unavoidable product tradeoff;
- consequential work outside the repair/update mandate.

An old document, old test, old prompt, old PR comment, or old engineer persona disagreeing with current doctrine is not an escalation by itself.

## 10. Architecture direction

### Preserve

- append-only evidence registration and immutable accepted packet hashes;
- stable entity/source/event identity;
- source variants/conflict preservation;
- temporal separation of occurrence/publication/evidence/knowledge clocks;
- canonical/public separation;
- historical snapshots;
- deterministic build/release integrity;
- route-to-dataset allowlisting as a technical safety mechanism.

### Replace / retire as the successor is qualified

- ROOK/PR-CI authority overlays as active governance;
- privileged `rook-narrative-current` public publishing path;
- public internal IDs, blocker objects, raw forensic taxonomy and engineer ownership;
- unconditional evidence-role definitions in every evidence drawer;
- universal frozen/current clock panels on ordinary current-state pages;
- duplicate chart numeric tables that add no information;
- public internal analyst-position numeric scales;
- redundant public inventories across multiple routes;
- exact wording tests and phase/date-specific presentation locks that no longer protect a live product invariant;
- dual legacy/successor production build choreography once successor parity and migration safety are proven.

Historical files may remain clearly marked as historical/provenance when they still contain useful context. They do not regain authority by remaining in the repository.

## 11. Test doctrine

Tests protect four things:

1. **Evidence integrity** — lineage, source links, stable IDs, time semantics, unknown-vs-zero, denominator integrity, correction history.
2. **Public semantic fidelity** — the public projection does not strengthen, weaken, or misclassify canonical findings.
3. **Reader behavior** — key pages expose the intended hierarchy, drilldowns, navigation, accessibility and responsive behavior.
4. **Release integrity** — deterministic build, content addressing, manifest consistency, exact-head qualification and deployability.

Avoid tests whose sole purpose is preserving historical wording, engineer persona, phase name, or obsolete renderer structure.

## 12. Conflict precedence

When current artifacts disagree, use this order:

1. this doctrine;
2. the active lane definition in this doctrine;
3. current verified evidence and canonical state;
4. current active implementation;
5. historical/superseded documentation only for context.

The Lead owns convergence and may amend this doctrine as the product architecture materially changes.

## 13. Current convergence record

Lead convergence is tracked in GitHub issue **#70**. Existing issues **#66, #67 and #68** are active work packages under these lanes, not separate authority structures.
