# Benchmark, Replay, Correctness, and Regression Protocol

Use this reference for every task. Performance work is experimental work: the benchmark defines the claim, and replay/canonical assertions prove the optimized build executed materially the same workload.

## 1. Benchmark contract

Record concrete values or `unknown` before claiming a win:

```yaml
benchmark:
  id:
  build_commit:
  package_lock_hash:
  browser_runtime:
  os_device_gpu:
  power_mode:
  display_or_xr_rate:
  scenario:
  command_tape:
  seed:
  starting_snapshot:
  fixed_quality_settings:
  cold_or_warm:
  warmup_duration_or_ticks:
  capture_duration_or_ticks:
  run_count:
  foreground_visibility_state:
  network_state_if_relevant:
  thermal_precondition:
  expected_periodic_events:
  acceptance_noise_floor:
```

Use at least three scenario classes when the project warrants them:

- **Representative:** normal player behavior and content density.
- **Stress:** deliberately exercises the reported hotspot without changing its nature.
- **Lifecycle:** repeated load/spawn/despawn/teardown or a sustained session.

Do not benchmark a static camera if normal play changes visibility, contacts, animation, uploads, or worker traffic. Do not compare different scene progression, AI decisions, spawn counts, camera paths, quality settings, or browser visibility states.

## 2. Replay and gameplay-level reproducibility

The default requirement is not bitwise cross-platform physics identity. It is a repeatable command tape that produces the same canonical gameplay contract closely enough to prove both variants did the same work.

Record:

```yaml
replay_contract:
  tick_rate:
  command_ordering:
  rng_implementation_and_seed:
  entity_spawn_order:
  entity_despawn_order:
  starting_world_snapshot:
  canonical_state_fields:
  event_digest_fields:
  tolerated_numeric_error:
  render_semantic_assertions:
```

Canonical state should favor gameplay meaning over raw engine memory. Examples:

- entity IDs, alive/dead state, score, inventory, damage, triggers, ownership, objective progress
- quantized transforms/velocities for bodies whose exact state matters
- collision/trigger/damage event sequence or multiset, depending on ordering guarantees
- spawn/despawn counts and stable entity generations
- camera path and visible-object IDs for render comparisons

Do not hash nondeterministic metadata, transient handles, memory addresses, unordered map iteration, wall-clock timestamps, or raw floats when a gameplay tolerance is sufficient.

### Minimal replay interface

```ts
export interface PerfReplay<Input, Digest> {
  readonly id: string;
  readonly fixedDt: number;
  setup(seed: number): Promise<void> | void;
  inputForTick(tick: number): Input;
  step(input: Input): void;
  digest(): Digest;
  semanticAssertions(): readonly string[];
  teardown(): Promise<void> | void;
}
```

A stronger implementation stores command tapes and periodic checkpoints so divergence can be localized to a tick rather than discovered only at the end.

## 3. Equivalence gates

`intended_equivalent` means “no change is intended,” not “equivalence has been established.” Validate only the surfaces touched by the patch, but validate all of them.

### Gameplay gate

Check as applicable:

- canonical state digest
- event sequence/order or set semantics
- score, damage, ownership, triggers, AI decisions, and objective outcomes
- fixed-tick count, catch-up count, dropped/coalesced command count
- spawn/despawn identity and generation handling

### Physics gate

Check as applicable:

- quantized body poses/velocities at checkpoints
- sleeping/awake states when gameplay-visible
- contacts, intersections, forces, CCD outcomes, and query results
- body/collider creation and removal order

### Render-semantic gate

Check as applicable:

- visible-object set and hide/show behavior
- culling and bounds
- transparent order
- picking/raycast IDs
- instance or batch object identity
- shadows and reflection/refraction inclusion
- animation completion and pose at checkpoints
- camera and XR view behavior

### Lifecycle gate

Check as applicable:

- resource counts return to the expected plateau
- no stale event listeners, worker messages, physics handles, or scene nodes
- context/device-loss rebuild restores the same logical scene

Use `equivalence_status: verified | partial | failed | untested`. `partial` must name the unverified surfaces.

## 4. Run protocol

A good default for a stable local lab is several warm runs, each long enough to include the symptom; use more runs when variance is high. Do not elevate one run as representative merely because it supports the hypothesis.

For every variant:

1. Start from the same build state and scenario snapshot.
2. Apply the same fixed quality and browser/device conditions.
3. Warm the exact resources declared warm; do not accidentally warm the candidate only.
4. Run the same command tape.
5. Capture the same tick or time window.
6. Preserve raw samples or a trace, not only summary numbers.
7. Repeat.
8. Compare distributions and run-to-run spread.

Report:

```yaml
frame_metrics:
  median_ms:
  mean_ms:
  p95_ms:
  p99_ms:
  max_ms:
  frames_over_budget_pct:
  severe_hitch_count:
  longest_over_budget_cluster_frames:
  run_to_run_variance:
```

Add subsystem distributions when relevant: render submission, physics step, handoff, GPU, GC, load stage, XR presentation.

### Noise rule

A result is `inconclusive` when the measured change is inside normal run-to-run variation or instrumentation overhead. Do not claim a win because one average changed while p95/p99, budget misses, and the implicated subsystem did not.

Before using a rigid percentage threshold, measure the harness noise on unchanged builds. A practical starting rule is to require movement larger than both the predefined noise floor and the baseline confidence spread; tune it to the environment.

## 5. One-change causal discipline

Apply one independently reversible causal unit per benchmark. Examples of valid units:

- disable one shadow update path
- replace one dynamic collider family
- change one worker payload representation
- instance one eligible prop family
- prewarm one cold resource class

Do not combine “instancing + texture compression + worker migration + lower DPR” and infer why the result changed. When a composite is technically inseparable, label it `composite`, state the subchanges, and lower causal confidence.

## 6. Cold, warm, and sustained protocols

### Cold

Start from the relevant cold state: no decoded asset, no shader/program pipeline, no uploaded texture, no initialized decoder/WASM module, or no allocated target—whichever the symptom concerns. Browser cache state must be declared.

### Warm

Warm only the resources the production path is expected to have warmed. A benchmark that manually visits every scene before capture may hide real first-use stalls.

### Sustained/thermal

For thermal degradation, separate:

- cold peak
- stabilized sustained window
- degradation slope
- recovery after reduced load

Use the same device power state and preconditioning. Report elapsed time, not just “after a while.” Do not infer thermal throttling solely from falling FPS; correlate with stable workload and subsystem timing where possible.

## 7. Suspension and resume

A hidden tab, paused XR session, device sleep, or debugger stop can produce a giant elapsed time, fixed-step spiral, or worker backlog.

Explicitly define:

```yaml
resume_policy:
  pause_simulation_when_hidden:
  elapsed_time_clamp:
  max_catchup_steps:
  queued_command_policy:
  worker_backlog_policy:
  multiplayer_authority_behavior:
  replay_semantic_impact:
```

Any clamp, skipped simulation, queue coalescing, or backlog drop is a `behavior_trade` unless the product contract already defines it. Test visibility loss and resume as a separate acceptance scenario.

## 8. Lab versus field

- **Lab replay:** establishes causality under controlled conditions.
- **Field telemetry:** establishes prevalence across real devices, sessions, content, network states, power modes, and browser versions.

Do not use field correlation alone to claim a code path caused a spike. Do not use one high-end lab machine to claim the user population is fixed. Label every conclusion `lab`, `field`, or `lab_and_field`.

Useful field aggregates:

- device/runtime/backend cohort
- target and actual refresh class
- frame-budget miss rate and hitch clusters
- quality tier/DPR/foveation state
- active bodies, draw calls, pass count, changed-body density
- worker queue depth and late-tick rate
- memory trend and session duration
- cold/first-use marker

Avoid collecting high-volume raw traces from every user; sample and aggregate with a declared overhead/privacy policy.

## 9. CI performance regression

Performance CI needs stable hardware or a known noisy-environment policy. Store raw artifacts for failures.

Define per scenario and device tier:

```yaml
ci_perf_gate:
  scenario:
  target_budget_ms:
  warning_threshold:
  blocking_threshold:
  run_count:
  aggregation_rule:
  flaky_retry_rule:
  semantic_digest_required:
  artifact_retention:
```

Good gates include:

- p95/p99 regression beyond measured harness noise
- budget-miss rate regression
- severe-hitch count regression
- implicated subsystem regression
- resource-count or heap-plateau regression
- replay digest or semantic assertion failure

Do not block CI on an unstable micro-difference. Use warnings for weak signals and blocking thresholds for repeatable regressions.

## 10. Performance proof bundle

Use this final artifact:

```yaml
proof_bundle:
  runtime_identity:
  benchmark_contract:
  raw_artifacts:
  baseline:
  hypothesis:
  discriminating_test:
  diagnosis_status:
  patch_commit:
  before_after:
  result: accepted | rejected | inconclusive
  gameplay_replay:
  render_semantics:
  lifecycle:
  suspension_resume:
  loss_recovery:
  residual_bottleneck:
  rollback:
  lab_or_field:
```

The bundle is complete only when another engineer can reproduce the workload, understand why the change should help, see whether the predicted metric moved, and verify that the application still performed the same intended work.

