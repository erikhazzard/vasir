# Compact Writing sample

The September 9, 2026 run samples Claude Fable 5.1 and Claude Opus 5 at low, medium, and max. It runs five distinct prompts once in each condition. It does not continue the historical repeated-trial backlog.

## Fixed size

| Benchmark | Prompts | Claude responses | Paired judge calls |
| --- | ---: | ---: | ---: |
| Plot twists | 3 | 36 | 36 |
| Place generation | 1 | 12 | 12 |
| One-shot adventure outline | 1 | 12 | 12 |
| Total | 5 | 60 | 60 |

These are 120 planned CLI sessions. Each judge session assesses both answers. Astra medium and Sol medium judge in fresh contexts with opposite candidate ordering; neither receives generator identity, condition labels, skill material, or the other review. Core idea and First discovery of magic reuse existing published evidence with zero additional calls.

## Execution contract

- Both creator conditions receive the exact same task and word limit.
- The assisted condition receives the declared root and relevant references once inline. No file-reading conversation or optional tools.
- Fresh isolated sessions, one Claude turn, 8,192 output tokens per segment including thinking, zero host/network retries, concurrency two. This is not a whole-session token cap: the CLI separately retries output-limit failures up to three times within that turn.
- No rerolls for quality, refusal, truncation, or a word-limit breach. Keep original answers; judge complete overlength answers under fulfillment.
- Stop affected dispatch on capacity or authentication failure. Preserve attempted inputs, raw provider output, identities, hashes, usage, and failure evidence.
- Four task-specific criteria, rated 0–5. Each judge's answer score is 20 times their mean rating; average the two original judges. Average tasks equally within the benchmark.
- Missing evidence is not zero. A benchmark rank requires the same full task and judge coverage.

Skill libraries remain unchanged. D&D is a domain tag, not a Writing capability or a compulsory 50% weight. The new one-shot evaluates narrative quality and agency, not mechanical completeness. Place generation evaluates writing and worldbuilding, not item mechanics.

The original max-reasoning dispatch was paused when that internal output-limit recovery consumed 32,768 thinking tokens without an answer. Original failures remain recorded; they are not scored or silently rerun. See `docs/work/vasir-benchmarking/writing-compact-20260909.md` for operational corrections and actual completion status.

## Publication

Use the shared source adapter and page components. New compact scores remain a separate edition; old reports, answers, and scores remain accessible. List the new benchmarks without silently adding six-Claude-only tasks to the broader leaderboard's required score basis. The established broad Writing basis is Core idea, the prior Plot twists edition, and First discovery of magic, equally weighted.

Adding a registered benchmark refreshes the standard rows, navigation, model comparisons, and answer reports. Registration does not dispatch model calls or automatically change a score basis.

## Planning and validation

```sh
node benchmarks/writing-compact-v1/plan.mjs
node --test test/writing-compact-plan.test.js
```

The planner is read-only. It enforces exactly the agreed six settings, five tasks, two conditions, one trial, and two judge seats. Actual execution, status, and publication evidence belong to the frozen run artifacts, not the plan.
