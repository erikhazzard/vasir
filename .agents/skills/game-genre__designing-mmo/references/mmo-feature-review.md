# MMO Feature Review

Use this for any concrete MMO system: dungeon finder, public event, guild, squad, loot, role declaration, progression, city hub, market, skilling, information policy, leader tool, housing/venue, world boss, PvP front, crafting commission, or economy feature.

## Review Template

| Field | Question | Expert default |
|---|---|---|
| Feature | What is being designed or changed? | Name the player-facing verb, not the internal component. |
| Primary product | Public solo, group execution, institution, world fabric, or profession/economy? | Pick one primary product, then review collateral damage to the others. |
| Primary behavior | What does this make easier, cheaper, more visible, more profitable, or more prestigious? | Players repeat what the system rewards and what peers can see. |
| Contact surface | Why do specific players notice each other? | Population density is not enough. |
| Usefulness surface | What can players do for each other? | Social design starts when another player becomes useful. |
| Recognition surface | How does the game remember useful contact? | Recent ally, commend, follow, preferred stranger, leader history, guild/squad invitation, market reputation, service history. |
| Chosen obligation | What expectation did the player knowingly accept? | Role, loot rule, leader authority, event goal, speed/story/prog/farm mode, squad schedule, work order. |
| Visible proof | What evidence can peers inspect or infer? | Evidence becomes enforcement material. |
| Likely norm | What will players treat as correct behavior? | The actual norm may differ from designer intent. |
| Likely violation | What will players treat as selfish, incompetent, rude, suspicious, or unserious? | The violation predicts toxicity, churn, and workaround culture. |
| Enforcement path | How will players punish the violation? | Kick, refuse invite, blacklist, undercut, unfollow, deny loot, abandon objective, public shame, guild demotion. |
| Blame target | Who gets blamed when it fails? | UI routes blame by what it explains and hides. |
| Repair path | How does the system make the next attempt better? | A good failure surface creates another attempt, not a courtroom. |
| Memory preserved | What survives the session? | Person, place, profession, market, route, guild/squad, title, item, event, joke, rivalry, venue, lesson. |
| Single-world locality | What creates bounded repetition without realms? | Neighborhoods, routes, cohorts, schedules, guilds, squads, professions, markets, leaders, venues, recurring objectives. |
| RSC translation | Is there a primitive loop that creates place, profession, market, risk, or item memory? | Translate banks, certs, skilling, wilderness, and scarcity into modern systems without copying obsolete tedium. |
| Scale failure | What breaks first at massive density? | Readability, contribution clarity, rewards, chat, leader authority, rendezvous, performance, place memory. |
| Institution support | What serious players otherwise leave the client to do? | Calendars, role needs, rosters, loot policy, logs, guides, leader tools, recruitment, market tools. |
| Signals | What proves it works? | Pair success metric with a counter-metric that catches social decay. |

## Minimal Review Output

```text
Feature:
Primary product:
Design intent:
Social conversion chain:
  Contact:
  Usefulness:
  Recognition:
  Chosen obligation:
  Repair:
  Memory:
Likely norm:
Likely violation:
Enforcement/blame path:
Repair design:
Single-world locality:
RSC translation, if relevant:
Institution impact:
Scale failure mode:
Signals and counter-signals:
Recommendation:
```

## High-Signal Questions

- What relationship did this convenience remove, and how do we replace the useful part without restoring the tedious part?
- Will players punish someone for using a build, route, playstyle, or loot claim the game appeared to endorse?
- Does the evidence after failure teach the next attempt or identify a defendant?
- Does this create a preferred-stranger layer or only complete transactions?
- Does the system make leaders more effective or merely more blameable?
- Does the system support the actual play unit, or only the identity shell?
- What must serious players leave the client to coordinate, verify, schedule, or learn?
- Does global access create local meaning or flatten everyone into infinite strangers?
- What is the RSC-style memory function: bank-stage, market ritual, profession route, risk edge, or scarcity myth?
- Which metric could look good while the MMO gets worse?

## Do-Not-Ship Gates

| Gate | Reason |
|---|---|
| Loot rules are unclear until after commitment. | Predictable moral conflict. |
| Role expectations are judged before role/build intent is declared. | Role coercion and resentment. |
| Failure evidence names offenders before teaching repair. | Scapegoating beats learning. |
| Matchmaking removes all repeat-contact surfaces. | Efficient disposable strangers. |
| Massive events have no contribution clarity. | Zerg anonymity and reward suspicion. |
| Global hubs have no attention economics. | Spam plaza or decorated menu. |
| Global markets have no seller/profession identity. | Price-row anonymity and merchant memory collapse. |
| Guilds lack squad/event/role tooling. | Institution outsourcing and officer burnout. |
| Required competence depends on unofficial tools. | Data sovereignty collapse. |
| Metrics only measure completion, retention, or concurrency. | Throughput hides social decay. |

## Classic EQ / Luclin Add-On

Use this add-on when a feature touches travel, trade, public dungeons, death, class services, grouping, or convenience.

| Field | Question |
|---|---|
| Player service created | Which players become useful as porters, guides, buffers, rezzers, pullers, controllers, scouts, crafters, rescuers, or merchants? |
| Player service obsolete | Which existing usefulness loop does this feature replace? |
| Replacement memory | If a loop is replaced, what preserves recognition, profession identity, place memory, or repeated contact? |
| Recoverable danger | Does failure create rescue/retry/gratitude or hostage pain/churn? |
| Camp/place memory | What named camp, route, market, or staging point will players remember? |
| Etiquette surface | What local norm will players invent, and can the UI make the good version easier? |
| Luclin risk | Is this Bazaar/Nexus-style convenience: useful, but socially destructive if shipped without replacement memory? |
