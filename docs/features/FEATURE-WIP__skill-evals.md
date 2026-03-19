# FEATURE-WIP — SKILL_EVALS
**Last updated:** 2026-03-18  
**Status:** Draft  
**Owners:** Erik Hazzard  
**Stakeholders:** Vasir maintainers

**Purpose:** Define a Vasir-native evaluation system that measures whether a skill actually improves model behavior on a task suite, compared against the same request without the skill and against prior versions of the same skill.  
**Core User Journey Value Unlock**: A skill author can change a skill, run one command, and see whether the change helped, hurt, or failed to move outputs on representative tasks.  
**Core System Unlock**: Turns "skills are the product" into a measurable contract instead of a belief.

**Primary entry point(s):** `vasir eval run <skill>`, `vasir eval history <skill>`, `vasir eval compare <run-id-a> <run-id-b>`  
**Related docs:** [README.md](../../README.md), [MANIFESTO.md](../../MANIFESTO.md), [docs/writing-skills.md](../writing-skills.md), [docs/work/WORK.md](../work/WORK.md)

**Change Log:**
- 2026-03-18 — Created initial feature spec for skill evals.
- 2026-03-18 — Defined baseline/treatment protocol, scorer model, history model, and phased rollout.

---

## Doc Conventions (Do Not Delete)

- **Stable structure:** Do not reorder or rename top-level sections `1..11`.
- **Stable IDs:** Never renumber existing IDs. Append new IDs only.
  - Facts: `F-###`
  - Unverified: `U-###`
  - Inferences: `I-###`
  - Plans: `P-###`
  - Contracts/Invariants: `C-###`
  - Sources: `SRC-###`
  - Actions: `A1`…`A5`
  - Milestones: `M1`, `M2`, `M3.1` (no duplicates)
- **Truth labeling:** If it’s not sourced, it must be `[UNVERIFIED]` even if it seems obvious.
- **Contracts live in Section 4 only.** Elsewhere, reference `C-###` rather than restating rules.
- **Keep it compact:** Next actions ≤ 5. Facts target ≤ 15 bullets. References target ≤ 20.

---

## 1) North Star (User Experience)

### 1.A North Star user journey - Product Grounding & Experience
*Before we define the code, we must define the reality we are building.*
For EVERY milestone for this feature, we must have:

##### 1.A.i For the North Star vision:
* **Actor:** Skill author / repo maintainer.
* **Entry Point:** `vasir eval run react --suite react-core --model openai:gpt-5.4 --model anthropic:claude-sonnet-4`.
* **Steps:**  
  1. Author edits a skill.  
  2. Author runs an eval suite against one or more models.  
  3. Vasir runs the same task set under baseline and treatment conditions.  
  4. Vasir scores outputs with objective checks first and comparative judging second.  
  5. Author reads lift, regressions, cost, and history before deciding whether to keep the change.
* **Success:** The author can answer "did this skill change improve steering?" with a report that is reproducible, traceable, and comparable to prior runs.
* **Non-Goals:** Build a universal public benchmark, replace all human review, or prove absolute model quality independent of Vasir skills.

#### 1.A.ii **Experience Invariants** (The "It's Not Real Unless..." List)

- If the only intended variable is the skill, then every other variable must stay fixed, otherwise the comparison is invalid.
- If treatment does not beat baseline beyond noise, the report must not imply improvement.
- If a run claims improvement, the author must be able to inspect the exact prompts, artifacts, scorer outputs, and costs that produced the claim.
- If a skill regresses on a known task family, history must make that regression visible against prior skill versions.
- If an eval is partially subjective, the rubric must still produce a comparable pairwise decision, not vibes.

#### 1.A.iii ***The "Obviousness Audit"**

- **The Assumption:** "Without the skill" and "with the skill" mean exactly one variable changed.  
  **The Technical Implication:** Baseline/treatment envelopes must be content-addressed and stored with full run metadata.
- **The Assumption:** If a skill helps one model and hurts another, the report shows that split instead of flattening it away.  
  **The Technical Implication:** Results aggregate globally and per model.
- **The Assumption:** The eval can detect "worse but longer" outputs.  
  **The Technical Implication:** Pairwise judging should be blind and length-aware; hard checks should remain primary when available.
- **The Assumption:** The history is about the skill, not just the date.  
  **The Technical Implication:** Every run must record a stable skill hash and suite hash.
- **The Assumption:** A failed eval is still useful.  
  **The Technical Implication:** Store raw failures, tool errors, and partial scores instead of collapsing everything into one pass/fail bit.

---

## 2) Non-Goals (Scope Guardrails)

- We are not building a public Vasir leaderboard in the first version.
- We are not trying to benchmark raw frontier models independent of skills.
- We are not trying to fully automate nuanced human taste with a single scalar.
- We are not trying to support arbitrary external harnesses in M1.
- We are not making live network calls part of automated CI truth for this repo.

---

## 3) Current State

### 3.1 What is true today (FACTS / UNVERIFIED / INFERENCE / PLAN)

- [FACT F-001 | Confidence: High] Vasir’s product claim is that skill files push LLM output away from the statistical mode and toward specific architectural choices. — (SRC-001)
- [FACT F-002 | Confidence: High] The repo currently verifies CLI behavior, registry generation, layout, and docs-link integrity, but does not verify whether a skill changes model behavior as intended. — (SRC-002, SRC-003)
- [FACT F-003 | Confidence: High] The repo treats markdown as the product and local ownership as the preferred posture. — (SRC-001, SRC-004)
- [FACT F-004 | Confidence: High] The repo’s active implementation contract prefers zero runtime dependencies, Node builtins only, and deterministic automated tests. — (SRC-004, SRC-005)
- [FACT F-005 | Confidence: High] Vasir already frames skills as control surfaces and now explicitly names spec drift / spec debt as product debt. — (SRC-001)
- [FACT F-006 | Confidence: Medium] OpenAI recommends combining task-specific evals with metric-based, human, and model-graded evaluators rather than relying on generic academic metrics alone. — (SRC-006)
- [FACT F-007 | Confidence: Medium] Anthropic recommends task-specific eval datasets, measurable multidimensional criteria, and using the fastest reliable scalable evaluator available for the task. — (SRC-007, SRC-008)
- [FACT F-008 | Confidence: Medium] Public benchmark patterns differ by domain: code benchmarks skew toward executable pass/fail evaluation, while instruction-following benchmarks often use pairwise preference or LLM-as-judge. — (SRC-009, SRC-010)
- [INFERENCE I-001] Vasir should evaluate `model + steering artifact` rather than raw model quality, because that is the actual product unit. — supported by F-001, F-003, F-005 — Disprove if: Vasir’s product shifts away from checked-in skills as the main steering unit.
- [INFERENCE I-002] A useful Vasir eval system should combine hard artifact checks with blind pairwise judging, because either alone is insufficient across all skill types. — supported by F-006, F-007, F-008 — Disprove if: one scorer class proves reliably sufficient across suites.
- [INFERENCE I-003] History should be keyed by skill content hash and suite version, not only timestamp, because authors care about regressions across skill revisions. — supported by F-001, F-005 — Disprove if: authors primarily compare ad hoc runs rather than evolving skill versions.
- [PLAN P-001] Introduce a first-class `eval` subsystem that runs fixed suites under baseline and treatment conditions, stores run artifacts, and computes skill lift. — (links: M1 / C-001)

### 3.2 What’s broken / missing (gaps vs North Star)

- There is no way to prove that a skill revision improved steering.
- There is no benchmark corpus of representative tasks for Vasir skills.
- There is no stored history of skill performance across revisions.
- There is no common scoring protocol for code-style, architecture-style, or writing-style skills.
- There is no safe line between live provider evals and deterministic repo tests.

### 3.3 Next actions (max 5, concrete)

- (A1) Lock the run protocol and result schema — done when Section 4 can drive a CLI and storage design without hidden assumptions.
- (A2) Choose 2-3 flagship skills for initial suites — done when M1 has named suites with concrete cases.
- (A3) Decide the repo layout for eval code, suites, and local result storage — done when paths and ownership are explicit in Section 6.
- (A4) Define the first report format — done when an author can tell "better/worse/noise" from one terminal report.
- (A5) Decide what stays deterministic in CI vs what remains opt-in live evaluation — done when M1 and M2 verification boundaries are explicit.

---

## 4) Contracts & Invariants (SOURCE OF TRUTH)

This section is authoritative. Any hard constraint, invariant, cap, ordering rule, privacy redline, or “empty vs missing vs error” semantic must live here as a `C-###`.

### 4.1 Definitions (recommended)

- **Skill condition** — the exact steering bundle applied to a run, including the chosen skill files and their content hashes.
- **Baseline** — the same task, model, and harness with no selected skill applied.
- **Treatment** — the same task, model, and harness with one selected skill condition applied.
- **Suite** — a versioned collection of cases, fixtures, tasks, and scorer definitions.
- **Case** — one eval instance within a suite.
- **Hard scorer** — deterministic executable or rule-based scorer.
- **Soft scorer** — pairwise LLM judge or human judge.
- **Skill lift** — treatment metric minus baseline metric under the same suite/model protocol.

**T-Shirt Sizing** (used in Milestone Index, Section 5.1):
In an LLM-assisted codebase, time is not the bottleneck — judgment surface area and blast radius are. Size by these dimensions:

**Complexity**: how many systems/surfaces touched, how many judgment calls required  
S = one harness path, one scorer type  
M = multiple scorer types, local artifact handling  
L = live provider matrix, pairwise judging, history, report UX  
XL = full agentic sandbox orchestration across heterogeneous providers

**Risk**: what breaks if we get it wrong  
S = local-only feature, no shipping claims  
M = misleading reports, wasted provider spend  
L = false conclusions about skill quality guide product decisions  
XL = benchmark theater becomes repo truth

**Perf Impact** (hot path load delta)  
S = no product hot-path change  
M = local CLI latency only  
L = large live eval runs and storage volume  
XL = always-on cloud eval service

**Cost Impact**: (infra $ delta, when applicable)  
S = negligible local cost  
M = modest API spend for sampled runs  
L = regular cross-model eval spend requires approval  
XL = large recurring provider/judge cost

### 4.2 Experience invariants (“It’s not real unless…”)

- [C-001 | Must] Baseline and treatment runs for the same comparison must keep task input, model ID, sampling settings, suite version, and harness version constant; only the skill condition may vary.
- [C-002 | Must] Every reported score must be traceable to raw artifacts: task input, prompt envelope, model response, scorer output, and provider metadata.
- [C-003 | Must] Reports must show per-model results and aggregate results separately.
- [C-004 | Must] Historical comparisons must key off skill content hash plus suite version, not only timestamps.
- [C-005 | Must] "No significant change" is a valid outcome and must be reported explicitly.
- [C-006 | Must Not] The system must not claim that a skill is better overall when the measured lift is confined to one model or one suite slice.

### 4.3 Safety / Privacy (Must / Must Not)

- [C-010 | Must] Eval suites must declare whether they are local-only fixtures or require live provider traffic.
- [C-011 | Must Not] Real provider keys, private prompts, or sensitive fixture data may be checked into result history intended for version control.
- [C-012 | Must] Raw live outputs should default to local artifact storage, with opt-in export for shareable summaries only.
- [C-013 | Must] Human review, if added, must support blinding so reviewers do not know baseline vs treatment ordering.

### 4.4 Performance / Hot Path (Must / Must Not)

- [C-020 | Must] Eval execution is a cold-path developer workflow, not a product hot path.
- [C-021 | Must] The CLI must support bounded concurrency and explicit model/case caps to keep provider cost predictable.
- [C-022 | Must Not] The first version may not require a hosted service.
- [C-023 | Must] Every run records token counts, elapsed time, and estimated provider cost where available.

### 4.5 Data access & bounding rules (determinism)

- [C-030 | Must] Suite cases are versioned, stable, and content-addressed.
- [C-031 | Must] Skill hashes are derived from all managed skill files that materially affect steering, not only root `SKILL.md`.
- [C-032 | Must] Result ordering is stable: suite case ID, then model ID, then condition ID, then replicate number.
- [C-033 | Must] Replicate count is explicit; if omitted, default is one run and no false statistical certainty.
- [C-034 | Must] Comparison logic must support both paired comparisons and aggregate summaries.
- [C-035 | Must] Empty vs Missing vs Error semantics are explicit for every surface:
  - Empty: no result rows because the filtered selection matched no suites/models/cases.
  - Missing: referenced suite, model adapter, or prior run ID does not exist.
  - Error: execution or scoring failed for one or more rows.

### 4.6 Tool / API contracts (canonical schemas)

For each surface (endpoint, event, tool, job, prompt contract), define:

- **Name:** `vasir eval run`
- **Inputs:** skill name(s), suite name(s), model ID(s), optional baseline condition, optional judge config, optional replicate count, optional output mode.
- **Outputs:** run summary JSON plus local artifact directory.
- **Ordering & limits:** stable row ordering; explicit `--max-cases`, `--max-models`, `--concurrency`, `--repeat`.
- **Empty result semantics:** prints a clear "no matching cases" summary and exits non-zero.
- **Missing data semantics:** missing suite/model/run IDs fail with structured error codes.
- **Error semantics:** per-row failure captured in results; command exit non-zero if any row fails unless explicitly allowed.
- **Observability:** run ID, suite hash, skill hash, model ID, judge ID, token totals, elapsed time, cost estimate.

Recommended future command surface:

- `vasir eval run <skill> [--suite <suite> ...] [--model <model> ...] [--repeat <n>] [--judge <judge>] [--json]`
- `vasir eval history <skill> [--suite <suite>] [--model <model>] [--json]`
- `vasir eval compare <run-id-a> <run-id-b> [--json]`

### 4.7 Observability & context propagation

- [C-040 | Must] Every result row carries: `runId`, `suiteId`, `suiteHash`, `caseId`, `modelId`, `conditionId`, `skillHash`, `harnessVersion`.
- [C-041 | Must] Every scorer record includes scorer type, scorer version, and raw decision payload.
- [C-042 | Must] Aggregate reports include confidence or uncertainty signals when pairwise or repeated runs are used.

### 4.8 Failure handling & degradation policy

- [C-050 | Must] One model or case failure must not erase successful rows from the same run.
- [C-051 | Must] Runs may finish in a degraded state with partial results, but the summary must label them incomplete.
- [C-052 | Must] If a soft scorer fails, hard scores still report; pairwise win-rate fields become unavailable rather than fabricated.
- [C-053 | Must] If live providers are unavailable, deterministic fixture-based tests must still validate the eval harness itself.

---

## 5) Milestones (Production-shippable ladder)

### 5.1 Milestone index

| ID | Goal + User Journey | State (Planned/In Progress/Done/Cut) | Acceptance criteria (tests + behavior) | Rollback shape | Complexity | Risk | Perf Impact | Cost Impact | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Run local baseline vs treatment suites with hard scorers and local result history | Planned | `vasir eval run <skill>` works against checked-in suites; JSON result schema stable; history keyed by skill hash | CLI can be removed without touching skills | M | M | S | S | No live provider requirement in automated tests |
| M2 | Add live provider matrix + blind pairwise judge scoring | Planned | Same suite can run against multiple models; reports show hard metrics + pairwise win-rate + cost | Soft scorer path can be disabled independently | L | L | M | M | First "real" skill-lift workflow |
| M3 | Add agentic repo eval mode for tool-using coding tasks | Planned | Fixture repos can be modified in sandbox and scored by executable checks | Keep direct-generation eval path intact | XL | L | M | L | Highest product fidelity, highest complexity |

### 5.2 Milestone details

#### M1 — Local harness + hard scoring

- Deliver a suite format and run schema.
- Support baseline `none` vs treatment `skill`.
- Support hard scorers only:
  - file exists / file absent
  - banned pattern absent
  - exact or structured output checks
  - executable commands inside fixtures
- Store run history locally with skill hash and suite hash.
- Output:
  - hard pass rate
  - skill lift
  - per-case diffs
  - history trend for the skill

#### M2 — Live providers + soft comparative judging

- Add provider adapters for multiple LLM APIs.
- Add blind pairwise judging:
  - randomize left/right ordering
  - hide condition labels from the judge
  - allow rubric-per-suite
- Add optional repeats for stochastic stability.
- Report:
  - pairwise win rate
  - length-aware / rubric-aware judge decisions
  - cost and latency per model
  - confidence intervals / uncertainty flags

#### M3 — Agentic repo evals

- Run the same repo task under baseline and treatment using a controlled tool loop.
- Score by executable repo checks first, then judge if needed.
- Use this for skills whose value is only visible in multi-step repo work.

---

## 6) Proposed Architecture

### 6.1 Repo layout

Recommended structure:

```text
eval/
  runner.js
  result-schema.js
  skill-hash.js
  providers/
  scorers/
  reporting/
skills/
  react/
    SKILL.md
    meta.json
    evals/
      README.md
      suite.json
  deterministic/
    SKILL.md
    meta.json
    evals/
      README.md
      suite.json
evals/
  packs/                  # optional future shared or cross-skill benchmark packs
  results/               # local artifact root; not intended for git by default
```

Rationale:

- `eval/` owns product logic.
- Skill-owned eval contracts live beside the skill they measure.
- Root `evals/` is reserved for optional shared or cross-skill benchmark packs.
- Local run artifacts stay out of the canonical source tree by default unless explicitly exported.

### 6.2 Run protocol

For each selected `suite x case x model x condition x replicate` row:

1. Resolve case fixture and task.
2. Build the prompt envelope for baseline or treatment.
3. Execute the selected provider or local harness.
4. Store raw artifacts.
5. Run hard scorers.
6. If configured, create blind pairwise judge packets from baseline/treatment outputs.
7. Aggregate per-case then per-model then global summaries.

### 6.3 Conditions

Minimum condition set:

- `baseline:none`
- `treatment:<skill-hash>`

Optional future conditions:

- `control:wrong-skill`
- `treatment:<skill-hash-a>` vs `treatment:<skill-hash-b>`
- `treatment:skill-bundle`

### 6.4 Result model

Each run should persist:

- run summary
- suite metadata
- skill metadata
- per-row artifacts
- per-scorer outputs
- aggregate report

Minimal row schema:

```json
{
  "runId": "2026-03-18T12-00-00Z__react__abc123",
  "suiteId": "react-core",
  "suiteHash": "sha256:...",
  "caseId": "user-panel-fetch",
  "modelId": "openai:gpt-5.4",
  "conditionId": "treatment:react@sha256:...",
  "replicate": 1,
  "skillHash": "sha256:...",
  "status": "success",
  "hardScore": {
    "passed": true,
    "score": 1
  },
  "softScore": null,
  "costUsd": 0.18,
  "latencyMs": 4120
}
```

### 6.5 Skill history model

History is the killer feature, so it must be first-class:

- skill name
- skill hash
- git commit if available
- suite hash
- model set
- run timestamp
- aggregate metrics

That enables:

- "Did this edit improve the skill?"
- "Did the skill regress on model X?"
- "Did a model upgrade change how well this skill works?"

---

## 7) Scoring Model

### 7.1 Scorer hierarchy

Use the fastest, most reliable scorer first:

1. **Executable / hard scorer**
   - tests pass
   - artifact shape valid
   - banned defaults absent
   - expected files present
2. **Rule-based scorer**
   - required phrase / schema / field checks
   - AST or structural checks
3. **Blind pairwise LLM judge**
   - compares baseline vs treatment on a rubric
4. **Human review**
   - calibration set, spot checks, final tie-breaks

### 7.2 Core metrics

- `hard_pass_rate`
- `hard_skill_lift`
- `pairwise_win_rate`
- `pairwise_tie_rate`
- `per_model_hard_lift`
- `per_model_pairwise_win_rate`
- `avg_cost_usd`
- `avg_latency_ms`
- `failure_rate`

### 7.3 Statistical posture

- Paired comparisons are the default.
- If repeats are enabled, compute uncertainty from the paired rows.
- If repeats are not enabled, avoid false precision and present the result as directional only.

### 7.4 Anti-gaming guardrails

- Randomize pairwise presentation order.
- Do not let soft judges override failed hard checks.
- Prefer length-aware or rubric-specific comparison over raw "which answer is better?"
- Keep a small human-reviewed calibration slice for judge sanity checks.

---

## 8) Suite Design

### 8.1 Suite philosophy

Suites should reflect real skill value, not generic benchmark vanity.

Good suites:

- mirror the failure mode the skill is meant to prevent
- include normal, edge, and adversarial cases
- are small enough to run often
- are versioned and stable enough for history

Bad suites:

- reward verbosity instead of correctness
- test generic model competence more than the skill
- change silently over time

### 8.2 First candidate suites

- `react-core`
  - state ownership
  - effect discipline
  - loading/error/empty-state handling
- `deterministic-core`
  - seeded randomness
  - injected clocks
  - replay/regression tests
- `integration-core`
  - value-path testing
  - deterministic integration tests
  - outcome-based assertions

### 8.3 Case design

Each case should include:

- one task statement
- one fixture or expected artifact context
- one scorer definition
- one rationale tying the case back to the skill’s intended steering

---

## 9) CLI / UX Shape

### 9.1 Example flows

Run current skill against one suite:

```bash
vasir eval run react --suite react-core --model openai:gpt-5.4
```

Run across multiple models:

```bash
vasir eval run react --suite react-core --model openai:gpt-5.4 --model anthropic:claude-sonnet-4
```

Inspect history:

```bash
vasir eval history react
```

Compare two runs:

```bash
vasir eval compare run_0182 run_0187
```

### 9.2 Terminal report shape

The terminal should answer three questions quickly:

- better, worse, or noise?
- where did it move?
- what did it cost?

Suggested summary:

```text
react  sha256:abc123
suite: react-core  cases: 18  models: 2  repeats: 2

hard pass lift:      +16.7 pts
pairwise win rate:   61.1%
cost:                $3.42
slowest model:       anthropic:claude-sonnet-4  p95 8.2s

best movement:
- openai:gpt-5.4  +22.2 pts hard pass

regressions:
- case react-core/effect-derived-state  lost pairwise 2/2

history vs previous skill hash:
- hard pass +11.1 pts
- pairwise win +8.0 pts
```

---

## 10) Verification Strategy

### 10.1 What the repo should test deterministically

- suite parsing
- skill hashing
- run schema
- scorer behavior with local fixtures
- report aggregation
- history diff logic
- provider adapter contracts using recorded fixtures / stubs

### 10.2 What should remain opt-in live evaluation

- real provider API calls
- cross-model matrix runs
- LLM judge comparisons
- spend-bearing history refreshes

### 10.3 Why this split matters

This preserves the repo’s current deterministic CI posture while still allowing the product to measure real-world steering in live opt-in runs.

---

## 11) Sources

- [SRC-001] [MANIFESTO.md](../../MANIFESTO.md)
- [SRC-002] [README.md](../../README.md)
- [SRC-003] [test/repository-layout.test.js](../../test/repository-layout.test.js)
- [SRC-004] [docs/work/WORK.md](../work/WORK.md)
- [SRC-005] [package.json](../../package.json)
- [SRC-006] OpenAI, "Evaluation best practices" — https://developers.openai.com/api/docs/guides/evaluation-best-practices
- [SRC-007] Anthropic, "Define your success criteria" — https://docs.anthropic.com/en/docs/test-and-evaluate/define-success
- [SRC-008] Anthropic, "Develop tests" / evaluation guidance — https://docs.claude.com/en/docs/test-and-evaluate/develop-tests
- [SRC-009] SWE-bench — https://github.com/SWE-bench/SWE-bench
- [SRC-010] AlpacaEval — https://github.com/tatsu-lab/alpaca_eval
