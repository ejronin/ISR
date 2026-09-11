#!/usr/bin/env python3
"""Prove that the live Pages site serves the exact qualified release artifact."""
from __future__ import annotations

import argparse
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def load_json_bytes(path: Path, label: str) -> tuple[bytes, dict]:
    try:
        raw = path.read_bytes()
    except FileNotFoundError as exc:
        raise ValueError(f"missing expected {label}: {path}") from exc
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"malformed expected {label}: {path}") from exc
    if not isinstance(payload, dict):
        raise ValueError(f"expected {label} must be a JSON object")
    return raw, payload


def fetch_bytes(base_url: str, relative: str, token: str, timeout: float) -> bytes:
    url = urljoin(base_url.rstrip("/") + "/", relative)
    separator = "&" if "?" in url else "?"
    url = f"{url}{separator}{urlencode({'atlas_attestation': token})}"
    request = Request(
        url,
        headers={
            "Accept": "application/json, text/plain;q=0.9, */*;q=0.1",
            "Cache-Control": "no-cache, no-store, max-age=0",
            "Pragma": "no-cache",
            "User-Agent": "atlas-release-attestation/1.0",
        },
        method="GET",
    )
    with urlopen(request, timeout=timeout) as response:
        status = getattr(response, "status", 200)
        if status != 200:
            raise ValueError(f"{relative} returned HTTP {status}")
        return response.read()


def parse_json(raw: bytes, label: str) -> dict:
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"live {label} is not valid JSON") from exc
    if not isinstance(value, dict):
        raise ValueError(f"live {label} must be a JSON object")
    return value


def validate_expected(
    expected_commit: str,
    manifest_raw: bytes,
    manifest: dict,
    state_raw: bytes,
    state: dict,
    build_info: dict,
) -> dict:
    if build_info.get("commit_sha") != expected_commit:
        raise ValueError("qualified build-info commit SHA does not match the requested attestation SHA")
    if manifest.get("artifact_role") != "PUBLIC_APPLICATION_RELEASE_MANIFEST":
        raise ValueError("qualified public-release manifest role is invalid")
    current = manifest.get("current_state") or {}
    expected_state_sha = current.get("sha256")
    expected_state_bytes = current.get("bytes")
    if sha256(state_raw) != expected_state_sha:
        raise ValueError("qualified current-state bytes do not match qualified manifest SHA-256")
    if len(state_raw) != expected_state_bytes:
        raise ValueError("qualified current-state byte count does not match qualified manifest")
    release = state.get("release") or {}
    if release.get("release_identity") != current.get("release_identity"):
        raise ValueError("qualified current-state release identity does not match qualified manifest")
    if release.get("current_osint_cutoff") != current.get("current_osint_cutoff"):
        raise ValueError("qualified current-state evidence cutoff does not match qualified manifest")
    if build_info.get("current_review_cutoff") != current.get("current_osint_cutoff"):
        raise ValueError("qualified build-info evidence cutoff does not match qualified manifest")
    return {
        "commit_sha": expected_commit,
        "public_release_identity": manifest.get("release_identity"),
        "public_release_manifest_sha256": sha256(manifest_raw),
        "current_state_sha256": expected_state_sha,
        "current_state_bytes": expected_state_bytes,
        "current_state_release_identity": current.get("release_identity"),
        "evidence_cutoff": current.get("current_osint_cutoff"),
        "canonical_state_sha256": build_info.get("canonical_state_sha256"),
    }


def validate_live(
    expected: dict,
    expected_manifest_raw: bytes,
    expected_state_raw: bytes,
    live_build_raw: bytes,
    live_manifest_raw: bytes,
    live_state_raw: bytes,
) -> dict:
    live_build = parse_json(live_build_raw, "build-info.json")
    live_manifest = parse_json(live_manifest_raw, "public-release.json")
    live_state = parse_json(live_state_raw, "public-current-state.json")

    if live_build.get("commit_sha") != expected["commit_sha"]:
        raise ValueError(
            f"live commit SHA mismatch: {live_build.get('commit_sha')} != {expected['commit_sha']}"
        )
    if live_manifest_raw != expected_manifest_raw:
        raise ValueError("live public-release manifest bytes differ from the qualified manifest")
    if sha256(live_manifest_raw) != expected["public_release_manifest_sha256"]:
        raise ValueError("live public-release manifest digest differs from the qualified manifest")
    if live_manifest.get("release_identity") != expected["public_release_identity"]:
        raise ValueError("live public release identity differs from the qualified release")

    current = live_manifest.get("current_state") or {}
    if current.get("sha256") != expected["current_state_sha256"]:
        raise ValueError("live manifest current-state SHA differs from the qualified release")
    if current.get("bytes") != expected["current_state_bytes"]:
        raise ValueError("live manifest current-state byte count differs from the qualified release")
    if current.get("current_osint_cutoff") != expected["evidence_cutoff"]:
        raise ValueError("live manifest evidence cutoff differs from the qualified release")

    if live_state_raw != expected_state_raw:
        raise ValueError("live current-state bytes differ from the qualified current-state artifact")
    if sha256(live_state_raw) != expected["current_state_sha256"]:
        raise ValueError("live current-state digest differs from the qualified release")
    if len(live_state_raw) != expected["current_state_bytes"]:
        raise ValueError("live current-state byte count differs from the qualified release")
    live_release = live_state.get("release") or {}
    if live_release.get("release_identity") != expected["current_state_release_identity"]:
        raise ValueError("live current-state release identity differs from the qualified release")
    if live_release.get("current_osint_cutoff") != expected["evidence_cutoff"]:
        raise ValueError("live current-state evidence cutoff differs from the qualified release")
    if live_build.get("current_review_cutoff") != expected["evidence_cutoff"]:
        raise ValueError("live build-info evidence cutoff differs from the qualified release")
    if expected.get("canonical_state_sha256") and live_build.get("canonical_state_sha256") != expected["canonical_state_sha256"]:
        raise ValueError("live build-info canonical-state digest differs from the qualified release")

    return {
        "live_build_info_sha256": sha256(live_build_raw),
        "live_public_release_manifest_sha256": sha256(live_manifest_raw),
        "live_current_state_sha256": sha256(live_state_raw),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--expected-commit", required=True)
    parser.add_argument("--expected-manifest", required=True)
    parser.add_argument("--expected-state", required=True)
    parser.add_argument("--expected-build-info", required=True)
    parser.add_argument("--output", default="deployment-attestation.json")
    parser.add_argument("--repository", default="")
    parser.add_argument("--workflow-name", default="")
    parser.add_argument("--workflow-run-id", default="")
    parser.add_argument("--workflow-run-attempt", default="")
    parser.add_argument("--deployment-id", default="")
    parser.add_argument("--attempts", type=int, default=24)
    parser.add_argument("--delay-seconds", type=float, default=5.0)
    parser.add_argument("--timeout-seconds", type=float, default=15.0)
    args = parser.parse_args()

    manifest_raw, manifest = load_json_bytes(Path(args.expected_manifest), "public release manifest")
    state_raw, state = load_json_bytes(Path(args.expected_state), "public current state")
    _build_raw, build_info = load_json_bytes(Path(args.expected_build_info), "build info")
    expected = validate_expected(args.expected_commit, manifest_raw, manifest, state_raw, state, build_info)

    last_error: Exception | None = None
    successful_attempt = 0
    live_hashes: dict | None = None
    for attempt in range(1, max(1, args.attempts) + 1):
        token = f"{args.expected_commit[:12]}-{attempt}-{time.time_ns()}"
        try:
            live_build_raw = fetch_bytes(args.base_url, "build-info.json", token, args.timeout_seconds)
            live_manifest_raw = fetch_bytes(args.base_url, "data/public-release.json", token, args.timeout_seconds)
            live_state_raw = fetch_bytes(args.base_url, "data/public-current-state.json", token, args.timeout_seconds)
            live_hashes = validate_live(
                expected,
                manifest_raw,
                state_raw,
                live_build_raw,
                live_manifest_raw,
                live_state_raw,
            )
            successful_attempt = attempt
            break
        except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
            last_error = exc
            if attempt < args.attempts:
                time.sleep(max(0.0, args.delay_seconds))

    if live_hashes is None:
        raise SystemExit(f"FAIL: live deployment never matched qualified release: {last_error}")

    attestation = {
        "schema_version": "1.0",
        "artifact_role": "LIVE_DEPLOYMENT_ATTESTATION",
        "status": "ATTESTED",
        "attested_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "repository": args.repository or None,
        "workflow": {
            "name": args.workflow_name or None,
            "run_id": args.workflow_run_id or None,
            "run_attempt": args.workflow_run_attempt or None,
            "deployment_id": args.deployment_id or None,
        },
        "public_url": args.base_url,
        "attempt": successful_attempt,
        "qualified": expected,
        "observed": live_hashes,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(attestation, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    print(
        "live-deployment-attestation: PASS - "
        f"commit={expected['commit_sha']} release={expected['public_release_identity']} "
        f"cutoff={expected['evidence_cutoff']} attempt={successful_attempt}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
