#!/usr/bin/env python3
"""Create a source manifest with exact stream metadata, optional full PTS scan, and optional fail-closed decode verification."""
from __future__ import annotations

import argparse
import os
import re
import statistics
from pathlib import Path

from common import (
    SCRIPT_VERSION,
    ToolError,
    display_dimensions,
    ffmpeg_version,
    ffprobe_json,
    first_stream,
    nullable_float,
    nullable_int,
    run_checked,
    scan_video_pts,
    sha256_file,
    utc_now,
    write_json,
)


def stream_duration(stream: dict, format_info: dict) -> float | None:
    return nullable_float(stream.get("duration")) or nullable_float(format_info.get("duration"))


def stable_source_id(path: Path) -> str:
    stem = re.sub(r"[^A-Za-z0-9_.:-]+", "_", path.stem).strip("_.:-") or "video"
    return f"source_{stem}"


def cadence_stats(pts: list[float]) -> dict:
    if len(pts) < 2:
        return {
            "pts_scan_status": "SCANNED",
            "frame_count_scanned": len(pts),
            "first_pts_s": pts[0] if pts else None,
            "last_pts_s": pts[-1] if pts else None,
            "median_delta_s": None,
            "min_delta_s": None,
            "max_delta_s": None,
            "delta_mad_s": None,
            "non_monotonic_count": 0,
            "discontinuity_count": 0,
            "cadence_classification": "UNKNOWN",
            "notes": ["fewer than two frame timestamps were available"],
        }
    deltas = [b - a for a, b in zip(pts, pts[1:])]
    non_monotonic = sum(1 for delta in deltas if delta <= 0)
    positive = [delta for delta in deltas if delta > 0]
    if not positive:
        return {
            "pts_scan_status": "SCANNED",
            "frame_count_scanned": len(pts),
            "first_pts_s": pts[0],
            "last_pts_s": pts[-1],
            "median_delta_s": None,
            "min_delta_s": None,
            "max_delta_s": None,
            "delta_mad_s": None,
            "non_monotonic_count": non_monotonic,
            "discontinuity_count": 0,
            "cadence_classification": "DISCONTINUOUS",
            "notes": ["no positive PTS deltas"],
        }
    median = statistics.median(positive)
    mad = statistics.median(abs(delta - median) for delta in positive)
    discontinuity_threshold = max(median * 5.0, median + 0.100)
    discontinuities = sum(1 for delta in positive if delta > discontinuity_threshold)
    relative_mad = mad / median if median else float("inf")
    spread_ratio = (max(positive) - min(positive)) / median if median else float("inf")
    distinct_rounded = len({round(delta, 6) for delta in positive})
    if non_monotonic or discontinuities:
        classification = "DISCONTINUOUS"
    elif distinct_rounded > 1 and (relative_mad > 0.01 or spread_ratio > 0.02):
        classification = "VFR_EVIDENCE"
    else:
        classification = "CFR_EVIDENCE"
    notes: list[str] = []
    if classification == "VFR_EVIDENCE":
        notes.append("PTS deltas vary materially; use timestamps rather than frame-count timing")
    if non_monotonic:
        notes.append(f"{non_monotonic} non-monotonic or repeated PTS deltas detected")
    if discontinuities:
        notes.append(f"{discontinuities} large PTS discontinuities detected")
    return {
        "pts_scan_status": "SCANNED",
        "frame_count_scanned": len(pts),
        "first_pts_s": pts[0],
        "last_pts_s": pts[-1],
        "median_delta_s": median,
        "min_delta_s": min(positive),
        "max_delta_s": max(positive),
        "delta_mad_s": mad,
        "non_monotonic_count": non_monotonic,
        "discontinuity_count": discontinuities,
        "cadence_classification": classification,
        "notes": notes,
    }


def run(input_path: Path, output_path: Path, source_id: str, scan_pts: bool, decode_check: bool = False) -> dict:
    if not input_path.is_file():
        raise ToolError(f"source does not exist or is not a file: {input_path}")
    probe = ffprobe_json(input_path)
    fmt = probe.get("format", {}) or {}
    video = first_stream(probe, "video")
    if not video:
        raise ToolError("no video stream found")
    display_w, display_h, rotation = display_dimensions(video)
    duration = stream_duration(video, fmt)
    if duration is None or duration <= 0:
        raise ToolError("video duration is missing or non-positive")

    audio_streams = []
    for stream in probe.get("streams", []):
        if stream.get("codec_type") != "audio":
            continue
        audio_streams.append({
            "stream_index": int(stream.get("index", 0)),
            "codec_name": stream.get("codec_name"),
            "sample_rate_hz": nullable_int(stream.get("sample_rate")),
            "channels": nullable_int(stream.get("channels")),
            "channel_layout": stream.get("channel_layout"),
            "duration_s": stream_duration(stream, fmt),
        })

    if scan_pts:
        pts, _, pts_command = scan_video_pts(input_path)
        timing = cadence_stats(pts)
    else:
        pts_command = None
        timing = {
            "pts_scan_status": "NOT_SCANNED",
            "frame_count_scanned": None,
            "first_pts_s": None,
            "last_pts_s": None,
            "median_delta_s": None,
            "min_delta_s": None,
            "max_delta_s": None,
            "delta_mad_s": None,
            "non_monotonic_count": None,
            "discontinuity_count": None,
            "cadence_classification": "UNKNOWN",
            "notes": ["run with --scan-pts before reconstruction-grade timing analysis"],
        }

    decode_command: list[str] | None = None
    decode_notes: list[str] = []
    if decode_check:
        decode_command = [
            "ffmpeg", "-nostdin", "-v", "error", "-i", str(input_path),
            "-map", "0:v:0", "-map", "0:a?", "-f", "null", "-",
        ]
        # Failure raises ToolError and no normal-looking manifest is written.
        run_checked(decode_command, text=True)
        decode_status = "PASSED"
    else:
        decode_status = "NOT_RUN"
        decode_notes.append("Full decode integrity was not checked; run with --decode-check before final reconstruction.")

    limitations = list(decode_notes)
    if not audio_streams:
        limitations.append("No audio stream is present; semantic sound analysis is unavailable.")

    tags = fmt.get("tags", {}) or {}
    tool_command = ["media_probe.py", str(input_path), str(output_path), "--source-id", source_id]
    if scan_pts:
        tool_command.append("--scan-pts")
    if decode_check:
        tool_command.append("--decode-check")
    manifest = {
        "schema_version": "1.0.0",
        "source_id": source_id,
        "sha256": sha256_file(input_path),
        "path": str(input_path.resolve()),
        "format": {
            "duration_s": duration,
            "start_time_s": nullable_float(fmt.get("start_time")),
            "format_name": fmt.get("format_name"),
            "creation_time": tags.get("creation_time"),
            "size_bytes": nullable_int(fmt.get("size")) or os.path.getsize(input_path),
        },
        "video": {
            "stream_index": int(video.get("index", 0)),
            "coded_width": int(video["width"]),
            "coded_height": int(video["height"]),
            "display_width": display_w,
            "display_height": display_h,
            "rotation_degrees": rotation,
            "sample_aspect_ratio": video.get("sample_aspect_ratio"),
            "display_aspect_ratio": video.get("display_aspect_ratio"),
            "codec_name": video.get("codec_name"),
            "pixel_format": video.get("pix_fmt"),
            "color_space": video.get("color_space"),
            "color_transfer": video.get("color_transfer"),
            "color_primaries": video.get("color_primaries"),
            "avg_frame_rate": video.get("avg_frame_rate") or "0/0",
            "r_frame_rate": video.get("r_frame_rate") or "0/0",
            "time_base": video.get("time_base") or "0/0",
            "nominal_frame_count": nullable_int(video.get("nb_frames")),
        },
        "audio": audio_streams,
        "timing": timing,
        "audio_status": "NOT_ANALYZED" if audio_streams else "UNAVAILABLE",
        "limitations": limitations,
        "decode_check": {
            "status": decode_status,
            "command": decode_command,
            "notes": decode_notes,
        },
        "tool": {
            "name": "media_probe.py",
            "version": SCRIPT_VERSION,
            "command": tool_command,
            "created_at": utc_now(),
            "ffmpeg_version": ffmpeg_version(),
            "pts_scan_command": pts_command,
        },
    }
    # source-manifest.schema.json allows only declared tool fields; keep PTS command in timing notes/provenance instead.
    manifest["tool"].pop("pts_scan_command")
    if pts_command:
        manifest["timing"]["notes"].append("PTS scan command: " + " ".join(pts_command))
    write_json(output_path, manifest)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--source-id")
    parser.add_argument("--scan-pts", action="store_true")
    parser.add_argument("--decode-check", action="store_true")
    args = parser.parse_args()
    source_id = args.source_id or stable_source_id(args.input)
    try:
        manifest = run(args.input, args.output, source_id, args.scan_pts, args.decode_check)
        print(f"{manifest['source_id']} {manifest['format']['duration_s']:.3f}s -> {args.output}")
    except ToolError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
