#!/usr/bin/env python3
"""Fetch-only standing-source probe. Never creates a certified ROOK sweep."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE_UNIVERSE = ROOT / "data/evidence-integration/collection-source-universe-content-20260911.json"
OUTPUT_DIR = ROOT / "data/evidence-integration"
ET = ZoneInfo("America/New_York")
MATCH = re.compile(r"(iran|hormuz|houthi|yemen|bahrain|saudi|iraq|gulf|oil|tanker|ship|missile|drone|nuclear|sanction|ceasefire|israel|lebanon|red.sea)", re.I)
MAX_BYTES = 65_536
MAX_LINKS = 8
USER_AGENT = "AtlasISR-SourceAvailabilityProbe/1.0 (+https://github.com/ejronin/ISR; public standing sources only)"


def last_closed_window(now: datetime) -> tuple[datetime, datetime]:
    if now.tzinfo is None:
        raise ValueError("now must have a UTC offset")
    local = now.astimezone(ET)
    end = local.replace(hour=12 if local.hour >= 12 else 0, minute=0, second=0, microsecond=0)
    if local - end < timedelta(minutes=8):
        end -= timedelta(hours=12)
    return end - timedelta(hours=12), end


def load_sources(path: Path = SOURCE_UNIVERSE) -> list[dict]:
    universe = json.loads(path.read_text(encoding="utf-8"))
    sources = universe["sources"]
    if not isinstance(sources, list) or not sources:
        raise ValueError("standing source universe empty")
    seen = set()
    for source in sources:
        identity, url = source.get("collection_source_id"), source.get("access_location")
        if not isinstance(identity, str) or not identity or identity in seen:
            raise ValueError("missing or duplicated standing-source ID")
        if not isinstance(url, str):
            raise ValueError(f"non-HTTP(S) or missing URL for {identity}")
        parsed_url = urlsplit(url)
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.hostname:
            raise ValueError(f"non-HTTP(S) or missing URL for {identity}")
        # Curated historical source entries may still publish an HTTP access
        # location. Preserve that original URL as standing-source provenance;
        # probe_one always attempts HTTPS and NEVER transmits over HTTP.
        seen.add(identity)
    return sources


class HTTPSOnlyRedirects(HTTPRedirectHandler):
    """Reject a server redirect that would downgrade a source probe to HTTP."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urlsplit(newurl).scheme != "https":
            raise URLError("insecure HTTP redirect rejected")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class CandidateLinks(HTMLParser):
    def __init__(self, root_url: str):
        super().__init__(convert_charrefs=True)
        self.root_url = root_url
        self.host = (urlsplit(root_url).hostname or "").lower()
        self.links = []
        self.seen = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href")
        if not href or not isinstance(href, str):
            return
        url = urljoin(self.root_url, href)
        parsed = urlsplit(url)
        host = (parsed.hostname or "").lower()
        if parsed.scheme not in {"http", "https"} or not host:
            return
        if host != self.host and not host.endswith("." + self.host):
            return
        url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
        if not MATCH.search(url) or url in self.seen or url == self.root_url:
            return
        self.seen.add(url)
        if len(self.links) < MAX_LINKS:
            self.links.append(url)


def probe_one(source: dict, opener=urlopen) -> dict:
    # The historical 86-source registry contains one explicit HTTP location
    # (China Customs). Do not erase/rewrite it or abort the other 85 sources.
    # Attempt a safe HTTPS upgrade and record the actual transport attempted.
    url = source["access_location"]
    parsed_url = urlsplit(url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.hostname:
        raise ValueError("probe source must be a validated HTTP(S) URL")
    probe_url = urlunsplit(("https", parsed_url.netloc, parsed_url.path, parsed_url.query, "")) if parsed_url.scheme == "http" else url
    result = {
        "source_id": source["collection_source_id"],
        "publisher": source.get("source_identity"),
        "country": source.get("country"),
        "url": url,
        "probe_url": probe_url,
        "transport_policy": "HTTPS_UPGRADE_ATTEMPT_NO_HTTP_FALLBACK" if parsed_url.scheme == "http" else "DIRECT_HTTPS_ONLY",
        "source_class": source.get("source_class"),
        "status": "FETCH_FAILED",
        "http_status": None,
        "response_mime": None,
        "first_bytes_sha256": None,
        "hash_scope": f"first {MAX_BYTES} bytes only, not complete-page forensic hash",
        "candidate_links_unverified": [],
        "failure_type": None,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    }
    req = Request(probe_url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xml,application/rss+xml,*/*;q=0.4"})
    # The default urllib opener follows HTTPS -> HTTP redirects. Disable that
    # downgrade for repository-maintained standing sources.
    fetch = build_opener(HTTPSOnlyRedirects()).open if opener is urlopen else opener
    try:
        with fetch(req, timeout=7) as response:
            result["http_status"] = getattr(response, "status", 200)
            result["response_mime"] = response.headers.get("Content-Type", "").split(";")[0]
            blob = response.read(MAX_BYTES)
            result["first_bytes_sha256"] = hashlib.sha256(blob).hexdigest()
            result["status"] = "RETRIEVED_SAMPLE"
            if "html" in (result["response_mime"] or ""):
                parser = CandidateLinks(probe_url)
                parser.feed(blob.decode("utf-8", errors="replace"))
                result["candidate_links_unverified"] = parser.links
    except HTTPError as exc:
        result["http_status"] = exc.code
        result["failure_type"] = "HTTP_ERROR"
    except (URLError, OSError, TimeoutError, ValueError) as exc:
        result["failure_type"] = type(exc).__name__
    except Exception as exc:
        result["failure_type"] = type(exc).__name__
    return result


def build_artifact(sources: list[dict], results: list[dict], *, now: datetime) -> dict:
    start, end = last_closed_window(now)
    if len(results) != len(sources):
        raise ValueError("source and result counts differ")
    if {r["source_id"] for r in results} != {s["collection_source_id"] for s in sources}:
        raise ValueError("source results do not match standing source universe")
    ok = sum(r["status"] == "RETRIEVED_SAMPLE" for r in results)
    return {
        "artifact_role": "ROOK_EVIDENCE_LOCKER_SOURCE_REGISTRY_DELTA",
        "authority": "ROOK_UPSTREAM_COLLECTION",
        "write_policy": "APPEND_ONLY_SOURCE_AVAILABILITY_ONLY",
        "sweep_window": {"start": start.isoformat(), "end": end.isoformat(), "timezone": "America/New_York"},
        "collection_time": now.astimezone(ET).isoformat(),
        "source_universe": SOURCE_UNIVERSE.relative_to(ROOT).as_posix(),
        "source_count": len(results),
        "retrieved_sample_count": ok,
        "unavailable_or_blocked_count": len(results) - ok,
        "sources": results,
        "qualification": {
            "status": "FETCH_ONLY_NOT_A_COMPLETED_ROOK_SWEEP",
            "notes": "Source URL reachability and unverified same-domain link leads only. Original HTTP access URLs are preserved as provenance but requested only via HTTPS upgrade (no intentional HTTP fallback). A response or content sample is neither article publication verification nor theater coverage nor factual adjudication.",
            "canonical_or_public_artifacts_mutated": False,
            "accepted_packet_bytes_or_hashes_mutated": False,
            "full_theater_coverage_complete": False,
            "may_advance_evidence_cutoff": False,
            "may_change_maps_charts_or_lie_ledger": False,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-universe", type=Path, default=SOURCE_UNIVERSE)
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    parser.add_argument("--max-workers", type=int, default=12)
    options = parser.parse_args()
    sources = load_sources(options.source_universe)
    now = datetime.now(timezone.utc)
    _, end = last_closed_window(now)
    output = options.output_dir / f"rook-source-registry-delta-{end.strftime('%Y%m%dT%H%M')}ET-automated.json"
    if output.exists():
        print(f"EXISTS: {output} (append-only, skipped)")
        return 0
    with ThreadPoolExecutor(max_workers=max(1, min(16, options.max_workers))) as pool:
        results = list(pool.map(probe_one, sources))
    artifact = build_artifact(sources, results, now=now)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as file:
        json.dump(artifact, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(f"OUTPUT={output}")
    print(f"SOURCES={len(results)} RETRIEVED={artifact['retrieved_sample_count']} UNAVAILABLE_OR_BLOCKED={artifact['unavailable_or_blocked_count']}")
    print("SOURCE PROBE ONLY: no certified sweep, canonical advancement, or public publication")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
