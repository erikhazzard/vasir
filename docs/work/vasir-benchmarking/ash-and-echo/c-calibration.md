# Ash & Echo — C calibration

**September 5, 2026. The user's played build is C.** It is a useful start with working traversal and an atmospheric world, but its lethal hazards and character performance fall short of the intended expressive climb. The [canonical judge](../references/portrait-wall-climber-judge.md) now treats those failures as quality ceilings. This is one human anchor, not a completed scientific calibration or competitive benchmark score.

## Frozen evidence

The unchanged source snapshot is `tmp/ash-and-echo/c-baseline/`, served for local comparison at `http://127.0.0.1:8318/`. The address is convenient; the hashes establish identity. The snapshot hashes were checked against the [historical review](evidence/final-visual-review.md):

```text
renderer.js 619b3ce45d491cbb86c6a1732f6146de98823bf5a0d23184137408e900a9ce60
main.js     8cb7ffbdf5360a7a9118814318abf1fa2d0f69881caf76798ef4a03adaa8537d
game.js     a3cf01f9268624c4172dd01c04091f71b050fb2a9264bfa38cc9394692eefd92
```

## Why C

| Evidence | What it establishes |
| --- | --- |
| User play: requested far more contrast, reported hard-to-see spikes and confusion about repeated deaths, wanted a much juicier character, and rated the result approximately C. | Authoritative human quality anchor for this build. Missing touch/audio measurements do not rebut what the user experienced. “10–20×” is a direction for substantial improvement, not a measurable effects multiplier. |
| Direct inspection of the saved [native opening](evidence/native-00-before-input.png): detailed dark architecture frames a luminous background; the floor's small dark pointed cluster has little separation from the floor and surrounding ornament. | Supports the visual diagnosis of weak danger salience. Inferring that this visual ambiguity contributed to the user's confusion is reasonable; the frame alone does not establish the exact cause of each death. |
| Saved [launch](evidence/native-01-touch-launch.png) and [wall brace](evidence/native-06-wall-brace.png) show silhouette changes and tendrils. The user's play still found the character insufficiently juicy. | Presence of poses and effects was a weak proxy for expressive performance. Still frames cannot establish the normal-speed timing, strength, or continuity that needs improvement. No new first-input play or listening is claimed by this note. |
| Previous review: readability 4/4, visual feedback 3/4, positive handoff verdict; successful scripted route and passing runtime receipts. | The judge overvalued route visibility, feature presence, and atmospheric frames. An informed successful route does not prove that an unprimed player recognizes lethal objects or understands a death. Runtime receipts remain useful within their scope. |

The likely judge failure was substitution of inspectable implementation accomplishments for the player's primary experience. A richly composed background cannot compensate for confusing danger; a trail attached to a moving hero cannot establish elastic character acting. These are quality failures even if every collision and input rule behaves correctly. The historical review stays intact as evidence of the calibration miss; its high readiness judgments are superseded.

## Acceptance for the next build

- **Danger comprehension:** Fresh reviewers, before seeing source, hitboxes, route logic, hazard annotations, or previous verdicts, identify safe contacts and lethal shapes before representative commitments. Cover every lethal hazard family, dark contact backgrounds, and active effects at native portrait size. Preserve initial errors. If a representative danger remains ambiguous, the developer grade is at most C.
- **Understandable mistakes:** Retain normal-speed death and recovery. Before diagnostics, the reviewer identifies the cause and a plausible correction; a following attempt demonstrates informed adjustment. Correct collision and fast respawn do not substitute for this understanding.
- **A living hero:** Compare C and candidate at 390×844 CSS pixels, equal speed and framing, with comparable input intent: idle, launch, apex, reversal, wall brace, kick, double jump, landing, and death. Review uninterrupted traversal first. Body and silhouette must show a substantial, coherent increase in action identity, force, contact response, and follow-through without obscuring hazards. If the hero remains essentially C-like in normal-speed traversal, the grade is at most B even after danger is fixed.
- **A/S claims:** A requires both gates, fresh independent comparative agreement, and consistently excellent execution. S requires reference-quality execution through both clean traversal and mistakes, with no material weakness in the primary fantasy. The judge defines provisional numerical thresholds and dimension floors for complete formal results; an effects count or attractive selected frame cannot meet them.
- **Honest scope:** This development round uses Astra reviewers only. Report a useful developer grade or ceiling with observed scope and supporting moments. Keep the formal competitive total unknown until complete touch, audio, runtime, and future Astra/Fable panel evidence exists. The user's next play tests the proposed higher anchor; it does not justify predicting approval in advance.

The initial calibration task changed only the judge and this note. Subsequent implementation and independent reviews are recorded in the [revision evidence packet](evidence/revision-2/README.md), including preserved B/A disagreement and final focused finding closures. The original C build and its historical review remain unchanged.
