#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("classify_release_change", ROOT / "scripts" / "classify_release_change.py")
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = mod
SPEC.loader.exec_module(mod)

locker_only = mod.classify_paths([
    ("A", "data/evidence-integration/rook-evidence-locker-sweep-20260914T2359ET.json"),
    ("A", "data/evidence-integration/source-discovery-20260914.json"),
])
assert locker_only["candidate_intake_only"] is True

assert mod.classify_paths([
    ("M", "data/evidence-integration/rook-evidence-locker-sweep-20260914T2359ET.json"),
])["candidate_intake_only"] is False

assert mod.classify_paths([
    ("A", "data/canonical-updates/UPD-20260914-TEST.json"),
])["candidate_intake_only"] is False

assert mod.classify_paths([
    ("A", "scripts/rook_intake_status.py"),
])["candidate_intake_only"] is False

workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
deploy_block = workflow.split("\n  deploy:\n", 1)[1].split("\n  attest:\n", 1)[0]
assert "needs: [classify, qualify]" in deploy_block
assert "needs.classify.outputs.release_required == 'true'" in deploy_block
assert "Deploy exact qualified artifact to GitHub Pages" in deploy_block
assert "no_deploy:" in workflow
assert "UPSTREAM_INTAKE_ONLY_PUBLIC_RELEASE_IDENTITY_UNCHANGED" in (ROOT / "scripts" / "classify_release_change.py").read_text(encoding="utf-8")

print("release change classification: PASS")
