# Core idea completion recovery

The user requested completion of missing Writing scores. This work resumes only
the missing original Fable review batches in the existing frozen Core idea run.
No public source selection, generated website files, model inventory, prompt,
rubric, judge panel, or valid output is changed by this recovery.

## Prestate

- Run: `storytelling-core-idea-v1-2026-09-07`.
- Last prestate checkpoint: `2026-09-08T02:07:51.637Z`; no `run.lock` present.
- Exact full run archive: `.agents/vasir-evals/storytelling-core-idea/publication-snapshots/0f29483fa808cf70d7431ff6a257b73e6d055585bbceab91c7183ba1bdc433e5/run.json`.
- Run SHA-256: `0f29483fa808cf70d7431ff6a257b73e6d055585bbceab91c7183ba1bdc433e5`.
- Frozen skill archive: the same directory's `skill-snapshot.json`.
- Skill file SHA-256: `a4db1b5ea3ae79e9655be2ab793fa71e153571359a88d098a383bf94cd4667e5`.
- Manifest file SHA-256: `8f5ab536bc622a096c22a71609d97d632e12d15793419421332954099e7d266e`.
- Frozen execution identity: `edcbeb0931921d8047321ca3c4e6a4751ab466958c32fd3b6bda0b5e97775373`.
- Corpus hash: `3441eb41d6babb53b7a757ae0cd99407f80e2f6aa31957e0c529893e5bed3f09`.
- Frozen skill content hash: `7802d73207dc64b44cd547ec752c7ea1a5198234c155d43e9934b08f6d73e2f0`.

The supported archive-only helper verified byte equality between the live run
and existing immutable archive before recovery. The archive contains all raw
failed review records as well as the original answers and valid assessments.
The manifest is additionally retained beside this note as `prestate-manifest.json`.

There are 792 planned answer slots: 790 complete, two terminal output-filter
failures, and zero pending generation slots. There are 394 intact matched pairs.
Astra xhigh has all 394 completed pair batches (788 individual assessments).
Fable 5.1 max has 79 completed pair batches (158 individual assessments), with
315 failed pair batches (630 individual assessments) awaiting capacity.
Every one of those 315 failures records the same explicit API 429 session limit;
the prior message stated a reset at 11:50pm America/New_York.

The two missing generations are The Matrix, skill condition, for Opus 5 xhigh
and max. Both have one API 400 output-filter failure, no final answer, and no
review. Their two valid plain counterparts remain intact but cannot be judged
without the missing treatment. Four pair-review requests (eight individual
assessments) are therefore blocked by generation, separate from the 315
resumable Fable requests. These rows will not be retried or routed around the
provider policy.

## Authorized recovery

The unchanged current default Claude context reports `loggedIn: true`,
`authMethod: claude.ai`, first-party provider, Max subscription. No
`CLAUDE_CONFIG_DIR`, API key, or OAuth environment override is present. Credential
values were not read or logged, and no account switching is performed. An auth
status check does not establish remaining quota.

The current runner already recognizes the recorded session-limit wording and
opens its provider/model circuit after explicit quota exhaustion. With four
workers, requests already invoked may settle; later requests are deferred
without invocation. Compatible completed batches are reused. No shared runner
change is required to begin this judge-only recovery.

```sh
node cli/eval/run-storytelling-benchmark.js --resume storytelling-core-idea-v1-2026-09-07 --judge-only --judge-provider claude --judge-concurrency 4
```

No `--retry-failed` generation command is used. After coordination with the shared
runner owner, a narrow execution guard now excludes explicit output-policy
failures from that flag as well as the existing required-read protocol failures.
The new guard requires the retained Claude terminal-error evidence and exact
API 400 filtering result; a generic 400 or candidate text mentioning a policy
does not qualify. Operational retries are unchanged. Two new regression tests
cover strict classification and a mixed recovery where the blocked row and
valid answers remain byte-for-byte equivalent while the operational failure is
retried. All 31 runner tests passed after the change. The already-running
judge-only process is unaffected by this generation-selection guard.

After recovery, compare every generation row to the archived prestate excluding
only derived `score` and `scoreBasisHash`, and compare all 473 previously complete
judge batches excluding only their `reused` flag. Verify the frozen manifest,
skill file, and public source-selection file remain unchanged. Preserve a new
immutable full-run archive before any further recovery invocation.

Completing the 315 Fable requests would produce 1,576 individual assessments and
31 complete official model settings. The two provider-filtered generations
remain honest blockers to all 33 settings and 1,584 planned assessments.

## Recovery invocation

The authorized judge-only invocation started at approximately
`2026-09-08T15:49:53Z`, invocation ID
`381d8d03-3a60-4378-84f4-0a7f4dfc8fbb`. Its four workers use the unchanged current
default Claude context. Existing reviews are reused and the quota circuit is
monitored; an account-wide exhaustion signal must also be communicated to the
other active Claude workstreams. No second writer may be started while this
invocation owns `run.lock`, and the lock must not be manually deleted.

A read-only preservation check at the `2026-09-08T16:02:26.386Z` checkpoint
confirmed all 792 original generation rows and all 473 prior completed review
batches unchanged (excluding only derived row scores and the review `reused`
flag). This is an interim check, not a completed recovery claim. Run
`node docs/work/vasir-benchmarking/storytelling-core-idea/completion-20260908/verify-recovery.mjs`
after the writer exits, then archive its final checkpoint before any additional
invocation.

## Stopped checkpoint and preservation receipt

The provider reported an explicit API 429 session-usage limit during this pass.
The existing quota circuit stopped new calls, allowed in-flight requests to
settle, and recorded the remaining work as deferred. The invocation exited with
code 0 after its final checkpoint at `2026-09-08T16:33:01.252Z` and released its
own lock. No process or lock was forcibly removed, and no account was switched.
Other Claude workstreams were notified of the account-wide exhaustion.

Fable finished with 178 complete pair batches: 99 newly completed, three actual
quota failures, and 213 deferred without provider invocation. All three failures
state a reset at **4:40pm (America/New_York)** on September 8, 2026
(`2026-09-08T20:40:00Z`). This is the provider-reported reset hint, not evidence
that quota will necessarily be available then. No further probe was made.

The final read-only verifier passed at `2026-09-08T16:33:51.002Z` and is retained
as `verification-20260908T163351Z.json`. Every original generation row and all
473 previously complete review batches were preserved under the strict
comparison described above. Frozen run fields, the manifest, the skill, and the
public source selection remained unchanged. The new run SHA-256 is
`0b47f5bfa55fdce4c3fba9044bac1270ec57df9ee1ae85030a9970c8cfb156ac`.

The supported archive-only helper then retained the full exact stopped run and
skill snapshot at
`.agents/vasir-evals/storytelling-core-idea/publication-snapshots/0b47f5bfa55fdce4c3fba9044bac1270ec57df9ee1ae85030a9970c8cfb156ac/`.
Its pin is `poststate-source.json`; creating that receipt did not change the
public selector. The archive includes all three new raw quota failures and all
deferred records. The exact older archive remains intact.

Current verified coverage is 790/792 answers, 1,144/1,584 individual judge
assessments, and 356 fully panel-scored answers across 178 matched pairs. This is
198 more individual assessments than before the recovery. No setting yet has
all 12 stories reviewed by both original judges, so there are still zero full
official settings; the existing uniform Astra-only provisional basis remains
available for the same 31 complete-generation settings.

Remaining work is 216 Fable pair-review requests (432 individual assessments)
after provider capacity is available. Separately, the same two terminal
output-filtered generations prevent another eight assessments. Do not retry
those generation failures, reroll a valid answer/review, alter the judge panel,
or change the provider/account/prompt to bypass either blocker. A later
authorized same-context judge-only resume may reuse all 572 currently complete
pair batches and retry only the missing work, after verifying this immutable
poststate archive and confirming there is no live writer.
