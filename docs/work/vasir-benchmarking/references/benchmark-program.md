# VasirBench Benchmark Program

This reference explains the benchmark portfolio, measurement axes, evidence standards, and defensible positioning. Product commitments and current lane state remain authoritative in [the work spec](../work-spec.md). The checked-in taxonomy becomes machine-authoritative only for categories and task mappings it actually declares.

## 1. Decision VasirBench serves

VasirBench helps one author decide:

1. Which model and reasoning configuration should I use for each recurring kind of work?
2. What changes when the same configuration receives one isolated Vasir skill?
3. What changes when it runs through the complete normally routed Vasir workflow?
4. Did a model release or Vasir edit improve quality, regress important behavior, or merely spend more time and tokens?

The primary product is a routing policy by job family, with quality, cost, latency, and failure evidence. A single overall winner answers only the separate question, "Which one configuration should be my default when I refuse to route?"

## 2. Experimental grid

Every result identifies four independent axes:

- **Task:** an unchanged benchmark case, fixture, and scoring contract.
- **Configuration:** provider, model, reasoning setting, tools, budget, and runtime.
- **Condition:** the exact steering or workflow intervention.
- **Trial:** one fresh execution under that exact basis.

Supported condition meanings:

| Condition | Assigned difference | Claim it can support |
| --- | --- | --- |
| Minimal baseline | Neutral task harness with no Vasir steering | Model/configuration capability under the declared harness |
| Isolated skill | One immutable named skill snapshot added at the declared insertion point | Marginal effect of that skill |
| Full Vasir | Vasir installed at the normal agent entrypoint, with ordinary routing, skill discovery, tools, and subagents available | Effect of the complete workflow as actually consumed |
| Vasir version | One exact full-workflow snapshot replaces another under the same remaining basis | Regression or improvement between workflow versions |

Condition labels must name what actually ran. An isolated skill is never displayed as "With Vasir." The full-Vasir label is reserved for the normal installed workflow path.

## 3. Provisional job-family taxonomy

These five programs describe the outcomes the author repeatedly hires AI to produce. They are a portfolio taxonomy, not a theory of independent cognitive faculties.

### Engineering

- **Terminal outcome:** working code, a correct technical design, or reliable system behavior.
- **Representative tracks:** Backend Architecture, Feature Delivery, Debugging, Performance and Reliability, Security and Verification.
- **Native evidence:** executable tests, artifacts, architecture invariants, operational behavior, and calibrated technical judgment.

### Games

- **Terminal outcome:** a coherent playable experience.
- **Representative tracks:** Game Design, Systems and Economy, Game Feel, Art/UI/Onboarding, Technical Performance.
- **Native evidence:** direct play, captures, deterministic or performance checks, player comprehension, and human feel judgment.

### Product Design

- **Terminal outcome:** a product decision, user journey, or interface that helps a person accomplish the intended goal.
- **Representative tracks:** Product Judgment, User Journeys, Interface Design, Visual and Interaction Craft, Growth and Social Loops.
- **Native evidence:** rendered and interactive artifacts, task success, comprehension, decision quality, and calibrated human judgment.

### Writing

- **Terminal outcome:** reader-facing prose that achieves its intended effect.
- **Representative tracks:** Fiction, Analytical Writing, Explanation, Editing and Voice.
- **Native evidence:** task-specific reader contracts, blind preference, human-calibrated anchors, and preserved full text.

### AI Workflows

- **Terminal outcome:** a reusable steering or workflow artifact that improves fresh agents.
- **Representative tracks:** Skill Design, Prompt Design, Agent Steering, Routing and Orchestration, Evaluation and Compounding.
- **Native evidence:** downstream performance on sealed tasks, invocation accuracy, negative transfer, tokens, latency, and cost. The steering artifact's prose receives no direct quality score.

## 4. Classification and promotion rules

Assign every benchmark one primary job family according to the terminal outcome being judged. Record other meaningful properties as tags, such as artifact type, proof type, domain, risk, or subtrack.

Examples:

- A prose architecture proposal belongs to Engineering.
- A game-design brief belongs to Games.
- A written product strategy belongs to Product Design.
- A skill intended to improve game creation belongs to AI Workflows, with `games` as a downstream-domain tag.

Do not count one benchmark in multiple category scores. Do not create a new top-level family merely because a model ranking changed on the current sample.

A target family may exist in this reference before it has evidence. The generated lab shows only measured families. A family rating remains `DEVELOPMENT` until it has:

- multiple benchmarks spanning at least two materially different task families;
- at least one sealed case that did not shape the workflow or rubric;
- a task-native scorer calibrated against human-authored anchors;
- complete required evidence for every compared configuration;
- repeated trials for close finalists, with uncertainty and a practical tie threshold.

Promote or split a family because it represents a distinct recurring author decision, terminal artifact, or proof regime. Ranking divergence on later unseen tasks may confirm that the distinction is useful.

## 5. AI Workflow evaluation

AI Workflow benchmarks are nested causal evaluations:

1. A creator configuration produces a skill, prompt, router, evaluator, or orchestration artifact.
2. Freeze that artifact and its dependencies.
3. Give it to fresh executor agents that did not participate in creation.
4. Run public regression tasks plus sealed downstream tasks through a fixed executor panel.
5. Compare against the same executors without the artifact.
6. Score downstream quality, false and missed invocation, regressions, tokens, latency, and cost.

The creator never receives the sealed executor tasks. A fluent-looking skill that does not improve downstream work has failed.

## 6. Scoring and aggregation

### Task level

- Use task-owned correctness gates and anchored quality dimensions.
- Preserve complete outputs and artifacts beneath every score.
- A defining-behavior, correctness, safety, or artifact-validity miss caps the task claim.
- Missing or invalid required evidence yields `INCOMPLETE` or `NO SIGNAL`, never a partial pass.

### Job-family level

- Rank provider/model/reasoning configurations separately for each condition.
- Show matched change for the same configuration on the same task.
- Declare task weights, coverage, calibration, trial count, and missingness.
- Treat the current peer-outrank index as cohort-relative. Adding weak or strong peers changes it, so it is not a stable cardinal capability score or Elo rating.
- Keep quality beside tokens, cost, and latency. The default view should expose the quality-cost frontier rather than silently pricing all quality gains at zero.

### Cross-family level

Category profiles and per-job routing remain primary. Publish one overall default-model score only after the author declares workload-frequency and regret weights, all included families have compatible calibrated contracts, and missing evidence stays visible. Never infer equal importance from the existence of five headings.

## 7. Judge and evidence validity

A scored panel is complete only when every configured judge produced a substantive schema-valid evaluation for every assigned candidate and every required synthesis record is present. Empty records, placeholder text, all-zero stubs without rubric-grounded reasoning, omitted candidates, and partially parsed outputs are failures.

The scoring basis must also:

- blind model and condition identity;
- counterbalance candidate order across judges or runs;
- calibrate each scoring version on fixed human-labeled strong, overbuilt, incomplete, counter-idiomatic-good, and boundary examples;
- expose panel spread as uncertainty rather than hiding it through synthesis;
- avoid constructing one numeric axis by opportunistically selecting differently calibrated raw judge totals candidate by candidate;
- audit family self-preference, verbosity preference, and order effects;
- retain negative transfer and failed treatments;
- rerun close finalists and report a meaningful tie band.

A synthesizer may adjudicate reasons, but its final score must use one declared anchored scale shared across candidates. The implementation may satisfy this through a calibrated final rubric record, a justified panel statistic, or another proven method. Selection convenience alone does not establish comparability.

## 8. Current evidence boundary

The current Backend Architecture artifacts are development evidence:

- They compare a minimal baseline with the isolated `plan__question-spec-architecture` skill. They do not exercise full Vasir.
- Chat, personalized feed, and device telemetry are useful variants of one closely related architecture doctrine, not broad independent coverage of Engineering.
- Each configuration has one trial per prompt.
- Author calibration is pending.
- The three latest featured artifacts contain 35 exact `Evaluation in progress.` judge placeholders across their panel records while the runs are marked complete: 10 chat, 10 feed, and 15 telemetry. Synthesis selected other records, effectively reducing those candidates to one substantive judge.
- The generated catalog currently hardcodes isolated-skill results as "With Vasir."

These failures block a completed two-judge-panel claim and any calibrated category rating. The saved generations remain useful. Scores become eligible only after incomplete evaluations fail closed, the cohorts are rescored under a comparable calibrated basis, and projections use the exact treatment label.

## 9. Positioning

Individual VasirBench ingredients have strong precedents:

- [SWE-bench](https://arxiv.org/abs/2310.06770) evaluates repository issue resolution.
- [ARC-AGI](https://arcprize.org/arc-agi/2) evaluates adaptation to novel abstract tasks.
- [SkillsBench](https://www.skillsbench.ai/blogs/skillsbench-1-1) compares matched no-skill, curated-skill, and generated-skill conditions.
- [Harness-Bench](https://arxiv.org/abs/2605.27922) compares model and agent-harness configurations.
- [GameDevBench](https://github.com/waynchi/gamedevbench) and [WritingBench](https://github.com/X-PLUG/WritingBench) cover game-development and writing tasks.

The defensible VasirBench claim is the combination:

> VasirBench is an author-specific, multidisciplinary model-selection and workflow-regression lab. It compares minimal-baseline capability, isolated-skill lift, normally routed full-workflow performance, negative transfer, cost, and version regressions using task-native evidence.

Do not claim that VasirBench is the first skill benchmark, a universal intelligence measure, a public frontier leaderboard, or an optimal taxonomy of model capability.
