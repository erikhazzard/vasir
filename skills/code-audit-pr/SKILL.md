---
name: code-audit-pr
description: "Audit a pull request for defensible defects and an evidence-backed merge verdict. Use when reviewing a PR before merge; reports findings without repairing or merging the change."
license: MIT
metadata:
  gc-owner: "erik"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-capability: "engineering"
  gc-status: "draft"
  gc-tags: "pull requests, code review, correctness, regressions"
  gc-source: "https://github.com/erikhazzard/vasir/tree/b5ba2208bba5f0dc261768a3495bec7a445863e4/.agents/skills/pr__audit"
  gc-source-revision: "b5ba2208bba5f0dc261768a3495bec7a445863e4"
  gc-source-sha256: "a87913647f93da72818a835cf7f5ce949612a1cb0928b46d331ab3da4cba8830"
  gc-adaptations: "Portable name and metadata; replaced PR placeholder; optional code-audit handoff no longer assumes Vasir skills; clarified local revision review, workspace preservation, unavailable delegation, remote freshness, and report-only authority."
---
# Pull Request Audit

Perform a deep adversarial review of the requested pull request.

Find all defensible P0/P1/P2 issues and give an evidence-backed merge verdict. Audit only; report findings in the conversation unless the user requests another destination. Preserve shared-workspace changes. Temporary local reproductions are allowed. Follow the destination repository's instructions and the user's existing authorization; a review request does not itself authorize repairs, publishing a review, or merging.

## Adversarial posture

Assume the implementation came from an unreliable code generator: convincing explanations, plausible abstractions, incomplete edge cases, and tests that may repeat the implementation's mistakes.

Treat names, comments, PR descriptions, and passing tests as claims to verify. Establish intended behavior from authoritative contracts and actual consumers. Plausible code and green tests can share the same wrong assumption.

You may run `$code-audit-codebase` in parallel for distinct design or simplification risks. If it is not installed, perform that analysis directly; this review has no required companion skill.

Do not manufacture findings. Severity must follow demonstrated impact and realistic reachability.

## Review method

1. Resolve and pin the PR head and base commits, fetching when needed and available. Supplied local revisions can be reviewed without remote access; disclose any inability to verify current remote state. Read applicable repository instructions. Inspect the complete diff and relevant surrounding code. Identify any files or behavior you cannot adequately review. Use an isolated worktree or temporary directory when reproductions or merge checks would disturb shared-workspace changes; do not reset or switch the user's active checkout.

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

7. Use independent parallel reviewers for distinct risk areas when available. Challenge and deduplicate their findings. Have an independent reviewer attack the proposed merge verdict, its weakest evidence, and scenarios initially considered safe. If delegation is unavailable, perform that challenge yourself without claiming independent review.

8. Attempt to disprove every suspected bug. Verify reachability, triggering conditions, causal mechanism, and impact. Keep confirmed defects, unresolved suspicions, and missing validation clearly distinguished.

## Findings format

For each confirmed P0/P1/P2:
- Severity and precise title.
- File and smallest relevant line range.
- Triggering conditions and concrete impact.
- Causal explanation.
- Reproduction or decisive code evidence.
- Smallest sound fix.

Prioritize correctness, security, data integrity, authority, concurrency, compatibility, and material performance defects. Exclude stylistic preferences and speculative refactors.

## Final report

Lead with findings, ordered by severity, then provide:
- MERGE / DO NOT MERGE / INSUFFICIENT EVIDENCE.
- Remaining blockers, separating code defects from validation gaps.
- Checks actually executed, their results, and material coverage limitations.
- Any separate deployment or release prerequisites.
- Exact reviewed head and base commits.

Recheck the PR head before concluding when remote access is available. Review any new delta or explicitly limit the verdict to the inspected revision. If freshness cannot be verified, say so and bind the verdict to the inspected commits. Never equate green CI with correctness or claim exhaustive certainty.
