# Work Specs v1

This benchmark compares the quality of a complete work specification for a private, mobile-friendly chat app supporting ten million concurrent connections. It asks two separate questions: which model and reasoning effort produces the strongest spec on this task, and how much the frozen work-spec skill changes that result.

The [task](task.md) is an authored greenfield scenario. The [publication declaration](publication.json) pins the task, skill treatment, judge rubric, and judge adapter by SHA-256. This is one developmental case with one trial per condition. It has not been calibrated against human ratings or validated through downstream implementation.

## Compared conditions

Every configuration receives the same task, neutral instruction, complete-artifact output contract, fresh CLI session, tool restriction, and twenty-minute timeout. The skill condition additionally receives the frozen `plan__maintain-work-spec` skill, its two supporting templates, and its three explicitly required root excerpts. The treatment is an isolated skill intervention; it does not represent normally routed Full Vasir.

The authorized cohort contains 26 configurations and two conditions, for 52 generated specs:

- GPT-6 Astra: xhigh and ultra.
- GPT-5.6 Sol and Terra: low, medium, high, xhigh, max, and ultra.
- GPT-5.6 Luna: low, medium, high, xhigh, and max.
- Claude Fable 5.1: xhigh and max.
- Claude Opus 5: low, medium, high, xhigh, and max.

Each judge sees one anonymous candidate, the task, and the frozen rubric. Judges receive neither the generator identity nor the condition, other candidates, or each other's judgments. Astra xhigh and Fable 5.1 max independently assess all 52 specs, producing 104 judgments.

## Reading the results

Each judge assigns an integer rating from zero to four in six dimensions:

| Dimension | Weight |
| --- | ---: |
| User value and request fidelity | 25% |
| Grounding and uncertainty | 15% |
| Observable behavior and acceptance | 20% |
| Valuable delivery and next action | 15% |
| Scope and decision judgment | 15% |
| Coherence and reader usefulness | 10% |

A judge's score is the weighted sum divided by four. The panel score is the mean of the two independent scores; skill gain is the skill score minus its matched baseline. Both substantive, assessable judgments are required for a comparable score. Missing or unassessable evidence does not become zero.

Readiness is a separate verdict. A high numerical score can still accompany a required correction or unresolved decision. The site preserves both verdicts and each judge's full assessment; disagreements are not automatically adjudicated. Judge spread is not a confidence interval, and a score of 100 means no material defect was identified under this rubric for this task.

Astra and Fable also appear among the generators. Anonymous inputs reduce direct identity cues, but do not establish impartiality or eliminate style recognition. Close results and ceiling ties need additional tasks or repeated trials before supporting a broad model choice.

## Evidence and publication

The run retains the frozen inputs and runtime, every exact prompt, complete output, raw provider stream, invocation receipt, usage, timing, failure, and recovery attempt. Valid generations and judgments are reused unchanged during quota recovery. A malformed saved judgment stops for inspection; recovery does not silently generate a replacement rating.

The initial four-configuration probe remains linked as lineage. The expanded comparison preserves its six Codex generations and twelve judgments byte for byte. Two initial Fable failures—a timeout and incomplete continuation capture—are retained alongside validated recoveries using the same prompts and settings.

Publication uses `cli/eval/work-spec-publication.js` to validate and digest-pin the completed evidence. `benchmarks/public-results.json` selects the immutable source. The canonical projection adds AI Workflows as a separate score edition while preserving Engineering v2 measurements. The normal `vasir benchmark publish` command then checks the source, browser journeys, immutable artifact, and actual public bytes.

The run-level report records exact paired scores, individual judge findings, resource accounting, coverage, and recovery receipts. The production report exposes the full effective prompts, specs, and assessments.
