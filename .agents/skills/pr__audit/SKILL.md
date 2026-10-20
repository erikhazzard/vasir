---
name: pr__audit
description: Audits a pull request for defects, used before accepting a merge
---

Perform a deep adversarial review of this PR: <PR>

Find all defensible P0/P1/P2 issues and give an evidence-backed merge verdict. Audit only; report findings here. Preserve shared-workspace changes. Temporary local reproductions are allowed.

ADVERSARIAL POSTURE

Assume the implementation came from an unreliable code generator: convincing explanations, plausible abstractions, incomplete edge cases, and tests that may repeat the implementation's mistakes.

Treat names, comments, PR descriptions, and passing tests as claims to verify. Establish intended behavior from authoritative contracts and actual consumers. Plausible code and green tests can share the same wrong assumption.

You may in parallel run the $code__auditing skill as well

Do not manufacture findings. Severity must follow demonstrated impact and realistic reachability.

REVIEW METHOD

1. Fetch and pin the current PR head and base commits. Read applicable repository instructions. Inspect the complete diff and relevant surrounding code. Identify any files or behavior you cannot adequately review.

2. Establish the load-bearing invariants, ownership boundaries, and externally observable promises. Trace changed behavior through callers, consumers, state transitions, persistence, and failure/recovery paths. Check the integrated merge result where interaction with current base could change behavior.

3. Before relying on existing tests, construct concrete scenarios that could violate those invariants. Investigate applicable cases:
   - Empty, boundary, malformed, and unusually large inputs.
   - Duplicate, missing, delayed, and out-of-order events.
   - Concurrent operations and interrupted state transitions.
   - Partial failure, retries, cancellation, and disposal.
   - Reconnect, snapshot/restore, migration, and mixed-version deployment.
   - Authentication, authorization, trust boundaries, and data exposure.
   - Unbounded work, resource leaks, and realistic performance cliffs.

4. Look especially for locally reasonable changes that break another consumer; success reported before the promised effect occurs; lost or stale state; conflicting ownership; swallowed failures; bypassable validation; and incompatible rollout assumptions.

5. Audit test quality independently. Look for circular expectations, unrealistic mocks, weakened assertions, missing negative cases, and checks that pass while relevant work is skipped. Run appropriate existing checks and build minimal reproductions for suspected defects.

6. Compare suspected failures against the base revision. Distinguish problems introduced or worsened by this PR from consequential pre-existing defects and environment failures.

7. Use independent parallel reviewers for distinct risk areas when available. Challenge and deduplicate their findings. Have an independent reviewer attack the proposed merge verdict, its weakest evidence, and scenarios initially considered safe.

8. Attempt to disprove every suspected bug. Verify reachability, triggering conditions, causal mechanism, and impact. Keep confirmed defects, unresolved suspicions, and missing validation clearly distinguished.

FINDINGS FORMAT

For each confirmed P0/P1/P2:
- Severity and precise title.
- File and smallest relevant line range.
- Triggering conditions and concrete impact.
- Causal explanation.
- Reproduction or decisive code evidence.
- Smallest sound fix.

Prioritize correctness, security, data integrity, authority, concurrency, compatibility, and material performance defects. Exclude stylistic preferences and speculative refactors.

FINAL REPORT

Lead with findings, ordered by severity, then provide:
- MERGE / DO NOT MERGE / INSUFFICIENT EVIDENCE.
- Remaining blockers, separating code defects from validation gaps.
- Checks actually executed, their results, and material coverage limitations.
- Any separate deployment or release prerequisites.
- Exact reviewed head and base commits.

Recheck the PR head before concluding. Review any new delta or explicitly limit the verdict to the inspected revision. Never equate green CI with correctness or claim exhaustive certainty.
