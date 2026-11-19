# Special-case debugging

Use the relevant section when an ordinary request → outcome check would miss the failure mechanism. The main skill's evidence-backed patch policy applies to every class below; none requires recreating the original incident as a prerequisite to repair.

**Contents**

- [Intermittent failures and heisenbugs](#intermittent-failures-and-heisenbugs)
- [Concurrency, retries, and recovery](#concurrency-retries-and-recovery)
- [Replay and kernel divergence](#replay-and-kernel-divergence)
- [Performance regressions](#performance-regressions)
- [Containment and damaged state](#containment-and-damaged-state)

## Intermittent failures and heisenbugs

### Control the cause, not the symptom

Repeating the same payload does not necessarily repeat the initial state, configuration, build, expiry boundary, or interleaving. Identify which difference matters rather than collecting every available input.

Use existing replay, fixture, trace, or scenario identities to preserve the relevant setup. Do not introduce a raw capture bundle or generalized replay system merely to document one failure.

Make the suspected mechanism controllable. Advance time across an expiry when expiry matters; freezing it before expiry removes the case. Hold operations at a barrier to expose their competing updates; serializing them removes a required race. Preserve the relevant semantics while reducing unrelated variability.

When instrumentation changes the failure's frequency, absence of failure under instrumentation is not exonerating evidence. Prefer targeted observations around the suspect transition and identify what would distinguish the competing causes.

### A missing reproduction is not a missing cause

Apply the main skill's patch policy. A supported invalid transition can be corrected even when the production schedule, data, or third-party behavior cannot be recreated. Report the strongest check actually performed and its limits; do not manufacture a red/green history.

If the mechanism is still unknown, request or capture the smallest missing discriminating fact: for example, request identity across retries, state version at a write, or whether commit completed before a response was lost. Choose the fact from the live explanations; do not demand an inventory of payloads, environments, logs, and fixtures by default.

Put essential observation and next action in the existing issue, work context, or close-out. Use targeted instrumentation only where authorized, and remove temporary instrumentation when no longer useful. Do not turn diagnosis into a permanent tracing subsystem.

For a flaky test, distinguish a genuine product race from leaked test state, invalid setup, or a faulty oracle. Retrying until green or weakening an assertion can conceal either problem; repair the actual failing layer.

## Concurrency, retries, and recovery

### Observe a history when the guarantee is temporal

Select only the events needed for the claimed guarantee: invocation, response/acknowledgment, committed effect, retry, restart, or recovered progress. Final state alone cannot establish that an acknowledgment waited for commit.

For ordering, prefer a controlled causal relationship over wall-clock timestamps from different workers. Correlated logs can locate the fault; acceptance evidence must still cover the required response, effect, or persisted state.

To check acknowledgment-after-commit, hold the real operation at the relevant commit boundary, establish that success is not released prematurely, release it, and verify the committed outcome. Keep production commit semantics in the path; a stub that simply resolves in the desired order proves the stub.

Choose a bounded completion condition before interpreting the result: operations have settled, the relevant retry has been delivered, or recovery has met its contract deadline. A brief quiet interval does not establish absence of delayed duplicate work.

### Include the fault that threatens the guarantee

Use the smallest relevant interleaving or failure: concurrent requests, redelivery, worker restart, response loss, or crash around commit. These are alternatives selected by the cause, not a mandatory failure matrix.

For idempotency, distinguish repeated attempts at the **same logical operation** from separate valid operations. Exercise the threatened case—such as a duplicate while the original is pending or a retry after a committed response was lost—and the closest legitimate operation the patch might suppress.

A timeout can leave the outcome unknown. Do not assume it means no side effect occurred and add a blind retry. Use the protocol's existing request identity and outcome semantics; do not invent a second identity scheme around the fault.

Check safety and progress where both are promised. No duplicates is not enough if valid work remains stuck; no error is not enough to establish recovery. Remove the injected fault and observe the contract's recovery condition.

Use barriers or latches for the interleaving, bounded waits for completion, isolated state, and cleanup on failure. Inject faults in the supported local/test environment; production experiments remain subject to repository authorization.

A passing finite history supports the exercised guarantees under those conditions. Do not describe it as proof across every possible schedule or delivery history.

## Replay and kernel divergence

### Reuse the authoritative simulation path

Use the repository's simulation harness and canonical initialization. Preserve the recorded seed and tick-indexed intents, together with the relevant starting snapshot and build/configuration identity when the harness does not already bind them.

Reuse an existing replay reference instead of duplicating its captured data. The browser is authoritative only for the presentation/browser behavior under investigation; it is not a replacement for authoritative kernel replay.

Resolve the actual repository determinism policy before changing runtime behavior. Do not infer an exception from a missing policy or transplant another repository's allowlist.

### Detect drift, then localize the first divergent transition

Check the restore boundary and a later checkpoint or final state/hash. Final-state-only equality can miss divergence that later reconverges. A few matching checkpoints do not establish agreement at every intermediate tick.

For unexplained drift, compare the earliest relevant states or transitions using existing per-tick tracing or a bounded forward comparison. Narrow to the first mismatching transition and inspect its inputs, state, ordering, and nondeterministic sources.

Do not naively binary-search ordinary checkpoint equality. Runs may diverge and then match again, so equality at a midpoint does not exclude earlier drift. Use bisection only with an actual prefix-history predicate that preserves evidence of earlier mismatch, or use an ordered scan of the bounded suspect interval.

Reduce the input sequence only while preserving the starting state, restore point, and required ordering. A smaller replay that omits the causal transition is not the same failure.

### Use guardrails to locate, not certify

Where present, `[idv deterministic math] Redirected Math.*` and `DET_NONDETERMINISM_FORBIDDEN_API` identify useful diagnostic callsites. A forbidden callsite is a lead; silencing its log is not a repair.

Fix the actual source of authoritative divergence. Do not relax determinism, ignore differing authoritative fields, or normalize away a mismatch to obtain green. Presentation-only nondeterminism is allowed only where the governing repository explicitly permits it.

Verify through the affected restore/replay path after the repair. If the original recording is unavailable, retain the established cause and bounded post-fix claim rather than asserting that the incident replay passed.

## Performance regressions

### Connect the breached metric to the responsible cost

Name the actual user/system budget or known-good behavior, affected workload, and scale. Do not invent a new threshold to make the result pass. Distinguish frame time, latency, throughput, memory, or another promised property from a convenient proxy.

Use a profile, trace, or targeted measurement under the affected workload to identify the relevant cost. Query count can remain constant while one query becomes much slower; fewer allocations do not establish restored frame time when another component is limiting it.

Compare equivalent conditions that matter to the hypothesis: data state/size, warm versus cold execution, concurrency, configuration, and environment. Control relevant differences, not every possible variable. If a credible baseline cannot be recreated, state what the available measurements actually compare.

Repair the responsible work: remove redundant computation, duplicate state, unnecessary calls, or the mistaken algorithm before compensating with a new cache, retry, or second path. Retain necessary work and correctness; doing less by dropping valid output is not an optimization.

### Separate measuring the repair from retaining a guard

After the change, remeasure the affected outcome under comparable conditions. Improved structural cost alone does not establish that the user-visible performance breach is resolved.

Prefer a durable structural guard when it protects the demonstrated mechanism: a call bound for an established N+1 cause, an allocation bound for allocation-driven pressure, or a payload bound for a transfer cost. Do not choose it merely because it is easier to assert.

For a true wall-clock contract, use controlled workload, appropriate warmup/repetition, and the repository's meaningful threshold or comparison method. A single favorable sample is weak evidence; uncontrolled variability must limit the claim.

A focused measurement is not automatically a new eval plan. When lasting wall-clock protection is warranted, use the existing performance/evaluation lane and test policy rather than inserting a fragile timing assertion into default CI. Keep durable-retention judgment separate from whether the repair was measured.

## Containment and damaged state

### Stop ongoing harm only through authorized controls

For active data loss, duplicate effects, or severe service disruption, use the repository's established containment/runbook path before risky experiments. A rollback, flag, or temporary restriction may reduce harm; label it mitigation, not the causal repair.

Check the real compatibility and authority constraints for that action. Do not assume a rollback is safe after schema or data changes, disable a valid workflow silently, or broaden permissions because the issue is urgent.

If the action is outside the task's authority, identify the needed action and responsible owner or role when known, and continue independent safe diagnosis. Do not block unrelated investigation or start an incident-management workflow for an ordinary bug.

### Code repair and state recovery are distinct

Determine whether already-affected state still prevents the promised outcome. Fixing future writes does not restore missing data, reverse duplicate effects, or complete stranded work.

Use an existing approved recovery path when in scope. Otherwise surface the affected state, uncertainty, and required handoff without inventing the extent of damage. Do not silently add an opportunistic data cleanup to the runtime repair.

Any recovery operation must follow the repository's approval and verification requirements. Verify recovery separately when performed; when it is not, describe the code repair and remaining state problem separately. No new recovery framework or postmortem is required merely to make this distinction.
