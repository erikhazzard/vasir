# Question-Spec Eval Cases

These non-normative cases test whether `$plan__question-spec` changes the product decision without becoming an automatic gate. Record only cases actually run; never infer pass rates from this file.

## 1. Baseline failure

**Prompt without the skill:** “Review this work spec. A synchronous export request creates an export job, which requires a status store, polling endpoint, retry worker, reconciliation worker, and cleanup scheduler.”

**Failure to reproduce before counting the case:** The reviewer accepts export jobs as fixed and improves the polling, retry, and cleanup requirements without asking whether the supported export outcome can be delivered directly. If an unaided model already challenges the root capability, this baseline does not count.

## 2. With-skill behavior

Use the same prompt with this skill loaded.

**Expected decision:** Restate the user outcome without solution words. Ask whether the export must outlive the request or exceed a measured latency bound. If not, delete the job/status/polling/retry/reconciliation/cleanup chain and specify the smallest direct export behavior. If a real constraint forces async work, retain only the mechanisms that trace to that named constraint.

## 3. Should trigger

The skill should load for:

- “Audit this work spec before we build it.”
- “Question the spec and tell me if it actually delivers the requested journey.”
- “Start a fresh reviewer and adversarially review this work spec.”
- “Could we implement this plan perfectly and still fail the user?”
- Cold-context recovery that finds a concrete proxy substitution, contradictory non-goal, or high-regret product ambiguity.

Invocation is precision-first. The explicit review phrases route it in; ordinary spec authoring or implementation does not.

## 4. Should not trigger

The skill should stay out for:

- “Create or update the work spec for this feature.” → `$plan__maintain-work-spec`.
- “Implement the active rung in this approved work spec.” → `$plan__implement-work-spec`.
- “Challenge whether this proposed queue and worker topology is forced.” → `$plan__question-spec-architecture`.
- “Audit the scale and cost assumptions in this work spec.” → `$plan__question-spec-infra`.
- “Summarize the current active rung and next action.” → `$plan__prepare-summary`.
- A coherent approved spec with no explicit review request and no concrete high-regret mismatch → proceed; do not invent a gate.

## 5. Borderline

**Prompt:** “Read this work spec and tell me whether it will deliver what I asked for.”

**Expected call:** Load this skill. The request is evaluative even without the words “audit” or “adversarial.” If the user instead asks what the spec says, answer or use `$plan__prepare-summary`; explanation is not challenge.

## 6. Collision and fresh-review topology

**Prompt A:** “I just wrote this work spec. Start a fresh agent and audit the product journey.”

**Expected call:** Root §§6–7 delegate exactly once. The reviewer receives the request, current spec, exact boundary, and directly relevant evidence—not the author's reasoning or conclusions. The fresh reviewer loads this skill, runs directly, and does not delegate again.

**Prompt B:** “Question both the product journey and whether its queue architecture is forced.”

**Expected call:** One fresh review may apply `$plan__question-spec` for product/capability necessity and `$plan__question-spec-architecture` for the explicitly named moving-parts lens. This skill does not reproduce the architecture rubric, and the architecture sibling does not replace the product verdict. Accepted changes route through `$plan__maintain-work-spec`.

## 7. Attention drift

**Prompt shape:** A long work spec has a coherent user journey, nine requirements, several proof notes, and a late section where capability A introduces mode B, repair worker C, and reconciliation path D. The requested outcome never requires A.

**Expected behavior:** The final recommendation still challenges A before improving B, C, or D. It deletes the entire chain when the outcome survives, names the smallest direct behavior, preserves any mechanism forced by an observable contract or current authority/safety/data-integrity/compatibility/measured constraint, and does not expand into an architecture, infra, or proof audit unless explicitly requested or specifically warranted.

## Grading

Classify failures as:

- **Payload:** preserves a capability chain without an external forcing root or deletes a mechanism required by a real contract or constraint.
- **Rewrite:** notices the chain but optimizes B/C/D instead of challenging A.
- **Routing:** misses explicit work-spec review, loads during ordinary authoring/implementation, or steals a sibling's focused request.
- **Collision:** recursively delegates, sends the author's conclusions to the fresh reviewer, creates an automatic gate, or duplicates a sibling rubric.
- **Drift:** starts with the user outcome but ends by repairing the proposed machinery.
