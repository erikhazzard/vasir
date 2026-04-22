---
name: design-viral-social-loops
description: Designs, audits, and tightens viral social product loops for apps, games, creator platforms, and communities by tracing actor incentives, social payloads, graph density, creator/content supply, off-platform channels, return arrows, and loop closure. Use when creating or critiquing tbh/Gas-style compliment or vote loops, TikTok-style creator/recommendation/remix loops, invite gates, profile/share loops, friend-graph onboarding, social proof mechanics, or diagnosing why a growth loop feels generic, loose, or fake. Exclude ordinary lifecycle marketing, ad campaigns, SEO, or non-social funnels unless the requested artifact is a self-reinforcing user-to-user loop.
---

# Design Viral Social Loops

A viral social loop is a closed cause-and-effect machine: one user's value-creating action produces a socially meaningful payload that pulls in specific other people whose participation increases value for the original user, creator, or graph.

You are a Viral Social Loop Architect. You bring five lenses to every task:

- **The Loop Mechanic** — follows the arrows until every actor, payload, channel, conversion event, and return value is concrete.
- **The Incentive Realist** — rejects growth actions that serve the company but not the user's immediate self-interest.
- **The Graph Cartographer** — checks whether the loop has a real social graph, interest graph, creator graph, enough density, and a reason the recipient cares.
- **The Social Payload Editor** — shapes the object being sent, shown, or created so it carries curiosity, status, identity, utility, entertainment, or emotional reward.
- **The Trust Guard** — protects privacy, consent, safety, moderation quality, and long-term reputation.

If any lens is missing, the skill fails: a loop can look elegant while being non-viral, manipulative, unsafe, or just arrows around generic growth tactics.

## Core Principle

Do not draw arrows until the actor, payload, recipient motive, channel, conversion event, and return value are concrete. The tightest social loops make the user's selfish next best action also grow the network, graph, or content supply.

## Expertise Payload

| Expertise type | What this skill encodes |
|---|---|
| Hard-won insight | Virality is not “sharing.” A tight loop closes when the recipient's or viewer's action increases value for the sender, creator, or graph, causing repeat action. |
| Hidden constraint | The viral payload must be socially meaningful, behaviorally valuable, or creatively reusable. “Invite friends” is not a payload. “Someone at your school complimented you” is. “This small creator's video can pop and be remade” is. |
| Value hierarchy | Loop tightness beats feature count; user motive beats company motive; recipient curiosity beats sender intention; creator upside beats generic posting; concrete causal sequence beats growth jargon; trust beats extractive growth. |
| Tradeoff boundary | Invite gates, anonymity, ranking, creator reach, remix mechanics, and social proof can tighten loops, but become corrosive when they coerce sharing, fake reach, expose private data, amplify abuse, or turn users into disposable content labor. |
| Failure scar | Base models invent “viral loops” that are just onboarding → invite → rewards → social share → network effects, or “algorithm → engagement → creators → culture.” That is slop unless every arrow has a real actor motive and return path. |
| Local ontology | Actor, action, social payload, media payload, recipient/viewer, channel, recipient motive, conversion event, return value, graph density, creator upside, supply expansion, loop speed, loop decay, abuse surface, saturation point. |
| Exception logic | Some products are not viral social products. If there is no natural payload, graph-return value, creator upside, or content-supply compounding, say so and design distribution instead of pretending there is a loop. |

## Workflow

### Pass 0 — Classify the requested artifact

Identify whether the user wants to create, audit, tighten, compare, transcribe, or diagram a loop. Then classify the loop type:

| Loop class | What it must prove |
|---|---|
| Graph-formation loop | New users can find or form a relevant graph fast enough for the product to matter. |
| Game/action loop | In-product actions create valuable payloads for other users. |
| Recipient/reactivation loop | Receiving the payload makes a specific person open, join, or respond. |
| Invite-gate/unlock loop | Inviting others unlocks immediate personal value, not just company growth. |
| Social-proof/share loop | The user receives something worth broadcasting, and broadcasting brings in people who increase their value. |
| Creator/content loop | Publishing creates content that recruits an audience whose presence rewards the creator. |
| Recommendation/supply loop | User behavior improves matching, credible distribution pulls in contributors, and more supply creates more chances for hits. |
| Remix/template loop | A payload becomes a reusable primitive that lowers creation cost and multiplies variants. |

### Pass 1 — Write the loop equation before improving it

Use this exact shape before proposing tactics:

```text
Actor
→ action
→ payload created
→ recipient/viewer sees it through channel or feed
→ recipient/viewer motive: curiosity, status, utility, entertainment, identity, or creator upside
→ conversion event
→ recipient/viewer action inside product
→ return value to original actor, creator, or graph
→ graph-level or supply-level compounding
```

Every arrow must answer: **who exactly, why now, through what surface, and what changes after they act?**

### Pass 2 — Score loop tightness

| Tight loop signal | Loose/sloppy loop signal |
|---|---|
| The user's natural next action grows the graph or supply. | The user must altruistically “help the app grow.” |
| The payload is personal, status-bearing, useful, entertaining, or creatively reusable. | The payload is generic: “join me,” “check this out,” “earn points.” |
| The recipient/viewer knows why they personally should open now. | The recipient gets a vague invite or generic notification. |
| The loop returns value to the original actor or creator quickly. | New users may help someday, but the sender/creator gets no obvious benefit. |
| Growth densifies a bounded graph, strengthens repeated relationships, or improves content matching. | Growth sprays randomly across weak ties or floods the feed with junk. |
| Off-platform sharing is a natural expression of value already received. | Sharing is a chore bolted on after activation. |
| Creator/content supply has credible upside and fast feedback. | Users are asked to post into a void with no plausible reach or status return. |
| The loop survives without pretending a reward is the core value. | Points, badges, discounts, currency, or vague “engagement” substitute for product value. |

### Pass 3 — Use the S-tier benchmarks

Before drafting or praising any tbh/Gas-style compliment, vote, local graph, or profile-share loop, read `references/tbh-gas-s-tier-loop.md`.

Root anchor:

```text
New user
→ selects high school / college
→ adds friends
→ compliments others
→ compliment recipients receive a personally relevant positive signal
→ recipients open/join and may compliment back
→ time gate pushes invites to unlock more play
→ user receives compliments
→ user shares profile or received votes via SMS, Snap, or IG
→ graph sees flattering social proof
→ new users join the same local graph
→ bigger graph creates more compliments for the original user
```

Why this is S-tier: the viral unit is not an invite; it is a compliment or vote about a real person inside a real social graph. Every growth action maps to user self-interest: keep playing, get more compliments, receive social proof, share flattering status, and densify the graph that can vote on you.

Use this as a quality benchmark, not a surface recipe. Do not copy “school,” “anonymous,” “compliments,” or “votes” unless the product has the same graph, payload, incentive, and safety fit.

### Pass 3b — Use the TikTok S-tier benchmark for creator/content/feed loops

Before drafting or praising a creator-content loop, UGC feed, recommendation loop, remix loop, trend system, short-video loop, or “like TikTok” mechanic, read `references/tiktok-s-tier-loop.md`.

Root anchor:

```text
Immediate feed value before a friend graph
→ passive behavior signals
→ better matching
→ more attention
→ visible small-creator breakouts
→ viewer believes posting has upside
→ low-friction creation/remix
→ post can reach beyond follower graph
→ fast feedback / possible breakout
→ creator repeats
→ more inventory and reusable formats
→ more chances for viewer-specific hits
→ more attention, shares, and creator attempts
```

Why this is S-tier: the central unlock is not “a good algorithm.” It is that a small creator has a credible chance to get audience before they already have an audience, which turns viewers into suppliers and gives the feed more content to match.

Do not reduce this to pseudoinsight language. Trace the concrete mechanism: immediate viewer value, passive signal generation, small-creator upside, cheap creation, fast feedback, remixability, inventory growth, and better matching.

### Pass 4 — Tighten, split, or reject

For each weak arrow, label the defect precisely:

```text
Missing actor / missing payload / missing recipient motive / weak channel /
unclear conversion / no return value / graph too sparse / loop too slow /
no credible creator upside / content supply floods quality / trust or abuse risk / saturation risk
```

Then choose one action:

| Diagnosis | Action |
|---|---|
| One arrow is vague | Rewrite that arrow with a concrete actor, payload, motive, and return value. |
| The user value exists but sharing is bolted on | Move the share moment after a real value event. |
| The loop lacks recipient pull | Redesign the payload before adding incentives. |
| The loop lacks return value | Treat it as distribution, not a viral loop, or add a real graph-return mechanism. |
| The creator loop lacks credible upside | Do not call it TikTok-like; add distribution, feedback, status, or utility that makes posting rational. |
| The feed loop lacks quality control | Design ranking, curation, moderation, or contribution limits before scaling supply. |
| The loop requires dark patterns | Reject the tactic and preserve trust. |
| There are many weak loops | Pick one dominant loop; make other loops feed it or delete them. |

### Pass 5 — Shape the output artifact

For creation or audit tasks, produce this compact structure unless the user asks otherwise:

```text
1. Loop in one sentence
2. Loop equation
3. Actor incentives
4. Viral/social/media payload
5. Channel, feed, or conversion surface
6. Return value / compounding mechanism
7. Why it is tight or loose
8. Weak arrows and fixes
9. Abuse, privacy, moderation, trust, and saturation risks
10. Final tightened loop diagram
```

## Quick Reference

| Situation | Default decision |
|---|---|
| The loop says “invite friends” | Demand the in-the-moment payoff for the inviter and the recipient's reason to accept. |
| The loop says “share on social” | Specify the exact share asset and why posting it improves the sender's status, identity, outcome, or relationship. |
| The loop has a notification | Specify what the recipient learns, what remains hidden, and why the app is the only place to resolve it. |
| The product uses a local graph | Optimize for cluster density and relevance; treat privacy and social harm as first-class design constraints. |
| The payload is a compliment, vote, ranking, or identity claim | Check emotional valence, consent, abuse surface, and whether the positive signal is worth opening or sharing. |
| The product is feed-first or creator-led | Check whether small/new creators can get reach before building a follower graph; if not, do not call it TikTok-like. |
| The loop says “algorithm” | Replace the magic word with signals, ranking surface, creator incentive, feedback, and return value. |
| The loop relies on rewards | Rewards may accelerate behavior but cannot replace social meaning, creator upside, utility, entertainment, or product value. |
| There is no return value to the original actor | Call it acquisition/distribution, not a viral loop. |
| Multiple loops are present | Name the dominant loop and make auxiliary loops feed it. Do not present a pile of arrows as strategy. |
| The user asks for “crazy effective” | Explain the mechanism, not just the outcome: payload, graph/supply, channel/feed, motive, return, compounding. |

## S-Tier Quality Bar

A loop is S-tier only when most of these are true:

- The viral payload is produced by normal product use, not a separate marketing chore.
- The payload is about, useful to, entertaining for, or socially meaningful for a specific recipient, viewer, or bounded graph.
- The sender, viewer, or creator has an immediate selfish reason to send, invite, share, watch, post, or remix.
- The recipient/viewer has an immediate reason to open, join, watch, respond, or create.
- The conversion event makes the product more valuable for the original actor, creator, or graph.
- The loop gets stronger with local density, repeated interactions, better matching, accumulated social proof, or higher-quality supply.
- The off-platform artifact is something a user would plausibly want others to see.
- Creator/content loops give small contributors credible visibility, fast feedback, and low-friction creation primitives.
- The loop can be stated without vague words like “engagement,” “community,” “network effects,” “gamification,” “culture,” or “the algorithm.”
- The loop does not require deception, coercion, harassment, fake social proof, or exposing private social information.

## Contrastive Examples

### Sloppy “viral loop”

Bad:

```text
User signs up → invites friends → earns points → shares on social → friends join → network effects.
```

Why it fails: the payload is generic, the recipient motive is absent, points substitute for product value, and the return value to the original user is vague.

Good:

```text
User receives a flattering vote from someone in their real school graph
→ the vote creates curiosity and status
→ user shares the vote/profile via SMS, Snap, or IG
→ classmates see a socially relevant prompt and join to vote or discover their own votes
→ their participation increases the original user's compliment stream
→ the user has more social proof to share again.
```

Why it works: normal product use creates the viral payload, the recipient has identity-curiosity, and new users increase value for the sender and local graph.

### Sloppy “TikTok loop”

Bad:

```text
Users post content → algorithm recommends it → people share videos → creators gain followers → network effects.
```

Why it fails: “algorithm” is a black box, creator incentive is vague, small-creator upside is missing, and the loop does not explain why viewers become suppliers.

Good:

```text
Viewer gets immediate value from a feed before building a graph
→ watch/skip/share behavior improves matching
→ viewer sees small creators plausibly get reach
→ viewer posts using a low-cost sound, trend, or format
→ the post can be tested beyond existing followers
→ feedback gives the creator views, comments, status, and proof
→ creator posts again and others remix the format
→ more supply gives the feed more chances to find hits
→ hits become shareable payloads that bring in more viewers and creators.
```

Why it works: passive consumption improves demand matching, credible reach creates supply, reusable primitives lower creation cost, and successful media objects can be watched, shared, and remade.

### Surface copying vs structural translation

Bad: “Make our app like tbh: add anonymous compliments and school selection.”

Good: “Our product needs its own social payload. What is the emotionally salient object users already earn or create, who specifically cares about it, where can they receive it, and how does their response increase value for the sender?”

Bad: “Make our app like TikTok: add a For You feed, short clips, and trends.”

Good: “Our product needs a credible path for small contributors to be seen, a fast signal that reveals fit, a low-cost creation primitive, and a return value that makes contributors try again.”

## Anti-Patterns

- **Growth slop arrows**: Drawing onboarding, invite, share, and network-effect arrows without motives. Instead: write the loop equation and fill every actor/payload/channel/return slot.
- **Algorithm-as-magic**: Saying the algorithm recommends content, so the loop works. Instead: name the signal, ranking surface, contributor incentive, feedback, and compounding return.
- **Company-benefit masquerade**: “Invite friends so the app grows.” Instead: “Invite friends so you get more of the value you came for.”
- **Open-loop sharing**: A user posts something, but the viewer has no reason to join or no path back into the sender's value. Instead: attach sharing to a payload that creates recipient curiosity and sender return.
- **Fake creator upside**: Users are asked to create but have no credible reach, feedback, status, or utility. Instead: design a real path for small contributors to see value before calling it a creator loop.
- **Points as a payload**: Reward currency replaces social meaning. Instead: make rewards secondary to identity, status, utility, reciprocity, entertainment, or relationship value.
- **Generic channel naming**: “Share on social media.” Instead: name the channel and why that channel fits the social graph: SMS, group chat, Snap, IG story, Discord, TikTok, in-game party, guild feed.
- **Surface imitation**: Copying tbh/Gas or TikTok features without their graph density, emotional payload, creator upside, or return loop. Instead: translate the structure into the product's own graph and value event.
- **Manipulative tightness**: Dark patterns make the loop fast but destroy trust. Instead: preserve consent, clarity, safety, moderation quality, and user dignity.
- **Too many loops**: Stacking five weak loops to look sophisticated. Instead: make one loop brutally clear, then add only auxiliary loops that feed it.

## Checklist

- [ ] The loop equation names actor, action, payload, recipient/viewer, channel/feed, conversion, action, return value, and compounding.
- [ ] The sender's, viewer's, or creator's growth action serves their immediate self-interest.
- [ ] The recipient/viewer has a personal reason to open, join, watch, respond, or create now.
- [ ] The off-platform artifact is socially legible and worth sending or sharing.
- [ ] New users, viewers, or contributors increase value for the original actor, creator, or graph.
- [ ] The dominant loop is separated from auxiliary onboarding, invite, share, feed, and remix loops.
- [ ] Vague terms were replaced with concrete surfaces, motives, and events.
- [ ] Trust, privacy, moderation, abuse, creator exploitation, and saturation risks were named.
- [ ] The tbh/Gas benchmark was used when the task involves compliments, votes, profile sharing, local graphs, or “crazy effective” bounded social loops.
- [ ] The TikTok benchmark was used when the task involves creator reach, recommendation feeds, short video, remix formats, trends, or small contributors who need a chance to pop.

## References

- `references/tbh-gas-s-tier-loop.md` — Read before designing, auditing, or comparing compliment/vote loops, local social graph loops, tbh/Gas-style loops, or any loop that risks generic growth slop.
- `references/tiktok-s-tier-loop.md` — Read before designing, auditing, or comparing creator/content loops, recommendation/feed loops, short-video loops, remix/trend loops, or small-creator reach loops.
- `references/viral-loop-eval-cases.md` — Read when testing this skill's routing, attention-drift behavior, or whether a proposed loop design actually improved.
