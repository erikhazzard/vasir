---
name: design__designing-end-screen
description: Design high-quality post-match and results screens for mobile games. Covers the universal 4-phase animated sequence (outcome burst, stat reveal, rewards cascade, social/next action), share artifact design (Wordle grid pattern, transport selection, spoiler safety), and return hooks. Triggers when designing the game over / victory / post match / results / score screen, share card, end-of-round summary, or any screen shown after a session ends.
---

# Game Results Screen Design

You are designing the screen a player sees the moment a session ends.

This screen has four jobs:
1. **Emotional payoff** — make the player *feel* something (triumph, near-miss, curiosity)
2. **Screenshot composition** — still reads when cropped and posted
3. **Share artifact** — something someone would actually send
4. **Return energy** — a real reason to come back

Design for three audiences simultaneously:
- **The player's present self:** What happened?
- **Their social circle:** What does this say about me?
- **Their future self:** Why come back?

This is a transition surface between one session and the next behavior — not a neutral report card.

## The Core Insight

Every great mobile game treats the end-of-match screen as the **climax of the reward loop**, not the epilogue. The information is the vehicle, but the feeling is the product.

The results screen is an **animated sequence**, not a static page. It unfolds in a deliberate order designed to maximize dopamine hits. (See Appendix A.1 for the universal 4-phase sequence.)

## Non-Negotiables

- **Player-first, not ad-first.** If the artifact feels like marketing collateral, redesign it.
- **Conditional design, not templates.** Grids, streaks, distributions, share flows are tools, not defaults.
- **No invented data.** Never fake history, streaks, percentiles, social proof, or timing.
- **Accessibility is part of shareability.** Never rely on color alone. Redundant encoding always.
- **Trust beats pressure.** No guilt copy, fake scarcity, fake countdowns, or manipulative FOMO.
- **Make the smallest plausible assumption when context is missing.** State assumptions clearly instead of asking follow-up questions unless absolutely necessary.

---

## Step 1: Diagnose Before Designing

Classify the game and session before proposing UI.

Identify:
- **Game archetype:** daily shared puzzle, trivia/knowledge, replayable skill/score-chase, synchronous multiplayer match, asynchronous competition, other
- **Session cadence:** daily/limited, repeatable, matchmade, endless/arcade
- **Primary motivation:** mastery, competition, social bragging, collection, ritual, narrative closure
- **Spoiler model:** none / low / high
- **Learnability:** can the player learn from a round-by-round review?
- **Social context:** private/self, friends, guild/team, global cohort
- **Available data:** current result, prior sessions, streak, distribution, percentile, replay events, match stats, none/partial
- **Player stage:** first session, new, returning, habitual
- **Platform/context:** iOS, Android, web, portrait/landscape
- **Rank the four jobs** (emotional payoff, screenshot, share, return) for this specific game
- **What "return" means here:** tomorrow's session, next event, immediate replay, requeue, long-term progress
- **Assumptions:** anything you inferred

## Step 2: Choose the Right Layers

Use only layers that fit the diagnosis. Explicitly state which you use, skip, or make secondary.

### Layer 1: Replay — "What happened"

**Purpose:** Create one of three feelings: *I should have known that*, *I was close*, or *Now I know what to fix.*

Rules:
- Make the decisive miss or turning point visually dominant
- Show the correct answer / ideal move, the player's action, and timing only if timing matters
- Default to the decisive moment + 2–3 supporting rows max
- If the game is not learnable or the miss is not legible, skip Replay

### Layer 2: Record — "How you're doing over time"

**Purpose:** Change player identity or raise the cost of indifference.

Use when history is meaningful:
- Current streak + best streak (only if the recurring unit is meaningful and fair)
- Compact stat row for stable, important stats
- Distribution/histogram only with enough history and meaningful buckets
- Highlight today's run within a distribution

When streaks are weak or inappropriate, substitute: new best, recent trend, mastery progress, season movement, unlock progress, friend delta.

If you do use streaks: define them around meaningful progress, show current + best, prefer factual framing (`Next Daily in 14h 32m`) over guilt framing (`Don't lose your streak`).

### Layer 3: Share Artifact — "The thing you post"

**This is the most important layer.** The artifact is the product. Buttons are secondary.

See the dedicated Share Artifact Design section below.

### Layer 4: Hook — "Why you'll come back"

**Purpose:** Credible, factual, low-friction return energy.

Good hooks:
- `Next Daily in 14h 32m`
- `Tomorrow's theme: 90s Sitcoms`
- `3 more perfect rounds to unlock Hard Mode`
- `You beat 64% of today's players` (only if real)
- `Queue again — you were 1 elimination from finals`

Rules:
- Prefer inevitability and anticipation over commands
- Countdown only when the next session is genuinely scheduled
- Unlocks only when the player is close enough to care
- The hook should reduce re-entry friction, not increase pressure

### Layer 5: Replay/Requeue Bridge

**Purpose:** When immediate continuation matters more than tomorrow.

Use for matchmade/endless games. The autoplay timer is critical — Subway Surfers and Temple Run auto-start a countdown to the next match. The default should be "play again" with an opt-out, not "stop" with an opt-in.

---

## Share Artifact Design

This section gets its own treatment because the share artifact is the highest-leverage surface on the results screen. A great share artifact turns every player into a distribution channel.

### The Wordle Grid: S-Tier Share Artifact Analysis

Wordle's colored grid is the most successful share artifact in gaming history. Every design principle that matters is visible in five lines of emoji:

```
Wordle 1,241 4/6

⬛🟨⬛⬛⬛
⬛⬛🟩⬛🟨
🟨🟩🟩⬛⬛
🟩🟩🟩🟩🟩
```

**Why it works — the 7 properties:**

1. **Journey, not destination.** The grid shows *how* you got there, not just *that* you got there. Each row is a chapter. You can read someone's strategy, see where they pivoted, feel their breakthrough. A raw "4/6" score is forgettable. The grid is a story.

2. **Perfect spoiler safety.** The answer is completely hidden. You can share freely without ruining anyone else's puzzle. This removed the single biggest friction to sharing daily puzzles. Prior word games couldn't solve this.

3. **Universal legibility.** Anyone can read it instantly — no game knowledge required. Green = right, yellow = close, gray = wrong. A non-player scrolling Twitter understands the artifact in under 2 seconds and feels the pull to try it themselves.

4. **Fixed dimensions, infinite variation.** Every grid is 5 columns wide, 2–6 rows tall. This constraint means every share artifact is visually consistent in a feed while being unique in content. It's a format, like a sonnet — constraint creates recognizability.

5. **Plain text as medium.** It's emoji, not an image. It pastes into any channel — Twitter, iMessage, Slack, WhatsApp, Discord, email. No image hosting, no preview cards, no broken thumbnails. Zero friction, maximum portability.

6. **Social comparison without leaderboards.** When everyone plays the same puzzle, the grid IS the leaderboard. You see a friend's 3/6 next to your 5/6 and feel something. No server-side ranking needed — the feed becomes the competition surface.

7. **Identity expression.** Your grid reveals your play style. Hard-mode players show it. Lucky guessers show it. Methodical eliminators show it. The artifact says something about *you*, not just your score. People want to share things that express identity.

**What Wordle got wrong (and you should fix):**

- No game branding in the artifact itself — it relied on social context for attribution. Include a subtle, non-obnoxious game identifier.
- The numbered puzzle ID (`Wordle 1,241`) is meaningless to non-players. If you use a session identifier, make it convey something (date, theme, difficulty tier).
- Hard Mode isn't visually distinct enough in the grid. If your game has difficulty modes, make them visible in the share artifact.

### The 5 Laws of Share Artifact Design

Derived from Wordle, Connections, Spotify Wrapped, and every artifact that actually gets shared:

**Law 1: Journey Over Destination**
Show the path, not just the outcome. A score is a fact. A journey is a story. People share stories.
- Wordle: the row-by-row colored grid
- Connections: the group-by-group reveal order with color coding showing which groups you found first
- Trivia: `Q1 ✅ 4.1s → Q2 ✅ 3.6s → Q3 ❌` is better than `2/3 correct`
- Score-chase: medal strip + split times + `New Best +18` is better than `Score: 4,230`

**Law 2: Spoiler Safety**
If the game has a shared answer, the artifact must hide it completely. If you can't share without spoiling, most players won't share at all.

**Law 3: Instant Legibility**
A non-player should understand the artifact in under 3 seconds. If it requires game knowledge to parse, the viral coefficient drops to near zero.

**Law 4: Channel Universality**
Design for the lowest-common-denominator channel first. If it works in plain text, it works everywhere. If it requires a rich card, you've lost every channel that doesn't render previews well. Prefer:
1. Plain text / emoji (works everywhere)
2. Small image card (works on most platforms)
3. Rich interactive card (works only on platforms with preview rendering)

**Law 5: Identity Expression**
The artifact should say something about *the player*, not just *their score*. Strategy, style, risk tolerance, lucky breaks — these are what make someone want to claim the artifact as theirs.

### Artifact Format Examples

| Game Type | Artifact Format | Why |
|---|---|---|
| Daily shared puzzle | Symbol grid / emoji path | Journey + spoiler-safe + plain text |
| Trivia/knowledge | Compressed Q&A strip (3–4 lines) | Shows what you knew and what tripped you up |
| Score-chase | Medal strip + splits + delta | Delta creates comparison, splits show journey |
| Multiplayer match | Placement + standout stat + role | Identity expression through role/stat |
| Roguelike/run | Run summary card: seed + build + cause of death | Identity through build choices |
| Rhythm/music | Accuracy bar + streak + perfect% | Journey through the song |

### Transport Selection

Choose transport based on artifact type and platform:

- **Plain-text artifact** (emoji grids, compressed text strips): Copy is primary. Native share is secondary.
- **Rich image/card**: Native share is primary. Copy + download as secondary.
- **Web without native sharing**: Copy + screenshot-friendly layout.

Never ban native share universally. Choose the transport that fits.

---

## Screenshot Composition

Design for screenshot cropping first unless told otherwise.

Rules:
- Keep interesting content inside the center ~60% of screen height
- Composition survives top/bottom crop
- Key content clear of status bar, notch, home indicator, gesture areas
- One viewport by default; no mandatory scrolling
- Content makes sense if buttons are cropped out
- Strong contrast, never color-only encoding
- Large, heavy type for the main result; tabular/monospaced figures where alignment matters
- Dark backgrounds often work well in feeds, but don't force dark if a lighter surface is more readable

---

## Social Comparison

Use only if relevant and credible.

Priority order:
1. Self vs previous self
2. Friends/team
3. Credible cohort/global percentile

Avoid: comparing to unreachable top scores, fake percentile flexes, vague social proof.

---

## Branding and Tone

- Brand lightly: one small game-name anchor
- No giant `GAME OVER`
- No generic filler (`Great job!`, `Better luck next time!`)
- Match emotional tone to outcome — no celebration effects on a bad loss
- If removing nav/buttons leaves a coherent "poster," the composition is working

---

## Anti-Patterns

- Giant `GAME OVER`
- Lone raw score with no context
- Mandatory modal before sharing
- Hiding the share artifact until after a tap
- Oversized replay button when the real goal is sharing or requeue
- Endless stat cards floating in dead space
- Color-only encoding
- Scrollable results for ordinary sessions
- Forcing a viral pattern from another genre
- Fake urgency, fake scarcity, fake rankings, fake opponent presence

---

## Required Output Format

Return exactly these sections. Be concrete. Write like a design spec, not a blog post.

### 1. Context Diagnosis
Archetype, cadence, motivation, spoiler model, learnability, social context, available data, player stage, platform, ranked jobs (emotional payoff / screenshot / share / return), what "return" means, assumptions.

### 2. Layer Decisions
For each layer: **Use / Skip / Secondary** + one sentence why.

### 3. Screen Concept
Top-to-bottom. For each block: content, purpose, why it earns its place, whether it lives inside the screenshot-safe zone.

### 4. Share Artifact
- Exact example artifact text/card content
- Which of the 5 Laws it satisfies and how
- Spoiler strategy
- Primary and secondary transports by platform

### 5. Return / Replay Hook
- Exact hook copy
- Why it creates credible return/replay energy
- Fallback if streaks/history don't exist

### 6. Motion, Interaction, and Feedback
- Entry reveal sequence (the 4-phase animated sequence — see Appendix A.1)
- Button hierarchy
- Tap states (`Copied!`, `New Best`, `Next Daily in 14h 32m`)
- What happens on share / copy / replay / requeue tap

### 7. Accessibility and Platform Adaptation
- Contrast and encoding strategy
- Non-color fallback
- Screen-reader / plain-text share handling
- Safe-area / crop resilience
- iOS / Android / web differences

### 8. Measurement Plan
- Events to log
- Primary metric
- Secondary metrics
- Segment cuts
- 2–3 A/B test ideas with hypotheses

### 9. Edge-Case Fallbacks
- Cold start (first session / no history)
- No credible share artifact
- No telemetry
- Any other likely failure case

### 10. Self-Check
Answer **yes/no** with one-line justification:
- Does the screen still make sense when cropped?
- Is the share artifact compact, recognizable, and does it follow the 5 Laws?
- Is it accessible without color alone?
- Is every shown stat real and meaningful?
- Is the return hook motivating without guilt?
- Is this optimized for the right ranked jobs?

---

# Appendix A: Reference Patterns

## A.1 The Universal Score Sequence

Every top mobile game uses a 4-phase animated sequence, not a static page:

```
Phase 1: OUTCOME BURST (0–1.5s)
├── Full-screen victory/defeat splash with particle effects
├── Sound: triumphant fanfare or "so close" tone
├── Character/avatar celebration animation
└── Score/rank displayed BIG with count-up animation

Phase 2: STAT REVEAL (1.5–4s)
├── Key stats animate in one at a time
├── Personal bests highlighted with glow/badge
├── Comparison to previous attempt or average
└── Star rating or grade fills in

Phase 3: REWARDS CASCADE (4–7s)
├── XP bar fills with satisfying animation + sound
├── Trophy/rank delta shown (+12 🏆)
├── Loot/currency drops in with weight
├── Level-up celebration if threshold crossed
└── Unlock teaser with "!" badge

Phase 4: SOCIAL + NEXT ACTION (persistent)
├── Share button (pre-composed artifact, not raw screenshot)
├── PLAY AGAIN — massive, primary, center-screen
├── Leaderboard position / friends who played
└── Secondary actions: home, replay, details
```

## A.2 Game-by-Game Breakdown

### Wordle / NYT Games (the share artifact benchmark)

**What the results screen does:**
- Displays attempt count (X/6) and the colored grid
- Shows streak stats: current streak, max streak, games played, win %
- Distribution histogram of attempt counts across all games
- Share button generates the plain-text emoji grid with puzzle number
- Timer to next puzzle

**Why it's S-tier:**
- The grid IS the share artifact — no separate "share card" needed
- Plain text means zero transport friction
- Spoiler-safe by design — colors encode correctness, not the answer
- The distribution histogram creates "record" identity over time
- The streak counter creates return energy without guilt (factual: "Current Streak: 47")
- Hard Mode asterisk (*) adds identity expression for dedicated players

**Connections (NYT) — the second-gen Wordle pattern:**
- 4 color-coded groups, shown in the order you solved them
- Share artifact is a 4-row colored grid (🟨🟨🟨🟨 / 🟩🟩🟩🟩 / 🟪🟪🟪🟪 / 🟦🟦🟦🟦)
- Solve order reveals strategy — did you get the hardest (purple) first or last?
- Mistakes shown as row count > 4 groups
- Inherits Wordle's spoiler safety and plain-text portability

### Candy Crush Saga (King)
- 1–3 star rating with animated stars dropping in
- Score count-up with escalating sound pitch
- Sugar Crush: bonus cascade AFTER level clear
- Friends leaderboard on this specific level
- **Key insight:** The board itself becomes the first celebration (remaining candies explode). The results screen is the second.

### Clash Royale (Supercell)
- Trophy delta (+/-) as THE key metric
- Crown count feeds daily chest progress
- Earned chest animates into chest slots
- Rematch option
- **Key insight:** One match visibly advances 3 progression systems (trophies → ladder, crowns → daily chest, chest → card unlocks).

### Brawl Stars (Supercell)
- MVP/Star Player badge highlights top performer
- Trophy delta per brawler (character-specific ranking)
- Character victory/defeat animation
- **Key insight:** Star Player creates recognition even in team losses.

### Subway Surfers (SYBO)
- Score × multiplier breakdown
- Distance with personal best callout
- Mission progress: 3 active missions and how this run affected them
- **Key insight:** Mission progress tells you what to optimize next run, creating intentionality for replay.

### Call of Duty: Mobile (Activision)
- Kill cam / Play of the Game highlight clip
- XP breakdown as individual line items (first blood, headshots, win bonus)
- Battle Pass + rank progress as separate bars
- **Key insight:** Line-item XP makes every element of performance feel counted.

### Among Us (Innersloth)
- Full character lineup: who was impostor, who survived
- Voting record recap
- Instant lobby return
- **Key insight:** The social narrative IS the recap. Who betrayed whom is the shareable moment.

## A.3 The 12 Patterns That Separate Good From Great

1. **Animated reveals, not static displays.** Sequence the information. Numbers count up. Bars fill. Stars drop. Multiple micro-dopamine hits instead of one flat dump.

2. **Score as story, not number.** Break down HOW the score happened. Line-item bonuses, multiplier breakdowns, star ratings turn a number into a narrative.

3. **"Play Again" is the hero button.** Largest, most prominent. Forward-momentum language: "NEXT" (Candy Crush), "BATTLE" (Clash Royale). Often with autoplay countdown timer.

4. **Delta over absolute.** +12 trophies matters more than 4,512 total. Show the change from this match.

5. **Multiple progression bars.** One match should visibly advance multiple systems.

6. **Screenshot-first composition.** The score screen itself is a viral artifact. A separate share button generates a branded card.

7. **Near-miss psychology on loss.** Show HOW CLOSE: "3 moves away," "opponent had 12HP left." Drives immediate replay.

8. **Personal best callouts.** New record on ANY metric gets special visual treatment — badge, glow, sound. Variable surprise reward.

9. **Mission/quest progress overlay.** Show active mission progress to create intentionality for the next run.

10. **Character celebration.** Avatar does something emotional — dances, cheers, emotes. Feeling, not information.

11. **Leaderboard context.** Make the result RELATIVE: friends' scores on this level, ladder position.

12. **Instant replay / highlight.** Replay sharing is the highest-fidelity share mechanic.
