# Interaction Patterns and Heuristics (Non-Normative)

## Grip arbitration example

A deterministic grip score can combine:
- affordance priority
- distance to grip center
- entry-angle fit
- current ownership / lock state
- blocked / constrained penalty
- stable tie-break by entity id then grip id

Example preference:
- sword hilt > crossguard > pommel > blade
- shield handle > rim
- chair top rail > side leg > lower leg

## Object behavior classes

Think in behavior classes, not just mass classes:

- **light:** low lag, low leverage penalty, easy reorientation
- **medium:** noticeable lag, controlled overshoot, good throw readability
- **heavy:** strong lag, strong obstruction gap, slower release response
- **awkward:** rotationally stubborn because inertia and grip offset dominate even if total mass is moderate

## Two-hand role patterns

Common useful splits:
- primary hand = position authority, secondary = rotation / stability
- primary hand = gross motion, secondary = leverage reduction
- primary hand = weapon base, secondary = guide hand that biases release

Do not assume symmetric full-authority joints on both hands by default.

## Throw support patterns

Deterministic support options:
- release grace window in ticks
- best-tick selection within the grace window
- deadzone rejection for micro-flick exploits
- mild direction correction without mass normalization
- obstruction-aware release when the object is trapped

Each one must be named and justified.

## Material-pair examples

Useful material classes:
- flesh
- cloth
- leather
- wood
- stone
- steel
- ceramic
- armor

Pairs can drive:
- friction / restitution combines
- scrape vs thunk vs cut presentation
- penetration eligibility
- spark / dust / debris selection
- damage readability

## Compact example schema fragment

```ts
type GripDefinition = {
  id: string;
  role: 'primary' | 'secondary' | 'either';
  localPose: Pose;
  entryConeDeg: number;
  priority: number;
  magnetismTicks?: number;
  allowedHands: 'left' | 'right' | 'either';
};
```
