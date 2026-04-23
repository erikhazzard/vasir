# MMO Production Reality

Use this when converting MMO social doctrine into something shippable. A socially correct system can still be wrong if it is too expensive, brittle at scale, uninstrumented, or impossible to operate.

## Production Review Pipeline

```text
social value
→ implementation cost
→ content/UX burden
→ data/instrumentation requirement
→ live-ops burden
→ scale failure mode
→ rollout gate
→ fallback / rollback path
```

Do not recommend a feature at production level without naming what must exist for it to work.

## Scope Triage

| System idea | Launch foundation | Later depth |
|---|---|---|
| Recent ally / recognition | Track recent useful contacts, commend/play-again, leader follow. | Preferred strangers, reputation clusters, social graph suggestions. |
| Guild/squad institution | Guild, squads, event signups, role needs, onboarding. | Cross-squad rituals, analytics, advanced permissions, alliance tools. |
| Role clarity | Role/build intent before queue/event commitment. | Off-meta contribution models, mentor/prog/farm templates. |
| Failure repair | Group-pattern wipe summary, retry/regroup support. | Replay tools, opt-in deep logs, coaching surfaces. |
| Returnability | Patch briefing, catch-up path, friend-sync. | Personalized return goals, guild reactivation, old-system compression. |
| World locality | Neighborhoods, region identity, recurring public routes, leader surfaces. | Dynamic event fronts, local market niches, regional festivals. |
| RSC profession locality | Public work orders, visible service history, bank-stage commissions. | Advanced logistics, profession neighborhoods, route mastery economies. |
| Information policy | Base UI for role-critical facts, basic logs, clear automation boundary. | APIs, advanced analysis, official build/route tools. |
| Economy trust | Seller identity, commission basics, anomaly telemetry. | Regional logistics, market reputation, advanced crafting institutions. |

Default: ship the minimum institution, recognition, and profession primitives early. They are hard to retrofit after the culture forms around external tools or pure price-row markets.

## World-Fabric Production Questions

### Density and readability

- What population bands has the feature been designed for: 5, 20, 100, 500, 5,000?
- What is still readable at each band?
- Which effects, nameplates, markers, chat channels, objectives, and trade offers degrade first?
- Does degradation preserve party/squad/leader/recent-ally/profession relevance?

### Continuity promises

- Can a party, squad, guild event, leader group, market cohort, or public event cohort stay together across travel, death, high-density areas, and phase changes?
- What does the player see when the world fabric cannot satisfy that promise?
- Are there clear “join leader / join squad / join cohort / join market lane” actions?

### Data and storage

- Which histories must persist: recent allies, leader follows, loot-policy consent, squad attendance, seller reputation, service history, commission completion, event cohort membership?
- What expires, and why?
- What needs exact auditability versus approximate recommendation?
- What data is required before design can diagnose the feature?

## Launch Gates

| Gate | Reason |
|---|---|
| Global name/identity policy is settled. | Names are symbolic land; identity ambiguity becomes permanent resentment. |
| Guild/squad creation and discovery are robust. | Institutions form immediately; weak tools push serious groups off-client. |
| First hub has attention economics. | Launch density can teach spam, AFK clutter, or social staging. |
| First profession loops are visible. | Skilling culture forms early; private spreadsheets are hard to make social later. |
| First dungeon/public group teaches roles and repair. | New players learn MMO etiquette from the first failure. |
| First public event has contribution clarity. | Early zerg confusion teaches that public play is anonymous. |
| Economy telemetry is live. | Trust damage is visible before prices fully reveal it. |
| Legacy/rare-item policy exists. | Accidental scarcity becomes permanent myth and wealth distortion. |
| Returnability path exists from day one. | The first missed week/patch defines whether the game feels trustworthy. |
| World-fabric rendezvous is tested under load. | Friends who cannot meet stop trusting the world promise. |

## Cost-Risk Matrix

| Risk | Cheap before launch | Expensive after launch |
|---|---|---|
| Disposable matchmaking | Add memory surfaces and tags. | Rebuild culture after strangers are already consumables. |
| Guild outsourcing | Add squads/events/role needs. | Pull entrenched external workflows back into client. |
| Role coercion | Make intent legible. | Repair years of expectations around “wrong” legal builds. |
| Poor failure repair | Add group-pattern summaries and retry support. | Reverse wipe culture that learned blame first. |
| No locality | Create neighborhoods/routes/fronts/profession hubs/leader networks. | Make an already-global anonymous world feel local. |
| Pure auction abstraction | Add seller identity, commissions, and live market rituals. | Re-teach players that merchants/crafters are people. |
| Data policy vacuum | Decide base UI/log/API boundaries. | Fight mandatory unofficial tools after the meta hardens. |
| Captivity loops | Build catch-up and friend-sync. | Re-earn trust after players learn missed time equals exile. |

## Rollout Patterns

### Soft Launch a Social Primitive

```text
1. Instrument current behavior.
2. Add low-risk recognition surface.
3. Watch conversion, spam/noise, and opt-out behavior.
4. Add stronger institution/profession hooks only where repeated use appears.
5. Avoid global reputation scores until the underlying behavior is stable.
```

### Ship a Group-Execution Feature

```text
1. Declare mode: story / learning / prog / farm / speed / blind.
2. Declare roles/build intent before commitment.
3. Show loot or reward expectations before commitment.
4. Provide group-pattern failure explanation.
5. Provide retry/regroup path.
6. Surface play-again/commend/recent ally after success or good-faith failure.
```

### Ship a Massive Public Event

```text
1. Define local jobs and objective lanes.
2. Define leader and cohort surfaces.
3. Define contribution clarity without prosecution.
4. Define density degradation rules.
5. Define late-arrival usefulness.
6. Define what world memory persists after the event.
7. Instrument cohort retention and repeat participation.
```

### Ship an RSC-Inspired Profession/Market Loop

```text
1. Define the remembered place: bank-stage, market lane, profession hub, route, frontier edge.
2. Define the useful human role: crafter, courier, merchant, scout, gatherer, host.
3. Define the convenience baseline so the system is not pure pain.
4. Add optional live ritual: commission, negotiation, route contract, bulk order, escort.
5. Add service history and seller/profession identity.
6. Instrument repeat customers, route recurrence, and honest-player friction.
```

## Production Anti-Patterns

| Anti-pattern | Production failure |
|---|---|
| “We can add social tools later.” | Culture will form around external tools first. |
| “The world is huge, so players will make their own localities.” | They may, but often in ways the client cannot see, support, or measure. |
| “RSC friction made community, so copy it.” | Nostalgia friction copies pain without guaranteeing memory. |
| “We will tune with telemetry.” | Telemetry that only measures endpoints cannot diagnose social decay. |
| “This is just UI.” | UI decides what evidence exists, what norms form, and who gets blamed. |
| “The event scales automatically.” | Technical scaling is not social scaling; players still need local jobs and memory. |
| “The economy will self-correct.” | Trust can collapse before price equilibrium matters. |

## Classic EQ / Luclin Production Checks

Classic EQ-inspired systems are expensive when they depend on live recovery, contested space, or player services. Ship the smallest version that preserves usefulness without recreating punishment.

| System | Production check |
|---|---|
| Player services | Needs request routing, reputation, compensation, spam limits, and fallback when no provider exists. |
| Public camps | Needs spawn cadence, claim/sharing UI, dispute telemetry, train/recovery rules, and clear contested/cooperative labeling. |
| Death recovery | Needs bounded loss, recovery timer, rescue path, support edge cases, and clear rollback/fallback for stuck states. |
| Travel services | Needs route graph, last-mile design, load-aware staging hubs, service discovery, and non-blocking fallback. |
| Market identity | Needs seller history, commission fulfillment, fraud/economy telemetry, local market load handling, and anti-spam surfaces. |
| Luclin-like convenience | Needs a replacement-memory plan before launch: what service, hub, route, merchant, or camp identity is being preserved? |

Launch gate:

```text
Do not ship a convenience replacement for an emergent player-usefulness loop until telemetry exists to detect recognition loss.
```

## World of Warcraft Social-Substitution Production Checks

WoW-style modernization features are tempting because they solve obvious production and population problems. The production risk is that they remove social residue while the dashboard shows wins.

| Feature | Production win | Hidden social cost | Required launch companion |
|---|---|---|---|
| Automated group finder | Queue time, content usage, role fill. | Disposable strangers, no leader identity, no route conversation, cheap leaving. | Purpose tags, role/build intent, recent allies, play-again, leader follow, post-failure retry. |
| Raid finder / story-mode raid | More players see content. | Guild need and prestige meaning weaken. | Difficulty framing, learning-to-organized pathway, distinct reward/provenance, recurring raid communities. |
| Cross-cohort population smoothing | Areas feel populated. | Players feel like phantoms to each other. | Cohorts, region memory, repeated-contact surfacing, local event fronts, known leader/profession surfaces. |
| World rewrite | New-player flow, content modernization. | Veteran memory deletion. | Legacy monuments, history layers, route-name preservation, veteran callbacks, return tours. |
| Timed repeatable dungeons | Evergreen small-group content. | Meta filtering, role blame, leaver culture. | Completion/push/learning modes, route preview, key protection/fallback, failure replay, role-burden telemetry. |
| Token / paid gold exchange | RMT reduction, subscription flexibility, revenue. | Prestige-channel contamination. | Earned-status provenance, carry-market telemetry, non-transferable prestige, clear money/gold/skill separation. |
| Seasonal reset / borrowed power | Recurring engagement. | Captivity, missed-time exile, identity amnesia. | Friend-sync catch-up, preserved history, reentry path, season ritual framing, optional compression. |
| Add-on/log openness | Expert mastery and community tools. | Mandatory external competence, prosecution culture. | Base UI role-critical clarity, opt-in deep logs, repair-oriented summaries, automation boundaries. |

Production rule:

```text
If the prototype saves time by deleting a social step, the launch checklist must include the replacement memory surface.
```

## WoW-Style Launch Gates

| Gate | Reason |
|---|---|
| Finder has purpose tags before rewards are tuned. | Incentives will harden speed norms immediately. |
| Role/build intent is visible before commitment. | Legal play becomes socially illegal after the first failure. |
| Recent ally and play-again exist before automated grouping scales. | Disposable-stranger culture forms quickly. |
| Difficulty modes have distinct meaning and provenance. | Access and prestige blur if rewards/history are unclear. |
| Timed content has a non-push path. | The timer becomes the default moral standard. |
| Token/boost design has prestige-channel analysis. | Money leaks into status through indirect routes. |
| Add-on/log policy is decided before high-end content ships. | External tools become default law. |
| World rewrites ship with memory bridges. | Players treat modernization as erasure. |
| Seasonal resets preserve identity and friend compatibility. | Returnability damage compounds across seasons. |

## Rollout Pattern: Convenience With Replacement Memory

```text
1. Name the old friction being removed.
2. Name the social residue it carried: names, routes, leaders, guild need, market identity, prestige clarity, role reputation, weak ties.
3. Ship the convenience only with an explicit replacement surface.
4. Instrument both throughput and residue.
5. Hold rollout if throughput rises while recognition, repeat contact, or institution conversion falls.
```

## FFXIV Production Addendum

FFXIV-style systems are expensive because they are not just features; they are trust infrastructure.

| System | Production cost to respect |
|---|---|
| Story spine | Writing, localization, cinematics, VO, quest tooling, recap tooling, spoiler control, patch continuity. |
| Duty Support | Encounter scripting, NPC behavior, duty redesign, maintenance whenever mechanics change. |
| Roulettes | Reward economy, role balance, old-content tuning, anti-speedrun pressure, telemetry. |
| Purpose-tagged group board | Taxonomy, filters, templates, moderation of misleading tags, UX clarity. |
| Social expression | Art pipeline, UI customization, storage, rendering, profile visibility choices, public-surface review costs. |
| Housing/venues | World capacity, instancing/neighborhood policy, event discovery, permissions, visitor routing, screenshots/archives. |
| Returnability | Patch summaries, catch-up economy, UI guidance, reentry quests, friend-sync content. |
| Exodus-readiness | Capacity headroom, queue policy, communication templates, trial controls, onboarding surge support. |

### Hard-to-retrofit primitives

- first-time status and veteran reward logic;
- recent ally memory;
- purpose-tag schema;
- recap system;
- event/venue calendar;
- group mode taxonomy;
- identity profile framework;
- returner dashboard;
- telemetry for friend-compatibility and social conversion.

### Rollout gates

Do not ship FFXIV-like systems without answering:

```text
What is the social function?
What old friction/social contact does this remove?
What replaces the memory?
What telemetry proves it?
What is the fallback if it creates thin anonymity?
```
