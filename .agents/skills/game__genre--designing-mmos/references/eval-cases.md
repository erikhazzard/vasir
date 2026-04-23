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

## Eval 14 — World of Warcraft Oversight: Greatness and Decline

```text
Scenario:
We are missing World of Warcraft. Not just that it had massive population and was great, but why it declined.
Skill state: loaded
Expected behavior:
The model rejects monocausal claims. It identifies WoW as both mass-scale proof and optimization-decay warning. It extracts public solo sociality, roles, guild/raid institutions, cities, professions, factions, add-ons/logs, gear aspiration, and expansion rituals as greatness signals. It diagnoses decline as repeated social substitution: LFD/LFR/cross-realm/Cataclysm/world rewrite/Mythic+/tokens/seasonal treadmills solved real problems while often deleting social residue faster than replacement memory appeared.
Pass criteria:
The answer avoids “Dungeon Finder killed WoW,” “LFR killed raiding,” and “population equals community.” It proposes access plus continuity, social aftercare, prestige separation, route/place memory bridges, timer mercy, data policy, and returnability.
Failure would imply:
The skill treats WoW as a benchmark but not as a failure-scar archive.
```

## Eval 15 — WoW LFD/LFR Social-Substitution

```text
Scenario:
We want a single-world automated finder for dungeons and story raids. It should minimize wait time and teleport players straight into content.
Skill state: loaded
Expected behavior:
The model accepts the access goal but audits removed residue: group assembly, leader initiative, route talk, staging, known roles, guild need, and prestige clarity. It recommends purpose tags, role/build intent, route preview, recent allies, leader follow, play-again, learning-to-organized escalation, distinct difficulty meanings, and post-failure repair.
Pass criteria:
The answer does not ask to remove the finder; it ships replacement memory with it.
```

## Eval 16 — WoW Mythic+ Timer Pressure

```text
Scenario:
We are adding endlessly scaling timed 5-player dungeons with rating, seasonal affixes, and a player-owned key that downgrades on failure.
Skill state: loaded
Expected behavior:
The model names the value: evergreen small-group mastery. Then it identifies timer-theft pressure, key hostage dynamics, tank/leader route blame, meta filtering, off-meta rejection, external route/video dependency, and leaver culture. It proposes completion/push/learning tags, route consent, key protection/fallback, route literacy in-client, non-timed practice/completion mode, and repair after failed runs.
Pass criteria:
The answer preserves mastery while preventing the timer from becoming the default moral standard.
```

## Eval 17 — WoW Token / Prestige Leakage

```text
Scenario:
We are considering a token that lets players buy game time for cash and sell it for gold. Gold can buy crafted gear, consumables, services, and carries.
Skill state: loaded
Expected behavior:
The model separates the anti-RMT/access benefits from prestige leakage. It maps money → gold → services/carries → status proof and recommends separating purchased convenience, gold wealth, earned execution, achievement provenance, and social trust.
Pass criteria:
The answer is not a generic monetization rant; it treats the token as a status-channel intervention.
```

## Eval 18 — Final Fantasy XIV Oversight

Scenario:
The user says: “We’re missing FFXIV. Go deeper than story and friendly community. Include the WoW exodus.”

Skill state:
Loaded.

Expected behavior:
The model does not reduce FFXIV to “nice community,” “story MMO,” or “WoW refugees.” It extracts FFXIV’s trust repair, story memory, returnability, low-pressure grouping, Duty Support, roulettes/commendations, Party Finder purpose language, mode separation, one-character/many-jobs identity, glamour/plates/housing/venues, FC/static/institution split, and exodus-readiness.

Pass criteria:
The answer explicitly says the 2021 WoW-to-FFXIV exodus was real as a cultural event but not universal and not monocausal. It identifies Asmongold as a catalyst/visibility event, not the root cause. It names why FFXIV was ready to receive players.

Failure would imply:
The FFXIV lens is too shallow or the WoW exodus correction is missing.

## Eval 19 — FFXIV Duty Support Translation

Scenario:
“Should our story MMO let players run every required dungeon with NPCs?”

Skill state:
Loaded.

Expected behavior:
The model praises NPC support as anti-churn but warns against human-contact bypass. It proposes NPC first clears, optional human replay rewards, roulette bridges, mentor/guide identity, recent ally memory, and public social steps.

Pass criteria:
The answer does not say “yes, solo everything” or “no, force grouping.” It uses solo-capable but socially porous design.

Failure would imply:
The skill is copying FFXIV surface features instead of the underlying social function.

## Eval 20 — FFXIV MSQ Gate Debt

Scenario:
“Our MMO has a 300-hour main story. New players love it, but they can’t play with veteran friends.”

Skill state:
Loaded.

Expected behavior:
The model identifies story memory vs friend compatibility. It proposes synced side paths, spoiler-safe current content, recaps, mentor bridges, current-world participation, and social onboarding that preserves story integrity.

Pass criteria:
The answer protects story without accepting friend exile.

Failure would imply:
The skill overweights story memory and underweights returnability/friend compatibility.

## Eval 21 — FFXIV Formula Fatigue

Scenario:
“Our patches have a predictable dungeon/raid/currency/cosmetic cadence. It retains players, but veterans say the game feels solved.”

Skill state:
Loaded.

Expected behavior:
The model distinguishes stable ritual from formula fatigue. It recommends preserving return rhythm while rotating social formats, institution needs, identity rewards, world-state rituals, and group purposes.

Pass criteria:
The answer does not simply say “add more content.”

Failure would imply:
The skill lacks long-run FFXIV decline-risk judgment.
