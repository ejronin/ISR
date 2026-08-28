# Canonical update packets

Post-migration evidence changes live here as small JSON packets conforming to `schemas/canonical-update-packet-v1.json`.

A packet is only authoritative after review, after its status is `ACCEPTED`, and after its path, normalized SHA-256, strictly increasing `known_at`, and append-only lineage digest are registered in `data/canonical-ledger/manifest.json`. The prior manifest sequence must remain an exact prefix. Accepted packets are immutable; corrections use a new packet. Corrections to provenance-conflicted sources must target an explicit `variant_key`. The browser never downloads or replays this directory.
