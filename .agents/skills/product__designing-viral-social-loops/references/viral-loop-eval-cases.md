# Viral Social Loop Skill Eval Cases

Use these to test whether the skill changes the model's decisions, not whether the prose sounds polished.

## 1. Baseline-without-skill expected failure

Scenario: Ask the model, “Design a viral loop for a new social fitness app.”

Skill state: baseline.

Expected failure: The model proposes generic steps such as invite friends, earn points, post achievements, and grow community, without naming the viral payload, recipient motive, conversion event, or return value.

Pass criteria for failure model: The answer contains growth tactics but no closed loop equation.

Failure would imply: The skill's anti-patterns may be solving the wrong default.

## 2. With-skill expected behavior

Scenario: Ask the model, “Design a viral loop for a new social fitness app.”

Skill state: loaded.

Expected behavior: The model first writes the loop equation, identifies a product-native social payload, names who receives it, specifies the channel and conversion event, explains why new users increase value for the sender, and flags privacy/shame risks.

Pass criteria: The output contains actor, action, payload, recipient, channel, recipient motive, conversion, recipient action, return value, and compounding.

Failure would imply: The core principle or workflow is not strong enough.

## 3. Should trigger — tbh/Gas loop

Prompt: “Break down this Gas-style compliment loop and make a tighter version for our game.”

Expected behavior: The skill should load because the request names a Gas-style social loop and asks for loop tightening.

Pass criteria: The tbh/Gas benchmark is used as a structural comparison, not copied superficially.

## 4. Should trigger — TikTok loop

Prompt: “Apply the viral loop skill to TikTok, especially why small creators post.”

Expected behavior: The skill should load and read the TikTok reference.

Pass criteria: The answer centers the post-follower creator upside and remix/template loop, not vague “algorithmic engagement.” It includes caveats that creator reach is credible, not equal or guaranteed.

## 5. Should trigger — Roblox/game loop

Prompt: “Design a viral loop for a Roblox-like VR game platform where players make rooms and invite friends.”

Expected behavior: The skill should load and read the Roblox reference.

Pass criteria: The answer rejects “invite friends for currency” and identifies the playable payload: a room, session, party, private place, role need, challenge, or creator-made object that another person has a reason to enter now. It explains what returns to the original player, creator, group, or world.

## 6. Should not trigger

Prompt: “Write a lifecycle email campaign for users who have not logged in for 30 days.”

Expected behavior: The skill should not load unless the user asks for a self-reinforcing user-to-user loop.

Pass criteria: The answer stays in lifecycle/CRM mode, not viral loop architecture.

## 7. Borderline trigger

Prompt: “Improve onboarding so new users add friends faster.”

Expected behavior: Borderline. If the goal is UX completion, do not use the full skill. If the goal is graph formation for a viral social loop, use the graph-formation parts.

Pass criteria: The model asks or infers whether the request is about social graph activation versus ordinary onboarding friction.

## 8. Collision case

Prompt: “Create a growth strategy for launching our app at colleges.”

Expected behavior: This skill applies only to the product-internal viral social loop portion. Launch channels, ambassador programs, paid ads, and campus operations belong to go-to-market strategy, not this skill.

Pass criteria: The model separates distribution strategy from product-internal viral loop design.

## 9. Attention-drift case

Scenario: Give a long product description, market sizing, feature list, and brand narrative, then ask: “Now give me the viral loop.”

Expected behavior: The model returns to the core loop equation and refuses to draw arrows until the payload, recipient motive, channel, conversion, and return value are concrete.

Pass criteria: The output does not get lost in features or marketing; it identifies the dominant loop and weak arrows.

## 10. Attention-drift case — games

Scenario: Give a long description of a multiplayer game with cosmetics, clips, leaderboards, Discord, and UGC, then ask: “What is the viral loop?”

Expected behavior: The model identifies the dominant playable payload rather than listing every feature. It asks what the recipient can play, join, beat, help, copy, inhabit, or build on.

Pass criteria: The output contains a concrete loop such as challenge/rematch, party/session need, guild obligation, creator-made map feedback, private place recurrence, or clip-to-play path. It does not say “players share clips and invite friends, causing network effects.”
