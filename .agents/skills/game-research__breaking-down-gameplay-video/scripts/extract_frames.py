#!/usr/bin/env python3
"""Extract aspect-preserved frames selected from real source PTS, never synthetic frame-rate labels."""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

from common import (
    SCRIPT_VERSION,
    ToolError,
    ffmpeg_version,
    parse_showinfo,
    read_json,
    relative_or_absolute,
    run_checked,
    sha256_file,
    utc_now,
    write_json,
)


def source_identity(video: Path, source_manifest: Path | None) -> tuple[str, str]:
    actual = sha256_file(video)
    if source_manifest:
        manifest = read_json(source_manifest)
        expected = manifest["sha256"]
        if expected != actual:
            raise ToolError(f"source hash mismatch: manifest {expected}, actual {actual}")
        return manifest["source_id"], actual
    return f"source_{video.stem.lower().replace(' ', '_')}", actual


def _select_expression(start_s: float, duration_s: float | None, interval_s: float) -> str:
    # select preserves input-frame PTS. prev_selected_t changes only when an input frame is selected.
    end_term = ""
    if duration_s is not None:
        end_s = start_s + duration_s
        end_term = f"*lte(t\\,{end_s:.9f})"
    return (
        f"gte(t\\,{start_s:.9f}){end_term}"
        f"*if(isnan(prev_selected_t)\\,1\\,gte(t-prev_selected_t\\,{interval_s:.9f}))"
    )


def run(
    video: Path,
    out_dir: Path,
    manifest_path: Path,
    *,
    interval_s: float,
    start_s: float,
    duration_s: float | None,
    max_width: int,
    image_format: str,
    source_manifest: Path | None,
) -> dict:
    if not video.is_file():
        raise ToolError(f"video not found: {video}")
    if interval_s <= 0:
        raise ToolError("--interval must be positive")
    if start_s < 0 or (duration_s is not None and duration_s <= 0):
        raise ToolError("start must be non-negative and duration positive")
    if max_width < 0 or max_width == 1:
        raise ToolError("--max-width must be 0 (native) or at least 2")
    if image_format not in {"jpg", "png"}:
        raise ToolError("format must be jpg or png")

    source_id, source_hash = source_identity(video, source_manifest)
    out_dir.mkdir(parents=True, exist_ok=True)
    for extension in ("jpg", "png"):
        for old in out_dir.glob(f"frame_*.{extension}"):
            old.unlink()

    select = _select_expression(start_s, duration_s, interval_s)
    scale = f"scale=w='min({max_width},iw*sar)':h=-2:flags=lanczos,setsar=1" if max_width > 0 else "setsar=1"
    vf = f"select='{select}',{scale},showinfo"
    pattern = out_dir / f"frame_%06d.{image_format}"
    cmd = [
        "ffmpeg", "-y", "-nostdin", "-hide_banner", "-loglevel", "info", "-i", str(video),
        "-map", "0:v:0", "-vf", vf, "-fps_mode", "vfr",
    ]
    if image_format == "jpg":
        cmd += ["-q:v", "2"]
    cmd += [str(pattern)]

    result = run_checked(cmd, text=True)
    pts = parse_showinfo(result.stderr)
    files = sorted(out_dir.glob(f"frame_*.{image_format}"))
    if not files:
        raise ToolError("ffmpeg completed without producing frames")
    if len(files) != len(pts):
        raise ToolError(f"frame/PTS mismatch: {len(files)} images versus {len(pts)} showinfo timestamps")
    if any(b <= a for a, b in zip(pts, pts[1:])):
        raise ToolError("selected frame PTS are not strictly increasing")

    frames = []
    manifest_dir = manifest_path.resolve().parent
    for index, (path, pts_s) in enumerate(zip(files, pts)):
        with Image.open(path) as image:
            width, height = image.size
        frames.append({
            "index": index,
            "path": relative_or_absolute(path, manifest_dir),
            "pts_s": pts_s,
            "sha256": sha256_file(path),
            "width": width,
            "height": height,
        })

    manifest = {
        "schema_version": "1.0.0",
        "source_id": source_id,
        "source_sha256": source_hash,
        "source_path": str(video.resolve()),
        "sampling": {
            "requested_interval_s": interval_s,
            "requested_start_s": start_s,
            "requested_duration_s": duration_s,
            "actual_first_pts_s": frames[0]["pts_s"],
            "actual_last_pts_s": frames[-1]["pts_s"],
        },
        "transform": {
            "max_width": max_width,
            "preserve_aspect_ratio": True,
            "selection_semantics": "minimum elapsed source-PTS interval between selected real input frames",
            "filter": vf,
        },
        "format": image_format,
        "frames": frames,
        "tool": {
            "name": "extract_frames.py",
            "version": SCRIPT_VERSION,
            "ffmpeg_version": ffmpeg_version(),
            "command": cmd,
            "created_at": utc_now(),
        },
    }
    write_json(manifest_path, manifest)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--start", type=float, default=0.0)
    parser.add_argument("--duration", type=float)
    parser.add_argument("--max-width", type=int, default=960, help="0 keeps native display width")
    parser.add_argument("--format", choices=["jpg", "png"], default="jpg")
    parser.add_argument("--source-manifest", type=Path)
    args = parser.parse_args()
    try:
        result = run(
            args.video, args.out_dir, args.manifest,
            interval_s=args.interval, start_s=args.start, duration_s=args.duration,
            max_width=args.max_width, image_format=args.format, source_manifest=args.source_manifest,
        )
        print(f"{len(result['frames'])} frames -> {args.manifest}")
    except ToolError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
