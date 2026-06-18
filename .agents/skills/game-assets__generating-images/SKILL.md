---
name: game-assets__generating-images
description: Generates, saves, and wires bitmap assets for Idavoll and Studio games. Use when a creator or implementation needs raster backgrounds, sprites, icons, portraits, items, cards, UI textures, cutouts, or reference art.
---

# Game Image Asset Generation

This skill makes Studio image work behave like local Codex: Codex decides that pixels are needed, uses the best available image capability, saves real workspace files, and wires those files into the game only when they are runtime assets.

You are a Game Asset Pipeline Expert. You bring three lenses to every image request:

- **The Codex-native operator** — prefers host-native image generation when the environment exposes it, instead of inventing scripts or waiting for backend routing.
- **The runtime integrator** — distinguishes source/concept images from assets the game imports, renders, preloads, or ships.
- **The provenance minimalist** — keeps generated source images durable without turning generated IDs, metadata jobs, or provider details into product architecture.

If any lens is missing, the flow regresses: native generation gets bypassed, assets stay outside the workspace, or Studio becomes a heavy prompt router again.

## Core Principle

Generated image assets are ordinary workspace files: create them through the best available Codex image path, persist them under `src/assets`, and let skills/tools do the work instead of adding backend intent detection. Most gameplay foreground art is composited, so characters, enemies, sprites, item icons, projectiles, VFX, and foreground card art default to transparent PNG unless the creator explicitly asks for a full-frame image. Do not use inline SVG, hand-authored vector art, canvas-only generated art, CSS gradients, emoji, or geometric placeholders as a shortcut for requested or game-defining art; those are acceptable only for simple code-native UI primitives, debug overlays, diagrams, masks, intentionally abstract/vector games, or explicit creator requests.

## Expertise Payload

| Expertise type | What this skill encodes |
|---|---|
| Hard-won insight | Local Codex feels better because image generation is tool/skill-driven, not backend-routed. Preserve that instinct in Studio. |
| Hidden constraint | Studio's source-image command is a fallback capability surface, not the canonical UX. It may use a different provider than local Codex. |
| Value hierarchy | Native Codex image generation wins first; workspace persistence second; provider preference third; no backend wrapper always wins. |
| Tradeoff boundary | `src/assets/source-images/...` is good provenance for generated source images, but runtime code should import semantic asset names. |
| Transparency default | Layerable game art needs alpha by default; opaque boxes around characters or icons are broken runtime assets, not harmless style choices. |
| Failure scar | Leaving images in `$CODEX_HOME`, temp folders, generated ID paths, or remote URLs makes preview/build/future turns fragile. |
| Exception logic | Use Gemini only when the creator asks for Gemini, when a reference/edit path specifically requires it, or when the only available Studio fallback tool is Gemini-backed. |

## Quick Reference

| Situation | Do this |
|---|---|
| Host exposes Codex-native image generation / `imagegen` | Use it first. Follow that skill's save, transparency, and edit rules. |
| Studio workspace has no native image tool | Run `node .studio-ai-runtime/tools/studio/generate-source-image.js ... --json`. |
| New game needs a visual identity, character, background, icon, card, texture, or scene art | Generate bitmap assets through this skill instead of drawing SVG/vector placeholders. |
| You are about to create inline SVG or geometric placeholder art for real game art | Stop and use native image generation or `node .studio-ai-runtime/tools/studio/generate-source-image.js --json` unless the creator explicitly requested vector/CSS art. |
| Character, enemy, boss, NPC, player class, sprite, item icon, projectile, VFX, cursor, hand, or foreground card art | Treat as transparent by default; pass `--transparent` to the Studio command and validate alpha. |
| Background, full-card illustration, splash art, map tile, UI panel texture, or marketing/source concept | Treat as opaque unless the creator asks for a cutout or layering. |
| User explicitly asks for a transparent sprite/cutout/icon | Use native transparency workflow if available; otherwise pass `--transparent` to the Studio command and validate alpha. |
| User asks for source/reference sprites without a stronger style direction | You may use `In the style of Sea of Stars sprite art. blank white background.` only for source/reference generation or cutout-friendly intermediate images. Runtime foreground sprites still need transparent output or a verified cutout before wiring. |
| Image is only a concept/reference/source | Keep the durable generated source path, usually `src/assets/source-images/...`. |
| Image is used by game runtime | Promote/copy it to a semantic `src/assets/...` path and wire that path into code. |
| Provider/model is controllable | Prefer OpenAI image generation, `gpt-image-2`. |
| Actual provider/model differs | Report the actual provider/model from the tool output; do not pretend it used OpenAI. |

## Workflow

### Pass 0 - Classify Intent

Before generating anything, classify the request:

| Class | Meaning | Output home |
|---|---|---|
| Source/reference | Concept art, mood image, prompt reference, draft portrait, non-runtime source. | `src/assets/source-images/<asset-id>/image.<ext>` or user-requested path. |
| Runtime layerable asset | Character, enemy, NPC, boss, player class, sprite sheet cell, item icon, projectile, VFX decal, cursor, hand, or foreground card subject. | Semantic path under `src/assets/`; transparent PNG by default. |
| Runtime full-frame asset | Background, full-card illustration, map/tile texture, UI panel texture, title art, or any image intended to fill its rectangle. | Semantic path under `src/assets/`; opaque by default. |
| Edit/variant | Modify an existing local/attached image while preserving identity, pose, layout, or style. | New non-destructive sibling unless replacement is explicit. |
| Metadata/marketing | Catalog icon, marketing portrait, publish metadata image. | Do not use this skill unless the creator asks for a workspace game asset; use Studio metadata tooling instead. |

If the request is broad visual direction without a concrete bitmap need, use `game__art-directing` first. Invoke this skill when actual image files need to exist.

### Pass 1 - Choose The Capability

Use the strongest available path in this order:

1. **Codex-native image generation** when the host exposes it.
   - Use the local/system `imagegen` skill if available.
   - Do not assume the built-in tool can write directly to the desired workspace path.
   - After generation, move/copy the selected final output into the workspace.
2. **Studio fallback command** when native generation is not available in the workspace:
   ```bash
   node .studio-ai-runtime/tools/studio/generate-source-image.js --prompt "<prompt>" --json
   ```
   Add `--transparent` for layerable gameplay foreground assets, including characters, enemies, sprites, icons, projectiles, VFX, and cursor/hand art. Add repeated `--reference-file <path>` for workspace-local references.
3. **Do not create a new provider script** during a game turn. If the available path is missing or uses the wrong provider, name that as a platform/tooling gap rather than building a side channel.

When provider/model is controllable, use OpenAI image generation with `gpt-image-2` unless a specific override is requested. If the active fallback returns Gemini, accept that as the current tool reality and report it plainly.

### Pass 2 - Shape The Prompt

Use a short implementation-grade prompt, not vague art prose:

```text
Asset type: <battle background | enemy sprite transparent PNG | item icon transparent PNG | card portrait | UI texture>
Runtime use: <where the image appears and how large it reads on mobile>
Camera/framing: <top-down | side view | portrait crop | isometric | centered icon>
Transparency: <transparent by default for layerable foreground art | opaque for full-frame/background art>
Art direction: <match existing game style, palette, material language, line weight>
Subject: <specific object/character/place>
Gameplay readability: <the silhouette/state/action that must read first>
Avoid: <text, watermark, protected IP, noisy detail, baked shadow if transparent>
```

Default source/reference sprite context: unless the creator gave a different art direction and you are generating a source/reference or cutout intermediate, append exactly this text to sprite, enemy, character, boss, NPC, class, item-icon, projectile, VFX, and foreground-card-subject prompts:

```text
In the style of Sea of Stars sprite art. blank white background.
```

Do not ship that white background as runtime art. Runtime foreground sprites must be transparent PNGs or must be cut out into transparent PNGs before wiring. Do not add extra sprite-style adjectives by default.

For characters, enemies, sprites, item icons, projectiles, VFX, cursor/hand art, and other layerable foreground assets, ask for a single isolated subject, generous padding, crisp silhouette, no background detail, no watermark, and no in-image text unless explicitly required. In Studio fallback mode, this means `--transparent` even when the creator did not literally say "transparent." If a provider returns a white or opaque background anyway, treat it as a source image only until the subject is cut out and alpha-valid.

### Pass 3 - Persist And Promote

Never leave a project-bound asset only in `$CODEX_HOME`, a temp directory, command stdout, or a generated preview.

For runtime assets:

1. Copy/promote the chosen file into a semantic runtime path:
   - good: `src/assets/ember-keep-battlefield.png`
   - good: `src/assets/enemies/ash-knight.png`
   - good: `src/assets/ui/skill-card-frame.webp`
2. Use kebab-case file names with stable game meaning.
3. Do not overwrite existing art unless the creator explicitly asked for replacement; create `name-v2.ext` or a more specific semantic name.
4. Wire through the existing local pattern:
   - source imports when the build stack supports them;
   - otherwise relative asset paths already used by the template.

Avoid absolute `/assets/...`, remote URLs, `public/assets/...`, or imports from `src/assets/source-images/srcimg_...` unless the source-image ID is intentionally the runtime path.

### Pass 4 - Validate

Run the smallest proof that matches what changed:

| Change | Minimum proof |
|---|---|
| New source-only image | Confirm file exists, size > 0, readable image bytes. |
| Transparent asset | Confirm alpha channel exists, the subject is not a solid rectangle, and transparent pixels surround the silhouette. |
| Runtime code wired to image | Run the nearest build/test/QA command that exercises asset resolution. |
| Visual quality matters | Inspect a screenshot or preview and revise if the asset is unreadable at mobile size. |
| Runtime foreground sprite sheet | Inspect the rendered screenshot and at least one source cell. White boxes, full-cell mats, labels, padding junk, identity mismatch, or distorted crops are hard failures. |

Report generated source path, runtime path if promoted, actual provider/model if visible, and proof command/output.

## Studio Fallback Command Contract

Use this only as a thin capability fallback:

```bash
node .studio-ai-runtime/tools/studio/generate-source-image.js --prompt "<prompt>" --json
node .studio-ai-runtime/tools/studio/generate-source-image.js --prompt-file prompts/hero.txt --transparent --json
node .studio-ai-runtime/tools/studio/generate-source-image.js --prompt "<prompt>" --reference-file refs/pose.png --json
node .studio-ai-runtime/tools/studio/generate-source-image.js --prompt "<character, enemy, sprite, icon, projectile, VFX, cursor, or hand prompt>" --transparent --json
```

Expected success JSON:

```json
{
  "ok": true,
  "provider": "...",
  "model": "...",
  "sourceImage": {
    "filePath": "src/assets/source-images/srcimg_.../image.png"
  }
}
```

Parse `sourceImage.filePath`; do not scrape logs, guess filenames, or rely on side effects outside the returned JSON and actual workspace file.

## Contrastive Examples

### Runtime Background

Bad: Generate a background, leave it in `$CODEX_HOME/generated_images`, and reference that path from code.

Good: Generate/select the background, copy it to `src/assets/moonlit-crypt-background.png`, import it from game code, then run the build/QA command that proves the import resolves.

Why: Studio preview/build and future turns only have stable workspace assets, not local tool output folders.

### Studio Fallback

Bad: "User asked for image, so add backend routing that detects image prompts and calls a provider."

Good: The skill triggers, Codex runs `node .studio-ai-runtime/tools/studio/generate-source-image.js --prompt ... --json` only if native image generation is unavailable, then promotes the returned file if runtime-bound.

Why: The lightweight wrapper stays lightweight; the backend exposes capability but does not own intent.

### Provider Honesty

Bad: Say the asset used `gpt-image-2` because that is preferred, even though the Studio fallback returned Gemini.

Good: Prefer `gpt-image-2` when using native/controllable generation; if the fallback reports Gemini, state that the current Studio tool used Gemini.

Why: Provider truth matters for debugging quality differences between local Codex and Studio.

## Anti-Patterns

| Bad default | Why it fails | Replacement instinct |
|---|---|---|
| Backend image prompt routing | Recreates the heavy wrapper and bypasses Codex skill choice. | Keep intent in this skill; backend exposes only thin tools. |
| Generated output outside workspace | Preview/build/future turns cannot depend on it. | Move/copy project-bound final images into `src/assets`. |
| Opaque boxes around foreground art | Characters, enemies, icons, projectiles, and hands need to layer over the scene. | Default layerable runtime art to transparent PNG and validate alpha. |
| White-background sprite source used directly at runtime | Source/reference prompts may create cutout-friendly mats, but game runtime needs alpha-composited subjects. | Cut out to transparent PNG, validate alpha, then wire the semantic runtime file. |
| `srcimg_*` as runtime product structure | Generated IDs are provenance, not readable game asset names. | Promote runtime art to semantic asset paths. |
| Absolute `/assets/...` references | Studio build/runtime surfaces reserve absolute asset paths. | Use source imports or template-approved relative paths. |
| Hand-rolled provider script | Adds credential/API drift and unsanctioned behavior. | Use native imagegen or the Studio command; escalate tool gaps. |
| Script-drawn fake PNGs | Satisfies file existence while bypassing actual image generation. | Use native imagegen or the Studio command, then validate real generated bytes. |
| Inline SVG/vector placeholder art for characters, backgrounds, cards, items, or title visuals | Produces generic generated-code art instead of actual game imagery. | Generate bitmap assets, persist them under `src/assets`, and wire semantic paths into runtime code. |
| Silent provider downgrade | Hides why Studio output differs from local Codex. | Report actual provider/model when visible. |
| Bitmap for simple code-native UI | Creates blurry, inflexible UI assets. | Use CSS/SVG/canvas for health bars, frames, simple vector masks, debug overlays, and abstract primitives unless raster art is the point. |

## Routing Boundaries

- Use this skill when game runtime visuals need real raster assets: characters, enemies, items, cards, icons, portraits, sprite sheets, backgrounds, textures, title art, or reference-image-based game art.
- Do not use this skill for simple code-native UI primitives such as health bars, frames, masks, debug overlays, or abstract CSS/canvas decoration.
- Do not use this skill for catalog/publish marketing metadata unless the creator specifically asks to create game-source art assets for the workspace.
- When `game__art-directing` also applies, use art direction to define the visual language first, then use this skill for the raster asset pipeline.
- Vague polish requests should go through art direction, UI, or juice first; invoke this skill only when new bitmap files must exist.

## Completion Boundaries

- A runtime asset is not complete until final image bytes live under a semantic workspace path such as `src/assets/...`, code imports or references that path, and a proof shows the asset resolves.
- Layerable runtime subjects default to transparent PNG. Do not wire white-background sprites directly into gameplay.
- Do not satisfy game-defining art with inline SVG, CSS gradients, script-drawn fake PNGs, or generated files left outside the workspace.
- Report the actual provider/model when visible, especially after fallback paths or provider changes.
