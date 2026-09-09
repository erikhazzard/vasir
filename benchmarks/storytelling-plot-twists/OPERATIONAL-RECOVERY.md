# Verified Codex capacity continuation

`continue-codex.mjs` resumes the existing completion directory after a separate,
recent same-account capacity check. It calls the unchanged, frozen directory
runner and preserves the original prompts, models, efforts, reviews, runtime
pins, failed attempts, and private streams. It does not publish anything.

The capacity file is a sanitized `account/read` and `account/rateLimits/read`
receipt with `kind: sanitized-read-only-capacity-receipt`. Its explicit
authentication context must match the current `CODEX_HOME`, its capacity check
must be no more than one hour old, and it must show available subscription
capacity with no available credits or spend-control stop. The receipt is
retained by absolute path and SHA-256 in the continuation record.

```sh
node benchmarks/storytelling-plot-twists/continue-codex.mjs --dispatch --run-id storytelling-plot-twists-v1-completion-2026-09-08 --capacity-proof CURRENT_CAPACITY_RECEIPT.json --mode judging --concurrency 16
node benchmarks/storytelling-plot-twists/continue-codex.mjs --dispatch --run-id storytelling-plot-twists-v1-completion-2026-09-08 --capacity-proof CURRENT_CAPACITY_RECEIPT.json --mode generation --concurrency 16 --max-rows 60
```

Before calling the provider, the controller retains an immutable operational
record containing every selected row and every exact historical quota stream
being acknowledged, plus the complete pre-invocation `run.json` bytes and exact
operational controller source copies. The first two-request judging pass pins
the pre-existing immutable publication archive whose SHA-256 exactly matches
its initial-run hash. Retry selection must consist solely of untouched Codex
slots or empty-output Codex quota failures predating the capacity check. Any
other selected error is rejected. Policy refusals never enter this selection;
Claude remains paused. The unchanged full judge panel must consist of Codex
judges.

Any newly observed Codex quota stream, including a new failure for an old row,
stops dispatch. Authentication failure or evidence-integrity errors also stop
dispatch. Following successful initial judging, the coordinator allocated eight
concurrent requests, then sixteen for later stages after stable checkpoints.
Each older invocation retains its actual two/eight concurrency and exact source
bytes; the new ceiling never alters an active invocation. Active requests drain and
checkpoint. Signals request the
same graceful pause. The existing exclusive lock and frozen lineage validator
remain in force. No account, provider, model, effort, panel, purchase, or credit
fallback is available.

After all original Codex slots are generated and fully judged, the local-only
`checkpoint-codex.mjs --run-id ID --retain` audit validates frozen sources,
retained stream hashes, original valid answers/reviews, and attempt prefixes.
Full panel coverage and exact arm scores come from `projectWritingRun`, not
the rounded harness configuration summaries. It refuses an active or unfinished
Codex run and preserves exact run, skill,
manifest, audit-script and audit bytes in a new hash-named, read-only operational
checkpoint. It does not select a publication source or make provider calls.

## Drained checkpoint: 2026-09-08 21:04:57 UTC

The saved run has 520 valid answers, 476 fully scored answers (238 pairs,
952 individual judgments), and 23 complete settings. All 460 original Codex
slots are generated and fully panel-scored. No writer lock, unresolved dispatch,
unfinished invocation, or currently ready unjudged pair remains. Claude dispatch
is held for verified capacity; the 21:53 UTC receipt reports session and Fable
weekly usage at 100%, with usage credits off. No account, model, prompt, frozen
transport, or successful evidence was replaced.

The exact run is 47,995,455 bytes with SHA-256
`7ae2b261eda8a368dc51c5df15b2d4e0c9aab78928149b90727530ceb31209ad`.
The following paths are relative to the repository root:

- Official immutable source: `.agents/vasir-evals/storytelling-plot-twists/publication-snapshots/7ae2b261eda8a368dc51c5df15b2d4e0c9aab78928149b90727530ceb31209ad/run.json`.
- Frozen skill sibling: the same directory's `skill-snapshot.json`, SHA-256 `bd95674e5a5dfd99b4b47571bf08742f7c736bd1465d21ba8357bc42638f07e4`.
- Machine preservation audit: `.agents/vasir-evals/storytelling-plot-twists/storytelling-plot-twists-v1-completion-2026-09-08/operational-checkpoints/7ae2b261eda8a368dc51c5df15b2d4e0c9aab78928149b90727530ceb31209ad/audit.json`. Its directory also retains exact read-only run, skill, manifest, and audit-script bytes.
- Private stream evidence remains under `.agents/vasir-evals/storytelling-plot-twists/storytelling-plot-twists-v1-completion-2026-09-08/provider-streams/`; every stream path, size, and hash is retained in the run's attempt history.

The machine audit verified all 1,846 retained stdout/stderr files, all nine frozen
runtime source pairs, the initial 175 valid answers and 80 reviews, and initial
attempt prefixes against publication snapshot
`cc357218c44344dc9d7e981e46e5c99d9f8ef8f9a77ebff3fb7c410555d28d24`.
A separate read-only comparison against the previously selected snapshot
`e5e4fe54c2f2b5e239ca7b79b6b3f2e73a0266a376abf933ce65a60c52d2c987`
verified all 465 published valid answers, 460 completed reviews and scored rows,
and every prior attempt prefix unchanged. Both older snapshots remain under the
same `publication-snapshots/` directory. Archiving required no utility changes;
preparing this source did not change `publication.json` or publish a release.

The remaining generation inventory is **132 untouched rows plus eight terminal
refusals**, not 140 retryable rows. Untouched rows comprise 67 Fable and 65 Opus
slots. All refusals are treatment rows, each with exactly one attempt:

- Opus xhigh: trials 1, 4, and 6.
- Opus max: trials 2, 4, 6, 7, and 8.

All eight matching plain arms are still untouched. Thus 124 of the untouched
generation rows can still contribute paired scores, while eight belong to pairs
whose treatment was terminally refused. After successful remaining generation,
168 viable paired-review calls (336 individual judgments) would remain. With no
additional failures, the ceilings are 652 valid answers, 644 scored answers, and
31 complete settings. The current projector reports 140 pending generations and
368 pending individual judgments because it does not distinguish these provider
refusals: those figures include eight terminal rows and 32 terminally unavailable
judgments respectively. Refusals must never be retried or presented as scored.

A read-only serialization of this exact source using `projectWritingRun` and
`serializeWritingModule(..., "VASIR_WRITING_TWISTS_RESPONSES")` measures the public
`writing-twists-responses.js` at 4,339,157 UTF-8 bytes (4.138 MiB), including all
660 logical response records and two superseded predecessors. This is below the
unchanged 8 MiB (8,388,608-byte) limit by 4,049,451 bytes. The in-memory module
SHA-256 is `85339be31367381c2a41573f97efd91b8021a7fc8310049354444f7b930f81dc`.
No public module was written; a future candidate must still pass its normal
publication checks.
