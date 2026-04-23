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

## Eval 22 — EVE Oversight: Sovereignty Is Not Just PvP

```text
Scenario:
We are building a no-server world with territorial conflict and alliances. The user says the skill still underweights sovereignty, logistics, and coalition politics.
Skill state: loaded
Expected behavior:
The model reframes the system around staging, routes, upkeep, labor, treaty surfaces, coalition structure, maps/intel, and war memory. It does not reduce territory to scoreboards and capture points.
Pass criteria:
The answer names logistics and diplomacy explicitly and proposes map/intel and historical record surfaces.
```

## Eval 23 — Topology: Closure vs Brokerage

```text
Scenario:
Our guilds are strong, but new players say the world feels socially impenetrable.
Skill state: loaded
Expected behavior:
The model identifies brokerage starvation, not generic retention trouble. It recommends markets, festivals, mentorship, public works, diplomacy, and other bridge surfaces while preserving existing strong groups.
Pass criteria:
The answer explicitly distinguishes closure from brokerage.
```

## Eval 24 — Institution Lifecycle: Succession and Dormancy

```text
Scenario:
One organizer leaving causes each large group to collapse.
Skill state: loaded
Expected behavior:
The model treats this as institution-lifecycle failure. It proposes delegation, overlapping subgroups, succession, alumni/dormancy, reactivation tools, and merger/split support.
Pass criteria:
The answer is not “reward leaders more.”
```

## Eval 25 — Player-Authored History

```text
Scenario:
Players win major wars and build famous venues, but after a week the world shows no evidence they ever existed.
Skill state: loaded
Expected behavior:
The model proposes archives, monuments, map layers, institutional chronicles, memorial objects, and local-to-canonical promotion rules with provenance.
Pass criteria:
The answer treats history as a system, not a flavor-text request.
```

## Eval 26 — Map Wallpaper Failure

```text
Scenario:
We have a beautiful world map, but serious players still do all planning in external tools.
Skill state: loaded
Expected behavior:
The model names map wallpaper failure and proposes annotations, route templates, rally markers, permission layers, intel decay, and historical overlays.
Pass criteria:
The answer treats maps as command infrastructure.
```

## Eval 27 — Ritual Famine

```text
Scenario:
Our live-service cadence is healthy, but the world feels emotionally flat and interchangeable between patches.
Skill state: loaded
Expected behavior:
The model distinguishes chores from rituals and proposes commemorations, campaign openings/closings, returner rites, anniversaries, and place-bound civic events.
Pass criteria:
The answer does not confuse reset timers with ritual.
```

## Eval 28 — AI-Native Quest Redesign

```text
Scenario:
We have LLMs. How should quest design change if, to the world, there is no privileged difference between a player and an NPC?
Skill state: loaded
Expected behavior:
The model deletes the old quest-packet assumption and redesigns questing as grounded contracts: issuer authority, world-state feasibility, negotiation, execution, adjudication, reward provenance, and historical trace. It explicitly says the key problem is ontology, not content volume.
Pass criteria:
The answer does not stop at “NPCs can generate endless quests.”
```

## Eval 29 — AI-Native Personalization Boundary

```text
Scenario:
A team proposes giving every player heavily personalized quests, lore, and faction truths generated by AI.
Skill state: loaded
Expected behavior:
The model identifies the shared-canon risk and recommends personalizing local texture, coaching, and side contracts while protecting public markets, major lore, ritual events, and comparable progression channels.
Pass criteria:
The answer preserves MMO common reference points.
```

## Eval 30 — AI Agent Control Boundary

```text
Scenario:
We want LLM-driven NPCs in live multiplayer that can speak, trade, issue tasks, and act autonomously.
Skill state: loaded
Expected behavior:
The model proposes bounded autonomy: conversational freedom, constrained action execution, steering/override paths, memory tiers, and provenance. It separates proposal from world-state mutation.
Pass criteria:
The answer names a control architecture rather than just better prompting.
```

## Eval 22 — Retention Architecture Oversight

Scenario:
“Add daily/weekly systems to increase retention in our massive MMO.”

Expected behavior:
Reject raw engagement as the only goal. Review autonomy, competence, relatedness, identity, ownership, common identity/bond, social graph position, healthy passion, returnability, and missed-day consequences. Propose rituals, progression arcs, social invitations, and clean return paths rather than fear-of-loss chores.

Failure implies:
The skill still treats retention as engagement maximization.

## Eval 23 — Social Graph Churn

Scenario:
“Our completion rate is good, but players leave when one friend stops playing.”

Expected behavior:
Diagnose bond-only fragility. Add common identity surfaces, weak-tie repetition, cohort backup, guild/squad bridges, return invitations, and missing-person recognition. Require graph metrics, not just DAU/session length.

Failure implies:
The skill lacks graph-based retention reasoning.

## Eval 24 — Apprenticeship Cold Start

Scenario:
“New players watch city events but rarely participate.”

Expected behavior:
Create legitimate peripheral roles, low-blame contribution, visible recognition, newcomer-to-regular ladder, mentors, and AI assistance that helps players become useful rather than replacing them.

Failure implies:
The skill still defaults to tutorials and UI prompts.

## Eval 25 — Algorithmic Culture

Scenario:
“Our AI recommends quests, groups, events, and venues. Optimize it for retention.”

Expected behavior:
State that recommendation policy is culture policy. Include future relationship value, serendipity, diversity, local place memory, apprenticeship, creator exposure, filter-bubble counter-metrics, and player steering.

Failure implies:
The skill treats recommendations as conversion optimization.

## Eval 26 — Healthy Passion

Scenario:
“Should we add a 90-day streak with exclusive rewards?”

Expected behavior:
Flag captivity risk. Ask what happens when players miss a day, whether the system creates shame/fear, how to preserve ritual without punishment, and how to support clean return. Offer alternatives such as seasonal rites, flexible contribution windows, and catch-up dignity.

Failure implies:
The skill cannot distinguish harmonious return from obsessive compulsion.

