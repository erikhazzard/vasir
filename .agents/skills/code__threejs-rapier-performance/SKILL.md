---
name: code__threejs-rapier-performance
description: Guards Three.js / Rapier batching, instancing, render-loop, pass, target, UI-composition, and other per-frame/per-tick implementations and static reviews; also plans mobile performance architecture. Use $threejs__improve-performance for causal measurement.
---

Use this skill before committing to, while implementing, or while statically reviewing a Three.js / Rapier change that can alter per-frame or per-tick work, as well as for system-level mobile performance architecture.

## Routing boundary

Use this skill for every concrete implementation or static acceptance touching batching or instancing, render/update loops, scene traversal, passes, render targets, cameras/views, final presentation or UI composition, shader/material variants, physics stepping/query/sync, or other per-frame/per-tick work, regardless of whether a slowdown is already observed.

Also use it for planned renderer, physics, asset-pipeline, quality-tier, loading, memory, or threading architecture. When a symptom is observed, use `$threejs__improve-performance` to attribute it first, apply this skill's `local_change_guard` to the bounded remediation before implementation or static acceptance, then return to diagnosis for measured verification. A statically proven topology, ownership, scope, or work-cardinality violation may be rejected here without inventing a timing claim; hand off to diagnosis only for causal performance claims or when measurement could change the decision.

## Modes

### `local_change_guard`

Use for one concrete hot-path implementation or static review. Apply only the rules for the touched domains; do not demand a whole-game asset, physics, tier, and threading plan for a local instancing or render-loop change. For rendering changes, always read `references/render-topology-guard.md` before accepting or writing the change.

Return one domain disposition. When embedded in `$code__auditing`, this is evidence for that skill's canonical release verdict, not a competing audit verdict:

- `SAFE_LOCAL_CHANGE`: the change stays inside the requested local boundary and preserves required work topology.
- `REJECT_UNFORCED_MULTIPLIER`: leaf/content cardinality creates unrequested frame-global or tick-global work.
- `ARCHITECTURE_PROOF_REQUIRED`: the expansion is intentional and plausibly forced, but needs explicit authorization and bounded proof before production implementation or acceptance. The smallest reversible isolated prototype may be authorized solely to obtain that proof.

### `architecture_plan`

Use for system-level mobile renderer, physics, asset-pipeline, quality-tier, loading, memory, or threading design. Follow the full architecture operating order and Definition of Done.

## Local hot-path cardinality invariant

Leaf/content axes such as entity, type, material, batch, component, or feature instance may scale their own bounded data and work items. They may not silently multiply frame-global or tick-global owners and phases such as animation loops, whole-scene traversal, physics-world steps, full-world queries or synchronization, worker round trips, render graphs, or terminal output. A new global phase is an explicit architecture change, never an incidental implementation detail of local batching or feature work.

## Local render-topology invariant

**Default invariant:** a local rendering optimization may change draw groups, instance buffers, and per-object data inside existing passes. It may not add or multiply frame-global render owners, scene-render invocations, full-scene or G-buffer passes, render targets, attachments, fullscreen passes, canvas/default-framebuffer writes, output transforms, or presentation roots unless the user explicitly requested an architecture change and bounded evidence supports it. Optimization-driven expansion needs measured break-even; correctness- or platform-required expansion needs demonstrated necessity plus measured target-budget headroom.

Entity, type, material, and batch cardinality may affect draw count. They must never control frame-global pass, target, attachment, or presentation cardinality. Feature modules contribute renderable data; one canonical frame/output owner controls each canvas or logical view. Multiple passes can be valid when centrally owned, fixed by an explicit rendering requirement, and budgeted; do not confuse another canvas-target write with another browser presentation.

A structurally observed topology expansion can be rejected without timing it. Timing is required to quantify its cost or approve an intentional architecture change, not to prove that the expansion exists.

**Instancing anchor:** one compatible `InstancedMesh` group per geometry/material/render-state bucket participates in the existing world, shadow, depth, and picking topology. With `T` enemy types, draw groups may scale with `T`; G-buffer passes and targets must not. If deferred rendering already exists, all groups feed its shared topology. If it does not exist, an instancing task must not introduce it.

**UI anchor:** UI may use browser composition or contribute overlay draws through the canonical frame/output owner. A deliberate fixed UI pass can be valid. A HUD subsystem must not silently start another frame loop, renderer, composer, render pipeline, world render, terminal output transform, or independently owned canvas-output path.

Mobile-web performance is not “higher FPS.” It is stable frame time, low touch/input latency, bounded memory, controlled download size, thermal resilience, and deterministic simulation on real phones. The goal is not to make one device look impressive. The goal is to ship a game that feels responsive, stays correct, and degrades intentionally across mobile browsers.

# 0) Operating Order

For `local_change_guard`, follow the routed specialist reference and inspect only the touched hot path plus its ownership and multiplicity boundaries.

Before choosing architecture in `architecture_plan`:

1. Name the player journey and the controls, readability, camera, hit timing, and deterministic outcomes that must survive every quality tier.
2. Name the target device classes and only the budgets supported by repo evidence or measurements; label consequential assumptions.
3. Classify the likely cost and state the first measurement or falsifier that can disprove it.
4. Prefer removing, simplifying, delaying, batching, or moving work before optimizing it.
5. Define the cheapest device-level proof for frame time, input response, memory, loading, thermals, and replay correctness that the change can affect.

Record durable decisions in the active work spec when one exists. Report only the conclusions that change implementation.
# 1) Non-Negotiables (mobile-web constitution)

## 1.1 Measure before prescribing
- Never optimize from vibes.
- Separate these failure classes before suggesting fixes:
  - frame-rate collapse
  - touch/input lag
  - load/streaming stall
  - memory/VRAM pressure
  - thermal degradation over time
  - deterministic divergence
- If evidence is thin, say so and define the first measurement that would settle it.

## 1.2 Remove work before optimizing work
The first question is never “how do we make this faster?”  
The first question is “what work can the player stop paying for?”

Priority order:
1. **Eliminate work** we do not need.
2. **Reduce frequency** of work that remains.
3. **Reduce scope** of work to only what the player can perceive or affect.
4. **Move work** off the hot path or off the main thread.
5. **Tune** the remaining work.
6. **Micro-optimize code** last.

## 1.3 Mobile-first, not desktop-excused
- Assume fill-rate, thermal headroom, memory, and main-thread time are tight.
- Optimize for the weakest supported mobile class, not the development laptop.
- Treat battery and long-session stability as product quality, not polish.

## 1.4 Determinism is law
- Authoritative gameplay must use a fixed simulation step.
- Gameplay must not depend on render framerate.
- Low/Medium/High may change presentation, density, shadows, particles, post, and resolution; they must not change authoritative outcomes, replay hashes, or simulation semantics.
- Never introduce a second timing model, second physics path, or “almost deterministic” fallback.

## 1.5 One clear way
- Reuse existing repo systems for tiers, capability scoring, render abstraction, determinism guards, asset pipelines, resource tracking, and perf counters.
- Do not invent a second device classifier, second quality system, or second cleanup pattern unless you are deleting the first one in the same change or executing a migration plan.

## 1.6 Solve the exact problem
- No drive-by refactors.
- No unrelated visual redesign.
- No “optimization” that quietly changes gameplay, control feel, camera semantics, or replay correctness.

---

# 2) Domain Rules

## 2.1 Game-form specialization is mandatory
Before choosing tactics, classify the game. Different games can afford different degradations.

Required axes:
- **Visibility pattern:** room / arena / corridor / open / streamed
- **Camera:** first-person / third-person / top-down / side-view / other
- **Interaction density:** low / medium / high
- **Physics criticality:** authoritative / hybrid / cosmetic
- **Readability priority:** silhouettes / depth cues / hit timing / spatial precision / camera comfort

Examples:
- **Corridor racer / runner:** spend detail near the forward path; aggressively reduce side/rear detail, far shadows, and off-route collisions.
- **Arena brawler / top-down shooter:** preserve input clarity, hit readability, and enemy silhouettes first; degrade particles, shadows, decals, and distant props before core readability.
- **Physics puzzler:** keep interactive bodies and contact behavior correct; degrade decorative rendering before solver accuracy on puzzle-critical bodies.
- **Builder / sim / open view:** prioritize batching, culling, LOD, and streaming discipline; the camera can expose huge surface area, so scene-structure choices dominate.

Every recommendation must tie back to this classification.

## 2.2 Performance is a budget stack, not a single number
Always reason in separate budgets:
- **Frame budget**
- **Interaction budget**
- **Memory / VRAM budget**
- **Load / streaming budget**
- **Thermal / soak budget**
- **Determinism budget** (what timing or ordering changes are disallowed)

Never use FPS alone as proof.

Use this bottleneck cheat sheet:

- **Fill-rate / overdraw bound:** FPS improves when internal resolution drops; draw calls stay similar.
- **CPU draw-call / scene traversal bound:** FPS barely changes with internal resolution; draw calls, state changes, or traversal cost are high.
- **Shader/material/post bound:** a few full-screen or expensive materials dominate; simplifying materials or passes helps more than geometry changes.
- **Physics bound:** physics step time grows with active bodies, contacts, joints, CCD, or queries; render simplification barely moves the needle.
- **Main-thread bound:** long tasks, input lag, or GC spikes dominate; worker moves or allocation cleanup help.
- **Memory/VRAM bound:** hitching, evictions, crashes, or degraded stability increase with scene churn, texture count, or render-target use.
- **Load/decode bound:** boot or streaming stalls dominate; compression, smaller assets, and off-main-thread decode matter most.

## 2.3 Asset & content pipeline is part of runtime performance
A mobile-web perf pass is incomplete without an asset audit.

Required asset principles:
- Prefer a real glTF pipeline over ad hoc runtime content.
- Use compressed textures where the pipeline supports them.
- Use geometry compression / quantization where the pipeline supports them.
- Instance repeated props whenever material and geometry allow it.
- Batch repeated geometry sharing a material when instancing is not enough.
- Reduce unique materials; material diversity becomes draw-call diversity.
- Use LODs for repeated or distant content.
- Treat transparency as a budgeted exception, not a default art style.
- Texture dimensions are chosen by on-screen need, not by source art size.
- Animation data is budgeted too: skeleton count, clip count, update frequency, and resampling/compression matter.
- Streaming and disposal are first-class. Loaded once forever is not a valid default for large mobile scenes.

For any meaningful content change, explicitly answer:
- What became smaller?
- What became fewer?
- What became shared?
- What became streamable?
- What gets disposed when no longer needed?

## 2.4 Rendering constitution (Three.js on mobile)
### 2.4.1 Default shipping mindset
Default to **WebGL-first shipping constraints**.  
You may evaluate `WebGPURenderer`, but only adopt it when:
- the gain is material,
- the fallback story is explicit,
- and the features used do not quietly trap us on a path we cannot ship broadly.

If you use `WebGPURenderer`, say whether the feature set remains compatible with the fallback backend. If not, say so plainly and gate it intentionally.

### 2.4.2 Internal resolution is a control loop
Never blindly render heavy mobile scenes at full device pixel ratio.

Use explicit internal resolution policy:
- CSS controls display size.
- Rendering code controls drawing-buffer size.
- Cap total internal pixel count.
- Support dynamic render scale when needed.
- Know the actual buffer size being rendered, especially if postprocessing, picking, screenshots, or pixel-based shaders exist.

Example:
```ts
function computeInternalSize(cssWidth: number, cssHeight: number, dpr: number, maxPixels: number) {
  let width = Math.floor(cssWidth * dpr);
  let height = Math.floor(cssHeight * dpr);
  const scale = Math.min(1, Math.sqrt(maxPixels / (width * height)));
  width = Math.floor(width * scale);
  height = Math.floor(height * scale);
  return { width, height };
}
````

### 2.4.3 Every pixel is a budget item

Treat these as explicitly budgeted, never “free”:

* expensive materials
* transmission/refraction-like effects
* transparency and overdraw
* bloom / SSAO / SSR / SSGI / other post passes
* dynamic shadows
* high sample counts / MSAA choices
* large render targets
* readbacks (`readPixels`, screenshots, picking paths)
* preserve-drawing-buffer style requirements
* logarithmic-depth or other features that alter early-depth behavior

Prefer:

* cheaper materials for non-hero assets
* opaque over transparent
* front-to-back opaque ordering when possible
* baked / static / highly selective dynamic shadows
* fewer full-screen passes
* one strong visual idea over many medium-cost effects

### 2.4.4 Draw calls and scene submission are first-class costs

* Repeated props should be **InstancedMesh**, **BatchedMesh**, merged geometry, or another deliberate batching strategy.
* Static worlds should not pay dynamic update costs every frame.
* Visibility should be constrained by frustum, distance, room/sector/portal/corridor logic, and content-specific rules.
* Do not keep thousands of individually updated objects if the player perceives them as one population.

### 2.4.5 GPU lifecycle is explicit

* Removing an object from the scene is not enough.
* Geometry, material, texture, and render-target ownership must be explicit.
* Scene churn must have a disposal plan.
* Streaming in/out must not leak GPU resources.

## 2.5 Physics constitution (Rapier on mobile)

### 2.5.1 Fixed-step only

* Use a fixed authoritative timestep.
* Never tie authoritative gameplay to variable frame delta.
* If render interpolation exists, keep it presentation-only.

### 2.5.2 Use real units

* Use SI-style physics units and an explicit render↔physics scale.
* Never use pixels as Rapier length units.
* State the mapping clearly, e.g. `1 physics meter = 50 render pixels` or the 3D equivalent.

### 2.5.3 Prefer the cheapest body model that preserves gameplay

Choose the simplest valid body type:

* fixed before kinematic
* kinematic before dynamic
* character controller before full rigid-body dynamics when gameplay wants authored movement rather than emergent simulation

### 2.5.4 Collider choice is a performance choice

* Prefer primitive or compound colliders where possible.
* Use convex approximations when exact mesh collision is unnecessary.
* Avoid dynamic triangle-mesh colliders unless there is a compelling, measured reason.
* Be explicit about why a collider shape is worth its cost.

### 2.5.5 Simulate fewer things

* Sleeping should be enabled wherever gameplay allows.
* Collision groups should remove unnecessary interactions early.
* Query filters should exclude irrelevant colliders from raycasts/shape-casts.
* Solver groups are not a substitute for removing broad collision work.
* CCD is for bodies with genuine tunneling risk, not a blanket safety switch.
* Contact events, force events, and physics hooks are budgeted features; enable only where gameplay consumes them.

### 2.5.6 Physics cost is mostly scene architecture

Do not start by tweaking solver iterations. Start here:

1. Fewer active bodies
2. Fewer collider pairs
3. Simpler collider shapes
4. Fewer joints
5. Narrower CCD scope
6. Narrower event/query scope
7. Only then: solver and integration tuning

### 2.5.7 JS↔WASM boundary is part of the hot path

* Minimize per-body round trips each tick.
* Prefer structured sync points over ad hoc reads everywhere.
* If only a subset of bodies moved, do not blindly resync every body.
* Explicitly state how rendering gets transforms from Rapier and how much data crosses that boundary per frame.
* Dispose of WASM-backed resources when their lifecycle ends.

### 2.5.8 Scene-query discipline

If a feature only needs raycasts, shape-casts, or overlap tests, justify why full body dynamics or full-scene queries without filtering are necessary. Use filters aggressively.

## 2.6 Threading & browser constitution

### 2.6.1 Off-main-thread evaluation is mandatory

For every meaningful change, explicitly evaluate whether work belongs off the main thread:

* rendering via OffscreenCanvas
* asset parse/decode/transcode
* scene preparation
* physics or other heavy systems
* background warmup/precompute

The final answer may still keep work on the main thread, but only with a reasoned justification.

### 2.6.2 Main-thread time is for responsiveness

* Input, DOM, and critical UI must remain responsive.
* Avoid blocking the main thread with asset parse/transcode, heavy scene construction, or bulk data transforms if a worker path is feasible.
* Avoid layout or DOM work in the frame loop unless absolutely necessary.

### 2.6.3 Cross-thread design must name costs

If using workers:

* define ownership,
* define message frequency and payload shape,
* define what happens on startup, resize, pause/resume, and context loss,
* define fallback if worker/offscreen support is unavailable or not worth the complexity.

## 2.7 Quality tiers & device auto-select constitution

We ship exactly **three** presets:

* **Low**
* **Medium**
* **High**

Rules:

* Auto-select uses the repo’s existing capability heuristic if one exists.
* User override must be available and persistent.
* Tiers change presentation, not deterministic gameplay.
* Tiering must be data-driven and centralized, not scattered across files.

Each tier must specify exact knobs such as:

* render scale / max pixel count
* shadow mode
* postprocessing enablement
* texture/anisotropy budget
* LOD distances / bias
* vegetation / crowd / decal / particle density
* reflection / transmission / transparency budget
* non-authoritative physics FX density
* far-scene visibility budget

Example:

```ts
const qualityTiers = {
  low: {
    maxPixels: 1280 * 720,
    shadows: "off",
    post: "off",
    anisotropy: 1,
    lodBias: 2,
    densityScale: 0.5,
    particleScale: 0.4,
    nonAuthoritativeFx: "reduced",
  },
  medium: {
    maxPixels: 1920 * 1080,
    shadows: "selective",
    post: "minimal",
    anisotropy: 2,
    lodBias: 1,
    densityScale: 0.75,
    particleScale: 0.7,
    nonAuthoritativeFx: "standard",
  },
  high: {
    maxPixels: 2560 * 1440,
    shadows: "budgeted",
    post: "selective",
    anisotropy: 4,
    lodBias: 0,
    densityScale: 1,
    particleScale: 1,
    nonAuthoritativeFx: "full",
  },
};
```

Bad tiering:

* “Low” changes hitboxes, simulation rate, or authoritative collision.
* “High” silently enables a different gameplay path.
* Device auto-select cannot be overridden.
* Heuristics live in multiple unrelated places.

## 2.8 Observability constitution

We do not trust optimization we cannot observe.

Minimum instrumentation:

* frame time histogram
* long tasks / jank indicators
* interaction latency signals
* draw calls / triangles / texture count / render-target count
* active body / collider / joint / contact / query counts
* physics step time
* load/stream timings
* memory growth across scene churn
* current quality tier and any automatic downgrades/upgrades

Logs should explain **why** the engine changed tier or disabled a feature.
Do not spam per-frame logs on hot paths.

## 2.9 Testing constitution

### 2.9.1 Required tests

* Every meaningful behavior change includes at least **one deterministic integration test**.
* Every bug fix begins with a failing deterministic regression test.
* Every hot-path change includes a benchmark, profile, or perf regression test.
* Every tier-system change includes a deterministic tier-selection test.
* Every fallback-capability change includes a fallback-path test.

### 2.9.2 Determinism test example

```ts
it("replays the same inputs to the same authoritative snapshot", () => {
  const resultA = runReplay({ seed: 42, inputs });
  const resultB = runReplay({ seed: 42, inputs });

  expect(resultA.snapshotHash).toBe(resultB.snapshotHash);
  expect(resultA.authoritativeEvents).toEqual(resultB.authoritativeEvents);
});
```

### 2.9.3 Anti-flake rules

* No sleeps for correctness.
* Fixed time / fixed seeds.
* Bounded waits.
* Hermetic tests.
* Real serialization and real async boundaries where the bug or perf risk lives.

## 2.10 Migration constitution

If you change:

* asset formats,
* tier settings,
* renderer path,
* feature flags,
* capability detection,
* or scene/physics interfaces,

use **Expand → Migrate → Contract**.

No permanent dual systems.
No orphaned legacy tier knobs.
No second renderer or second device scorer without a deletion plan.

---

# 3) Mobile-Web Anti-Patterns (banned unless justified + measured)

* Blindly calling `renderer.setPixelRatio(window.devicePixelRatio)` for a heavy mobile scene.
* Assuming full-DPR rendering is the default for phones.
* Using expensive materials broadly when a cheaper material preserves gameplay readability.
* Treating transparency, bloom, SSAO/SSR/SSGI, or dynamic shadows as free polish.
* Shipping repeated props as thousands of separate draw calls when instancing or batching is available.
* Introducing deferred rendering, a G-buffer, or a render graph to satisfy a batching-only or instancing-only request.
* Creating a pass, target, attachment set, composer, renderer, or frame loop per entity, type, material, batch, component, or feature instance.
* Letting world and HUD subsystems own competing frame loops, renderer/composer pipelines, terminal output transforms, or canvas-output paths.
* Claiming a draw-call win while leaving added traversal, pixel, attachment, load/store, resolve, copy, synchronization, or lifecycle work unaccounted.
* Requiring a benchmark before rejecting a directly observed, unrequested topology or work-cardinality expansion. Measurement quantifies runtime cost; it does not make the structural expansion exist.
* Driving a physics-world step, full-world query/sync, whole-scene traversal, animation update, or worker round trip from an entity, type, material, batch, component, or feature-instance loop.
* Updating huge static scene graphs every frame.
* Using pixels as Rapier world units.
* Enabling CCD broadly “just to be safe.”
* Emitting collision/contact/query events for systems that do not consume them.
* Running scene queries against everything without filter groups.
* Syncing every physics body from WASM to JS every tick without proving it is necessary.
* Allocating vectors, matrices, arrays, strings, or closures in hot loops.
* Parsing, transcoding, or constructing large scenes on the main thread without evaluating worker/offscreen alternatives.
* Forgetting disposal for geometries, materials, textures, render targets, or WASM-backed objects.
* Creating a second tier system, second capability scorer, second cleanup pattern, or second determinism model instead of reusing the repo’s standard path.
* Claiming a perf win without before/after evidence or a falsifiable cost model.
* Quietly changing authoritative gameplay semantics under the banner of optimization.

---

# 4) Implementation Rules

## 4.1 Centralize performance knobs

* Tier knobs live in one clear config surface.
* Renderer, physics, streaming, and content systems read from the same tier intent.
* No scattered magic numbers.

## 4.2 Name the budget in the code

* Use names with units and intent: `maxPixels`, `physicsStepHz`, `shadowDistanceMeters`, `tierAutoSelectScore`, `maxBodiesForFx`.
* Make it obvious which knobs are presentation-only and which are authoritative.

## 4.3 Prefer data-driven simplification over clever engine tricks

* Small, explicit, reviewable changes beat opaque “smart” systems.
* LLM-generated code should be able to follow the path mechanically: centralized config, explicit ownership, clear tier tables, narrow helpers.

## 4.4 Lifecycle is explicit

* Anything that allocates GPU or WASM resources must have a cleanup path.
* Anything async must be cancellable or safely ignorable on teardown.
* Scene churn must not retain stale references.

## 4.5 Hot-path hygiene

* Reuse temp objects where it materially reduces churn.
* Avoid hidden allocations in frame loops.
* Avoid repeated string work, object spreads, and closure churn on hot paths.
* Keep the render/update loop boring.

---

# 5) Definition of Done (PR gate)

## 5.1 `local_change_guard`

A local change is not done until all materially relevant items apply:

* ✅ The requested boundary and the existing frame/tick owner and entry points are named.
* ✅ For render changes, the before/after topology delta from `references/render-topology-guard.md` is complete.
* ✅ Multiplicity axes, work removed, and work added are explicit; code inside a loop is counted by executions, not call sites.
* ✅ Entity, type, material, batch, or component cardinality does not create unrequested frame-global/tick-global work or a second owner.
* ✅ The domain disposition is exactly one of `SAFE_LOCAL_CHANGE`, `REJECT_UNFORCED_MULTIPLIER`, or `ARCHITECTURE_PROOF_REQUIRED`.
* ✅ `ARCHITECTURE_PROOF_REQUIRED` names the forcing requirement, cost both ways, and bounded proof handoff. The expansion is not merged into or accepted on the production path before proof; only the smallest reversible isolated prototype may be authorized to obtain it.
* ✅ Touched rendering, gameplay, determinism, lifecycle/disposal, and fallback semantics are preserved and checked at the cheapest faithful seam.
* ✅ No unrelated whole-system ceremony is demanded for a narrow local change.

Static topology evidence can justify rejection, but it cannot justify a claimed timing improvement. A `SAFE_LOCAL_CHANGE` disposition confirms scope and topology safety; any claimed performance win still requires `$threejs__improve-performance` measurement.

## 5.2 `architecture_plan`

An architecture plan is not done until all materially relevant items apply:

* ✅ Game form / camera / visibility / physics role explicitly stated
* ✅ Determinism contract explicitly preserved
* ✅ Bottleneck classification stated with evidence
* ✅ Asset/content audit completed
* ✅ Render strategy completed
* ✅ Physics strategy completed
* ✅ Main-thread / worker evaluation completed
* ✅ Low / Medium / High tiers specified or updated
* ✅ Device auto-select and user override considered
* ✅ At least one deterministic integration test added or updated
* ✅ Perf proof supplied for hot-path claims
* ✅ Fallback behavior stated for unsupported/slow paths
* ✅ Cleanup/disposal ownership stated
* ✅ No banned anti-pattern introduced
* ✅ No second way added without deletion or migration plan

---

# 6) What “excellent” looks like

Excellent changes are boring in the best way:

* the player-facing priority is explicit
* unnecessary work disappears
* the bottleneck is named before the fix is proposed
* render, physics, and browser-main-thread costs are handled separately
* quality tiers are deliberate, data-driven, and overrideable
* deterministic gameplay remains identical across tiers
* memory stays bounded through load/unload churn
* performance claims are measured, not narrated
* the code path gets simpler, not more magical

# 7) References

- `references/render-topology-guard.md` — always read for local render implementation or static review, and for architecture changes affecting frame loops, render owners, passes, targets, views, UI composition, or final output.
