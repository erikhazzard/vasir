#!/usr/bin/env python3
"""Compose source manifests into an explicit session timeline with non-silent gaps."""
from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

from common import ToolError, read_json, write_json


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_gap_overrides(values: list[str]) -> dict[int, float]:
    result: dict[int, float] = {}
    for value in values:
        try:
            index_s, gap_s = value.split("=", 1)
            index = int(index_s)
            gap = float(gap_s)
        except ValueError as exc:
            raise ToolError(f"invalid --gap-after {value!r}; expected INDEX=SECONDS") from exc
        if index < 0 or gap < 0:
            raise ToolError("gap index and duration must be non-negative")
        result[index] = gap
    return result


def run(manifest_paths: list[Path], output: Path, timeline_id: str, relationship: str, overrides: dict[int, float]) -> dict:
    if not manifest_paths:
        raise ToolError("at least one source manifest is required")
    manifests = [read_json(p) for p in manifest_paths]
    segments = []
    session_cursor: float | None = 0.0 if relationship == "same-session" else None

    for i, manifest in enumerate(manifests):
        duration = float(manifest["format"]["duration_s"])
        source_id = manifest["source_id"]
        if relationship == "separate-runs":
            gap_status = "NOT_SAME_SESSION" if i < len(manifests) - 1 else "NONE_CONFIRMED"
            gap_after = None if i < len(manifests) - 1 else 0.0
            gap_uncertainty = None
            gap_method = "separate observational units"
            start = end = None
        else:
            start = session_cursor
            end = None if session_cursor is None else session_cursor + duration
            if i == len(manifests) - 1:
                gap_status, gap_after, gap_uncertainty, gap_method = "NONE_CONFIRMED", 0.0, 0.0, "last segment"
            elif i in overrides:
                gap_status, gap_after, gap_uncertainty, gap_method = "KNOWN", overrides[i], 0.0, "caller override"
            else:
                current_dt = parse_dt(manifest.get("format", {}).get("creation_time"))
                next_dt = parse_dt(manifests[i + 1].get("format", {}).get("creation_time"))
                if current_dt and next_dt:
                    inferred = (next_dt - current_dt).total_seconds() - duration
                    if inferred >= -1.0:
                        gap_status = "INFERRED"
                        gap_after = max(0.0, inferred)
                        gap_uncertainty = 1.0
                        gap_method = "format creation_time difference minus source duration"
                    else:
                        gap_status, gap_after, gap_uncertainty, gap_method = "UNKNOWN", None, None, "creation metadata overlaps or is unreliable"
                else:
                    gap_status, gap_after, gap_uncertainty, gap_method = "UNKNOWN", None, None, "no reliable elapsed-time metadata"

        segments.append({
            "segment_id": f"segment_{i + 1:03d}",
            "source_id": source_id,
            "source_start_s": 0.0,
            "source_end_s": duration,
            "session_start_s": start,
            "session_end_s": end,
            "gap_status": gap_status,
            "gap_after_s": gap_after,
            "gap_uncertainty_s": gap_uncertainty,
            "gap_method": gap_method,
            "notes": [],
        })

        if relationship == "same-session":
            if end is None or (i < len(manifests) - 1 and gap_after is None):
                session_cursor = None
            else:
                session_cursor = end + (gap_after or 0.0)

    timeline = {"schema_version": "1.0.0", "timeline_id": timeline_id, "segments": segments, "notes": []}
    write_json(output, timeline)
    return timeline


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("manifests", nargs="+", type=Path)
    parser.add_argument("--timeline-id", default="timeline_main")
    parser.add_argument("--relationship", choices=["same-session", "separate-runs"], default="same-session")
    parser.add_argument("--gap-after", action="append", default=[], help="zero-based segment index: INDEX=SECONDS")
    args = parser.parse_args()
    try:
        result = run(args.manifests, args.output, args.timeline_id, args.relationship, parse_gap_overrides(args.gap_after))
        print(f"{len(result['segments'])} segments -> {args.output}")
    except (ToolError, KeyError, ValueError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
