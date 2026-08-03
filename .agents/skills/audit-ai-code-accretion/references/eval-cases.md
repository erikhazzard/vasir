# Eval Cases for `audit-ai-code-accretion`

These cases test whether the skill changes decisions, routes correctly, coexists with sibling auditors, and retains its deletion-first instinct under attention pressure. Grade decisions and evidence, not prose polish.

## 1. Baseline failure without the skill

**Prompt:** “Review this 900-line service and tell me how to improve maintainability.”

**Raw artifact:** A service with two loaders, three compatibility flags, duplicated schemas, source-text tests, and several real external-version callers.

**Expected unaided failure:** A cosmetic list dominated by file splitting, renames, comments, dependency injection, and more tests. It does not identify the surviving owner, distinguish required compatibility from obsolete paths, or say what to delete.

## 2. With-skill behavior

Use the same prompt and artifact with `$audit-ai-code-accretion`.

**Expected change:** Trace the supported path and callers; grade all ten dimensions without averaging them; use `OUT OF SCOPE` only for a genuinely narrower named boundary; preserve externally required version skew; identify exact duplicate paths and truth copies; produce a deletion-first plan naming the surviving owner and outcome proof. Do not modify code, claim AI authorship, or issue a release verdict. Write the scoped report artifact and return its path.

## 3. Should trigger

The skill should load for:

- “Audit this code.” → `EMBEDDED` beside `$code__auditing` under root §6.
- “Do a code audit.” → `EMBEDDED` beside `$code__auditing` under root §6.
- “Run a code audit on this diff.” → `EMBEDDED` beside `$code__auditing`, using `CHANGESET` scope.
- “Audit the code in this package.” → `EMBEDDED` beside `$code__auditing`; a boundary-only suffix retains the standard pair.
- “Audit this AI-generated subsystem and tell me what to delete.”
- “Give this code an AI-slop report card and a cleanup plan.”
- “This package keeps growing adapters and managers. Grade the accretion.”
- “Find duplicate paths, copied truth, and tests that pin implementation details.”
- “Before we refactor this generated code, tell us what should collapse.”
- “These fallback modes and repair workers only seem to justify each other. Find the justification island.”

Expected routing is recall-first for the unqualified code-audit family and its boundary-only suffixes as defined by root §6, and precision-first otherwise. Generic code audits use `EMBEDDED`; explicit AI-code, accretion, deletion, collapse, or justification-island-only audits use `STANDALONE`. An explicitly combined code-plus-accretion review also uses `EMBEDDED` under the code-audit lead.

## 4. Should not trigger

The skill should stay out for:

- “Is this PR safe to release?” → `$code__auditing`.
- “Review this code for correctness.” → `$code__auditing`; review is not the unqualified code-audit trigger.
- “Audit this code for release readiness.” → `$code__auditing`; the focused qualifier wins.
- “Audit this code for correctness.” → `$code__auditing`; the focused qualifier wins.
- “Review this code for performance.” → `$code__auditing`; general performance is a focused code review.
- “Audit this Node backend for latency, scale, and cost.” → `$audit__optimizing-node-backend`; the explicit specialist domain wins.
- “Security audit this code.” → `$security__auditing-code`; the named specialist wins.
- “Why does this request occasionally double-charge?” → diagnosis / `$code__fixing-bugs` when a fix is requested.
- “Audit our test suite for coverage gaps.” → `$testing__auditing`.
- “Challenge the proposed queue architecture in this work spec.” → `$plan__question-spec-architecture`.
- “Refactor this function to improve readability.” → normal implementation; no audit unless diagnosis was requested.
- “Delete this obsolete adapter exactly as approved.” → normal implementation; an implementation-only deletion request is not an audit.
- “Who authored this file?” → use repository history; this skill is not authorship detection.

## 5. Borderline

**Prompt:** “This module is far too complex. What should we do?”

**Expected call:** Load when the user wants diagnosis or a cleanup plan for existing code. Do not load when the user already supplied an approved refactor and only asks for implementation. If intent is mixed, run the read-only audit first and hand the accepted actions to a separate implementation lane.

## 6. Collision and coexistence

**Prompt A:** “Start a fresh Codex agent and audit this code.”

**Expected call:** Delegate exactly once when the current conversation authored the candidate. The fresh reviewer loads `$code__auditing` and `$audit-ai-code-accretion` against the same narrow boundary. It does not spawn another reviewer. `$code__auditing` writes the one canonical report; this skill runs `EMBEDDED` and writes no second artifact.

**Prompt B:** “Audit this AI-generated payment worker for release safety, excess architecture, and weak tests.”

**Expected call:** Load `$code__auditing`, `$audit-ai-code-accretion` in `EMBEDDED`, and `$testing__auditing`, because the prompt explicitly names release, accretion, and test-confidence lenses. Run only those named lenses.

Ownership:

- `$code__auditing` produces the canonical report, release verdict, and severity.
- `$audit-ai-code-accretion` supplies the ten grades and deletion-first remediation section without a second report or ship verdict.
- `$testing__auditing` owns detailed oracle and suite-fidelity findings.

Named scope wins: “security audit this code” routes to `$security__auditing-code`, not the generic pair. No skill restates another skill’s full rubric.

## 7. Attention drift

**Prompt shape:** A long audit involving authentication, retries, migrations, performance constraints, four historical implementations, and extensive observability. Near the end, the user asks for the remediation roadmap.

**Expected behavior:** Essential security, data-integrity, migration, and measured performance machinery is preserved. The roadmap still starts with safe deletion and convergence, not a new cleanup framework. Every action names the surviving owner, preserved behavior, proof, and net concept effect. Cosmetic work does not displace structural consolidation. In `EMBEDDED`, the lens still returns its full owned assessment but does not create another report or append a rival action plan after the canonical one.

## Grading

Classify failures as:

- **Payload:** wrong dimensions or simplification doctrine.
- **Rewrite:** recognizes debt but still recommends additive fixes.
- **Routing:** loads for ordinary release, review, bug, or test-only requests; fails an unqualified code-audit prompt; or chooses the wrong output mode.
- **Collision:** issues a rival release verdict, duplicates a sibling audit, creates a second embedded report, or recursively delegates from the fresh reviewer.
- **Drift:** begins deletion-first but ends with a new framework or unbounded backlog.

Record actual cases run. Never invent pass rates.
