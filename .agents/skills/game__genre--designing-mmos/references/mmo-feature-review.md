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

## World of Warcraft Social-Residue Add-On

Use this add-on when the feature resembles LFD, LFR, cross-realm/cross-cohort population, Cataclysm-like world rewrites, Mythic+-like timed mastery, token/boost economies, seasonal resets, or add-on/log policy.

| Field | Question |
|---|---|
| Access solved | What real exclusion, wait, population, or scheduling problem does this solve? |
| Residue removed | What names, routes, places, guild need, role reputation, leader initiative, weak tie, or prestige clarity disappears? |
| Replacement memory | What recent-ally, leader-follow, play-again, cohort, profession, route, or institution surface replaces it? |
| Meaning split | Does this create multiple versions of the same content with unclear social meaning? |
| Timer pressure | Does failure become time theft? Who absorbs blame? |
| Data policy | Does the base UI teach role-critical information, or do add-ons/logs become mandatory law? |
| Prestige leakage | Can money/gold/carries enter an earned-status channel? |
| Returnability | Does a missed week, patch, or season become social exile? |

WoW add-on rule:

```text
Do not analyze WoW decline monocausally. Analyze social substitution: real problem solved, social residue removed, replacement memory missing or present.
```

## Additional WoW Do-Not-Ship Gates

| Gate | Reason |
|---|---|
| Access tool has no social aftercare. | WoW-style disposable-stranger decay. |
| Difficulty modes blur access, learning, and prestige. | LFR-style meaning split and achievement distrust. |
| Timed content launches without expectation tags, route literacy, or completion mode. | Mythic+-style timer blame becomes default culture. |
| Monetized gold/boost path reaches prestige without provenance. | Token-to-prestige leakage. |
| World rewrite has no memory bridges. | Cataclysm-style modernization feels like erasure. |

## FFXIV Feature Review Add-On

Use this for story, onboarding, grouping, returnability, social expression, or player-run culture.

| Field | Question |
|---|---|
| Story memory | What shared reference or emotional chronology does this create? |
| Trust effect | Does this build or spend operator trust? |
| Returnability | Can a player leave and return to this system without shame or confusion? |
| Low-pressure contact | Does this create safe contact before obligation? |
| Purpose declaration | Are group expectations visible before commitment? |
| Mode separation | Is this access, learning, mastery, prestige, farm, or social? |
| Noncombat identity | Can a player be known here without combat performance? |
| Institution support | Does this support FCs/squads/statics/venues/cohorts inside the client? |
| Formula risk | Does this become a comforting ritual or solved checklist? |
| Exodus-readiness | Would skeptical players from another MMO understand and trust this in week one? |

## Sovereignty / Topology Add-On

Use this when a feature touches territory, routes, diplomacy, public maps, resource lines, staging, or large-scale faction politics.

| Field | Question |
|---|---|
| Sovereignty primitive | What exactly is being held: route, district, resource field, tax base, logistics hub, memorial place, symbolic capital? |
| Maintenance burden | What labor, supply, time, or attention is required to keep it? |
| Coalition surface | What multi-group relationships exist besides “same faction”? |
| Geography leverage | Which chokepoint, frontier, staging area, corridor, or hinterland matters? |
| Intel surface | What map, scout, annotation, or alert layer makes the political reality legible? |
| Historical residue | What public record or place memory survives conflict here? |

## Institution Lifecycle Add-On

Use this when the feature affects guilds, squads, councils, venues, or any durable group.

| Field | Question |
|---|---|
| Lifecycle stage helped | Founding, growth, maturity, strain, dormancy, reactivation, or merger? |
| Leadership concentration | Does this reduce or worsen one-person failure? |
| Subgroup overlap | Does this create bridges across cliques or harden them? |
| Succession path | What happens if current leaders leave? |
| Dormancy memory | What survives a quiet period? |
| Merger/split support | Can the institution evolve structurally without disappearing? |

## Authored History / Ritual Add-On

Use this when the feature involves events, campaigns, festivals, public storytelling, or lasting consequences.

| Field | Question |
|---|---|
| Trace left behind | What visible evidence remains after the event? |
| Promotion ladder | Is the trace ephemeral, local, institutional, public, or canonical? |
| Ritual function | Does this initiate, commemorate, return, celebrate, or close a campaign? |
| Place tie | Which location becomes more meaningful because of the event? |
| Provenance | Who authored or validated the memory? |

## AI-Native Add-On

Use this when LLMs, agentic NPCs, procedural questing, personalization, or generative live content is involved.

| Field | Question |
|---|---|
| Old assumption being replaced | What pre-LLM design assumption is no longer valid? |
| AI role | Is the model drafting, simulating, conversing, routing, adjudicating, or executing? |
| Grounding boundary | What authoritative state constrains the output? |
| Provenance | Who authored or approved this generated content or contract? |
| Public canon impact | Does this affect shared reality or only local/personal texture? |
| Human usefulness effect | Does AI increase social density or erase reasons players matter to each other? |
| Failure mode | What happens when the model is wrong, stale, contradictory, or strategically manipulated? |

## Additional Do-Not-Ship Gates

| Gate | Reason |
|---|---|
| Territorial feature has no logistics, map, or coalition layer. | Sovereignty theater. |
| Institution feature ignores succession or dormancy. | Long-lived groups remain fragile by design. |
| Major public event leaves no trace or ritual meaning. | Retention event without culture. |
| Map/intel feature cannot be shared or annotated. | Off-client command infrastructure becomes mandatory. |
| AI system can promise or grant state changes without world-law validation. | World-state hallucination. |
| AI questing creates obligations with no provenance, authority, or reward conservation. | Infinite slop and trust collapse. |
| Personalization changes public truth. | MMO comparability and shared memory break. |
