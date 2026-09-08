# Declared Dungeon Master model-coverage extension

This is a separate completion edition, `dm-outline-v1-declared-model-extension-v1`, authorized to extend the existing Astra Ultra study to the exact common 33-configuration Writing roster. It does not revise or rerun the original study. The original definition, skill, prompt bytes, six primary repetitions, five twice-repeated transfer prompts, neutral six-dimension rubric, two fresh counterbalanced Astra Ultra reviewer seats, and intention-to-invoke adherence policy remain fixed.

The original single-model methodology is retained as historical evidence and explicitly superseded only as to the contestant roster and declared provider transport. Codex contestants use the original frozen restricted DM runtime. Claude contestants use a separately frozen restricted Read-only runtime with exact framed frozen-chunk verification. Neither a missing required-read receipt nor weak content permits regeneration. No original successful answer or review is replaced.

## Inventory and operational bounds

The full declaration is 33 models × 16 pairs: 1,056 outlines and 1,056 paired reviewer sessions (2,112 candidate assessments). The original 32 outlines and 32 paired reviews are inherited unchanged. New work is therefore 1,024 outlines plus 1,024 paired reviews. The missing models are 22 Codex and 10 Claude configurations; every judge still uses the original Astra Ultra configuration.

Concurrency defaults to four and has a configurable ceiling of sixteen, counting both writers and judges. The first scored batch remains four; increases require root orchestration's explicit allocation after that batch is stable. `--maximum-calls` bounds each invocation, including technical retries; root orchestration must also share a global concurrency budget with other benchmarks. Historical successful calls averaged 187 seconds per writer and 270 seconds per reviewer: approximately 32.5 hours at concurrency four, or 8.1 hours at sixteen, for the new workload if those timings carried over. These are estimates, not completion guarantees. Each call retains the original twenty-minute timeout. All original monetary costs were unknown; no dollar-cost claim is inferred from normalized tokens.

## Durable commands

Preparation is local-only. Use a new directory; an existing directory is never overwritten. The command copies and pins the complete parent evidence tree, original runtime, exact parent JSON bytes, and the new controller/Claude dependency tree. Wait for the shared Claude adapter and its preflight source to be finalized before preparing.

```sh
node cli/eval/expand-dungeon-master-benchmark.js --prepare \
  --project-root /Users/erikhazzard/code/vasir \
  --original-directory /Users/erikhazzard/code/vasir/.agents/vasir-evals/dungeon-master-adventure-outline/dm-outline-v1-2026-09-08 \
  --run-directory /Users/erikhazzard/code/vasir/.agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908 \
  --run-id dm-model-coverage-20260908 \
  --configuration-file docs/work/vasir-benchmarking/dungeon-master-adventure-outline/model-coverage-extension/configurations.json \
  --authorization 'User authorized completion of all 33 Writing model configurations; retain original results.'
```

Before scored provider dispatch, run the frozen controller's `--preflight` command with explicit authorization. It makes exactly four excluded infrastructure calls: plain and skill for Codex and Claude. It retains raw calls and derives `preflight.json` assertions from the frozen invocation flags, failed tool events for an outside sentinel, skill-root marker delivery, and complete compatible frozen-reference byte receipts. It makes no automatic probe retries.

```sh
node .agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908/runtime-source/cli/eval/expand-dungeon-master-benchmark.js --preflight \
  --run-directory /Users/erikhazzard/code/vasir/.agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908 \
  --authorization 'Four excluded provider isolation and reference-byte probes; no scored dispatch.'
```

The resulting `preflight.json` must have `status: "passed"`, the exact new `manifestHash`, and `providers` entries for each dispatched writer provider plus Codex judges. Each provider entry contains raw-file pins `{path, bytes, sha256}` relative to the run directory and assertions `freshSessions`, `outsideReadDenied`, `hostSkillCatalogAbsent`, `networkUnavailable`, `instructionDelivered`, and `requiredReferenceFullBytesObserved`. Do not turn a failed assertion into a passing one by editing the receipt. Infrastructure probes are excluded from benchmark scores and preserve the same existing authentication context. A failed probe is reported for diagnosis, not silently retried or replaced.

## Explicit zero-scored-call preparation supersession

The first preparation (`dm-model-coverage-20260908`) made four excluded provider calls and zero scored calls. Both providers proved the complete mandatory reference bytes. Claude retained actual denied outside-Read events in both arms; Codex's JSONL omitted the outside-read command, so its provider-log denial assertion correctly remains failed. Model self-report is not treated as observed denial.

The v2 preparation explicitly supersedes this unscored preparation to raise only the controller's concurrency ceiling and add a separate native readiness verifier. It retains the complete prior directory, manifest, failed proof and all four calls under `superseded-preparation/`, with byte pins and a new manifest-bound lineage. Every previous transport dependency is copied from the previous frozen source, not from concurrently changing live runtime code.

```sh
node cli/eval/expand-dungeon-master-benchmark.js --prepare \
  --project-root /Users/erikhazzard/code/vasir \
  --original-directory /Users/erikhazzard/code/vasir/.agents/vasir-evals/dungeon-master-adventure-outline/dm-outline-v1-2026-09-08 \
  --supersedes-directory /Users/erikhazzard/code/vasir/.agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908 \
  --run-directory /Users/erikhazzard/code/vasir/.agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908-v2 \
  --run-id dm-model-coverage-20260908-v2 \
  --configuration-file docs/work/vasir-benchmarking/dungeon-master-adventure-outline/model-coverage-extension/configurations.json \
  --authorization 'Root authorized explicit unscored preparation supersession: ceiling sixteen, default four; unchanged transports and score protocol.'
```

The frozen v2 controller's `--native-preflight` makes exactly two local `codex sandbox` commands, not model/provider calls. It derives the permissions from the original frozen DM runtime, binds every override to both prior recorded Codex creator invocations, reads a synthetic allowed-workspace sentinel, and attempts a sibling outside sentinel. Actual commands, exit codes, stdout/stderr, sentinels, configuration hash and original runtime hash are retained in a versioned supplement. This evidence is explicitly **native sandbox enforcement plus recorded invocation binding**, not provider-observed denial.

```sh
node .agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908-v2/runtime-source/cli/eval/expand-dungeon-master-benchmark.js --native-preflight \
  --run-directory /Users/erikhazzard/code/vasir/.agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908-v2 \
  --authorization 'Root authorized two native sandbox commands only, no provider calls or scored dispatch.'
```

`--verify-native-preflight --supplement-file native-preflight/<timestamp>/supplement.json` independently checks the retained artifacts, recomputes both providers' readiness from their actual receipts/streams, and rejects changed configuration, transports, bytes, successful outside reads or failed inside reads. It does not mutate readiness. Only after independent validation and authorization may `--activate-native-preflight` with the same supplement and `--authorization` create a new v2 `preflight.json`. The original failed proof stays untouched. Every production scored invocation re-verifies the supplement and its derivation; changing stored `true` flags cannot bypass it.

Execute the frozen controller, with an explicit initial budget. This example permits only four calls; root orchestration chooses subsequent bounded batches.

```sh
node .agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908-v2/runtime-source/cli/eval/expand-dungeon-master-benchmark.js --execute \
  --run-directory /Users/erikhazzard/code/vasir/.agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908-v2 \
  --concurrency 4 --maximum-calls 4 --providers codex,claude \
  --authorization 'Authorized bounded completion batch after frozen isolation/read preflight.'
```

Normal resume uses the same command and reuses completed results. `--providers codex` can restrict writer dispatch while Claude preflight is pending; it does not remove Claude configurations or their planned coverage. Fixed Codex judges can run for any completed model pair. `--inspect` performs source-pin and original-record checks without provider calls.

## Pause, quota and recovery

`--pause` writes the local `PAUSE.json`; `--clear-pause` archives that control file under `operator-controls/`. An optional `--pause-file /absolute/shared-control.json` lets root orchestration stop dispatch across workstreams. SIGINT and SIGTERM also stop new dispatch and drain active calls. The sole `run.lock` is retained until every active call settles. Do not kill active calls or manually remove a lock without checking its recorded owner and any surviving provider processes.

Only raw provider terminal/error events and stderr can establish quota exhaustion; candidate prose cannot. Quota/authentication/configuration failures open a global circuit. Policy-filter failures remain terminal even under `--recover`. At most one unchanged-input technical retry is automatic; an explicit recovery invocation makes at most one new attempt per eligible failed unit.

`--recover` requires authorization. After quota/auth interruption it also requires `--resolution-file`: a pinned receipt with `status: "resolved"`, the same `manifestHash` and `accountContexts`, a `verifiedAt` later than the failed attempts, and per-provider raw-file pins containing a successful completion with no terminal error. The actual external problem must be resolved in the same authentication context; switching contexts to bypass quota is rejected. All previous failed attempts, raw streams and record-before snapshots remain retained.

The controller does not alter publication pointers, generated frontend data, deployment, or original source files. Publication support retains all 16 repetitions per model and ranks only models with all six primary pairs fully reviewed. Transfer summaries stay separate. The existing Astra scores and all original source hashes remain independently checkable in the combined edition.

## Drained checkpoint archives

After the controller finishes or drains a pause, the separate local-only archive utility preserves the exact run, raw generation/review evidence, runtime source, preflights and preparation lineage into a new directory. It takes the same writer lock, refuses active/running records, refuses existing destinations and verifies copied bytes against the unchanged source before finalizing. It writes a tree-pinned `checkpoint-archive.json`; the mutable source run and public selectors are not changed. Its own source hash is recorded in the receipt. It is not part of, and does not revise, the frozen provider execution graph.

```sh
node cli/eval/archive-dungeon-master-expansion.js \
  --run-directory /Users/erikhazzard/code/vasir/.agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908-v2 \
  --archive-directory /Users/erikhazzard/code/vasir/.agents/vasir-evals/dungeon-master-adventure-outline/checkpoints/dm-model-coverage-20260908-v2-codex-drained-01 \
  --authorization 'Root authorized exact checkpoint archival after the Codex-only queue drained.'
```
