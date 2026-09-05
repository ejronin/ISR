#!/usr/bin/env python3
"""Run the Gate 3 semantic suite against the final conflict-bounded builder."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_canonical_current_state_v2_final as final_builder
import validate_gate3 as semantic_suite

semantic_suite.gate3 = final_builder

if __name__ == "__main__":
    raise SystemExit(semantic_suite.main())
