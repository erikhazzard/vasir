import process from "node:process";

import { createCommandUi } from "../scripts/ui/command-output.js";
import { resolveEvalEnvironmentVariables } from "./keys-file.js";
import { generateEvalResponse } from "./providers.js";
import { resolveEvalModels } from "./provider-config.js";
import { summarizeEvalRows, scoreCaseOutput } from "./scoring.js";
import { resolveSkillSource } from "./skill-source.js";
import { resolveSuiteSource } from "./suite-source.js";
import { readPreviousRunSummary, writeEvalRunArtifacts } from "./history.js";

const EVAL_HARNESS_VERSION = 1;

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
  outputStream = process.stdout,
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
    environmentVariables: configuredEnvironmentVariables,
    projectKeysLoaded
  } = resolveEvalEnvironmentVariables({
    currentWorkingDirectory,
    environmentVariables
  });
  const {
    modelDescriptors,
    environmentVariables: resolvedEnvironmentVariables,
    skippedProviders
  } = await resolveEvalModels({
    requestedModelArguments,
    environmentVariables: configuredEnvironmentVariables,
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
    const ui = createCommandUi({ stream: outputStream });
    const renderedLines = [
      ui.formatField("skill", ui.colors.bold(skillName)),
      ui.formatField("hash", ui.colors.muted(skillSource.skillHash.slice(0, 12))),
      ui.formatField("suite", suiteSource.suiteDefinition.id),
      ui.formatField("cases", String(suiteSource.suiteDefinition.cases.length)),
      ui.formatField("models", String(modelDescriptors.length)),
      ui.formatField("hard score lift", ui.formatLift(summary.global.averageScoreLift)),
      ui.formatField("hard pass lift", ui.formatLift(summary.global.passRateLift)),
      ui.formatField("results", ui.formatPath(runDirectoryPath))
    ];

    if (projectKeysLoaded) {
      renderedLines.push(ui.formatField("keys", "loaded from keys.json"));
    }

    if (skippedProviders.length > 0) {
      renderedLines.push("");
      renderedLines.push(ui.colors.header("Skipped"));
      for (const skippedProvider of skippedProviders) {
        renderedLines.push(
          ui.formatBullet(`${skippedProvider.modelId} ${skippedProvider.reason}`)
        );
      }
    }

    if (summary.perModel.length > 0) {
      renderedLines.push("");
      renderedLines.push(ui.colors.header("Per-model"));
      for (const modelEntry of summary.perModel) {
        renderedLines.push(
          ui.formatBullet(
            `${modelEntry.modelId}  score ${ui.formatLift(modelEntry.averageScoreLift)}  pass ${ui.formatLift(modelEntry.passRateLift)}`
          )
        );
      }
    }

    if (previousComparison) {
      renderedLines.push("");
      renderedLines.push(ui.colors.header("History vs previous run"));
      renderedLines.push(ui.formatBullet(`previous run ${previousComparison.previousRunId}`));
      renderedLines.push(
        ui.formatBullet(
          `hard score lift delta ${ui.formatLift(previousComparison.averageScoreLiftDelta)}`
        )
      );
      renderedLines.push(
        ui.formatBullet(
          `hard pass lift delta ${ui.formatLift(previousComparison.passRateLiftDelta)}`
        )
      );
    } else {
      renderedLines.push("");
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "history",
          detail: "first recorded run for this skill"
        })
      );
    }

    stdoutWriter(
      ui.renderPanel({
        title: `Eval ${skillName}`,
        lines: renderedLines
      })
    );
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
