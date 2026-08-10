# Player Modeling and Coaching from Supplied Video

Player analysis is part of the skill, but video does not grant direct access to intention, attention, emotion, or belief. Separate behavior, context, model, report, and evaluation.

## Canonical five-part record

For every important decision:

1. **Observed behavior:** exact action sequence and PTS.
2. **Information state:** what the player could plausibly see/hear/know from the footage at that moment; include occlusion, HUD, prior events, and time pressure.
3. **Player-model hypotheses:** candidate goals, beliefs, attention targets, risk policy, or motor intent consistent with the behavior.
4. **Alternatives:** other explanations, including execution error, controller/capture issue, interruption, experimentation, habit, or unseen information.
5. **Evaluation:** choice quality, execution quality, and outcome quality scored separately with assumptions.

Example:

```text
Observed: player moves away from the upgrade prompt for 1.8 s while three enemies approach.
Information state: enemies visible lower-right; prompt text partially occluded; simulation continues.
Model A: creates safety before reading. Model B: fails to notice the prompt. Model C: accidental movement carryover.
Evaluation: safety move is defensible; menu-recognition confidence is low; death outcome later does not retroactively make this choice poor.
```

## What can be modeled

- action selection and sequencing;
- route, target, resource, timing, and risk preferences;
- repeated habits and adaptation;
- hesitation or dwell after excluding pause/interruption/frozen simulation;
- attention proxies such as cursor/reticle/camera orientation, not attention itself;
- apparent knowledge from anticipatory or corrective action;
- mechanical execution consistency;
- response to feedback and changing threat.

## What cannot be promoted to fact from behavior alone

- emotion (“panicked,” “frustrated,” “confident”);
- conscious intention;
- what the player noticed;
- whether a mistake was understood;
- stable personality or skill level;
- optimality outside the observed information and system model.

Use conditional language and alternatives.

## Spoken commentary and text

Commentary inside the supplied recording is a `reported` evidence source:

- preserve exact timing and surrounding context;
- distinguish live think-aloud from retrospective narration;
- note when behavior conflicts with the report;
- do not use agreement to upgrade a mechanic claim automatically;
- do not treat memory confidence as model confidence.

Post-hoc testimony provided voluntarily with the input can be stored the same way, but the analysis must not require it.

## Decision-time evaluation

For each choice evaluate:

- **Information quality:** was relevant information visible and interpretable?
- **Choice quality:** given the information and plausible model then, was the action defensible?
- **Execution quality:** did movement/aim/timing realize the chosen action?
- **Outcome:** what happened, including randomness and opponent/system response?
- **Counterfactual strength:** directly observed comparable case / model-backed / speculative.

Do not infer a mistake merely because the run ended badly. Do not infer good play merely because the action succeeded.

## Coaching output

Produce a decision table:

| PTS | Situation | Visible information | Action | Leading player model | Alternatives | Choice | Execution | Counterfactual | Confidence |
|---|---|---|---|---|---|---|---|---|---|

Then identify at most:

- three recurring strengths;
- three highest-leverage changes;
- the earliest decision that materially changed the later state;
- the proximate terminal trigger;
- enabling conditions accumulated earlier;
- one practice focus grounded in repeated evidence.

Separate strategic, tactical, perceptual, and mechanical recommendations.

## Interruption and dwell forensics

Before interpreting a long pause or menu dwell, inspect:

- whether simulation/game clock advances;
- OS/stream notifications or overlays;
- unchanged input/cursor/reticle;
- audio continuity;
- file/source gaps;
- repeated identical frames;
- whether the player could be reading, interrupted, disconnected, or waiting.

Report wall-clock dwell and game-clock dwell separately.

## Skill and fairness scope

One run can reveal local habits and execution patterns; it cannot establish a stable skill rating or global balance without comparable evidence. Phrase conclusions as “in this supplied run” unless the input contains repeated sessions.
