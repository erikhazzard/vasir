# VasirBench Benchmark Program

This reference explains the benchmark portfolio, measurement axes, scoring rules, and practical limits. Product commitments and current lane state remain authoritative in [the work spec](../work-spec.md). The checked-in taxonomy becomes machine-authoritative only for categories and task mappings it actually declares.

## 1. Decision VasirBench serves

VasirBench helps one author decide:

1. Which model and reasoning configuration should I use for each recurring kind of work?
2. What changes when the same configuration receives one isolated Vasir skill?
3. What changes when it runs through the complete normally routed Vasir workflow?
4. Did a model release or Vasir edit improve quality, regress important behavior, or merely spend more time and tokens?

The primary product is a routing policy by job family, with quality, cost, latency, and failure evidence. A workload-personalized default-model recommendation answers the separate question, "Which one configuration should be my default when I refuse to route?" The category-priority Overall v2 development index is defined in §6.

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

- **Terminal outcome:** a useful work-spec artifact or a steering/workflow artifact whose effect improves fresh agents, according to the declared track.
- **Representative tracks:** Work-Spec Generation, Skill Design, Prompt Design, Agent Steering, Routing and Orchestration, Evaluation and Compounding.
- **Native evidence:** work-spec quality uses source-grounded judgment of the artifact's value, commitments, and decision usefulness. Steering effectiveness uses downstream performance on sealed tasks, invocation accuracy, negative transfer, tokens, latency, and cost. Artifact quality and downstream effect are separate measurements.

## 4. Classification and promotion rules

Assign every benchmark one primary job family according to the terminal outcome being judged. Record other meaningful properties as tags, such as artifact type, proof type, domain, risk, or subtrack.

Examples:

- A prose architecture proposal belongs to Engineering.
- A game-design brief belongs to Games.
- A written product strategy belongs to Product Design.
- A skill intended to improve game creation belongs to AI Workflows, with `games` as a downstream-domain tag.
- A benchmark of work-spec generation belongs to AI Workflows, with the specified product or engineering domain recorded as a tag; it judges the quality of the planning artifact.

Do not count one benchmark in multiple category scores. Do not create a new top-level family merely because a model ranking changed on the current sample.

A target family may exist in this reference before it has evidence. The generated lab shows only measured families. A family rating remains `DEVELOPMENT` until it has:

- multiple benchmarks spanning at least two materially different task families;
- at least one sealed case that did not shape the workflow or rubric;
- a task-native scorer calibrated against human-authored anchors;
- complete required evidence for every compared configuration;
- repeated trials for close finalists, with uncertainty and a practical tie threshold.

Promote or split a family because it represents a distinct recurring author decision, terminal artifact, or proof regime. Ranking divergence on later unseen tasks may confirm that the distinction is useful.

## 5. AI Workflow evaluation

### Work-spec artifact quality

The work-spec track evaluates the planning artifact against the original request and the relevant evidence available at that decision point. Its central question is whether exact implementation would give the intended beneficiary the requested value. Engineering unlocks must have a supported connection to the experience they enable or protect. The judge does not invent business impact or require implementing the feature to evaluate the spec.

The [work-spec quality judge](work-spec-quality-judge.md) defines the six weighted dimensions, anchors, evidence requirements, readiness verdicts, intended Astra/Fable panel, and calibration probes. It evaluates recoverable meaning rather than template compliance. Real historical specs are mixed source material, not automatically gold examples; generation and maintenance cases retain their distinct inputs.

The initial experiment compares fresh work-spec generation under Minimal baseline and the frozen `plan__maintain-work-spec` skill. Hold the assigned brief, evidence, configuration, tools, budgets, and neutral output requirements fixed within each pair; hide model and treatment identity from Astra xhigh and Fable 5.1 max. Report which configuration is strongest in each condition and the matched skill-minus-baseline difference for each configuration. The best skill-assisted result need not have the largest uplift. Keep exact skill and Full Vasir condition labels distinct.

Controlled generation packets provide the assigned request and relevant evidence so source-grounded scores are comparable. Historical artifact diagnostics instead preserve conditional dimension ratings and claim-level verification notes without an aggregate benchmark score. Missing independent history must not erase assessable document qualities or be treated as proof that the candidate invented a claim. Conditional diagnostic ratings cannot establish request fidelity or enter generation rankings.

Begin with [one concrete chat task](../../../../benchmarks/work-spec-chat/task.md) and its first exploratory matched generation pair. This greenfield brief supplies the assigned product request and scenario facts; independent historical intake is unnecessary. Then expand coverage across user experience, engineering unlock serving an experience, and revision preserving existing commitments. Before a scored model matrix, a bounded sanity check uses one development case, its harmless restyling, and a known material omission: three variants judged independently by both panel members. Passing those six assessments is not a broad calibration claim or a prerequisite for drafting and trying the first case. Repeats and further checks follow observed disagreement or close finalists rather than a mandatory tournament. Preserve per-case scores, readiness, coverage, actual resources, and negative skill effects; never rank an incomplete configuration on only its surviving cases.

These results support a spec-quality claim. A separate downstream experiment is needed to establish execution usefulness. Task and family rollups must preserve that distinction and cannot silently pool scores from the two evidence regimes as interchangeable measurements.

### Downstream steering effectiveness

Steering-effectiveness benchmarks are nested causal evaluations:

1. A creator configuration produces a skill, prompt, router, evaluator, or orchestration artifact.
2. Freeze that artifact and its dependencies.
3. Give it to fresh executor agents that did not participate in creation.
4. Run public regression tasks plus sealed downstream tasks through a fixed executor panel.
5. Compare against the same executors without the artifact.
6. Score downstream quality, false and missed invocation, regressions, tokens, latency, and cost.

The creator never receives the sealed executor tasks. A fluent-looking skill that does not improve downstream work has failed this downstream-effectiveness evaluation, regardless of its artifact-quality judgment.

## 6. Scoring and aggregation

### Task level

- Use task-owned correctness gates and anchored quality dimensions.
- Preserve complete outputs and artifacts beneath every score.
- A defining-behavior, correctness, safety, or artifact-validity miss caps the task claim.
- Missing or invalid required evidence yields `INCOMPLETE` or `NO SIGNAL`, never a partial pass.

### Job-family level

- Rank provider/model/reasoning configurations separately for each condition.
- Show matched change for the same configuration on the same task in rubric points.
- Declare task weights, coverage, calibration, trial count, and missingness.
- Publish the fixed-edition equal-weight mean of task-local rubric scores as the primary `/100` value. Adding a model may change rank but must not change an incumbent score.
- Keep percentile, peer-outrank, Elo, Bradley–Terry, and win-rate signals in separate named units if a future preference view needs them; none may masquerade as the primary task score.
- Keep quality beside tokens, cost, and latency. The default view should expose the quality-cost frontier rather than silently pricing all quality gains at zero.

### Cross-family level

Category profiles and per-job routing remain primary. Overall v2 uses declared category priorities under M1P in the [work spec](../work-spec.md): Engineering, Games, and Product Design each 25%; Writing and AI Workflows each 12.5%. Tasks have equal weight within their category. The development index normalizes priorities over globally measured categories and exposes both measured-category coverage and covered target weight. All five categories appear in navigation; unmeasured ones show Coming soon without a score. Only exact configurations with assessable results in both conditions for every published task receive an Overall score; incomplete configurations retain visible coverage gaps and null scores. Its scope spans the declared task rubric editions and task-specific skills, with calibration pending.

A future workload-personalized default-model recommendation requires declared workload-frequency and regret weights, compatible calibrated contracts across the included families, and visible missing evidence. Never infer equal importance from the existence of five headings.

## 7. Judge aggregation

Engineering v1 scores one matched Minimal-baseline/Architecture-skill pair per prompt. Each prompt goes independently to this fixed panel:

- `codex:gpt-5.6-sol@ultra`
- `codex:gpt-5.6-terra@ultra`
- `claude:opus@max`

There is no synthesizer. For each answer, gate decisions use the three-judge majority and each 0–4 dimension uses the median rating. The benchmark then recomputes the weighted 0–100 task score and applies any majority-failed gate cap. Every judge must return one substantive schema-valid record for both answers; an empty, placeholder, omitted, or partially parsed record leaves that pair incomplete.

One pair per prompt keeps scoring local to the compared model setting. Candidate order is blinded and counterbalanced, and each row's score identity contains only its own rubric, response, judges, and aggregate. Adding another model creates another pair; it never changes an incumbent prompt, score, or uplift. Per-judge totals and spread are retained for inspection, while close finalists need repeated trials before a meaningful tie claim.

## 8. Engineering v1 baseline

The first baseline uses three fixed Backend Architecture tasks:

- Hyper-scale chat architecture
- Personalized home-feed architecture
- High-volume device telemetry architecture

Each configuration has one Minimal-baseline response and one Architecture-skill response per task. Saved generations can be rescored without rerunning models. Engineering v1 applies the same three-judge panel and deterministic aggregation to every selected response, then computes each condition's score as the equal mean of the three task scores. Uplift is `Architecture skill - Minimal baseline` in rubric points. Rank is secondary.

These tasks are closely related architecture variants, so the current board is a useful development baseline rather than broad Engineering coverage. It uses one trial per task and does not estimate a confidence interval. A new model needs only its six generations and nine judge calls; incumbent rows remain untouched. A task, rubric, generation contract, judge panel, aggregation rule, or trial-policy change creates a new edition instead of rewriting Engineering v1.

Historical two-judge-plus-synthesizer runs remain immutable diagnostics. They are not mixed with Engineering v1 scores.

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
