from __future__ import annotations

import hashlib
import json
from pathlib import Path

import validate_delivery as delivery_module
from init_workspace import run as init_workspace_run
from validate_artifacts import ValidationReport


def test_initialized_workspace_is_not_a_completed_delivery(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    init_workspace_run(workspace, "empty-delivery", route="FULL_RECONSTRUCTION")

    report = delivery_module.validate_delivery(workspace, verify_hashes=True)

    assert report.errors
    assert "completed delivery requires at least one valid source manifest" in report.errors
    assert "completed delivery requires at least one canonical evidence record" in report.errors
    assert "required delivery artifact is absent: report/index.html" in report.errors
    assert "required delivery artifact is absent: data/reviews/acquisition-review.md" in report.errors
    assert "required delivery artifact is absent: spec/baseline-reconstruction.json" in report.errors


def test_completed_delivery_requires_hash_verification(tmp_path: Path, monkeypatch) -> None:
    workspace = tmp_path / "workspace"
    init_workspace_run(workspace, "hash-gate", route="FOCUSED")
    monkeypatch.setattr(delivery_module, "validate_workspace", lambda _workspace, verify_hashes: ValidationReport())

    report = delivery_module.validate_delivery(workspace, verify_hashes=False)

    assert "completed delivery validation requires --verify-hashes" in report.errors


def test_full_delivery_layer_accepts_present_artifacts_and_non_empty_corpus(tmp_path: Path, monkeypatch) -> None:
    workspace = tmp_path / "workspace"
    init_workspace_run(workspace, "complete-delivery", route="FULL_RECONSTRUCTION")
    for relative_path in (
        *delivery_module.BASE_REQUIRED_FILES,
        *delivery_module.REVIEW_FILES.values(),
        "report/index.html",
        *delivery_module.RECONSTRUCTION_REQUIRED_FILES,
        *delivery_module.FULL_RECONSTRUCTION_REQUIRED_FILES,
    ):
        path = workspace / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or (relative_path in delivery_module.NON_EMPTY_REQUIRED_FILES and path.stat().st_size == 0):
            path.write_text("validated\n", encoding="utf-8")

    base_report = ValidationReport()
    base_report.add_count("source_manifests")
    base_report.add_count("evidence.jsonl")
    monkeypatch.setattr(delivery_module, "validate_workspace", lambda _workspace, verify_hashes: base_report)

    report = delivery_module.validate_delivery(workspace, verify_hashes=True)

    assert not report.errors


def test_focused_delivery_does_not_require_report_or_reconstruction_artifacts(tmp_path: Path, monkeypatch) -> None:
    workspace = tmp_path / "workspace"
    init_workspace_run(workspace, "focused-delivery", route="FOCUSED")
    for relative_path in (
        *delivery_module.BASE_REQUIRED_FILES,
        delivery_module.REVIEW_FILES["ACQUISITION"],
        delivery_module.REVIEW_FILES["INFERENCE"],
    ):
        path = workspace / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or (relative_path in delivery_module.NON_EMPTY_REQUIRED_FILES and path.stat().st_size == 0):
            path.write_text("validated\n", encoding="utf-8")

    base_report = ValidationReport()
    base_report.add_count("source_manifests")
    base_report.add_count("evidence.jsonl")
    monkeypatch.setattr(delivery_module, "validate_workspace", lambda _workspace, verify_hashes: base_report)

    report = delivery_module.validate_delivery(workspace, verify_hashes=True)

    assert not report.errors


def test_forensic_report_requires_report_but_not_reconstruction_artifacts(tmp_path: Path, monkeypatch) -> None:
    workspace = tmp_path / "workspace"
    init_workspace_run(workspace, "report-delivery", route="FOCUSED")
    workspace_index = workspace / "workspace-index.json"
    workspace_index.write_text(
        workspace_index.read_text(encoding="utf-8").replace('"FOCUSED"', '"FORENSIC_REPORT"'),
        encoding="utf-8",
    )
    for relative_path in (
        *delivery_module.BASE_REQUIRED_FILES,
        delivery_module.REVIEW_FILES["ACQUISITION"],
        delivery_module.REVIEW_FILES["INFERENCE"],
        delivery_module.REVIEW_FILES["PRESENTATION"],
        "report/index.html",
    ):
        path = workspace / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or (relative_path in delivery_module.NON_EMPTY_REQUIRED_FILES and path.stat().st_size == 0):
            path.write_text("validated\n", encoding="utf-8")

    base_report = ValidationReport()
    base_report.add_count("source_manifests")
    base_report.add_count("evidence.jsonl")
    monkeypatch.setattr(delivery_module, "validate_workspace", lambda _workspace, verify_hashes: base_report)

    report = delivery_module.validate_delivery(workspace, verify_hashes=True)

    assert not report.errors
    assert not any("spec/" in error or "design/" in error for error in report.errors)


def test_delivery_hash_verification_rejects_missing_evidence_artifact(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    init_workspace_run(workspace, "missing-artifact", route="FOCUSED")
    package_root = Path(__file__).resolve().parents[1]

    source_path = workspace / "source/gameplay.mp4"
    source_path.write_bytes(b"synthetic source")
    source_manifest = json.loads(
        (package_root / "templates/source-manifest.example.json").read_text(encoding="utf-8")
    )
    source_manifest["path"] = str(source_path)
    source_manifest["sha256"] = hashlib.sha256(source_path.read_bytes()).hexdigest()
    (workspace / "data/source-manifests/source_001.json").write_text(
        json.dumps(source_manifest) + "\n",
        encoding="utf-8",
    )

    evidence = (package_root / "templates/evidence-record.example.json").read_text(encoding="utf-8").strip()
    (workspace / "data/corpus/evidence.jsonl").write_text(evidence + "\n", encoding="utf-8")

    report = delivery_module.validate_delivery(workspace, verify_hashes=True)

    assert any(error.startswith("evidence artifact missing: ev_reload_007") for error in report.errors), "\n".join(
        report.errors
    )
