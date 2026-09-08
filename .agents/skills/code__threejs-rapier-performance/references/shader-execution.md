# Shader Execution and GPU Cost

Read when implementing, reviewing, or diagnosing changes to shader branches, loops, sampling/indexing, live intermediate state, material specialization, stage placement, or compute work organization. Include generated shaders from built-in material features, TSL, and custom hooks. Apply only the mechanisms the change touches.

**Core rule:** fewer source operations, lower average iterations, and fewer draws do not establish less GPU time. Separate source semantics, execution across groups of lanes, compiled resource requirements, and measured runtime behavior. The mechanisms below guide hypotheses; `$threejs__improve-performance` owns causal timing claims. Existing topology and semantic checks still apply.

## Branches and loop tails

Classify conditions and loop termination by scope: compile-time, draw, primitive/instance, fragment, subgroup, or workgroup. These scopes are not interchangeable; per-instance consistency does not prove subgroup uniformity. Runtime-equal values also do not prove the compiler recognized uniformity or selected scalar instructions.

A coherent branch can skip expensive work. Divergent paths execute with different active-lane masks; arithmetic selection can instead evaluate both expensive alternatives. Small branches may be predicated by the compiler. Choose from path cost, coherence, and emitted behavior; neither branching nor branchless selection wins universally.

**Loop example:** in an illustrative 32-lane group, 31 lanes finish after 4 iterations and one after 128. The mean is 7.875 iterations, but the group's loop can continue through iteration 128 with only one lane active in the tail. The same iteration distribution grouped differently can have different utilization. This is an execution model, not a timing formula or a portable wave-width assumption: body paths, memory latency, predication, reconvergence, and scheduling affect elapsed time.

Inspect representative termination and branch distributions, not only average work or the fraction of pixels taking a path. Consider grouping similar jobs, culling, or compaction only where workload generation permits it; account for sorting, buffers, dispatches, synchronization, and depth/transparency semantics. Do not assume control over fragment-to-wave assignment.

## Executed work versus resident state

A runtime-uniform feature guard may skip instructions while the compiled shader still carries the expensive path's register requirements. Compile-time specialization can remove that path. Compare both against variant compilation, warmup, state-switching, and program-memory costs; register allocation is compiler-dependent.

Hoisting loads, caching intermediates, and unrolling can expose independent work and hide latency, but also lengthen live ranges, increase registers or spills, and enlarge instruction-cache footprint. A retained loop can confine load-dependent values to its body. Recomputing a cheap value may cost less than retaining it across a register-pressure peak. These are alternatives to measure, not instructions to defeat every compiler optimization.

**Decision example:** accept unrolling when the target's repeated timings improve with acceptable resources and semantics. Reject it when new spills or reduced latency-hiding capacity accompany a measured regression, even if source instruction counts fall. Occupancy changes in resource-allocation steps and higher occupancy alone is not a performance verdict.

## Access patterns and hidden loops

Distinguish uniform, nearby/coalescible, scattered, and dependent accesses. Count bytes and transactions only at the evidence level available; one source lookup is not one physical memory transaction. Caching can make repeated accesses cheap, while dependent addresses can serialize progress.

On applicable hardware/compiler paths, divergent descriptor selection or dynamic indexing of register-backed private arrays can lower to a **waterfall loop**: select an index, execute matching active lanes, then repeat for remaining distinct indices. Cost then depends on distinct indices within an execution group. A source-level lookup count misses that loop.

Require matching backend/compiler evidence before diagnosing waterfalling. Resource-descriptor selection, private-array indexing, and a layer coordinate within one texture array are different operations; varying-index syntax alone proves none of their native lowerings. Moving a private array to workgroup memory may avoid one lowering while adding latency, shared-memory use, and occupancy limits. Do not prescribe that migration without support and measured benefit.

## Backend and correctness boundary

Resolve the installed Three.js version, actual backend, shader stage, and relevant capabilities. Inspect generated GLSL/WGSL where accessible; generated source is not proof of native register allocation or machine instructions. Native AMD/NVIDIA examples teach mechanisms, not portable browser constants or APIs.

Preserve the derivative/LOD and stage-migration safeguards in `render-topology-guard.md`. Check barrier and subgroup participation rules when those constructs occur. Do not assume a workgroup equals a subgroup, a fixed wave width, a mapping from invocation IDs to lanes, or that a first-lane broadcast preserves a value that varies among participating lanes. Feature availability and fallback semantics must be established before using subgroup or compute remedies.

## Smallest credible proof

For the implicated block, state the execution/resource change expected, the cost that could increase, and one discriminating test. Examples: coherent versus scattered work with the same aggregate distribution; runtime-disabled versus specialized-away features; retained versus unrolled loops. Hold coverage, geometry, resolution, pass topology, and other quality settings fixed where they are not the tested variable. Diagnostic substitutions are not automatically equivalent production patches.

Use repeated target GPU and frame timings. Compiler resource reports, native captures, and active-lane measurements strengthen attribution when available; do not invent unavailable browser counters or make native tooling mandatory. Reconcile submission savings with GPU costs and the actual frame deadline. `SAFE_LOCAL_CHANGE` requires the existing semantic checks and does not certify a speedup; a shader-performance hypothesis alone is not a topology violation.

## Sources and limits

- [Sebastian Aaltonen: occupancy and resource usage](https://gpuopen.com/learn/optimizing-gpu-occupancy-resource-usage-large-thread-groups/) — scalar data, register lifetimes, and retained loops; GCN/HLSL-specific numbers and controls are not browser defaults.
- [AMD: occupancy explained](https://gpuopen.com/learn/occupancy-explained/) — resource allocation, spills, latency hiding, and why occupancy alone does not establish performance.
- [AMD: GPU Reshape waterfall examples](https://gpuopen.com/learn/gpu-reshape-beta-2/) — compiler-generated iteration for divergent indexing and register/workgroup-memory tradeoffs; conditional on actual lowering.
- [NVIDIA: branching and divergence](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#branching-and-divergence) — execution paths and predication; CUDA-specific mappings and intrinsics do not transfer automatically.
- [WGSL: uniformity](https://www.w3.org/TR/WGSL/#uniformity) and [subgroups](https://www.w3.org/TR/WGSL/#subgroups) — language contracts; verify support in the shipping implementation.
