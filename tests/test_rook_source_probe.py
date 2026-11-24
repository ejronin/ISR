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
from rook_source_probe import CandidateLinks, HTTPSOnlyRedirects, build_artifact, last_closed_window, load_sources, probe_one  # noqa: E402

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

    def test_non_http_scheme_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sources.json"
            path.write_text(json.dumps({"sources": [{"collection_source_id": "CSU-FTP", "access_location": "ftp://example.com"}]}))
            with self.assertRaisesRegex(ValueError, "non-HTTP"):
                load_sources(path)

    def test_legacy_http_is_preserved_but_upgraded_for_fetch(self):
        legacy = [{"collection_source_id": "CSU-CN-CUSTOMS", "access_location": "http://english.customs.gov.cn/", "source_identity": "China Customs"}]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sources.json"
            path.write_text(json.dumps({"sources": legacy}))
            self.assertEqual(load_sources(path), legacy)
        requests = []
        def fake(request, timeout):
            requests.append((request.full_url, timeout))
            return FakeResponse(b'<a href="/english/iran">Public trade reporting</a>')
        record = probe_one(legacy[0], opener=fake)
        self.assertEqual(requests, [("https://english.customs.gov.cn/", 7)])
        self.assertEqual(record["url"], "http://english.customs.gov.cn/")
        self.assertEqual(record["probe_url"], "https://english.customs.gov.cn/")
        self.assertEqual(record["transport_policy"], "HTTPS_UPGRADE_ATTEMPT_NO_HTTP_FALLBACK")
        self.assertEqual(record["status"], "RETRIEVED_SAMPLE")

    def test_https_upgrade_failure_stays_individual_not_total_abort(self):
        legacy = {"collection_source_id": "CSU-CN-CUSTOMS", "access_location": "http://english.customs.gov.cn/"}
        from urllib.error import URLError
        requests = []
        def broken(request, timeout):
            requests.append(request.full_url)
            raise URLError("HTTPS unavailable")
        result = probe_one(legacy, opener=broken)
        self.assertEqual(requests, ["https://english.customs.gov.cn/"])
        self.assertEqual(result["status"], "FETCH_FAILED")
        self.assertEqual(result["failure_type"], "URLError")
        self.assertEqual(result["url"], legacy["access_location"])

    def test_https_redirect_to_http_is_rejected(self):
        from urllib.error import URLError
        from urllib.request import Request
        with self.assertRaisesRegex(URLError, "insecure HTTP redirect rejected"):
            HTTPSOnlyRedirects().redirect_request(
                Request("https://example.com/news"), None, 302, "Found", {},
                "http://example.com/redirected",
            )

    def test_workflow_never_pushes_directly_to_protected_main(self):
        workflow = (Path(__file__).resolve().parents[1] / ".github/workflows/rook-standing-source-probe.yml").read_text(encoding="utf-8")
        self.assertIn("gh pr create", workflow)
        self.assertIn('gh workflow run validate.yml --ref "$branch"', workflow)
        self.assertIn("pull-requests: write", workflow)
        self.assertIn("actions: write", workflow)
        self.assertNotIn("git push origin HEAD:main", workflow)
        self.assertIn('git push origin "HEAD:refs/heads/$branch"', workflow)
        self.assertIn("actions/upload-artifact@", workflow)
        self.assertIn("automated" + chr(92) + ".json$", workflow)
        self.assertNotIn("automated" + chr(92) * 2 + ".json$", workflow)

    def test_no_phantom_source_coverage(self):
        with self.assertRaisesRegex(ValueError, "counts differ"):
            build_artifact(self.sample, [], now=datetime(2026, 11, 23, 0, 20, tzinfo=ET))


if __name__ == "__main__":
    unittest.main()
