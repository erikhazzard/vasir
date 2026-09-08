# Execution runbook

Use this runbook with [methodology.md](./methodology.md), the creation entry point [run-storytelling-creation.js](../../cli/eval/run-storytelling-creation.js), and its dedicated judging driver. The entry point uses [storytelling-creation-runtime.js](../../cli/eval/storytelling-creation-runtime.js), with `creationIsolation=storytelling-creation-host-isolation-v1` and shared `runtimeVersion=progressive-frozen-skill-v2`. This document describes required execution behavior; a normal two-judge benchmark invocation alone does not implement the four-seat context design.

## Prepare and freeze

1. Load `benchmark.json` with `resolveBenchmarkSource`. Confirm schema version 2, case `magic-discovery`, ten dimensions of weight 10, anchors at 1/5/10, no gates, and the exact prompt. Run the local definition and driver checks before provider calls.
2. Read the configuration selectors directly from `coverage.configurationSelectors`. Validate all 33 exact selectors; do not use the evolving default model inventory. Preserve the listed order for anonymous pair presentation. Confirm three trials and exactly two creator conditions.
3. Inspect provider readiness and quota using read-only checks. Record unsupported or unavailable execution without deleting configurations. Do not make a model call merely to test availability when a non-mutating check suffices.
4. Prepare a new isolated run. Freeze the benchmark definition, these protocol files, complete storytelling skill, runtime policy, explicit inventory, and both judge-context definitions before scored generation. Record original paths, full frozen bytes, per-file SHA-256 hashes, benchmark/generation/scoring hashes, timestamp, and driver versions. The working skill may change elsewhere; the run must continue using its snapshot.
5. Confirm informed context contains the exact frozen root and eight references listed in `judging.contextProfiles`. Hash the complete inline pack in its fixed order. Confirm neither missing files nor truncation are silently accepted.
6. Record the four seat IDs exactly: `astra-xhigh-naive`, `astra-xhigh-informed`, `sol-xhigh-naive`, and `sol-xhigh-informed`. Confirm canonical selectors are Astra xhigh and Sol xhigh, and no synthesizer is enabled.

For a local schema check without provider calls:

```sh
node --input-type=module -e 'import { resolveBenchmarkSource } from "./cli/eval/benchmark-source.js"; const s = resolveBenchmarkSource({ benchmarkName: "storytelling-magic-discovery", currentWorkingDirectory: process.cwd() }); console.log(JSON.stringify({ benchmarkHash: s.benchmarkHash, generationHash: s.benchmarkGenerationHash, scoringHash: s.benchmarkScoringHash, configurations: s.benchmarkDefinition.coverage.configurationSelectors.length }, null, 2));'
```

## Generate and judge

1. Use the creation runtime and generation-only base execution for the 198 planned creator jobs. Both arms must use fresh contexts and the matched runtime policy. Supply the frozen storytelling root and progressively available files only in the skill arm; require no particular reference read. Retain the exact accepted output and attempt history for every job.
2. Confirm creator isolation evidence: Codex host skill discovery and skill search disabled, project instructions suppressed, fresh directory, ignored host configuration/rules and disabled web; Claude fresh safe-mode/Read settings with slash commands unavailable. Record any deviation before using the affected output.
3. Form the 99 pairs by exact configuration and trial. Do not replace a failed output with a different trial or another configuration. Preserve nulls and failed job records.
4. Run the dedicated creation judging sidecar for four requests per complete pair. Use the frozen deterministic order rule in `judging.profileProtocol.orderRule`. The same canonical model must see the same answer order across naive and informed contexts.
5. Give each judge only the common task, rubric, review contract, and anonymous pair, plus the inline frozen pack for informed seats. Use fresh sessions and no file/web/skill/tool access. Verify common Codex overrides `skip_host_skill_discovery=true`, `skill_search=false`, and `project_doc_max_bytes=0`, and judge-specific overrides `shell_tool=false`, `apps=false`, `multi_agent=false`, and `developer_instructions=""`. No creator trace, previous review, condition label, or producer identity enters the request.
6. Validate every review against all ten dimension IDs and the integer 1–10 range. Keep raw reviews and failures. Resume only unresolved operational failures; policy filters, usable refusals, and poor-quality answers are not retry opportunities.

## Reconcile and report

1. Reconcile planned versus actual counts: 33 configurations, one case, three trials, two creator conditions, 198 generation slots, 99 pair slots, four judge profiles, 396 judge pair slots, and 792 answer-assessment slots. Distinguish slots from retry attempts and report unavailable-provider rows explicitly.
2. Require both canonical seats for a profile mean and all four seats for the balanced mean. Leave missing/failed scores null; do not impute values or reduce the averaging denominator. Require all three complete trials for a complete configuration rank.
3. Verify arithmetic from raw dimensions through per-seat, per-profile, and balanced panel scores. Show all three trial scores and paired differences, mean, sample standard deviation, and range. Include the informed-minus-naive contrast of paired differences and retain each canonical model's scores.
4. Label every partial result and its missing coverage. Do not mark the full run complete because only one provider is reachable, or because a two-judge base result exists. Do not publish inferential confidence claims or general writing rankings from these three repeats on one prompt.
5. Preserve candidate and judge artifacts, all protocol hashes, exact runtime/exposure evidence, attempt records, status classification, and configuration identity. Check the public projection reproduces this evidence and keeps failures visible before the requested publication workflow.

If quota blocks progress, retain the complete plan and resumable run state. Record the actual blocker and available read-only evidence. A reset time or successful resume is an external-state fact to verify, not an assumption that grants completion.
