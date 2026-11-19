#!/usr/bin/env python3
"""Write an immutable, content-addressed provenance record for a pipeline stage."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


def sha256(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def inventory(path: Path, project: Path) -> list[dict]:
    paths = [path]
    if path.is_dir():
        paths = sorted(item for item in path.rglob("*") if item.is_file())
    records = []
    for item in paths:
        records.append(
            {
                "path": str(item.resolve().relative_to(project)),
                "bytes": item.stat().st_size,
                "sha256": sha256(item),
            }
        )
    return records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True, type=Path)
    parser.add_argument("--stage", required=True)
    parser.add_argument("--code", action="append", default=[], type=Path)
    parser.add_argument("--input", action="append", default=[], type=Path)
    parser.add_argument("--output", action="append", default=[], type=Path)
    parser.add_argument("--output-glob", action="append", default=[])
    parser.add_argument("--config-json", default="{}")
    args = parser.parse_args()
    project = args.project.resolve()
    destination = project / "provenance/stages" / f"{args.stage}.json"
    if destination.exists():
        raise SystemExit(f"stage record already exists and is immutable: {destination}")
    payload = {
        "schema_version": 1,
        "stage": args.stage,
        "configuration": json.loads(args.config_json),
        "code": [record for path in args.code for record in inventory(path.resolve(), project)],
        "inputs": [record for path in args.input for record in inventory(path.resolve(), project)],
        "outputs": (
            [record for path in args.output for record in inventory(path.resolve(), project)]
            + [
                record
                for pattern in args.output_glob
                for path in sorted(project.glob(pattern))
                for record in inventory(path.resolve(), project)
            ]
        ),
    }
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    payload["record_content_sha256"] = hashlib.sha256(canonical).hexdigest()
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, destination)
    print(f"recorded {args.stage}: {len(payload['outputs'])} output files")


if __name__ == "__main__":
    main()
