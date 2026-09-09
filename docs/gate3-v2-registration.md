# Gate 3 v2 packet registration authority

Gate 3 v2 accepted evidence is append-only. `data/canonical-ledger/manifest-v2.json` is the authoritative registry for post-Gate-2 v2 packets, and accepted packet contents remain immutable evidence inputs.

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

## Transaction boundary

Registration performs all checks before replacing the manifest:

1. parse and schema-validate the candidate packet;
2. require `status: ACCEPTED`;
3. normalize packet bytes with the same UTF-8 CRLF-to-LF contract used by the Gate 3 consumer;
4. reject duplicate packet IDs and paths;
5. verify the complete existing manifest lineage and every previously accepted packet hash;
6. require the candidate `known_at` to be strictly later than the current accepted tip and prohibit evidence-cutoff regression;
7. append exactly one candidate entry and require the prior accepted sequence to remain an exact prefix;
8. validate the candidate lineage and all packet bytes;
9. dry-run the real `build_canonical_current_state_v2.build_state()` consumer against the candidate manifest;
10. write a temporary manifest and atomically replace the authority file only after every preceding operation succeeds.

If any validation, build, or atomic replacement step fails, the authoritative manifest is left byte-for-byte unchanged. The packet file itself is never rewritten by registration.

## Lineage model

Manifest lineage version `1.0` adds, per accepted entry:

- `evidence_cutoff`;
- `acceptance_basis`;
- `previous_lineage_sha256`;
- `lineage_sha256`.

The resulting lineage digest binds sequence, packet ID, path, packet SHA-256, `known_at`, evidence cutoff, acceptance basis, and the prior lineage digest.

The manifest also pins:

- a static-authority digest covering schema/artifact identity, base manifest, frozen Gate 2 cutoff, and lineage version;
- a lineage genesis digest;
- an independently pinned migration tip for the five packets that were already accepted before the registrar existed.

That migration-tip pin prevents an attacker or accidental edit from mutating an older entry and simply recomputing the remainder of the chain.

## Existing accepted packets

The five v2 packets already accepted through September 6 are **not rewritten**. Their packet bytes and existing SHA-256 values remain unchanged.

Their manifest entries are migrated forward with deterministic lineage metadata and:

`acceptance_basis: LEGACY_MANIFEST_ACCEPTED_PRE_REGISTRAR`

Because those packet files predate the registrar, they are not required to gain a `status` field retroactively. Future entries use:

`acceptance_basis: PACKET_STATUS_ACCEPTED`

and the corresponding packet must contain `status: "ACCEPTED"`.

The frozen Gate 2 boundary remains:

`2026-09-05T00:37:00-04:00`

`current_evidence_cutoff` is derived from the accepted lineage tip and advances only through successful registration.

## Validation and forward-update canary

Permanent tests include:

- `tests/gate3-v2-registration.test.py` — transactional success/failure and immutability tests;
- `tests/gate3-v2-forward-update-canary.test.py` — creates a synthetic future accepted packet in a temporary repository, invokes the real registrar, runs the real canonical/public/release builders and current-state validators, and verifies deterministic regeneration.

The canary advances current cutoff, packet/source/chronology/material-loss populations and a synthetic actor while preserving frozen Gate 2, the September 6 accepted entry, all prior packet bytes/hashes, and all previously established stable IDs.

No synthetic canary packet or generated artifact is written into tracked canonical history.
