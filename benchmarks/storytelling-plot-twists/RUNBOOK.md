# Running and publishing Plot twists

Status: **preregistered-ready**. Run commands from the Vasir repository root. The dedicated storytelling runner is required to preserve the exact user task and verified reference-exposure treatment.

## Prepare the fixed run

Use a new run ID. These commands declare four exact configurations and ten trials per condition; Luna explicitly uses max.

```sh
node cli/eval/run-storytelling-benchmark.js \
  --benchmark storytelling-plot-twists \
  --prepare \
  --run-id storytelling-plot-twists-v1-2026-09-07 \
  --model codex:gpt-6-astra@ultra \
  --model codex:gpt-5.6-sol@ultra \
  --model codex:gpt-5.6-terra@ultra \
  --model codex:gpt-5.6-luna@max \
  --required-skill-file SKILL.md \
  --required-skill-file references/twists-and-revelations.md \
  --trials 10 \
  --seed storytelling-plot-twists-v1-generation
```

Before the first generation, inspect the saved manifest: one exact prompt, four declared configurations, 80 rows, ten trials in each arm, the same-provider Astra xhigh/Sol xhigh panel, frozen root and reference hashes, and the enforced requirement to successfully read the entire twists reference. Confirm that operational timeout/retry settings and runtime/source identifiers are recorded. Do not launch a runtime that merely makes the reference available or silently substitutes effort settings. The `benchmark.json` definition and methodology must already be frozen; preparation is not an infrastructure smoke run.

## Generate and judge

```sh
node cli/eval/run-storytelling-benchmark.js \
  --benchmark storytelling-plot-twists \
  --resume storytelling-plot-twists-v1-2026-09-07 \
  --generation-only \
  --concurrency 16

node cli/eval/run-storytelling-benchmark.js \
  --benchmark storytelling-plot-twists \
  --resume storytelling-plot-twists-v1-2026-09-07 \
  --judge-only \
  --judge-concurrency 16
```

Concurrency affects dispatch only. Do not have two writers operate on the same run. Each completed pair receives both original judge seats: 40 pairs, 80 pair-level judge requests, 160 individual assessments. Each pair/seat uses a fresh context. Existing same-order blinded presentation is declared; do not claim counterbalancing or cross-provider agreement.

Resume reuses valid completed answers and judgments. To recover a recorded operational generation failure with frozen inputs, add `--retry-failed`; never use it to replace a valid weak output. Execution filters, if needed, preserve the original inventory and denominators. Deferred or failed entries remain visible. Preserve the unchanged run and frozen snapshot before retrying judge records that would otherwise be replaced. Do not remove a live `run.lock`, change models, modify frozen inputs, or reclassify disappointing scored trials as smoke.

## Analyze and review

Require all ten matched pairs and both original judges before publishing a configuration's declared-cohort effect, interval or comparable headline rank. Apply the seven frozen dimensions and exact weights; compute the paired bootstrap exactly as specified in [methodology.md](methodology.md). Display incomplete diagnostics with their denominators, preserving missing values as null.

Review every original answer and judge rationale, the mandatory reference-read receipts, failed attempts, both judges' raw ratings, response-length distributions, usage and runtime limits. This run is one repeated prompt with a same-provider panel and mixed configured efforts. Do not present its interval as uncertainty over general storytelling ability or its labels as proof of complete blinding.

## Publish

Use the additive Writing publication support for `storytelling-plot-twists`. Source selection must pin an immutable run checkpoint and full frozen skill snapshot, preserve the Core idea selection, and derive public scores from original two-seat judgments. If the local source selector has not yet gained support for this benchmark, finish that implementation and verification before selecting a source; do not overwrite Core idea's publication pointer.

Verify the Writing benchmark picker, exact prompt display, all ten trial selections, per-setting paired answers, all seven dimension scores, panel labels, disclosure text, and restored state in direct report links. Browser checks must include desktop and mobile and confirm the unchanged Core idea and Overall routes. The accepted source and browser evidence must refer to the final selected bytes, with no credentials or private diagnostics in public bundles.

Use the existing guarded publisher after source and browser acceptance:

```sh
node bin/vasir.js benchmark publish --dry-run
node bin/vasir.js benchmark publish
```

Record the immutable release, live-byte verification and live browser evidence before claiming production publication. Coordinate the shared publication lock with concurrent benchmark work. Keep preview, incomplete-checkpoint and complete-scored publication status distinct.
