# Massive Single-World Fabric

Use this when the design assumes a truly massive world with no player-facing servers, realms, or shards. Hidden infrastructure may partition computation, but the player promise is one continuous world.

## Core Thesis

A single world does not automatically create society. Removing realms removes a natural boundary for repeated encounters, local reputation, market memory, rivalry, and identity. The design must replace those boundaries with **locality systems**.

Default instinct: **global access, local meaning, repeated contact.**

## Single-World Design Laws

| Law | Meaning | Failure if ignored |
|---|---|---|
| Scale destroys recognition unless localized. | More people means lower odds of seeing the same useful stranger again. | Planetary anonymity. |
| Locality is a design product. | Neighborhoods, routes, cohorts, schedules, leaders, guilds, squads, markets, professions, venues, and recurring objectives create social boundaries. | Everyone shares the world but nobody belongs anywhere. |
| Interest management is social design. | What players can see, hear, target, inspect, follow, and remember defines who feels present. | Invisible seams, lost friends, incoherent crowds. |
| Density needs attention funnels. | At high population, players need local objectives, leaders, stage zones, chat scopes, and contribution surfaces. | Zerg drift, chat noise, unreadable combat. |
| The fabric must preserve chosen association. | Party, squad, guild, leader, event cohort, and recent allies should stay together across density management. | The system separates people the player intentionally chose. |
| Global markets need identity or locality. | A fully global market can flatten crafters into price rows. | Market spreadsheet with no trust, reputation, place, or merchant identity. |
| Massive spectacle is rare oxygen, not default UX. | Thousand-player moments should be legible ceremonies, not everyday unreadability. | Performance collapse becomes the memory. |

## Locality Replacements for Realm Identity

| Realm function being lost | Replacement in a no-server world |
|---|---|
| Familiar faces | Recent ally memory, preferred stranger, local event cohorts, leader follow, neighborhood regulars. |
| Reputation | Guild/squad history, leader history, trade reputation, profession history, venue reputation, event-front reputation. |
| Local economy | Regional logistics, crafting commissions, local seller identity, market niches, delivery routes, scarcity geography. |
| Rivalry | Faction fronts, guild territories, recurring public objectives, seasonal leaderboards by region/front, named routes. |
| Culture | Language/time-zone cohorts, venue circuits, profession districts, public event calendars, guild alliances. |
| Home | Housing districts, guild halls, favored regions, recurring hubs, pilgrimage routes, skilling neighborhoods. |

## World Fabric Questions

### Presence

- Who does the player see by default in a dense area?
- Who is prioritized: party, squad, guild, followed leader, recent ally, profession service, same event cohort, same objective, same chat language, same faction, proximity?
- When density is high, does the game degrade gracefully by reducing noise or randomly hiding meaningful people?
- Can the player understand why a friend, leader, or objective is not visible?

### Rendezvous

- Can friends meet reliably without choosing a realm, layer, or instance manually?
- If hidden partitioning exists, what promises preserve parties, squads, guild events, leaders, and invites?
- Does the system keep a group together through travel, death, requeue, event phase changes, and crowd overflow?
- Are there explicit “join leader / join squad / join event cohort” actions?

### Local Identity

- What named places do players return to weekly?
- Where do regulars form?
- What area is small enough for reputation to matter but large enough to stay alive?
- What makes a player say “this is my route / market / venue / front / neighborhood / profession hub”?

### Massive Events

- Is the event readable at 20, 100, 500, 5,000 players?
- Does every participant have a local job, not just a global health bar?
- Can leaders manufacture sessions inside the event?
- What stops late arrivals from becoming spectators?
- How are rewards tied to contribution without turning into a courtroom?
- What memory persists: title, monument, route state, guild credit, leader record, changed world layer?

### Economy and Profession Locality

- Does global market access eliminate merchant identity?
- Do crafters have reputation, commissions, delivery, specialization, or relationship surfaces?
- Is there any reason to know a seller, crafter, courier, gatherer, scout, or market hub?
- Does geography matter without becoming dead travel?

## Density Design Patterns

### Layered Locality

```text
global world
→ region
→ neighborhood / route / profession hub / event front
→ cohort / party / squad / leader group
→ guild / institution
→ recent useful strangers
```

Surface the smallest relevant layer for action and the largest relevant layer for identity.

### Event Cohorts

When a world event attracts huge participation, create temporary cohorts that preserve leader or squad association, local objective assignment, reward context, local chat/callouts, post-event recognition, and replayable memory.

Bad: random overflow buckets.

Good: chosen, legible cohorts tied to objective, leader, party, guild, profession, or route.

### Profession Neighborhoods

A massive world needs visible production nodes:

- recurring crafters and gatherers;
- commission boards;
- resource routes;
- known market corners;
- service titles;
- bank-stage trade lanes;
- public work orders;
- route mastery markers.

The goal is not to trap players. The goal is to make repeated usefulness visible.

### Attention Budgets

| Surface | Prioritize |
|---|---|
| Avatars | Party, squad, target, threat, leader, recent ally, interactable player, local objective participant, profession service. |
| Chat | Party/squad/leader/event/local/trade-lane channels before global noise. |
| Nameplates | Relevant roles, leaders, recent allies, interactable vendors/crafters, current objective. |
| Effects | Mechanics, threats, healing/utility, leader marks, then cosmetic effects. |
| Inspections | Role/build/intent and profession/service history first; deep status second. |
| World markers | Local objective, regroup, safe path, leader call, route memory, market/service node. |

## Failure Modes

| Failure | Symptom | Fix direction |
|---|---|---|
| Planetary anonymity | Millions of players, no familiar strangers. | Repeated-contact surfaces, cohorts, region identity, leader follow, neighborhood regulars, profession loops. |
| Invisible seam betrayal | Friends/leaders appear to vanish or cannot meet. | Association-preserving fabric rules and explicit join actions. |
| Zerg spectacle collapse | Players see effects and bodies but no responsibility. | Local objectives, role lanes, contribution clarity, leaders, readable phases. |
| Mega-hub spam | One city becomes ads, macros, and AFK clutter. | Districts, bounded chat, ad economics, performance spaces, market identity, service routing. |
| Global-market flattening | Every seller is just the cheapest row. | Commissions, reputation, locality, delivery, specialization, seller history. |
| Static solved world | Massive terrain becomes optimized transit. | Preserve landmarks; rotate tactical/economic/social conditions. |
| Layer lottery | Players feel randomly sorted into worse copies of the world. | Make layers goal-, leader-, party-, and cohort-aware; explain transitions. |

## Design Rule

Never answer “where is the community?” with “everywhere.” In a massive single world, community forms where the design creates repeated usefulness under recognizable conditions.

## Dependency Locality in a Single World

A no-server world cannot rely on realm reputation to make player services matter. It must create repeatable dependency locality through the world fabric itself.

| Locality source | Design translation |
|---|---|
| Routes | Last-mile paths, guide roles, escort contracts, local danger, route callouts. |
| Camps | Named objectives, spawn cadence, claim/sharing signals, replacement paths, puller identity. |
| Service hubs | Buff/rez/porter/guide/crafting lanes, service history, repeat patron memory. |
| Markets | Seller identity, live commissions, local specialties, recurring stalls, barter lanes. |
| Recovery | Rescue boards, staging camps, recoverable loss, group re-form surfaces. |

Single-world rule:

```text
Scale supplies bodies; locality supplies memory; dependency supplies names.
```

## WoW Cross-Realm Translation for a No-Server World

WoW’s cross-realm and connected-realm systems were designed around a realm topology problem: low-population places and fragmented social pools. In a truly massive no-server world, the population problem changes form.

The single-world problem is not “can we find enough players?” It is:

```text
Can the world make any of these players familiar, useful, accountable, or locally meaningful again?
```

| WoW-era problem | Single-world version | Design response |
|---|---|---|
| Dead leveling zones | Dense but socially meaningless public traffic. | Region cohorts, repeated route overlap, local objective chains, first-assist memory. |
| Cross-realm strangers | Global strangers who may never repeat. | Recent allies, preferred strangers, leader follow, profession/service history, event cohorts. |
| Realm reputation loss | No natural bounded social memory. | Neighborhoods, fronts, guild/squad chapters, local markets, recurring schedules, route identity. |
| Queueable content from anywhere | Access without place. | Staging rituals, post-run continuity, purpose tags, and durable group escalation. |
| Connected-realm guild reach | Massive recruitment pool but weak locality. | Guild shell + squads + regional chapters + event crews + profession cells. |

Single-world WoW rule:

```text
Do not celebrate that everyone can play with everyone until the design explains how anyone becomes someone.
```

## WoW Social-Residue Check for Scale Systems

Before shipping a scale/convenience feature, list the social residue it might remove:

- repeated faces;
- known tanks/healers/leaders;
- route staging;
- city idling;
- profession service identity;
- guild/squad need;
- local market conversation;
- prestige clarity;
- faction/region belonging;
- failure repair opportunities.

Then ship the replacement memory surface in the same feature, not later.

## FFXIV Translation for a No-Server World

FFXIV’s Worlds/Data Centers created some community boundaries, but the lesson for a truly massive world is not to copy that topology. Translate the functions.

| FFXIV function | Massive single-world translation |
|---|---|
| Home World familiarity | Neighborhood, region, event front, profession hub, venue district, cohort. |
| Data Center culture | Language/time/activity cohort and purpose-tag filters. |
| Limsa/Ul'dah/Gridania social staging | Multiple regional stages with regulars, routes, services, and performance spaces. |
| Housing wards | Scalable neighborhoods with recurring presence and social memory, not scarce server plots. |
| Community Finder | In-client community/event/venue finder tied to world geography and schedules. |
| Cross-world linkshell | Cohort chat that can be attached to places, events, professions, and recurring groups. |
| Party Finder | Massive-world purpose board with locality, schedule, goal, and tone filters. |
| Roulettes | Global content health system with recent-ally and first-time memory. |
| Duty Support | Anti-churn story access that feeds back into optional human contact. |

### Single-world risk

A no-server world can accidentally produce the worst version of FFXIV data-center travel: everyone is technically reachable, but no one repeats.

Counter with:

```text
neighborhood identity
event cohorts
profession districts
venue calendars
squad/static registries
recent allies
local chat layers
region histories
public stages
```
