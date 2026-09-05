#!/usr/bin/env python3
"""Publish a small, stable reader-facing folder from an audited release."""

from __future__ import annotations

import argparse
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import tempfile
import uuid


CURRENT_RELEASE = re.compile(r"verified-[0-9a-f]{16}\Z")
CHAPTER_DIRECTORY = re.compile(r"[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\Z")
OBJECT_ID = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
ASCII_FILENAME = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\.ascii\.txt\Z")
PAGE_COMMENT = re.compile(r"<!-- pdf-page: ([0-9]+) -->")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def strict_json_load(path: Path) -> dict:
    def reject_duplicates(pairs: list[tuple[str, object]]) -> dict:
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"duplicate JSON key {key!r} in {path}")
            result[key] = value
        return result

    value = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=reject_duplicates)
    if not isinstance(value, dict):
        raise ValueError(f"expected a JSON object: {path}")
    return value


def regular_file(path: Path, *, label: str) -> Path:
    try:
        mode = os.lstat(path).st_mode
    except OSError as error:
        raise SystemExit(f"missing {label}: {path}") from error
    if stat.S_ISLNK(mode) or not stat.S_ISREG(mode):
        raise SystemExit(f"{label} is not a regular non-symlink file: {path}")
    return path


def real_directory(path: Path, *, label: str) -> Path:
    try:
        mode = os.lstat(path).st_mode
    except OSError as error:
        raise SystemExit(f"missing {label}: {path}") from error
    if stat.S_ISLNK(mode) or not stat.S_ISDIR(mode):
        raise SystemExit(f"{label} is not a real non-symlink directory: {path}")
    return path


def safe_relative(value: str) -> PurePosixPath:
    if not value or "\\" in value or "\0" in value:
        raise ValueError(f"unsafe relative path: {value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise ValueError(f"unsafe relative path: {value!r}")
    if ":" in path.parts[0] or "?" in value or "#" in value:
        raise ValueError(f"unsafe relative path: {value!r}")
    return path


class ReaderMarkupParser(HTMLParser):
    """Collect exact source-image and semantic-ASCII channels from Markdown."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.images: list[tuple[str, str]] = []
        self.ascii: list[tuple[str, str, str]] = []
        self.events: list[tuple[str, str, str]] = []
        self._active_ascii: tuple[str, str] | None = None
        self._active_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "img" and "data-source-object" in attributes:
            source = attributes.get("src")
            object_id = attributes.get("data-source-object")
            if not source or not object_id:
                raise ValueError("source-object image lacks src or object ID")
            self.images.append((object_id, source))
            self.events.append(("image", object_id, source))
        if tag != "pre":
            return
        object_id = attributes.get("data-semantic-ascii-object")
        filename = attributes.get("data-semantic-ascii-file")
        if object_id is None and filename is None:
            return
        if not object_id or not filename or self._active_ascii is not None:
            raise ValueError("malformed or nested semantic ASCII container")
        self._active_ascii = (object_id, filename)
        self._active_parts = []

    def handle_data(self, data: str) -> None:
        if self._active_ascii is not None:
            self._active_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != "pre" or self._active_ascii is None:
            return
        object_id, filename = self._active_ascii
        value = "".join(self._active_parts)
        self.ascii.append((object_id, filename, value))
        self.events.append(("ascii", object_id, filename))
        self._active_ascii = None
        self._active_parts = []


def parse_reader_markdown(value: str) -> ReaderMarkupParser:
    parser = ReaderMarkupParser()
    parser.feed(value)
    parser.close()
    if parser._active_ascii is not None:
        raise ValueError("unterminated semantic ASCII container")
    return parser


def ensure_visual_order(parser: ReaderMarkupParser, *, label: str) -> None:
    seen_images: set[str] = set()
    for kind, object_id, filename_or_source in parser.events:
        if kind == "image":
            if object_id in seen_images:
                raise SystemExit(f"duplicate source image in {label}: {object_id}")
            seen_images.add(object_id)
            continue
        if filename_or_source == "facsimile.ascii.txt":
            raise SystemExit(f"mechanical raster ASCII is inline in {label}: {object_id}")
        if object_id not in seen_images:
            raise SystemExit(f"ASCII precedes its exact source image in {label}: {object_id}")


def scan_tree(root: Path) -> list[str]:
    real_directory(root, label="export tree")
    files: list[str] = []
    stack = [root]
    while stack:
        directory = stack.pop()
        with os.scandir(directory) as entries:
            for entry in sorted(entries, key=lambda item: item.name):
                mode = entry.stat(follow_symlinks=False).st_mode
                path = Path(entry.path)
                if stat.S_ISLNK(mode):
                    raise SystemExit(f"export contains a symlink: {path}")
                if stat.S_ISDIR(mode):
                    stack.append(path)
                elif stat.S_ISREG(mode):
                    files.append(path.relative_to(root).as_posix())
                else:
                    raise SystemExit(f"export contains a special file: {path}")
    return sorted(files)


def scan_directories(root: Path) -> list[str]:
    real_directory(root, label="export tree")
    directories: list[str] = []
    stack = [root]
    while stack:
        directory = stack.pop()
        with os.scandir(directory) as entries:
            for entry in sorted(entries, key=lambda item: item.name):
                mode = entry.stat(follow_symlinks=False).st_mode
                if stat.S_ISLNK(mode):
                    raise SystemExit(f"export contains a symlink: {entry.path}")
                if stat.S_ISDIR(mode):
                    child = Path(entry.path)
                    directories.append(child.relative_to(root).as_posix())
                    stack.append(child)
                elif not stat.S_ISREG(mode):
                    raise SystemExit(f"export contains a special file: {entry.path}")
    return sorted(directories)


def expected_directories(files: list[str]) -> list[str]:
    directories: set[str] = set()
    for relative in files:
        path = safe_relative(relative)
        for parent in path.parents:
            if parent != PurePosixPath("."):
                directories.add(parent.as_posix())
    return sorted(directories)


def trees_equal(left: Path, right: Path) -> bool:
    left_files = scan_tree(left)
    right_files = scan_tree(right)
    return (
        left_files == right_files
        and scan_directories(left) == scan_directories(right)
        and all(
            (left / relative).read_bytes() == (right / relative).read_bytes()
            for relative in left_files
        )
    )


def copy_exact(source: Path, destination: Path) -> None:
    regular_file(source, label="export source")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    if (
        source.stat().st_size != destination.stat().st_size
        or sha256(source) != sha256(destination)
    ):
        raise SystemExit(f"export copy differs from authority: {source}")


def readme(
    chapters: list[dict],
    *,
    title: str,
    page_count: int,
    image_count: int,
    ascii_count: int,
) -> str:
    rows = []
    for chapter in chapters:
        chapter_title = str(chapter["title"]).replace("|", "\\|")
        pages = chapter["pages"]
        page_label = str(pages[0]) if len(pages) == 1 else f"{pages[0]}–{pages[-1]}"
        directory = chapter["directory"]
        rows.append(
            f"| {directory[:2]} | [{chapter_title}](chapters/{directory}/chapter.md) | {page_label} |"
        )
    table = "\n".join(rows)
    return f"""# {title} — final Markdown folder

Start with [the complete readable book](whole-book.md).

This is the stable, portable reading folder. It contains:

- one complete readable Markdown file;
- {len(chapters)} ordered section/chapter Markdown files covering all {page_count} source pages;
- {image_count} exact source figures, embedded before their readable ASCII representations;
- {ascii_count} directly inspectable reader-facing ASCII artifacts;
- the byte-identical [source PDF](source/original.pdf); and
- [SHA-256 checksums](CHECKSUMS.sha256) for every other file.

There are no build IDs or versioned release directories here. The larger
working tree outside `final/` is conversion and audit machinery; readers can
ignore it.

Mechanical raster-to-ASCII punctuation dumps are not included. The exact
source images are the visual authority, and the Markdown includes the readable
semantic/layout ASCII.

## Sections

| Order | Section | PDF pages |
|---:|---|---:|
{table}
"""


def publish_stage(stage: Path, final: Path, *, replace: bool) -> None:
    if final.is_symlink():
        raise SystemExit(f"refusing to replace symlinked final folder: {final}")
    if not final.exists():
        os.replace(stage, final)
        return
    real_directory(final, label="existing final folder")
    if trees_equal(stage, final):
        shutil.rmtree(stage)
        return
    if not replace:
        raise SystemExit(f"final folder differs; rerun with --replace: {final}")
    backup = final.parent / f".final-backup-{uuid.uuid4().hex}"
    os.replace(final, backup)
    try:
        os.replace(stage, final)
    except BaseException:
        os.replace(backup, final)
        raise
    shutil.rmtree(backup)


def publish(project: Path, *, replace: bool = False) -> dict:
    project = project.absolute()
    real_directory(project, label="project")
    current_path = regular_file(project / "release" / "CURRENT", label="release/CURRENT")
    current_bytes = current_path.read_bytes()
    try:
        release_name = current_bytes.decode("ascii").removesuffix("\n")
    except UnicodeDecodeError as error:
        raise SystemExit("release/CURRENT is not ASCII") from error
    if current_bytes != f"{release_name}\n".encode("ascii") or not CURRENT_RELEASE.fullmatch(release_name):
        raise SystemExit("release/CURRENT does not contain one canonical release name")
    release = real_directory(project / "release" / release_name, label="selected release")

    audit = strict_json_load(regular_file(project / "qa" / "final-release-report.json", label="final audit report"))
    if (
        audit.get("passed") is not True
        or audit.get("release_path") != f"release/{release_name}"
        or audit.get("publication_authority") != "release/CURRENT"
        or audit.get("deterministic_clean_rebuild", {}).get("passed") is not True
        or audit.get("deterministic_clean_rebuild", {}).get(
            "complete_sealed_tree_byte_identical"
        )
        is not True
    ):
        raise SystemExit("final audit report does not approve the selected release")
    release_manifest = regular_file(release / "MANIFEST.json", label="release manifest")
    if audit.get("release_tree_sha256") != sha256(release_manifest):
        raise SystemExit("final audit report is not bound to the selected release manifest")

    index = strict_json_load(regular_file(release / "index.json", label="release index"))
    chapters = index.get("chapters")
    if not isinstance(chapters, list) or not chapters:
        raise SystemExit("release index has no chapters")
    expected_chapter_directories = []
    for chapter in chapters:
        directory = chapter.get("directory")
        pages = chapter.get("pages")
        if (
            not isinstance(directory, str)
            or not CHAPTER_DIRECTORY.fullmatch(directory)
            or not isinstance(chapter.get("title"), str)
            or not isinstance(pages, list)
            or not pages
            or any(not isinstance(page, int) or page < 1 for page in pages)
        ):
            raise SystemExit("release index contains invalid chapter metadata")
        expected_chapter_directories.append(directory)
    if len(expected_chapter_directories) != len(set(expected_chapter_directories)):
        raise SystemExit("release index repeats a chapter directory")

    page_count = audit.get("page_count")
    if not isinstance(page_count, int) or page_count < 1:
        raise SystemExit("audit report has an invalid page count")
    source_pdf = regular_file(release / "source" / "original.pdf", label="release source PDF")
    if sha256(source_pdf) != audit.get("source_pdf_sha256"):
        raise SystemExit("release source PDF differs from the audited source hash")

    authority_files: dict[str, Path] = {
        "whole-book.md": regular_file(release / "whole-book.md", label="readable whole book"),
        "source/original.pdf": source_pdf,
    }
    aggregate_images: list[tuple[str, str]] = []
    aggregate_ascii: list[tuple[str, str, str]] = []
    aggregate_pages: list[int] = []
    object_owner: dict[str, str] = {}

    for chapter in chapters:
        directory = chapter["directory"]
        source_markdown = regular_file(
            release / "chapters" / directory / "chapter.md",
            label=f"readable chapter {directory}",
        )
        relative_markdown = f"chapters/{directory}/chapter.md"
        authority_files[relative_markdown] = source_markdown
        value = source_markdown.read_text(encoding="utf-8")
        if "page-facsimiles/" in value or "data-pdf-page-facsimile" in value:
            raise SystemExit(f"reader chapter contains page-facsimile material: {directory}")
        parser = parse_reader_markdown(value)
        ensure_visual_order(parser, label=relative_markdown)

        for object_id, source in parser.images:
            if not OBJECT_ID.fullmatch(object_id):
                raise SystemExit(f"unsafe object ID in {relative_markdown}: {object_id}")
            expected_source = f"assets/{object_id}/source-xobject.jpg"
            if source != expected_source or object_id in object_owner:
                raise SystemExit(f"noncanonical or duplicate source image: {directory}:{object_id}")
            object_owner[object_id] = directory
            release_relative = f"chapters/{directory}/{source}"
            authority_files[release_relative] = regular_file(
                release / Path(*safe_relative(release_relative).parts),
                label=f"source image {object_id}",
            )
            aggregate_images.append((object_id, release_relative))

        for object_id, filename, ascii_value in parser.ascii:
            if (
                object_id not in object_owner
                or object_owner[object_id] != directory
                or not ASCII_FILENAME.fullmatch(filename)
                or filename == "facsimile.ascii.txt"
            ):
                raise SystemExit(f"invalid reader-facing ASCII identity: {directory}:{object_id}:{filename}")
            release_relative = f"chapters/{directory}/assets/{object_id}/{filename}"
            source_ascii = regular_file(
                release / Path(*safe_relative(release_relative).parts),
                label=f"reader-facing ASCII {object_id}:{filename}",
            )
            if source_ascii.read_text(encoding="ascii") != ascii_value:
                raise SystemExit(f"inline ASCII differs from its asset: {object_id}:{filename}")
            if release_relative in authority_files:
                raise SystemExit(f"duplicate reader-facing ASCII asset: {release_relative}")
            authority_files[release_relative] = source_ascii
            aggregate_ascii.append((object_id, filename, ascii_value))

        chapter_pages = [int(value) for value in PAGE_COMMENT.findall(value)]
        if chapter_pages != chapter["pages"]:
            raise SystemExit(f"chapter page markers differ from the index: {directory}")
        aggregate_pages.extend(chapter_pages)

    whole_value = authority_files["whole-book.md"].read_text(encoding="utf-8")
    if "page-facsimiles/" in whole_value or "data-pdf-page-facsimile" in whole_value:
        raise SystemExit("readable whole book contains page-facsimile material")
    whole_parser = parse_reader_markdown(whole_value)
    ensure_visual_order(whole_parser, label="whole-book.md")
    expected_whole_images = [
        (object_id, release_relative)
        for object_id, release_relative in aggregate_images
    ]
    if whole_parser.images != expected_whole_images:
        raise SystemExit("whole-book source-image order/paths differ from the chapters")
    if whole_parser.ascii != aggregate_ascii:
        raise SystemExit("whole-book ASCII sequence differs from the chapters")
    whole_pages = [int(value) for value in PAGE_COMMENT.findall(whole_value)]
    expected_pages = list(range(1, page_count + 1))
    if aggregate_pages != expected_pages or whole_pages != expected_pages:
        raise SystemExit("readable Markdown does not cover source pages exactly once in order")

    visual_qa = audit.get("visual_qa")
    if not isinstance(visual_qa, dict) or visual_qa.get("objects_inventoried") != len(object_owner):
        raise SystemExit("reader source-image count differs from the audited visual inventory")
    if len(aggregate_ascii) != len({(item[0], item[1]) for item in aggregate_ascii}):
        raise SystemExit("reader-facing ASCII object/file identities collide")

    final = project / "final"
    title = project.name.split("__", 1)[0].replace("_", " ").strip() or "Book"
    stage = Path(tempfile.mkdtemp(prefix=".final-build-", dir=project))
    try:
        for relative, source in sorted(authority_files.items()):
            copy_exact(source, stage / Path(*safe_relative(relative).parts))
        (stage / "README.md").write_text(
            readme(
                chapters,
                title=title,
                page_count=page_count,
                image_count=len(object_owner),
                ascii_count=len(aggregate_ascii),
            ),
            encoding="utf-8",
        )
        expected_without_checksums = sorted([*authority_files, "README.md"])
        if (
            scan_tree(stage) != expected_without_checksums
            or scan_directories(stage)
            != expected_directories(expected_without_checksums)
        ):
            raise SystemExit("staged final tree differs from the derived allowlist")
        checksum_lines = [
            f"{sha256(stage / Path(*safe_relative(relative).parts))}  {relative}\n"
            for relative in expected_without_checksums
        ]
        (stage / "CHECKSUMS.sha256").write_text(
            "".join(checksum_lines), encoding="ascii"
        )
        expected_tree = sorted([*expected_without_checksums, "CHECKSUMS.sha256"])
        if (
            scan_tree(stage) != expected_tree
            or scan_directories(stage) != expected_directories(expected_tree)
        ):
            raise SystemExit("staged final tree is not exactly closed")
        publish_stage(stage, final, replace=replace)
    finally:
        if stage.exists():
            shutil.rmtree(stage)

    final_files = scan_tree(final)
    expected_final_files = sorted(
        [*authority_files, "README.md", "CHECKSUMS.sha256"]
    )
    if (
        final_files != expected_final_files
        or scan_directories(final) != expected_directories(expected_final_files)
    ):
        raise SystemExit("published final tree differs from the allowlist")
    for relative, source in authority_files.items():
        published = regular_file(
            final / Path(*safe_relative(relative).parts), label=f"published {relative}"
        )
        if published.read_bytes() != source.read_bytes():
            raise SystemExit(f"published final file differs from authority: {relative}")
    expected_checksums = "".join(
        f"{sha256(final / Path(*safe_relative(relative).parts))}  {relative}\n"
        for relative in sorted([*authority_files, "README.md"])
    )
    if (final / "CHECKSUMS.sha256").read_text(encoding="ascii") != expected_checksums:
        raise SystemExit("published checksum ledger is stale")
    if current_path.read_bytes() != current_bytes:
        raise SystemExit("release/CURRENT changed during final publication")

    return {
        "passed": True,
        "final_path": str(final),
        "file_count": len(final_files),
        "chapter_count": len(chapters),
        "page_count": page_count,
        "source_image_count": len(object_owner),
        "reader_ascii_count": len(aggregate_ascii),
        "inline_raster_facsimile_count": 0,
        "source_pdf_sha256": sha256(final / "source" / "original.pdf"),
        "checksums_sha256": sha256(final / "CHECKSUMS.sha256"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument(
        "--replace",
        action="store_true",
        help="atomically replace an existing nonidentical final folder",
    )
    arguments = parser.parse_args()
    print(json.dumps(publish(arguments.project, replace=arguments.replace), sort_keys=True))


if __name__ == "__main__":
    main()
