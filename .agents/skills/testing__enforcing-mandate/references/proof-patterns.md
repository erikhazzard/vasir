# Proof Patterns

Read only the patterns relevant to the material risk. E2E is the default behavioral-test layer for app features. Focused techniques below are exceptions for a named gap in E2E determinism, precision, or input coverage, not a menu of companion suites. They never replace proof of the real app journey. Apply the failure-first order before implementing an isolated slice.

## Existing Guard Versus a Plausible Wrong Result

A retry test sends the same purchase twice and observes two successful responses. It can pass while creating two purchases. Tighten it around the approved business effect through a public read. When relevant, include a distinct request to distinguish correct deduplication from an implementation that suppresses every request.

Likewise, an assertion that returned IDs are unique can pass for an always-empty result. Ground properties in the actual contract and include a distinguishing example or independent relation that excludes plausible degenerate behavior.

A test's expected value should not be recomputed by the production function under test. Prefer contract-derived examples, independently defined relationships, a trustworthy simpler model, or the observable business effect. Mutation is a targeted way to challenge an oracle, not a mandatory platform investment.

## Failure-First Isolated Slices

Resolve the contract and plausible consequential failures before writing the implementation. Write the corresponding tests for the current slice first, then implement it. Keep the failure model in the test cases or existing work context, not a mandatory standalone document. For existing code, this ordering applies to the change being made; a newly discovered regression is not forbidden because the old implementation already exists.

For example, if these are the approved reconnect contracts:

| Failure | Discriminating outcome | Where it belongs |
|---|---|---|
| A repeated event applies twice. | Its effect is applied once, while a distinct valid event still applies. | The real journey where practical; a focused sequence test only for missing event-order/input coverage. |
| An older snapshot rolls back newer progress. | Approved newer progress is preserved under the relevant ordering. | A controlled protocol test when the E2E scenario cannot reliably impose that ordering, with real relevant state semantics. |
| Reconnect appears successful but leaves the player stuck. | The player can take the next valid action through the actual app. | E2E; a reconciler returning a plausible object is not sufficient. |

These are conditional examples, not invented requirements for a repository's protocol. Establish the intended policy for duplicates and snapshot ordering from its actual contract. An initial missing symbol or unimplemented feature is not evidence that a behavioral failure was reproduced. Once executable, the test must distinguish the intended behavior from a plausible wrong result.

## Concurrency, Ordering, and Stateful Properties

Choose the control from the cause:

- Input variation → bounded examples or generators at the stable public boundary.
- State-machine history → generated or explicit action sequences with relevant preconditions.
- Timing → a controllable clock at the actual owner of the time-dependent behavior.
- Overlap → barriers, controlled completion, or a replayable interleaving that preserves the real shared resource.

A random seed controls generated choices, not an uncontrolled scheduler. Real transactional behavior, ordering, or atomicity needs the relevant real storage/protocol semantics or explicitly validated equivalence. A fake with stronger isolation than production can make the wrong implementation pass.

Bound cases, sequence length, data size, waits, and retries. Use the framework's existing shrinking and replay mechanisms when available. Preserve the minimized failing input/history and the information required to reproduce it; a seed without its relevant environment and recipe may be insufficient.

Keep exploratory generation distinct from stable regression execution. A discovery run can search broadly within its budget. A retained regression should replay the important failure reliably without requiring the same search to rediscover it.

## Failure Containment

Name the bad subject and unsafe effect. Prove independently useful behavior survives where the fault could plausibly threaten it: another record, another request, already verified state, another participant, or process health.

Do not preserve a whole-screen or whole-process outage merely because existing code currently produces it. Equally, do not assert arbitrary unaffected scopes with no causal connection to the risk. Guard the approved containment boundary and recovery action through observable behavior.

## Replay and Restore

For a replay or deterministic-kernel claim, preserve the applicable initial state, inputs, seed, and checkpoint. Exercise the actual restore boundary, check the state at that boundary, continue with later inputs, and compare the approved later checkpoint or outcome.

An identical final hash can miss a broken intermediate restore that later converges. A checkpoint decoded in isolation cannot prove the app actually resumes from it. Start with the real resume journey when the claim includes the user experience; add focused deterministic proof only for a material restore or history gap that journey does not expose.

Use existing compatibility identifiers and replay facilities. Do not invent another snapshot format or silently upgrade a fixture whose old shape is the behavior under test.

## Migration and Legacy Behavior

For a behavior-preserving refactor, start with a sufficient existing guard. Add characterization only for consequential behavior that is genuinely uncertain; do not freeze every incidental output of legacy code.

Test old and new readable shapes when both are actually supported during the change. Test the real transition when migration execution is the risk. Bind temporary compatibility fixtures and dual paths to the migration's actual exit condition and owner. Keep deliberately permanent public contracts distinct from temporary implementation machinery.

When a supported behavior disappears by approval, retire its tests and unused fixtures. Preserve meaningful replacement behavior rather than source-text assertions about the old implementation's absence.

## External Contracts and Doubles

A real local application can use a controlled substitute for an external provider while exercising its own request construction, response handling, persistence, and UI. This proves the local journey against the substituted contract, not live provider behavior.

Use the repository's canonical adapter and existing contract evidence. Add targeted validation when a changed assumption affects request shape, response shape, status/error semantics, retries, signatures, or other material protocol behavior. Do not require new documentation for every established fixture.

Use sandbox or recorded evidence only where available and appropriate. Keep recordings synthetic or properly sanitized, with their origin and relevant freshness requirements. No secrets, private payloads, or routine live-production calls.

Interaction assertions are warranted when the interaction is itself the obligation, such as a required webhook shape or exactly one provider request under an explicit contract. Otherwise prefer externally observable results.

## Performance and Rendered Behavior

Reuse the launchable scenario as the workload so a slow or visually broken state is reproducible outside the benchmark. Keep the data shape, route, actors, resource behavior, and relevant cache state consistent.

Distinguish cold start, warm interaction, and restore only when they change the claim. Measure an approved budget or a concrete observed symptom. Report the workload and environment; do not invent a timing threshold, infer device performance from a different target, or turn noisy wall-clock measurements into brittle routine assertions.

Deterministic resource-count bounds can complement measurement when they represent a real contract. They are not a reason to preserve incidental implementation call counts.

For visual failures, inspect the actual rendered state and interaction. A visible DOM node may still be clipped, covered, or disconnected from a failed renderer. Use the existing visual or runtime tooling at the relevant viewport/device. Do not snapshot every screen or treat visual similarity as proof that an action took effect.

## When No New Test Is the Right Decision

An internal simplification leaves the observable contract unchanged; an existing real-app journey, plus any already-justified focused check, catches the plausible regressions. Run those checks, delete obsolete helper-specific tests and fixtures, and retain the useful scenario. Add no test just to record that a helper vanished.

A one-off investigation yields a faithful local reproduction, but its transient mechanism no longer exists and its surviving contract is already protected. Keep the observed evidence in the existing work record when needed; do not permanently retain the disposable reproduction.

By contrast, a meaningful checkout, reconnect, or startup change with only mocked-unit evidence lacks journey proof. Do not stretch the no-new-test option to call that safe. Run the real path, repair or add a guard when its durable value warrants it, and state any unresolved boundary.
