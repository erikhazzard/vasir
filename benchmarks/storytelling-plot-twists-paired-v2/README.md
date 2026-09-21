# Plot twists — paired edition v2

One science-fiction outline prompt, plain versus the frozen
storytelling skill. The public benchmark keeps the stable `storytelling-plot-twists`
identity; this edition replaces its oversized development matrix, not its archived
evidence.

**Status: all 33 Writing settings scored and published, 2026-09-09.**

The completed source has 66 answers and 66 paired reviewer calls. Field means are
77.0 plain and 87.3 with skill (+10.2 points from unrounded scores): 28 improvements,
two ties and three regressions, all retained. The selected immutable snapshot is
`f50472e807d05802ee2f62e1e29d4aef425c3b1c776d253e9e4fa7ba7fb048e7`.

Published release: `679c1b9c6dee169c653dafa5b6da903fdd76a0b5f1e4f0c74df671a131f6e0c3`.
[View the live benchmark](https://vasirbenchmark.com/benchmark-report.html#storytelling-plot-twists).
The guarded publisher verified the active release bytes. The accepted candidate
passed all desktop/tablet/mobile Writing checks, shared-site captures, and Games
regressions; live desktop/mobile homepage checks confirm 26 complete Overall
settings and the numeric Writing sidebar. Live Core and Plot checks also verify
all 33 Writing settings, no partial aggregates, and exact accepted release bytes.

Coverage now includes Astra, Sol and Terra at low/medium/high/xhigh/max/ultra;
Luna, Fable 5.1 and Opus 5 at low/medium/high/xhigh/max. Fable's highest native
effort is max, not an invented ultra alias. All three active Writing benchmarks
now score the same 33 model settings; Core idea uses the user-approved common
11-story corpus for every setting.

The approved recovery completed all 17 creator and 40 paired reviewer calls.
It preserved 49 clean answers and 26 unaffected reviews byte-for-byte, replacing
only the three technically affected skill answers and their two affected reviews.
Original attempts and predecessor hashes remain in immutable evidence. No result
was rerun or excluded because of its score.

## Previous published checkpoint — 14 settings

All 14 settings have both answers and both paired reviews: 28 answers and 28
paired reviewer calls. [View the live benchmark](https://vasirbenchmark.com/benchmark-report.html#storytelling-plot-twists).
The field mean is 78.0 plain versus 88.0 with skill: 12 improvements, one tie and
one regression, all retained. The original six medium pairs are unchanged. All
32 supplemental calls succeeded on their first attempt, with no host retries.
The live report, Writing page and homepage passed desktop/mobile verification.

Previous snapshot: `7985a38256ce1de703bad8703ab3371d70d175393625dbd657d629684b0dc17a`.
Previous published release: `f757726aceb8fcf019692dcad57445873f413a191c4b5985628624696bf05e01`.

Completion of the remaining 19 Writing settings required user-approved
technical recovery after a tool-isolation failure. The original attempts are
retained. A raw-log audit also found failed-spawn diagnostics in the new Terra
ultra skill answer and the previously published Astra ultra skill answer. These
show attempted delegation, not successful delegation; the earlier blanket
tool-free assurance needs qualification. The user approved replacing only these
three affected skill answers and their affected reviews. A separate recovery run
preserves all clean records and the original stopped run, and records predecessor
hashes for every second attempt. See the private operational note at
`tmp/benchmark-development/writing-coverage-completion-20260909.md`.

## First requested reasoning expansion — historical

- GPT-6 Astra: low, medium, xhigh, ultra.
- Claude Fable 5.1: low, medium, xhigh, max (its highest native effort).
- Claude Opus 5: low, medium, xhigh.
- Preserve the existing Sol, Terra and Luna medium results.

This adds eight settings: 16 creator calls and 16 paired reviewer calls. The final
cohort has 14 settings, 28 answers and 28 paired reviews. It is a later
user-requested coverage expansion of the same edition, not a new prompt or rubric.
The original specification and artifacts remain immutable. The supplemental run
pins its parent snapshot and uses the same frozen treatment and judging protocol.
No completed medium answer or review is rerun.

This completes Plot twists coverage for these modes, not every Overall component.
Overall still requires complete scores from the other active benchmarks; missing
Engineering, Core idea or AI Workflow scores are not inferred from Plot twists.

## Original fixed cohort

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
New preparations explicitly set `agents.enabled=false` and reject stderr tool-router
errors. This repair does not retroactively validate or authorize retries of old runs.

```sh
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs prepare --run-dir RUN_DIRECTORY
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs generate --run-dir RUN_DIRECTORY --concurrency 2
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs judge --run-dir RUN_DIRECTORY --concurrency 2
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs status --run-dir RUN_DIRECTORY
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs export --run-dir RUN_DIRECTORY --output SNAPSHOT_JSON
```

For the approved reasoning expansion, add `--parent-snapshot ORIGINAL_SNAPSHOT`
to `prepare`, using the original complete immutable snapshot. Subsequent commands
are unchanged and dispatch only the supplemental slots. Never prepare another
original six-setting run to obtain these additional modes.

Further coverage completion uses the latest complete parent and an explicit list
of only the missing canonical IDs:

```sh
node benchmarks/storytelling-plot-twists-paired-v2/run.mjs prepare --run-dir NEW_RUN_DIRECTORY --parent-snapshot LATEST_COMPLETE_SNAPSHOT --add-configurations 'codex:gpt-6-astra@high,claude:claude-opus-5@max'
```

That example declares two settings (four answers and four paired reviews). The
runner derives counts from the declared list, rejects duplicates, workflow modes,
and any setting already in the parent, and preserves the full source chain.

An authentication, quota or output-limit stop retains its diagnostic evidence.
Investigate a failed attempt before considering explicitly recorded recovery;
never disguise it as a fresh first attempt or replace a valid low-scoring answer.

## Completion and publication

Expanded coverage is done when every declared setting has both original answers,
both valid paired reviews, its paired scores, and a
verified deployment with those same results in the shared report and Writing
catalog are present. Missing evidence is never zero. Every valid loss, tie and disagreement is
retained. A favorable skill result is not a publication or completion filter.

The four equally weighted rubric criteria use integer ratings from 0 to 5. Each
judge's answer score is the sum of its four ratings multiplied by 5; the published
answer score averages the two judges. The difference is skill minus plain. All
arithmetic uses unrounded values until display.

This edition describes one prompt and one generation per condition and setting. It is
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
