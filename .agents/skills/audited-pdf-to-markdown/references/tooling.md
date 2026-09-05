# Tooling and portability notes

Read this before copying or adapting an existing book conversion.

## What is reusable as-is

The bundled evidence generator is source-driven rather than book-driven:

- `scripts/pipeline.py preflight`
- `scripts/pipeline.py extract`
- `scripts/pipeline.py ocr`
- `scripts/pipeline.py compare`
- `scripts/pipeline.py coverage`

`record_stage.py` and `render_ascii_facsimile.py` are also generic within their
declared schemas. The raster renderer creates audit evidence only.

`publish_final_folder.py` is reusable when the audited compiler emits the
standard release contract described below.

## What must be derived per book

Before adapting any prior hardened compiler, create a book profile binding:

- title and stable project identifier;
- source PDF path, bytes, SHA-256, and page count;
- page geometry/render profile and toolchain versions;
- exhaustive chapter/section page ownership;
- complete text atom and visual object universes;
- visual object IDs, types, source hashes, and required review roles;
- accepted manifest and canonical generation identifiers;
- exact independent review paths, byte counts, payload hashes, and seals; and
- final expected counts derived from the accepted manifests.

Use [book-profile.md](book-profile.md) as the minimum profile checklist. It is
a schema guide, not permission to pre-accept unknown values.

Search every copied script for the prior title, source path, page count,
literal page ranges, object IDs, object counts, review paths, hashes, and
hard-coded QA totals. Replace those values with data derived from the new
profile or generated manifests. Do not mechanically search/replace a page
count while leaving fixed ranges or frozen hashes behind.

A hardened prior-book implementation can be useful as a security and closure
example, but its compiler, canonicalizer, page-facsimile generator, and
promotion scripts may contain source-specific constants. Treat such code as a
template, never as a drop-in generic program.

## Known helper boundaries

Do not mistake bundled helpers for a complete one-command converter:

- `pipeline.py` automates evidence generation. No earlier command creates the
  accepted canonical manifests consumed by its simple `build` command; the
  review/adjudication phase remains deliberate work.
- Its OCR defaults are English and Tesseract PSM 3. Parameterize both from the
  book profile for other languages/layouts.
- Native extraction inventories image blocks and vector groups but does not
  preserve every embedded XObject byte. Add a source-bound XObject/image-mask
  census and extraction stage for each new project.
- A prior-book compiler may assume one principal visual object per page
  in several places. A new compiler must use ordered `page -> [objects]`, allow
  zero or multiple objects, and support vector-only visuals.
- A prior-book boundary promoter/assembler may assign whole pages to units even
  though the protocol permits region-level transitions. If a chapter changes
  mid-page, implement and audit region-range ownership rather than forcing the
  page into one chapter.
- The final publisher assumes the standard `verified-<16 hex>` release name,
  two-digit ordered unit directories, `source-xobject.jpg`, and the documented
  HTML attributes. Either emit that contract exactly or adapt and test the
  publisher for the new release schema.
- Scanned-only, non-letter, rotated, non-JPEG, non-English, image-less
  born-digital, and more-than-99-unit sources require explicit forward tests.

Until these boundaries are addressed for the new source, describe the
toolchain as an orchestrated audited workflow—not a one-click generic
converter.

See [forward-test.md](forward-test.md) for the independent mixed-geometry,
multi-visual, scanned/vector, and same-page-boundary behavioral test.

## Standard audited release contract

The final publisher expects:

```text
<project>/
  release/
    CURRENT                         # regular file: verified-<16 hex> + LF
    verified-<16 hex>/
      README.md
      index.json
      MANIFEST.json
      whole-book.md
      chapters/<ordered-unit>/
        chapter.md
        assets/<object-id>/
          source-xobject.jpg
          <reader-facing>.ascii.txt
      source/original.pdf
  qa/final-release-report.json
```

The QA report must bind `release/CURRENT`, the selected release manifest, the
source PDF hash, page count, visual object count, and a passed byte-identical
clean rebuild. The index must list ordered chapter directories, titles, and
complete page ownership.

Readable Markdown uses these raw HTML bindings:

```html
<img src="assets/<object-id>/source-xobject.jpg"
     alt="" data-source-object="<object-id>">

<pre data-semantic-ascii-object="<object-id>"
     data-semantic-ascii-file="composition.ascii.txt">...</pre>
```

Whole-book image paths are rooted through `chapters/<ordered-unit>/`; chapter
paths remain local to the chapter directory.

## Final publication

After the full release audit passes:

```sh
python scripts/publish_final_folder.py --project /absolute/path/to/book-project
```

Use `--replace` only to atomically replace a known generated `final/` folder.
The publisher derives its copy allowlist from readable Markdown rather than
globbing assets. It copies exact source images and only reader-facing ASCII,
rejects raster dumps, checks page order and inline payloads, writes a sorted
checksum ledger, and requires idempotence.

## Dependency setup

Use a dedicated virtual environment and the pinned requirements:

```sh
python -m venv /safe/temporary/venv
/safe/temporary/venv/bin/pip install -r scripts/requirements.txt
```

The evidence pipeline also expects Poppler tools (`pdfinfo`, `pdffonts`, and
`pdftotext`) and Tesseract. The optional PDFKit extractor requires macOS and a
Swift toolchain. Record actual versions in the project toolchain lock.

## Honest stopping conditions

Evidence generation may proceed with flagged discrepancies. Promotion may not.
If a source glyph, visible mark, chapter boundary, image, label, topology
relation, review binding, or output path remains unresolved, publish a clearly
named draft or stop. Never convert an unknown into an implicit acceptance to
finish the run.
