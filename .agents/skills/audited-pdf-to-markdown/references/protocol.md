# Audited PDF-to-Markdown Protocol

Use an audited transcription compiler, not “give each chapter to an agent and
concatenate their answers.” This reference defines the complete fidelity and
release protocol; the bundled scripts automate only the scoped stages named in
the root skill.

> Exact text fidelity is achievable when the source is legible. A readable ASCII diagram cannot be pixel-identical to an arbitrary graphic. The honest guarantee is exact text plus verified semantic/topological equivalence, with the original figure crop retained as visual ground truth.

## Contents

- [1. Define one-to-one precisely](#1-define-11-precisely)
- [2. Produce three editions per chapter](#2-produce-three-editions-per-chapter)
- [3. Overall pipeline](#3-overall-pipeline)
- [4. Stage-by-stage procedure](#4-stage-by-stage-procedure)
- [5. Diagram conversion protocol](#5-diagram-conversion-protocol)
- [6. Multi-agent orchestration](#6-multi-agent-orchestration)
- [7. Deterministic assembly](#7-deterministic-assembly)
- [8. Hard acceptance gates](#8-hard-acceptance-gates)
- [9. Honest release statuses](#9-release-statuses-must-remain-honest)
- [10. Recommended release structure](#10-recommended-release-structure)
- [11. Controlling visual-completeness amendment](#11-controlling-visual-completeness-amendment)

## 1. Define “1:1” precisely

PDFs do not necessarily contain words in reading order. They may contain individual glyphs positioned on a page, broken Unicode mappings, hidden OCR layers, vector outlines, or scanned images.

Therefore, the atomic source unit should be a render-visible glyph or grapheme cluster with coordinates—not an extracted whitespace-delimited “word.”

For text, “1:1” means:

- Every visible glyph, number, punctuation mark, footnote marker, header, footer, folio, caption, marginal note, and diagram label is represented.
- Nothing is omitted, duplicated, silently corrected, or reordered.
- Every output element points back to its PDF page and bounding box.
- Ligatures, composed accents, and ambiguous glyph mappings are recorded explicitly.
- Every difference between extraction and final transcription is classified.
- There are zero unresolved differences in a verified release.

For diagrams, distinguish three kinds of fidelity:

1. Lexical fidelity: every visible label, symbol, value, legend, caption, and annotation is exact.
2. Semantic fidelity: every node, edge, arrow, grouping, axis, scale, sequence, containment, overlap, and meaningful spatial relationship is represented.
3. Source fidelity: the exact source crop remains available and hashed.

The ASCII can be called `VERIFIED-SEMANTIC-1TO1`, but not pixel-identical.

Photographs, paintings, gradients, or typography-heavy illustrations must be marked `FACSIMILE-REQUIRED`. An ASCII impression may be provided, but cannot honestly be called exact.

## 2. Produce three editions per chapter

A single file cannot simultaneously be completely literal, pleasant to read,
and spatially faithful to every page. Generate all three:

- `chapter.literal.md`: the verification artifact. Preserves visible line breaks, hyphenation, running matter, page boundaries, source errors, captions, and all other visible inscriptions.
- `chapter.md`: the readable edition. Removes running headers, joins visual line wrapping, and performs only explicitly declared transformations. For every visual object it embeds the exact source image first. Diagrammatic objects then receive the readable, source-positioned composition ASCII; facsimile-only typography, logos, and dividers use their reviewed canonical layout/diagram ASCII instead of a raster glyph dump. A mechanical raster-to-ASCII dump remains sealed in the object package as audit evidence, but is not expanded inline as though it were a reader-usable chart.
- `chapter.facsimile.md`: the visual edition. For every owned PDF page, embeds the fixed-resolution source render and an inline, source-derived page ASCII canvas. It preserves page order and spatial appearance; it does not replace either textual edition.

The readable file is generated from the verified literal representation. It is never independently rewritten.

For example:

```text
chapters/
  03-structure-and-setting/
    chapter.literal.md
    chapter.md
    chapter.facsimile.md
    alignment.jsonl
    metadata.yaml
    page-facsimiles/
      p0072.render.png
      p0072.ascii.txt
      p0072.json
    assets/
      p0072-o01/
        source.png
        semantic.yaml
        composition.ascii.txt
        facsimile.ascii.txt
        facsimile.json
        diagram.ascii.txt
        diagram.md
        audit.json
```

`alignment.jsonl` is essential. Markdown alone is not sufficient evidence of fidelity.

## 3. Overall pipeline

```text
                    +--------------------+
                    | Immutable PDF hash |
                    +----------+---------+
                               |
                               v
              +----------------------------------+
              | Render + dual extraction + OCR  |
              +----------------+-----------------+
                               |
                               v
              +----------------------------------+
              | Page-region and object inventory|
              +----------------+-----------------+
                               |
                               v
              +----------------------------------+
              | Canonical glyph/region ledger   |
              +----------------+-----------------+
                               |
                               v
              +----------------------------------+
              | Chapter boundaries and shards   |
              +----------------+-----------------+
                               |
                 +-------------+-------------+
                 |                           |
                 v                           v
        +------------------+       +-------------------+
        | Double-entry text|       | Diagram modeling  |
        +--------+---------+       +---------+---------+
                 |                           |
                 v                           v
        +------------------+       +-------------------+
        | Difference review|       | ASCII verification|
        +--------+---------+       +---------+---------+
                 +-------------+-------------+
                               |
                               v
              +----------------------------------+
              | Canonical adjudicated ledger    |
              +----------------+-----------------+
                               |
                               v
              +----------------------------------+
              | Deterministic Markdown compiler |
              +----------------+-----------------+
                               |
                               v
              +----------------------------------+
              | Global coverage and release QA  |
              +----------------------------------+
```

## 4. Stage-by-stage procedure

### Stage 1: Freeze the source

Before transcription:

- Copy the PDF without modifying or optimizing it.
- Calculate its SHA-256 hash.
- Record file size, page count, PDF version, encryption status, and document metadata.
- Pin all renderer, OCR, extraction, Markdown-parser, model, prompt, and compiler versions.
- Refuse to resume an existing job if the source hash changes.

Example manifest:

```yaml
source:
  path: source/original.pdf
  sha256: "..."
  page_count: <derived>

render:
  engine: mupdf
  version: "..."
  dpi: 300
  color_space: srgb

fidelity:
  scope: all_render_visible_text
  silent_corrections: forbidden
  unicode_form: NFC
  preserve_running_matter_in_literal: true
  preserve_visual_line_breaks_in_literal: true
```

### Stage 2: Create independent evidence for every page

Generate at least:

```text
source/pages/
  p0001.render.png
  p0001.native-a.json
  p0001.native-b.json
  p0001.ocr.json
  p0001.drawings.json
  p0001.images.json
```

Use:

- A fixed-resolution page rendering as the visual authority.
- Two independent native PDF extraction engines.
- OCR of the rendered page, including born-digital pages.
- Vector, image, font, and bounding-box extraction.

OCR is evidence, not ground truth. Hidden OCR layers are not considered source text unless they are visibly rendered.

Use 300 DPI for general inventory and 600–1200 DPI crops for small or ambiguous material.

### Stage 3: Inventory every page

Every visible region must be assigned a stable ID and classification:

```text
body_text
heading
list
caption
footnote
endnote
running_header
running_footer
page_number
table
diagram
equation
photograph
illustration
callout
decorative
unknown
```

Generate a page overlay showing every classified region. An uncovered area containing meaningful content is a QA failure.

`unknown` is allowed during work but blocks a verified release.

A second agent should inventory the page independently before seeing the first inventory. This catches small legends, unlabeled diagrams, continuation tables, vector-outline text, and text embedded in images.

### Stage 4: Build the canonical element ledger

Every textual or visual element receives a stable record:

```json
{
  "id": "p0042-r0007-a0013",
  "page": 42,
  "bbox": [73.2, 146.8, 91.4, 159.7],
  "rotation": 0,
  "role": "body_text",
  "source_kind": "native_glyph",
  "source_unicode": "ﬁ",
  "transcript_unicode": "ﬁ",
  "reading_order": 18342,
  "chapter": "ch03",
  "verification": "pending"
}
```

The ledger records:

- Page and PDF-coordinate bounding box.
- Native character codes and Unicode mappings.
- OCR and extractor candidates.
- Canonical transcription.
- Reading order.
- Chapter ownership.
- All normalization or correction decisions.
- Verification and adjudication status.

The rendered PDF remains the visual authority. The accepted ledger becomes the textual authority. Markdown is only a deterministic view of the ledger.

### Stage 5: Establish reading order and chapter boundaries

Reading order must be explicit, especially for:

- Multiple columns.
- Marginal notes.
- Sidebars.
- Footnotes.
- Vertical or rotated text.
- Tables.
- Diagrams interrupting prose.
- RTL or bidirectional text.

Chapter boundaries should use region IDs, not whole page numbers:

```yaml
- id: ch03
  title: "Structure and Setting"
  first_region: p0041-r0004
  last_region: p0068-r0017
```

This prevents duplication when one chapter ends and another starts on the same page.

Chapter ownership must be exhaustive and disjoint:

- Every source element belongs to exactly one chapter.
- No element belongs to two chapters.
- Context may overlap between agent packets, but ownership may not.
- Tables, footnotes, figures, or paragraphs must not be divided merely to balance workloads.

### Stage 6: Shard work below the chapter level

Chapters are output units, not necessarily good worker units. Divide them into immutable 4–10-page or 2,000–5,000-word shards aligned to region boundaries.

Each task packet contains:

```yaml
job_id: ch03-s004
owned_regions:
  first: p0053-r0001
  last: p0059-r0018

context_before:
  - p0052-r0019

context_after:
  - p0060-r0001

source_hash: "..."
contract_version: 1
```

Agents may read context regions but may output only owned regions.

This makes jobs resumable, retryable, and independently verifiable.

### Stage 7: Use blind double-entry transcription

Every text shard receives two independent passes.

The primary transcriber:

- Reads the page renders and extraction evidence.
- Produces a literal transcription.
- Aligns every output grapheme to source IDs.
- Records uncertainties.
- Does not correct spelling or punctuation.
- Does not edit shared chapter files.

The independent verifier:

- Produces a fresh transcription from the source before seeing the primary output.
- Aligns its transcription independently.
- Then compares the two versions.
- Emits exact disagreements rather than “looks good.”

For example:

```json
{
  "source_id": "p0057-r0008-a0042",
  "primary": "1",
  "verifier": "l",
  "native": "l",
  "ocr": "1",
  "status": "disputed"
}
```

A third agent adjudicates only the differences using the render, glyph coordinates, PDF object evidence, and both candidates.

The primary and verifier cannot adjudicate their own dispute.

If the source remains genuinely ambiguous, the shard becomes `UNRESOLVED_SOURCE`. The system must never guess to achieve a green report.

## 5. Diagram conversion protocol

Each non-prose object gets its own canonical package:

```text
assets/p0123-o02/
  source-object.png
  source-object.svg
  literal-text.txt
  semantic.yaml
  diagram.ascii.txt
  diagram.md
  audit.json
```

The crucial rule is:

> Do not transcribe directly from the PDF into ASCII. First create a structured semantic model; then generate ASCII from that model.

For a flowchart:

```yaml
type: directed_flowchart

nodes:
  - id: n1
    label: "Inciting Incident"
  - id: n2
    label: "Progressive Complications"
  - id: n3
    label: "Crisis"

edges:
  - from: n1
    to: n2
    direction: down
  - from: n2
    to: n3
    direction: down
```

A deterministic renderer produces:

```text
+---------------------------+
| Inciting Incident         |
+-------------+-------------+
              |
              v
+---------------------------+
| Progressive Complications |
+-------------+-------------+
              |
              v
+---------------------------+
| Crisis                    |
+---------------------------+
```

The semantic model is authoritative for diagram meaning. The exact source
object is authoritative for appearance. A primary composition canvas and a
source-derived facsimile canvas are both required; neither one may be replaced
by a prose roster of nodes, labels, or P-IDs.

### Unicode labels in strict ASCII

Strict 7-bit ASCII cannot reproduce accented characters, Greek symbols, typographic punctuation, or many mathematical symbols.

Use label IDs in the ASCII:

```text
+--------+
| [L01]  |
+---+----+
    |
    v
+--------+
| [L02]  |
+--------+
```

Then preserve exact Unicode separately:

```markdown
- L01: “Déclenchement”
- L02: “Crise”
```

Transliteration is not exact transcription.

### Type-specific verification

Different objects need different acceptance tests:

| Type | Must verify |
|---|---|
| Table | Rows, columns, spans, headers, every cell, empty versus absent cells, footnotes |
| Flowchart | Nodes, edges, endpoints, direction, branches, merges, loopbacks, crossings versus junctions |
| Plot | Axes, ticks, units, range, scale, legends, series, printed values, visible marks |
| Timeline | Event order, lanes, intervals, simultaneity, dates, dependencies |
| Spatial diagram | Containment, overlap, adjacency, orientation, paths, label attachment |
| Equation | Every symbol, delimiter, fraction, index, radical, matrix dimension, precedence |
| Callout | Exact text, scope, attachment target, box membership |
| Photograph | Exact caption and visible annotations; original facsimile retained |

For plots, a visually positioned point without a printed numeric value must not be assigned an invented exact number. Store its display coordinate and mark the underlying value as unavailable.

For colors, line styles, or shading that carry meaning, create an explicit ASCII legend. Two source categories must never collapse into the same ASCII encoding.

## 6. Multi-agent orchestration

Agents should operate as workers around one canonical state machine.

They must never edit final chapter files or shared manifests directly.

Each attempt writes to an isolated directory:

```text
work/jobs/ch03-s004/attempts/
  primary-agent17-uuid/
  verifier-agent42-uuid/
  adjudicator-agent08-uuid/
```

The orchestrator:

- Creates immutable task packets.
- Checks input hashes.
- Leases work to agents.
- Validates returned schemas.
- Rejects output containing unowned regions.
- Promotes accepted artifacts atomically.
- Maintains an append-only event log.
- Updates the canonical ledger.
- Invokes the deterministic compiler.

Suggested roles:

- Source/preflight auditor.
- Page-inventory workers.
- Chapter-boundary auditor.
- Primary text transcribers.
- Independent text verifiers.
- Diagram modelers.
- Lexical diagram verifiers.
- Structural diagram verifiers.
- Adjudicators.
- Global coverage auditor.
- Release builder.

At high concurrency, use dynamic queues rather than assigning one agent permanently to one chapter. A possible 64-slot deployment would use roughly:

- 20–24 primary transcribers.
- 20–24 independent verifiers.
- 6–8 diagram specialists.
- 3–4 inventory/boundary auditors.
- 3–4 adjudicators and global auditors.
- One orchestrator.

Fit worker waves to the available collaboration slots while reserving clear
orchestration ownership and independent producer/reviewer roles. Slot count may
change throughput, but never the evidence model or acceptance gates.

## 7. Deterministic assembly

Agents submit structured fragments. They never hand-edit the released Markdown.

A compiler assembles accepted fragments in canonical source order:

```text
canonical ledger
      |
      +--> chapter.literal.md
      |
      +--> chapter.md
      |
      +--> book.literal.md
      |
      +--> book.md
      |
      +--> QA reports
```

It can include provenance comments:

```markdown
<!-- source-regions: p0053-r0001..p0053-r0009 -->
<!-- pdf-page: 53; printed-page: 41 -->
```

Markdown fidelity must be checked after parsing with a pinned CommonMark parser. Markdown punctuation used for headings, emphasis, links, and provenance comments is not source text.

The comparison is between:

- The accepted canonical source-text stream.
- The logical text recovered from the parsed Markdown AST.

Raw file byte comparison would incorrectly count Markdown syntax as book text.

## 8. Hard acceptance gates

Let:

- `S` be all inventoried source-text atoms.
- `M` be all source atoms represented in literal Markdown.
- `E` be explicitly excluded atoms.
- `V` be all inventoried visual objects.
- `A` be all accepted visual representations.

A release requires:

```text
S = M union E
M intersection E = empty

count_in_output(atom) = 1
for every atom in M

V = A
```

If the contract is “all visible text,” then `E` should normally be empty.

The release must pass all of these gates:

1. PDF hash, page count, and render profile are frozen.
2. Every page region is classified.
3. No `unknown` regions remain.
4. Every source atom has exactly one owner.
5. Every chapter boundary is exhaustive and disjoint.
6. Every shard has independent double-entry verification.
7. Every textual discrepancy has been adjudicated.
8. Every diagram has lexical and structural verification.
9. Every diagram element maps to ASCII or an exact label glossary.
10. Every figure reference resolves.
11. Every caption and footnote is paired with its anchor.
12. No text is missing or duplicated.
13. No unclassified Unicode or normalization differences remain.
14. Markdown parses successfully.
15. Reassembling all chapters recreates the canonical book sequence.
16. Rebuilding from accepted artifacts produces byte-identical output hashes.
17. Zero unresolved ambiguities remain.
18. Every local `img`/image reference resolves from the Markdown file in which it appears, including every whole-book edition.
19. Every source page has one page render and one source-derived page ASCII canvas in its owning chapter.
20. Every meaningful visible vector mark is enumerated and survives in either the object canvas or the page-facsimile overlay.
21. Every visual object has an exact source asset, one self-contained composition canvas, one raster-derived facsimile canvas, exact labels, and a source-bound audit record.
22. A label ledger, semantic JSON, coordinate list, prose description, or list of P-IDs never counts as the required primary ASCII canvas.

A percentage score is insufficient. “99.99% accurate” may still conceal a missing `not`, decimal point, arrowhead, or footnote marker.

## 9. Release statuses must remain honest

Use explicit statuses:

```text
VERIFIED-TEXT-1TO1
VERIFIED-SEMANTIC-1TO1
FACSIMILE-REQUIRED
REVIEW-REQUIRED
BLOCKED-UNREADABLE
BLOCKED-AMBIGUOUS
BLOCKED-ASCII-INEXPRESSIBLE
```

The final QA report should contain exact counts:

```text
Text source atoms: N
Mapped exactly once: N
Missing atoms: 0
Duplicated atoms: 0
Unresolved text discrepancies: 0

Visual objects inventoried: N
Visual objects represented: N
Lexically verified: N
Structurally verified: N
Facsimile-required objects: N
Unresolved visual objects: 0

Build reproducibility: PASS
Release status: VERIFIED
```

If any unresolved count is nonzero, the output may be released as a draft, but not labeled 1:1 verified.

## 10. Recommended release structure

```text
book-name/
  README.md
  fidelity-contract.yaml

  source/
    original.pdf
    original.pdf.sha256
    pages/

  manifests/
    book.yaml
    chapters.yaml
    pages.jsonl
    regions.jsonl
    atoms.jsonl
    objects.jsonl
    toolchain.lock

  chapters/
    00-front-matter/
      chapter.literal.md
      chapter.md
      alignment.jsonl
      metadata.yaml
      assets/
    01-first-chapter/
      ...
    02-second-chapter/
      ...

  book.literal.md
  book.md

  provenance/
    events.jsonl
    transformations.jsonl
    adjudications.jsonl

  qa/
    page-coverage/
    object-overlays/
    discrepancies.jsonl
    diagram-audit.json
    boundary-audit.json
    release-report.md
```

The central principle is:

> The source render proves appearance, the canonical ledger proves textual identity, the semantic model proves diagram meaning, and the ASCII proves readable reconstruction.

That division of responsibility makes the process parallelizable,
reproducible, and auditable. Any compiler or helper used with this skill remains
subordinate to these manifests and verification gates.

## 11. Controlling visual-completeness amendment

This section is mandatory and takes precedence over any earlier wording that
could be read as limiting the visual universe to embedded raster images.

### 11.1 The visual universe is render-visible, not object-type-limited

Inventory every mark visible in the frozen render profile, including:

- Embedded raster images and image masks.
- Vector paths, fills, strokes, arrowheads, rules, separators, bands, boxes,
  axes, ticks, legends, connectors, and underlines.
- Text whose typography, placement, rotation, scale, color, or grouping carries
  information beyond its Unicode string.
- Tables, equations, diagrams, maps, plots, timelines, logos, decorative
  dividers, and composite page designs.
- Repeated visible overlays and hyperlink decoration when they are present in
  the default rendered page.

Invisible clip paths, white page-background paint, non-rendered metadata, and
other implementation-only PDF instructions may be excluded, but each excluded
class must be named, counted, and justified in the inventory. “Not an embedded
image” is never a valid reason to omit a visible mark.

Let `R` be all render-visible regions and marks, `I` the accepted included
visual universe, and `X` the explicitly classified non-substantive exclusions.
A verified release requires:

```text
R = I union X
I intersection X = empty
unclassified(R) = empty
```

### 11.2 Required object-level representation

Every visual object package must contain all of the following:

1. The exact extracted source object/crop, retained byte-for-byte when the PDF
   provides one, with pixel dimensions and SHA-256.
2. `composition.ascii.txt`: one self-contained, source-positioned 7-bit ASCII
   canvas showing the complete composition at once. It must contain the real
   nodes, boundaries, line styles, spokes, arrows, crossings, groupings, label
   placement, and directionality needed to recognize and inspect the source.
3. `facsimile.ascii.txt`: a deterministic raster-to-ASCII rendering at a
   declared column count and monospace-cell aspect ratio.
4. `facsimile.json`: source hash, source dimensions, rendering algorithm and
   mode, output dimensions, cell aspect, and output hash.
5. The exact Unicode label ledger and semantic/topological model.
6. An audit that maps every source element to the composition canvas and
   records every known representational limit.

The composition and facsimile channels serve different purposes. The
composition is the readable semantic-spatial reconstruction; the facsimile is
the mechanically source-derived appearance check. Both are required. They may
be byte-identical only for a genuinely facsimile-only object, and the audit
must say so explicitly.

The reader-facing presentation order is mandatory: exact source image first,
then `composition.ascii.txt` for diagrammatic objects, then any supplemental
semantic ASCII ledgers. Facsimile-only typography, logos, and dividers must
omit the mechanically rendered pseudo-composition and use their reviewed
canonical `layout.ascii.txt` or `diagram.ascii.txt` representation instead.
`facsimile.ascii.txt` remains copied, hashed, reproducible, and directly
inspectable in the object asset package, but it is audit evidence—not the
primary reader-facing diagram—and must not be expanded inline in `chapter.md`
or `whole-book.md`. The literal edition retains the exact source image without
derived ASCII; the page-facsimile edition retains its separate page-render and
page-ASCII completeness backstop.

The following do **not** satisfy the composition requirement:

- A prose description of the figure.
- A roster of labels, nodes, coordinates, or P-IDs.
- A legend without the figure.
- A series of disconnected mini-snippets that never show the complete object.
- A generic placeholder box, logo token, or one-line substitute for a filled
  band, map, wheel, plot, or illustration.

### 11.3 Required page-level representation

Object packages alone cannot preserve page design or small independent vector
marks. Every PDF page therefore receives:

- Its frozen source page render.
- A strict 7-bit page ASCII facsimile at declared geometry.
- A page metadata record binding both artifacts to the source PDF and accepted
  inventory.
- The page-specific crop box, rotation, render pixel dimensions, DPI, and
  PDF-to-render affine matrix. Vector coordinates must be transformed through
  this recorded geometry; a fixed Letter-page assumption is forbidden.
- Explicit overlays for meaningful vector marks so a thin rule or underline
  cannot vanish during raster downsampling.

The visual Markdown edition embeds both the source render and page ASCII for
every page. It is compiled per chapter and into `whole-book.facsimile.md` in
canonical page order. The page facsimile is a completeness backstop, not a
substitute for high-resolution object canvases.

The release gate must invoke the pinned page renderer into a clean temporary
directory and byte-compare the complete generated tree: one ASCII canvas and
one metadata record per source page, plus the vector ledger and manifest. The
expected count is derived from the frozen source page count. A page payload and
self-consistent manifest are not evidence of source derivation by themselves.

### 11.4 Path and assembly closure

Chapter-local paths must be rebased when chapter fragments are assembled at
the release root. An image that exists on disk but is unreachable from the
Markdown that names it is missing. The release compiler must parse every
chapter and whole-book Markdown file and reject:

- Missing local targets.
- Absolute, escaping, or unsafe targets.
- Symlinked targets or symlinked path components.
- Whole-book references that still use chapter-local addressing.
- Reader-facing source-image assets absent from rendered Markdown, or audit
  assets absent from the sealed object package and its manifest closure.

The page and object generation roots are closed trees. Every regular file and
directory is either named by the generation manifest or causes rejection;
symlinks, special files, hidden extras, and empty unmanifested directories are
failures. Mutable work-root validation results may not be reused solely on the
basis of a manifest hash. Each release phase must freshly rehash the bound
files, and a copy must be checked against its reviewed digest before and after
the copy.

All three whole-book editions must be deterministic ordered assemblies of the
chapter editions with context-correct paths.

### 11.5 Independent visual verification

No producer may be the sole acceptor of its own visual reconstruction. Review
must compare the source image and ASCII side by side and explicitly check:

- Exact labels and line breaks.
- Full-canvas topology and spatial order.
- Node/edge/spoke/arrow counts and endpoints.
- Arrow direction and arrowhead presence.
- Boundary closure, containment, crossings versus junctions, and line-style
  distinctions.
- Canvas hygiene: printable 7-bit ASCII, no tabs, bounded width, and exactly
  one terminal newline.
- Source/facsimile hashes and declared output geometry.

Every PASS is cryptographically scoped to the bytes it approves. Each object
review records the byte length and SHA-256 of the source XObject,
`composition.ascii.txt`, `facsimile.ascii.txt`, `facsimile.json`, and
`audit.json`, plus independently measured ASCII rows and maximum used columns.
Each review has a canonical content seal, a named reviewer, an explicit review
role, and an exact object universe. Semantic radial and cast-map objects require
their topology-specific review in addition to the all-object source/facsimile
review. The release compiler must reject stale hashes, substituted reviews,
review-scope changes, producer/reviewer identity overlap, or a broad PASS that
lacks the exact artifact bindings.

A self-computed digest is not an identity signature or an acceptance trust
anchor. The accepted generation manifest must therefore record an explicit,
nonempty set of producer **agent IDs** (algorithm names are not identities),
seal that set into its canonical payload, and require it to be disjoint from
the exact reviewer-agent set. For a frozen release, the compiler must also pin
the accepted review bytes, full-file SHA-256, canonical payload digest, and the
complete seal statement. Rewriting a review and recomputing its own digest or
the mutable generation manifest must not create a new accepted review.

A release-level PASS is conjunctive. A nested failure, mismatch, missing
required check, non-Boolean substitute such as `0` or `null`, extra or omitted
object, altered scope, or contradictory attestation keeps the release claim
`UNVERIFIED`; independently usable evidence and clearly labeled draft outputs
remain available.
Role-specific review records use exact schemas and exact object order; every
affirmative topology, provenance, source-comparison, and ASCII-hygiene check
must be literally `true`, and every mismatch/material-delta collection must be
present and empty. Duplicated hashes, byte counts, geometry, and census totals
must either be mechanically recomputed from the bound artifacts or be covered
by the frozen exact-review trust anchor.

A verified release has zero missing page renders, zero missing page canvases,
zero unresolved visual marks, zero broken image references, and zero visual
objects whose only ASCII artifact is a descriptive substitute.

### 11.6 Stable reader-facing final publication

Versioned, content-addressed releases are internal audit authorities, not the
reader interface. After the selected release passes its independent audit,
publish one ordinary, physical `final/` directory. It must not be a symlink and
must not expose a build ID in any reader-facing path.

The default portable structure is:

```text
final/
  README.md
  whole-book.md
  CHECKSUMS.sha256
  source/
    original.pdf
  chapters/
    <ordered-unit>/
      chapter.md
      assets/
        <object-id>/
          source-xobject.jpg
          <reader-facing-ascii>.ascii.txt
```

Preserve the audited chapter nesting so the readable chapter and whole-book
Markdown can be copied byte-for-byte without path rewriting. Derive the asset
allowlist from the Markdown itself:

- Copy every exact source image named by `data-source-object`.
- Copy exactly the ASCII object/file pairs named by
  `data-semantic-ascii-object` and `data-semantic-ascii-file`.
- Never glob all non-facsimile ASCII. A facsimile-only object's mechanically
  rendered `composition.ascii.txt` may be an unreferenced raster duplicate and
  must not leak into the final folder.
- Exclude page renders, raster object dumps, literal/facsimile editions,
  manifests, ledgers, reviews, and work products from the reader folder. They
  remain available in the internal audited release. Retain the original PDF as
  the complete visual authority.

The final-folder gate must prove:

1. The selected audited release does not change during publication.
2. `whole-book.md`, every `chapter.md`, every copied image/ASCII asset, and the
   original PDF are byte-identical to the selected release.
3. Whole-book and aggregate chapter page markers each reproduce pages
   `1..N` exactly once in canonical order.
4. Whole-book and aggregate chapter image/ASCII sequences are identical.
5. Every ASCII payload decoded from inline HTML is byte-identical to its
   standalone copied asset.
6. Every image path is confined, resolves, and identifies its object package.
7. No `facsimile.ascii.txt`, page-facsimile reference, symlink, special file,
   unexpected file, or unexpected directory exists.
8. `CHECKSUMS.sha256` covers every other final file in sorted path order.
9. Re-publishing the same accepted release is byte-idempotent.

For this toolchain, `publish_final_folder.py --project <book-project>` performs
that publication and refuses a nonidentical existing folder unless explicitly
given `--replace` for an atomic replacement.
