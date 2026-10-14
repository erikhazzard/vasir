# EVAL PLAN — Writing skill refresh

**Human Read:** Complete and live: the current skill improved both models on three Core Idea cases. The current publication contains twelve Core Idea answers and twelve paired reviews. The user requested removal of the separate MMORPG benchmark; its active definition and public data are removed, and the four-report catalog is live-verified. Four earlier failed launches are retained, including 79,892 reported tokens. Core Idea used nineteen completed calls with frozen instructions delivered inline and no reference tools. Original run receipts remain immutable locally.

## Proof Capsule

- **Last updated:** 2026-10-13
- **Work spec:** [VasirBench](../work-spec.md)
- **Why this plan exists:** The frozen rubric, reused answers, fresh executions, blinded judgments, and public report must retain one consistent basis across concurrent workers.
- **Owner / next action:** Root; completed the requested removal and verified the Core-only publication. [Results and live link](../../../../benchmarks/storytelling-skill-refresh/RESULTS.md). No model calls are needed.
- **Claim boundary:** Two exact model settings, one trial, three interpretation cases. Scores are automated judgments, not human taste acceptance or a general writing ranking. Reused answers may reflect provider changes since their original execution. This does not isolate the improvement over the previous skill version.

## Material risks and proof

| Risk | Sufficient observation |
| --- | --- |
| New rubric rewards copied terminology or predetermined morals | Freeze task-specific value/state/cause and evidence criteria before outputs; judge substance, allow ambiguity, hide skill and author identities |
| Treatment or evidence leaks between conditions | Fresh isolated runtime; frozen skill only in treatment; preserved exact prompts, exact inline-delivery receipts, answer provenance |
| Missing or invalid evidence becomes a favorable score | Validate complete paired reviews, derive weighted scores, retain all attempts and losses, never retry valid low scores |
| New subset silently changes the original leaderboard | One separate standard report; original three-benchmark aggregate and prior results remain unchanged |
| Public report differs from actual results | Recompute source scores and inspect the remaining live report, including original answers and closed-by-default evidence |

## Objective gates

### WRITING-REFRESH__G1 — Frozen, bounded execution

- **Claim / lie:** Each comparison uses the declared task, configuration, treatment, and scoring basis / mixed prompts, leaked context, or post-result rubric edits masquerade as a skill effect.
- **Setup:** `benchmarks/storytelling-skill-refresh/specification.json`, current skill snapshot, selected immutable Core Idea source. Three cases × two configurations; reuse valid plain answers.
- **Action:** The run-specific `run.mjs` prepares, generates, judges, and exports using existing `runStorytellingAgent` and snapshot functions. Commands: `node benchmarks/storytelling-skill-refresh/run.mjs prepare|generate|judge|status|export --run-dir .agents/vasir-evals/storytelling-skill-refresh/2026-10-12-inline-skill` (export also requires `--output`).
- **Observation / verdict:** All planned answer cells have original valid outputs and receipts; the frozen skill root and selected references are delivered verbatim once in the treatment, with the exact instruction and file hashes retained; each pair has two anonymous reviews with opposite ordering; rubric and treatment hashes match preparation. Core Idea required nineteen qualified calls, including the missing Sol Matrix baseline. Preserve the four prior failed launches and their reported usage separately; technical recovery is explicit and no qualified answer is replaced. Concurrency two; no automatic retries.
- **Authority / basis:** Local frozen specification, runtime, snapshots, native provider receipts.
- **Potency:** Credible oracle: exact source and receipt checks; malformed/missing ratings must be rejected in a synthetic validation check.
- **Blind spot:** Provider-internal changes, one-trial variation, shared judge-family preferences, and unobserved attention.
- **Stop:** Explicit provider exhaustion, invalid runtime isolation, changed frozen basis; retain affected attempt and diagnose without replacing quality failures.
- **State:** Objectively Green for the final qualified run; this establishes measurement integrity, not human literary acceptance.
- **Receipt:** [Independent source and score audit](../../../../.agents/vasir-evals/storytelling-skill-refresh/publication/independent-score-audit.json) includes all twelve Core Idea answer cells and twelve paired reviews, frozen delivery hashes and score arithmetic. [Selected source](../../../../benchmarks/storytelling-skill-refresh/publication.json) pins snapshot `071c75e0c0b9a8fb7d587a218625650b39ce7357bf7870c8709837063885245e`. Four failed launches and their usage remain in the source's technical recovery lineage. The immutable audit retains original run-wide usage and failed attempts; those totals include work outside the remaining published report.

### WRITING-REFRESH__G2 — Faithful public comparison

- **Claim / lie:** The user can compare both models and inspect the evidence on the normal benchmark site / a hand-edited score, missing answer, or incompatible aggregate hides the actual result.
- **Setup:** Complete exported run; new source adapter extending the existing Writing publication path and shared table/report components.
- **Action:** Existing publication tests and dry run, then normal `vasir benchmark publish`; inspect Core Idea and the four-report Writing catalog at desktop and mobile widths; confirm the removed report and its raw answer records are absent.
- **Observation / verdict:** Public weighted means exactly match source reviews; both plain and skill answers, dimensions, prompts and rationale are inspectable; disclosures start closed. Existing aggregate scores, answer inventory and model cohort remain intact. Live release bytes match the accepted candidate.
- **Authority / basis:** Frozen export and production `vasirbenchmark.com` routes.
- **Potency:** Credible oracle: independent score recomputation, exact-source preservation checks, real browser inspection.
- **Blind spot:** Browser and source checks establish truthful presentation, not human acceptance of literary quality.
- **Stop:** Incomplete evidence, privacy leak, source mismatch or publication failure; repair inside the declared scope.
- **State:** Objectively Green for the current publication. The shared layout is unchanged.
- **Receipt:** Release `0901eec134900d6bffd0c7f95ae0dc8a00b6d61145bef4080366170be981fee2` passed nineteen exact public-file checks, 151 targeted tests, and ten candidate plus ten live browser checks. [Live proof](../../../../.agents/vasir-evals/storytelling-skill-refresh/remove-mmorpg/browser/live/browser-evidence.json), [exact loaded bytes](../../../../.agents/vasir-evals/storytelling-skill-refresh/remove-mmorpg/browser/live/byte-comparison.json), and [preserved Core/aggregate evidence](../../../../.agents/vasir-evals/storytelling-skill-refresh/remove-mmorpg/publication-preservation.json). No model calls or further production changes.

## Harness inventory and missing need

Existing: `cli/eval/storytelling-agent-runtime.js`, `cli/eval/agent-runtime.js`, Writing publication adapters and shared report/browser checks.

The missing run-specific coordinator is warranted because existing runners cannot combine this new rubric, a three-case retained baseline subset without mislabeling the original benchmark. Its envelope is `benchmarks/storytelling-skill-refresh/run.mjs`, the specification, and focused validation tests. It must extend the existing runtime; no generic execution framework or provider dependency. Owner: runtime agent. Retain it to reproduce this edition.

Run locally once. Preserve frozen inputs, original outputs/reviews, receipt/usage evidence, source selection and public release verification. No automatic hill-climbing or repeat generation based on score.
