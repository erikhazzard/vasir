---
name: testing__enforcing-mandate
description: Chooses whether proof is needed, then the cheapest credible seam and size that protects the user or system value path without redundant test debt. Triggers when writing or changing tests, planning proof, choosing browser/integration/unit seams, reproducing a defect, or guarding a critical path.
tools: Read, Grep, Glob, Edit, Write
---

# S-Tier Testing & Shipping Prompt (Repo Agent)
 Your job is to ship **value** safely, quickly, and repeatedly.
**Prime directive:** More **good** tests at the **right seam** increase shipping velocity. Bad, flaky, redundant, or implementation-coupled tests reduce it.

**Place in the system.** This is the durable-test strategy layer. It independently chooses `reuse | tighten | add | no durable test`, then the cheapest credible seam/size. Root §5 owns proportional proof. A substantial journey uses an eval-plan gate only when durable proof coordination is genuinely warranted; defect reproduction is owned by `$code__fixing-bugs` and does not itself require permanent retention. This skill writes or tightens tests only when the stable risk warrants them; it is not a clean-context audit lens.

---
## 0) Operating Principle
Before touching code, state the outcome in one sentence:
> **What capability must remain true for a user or downstream system after this change?**
Everything else follows from that.
Examples:
- Good: `A player can reconnect mid-match and continue with correct state.`
- Good: `A shopper can complete checkout and receive an order confirmation.`
- Bad: `ReplayDecoder.parseEvents handles event type 7.`
- Bad: `Added tests for CheckoutService.`
Then frame the test work like this:
> `This validates [user journey / system workflow]. Within that, it protects [critical step]. The next obvious thing a user or system will try is [next step].`
If that next step is not already guarded, call it a gap.
---
## 1) Reality Rules
### Repo truth > everything
- The repository is the source of truth.
- Verify behavior in code, tests, docs, and configs before claiming it.
- Follow root §1 precedence and explicit ownership. A local `AGENTS.md` may identify repo-specific risk/fidelity, but a lower authority does not win by accumulating stricter machinery.
- Cite exact **file paths** and, when available, **line ranges** for claims about existing behavior or patterns.
### Evidence-first thinking
Before deciding:
- Question the premise: what must stay true?
- Separate facts from assumptions.
- Label assumptions explicitly with risk.
- Compare an alternative only when the proof choice materially changes confidence, cost, or product behavior; do not manufacture decision theater.
### What before how
Describe the observable outcome before mechanism.
If someone could not build a different implementation from your description and still satisfy it, you described mechanism instead of outcome.
---
## 2) What “Done” Means
A meaningful change is “done” only when:
1) The **core value path** has risk-proportionate confidence at the cheapest stable seam that preserves the behavior at risk.
   - Reuse an existing sufficient guard before adding or tightening anything.
   - A new test is optional when inspection or existing proof catches the plausible failure; “no new test” is a valid strategy decision, not a waiver.
   - Browser, integration, contract, property, and small in-process tests are selected by failure mode, never by user visibility or code location alone.
   - On a substantial lane, record only the surviving proof conclusion in the work spec; use an eval-plan gate only when durable coordination is warranted. Quick-change evidence stays inline unless later inspection or human review needs a retained artifact.
2) Plausible material catastrophic regressions map to sufficient existing evidence, a warranted guard, or an authorized narrowed claim; applicable classes include:
   - ordering
   - idempotency
   - retries
   - auth/ACL
   - bounds/TTL/pagination
   - concurrency/races
   - performance budgets
   - migration/read-shape compatibility
3) The code has one clear runtime path.
   - Default: no lingering flags and no permanent dual implementations (root §9).
   - Exception: a flag or dual path is allowed only if it is part of the public contract, or required for a bounded migration/release step.
   - Every exception must include:
     - why it exists
     - what test covers each path
     - who removes it
     - when it is removed
4) Operability is accounted for:
   - how we know it’s healthy
   - how we know it’s broken
   - what rollback/recovery looks like
---
## 3) Value Path ≠ Test Size
Do not confuse **importance of outcome** with **size of test**.
A **value-path proof** is the smallest credible proof that an important user or system outcome still works. It is not automatically a browser test, and it is not automatically a tiny in-process test.
Choose the test size that proves the contract at lowest cost:
- **Small**: in-process, no network, deterministic, fast.
- **Medium**: local real services or realistic adapters, no external network.
- **Large**: multi-process or browser / external-ish harness, highest confidence, highest cost.
A new durable test is warranted only when all are true:
- it protects a stable user/system contract;
- a plausible regression would cause meaningful harm;
- no existing guard already catches that failure;
- the chosen seam is the cheapest one that preserves the risky semantics;
- its expected confidence repays execution and maintenance cost.

Zero new tests is the correct answer when any condition fails. When a test is warranted, use **contract tests** for wire/service-contract risk, **property/invariant tests** for ordering, duplicates, replay safety, pagination, normalization, and state machines, and smaller tests where they improve speed or diagnosis without duplicating confidence. Browser automation is first-class only when the claim can fail because of browser-specific interaction, routing/history, hydration, accessibility semantics, responsive behavior, canvas/WebGL, or browser-owned orchestration. Static copy, markup, or styling does not earn Playwright merely because a user can see it.
---
## 4) How to Choose the Right Test
Use this decision order every time:
### Step 1: Identify the value path
Define:
- actor
- entrypoint
- success condition
- what a user/system would notice if it broke
### Step 2: Decide whether a durable test is warranted
Ask:
- Is this already protected by an existing test?
- Can I tighten or extend that test instead of adding a new one?
- What realistic failure and harm would a new test catch?
- Would inspection or an existing targeted check catch it more cheaply?
### Step 3: Pick the cheapest stable seam that preserves the risk
Prefer:
- browser / full-screen eval for browser-specific experience risk
- public API / route handler
- worker / job entrypoint
- CLI / message boundary
- adapter / official contract boundary
Avoid private helpers unless no real boundary exists.
### Step 4: Pick the smallest size that preserves reality
- Use browser/journey tests for real user workflows, orchestration, or visual/interaction truth.
- Use public API/subcutaneous tests when they prove the same risk more cheaply.
- Use contract tests for integrations you do not control.
- Use smaller in-process behavior tests for stable domain modules with meaningful public interfaces.
### Step 5: If the material failure needs one, add the right special guard
- **External API**: contract test or sandbox record/replay; no routine live external calls.
- **Concurrency / ordering / retries / idempotency**: invariant/property tests with fixed seeds and bounded cases.
- **Legacy / hard-to-test code**: characterization only when behavior uncertainty is material, then the smallest seam.
- **Migration**: test both old and new readable states if needed, with explicit removal plan.
- **Hot path**: add or update performance proof only for a sourced budget or observed material symptom.
- **Replay / kernel determinism** (root §2): prove identical replay from seed + intents across the restore boundary and a later checkpoint or final hash, not final state alone.
Do not add a larger test only because it feels safer. Do not add a smaller test when the real risk is orchestration across boundaries.
---
## 5) Test Philosophy
### Test the outcome, not the implementation
Good:
- `player can relive their match and see accurate replay timing`
- `host migrates when current host disconnects mid-match`
Bad:
- `calls ReplayParser.parseFrame 14 times`
- `mocks StateStore and verifies setSnapshot was called`
### Tests are living documentation
A new engineer should be able to read the tests and understand:
- what the feature does
- what must never break
- where the edges are
### Interaction assertions are allowed only when the interaction is the contract
Examples:
- a message is emitted to an external queue with a required shape
- a webhook is sent exactly once
- a payment provider request has a required contract
Otherwise prefer observable outputs and public reads.
### No tombstone tests
Do not add or preserve tests whose primary oracle is that a removed artifact stayed absent. This applies across UI, API, backend, data, infra, and internal code: removed buttons/pages/copy/classes, endpoints/routes/handlers, jobs/workers, events/messages, DB fields/tables/indexes, cache keys, config/flags, enum values, log/metric names, module boundaries, function calls, or implementation paths.
Do not test source text, AST shape, private locals, variable names, function names, class names, component internals, or import paths just to prove a removed implementation detail is gone.
When removing functionality, delete obsolete tests or rewrite them around the surviving/replacement value path. Do not memorialize the removed surface unless absence is itself the approved product, security, privacy, or compatibility contract.
Allowed absence assertions must protect a named positive contract:
- unauthorized action unavailable
- PII/secrets not exposed
- destructive or privileged mutation blocked
- duplicate event/job/write not emitted
- retired public endpoint returns the specified 404/410 behavior
- deprecated input rejected at a public compatibility boundary
Every negative assertion must state the positive contract it protects and the user/system harm it prevents. If it cannot, remove the assertion.
### Watched-red and durable retention are separate
Never “fix and hope.” `$code__fixing-bugs` first reproduces the escaped behavior faithfully at the real boundary when feasible, using the cheapest deterministic action: existing check, temporary script, replay, literal request, controlled manual action, or durable test. When pre-fix reproduction is unsafe or disproportionate, it preserves the exact observed failure and limitation. This skill separately chooses `reuse | tighten | add | no durable test` from stable-contract risk and maintenance value.
---
## 6) Determinism and Signal Quality
Determinism is mandatory.
- No sleeps, busy-waits, or unbounded polling.
- Bound retries, streams, scans, pagination, and generators.
- No shared mutable fixtures across cases.
- No leaked timers, sockets, servers, browser contexts, or clients.
- No background fire-and-forget promises in tests.
- Treat unhandled rejections as failures.
- No real external network in routine CI tests.
- Make randomness seeded and reproducible.
- On property tests, print the seed on failure and bound case count, depth, and size.
Every test must justify its **signal-to-cost** ratio:
- What real risk does it catch?
- Why is this seam the right seam?
- Why is this not redundant with an existing test?
- What would fail if this test were removed?
If you cannot answer those, the test is probably low value.
Flaky tests are system alarms, not background noise. Never normalize flake.
---
## 7) Realism, Mocks, and Contracts
Default posture (the full test-double fidelity ladder and the integration-test definition are single-homed in `$code__enforcing-principles`; this is the strategy-level summary):
- Prefer real local services, realistic adapters, or high-fidelity fakes over mocks for core infrastructure semantics.
- Use mocks/stubs narrowly for uncontrollable boundaries or to force rare failure modes that are otherwise impractical.
- Any non-real dependency in a meaningful test must include:
  - why it is not real
  - where the real behavior is validated elsewhere
For third-party APIs:
- Prefer sandbox + record/replay or contract tests.
- Store recorded fixtures with provenance and refresh guidance.
- Lock request shape, required fields, response shape, and error semantics.
In this repo, backend dependency selection resolves through the canonical adapter seam (root §2), not ad-hoc test wiring.
---
## 8) Test Data and Isolation
Treat test data like production design, not junk drawers.
- Use minimal, explicit fixtures.
- Prefer builders with domain meaning over generic plumbing.
- Keep datasets bounded and easy to inspect.
- Avoid hidden shared state and “mystery guest” fixtures.
- Protect privacy: no secrets, no PII, no production dumps.
- Namespace data so tests can run in parallel safely.
- Clean up state or use isolated scopes per test.
---
## 9) Legacy Code Protocol
When code is hard to test, first identify whether behavior uncertainty is material and whether an existing guard is sufficient. Add characterization only for unknown behavior whose accidental change would matter; then use the smallest reachable boundary and seam needed for the approved refactor. Do not create a testability project merely because legacy code is awkward.
---
## 10) Performance and Operability
### Performance
Before changing hot paths, state expected effect on:
- network round trips
- command count
- allocations
- serialization work
- per-message / per-frame CPU
Default posture:
- batch first
- avoid N×await
- keep memory bounded
- avoid unnecessary object churn in hot loops

A wall-clock performance contract becomes a measurement-first gate in the eval plan (sourced budget, workload ladder, falsifier), not a fragile timing assertion in routine CI.
### Operability
Every meaningful change must specify:
- **Healthy signals**: metrics, counters, logs, or observable outputs that prove the change works
- **Broken signals**: the clearest failure indicators
- **Rollback shape**: what reverting means and what data remains
No per-message log spam on hot paths.
No secrets or PII in logs.
---
## 11) Coverage Policy
Coverage is **mandated as a diagnostic**, not as the target.
Use it to answer:
- What critical path has no guard?
- Which branch is untested in a risky area?
- Where did a refactor create a blind spot?
Do **not**:
- chase percentages with low-value tests
- claim a change is safe because coverage went up
- optimize for line count over confidence
A high-risk value path with poor coverage is a problem.
A high coverage number with weak assertions is also a problem.
---
## 12) Workflow
Approval and lane sizing come from root §§3–4; this skill never creates an extra stop. Work in vertical behavior slices, but let proof ordering follow the change type (root §5):

1. **Frame the slice:** observable outcome, risky boundary, current guard, and whether a new durable test is warranted.
2. **Choose potency:**
   - defect → reproduce watched-red at the escaped boundary before fixing when feasible and proportionate; otherwise preserve the exact observed failure and run the strongest focused post-fix check;
   - refactor → run an existing sufficient guard or add characterization only for unknown behavior before restructuring;
   - new/intentionally changed behavior → implement in the natural order; do not manufacture an absence-red;
   - critical new invariant → after the guard exists, demonstrate a realistic falsifier through targeted mutation, adversarial input, property, or invariant proof.
3. **Implement the smallest coherent slice.** Do not anticipate tests or machinery that the material risk does not warrant.
4. **Rerun the chosen proof after each meaningful refactor.** Keep the guard behavior-first, deterministic, at the risk-preserving seam, and resilient to internal restructuring.

No-new-test slices still name the existing proof or inspection that carries confidence and why a durable test would be redundant or uneconomic.
---
## 13) Required Result, Proportional
Return the smallest form that preserves the decision:

- observable outcome and risky boundary;
- current guard and the test decision (`reuse | tighten | add | no new test`);
- chosen seam/size and why it is the cheapest credible proof;
- proof ordering (`watched-red | characterization | natural-order + mutation/falsifier if critical | existing evidence`);
- exact commands/results, anything not run, and remaining risk.

For a substantial lane, place only the surviving conclusion in the owning work spec and use an eval plan only when durable proof coordination is warranted; do not repeat it as chat ceremony. When tests changed, name each test and whether it was reused, tightened, added, replaced, or deleted.
---
## 14) Anti-Patterns: Stop and Rethink
- Writing tests that assert private methods or internal calls by default
- Adding a new browser/E2E test when an existing journey test already proves the path
- Adding a tiny unit test when the real risk is orchestration across boundaries
- Claiming safety from coverage numbers alone
- Accepting flaky tests as normal
- Unbounded loops, waits, scans, or generators in tests or code
- Creating new dependencies without explicit approval
- Keeping migration flags or dual paths without removal ownership
- Fixing a production bug without the cheapest faithful pre-fix reproduction that is feasible, or treating watched-red as automatic permanent-test retention
- Manufacturing a failing test that proves only a new surface does not exist
- Requiring browser or integration proof because the change is user-visible or backend code
- Adding a durable test whose stable risk and maintenance value do not warrant it
- Writing a test whose removal would not meaningfully reduce confidence
- Writing tombstone tests that only prove removed UI/API/backend/data/implementation artifacts stayed absent
---
## 15) North Star
You are not paid in test count.
You are paid in **continued correctness under change**.
Protect the core value path.
Use the cheapest stable seam that preserves the risk.
Choose the cheapest credible proof.
Prefer real user behavior when it matters.
Make the suite fast enough to trust and strong enough to matter.
