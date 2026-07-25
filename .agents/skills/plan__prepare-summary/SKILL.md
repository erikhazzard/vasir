---
name: plan__prepare-summary
description: >-
  Reconstructs a substantial lane's vFinal journey, required intake, active vertical slice, and next action from its canonical work spec.
  Trigger: explicit status/summary requests, cold handoffs after context loss, or genuine uncertainty about what to build next; not a mandatory launch step.
tools: Read, Grep, Glob
---

# Prepare Summary — Optional Cold-Context Recovery

This is a read-only recovery tool, not a gate every implementation turn must pass. If the current agent already understands the approved product spine and active rung, skip this skill and build.

## Read product truth first

Load the work spec and the smallest current repo/runtime evidence needed to catch a stale map. Re-derive rather than copy its summary fields:

1. **Request:** the near-verbatim `Must` and `Must Not` outcomes.
2. **vFinal:** the complete intended journey, not a lesser `v0`, `v1`, MVP, or proxy.
3. **User Journey Unlock:** actor, real entrypoint, observable success, and obvious next action.
4. **Engineering System Unlock:** only the real capability or reliability truth.
5. **Active vertical slice:** its valuable outcome, real path, lasting shape, and how the next rung is additive.
6. **Current motion:** the next meaningful implementation action or exact blocker.
7. **Claim boundary:** what is actually built/proven and what remains.

Human Read text, tables, and stale implementation maps are hints, never authority over the current product body and repo truth.

## One semantic check

Ask:

> Could an agent implement this work spec perfectly while visibly failing what the user actually requested?

Return **Not ready to build** only when:

- a required outcome is missing, weakened, contradicted by a non-goal, or represented by a non-equivalent proxy;
- `vFinal` or the active slice is materially ambiguous;
- a genuine product fork, existing external-contract violation, externally owned authority boundary, safety/data-integrity boundary, irreversible action, missing environment/credential, or shared-worktree collision blocks motion;
- the next action would not advance the active vertical slice.

Stale file guesses, symbols, sequencing, estimates, internal design, technical schema details that preserve the same external promise, or equivalent rung decomposition do not block implementation. Note the correction and keep moving.

## Output

Return:

- the seven re-derived answers;
- **Ready to build: Yes | No — one reason**;
- when Yes, the exact next implementation action;
- when No, the single smallest product decision, spec correction, or external unblock required.

Route directly to `$plan__prepare-goal` when ready. Route to `$plan__maintain-work-spec` only when durable product judgment actually needs correction.
