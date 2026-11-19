# Proof Patterns

Read the patterns relevant to the claim and failure mechanism. Choose unit, integration, or E2E proof at the boundary that can expose the failure: rules can use focused tests; wiring and user journeys need the actual assembled path. Focused tests need no exception based on what E2E cannot do, and no layer automatically requires companion suites.

## Existing Guard Versus a Plausible Wrong Result

A test's expected value should not be recomputed by the production function under test. Prefer contract-derived examples, independently defined relationships, a trustworthy simpler model, or the observable business effect. Mutation is a targeted way to challenge an oracle, not a mandatory platform investment.

## Failure-First Isolated Slices

Resolve the contract and plausible consequential failures, write the corresponding tests, then implement the behavior slice. Keep that failure model in the tests or existing work context. A discovered regression can earn a focused guard even when the implementation already exists; its oracle must establish intended behavior independently.

For example, if these are the approved reconnect contracts:

| Failure | Discriminating outcome | Where it belongs |
|---|---|---|
| A repeated event applies twice. | Its effect is applied once, while a distinct valid event still applies. | A focused sequence or integration test through the boundary that owns deduplication. |
| An older snapshot rolls back newer progress. | Approved newer progress is preserved under the relevant ordering. | A controlled protocol test with the relevant state semantics. |
| Reconnect appears successful but leaves the player stuck. | The player can take the next valid action through the actual app. | E2E; a reconciler returning a plausible object is not sufficient. |

Establish duplicate and ordering policy from the actual contract; these examples do not invent requirements. A missing symbol or unimplemented feature is not a reproduced behavioral failure. Once executable, the test must reject a plausible wrong result.

## Concurrency, Ordering, and Stateful Properties

Choose the control from the cause:

- Input variation → bounded examples or generators at the stable public boundary.
- State-machine history → generated or explicit action sequences with relevant preconditions.
- Timing → a controllable clock at the actual owner of the time-dependent behavior.
- Overlap → barriers, controlled completion, or a replayable interleaving that preserves the real shared resource.

A random seed controls generated choices, not an uncontrolled scheduler. Real transactional behavior, ordering, or atomicity needs the relevant real storage/protocol semantics or explicitly validated equivalence. A fake with stronger isolation than production can make the wrong implementation pass.

Bound cases, sequence length, data size, waits, and retries. Use existing shrinking/replay mechanisms and preserve the minimized failing input/history with its relevant environment. Keep exploration separate from stable regressions: retained cases should replay the failure without requiring a search to rediscover it.

## Failure Containment

Name the bad subject and unsafe effect. Prove independently useful behavior survives where the fault could plausibly threaten it: another record, another request, already verified state, another participant, or process health.

Do not preserve a whole-screen or whole-process outage merely because existing code currently produces it. Equally, do not assert arbitrary unaffected scopes with no causal connection to the risk. Guard the approved containment boundary and recovery action through observable behavior.

## Replay and Restore

For a replay or deterministic-kernel claim, preserve the applicable initial state, inputs, seed, and checkpoint. Exercise the actual restore boundary, check the state at that boundary, continue with later inputs, and compare the approved later checkpoint or outcome.

An identical final hash can miss a broken intermediate restore that later converges. A focused checkpoint test can prove decoding or deterministic continuation; a claim that the app resumes also requires its actual resume path. Choose each guard for its own contract, without automatically retaining both.

Use existing compatibility identifiers and replay facilities. Do not invent another snapshot format or silently upgrade a fixture whose old shape is the behavior under test.

## Migration and Legacy Behavior

For a behavior-preserving refactor, use sufficient existing guards. Add characterization for consequential uncertain behavior, without freezing incidental legacy outputs.

Test old and new readable shapes when both are supported, and the real transition when migration execution is the risk. Bind temporary fixtures and dual paths to the actual exit condition and owner. When behavior is retired by approval, remove its tests and unused fixtures while protecting any replacement contract. Permanent public contracts remain distinct from temporary machinery.

## External Contracts and Doubles

A real local application can use a controlled substitute for an external provider while exercising its own request construction, response handling, persistence, and UI. This proves the local journey against the substituted contract, not live provider behavior.

Use the canonical adapter and existing contract evidence. Validate changed assumptions about request/response shape, errors, retries, signatures, or other material protocol behavior. Use available sandbox or sanitized recorded evidence with its origin and relevant freshness; do not require paperwork for every fixture or routine live-production calls.

Interaction assertions are warranted when the interaction is itself the obligation, such as a required webhook shape or exactly one provider request under an explicit contract. Otherwise prefer externally observable results.

## Performance and Rendered Behavior

Reuse the existing workload or scenario. When interactive reproduction is needed, make its relevant data shape, route, actors, resources, and cache state available through the normal app.

Distinguish cold start, warm interaction, and restore when they change the claim. Measure an approved budget or observed symptom and report workload/environment. Do not invent thresholds, infer device performance from a different target, or turn noisy timings into brittle assertions. Contractual resource-count bounds can complement measurement; incidental call counts do not earn retention.

For visual failures, inspect the actual rendered state and interaction. A visible DOM node may still be clipped, covered, or disconnected from a failed renderer. Use the existing visual or runtime tooling at the relevant viewport/device. Do not snapshot every screen or treat visual similarity as proof that an action took effect.

## Pruning and When No New Test Is Needed

Before deleting or merging tests, inventory their distinct assertions and state partitions. Broad journey success does not subsume exact metadata, identities, accounting conservation, or error fields. Transplant useful checks into a surviving test when its setup still reaches those cases; delete checks tied only to an obsolete mechanism.

When an internal simplification leaves the contract unchanged and existing guards catch the plausible regressions, run those guards and remove obsolete tests and fixtures. Add no test merely to record that a helper vanished. Keep a one-off reproduction only when its surviving regression or debugging value warrants it.

For a changed checkout, reconnect, or startup journey, mocked-unit evidence cannot establish assembly and wiring. Exercise the real path, retain a guard when useful, and state any unresolved boundary. Focused proof remains sufficient for a claim confined to a rule or isolated contract.
