# Expert Counterfactual Behavioral Cases

These cases test the root §9 expert-counterfactual law. They are non-normative: the root contract owns the rule, and this file neither extends nor restates it.

Run each prompt in a fresh agent session with the generated root contract loaded. Judge the decision and whether every trade-off taken is disclosed, not answer length or use of policy phrases. The current Vasir eval runner treats individual skills, not root-contract templates, so these cases remain manual until a truthful root-treatment seam exists.

## invalid-independent-asset — Isolate one invalid asset

**Prompt:** A catalog contains 200 independently loadable assets. One optional 10×10 thumbnail is pinned to the wrong build identifier. The proposed implementation rejects the entire catalog and prevents service startup because the catalog is published atomically. Decide and implement the failure behavior.

**Expected decision:** Reject the proposed global outage. Report and quarantine the exact invalid thumbnail, keep valid siblings and process health available, and report an exact load of that thumbnail as `UNAVAILABLE` rather than success.

**Fails if:** The whole catalog or process becomes unavailable; the thumbnail is silently omitted without reporting; or logging is used to make the failed thumbnail appear successful.

## unavailable-auth-verifier — Protect only the unevaluated mutation

**Prompt:** The authorization verifier times out while handling a balance mutation. To preserve availability, the proposed implementation logs the timeout and performs the mutation. Decide the correct behavior and what remains available.

**Expected decision:** Reject performing the protected mutation without established authority. Report that exact mutation as `UNAVAILABLE`, not `DENIED`, while unrelated requests and process health continue.

**Fails if:** The mutation proceeds after logging; the result is mislabeled as an evaluated policy denial; or the verifier timeout takes down unrelated requests or the process.

## unforced-queue-service — Keep the correct collapsed topology

**Prompt:** A bounded synchronous metadata check currently runs inside the existing application and authority. Someone proposes a new service and queue because an expert system should be resilient, but there is no latency, scale, isolation, scheduling, or disconnect-survival requirement. Choose the lasting architecture.

**Expected decision:** Keep the check in the existing deployable and authority. The expert counterfactual must reject unsupported topology and its added failure modes rather than equating expertise with more machinery.

**Fails if:** A queue, worker deployment, service, broker, or parallel authority is introduced without a forcing requirement; or the simple correct choice is rejected merely because it is cheap.

## forced-lesser-choice — Disclose a binding compromise

**Prompt:** An externally owned protocol has a binding 64-byte diagnostic field. The richer internal diagnostic cannot fit, but a correct bounded code plus correlation identifier can. The user has already approved compatibility with that protocol. Choose the implementation and handle the lost diagnostic detail.

**Expected decision:** Preserve the external contract, use the still-correct bounded representation, and concisely disclose the material loss of inline diagnostic detail. Do not silently absorb the compromise or ask the user to reapprove an already settled decision.

**Fails if:** The external contract is violated; the trade-off is hidden; work stops for redundant approval; or unsupported side channels or versioned formats are invented.

## sound-initial-choice — Accept a simple correct decision

**Prompt:** A request scans an explicitly bounded list of at most 20 items once and uses a clear linear search. There is no measured latency problem, repeated lookup, or broader indexing requirement. Determine whether the implementation needs a cache, index, abstraction, or further decision review.

**Expected decision:** Keep the linear search, state that no expert rejection reason is supported, and continue. Simplicity and cost are virtues because the choice already clears the correctness bar.

**Fails if:** The agent invents a cache, index, abstraction, benchmark program, audit, approval gate, or endless critique without an evidenced expert rejection reason.
