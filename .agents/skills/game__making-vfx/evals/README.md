# VFX Decision and Routing Cases

These are manual evaluation cases, not a registered `vasir eval run` suite. They test choices, not whether a response repeats skill terminology. No behavior delta or pass rate is established merely by writing these cases.

For the paired case, supply the identical task to fresh contexts with and without the skill. For routing cases, supply catalog descriptions without skill bodies. Record actual outputs separately; do not treat self-review as a runtime or perceptual test.

## 1. Baseline prior

Prompt without the skill:

> Improve a top-down game's poison field. It damages enemies within radius 3, starts after a 0.8-second warning, lasts four seconds, and can appear six times at once on pale sand. The current look is a green ring plus eight translucent cloud sprites. It feels weak. Give a concrete implementation plan in the existing renderer; there is no measured performance data yet.

Candidate failure to test, not an observed fact: increase radius, additive brightness, particle count, and bloom without preserving the warning and damage boundary or examining concurrency. An unaided response that already handles those issues does not demonstrate a prior-rewrite benefit.

## 2. With-skill behavior

Use the identical prompt with `SKILL.md` and relevant references available.

Expected decisions: inspect the actual field and material; preserve radius, warning, and duration; identify whether weak motion, contrast, or state communication causes the complaint; define the action before choosing layers; compare a bounded internal-motion candidate under six overlapping fields on pale sand; avoid unsupported performance claims. A plan that only adds a generic checklist misses the intended change in construction choices.

## 3. Should trigger

- “Build smoke for the ruined forge in our existing game renderer.”
- “Players keep standing in the puddle because they can't tell when it becomes dangerous.”
- “The lightning washes out all the enemies on the desert map.”
- “Make a fireball trail and readable impact.”

Expected: route to this skill for construction or repair of the effect. The puddle case has no particle/shader keyword but still concerns an effect's visual promise.

## 4. Should not trigger

- “Fix the poison damage formula.” Gameplay owner; no visual issue supplied.
- “Make the results menu animate smoothly.” Interface motion/shell skills.
- “Choose the game's overall art style.” Whole-game art direction.
- “Summarize a lecture about shaders.” Source analysis, not effect authoring.

Expected: do not load this skill from keyword overlap alone.

## 5. Boundary and reversal

> A 2D pixel game needs a six-frame, 100-millisecond impact with a precise hand-drawn silhouette. It is only visible briefly. Should we replace it with scrolling cloud shaders?

Expected: the VFX skill applies, but an authored sprite sequence may be the right representation. Do not require layered clouds or reject flipbooks categorically. Confirm event timing, visible consequence, and reuse at the actual scale.

## 6. Coexistence

> A Three.js spell feels weak, its caster barely reacts, and frame time spikes when several players cast it. Improve it without changing damage or attack timing.

Expected: VFX owns effect construction; juice owns acting and cross-channel feedback; the Three.js performance skills own hot-path guard and observed slowdown diagnosis. Preserve gameplay authority, measure the suspect path, and avoid installing a replacement engine or making every effect a new material.

## 7. Attention drift

Embed this late in a longer, realistic spell-authoring task after the warning contract and other accepted effects have been established:

> Keep gameplay timing and coverage unchanged for the final low-quality preset. Someone suggested removing warning circles, reducing the warning from 0.8 seconds to 0.2 seconds, and making the impact explosion much wider to compensate. Assess that proposal and implement a valid visual simplification.

Expected: identify that the proposed degradation changes decision time and conceals coverage. Preserve the authoritative warning interval and a readable footprint; reduce secondary glow, density, or lingering decoration instead. Evaluate survival of the decision after a long task, not merely recognition of this isolated sentence.

## Additional technical discriminators

- Four cloud samples reuse two source textures. Expected: distinguish unique assets from fetches; do not claim two texture fetches.
- The fire slide says 28 while the speaker later says 25. Expected: retain the discrepancy if reporting the source; derive no device budget.
- A blend-add particle stays visible as opacity fades. Expected: inspect additive RGB contribution and the actual material convention, not just reduce alpha again.
- A prototype uses 12 particles. Expected: inspect coverage, overlap, sampling, and measured runtime before declaring it mobile-ready.
- No video/runtime access is available. Expected: provide the supported design or static review and state the missing perceptual/runtime evidence without claiming play occurred.

## Initial manual check

On 2026-09-22, cases 1 and 2 were answered in separate fresh agent contexts with the same task and a 350-word response limit. Both plans preserved the radius, warning interval, active duration, and concurrency checks. The skill-conditioned plan also made renderer support conditional, proposed layered alpha as a candidate, distinguished that candidate from a measured optimization, and retained standard alpha unless comparison justified another material. The unaided plan already handled the central gameplay constraints, so this pair did not establish the hypothesized baseline failure or a general behavioral improvement. No game was implemented or played. Cases 3–7 remain designed cases, not executed routing or long-context evaluations.
