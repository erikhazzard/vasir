# Performance Ladder: Reconstruct the Cost of the Application

Use for broad low-FPS investigations, reaching a target refresh rate, or escaping repeated micro-optimizations that leave the frame-budget gap unexplained. This is the house investigation process for those tasks. Keep a confirmed isolated fix narrow; for an explicitly bounded subsystem task, build the ladder within that boundary and report constraints outside it.

**Start with an empty scene in the real runtime. Add one system, measure its contribution, explain its work, then add the next.** Every costly rung must answer: what is the minimum work the experience requires, what extra work does this implementation perform, and what simpler design could remove it? Existing code and asset choices are hypotheses to challenge.

## Contents

- [Reset the investigation](#1-reset-the-investigation)
- [Establish a genuine empty baseline](#2-establish-a-genuine-empty-baseline)
- [Build the cumulative ladder](#3-build-the-cumulative-ladder)
- [Descend into the added work](#4-descend-into-the-added-work)
- [Establish the minimum necessary work](#5-establish-the-minimum-necessary-work)
- [Test a substantially cheaper design](#6-test-a-substantially-cheaper-design)
- [Reassemble and prove the target](#7-reassemble-and-prove-the-target)
- [Keep the evidence usable](#8-keep-the-evidence-usable)

## 1. Reset the investigation

Repeated cache tweaks, allocation edits, shader instruction changes, or tiny loop wins are a cue to step back when the complete app still misses its target. Stop the next speculative local edit and reconstruct the cost. Retain verified wins; mark inconclusive experiments as such. Reuse a current ladder if its build, workload, settings, and runtime still match.

Capture the complete application's failure as a reference point, then define the target device/session, representative activity and population, actual refresh rate, fixed quality settings, and acceptance criteria. At 72 Hz the interval is 13.89 ms; reserve headroom and evaluate deadline misses and tail behavior. The interval is not an app-JavaScript allowance.

Use the existing [benchmark protocol](benchmark-replay.md) for repeatability, warm/cold separation, noise, and correctness checks, and [frame attribution](frame-pacing-attribution.md) for timing semantics. Reuse scenarios and instrumentation. Add only the reversible switches and bounded timing regions needed to isolate work; do not build a general benchmark framework first. If target hardware is unavailable, preserve useful inspection and a runnable ladder, and state which measurements remain unverified.

## 2. Establish a genuine empty baseline

Keep the production renderer/backend, browser or XR session, output dimensions, views, refresh rate, and thread topology. Render an empty scene or minimal clear through that runtime. Disable optional application systems at their actual execution owners: updates, animation/IK, scene traversals, physics work, worker traffic, effects, networking processing, and UI work as applicable. Keep required session/tracking plumbing and document unavoidable shell work.

Verify counters and profiles show the disabled work stopped. `visible = false` does not stop application-owned mixers, IK, queries, timers, worker messages, or transform maintenance. An empty image with a busy application behind it is an invalid empty baseline. Record any dependency that prevents clean isolation; use a bounded diagnostic replay/stub or measure the coupled group explicitly.

Separate the renderer/session floor from required application-shell overhead if both matter. If the empty runtime already misses the deadline, resolve or attribute that floor before blaming content. Record browser/compositor or measurement uncertainty honestly; a desktop mirror cannot prove headset performance.

## 3. Build the cumulative ladder

Map the actual system owners and dependencies, then enable one meaningful system at each rung. Derive the order from this application. A possible order is empty runtime → application shell → static world → avatar rendering → pose evaluation → physics → replication/interpolation → effects/UI. These are examples; split or reorder them to match real boundaries. Keep scene state, camera path, population, and all unrelated settings fixed between adjacent comparisons.

For each rung:

1. Record the enabled systems and the exact added work, including prerequisite work. Label an inseparable group `composite`.
2. Warm the declared resources, replay the same activity, and repeat comparable captures. Separate first-use spikes from steady work.
3. Record cumulative CPU update/submission, worker/handoff, and supported GPU timings; frame p50/p95/p99, deadline misses, and relevant work counts. Retain run spread and raw evidence. Unknown GPU time remains unknown.
4. Compare with the preceding rung, then return to that rung to check drift. Use the same capture overhead; counter thermal or clock drift with comparable preconditioning and alternating runs where needed.
5. Record the incremental effect, its uncertainty, and the next attribution step. Investigate meaningful added work even if presentation remains capped at 72 FPS: spare budget can disappear before FPS changes.

A difference between adjacent p95 values describes those distributions; it is not the new subsystem's exclusive p95. Measure the subsystem itself. CPU, worker, and GPU stages overlap, and shared work changes with interactions. Do not sum their durations, independent percentiles, or rung deltas into an invented frame total.

Rung cost is conditional on the previously enabled systems. When attribution depends on interactions, also remove the suspect from the complete scene or test the relevant pair/order. An isolated system cost does not establish its integrated cost. Record unexpectedly negative deltas and investigate their mechanism or noise instead of forcing an additive model.

## 4. Descend into the added work

For each rung with material added cost or concerning population scaling, recurse: system → subsystem → operation. Use named timings, call sites, work counts, and one-mechanism perturbations until the cost has an actionable explanation. Retain an unexplained remainder. Record below-noise contributions without endlessly subdividing them.

For an avatar rung, separate pose/track evaluation, IK, transform propagation, skeleton matrix preparation, palette upload, render submission, GPU skinning, animated bounds, and picking. Freeze remote pose evaluation while continuing to render the same posed meshes to probe CPU pose work; use a separate rendering substitution to investigate deformation cost. A rigid proxy changes more than the number of bones, so record those differences.

Check invocation multiplicity as well as time: once per asset, spawn, changed entity, simulation tick, frame, eye, pass, or avatar. Find repeated scene searches, duplicate pose solves, per-eye view-independent work, full-buffer uploads, and work on inactive entities. Link each implicated cost to its owner and the population or cadence that multiplies it.

Sweep the implicated population through empty, single, representative, and crowded cases where applicable. Determine whether work follows active/changed entities, total entities, pairs, bones, vertices, pixels, or passes. A cheap single-avatar path may dominate a crowd. Do not infer the scaling law from one population or from a counter alone.

## 5. Establish the minimum necessary work

For each implicated operation, document:

- **Required result and consumer:** what player-visible or gameplay outcome needs it, and who actually reads it?
- **Minimum set and cadence:** which entities/data need it, when inputs change, and how fresh the result must be?
- **Minimum fidelity:** what precision, rig complexity, sampling, geometry, or shading is perceptually or behaviorally necessary?
- **Actual work and excess:** what the current implementation does, which repetitions/conversions/traversals/copies can disappear, and the concrete deletion or replacement?
- **Residual justification:** why retained work is necessary, supporting evidence, and any unknown that prevents that conclusion?

Apply [Eliminate unnecessary work](eliminate-unnecessary-work.md) to choose the replacement. Challenge inherited defaults, asset complexity, update frequency, and representation. “The engine does it,” “the rig came this way,” and “it is already cached” do not justify the work. Include the maintenance cost of caches, dirty sets, adapters, and synchronization in the alternative.

Establish the smallest justified implementation for the required experience; do not claim a mathematical absolute minimum from inspection. Preserve local tracking, gameplay/authority, and required lifecycle behavior. A temporary diagnostic bypass demonstrates attribution, not permission to ship missing functionality.

## 6. Test a substantially cheaper design

For each dominant cost, explicitly ask whether a different representation could make the implicated work roughly 10× cheaper with at most a small visual sacrifice. Use **10× performance for ≤10% perceived-quality loss** as a candidate-search heuristic, not a promised result or universal quality metric. Consider these candidates alongside equivalent work removal before spending the investigation on instruction-level tuning.

Translate the quality budget into named comparisons: viewing distances, silhouette, face/hand identity, extreme poses, grip alignment, motion stability, effect readability, and stereo continuity as relevant. Use the task's already authorized trade budget; preserve stricter quality constraints. Do not invent a “90% quality” score or treat the heuristic as permission to change gameplay or ship an unrequested downgrade.

For example, compare a 52-bone rig with an 18-bone candidate that preserves the required silhouette and poses. Inspect tracks, IK chains, transform propagation, matrix preparation, palette uploads, and vertex deformation separately. Ordinary per-bone matrix preparation scales with bone count: 52 → 18 removes about 65% of that per-bone work, not an exponential amount. Fewer bones alone need not reduce stock shader work per vertex. Removing whole animation/IK paths or repeated traversals may yield larger measured savings. Follow the [avatar reference](mobile-xr-avatars.md) for remapping, influences, bounds, and quality checks.

Compare one causal design change at a time at isolated and representative/crowded populations. Include replacement maintenance, new draws/uploads, and transition costs. Record measured time saved in the implicated stage and complete application, plus the concrete quality difference. A 10× subsystem improvement is not a 10× frame improvement. Accept a useful smaller measured win; reject or mark inconclusive a candidate that fails quality checks or stays inside noise.

## 7. Reassemble and prove the target

Re-enable the complete application and replay the representative bad case. Verify the accepted changes with real interactions, crowd scaling, joins/spawns, and sustained use as relevant. Check both eyes and protected visual/interaction surfaces for quality trades. Re-profile: successful removal can expose a different limiting stage.

Finish when the complete workload meets the declared target and headroom with acceptable tail behavior and deadline misses, or report the specific remaining constraint and evidence needed. If the target remains unmet, use the ladder to choose the largest justified work removal next. Exhausting small tweaks in one subsystem does not establish that the application's optimization opportunities are exhausted.

## 8. Keep the evidence usable

Keep a compact record in the existing task or benchmark artifact. A useful row shape is:

`Rung / enabled systems | Cumulative timings and misses | Incremental effect / uncertainty | Subsystem and code owner | Required work | Removable work / cheaper design | Quality trade | Result / next action`

Attach the shared runtime/settings, scenario, toggle instructions, raw captures, population sweep, and integrated before/after result once. Preserve records for small or below-noise rungs as well as expensive ones so coverage is visible. Document unexplained residuals and untested alternatives. Keep enough detail to resume at the next costly rung without repeating the investigation; no separate reporting framework is required.
