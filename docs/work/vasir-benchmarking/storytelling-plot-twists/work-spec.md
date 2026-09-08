# Writing → Storytelling → Plot twists v1

Status: **preregistered-ready**. This work specification records the experiment and intended publication before scored generation; it contains no claimed results.

## User intent and scope

Run multiple fresh controlled comparisons on the exact prompt `Create a brief outline of a scifi story with one or more major plot twists`, with and without the master `writing-storytelling` skill and its twists reference, and publish the benchmark. The user prompt is preserved byte for byte without punctuation additions, an answer template, coaching, or a numeric output limit.

Plot twists is a separate benchmark under Writing → Storytelling. Core idea remains available with its existing immutable source, answers and scores. Writing stays excluded from Overall. Publication must provide all declared trials rather than a selected set of attractive outputs.

## Pre-registered inventory and treatment

The scoring authority is `benchmarks/storytelling-plot-twists/benchmark.json`; execution, blinding, analysis and recovery are specified in its `methodology.md` and `RUNBOOK.md`. The edition is `storytelling-plot-twists-v1`; the single case ID is `scifi-outline`.

| Generator | Configured effort | Trials per condition |
|---|---|---:|
| `codex:gpt-6-astra` | ultra | 10 |
| `codex:gpt-5.6-sol` | ultra | 10 |
| `codex:gpt-5.6-terra` | ultra | 10 |
| `codex:gpt-5.6-luna` | max | 10 |

There are 80 fresh generation rows, 40 matched trial pairs, two original judge seats per pair, 80 pair-level judge calls and 160 individual answer assessments. Luna explicitly uses max because its registry does not support ultra; this is a mixed-effort inventory, with no hidden fallback. Ultra may include internal collaboration and is not represented as a pure reasoning-effort manipulation.

The skill condition receives the frozen master root and must successfully read the complete frozen `references/twists-and-revelations.md` before answering. Other skill references remain progressively available. Record the exposure policy and successful read evidence. The plain condition receives no skill material. All other supported runtime/provider controls are matched and their limits disclosed.

The generation seed is `storytelling-plot-twists-v1-generation`; preparation freezes the model inventory, root and references, exact invocation, task, rubric, panel, runtime/source identifiers and operational settings before generation. Valid answers and judgments are never rerolled for quality. Failures and missingness remain visible with the original denominators.

## Panel and score contract

The two fresh blinded judges are `codex:gpt-6-astra@xhigh` and `codex:gpt-5.6-sol@xhigh`. The same-provider panel is deliberately declared because Claude Fable judging capacity was already exhausted in the predecessor. It is not cross-provider validation; its judge families overlap with the generators. Judges receive only the task, fixed rubric, opaque candidate labels and full answers in a tool-free fresh context, without skill contents or each other's scores.

The existing deterministic within-pair candidate order is used for both judges. This edition does not claim counterbalanced presentation or measurement of position bias. Anonymous labels do not eliminate recognizable style.

The seven dimensions use integer 1–10 ratings with weights 10/10/20/20/15/10/15. A strong single twist can receive full marks. The rubric assesses brief-outline usefulness, science-fiction integration, causal coherence, major-twist impact and surprise, reveal fairness and retrospective fit, character stakes and response, and outcome and payoff. It does not require a helix, positive arc, moral, dark tone, greater length, multiple twists or copied craft jargon. Material contradictions, unfair essential secrets and absent consequential outcomes affect their relevant anchored dimensions at outline granularity.

There are no gates, score caps or synthesizer. Each judge's weighted total is `sum(weight × rating / 10)`; the panel score is the mean of the two originals, occupying 10–100 for assessable responses. Missing evidence is null. Both arms and both judge seats across all ten trials are required for a configuration's declared-cohort score, effect, interval and comparable headline rank.

The primary effect is the mean paired skill-minus-plain difference per configuration. Report the predeclared informational paired percentile bootstrap: 10,000 resamples, uint32 LCG with multiplier 1664525 and increment 1013904223, seed 20260907 reset per configuration, trial-number order, and linear-interpolated 2.5/97.5 percentiles. It is conditional on the single exact prompt and panel, imprecise at ten trials, and does not establish general storytelling superiority, actual reader surprise, or an independent reference effect.

## Public evidence and acceptance

The additive Writing publication must expose the exact prompt, all ten trials, full original paired answers, both original judge ratings and rationales, seven rubric dimensions, per-trial results, missingness, input overhead, output length and resource accounting. Distinguish the injected root, mandatory successfully read twists reference, and optionally accessed references. Freeze the full snapshot and source identifiers; redact credentials, private temporary paths and diagnostic stream data through the existing allowlist.

The Writing collection and report need a benchmark picker and a trial picker whose selected benchmark, prompt, model setting, condition and trial identify the same evidence. Preserve Core idea routes and scores, and keep Overall unchanged. Report labels must correctly state two same-provider judges, Luna max versus the other configured ultra modes, one prompt with repeated trials, and provisional statistical interpretation.

Verify the new definition through the source resolver before preparing a scored run. Exercise relevant runtime, scoring, projection and publication checks after implementation. Review desktop/mobile benchmark and trial selection against real source evidence. Renew shared acceptance only after the final source and browser checks, then use the guarded dry-run, immutable publication, live-byte verification and browser proof. A preregistration, local rehearsal or selected source alone is not a claim that the published benchmark is complete.
