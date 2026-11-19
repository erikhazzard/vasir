# 01 — Research and Source Positioning

Use this reference when grounding the Overwatch-class benchmark, explaining why the skill behaves the way it does, or preventing “clone Overwatch” drift.

## Table of Contents

1. Source hierarchy
2. What Overwatch contributes to the art-direction library
3. Official-source anchors
4. Transferable principles
5. Non-transferable assumptions
6. Research-derived prior rewrites
7. Benchmark language to use
8. Benchmark language to avoid

---

## 1. Source hierarchy

Prefer sources in this order:

| Priority | Source type | Use |
|---|---|---|
| 1 | Official Blizzard / Overwatch pages and dev articles | Ground claims about roles, development process, art goals, skins, VFX, maps, and production constraints. |
| 2 | Official concept art and credited Blizzard artist portfolios | Study shape language, silhouette, proportions, material treatment, and concept-to-model decisions. |
| 3 | Talks / panel recaps / interviews with named developers | Use as process evidence when official text is available. |
| 4 | Fan analysis / wiki / community discussion | Use only as external critique or hypothesis; never as primary evidence for what Blizzard intended. |
| 5 | Screenshots and frame grabs | Use for visual analysis, but label observations as analysis rather than source fact. |

Do not present a fan-derived claim as if it were an internal rule. When exact internal guidelines are unknown, say “Overwatch demonstrates” or “this benchmark infers,” not “Blizzard’s rule is.”

---

## 2. What Overwatch contributes to the art-direction library

Sea-of-Sprites covers premium authored 2D RPG/pixel world craft. Overwatch-class art direction covers a different problem:

```text
stylized 3D hero/action readability under fast multiplayer pressure
```

It teaches:

- hero silhouette systems
- role-first character identity
- collectible skins that preserve recognition
- first-person weapon and ability readability
- ability VFX hierarchy
- enemy/ally/self visual parity
- readable maps in high-speed combat
- stylized world believability built from real reference
- animation as identity, not just polish
- live-service art mutation without losing the core game language

Its defining challenge is **readable chaos**: a battlefield can contain multiple heroes, skins, projectiles, ultimates, map effects, UI states, lighting zones, and spectatorship needs while still asking players to make immediate decisions.

---

## 3. Official-source anchors

### 3.1 Hero roles are a public-facing recognition system

The official Heroes page frames the roster around three gameplay roles: Tank, Damage, and Support. It describes Tanks as leading the charge and breaking fortified positions, Damage heroes as fragile offensive threats with varied tools, and Support heroes as allies who heal, shield, boost, and disable. Source: https://overwatch.blizzard.com/en-us/heroes/

Transferable principle:

```text
Role is not only game balance; role is visual language.
```

A hero should communicate enough of its job through shape, posture, weapon/tool, motion, and VFX that players do not need to read a tooltip to understand the broad threat category.

### 3.2 Gameplay emphasis sits at the center of art evolution

The Overwatch 2 “Evolving the Art” recap says the team’s goals included updated hero visuals, storytelling, and dynamic world elements, while keeping gameplay emphasis central. It also describes preserving Tracer’s color palette, silhouette, and sense of motion while modernizing her look. Source: https://news.blizzard.com/en-us/article/23189038/revving-up-the-engineoverwatch-2-evolving-the-art-panel-recap

Transferable principle:

```text
A sequel/redesign can evolve materials, shaders, details, and storytelling, but must preserve the identity anchors players use in combat.
```

### 3.3 Concept art solves gameplay problems, not just visual prompts

In Blizzard’s concept-artist article, Qiu Fang describes concept work as finding visual solutions to gameplay problems. The same article discusses Talon units needing quick-glance recognition and shows a failed direction whose role and silhouette were unclear. Source: https://news.blizzard.com/en-us/article/23537427/what-its-like-to-work-on-overwatch-as-a-concept-artist

Transferable principle:

```text
A strong concept is not “cool”; it is a visual answer to a gameplay job.
```

A design that lacks a clear role like sniper, brawler, shield, flanker, healer, or disruptor creates concept debt even if the illustration is attractive.

### 3.4 Skins are constrained by silhouette, animation, and recognition

The same concept-artist article states that skins should not radically change hero silhouettes because silhouettes support recognition. It also notes that some skins are constrained by animation and armor mechanics; changing them would alter how the character appears to behave. Source: https://news.blizzard.com/en-us/article/23537427/what-its-like-to-work-on-overwatch-as-a-concept-artist

Transferable principle:

```text
A skin is a constrained identity remix, not an identity rewrite.
```

### 3.5 Big shapes carry long-distance read; detail is close-range reward

The concept-artist article describes recognizable objects mixed with futuristic Overwatch elements and notes that big shapes tend to sit near the top of characters so they can be seen from far away, while close inspection reveals detail. Source: https://news.blizzard.com/en-us/article/23537427/what-its-like-to-work-on-overwatch-as-a-concept-artist

Transferable principle:

```text
Place identity mass where the camera and occlusion allow it to survive.
```

The upper body, headgear, shoulders, weapon, backpack, wings, and posture are more valuable than shoe decals or torso micro-panels.

### 3.6 Good skins feel manufactured in the world, not stitched-on costumes

The Honeydew Mei example in the concept-artist article is valuable because it frames a goofy theme as needing to feel like something made inside the Overwatch world rather than a pasted costume. Source: https://news.blizzard.com/en-us/article/23537427/what-its-like-to-work-on-overwatch-as-a-concept-artist

Transferable principle:

```text
Even playful skins need construction logic: materials, fasteners, functional surfaces, weapon integration, and manufacturing believability.
```

### 3.7 New heroes are cross-disciplinary, kit-driven, and tested in 3D/first person

The Venture development article says heroes are built by multidisciplinary strike teams, with concept art as one part of the puzzle. Venture started from a gameplay requirement—digging with a large drill—and the team added a backpack and coat for identity/silhouette. They also blocked out the drill in 3D and streamlined the shape when the paper version did not read from the first-person perspective. Source: https://news.blizzard.com/en-us/article/24072104/ready-to-make-history-a-look-into-ventures-development

Transferable principle:

```text
For action heroes, concept approval must survive 3D, first-person view, animation, and in-game feel.
```

A gorgeous side-view concept is not production-safe until the player-camera read works.

### 3.8 Gameplay kit can drive story and personality

The Venture article says the initial gameplay code name was “Miner” and that the development around digging and the drill led toward an archeologist fantasy and personality. Source: https://news.blizzard.com/en-us/article/24072104/ready-to-make-history-a-look-into-ventures-development

Transferable principle:

```text
The strongest hero fantasies often emerge when kit, weapon, silhouette, story, and personality converge around one readable verb.
```

### 3.9 Maps are built from real reference, layout needs, mode constraints, lighting, and local identity

The Kanezaka article describes research/reference from Kyoto and Tokyo, a blockout process, vertical action, tight alleys, larger open areas, and contrasts between traditional and modern spaces. It also states that lighting had to create distinct recognizable moods that helped navigation while keeping the map coherent. Source: https://news.blizzard.com/en-us/article/23609156/next-stop-kanezaka

Transferable principle:

```text
Competitive environment art must make spaces memorable, navigable, and playable before it adds decorative density.
```

### 3.10 Modes impose different environment constraints

The Kanezaka article distinguishes deathmatch freedom from structured modes such as control and payload. It notes that control maps need symmetry for fairness and payload maps need a main path, while deathmatch maps need a mix of long, medium, and close-range fight spaces. Source: https://news.blizzard.com/en-us/article/23609156/next-stop-kanezaka

Transferable principle:

```text
Mode determines art constraints. Map art that ignores mode structure can look right and play wrong.
```

### 3.11 Dynamic environment presentation must still protect gameplay

The Evolving the Art recap describes weather, fog, rain, wind, ash, improved cloth, particles, and sequenced events as part of making Overwatch 2 environments more dynamic. Source: https://news.blizzard.com/en-us/article/23189038/revving-up-the-engineoverwatch-2-evolving-the-art-panel-recap

Transferable principle:

```text
Atmosphere may increase immersion only if it does not compromise sightlines, threat read, or navigation.
```

### 3.12 Dramatic palette shifts are exceptions that must keep gameplay standards

The Starwatch article describes transforming a bright moon-base map into a darker space-opera setting by changing materials and lighting, while noting that dark reds and blacks are colors the team usually avoids in competitive maps and that the event still needed to keep high gameplay standards. Source: https://news.blizzard.com/en-us/article/23948541/exploring-a-new-universe-in-starwatch-galactic-rescue

Transferable principle:

```text
Mood can push the style only when the design explicitly protects gameplay readability.
```

### 3.13 Cosmetic VFX must not require enemy relearning or create advantage

The Junker Queen Mythic VFX article says Mythic skins can change visual effects, but also states the team considers gameplay priority, hero identity, and competitive advantage. It specifically says enemies should not have to relearn a hero’s visual aesthetic to play against that skin. Source: https://news.blizzard.com/en-us/article/23899162/creating-visual-effects-for-a-god-with-the-junker-queen-mythic-skin

Transferable principle:

```text
Cosmetic VFX can be richer for fantasy, but enemy-facing timing, shape, ownership, function, and threat read must remain stable.
```

### 3.14 Cultural skins and themed cosmetics require research, personal stakes, and silhouette limits

The Lunar New Year skins article describes researching mythology, matching themes to specific heroes, working within silhouette limits, differentiating skins with materials/color/theme, and using culturally meaningful details. Source: https://news.blizzard.com/en-us/article/23622606/a-beast-of-a-time-behind-tiger-huntress-ashe-and-pale-serpent-widowmaker

Transferable principle:

```text
A culturally inspired cosmetic succeeds when research, character fit, silhouette limits, and material/color specificity converge.
```

---

## 4. Transferable principles

These are safe to encode into the skill:

1. **Gameplay-first art direction** — art supports decision-making under pressure.
2. **Identity stack** — silhouette alone is not enough; posture, weapon, color, motion, and VFX also carry recognition.
3. **Role fantasy before ornament** — role and kit must shape character design.
4. **Big shapes before detail** — close-up reward only matters after distance read works.
5. **First-person and third-person parity** — designs must work from player, enemy, ally, and spectator views.
6. **Skin parity** — cosmetics remix without breaking recognition, rig, weapon, VFX, or fairness.
7. **Ability grammar** — every effect has anticipation, active state, ownership, danger, impact, and decay.
8. **Map as communication** — environments communicate routes, landmarks, objectives, cover, range, and verticality.
9. **Stylized believability** — use real reference and manufacturing logic to ground bold shapes.
10. **Live-service mutation discipline** — ongoing content can transform the world while protecting the recognition system.

---

## 5. Non-transferable assumptions

Do not encode these as laws:

- Exact Overwatch proportions, shaders, polycounts, texture budgets, or rig systems unless the user supplies project-specific data.
- Exact Overwatch team process beyond what official sources describe.
- Exact color assignments for roles or abilities; different projects may need different color languages.
- Specific hero designs, weapons, maps, or names as templates to copy.
- The claim that Overwatch is perfectly readable in all situations; the skill is an aspirational benchmark, not a claim of flawlessness.
- Any official-style rule that cannot be traced to a source or observed responsibly.

---

## 6. Research-derived prior rewrites

| Source-derived scar | Bad model prior | Replacement prior |
|---|---|---|
| Skins can break recognition. | Make the most exciting costume. | Preserve identity anchors, motion logic, and enemy read first. |
| Concept can be too abstract. | Invent cool abilities and visuals broadly. | Tie the concept to a clear gameplay role/verb and roster slot. |
| Paper concept may fail in first person. | Approve from illustration. | Mock up weapon/tool and hero mass in gameplay camera early. |
| Map lighting can hurt navigation. | Use lighting for mood. | Use lighting for mood plus local orientation and route clarity. |
| Dynamic effects can obscure gameplay. | Add particles/fog/weather for polish. | Budget dynamic presentation by threat visibility and navigation. |
| Mythic VFX can create fairness issues. | Change VFX to match premium fantasy. | Enemy-facing function remains stable; richness can be self/ally-biased. |
| Cultural skins can become costume collage. | Attach recognizable motifs. | Research deeply and integrate theme through material, construction, silhouette-safe shapes, and character fit. |

---

## 7. Benchmark language to use

Use phrases like:

- “Overwatch-class hero readability”
- “Overwatch-adjacent stylized 3D action clarity”
- “readable chaos”
- “gameplay-safe spectacle”
- “hero identity stack”
- “skin parity contract”
- “ability VFX grammar”
- “map art as competitive communication”
- “stylized believability, not realism soup”
- “premium live-service mutation without recognition loss”

---

## 8. Benchmark language to avoid

Avoid phrases like:

- “make it look exactly like Overwatch”
- “use Blizzard style” without explanation
- “Overwatch has the best art style” as an unqualified claim
- “all skins must keep exact silhouette” as a rigid law; the real target is preserving combat recognition under change
- “VFX should be minimal”; the correct rule is criticality-budgeted, readable spectacle
- “maps should be bright”; the correct rule is visibility-safe lighting and navigation clarity
- “stylized means simple”; the correct rule is big readable shapes plus deliberate detail hierarchy
