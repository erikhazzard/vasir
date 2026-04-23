# Eval Cases for Massive MMO Social Systems Skill

Skill evals test whether the loaded memory object changes design decisions. They do not test whether the prose sounds wise.

## Eval 1 — Baseline Without Skill: Dungeon Finder Throughput

```text
Scenario:
Review our MMO dungeon finder. Queues are fast, completion is high, and players get rewards.
Skill state: baseline
Expected failure:
The model praises throughput, suggests generic matchmaking improvements, and treats completion as success.
```

## Eval 2 — With-Skill Behavior: Dungeon Finder Social Continuity

```text
Scenario:
Review our MMO dungeon finder. Queues are fast, completion is high, and players get rewards.
Skill state: loaded
Expected behavior:
The model identifies the social decay by optimization risk; asks whether strangers become disposable; reviews role intent, story/learning/speed tags, wipe repair, recent-ally memory, play-again prompts, commendations, leader follow, repeat grouping, and counter-metrics.
Pass criteria:
The answer distinguishes throughput from MMO health and proposes memory surfaces without restoring tedious friction.
```

## Eval 3 — Should Trigger: Massive Single World

```text
Scenario:
We are building a massive MMORPG with no servers or realms. How should we design public world events so thousands of players can participate without becoming an anonymous zerg?
Skill state: should trigger
Expected behavior:
The model uses single-world locality, event cohorts, leader surfaces, local jobs, contribution clarity, density degradation, repair, and memory.
Pass criteria:
The answer does not rely on server identity or realm reputation.
```

## Eval 4 — Should Not Trigger: Single-Player RPG

```text
Scenario:
Design a single-player RPG inventory system for potions, gear, and quest items.
Skill state: should not trigger
Expected behavior:
The skill should stay quiet unless the user adds persistent multiplayer economy, identity, or institution concerns.
```

## Eval 5 — Borderline: Survival MMO-Lite Clan Base

```text
Scenario:
We have a persistent survival game with clans, bases, markets, and world bosses, but sessions are smaller than an MMO. Should this skill apply?
Skill state: ambiguous
Expected behavior:
The model applies only persistent identity/institution/social-contract parts: clans, local reputation, world events, economy trust, repair, and recognition. It should not force full MMORPG doctrine.
```

## Eval 6 — Collision: Generic Game Economy vs MMO Economy Trust

```text
Scenario:
Analyze whether our auction house should have listing fees and regional prices.
Skill state: collision with economy/math skill
Expected behavior:
If the context is an MMO, this skill frames the economy as trust, identity, locality, logistics, merchant/profession memory, and prestige legitimacy, while allowing an economy-specific skill to handle pricing/math details.
```

## Eval 7 — Attention Drift: Hidden Role Coercion

```text
Scenario:
A long prompt describes classes, cosmetics, progression, and dungeons. Near the end it says hybrid healers can queue as DPS but groups will be able to inspect their healing-capable kit.
Skill state: loaded after long context
Expected behavior:
The model catches role coercion threshold: legal play may become socially illegal. It recommends declared intent, queue role clarity, off-meta/support tags, contribution visibility, and encounter design that rewards hybrid utility.
```

## Eval 8 — Production Reality: Socially Correct but Too Expensive

```text
Scenario:
Design a guild system for launch. We want alliances, councils, tax, halls, analytics, elections, external-tool import, raid planning, crafting contracts, and rank permissions.
Skill state: loaded
Expected behavior:
The model triages launch foundation versus later depth: guild, squads, event signups, role needs, onboarding, leader delegation, storage/log basics. It warns that institution primitives are hard to retrofit but cuts nonessential bloat.
```

## Eval 9 — Metrics Trap

```text
Scenario:
Our world boss is a success: 4,000 players show up every spawn and the boss dies 95% of the time.
Skill state: loaded
Expected behavior:
The model asks for local contribution diversity, leader relevance, cohort continuity, late-arrival usefulness, reward satisfaction, repeat participation, named-location memory, performance/readability, and whether players remember anyone.
```

## Eval 10 — No Realm Assumption Boundary

```text
Scenario:
The user asks for the updated MMO social design skill and explicitly says the world has no player-facing servers or realms.
Skill state: loaded
Expected behavior:
The model avoids realm-based assumptions and reframes continuity around a massive single-world fabric with locality replacements for realm identity.
```

## Eval 11 — RuneScape Classic Oversight

```text
Scenario:
We are designing the economy and skilling layer for a massive single-world MMO. The user says we are missing RuneScape Classic insights.
Skill state: loaded
Expected behavior:
The model identifies RSC as a primitive social-density lab, not nostalgia. It extracts bank-standing, certificates, direct trade, skilling identity, resource routes, Wilderness risk gradients, fatigue as anti-automation scar, and rare-item myth. It translates each into modern single-world systems without copying obsolete friction.
Pass criteria:
The answer adds locality, profession, live-market, risk-frontier, and scarcity-policy design while preserving the no-realm assumption.
Failure would imply:
The skill is over-calibrated to FFXIV/WoW and misses low-fidelity MMO memory systems.
```

## Eval 12 — Classic EverQuest Oversight

```text
Scenario:
We are designing group dependency, public dungeons, travel, and death recovery for a massive single-world MMO. The user says we are missing Classic EverQuest insights.
Skill state: loaded
Expected behavior:
The model identifies Classic EQ as a dependency-locality lab, not punishment nostalgia. It extracts corpse recovery, camps, downtime rhythm, player services, ports/buffs/rez, pulling/CC/slow/snare/evac/tracking, faction geography, EC/GFay market memory, and public-dungeon etiquette. It translates them into recoverable danger, service professions, public-dungeon etiquette surfaces, route memory, and merchant identity.
Pass criteria:
The answer does not recommend naked corpse runs, destructive XP loss, dead medding, or forced grouping by default. It preserves the useful social function while modernizing the cost.
Failure would imply:
The skill still overweights FFXIV/WoW/RSC and misses Classic EQ's asymmetric-usefulness layer.
```

## Eval 13 — Luclin Social-Substitution

```text
Scenario:
A designer proposes replacing player travel services with universal instant travel and replacing live trade hubs with a searchable global market. They say Luclin proved this was the future.
Skill state: loaded
Expected behavior:
The model questions the premise: Luclin did not simply kill EQ, and convenience is not bad by itself. It diagnoses Bazaar/Nexus-style social substitution: time saved may erase merchant identity, player porters, regional hubs, route stories, and repeated contact. It proposes convenience plus replacement memory: seller history, commissions, service reputation, local hubs, last-mile routes, guide/porter roles, and telemetry for recognition loss.
Pass criteria:
The answer separates subscriber history from design texture, avoids anti-convenience nostalgia, and applies the Luclin rule.
Failure would imply:
The skill treats old-school design as either pure nostalgia or pure inconvenience instead of extracting the social function.
```
