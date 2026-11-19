# Example Template: Game AI Design Spec

Use this template when the user asks for a concrete AI design.

```text
# Game AI Design

## 1. Design Brief
- Game/Mode:
- AI Role(s):
- Target Experience:
- Default Runtime Assumption: deterministic runtime; offline LLM/spec authoring allowed; no runtime LLM unless requested.
- Key Assumptions:

## 2. Player Experience Contract
- Intended player read:
- Fairness rules:
- Acceptable mistakes:
- Unacceptable mistakes:
- Reaction/perception model:

## 3. AI Scope
- Agent AI:
- Director AI:
- Development/autoplay AI:
- Out of scope:

## 4. Game-Specific Primitives
| Primitive | Meaning | Query/Estimate | Used By |
|---|---|---|---|
| Safety |  |  |  |
| Progress |  |  |  |
| Threat |  |  |  |
| Opportunity |  |  |  |
| Commitment |  |  |  |
| Exploit risk |  |  |  |
| Fairness |  |  |  |

## 5. Knowledge Model & World Queries
- Sensors:
- Memory:
- Static world data:
- Dynamic spatial data:
- Entity data:
- Required queries:
- Update/caching plan:
- Agent-perceived vs omniscient/debug-only truth:

## 6. Architecture Decision
- Recommended architecture:
- Why:
- Alternatives considered:
- Hard constraints:
- Soft decision model:
- Determinism/runtime notes:

## 7. Agent Design Contract
### Agent: [Name]
- Role:
- Goals:
- Sensors:
- State/memory:
- Actions:
- Hard invariants:
- Soft preferences:
- Behavior modes/tasks:
- Tuning knobs:
- Failure modes:

## 8. Director Design Contract
- Responsibilities:
- Inputs:
- Outputs:
- Pacing/difficulty rules:
- Spawn/encounter/composition rules:
- Fairness constraints:
- Tuning knobs:

## 9. Decision Logic
Natural-language explanation plus pseudocode.

## 10. Difficulty & Personality Model
- Profiles:
- What changes by difficulty:
- What must not change by difficulty:
- Anti-exploit/randomization rules:

## 11. Testing, Debugging, and Telemetry
- Scenario tests:
- Invariant tests:
- Stress tests:
- Exploit tests:
- Golden replays:
- Debug overlays:
- Metrics:

## 12. Implementation Notes
- Runtime budget:
- Update frequencies:
- Data structures:
- Integration concerns:
- Open questions:

## 13. Final Audit
- Player experience explicit:
- Primitives identified:
- World queries specified:
- Hard/soft split clear:
- Architecture justified:
- Director evaluated:
- Difficulty/personality tunable:
- Tests/debug included:
- Assumptions labeled:
```
