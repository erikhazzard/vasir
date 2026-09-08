# Run and preserve Dungeon Master v1

From the Vasir repository root, prepare with the explicitly selected skill directory:

```sh
node cli/eval/run-dungeon-master-benchmark.js --prepare --skill-directory /absolute/path/to/dungeon-master
```

Preparation writes the frozen benchmark, all skill files, runtime dependency tree, source hashes, sixteen pair plans and thirty-two rows. It makes no provider call. Inspect the manifest and preserve the separately run baseline-denial and treatment-reference sentinel probes under the run's `preflight` directory. A successful `preflight/verification.json` is required before real generation. Its claims must be supported by actual retained probe outputs, never by fabricated fixtures.

```sh
node --test test/dungeon-master-benchmark-runner.test.js
node cli/eval/run-dungeon-master-benchmark.js --generate --concurrency 4
```

The default run directory is `.agents/vasir-evals/dungeon-master-adventure-outline/dm-outline-v1-2026-09-08`. The runner acquires `run.lock` before loading it; do not delete a live lock or hand-edit checkpoints. Completed rows are reused. Technical retries obey the frozen maximum of one; a valid disappointing answer or omitted reference read remains evidence. Each attempt preserves private raw provider streams with hashes. Judging is a separate coordinator-owned process and checkpoint, enabling completed pairs to be reviewed while generation continues without competing writers to run.json.

Use `judge-dungeon-master-benchmark.js` according to its CLI contract for the two frozen Astra Ultra reviewer seats. It must use the exact frozen run copy of `judge-rubric.md`, required evidence schema and counterbalanced order. No judge sees the skill, treatment labels or another judge's ratings. Source selection/publication waits until actual generation and judging coverage are verified. Missing evidence remains visible and incomplete rankings are withheld.

Archive exact source bytes and skill snapshot before publication. Use the dedicated Dungeon Master projector/selection, preserve Storytelling's source pin and all incumbent projections, run desktop/mobile/tablet browser proof against the same immutable candidate, review its captures, renew shared presentation acceptance under standing user authority, then use the guarded benchmark publisher. Retain live verification receipts. Local artifacts and dry runs are not proof of deployment.

## Explicit recovery after a provider interruption

The v1 judge runner skips already recorded failed seats and does not reconcile interrupted running seats. Re-running that runner unchanged cannot recover those units. Confirm that prior processes have stopped and their locks are no longer live, then preserve a complete, exact pre-resume archive of the run directory. Keep the frozen inputs, manifest, dependency copies, raw streams, completed records and failed attempts intact.

Use the bounded operator controller with that matching archive and the existing user authorization to continue. This is separately recorded recovery after interruption, distinct from the frozen automatic-retry policy:

```sh
node cli/eval/resume-dungeon-master-benchmark.js \
  --run-directory .agents/vasir-evals/dungeon-master-adventure-outline/dm-outline-v1-2026-09-08 \
  --archive-directory .agents/vasir-evals/dungeon-master-adventure-outline/recovery-history/pre-resume-20260908-0154 \
  --authorization 'Record the existing user instruction and the missing units authorized for recovery' \
  --concurrency 4
```

The controller validates the archived checkpoint hashes, original judge helper source bytes, frozen runtime dependencies, scoring protocol and candidate order before dispatch. It preserves each successful writer and judge record, appends one recovery attempt per missing unit, retains full prior failed-slot records, and makes no automatic recovery retry. A recognized terminal quota error stops new dispatch while existing calls settle. Never reroll a successful answer or judgment because of its quality or score. A further interruption requires another exact prestate archive and explicit operator recovery under the user's continuing authorization; do not silently overwrite evidence or delete a live lock.

The completed September 8 recovery is recorded in `operator-recovery/operator-resume-2026-09-08T01-59-09.768Z/`. Its receipt pins the executed controller, account context, requested configuration, prestate and final checkpoint bytes. `audit-recovery.json` verifies 32 writers, 32 judge reviews, 64 distinct successful sessions, all original successful records, all archived raw streams and answers, unchanged frozen inputs, and maximum concurrency four. The original 3 failed writer attempts and 20 failed judge attempts remain alongside the 19 successful recovery calls. Isolation and readiness probes are excluded from these benchmark attempt totals.

The original judge runner's recorded `runnerHash` hashed `JSON.stringify(Buffer(source))`; `judge-runner-lineage.json` separately records the raw source-byte SHA256. Preserve both values with their encoding labels. For this recovery, a separately recorded metadata finalizer aligned only `run.judging.updatedAt` with the final `judges.json` timestamp; the receipt records its source hash and before/after run hashes. Use the post-finalization hashes verified by the final audits for publication, and leave the run's frozen methodology and manifest unchanged.
