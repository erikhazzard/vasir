# Vasir Benchmarking: Implementation Map

Warm engineering detail for the active rung. Repository truth overrides this map when implementation discovers drift; product promises remain in `../work-spec.md`.

## 1) Current source map

```text
cli/command-runner.js                    independent benchmark/report command routing
cli/eval/benchmark-source.js             independent benchmark resolution and validation
cli/eval/skill-source.js                 separately selected skill treatment resolution
cli/eval/benchmark-models.js             27 provider/model/reasoning configurations
cli/eval/agent-runtime.js                fresh isolated Codex and Claude CLI sessions
cli/eval/run-benchmark-eval.js           matrix planning, generation, judging, artifact/report write
cli/eval/benchmark-judge.js              configurable blinded bounded panel plus bounded fresh synthesis
cli/eval/history.js                      atomic authoritative run.json history
cli/eval/benchmark-report.js             self-contained editorial report renderer
cli/eval/benchmark-catalog.js            derived multi-prompt catalog renderer
cli/eval/report-benchmark-eval.js        saved-artifact report regeneration/opening
cli/eval/rejudge-benchmark-eval.js       immutable saved-response panel rejudging
cli/eval/vendor/d3.v7.min.js             vendored D3 embedded into report.html
cli/eval/vendor/d3.LICENSE               vendored D3 license
benchmarks/hyper-scale-chat/benchmark.json independent prompt and scoring fixture
benchmarks/personalized-home-feed/benchmark.json novel feed prompt and scoring fixture
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
  -> preserve each complete anchored 0-100 judgment, reason, runtime receipt, batch result, and disagreement
  -> give each batch's anonymous compact judgment records to a separate fresh codex:gpt-5.6-sol@ultra synthesis session
  -> select the most rubric-faithful internally complete judgment per candidate; never average or invent a hybrid
  -> persist one complete-or-incomplete run.json atomically
  -> derive a self-contained vendored-D3 report.html and open it when --open was supplied
  -> scan benchmark run.json history and regenerate a self-contained index.html prompt catalog
  -> later regenerate/reopen with vasir eval report hyper-scale-chat [run-id] --open
  -> or apply the current panel to saved responses with vasir eval rescore hyper-scale-chat [run-id]
  -> author inspects lift, ranking, full answers, rubric, cohort basis, and calibration status
```

The 54-row generation path completed its first full live traversal in run `2026-08-26T03-51-51Z__dd6d985de7f7`. Its original clean `51.6`, treatment `66.0`, and mean `+14.4` lift came from the superseded single Sol-max judge. Immutable rejudge `2026-08-26T13-33-06Z__rejudge__d32ad50440bf` completed the v1 two-judge plus synthesis path over the same answers and observed clean `52.7`, treatment `79.1`, mean `+26.5` lift, 26 wins / 0 ties / 1 loss, and `claude:opus@max` as the best configuration. Feed run `2026-08-26T14-28-16Z__58e3391437f7` then proved that the v1 all-candidate call did not scale: its 210,542-character prompt took Sol 17.6 minutes and timed Opus out at 40 minutes. V2 maps that exact cohort to nine 25–33 KiB matched batches instead of extending the timeout. Feed rejudge `2026-08-26T16-19-35Z__rejudge__1f4c92f2c0e3` completed all 18 panel and nine synthesis executions, observed clean `65.6`, treatment `72.3`, mean `+6.7` lift, and named `claude:opus@high` best overall at `95.0`. Scorer calibration remains pending for both prompts.

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
- Escape all model and rubric content when producing HTML. Inline JavaScript receives serialized data through a safe encoding, not raw string interpolation.

The neutral baseline is concrete and task-neutral: the harness's small task-facing system instruction, the exact case task, and the same output contract sent to treatment. It contains no Vasir root contract, skill text, worked example, prior conversation, or rubric. Treatment inserts the verbatim skill snapshot in one designated context message immediately before the task message. Harness version 2 replaced architecture-specific wording before the second prompt run; the version and complete ordered messages remain recorded so that generation-basis change is visible rather than trusted.

`run.json` remains the only authority. Each `report.html` and the root prompt-catalog `index.html` can be deleted and regenerated from artifacts. The catalog may show prompt-local summaries and exact report links, but it publishes no cross-prompt arithmetic until an explicit calibrated taxonomy makes those values comparable.

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

The current path derives candidate order deterministically from row keys and output hashes, then groups matched conditions by configuration, case, and trial. Identical saved cohorts therefore keep the same blinded mapping and batch plan across rejudges. Every configured panel member receives identical bounded batch prompts in fresh sessions and sees neither model nor condition identity. Synthesis uses the same batches and receives no reviewer model identities; it sees the anonymous candidate bodies plus compact totals, gate statuses, dimension ratings, and one UTF-8-byte-bounded overall rationale per judgment. Full original evidence remains in the artifact. It selects one whole panel evaluation per candidate. The default panel is Opus max plus Sol ultra, with Sol-ultra synthesis, but the runner contains no branch for those identities.

All configured judge and synthesis batches are required. If a judge batch fails or omits a candidate, synthesis is skipped and no final row scores exist. If a synthesis batch fails or omits a selection, no panel score is used as fallback. Successful compatible batches remain reusable; failures and exact evidence remain in the artifact for retry and diagnosis.

Calibration before the first claim:

- one human-labeled strong, simple answer;
- one persuasive but overbuilt answer;
- one simple but product-incomplete answer;
- one answer using different technology while satisfying the same lasting contract.

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

1. **The benchmark measures style agreement.** Calibrate gates on known strong/overbuilt/underbuilt/counter-idiomatic answers; keep candidates anonymous; expose reasons and cohort basis; require human review for the first claim.
2. **The report launders weak samples into confidence.** Default to raw trial spread and sample counts, make incomplete cells explicit, and let every aggregate drill into the exact rows.
3. **“Generic” becomes an evaluator framework.** Keep the stable core to condition snapshots, rows, pairs, score records, artifacts, and rendering; add a new task-kind adapter only when a real response or workspace task cannot fit those records.
