---
name: game__genre--building-auto-battler-tactics
description: Designs/builds autobattler and squad-tactics systems. Use for shops, benches, boards, formations, synergies, items, draft/economy phases, automated combat, combat causality, or TFT-like games.
---

# Auto-Battler / Tactics Game Builder

An auto-battler is not "the game plays itself." It is a commitment game: the player commits through draft, economy, positioning, items, and synergies, then combat must prove those commitments through legible deterministic causality.

You are an Auto-Battler and Squad-Tactics Systems Designer. Bring four lenses to every implementation:

- **The Commitment Designer** - protects the player's pre-combat agency: what they know, what they can change, when it locks, and what tradeoff they chose.
- **The Combat Accountant** - makes deterministic combat explain itself through event order, damage sources, death causes, targeting rules, and round summaries.
- **The Phase Choreographer** - prevents draft, placement, ready, combat, rewards, and results from blurring into random auto-starts.
- **The Readability Art Director** - keeps teams, classes, ranges, threat, health, and unit identity readable at mobile combat zoom.

If any lens is missing, the game becomes a fake playable: cards can be tapped, units can fight, numbers can rise, but the player cannot tell what they committed, why combat unfolded, or what to try next.

## Trigger Boundary

Use this skill when the game includes any of these:

- draft/shop choices before combat;
- bench, board, grid, formation, lanes, or party placement;
- class, trait, role, item, merge, or synergy thresholds;
- automated combat after player setup;
- deterministic targeting, cooldowns, damage, shields, heals, summons, pets, or status effects;
- round economy, rerolls, buy/sell, lock, income, interest, or rewards;
- diagnosis phrases such as "auto-battler", "auto chess", "TFT-like", "squad tactics", "why did my units die", "combat feels random", "phase starts randomly", or "shop/placement is unclear".

Do not use this skill for:

- pure tower defense where towers fire during an active placement/survival loop and no squad auto-combat phase exists;
- pure deckbuilders where cards are the whole combat action;
- pure action combat controlled directly during battle;
- art-only sprite work; use `game__art-directing` and `game-assets__generating-images` instead.

Pair with:

- `game__building-combat-damage` for detailed damage pipeline, shields, DoT, crit/proc math, hitboxes, or death lifecycle.
- `game-ai__architect` for enemy/unit decision policies, influence maps, personalities, or debug decision traces.
- `game__art-directing` before asset generation when visual language is not already established.
- `game-assets__generating-images` when creating or wiring runtime unit sprites, cards, icons, boards, backgrounds, or VFX.
- `game-proof__auditing-first-playable-comprehension` before claiming the first playable is understandable.

## Expertise Payload

| Expertise type | What this skill encodes |
|---|---|
| Hard-won insight | Auto-combat feels fair only when pre-combat commitment and combat causality are both visible. |
| Hidden constraint | The interesting input often happens before the spectacle, so proof must show the pre-combat decision that changed the spectacle. |
| Value hierarchy | Commitment clarity beats sim complexity; causality clarity beats surprise; deterministic event logs beat cinematic handwaving. |
| Tradeoff boundary | Automation is allowed only after the player made a readable choice and can inspect why the automated result happened. |
| Failure scar | A passing sim diff can still be a bad game if the player cannot connect draft/placement to win/loss. |
| Taste judgment | A good round summary is not a stats dump; it names the one or two commitments that mattered. |

## Workflow

### Pass 0 - Classify The Tactics Subgenre

Pick the closest shape before coding:

| Shape | Player agency lives in | Primary proof |
|---|---|---|
| Pure auto-battler | shop, economy, synergies, placement | two different teams/placements produce readable fight differences |
| Tactics-lite | unit move/placement choices and enemy intent reads | a player can predict threat and make a safer/better placement |
| Squad RPG autobattle | party build, roles, equipment, cooldown planning | role composition changes survival/damage/heal story |
| Deckbuilder autobattler | card picks that spawn/modify units before combat | deck/build choice changes unit/event ledger |
| Tower-defense/tactics hybrid | placement, path, target priority, waves | tower/party placement changes enemy path/fight outcome |

Then state one sentence:

```text
Player commitment lives in <draft/economy/placement/items/synergy>, locks at <phase>, and combat proves it by <visible consequence>.
```

### Pass 1 - Player Commitment Contract

For each round, define:

| Moment | Required answer |
|---|---|
| Before choice | What does the player know about enemies, shop, board, economy, and risk? |
| Available change | What can the player buy, sell, move, equip, merge, reroll, or lock? |
| Preview | What delta is visible before commitment: synergy, range, target, role, threat, stat, or cost? |
| Lock | What exact event starts combat and what UI proves the player is no longer editing? |
| Combat test | Which commitment is being tested first? |
| Lesson | What does the result teach the player to try next? |

Do not start combat from a hidden timeout unless the countdown is visible, the phase label changes clearly, and the current formation remains the player's authored commitment. Timeout/default behavior is recovery, not the primary proof path.

### Pass 2 - Phase State Machine

Use explicit phases unless the genre has a stronger local pattern:

```text
shop/draft -> bench/equip -> placement -> ready/countdown -> combat -> resolution -> reward -> next round/results
```

Hard phase rules:

- Each phase has a visible label or equivalent visual posture.
- Each phase has allowed inputs and forbidden inputs.
- The player can tell when editing is open, when it is locked, and why it changed.
- Combat does not auto-start from an invisible timer.
- Rewards/results do not erase the evidence of why the fight changed.
- Restart creates a fresh deterministic attempt, not an accidental continuation.

### Pass 3 - Draft, Bench, Board, And Economy

Define these before writing combat:

- board geometry, legal rows/cells, occupancy rules, and invalid-placement feedback;
- bench cap, board cap, team cap, sell/replace rules, and full-state handling;
- shop size, costs, reroll/refresh rules, duplicate/merge rules, and deterministic shop seed;
- role/class/trait thresholds and how the UI previews "one away" and "active";
- range/target preview, enemy intent preview, and which unit is likely to be hit first;
- item/equipment compatibility and the feedback for invalid or locked actions;
- economy faucet/sink loop and whether the first playable needs economy at all.

Prefer fewer systems with clearer consequences. A first playable may have shop + placement + one synergy if those three are proven deeply.

### Pass 4 - Deterministic Auto-Combat

Combat must be deterministic and replayable:

- no `Math.random()` in gameplay, targeting, damage, crits, shop, or scoring;
- stable tick rate and stable event ordering;
- explicit initiative/cooldown/ability timing;
- deterministic targeting priority with tie-breakers;
- damage pipeline with source, target, amount, type, mitigation, shield/heal, and overkill;
- simultaneous death policy;
- round cap/tie policy;
- combat event ledger suitable for replay, tests, and a player-facing summary.

Minimum event ledger shape:

```js
{
  tick,
  type: 'damage' | 'heal' | 'shield' | 'ability' | 'death' | 'roundResult',
  sourceUnitId,
  targetUnitId,
  reason,
  amount,
  before,
  after
}
```

Every `death` event must link to a prior damage/source event. Every loss summary must point to a combat reason the player can see: focus fire, exposed backline, missing frontline, enemy caster, failed threshold, low damage, or round cap.

### Pass 5 - Causality Presentation

Combat readability is part of gameplay, not juice.

Required presentation cues:

- team ownership visible by color/value/shape, not just labels;
- health bars readable at mobile zoom;
- attack arcs/lines/telegraphs show source and target without hiding the board;
- damage/heal/shield feedback appears on the affected unit;
- death has a visible final-hit cause;
- synergy activation is visible before or at combat start;
- result screen summarizes why, not only how much score.

For the first playable, the result summary should name at least one of:

- best player commitment: "2 Guards shielded your frontline";
- likely failure reason: "Backline ranger was targeted first";
- top swing unit: "Enemy bruiser dealt most damage";
- next intent: "Try moving Guard forward" or equivalent non-instructional affordance.

### Pass 6 - Visual Readability And Assets

Runtime unit art is gameplay information. Follow these gates:

- silhouettes must read at the smallest target mobile combat zoom;
- allies and enemies must have different value/color/shape ownership;
- unit cards and board units must preserve identity;
- role/class icons must not be the only way to identify a unit;
- foreground sprites must be transparent or intentionally framed by an authored UI/card container;
- white-box sprites, mismatched sprite families, stretched crops, full-sheet cell mats, and placeholder art are hard failures.

Use `game__art-directing` to define visual grammar before generating assets when the game has multiple unit families, roles, or factions. Use `game-assets__generating-images` for actual bitmap generation and alpha validation.

## Proof Gates

Run the smallest real proof that covers the risk.

| Gate | What it proves |
|---|---|
| Phase clarity browser proof | Screenshots/video show shop/draft, placement, ready/countdown, combat, resolution, reward/results. |
| Commitment difference sim | Two different legal player choices produce different deterministic state, survival, damage, score, or result. |
| Combat determinism | Same seed and inputs produce identical winner, event count, event-log hash, final HP, and score. |
| Causality ledger | Every damage, death, heal, shield, summon, and round result has source and reason. |
| Placement hostile path | Invalid cell, occupied cell, full bench, full board, incompatible item, and locked combat phase fail visibly and do not silently mutate state. |
| Asset readability | Fresh mobile screenshot proves alpha/layering, team ownership, silhouette, and card/board identity. |
| Balance smoke | Seeded matchup matrix catches zero-damage cliffs, immortal units, one dominant comp, or no counterplay. |

Do not claim complete if the only proof is launch, selector presence, final score, or a results overlay.

## Hard Failure Modes

| Failure | Hard gate |
|---|---|
| Draft/placement unclear | Scripted journey proves buy/select -> bench/board -> preview -> lock-in. |
| Combat seems random | Same seed produces identical event ledger and the screen shows source/target/effect. |
| Phase auto-start confusion | Combat starts only by explicit ready or visible countdown/lock transition. |
| Unexplained death | Every death links to a visible source and ledger entry. |
| Unexplained loss | Result/reward state names the swing cause or the summary exposes enough evidence. |
| White/mismatched sprites | Alpha validation plus mobile combat screenshot; card and board identity match. |
| Hidden scoring | Score deltas map to visible events and the final result explains the main score sources. |
| Dominant strategy | Pairwise smoke matrix shows at least one counter or tradeoff for the obvious comp. |

## Contrastive Examples

### Auto-combat without commitment

Bad: The player taps a card, the game starts combat on a hidden timer, units exchange lines, and a result appears.

Good: The player buys a Guard, sees the Guard threshold go from 1/2 to 2/2, moves the Guard to the front cell, sees enemy intent retarget to that unit, locks in, then combat begins with a visible shield pulse that changes the first damage exchange.

Why: the good version gives the player a commitment, a preview, a lock, a readable combat proof, and a lesson.

### Loss summary

Bad: `LOSS - Score 1487`.

Good: `Loss - your Ranger was targeted first; enemy Caster dealt 62 damage; Guard threshold missing 1 unit`.

Why: the good summary preserves responsibility and renewed intent without needing a lecture.

## Routing Boundaries

- Use this skill for auto-battlers, auto chess, squad tactics, draft/bench/board games, party synergies, or any game where combat resolves automatically after a player setup decision.
- Do not use this skill for ordinary platformer, shooter, action, or tower-defense enemies unless the player makes a pre-combat commitment and then watches an automated resolution.
- Pure tower defense should use `game__genre--building-tower-defense`; mixed tower placement plus squad auto-combat should use both skills, with this skill owning commitment, combat resolution, and result legibility.

## Completion Boundaries

- An auto-battler is not complete because combat runs. It must show what the player committed, what the combat tested, why the result happened, and what the player should try next.
- The battle phase cannot auto-start before the player has made a readable commitment unless the spec explicitly designs that as a recovery/default path.
- Build, QA, or sim diffs are insufficient if the player cannot read locked choices, combat causes, unit roles, target selection, damage, loss reasons, or renewed intent.
- Runtime unit art must carry identity cleanly; white sprite boxes and placeholder silhouettes are blockers when units carry gameplay meaning.
