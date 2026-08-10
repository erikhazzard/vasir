#!/usr/bin/env python3
"""Initialize the self-contained gameplay-video analysis workspace."""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from common import SCRIPT_VERSION, ToolError, utc_now, write_json

DIRECTORIES = [
    "source",
    "data/source-manifests",
    "data/corpus",
    "data/annotations",
    "data/measurements",
    "data/reviews",
    "frames/coarse",
    "frames/dense",
    "frames/random-audit",
    "clips",
    "assets",
    "spec",
    "design",
    "report",
    "logs",
]


def run(workspace: Path, slug: str, force: bool = False, route: str | None = None) -> None:
    workspace = workspace.resolve()
    if workspace.exists() and any(workspace.iterdir()) and not force:
        raise ToolError(f"workspace is not empty: {workspace}; pass --force to add missing structure")
    workspace.mkdir(parents=True, exist_ok=True)
    for rel in DIRECTORIES:
        (workspace / rel).mkdir(parents=True, exist_ok=True)

    index = {
        "schema_version": "1.0.0",
        "slug": slug,
        "created_at": utc_now(),
        "tool": {"name": "init_workspace.py", "version": SCRIPT_VERSION},
        "route": route,
        "source_ids": [],
        "timeline_id": None,
        "corpus_revision": 0,
    }
    write_json(workspace / "workspace-index.json", index)

    corpus_index = {
        "schema_version": "1.0.0",
        "corpus_revision": 0,
        "source_ids": [],
        "timeline_id": None,
        "observability_path": None,
        "files": {
            "evidence": "data/corpus/evidence.jsonl",
            "observations": "data/corpus/observations.jsonl",
            "events": "data/corpus/events.jsonl",
            "measurements": "data/corpus/measurements.jsonl",
            "claims": "data/corpus/claims.jsonl",
            "models": "data/corpus/models.jsonl",
            "conflicts": "data/corpus/conflicts.jsonl",
            "unknowns": "data/corpus/unknowns.jsonl",
        },
        "counts": {name: 0 for name in ["evidence", "observations", "events", "measurements", "claims", "models", "conflicts", "unknowns"]},
        "generated_at": utc_now(),
        "notes": [],
    }
    write_json(workspace / "data/corpus/index.json", corpus_index)

    placeholders = {
        "data/corpus/evidence.jsonl": "",
        "data/corpus/observations.jsonl": "",
        "data/corpus/events.jsonl": "",
        "data/corpus/measurements.jsonl": "",
        "data/corpus/claims.jsonl": "",
        "data/corpus/models.jsonl": "",
        "data/corpus/conflicts.jsonl": "",
        "data/corpus/unknowns.jsonl": "",
        "data/run-ledger.md": "# Run ledger\n",
        "spec/README.md": "# Baseline reconstruction spec\n",
        "design/preservation-contract.md": "# Preservation contract\n",
        "design/better.md": "# Better — preserve the baseline identity\n",
        "design/new.md": "# New — intentional divergence\n",
    }
    for rel, content in placeholders.items():
        path = workspace / rel
        if not path.exists():
            path.write_text(content, encoding="utf-8")

    print(str(workspace))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workspace", type=Path)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--force", action="store_true")
    parser.add_argument(
        "--route",
        choices=["FULL_RECONSTRUCTION", "SYSTEMS_RECONSTRUCTION", "FEEL_FORENSICS", "PLAYER_REVIEW", "COMPARATIVE", "FOCUSED"],
    )
    args = parser.parse_args()
    try:
        run(args.workspace, args.slug, args.force, args.route)
    except ToolError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
