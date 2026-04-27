# 08 — Prompt Template and Concrete Examples

Use this reference when you want the **actual reusable prompt template** for Overwatch-class hero art generation, plus a small set of concrete example prompts you can run manually to see whether the art direction is producing the right kind of output.

This file is deliberately **not** a meta wrapper.  
It does **not** say “use the skill.”  
It is the **compiled prompt form** of the skill.

## Core Principle

The fixed part of the prompt should carry the Overwatch-class art-direction prior:

- original hero-shooter design
- bold role-first silhouette
- readable weapon / tool / ability design
- expressive pose language
- clean stylized materials
- strong color blocking
- restrained gameplay-safe VFX
- premium polished finish
- iconic, roster-ready readability

The variable part should only describe the specific hero, role, pose, and optional theme constraints.

---

## Base Template

Use this as the default house template:

```text
Create an original premium stylized 3D hero-shooter [asset type]. Do not copy any existing Overwatch character, skin, weapon, map, logo, or official artwork. Target Overwatch-class craft: bold role-first silhouette, readable weapon/tool and ability design, expressive pose language, clean stylized materials, strong color blocking, restrained gameplay-safe VFX, and a premium polished finish.

Design [character name], a [role] hero. Core fantasy: [core fantasy]. Weapon/tool: [weapon or tool]. Ability motif: [ability motif]. The design must instantly communicate [role qualities].

Show the character in [pose]. Framing: [framing]. Background: [background].

Prioritize large readable forms, clear upper-body identity anchors, roster-ready readability, and an original iconic game-ready design. Keep the result stylized, toyetic, optimistic, and readable at a glance. Avoid photorealism, gritty military realism, muddy palettes, tiny hard-surface greeble noise, and VFX that obscure the character.

Optional notes:
Palette/material notes: [optional]
Theme/skin notes: [optional]
Extra constraints: [optional]
````

---

## Field Guidance

| Field                    | Guidance                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[asset type]`           | Usually `single hero concept`, `skin variant`, `three-hero lineup`, or `split hero + first-person presentation`.                                                                            |
| `[role]`                 | Usually `support`, `tank`, or `damage`.                                                                                                                                                     |
| `[role qualities]`       | Support: `support, mobility, defensive utility`. Tank: `durability, protection, close-range threat`. Damage: `aggression, speed`, or `precision, offensive threat`, depending on archetype. |
| `[pose]`                 | Be explicit. Good prompts describe stance, arm language, tool use, and emotional state.                                                                                                     |
| `[framing]`              | Usually `full-body`, `three-quarter full-body`, or `lineup`.                                                                                                                                |
| `[background]`           | Usually `clean neutral background` for pure character evals. Use `minimal scenic base` or `light map context` only when testing environmental integration.                                  |
| `Palette/material notes` | Use this only when color identity matters.                                                                                                                                                  |
| `Theme/skin notes`       | Use this for skin probes.                                                                                                                                                                   |
| `Extra constraints`      | Use this to enforce toyetic readability, originality, or first-person matching.                                                                                                             |

---

## Concrete Examples

### Example 1 — Support Hero Ready Pose

```text
Create an original premium stylized 3D hero-shooter single hero concept. Do not copy any existing Overwatch character, skin, weapon, map, logo, or official artwork. Target Overwatch-class craft: bold role-first silhouette, readable weapon/tool and ability design, expressive pose language, clean stylized materials, strong color blocking, restrained gameplay-safe VFX, and a premium polished finish.

Design Aegis Bloom, a support hero. Core fantasy: a mobile biotech field medic who protects allies with floating petal-shield drones. Weapon/tool: compact healing projector. Ability motif: floating petal-shield drones and protective healing energy. The design must instantly communicate support, mobility, and defensive utility.

Show the character in a full-body ready pose, relaxed but alert, weight centered, one foot forward, one hand directing a hovering petal-shield drone, the other hand holding the healing projector. Framing: full-body. Background: clean neutral background.

Prioritize large readable forms, clear upper-body identity anchors, roster-ready readability, and an original iconic game-ready design. Keep the result stylized, toyetic, optimistic, and readable at a glance. Avoid photorealism, gritty military realism, muddy palettes, tiny hard-surface greeble noise, and VFX that obscure the character.

Optional notes:
Palette/material notes: bright optimistic biotech support palette with white, soft mint, floral accents, and controlled healing-energy colors.
Theme/skin notes:
Extra constraints: keep the design premium, iconic, and not realistic.
```

---

### Example 2 — Support Hero Action Pose

```text
Create an original premium stylized 3D hero-shooter single hero concept. Do not copy any existing Overwatch character, skin, weapon, map, logo, or official artwork. Target Overwatch-class craft: bold role-first silhouette, readable weapon/tool and ability design, expressive pose language, clean stylized materials, strong color blocking, restrained gameplay-safe VFX, and a premium polished finish.

Design Aegis Bloom, a support hero. Core fantasy: a mobile biotech field medic who protects allies with floating petal-shield drones. Weapon/tool: compact healing projector. Ability motif: floating petal-shield drones and protective healing energy. The design must instantly communicate support, mobility, and defensive utility.

Show the character in a full-body action pose during a healing burst: sliding laterally, one knee bent, torso twisted, one arm extended to direct a curved fan of translucent petal-shields toward allies, the other hand channeling a healing glow through the projector. Framing: full-body. Background: clean neutral background.

Prioritize large readable forms, clear upper-body identity anchors, roster-ready readability, and an original iconic game-ready design. Keep the result stylized, toyetic, optimistic, and readable at a glance. Avoid photorealism, gritty military realism, muddy palettes, tiny hard-surface greeble noise, and VFX that obscure the character.

Optional notes:
Palette/material notes: same core palette as the base version; restrained supportive energy effects only.
Theme/skin notes:
Extra constraints: the body silhouette and support tools must remain the primary read.
```

---

### Example 3 — Tank Defensive Brace

```text
Create an original premium stylized 3D hero-shooter single hero concept. Do not copy any existing Overwatch character, skin, weapon, map, logo, or official artwork. Target Overwatch-class craft: bold role-first silhouette, readable weapon/tool and ability design, expressive pose language, clean stylized materials, strong color blocking, restrained gameplay-safe VFX, and a premium polished finish.

Design Bastion Ram, a tank hero. Core fantasy: a frontline protector who absorbs pressure and creates space for allies. Weapon/tool: massive impact hammer and forearm hard-light barrier generator. Ability motif: compact barrier deployment and short-range shock-impact force. The design must instantly communicate durability, protection, and close-range threat.

Show the character in a defensive brace pose: feet planted wide, shoulders forward, one forearm projecting a half-raised barrier, hammer lowered but ready, center of gravity heavy and grounded. Framing: full-body. Background: clean neutral background.

Prioritize large readable forms, clear upper-body identity anchors, roster-ready readability, and an original iconic game-ready design. Keep the result stylized, toyetic, optimistic, and readable at a glance. Avoid photorealism, gritty military realism, muddy palettes, tiny hard-surface greeble noise, and VFX that obscure the character.

Optional notes:
Palette/material notes: bold tank palette with strong value separation and durable industrial-tech materials.
Theme/skin notes:
Extra constraints: the silhouette should feel broad, planted, and unmistakably tank-like.
```

---

### Example 4 — Damage Flanker Mid-Dash

```text
Create an original premium stylized 3D hero-shooter single hero concept. Do not copy any existing Overwatch character, skin, weapon, map, logo, or official artwork. Target Overwatch-class craft: bold role-first silhouette, readable weapon/tool and ability design, expressive pose language, clean stylized materials, strong color blocking, restrained gameplay-safe VFX, and a premium polished finish.

Design Volt Viper, a damage hero. Core fantasy: a fast aggressive flanker who darts through fights with twin arc pistols and short electric dash bursts. Weapon/tool: twin arc pistols. Ability motif: short electric movement bursts and fast close-range pressure. The design must instantly communicate aggression, speed, and offensive threat.

Show the character in a full-body mid-dash attack pose: torso leaning hard into motion, one leg extended behind, one knee lifted, one pistol aimed forward, the other tracking to the side, with a clean ribbon-like electric motion accent reinforcing direction. Framing: full-body. Background: clean neutral background.

Prioritize large readable forms, clear upper-body identity anchors, roster-ready readability, and an original iconic game-ready design. Keep the result stylized, toyetic, optimistic, and readable at a glance. Avoid photorealism, gritty military realism, muddy palettes, tiny hard-surface greeble noise, and VFX that obscure the character.

Optional notes:
Palette/material notes: high-contrast flanker palette with energetic accent lighting.
Theme/skin notes:
Extra constraints: speed should read immediately, but the hero must not dissolve into VFX noise.
```

---

### Example 5 — Legendary Skin Variant

```text
Create an original premium stylized 3D hero-shooter skin variant. Do not copy any existing Overwatch character, skin, weapon, map, logo, or official artwork. Target Overwatch-class craft: bold role-first silhouette, readable weapon/tool and ability design, expressive pose language, clean stylized materials, strong color blocking, restrained gameplay-safe VFX, and a premium polished finish.

Design Storm Ronin, a premium legendary skin variant for Volt Viper, a damage hero. Core fantasy: a storm-samurai reinterpretation of a fast aggressive flanker. Weapon/tool: twin arc pistols. Ability motif: short electric movement bursts and fast close-range pressure. The design must instantly communicate aggression, speed, and offensive threat.

Show the character in a dynamic ready-to-strike pose, one pistol angled down, the other raised, body twisted with forward intent, cloth accents reacting to motion. Framing: full-body. Background: clean neutral background.

Prioritize large readable forms, clear upper-body identity anchors, roster-ready readability, and an original iconic game-ready design. Keep the result stylized, toyetic, optimistic, and readable at a glance. Avoid photorealism, gritty military realism, muddy palettes, tiny hard-surface greeble noise, and VFX that obscure the character.

Optional notes:
Palette/material notes: premium storm palette with deep charcoal, electric blue, and sharp highlight accents.
Theme/skin notes: preserve the base hero’s silhouette anchors, flanker readability, twin-pistol identity, and movement fantasy.
Extra constraints: this must read as the same roster hero in a new skin, not as a completely different character.
```

---

### Example 6 — Three-Hero Lineup

```text
Create an original premium stylized 3D hero-shooter three-hero lineup. Do not copy any existing Overwatch character, skin, weapon, map, logo, or official artwork. Target Overwatch-class craft: bold role-first silhouette, readable weapon/tool and ability design, expressive pose language, clean stylized materials, strong color blocking, restrained gameplay-safe VFX, and a premium polished finish.

Design a three-hero roster reveal lineup:
1) Bastion Ram, a tank hero. Core fantasy: frontline protector who creates space for allies. Weapon/tool: impact hammer and forearm barrier. Ability motif: protective barrier and close-range force.
2) Aegis Bloom, a support hero. Core fantasy: mobile biotech field medic who protects allies with floating petal-shield drones. Weapon/tool: compact healing projector. Ability motif: floating petal-shield drones and protective healing energy.
3) Volt Viper, a damage hero. Core fantasy: fast aggressive flanker with twin arc pistols and short electric dash bursts. Weapon/tool: twin arc pistols. Ability motif: electric movement bursts and offensive pressure.

The lineup must instantly communicate clear role separation: tank as durability and protection, support as mobility and defensive utility, damage as aggression and speed.

Show all three characters in distinct full-body hero poses on a clean shared background, arranged like a polished roster reveal. Framing: lineup. Background: clean neutral background.

Prioritize large readable forms, clear upper-body identity anchors, roster-ready readability, and an original iconic game-ready design. Keep the result stylized, toyetic, optimistic, and readable at a glance. Avoid photorealism, gritty military realism, muddy palettes, tiny hard-surface greeble noise, and VFX that obscure the character.

Optional notes:
Palette/material notes: the trio should feel like they belong to one game while keeping clearly distinct role silhouettes and color identities.
Theme/skin notes:
Extra constraints: each hero must be unmistakably different at a glance.
```

---

### Example 7 — Hero + First-Person Weapon Split

```text
Create an original premium stylized 3D hero-shooter split presentation. Do not copy any existing Overwatch character, skin, weapon, map, logo, or official artwork. Target Overwatch-class craft: bold role-first silhouette, readable weapon/tool and ability design, expressive pose language, clean stylized materials, strong color blocking, restrained gameplay-safe VFX, and a premium polished finish.

Design Pulse Shepherd, a support hero. Core fantasy: a rescue specialist who rapidly stabilizes allies and directs a compact command drone. Weapon/tool: compact beam-link support device. Ability motif: rescue-link energy and wrist-mounted command-drone utility. The design must instantly communicate support, responsiveness, and defensive utility.

Show a split presentation: on the left, a full-body three-quarter hero pose; on the right, a first-person gameplay view showing the hands, weapon, and command-drone visual language. Framing: split hero and first-person presentation. Background: clean neutral background.

Prioritize large readable forms, clear upper-body identity anchors, roster-ready readability, and an original iconic game-ready design. Keep the result stylized, toyetic, optimistic, and readable at a glance. Avoid photorealism, gritty military realism, muddy palettes, tiny hard-surface greeble noise, and VFX that obscure the character.

Optional notes:
Palette/material notes: clean support-tech palette with warm rescue accents.
Theme/skin notes:
Extra constraints: the full-body hero and the first-person weapon view must clearly feel like the same hero.
```

---

## Recommended Use

For the highest-signal manual check, start with these four:

1. Example 1 — Support Hero Ready Pose
2. Example 3 — Tank Defensive Brace
3. Example 4 — Damage Flanker Mid-Dash
4. Example 5 — Legendary Skin Variant

That set gives fast signal on:

* role clarity
* silhouette quality
* pose language
* roster breadth
* skin preservation

Use Example 6 when testing lineup cohesion and separation.
Use Example 7 when testing whether weapon presentation and hero identity still match.

---

## Fast Evaluation Checklist

Use this short checklist when comparing outputs:

* silhouette reads immediately
* role is obvious at a glance
* weapon / tool function is clear
* pose communicates the intended gameplay fantasy
* VFX support the read instead of obscuring it
* overall finish feels premium and roster-ready
* the design feels original rather than derivative
* skins preserve identity rather than replacing it

Failing outputs usually show one of these patterns:

* generic sci-fi hero with weak anchors
* pretty rendering but muddy role read
* too much VFX / particle clutter
* too much realism or tiny hard-surface detail
* skin variant that breaks base-hero recognition
* roster lineup with samey silhouettes