"""Regression tests for the fail-visible ROOK 12-hour freshness gate."""
import sys
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from check_rook_freshness_watchdog import expected_window_end, is_qualified_completed_sweep  # noqa: E402

ET = ZoneInfo("America/New_York")


class RookFreshnessWatchdogTests(unittest.TestCase):
    def test_late_scheduler_still_checks_most_recent_noon_window(self):
        now = datetime(2026, 11, 22, 16, 48, 42, tzinfo=ET)
        self.assertEqual(
            expected_window_end(now),
            datetime(2026, 11, 22, 12, 0, 0, tzinfo=ET),
        )

    def test_expected_normal_midnight_and_noon(self):
        self.assertEqual(
            expected_window_end(datetime(2026, 11, 23, 0, 20, tzinfo=ET)),
            datetime(2026, 11, 23, 0, 0, tzinfo=ET),
        )
        self.assertEqual(
            expected_window_end(datetime(2026, 11, 22, 12, 20, tzinfo=ET)),
            datetime(2026, 11, 22, 12, 0, tzinfo=ET),
        )

    def test_only_elapsed_window_when_triggered_too_early(self):
        self.assertEqual(
            expected_window_end(datetime(2026, 11, 22, 12, 5, tzinfo=ET)),
            datetime(2026, 11, 22, 0, 0, tzinfo=ET),
        )

    def test_absent_or_partial_is_not_completed(self):
        self.assertFalse(is_qualified_completed_sweep(None))
        self.assertFalse(is_qualified_completed_sweep({}))
        self.assertFalse(is_qualified_completed_sweep({
            "status": "INCOMPLETE_PARTIAL_UNVALIDATED",
            "canonical_or_public_artifacts_mutated": False,
            "accepted_packet_bytes_or_hashes_mutated": False,
            "full_theater_coverage_complete": False,
            "prior_drawer_reconciliation_complete": False,
            "validator_recognized_completed_unconsumed_sweep": False,
        }))

    def test_complete_label_cannot_override_negative_validation(self):
        self.assertFalse(is_qualified_completed_sweep({
            "status": "COMPLETE_ROUTINE_CURRENT_CONTRACT",
            "canonical_or_public_artifacts_mutated": False,
            "accepted_packet_bytes_or_hashes_mutated": False,
            "full_theater_coverage_complete": True,
            "prior_drawer_reconciliation_complete": True,
            "validator_recognized_completed_unconsumed_sweep": False,
        }))

    def test_valid_legacy_complete_contract_is_accepted(self):
        self.assertTrue(is_qualified_completed_sweep({
            "status": "COMPLETE_ROUTINE_CURRENT_CONTRACT",
            "canonical_or_public_artifacts_mutated": False,
            "accepted_packet_bytes_or_hashes_mutated": False,
        }))

    def test_mutated_protected_bytes_cannot_be_complete(self):
        self.assertFalse(is_qualified_completed_sweep({
            "status": "COMPLETE_ROUTINE_CURRENT_CONTRACT",
            "canonical_or_public_artifacts_mutated": True,
            "accepted_packet_bytes_or_hashes_mutated": False,
        }))


if __name__ == "__main__":
    unittest.main()
