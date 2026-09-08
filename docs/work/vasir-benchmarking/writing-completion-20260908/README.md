# Writing benchmark completion — September 8, 2026

The user authorized running all missing work in the existing Writing benchmarks.
This continuation preserves valid answers, valid reviews, frozen prompts,
models, judge panels, source manifests, and raw failure evidence. It does not
rerun Magic discovery, change scoring denominators, or substitute providers.

## Capacity and execution

- A read-only Codex app-server check at 18:26:39 UTC showed available capacity
  in the unchanged account: 17% of the weekly allowance used. The sanitized
  receipt is `codex-capacity-20260908T182639Z.json`. No purchase, account switch,
  or reset-credit consumption was performed. New explicit quota failures stop
  dispatch and are retained.
- A read-only Claude Code `/usage` check around 18:40 UTC showed the current
  session at its limit. Its reported reset is 20:40 UTC / 4:40 p.m. Eastern.
  `claude-capacity-20260908T1840Z.json` records this observation. That time is a
  hint, not proof that capacity will be available. Claude remains paused until
  a current capacity check permits continuation.
- Dungeon Master uses its unchanged frozen expansion runner and explicit
  operational recovery. Its DM-specific recovery note records the complete
  prestate archive, excluded readiness call, invocation, and preservation audit.
- Plot twists uses a separately tested operational controller. It acknowledges
  only the byte-pinned historical Codex quota failures, never policy refusals,
  and retains the original frozen execution implementation. Its first pass
  judges already-complete pairs before generating more answers.

At the drained checkpoints around 19:34 UTC, Plot twists had 306 valid answers
and 140 fully panel-scored answers; Dungeon Master had 257 valid outlines and
54 completed paired reviewer requests. These are local execution counts, not
newly deployed scores. Magic discovery remains complete and untouched.

Following error-free stages, the coordinator allocated the frozen runners'
existing maximum of 16 concurrent calls per Codex workstream. Dungeon Master's
first 16-call stage began at 19:36:44 UTC; Plot twists will use 16 only after its
currently active eight-call judging stage drains. Each recovery retains the
previous operational source bytes and exact checkpoint, and each concurrency
audit still enforces the 2/8/16 bound actually allocated to that invocation.
Fresh same-account metadata receipts precede dispatch. No frozen experiment
module, prompt, model, judge panel, or seed changed.

Read-only inspection found that Dungeon Master's original quota gate is global:
a failure from either provider would pause both, and its recovery verifier
requires actual readiness for every failed provider even when that provider is
excluded from the next invocation. There is no supported expanded-run
judge-only fallback; the v1 paths use a different evidence layout and are not
substitutes. The current phase therefore remains Codex-only. A future Claude
phase requires explicit coordinator readiness confirmation and a drained,
audited transition. Its existing maximum-call option permits small batches and
fresh capacity checks between stages; voluntarily pausing before exhaustion
must not be mislabeled as recovery from a quota that did not occur. No gate is
cleared or weakened to make unavailable capacity look available.

## Core idea continuation

For a read-only comparison of live checkpoint counts and immutable selected
publication counts, run:

```sh
node docs/work/vasir-benchmarking/writing-completion-20260908/status.mjs --summary
```

Omit `--summary` to include each complete setting's exact paired scores. The
script verifies selected source hashes and uses the existing publication
validators; it does not guess missing scores. Selected sources and live
checkpoints are distinguished explicitly. A selection is not deployment proof.

The current complete prestate is already archived under run SHA
`0b47f5bfa55fdce4c3fba9044bac1270ec57df9ee1ae85030a9970c8cfb156ac`.
Run `node docs/work/vasir-benchmarking/writing-completion-20260908/verify-core-checkpoint.mjs`
before and after recovery. It requires no live writer and verifies all 792
generation records, all 572 completed paired reviews, and the frozen manifest
and skill. The source archive retains the prior raw failed/deferred reviews.

After capacity is verified in the same Claude context, the existing supported
judge-only invocation is:

```sh
node cli/eval/run-storytelling-benchmark.js --resume storytelling-core-idea-v1-2026-09-07 --judge-only --judge-provider claude --judge-concurrency 4
```

This is preparation, not a claim that the command has run. The remaining 216
Fable paired reviews must use the original judge configuration. Archive a new
immutable checkpoint before any later recovery invocation.

## Unscored policy cases and publication

The two Core idea Matrix skill refusals (Opus xhigh/max) and two Plot twists
Opus xhigh skill refusals are not operational failures. They remain retained and
unscored. The request to complete missing scores does not authorize bypassing
those refusals or silently altering the registered cohort.

Publish only verified immutable checkpoints through the existing guarded
workflow. Preserve the approved comparable-ranking rule: competitive aggregate
ranks use the same complete benchmark set; incomplete available means remain
visible but unranked. Keep Magic discovery, non-Writing scores, and the site
layout unchanged.

The acceptance script's descriptive prose still described the superseded v4
partial-ranking rule, although its executable validation already used v5.
This continuation corrects only that prose for future acceptance receipts;
the prior accepted lock and historical evidence are not rewritten. The new
description explicitly excludes partial means from comparative ranks, leaders,
headline uplift statistics, and efficiency frontiers.

Before any publication-source change, 237 targeted source, scoring, ranking,
archive, browser-contract, and operational-recovery tests passed. These are
regression checks using retained evidence and test doubles, not new benchmark
model calls and not a substitute for fresh candidate browser verification.

The exact accepted four-ranked-model example is now an immutable, source-backed
regression fixture in `test/fixtures/writing-ranking-accepted-20260908.js`.
Its original scores and all existing assertions remain intact as live cohorts
grow. A separate current-publication test checks the generated data against
the immutable selections and independently verifies every score choice. All
18 projection tests passed after that split. Like the existing lineage tests,
this source-backed check requires the retained private publication archives;
it does not copy those archives or model answers into the tracked fixture.
