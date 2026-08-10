#!/usr/bin/env python3
"""Validate a completed gameplay-video analysis delivery."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from validate_artifacts import ValidationReport, validate_workspace


BASE_REQUIRED_FILES = (
    "workspace-index.json",
    "data/observability.json",
    "data/timeline.json",
    "data/corpus/index.json",
    "data/reviews/findings.jsonl",
)
REVIEW_FILES = {
    "ACQUISITION": "data/reviews/acquisition-review.md",
    "INFERENCE": "data/reviews/inference-review.md",
    "RECONSTRUCTION": "data/reviews/reconstruction-review.md",
    "PRESENTATION": "data/reviews/presentation-review.md",
}
ROUTE_REVIEW_GATES = {
    "FULL_RECONSTRUCTION": ("ACQUISITION", "INFERENCE", "RECONSTRUCTION", "PRESENTATION"),
    "SYSTEMS_RECONSTRUCTION": ("ACQUISITION", "INFERENCE", "RECONSTRUCTION", "PRESENTATION"),
    "FORENSIC_REPORT": ("ACQUISITION", "INFERENCE", "PRESENTATION"),
    "FEEL_FORENSICS": ("ACQUISITION", "INFERENCE", "PRESENTATION"),
    "PLAYER_REVIEW": ("ACQUISITION", "INFERENCE", "PRESENTATION"),
    "COMPARATIVE": ("ACQUISITION", "INFERENCE", "PRESENTATION"),
    "FOCUSED": ("ACQUISITION", "INFERENCE"),
}
REPORT_ROUTES = frozenset(
    {
        "FULL_RECONSTRUCTION",
        "SYSTEMS_RECONSTRUCTION",
        "FORENSIC_REPORT",
        "FEEL_FORENSICS",
        "PLAYER_REVIEW",
        "COMPARATIVE",
    }
)
RECONSTRUCTION_REQUIRED_FILES = (
    "spec/baseline-reconstruction.json",
    "spec/behavioral-fixtures.json",
    "spec/coverage.json",
    "spec/README.md",
)
FULL_RECONSTRUCTION_REQUIRED_FILES = (
    "data/run-ledger.md",
    "design/preservation-contract.md",
    "design/better.md",
    "design/new.md",
)
NON_EMPTY_REQUIRED_FILES = frozenset(
    path for path in (
        *BASE_REQUIRED_FILES,
        *REVIEW_FILES.values(),
        "report/index.html",
        *RECONSTRUCTION_REQUIRED_FILES,
        *FULL_RECONSTRUCTION_REQUIRED_FILES,
    )
    if path != "data/reviews/findings.jsonl"
)


def _read_route(workspace: Path, report: ValidationReport) -> str | None:
    index_path = workspace / "workspace-index.json"
    if not index_path.is_file():
        return None
    try:
        value = json.loads(index_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        report.error(f"cannot read delivery route from workspace-index.json: {exc}")
        return None
    route = value.get("route")
    if not isinstance(route, str) or not route:
        report.error("workspace-index.json must select a route before delivery validation")
        return None
    return route


def _require_file(workspace: Path, relative_path: str, report: ValidationReport) -> None:
    path = workspace / relative_path
    if not path.is_file():
        report.error(f"required delivery artifact is absent: {relative_path}")
        return
    if relative_path in NON_EMPTY_REQUIRED_FILES and path.stat().st_size == 0:
        report.error(f"required delivery artifact is empty: {relative_path}")


def validate_delivery(workspace: Path, verify_hashes: bool) -> ValidationReport:
    workspace = workspace.resolve()
    report = validate_workspace(workspace, verify_hashes=verify_hashes)

    if not verify_hashes:
        report.error("completed delivery validation requires --verify-hashes")

    route = _read_route(workspace, report)
    if route is not None and route not in ROUTE_REVIEW_GATES:
        report.error(f"unsupported delivery route: {route}")
    required_files = list(BASE_REQUIRED_FILES)
    if route in REPORT_ROUTES:
        required_files.append("report/index.html")
    for gate in ROUTE_REVIEW_GATES.get(route, ()):
        required_files.append(REVIEW_FILES[gate])
    if route in {"FULL_RECONSTRUCTION", "SYSTEMS_RECONSTRUCTION"}:
        required_files.extend(RECONSTRUCTION_REQUIRED_FILES)
    if route == "FULL_RECONSTRUCTION":
        required_files.extend(FULL_RECONSTRUCTION_REQUIRED_FILES)
    elif route == "FEEL_FORENSICS":
        required_files.append("design/preservation-contract.md")
    for relative_path in required_files:
        _require_file(workspace, relative_path, report)

    if report.counts.get("source_manifests", 0) < 1:
        report.error("completed delivery requires at least one valid source manifest")
    if report.counts.get("evidence.jsonl", 0) < 1:
        report.error("completed delivery requires at least one canonical evidence record")

    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("--verify-hashes", action="store_true")
    args = parser.parse_args()
    report = validate_delivery(args.workspace, args.verify_hashes)
    result = {"ok": not report.errors, "errors": report.errors, "warnings": report.warnings, "counts": report.counts}
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if not report.errors else 1)


if __name__ == "__main__":
    main()
