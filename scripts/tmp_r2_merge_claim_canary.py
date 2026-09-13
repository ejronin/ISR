#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / ".github/workflows/release-qualification.yml"
text = path.read_text(encoding="utf-8")
old = "          python tests/gate3-v2-forward-update-canary.test.py\n          python tests/gate3-v2-delayed-knowledge-canary.test.py\n"
new = "          python tests/gate3-v2-forward-update-canary.test.py\n          python tests/gate3-v2-claim-count-canary.test.py\n          python tests/gate3-v2-delayed-knowledge-canary.test.py\n"
if text.count(old) != 1:
    raise SystemExit("expected R2 qualification insertion point exactly once")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("R2 qualification now includes accepted claim-count canary")
