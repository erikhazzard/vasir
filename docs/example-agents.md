# Example AGENTS.md

Use this page when you want a filled example to adapt, not just the source operating-contract template.

For the fastest starting point, run `vasir agents sync`. It infers the profile, renders the current template, fills purpose/routing from local repo context, injects `AGENTS__non-obvious.md`, and validates the result. Use `vasir agents sync --profile frontend|backend|ios|generic` when you need an explicit profile, or `vasir agents sync --scope frontend --profile frontend` for a nested app/package root. For the source templates, see [templates/agents/README.md](../templates/agents/README.md). The shared operating-contract structure lives in [templates/agents/AGENTS.md](../templates/agents/AGENTS.md), and stack-specific content lives in [templates/agents/snippets/](../templates/agents/snippets/).

Use the structure below as a rendered example. In normal repos, edit `AGENTS__non-obvious.md` for repo-specific constraints and rerun `vasir agents sync` to regenerate `AGENTS.md`.

```markdown
# AGENTS.md

## Phase 1: The Forcing Function

Before proposing any code modification, you MUST state:

1. **The Unlock**: What user journey or engineering system does this change serve?
2. **The Lane**: Which repo evidence was read, what work lane is active, and which neighboring lanes must be protected?
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

If touching frontend UI: -> .agents/skills/design__building-frontend/SKILL.md
If touching test strategy or quality gates: -> .agents/skills/testing__enforcing-mandate/SKILL.md
If touching bug triage or regression handling: -> .agents/skills/code__fixing-bugs/SKILL.md

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
- Stay in the active work lane. File lists are orientation, not permission; touch implementation-discovered files required to complete and prove the lane while protecting unrelated parallel work.
- Update docs and tests in the same turn when public behavior changes.

## Recency Anchor

1. **The Unlock** - Did you build the right thing?
2. **The Physics** - Did you obey the invariants?
3. **The Isolation** - Did you read the right skill?
4. **The Proof** - Did the checks pass?
```

Related pages:

- [templates/agents/README.md](../templates/agents/README.md)
- [templates/agents/AGENTS.md](../templates/agents/AGENTS.md)
- [templates/agents/snippets/backend-inserts.md](../templates/agents/snippets/backend-inserts.md)
- [templates/agents/snippets/frontend-inserts.md](../templates/agents/snippets/frontend-inserts.md)
- [templates/agents/snippets/ios-inserts.md](../templates/agents/snippets/ios-inserts.md)
- [docs/cli-reference.md](./cli-reference.md)
