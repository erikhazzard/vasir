# Writing → Storytelling → Core idea v1

## User intent and authorization

Populate VasirBench's empty Writing capability and create a reusable Storytelling
benchmark family. The first benchmark compares a plain explanation of a story's
core idea with an explanation using the frozen `writing-storytelling` skill.
Cover multiple media, broad and comparatively specialized works, Codex 5.6
families/Astra, and Claude Fable 5.1/Opus reasoning settings. The user explicitly
authorized repository changes, push, publication and production deployment.

On 2026-09-07 (local time), after confirming that the live site still showed
Writing as “Coming soon,” the user explicitly approved publishing an
**in-progress benchmark now**. This release exposes the saved answers and
available original reviews, clearly labels incomplete judging, and withholds
incomplete configuration rankings. It does not claim the benchmark or its
two-provider panel is finished. Final scoring remains blocked on Fable capacity;
publication of this disclosed checkpoint does not require rerunning providers.

## Product structure

- Writing is a capability; Storytelling is its first active subsection.
- Core idea is **one benchmark**, with twelve story cases, not twelve benchmarks.
- Prose and Poetry are visible future subsections with no fabricated scores.
- Writing remains separate from Overall. Existing Engineering, AI Workflows and
  Games results, identities and score arithmetic must not change.
- Explorer and report routes use the existing VasirBench presentation, with a
  story selector, per-setting paired answers, rubric, source limits and failures.

## Frozen experiment

The definition and source checks are in `benchmarks/storytelling-core-idea`.
The declared run is `storytelling-core-idea-v1-2026-09-07`: 33 exact CLI model/
reasoning configurations, twelve stories, two conditions, one trial: 792 slots.
Candidate questions are identical between conditions. The skill root is injected
as a provider instruction; frozen references are selected/read by the model.
Each response runs in an isolated temporary workspace and fresh CLI session.
No source story, browsing, imposed length or prescribed answer template is given.
The six family targets are Astra, Sol, Terra, Luna, Fable 5.1 and Opus 5. Ultra is
identified as a runtime mode; Ultracode is excluded because it changes workflow
and agent count, not merely reasoning effort. CLI-requested identity is not
misrepresented as independently observed provider identity.

The original ten dimensions use integer 1–10 ratings with equal weight. Each
judge's sum is 10–100; a response is the mean of two original independent judge
totals. Both the Astra xhigh and Fable 5.1 max seats are required. No gates, score
caps, adjudicator, missing-score imputation or human calibration claim is added.
Only complete same-case paired configurations enter corpus rankings. Individual
case scores and failures remain inspectable. Length and judge disagreement are
reported separately. Single trials and overlapping dimensions do not support a
population confidence claim. “Broad”/“less broad” does not measure training data.

## Evidence and publication

The runner persists its plan before paid calls and checkpoints every response
and judging batch. Resume does not replace successful answers. Deferred provider
slots remain in denominators. Parsed execution receipts, original user questions,
final answers and failed attempts remain local; public projections use a strict
allowlist. Complete raw provider streams and provider-internal instructions are
not retained. Failed attempts can retain bounded diagnostic stream tails
privately; these are never included in the public evidence bundles.
Publication pins immutable byte-hashed checkpoints and recomputes scores from
original independent judgments. The website shows exact final answers, shared
skill instructions (temporary path normalized explicitly), the full frozen
reference library once, questions and panel rationales. Available references are
distinguished from automatically injected instructions. Provider-specific base
instructions are not claimed identical.

Two lazy generated bundles isolate Writing evidence from the landing page and
the existing response archive. The reviewed public file boundary grows from 13
to 15 files. The landing compressed-byte budget remains 300,000; generated JSON
is compacted without changing values. The total artifact ceiling grows from
10 MiB to 16 MiB to accommodate the additional 792-cell transcript archive; the
8 MiB per-response-bundle and 1 GiB physical-storage ceilings remain unchanged.
Actual byte counts must pass the publication validator before deployment.

## Acceptance

- Frozen corpus, precise models, progressive reference reads and actual judging
  parsing have passed independent plumbing checks; probe scores are excluded.
- Scoring/identity/hash/privacy tests reject altered answers, mismatched models,
  incomplete panel scores and wrong cohort rankings.
- Real Chrome checks cover desktop/mobile explorer, story selection, paired
  transcripts and unchanged Overall; no generated scores are browser fixtures.
- Renew the source/capture acceptance lock only after reviewed captures for the
  exact selected release. In-progress presentation acceptance must be explicitly
  distinguished from final scored-benchmark acceptance.
- Guarded dry-run, AWS identity check, immutable release publication, live byte
  verification and browser proof precede any completion claim.
- Coordinate final publication with the concurrent Games benchmark task; its
  active changes must not be discarded or unintentionally deployed mid-update.

## Current execution notes

The first smoke found a Codex CLI override-placement issue; a harmless sentinel
and a reference-read sentinel verified the v2 correction before scored work.
The default Claude context was unavailable at launch. A supported existing
Ratatosk-managed context subsequently passed exact Opus 5 generation and
progressive-reference smokes. Fable 5.1 in that context explicitly reported its
usage limit exhausted; no reset time was supplied. It was not replaced with a
different generator or judge.

The user restored Claude access on 2026-09-07. Native checks in the restored
default context passed for Fable 5.1 plain and skill answers, Opus 5 generation,
and the exact Fable 5.1 max judging seat. Those diagnostic calls are excluded from
results. The remaining phase started at 23:18:52 UTC after all 276 incumbent
Astra pair reviews completed. Generation finished by 23:35 UTC: 790 valid
answers from all 792 planned calls. The two failures are Opus 5 xhigh and max,
The Matrix, skill condition: explicit API 400 provider output-filter blocks.
Both original failed attempts are preserved and are not retried or rerouted.
Their successful Plain counterparts remain readable but unscored. There are
394 eligible matched pairs, requiring 1,576 individual assessments; 31 of the
33 configurations can obtain complete same-corpus scores. Missing evidence is
never assigned zero. The phase finished just before 00:00 UTC on 2026-09-08:
all 394 eligible Astra pair batches and 58 Fable pair batches are complete.
The other 336 Fable batches reported exhausted usage credits. A separate,
excluded check of the previously authorized managed Claude context also
reported its Fable limit exhausted. No additional provider calls are queued;
Fable capacity must be restored before the missing reviews can resume. The
earlier Opus-only queue was canceled before launch. No successful answer or
compatible judgment is rerun.

After the writer finished and released its lock, the full unchanged checkpoint
was archived without changing publication selection or generated site bundles.
Its run SHA-256 is
`62a85ad22f3b07fbb0e45ef43c1e817fee72891d71eedc363410755ad8da0916`,
under `.agents/vasir-evals/storytelling-core-idea/publication-snapshots/` in the
directory of that name. The adjacent `skill-snapshot.json` has file SHA-256
`a4db1b5ea3ae79e9655be2ab793fa71e153571359a88d098a383bf94cd4667e5`.
This preserves the quota-failure receipts before generic judge recovery replaces
failed batch records. At archival time it was not selected for publication;
the user's subsequent in-progress approval promoted this exact checkpoint.
After an excluded native Fable max capacity check succeeds, resume only the
missing Claude judgments with `--judge-only --judge-provider claude
--judge-concurrency 16` and the same run ID. Do not retry the two output-policy
blocks, change the frozen skill, or substitute the required judge.

A final read-only recovery audit accepted all 792 frozen plans and byte-reused
all 452 complete judge batches in an in-memory resume simulation. It scheduled
exactly 336 missing Fable max batches and zero Astra batches. The current
benchmark, generation, scoring, manifest and frozen 23-file skill identities
remain compatible; the archive matches the source byte-for-byte. This check
made no provider calls and changed neither production evidence nor selection.

The resume audit reproduced and fixed a lock-acquisition race before the new
phase: ownership is now acquired before reading saved checkpoints. In-memory
expansion from 552 to 792 answers preserved all 180 available incumbent judging
batches through every subsequent checkpoint. The combined runner/judge/
publication suite passed 141 tests. Generation and judging each use a maximum
of 16 concurrent CLI requests; these execution-only limits do not alter the
frozen corpus, skill, prompts, panel or scoring policy.

The earlier interim preview was source
`50742cb6841f49f00e49ffdab78efad8cafca3b6af33dbc08045dd93165b03a9`:
790 answers, 566 individual ratings, 14 fully scored answers and no complete
whole-corpus configuration. It remains an immutable local rehearsal, not a
final scored selection. Under the user's explicit in-progress publication
approval, the selection now pins the archived `62a85ad2…da0916` checkpoint:
790 answers, 904 individual ratings, 116 fully scored answers, 58 reviewed
pairs and zero complete whole-corpus configurations. All 792 answer slots and
1,584 planned judgment slots remain disclosed. The 336 missing Fable pair
reviews require 672 individual judgments; another eight planned judgment slots
are unavailable because the two generation pairs were not intact. No calls
were made to prepare this publication.

Master skill commit `f491bb8` contains only the storytelling package, its archived
predecessor, provenance notes and catalogs rebuilt from the staged tree. Unrelated
game-skill/template changes and their working-tree catalogs remain untouched.
No benchmark commit, push or deployment has occurred. The concurrent Games session has been
asked to coordinate the shared acceptance lock and publication; unrelated edits
are preserved. Read-only comparison confirmed that its completed release
`f6a0716eb755894044ec80c1696e905cf93b3101d9dfef2bc20436a3218f0522`
already contains the local ten Games runs and five configurations. The entire
Games and Overall projections match; Games JavaScript/CSS match byte-for-byte,
and Games HTML matches after normalizing the publisher's release URL prefix.
The obsolete eight-run test was aligned with that already-live baseline while
retaining explicit uncontrolled-comparison and human-direction assertions for
the guided Ultra artifact. No Games ratings or creation history were changed.

Earlier local verification is recorded in
[the 552-answer immutable-release QA receipt](site-release-qa-552-2026-09-07.md):
109 checks passed at each of three viewport sizes, with shared Overall keyboard
navigation, Engineering report and Workflows inspector regressions also passing.
The latest full repository suite at 23:57 UTC passed 500 of 501 tests. The sole
failure is the intentionally unrenewed shared presentation acceptance lock.
The stale Games selection assertion is corrected and all nine projection tests
pass. The focused quota-circuit, runner, judge and Writing suite passed 163 tests.
The shared site acceptance lock still awaits final scored Writing captures.
The staged skill package's registry/metadata checks and diff hygiene passed;
unrelated worktree catalog drift is excluded from the skill commit. The guarded publication dry-run
stopped at `BENCHMARK_PUBLISH_ACCEPTANCE_REQUIRED`, with no deployment attempted.
