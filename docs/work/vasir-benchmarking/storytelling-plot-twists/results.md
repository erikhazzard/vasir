# Plot twists v1: results

Published and live-verified on September 8, 2026 UTC: [Writing → Storytelling → Plot twists](https://vasirbenchmark.com/?writing=storytelling-plot-twists#capabilities/writing/storytelling). The site includes the original outlines, trial-level scores, judge evidence, frozen skill files, and both protocol exclusions. [Open trial 1](https://vasirbenchmark.com/benchmark-report.html#storytelling-plot-twists/scifi-outline/trial-1).

The frozen storytelling skill plus its full twists reference substantially improved this panel's ratings of brief science-fiction outlines. The clearest improvement was not more surprises: revelations were more often prepared, changed what the protagonist had to do, and led to a consequential ending. This is a result about one prompt and a particular AI judging panel, not a validated measure of literary excellence or actual reader surprise.

## Experiment and coverage

Every fresh generation received exactly:

> Create a brief outline of a scifi story with one or more major plot twists

Four configurations each had ten plain generations and ten skill-assisted generations: 80 original attempts, with no rerolls. The treatment required complete byte-verified delivery of frozen `SKILL.md` and `references/twists-and-revelations.md`; the other frozen references remained progressively accessible. The baseline received no skill material. The rubric was frozen before generation and was not given to contestants. No extra numeric word limit was imposed.

All eighty attempts returned outlines. Seventy-eight passed the runtime protocol. Astra trial 9 and Terra trial 3 each lacked verified full delivery of one required reference chunk, despite attempting the read. Their original answers remain available. Neither a weak story nor an unfavorable score caused an exclusion.

The two invalid treatment rows and their two baseline counterparts were not scored. Both original judges completed all 38 eligible pairs: 76 fresh pair-review sessions and 152 answer assessments. The 160 planned assessments remain the denominator; eight are terminally excluded, not pending. No judge failed, and no valid answer or judgment was replaced.

## Primary, complete-cohort results

Scores are means on the frozen weighted 100-point rubric, computed from the two original judges without intermediate rounding. Each row below contains all ten declared trial pairs.

| Configuration | Plain | Skill + twists | Difference | Skill wins / ties / losses | Exploratory 95% paired interval |
|---|---:|---:|---:|---:|---:|
| GPT-5.6 Sol · ultra | 55.4 | 92.0 | +36.6 | 10 / 0 / 0 | +31.1 to +41.9 |
| GPT-5.6 Luna · max | 56.5 | 84.7 | +28.3 | 10 / 0 / 0 | +23.8 to +32.7 |

Unrounded differences are 36.625 and 28.25. The predeclared paired percentile bootstrap uses 10,000 resamples, seed 20260907 and the exact documented LCG/quantile procedure. These intervals describe repeated-generation variability conditional on this one task and panel; they do not cover different prompts, judges, readers, or skill editions.

The direction is not driven by just one judge. Astra xhigh's mean differences were +38.05 for Sol and +25.95 for Luna; Sol xhigh's were +35.2 and +30.55 respectively. Judges were independent sessions, not independent providers or training lineages.

## Incomplete-cohort diagnostics — not headline scores or comparable ranks

| Configuration | Valid pairs / planned | Plain, available pairs | Skill, available pairs | Available-pair difference | Wins / ties / losses |
|---|---:|---:|---:|---:|---:|
| GPT-6 Astra · ultra | 9 / 10 | 82.4 | 97.9 | +15.4 | 8 / 0 / 1 |
| GPT-5.6 Terra · ultra | 9 / 10 | 54.9 | 85.6 | +30.7 | 9 / 0 / 0 |

The preregistered ten-pair primary means, effects, intervals, and ranks remain withheld for these configurations. Their available-pair values are descriptive diagnostics only. The single observed loss was Astra trial 5: 92.0 plain versus 91.5 skill. Preserving that loss and the two verification failures is part of the result.

## What changed

For the two complete cohorts, the largest raw dimension improvement was **outcome and payoff**: Sol rose from 3.55 to 9.25 and Luna from 3.35 to 8.55 on the 1–10 scale. Retrospective fit, personal stakes, and causal coherence also improved materially. Major-twist impact improved too, but the stronger change was making the surprises function as a story.

Two separate fresh qualitative auditors read all retained outputs after generation, without inspecting the primary scores or skill text. Their reviews were unblinded and are not additional statistical judges. They found a recurring difference: a baseline often ended with another disclosure, whereas a treatment more often made the disclosure force a choice and pay it off. In Sol's skill trial 5, extracting a brother's stored data harms a refugee; learning that his remaining pattern sustains her turns the attempted rescue into a decision to delete him permanently. The ending is about remembering him rather than recovering him.

The treatment did not solve every problem. Repeated premises, family relationships, distress signals, simulated minds, coercive protection, and consent-based resolutions remained common. Some outlines resolved a moral question without fully resolving the physical survival problem. Technical escape routes occasionally arrived without sufficient preparation. Astra's baseline was already much stronger than the other baselines in these samples; the treatment should not receive credit for inventing capabilities already present.

Read the complete post-hoc audits in [Astra and Terra](qualitative-audit-astra-terra.md) and [Sol and Luna](qualitative-audit-sol-luna.md).

## Length and execution cost

These descriptive statistics include all ten retained outputs in each arm, including the two protocol-failed outputs. Word counts use whitespace separation and include headings/Markdown tokens. Durations are recorded per-session elapsed times under sixteen-way execution, not a dedicated latency experiment.

| Configuration | Mean words, plain → skill | Word ranges, plain / skill | Mean seconds, plain → skill |
|---|---:|---:|---:|
| Astra ultra | 174.1 → 228.1 | 157–199 / 192–252 | 64.8 → 327.6 |
| Sol ultra | 138.4 → 235.6 | 104–177 / 216–254 | 14.9 → 470.0 |
| Terra ultra | 127.0 → 212.9 | 109–183 / 150–252 | 12.8 → 221.5 |
| Luna max | 164.6 → 252.6 | 147–188 / 207–320 | 20.0 → 215.1 |

The extra input, reading, reasoning time, and output length are part of this combined intervention. This experiment does not identify a length-controlled effect or the twist reference's contribution separate from the master skill. The frozen snapshot contains 23 files totaling 461,347 bytes; the mandatory twists reference is 108,867 bytes.

The 80 generation attempts report 22,481,661 input tokens, including 19,985,792 cached input tokens; 340,206 output tokens, including 231,936 reasoning tokens; and 22,821,867 total tokens. The 76 distinct judge batches add 1,060,016 input and 161,219 output tokens, of which 130,077 are reasoning tokens. These are CLI-normalized cumulative accounting fields, not unique prompt bytes or final prose lengths. Output includes reasoning; cached input is a subset, not additional input. Unknown provider components must not be inferred from normalized zeros. Actual attributable dollar cost is unavailable.

Generation ran from 00:55:37 to 01:16:03 UTC on September 8, 2026, and judging from 01:16:24 to 01:26:10 UTC. Preparation, implementation, audits, and publication are outside those phase times.

## Interpretation boundaries

- This is one exact prompt with repeated samples, not broad storytelling coverage. An outline discloses its secrets, so judges assess design potential, not surprise experienced by an unsuspecting reader.
- The panel is Astra xhigh plus Sol xhigh: same provider, overlapping generator families, no human calibration. Anonymous labels cannot conceal all stylistic signals. Astra's valid skill outputs received eight perfect totals among eighteen individual reviews, with sixteen at least 95: a pronounced ceiling that limits discrimination. Very high ratings should not be read as near-perfect literary achievement.
- Within-pair order is deterministic, not balanced or counterbalanced: 23 eligible pairs show the skill answer first, 15 the plain answer first. Both judges see the same order.
- Luna uses its supported max setting; the other generators use ultra. This is not a uniform-effort comparison. Runtime-internal collaboration may occur in ultra; a CLI session is not necessarily one underlying agent.
- Exact model/effort requests are recorded. They are not independently provider-confirmed identity claims. Runtime source hashes are retained separately in the execution notes; the public evidence is not a full archived provider environment.
- No results from the Core idea or Dungeon Master benchmarks are pooled into these scores. Writing remains excluded from Overall.

## Reproducible evidence

Run: `storytelling-plot-twists-v1-2026-09-07`.

Final run SHA-256: `97d1172df61311ca493c53ef99d193d607652de9bc0827bba2d3d6ca3fb41399`.

The complete machine-readable analysis is retained at `tmp/plot-twists-benchmark/final-analysis.json`. It validates the sibling frozen snapshot and original publication provenance, then independently recomputes weighted ratings, unrounded panel means, trial differences, coverage, per-dimension means, and the bootstrap. Recreate it with `node benchmarks/storytelling-plot-twists/analyze.mjs PATH_TO_RUN_JSON NEW_REPORT_JSON`.

The frozen definition and full protocol are in `benchmarks/storytelling-plot-twists/`. Source/runtime hashes and the successful publication evidence are recorded in [execution-notes.md](execution-notes.md). Experiment completion and website publication are separately verified there.
