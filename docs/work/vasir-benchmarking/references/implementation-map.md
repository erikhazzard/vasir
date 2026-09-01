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

## 9) Production publication

Read this section for `VASIR-BENCH__M1G` only.

### Declared target

```text
operator
  -> vasir benchmark publish
  -> exact accepted-site receipt + nine-file production allowlist
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
  -> exact HTTPS/body/header/origin probe + Chrome route audit
  -> conditionally record verified state; release the lease
```

The public workload is identical cacheable reads of a bounded static artifact. S3 is the durable object authority and CloudFront is the shared public serving path. The viewer-request function rewrites only `/`, `/index.html`, and `/benchmark-report.html` to the corresponding object inside `releases/<ActiveReleaseId>/` before cache lookup. Built HTML refers to release-qualified assets, so a page and all of its dependencies always come from one release. Changing the single function parameter creates a new cache key and activates the whole site without root-key overwrites or invalidation. The function publication is request-atomic and globally convergent, not globally instantaneous: an edge may briefly use either release pointer, but either pointer yields a complete coherent release. There is no write path, per-user payload, query workload, runtime compute, queue, datastore, key-value store, or second origin to justify another plane.

Day one and the foreseeable production shape use the same components; traffic growth changes only CloudFront/S3 request counts. The initial CloudFront price class is the low-cost North America/Europe class; non-NA/EU latency remains unmeasured and is the explicit revisit condition. The hosted zone remains existing account infrastructure. The stack owns the certificate, bucket, OAC, distribution, function, policies, and alias records.

### Planned source map

```text
cli/benchmark.js                              benchmark command/subcommand boundary and human output
cli/benchmark-publish.js                      config, artifact build, lease, AWS state machine, activation, proof
cli/docs-ref.js                               stable publish docs/troubleshooting anchors
cli/command-runner.js                         command discovery, global flags, and benchmark dispatch
site/vasirbenchmark.com/deployment.json       checked-in target, account assertion, stack, and public allowlist
site/vasirbenchmark.com/infra/production.yml  complete CloudFormation authority
site/vasirbenchmark.com/data.js               public-only evidence destinations; no ignored-workspace links
site/vasirbenchmark.com/capture.mjs            local/remote finite route and browser proof harness
site/vasirbenchmark.com/benchmark-report.js    honest local-evidence boundary in the public report
test/benchmark-publish.test.js                 artifact, dry-run, identity, lease, rollback, and output contracts
docs/cli-reference.md                         command reference
docs/troubleshooting.md                       stable stage-error recovery
site/vasirbenchmark.com/README.md              short operator how-to and artifact boundary
```

`deployment.json` is the only target configuration. The common command accepts no account, bucket, distribution, domain, or region override; those would make production identity an easy-to-misroute call-site choice. `--repo-root` changes only which repository is inspected. The AWS CLI is retained instead of an SDK dependency because it is already the authorized credential/profile boundary and CloudFormation owns resource convergence.

### Accepted source and artifact contract

The production allowlist contains only `index.html`, `style.css`, `assets/d3.v7.min.js`, `app.js`, `data.js`, `benchmark-report.html`, `benchmark-report.css`, `benchmark-report.js`, and `assets/kanit-latin-900-normal.woff2`. `template-lock.json` is the acceptance receipt, not a deploy input. The user's explicit request to use D3 makes its vendored runtime part of the public artifact contract. The receipt may be renewed only after the current source, harness, and ten canonical captures pass and the user accepts them. Publication has no `--force` or acceptance bypass: any later path, byte, or capture mismatch returns `BENCHMARK_PUBLISH_ACCEPTANCE_REQUIRED` and lists only the changed paths.

The builder rejects missing, symlinked, or non-regular allowlisted paths; reads no non-allowlisted content into the public artifact; canonicalizes the sorted `{path, bytes, sha256}` source manifest; and uses its SHA-256 as the release identifier. It copies into a fresh temporary directory and deterministically rewrites HTML dependency URLs and generated report/navigation URLs so asset dependencies point to `/releases/<release-id>/...` while the public homepage and report entrypoints stay `/` and `/benchmark-report.html#<report-id>`. The temporary directory is removed on every exit. It never traverses `.agents`, screenshots, captures, docs, or the repository generally.

Limits are binding and locally checked before AWS mutation: exactly nine files, at most 2 MiB per file, at most 5 MiB raw total, and at most 250 KiB gzip-compressed for the landing document plus its first-load CSS/JS/data/font dependencies. The deployed manifest records each transformed public path, media type, cache class, bytes, and SHA-256. HTML uses `public, max-age=0, s-maxage=31536000, must-revalidate`: browsers revalidate the stable visible URL, while CloudFront may retain the immutable release-qualified cache key. Release-qualified CSS, JS, data, and font objects use `public, max-age=31536000, immutable`. The CloudFront cache policy has `MinTTL=0`, `DefaultTTL=0`, and `MaxTTL=31536000`, honors those origin headers, enables gzip/Brotli, and excludes cookies, headers, and query strings from the cache key.

Build validation rejects any local or relative target outside the finite artifact/route graph. The report manifest consists of all 24 checked-in benchmark IDs; the capability manifest consists of Combined plus five job families across Leaderboard, Benchmark tests, and Efficiency. The three current development summaries keep their reviewed public report routes but state that raw response/judge artifacts remain local and unpublished; their ignored-workspace source links are removed rather than copied.

### AWS publication state machine

The command first performs read-only identity, hosted-zone, tool, receipt, artifact, and stack-state checks. It accepts an absent stack, `CREATE_COMPLETE`, `UPDATE_COMPLETE`, and `UPDATE_ROLLBACK_COMPLETE`. It waits on an in-progress state only within the stage ceiling, then re-reads truth. A first-create `ROLLBACK_COMPLETE` with no verified release is deleted and recreated by the same command; `UPDATE_ROLLBACK_FAILED`, `ROLLBACK_FAILED`, `DELETE_FAILED`, or an unknown terminal state returns `BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED` without speculative repair. Initial infrastructure convergence is bounded to 60 minutes; later convergence and activation are each bounded to 30 minutes.

An absent stack is first created with `ActiveReleaseId=bootstrap`. After a usable bucket exists, `_deploy/control/publish-lock.json` is acquired with a conditional `If-None-Match: *` put. The lock carries a random owner id, acquisition time, and 120-minute expiry. A fresh foreign lock returns `BENCHMARK_PUBLISH_BUSY`; an expired lock may be replaced only with its observed ETag. Conditional renewal replaces that exact ETag and yields the next owner ETag. Conditional release deletes only the current owner ETag. The lease-held state machine has a 75-minute wall-clock ceiling and checks token, ETag, owner, and expiry immediately before every AWS mutation. It renews with CAS before cleanup, activation, and rollback. On failed renewal, expired ownership, a foreign token, or the 75-minute ceiling, the process performs no further mutation—including rollback or cleanup—and reports the observed release as `indeterminate` when activation may already have occurred.

`_deploy/control/publication-state.json` is the last-verified authority. It is updated with `If-Match`/`If-None-Match` CAS and contains `status`, `candidateReleaseId`, `previousActiveReleaseId`, `lastVerifiedReleaseId`, `previousVerifiedReleaseId`, timestamps, and the current publisher owner. Before activation the command writes `status=staged` with the observed stack pointer and last verified pointer. After terminal public proof it writes `status=verified`, promotes the candidate to `lastVerifiedReleaseId`, and preserves the prior verified identifier. A rerun reconciles this record with the stack before staging new work:

- verified record + matching stack pointer: continue normally;
- staged record + stack on the candidate: verify it, then finalize it or conditionally restore `lastVerifiedReleaseId`;
- staged record + stack on `previousActiveReleaseId`: activation never became observed, so restore the prior verified control record;
- missing record + `bootstrap`: first publication;
- any other mismatch: return `BENCHMARK_PUBLISH_ACTIVATION_FAILED` with `rollback.status=indeterminate` and perform no speculative mutation.

The command then uploads any missing `releases/<release-id>/...` objects with conditional creates and the declared cache/content/checksum metadata, verifies S3 checksum and length for every staged object, and writes its non-public manifest under `_deploy/manifests/`. It renews and proves lease ownership, writes the staged control record, and updates the same stack once with the new `ActiveReleaseId`. Regardless of the deploy exit, it waits for a terminal CloudFormation state, rereads the stack parameter, and waits until `cloudfront describe-function --stage LIVE` exposes the expected published function. A failed update does not assume which pointer is serving.

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
    "routes": {
      "entrypoints": ["/", "/index.html", "/benchmark-report.html"],
      "capabilityFragments": ["/#capabilities/overall"],
      "reportFragments": ["/benchmark-report.html#hyper-scale-chat"]
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
    "verifiedReportRoutes": 24,
    "verifiedCapabilityRoutes": 18,
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

`artifact.routes.entrypoints` is exactly the three stable HTML resources, `capabilityFragments` is the deterministic 18-route matrix of six scopes × three views, and `reportFragments` contains all 24 report routes. `actions[]` always uses the shape `{id, stage, status, mutatesAws}`. `id` is one of the ten identifiers shown above; `stage` is `acceptance | artifact | identity | infrastructure | lease | upload | activation | verification | cleanup`; and `status` is `completed | planned | skipped`. Array and route order are deterministic.

Dry-run keeps the same keys, sets `dryRun=true`, uses `null` for unknown AWS output identifiers, and sets `verification.status="planned"`. Local/read-only actions that actually ran are `completed`; every mutating action is `planned` and no mutating AWS argv is invoked. `deployment.activeReleaseId` is the currently observed stack value or `null` when no stack exists; it never reports `artifact.releaseId` as active during dry-run. Human and JSON output are projections of the same result object, and normalization tests assert that both expose the same target, artifact, action, deployment, and verification facts.

Errors use the shared `{code, message, context, suggestion, docsRef}` contract and exit nonzero. Stable publication codes are `BENCHMARK_PUBLISH_SUBCOMMAND_REQUIRED`, `BENCHMARK_PUBLISH_CONFIG_INVALID`, `BENCHMARK_PUBLISH_ACCEPTANCE_REQUIRED`, `BENCHMARK_PUBLISH_TOOL_MISSING`, `BENCHMARK_PUBLISH_ACCOUNT_MISMATCH`, `BENCHMARK_PUBLISH_ARTIFACT_INVALID`, `BENCHMARK_PUBLISH_STORAGE_BUDGET_EXCEEDED`, `BENCHMARK_PUBLISH_BUSY`, `BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED`, `BENCHMARK_PUBLISH_UPLOAD_FAILED`, `BENCHMARK_PUBLISH_ACTIVATION_FAILED`, `BENCHMARK_PUBLISH_VERIFICATION_FAILED`, and `BENCHMARK_PUBLISH_ROLLBACK_FAILED`. Context always includes `stage`, `releaseId` when known, `stackName`, `safeRetry`, and `rollback.status`; identity failures include only the expected/actual account ids, never credential material.

The common quickstart is deliberately two lines:

```bash
vasir benchmark publish --dry-run
vasir benchmark publish
```

The second command succeeds only after the exact public bytes and browser journey pass, then prints `https://vasirbenchmark.com` and the active release id. Help, CLI reference, troubleshooting anchors, README operator how-to, package smoke, and focused integration tests must all expose this same spelling and contract.

### Terminal verification

HTTP convergence verification has a separate two-minute ceiling and at most eight bounded attempts with five-second connect and fifteen-second total request timeouts. It verifies HTTP-to-HTTPS redirect, certificate-valid HTTPS, the expected VasirBench marker, the declared security headers, and exact decompressed SHA-256 for every deployed file through its release-qualified public URL. It confirms `/` and `/benchmark-report.html` serve the active release, checks anonymous direct S3 access returns access denied, and checks `/_deploy/control/publication-state.json` is denied through CloudFront.

The existing Chrome harness accepts either its local `file:` source or the production HTTPS base. The live audit has its own five-minute ceiling and opens the Combined default, all six capability scopes in each of three view modes, and all 24 `benchmark-report.html#<id>` routes; it asserts the expected selected scope/report title, navigation target closure, zero page/runtime errors, and no horizontal overflow at the canonical desktop and mobile viewports. Fragment proof is browser-owned because fragments are not sent in HTTP requests. Publication succeeds only after this browser proof and the exact-byte HTTP proof both pass.
