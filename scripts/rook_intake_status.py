#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = ROOT / "data" / "evidence-integration"
MANIFEST_PATH = ROOT / "data" / "canonical-ledger" / "manifest-v2.json"

SWEEP_ROLE = "ROOK_FULL_EVIDENCE_LOCKER_SWEEP"
SOURCE_REGISTRY_ROLE = "ROOK_EVIDENCE_LOCKER_SOURCE_REGISTRY_DELTA"
SOURCE_DISCOVERY_ROLE = "EVIDENCE_LOCKER_SOURCE_DISCOVERY_DELTA"
INTAKE_ROLES = {SWEEP_ROLE, SOURCE_REGISTRY_ROLE, SOURCE_DISCOVERY_ROLE}
BOUNDARY_TOLERANCE = timedelta(minutes=5)
WRITE_POLICY = "APPEND_ONLY_EVIDENCE_LOCKER_NO_CANONICAL_OR_PUBLIC_MUTATION"


@dataclass(frozen=True)
class Sweep:
    path: str
    start: datetime
    end: datetime
    timezone_name: str
    data: dict[str, Any]


def parse_timestamp(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label}: expected non-empty ISO-8601 timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{label}: invalid ISO-8601 timestamp {value!r}") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"{label}: timestamp must include an explicit UTC offset")
    return parsed


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"{path.relative_to(ROOT)}: invalid JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"{path.relative_to(ROOT)}: top level must be an object")
    return value


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def iter_intake_artifacts() -> Iterable[tuple[Path, dict[str, Any]]]:
    if not EVIDENCE_DIR.exists():
        return
    for path in sorted(EVIDENCE_DIR.glob("*.json")):
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(value, dict) and value.get("artifact_role") in INTAKE_ROLES:
            yield path, value


def changed_paths(base_ref: str) -> list[tuple[str, str]]:
    if not base_ref or set(base_ref) == {"0"}:
        return []
    proc = subprocess.run(
        ["git", "diff", "--name-status", f"{base_ref}...HEAD"],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    rows: list[tuple[str, str]] = []
    for line in proc.stdout.splitlines():
        if line.strip():
            parts = line.split("\t")
            rows.append((parts[0], parts[-1]))
    return rows


def validate_sweep(
    path: Path,
    data: dict[str, Any],
    as_of: datetime,
    errors: list[str],
    *,
    require_modern_contract: bool = False,
) -> Sweep | None:
    rel = relative(path)
    if data.get("authority") != "ROOK_UPSTREAM_COLLECTION":
        errors.append(f"{rel}: authority must be ROOK_UPSTREAM_COLLECTION")

    canonical_boundary = data.get("canonical_boundary")
    legacy_policy = canonical_boundary.get("write_policy") if isinstance(canonical_boundary, dict) else None
    policy = data.get("write_policy") or legacy_policy
    if policy != WRITE_POLICY:
        errors.append(f"{rel}: write_policy must preserve append-only upstream-only semantics")
    if require_modern_contract and data.get("write_policy") != WRITE_POLICY:
        errors.append(f"{rel}: newly appended sweep must carry top-level write_policy")

    scope = data.get("scope")
    if not isinstance(scope, dict):
        errors.append(f"{rel}: missing scope object")
        return None
    try:
        start = parse_timestamp(scope.get("window_start"), f"{rel} scope.window_start")
        end = parse_timestamp(scope.get("window_end"), f"{rel} scope.window_end")
    except ValueError as exc:
        errors.append(str(exc))
        return None

    if end <= start:
        errors.append(f"{rel}: window_end must be later than window_start")
    if end > as_of + BOUNDARY_TOLERANCE:
        errors.append(f"{rel}: window_end is implausibly in the future relative to validation time")
    timezone_name = scope.get("timezone")
    if not isinstance(timezone_name, str) or not timezone_name:
        errors.append(f"{rel}: scope.timezone must be present")

    completion = data.get("completion")
    if isinstance(completion, dict):
        status = str(completion.get("status") or "")
        if not status.startswith("COMPLETE"):
            errors.append(f"{rel}: completion.status does not identify a completed sweep")
        for key in ("canonical_or_public_artifacts_mutated", "accepted_packet_bytes_or_hashes_mutated"):
            if completion.get(key) is not False:
                errors.append(f"{rel}: completion.{key} must be false for upstream intake")
    elif require_modern_contract:
        errors.append(f"{rel}: newly appended sweep must carry completion metadata")
    elif not (isinstance(canonical_boundary, dict) and legacy_policy == WRITE_POLICY):
        errors.append(f"{rel}: missing completion object and no recognized legacy canonical_boundary contract")

    ids: set[str] = set()
    for collection_name, id_name in (
        ("new_events", "event_id"),
        ("existing_event_updates", "update_id"),
        ("claims_and_corrections", "claim_id"),
        ("economic_energy_updates", "economic_id"),
    ):
        rows = data.get(collection_name, [])
        if rows is None:
            continue
        if not isinstance(rows, list):
            errors.append(f"{rel}: {collection_name} must be a list")
            continue
        for index, row in enumerate(rows):
            if not isinstance(row, dict):
                errors.append(f"{rel}: {collection_name}[{index}] must be an object")
                continue
            if collection_name == "existing_event_updates":
                if not isinstance(row.get("updates_existing_ref"), str) or not row.get("updates_existing_ref"):
                    errors.append(f"{rel}: existing_event_updates[{index}] must identify updates_existing_ref")
                if not isinstance(row.get("relationship"), str) or not row.get("relationship"):
                    errors.append(f"{rel}: existing_event_updates[{index}] must identify the later-evidence relationship")
            identity = row.get(id_name)
            if identity is None:
                continue
            if not isinstance(identity, str) or not identity:
                errors.append(f"{rel}: {collection_name}[{index}].{id_name} must be a non-empty string")
                continue
            if identity in ids:
                errors.append(f"{rel}: duplicate intake identity {identity}")
            ids.add(identity)

    return Sweep(rel, start, end, str(timezone_name or ""), data)


def validate_source_registry(path: Path, data: dict[str, Any], as_of: datetime, errors: list[str]) -> tuple[datetime, datetime] | None:
    rel = relative(path)
    if data.get("authority") != "ROOK_UPSTREAM_COLLECTION":
        errors.append(f"{rel}: authority must be ROOK_UPSTREAM_COLLECTION")
    window = data.get("sweep_window")
    if not isinstance(window, dict):
        errors.append(f"{rel}: missing sweep_window")
        return None
    try:
        start = parse_timestamp(window.get("start"), f"{rel} sweep_window.start")
        end = parse_timestamp(window.get("end"), f"{rel} sweep_window.end")
    except ValueError as exc:
        errors.append(str(exc))
        return None
    if end <= start:
        errors.append(f"{rel}: sweep_window.end must be later than start")
    if end > as_of + BOUNDARY_TOLERANCE:
        errors.append(f"{rel}: sweep_window.end is implausibly in the future")
    sources = data.get("sources")
    if not isinstance(sources, list):
        errors.append(f"{rel}: sources must be a list")
        return (start, end)
    if data.get("source_count") != len(sources):
        errors.append(f"{rel}: source_count does not match sources length")
    seen: set[str] = set()
    for index, source in enumerate(sources):
        if not isinstance(source, dict):
            errors.append(f"{rel}: sources[{index}] must be an object")
            continue
        source_id = source.get("source_id")
        if not isinstance(source_id, str) or not source_id:
            errors.append(f"{rel}: sources[{index}].source_id missing")
        elif source_id in seen:
            errors.append(f"{rel}: duplicate source_id {source_id}")
        else:
            seen.add(source_id)
    return (start, end)


def validate_source_discovery(path: Path, data: dict[str, Any], as_of: datetime, errors: list[str]) -> datetime | None:
    rel = relative(path)
    if data.get("authority") != "ROOK_UPSTREAM_COLLECTION":
        errors.append(f"{rel}: authority must be ROOK_UPSTREAM_COLLECTION")
    try:
        cutoff = parse_timestamp(data.get("collection_cutoff"), f"{rel} collection_cutoff")
    except ValueError as exc:
        errors.append(str(exc))
        return None
    if cutoff > as_of + BOUNDARY_TOLERANCE:
        errors.append(f"{rel}: collection_cutoff is implausibly in the future")
    rows = data.get("sources")
    if not isinstance(rows, list):
        errors.append(f"{rel}: sources must be a list")
        return cutoff
    if data.get("discovery_count") != len(rows):
        errors.append(f"{rel}: discovery_count does not match sources length")
    rule = str(data.get("preservation_rule") or "").lower()
    if "append" not in rule or ("do not remove" not in rule and "not remove" not in rule):
        errors.append(f"{rel}: preservation_rule must explicitly preserve prior standing sources")
    seen: set[str] = set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f"{rel}: sources[{index}] must be an object")
            continue
        key = str(row.get("url") or row.get("source_name") or "").strip().lower()
        if not key:
            errors.append(f"{rel}: sources[{index}] lacks source_name/url identity")
        elif key in seen:
            errors.append(f"{rel}: duplicate discovered standing source {key}")
        else:
            seen.add(key)
    return cutoff


def packet_consumers(sweep: Sweep, accepted_updates: list[dict[str, Any]]) -> list[dict[str, str]]:
    consumers: list[dict[str, str]] = []
    for entry in accepted_updates:
        packet_path = entry.get("path")
        if not isinstance(packet_path, str):
            continue
        path = ROOT / packet_path
        if not path.exists():
            continue
        packet = load_json(path)
        if packet.get("status") != "ACCEPTED":
            continue
        provenance = packet.get("upstream_provenance")
        if isinstance(provenance, dict):
            artifacts = provenance.get("locker_artifacts", [])
            if isinstance(artifacts, list) and sweep.path in artifacts:
                consumers.append({"packet_id": str(packet.get("packet_id")), "mode": "EXPLICIT_LOCKER_PROVENANCE"})
                continue
        try:
            cutoff = parse_timestamp(packet.get("evidence_cutoff"), f"{packet_path} evidence_cutoff")
        except ValueError:
            continue
        packet_id = str(packet.get("packet_id") or "")
        if cutoff == sweep.end and "ROOK" in packet_id:
            consumers.append({"packet_id": packet_id, "mode": "LEGACY_EXACT_CUTOFF_ROOK_PACKET"})
    return consumers


def intake_path_or_role(path: str, role: Any) -> bool:
    name = Path(path).name
    return (
        name.startswith("rook-evidence-locker-sweep-")
        or name.startswith("rook-source-registry-delta-")
        or name.startswith("source-discovery-")
        or role in INTAKE_ROLES
    )


def validate_append_only_compare(rows: list[tuple[str, str]], errors: list[str]) -> set[str]:
    added: set[str] = set()
    for status, path in rows:
        if not path.startswith("data/evidence-integration/"):
            continue
        current = ROOT / path
        role = None
        if current.exists() and current.suffix == ".json":
            try:
                role = load_json(current).get("artifact_role")
            except ValueError:
                pass
        if intake_path_or_role(path, role):
            if status != "A":
                errors.append(f"{path}: upstream intake history is append-only; change status {status} is not permitted")
            else:
                added.add(path)
    return added


def validate_repository(as_of: datetime | None = None, compare_ref: str = "") -> dict[str, Any]:
    as_of = as_of or datetime.now(timezone.utc)
    errors: list[str] = []
    warnings: list[str] = []
    compare_rows = changed_paths(compare_ref) if compare_ref else []
    added_intake_paths = validate_append_only_compare(compare_rows, errors) if compare_rows else set()

    sweeps: list[Sweep] = []
    registries: list[dict[str, Any]] = []
    discoveries: list[dict[str, Any]] = []
    for path, data in iter_intake_artifacts():
        role = data.get("artifact_role")
        rel = relative(path)
        if role == SWEEP_ROLE:
            sweep = validate_sweep(
                path,
                data,
                as_of,
                errors,
                require_modern_contract=rel in added_intake_paths,
            )
            if sweep:
                sweeps.append(sweep)
        elif role == SOURCE_REGISTRY_ROLE:
            window = validate_source_registry(path, data, as_of, errors)
            if window:
                registries.append({"path": rel, "start": window[0], "end": window[1]})
        elif role == SOURCE_DISCOVERY_ROLE:
            cutoff = validate_source_discovery(path, data, as_of, errors)
            if cutoff:
                discoveries.append({"path": rel, "cutoff": cutoff})

    sweeps.sort(key=lambda item: (item.start, item.end, item.path))
    by_window: dict[tuple[datetime, datetime], list[str]] = {}
    for sweep in sweeps:
        by_window.setdefault((sweep.start, sweep.end), []).append(sweep.path)
    for (start, end), paths in by_window.items():
        if len(paths) > 1:
            errors.append(f"duplicate sweep window {start.isoformat()}..{end.isoformat()}: {', '.join(paths)}")

    boundary_notes: list[dict[str, Any]] = []
    for previous, current in zip(sweeps, sweeps[1:]):
        delta = current.start - previous.end
        if abs(delta) <= BOUNDARY_TOLERANCE:
            if delta != timedelta(0):
                boundary_notes.append({
                    "type": "BOUNDARY_VARIATION",
                    "seconds": int(delta.total_seconds()),
                    "previous": previous.path,
                    "current": current.path,
                })
        elif delta < timedelta(0):
            errors.append(
                f"suspicious overlapping sweep windows: {previous.path} ends {previous.end.isoformat()} "
                f"after {current.path} starts {current.start.isoformat()}"
            )
        else:
            warnings.append(f"collection gap of {delta} between {previous.path} and {current.path}")

    for registry in registries:
        overlaps = [s.path for s in sweeps if registry["start"] < s.end and registry["end"] > s.start]
        registry["associated_sweeps"] = overlaps
        if not overlaps:
            warnings.append(f"{registry['path']}: source-registry delta does not overlap a known completed sweep")

    for discovery in discoveries:
        associated = [
            s.path for s in sweeps
            if s.start - BOUNDARY_TOLERANCE <= discovery["cutoff"] <= s.end + BOUNDARY_TOLERANCE
        ]
        discovery["associated_sweeps"] = associated
        if not associated:
            warnings.append(f"{discovery['path']}: source-discovery cutoff does not align with a known completed sweep")

    manifest = load_json(MANIFEST_PATH)
    accepted_updates = manifest.get("accepted_updates", [])
    if not isinstance(accepted_updates, list):
        errors.append("data/canonical-ledger/manifest-v2.json: accepted_updates must be a list")
        accepted_updates = []
    latest_cutoff = parse_timestamp(
        manifest.get("current_evidence_cutoff"),
        "data/canonical-ledger/manifest-v2.json current_evidence_cutoff",
    )

    sweep_rows: list[dict[str, Any]] = []
    for sweep in sweeps:
        consumers = packet_consumers(sweep, accepted_updates)
        if len(consumers) > 1:
            errors.append(
                f"{sweep.path}: duplicate accepted consumption: "
                + ", ".join(item["packet_id"] for item in consumers)
            )
        if not consumers and sweep.end <= latest_cutoff:
            errors.append(
                f"{sweep.path}: completed sweep ends at/before accepted canonical cutoff "
                f"{latest_cutoff.isoformat()} but has no accepted ROOK packet provenance"
            )
        sweep_rows.append({
            "path": sweep.path,
            "window_start": sweep.start.isoformat(),
            "window_end": sweep.end.isoformat(),
            "consumed": bool(consumers),
            "consumers": consumers,
            "unconsumed": not consumers,
        })

    return {
        "schema_version": "1.0",
        "artifact_role": "ROOK_INTAKE_DISCOVERY_REPORT",
        "latest_accepted_canonical_evidence_cutoff": latest_cutoff.isoformat(),
        "completed_sweeps": sweep_rows,
        "unconsumed_sweeps": [row for row in sweep_rows if row["unconsumed"]],
        "source_registry_deltas": [
            {**item, "start": item["start"].isoformat(), "end": item["end"].isoformat()}
            for item in registries
        ],
        "source_discovery_deltas": [
            {**item, "cutoff": item["cutoff"].isoformat()}
            for item in discoveries
        ],
        "boundary_notes": boundary_notes,
        "warnings": warnings,
        "errors": errors,
        "valid": not errors,
    }


def render_text(report: dict[str, Any]) -> str:
    lines = [
        f"Latest accepted canonical evidence cutoff: {report['latest_accepted_canonical_evidence_cutoff']}",
        f"Completed ROOK sweeps: {len(report['completed_sweeps'])}",
        f"Unconsumed completed sweeps: {len(report['unconsumed_sweeps'])}",
    ]
    for row in report["completed_sweeps"]:
        state = "CONSUMED" if row["consumed"] else "UNCONSUMED"
        lines.append(f"- {state}: {row['window_start']} -> {row['window_end']}  {row['path']}")
        for consumer in row["consumers"]:
            lines.append(f"  accepted by {consumer['packet_id']} ({consumer['mode']})")
    for warning in report["warnings"]:
        lines.append(f"WARNING: {warning}")
    for error in report["errors"]:
        lines.append(f"ERROR: {error}")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate and report the ROOK upstream evidence-locker intake contract.")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("validate", "report"):
        child = sub.add_parser(name)
        child.add_argument("--compare-ref", default="")
        child.add_argument("--as-of", default="")
        child.add_argument("--json-out", default="")
    args = parser.parse_args()
    as_of = parse_timestamp(args.as_of, "--as-of") if args.as_of else None
    report = validate_repository(as_of=as_of, compare_ref=args.compare_ref)
    print(render_text(report))
    if args.json_out:
        output = Path(args.json_out)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if args.command == "validate" and not report["valid"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
