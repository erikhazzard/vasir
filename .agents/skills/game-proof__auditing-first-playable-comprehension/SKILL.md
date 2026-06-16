---
name: game-proof__auditing-first-playable-comprehension
description: Audits whether a Studio or Idavoll first playable reaches Time to First Meaningful Choice fast enough to count as play. Use after a runnable game exists and before claiming initialization, vertical-slice, publish-readiness, or final handoff, especially when the first seconds may be passive, confusing, auto-resolving, results-only, or unclear.
---

# First Fun Proof Gate

## Core Principle

The first playable is not proven by launching, rendering, or reaching a result screen. It is proven when fresh browser evidence shows the player reaches a **first meaningful choice or interaction** fast enough to enter play.

Use `TTFMC` as the hard proxy for Time to Fun:

```text
TTFMC = Time from first playable frame to first meaningful choice / interaction.
Target: <= 5s for all first playables.
Preferred: <= 2s for direct-control, arcade, hyper-casual, runner, timing, and most games by default.
```

This skill proves the earliest falsifiable substrate of fun: a player does something intentional, the game responds, state changes, and the player learns what to try next.

## Non-Negotiable Metrics

No timestamp, no PASS. A valid first-fun proof must report these values from a fresh artifact:

| Metric | Target | Strategy / tactics / setup target | Hard rule |
|---|---:|---:|---|
| Time to Agency | `<= 2s` | The first actionable surface is visually invited, not guessed. |
| Time to First Meaningful Choice / Interaction | `<= 2s` preferred, `<= 5s` max | `<= 5s` | Waiting, watching, reading, Start, Continue, and closing modals do not count. |
| Feedback latency | `<= 100ms`, target `<= 50ms` | `<= 100ms` for selection/preview feedback | The player sees that input landed immediately. |
| Consequence latency | `<= 1s` | `<= 3s`, or `<= 8s` only with clear preview/lock-in | Integrated state changes because of the choice. |
| First loop closure | `<= 10s` preferred, `<= 15s` max | `<= 15s` max | The player sees progress, danger, reward, failure pressure, or a changed tactical situation. |

If a genre genuinely needs slower setup, the spec must justify it and the artifact must prove anticipation, agency, and clarity during the delay. Otherwise slower setup is a FAIL, not a creative exception.

## Skill Spine

This skill compresses these game-design traditions into one audit:

| Tradition | What it contributes here |
|---|---|
| Raph Koster, pattern learning | Fun starts when the player begins learning an interactive pattern. |
| Sid Meier / interesting choices | A choice matters when options differ, trade off, and produce consequences. |
| Salen and Zimmerman / meaningful play | Action must create discernible and integrated outcomes. |
| MDA | Mechanics are only acceptable if the first seconds create the intended player experience. |
| Jesse Schell / lenses | Judge from the player's lived experience, not the feature list. |
| Tracy Fullerton / playcentric design | Validate the playable through observed play, not author declaration. |
| Valve-style playtest discipline | Use measurable player-experience goals because "fun" is too fuzzy to assert. |
| Nicole Lazzaro / keys to fun | Early interaction should create challenge, curiosity, excitement, mastery, or social/emotional response. |
| Steve Swink / game feel | Input response lives in milliseconds; dead feedback kills the loop. |
| Don Norman / affordances and signifiers | The first action must be invited by the surface, not discovered by accident. |
| First-session analytics practice | Track first core action, first reward/result, and repeat-loop intent, not only launch. |

Do not cite these traditions ceremonially in a handoff. Use them to make the verdict harder to fake.

## Trigger Boundary

Use this skill when:

- a Studio or Idavoll first playable has been implemented or materially changed;
- initialization, first playable, vertical slice, publish readiness, or final handoff is about to be claimed;
- the game might be passive, confusing, self-playing, over-automated, tutorial-dependent, results-only, or unclear in the first seconds;
- proof artifacts exist or can be freshly captured: screenshots, timeline, video, input trace, deterministic sim output, replay, or browser QA.

Do not use this skill for:

- pre-code ideation before a runnable artifact exists; use `game__directing` and `game__building-core-loop`;
- broad system design; use the relevant genre/system skill;
- platformer curriculum design; use `game-onboarding__designing-game-onboarding`;
- broad visual redesign; use `game__art-directing`, `design__designing-game-ui-for-idavoll`, or `ui__revamping-game-shell-ui`;
- final release certification after first-fun proof exists; use `handoff__final-quality-gate`.

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

## Expertise Payload

| Expertise type | What this skill encodes |
|---|---|
| Hard-won insight | Generated games often fail before the first system matters: they do not create a meaningful act in the first seconds. |
| Hidden constraint | A first playable can be machine-green and still have no first-fun substrate. |
| Value hierarchy | TTFMC and action-consequence proof beat launch proof, result proof, visual polish, and feature count. |
| Tradeoff boundary | Complex genres may start with a pick, placement, or build choice instead of direct movement; they still owe the player a fast meaningful commitment. |
| Failure scar | Results-only timelines let agents claim a game works after skipping the only part that matters: play. |
| Taste judgment | The first act should let the player predict, try, see consequence, and want another attempt. |

## Workflow

### Pass 0 - Extract The Intended First Fun

Read `README__game-spec.md` first. If it is missing and the task is not spec work, return `BLOCKED - missing README__game-spec.md`.

Extract:

- one-line promise;
- target platform/orientation;
- first frame visual contract;
- core verb;
- expected first meaningful choice / interaction;
- controls and input model;
- feedback and juice spec;
- scoring, failure, result, and restart rules;
- acceptance criteria.

Then classify the first-fun shape:

| Shape | What can satisfy TTFMC |
|---|---|
| Direct-control / hyper-casual | first tap, swipe, hold, drag, aim, release, dodge, jump, flap, slice, redirect, or timing act |
| Puzzle | first board move with visible board consequence |
| Strategy / RPG / deckbuilder | first pick, class, card, route, target, resource spend, or tactical commitment |
| Auto-battler / tactics | first draft, buy, placement, equipment, trait, lock-in, or target-preview commitment |
| Idle / management | first allocation, upgrade, priority, timing, or automation toggle that changes future output |
| Narrative | first story choice that visibly changes state, route, tone, risk, relationship, or next option |

If the expected act is not identifiable, return `FAIL - no defined first meaningful choice`.

### Pass 1 - Capture A Timestamped Evidence Packet

Use the closest available browser, QA, replay, screenshot, or timeline command. The proof must cover real player-facing time, not only internal sim output.

Capture or inspect timestamps for:

| Timestamp | Required observation |
|---|---|
| `T0` | first playable frame |
| `T_actionable` | first moment the available action/choice is visually invited |
| `T_input` | first real player input or choice |
| `T_feedback` | first visible response to input |
| `T_consequence` | first visible integrated state change |
| `T_payoff` | first progress, danger, reward, failure pressure, win/loss clue, or changed hypothesis |

Compute:

```text
Time to Agency = T_actionable - T0
TTFMC = T_input - T0
Feedback latency = T_feedback - T_input
Consequence latency = T_consequence - T_input
First loop closure = T_payoff - T0
```

If the only available artifact is loading, splash, modal, autoplay, forced fast-results, or results frames, return `FAIL - invalid proof artifact`.

### Browser Proof Harness

When a browser target is available and the project does not already provide a
better game-specific proof command, use the packaged harness to capture a
baseline artifact:

```bash
node <this-skill-dir>/scripts/inspect-game-canvas.mjs --url http://127.0.0.1:5173 --out artifacts/browser-proof --key KeyW
node <this-skill-dir>/scripts/inspect-game-canvas.mjs --url http://127.0.0.1:5173 --out artifacts/browser-proof --mobile --drag-selector "#touch-stick"
```

Use project-specific selectors, keys, or diagnostics when the defaults do not
match the game. The harness can prove canvas visibility, nonblank readback,
console/page errors, screenshots, basic input attempts, and diagnostics deltas.
It cannot prove first fun by itself. A valid PASS still needs the timestamped
TTFMC ledger below: first meaningful act, feedback, state consequence, learned
pattern, and next intent.

### Pass 2 - Fill The First Fun Ledger

Use this ledger. Do not replace it with prose.

```text
First Fun Ledger:
- T0 first playable frame: <timestamp + artifact path/frame>
- Time to Agency: <seconds> target <2s or 5s> verdict PASS/FAIL
- TTFMC: <seconds> target <2s or 5s> verdict PASS/FAIL
- First meaningful act: <exact player action or choice>
- Choice alternatives: <what else could the player plausibly do?>
- Immediate feedback: <visible response + latency>
- State consequence: <what integrated state changed + latency>
- First loop closure: <timestamp + progress/danger/reward/failure/chosen payoff>
- Learned pattern: <what the player can infer for the next attempt>
- Next intent: <why the player would keep playing or retry>
- Artifact validity: <fresh browser/mobile proof, not results-only>
```

Hard rule: if `Choice alternatives`, `State consequence`, or `Learned pattern` is empty, the first act is not meaningful.

### Pass 3 - Judge Choice Quality

Run these four tests:

| Test | Pass condition |
|---|---|
| Two-path test | A different plausible input, timing, target, placement, class, route, or pick would produce a different visible trajectory or result. |
| Discernible outcome test | The player can see what happened immediately after acting. |
| Integrated outcome test | The action changes real game state, not only animation or text. |
| One-more-try test | The first result suggests a better next attempt, not just "continue". |

For execution-heavy games, timing/aim/gesture quality can be the choice. For strategy-heavy games, the first commitment can be a discrete option. For auto-resolving games, the meaningful choice must happen before automation and automation must visibly prove the commitment.

### Pass 4 - Classify Failure And Repair Order

Use the first failing label:

| Failure | Symptom | Repair first |
|---|---|---|
| No TTFMC | More than 5s before a meaningful act, or no act exists. | Move the first choice/interaction into the first screen. |
| Passive start | Player mostly waits, watches, reads, or taps through. | Replace passive opener with a playable commitment. |
| Fake choice | Button/gesture exists but alternatives do not matter. | Add divergent consequence or execution skill. |
| Hidden affordance | Valid action is not invited. | Strengthen signifier, target, gesture affordance, and hit area. |
| Dead feedback | Input response is late, invisible, or outside the game surface. | Add immediate visual/motion/audio/haptic response. |
| Hidden consequence | State changes without readable cause. | Show delta, transition, source, target, and before/after. |
| Pattern vacuum | Player cannot infer what to try next. | Add near-miss, preview, result cause, or changed hypothesis. |
| Automation theft | Auto-combat/auto-run resolves before player commitment matters. | Expose draft/placement/setup choice and prove it in the outcome. |
| Asset meaning failure | Art, sprites, cards, units, or UI obscure identity/role/state. | Fix visual identity/layering before claiming first-fun proof. |

Repair order is strict: first meaningful act -> immediate feedback -> integrated consequence -> learned pattern -> result/restart -> juice/polish. Do not polish a passive start.

### Pass 5 - Verdict

Return exactly one verdict:

- `PASS`: fresh artifacts prove TTFMC within target, immediate feedback, integrated consequence, learned pattern, and next intent.
- `FAIL`: artifacts exist and show any hard failure.
- `BLOCKED`: artifacts are missing, stale, inaccessible, or subjective human acceptance is required for the claimed bar.

Do not turn BLOCKED into PASS because build, tests, selectors, sim diffs, or QA launch checks passed. Machine green is not first-fun green.

## Minimum Proof Gates

| Gate | Pass condition |
|---|---|
| Time to Agency | First actionable surface is visually invited within target; no guessing or passive opening. |
| TTFMC | `<= 5s` hard target; `<= 2s` preferred for direct-control and hyper-casual games. |
| First act | The first act is invited, intentional, and not merely wait/tap-through/continue. |
| Choice quality | At least two plausible options/timings/targets/gestures/picks exist, or execution timing/aim is the choice. |
| Feedback latency | First visible response within 100ms, target 50ms or one frame. |
| Consequence | Integrated state visibly changes because of the act within the genre latency budget. |
| First loop closure | By 10-15s, the player has seen progress, danger, reward, failure pressure, score meaning, or changed tactical situation. |
| Pattern learning | The player can state one next hypothesis after the act or first payoff. |
| Artifact validity | Fresh browser/mobile artifact shows the act and consequence; results-only proof is invalid. |

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

### Results-Only Proof

Bad: `npm run qa:play:video` captures only a results modal and the handoff claims the game is coherent.

Good: the artifact starts at first playable frame, shows the first meaningful act, immediate feedback, state consequence, later payoff, and result/restart.

Why: result screens cannot prove the player entered play.

## Handoff Shape

Use this section when the skill gates a turn:

```text
First Fun Proof:
- Verdict: PASS | FAIL | BLOCKED
- Time to Agency: <seconds>
- TTFMC: <seconds> target <2s or 5s>
- First meaningful act: <action/choice>
- Feedback latency: <ms>
- Consequence latency: <seconds>
- State consequence: <visible integrated change>
- First loop closure: <seconds + payoff/threat/result>
- Learned pattern / next intent: <one sentence>
- Fresh artifacts: <paths and timestamps/frames>
- Failed/blocked gate: <single highest-priority repair, or none>
```

If the verdict is `FAIL` or `BLOCKED`, do not claim complete. Use "candidate first playable", "machine green without first-fun proof", or "blocked on fresh first-fun artifact" as appropriate.

## Skill Eval Cases

- Baseline failure: without this skill, an agent can cite build, selector QA, sim diffs, and a results overlay while the first playable has no meaningful act in the first seconds.
- With-skill behavior: a new game handoff includes TTFMC, first meaningful act, feedback latency, state consequence, learned pattern, and fresh artifact paths before claiming complete.
- Should trigger: "The game runs but I cannot tell what is going on."
- Should trigger: "Why is this not a game?"
- Should trigger: "Prove the first playable is actually fun enough to start."
- Should trigger: "It starts randomly and my characters just die."
- Should trigger: "Where is the first meaningful choice?"
- Should not trigger: "Design the whole game direction before implementation" because `game__directing` and `game__building-core-loop` come first.
- Should not trigger: "Make the HUD prettier" unless first-fun proof or comprehension is the requested outcome.
- Collision boundary: for auto-battlers, use `game__genre--building-auto-battler-tactics` for the system; use this skill to prove the first commitment reaches the player quickly and reads in artifacts.
- Attention-drift case: if the agent is late in a long turn and only remembers one rule, it must remember this: `TTFMC <= 5s, first act meaningful, artifact shows action -> feedback -> consequence -> learned pattern`.
