# WORK SPEC: VASIR BENCHMARKING

**Purpose:** Give Vasir a local measurement lab for seeing how its skills and complete workflow change AI results across tasks, models, and reasoning settings.
**User Journey Unlock:** An author can run an independent benchmark against clean, individual-skill, and full-Vasir conditions, then see how much Vasir helps and which model configuration performs best.
**Engineering System Unlock:** Benchmark, treatment, model configuration, scoring, and evidence become independent axes, so the same task can compare skills, the complete workflow, models, reasoning settings, and later Vasir versions.
**vFinal:** From one local command, an author can run any bounded benchmark across an exact clean condition and one or more individual-skill or full-Vasir treatments, chosen model and reasoning configurations, and repeated trials; open a self-contained visual report containing the complete matrix, exact inputs, outputs or artifacts, task-owned checks, calibrated LLM judgments, tokens and attributable cost; and answer in order: how much Vasir helps, which model configuration performs best, and whether a Vasir edit improved the result. The system measures and exposes evidence; it does not present a benchmark score as proof of universal quality.
**Primary entrypoint(s):** `vasir eval run <benchmark> --treatment <skill:name|vasir> [--model <provider:model>] [--reasoning <effort>] [--holdout <path>] [--open]`, `vasir eval report <benchmark> [run-id] --open`, and from `VASIR-BENCH__M2`, `vasir eval calibrate <benchmark>`
**Reference routing:**
- [Implementation map](references/implementation-map.md): read §2–§6 before building the active rung; use §7 only when extending beyond response-only tasks.
- [Provenance](references/provenance.md): read only when prior eval decisions or the benchmark's origin affect a change.

## 1) North Star: vFinal

### 1.A Journey

- **Actor:** Vasir skill or workflow author.
- **Entry point:** Select an independent benchmark, one or more treatments, model/reasoning configurations, and trial count, then run `vasir eval run`.
- **Steps:**
  1. Vasir snapshots the benchmark, clean condition, declared treatments, model/reasoning configurations, scoring contract, and judge calibration.
  2. It runs the complete matched condition × model configuration × case × trial matrix and records successful, unavailable, and failed cells.
  3. The author opens the generated local report and sees Vasir lift first, model ranking second, and treatment-version movement third.
  4. The author drills into any cell to see the exact harness-controlled input, outputs or workspace artifacts, gate results, dimension scores, judge reasoning, and human verdict.
  5. The author adds a model configuration and rejudges the comparison cohort, tries the same benchmark against full Vasir, or edits a skill and reruns it.
- **Success:** Without opening raw JSON, the author can explain how much Vasir changed the benchmark, which model/reasoning configuration performed best, why the scores moved, what it cost, and where the signal is weak.
- **Next thing they will try:** Compare full Vasir, add another model/reasoning configuration and rejudge the shared cohort, or test an edited skill version on the same benchmark basis.

### 1.B Experience invariants: “it is not real unless…”

- `C-001`: The declared treatment is the only experimental difference.
- `C-002`: The exact experiment can be reconstructed from its artifact.
- `C-003`: The report exposes the whole matrix and its underlying evidence.
- `C-004`: Benchmarks own task prompts and scoring independently from treatments.
- `C-007`: New model results never silently mix with an incompatible experiment.
- `C-010`: Missing evidence stays visibly incomplete and cannot become a pass.
- `C-013`: A full-workflow result exercises normal Vasir routing rather than a hand-assembled prompt bundle.
- `C-014`: Benchmark scores remain measurements, not claims of proof.
- `C-015`: Every model and reasoning setting remains a distinct visible configuration.
- `C-016`: Prompt reports remain independent, and any future cross-prompt score names its taxonomy, inputs, weights, calibration, and missing evidence.

### 1.C Obviousness audit

- **Assumption:** “Without the skill” means a genuinely clean comparison → **Implication:** both conditions receive the same useful neutral harness instructions and task; neither receives root steering, prior conversation, examples, or scoring criteria; treatment adds only its named context block at a fixed recorded insertion point.
- **Assumption:** A benchmark shows what was actually tried → **Implication:** exact prompts, context, settings, models, trials, failures, outputs, and score basis must be visible from the report.
- **Assumption:** “Any task” includes work that cannot be judged from prose alone → **Implication:** the harness standardizes experiments and evidence while suites supply task-specific gates, artifacts, and human review.
- **Assumption:** A higher average cannot excuse a fatal product miss → **Implication:** a missed defining-behavior or correctness gate caps the claim while execution and independent evidence continue.
- **Assumption:** A graph is evidence, not decoration → **Implication:** every aggregate must drill down to raw trials and have a table/text equivalent.
- **Assumption:** “The Vasir workflow” means the behavior produced by root steering, skill discovery, routing, tools, and agents together → **Implication:** the full-workflow treatment must enter through the same agent path the author normally uses and record what that path actually resolved and did.
- **Assumption:** A benchmark task should test more than the skill that currently owns it → **Implication:** benchmark identity, cases, and scoring must be selectable independently from clean, skill, and full-Vasir treatments.
- **Assumption:** Reasoning effort can materially change a model's result → **Implication:** provider, model, and reasoning setting form one visible configuration and are never collapsed into a model-family average.
- **Assumption:** Human calibration does not mean manually judging every run → **Implication:** the author calibrates task checks and LLM judges initially, then routine runs score automatically and expose disagreement.

### 1.D Design / UX bar

- **Experience target:** A local experiment lab whose top line reads in seconds and whose claims open directly into evidence.
- **Reference bar:** The first architecture report in `VASIR-BENCH__M1`; that rung establishes the visual reference through human acceptance rather than copying a hosted benchmark product.
- **Must feel:** The report answers “how much did Vasir help?” before asking the author to inspect model or version details.
- **Must not feel:** like a JSON viewer, opaque LLM vibes, a keyword scoreboard, a decorative dashboard, or a public leaderboard.
- **Human rejection criteria:** In three seconds the author cannot find Vasir lift and the best model configuration; in thirty seconds they cannot explain a surprising cell from raw evidence; model/reasoning variants are collapsed; important failures are averaged away; or the report implies proof it has not established.

## 2) Non-Goals

- No hosted service, account system, database, background queue, public leaderboard, or benchmark marketplace.
- No claim that automated judges establish universal correctness, taste, fun, or release readiness.
- No requirement that the first benchmark prove Vasir works; its job is to create a trustworthy measurement loop that can accumulate evidence.
- No arbitrary evaluator plugin framework in the active rung.
- No hardcoding the harness to architecture, chat, Redis/Valkey, games, or any other answer domain.
- No publishing private holdouts or committing generated run artifacts by default.
- No copying benchmark policy into every repository's `AGENTS.md` or `CLAUDE.md`.
- No replacement rewrite of the working eval CLI when its runner, provider adapters, and local history already provide the lasting base.

## 3) Request Anchor

- **Must:** Vasir is the author's personal opinionated AI workflow and includes a benchmark system that shows whether and how much it helps relative to a clean condition.
- **Must:** The report clearly shows the input prompts, every model/prompt/trial attempted, side-by-side outputs, scoring, judges, tokens/cost, and useful graphs.
- **Must:** Benchmark tasks and scoring are independent from the skill or workflow treatment so the same benchmark can test clean, individual skills, full Vasir, and later versions.
- **Must:** The comparison works both for a single skill and the complete Vasir workflow as an agent actually consumes it; manually concatenating preselected instructions is not an equivalent full-workflow test.
- **Must:** The target model matrix covers GPT-5.6 Sol, Terra, and Luna plus Claude Fable and Opus at each reasoning setting available to the author; every model/reasoning combination is a separate visible cell.
- **Must:** The report answers in priority order: how much Vasir helps, which model configuration performs best, then whether an edit improved Vasir.
- **Must:** Task-specific checks and LLM judges score routine runs after the author calibrates them initially; disagreements and uncalibrated dimensions remain visible.
- **Must:** The first real benchmark uses the prompt `Architect a chat app infrastructure that supports 10 million concurrent users.`, two independent fresh-context judge configurations (`codex:gpt-5.6-sol@ultra` and `claude:opus@max`), and separate fresh `codex:gpt-5.6-sol@ultra` synthesis sessions that produce the inspectable final scores and ranking from bounded matched batches.
- **Must:** The generated report uses D3 for a polished editorial data story and makes model ranking, complete answers, and Vasir lift immediately visible.
- **Must:** Multiple prompt reports are reachable from one generated local catalog without hiding incomplete attempts or merging unlike score bases.
- **Must:** The second real benchmark is a novel personalized-home-feed architecture task that is not described by a worked example in the treatment.
- **Must:** The benchmark shape extends to novel architecture questions, stories and other creative responses, and workspace-producing tasks such as making a game.
- **Must:** Public regression cases and private rotating holdouts distinguish repeatable regression coverage from untuned generalization evidence.
- **Must Not:** Treat keyword matching, judge preference, or a single aggregate score as sufficient proof that an answer is good.
- **Must Not:** Average prompt-local scores into an overall model or Vasir score before a versioned capability taxonomy, prompt mapping, weights, calibration state, compatible run basis, and missing-evidence rule exist.
- **Must Not:** Leak hidden scoring criteria into the generated prompt or call a changed prompt/model/fixture a controlled skill comparison.
- **Preference:** Keep the product local, synchronous, inspectable, zero-runtime-dependency, and built on the current `vasir eval` path.
- **Permission:** Use suite-owned objective checks, semantic judges, artifact inspection, and explicit human verdicts in whatever combination the task genuinely requires.

## 4) Current Truth

- **Fact:** `benchmarks/hyper-scale-chat/benchmark.json` is an independent task-and-rubric fixture; `cli/eval/benchmark-source.js` resolves it separately from the skill treatment.
- **Fact:** `cli/eval/run-benchmark-eval.js`, `benchmark-models.js`, and `agent-runtime.js` now plan one clean and one skill row for each of 27 provider/model/reasoning configurations and execute the resulting 54 one-trial rows as isolated, fresh, non-persisted Codex or Claude CLI sessions.
- **Fact:** `cli/eval/benchmark-judge.js` resolves an arbitrary configured judge list plus synthesizer, derives one deterministic anonymous cohort, and keeps each matched clean/treatment group together in batches of at most three groups and six candidates. The planner admits a batch only when both its exact panel prompt and a worst-case synthesis prompt for the configured reviewer count fit under 64 KiB; synthesis sees the candidate bodies plus compact scores, gate statuses, dimension ratings, and one UTF-8-byte-bounded overall rationale while full judge evidence remains stored. Panel and synthesis calls share concurrency four, time out after ten minutes per call, and reuse compatible completed batches on retry. The default panel is `codex:gpt-5.6-sol@ultra` plus `claude:opus@max`, synthesized by `codex:gpt-5.6-sol@ultra`.
- **Fact:** `vasir eval rescore <benchmark> [run-id]` reuses a saved response cohort, applies the benchmark's current judge configuration, and writes a new linked run instead of mutating the historical artifact. Generation and scoring hashes are separate, so swapping judges does not make identical generated answers incomparable.
- **Fact:** `cli/eval/history.js` writes authoritative `.agents/vasir-evals/<benchmark>/<run-id>/run.json` evidence; `benchmark-report.js` derives a self-contained `report.html` with vendored D3, and `vasir eval report <benchmark> [run-id] --open` regenerates or opens it without rerunning providers.
- **Fact:** Full M1 run `2026-08-26T03-51-51Z__dd6d985de7f7` completed all 54 planned fresh-session rows and all 54 scores with no unavailable or failed cells. The fresh blinded Sol-max judge observed clean `51.6`, treatment `66.0`, mean matched lift `+14.4`, 20 wins / 5 ties / 2 losses, and `claude:opus@max` as the best observed configuration. These numbers remain directional until author calibration.
- **Fact:** Immutable rejudge `2026-08-26T13-33-06Z__rejudge__d32ad50440bf` completed the live panel path over those same 54 saved answers: fresh Opus-max plus the compatible retained Sol-ultra judgment, followed by a separate fresh clean Sol-ultra synthesis. It scored all 54 rows, observed clean `52.7`, treatment `79.1`, mean matched lift `+26.5`, 26 wins / 0 ties / 1 loss, and `claude:opus@max` as the best observed configuration at `95.0` overall. The judges disagreed on 52/54 candidates with a maximum 41-point spread; synthesis selected the anonymous Sol record 20 times and Opus record 34 times. These numbers remain directional until author calibration.
- **Fact:** Personalized-home-feed run `2026-08-26T14-28-16Z__58e3391437f7` completed 54/54 fresh generations, but the superseded v1 judge path sent all answers in one 210,542-character prompt. Sol took 17.6 minutes; Opus reached the harness's 40-minute timeout; synthesis was skipped and no score was published. This observed failure forced the bounded v2 batch contract rather than a longer timeout.
- **Fact:** Immutable feed rejudge `2026-08-26T16-19-35Z__rejudge__1f4c92f2c0e3` completed the bounded v2 path over those 54 saved answers: nine matched batches, 18/18 independent panel executions, and 9/9 separate synthesis executions with no failed batch. It observed clean `65.6`, treatment `72.3`, mean matched lift `+6.7`, 15 wins / 5 ties / 7 losses, and `claude:opus@high` as the best configuration at `95.0` overall. The 52-minute run was the aggregate wall time for 27 bounded calls; Opus-max panel calls each completed in 6.5–8.2 minutes. These scores remain directional until author calibration.
- **Fact:** Benchmark pages require no runtime frontend service or network dependency: D3 and report fonts are checked in and embedded into generated HTML.
- **Unknown:** Whether the current rubric anchors and complete panel-plus-synthesis path order strong-simple, overbuilt, underbuilt, and counter-idiomatic-good answers for the intended reasons: this is the pending M1 calibration decision, not a reason to change the harness topology.
- **Unknown:** Which provider/model prices can be attributed reliably at run time: token usage remains required, while unavailable or stale price data must be labeled rather than inferred.

## 5) Contracts & Invariants

- `[C-001 | Must]` Within every matched trial group, the model or agent runtime, reasoning setting, task and fixture, neutral base context, generation settings, output contract, tool permissions, and run environment are identical; the only assigned difference is condition. `clean` adds no Vasir steering, `skill:<name>` inserts one named skill snapshot, and `vasir` installs the complete workflow at its normal consumption boundary. Later routing, tool, or subagent differences are recorded treatment effects rather than preselected inputs.
- `[C-002 | Must]` Every run preserves the exact harness-controlled messages and context, treatment content or installation snapshot and hash, suite/rubric snapshot and hash, fixture identity, model or agent version and settings, observed routing/tool/subagent trace when applicable, every judge and synthesizer identity, their exact prompts and outputs, anonymized candidate/reviewer order and cohort hash, panel-evidence and final score bases, harness/scorer versions, usage, and failures needed to reconstruct what happened.
- `[C-003 | Must]` The local report answers in order: Vasir lift versus clean, best model/reasoning configuration, then comparable treatment-version movement. It shows the complete prompt × model configuration × condition × trial matrix, side-by-side outputs, gate and dimension results, judge reasons and disagreement, tokens, and attributable cost; every chart drills into raw evidence and has a non-visual equivalent.
- `[C-004 | Must]` A benchmark independently identifies its cases and objective checks, semantic gates, anchored dimensions, artifact checks, or calibration questions, and can run unchanged against clean, any individual skill, and full Vasir. Evaluation-only criteria are never included in generation context, and treatments never own or rewrite the scoring contract.
- `[C-005 | Must Not]` A task-defined miss of defining behavior, correctness, safety, or day-1-to-vFinal topology continuity cannot be averaged into a positive verdict by prose quality, style, or other dimensions.
- `[C-006 | Must]` Every configured LLM judge scores the same deterministic blinded batch plan independently against the benchmark's declared gates and dimensions; matched conditions stay in one batch and every call has explicit candidate, byte, concurrency, and timeout bounds. A separate synthesis authority sees anonymous compact judgments in fresh sessions over that same batch plan, selects one internally complete panel judgment per candidate, and records why; it never averages scores or creates an untraceable hybrid. Candidate/model/condition and reviewer/model identity remain hidden at the appropriate stage, individual reasons and disagreement remain visible, and scores cannot support a positive claim until every required batch completes and the panel-plus-synthesis behavior passes author calibration.
- `[C-007 | Must]` Scores may be ranked or compared only when the benchmark cases/fixtures, generation and trial basis, harness/scorer/rubric versions, configured judge set, cohort hash, batch policy and plan, panel evidence, and synthesizer basis match. Treatment snapshots remain distinct named versions and never merge as the same condition. Adding or replacing a judge changes scoring identity but not generation identity; `rescore` creates a new linked artifact from the saved outputs. Adding a candidate changes the cohort and batch plan, so it still requires rejudging the comparison cohort.
- `[C-008 | Must]` Public cases live with the independent benchmark as reproducible regression coverage; sealed local holdouts are visible in their local report but absent from the repository, and any holdout used to tune a treatment or scorer is retired into regression coverage and replaced before another generalization claim.
- `[C-009 | Must]` The author initially calibrates subjective gates, dimension anchors, independent judge behavior, and synthesis choices against a small labeled set. Routine runs use task checks and LLM judges automatically; uncalibrated dimensions, per-candidate panel disagreement, synthesis reasons, and any later human adjudication remain distinct evidence.
- `[C-010 | Failure]` If generation, any required judge batch, synthesis batch, or task evaluation is unavailable or incomplete, preserve every valid row and completed batch, mark affected cells `INCOMPLETE` or `NO SIGNAL`, exclude them from positive claims, and let the author recover by rerunning only incompatible or missing evaluation batches. A failed panel or synthesizer never falls back to one judge, an average, or a partial score.
- `[C-011 | Must]` `run.json` is the sole durable evidence authority; `report.html` is a deterministic, regenerable, self-contained local projection that escapes untrusted model content and needs no server or runtime dependency.
- `[C-012 | Must]` A workspace-producing benchmark runs each condition from the same isolated fixture and records the resulting patch/artifacts plus task-owned executable and human evidence; a prose answer about the workspace never counts as task completion.
- `[C-013 | Must Not]` A full-workflow claim cannot come from concatenating a chosen set of root instructions and skills into a prompt. It requires the same supported agent entrypoint in identical clean and Vasir-installed fixtures, with the resolved root contracts, discovered or read skills, tool calls, and subagent activity captured as evidence.
- `[C-014 | Must Not]` A score, win rate, or calibrated judge preference cannot be labeled as proof that Vasir or a model is universally better; the report states benchmark coverage, calibration status, and the exact scope of every comparison.
- `[C-015 | Must]` Every provider, model, and reasoning-setting tuple is a separate configuration. Requested but unavailable or failed configurations remain visible as `UNAVAILABLE` or `INCOMPLETE` cells and never disappear from the denominator silently.
- `[C-016 | Must]` Each benchmark keeps its own task, rubric, run history, and report. The generated prompt catalog is a disposable projection of authoritative `run.json` artifacts: it may navigate to and summarize prompt-local results, but it cannot publish cross-prompt arithmetic until a versioned capability taxonomy maps local dimensions to common capabilities, identifies exact eligible run and score bases, declares weights and calibration state, and yields `NO SIGNAL` rather than silently reweighting missing evidence. A newer incomplete attempt remains visible even when the catalog links the newest complete report as the prompt's featured evidence.

## 6) Vertical-Slice Ladder to vFinal

### VASIR-BENCH__M1: 10M-chat benchmark and D3 report across the target model matrix: Implemented; calibration pending

- **Unlock:** An author can run the 10M-concurrent-user chat architecture prompt against clean and `skill:plan__question-spec-architecture`, then see skill lift, model/reasoning performance, complete answers, and score reasons in one D3 report.
- **Working slice:** The author runs `vasir eval run hyper-scale-chat --treatment skill:plan__question-spec-architecture --trials 1 --open`. Vasir plans 27 GPT-5.6 Sol/Terra/Luna and Claude Fable/Opus reasoning configurations and 54 clean/treatment rows, executes each row in a fresh isolated Codex or Claude CLI session, preserves failures and unavailable cells, then sends identical deterministic bounded batches to fresh Opus-max and Sol-ultra sessions. Fresh Sol-ultra synthesis sessions receive only the corresponding anonymous compact judgments, choose the most rubric-faithful complete judgment per candidate, and produce the final ranking. `run.json` preserves every batch, disagreement, synthesis selection, and basis; the self-contained D3 report exposes the synthesized scores and exact batch evidence. `vasir eval rescore` reuses compatible completed batches and saved answers. Calibration remains visibly pending.
- **vFinal advance:** Establishes the independent benchmark/treatment/configuration artifact and visual report on a difficult response task. It does not yet establish reusable subjective calibration, full-workflow agent treatment, cross-run version comparison, or workspace artifacts.
- **Experience bar:** Vasir lift and the best model configuration are findable in three seconds; complete answers and judge reasoning are one action away; any surprising cell is explainable in thirty seconds; the page has a distinctive editorial identity rather than generic dashboard cards; reasoning variants, raw trial spread, uncalibrated scores, and unavailable cells cannot be hidden by averages.
- **Lasting shape:** The artifact models an independent benchmark, explicit `clean` and `skill:<name>` conditions, model/reasoning configurations, fresh-session receipts, task-owned score results, and separate generation and judge-cohort bases. M1 renders one run; later history must either rejudge a shared all-results cohort or introduce proven fixed-anchor independent scoring before it can append scores from new models.
- **Implementation map:** The active files are recorded in [§1](references/implementation-map.md#1-current-source-map), the live flow in [§2](references/implementation-map.md#2-active-rung-flow), the artifact in [§3](references/implementation-map.md#3-run-artifact-shape), current all-results scoring and pending calibration in [§4](references/implementation-map.md#4-suite-and-scoring-shape), the vendored-D3 report in [§5](references/implementation-map.md#5-report-information-design), and the honest cohort-dependent comparison rule in [§6](references/implementation-map.md#6-history-and-compatibility).
- **Not in this rung:** Full-workflow agent treatment, a reusable calibration UI, cross-run treatment-version reporting, generated-workspace execution, hosted aggregation, or public rankings.
- **Contracts:** C-001–C-011, C-014–C-015.
- **Material risk:** The fresh judge rewards Vasir's wording, verbosity, or Redis preference rather than correct lasting systems. Its rubric must score product completeness, bounded scale, topology continuity, component rent, failure behavior, and cost without requiring preferred technology nouns; the report must expose the full rubric and reasoning.
- **Real journey proof:** The author runs all 27 `hyper-scale-chat` configurations through the normal CLI at one trial, producing 54 fresh clean/treatment sessions; fresh blinded Opus-max and Sol-ultra sessions independently score the same bounded matched batches, fresh Sol-ultra sessions synthesize their corresponding anonymous judgments, and the generated D3 report makes synthesized lift, model ranking, disagreement, batch/cohort basis, and every complete answer inspectable. A handcrafted report fixture, manually pasted answer, collapsed model-family average, keyword score, partial panel, mechanical average, or judge that received this conversation does not count.
- **Direct proof:** Open the generated `report.html`; confirm the D3 ranking and treatment-lift views, permanent matched score spreads in the complete-answer inspector, exact messages, rubric, numeric score breakdown, judge provenance, model/reasoning cells, human-readable latency, usage/cost labeling, complete evidence matrix, and incomplete-state behavior against its `run.json`.
- **Done when:** Without reading raw JSON, the author can explain how much the architecture skill helps or hurts on this benchmark, which model/reasoning configuration performs best, and which cells remain uncalibrated, unavailable, or inconclusive.

### VASIR-BENCH__M1B: Multi-prompt catalog and novel home-feed benchmark: Implemented; calibration pending

- **Unlock:** An author opens one local catalog, sees every benchmark prompt and its latest evidence state, opens either prompt's exact report, and can run the same complete matrix against a novel architecture task without changing the harness.
- **Working slice:** Add an independent `personalized-home-feed` fixture covering ranked followed/recommended content, hot creators, 30-second eligibility, bounded pagination, and deletion/privacy safety. Run its 27 configurations across clean and `skill:plan__question-spec-architecture`, then judge the 54-answer cohort through the bounded Sol-ultra/Opus-max panel and Sol-ultra synthesis plan. Generate `.agents/vasir-evals/index.html` by scanning local authoritative benchmark runs, and link every prompt report back to it.
- **vFinal advance:** Proves the report system is prompt-plural and tests whether the architecture skill generalizes beyond its chat worked example. Establishes the durable discovery seam for later creative and workspace benchmarks without pretending unlike prompt-local scores already form one universal score.
- **Experience bar:** The catalog is a clean vertical prompt ledger, not a dashboard grid. Prompt identity, exact task, completion, prompt-local lift, best observed configuration, calibration state, and report link are readable without opening raw files. Each report has an obvious `All prompts` route that works under `file://`.
- **Lasting shape:** One benchmark remains one independently versioned fixture, run history, scoring basis, and self-contained report. The catalog is regenerated by scanning those artifacts and can be deleted without losing evidence. Its data shape retains the benchmark and scoring identities a future explicit aggregate will require.
- **Not in this rung:** A numeric overall score, a frozen five-capability taxonomy, cross-prompt model ranking, campaign persistence, hosted UI, or calibration workflow.
- **Contracts:** C-001–C-011, C-014–C-016.
- **Material risk:** A catalog can silently prefer a successful old run and hide a failed new attempt, or average incompatible prompt scores into a persuasive false result. Feature the newest complete scored report while naming any newer incomplete attempt, and publish no aggregate arithmetic.
- **Real journey proof:** The normal CLI completes the full 54-row personalized-home-feed generation, two-judge, and synthesis path; writes its authoritative artifact and report; regenerates the catalog containing both chat and feed; and opens a page from which both exact prompt reports can be reached. Fixture-only HTML and partial model matrices do not count.
- **Done when:** From the catalog alone, the author can choose a prompt, see whether its featured evidence is complete and calibrated, open the exact report, and understand why no overall score is shown yet.

### VASIR-BENCH__M2: Calibrate automated judging on a subjective response benchmark

- **Unlock / vFinal advance:** Run an independent creative benchmark such as story or game-design response, use `vasir eval calibrate <benchmark>` to label a small anchor set once, and let task checks plus calibrated LLM judges score later runs automatically while surfacing disagreement.
- **Dependency or decision deadline:** Let one real creative benchmark determine the smallest calibration record; do not design a general annotation platform or require human scoring on every run.
- **Not in this rung:** Workspace mutation or full-workflow agent treatment.

### VASIR-BENCH__M3: Compare full Vasir, models, and treatment versions over time

- **Unlock / vFinal advance:** Run the same independent response benchmark through clean and normally installed Vasir agents, capture actual routing behavior, and compare models or named Vasir versions only after their outputs have been scored on one compatible basis. Because every current panel judge reads the full candidate cohort, extending a campaign means rejudging the combined cohort; a later fixed-anchor independent scorer may make append-only history valid after calibration proves it.
- **Dependency or decision deadline:** Choose the first supported agent adapter and the smallest faithful execution trace when this rung becomes active; preserve the normal agent path instead of defining a synthetic bundle format first. Before adding cross-run score history, choose and prove either combined-cohort rejudging or fixed-anchor independent scoring.
- **Not in this rung:** Executing and judging generated workspaces.
- **Contracts:** C-001–C-004, C-007, C-010, C-013–C-015.
- **Real journey proof:** The author launches a normal agent task through Vasir's benchmark entrypoint and can see how the clean and normally installed Vasir agents routed and answered it. Supplying a preselected set of instruction files directly to a model does not count.

### VASIR-BENCH__M4: Benchmark workspace-producing work: vFinal

- **Unlock / vFinal advance:** Run a bounded task such as making a small game from identical isolated fixtures, capture patches and proof artifacts, apply suite-owned executable checks and human acceptance, and inspect them through the same report. Architecture, creative-response, whole-workflow, and workspace examples together establish the task-neutral product claim.
- **Dependency or decision deadline:** Choose the minimal isolation and artifact contract from one real task; do not preinstall a plugin host, worker topology, or universal sandbox abstraction.

## 7) Current Motion

- **Lane state:** Active
- **Active rung:** `VASIR-BENCH__M2`
- **Next action:** Have the author inspect and calibrate a small anchor set across the chat and feed reports before defining the first reusable capability taxonomy or aggregate score.
- **Claim boundary:** Multi-prompt discovery, complete chat and feed matrices, bounded two-judge-plus-synthesis scoring, and prompt navigation are implemented. Cross-prompt capability aggregation remains intentionally absent, and both prompt-local score sets remain directional evidence until author calibration.

## 8) Proof & Human Acceptance

- **Terminal value-path observation:** Observed on run `2026-08-26T03-51-51Z__dd6d985de7f7`: the normal CLI completed 54/54 rows, the report command regenerated and opened the self-contained page, and its hero, rankings, treatment comparison, answer inspector, evidence table, rubric, and cohort basis expose the `+14.4` lift and `claude:opus@max` winner down to complete answers and score reasons. Author acceptance remains pending.
- **Terminal value-path observation:** Observed on rejudge `2026-08-26T13-33-06Z__rejudge__d32ad50440bf`: the CLI reused one compatible completed judge seat, completed the missing Opus-max seat, invoked a distinct fresh clean Sol-ultra synthesis session, validated 54/54 final selections, wrote a linked immutable run, regenerated the self-contained report with both exact judge outputs and exact synthesis output, and opened it successfully. Author acceptance remains pending.
- **Terminal value-path observation:** Observed on feed run `2026-08-26T14-28-16Z__58e3391437f7`: generation completed 54/54, but the monolithic v1 panel prompt reached 210,542 characters; Sol completed in 17.6 minutes, Opus hit the exact 40-minute harness timeout, synthesis was skipped, and the report correctly withheld all scores. The replacement v2 plan deterministically maps this same cohort to nine 25–33 KiB panel batches.
- **Terminal value-path observation:** Observed on feed rejudge `2026-08-26T16-19-35Z__rejudge__1f4c92f2c0e3`: the normal CLI reused all 54 saved generations, completed all 18 bounded panel and nine bounded synthesis executions, scored all 54 rows, regenerated the self-contained report, and regenerated the catalog with complete chat and feed entries. The feed report exposes the `+6.7` lift, `claude:opus@high` overall winner, exact batch evidence, and the still-pending calibration state. Author acceptance remains pending.
- **Material unproven risk:** Semantic judges may reward verbosity, familiar phrasing, or the treatment's ideology. The cheapest credible check is the author's initial calibration set containing strong-simple, plausible-overbuilt, plausible-underbuilt, and counter-idiomatic-good answers.
- **Human acceptance:** Waiting: the author must agree that the calibrated scorer orders the anchor set correctly and that the report answers Vasir lift and model ranking before exposing lower-priority version detail.
- **Optional proof artifact:** `.agents/vasir-evals/hyper-scale-chat/2026-08-26T13-33-06Z__rejudge__d32ad50440bf/run.json`, `.agents/vasir-evals/personalized-home-feed/2026-08-26T16-19-35Z__rejudge__1f4c92f2c0e3/run.json`, and their derived reports; the source generation runs and failed feed judgment remain linked historical evidence, so no parallel eval-plan document is warranted.

## 9) Decisions & Supporting References

- **Binding decision:** Vasir is both the opinionated workflow and the local benchmark system that measures its effect; the benchmark is not a separate hosted product.
- **Binding decision:** An independent benchmark owns tasks and scoring; treatments are separately selectable as `clean`, `skill:<name>`, or `vasir`. The same benchmark must run unchanged against each treatment.
- **Binding decision:** Report hierarchy is fixed by user decision: Vasir lift first, model/reasoning ranking second, and treatment-version improvement third.
- **Binding decision:** The initial target matrix is 27 provider/model/reasoning configurations: six each for Codex GPT-5.6 Sol and Terra, and five each for Codex GPT-5.6 Luna, Claude Fable, and Claude Opus. M1 uses one trial and two conditions, producing 54 planned fresh-session rows.
- **Binding decision:** Task-specific checks and LLM judges score routine runs after initial author calibration. Human adjudication remains available but is not required on every run.
- **Binding decision:** The first benchmark is the independent `hyper-scale-chat` fixture with the exact 10M-concurrent-user architecture prompt. Its configured panel is fresh `codex:gpt-5.6-sol@ultra` plus fresh `claude:opus@max`; separate fresh `codex:gpt-5.6-sol@ultra` sessions synthesize each bounded batch of anonymous judgments into final score records. Judge count and identities come from benchmark configuration, not runner branches. Author calibration is still required.
- **Binding decision:** A single-skill treatment is an immutable context snapshot inserted at one declared point into an otherwise identical neutral prompt. A full-workflow treatment instead runs the same agent from an identical fixture with Vasir installed through its normal path and snapshots the context and behavior that agent actually resolves; a hand-assembled bundle is not equivalent evidence.
- **Binding decision:** Keep one synchronous Node CLI and local filesystem history. The active path uses in-process benchmark/judge/report modules plus fresh Codex and Claude CLI subprocesses; no service, database, queue, or runtime frontend framework is forced.
- **Binding decision:** Public regression cases live with the independent benchmark; rotating holdouts stay local and sealed until use. Tuning a treatment or scorer consumes a holdout.
- **Binding decision:** Historical score comparability includes the candidate cohort, configured panel, each complete panel evaluation, and synthesizer basis. Changing judges requires a new score artifact but not new generations; adding a model or treatment output requires rejudging the combined cohort. `vasir eval rescore <benchmark> [run-id]` writes a new linked run and never overwrites the source evidence.
- **Binding decision:** `run.json` remains authoritative and `report.html` remains disposable, self-contained, and regenerable from it with vendored D3 through `vasir eval report`.
- **Binding decision:** Multi-prompt navigation is one disposable local `index.html` generated by scanning benchmark run artifacts. It features the newest complete scored run per prompt while exposing a newer incomplete attempt; it does not introduce a manifest, database, service, or cross-prompt average.
- **Binding decision:** Do not freeze the eventual startup/consumer capability taxonomy from architecture prompts alone. A future aggregate must name a versioned taxonomy, exact prompt-to-capability mappings, eligible run and score bases, calibration and weights, and missingness; gates remain prompt-local vetoes.
- **Supporting reference:** [Provenance](references/provenance.md) preserves the retained decisions from the superseded feature brief and the architecture-chat experiments that motivated this lane.
