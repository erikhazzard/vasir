# tbh/Gas S-Tier Viral Social Loop Reference

Use this as the benchmark for compliment, vote, anonymous-positive, profile-share, bounded-local-graph, and off-platform-status loops.

This is not a surface recipe. It is a quality bar for:

```text
bounded graph
→ fun-to-produce payload
→ recipient receives a competitively-framed positive signal under gendered anonymity
→ received artifact is screenshot-ready and carries source attribution
→ recipient shares off-platform under infinite plausible deniability
→ viewers read the status signal and want their own
→ new users join the same graph
→ original user's future picks increase
```

## The real insight

tbh/Gas did not succeed because users exchanged compliments. It succeeded because the **received-compliment card** — a screenshot-ready image showing that a specific gender and grade had picked you over three named alternatives — was a multi-vector status artifact that users wanted to post on Snap.

**Every action in the game was tight and led to increasing the social loop**

Around 50% of user acquisition came from that screenshot shared off-platform. The team did not design the share behavior. Users discovered it. The team then amplified it with watermarks, screenshot detection, and in-product share buttons.

The killer mechanic was not:

```text
receive compliment → share compliment
```

It was:

```text
get picked by someone in your real graph, over three named competitors, under gendered anonymity
→ "a boy in 10th grade picked me, and here are the three others he didn't pick"
→ post on Snap under cover of "who sent this?"
→ viewers read: this person was selected, romantically/socially, over specific named peers
→ infinite plausible deniability for the poster
→ watermark pulls viewers to the app
→ graph densifies
→ more picks for the original user
```

## The shipped app flow (ground truth)

### Onboarding
Select high school or college. Add friends. Enter a bounded, identity-relevant graph.
The high school picker is extremely important here - it is the first screen during onboarding, and when you see your highschool name at the top of a list, you immediately are bought in. This is because it's the community you care most about and are part of. This works for colleges too, but not as effectively. The social network is most dense for highschools (everyone has everyone else in their contact book).

### Game loop — sending compliments
The user is presented with a compliment prompt (e.g. "Could win any staring contest") and four candidate friends from their graph. They pick one. Then another round. Then another.

Picking a candidate person fun on its own, like a Cosmo-style quiz. There is no expected reciprocity. It is a single player experience. The social-judgment micro-game — picking one person over three others for a specific trait — is the motive. This matters because send-rate does not depend on the sender expecting anything back.

After some number of rounds, a **time gate** appears. "New Polls in 18:46" with a "Skip the wait → Invite a friend" button.

### Time gate as invite currency
The time gate is a mobile social game mechanic with the currency swapped. In mobile games, the timer is paid off with gems. Here, it is paid off with invites. The ask lands at peak desire — the user just finished a round of picking and wants another. The cheapest thing to spend at that moment is a friend name, not cash.

The invite sheet shows `INVITATIONS LEFT 10/10`, a deliberately scarce counter. The scarcity is fake. It works anyway, because constrained quantity makes each invite feel like a chosen commitment rather than a free broadcast.

### Receive loop — the screenshottable card
When someone picks you, you get a notification. Tapping it opens a card showing:

- The compliment prompt ("Could win any staring contest")
- The sender framed as "a boy in 10th grade" or "a girl in 10th grade"
- Four candidate names, one of them yours, with a hand pointing at you
- Your three named, visible, not-picked peers
- The app URL watermark: `tbh/gasapp.co`
- Snap and Instagram buttons right on the card: "Reply on..."
- A locked upsell: "See who sent it" 

This card is the viral unit. Every element is load-bearing.

### Amplification — screenshot detection and share sheet
When the user takes a screenshot of the received-compliment view, the app detects it and pops a native share sheet: Instagram, Snapchat, Messages. This collapses the share flow from "take screenshot → close app → open Snap → choose story → upload" into two taps.

The screenshot-detection-to-share-sheet was retrofitted after the team realized users were already screenshotting and sharing. The initial two weeks of explosive growth happened without this amplification — users were doing it manually.

### Return arrow
Shared screenshot → watermark + compliment signal reach new viewers on Snap → new users join same school graph → more people voting on compliments → original user gets picked more → more screenshottable cards → more shares.

## The mechanisms — what actually made it work

### 1. The received-compliment card is a multi-vector status artifact in one image

In a single screenshot, the recipient broadcasts:

- **What was said about them** — the specific compliment prompt
- **Who said it** — gendered and grade-contextualized (small anonymized universe)
- **Who they were selected against** — three named peers, visible
- **The visual proof of selection** — the pointing hand

Every axis is a status vector. One screenshot carries four. That information density is why the artifact worked on Snap where a post has about half a second to register.

### 2. The signal is competitive, not just positive

Most "compliment app" explanations stop at "you got validated." The real mechanism is that you got validated **over three specific named peers**. The losers are visible. This is structurally different from a generic "someone complimented you" notification.

When this card is posted on Snap, the audience read is not "this person got picked." It is "this person was selected over [named classmate], [named classmate], [named classmate] for [specific trait] by the opposite gender." That is a much denser social claim. And because the social graph is so dense, everyone tends to know everyone else's name, so the social context is highly relevant for every invdividual.

### 3. Gendered anonymity creates crush mystery

"A gril in 10th grade" is the right amount of hidden. Not fully anonymous (could be anyone) and not fully identified (no flex cover). It creates a specific, narrow, narratively loaded mystery: who in the ~50 tenth-grade girls in my school picked me?

The recipient's internal monologue is not _just_ "someone likes me." It is "was it my crush?" That specific hook is why the opens happened and why the shares carried charge.

### 4. Compliment sending is fun, not reciprocal

Senders are not keeping score. Picking one of four named friends for "could win any staring contest" is a small social-judgment game that is enjoyable in itself, like a magazine quiz. This decouples send-rate from any expectation that the sender will get picked back.

This is a structural win. In reciprocity-driven systems, send-rate collapses when users don't feel they're getting return value. In fun-driven systems, send-rate holds as long as the activity stays fun.

### 5. Infinite plausible deniability

The poster on Snap can truthfully say "who sent this?" while communicating "I was picked by the opposite gender over three named peers for a flattering trait." The audience reads the status claim cleanly. The poster never has to say it. This is status laundering at maximum efficiency.

The deniability is called *infinite* because the cover story never breaks down. Even if someone asks directly, "nice flex," the poster can say "no I really just want to know who it was." The game is unfalsifiable.

### 6. The time gate is inspired by mobile games with currency swapped to invites

Mobile games had been using time-gate-plus-gems since Hay Day. The gate lands when the user wants more. The currency to skip is paid in whatever denomination the user has most readily available — usually cash.

Swapping the currency to *invites* does two things:

- The user pays the cost of their own next session in graph growth, not altruism
- The ask lands at the moment of peak desire, so the invite converts at a much higher rate than an untimed "invite your friends" prompt would

This is a portable mechanic. Any product with a genuine at-peak-desire moment and a credible next-session value prop can consider paying the gate in social currency.

### 7. Artificial invite scarcity amplifies conversion

`INVITATIONS LEFT 10/10` is a fake limit. It works because quantity-constrained decisions feel more real than unlimited broadcasts. The user sees a budget and treats each invite as a considered commitment.

Unlimited invite UI trains users that invites are cheap and spammy. Scarce invite UI trains them that each invite is a vote.

### 8. Screenshot detection → share sheet collapses friction

Manual share flow: take screenshot, close app, open Snap, choose story, add screenshot, post. Six steps. Many users drop.

Detected share flow: take screenshot, tap Instagram or Snapchat in the popup. Two steps. Almost no one drops.

The screenshot event itself is the signal of intent. The app reads that signal and removes the friction. This is worth calling out because it requires the team to treat the screenshot as a first-class product action, not a leak.

### 9. In-product share buttons make off-platform share a primary action

The received-compliment card has Snapchat and Instagram buttons on it, labeled "Reply on..." The user is not routed to share as a secondary afterthought. The product is literally offering off-platform share as one of the first things you can do with this artifact.

This also reduces the cringe of posting. The app is telling you to. You're just doing what the app suggested.

### 10. Watermark as URL, not just logo

The `gasapp.co` watermark on the shared card is not decoration. It is attribution and call-to-action in one string. A logo tells the viewer what app this is. A URL tells the viewer where to go.

The watermark was retrofitted into tbh after the team realized shares were happening without it. Virality increased after the watermark was added. Shares without attribution close the status loop for the poster but break the growth loop for the product.

### 11. Locked "See who sent it" fuels the share as resolution strategy

You cannot resolve "who picked me" in the app without paying. So the share becomes part of your mystery-solving strategy. Posting "who sent this?" on Snap is not just a flex — it is a genuine attempt to get someone to reveal themselves or drop a hint.

The cover story ("who sent this?") becomes literally true when the product refuses to resolve the mystery for free. That tightens the deniability further.

### 12. The growth mechanism was discovered, not designed

The team did not ship tbh with the screenshot-share flow in mind. They noticed it happening in the first two weeks and then amplified it. The watermark came later. The screenshot-detection share sheet came later. The in-product Snap/IG buttons came later.

This is the most important meta-lesson. The best viral mechanisms usually emerge from user behavior, not designer intent. The design job is to watch for emergent share behavior, then remove every gram of friction around it.

## The social-cover ledger

| Field | tbh/Gas implementation |
|---|---|
| Private payoff | "Everyone sees I was picked by the opposite gender over three named peers for a flattering trait." |
| Public cover story | "Who sent this?" (and this is literally true — the in-app resolution is paywalled) |
| Audience read | "This specific person was chosen, romantically or socially, over [named classmate] × 3." |
| Recipient cover | "I'm just opening to see who picked me" or "to pick people myself" |
| Conversion path | Tap watermark URL → App Store → open app → select school → add friends → pick compliments |
| Return value | More graph density → more picks → more screenshottable cards → more shares |

## Loop anatomy

| Component | tbh/Gas implementation | Why it matters |
|---|---|---|
| Bounded graph | School selection + friend adding | The "a boy in 10th grade" framing is only charged when the candidate pool is socially real |
| Viral unit | The received-compliment card, not the compliment | The artifact is what gets shared; the compliment itself never leaves the app |
| Sender motive | Picking between four named friends is fun like a quiz | Not reciprocity — send-rate is self-sustaining through play value |
| Recipient motive | Crush mystery + competitive flex + resolve paywalled mystery | Three different hooks stacked on one notification |
| Broadcaster motive | Infinite plausible deniability on a multi-vector status signal | The poster can flex without admitting they are flexing |
| Cover layer | Gendered anonymity + paywalled sender reveal | The "who sent this?" question is literally unanswerable without payment, making the cover story true |
| Payload density | One screenshot = compliment + gender + grade + named losers + proof-of-pick | Dense enough to read at Snap-story speed |
| Channel | Snap stories and private group chats primarily; also SMS | Where teens perform identity and share with inner circles |
| Attribution | gasapp.co URL watermark | Closes the growth loop back to the product |
| Friction removal | Screenshot detection + native share sheet | Two taps to post instead of six |
| Scarcity | 10/10 invite counter; locked sender reveal | Constraint creates commitment and mystery |
| Time gate | Hay Day timer, currency swapped to invites | Invite ask lands at peak desire |
| Return arrow | More school graph density → more picks per user → more screenshots | New users directly increase existing users' future validation supply |

## Transferable lessons

### Lesson 1 — Make the viral artifact carry more than one status vector

A single compliment is one vector. A single pick is one vector. tbh/Gas bundled four vectors (what, who, against whom, proof) into one image. Ask: what is the densest status artifact your product can produce in one screenshot?

### Lesson 2 — Competitive-visible framing beats generic positive framing

"Someone liked you" is weak. "Someone picked you over [named] and [named] and [named]" is strong. Ask: can your positive signal be framed as a selection against named alternatives?

### Lesson 3 — Gendered or role-scoped anonymity is sharper than pure anonymity

Pure anonymity is diffuse. "A boy in 10th grade" is narrow enough to generate specific fantasy. Ask: what is the smallest meaningful anonymous unit you can use — role, team, grade, department, cohort?

### Lesson 4 — If sending is not fun on its own, the loop is fragile

tbh/Gas did not depend on reciprocity because picking was fun. Ask: is your send action intrinsically enjoyable, or does it require an expected return to motivate?

### Lesson 5 — The cover story should be literally true, not performed

"Who sent this?" worked as cover because the app did not resolve it for free. Ask: can you design the cover story to be unfalsifiable — genuinely something the user can't resolve without engaging others?

### Lesson 6 — Replace time-gate currency with the resource that generates the moat

Hay Day gates paid off in cash. tbh/Gas gates paid off in invites. The gate should take whatever currency creates the most durable value for the product. Ask: what currency, paid at peak desire, would grow your moat faster than cash?

### Lesson 7 — Fake scarcity on invites increases conversion

10/10 is arbitrary. It works because constrained budgets feel like decisions. Ask: is your invite UI unlimited, or does it impose a quantity constraint that signals each invite is a considered act?

### Lesson 8 — Treat screenshots as a first-class product action

Screenshot events are intent signals. Detect them and remove friction to the share. Ask: does your product treat screenshots as leaks to prevent, or as conversion opportunities to amplify?

### Lesson 9 — Off-platform share buttons belong on the value artifact itself

The received-compliment card had Snap and IG buttons inline. The share was a primary affordance, not a menu-hidden secondary. Ask: is share on the viewing surface of your most-valued artifact, or buried in a profile or settings menu?

### Lesson 10 — The watermark must be a URL, not a logo

Attribution without a destination closes the status loop but breaks the growth loop. Ask: does the thing users screenshot contain a URL or store link, or just branding?

### Lesson 11 — Emergent share behavior should be amplified, not prevented

tbh did not ship with screenshot-share in mind. Users discovered it. The team amplified it. Ask: are you watching for emergent sharing in the first weeks after launch, and is your roadmap flexible enough to chase it?

### Lesson 12 — Paywall the mystery, not the base experience

"See who sent it" as a paid unlock created curiosity tension and made the cover story true. Ask: what piece of information, if paywalled, would both monetize and drive more organic share?

## Structural translation template

When adapting the pattern, replace each tbh/Gas component with a product-native equivalent.

| tbh/Gas part | Translation question |
|---|---|
| Received-compliment card | What screenshot-ready artifact does normal use produce, and how many status vectors can it carry in one image? |
| Three named losers | How do you frame the positive signal as a selection over visible, named alternatives? |
| "A boy in 10th grade" | What role- or cohort-scoped anonymity creates narrative charge without fully identifying the sender? |
| The school graph | What bounded graph makes the signal feel socially real: team, guild, league, workplace, neighborhood, fandom? |
| Cosmo-quiz sending | What is your equivalent of a self-sustaining, intrinsically fun send action that does not require reciprocity? |
| "Who sent this?" cover | What is the literally-true cover story your users can post under without having to admit to the real motive? |
| Time gate with invites | What peak-desire moment in your product could convert to an invite-priced time gate? |
| 10/10 invite counter | What quantity constraint could you put on invites to frame each one as a considered decision? |
| Screenshot detection → share sheet | Are you detecting screenshot events and routing them directly into a share flow? |
| In-product Snap/IG buttons | Is off-platform share on the artifact itself, or buried elsewhere in the product? |
| gasapp.co watermark | Does your shared artifact carry a URL the viewer can act on, not just a logo? |
| Paywalled sender reveal | What piece of your own data could you paywall to deepen the mystery and tighten the cover? |

## Slop detector

A proposed loop is not tbh/Gas-tight if it says:

```text
Users invite friends to earn rewards.
Users share their profile to get followers.
Users vote, which creates engagement.
More users create network effects.
```

A tbh/Gas-tight loop says:

```text
A user performs a normal, intrinsically fun action in a bounded graph
→ that action produces a dense, screenshot-ready artifact about a specific recipient
→ the artifact frames the recipient positively against visible named alternatives
→ the artifact carries role-scoped anonymity that creates narrative charge
→ the product makes off-platform share a first-class action on the artifact itself
→ the artifact carries a URL watermark and is shared under a literally-true cover story
→ viewers read the status signal, want their own, and tap the watermark
→ new users join the same bounded graph
→ existing users' future artifact-production rate goes up
```

## Safety and trust notes

The same forces that made tbh/Gas work can create harm. Minors, schools, identity, gendered dynamics, competitive framing, and anonymous selection stack risk.

Check for:

- Harassment, exclusion, and humiliation vectors — named losers being visible on someone else's share is a vector by construction
- Deceptive notifications or fake social proof ("someone picked you" when no one did)
- Exposure of non-consenting third parties — the three named losers did not consent to appearing on someone's Snap story
- Coercive invite gates — time gates with no skip-without-invites option
- Paywalled sender reveals aimed at minors, where the paywall is a pressure mechanic rather than a monetization one
- Saturation, fatigue, and social backlash once the graph is dense enough that everyone is picked frequently
- Romantic/sexual framing via gendered anonymity when the user base skews young

A loop that grows fast by burning trust, exposing minors, or putting third parties on other people's status posts without consent is not S-tier. It is borrowing against reputation, and the bill comes due.