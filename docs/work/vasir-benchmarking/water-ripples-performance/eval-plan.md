# EVAL PLAN: THREE.JS WATER-RIPPLES PERFORMANCE

**Human Read:** This benchmark tests whether `code__threejs-rapier-performance` helps fresh coding agents find and implement faster versions of one frozen Three.js water-ripple demo without changing the product. The result must keep three claims separate: audit quality, absolute implementation improvement over the original, and incremental skill lift over the matched clean agent.

## Proof Capsule

**Last updated:** 2026-08-27  
**Work spec:** `docs/work/vasir-benchmarking/work-spec.md`  
**Why this plan exists:** Twenty fresh sessions, isolated editable workspaces, deterministic browser replay, visual and topology vetoes, and sequential timing must remain tied to one run identity across several commands.  
**Current proof owner:** benchmark campaign coordinator  
**First legal gate action:** build and validate the frozen benchmark fixture and isolated fresh-agent runner  
**Claim boundary:** Chrome on this Mac, one fixed 1600×900 DPR-1 workload, one ordinary visual replay, and one synthetic max-pool stress state. This does not establish mobile, thermal, memory, or cross-browser performance.

## Doc Conventions

- Schema truth: `$eval__design-proof-gates` only.
- Objective and subjective state are separate.
- Gate IDs never renumber.
- A fast page cannot rank if it breaks the workload, visuals, behavior, or render-topology contract.
- Displayed FPS, fixed-state frame work, GPU timing, and draw calls are different measurements and are never substituted for one another.

## 1) Unlock & Terminal Truth

- **Unlock:** show, with runnable artifacts, whether the skill changes what fresh OpenAI and Claude coding agents notice and what performance they actually deliver.
- **Terminal truth:** every paired cell retains its exact prompt and output page; valid pages replay the same scene; the report prints original-to-candidate and clean-to-skill metric deltas directly.
- **Authority environment:** Google Chrome 152 on the local benchmark host.
- **Subjective component:** a human may veto visible differences after reviewing retained ordinary-scenario screenshots.
- **Claim boundary:** no result outside the declared browser, host, viewport, DPR, and scenarios is implied.

## 2) Material Risk & Synthesis

| Failure ID | Plausible material failure | Disposition | Gate | Why sufficient |
| --- | --- | --- | --- | --- |
| F1 | Conditions differ by more than the skill or inherit ambient instructions | Must falsify | `WATER-RIPPLES__G1` | Exact prompt recovery, hashes, fresh-session receipts, and isolated workspaces expose contamination. |
| F2 | Audit prose sounds good but misses the dominant work | Must measure | `WATER-RIPPLES__G2` | A frozen issue rubric records concrete findings and unsupported prescriptions separately. |
| F3 | Candidate wins by lowering resolution, density, cadence, or breaking the page | Veto | `WATER-RIPPLES__G3` | Deterministic state, dimensions, errors, screenshots, and behavior observations must all survive. |
| F4 | Candidate adds another renderer, frame owner, full-scene pass, target fan-out, or terminal write | Veto | `WATER-RIPPLES__G4` | Declared and observed topology is compared before timing. |
| F5 | Timing noise, vsync, or changed workload creates a false win | Must falsify | `WATER-RIPPLES__G5` | Sequential balanced rounds, duplicate controls, raw distributions, optional GPU queries, and explicit no-signal rules bound the claim. |
| F6 | Absolute improvement is mislabeled as skill lift | Must falsify | `WATER-RIPPLES__G6` | Each model has matched original→candidate and clean→skill comparisons; the report shows both. |

## 3) Proof Stack

One run coordinates all five model families and both conditions. `G1` establishes fair generation. `G2` measures the audit lane. Implementation candidates then pass `G3` and `G4` before `G5` may rank runtime. `G6` synthesizes only matched, valid, same-run evidence. Raw samples and screenshots survive beside `run.json`.

**Stack blind spot:** one desktop Chrome host cannot prove mobile thermals, battery, memory pressure, or other browser backends.

## 4) Objective Gates

### 4.1 Index

| Gate | Class | State | Current basis | Receipt |
| --- | --- | --- | --- | --- |
| `WATER-RIPPLES__G1` | contract / isolation | Open | runner missing | none |
| `WATER-RIPPLES__G2` | response assessment | Open | audit rubric missing | none |
| `WATER-RIPPLES__G3` | browser / behavior | Open | deterministic fixture and verifier missing | none |
| `WATER-RIPPLES__G4` | render topology | Open | topology observer missing | none |
| `WATER-RIPPLES__G5` | performance | Open | sequential measurement harness missing | none |
| `WATER-RIPPLES__G6` | same-run compound | Open | G1–G5 incomplete | none |

### 4.2 Cards

```yaml
id: WATER-RIPPLES__G1
class: contract / isolation
claim: Each clean/skill pair starts from the same fixture in fresh isolated sessions and differs only by the exact serialized skill block.
lie: Ambient repo instructions, shared sessions, unequal inputs, or condition-specific task wording explain the result.
setup: Five max-reasoning model families; audit and implementation lanes; clean and skill conditions; one trial.
action: Run the benchmark-local fresh-agent coordinator.
observation: Prompt hashes, treatment hash, input/output tree hashes, session receipts, randomized condition mapping, and retained workspaces.
verdict: Green only when deleting the treatment block recovers the byte-identical clean prompt and every row has the declared fresh isolated basis.
authority: Retained run directory under `.agents/vasir-evals/threejs-water-ripples-performance/`.
basis: [fixture/index.html, neutral-instruction.txt, task-audit.md, task-optimize.md, run-agents.mjs]
blind_spot: Provider-side model changes behind aliases.
potency: credible-oracle; exact retained bytes and process receipts directly expose the claimed basis.
loop: node benchmarks/threejs-water-ripples-performance/run-agents.mjs
run_policy: One-time campaign, rerunnable on treatment or fixture change.
stop: Missing logged-in provider CLI or a fixture/treatment hash change after launch.
state: Open
receipt: { last_run: none, result: none, evidence: none }
```

```yaml
id: WATER-RIPPLES__G2
class: response assessment
claim: Audit outputs are compared on a frozen set of fixture-grounded findings and measurement requirements.
lie: Length, confidence, or generic optimization vocabulary is mistaken for finding the actual hot work.
setup: Ten anonymous audit responses from G1.
action: Apply the saved rubric to each response without using implementation timing as retroactive audit credit.
observation: Finding-level evidence with citations to each response.
verdict: Green when every score is reproducible from the response and rubric; this gate does not require the skill to win.
authority: Benchmark-local rubric and retained audit outputs.
basis: [audit-rubric.json, run.json]
blind_spot: The rubric cannot prove a proposed fix would work.
potency: credible-oracle; concrete source-grounded finding criteria, with unsupported claims scored separately.
loop: node benchmarks/threejs-water-ripples-performance/score-audits.mjs --run-id <run-id>
run_policy: One-time per campaign.
stop: Rubric changes after responses are visible.
state: Open
receipt: { last_run: none, result: none, evidence: none }
```

```yaml
id: WATER-RIPPLES__G3
class: browser / behavior
claim: A candidate still renders and controls the same demo at the same resolution policy, pool capacity, cadence, and deterministic ordinary state.
lie: Removing effects, lowering quality, changing density, or a runtime error produces a faster number.
setup: Chrome 152; 1600x900 CSS pixels; DPR 1; fixed seed and ordinary replay tick; candidate benchmark mode.
action: Load each page, wait for textures, replay the ordinary scenario, inspect snapshot, and capture the same frame.
observation: No exceptions; expected dimensions/counts/state; retained PNG; pixel comparison against the frozen fixture.
verdict: Candidate is eligible only when health and exact state contracts pass and the pixel comparison stays within the benchmark's frozen threshold. A human can still veto any visible semantic difference.
authority: Browser state plus retained images; human veto remains separate.
basis: [fixture/index.html, verify-candidates.mjs]
blind_spot: Automated pixels do not decide taste or long-session interaction feel.
potency: characterization; the frozen fixture establishes the pre-change replay and image.
loop: node benchmarks/threejs-water-ripples-performance/verify-candidates.mjs --run-id <run-id>
run_policy: One-time per campaign.
stop: External assets fail to load or deterministic fixture replay is not stable across duplicate controls.
state: Open
receipt: { last_run: none, result: none, evidence: none }
```

```yaml
id: WATER-RIPPLES__G4
class: render topology
claim: A candidate does not create an unrequested content-scaled renderer, frame owner, full-scene/G-buffer pass, target family, or terminal output path.
lie: Lower draw calls hide a structurally catastrophic frame-global multiplier.
setup: Ordinary and max-pool stress states from G3.
action: Inspect source and observe frame callbacks, renderer/canvas/context ownership, scene submissions, target binds, and terminal writes for one fixed frame.
observation: Before/after topology counts and multiplicity axes.
verdict: Reject unforced multipliers; a candidate may reduce work inside the existing one-owner, ripple-target-plus-main-output topology.
authority: Source plus browser observer.
basis: [code__threejs-rapier-performance/references/render-topology-guard.md, verify-candidates.mjs]
blind_spot: Opaque backend-internal pass fusion or expansion.
potency: adversarial/property; sweep logical ripple cardinality while global owner/target/output cardinality must stay constant.
loop: node benchmarks/threejs-water-ripples-performance/verify-candidates.mjs --run-id <run-id>
run_policy: One-time per campaign.
stop: Observer changes page topology or cannot distinguish offscreen from terminal writes.
state: Open
receipt: { last_run: none, result: none, evidence: none }
```

```yaml
id: WATER-RIPPLES__G5
class: scale / performance
claim: For the fixed max-capacity stress state, retained distributions can distinguish an original-to-candidate runtime change on this host.
lie: Vsync, warmup, cache order, observer overhead, GPU contention, or an unstable baseline creates the apparent win.
setup: Chrome 152; 1600x900 DPR 1; 200 logical ripples and 50 drops; fixed seed; sequential balanced rounds; duplicate unchanged controls.
action: Record live RAF cadence separately, then repeated fixed-state CPU submission, `gl.finish` completion, renderer calls/triangles, and GPU timer queries when supported.
observation: Raw samples; p50/p95/p99; budget misses; per-round variance; unchanged-control drift; GPU support/disjoint state.
verdict: Report a runtime direction only when workload/quality gates pass and the effect exceeds the frozen noise rule. Otherwise report NO SIGNAL. Draw-call direction remains structural evidence, not timing proof.
authority: Local Chrome process and raw retained samples.
basis: [run-performance.mjs, benchmark-replay.md, frame-pacing-attribution.md, three-rendering-gpu.md]
blind_spot: `gl.finish` changes pipeline overlap; live RAF is display capped; optional GPU timers exclude the compositor.
potency: credible-oracle; direct same-host repeated browser measurements with duplicate controls and raw samples.
loop: node benchmarks/threejs-water-ripples-performance/run-performance.mjs --run-id <run-id>
run_policy: One-time per campaign, sequential only.
stop: Unchanged controls exceed the frozen stability limit, the page changes workload/quality, or Chrome reports disjoint GPU timing.
state: Open
receipt: { last_run: none, result: none, evidence: none }
```

```yaml
id: WATER-RIPPLES__G6
class: same-run compound
claim: The campaign can state absolute repair success and incremental skill lift without conflating them.
lie: A good candidate is credited to the skill when its matched clean candidate is equally good, or FPS is inferred from direct frame work.
setup: One run ID with complete G1–G5 receipts for every compared pair.
action: Synthesize audit coverage, eligibility, original-to-candidate metrics, and matched clean-to-skill metrics by model.
observation: Per-model table and aggregate counts with explicit missing/no-signal cells.
verdict: Absolute improvement is original→candidate. Skill lift is skill→matched clean only. Displayed FPS is reported only from live RAF. No eligible comparable pair means no skill-lift claim.
authority: Same retained run and derived report.
basis: [run.json, audit scores, verification receipts, performance summaries]
blind_spot: One trial per model cannot estimate model sampling variance.
potency: credible-oracle; matched same-run comparison with independent validity vetoes.
loop: node benchmarks/threejs-water-ripples-performance/render-report.mjs --run-id <run-id>
run_policy: One-time per campaign.
stop: Any compared cell lacks a G1–G5 receipt.
state: Open
receipt: { last_run: none, result: none, evidence: none }
```

## 5) Subjective Gate

```yaml
id: WATER-RIPPLES__S1
criterion: No candidate changes the recognizable water, ripple, drop, player, camera, or control experience.
scope: Ordinary-scenario screenshots and linked runnable candidate pages for candidates included in the final comparison.
artifact: `.agents/vasir-evals/threejs-water-ripples-performance/<run-id>/verification/`
support: G3 browser health, state, dimensions, and pixel comparisons.
state: Waiting Human
receipt: { verdict: none, affected_criterion: visual and interaction equivalence, reviewed_artifact: none }
```

## 6) Harness Inventory & Missing Needs

**Existing:** `benchmarks/threejs-observatory-instancing/` supplies isolated-generation, CDP, topology, and repeated-timing precedents. It is fixed to another fixture/run and cannot directly prove this campaign.

| Harness need | Enables | Why existing proof is insufficient | Envelope | Owner | Retirement |
| --- | --- | --- | --- | --- | --- |
| Deterministic benchmark fixture hook | G3–G5 | Water state is module-local and driven by RAF time and `Math.random()` | `benchmarks/threejs-water-ripples-performance/fixture/**` | fixture harness | Retire with fixture. |
| Multi-provider editable-workspace coordinator | G1 | Generic Vasir runner is response-only; old Three.js pilot is Codex-only | `benchmarks/threejs-water-ripples-performance/run-agents.mjs` | generation harness | Retire when generic workspace tasks exist. |
| Candidate verifier and topology observer | G3–G4 | Static source review cannot prove runnable state or executed multiplicity | benchmark-local verifier | browser harness | Retire with benchmark. |
| Sequential timing harness | G5 | Existing harness is frozen to another run; FPS and direct work need separate observers | benchmark-local performance runner | browser harness | Retire with benchmark. |
| Audit scorer | G2 | Generic prose quality is not fixture-grounded issue coverage | benchmark-local rubric/scorer | assessment harness | Retire with rubric. |
| Derived report | G6 | Generic report cannot render runtime metrics or page artifacts | benchmark-local renderer | campaign coordinator | Regenerate from run evidence. |

## 7) Run Policy & Exceptions

- Local, one-time campaign: G1–G6. Human: S1.
- Browser measurements are sequential. Agent generation may run concurrently in isolated workspaces.
- External CDN assets are cached/network-dependent and remain a stated limitation.
- Artifact retention: exact prompts, final responses, candidate `index.html` files and patches, screenshots, raw timing samples, summaries, and a derived standalone report.
