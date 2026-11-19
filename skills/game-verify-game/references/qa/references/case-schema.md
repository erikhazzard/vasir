# Test-case plan contract

The Test Architect writes one human-readable `test-cases.json`. No JSON Schema or version field is required because no machine consumer is evidenced; the field names below are the shared contract between the Owner, Lead, Engineer, and Reviewer.

## Shape

```json
{
  "cases": [
    {
      "id": "heat-001",
      "domain": "combat-hud",
      "playerFlow": [
        "Enter a playable encounter with a cool weapon.",
        "Fire once through authentic player input.",
        "Observe the heat meter before and after the shot."
      ],
      "expectedOutcomes": [
        "The shot follows the normal input chain.",
        "The meter visibly increases and agrees with the captured heat state."
      ],
      "inputMode": "authentic",
      "reviewMode": "evidence",
      "evidenceRequirements": [
        "before-shot state and screenshot",
        "after-shot state and screenshot"
      ],
      "playerReviewQuestions": [
        "In after-shot.png, is the heat fill visibly higher than in before-shot.png?"
      ],
      "arrangePrimitivesNeeded": ["setHeat", "spawnTarget"],
      "probesNeeded": ["snapshot"]
    }
  ],
  "questions": []
}
```

## Case fields

| Field | Contract |
|---|---|
| `id` | Unique, stable case identifier used by journeys, reviews, and tickets. |
| `domain` | Execution grouping used to parallelize compatible cases. |
| `playerFlow` | Ordered player-reachable journey, including the action under test. |
| `expectedOutcomes` | Observable player or system outcomes, not private call expectations. |
| `inputMode` | Exactly `synthetic`, `authentic`, or `both`. Any player-action case uses `authentic` or `both`. |
| `reviewMode` | Exactly `evidence` or `live`. |
| `evidenceRequirements` | Named capture moments and artifact kinds needed to judge the case. |
| `playerReviewQuestions` | Questions tied to named evidence and answerable through observation. |
| `arrangePrimitivesNeeded` | Exact `adapter.arrange` names needed only for preconditions. |
| `probesNeeded` | Exact `adapter.probe` names needed for evidence or state waits. |
| `charter` | Required only for `reviewMode: live`; one sentence naming target, means, and the question passive evidence cannot answer. |

`questions` contains unresolved plan questions for the Owner. The Owner resolves them before sign-off; the Test Architect does not guess.

## Acceptance

- Every in-scope brief promise maps to at least one case; out-of-scope and unit-proven behavior does not become duplicate work.
- Every evidence-mode case declares enough evidence to answer every `playerReviewQuestion`.
- Every action-under-test maps to authentic `perform:` input, never an `arrange` shortcut.
- Every live case has a charter. Evidence cases omit it unless the note materially helps dispatch.
- Plan size follows brief severity; the file does not grow a generic boundary matrix for a quick spot check.
