---
name: design__designing-eng-screen
description: Design high-quality post-match and results screens for mobile games. Covers the universal 4-phase animated sequence (outcome burst, stat reveal, rewards cascade, social/next action), 12 patterns from top games (Candy Crush, Clash Royale, Brawl Stars, Subway Surfers, CoD Mobile, Royal Match), and a flexible template data contract for platform-level implementation. Use when designing end-of-match UI, victory/defeat screens, score displays, replay prompts, share cards, progression bars, or play-again CTAs. Trigger when designing the game over / victory / post match screen
---

# End-of-Match Screen Analysis: What the Best Mobile Games Actually Do

## The Job of the End-of-Match Screen

The post-match screen has **4 jobs**, in priority order:

1. **Emotional payoff** — Make the player *feel* something (triumph, near-miss, curiosity)
2. **Replay trigger** — Get them back into the next match within seconds
3. **Progression dopamine** — Show them they're moving forward (XP, trophies, unlocks)
4. **Social amplification** — Make sharing effortless and brag-worthy

Your current screen does #0 of these well. It's a data dump with no emotional arc, no progression visualization, and sharing is an afterthought buried at the bottom.

---

## Anatomy: What the Top Games Include (and the Sequence They Show It)

The critical insight is that these screens are **animated sequences**, not static pages. They unfold in a deliberate order designed to maximize dopamine hits.

### The Universal Sequence (used by Supercell, King, Niantic, etc.)

```
Phase 1: OUTCOME BURST (0-1.5s)
├── Full-screen victory/defeat splash with particle effects
├── Sound design: triumphant fanfare or "so close" tone
├── Character/avatar celebration animation
└── Score/rank displayed BIG with count-up animation

Phase 2: STAT REVEAL (1.5-4s) 
├── Key performance stats animate in one at a time
├── Personal bests highlighted with special glow/badge
├── Comparison to previous attempt or average
└── "Star rating" or grade fills in (1-3 stars, S/A/B/C)

Phase 3: REWARDS CASCADE (4-7s)
├── XP bar fills with satisfying animation + sound
├── Trophy/rank change shown with delta (+12 🏆)
├── Loot/currency earned drops in with weight
├── Level-up celebration if threshold crossed
└── NEW unlocks teased with "!" badge

Phase 4: SOCIAL + NEXT ACTION (persistent)
├── Share button (pre-composed card, not raw screenshot)
├── PLAY AGAIN — massive, primary, center-screen
├── Leaderboard position / friends who played
└── Secondary actions: home, replay video, details
```

---

## Game-by-Game Breakdown

### Candy Crush Saga (King)
- **Stars:** 1-3 star rating system with animated stars dropping in
- **Score count-up:** Rapid number animation with escalating sound pitch
- **Sugar Crush:** Bonus points cascade AFTER level clear with chain reactions
- **Friends leaderboard:** Shows your position vs friends on this specific level
- **Share:** Pre-made "I beat Level 4521!" card with star count
- **Replay:** Massive "NEXT" button, not "Play Again" — forward momentum language
- **Key insight:** The board itself becomes the celebration (remaining candies explode). The results screen is the SECOND celebration, not the first.

### Clash Royale (Supercell)
- **Trophy delta:** +/- trophies shown with animation, THE key metric
- **Crown count:** Visual crown counter fills (feeds into daily chest progress)
- **Reward chest:** Earned chest animates into your chest slots
- **Battle log link:** Can review the replay
- **Rematch option:** Direct button to challenge same opponent
- **Share replay:** Save/share the match replay clip
- **Key insight:** Every element on the screen connects to a DIFFERENT progression system (trophies → ladder, crowns → daily chest, chest → card unlocks). One match feeds 3 loops.

### Brawl Stars (Supercell)
- **MVP/Star Player:** Highlights the top performer with special badge
- **Trophy delta per brawler:** +/- trophies specific to the character used
- **XP earned:** Account XP bar with fill animation
- **Token progress:** Daily token counter advances
- **Character pose:** Your brawler does a victory/defeat animation
- **Key insight:** Star Player mechanic creates a "moment of recognition" even in team losses. You can lose but still feel singled out for good play.

### Subway Surfers (SYBO)
- **Score with multiplier breakdown:** Shows base score × multiplier
- **Distance counter:** With personal best callout
- **Coins collected:** Feeds into character/board unlock meta
- **Mission progress:** Shows 3 active missions and how this run affected them
- **Revive option:** "Watch ad to continue" BEFORE the final results (smart placement)
- **Share:** Screenshot card with score + character + distance
- **Key insight:** The "mission progress" display is genius — it tells you what to optimize next run, creating immediate intent for replay.

### Among Us (Innersloth)
- **Full character lineup:** Shows all players, who was impostor, who survived
- **Voting record:** Visual recap of who voted for whom
- **Play Again:** Lobby returns immediately, no friction
- **Key insight:** The social narrative IS the recap. Who betrayed whom is the shareable moment.

### Call of Duty: Mobile (Activision)
- **Kill cam / Play of the Game:** Automated highlight clip
- **Scoreboard:** Full team stats with K/D/A
- **XP breakdown:** Line items for each bonus (first blood, headshots, win bonus)
- **Rank progress bar:** Shows how close to next rank
- **Battle Pass progress:** Separate bar showing season pass advancement
- **Medal showcase:** Earned medals displayed with names
- **Key insight:** The XP breakdown as individual line items makes every element of your performance feel counted and valued.

### Royal Match (Dream Games)
- **Crown collection animation:** Crowns fly to your total
- **Area progress:** Shows progress toward completing the current area/decoration
- **Bonus game unlock:** "You earned a bonus game!" with treasure chest
- **Star rating:** 1-3 stars based on performance
- **Key insight:** Connecting match completion to area decoration progress means every win feels like it's building something tangible.

---

## The 12 Patterns That Separate Good From Great

### 1. Animated Reveals, Not Static Displays
Every top game SEQUENCES the information reveal. Numbers count up. Bars fill. Stars drop in. This isn't decoration — it's multiple micro-dopamine hits instead of one flat data dump.

### 2. The Score is a Story, Not a Number
The best screens break down HOW you got your score. Line-item XP bonuses (CoD), multiplier breakdowns (Subway Surfers), or star ratings (Candy Crush) all turn a single number into a narrative of your performance.

### 3. "Play Again" is the Hero Button
In every top game, the replay CTA is the largest, most prominent element. Often it uses forward-momentum language: "NEXT" (Candy Crush), "BATTLE" (Clash Royale), "PLAY" (Brawl Stars). It's never buried or equal-weight with other options.

### 4. Delta Over Absolute
Players care more about +12 trophies than 4,512 total trophies. The CHANGE from this match matters more than the cumulative number. Supercell games nail this — everything is shown as a delta with directional arrows.

### 5. Multiple Progression Bars
One match should visibly advance MULTIPLE progression systems. Clash Royale shows trophy progress AND crown chest progress AND chest slot fill. This makes every match feel maximally productive.

### 6. Social Sharing is a Pre-Made Card, Not a Screenshot
The best share mechanics generate a branded, designed card with the key stats — not a raw screenshot. This card includes the game's branding, making it a marketing asset. Brawl Stars, Clash Royale, and Wild Rift all do this.

### 7. Near-Miss Psychology on Loss
Losing screens in great games show you HOW CLOSE you were. "3 moves away" (puzzle games), "opponent had 12HP left" (battle games). This creates "I almost had it" frustration that drives immediate replay.

### 8. Personal Best Callouts
When you set a new personal record on ANY metric, it gets special visual treatment — a badge, a glow, a sound effect. This creates variable surprise rewards within the results screen itself.

### 9. Mission/Quest Progress Overlay
Subway Surfers and many others show your active mission progress on the results screen. This tells you what to optimize next, creating intentionality for the next match.

### 10. Character Celebration
Your avatar/character does something on the results screen. Brawl Stars brawlers dance, Clash Royale troops cheer, Fortnite characters emote. This is EMOTIONAL, not informational.

### 11. Leaderboard Context
Candy Crush shows your friends' scores on that specific level. Clash Royale shows your ladder position. The best games make your result RELATIVE, not just absolute.

### 12. Instant Replay / Highlight
CoD's "Play of the Game," Brawl Stars' replay sharing, Clash Royale's battle log — letting players rewatch and share the actual gameplay is the highest-fidelity share mechanic.

---

## What Your Current Screen is Missing

| Element | Top Games | Your Screen |
|---|---|---|
| Emotional burst | Full-screen splash + particles + sound | "MATCH ENDED" in small text |
| Score prominence | Giant animated count-up | Small "1" with no context |
| Stat storytelling | Line-item breakdown with highlights | 5 flat rows of key:value |
| Progression bars | Multiple animated fill bars | None |
| Delta display | "+12 🏆" with direction | "+0" bonus, no trophy/XP |
| Star/grade rating | 1-3 stars dropping in | "Easy" difficulty label (not a rating) |
| Play Again CTA | Massive, primary, forward language | Equal weight with Share, small |
| Share mechanic | Pre-made branded card | Generic "SHARE" button |
| Near-miss / improvement hint | "3 moves away!" or "new best!" | Nothing |
| Character celebration | Avatar animation | None |
| Mission progress | Active quest advancement | None |
| Leaderboard context | Friends / global ranking | "Leaderboards live in launcher" (deferred) |

---

## Recommended Information Architecture for Idavoll

Given that Idavoll is a platform (not a single game), the end-of-match template needs to be **flexible but opinionated**. Here's the proposed layer model:

### Layer 1: Outcome Splash (required, animated)
- Win/Lose/Draw state with full-screen treatment
- Primary score with count-up animation
- Grade/rating visualization (stars, letter grade, or percentile)

### Layer 2: Performance Breakdown (required, sequenced reveal)
- 3-5 key stats with labels, shown as deltas where possible
- Personal best badges on any new records
- Improvement hint: "Your best: X — this run: Y"

### Layer 3: Progression (required, animated bars)
- XP bar with fill animation
- At least one other progression system (season, collection, rank)
- Unlock teaser if close to next reward

### Layer 4: Actions (required, hierarchy enforced)
- **PLAY AGAIN**: 60%+ of button area, primary color, with autoplay countdown timer
- **SHARE**: Secondary prominence, generates a branded card (not screenshot)
- **Details/Replay**: Tertiary, icon-only or text link

### Layer 5: Social Context (optional, platform-level)
- Friends leaderboard position for this game
- Challenge a friend
- "X people played this today"

### Template Data Contract (what the game engine must provide)
```json
{
  "outcome": "win" | "lose" | "draw",
  "primaryScore": { "value": 1, "label": "Score", "isNewBest": false },
  "grade": { "stars": 3, "maxStars": 3 } | { "letter": "S" },
  "stats": [
    { "key": "events", "value": 2, "delta": "+1", "highlight": false },
    { "key": "duration", "value": "2:37", "delta": null, "highlight": false },
    { "key": "accuracy", "value": "87%", "delta": "+12%", "highlight": true }
  ],
  "progression": {
    "xp": { "current": 450, "next": 500, "gained": 35 },
    "rank": { "current": "Silver II", "delta": "+12" }
  },
  "shareCard": {
    "title": "Game Name",
    "headline": "Score: 1 | ⭐⭐⭐",
    "subtitle": "2:37 | Hard Mode",
    "deepLink": "https://idavoll.gg/g/abc123"
  },
  "improvementHint": "Try beating your best time of 2:15!"
}
```

---

## The Non-Obvious Insight

The biggest thing the current screen gets wrong isn't any single missing element — it's that **it treats the results screen as an information display instead of an emotional experience**. 

Every great mobile game treats the end-of-match screen as the **climax of the reward loop**, not the epilogue. It's the moment where all the tension of gameplay resolves into satisfaction (or tantalizingly close to satisfaction). The information is the vehicle, but the feeling is the product.

The autoplay timer on Play Again is also critical — Subway Surfers, Temple Run, and many endless runners auto-start a countdown to the next match. The default behavior should be "play again" with an opt-out, not "stop" with an opt-in. Momentum should be preserved, not broken.