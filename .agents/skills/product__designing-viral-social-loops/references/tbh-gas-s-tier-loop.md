# tbh/Gas S-Tier Viral Social Loop Reference

This is a benchmark example, not a recipe. Use it to calibrate tightness and prevent generic “invite/share/network effect” slop.

## Table of contents

1. Transcribed loop
2. Clean causal form
3. Loop anatomy
4. Why this is S-tier
5. What not to copy blindly
6. Structural translation template
7. Slop detector using this benchmark
8. Safety and trust notes


## Transcribed loop

```text
Loop Breakdown

NEW USER

Select HS / College
Add Friends
        ↓

ACTIVATED USER
GAME LOOP

Compliment others

        TIME GATE
        unlocked via

Invite others

Note on outgoing compliment path:
others directly receive a compliment; you indirectly may receive a compliment by them opening app and potentially sending you one

        ↓

SOCIAL LOOP

Receive compliments

Share profile
SMS
Off platform (snap, IG)

Note on profile sharing path:
sharing profile w/ your graph leads to new users which leads to more compliments you receive

Receive compliments
        ↓
Share votes you receive
SMS
Off platform (snap, IG)

Large return arrows:
Invite others → new users
Share profile → new users
Share votes you receive → new users
```

## Clean causal form

```text
New user
→ selects high school / college
→ adds friends
→ enters a bounded, identity-relevant graph
→ compliments others
→ compliment recipients receive a positive signal about themselves
→ recipients open or join to resolve curiosity and participate
→ they may compliment the original user back
→ time gate pushes the active user to invite others to keep playing
→ user receives compliments
→ user shares profile or received votes via SMS, Snap, or IG
→ classmates see flattering social proof and a socially relevant prompt
→ new users join the same local graph
→ graph density increases
→ more people can vote, compliment, reciprocate, and share
→ original user gets more compliments and more shareable proof
```

## Loop anatomy

| Component | tbh/Gas implementation | Why it matters |
|---|---|---|
| Bounded graph | High school / college selection plus friend adding. | The payload matters because the people are socially relevant. |
| Viral unit | A compliment or vote about a real person. | The viral object has emotional value before any reward system. |
| Sender motive | Compliment others, keep playing, unlock via invites, potentially receive compliments back. | Sending is not charity; it can increase the sender's own future value. |
| Recipient motive | “Someone in my graph said something positive about me.” | Curiosity and identity-relevance pull the recipient into the app. |
| Broadcaster motive | Received votes/compliments make the user look liked, noticed, or socially validated. | Sharing is status expression, not a chore. |
| Channel | SMS for direct reach; Snap/IG for off-platform graph broadcast. | The channel matches how teens already circulate social proof. |
| Conversion event | Open app, join, select school, add friends, vote/compliment. | The recipient becomes a participant, not just a viewer. |
| Return value | More graph density produces more compliments for the original user. | New users improve the sender's own experience. |
| Compounding mechanism | Local graph densification. | Growth becomes explosive inside a school/community cluster. |

## Why this is S-tier

1. **The viral unit is personal.** A compliment about you from your real graph is far stronger than a generic invite.
2. **The sender, recipient, and broadcaster all have self-interested motives.** The app does not rely on users helping the company grow.
3. **The product creates its own shareable artifact.** Received votes and profiles are naturally broadcastable because they are flattering and socially legible.
4. **The graph is bounded and dense.** School/community context turns ordinary voting into identity-relevant social information.
5. **The loop stacks without becoming ornamental.** Onboarding creates graph density; game actions create compliments; recipient notifications drive opens; share loops recruit more graph members.
6. **The return arrow is clear.** New users do not merely increase vanity metrics; they increase the chance that the original user receives more compliments.
7. **The loop has repeatable cadence.** Complimenting, receiving, inviting, and sharing can repeat daily without needing new content formats.

## What not to copy blindly

Do not treat these as magic ingredients:

```text
schools
anonymous voting
compliments
profile links
Snap/IG sharing
time gates
```

They work only because they serve the deeper structure:

```text
bounded graph
→ emotionally salient payload
→ recipient curiosity
→ off-platform social proof
→ new users join the same graph
→ increased value for the original user
```

## Structural translation template

When adapting the pattern, replace each tbh/Gas component with a product-native equivalent:

| tbh/Gas part | Translation question |
|---|---|
| Compliment/vote | What positive, useful, scarce, or identity-relevant payload does normal product use create? |
| High school graph | What bounded graph makes the payload matter: team, guild, league, cohort, workplace, neighborhood, fandom, friend group? |
| “Someone voted for you” | What notification creates legitimate curiosity without deception? |
| Share received vote | What artifact would a user be proud or motivated to show off-platform? |
| Invite to unlock | What immediate personal value does inviting unlock, and is the gate earned rather than coercive? |
| More classmates join | How do new users increase value for the original user or graph? |

## Slop detector using this benchmark

A proposed loop is not tbh/Gas-tight if it says:

```text
Users invite friends to earn rewards.
Users share their profile to get followers.
Users vote, which creates engagement.
More users create network effects.
```

A tbh/Gas-tight loop says:

```text
A user receives or creates a socially meaningful payload about a real person
→ the payload reaches someone who cares
→ that person opens/joins to resolve curiosity, reciprocate, or participate
→ their participation increases value for the original user or graph
→ the original user has a reason to repeat, invite, or share again.
```

## Safety and trust notes

The same forces that make this loop powerful can create harm. For minors, schools, identity, anonymous voting, ranking, or social comparison, treat safety as part of loop quality, not a separate compliance add-on.

Check for:

- harassment, exclusion, popularity contests, and humiliation vectors;
- deceptive notifications or fake social proof;
- revealing private graph relationships;
- coercive invite gates;
- screenshots or shares that expose users who did not consent;
- saturation, fatigue, and social backlash once the graph is dense.

A loop that grows fast by burning trust is not S-tier; it is borrowing against reputation.
