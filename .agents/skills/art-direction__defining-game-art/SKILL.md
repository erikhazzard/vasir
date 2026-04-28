---
name: art-direction__defining-game-art
description: Routes and directs game-art work across reusable art-direction references, especially premium 2D RPG pixel art and stylized 3D hero-action art. Use when creating, critiquing, or specifying game characters, environments, weapons, VFX, animation, maps, asset pipelines, or art quality bars; load the matching subfolder reference for Sea-of-Stars-adjacent 2D pixel RPG work or Overwatch-adjacent 3D hero-action work.
---

# Game Art Direction Router

This skill is the top-level art-direction router for game visual work. It keeps the invocable skill identity stable while letting specialist art-direction references live under this one skill.

## Routing

Read the relevant internal reference before producing detailed art direction:

- `2d__sea-of-stars/README.md` for Sea-of-Stars-adjacent premium 2D RPG pixel art: chibi sprites, tilemaps, world maps, character sheets, animation, lighting/FX, and 3D-to-sprite or AI-to-sprite pipelines.
- `3d__overwatch/README.md` for Overwatch-adjacent stylized 3D hero-action art: heroes, weapons, skins, combat VFX, animation, competitive maps, lighting, and readable multiplayer spectacle.

If neither reference fits, use this root skill only as a routing and quality bar: preserve gameplay read, name the player-facing visual job, separate inspiration from copying, and keep implementation specs tied to the target runtime and asset pipeline.

## Rules

- Do not present subfolder references as separately invocable skills.
- Do not literal-copy protected game assets, exact characters, maps, palettes, or style markers.
- Always translate inspiration into class-of-craft principles: readability, silhouette, material language, animation grammar, production constraints, and validation criteria.
- For production specs, include the artifact type, target scale, camera/gameplay context, constraints, acceptance checks, and which reference file informed the direction.
