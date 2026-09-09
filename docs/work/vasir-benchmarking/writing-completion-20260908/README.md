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

The original preparation above used four concurrent calls. After the actual
refreshed Claude `/usage` panel at 20:43 UTC showed session 0%, all-model weekly
30%, Fable weekly 55%, and credits off, the coordinator launched this same
judge-only command at **eight** concurrent calls at 20:44:12 UTC. The sanitized
observation is `claude-capacity-20260908T2043Z.json`; no authentication or billing
change was made. The remaining 216
Fable paired reviews must use the original judge configuration. Archive a new
immutable checkpoint before any later recovery invocation.

## Unscored policy cases and publication

The two Core idea Matrix skill refusals (Opus xhigh/max) and two Plot twists
Opus xhigh skill refusals are not operational failures. They remain retained and
unscored. The request to complete missing scores does not authorize bypassing
those refusals or silently altering the registered cohort.

A new first-attempt Plot twists Opus max treatment refusal (trial 6) was
observed at 20:49:27 UTC and retained without retry. Future summaries must use
the live retained failure inventory, not assume there are only four cases.

Core's first new non-successful review is also terminal, not a quota retry:
Fable review `batch-242`, covering Opus high's Matrix pair, returned an explicit
content-policy block at 20:58:15.650 UTC. Retained stream SHA-256 is
`63e25c94870b153dd5b964e03b991edd47055d914f600ccf5dd9ef061bbc9464`.
It has no usable review. Do not blindly invoke judge-only again after this
stage: a future continuation must preserve this failure and exclude it from
dispatch, as well as retaining every valid previous review.

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

## First expanded publication candidate

All 23 Codex Plot twists configurations were fully scored at the immutable
`e5e4fe54c2f2b5e239ca7b79b6b3f2e73a0266a376abf933ce65a60c52d2c987`
checkpoint. The first release candidate combines that with the drained DM
`81d259af6d7e1f506c82cf8dfd7b16c0943eee9b09cdb01b6a128e1f356e8648`
checkpoint while preserving the previous Core and Magic selections. It is not
a claim that currently running jobs have completed or are already deployed.

Independent checks rejected candidate `codex-checkpoint-01` before publication:
equivalent aggregate formulas produced 81.15 and 81.14999999999999, rounding to
different displayed tenths. The candidate is retained, not accepted. The pure
Writing display helper and independent acceptance/browser checks now stabilize
half-tenth ties by a two-relative-ULP tolerance; exact source scores and ranks
are untouched. A regression verifies both ULP-near ties and genuinely lower
values. Additional hardcoded old four-setting UI examples now use the retained
accepted fixture, while separate checks verify every advancing source/selector.
All 241 targeted tests passed before candidate 02 acceptance.

Candidate `codex-checkpoint-02`, release
`ad58611fbf1e2801cd73fbbe01b468219d3da18b80e7b82193d23d3886541817`,
was accepted after 32 canonical captures, 12 Writing browser proofs, two Games
proofs, and visual inspection. Its 18 public files total 31,043,706 bytes;
compressed landing dependencies are 296,431 bytes, below the unchanged budget.
The guarded publisher returned success, live verification passed, and no
rollback was needed. Post-publication HTTPS browser checks passed 143 checks on
mobile Plot twists and 147 on desktop Dungeon Master. All 22/26 loaded file
observations matched the accepted release-qualified URLs, byte counts, and
SHA-256 hashes. A further 26 acceptance/lineage/browser-contract tests passed.

This publishes 23 comparable Storytelling settings, not completion of all
Writing execution. The original Core and Magic selections remain unchanged;
live Core, Claude Plot twists, and Codex Dungeon Master work continue separately.
Publication receipt and live proofs are retained in
`tmp/writing-completion-20260908/codex-checkpoint-02/`.

## Drained Claude checkpoint and current capacity

At 21:53 UTC, the refreshed same-context Claude `/usage` panel reported session
100%, all-model weekly 53%, Fable weekly 100%, and usage credits off. The
sanitized receipt is `claude-capacity-20260908T2153Z.json`. The shared session
reset label is 9:40 p.m. Eastern; the separate Fable weekly reset label is
September 14 at 10 p.m. Eastern. Neither label is readiness evidence. No
Claude work is dispatched while capacity is exhausted; the original Codex-only
Dungeon Master invocation continues independently.

Core's judge-only invocation drained at 21:11:44 UTC. The verified immutable
publication archive has run SHA
`bdf31f6ba88a720057da05d31597dd80a35606201dff7c73a6a741a4cefe4280`.
All 792 generation records, 572 prior completed paired reviews, and the frozen
manifest/skill are preserved. Astra has 394 complete pair reviews; Fable has
295, up from 178. This yields 590 fully panel-scored answers and 1,378 individual
assessments, with one complete official model setting.

The 99 remaining Fable pair-review slots are **not 99 new pending calls**:

- Three terminal policy blocks: `batch-242`, `batch-257`, and `batch-283`.
  The third retained stream SHA is
  `273875140b14fd221c90231d66ec81925046e4c9c9561f9593a923aa8a552d49`.
- Three attempted quota failures: `batch-295`, `batch-297`, and `batch-301`.
- Ninety-three deferred slots, with no provider call attempted in this invocation.

The three blocked reviews all concern The Matrix: Opus high, Fable max, and
Opus medium respectively. They affect three different settings, distinct from
the two Matrix generation refusals at Opus xhigh/max. If all 96 recoverable
review slots later succeed without further failures, the retained cohort's
ceiling is 782 fully panel-scored answers and 28 complete official settings,
not 792 answers or 33 settings. Terminal omissions must remain disclosed.

The two terminal generation refusals remain separate. A future authorized
capacity recovery must exclude the three policy-blocked reviews and preserve
their raw evidence; it may not blindly retry every non-complete batch. The new
Core archive is not selected merely by preparing it. Its one complete official
setting would trigger the existing whole-benchmark basis switch and reduce the
comparable aggregate roster; the current selected provisional comparison is
retained pending the user's publishing choice or completion of that panel.

## Corrected Claude usage interpretation

The frozen Plot twists skill transport's 17 CLI-reported turns were not 17
model round trips. Audit of all 24 successful Claude skill calls found 69
distinct assistant response IDs: 18 calls used eight reads, eight reads, then
an answer; five used 16 reads then an answer; one used four batches of four
reads then an answer. All 16 required reads occurred, often in parallel within
one response. The token/cache accounting is unchanged. No batching restriction
was found in the frozen harness. No prompt, transport, skill, or cohort was
changed for this correction.

## Pending-generation display clarification

The Plot twists incomplete-run projector's unresolved count includes provider
failures. Its public cell statuses already distinguish 132 pending generations
from eight error cells at the verified `7ae2b261...` checkpoint. The shared
report now renders the pending-status count separately from its existing failed
generation disclosure. This is a display-only change: no inferred refusal
classification, archive edits, changed denominators, or changed ranks. Explicit
refusal evidence remains in the hash-verified operational stream inventory.
Four focused regressions cover the pending/error distinction, singular grammar,
the original terminal full-read exclusions, and settled Magic/DM reports;
157 related tests passed. The new exact website candidate still requires the
normal fresh browser, acceptance and live deployment checks.

## Completed Codex Dungeon Master work

The unchanged Codex-only phase finished naturally at 23:43:26 UTC: all 736
outlines and all 736 fixed-panel review calls are complete, covering all 23
Codex configurations in the primary and transfer cases. The whole-evening
audit verified 1,329 added successful calls, zero new failures, all prior
successes, all six retained historical quota failures, and the frozen runtime.
The full read-only archive contains 6,409 verified files at
`completion-checkpoints/codex-complete-20260908T2344Z/` under the Dungeon Master
artifact directory. Its run SHA is
`24f73ab5b2020eb3836b01121a5dac73f4589dc43adc5ba9af4358fbab16b248`.
Only 320 Claude outlines and their 320 subsequent fixed Codex review calls
remain in that experiment; no Claude dispatch was made while quota-blocked.

Candidate `codex-complete-03` combines that checkpoint with Plot twists
`7ae2b261eda8a368dc51c5df15b2d4e0c9aab78928149b90727530ceb31209ad`
and the unchanged Core/Magic selections. All 245 target regressions and all
32 canonical browser captures passed. Eleven of twelve Writing browser proofs
passed; DM mobile completed its content/layout checks but failed mandatory
CDP response-byte capture for the 15,138,707-byte DM archive. A standalone
unchanged-harness retry reproduced the error. Both failed attempts remain in
the candidate directory (`writing-dm-390-failed-01` and `writing-dm-390`). This
candidate was not accepted or deployed on incomplete proof. A narrowly scoped
browser-capture fix and fresh verification are required; actual loaded-byte
hash checks are not waived or replaced with a separate fetch.

## Fresh capture verification and final candidate acceptance

The browser harness now explicitly retains response bodies across renderer
navigation with bounded CDP buffers, and drains outstanding captures before
navigation and final receipt generation. It still hashes the body belonging to
the original network request: no separate fetch, fallback bytes, or suppressed
capture errors. Five focused tests cover buffer configuration, UTF-8/base64
hashes, mandatory error retention, growing capture queues, and navigation order.
The old harness bytes remain preserved as Git blob
`1481c241057c788af974f3b8bbdb4351094a2f2e`; both failed mobile proofs remain
unchanged. The fixed standalone mobile proof verified the exact DM archive
(15,138,707 bytes, SHA
`68ea325f00628734abcc0bd99827166a7b0b9ed6f9f6743c5afdd205eeb3030e`).

Fresh candidate `codex-complete-04`, release
`1a0410226973783b5ec53f27c0caa3c72a29e1c57145bad3c7be6d0b7cb12232`,
was accepted at 2026-09-09 00:00:51 UTC after all 250 target regressions,
32 canonical captures, 12 Writing proofs, two Games proofs, and visual review
passed. All Writing proofs used the updated harness, SHA
`afd327181ef361f35aa1c333ee7ce433dff1d34d5801e6702c217d8f8cc22955`.
There are 348 retained fresh screenshots. The 18 public files total 43,643,985
bytes; compressed landing dependencies total 296,433 bytes, within the
unchanged 300,000-byte limit. Source, score, archive, and non-Writing preservation
checks passed. Acceptance alone is not deployment proof.

This candidate contains all 23 completed Codex settings for Plot twists and
Dungeon Master, the unchanged complete 33-setting Magic benchmark, and the
retained 31-setting provisional Core comparison. The Storytelling aggregate
ranks the same 23 fully covered settings on the same three tests; ten partial
settings remain visible but unranked. No missing scores are invented, no
successful benchmark is rerun, and no provider refusals are retried.

## Live final checkpoint

The guarded publisher successfully activated release
`1a0410226973783b5ec53f27c0caa3c72a29e1c57145bad3c7be6d0b7cb12232`
at `https://vasirbenchmark.com`. Its receipt confirms a real deployment,
successful publication verification, and no rollback. The previous verified
release remains `ad58611f...`. Receipt:
`tmp/writing-completion-20260908/codex-complete-04/publish-result.json`.

Post-publication HTTPS browser checks passed at 2026-09-09 00:08 UTC:

- Mobile Dungeon Master: 147 checks; 26 loaded-file observations, all matching
  the accepted release-qualified URLs, exact byte counts and SHA-256 hashes.
  Receipt SHA: `1e0c5c6bd6e5ad71bc417374870661b0d59712e50a70b746f818bc79525e96e2`.
- Desktop Plot twists: 148 checks; all 22 loaded-file observations matched.
  Receipt SHA: `e696021c5e780c27666223819b05ac84f3a77462fea9300c8b3f8cbedbc2e8cc`.

These proofs are retained under `live-dm-390/` and `live-twists-1440/` in the
same candidate directory. The live leaderboard was visually inspected. A
further 29 acceptance, lineage, and capture-contract tests passed after
acceptance. All currently runnable benchmark work is drained. Claude quota
still blocks the remaining generation/review work; terminal policy refusals
remain permanent omissions. Core's additional private full-panel reviews are
archived but not selected, as explained above. This release is the completed
available checkpoint, not a claim that every planned Writing slot succeeded.

## Claude retry after the user's restored-capacity notice

On September 9 at 00:28 UTC the user explicitly requested trying the Claude
benchmarks again. The CLI authentication check reported an authenticated
first-party subscription, but the interactive usage view stopped at onboarding.
No login, account switch, purchase, or credit enabling was performed; the old
usage percentages were not reused as current evidence. The bounded retry
authorization is `claude-retry-20260909T0028Z.json`.

One original, untouched Dungeon Master Fable Low writer succeeded at 00:32:26
UTC. Its raw provider stream confirms `status: allowed`,
`isUsingOverage: false`, overage rejected/out_of_credits, and observed unified
window utilization of 0 (five-hour) and 0.02 (seven-day). There is no separate
Fable weekly window; none is inferred. This is model-specific successful-call
evidence, not a promise of unlimited capacity. The fully audited read-only
`claude-first-success-20260909T0035Z` archive retains 6,415 files and run SHA
`365ba80b08ddce85a1c5678ffc2ce6c1cdb623930304a30c87178917e142ffb1`.
The operational auditor now validates Codex thread IDs and Claude session IDs
separately; all eight focused tests pass and the old auditor bytes remain
archived. Frozen execution and score sources are unchanged.

A second bounded original DM invocation allows at most 20 calls at concurrency
four. Both Fable and Opus have returned valid original answers. Modern Opus
refusals also occurred: their raw structured `stop_reason: refusal` is retained,
although the frozen DM diagnostic labels them `invalid-result`. **Never use
`--recover` for subsequent ordinary DM continuation:** it would reschedule
these error rows. The frozen executor's pending-only mode (omit `--recover`)
excludes every existing error/running row and preserves the refusal evidence.
Its original two-attempt technical-failure behavior remains explicit; a
structured refusal is not a technical failure and must not be retried.

Examples already verified directly from raw stream bytes:

- Opus max, salvage trial 2, skill: SHA
  `1d89f07b2e9512c59c29ed34423d9e99f7656c450b23ea4736f9c0a86528cfd2`.
- Opus xhigh, primary trial 4, skill: SHA
  `3d76053f18bc4c671521342b285fdfa7491f6dae6814c2fe5edb97a81c0d20c8`.

These are examples, not the final failure count of the active stage. No modern
refusal is reclassified by rewriting scored rows or frozen source code.

## Restored-capacity retry: drained at the next actual session limit

The September 9 retry produced **67 new valid Claude outlines**: 48 Dungeon
Master and 19 Plot twists. Dungeon Master's three bounded stages made 58
original calls in total: 56 Claude writers and two original Codex paired-review
calls. The writers yielded 48 valid outlines, seven explicit refusals, and one
actual session-quota failure. Plot twists made exactly 20 original Claude
calls, yielding 19 valid outlines and one additional explicit refusal. No
successful answer or terminal refusal was rerolled.

At **01:00:07 UTC (9 p.m. Eastern September 8)**, the original Opus Low writer
returned HTTP 429: `You've hit your session limit · resets 1:30am
(America/New_York)`. Receipt: `claude-session-limit-20260909T010007Z.json`.
That newer failure supersedes all earlier successful-call capacity proofs,
including proofs whose archive itself predates the failure. The provider's
reset label is not fresh readiness evidence. New Claude dispatch stopped;
already-running calls drained naturally. No account, billing, credit, model,
prompt, scoring-panel, or frozen runtime changes were made.

Dungeon Master drained at 01:03:45 UTC with 784 valid outlines, 738 completed
paired-review calls, and no active attempts. The audit verified all previous
753 successful writers, 736 successful reviews, 1,435 retained attempts, and
6,492 prior files against the immediately preceding archive. All 37 appended
attempts obeyed the allocated concurrency of eight and the quota stop. The
new read-only archive is
`completion-checkpoints/claude-quota-paused-20260909T0105Z/` under the Dungeon
Master artifact directory, with 6,639 exact files and run SHA
`5827eb54dcb3794bc99dfc49cbdaa7e48c59bc259ba14ff4b54e2c09d15983de`.

Core's operational continuation is implemented and tested but **never
dispatched**: the new quota arrived before its first real call. Its exact run
remains `bdf31f6...`. The adapter derives the original requests through the
unchanged frozen judge, preserves terminal/completed/undispatched records at
every checkpoint, retains raw streams, and stops on integrity or provider
failure. Thirty-one focused Core, Claude-capacity, Twists-continuation, and DM
audit regressions passed independently on root. See `CORE-RECOVERY.md` for
the bounded invocation and preservation requirements; fresh capacity is still
required before use.

The existing Twists controller supports original Codex judging independently
of unrelated creator quota; that phase began with a fresh read-only capacity
receipt at 01:01:36 UTC (87% weekly used, no exhausted limit or credits).
Dungeon Master's frozen controller has no judge-only continuation that can
bypass its global open circuit, so its remaining reviews stay pending until
genuine readiness is restored. No quota guard was cleared to force progress.
These new checkpoints are local evidence, not a new website deployment.

The independent raw-stream efficiency audit found 76 distinct original Claude
creator slots, exactly one benchmark attempt each. The 67 successful calls
contained 109 distinct assistant-response IDs, not 279 model round trips (279
is the summed CLI `num_turns`). No spawned subagents or web calls were present.
Success-only target-model usage was 1,058 input tokens, 857,018 cache-creation
tokens, 746,277 cache-read tokens, and 558,572 output tokens; 348,286 thinking
tokens are already included in output. Those categories total 2,162,925 tokens,
not a count of unique prompt bytes or total shared-account consumption.
Input/cache totals reconcile on all 67 successes after deduplicating response
IDs. Four DM skill calls made five additional successful optional frozen
reference reads; none were retries. The nine successful Twists skill calls
batched their 16 reads as either eight plus eight or all sixteen together.

Plot twists' original Codex judging drained successfully at 01:09:49 UTC:
18 new paired-review calls, all successful, completed the original two-judge
panels for nine additional pairs. The run now has 539 valid outlines and 494
fully panel-scored answers (247 pairs, 988 individual judgments), with 112
untouched generation slots and nine retained generation failures. All 23
Codex model settings remain complete; the additional Claude evidence does not
make a partially covered Claude setting comparable to those full settings.

The unchanged checkpoint utility verified 1,922 retained stream files, all
nine frozen runtime sources, prior successful answers/reviews and attempt
prefixes, then retained read-only checkpoint
`operational-checkpoints/ac7128bdbeec86d7bb144c19f3fc778fda91ba4b9afdfea0a0c3f004ee3e8cac/`
inside the live Plot twists run. The directory name is the SHA-256 of its
exact `run.json`. All stages are drained. Core/Magic, publication selections,
site assets, rankings, and the previously deployed release remain unchanged.

Independent post-drain verification against the published `7ae2b261...`
checkpoint and both exact operational prestates also passed: all 520 previous
valid creator records, eight prior failure records, 476 completed review
records and score/basis objects remain unchanged. Generation/dispatch/judge
attempt arrays retain their complete original prefixes. All 539 creator
records and nine failures were unchanged by the 18 new judge calls. There
are no ready-but-unjudged Twists pairs, unresolved calls, unfinished
invocations, or run locks at handoff.
