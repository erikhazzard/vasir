# Vasir Benchmarking: Provenance

Cold context retained because it would be costly to rediscover. The binding product decisions and current state live in `../work-spec.md`.

## Why this lane exists

The benchmark idea emerged while testing whether Vasir's architecture steering could stop fresh models from producing fashionable, overbuilt systems. A useful discriminator was hyper-scale chat: clean models repeatedly favored long-lived connections and multi-service streaming stacks, while the desired lasting shape used stateless bounded polling over a user-partitioned append log. The point was not to hardcode chat or Redis. It was to see whether a general skill could recover product requirements, force every component, preserve day-1-to-vFinal topology, and stop.

Early ad hoc comparisons were directionally useful but not clean experiments. Some “Vasir” agents received root instructions, Claude instructions, and skills while “clean” agents received none; prompts and context were not snapshotted; outputs were manually compared; and later prompts were already contaminated by discussion of the desired answer. Those runs motivated the controlled baseline/treatment contract and rotating holdouts, but they are not benchmark evidence.

The broader product decision treats Vasir as an opinionated personal workflow whose value should be demonstrable across models and tasks. Its benchmark therefore belongs in this repository and should evaluate the workflow without turning into a hosted benchmark company.

## Retained decisions from the first skill-eval feature

The earlier `docs/features/FEATURE-WIP__skill-evals.md` established a useful minimal base:

- one synchronous local command path;
- skill-owned public suites;
- baseline and treatment across model × case × trial;
- three trials by default;
- bounded provider concurrency;
- fixed, inspectable local history;
- successful rows survive partial provider failure;
- no hosted state, leaderboard, evaluator plugins, or per-skill JS by default;
- `run.json` is the sole durable artifact.

Those choices remain unless the canonical work spec explicitly changes them.

## What the old feature brief could not prove

- Every case was forced to use substring checks, which rewards wording and prevents genuinely semantic cases.
- `outputHint` was supplied to generation, so it could not safely double as hidden judging criteria.
- Baseline was always Output A and treatment Output B, exposing both position and condition bias.
- Judge evidence collapsed to winner/confidence/reason without structured gate and dimension results.
- The artifact did not preserve the exact complete message set sent to each generation.
- Historical comparison required the identical run-wide model set, so a new model could not simply extend a matrix.
- Text/JSON inspection did not deliver the clearly visible prompt matrix, raw trials, side-by-side outputs, or graphs the benchmark product requires.

The old brief is now a pointer to the canonical work-spec bundle rather than a second source of truth.

## Public regression and private holdout rationale

A public suite is valuable because it is reproducible, reviewable, and catches known regressions. It cannot prove untuned generalization once authors and skills have adapted to it. A sealed local holdout supplies that check, but only once: after its result changes the skill, the case is contaminated. Retire it into public regression coverage when safe, replace it with a fresh private case, and show its exact prompt only in the ignored local report.

This is deliberately a lightweight discipline, not a security claim. It protects against accidental prompt overfitting; it does not defend against a malicious benchmark runner or model with unrestricted access to the host filesystem.

## Method references worth retaining

- HELM's multi-scenario, multi-metric framing is a useful precedent for resisting one-number benchmark claims: <https://arxiv.org/abs/2211.09110>
- MT-Bench documents both the utility and limitations of strong-model comparative judges: <https://arxiv.org/abs/2306.05685>
- Position-bias work supports hiding condition identity and counterbalancing answer order: <https://arxiv.org/abs/2406.07791>
- LiveBench is a useful precedent for refreshing questions to reduce contamination: <https://arxiv.org/abs/2406.19314>

These sources inform the evidence shape. They do not override Vasir's local product constraints or task-owned human judgment.
