# QA brief contract

The Feature Owner writes one `brief.md` before QA begins. It fixes the player promise, scope, existing proof, spend, and artifact location without enumerating cases for the Test Architect.

## Shape

```yaml
feature: heat-meter-feedback
spec: docs/design/combat.md#heat
goals: Players can read heat gain and cooldown during combat without opening a menu.
scope:
  in:
    - Heat rises after a player-fired shot.
    - Overheat blocks firing and visibly recovers.
  out:
    - Weapon damage math, already covered by unit tests.
unitCoverage:
  - tests/heat-model.test.js: 14 assertions covering gain, clamp, and cooldown math
arrangePrimitivesNeeded:
  - setHeat
  - spawnTarget
severity: blocking-for-merge
artifactDir: qa-runs/2026-08-11_heat-meter-feedback/
```

## Fields

| Field | Contract |
|---|---|
| `feature` | Stable short slug for the feature under QA. |
| `spec` | Repository-local source path plus the section that defines the promise. |
| `goals` | One paragraph in the Owner's words describing the player-facing value being shipped. |
| `scope.in` | Explicit player promises this pass must cover. At least one is required. |
| `scope.out` | Deferred or already-proven behavior this pass must not silently absorb. An empty list is valid. |
| `unitCoverage` | Existing test paths plus what they already prove, so the plan does not buy duplicate coverage. An empty list is valid. |
| `arrangePrimitivesNeeded` | Owner hints about likely setup primitives. The Test Architect's per-case declaration is authoritative. An empty list is valid. |
| `severity` | Exactly `quick-spotcheck`, `nice-to-have`, or `blocking-for-merge`; it sets the plan budget described in `role-owner.md`. |
| `artifactDir` | Repository-relative `qa-runs/<date>_<feature>/` directory for the entire pass. |

## Acceptance

- Every field is present. Empty lists are explicit; `TBD`, `see spec`, or implicit scope are not.
- Every promise appears in exactly one of `scope.in` or `scope.out`.
- `unitCoverage` says what the cited test proves, not merely that a test file exists.
- The brief does not contain test cases, journeys, verdicts, or guessed adapter guarantees.
