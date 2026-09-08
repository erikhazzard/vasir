import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { isBenchmarkAgentRuntimeReceiptCompatible } from "./agent-runtime.js";
import { upgradeBenchmarkRunBasis } from "./benchmark-basis.js";
import { resolveBenchmarkConfigurations } from "./benchmark-models.js";
import { DEFAULT_PANEL_JUDGE_CONCURRENCY, judgeBenchmarkRows, resolveBenchmarkJudgingConfiguration } from "./benchmark-judge.js";
import { createBenchmarkHash, createBenchmarkGenerationHash, createBenchmarkScoringHash, resolveBenchmarkSource } from "./benchmark-source.js";
import { buildRunDirectoryPath, writeEvalRunArtifacts } from "./history.js";
import { createBenchmarkPairs, createBenchmarkSummary, generateBenchmarkRows } from "./run-benchmark-eval.js";
import { freezeStorytellingSkill, isStorytellingRequiredSkillReadReceiptCompatible, normalizeStorytellingRequiredSkillFiles, runStorytellingAgent, STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION, STORYTELLING_RUNTIME_VERSION, validateStorytellingSkillSnapshot } from "./storytelling-agent-runtime.js";

export const STORYTELLING_RUNNER_VERSION = "storytelling-core-idea-v1";
export const STORYTELLING_DEFAULT_MODELS = Object.freeze([
  "codex:gpt-6-astra", "codex:gpt-5.6-sol", "codex:gpt-5.6-terra", "codex:gpt-5.6-luna",
  "claude:claude-fable-5-1", "claude:claude-opus-5"
]);

function digest(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function fail(message, code = "EVAL_STORYTELLING_INCOMPATIBLE") {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function safeId(value, label) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(value)) {
    fail(`Invalid storytelling ${label}.`);
  }
  return value;
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporaryPath, filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeError(error) {
  return {
    code: error?.code ?? "EVAL_STORYTELLING_FAILED",
    message: error?.message ?? String(error),
    context: error?.context ?? null,
    suggestion: error?.suggestion ?? null
  };
}

// This is an execution guard, not a retry policy or a new scoring contract.
// Match explicit exhaustion diagnostics, never a bare 429 or a rate limit.
export function identifyStorytellingJudgeQuotaExhaustion({ error, configuration }) {
  if (error?.code !== "EVAL_AGENT_RUNTIME_FAILED") return null;
  const context = error.context ?? {};
  if (context.requestedConfiguration && ["id", "provider", "model", "reasoning"].some((key) =>
    context.requestedConfiguration[key] !== configuration[key])) return null;
  // The runtime retains only the tail of Claude's terminal JSON. Its opening
  // fields can be truncated, so decode intact result strings without requiring
  // the whole tail to parse, and do not inspect candidate/prompt text fields.
  const stdout = String(context.stdout ?? "");
  const hasProviderError = Number(context.apiErrorStatus) === 429 || /"is_error"\s*:\s*true/u.test(stdout);
  const terminalResults = [...(hasProviderError ? stdout : "").matchAll(/"result"\s*:\s*("(?:\\.|[^"\\])*")/gu)]
    .flatMap((match) => {
      try { return [JSON.parse(match[1])]; } catch { return []; }
    });
  const diagnostic = [error.message, context.stderr,
    context.terminalResultIsError === true ? context.terminalResultText : null, ...terminalResults]
    .filter((value) => typeof value === "string").join("\n");
  const apiErrorStatus = context.apiErrorStatus ?? diagnostic.match(/\bAPI Error:\s*(\d{3})\b/iu)?.[1] ?? null;
  // In particular, output-policy 400 errors are terminal failures, not quota
  // exhaustion, even if other diagnostic text happens to mention credits.
  if (apiErrorStatus !== null && Number(apiErrorStatus) !== 429) return null;
  let reason = null;
  if (/\byou['’]re out of usage credits\b/iu.test(diagnostic)) reason = "usage-credits-exhausted";
  else if (configuration.provider === "claude" && configuration.model === "claude-fable-5-1" &&
    /\byou['’]ve reached your Fable(?: 5(?:\.1)?)? limit\b/iu.test(diagnostic)) reason = "model-usage-limit-reached";
  else if (configuration.provider === "claude" && /\byou['’]ve hit your session limit\b/iu.test(diagnostic)) {
    reason = "session-usage-limit-reached";
  }
  else if (configuration.provider === "codex" && /\byou['’]ve hit your usage limit\b/iu.test(diagnostic)) {
    reason = "usage-limit-reached";
  }
  return reason ? { reason, apiErrorStatus: apiErrorStatus === null ? null : Number(apiErrorStatus) } : null;
}

function rowKey(plan) {
  return [plan.configuration.id, plan.caseDefinition.id, `trial-${plan.trialNumber}`, plan.condition.id].join("::");
}

function skillConditionHash(snapshot, requiredSkillFiles) {
  return requiredSkillFiles.length ? digest({ skillHash: snapshot.hash, requiredSkillFiles,
    requiredSkillReadPolicyVersion: STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION }) : snapshot.hash;
}

function validateGenerationExecutionFilters(configurations, { generateProvider, generateModel }) {
  if (generateModel === null) return;
  if (typeof generateModel !== "string" || !configurations.some((configuration) => configuration.model === generateModel)) {
    fail("generateModel must exactly match a model in the frozen inventory; aliases are not resolved.", "EVAL_STORYTELLING_EXECUTION_FILTER");
  }
  if (generateProvider && !configurations.some((configuration) => configuration.provider === generateProvider && configuration.model === generateModel)) {
    fail("generateProvider and generateModel are intersected; their intersection contains no frozen configuration.", "EVAL_STORYTELLING_EXECUTION_FILTER");
  }
}

function createRowPlans(run) {
  return run.configurations.flatMap((configuration) => run.benchmark.definition.cases.flatMap((caseDefinition) =>
    Array.from({ length: run.generation.trialCount }, (_, index) => run.conditions.map((condition) => ({
      configuration, caseDefinition, trialNumber: index + 1, condition,
      // The full contestant message is identical across the two conditions.
      // The skill is installed as a separate provider instruction by the runtime.
      promptText: caseDefinition.task,
      exactMessages: [{ role: "user", content: caseDefinition.task }],
      basisHash: digest([
        run.benchmark.generationHash, configuration.id, caseDefinition.id,
        run.generation.trialCount, "", run.harnessVersion, condition.hash
      ].join(":"))
    }))).flat()
  ));
}

function pendingRow(plan) {
  return {
    rowKey: rowKey(plan), configurationId: plan.configuration.id,
    modelId: `${plan.configuration.provider}:${plan.configuration.model}`,
    provider: plan.configuration.provider, model: plan.configuration.model, reasoning: plan.configuration.reasoning,
    caseId: plan.caseDefinition.id, trialNumber: plan.trialNumber, conditionId: plan.condition.id,
    rowStatus: "pending", promptText: plan.promptText, exactMessages: plan.exactMessages,
    basisHash: plan.basisHash, outputText: null, usage: null, costUsd: null, durationMs: null,
    runtimeReceipt: null, score: null, scoreBasisHash: null, error: null, attempts: []
  };
}

function pendingJudging(run) {
  const plan = resolveBenchmarkJudgingConfiguration(run.benchmark.definition.judging);
  return {
    status: "pending", judgeConfiguration: plan.synthesizer ?? plan.panel[0],
    judgeConfigurations: plan.panel, synthesizerConfiguration: plan.synthesizer,
    freshContext: true, blinded: true, calibrationStatus: "author-calibration-pending",
    cohortHash: null, cohortSize: 0, candidateOrder: [], judges: [], synthesis: null,
    basisHash: null, promptHash: null, promptText: null, ranking: [], comparativeNote: "",
    runtimeReceipt: null, usage: null, costUsd: null, durationMs: null, error: null
  };
}

function executionIdentity(run) {
  return createBenchmarkHash({
    runnerVersion: run.storytelling.runnerVersion,
    runtimeVersion: run.storytelling.runtimeVersion,
    benchmarkHash: run.benchmark.hash,
    skillHash: run.treatment.hash,
    configurations: run.configurations,
    conditions: run.conditions,
    trialCount: run.generation.trialCount,
    generationOrderSeed: run.generation.orderSeed,
    judgingEligibilityPolicy: run.storytelling.judgingEligibilityPolicy,
    harnessVersion: run.harnessVersion
  });
}

function validateResume(run, snapshot) {
  const requiredSkillFiles = normalizeStorytellingRequiredSkillFiles(snapshot, run.treatment?.requiredSkillFiles ?? []);
  if (run.conditions?.find((condition) => condition.type === "skill")?.hash !== skillConditionHash(snapshot, requiredSkillFiles) ||
    (requiredSkillFiles.length && (
    JSON.stringify(requiredSkillFiles) !== JSON.stringify(run.treatment.requiredSkillFiles) ||
    run.treatment.requiredSkillReadPolicyVersion !== STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION)) ||
    (!requiredSkillFiles.length && (Object.hasOwn(run.treatment ?? {}, "requiredSkillFiles") ||
      Object.hasOwn(run.treatment ?? {}, "requiredSkillReadPolicyVersion")))) {
    fail("Storytelling required skill-file policy differs from the frozen condition identity.");
  }
  if (run.kind !== "benchmark" || run.storytelling?.runnerVersion !== STORYTELLING_RUNNER_VERSION ||
    run.storytelling?.runtimeVersion !== STORYTELLING_RUNTIME_VERSION || run.harnessVersion !== 3 ||
    executionIdentity(run) !== run.storytelling.manifestHash ||
    createBenchmarkHash(run.benchmark.definition) !== run.benchmark.hash ||
    createBenchmarkGenerationHash(run.benchmark.definition) !== run.benchmark.generationHash ||
    createBenchmarkScoringHash(run.benchmark.definition) !== run.benchmark.scoringHash ||
    snapshot.hash !== run.treatment.hash) {
    fail("Storytelling checkpoint differs from its frozen task, skill, model matrix, or runtime contract.");
  }
  if (!Number.isInteger(run.generation.trialCount) || run.generation.trialCount < 1) fail("Invalid frozen trial count.");
  const plans = createRowPlans(run);
  const rows = new Map(run.rows.map((row) => [row.rowKey, row]));
  if (rows.size !== plans.length || run.rows.length !== plans.length) fail("Storytelling checkpoint row inventory changed.");
  for (const plan of plans) {
    const row = rows.get(rowKey(plan));
    if (!row || row.basisHash !== plan.basisHash || row.promptText !== plan.promptText ||
      JSON.stringify(row.exactMessages) !== JSON.stringify(plan.exactMessages) ||
      row.configurationId !== plan.configuration.id || row.caseId !== plan.caseDefinition.id ||
      row.trialNumber !== plan.trialNumber || row.conditionId !== plan.condition.id) {
      fail(`Storytelling checkpoint row does not match its frozen plan: ${rowKey(plan)}`);
    }
    const protocolFailure = row.error?.code === "EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE";
    if ((row.rowStatus === "complete" || protocolFailure) && (
      !row.outputText?.trim() || row.outputHash !== digest(row.outputText) ||
      !isBenchmarkAgentRuntimeReceiptCompatible({ configuration: plan.configuration, runtimeReceipt: row.runtimeReceipt }) ||
      row.runtimeReceipt?.freshSession !== true ||
      row.runtimeReceipt?.runtimeVersion !== STORYTELLING_RUNTIME_VERSION ||
      ["id", "provider", "model", "reasoning"].some((key) =>
        row.runtimeReceipt?.requestedConfiguration?.[key] !== plan.configuration[key]) ||
      row.runtimeReceipt?.userPromptSha256 !== digest(plan.promptText) ||
      row.runtimeReceipt?.skillHash !== (plan.condition.type === "skill" ? snapshot.hash : null) ||
      (requiredSkillFiles.length && plan.condition.type === "skill" && !isStorytellingRequiredSkillReadReceiptCompatible({
        skillSnapshot: snapshot, requiredSkillFiles, receipt: row.runtimeReceipt?.requiredSkillReads,
        requireComplete: !protocolFailure
      })) ||
      (protocolFailure && (row.rowStatus !== "error" || row.runtimeReceipt?.requiredSkillReads?.status !== "incomplete"))
    )) {
      fail(`Storytelling completed response has changed or lacks a compatible receipt: ${row.rowKey}`);
    }
  }
  return plans;
}

function acquireRunLock(outputDirectory) {
  const lockPath = path.join(outputDirectory, "run.lock");
  if (fs.existsSync(lockPath)) {
    let lock;
    try { lock = readJson(lockPath); } catch { fail("Storytelling run lock is unreadable."); }
    if (!Number.isInteger(lock.pid) || lock.pid <= 0) fail("Storytelling run lock has an invalid process id.");
    let alive = true;
    try { process.kill(lock.pid, 0); } catch (error) {
      if (error.code === "ESRCH") alive = false;
      else throw error;
    }
    if (alive) fail(`Storytelling run is already active in process ${lock.pid}.`, "EVAL_STORYTELLING_LOCKED");
    fs.unlinkSync(lockPath);
  }
  fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: "wx" });
  return () => fs.unlinkSync(lockPath);
}

function summarize(run) {
  run.pairs = createBenchmarkPairs({ rows: run.rows, treatmentId: run.treatment.id });
  run.summary = createBenchmarkSummary({
    rows: run.rows, pairs: run.pairs, configurations: run.configurations,
    treatmentId: run.treatment.id, judging: run.judging
  });
  run.summary.rowCounts.pending = run.rows.filter((row) => ["pending", "running"].includes(row.rowStatus)).length;
  run.summary.dimensionScale = { min: 1, max: 10 };
  run.summary.normalization = "weighted-mean-rating-divided-by-10-times-100";
  run.summary.attemptCount = run.rows.reduce((total, row) => total + row.attempts.length, 0);
  run.summary.failedAttemptCount = run.rows.reduce((total, row) => total + row.attempts.filter((attempt) =>
    ["error", "unavailable", "interrupted"].includes(attempt.status)).length, 0);
  run.runStatus = run.summary.rowCounts.complete === run.summary.rowCounts.expected &&
    run.summary.rowCounts.scored === run.summary.rowCounts.expected && run.judging.status === "complete"
    ? "complete" : "incomplete";
  upgradeBenchmarkRunBasis(run);
}

async function concurrent(items, count, work) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(count, items.length) }, async () => {
    while (next < items.length) await work(items[next++]);
  }));
}

/** Produce the normal benchmark run artifact using exact, uncoached user tasks.
 * Every snapshot and planned row is durable before the first paid invocation.
 * Resume reads the frozen artifact, never the mutable current skill or corpus.
 */
export async function runStorytellingBenchmark({
  benchmarkName = "storytelling-core-idea",
  currentWorkingDirectory = process.cwd(), projectRootDirectory = currentWorkingDirectory,
  requestedModelArguments = [], requestedCaseIds = [], trialCount = 1, generationConcurrency = 4,
  requiredSkillFiles = [],
  judgeConcurrency = DEFAULT_PANEL_JUDGE_CONCURRENCY,
  generateProvider = null, generateModel = null, judgeProvider = null,
  runId = null, resumeRunId = null, prepareOnly = false, generationOnly = false, judgeOnly = false, retryFailed = false,
  maxGenerationRows = null, seed = null,
  environmentVariables = process.env,
  agentRunnerImplementation = runStorytellingAgent,
  judgeRowsImplementation = judgeBenchmarkRows,
  onCheckpoint = null,
  nowImplementation = () => new Date()
} = {}) {
  safeId(benchmarkName, "benchmark name");
  if (judgeOnly && generationOnly) fail("judgeOnly and generationOnly cannot both be selected.");
  if (generateProvider !== null && !["codex", "claude"].includes(generateProvider)) {
    fail("generateProvider must be codex or claude; it filters execution without changing the frozen inventory.");
  }
  if (judgeProvider !== null && !["codex", "claude"].includes(judgeProvider)) {
    fail("judgeProvider must be codex or claude; the frozen two-provider panel remains unchanged.");
  }
  if (!Number.isInteger(generationConcurrency) || generationConcurrency < 1 || generationConcurrency > 16) {
    fail("Generation concurrency must be an integer from 1 through 16.");
  }
  if (!Number.isInteger(judgeConcurrency) || judgeConcurrency < 1 || judgeConcurrency > 16) {
    fail("Judge concurrency must be an integer from 1 through 16.", "EVAL_BENCHMARK_JUDGE_CONCURRENCY");
  }
  if (maxGenerationRows !== null && (!Number.isInteger(maxGenerationRows) || maxGenerationRows < 1)) {
    fail("maxGenerationRows must be a positive integer.");
  }
  let run;
  let snapshot;
  let outputDirectory;
  let releaseLock;
  if (resumeRunId) {
    safeId(resumeRunId, "resume run id");
    if (runId || requestedModelArguments.length || requestedCaseIds.length || requiredSkillFiles.length || seed !== null) {
      fail("Resume uses the frozen run's model matrix, cases, required skill files, seed, and run id.");
    }
    outputDirectory = buildRunDirectoryPath({ currentWorkingDirectory, projectRootDirectory, skillName: benchmarkName, runId: resumeRunId });
    // Take ownership before reading: the previous process may publish its final
    // checkpoint immediately before releasing the lock.
    releaseLock = acquireRunLock(outputDirectory);
    try {
      run = readJson(path.join(outputDirectory, "run.json"));
      const manifest = readJson(path.join(outputDirectory, "manifest.json"));
      if (run.runId !== resumeRunId || run.benchmarkName !== benchmarkName ||
        manifest.runId !== resumeRunId || manifest.manifestHash !== run.storytelling?.manifestHash) {
        fail("Storytelling checkpoint identity does not match its immutable manifest and run directory.");
      }
      snapshot = validateStorytellingSkillSnapshot(readJson(path.join(outputDirectory, "skill-snapshot.json")));
      validateResume(run, snapshot);
      validateGenerationExecutionFilters(run.configurations, { generateProvider, generateModel });
    } catch (error) {
      releaseLock();
      throw error;
    }
  } else {
    if (!Number.isInteger(trialCount) || trialCount < 1) fail("Trial count must be a positive integer.");
    const source = resolveBenchmarkSource({ benchmarkName, currentWorkingDirectory, projectRootDirectory });
    if (source.benchmarkDefinition.schemaVersion !== 2) fail("Storytelling requires the native 1–10 schemaVersion 2 rubric.");
    const definition = structuredClone(source.benchmarkDefinition);
    if (requestedCaseIds.length) {
      for (const id of requestedCaseIds) {
        if (!definition.cases.some((entry) => entry.id === id)) fail(`Unknown storytelling case: ${id}`);
      }
      definition.cases = definition.cases.filter((entry) => requestedCaseIds.includes(entry.id));
    }
    snapshot = freezeStorytellingSkill({ skillDirectoryPath: path.join(projectRootDirectory, ".agents", "skills", "writing-storytelling") });
    requiredSkillFiles = normalizeStorytellingRequiredSkillFiles(snapshot, requiredSkillFiles);
    const configurations = resolveBenchmarkConfigurations({
      requestedModelArguments: requestedModelArguments.length ? requestedModelArguments : STORYTELLING_DEFAULT_MODELS
    }).filter((configuration) => configuration.reasoning !== "ultracode");
    if (!configurations.length) fail("No ordinary reasoning configurations were selected.");
    if (requiredSkillFiles.length && configurations.some((configuration) => configuration.provider !== "codex")) {
      fail("Required skill-file read verification currently supports Codex contestant configurations only.");
    }
    if (requestedModelArguments.some((value) => value.endsWith("@ultracode"))) fail("Ultracode is a workflow mode and is excluded from this reasoning benchmark.");
    validateGenerationExecutionFilters(configurations, { generateProvider, generateModel });
    const startedAt = nowImplementation().toISOString();
    const benchmarkHash = createBenchmarkHash(definition);
    const generatedRunId = `${startedAt.replaceAll(":", "-")}__${crypto.randomUUID().slice(0, 8)}`;
    const selectedRunId = safeId(runId ?? generatedRunId, "run id");
    outputDirectory = buildRunDirectoryPath({ currentWorkingDirectory, projectRootDirectory, skillName: benchmarkName, runId: selectedRunId });
    if (fs.existsSync(outputDirectory)) fail(`Storytelling run already exists: ${selectedRunId}`);
    const treatment = {
      id: "skill:writing-storytelling", label: "Writing storytelling skill", type: "skill", skillName: "writing-storytelling",
      hash: snapshot.hash, sourceType: "frozen-local-corpus", injection: "root-instruction-progressive-file-access",
      snapshotFile: "skill-snapshot.json", rootFile: "SKILL.md",
      ...(requiredSkillFiles.length ? { requiredSkillFiles,
        requiredSkillReadPolicyVersion: STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION } : {}),
      promptFiles: snapshot.files.map(({ relativePath, sha256, bytes }) => ({ relativeFilePath: relativePath, sha256, bytes }))
    };
    run = {
      kind: "benchmark", schemaVersion: 1, runId: selectedRunId, benchmarkName, skillName: benchmarkName,
      benchmark: {
        id: definition.id, title: definition.title, description: definition.description,
        hash: benchmarkHash, generationHash: createBenchmarkGenerationHash(definition),
        scoringHash: createBenchmarkScoringHash(definition), sourceType: source.sourceType, definition
      },
      treatment,
      conditions: [
        { id: "clean", label: "Plain", type: "clean", hash: digest(`${STORYTELLING_RUNTIME_VERSION}:no-skill`) },
        { id: treatment.id, label: treatment.label, type: "skill", hash: skillConditionHash(snapshot, requiredSkillFiles) }
      ],
      configurations,
      generation: {
        trialCount, concurrency: generationConcurrency, freshAgentSessions: true,
        neutralHarnessInstruction: "", promptModeOverrides: {},
        promptMode: "exact-user-question-with-provider-skill-instruction",
        orderSeed: seed ?? digest(`${benchmarkHash}:${snapshot.hash}`),
        orderPolicy: "sha256-seed-and-row-key-v1"
      },
      storytelling: {
        runnerVersion: STORYTELLING_RUNNER_VERSION, runtimeVersion: STORYTELLING_RUNTIME_VERSION,
        judgingEligibilityPolicy: "complete-matched-pairs-v1"
      },
      harnessVersion: 3, scorerVersion: definition.scoring.version,
      startedAt, completedAt: null, lastCheckpointAt: startedAt,
      runStatus: "incomplete", rows: [], pairs: [], summary: {}, attempts: []
    };
    run.storytelling.manifestHash = executionIdentity(run);
    run.rows = createRowPlans(run).map(pendingRow);
    run.judging = pendingJudging(run);
    fs.mkdirSync(outputDirectory, { recursive: true });
    writeJsonAtomic(path.join(outputDirectory, "skill-snapshot.json"), snapshot);
    writeJsonAtomic(path.join(outputDirectory, "manifest.json"), {
      runId: run.runId, manifestHash: run.storytelling.manifestHash,
      benchmarkHash, skillHash: snapshot.hash, configurations,
      caseIds: definition.cases.map((entry) => entry.id), trialCount,
      expectedRows: run.rows.length, frozenAt: startedAt,
      runnerVersion: STORYTELLING_RUNNER_VERSION, runtimeVersion: STORYTELLING_RUNTIME_VERSION
    });
  }
  releaseLock ??= acquireRunLock(outputDirectory);
  function save(event) {
    summarize(run);
    run.lastCheckpointAt = nowImplementation().toISOString();
    writeEvalRunArtifacts({ currentWorkingDirectory, projectRootDirectory, skillName: benchmarkName, runId: run.runId, runPayload: run });
    onCheckpoint?.({ event, runId: run.runId, outputDirectory, run });
  }
  try {
    // Operational launch metadata is not part of the frozen experiment identity.
    // Do not backfill older invocations from the prepare-time concurrency field.
    const execution = {
      invocationId: crypto.randomUUID(), startedAt: nowImplementation().toISOString(),
      mode: prepareOnly ? "prepare" : generationOnly ? "generation-only" : judgeOnly ? "judge-only" : "generate-and-judge",
      generationConcurrencyLimit: generationConcurrency,
      generationProviderFilter: generateProvider, generationModelFilter: generateModel,
      judgeProviderFilter: judgeProvider, judgeConcurrencyLimit: judgeConcurrency, retryFailed, maxGenerationRows,
      selectedGenerationRowCount: 0
    };
    if (run.executionHistory !== undefined && !Array.isArray(run.executionHistory)) fail("Storytelling execution history is malformed.");
    run.executionHistory ??= [];
    run.executionHistory.push(execution);
    const plans = createRowPlans(run);
    const rowsByKey = new Map(run.rows.map((row) => [row.rowKey, row]));
    for (const row of run.rows) {
      if (row.rowStatus === "running") {
        row.rowStatus = "pending";
        const last = row.attempts.at(-1);
        if (last?.status === "running") {
          last.status = "interrupted";
          last.completedAt = nowImplementation().toISOString();
        }
      }
    }
    save("prepared");
    if (prepareOnly) return { runId: run.runId, runStatus: run.runStatus, outputDirectory, summary: run.summary };
    if (!generationOnly && String(run.benchmark.definition.status ?? "").includes("draft")) {
      fail("Scored execution requires a source-verified corpus. Use generationOnly for an explicitly separate plumbing smoke.");
    }
    const unfinished = plans.filter((plan) => {
      const row = rowsByKey.get(rowKey(plan));
      return (!generateProvider || plan.configuration.provider === generateProvider) &&
        (!generateModel || plan.configuration.model === generateModel) &&
        row.error?.code !== "EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE" &&
        (["pending", "running"].includes(row.rowStatus) ||
          (retryFailed && ["error", "unavailable"].includes(row.rowStatus)));
    }).sort((a, b) => digest(`${run.generation.orderSeed}:${rowKey(a)}`).localeCompare(digest(`${run.generation.orderSeed}:${rowKey(b)}`)));
    const selected = judgeOnly ? [] : maxGenerationRows === null ? unfinished : unfinished.slice(0, maxGenerationRows);
    execution.selectedGenerationRowCount = selected.length;
    await concurrent(selected, generationConcurrency, async (plan) => {
      const existing = rowsByKey.get(rowKey(plan));
      const attempt = { number: existing.attempts.length + 1, status: "running", startedAt: nowImplementation().toISOString(), completedAt: null };
      existing.attempts.push(attempt);
      existing.rowStatus = "running";
      save("generation-started");
      await generateBenchmarkRows({
        rowPlans: [plan], concurrency: 1, environmentVariables,
        agentRunnerImplementation: (args) => agentRunnerImplementation({
          ...args, skillSnapshot: plan.condition.type === "skill" ? snapshot : null,
          ...(plan.condition.type === "skill" && run.treatment.requiredSkillFiles?.length
            ? { requiredSkillFiles: run.treatment.requiredSkillFiles } : {})
        }),
        onRowComplete: (row) => {
          if (row.error?.code === "AUTH_UNAVAILABLE") row.rowStatus = "unavailable";
          if (row.rowStatus === "complete" && plan.condition.type === "skill" && run.treatment.requiredSkillFiles?.length &&
            !isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot,
              requiredSkillFiles: run.treatment.requiredSkillFiles, receipt: row.runtimeReceipt?.requiredSkillReads })) {
            // Keep the final answer, usage, and original receipt. This is a
            // measured protocol failure, never a reason to reroll a story.
            row.rowStatus = "error";
            row.error = { code: "EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE",
              message: "The contestant returned an answer without verified complete reads of every required skill file.",
              suggestion: "Retain this attempt as a protocol failure; it is excluded from scoring and automatic retries.",
              context: { requiredSkillFiles: run.treatment.requiredSkillFiles,
                policyVersion: STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION,
                observedStatus: row.runtimeReceipt?.requiredSkillReads?.status ?? "missing", outputRetained: true } };
          }
          attempt.status = row.rowStatus;
          attempt.completedAt = nowImplementation().toISOString();
          attempt.error = row.error;
          attempt.durationMs = row.durationMs ?? Math.max(0, Date.parse(attempt.completedAt) - Date.parse(attempt.startedAt));
          attempt.usage = row.usage;
          attempt.costUsd = row.costUsd;
          const replacement = {
            ...row, durationMs: attempt.durationMs, attempts: existing.attempts,
            outputHash: typeof row.outputText === "string" ? digest(row.outputText) : null
          };
          rowsByKey.set(row.rowKey, replacement);
          run.rows[run.rows.findIndex((entry) => entry.rowKey === row.rowKey)] = replacement;
          save("generation-complete");
        }
      });
    });
    if (generationOnly) {
      save("generation-only");
      return { runId: run.runId, runStatus: run.runStatus, outputDirectory, summary: run.summary };
    }
    // Only complete matched pairs enter judging. All planned rows stay in the
    // artifact and in its denominator, so unavailable models cannot masquerade
    // as a complete run or prevent intact pairs from receiving honest scores.
    const pairs = createBenchmarkPairs({ rows: run.rows, treatmentId: run.treatment.id });
    const eligibleRowKeys = new Set(pairs.flatMap((pair) => {
      const clean = rowsByKey.get(pair.cleanRowKey);
      const treatment = rowsByKey.get(pair.treatmentRowKey);
      return clean?.rowStatus === "complete" && treatment?.rowStatus === "complete"
        ? [pair.cleanRowKey, pair.treatmentRowKey] : [];
    }));
    const eligibleRows = run.rows.filter((row) => eligibleRowKeys.has(row.rowKey));
    const eligibility = {
      policy: "complete-matched-pairs-v1", plannedRowCount: run.rows.length,
      eligibleRowCount: eligibleRows.length, eligiblePairCount: eligibleRows.length / 2,
      completePlannedCohort: eligibleRows.length === run.rows.length,
      excluded: run.rows.filter((row) => !eligibleRowKeys.has(row.rowKey)).map((row) => ({
        rowKey: row.rowKey, rowStatus: row.rowStatus,
        reason: row.rowStatus === "complete" ? "matched-condition-incomplete" : "generation-incomplete"
      }))
    };
    const priorJudging = structuredClone(run.judging);
    // Start closed on every invocation. Saved compatible batches never enter
    // this wrapper; a previous quota failure must not disable a fresh resume.
    const exhaustedJudgeModels = new Map();
    const quotaCircuitBreaker = {
      policy: "explicit-quota-exhaustion-per-provider-model-v1",
      reset: "each-invocation", invocationId: execution.invocationId, causes: []
    };
    execution.judgeQuotaCircuitBreaker = quotaCircuitBreaker;
    const judgeExecution = {
      provider: judgeProvider,
      policy: "defer-unselected-providers-without-invocation",
      quotaCircuitBreaker,
      deferredProviders: [...new Set(resolveBenchmarkJudgingConfiguration(run.benchmark.definition.judging).panel
        .filter((configuration) => judgeProvider && configuration.provider !== judgeProvider)
        .map((configuration) => configuration.provider))]
    };
    try {
      const judged = await judgeRowsImplementation({
        benchmarkDefinition: run.benchmark.definition, rows: eligibleRows, runSeed: run.runId,
        priorJudging, judgeConcurrency, environmentVariables,
        agentRunnerImplementation: async (args) => {
          if (judgeProvider && args.configuration.provider !== judgeProvider) {
            const error = new Error(`${args.configuration.id}: execution is deferred by --judge-provider ${judgeProvider}; no provider call was attempted.`);
            error.code = "EVAL_BENCHMARK_JUDGE_DEFERRED";
            error.context = { executionAttempted: false, requestedProvider: judgeProvider, deferredProvider: args.configuration.provider };
            throw error;
          }
          const modelKey = JSON.stringify([args.configuration.provider, args.configuration.model]);
          const cause = exhaustedJudgeModels.get(modelKey);
          if (cause) {
            const error = new Error(`${args.configuration.id}: judging is deferred after explicit quota exhaustion for this provider/model in this invocation; no provider call was attempted.`);
            error.code = "EVAL_BENCHMARK_JUDGE_DEFERRED";
            error.context = {
              executionAttempted: false, deferredReason: "provider-model-quota-circuit-open",
              provider: args.configuration.provider, model: args.configuration.model,
              promptSha256: digest(args.promptText), quotaCause: cause
            };
            throw error;
          }
          try {
            return await agentRunnerImplementation(args);
          } catch (error) {
            const exhaustion = identifyStorytellingJudgeQuotaExhaustion({ error, configuration: args.configuration });
            if (exhaustion && !exhaustedJudgeModels.has(modelKey)) {
              // Bind the safe explanation to the exact failed request and saved
              // normalized error. Do not copy diagnostics, account paths, or
              // session identifiers into subsequent deferrals or launch history.
              const firstFailure = {
                ...exhaustion, runId: run.runId, invocationId: execution.invocationId,
                manifestHash: run.storytelling.manifestHash,
                configurationId: args.configuration.id,
                provider: args.configuration.provider, model: args.configuration.model,
                promptSha256: digest(args.promptText), outputSchemaSha256: digest(args.outputSchema),
                errorCode: error.code,
                errorSha256: digest({
                  code: error.code, message: error.message,
                  suggestion: error.suggestion ?? null,
                  context: error.context && typeof error.context === "object" ? error.context : null
                }),
                streamSha256: /^[a-f0-9]{64}$/u.test(error.context?.streamSha256 ?? "") ? error.context.streamSha256 : null
              };
              exhaustedJudgeModels.set(modelKey, firstFailure);
              quotaCircuitBreaker.causes.push(firstFailure);
            }
            // In-flight requests settle normally, including additional actual
            // failures. Only not-yet-invoked requests use the deferred path.
            throw error;
          }
        },
        judgingCheckpointImplementation: (checkpoint) => {
          run.judging = { ...checkpoint.judging, eligibility, execution: judgeExecution };
          save("judge-checkpoint");
        }
      });
      run.judging = { ...judged.judging, eligibility, execution: judgeExecution };
      for (const row of run.rows) row.score = judged.scoresByRowKey.get(row.rowKey) ?? null;
    } catch (error) {
      run.judging = { ...run.judging, status: "error", error: normalizeError(error) };
    }
    run.completedAt = nowImplementation().toISOString();
    save("finished");
    return { runId: run.runId, runStatus: run.runStatus, outputDirectory, summary: run.summary };
  } finally {
    releaseLock();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: {
    benchmark: { type: "string" }, "project-root": { type: "string" },
    model: { type: "string", multiple: true }, case: { type: "string", multiple: true },
    "required-skill-file": { type: "string", multiple: true },
    trials: { type: "string" }, concurrency: { type: "string" }, "judge-concurrency": { type: "string" }, "run-id": { type: "string" },
    resume: { type: "string" }, prepare: { type: "boolean" }, "generation-only": { type: "boolean" },
    "retry-failed": { type: "boolean" }, "judge-only": { type: "boolean" },
    "generate-provider": { type: "string" }, "generate-model": { type: "string" }, "judge-provider": { type: "string" }, "max-rows": { type: "string" }, seed: { type: "string" }
  } });
  runStorytellingBenchmark({
    benchmarkName: values.benchmark, projectRootDirectory: values["project-root"] ?? process.cwd(),
    requestedModelArguments: values.model ?? [], requestedCaseIds: values.case ?? [],
    requiredSkillFiles: values["required-skill-file"] ?? [],
    trialCount: values.trials === undefined ? 1 : Number(values.trials),
    generationConcurrency: values.concurrency === undefined ? 4 : Number(values.concurrency),
    judgeConcurrency: values["judge-concurrency"] === undefined ? undefined : Number(values["judge-concurrency"]),
    runId: values["run-id"], resumeRunId: values.resume, prepareOnly: values.prepare,
    generationOnly: values["generation-only"], retryFailed: values["retry-failed"],
    judgeOnly: values["judge-only"],
    generateProvider: values["generate-provider"],
    generateModel: values["generate-model"],
    judgeProvider: values["judge-provider"],
    maxGenerationRows: values["max-rows"] === undefined ? null : Number(values["max-rows"]), seed: values.seed,
    onCheckpoint: ({ event, runId: id, run }) => {
      process.stdout.write(`${JSON.stringify({ event, runId: id, rows: run.summary.rowCounts, judging: run.judging.status })}\n`);
    }
  }).then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }).catch((error) => {
    process.stderr.write(`${JSON.stringify(normalizeError(error))}\n`);
    process.exitCode = 1;
  });
}
