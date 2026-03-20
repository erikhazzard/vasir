# FEATURE-WIP — SKILL_EVALS
**Last updated:** 2026-03-19  
**Status:** In Progress  
**Owners:** Erik Hazzard  
**Stakeholders:** Vasir maintainers

**Purpose:** Define the smallest production-worthy Vasir eval system: one command, one synchronous run loop, one durable run artifact, and one suite contract so skill authors can tell whether a skill helped, hurt, or failed to move output.  
**Core User Journey Value Unlock:** A skill author can edit a skill, run one command, and decide whether to keep, revise, or revert the change.  
**Core System Unlock:** Turns skill iteration from vibes into a local measurement loop with inspectable evidence.

**Primary entry point(s):** `vasir eval run <skill>`, `vasir eval inspect <skill> [run-id]`, `vasir eval rescore <skill> [run-id]`  
**Related docs:** [README.md](../../README.md), [docs/cli-reference.md](../cli-reference.md), [docs/writing-skills.md](../writing-skills.md)

**Change Log:**
- 2026-03-19 — Collapsed the public suite contract to hard checks plus optional `judgePrompt`.
- 2026-03-19 — Rejected `mode: "command"` and `mode: "judge"` suites at the suite boundary.
- 2026-03-19 — `run.json` is the only durable eval artifact.

---

## 1) North Star

### 1.1 User journey

1. Author edits a skill.
2. Author runs `vasir eval run <skill>`.
3. Vasir loads `skills/<skill>/evals/suite.json`.
4. Vasir runs baseline and treatment for each `model x case x trial`.
5. Vasir scores hard checks and, if `judgePrompt` exists, runs the fixed OpenAI + Anthropic judges.
6. Vasir writes one run artifact and prints a verdict.

### 1.2 Success criteria

- The author can answer:
  - Did the skill beat no skill?
  - Did this version beat the previous version?
  - Which model benefits most or least?
  - Why did the result move?
- The answer does not require reading raw JSON first.

### 1.3 Happy-path sequence

```text
Author -> CLI: vasir eval run <skill>
CLI -> Suite: load cases + optional judgePrompt
CLI -> Models: generate baseline outputs
CLI -> Models: generate treatment outputs
CLI -> Hard scorer: score each pair
CLI -> Fixed judges: compare baseline vs treatment (optional)
CLI -> Filesystem: write run.json
CLI -> Author: BETTER/WORSE/INCONCLUSIVE + why
```

---

## 2) Non-Goals

- No plugin surface for custom evaluators.
- No background workers, queues, or hosted state.
- No public leaderboard, ELO, or benchmark product in this milestone.
- No per-skill JS evaluator code.
- No promise that every skill can be perfectly judged by this harness.

---

## 3) Current State

### 3.1 Facts

- Eval suites are skill-owned and resolve from `skills/<skill>/evals/suite.json` or `.agents/skills/<skill>/evals/suite.json`.
- Every current suite uses one authoring shape:
  - required and forbidden substring checks per case
  - optional suite-level `judgePrompt`
- The semantic judge layer is fixed to:
  - `openai:gpt-5.4`
  - `anthropic:claude-opus-4-6`
- `run.json` is the durable artifact.
- `inspect` reopens saved artifacts and shows pair movement plus saved judge reasons.
- `rescore` recomputes hard checks only.

### 3.2 Known weaknesses

- Hard checks are still substring-based and can overfit wording.
- Dual judges still include self-judging when the tested model is also a fixed judge.
- Some suites are still not hard enough to prove real steering.

---

## 4) Contracts & Invariants

### 4.1 Public suite contract

- Required:
  - `id`
  - `cases`
- Optional:
  - `title`
  - `judgePrompt`
- Each case must define:
  - `id`
  - `task`
- Each case may define:
  - `outputHint`
  - `requiredSubstrings`
  - `forbiddenSubstrings`

### 4.2 Forbidden public shapes

- `mode`
- `judge`
- `validator`

Those fields are not part of the suite contract. The runtime rejects them with `EVAL_SUITE_INVALID` and a migration suggestion.

### 4.3 Experience invariants

- Only the skill changes between baseline and treatment.
- Hard-check regressions are always visible, even when judges prefer treatment.
- The report must separate overall results from per-model results.
- Historical comparisons must require matching suite hash, trial count, scorer version, harness version, model set, and evidence mode.
- `NO SIGNAL` is a valid outcome.

---

## 5) Architecture

### 5.1 Components

1. CLI runner
2. Provider adapter layer
3. Local filesystem artifact store

### 5.2 Request path

1. Resolve the skill and suite.
2. Build the baseline/treatment row plan.
3. Generate outputs with bounded concurrency.
4. Score hard checks.
5. If `judgePrompt` exists and both fixed judges are available, judge each pair.
6. Build the bottom line and per-model breakdown.
7. Write `run.json`.
8. Print text output or emit JSON.

---

## 6) CLI Contract

### 6.1 Run

```bash
vasir eval run <skill>
```

- Defaults:
  - 3 trials
  - fixed dual judges when `judgePrompt` exists and both judge providers are available
- Overrides:
  - `--model`
  - `--trials`

### 6.2 Inspect

```bash
vasir eval inspect <skill> [run-id]
```

- Shows:
  - overall verdict
  - pair movement
  - baseline output excerpt
  - treatment output excerpt
  - judge reasons when present

### 6.3 Rescore

```bash
vasir eval rescore <skill> [run-id]
```

- Recomputes hard checks from saved outputs.
- Does not rerun providers.
- Requires the current `run.json` shape with saved rows and case snapshots.

---

## 7) Data Model

`run.json` stores:

- run metadata
- skill hash
- suite hash
- model IDs
- judge status and judge models
- rows
- pairs
- summary
- bottom line
- previous-run comparison
- previous-version comparison

`run.json` is the only durable eval artifact.

---

## 8) Comparability

Two runs are comparable only if all match:

- suite hash
- trial count
- scorer version
- harness version
- model set
- primary evidence mode
- judge model set when judge-led
- complete run status

If not, the report must say `NOT COMPARABLE` and explain why.

---

## 9) Diagnostics & Failure

- Provider row failures do not discard successful rows.
- Incomplete runs are persisted and shown as `INCOMPLETE`.
- If `judgePrompt` exists but the fixed judge layer is unavailable, the hard-check section still renders, but the top-line verdict fails closed to `NO SIGNAL` unless the hard floor regressed.
- If a suite uses unsupported suite fields, the command fails fast with `EVAL_SUITE_INVALID`.

---

## 10) Next Actions

- Tighten built-in suites so baseline is genuinely tempted into the wrong default path.
- Keep improving judge transparency around self-judging and coverage.
- Consider stronger semantic scoring only after suite quality improves.

---

## 11) Source Map

- [install/command-runner.js](../../install/command-runner.js)
- [eval/run-skill-eval.js](../../eval/run-skill-eval.js)
- [eval/suite-source.js](../../eval/suite-source.js)
- [eval/evidence.js](../../eval/evidence.js)
- [eval/history.js](../../eval/history.js)
- [eval/inspect-skill-eval.js](../../eval/inspect-skill-eval.js)
- [eval/rescore-skill-eval.js](../../eval/rescore-skill-eval.js)
