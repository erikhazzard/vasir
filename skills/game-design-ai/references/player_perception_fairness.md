# Player Perception and Fairness Reference

Game AI is judged through player perception. Internal sophistication matters only when it produces better experience, readability, challenge, or trust.

## Player experience first

For every AI, define:

```text
What the player should think the AI knows:
What the player should think the AI wants:
What the player should be able to predict:
What should surprise the player:
What should feel fair when the player loses:
What should feel satisfying when the player wins:
```

## Visible mistakes

Classify mistakes by player impact:

```text
Acceptable mistakes: create charm, readability, or opportunity.
Tolerable mistakes: noticeable but rare and not trust-breaking.
Unacceptable mistakes: break fairness, fantasy, or core challenge.
```

Examples:

```text
Acceptable: enemy hesitates before pushing, bot overexpands sometimes, goalie commits slightly early.
Tolerable: companion takes a suboptimal path if it does not block the player.
Unacceptable: enemy tracks through walls, bot reacts instantly to unseen input, companion traps player in a doorway.
```

## Fairness contract

Define fairness rules as hard invariants or director constraints.

```text
No invisible omniscience unless the mode explicitly cheats.
No instant reaction to hidden information.
No unavoidable punishment without telegraph.
No rubber-banding that is obvious enough to feel dishonest.
No difficulty increase that removes learned counterplay.
No teammate/companion behavior that steals player agency.
```

## Controlled imperfection

Use imperfection deliberately. Do not make easy AI by random stupidity alone.

Tunable imperfection channels:

```text
Perception radius
Field of view
Hearing sensitivity
Memory duration
Reaction delay
Aim/precision error
Prediction error
Risk tolerance
Commitment duration
Coordination quality
Allowed tactic set
Mistake frequency
Mistake severity cap
```

Better difficulty design:

```text
Easy: slower perception, larger telegraph windows, smaller tactic set, more recoverable mistakes.
Normal: readable but competent, moderate reaction, varied choices.
Hard: faster reaction, better positioning, stronger coordination, fewer severe mistakes.
Nightmare: optimal tactics allowed, but still respects fairness and telegraphs unless explicitly cheating.
```

Avoid:

```text
Easy AI that walks into walls.
Hard AI that uses hidden omniscience.
Difficulty that only changes health/damage.
Randomness that violates character personality.
```

## Reaction and telegraph design

For player-facing decisions, specify:

```text
Perception delay: time before AI can notice an event.
Decision delay: time before it commits to a response.
Execution telegraph: visible/audio cue before harmful action.
Commitment window: time during which the AI cannot instantly cancel.
Recovery window: player opportunity after AI action.
```

Example:

```text
Enemy sees player leave cover.
Perception delay: 250ms normal, 450ms easy, 150ms hard.
Decision delay: 100ms.
Telegraph: shoulder aim raise and bark.
Commitment: cannot instantly swap targets for 500ms after firing starts.
Recovery: 700ms reload/settle window after burst.
```

## Legibility channels

AI intent can be shown through:

```text
Animation pose
Movement vector
Gaze/head direction
Audio bark
UI indicator
VFX telegraph
Formation shift
Path choice
Cooldown tell
Territory/heatmap display
```

Use these when an AI decision would otherwise feel unfair or random.

## Anti-exploit variation

Variation should break trivial exploitation without destroying learnability.

Good variation:

```text
Randomize among near-equal utility actions.
Vary route within tactical equivalence.
Randomize reaction delay within a profile range.
Use personality-specific risk thresholds.
Add cooldowns to repeated tactics.
```

Bad variation:

```text
Randomly ignore hard safety.
Randomly break character fantasy.
Randomly punish the player with no read.
Randomly select from actions with very different quality.
```

## Perception audit

Before finalizing, answer:

```text
What will the player see before the AI harms them?
What mistake will let the player feel clever?
What hidden information does the AI use?
Would a loss feel earned?
Would a win feel like mastery or luck?
Can the player learn counterplay?
What repeated exploit will players discover first?
```
