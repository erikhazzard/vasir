# Example: Territory Bot AI Spec

This is a Paper.io-inspired example. It is a design pattern, not a claim about any shipped game's proprietary implementation.

## 1. Design Brief

- Game/Mode: 2D territory arena where bots leave safe territory, draw exposed trails, close loops, and capture area.
- AI Role: enemy bot.
- Target Experience: bot feels opportunistic, greedy, and beatable; it pressures the player without playing perfectly.
- Runtime Assumption: deterministic classical runtime; no runtime LLM.
- Key Assumption: arena can provide local spatial queries for territory, trails, heads, and boundaries.

## 2. Player Experience Contract

- Intended player read: “This bot wants to expand safely, but I can bait or cut it if it gets greedy.”
- Fairness rules: bot does not react instantly to unseen player movement; bot does not spawn into unavoidable cuts; bot sometimes misjudges risk by difficulty profile.
- Acceptable mistakes: overexpanding, abandoning a loop, choosing a safe but low-value capture.
- Unacceptable mistakes: self-colliding constantly, never initiating kills, perfectly tracking offscreen player intent.
- Reaction/perception model: perception updates at fixed intervals; easy bots have shorter perception radius and longer reaction delay.

## 3. AI Scope

- Agent AI: local movement, expansion, returning, hunting, evading.
- Director AI: bot population, spawn placement, pressure near player, aggression mix.
- Development/autoplay AI: scenario tests for overextension, baiting, and cut opportunities.

## 4. Game-Specific Primitives

| Primitive | Meaning | Query/Estimate | Used By |
|---|---|---|---|
| Safety | Ability to return to own territory before trail is cut | `time_to_home` | Return/Evade |
| Exposure | How vulnerable current trail is | trail length, loop depth, enemy proximity | Expand/Return |
| Progress | Value of closing current path | area estimate or loop width × depth | Expand |
| Threat | Enemy can cut own trail | `enemy_time_to_cut - own_time_to_home` | Return/Evade |
| Opportunity | Enemy trail can be cut safely | enemy trail length / distance to trail | Hunt |
| Commitment | Current loop plan and trail direction | trail state + current mode | Hysteresis |
| Exploit risk | Player baiting predictable mirror/chase | repeated heading/turn patterns | Anti-bait variation |

## 5. Knowledge Model & World Queries

- Sensors: nearby enemy heads/trails, own trail, own territory border, arena boundary.
- Memory: last hunt target, current loop intent, recent player bait pattern.
- Static world data: arena bounds, blocked cells/regions.
- Dynamic spatial data: territory ownership, trails, enemy positions.
- Required queries:
  - nearest own territory boundary
  - estimated time to home
  - nearest enemy time to own trail
  - estimated capture value for candidate closure
  - nearest exposed enemy trail
  - collision/self-collision risk
- Update/caching plan: threat and home distance every decision tick; capture estimate at lower frequency or for top candidates only.

## 6. Architecture Decision

- Recommended architecture: HFSM modes + utility action/path scoring + director for spawn/pressure.
- Why: major intents are discrete, but local movement is continuous risk/reward.
- Alternatives considered: pure BT would be clumsy for continuous danger/profit tradeoffs; GOAP/HTN overkill for short-horizon arena movement.
- Hard constraints: no self-collision, no unsafe overextension beyond profile margin, no unfair spawn.
- Soft decision model: utility scores for expand, return, hunt, camp-border, evade.
- Determinism/runtime notes: seeded randomness only among near-equal choices.

## 7. Agent Design Contract

### Agent: TerritoryBot

- Role: autonomous opponent.
- Goals: capture territory, survive, cut exposed trails, create player pressure.
- Actions: steer/turn, continue, return to territory, chase trail, abort loop, patrol border.
- Hard invariants:
  - never self-collide if a legal alternative exists;
  - force return if enemy cut time is below safety margin;
  - do not chase if chase makes own closure impossible within profile budget.
- Soft preferences:
  - prefer high area/risk expansion;
  - prefer short wide loops along border;
  - prefer hunting long exposed enemy trails;
  - prefer non-mirrored choices when utilities are close.
- Modes: InsideSafe, Expand, ReturnHome, Hunt, Evade, CampBorder.
- Tuning knobs: safety margin, max trail length, hunt threshold, greed weight, randomness, perception radius.
- Failure modes: never hunts, overexpands, camps too much, mirrors player, oscillates between hunt/return.

## 8. Director Design Contract

- Responsibilities: maintain bot count, place spawns fairly, tune aggression mix, prevent dogpiles.
- Inputs: player territory percentage, local bot density, player recent deaths/kills, open space, match time.
- Outputs: spawn bot, despawn offscreen bot, adjust profile mix, cap local attackers.
- Fairness constraints: no unavoidable spawn kills; no sudden dogpile after player failure.
- Tuning knobs: bot count, profile distribution, spawn radius, aggression escalation.

## 9. Decision Logic

```text
every bot_tick:
    context = perceive_arena(bot)

    own_close_time = estimate_time_to_home(bot, context)
    enemy_cut_time = estimate_nearest_enemy_time_to_cut_own_trail(bot, context)

    if outside_safety(bot) and enemy_cut_time < own_close_time + bot.safety_margin:
        mode = ReturnHome
    else if immediate_collision_or_pinching_risk(context):
        mode = Evade
    else:
        mode = utility_select_mode([Expand, ReturnHome, Hunt, CampBorder], context)

    candidates = generate_candidate_moves(mode, context)
    candidates = reject_hard_vetoes(candidates, context)

    if candidates.empty:
        selected = safest_fallback_move(context)
    else:
        selected = score_candidates(candidates, mode.weights, bot.profile)
        selected = apply_hysteresis_and_near_equal_randomness(selected)

    execute(selected)
    debug.record_decision(mode, candidates, selected, own_close_time, enemy_cut_time)
```

## 10. Difficulty & Personality Model

- Easy: shorter perception, longer reaction delay, high safety margin, weak hunt trigger, more bad estimates.
- Normal: moderate safety and opportunism.
- Hard: better threat prediction, lower reaction delay, stronger hunt selection.
- Nightmare: strong prediction and anti-bait variation, but still deterministic and fairness-bounded.

Personalities:

```text
Cautious: survival high, greed low.
Greedy: territory high, safety lower.
Aggressive: hunt high, border camping low.
Camper: border high, deep expansion low.
```

## 11. Testing, Debugging, and Telemetry

- Scenario tests: safe expansion, forced return, cut opportunity, bait loop, blocked route.
- Invariant tests: no self-collision when alternative exists; no spawn in unfair zone.
- Stress tests: many bots in shrinking arena.
- Exploit tests: player mirrors bot, camps border, repeatedly feints trail exposure.
- Golden replays: seeds for overextension and hunt opportunity.
- Debug overlays: threat field, home distance, trail danger, candidate scores, director pressure.
- Metrics: survival time, territory gained per loop, death cause, hunt attempts, forced returns, bait failures.

## 12. Implementation Notes

- Runtime budget: cheap local queries every tick; expensive capture estimates only for top candidates.
- Update frequencies: movement every frame/tick; decision every N ticks depending on game speed.
- Data structures: spatial hash or grid for heads/trails; cached territory boundary query.
- Integration concerns: trail capture logic should be authoritative and separate from bot estimates.

## 13. Final Audit

- Player experience explicit: yes.
- Primitives identified: yes.
- World queries specified: yes.
- Hard/soft split clear: yes.
- Architecture justified: yes.
- Director evaluated: yes.
- Difficulty/personality tunable: yes.
- Tests/debug included: yes.
- Assumptions labeled: yes.
