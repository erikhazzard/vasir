#!/usr/bin/env python3
"""Deterministically render source-bound raster visuals as strict 7-bit ASCII.

The renderer is deliberately a *facsimile* channel, not a replacement for the
exact label ledger or semantic model.  It preserves source geometry and tone
at a declared monospace-cell aspect ratio; exact labels and topology remain
independently auditable beside it.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat

import numpy as np
from PIL import Image, ImageOps


ALGORITHM = "source-raster-to-ascii-v1"
SAFE_OBJECT_ID = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
TONAL_RAMP = " .,:;irsXA253hMHGS#9B&@"
DENSE_RAMP = " .:+*#%@"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_json(value: dict) -> str:
    return json.dumps(
        value, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False
    ) + "\n"


def trusted_directory(value: Path, *, label: str) -> Path:
    absolute = Path(os.path.abspath(os.fspath(value)))
    current = Path(absolute.anchor)
    for part in absolute.parts[1:]:
        current = current / part
        try:
            mode = os.lstat(current).st_mode
        except FileNotFoundError as error:
            raise SystemExit(f"{label} does not exist: {absolute}") from error
        if stat.S_ISLNK(mode):
            raise SystemExit(f"{label} contains a symlink component: {absolute}")
    if not stat.S_ISDIR(os.lstat(absolute).st_mode):
        raise SystemExit(f"{label} is not a directory: {absolute}")
    return absolute


def safe_destination(value: Path) -> Path:
    absolute = Path(os.path.abspath(os.fspath(value)))
    ancestor = absolute
    while not ancestor.exists() and ancestor != Path(ancestor.anchor):
        ancestor = ancestor.parent
    trusted_directory(ancestor, label="destination ancestor")
    absolute.mkdir(parents=True, exist_ok=True)
    return trusted_directory(absolute, label="destination")


def regular_project_file(project: Path, relative: tuple[str, ...], *, label: str) -> Path:
    current = project
    for index, part in enumerate(relative):
        current = current / part
        try:
            mode = os.lstat(current).st_mode
        except FileNotFoundError as error:
            raise ValueError(f"missing {label}: {current}") from error
        if stat.S_ISLNK(mode):
            raise ValueError(f"{label} contains a symlink: {current}")
        if index < len(relative) - 1 and not stat.S_ISDIR(mode):
            raise ValueError(f"{label} ancestor is not a directory: {current}")
    if not stat.S_ISREG(os.lstat(current).st_mode):
        raise ValueError(f"{label} is not a regular file: {current}")
    return current


def strict_ascii(value: str) -> bytes:
    encoded = value.encode("ascii")
    if not encoded or not encoded.endswith(b"\n") or encoded.endswith(b"\n\n"):
        raise ValueError("ASCII facsimile must have exactly one terminal newline")
    if any(byte != 0x0A and not 0x20 <= byte <= 0x7E for byte in encoded):
        raise ValueError("ASCII facsimile contains a non-printable byte")
    return encoded


def target_height(width: int, source_width: int, source_height: int, cell_aspect: float) -> int:
    if width < 16:
        raise ValueError("facsimile width must be at least 16 columns")
    if not 0.2 <= cell_aspect <= 1.0:
        raise ValueError("cell aspect must be between 0.2 and 1.0")
    return max(1, round(source_height * width / source_width * cell_aspect))


def _line_character(field: np.ndarray, y: int, x: int, darkness: float) -> str:
    """Choose a stroke-aware character for a low-density line-art cell."""

    height, width = field.shape

    def at(dy: int, dx: int) -> float:
        yy, xx = y + dy, x + dx
        if yy < 0 or xx < 0 or yy >= height or xx >= width:
            return 0.0
        return float(field[yy, xx])

    scores = {
        "-": at(0, -1) + at(0, 1),
        "|": at(-1, 0) + at(1, 0),
        "\\": at(-1, -1) + at(1, 1),
        "/": at(-1, 1) + at(1, -1),
    }
    ordered = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    best, best_score = ordered[0]
    second_score = ordered[1][1]
    if best_score >= 0.10 and best_score >= second_score * 1.18:
        return best
    if darkness < 0.075:
        return "."
    if darkness < 0.15:
        return ":"
    return "+"


def render_lineart(image: Image.Image, width: int, height: int) -> list[str]:
    gray = ImageOps.autocontrast(image.convert("L"), cutoff=(0.0, 0.0))
    reduced = gray.resize((width, height), Image.Resampling.LANCZOS)
    field = 1.0 - np.asarray(reduced, dtype=np.float32) / 255.0
    rows = []
    for y in range(height):
        characters = []
        for x in range(width):
            darkness = float(field[y, x])
            if darkness < 0.035:
                character = " "
            # Preserve stroke direction through the dark core of ordinary
            # one- and two-pixel rules.  Restrict density characters to truly
            # filled cells; otherwise a horizontal rule degrades into a row
            # of hashes and ceases to be a geometric facsimile.
            elif darkness < 0.78:
                character = _line_character(field, y, x, darkness)
            else:
                index = round(
                    min(1.0, max(0.0, (darkness - 0.18) / 0.82))
                    * (len(DENSE_RAMP) - 1)
                )
                character = DENSE_RAMP[index]
            characters.append(character)
        rows.append("".join(characters).rstrip())
    return rows


def render_tonal(image: Image.Image, width: int, height: int) -> list[str]:
    gray = ImageOps.autocontrast(image.convert("L"), cutoff=(0.2, 0.2))
    reduced = gray.resize((width, height), Image.Resampling.LANCZOS)
    values = np.asarray(reduced, dtype=np.float32)
    darkness = np.clip((255.0 - values) / 255.0, 0.0, 1.0)
    darkness[darkness < 0.025] = 0.0
    rows = []
    for row in darkness:
        characters = [
            TONAL_RAMP[round(float(value) * (len(TONAL_RAMP) - 1))]
            for value in row
        ]
        rows.append("".join(characters).rstrip())
    return rows


def render_image(
    source: Path,
    *,
    width: int,
    cell_aspect: float,
    mode: str,
) -> tuple[bytes, dict]:
    with Image.open(source) as opened:
        image = opened.convert("RGB")
        source_width, source_height = image.size
        height = target_height(width, source_width, source_height, cell_aspect)
        if mode == "lineart":
            rows = render_lineart(image, width, height)
        elif mode == "tonal":
            rows = render_tonal(image, width, height)
        else:
            raise ValueError(f"unsupported facsimile mode: {mode}")
    # Preserve the declared canvas height while avoiding meaningless trailing
    # spaces.  Only terminal blank rows are collapsed so the byte contract has
    # exactly one final newline.
    while len(rows) > 1 and rows[-1] == "":
        rows.pop()
    payload = strict_ascii("\n".join(rows) + "\n")
    metadata = {
        "algorithm": ALGORITHM,
        "cell_aspect": cell_aspect,
        "mode": mode,
        "output_columns": width,
        "output_rows": len(rows),
        "output_sha256": sha256_bytes(payload),
        "source_bytes": source.stat().st_size,
        "source_path": source.as_posix(),
        "source_pixels": [source_width, source_height],
        "source_sha256": sha256(source),
    }
    return payload, metadata


def atomic_write(path: Path, value: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_bytes(value)
    os.replace(temporary, path)


def render_object(
    project: Path,
    object_id: str,
    destination_root: Path,
    *,
    width: int,
    cell_aspect: float,
    mode: str,
) -> dict:
    if not SAFE_OBJECT_ID.fullmatch(object_id):
        raise ValueError(f"unsafe object id: {object_id}")
    source = regular_project_file(
        project,
        ("objects", object_id, "source-xobject.jpg"),
        label="source XObject",
    )
    payload, metadata = render_image(
        source, width=width, cell_aspect=cell_aspect, mode=mode
    )
    destination = destination_root / object_id
    destination.mkdir(parents=False, exist_ok=True)
    trusted_directory(destination, label=f"destination object {object_id}")
    ascii_path = destination / "facsimile.ascii.txt"
    metadata_path = destination / "facsimile.json"
    metadata = {"schema_version": 1, "object_id": object_id, **metadata}
    atomic_write(ascii_path, payload)
    atomic_write(metadata_path, canonical_json(metadata).encode("utf-8"))
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True, type=Path)
    parser.add_argument("--destination", required=True, type=Path)
    parser.add_argument("--object-id", action="append", default=[])
    parser.add_argument("--width", type=int, default=240)
    parser.add_argument("--cell-aspect", type=float, default=0.48)
    parser.add_argument("--mode", choices=("lineart", "tonal"), default="lineart")
    args = parser.parse_args()

    project = trusted_directory(args.project, label="project")
    destination = safe_destination(args.destination)
    object_root = trusted_directory(project / "objects", label="object root")
    object_ids = args.object_id or sorted(
        path.name for path in object_root.iterdir() if path.is_dir()
    )
    records = [
        render_object(
            project,
            object_id,
            destination,
            width=args.width,
            cell_aspect=args.cell_aspect,
            mode=args.mode,
        )
        for object_id in object_ids
    ]
    print(json.dumps({"rendered": len(records), "objects": records}, indent=2))


if __name__ == "__main__":
    main()
