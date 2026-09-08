# Writing score completion — 2026-09-08

Status: recovered checkpoint published and HTTP-verified; remaining benchmark execution is provider-quota-paused. This is not a claim that all scores are complete. No provider runner remains active.

## Authorized scope

Complete the four existing Writing benchmarks across the common 33 model/settings already published for Magic discovery and Core idea. Preserve every valid existing answer and review, the exact task texts, frozen skill bytes, original rubrics, and judge identities. Extend the smaller cohorts through explicitly declared completion editions, not by editing their original preregistrations. Do not generate new benchmark tasks or select favorable rerolls.

## Starting coverage

| Benchmark | Original settings | Valid answers | Completed paired review requests | Remaining work |
| --- | ---: | ---: | ---: | --- |
| Core idea | 33 | 790 / 792 | 473 / 792 | 315 Fable reviews on intact pairs; two generation slots have terminal provider policy blocks |
| Plot twists | 4 | 78 / 80 | 76 / 80 | Two operational required-read recoveries, plus 29 additional settings; 582 generations and 584 reviews |
| First discovery of magic | 33 | 198 / 198 | 396 / 396 | None; preserve unchanged |
| Dungeon Master adventure outline | 1 | 32 / 32 | 32 / 32 | 32 additional settings; 1,024 generations and 1,024 reviews |

A paired review request assesses both conditions. Magic uses four review seats; the other benchmarks use two. These request counts must not be mislabeled as individual answer-assessment counts. Dungeon Master retains its six-repeat primary headline and separate transfer cases.

## Preservation and non-retryable failures

- Core's two missing Matrix skill answers (Opus 5 xhigh and max) received explicit provider output-policy blocks. They are not operational retry candidates. The runner now has regression-tested terminal-policy recognition so `--retry-failed` cannot automatically retry them.
- Core's immutable pre-recovery run is SHA-256 `0f29483fa808cf70d7431ff6a257b73e6d055585bbceab91c7183ba1bdc433e5`. The authorized judge-only recovery uses the existing Claude authentication context, concurrency four, and reuses all 473 valid prior review batches.
- Plot twists' parent run remains SHA-256 `97d1172df61311ca493c53ef99d193d607652de9bc0827bba2d3d6ca3fb41399`. Its 78 valid answers and 76 valid review requests are imported unchanged. Both original mandatory-read failures stay archived; their old answers are never retrospectively declared verified.
- Dungeon Master's parent run remains SHA-256 `0a78c5dba07da35e01448fcf6e2ab3ed16b248156089ecbb97b7e37ccbd0b95a`. Its complete successful and failed execution history is retained, and the original Astra Ultra configuration is never rerun.

Provider quota or authentication failures stop new dispatches. Do not switch accounts, models, prompts, or judge panels to get around them. Preserve in-flight results and checkpoint ownership before pausing. A benign story request receiving a provider policy block remains an explicit unscored slot.

## Runner repairs and preflight

The shared runtime retains its original default transport. New completion editions explicitly opt into separately versioned transports:

- Claude: Read-only, fresh workspace, safe mode plus restricted workspace access, no discovered skills or external tools. Required files are exposed as bounded verbatim framed chunks; verification matches successful Read tool results to their originating tool calls and exact frozen bytes. Both experimental conditions use identical permissions. Synthetic skill and plain-arm probes verified outside-workspace denial; the skill probe verified all 17 chunks.
- Codex: the original command-read route sometimes reported successful command events with empty `aggregated_output`; smaller chunks and alternate command settings did not resolve it. The replacement is an integer-indexed, local read-only MCP tool serving the same frozen chunk bytes. Its gate verifies actual successful tool-result bytes against the frozen file and chunk hashes. Three excluded live probes passed every chunk; the final probe used the frozen workspace-only isolation settings. A successful exit code, claimed hash, or assistant assertion never substitutes for actual full-output evidence.

Plot twists cleanup completed: exactly two replacement creator calls and four missing paired reviews restore full ten-trial scores for all four original settings. The original 78 valid answers, 76 completed paired reviews, and two failed predecessor answers are retained. The expansion to the remaining 29 settings ran at concurrency eight, without automatic retries of first-attempt failures, before provider quotas stopped it.

Synthetic transport probes are excluded from benchmark answers and scores. Their raw streams and receipts are under `.agents/vasir-evals/writing-completion-20260908/`. Do not treat a passing probe of an older source revision as proof of a changed runtime.

## Work ownership and publication

- Core recovery: `story_aggregate_data`; recovery notes and preservation verifier in `storytelling-core-idea/completion-20260908/`.
- Plot twists completion driver and source projection: `verify_score_meaning`.
- Dungeon Master extension controller and source projection: `writing_data_parity_audit`.
- Shared runtime repair, cross-workstream resource coordination, final source selection and guarded publication: root.

Initial concurrent provider-call allocation was four per workstream. Each run has one checkpoint writer and durable raw evidence. New cohort manifests and runtime dependency bytes must be frozen before dispatch. At startup, public source selectors still pointed to the prior accepted releases; new execution results are not live merely because they exist locally. Final publication must derive scores from the retained answer/review evidence and pass the existing source, browser, and release guards.

## Drained checkpoint and remaining work

| Benchmark | Valid answers | Completed paired review requests | Fully scored answers | Remaining work |
| --- | ---: | ---: | ---: | --- |
| Core idea | 790 / 792 | 572 / 792 | 356 | 216 Fable pair reviews on intact pairs; two original terminal-policy generation blocks remain |
| Plot twists | 175 / 660 | 80 / 660 | 80 | 410 unattempted slots, 73 quota failures, two non-retryable provider refusals; expanded answers still need judging |
| First discovery of magic | 198 / 198 | 396 / 396 | 198 | None; source and scores unchanged |
| Dungeon Master | 110 / 1,056 | 33 / 1,056 | 32 | 940 unattempted slots, six quota failures, and remaining paired reviews |

Recovered totals versus the starting checkpoint: 175 additional valid answers and 104 additional paired review requests (208 individual answer assessments). An answer with only one of its required two reviews remains unscored. All 33 settings stay visible through available-score aggregation; partial coverage is not treated as zero.

Core's 99 new Fable requests raise its completed Fable total from 79 to 178; all 394 completed Astra requests are unchanged. Dungeon Master has one newly completed judge request beyond the original 32, insufficient to add a fully scored pair.

### Quota stop and dispatch repair

- Claude reported its session limit with a reset of September 8 at 4:40 PM America/New_York (20:40 UTC). Its work drained without account substitution.
- Codex reported its usage limit with the reset hint `Sep 14th, 2026 9:21 PM`; the provider message did not state a timezone. All three collaboration agents also stopped on this quota.
- Plot twists initially missed Codex quota failures because the adapter retained stdout by a hashed file reference rather than inline in the error. Seventy-two quota-failed calls were retained before the root manually stopped and drained dispatch. They did not produce answers or scores and must not be omitted from the execution history.
- The new guard in `cli/eval/writing-provider-failures.js` verifies retained raw-stream lengths and SHA-256 hashes, recognizes actual terminal provider records, and pauses replacement dispatch after a quota checkpoint. It covers creator rows and judge batches, ignores error-like candidate prose, distinguishes refusals from quotas, and cannot substitute accounts or reviewers. The CLI stores a separately pinned operational guard receipt without changing the nine frozen execution dependencies or manifest.
- The guarded CLI was exercised against the retained quota failures and refused dispatch before any provider call. No additional live probes were made. Generic retry is forbidden when retained provider policy refusals exist.
- A future quota recovery requires restored capacity in the same declared authentication context and an explicit, narrowly scoped continuation that preserves all failed attempts. Do not simply use `--retry-failed` or rewrite the frozen manifest.

### Immutable sources selected for publication validation

- Core: `0b47f5bfa55fdce4c3fba9044bac1270ec57df9ee1ae85030a9970c8cfb156ac`.
- Plot twists: `cc357218c44344dc9d7e981e46e5c99d9f8ef8f9a77ebff3fb7c410555d28d24`.
- Dungeon Master: `d8e35edd2fc4229045e2336ca32f283d00d5f004d3da14d6176e1e2976cfcdab`; an additional exact 1,081-file evidence archive is retained at `.agents/vasir-evals/dungeon-master-adventure-outline/completion-checkpoints/quota-stop-20260908`.
- Magic: original source `233db3f8cf5c4db8ddd6432ff7323d7be567a46654213f9a00a148e04329a18f`, unchanged.

Source-lineage validation verifies original answers, completed reviews, failed-attempt ledgers, cohort declarations, and skill bytes before admitting the new selectors. Two Plot twists failed-read predecessors remain separately inspectable, with copied output checked against its original hash.

### Delivery and candidate checks

The expanded evidence no longer fits the old monolithic response budget. Plot twists and Dungeon Master now have dedicated same-release lazy archives alongside Magic. Splitting and hydration are lossless and validate the exact benchmark identity. Missing, unknown, duplicate, or cross-release archive descriptors fail closed. Games continues to validate only its unchanged 13-file scope and explicitly excludes the Writing archives.

The release contract contains 18 public files. The candidate is 27,588,105 bytes; its compressed landing dependencies are 295,564 bytes, still below the unchanged 300,000-byte budget. Ordinary files remain limited to 2 MiB; Writing data and ordinary response archives to 8 MiB; the expanded Dungeon Master archive to 32 MiB; the complete release to 64 MiB. These higher evidence budgets do not increase the landing-page download allowance.

Candidate: `tmp/writing-completion-20260908/candidate-02`, release `ca80d791ff0f63b033a641e86e1fca18c2fc16d054cf068d1eca5feabca217fb`. All 32 canonical captures and all 12 Writing browser proofs passed. Publication still requires the guarded acceptance and deployment receipts; a local candidate is not a live release.

### First publication rejected and rolled back

The first accepted candidate passed local browser validation, but live HTTPS validation caught 403 responses for the two newly separated archives. The CloudFront release router still admitted only the earlier archive names. The guarded publisher automatically restored the previous verified release `f700a2497bccc5b5f1cff07720e1adc5df0824f9715b5865a362068d6c48a0ff`; both its error receipt and a subsequent read-only CloudFormation/HTTPS check confirmed restoration. The failed candidate, raw publication stdout/stderr, and all captures remain retained. It is not a successful publication.

The repair adds exactly `writing-twists-responses.js` and `writing-dungeon-master-responses.js` to the existing CDN regex. It does not open arbitrary file access. Artifact construction now executes the actual CloudFormation router source against every declared public file, stable HTML entrypoints, private controls, traversal, and apex-script rejection cases before any AWS mutation. A regression test proves the previous allowlist is rejected. The publication wrapper also now reads structured error receipts from stderr instead of masking them with an empty-stdout JSON parse error.

Replacement candidate: `tmp/writing-completion-20260908/candidate-03`, release `2d2187a48eda5867496c423fd5f46f130f35be815b55a5502e628a2fd80c25a7`. Raw sources and all scores are unchanged. Incomplete report labels now say “Incomplete snapshot” rather than implying live dispatch. This candidate is 27,588,121 bytes with 295,567 compressed landing bytes. All 32 canonical captures, 12 Writing proofs (1,980 checks), and two Games proofs (32 checks each) were regenerated and passed for this exact candidate and infrastructure. The first mobile Games check encountered a missing stop control after fullscreen; its failed attempt was retained separately, and a fresh unchanged-harness run passed all checks. This browser retry did not call models or change any benchmark evidence.

## Successful publication

The guarded publisher returned `status: success`, `dryRun: false`, active release `2d2187a48eda5867496c423fd5f46f130f35be815b55a5502e628a2fd80c25a7`, and verification `passed`. It verified all 18 public files plus the Games isolation probe, reused 526 unchanged immutable Games assets, confirmed the private origin, and released its publication lease. Receipt: `tmp/writing-completion-20260908/candidate-03/publish-result.json`. The previous verified release remains `f700a2497bccc5b5f1cff07720e1adc5df0824f9715b5865a362068d6c48a0ff` for rollback.

This is a successful publication of partial benchmark completion, not a completed 33-setting backfill. Plot twists now has all four original configurations fully scored; Core has 99 additional paired reviews; the expanded answer inventories are visible but unjudged answers are not scored. Magic and every non-Writing score source remain unchanged. Final local acceptance tests: 52 passed; runtime/projection regression batch: 116 passed; delivery regression batch: 32 passed.

Post-publication browser checks against the real HTTPS site passed: mobile Plot twists, 231 checks (`tmp/writing-completion-20260908/live-twists-390/writing-browsercheck.json`), and desktop Dungeon Master, 147 checks (`tmp/writing-completion-20260908/live-dm-1440/writing-browsercheck.json`). Every loaded module was independently matched by release-qualified URL, byte count, and SHA-256 to the accepted candidate. This live proof is separate from the local rehearsal. The task-owned preview servers were stopped after verification; no background benchmark continuation is scheduled.
