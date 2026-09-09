# ROOK routine narrative update lane

This is the normal maintenance path after the final narrative contract was approved. It exists so routine evidence/current-state updates do **not** reopen PR/linguistics, UX/UI, and release-engineering review.

## Routine update

ROOK may edit only the mutable values in `config/rook-narrative-current.json`:

- `evidence_as_of`
- `war90_current_title`
- `war90_current_text`
- `war90_current_changed`
- `us_record_shows`
- `us_current_position`
- `iran_record_shows`
- `iran_current_position`
- `hormuz_now`

Then run:

```bash
python scripts/sync_rook_narrative.py
node tests/public-final-polish.test.js
```

Normal repository CI remains the release gate. No separate linguistics, UX, or CI-engineer signoff is required for a routine update that stays inside this contract.

## Frozen contract

ROOK must not change in the routine lane:

- `schema_version` or `contract_version`;
- module titles or taxonomy;
- **Original public benchmark → What the record shows → Current position**;
- the U.S.-entry trigger/rationale/objective distinctions;
- the non-ranking War in 90 Seconds disclaimer;
- the Hormuz **60-day interim no-charge** distinction;
- proposal-versus-agreement, leverage-versus-recognized-control, or attribution standards;
- DOM architecture, route authority, evidence schema, analytical thresholds, or stable IDs.

## Escalate only when meaning changes

ROOK stops the routine lane and flags a semantic-contract change only if the evidence requires a new proposition/category, a changed legal or agreement status, a changed attribution standard, a new route/data dependency, a schema/threshold change, or copy that cannot truthfully fit the existing slots. That is the exception path—not the daily update process.
