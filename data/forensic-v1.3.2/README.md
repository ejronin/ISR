# ISR Atlas Forensic Add-on v1.3.2 — analytical-final

**Baseline dependency:** historical integration baseline identified in `manifest.json`  
**As of:** 2026-08-21 00:40 ET  
**Scope:** targeted forensic add-on; current authoritative add-on version is v1.3.2 analytical-final. It supplements, rather than re-runs, the historical baseline integration.

This package deep-audits the additional topics requested after the baseline integration: public/open satellite imagery and strike geolocation; April F-15E/pilot-rescue/uranium claim evolution; proposition-level Iranian/IRGC claim adjudication; Iranian asset-loss cost proxies; F-5/Su-24 incident reconciliation; April Qatar-Iran contacts; the July Iran–Yemen/Mahan/Sanaa-airport chain; June ceasefire-break causality; facility-level BDA claims; and media forensics.

## Completeness boundary

The package contains **37 canonical proposition-level claim records across 13 linked claim chains**. It is a targeted forensic pass, **not yet a complete one-calendar-day-at-a-time census of every Iranian-origin statement from 2026-02-28 through 2026-08-20**. The full research specification supplied by the user is preserved verbatim in `ENGINEER-RESEARCH-PROMPT.md`. `ADD-GAP-008` and its matching collection request explicitly track the remaining day-by-day corpus-completeness sweep. Absence from this add-on must never be rendered as evidence that a claim did not occur.

## Evidence doctrine

1. **Event existence, cause, effect, and outcome are separate propositions.** Real wreckage does not prove the asserted destroyer; a real hit does not prove a shootdown; equipment loss does not prove mission failure.
2. **Claim ≠ fact.** IRGC/Press TV/Tasnim material establishes what was said or attributed unless independently corroborated.
3. **Claimant authority is explicit.** A Press TV feature, a Tasnim unnamed source, and an official IRGC/Khatam al-Anbiya communique are not interchangeable.
4. **No evidence ≠ false.** Use `UNSUBSTANTIATED` unless later evidence actually contradicts or disproves the proposition.
5. **Corrections remain visible.** Iranian-source corrections and genuine Iranian tactical successes are retained rather than hidden because they complicate a narrative.
6. **Chronology ≠ causation.** Connection-graph edges use explicit relationship types and must not manufacture intent.
7. **Coordinate ≠ BDA.** Location confidence is separate from damage confidence; facility-reference pins are not impact points.
8. **Damage ≠ incapacity.** Visible structural damage does not establish destruction of named equipment or whole-site mission kill.
9. **Cost proxy ≠ replacement quotation.** Historical acquisition values CPI-adjusted into 2026 dollars are purchasing-power proxies only.
10. **Open imagery ≠ commercially redistributable imagery.** Sentinel/Landsat/open-SAR sources may be linked/retrieved under their terms; public newsroom display of commercial imagery does not create redistribution rights.

## Canonical claim layer

`iranian-claim-evolution.json` is authoritative for proposition-level claim adjudication. Its final dispositions are restricted to the controlled vocabulary in `claim-taxonomy.json`:

`CONFIRMED`, `MOSTLY_CONFIRMED`, `PARTLY_CONFIRMED`, `UNSUBSTANTIATED`, `MISLEADING`, `FALSE_ATTRIBUTION`, `CONTRADICTED`, `FALSE`, `RETRACTED`, `CORRECTED`, `NARRATIVE_SUBSTITUTION`, `UNRESOLVED`.

The morphology tags (invented event, false attribution, inflated result, loss denial, narrative substitution, false-flag substitution, unsupported victory claim, real tactical victory overleveraged, admission latency) describe **how** a claim behaves. They are not substitute verdicts.

`claim-audits.json` is only a coarse summary/supersession bridge for four headline cases. Do not use its legacy compound labels as the canonical disposition vocabulary.

## Mandatory model case — F-15E / CSAR / Isfahan

The April 3–9 chain is intentionally decomposed rather than summarized as “Iran lied”:

**F-35 identification** → later Iranian-source correction to **F-15E**  
**possible/captured pilot reporting** → neither aviator ultimately held; both recovered  
**rescue aircraft destroyed / mission defeated** → Iranian fire did hit helicopters and U.S. equipment was genuinely lost, but independent reconstruction attributes major wreckage to U.S. destruction of disabled aircraft and the personnel-recovery objective succeeded  
**operation may have been uranium deception** → later stronger nuclear-raid/uranium narrative without corresponding new physical evidence

The package preserves the real, separately reported U.S. contingency planning to seize enriched uranium and the real uncertainty over uranium at Isfahan as **context**, not proof that this CSAR operation was that plan.

## Other high-value chains

- **Kuwait F-15 losses:** preserve Iranian causal claims separately from later U.S./Kuwaiti friendly-fire attribution.
- **Turkey missiles:** track categorical Iranian launch denials, contrary NATO/Turkish interceptions, and later false-flag framing without strengthening Araqchi's wording beyond the source.
- **March 19 F-35:** preserve a likely real hit/damage while separating it from later destruction/downing rhetoric.
- **Project Freedom boats:** exact six-hull count is `PARTLY_CONFIRMED` / `LIKELY` rather than automatically unresolved: a specific direct-participant U.S. claim materially favors occurrence, while hull/imagery/ORBAT collection remains open.
- **Indian Ocean destroyer:** official hit/fire claim remains `UNSUBSTANTIATED`; recycled RIMPAC footage is independently `FALSE` as evidence.
- **Aircraft/UAV aggregate claims:** 82 → 130 → 170 → 210 sequence remains ledgered with metric drift; genuine MQ-9 attrition prevents blanket dismissal.
- **Qatar pilots:** secret live-prisoner claim is `UNSUBSTANTIATED` and contradicted by Qatar's account; Qatar's April invitation/contact chronology remains prominent.
- **Dena and Tangsiri:** retained as **admission-latency control cases**. Delay alone is not a lie absent a specific interim denial.
- **Facility BDA:** real damage is preserved while exact-equipment destruction and whole-base incapacity require separate evidence.
- **Fake/recycled media:** tracked in `media-forensics.json`; official Iranian origin is not inferred unless provenance establishes it.

## Imagery / geospatial layer

There are **9 imagery/BDA records** plus `strike-geolocations.csv` and GeoJSON. Coordinates carry precision and confidence metadata. Current high-value records include Al Udeid, Fath, Khojir, Ashura Garrison, Ahvaz/Qasem Soleimani International Airport, and Bandar Abbas. Where an exact impact coordinate could not be defended, the record remains approximate/reference/unresolved.

## Costs

`iran-loss-envelopes.json` is the authoritative current-loss product. It separates **CONSERVATIVE EVIDENCE-SUPPORTED FLOOR**, **CENTRAL MODELED ESTIMATE**, and **ASSESSED UPPER ENVELOPE** for standing material loss/damage. The material-loss envelope is **$7.297B / $19.623B / $57.396B**. Munitions expenditure is a separate all-region accounting product at **$0.419B / $5.897B / $18.512B**. The missile-inventory upper case counts only a 50% physical-loss/damage equivalent for Reuters' mixed damaged/destroyed/buried second-third tranche; temporary inaccessibility is not priced as full loss. Reuters' drone-capability assessment is not converted into an unsupported destroyed-airframe count. The narrower **$165.3M Israel-only itemized subset** is retained only as a narrower-scope analytical subset and is not the all-region low bound. Hypothetical future repair/reconstitution spending is outside canonical current-loss accounting.

## Final dataset counts

- Sources: **136** (manifest-authoritative current source namespace)
- Canonical claims: **37**
- Claim chains: **13**
- Media-forensics records: **6**
- Imagery/BDA records: **9**
- Pilot-rescue timeline records: **14**
- Facility claim audits: **4**
- Aviation reconciliation records: **4**
- Qatar April contacts: **3**
- Yemen/Mahan records: **5**
- Ceasefire-causality records: **5**
- Asset-cost records: **4**
- Infrastructure-cost records: **4**
- Unresolved gaps / collection requests: **14 / 14**
- Connection graph: **115 nodes / 94 edges**

Run `python validate-addon.py` after extraction. No GitHub publishing is authorized by this package.

## Accepted analytical products

- `ANALYTICAL-DOCTRINE.md` — controlling inference/cost doctrine.
- `iran-loss-envelopes.json` — eight standing material-loss categories plus a separate munitions-expenditure envelope.
- `iran-leadership-casualties.json` — person-level senior Iranian leadership casualty ledger.
- `public-assessments.json` — strongest supportable public-language conclusions.
- Canonical claim and facility propositions now carry separate likelihood/confidence/inference/alternatives/change-evidence fields.


## v1.3.2 analytical-final correction

The accepted inference doctrine, leadership ledger, claim chains and public assessments are unchanged. This patch corrects only the missile/UAS inventory material-loss scope and the date-compatible munitions composition model. Temporary missile inaccessibility is not treated as 100% material loss; unsupported destroyed-UAS airframe quantities are excluded; and the Mar. 31 munitions split now derives from contemporaneous UAE, Bahrain and Israel missile/UAS counts rather than later conflict-wide depletion percentages.

Current authoritative standing material-loss envelope: **$7.297B / $19.623B / $57.396B** (conservative evidence-supported floor / central modeled estimate / assessed upper envelope). The old $1.051B-$1.204B four-asset calculation is **LEGACY PARTIAL SUBSET — ARCHIVAL / BACKWARD-COMPATIBILITY ONLY**.
