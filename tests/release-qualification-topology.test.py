#!/usr/bin/env python3
"""Keep CI subordinate to one exact-SHA evidence -> reader -> release contract."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"

required = {
    "release-qualification.yml",
    "validate.yml",
    "pages.yml",
    "inspect-wiki-reconciliation.yml",
}
retired = {
    "validate-evidence-integrity.yml",
    "validate-source-humanization.yml",
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
assert not returned, f"retired/duplicated qualification workflow returned as active CI: {returned}"

qualification = (WORKFLOWS / "release-qualification.yml").read_text(encoding="utf-8")
primary = (WORKFLOWS / "validate.yml").read_text(encoding="utf-8")
pages = (WORKFLOWS / "pages.yml").read_text(encoding="utf-8")
historical = (WORKFLOWS / "inspect-wiki-reconciliation.yml").read_text(encoding="utf-8")

for token in (
    "ref: ${{ inputs.commit_sha }}",
    "Prove checkout identity",
    "python scripts/validate_canonical_authority.py",
    "python tests/canonical-update-pipeline.test.py",
    "python tests/gate3-v2-forward-update-canary.test.py",
    "python tests/gate3-v2-delayed-knowledge-canary.test.py",
    "python tests/evidence-governance-boundary.test.py",
    "python scripts/build_current_release_state.py",
    "python scripts/build_current_release_state.py --check",
    "python scripts/validate_lie_ledger_v2.py",
    "python scripts/build_public_release.py",
    "python scripts/assemble_public_site.py --output _site",
    "node tests/public-reader-layer.test.js",
    "tests/browser-public-full-stack-audit.js",
    "tests/browser-public-source-humanization-focus.js",
    "tests/browser-public-render-review.js",
    "python scripts/privacy_scan.py",
):
    assert token in qualification, f"unified qualification lost mandatory gate: {token}"

assert "uses: ./.github/workflows/release-qualification.yml" in primary, "PR validation bypasses reusable qualification"
assert "pull_request:" in primary, "PR exact-head qualification trigger missing"
assert "push:" not in primary, "main qualification is duplicated outside the deployment chain"

assert "uses: ./.github/workflows/release-qualification.yml" in pages, "Pages does not invoke reusable qualification"
assert "needs: qualify" in pages, "Pages deployment is not gated by exact-SHA qualification"
assert "prepare_pages_artifact: true" in pages, "Pages does not deploy the artifact produced by qualification"
assert "attest_live_deployment.py" in pages, "Pages lacks live deployment attestation"
assert "live-deployment-attestation-${{ github.sha }}" in pages, "Pages does not persist SHA-bound attestation"

# Current workflows may inspect historical compatibility through tests, but may
# not regenerate historical public/canonical artifacts as release inputs.
for label, text in {"qualification": qualification, "primary": primary, "pages": pages}.items():
    for forbidden in (
        "python scripts/build_canonical_current_state.py --output",
        "python scripts/build_public_current_state.py",
        "--output data/public-current-state-v2.json",
    ):
        assert forbidden not in text, f"{label} workflow reintroduced historical production choreography: {forbidden}"

assert "workflow_dispatch:" in historical, "historical reconciliation audit is not explicitly dispatch-only"
assert "pull_request:" not in historical, "historical reconciliation audit regained PR authority"
assert "branches:" not in historical, "historical reconciliation audit regained branch-push authority"

print("release qualification topology: PASS - one reusable exact-SHA qualification gate owns evidence, reader and release checks; Pages deploys only after that gate and attests live bytes")
