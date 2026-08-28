# Vasir Benchmarking: Implementation Map

Warm engineering detail for the active rung. Repository truth overrides this map when implementation discovers drift; product promises remain in `../work-spec.md`.

## 1) Current source map

```text
cli/command-runner.js                    independent benchmark/report command routing
cli/eval/benchmark-source.js             independent benchmark resolution and validation
cli/eval/skill-source.js                 separately selected skill treatment resolution
cli/eval/benchmark-models.js             27 provider/model/reasoning configurations
cli/eval/agent-runtime.js                fresh isolated Codex and Claude CLI sessions
cli/eval/run-benchmark-eval.js           matrix planning, post-generation checkpoint, judging, final artifact/report write
cli/eval/benchmark-judge.js              configurable blinded bounded panel plus bounded fresh synthesis
cli/eval/history.js                      atomic authoritative run.json history
cli/eval/benchmark-report.js             self-contained editorial report renderer
cli/eval/benchmark-catalog.js            derived model leaderboard, paired treatment effect, and benchmark-evidence renderer
cli/eval/report-benchmark-eval.js        saved-artifact report regeneration/opening
cli/eval/rejudge-benchmark-eval.js       immutable saved-response panel rejudging
cli/eval/vendor/d3.v7.min.js             vendored D3 embedded into report.html
cli/eval/vendor/d3.LICENSE               vendored D3 license
benchmarks/hyper-scale-chat/benchmark.json independent prompt and scoring fixture
benchmarks/personalized-home-feed/benchmark.json novel feed prompt and scoring fixture
benchmarks/device-telemetry/benchmark.json vendor-neutral telemetry prompt and scoring fixture
benchmarks/capability-taxonomy.json       versioned capability map plus model-index and treatment-effect contracts
test/eval-benchmark-*.test.js            active benchmark harness/report coverage
.agents/vasir-evals/<benchmark>/<run>/   ignored local run.json and report.html evidence
```

The implemented topology remains synchronous and local: command router → benchmark and treatment resolvers → fresh Codex/Claude generation processes → bounded configured judge and synthesis processes → atomic local artifact → derived static report and catalog. No server, database, worker queue, or runtime frontend dependency is required by the benchmark pages.

## 2) Active-rung flow

```text
Author
  -> vasir eval run hyper-scale-chat --treatment skill:plan__question-spec-architecture --trials 1 --open
  -> resolve the independent benchmark fixture and the separately selected skill snapshot
  -> expand 27 provider/model/reasoning configurations x 1 case x 1 trial x 2 conditions = 54 rows
  -> execute each row in its own temporary directory and fresh, non-persisted Codex or Claude CLI session
  -> preserve complete, unavailable, and failed rows with exact prompts and runtime receipts
  -> derive one stable anonymous candidate order from the cohort contents
  -> keep each matched clean/treatment group intact and derive deterministic batches of at most 3 groups and 6 candidates whose exact panel and worst-case synthesis prompts each fit within 64 KiB
  -> send the same batch plan independently to fresh claude:opus@max and codex:gpt-5.6-sol@ultra sessions, at concurrency 4 and a 10-minute per-call deadline
  -> validate that each judge produced one substantive, internally consistent rubric record for every candidate; placeholders/defaults make the batch incomplete
  -> preserve every valid judgment, reason, runtime receipt, batch result, invalid record, and disagreement
  -> counterbalance candidate order across judges while keeping matched conditions in the same bounded batch
  -> give each batch's anonymous judgments plus the fixed human-labeled calibration anchors to a separate fresh codex:gpt-5.6-sol@ultra synthesis session
  -> emit one fresh anchored final rubric record per candidate on a shared declared scale; do not select raw judge totals candidate by candidate
  -> persist one complete-or-incomplete run.json atomically
  -> derive a self-contained vendored-D3 report.html and open it when --open was supplied
  -> scan benchmark run.json history, apply the versioned capability taxonomy, and fail closed on incomplete or incompatible mapped evidence
  -> within every task and condition, score each model configuration by the percentage of peers it outranks, with ties worth one half
  -> equal-weight those task-local peer percentages into separate minimal-baseline and exact Architecture-skill development indexes
  -> retain the prompt-equal matched-outcome rating only as cohort-relative secondary treatment evidence
  -> regenerate a self-contained index.html with one absolute model/reasoning/condition leaderboard, exact condition badges and paired markers, and benchmark evidence underneath
  -> later regenerate/reopen with vasir eval report hyper-scale-chat [run-id] --open
  -> or apply the current panel to saved responses with vasir eval rescore hyper-scale-chat [run-id]
  -> author inspects lift, ranking, full answers, rubric, cohort basis, and calibration status
```

The 54-row generation path completed its first full live traversal in run `2026-08-26T03-51-51Z__dd6d985de7f7`. Its original clean `51.6`, treatment `66.0`, and mean `+14.4` lift came from the superseded single Sol-max judge. Immutable rejudge `2026-08-26T13-33-06Z__rejudge__d32ad50440bf` exercised the v1 two-judge plus synthesis transport over the same answers. Feed run `2026-08-26T14-28-16Z__58e3391437f7` then proved that the v1 all-candidate call did not scale: its 210,542-character prompt took Sol 17.6 minutes and timed Opus out at 40 minutes. V2 maps that exact cohort to nine 25–33 KiB matched batches instead of extending the timeout.

The M1F validity audit found that the latest featured chat, feed, and telemetry artifacts contain 35 exact `Evaluation in progress.` judge placeholders while marked complete. Their synthesis records selected other judgments, which hid the missing substantive panel seats. The generated answers and retry evidence remain valid; their final scores and category projection are ineligible until record validation fails closed and the saved cohorts are rescored. The current catalog also hardcodes the isolated architecture skill as `With Vasir`; M1F derives the exact display label from treatment metadata.

## 3) Run artifact shape

The current M1 artifact is schema version 1 and uses this implemented shape; nested fields below are abbreviated.

```json
{
  "kind": "benchmark",
  "schemaVersion": 1,
  "runId": "...",
  "runStatus": "complete | incomplete",
  "benchmark": { "id": "hyper-scale-chat", "hash": "...", "generationHash": "...", "scoringHash": "...", "definition": {} },
  "treatment": { "id": "skill:plan__question-spec-architecture", "hash": "...", "content": "..." },
  "conditions": [{ "id": "clean" }, { "id": "skill:plan__question-spec-architecture" }],
  "configurations": [{ "id": "codex:gpt-5.6-sol@low", "provider": "codex", "model": "gpt-5.6-sol", "reasoning": "low" }],
  "generation": { "trialCount": 1, "concurrency": 4, "freshAgentSessions": true },
  "judging": {
    "strategy": "panel-synthesis-v2",
    "judgeConfigurations": [{ "id": "codex:gpt-5.6-sol@ultra" }, { "id": "claude:opus@max" }],
    "synthesizerConfiguration": { "id": "codex:gpt-5.6-sol@ultra" },
    "freshContext": true,
    "blinded": true,
    "calibrationStatus": "author-calibration-pending",
    "cohortHash": "...",
    "candidateOrder": [],
    "batchPlan": { "version": "matched-groups-v1", "hash": "...", "maxGroups": 3, "maxCandidates": 6, "maxPromptBytes": 65536, "reviewerCount": 2, "batches": [{ "worstCaseSynthesisPromptBytes": 0 }] },
    "panelPromptText": "concatenated compatibility view",
    "judges": [{ "reviewerId": "reviewer-001", "configuration": {}, "evaluations": [], "batches": [], "outputText": "concatenated compatibility view" }],
    "disagreement": { "candidateCount": 54, "candidatesWithDisagreement": 0, "maxScoreSpread": 0 },
    "synthesis": { "configuration": {}, "selections": [], "batches": [], "promptText": "concatenated compatibility view", "outputText": "concatenated compatibility view" },
    "basisHash": "..."
  },
  "rows": [
    {
      "rowKey": "...",
      "configurationId": "...",
      "caseId": "...",
      "trialNumber": 1,
      "conditionId": "clean | skill:...",
      "rowStatus": "complete | unavailable | error",
      "exactMessages": [],
      "outputText": "...",
      "runtimeReceipt": { "freshSession": true, "persistedSession": false },
      "basisHash": "...",
      "score": { "total": 0, "gates": [], "dimensions": [], "reason": "..." },
      "scoreBasisHash": "..."
    }
  ],
  "pairs": [{ "cleanRowKey": "...", "treatmentRowKey": "...", "lift": 0 }],
  "summary": {},
  "harnessVersion": 2,
  "scorerVersion": "hyper-scale-chat-rubric-v1"
}
```

Required provenance details:

- Save full harness-controlled request messages, not reconstructed excerpts.
- Save the treatment content as well as its hash so a historical report survives later skill edits.
- Save the deterministic batch plan, every exact per-batch panel/synthesis prompt and output, anonymous reviewer mapping, status/reuse/error/usage evidence, per-candidate disagreement, selections/reasons, candidate cohort hash, and final basis; concatenated top-level text exists only for v1 report compatibility, and no rubric content enters generation messages.
- Save provider usage as returned. Estimated cost needs a named price snapshot and date; otherwise render `Unavailable`, never `$0`.
- Preserve failed rows and judge failures as typed records instead of dropping them.
- Preserve invalid-but-parseable judge records as typed failures with their exact raw evidence; never normalize them into a zero score or let an unselected invalid record disappear from panel completeness.
- Escape all model and rubric content when producing HTML. Inline JavaScript receives serialized data through a safe encoding, not raw string interpolation.

M1F may extend the schema with explicit judge-record validation and final-synthesis records. The lasting requirements are semantic: each configured seat has a substantive evaluation for every candidate; counterbalanced candidate order is reconstructable; every bounded synthesis prompt carries the same calibration-anchor identity; each final score is a fresh anchored rubric record rather than a pointer to one judge's raw total; and any missing dependency keeps the row and every derived aggregate ineligible.

The neutral baseline is concrete and task-neutral: the harness's small task-facing system instruction, the exact case task, and the same output contract sent to treatment. It contains no Vasir root contract, skill text, worked example, prior conversation, or rubric. Treatment inserts the verbatim skill snapshot in one designated context message immediately before the task message. Harness version 2 replaced architecture-specific wording before the second prompt run; the version and complete ordered messages remain recorded so that generation-basis change is visible rather than trusted.

`run.json` remains the authority for every execution and score; `benchmarks/capability-taxonomy.json` is the authority only for the current category names, mappings, weights, model-index method, and treatment-effect rating method. Each `report.html` and the root benchmark `index.html` can be deleted and regenerated. The catalog may publish a category model index or treatment-effect rating only when every mapped prompt has complete scored matched outcomes under one exact treatment snapshot and compatible harness/model/judge contract. Model configurations are ranked separately by condition: each task converts its task-local scores into a tie-aware peer-outrank percentage, then mapped tasks receive equal weight. The paired Vasir record and secondary Elo-equivalent use equal-prompt ordinal outcomes. The catalog records an aggregate basis hash from exact source runs and bases, exposes calibration state, returns `NO SIGNAL` instead of dropping missing or incompatible cells, never averages unlike prompt-local 0–100 scales, and publishes no cross-category overall yet.

## 4) Suite and scoring shape

The independent benchmark contract permits task-owned gates and anchored dimensions without taking condition content from the treatment. Later benchmark kinds may also use:

- deterministic required/forbidden checks for truly lexical contracts;
- semantic gates for defining behavior and correctness that cannot be averaged away;
- anchored numeric dimensions for quality differences;
- artifact or executable checks in a later workspace task;
- explicit human questions for taste or embodied use.

The active `hyper-scale-chat` fixture contains the exact 10M-concurrent-user prompt plus an outcome-based rubric independent from the architecture skill. It defines four claim-capping architecture gates and seven weighted 0–4 dimensions that produce a capped 0–100 score.

Architecture gates should test outcomes, not technology words:

1. The design includes the product's defining behavior, including obvious behavior implied by its name.
2. Canonical authority and stable ownership/partitioning are explicit enough to prevent ambiguous concurrent writes.
3. Day 1 reaches the stated scale by adding replicas/partitions rather than replacing the critical path.
4. Required correctness and material failure/recovery behavior are preserved.

Useful anchored dimensions:

- goal and forced-requirement fidelity;
- bounded hot path and scale function;
- component rent and collapsed-shape simplicity;
- performance, cost, and local-to-production parity;
- failure, retry, and recovery clarity;
- assumptions, tradeoffs, and invalidation triggers.

Do not require `Redis`, `Valkey`, `GET`, `BullMQ`, or any other preferred noun. A non-Vasir topology can win when it satisfies the contract with lower justified rent; a Redis-heavy answer can fail when it is unforced or incorrect.

The current implementation derives candidate order deterministically from row keys and output hashes, groups matched conditions by configuration, case, and trial, and sends the same order to every configured panel member. Synthesis sees the same batches and selects one whole panel evaluation per candidate. The default panel is Opus max plus Sol ultra, with Sol-ultra synthesis, but the runner contains no branch for those identities. M1F must counterbalance candidate order between judges and replace raw-record selection with one fresh anchored final rubric record per candidate; otherwise the final numeric axis can mix differently calibrated judge scales across candidates and batches.

All configured judge records and synthesis records are required. Existing code correctly fails closed on a failed batch or omitted candidate, but it currently treats schema-shaped placeholders and default records as complete. M1F validates substantive rubric content and internal score consistency before batch completion. Successful compatible batches remain reusable; invalid records, failures, and exact evidence remain in the artifact for retry and diagnosis.

Calibration before the first claim:

- one human-labeled strong, simple answer;
- one persuasive but overbuilt answer;
- one simple but product-incomplete answer;
- one answer using different technology while satisfying the same lasting contract.
- one rubric-grounded legitimate zero that must remain distinguishable from a default all-zero record.

The rubric is acceptable only if it orders those examples for the intended reasons. This is a scorer calibration check, not a substitute for the live journey.

## 5) Report information design

Generate a single local, responsive HTML file with inline CSS and JavaScript. `benchmark-report.js` reads the checked-in D3 v7.9.0 source and embeds it directly, so `report.html` works from `file://` without a network or runtime dependency. Every chart has an adjacent table or textual equivalent.

Top-to-bottom layout:

1. **Editorial hero**: observed Vasir lift, exact prompt, best observed answer, completion counts, and calibration warning.
2. **Configuration ranking**: every scored model/reasoning/condition cell on the synthesized 0–100 axis.
3. **Treatment lift**: clean-to-skill movement for each matched configuration.
4. **Answer inspector**: permanent clean-versus-treatment score spreads for any three configurations, plus a condition control for the complete answer, gates, dimensions, reasons, usage, and exact prompts shown below.
5. **Complete matrix**: visible complete, unavailable, and failed rows with exact trial evidence and human-readable latency.
6. **Measurement contract**: panel members, synthesis authority, disagreement, freshness, blinding, calibration, cohort hash/size, rubric, and limitations.

Visual rules:

- Color never carries verdict alone; pair it with labels/icons and accessible text.
- `INCOMPLETE`, `NO SIGNAL`, and judge disagreement must be visually louder than small score differences.
- Show sample counts and preserve every exact trial row beneath aggregates; do not add a separate chart when it does not improve a real comparison.
- Never rank across incompatible cells.
- Default to the bottom line, but never truncate away the full output in drill-down.
- The report must open correctly from `file://`; `--open` is convenience, not a server dependency.

The root `index.html` is a frontier-model benchmark first and a Vasir treatment study second. Its order is:

1. **Scope:** the currently measured capability, benchmark count, model-configuration count, scored-response count, and calibration coverage. It shows neither speculative future categories nor a fake overall.
2. **Model performance:** one compact absolute leaderboard contains every eligible model/reasoning/condition row, sorted by the selected exact condition and defaulting to the strongest current treatment. Each row names `Minimal baseline` or the exact skill/workflow treatment, shows its cardinal task score and absolute rank, and retains a quieter paired marker and score for the other condition. No condition toggle hides half the field.
3. **Treatment effect:** the exact aggregate W/T/L record leads, followed by each benchmark's baseline/treatment score pair, lift, tokens, latency, and cost when attributable. The cohort-relative peer index and prompt-equal rating remain secondary method evidence.
4. **Benchmark evidence:** compact condition scores, lift, record, completion, calibration, and exact report links. Long task text stays in the prompt report rather than dominating catalog navigation.
5. **Method and limits:** peer-index formula, treatment-effect formula, taxonomy and basis identities, trial count, calibration, and explicit claim boundary.

The first development taxonomy maps only chat, feed, and telemetry to the Engineering track `backend-architecture`. It does not render speculative Games, Product Design, Writing, AI Workflows, or other empty programs. New families use the same declarative taxonomy shape only when real evidence exists. The current run metadata identifies the treatment as `skill:plan__question-spec-architecture`; projections must display an exact Architecture-skill label and reserve `With Vasir` for a normal full-workflow run.

## 6) History and compatibility

Keep generation comparability and numeric-score comparability distinct. A generation row basis includes:

```text
benchmark input + fixture
clean or exact treatment snapshot
provider + model + reasoning settings
trial basis
neutral harness + output contract
harness version
```

Generation identity now hashes only generation-facing cases, output contract, model configuration, trial/harness basis, and condition snapshot. Judge configuration and rubric changes affect `benchmark.scoringHash`, not `benchmark.generationHash`, so saved answers can be rejudged without pretending they were regenerated.

The numeric score basis includes the scorer/rubric, exact candidate `cohortHash`, batch policy and plan hash, configured panel member batch bases and evaluation hashes, synthesis batch prompts and selections, and synthesizer configuration. The cohort hash covers the ordered row keys and output hashes; the plan hash covers matched grouping, candidate membership, limits, and exact panel prompts. Thus the complete candidate set, batching, and actual panel evidence are part of score comparability even though they are not part of generation comparability.

`vasir eval rescore <benchmark> [run-id]` reads the saved outputs, applies the current panel configuration, and writes a new run with `rescoredFromRunId` plus `generation.sourceRunId`; it never overwrites the source artifact. A later model can generate a new row without invalidating old outputs, but its score cannot be appended to an old ranking: adding the answer changes the judge cohort. Compare old and new only after rejudging one shared cohort. Append-only score history still requires a later calibrated fixed-anchor independent scorer.

If generation or score bases are incompatible, display separate experiment versions or `NOT COMPARABLE`; never carry old numbers forward, choose the closest run heuristically, or imply that rerendering alone rejudges a cohort. A future campaign/history view can scan local `run.json` files directly; no index database is forced at this scale.

## 7) Workspace-task extension boundary

Do not build this in the active rung. The future task-kind extension must preserve the same experiment envelope but may replace `response.text` with an artifact receipt:

```text
identical immutable fixture
  -> isolated baseline agent run
  -> patch/files + command/browser/media receipts
  -> isolated treatment agent run
  -> same receipts
  -> task-owned executable gates + human acceptance
  -> same pair/matrix/report vocabulary
```

One real task should force the isolation mechanism. A game benchmark probably needs a copied fixture, bounded command execution, a playable capture, and human feel questions; that does not yet justify a generic plugin host, remote sandbox service, or background worker system.

## 8) Top failures and smallest corrections

1. **A parseable placeholder becomes a completed judge seat.** Validate substantive rubric content and internal consistency, preserve invalid records, fail every dependent score closed, and prove a legitimate rubric-grounded zero still passes.
2. **Synthesis hides disagreement by selecting whichever raw scale is convenient.** Counterbalance order, expose panel spread, carry fixed human anchors into every bounded synthesis batch, and emit one fresh final rubric record on a shared scale.
3. **An isolated skill is presented as full Vasir.** Derive user-visible condition names from exact treatment metadata and reserve the full-workflow label for a C-013 execution trace.
4. **The benchmark measures style agreement.** Calibrate gates on known strong/overbuilt/underbuilt/counter-idiomatic answers; keep candidates anonymous; expose reasons and cohort basis; require human review for the first claim.
5. **The report launders weak samples into confidence.** Default to raw trial spread and sample counts, make incomplete cells explicit, and let every aggregate drill into the exact rows.
6. **“Generic” becomes an evaluator framework.** Keep the stable core to condition snapshots, rows, pairs, score records, artifacts, and rendering; add a new task-kind adapter only when a real response or workspace task cannot fit those records.
