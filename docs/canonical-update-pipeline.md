# Canonical evidence update pipeline

Phase 3.5 establishes one maintenance path:

`small update packet → validate/preview → register after approval → compile canonical current state → build public read model → sign release`

The browser receives only `data/public-current-state.json`. It never downloads or replays update packets. The sealed Phase 3 packages remain immutable, accepted packets are append-only, and generated current-state files are non-authoritative.

## File roles

- `data/canonical-ledger/manifest.json` lists the sealed pre-boundary inputs and accepted post-migration packets in deterministic order. Every accepted entry stores its packet hash, immutable `known_at`, prior-lineage digest and resulting lineage digest.
- `data/canonical-ledger/migration-boundary.json` records 98 normalized SHA-256 values: 59 canonical evidence-package/reconciliation files, 36 forensic source-namespace files, the migration actor authority, the generated source registry, and the immutable snapshot inventory. This is a different inventory from the former 99-input public-read-model inventory; neither count implies a missing canonical input.
- `data/canonical-ledger/migration-actors.json` formalizes the accepted Phase 3 actor/person/affiliation identities.
- `data/canonical-updates/*.json` contains small update packets. A packet becomes authoritative only after review, `status: "ACCEPTED"`, and transactional registration in the manifest.
- `data/canonical-current-state.json` is an ignored, deterministic compiler artifact. It contains stable current events, sources, actors, locations, claims, material losses, relationships and field-level revisions.
- `data/public-current-state.json` remains the ignored public read model. It is generated from canonical current state rather than from dated overlays.

The boundary file and migration actor registry are independently digest-pinned in `scripts/canonical_authority.py`. Authority validation also compares the other 97 sealed inputs directly with accepted Phase 3 commit `b6dabf7d9dc346a81afc9ba4a9074c481e70e02a`. Changing an input and editing its stored seal hash therefore still fails. Normal evidence-update CI compares the prior manifest to the proposed manifest and requires the prior accepted sequence to remain an exact prefix.

Stable IDs use existing event/source/claim/loss IDs and the formalized `ACT-*` and `LOC-*` namespaces. Clarifying a record updates that ID; it does not create an `-v2` entity.

## Packet format

Packets conform to `schemas/canonical-update-packet-v1.json`:

```json
{
  "schema_version": "1.0",
  "packet_id": "UPD-20260829-001",
  "status": "DRAFT",
  "known_at": "2026-08-29T10:15:00-04:00",
  "summary": "Clarify the time and attribution of an existing event.",
  "operations": [
    {
      "operation_id": "CLARIFY_EVENT",
      "op": "update_event",
      "entity_id": "EVT-1042",
      "changes": {
        "event_time": { "previous": null, "new": "03:42" },
        "actor_ids": { "previous": ["ACT-IRAN"], "new": ["ACT-IRGC-NAVY"] }
      },
      "revision": {
        "revision_type": "attribution_clarification",
        "reason": "The newly added source identifies the responsible institution and occurrence time.",
        "effective_at": "2026-08-18T03:42:00-04:00",
        "supporting_source_ids": ["SRC-XXXXXXXXXXXX"],
        "analytical_meaning_changed": false
      }
    }
  ]
}
```

Every update states the prior value and replacement value. Stale prior values fail validation. Every mutation retains its packet, operation, changed field, prior/new values, occurrence/effective time, learned time, revision class, reason, sources and analytical-meaning flag. The compiler records these facts; it does not infer contradiction, concession, motive, victory, defeat or other analytical conclusions.

Supported operations are `add_*` and `update_*` for events, sources, actors, locations, claims and material losses, plus `link_source` and `add_relationship`.

## Add a new event

Add any new source, actor or location first in the same packet, then use `add_event`. Supply a stable event ID, occurrence date/time and precision, `actor_ids`, `location_ids`, `source_ids`, and supported factual fields. The chronology count is derived automatically.

## Add a source

Use `add_source` with a `SRC-` ID and the approved metadata available: publisher/outlet, title, URL, publication timestamp, retrieval timestamp, source type, context and reliability metadata. Future events reference the ID. A non-conflicted source URL/time correction is made once with `update_source`; all current consumers resolve the corrected record while the old value remains in revision/provenance history. If a source ID has conflicting package-scoped variants, `update_source` must include the exact `variant_key`. A targeted correction changes only that variant and never creates a global winner.

## Correct a date/time

Use `update_event` on the existing stable event ID. Change `event_date`, `event_time` and/or precision explicitly. Put when the event occurred in `effective_at`; packet/operation `known_at` records when Atlas learned the clarification. Never create a duplicate event merely to improve its time.

## Clarify an actor

Use `add_actor` when the approved evidence introduces a new identity, then update the event's `actor_ids`. A person record carries a supported role and optional `affiliation_id`; affiliation, not role, controls identity/flag treatment. Unresolved affiliation remains unresolved—never infer it from a name.

## Correct a location

Use `update_location` on the stable `LOC-*` ID. Coordinates must be explicit, paired and in range; unknown stays `null`. Events reference the location ID, so every downstream consumer receives the corrected name/coordinates without page edits.

## Revise evidence

Use `update_claim`, `update_material_loss`, `link_source`, or `add_relationship` with explicit approved instructions and sources. Select the specific revision class. The compiler never converts a factual change into a new analytical verdict on its own.

## Run validation

```bash
python scripts/build_canonical_current_state.py --validate-packet data/canonical-updates/UPD-YYYYMMDD-NNN.json
python scripts/validate_canonical_authority.py
python tests/canonical-update-pipeline.test.py
python tests/canonical-authority.test.py
python scripts/validate_canonical_update_pipeline.py
```

Validation rejects duplicate IDs, stale previous values, malformed timestamps/IDs/coordinates, unresolved links, invalid operations, missing revision provenance, modified sealed inputs and modified accepted packet hashes. A numeric zero is retained only when explicitly supplied in a sourced operation; no unknown value is coerced to zero.

## Preview changes

```bash
python scripts/build_canonical_current_state.py --preview data/canonical-updates/UPD-YYYYMMDD-NNN.json
```

Preview does not write any file. Its deterministic report lists records added/changed, field-level previous/new values, source links, unresolved references, exact duplicate/collision warnings, new cutoff and new chronology count. Failed previews return a structured `errors` and `unresolved_references` report while remaining non-writing. Similar-looking records are never fuzzy-merged.

## Publish after approval

After human approval, change the packet status to `ACCEPTED`, then run:

```bash
python scripts/build_canonical_current_state.py --register data/canonical-updates/UPD-YYYYMMDD-NNN.json
python scripts/build_canonical_current_state.py
python scripts/build_canonical_current_state.py --check
python scripts/validate_canonical_update_pipeline.py
python scripts/build_public_current_state.py
python scripts/build_public_current_state.py --check
python scripts/validate_public_current_state.py
python scripts/build_public_release.py
python scripts/build_public_release.py --check
python scripts/validate_public_deployment.py
```

`--register` validates the packet against accepted state before appending its normalized SHA-256 to the manifest. It refuses duplicate packet IDs/paths and never rewrites an existing accepted packet. A correction to an accepted packet is a new packet.

Accepted packet `known_at` values must be strictly increasing; equal or earlier timestamps are rejected before any manifest write. Registration compiles the complete candidate manifest in memory, verifies the lineage chain and exact-prefix extension, then performs the same-directory atomic replace. Failed registration leaves the accepted manifest and generated canonical state byte-for-byte unchanged.

Do not rerun `--seal-migration-boundary`; resealing is permanently disabled after the authority anchor, even if the boundary file is deleted. Do not add another dated frontend loader, overlay or presentation script.
