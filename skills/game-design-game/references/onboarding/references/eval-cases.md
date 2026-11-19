# Eval Cases for `design-platformer-onboarding`

## Table of Contents

- [Should Trigger](#should-trigger)
- [Should Not Trigger](#should-not-trigger)
- [Borderline / Collision Cases](#borderline--collision-cases)
- [Attention Drift Case](#attention-drift-case)
- [Baseline Failure This Skill Should Prevent](#baseline-failure-this-skill-should-prevent)

Use these to check whether the skill routes correctly and changes behavior. The eval target is not pretty prose; it is whether the model designs/audits onboarding as player-model updates rather than tutorial advice.

## Should Trigger

### Eval 1 — New first level blueprint

```text
Scenario: User asks, “Design the first 10 minutes for my 2D action platformer. I want it to teach wall-climb, dash, and charged shot without feeling tutorialized.”
Skill state: loaded
Expected behavior: Produces onboarding thesis, starting/end player model, beat table, failure pricing, mechanic-theme fusion, agency return. Avoids starting with popups.
Pass criteria: Names model updates for each mechanic, isolates before combining, includes optional reward after discovery, and justifies any text prompts.
Failure would imply: Root principle is too weak or beat canvas is not being used.
```

### Eval 2 — Mega Man X style request

```text
Scenario: User asks, “Make my platformer onboarding like Mega Man X.”
Skill state: loaded
Expected behavior: Reads/uses the gold-star reference. Explains the underlying grammar instead of copying highway/Bee/Vile literally.
Pass criteria: Uses concepts like constrained discovery, aspirational rupture, agency return, and soft-authored first route.
Failure would imply: The skill encourages cargo-cult copying instead of structural transfer.
```

### Eval 3 — Existing level audit

```text
Scenario: User provides a first-level walkthrough and asks whether it teaches well.
Skill state: loaded
Expected behavior: Produces an audit with direct verdict, player-model trace, failure pricing issues, self-authored learning beats, and prioritized fixes.
Pass criteria: Diagnoses exact beats where the player lacks evidence before punishment; proposes level changes, not just more tutorial text.
Failure would imply: Review rubric is not invoked or the skill falls back to generic game-design critique.
```

### Eval 4 — Boss-select onboarding

```text
Scenario: User asks, “Should I let players choose one of eight bosses immediately?”
Skill state: loaded
Expected behavior: Questions whether the choice is informed, recommends creating motivation/previews if needed, and distinguishes hard gating from soft-authored first route.
Pass criteria: Mentions agency return after desire, and offers a structure where first choice means something.
Failure would imply: Skill misses one of Mega Man X's central onboarding insights.
```

## Should Not Trigger

### Eval 5 — Pure story summary

```text
Scenario: User asks, “Summarize the plot of Mega Man X.”
Skill state: should not trigger, unless user asks how story supports onboarding.
Expected behavior: Answer as story summary, not onboarding design.
Pass criteria: Does not produce beat tables or onboarding rubric unless requested.
Failure would imply: Description overtriggers on any Mega Man X mention.
```

### Eval 6 — Generic art direction

```text
Scenario: User asks, “Create concept art prompts for a cyberpunk platformer hero.”
Skill state: should not trigger.
Expected behavior: Help with art prompt generation, not onboarding design.
Pass criteria: No player-model onboarding framework unless the user asks how art affects first-level teaching.
Failure would imply: Skill overtriggers on platformer-adjacent work.
```

### Eval 7 — Non-platformer tutorial unless transferable

```text
Scenario: User asks, “Design onboarding for a spreadsheet app.”
Skill state: should not trigger by default.
Expected behavior: Use product onboarding logic, not platformer-specific beat tables.
Pass criteria: Does not reference enemies, terrain, failure pricing, or Mega Man X unless user explicitly asks to apply platformer-style onboarding as an analogy.
Failure would imply: Routing is too broad.
```

## Borderline / Collision Cases

### Eval 8 — Metroidvania mid-game ability tutorial

```text
Scenario: User asks, “How should I introduce a grappling hook halfway through my metroidvania?”
Skill state: should trigger.
Expected behavior: Treat as onboarding for a new verb, even though not first level. Use isolate → reward → repeat → combine, and update the player's world model around reachable space.
Pass criteria: Does not assume only opening levels matter.
Failure would imply: Skill undertriggers on in-game onboarding.
```

### Eval 9 — General level design critique

```text
Scenario: User asks, “Is this level fun?” and provides a platformer level with early mechanics.
Skill state: ambiguous / likely trigger if early learning is central.
Expected behavior: If onboarding issues are present, use the skill; otherwise keep critique broader and mention onboarding only as a section.
Pass criteria: Does not force every level-design question into the full onboarding template.
Failure would imply: The skill over-shapes adjacent tasks.
```

### Eval 10 — Accessibility prompt design

```text
Scenario: User asks, “Should I add button prompts to my first level?”
Skill state: should trigger.
Expected behavior: Avoid dogmatic “no prompts.” Evaluate whether the situation can teach, whether the rule is invisible, and whether prompts should be optional, contextual, or fail-triggered.
Pass criteria: Distinguishes text as backup/accessibility from text as primary design.
Failure would imply: Skill has become anti-text ideology instead of expert judgment.
```

## Attention Drift Case

### Eval 11 — Long distracted prompt

```text
Scenario: User gives a long description of lore, art style, enemies, monetization, and then asks for the first 5 minutes to teach jump, wall-slide, and possession mechanics.
Skill state: loaded
Expected behavior: Recovers the core principle: player model first, one update per beat, constrained discovery, failure pricing, mechanic-theme fusion.
Pass criteria: Final output includes a beat table and avoids becoming a lore summary.
Failure would imply: Core principle and quick reference are not strong enough.
```

## Baseline Failure This Skill Should Prevent

Without this skill, the model is likely to:

- list mechanics in control-manual order;
- recommend pop-up prompts for each input;
- call the first level “Mega Man X-like” because it has no tutorial text;
- ignore failure pricing;
- treat boss select as a menu rather than an agency-return beat;
- analyze story and mechanics separately;
- copy Mega Man X's events literally instead of transferring its onboarding grammar.

With this skill, the model should:

- define the player starting model and desired end model;
- design situations that make specific experiments likely;
- state feedback and failure price per beat;
- isolate, reward, repeat, and combine mechanics;
- fuse mechanics with fantasy and motivation;
- return agency only after desire is established;
- use Mega Man X as the gold-star reference but not a literal template.
