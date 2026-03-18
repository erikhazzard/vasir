# AGENTS.md

See [docs/example-agents.md](../docs/example-agents.md) for a filled example before you customize this template.

## Phase 1: The Forcing Function

Before proposing any code modification, you MUST state:

1. **The Unlock**: What user journey or engineering system does this change serve?
2. **The Scope**: Which exact files and systems will be touched?
3. **The Constraint Check**: Why does this change not violate any Global Invariant?

If you cannot articulate all three, stop and ask for clarification.

---

## Phase 2: Global Invariants

These are the immutable laws of this codebase. Violations trigger immediate rollback.

### Architecture
<!-- FILL IN: e.g. "We use ECS. No OOP inheritance for state-bearing entities." -->

### Determinism
<!-- FILL IN: e.g. "No Math.random(), Date.now(), or unseeded RNG. All randomness from seeded source." -->

### Dependencies
<!-- FILL IN: e.g. "No new runtime dependencies without human approval. We use bun, not npm." -->

### State Management
<!-- FILL IN: e.g. "All client data is untrusted. Server is authoritative." -->

### Code Standards
<!-- FILL IN: e.g. "No any in TypeScript. No abstractions until 3+ usages." -->

If a skill file provides instructions that conflict with a Global Invariant, the Global Invariant wins.

---

## Phase 3: Architecture Router

Do NOT guess how internal systems work. You MUST read the relevant skill file before writing code in these domains:

<!-- FILL IN: map domains to local skill file paths -->
<!-- Examples: -->
<!-- If touching game kernel: -> .agents/skills/deterministic-kernel/SKILL.md -->
<!-- If touching UI/rendering: -> .agents/skills/ui-layout/SKILL.md -->
<!-- If touching networking: -> .agents/skills/netcode/SKILL.md -->

---

## Phase 4: Verification Directives

You are not done when you write the code. You are done when the code is verified.

### Build
<!-- FILL IN: e.g. "bun run build" -->

### Typecheck
<!-- FILL IN: e.g. "bun run typecheck" -->

### Test
<!-- FILL IN: e.g. "bun test -- --filter=<modified-module>" -->

### Failure Protocol
If any command fails, do NOT suppress the error. Read it, diagnose root cause, and fix. If you fail twice on the same error, ask for guidance.

### Operational Constraints
- Maximum 3 files modified per turn. If a change requires more, outline phases and ask.
- No destructive git commands (commit, reset, push).
- Do not read files outside the scope of the current task.

---

## Recency Anchor

If you remember nothing else:

1. **The Unlock** - Did you build the right thing?
2. **The Physics** - Did you obey the Global Invariants?
3. **The Isolation** - Did you read the relevant skill file, or did you guess?
4. **The Proof** - Did the build and tests pass?
