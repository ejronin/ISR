# Gate 3 v2 packet registration and temporal authority

Gate 3 v2 accepted evidence is append-only. `data/canonical-ledger/manifest-v2.json` is the authoritative registry for post-Gate-2 v2 packets, and accepted packet contents remain immutable evidence inputs.

Cross-field and cross-entry time semantics are owned by one production module: `scripts/canonical_temporal_contract.py`. The registrar and canonical consumer call that same authority. Schemas enforce timestamp structure/format; they do not independently redefine temporal relationships.

## Production entry point

Routine registration and tests use the same production function:

```python
from pathlib import Path
from gate3_v2_registration import register_v2_packet

register_v2_packet(Path("."), "data/canonical-updates/UPD-YYYYMMDD-NAME.json")
```

CLI equivalents:

```bash
python scripts/gate3_v2_registration.py --verify
python scripts/gate3_v2_registration.py --register data/canonical-updates/UPD-YYYYMMDD-NAME.json
```

A newly registered packet must conform to `schemas/canonical-update-packet-v2.json` and carry `status: "ACCEPTED"`. `DRAFT` and `REVIEWED` packets are not authoritative.

## Canonical temporal model

Atlas has multiple clocks. They are deliberately not interchangeable.

| Clock / field | Class | Authoritative meaning |
| --- | --- | --- |
| `event_date`, `event_time` | observation/event chronology | When the represented event occurred. Historical events may be learned much later. |
| source `published_date` | publication chronology | When a source says it was published. It is source metadata, not packet authority order. |
| `public_available_time` | publication/availability chronology | When evidence became publicly available. It may lag the event and precede Atlas knowledge. |
| `game_knowledge_time`, record-level `knowledge_time` | knowledge chronology | When the represented fact/assessment became known to the Atlas/game record. It is not the evidence horizon. |
| packet `known_at` | knowledge chronology / authority eligibility | The canonical knowledge-effective time at which the accepted packet becomes eligible to affect Atlas current state. It is **not** Git commit time, CI time, or registrar wall-clock acceptance time. |
| packet `evidence_cutoff` | evidence chronology | The inclusive collection/evidence horizon represented by that packet review. It is **not** the latest event date, latest source publication timestamp, `known_at`, or registration time. |
| manifest `gate2_evidence_cutoff` | frozen historical boundary | The sealed Gate 2 evidence boundary. It never moves. |
| manifest `current_evidence_cutoff` | derived current-state horizon | The evidence horizon derived from the accepted v2 lineage. Because accepted evidence horizons cannot regress, it equals the accepted tip's `evidence_cutoff`. |
| release `current_osint_cutoff` | derived current-state horizon | Downstream name for the same derived horizon as `current_evidence_cutoff`; it is not a knowledge clock. |
| build `collection_cutoff` / legacy `current_review_cutoff` | derived current-state horizon | Deployment/build projections of `current_osint_cutoff`. `current_review_cutoff` is legacy naming and must not be used as packet knowledge/acceptance time. |
| registration/acceptance wall clock | authority/registration chronology | Operational time at which registration runs. It is semantically distinct and is not currently persisted as a canonical timestamp. `acceptance_basis` records authority basis, not time. |

### Authoritative invariants

1. Every canonical timestamp used by the v2 temporal contract must be valid ISO-8601 with an explicit UTC offset.
2. Within one packet, `evidence_cutoff <= known_at`. Equality is valid. Reporting/collection lag (`evidence_cutoff < known_at`) is first-class and valid.
3. `evidence_cutoff > known_at` is invalid: a packet cannot claim an evidence horizon later than the point at which that packet becomes knowledge-effective.
4. Across accepted lineage, `known_at` increases **strictly**. Equal or decreasing values would constitute historical insertion/backdated authority.
5. Across accepted lineage, `evidence_cutoff` is **non-decreasing**. It may advance or remain equal; it may never regress.
6. `current_evidence_cutoff` is derived from the accepted lineage tip. It is not derived from `known_at` and cannot be substituted for it.
7. The resulting current evidence horizon may never precede frozen `gate2_evidence_cutoff`. The migrated pre-registrar prefix itself may contain earlier cutoffs while it approaches the frozen boundary; those entries are independently pinned and are not rewritten.
8. Event/publication/record-knowledge clocks preserve their own chronology. They do not control accepted packet ordering unless a specific contract explicitly says so.
9. Registration is transactional. Any temporal, schema, lineage, packet-hash, consumer-dry-run, or atomic-write failure leaves the authoritative manifest byte-for-byte unchanged.

### Examples

**Ordinary update**

```text
evidence_cutoff = 2026-09-10T18:00:00-04:00
known_at        = 2026-09-10T18:00:00-04:00
```

Valid. Evidence horizon and knowledge-effective time coincide.

**Delayed knowledge**

```text
evidence_cutoff = 2026-09-07T23:59:59-04:00
known_at        = 2026-09-09T09:29:59-04:00
```

Valid. The review covers evidence through Sep. 7; the packet becomes knowledge-effective on Sep. 9. The current evidence horizon becomes Sep. 7 if this append advances the previous horizon.

**Late-arriving historical evidence**

Assume the accepted current evidence horizon is already Sep. 10. On Sep. 11 Atlas discovers credible Sep. 8 evidence. Do **not** backdate `known_at`, mutate the Sep. 8 packet, or set the new packet's evidence horizon back to Sep. 8. A legal representation is:

```text
event/source time = 2026-09-08...
evidence_cutoff    = 2026-09-10...   # horizon maintained
known_at           = 2026-09-11...   # new knowledge
```

The historical timestamp lives on the event/source. The packet records when Atlas learned it. The evidence horizon stays non-regressing. If the same review genuinely advances collection beyond Sep. 10, its `evidence_cutoff` may advance as well, provided it remains `<= known_at`.

**Invalid future evidence relationship**

```text
evidence_cutoff = 2026-09-12T00:00:00-04:00
known_at        = 2026-09-11T23:00:00-04:00
```

Invalid because the packet asserts an evidence horizon after its own knowledge-effective time.

## Temporal comparison audit

The production audit classified temporal comparisons as follows:

- **Evidence chronology:** packet `evidence_cutoff`, manifest `current_evidence_cutoff`, Gate 2 boundary, and release `current_osint_cutoff`. Non-regression and derivation are owned centrally.
- **Knowledge chronology:** packet `known_at` strict accepted-lineage order; record/event `game_knowledge_time` remains record-level knowledge metadata.
- **Authority/registration chronology:** append sequence, acceptance basis, lineage hashes, and transactional registration. No acceptance wall-clock is overloaded onto `known_at`.
- **Observation/event chronology:** `event_date`/`event_time`; chronology sort order is occurrence order, not packet order.
- **Publication chronology:** source `published_date` and `public_available_time`; public availability may not predate the represented event date where that field is used by Gate 3 event validation.
- **Frozen historical boundary:** `gate2_evidence_cutoff` remains sealed and immutable.
- **Derived current-state horizon:** `current_evidence_cutoff`, `current_osint_cutoff`, daily-coverage end date, release/build cutoff projections.

The repaired audit removed two invalid cross-clock comparisons from the v2 canonical core: packet `known_at` was previously compared to the v1 `current_osint_cutoff`, and each packet `known_at` was also bounded by manifest `current_evidence_cutoff`. Both incorrectly treated knowledge time as evidence-horizon time.

Remaining downstream equality checks (canonical -> public -> release -> build-info) are projection-integrity checks: they require the **same evidence horizon** to survive derivation and do not impose knowledge ordering.

## Transaction boundary

Registration performs all checks before replacing the manifest:

1. parse and schema-validate the candidate packet;
2. validate packet temporal semantics through `canonical_temporal_contract`;
3. require `status: ACCEPTED`;
4. normalize packet bytes with the same UTF-8 CRLF-to-LF contract used by the Gate 3 consumer;
5. reject duplicate packet IDs and paths;
6. verify complete existing lineage, pinned migration prefix, temporal ordering, and every accepted packet hash;
7. validate the candidate append through the shared temporal authority;
8. append exactly one candidate entry and preserve the prior accepted sequence as an exact prefix;
9. validate candidate lineage and all packet bytes;
10. dry-run the real `build_canonical_current_state_v2.build_state()` consumer against the candidate manifest; that consumer invokes the same temporal authority;
11. atomically replace the manifest only after every preceding operation succeeds.

If any step fails, the authoritative manifest remains byte-for-byte unchanged. The packet file itself is never rewritten by registration.

## Lineage and frozen history

Manifest lineage version `1.0` binds sequence, packet ID, path, packet SHA-256, `known_at`, `evidence_cutoff`, acceptance basis, and previous lineage digest. Static authority, lineage genesis, and the independently pinned five-packet migration tip remain unchanged.

The five packets accepted through September 6 are not rewritten. Their bytes, SHA-256 values, stable IDs, and evidence semantics remain frozen. They retain `acceptance_basis: LEGACY_MANIFEST_ACCEPTED_PRE_REGISTRAR`. Future accepted packets use `PACKET_STATUS_ACCEPTED` and must carry `status: "ACCEPTED"`.

Frozen Gate 2 remains:

`2026-09-05T00:37:00-04:00`

## Regression and canary coverage

Permanent tests include:

- `tests/gate3-v2-registration.test.py` — transactional authority/immutability;
- `tests/gate3-v2-temporal-contract.test.py` — table-driven valid/invalid temporal matrix, late historical evidence, transactional rejects, and shared-authority anti-recurrence;
- `tests/gate3-v2-forward-update-canary.test.py` — ordinary future evidence + future knowledge through the production path;
- `tests/gate3-v2-delayed-knowledge-canary.test.py` — more-than-one-day knowledge lag through the real registrar, canonical v2, public v2, Lie Ledger validation, release model, and deterministic regeneration;
- `tests/gate3-v2-sep7-replay.test.py` — isolated replay of the exact Sep. 7 payload from locked PR #62 head, adding only the registrar-required acceptance status in the temporary proving workspace because that draft packet predates the registrar.

No synthetic canary packet, Sep. 7 proving packet, or generated artifact is written into tracked canonical authority.
