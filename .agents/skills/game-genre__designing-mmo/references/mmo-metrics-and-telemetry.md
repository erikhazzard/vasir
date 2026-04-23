# MMO Metrics and Telemetry

Use this when defining success, failure, dashboards, launch gates, or instrumentation. Metrics are proxies; every metric needs a counter-metric that catches the way it can lie.

## Core Measurement Principle

Measure the full chain:

```text
contact → usefulness → recognition → chosen obligation → repair → memory
```

Add the RSC primitive loop when relevant:

```text
place → profession/market/risk loop → repeated usefulness → reputation → memory
```

Throughput alone is not MMO health. Completion, concurrency, retention, and revenue can rise while recognition, repair, returnability, profession identity, and institutions decay.

## Metric Map

| Concept | Primary signals | Counter-signals / traps |
|---|---|---|
| Contact | Co-presence, local dwell, inspections, chat exposure, public-event proximity, repeated area overlap. | Dense crowds with low interaction; AFK clustering; global chat noise. |
| Usefulness | Revives, buffs, heals, trades, crafts, warnings, escorts, callouts, role fills, teaching, leader pings followed. | Parallel solo completion; assists only from reward farming; unthanked utility. |
| Recognition | Commends, follows, friend adds, preferred stranger marks, repeat grouping, leader follow, guild inquiry, seller repeat business. | High completion with low repeat contact; anonymous market transactions; no remembered names. |
| Chosen obligation | Role declarations, event signups, loot-policy consent, squad attendance, leader acceptance, prog/farm/story/speed tags, work orders. | Role-based kicks; “I never agreed” complaints; expectation discovered after failure. |
| Repair | Wipe-to-retry rate, requeue-after-failure, successful regroup, loot dispute resolution, leader reattempt rate, loss return. | Rage quits, silent disbands, support-role churn, post-failure avoidance. |
| Memory | Named-location callouts, recurring venue attendance, old route references, leader/guild/profession reputation, return to region, event anniversaries, title/item usage. | Content cleared but never discussed; places not named; leaders not followed; no rituals. |
| Profession identity | Public production, work orders, repeat customers, visible service history, route mastery. | Private XP spreadsheets, no seller/crafter recognition, pure auction abstraction. |
| Market ritual | Live offers, commissions, negotiated trades, seller history, local market dwell. | Spam, price-row anonymity, forced idling, global market flattening. |
| Risk gradient | Frontier staging, stake previews, scouts, named fight locations, return after loss. | Surprise loss, unclear boundary, one-sided farming, players never return. |

## Feature-Specific Metrics

### Dungeon / Finder / Group Execution

Completion + repeat-party rate; queue time + role mismatch; wipe count + retry rate; rewards/hour + commend/play-again; support-role participation + blame/leaver rate.

Interpretation rule: a finder is socially healthy when it moves players from strangers to preferred strangers at least some of the time.

### Guilds / Squads / Institutions

Guild membership + members grouped with each other; large roster + officer workload; recruitment volume + retention; event count + cancellation; role shortage + substitution success.

Interpretation rule: guild chat is not proof of playable institution health.

### Leaders

Leader follow rate + follower retention after failure; event wins + learner participation; command uptime + leader burnout.

Interpretation rule: leaders manufacture sessions; reward session quality, not only victory.

### Cities / Hubs / Bank-Stages

Dwell after service completion + AFK clutter; inspection rate + gatekeeping; local/trade chat density + noise; commission usage + seller recognition; district usage + spam dominance.

Interpretation rule: a hub is social when players notice, judge, perform for, need, trade with, or remember one another.

### Skilling / Professions / RSC-Style Locality

| Healthy signal | Counter-metric |
|---|---|
| Public production | Private spreadsheet skilling, no repeat customers, no visible experts. |
| Profession-route recurrence | Dead travel, bot-like repetition, route fatigue. |
| Commission usage | Pure auction abstraction, no seller identity, no negotiation memory. |
| Bank/hub social activity | Spam dominance, AFK clutter, forced idle, trade noise. |
| High-level return to low-tier routes | New-player displacement, resource griefing, prestige farming only. |

Interpretation rule: an RSC-style skill loop is healthy only when it creates visible useful identity, not when it merely slows progress.

### Public Events / World Bosses / Massive Objectives

Participation + local contribution diversity; completion + reward satisfaction; population density + readability/performance; return participation + named-location memory.

Interpretation rule: massive participation is useful only if players understand their local job and remember who helped.

### Economy / Crafting / Market

Transaction volume + seller recognition; low prices + crafter retention; crafting participation + repeat customers; liquidity + local commerce; market anomaly + prestige trust.

Interpretation rule: economies attack trust before prices; visible legitimacy matters.

### Risk Frontiers

Crossings + return after loss; kill/death volume + fight quality; scout usage + route callouts; trophy usage + named-location memory; reward value + loss resentment.

Interpretation rule: a frontier is healthy when players knowingly return after loss with a story or lesson.

### Progression / Returnability

Daily engagement + captivity sentiment; gear progression + friend compatibility; catch-up completion + time to play with friends; prestige participation + social exclusion.

Interpretation rule: a player who leaves for a patch should not return as an exile.

## Instrumentation Events

```text
player_seen_relevant
player_helped_player
help_acknowledged
commend_given
play_again_prompt_shown
play_again_accepted
repeat_group_formed
role_intent_declared
role_intent_mismatch
loot_policy_viewed
loot_policy_accepted
wipe_occurred
wipe_summary_viewed
retry_after_wipe
group_disband_after_failure
leader_followed
leader_group_rejoined
guild_invite_after_shared_activity
new_member_first_group
squad_event_created
squad_event_cancelled
returning_player_briefing_completed
returning_player_grouped_with_friend
event_cohort_created
event_cohort_rejoined
market_repeat_customer
commission_completed
profession_service_seen
profession_service_hired
resource_route_repeated
bank_stage_trade_started
live_offer_board_used
risk_threshold_crossed
risk_loss_recovered_from
legacy_item_created
legacy_item_traded
```

Names are examples; the important part is measuring transitions, not just endpoints.

## Metric Traps

| Metric looks good | But may mean |
|---|---|
| High concurrency | Crowded anonymity, spectacle without memory. |
| High completion | Content is transactional, over-carried, or socially sterile. |
| Fast queues | Role quality, learning, and repeat recognition were sacrificed. |
| High retention | Captivity loop, chores, fear of falling behind. |
| High guild membership | Empty shells, recruitment spam, no squad integration. |
| High market volume | Zero merchant identity, price-row anonymity, prestige erosion. |
| High skilling participation | Private grind with no profession memory. |
| High frontier kills | One-sided farming, unclear risk, players not returning. |
| High log/API usage | Base UI failure or elite gatekeeping. |

## Dashboard Rule

Every dashboard tile should pair one efficiency metric with one social-health counter-metric.

```text
Dungeon completion rate + repeat-party rate
Queue time + role-mismatch complaints
World-event participation + local-objective contribution diversity
Guild membership + first-week member grouping
Leader wins + follower return after failure
Market volume + repeat seller/customer relationships
Skilling XP/hour + visible profession-service use
Risk-frontier crossings + return after loss
Daily engagement + missed-patch return success
```

## Classic EverQuest Dependency Metrics

Use these when the design depends on player services, camps, public dungeons, recoverable danger, travel, or market identity.

| Concept | Signals | Counter-signals |
|---|---|---|
| Player-service identity | Service request fulfillment, repeat patrons, service-provider retention, service reputation, service-to-friend conversion. | Players bypass services with anonymous buttons; service scarcity blocks play; service providers burn out. |
| Recoverable danger | Rescue rate, retry rate, group re-form, route-risk learning, return after loss, rescue commendations. | Rage quit after death, long unrecovered loss, friend-level exile, risk avoidance, blame spikes. |
| Camp etiquette | Camp turnover quality, replacement queue success, train warning usage, local callouts, repeat encounters at named camps. | Camp disputes, kill stealing reports, train grief, sterile private instances, no named-place memory. |
| Public dungeon ecology | Puller/controller recognition, local chat, group formation in-zone, recovery from bad pulls, named-route callouts. | Anonymous zergs, unreadable chaos, no repeated strangers, support burden. |
| Travel memory | Route diversity, guide/porter usage, staging dwell, last-mile stories, escort success, local hub recurrence. | Instant-menu flattening, dead travel abandonment, port/service role collapse. |
| Merchant identity | Repeat customers, seller follow, commission fulfillment, live-market lane use, barter conversion, seller reputation. | Pure price-row shopping, no merchant recall, undercut-only competition, global market anonymity. |
| Luclin substitution risk | Convenience adoption plus preservation of seller/service/route recognition. | Time saved rises while merchant identity, player services, regional dwell, and repeat contact fall. |

Metric rule:

```text
If convenience improves throughput, verify that recognition did not fall.
```
