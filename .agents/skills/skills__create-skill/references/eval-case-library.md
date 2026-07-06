# Skill Eval Case Library

Read this when designing eval cases for important, broad, risky, or collision-prone skills. Skill evals answer exactly one question: **did the loaded skill change the model's decision in the intended direction?** Everything here serves that question; anything that doesn't is theater.

**Contents:** 1. The Seven Case Types · 2. Worked Set (running example) · 3. Running the Evals · 4. Grading · 5. When Evals Are Mandatory

---

## 1. The Seven Case Types

| # | Type | Proves |
|---|---|---|
| 1 | **Baseline failure** (without skill) | The bad default prior is real — the model actually fails this way unaided. |
| 2 | **With-skill behavior** | The replacement instinct fires on the same input. |
| 3 | **Should-trigger** | The description routes the skill in on real phrasings. |
| 4 | **Should-not-trigger** | The skill stays out of adjacent territory. |
| 5 | **Borderline** | The boundary is a decision, not an accident — state the expected call. |
| 6 | **Collision / coexistence** | Adjacent skills load in the right combination, and single-homed definitions aren't restated. |
| 7 | **Attention drift** | The critical rule survives deep into a long, hard task. |

Cases 1–2 test the *prior rewrite*. Cases 3–6 test the *router*. Case 7 tests the *attention architecture*. A skill eval'd on only one axis is untested on the others.

## 2. Worked Set — running example

Skill under test: `db-migration-safety` (constraint-injection genus: no destructive migration without a reversible step and a checkpointed backfill; migration flags carry removal owners). Sibling: `db-query-performance`.

**1 — Baseline failure.** Prompt (no skill): *"Rename the `users.email` column to `primary_email` — write the migration."* Expected unaided failure: a single `ALTER TABLE ... RENAME` with no expand/contract window, breaking old readers mid-deploy. This case is only valid if the failure actually reproduces — a baseline the model already passes means the skill encodes something the model doesn't need.

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

## 4. Grading

Grade behavior deltas, not prose quality: did the decision change in the intended direction? For each failed case, classify the failure to route the fix — **payload** (the expertise is wrong or thin → back to extraction), **rewrite** (right knowledge, model doesn't obey → stronger anchor: contrastive pair, anti-pattern, core-principle placement), **routing** (didn't load / loaded wrongly → description surgery), **drift** (fires early, dies late → move the anchor up). No invented pass rates: report the actual case count and outcomes, and label anything unrun as unrun.

## 5. When Evals Are Mandatory

Full seven-type coverage: skills that gate destructive or irreversible operations; broad skills touching many task classes; any skill with a sibling collision surface; skills that will be invoked autonomously without a human reading the output. Compressed coverage (cases 1–4) is acceptable for narrow, low-risk, human-reviewed skills — say which coverage was chosen and why. No validators by default: automation enters only when a failure is deterministic, repeated, and machine-checkable.