# Canonical update packets

Post-migration evidence changes live here as small JSON packets conforming to `schemas/canonical-update-packet-v1.json`.

A packet is only authoritative after review, after its status is `ACCEPTED`, and after its path and normalized SHA-256 are appended to `data/canonical-ledger/manifest.json`. Accepted packets are immutable; corrections use a new packet. The browser never downloads or replays this directory.
