# Eliminate Unnecessary Work

Use for runtime design, full audits, and changes to repeated work, data layout, caching, or dirty tracking. Apply these choices to the implicated workload; the skill's measurement and semantic safeguards still govern acceptance.

**REMOVE UNNECESSARY WORK.** Start with the required result, its consumers, and when they need it. Identify the work that exists only because of the current implementation. Search for deletion of a dominant stage or a better scaling law before tuning individual instructions. Seek opportunities for order-of-magnitude improvement; 10× is a search ambition, never an invented result or a reason to reject a useful smaller win.

## 1. Remove the operation

Ask both: **what can disappear from the current design, and how would we build this from scratch to require less work?** A from-scratch comparison is a design tool, not a requirement to rewrite the system.

- Trace a result to its actual consumers. Remove calculations, intermediate records, and bookkeeping that have no required consumer, including side effects and lifecycle obligations in that check.
- Remove repeated discovery. If ownership already identifies an entity, resource, or candidate set, pass that information through instead of searching the scene again.
- Remove representation round trips. Keep data in a form its next consumer can use instead of constructing objects, serializing them, then unpacking them back into numbers.
- Challenge whole passes, traversals, and handoffs. Combine compatible work under the existing owner when that removes repeated reads or scheduling without widening the working set or breaking dependencies.
- Reuse existing subsystem results when their timing and semantics fit. Do not independently reconstruct information already produced by physics, animation, or rendering.

Offscreen does not mean unnecessary: shadows, reflections, picking, physics, and authority can still consume the result. When the active set becomes empty, preserve any final clear, removal notification, or resource release needed to prevent stale output.

For example, when each of many actors searches the whole scene for eligible targets, first challenge why each actor discovers the same membership independently. A maintained candidate set or existing spatial query may remove repeated discovery. Caching each actor's search result leaves that design question unanswered. Include membership maintenance and exact query semantics when comparing replacements.

## 2. Remove repetition

Classify work by when its inputs actually change: asset creation, spawn/despawn, configuration change, simulation tick, render frame, or view. Place it at the narrowest lifecycle boundary that preserves the result's freshness.

- Move invariant preparation out of frame and tick loops. Rebuild it when its real inputs change.
- Compute view-independent work once for the relevant frame; keep camera-dependent work per view. Preserve XR view and rendering semantics.
- Update presentation only as often as its consumers require. Changing a physics tick rate, skipping gameplay updates, or serving stale interaction results changes behavior and needs explicit treatment.
- Write directly to the required destination when ownership permits; remove intermediate copies and repeated JS/WASM/worker/GPU conversions.

Deferral changes when a cost is paid. Account for first-use spikes, spawn bursts, and catch-up work; moving a hitch outside the capture window does not eliminate it.

## 3. Shrink the affected set

Work should follow relevant entities and changes. Use active ranges, eligible query candidates, changed records, and modified upload ranges where they avoid substantial work.

Count the cost of maintaining that set: marking, deduplication, scanning, compaction, range merging, and clearing. A small dense scan can beat elaborate dirty tracking; frequent changes can make a full update cheaper than many small updates. Choose from the actual active/change ratios and consumer update costs.

For example, a renderer needing only changed transforms should not require materializing and transferring every body's full object record each frame. Compare a compact changed-transform stream with a dense full stream, including change detection and handoff overhead. Preserve removals, identity, interpolation, and ownership semantics.

## 4. Let the access pattern choose the representation

For each hot loop, identify the fields it reads and writes, iteration order, lookup keys, population size, and mutation frequency. Design storage around those accesses. Separate hot runtime state from cold metadata and keep hot iteration dense when practical.

| Decision cue | Preferred design move | Boundary that changes the choice |
|---|---|---|
| Repeated keyed lookup over a bounded dense population | Resolve external keys at the boundary; use array indices or slots inside the hot loop | Sparse/unbounded keys or arbitrary membership may still need a map. Avoid allocating to the largest external ID. |
| A loop touches a few fields across many records | Evaluate typed-array columns / structure of arrays and hot/cold separation | If fields are consumed together, an interleaved layout can fit better. Include conversion and upload costs. |
| Many membership flags, set intersections, or flag scans | Evaluate a bitset and word-wise operations | A byte flag buffer can be simpler for independent updates; a sparse active list can avoid scanning absent entries. Packing is not automatically faster. |
| Repeated temporary collections in a hot path | Use caller-owned output buffers or bounded reusable scratch storage with an explicit count | Define overflow/growth and reentrancy behavior. JavaScript does not offer a C++-style stack-allocated inline-capacity list guarantee. |
| Extra lookups for compact tags associated with handles | Consider packing a bounded tag and index only when it removes meaningful traffic | Specify masks, capacity, signedness, and identity semantics. Number bitwise operations use 32-bit integers; do not import native pointer-tagging assumptions. |

Preserve numeric semantics when selecting typed storage. Moving Number state to Float32 or integer arrays can change precision, range, and overflow behavior; validate any narrowing and treat changed gameplay/replay outcomes as a behavior trade.

Storage position is not durable identity. Compaction, swap-removal, and slot reuse must update mappings and preserve ordering wherever gameplay/replay depends on it. Use generations or another existing identity mechanism when stale handles can survive reuse. Mutable flags packed into a handle must not silently change its identity.

Keep Three.js objects where its API requires them; a dense simulation store can feed those objects at a clear boundary. Rebuilding an object graph from typed arrays every frame can spend the saving on adapters. Likewise, a flat array of JavaScript object references does not by itself make their fields contiguous.

## 5. Make caches earn their machinery

**Before remembering an expensive answer, challenge why producing the answer is expensive.** First compare eliminating the query, choosing a better algorithm or representation, and computing directly. Apply this challenge to existing caches as well as proposed ones.

Compare total workload cost: key construction, lookup, validation, misses, recomputation, insertion/eviction, retained memory and GC, plus copies, serialization, or network trips where present. A high hit rate alone does not establish a win. Do not assume a local numeric memo has the costs of a remote cache.

Remove caches made redundant by a simpler design, along with obsolete invalidation paths and duplicate state. Retain justified reuse of expensive resources or results, with explicit ownership and bounded lifetime. Compiled programs, decoded assets, and static acceleration structures are possible examples; indiscriminately deleting reuse can restore expensive repeated work.

Treat dirty tracking as an optimization with maintenance costs too. Correct invalidation must cover every relevant input, lifecycle transition, and resource-loss path. If tracking approaches or exceeds direct work, simplify it.

## 6. Test the simpler design

For a material candidate, state what work disappears, what replaces it, what new maintenance it introduces, and which contract could change. Reuse the skill's existing experiment and reporting process; no separate worksheet is required.

Test one causal unit on the same workload, including relevant population/churn and cold/warm cases. Measure the affected stage and the user-visible limiting metric. A much faster CPU loop may leave GPU-bound presentation unchanged. Keep required gameplay, quality, freshness, and lifecycle behavior visible in the comparison.

Choose the smallest lasting design that meets the target. Reject machinery whose benefit disappears after including its maintenance; retain useful measured improvements even when no radical simplification earns adoption. Re-profile after removing dominant work.

## Technical grounding

- [Richard Fabian, Data-Oriented Design — Optimisations](https://www.dataorienteddesign.com/dodbook/node9.html): access patterns, data movement, and the conditions for SoA.
- [V8 — Elements kinds](https://v8.dev/blog/elements-kinds): JavaScript array representations; native-layout assumptions do not transfer wholesale.
- [Three.js — BufferAttribute](https://threejs.org/docs/pages/BufferAttribute.html): typed attribute storage and partial update ranges; verify against the project's version.
- [ECMAScript — Number bitwise operations](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numberbitwiseop): integer conversion and bit-width semantics.
