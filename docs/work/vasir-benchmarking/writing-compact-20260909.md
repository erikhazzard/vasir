# Compact Writing execution and page migration

The user authorized the agreed compact experiment and website update on
September 9, 2026. The older unfinished generation and review matrices are not
part of this execution. Their original results and failure evidence are retained.

## Scope

- Claude Fable 5.1 and Claude Opus 5, each low / medium / max.
- Three Plot twists prompts, one Place generation prompt, one D&D one-shot.
- One plain and one guided response per configuration/task: 60 generations.
- Two fresh blinded paired judges per pair, Astra medium and Sol medium:
  60 paired judge sessions, producing 120 assessments of the 60 answers.
- Reuse published Core idea and First discovery of magic evidence; no new calls.

The final task strings, four-criterion rubrics, counterbalancing rule, exact
skill/reference bytes, model selectors, and execution dependencies are frozen at
`.agents/vasir-evals/writing-compact-v1/writing-compact-20260909T1539Z`.
Original manifest SHA-256:
`f06d2bf28256fdd2e043b7dd4e23bc2409601fe3702aef94f818b63b6a6a116b`.

## Runtime evidence and operational correction

The first two Claude calls succeeded: one turn each, no creator tools, fresh
sessions, exact same task, and the assisted skill/reference payload delivered
once as a separate system append. The plain answer was 532 words; the guided
answer was 551 words against a 550-word cap. Both original answers are retained;
the one-word breach is a task-fulfillment consideration, not grounds for reroll.

The first two judge launches failed before inference because Codex rejects
overrides under its reserved built-in `model_providers.openai` configuration.
Both produced empty stdout and no review. These were harness configuration
errors, not model failures or scores. Their immutable attempts remain recorded.
A narrowly authorized amendment removes those overrides and permits only these
two pre-inference slots to launch again. It does not replace any valid answer,
alter tasks or rubrics, or authorize quality-based retries. Non-inference Codex
prompt-input preflight verifies the corrected launch configuration.

Applied amendment SHA-256:
`9bd78bbbf3e05ba605cf8c242e240cb42ac58b77e02d5481c5bd1bd2f0152b59`.
The two corrected judge launches completed inference and returned structured
reviews. A second harness defect classified Codex's pre-turn warning about
`skip_host_skill_discovery` as a tool call. Those original reviews and streams
are retained. The offline, exact-warning-only validation correction passed its
adversarial tests and validated all 40 completed original reviews with zero
rejections. It did not authorize another inference attempt or alter the ratings.
Frozen validation SHA-256:
`a179b2dedcc56ebc006064b2bec550dc153a0193dd1be43ee4bff022c652cf51`.

The host runner has zero automatic retries and caps concurrency at two. Claude
has a one-turn and 8,192-output-token **per-segment** cap, including thinking. This
is not a whole-session cap: the CLI has a separate, hardcoded three-recovery
loop for output-limit failures that preserves its one-turn counter. Codex judges have
a bounded execution timeout and a 200-word evidence target; no unsupported hard
output-token setting is claimed. CLI sessions are not guaranteed to be one
underlying provider request: Claude receipts retain ancillary model accounting.

At 16:07 UTC the creator dispatcher was gracefully interrupted after two Fable
max calls returned output-limit errors. Each used 32,768 thinking tokens (four
8,192-token segments), without an answer, despite zero network retries. Two
already-started max calls were also interrupted and retained as failed attempts;
no original answer was overwritten. At that point: 21 successful generations,
four failed attempts, and 35 untouched slots. The first 20 successful generations
are the complete low/medium Fable sample. One max plain answer also succeeded.
No supported CLI control to disable the separate output-limit recovery loop was
found. The user was asked whether to defer max or allow fresh paired max calls
with a higher output limit. Untouched low/medium work and review of completed
pairs can proceed without that decision.

The separately frozen continuation dispatched only the 20 untouched Opus
low/medium slots. Scope SHA-256:
`15fb83224fdda974e49b9a53093731b330deacf959d146915564215ab54409e3`.
It preserved the original six-setting plan, prompts, skill bytes, reasoning
levels, limits, prior attempts, and model identities. Execution is now stopped:
41 successful generations (40 low/medium and one unpaired max answer), four
failed max attempts, 15 untouched max slots, and 40 completed paired judge
sessions. The 20 remaining judge slots lack complete max pairs. No max score is
inferred from the orphan answer. Of the 41 valid answers, 25 exceeded their word
limit; all remain intact and were not replaced on quality grounds.

There were 45 creator CLI launches and 42 judge CLI launches: the latter includes
the two pre-inference configuration failures. These 87 launches are not a count
of underlying provider requests. Known Claude usage across the 43 completed
creator receipts, including ancillary Haiku calls, is 1,073,829 tokens and
$11.607150 in CLI-reported cost. Two interrupted creators have no usage receipts,
so these are incomplete totals. The 40 completed judge receipts report 446,632
tokens; their cost is not reported here. Combined known usage is 1,520,461 tokens,
including cached input and reasoning. Two failed max calls alone consumed
65,536 thinking tokens without an answer. None of these figures should be
described as just the visible prompt-and-answer token count.

## Site contracts

The catalog lists tasks, not input skills. Place generation belongs to
Worldbuilding; the one-shot belongs to Storytelling. D&D is a domain tag.
New records use the existing benchmark ledger, paired leaderboard, and shared
answer/review report. No special-purpose compact or D&D page frame is added.

The broader Writing comparison uses explicit basis
`writing-established-storytelling-v1`: equal weights for Core idea's published
single-judge scores, original Plot twists, and First discovery of magic. The
six-Claude compact groups are independently selectable and do not silently
shrink the broader cohort. The legacy DM study no longer supplies an automatic
50% of Writing. Past-edition reports and their exact evidence remain accessible.

Adding validated selected evidence refreshes standard catalog rows, model
comparisons, answer navigation, averages, and same-model before/after leaders.
It does not automatically launch model sweeps or change an aggregate score basis.

## Results and publication evidence

The selected immutable export is
`9674c20c2fe31662428b4648afa85e51e1140c1a9b41eb6912f230c8df641c27`.
All scored groups have the same four completed settings: Fable 5.1 and Opus 5,
each low and medium. These are descriptive samples, not calibrated quality
estimates. Neither max setting has a complete scored group.

| Setting | Plot twists, plain → skill | Place, plain → skill | One-shot, plain → skill |
| --- | ---: | ---: | ---: |
| Fable 5.1 low | 85.8 → 80.0 | 90.0 → 82.5 | 82.5 → 87.5 |
| Fable 5.1 medium | 75.8 → 77.5 | 92.5 → 87.5 | 75.0 → 87.5 |
| Opus 5 low | 69.2 → 75.8 | 97.5 → 90.0 | 70.0 → 92.5 |
| Opus 5 medium | 62.5 → 81.7 | 92.5 → 92.5 | 80.0 → 95.0 |

Field means are 73.3 → 78.8 for Plot twists (+5.4), 93.1 → 88.1 for Place
(−5.0), and 76.9 → 90.6 for One-shot (+13.8). Deltas are calculated before
rounding. No scored answer was replaced after judging.

Browser review caught provider error strings being mistaken for nonempty story
answers. The public adapter now emits no answer for failed creator attempts;
the immutable source retains the original error text. Scored answer bytes and
ratings are unchanged. Additional checks cover negative uplift formatting,
current-versus-archived catalog counts, exact versioned Overall task membership,
shared report labels, empty-answer placeholders, and execution-policy fields.

Immutable archive reconstruction uses a versioned data-only validator and
reviewed source identity registry. It no longer depends on today's runtime files
or model registry. Freeze-time live source checks remain mandatory.

## Production release

The guarded publisher activated release
`44616c7e45745a55f8c09672e39d62844513bf6820457102cb498246c9d22139`
on September 9, 2026. Its retained receipt is
`tmp/writing-compact-release-20260909/candidate-05/publish-result.json`:
non-dry-run success, 18 site files, 19 delivery checks passed, no rollback.
The publisher used fast verification; its receipt does not claim a live browser
audit. Independent public HTTP checks confirmed that both the homepage and
benchmark report entrypoint serve this exact release.

Post-publication browser audits then passed for all three new reports at 1440px
and for Plot twists at 390px: 442 checks, zero errors, with every loaded
dependency belonging to the accepted release. These audits exercise the actual
public site, all compact task answers/reviews, and the shared Writing views.
Receipts are retained in the candidate's `live-*/writing-browsercheck.json`
files and `live-writing-batch.json`.

Acceptance preserved 675 screenshots, 32 canonical view checks, 21 Writing
report checks (all seven editions at three widths), and two Games checks. The
independent source oracle verifies the actual scores, original answers and
reviews, source-qualified methodology, and active-versus-archived navigation.
The working template lock and historical compatibility tests pass. A stale
historical test fixture was corrected to omit the newly registered compact
sources when reconstructing the older edition; production scores were not
changed to satisfy it.

The max-reasoning configurations remain incomplete. This release does not
represent all 60 planned generations as finished, nor infer scores from failed
or unpaired max attempts. Higher-limit max retries still await user direction.
