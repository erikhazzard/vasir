#!/usr/bin/env python3
"""PTS-aware, aspect-preserving per-frame visual metrics.

Outputs NPZ arrays:
- pts_s: source presentation timestamps
- delta_s: elapsed time since prior decoded frame
- luma: mean grayscale value
- motion: mean absolute grayscale delta from prior frame
- motion_per_s: motion divided by elapsed PTS
- duplicate: exact equality at analysis resolution

A metadata JSON sidecar records the source hash, transform, command, and integrity checks.
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

import numpy as np

from common import (
    SCRIPT_VERSION,
    ToolError,
    display_dimensions,
    even,
    ffmpeg_version,
    ffprobe_json,
    first_stream,
    scan_video_pts,
    sha256_file,
    utc_now,
    write_json,
)


def run(video_path: Path, out_path: Path, max_width: int = 320) -> dict:
    if not video_path.is_file():
        raise ToolError(f"video not found: {video_path}")
    if max_width < 2:
        raise ToolError("--max-width must be at least 2")
    probe = ffprobe_json(video_path)
    stream = first_stream(probe, "video")
    if not stream:
        raise ToolError("no video stream found")
    display_w, display_h, rotation = display_dimensions(stream)
    analysis_w = min(max_width, display_w)
    analysis_h = even(display_h * analysis_w / display_w)

    pts, packet_durations, pts_cmd = scan_video_pts(video_path)
    if not pts:
        raise ToolError("ffprobe returned no frame timestamps")

    vf = f"scale={analysis_w}:{analysis_h}:flags=area,setsar=1,format=gray"
    cmd = [
        "ffmpeg", "-nostdin", "-v", "error", "-i", str(video_path), "-map", "0:v:0",
        "-vf", vf, "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "gray", "-",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.stdout is None or proc.stderr is None:
        raise ToolError("failed to open ffmpeg pipes")
    frame_bytes = analysis_w * analysis_h
    luma: list[float] = []
    motion: list[float] = []
    duplicate: list[bool] = []
    prev: np.ndarray | None = None

    while True:
        buf = proc.stdout.read(frame_bytes)
        if not buf:
            break
        if len(buf) != frame_bytes:
            proc.kill()
            raise ToolError(f"truncated raw frame: expected {frame_bytes} bytes, received {len(buf)}")
        frame = np.frombuffer(buf, dtype=np.uint8).astype(np.float32)
        luma.append(float(frame.mean()))
        if prev is None:
            motion.append(0.0)
            duplicate.append(False)
        else:
            delta = np.abs(frame - prev)
            motion.append(float(delta.mean()))
            duplicate.append(bool(np.array_equal(frame, prev)))
        prev = frame

    stderr = proc.stderr.read().decode("utf-8", errors="replace")
    return_code = proc.wait()
    if return_code != 0:
        raise ToolError(f"ffmpeg failed ({return_code}): {stderr[-4000:]}")
    if not luma:
        raise ToolError("ffmpeg decoded zero frames")
    if len(luma) != len(pts):
        raise ToolError(
            f"decoded frame/PTS mismatch: ffmpeg decoded {len(luma)}, ffprobe listed {len(pts)}; "
            "do not align or truncate silently"
        )

    pts_np = np.asarray(pts, dtype=np.float64)
    delta_s = np.empty_like(pts_np)
    delta_s[0] = np.nan
    delta_s[1:] = np.diff(pts_np)
    if np.any(delta_s[1:] <= 0):
        raise ToolError("non-monotonic frame PTS prevent trustworthy per-frame timing")
    motion_np = np.asarray(motion, dtype=np.float32)
    motion_per_s = np.zeros_like(motion_np)
    motion_per_s[1:] = motion_np[1:] / delta_s[1:].astype(np.float32)
    duplicate_np = np.asarray(duplicate, dtype=np.bool_)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        out_path,
        pts_s=pts_np,
        delta_s=delta_s,
        luma=np.asarray(luma, dtype=np.float32),
        motion=motion_np,
        motion_per_s=motion_per_s,
        duplicate=duplicate_np,
    )
    sidecar = out_path.with_suffix(out_path.suffix + ".json")
    metadata = {
        "schema_version": "1.0.0",
        "status": "VALID",
        "source_path": str(video_path.resolve()),
        "source_sha256": sha256_file(video_path),
        "source_display": {"width": display_w, "height": display_h, "rotation_degrees": rotation},
        "analysis_frame": {"width": analysis_w, "height": analysis_h, "preserve_aspect_ratio": True},
        "frame_count": len(luma),
        "first_pts_s": float(pts_np[0]),
        "last_pts_s": float(pts_np[-1]),
        "duplicate_frame_fraction_at_analysis_resolution": float(duplicate_np.mean()),
        "arrays": {
            "pts_s": "s in source PTS domain",
            "delta_s": "s",
            "luma": "mean gray level [0,255]",
            "motion": "mean absolute gray delta per decoded frame",
            "motion_per_s": "motion / elapsed PTS",
            "duplicate": "exact equality at analysis resolution",
        },
        "limitations": [
            "Motion/luma are event proposals, not semantic classifications.",
            "Exact duplicates are measured after downscaling and grayscale conversion.",
        ],
        "tool": {
            "name": "metrics_video.py",
            "version": SCRIPT_VERSION,
            "ffmpeg_version": ffmpeg_version(),
            "decode_command": cmd,
            "pts_command": pts_cmd,
            "created_at": utc_now(),
        },
    }
    write_json(sidecar, metadata)
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--max-width", type=int, default=320)
    args = parser.parse_args()
    try:
        metadata = run(args.video, args.output, args.max_width)
        print(json.dumps({"frames": metadata["frame_count"], "output": str(args.output), "status": metadata["status"]}))
    except ToolError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
