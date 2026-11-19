# Calibration Examples

These are constructed decision examples, not observations about a repository. They isolate the fact that changes the recommendation. Apply the evidence rules in `SKILL.md`; no example overrides a supported contract.

## 1. A working compensation chain still warrants rework

**Given:** A single-process feature keeps independently writable authoritative values in two objects. Repository inspection establishes that only one value is needed by supported consumers. A reconciler repairs divergence, a retry loop handles reconciliation failure, and duplicate suppression handles overlapping retries. Current guards make the supported path reliable.

**Tempting move:** Improve the retry loop, retain both owners, and mark ownership consolidation as optional cleanup because there is no observed production failure.

**Preferred call:** `REWORK` with no invented P1. Converge mutation at the real owner; derive the other view only if a consumer needs it. Show which reconciler, retry, deduplication, state, and mechanism-only tests become unnecessary. Preserve the real outcome and any independent guard that remains justified.

**Reversal:** Offline writes, process isolation, or another supported contract actually requires independent mutation and later convergence. The duplicate representation alone no longer supports the diagnosis. Review the required consistency model rather than deleting reconciliation by analogy.

## 2. Fix the owning lifecycle, not every stale callback

**Given:** Replacing an operation leaves its previous callback subscribed. A downstream guard suppresses the obsolete callback, but more subscribers keep acquiring their own “already replaced” flags. Inspection confirms the lifecycle owner can remove that subscription without dropping required completion, cancellation, or error delivery.

**Tempting move:** Add another stale-callback guard to the new subscriber because it changes one file.

**Preferred call:** Repair teardown at the owning boundary, account for in-flight work, and remove the redundant subscriber flags. A larger diff can yield a smaller maintained system. Check the relevant replacement/cancellation sequence and terminal outcome with the existing faithful seam.

**Reversal:** Unsubscription cannot cancel an already queued or in-flight completion under the actual API semantics. Preserve the minimum stale-result protection that remains necessary; teardown alone is not proof of correctness.

## 3. Keep a justified cache; remove provably duplicate work

**Given A:** A derived spatial index has one authority, bounded lifecycle, and measured evidence that removing it violates the supported workload's budget.

**Call A:** Keep the index and its necessary updates. Fewer lines plus repeated full scans is not an improvement.

**Given B:** Two paths independently compute the same pure summary from the same immutable input during one operation. Consumers can share the result without changing isolation, ownership, or freshness.

**Call B:** Consolidate the duplicate computation when the saved work or reduced maintenance burden is material. The source establishes the eliminated computation; it does not establish a percentage improvement in total latency. Measure only when a quantitative choice depends on it.

**Given C:** A bounded, infrequently used list creates a small temporary array; no evidence shows a meaningful cost or a better maintained alternative.

**Call C:** No performance finding. Do not add pooling, mutation, caching, or a benchmark project to satisfy the word “S-tier.”

## 4. More lines can create a better developer interface

**Given:** A “generic” helper takes caller-specific flags. Adding one supported operation requires understanding an unrelated caller's policy and preserving several surprising flag combinations. Inspection shows the two policies have different reasons to change.

**Tempting move:** Add an options object, policy registry, and more documentation around the shared helper.

**Preferred call:** Split the independently owned policies, inline where that clarifies ownership, and share only the invariant that is genuinely common. Judge the reduced coordination and knowledge burden, not textual duplication. Do not create a promise to re-abstract merely because two independent policies look alike today.

**Reversal:** The code expresses the same invariant at one real trust boundary, and splitting it creates policy drift. Keep a deep shared owner with an interface that exposes the true domain operation rather than the caller's workaround flags.

## 5. No static callers is not permission to delete

**Given:** A handler has no direct source references. Its name might be loaded from a manifest, job configuration, persisted event, plugin registration, or supported external client.

**Tempting move:** Call it dead and delete its tests and compatibility code.

**Preferred call:** Check the applicable consumer classes and state the search boundary. A supported configured consumer is a keep-case. An unresolved external contract makes unconditional deletion unproven; report the specific discriminator rather than inventing either a consumer or a compatibility framework.

**Reversal:** Current configuration, persisted-format obligations, registrations, and supported consumers are accounted for, and no live requirement remains. Remove the obsolete capability and its dependent machinery together.

## 6. Safety-driven coexistence needs a retirement condition

**Given:** A real rolling deployment means some supported readers cannot yet consume the final representation. The governing contract permits a staged transition. The new path is implemented, but the old path, feature selection, and migration job remain.

**Tempting move:** Declare the simplification complete because new callers prefer the cleaner path—or demand a risky one-step switch because there is no deadline.

**Preferred call:** Sequence the safe transition around reader compatibility and state, not dates. Identify the final write owner, actual remaining consumers, condition for removing tolerance or the old path, and the temporary machinery removed afterward. Do not accept “migrate later” without an evidenced completion condition.

**Reversal:** The older representation is a permanent supported save, replay, protocol, or partner contract. Keep the necessary owning adapter. Permanent compatibility does not need a fictitious retirement date.

## 7. An ordinary retry may require machinery

**Given:** A normal retry reaches two processes that both perform a non-idempotent mutation of shared value. No inspected mechanism ensures one logical operation commits at most once.

**Tempting move:** Remove deduplication or reject an idempotency mechanism because it adds code and state.

**Preferred call:** A substantiated release blocker is possible, calibrated to actual impact. First inspect the existing transactional or ownership boundary for the simplest correct enforcement. Add only the mechanism the invariant requires when no simpler owner-level solution works. Record any new lifecycle and failure burden honestly; necessary code is not accretion merely because it is new.

**Reversal:** The alleged cross-process retry is unsupported or the operation is already protected by an evidenced transactional invariant. Do not count a mechanism twice or escalate an imagined topology.

## 8. Preserve honest failure, not false success

**Given:** A wrapper swallows a failed write and returns an empty result that the caller renders as success. Removing logging and fallback code would shorten the function further.

**Preferred call:** Preserve valid state and the user's ability to distinguish failed, pending, and completed work. Repair the owning failure contract; remove redundant wrapping only after the terminal result remains truthful. A handler returning normally is not evidence that the write happened.

**Reversal:** An optional independent feature may degrade without blocking the main outcome. Keep that containment, but expose its actual status rather than manufacturing global failure or global success.
