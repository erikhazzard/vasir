# Behavioral Cases

Maintainer material, not part of ordinary audit execution. These cases are authored expectations, not executed model results. A baseline failure is a hypothesis until observed. Use the same model, input, and evidence for the paired baseline/with-skill comparison; use descriptions only for routing checks. Do not award a pass for polished prose that makes the wrong decision.

## Shared fixture for cases 1–2

Supply a small repository fixture with these explicit facts:

- `selection-owner.js` and `panel-state.js` independently mutate the same selected item.
- `reconcile-selection.js` repairs differences; `retry-reconcile.js` retries it; `dedupe-reconcile.js` suppresses repeated repair attempts.
- All supported ingress and consumers are inventoried. The panel can read a derived view of the canonical owner; no offline, cross-process, or compatibility contract forces independent mutation.
- Current safeguards preserve the supported outcome, but adding a selection type requires synchronized edits to both owners and the reconciler.
- Existing contract checks exercise selection, replacement, and failure through the public interface. Other tests assert only the existence or calls of the repair helpers.

Do not silently infer these facts from filenames. A runnable version of the fixture must actually implement them before an execution can count as evidence.

## 1. Baseline failure — hypothesis test

**Input without this skill:** “Review the new selected-item type. We want excellent code and there is no deadline. What should change?”

**Record:** Does the reviewer recommend another local repair, treat each helper's callers as its justification, or bury ownership consolidation as cosmetic cleanup?

**Interpretation:** Those are hypothesized failures, not the expected answer to reward. If the unaided model already identifies and warrants the full owner-level correction, record that result; do not claim the skill caused a behavior it already exhibited.

## 2. With-skill behavior — same evidence

**Input:** Exactly case 1, with `SKILL.md` and the actual required specialist available.

**Expected decision:** `REWORK`; retain calibrated release classification without inventing P1. Trace the creating ownership decision, identify the smallest faithful owner/view shape, name repair machinery and obsolete proof that disappear, preserve outcome coverage, and provide one dependency-ordered plan. Apply the accretion specialist rather than merely name it.

**Failure:** Another flag, retry, coordinator, or framework is the default remedy; a simplification is deferred solely to ship sooner; all tests are preserved unquestioned; necessary guards disappear without contract analysis.

## 3. Should-trigger — descriptions only

These requests should select this lead audit, with its default structural composition:

- “Review this change before we merge.”
- “Is this code production-ready?”
- “Is there a better implementation here, not just something that works?”
- “Audit this module for correctness and developer experience.”
- “Review the performance of this change and tell me whether we're doing unnecessary work.”

**Check:** Ordinary phrasing works without requiring “accretion” or “S-tier.” Selection is followed by actual application when execution begins.

## 4. Should-not-trigger — descriptions only

- “Implement the new settings menu.” → implementation, not an unsolicited audit takeover.
- “Explain what a cache does.” → general explanation.
- “Use only audit-ai-code-accretion on this subsystem.” → the explicitly named specialist owns the review.
- “Rewrite the audit skill's description.” → skill authoring, not product-code review.

**Check:** The skill does not modify audited code, expand a specialist-only request, or create a mandatory completion ceremony for unrelated work.

## 5. Borderline — explicit intent wins

**A:** “Can we remove this cache? Audit the tradeoff.” → this lead audit plus accretion; preserve a cache when inspected budget evidence forces it.

**B:** “Use only the Three.js/Rapier performance specialist on the animation update.” → specialist-only; no automatic full audit.

**C:** “Only review the authorization decision in this handler; do not broaden to a subsystem audit.” → respect the exclusion. Inspect causally relevant authorization evidence inside the permitted boundary and apply structural reasoning there; disclose any excluded dependency needed for certainty.

**Failure:** Either a blanket refusal to follow an owner outside the immediate diff without an explicit exclusion, or an unauthorized general cleanup despite an explicit exclusion.

## 6. Collision and coexistence — one owner

**Input:** “Audit this Three.js/Rapier frame-loop change for correctness, repeated work, and patch-on-patch complexity.” Supply the actual specialist instructions and a fixture with one unnecessary repeated pure operation and one necessary authoritative physics update.

**Expected:** The lead applies accretion and the domain performance guard; consumes their evidence; reports one canonical recommendation, one separately identified release-risk classification, and one deduplicated plan. Keep necessary physics work; do not infer frame-time improvement from static operation counts. Preserve the accretion specialist's owned report elements without cloning its rubric.

**Missing-dependency variant:** Withhold the performance specialist. The reviewer must disclose missing domain coverage, continue supported analysis, and not claim that specialist ran or that its material boundary is fully accepted.

## 7. Attention drift — root fix near the end

**Input:** A long audit fixture contains many correct changes and justified compatibility code. After its midpoint, a new subscriber adds an “already replaced” flag to compensate for an obsolete subscription retained by the lifecycle owner. Establish the real cancellation semantics in the fixture.

**Expected:** The closing plan still prefers correcting the owner and deleting redundant downstream state where safe. Keep protection for genuinely in-flight callbacks if the API requires it. Do not bury the cause-removal recommendation beneath renames, infer a deadline, or demand deleting real compatibility.

**Failure:** The early doctrine appears in the introduction but disappears when choosing the final remedy.

## Execution record

After actual execution, record the exact case, material supplied, actual decision, and failure category if any: expertise, steering, routing, or attention drift. Separate artifact inspection from model behavior. No behavioral execution or pass rate is asserted by this package.
