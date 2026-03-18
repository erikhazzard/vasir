import process from "node:process";

import { generateEvalResponse } from "./providers.js";
import { resolveEvalModels } from "./provider-config.js";
import { summarizeEvalRows, scoreCaseOutput } from "./scoring.js";
import { resolveSkillSource } from "./skill-source.js";
import { resolveSuiteSource } from "./suite-source.js";
import { readPreviousRunSummary, writeEvalRunArtifacts } from "./history.js";

const EVAL_HARNESS_VERSION = 1;

function formatLift(value) {
  const percentagePoints = (value * 100).toFixed(1);
  return `${value >= 0 ? "+" : ""}${percentagePoints}`;
}

function createRunId({ skillHash }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${timestamp}__${skillHash.slice(0, 12)}`;
}

function createPrompt({
  caseDefinition,
  skillName,
  skillPromptText,
  includeSkill
}) {
  const systemPrompt = [
    "You are participating in an offline evaluation.",
    "Answer the task directly.",
    "Do not explain that you were given evaluation instructions.",
    "Do not mention the skill file or the eval harness."
  ].join(" ");

  const userPromptSections = [];
  if (includeSkill) {
    userPromptSections.push(
      `Use the following skill guidance when it is relevant to the task.\n\n--- Skill Guidance Start ---\n${skillPromptText}\n--- Skill Guidance End ---`
    );
  }

  userPromptSections.push(`Task:\n${caseDefinition.task}`);
  if (caseDefinition.outputHint) {
    userPromptSections.push(`Output hint:\n${caseDefinition.outputHint}`);
  }
  userPromptSections.push(
    `Return only your answer to the task. Do not include commentary about the evaluation or about ${skillName}.`
  );

  return {
    systemPrompt,
    userPrompt: userPromptSections.join("\n\n")
  };
}

function createPreviousComparison(currentSummary, previousSummary) {
  if (!previousSummary) {
    return null;
  }

  return {
    previousRunId: previousSummary.runId,
    averageScoreLiftDelta:
      currentSummary.summary.global.averageScoreLift - previousSummary.summary.global.averageScoreLift,
    passRateLiftDelta:
      currentSummary.summary.global.passRateLift - previousSummary.summary.global.passRateLift
  };
}

export async function runSkillEval({
  skillName,
  currentWorkingDirectory = process.cwd(),
  homeDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  requestedModelArguments = [],
  promptForMissingCredential = null,
  environmentVariables = process.env,
  fetchImplementation = globalThis.fetch,
  stdoutWriter,
  jsonOutput
}) {
  const skillSource = resolveSkillSource({
    skillName,
    currentWorkingDirectory,
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const suiteSource = resolveSuiteSource({
    skillName,
    currentWorkingDirectory,
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation,
    globalCatalogDirectory: skillSource.globalCatalogDirectory
  });
  const {
    modelDescriptors,
    environmentVariables: resolvedEnvironmentVariables,
    skippedProviders
  } = await resolveEvalModels({
    requestedModelArguments,
    environmentVariables,
    promptForMissingCredential
  });
  const previousSummary = readPreviousRunSummary({
    currentWorkingDirectory,
    skillName
  });
  const runId = createRunId({ skillHash: skillSource.skillHash });
  const startedAt = new Date().toISOString();
  const rows = [];

  for (const modelDescriptor of modelDescriptors) {
    for (const caseDefinition of suiteSource.suiteDefinition.cases) {
      for (const condition of [
        { conditionId: "baseline:none", includeSkill: false },
        { conditionId: `treatment:${skillSource.skillHash.slice(0, 12)}`, includeSkill: true }
      ]) {
        const prompt = createPrompt({
          caseDefinition,
          skillName,
          skillPromptText: skillSource.promptText,
          includeSkill: condition.includeSkill
        });
        const startedRowAtMs = Date.now();
        const responsePayload = await generateEvalResponse({
          modelDescriptor,
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          environmentVariables: resolvedEnvironmentVariables,
          fetchImplementation
        });
        const hardScore = scoreCaseOutput({
          caseDefinition,
          outputText: responsePayload.text
        });

        rows.push({
          runId,
          suiteId: suiteSource.suiteDefinition.id,
          caseId: caseDefinition.id,
          modelId: modelDescriptor.id,
          conditionId: condition.conditionId,
          skillHash: skillSource.skillHash,
          hardScore,
          outputText: responsePayload.text,
          usage: responsePayload.usage,
          elapsedMs: Date.now() - startedRowAtMs,
          prompt
        });
      }
    }
  }

  const summary = summarizeEvalRows(rows);
  const summaryPayload = {
    schemaVersion: 1,
    runId,
    startedAt,
    completedAt: new Date().toISOString(),
    harnessVersion: EVAL_HARNESS_VERSION,
    skillName,
    skillHash: skillSource.skillHash,
    skillSourceType: skillSource.sourceType,
    suiteId: suiteSource.suiteDefinition.id,
    suiteSourceType: suiteSource.sourceType,
    modelIds: modelDescriptors.map((modelDescriptor) => modelDescriptor.id),
    skippedProviders,
    caseCount: suiteSource.suiteDefinition.cases.length,
    summary
  };
  const runDirectoryPath = writeEvalRunArtifacts({
    currentWorkingDirectory,
    skillName,
    runId,
    summaryPayload,
    rowsPayload: rows
  });
  const previousComparison = createPreviousComparison(summaryPayload, previousSummary);

  if (!jsonOutput) {
    stdoutWriter(`${skillName}  ${skillSource.skillHash.slice(0, 12)}\n`);
    stdoutWriter(
      `suite: ${suiteSource.suiteDefinition.id}  cases: ${suiteSource.suiteDefinition.cases.length}  models: ${modelDescriptors.length}\n\n`
    );
    stdoutWriter(`hard score lift: ${formatLift(summary.global.averageScoreLift)} pts\n`);
    stdoutWriter(`hard pass lift:  ${formatLift(summary.global.passRateLift)} pts\n`);
    stdoutWriter(`results:         ${runDirectoryPath}\n`);

    if (skippedProviders.length > 0) {
      stdoutWriter(`skipped:\n`);
      for (const skippedProvider of skippedProviders) {
        stdoutWriter(`- ${skippedProvider.modelId}  ${skippedProvider.reason}\n`);
      }
    }

    if (summary.perModel.length > 0) {
      stdoutWriter(`\nper-model:\n`);
      for (const modelEntry of summary.perModel) {
        stdoutWriter(
          `- ${modelEntry.modelId}  score ${formatLift(modelEntry.averageScoreLift)} pts  pass ${formatLift(modelEntry.passRateLift)} pts\n`
        );
      }
    }

    if (previousComparison) {
      stdoutWriter(`\nhistory vs previous run:\n`);
      stdoutWriter(
        `- previous run: ${previousComparison.previousRunId}\n- hard score lift delta: ${formatLift(previousComparison.averageScoreLiftDelta)} pts\n- hard pass lift delta:  ${formatLift(previousComparison.passRateLiftDelta)} pts\n`
      );
    } else {
      stdoutWriter(`\nhistory: first recorded run for this skill\n`);
    }
  }

  return {
    subcommand: "run",
    runId,
    skillName,
    skillHash: skillSource.skillHash,
    skillSourceType: skillSource.sourceType,
    suiteId: suiteSource.suiteDefinition.id,
    modelIds: modelDescriptors.map((modelDescriptor) => modelDescriptor.id),
    skippedProviders,
    outputDirectory: runDirectoryPath,
    summary,
    previousComparison
  };
}
