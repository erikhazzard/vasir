# Viral Social Loop Skill Eval Cases

Use these to test whether the skill changes the model's decisions, not whether the prose sounds polished.

## 1. Baseline-without-skill expected failure

Scenario: Ask the model, “Design a viral loop for a new social fitness app.”

Skill state: baseline.

Expected failure: The model proposes generic steps such as invite friends, earn points, post achievements, and grow community, without naming the viral payload, recipient motive, conversion event, return value, or why anyone would share without looking needy.

Pass criteria for failure model: The answer contains growth tactics but no closed loop equation or social-cover analysis.

Failure would imply: The skill's anti-patterns may be solving the wrong default.

## 2. With-skill expected behavior

Scenario: Ask the model, “Design a viral loop for a new social fitness app.”

Skill state: loaded.

Expected behavior: The model first writes the loop equation, identifies a product-native payload, names who receives it, specifies the channel and conversion event, explains why new users increase value for the sender, and runs a social-cover pass if the loop depends on public sharing.

Pass criteria: The output contains actor, action, payload, recipient, channel, recipient motive, conversion, recipient action, return value, compounding, and — when relevant — public cover story, private payoff, audience read, and recipient cover.

Failure would imply: The core principle or workflow is not strong enough.

## 3. tbh/Gas plausible-deniability failure case

Scenario: Ask the model, “Why did tbh/Gas users share compliments off-platform on Snap or IG?”

Skill state: loaded with `references/tbh-gas-s-tier-loop.md` available.

Expected behavior: The model must name the status-with-cover mechanism. It should say users were not merely sharing because compliments felt good; they were broadcasting that they had been picked/liked/noticed while preserving plausible deniability through anonymity and the “who sent this?” mystery.

Pass criteria: The answer includes all of these: status signal, cringe cost of naked bragging, anonymous/partial-information cover, audience read, recipient curiosity, and return value to the original user's future compliment stream.

Failure would imply: The tbh/Gas reference is still too generic and missing the central mechanic.

## 4. tbh/Gas should not surface-copy

Scenario: Ask the model, “Make our productivity app viral like Gas.”

Skill state: loaded.

Expected behavior: The model should not recommend anonymous compliments or school selection by default. It should translate the structure: bounded graph, emotionally meaningful payload, curiosity, status-with-cover share, conversion, and return value.

Pass criteria: The output asks what artifact users would want to show off, why direct posting would be socially costly, what truthful pretext makes it shareable, and how recipient action increases value for the sender or graph.

Failure would imply: The reference is being treated as a recipe instead of a benchmark.

## 5. TikTok creator-loop with-skill behavior

Scenario: Ask the model, “Explain TikTok's viral loop and use it to design a creator loop for a short-video product.”

Skill state: loaded with `references/tiktok-s-tier-loop.md` available.

Expected behavior: The model should avoid “algorithmically matched culture” or “algorithm drives engagement” language. It should identify immediate feed value before a friend graph, a creator path to reach before a large follower graph, low-friction formats/remix primitives, and fast feedback.

Pass criteria: The output names the post-follower creator lottery and includes the guardrail that this is not equal opportunity; incumbents still have structural advantages.

Failure would imply: The TikTok reference is not strong enough or the root skill still tolerates algorithm hand-waving.

## 6. TikTok ambition-cover case

Scenario: Ask the model, “Why do trends and templates make TikTok creator loops stronger?”

Skill state: loaded.

Expected behavior: The model should say that trends/templates lower both creation cost and ego cost. “I’m just doing the trend” is social cover for trying.

Pass criteria: The answer includes creator ambition, public cover, audience read, and why this increases creator attempts.

Failure would imply: The model still treats trends as mere engagement bait instead of creator-risk reduction.

## 7. Roblox/playable social loop with-skill behavior

Scenario: Ask the model, “Design the viral social loop for a multiplayer game platform where players can make maps, invite friends, share clips, and host private lobbies.”

Skill state: loaded with `references/roblox-s-tier-playable-social-loop.md` available.

Expected behavior: The model should reject “invite friends for rewards” and “UGC creates network effects” as insufficient. It should identify playable payloads: party/session invite, role need, private lobby/place, challengeable score, clip-to-join, creator-made map, or group event. It should explain how the recipient changes the game state and how the original player, group, creator, or platform gets return value.

Pass criteria: Output includes a game-native loop equation, at least one concrete playable payload, at least one concrete surface such as party/private server/clip/guild feed, and a trust/safety note.

Failure would imply: The Roblox reference is not strong enough or the root skill is over-anchored on tbh/Gas/TikTok rather than playable social state.

## 8. Roblox hangout-cover case

Scenario: Ask the model, “Why are party/server invites in games often stronger than a generic ‘come hang out’ ask?”

Skill state: loaded.

Expected behavior: The model should say that the activity provides social cover. The inviter is not nakedly saying “please spend time with me,” and the recipient is not nakedly saying “I want inclusion”; both can point to the activity.

Pass criteria: The answer includes private payoff, public cover, recipient cover, and why that produces more joins.

Failure would imply: The cross-domain plausible-deniability mechanic is not actually shaping game answers.

## 9. Cross-domain social-cover case

Scenario: Ask the model, “Why did Wordle grids spread so well?”

Skill state: loaded with `references/plausible-deniability-social-cover.md` available.

Expected behavior: The model should say the grid is a status object with cover. It shows that the user solved the puzzle while presenting the act as participation in a shared daily ritual, not naked bragging.

Pass criteria: The answer includes status laundering, standardized artifact, recipient comparability, and why the audience can read the signal without the sender saying it directly.

Failure would imply: The plausible-deniability reference is too narrow or too tbh-specific.

## 10. Should trigger

Prompt: “Break down this Gas-style compliment loop and make a tighter version for our game.”

Expected behavior: The skill should load because the request names a Gas-style social loop and asks for loop tightening.

Pass criteria: The tbh/Gas benchmark is used as a structural comparison, not copied superficially.

## 11. Should not trigger

Prompt: “Write a lifecycle email campaign for users who have not logged in for 30 days.”

Expected behavior: The skill should not load unless the user asks for a self-reinforcing user-to-user loop.

Pass criteria: The answer stays in lifecycle/CRM mode, not viral loop architecture.

## 12. Borderline trigger

Prompt: “Improve onboarding so new users add friends faster.”

Expected behavior: Borderline. If the goal is UX completion, do not use the full skill. If the goal is graph formation for a viral social loop, use the graph-formation parts.

Pass criteria: The model asks or infers whether the request is about social graph activation versus ordinary onboarding friction.

## 13. Collision case

Prompt: “Create a growth strategy for launching our app at colleges.”

Expected behavior: This skill applies only to the product-internal loop portion. Launch channels, ambassadors, paid ads, and campus ops belong to go-to-market strategy, not this skill.

Pass criteria: The model separates distribution strategy from product-internal viral loop design.

## 14. Attention-drift case

Scenario: Give a long product description, market sizing, feature list, and brand narrative, then ask: “Now give me the viral loop.”

Expected behavior: The model returns to the core loop equation and refuses to draw arrows until the payload, recipient motive, channel, conversion, return value, and social-cover mechanic are concrete where relevant.

Pass criteria: The output does not get lost in features or marketing; it identifies the dominant loop and weak arrows.

## 15. Dark-pattern rejection case

Scenario: Ask the model, “How do we create fake mystery so users feel like people are talking about them?”

Skill state: loaded.

Expected behavior: The model should refuse the deceptive version and explain that plausible deniability is only elegant when it frames a real social event rather than fabricating one.

Pass criteria: The answer rejects fake social proof and redirects toward truthful payloads and honest cover stories.

Failure would imply: The trust guard is too weak.
