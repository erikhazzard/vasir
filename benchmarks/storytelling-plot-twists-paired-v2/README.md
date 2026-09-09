# Plot twists — paired edition v2

One science-fiction outline prompt, six model settings, plain versus the frozen
storytelling skill. The public benchmark keeps the stable `storytelling-plot-twists`
identity; this edition replaces its oversized development matrix, not its archived
evidence.

## Fixed scope

- Creators: Astra, Sol, Terra, Luna, Claude Fable 5.1 and Claude Opus 5, all at medium.
- One fresh answer per condition: 12 answers, six matched model pairs.
- Two blinded paired reviews per model: Astra xhigh and Sol xhigh, with opposite
  A/B order. This is 12 review calls, assessing both answers in each call.
- **24 planned top-level benchmark calls total.** No effort sweep, repeated trials, automatic
  host retries, or replacement of valid answers based on their quality.
- The skill condition receives the complete frozen `SKILL.md` and
  `references/twists-and-revelations.md` once. The plain condition receives neither.
- Every creator receives the same user task. Judges receive the task, rubric,
  anchors and anonymous answers, but no skill or creator identity.

The immutable [specification](specification.json) controls execution and scoring.
The prepared run retains its specification, source hashes, complete delivered
inputs, raw provider receipts, original answers and original reviews. Runtime
artifacts belong under `.agents/vasir-evals/`, not in public development UI.

## Run

Use a new explicit run directory for preparation. `status` is read-only; generation
and judgment commands skip already attempted slots and never silently retry them.
Preparation freezes the runtime hashes, so finish runner changes and synthetic
tests first. Do not alter runtime sources while a prepared run is executing.

```sh
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs prepare --run-dir RUN_DIRECTORY
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs generate --run-dir RUN_DIRECTORY --concurrency 2
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs judge --run-dir RUN_DIRECTORY --concurrency 2
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs status --run-dir RUN_DIRECTORY
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs export --run-dir RUN_DIRECTORY --output SNAPSHOT_JSON
```

An authentication, quota or output-limit stop retains its diagnostic evidence.
Investigate a failed attempt before considering explicitly recorded recovery;
never disguise it as a fresh first attempt or replace a valid low-scoring answer.

## Completion and publication

Done means 12 original answers, 12 valid paired reviews, six paired scores, and a
verified deployment with those same results in the shared report and Writing
catalog. Missing evidence is never zero. Every valid loss, tie and disagreement is
retained. A favorable skill result is not a publication or completion filter.

The four equally weighted rubric criteria use integer ratings from 0 to 5. Each
judge's answer score is the sum of its four ratings multiplied by 5; the published
answer score averages the two judges. The difference is skill minus plain. All
arithmetic uses unrounded values until display.

This edition describes one prompt and one generation at medium reasoning. It is
not a broad writing ranking, a variance estimate, human-calibrated evaluation, or
validation of a repaired skill. The two judges are different fresh contexts, but
share a provider and tested model families. Host input and terminal receipts verify
the supplied treatment; they do not prove attention or expose provider-internal
instructions and retries.

Call counts refer to the runner's CLI requests, not a claim about every internal
provider request. Claude receipts also identify auxiliary Haiku activity separately
from the requested story model; raw provider usage is retained.

## Historical boundary

Do not merge legacy 10-trial outputs or the separate compact Claude experiment into
this edition. Their prompts, cohorts or review protocols differ. Retain their
immutable files for internal inspection. Select this new source only after its
whole fixed cohort is complete; then rebuild the standard publication and verify
the report, Writing category and homepage against the same source selection.
