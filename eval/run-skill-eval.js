import process from "node:process";

import { createCommandUi } from "../scripts/ui/command-output.js";
import { resolveEvalEnvironmentVariables } from "./keys-file.js";
import { generateEvalResponse } from "./providers.js";
import { resolveEvalModels } from "./provider-config.js";
import { summarizeEvalRows, scoreCaseOutput } from "./scoring.js";
import { resolveSkillSource } from "./skill-source.js";
import { resolveSuiteSource } from "./suite-source.js";
import {
  readPreviousRunSummary,
  readPreviousVersionSummary,
  writeEvalRunArtifacts
} from "./history.js";

const EVAL_HARNESS_VERSION = 1;
const COMPARISON_EPSILON = 1e-9;
const EVAL_CONDITIONS = Object.freeze([
  { conditionId: "baseline:none", includeSkill: false },
  { conditionId: "treatment", includeSkill: true }
]);

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

function normalizeModelIds(modelIds) {
  return [...(Array.isArray(modelIds) ? modelIds : [])].sort().join(",");
}

function areSummariesComparable(currentSummary, previousSummary) {
  if (!previousSummary) {
    return false;
  }

  return (
    currentSummary.suiteId === previousSummary.suiteId &&
    currentSummary.caseCount === previousSummary.caseCount &&
    normalizeModelIds(currentSummary.modelIds) === normalizeModelIds(previousSummary.modelIds)
  );
}

function classifyOutcome({ averageScoreDelta, passRateDelta }) {
  const scoreDirection =
    averageScoreDelta > COMPARISON_EPSILON
      ? 1
      : averageScoreDelta < -COMPARISON_EPSILON
        ? -1
        : 0;
  const passDirection =
    passRateDelta > COMPARISON_EPSILON
      ? 1
      : passRateDelta < -COMPARISON_EPSILON
        ? -1
        : 0;

  if (scoreDirection === 0 && passDirection === 0) {
    return "no_change";
  }

  if (scoreDirection >= 0 && passDirection >= 0) {
    return "better";
  }

  if (scoreDirection <= 0 && passDirection <= 0) {
    return "worse";
  }

  return "mixed";
}

function formatElapsedTime(elapsedMs) {
  return `${(elapsedMs / 1000).toFixed(1)}s`;
}

function countModelOutcomes(perModelEntries, expectedOutcome) {
  return perModelEntries.filter((modelEntry) => (
    classifyOutcome({
      averageScoreDelta: modelEntry.averageScoreLift,
      passRateDelta: modelEntry.passRateLift
    }) === expectedOutcome
  )).length;
}

function createPreviousVersionComparison(currentSummary, previousVersionSummary) {
  if (!previousVersionSummary) {
    return {
      outcome: "no_prior",
      comparable: false
    };
  }

  if (!areSummariesComparable(currentSummary, previousVersionSummary)) {
    return {
      outcome: "not_comparable",
      comparable: false,
      previousRunId: previousVersionSummary.runId,
      previousSkillHash: previousVersionSummary.skillHash,
      previousSuiteId: previousVersionSummary.suiteId,
      previousModelIds: previousVersionSummary.modelIds
    };
  }

  return {
    outcome: classifyOutcome({
      averageScoreDelta:
        currentSummary.summary.global.averageScoreLift - previousVersionSummary.summary.global.averageScoreLift,
      passRateDelta:
        currentSummary.summary.global.passRateLift - previousVersionSummary.summary.global.passRateLift
    }),
    comparable: true,
    previousRunId: previousVersionSummary.runId,
    previousSkillHash: previousVersionSummary.skillHash,
    previousAverageScoreLift: previousVersionSummary.summary.global.averageScoreLift,
    previousPassRateLift: previousVersionSummary.summary.global.passRateLift,
    averageScoreLiftDelta:
      currentSummary.summary.global.averageScoreLift - previousVersionSummary.summary.global.averageScoreLift,
    passRateLiftDelta:
      currentSummary.summary.global.passRateLift - previousVersionSummary.summary.global.passRateLift
  };
}

function createEvalTaskPlan({ modelDescriptors, suiteDefinition }) {
  const tasks = [];

  for (const modelDescriptor of modelDescriptors) {
    for (const caseDefinition of suiteDefinition.cases) {
      for (const condition of EVAL_CONDITIONS) {
        tasks.push({
          modelDescriptor,
          caseDefinition,
          conditionId: condition.conditionId,
          includeSkill: condition.includeSkill
        });
      }
    }
  }

  return tasks;
}

function formatTaskDetail(task) {
  return [
    task.modelDescriptor.id,
    task.caseDefinition.id,
    task.includeSkill ? "treatment" : "baseline"
  ].join(" ");
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
  const ui = !jsonOutput ? createCommandUi({ stream: outputStream }) : null;

  if (ui) {
    stdoutWriter(
      `${ui.formatStatusLine({
        kind: "info",
        text: `Preparing ${skillName}`,
        detail: `loading ${suiteSource.suiteDefinition.id}, keys, and model availability`
      })}\n`
    );
  }

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
  const previousRunSummary = readPreviousRunSummary({
    currentWorkingDirectory,
    skillName
  });
  const evalTaskPlan = createEvalTaskPlan({
    modelDescriptors,
    suiteDefinition: suiteSource.suiteDefinition
  });
  const totalSteps = evalTaskPlan.length;
  const runId = createRunId({ skillHash: skillSource.skillHash });
  const startedAt = new Date().toISOString();

  if (ui) {
    const preparationLines = [
      ui.formatField("skill", ui.colors.bold(skillName)),
      ui.formatField("suite", suiteSource.suiteDefinition.id),
      ui.formatField("models", modelDescriptors.map((modelDescriptor) => modelDescriptor.id).join(", ")),
      ui.formatField(
        "plan",
        `${modelDescriptors.length} models x ${suiteSource.suiteDefinition.cases.length} cases x baseline/treatment = ${totalSteps} runs`
      ),
      ui.formatField("execution", "parallel")
    ];

    if (projectKeysLoaded) {
      preparationLines.push(ui.formatField("keys", "loaded from keys.json"));
    }

    if (skippedProviders.length > 0) {
      preparationLines.push(ui.formatField("skipped", String(skippedProviders.length)));
    }

    stdoutWriter(
      ui.renderPanel({
        title: `Preparing Eval ${skillName}`,
        lines: preparationLines
      })
    );
    stdoutWriter(
      `${ui.formatStatusLine({
        kind: "info",
        text: ui.formatProgress({ current: 0, total: totalSteps }),
        detail: "launched all runs in parallel"
      })}\n`
    );
  }

  let completedSteps = 0;
  const rows = await Promise.all(
    evalTaskPlan.map(async (task) => {
      const prompt = createPrompt({
        caseDefinition: task.caseDefinition,
        skillName,
        skillPromptText: skillSource.promptText,
        includeSkill: task.includeSkill
      });
      const startedRowAtMs = Date.now();
      const responsePayload = await generateEvalResponse({
        modelDescriptor: task.modelDescriptor,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        environmentVariables: resolvedEnvironmentVariables,
        fetchImplementation
      });
      const elapsedMs = Date.now() - startedRowAtMs;
      const hardScore = scoreCaseOutput({
        caseDefinition: task.caseDefinition,
        outputText: responsePayload.text
      });

      completedSteps += 1;
      if (ui) {
        stdoutWriter(
          `${ui.formatStatusLine({
            kind: "ok",
            text: ui.formatProgress({ current: completedSteps, total: totalSteps }),
            detail: `${formatTaskDetail(task)} ${formatElapsedTime(elapsedMs)}`
          })}\n`
        );
      }

      return {
        runId,
        suiteId: suiteSource.suiteDefinition.id,
        caseId: task.caseDefinition.id,
        modelId: task.modelDescriptor.id,
        conditionId: task.includeSkill
          ? `treatment:${skillSource.skillHash.slice(0, 12)}`
          : task.conditionId,
        skillHash: skillSource.skillHash,
        hardScore,
        outputText: responsePayload.text,
        usage: responsePayload.usage,
        elapsedMs,
        prompt
      };
    })
  );

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
  const previousComparison = createPreviousComparison(summaryPayload, previousRunSummary);
  const previousVersionSummary = readPreviousVersionSummary({
    currentWorkingDirectory,
    skillName,
    currentSkillHash: skillSource.skillHash
  });
  const previousVersionComparison = createPreviousVersionComparison(
    summaryPayload,
    previousVersionSummary
  );

  if (ui) {
    const overallOutcome = classifyOutcome({
      averageScoreDelta: summary.global.averageScoreLift,
      passRateDelta: summary.global.passRateLift
    });
    const modelsHelpedCount = countModelOutcomes(summary.perModel, "better");
    const renderedLines = [
      ui.formatField("skill", ui.colors.bold(skillName)),
      ui.formatField("hash", ui.colors.muted(skillSource.skillHash.slice(0, 12))),
      ui.formatField("suite", suiteSource.suiteDefinition.id),
      ui.formatField("plan", `${modelDescriptors.length} models x ${suiteSource.suiteDefinition.cases.length} cases x baseline/treatment`),
      ui.formatField("results", ui.formatPath(runDirectoryPath))
    ];

    if (projectKeysLoaded) {
      renderedLines.push(ui.formatField("keys", "loaded from keys.json"));
    }

    renderedLines.push("");
    renderedLines.push(ui.colors.header("Vs No Skill"));
    renderedLines.push(ui.formatField("result", ui.formatOutcome(overallOutcome)));
    renderedLines.push(
      ui.formatField(
        "score",
        `${ui.formatMeter({ value: summary.global.treatment.averageScore })} ${ui.formatPercent(summary.global.baseline.averageScore)} -> ${ui.formatPercent(summary.global.treatment.averageScore)} ${ui.formatLift(summary.global.averageScoreLift)}`
      )
    );
    renderedLines.push(
      ui.formatField(
        "pass rate",
        `${ui.formatMeter({ value: summary.global.treatment.passRate })} ${ui.formatPercent(summary.global.baseline.passRate)} -> ${ui.formatPercent(summary.global.treatment.passRate)} ${ui.formatLift(summary.global.passRateLift)}`
      )
    );
    renderedLines.push(ui.formatField("models helped", `${modelsHelpedCount}/${summary.perModel.length}`));

    renderedLines.push("");
    renderedLines.push(ui.colors.header("Vs Previous Version"));
    renderedLines.push(ui.formatField("result", ui.formatOutcome(previousVersionComparison.outcome)));
    if (previousVersionComparison.comparable) {
      renderedLines.push(
        ui.formatField("previous hash", ui.colors.muted(previousVersionComparison.previousSkillHash.slice(0, 12)))
      );
      renderedLines.push(
        ui.formatField(
          "score edge",
          `${ui.formatLift(summary.global.averageScoreLift)} now vs ${ui.formatLift(previousVersionComparison.previousAverageScoreLift)} before (${ui.formatLift(previousVersionComparison.averageScoreLiftDelta)})`
        )
      );
      renderedLines.push(
        ui.formatField(
          "pass edge",
          `${ui.formatLift(summary.global.passRateLift)} now vs ${ui.formatLift(previousVersionComparison.previousPassRateLift)} before (${ui.formatLift(previousVersionComparison.passRateLiftDelta)})`
        )
      );
    } else if (previousVersionComparison.outcome === "not_comparable") {
      renderedLines.push(
        ui.formatBullet(
          `previous hash ${previousVersionComparison.previousSkillHash.slice(0, 12)} used a different suite or model set`
        )
      );
    } else {
      renderedLines.push(ui.formatBullet("no older skill hash recorded yet"));
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
      renderedLines.push(ui.colors.header("Models"));
      for (const modelEntry of summary.perModel) {
        const modelOutcome = classifyOutcome({
          averageScoreDelta: modelEntry.averageScoreLift,
          passRateDelta: modelEntry.passRateLift
        });
        renderedLines.push(
          ui.formatField(
            modelEntry.modelId,
            `${ui.formatOutcome(modelOutcome)}  ${ui.formatPercent(modelEntry.baseline.averageScore)} -> ${ui.formatPercent(modelEntry.treatment.averageScore)} (${ui.formatLift(modelEntry.averageScoreLift)})`
          )
        );
      }
    }

    if (previousComparison) {
      renderedLines.push("");
      renderedLines.push(ui.colors.header("Last Run"));
      renderedLines.push(ui.formatBullet(`previous run ${previousComparison.previousRunId}`));
      renderedLines.push(
        ui.formatBullet(
          `score edge moved ${ui.formatLift(previousComparison.averageScoreLiftDelta)}`
        )
      );
      renderedLines.push(
        ui.formatBullet(
          `pass edge moved ${ui.formatLift(previousComparison.passRateLiftDelta)}`
        )
      );
    } else {
      renderedLines.push("");
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "last run",
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
    previousComparison,
    previousVersionComparison
  };
}
