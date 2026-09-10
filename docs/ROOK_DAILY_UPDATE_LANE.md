# SUPERSEDED — ROOK routine narrative update lane

**Status:** HISTORICAL / NON-BINDING
**Superseded:** 2026-09-10
**Current engineering-governance reference:** `docs/ENGINEERING_DOCTRINE.md`

The former routine lane that gave ROOK bounded authority to edit public narrative fields is retired as project governance.

ROOK is not the controlling public editor, semantic authority, or publishing authority for Atlas.

This file remains only as historical context while the Lead Public Product Engineer redesigns the update architecture.

The Lead Public Product Engineer is explicitly authorized to replace or remove:

- `config/rook-narrative-current.json` as a publishing authority mechanism;
- `scripts/sync_rook_narrative.py`;
- tests that freeze the old narrative-slot contract;
- old mutable/frozen field distinctions;
- old escalation rules;
- any dependent builder, renderer, schema, prompt, or workflow that encodes the former lane.

Useful evidence and source material should be preserved. The old lane itself does not constrain the replacement.

The successor daily-update process and engineer ownership model will be defined by the Lead Public Product Engineer in the project doctrine and lane registry described in `docs/ENGINEERING_DOCTRINE.md`.

Git history preserves the prior routine-lane instructions for historical review.
