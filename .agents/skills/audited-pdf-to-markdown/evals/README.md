# Audited PDF-to-Markdown Eval

This suite checks whether `audited-pdf-to-markdown` changes a conversion from
plausible extraction into an honestly scoped transcription and release
decision.

The treatment should load only when `$audited-pdf-to-markdown` is explicitly
invoked. Matching conversion intent alone must not load it. Once invoked, it
must preserve the source render as appearance authority, require exact atom and
visual-object closure, separate producers from reviewers, keep the bundled
helpers in their evidence-only boundary, and withhold a verified release while
any required count or binding remains unresolved.

Cases cover explicit manual invocation, matching intent without invocation,
negative and sibling routing, per-book profile isolation, diagram handling,
helper overclaim, independent review, attention drift, and stable final-folder
publication. Hard substring checks are only a semantic floor. The suite-level
judge rejects answers that auto-load the skill, repeat protocol terms while
inventing source values, omit visible marks, or promote incomplete evidence.

Run the structural smoke test locally:

```bash
npm run eval -- audited-pdf-to-markdown mock --trials 1
```

A live-model run is required to judge the behavioral delta. Mock mode proves
suite discovery, baseline/treatment wiring, and result persistence only. The
suite does not bundle a PDF fixture or execute the conversion helpers; the
forward-test shape remains documented in `references/forward-test.md`.
