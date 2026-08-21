# CODEX ADD-ON INSTRUCTIONS — FORENSIC AUDIT v1.3.2 analytical-final

## Authority and scope

1. Read `README.md`, `addon-summary.md`, `integration-bridge.json`, `claim-taxonomy.json`, `iranian-claim-evolution.json`, `claim-chain-index.json`, and all other JSON files before coding.
2. This **v1.3.2 analytical-final** package supplements the historical baseline integration artifact identified in `manifest.json`. Do not re-run research, replace the baseline integration, or silently overwrite unrelated baseline adjudications.
3. `iranian-claim-evolution.json` is the canonical proposition-level claim dataset. `claim-audits.json` is a coarse summary/supersession bridge only.
4. `ENGINEER-RESEARCH-PROMPT.md` is the user-supplied completeness specification for the later day-by-day Iranian-source corpus pass. The current package contains 37 canonical claims across 13 chains and explicitly records the remaining completeness gap. Do not render an unaudited day as “no Iranian claim.”
5. Do not publish, commit, or push until the user explicitly authorizes it.

## Controlled claim dispositions

Canonical claim `final_disposition` values and proposition-level dispositions must use only:

- `CONFIRMED`
- `MOSTLY_CONFIRMED`
- `PARTLY_CONFIRMED`
- `UNSUBSTANTIATED`
- `MISLEADING`
- `FALSE_ATTRIBUTION`
- `CONTRADICTED`
- `FALSE`
- `RETRACTED`
- `CORRECTED`
- `NARRATIVE_SUBSTITUTION`
- `UNRESOLVED`

`claim-taxonomy.json` morphology tags are analytical descriptors, **not alternate verdicts**.

## Claim-card rendering

For every canonical claim, render the logic as:

**CLAIM**  
Exact claimant, claimant type, date/time precision, and translated claim.

**WHAT IS VERIFIED**  
Only independently supportable event/effect propositions.

**WHAT IS NOT VERIFIED / CONTRADICTED**  
Causal/effect/outcome propositions that remain unsupported or conflict with later evidence.

**DISPOSITION**  
Controlled vocabulary only.

**WHY**  
Short analyst note distinguishing event existence, cause, effect and outcome.

**SOURCES**  
Claim-origin sources and corroborating/counterevidence visibly separated.

Do not use editorial UI language such as “Iran lied.” The intended public tone is: **Here is what was claimed; here is what can be demonstrated; here is where they diverge; inspect the evidence yourself.**

## Claim-chain / narrative-evolution implementation

- Import all 37 records from `iranian-claim-evolution.json`.
- Import all 13 chains from `claim-chain-index.json`.
- Follow `previous_claim_id` / `next_replacement_claim_id` links when present.
- Use `connection-graph.json` to expose causal/contextual relationships without inventing deceptive intent.
- A state-media correction is a first-class event and must remain visible.
- Genuine Iranian successes and genuine U.S./allied losses must remain visible even when a stronger Iranian proposition is contradicted.
- Do not infer official IRGC/Iranian-government authorship for recycled, AI-generated, or miscaptioned social media unless `media-forensics.json` establishes provenance.
- Dena and Tangsiri are admission-latency control cases. Delay alone must not be labeled a lie absent a specific contradictory statement.

## Mandatory model case — F-15E / pilot rescue / Isfahan / uranium

Build the sequence from `pilot-rescue-timeline.json` and the `CH-F15E-CSAR-URANIUM` chain.

Keep these propositions separate:

1. **Aircraft type:** initial Iranian F-35 identification → Iranian-source correction to F-15E.
2. **Capture:** possible/captured-pilot reporting → later no confirmed Iranian custody; both F-15E aviators recovered.
3. **Kinetic contact:** Iranian fire did hit rescue helicopters.
4. **Equipment loss:** U.S. aircraft/equipment were genuinely lost.
5. **Loss mechanism:** independent reconstruction attributes the disabled MC-130s and additional equipment destruction to U.S. deliberate denial after mechanical/operational problems; do not automatically credit the wreckage to Iranian kinetic destruction.
6. **Mission outcome:** the personnel-recovery objective succeeded; “the entire rescue failed” must be adjudicated separately from individual failed attempts/equipment losses.
7. **Uranium pivot:** preserve Baghaei's initial speculative “could have been” language, then show later stronger state-media assertions as separate claims.
8. **Context:** real U.S. uranium-seizure contingency planning and likely uranium presence at Isfahan are contextual facts. They do not establish that this particular CSAR package was a uranium-seizure mission.

The UI may visualize this as an outcome-preserving narrative substitution chain **only to the extent supported by the linked claims**. Do not infer subjective intent.

## Imagery / BDA / geospatial layer

- Add all 9 `imagery-index.json` records.
- Import `strike-geolocations.geojson` and preserve `coordinate_precision`, `location_confidence`, and `damage_confidence` independently.
- Exact strike/damage point ≠ facility reference. Render them differently.
- Coordinates corroborate location only; they are not themselves BDA.
- Do not turn Al Udeid subfacility damage into whole-base incapacity.
- Preserve attribution qualifiers such as `US_ISRAEL_COMBINED_CAMPAIGN`; do not relabel as a U.S.-specific strike without a U.S.-specific source.
- Open Sentinel/Landsat/Umbra/ICEYE/Capella resources may be linked/retrieved subject to source terms. Public commercial Planet/Vantor/Maxar newsroom imagery is link-only unless separately licensed.

## Facility claim audit

Import all 4 records from `facility-claim-audits.json`. A verified hit at a base does not automatically validate:
- destruction of the named radar or weapon system;
- destruction of all aircraft/fuel/storage claimed;
- whole-base shutdown or mission kill.

Show `actual hit → exact equipment claim → mission-effect claim` as separate evidentiary layers.

## Aviation reconciliation

Import all 4 records in `aviation-reconciliation.json`.
Do not merge:
- F-5 aircraft destroyed on the ground at Tabriz;
- the Camp Buehring F-5 mission claimants who later appeared alive on state TV;
- U.S. strikes on other F-5s at Ahvaz;
- Qatar's shootdown of two Iranian Su-24s.

Aggregate UAV/aircraft kill claims require serial-by-serial reconciliation before assigning a clean cumulative confirmed total. Metric drift (`downed`, `hit`, `targeted`) must remain visible.

## Qatar April diplomacy

Import `QAT-APR-001` through `QAT-APR-003`. Official Qatari readouts state Araghchi called Qatar on Apr. 6, Apr. 13 and Apr. 26. Do not reverse the initiator. Connect this chronology to the later Qatar-pilot dispute where relevant.

## Yemen / Mahan / Sanaa airport

Import `YEM-001` through `YEM-005` and preserve the separate evidence nodes:
- Mahan/flight event;
- Yemeni-government stated rationale for runway attack;
- HRW satellite-based attribution to Yemeni government forces in coalition with Saudi Arabia;
- Reuters multisource allegation about IRGC personnel/components;
- Iranian/Houthi denial.

Do not compress those into “Saudi admitted bombing an airport because IRGC commanders were aboard.”

## Ceasefire causality

Import `CF-001` through `CF-005`.
Render two distinct conclusions:
- `first_direct_Iran_to_Israel_fire_since_April = CONFIRMED`
- `first_violation_of_entire_ceasefire = NOT_ESTABLISHED / SCOPE_CONTESTED`

June 7 Iranian launches must be shown with the preceding Beirut strike and disputed Lebanon ceasefire scope. Do not invent a live-TV admission; the exact primary-source interview remains a collection item; current analytical disposition is `UNSUBSTANTIATED`, not automatically `UNRESOLVED`.

## Cost model

- Import all 4 asset records and 4 infrastructure records.
- Label CPI conversions **2026 CPI purchasing-power proxy**, never replacement cost.
- **Current authoritative standing material-loss model:** $7.297B **CONSERVATIVE EVIDENCE-SUPPORTED FLOOR** / $19.623B **CENTRAL MODELED ESTIMATE** / $57.396B **ASSESSED UPPER ENVELOPE**. Munitions expenditure is a separate accounting product.
- Keep attribution visible; this subset mixes U.S.- and Israeli-attributed losses.
- The completion pass has constructed bounded proxies for every canonical Iran material-loss category. Do not reintroduce `PENDING_ESTIMATE` for these release-side categories merely because item-level invoices are unavailable; preserve the disclosed scenario assumptions instead.
- Specialized contents, tooling, tunnels, missile stocks, docks and industrial machinery need separate pricing evidence.
- If future damage polygons are measured, `construction_shell_model` is shell-only and must not be used to price specialized contents.

## Connection graph

Use `connection-graph.json` as the factual “corkboard” layer. Supported relationships include contextual, chronological, contradiction, correction, conflation and corroboration edges. Do not convert proximity or sequence into causation. A true but unrelated event is not counterevidence.

## Source integrity

- Preserve URL-derived stable `SRC-*` IDs.
- Keep claim-origin, official, independent, regional, physical/satellite and fact-check roles distinct.
- State media is evidence of what was published or attributed; it is not self-corroboration.
- Do not strengthen source language. Example: generic Iranian warnings about false-flag actions by “enemies” must not be rewritten as a specific accusation against Israel unless the cited statement names Israel.
- Never collapse a Press TV feature, Tasnim unnamed source and official IRGC/Khatam al-Anbiya statement into a single authority level.

## Current canonical counts

- Sources: 136
- Canonical claims: 37
- Claim chains: 13
- Coarse claim audits: 4
- Media forensics: 6
- Imagery/BDA: 9
- Pilot-rescue timeline: 14
- Facility claim audits: 4
- Aviation records: 4
- Qatar contacts: 3
- Yemen records: 5
- Ceasefire records: 5
- Asset/infrastructure cost records: 4 / 4
- Gaps/requests: 14 / 14
- Graph: 115 nodes / 94 edges

## Acceptance tests

Reject implementation if any of these occur:

- unsupported claim is promoted to `FALSE` solely because evidence is absent;
- distinct event/cause/effect/outcome propositions are collapsed;
- a claim source is counted as independent corroboration of itself;
- Iranian corrections or genuine Iranian tactical successes are omitted;
- U.S./Israeli/GCC claims are treated as automatically authoritative;
- U.S. self-destruction of disabled equipment is attributed to Iranian kinetic action without supporting evidence;
- viral fake media is represented as an official Iranian claim without provenance;
- facility-level real damage validates every exact-equipment or whole-base claim;
- exact-looking coordinates are invented where the record says reference/approximate/unresolved;
- F-5 and Su-24 incidents are conflated;
- a real uranium contingency plan becomes proof this rescue was a uranium raid;
- June 7 is simplified into “Iran certainly broke the entire ceasefire first”;
- a cost range is surfaced without its source basis, composition/severity assumptions, exclusions, or overlap/additivity flag;
- unaudited days in the Iranian corpus are rendered as “no claim.”

Run `python validate-addon.py` after extraction and require PASS before handoff.


## Superseding inference and cost doctrine

Read `ANALYTICAL-DOCTRINE.md` before implementation. Persist `analytic_likelihood`, `analytic_confidence`, `inference_basis`, `credible_alternatives`, and `evidence_that_would_change_assessment` separately from controlled disposition. Consume `iran-loss-envelopes.json`, `iran-leadership-casualties.json`, and `public-assessments.json` as authoritative add-on products. Do not map every inferential proposition to UNKNOWN.


## Cost-model authority — v1.3.2 analytical-final

Codex must treat `iran-loss-envelopes.json` as the authoritative cost/accounting product.

### Standing material loss / damage
- **CONSERVATIVE EVIDENCE-SUPPORTED FLOOR:** **$7.297B**
- **CENTRAL MODELED ESTIMATE:** **$19.623B**
- **ASSESSED UPPER ENVELOPE:** **$57.396B**
- These values cover standing material lost, destroyed, or damaged as of the analytical cutoff.
- Preserve category-level evidence-basis distinctions; the low envelope is not synonymous with imagery-confirmed or directly observed.
- In `MISSILE_UAS_INVENTORY`, temporary burial/inaccessibility is not full replacement-equivalent loss, and no destroyed-UAS airframe quantity is monetized without a documented physical-inventory derivation.

### Munitions expenditure — separate accounting product
- **All-region low / central / high:** **$0.419B / $5.897B / $18.512B**
- All three bounds use the same all-region scope through Mar. 31 and the date-compatible composition derivation in `iran-loss-envelopes.json`. Do not use the later CSIS 30% missile / 60% drone conflict-wide depletion estimate to partition the Mar. 31 launch total.
- The approximately **$165.3M Israel-only itemized subset** is narrower in scope and is not the all-region low bound.
- Do not combine munitions expenditure with standing material loss or destroyed inventory without an explicitly defined combined accounting scope and overlap test.

### Excluded from canonical current-loss accounting
- Hypothetical future repair/reconstitution spending is not current material loss, damage, economic loss, or expenditure and must not be surfaced as a canonical cost field.

### Legacy
The **$1.051B-$1.204B** four-asset calculation is **LEGACY PARTIAL SUBSET — ARCHIVAL / BACKWARD-COMPATIBILITY ONLY**. It survives only inside `iran-war-cost-estimate.json -> legacy_superseded_subset_snapshot`. Never surface it as a current subtotal, total, floor, central estimate, or upper envelope.

The eight standing material-loss categories and separate munitions-expenditure category now carry completed bounded values. Preserve their disclosed analogue/composition/severity assumptions instead of collapsing them to unknown.
