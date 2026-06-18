---
name: game-proof__auditing-first-playable-comprehension
description: "Judges whether a Studio or Idavoll first playable works and feels good by inspecting the first real play moment: input, response, consequence, and desire to continue. Use after a runnable game exists and before claiming initialization, vertical-slice, publish-readiness, or final handoff, especially when the first seconds may be passive, confusing, auto-resolving, results-only, or unclear."
---

# First Fun Judgment

## Core Principle

A first playable earns completion when a human QA pass can watch the opening and
say: "I get what the toy is, I acted, the game answered, something changed, and
I want another try."

The first slice must show one loop:

```text
act -> answer -> consequence -> better next attempt
```

Timing can expose dead input or a passive start. Timing cannot make a boring toy
good.

The verdict starts with the lived play moment, not the spec, timestamp table,
or harness result:

```text
I <did this input/choice>; the game <answered this way>; <this state changed>;
next I wanted to <try this>.
```

If that sentence cannot be written from actual play material, the first
playable does not slap yet or the review is blocked.

## Human QA Slap Test

You are the QA human for the first active slice. Do not hide behind "subjective"
when the opening is visible enough to judge.

Watch or play the first 15 seconds and answer:

1. Do I know what I can do without reading a manual?
2. Does the first input feel acknowledged immediately?
3. Did my action create a visible, integrated consequence?
4. Do I understand at least one better next attempt?
5. Would I voluntarily play another 30 seconds?

If the answer to 5 is no, the verdict cannot be `SLAPS`. Name the single biggest
reason the toy does not slap yet.

## Timing Sanity

Timing matters because dead input and slow agency kill feel. It is not a
substitute for judgment. A fast, boring toy still fails.

Use these numbers only when they affect feel:

- The first actionable surface should appear within 5 seconds, usually within 2.
- The first input should get visible feedback inside 100ms, ideally inside one frame.
- The first consequence should land before the player wonders whether anything happened.
- The first 10 to 15 seconds should create progress, danger, reward, failure pressure, or a changed tactical situation.

If a genre needs slower setup, the opening still owes the player anticipation,
agency, and clarity during the wait.

## Trigger Boundary

Use this skill when:

- a Studio or Idavoll first playable has been implemented or materially changed;
- initialization, first playable, vertical slice, publish readiness, or final handoff is about to be claimed;
- the game might be passive, confusing, self-playing, over-automated, tutorial-dependent, results-only, or unclear in the first seconds;
- fresh play material exists or can be captured: screenshots, clip, input trace, deterministic sim output, replay, or browser QA.

Do not use this skill for:

- pre-code ideation before a runnable game exists; use `game__directing` and `game__building-core-loop`;
- broad system design; use the relevant genre/system skill;
- platformer curriculum design; use `game-onboarding__designing-game-onboarding`;
- broad visual redesign; use `game__art-directing`, `design__designing-game-ui-for-idavoll`, or `ui__revamping-game-shell-ui`;
- final release certification after first-fun judgment exists; use `handoff__final-quality-gate`.

## Definitions

### First Playable Frame

The first frame where the game surface is visible enough that the player can begin understanding the situation. Loading screens do not count. A blocking modal, splash screen, lore screen, or main menu counts against the game unless the spec explicitly makes that surface the first meaningful choice.

### First Meaningful Choice / Interaction

An act is meaningful only when all five are true:

1. **Invitation**: the player can see what action is available without guessing.
2. **Agency**: the player has at least two plausible options, timings, targets, gestures, routes, placements, or picks, or the execution timing/aim itself is the choice.
3. **Immediate feedback**: the game visibly responds within 100ms, target 50ms or one frame.
4. **State consequence**: something integrated changes: position, velocity, board, health, score, enemy intent, build, resource, phase, route, survival, or story state.
5. **Learned pattern**: the player can form a next hypothesis: "next time I should ____."

Valid examples:

- Flappy-like game: first tap changes bird velocity and reveals timing against the pipe threat.
- Swipe sports/toy game: first swipe changes ball path, power, spin, target, or collision outcome.
- RPG/strategy game: choosing Rogue, Paladin, or Cleric immediately changes available action, stats, role, route, or combat plan.
- Auto-battler: buying or placing a unit changes a visible trait, target preview, formation, or combat result.
- Puzzle game: first move changes the board and exposes why a better move might exist.

Invalid examples:

- wait for the game to start;
- tap to continue;
- close a modal;
- read lore;
- watch auto-combat;
- press a button whose consequence is only a hidden counter;
- reach a result screen produced by forced fast-results mode.

## Workflow

### Pass 0 - Find The Intended Toy Without Blocking

Read `README__game-spec.md` if it exists. Missing spec is not a blocker. A
runnable game can still be judged from the visible surface, controls, source,
route name, package metadata, or the first playable frame.

Extract what is available:

- one-line promise;
- target platform/orientation;
- first frame visual contract;
- core verb;
- expected first meaningful choice / interaction;
- controls and input model;
- feedback and juice spec;
- scoring, failure, result, and restart rules;
- acceptance criteria.

If intent is unclear after seeing the first visible game surface, continue the
review and judge the actual opening. Do not invent a promise to make the game
sound coherent.

Then classify the first-fun shape:

| Shape | What can satisfy the first meaningful act |
|---|---|
| Direct-control / hyper-casual | first tap, swipe, hold, drag, aim, release, dodge, jump, flap, slice, redirect, or timing act |
| Puzzle | first board move with visible board consequence |
| Strategy / RPG / deckbuilder | first pick, class, card, route, target, resource spend, or tactical commitment |
| Auto-battler / tactics | first draft, buy, placement, equipment, trait, lock-in, or target-preview commitment |
| Idle / management | first allocation, upgrade, priority, timing, or automation toggle that changes future output |
| Narrative | first story choice that visibly changes state, route, tone, risk, relationship, or next option |

If the expected act is not identifiable from the spec or from the playable
surface, return `DOES NOT SLAP - no readable first meaningful act`.

### Pass 1 - Play Or Watch One Real Act

Use the closest available browser, QA, replay, screenshot, or clip command. Judge
real player-facing time, not only internal sim output. A still screenshot can
show a blocker, but it cannot earn `SLAPS` for a game where input response,
motion, collision, camera, or feedback matters.

Record the play moment before writing any verdict:

```text
Observed play moment:
- Before input: what the player sees and thinks they can do
- Input/choice: the exact key, tap, drag, pick, placement, aim, timing, or route
- Immediate answer: the visible/audio/motion response
- Consequence: what integrated game state changed
- Next desire: what a human would try next and why
- One-sentence read: I <acted>; the game <answered>; <state changed>; next I wanted <...>.
```

If no real input or choice is available in the opening, return
`DOES NOT SLAP - no playable act`. If the capture is too incomplete to judge,
return `BLOCKED - no active-play material`.

If the only available material shows the actual opening and it is loading,
splash, modal, autoplay, forced fast-results, or results-only play, return
`DOES NOT SLAP - no active play`.

### Pass 2 - Write The First Fun Verdict

Use this shape. It is intentionally small so the human judgment cannot get
buried under a fake audit.

```text
First Fun Judgment:
- Verdict: SLAPS / DOES NOT SLAP / BLOCKED
- Play moment: I <acted>; the game <answered>; <state changed>; next I wanted <...>.
- Would I play another 30 seconds?: yes/no/blocked - <why>
- First meaningful act:
- What the game does back:
- What changed that matters:
- Better next attempt the player can infer:
- Single biggest reason it does not slap yet:
- Timing notes only if they affected feel:
- Broken-surface checks only if they found a blocker:
- Fresh play material used for the judgment:
```

Hard rule: if `Play moment`, `Would I play another 30 seconds?`, `What the game
does back`, `What changed that matters`, or `Better next attempt` is empty, do
not call it `SLAPS`.

### Pass 3 - Add Timing Notes Only When Feel Requires It

Timing notes are supporting detail. Use them only to explain dead input, slow
agency, delayed consequence, or a first loop that takes too long to create
pressure, reward, danger, or curiosity.

When timing matters, record only the beats that change the verdict:

- first visible playable surface;
- first invited action;
- first input or choice;
- first visible response;
- first integrated consequence;
- first payoff, pressure, or changed hypothesis.

Do not let timing math replace the play moment sentence.

### Pass 4 - Optional Broken-Surface Check

When a browser target is available and the project does not already provide a
better game-specific runtime command, use the packaged harness to capture a
broken-surface check:

```bash
node <this-skill-dir>/scripts/inspect-game-canvas.mjs --url http://127.0.0.1:5173 --out artifacts/browser-surface-check --key KeyW
node <this-skill-dir>/scripts/inspect-game-canvas.mjs --url http://127.0.0.1:5173 --out artifacts/browser-surface-check --mobile --drag-selector "#touch-stick"
```

Use project-specific selectors, keys, or diagnostics when the defaults do not
match the game. The harness can detect canvas visibility, nonblank readback,
console/page errors, screenshots, basic input attempts, and diagnostics deltas.
Treat this as a janitorial check:

Use the harness result only as `no blocker`, `blocker found`, or `unavailable`.

Do not put a green harness result in the headline. It has near-zero correlation
with whether the toy works or feels good. Mention it only if it found a blocker
or the user asked for runtime details.

### Pass 5 - Judge The First Act

Run these quick checks:

| Test | Pass condition |
|---|---|
| Two-path test | A different plausible input, timing, target, placement, class, route, or pick would produce a different visible trajectory or result. |
| Discernible outcome test | The player can see what happened immediately after acting. |
| Integrated outcome test | The action changes real game state, not only animation or text. |
| One-more-try test | The first result suggests a better next attempt, not just "continue". |
| Human slap test | A human QA reviewer would voluntarily play another 30 seconds from this first slice. |

For execution-heavy games, timing, aim, or gesture quality can be the choice.
For strategy-heavy games, the first commitment can be a discrete option. For
auto-resolving games, the meaningful choice must happen before automation, and
automation must visibly prove the commitment.

### Pass 6 - Classify Failure And Repair Order

Use the first failing label:

| Failure | Symptom | Repair first |
|---|---|---|
| Slow or absent agency | More than 5s before a meaningful act, or no act exists. | Move the first choice/interaction into the first screen. |
| Passive start | Player mostly waits, watches, reads, or taps through. | Replace passive opener with a playable commitment. |
| Fake choice | Button/gesture exists but alternatives do not matter. | Add divergent consequence or execution skill. |
| Hidden affordance | Valid action is not invited. | Strengthen signifier, target, gesture affordance, and hit area. |
| Dead feedback | Input response is late, invisible, or outside the game surface. | Add immediate visual/motion/audio/haptic response. |
| Hidden consequence | State changes without readable cause. | Show delta, transition, source, target, and before/after. |
| Pattern vacuum | Player cannot infer what to try next. | Add near-miss, preview, result cause, or changed hypothesis. |
| Automation theft | Auto-combat/auto-run resolves before player commitment matters. | Expose draft/placement/setup choice and prove it in the outcome. |
| Asset meaning failure | Art, sprites, cards, units, or UI obscure identity/role/state. | Fix visual identity/layering before claiming first-fun. |

Repair order is strict: first meaningful act -> immediate feedback -> integrated consequence -> learned pattern -> result/restart -> juice/polish. Do not polish a passive start.

### Pass 7 - Verdict

Return exactly one verdict:

- `SLAPS`: the first slice makes a human want another try, backed by immediate feedback, integrated consequence, and a better next attempt.
- `DOES NOT SLAP`: the first slice is visible and shows a hard failure.
- `BLOCKED`: the game cannot be played or inspected enough for a human QA verdict.

Do not turn `BLOCKED` into `SLAPS` because build, tests, selectors, sim diffs,
or QA launch checks passed. Machine green is not first-fun green. Do not turn
`DOES NOT SLAP` into `BLOCKED` when the opening is visible and the toy plainly
does not slap.

## Only Things That Matter

These are the only things that matter:

- the player can act quickly without guessing;
- the game answers the act;
- the act changes something visible and integrated;
- the player can infer a better next attempt;
- the verdict names the concrete play moment;
- the material comes from real play, not loading, menu, autoplay, or results.

## Contrastive Examples

### Hyper-Casual Timing

Bad: the bird floats for five seconds while the player watches the score climb.

Good: at `T=0.8s`, the first tap changes vertical velocity; a pipe threat is visible; a late tap causes a near miss or collision the player can understand.

Why: the action is fast, embodied, consequential, and teaches timing.

### Strategy Class Pick

Bad: the player picks Rogue, Paladin, or Cleric, but the next screen and first combat are identical.

Good: the pick happens at `T=3s`; Rogue shows backstab route, Paladin shows shield lane, Cleric shows heal target; the first encounter immediately exposes that tradeoff.

Why: an interesting choice can be simple, but it must change the possibility space.

### Auto-Battler Setup

Bad: units fight automatically, deaths happen, and a score appears.

Good: the player buys a Guard, places it front row, sees enemy intent retarget, locks in, and combat proves the Guard absorbed the first hit.

Why: auto-combat is acceptable only after a readable player commitment.

### Results-Only Capture

Bad: `npm run qa:play:video` captures only a results modal and the handoff claims the game is coherent.

Good: the clip starts at first playable frame, shows the first meaningful act, immediate feedback, state consequence, later payoff, and result/restart.

Why: result screens cannot show that the player entered play.

## Handoff Shape

Use this section in the handoff:

```text
First Fun Judgment:
- Verdict: SLAPS | DOES NOT SLAP | BLOCKED
- Play moment: I <acted>; the game <answered>; <state changed>; next I wanted <...>.
- Would I play another 30 seconds?: <yes/no/blocked + why>
- First meaningful act:
- What the game does back:
- What changed that matters:
- Better next attempt the player can infer:
- Single biggest reason it does not slap yet:
- Timing notes only if they affect feel:
- Broken-surface checks only if they found a blocker:
- Fresh play material used for the judgment:
```

If the verdict is `DOES NOT SLAP` or `BLOCKED`, do not claim complete. Use
"candidate first playable", "does not slap yet", or "blocked on fresh first-fun
material" as appropriate.

## Routing Cases

- Baseline failure: without this skill, an agent can cite build, selector QA, sim diffs, and a results overlay while the first playable has no meaningful act in the first seconds.
- With-skill behavior: a new game handoff leads with the concrete play moment, whether a human would play another 30 seconds, the response, the consequence, the better next attempt, and the play material used for that judgment.
- Should trigger: "The game runs but I cannot tell what is going on."
- Should trigger: "Why is this not a game?"
- Should trigger: "Show me whether the first playable is actually fun enough to start."
- Should trigger: "It starts randomly and my characters just die."
- Should trigger: "Where is the first meaningful choice?"
- Should not trigger: "Design the whole game direction before implementation" because `game__directing` and `game__building-core-loop` come first.
- Should not trigger: "Make the HUD prettier" unless first-fun judgment or comprehension is the requested outcome.
- Collision boundary: for auto-battlers, use `game__genre--building-auto-battler-tactics` for the system; use this skill to judge whether the first commitment reaches the player quickly and reads in play material.
- Attention-drift case: if the agent is late in a long turn and only remembers one rule, it must remember this: `Would I play another 30 seconds?` must be yes, backed by action -> feedback -> consequence -> better next attempt.
