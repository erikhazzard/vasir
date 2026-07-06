# Extracting Skills from Agent Context

Read this when converting a root contract, `AGENTS.md`/`CLAUDE.md` doctrine, runbooks, or any large agent-context file into skills. The prize is a leaner always-loaded contract and expertise that loads only when triggered. The trap is copying — extraction that duplicates the source creates the exact split-brain this whole system exists to prevent.

**Contents:** 1. The Extraction Boundary · 2. The Distillation Table · 3. Proposing the Skill Split · 4. Re-Grounding Imported Material · 5. The One-Way Rule · 6. Output Shape

---

## 1. The Extraction Boundary

For each candidate block in the source, ask two questions in order:

**Q1 — Does it govern *every* run, or a *task class*?**
Authority, custody, safety, approval protocol, halt behavior, model routing, repo-wide precedence — these govern every run and **stay in the root contract**. A skill cannot own them: skills load conditionally, and a law that must always bind cannot live behind a trigger.

**Q2 — For task-class material: is it expertise, or is it inferable?**
Judgment, tradeoffs, scars, hidden constraints, local ontology → **skill candidate**. Facts inferable from code, docs, linters, or normal exploration → **nowhere** (delete from the source too; it was landfill there as well).

| Source content | Destination |
|---|---|
| Approval / halt / custody / safety protocol | Stays in root contract |
| Repo-wide precedence and model routing | Stays in root contract |
| Repeated task-class judgment (how to test, review, migrate…) | Skill |
| Domain scars and tradeoff boundaries | Skill |
| Per-directory narrowing of a root law | Nearer `AGENTS.md`, cited against root |
| Facts inferable from the repo | Nowhere |
| Detail needed by a minority of that skill's runs | The skill's `references/` |

## 2. The Distillation Table

Work block-by-block through the source and record every decision — the table *is* the extraction, and it doubles as the audit trail for what was deliberately left behind:

| Source (section / lines) | Expertise type | Bad default it overrides | Destination | Form it takes there |
|---|---|---|---|---|
| §Testing, "no sleeps…" | Hidden constraint | Model adds `sleep(2)` to flaky tests | `testing-strategy` skill | Determinism rule + anti-pattern |
| §Testing, "run one file at a time" | Local convention | Model runs the full suite | Stays in root (governs every run) | Cited by the skill |
| §Style, "prefer const" | Inferable (linter enforces) | — | Nowhere | Deleted |

Rows whose "bad default it overrides" cell is empty are not expertise — they are description, and description is not extracted.

## 3. Proposing the Skill Split

Cluster the skill-destined rows by **routing cluster** (what user intent loads them together), not by source section — source structure reflects how the doctrine accreted, not how it triggers. Then apply the Granularity Law from the root manifest: one cluster + one prior-rewrite family + one artifact class per skill; different tool authority or risk level splits a cluster; adjacent angles on one artifact become siblings with explicit boundaries. For each proposed skill, emit: name, genus, one-line description draft, the distillation rows it absorbs, the siblings it borders, and the root sections it will cite.

## 4. Re-Grounding Imported Material

Source doctrine often arrived from an earlier system or another company. Tells: runtime or infra the repo doesn't use, a rival vocabulary for concepts the root already names, output formats no consumer reads, references to teams, tools, or platforms that don't exist here. For each tell: keep the expertise (the scar is usually real), drop the scaffolding, rename to the local ontology, and re-point every law at this system's root sections. An imported rule that contradicts a local law is a finding to surface, not a conflict to silently resolve.

## 5. The One-Way Rule

Extraction **moves** content; it never copies it. The same edit that creates the skill deletes or reduces the source block to a one-line pointer — otherwise two homes drift. When the source is a root contract only a human may edit, the extraction output includes the exact deletion/pointer diff for the human to apply, and the skill does not ship until it lands. A skill and its source both stating the same law is not redundancy for safety; it is the split-brain, mid-formation.

## 6. Output Shape

Extraction emits: **Extraction Boundary** (what stays, what moves, what dies — with the Q1/Q2 call per contested block) · **Distillation Table** (complete, including the Nowhere rows) · **Proposed Skill Split** (per-skill: name, genus, description draft, absorbed rows, sibling borders, cited root sections) · **Draft manifest or patch** for the highest-value skill first · **Source diff** (the deletions/pointers that keep it one-way) · **Skill Result** per the root manifest.