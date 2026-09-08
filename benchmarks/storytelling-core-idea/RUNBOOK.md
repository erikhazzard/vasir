# Running and publishing Core idea

Run commands from the Vasir repository root. The dedicated runner is required:
the generic benchmark command deliberately rejects this experiment because its
flattened skill context would change the treatment.

## New frozen run

```sh
node cli/eval/run-storytelling-benchmark.js --prepare --run-id YOUR_NEW_RUN_ID
node cli/eval/run-storytelling-benchmark.js --resume YOUR_NEW_RUN_ID --generation-only --concurrency 16
node cli/eval/run-storytelling-benchmark.js --resume YOUR_NEW_RUN_ID --judge-only --judge-concurrency 16
```

The default inventory is six families, 33 exact model/reasoning settings, twelve
stories, two conditions and one trial: 792 answers. Each intact answer pair goes
to Astra xhigh and Fable 5.1 max. That is 396 pairs and 792 judge requests, with
1,584 individual answer assessments. Runtime-internal collaboration is separate
from these CLI request counts.

Read the persisted manifest before generation. The corpus, evidence, rubric,
configuration inventory, skill snapshot and order seed must be frozen before
seeing results. A different task set, treatment or scoring policy requires a
separately declared edition, not a quiet change to an existing comparison.

## Provider availability and recovery

Use the same authorized account context for both an authentication check and its
subsequent CLI calls. Ratatosk-managed Claude contexts can be selected with the
supported `CLAUDE_CONFIG_DIR` environment variable. Do not copy credentials into
the run, source tree or command logs. A logged-out default context does not prove
all managed contexts are logged out; successful authentication does not prove
that a particular model still has quota.

Execution-only filters preserve every planned cell:

```sh
node cli/eval/run-storytelling-benchmark.js --resume YOUR_RUN_ID --generation-only --generate-provider codex --concurrency 16
node cli/eval/run-storytelling-benchmark.js --resume YOUR_RUN_ID --generation-only --generate-provider claude --generate-model claude-opus-5 --concurrency 16
node cli/eval/run-storytelling-benchmark.js --resume YOUR_RUN_ID --generation-only --generate-provider claude --generate-model claude-fable-5-1 --concurrency 16
node cli/eval/run-storytelling-benchmark.js --resume YOUR_RUN_ID --judge-only --judge-provider codex
node cli/eval/run-storytelling-benchmark.js --resume YOUR_RUN_ID --judge-only --judge-provider claude
```

Provider and model filters intersect. They leave unselected generation cells
pending with zero attempts, and unselected judging seats deferred without a
provider call. They do not reduce the coverage denominator or change the panel.
`--model` declares a new run's inventory; it is not a resume filter.

Only one process may mutate a run at a time. Let its `run.lock` owner finish; do
not delete a live lock or hand-merge concurrent checkpoints. Resume reuses valid
completed responses and compatible judgments, acquiring ownership before reading
the saved checkpoint. Generation and judging concurrency are execution-only
limits: `--concurrency` and `--judge-concurrency` accept 1–16; the independent
panel's judging default is 8. They do not change prompts, panel composition or
score arithmetic. Add `--retry-failed` to generation
only when retrying recorded operational failures with identical frozen inputs.
Never retry a valid answer or assessment because its score is disappointing.
Separate smoke runs are diagnostic and must never be selected as results.

The dedicated Storytelling judge runner has an execution-only quota circuit.
After a runtime error explicitly reports exhausted usage credits or a recognized
usage limit, subsequent not-yet-invoked batches for that exact provider/model are
`deferred` with `executionAttempted: false`, zero duration, and no evaluations.
The first actual error is retained unchanged; already-invoked calls settle
normally. Other models/providers continue. A bare 429, a rate-limit message, or
an output-filtering 400 does not open the circuit. Each new invocation starts
closed; it still reuses every compatible completed judgment without rerolling.
The circuit does not change prompts, frozen inventories, panel seats, or scores.

Before resuming a judge pass with failures, let its lock owner finish and archive
the unchanged full run plus frozen skill snapshot. Generic judge recovery reuses
completed batches but replaces failed/deferred batch records; the circuit's safe
cause hashes in `executionHistory` are not a full failed-attempt archive. From
the repository root, this archive-only call leaves publication selection and
generated site files unchanged:

```sh
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";
import { prepareWritingPublicationSource } from "./cli/eval/writing-publication.js";
const repoRootDirectory = process.cwd();
const runDirectory = path.resolve(process.argv[1]);
if (fs.existsSync(path.join(runDirectory, "run.lock"))) throw new Error("Wait for the run lock owner to finish before archiving.");
const archived = prepareWritingPublicationSource({ repoRootDirectory, runDirectory });
process.stdout.write(JSON.stringify(archived) + "\n");
' .agents/vasir-evals/storytelling-core-idea/YOUR_RUN_ID
```

Record the returned archive paths and SHA-256 pins in the recovery work log and
final source lineage before a new writer starts. Do not use the source-selection
CLI for this preservation step. Resume missing operational judgments only when
capacity is available, with the same frozen inputs and required panel; do not
change account/model routing to bypass a provider output-policy block.

When generation is added after an earlier judging pass, run both judging seats
again without execution filters. Completed compatible batches are reused; the
new pairs receive their missing reviews. One provider's ratings cannot stand in
for the complete two-provider panel.

## Inspect and publish

```sh
node --test test/storytelling-benchmark-runner.test.js test/writing-publication.test.js
node cli/eval/select-storytelling-publication.js --run-directory .agents/vasir-evals/storytelling-core-idea/YOUR_RUN_ID
node site/vasirbenchmark.com/writing-browsercheck.mjs --url YOUR_REVIEW_URL --output-dir YOUR_PROOF_DIRECTORY --width 1440 --height 1000 --require-scored
```

Repeat browser checks at 390×844 and 820×1000. The selector copies an immutable
checkpoint, pins its exact bytes and the frozen skill, and regenerates the public
bundles. It does not invent scores or modify responses. Available answers and
individual reviews can be inspected on an incomplete preview; corpus ranks
require both arms of every story and the full independent panel.
`--require-scored` additionally rejects a preview with no complete scored
configuration; it exercises the real ranking and efficiency branches.

Review exact answers, original ratings, coverage, frozen reference files,
provider identity limits, source uncertainty, and usage-normalization limits.
Check the unchanged Overall projection and historical report routes. A local
browser rehearsal is not proof of production deployment. Coordinate the shared
site acceptance lock with any concurrent benchmark work, and renew it only after
reviewing the final source and captures under the user's publication authority.

```sh
node bin/vasir.js benchmark publish --dry-run
node bin/vasir.js benchmark publish
```

Use the guarded publisher, not an ad-hoc upload. Require the accepted-source,
byte-budget, immutable-release, live-byte and browser checks before claiming the
release is live. Writing remains excluded from Overall; Prose and Poetry stay
unscored until they have their own benchmark evidence.
