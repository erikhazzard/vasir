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
