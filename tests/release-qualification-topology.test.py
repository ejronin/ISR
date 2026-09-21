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
browser_runner = (ROOT / "scripts/run_public_browser_qualification.sh").read_text(encoding="utf-8")

for token in (
    "ref: ${{ inputs.commit_sha }}",
    "Prove checkout identity",
    "qualified_sha: ${{ steps.checkout_identity.outputs.sha }}",
    "python scripts/rook_intake_status.py validate",
    "python tests/rook-intake-pipeline.test.py",
    "python tests/release-change-classification.test.py",
    "python scripts/validate_canonical_authority.py",
    "python tests/canonical-update-pipeline.test.py",
    "python tests/gate3-v2-forward-update-canary.test.py",
    "python tests/gate3-v2-delayed-knowledge-canary.test.py",
    "python tests/evidence-governance-boundary.test.py",
    "python scripts/build_current_release_state.py",
    "python scripts/build_current_release_state.py --check",
    "python scripts/validate_lie_ledger_v2.py",
    "python scripts/build_web_of_lies_discovery_queue.py --check",
    "python scripts/build_web_of_lies_baseline_packets.py --check",
    "python scripts/build_web_of_lies_sep20_reconciliation_packets.py --check",
    "python scripts/build_web_of_lies_source_promotion_control_packets.py --check",
    "python scripts/build_web_of_lies_current_anchor_packets.py --check",
    "python scripts/build_web_of_lies_forensic_input.py --check",
    "python scripts/validate_web_of_lies.py",
    "python tests/web-of-lies-foundation.test.py",
    "python tests/web-of-lies-osint-network.test.py",
    "python tests/web-of-lies-public-osint-batch1.test.py",
    "python tests/web-of-lies-public-osint-batch2.test.py",
    "python tests/web-of-lies-public-osint-batch3.test.py",
    "python tests/web-of-lies-lineage-packets.test.py",
    "python tests/web-of-lies-ledger-coverage.test.py",
    "node tests/web-of-lies-public-contract.test.js",
    "python scripts/build_public_release.py",
    "python scripts/assemble_public_site.py --output _site",
    "node tests/public-reader-layer.test.js",
    "bash scripts/run_public_browser_qualification.sh",
    "python scripts/privacy_scan.py",
):
    assert token in qualification, f"unified qualification lost mandatory gate: {token}"

for suite in (
    "browser-public-boot-smoke.js",
    "browser-public-ia-smoke.js",
    "browser-public-evidence-phase5.js",
    "browser-public-map-phase6.js",
    "browser-public-parity-batch3.js",
    "browser-public-loss-actor-batch2.js",
    "browser-public-responsive-phase9.js",
    "browser-public-phase9.js",
    "browser-public-full-stack-audit.js",
    "browser-public-source-humanization-focus.js",
    "browser-public-render-review.js",
):
    assert f"node tests/{suite}" in browser_runner, f"browser qualification lost mandatory suite: {suite}"
assert browser_runner.count("start_browser") >= 3, "browser qualification no longer isolates the exhaustive audit in a fresh process"

assert "uses: ./.github/workflows/release-qualification.yml" in primary, "PR validation bypasses reusable qualification"
assert "pull_request:" in primary, "PR exact-head qualification trigger missing"
assert "push:" not in primary, "main qualification is duplicated outside the deployment chain"
assert "name: validate" in primary and "needs: qualification" in primary, "protected validate status is not downstream of exact-SHA qualification"
assert "QUALIFIED_SHA: ${{ needs.qualification.outputs.qualified_sha }}" in primary, "protected validate status is not bound to reusable qualified SHA output"

assert "python scripts/classify_release_change.py" in pages, "Pages lacks deterministic release-impact classification"
assert "uses: ./.github/workflows/release-qualification.yml" in pages, "Pages release-affecting path does not invoke reusable qualification"
assert "prepare_pages_artifact: true" in pages, "Pages release-affecting path does not deploy the artifact produced by qualification"
assert "needs.classify.outputs.release_required == 'true'" in pages, "Pages deployment is not gated by release-impact classification"
assert "needs.classify.outputs.release_required == 'false'" in pages, "Pages lacks explicit intake-only no-op path"
assert "UPSTREAM_INTAKE_ONLY_PUBLIC_RELEASE_IDENTITY_UNCHANGED" in pages, "Pages no-op path is not identity-bound"
assert "QUALIFIED_SHA: ${{ needs.qualify.outputs.qualified_sha }}" in pages, "Pages deploy is not explicitly bound to reusable qualified SHA output"
assert "Deploy exact qualified artifact to GitHub Pages" in pages, "Pages lost exact-qualified deployment action"
assert "attest_live_deployment.py" in pages, "Pages lacks live deployment attestation"
assert "deployments: read" in pages and "/deployments?{params}" in pages, "Pages does not resolve a real exact-SHA deployment identity"
assert "live-deployment-attestation-${{ github.sha }}" in pages, "Pages does not persist SHA-bound attestation"

no_deploy_block = pages.split("\n  no_deploy:\n", 1)[1].split("\n  deploy:\n", 1)[0]
assert "deploy-pages@" not in no_deploy_block, "intake-only no-op path can still deploy Pages"
assert "attest_live_deployment.py" not in no_deploy_block, "intake-only no-op path can still fabricate live attestation"

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

print(
    "release qualification topology: PASS - one reusable exact-SHA gate owns release-affecting changes; "
    "append-only intake may no-op only after deterministic public identity equivalence; deployed live bytes remain attested"
)
