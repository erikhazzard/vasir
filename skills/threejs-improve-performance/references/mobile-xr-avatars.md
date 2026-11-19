# Avatars: geometry, skinning, hands, IK, and crowds

## Contents

- [Assembled avatar budgets](#1-count-the-assembled-avatar-not-the-cheapest-submesh)
- [Surfaces, submissions, and instancing](#2-reduce-surfaces-and-work-not-merely-object3d-count)
- [Rigid hands and attachments](#3-convert-truly-rigid-hands-and-attachments-to-ordinary-mesh)
- [Influences and shader work](#4-onetwo-influences-is-an-authoring-policy-not-a-stock-quality-switch)
- [Animation, IK, and deformation](#5-separate-animationik-from-gpu-deformation)
- [Coupled LOD policy and acceptance](#6-a-coupled-lod-policy)

Use this when avatars, animation, or crowd scale contributes meaningfully to the frame.
Numerical targets here are our production house rules, not Three.js hardware limits.

## 1. Count the assembled avatar, not the cheapest submesh

Inventory each production avatar's body, hair, clothing, eyes, mouth, hands, and attached
cosmetics. Report average **and maximum** vertices/triangles; the maximum enforces the
cap. Report each LOD and the maximum concurrently visible avatar population.

For ordinary triangle-list geometry, exported render vertices come from the position
attribute count; triangles come from indices/3, or positions/3 for non-indexed geometry.
Account for active draw ranges/groups when describing submitted work. UV, normal, and
material seams can split render vertices; vertices and triangles are not interchangeable.
Separate unique allocated geometry from per-avatar instances and per-eye/pass submissions.
Do not multiply a renderer counter by two until its stereo accounting is known. [S1]

Target 2.5k–3k triangles at LOD0. Enforce separate hard caps of 5k triangles and 5k
exported render vertices for the assembled avatar. Assess existing over-budget avatars
for roughly 50% reduction, **not blind decimation by half**.
Protect silhouette, face, hands, and joint deformation. Remove hidden body under clothing,
unseen interiors, tiny bevels, redundant loops, and expensive low-value accessories first.
Do not delete geometry that becomes visible when clothing or cosmetics change.

## 2. Reduce surfaces and work, not merely Object3D count

Aim for one compatible opaque skinned-body submission per view/pass. Consolidate mesh
surfaces only when material/atlas, skeleton/bind space, draw state, and customization allow
it. A merged geometry retaining many material groups still has many draws. Skinning is
not itself a requirement for extra draws; the cost also includes pose preparation,
skinning shader work, and palette data. [S1, S2]

Keep genuinely different transparency/material requirements separate. Never collapse
independently culled avatars into a world-sized batch just to improve a draw counter.
Share immutable geometry, textures, materials, and animation assets; keep pose state
independent where the characters actually differ.

**Instancing distinction:** `InstancedMesh` handles shared geometry/material with
per-instance data; it does not automatically supply independent bone palettes. A crowd
skinning solution needs explicit palette addressing, compatible rigs/materials, bounds,
and animation management. Shared geometry or a shared skeleton object is not independent
skinned instancing. Reuse an existing verified path before building one. [S2, S3]

## 3. Convert truly rigid hands and attachments to ordinary Mesh

Start with remote hands. Rigid pose meshes, a small grip-pose library, and wrist-relative
transforms can replace unnecessary finger skinning where finger deformation is not part
of the experience. Attach rigid accessories to the appropriate tracked/bone transform.

Do not convert an articulated hand to a rigid mesh and call it equivalent. Preserve local
tracked fingers, hand interaction, grip alignment, and visible continuity when required.
A rigid alternative may add draws: compare the net cost of transforms/submissions against
removed bones, IK, and skinning. Bake static poses offline where useful; never CPU-bake
all skinned vertices every frame as a supposed shortcut.

## 4. One/two influences is an authoring policy, not a stock quality switch

Use the smallest rig that preserves required deformation and interaction; do not adopt
a fixed joint count as a quality target. Inspect actual bone count, animation tracks,
nonzero influences, palette uploads, and IK chains independently.

Use one influence on rigid regions and try two on deforming regions. Preserve four only
where a named deformation needs it. Prune, renormalize, and validate extreme shoulders,
elbows, wrists, hips, and knees. Removing bones requires remapping skin indices, hierarchy,
bind data, and animation; removing a jaw bone while retaining its weights is broken.

**Three.js trap:** the inspected stock WebGL skinning chunks fetch four bone matrices
and accumulate four weighted transforms. Setting weights Z/W to zero is not an automatic
one-/two-influence shader variant. Do not invent a Unity-style `boneQuality` setting.
To claim reduced GPU skinning work, inspect the installed/generated shader; specialize
matrix fetches and position/normal/tangent skinning coherently, with a correct program
cache key. A weight-only edit may change quality without buying this GPU saving. [S4]

Prefer a small, maintained material variant or existing engine implementation. Do not
introduce fragile shader string patches without checking the project's version/backend.
The cost of a specialized variant must justify its maintenance and shader-variant count.

## 5. Separate animation/IK from GPU deformation

Ordinary Three.js rendering deforms skinned vertices in shaders; animation/IK and skeleton
matrix preparation still have CPU cost. CPU vertex work can reappear through animated
bounds calculations or exact skinned-mesh raycasts. Audit these call sites, not just the
AnimationMixer. Use valid conservative bounds and gameplay collision proxies instead
of repeatedly scanning every deformed vertex when exact geometry is unnecessary. [S2, S4, S5]

A conservative bound must cover the allowed pose envelope and transforms. Expand/update
it for extreme poses; a cheap stale bind-pose bound that culls arms is not a valid fix.
Turning `visible` off does not by itself stop application-owned animation, IK, or network
processing—explicitly manage the active presentation set.

For the jaw, choose static/baked mouth, a cheap jaw rotation, or a small expression set
according to speaking/identity requirements. Morph targets and baked animation textures
have costs too; “bake jaw” is a candidate simplification, not a guarantee.

For remote limbs, prefer a simple analytic two-bone solve when it fits. On an iterative
solver, test **two iterations**, then one, using the actual solver's iteration controls;
there is no portable Three.js “IK quality” setting. Measure hand-target error, elbow
stability, reach limits, and jitter. Do not reduce local input responsiveness to save
remote presentation work.

## 6. A coupled LOD policy

These are starting candidates, not measured optimal distances or rates:

| Presentation tier | Geometry/materials | Pose/IK work |
|---|---|---|
| Near / interaction | LOD0, protected face and hands, minimal opaque surfaces | Keep tracked head/hands responsive; solve only necessary chains. |
| Mid | Roughly 40–60% of LOD0 triangles; remove small accessories and subtle maps | Try 15–30 Hz noncritical pose solves with smooth presentation; remove fine fingers/facial work. |
| Far | Roughly 10–25% of LOD0 triangles or a simpler representation | Try 5–10 Hz simplified body pose; no unnecessary limb/finger solves. |
| Not visible | No rendering | Suspend unnecessary cosmetic work; retain required authoritative/gameplay/network state. |

Choose thresholds by apparent size, interaction importance, and headset inspection.
Use hysteresis and one consistent tier for both eyes; avoid stereo mismatches and rapid
LOD oscillation. Stagger avatar transitions/updates. Do not evaluate every LOD's mixer,
skeleton, and IK merely because all LOD meshes are loaded. [S6]

For remote state, send root/locomotion plus head and hands, with compact grip/expression
state only where needed. Reconstruct—not re-simulate the entire local player. Decouple
network arrival, body solves, and frame-rate interpolation. See
[Physics and networking](mobile-xr-physics-networking.md).

**Acceptance:** compare an isolated avatar and the crowded worst case; inspect faces,
hands, seams, extreme joints, grip transitions, speech, and near/far transitions in both
eyes. Report CPU animation/IK, submission, GPU time when available, and quality changes
separately. No universal “skinned meshes cost X times more” claim.

Source keys: [primary sources](mobile-xr-sources.md).
