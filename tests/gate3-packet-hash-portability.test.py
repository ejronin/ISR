#!/usr/bin/env python3
"""Protect the Gate 3 packet manifest hash across text-mode checkouts."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_canonical_current_state_v2 as gate3  # noqa: E402


def digest(raw: bytes) -> str:
    return hashlib.sha256(gate3.canonical_packet_text_bytes(raw)).hexdigest()


lf = (
    b'{\n'
    b'  "source_id": "SRC-GATE3-001",\n'
    b'  "known_at": "2026-09-05T00:37:00-04:00",\n'
    b'  "adjudication": "SUPPORTED_WITH_LIMITATIONS"\n'
    b'}\n'
)
expected = hashlib.sha256(lf).hexdigest()

# The manifest represents repository LF text. The same exact text in a Windows
# CRLF checkout must retain that identity without JSON parsing/reserialization.
assert digest(lf) == expected
assert digest(lf.replace(b"\n", b"\r\n")) == expected

hostile_mutations = {
    "one substantive character": lf.replace(b"LIMITATIONS", b"LIMITATIONX"),
    "source ID": lf.replace(b"SRC-GATE3-001", b"SRC-GATE3-002"),
    "timestamp": lf.replace(b"00:37:00", b"00:38:00"),
    "evidence/adjudication content": lf.replace(
        b"SUPPORTED_WITH_LIMITATIONS", b"FALSE_____________________"
    ),
}
for label, mutated in hostile_mutations.items():
    assert digest(mutated) != expected, f"{label} mutation retained manifest hash"

# A lone carriage return is content, not a platform newline representation, and
# must not be made equivalent to LF by the helper.
assert digest(lf.replace(b"\n", b"\r")) != expected

# Exercise the real accepted-packet boundary without parsing or reserializing
# packet content. The optional accepted base is used during the Phase 9 repair
# audit to prove the repository blobs are still the exact Gate 3 blobs.
manifest = json.loads((ROOT / "data/canonical-ledger/manifest-v2.json").read_text(encoding="utf-8"))
accepted_base = os.environ.get("GATE3_ACCEPTED_BASE")
for entry in manifest["accepted_updates"]:
    packet_path = entry["path"]
    head_blob_id = subprocess.check_output(
        ["git", "rev-parse", f"HEAD:{packet_path}"], cwd=ROOT, text=True
    ).strip()
    if accepted_base:
        accepted_blob_id = subprocess.check_output(
            ["git", "rev-parse", f"{accepted_base}:{packet_path}"], cwd=ROOT, text=True
        ).strip()
        assert head_blob_id == accepted_blob_id, f"accepted Gate 3 blob changed: {packet_path}"
    blob = subprocess.check_output(["git", "cat-file", "blob", head_blob_id], cwd=ROOT)
    working_tree = (ROOT / packet_path).read_bytes()
    assert hashlib.sha256(blob).hexdigest() == entry["sha256"], f"manifest/blob mismatch: {packet_path}"
    assert gate3.canonical_packet_text_bytes(working_tree) == blob, f"working tree differs beyond CRLF: {packet_path}"
    newline_state = "CRLF-only checkout difference" if working_tree != blob else "LF checkout"
    print(
        f"  {packet_path}: blob={head_blob_id}; sha256={entry['sha256']}; "
        f"{newline_state}"
    )

print(
    "Gate 3 packet hash portability: PASS - accepted blobs/manifests unchanged; "
    "LF/CRLF equivalent; substantive, source, timestamp, and adjudication mutations rejected"
)
