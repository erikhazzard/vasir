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

## 3. Should trigger

Prompt: “Break down this Gas-style compliment loop and make a tighter version for our game.”

Expected behavior: The skill should load because the request names a Gas-style social loop and asks for loop tightening.

Pass criteria: The tbh/Gas benchmark is used as a structural comparison, not copied superficially.

## 4. Should not trigger

Prompt: “Write a lifecycle email campaign for users who have not logged in for 30 days.”

Expected behavior: The skill should not load unless the user asks for a self-reinforcing user-to-user, creator-to-viewer, or content-supply loop.

Pass criteria: The answer stays in lifecycle/CRM mode, not viral loop architecture.

## 5. Borderline trigger

Prompt: “Improve onboarding so new users add friends faster.”

Expected behavior: Borderline. If the goal is UX completion, do not use the full skill. If the goal is graph formation for a viral social loop, use the graph-formation parts.

Pass criteria: The model asks or infers whether the request is about social graph activation versus ordinary onboarding friction.

## 6. Collision case

Prompt: “Create a growth strategy for launching our app at colleges.”

Expected behavior: This skill applies only to the viral social loop portion. Launch channels, ambassador programs, paid ads, and campus operations belong to go-to-market strategy, not this skill.

Pass criteria: The model separates distribution strategy from product-internal viral loop design.

## 7. TikTok-style loop should trigger

Prompt: “Apply this loop thinking to TikTok. What made it so effective for small creators?”

Expected behavior: The skill should load and read `references/tiktok-s-tier-loop.md`.

Pass criteria: The model names the post-follower creator lottery, explains viewer value before friend graph, creator distribution before large follower graph, low-friction creation/remix, fast feedback, more inventory, and improved matching. It must include the accuracy caveat that follower count is less of a hard gate but not irrelevant.

Failure would imply: The TikTok reference is not routed strongly enough or the root anchor is too weak.

## 8. TikTok baseline expected failure

Scenario: Ask the model, “Why was TikTok's viral loop so strong?”

Skill state: baseline.

Expected failure: The model says “the algorithm personalizes content, users share videos, creators post trends, and network effects compound,” without explaining why a low-status creator would post or how follower-graph independence changes incentives.

Pass criteria for failure model: The answer uses vague words like algorithm, engagement, trends, culture, or network effects without a concrete creator upside loop.

Failure would imply: The skill may not need a TikTok reference, or the bad-default model is wrong.

## 9. TikTok with-skill expected behavior

Scenario: Ask the model, “Design a TikTok-like loop for an indie game UGC platform.”

Skill state: loaded.

Expected behavior: The model refuses to copy vertical video and translates the structure: immediate player value, passive signals, small/new creator map/mod/modpack discovery before audience, low-friction templates, remix/fork mechanics, fast feedback, and supply quality controls.

Pass criteria: The answer includes creator upside, contribution cost, ranking surface, feedback, reusable primitive, return value, moderation/trust risks, and the equal-chance caveat.

Failure would imply: The reference is being copied superficially instead of translated structurally.

## 10. Attention-drift case

Scenario: Give a long product description, market sizing, feature list, and brand narrative, then ask: “Now give me the viral loop.”

Expected behavior: The model returns to the core loop equation and refuses to draw arrows until the payload, recipient/viewer motive, channel/feed, conversion, and return value are concrete.

Pass criteria: The output does not get lost in features or marketing; it identifies the dominant loop and weak arrows.
