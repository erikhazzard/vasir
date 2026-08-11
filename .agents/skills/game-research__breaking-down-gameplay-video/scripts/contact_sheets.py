#!/usr/bin/env python3
"""Compose contact sheets from a PTS-bearing frame manifest."""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from common import SCRIPT_VERSION, ToolError, format_timestamp, read_json, relative_or_absolute, resolve_manifest_path, sha256_file, utc_now, write_json


def run(manifest_path: Path, out_dir: Path, tag: str, cols: int, rows: int, thumb_width: int) -> dict:
    manifest = read_json(manifest_path)
    frames = manifest.get("frames", [])
    if not frames:
        raise ToolError(f"frame manifest contains no frames: {manifest_path}")
    if cols <= 0 or rows <= 0 or thumb_width <= 0:
        raise ToolError("columns, rows, and thumbnail width must be positive")
    out_dir.mkdir(parents=True, exist_ok=True)
    per_sheet = cols * rows
    font = ImageFont.load_default()
    sheets = []
    out_manifest_path = out_dir / "contact_sheets_manifest.json"
    out_manifest_dir = out_manifest_path.resolve().parent

    for sheet_index, start in enumerate(range(0, len(frames), per_sheet)):
        batch = frames[start:start + per_sheet]
        first_path = resolve_manifest_path(batch[0]["path"], manifest_path)
        if not first_path.is_file():
            raise ToolError(f"frame missing: {first_path}")
        with Image.open(first_path) as first:
            thumb_height = round(first.height * thumb_width / first.width)
        label_height = 28
        actual_rows = (len(batch) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * thumb_width, actual_rows * (thumb_height + label_height)), (12, 12, 16))
        draw = ImageDraw.Draw(sheet)
        cells = []
        for i, frame in enumerate(batch):
            frame_path = resolve_manifest_path(frame["path"], manifest_path)
            if not frame_path.is_file():
                raise ToolError(f"frame missing: {frame_path}")
            with Image.open(frame_path) as image:
                image = image.convert("RGB")
                thumb = image.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
            x = (i % cols) * thumb_width
            y = (i // cols) * (thumb_height + label_height)
            sheet.paste(thumb, (x, y))
            label = f"{tag} · {format_timestamp(float(frame['pts_s']))}"
            draw.text((x + 5, y + thumb_height + 7), label, fill=(225, 225, 235), font=font)
            cells.append({"frame_index": frame["index"], "pts_s": frame["pts_s"], "x": x, "y": y, "width": thumb_width, "height": thumb_height})
        output_path = out_dir / f"sheet_{sheet_index:03d}.jpg"
        sheet.save(output_path, quality=88, subsampling=0)
        sheets.append({
            "index": sheet_index,
            "path": relative_or_absolute(output_path, out_manifest_dir),
            "sha256": sha256_file(output_path),
            "cells": cells,
        })

    output = {
        "source_frame_manifest": str(manifest_path.resolve()),
        "source_id": manifest["source_id"],
        "source_sha256": manifest["source_sha256"],
        "tag": tag,
        "layout": {"columns": cols, "rows": rows, "thumb_width": thumb_width},
        "sheets": sheets,
        "tool": {"name": "contact_sheets.py", "version": SCRIPT_VERSION, "created_at": utc_now()},
    }
    write_json(out_manifest_path, output)
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("--tag", default="source")
    parser.add_argument("--cols", type=int, default=4)
    parser.add_argument("--rows", type=int, default=3)
    parser.add_argument("--thumb-width", type=int, default=320)
    args = parser.parse_args()
    try:
        result = run(args.manifest, args.out_dir, args.tag, args.cols, args.rows, args.thumb_width)
        print(f"{len(result['sheets'])} sheets -> {args.out_dir}")
    except (ToolError, KeyError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
