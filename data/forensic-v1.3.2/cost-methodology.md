# Cost methodology — v1.3.2 analytical-final

## Controlling rule

A material-loss category is not left unpriced merely because no publisher printed the aggregate or no Iranian invoice is public. Use the best defensible procurement record, capability analogue, engineering model or bounded analyst composition scenario and expose the assumptions.

## Current material-loss aggregate

The authoritative additive material-loss model is in `iran-loss-envelopes.json`:

- **CONSERVATIVE EVIDENCE-SUPPORTED FLOOR:** **$7.297B**
- **CENTRAL MODELED ESTIMATE:** **$19.623B**
- **ASSESSED UPPER ENVELOPE:** **$57.396B**

These sum only NAVAL_LOSSES, AIRCRAFT, AIR_DEFENSE_RADAR, ballistic-missile LAUNCHERS, MISSILE_UAS_INVENTORY, COMMAND_C2 mission systems, FIXED_INFRASTRUCTURE civil works and INDUSTRIAL_PRODUCTION machinery/tooling. Cross-category components are separated where practical.

## Munitions expenditure

Munitions expenditure is a separate analytical stream using the same all-region scope for all three canonical bounds: **$0.419B / $5.897B / $18.512B**. The approximately **$165.3M** Israel-only itemized subset is retained separately because it is narrower in geographic scope and therefore is not the all-region low bound. Do not add expenditure mechanically to destroyed inventory or standing material loss without an explicitly defined combined scope and overlap test.


## Missile/UAS standing inventory

Reuters (`SRC-08F854FB61B7`) distinguishes three missile-stock states: about one-third certainly destroyed; another third with mixed status (damaged, destroyed, or buried/inaccessible); and a remaining share not placed in those two buckets. Reuters also says some buried or damaged missiles may be recoverable.

The canonical material-loss model therefore does **not** count the entire mixed second third as full replacement-equivalent loss:

- low/central: only the certainly destroyed one-third is monetized;
- upper: the certainly destroyed one-third plus **50% replacement-equivalent severity on the ambiguous second third**;
- the remaining ambiguous/inaccessible share is tracked as degraded/inaccessible capability and receives **$0 material-loss value** unless physical damage is established.

The 50% factor is an explicit analyst midpoint for a mixed physical-damage/inaccessibility tranche. It is not an assertion that exactly half of that tranche was destroyed.

Reuters' separate statement that roughly one-third of Iranian **drone capability** was destroyed is not a physical-airframe inventory count. The former 1,500 / 3,000 / 4,500 destroyed-UAS airframe-equivalent assumptions are removed. No destroyed-UAS inventory dollars are added until a defensible physical prewar inventory and destroyed-airframe derivation can be separated from production/facility loss. This prevents double counting against `INDUSTRIAL_PRODUCTION`.

## Munitions composition derivation

The all-region expenditure product retains one common temporal/geographic scope: **6,770 combined Iranian missile/UAS launches from Feb. 28 through Mar. 31, 2026** (`SRC-D1FD47FA9FE4`).

Date-compatible itemized composition available within that same cutoff is:

- UAE: **452 missiles** (433 ballistic + 19 cruise) and **1,977 UAVs** (`SRC-964B4BFA5400`);
- Bahrain: **182 missiles** and **400 drones** (`SRC-3F2CDE66C029`);
- Israel: **600 missiles** and **765 drones** (`SRC-D1FD47FA9FE4`).

The itemized sample therefore contains **1,234 missiles + 3,142 UAS = 4,376 launches**, leaving **2,394 launches unclassified by weapon type** within the 6,770 total.

Canonical composition cases:

- low: **1,234 missiles / 5,536 UAS** — all unclassified launches treated as the lower-cost UAS class;
- central: **1,909 missiles / 4,861 UAS** — apply the pooled itemized missile share, 1,234 / 4,376 = 28.20%, to the 2,394 unclassified launches;
- upper: **2,286 missiles / 4,484 UAS** — apply the highest missile share among the contemporaneously itemized theaters, Israel's 600 / 1,365 = 43.96%, to the unclassified launches.

CSIS (`SRC-29B47381EC59`) later states that Iran expended an estimated 30% of its missile inventory and 60% of its drone inventory **during the conflict**. The report was published after the June 15 halt and does not establish that those percentages apply specifically to the Mar. 31 cutoff. They are therefore retained as conflict-wide context and are **not used** to partition the 6,770-launch model.

## Future repair/reconstitution research — excluded from canonical accounting

Hypothetical future spending to restore or replace lost capability is not current loss, damage, or expenditure. Earlier restoration-severity research is preserved only in `research-log.md` / the archived research field in `iran-war-cost-estimate.json`; it does not enter canonical cost outputs or aggregates.

## Air defense/radar

Prewar composition comes from CSIS. Actual Iran-specific contracts anchor S-300 and Tor-M1. The rest is modeled by low/central/high capability bands because public Iranian unit procurement costs are unavailable. The campaign-level ~80% air-defense destruction assessment is a terminal-equivalent severity input, not proof that exactly 80% of every family was destroyed.

## Ballistic-missile TELs

Reuters' >335 neutralized-launcher reporting is modeled at $2M/$4M/$6M per TEL-equivalent with 60%/80%/100% replacement severity. The upper unit band is anchored to the FY2023 U.S. HIMARS recurring launcher cost (~$5.625M); low/central explicitly discount for simpler Iranian platforms. SAM launchers are not included here.

## Naval

The accepted frigate/corvette/FAC/submarine build-up is retained. Two power-projection/AFSB hulls are bounded from an Aframax merchant-hull value plus explicit conversion/mission premiums. ONI documentation supports treating the 30+ mine-laying vessels as Ashoora small-craft equivalents, not thirty large minelayers.

## Aircraft

Historical CPI proxies remain for F-14/F-4/F-5. Additional reported losses use legacy/export analogues and broad capability ranges. This is intentionally a replacement-equivalent burden for old aircraft, not a claim that Iran can buy identical replacements.

## Fixed infrastructure

Port/quay civil works use a World Bank 922m quay reconstruction project as an engineering anchor; ordinary shells use the existing Iran-local construction model. Machinery, C2 mission systems, hulls and aircraft are excluded from this category.

## Industrial production

Specialized machinery/process-line equivalents use the U.S. Army McAlester ammunition-process project as an engineering analogue, with the Iran-Russia $1.75B UAV production/technology-transfer deal used only as an upper-context check. Building shells and finished weapon inventories are excluded.

## C2

Physical C2 prices secure mission-system/operations-room/communications fitout only. Building shells are in fixed infrastructure. Bellingcat's verified command/HQ incident set provides quantity context; Patton Hall is a high-end headquarters analogue.

## Precision and confidence

No number is an audited Iranian loss account. Ranges deliberately widen as the model moves from observed hardware with contract anchors to composition/severity inference. The central value is the preferred analytical estimate; the high value is an envelope, not a point forecast.

## Legacy subtotal

The old **$1.051B-$1.204B** four-asset calculation is **LEGACY PARTIAL SUBSET — ARCHIVAL / BACKWARD-COMPATIBILITY ONLY**. It exists only in `iran-war-cost-estimate.json -> legacy_superseded_subset_snapshot` for lineage and must not be surfaced as a current total, floor, subtotal, central estimate, or upper envelope.
