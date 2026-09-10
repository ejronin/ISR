# Privileged narrative retirement — 2026-09-10

**Status:** migration record

This note records why the former `rook-narrative-current` publication side channel can be removed without deleting unique evidence. It is not a new analytical authority and does not freeze public wording.

## Replacement rule

Public current-condition language is rendered from the accepted public read model and its canonical evidence inputs. No persona-specific configuration file supplies privileged factual conclusions or exact public copy.

The former narrative slots are decomposed into ordinary evidence-backed subjects rather than copied forward as a second narrative contract:

| Former slot | Neutral evidence/read-model replacement |
| --- | --- |
| `war90_current_title`, `war90_current_text`, `war90_current_changed` | Current chronology and material-loss records for Sep. 7–9, including `G3-US-IRAN-TANKERS-20260908`, `G3-IRAN-JORDAN-BASE-ATTACK-20260908`, `G3-HOUTHI-SAUDI-ENERGY-ATTACKS-20260908`, `G3-NEW-ANDROS-DRONE-STRIKE-20260909`, `G3-HORMUZ-MERCHANT-INCIDENTS-20260909`, `G3-HORMUZ-TRAFFIC-20260909`, and `G3-BRENT-100-20260909`. |
| `us_record_shows` | `ledger.domain_assessments`, current material-loss records, objective/outcome datasets, and the current chronology. The Sep. 8 five-tanker loss set is represented as five named durable commercial-loss records linked to `G3-US-IRAN-TANKERS-20260908`; unresolved nuclear status remains in the normal objective/evidence path rather than a narrative slot. |
| `us_current_position` | Current objective/outcome, sanctions, diplomacy and chronology records. Sep. 8 U.S. aviation sanctions are `G3-US-AVIATION-SANCTIONS-20260908`; negotiations and current diplomatic state remain in the ordinary diplomacy datasets. |
| `iran_record_shows` | Current chronology, shipping, economic and material-loss records. Jordan, Saudi/Houthi, merchant-shipping and tanker-loss developments are separately represented and retain their own attribution boundaries. |
| `iran_current_position` | Current Hormuz/shipping, diplomacy, relationship and chronology records. Coercive posture and unresolved fee/control proposals remain evidence-bounded rather than being elevated by a persona-authored summary. |
| `hormuz_now` | Current shipping record `SHIP-G3-HORMUZ-20260904` as updated through Sep. 9, `G3-HORMUZ-TRAFFIC-20260909`, merchant-incident records, and the strategic relationship records for the unresolved toll/control proposal and transit deterioration. |

## Source parity

The accepted Sep. 8–9 packets retain the source provenance behind the material that appeared in the old slots. Important examples include:

- CENTCOM on the five named Iranian crude carriers: `SRC-D1BEDB6691C0`;
- Reuters on the Jordan/Hormuz escalation: `SRC-ED2A30FC7E01`;
- Reuters on Houthi attacks in Saudi Arabia: `SRC-C4F6A08D79B0`;
- U.S. Treasury sanctions release: `SRC-381CCE77C378`;
- UK sanctions statement: `SRC-10E892578E15`;
- Reuters on merchant-vessel incidents: `SRC-9DC172E5EDB3`;
- Reuters on Hormuz traffic: `SRC-C7CC991B2C5F`;
- Reuters on Brent above $100: `SRC-FF8B40E74983`;
- Reuters on Hormuz transit costs: `SRC-0F405D5BB777`.

These remain ordinary source records. Removing the old narrative transport does not alter their bytes, provenance, chronology identity, evidence cutoff, or adjudication boundary.

## Release behavior

`scripts/retire_privileged_narrative_runtime.py` removes the obsolete embedded narrative contract from the deployable `js/public-app.js` before content addressing and signing. `scripts/build_public_release.py` invokes that transform before release manifest construction. The reader then receives current-state content from the normal public read model.

The transform is a bounded migration adapter. The long-term cleanup is to remove the dead legacy block from tracked source when the public boot/reader sources are next consolidated; production does not depend on it in the interim.
