# Arrange versus shortcut

`arrange:` makes a case's preconditions true. `perform:` drives the player action the case exists to verify. The boundary is case-relative: the same debug primitive can be valid setup in one case and an invalid shortcut in another.

## Decision test

For each proposed `arrange.<name>` ask:

1. What exact action or chain is this case testing?
2. Does the primitive perform, skip, or directly grant the observable result of that action?
3. Could the journey still exercise that action through real input after the primitive runs?

If the primitive performs or bypasses the action under test, it is forbidden for that case. Use `perform:`. If the required precondition cannot be established without bypassing the action, file a `capability-gap` ticket and halt rather than weakening the case.

## Examples

| Case under test | Valid arrange | Forbidden shortcut | Required action |
|---|---|---|---|
| Buying an upgrade | `setCurrency`, `openShopState` | `grantUpgrade`, `buyUpgrade` | Click/tap the actual purchase control. |
| Attack input and hit feedback | `spawnTarget`, `setTargetHealth` | `damageTarget`, `triggerHit` | Use the real attack input. |
| Restart after defeat | `setPlayerHealth`, `spawnHazard` | `restartRun`, `startNextRun` | Reach and activate the restart affordance. |
| Damage formula only | `setPlayerHealth`, `setDefense`, `spawnAttacker` | A primitive that writes the expected final HP | Trigger an observed attack through the case's declared input path. |
| HUD rendering for an already-established state | `setHeat` may be valid | Not a shortcut when the case does not test heat acquisition | Capture and probe the HUD state. |

## Namespace rules

- `arrange.*`: state setup only; setup verbs such as `set`, `spawn`, `give`, `grant`, and `clear` are hints, not proof of legality.
- `perform:`: authentic keyboard, pointer, touch, gamepad, or other player input.
- `probe.*`: read-only observation; a probe must not mutate state to make evidence convenient.
- `inputMode: authentic | both`: at least one `perform:` step must exercise every player action under test.
- `inputMode: synthetic`: allowed only when the case is explicitly about state correctness rather than a player-input chain.

A case verified only through the debug surface has verified the debug surface. Name that narrower result or fix the journey.
