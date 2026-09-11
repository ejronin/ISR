#!/usr/bin/env python3
"""Keep CI subordinate to the current Atlas evidence -> reader -> release contract."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"

required = {
    "validate.yml",
    "validate-evidence-integrity.yml",
    "validate-source-humanization.yml",
    "pages.yml",
    "inspect-wiki-reconciliation.yml",
}
retired = {
    "gate3-validate.yml",
    "validate-neutral-lie-ledger-governance.yml",
    "validate-current-public-foundation.yml",
    "validate-reader-rearchitecture.yml",
    "validate-aug25-late.yml",
}

present = {path.name for path in WORKFLOWS.glob("*.yml")}
missing = sorted(required - present)
assert not missing, f"required release qualification workflow missing: {missing}"
returned = sorted(retired & present)
assert not returned, f"retired transition workflow returned as active CI: {returned}"

primary = (WORKFLOWS / "validate.yml").read_text(encoding="utf-8")
evidence = (WORKFLOWS / "validate-evidence-integrity.yml").read_text(encoding="utf-8")
reader = (WORKFLOWS / "validate-source-humanization.yml").read_text(encoding="utf-8")
pages = (WORKFLOWS / "pages.yml").read_text(encoding="utf-8")
historical = (WORKFLOWS / "inspect-wiki-reconciliation.yml").read_text(encoding="utf-8")

for token in (
    "python scripts/build_current_release_state.py",
    "python scripts/build_current_release_state.py --check",
    "python scripts/build_public_release.py",
    "python scripts/assemble_public_site.py --output _site",
    "python tests/lie-ledger-governance-neutralization.test.py",
    "node tests/public-reader-layer.test.js",
    "python tests/neutral-current-narrative.test.py",
):
    assert token in primary, f"primary qualification lost durable invariant check: {token}"

for token in (
    "python tests/canonical-authority.test.py",
    "python tests/canonical-update-pipeline.test.py",
    "python tests/gate3-packet-hash-portability.test.py",
    "python tests/gate3-v2-forward-update-canary.test.py",
    "python tests/gate3-v2-delayed-knowledge-canary.test.py",
    "python tests/lie-ledger-governance-neutralization.test.py",
    "python tests/evidence-governance-boundary.test.py",
    "python scripts/build_current_release_state.py",
    "python scripts/validate_lie_ledger_v2.py",
):
    assert token in evidence, f"evidence qualification lost durable invariant check: {token}"

# Current workflows may inspect historical compatibility through tests, but may
# not regenerate historical public/canonical artifacts as release inputs.
for label, text in {
    "primary": primary,
    "evidence": evidence,
    "reader": reader,
    "pages": pages,
}.items():
    for forbidden in (
        "python scripts/build_canonical_current_state.py --output",
        "python scripts/build_public_current_state.py",
        "--output data/public-current-state-v2.json",
    ):
        assert forbidden not in text, f"{label} workflow reintroduced historical production choreography: {forbidden}"

assert "workflow_dispatch:" in historical, "historical reconciliation audit is not explicitly dispatch-only"
assert "pull_request:" not in historical, "historical reconciliation audit regained PR authority"
assert "branches:" not in historical, "historical reconciliation audit regained branch-push authority"

for token in (
    "tests/browser-public-full-stack-audit.js",
    "tests/browser-public-source-humanization-focus.js",
    "tests/browser-public-render-review.js",
):
    assert token in reader, f"independent reader browser review lost {token}"

for token in (
    "assemble_public_site.py --output _site --check --require-build-info",
    "validate_public_runtime_inventory.py --site-root _site --require-build-info",
    "validate_public_deployment.py --site-root _site --require-build-info",
):
    assert token in pages, f"Pages deployment lost closed-artifact protection: {token}"

print("release qualification topology: PASS - current evidence, reader, release and historical-audit boundaries are explicit")
