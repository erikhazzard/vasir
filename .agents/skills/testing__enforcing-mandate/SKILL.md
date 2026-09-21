---
name: testing__enforcing-mandate
description: Designs and writes great tests. Use in conjuction when writing code, tests, or editing tests
---

# Prove Real Journeys and Make App States Reproducible

**A useful test fails when the user's journey breaks. A useful test setup lets a human open the same real app in the same state.**

Optimize for continued correctness and fast iteration, not test counts. Protect the actual experience, make difficult states cheap to reach, and delete complexity that no longer earns its place. A green suite that bypasses the broken app is not evidence that the app works.

**Place in the system.** This skill owns test selection, authorship, reusable scenario setup, and bounded simplification within the approved change. Read the actual repository instructions and existing launch/test conventions before acting. The governing workflow owns approval, release policy, and defect investigation; independent review remains independent. Do not invent root section numbers, tools, commands, or neighboring policies. Feed conclusions into existing work artifacts rather than creating another gate or report.

## 1. Define Correctness, Then Prove the Whole Journey

Describe the claim in one sentence:

> Given [meaningful starting state], [actor] enters through [real entrypoint], performs [action], and can observe [successful result].

**Define correctness before implementing behavior.** Establish the observable contract, plausible consequential failures, and the outcomes that distinguish them from success. Keep this local to the behavior slice, not an exhaustive failure catalog or separate planning document.

**Never let the implementation define its own correctness.** Do not finish code and then generate unit tests that mirror its branches, methods, mocks, or current output. Expected results must come from the approved contract or independent evidence. Tests for newly discovered failures are welcome: establish the correct outcome independently, then add or tighten the appropriate guard. Existing code or tests do not authorize preserving a defect.

**Default to E2E as the sole automated behavioral-test layer for application features.** Reuse or extend an existing real journey first. Unit, component, and integration tests are not default companion deliverables; a focused test must earn an exception under Section 5. This default does not replace repository-required static checks or other governing obligations.

Trace that path through the actual app before choosing tests. Find the normal boot path, state authority, relevant boundaries, existing scenario setup, and assertions that already protect the result. Repository facts require repository evidence; cite actual paths when reporting them.

**For a meaningful changed app journey, exercise the real app from the relevant starting state through the result.** Do this early enough to expose a broken boot or disconnected flow before investing in lower-level tests. Reuse an existing journey first. UI claims need the actual UI runtime; a route-handler test cannot establish that a screen loads, submits correctly, or renders the response. A service-only or CLI claim starts at that system's real entrypoint; do not invent a UI to call it end-to-end.

Keep the application's own wiring real: startup, routing, hydration, state management, rendering, action handling, orchestration, and persistence where relevant. Do not mount a disconnected component, inject the expected final store, or mock the request being investigated and call that proof of the journey. Use isolated local infrastructure and controlled external boundaries; live production dependencies are not a prerequisite for meaningful end-to-end proof.

Assert the user's result and the consequential system effect, not merely a click, HTTP success, callback, or nonempty DOM. When persistence is part of the claim, refresh, reconnect, or read through a public boundary to distinguish saved state from optimistic UI. Include the next action when it is necessary to establish that success is usable, not as an excuse to test unrelated journeys.

For UI work, inspect the rendered experience as well as functional assertions. Check the relevant screen for blank or broken rendering, hidden or blocked controls, missing assets, and material runtime errors. Canvas, WebGL, native, and device-dependent behavior require evidence from an appropriate runtime; DOM presence alone does not prove pixels or interaction. A screenshot alone does not prove the workflow either. Name any runtime or visual limitation rather than silently substituting a weaker claim.

**Fidelity wins first. Optimize speed among proofs that preserve the failure mechanism.** A focused test cannot replace the app journey or silently narrow its claim. Prepare irrelevant history directly instead of clicking through it; do not send every input permutation through the UI.

## 2. Make the Starting State Launchable

Treat state setup as shared development infrastructure, not disposable test boilerplate:

> Prepare an isolated scenario → boot the normal app → exercise the real behavior → observe the result.

The same scenario preparation must support **automated assertions and an interactive app a person can use**. Tests may tear it down; a development launch must keep it available until explicitly reset or stopped. Do not maintain separate fictional worlds for tests and manual debugging.

**Make any relevant state constructible on demand; do not enumerate every possible combination.** Use small, explicit recipes and domain parameters. State includes more than database rows: identity and permissions, session, route, local storage or cached state, authoritative server state, and—when the failure depends on them—time, randomness, other actors, connectivity, or event history. Distinguish valid reachable states from intentionally invalid or partial states used to prove recovery.

**Seed prerequisites, never the result under test.** Direct setup can skip irrelevant history; it must not skip the behavior being proved. Seed an account to test purchasing, but perform the purchase through the actual app. To test account creation, start before account creation. A race, transition, or reconnect failure needs the relevant events and ordering, not just a snapshot of the eventual state.

Reuse or simplify the repository's canonical fixtures, seed mechanism, normal launcher, and dependency seams. When the capability is missing, implement the smallest shared setup entrypoint and human-launch path needed for the current slice. Expose ordinary domain parameters rather than a new scenario language, registry service, dashboard, or second application architecture. Add concrete states as work needs them; do not turn one journey into a platform rewrite.

Setup may write through existing domain builders, supported APIs, or schema-valid persistence fixtures when those writes are not the behavior under test. After preparation, the app must use its normal runtime behavior. Avoid test-only business branches, alternate stores, pre-rendered success screens, and doubles that erase the risky semantics.

Keep preparation explicitly non-production, isolated, repeatable, and safe to reset. Use synthetic data and test identities; never expose an unrestricted seed/reset/auth-bypass endpoint or wipe shared data. Seed on explicit preparation/reset, **not on every page load**: automatic reseeding can conceal failed persistence. Return the actual launch command or URL, scenario identity, relevant parameters, and reset/cleanup instructions. Never fabricate a command because the repo lacks a launcher.

Read [App-state scenarios](references/app-state-scenarios.md) when building or changing preparation, interactive launch, reset, stateful reproduction, or evidence capture. A reusable launcher can be worth retaining even when no additional automated test is warranted: count the repeated navigation and data-preparation work it eliminates.

## 3. Simplify the System, Not Just the Test

Within the approved slice, **remove unnecessary production code as well as tests and fixtures**. When redundant state, an obsolete fallback, duplicate implementations, or needless coordination creates the testing difficulty, prefer eliminating that difficulty over adding another seam, adapter, mock, or synchronization layer around it. Preserve approved observable behavior and supported contracts; do not redefine the product merely to make proof easy.

Before a behavior-preserving refactor, use an existing sufficient guard. Add narrowly scoped characterization only when important existing behavior is uncertain. Then simplify, rerun the surviving journey, and remove the obsolete tests and supporting machinery together. Do not turn awkward legacy code into an unrelated testability project.

Inspect the affected proof surface for subtraction even when adding no tests. A test of a deleted invalidation mechanism does not earn retention because it already exists. Keep overlapping tests only when they catch a distinct failure, materially improve diagnosis, or provide a meaningfully faster feedback loop.

Do not write tombstone tests whose main assertion is that removed source code, routes, buttons, fields, flags, or private calls stayed absent. Protect the surviving contract instead. Absence remains legitimate when it is the product, security, privacy, or compatibility obligation—for example no unauthorized mutation, no secret disclosure, no duplicate charge, or an explicitly retired public endpoint's specified response.

Reduce concepts and maintenance, not just lines. Share irrelevant construction; keep the distinguishing inputs and expected results visible. Several readable tests can be simpler than a configurable scenario engine with hidden assertions. Do not chase negative line counts by deleting distinct protection.

Bounded migration machinery needs an explicit removal condition and owner under repository policy. A deliberately supported public contract does not acquire an artificial expiration date just because it has more than one path.

## 4. Decide What Proof Earns Retention

Before crediting an existing guard, ask:

> What materially wrong implementation could still pass this test?

The setup must activate the risk, the assertion must observe its harm, and the expected result must come from the approved contract—not from running the same production logic again. Exercising a function, route, or screen is not the same as distinguishing correct behavior from a plausible failure.

Choose `reuse | tighten | add | no new test`:

- **Reuse** when an existing guard actually detects the relevant failure in the relevant state.
- **Tighten** when an existing journey or assertion has a specific hole. Repair its setup, action, or oracle rather than adding another superficially similar test.
- **Add** when a stable, materially valuable contract remains unprotected and the guard repays its execution and maintenance cost. Include saved reproduction and interactive-development effort in that judgment.
- **No new test** when current proof is sufficient, the change does not alter a meaningful behavior, or durable retention genuinely costs more than the protection it buys. Name the evidence and limitation. Inspection can support a bounded internal or nonbehavioral change; it cannot establish an unexercised app journey.

Pruning obsolete proof is part of every option, not a fifth workflow. A new scenario recipe and a new test are separate retention decisions; neither automatically requires the other.

When deciding whether today's observation needs a durable guard, weigh future consequences: severity, plausible recurrence or edits, how easily wiring can drift, how hard the state is to reconstruct, and whether people would have to rediscover the failure manually. Favor a durable guard for important, repeatedly changed, non-obvious journeys. Favor existing proof or bounded inspection for low-consequence changes already caught cheaply. No invented score, test-count target, or probability threshold is required.

A faithful temporary reproduction does not automatically deserve permanent retention. Conversely, calling a guard expensive does not authorize declaring a consequential, unproved journey safe. Use the governing workflow for an explicitly narrowed claim when credible proof cannot be obtained.

## 5. Make Isolated Tests Earn an Exception

**Do not add unit, component, or integration tests by habit.** Before writing a focused test, name the material failure the E2E scenarios cannot expose with adequate determinism, precision, or input coverage. Identify the missing observation or control. A class, a coverage target, or cheaper execution alone does not justify another layer. If the journey already proves the risk, stop.

**For an isolated behavior slice: failure model → tests → implementation.** First establish its public contract, plausible consequential failure modes, and the outcome that distinguishes each failure from correct behavior. Write the corresponding tests before implementing or changing that slice. Work incrementally, not through every imagined failure upfront. When a new failure is discovered, update the contract or cases before changing the implementation. For existing code, establish intended behavior before modifying it; do not confuse characterization with approval of a defect.

The focused proof supplements the real journey; it does not replace it. The following are exception cues, not a menu of mandatory companion suites:

| Risk | Proof choice and boundary |
|---|---|
| App startup, navigation, interaction, rendering, or cross-boundary state flow | Keep this at the normal app entrypoint with real actions. Isolating a component cannot prove missing wiring. |
| Material rule violations outside the sampled journey inputs | Use contract-derived examples or bounded properties at the public domain boundary for the named input-coverage gap. |
| Storage transactions, ordering, retries, concurrency | Use controlled overlap or action sequences when E2E cannot reliably expose the material failure. Preserve real storage/protocol semantics; sequential calls against a fake do not prove race safety. |
| An external service you do not control | Validate a changed or unproved provider-contract assumption at the canonical boundary. Use existing representative evidence and a controlled local substitute where appropriate; state what remains unverified against the provider. |
| Performance or resource limits | Use a representative launchable workload and a sourced budget or observed symptom. Do not invent a fragile wall-clock CI assertion. |

An end-to-end claim ends at explicitly identified substituted boundaries. Never describe a mocked provider integration as verified against that provider. Inherit trustworthy repository fidelity evidence rather than demanding new paperwork for every established fixture. Add validation when the changed assumption or missing evidence actually requires it.

Use existing test-size conventions only to describe execution requirements and cost; a larger harness does not automatically provide stronger evidence. Do not add a second large journey when the existing one already proves the same failure.

Read [Proof patterns](references/proof-patterns.md) for an earned exception involving concurrency, properties, replay, containment, migration, external contracts, performance, or a difficult retention decision.

## 6. Execute for Fast, Trustworthy Feedback

For a defect, preserve a faithful pre-fix reproduction when feasible and proportionate through the governing defect workflow. Do not replace the observed failure with a convenient smaller one. New contract tests may precede runnable code, but a missing symbol, scaffold failure, or absent feature is not an observed behavioral failure. Do not manufacture one as proof; verify that the assertions discriminate correct behavior once the path is executable. For a critical new invariant, demonstrate a realistic counterexample when practical: a targeted fault, adversarial case, or bounded mutation must fail for the intended reason. Do not institute a mutation-testing program for every assertion.

Control causes rather than elapsed time. Use existing controllable clocks, completion signals, bounded condition waits, and explicit interleavings where needed. Avoid arbitrary sleeps, busy-waits, shared mutable fixtures, leaked resources, and unhandled asynchronous work. A fixed random seed does not control a concurrent schedule. Capture the state recipe, seed or minimized case, and relevant action order when generated testing fails.

Routine regression proof should be bounded, isolated, reproducible, and independent of live external services. Separate broader exploratory generation from the stable regression loop. Reuse existing generators when useful; do not create fuzzing infrastructure unless discovery is part of the approved work. A valuable discovered failure should reduce to a small reproducible scenario or example.

Run the focused journey and affected supporting checks after meaningful changes. Optimize setup, reuse safe application processes, and isolate per-scenario state before deleting relevant fidelity or papering over flake with retries. Do not share mutable accounts or caches to make parallel tests appear faster. Follow existing suite policy rather than inventing a full-suite gate for every edit.

Run the interactive launch too when adding or changing that capability: open the prepared state, verify the real action, and check that explicit reset reproduces it. A headless test passing does not establish that a person can open the scenario. Do not report a launcher, test, reset, renderer, or device path as verified unless it was exercised.

## 7. Leave Evidence and a Runnable Reproduction

**Every E2E run produces a machine-generated result linked to its reproducible scenario.** Record the actual code/build identity, relevant runtime, scenario recipe and parameters, and exact rerun command. Preserve the seed and action ordering when they affect reproduction. Use native runner metadata and attachments, not a parallel reporting system. Incomplete execution is not a pass.

**Feature-verification runs leave inspectable evidence of the actual journey and result.** Use the existing report, trace, relevant screenshots, public effects, or equivalent runtime evidence sufficient to inspect the claim. Capture during execution, not only after the final assertion. Register finalization before the journey, preserve diagnostics on preparation, startup, action, assertion, or teardown failure, and save evidence before disposing of state where possible. Evidence capture must not suppress the test failure or prevent cleanup.

**Evidence shows what happened; reproduction makes it happen again.** Link the same scenario's working interactive launch and reset path. A trace or screenshot is not a substitute for reconstructible state and executable actions. A seed without the relevant runtime, state, or event history is not a complete reproduction.

Keep a lightweight result for every run and richer evidence for feature verification and failures. Do not mandate full videos or traces for every passing test forever, create a reporting framework, or expose secrets in artifacts. State any unavailable evidence or unexercised rerun path rather than inventing it. See [App-state scenarios](references/app-state-scenarios.md) for capture, finalization, and rerun details.

## 8. Recognize the Difference

**Green internals, broken app.** A mocked state store returns a running match and a component test sees a score. This proves neither app startup nor reconnection. Instead, prepare a running server-side match plus the relevant stale client state, boot the normal app, reconnect through the real interaction, and observe the authoritative score and next valid action. Use that same preparation to open the scenario interactively. Add focused protocol tests only for named material gaps in the journey's determinism, precision, or input coverage.

**Preparation is not proof.** A scenario inserts a completed order and a browser sees confirmation. That can prove confirmation rendering; it cannot prove checkout. For checkout, prepare the cart and identity, act through checkout, then establish the approved order effect and displayed result. Keep third-party substitution limits explicit.

**Deletion instead of compensation.** An approved refactor removes a redundant cache and its invalidation coordination. Protect the surviving read-after-write journey, delete obsolete invalidation tests and unused fixtures, and reuse the launchable state. Do not add a mock cache layer to preserve the removed design or a source-text test to celebrate its absence.

## Anti-Patterns

- **Green mocks, broken app** → the test removed the risky assembly → boot the real app and exercise the journey.
- **Implementation first, mirror tests afterward** → the code chose its own definition of correctness → establish the contract and failures independently; for isolated slices, write tests before implementation.
- **Every feature gets every test layer** → companion suites accumulate without a distinct risk → default to E2E only and require a named gap before adding a focused test.
- **Seeded success** → setup performed the action being tested → seed only prerequisites, then perform the action for real.
- **Tests and dev use different worlds** → failures cannot be inspected faithfully → share preparation and normal runtime paths.
- **Everything through clicks** → slow, brittle setup hides the useful action → prepare irrelevant history directly and keep the tested behavior real.
- **A new layer to test the previous layer** → complexity compounds → simplify or remove the unnecessary mechanism within scope.
- **Arbitrary-state framework before a useful state** → imagined generality replaces leverage → ship a small launchable scenario with ordinary parameters first.
- **"Covered" without a discriminating assertion** → execution is mistaken for evidence → identify the wrong result that must make the guard fail.
- **Screenshots without a runnable state** → evidence cannot be reproduced → preserve the scenario, actions, runtime, and working launch/reset path.
- **Artifacts only after success** → the failure destroys its own evidence → capture during execution and finalize before cleanup.

## Result

Return the smallest useful account of the journey and state, retention decision, relevant deletions, exact commands and observed results, native artifact paths, and unverified boundaries. Name the concrete gap for any added isolated test. For E2E or scenario work, include the scenario's working interactive launch and reset path with the necessary non-secret parameters. Distinguish authored from executed, observed evidence from runnable reproduction, and automated from visually or manually verified. Keep durable conclusions in the existing owning artifact; the runner's result and evidence do not require a separate prose testing report.

**Define the behavior and its failures first. Prove it through the real app. Leave evidence you can inspect and a scenario you can run. Delete what no longer earns its cost.**
