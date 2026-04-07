# Example AGENTS.md

Use this page when you want a filled example to adapt, not just the blank template.

For the fastest starting point, run `vasir add <skill>` and let Vasir seed `AGENTS.md`, or force a specific starter with `vasir add <skill> --agents-profile backend|frontend|ios`. If you only want the manifest starter, run `vasir agents init backend`, `vasir agents init frontend`, or `vasir agents init ios`, then follow with `vasir agents draft-purpose --write --model openai`, `vasir agents draft-routing --write`, and `vasir agents validate`. For the source templates, see [templates/agents/README.md](../templates/agents/README.md). For the composable blank skeleton, see [templates/agents/AGENTS.md](../templates/agents/AGENTS.md).

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
- Do not edit outside the scoped lane.
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
- [templates/agents/profiles/backend.md](../templates/agents/profiles/backend.md)
- [templates/agents/profiles/frontend.md](../templates/agents/profiles/frontend.md)
- [templates/agents/profiles/ios.md](../templates/agents/profiles/ios.md)
- [docs/cli-reference.md](./cli-reference.md)
