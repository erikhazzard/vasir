# App-State Scenarios

Read when creating or changing state preparation, launch, reset, stateful reproduction, or run evidence. Add interactive launch machinery only when requested, needed for debugging, or part of the existing workflow; a focused test does not require it.

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

Keep authoritative and derived state distinct. Seed authoritative inputs and let normal code derive the rest, unless stale or inconsistent derived state is the precondition. Seeded data is valid input for a reader even when it contains the expected values; the reader must still run. Setup is invalid proof when it performs or bypasses the claimed action. Label intentional inconsistency and capture relevant identity, local state, time, and ordering rather than enlarging the dataset.

## 2. One Preparation Path

Find the existing fixture builders, dependency configuration, and reset facilities. When both tests and interactive development need the state, share preparation rather than maintaining separate loaders.

Preparation accepts relevant domain inputs, establishes an isolated scope, and returns the inputs and disposal information its consumer needs. Use existing functions, commands, and fixture homes. Name recurring states in domain terms; parameterize meaningful variations such as role, size, freshness, or checkpoint. Keep one-off inputs inline without inventing a scenario language, schema, or file layout.

Preparation should:

1. Allocate or identify an isolated non-production scope and known test identities.
2. Establish only the preconditions using current domain builders, supported APIs, or valid persistence fixtures.
3. Configure the normal app to use that scope and the intended dependency boundaries.
4. Wait for actual readiness, then provide the entrypoint and relevant non-secret identifiers.

Use the real storage engine or protocol where its semantics matter. A convenient in-memory map is not interchangeable with database transactions, indexes, TTLs, or serialization. A controlled substitute is acceptable outside the claimed boundary; disclose that boundary.

Preconditions must honor relevant schema constraints and relationships. Fail clearly when a recipe no longer represents the intended state. Do not silently normalize an intentionally old migration fixture, replace an unsupported checkpoint with a fresh game, or hide a broken recipe behind an empty-state fallback.

State injection belongs in controlled preparation or existing dependency seams, not business-logic branches that only run under test. Do not add a second auth model, data store, or rendering path just to make scenarios easy.

## 3. Human and Automated Lifecycles

When interactive reproduction is needed, both consumers share preparation with different lifetimes:

| Automated check | Interactive development |
|---|---|
| Prepare an isolated scenario. | Prepare the same recipe with explicit parameters. |
| Boot the normal app and perform the test's action. | Open the normal app at that entrypoint and use it normally. |
| Assert the visible result and relevant public effects. | Inspect the screen, exercise controls, edit code, and inspect the resulting state. |
| Finalize the native run result and relevant evidence, including failures, then dispose of owned resources. | Preserve the state until explicit reset or stop. |

Do not keep a developer's inspectable state alive by disabling cleanup across the test suite. Give the existing launcher a deliberate interactive lifecycle; keep test cleanup scoped and reliable.

Separate **reload** from **reset**. Reload must expose the state the application actually persisted. Reset deliberately reconstructs the starting scenario. If loading a route automatically seeds success again, the harness can hide failed writes and broken restore logic.

Separate logical reproducibility from physical identifiers. Repeating a recipe should recreate the same relevant state; parallel runs should still receive independent accounts, namespaces, directories, or ports. Reuse safe processes when supported, not mutable data between cases.

For an interactive handoff, report the real command or entrypoint, recipe, parameters, reset, and cleanup. Verify the command before calling it working. Keep credentials, tokens, and sensitive payloads out of commands, URLs, and artifacts.

Protect the mutation surface. Restrict preparation/reset to an explicitly allowed local or isolated test target and the scope owned by that run. An environment label alone is not proof that a database is safe to clear. Never introduce an unrestricted public seed endpoint, an auth bypass accepted by production, or a reset that sweeps shared data.

## 4. Preserve the Event That Can Fail

A snapshot is sufficient only when the behavior depends on state alone. When the bug depends on a transition, prepare the last safe precondition and reproduce the event through the actual runtime.

Examples:

- **Reconnect:** prepare server state and client history, disconnect at the relevant point, then reconnect through the normal client path. Injecting an already-reconciled store tests neither transport nor reconciliation.
- **Duplicate action:** deliver the retry or duplicate through the real relevant boundary; observe the resulting business effect, not just successful responses.
- **Expiry:** control the clock used by the component that owns expiry, then cross the boundary through a real action. Faking the browser clock cannot by itself validate server or database expiration.
- **Race:** use the existing controllable barrier or event boundary to create overlap. Two sequential calls with a fixed random seed are not a concurrent schedule.
- **Restore/replay:** preserve the starting state or checkpoint and relevant subsequent inputs. Verify after restore and again after continuing; a screenshot of the final state cannot establish the restore transition.

Use completion signals and bounded condition waits rather than arbitrary delays. On timeout, distinguish preparation, startup, and missing business results. Use existing controls or the smallest boundary-specific control that preserves production behavior; name uncontrolled interleavings instead of inventing determinism or a scheduling engine.

## 5. Useful Scenario Selection

Choose states that expose the claimed failure or enable recurring debugging. Reuse existing recipes. Changed journeys need representative real-path coverage where assembly or wiring can fail; rule or storage claims may use focused tests at their relevant boundary.

Empty, loading, populated, error, unauthorized, stale, reconnecting, and large-data states are recognition cues, not a mandatory matrix. Exercise loading or partial rendering by controlling the actual delivery/resource boundary, not by setting a private `isLoading` flag while bypassing the loading path being tested.

Avoid the Cartesian product of roles, devices, datasets, and failures. Select combinations with a causal reason. Use focused examples, properties, integration tests, or journeys according to the contract and failure mechanism; no automatic companion layer is needed. Name recipes when the state recurs.

Use synthetic, bounded data scaled to a supported limit, representative workload, or observed symptom. Keep the relationships and distributions that cause the failure, then minimize data/history without removing that cause. Retain the stable recipe when its regression or interactive value warrants it; a scenario collection does not prove every possible state.

## 6. Worked Decisions

### Returning player with stale client state

**Claim:** a returning player opens a saved match, sees authoritative progress, and can make the next valid move.

**Prepare:** the relevant player identity, an active server-side match, and the older local state that creates the restore risk. Keep unnecessary gameplay history out unless it determines the bug.

**Exercise:** launch through the actual app entrypoint, authenticate through the intended existing mechanism, open the match using the real UI, and perform the move. Assert visible progress plus the approved effect through the real boundary. Reopen or reconnect when continued persistence is part of the contract.

**Development, when needed:** open the same recipe without automatic teardown; reproduce, edit, and explicitly reset. Seed server-side progress as input, while letting the client perform the restore and next move.

**Retention:** tighten an existing journey if it lacks stale-state setup. Retain protocol tests for distinct ordering, deduplication, or reconciliation contracts when valuable, without requiring an E2E limitation or adding them automatically.

### Empty account is different from account creation

An existing empty account can be prepared directly to test the first-content experience. To test signup, prepare the state before signup and run the real creation path. The same fixture that usefully avoids irrelevant signup work in one test would bypass the subject of the other.

### A transient failure without a fictional app

Prepare valid existing data. Use the canonical external boundary to fail the specific request, then restore it. Assert the exact visible failure, continued use of unaffected work where relevant, and recovery through the real action. Do not replace the whole app's transport layer with static success/failure screens.

## 7. Failure Diagnosis

When a prepared screen looks correct but the journey fails, check whether setup bypassed the claimed action or bootstrap, selected a different actor or tenant, or used a fake that removed the risk. Seeded authoritative reader inputs are not themselves a bypass. Correct the boundary before adding more assertions.

When a required human launch fails despite a passing automated scenario, check hidden runner initialization, implicit storage/auth setup, automatic teardown, and reseeding. Move missing preparation into the shared path.

When setup keeps becoming harder, reconsider the product state model. Within scope, remove redundant state, obsolete branches, or needless coordination before extending a test framework to accommodate them. Protect the surviving behavior and delete the old scaffolding together.

## 8. Evidence and Runnable Reproduction

Evidence records an execution; a recipe and actions let another person or agent repeat it. Use existing runner and launcher facilities when needed. Routine focused tests can use their native result and test command without acquiring a scenario service or interactive launcher.

### The Minimum Useful Record

For a stateful reproduction or reviewable app run, retain relevant information through native metadata and attachments:

| Information | What it must establish |
|---|---|
| Code/build and runtime | Which code ran and the relevant target/configuration. Identify uncommitted changes when they affect reproduction; use existing source identification without requiring a new commit or build system. |
| Starting scenario | The recipe, domain parameters, and relevant client/server preconditions. Keep generated physical IDs separate from logical state so a rerun can allocate a fresh isolated scope. |
| Actions and controls | The test or action sequence, exact rerun command, and seeds, clock settings, interleavings, or history that materially affect the outcome. A trace helps diagnosis but is not executable state reconstruction. |
| Outcome and evidence | Native pass, failure, or incomplete status, the relevant asserted effects, and paths to inspectable evidence. Identify setup, startup, journey, or teardown failure rather than presenting them all as a generic timeout. |
| Human reproduction, when needed | The working normal-app launch, reset, and cleanup path, including preparation that would otherwise be hidden in the runner. |

Use only relevant fields and existing artifacts, without a new schema or duplicate reports. Save non-secret configuration; do not dump the environment, tokens, private payloads, or production data.

### Capture Before the Failure Can Erase It

For runs whose context can disappear, arrange capture and finalization before preparation/startup. Capture while the run proceeds: an instruction after the last assertion never executes when an earlier assertion fails. Preserve available diagnostics before teardown, then release resources reliably.

Keep the original test failure authoritative when artifact capture or cleanup also fails; record secondary failures rather than replacing the root error or returning success. On forced process termination, report an incomplete run and whatever evidence actually survived. Do not promise artifacts that a killed process could not finalize. Preserve meaningful failed-attempt evidence when the runner retries instead of presenting eventual success as a clean first pass.

A lightweight native result is sufficient for routine runs. When a journey or rendered claim needs reviewable evidence, choose the existing report, trace, capture, or runtime equivalent that establishes it. Failures need relevant diagnostics; simultaneous videos, traces, screenshots, and custom logs usually duplicate effort.

### Verify the Handoff, Not Just the Recording

Exercise rerun or interactive launch paths when adding or changing them. Explicit reset must reconstruct the starting state; reload must reveal persisted effects. Include the action sequence, clock, or interleaving when the failure depends on it.

A supplied interactive scenario should open the real app. Retain minimized failing inputs or histories from generated exploration. Name limits such as an unexercised device, substituted provider, or uncontrolled scheduler; rich artifacts do not expand the verified claim.
