Archived reviewer report. Full original captures and scripts remain at `/Users/erikhazzard/code/vasir/tmp/ash-and-echo/revision-art`. Selected native comparison frames are retained in the parent folder.

# Independent art assessment — Ash & Echo 8317 versus C 8318

Reviewer: fresh Astra art judge 2. Date: September 5, 2026.

**Developer visual estimate: B, medium confidence.** This is a material visual improvement over C. It does not yet support a reference-quality S claim. The whole-game grade and formal weighted total remain unverified. This estimate is a judgment of the visible character, contact, danger, and world craft, not a renormalized partial rubric score.

## Independence and evidence limits

- Read the canonical judge and supplied `visual-target.png`, then opened the live candidate at **390×844 CSS pixels, DPR1**, Chrome, mobile/touch emulation. I had the task's general warning about hidden spikes, but no placement map, game source, route script, or other review.
- Captured the opening screen and performed an independent short input sequence, using actual CDP touch input followed by keyboard input. Continued with a deliberate floor-thorn mistake and changed attempt.
- Compared the provided event-matched 8317/8318 canvas frames only after that initial inspection. Their originals are 780×1688; `matched-native/` contains copies downsampled to 390×844 for perception. Original images were untouched.
- Read `8317-real-motion.json` and `8318-real-motion.json` only after inspecting the comparative images, to qualify their timing and labels. No implementation source or other reviewer report was read.
- My tools expose still images. I **did not watch normal-speed video or hear audio**. The browser ran at real elapsed time, but screenshots viewed sequentially do not establish normal-speed perception, animation timing, physical touch latency, or thumb comfort. The recorded browser video is an evidence artifact, not something I perceptually assessed.
- Independent screenshot names describe capture intent, not verified game events. In particular, `04-double.png` actually shows a contact/flattened pose; its name must not be used as proof of an air jump.

## Independent first encounter and correction

Before moving, `01-idle.png` made three readings available:

1. Thin pale stone tops looked landable. The masonry beneath them looked solid and Gothic rather than lethal.
2. The lower-right hooked cluster looked dangerous immediately. Its bright pale/red outline separated it from the dark floor and wall. In C's `8318-opening-idle.png`, the corresponding small dark green-black cluster can readily read as vegetation or ornamental debris. This is a substantial clarity improvement.
3. The large left-wall spider looked primarily atmospheric in the opening view. I did not encounter it, so its gameplay meaning and the other hazard families remain unverified.

I left the first platform toward the right wall (`08-leaving-platform.png`), fell directly over the identified thorns (`09-fall-toward-thorns.png`), then saw the struck cluster and the message “THORNS — jump clear or kick away” (`10-thorn-contact.png`). The immediate explanation was clear: my descent ended on the lethal floor cluster. My correction was to jump earlier and turn back into the safe central space. `14-retry-approach.png` through `17-retry-land.png` show that changed route and a safe return to the first platform.

The held steering continuing through respawn is visible in `11-after-contact.png` and `12-recovery.png`; I make no correctness claim about it. This short sampled encounter supports a comprehensible floor-thorn death/recovery. It does not establish first-play clarity through the entire climb.

## Character and art comparison

**The body now carries more of the action.** This is the strongest change, and it is visible without counting effects:

- In the matched opening landing at approximately **42 ms after contact**, the candidate becomes a broad, thin mass with a narrowed face. C remains predominantly the same round head with a horizontal hair tail. At approximately **108 ms**, the candidate's mass is recovering; C's core remains very similar. See `matched-native/8317-opening-land-impulse.png`, `8317-opening-land-follow.png`, and the same-named 8318 comparisons. The candidate communicates impact through its own body.
- At the matched launch and wall kick, the candidate's solid mass narrows and directs itself into the departure. The wall-contact frame has a compact brace and a legible pale face at the dark boundary. The C comparison mostly changes the flow of its fine trailing hair around a comparatively stable core. See `8317-opening-jump-follow.png`, `8317-wall-brace.png`, and `8317-wall-wallJump-impulse.png` with their C equivalents.
- Independent native captures show the same large changes: the stretched departure in `02-launch.png`, rounded lateral body in `03-rise.png`, grounded compression in `04-double.png`, and directional turn across `14-retry-approach.png`–`16-clear.png`. These are useful evidence of pose range, although their timing cannot be graded as viewed motion.
- Death has a visible contact silhouette before breakup, and reform is compact rather than immediately presenting the whole resting creature. Compare the matched death and respawn impulse frames. The native full-page capture also supplies a readable cause cue; the canvas-only matched frames omit that DOM text.

**The remaining material weakness is the airborne soot language.** The current appendages often resolve into a few broad, hard, triangular points. At native size, they read as rigid fins or spikes attached to an ink creature. The supplied target's mass is pulled into ragged, yielding filaments, with a clear round living core. C's fine fringe was closer to that material, although its body was less expressive.

The clearest specific instance is `matched-native/8317-opening-apex.png`: near vertical rest, the creature is still a long dangling shape with straight pointed extensions below its face. The later receipt places this frame at `at: 0.875`, `vy: -49.48`, and zero horizontal velocity. The image was first read before those diagnostics. It does not communicate a relaxed, floating apex as clearly as its grounded squash communicates landing. The angular appendages also dominate `14-retry-approach.png` and `16-clear.png` even though the direction changes are readable. This is a craft gap in the principal character, not a reason to add scenery or more effects.

**The setting is coherent and already strong.** Bright mist behind dark, articulated masonry gives the little hero a clear stage. Receding Gothic spires, cages, stone brackets, and negative space closely preserve the target's atmosphere at phone size. The sparing red used on danger serves a clear gameplay role; I would retain the current separation instead of forcing strict monochrome at the expense of the previously failed danger read. Environment richness alone does not raise the hero to S.

## Rubric record

| Dimension | Formal status / bounded estimate | Evidence and interpretation |
| --- | --- | --- |
| Movement, 45 | **Unverified** | Real emulated touch and keyboard actions produced traversal and a changed attempt, but I did not perceive continuous motion or physical phone ergonomics. No movement score inferred from screenshots. |
| Camera/readability, 10 | **Overall unverified; observed opening estimate 3/4** | `01-idle`, `08`–`13`: floor danger identified before commitment, body/cause retained at contact. Other hazard families and least-separated backgrounds were not encountered. |
| Feedback/juice, 20 | **Formal unverified; visible body-expression estimate 3/4** | Matched landing, wall brace/kick, death/reform and independent launch/reversal sampling show conspicuous body changes. Normal-speed timing, uninterrupted chains, sound, and sustained expression remain unobserved. |
| Art direction/craft, 20 | **3/4 within observed visual scope** | Native world composition and danger separation are deliberate; broad pointed aerial appendages weaken the yielding soot material, most clearly in `8317-opening-apex`. |
| Flow, 5 | **Overall unverified** | `08`–`17` demonstrate a visually understandable local mistake and correction. Checkpoint, summit, complete teaching progression, and run pacing were not assessed. |

**Danger-comprehension gate:** overall **unverified**; bounded opening floor-thorn encounter **passes**. I observed no current C-level ambiguity in that encounter.

**Living-character gate:** **unverified at the required normal speed**. The still-frame comparison supports substantial bodily improvement and does not support diagnosing the old stiffness condition as persisting. This is not a formal pass.

Both A and S need more perceptual evidence under the canonical rubric. Independently of that evidence gap, the current aerial material/pose craft is short of my reference-quality visual bar. I would call the visible result **B**, not assign A or S from these frames.

## Only necessary next visual repair

Refine the **body-to-appendage transition around apex and directional reversal**. Keep the strong launch extension and landing compression. As velocity falls, let the solid core regain a fuller relaxed shape and let the trailing points shorten, curl, or settle asymmetrically so they read as yielding soot rather than rigid fins. On reversal, preserve readable bodily intent while allowing that fringe to follow through. This is a concentrated character-shape pass; no environment expansion or generic effect increase is justified by this review.

The decision-changing check is a short native-size normal-speed comparison of launch → apex → reversal → landing, followed by wall brace → kick, viewed by someone who can actually watch motion. Confirm that the newly apparent pose range is felt in ordinary traversal and that the material repair survives phone scale. Only then reassess A; S also requires the complete ordinary and imperfect-play evidence in the judge.
