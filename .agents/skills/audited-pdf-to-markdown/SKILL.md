---
name: audited-pdf-to-markdown
description: Manually invoked only for audited PDF-to-Markdown conversion.
---

# Audited PDF to Markdown

Treat this as an audited transcription compiler, not an OCR-and-concatenate
task. The PDF render is the appearance authority; accepted canonical ledgers
are the text/structure authority; Markdown is generated output.

## Before acting

1. Freeze the exact source PDF bytes and establish the requested project/output
   paths. Never modify the source PDF.
2. For a full conversion or any fidelity claim, read
   [references/protocol.md](references/protocol.md) completely before designing
   manifests, delegating shards, or building output.
3. Before reusing scripts or an existing book compiler, read
   [references/tooling.md](references/tooling.md). Derive a new book profile;
   never inherit another book's page count, object IDs, chapter map, expected
   hashes, or review seals.
4. Inspect local project instructions and existing user changes. Keep the
   generated reader deliverable separate from conversion/audit work products.

## Non-negotiable result

- Every render-visible text atom has one stable owner and maps exactly once.
  Do not silently correct, normalize, omit, duplicate, or reorder source text.
- Produce literal, readable, and page-facsimile editions internally. Generate
  readable Markdown from the accepted literal/canonical representation rather
  than rewriting it independently.
- Inventory all visible raster, vector, typographic, diagrammatic, and layout
  marks. “Not an embedded image” is not a valid omission reason.
- Present each exact source figure first in readable Markdown. Follow it with
  a reviewed semantic/layout ASCII reconstruction when one is meaningful.
- Keep deterministic raster-to-ASCII output as audit evidence only. Never
  inline punctuation noise as though it were the reader-facing chart.
- Preserve the original PDF as visual authority when ASCII cannot express the
  appearance exactly.
- Require independent producer/reviewer separation for accepted text and
  visual reconstructions. A producer's self-check is not the sole acceptance.
- Do not label output verified while any missing, duplicated, invented,
  unresolved, broken-reference, stale-hash, or reproducibility count is
  nonzero.
- After the audited release passes, publish one stable physical `final/`
  folder with no build ID or symlink. This is the reader interface.

## Operating workflow

1. **Preflight and evidence:** hash the PDF; record page geometry, fonts,
   metadata, and tool versions; render every page; run independent native
   extraction channels and OCR.
2. **Inventory:** classify every page region and visible object, including
   small vectors, labels, page furniture, and composites. Close the inventory
   before claiming completeness.
3. **Canonical text:** shard below chapter level, use independent evidence or
   double entry, adjudicate discrepancies, and assemble one ordered atom/page
   ledger with source coordinates.
4. **Boundaries:** derive exhaustive, disjoint chapter/section ownership from
   the source. Include front matter, dividers, back matter, blank visible
   pages, notes, and glossaries.
5. **Visuals:** retain exact crops/images; build label and topology ledgers;
   create readable source-positioned ASCII; generate mechanical facsimiles as
   separate audit evidence; review every source-to-reconstruction binding.
6. **Compile:** deterministically emit the three internal editions, alignment
   and transformation ledgers, chapter metadata, whole-book assemblies, and
   closed manifests.
7. **Audit:** independently reconstruct expected outputs, parse Markdown,
   verify atom/page/object closure and all local paths, replay derived
   artifacts, and perform a clean byte-identical rebuild.
8. **Publish:** run the stable final-folder exporter, then independently check
   its exact allowlist, checksums, paths, page order, image/ASCII equality, and
   idempotence.

## Multi-agent orchestration

For book-scale work, actively delegate independent bounded shards and QA roles
when collaboration is available. Keep a central ownership ledger. Good units
include page ranges, chapter-boundary review, visual-object modeling, label
transcription, topology review, and final export audit. Do not split work so
coherence depends on unreviewed prose summaries, and do not assign final
acceptance of an artifact to its producer.

## Bundled helpers

- `scripts/pipeline.py` provides generic preflight, extraction, OCR,
  comparison, and coverage evidence stages. Its simple build/audit mode is not
  a substitute for the complete protocol unless the project's accepted
  manifests satisfy that exact schema.
- `scripts/record_stage.py` seals a stage's code, inputs, outputs, and config.
- `scripts/render_ascii_facsimile.py` creates deterministic mechanical audit
  facsimiles; it does not create semantic diagrams.
- `scripts/publish_final_folder.py` publishes the stable reader folder after a
  compatible audited release exists.
- `scripts/pdfkit_extract.swift` is an optional macOS third native-text
  evidence channel.

Run helpers from their skill-relative paths. Install pinned Python packages
from `scripts/requirements.txt` in an isolated environment when needed.

## Handoff

Lead with the stable `final/README.md`, `final/whole-book.md`, and
`final/chapters/` paths. Report exact measured counts and exceptions, not a
percentage. Mention internal release IDs only when the user requests audit
details; readers should not need them.
