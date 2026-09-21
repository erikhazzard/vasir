# App-State Scenarios

Read when creating or changing state preparation, launch, reset, stateful reproduction, or run evidence. These are design decisions, not a requirement to adopt a new fixture framework.

**Contents:** 1. What Must Be Reconstructible · 2. One Preparation Path · 3. Human and Automated Lifecycles · 4. Preserve the Event That Can Fail · 5. Useful Scenario Selection · 6. Worked Decisions · 7. Failure Diagnosis · 8. Evidence and Runnable Reproduction

## 1. What Must Be Reconstructible

A scenario is a small recipe for entering the actual app with specified preconditions. It is not a screenshot, an expected final store, or a mock component tree.

Start with the state dimensions that cause the behavior under investigation. Include more only when they change the result:

| Dimension | Examples of relevant distinctions |
|---|---|
| Identity and authority | First-time or returning user, role, ownership, expired session, another participant. |
| Durable data | Empty, populated, boundary-sized, old readable shape, partial or deliberately invalid record. |
| Client-local state | Route, navigation history, storage, stale cache, pending local work, cold or restored session. |
| Runtime and resources | Clock, seeded randomness, viewport/input mode, renderer readiness, loaded or failing resources. |
| Distributed state | Other actors, server truth, connection loss, in-flight requests, acknowledged versus unacknowledged actions. |
| History | Actions or events that establish the relevant transition, order, replay position, or checkpoint. |

Keep authoritative and derived state distinct. Seed the authoritative source and let normal code derive the rest unless a stale or inconsistent derived state is itself the precondition. Label deliberately inconsistent scenarios so they are not mistaken for ordinary valid state.

A seed alone is not a full reproduction when identity, local storage, time, or action ordering controls the failure. Capture the missing inputs rather than repeatedly enlarging the dataset.

## 2. One Preparation Path

Find the existing fixture builders, seed scripts, app launcher, canonical dependency configuration, and reset facilities. Extend or consolidate them rather than writing one scenario loader for tests and another for development.

The logical capability is simple: accept a recipe and explicit domain overrides, prepare an isolated scope, and return the app's normal launch inputs plus reset/disposal information. This is a capability description, not a mandatory API, manifest schema, or file layout. A small shared function and the existing development command may be sufficient.

Keep recipes in the repository's established home. Name recurring states in domain terms. Expose ordinary parameters for meaningful variation—such as role, collection size, cache freshness, or checkpoint—without adding a generic language of conditionals and actions. Keep one-off inputs inline when a named fixture would add no reuse or clarity.

Preparation should:

1. Allocate or identify an isolated non-production scope and known test identities.
2. Establish only the preconditions using current domain builders, supported APIs, or valid persistence fixtures.
3. Configure the normal app to use that scope and the intended dependency boundaries.
4. Wait for actual readiness, then provide the entrypoint and relevant non-secret identifiers.

Use the real storage engine or protocol where its semantics matter. A convenient in-memory map is not interchangeable with database transactions, indexes, TTLs, or serialization. A controlled substitute is acceptable outside the claimed boundary; disclose that boundary.

Preconditions must honor relevant schema constraints and relationships. Fail clearly when a recipe no longer represents the intended state. Do not silently normalize an intentionally old migration fixture, replace an unsupported checkpoint with a fresh game, or hide a broken recipe behind an empty-state fallback.

State injection belongs in controlled preparation or existing dependency seams, not business-logic branches that only run under test. Do not add a second auth model, data store, or rendering path just to make scenarios easy.

## 3. Human and Automated Lifecycles

Both consumers use the same preparation, with different lifetimes:

| Automated check | Interactive development |
|---|---|
| Prepare an isolated scenario. | Prepare the same recipe with explicit parameters. |
| Boot the normal app and perform the test's action. | Open the normal app at that entrypoint and use it normally. |
| Assert the visible result and relevant public effects. | Inspect the screen, exercise controls, edit code, and inspect the resulting state. |
| Finalize the native run result and relevant evidence, including failures, then dispose of owned resources. | Preserve the state until explicit reset or stop. |

Do not keep a developer's inspectable state alive by disabling cleanup across the test suite. Give the existing launcher a deliberate interactive lifecycle; keep test cleanup scoped and reliable.

Separate **reload** from **reset**. Reload must expose the state the application actually persisted. Reset deliberately reconstructs the starting scenario. If loading a route automatically seeds success again, the harness can hide failed writes and broken restore logic.

Separate logical reproducibility from physical identifiers. Repeating a recipe should recreate the same relevant state; parallel runs should still receive independent accounts, namespaces, directories, or ports. Reuse safe processes when supported, not mutable data between cases.

Make the handoff executable: report the real repository command or local entrypoint, scenario name or recipe, necessary parameters, how to reset, and how to stop or clean up. Verify the command before calling it working. Do not print credentials, session tokens, or sensitive payloads in commands, URLs, screenshots, or failure artifacts.

Protect the mutation surface. Restrict preparation/reset to an explicitly allowed local or isolated test target and the scope owned by that run. An environment label alone is not proof that a database is safe to clear. Never introduce an unrestricted public seed endpoint, an auth bypass accepted by production, or a reset that sweeps shared data.

## 4. Preserve the Event That Can Fail

A snapshot is sufficient only when the behavior depends on state alone. When the bug depends on a transition, prepare the last safe precondition and reproduce the event through the actual runtime.

Examples:

- **Reconnect:** prepare server state and client history, disconnect at the relevant point, then reconnect through the normal client path. Injecting an already-reconciled store tests neither transport nor reconciliation.
- **Duplicate action:** deliver the retry or duplicate through the real relevant boundary; observe the resulting business effect, not just successful responses.
- **Expiry:** control the clock used by the component that owns expiry, then cross the boundary through a real action. Faking the browser clock cannot by itself validate server or database expiration.
- **Race:** use the existing controllable barrier or event boundary to create overlap. Two sequential calls with a fixed random seed are not a concurrent schedule.
- **Restore/replay:** preserve the starting state or checkpoint and relevant subsequent inputs. Verify after restore and again after continuing; a screenshot of the final state cannot establish the restore transition.

Use completion signals, observed states, and bounded condition waits rather than arbitrary delays. Bound the interaction and capture the actual failure. On timeout, preserve enough local evidence to distinguish preparation failure, application startup failure, and a missing business result; do not treat all three as generic flake.

Do not add a universal scheduling engine. First use the controls the repository already has, or the smallest boundary-specific control that preserves production behavior. When an interleaving cannot be controlled faithfully, name the remaining uncertainty rather than inventing determinism.

## 5. Useful Scenario Selection

Choose one representative successful journey and the materially different states threatened by the change. Reuse existing recipes. A state earns its place because it reveals a different failure, enables recurring development, or materially improves diagnosis—not because a checklist can name it.

Empty, loading, populated, error, unauthorized, stale, reconnecting, and large-data states are recognition cues, not a mandatory matrix. Exercise loading or partial rendering by controlling the actual delivery/resource boundary, not by setting a private `isLoading` flag while bypassing the loading path being tested.

Avoid the Cartesian product of roles, devices, datasets, and failures. Compose ordinary parameters and select combinations with a causal reason. Add focused domain or generated tests only for a named material gap in E2E determinism, precision, or input coverage, following the manifest's failure-first rule. Cheap execution alone does not earn another layer. Introduce a named recipe when it captures a recurring meaningful state.

Use synthetic, bounded data. For large-state behavior, derive scale from a supported limit, representative workload, or observed symptom. Keep relationships and distributions that cause the failure; millions of irrelevant rows are not more realistic than a smaller causally adequate fixture.

When a failure is found, reduce the data and action history without removing its cause. Retain the minimal stable recipe when its regression or interactive value warrants it. Do not claim that a scenario collection proves every possible state.

## 6. Worked Decisions

### Returning player with stale client state

**Claim:** a returning player opens a saved match, sees authoritative progress, and can make the next valid move.

**Prepare:** the relevant player identity, an active server-side match, and the older local state that creates the restore risk. Keep unnecessary gameplay history out unless it determines the bug.

**Exercise:** launch through the actual app entrypoint, authenticate through the intended existing mechanism, open the match using the real UI, and perform the move. Assert visible progress plus the approved effect through the real boundary. Reopen or reconnect when continued persistence is part of the contract.

**Development:** open the same recipe without automatic teardown; reproduce, edit, and explicitly reset. Do not replace the live server state with a front-end object that already contains the expected progress.

**Retention:** tighten an existing journey if it already performs these actions but lacks stale-state setup. Add a separate protocol test only for a material failure the journey cannot expose with adequate input coverage or controlled overlap; define that failure and its test before changing the protocol.

### Empty account is different from account creation

An existing empty account can be prepared directly to test the first-content experience. To test signup, prepare the state before signup and run the real creation path. The same fixture that usefully avoids irrelevant signup work in one test would bypass the subject of the other.

### A transient failure without a fictional app

Prepare valid existing data. Use the canonical external boundary to fail the specific request, then restore it. Assert the exact visible failure, continued use of unaffected work where relevant, and recovery through the real action. Do not replace the whole app's transport layer with static success/failure screens.

## 7. Failure Diagnosis

When a prepared screen looks correct but the journey still fails, check whether setup supplied the asserted outcome, bypassed bootstrap, selected a different actor or tenant, or used a fake that removed the risk. Do not immediately add another assertion against the same fictional world.

When the automated scenario works but the human launch does not, check hidden runner initialization, implicit storage/auth setup, automatic teardown, and automatic reseeding. Move the missing preparation into the shared path; do not copy it into a second launcher.

When setup keeps becoming harder, reconsider the product state model. Within scope, remove redundant state, obsolete branches, or needless coordination before extending a test framework to accommodate them. Protect the surviving behavior and delete the old scaffolding together.

## 8. Evidence and Runnable Reproduction

Evidence and reproduction answer different questions. A report, trace, or rendered frame records what happened in one execution. A state recipe plus the normal app and relevant actions lets another person or agent repeat it. Preserve both through the existing runner and launcher; do not introduce another artifact service or scenario format.

### The Minimum Useful Record

Use native metadata, report attachments, and existing build or scenario identifiers to retain:

| Information | What it must establish |
|---|---|
| Code/build and runtime | Which code actually ran and the relevant target, configuration, and dependency versions. A commit ID alone is insufficient when uncommitted changes affected execution; use existing build/source identification or preserve the relevant non-secret diff. Do not require a new commit or build system. |
| Starting scenario | The recipe, domain parameters, and relevant client/server preconditions. Keep generated physical IDs separate from logical state so a rerun can allocate a fresh isolated scope. |
| Actions and controls | The test or action sequence, exact rerun command, and seeds, clock settings, interleavings, or history that materially affect the outcome. A trace helps diagnosis but is not executable state reconstruction. |
| Outcome and evidence | Native pass, failure, or incomplete status, the relevant asserted effects, and paths to inspectable evidence. Identify setup, startup, journey, or teardown failure rather than presenting them all as a generic timeout. |
| Human reproduction | The working normal-app launch, reset, and stop/cleanup path for that same scenario. A human must be able to reach and exercise the relevant state without guessing hidden runner setup. |

This table describes required information, not a new mandatory JSON schema. Reuse existing artifacts rather than copying the same fields into several reports. Save only relevant non-secret configuration; do not dump the environment, session tokens, private payloads, or production data.

### Capture Before the Failure Can Erase It

Register result and artifact finalization before preparation and app startup. Capture relevant observations while the run proceeds; a screenshot instruction after the last assertion never executes when an earlier assertion fails. Preserve diagnostics and available evidence before teardown destroys the context, then release resources reliably.

Keep the original test failure authoritative when artifact capture or cleanup also fails; record secondary failures rather than replacing the root error or returning success. On forced process termination, report an incomplete run and whatever evidence actually survived. Do not promise artifacts that a killed process could not finalize. Preserve meaningful failed-attempt evidence when the runner retries instead of presenting eventual success as a clean first pass.

A lightweight native result is sufficient for routine passing runs. Feature-verification runs also need evidence that makes the actual journey and result reviewable; failures need the relevant diagnostics. Choose the existing report, trace, rendered capture, or runtime equivalent that establishes the claim. Do not require simultaneous screenshots, full video, tracing, and custom logs when they duplicate one another, or retain rich passing-run artifacts indefinitely by default.

### Verify the Handoff, Not Just the Recording

Exercise the rerun command and the interactive launch when adding or changing those paths. Explicit reset must reconstruct the intended starting state; reload must reveal actual persisted effects. If replaying a transient failure also needs an action sequence, controlled clock, or interleaving, include that alongside the starting recipe.

A person opening the scenario should get the real app, not a trace viewer or pre-rendered success screen. Retain a minimized failing input or history when the failure required generated exploration. State limits honestly: a target device not exercised, a substituted provider, or an uncontrolled scheduler remains outside the verified claim even when a rich artifact exists.
