#!/usr/bin/env python3
"""Evidence-first, audited PDF-to-Markdown conversion pipeline.

The source render is the visual authority. Native/OCR extractors are evidence.
Canonical manifests are the textual authority. Markdown is generated from the
canonical manifests and is never the place where source truth is maintained.
"""

from __future__ import annotations

import argparse
from collections import Counter
import concurrent.futures
import csv
import dataclasses
import difflib
import hashlib
import html
import io
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import xml.etree.ElementTree as ET

import fitz
from PIL import Image
import yaml


SCHEMA_VERSION = 1
SOURCE_PDF = Path("source/original.pdf")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(value)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def atomic_write_json(path: Path, value: object) -> None:
    atomic_write_text(
        path,
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    )


def atomic_write_jsonl(path: Path, values) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            for value in values:
                handle.write(json.dumps(value, ensure_ascii=False, sort_keys=True))
                handle.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def run(command: list[str], *, stdout_path: Path | None = None) -> str:
    if stdout_path is None:
        result = subprocess.run(
            command,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return result.stdout
    stdout_path.parent.mkdir(parents=True, exist_ok=True)
    with stdout_path.open("wb") as handle:
        subprocess.run(command, check=True, stdout=handle, stderr=subprocess.PIPE)
    return ""


def command_version(command: list[str]) -> str:
    try:
        result = subprocess.run(
            command,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
    except FileNotFoundError:
        return "NOT_INSTALLED"
    return result.stdout.strip().splitlines()[0] if result.stdout.strip() else "UNKNOWN"


def rect_list(rect) -> list[float]:
    return [round(float(v), 4) for v in rect]


def point_list(point) -> list[float]:
    if hasattr(point, "x"):
        return [round(float(point.x), 4), round(float(point.y), 4)]
    return [round(float(point[0]), 4), round(float(point[1]), 4)]


def jsonable_geometry(value):
    if isinstance(value, fitz.Point):
        return point_list(value)
    if isinstance(value, (fitz.Rect, fitz.IRect, fitz.Matrix)):
        return [round(float(item), 6) for item in value]
    if isinstance(value, fitz.Quad):
        return [point_list(point) for point in value]
    if isinstance(value, dict):
        return {str(key): jsonable_geometry(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable_geometry(item) for item in value]
    return value


def page_name(page_number: int) -> str:
    return f"p{page_number:04d}"


def visible_codepoint_record(character: str) -> dict:
    return {
        "character": character,
        "codepoints": [f"U+{ord(value):04X}" for value in character],
        "unicode_names": [unicodedata.name(value, "UNNAMED") for value in character],
    }


def normalize_diagnostic(value: str) -> str:
    value = unicodedata.normalize("NFC", value)
    value = value.replace("\u00ad", "")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def source_path(project: Path) -> Path:
    return project / SOURCE_PDF


def assert_source(project: Path) -> tuple[Path, str]:
    source = source_path(project)
    if not source.is_file():
        raise SystemExit(f"Missing immutable source PDF: {source}")
    digest = sha256_file(source)
    recorded = project / "source/original.pdf.sha256"
    if recorded.exists():
        expected = recorded.read_text(encoding="utf-8").split()[0]
        if expected != digest:
            raise SystemExit(
                f"Source hash changed: recorded {expected}, observed {digest}"
            )
    return source, digest


def default_fidelity_contract() -> Path:
    skill_contract = Path(__file__).resolve().parent.parent / "references" / "protocol.md"
    workspace_contract = (
        Path(__file__).resolve().parents[2]
        / "docs"
        / "work"
        / "audited-pdf-to-markdown"
        / "spec.md"
    )
    for candidate in (skill_contract, workspace_contract):
        if candidate.is_file():
            return candidate
    raise SystemExit(
        "No fidelity contract found; pass --fidelity-contract explicitly"
    )


def preflight(project: Path, fidelity_contract: Path | None = None) -> None:
    source, digest = assert_source(project)
    contract_source = (fidelity_contract or default_fidelity_contract()).resolve()
    if not contract_source.is_file():
        raise SystemExit(f"Missing fidelity contract: {contract_source}")
    contract_value = contract_source.read_text(encoding="utf-8")
    contract_destination = project / "fidelity-contract.md"
    if contract_destination.exists():
        if contract_destination.read_text(encoding="utf-8") != contract_value:
            raise SystemExit("Project fidelity contract differs from the selected contract")
    else:
        atomic_write_text(contract_destination, contract_value)
    doc = fitz.open(source)
    metadata = dict(doc.metadata or {})
    outline = doc.get_toc(simple=False)
    annotation_or_link_count = sum(len(page.get_links()) for page in doc)
    page_sizes = sorted(
        {
            (round(page.rect.width, 4), round(page.rect.height, 4), page.rotation)
            for page in doc
        }
    )
    pdfinfo = run(["pdfinfo", str(source)])
    pdffonts = run(["pdffonts", str(source)])
    toolchain = {
        "schema_version": SCHEMA_VERSION,
        "python": sys.version.replace("\n", " "),
        "platform": platform.platform(),
        "pymupdf": fitz.version,
        "poppler_pdftotext": command_version(["pdftotext", "-v"]),
        "poppler_pdfinfo": command_version(["pdfinfo", "-v"]),
        "tesseract": command_version(["tesseract", "--version"]),
        "pipeline_sha256": sha256_file(Path(__file__)),
    }
    job = {
        "schema_version": SCHEMA_VERSION,
        "source": {
            "path": str(SOURCE_PDF),
            "sha256": digest,
            "bytes": source.stat().st_size,
            "page_count": doc.page_count,
            "encrypted": doc.needs_pass,
            "outline_node_count": len(outline),
            "annotation_or_link_count": annotation_or_link_count,
            "metadata": metadata,
            "page_profiles": [
                {"width": width, "height": height, "rotation": rotation}
                for width, height, rotation in page_sizes
            ],
        },
        "fidelity_contract": {
            "path": "fidelity-contract.md",
            "sha256": sha256_file(contract_destination),
        },
        "status": "PREFLIGHTED",
    }
    atomic_write_text(
        project / "source/original.pdf.sha256", f"{digest}  original.pdf\n"
    )
    atomic_write_text(project / "source/pdfinfo.txt", pdfinfo)
    atomic_write_text(project / "source/pdffonts.txt", pdffonts)
    atomic_write_text(
        project / "source/job.yaml",
        yaml.safe_dump(job, sort_keys=False, allow_unicode=True),
    )
    atomic_write_text(
        project / "manifests/toolchain.lock",
        yaml.safe_dump(toolchain, sort_keys=False, allow_unicode=True),
    )
    print(f"preflight: {doc.page_count} pages; sha256={digest}")


def normalized_text_block(page_id: str, block_index: int, block: dict) -> dict:
    block_id = f"{page_id}-r{block_index + 1:04d}"
    if block.get("type") == 1:
        return {
            "id": block_id,
            "type": "image",
            "bbox": rect_list(block.get("bbox", (0, 0, 0, 0))),
            "width": block.get("width"),
            "height": block.get("height"),
            "extension": block.get("ext"),
            "colorspace": block.get("colorspace"),
            "x_resolution": block.get("xres"),
            "y_resolution": block.get("yres"),
            "bits_per_component": block.get("bpc"),
            "transform": rect_list(block.get("transform", (0, 0, 0, 0, 0, 0))),
            "encoded_bytes": block.get("size"),
        }

    lines = []
    for line_index, line in enumerate(block.get("lines", [])):
        line_id = f"{block_id}-l{line_index + 1:04d}"
        spans = []
        for span_index, span in enumerate(line.get("spans", [])):
            span_id = f"{line_id}-s{span_index + 1:03d}"
            characters = []
            for character_index, character in enumerate(span.get("chars", [])):
                atom_id = f"{span_id}-a{character_index + 1:04d}"
                record = {
                    "id": atom_id,
                    "c": character.get("c", ""),
                    "bbox": rect_list(character.get("bbox", (0, 0, 0, 0))),
                    "origin": point_list(character.get("origin", fitz.Point(0, 0))),
                    "synthetic": bool(character.get("synthetic", False)),
                }
                record.update(visible_codepoint_record(record["c"]))
                record.pop("character")
                characters.append(record)
            spans.append(
                {
                    "id": span_id,
                    "bbox": rect_list(span.get("bbox", (0, 0, 0, 0))),
                    "origin": point_list(span.get("origin", fitz.Point(0, 0))),
                    "font": span.get("font"),
                    "size": round(float(span.get("size", 0)), 4),
                    "flags": span.get("flags"),
                    "char_flags": span.get("char_flags"),
                    "color": span.get("color"),
                    "alpha": span.get("alpha"),
                    "characters": characters,
                }
            )
        lines.append(
            {
                "id": line_id,
                "bbox": rect_list(line.get("bbox", (0, 0, 0, 0))),
                "writing_mode": line.get("wmode"),
                "direction": list(line.get("dir", (1, 0))),
                "spans": spans,
            }
        )
    return {
        "id": block_id,
        "type": "text",
        "bbox": rect_list(block.get("bbox", (0, 0, 0, 0))),
        "lines": lines,
    }


def text_from_normalized_blocks(blocks: list[dict]) -> str:
    output = []
    for block in blocks:
        if block["type"] != "text":
            continue
        for line in block["lines"]:
            output.append(
                "".join(
                    character["c"]
                    for span in line["spans"]
                    for character in span["characters"]
                )
            )
    return "\n".join(output) + ("\n" if output else "")


def render_page(page: fitz.Page, destination: Path, dpi: int) -> dict:
    matrix = fitz.Matrix(dpi / 72.0, dpi / 72.0)
    if destination.exists():
        with Image.open(destination) as image:
            width, height = image.size
        expected_rect = (page.rect * matrix).irect
        expected_width = expected_rect.width
        expected_height = expected_rect.height
        if (width, height) != (expected_width, expected_height):
            raise SystemExit(
                f"stale render {destination}: expected {expected_width}x{expected_height}, observed {width}x{height}"
            )
        return {
            "width_pixels": width,
            "height_pixels": height,
            "sha256": sha256_file(destination),
        }
    pixmap = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB, alpha=False)
    temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp.png")
    destination.parent.mkdir(parents=True, exist_ok=True)
    pixmap.save(temporary)
    os.replace(temporary, destination)
    return {
        "width_pixels": pixmap.width,
        "height_pixels": pixmap.height,
        "sha256": sha256_file(destination),
    }


def extract_native_a(project: Path, render_dpi: int) -> None:
    source, digest = assert_source(project)
    pages_dir = project / "source/pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(source)
    page_records = []
    region_records = []
    atom_records = []
    layout_event_records = []
    object_records = []

    for page_index, page in enumerate(doc):
        page_number = page_index + 1
        page_id = page_name(page_number)
        raw = page.get_text("rawdict", sort=False)
        blocks = [
            normalized_text_block(page_id, block_index, block)
            for block_index, block in enumerate(raw.get("blocks", []))
        ]
        native_text = text_from_normalized_blocks(blocks)
        render_metadata = render_page(
            page, pages_dir / f"{page_id}.render.png", render_dpi
        )
        drawings = page.get_drawings(extended=True)
        drawing_records = []
        for drawing_index, drawing in enumerate(drawings):
            full_record = jsonable_geometry(drawing)
            full_record["id"] = f"{page_id}-d{drawing_index + 1:04d}"
            full_record["bbox"] = (
                rect_list(drawing["rect"]) if drawing.get("rect") is not None else None
            )
            full_record["item_count"] = len(drawing.get("items", []))
            drawing_records.append(full_record)
        render_scale = fitz.Matrix(render_dpi / 72.0, render_dpi / 72.0)
        pdf_to_render = page.rotation_matrix * render_scale
        page_record = {
            "schema_version": SCHEMA_VERSION,
            "id": page_id,
            "pdf_page": page_number,
            "width": round(page.rect.width, 4),
            "height": round(page.rect.height, 4),
            "rotation": page.rotation,
            "native_text_characters": len(native_text),
            "text_block_count": sum(block["type"] == "text" for block in blocks),
            "image_block_count": sum(block["type"] == "image" for block in blocks),
            "drawing_group_count": len(drawing_records),
            "render_dpi": render_dpi,
            "render": render_metadata,
            "pdf_to_render_matrix": [round(value, 8) for value in pdf_to_render],
            "media_box": rect_list(page.mediabox),
            "crop_box": rect_list(page.cropbox),
            "trim_box": rect_list(page.trimbox),
            "bleed_box": rect_list(page.bleedbox),
            "art_box": rect_list(page.artbox),
            "annotation_or_link_count": len(page.get_links()),
            "source_pdf_sha256": digest,
            "classification": (
                "raster_only"
                if not native_text and any(block["type"] == "image" for block in blocks)
                else "hybrid_native_and_raster"
                if any(block["type"] == "image" for block in blocks)
                else "born_digital_native_text"
            ),
        }
        evidence = {
            "schema_version": SCHEMA_VERSION,
            "page": page_record,
            "blocks": blocks,
            "drawings": drawing_records,
            "native_text": native_text,
        }
        atomic_write_json(pages_dir / f"{page_id}.native-a.json", evidence)
        atomic_write_text(pages_dir / f"{page_id}.native-a.txt", native_text)
        page_records.append(page_record)

        reading_order = 0
        for block in blocks:
            region = {
                "id": block["id"],
                "page": page_number,
                "bbox": block["bbox"],
                "source_kind": "pdf_image" if block["type"] == "image" else "pdf_text",
                "classification": "unknown" if block["type"] == "image" else "unclassified_text",
                "extractor_order": len(region_records) + 1,
                "chapter": None,
                "verification": "EXTRACTED",
            }
            region_records.append(region)
            if block["type"] == "image":
                object_records.append(
                    {
                        "id": block["id"].replace("-r", "-o"),
                        "page": page_number,
                        "region_id": block["id"],
                        "bbox": block["bbox"],
                        "kind": "image",
                        "classification": "unknown",
                        "status": "INVENTORIED_CANDIDATE",
                    }
                )
                continue
            previous_atom_id = None
            for line_index, line in enumerate(block["lines"]):
                for span in line["spans"]:
                    for character in span["characters"]:
                        reading_order += 1
                        atom_records.append(
                            {
                                "id": character["id"],
                                "page": page_number,
                                "region_id": block["id"],
                                "line_id": line["id"],
                                "span_id": span["id"],
                                "bbox": character["bbox"],
                                "source_unicode": character["c"],
                                "transcript_unicode": None,
                                "synthetic": character["synthetic"],
                                "page_extractor_order": reading_order,
                                "global_extractor_order": len(atom_records) + 1,
                                "chapter": None,
                                "verification": "EXTRACTED",
                            }
                        )
                        previous_atom_id = character["id"]
                layout_event_records.append(
                    {
                        "id": f"{line['id']}-eol",
                        "page": page_number,
                        "region_id": block["id"],
                        "line_id": line["id"],
                        "type": "line_break",
                        "after_atom_id": previous_atom_id,
                        "bbox": line["bbox"],
                        "page_extractor_order": reading_order,
                        "canonical_order": None,
                        "verification": "EXTRACTED",
                    }
                )
            layout_event_records.append(
                {
                    "id": f"{block['id']}-block-end",
                    "page": page_number,
                    "region_id": block["id"],
                    "type": "block_boundary",
                    "after_atom_id": previous_atom_id,
                    "bbox": block["bbox"],
                    "page_extractor_order": reading_order,
                    "canonical_order": None,
                    "verification": "EXTRACTED",
                }
            )
        for drawing in drawing_records:
            object_records.append(
                {
                    "id": drawing["id"].replace("-d", "-v"),
                    "page": page_number,
                    "region_id": None,
                    "bbox": drawing["bbox"],
                    "kind": "vector_drawing_group",
                    "classification": "unknown",
                    "status": "INVENTORIED_CANDIDATE",
                }
            )
        if page_number % 25 == 0 or page_number == doc.page_count:
            print(f"native-a/render: {page_number}/{doc.page_count}", flush=True)

    atomic_write_jsonl(project / "manifests/pages.jsonl", page_records)
    atomic_write_jsonl(project / "manifests/regions.jsonl", region_records)
    atomic_write_jsonl(project / "manifests/atoms.extracted.jsonl", atom_records)
    atomic_write_jsonl(
        project / "manifests/layout-events.extracted.jsonl", layout_event_records
    )
    atomic_write_jsonl(project / "manifests/objects.candidates.jsonl", object_records)


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def poppler_pages(root: ET.Element):
    for element in root.iter():
        if local_name(element.tag) == "page":
            yield element


def poppler_children(element: ET.Element, name: str):
    return [child for child in element if local_name(child.tag) == name]


def extract_native_b(project: Path) -> None:
    source, _ = assert_source(project)
    work_dir = project / "work/extraction"
    work_dir.mkdir(parents=True, exist_ok=True)
    bbox_path = work_dir / "poppler-bbox.html"
    layout_path = work_dir / "poppler-layout.txt"
    run(
        [
            "pdftotext",
            "-bbox-layout",
            "-remove-hyphens",
            "none",
            "-enc",
            "UTF-8",
            str(source),
            str(bbox_path),
        ]
    )
    run(
        [
            "pdftotext",
            "-layout",
            "-remove-hyphens",
            "none",
            "-enc",
            "UTF-8",
            str(source),
            str(layout_path),
        ]
    )
    tree = ET.parse(bbox_path)
    parsed_pages = list(poppler_pages(tree.getroot()))
    layout_pages = layout_path.read_text(encoding="utf-8").split("\f")
    if layout_pages and layout_pages[-1] == "":
        layout_pages.pop()
    pages_dir = project / "source/pages"

    for page_index, page in enumerate(parsed_pages):
        page_number = page_index + 1
        page_id = page_name(page_number)
        flows = []
        words_flat = []
        flow_index = 0
        for flow in page.iter():
            if local_name(flow.tag) != "flow":
                continue
            flow_index += 1
            flow_record = {"id": f"{page_id}-f{flow_index:04d}", "blocks": []}
            block_index = 0
            for block in flow.iter():
                if local_name(block.tag) != "block":
                    continue
                block_index += 1
                block_record = {
                    "id": f"{flow_record['id']}-b{block_index:04d}",
                    "bbox": [
                        float(block.attrib.get("xMin", 0)),
                        float(block.attrib.get("yMin", 0)),
                        float(block.attrib.get("xMax", 0)),
                        float(block.attrib.get("yMax", 0)),
                    ],
                    "lines": [],
                }
                line_index = 0
                for line in block.iter():
                    if local_name(line.tag) != "line":
                        continue
                    line_index += 1
                    words = []
                    for word_index, word in enumerate(poppler_children(line, "word")):
                        record = {
                            "id": f"{block_record['id']}-l{line_index:04d}-w{word_index + 1:04d}",
                            "text": "".join(word.itertext()),
                            "bbox": [
                                float(word.attrib.get("xMin", 0)),
                                float(word.attrib.get("yMin", 0)),
                                float(word.attrib.get("xMax", 0)),
                                float(word.attrib.get("yMax", 0)),
                            ],
                        }
                        words.append(record)
                        words_flat.append(record)
                    block_record["lines"].append(
                        {
                            "id": f"{block_record['id']}-l{line_index:04d}",
                            "words": words,
                        }
                    )
                flow_record["blocks"].append(block_record)
            flows.append(flow_record)
        layout_text = layout_pages[page_index] if page_index < len(layout_pages) else ""
        evidence = {
            "schema_version": SCHEMA_VERSION,
            "page": page_number,
            "width": float(page.attrib.get("width", 0)),
            "height": float(page.attrib.get("height", 0)),
            "flows": flows,
            "words": words_flat,
            "layout_text": layout_text,
        }
        atomic_write_json(pages_dir / f"{page_id}.native-b.json", evidence)
        atomic_write_text(pages_dir / f"{page_id}.native-b.txt", layout_text)
        if page_number % 50 == 0 or page_number == len(parsed_pages):
            print(f"native-b: {page_number}/{len(parsed_pages)}", flush=True)


def extract(project: Path, render_dpi: int) -> None:
    extract_native_a(project, render_dpi)
    extract_native_b(project)
    print("extract: complete")


@dataclasses.dataclass(frozen=True)
class OcrJob:
    page: int
    image: str
    destination: str
    render_sha256: str
    render_dpi: int
    render_width: int
    render_height: int
    pdf_to_render_matrix: tuple[float, ...]
    language: str
    page_segmentation_mode: int


def ocr_one(job: OcrJob) -> dict:
    command = [
        "tesseract",
        job.image,
        "stdout",
        "-l",
        job.language,
        "--psm",
        str(job.page_segmentation_mode),
        "tsv",
    ]
    result = subprocess.run(
        command,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    raw_destination = Path(job.destination).with_name(
        Path(job.destination).name.replace(".ocr.json", ".ocr.raw.tsv")
    )
    atomic_write_text(raw_destination, result.stdout)
    headers = [
        "level",
        "page_num",
        "block_num",
        "par_num",
        "line_num",
        "word_num",
        "left",
        "top",
        "width",
        "height",
        "conf",
        "text",
    ]
    words = []
    parse_errors = []
    for line_number, line in enumerate(result.stdout.splitlines()[1:], start=2):
        columns = line.split("\t")
        if len(columns) != len(headers):
            if len(parse_errors) < 100:
                parse_errors.append(
                    {
                        "line": line_number,
                        "column_count": len(columns),
                        "content": line[:500],
                    }
                )
            continue
        row = dict(zip(headers, columns))
        value = row.get("text", "")
        if not value.strip():
            continue
        confidence = float(row.get("conf", -1) or -1)
        words.append(
            {
                "id": f"{page_name(job.page)}-ocr-w{len(words) + 1:05d}",
                "text": value,
                "confidence": confidence,
                "bbox_pixels": [
                    int(row["left"]),
                    int(row["top"]),
                    int(row["left"]) + int(row["width"]),
                    int(row["top"]) + int(row["height"]),
                ],
                "block": int(row["block_num"]),
                "paragraph": int(row["par_num"]),
                "line": int(row["line_num"]),
            }
        )
    text_lines = []
    current = None
    current_words = []
    for word in words:
        key = (word["block"], word["paragraph"], word["line"])
        if current is not None and key != current:
            text_lines.append(" ".join(current_words))
            current_words = []
        current = key
        current_words.append(word["text"])
    if current_words:
        text_lines.append(" ".join(current_words))
    payload = {
        "schema_version": SCHEMA_VERSION,
        "page": job.page,
        "engine": command_version(["tesseract", "--version"]),
        "configuration": {
            "language": job.language,
            "page_segmentation_mode": job.page_segmentation_mode,
        },
        "input_render_sha256": job.render_sha256,
        "input_render_dimensions": [job.render_width, job.render_height],
        "render_dpi": job.render_dpi,
        "pdf_to_render_matrix": list(job.pdf_to_render_matrix),
        "raw_tsv_sha256": sha256_file(raw_destination),
        "parse_errors": parse_errors,
        "words": words,
        "text": "\n".join(text_lines) + ("\n" if text_lines else ""),
    }
    atomic_write_json(Path(job.destination), payload)
    return {"page": job.page, "word_count": len(words)}


def ocr(project: Path, workers: int, language: str, page_segmentation_mode: int) -> None:
    if not re.fullmatch(r"[A-Za-z0-9_.+-]+", language):
        raise SystemExit(f"Unsafe Tesseract language selection: {language!r}")
    if not 0 <= page_segmentation_mode <= 13:
        raise SystemExit("Tesseract page segmentation mode must be between 0 and 13")
    source, _ = assert_source(project)
    doc = fitz.open(source)
    pages_dir = project / "source/pages"
    jobs = []
    for page_number in range(1, doc.page_count + 1):
        destination = pages_dir / f"{page_name(page_number)}.ocr.json"
        image = pages_dir / f"{page_name(page_number)}.render.png"
        if not image.exists():
            raise SystemExit(f"Missing rendered evidence: {image}")
        native = json.loads(
            (pages_dir / f"{page_name(page_number)}.native-a.json").read_text(
                encoding="utf-8"
            )
        )
        page_record = native["page"]
        observed_render_hash = sha256_file(image)
        if observed_render_hash != page_record["render"]["sha256"]:
            raise SystemExit(f"render hash mismatch for page {page_number}")
        if destination.exists():
            existing = json.loads(destination.read_text(encoding="utf-8"))
            if (
                existing.get("input_render_sha256") != observed_render_hash
                or existing.get("render_dpi") != page_record["render_dpi"]
                or existing.get("pdf_to_render_matrix")
                != page_record["pdf_to_render_matrix"]
                or existing.get("configuration")
                != {
                    "language": language,
                    "page_segmentation_mode": page_segmentation_mode,
                }
            ):
                raise SystemExit(
                    f"stale OCR evidence for page {page_number}; preserve it as a revision before rerunning"
                )
            continue
        jobs.append(
            OcrJob(
                page_number,
                str(image),
                str(destination),
                observed_render_hash,
                page_record["render_dpi"],
                page_record["render"]["width_pixels"],
                page_record["render"]["height_pixels"],
                tuple(page_record["pdf_to_render_matrix"]),
                language,
                page_segmentation_mode,
            )
        )
    completed = 0
    with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(ocr_one, job) for job in jobs]
        for future in concurrent.futures.as_completed(futures):
            future.result()
            completed += 1
            if completed % 25 == 0 or completed == len(jobs):
                print(f"ocr: {completed}/{len(jobs)} new pages", flush=True)
    print(f"ocr: complete ({doc.page_count - len(jobs)} reused)")


def sequence_stats(left: str, right: str) -> dict:
    left_normalized = normalize_diagnostic(left)
    right_normalized = normalize_diagnostic(right)
    matcher = difflib.SequenceMatcher(None, left_normalized, right_normalized, autojunk=False)
    replacements = insertions = deletions = 0
    differences = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        if tag == "replace":
            replacements += max(i2 - i1, j2 - j1)
        elif tag == "insert":
            insertions += j2 - j1
        elif tag == "delete":
            deletions += i2 - i1
        if len(differences) < 100:
            differences.append(
                {
                    "operation": tag,
                    "left": left_normalized[i1:i2],
                    "right": right_normalized[j1:j2],
                    "left_range": [i1, i2],
                    "right_range": [j1, j2],
                }
            )
    return {
        "left_characters": len(left_normalized),
        "right_characters": len(right_normalized),
        "ratio": matcher.ratio(),
        "replacements": replacements,
        "insertions": insertions,
        "deletions": deletions,
        "differences_sample": differences,
    }


def nonwhitespace_sequence_stats(left: str, right: str) -> dict:
    left_stream = "".join(value for value in unicodedata.normalize("NFC", left) if not value.isspace())
    right_stream = "".join(value for value in unicodedata.normalize("NFC", right) if not value.isspace())
    matcher = difflib.SequenceMatcher(None, left_stream, right_stream, autojunk=False)
    differences = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        if len(differences) < 100:
            differences.append(
                {
                    "operation": tag,
                    "left": left_stream[i1:i2],
                    "right": right_stream[j1:j2],
                    "left_range": [i1, i2],
                    "right_range": [j1, j2],
                }
            )
    return {
        "left_characters": len(left_stream),
        "right_characters": len(right_stream),
        "ratio": matcher.ratio(),
        "exact": left_stream == right_stream,
        "differences_sample": differences,
    }


def compare(project: Path) -> None:
    source, _ = assert_source(project)
    doc = fitz.open(source)
    pages_dir = project / "source/pages"
    records = []
    dispute_pages = []
    for page_number in range(1, doc.page_count + 1):
        page_id = page_name(page_number)
        a = json.loads((pages_dir / f"{page_id}.native-a.json").read_text(encoding="utf-8"))
        b = json.loads((pages_dir / f"{page_id}.native-b.json").read_text(encoding="utf-8"))
        pdfkit_path = pages_dir / f"{page_id}.native-c-pdfkit.txt"
        pdfkit_text = pdfkit_path.read_text(encoding="utf-8") if pdfkit_path.exists() else ""
        ocr_path = pages_dir / f"{page_id}.ocr.json"
        ocr_payload = json.loads(ocr_path.read_text(encoding="utf-8")) if ocr_path.exists() else {"text": ""}
        native_stats = sequence_stats(a["native_text"], b["layout_text"])
        poppler_pdfkit_stats = sequence_stats(b["layout_text"], pdfkit_text)
        pymupdf_pdfkit_stats = sequence_stats(a["native_text"], pdfkit_text)
        native_nonspace = nonwhitespace_sequence_stats(a["native_text"], b["layout_text"])
        poppler_pdfkit_nonspace = nonwhitespace_sequence_stats(b["layout_text"], pdfkit_text)
        pymupdf_pdfkit_nonspace = nonwhitespace_sequence_stats(a["native_text"], pdfkit_text)
        ocr_stats = sequence_stats(a["native_text"], ocr_payload.get("text", ""))
        record = {
            "page": page_number,
            "native_a_vs_native_b": native_stats,
            "native_b_vs_pdfkit": poppler_pdfkit_stats,
            "native_a_vs_pdfkit": pymupdf_pdfkit_stats,
            "native_a_vs_native_b_nonwhitespace": native_nonspace,
            "native_b_vs_pdfkit_nonwhitespace": poppler_pdfkit_nonspace,
            "native_a_vs_pdfkit_nonwhitespace": pymupdf_pdfkit_nonspace,
            "native_a_vs_ocr": ocr_stats,
            "layout_review_required": (
                native_stats["ratio"] < 0.999999
                or poppler_pdfkit_stats["ratio"] < 0.999999
                or pymupdf_pdfkit_stats["ratio"] < 0.999999
            ),
            "review_required": (
                not native_nonspace["exact"]
                or not poppler_pdfkit_nonspace["exact"]
                or not pymupdf_pdfkit_nonspace["exact"]
                or (
                len(a["native_text"].strip()) == 0 and len(ocr_payload.get("text", "").strip()) > 0
                )
            ),
        }
        records.append(record)
        if record["review_required"]:
            dispute_pages.append(page_number)
    report = {
        "schema_version": SCHEMA_VERSION,
        "page_count": doc.page_count,
        "native_exact_after_diagnostic_normalization": sum(
            record["native_a_vs_native_b"]["ratio"] == 1.0 for record in records
        ),
        "poppler_pdfkit_exact_after_diagnostic_normalization": sum(
            record["native_b_vs_pdfkit"]["ratio"] == 1.0 for record in records
        ),
        "pymupdf_pdfkit_exact_after_diagnostic_normalization": sum(
            record["native_a_vs_pdfkit"]["ratio"] == 1.0 for record in records
        ),
        "native_nonwhitespace_exact": sum(
            record["native_a_vs_native_b_nonwhitespace"]["exact"] for record in records
        ),
        "poppler_pdfkit_nonwhitespace_exact": sum(
            record["native_b_vs_pdfkit_nonwhitespace"]["exact"] for record in records
        ),
        "pymupdf_pdfkit_nonwhitespace_exact": sum(
            record["native_a_vs_pdfkit_nonwhitespace"]["exact"] for record in records
        ),
        "layout_review_pages": [
            record["page"] for record in records if record["layout_review_required"]
        ],
        "review_required_pages": dispute_pages,
        "pages": records,
    }
    atomic_write_json(project / "qa/extractor-comparison.json", report)
    print(
        f"compare: {len(dispute_pages)}/{doc.page_count} pages require evidence review"
    )


def point_inside_bbox(x: float, y: float, bbox: list[float], padding: float = 2.0) -> bool:
    return (
        bbox[0] - padding <= x <= bbox[2] + padding
        and bbox[1] - padding <= y <= bbox[3] + padding
    )


def coverage(project: Path) -> None:
    source, _ = assert_source(project)
    doc = fitz.open(source)
    pages_dir = project / "source/pages"
    records = []
    pages_with_ocr_only = []
    for page_number in range(1, doc.page_count + 1):
        page_id = page_name(page_number)
        native = json.loads(
            (pages_dir / f"{page_id}.native-a.json").read_text(encoding="utf-8")
        )
        ocr_payload = json.loads(
            (pages_dir / f"{page_id}.ocr.json").read_text(encoding="utf-8")
        )
        pdf_to_render = fitz.Matrix(*native["page"]["pdf_to_render_matrix"])
        render_to_pdf = fitz.Matrix(pdf_to_render)
        if render_to_pdf.invert() != 0:
            raise SystemExit(f"non-invertible PDF-to-render matrix on page {page_number}")
        text_regions = [
            rect_list(fitz.Rect(block["bbox"]) * pdf_to_render)
            for block in native["blocks"]
            if block["type"] == "text"
        ]
        image_regions = [
            rect_list(fitz.Rect(block["bbox"]) * pdf_to_render)
            for block in native["blocks"]
            if block["type"] == "image"
        ]
        ocr_only = []
        for word in ocr_payload["words"]:
            x0, y0, x1, y1 = word["bbox_pixels"]
            center_x = (x0 + x1) / 2.0
            center_y = (y0 + y1) / 2.0
            if any(point_inside_bbox(center_x, center_y, bbox) for bbox in text_regions):
                continue
            inside_image = next(
                (
                    index + 1
                    for index, bbox in enumerate(image_regions)
                    if point_inside_bbox(center_x, center_y, bbox, padding=0.0)
                ),
                None,
            )
            ocr_only.append(
                {
                    **word,
                    "center_pdf": point_list(
                        fitz.Point(center_x, center_y) * render_to_pdf
                    ),
                    "inside_image_block": inside_image,
                }
            )
        record = {
            "page": page_number,
            "native_text_regions": len(text_regions),
            "image_regions": len(image_regions),
            "ocr_words": len(ocr_payload["words"]),
            "ocr_words_without_native_region_overlap": ocr_only,
            "review_required": bool(ocr_only),
        }
        records.append(record)
        if ocr_only:
            pages_with_ocr_only.append(page_number)
    report = {
        "schema_version": SCHEMA_VERSION,
        "method": "OCR word-center overlap against native text regions in PDF coordinates",
        "page_count": doc.page_count,
        "pages_with_ocr_only_candidates": pages_with_ocr_only,
        "pages": records,
    }
    atomic_write_json(project / "qa/render-text-coverage.json", report)
    print(f"coverage: OCR-only candidates on {len(pages_with_ocr_only)} pages")


def read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def markdown_fence(value: str) -> str:
    longest = max((len(match.group(0)) for match in re.finditer(r"`+", value)), default=0)
    fence = "`" * max(3, longest + 1)
    return f"{fence}text\n{value}{'' if value.endswith(chr(10)) else chr(10)}{fence}\n"


def build(project: Path) -> None:
    chapters_path = project / "manifests/chapters.accepted.json"
    canonical_path = project / "manifests/canonical-pages.jsonl"
    if not chapters_path.exists() or not canonical_path.exists():
        raise SystemExit(
            "build requires manifests/chapters.accepted.json and manifests/canonical-pages.jsonl"
        )
    chapters = json.loads(chapters_path.read_text(encoding="utf-8"))["chapters"]
    canonical_pages = {record["page"]: record for record in read_jsonl(canonical_path)}
    release_index = []
    for chapter in chapters:
        chapter_dir = project / "chapters" / chapter["slug"]
        chapter_dir.mkdir(parents=True, exist_ok=True)
        literal_parts = [f"# {chapter['title']} — Literal Edition\n\n"]
        readable_parts = [f"# {chapter['title']}\n\n"]
        alignment = []
        for ownership in chapter["ownership"]:
            page_number = ownership["page"]
            page = canonical_pages[page_number]
            literal_text = page["literal_text"]
            reading_text = page.get("reading_text", literal_text)
            literal_parts.append(f"<!-- pdf-page: {page_number} -->\n\n")
            literal_parts.append(markdown_fence(literal_text))
            literal_parts.append("\n")
            readable_parts.append(f"<!-- pdf-page: {page_number} -->\n\n")
            readable_parts.append(reading_text.rstrip() + "\n\n")
            alignment.extend(page.get("alignment", []))
        literal = "".join(literal_parts)
        readable = "".join(readable_parts)
        atomic_write_text(chapter_dir / "chapter.literal.md", literal)
        atomic_write_text(chapter_dir / "chapter.md", readable)
        atomic_write_jsonl(chapter_dir / "alignment.jsonl", alignment)
        metadata = {
            **chapter,
            "literal_sha256": hashlib.sha256(literal.encode("utf-8")).hexdigest(),
            "reading_sha256": hashlib.sha256(readable.encode("utf-8")).hexdigest(),
        }
        atomic_write_text(
            chapter_dir / "metadata.yaml",
            yaml.safe_dump(metadata, sort_keys=False, allow_unicode=True),
        )
        release_index.append(metadata)
    atomic_write_json(project / "release/index.json", {"chapters": release_index})
    print(f"build: generated {len(release_index)} chapters")


def audit(project: Path) -> None:
    index_path = project / "release/index.json"
    canonical_path = project / "manifests/canonical-pages.jsonl"
    if not index_path.exists() or not canonical_path.exists():
        raise SystemExit("audit requires a completed deterministic build")
    chapters = json.loads(index_path.read_text(encoding="utf-8"))["chapters"]
    canonical = read_jsonl(canonical_path)
    canonical_atoms = [
        atom_id
        for page in canonical
        for atom_id in page.get("accepted_atom_ids", [])
    ]
    output_atoms = []
    hash_failures = []
    for chapter in chapters:
        chapter_dir = project / "chapters" / chapter["slug"]
        literal = chapter_dir / "chapter.literal.md"
        observed_hash = sha256_file(literal)
        if observed_hash != chapter["literal_sha256"]:
            hash_failures.append(chapter["slug"])
        alignment = read_jsonl(chapter_dir / "alignment.jsonl")
        output_atoms.extend(record["atom_id"] for record in alignment if "atom_id" in record)
    output_counts = Counter(output_atoms)
    missing = sorted(set(canonical_atoms) - set(output_atoms))
    invented = sorted(set(output_atoms) - set(canonical_atoms))
    duplicated = sorted(atom for atom, count in output_counts.items() if count != 1)
    unresolved = [
        page["page"] for page in canonical if page.get("verification") != "ACCEPTED"
    ]
    passed = not (missing or invented or duplicated or hash_failures or unresolved)
    report = {
        "schema_version": SCHEMA_VERSION,
        "status": "VERIFIED-TEXT-1TO1" if passed else "DRAFT-NOT-VERIFIED",
        "canonical_atom_count": len(canonical_atoms),
        "output_atom_count": len(output_atoms),
        "missing_atom_ids": missing,
        "invented_atom_ids": invented,
        "duplicated_atom_ids": duplicated,
        "chapter_hash_failures": hash_failures,
        "unresolved_pages": unresolved,
    }
    atomic_write_json(project / "qa/release-report.json", report)
    print(f"audit: {report['status']}")
    if not passed:
        raise SystemExit(1)


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    subparsers = result.add_subparsers(dest="command", required=True)
    for name in ("compare", "coverage", "build", "audit"):
        command = subparsers.add_parser(name)
        command.add_argument("--project", required=True, type=Path)
    preflight_parser = subparsers.add_parser("preflight")
    preflight_parser.add_argument("--project", required=True, type=Path)
    preflight_parser.add_argument("--fidelity-contract", type=Path)
    extract_parser = subparsers.add_parser("extract")
    extract_parser.add_argument("--project", required=True, type=Path)
    extract_parser.add_argument("--render-dpi", type=int, default=300)
    ocr_parser = subparsers.add_parser("ocr")
    ocr_parser.add_argument("--project", required=True, type=Path)
    ocr_parser.add_argument("--workers", type=int, default=max(1, min(8, os.cpu_count() or 1)))
    ocr_parser.add_argument("--language", default="eng")
    ocr_parser.add_argument("--psm", type=int, default=3)
    return result


def main() -> None:
    arguments = parser().parse_args()
    project = arguments.project.resolve()
    if arguments.command == "preflight":
        preflight(project, arguments.fidelity_contract)
    elif arguments.command == "extract":
        extract(project, arguments.render_dpi)
    elif arguments.command == "ocr":
        ocr(project, arguments.workers, arguments.language, arguments.psm)
    elif arguments.command == "compare":
        compare(project)
    elif arguments.command == "coverage":
        coverage(project)
    elif arguments.command == "build":
        build(project)
    elif arguments.command == "audit":
        audit(project)


if __name__ == "__main__":
    main()
