#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "tests/browser-public-ia-smoke.js"
text = path.read_text(encoding="utf-8")
old = """    assert.equal(evidence.claims, 6);\n    assert.equal(evidence.support, 6);\n    assert.equal(evidence.contrary, 6);\n"""
new = """    const expectedClaimCount = await cdp.eval(`fetch('./data/public-current-state.json', { cache: 'no-store' })\n      .then(response => response.json())\n      .then(model => model.datasets['current.claims'].payload.claims.length)`);\n    assert.equal(evidence.claims, expectedClaimCount, 'claim page must render every current claim record');\n    assert.equal(evidence.support, expectedClaimCount, 'claim page must retain one support column per current claim');\n    assert.equal(evidence.contrary, expectedClaimCount, 'claim page must retain one contrary column per current claim');\n"""
if text.count(old) != 1:
    raise SystemExit("expected fixed-count claim assertion block exactly once")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("updated browser claim-count contract")
