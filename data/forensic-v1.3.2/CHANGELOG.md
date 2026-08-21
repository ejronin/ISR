# Changelog — v1.3.2 analytical-final

Narrow analytical correction only. Accepted leadership, claim adjudication, inference doctrine, naval/aircraft/C2/fixed-infrastructure work, public assessments, and UX instructions were not reopened.

- Corrected `MISSILE_UAS_INVENTORY` so Reuters' mixed second-third category (damaged, destroyed, or buried/inaccessible) is no longer counted as 100% replacement-equivalent material loss.
- Upper missile-inventory case now counts the certainly destroyed third plus a 50% physical-loss/damage-equivalent severity factor on the ambiguous second third; temporary inaccessibility itself is excluded from material-loss dollars.
- Removed the unsupported 1,500 / 3,000 / 4,500 destroyed-UAS airframe-equivalent assumptions from canonical material accounting. Reuters' one-third drone-capability assessment is retained as capability evidence, not converted into an invented physical-airframe count.
- Revised `MISSILE_UAS_INVENTORY` to $208.25M / $4.251B / $24.000B.
- Recalculated standing material loss to $7,296,811,473 / $19,622,936,668 / $57,395,962,730.
- Replaced the Mar. 31 munitions composition partition. The later CSIS 30% missile / 60% drone conflict-wide depletion estimate is no longer used to split the 6,770-launch cutoff.
- Added date-compatible composition inputs: UAE 452 missiles + 1,977 UAVs; Bahrain 182 missiles + 400 drones; Israel 600 missiles + 765 drones.
- Canonical 6,770-launch cases are now 1,234/5,536; 1,909/4,861; and 2,286/4,484 missiles/UAS.
- Recalculated separate munitions expenditure to $419.220M / $5.897135B / $18.512200B.
- Added validator checks against automatic full-loss treatment of buried/inaccessible missiles, unsupported UAS airframe quantities, and munitions composition assumptions lacking documented derivation and compatible temporal scope.
- Added two date-compatible official/regional source records; source namespace is now 136.

---

# Changelog — v1.3.1 analytical-final

Analytical correction pass only. No accepted claim, leadership, inference, or source research was reopened.

- Removed the hypothetical future repair/reconstitution scenario from canonical current-loss accounting, summaries, bridge, Codex-facing instructions, and validation requirements. Its prior 15%/30%/50% model survives only in `research-log.md` as archived research lineage.
- Confirmed that removing that non-additive scenario does not change the standing material-loss arithmetic.
- Replaced the low material-loss label with **CONSERVATIVE EVIDENCE-SUPPORTED FLOOR** and standardized the material envelopes as:
  - low: $7,326,811,473
  - central: $19,772,936,668
  - upper: $66,264,462,730
- Changed the material aggregate status to `CALCULATED_BOUNDED_MATERIAL_LOSS_ENVELOPE`.
- Corrected the all-region munitions-expenditure envelope to a common 6,770-launch scope:
  - low: $307,900,000
  - central: $4,017,325,000
  - upper: $14,648,500,000
- Retained the approximately $165.3M Israel-only itemized subset separately; it is not the all-region low bound.
- Kept standing material loss/damage, destroyed inventory, and intentionally expended weapons as separate accounting products unless an explicit overlap-tested combined scope is later defined.
- Rebuilt `integration-bridge.json` so the current loss envelope, separate munitions envelope, person-level leadership ledger, proposition/claim layer, and `SRC-*` namespace have explicit authority.
- Relabeled the $1.051B-$1.204B four-asset calculation **LEGACY PARTIAL SUBSET — ARCHIVAL / BACKWARD-COMPATIBILITY ONLY**.
- Corrected authoritative package identity to **v1.3.1 analytical-final** and removed stale package-version headers.
- Reconciled current counts to **134 sources / 14 unresolved gaps / 14 matching research requests / 11 leadership records**.
- Updated `validate-addon.py` to enforce the corrections above.
