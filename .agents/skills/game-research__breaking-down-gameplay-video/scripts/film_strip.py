#!/usr/bin/env python3
"""Create a labeled film strip from nearest real source-frame PTS values."""
from __future__ import annotations

import argparse
import bisect
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from common import (
    SCRIPT_VERSION,
    ToolError,
    ffmpeg_version,
    format_timestamp,
    parse_showinfo,
    run_checked,
    scan_video_pts,
    sha256_file,
    utc_now,
    write_json,
)


def nearest_unique(pts: list[float], targets: list[float]) -> list[float]:
    picked: list[float] = []
    used: set[float] = set()
    for target in targets:
        index = bisect.bisect_left(pts, target)
        candidates = []
        if index < len(pts):
            candidates.append(pts[index])
        if index > 0:
            candidates.append(pts[index - 1])
        candidates.sort(key=lambda value: abs(value - target))
        choice = next((value for value in candidates if value not in used), None)
        if choice is None:
            # Find the nearest unused PTS if the nearest candidate was already selected.
            choice = min((value for value in pts if value not in used), key=lambda value: abs(value - target), default=None)
        if choice is not None:
            used.add(choice)
            picked.append(choice)
    return sorted(picked)


def run(video: Path, start_s: float, duration_s: float, count: int, output: Path, label: str, max_width: int) -> dict:
    if not video.is_file():
        raise ToolError(f"video not found: {video}")
    if start_s < 0 or duration_s <= 0 or count <= 0:
        raise ToolError("start must be non-negative; duration and count must be positive")
    pts, _, scan_cmd = scan_video_pts(video, start_s=start_s, duration_s=duration_s)
    if not pts:
        raise ToolError("no source-frame timestamps found in requested interval")
    targets = np.linspace(start_s, start_s + duration_s, count).tolist() if count > 1 else [start_s + duration_s / 2]
    selected = nearest_unique(pts, targets)
    if not selected:
        raise ToolError("could not select source frames")

    output.parent.mkdir(parents=True, exist_ok=True)
    commands: list[list[str]] = []
    cells = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        images: list[tuple[Path, float, float]] = []
        for i, selected_pts_s in enumerate(selected):
            frame_path = tmp_path / f"frame_{i:03d}.png"
            vf = f"scale=w='min({max_width},iw*sar)':h=-2:flags=lanczos,setsar=1,showinfo"
            cmd = [
                "ffmpeg", "-y", "-nostdin", "-hide_banner", "-loglevel", "info",
                "-copyts", "-ss", f"{selected_pts_s:.9f}", "-i", str(video),
                "-map", "0:v:0", "-frames:v", "1", "-vf", vf, "-fps_mode", "passthrough", str(frame_path),
            ]
            result = run_checked(cmd, text=True)
            actual_pts = parse_showinfo(result.stderr)
            # ffmpeg >= 6 may feed extra frames into the filtergraph before the
            # -frames:v limit halts the pipeline; only filtergraph frame n=0 is
            # encoded. Verify that frame's PTS against the selected source PTS
            # instead of asserting a showinfo count.
            if not frame_path.is_file() or not actual_pts:
                raise ToolError(
                    f"failed to extract one timestamp-verifiable frame near {selected_pts_s:.6f}s "
                    f"(file={frame_path.is_file()}, showinfo={len(actual_pts)})"
                )
            extracted_pts_s = actual_pts[0]
            pts_index = bisect.bisect_left(pts, selected_pts_s)
            neighbor_gaps = [
                pts[j + 1] - pts[j]
                for j in (pts_index - 1, pts_index)
                if 0 <= j < len(pts) - 1
            ]
            # Half the local frame period (nearest-frame rounding bound), with a
            # 2 ms floor for float/timebase jitter.
            tolerance_s = max(0.002, min(neighbor_gaps) / 2) if neighbor_gaps else 0.002
            if abs(extracted_pts_s - selected_pts_s) > tolerance_s:
                raise ToolError(
                    f"extracted frame PTS {extracted_pts_s:.6f}s does not match selected "
                    f"source PTS {selected_pts_s:.6f}s (tolerance {tolerance_s * 1000:.1f} ms)"
                )
            commands.append(cmd)
            images.append((frame_path, selected_pts_s, extracted_pts_s))

        with Image.open(images[0][0]) as first:
            first = first.convert("RGB")
            cell_width = first.width
            cell_height = first.height
        label_height = 36
        strip = Image.new("RGB", (cell_width * len(images), cell_height + label_height), (10, 10, 14))
        draw = ImageDraw.Draw(strip)
        font = ImageFont.load_default()
        for i, (frame_path, selected_pts_s, actual_pts_s) in enumerate(images):
            with Image.open(frame_path) as image:
                image = image.convert("RGB")
                if image.size != (cell_width, cell_height):
                    image = image.resize((cell_width, cell_height), Image.Resampling.LANCZOS)
            x = i * cell_width
            strip.paste(image, (x, 0))
            target_pts_s = targets[min(i, len(targets) - 1)]
            offset_ms = round((actual_pts_s - start_s) * 1000)
            text = f"{label} +{offset_ms} ms · {format_timestamp(actual_pts_s)}"
            draw.text((x + 6, cell_height + 10), text, fill=(230, 230, 238), font=font)
            cells.append({
                "index": i,
                "target_pts_s": target_pts_s,
                "selected_source_pts_s": selected_pts_s,
                "extracted_pts_s": actual_pts_s,
                "offset_ms": offset_ms,
                "selection_error_ms": round((actual_pts_s - target_pts_s) * 1000, 3),
                "extraction_error_ms": round((actual_pts_s - selected_pts_s) * 1000, 3)
            })
        strip.save(output, quality=90, subsampling=0)

    sidecar = output.with_suffix(output.suffix + ".json")
    metadata = {
        "schema_version": "1.0.0",
        "source_path": str(video.resolve()),
        "source_sha256": sha256_file(video),
        "window": {"start_pts_s": start_s, "duration_s": duration_s, "end_pts_s": start_s + duration_s},
        "label": label,
        "cells": cells,
        "artifact": {"path": str(output.resolve()), "sha256": sha256_file(output)},
        "tool": {
            "name": "film_strip.py",
            "version": SCRIPT_VERSION,
            "ffmpeg_version": ffmpeg_version(),
            "pts_scan_command": scan_cmd,
            "extraction_commands": commands,
            "created_at": utc_now(),
        },
    }
    write_json(sidecar, metadata)
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("start_s", type=float)
    parser.add_argument("duration_s", type=float)
    parser.add_argument("n_frames", type=int)
    parser.add_argument("output", type=Path)
    parser.add_argument("label")
    parser.add_argument("--max-width", type=int, default=720)
    args = parser.parse_args()
    try:
        result = run(args.video, args.start_s, args.duration_s, args.n_frames, args.output, args.label, args.max_width)
        print(f"{len(result['cells'])} cells -> {args.output}")
    except ToolError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
