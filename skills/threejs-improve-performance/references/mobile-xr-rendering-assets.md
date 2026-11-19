# Rendering and assets

## Contents

- [Draw-call categories](#1-start-with-draw-call-categories-not-a-magic-global-draw-limit)
- [Environment geometry and LOD](#2-environment-geometry-and-lod)
- [Texture policy](#3-texture-policy-remove-resize-compress-then-repack)
- [Packing](#4-packing-standard-first-custom-only-when-worthwhile)
- [Sidedness and transparency](#5-no-blanket-doubleside)
- [Baked lighting and dynamic shading](#6-bake-lighting-retain-only-a-deliberate-dynamic-path)

## 1. Start with draw-call categories, not a magic global draw limit

Break actual submissions into environment, avatars, hands/accessories, world UI, VFX,
and additional passes. Inspect material groups, shader/program variants, textures,
transparency, and view/pass duplication. A scene-object count is not a draw-call count.
Build the scene budget from target-hardware evidence rather than inventing a universal
safe number. [S1, S7]

Prefer this order: remove invisible/dead work; correct culling; reuse materials; instance
repeated compatible rigid objects; merge static geometry **within useful spatial chunks**;
then consider more specialized batching. `BatchedMesh` and `InstancedMesh` have different
capabilities; inspect the installed implementation and extension/fallback path. A shared
material alone does not batch separate meshes. [S3, S8]

Preserve bounds and culling granularity. A giant merged mesh or instance batch may submit
far more offscreen geometry. Use spatial partitions appropriate to visibility. Do not
merge moving and static objects into a per-frame rebuild. Do not improve a draw counter
by exploding texture size, material complexity, overdraw, or dynamic buffer uploads.

## 2. Environment geometry and LOD

Inspect wireframe at actual gameplay viewpoints. Find tiny props with dense tessellation,
repeated bevels, hidden undersides/interiors, and inconsistent density. Balance density
by silhouette, deformation, and projected size—not equal triangles per square meter.
Wireframe is a diagnostic, not a valid production timing comparison.

Author near/mid/far simplifications for substantial and heavily repeated assets. Remove
small detail, materials, and costly maps along with triangles. Tiny simple meshes may
only need culling/instancing rather than three extra LOD assets. Use hysteresis; avoid
blended crossfades that temporarily double draws without a measured visual need. [S6]

Respect occlusion/spatial partitioning, but do not introduce synchronous GPU readbacks
or a complicated occlusion system before using existing coarse visibility information.
Freeze local transform recomputation only for truly static objects and keep world
matrices correct when parents change. Cheap stale transforms are still incorrect.

## 3. Texture policy: remove, resize, compress, then repack

Normal authoring range is 256–512 px per dimension. A 1024 texture requires a named visual
reason; 2k/4k authored surface textures fail our house rules. This includes oversized atlases:
a batching optimization is not permission to bypass the texture contract. Fonts, video,
lightmaps, and other specialized resources need an explicit class-specific budget.
Never apply these surface-image limits to the headset's eye buffers.

Audit actual runtime dimensions, unique GPU allocations, mip levels, format, and map use.
Small PNG/JPEG/WebP transfer size is not small decoded/GPU memory. For an ordinary
uncompressed RGBA8 square with a full mip chain, approximate memory is
`width × height × 4 × 4/3` bytes. Thus 256 ≈ 0.33 MiB, 512 ≈ 1.33 MiB,
1024 ≈ 5.33 MiB, 2048 ≈ 21.33 MiB, and 4096 ≈ 85.33 MiB.
Halving both dimensions quarters that storage; it does **not** guarantee 4× faster
rendering. Compression, allocation padding, layers, copies, and render targets change
the calculation. [S9]

Use this reduction order:

1. Delete unused maps and replace constant maps with scalar material values. For an
   entirely nonmetal material, remove the metalness map and explicitly set metalness=0.
   When ORM is shared, drop a slot without disposing data still needed by roughness/AO.
2. Retain the lowest color resolution that preserves identity/readability. Test normals
   a tier lower or remove them where they do not survive headset viewing. Protect visible
   near-field detail; normal-map removal is not automatically equivalent.
3. Test roughness/metalness one or more tiers below color. Broad masks can be 64–256 px;
   uniform values should be scalars, not tiny uniform textures. Roughness can still be
   visually important—do not remove actual material identity blindly.
4. Use an existing KTX2/Basis pipeline with target-supported GPU formats; inspect the
   actual transcode target and normal/mask quality. Stage transcoding/upload work. [S10]

Retain appropriate mipmaps to reduce shimmer and minification cost. Avoid maximum
anisotropy everywhere. Budget environment maps/cubemaps and intermediate targets too.
Share resources and dispose only when their last owner releases them. [S9, S11]

## 4. Packing: standard first, custom only when worthwhile

Standard glTF metallic-roughness uses **G=roughness, B=metallic**; an occlusion texture
reads **R**. One image can serve both as ORM when its UV/sampler setup is compatible.
Therefore red is not universally empty. Base-color RGB is color data; material masks
and normal data are linear/non-color. Preserve their decoding. [S12, S13]

A reused image can reduce unique texture memory without guaranteeing a single texture
lookup. The inspected stock roughness and metalness shader chunks contain separate
sampling expressions. Count image allocations, sampler bindings, and generated shader
lookups separately; do not promise a lookup reduction without inspecting the path. [S14]

**Optional two-texture material contract:**

| Texture | Proposed content | Conditions |
|---|---|---|
| A | Base color RGB; roughness A | Alpha is not needed for opacity/cutout, is retained through tooling/compression, remains linear, and is not premultiplied into color. |
| B | Tangent-space normal RGB; metallic A | Alpha is retained; custom sampling consumes it without another fetch. Normal data remains non-color. |

An alternative stores normal XY in RG and metallic in B, reconstructing nonnegative
normal Z and renormalizing. This **changes normal encoding** and only applies where
that hemisphere assumption is valid. Never overwrite the blue channel of an ordinary
RGB normal map and leave the old decoder active.

Both designs need a custom material/loader contract and asset repacking. Check UVs,
transforms, mip/filter behavior, compression channels, opacity requirements, AO needs,
and actual resident memory. Packing couples resolution choices and may require a larger
format; two larger RGBA textures can lose to separate small masks. An additional AO map
would also defeat a literal two-image claim. Compare the complete material, not just
file count. Prefer scalar values or standard ORM before custom packing. [S12–S14]

## 5. No blanket DoubleSide

Use `FrontSide`; repair winding/normals and model intended visible surfaces. Truly thin
two-sided sheets may justify an exception; duplicated geometry also costs work.
For opaque materials, DoubleSide disables backface culling but does not inherently
create two draw calls. In the documented WebGL path, transparent DoubleSide can render
back and front separately. `forceSinglePass` is a targeted option where that two-pass
behavior has no visual benefit—not a universal transparency fix. [S15]

Prefer opaque surfaces and deliberate cutout foliage over large layers of blending.
Alpha-tested surfaces still have shader/overdraw costs. Treat transparent hair cards,
smoke, nameplates, additive particles, and screen-filling VFX as pixel-budget suspects.

## 6. Bake lighting; retain only a deliberate dynamic path

For fixed authored environments, prefer baked light/shading with a cheap material.
A lightmap needs correct UVs, color space, loading, and material support; verify the
export/import round trip rather than assuming glTF automatically wires custom bakes.
Keep the bake's extra textures within an explicit budget. [S13, S16]

For modular/movable/procedural kits, prefer baked AO/cavity and soft non-directional
form shading, not world-directional lightmaps that become wrong after rotation or
placement. Recompute placement-dependent shading on changes, not every frame.
Do not bake fixed world shadows into freely moved pieces.

Use zero realtime lights where baked/unlit content suffices. When dynamic characters
need directional response, permit **one unshadowed directional light**. Remove redundant
ambient/hemisphere light objects by replacing needed fill with a deliberate cheap baked
or shader term; do not equate deleting objects with eliminating all lighting arithmetic.

For a setup with a directional sun, ambient light, and hemisphere light, consolidate
needed fill into the chosen baked or cheap shader path and remove the extra light
objects. Ambient/hemisphere are shader contributions, not two separate scene render
passes. One directional light still has runtime shading cost. Measure the actual
materials and pixels; do not frame “three lights → one” as a guaranteed large win. [S17]

Prefer genuine vertex-lit diffuse for compatible dynamic stylized content: evaluate
lighting from the properly transformed/skinned normal at vertices, interpolate the
result, and keep fragment shading simple. This trades per-pixel detail/specular quality
for cheaper shading and depends on mesh density. Stock current `MeshLambertMaterial`
uses per-fragment shading; it is simpler than PBR, but not a vertex-lighting switch.
A normal texture only matters to lighting if the shader actually consumes it. [S18]

No realtime shadow maps, point/spot/area lights, dynamic cubemap captures, SSAO, bloom,
depth-of-field, SSR, or multipass outlines by default. Use painted/emissive appearance
and cheap baked/contact cues when appropriate. These are art/performance decisions,
not equivalent replacements for physically accurate light. Maintain a small material
family rather than an expensive do-everything shader.

Source keys: [primary sources](mobile-xr-sources.md).
