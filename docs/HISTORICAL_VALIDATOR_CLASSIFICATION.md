# Historical Validator Classification

**Status:** Release Integrity reference
**Issue:** #98
**Authority:** subordinate to `docs/ENGINEERING_DOCTRINE.md`

This file records why presentation-era validators were removed from **current** release qualification. It does not convert them into factual authority. Historical files remain repository/audit context unless a current invariant explicitly depends on them.

## Classification rule

Each historical-looking validator was classified by the invariant it actually protected:

- **CURRENT EVIDENCE / DATA** — preserve in a durable evidence regression or current canonical/public validator.
- **CURRENT READER / RUNTIME** — preserve in current public/browser qualification.
- **HISTORICAL AUDIT** — retain in-repository when it still has forensic/migration value, but do not run as current product authority.
- **RETIRED PRESENTATION IMPLEMENTATION** — remove from default qualification.

## Extracted evidence protections

`tests/evidence-semantic-edge-regressions.test.py` now owns the small set of useful evidence protections that were previously trapped inside presentation-era scripts:

- occurrence date versus first-report date for the Aug. 25 Kpler record;
- Hormuz finality remaining unresolved where the evidence did not establish finality;
- promoted strike/BDA coordinate lineage, source support and limitations;
- unresolved U.S./Israeli attribution for the Ashura/Fath/Khojir damage records;
- linked unresolved Hormuz count discrepancy records;
- selective passage not being upgraded into legal sovereignty;
- Oman-Iran channel remaining active/unresolved at the recorded cutoff;
- announced/scheduled sanctions not being rewritten as enacted;
- unsupported precise coordinates remaining absent for the relevant current events;
- Al Udeid physical damage versus subfacility operational-effect distinction;
- Ain al-Asad withdrawal remaining distinct from destruction/unknown status;
- accepted maritime-loss denominator excluding claim-only/near-miss vessels;
- source-registry exhaustiveness for the authoritative integration namespace.

These are factual/evidentiary regressions. They deliberately do **not** assert historical loader chains, CSS selectors, navigation structure, phase names, exact public prose, or archived renderer strings.

## Validator disposition

### Aug. 25–27 current-update validators

Examples:

- `scripts/validate_aug25_late.py`
- `scripts/validate_aug26_strike_map.py`
- `scripts/validate_aug27_update.py`
- syntax checks for `js/current-update-20260826.js`, `js/current-update-20260827.js`, `js/iran-messaging-shifts-20260827-r1.js`
- `tests/browser-aug27-messaging-smoke.js`

**Disposition:** MIXED -> evidence extracted; presentation/loader contract retired from current CI.

The useful evidence semantics are covered by the durable edge-regression test and current canonical/public qualification. Historical append-only loader choreography and exact messaging-renderer strings are no longer current product contracts.

### Aug. 22/full-scope/forensic-v1.3.2 validators

Examples:

- `scripts/validate_aug22_update.py`
- `scripts/validate_full_scope.py`
- `data/forensic-v1.3.2/validate-addon.py`
- `tests/full-scope-20260822.test.js`
- `tests/aug22-update.test.js`
- `tests/forensic-v1.3.2.test.js`

**Disposition:** MIXED / HISTORICAL AUDIT.

Live factual edge cases were extracted where still unique. Workspace navigation, old source-bias UI, historical zoom/control text, old exact assessment prose, and phase-specific renderer requirements are not current release authority.

### ENDGAME / Aug. 23 public UX / public-record / Mermaid / legibility validators

Examples:

- `scripts/validate_endgame_page.py`
- `scripts/validate_endgame_public_view_r1.py`
- `scripts/validate_endgame_ux_plain_language_r1.py`
- `scripts/validate_public_ux_20260823.py`
- `scripts/validate_ui_endgame_mermaid_r1.py`
- `scripts/validate_workspace_ux_plain_language_r1.py`
- `scripts/validate_status_identity_r1.py`
- `scripts/validate_site_legibility_r3.py`
- `scripts/validate_final_mermaid_oil_routes_r1.py`
- corresponding ENDGAME/public-record/UI tests and historical JS syntax checks

**Disposition:** RETIRED PRESENTATION IMPLEMENTATION / HISTORICAL AUDIT.

These files primarily assert retired navigation modules, old CSS, Mermaid implementation details, old layout structure and exact historical labels. They may remain useful for archaeology but do not qualify the current reader product.

### Wikipedia reconciliation validator

- `scripts/validate_wiki_reconciliation.py`

**Disposition:** HISTORICAL AUDIT with selected evidence denominator protections extracted.

The reconciliation package remains useful provenance for how candidates were accepted/rejected. Current canonical/public generation and evidence-integrity qualification now own production semantics. Named maritime loss edge cases remain protected by the durable evidence regression.

### Historical integration validator

- `scripts/validate_integration.py`

**Disposition:** HISTORICAL AUDIT / MIXED.

It contains useful historical package checks but also requires retired root-application modules and legacy HTML. Current canonical authority/update tests and the new edge-regression test preserve live evidence meaning. The old UI wiring assertions are retired.

### Old build-info-current validator

- `scripts/validate_build_info_current.py`

**Disposition:** SUPERSEDED CURRENT/HISTORICAL MIX.

Current release assembly, `write_build_info.py`, runtime inventory validation, public deployment validation and exact-SHA site qualification own release identity. Exact historical overlay-manifest membership/count assertions are not required to qualify the current v2 release.

### Legacy UX/static validation

- `scripts/validate_ux.py`
- historical portions of `scripts/validate.py`
- `tests/presentation.test.js` where it tests retired `js/presentation.js` freshness/root-runtime behavior

**Disposition:** presentation-era portions retired; current static/security responsibilities retained in current-only validation and current public/browser tests.

No current release gate should require `legacy/phase1-public-runtime-reference.html`, `js/app.js`, `js/navigation.js`, historical workspace CSS/JS, or old Current Picture structures merely to qualify the signed current public release.

## Current qualification boundary

Current PR qualification should protect only:

1. canonical evidence/authority and accepted update integrity;
2. durable evidence semantic regressions;
3. deterministic current-v2 public projection and signed release assembly;
4. current reader/browser/accessibility behavior;
5. privacy/security/static-site requirements;
6. exact-head release/deployment integrity.

Historical validators may be run manually for archaeology or migration review. A failure in a historical presentation validator is not, by itself, a current release failure.
