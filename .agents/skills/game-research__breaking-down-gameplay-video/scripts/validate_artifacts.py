#!/usr/bin/env python3
"""Validate schemas, lineage, temporal bounds, reconstruction completeness, and review gates."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable

from jsonschema import Draft202012Validator

from common import ToolError, iter_jsonl, read_json, sha256_file

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = PACKAGE_ROOT / "schemas"

JSONL_SCHEMAS = {
    "evidence.jsonl": "evidence-record.schema.json",
    "observations.jsonl": "observation.schema.json",
    "events.jsonl": "event.schema.json",
    "measurements.jsonl": "measurement.schema.json",
    "claims.jsonl": "claim.schema.json",
    "models.jsonl": "candidate-model.schema.json",
    "conflicts.jsonl": "conflict.schema.json",
    "unknowns.jsonl": "unknown.schema.json",
    "review-findings.jsonl": "review-finding.schema.json",
}


class ValidationReport:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.counts: dict[str, int] = {}

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def add_count(self, key: str, amount: int = 1) -> None:
        self.counts[key] = self.counts.get(key, 0) + amount


def load_schema(name: str) -> dict[str, Any]:
    path = SCHEMA_DIR / name
    if not path.is_file():
        raise ToolError(f"schema missing: {path}")
    schema = read_json(path)
    Draft202012Validator.check_schema(schema)
    return schema


def validate_object(report: ValidationReport, value: Any, schema_name: str, label: str) -> None:
    validator = Draft202012Validator(load_schema(schema_name))
    for error in sorted(validator.iter_errors(value), key=lambda item: list(item.absolute_path)):
        dotted = ".".join(str(part) for part in error.absolute_path)
        report.error(f"{label}{'.' + dotted if dotted else ''}: {error.message}")


def load_json(report: ValidationReport, path: Path, schema_name: str, *, required: bool = False) -> dict[str, Any] | None:
    if not path.is_file():
        (report.error if required else report.warn)(f"{path.relative_to(path.parent.parent) if len(path.parents) > 1 else path} is absent")
        return None
    try:
        value = read_json(path)
    except (OSError, json.JSONDecodeError) as exc:
        report.error(f"{path}: {exc}")
        return None
    validate_object(report, value, schema_name, str(path))
    return value


def load_jsonl_records(report: ValidationReport, path: Path, schema_name: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    if not path.is_file():
        return records
    try:
        for line_no, value in iter_jsonl(path):
            validate_object(report, value, schema_name, f"{path}:{line_no}")
            records.append(value)
    except (json.JSONDecodeError, OSError) as exc:
        report.error(f"{path}: {exc}")
    report.add_count(path.name, len(records))
    return records


def index_records(report: ValidationReport, groups: dict[str, list[dict[str, Any]]]) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    by_id: dict[str, dict[str, Any]] = {}
    kinds: dict[str, str] = {}
    for filename, records in groups.items():
        for record in records:
            object_id = record.get("id")
            if not isinstance(object_id, str):
                continue
            if object_id in by_id:
                report.error(f"duplicate canonical ID {object_id}: {kinds[object_id]} and {filename}")
                continue
            by_id[object_id] = record
            kinds[object_id] = filename
    return by_id, kinds


def collect_epistemic(value: Any, path: str = "$") -> list[tuple[str, dict[str, Any]]]:
    found: list[tuple[str, dict[str, Any]]] = []
    if isinstance(value, dict):
        if isinstance(value.get("epistemic"), dict):
            found.append((path + ".epistemic", value["epistemic"]))
        for key, child in value.items():
            found.extend(collect_epistemic(child, path + "." + key))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(collect_epistemic(child, f"{path}[{index}]"))
    return found


def source_pts_bounds(manifest: dict[str, Any]) -> tuple[float, float]:
    timing = manifest.get("timing", {})
    first = timing.get("first_pts_s")
    last = timing.get("last_pts_s")
    if isinstance(first, (int, float)) and isinstance(last, (int, float)) and last >= first:
        # Permit evidence through the final frame's nominal duration.
        tail = timing.get("median_delta_s") or 0.050
        return float(first), float(last) + max(float(tail), 0.001)
    start = manifest.get("format", {}).get("start_time_s")
    start_value = float(start) if isinstance(start, (int, float)) else 0.0
    return start_value, start_value + float(manifest["format"]["duration_s"])


def require_ids(report: ValidationReport, owner: str, ids: Iterable[str], target: dict[str, Any], kind: str) -> None:
    for object_id in ids:
        if object_id not in target:
            report.error(f"{owner} references missing {kind} {object_id}")


def validate_workspace(workspace: Path, verify_hashes: bool) -> ValidationReport:
    report = ValidationReport()
    workspace = workspace.resolve()
    if not workspace.is_dir():
        report.error(f"workspace not found: {workspace}")
        return report

    for schema_path in sorted(SCHEMA_DIR.glob("*.schema.json")):
        try:
            Draft202012Validator.check_schema(read_json(schema_path))
        except Exception as exc:
            report.error(f"invalid packaged schema {schema_path.name}: {exc}")

    workspace_index = load_json(report, workspace / "workspace-index.json", "workspace-index.schema.json")
    observability = load_json(report, workspace / "data/observability.json", "observability.schema.json")
    corpus_index = load_json(report, workspace / "data/corpus/index.json", "corpus-index.schema.json")

    source_manifests: dict[str, dict[str, Any]] = {}
    for path in sorted((workspace / "data/source-manifests").glob("*.json")):
        try:
            value = read_json(path)
            validate_object(report, value, "source-manifest.schema.json", str(path))
            source_id = value["source_id"]
            if source_id in source_manifests:
                report.error(f"duplicate source_id {source_id}")
            source_manifests[source_id] = value
            report.add_count("source_manifests")
            if verify_hashes:
                source_path = Path(value["path"])
                if not source_path.is_file():
                    report.error(f"source file missing for {source_id}: {source_path}")
                elif sha256_file(source_path) != value["sha256"]:
                    report.error(f"source hash mismatch for {source_id}")
        except (OSError, KeyError, json.JSONDecodeError) as exc:
            report.error(f"{path}: {exc}")

    if workspace_index:
        for source_id in workspace_index.get("source_ids", []):
            if source_id not in source_manifests:
                report.error(f"workspace-index references missing source {source_id}")
    if observability:
        for source_id in observability.get("source_ids", []):
            if source_id not in source_manifests:
                report.error(f"observability references missing source {source_id}")

    timeline_path = workspace / "data/timeline.json"
    timeline = load_json(report, timeline_path, "timeline.schema.json")
    if timeline:
        for segment in timeline.get("segments", []):
            source_id = segment.get("source_id")
            manifest = source_manifests.get(source_id)
            if not manifest:
                report.error(f"timeline segment {segment.get('segment_id')} references missing source {source_id}")
                continue
            if segment["source_end_s"] <= segment["source_start_s"]:
                report.error(f"timeline segment {segment['segment_id']} has non-positive source interval")
            if segment["source_end_s"] > float(manifest["format"]["duration_s"]) + 0.050:
                report.error(f"timeline segment {segment['segment_id']} exceeds source duration")
            if (segment["session_start_s"] is None) != (segment["session_end_s"] is None):
                report.error(f"timeline segment {segment['segment_id']} has only one session bound")

    corpus_dir = workspace / "data/corpus"
    records = {
        filename: load_jsonl_records(report, corpus_dir / filename, schema_name)
        for filename, schema_name in JSONL_SCHEMAS.items()
    }
    all_objects, object_kinds = index_records(report, records)
    evidence = {item["id"]: item for item in records["evidence.jsonl"] if isinstance(item.get("id"), str)}
    observations = {item["id"]: item for item in records["observations.jsonl"] if isinstance(item.get("id"), str)}
    events = {item["id"]: item for item in records["events.jsonl"] if isinstance(item.get("id"), str)}
    measurements = {item["id"]: item for item in records["measurements.jsonl"] if isinstance(item.get("id"), str)}
    claims = {item["id"]: item for item in records["claims.jsonl"] if isinstance(item.get("id"), str)}
    models = {item["id"]: item for item in records["models.jsonl"] if isinstance(item.get("id"), str)}
    conflicts = {item["id"]: item for item in records["conflicts.jsonl"] if isinstance(item.get("id"), str)}
    unknowns = {item["id"]: item for item in records["unknowns.jsonl"] if isinstance(item.get("id"), str)}

    if corpus_index:
        expected_counts = {
            "evidence": len(evidence), "observations": len(observations), "events": len(events),
            "measurements": len(measurements), "claims": len(claims), "models": len(models),
            "conflicts": len(conflicts), "unknowns": len(unknowns),
        }
        for key, actual in expected_counts.items():
            declared = corpus_index.get("counts", {}).get(key)
            if declared != actual:
                report.error(f"corpus index count drift for {key}: declared {declared}, actual {actual}")
        for source_id in corpus_index.get("source_ids", []):
            if source_id not in source_manifests:
                report.error(f"corpus index references missing source {source_id}")

    for item in evidence.values():
        source = item["source"]
        source_id = source["source_id"]
        manifest = source_manifests.get(source_id)
        if not manifest:
            report.error(f"evidence {item['id']} references missing source {source_id}")
            continue
        if source["pts_end_s"] < source["pts_start_s"]:
            report.error(f"evidence {item['id']} has inverted PTS interval")
        low, high = source_pts_bounds(manifest)
        if source["pts_start_s"] < low - 0.050 or source["pts_end_s"] > high + 0.050:
            report.error(
                f"evidence {item['id']} interval [{source['pts_start_s']:.3f}, {source['pts_end_s']:.3f}] "
                f"falls outside source PTS bounds [{low:.3f}, {high:.3f}]"
            )
        artifact_path = Path(item["artifact"]["path"])
        if not artifact_path.is_absolute():
            artifact_path = workspace / artifact_path
        if not artifact_path.is_file():
            (report.error if verify_hashes else report.warn)(
                f"evidence artifact missing: {item['id']} -> {artifact_path}"
            )
        elif verify_hashes and sha256_file(artifact_path) != item["artifact"]["sha256"]:
            report.error(f"evidence artifact hash mismatch: {item['id']}")

    for item in observations.values():
        require_ids(report, item["id"], item["evidence_ids"], evidence, "evidence")
    for item in events.values():
        require_ids(report, item["id"], item["evidence_ids"], evidence, "evidence")
        if item["source_id"] not in source_manifests:
            report.error(f"event {item['id']} references missing source {item['source_id']}")
    for item in measurements.values():
        require_ids(report, item["id"], item["evidence_ids"], evidence, "evidence")
        if item["observation_count"] < 1:
            report.error(f"measurement {item['id']} has no observations")
    for item in claims.values():
        require_ids(report, item["id"], item["evidence_ids"], evidence, "evidence")
        require_ids(report, item["id"], item["measurement_ids"], measurements, "measurement")
        require_ids(report, item["id"], item.get("conflicts", []), conflicts, "conflict")
        if item["reconstruction"]["status"] == "UNFILLED":
            report.error(f"claim {item['id']} remains implementation-required but UNFILLED")
        opportunity = item.get("opportunity_record")
        if opportunity and opportunity["occurrences"] > opportunity["opportunities"]:
            report.error(f"claim {item['id']} has more occurrences than opportunities")
    for item in models.values():
        require_ids(report, item["id"], item["target_claim_ids"], claims, "claim")
        require_ids(report, item["id"], item["supporting_evidence_ids"], evidence, "evidence")
        require_ids(report, item["id"], item["contradicting_evidence_ids"], evidence, "evidence")
        require_ids(report, item["id"], item.get("alternatives", []), models, "model")
    for item in conflicts.values():
        for reading in item["readings"]:
            require_ids(report, item["id"], reading["evidence_ids"], evidence, "evidence")
            require_ids(report, item["id"], reading["claim_ids"], claims, "claim")
    for item in unknowns.values():
        require_ids(report, item["id"], item["evidence_ids"], evidence, "evidence")
        require_ids(report, item["id"], item["claim_ids"], claims, "claim")
        if not item["baseline_resolution"].strip():
            report.error(f"unknown {item['id']} has no baseline resolution")

    spec_path = workspace / "spec/baseline-reconstruction.json"
    spec = load_json(report, spec_path, "rebuild-spec.schema.json")
    if spec:
        for ep_path, epistemic in collect_epistemic(spec):
            require_ids(report, f"{spec_path}:{ep_path}", epistemic.get("claim_ids", []), claims, "claim")
            require_ids(report, f"{spec_path}:{ep_path}", epistemic.get("evidence_ids", []), evidence, "evidence")
            if epistemic.get("status") in {"OPEN", "UNIDENTIFIABLE_FROM_FOOTAGE", "OBSERVATIONALLY_EQUIVALENT"}:
                report.error(f"{spec_path}:{ep_path} is not implementation-complete; add a BASELINE_CHOICE while preserving the unresolved source model")

    fixtures_path = workspace / "spec/behavioral-fixtures.json"
    fixture_doc = load_json(report, fixtures_path, "behavioral-fixtures.schema.json")
    fixture_ids: set[str] = set()
    if fixture_doc:
        for fixture in fixture_doc.get("fixtures", []):
            fixture_id = fixture["id"]
            if fixture_id in fixture_ids:
                report.error(f"duplicate fixture ID {fixture_id}")
            fixture_ids.add(fixture_id)
            require_ids(report, fixture_id, fixture.get("evidence_ids", []), evidence, "evidence")
            require_ids(report, fixture_id, fixture.get("claim_ids", []), claims, "claim")
        for system, ids in fixture_doc.get("coverage_by_system", {}).items():
            if not ids:
                report.error(f"fixture coverage for system {system!r} is empty")
            for fixture_id in ids:
                if fixture_id not in fixture_ids:
                    report.error(f"coverage for {system!r} references missing fixture {fixture_id}")

    coverage_path = workspace / "spec/coverage.json"
    coverage = load_json(report, coverage_path, "coverage.schema.json")
    if coverage:
        require_ids(report, "coverage.model_forks", coverage.get("model_forks", []), models, "model")
        require_ids(report, "coverage.baseline_choices", coverage.get("baseline_choices", []), claims, "claim")
        for system, ids in coverage.get("fixture_coverage", {}).items():
            for fixture_id in ids:
                if fixture_id not in fixture_ids:
                    report.error(f"coverage fixture map for {system!r} references missing fixture {fixture_id}")

    review_records = list(records.get("review-findings.jsonl", []))
    for path in sorted((workspace / "data/reviews").glob("*.jsonl")):
        review_records.extend(load_jsonl_records(report, path, "review-finding.schema.json"))
    seen_reviews: set[str] = set()
    for finding in review_records:
        if finding["id"] in seen_reviews:
            report.error(f"duplicate review finding ID {finding['id']}")
        seen_reviews.add(finding["id"])
        for fixture_id in finding.get("regression_fixture_ids", []):
            if fixture_id not in fixture_ids:
                report.error(f"review finding {finding['id']} references missing regression fixture {fixture_id}")
        if finding["severity"] in {"P0", "P1"} and finding["disposition"] in {"OPEN", "PARTIALLY_FIXED"}:
            report.error(f"unresolved {finding['severity']} review finding {finding['id']}")
        if finding["disposition"] == "DECLINED" and not finding["rationale"].strip():
            report.error(f"declined review finding {finding['id']} lacks rationale")

    if not source_manifests:
        report.warn("no source manifests found")
    if all(not values for values in records.values()):
        report.warn("canonical corpus is empty")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("--verify-hashes", action="store_true")
    args = parser.parse_args()
    try:
        report = validate_workspace(args.workspace, args.verify_hashes)
    except ToolError as exc:
        parser.error(str(exc))
        return
    result = {"ok": not report.errors, "errors": report.errors, "warnings": report.warnings, "counts": report.counts}
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if not report.errors else 1)


if __name__ == "__main__":
    main()
