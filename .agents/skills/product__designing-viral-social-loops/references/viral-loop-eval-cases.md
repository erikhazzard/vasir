# Viral Social Loop Skill Eval Cases

Use these to test whether the skill changes the model's decisions, not whether the prose sounds polished.

## 1. Baseline-without-skill expected failure

Scenario: Ask the model, "Design a viral loop for a new social fitness app."

Skill state: baseline.

Expected failure: The model proposes generic steps such as invite friends, earn points, post achievements, and grow community, without naming the viral payload, recipient motive, conversion event, or return value.

Pass criteria for failure model: The answer contains growth tactics but no closed loop equation.

## 2. With-skill expected behavior

Scenario: Ask the model, "Design a viral loop for a new social fitness app."

Skill state: loaded.

Expected behavior: The model first writes the loop equation, identifies a product-native social payload, names who receives it, specifies the channel and conversion event, explains why new users increase value for the sender, and flags privacy/shame risks.

Pass criteria: The output contains actor, action, payload, recipient, channel, motive, conversion, recipient action, return value, and compounding.

## 3. Generic plausible-deniability diagnostic

Scenario: Ask the model, "Why do some social shares feel natural while others feel cringe?"

Skill state: loaded with `references/social-cover-and-plausible-deniability.md` available.

Expected behavior: The model should explain the social-cover ledger: private motive, public cover story, audience read, recipient cover, conversion path, and return value.

Pass criteria: The answer explicitly names both sender cover and recipient cover and says the audience must still read the signal.

## 4. tbh/Gas share explanation

Scenario: Ask the model, "Why did tbh/Gas users share compliments off-platform on Snap or IG?"

Skill state: loaded with `references/tbh-gas-s-tier-loop.md` available.

Expected behavior: The model must name the status-with-cover mechanism. It should say users were not merely sharing because compliments felt good; they were broadcasting that they had been picked, liked, or noticed while preserving plausible deniability through anonymity and the "who sent this?" mystery.

Pass criteria: The answer includes all of these: status signal, cringe cost of naked bragging, anonymous or partial-information cover, off-platform performance surface, recipient curiosity, and return value to the original user's future compliment stream.

## 5. tbh/Gas should not surface-copy

Scenario: Ask the model, "Make our productivity app viral like Gas."

Skill state: loaded.

Expected behavior: The model should not recommend anonymous compliments or school selection by default. It should translate the structure: bounded graph, emotionally meaningful payload, curiosity, truthful social cover, recipient cover, conversion, and return value.

Pass criteria: The output asks what artifact users would want to show off, why direct posting would be socially costly, what truthful pretext makes it shareable, and how recipient action increases value for the sender or graph.

## 6. TikTok creator-loop explanation

Scenario: Ask the model, "Explain TikTok's viral loop and use it to design a creator loop for a short-video product."

Skill state: loaded with `references/tiktok-s-tier-loop.md` available.

Expected behavior: The model should avoid "algorithm drives engagement" language. It should identify immediate feed value before a friend graph, a creator path to reach before a large follower graph, low-friction formats/remix primitives, fast feedback, and more inventory.

Pass criteria: The output names the post-follower creator lottery and includes the guardrail that this is not equal opportunity; incumbents still have structural advantages.

## 7. TikTok trends as social cover

Scenario: Ask the model, "Why do trends and templates make more people willing to post on TikTok-like products?"

Skill state: loaded with `references/tiktok-s-tier-loop.md` and `references/social-cover-and-plausible-deniability.md` available.

Expected behavior: The model should say trends lower not only production cost but ego cost. A template gives creators a public cover story: "I am just doing the trend," which makes the attempt feel less naked.

Pass criteria: The answer includes technical cost, ego cost, public cover, audience read, and why this increases creator supply.

## 8. Roblox/playable social loop explanation

Scenario: Ask the model, "Design the viral social loop for a multiplayer game platform where players can make maps, invite friends, share clips, and host private lobbies."

Skill state: loaded with `references/roblox-s-tier-playable-social-loop.md` available.

Expected behavior: The model should reject "invite friends for rewards" and "UGC creates network effects" as insufficient. It should identify playable payloads: party/session invite, role need, private lobby/place, challengeable score, clip-to-join, creator-made map, or group event. It should explain how the recipient changes the game state and how the original player, group, creator, or platform gets return value.

Pass criteria: Output includes a game-native loop equation, a player-demand loop, a creator-supply loop, at least one concrete channel such as party/private server/clip/guild feed, and a trust/safety note for UGC, minors, chat, or private spaces.

## 9. Roblox hangout/host cover explanation

Scenario: Ask the model, "Why do private servers and parties make social game loops stronger?"

Skill state: loaded with `references/roblox-s-tier-playable-social-loop.md` and `references/social-cover-and-plausible-deniability.md` available.

Expected behavior: The model should explain that the game session is often the public reason and the relationship or host status is the private reason. "Join my server" is socially easier than "please hang out with me."

Pass criteria: The answer includes private motive, public cover, audience read, repeat ritual or place-making, and why this improves retention and invitations.

## 10. Virality vs network-effect distinction

Scenario: Ask the model, "This product went viral. Does that mean it has network effects?"

Skill state: loaded with `references/nfx-virality-network-effects-density-and-expertise.md` available.

Expected behavior: The model should say no, then separate the acquisition machine from the defensibility machine.

Pass criteria: The answer distinguishes free/cheap user acquisition from incremental value added to existing nodes and says either one can exist without the other.

## 11. White-hot center / critical-mass analysis

Scenario: Ask the model, "We have a broad community app. Where should we start to create network effects?"

Skill state: loaded with `references/nfx-virality-network-effects-density-and-expertise.md` available.

Expected behavior: The model should avoid saying "get more users everywhere" and instead look for the densest cluster, the white-hot center, likely bridges, and the first critical-mass event.

Pass criteria: The answer names node types, link types, densest wedge, and what "alive enough" means before broad rollout.

## 12. Leakage / multi-tenanting analysis

Scenario: Ask the model, "We are building a creator marketplace. More creators should make it defensible, right?"

Skill state: loaded with `references/nfx-virality-network-effects-density-and-expertise.md` available.

Expected behavior: The model should warn that creator supply can multi-home and ask what makes creators prioritize this marketplace.

Pass criteria: The answer names the multi-tenanting risk and proposes specific forms of lock-in, quality, economics, tools, or audience value.

## 13. Asymptote analysis

Scenario: Ask the model, "Our fix is to add more supply until the marketplace wins."

Skill state: loaded with `references/nfx-virality-network-effects-density-and-expertise.md` available.

Expected behavior: The model should bring up asymptotic marketplace logic and ask when marginal value of more supply flattens.

Pass criteria: The answer says the job may change from "more nodes" to "better selection, matching, or quality."

## 14. Expertise effect analysis

Scenario: Ask the model, "We are building a creator tool and editor. How could this become defensible?"

Skill state: loaded with `references/nfx-virality-network-effects-density-and-expertise.md` available.

Expected behavior: The model should go beyond direct utility and ask whether an expertise effect can form in the labor market, creator market, or partner ecosystem.

Pass criteria: The answer mentions standardization, hiring, tutorials, agencies, contractors, partners, or shared know-how as part of the moat.

## 15. AI-native game case

Scenario: Ask the model, "What does AI change about the viral loop and defensibility of a new multiplayer game?"

Skill state: loaded with `references/nfx-virality-network-effects-density-and-expertise.md` and `references/roblox-s-tier-playable-social-loop.md` available.

Expected behavior: The model should not stop at "AI NPC chat" or "better content generation." It should ask whether AI changes the interface, player types, creator workflow, matching system, supply curve, or new network effects and viral paths.

Pass criteria: The answer names at least one new node type, link type, or creator/tooling groove enabled by AI, plus one foundational-tech constraint.

## 16. Attention-drift case

Scenario: Give a long product description, market sizing, feature list, brand narrative, and channel plan, then ask: "What is the actual viral loop?"

Skill state: loaded.

Expected behavior: The model returns to the core loop equation and refuses to draw arrows until the payload, recipient motive, public cover, recipient cover, channel, conversion, and return value are concrete where relevant.

Pass criteria: The output does not get lost in features or marketing; it identifies the dominant loop, the moat type if any, and the weak arrows.
