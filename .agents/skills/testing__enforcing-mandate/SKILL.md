---
name: testing__enforcing-mandate
description: Protects behavior with useful tests and less test debt. Use when changing code or tests.
---

# Protect Behavior Without Test Debt

**Tautological tests are banned at every layer. New or changed user workflows require real automated journey coverage. Use explicit, repo-searchable domain names. Preserve distinct protection when simplifying.**

Start with the user's action and consequential result. Reuse sufficient E2E coverage; extend or add a journey when the workflow lacks protection. Keep unit, component, and integration tests for the rules, boundaries, and states they prove directly.

## 1. Establish the Claim and Existing Protection

State the meaningful starting state, action or operation, and observable result. Define correctness from the approved contract before implementing or changing behavior. Identify plausible consequential failures and the outcomes that distinguish them from success.

Read repository instructions and search for the owning production path, existing journeys, fixtures, and assertions. Trace entrypoints, state authority, and dependency boundaries before choosing a test. Read original tests before classifying them; names such as unit, journey, or contract do not establish their protection.

For a discovered defect, establish intended behavior independently; current code and tests can both be wrong. Before a behavior-preserving refactor, reuse sufficient guards and add characterization only for consequential behavior that remains uncertain.

## 2. Choose the Boundary That Exposes the Failure

Choose the smallest boundary that still exposes the claimed failure; convenience cannot justify bypassing it. A user-flow claim needs the assembled app. A focused rule can use a focused test. Consider input coverage, fidelity, determinism, diagnosis, runtime, and maintenance together.

| Claim or risk | Useful proof |
|---|---|
| A calculation, parser, serializer, validation rule, or state transition | Unit or property tests with independent examples and meaningful boundaries; test production behavior rather than a test-owned replica. |
| Component interaction, rendering, or accessibility within a bounded component | Component tests at its public interface; exercise the actual app too when routing, state ownership, or integration is the claim. |
| Persistence, transaction integrity, provider protocol, or concurrency | Integration or contract tests with the relevant real engine/protocol semantics; controlled overlap or failure injection when ordering matters. |
| Startup, navigation, authentication wiring, or a user workflow across systems | A real journey through the normal entrypoint, asserting the user result and consequential effects. |
| Performance or resource use | A representative workload and an approved budget or observed symptom; avoid fragile wall-clock assertions invented for routine CI. |

Exercise changed journeys early: UI claims through actual controls, service claims through public routes, CLI claims through real commands. Assert the consequential result through an independent observation: the recipient receives the message, a reopened session loads saved progress, or a rejected action leaves protected state unchanged. Successful responses, callback counts, DOM presence, and screenshots alone do not establish these outcomes. A focused test cannot establish wiring it bypasses.

Keep the behavior under test real. Use controlled external boundaries and isolated local infrastructure where appropriate. A fake that removes the transaction, timing, serialization, or failure semantics cannot establish those claims. Disclose substituted providers rather than calling their live integration verified.

Do not give every feature a companion suite at every layer. Overlap can earn retention through distinct inputs, failure modes, materially better diagnosis, or a useful fast feedback loop. A class name, coverage percentage, or E2E label alone justifies nothing.

Read [Proof patterns](references/proof-patterns.md) for concurrency, properties, replay, containment, migrations, external contracts, or a difficult retention decision.

## 3. Make Assertions Independent and Discriminating

**Never derive expected results by rerunning or copying the implementation under test, compare a value with itself, or bless current-output snapshots without checking the contract.** Mock echoes and assertions that only confirm the setup are equally weak in unit tests and E2E.

Use contract-derived examples, literal expected values, independent invariants, or observable business effects. Interaction assertions are valid when the interaction is itself the obligation, such as a required request shape. A controlled double may expose a real production error path; merely verifying that a configured mock returned its configured value proves nothing.

Name a plausible wrong implementation and the assertion that rejects it. Check that existing or new coverage distinguishes a restrictive rule from blanket rejection: suppress duplicate effects while allowing a distinct operation. An always-empty result can satisfy negative assertions. Tighten valuable guards with missing assertions rather than deleting them.

Preserve the strength of the oracle. An exact value, membership set, error, or conservation relationship cannot be replaced by truthiness, type, nonemptiness, or a broad range unless the contract actually permits that variation. Freshness and stability checks do not establish exact persisted-value retrieval.

For a critical invariant or disputed replacement, a bounded counterexample or targeted mutation can check that the assertion fails for the intended reason. Reuse existing tooling; do not build a mutation program or require faults for every assertion. Passing selected faults does not establish equivalence to the whole original suite.

## 4. Simplify Without Losing Distinct Protection

**Before deleting or consolidating a test, identify its distinct assertions and the states that make them meaningful. Find their surviving protection, move them into a suitable survivor, or retain the focused guard.** Keep this reasoning local to the change; no separate coverage ledger is required.

Compare the setup, action, expected result, and observed boundary. Calling the same endpoint or traversing more code does not make one test subsume another. Check material fields, error and authorization cases, state partitions, ordering, and relationships between effects. A user-visible balance alone may leave an unbalanced journal unobserved; a current-session write/read may leave retrieval of existing records unprotected.

Delete tautologies, test-owned forwarding checks, obsolete behavior, and genuine duplicates with their unused helpers. A useful assertion buried in an otherwise weak test should be moved or tightened. When replacement coverage is uncertain, keep the useful guard while resolving the gap. Approved removal of a supported behavior can retire its tests; simplification alone does not authorize dropping its contract.

Choose reuse, tighten, add, or no new test. Prefer an existing sufficient guard. Add a test when a material behavior lacks protection or the new guard earns its cost through reliable feedback. Add no test for a low-impact internal change already caught by existing proof. Weigh severity, plausible recurrence, reconstruction cost, and maintenance rather than a test-count target.

Organize tests by domain capability. Each test file needs a concise header naming protected behavior, exercised boundary, and scope limits; preserve accurate headers and update stale claims. Titles name conditions and outcomes. Keep setup and expectations visible; avoid opaque scenario engines.

**Domain-bearing identifiers must be explicit and repo-searchable, even in short tests.** Search production code and adjacent tests for canonical domain terms; use them consistently in variables, parameters, fixtures, and helpers. Prefer long names identifying the actor/entity, role, and relevant state, unit, or encoding: `submittedCheckpointGzipBase64`, `loadedCheckpointResponse`, `expectedCheckpointRevision`. Reject `x`, `data`, `res`, `tmp`, `value`, and `bytes` when they hide domain meaning. Searchability comes from canonical concepts, not arbitrary prefixes or uniqueness. Preserve protocol fields and dependency APIs; short mathematical coordinates or counters are acceptable only when they carry no hidden domain role.

Do not retain tombstone tests merely asserting that private code or helpers remain absent. Absence is a valid assertion when it protects an actual security, privacy, compatibility, or product obligation. Preserve deliberately supported contracts; temporary migration machinery follows its real removal condition.

## 5. Prepare the State the Claim Requires

Reuse the repository's fixtures, builders, dependency seams, and launch commands. Prepare irrelevant history directly and exercise the claimed operation through its real boundary. Keep one-off inputs inline when an abstraction would add no reuse or clarity.

**Seeded data can be valid input.** A schema-valid stored record followed by the production reader and an independent exact assertion proves retrieval. It does not prove the write path. To test creating that record, perform the write; to test reading an existing record, creating it through the writer can introduce an unnecessary dependency or conceal the distinction being tested.

When a failure depends on a transition, retry, race, or reconnect, reproduce its event and ordering. When claiming restored usability, exercise the next valid operation through its real boundary under the contract's recovery conditions; surviving state alone is insufficient. Preserve meaningful supported old, absent, partial, or invalid states; label deliberately inconsistent inputs.

Make setup isolated, repeatable, and safe to clean up. Use synthetic identities and scoped resources. Do not add test-only business branches, production auth bypasses, or unrestricted reset endpoints. Separate reload from reset: automatic reseeding can conceal failed persistence.

**Interactive launchers are optional.** Reuse existing launch/reset paths. Extend them only when requested, required by the workflow, or justified by recurring debugging. Share preparation with explicit lifetimes when tests and humans both need it. Exercise changed launchers before handoff; report parameters and limits without credentials. Routine cleanup does not warrant a REPL, scenario framework, or development mode.

Read [App-state scenarios](references/app-state-scenarios.md) when stateful reproduction, launch/reset, or evidence capture needs more than the existing test setup.

## 6. Execute and Preserve Useful Evidence

For a changed rule or defect, establish its contract and a discriminating test before changing the implementation when practical. Preserve a faithful pre-fix reproduction for an observed bug. A missing symbol or scaffold failure is not evidence that a behavioral defect was reproduced.

Control causes through clocks, completion signals, bounded waits, and explicit interleavings. A fixed random seed does not control a scheduler. Avoid arbitrary sleeps, shared mutable data, leaked resources, and retries that hide flake. Preserve relevant minimized inputs, seeds, and action ordering.

Run the selected guards after meaningful changes; include real journeys when the change threatens their wiring or workflow. Use repository policy for broader checks. Optimize setup and reuse safe processes before sacrificing fidelity; keep each scenario's mutable state isolated. Exploratory discovery and stable regression execution need not share a runtime budget.

For UI claims, inspect actual rendering and interaction for blank screens, blocked controls, missing assets, and runtime errors. DOM presence alone cannot prove canvas pixels or a usable workflow; a screenshot alone cannot prove the action's effect. State device and runtime limits honestly.

Keep native runner outcomes, exact rerun commands, and relevant code/runtime or input identity. Capture diagnostic evidence before teardown can destroy it. Preserve the original failure when reporting capture or cleanup failures; incomplete execution is not a pass. Lightweight native results suffice for routine passing checks; use richer existing traces or captures when needed to inspect a feature or failure. Do not introduce a parallel reporting system.

## 7. Recognize the Decision Boundary

**Useful unit test.** Independent examples exercise a production pricing rule's rounding and boundary behavior. A checkout journey samples one purchase. Keep the focused cases if they catch rule failures that the sampled journey misses; avoid duplicating identical arithmetic at several layers without a feedback benefit.

**Seeded reader versus seeded success.** Insert a valid existing checkpoint, invoke the real reader, and compare exact bytes and revision. That is reader protection. Inserting it and declaring the save operation tested would bypass the save. Preserve each claimed behavior at its relevant boundary.

**Safe consolidation.** Move exact metadata, balanced-effect, and initial-state assertions into a surviving journey when its setup still exposes their failures. Delete the obsolete test and helper only after verifying the replacement. More end-to-end activity does not compensate for weaker expectations.

**Earned deletion.** An approved refactor removes a cache and its invalidation coordination. Run the surviving read contract, remove obsolete cache-specific tests and unused setup, and add no mock cache or source-text absence test.

## Result

Report protected behavior, material protection moved or deleted, exact commands and outcomes, existing evidence paths, and unverified boundaries. Distinguish authored from executed and automated from manual proof. Update the existing owning artifact; introduce no parallel report.
