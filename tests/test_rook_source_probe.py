"""ROOK standing-source probe invariants. No external network calls."""
from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from rook_source_probe import CandidateLinks, build_artifact, last_closed_window, load_sources, probe_one  # noqa: E402

ET = ZoneInfo("America/New_York")


class FakeResponse:
    status = 200
    headers = {"Content-Type": "text/html; charset=UTF-8"}

    def __init__(self, payload: bytes):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, count):
        return self.payload[:count]


class RookSourceProbeTests(unittest.TestCase):
    def setUp(self):
        self.sample = [{"collection_source_id": "CSU-TEST", "access_location": "https://example.com/world/", "source_identity": "Test", "country": "Example"}]

    def test_window_uses_elapsed_clock_boundary_after_cutoff(self):
        start, end = last_closed_window(datetime(2026, 11, 23, 0, 20, tzinfo=ET))
        self.assertEqual(start, datetime(2026, 11, 22, 12, tzinfo=ET))
        self.assertEqual(end, datetime(2026, 11, 23, 0, tzinfo=ET))

    def test_early_run_does_not_make_future_cutoff(self):
        start, end = last_closed_window(datetime(2026, 11, 23, 0, 4, tzinfo=ET))
        self.assertEqual(end, datetime(2026, 11, 22, 12, tzinfo=ET))

    def test_only_same_domain_candidate_links_and_no_javascript(self):
        p = CandidateLinks("https://example.com/world/")
        p.feed('<a href="/world/iran-war">Iran</a><a href="https://evil.com/iran">bad</a><a href="javascript:iran">bad</a><a href="/world/weather">weather</a><a href="/world/iran-war?utm=a">dupe</a>')
        self.assertEqual(p.links, ["https://example.com/world/iran-war"])

    def test_probe_records_reachability_not_verified_claim(self):
        blob = b'<a href="/world/hormuz">read</a>'
        fake = lambda request, timeout: FakeResponse(blob)
        result = probe_one(self.sample[0], opener=fake)
        self.assertEqual(result["status"], "RETRIEVED_SAMPLE")
        self.assertEqual(result["first_bytes_sha256"], hashlib.sha256(blob).hexdigest())
        self.assertEqual(result["candidate_links_unverified"], ["https://example.com/world/hormuz"])
        artifact = build_artifact(self.sample, [result], now=datetime(2026, 11, 23, 0, 20, tzinfo=ET))
        self.assertEqual(artifact["artifact_role"], "ROOK_EVIDENCE_LOCKER_SOURCE_REGISTRY_DELTA")
        self.assertEqual(artifact["retrieved_sample_count"], 1)
        self.assertFalse(artifact["qualification"]["may_advance_evidence_cutoff"])
        self.assertFalse(artifact["qualification"]["may_change_maps_charts_or_lie_ledger"])

    def test_source_universe_duplicates_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sources.json"
            path.write_text(json.dumps({"sources": self.sample + self.sample}))
            with self.assertRaisesRegex(ValueError, "duplicated"):
                load_sources(path)

    def test_source_universe_insecure_url_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sources.json"
            path.write_text(json.dumps({"sources": [{"collection_source_id": "CSU-HTTP", "access_location": "http://example.com"}]}))
            with self.assertRaisesRegex(ValueError, "non-HTTPS"):
                load_sources(path)

    def test_no_phantom_source_coverage(self):
        with self.assertRaisesRegex(ValueError, "counts differ"):
            build_artifact(self.sample, [], now=datetime(2026, 11, 23, 0, 20, tzinfo=ET))


if __name__ == "__main__":
    unittest.main()
