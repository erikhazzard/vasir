#!/usr/bin/env python3
"""Validate package schemas, examples, internal references, Python syntax, and regression tests."""
from __future__ import annotations

import argparse
import compileall
import json
import re
import subprocess
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
EXAMPLE_SCHEMAS = {
    "source-manifest.example.json": "source-manifest.schema.json",
    "timeline.example.json": "timeline.schema.json",
    "observability.example.json": "observability.schema.json",
    "workspace-index.example.json": "workspace-index.schema.json",
    "corpus-index.example.json": "corpus-index.schema.json",
    "evidence-record.example.json": "evidence-record.schema.json",
    "observation.example.json": "observation.schema.json",
    "event.example.json": "event.schema.json",
    "measurement.example.json": "measurement.schema.json",
    "claim.example.json": "claim.schema.json",
    "candidate-model.example.json": "candidate-model.schema.json",
    "conflict.example.json": "conflict.schema.json",
    "unknown.example.json": "unknown.schema.json",
    "frame-manifest.example.json": "frame-manifest.schema.json",
    "review-finding.example.json": "review-finding.schema.json",
    "baseline-reconstruction.example.json": "rebuild-spec.schema.json",
    "behavioral-fixtures.example.json": "behavioral-fixtures.schema.json",
    "coverage.example.json": "coverage.schema.json",
}
REFERENCE_RE = re.compile(r"`((?:references|schemas|templates|scripts|tests)/[^`\s]+)`")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-tests", action="store_true")
    args = parser.parse_args()
    errors: list[str] = []
    checks: dict[str, object] = {}

    schemas: dict[str, dict] = {}
    for path in sorted((ROOT / "schemas").glob("*.schema.json")):
        try:
            schema = json.loads(path.read_text())
            Draft202012Validator.check_schema(schema)
            schemas[path.name] = schema
        except Exception as exc:
            errors.append(f"schema {path.name}: {exc}")
    checks["schemas"] = len(schemas)

    for example_name, schema_name in EXAMPLE_SCHEMAS.items():
        example_path = ROOT / "templates" / example_name
        if not example_path.is_file():
            errors.append(f"missing example {example_path.relative_to(ROOT)}")
            continue
        schema = schemas.get(schema_name)
        if schema is None:
            errors.append(f"missing schema {schema_name} for {example_name}")
            continue
        try:
            Draft202012Validator(schema).validate(json.loads(example_path.read_text()))
        except Exception as exc:
            errors.append(f"example {example_name}: {exc}")
    checks["examples"] = len(EXAMPLE_SCHEMAS)

    markdown = [ROOT / "SKILL.md", ROOT / "README.md", *sorted((ROOT / "references").glob("*.md")), ROOT / "scripts/README.md", ROOT / "tests/README.md"]
    internal_refs = 0
    for doc in markdown:
        if not doc.is_file():
            errors.append(f"missing document {doc.relative_to(ROOT)}")
            continue
        for match in REFERENCE_RE.finditer(doc.read_text()):
            internal_refs += 1
            target = ROOT / match.group(1).rstrip(".,;:")
            if not target.exists():
                errors.append(f"{doc.relative_to(ROOT)} references missing {target.relative_to(ROOT)}")
    checks["internal_references"] = internal_refs

    compiled = compileall.compile_dir(ROOT / "scripts", quiet=1) and compileall.compile_dir(ROOT / "tests", quiet=1)
    if not compiled:
        errors.append("Python compilation failed")
    checks["python_compiles"] = compiled

    tests = {"status": "SKIPPED"}
    if not args.skip_tests and not errors:
        proc = subprocess.run(
            [sys.executable, "-m", "pytest", "-q"], cwd=ROOT,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )
        tests = {"status": "PASSED" if proc.returncode == 0 else "FAILED", "output": proc.stdout.strip()}
        if proc.returncode != 0:
            errors.append("regression tests failed")
    checks["tests"] = tests

    print(json.dumps({"ok": not errors, "errors": errors, "checks": checks}, indent=2))
    raise SystemExit(0 if not errors else 1)


if __name__ == "__main__":
    main()
