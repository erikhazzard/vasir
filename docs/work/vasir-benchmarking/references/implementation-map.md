# Vasir Benchmarking: Implementation Map

Warm engineering detail for the active rung. Repository truth overrides this map when implementation discovers drift; product promises remain in `../work-spec.md`.

## 1) Current source map

```text
cli/command-runner.js                    independent benchmark/report command routing
cli/eval/benchmark-source.js             independent benchmark resolution and validation
cli/eval/skill-source.js                 separately selected skill treatment resolution
cli/eval/benchmark-models.js             30 provider/model/reasoning configurations
cli/eval/agent-runtime.js                fresh isolated Codex and Claude CLI sessions
cli/eval/run-benchmark-eval.js           matrix planning, post-generation checkpoint, judging, final artifact/report write
cli/eval/benchmark-judge.js              blinded matched-pair panel and deterministic three-judge aggregation
cli/eval/benchmark-basis.js              row-local generation and score identity
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

The implemented topology remains synchronous and local: command router → benchmark and treatment resolvers → fresh Codex/Claude generation processes → bounded independent judge processes → deterministic majority/median aggregation → atomic local artifact → derived static report and catalog. No server, database, worker queue, synthesizer, or runtime frontend dependency is required by the benchmark pages.

## 2) Active-rung flow

```text
Author
  -> vasir eval run hyper-scale-chat --treatment skill:plan__question-spec-architecture --trials 1 --open
  -> resolve the independent benchmark fixture and the separately selected skill snapshot
  -> expand 30 provider/model/reasoning configurations x 1 case x 1 trial x 2 conditions = 60 rows
  -> execute each row in its own temporary directory and fresh, non-persisted Codex or Claude CLI session
  -> preserve complete, unavailable, and failed rows with exact prompts and runtime receipts
  -> bind stable anonymous ids and order to each row instead of the surrounding model field
  -> make one deterministic batch from each matched Minimal-baseline/Architecture-skill pair; at most 1 pair and 2 candidates per prompt, with a 64 KiB ceiling
  -> send every pair independently to fresh codex:gpt-5.6-sol@ultra, codex:gpt-5.6-terra@ultra, and claude:opus@max sessions at bounded concurrency 8
  -> validate that every judge produced one substantive, internally consistent rubric record for both answers and used no tools; placeholders/defaults make the pair incomplete
  -> preserve every valid judgment, reason, runtime receipt, batch result, invalid record, score spread, and disagreement
  -> counterbalance the two anonymous answers across judges
  -> majority-vote each gate and take the median integer rating for each dimension
  -> recompute the weighted 0–100 task score and apply any majority-failed gate cap; no synthesizer participates
  -> persist one complete-or-incomplete run.json atomically
  -> derive a self-contained vendored-D3 report.html and open it when --open was supplied
  -> scan benchmark run.json history, apply the versioned capability taxonomy, and fail closed on incomplete or incompatible mapped evidence
  -> preserve each task's fixed 0–100 rubric score without any cohort transform
  -> equal-weight those task-local scores into separate minimal-baseline and exact Architecture-skill development scores
  -> compute uplift as the equal-weight mean of paired skill-minus-baseline task deltas in rubric points
  -> regenerate a self-contained index.html with one absolute model/reasoning/condition leaderboard, exact condition badges and paired markers, and benchmark evidence underneath
  -> later regenerate/reopen with vasir eval report hyper-scale-chat [run-id] --open
  -> or apply the current panel to saved responses with vasir eval rescore hyper-scale-chat [run-id]
  -> author inspects lift, ranking, full answers, rubric, panel spread, and development status
```

The historical 54-row generation path completed its first full live traversal in run `2026-08-26T03-51-51Z__dd6d985de7f7`. Its original clean `51.6`, treatment `66.0`, and mean `+14.4` lift came from the superseded single Sol-max judge. Immutable rejudge `2026-08-26T13-33-06Z__rejudge__d32ad50440bf` exercised the later two-judge-plus-synthesis transport over the same answers. Feed run `2026-08-26T14-28-16Z__58e3391437f7` then proved that its all-candidate prompt did not scale: 210,542 characters took Sol 17.6 minutes and timed Opus out at 40 minutes. Those artifacts remain historical. Engineering v1 rescored the saved responses with one matched pair per prompt and three independent judges.

The historical M1F audit found that superseded chat, feed, and telemetry artifacts contained 35 exact `Evaluation in progress.` judge placeholders while marked complete. Their synthesizer selected other judgments, hiding the missing seats. The saved model answers remain reusable, but those scores are not mixed into Engineering v1. The public projector derives the honest `Architecture skill` label from treatment metadata.

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
    "strategy": "matched-pair-panel-median-v1",
    "judgeConfigurations": [
      { "id": "codex:gpt-5.6-sol@ultra" },
      { "id": "codex:gpt-5.6-terra@ultra" },
      { "id": "claude:opus@max" }
    ],
    "synthesizerConfiguration": null,
    "freshContext": true,
    "blinded": true,
    "calibrationStatus": "author-calibration-pending",
    "cohortHash": "...",
    "candidateOrder": [],
    "batchPlan": { "version": "matched-pairs-v2", "hash": "...", "maxGroups": 1, "maxCandidates": 2, "maxPromptBytes": 65536, "batches": [] },
    "panelPromptText": "concatenated compatibility view",
    "judges": [{ "reviewerId": "reviewer-001", "configuration": {}, "evaluations": [], "batches": [], "outputText": "concatenated compatibility view" }],
    "disagreement": { "candidateCount": 60, "candidatesWithDisagreement": 0, "maxScoreSpread": 0 },
    "synthesis": null,
    "aggregation": { "method": "majority-gates-median-dimensions-v1", "judgeCount": 3 },
    "scoreBasisScope": "row-local-panel-evidence-v1",
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
      "score": {
        "total": 0,
        "gates": [],
        "dimensions": [],
        "reason": "...",
        "aggregation": { "method": "majority-gates-median-dimensions-v1", "judgeCount": 3, "evaluations": [], "minScore": 0, "maxScore": 0, "spread": 0 }
      },
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
- Save the deterministic matched-pair plan, every exact per-judge prompt and output, anonymous reviewer mapping, status/reuse/error/usage records, per-response disagreement and spread, aggregate ratings, and row-local score basis. Concatenated top-level text exists only for historical report compatibility, and no rubric content enters generation messages.
- Save provider usage as returned. Estimated cost needs a named price snapshot and date; otherwise render `Unavailable`, never `$0`.
- Preserve failed rows and judge failures as typed records instead of dropping them.
- Preserve invalid-but-parseable judge records as typed failures; never normalize them into a zero score or let a missing seat disappear from panel completeness.
- Escape all model and rubric content when producing HTML. Inline JavaScript receives serialized data through a safe encoding, not raw string interpolation.

The lasting requirements are semantic: each of the three configured seats has a substantive evaluation for both answers in every matched pair; counterbalanced candidate order is reconstructable; majority gates and median dimensions produce the final rubric score; no surrounding cohort enters a row's score identity; and any missing dependency keeps that pair and every dependent aggregate incomplete.

The neutral baseline is concrete and task-neutral: the harness's small task-facing system instruction, the exact case task, and the same output contract sent to treatment. It contains no Vasir root contract, skill text, worked example, prior conversation, or rubric. Treatment inserts the verbatim skill snapshot in one designated context message immediately before the task message. Harness version 2 replaced architecture-specific wording before the second prompt run; the version and complete ordered messages remain recorded so that generation-basis change is visible rather than trusted.

`run.json` remains the authority for every execution and task score; `benchmarks/capability-taxonomy.json` is the authority for category names, mappings, Engineering v1, task weights, paired-effect method, and uncertainty status. Each `report.html` and the root benchmark `index.html` can be deleted and regenerated. The catalog publishes an Engineering score only when every mapped task has complete matched outcomes under one exact treatment snapshot and compatible generation/scoring contracts. Model configurations are ranked separately by condition from the unrounded fixed-edition score: mapped task-local 0–100 rubric scores receive equal weight, while uplift is the paired skill-minus-baseline difference in rubric points. A row-local score hash binds one response, its scoring contract, and its three judge evaluations; run-wide cohort and batch hashes remain operational metadata only. Missing or incompatible cells produce `NO SIGNAL` instead of silent reweighting.

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

The current implementation derives each candidate id and order key from that row's stable identity and output hash, then groups exactly one Minimal-baseline/Architecture-skill pair by configuration, case, and trial. The fixed panel is Sol ultra, Terra ultra, and Claude Opus 5 max. Answer order is counterbalanced across judges. Gates use the three-judge majority, dimensions use the median integer rating, and the task scorer recomputes the final value from those aggregates. There is no synthesizer and no candidate-by-candidate selection of one judge's raw total.

All three judge records are required for both answers. Substantive-rationale, schema, internal-score, and tool-free receipt checks run before a batch completes. Successful compatible judge/pair batches remain reusable; invalid records and failures remain in the artifact for retry and diagnosis. The rescore checkpoint is updated after each completed batch, so an interruption does not discard the remaining completed work.

Useful future calibration cases:

- one human-labeled strong, simple answer;
- one persuasive but overbuilt answer;
- one simple but product-incomplete answer;
- one answer using different technology while satisfying the same lasting contract.
- one rubric-grounded legitimate zero that must remain distinguishable from a default all-zero record.

Until those cases are author-labeled, calibration remains internal score metadata. The UI keeps the method compact as `Engineering v1 · 3 tasks × 1 trial · 3 judges`; this does not block using the board as the first practical baseline.

## 5) Report information design

Generate a single local, responsive HTML file with inline CSS and JavaScript. `benchmark-report.js` reads the checked-in D3 v7.9.0 source and embeds it directly, so `report.html` works from `file://` without a network or runtime dependency. Every chart has an adjacent table or textual equivalent.

Top-to-bottom layout:

1. **Editorial hero**: observed skill lift, exact prompt, field mean, completion counts, and compact Engineering v1 method label.
2. **Configuration ranking**: every scored model/reasoning/condition cell on the Engineering v1 0–100 rubric axis.
3. **Treatment lift**: clean-to-skill movement for each matched configuration.
4. **Answer inspector**: permanent clean-versus-treatment score spreads for any three configurations, plus a condition control for the complete answer, gates, dimensions, reasons, usage, and exact prompts shown below.
5. **Complete matrix**: visible complete, unavailable, and failed rows with exact trial evidence and human-readable latency.
6. **Scoring method**: the three fixed panel members, majority/median aggregation, disagreement, blinding, rubric, and limitations.

Visual rules:

- Color never carries verdict alone; pair it with labels/icons and accessible text.
- `INCOMPLETE`, `NO SIGNAL`, and judge disagreement must be visually louder than small score differences.
- Show sample counts and preserve every exact trial row beneath aggregates; do not add a separate chart when it does not improve a real comparison.
- Never rank across incompatible cells.
- Default to the bottom line, but never truncate away the full output in drill-down.
- The report must open correctly from `file://`; `--open` is convenience, not a server dependency.

The root `index.html` is a frontier-model benchmark first and a Vasir treatment study second. Its order is:

1. **Scope:** the currently measured capability, benchmark count, model-configuration count, scored-response count, and Engineering v1 method. It shows neither speculative future categories nor a fake overall.
2. **Model performance:** one compact absolute leaderboard contains every eligible model/reasoning/condition row, sorted by the selected exact condition and defaulting to the strongest current treatment. Each row names `Minimal baseline` or the exact skill/workflow treatment, shows its cardinal task score and absolute rank, and retains a quieter paired marker and score for the other condition. No condition toggle hides half the field.
3. **Treatment effect:** the exact aggregate W/T/L record leads, followed by each benchmark's baseline/treatment score pair, rubric-point uplift, tokens, latency, and cost when attributable. Relative preference ratings are absent from the current edition.
4. **Benchmark results:** compact condition scores, lift, record, completion, and exact report links. Long task text stays in the prompt report rather than dominating catalog navigation.
5. **Method and limits:** Engineering v1 formula, paired-uplift formula, three-judge aggregation, task/trial count, and compact scope copy.

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

The numeric score basis is row-local. It includes that row's generation basis and output hash, the task scorer/rubric hash and version, the three reviewer ids and evaluation hashes, the majority/median aggregation method, and the final total. Run-wide cohort, batch-plan, and prompt hashes remain useful operational metadata but do not participate in an incumbent row's score identity.

`vasir eval rescore <benchmark> [run-id]` reads saved outputs, applies the current panel to every matched pair, and writes a new run with `rescoredFromRunId` plus `generation.sourceRunId`; it never overwrites the source artifact. The rescore checkpoints after every completed judge/pair batch and reuses compatible completed batches on retry. `vasir eval extend` requires the source score edition to match the current one, preserves incumbent rows and row-local score hashes, and judges only new pairs. Both paths use the same scorer; the difference is whether the edition changed or the model field grew.

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
2. **One judge's scale becomes the final score.** Require all three judges, counterbalance answer order, aggregate gates by majority and dimensions by median, recompute the rubric score, and retain the panel spread.
3. **An isolated skill is presented as full Vasir.** Derive user-visible condition names from exact treatment metadata and reserve the full-workflow label for a C-013 execution trace.
4. **The benchmark measures style agreement.** Calibrate gates on known strong/overbuilt/underbuilt/counter-idiomatic answers, keep candidates anonymous, and retain judge reasons and spread.
5. **The report launders weak samples into confidence.** Default to raw trial spread and sample counts, make incomplete cells explicit, and let every aggregate drill into the exact rows.
6. **“Generic” becomes an evaluator framework.** Keep the stable core to condition snapshots, rows, pairs, score records, artifacts, and rendering; add a new task-kind adapter only when a real response or workspace task cannot fit those records.

## 9) Production publication

Read this section for `VASIR-BENCH__M1G` only.

M1H preserves the AWS state machine in this section but supersedes its checked-in `data.js`, fixture-cardinality, acceptance, and fixed-route details through §10.

### Declared target

```text
operator
  -> vasir benchmark publish
  -> exact accepted-site receipt + ten-file production allowlist
  -> bounded deterministic artifact + source-manifest SHA-256 release id
  -> AWS account assertion: profile faedark == 339713108333
  -> CloudFormation stack vasirbenchmark-production (us-east-1)
       -> private, encrypted, versioned S3 bucket
       -> CloudFront OAC + distribution + cache/security response policies
       -> viewer-request CloudFront Function with ActiveReleaseId parameter
       -> ACM DNS-validated certificate for vasirbenchmark.com
       -> Route 53 A + AAAA aliases in Z08966383N3FDP7DJ59WU
  -> acquire and conditionally renew one S3 publisher lease
  -> reconcile private staged/verified publication state with the stack pointer
  -> remove every physical version of safely expired releases; enforce 1 GiB
  -> upload and checksum releases/<release-id>/...
  -> update ActiveReleaseId once to activate the complete prefix
  -> invalidate /, /index.html, and /benchmark-report.html; await completion
  -> exact HTTPS/body/header/origin probe + Chrome route audit
  -> conditionally record verified state; release the lease
```

The public workload is identical cacheable reads of a bounded static artifact. S3 is the durable object authority and CloudFront is the shared public serving path. The viewer-request function rewrites only `/`, `/index.html`, and `/benchmark-report.html` to the corresponding object inside `releases/<ActiveReleaseId>/`. Built HTML refers to release-qualified assets, so a page and all of its dependencies always come from one release. Changing the function parameter does not evict an already-cached stable viewer key, so activation also creates and awaits one invalidation covering exactly those three HTML entrypoints. During convergence an edge may briefly serve the complete old page, but it cannot assemble old HTML with new assets or the reverse. There is no write path, per-user payload, query workload, runtime compute, queue, datastore, key-value store, or second origin to justify another plane.

Day one and the foreseeable production shape use the same components; traffic growth changes only CloudFront/S3 request counts. The initial CloudFront price class is the low-cost North America/Europe class; non-NA/EU latency remains unmeasured and is the explicit revisit condition. The hosted zone remains existing account infrastructure. The stack owns the certificate, bucket, OAC, distribution, function, policies, and alias records.

### Planned source map

```text
cli/benchmark.js                              benchmark command/subcommand boundary and human output
cli/benchmark-publish.js                      config, artifact build, lease, AWS state machine, activation, proof
cli/eval/benchmark-publication-projection.js  digest validation and selected-run projection
cli/docs-ref.js                               stable publish docs/troubleshooting anchors
cli/command-runner.js                         command discovery, global flags, and benchmark dispatch
benchmarks/public-results.json                explicit benchmark/run-path/SHA-256 development selection
site/vasirbenchmark.com/deployment.json       checked-in target, account assertion, stack, and public allowlist
site/vasirbenchmark.com/infra/production.yml  complete CloudFormation authority
site/vasirbenchmark.com/data.js               local inspection snapshot only; publication generates this module
site/vasirbenchmark.com/responses.js          report-only input/output/judge-rationale snapshot; publication generates this module
site/vasirbenchmark.com/capture.mjs            local/remote finite route and browser proof harness
site/vasirbenchmark.com/app.js                 accepted capability browser and D3 comparison views
site/vasirbenchmark.com/benchmark-report.js    derived public task report
test/benchmark-publish.test.js                 artifact, dry-run, identity, lease, rollback, and output contracts
docs/cli-reference.md                         command reference
docs/troubleshooting.md                       stable stage-error recovery
site/vasirbenchmark.com/README.md              short operator how-to and artifact boundary
```

`deployment.json` is the only target configuration. The common command accepts no account, bucket, distribution, domain, or region override; those would make production identity an easy-to-misroute call-site choice. `--repo-root` changes only which repository is inspected. The AWS CLI is retained instead of an SDK dependency because it is already the authorized credential/profile boundary and CloudFormation owns resource convergence.

### Accepted source and artifact contract

The production artifact contains eight checked-in presentation files—`index.html`, `style.css`, `assets/d3.v7.min.js`, `app.js`, `benchmark-report.html`, `benchmark-report.css`, `benchmark-report.js`, and `assets/kanit-latin-900-normal.woff2`—plus generated `data.js` and report-only `responses.js`. `template-lock.json` is the presentation acceptance receipt, not a deploy input or evidence-eligibility decision. The user's explicit request to use D3 makes its vendored runtime part of the public artifact contract. The receipt may be renewed only after the current source, harness, and canonical captures pass and the user accepts them. Publication has no `--force` or acceptance bypass: later presentation, harness, or capture drift returns `BENCHMARK_PUBLISH_ACCEPTANCE_REQUIRED`; generated evidence is validated through the projection and source-to-mark contracts instead of being hand-blessed in the receipt.

The builder rejects missing, symlinked, or non-regular allowlisted paths; reads no non-allowlisted content into the public artifact; canonicalizes the sorted `{path, bytes, sha256}` source manifest; and uses its SHA-256 as the release identifier. It copies into a fresh temporary directory and deterministically rewrites HTML dependency URLs and generated report/navigation URLs so asset dependencies point to `/releases/<release-id>/...` while the public homepage and report entrypoints stay `/` and `/benchmark-report.html#<report-id>`. The temporary directory is removed on every exit. It never traverses `.agents`, screenshots, captures, docs, or the repository generally.

Limits are binding and locally checked before AWS mutation: exactly ten files, at most 2 MiB per file, at most 5 MiB raw total, and at most 250 KiB gzip-compressed for the landing document plus its first-load CSS/JS/data/font dependencies. The report-only response bundle remains outside that landing set. The deployed manifest records each transformed public path, media type, cache class, bytes, and SHA-256. HTML uses `public, max-age=0, s-maxage=31536000, must-revalidate`; activation explicitly invalidates its three stable viewer paths. Release-qualified CSS, JS, data, and font objects use `public, max-age=31536000, immutable`. The CloudFront cache policy has `MinTTL=0`, `DefaultTTL=0`, and `MaxTTL=31536000`, honors those origin headers, enables gzip/Brotli, and excludes cookies, headers, and query strings from the cache key.

Build validation rejects any local or relative target outside the finite artifact/route graph. The current generated manifest contains Combined and Engineering across Leaderboard, Benchmark tests, and Efficiency, plus the three selected Backend Architecture reports. The full accepted D3 comparison interface remains present even though only Engineering is measured: the projection removes unsupported families, tests, and resource axes, not the leaderboard, ledger, Efficiency view, sidebar, synchronized guide, or report hierarchy. Public reports use the compact `Engineering v1 · 3 tasks × 1 trial · 3 judges` method label. Raw run artifacts, raw judge prompts/completions, reviewer ids, receipts, treatment content, private paths, and holdouts remain local and unpublished; only the source-exact allowlisted response and bounded rationale projection crosses the report boundary.

### AWS publication state machine

The command first performs read-only identity, hosted-zone, tool, receipt, artifact, and stack-state checks. It accepts an absent stack, `CREATE_COMPLETE`, `UPDATE_COMPLETE`, and `UPDATE_ROLLBACK_COMPLETE`. It waits on an in-progress state only within the stage ceiling, then re-reads truth. A first-create `ROLLBACK_COMPLETE` with no verified release is deleted and recreated by the same command; `UPDATE_ROLLBACK_FAILED`, `ROLLBACK_FAILED`, `DELETE_FAILED`, or an unknown terminal state returns `BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED` without speculative repair. Initial infrastructure convergence is bounded to 60 minutes; later convergence and activation are each bounded to 30 minutes.

An absent stack is first created with `ActiveReleaseId=bootstrap`. After a usable bucket exists, `_deploy/control/publish-lock.json` is acquired with a conditional `If-None-Match: *` put. The lock carries a random owner id, acquisition time, and 120-minute expiry. A fresh foreign lock returns `BENCHMARK_PUBLISH_BUSY`; an expired lock may be replaced only with its observed ETag. Conditional renewal replaces that exact ETag and yields the next owner ETag. Conditional release deletes only the current owner ETag. The lease-held state machine has a 75-minute wall-clock ceiling and checks token, ETag, owner, and expiry immediately before every AWS mutation. It renews with CAS before cleanup, activation, and rollback. On failed renewal, expired ownership, a foreign token, or the 75-minute ceiling, the process performs no further mutation—including rollback or cleanup—and reports the observed release as `indeterminate` when activation may already have occurred.

`_deploy/control/publication-state.json` is the last-verified authority. It is updated with `If-Match`/`If-None-Match` CAS and contains `status`, `candidateReleaseId`, `previousActiveReleaseId`, `lastVerifiedReleaseId`, `previousVerifiedReleaseId`, timestamps, and the current publisher owner. Before activation the command writes `status=staged` with the observed stack pointer and last verified pointer. After terminal public proof it writes `status=verified`, promotes the candidate to `lastVerifiedReleaseId`, and preserves the prior verified identifier. A rerun reconciles this record with the stack before staging new work:

- verified record + matching stack pointer: continue normally;
- staged record + stack on the candidate: verify it, then finalize it or conditionally restore `lastVerifiedReleaseId`;
- staged record + stack on `previousActiveReleaseId`: activation never became observed, so restore the prior verified control record;
- missing record + `bootstrap`: first publication;
- any other mismatch: return `BENCHMARK_PUBLISH_ACTIVATION_FAILED` with `rollback.status=indeterminate` and perform no speculative mutation.

The command then uploads any missing `releases/<release-id>/...` objects with conditional creates and the declared cache/content/checksum metadata, verifies S3 checksum and length for every staged object, and writes its non-public manifest under `_deploy/manifests/`. It renews and proves lease ownership, writes the staged control record, and updates the same stack once with the new `ActiveReleaseId`. Regardless of the deploy exit, it waits for a terminal CloudFormation state, rereads the stack parameter, waits until `cloudfront describe-function --stage LIVE` exposes the expected published function, then creates and awaits a CloudFront invalidation for the three stable HTML paths. A failed update or invalidation does not assume which pointer is serving.

If public verification fails, rollback is allowed only after CAS lease renewal and only when the reread active pointer still equals this command's candidate. The command then performs one bounded update to `lastVerifiedReleaseId`, waits for terminal stack and `LIVE` function state, rereads the restored pointer, and verifies the restored public release. Any missing prior verified release, unexpected pointer, lease loss, timeout, or restoration failure returns an explicit `indeterminate` rollback status. A first release has no prior public value and therefore remains `indeterminate` until a rerun verifies or replaces it.

Before staging, a lease-renewed cleanup may delete only release prefixes that are neither the observed stack active release, the last verified release, nor the previous verified release and whose newest physical version is older than 30 days. It deletes every object version and delete marker for eligible `releases/<id>/` keys plus the matching private manifest; an ordinary unversioned delete does not count as cleanup. It then lists all remaining bucket versions, including `_deploy`, and rejects the candidate when projected physical bytes exceed 1 GiB. The stack applies a seven-day noncurrent-version and expired-delete-marker lifecycle only to `_deploy/control/`; release retention is command-owned so a long-lived active release can never age out. This bounds physical recovery storage rather than merely hiding old versions behind delete markers.

The bucket policy grants the CloudFront service principal OAC-signed `s3:GetObject` only on `arn:...:bucket/releases/*` and binds that grant to the one distribution ARN. It grants no CloudFront read on `_deploy/*`; the terminal live probe requires a known `/_deploy/control/publication-state.json` request to return access denied.

### CLI surface and result contract

This is `NEW_PUBLIC_SURFACE` with a `FULL` contract and source-repository operator stability. The sole mutating command is:

```text
vasir benchmark publish [--dry-run] [--json] [--repo-root <path>]
```

The common path has an explicit mutating verb and accepts no domain, profile, account, region, bucket, distribution, stack, release, or force override. `deployment.json` is the fixed production identity. `--repo-root` changes only which repository is inspected. The AWS CLI is retained instead of an SDK dependency because it is already the authorized credential/profile boundary and CloudFormation owns resource convergence.

Human mode names each completed stage with concise, non-animated output and ends with the public URL, release identifier, stack, and active release. `NO_COLOR` remains honored. `--json` suppresses progress and writes exactly one JSON object. `--dry-run` performs the same local build, target-closure, tool, receipt, and read-only identity checks, but never deploys CloudFormation, writes or deletes S3 objects, activates a function, or changes DNS. Its ordered `actions` say what the real command would do.

Success and dry-run use schema version 1:

```json
{
  "command": "benchmark",
  "subcommand": "publish",
  "schemaVersion": 1,
  "status": "success",
  "dryRun": false,
  "target": {
    "url": "https://vasirbenchmark.com",
    "domain": "vasirbenchmark.com",
    "profile": "faedark",
    "accountId": "339713108333",
    "region": "us-east-1",
    "stackName": "vasirbenchmark-production"
  },
  "artifact": {
    "releaseId": "<64 lowercase hex>",
    "fileCount": 9,
    "totalBytes": 0,
    "compressedLandingBytes": 0,
    "files": [{ "path": "index.html", "bytes": 0, "sha256": "<hex>" }],
    "projection": {
      "developmentResultSetCount": 3,
      "eligibleResultSetCount": 0,
      "benchmarkDefinitionCount": 3,
      "categoryCount": 1,
      "conditionCount": 2,
      "settingCount": 30,
      "resultEntryCount": 60,
      "responseCount": 180
    },
    "routes": {
      "entrypoints": ["/", "/index.html", "/benchmark-report.html"],
      "familyFragments": ["/#capabilities/overall", "/#capabilities/engineering"],
      "viewFragments": ["/#capabilities/overall/benchmarks", "/#capabilities/overall/efficiency", "/#capabilities/engineering/benchmarks", "/#capabilities/engineering/efficiency"],
      "reportFragments": ["/benchmark-report.html#hyper-scale-chat", "/benchmark-report.html#personalized-home-feed", "/benchmark-report.html#device-telemetry"]
    }
  },
  "deployment": {
    "previousVerifiedReleaseId": null,
    "activeReleaseId": "<release-id>",
    "bucketName": "<name>",
    "distributionId": "<id>",
    "functionName": "<name>",
    "rollback": { "status": "not-needed", "releaseId": null }
  },
  "verification": {
    "status": "passed",
    "verifiedFiles": 9,
    "verifiedReportRoutes": 3,
    "verifiedCapabilityRoutes": 6,
    "originPrivate": true
  },
  "actions": [
    { "id": "validate-acceptance", "stage": "acceptance", "status": "completed", "mutatesAws": false },
    { "id": "build-artifact", "stage": "artifact", "status": "completed", "mutatesAws": false },
    { "id": "assert-identity", "stage": "identity", "status": "completed", "mutatesAws": false },
    { "id": "converge-infrastructure", "stage": "infrastructure", "status": "completed", "mutatesAws": true },
    { "id": "acquire-lease", "stage": "lease", "status": "completed", "mutatesAws": true },
    { "id": "cleanup-releases", "stage": "cleanup", "status": "completed", "mutatesAws": true },
    { "id": "stage-release", "stage": "upload", "status": "completed", "mutatesAws": true },
    { "id": "activate-release", "stage": "activation", "status": "completed", "mutatesAws": true },
    { "id": "verify-publication", "stage": "verification", "status": "completed", "mutatesAws": false },
    { "id": "release-lease", "stage": "lease", "status": "completed", "mutatesAws": true }
  ]
}
```

`artifact.routes.entrypoints` is exactly the three stable HTML resources. `familyFragments` holds each scope's default Leaderboard route, `viewFragments` holds its Benchmark tests and Efficiency peers, and `reportFragments` comes from the selected benchmark definitions. The current projection yields two family fragments, four view fragments, and three report fragments. `actions[]` always uses the shape `{id, stage, status, mutatesAws}`. `id` is one of the ten identifiers shown above; `stage` is `acceptance | artifact | identity | infrastructure | lease | upload | activation | verification | cleanup`; and `status` is `completed | planned | skipped`. Array and route order are deterministic.

Dry-run keeps the same keys, sets `dryRun=true`, uses `null` for unknown AWS output identifiers, and sets `verification.status="planned"`. Local/read-only actions that actually ran are `completed`; every mutating action is `planned` and no mutating AWS argv is invoked. `deployment.activeReleaseId` is the currently observed stack value or `null` when no stack exists; it never reports `artifact.releaseId` as active during dry-run. Human and JSON output are projections of the same result object, and normalization tests assert that both expose the same target, artifact, action, deployment, and verification facts.

Errors use the shared `{code, message, context, suggestion, docsRef}` contract and exit nonzero. Stable publication codes are `BENCHMARK_PUBLISH_SUBCOMMAND_REQUIRED`, `BENCHMARK_PUBLISH_CONFIG_INVALID`, `BENCHMARK_PUBLISH_PROJECTION_INVALID`, `BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE`, `BENCHMARK_PUBLISH_ACCEPTANCE_REQUIRED`, `BENCHMARK_PUBLISH_TOOL_MISSING`, `BENCHMARK_PUBLISH_ACCOUNT_MISMATCH`, `BENCHMARK_PUBLISH_ARTIFACT_INVALID`, `BENCHMARK_PUBLISH_STORAGE_BUDGET_EXCEEDED`, `BENCHMARK_PUBLISH_BUSY`, `BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED`, `BENCHMARK_PUBLISH_UPLOAD_FAILED`, `BENCHMARK_PUBLISH_ACTIVATION_FAILED`, `BENCHMARK_PUBLISH_VERIFICATION_FAILED`, and `BENCHMARK_PUBLISH_ROLLBACK_FAILED`. Context always includes `stage`, `releaseId` when known, `stackName`, `safeRetry`, and `rollback.status`; identity failures include only the expected/actual account ids, never credential material.

The complete regenerate-and-publish path is deliberately one command:

```bash
vasir benchmark publish
```

The command rebuilds generated `data.js` and report-only `responses.js`, assembles the release, publishes it, and succeeds only after the exact public bytes and browser journey pass; it then prints `https://vasirbenchmark.com` and the active release id. `--dry-run` is the optional read-only inspection path, not a required precursor. Help, CLI reference, troubleshooting anchors, README operator how-to, package smoke, and focused integration tests must all expose this same spelling and contract.

### Terminal verification

HTTP convergence verification has a separate two-minute ceiling and at most eight bounded attempts with five-second connect and fifteen-second total request timeouts. It verifies HTTP-to-HTTPS redirect, certificate-valid HTTPS, the expected VasirBench marker, the declared security headers, and exact decompressed SHA-256 for every deployed file through its release-qualified public URL. It confirms `/` and `/benchmark-report.html` serve the active release, checks anonymous direct S3 access returns access denied, and checks `/_deploy/control/publication-state.json` is denied through CloudFront.

The Chrome harness accepts either its local `file:` source or the production HTTPS base. The live audit has its own five-minute ceiling and opens every family/view/report route in the candidate's generated route manifest; for the current projection that means Combined and Engineering across three views plus three reports. It asserts the expected selected scope/report title, navigation target closure, zero page/runtime errors, and no horizontal overflow at the canonical desktop and mobile viewports. It also checks the paired D3 shared scale, synchronized comparison guide, all 30 report rows, and exact compact edition label. Fragment behavior is browser-owned because fragments are not sent in HTTP requests. Publication succeeds only after this browser check and exact-byte HTTP verification both pass.

## 10) Real-data-only public projection

Read this section for `VASIR-BENCH__M1H`.

### Authority and flow

```text
benchmarks/capability-taxonomy.json
  + benchmarks/<mapped-id>/benchmark.json
  + benchmarks/public-results.json
  -> deterministic public projector
       -> load each exact selected run.json and verify its SHA-256
       -> validate the complete matched development matrix and identities
       -> derive allowlisted development marks and explicit blockers
  -> generated data.js + report-only responses.js in the temporary release directory
  -> ten-member immutable artifact
  -> existing M1G AWS state machine
```

The checked-in taxonomy and benchmark definitions define the program. `benchmarks/public-results.json` selects one immutable scored run per task and pins its SHA-256; it never contains hand-authored result values. `run.json` remains authoritative for every selected score, resource observation, exact generation message, and model output.

Engineering v1 reuses the 180 saved model responses from the three completed 30-setting generation cohorts, but it does not reuse their old scores. Each full saved cohort is rescored with the fixed three-judge matched-pair method into a new immutable linked artifact, then the selection manifest pins those three new artifacts together. This keeps generation cost separate from scorer changes and gives every row the same score edition.

Historical M1I selection, preserved only for provenance:

| Benchmark | Historical immutable run | SHA-256 |
| --- | --- | --- |
| `hyper-scale-chat` | `2026-09-01T23-13-14Z__extend__9db1c50db2c7` | `30366188cf6efc997352e0d1265fd6fc7c0b50538b8fccd94dcf6631b9090141` |
| `personalized-home-feed` | `2026-09-01T23-13-14Z__extend__6868e92c033a` | `409f8a9f947aef1d4e9c13c7cc73493831a320e3a625ba81e2169f33e1d3fd9a` |
| `device-telemetry` | `2026-09-01T23-13-14Z__extend__b9faa8878808` | `8987f7c4ce81da57826d0b967dcf46bcc007706e683cc69b6d97ac33cc74f758` |

Those historical artifacts used the superseded two-judge-plus-synthesizer scorer and are not mixed with Engineering v1.

### Projection shape

The projector emits one Engineering category and one Backend Architecture track containing the three definitions and selected results. Their current common matrix is 30 exact provider/model/reasoning settings × two exact conditions—`Minimal baseline` and `Architecture skill`—for 60 condition entries and 180 benchmark response cells. The historical M1H projection was 27 settings, 54 condition entries, and 162 response cells; those counts remain historical and are not the current publication basis. The isolated treatment came from `skill:plan__question-spec-architecture`; it is never labeled `With Vasir` or `Full Vasir`.

Every displayed quality value is derived from the selected Engineering v1 rows. Task scores remain on their task rubrics. The category leaderboard takes the equal mean of the three 0–100 task scores for each condition. Matched outcomes, rubric-point uplift, latency, input/output/total tokens, and secondary ranks come from the same rows. Cost remains unavailable and the UI omits the cost axis rather than estimating it.

`data.js` carries the definitions, results, and Engineering v1 score method; the UI renders `Engineering v1 · 3 tasks × 1 trial · 3 judges`. It never contains a local run path, raw response, judge record, treatment body, private holdout, credential, or signed request material. The separate report-only response bundle exposes the exact selected generation messages and outputs plus the bounded per-judge explanation projection described in §13. The manifest records a projection-basis SHA-256 over the taxonomy, definitions, and selected-run digests so any source change produces different generated bytes and release identity.

The generated route manifest is the one cardinality authority. It retains the accepted Combined and Engineering scopes, each with Leaderboard, Benchmark tests, and Efficiency, plus exactly the three mapped report fragments. Combined is an honest one-category projection today, not an invented cross-family aggregate. Preflight capture, publication output, live Chrome verification, and tests consume the same manifest.

### Accepted analytical interface invariant

Data cleanup may remove an unsupported mark, axis, family, test, or condition. It may not delete the analytical product around the data. The full-bleed square editorial shell, persistent capability sidebar, paired D3 leaderboard, common 0–100 scale, saturated Engineering encoding, synchronized vertical guide, Benchmark tests ledger, latency/token Efficiency view, and report hierarchy are accepted product surfaces. Replacing them with a sparse definitions page was a regression because it removed the user's ability to compare the real model field. Restoration of these surfaces is an M1H invariant and a browser-proof requirement.

### Acceptance and artifact boundary

The presentation acceptance receipt binds eight checked-in public shell/runtime/font files plus the local QA harness and canonical state captures. It does not lock `data.js` or `responses.js`; those modules are generated directly into the temporary release artifact before release-id calculation. Any checked-in inspection snapshots are local conveniences only and are never trusted by publication.

`vasir benchmark publish` is the one regenerate-and-ship command: it projects `data.js` and `responses.js`, builds the release, publishes it through `faedark`, and verifies the resulting public journey. `--dry-run` projects the same bytes into a temporary directory, derives the same release id and routes, and runs local schema, artifact, and evidence-boundary checks without writing repository or AWS state. Browser proof runs against the activated candidate during a real publication. A data change alone does not invalidate accepted presentation source; renderer, style, report shell, D3, or harness drift still does.

### Failure semantics

- malformed taxonomy, definition, or selection manifest: `BENCHMARK_PUBLISH_PROJECTION_INVALID` before AWS;
- missing selected run or SHA-256 mismatch: projection failure before AWS with the selected benchmark identified;
- benchmark, configuration, condition, or matrix identity mismatch: projection or evidence-ineligible failure before AWS;
- any numeric field without an exact selected source row and row-local score identity: projection failure before AWS;
- missing cost attribution: typed unavailability and an omitted cost control, never zero or an estimate;
- incomplete author calibration: retain the metadata without adding another visible status banner;
- browser/manifest disagreement, private path, unselected or identity-mismatched response content, judge content, unsupported future family, or deleted accepted analytical view: verification failure before activation.

No runtime API, database, queue, worker, second origin, or generated-data commit step is part of this flow.

## 11) Incremental model extension

Read the current flow when adding a model to Engineering v1. The Fable-specific subsection records the already completed M1I generation contract.

### Fixed flow and authority

```text
selected immutable Engineering v1 source run
  + exact new model selectors
  -> validate benchmark edition, generation identity, harness, trials, cases,
     conditions, treatment snapshot, and source-row completeness
  -> generate only each new configuration × 2 existing conditions
  -> checkpoint one new immutable extended artifact
  -> judge only each new matched pair with all three fixed judges
  -> validate canonical model receipts, unique keys, complete new scores, and row-local score bases
  -> digest-pin all three benchmark artifacts together
  -> existing deterministic projector and publisher
```

`run.json` remains authoritative. The source artifact is read-only and named by id; the extension artifact records that id plus the source row count and exact added configuration ids. Incumbent outputs, usage, latency, runtime receipts, scores, and row-local score hashes are copied without rewriting. For one new configuration, the extension adds six responses across the three tasks and makes nine judge calls: three matched pairs × three judges. Only ranks are recomputed over the enlarged field.

Historical note: M1I first added the three Fable 5.1 configurations through appended-row judging under the superseded two-judge-plus-synthesizer scorer. Those immutable artifacts preserve what happened, but Engineering v1 rescored all saved responses once so every selected row now shares the same current scorer.

### Exact Fable 5.1 contract

The immutable Claude model id is `claude-fable-5-1`; historical `claude:fable` rows remain Fable 5 and are never relabeled. Native xhigh and max pass through as native effort settings. Their aggregate `modelUsage` must contain Fable 5.1, contain no unnamed entry, and remain within `{claude-fable-5-1, claude-haiku-4-5}`; when target output-token attribution is present it must be positive. Haiku is optional ancillary query-pipeline traffic, not evidence of the main model or a Workflow worker.

The visible `ultracode` configuration is a versioned v2 execution mode whose effective effort is xhigh and whose Claude invocation exposes only the Workflow tool. The v2 prompt requires exactly one single-phase Workflow with exactly one worker and no workflow-side critique, repair, or synthesis agents. Generation finishes every ordinary row first and then runs Ultracode rows serially. The invocation sets `workflowSizeGuideline` to `small`; its background Workflow wait ceiling is 15 minutes inside the benchmark harness's 20-minute process deadline.

Claude Code must be 2.1.257 or newer because the worker-model controls and progress receipt are runtime contracts. Exact environment pins force the sole Workflow worker to `claude-fable-5-1`. The sanitized receipt must prove one top-level Workflow tool use, one correlated local-workflow start, one positive-token completed notification, and exactly one local, uncached, completed worker whose model is Fable 5.1. An unsupported version, extra or unresolved Workflow, missing or extra worker, missing model, fallback, remote/cached/error/incomplete worker, canonical-model-policy failure, deadline failure, permission denial, or empty answer fails the row closed.

Public label: `Claude Fable 5.1 · Ultracode`, with `xhigh + Workflow` as the mode description. Methodology caveat: the sole Workflow worker is forced to use Claude Fable 5.1. Claude Code may make ancillary Haiku 4.5 query-pipeline calls; reported runtime and cost include them. Do not describe this configuration as “Fable-only” or as a native effort tier.

### Compatibility and failure semantics

- The current benchmark generation hash, harness version, trial count, case ids, condition ids/hashes, treatment id/hash, neutral harness text, and every reused row's basis hash must match the extension plan.
- Added configuration ids and generated row keys must be disjoint from the source. Any duplicate or missing cell fails before judging.
- A generation failure still writes the extension checkpoint with every successful row and explicit failure. It cannot replace the public selection; rerunning or a dedicated recovery extension owns completion.
- Under the same edition, judging sees only the new matched pairs; preserved incumbent scores retain their row-local bases. A judging interruption preserves the response checkpoint and completed judge/pair batches so extension resume does not regenerate answers or repeat compatible judge calls.
- Public selection changes only after all three benchmark extensions are complete, digest-verified, and project successfully as one common model field. Historical release `131012bfa4e1fcd5db9b2688b67798b72239ce236f78678202d91f8d76fb2aef` was the M1I publication before Engineering v1 rescoring. The projection fails closed unless canonical Claude model ids map exactly to `Claude Fable 5`, `Claude Fable 5.1`, or `Claude Opus 5` in both settings and condition entries; all public charts, reports, and selectors consume those same labels.

No fresh regeneration or rescoring of incumbents, model alias mutation, new chart type, or runtime service belongs in an extension under the same Engineering v1 contract.

## 12) Engineering v2 score edition

Read this section for `VASIR-BENCH__M1M`.

### Fixed score contract

The current public edition is `backend-architecture-panel-consensus-v2`, displayed as **Engineering v2**. Its three mapped tasks each expose a task-owned anchored score from 0 through 100 and receive equal weight. Every matched pair is judged independently by GPT-6 Astra xhigh and Claude Fable 5.1 max. A gate passes only when both judges pass it; one failure applies that gate’s cap. Dimension ratings use the arithmetic mean, retaining half-step ratings, and the scorer recomputes the weighted task score before applying the lowest failed-gate cap. There is no synthesizer.

For every exact configuration and condition:

```text
absolute score = mean(chat task score, feed task score, telemetry task score)
paired uplift = architecture-skill absolute score - minimal-baseline absolute score
```

Each task score is rounded to one decimal by the fixed rubric scorer; condition means and paired uplift use those task scores and are rounded to one decimal for public display. Rank is derived from the unrounded score and configuration identity; it is not part of score identity. Candidate count, surrounding candidate order, and the presence of a new model are absent from the formula. Each row's score hash binds only its generated response, scoring contract, and two judge evaluations. A synthetic-candidate invariance test at the catalog aggregation boundary confirms that adding a candidate leaves every incumbent score and paired uplift unchanged.

The edition publishes `taskCount: 3`, `trialsPerTask: 1`, task weights, exact benchmark ids, judge identities, batch unit, aggregation method, and `uncertainty.status: not-estimated`. No confidence interval is inferred from three one-trial tasks; per-response judge spread and calibration status remain metadata. The public label is `Engineering v2 · 3 tasks × 1 trial · 2 judges`.

### Migration path

```text
selected immutable saved responses
  -> rescore each matched pair with the fixed two-judge panel
  -> checkpoint every judge/pair batch for resume
  -> bind each aggregate to row-local judge evaluation hashes
  -> aggregate each configuration/condition on fixed task weights
  -> derive paired rubric-point uplift and secondary rank
  -> deterministic public projection
  -> existing D3 leaderboard / Engineering / benchmarks / efficiency / reports
  -> existing immutable publication state machine
```

`cli/eval/benchmark-judge.js` owns the matched-pair panel aggregate. `cli/eval/benchmark-basis.js` owns row-local score identity. `cli/eval/benchmark-catalog.js` owns the equal-task mean. `benchmarks/capability-taxonomy.json` declares the edition method and weights. `cli/eval/benchmark-publication-projection.js` consumes those fixed fields and emits the score method. Public presentation code says `rubric score`, `task score`, or `uplift`; `/100` never labels rank or a relative field statistic.

The Engineering v2 migration reuses saved model responses but writes new immutable score artifacts, judge records, row-local score hashes, and public-result digests. A scorer or judge change can rescore stored outputs into another linked edition. A task, prompt, output contract, allowed-tools, generation runtime, or treatment change requires fresh generation. Rubric-only changes may reuse identical responses under a separately identified scoring edition. Neither case overwrites an earlier artifact.

### Presentation truth

- Combined and Engineering use the same fixed 0–100 task-score scale because Engineering is the only measured family today.
- The Architecture skill score is the primary row number, Minimal baseline is the comparison, uplift is secondary in rubric points, and rank is ordinal context.
- Every leaderboard row exposes its three contributing task scores through the existing benchmark/report journey.
- Efficiency plots use absolute task score on the quality axis and exact latency/token units on the resource axis.
- Method copy stays compact: `Engineering v2 · 3 tasks × 1 trial · 2 judges`.
- The full-bleed square editorial shell, D3 geometry, synchronized guide, saturated Engineering color, model-version identities, responsive behavior, and accessible nonvisual equivalents remain intact.

### Failure semantics

- a missing judge seat, task score, task weight, incompatible score edition, or incomplete configuration-condition cell yields no aggregate for that configuration rather than a partial score;
- a projection whose absolute score differs after adding an unrelated candidate fails the invariant test;
- insufficient independent tasks/trials yields explicit unavailable uncertainty, never a zero-width or invented interval;
- publication retains the previous release unless the exact candidate passes full tests, captures, HTTPS, private-origin, and live-browser verification.

The preceding Engineering v1 three-judge majority/median artifacts remain unchanged in local history. The initial v2 migration preserves all 216 generation records and replaces only their scores with 432 source-joined judgments. Incomplete v2 checkpoints are recovered with `vasir eval rescore <benchmark> <checkpoint-run-id>`; compatible completed judge/pair batches are reused.

## 13) Public model evidence inspection

Read this section for `VASIR-BENCH__M1K` and `VASIR-BENCH__M1L`.

The same three digest-pinned Engineering v1 `run.json` artifacts that produce public scores also produce one deterministic, report-only `responses.js` release member. Its public object contains a versioned kind, a content-addressed table of ordered `{role, content}` generation-message sets, and exactly one response record for every benchmark, configuration, trial, and public condition. A response record contains its explicit identity, message-set id, verbatim `outputText`, and exactly three canonical public judgment records. Each judgment carries only configured judge identity, total, uncapped total, gate ceiling, failed gate ids, and the saved answer-specific rationale. Schema v2 contains 180 responses and 540 judgments.

`data.js` remains the score-and-presentation projection and remains the only generated data dependency of the landing page. `responses.js` is loaded by `benchmark-report.html` only. Both files receive immutable release-qualified URLs and participate in the release hash and byte verification, so a report can never combine one release's scores with another release's answers. The checked-in response file is a local inspection convenience and is regenerated from the selected artifacts during every publish.

Each report setting is a native disclosure row. Opening it shows Minimal baseline and Architecture skill together with complete output text immediately. Each condition's exact ordered input messages live in a nested native disclosure that starts collapsed and opens independently. A second collapsed **Why this score** disclosure sits between input and output. Opening it shows three sharp-edged review rows with canonical model/version/reasoning labels, individual score mechanics, failed gates, and saved rationale. Wide screens use two condition columns; narrow screens stack them. Multiple settings may remain open for comparison. Content is escaped and wrapped without truncation, copy actions live inside disclosed prompt/output bodies, and the existing aggregate score visualization remains visible and visually primary. The landing page, ranking math, and scoring artifacts do not change.

Projection tests resolve every message-set id and compare all 180 generation records byte-for-byte with their selected source rows. They also join all 540 evaluations through reviewer/evaluation hashes, require canonical panel order, and compare every public score, gate mechanic, and sanitized rationale to source. The projection strips only the explicitly enumerated nonsemantic `U+0000`, `U+200B`, `U+200C`, and `U+2063` characters observed in four notes; all other rationale text is preserved. Judge prompts/completions, reviewer ids, evaluation hashes, session ids, receipts, usage, cost, and paths are excluded by an exact-key allowlist. Public copy calls each note a saved answer-specific rationale bounded to 600 characters—not hidden deliberation or a synthesized verdict.

The browser audit opens the first, middle, and last setting on every report route, checks both conditions against the loaded public bundle, opens the rationale without opening the prompt, validates exactly three reviews and their full public fields, and rejects horizontal overflow at desktop and mobile widths. Publication remains blocked unless the response bundle is an exact canonical artifact member and the complete report journey passes live.
