# Independent forward test

The skill was forward-tested in an isolated temporary directory against a
five-page synthetic PDF that was deliberately unlike the prior-book source:

- portrait Letter, landscape Letter, rotated custom geometry, and A4 pages;
- two independent raster objects on one page;
- a chapter transition halfway through a page;
- a vector-only circle-and-four-spoke diagram with rotated Spanish labels;
- a scanned-only page with OCR-visible text; and
- a visually nonblank page that simple blank-page heuristics could discard.

The agent read the skill and required references, spawned an independent PDF
inspection role, froze the source hash, and ran preflight, 300-DPI rendering,
PyMuPDF, Poppler, PDFKit, Tesseract, extractor comparison, and coverage. It
correctly stopped at:

```text
PREFLIGHT_EVIDENCE_ONLY / REVIEW_REQUIRED / NOT CONVERTED / NOT VERIFIED
```

It did not consult or emit any prior-book acceptance artifacts.

The test found and prompted fixes for:

- fidelity-contract packaging in new projects;
- rotated PDF-to-render affine matrices;
- idempotent render dimension validation; and
- configurable Tesseract language and page-segmentation mode.

The patched evidence helper then completed and repeated extraction
idempotently. On the rotated page it recorded a 2917×2084 render and matrix:

```text
[0.0, 4.16666651, -4.16666651, 0.0, 2916.66650391, 0.0]
```

Remaining work was honestly surfaced rather than bypassed: exact XObject/mask
preservation, semantic vector clustering, region-level boundary acceptance,
canonical text adjudication, visual reviews, and a new book-specific hardened
compiler/release audit. Use this fixture shape as a minimum regression model
when materially changing the toolchain.
