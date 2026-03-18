# Example AGENTS.md

Use this page when you want a filled example to adapt, not just the blank template.

Copy the structure below into your repo root `AGENTS.md`, then replace the routed skills and verification commands with the ones that match your project.

```markdown
# AGENTS.md

## Phase 1: The Forcing Function

Before proposing any code modification, you MUST state:

1. **The Unlock**: What user journey or engineering system does this change serve?
2. **The Scope**: Which exact files and systems will be touched?
3. **The Constraint Check**: Why does this change not violate any Global Invariant?

## Phase 2: Global Invariants

### Architecture
All public behavior goes through one canonical boundary. Do not introduce alternate entrypoints for the same capability.

### Determinism
Never use wall-clock time or unseeded randomness inside deterministic lanes.

### Dependencies
No new runtime dependencies without human approval.

### State Management
User-owned repo files under `.agents/skills` are the canonical local source of truth. `.claude` and `.codex` are compatibility aliases only.

### Code Standards
Fail closed when repo truth is unclear. Do not document guesses as facts.

## Phase 3: Architecture Router

If touching React UI: -> .agents/skills/react/SKILL.md
If touching deterministic simulation: -> .agents/skills/deterministic-kernel/SKILL.md
If touching networking: -> .agents/skills/netcode/SKILL.md

## Phase 4: Verification Directives

### Build
npm run build:registry

### Typecheck
No separate typecheck task in this repo.

### Test
npm test

### Failure Protocol
If a command fails, read it, diagnose the root cause, and fix the real failure before continuing.

### Operational Constraints
- No destructive git commands.
- Do not edit outside the scoped lane.
- Update docs and tests in the same turn when public behavior changes.

## Recency Anchor

1. **The Unlock** - Did you build the right thing?
2. **The Physics** - Did you obey the invariants?
3. **The Isolation** - Did you read the right skill?
4. **The Proof** - Did the checks pass?
```

Related pages:

- [templates/AGENTS.md](../templates/AGENTS.md)
- [docs/cli-reference.md](./cli-reference.md)
