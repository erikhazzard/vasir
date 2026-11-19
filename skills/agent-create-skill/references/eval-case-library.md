# Skill Eval Case Library

Read this when designing eval cases for important, broad, risky, or collision-prone skills. **Did the skill improve the correctness or usefulness of the result under the declared conditions?** Separately test whether it loads for the right requests and whether its critical guidance survives task pressure. A different decision alone is not an improvement; judge against evidence and criteria fixed before inference, without assuming a winner.

**Contents:** 1. The Seven Case Types · 2. Worked Set (running example) · 3. Running the Evals · 4. Grading · 5. Choosing Coverage

---

## 1. The Seven Case Types

| # | Type | Question tested |
|---|---|---|
| 1 | **Unaided baseline** | Does the hypothesized failure actually occur, or does the model already make a sound decision? |
| 2 | **With-skill behavior** | Does the skill improve the result on the same input while preserving required behavior? |
| 3 | **Should-trigger** | The description routes the skill in on real phrasings. |
| 4 | **Should-not-trigger** | The skill stays out of adjacent territory. |
| 5 | **Borderline** | The boundary is a decision, not an accident — state the expected call. |
| 6 | **Collision / coexistence** | Adjacent skills load in the right combination, and single-homed definitions aren't restated. |
| 7 | **Attention drift** | The critical rule survives deep into a long, hard task. |

Cases 1–2 test the *prior rewrite*. Cases 3–6 test the *router*. Case 7 tests the *attention architecture*. A skill eval'd on only one axis is untested on the others.

## 2. Worked Set — running example

Constructed example, not an executed result. Skill under test: `db-migration-safety` (constraint-injection genus: no destructive migration without a reversible step and a checkpointed backfill; migration flags carry removal owners). Sibling: `db-query-performance`. Supply both conditions with the same rolling-deployment contract: old readers remain supported while the new version deploys. The example does not require expand/contract for every schema rename regardless of context.

**1 — Unaided baseline.** Prompt (no skill): *"Rename the `users.email` column to `primary_email` — write the migration."* Hypothesized failure: a single `ALTER TABLE ... RENAME` with no expand/contract window, breaking the supported old readers mid-deploy. Record what actually happens. A passing baseline remains valid evidence of no observed improvement on that case; it does not establish that the skill is useless on every task. Do not discard it to manufacture a skill advantage.

**2 — With-skill behavior.** Same prompt, skill loaded. Expected: expand (add `primary_email`, dual-write), migrate (backfill with checkpoints), contract (drop `email` behind a removal condition) — and the flag carries an owner. Grade the *decision shape*, not the SQL dialect.

**3 — Should-trigger.** Utterances that must load it: "write a migration for…", "we need to backfill…", "drop this column", "is this schema change safe to deploy?" Include at least one phrasing with none of the skill's own vocabulary ("get rid of the old field").

**4 — Should-not-trigger.** Utterances that must not load it: "why is this query slow?" (sibling's territory), "explain what a migration is" (knowledge question, no artifact), "write a SELECT for…". A skill that loads on these is polluting context.

**5 — Borderline.** "Add an index to `orders.created_at`" — schema change, non-destructive, reversible. State the expected call (here: load, because index builds lock tables at scale — the skill's own tradeoff boundary decides) so graders judge against a decision, not a vibe.

**6 — Collision / coexistence.** "This migration is slow and might lock the table" — both siblings apply. Expected: both load; `db-migration-safety` owns reversibility and checkpoints, `db-query-performance` owns the lock/scan analysis; neither restates the other's single-homed rules.

**7 — Attention drift.** Bury the trigger deep: a long refactoring task where step 9 of 12 quietly includes a destructive column drop. Expected: the skill's constraint still fires at step 9. This is the case that distinguishes a rule the model *read* from a rule that *survives* — and it is the reason anchors go in anti-patterns and the core principle, not paragraph twelve.

## 3. Running the Evals

- **Prior-rewrite cases (1–2):** identical prompt, with/without the skill loaded; diff the two behaviors. The eval's value is the *contrast* — keep the pair together.
- **Routing cases (3–6):** present the utterance to the router (catalog with descriptions only, no bodies) and record which skills load. Trigger accuracy is a property of the *description*; if a routing case fails, fix the description, not the body.
- **Drift case (7):** one long realistic task, the trigger embedded past the midpoint. Expensive — reserve for skills whose failure is high-cost.
- Keep each case's expected behavior written *before* running; a case whose pass condition is decided after seeing output grades nothing.
- Use the same task, model configuration, tools and execution allowance for paired conditions. Keep judges blind to condition and author where supported. Preserve failed and incomplete attempts. Live model calls require the destination's existing authorization; authoring cases or inspecting a skill does not itself start a benchmark.
- Fixed injected-guidance comparisons do not test native discovery or selective reference loading. Test those routing behaviors separately when making claims about a consolidated entrypoint.

## 4. Grading

Grade correctness and usefulness against the frozen criteria, then report the paired difference. Do not award points for preferred headings, vocabulary, verbosity or resemblance to the skill. For each failed case, classify the failure to route the fix — **payload** (the expertise is wrong or thin → back to extraction), **rewrite** (sound applicable guidance was not followed → inspect cues, mechanism and placement), **routing** (didn't load / loaded wrongly → description surgery), **drift** (fires early, dies late → inspect attention placement). A regression can expose bad guidance rather than weak obedience; inspect the actual result before strengthening a rule. No invented pass rates: report the actual case count and outcomes, and label anything unrun as unrun.

## 5. Choosing Coverage

The destination's actual rules determine mandatory evaluation. Broader, higher-risk or collision-prone skills warrant considering all seven types; narrow, low-risk changes can use representative, boundary and non-trigger checks. Choose coverage for the claims being made, explain material gaps, and preserve the creator's lightweight authoring flow. A requested benchmark follows its declared protocol; creating a skill alone does not impose a seven-case suite. No validators by default: automation earns its maintenance cost when a failure is deterministic, repeated and machine-checkable.
