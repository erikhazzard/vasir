# Animation, Skinning, Morphs, Particles, Raycasting, and Interaction Queries

Use this reference when main update, dynamic uploads, skinned/morphed rendering, particles, selection, interaction, or scene-query cost is in scope.

## 1. Measure active work, not registered content

Track:

```yaml
active_dynamic_work:
  mixers_active_over_total:
  clips_and_tracks_evaluated_per_frame:
  bones_updated:
  skinned_meshes_visible:
  morph_targets_active:
  particle_systems_active:
  particles_alive_visible:
  particle_bytes_uploaded:
  render_scene_rays_shapes_queries:
  query_candidates_and_hits:
  interaction_events_processed:
```

A project may own hundreds of clips or particle systems while only a small active set should update. Registered totals are context; evaluated tracks, touched bones, updated attributes, queried candidates, and shaded pixels are cost.

## 2. Animation mixer and track evaluation

Audit:

- mixers updated when no visible/meaningful action is active
- duplicate mixers or clocks per entity
- track count and interpolation type
- property bindings and lookups
- actions kept enabled at zero weight
- updates for off-screen or distant actors
- animation events/listeners and allocations
- large animation subtrees invalidated by one active parent

Potential interventions:

- update only active mixers
- pause or reduce update cadence for distant/off-screen actors as a quality/behavior trade
- remove unused tracks offline
- share immutable clips/resources
- use stable action state rather than recreating actions
- batch gameplay animation decisions before evaluation

Changing update cadence, interpolation, event timing, root motion, or off-screen behavior is not automatically equivalent. Verify gameplay and visual checkpoints.

## 3. Skinning

Skinning cost may include CPU skeleton updates, matrix propagation, bone texture/uniform upload, vertex shader work, draw submissions, and shadow passes.

Measure:

- visible skinned meshes per pass
- bones per skeleton and actually animated bones where knowable
- skeleton updates per frame
- vertex count × views/passes
- shadow-casting skinned meshes
- material/program variants
- GPU sensitivity to skinned mesh visibility

Non-obvious checks:

- many meshes may share a skeleton or clip but still duplicate draws
- off-screen skeleton updates can remain on CPU even when rendering is culled
- shadows can duplicate skinning work
- static bounds may be too loose or too tight for animated poses
- reducing bone count offline may help CPU uploads and vertex work but is an asset/quality trade

## 4. Morph targets

Track active morph count, updated weights, vertex count, pass count, and shader variants. Avoid writing unchanged weights every frame. Remove unused morph targets offline only when asset repipeline is allowed and visual semantics pass.

## 5. Particles

Separate four costs:

- simulation/update CPU or GPU
- spawn/despawn and allocation
- dynamic buffer upload
- draw/overdraw/shader/sorting

A particle pool can remove allocation while still uploading the full maximum buffer and shading enormous transparent quads. Measure alive/visible ratio, changed ranges, bytes uploaded, screen coverage, layer overlap, and GPU time.

### CPU particle path

Audit:

- per-particle objects and closures
- array compaction/splice
- random generation and curves
- full-buffer rewrite when only a subset changes
- sorting all particles
- world/local transform conversions

Prefer dense structures and bounded free lists when justified. Update only alive particles and changed ranges when supported.

### GPU particle path

Moving simulation to shaders/compute is an architecture change. Require evidence that CPU simulation/upload dominates and verify backend/device support, spawn/control semantics, readback needs, sorting, determinism/replay, and debugging complexity.

### Rendering

Audit:

- blended pixel coverage
- soft-particle depth reads
- texture fetches and shader branches
- per-particle sorting versus approximate/order-independent approaches
- depth write/test
- off-screen/behind-camera particles
- effect-resolution scaling

Particle count alone rarely identifies the real limit.

## 6. Raycasting and spatial queries

Separate query domains:

- detailed render-geometry selection
- broad gameplay collision/visibility
- UI interaction
- XR controller/hand rays
- AI/navigation/line of sight
- projectile sweeps

Measure:

- queries per frame/tick and caller
- candidate set size before detailed tests
- triangles/shapes tested
- filters/layers/groups
- result count and sorting
- allocations
- duplicate queries for the same origin/path
- static versus dynamic geometry

Use the spatial representation that matches the contract:

- Three.js raycasting or a render-geometry acceleration structure for visual mesh precision
- Rapier ray/shape/point queries for gameplay collision space
- coarse spatial partition before either when the candidate world is large

Do not query both systems and merge results by default. If visual and physics geometry differ, define which answer is authoritative for each interaction.

## 7. Query eligibility and caching

Safe candidates:

- cache immutable static acceleration structures
- reuse result arrays/scratch objects where APIs permit
- filter by layer/group and distance before detailed tests
- lower query cadence for noncritical distant AI as behavior trade
- coalesce identical queries within the same tick

Unsafe defaults:

- cache dynamic hit results across ticks
- raycast the entire scene for every pointer/hand joint
- allocate and sort all hits when only nearest is needed
- rebuild acceleration structures every frame
- replace physics queries with render rays without checking collider/render mismatch

## 8. Batching and picking

Instancing/batching changes object identity. Preserve:

- instance/batch ID to gameplay entity mapping
- generation after reuse
- hide/show and interaction layers
- per-object bounds or candidate partition
- raycast result semantics
- hover/selection stability

A draw-call optimization that forces an O(N) CPU scan for every pick may move the bottleneck rather than remove it.

## 9. Update frequency trades

Lowering animation, particle, AI-query, or interaction cadence can be high leverage, but it is a quality or behavior trade unless interpolation preserves the observed contract.

Declare:

```yaml
frequency_trade:
  authoritative_rate:
  presentation_rate:
  interpolation:
  maximum_staleness:
  event_timing:
  distance_or_visibility_policy:
  replay_impact:
```

Use hysteresis for distance/visibility tiers to avoid oscillation and repeated activation costs.

## 10. Action examples

### Active mixer reduction

```yaml
action:
  change: Stop updating mixers whose actions are disabled and whose actor has no gameplay-visible root motion or timed events.
  trade: intended_equivalent
  equivalence_status: untested
  prediction: animation-update p95 falls in crowd scene; render/GPU work remains unchanged
  semantic_surface: delayed events, root motion, reactivation pose, off-screen gameplay
  validation: active mixer/track count, update p95, animation event digest, reactivation checkpoints
```

### Particle quality trade

```yaml
action:
  change: Render distant smoke at half-resolution effect target while preserving simulation and near effects.
  trade: quality_trade
  prediction: GPU time falls in smoke-heavy scenes without changing particle CPU/update counts
  validation: GPU p95, budget misses, effect-target pixels, visual QA and transition hysteresis
```

### Query narrowing

```yaml
action:
  change: Filter interactable candidates by spatial cell and layer before exact mesh raycast.
  trade: intended_equivalent
  equivalence_status: untested
  prediction: tested objects/triangles and query p95 fall while nearest valid hit stays identical
  semantic_surface: cell migration, large objects spanning cells, layer setup, tie ordering
```

## 11. Acceptance matrix

```yaml
animation_particle_query_acceptance:
  animation_update_p95:
  active_mixer_track_bone_counts:
  skinned_gpu_and_pass_cost:
  morph_update_count:
  particle_simulation_p95:
  particle_upload_bytes:
  particle_gpu_p95_and_overdraw_probe:
  query_p95_p99:
  candidates_triangles_shapes_tested:
  allocation_rate:
  animation_event_and_root_motion_checks:
  particle_visual_checks:
  nearest_hit_and_pick_id_checks:
  reactivation_and_tier_transition_checks:
```

A patch fails if it reduces one subsystem by silently skipping required events, root motion, interactions, or visible effects outside an authorized trade.
