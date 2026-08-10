#!/usr/bin/env python3
"""User-facing delivery validator; delegates to the canonical workspace validator."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from validate_artifacts import validate_workspace


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("--verify-hashes", action="store_true")
    args = parser.parse_args()
    report = validate_workspace(args.workspace, args.verify_hashes)
    result = {"ok": not report.errors, "errors": report.errors, "warnings": report.warnings, "counts": report.counts}
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if not report.errors else 1)


if __name__ == "__main__":
    main()
