#!/usr/bin/env python3
"""Structural anti-recurrence test for production temporal consumers."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_canonical_current_state_v2 as canonical_v2  # noqa: E402
import build_public_current_state_v2 as public_v2  # noqa: E402
import build_public_current_state_v2_hardened as public_hardened  # noqa: E402
import canonical_temporal_contract as temporal  # noqa: E402
import gate3_v2_registration as registrar  # noqa: E402
import validate_public_current_state_v2 as public_validator  # noqa: E402


class TemporalConsumerAgreement(unittest.TestCase):
    def test_production_temporal_consumers_share_one_authority(self) -> None:
        self.assertIs(registrar.temporal, temporal)
        self.assertIs(canonical_v2.temporal, temporal)
        self.assertIs(public_v2.temporal, temporal)
        self.assertIs(public_hardened.public_core.temporal, temporal)
        self.assertIs(public_validator.core.temporal, temporal)
        self.assertIs(public_validator.builder.public_core.temporal, temporal)


if __name__ == "__main__":
    unittest.main(verbosity=2)
